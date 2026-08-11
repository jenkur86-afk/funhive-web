#!/usr/bin/env node
/**
 * Regression test for the Last-run parser in generate-site-report.js.
 *
 * WHY THIS EXISTS
 * ---------------
 * A scraper run ends by REPLAYING every scraper's result under a
 * "PER-SCRAPER RESULTS" header stamped with the run's finish time, not the time
 * that scraper actually ran. The 2026-08-10 nightly run took 29.6 hours, so its
 * recap landed on 2026-08-11 and re-asserted CivicEngage-Libraries' stale 3am
 * "0 found" over a real 354-found run from that morning — the report showed a
 * fixed scraper as still broken. Six scrapers were affected, all of them ones
 * fixed that day, so the bug was systematically masking real work.
 *
 * The parser now skips recap blocks. That heuristic depends on the log's
 * wording, so this test pins the two properties that matter:
 *
 *   1. Skipping must never DROP a scraper. If a scraper only ever appeared
 *      inside a recap, skipping would lose it from the report entirely.
 *   2. A recap block must always terminate. If the terminator wording drifts,
 *      the parser would treat the rest of the file as recap and silently drop
 *      everything. loadRunLog fails open at RECAP_SANITY_LIMIT, and this test
 *      asserts no real log gets anywhere near it.
 *
 * Read-only, local files only, no database. Run after touching loadRunLog() or
 * anything that writes scrapers/logs/scraper-summary.log:
 *
 *   node scripts/test-run-log-parser.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG = path.join(ROOT, 'scrapers', 'logs', 'scraper-summary.log');
const GEN = path.join(ROOT, 'scripts', 'generate-site-report.js');

if (!fs.existsSync(LOG)) {
  console.log('no scraper-summary.log yet — nothing to test');
  process.exit(0);
}

const lines = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);

// Row regex, kept deliberately in sync with loadRunLog's.
const ROW = /^\[((\d{4}-\d{2}-\d{2})T[^\]]*)\]\s+(?:⚠️\s*)?([A-Za-z][\w.\- ]*?)\s{2,}([\d,]+)\s+([\d,]+)\s+([\d,]+)(?:\s+([\d,]+))?\s+([\d.]+)\s*$/;

function nameOf(line) {
  const m = ROW.exec(line);
  if (!m) return null;
  const n = m[3].trim();
  if (!n || /^-+$/.test(n) || n === 'SCRAPER') return null;
  return n;
}

const all = new Set();          // every scraper anywhere in the log
const outsideRecap = new Set(); // every scraper seen live, outside a recap
let inRecap = false, recapLines = 0, longestRecap = 0, blocks = 0, unterminated = 0;

for (const line of lines) {
  const n = nameOf(line);
  if (n) all.add(n);

  if (line.includes('PER-SCRAPER RESULTS')) {
    if (inRecap) unterminated++;               // previous block never closed
    inRecap = true; recapLines = 0; blocks++; continue;
  }
  if (inRecap && /succeeded/.test(line)) {
    longestRecap = Math.max(longestRecap, recapLines);
    inRecap = false; continue;
  }
  if (line.includes('FunHive Scraper Run')) {
    if (inRecap) { unterminated++; longestRecap = Math.max(longestRecap, recapLines); }
    inRecap = false; continue;
  }
  if (inRecap) { recapLines++; continue; }
  if (n) outsideRecap.add(n);
}
if (inRecap) { unterminated++; longestRecap = Math.max(longestRecap, recapLines); }

// The sanity limit the generator falls open at — read from source so the two
// cannot drift apart unnoticed.
const limMatch = /RECAP_SANITY_LIMIT\s*=\s*(\d+)/.exec(fs.readFileSync(GEN, 'utf8'));
const limit = limMatch ? parseInt(limMatch[1], 10) : null;

const onlyInRecap = [...all].filter(n => !outsideRecap.has(n));

console.log(`lines               : ${lines.length}`);
console.log(`recap blocks        : ${blocks}  (unterminated: ${unterminated})`);
console.log(`longest recap block : ${longestRecap} data lines`);
console.log(`sanity limit        : ${limit === null ? '(not found in generator!)' : limit}`);
console.log(`scrapers total      : ${all.size}`);
console.log(`scrapers seen live  : ${outsideRecap.size}`);

let failed = 0;

if (onlyInRecap.length) {
  console.log(`\nFAIL: ${onlyInRecap.length} scraper(s) appear ONLY inside a recap block, so skipping recaps`);
  console.log('      would drop them from the report entirely:');
  onlyInRecap.slice(0, 20).forEach(n => console.log('        - ' + n));
  failed++;
} else {
  console.log('\nPASS: every scraper appears at least once outside a recap block');
}

if (limit === null) {
  console.log('FAIL: RECAP_SANITY_LIMIT not found in generate-site-report.js');
  failed++;
} else if (longestRecap >= limit) {
  console.log(`FAIL: longest recap (${longestRecap}) has reached the fail-open limit (${limit}).`);
  console.log('      Raise the limit, or the parser will stop skipping and stale rows return.');
  failed++;
} else {
  console.log(`PASS: longest recap (${longestRecap}) is well under the fail-open limit (${limit})`);
}

if (unterminated) {
  console.log(`FAIL: ${unterminated} recap block(s) never terminated — the log wording has changed.`);
  failed++;
} else {
  console.log('PASS: every recap block terminated');
}

process.exit(failed ? 1 : 0);
