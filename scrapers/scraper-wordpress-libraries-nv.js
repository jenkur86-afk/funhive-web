const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Nevada Public Libraries Scraper - Coverage: All Nevada public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Las Vegas-Clark County Library District', url: 'https://www.lvccld.org', eventsUrl: 'https://www.lvccld.org/events', city: 'Las Vegas', state: 'NV', zipCode: '89101', county: 'Las Vegas County'},
  { name: 'Washoe County Library System', url: 'https://www.washoecountylibrary.us', eventsUrl: 'https://www.washoecountylibrary.us/events', city: 'Reno', state: 'NV', zipCode: '89501' },
  { name: 'Henderson Libraries', url: 'https://www.hendersonlibraries.com', eventsUrl: 'https://www.hendersonlibraries.com/events', city: 'Henderson', state: 'NV', zipCode: '89015', county: 'Henderson County'},
  { name: 'North Las Vegas Library District', url: 'https://www.cityofnorthlasvegas.com/library', eventsUrl: 'https://www.cityofnorthlasvegas.com/library/events', city: 'North Las Vegas', state: 'NV', zipCode: '89030', county: 'North Las Vegas County'},
  // Regional Libraries
  { name: 'Carson City Library', url: 'https://www.carsoncitylibrary.org', eventsUrl: 'https://www.carsoncitylibrary.org/events', city: 'Carson City', state: 'NV', zipCode: '89701', county: 'Carson City County'},
  { name: 'Sparks Library', url: 'https://www.sparkslibrary.org', eventsUrl: 'https://www.sparkslibrary.org/events', city: 'Sparks', state: 'NV', zipCode: '89431', county: 'Sparks County'},
  { name: 'Douglas County Public Library', url: 'https://www.douglascountynv.gov/library', eventsUrl: 'https://www.douglascountynv.gov/library/events', city: 'Minden', state: 'NV', zipCode: '89423' },
  { name: 'Elko County Library', url: 'https://www.elkocountylibrary.org', eventsUrl: 'https://www.elkocountylibrary.org/events', city: 'Elko', state: 'NV', zipCode: '89801' },
  { name: 'Churchill County Library', url: 'https://www.churchillcountylibrary.org', eventsUrl: 'https://www.churchillcountylibrary.org/events', city: 'Fallon', state: 'NV', zipCode: '89406' },
  { name: 'Lyon County Library System', url: 'https://www.lyon-county.org/library', eventsUrl: 'https://www.lyon-county.org/library/events', city: 'Yerington', state: 'NV', zipCode: '89447' },
  { name: 'Humboldt County Library', url: 'https://www.humboldtcountylibrary.us', eventsUrl: 'https://www.humboldtcountylibrary.us/events', city: 'Winnemucca', state: 'NV', zipCode: '89445' },
  { name: 'Pershing County Library', url: 'https://www.pershingcountylibrary.org', eventsUrl: 'https://www.pershingcountylibrary.org/events', city: 'Lovelock', state: 'NV', zipCode: '89419' },
  { name: 'White Pine County Library', url: 'https://www.whitepinecountylibrary.org', eventsUrl: 'https://www.whitepinecountylibrary.org/events', city: 'Ely', state: 'NV', zipCode: '89301' },
  { name: 'Nye County Library', url: 'https://www.nyecountylibrary.org', eventsUrl: 'https://www.nyecountylibrary.org/events', city: 'Pahrump', state: 'NV', zipCode: '89048' },
  { name: 'Storey County Library', url: 'https://www.storeycountylibrary.org', eventsUrl: 'https://www.storeycountylibrary.org/events', city: 'Virginia City', state: 'NV', zipCode: '89440' }
];

const SCRAPER_NAME = 'wordpress-NV';

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
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'NV', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NV',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNVCloudFunction() {
  console.log('☁️ Running WordPress NV as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NV', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-NV', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressNVCloudFunction };
