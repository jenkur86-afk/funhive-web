const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * South Dakota Public Libraries Scraper - Coverage: All South Dakota public libraries
 */
const LIBRARIES = [
  { name: 'Siouxland Libraries', url: 'https://www.siouxlandlib.org', eventsUrl: 'https://www.siouxlandlib.org/events', city: 'Sioux Falls', state: 'SD', zipCode: '57104', county: 'Sioux Falls County'},
  { name: 'Rapid City Public Library', url: 'https://www.rapidcitylibrary.org', eventsUrl: 'https://www.rapidcitylibrary.org/events', city: 'Rapid City', state: 'SD', zipCode: '57701', county: 'Rapid City County'},
  { name: 'Aberdeen Public Library', url: 'https://www.aberdeen.sd.us/library', eventsUrl: 'https://www.aberdeen.sd.us/library/events', city: 'Aberdeen', state: 'SD', zipCode: '57401', county: 'Aberdeen County'},
  { name: 'Brookings Public Library', url: 'https://www.brookingslibrary.org', eventsUrl: 'https://www.brookingslibrary.org/events', city: 'Brookings', state: 'SD', zipCode: '57006', county: 'Brookings County'},
  { name: 'Watertown Regional Library', url: 'https://www.watertownsd.us/library', eventsUrl: 'https://www.watertownsd.us/library/events', city: 'Watertown', state: 'SD', zipCode: '57201', county: 'Watertown County'},
  { name: 'Mitchell Public Library', url: 'https://www.mitchelllibrary.org', eventsUrl: 'https://www.mitchelllibrary.org/events', city: 'Mitchell', state: 'SD', zipCode: '57301', county: 'Mitchell County'},
  { name: 'Yankton Community Library', url: 'https://www.yanktonlibrary.org', eventsUrl: 'https://www.yanktonlibrary.org/events', city: 'Yankton', state: 'SD', zipCode: '57078', county: 'Yankton County'},
  { name: 'Pierre Carnegie Library', url: 'https://www.pierrecarnegielibrary.org', eventsUrl: 'https://www.pierrecarnegielibrary.org/events', city: 'Pierre', state: 'SD', zipCode: '57501', county: 'Pierre County'},
  { name: 'Huron Public Library', url: 'https://www.huronlibrary.org', eventsUrl: 'https://www.huronlibrary.org/events', city: 'Huron', state: 'SD', zipCode: '57350', county: 'Huron County'},
  { name: 'Vermillion Public Library', url: 'https://www.vermillionpubliclibrary.org', eventsUrl: 'https://www.vermillionpubliclibrary.org/events', city: 'Vermillion', state: 'SD', zipCode: '57069', county: 'Vermillion County'},
  { name: 'Spearfish Public Library', url: 'https://www.spearfishlibrary.org', eventsUrl: 'https://www.spearfishlibrary.org/events', city: 'Spearfish', state: 'SD', zipCode: '57783', county: 'Spearfish County'},
  { name: 'Madison Public Library', url: 'https://www.madisonsdlibrary.com', eventsUrl: 'https://www.madisonsdlibrary.com/events', city: 'Madison', state: 'SD', zipCode: '57042', county: 'Madison County'},
  { name: 'Sturgis Public Library', url: 'https://www.sturgislibrary.org', eventsUrl: 'https://www.sturgislibrary.org/events', city: 'Sturgis', state: 'SD', zipCode: '57785', county: 'Sturgis County'},
  { name: 'Belle Fourche Public Library', url: 'https://www.bellefourchelibrary.org', eventsUrl: 'https://www.bellefourchelibrary.org/events', city: 'Belle Fourche', state: 'SD', zipCode: '57717', county: 'Belle Fourche County'},
  { name: 'Box Elder Public Library', url: 'https://www.boxelderlibrary.org', eventsUrl: 'https://www.boxelderlibrary.org/events', city: 'Box Elder', state: 'SD', zipCode: '57719', county: 'Box Elder County'}
];

const SCRAPER_NAME = 'wordpress-SD';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'SD', city: library.city, zipCode: library.zipCode }}));
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
    state: 'SD',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressSDCloudFunction() {
  console.log('☁️ Running WordPress SD as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-SD', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-SD', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressSDCloudFunction };
