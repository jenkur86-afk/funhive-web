const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');

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

const LIBRARIES = [
  { name: "Dakota County Library", url: "https://dakotacountylibrary.libcal.com", platform: "libcal", eventsUrl: "https://dakotacountylibrary.libcal.com/", city: "Apple Valley", state: "MN", zipCode: "55124", county: "Dakota" },
  { name: "Anoka County Library", url: "https://anokacounty.libcal.com", platform: "libcal", eventsUrl: "https://anokacounty.libcal.com/", city: "Blaine", state: "MN", zipCode: "55434", county: "Anoka" },
  { name: "Washington County Library", url: "https://washcolib.libcal.com", platform: "libcal", eventsUrl: "https://washcolib.libcal.com/", city: "Woodbury", state: "MN", zipCode: "55125", county: "Washington" },
  { name: "Scott County Library", url: "https://scottlib.libcal.com", platform: "libcal", eventsUrl: "https://scottlib.libcal.com/", city: "Savage", state: "MN", zipCode: "55378", county: "Scott" },
  { name: "Great River Regional Library", url: "https://events.griver.org", platform: "libcal", eventsUrl: "https://events.griver.org/calendar/stcloudlibraryevents", city: "St. Cloud", state: "MN", zipCode: "56301", county: "Stearns" },
  { name: "Bloomington Public Library", url: "https://bloomingtonlibrary.libcal.com", platform: "libcal", eventsUrl: "https://bloomingtonlibrary.libcal.com/", city: "Bloomington", state: "MN", zipCode: "55431", county: "Hennepin" },
  { name: "Plymouth Public Library", url: "https://plymouthpubliclibrary.libcal.com", platform: "libcal", eventsUrl: "https://plymouthpubliclibrary.libcal.com/", city: "Plymouth", state: "MN", zipCode: "55441", county: "Hennepin" }
];

const SCRAPER_NAME = 'libcal-MN';

async function scrapeLibCalEvents() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for LibCal events container
      await page.waitForSelector('.s-lc-ea-e, .s-lc-whw-row', { timeout: 10000 }).catch(() => null);

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // LibCal event cards
        document.querySelectorAll('.s-lc-ea-e, .s-lc-whw-row').forEach(card => {
          try {
            const titleEl = card.querySelector('.s-lc-ea-ttl, h3');
            const dateEl = card.querySelector('.s-lc-ea-date, .event-date');
            const timeEl = card.querySelector('.s-lc-ea-time, .event-time');
            const descEl = card.querySelector('.s-lc-ea-desc, .event-description');
            const linkEl = card.querySelector('a[href]');
            const imageEl = card.querySelector('img');
            const locationEl = card.querySelector('.s-lc-ea-loc, .event-location');
            const ageEl = card.querySelector('.s-lc-ea-audience, .s-lc-ea-cat, [class*="audience"], [class*="age"], .event-category');

            if (titleEl && dateEl) {
              const event = {
                title: titleEl.textContent.trim(),
                date: dateEl.textContent.trim(),
                time: timeEl ? timeEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : '',
                url: linkEl ? linkEl.href : window.location.href,
                imageUrl: imageEl ? imageEl.src : '',
                ageRange: ageEl ? ageEl.textContent.trim() : '',
                location: locationEl ? locationEl.textContent.trim() : libName,
                venueName: libName
              };

              events.push(event);
            }
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
  await saveEventsWithGeocoding(events, LIBRARIES, {
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

module.exports = { scrapeLibCalMN: scrapeLibCalEvents, saveToDatabase };
