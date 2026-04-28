const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Arkansas Public Libraries Scraper
 * State: AR
 * Coverage: All Arkansas Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Central Arkansas Library System', url: 'https://www.cals.org', eventsUrl: 'https://www.cals.org/events', city: 'Little Rock', state: 'AR', zipCode: '72201', county: 'Little Rock County'},
  { name: 'Fort Smith Public Library', url: 'https://www.fortsmithlibrary.org', eventsUrl: 'https://www.fortsmithlibrary.org/events', city: 'Fort Smith', state: 'AR', zipCode: '72901', county: 'Fort Smith County'},
  // Regional Libraries
  { name: 'Fayetteville Public Library', url: 'https://www.faylib.org', eventsUrl: 'https://www.faylib.org/events', city: 'Fayetteville', state: 'AR', zipCode: '72701', county: 'Fayetteville County'},
  { name: 'Springdale Public Library', url: 'https://www.springdalelibrary.org', eventsUrl: 'https://www.springdalelibrary.org/events', city: 'Springdale', state: 'AR', zipCode: '72764', county: 'Springdale County'},
  { name: 'Rogers Public Library', url: 'https://www.rogerspubliclibrary.org', eventsUrl: 'https://www.rogerspubliclibrary.org/events', city: 'Rogers', state: 'AR', zipCode: '72756', county: 'Rogers County'},
  { name: 'Bentonville Public Library', url: 'https://www.bentonvillelibrary.org', eventsUrl: 'https://www.bentonvillelibrary.org/events', city: 'Bentonville', state: 'AR', zipCode: '72712', county: 'Bentonville County'},
  { name: 'Pine Bluff-Jefferson County Library System', url: 'https://www.pineblufflibrary.org', eventsUrl: 'https://www.pineblufflibrary.org/events', city: 'Pine Bluff', state: 'AR', zipCode: '71601', county: 'Pine Bluff County'},
  { name: 'Jonesboro Public Library', url: 'https://www.libraryinjonesboro.org', eventsUrl: 'https://www.libraryinjonesboro.org/events', city: 'Jonesboro', state: 'AR', zipCode: '72401', county: 'Jonesboro County'},
  { name: 'North Little Rock Public Library System', url: 'https://www.nlrlibrary.com', eventsUrl: 'https://www.nlrlibrary.com/events', city: 'North Little Rock', state: 'AR', zipCode: '72114', county: 'North Little Rock County'},
  { name: 'Conway County Library', url: 'https://www.conwaycountylibrary.org', eventsUrl: 'https://www.conwaycountylibrary.org/events', city: 'Conway', state: 'AR', zipCode: '72032' },
  { name: 'Texarkana Public Library', url: 'https://www.txkusa.org/library', eventsUrl: 'https://www.txkusa.org/library/events', city: 'Texarkana', state: 'AR', zipCode: '71854', county: 'Texarkana County'},
  { name: 'Garland County Library', url: 'https://www.gclibrary.com', eventsUrl: 'https://www.gclibrary.com/events', city: 'Hot Springs', state: 'AR', zipCode: '71901', county: 'Hot Springs County'},
  { name: 'Saline County Library', url: 'https://www.salinecountylibrary.org', eventsUrl: 'https://www.salinecountylibrary.org/events', city: 'Benton', state: 'AR', zipCode: '72015' },
  { name: 'Bella Vista Public Library', url: 'https://www.bvpl.org', eventsUrl: 'https://www.bvpl.org/events', city: 'Bella Vista', state: 'AR', zipCode: '72715', county: 'Bella Vista County'},
  { name: 'Russellville Public Library', url: 'https://www.russellvillelibrary.org', eventsUrl: 'https://www.russellvillelibrary.org/events', city: 'Russellville', state: 'AR', zipCode: '72801', county: 'Russellville County'},
  { name: 'Jacksonville Public Library', url: 'https://www.jacksonvillelibrary.org', eventsUrl: 'https://www.jacksonvillelibrary.org/events', city: 'Jacksonville', state: 'AR', zipCode: '72076', county: 'Duval'},
  { name: 'Cabot Public Library', url: 'https://www.cabotlibrary.org', eventsUrl: 'https://www.cabotlibrary.org/events', city: 'Cabot', state: 'AR', zipCode: '72023', county: 'Cabot County'},
  { name: 'Searcy Public Library', url: 'https://www.searcylibrary.org', eventsUrl: 'https://www.searcylibrary.org/events', city: 'Searcy', state: 'AR', zipCode: '72143', county: 'Searcy County'},
  { name: 'Van Buren Public Library', url: 'https://www.vanburen.org/library', eventsUrl: 'https://www.vanburen.org/library/events', city: 'Van Buren', state: 'AR', zipCode: '72956', county: 'Van Buren County'},
  { name: 'Bryant Public Library', url: 'https://www.bryantlibrary.org', eventsUrl: 'https://www.bryantlibrary.org/events', city: 'Bryant', state: 'AR', zipCode: '72022', county: 'Bryant County'},
  { name: 'Paragould Public Library', url: 'https://www.paragouldlibrary.org', eventsUrl: 'https://www.paragouldlibrary.org/events', city: 'Paragould', state: 'AR', zipCode: '72450', county: 'Paragould County'},
  { name: 'El Dorado Public Library', url: 'https://www.eldoradolibrary.org', eventsUrl: 'https://www.eldoradolibrary.org/events', city: 'El Dorado', state: 'AR', zipCode: '71730', county: 'El Dorado County'},
  { name: 'Blytheville Public Library', url: 'https://www.blythevillelibrary.org', eventsUrl: 'https://www.blythevillelibrary.org/events', city: 'Blytheville', state: 'AR', zipCode: '72315', county: 'Blytheville County'},
  { name: 'Mountain Home Public Library', url: 'https://www.mtnhomelibrary.com', eventsUrl: 'https://www.mtnhomelibrary.com/events', city: 'Mountain Home', state: 'AR', zipCode: '72653', county: 'Mountain Home County'},
  { name: 'Siloam Springs Public Library', url: 'https://www.siloamsprings.com/library', eventsUrl: 'https://www.siloamsprings.com/library/events', city: 'Siloam Springs', state: 'AR', zipCode: '72761', county: 'Siloam Springs County'},
  { name: 'Harrison Public Library', url: 'https://www.harrisonlibrary.org', eventsUrl: 'https://www.harrisonlibrary.org/events', city: 'Harrison', state: 'AR', zipCode: '72601', county: 'Harrison County'},
  { name: 'Hope Public Library', url: 'https://www.hopelibrary.org', eventsUrl: 'https://www.hopelibrary.org/events', city: 'Hope', state: 'AR', zipCode: '71801', county: 'Hope County'},
  { name: 'West Memphis Public Library', url: 'https://www.wmlib.org', eventsUrl: 'https://www.wmlib.org/events', city: 'West Memphis', state: 'AR', zipCode: '72301', county: 'West Memphis County'},
  { name: 'Forrest City Public Library', url: 'https://www.forrestcitylibrary.org', eventsUrl: 'https://www.forrestcitylibrary.org/events', city: 'Forrest City', state: 'AR', zipCode: '72335', county: 'Forrest City County'},
  { name: 'Magnolia Public Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'AR', zipCode: '71753', county: 'Magnolia County'}
];

const SCRAPER_NAME = 'wordpress-AR';

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
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = ['[class*="event"]', '[class*="program"]', 'article', '.post'];
        const foundElements = new Set();

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);
            try {
              const title = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], a');
              const date = card.querySelector('[class*="date"], time');
              const desc = card.querySelector('[class*="description"], p');
              const link = card.querySelector('a[href]');
              const ageEl = [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (title && title.textContent.trim()) {
                events.push({
                  title: title.textContent.trim(),
                  date: date ? date.textContent.trim() : '',
                  description: desc ? desc.textContent.trim() : '',
                  url: link ? link.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                });
              }
            } catch (e) {}
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return evt.date || evt.description;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);
      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            state: 'AR',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'AR',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressARCloudFunction() {
  console.log('☁️ Running WordPress AR as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-AR', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-AR', {
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

if (require.main === module) main();
module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressARCloudFunction };
