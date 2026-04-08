const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Delaware Public Libraries Scraper - Coverage: All Delaware public libraries
 */
const LIBRARIES = [
  // New Castle County Libraries
  { name: 'Wilmington Public Library', url: 'https://www.wilmingtonde.gov/library', eventsUrl: 'https://www.wilmingtonde.gov/library/events', city: 'Wilmington', state: 'DE', zipCode: '19801', county: 'Wilmington County'},
  { name: 'Newark Free Library', url: 'https://www.nccde.org/newark', eventsUrl: 'https://www.nccde.org/newark/events', city: 'Newark', state: 'DE', zipCode: '19711', county: 'Newark County'},
  { name: 'Bear Library', url: 'https://www.nccde.org/bear', eventsUrl: 'https://www.nccde.org/bear/events', city: 'Bear', state: 'DE', zipCode: '19701', county: 'Bear County'},
  { name: 'Kirkwood Library', url: 'https://www.nccde.org/kirkwood', eventsUrl: 'https://www.nccde.org/kirkwood/events', city: 'Wilmington', state: 'DE', zipCode: '19808', county: 'Wilmington County'},
  { name: 'Claymont Library', url: 'https://www.nccde.org/claymont', eventsUrl: 'https://www.nccde.org/claymont/events', city: 'Claymont', state: 'DE', zipCode: '19703', county: 'Claymont County'},
  { name: 'Elsmere Library', url: 'https://www.nccde.org/elsmere', eventsUrl: 'https://www.nccde.org/elsmere/events', city: 'Elsmere', state: 'DE', zipCode: '19805', county: 'Elsmere County'},
  { name: 'Hockessin Library', url: 'https://www.nccde.org/hockessin', eventsUrl: 'https://www.nccde.org/hockessin/events', city: 'Hockessin', state: 'DE', zipCode: '19707', county: 'Hockessin County'},
  { name: 'Garfield Park Library', url: 'https://www.nccde.org/garfield', eventsUrl: 'https://www.nccde.org/garfield/events', city: 'New Castle', state: 'DE', zipCode: '19720', county: 'New Castle County'},
  { name: 'Brandywine Hundred Library', url: 'https://www.nccde.org/brandywine', eventsUrl: 'https://www.nccde.org/brandywine/events', city: 'Wilmington', state: 'DE', zipCode: '19810', county: 'Wilmington County'},
  { name: 'Woodlawn Library', url: 'https://www.nccde.org/woodlawn', eventsUrl: 'https://www.nccde.org/woodlawn/events', city: 'Wilmington', state: 'DE', zipCode: '19805', county: 'Wilmington County'},
  // Kent County Libraries
  { name: 'Dover Public Library', url: 'https://www.doverpubliclibrary.org', eventsUrl: 'https://www.doverpubliclibrary.org/events', city: 'Dover', state: 'DE', zipCode: '19901', county: 'Dover County'},
  { name: 'Kent County Library', url: 'https://www.kentcountyde.gov/library', eventsUrl: 'https://www.kentcountyde.gov/library/events', city: 'Dover', state: 'DE', zipCode: '19904' },
  { name: 'Smyrna Public Library', url: 'https://www.smyrnapubliclibrary.org', eventsUrl: 'https://www.smyrnapubliclibrary.org/events', city: 'Smyrna', state: 'DE', zipCode: '19977', county: 'Smyrna County'},
  { name: 'Harrington Public Library', url: 'https://www.harringtonpubliclibrary.org', eventsUrl: 'https://www.harringtonpubliclibrary.org/events', city: 'Harrington', state: 'DE', zipCode: '19952', county: 'Harrington County'},
  { name: 'Milford Public Library', url: 'https://www.milfordpubliclibrary.org', eventsUrl: 'https://www.milfordpubliclibrary.org/events', city: 'Milford', state: 'DE', zipCode: '19963', county: 'Milford County'},
  // Sussex County Libraries
  { name: 'Georgetown Public Library', url: 'https://www.georgetownpubliclibrary.org', eventsUrl: 'https://www.georgetownpubliclibrary.org/events', city: 'Georgetown', state: 'DE', zipCode: '19947', county: 'Georgetown County'},
  { name: 'Lewes Public Library', url: 'https://www.leweslibrary.org', eventsUrl: 'https://www.leweslibrary.org/events', city: 'Lewes', state: 'DE', zipCode: '19958', county: 'Lewes County'},
  { name: 'Rehoboth Beach Public Library', url: 'https://www.rehobothbeachde.gov/library', eventsUrl: 'https://www.rehobothbeachde.gov/library/events', city: 'Rehoboth Beach', state: 'DE', zipCode: '19971', county: 'Rehoboth Beach County'},
  { name: 'Seaford District Library', url: 'https://www.seafordlibrary.org', eventsUrl: 'https://www.seafordlibrary.org/events', city: 'Seaford', state: 'DE', zipCode: '19973', county: 'Seaford County'},
  { name: 'South Coastal Library', url: 'https://www.southcoastallibrary.org', eventsUrl: 'https://www.southcoastallibrary.org/events', city: 'Bethany Beach', state: 'DE', zipCode: '19930', county: 'Bethany Beach County'},
  { name: 'Bridgeville Public Library', url: 'https://www.bridgevillelibrary.org', eventsUrl: 'https://www.bridgevillelibrary.org/events', city: 'Bridgeville', state: 'DE', zipCode: '19933', county: 'Bridgeville County'},
  { name: 'Laurel Public Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'Laurel', state: 'DE', zipCode: '19956', county: 'Laurel County'},
  { name: 'Milton Public Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'DE', zipCode: '19968', county: 'Milton County'},
  { name: 'Selbyville Public Library', url: 'https://www.selbypubliclibrary.org', eventsUrl: 'https://www.selbypubliclibrary.org/events', city: 'Selbyville', state: 'DE', zipCode: '19975', county: 'Selbyville County'},
  { name: 'Delmar Public Library', url: 'https://www.delmarlibrary.org', eventsUrl: 'https://www.delmarlibrary.org/events', city: 'Delmar', state: 'DE', zipCode: '19940', county: 'Delmar County'}
];

const SCRAPER_NAME = 'wordpress-DE';

async function scrapeGenericEvents() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true // Handle sites with expired/invalid SSL certificates
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
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'DE', city: library.city, zipCode: library.zipCode }}));
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
    state: 'DE',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressDECloudFunction() {
  console.log('☁️ Running WordPress DE as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-DE', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-DE', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressDECloudFunction };
