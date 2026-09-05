#!/usr/bin/env node
/**
 * Regression suite for the "a venue is never a date" guard in
 * scraper-simpleview-tourism-eastern.js.
 *
 * Read-only, DB-free, no network.
 *
 * The guard lives inside a page.evaluate() body, so it cannot be require()d.
 * This suite therefore READS THE PREDICATE OUT OF THE SCRAPER SOURCE and
 * evaluates it, rather than keeping a second copy of the regexes here — a
 * duplicated copy would silently stop testing the real code the first time
 * either side changed. If the block is ever renamed or removed, extraction
 * fails loudly instead of passing vacuously.
 *
 * Background: on 2026-09-05 the venue fallback adopted visitburlingtonvt.com's
 * date-range block as a venue name and wrote four date-named rows to the
 * activities table.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'scrapers', 'scraper-simpleview-tourism-eastern.js');
const src = fs.readFileSync(SRC, 'utf8');

function extract(name, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker, a);
  if (a === -1 || b === -1) {
    console.error(`FATAL: could not extract ${name} from ${path.basename(SRC)}.`);
    console.error('The guard was renamed or removed — this suite is no longer testing real code.');
    process.exit(1);
  }
  return src.slice(a, b + endMarker.length);
}

const cleanSrc = extract('clean()', 'const clean = (str)', ".trim();");
const monthDaySrc = extract('MONTH_DAY_RE', 'const MONTH_DAY_RE =', '/i;');
const tokenSrc = extract('DATE_TOKEN_RE', 'const DATE_TOKEN_RE =', '/gi;');
const guardSrc = extract('isDateOnly()', 'const isDateOnly = (str) => {', "=== '';\n      };");

// eslint-disable-next-line no-eval
const isDateOnly = eval(`(() => { ${cleanSrc} ${monthDaySrc} ${tokenSrc} ${guardSrc} return isDateOnly; })()`);

// [input, expectedIsDateOnly, why]
const CASES = [
  // --- the four rows this bug actually created in activities, 2026-09-05 ---
  ['June 20 - September 6', true, 'live junk activity, Burlington VT'],
  ['January 17 - September 7', true, 'live junk activity, Burlington VT'],
  ['May 25 - September 7', true, 'live junk activity, Burlington VT'],
  ['July 3 - June 22', true, 'live junk activity, Burlington VT'],

  // --- other date shapes seen in the same run's log ---
  ['September 5, 2026', true, 'geocode attempt, Providence RI'],
  ['May 17, 2026 - October 25, 2026', true, 'geocode attempt, Burlington VT'],
  ['April 2, 2026 - December 17, 2026', true, 'geocode attempt, Burlington VT'],
  ['Now - Jun 1, 2027 • 12:00 AM', true, 'ongoing-exhibit range'],
  ['Now - Sep 30, 2026 • 12:00 AM', true, 'ongoing-exhibit range'],
  ['Aug 28', true, 'bare month + day'],
  ['Sat, Sep 6', true, 'weekday-prefixed date'],
  ['9/6 - 9/8', true, 'numeric range'],
  ['September 24 -December 10', true, 'missing space before second month'],

  // --- CONTROLS: real venues that must survive, including month-word traps ---
  ['Port Discovery Children’s Museum', false, 'plain venue'],
  ['May Street Center', false, 'month word, no day number'],
  ['Marchmont Hall', false, 'month word inside a longer word'],
  ['August Wilson Center', false, 'month word as a person name'],
  ['June Jordan Park', false, 'month word as a person name'],
  ['Millennium Park', false, 'plain venue'],
  ['Peggy Notebaert Nature Museum', false, 'plain venue'],
  ['American Writers Museum, 180 N. Michigan Ave.', false, 'venue with street number'],
  ['Studio 54', false, 'venue ending in a number'],
  ['Route 1 Cinema', false, 'venue with a number'],
  ['Ballard’s Beach Resort', false, 'plain venue'],
  ['12 Meter Yacht Charters', false, 'venue starting with a number'],
  ['Cantigny Park Wheaton', false, 'plain venue'],
  ['', false, 'empty string is not a date'],
  ['   ', false, 'whitespace is not a date'],
  ['TBD', false, 'no date signal'],
  ['Downtown', false, 'no date signal'],
];

let pass = 0;
const failures = [];
for (const [input, expected, why] of CASES) {
  const actual = isDateOnly(input);
  if (actual === expected) {
    pass++;
  } else {
    failures.push({ input, expected, actual, why });
  }
}

console.log(`\nSimpleview venue/date guard: ${pass}/${CASES.length} passed\n`);
for (const f of failures) {
  console.log(`  FAIL ${JSON.stringify(f.input)}`);
  console.log(`       expected isDateOnly=${f.expected}, got ${f.actual}  (${f.why})`);
}
if (failures.length) {
  console.log('');
  process.exit(1);
}
console.log('All cases passed.\n');
