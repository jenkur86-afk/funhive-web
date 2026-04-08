const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');
const { logScraperResult } = require('./scraper-logger');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: VA
 * Libraries: [
  {
    "name": "Fairfax County Public Library",
    "url": "https://www.fairfaxcounty.gov/library",
    "platform": "libcal",
    "eventsUrl": "https://librarycalendar.fairfaxcounty.gov"
  },
  {
    "name": "Arlington Public Library",
    "url": "https://library.arlingtonva.us",
    "platform": "libcal",
    "eventsUrl": "https://arlingtonva.libcal.com"
  },
  {
    "name": "Prince William Public Library System",
    "url": "https://www.pwcgov.org/library",
    "platform": "libcal",
    "eventsUrl": "https://pwcgov.libcal.com"
  }
]
 */

const LIBRARIES = [
  {
    name: "Fairfax County Public Library",
    url: "https://www.fairfaxcounty.gov/library",
    platform: "libcal",
    eventsUrl: "https://librarycalendar.fairfaxcounty.gov",
    city: "Fairfax",
    state: "VA",
    zipCode: "22030",
    county: "Fairfax"
  },
  {
    name: "Arlington Public Library",
    url: "https://library.arlingtonva.us",
    platform: "libcal",
    eventsUrl: "https://arlingtonva.libcal.com",
    city: "Arlington",
    state: "VA",
    zipCode: "22201",
    county: "Arlington"
  },
  {
    name: "Prince William Public Library System",
    url: "https://www.pwcgov.org/library",
    platform: "libcal",
    eventsUrl: "https://pwcgov.libcal.com",
    city: "Woodbridge",
    state: "VA",
    zipCode: "22192",
    county: "Prince William"
  }
];

const SCRAPER_NAME = 'libcal-VA';

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

            if (titleEl && dateEl) {
              const event = {
                title: titleEl.textContent.trim(),
                date: dateEl.textContent.trim(),
                time: timeEl ? timeEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : '',
                url: linkEl ? linkEl.href : window.location.href,
                imageUrl: imageEl ? imageEl.src : '',
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
          state: 'VA',
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'libcal',
            state: 'VA'
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

async function saveToFirebase(events) {
  await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VA',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - VA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  // Log to Firestore for monitoring
  await logScraperResult('LibCal Libraries VA', {
    found: events.length,
    new: events.length,
  }, { state: 'VA', source: 'libcal' });

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalEvents, saveToFirebase };
