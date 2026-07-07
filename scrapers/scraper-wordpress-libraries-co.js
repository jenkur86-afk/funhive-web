const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: CO
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Denver Public Library",
    "url": "https://www.denverlibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.denverlibrary.org/events"
  }
]
 */

const LIBRARIES = [
  { name: 'Denver Public Library', url: 'https://www.denverlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.denverlibrary.org/events', city: 'Denver', state: 'CO', zipCode: '', county: '' },
  { name: 'Akron Public Library', url: 'https://www.akronlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'CO', zipCode: '80720', county: '' },
  { name: 'Pitkin County Library', url: 'https://pitcolib.org/', platform: 'wordpress', eventsUrl: 'https://pitcolib.org/library-events?field_audience_target_id%5B1%5D=1', city: 'Aspen', state: 'CO', zipCode: '81611', county: '' },
  { name: 'Avon Branch Library', url: 'https://www.avonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'CO', zipCode: '', county: '' },
  { name: 'Park County Public Library', url: 'https://www.parkcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.parkcountylibrary.org/', city: 'Bailey', state: 'CO', zipCode: '', county: '' },
  { name: 'Brighton Branch Library', url: 'https://www.brightonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brightonlibrary.org/events', city: 'Brighton', state: 'CO', zipCode: '', county: '' },
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'CO', zipCode: '80807', county: '' },
  { name: 'Garfield County Library - Gordon Cooper', url: 'https://www.garfieldcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/', city: 'Carbondale', state: 'CO', zipCode: '', county: '' },
  { name: 'Center Public Library', url: 'https://www.centerlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.centerlibrary.org/', city: 'Center', state: 'CO', zipCode: '', county: '' },
  { name: 'Crawford Community Library', url: 'https://crawfordlibrary.org/', platform: 'wordpress', eventsUrl: 'https://crawfordlibrary.org/', city: 'Crawford', state: 'CO', zipCode: '', county: '' },
  { name: 'Dolores Public Library', url: 'https://www.doloreslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.doloreslibrary.org/events', city: 'Dolores', state: 'CO', zipCode: '', county: '' },
  { name: 'Durango Public Library', url: 'https://durango.ent.sirsi.net/', platform: 'wordpress', eventsUrl: 'https://durango.ent.sirsi.net/client/en_US/default', city: 'Durango', state: 'CO', zipCode: '81301', county: '' },
  { name: 'Eaton Public Library', url: 'https://www.eatonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eatonlibrary.org/events', city: 'Eaton', state: 'CO', zipCode: '', county: '' },
  { name: 'Edgewater Library', url: 'https://www.edgewaterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'CO', zipCode: '', county: '' },
  { name: 'Elbert County Library District', url: 'https://www.elbertcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elbertcountylibrary.org/events', city: 'Elizabeth', state: 'CO', zipCode: '80107', county: '' },
  { name: 'Park County Public Library', url: 'https://www.parkcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.parkcountylibrary.org/', city: 'Fairplay', state: 'CO', zipCode: '80440', county: '' },
  { name: 'Flagler Community Library', url: 'https://www.flaglerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.flaglerlibrary.org/events', city: 'Flagler', state: 'CO', zipCode: '80815', county: '' },
  { name: 'Harmony Library', url: 'https://www.harmonylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Fort Collins', state: 'CO', zipCode: '', county: '' },
  { name: 'Glendale Library', url: 'https://www.glendalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.glendalelibrary.org/events', city: 'Glendale', state: 'CO', zipCode: '', county: '' },
  { name: 'Garfield County Library - Glenwood Springs', url: 'https://www.garfieldcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/', city: 'Glenwood Springs', state: 'CO', zipCode: '81601', county: '' },
  { name: 'Golden Library', url: 'https://www.goldenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.goldenlibrary.org/events', city: 'Golden', state: 'CO', zipCode: '', county: '' },
  { name: 'Granby Branch Library', url: 'https://granbylibrary.org/', platform: 'wordpress', eventsUrl: 'https://granbylibrary.org/', city: 'Granby', state: 'CO', zipCode: '', county: '' },
  { name: 'Highlands Ranch Library', url: 'https://www.highlandsranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.highlandsranchlibrary.org/events', city: 'Highlands Ranch', state: 'CO', zipCode: '', county: '' },
  { name: 'Holly Public Library', url: 'https://www.hollylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hollylibrary.org/events', city: 'Holly', state: 'CO', zipCode: '81047', county: '' },
  { name: 'Hotchkiss Public Library', url: 'https://www.hotchkisslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hotchkisslibrary.org/events', city: 'Hotchkiss', state: 'CO', zipCode: '', county: '' },
  { name: 'Hudson Public Library', url: 'https://www.hudsonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'CO', zipCode: '', county: '' },
  { name: 'Lamar Public Library', url: 'https://www.lamarlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lamarlibrary.org/events', city: 'Lamar', state: 'CO', zipCode: '81052', county: '' },
  { name: 'Lake County Public Library', url: 'https://www.lakecountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.lakecountylibrary.org/calendar', city: 'Leadville', state: 'CO', zipCode: '80461', county: '' },
  { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'CO', zipCode: '80027', county: '' },
  { name: 'Louviers Library', url: 'https://www.louvierslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.louvierslibrary.org/events', city: 'Louviers', state: 'CO', zipCode: '', county: '' },
  { name: 'Loveland Public Library', url: 'https://www.lovelandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lovelandlibrary.org/events', city: 'Loveland', state: 'CO', zipCode: '80537', county: '' },
  { name: 'Mancos Public Library', url: 'https://www.mancoslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mancoslibrary.org/events', city: 'Mancos', state: 'CO', zipCode: '81328', county: '' },
  { name: 'Garfield County Library - New Castle', url: 'https://www.garfieldcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/', city: 'New Castle', state: 'CO', zipCode: '81647', county: '' },
  { name: 'Garfield County Library - Parachute', url: 'https://www.garfieldcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/', city: 'Parachute', state: 'CO', zipCode: '81635', county: '' },
  { name: 'Parker Library', url: 'https://www.parkerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.parkerlibrary.org/events', city: 'Parker', state: 'CO', zipCode: '80138', county: '' },
  { name: 'Salida Regional Library', url: 'https://www.salidalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.salidalibrary.org/events', city: 'Salida', state: 'CO', zipCode: '81201', county: '' },
  { name: 'Garfield County Library - Silt', url: 'https://www.garfieldcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/', city: 'Silt', state: 'CO', zipCode: '81652', county: '' },
  { name: 'Sterling Public Library', url: 'https://sterlinglibrary.org/', platform: 'wordpress', eventsUrl: 'https://sterlinglibrary.org/calendar/', city: 'Sterling', state: 'CO', zipCode: '80751', county: '' },
  { name: 'Westminster Public Library', url: 'https://www.westminsterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'CO', zipCode: '80031', county: '' },
  { name: 'Yuma Public Library', url: 'https://yumalibrary.org/', platform: 'wordpress', eventsUrl: 'https://yumalibrary.org/', city: 'Yuma', state: 'CO', zipCode: '80759', county: '' }
];

const SCRAPER_NAME = 'generic-CO';

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
            state: 'CO',
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

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'CO',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - CO (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressCOCloudFunction() {
  console.log('☁️ Running WordPress CO as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-CO', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-CO', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressCOCloudFunction };
