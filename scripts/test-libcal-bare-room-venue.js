#!/usr/bin/env node
/**
 * Regression suite for the "a bare room name is not a venue" guard in
 * scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js.
 *
 * Read-only, DB-free, no network.
 *
 * Like test-simpleview-venue-date-guard.js, this READS THE TWO PREDICATES OUT OF THE
 * SCRAPER SOURCE rather than keeping its own copy of the regexes. A duplicated copy stops
 * testing the real code the first time either side is edited, and this guard is exactly the
 * kind that gets "tidied" — the trailing room-number group looks like it could be widened
 * to any short word, which is precisely the change that breaks "Reading Room Cafe".
 *
 * Background: on 2026-09-09 Morristown-Morris Twp was relocated into this scraper and its
 * first run stored all 7 rows with a venue of "Children's Room" or "Meeting Room". That
 * tenant publishes the ROOM as the whole location, where the existing cleaner only handles
 * a room as a SUFFIX on a real place ("Library - Meeting Room"). Every other LibCal entry
 * checked stores a proper venue, so this is a per-tenant habit rather than a platform one.
 *
 * The harm is not cosmetic: the geocoder is handed "Children's Room, Morristown, Morris
 * County, NJ" and can only reach a centroid, and the string also lands in the activities
 * table as a place on the map. Same class as the Simpleview date-as-venue bug.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'scrapers',
  'scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js');
const src = fs.readFileSync(SRC, 'utf8');

function extract(name) {
  // Match `const <name> = <regex>.test(v);` and recover the literal.
  const re = new RegExp(`const\\s+${name}\\s*=\\s*(/(?:[^/\\\\\\n]|\\\\.)+/[a-z]*)\\.test\\(v\\)`);
  const m = re.exec(src);
  if (!m) {
    console.error(`Could not find the ${name} predicate in ${path.basename(SRC)}.`);
    console.error('The guard was renamed or removed — failing loudly rather than passing vacuously.');
    process.exit(1);
  }
  const lastSlash = m[1].lastIndexOf('/');
  return new RegExp(m[1].slice(1, lastSlash), m[1].slice(lastSlash + 1));
}

const NAMES_A_PLACE = extract('namesAPlace');
const IS_BARE_ROOM = extract('isBareRoom');

// true  = the guard should CLEAR this venue and fall back to the library name
// false = the guard must LEAVE THIS ALONE
const CASES = [
  // --- the live rows that prompted the guard ---
  ["Children's Room", true, 'stored on all 6 Morristown rows on 2026-09-09'],
  ['Meeting Room', true, 'the 7th Morristown row'],

  // --- ordinary room shapes ---
  ['Community Room', true, 'bare room word'],
  ['Program Room B', true, 'trailing single letter is a room label'],
  ['Conference Room 2', true, 'trailing digits are a room number'],
  ['Quiet Study Room #3', true, 'hash-prefixed room number'],
  ['Auditorium', true, 'room word with no "room" in it'],
  ['Makerspace Studio', true, 'a space inside the library, not a separate place'],

  // --- NEGATIVE CONTROLS: real venues that contain a room word ---
  ['Reading Room Cafe', false, 'a real place; matched on a first draft that allowed any short trailing word'],
  ['The Music Room Theater', false, 'a real venue named after a room'],
  ['Green Room Studios Inc', false, 'a business, not a room'],
  ['Community Room, Main Library', false, 'names a library, so it is a place'],

  // --- NEGATIVE CONTROLS: proper library venues seen live in this scraper ---
  ['Wantagh Public Library', false, 'stored venue on LibCal-NY-wantaghlibrary'],
  ['BCCLS - Bergen County Cooperative Library System', false, 'stored venue on LibCal-NJ-bccls'],
  ['Morristown & Morris Township Library', false, 'what Morristown SHOULD store'],
  ['Chappaqua Library - Theater', false, 'room as a suffix on a real place — the existing cleaner handles this shape'],
  ['Enoch Pratt Free Library', false, 'ordinary library name'],
];

const fires = v => !NAMES_A_PLACE.test(v) && IS_BARE_ROOM.test(v);

let pass = 0;
const failures = [];
for (const [input, expected, why] of CASES) {
  const actual = fires(input);
  if (actual === expected) pass++;
  else failures.push({ input, expected, actual, why });
}

console.log(`\nLibCal bare-room venue guard: ${pass}/${CASES.length} passed\n`);
for (const f of failures) {
  console.log(`  FAIL ${JSON.stringify(f.input)}`);
  console.log(`       expected clear=${f.expected}, got ${f.actual}  (${f.why})`);
}
if (failures.length) {
  console.log('');
  process.exit(1);
}
console.log('All cases passed.\n');
