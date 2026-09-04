#!/usr/bin/env node
/**
 * test-skip-accounting.js — regression suite for categorizeCommitSkips().
 *
 * WHY THIS EXISTS
 * ---------------
 * A skip category that stops being counted is invisible by construction: the run
 * still reports a total, the breakdown still prints, and only hand-subtracting the
 * two numbers reveals that they disagree. That is exactly how the gap fixed on
 * 2026-09-04 survived — `skipped` was incremented by the FULL commit-skip count
 * while only 3 of 11 reasons were attributed back, so the Assabet run of
 * 2026-09-03 reported 1,174 skipped against a breakdown summing to 486, and
 * printed "0 cancelled" on a run whose own log carried 45 cancelled lines.
 *
 * THE IMPORTANT PART: the reason strings are READ OUT OF supabase-adapter.js
 * rather than duplicated here. That is what makes this suite drift-proof — if
 * someone adds a new `e.message?.includes('Skipping …')` guard to the adapter and
 * forgets to give categorizeCommitSkips() a branch for it, THIS TEST FAILS,
 * instead of the number quietly reappearing in the unexplained remainder.
 *
 * Read-only. No database, no network.
 *
 * Usage: node scripts/test-skip-accounting.js
 */
const fs = require('fs');
const path = require('path');
const { categorizeCommitSkips } = require('../scrapers/helpers/event-save-helper');

const ADAPTER = path.join(__dirname, '..', 'scrapers', 'helpers', 'supabase-adapter.js');

/**
 * Pull every reason string the adapter can push into `skippedReasons`.
 * Two sources: the big `e.message?.includes(...)` guard around flattenForTable(),
 * and any literal pushed directly into skippedReasons.
 */
function reasonsFromAdapter() {
  const src = fs.readFileSync(ADAPTER, 'utf8');
  const found = new Set();

  for (const m of src.matchAll(/e\.message\?\.includes\('([^']+)'\)/g)) found.add(m[1]);
  for (const m of src.matchAll(/skippedReasons\.push\('([^']+)'\)/g)) found.add(m[1]);

  return [...found];
}

let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ' — ' + detail : ''}`);
}

const reasons = reasonsFromAdapter();

console.log(`Reason strings discovered in supabase-adapter.js: ${reasons.length}`);
check('adapter exposes a non-trivial set of reasons', reasons.length >= 10,
  `found only ${reasons.length}; the extraction regex probably stopped matching`);

// 1. Every reason the adapter can emit must land in a NAMED bucket.
for (const reason of reasons) {
  const c = categorizeCommitSkips([reason]);
  check(`categorized: "${reason}"`, c.uncategorizedCount === 0,
    'fell through to uncategorized — categorizeCommitSkips() needs a branch for it');
  check(`counted once: "${reason}"`, c.skippedCount === 1);
}

// 2. The buckets must reconcile: named totals + uncategorized === skippedCount.
const NAMED = ['pastEventCount', 'noDateCount', 'invalidDateCount', 'nonFamilyCount',
  'cancelledCount', 'adultOnlyCount', 'junkTitleCount', 'placeholderVenueCount',
  'emptyNameCount', 'contentDuplicateCount'];
const mixed = categorizeCommitSkips([...reasons, ...reasons]);
const summed = NAMED.reduce((a, k) => a + mixed[k], 0) + mixed.uncategorizedCount;
check('mixed batch reconciles', summed === mixed.skippedCount,
  `buckets sum to ${summed} but skippedCount is ${mixed.skippedCount}`);
check('mixed batch counts every row', mixed.skippedCount === reasons.length * 2);

// 3. The safety net must actually catch an unknown reason — this is the control.
//    Without it, a passing suite would prove nothing about future reasons.
const unknown = categorizeCommitSkips(['Skipping something nobody has written yet']);
check('unknown reason is flagged, not swallowed', unknown.uncategorizedCount === 1);
check('unknown reason is sampled for the log', unknown.uncategorizedSamples.length === 1);
check('unknown reason still counts toward the total', unknown.skippedCount === 1);

// 4. Real messages carry a suffix (event title etc.), so matching must be substring-based.
const withSuffix = categorizeCommitSkips([
  'Skipping non-family event: "Wine Tasting" [\\bwine\\b]',
  'Skipping cancelled/closed event: "Library Closed"'
]);
check('suffixed non-family matched', withSuffix.nonFamilyCount === 1);
check('suffixed cancelled matched', withSuffix.cancelledCount === 1);
check('suffixed messages leave nothing uncategorized', withSuffix.uncategorizedCount === 0);

// 5. Degenerate inputs must not throw.
for (const empty of [null, undefined, []]) {
  const c = categorizeCommitSkips(empty);
  check(`empty input (${JSON.stringify(empty)}) yields zero`, c.skippedCount === 0);
}

console.log('');
if (failures.length) {
  console.log(`${pass} passed, ${failures.length} FAILED:`);
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`${pass}/${pass} skip-accounting cases passed, 0 failures.`);
