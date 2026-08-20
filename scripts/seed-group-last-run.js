#!/usr/bin/env node
/**
 * Seeds scrapers/logs/group-last-run.json from observed run history.
 *
 *   node scripts/seed-group-last-run.js           # dry run
 *   node scripts/seed-group-last-run.js --save
 *
 * WHY THIS EXISTS (2026-08-20)
 * ----------------------------
 * scrapers/helpers/group-catchup.js recovers a rotation group whose run was
 * dropped, by remembering when each group last COMPLETED and preferring a
 * starved group over the calendar's pick. Its selectGroup() deliberately treats
 * an unknown group as not-starved:
 *
 *     if (!last) continue; // unknown history is not evidence of starvation
 *
 * That is the right default in general, but it means a group with no recorded
 * history can never be recognised as starved, and — more practically — that the
 * file DRIFTS. recordGroupCompletion() only fires at the tail of a run that
 * reaches the end under the new code. A run that is killed by the 12h execution
 * limit, or one that was already in flight when the helper shipped, completes
 * real work and records nothing, so the file quietly under-reports.
 *
 * That drift was live on 2026-08-20: the ~39h Group 1 run that finished that
 * morning left the file still claiming Group 1 last completed 2026-08-17, three
 * days stale. A stale-old timestamp is the dangerous direction — it makes a
 * group look starved when it is not, and STARVATION_DAYS is only 4, so Group 1
 * would have become spuriously eligible for catch-up the very next day and could
 * have displaced a group that genuinely needed one.
 *
 * This script re-derives the truth from evidence rather than a guess: the
 * timestamps come from the group-completion lines the runner itself writes into
 * scrapers/logs/scraper-summary.log, which is the same event
 * recordGroupCompletion() is meant to capture. Run it whenever a run is known to
 * have been killed or to have overrun into the next day.
 *
 * This is idempotent and safe to re-run. It only ever moves a group's timestamp
 * BACKWARD to the observed completion, or fills a missing one — it will not
 * overwrite a newer timestamp written by a real run.
 */
const fs = require('fs');
const path = require('path');
const { STATE_FILE, STARVATION_DAYS } = require('../scrapers/helpers/group-catchup');

const SAVE = process.argv.includes('--save');
const SUMMARY = path.join(__dirname, '..', 'scrapers', 'logs', 'scraper-summary.log');

// e.g. "[2026-08-20T15:08:27.691Z] ✅ 9 succeeded  ❌ 0 failed  ⏱️ 1249.6 min total (MacaroniKid Group 1)"
const DONE = /^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\].*total \(MacaroniKid Group ([123])\)/;

if (!fs.existsSync(SUMMARY)) {
  console.error(`Missing ${SUMMARY}`);
  process.exit(1);
}

const observed = {};
for (const line of fs.readFileSync(SUMMARY, 'utf8').split(/\r?\n/)) {
  const m = line.match(DONE);
  if (!m) continue;
  const [, iso, g] = m;
  if (!observed[g] || new Date(iso) > new Date(observed[g])) observed[g] = iso;
}

let existing = {};
try { existing = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {}; } catch { existing = {}; }

const next = { ...existing };
const changes = [];
for (const g of ['1', '2', '3']) {
  if (!observed[g]) { changes.push([g, 'no completion line found in the summary log — left unset']); continue; }
  const cur = existing[g];
  if (cur && new Date(cur) >= new Date(observed[g])) {
    changes.push([g, `kept ${cur} (already at or newer than observed ${observed[g]})`]);
    continue;
  }
  next[g] = observed[g];
  changes.push([g, `${cur ? `${cur} -> ` : 'set '}${observed[g]}`]);
}

const now = Date.now();
console.log(`\nGroup completion state  (${STATE_FILE})\n${'-'.repeat(64)}`);
for (const [g, what] of changes) console.log(`  Group ${g}: ${what}`);
console.log(`\nResulting starvation view (threshold ${STARVATION_DAYS} days):`);
for (const g of ['1', '2', '3']) {
  if (!next[g]) { console.log(`  Group ${g}: unknown`); continue; }
  const days = (now - new Date(next[g]).getTime()) / 86400000;
  console.log(`  Group ${g}: ${days.toFixed(1)} days ago${days >= STARVATION_DAYS ? '   <- STARVED, eligible for catch-up' : ''}`);
}

if (!SAVE) {
  console.log('\nDry run — re-run with --save to write.\n');
  process.exit(0);
}

fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2) + '\n');
console.log(`\nWrote ${STATE_FILE}\n`);
