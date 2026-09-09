#!/usr/bin/env node
/**
 * Unit suite for the WhoFi extractor's date handling.
 *
 * Read-only, no network, no DB. It exists because the one real trap in the WhoFi format is
 * that a card's date carries NO YEAR — "Wednesday, September 9th" — and the year has to be
 * derived from the page's range heading. Getting that wrong is silent in both directions:
 * a year too early makes saveEvent() drop the row as a past event, a year too late
 * publishes it on the wrong day. Neither shows up as an error anywhere.
 *
 * The December-to-January rollover is the case that cannot be observed live for most of the
 * year, which is exactly why it is pinned here rather than left to be discovered in
 * January.
 *
 * Run: node scripts/test-whofi-extractor.js
 */
const { parseWindow, resolveYear, parseCard, scraperNameFor } = require('../scrapers/scraper-whofi-libraries');

let pass = 0;
const failures = [];

function check(what, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++;
  else failures.push({ what, got, expected });
}

// --- parseWindow -----------------------------------------------------------
check('window parses the live heading shape',
  parseWindow('<h3 class="fw-bold fs-1 me-5 my-1 text-gray-900">September 09 2026 to October 09 2026</h3>'),
  { start: { year: 2026, month: 9, day: 9 }, end: { year: 2026, month: 10, day: 9 } });

check('window spanning a year boundary keeps both years',
  parseWindow('<h3>December 20 2026 to January 19 2027</h3>'),
  { start: { year: 2026, month: 12, day: 20 }, end: { year: 2027, month: 1, day: 19 } });

// A page with no heading must yield null so the caller SKIPS the library. Returning a
// guessed window here is the failure this whole suite is about.
check('missing heading returns null rather than a guess', parseWindow('<h3>Upcoming Events</h3>'), null);
check('non-month word returns null', parseWindow('<h3>Smarch 09 2026 to October 09 2026</h3>'), null);

// --- resolveYear -----------------------------------------------------------
const sameYear = { start: { year: 2026, month: 9, day: 9 }, end: { year: 2026, month: 10, day: 9 } };
check('date inside a same-year window', resolveYear(9, 15, sameYear), 2026);
check('date on the window start boundary', resolveYear(9, 9, sameYear), 2026);
check('date on the window end boundary', resolveYear(10, 9, sameYear), 2026);
check('date outside the window is rejected, not coerced', resolveYear(11, 1, sameYear), null);

// THE ROLLOVER. Under a naive "use the window's opening year" rule, January 5th would be
// dated 2026 — eleven and a half months in the past — and saveEvent() would silently drop
// it as a past event, so the library would look empty rather than broken.
const rollover = { start: { year: 2026, month: 12, day: 20 }, end: { year: 2027, month: 1, day: 19 } };
check('December card takes the opening year', resolveYear(12, 25, rollover), 2026);
check('January card takes the CLOSING year', resolveYear(1, 5, rollover), 2027);
check('January 19 boundary takes the closing year', resolveYear(1, 19, rollover), 2027);
check('a date in neither year is rejected', resolveYear(6, 1, rollover), null);

// --- parseCard -------------------------------------------------------------
const LIB = { name: 'North Kingstown Free Library', city: 'North Kingstown', state: 'RI', zipCode: '02852' };

// Trimmed from the live North Kingstown page, 2026-09-09.
const CARD = `
 <a href="https://northkingstown-ri.whofi.com/calendar/event/1306174" target="_blank" class="text-gray-900 text-hover-primary fs-2 fw-bold me-1">Lego Drop-in!<span class="visually-hidden">(Opens in a new tab)</span></a>
 <div class="mb-2 fs-4 description_div"> <p class="fw-bold text-black-700">Join us for a Drop-in Lego from 2:30 to 4:30 p.m.</p> </div>
 <p class="fs-5 fw-bold text-gray-800">Wednesday, September 9th</p>
 <p class="fs-5 fw-bold text-black-700">2:30 pm - 4:30 pm</p>
 <b><i title="Audience" class="fa-solid fa-users-viewfinder fs-2"></i></b>&nbsp;&nbsp;Children </div>
 <b><i title="Room" class="fa-solid fa-door-open fs-2"></i></b>&nbsp;&nbsp;Meeting Room </div>
`;

const ev = parseCard(CARD, sameYear, LIB);
check('title', ev && ev.name, 'Lego Drop-in!');
check('date gets the derived year', ev && ev.eventDate, 'September 9, 2026');
check('event url', ev && ev.url, 'https://northkingstown-ri.whofi.com/calendar/event/1306174');
check('start time', ev && ev.startTime, '2:30 PM');
check('end time', ev && ev.endTime, '4:30 PM');

// THE VENUE RULE. A room name reaching the venue column is the defect that put 180 LibCal
// rows into the database venued "Children's Room" on 2026-09-09.
check('venue is the LIBRARY, never the room', ev && ev.venue, 'North Kingstown Free Library');
check('room is not the venue', /Meeting Room/.test((ev && ev.venue) || ''), false);
check('room is preserved in the description instead', /Room: Meeting Room\./.test((ev && ev.description) || ''), true);

// Audience must reach the description so the SHARED detectAgeRange() can read it, and must
// NOT be handed to normalizeAgeRange() as a raw ageRange — "Grades 6 - 12" is grades, not
// ages, and the raw path buckets it as Kids (6-8) instead of Tweens.
check('audience reaches the description', /Audience: Children\./.test((ev && ev.description) || ''), true);
check('a non-adult audience does NOT set ageRange', ev && ev.ageRange, undefined);

const adultCard = CARD.replace('&nbsp;&nbsp;Children ', '&nbsp;&nbsp;Adult ');
const adultEv = parseCard(adultCard, sameYear, LIB);
check('an exactly-Adult audience DOES set ageRange', adultEv && adultEv.ageRange, 'Adults');

// A card whose date falls outside its own page window is a format change. Dropping it is
// correct; dating it anyway would write a wrong date.
check('card outside the window is dropped', parseCard(CARD, rollover, LIB), null);
check('card with no date element is dropped',
  parseCard(CARD.replace(/<p class="fs-5 fw-bold text-gray-800">[^<]+<\/p>/, ''), sameYear, LIB), null);

// --- scraper_name ----------------------------------------------------------
check('per-site slug from the host',
  scraperNameFor({ url: 'https://northkingstown-ri.whofi.com/calendar' }), 'WhoFi-Libraries-northkingstown-ri');
check('second site gets its own name',
  scraperNameFor({ url: 'https://seekonk-ma.whofi.com/calendar' }), 'WhoFi-Libraries-seekonk-ma');

// --- report ----------------------------------------------------------------
console.log('\nWHOFI EXTRACTOR SUITE');
console.log('─'.repeat(60));
for (const f of failures) {
  console.log(`FAIL  ${f.what}\n        got      ${JSON.stringify(f.got)}\n        expected ${JSON.stringify(f.expected)}`);
}
console.log('─'.repeat(60));
console.log(`${pass}/${pass + failures.length} cases passed, ${failures.length} failure(s)`);
process.exit(failures.length ? 1 : 0);
