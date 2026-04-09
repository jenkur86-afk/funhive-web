const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Mississippi Public Libraries Scraper
 * State: MS
 * Coverage: All Mississippi Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Jackson-Hinds Library System', url: 'https://www.jhlibrary.org', eventsUrl: 'https://www.jhlibrary.org/events', city: 'Jackson', state: 'MS', zipCode: '39201', county: 'Jackson County'},
  { name: 'Harrison County Library System', url: 'https://www.harrison.lib.ms.us', eventsUrl: 'https://www.harrison.lib.ms.us/events', city: 'Gulfport', state: 'MS', zipCode: '39501', county: 'Gulfport County'},
  // Regional Libraries
  { name: 'First Regional Library', url: 'https://www.firstregional.org', eventsUrl: 'https://www.firstregional.org/events', city: 'Hernando', state: 'MS', zipCode: '38632', county: 'Hernando County'},
  { name: 'Lee-Itawamba Library System', url: 'https://www.li.lib.ms.us', eventsUrl: 'https://www.li.lib.ms.us/events', city: 'Tupelo', state: 'MS', zipCode: '38801', county: 'Tupelo County'},
  { name: 'Hancock County Library System', url: 'https://www.hancock.lib.ms.us', eventsUrl: 'https://www.hancock.lib.ms.us/events', city: 'Bay St. Louis', state: 'MS', zipCode: '39520', county: 'Bay St. Louis County'},
  { name: 'Jackson-George Regional Library System', url: 'https://www.jgrls.org', eventsUrl: 'https://www.jgrls.org/events', city: 'Pascagoula', state: 'MS', zipCode: '39567', county: 'Pascagoula County'},
  { name: 'Pike-Amite-Walthall Library System', url: 'https://www.pawlib.org', eventsUrl: 'https://www.pawlib.org/events', city: 'McComb', state: 'MS', zipCode: '39648', county: 'McComb County'},
  { name: 'Lauderdale County Public Library', url: 'https://www.lauderdalecounty.lib.ms.us', eventsUrl: 'https://www.lauderdalecounty.lib.ms.us/events', city: 'Meridian', state: 'MS', zipCode: '39301' },
  { name: 'Columbus-Lowndes Public Library', url: 'https://www.lowndes.lib.ms.us', eventsUrl: 'https://www.lowndes.lib.ms.us/events', city: 'Columbus', state: 'MS', zipCode: '39701', county: 'Columbus County'},
  { name: 'Warren County-Vicksburg Public Library', url: 'https://www.warren.lib.ms.us', eventsUrl: 'https://www.warren.lib.ms.us/events', city: 'Vicksburg', state: 'MS', zipCode: '39180', county: 'Vicksburg County'},
  { name: 'Madison County Library System', url: 'https://www.madison.lib.ms.us', eventsUrl: 'https://www.madison.lib.ms.us/events', city: 'Canton', state: 'MS', zipCode: '39046', county: 'Canton County'},
  { name: 'Rankin County Library System', url: 'https://www.rankin.lib.ms.us', eventsUrl: 'https://www.rankin.lib.ms.us/events', city: 'Brandon', state: 'MS', zipCode: '39042', county: 'Brandon County'},
  { name: 'Natchez Adams Wilkinson Library Service', url: 'https://www.nawls.lib.ms.us', eventsUrl: 'https://www.nawls.lib.ms.us/events', city: 'Natchez', state: 'MS', zipCode: '39120', county: 'Natchez County'},
  { name: 'Laurel-Jones County Library', url: 'https://www.laurel.lib.ms.us', eventsUrl: 'https://www.laurel.lib.ms.us/events', city: 'Laurel', state: 'MS', zipCode: '39440', county: 'Laurel County'},
  { name: 'Forrest County Library System', url: 'https://www.forrest.lib.ms.us', eventsUrl: 'https://www.forrest.lib.ms.us/events', city: 'Hattiesburg', state: 'MS', zipCode: '39401', county: 'Hattiesburg County'},
  { name: 'Pine Forest Regional Library', url: 'https://www.pineforest.lib.ms.us', eventsUrl: 'https://www.pineforest.lib.ms.us/events', city: 'Richton', state: 'MS', zipCode: '39476', county: 'Richton County'},
  { name: 'Starkville-Oktibbeha County Public Library', url: 'https://www.starkville.lib.ms.us', eventsUrl: 'https://www.starkville.lib.ms.us/events', city: 'Starkville', state: 'MS', zipCode: '39759', county: 'Starkville County'},
  { name: 'Greenville Public Library', url: 'https://www.greenville.lib.ms.us', eventsUrl: 'https://www.greenville.lib.ms.us/events', city: 'Greenville', state: 'MS', zipCode: '38701', county: 'Greenville County'},
  { name: 'Bolivar County Library System', url: 'https://www.bolivar.lib.ms.us', eventsUrl: 'https://www.bolivar.lib.ms.us/events', city: 'Cleveland', state: 'MS', zipCode: '38732', county: 'Cleveland County'},
  { name: 'Claiborne County Public Library', url: 'https://www.claiborne.lib.ms.us', eventsUrl: 'https://www.claiborne.lib.ms.us/events', city: 'Port Gibson', state: 'MS', zipCode: '39150', county: 'Port Gibson County'},
  { name: 'Pearl River County Library System', url: 'https://www.pearlriver.lib.ms.us', eventsUrl: 'https://www.pearlriver.lib.ms.us/events', city: 'Picayune', state: 'MS', zipCode: '39466', county: 'Picayune County'},
  { name: 'Lincoln-Lawrence-Franklin Regional Library', url: 'https://www.llf.lib.ms.us', eventsUrl: 'https://www.llf.lib.ms.us/events', city: 'Brookhaven', state: 'MS', zipCode: '39601', county: 'Brookhaven County'},
  { name: 'Dixie Regional Library System', url: 'https://www.dixie.lib.ms.us', eventsUrl: 'https://www.dixie.lib.ms.us/events', city: 'Pontotoc', state: 'MS', zipCode: '38863', county: 'Pontotoc County'},
  { name: 'Northeast Regional Library', url: 'https://www.nereg.lib.ms.us', eventsUrl: 'https://www.nereg.lib.ms.us/events', city: 'Corinth', state: 'MS', zipCode: '38834', county: 'Corinth County'},
  { name: 'Central Mississippi Regional Library System', url: 'https://www.cmrls.lib.ms.us', eventsUrl: 'https://www.cmrls.lib.ms.us/events', city: 'Kosciusko', state: 'MS', zipCode: '39090', county: 'Kosciusko County'},
  { name: 'Tombigbee Regional Library System', url: 'https://www.tombigbee.lib.ms.us', eventsUrl: 'https://www.tombigbee.lib.ms.us/events', city: 'West Point', state: 'MS', zipCode: '39773', county: 'West Point County'},
  { name: 'Mid-Mississippi Regional Library System', url: 'https://www.midmiss.lib.ms.us', eventsUrl: 'https://www.midmiss.lib.ms.us/events', city: 'Carthage', state: 'MS', zipCode: '39051', county: 'Carthage County'}
];

const SCRAPER_NAME = 'wordpress-MS';

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
            state: 'MS',
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

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'MS',
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
async function scrapeWordpressMSCloudFunction() {
  console.log('☁️ Running WordPress MS as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MS', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-MS', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressMSCloudFunction };
