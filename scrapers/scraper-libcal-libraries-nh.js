const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: NH
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
    "name": "Kelley Library",
    "city": "Salem",
    "state": "NH",
    "zipCode": "03079",
    "eventsUrl": "https://cityofsalemlibrary.libcal.com/calendar/events"
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
  { name: "Kelley Library", url: "https://cityofsalemlibrary.libcal.com", platform: "libcal", eventsUrl: "https://cityofsalemlibrary.libcal.com/calendar/events", city: "Salem", state: "NH", zipCode: "03079", county: "Rockingham" },
  { name: "Merrimack Public Library", url: "https://merrimack.libcal.com", platform: "libcal", eventsUrl: "https://merrimack.libcal.com/", city: "Merrimack", state: "NH", zipCode: "03054", county: "Hillsborough" },
  { name: "Hooksett Public Library", url: "https://hooksettlibrary.libcal.com", platform: "libcal", eventsUrl: "https://hooksettlibrary.libcal.com/calendar", city: "Hooksett", state: "NH", zipCode: "03106", county: "Merrimack" },
  { name: "Hollis Social Library", url: "https://hollislibrary.libcal.com", platform: "libcal", eventsUrl: "https://hollislibrary.libcal.com/calendar", city: "Hollis", state: "NH", zipCode: "03049", county: "Hillsborough" },
  { name: "Pelham Public Library", url: "https://pelhampubliclibrary.libcal.com", platform: "libcal", eventsUrl: "https://pelhampubliclibrary.libcal.com/calendar/events", city: "Pelham", state: "NH", zipCode: "03076", county: "Hillsborough" }
];

const SCRAPER_NAME = 'libcal-NH';

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
  await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NH',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - NH (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  // Log to database for monitoring


  await logScraperResult('Libcal Libraries NH', {


    found: events.length,


    new: events.length,


  }, { state: 'NH', source: 'libcal' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalNH: scrapeLibCalEvents, saveToDatabase };
