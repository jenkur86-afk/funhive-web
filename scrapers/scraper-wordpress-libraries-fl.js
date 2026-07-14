const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: FL
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Miami-Dade Public Library System",
    "url": "https://www.mdpls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mdpls.org/events"
  },
  {
    "name": "Orange County Library System",
    "url": "https://www.ocls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ocls.org/events"
  },
  {
    "name": "Tampa-Hillsborough County Public Library",
    "url": "https://www.hcplc.org",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org"
  },
  {
    "name": "Broward County Library",
    "url": "https://www.broward.org/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.broward.org/library/events"
  },
  {
    "name": "Palm Beach County Library System",
    "url": "https://www.pbclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.pbclibrary.org/events"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Miami-Dade Public Library System",
    "url": "https://www.mdpls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mdpls.org/events", county: 'Baltimore City'},
  {
    "name": "Orange County Library System",
    "url": "https://www.ocls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ocls.org/events", county: 'Baltimore City'},
  {
    "name": "Tampa-Hillsborough County Public Library",
    "url": "https://www.hcplc.org",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org", county: 'Baltimore City'},
  {
    "name": "Broward County Library",
    "url": "https://www.broward.org/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.broward.org/library/events", county: 'Baltimore City'},
  {
    "name": "Palm Beach County Library System",
    "url": "https://www.pbclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.pbclibrary.org/events", county: 'Baltimore City'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Alachua Branch Library', url: 'https://www.alachualibrary.org', eventsUrl: 'https://www.alachualibrary.org/events', city: 'Alachua', state: 'FL', zipCode: '00000', county: 'Alachua County'},
  { name: 'Desoto County Library', url: 'https://www.arcadialibrary.org', eventsUrl: 'https://www.arcadialibrary.org/events', city: 'Arcadia', state: 'FL', zipCode: '00000', county: 'Arcadia County'},
  { name: 'Archer Branch Library', url: 'https://www.archerlibrary.org/', eventsUrl: 'https://www.archerlibrary.org/', city: 'Archer', state: 'FL', zipCode: '00000', county: 'Archer County'},
  { name: 'Auburndale Public Library', url: 'https://auburndalelibrary.org/', eventsUrl: 'https://auburndalelibrary.org/calendar/', city: 'Auburndale', state: 'FL', zipCode: '00000', county: 'Auburndale County'},
  { name: 'Bartow Public Library', url: 'https://www.bartowlibrary.org', eventsUrl: 'https://www.bartowlibrary.org/events', city: 'Bartow', state: 'FL', zipCode: '00000', county: 'Bartow County'},
  { name: 'Brandon Branch', url: 'https://www.brandonlibrary.org/', eventsUrl: 'https://www.brandonlibrary.org/events-calendar', city: 'Brandon', state: 'FL', zipCode: '00000', county: 'Brandon County'},
  { name: 'Levy County Public Library System', url: 'https://www.bronsonlibrary.org/', eventsUrl: 'https://www.bronsonlibrary.org/calendar', city: 'Bronson', state: 'FL', zipCode: '32621', county: 'Bronson County'},
  { name: 'East Hernando Branch Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'FL', zipCode: '00000', county: 'Brooksville County'},
  { name: 'Celebration Library', url: 'https://www.celebrationlibrary.org', eventsUrl: 'https://www.celebrationlibrary.org/events', city: 'Celebration', state: 'FL', zipCode: '00000', county: 'Celebration County'},
  { name: 'Cooper Memorial Library', url: 'https://www.clermontlibrary.org/', eventsUrl: 'https://www.clermontlibrary.org/', city: 'Clermont', state: 'FL', zipCode: '00000', county: 'Clermont County'},
  { name: 'Coleman Library', url: 'https://www.colemanlibrary.org/', eventsUrl: 'https://www.colemanlibrary.org/calendar', city: 'Coleman', state: 'FL', zipCode: '00000', county: 'Coleman County'},
  { name: 'Edgewater Public Library', url: 'https://www.edgewaterlibrary.org', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'FL', zipCode: '00000', county: 'Edgewater County'},
  { name: 'Elsie Quirk Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'FL', zipCode: '00000', county: 'Englewood County'},
  { name: 'Eustis Memorial Library', url: 'https://eustislibrary.org/', eventsUrl: 'https://eustislibrary.org/', city: 'Eustis', state: 'FL', zipCode: '32726', county: 'Eustis County'},
  { name: 'Freeport Branch Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'FL', zipCode: '00000', county: 'Freeport County'},
  { name: 'Fruitland Park Library', url: 'https://www.fruitlandparklibrary.org', eventsUrl: 'https://www.fruitlandparklibrary.org/events', city: 'Fruitland Park', state: 'FL', zipCode: '00000', county: 'Fruitland Park County'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'FL', zipCode: '00000', county: 'Greenville County'},
  { name: 'Hastings Branch Library', url: 'https://hastingslibrary.org/', eventsUrl: 'https://hastingslibrary.org/calendar/', city: 'Hastings', state: 'FL', zipCode: '00000', county: 'Hastings County'},
  { name: 'Havana Public Library', url: 'https://www.havanalibrary.org/', eventsUrl: 'https://www.havanalibrary.org/calendar', city: 'Havana', state: 'FL', zipCode: '00000', county: 'Havana County'},
  { name: 'Hawthorne Branch Library', url: 'https://www.hawthornelibrary.org', eventsUrl: 'https://www.hawthornelibrary.org/events', city: 'Hawthorne', state: 'FL', zipCode: '00000', county: 'Hawthorne County'},
  { name: 'Homestead Branch Library', url: 'https://www.homesteadlibrary.org', eventsUrl: 'https://www.homesteadlibrary.org/events', city: 'Homestead', state: 'FL', zipCode: '00000', county: 'Homestead County'},
  { name: 'Hudson Regional Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'FL', zipCode: '00000', county: 'Hudson County'},
  { name: 'Lake Placid Memorial Library', url: 'https://www.lakeplacidlibrary.org', eventsUrl: 'https://www.lakeplacidlibrary.org/events', city: 'Lake Placid', state: 'FL', zipCode: '00000', county: 'Lake Placid County'},
  { name: 'Lakeland Public Library', url: 'https://www.lakelandlibrary.org', eventsUrl: 'https://www.lakelandlibrary.org/events', city: 'Lakeland', state: 'FL', zipCode: '00000', county: 'Lakeland County'},
  { name: 'Land Olakes Branch Library', url: 'https://www.landolakeslibrary.org', eventsUrl: 'https://www.landolakeslibrary.org/events', city: 'Land Olakes', state: 'FL', zipCode: '00000', county: 'Land Olakes County'},
  { name: 'Lantana Public Library', url: 'https://www.lantanalibrary.org/', eventsUrl: 'https://www.lantanalibrary.org/', city: 'Lantana', state: 'FL', zipCode: '33462', county: 'Lantana County'},
  { name: 'Largo Public Library', url: 'https://www.largolibrary.org', eventsUrl: 'https://www.largolibrary.org/events', city: 'Largo', state: 'FL', zipCode: '00000', county: 'Largo County'},
  { name: 'West Branch Library', url: 'https://www.longwoodlibrary.org', eventsUrl: 'https://www.longwoodlibrary.org/events', city: 'Longwood', state: 'FL', zipCode: '00000', county: 'Longwood County'},
  { name: 'Madison County Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'FL', zipCode: '00000', county: 'Madison County'},
  { name: 'Margate Catharine Young Branch', url: 'https://www.margatelibrary.org', eventsUrl: 'https://www.margatelibrary.org/events', city: 'Margate', state: 'FL', zipCode: '00000', county: 'Margate County'},
  { name: 'Milton Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'FL', zipCode: '00000', county: 'Milton County'},
  { name: 'Jefferson County R. J. Bailar Public Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'FL', zipCode: '00000', county: 'Monticello County'},
  { name: 'Collier County Public Library', url: 'https://www.napleslibrary.org', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'FL', zipCode: '34109', county: 'Naples County'},
  { name: 'Newberry Branch Library', url: 'https://www.newberrylibrary.org', eventsUrl: 'https://www.newberrylibrary.org/events', city: 'Newberry', state: 'FL', zipCode: '00000', county: 'Newberry County'},
  { name: 'Oldsmar Public Library', url: 'https://myoldsmar.com/', eventsUrl: 'https://myoldsmar.com/1379/Oldsmar-Public-Library', city: 'Oldsmar', state: 'FL', zipCode: '00000', county: 'Oldsmar County'},
  { name: 'Orange City Dickinson Memorial Library', url: 'https://www.orangecitylibrary.org', eventsUrl: 'https://www.orangecitylibrary.org/events', city: 'Orange City', state: 'FL', zipCode: '00000', county: 'Orange City County'},
  { name: 'East Lake Community Library', url: 'https://www.palmharborlibrary.org', eventsUrl: 'https://www.palmharborlibrary.org/events', city: 'Palm Harbor', state: 'FL', zipCode: '00000', county: 'Palm Harbor County'},
  { name: 'Palm Springs Public Library', url: 'https://www.palmspringsca.gov/', eventsUrl: 'https://www.palmspringsca.gov/government/departments/library', city: 'Palm Springs', state: 'FL', zipCode: '33461', county: 'Palm Springs County'},
  { name: 'Parker Public Library', url: 'https://www.parkerlibrary.org', eventsUrl: 'https://www.parkerlibrary.org/events', city: 'Parker', state: 'FL', zipCode: '00000', county: 'Parker County'},
  { name: 'Parkland Library', url: 'https://www.parklandlibrary.org/', eventsUrl: 'https://www.parklandlibrary.org/calendar/', city: 'Parkland', state: 'FL', zipCode: '33067', county: 'Parkland County'},
  { name: 'Taylor County Public Library', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'FL', zipCode: '32347', county: 'Perry County'},
  { name: 'Pierson Public Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Pierson', state: 'FL', zipCode: '00000', county: 'Pierson County'},
  { name: 'Polk City Library', url: 'https://www.polkcitylibrary.org', eventsUrl: 'https://www.polkcitylibrary.org/events', city: 'Polk City', state: 'FL', zipCode: '00000', county: 'Polk City County'},
  { name: 'Gadsden County Public Library', url: 'https://www.quincylibrary.org', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'FL', zipCode: '32351', county: 'Quincy County'},
  { name: 'Reddick Public Library', url: 'https://www.reddicklibrary.org/', eventsUrl: 'https://www.reddicklibrary.org/', city: 'Reddick', state: 'FL', zipCode: '00000', county: 'Reddick County'},
  { name: 'Safety Harbor Public Library', url: 'https://www.safetyharborlibrary.org', eventsUrl: 'https://www.safetyharborlibrary.org/events', city: 'Safety Harbor', state: 'FL', zipCode: '00000', county: 'Safety Harbor County'},
  { name: 'Little Red Schoolhouse Branch', url: 'https://www.springhilllibrary.org', eventsUrl: 'https://www.springhilllibrary.org/events', city: 'Spring Hill', state: 'FL', zipCode: '00000', county: 'Spring Hill County'},
  { name: 'Springfield Branch', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'FL', zipCode: '00000', county: 'Springfield County'},
  { name: 'Blake Library', url: 'https://stuartlibrary.org/', eventsUrl: 'https://stuartlibrary.org/calendar/', city: 'Stuart', state: 'FL', zipCode: '00000', county: 'Stuart County'},
  { name: 'Sunrise Dan Pearl Branch', url: 'https://www.sunriselibrary.org', eventsUrl: 'https://www.sunriselibrary.org/events', city: 'Sunrise', state: 'FL', zipCode: '00000', county: 'Sunrise County'},
  { name: 'Lake County Library System', url: 'https://www.tavareslibrary.org', eventsUrl: 'https://www.tavareslibrary.org/events', city: 'Tavares', state: 'FL', zipCode: '32778', county: 'Tavares County'},
  { name: 'Umatilla Public Library', url: 'https://www.umatillalibrary.org/', eventsUrl: 'https://www.umatillalibrary.org/', city: 'Umatilla', state: 'FL', zipCode: '00000', county: 'Umatilla County'},
  { name: 'Jacaranda Public Library', url: 'https://www.venicelibrary.org', eventsUrl: 'https://www.venicelibrary.org/events', city: 'Venice', state: 'FL', zipCode: '00000', county: 'Venice County'},
  { name: 'Vernon Branch Library', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'FL', zipCode: '00000', county: 'Vernon County'},
  { name: 'E.C. Rowell Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'FL', zipCode: '00000', county: 'Webster County'},
  { name: 'Mandel Public Library Of West Palm Beach', url: 'https://www.westpalmbeachlibrary.org', eventsUrl: 'https://www.westpalmbeachlibrary.org/events', city: 'West Palm Beach', state: 'FL', zipCode: '33401', county: 'West Palm Beach County'},
  { name: 'Weston Reading Center', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'FL', zipCode: '00000', county: 'Weston County'},
  { name: 'Wildwood Public Library', url: 'https://www.wildwoodlibrary.org', eventsUrl: 'https://www.wildwoodlibrary.org/events', city: 'Wildwood', state: 'FL', zipCode: '00000', county: 'Wildwood County'},
  { name: 'Winter Park Public Library', url: 'https://www.winterparklibrary.org', eventsUrl: 'https://www.winterparklibrary.org/events', city: 'Winter Park', state: 'FL', zipCode: '32789', county: 'Winter Park County'},
  { name: 'Zephyrhills Library', url: 'https://www.zephyrhillslibrary.org', eventsUrl: 'https://www.zephyrhillslibrary.org/events', city: 'Zephyrhills', state: 'FL', zipCode: '00000', county: 'Zephyrhills County'}

];

const SCRAPER_NAME = 'generic-FL';

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
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'generic',
            state: 'FL',
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
    state: 'FL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - FL (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressFLCloudFunction() {
  console.log('☁️ Running WordPress FL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-FL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-FL', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressFLCloudFunction };
