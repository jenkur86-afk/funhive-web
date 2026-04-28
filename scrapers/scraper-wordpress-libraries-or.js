const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Oregon Public Libraries Scraper - Coverage: All Oregon public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Multnomah County Library', url: 'https://www.multcolib.org', eventsUrl: 'https://www.multcolib.org/events', city: 'Portland', state: 'OR', zipCode: '97204', county: 'Portland County'},
  { name: 'Eugene Public Library', url: 'https://www.eugene-or.gov/library', eventsUrl: 'https://www.eugene-or.gov/library/events', city: 'Eugene', state: 'OR', zipCode: '97401', county: 'Eugene County'},
  { name: 'Salem Public Library', url: 'https://www.cityofsalem.net/library', eventsUrl: 'https://www.cityofsalem.net/library/events', city: 'Salem', state: 'OR', zipCode: '97301', county: 'Salem County'},
  // Regional Libraries
  { name: 'Washington County Cooperative Library Services', url: 'https://www.wccls.org', eventsUrl: 'https://www.wccls.org/events', city: 'Hillsboro', state: 'OR', zipCode: '97123', county: 'Hillsboro County'},
  { name: 'Clackamas County Library', url: 'https://www.clackamas.us/lib', eventsUrl: 'https://www.clackamas.us/lib/events', city: 'Oregon City', state: 'OR', zipCode: '97045', county: 'Oregon City County'},
  { name: 'Deschutes Public Library', url: 'https://www.deschuteslibrary.org', eventsUrl: 'https://www.deschuteslibrary.org/events', city: 'Bend', state: 'OR', zipCode: '97701', county: 'Bend County'},
  { name: 'Jackson County Library Services', url: 'https://www.jcls.org', eventsUrl: 'https://www.jcls.org/events', city: 'Medford', state: 'OR', zipCode: '97501', county: 'Medford County'},
  { name: 'Lane Library District', url: 'https://www.lanelibrary.org', eventsUrl: 'https://www.lanelibrary.org/events', city: 'Cottage Grove', state: 'OR', zipCode: '97424', county: 'Cottage Grove County'},
  { name: 'Corvallis-Benton County Public Library', url: 'https://www.cbcpubliclibrary.net', eventsUrl: 'https://www.cbcpubliclibrary.net/events', city: 'Corvallis', state: 'OR', zipCode: '97330', county: 'Corvallis County'},
  { name: 'Springfield Public Library', url: 'https://www.springfield-or.gov/library', eventsUrl: 'https://www.springfield-or.gov/library/events', city: 'Springfield', state: 'OR', zipCode: '97477', county: 'Springfield County'},
  { name: 'Tigard Public Library', url: 'https://www.tigard-or.gov/library', eventsUrl: 'https://www.tigard-or.gov/library/events', city: 'Tigard', state: 'OR', zipCode: '97223', county: 'Tigard County'},
  { name: 'Beaverton City Library', url: 'https://www.beavertonlibrary.org', eventsUrl: 'https://www.beavertonlibrary.org/events', city: 'Beaverton', state: 'OR', zipCode: '97005', county: 'Beaverton County'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsboro-oregon.gov/library', eventsUrl: 'https://www.hillsboro-oregon.gov/library/events', city: 'Hillsboro', state: 'OR', zipCode: '97123', county: 'Hillsboro County'},
  { name: 'Gresham Library', url: 'https://www.greshamoregon.gov/library', eventsUrl: 'https://www.greshamoregon.gov/library/events', city: 'Gresham', state: 'OR', zipCode: '97030', county: 'Gresham County'},
  { name: 'Lake Oswego Public Library', url: 'https://www.ci.oswego.or.us/library', eventsUrl: 'https://www.ci.oswego.or.us/library/events', city: 'Lake Oswego', state: 'OR', zipCode: '97034', county: 'Lake Oswego County'},
  { name: 'Albany Public Library', url: 'https://www.cityofalbany.net/library', eventsUrl: 'https://www.cityofalbany.net/library/events', city: 'Albany', state: 'OR', zipCode: '97321', county: 'Albany County'},
  { name: 'Klamath County Library Service District', url: 'https://www.klamathlibrary.org', eventsUrl: 'https://www.klamathlibrary.org/events', city: 'Klamath Falls', state: 'OR', zipCode: '97601', county: 'Klamath Falls County'},
  { name: 'Coos Bay Public Library', url: 'https://www.coosbaylibrary.org', eventsUrl: 'https://www.coosbaylibrary.org/events', city: 'Coos Bay', state: 'OR', zipCode: '97420', county: 'Coos Bay County'},
  { name: 'Pendleton Public Library', url: 'https://www.pendletonpubliclibrary.org', eventsUrl: 'https://www.pendletonpubliclibrary.org/events', city: 'Pendleton', state: 'OR', zipCode: '97801', county: 'Pendleton County'},
  { name: 'Grants Pass Library', url: 'https://www.grantspassoregon.gov/library', eventsUrl: 'https://www.grantspassoregon.gov/library/events', city: 'Grants Pass', state: 'OR', zipCode: '97526', county: 'Grants Pass County'},
  { name: 'Redmond Public Library', url: 'https://www.redmondoregon.gov/library', eventsUrl: 'https://www.redmondoregon.gov/library/events', city: 'Redmond', state: 'OR', zipCode: '97756', county: 'Redmond County'},
  { name: 'McMinnville Public Library', url: 'https://www.maclibrary.org', eventsUrl: 'https://www.maclibrary.org/events', city: 'McMinnville', state: 'OR', zipCode: '97128', county: 'McMinnville County'},
  { name: 'Newberg Public Library', url: 'https://www.newbergoregon.gov/library', eventsUrl: 'https://www.newbergoregon.gov/library/events', city: 'Newberg', state: 'OR', zipCode: '97132', county: 'Newberg County'},
  { name: 'Astoria Public Library', url: 'https://www.astorialibrary.org', eventsUrl: 'https://www.astorialibrary.org/events', city: 'Astoria', state: 'OR', zipCode: '97103', county: 'Astoria County'},
  { name: 'Hood River County Library District', url: 'https://www.hoodriverlibrary.org', eventsUrl: 'https://www.hoodriverlibrary.org/events', city: 'Hood River', state: 'OR', zipCode: '97031', county: 'Hood River County'}
];

const SCRAPER_NAME = 'wordpress-OR';

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
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'OR', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'OR',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressORCloudFunction() {
  console.log('☁️ Running WordPress OR as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-OR', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-OR', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressORCloudFunction };
