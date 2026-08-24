#!/usr/bin/env node
/**
 * Regression suite for _resolveEventId() in scrapers/helpers/supabase-adapter.js.
 *
 *   node scripts/test-shared-url-rekey.js
 *
 * Read-only — calls the resolver and the real registration function directly,
 * never touches the database.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * ~25 call sites across the library/venue scrapers build their event url as
 * `event.url || library.website`. Whenever per-event link extraction fails,
 * every event at that library inherits ONE shared URL. _stableEventId() hashes
 * the URL first, so all of them collapse onto ONE row id and every event after
 * the first is silently dropped by the insert. That was recorded as active,
 * ongoing data loss on 2026-08-13 and left unfixed because the obvious repairs
 * all churned ids fleet-wide.
 *
 * _resolveEventId() re-keys ONLY a proven collision — a second, differently
 * named event claiming an id that is already taken — onto name|eventDate|venue.
 *
 * BOTH DIRECTIONS MATTER, and the negative cases are the important half:
 * a resolver that re-keys too eagerly does not lose events, it DUPLICATES them,
 * because the same event would land under a different id on its next run. So
 * the suite asserts just as hard that ids stay PUT for:
 *   - the first sighting of any event,
 *   - an ordinary re-scrape of the same event (same name, same id),
 *   - events carrying genuine per-event URLs, which must never collide at all.
 */

const {
  _resolveEventId,
  _noteStableId,
  _stableEventId,
} = require('../scrapers/helpers/supabase-adapter');

let pass = 0;
let fail = 0;

function check(desc, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`  ✅ ${desc}`);
  } else {
    fail++;
    console.log(`  ❌ ${desc}\n       expected: ${expected}\n       actual:   ${actual}`);
  }
}

// Mirrors what add() does: resolve the id, then register it under the RAW name.
function save(data) {
  const id = _resolveEventId(data);
  _noteStableId(id, data.name, 'events');
  return id;
}

const SHARED = 'https://hamdenlibrary.org/events/';

console.log('\n=== 1. Shared URL: distinct events must NOT collapse ===\n');

// This is the exact shape of the recorded LibCal-CT / Hamden Public Library
// collision: two real, differently-named programmes, one shared calendar URL.
const a = save({
  name: 'Time For Twos Storytime',
  eventDate: '2026-09-10',
  venue: 'Hamden Public Library',
  url: SHARED,
});
const b = save({
  name: 'Garden Club',
  eventDate: '2026-09-10',
  venue: 'Hamden Public Library',
  url: SHARED,
});
const c = save({
  name: 'Card Club',
  eventDate: '2026-09-11',
  venue: 'Hamden Public Library',
  url: SHARED,
});

check('first event keeps the URL-derived id (no churn)', a, _stableEventId({ url: SHARED }));
check('second differently-named event gets its OWN id', b !== a, true);
check('third differently-named event gets its OWN id', c !== a && c !== b, true);
check(
  're-keyed id equals the canonical name|eventDate|venue id',
  b,
  _stableEventId({ name: 'Garden Club', eventDate: '2026-09-10', venue: 'Hamden Public Library' })
);

console.log('\n=== 2. Re-scrapes must be STABLE (no duplicate rows) ===\n');

// The same three events seen again, as on the next night's run.
check('re-scrape of the first event returns the same id', save({
  name: 'Time For Twos Storytime', eventDate: '2026-09-10',
  venue: 'Hamden Public Library', url: SHARED,
}), a);
check('re-scrape of a re-keyed event returns the same id', save({
  name: 'Garden Club', eventDate: '2026-09-10',
  venue: 'Hamden Public Library', url: SHARED,
}), b);
check('re-scrape of the third event returns the same id', save({
  name: 'Card Club', eventDate: '2026-09-11',
  venue: 'Hamden Public Library', url: SHARED,
}), c);

console.log('\n=== 3. Genuine per-event URLs must be untouched ===\n');

const p1 = save({
  name: 'Toddler Storytime', eventDate: '2026-09-12', venue: 'Easton Area Public Library',
  url: 'https://eastonpl.libcal.com/event/12345',
});
const p2 = save({
  name: 'Lunch at the Library', eventDate: '2026-09-12', venue: 'Easton Area Public Library',
  url: 'https://eastonpl.libcal.com/event/67890',
});
check('per-event URL #1 keeps its URL-derived id', p1, _stableEventId({ url: 'https://eastonpl.libcal.com/event/12345' }));
check('per-event URL #2 keeps its URL-derived id', p2, _stableEventId({ url: 'https://eastonpl.libcal.com/event/67890' }));
check('two per-event URLs never collide', p1 !== p2, true);

console.log('\n=== 4. Unrecoverable cases must fall through, not invent an id ===\n');

// No date and no venue -> there is no content key to re-key onto. The resolver
// must return the colliding id unchanged and let the old collision warning
// stand, rather than fabricating something unstable.
const SHARED2 = 'https://example-library.org/calendar';
const u1 = save({ name: 'Event One', url: SHARED2 });
const u2 = _resolveEventId({ name: 'Event Two', url: SHARED2 });
check('no date/venue available -> id is NOT re-keyed', u2, u1);

// Missing name -> nothing can be proven, keep the computed id.
const nameless = _resolveEventId({ url: SHARED2 });
check('missing name -> id unchanged', nameless, _stableEventId({ url: SHARED2 }));

console.log('\n=== 5. Events with no URL at all keep the content key ===\n');

const noUrl = _resolveEventId({
  name: 'Family Story Time', eventDate: '2026-09-13', venue: 'Berks County Public Libraries',
});
check('no URL -> canonical content id', noUrl, _stableEventId({
  name: 'Family Story Time', eventDate: '2026-09-13', venue: 'Berks County Public Libraries',
}));

console.log(`\n${'='.repeat(60)}`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}\n`);
process.exit(fail === 0 ? 0 : 1);
