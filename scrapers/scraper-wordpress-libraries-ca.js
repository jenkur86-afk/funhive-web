const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: CA
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Los Angeles Public Library",
    "url": "https://www.lapl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.lapl.org/events"
  },
  {
    "name": "San Jose Public Library",
    "url": "https://www.sjpl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.sjpl.org/events"
  },
  {
    "name": "Long Beach Public Library",
    "url": "https://www.longbeach.gov/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.longbeach.gov/library/events"
  },
  {
    "name": "Alameda County Library",
    "url": "https://aclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://aclibrary.org/events"
  },
  {
    "name": "San Bernardino County Library",
    "url": "https://www.sbcounty.gov/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.sbcounty.gov/library/events"
  },
  {
    "name": "Kern County Library",
    "url": "https://www.kerncountylibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.kerncountylibrary.org/events"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Los Angeles Public Library",
    "url": "https://www.lapl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.lapl.org/events", county: 'Baltimore City'},
  {
    "name": "San Jose Public Library",
    "url": "https://www.sjpl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.sjpl.org/events", county: 'Baltimore City'},
  {
    "name": "Long Beach Public Library",
    "url": "https://www.longbeach.gov/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.longbeach.gov/library/events", county: 'Baltimore City'},
  {
    "name": "Alameda County Library",
    "url": "https://aclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://aclibrary.org/events", county: 'Baltimore City'},
  {
    "name": "San Bernardino County Library",
    "url": "https://www.sbcounty.gov/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.sbcounty.gov/library/events"
  },
  {
    "name": "Kern County Library",
    "url": "https://www.kerncountylibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.kerncountylibrary.org/events"
  }
];

const SCRAPER_NAME = 'generic-CA';

async function scrapeGenericEvents() {
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

      // Wait for any event-like content
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Generic selectors for event cards/items
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          '[id*="event"]',
          'article',
          '.post',
          '.item'
        ];

        const foundElements = new Set();

        // Try each selector
        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              // Try to find title, date, description
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('[class*="name"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}|^\d{1,2}:\d{2}/i)
                )
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('[class*="summary"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');
              const imageEl = card.querySelector('img');

              // Look for age/audience info on the event card
              const ageEl = [
                card.querySelector('[class*="audience"]'),
                card.querySelector('[class*="age-range"]'),
                card.querySelector('[class*="age_range"]'),
                card.querySelector('[class*="ages"]'),
                card.querySelector('[class*="age-group"]'),
                card.querySelector('[class*="category"]')
              ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (possibleTitles.length > 0) {
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  time: possibleDates.length > 1 ? possibleDates[1].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                // Only add if it looks like an event (has title and some other field)
                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
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
            platform: 'generic',
            state: 'CA',
            needsReview: true // Flag for manual review
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();

  console.log(`\n📊 Total events found: ${events.length}`);

  return events;
}

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'CA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - CA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressCACloudFunction() {
  console.log('☁️ Running WordPress CA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-CA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-CA', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressCACloudFunction };
