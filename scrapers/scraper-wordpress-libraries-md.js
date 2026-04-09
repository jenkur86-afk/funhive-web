const { launchBrowser } = require('./puppeteer-config');
const { logScraperResult } = require('./scraper-logger');
const { admin, db } = require('./helpers/supabase-adapter');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: MD
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Charles County Public Library",
    "url": "https://www.ccplonline.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ccplonline.org/events"
  },
  {
    "name": "St. Mary's County Library",
    "url": "https://www.stmalib.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.stmalib.org/events"
  },
  {
    "name": "Washington County Free Library",
    "url": "https://www.washcolibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.washcolibrary.org/events"
  },
  {
    "name": "Wicomico Public Libraries",
    "url": "https://www.wicomicolibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.wicomicolibrary.org/events"
  },
  {
    "name": "Cecil County Public Library",
    "url": "https://www.cecilcountylibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://cecilcountylibrary.org/events"
  },
  {
    "name": "Dorchester County Public Library",
    "url": "https://www.dorchesterlibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.dorchesterlibrary.org/events"
  },
  {
    "name": "Somerset County Library",
    "url": "https://www.somelibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.somelibrary.org/events"
  },
  {
    "name": "Queen Anne's County Library",
    "url": "https://www.qaclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.qaclibrary.org/events"
  },
  {
    "name": "Talbot County Free Library",
    "url": "https://www.tcfl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.tcfl.org/events"
  },
  {
    "name": "Worcester County Library",
    "url": "https://www.worcesterlibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.worcesterlibrary.org/events"
  },
  {
    "name": "Garrett County Public Library",
    "url": "https://www.garrettlibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.garrettlibrary.org/events"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Charles County Public Library",
    "url": "https://www.ccplonline.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ccplonline.org/events", county: 'Charles'},
  {
    "name": "St. Mary's County Library",
    "url": "https://www.stmalib.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.stmalib.org/events", county: 'Baltimore City'},
  {
    "name": "Washington County Free Library",
    "url": "https://www.washcolibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.washcolibrary.org/events", county: 'Washington'},
  {
    "name": "Wicomico Public Libraries",
    "url": "https://www.wicomicolibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.wicomicolibrary.org/events", county: 'Wicomico'},
  {
    "name": "Cecil County Public Library",
    "url": "https://www.cecilcountylibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://cecilcountylibrary.org/events"
  },
  {
    "name": "Dorchester County Public Library",
    "url": "https://www.dorchesterlibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.dorchesterlibrary.org/events", county: 'Dorchester'},
  {
    "name": "Somerset County Library",
    "url": "https://www.somelibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.somelibrary.org/events", county: 'Somerset'},
  {
    "name": "Queen Anne's County Library",
    "url": "https://www.qaclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.qaclibrary.org/events", county: 'Baltimore City'},
  {
    "name": "Talbot County Free Library",
    "url": "https://www.tcfl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.tcfl.org/events", county: 'Talbot'},
  {
    "name": "Worcester County Library",
    "url": "https://worcesterlibrary.org",
    "platform": "libcal",
    "eventsUrl": "https://worcesterlibrary.libcal.com/calendar/Library_Events", county: 'Worcester'}
  // Note: Garrett County (Ruth Enlow Library) is covered by scraper-librarymarket-libraries-md.js
];

const SCRAPER_NAME = 'generic-MD';

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

      // Transform and add to collection
      libraryEvents.forEach(event => {
        events.push({
          ...event,
          state: 'MD',
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
    state: 'MD',
    category: 'library',
    platform: 'wordpress'
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

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMDCloudFunction() {
  console.log('☁️ Running WordPress MD as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MD', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-MD', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressMDCloudFunction };
