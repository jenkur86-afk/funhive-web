/**
 * SUGAR CALENDAR LIBRARY SCRAPER — multi-state
 *
 * WHY THIS EXISTS
 * Sugar Calendar is a WordPress events plugin that is NOT The Events Calendar (TEC),
 * so `helpers/tec-rest-helper.js` cannot read it — its `wp-json/tribe/...` routes 404.
 * It also exposes no REST API of its own: on Warren County PL, `/wp-json/wp/v2/sc_event`
 * and `/wp-json/sugar-calendar/v1/events` both return `rest_no_route`, and `sc_event`
 * does not appear in `/wp-json/wp/v2/types`. Measured 2026-09-08, not assumed.
 *
 * What it DOES give us is clean server-rendered markup. Every event block carries a
 * machine-readable `<time datetime="2026-09-06T11:00:00">`, so there is no need to parse
 * the rendered day heading — which is the exact failure mode that made TEC list views
 * unscrapable (bare "Tue 4" headings with no month or year). We read the attribute.
 *
 * HOW IT WAS FOUND (2026-09-08)
 * LibCal-KY had reported 0 events on five consecutive runs since 2026-08-31. Two of its
 * three entries were already guarded as known-dead, so the whole scraper's output hung on
 * Warren County Public Library — and `warrenpl.libcal.com/calendar` now returns HTTP 404.
 * Per the standing rule that a bare 404 is not evidence a host is dead, the site's OWN
 * navigation was read instead (scripts/find-calendar-link.js), which led to
 * warrenpl.org/events-list/ — HTTP 200, 40 date strings, titled "Event Calendar: List
 * View | Warren County Public Library". The library moved off LibCal onto its own site.
 *
 * PAGINATION IS CLICK-DRIVEN, NOT URL-DRIVEN.
 * The block renders ONE WEEK at a time and its prev/next controls are <button> elements
 * with no href, so there is no page URL to fetch in a loop. Clicking "next" re-renders the
 * block in place; verified live across four weeks (35 / 41 / 34 / 40 events, ranges
 * advancing Sep 6-12 → Sep 27-Oct 3). WEEKS_TO_PAGE covers the project's ~60-day window.
 *
 * VENUE IS THE LIBRARY, NOT THE BRANCH. Titles often carry a branch shorthand
 * ("... @ SOKY Center", "... @ Rice") but the list view exposes no structured venue field,
 * and a shorthand is not an address — geocoding one would fall through to the county
 * centroid at best. Branch resolution would need the per-event detail page, which is ~300
 * extra loads per run; left as a known limitation rather than guessed at.
 */

const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');

// Per-site scraper_name, slugged from the listing URL's hostname — the same derivation
// buildScraperName() uses in the LibCal family and scraperNameFor() uses in GoogleCalendar-*,
// so the three read alike.
//
// The slug is applied UNCONDITIONALLY even though only one site is configured today. That
// is deliberate: `SugarCalendar-Libraries-warrenpl` classifies as PREFIXED (an OK class) in
// scripts/check-scraper-names.js, so it is conformant now, and adding a second site later
// cannot require renaming the first. The GoogleCalendar family's reason for keeping a bare
// key on single-library states was that slugging would churn attribution on ROWS THAT
// ALREADY EXIST; this family has no rows yet, so that cost is zero here.
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
  return slug ? `SugarCalendar-Libraries-${slug}` : 'SugarCalendar-Libraries';
}

const LIBRARIES = [
  {
    // Relocated from LibCal-KY on 2026-09-08. warrenpl.libcal.com/calendar 404s; the
    // library now publishes on its own WordPress site via Sugar Calendar. Identity is
    // from the page itself, not from name similarity: the calendar titles itself
    // "Event Calendar: List View | Warren County Public Library" and its events name
    // Bowling Green venues (SOKY Center, Rice).
    name: 'Warren County Public Library',
    url: 'https://www.warrenpl.org/events-list/',
    county: 'Warren',
    state: 'KY',
    website: 'https://www.warrenpl.org',
    city: 'Bowling Green',
    zipCode: '42101'
  }
];

// ~60 days forward, one week per click. The block shows a single week at a time.
const WEEKS_TO_PAGE = 9;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Sugar Calendar emits a FLOATING local datetime (no Z, no offset). Parse the parts out of
// the string rather than handing it to `new Date()` — CLAUDE.md's rule against
// `new Date("2026-04-23")` exists because JS treats some ISO shapes as UTC and shifts the
// day backwards in US timezones. A regex has no timezone opinion at all.
const ISO_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

function parseIsoLocal(s) {
  const m = ISO_LOCAL.exec(String(s || '').trim());
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5])
  };
}

