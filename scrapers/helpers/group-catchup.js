/**
 * group-catchup.js — starvation-aware rotation group selection.
 *
 * WHY THIS EXISTS (diagnosed 2026-08-19)
 * --------------------------------------
 * The rotation group was chosen purely from the calendar: getDayGroup(dayOfMonth).
 * That function is stateless, so a group whose run never happened was simply never
 * made up — the next day moved on to the next group and the miss was invisible.
 *
 * Full history of this defect and every intervention against it lives in
 * ROTATION-STARVATION-LOG.md at repo root. Read that before changing this file.
 *
 * WHAT "COMPLETION" MEANS — REDEFINED 2026-08-31 FOR THE TASK SPLIT
 * -----------------------------------------------------------------
 * Until 2026-08-31 one task ran the regular rotation AND the MacaroniKid tail,
 * and recordGroupCompletion() fired only after the tail — so "Group N completed"
 * meant "regular + MacaroniKid both reached the end". The tail is now its own
 * scheduled task (FunHive-Macaroni → macaroni-daily-runner.js), so completion is
 * tracked SEPARATELY per pipeline, in separate state files:
 *
 *   group-last-run.json     — the REGULAR rotation reached the end of its group
 *                             list (recorded by local-scraper-runner.js).
 *   macaroni-last-run.json  — the MacaroniKid runner for that group reached its
 *                             end (recorded by macaroni-daily-runner.js).
 *
 * The load-bearing rule survives the split unchanged: ONLY a run that reached
 * the END of its list counts. A run killed mid-way never records, stays marked
 * starved, and is caught up later. Each pipeline applies the rule to itself and
 * runs its own selectGroup() against its own file, so a MacaroniKid stall can
 * no longer hide behind a healthy rotation or vice versa — which is exactly
 * what happened for 14 days in August 2026 when the two were welded together.
 *
 * Both state files are written via atomic-json (temp+rename, re-read before
 * modify): group-last-run.json lost an update to plain writeFileSync on
 * 2026-08-20, and with two runner tasks the read-modify-write window is no
 * longer theoretical.
 */

const path = require('path');
const { readJsonSafe, updateJsonAtomic } = require('./atomic-json');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'group-last-run.json');
const MACARONI_STATE_FILE = path.join(__dirname, '..', 'logs', 'macaroni-last-run.json');

/**
 * STARVATION_DAYS = 4 — kept at 4 after explicit re-evaluation on 2026-08-31.
 *
 * The tempting change was 3.0: replayed against the real state at the
 * 2026-08-31 07:00Z trigger (G1=1.93d, G2=3.08d, G3=0.48d, calendar group 1),
 * thresholds 4.0/3.5/3.25 all pick Group 1 and only 3.0 picks the starved
 * Group 2 — so 3.0 is the only value that catches a SINGLE missed turn before
 * the calendar catches it anyway.
 *
 * It was rejected because of start-time jitter. After the 2026-08-31 task
 * split, group runs serialize on helpers/run-lock.js and can legitimately
 * start hours late, so a healthy group's age at trigger time jitters AROUND
 * 3.0 days (72h cadence ± several hours). At threshold 3.0 a healthy-but-late
 * group crosses the line spuriously, displaces the calendar group, and the
 * displaced group then ages past the line itself — oscillation. At 4.0 the
 * jitter band is nowhere near the threshold.
 *
 * What 4.0 gives up is bounded and measured: a single missed turn is caught at
 * age ~4.08d on the second morning after the miss (replayed: selectGroup at
 * 2026-09-01T07:00Z returns Group 2 at 4.079d) — one day before the calendar
 * would have re-served the group anyway. Post-split that is acceptable because
 * misses now require a whole-machine outage rather than happening structurally
 * twice a week; this threshold is a backstop for rare events, not the primary
 * scheduling mechanism it was being asked to be.
 */
const STARVATION_DAYS = 4;

function readState(stateFile = STATE_FILE) {
  return readJsonSafe(stateFile, {});
}

/**
 * Record that a group finished a run — called ONLY at the end of the group
 * list, so an aborted or killed run does not count (see header).
 *
 * @param {number} group    - Group number (1, 2, or 3)
 * @param {Date}   [when]   - Completion time, defaults to now
 * @param {string} [stateFile] - Which pipeline's ledger to write (default:
 *                              regular rotation; pass MACARONI_STATE_FILE from
 *                              the MacaroniKid runner)
 */
function recordGroupCompletion(group, when = new Date(), stateFile = STATE_FILE) {
  const g = Number(group);
  if (![1, 2, 3].includes(g)) return;

  try {
    // updateJsonAtomic re-reads immediately before writing, so a concurrent
    // update to another group's key is preserved instead of clobbered.
    updateJsonAtomic(stateFile, (state) => {
      state[String(g)] = when.toISOString();
      return state;
    });
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
 * @param {string} [stateFile]   - Which pipeline's ledger to consult
 * @returns {{group: number, reason: string, starvedDays: number|null}}
 */
function selectGroup(calendarGroup, now = new Date(), stateFile = STATE_FILE) {
  const calendar = Number(calendarGroup);
  const state = readState(stateFile);

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

module.exports = {
  selectGroup,
  recordGroupCompletion,
  readState,
  STATE_FILE,
  MACARONI_STATE_FILE,
  STARVATION_DAYS,
};
