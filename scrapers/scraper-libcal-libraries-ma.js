const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: MA
 * Libraries: [
  {
    "name": "Boston Public Library",
    "url": "https://www.bpl.org",
    "platform": "libcal",
    "eventsUrl": "https://www.bpl.org/calendar"
  }
]
 */

const LIBRARIES = [
  { name: "Boston Public Library", url: "https://www.bpl.org", platform: "libcal", eventsUrl: "https://www.bpl.org/calendar", city: "Boston", state: "MA", zipCode: "02116", county: "Suffolk" }
];

const SCRAPER_NAME = 'libcal-MA';

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
            state: 'MA'
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
    state: 'MA',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - MA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  // Log to database for monitoring


  await logScraperResult('Libcal Libraries MA', {


    found: events.length,


    new: events.length,


  }, { state: 'MA', source: 'libcal' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalEvents, saveToDatabase };
