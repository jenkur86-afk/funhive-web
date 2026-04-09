const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Maine Public Libraries Scraper - Coverage: All Maine public libraries
 */
const LIBRARIES = [
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.com', eventsUrl: 'https://www.portlandlibrary.com/events', city: 'Portland', state: 'ME', zipCode: '04101', county: 'Portland County'},
  { name: 'Bangor Public Library', url: 'https://www.bangorpubliclibrary.org', eventsUrl: 'https://www.bangorpubliclibrary.org/events', city: 'Bangor', state: 'ME', zipCode: '04401', county: 'Bangor County'},
  { name: 'Lewiston Public Library', url: 'https://www.lplonline.org', eventsUrl: 'https://www.lplonline.org/events', city: 'Lewiston', state: 'ME', zipCode: '04240', county: 'Lewiston County'},
  { name: 'Auburn Public Library', url: 'https://www.auburnpubliclibrary.org', eventsUrl: 'https://www.auburnpubliclibrary.org/events', city: 'Auburn', state: 'ME', zipCode: '04210', county: 'Auburn County'},
  { name: 'South Portland Public Library', url: 'https://www.southportlandlibrary.com', eventsUrl: 'https://www.southportlandlibrary.com/events', city: 'South Portland', state: 'ME', zipCode: '04106', county: 'South Portland County'},
  { name: 'Sanford Public Library', url: 'https://www.sanfordlibrary.org', eventsUrl: 'https://www.sanfordlibrary.org/events', city: 'Sanford', state: 'ME', zipCode: '04073', county: 'Sanford County'},
  { name: 'Biddeford-McArthur Library', url: 'https://www.mcarthurlibrary.org', eventsUrl: 'https://www.mcarthurlibrary.org/events', city: 'Biddeford', state: 'ME', zipCode: '04005', county: 'Biddeford County'},
  { name: 'Augusta - Lithgow Public Library', url: 'https://www.lithgowlibrary.org', eventsUrl: 'https://www.lithgowlibrary.org/events', city: 'Augusta', state: 'ME', zipCode: '04330', county: 'Augusta County'},
  { name: 'Scarborough Public Library', url: 'https://www.scarboroughlibrary.org', eventsUrl: 'https://www.scarboroughlibrary.org/events', city: 'Scarborough', state: 'ME', zipCode: '04074', county: 'Scarborough County'},
  { name: 'Saco Public Library', url: 'https://www.sacopubliclibrary.org', eventsUrl: 'https://www.sacopubliclibrary.org/events', city: 'Saco', state: 'ME', zipCode: '04072', county: 'Saco County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'ME', zipCode: '04901', county: 'Waterville County'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'ME', zipCode: '04092', county: 'Westbrook County'},
  { name: 'Brunswick Curtis Memorial Library', url: 'https://www.curtislibrary.com', eventsUrl: 'https://www.curtislibrary.com/events', city: 'Brunswick', state: 'ME', zipCode: '04011', county: 'Brunswick County'},
  { name: 'Gorham Baxter Memorial Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Gorham', state: 'ME', zipCode: '04038', county: 'Gorham County'},
  { name: 'Windham Public Library', url: 'https://www.windham.lib.me.us', eventsUrl: 'https://www.windham.lib.me.us/events', city: 'Windham', state: 'ME', zipCode: '04062', county: 'Windham County'},
  { name: 'Kennebunk Free Library', url: 'https://www.kennebunklibrary.org', eventsUrl: 'https://www.kennebunklibrary.org/events', city: 'Kennebunk', state: 'ME', zipCode: '04043', county: 'Kennebunk County'},
  { name: 'Belfast Free Library', url: 'https://www.belfastlibrary.org', eventsUrl: 'https://www.belfastlibrary.org/events', city: 'Belfast', state: 'ME', zipCode: '04915', county: 'Belfast County'},
  { name: 'Rockland Public Library', url: 'https://www.rocklandlibrary.org', eventsUrl: 'https://www.rocklandlibrary.org/events', city: 'Rockland', state: 'ME', zipCode: '04841', county: 'Rockland County'},
  { name: 'Camden Public Library', url: 'https://www.librarycamden.org', eventsUrl: 'https://www.librarycamden.org/events', city: 'Camden', state: 'ME', zipCode: '04843', county: 'Camden County'},
  { name: 'Ellsworth Public Library', url: 'https://www.ellsworthpubliclibrary.net', eventsUrl: 'https://www.ellsworthpubliclibrary.net/events', city: 'Ellsworth', state: 'ME', zipCode: '04605', county: 'Ellsworth County'}
];

const SCRAPER_NAME = 'wordpress-ME';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'ME', city: library.city, zipCode: library.zipCode }}));
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
    state: 'ME',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMECloudFunction() {
  console.log('☁️ Running WordPress ME as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-ME', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-ME', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressMECloudFunction };
