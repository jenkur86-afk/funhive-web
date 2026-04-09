const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: CA
 * Libraries: [
  {
    "name": "San Diego Public Library",
    "url": "https://www.sandiego.gov/public-library",
    "platform": "libcal",
    "eventsUrl": "https://sandiego.libcal.com"
  },
  {
    "name": "San Francisco Public Library",
    "url": "https://sfpl.org",
    "platform": "libcal",
    "eventsUrl": "https://sfpl.libcal.com"
  },
  {
    "name": "Sacramento Public Library",
    "url": "https://www.saclibrary.org",
    "platform": "libcal",
    "eventsUrl": "https://saclibrary.bibliocommons.com"
  },
  {
    "name": "Fresno County Public Library",
    "url": "https://www.fresnolibrary.org",
    "platform": "libcal",
    "eventsUrl": "https://fresnolibrary.libcal.com"
  },
  {
    "name": "Oakland Public Library",
    "url": "https://oaklandlibrary.org",
    "platform": "libcal",
    "eventsUrl": "https://oaklandlibrary.bibliocommons.com"
  },
  {
    "name": "Santa Clara County Library",
    "url": "https://sccl.org",
    "platform": "libcal",
    "eventsUrl": "https://sccl.bibliocommons.com"
  },
  {
    "name": "Contra Costa County Library",
    "url": "https://ccclib.org",
    "platform": "libcal",
    "eventsUrl": "https://ccclib.bibliocommons.com"
  },
  {
    "name": "Riverside County Library System",
    "url": "https://www.rivlib.net",
    "platform": "libcal",
    "eventsUrl": "https://rivlib.libcal.com"
  },
  {
    "name": "Orange County Public Libraries",
    "url": "https://www.ocpl.org",
    "platform": "libcal",
    "eventsUrl": "https://ocpl.libcal.com"
  },
  {
    "name": "San Mateo County Libraries",
    "url": "https://www.smcl.org",
    "platform": "libcal",
    "eventsUrl": "https://smcl.bibliocommons.com"
  },
  {
    "name": "Sonoma County Library",
    "url": "https://sonomalibrary.org",
    "platform": "libcal",
    "eventsUrl": "https://events.sonomalibrary.org"
  }
]
 */

const LIBRARIES = [
  { name: "San Diego Public Library", url: "https://www.sandiego.gov/public-library", platform: "libcal", eventsUrl: "https://sandiego.libcal.com", city: "San Diego", state: "CA", zipCode: "92101", county: "San Diego" },
  { name: "San Francisco Public Library", url: "https://sfpl.org", platform: "libcal", eventsUrl: "https://sfpl.libcal.com", city: "San Francisco", state: "CA", zipCode: "94102", county: "San Francisco" },
  { name: "Sacramento Public Library", url: "https://www.saclibrary.org", platform: "libcal", eventsUrl: "https://saclibrary.bibliocommons.com", city: "Sacramento", state: "CA", zipCode: "95814", county: "Sacramento" },
  { name: "Fresno County Public Library", url: "https://www.fresnolibrary.org", platform: "libcal", eventsUrl: "https://fresnolibrary.libcal.com", city: "Fresno", state: "CA", zipCode: "93721", county: "Fresno" },
  { name: "Oakland Public Library", url: "https://oaklandlibrary.org", platform: "libcal", eventsUrl: "https://oaklandlibrary.bibliocommons.com", city: "Oakland", state: "CA", zipCode: "94612", county: "Alameda" },
  { name: "Santa Clara County Library", url: "https://sccl.org", platform: "libcal", eventsUrl: "https://sccl.bibliocommons.com", city: "San Jose", state: "CA", zipCode: "95113", county: "Santa Clara" },
  { name: "Contra Costa County Library", url: "https://ccclib.org", platform: "libcal", eventsUrl: "https://ccclib.bibliocommons.com", city: "Pleasant Hill", state: "CA", zipCode: "94523", county: "Contra Costa" },
  { name: "Riverside County Library System", url: "https://www.rivlib.net", platform: "libcal", eventsUrl: "https://rivlib.libcal.com", city: "Riverside", state: "CA", zipCode: "92501", county: "Riverside" },
  { name: "Orange County Public Libraries", url: "https://www.ocpl.org", platform: "libcal", eventsUrl: "https://ocpl.libcal.com", city: "Santa Ana", state: "CA", zipCode: "92701", county: "Orange" },
  { name: "San Mateo County Libraries", url: "https://www.smcl.org", platform: "libcal", eventsUrl: "https://smcl.bibliocommons.com", city: "San Mateo", state: "CA", zipCode: "94402", county: "San Mateo" },
  { name: "Sonoma County Library", url: "https://sonomalibrary.org", platform: "libcal", eventsUrl: "https://events.sonomalibrary.org", city: "Santa Rosa", state: "CA", zipCode: "95404", county: "Sonoma" }
];

const SCRAPER_NAME = 'libcal-CA';

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
            state: 'CA'
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
    state: 'CA',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - CA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  // Log to Firestore for monitoring


  await logScraperResult('Libcal Libraries CA', {


    found: events.length,


    new: events.length,


  }, { state: 'CA', source: 'libcal' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalEvents, saveToFirebase };
