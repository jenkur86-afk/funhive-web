/**
 * group-catchup.js — starvation-aware rotation group selection.
 *
 * WHY THIS EXISTS (diagnosed 2026-08-19)
 * --------------------------------------
 * The rotation group was chosen purely from the calendar: getDayGroup(dayOfMonth).
 * That function is stateless, so a group whose run never happened was simply never
 * made up — the next day moved on to the next group and the miss was invisible.
 *
 * That interacts badly with two facts about the live scheduler:
 *   1. Group 1 runs consistently take 29.6-31.8h (measured across 2026-08-07,
 *      08-10, 08-13, 08-16), i.e. longer than the 24h gap between triggers.
 *   2. The FunHive-Scrapers task is registered MultipleInstances=IgnoreNew, so
 *      when the 3:00 AM trigger fires while the previous run is still going, the
 *      new instance is DISCARDED SILENTLY — no error, no log file at all.
 *
 * Net effect: every long Group 1 run eats the following day's Group 2 run.
 * 2026-08-14 and 2026-08-17 have no scraper-run log whatsoever for exactly this
 * reason, and because the MacaroniKid block sits at the TAIL of every group list
 * it is the first thing lost. MacaroniKid Group 2 had not completed since
 * 2026-08-05/06 — 14 days — and MacaroniKid-FL/NY/GA/CT had zero rows in the
 * database, ever.
 *
 * The fix here is deliberately narrow: remember when each group last COMPLETED,
 * and if one has gone longer than a full rotation without completing, run that
 * starved group instead of the calendar's pick. A skipped day now self-heals on
 * the next day a run actually starts, rather than waiting for someone to notice.
 *
 * This does not, and cannot, fix the underlying overrun — a run that is dropped
 * before it starts never executes this code. It fixes the *recovery*: 2026-08-15
 * would have run the starved Group 2 instead of Group 3.
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'group-last-run.json');

// A group is starved once it has missed a full 3-day rotation with slack for a
// single long-running overrun. 4 days means "you skipped your turn entirely".
const STARVATION_DAYS = 4;

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    // Missing or corrupt state is not an error: the first run after this ships
    // simply has nothing to catch up on, and falls through to the calendar.
    return {};
  }
}

/**
 * Record that a group finished a run. Called at the end of a group run so that
 * an aborted or killed run does NOT count as completion — which is the whole
 * point, since killed-before-the-tail is the failure mode being recovered from.
 *
 * @param {number} group - Group number (1, 2, or 3)
 * @param {Date}   [when] - Completion time, defaults to now
 */
function recordGroupCompletion(group, when = new Date()) {
  const g = Number(group);
  if (![1, 2, 3].includes(g)) return;

  const state = readState();
  state[String(g)] = when.toISOString();

  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  } catch (err) {
    // Never let bookkeeping fail a scraper run that otherwise succeeded.
    console.log(`  ⚠️ Could not record group ${g} completion: ${err.message}`);
  }
}

/**
 * Choose which group to run, preferring a starved group over the calendar pick.
 *
 * @param {number} calendarGroup - What getDayGroup(dayOfMonth) returned
 * @param {Date}   [now]
 * @returns {{group: number, reason: string, starvedDays: number|null}}
 */
function selectGroup(calendarGroup, now = new Date()) {
  const calendar = Number(calendarGroup);
  const state = readState();

  let worst = null;
  for (const g of [1, 2, 3]) {
    const last = state[String(g)];
    if (!last) continue; // unknown history is not evidence of starvation
    const days = (now.getTime() - new Date(last).getTime()) / 86400000;
    if (days < STARVATION_DAYS) continue;
    if (!worst || days > worst.days) worst = { group: g, days };
  }

  if (worst && worst.group !== calendar) {
    return {
      group: worst.group,
      reason: `Group ${worst.group} has not completed in ${worst.days.toFixed(1)} days ` +
              `(calendar said Group ${calendar}) — running the starved group to catch up`,
      starvedDays: worst.days
    };
  }

  return { group: calendar, reason: `calendar rotation`, starvedDays: null };
}

module.exports = { selectGroup, recordGroupCompletion, STATE_FILE, STARVATION_DAYS };
