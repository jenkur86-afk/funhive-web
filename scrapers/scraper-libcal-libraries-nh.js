const { launchBrowser } = require('./helpers/puppeteer-config');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: NH
 *
 * Fixed 2026-07-06: stale .s-lc-ea-e/.s-lc-whw-row selectors (LibCal renamed
 * its markup to .s-lc-eventcard at some point), a broken registry export
 * (scrapeLibCalNH pointed at scrape-only code that never saved), some
 * libraries defaulting to Monthly/grid view instead of Card view, and
 * Merrimack's config pointing at the homepage widget instead of the real
 * calendar page. Kelley Library was removed from this list entirely — its
 * config (cityofsalemlibrary.libcal.com) was actually Salem, OREGON's
 * library system, not Salem, NH; Kelley Library is on Assabet Interactive
 * and now lives in scraper-assabet-libraries-nh-ma.js instead.
 *
 * Libraries: [
  {
    "name": "Manchester City Library",
    "city": "Manchester",
    "state": "NH",
    "zipCode": "03101",
    "eventsUrl": "https://manchester-lib-nh.libcal.com/calendar"
  },
  {
    "name": "Nashua Public Library",
    "city": "Nashua",
    "state": "NH",
    "zipCode": "03060",
    "eventsUrl": "https://nashualibrary.libcal.com/calendar/events"
  },
  {
    "name": "Concord Public Library",
    "city": "Concord",
    "state": "NH",
    "zipCode": "03301",
    "eventsUrl": "https://concordnh-pl.libcal.com/calendar"
  },
  {
    "name": "Keene Public Library",
    "city": "Keene",
    "state": "NH",
    "zipCode": "03431",
    "eventsUrl": "https://keenenh.libcal.com/calendar"
  },
  {
    "name": "Lebanon Public Libraries",
    "city": "Lebanon",
    "state": "NH",
    "zipCode": "03766",
    "eventsUrl": "https://leblibrary.libcal.com/calendars"
  },
  {
    "name": "Merrimack Public Library",
    "city": "Merrimack",
    "state": "NH",
    "zipCode": "03054",
    "eventsUrl": "https://merrimack.libcal.com/"
  },
  {
    "name": "Hooksett Public Library",
    "city": "Hooksett",
    "state": "NH",
    "zipCode": "03106",
    "eventsUrl": "https://hooksettlibrary.libcal.com/calendar"
  },
  {
    "name": "Hollis Social Library",
    "city": "Hollis",
    "state": "NH",
    "zipCode": "03049",
    "eventsUrl": "https://hollislibrary.libcal.com/calendar"
  },
  {
    "name": "Pelham Public Library",
    "city": "Pelham",
    "state": "NH",
    "zipCode": "03076",
    "eventsUrl": "https://pelhampubliclibrary.libcal.com/calendar/events"
  }
]
 */

const LIBRARIES = [
  { name: "Manchester City Library", url: "https://manchester-lib-nh.libcal.com", platform: "libcal", eventsUrl: "https://manchester-lib-nh.libcal.com/calendar", city: "Manchester", state: "NH", zipCode: "03101", county: "Hillsborough" },
  { name: "Nashua Public Library", url: "https://nashualibrary.libcal.com", platform: "libcal", eventsUrl: "https://nashualibrary.libcal.com/calendar/events", city: "Nashua", state: "NH", zipCode: "03060", county: "Hillsborough" },
  { name: "Concord Public Library", url: "https://concordnh-pl.libcal.com", platform: "libcal", eventsUrl: "https://concordnh-pl.libcal.com/calendar", city: "Concord", state: "NH", zipCode: "03301", county: "Merrimack" },
  { name: "Keene Public Library", url: "https://keenenh.libcal.com", platform: "libcal", eventsUrl: "https://keenenh.libcal.com/calendar", city: "Keene", state: "NH", zipCode: "03431", county: "Cheshire" },
  { name: "Lebanon Public Libraries", url: "https://leblibrary.libcal.com", platform: "libcal", eventsUrl: "https://leblibrary.libcal.com/calendars", city: "Lebanon", state: "NH", zipCode: "03766", county: "Grafton" },
  { name: "Merrimack Public Library", url: "https://merrimack.libcal.com", platform: "libcal", eventsUrl: "https://merrimack.libcal.com/calendar", city: "Merrimack", state: "NH", zipCode: "03054", county: "Hillsborough" },
  { name: "Hooksett Public Library", url: "https://hooksettlibrary.libcal.com", platform: "libcal", eventsUrl: "https://hooksettlibrary.libcal.com/calendar", city: "Hooksett", state: "NH", zipCode: "03106", county: "Merrimack" },
  { name: "Hollis Social Library", url: "https://hollislibrary.libcal.com", platform: "libcal", eventsUrl: "https://hollislibrary.libcal.com/calendar", city: "Hollis", state: "NH", zipCode: "03049", county: "Hillsborough" },
  { name: "Pelham Public Library", url: "https://pelhampubliclibrary.libcal.com", platform: "libcal", eventsUrl: "https://pelhampubliclibrary.libcal.com/calendar/events", city: "Pelham", state: "NH", zipCode: "03076", county: "Hillsborough" }
];

const SCRAPER_NAME = 'libcal-NH';

async function scrapeLibCalEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Some libraries' calendars default to LibCal's Monthly/grid view
      // instead of Card view (caught 2026-07-06: Lebanon and Pelham both
      // rendered 0 .s-lc-eventcard elements until this button was clicked —
      // the grid view uses a completely different, unstructured DOM). The
      // "Card View" toggle is a <button>, not a link with a URL param, so it
      // has to be clicked rather than requested via a query string. This is
      // a no-op (fails harmlessly, caught below) for libraries already
      // defaulting to Card view.
      await page.click('.s-lc-nav-card').catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Wait for LibCal events container. LibCal renamed all its event-card
      // classes at some point after this scraper was generated (old
      // .s-lc-ea-e/.s-lc-whw-row selectors matched 0 elements, silently
      // returning 0 events for every library with no error — caught
      // 2026-07-06 by inspecting the live rendered DOM, current markup uses
      // .s-lc-eventcard).
      await page.waitForSelector('.s-lc-eventcard', { timeout: 10000 }).catch(() => null);

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        document.querySelectorAll('.s-lc-eventcard').forEach(card => {
          try {
            const titleEl = card.querySelector('.s-lc-eventcard-title a');
            const monthEl = card.querySelector('.s-lc-evt-date-m');
            const dayEl = card.querySelector('.s-lc-evt-date-d');
            const headingTextEls = card.querySelectorAll('.s-lc-eventcard-heading-text');
            const descEl = card.querySelector('.s-lc-eventcard-description');
            const imageEl = card.querySelector('.s-lc-eventcard-heading-image img');
            const tagEls = card.querySelectorAll('.s-lc-event-category-link');

            if (!titleEl || !monthEl || !dayEl) return;

            // First heading-text div holds either "Sat, 10:00 AM - 12:00 PM"
            // (single occurrence) or "Jun 22 - Jul 31" (multi-day range, no
            // time); second holds the room/location (often blank for
            // multi-day ranges with no fixed room).
            const dateTimeText = headingTextEls[0] ? headingTextEls[0].textContent.trim().replace(/\s+/g, ' ') : '';
            const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
            const location = headingTextEls[1] ? headingTextEls[1].textContent.trim() : '';

            // Infer year: LibCal's month/day-only date has no year. Assume
            // current year unless that would place the event more than ~30
            // days in the past, in which case it must be next year
            // (calendar always shows "today forward").
            const now = new Date();
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const monthIdx = monthNames.indexOf(monthEl.textContent.trim());
            const day = parseInt(dayEl.textContent.trim(), 10);
            let year = now.getFullYear();
            if (monthIdx >= 0 && !isNaN(day)) {
              const candidate = new Date(year, monthIdx, day);
              if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) {
                year += 1;
              }
            }

            const dateStr = monthIdx >= 0
              ? `${monthNames[monthIdx]} ${day}, ${year}${timeMatch ? ' ' + timeMatch[1] : ''}`
              : '';

            const rawDescription = descEl ? descEl.textContent.replace(/\s*More\s*$/i, '').trim() : '';
            const tags = Array.from(tagEls).map(t => t.getAttribute('data-original-title') || t.textContent.trim()).filter(Boolean);

            const event = {
              title: titleEl.textContent.trim(),
              date: dateStr,
              time: timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '',
              description: rawDescription,
              url: titleEl.href || window.location.href,
              imageUrl: imageEl ? imageEl.src : '',
              ageRange: tags.join(', '),
              location: location || libName,
              venueName: libName
            };

            events.push(event);
          } catch (e) {
            console.error('Error parsing event:', e);
          }
        });

        return events;
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      // Transform and add to collection
      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'libcal',
            state: 'NH'
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();

  console.log(`\n📊 Total events found: ${events.length}`);

  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NH',
    category: 'library',
    platform: 'libcal'
  });
}

// Entry point used by local-scraper-runner.js (registry exportName:
// 'scrapeLibCalNH'). Previously this name was aliased directly to
// scrapeLibCalEvents() (scrape-only, never saves) instead of a function that
// also calls saveToDatabase() — meaning events were scraped but never
// persisted when run through the registry (caught 2026-07-06: scraper log
// showed "Found: 192" internally but the runner reported "Found: 0, New: 0"
// since scrapeLibCalEvents() returns a bare array with no save-result
// fields). Also must not call process.exit() here — that would kill the
// whole Node process mid-run when invoked as part of a multi-scraper group.
async function scrapeLibCalNH() {
  const events = await scrapeLibCalEvents();

  const result = events.length > 0
    ? await saveToDatabase(events)
    : { saved: 0, skipped: 0, errors: 0, deleted: 0 };

  await logScraperResult('Libcal Libraries NH', {
    found: events.length,
    new: result.saved,
  }, { state: 'NH', source: 'libcal' });

  return { found: events.length, ...result };
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - NH (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  await scrapeLibCalNH();

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalNH, saveToDatabase };
