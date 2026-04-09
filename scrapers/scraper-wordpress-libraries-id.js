const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Idaho Public Libraries Scraper - Coverage: All Idaho public libraries
 */
const LIBRARIES = [
  { name: 'Boise Public Library', url: 'https://www.boisepubliclibrary.org', eventsUrl: 'https://www.boisepubliclibrary.org/events', city: 'Boise', state: 'ID', zipCode: '83702', county: 'Boise County'},
  { name: 'Ada Community Library', url: 'https://www.adalib.org', eventsUrl: 'https://www.adalib.org/events', city: 'Boise', state: 'ID', zipCode: '83709', county: 'Boise County'},
  { name: 'Meridian Library District', url: 'https://www.mld.org', eventsUrl: 'https://www.mld.org/events', city: 'Meridian', state: 'ID', zipCode: '83642', county: 'Meridian County'},
  { name: 'Nampa Public Library', url: 'https://www.nampalibrary.org', eventsUrl: 'https://www.nampalibrary.org/events', city: 'Nampa', state: 'ID', zipCode: '83651', county: 'Nampa County'},
  { name: 'Idaho Falls Public Library', url: 'https://www.ifpl.org', eventsUrl: 'https://www.ifpl.org/events', city: 'Idaho Falls', state: 'ID', zipCode: '83402', county: 'Idaho Falls County'},
  { name: 'Pocatello Public Library', url: 'https://www.pocatellolibrary.org', eventsUrl: 'https://www.pocatellolibrary.org/events', city: 'Pocatello', state: 'ID', zipCode: '83201', county: 'Pocatello County'},
  { name: 'Caldwell Public Library', url: 'https://www.caldwelllibrary.org', eventsUrl: 'https://www.caldwelllibrary.org/events', city: 'Caldwell', state: 'ID', zipCode: '83605', county: 'Caldwell County'},
  { name: 'Twin Falls Public Library', url: 'https://www.twinfallspubliclibrary.org', eventsUrl: 'https://www.twinfallspubliclibrary.org/events', city: 'Twin Falls', state: 'ID', zipCode: '83301', county: 'Twin Falls County'},
  { name: 'Lewiston City Library', url: 'https://www.lewiston.lib.id.us', eventsUrl: 'https://www.lewiston.lib.id.us/events', city: 'Lewiston', state: 'ID', zipCode: '83501', county: 'Lewiston County'},
  { name: "Coeur d'Alene Public Library", url: 'https://www.cdalibrary.org', eventsUrl: 'https://www.cdalibrary.org/events', city: "Coeur d'Alene", state: 'ID', zipCode: '83814', county: 'Coeur d County'},
  { name: 'Post Falls Library', url: 'https://www.postfallslibrary.org', eventsUrl: 'https://www.postfallslibrary.org/events', city: 'Post Falls', state: 'ID', zipCode: '83854', county: 'Post Falls County'},
  { name: 'Rexburg Public Library', url: 'https://www.rexburglibrary.org', eventsUrl: 'https://www.rexburglibrary.org/events', city: 'Rexburg', state: 'ID', zipCode: '83440', county: 'Rexburg County'},
  { name: 'Moscow-Latah County Library', url: 'https://www.latahlibrary.org', eventsUrl: 'https://www.latahlibrary.org/events', city: 'Moscow', state: 'ID', zipCode: '83843', county: 'Moscow County'},
  { name: 'Eagle Public Library', url: 'https://www.eaglepubliclibrary.org', eventsUrl: 'https://www.eaglepubliclibrary.org/events', city: 'Eagle', state: 'ID', zipCode: '83616', county: 'Eagle County'},
  { name: 'Mountain Home Public Library', url: 'https://www.mtnhomelibrary.org', eventsUrl: 'https://www.mtnhomelibrary.org/events', city: 'Mountain Home', state: 'ID', zipCode: '83647', county: 'Mountain Home County'},
  { name: 'Sandpoint Library', url: 'https://www.sandpointlibrary.org', eventsUrl: 'https://www.sandpointlibrary.org/events', city: 'Sandpoint', state: 'ID', zipCode: '83864', county: 'Sandpoint County'}
];

const SCRAPER_NAME = 'wordpress-ID';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'ID', city: library.city, zipCode: library.zipCode }}));
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
    state: 'ID',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressIDCloudFunction() {
  console.log('☁️ Running WordPress ID as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-ID', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-ID', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressIDCloudFunction };
