const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: WA
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Seattle Public Library",
    "url": "https://www.spl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.spl.org/programs-and-services"
  },
  {
    "name": "Spokane Public Library",
    "url": "https://www.spokanelibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.spokanelibrary.org/events"
  }
]
 */

const LIBRARIES = [
  { name: 'Seattle Public Library', url: 'https://www.spl.org', platform: 'wordpress', eventsUrl: 'https://www.spl.org/programs-and-services', city: '', state: 'WA', zipCode: '', county: '' },
  { name: 'Albion Branch Library', url: 'https://www.albionlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.albionlibrary.org/', city: 'Albion', state: 'WA', zipCode: '99102', county: '' },
  { name: 'Arlington Library', url: 'https://www.arlingtonlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'WA', zipCode: '98223', county: '' },
  { name: 'Auburn Public Library', url: 'https://auburnlibrary.org/', platform: 'wordpress', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'WA', zipCode: '98002', county: '' },
  { name: 'Bainbridge Island Library', url: 'https://www.bainbridgeislandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bainbridgeislandlibrary.org/events', city: 'Bainbridge Island', state: 'WA', zipCode: '98110', county: '' },
  { name: 'Bellevue Library', url: 'https://www.bellevue.net/', platform: 'wordpress', eventsUrl: 'https://www.bellevue.net/176/Library', city: 'Bellevue', state: 'WA', zipCode: '98004', county: '' },
  { name: 'Lake Hills Library', url: 'https://www.lakehillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakehillslibrary.org/events', city: 'Bellevue', state: 'WA', zipCode: '98007', county: '' },
  { name: 'Brewster Community Library', url: 'https://brewsterlibrary.libcal.com/', platform: 'wordpress', eventsUrl: 'https://brewsterlibrary.libcal.com/', city: 'Brewster', state: 'WA', zipCode: '98812', county: '' },
  { name: 'Bridgeport Community Library', url: 'https://www.bridgeportlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'WA', zipCode: '98813', county: '' },
  { name: 'Burbank Heights Library', url: 'https://www.burbanklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burbanklibrary.org/events', city: 'Burbank', state: 'WA', zipCode: '99323', county: '' },
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'WA', zipCode: '98233', county: '' },
  { name: 'Camas Public Library', url: 'https://www.cityofcamas.us/', platform: 'wordpress', eventsUrl: 'https://www.cityofcamas.us/library', city: 'Camas', state: 'WA', zipCode: '98607', county: '' },
  { name: 'Centralia Timberland Library', url: 'https://www.centralialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centralialibrary.org/events', city: 'Centralia', state: 'WA', zipCode: '98531', county: '' },
  { name: 'Cheney Library', url: 'https://www.cheneylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cheneylibrary.org/events', city: 'Cheney', state: 'WA', zipCode: '99004', county: '' },
  { name: 'Asotin County Library', url: 'https://www.asotincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.asotincountylibrary.org/events', city: 'Clarkston', state: 'WA', zipCode: '99403', county: '' },
  { name: 'Clinton Library', url: 'https://www.clintonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'WA', zipCode: '98236', county: '' },
  { name: 'Davenport Public Library', url: 'https://www.davenportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.davenportlibrary.org/events', city: 'Davenport', state: 'WA', zipCode: '99122', county: '' },
  { name: 'Deer Park Library', url: 'https://www.deerparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'WA', zipCode: '99006', county: '' },
  { name: 'Des Moines Library', url: 'https://www.desmoineslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.desmoineslibrary.org/events', city: 'Des Moines', state: 'WA', zipCode: '98198', county: '' },
  { name: 'Ellensburg Public Library', url: 'https://www.ellensburglibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.ellensburglibrary.org/', city: 'Ellensburg', state: 'WA', zipCode: '98926', county: '' },
  { name: 'Everett Public Library', url: 'https://www.everettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.everettlibrary.org/events', city: 'Everett', state: 'WA', zipCode: '98201', county: '' },
  { name: 'Fairfield Library', url: 'https://fairfieldlibrary.org/', platform: 'wordpress', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'WA', zipCode: '99012', county: '' },
  { name: 'Farmington Branch Library', url: 'https://www.farmingtonpublic.org/', platform: 'wordpress', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'WA', zipCode: '99128', county: '' },
  { name: 'Peninsula Library', url: 'https://peninsulalibrary.org/', platform: 'wordpress', eventsUrl: 'https://peninsulalibrary.org/calendar/', city: 'Gig Harbor', state: 'WA', zipCode: '98335', county: '' },
  { name: 'Graham Library', url: 'https://www.grahamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grahamlibrary.org/events', city: 'Graham', state: 'WA', zipCode: '98338', county: '' },
  { name: 'Grandview Library', url: 'https://www.grandviewlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.grandviewlibrary.org/', city: 'Grandview', state: 'WA', zipCode: '98930', county: '' },
  { name: 'Granger Library', url: 'https://www.grangerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grangerlibrary.org/events', city: 'Granger', state: 'WA', zipCode: '98932', county: '' },
  { name: 'Kent Library', url: 'https://kentpl.librarycalendar.com/', platform: 'wordpress', eventsUrl: 'https://kentpl.librarycalendar.com/events/month', city: 'Kent', state: 'WA', zipCode: '98032', county: '' },
  { name: 'Kingston Library', url: 'https://www.kingstonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'WA', zipCode: '98346', county: '' },
  { name: 'La Conner Regional Library', url: 'https://www.laconnerlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.laconnerlibrary.org/', city: 'La Conner', state: 'WA', zipCode: '98257', county: '' },
  { name: 'Lacrosse Branch Library', url: 'https://www.lacrosselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lacrosselibrary.org/events', city: 'Lacrosse', state: 'WA', zipCode: '99143', county: '' },
  { name: 'Lakewood Library', url: 'https://lakewoodlibrary.org/', platform: 'wordpress', eventsUrl: 'https://lakewoodlibrary.org/events/event/', city: 'Lakewood', state: 'WA', zipCode: '98499', county: '' },
  { name: 'Langley Library', url: 'https://www.langleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.langleylibrary.org/events', city: 'Langley', state: 'WA', zipCode: '98260', county: '' },
  { name: 'Longview Public Library', url: 'https://www.longviewlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.longviewlibrary.org/786/Events', city: 'Longview', state: 'WA', zipCode: '98632', county: '' },
  { name: 'Lopez Island Library District', url: 'https://lopezlibrary.org/', platform: 'wordpress', eventsUrl: 'https://lopezlibrary.org/', city: 'Lopez Island', state: 'WA', zipCode: '98261', county: '' },
  { name: 'Manchester Library', url: 'https://www.manchesterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'WA', zipCode: '98353', county: '' },
  { name: 'Milton Library', url: 'https://www.miltonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'WA', zipCode: '98354', county: '' },
  { name: 'Monroe Library', url: 'https://www.monroelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'WA', zipCode: '98272', county: '' },
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'WA', zipCode: '99156', county: '' },
  { name: 'North Bend Library', url: 'https://www.northbendlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northbendlibrary.org/events', city: 'North Bend', state: 'WA', zipCode: '98045', county: '' },
  { name: 'Pasco Library', url: 'https://www.pascolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pascolibrary.org/events', city: 'Pasco', state: 'WA', zipCode: '99301', county: '' },
  { name: 'Peshastin Community Library', url: 'https://www.peshastinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.peshastinlibrary.org/events', city: 'Peshastin', state: 'WA', zipCode: '98847', county: '' },
  { name: 'Jefferson County Rural Library District', url: 'https://www.jeffersoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffersoncountylibrary.org/events', city: 'Port Hadlock', state: 'WA', zipCode: '98339', county: '' },
  { name: 'Pullman (Neill) Public Library', url: 'https://www.pullmanlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.pullmanlibrary.org/', city: 'Pullman', state: 'WA', zipCode: '99163', county: '' },
  { name: 'Puyallup Public Library', url: 'https://www.puyalluplibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.puyalluplibrary.org/2436/Library', city: 'Puyallup', state: 'WA', zipCode: '98371', county: '' },
  { name: 'Quincy Community Library', url: 'https://www.quincylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'WA', zipCode: '98848', county: '' },
  { name: 'Reardan Memorial Library', url: 'https://www.reardanlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.reardanlibrary.org/', city: 'Reardan', state: 'WA', zipCode: '99029', county: '' },
  { name: 'Richland Public Library', url: 'https://www.richlandlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'WA', zipCode: '99352', county: '' },
  { name: 'Ridgefield Community Library', url: 'https://ridgefieldlibrary.org/', platform: 'wordpress', eventsUrl: 'https://ridgefieldlibrary.org/', city: 'Ridgefield', state: 'WA', zipCode: '98642', county: '' },
  { name: 'Ritzville Public Library', url: 'https://www.ritzvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ritzvillelibrary.org/events', city: 'Ritzville', state: 'WA', zipCode: '99169', county: '' },
  { name: 'Roslyn Public Library', url: 'https://www.roslynlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roslynlibrary.org/events', city: 'Roslyn', state: 'WA', zipCode: '98941', county: '' },
  { name: 'North Spokane Library', url: 'https://www.spokanelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.spokanelibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99218', county: '' },
  { name: 'Spokane Public Library', url: 'https://www.spokanelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.spokanelibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99201', county: '' },
  { name: 'St. John Branch Library', url: 'https://www.stjohnlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stjohnlibrary.org/events', city: 'St. John', state: 'WA', zipCode: '99171', county: '' },
  { name: 'Stevenson Community Library', url: 'https://www.stevensonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stevensonlibrary.org/events', city: 'Stevenson', state: 'WA', zipCode: '98648', county: '' },
  { name: 'Waterville Community Library', url: 'https://www.watervillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'WA', zipCode: '98858', county: '' },
  { name: 'Westport Timberland Library', url: 'https://www.westportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'WA', zipCode: '98595', county: '' },
  { name: 'Winthrop Community Library', url: 'https://www.winthroplibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.winthroplibrary.org/', city: 'Winthrop', state: 'WA', zipCode: '98862', county: '' },
  { name: 'Yakima Valley Regional Library', url: 'https://www.yakimalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yakimalibrary.org/events', city: 'Yakima', state: 'WA', zipCode: '98901', county: '' },
];

const SCRAPER_NAME = 'generic-WA';

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
            state: 'WA',
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
    state: 'WA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - WA (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressWACloudFunction() {
  console.log('☁️ Running WordPress WA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-WA', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressWACloudFunction };
