#!/usr/bin/env node
/**
 * test-date-normalization.js — regression suite for normalizeDateString().
 *
 * WHY THIS EXISTS
 * ---------------
 * normalizeDateString() is on the save path of every one of the 185+ scrapers:
 * a string it cannot parse becomes an INVALID row that is silently dropped, and
 * a string it parses WRONGLY becomes a family event advertised on the wrong day.
 * Despite that, it had no committed regression coverage until 2026-08-26 — the
 * same gap isCancelledEvent() had until 2026-08-24, and the same one that let
 * three separate age-detection regressions ship.
 *
 * Run after ANY change to scrapers/helpers/date-normalization-helper.js:
 *     node scripts/test-date-normalization.js
 *
 * Read-only. No database access, no network, no writes.
 *
 * NOTE ON TIME-RELATIVE CASES
 * ---------------------------
 * The weekday+day-of-month rule resolves against "today", so its expected value
 * changes daily. Those cases are asserted by PROPERTY (does the returned date
 * actually fall on the stated weekday and day-of-month, inside the horizon?)
 * rather than by hardcoded string, so the suite does not rot overnight. Cases
 * with a real month in them are asserted exactly.
 */

const {
  normalizeDateString,
  parseDateToObject,
} = require('../scrapers/helpers/date-normalization-helper');

const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const HORIZON_DAYS = 92; // must match the helper
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) { passed++; return; }
  failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

/** Exact-match assertion, for formats whose answer never changes. */
function expectExact(input, expected) {
  const actual = normalizeDateString(input);
  check(`exact ${JSON.stringify(input)}`, actual === expected,
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/** Must not parse — junk, time-only fragments, status text. */
function expectNull(input, why) {
  const actual = normalizeDateString(input);
  check(`null ${JSON.stringify(input)} (${why})`, actual === null,
        `expected null, got ${JSON.stringify(actual)}`);
}

/**
 * Property assertion for the weekday+day rule: whatever date comes back must
 * genuinely fall on the requested weekday and day-of-month, and sit inside the
 * horizon. This is what proves the rule resolved rather than guessed.
 */
function expectWeekdayDayResolves(input, weekday, dayOfMonth) {
  const actual = normalizeDateString(input);
  if (actual === null) {
    check(`weekday+day ${JSON.stringify(input)}`, false, 'expected a date, got null');
    return;
  }
  const d = new Date(`${actual} 00:00:00`);
  if (isNaN(d.getTime())) {
    check(`weekday+day ${JSON.stringify(input)}`, false, `unparseable result ${actual}`);
    return;
  }
  const wantDow = WEEKDAY_INDEX[weekday.toLowerCase().slice(0, 3)];
  const today = new Date();
  const daysOut = Math.round((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);

  check(`weekday+day ${JSON.stringify(input)} lands on ${weekday}`,
        d.getDay() === wantDow, `got ${d.toDateString()}`);
  check(`weekday+day ${JSON.stringify(input)} lands on day ${dayOfMonth}`,
        d.getDate() === dayOfMonth, `got ${d.toDateString()}`);
  check(`weekday+day ${JSON.stringify(input)} inside horizon`,
        daysOut >= -4 && daysOut <= HORIZON_DAYS, `resolved ${daysOut} days out (${actual})`);
}

console.log('=== normalizeDateString() regression suite ===\n');

// ---------------------------------------------------------------------------
// 1. The 2026-08-26 fix: weekday stacked over day-of-month in a calendar cell.
//    Real strings, verbatim, from the 2026-08-25 run — Milwaukee Art Museum
//    (Venue-Events-ScienceArts, 10 rows) and Alliance Theatre
//    (ChildrensTheater-Eastern, 2 rows). Tabs and newlines are part of the data.
// ---------------------------------------------------------------------------
// The verbatim production strings were, on the 2026-08-25 run:
//   "Thu\t\t\n\t\t\n\t\t\t27"  "Fri\t\t\n\t\t\n\t\t\t28"  "Sat\t\t\n\t\t\n\t\t\t29"
//   "Sun\t\t\n\t\t\n\t\t\t30"  "Thu\t\t\n\t\t\n\t\t\t3"   "Sat\t\t\n\t\t\n\t\t\t5"
// They cannot be asserted literally, because the rule resolves against "today"
// and a given weekday/day pair only falls inside the 92-day horizon for part of
// the year — hardcoding them would make this suite start failing on its own a
// few months from now, which is worse than no suite. Instead we take a date
// known to be in-horizon and rebuild the exact production SHAPES from it, so
// what is under test is the parsing, not the calendar.
console.log('1. weekday + day-of-month calendar cells (the 2026-08-26 fix)');
{
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  // 21 days out: comfortably inside the horizon all year round, and far enough
  // ahead that it is unambiguously a future event.
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21);
  const dow = target.getDay();
  const day = target.getDate();
  const want = `${MONTHS[target.getMonth()]} ${day}, ${target.getFullYear()}`;

  const shapes = [
    [`${SHORT[dow]}\t\t\n\t\t\n\t\t\t${day}`, 'verbatim production shape (tabs + newlines)'],
    [`${SHORT[dow]} ${day}`,                  'whitespace-collapsed'],
    [`${SHORT[dow]}   ${day}`,                'multiple spaces'],
    [`${LONG[dow]} ${day}`,                   'full weekday name'],
    [`${SHORT[dow]}. ${day}`,                 'trailing period'],
    [`  ${SHORT[dow]} ${day}  `,              'leading/trailing whitespace'],
    [`${SHORT[dow].toUpperCase()} ${day}`,    'uppercase weekday'],
  ];
  for (const [input, label] of shapes) {
    const actual = normalizeDateString(input);
    check(`shape: ${label}`, actual === want,
          `input ${JSON.stringify(input)} expected ${JSON.stringify(want)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`   (resolving against ${SHORT[dow]} ${day} -> ${want})`);
}

// ---------------------------------------------------------------------------
// 2. HORIZON CONTROL — the reason the rule is safe.
//    A weekday/day pair recurs only about once a year. Find a pair whose next
//    occurrence is beyond the horizon and assert the helper REFUSES it rather
//    than asserting a date ~13 months away.
// ---------------------------------------------------------------------------
console.log('2. horizon refusal (must not invent a far-future date)');
{
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);
  let farPair = null;
  outer:
  for (let day = 1; day <= 28 && !farPair; day++) {
    for (const [name, dow] of Object.entries(WEEKDAY_INDEX)) {
      let firstOffset = null;
      for (let i = 0; i < 500; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        if (d.getDate() === day && d.getDay() === dow) { firstOffset = i; break; }
      }
      if (firstOffset !== null && firstOffset > HORIZON_DAYS + 20) {
        farPair = { name, day, firstOffset };
        break outer;
      }
    }
  }
  if (!farPair) {
    check('horizon control could be constructed', false, 'no far pair found — suite cannot verify refusal');
  } else {
    const label = `${farPair.name.charAt(0).toUpperCase() + farPair.name.slice(1)} ${farPair.day}`;
    const actual = normalizeDateString(label);
    check(`horizon: ${JSON.stringify(label)} (next occurrence ${farPair.firstOffset}d out) refused`,
          actual === null, `expected null, got ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// 3. MUST-STAY-NULL controls. Every one of these was a real INVALID row in the
//    logs. They are NOT dates and must never be coerced into one.
// ---------------------------------------------------------------------------
console.log('3. must-stay-null controls (real junk from the logs)');
expectNull('Open Tuesday-Sunday', 'permanent-exhibit hours, Center for Puppetry Arts');
expectNull('Sold Out',            'status text, Science Museum of Virginia');
expectNull('By Date(s)',          'filter-widget label, Indiana State Museum');
expectNull('FromAll Dates',       'filter-widget label, Henry Ford Museum');
expectNull(' 7:00 PM to 11:00 PM','time-only, no date, Frost Science Museum');
expectNull(' 10:00 AM',           'time-only fragment');
expectNull('-',                   'separator only');
expectNull('...',                 'ellipsis only');
expectNull('',                    'empty string');
expectNull('   ',                 'whitespace only');
expectNull(null,                  'null input');
expectNull(undefined,             'undefined input');

// Weekday-shaped strings that must NOT reach the new rule.
expectNull('Thursday',   'weekday with no day number');
expectNull('Thu',        'bare weekday abbreviation');
expectNull('Thu 0',      'day-of-month 0 is out of range');
expectNull('Thu 32',     'day-of-month 32 is out of range');
expectNull('Thu 27 Extra Words', 'not the whole field — anchoring must reject');

// ---------------------------------------------------------------------------
// 4. MUST-NOT-BREAK controls. Ordinary formats that already worked. The new
//    rule runs early, so these prove it did not pre-empt a correct parse.
// ---------------------------------------------------------------------------
console.log('4. must-not-break: ordinary formats still parse');
expectExact('August 27, 2026',      'August 27, 2026');
expectExact('Aug 27, 2026',         'August 27, 2026');
expectExact('Wed, May 6, 2026',     'May 6, 2026');
expectExact('September 3, 2026',    'September 3, 2026');
expectExact('Thursday, August 27, 2026', 'August 27, 2026');
// Weekday + FULL date must keep the real date, not be hijacked by the new rule.
expectExact('Thu, August 27, 2026', 'August 27, 2026');
expectExact('Sat 29 August 2026',   'August 29, 2026');

// The 2026-08-25 WordPress-CT fix (date in the title) must still hold.
expectExact('8/14/26 - Games on Tap',       'August 14, 2026');
expectExact('8/17/26: Mahjong Monday',      'August 17, 2026');
expectExact('8/17/26 - Modern Square Dancing', 'August 17, 2026');

// ---------------------------------------------------------------------------
// 5. parseDateToObject() still returns usable Date objects.
// ---------------------------------------------------------------------------
console.log('5. parseDateToObject() integration');
{
  const d = parseDateToObject('August 27, 2026');
  check('parseDateToObject("August 27, 2026")',
        d instanceof Date && !isNaN(d) && d.getMonth() === 7 && d.getDate() === 27,
        `got ${d}`);

  const cell = parseDateToObject('Thu\t\t\n\t\t\n\t\t\t27');
  check('parseDateToObject() resolves a calendar cell',
        cell instanceof Date && !isNaN(cell) && cell.getDate() === 27 && cell.getDay() === 4,
        `got ${cell}`);

  check('parseDateToObject("Sold Out") is null', parseDateToObject('Sold Out') === null);
}

// ---------------------------------------------------------------------------
console.log('');
const total = passed + failures.length;
if (failures.length) {
  console.log(`❌ ${failures.length} of ${total} checks FAILED:\n`);
  failures.forEach(f => console.log(`   • ${f}`));
  console.log('');
  process.exit(1);
}
console.log(`✅ all ${total} checks passed`);
