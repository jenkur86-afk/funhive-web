/**
 * WHOFI LIBRARY SCRAPER — multi-state
 *
 * WHY THIS EXISTS
 * WhoFi is a hosted library-events platform serving `{town}-{st}.whofi.com`. Nothing in
 * this repo could read it, so every library that had migrated onto it was a permanent
 * zero no matter which family its registry entry sat in. Two were carrying explicit
 * "OPEN GAP needing a WhoFi extractor" notes — North Kingstown Free Library RI (guarded
 * inside the LibCal family) and Seekonk Public Library MA (guarded inside WordPress-MA) —
 * and both are closed by this file.
 *
 * NO PUPPETEER, AND THAT IS A MEASURED CHOICE, NOT AN OMISSION.
 * The pending note WHOFI-EXTRACTOR-NEEDED set exactly one precondition before building:
 * establish whether the calendar is server-rendered or client-rendered, because that
 * decides whether the extractor needs a browser and therefore what it costs to run.
 * Measured 2026-09-09 with a plain HTTP GET: both instances return HTTP 200 with ~600 KB
 * of markup containing the event titles, dates, times, audiences and rooms already
 * rendered — 61 events for North Kingstown, 60 for Seekonk, extracted 61/61 and 60/60.
 * So this uses `fetch`, which matters beyond tidiness: `reports/fix-notes.json` records
 * concurrent heavy Chrome workloads as the leading suspect for a 37-scraper launch
 * failure, and this scraper adds none.
 *
 * THE DATE CARRIES NO YEAR — this is the one real trap in the format.
 * Each card renders `<p class="fs-5 fw-bold text-gray-800">Wednesday, September 9th</p>`.
 * There is no year anywhere in the card. The year exists only in the page's range heading
 * ("September 09 2026 to October 09 2026"), so it is read from there and matched back to
 * each event. This is the same shape as the TEC bare-day-heading problem that made those
 * list views unscrapable — the difference is that here the window IS available on the
 * page, so the year is derived rather than guessed. `resolveYear()` picks the candidate
 * that actually falls inside the window, which is what makes a December-to-January window
 * roll over correctly instead of filing January events under the outgoing year.
 *
 * THE WINDOW IS FIXED AT ~30 DAYS AND CANNOT BE WIDENED.
 * `?start_date=`/`?end_date=`/`?date_range=` were all probed and every one returned the
 * identical default window and identical event count — the server ignores them. So one
 * fetch per library is the whole run; there is no pagination to write and no point
 * looping. 30 days sits inside the project's ~60-day horizon, so the cost is coverage
 * depth, not correctness. Recorded so nobody re-derives it.
 *
 * VENUE IS THE LIBRARY. THE ROOM IS NOT THE VENUE.
 * Cards carry a Room field ("Meeting Room", "Children's Room"). That is deliberately NOT
 * used as the venue. On 2026-09-09 a LibCal tenant that published rooms this way put 7
 * rows into the database venued "Children's Room", which geocodes to nothing and reaches
 * the activities table as a place on the map; 180 such rows across the LibCal family had
 * to be repaired that morning. The room is appended to the description, where it is
 * useful to a reader and harmless to geocoding.
 *
 * AUDIENCE — WHY IT GOES THROUGH THE DESCRIPTION AND NOT STRAIGHT INTO `ageRange`.
 * WhoFi exposes a structured Audience field, and the obvious move is the one ActiveNet and
 * CivicRec make: pass it through as `data.ageRange` and let `normalizeAgeRange()` parse it.
 * That is WRONG here, measured 2026-09-09 against the live values this platform actually
 * emits:
 *
 *     normalizeAgeRange('Grades 6 - 12') -> Kids (6-8)      detectAgeRange -> Tweens (9-12)
 *     normalizeAgeRange('Grades K - 5')  -> Kids (6-8)      detectAgeRange -> Preschool (3-5)
 *     normalizeAgeRange('Children')      -> All Ages        detectAgeRange -> Kids (6-8)
 *
 * `normalizeAgeRange()`'s generic numeric scan reads "6 - 12" as AGES; these are GRADES,
 * and grade N is roughly age N+5. `detectAgeRange()` has the anchored grade rules and gets
 * every one right. So the audience is appended to the description, where the shared
 * pipeline reads it through `detectAgeRange()` — no local age logic in this file, which is
 * the rule CLAUDE.md states.
 *
 * The ONE exception is an exactly-"Adult" audience. A bare "Adult" in a description
 * deliberately does not fire the adult rules — that anchoring is what stops "children must
 * be accompanied by an adult" from deleting family events — so an adult-only WhoFi event
 * would otherwise be stored as All Ages and PUBLISHED on a family site. Where the
 * structured field says exactly Adult/Adults, that is authoritative and is supplied as
 * `ageRange: 'Adults'`. `resolveAgeRange()` still gives a supplied 'Adults' a second
 * opinion, so a title with a real child signal overrides it — verified both directions.
 */

const { saveEventsWithGeocoding } = require('./event-save-helper');

/**
 * Per-site `scraper_name`, slugged from the listing URL's hostname — the same derivation
 * `buildScraperName()` uses in the LibCal family and `scraperNameFor()` uses in
 * SugarCalendar-Libraries, so all three read alike and classify as PREFIXED in
 * scripts/check-scraper-names.js.
 *
 * WhoFi hostnames are `{town}-{st}.whofi.com`, so the slug already encodes the town AND
 * the state — `northkingstown-ri`, `seekonk-ma`. That is unusually good for attribution
 * and is why the slug is taken whole rather than split.
 */
const GENERIC_HOST_LABELS = new Set(['www', 'events', 'calendar', 'lib', 'library']);

function siteSlug(url) {
  try {
    const labels = new URL(url).hostname.toLowerCase().split('.');
    while (labels.length > 1 && GENERIC_HOST_LABELS.has(labels[0])) labels.shift();
    return (labels[0] || '').replace(/[^a-z0-9-]/g, '');
  } catch (_) {
    return '';
  }
}

function scraperNameFor(library) {
  const slug = siteSlug(library.url);
  return slug ? `WhoFi-Libraries-${slug}` : 'WhoFi-Libraries';
}

const LIBRARIES = [
  {
    // Was LibCal-RI, guarded there since 2026-09-03 with the note
    // "nklibrary.libcal.com 404s - the library publishes on northkingstown-ri.whofi.com,
    // a platform no scraper here supports. OPEN GAP needing a WhoFi extractor".
    //
    // IDENTITY FROM THE LIVE PAGE, not from the hostname: the calendar titles itself
    // "Event Calendar | North Kingstown Free Library". The prior entry had already
    // verified the institution independently — 100 Boone Street, North Kingstown RI
    // 02852, phone 401-294-3306, and 401 is Rhode Island's only area code.
    // Verified 2026-09-09: 61 events across 24 distinct dates.
    name: 'North Kingstown Free Library',
    url: 'https://northkingstown-ri.whofi.com/calendar',
    website: 'https://www.nklibrary.org',
    city: 'North Kingstown',
    county: 'Washington',
    state: 'RI',
    zipCode: '02852'
  },
  {
    // Was WordPress-MA, guarded there 2026-09-07. That entry's own note is worth keeping
    // in mind: a LibCal tenant for this library DOES exist and returns HTTP 200, but every
    // calendar path under it 404s and it holds zero events — a LibCal entry was drafted
    // and pulled before shipping precisely because it would have produced 0 rows while
    // looking like a fix. This is the real calendar.
    //
    // IDENTITY: the page titles itself "Event Calendar | Seekonk Public Library" and the
    // host is seekonk-ma. NOTE FOR A FUTURE READER: the page also mentions "Rhode Island",
    // which a state-conflict check would flag. That is geography, not a collision —
    // Seekonk MA sits on the RI border next to Providence. The `-ma` host and the page
    // title are the decisive signals. Verified 2026-09-09: 60 events across 28 dates.
    name: 'Seekonk Public Library',
    url: 'https://seekonk-ma.whofi.com/calendar',
    website: 'https://www.seekonklibrary.org',
    city: 'Seekonk',
    county: 'Bristol',
    state: 'MA',
    zipCode: '02771'
  }
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_INDEX = new Map(MONTHS.map((m, i) => [m.toLowerCase(), i + 1]));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * The page's range heading, e.g. "September 09 2026 to October 09 2026". This is the ONLY
 * place a year appears, so a page without it cannot be dated and the library is skipped
 * rather than guessed at — a wrong year is worse than a missing event, because a past date
 * is silently dropped by saveEvent() and a future one publishes on the wrong day.
 */
function parseWindow(html) {
  const m = html.match(/<h3[^>]*>\s*([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\s+to\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\s*<\/h3>/);
  if (!m) return null;
  const startMonth = MONTH_INDEX.get(m[1].toLowerCase());
  const endMonth = MONTH_INDEX.get(m[4].toLowerCase());
  if (!startMonth || !endMonth) return null;
  return {
    start: { year: Number(m[3]), month: startMonth, day: Number(m[2]) },
    end: { year: Number(m[6]), month: endMonth, day: Number(m[5]) }
  };
}

const asNumber = p => p.year * 10000 + p.month * 100 + p.day;

/**
 * Give a year to a card date that has none.
 *
 * Tries each year present in the window and keeps the candidate that actually lands inside
 * it. That is what makes a window spanning a year boundary work: for "December 20 2026 to
 * January 19 2027", a card reading "January 5th" only falls inside the window under 2027,
 * so it dates to 2027 rather than to the window's opening year.
 *
 * Returns null when no candidate fits, and the caller drops the event. A card outside its
 * own page's window is a format change, and inventing a year for it would put a wrong date
 * in the database — the one outcome this whole function exists to avoid.
 */
function resolveYear(month, day, win) {
  const candidates = win.start.year === win.end.year
    ? [win.start.year]
    : [win.start.year, win.end.year];
  const lo = asNumber(win.start);
  const hi = asNumber(win.end);
  for (const year of candidates) {
    const n = year * 10000 + month * 100 + day;
    if (n >= lo && n <= hi) return year;
  }
  return null;
}

const decode = s => String(s || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#0?39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * One card's worth of fields. Cards are split on the `card-body` marker rather than parsed
 * with a DOM library because the markup is Bootstrap-utility soup with no stable event
 * class — the split point is the only reliable boundary, and it produced exactly the
 * advertised card count on both instances (61 and 60).
 */
function parseCard(card, win, library) {
  const link = card.match(/<a href="(https?:[^"]*\/calendar\/event\/(\d+))"[^>]*class="text-gray-900[^"]*"[^>]*>([\s\S]*?)<span class="visually-hidden"/);
  if (!link) return null;
  const title = decode(link[3]);
  if (!title) return null;

  // "Wednesday, September 9th" — weekday, month name, ordinal day, no year.
  const dateEl = card.match(/<p class="fs-5 fw-bold text-gray-800">([^<]+)<\/p>/);
  if (!dateEl) return null;
  const dm = decode(dateEl[1]).match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*$/);
  if (!dm) return null;
  const month = MONTH_INDEX.get(dm[1].toLowerCase());
  const day = Number(dm[2]);
  if (!month || !day) return null;
  const year = resolveYear(month, day, win);
  if (!year) return null;

  const timeEl = card.match(/<p class="fs-5 fw-bold text-black-700">([^<]+)<\/p>/);
  const timeText = timeEl ? decode(timeEl[1]) : '';
  const times = timeText.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);

  const field = label => {
    const m = card.match(new RegExp(`title="${label}"[^>]*><\\/i><\\/b>&nbsp;&nbsp;([^<]+)<`));
    return m ? decode(m[1]) : '';
  };
  const audience = field('Audience');
  const room = field('Room');

  const blurbEl = card.match(/<div class="mb-2 fs-4 description_div">([\s\S]*?)<\/div>/);
  const blurb = blurbEl ? decode(blurbEl[1]) : '';

  // Audience and room ride in the description. Audience is there so the SHARED
  // detectAgeRange() can read it (see the header note on why the raw value must not go
  // into ageRange); room is there because it is useful to a reader and must never reach
  // the venue column.
  const description = [
    blurb,
    audience ? `Audience: ${audience}.` : '',
    room ? `Room: ${room}.` : ''
  ].filter(Boolean).join(' ').trim();

  const event = {
    name: title,
    eventDate: `${MONTHS[month - 1]} ${day}, ${year}`,
    url: link[1],
    description,
    // The LIBRARY, never the room. See the header note.
    venue: library.name,
    location: library.name,
    city: library.city,
    state: library.state,
    zipCode: library.zipCode
  };
  if (times) {
    event.startTime = times[1].toUpperCase().replace(/\s+/, ' ');
    event.endTime = times[2].toUpperCase().replace(/\s+/, ' ');
  }
  // Structured adult audience is authoritative; every other value is left to the shared
  // detector via the description. resolveAgeRange() still overrides this when the title
  // carries a real child signal.
  if (/^adults?$/i.test(audience)) event.ageRange = 'Adults';

  return event;
}

async function scrapeLibrary(library) {
  console.log(`\n📍 ${library.name} (${library.city}, ${library.state})`);
  console.log(`   URL: ${library.url}`);
  let html;
  try {
    const res = await fetch(library.url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) {
      console.log(`   ❌ HTTP ${res.status}`);
      console.log('   Found 0 events');
      return [];
    }
    html = await res.text();
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    console.log('   Found 0 events');
    return [];
  }

  const win = parseWindow(html);
  if (!win) {
    // Loud, because it is the failure that would otherwise mis-date every event silently.
    console.log('   ⚠️ No date-range heading found — cannot establish the year, skipping this library');
    console.log('   Found 0 events');
    return [];
  }

  const cards = html.split('<div class="card-body pt-9 pb-0">').slice(1);
  const events = [];
  let unparsed = 0;
  for (const card of cards) {
    const ev = parseCard(card, win, library);
    if (ev) events.push(ev);
    else unparsed++;
  }

  console.log(`   Window: ${MONTHS[win.start.month - 1]} ${win.start.day} ${win.start.year} → ${MONTHS[win.end.month - 1]} ${win.end.day} ${win.end.year}`);
  console.log(`   Found ${events.length} events`);
  if (unparsed) console.log(`   ⚠️ ${unparsed} card(s) could not be parsed`);
  return events;
}

async function scrapeWhoFiLibraries(stateFilter = null) {
  const targets = stateFilter ? LIBRARIES.filter(l => l.state === stateFilter) : LIBRARIES;

  console.log('\n📚 WHOFI LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log(`${stateFilter ? `State: ${stateFilter} - ` : ''}${targets.length} libraries`);
  console.log('='.repeat(60));

  const byLibrary = [];
  for (const library of targets) {
    byLibrary.push({ library, events: await scrapeLibrary(library) });
  }

  const all = byLibrary.reduce((n, x) => n + x.events.length, 0);
  console.log(`\n📊 Total events found: ${all}`);
  return byLibrary;
}

/**
 * Save ONE LIBRARY PER CALL — the same constraint documented in scraper-gcal-libraries.js
 * and scraper-sugarcalendar-libraries.js. saveEventsWithGeocoding() overwrites
 * metadata.scraperName with the options-level `scraperName`, so a per-site name set on the
 * event alone is discarded, and a write name differing from the lookup name loses data
 * rather than merely looking untidy.
 */
async function saveToDatabase(byLibrary) {
  const totals = { saved: 0, skipped: 0, invalidDate: 0, errors: 0 };
  for (const { library, events } of byLibrary) {
    if (!events.length) continue;
    const r = await saveEventsWithGeocoding(events, [library], {
      scraperName: scraperNameFor(library),
      sourceUrl: library.url,
      state: library.state,
      category: 'library',
      platform: 'whofi'
    });
    totals.saved += (r && r.saved) || 0;
    totals.skipped += (r && r.skipped) || 0;
    totals.invalidDate += (r && r.invalidDate) || 0;
    totals.errors += (r && r.errors) || 0;
  }
  return totals;
}

async function runWhoFiLibraries(stateFilter = null) {
  const byLibrary = await scrapeWhoFiLibraries(stateFilter);
  const found = byLibrary.reduce((n, x) => n + x.events.length, 0);
  if (!found) return { found: 0, saved: 0, duplicates: 0, invalidDate: 0 };

  const result = await saveToDatabase(byLibrary);
  return {
    found,
    saved: result.saved,
    duplicates: result.skipped,
    invalidDate: result.invalidDate
  };
}

async function scrapeWhoFiLibrariesCloudFunction() {
  return runWhoFiLibraries();
}

module.exports = {
  scrapeWhoFiLibraries,
  saveToDatabase,
  runWhoFiLibraries,
  scrapeWhoFiLibrariesCloudFunction,
  // Exported for tests and for the population sweep.
  LIBRARIES,
  parseWindow,
  resolveYear,
  parseCard,
  scraperNameFor
};

if (require.main === module) {
  const stateArg = process.argv.find(a => a.startsWith('--state='));
  runWhoFiLibraries(stateArg ? stateArg.split('=')[1] : null)
    .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