function formatDate(p) {
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

function formatTime(p) {
  const ap = p.hour >= 12 ? 'PM' : 'AM';
  const h = p.hour % 12 || 12;
  return `${h}:${String(p.minute).padStart(2, '0')} ${ap}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Read every event block currently rendered in the list. Runs inside the page.
function extractRenderedEvents() {
  const EVENT = '.sugar-calendar-event-list-block__listview__event';
  const out = [];
  document.querySelectorAll(EVENT).forEach(el => {
    const link = el.querySelector('.sugar-calendar-event-list-block__event__title a');
    const titleEl = el.querySelector('.sugar-calendar-event-list-block__event__title');
    const title = ((link && link.textContent) || (titleEl && titleEl.textContent) || '').trim();
    if (!title) return;

    // The datetime block holds THREE <time> elements in the common case: the date span,
    // then a start-time span, then an end-time span. Read the date off the date span
    // specifically — the first <time> in the block is otherwise ambiguous for all-day
    // events, which carry no time spans at all.
    const dateEl = el.querySelector('.sc-frontend-single-event__details__val-date time[datetime]');
    const timeEls = el.querySelectorAll('.sc-frontend-single-event__details__val-time time[datetime]');
    const fallbackEl = el.querySelector('time[datetime]');
    const startIso = (dateEl && dateEl.getAttribute('datetime'))
      || (timeEls[0] && timeEls[0].getAttribute('datetime'))
      || (fallbackEl && fallbackEl.getAttribute('datetime'))
      || '';
    if (!startIso) return;

    const timedStart = timeEls[0] ? timeEls[0].getAttribute('datetime') : '';
    const timedEnd = timeEls[1] ? timeEls[1].getAttribute('datetime') : '';

    const descEl = el.querySelector('.sugar-calendar-event-list-block__event__desc');
    out.push({
      title,
      url: link ? link.href : '',
      startIso,
      timedStart,
      timedEnd,
      description: descEl ? descEl.textContent.replace(/\s+/g, ' ').trim() : ''
    });
  });
  return out;
}

async function scrapeLibrary(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  const events = [];
  const seen = new Set();
  const scraperName = scraperNameFor(library);
  let page;

  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
    await page.goto(library.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('.sugar-calendar-event-list-block__listview__event', { timeout: 20000 });

    for (let week = 0; week < WEEKS_TO_PAGE; week++) {
      const rendered = await page.evaluate(extractRenderedEvents);

      for (const r of rendered) {
        const parts = parseIsoLocal(r.startIso);
        if (!parts) continue;

        // Recurring events repeat across week boundaries and the block can re-render the
        // same occurrence while paging; key on the occurrence, not the series.
        const key = `${r.title.toLowerCase()}|${r.startIso}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const startParts = parseIsoLocal(r.timedStart);
        const endParts = parseIsoLocal(r.timedEnd);

        events.push({
          name: r.title,
          venue: library.name,
          eventDate: formatDate(parts),
          startTime: startParts ? formatTime(startParts) : null,
          endTime: endParts ? formatTime(endParts) : null,
          description: r.description.substring(0, 1000),
          url: r.url || library.url,
          state: library.state,
          metadata: {
            sourceName: library.name,
            // The site's own listing page, NOT the individual event's URL — the
            // source_url rule in CLAUDE.md.
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName,
            county: library.county,
            category: 'library',
            platform: 'sugar-calendar',
            state: library.state
          }
        });
      }

      if (week === WEEKS_TO_PAGE - 1) break;

      const advanced = await page.evaluate(() => {
        const b = document.querySelector('.sugar-calendar-block__controls__left__pagination__next');
        if (!b || b.disabled) return false;
        b.click();
        return true;
      });
      if (!advanced) break;
      // The block re-renders in place over AJAX; there is no navigation to await.
      await sleep(2500);
    }

    console.log(`   Found ${events.length} events`);
  } catch (error) {
    console.log(`   ⚠️ ${library.name} failed: ${error.message}`);
    console.log(`   Found ${events.length} events`);
  } finally {
    if (page) { try { await page.close(); } catch (_) { /* page already gone */ } }
  }

  return events;
}

async function scrapeSugarCalendarLibraries(stateFilter = null) {
  const targets = stateFilter ? LIBRARIES.filter(l => l.state === stateFilter) : LIBRARIES;

  console.log('\n📚 SUGAR CALENDAR LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log(`${stateFilter ? `State: ${stateFilter} - ` : ''}${targets.length} libraries`);
  console.log('='.repeat(60));

  const browser = await launchBrowser();
  const byLibrary = [];
  try {
    for (const library of targets) {
      const events = await scrapeLibrary(library, browser);
      byLibrary.push({ library, events });
    }
  } finally {
    try { await browser.close(); } catch (_) { /* browser already gone */ }
  }

  const all = byLibrary.reduce((n, x) => n + x.events.length, 0);
  console.log(`\n📊 Total events found: ${all}`);
  return byLibrary;
}

/**
 * Save ONE LIBRARY PER CALL — the same constraint documented in scraper-gcal-libraries.js.
 * saveEventsWithGeocoding() overwrites metadata.scraperName with the options-level
 * `scraperName`, so a per-site name set on the event alone would be discarded, and a write
 * name that differs from the lookup name is a data-loss hazard rather than a cosmetic one.
 */
async function saveToDatabase(byLibrary) {
  const totals = { saved: 0, skipped: 0, invalidDate: 0, errors: 0 };

  for (const { library, events } of byLibrary) {
    if (!events.length) continue;
    const r = await saveEventsWithGeocoding(events, [library], {
      scraperName: scraperNameFor(library),
      state: library.state,
      category: 'library',
      platform: 'sugar-calendar'
    });
    totals.saved += (r && r.saved) || 0;
    totals.skipped += (r && r.skipped) || 0;
    totals.invalidDate += (r && r.invalidDate) || 0;
    totals.errors += (r && r.errors) || 0;
  }
  return totals;
}

async function runSugarCalendarLibraries(stateFilter = null) {
  const byLibrary = await scrapeSugarCalendarLibraries(stateFilter);
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

async function scrapeSugarCalendarLibrariesCloudFunction() {
  return runSugarCalendarLibraries();
}

module.exports = {
  scrapeSugarCalendarLibraries,
  saveToDatabase,
  runSugarCalendarLibraries,
  scrapeSugarCalendarLibrariesCloudFunction,
  LIBRARIES
};

if (require.main === module) {
  const stateArg = process.argv.find(a => a.startsWith('--state='));
  runSugarCalendarLibraries(stateArg ? stateArg.split('=')[1] : null)
    .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
