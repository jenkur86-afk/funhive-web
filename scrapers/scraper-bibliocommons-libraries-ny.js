const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');

/**
 * AUTO-GENERATED BIBLIOCOMMONS SCRAPER
 * State: NY
 * Libraries: [
  {
    "name": "Brooklyn Public Library",
    "url": "https://www.bklynlibrary.org",
    "platform": "bibliocommons",
    "eventsUrl": "https://www.bklynlibrary.org/calendar"
  }
]
 */

const LIBRARIES = [
  { name: "Brooklyn Public Library", url: "https://www.bklynlibrary.org", platform: "bibliocommons", eventsUrl: "https://www.bklynlibrary.org/calendar", city: "Brooklyn", state: "NY", zipCode: "11238", county: "Kings" }
];

const SCRAPER_NAME = 'bibliocommons-NY';

async function scrapeBiblioCommonsEvents() {
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

      // BiblioCommons uses API endpoints
      const page = await browser.newPage();

      // Intercept API calls
      const apiEvents = [];
      page.on('response', async response => {
        const url = response.url();
        if (url.includes('/events') || url.includes('/api/')) {
          try {
            const json = await response.json();
            if (json.entities || json.events || json.data) {
              apiEvents.push(json);
            }
          } catch (e) {
            // Not JSON response
          }
        }
      });

      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      await page.waitForSelector('.cp-event-card, .event-item', { timeout: 10000 }).catch(() => null);

      // First try: scrape from API responses
      if (apiEvents.length > 0) {
        console.log(`   Found ${apiEvents.length} API responses`);

        apiEvents.forEach(apiResp => {
          const eventList = apiResp.entities || apiResp.events || apiResp.data || [];

          eventList.forEach(evt => {
            events.push({
              title: evt.title || evt.name || '',
              date: evt.start_date || evt.date || evt.startDate || '',
              time: evt.start_time || evt.time || evt.startTime || '',
              description: evt.description || evt.body || '',
              url: evt.url || evt.link || library.eventsUrl,
              imageUrl: evt.image_url || evt.image || evt.imageUrl || '',
              location: evt.location || library.name,
              ageRange: evt.age_range || evt.audience || '',
              venueName: library.name,
              metadata: {
                sourceName: library.name,
                sourceUrl: library.url,
                scrapedAt: new Date().toISOString(),
                scraperName: SCRAPER_NAME,
                category: 'Storytimes & Library',
                platform: 'bibliocommons',
                state: 'NY'
              }
            });
          });
        });
      }

      // Fallback: scrape from page
      if (events.length === 0) {
        const libraryEvents = await page.evaluate((libName) => {
          const events = [];

          document.querySelectorAll('.cp-event-card, .event-item, [data-event-id]').forEach(card => {
            try {
              const titleEl = card.querySelector('.cp-event-card-title, .event-title, h3');
              const dateEl = card.querySelector('.cp-event-card-date, .event-date, .date');
              const timeEl = card.querySelector('.cp-event-card-time, .event-time, .time');
              const descEl = card.querySelector('.cp-event-card-description, .event-description');
              const linkEl = card.querySelector('a[href]');
              const imageEl = card.querySelector('img');
              const ageEl = card.querySelector('.cp-event-audience, .event-tags, [class*="audience"], [class*="age"], a[href*="audiences="]');

              if (titleEl) {
                events.push({
                  title: titleEl.textContent.trim(),
                  date: dateEl ? dateEl.textContent.trim() : '',
                  time: timeEl ? timeEl.textContent.trim() : '',
                  description: descEl ? descEl.textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                });
              }
            } catch (e) {
              console.error('Error parsing event:', e);
            }
          });

          return events;
        }, library.name);

        libraryEvents.forEach(event => {
          events.push({
            ...event,
            metadata: {
              sourceName: library.name,
              sourceUrl: library.url,
              scrapedAt: new Date().toISOString(),
              scraperName: SCRAPER_NAME,
              category: 'Storytimes & Library',
              platform: 'bibliocommons',
              state: 'NY'
            }
          });
        });
      }

      console.log(`   ✅ Found ${events.filter(e => e.metadata.sourceName === library.name).length} events`);

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
    state: 'NY',
    category: 'library',
    platform: 'bibliocommons'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  BiblioCommons Scraper - NY (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeBiblioCommonsEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  // Log to Firestore for monitoring


  await logScraperResult('Bibliocommons Libraries NY', {


    found: events.length,


    new: events.length,


  }, { state: 'NY', source: 'bibliocommons' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeBiblioCommonsEvents, saveToFirebase };
