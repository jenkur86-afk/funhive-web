#!/usr/bin/env node
/**
 * Regression suite for isCancelledEvent() in scrapers/helpers/supabase-adapter.js.
 *
 *   node scripts/test-cancelled-events.js
 *
 * Read-only — calls the predicate directly, never touches the database.
 *
 * Run this after ANY change to isCancelledEvent() or its rule list.
 *
 * WHY IT EXISTS
 * -------------
 * isCancelledEvent() DELETES. An event it rejects is dropped at save time across
 * all 185+ scrapers and never reaches the events table, leaving no trace anywhere
 * to notice it by — exactly the property that made a suite necessary for
 * isJunkTitle(). Until 2026-08-24 this function had no coverage at all.
 *
 * THE MUST-SURVIVE GROUP IS THE IMPORTANT HALF. Closure notices and real events
 * share vocabulary: "Closing Reception" and "Closing Night" are among the most
 * common real library and gallery programmes, and a rule anchored one word too
 * loosely deletes them silently. The 2026-08-23 pass deliberately left
 * "Closed - Christmas" and "Library Holiday - Closed" alone for the same reason —
 * a title carrying a venue or a holiday name has the same shape as a real event.
 * Do not widen these rules to a bare "closure" or a bare holiday name.
 */

const { isCancelledEvent } = require('../scrapers/helpers/supabase-adapter');

// [name, description, expected isCancelledEvent truthiness, why it matters]
const CASES = [
  // --- cancelled / postponed, the original purpose ---------------------------
  ['CANCELLED: Toddler Storytime', '', true, 'explicit cancellation prefix'],
  ['Storytime - POSTPONED', '', true, 'postponed in the title'],
  ['Book Club', 'This event has been cancelled.', true, 'cancellation in the description'],

  // --- facility closure notices ---------------------------------------------
  ['Library Closed', '', true, 'bare library closure'],
  ['All CCPL Locations Closed', '', true, 'multi-location closure'],
  ['Branch Closed for Juneteenth', '', true, 'branch closure with a holiday'],
  // Added 2026-08-24 from WordPress-PA after the TEC feed was wired in — 18 rows
  // of pure status text that no existing rule reached.
  ['Holiday Closure', '', true, 'pure status text, no event content'],
  ['Closed Federal Holiday', '', true, 'pure status text'],
  ['Closed Federal Holiday Observed', '', true, 'the "Observed" variant'],
  ['PA Room Closed 9/24', '', true, 'room closure — "room" added to the facility list'],

  // --- NEGATIVE CONTROLS: real events that must survive. Do not delete. -------
  ['Closing Reception for the Youth Art Show', '', false, 'a closing reception IS the event'],
  ['Closing Night Gala', '', false, 'closing night IS the event'],
  ['Holiday Craft Party', '', false, 'holiday + party is real programming'],
  ['Holiday Concert', '', false, 'a holiday concert is a real event'],
  ['Open House', '', false, 'open house must never match a closure rule'],
  ['Registration Closes Friday', '', false, 'registration closing is not the event closing'],
  ['Road Closed Fun Run', '', false, 'a road closure is part of a real race'],
  ['Family Movie Night', '', false, 'ordinary event, no closure vocabulary'],
  ['Rain or shine — not cancelled', 'Rain or shine, this event is not cancelled.', false,
    'the explicit not-cancelled rescue must hold'],
];

let pass = 0;
const failures = [];

for (const [name, description, expected, why] of CASES) {
  const got = !!isCancelledEvent(name, description);
  if (got === expected) pass++;
  else failures.push({ name, expected, got, why });
}

console.log('\nCANCELLED / CLOSURE REGRESSION SUITE');
console.log('─'.repeat(60));
if (failures.length) {
  for (const f of failures) {
    console.log(`  ❌ "${f.name}"`);
    console.log(`       expected ${f.expected}, got ${f.got}  — ${f.why}`);
  }
} else {
  console.log('  all cases passed');
}
console.log('─'.repeat(60));
console.log(`${pass}/${CASES.length} cancelled/closure cases passed, ${failures.length} failure(s)\n`);
process.exit(failures.length === 0 ? 0 : 1);
