#!/usr/bin/env node
/**
 * Regression suite for findLibraryForEvent() in helpers/event-save-helper.js.
 *
 * Read-only, DB-free, no network.
 *
 * WHY THIS EXISTS. That function decides which configured library an event belongs
 * to, and the answer becomes the row's venue, city, STATE and coordinates. It is
 * shared by ~50 scrapers, so a wrong match is a wrong-state row rather than a
 * cosmetic slip — the same damage class as the Defect A URL collisions, arriving
 * from the save path instead of the config.
 *
 * It has now been wrong twice in ways nothing caught:
 *   2026-08-27  an EMPTY venue matched every library, because both includes()
 *               checks are trivially true against '', so the event silently took
 *               libraries[0] — 96 events landed in the wrong city.
 *   2026-09-06  a single loop tested name-containment and city-containment
 *               together, so a WEAK CITY MATCH ON AN EARLY LIBRARY BEAT AN EXACT
 *               NAME MATCH LATER IN THE ARRAY. Dover Town Library (Dover, MA) was
 *               matched to Dover Public Library (Dover, NH) and 33 Massachusetts
 *               events were stored as New Hampshire.
 *
 * Both are covered below, so neither can return silently.
 */

const path = require('path');
const { findLibraryForEvent } = require(path.join(__dirname, '..', 'scrapers', 'helpers', 'event-save-helper.js'));

if (typeof findLibraryForEvent !== 'function') {
  console.error('FATAL: findLibraryForEvent is not exported from helpers/event-save-helper.js.');
  console.error('Export it (or update this suite) — it cannot be tested through the save path alone.');
  process.exit(1);
}

// Mirrors the real Assabet ordering: the NH Dover entry sits BEFORE the MA one,
// which is what made array order decide the state.
const ASSABET = [
  { name: 'Dover Public Library', city: 'Dover', state: 'NH' },
  { name: 'Oxford Free Public Library', city: 'Oxford', state: 'MA' },
  { name: 'Lane Memorial Library', city: 'Hampton', state: 'NH' },
  { name: 'Dover Town Library', city: 'Dover', state: 'MA' },
  { name: 'Boxford Town Library', city: 'Boxford', state: 'MA' },
  { name: 'Newburyport Public Library', city: 'Newburyport', state: 'MA' },
];

const MULTI_STATE = [
  { name: 'Moonshine Alley', city: 'Nashville', state: 'TN' },
  { name: 'Riverfront Park', city: 'Baltimore', state: 'MD' },
];

const CASES = [
  // --- the 2026-09-06 defect: exact name must beat an earlier city match -----
  [ASSABET, { venueName: 'Dover Town Library' }, 'Dover Town Library', 'exact name outranks an earlier library sharing the city'],
  [ASSABET, { venueName: 'Dover Public Library' }, 'Dover Public Library', 'the NH library still matches its own name'],
  [ASSABET, { venueName: 'dover town library' }, 'Dover Town Library', 'match is case-insensitive'],
  [ASSABET, { venueName: 'Boxford Town Library' }, 'Boxford Town Library', 'Oxford must not swallow Boxford via city containment'],
  [ASSABET, { venueName: 'Newburyport Public Library' }, 'Newburyport Public Library', 'plain exact match'],

  // --- name containment, still stronger than any city guess -----------------
  [ASSABET, { venueName: 'Dover Town Library - Meeting Room' }, 'Dover Town Library', 'name containment beats the earlier city match'],
  [ASSABET, { venueName: 'Lane Memorial Library, Hampton' }, 'Lane Memorial Library', 'name containment wins even when another city is named'],

  // --- city containment is the last resort, and is state-aware --------------
  [ASSABET, { venueName: 'Community Room, Dover', state: 'MA' }, 'Dover Town Library', 'city fallback picks the library in the event own state'],
  [ASSABET, { venueName: 'Community Room, Dover', state: 'NH' }, 'Dover Public Library', 'same venue, other state, other library'],

  // --- the 2026-08-27 defect: an empty venue must not match everything ------
  [MULTI_STATE, { venueName: '', city: 'Baltimore', state: 'MD' }, 'Riverfront Park', 'empty venue narrows by city+state, not libraries[0]'],
  [MULTI_STATE, { venueName: '', city: 'Nowhere', state: 'MD' }, 'Riverfront Park', 'empty venue falls back to state before libraries[0]'],
];

let pass = 0;
const failures = [];
for (const [libs, event, expected, why] of CASES) {
  let actual;
  try { actual = findLibraryForEvent(event, libs); } catch (e) { actual = { name: 'THREW: ' + e.message }; }
  const got = actual ? actual.name : '(null)';
  if (got === expected) pass++;
  else failures.push({ venue: event.venueName, expected, got, why });
}

console.log(`\nlibrary-matching: ${pass}/${CASES.length} cases passed\n`);
for (const f of failures) {
  console.log(`  FAIL venue=${JSON.stringify(f.venue)}`);
  console.log(`       expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.got)}  (${f.why})`);
}
if (failures.length) { console.log(''); process.exit(1); }
console.log('All cases passed.\n');
