const { launchBrowser } = require('./helpers/puppeteer-config');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: MN
 * Libraries: [
  {
    "name": "Dakota County Library",
    "city": "Apple Valley",
    "state": "MN",
    "zipCode": "55124",
    "eventsUrl": "https://dakotacountylibrary.libcal.com/"
  },
  {
    "name": "Anoka County Library",
    "city": "Blaine",
    "state": "MN",
    "zipCode": "55434",
    "eventsUrl": "https://anokacounty.libcal.com/"
  },
  {
    "name": "Washington County Library",
    "city": "Woodbury",
    "state": "MN",
    "zipCode": "55125",
    "eventsUrl": "https://washcolib.libcal.com/"
  },
  {
    "name": "Scott County Library",
    "city": "Savage",
    "state": "MN",
    "zipCode": "55378",
    "eventsUrl": "https://scottlib.libcal.com/"
  },
  {
    "name": "Great River Regional Library",
    "city": "St. Cloud",
    "state": "MN",
    "zipCode": "56301",
    "eventsUrl": "https://events.griver.org/calendar/stcloudlibraryevents"
  },
  {
    "name": "Bloomington Public Library",
    "city": "Bloomington",
    "state": "MN",
    "zipCode": "55431",
    "eventsUrl": "https://bloomingtonlibrary.libcal.com/"
  },
  {
    "name": "Plymouth Public Library",
    "city": "Plymouth",
    "state": "MN",
    "zipCode": "55441",
    "eventsUrl": "https://plymouthpubliclibrary.libcal.com/"
  }
]
 */

// eventsUrl fixed 2026-07-14: bare root domains are each tenant's LibCal
// homepage/dashboard, not the events calendar — it has no .s-lc-eventcard
// list at all, so every library silently found 0 events. Pointed each at its
// actual calendar page instead (found by inspecting the "calendar" links on
// each homepage). Bloomington Public Library's LibCal tenant only exposes a
// month-grid dashboard with no discoverable calendar ID or list/agenda view
// (no cid in the page, no view-toggle buttons) — left as the bare root URL
// since there is no reachable events list to scrape.
const LIBRARIES = [
  { name: "Dakota County Library", url: "https://dakotacountylibrary.libcal.com", platform: "libcal", eventsUrl: "https://dakotacountylibrary.libcal.com/calendar?cid=9306", city: "Apple Valley", state: "MN", zipCode: "55124", county: "Dakota" },
  { name: "Anoka County Library", url: "https://anokacounty.libcal.com", platform: "libcal", eventsUrl: "https://anokacounty.libcal.com/calendar?cid=9233", city: "Blaine", state: "MN", zipCode: "55434", county: "Anoka" },
  { name: "Washington County Library", url: "https://washcolib.libcal.com", platform: "libcal", eventsUrl: "https://washcolib.libcal.com/calendar/events", city: "Woodbury", state: "MN", zipCode: "55125", county: "Washington" },
  { name: "Scott County Library", url: "https://scottlib.libcal.com", platform: "libcal", eventsUrl: "https://scottlib.libcal.com/calendar?cid=10242", city: "Savage", state: "MN", zipCode: "55378", county: "Scott" },
  { name: "Great River Regional Library", url: "https://events.griver.org", platform: "libcal", eventsUrl: "https://events.griver.org/calendar/stcloudlibraryevents", city: "St. Cloud", state: "MN", zipCode: "56301", county: "Stearns" },
  { name: "Bloomington Public Library", url: "https://bloomingtonlibrary.libcal.com", platform: "libcal", eventsUrl: "https://bloomingtonlibrary.libcal.com/", city: "Bloomington", state: "MN", zipCode: "55431", county: "Hennepin" },
  { name: "Plymouth Public Library", url: "https://plymouthpubliclibrary.libcal.com", platform: "libcal", eventsUrl: "https://plymouthpubliclibrary.libcal.com/calendar/programs", city: "Plymouth", state: "MN", zipCode: "55441", county: "Hennepin" }
];

const SCRAPER_NAME = 'libcal-MN';

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

      // Some libraries' calendars default to LibCal's Monthly/grid view instead
      // of Card view, which uses a completely different, unstructured DOM and
      // renders 0 .s-lc-eventcard elements. The "Card View" toggle is a
      // <button>, not a link with a URL param, so it has to be clicked rather
      // than requested via a query string. This is a no-op (fails harmlessly,
      // caught below) for libraries already defaulting to Card view.
      await page.click('.s-lc-nav-card').catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Wait for LibCal events container. LibCal renamed all its event-card
      // classes at some point after this scraper was generated (old
      // .s-lc-ea-e/.s-lc-whw-row selectors matched 0 elements, silently
      // returning 0 events for every library with no error — current markup
      // uses .s-lc-eventcard, see scraper-libcal-libraries-nh.js which was
      // fixed for the same issue on 2026-07-06).
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
            state: 'MN'
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
    state: 'MN',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - MN (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  // Log to database for monitoring


  await logScraperResult('Libcal Libraries MN', {


    found: events.length,


    new: events.length,


  }, { state: 'MN', source: 'libcal' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

async function scrapeLibCalMN() {
  const events = await scrapeLibCalEvents();

  const result = events.length > 0
    ? await saveToDatabase(events)
    : { saved: 0, skipped: 0, errors: 0, deleted: 0 };

  await logScraperResult('Libcal Libraries MN', {
    found: events.length,
    new: result.saved,
  }, { state: 'MN', source: 'libcal' });

  return { found: events.length, ...result };
}

module.exports = { scrapeLibCalMN, scrapeLibCalEvents, saveToDatabase };
