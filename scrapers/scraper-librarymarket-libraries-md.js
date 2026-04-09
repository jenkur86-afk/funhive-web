const { launchBrowser } = require('./puppeteer-config');
const { normalizeDateString } = require('./date-normalization-helper');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const { getBranchAddress } = require('./library-addresses');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');
const { ScraperLogger } = require('./scraper-logger');

/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: MD
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Enoch Pratt Free Library",
    "url": "https://www.prattlibrary.org",
    "platform": "librarymarket",
    "eventsUrl": "https://calendar.prattlibrary.org"
  },
  {
    "name": "Calvert Library",
    "url": "https://calvertlibrary.info",
    "platform": "librarymarket",
    "eventsUrl": "https://calvertlibrary.libnet.info/events"
  },
  {
    "name": "Allegany County Library System",
    "url": "https://www.alleganycountylibrary.info",
    "platform": "librarymarket",
    "eventsUrl": "https://allegany.librarymarket.com"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Enoch Pratt Free Library",
    "url": "https://www.prattlibrary.org",
    "platform": "librarymarket",
    "eventsUrl": "https://calendar.prattlibrary.org",
    city: 'Baltimore',
    state: 'MD',
    county: 'Baltimore City',
    zipCode: '21201'
  },
  {
    "name": "Calvert Library",
    "url": "https://calvertlibrary.info",
    "platform": "librarymarket",
    "eventsUrl": "https://calvertlibrary.libnet.info/events",
    city: 'Prince Frederick',
    state: 'MD',
    county: 'Calvert',
    zipCode: '20678'
  },
  {
    "name": "Allegany County Library System",
    "url": "https://www.alleganycountylibrary.info",
    "platform": "librarymarket",
    "eventsUrl": "https://allegany.librarymarket.com",
    city: 'Cumberland',
    state: 'MD',
    county: 'Allegany',
    zipCode: '21502'
  },
  {
    "name": "Ruth Enlow Library of Garrett County",
    "url": "https://www.relib.net",
    "platform": "librarymarket",
    "eventsUrl": "https://relib.librarymarket.com/events/month",
    city: 'Oakland',
    state: 'MD',
    county: 'Garrett',
    zipCode: '21550'
  },
  {
    "name": "Carroll County Public Library",
    "url": "https://library.carr.org",
    "platform": "librarymarket",
    "eventsUrl": "https://ccpl.librarymarket.com/events/upcoming",
    city: 'Westminster',
    state: 'MD',
    county: 'Carroll',
    zipCode: '21157'
  }
];

const SCRAPER_NAME = 'LibraryMarket MD';

async function scrapeGenericEvents() {
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

      // Transform and add to collection with branch address lookup
      for (const event of libraryEvents) {
        // Normalize date format before saving
        const normalizedDate = normalizeDateString(event.date);
        if (!normalizedDate && event.date) {
          console.log(`   ⚠️ Skipping event with invalid date: "${event.date}"`);
          continue;
        }

        // Try to extract branch name from location field
        let branchName = null;
        const locationText = event.location || '';

        // Common branch patterns in location text
        // e.g., "Westminster Branch", "Eldersburg Library", "Central"
        if (locationText !== library.name) {
          const branchMatch = locationText.match(/^([^,\-–]+?)(?:\s+(?:Branch|Library))?(?:\s*[-–,]|$)/i);
          if (branchMatch && branchMatch[1].trim().length > 3) {
            branchName = branchMatch[1].trim();
          }
        }

        // Get branch address from library-addresses.js
        const branchLocation = getBranchAddress(library.name, branchName, 'MD');

        events.push({
          ...event,
          date: normalizedDate || event.date,
          state: 'MD',
          branchName: branchName || '',
          branchAddress: branchLocation?.address || '',
          branchCity: branchLocation?.city || library.city || '',
          branchZipCode: branchLocation?.zipCode || library.zipCode || '',
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'generic',
            state: 'MD',
            needsReview: true // Flag for manual review
          }
        });
      }

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
  await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'MD',
    category: 'library',
    platform: 'librarymarket'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - MD (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  // Log to Firestore for monitoring


  await logScraperResult('Librarymarket Libraries MD', {


    found: events.length,


    new: events.length,


  }, { state: 'MD', source: 'librarymarket' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

/**
 * Cloud Function export
 */
async function scrapeLibraryMarketMDCloudFunction() {
  console.log('☁️ Running LibraryMarket MD as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length > 0) {
    await saveToFirebase(events);
  }
  return { imported: events.length, total: events.length };
}

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeLibraryMarketMDCloudFunction };
