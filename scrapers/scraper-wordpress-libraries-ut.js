const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Utah Public Libraries Scraper
 * State: UT
 * Coverage: All Utah Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Salt Lake City Public Library', url: 'https://www.slcpl.org', eventsUrl: 'https://www.slcpl.org/events', city: 'Salt Lake City', state: 'UT', zipCode: '84111', county: 'Salt Lake City County'},
  { name: 'Salt Lake County Library Services', url: 'https://www.slcolibrary.org', eventsUrl: 'https://www.slcolibrary.org/events', city: 'Salt Lake City', state: 'UT', zipCode: '84107', county: 'Salt Lake City County'},
  { name: 'Provo City Library', url: 'https://www.provolibrary.com', eventsUrl: 'https://www.provolibrary.com/events', city: 'Provo', state: 'UT', zipCode: '84601', county: 'Provo County'},
  // Regional Libraries
  { name: 'Davis County Library', url: 'https://www.daviscountyutah.gov/library', eventsUrl: 'https://www.daviscountyutah.gov/library/events', city: 'Farmington', state: 'UT', zipCode: '84025' },
  { name: 'Weber County Library System', url: 'https://www.weberpl.org', eventsUrl: 'https://www.weberpl.org/events', city: 'Ogden', state: 'UT', zipCode: '84401', county: 'Ogden County'},
  { name: 'Utah County Library', url: 'https://www.utahcounty.gov/library', eventsUrl: 'https://www.utahcounty.gov/library/events', city: 'Spanish Fork', state: 'UT', zipCode: '84660' },
  { name: 'Cache County Library', url: 'https://www.cachelibrary.org', eventsUrl: 'https://www.cachelibrary.org/events', city: 'Logan', state: 'UT', zipCode: '84321', county: 'Logan County'},
  { name: 'Washington County Library System', url: 'https://www.wcls.lib.ut.us', eventsUrl: 'https://www.wcls.lib.ut.us/events', city: 'St. George', state: 'UT', zipCode: '84770', county: 'St. George County'},
  { name: 'Orem Public Library', url: 'https://www.orem.org/library', eventsUrl: 'https://www.orem.org/library/events', city: 'Orem', state: 'UT', zipCode: '84057', county: 'Orem County'},
  { name: 'Sandy City Library', url: 'https://www.sandy.utah.gov/library', eventsUrl: 'https://www.sandy.utah.gov/library/events', city: 'Sandy', state: 'UT', zipCode: '84070', county: 'Sandy County'},
  { name: 'West Jordan Library', url: 'https://www.westjordan.utah.gov/library', eventsUrl: 'https://www.westjordan.utah.gov/library/events', city: 'West Jordan', state: 'UT', zipCode: '84088', county: 'West Jordan County'},
  { name: 'Layton City Library', url: 'https://www.laytoncity.org/library', eventsUrl: 'https://www.laytoncity.org/library/events', city: 'Layton', state: 'UT', zipCode: '84041', county: 'Layton County'},
  { name: 'South Jordan Library', url: 'https://www.sjc.utah.gov/library', eventsUrl: 'https://www.sjc.utah.gov/library/events', city: 'South Jordan', state: 'UT', zipCode: '84095', county: 'South Jordan County'},
  { name: 'Lehi City Library', url: 'https://www.lehi-ut.gov/library', eventsUrl: 'https://www.lehi-ut.gov/library/events', city: 'Lehi', state: 'UT', zipCode: '84043', county: 'Lehi County'},
  { name: 'Murray City Library', url: 'https://www.murray.utah.gov/library', eventsUrl: 'https://www.murray.utah.gov/library/events', city: 'Murray', state: 'UT', zipCode: '84107', county: 'Murray County'},
  { name: 'Bountiful City Library', url: 'https://www.bountifulutah.gov/library', eventsUrl: 'https://www.bountifulutah.gov/library/events', city: 'Bountiful', state: 'UT', zipCode: '84010', county: 'Bountiful County'},
  { name: 'Tooele City Library', url: 'https://www.tooelecity.org/library', eventsUrl: 'https://www.tooelecity.org/library/events', city: 'Tooele', state: 'UT', zipCode: '84074', county: 'Tooele County'},
  { name: 'Roy City Library', url: 'https://www.royutah.org/library', eventsUrl: 'https://www.royutah.org/library/events', city: 'Roy', state: 'UT', zipCode: '84067', county: 'Roy County'},
  { name: 'Clearfield City Library', url: 'https://www.clearfieldcity.org/library', eventsUrl: 'https://www.clearfieldcity.org/library/events', city: 'Clearfield', state: 'UT', zipCode: '84015', county: 'Clearfield County'},
  { name: 'American Fork City Library', url: 'https://www.americanfork.gov/library', eventsUrl: 'https://www.americanfork.gov/library/events', city: 'American Fork', state: 'UT', zipCode: '84003', county: 'American Fork County'},
  { name: 'Pleasant Grove City Library', url: 'https://www.pgcity.org/library', eventsUrl: 'https://www.pgcity.org/library/events', city: 'Pleasant Grove', state: 'UT', zipCode: '84062', county: 'Pleasant Grove County'},
  { name: 'Springville Public Library', url: 'https://www.springville.org/library', eventsUrl: 'https://www.springville.org/library/events', city: 'Springville', state: 'UT', zipCode: '84663', county: 'Springville County'},
  { name: 'Kaysville City Library', url: 'https://www.kaysvillecity.com/library', eventsUrl: 'https://www.kaysvillecity.com/library/events', city: 'Kaysville', state: 'UT', zipCode: '84037', county: 'Kaysville County'},
  { name: 'Cedar City Public Library', url: 'https://www.cedarcitylibrary.org', eventsUrl: 'https://www.cedarcitylibrary.org/events', city: 'Cedar City', state: 'UT', zipCode: '84720', county: 'Cedar City County'},
  { name: 'Saratoga Springs Public Library', url: 'https://www.saratogaspringscity.com/library', eventsUrl: 'https://www.saratogaspringscity.com/library/events', city: 'Saratoga Springs', state: 'UT', zipCode: '84045', county: 'Saratoga Springs County'},
  { name: 'Eagle Mountain City Library', url: 'https://www.eaglemountaincity.com/library', eventsUrl: 'https://www.eaglemountaincity.com/library/events', city: 'Eagle Mountain', state: 'UT', zipCode: '84005', county: 'Eagle Mountain County'},
  { name: 'Herriman City Library', url: 'https://www.herriman.org/library', eventsUrl: 'https://www.herriman.org/library/events', city: 'Herriman', state: 'UT', zipCode: '84096', county: 'Herriman County'},
  { name: 'North Ogden Library', url: 'https://www.northogdencity.com/library', eventsUrl: 'https://www.northogdencity.com/library/events', city: 'North Ogden', state: 'UT', zipCode: '84414', county: 'North Ogden County'},
  { name: 'Uintah County Library', url: 'https://www.uintahcounty.lib.ut.us', eventsUrl: 'https://www.uintahcounty.lib.ut.us/events', city: 'Vernal', state: 'UT', zipCode: '84078' },
  { name: 'Grand County Public Library', url: 'https://www.grandcountyutah.net/library', eventsUrl: 'https://www.grandcountyutah.net/library/events', city: 'Moab', state: 'UT', zipCode: '84532' }
];

const SCRAPER_NAME = 'wordpress-UT';

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
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

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
            state: 'UT',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'UT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToFirebase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressUTCloudFunction() {
  console.log('☁️ Running WordPress UT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-UT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-UT', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressUTCloudFunction };
