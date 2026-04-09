const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Vermont Public Libraries Scraper - Coverage: All Vermont public libraries
 */
const LIBRARIES = [
  { name: 'Fletcher Free Library', url: 'https://www.fletcherfree.org', eventsUrl: 'https://www.fletcherfree.org/events', city: 'Burlington', state: 'VT', zipCode: '05401', county: 'Burlington County'},
  { name: 'Rutland Free Library', url: 'https://www.rutlandfree.org', eventsUrl: 'https://www.rutlandfree.org/events', city: 'Rutland', state: 'VT', zipCode: '05701', county: 'Rutland County'},
  { name: 'Kellogg-Hubbard Library', url: 'https://www.kellogghubbard.org', eventsUrl: 'https://www.kellogghubbard.org/events', city: 'Montpelier', state: 'VT', zipCode: '05602', county: 'Montpelier County'},
  { name: 'Brooks Memorial Library', url: 'https://www.brookslibraryvt.org', eventsUrl: 'https://www.brookslibraryvt.org/events', city: 'Brattleboro', state: 'VT', zipCode: '05301', county: 'Brattleboro County'},
  { name: 'St. Johnsbury Athenaeum', url: 'https://www.stjathenaeum.org', eventsUrl: 'https://www.stjathenaeum.org/events', city: 'St. Johnsbury', state: 'VT', zipCode: '05819', county: 'St. Johnsbury County'},
  { name: 'Ilsley Public Library', url: 'https://www.ilsleypubliclibrary.org', eventsUrl: 'https://www.ilsleypubliclibrary.org/events', city: 'Middlebury', state: 'VT', zipCode: '05753', county: 'Middlebury County'},
  { name: 'Norman Williams Public Library', url: 'https://www.normanwilliams.org', eventsUrl: 'https://www.normanwilliams.org/events', city: 'Woodstock', state: 'VT', zipCode: '05091', county: 'Woodstock County'},
  { name: 'Aldrich Public Library', url: 'https://www.aldrichpubliclibrary.org', eventsUrl: 'https://www.aldrichpubliclibrary.org/events', city: 'Barre', state: 'VT', zipCode: '05641', county: 'Barre County'},
  { name: 'Brownell Library', url: 'https://www.brownelllibrary.org', eventsUrl: 'https://www.brownelllibrary.org/events', city: 'Essex Junction', state: 'VT', zipCode: '05452', county: 'Essex Junction County'},
  { name: 'Pierson Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Shelburne', state: 'VT', zipCode: '05482', county: 'Shelburne County'},
  { name: 'Rockingham Free Public Library', url: 'https://www.rockinghamlibrary.org', eventsUrl: 'https://www.rockinghamlibrary.org/events', city: 'Bellows Falls', state: 'VT', zipCode: '05101', county: 'Bellows Falls County'},
  { name: 'Springfield Town Library', url: 'https://www.springfieldtownlibrary.org', eventsUrl: 'https://www.springfieldtownlibrary.org/events', city: 'Springfield', state: 'VT', zipCode: '05156', county: 'Springfield County'},
  { name: 'Morristown Centennial Library', url: 'https://www.centenniallibrary.org', eventsUrl: 'https://www.centenniallibrary.org/events', city: 'Morrisville', state: 'VT', zipCode: '05661', county: 'Morrisville County'},
  { name: 'Haskell Free Library', url: 'https://www.haskellopera.com/library', eventsUrl: 'https://www.haskellopera.com/library/events', city: 'Derby Line', state: 'VT', zipCode: '05830', county: 'Derby Line County'},
  { name: 'Cobleigh Public Library', url: 'https://www.cobleighlibrary.org', eventsUrl: 'https://www.cobleighlibrary.org/events', city: 'Lyndonville', state: 'VT', zipCode: '05851', county: 'Lyndonville County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibraryvt.org', eventsUrl: 'https://www.hartlandlibraryvt.org/events', city: 'Hartland', state: 'VT', zipCode: '05048', county: 'Hartland County'},
  { name: 'Dorothy Alling Memorial Library', url: 'https://www.williston.lib.vt.us', eventsUrl: 'https://www.williston.lib.vt.us/events', city: 'Williston', state: 'VT', zipCode: '05495', county: 'Williston County'},
  { name: 'Deborah Rawson Memorial Library', url: 'https://www.drml.org', eventsUrl: 'https://www.drml.org/events', city: 'Jericho', state: 'VT', zipCode: '05465', county: 'Jericho County'}
];

const SCRAPER_NAME = 'wordpress-VT';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'VT', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressVTCloudFunction() {
  console.log('☁️ Running WordPress VT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-VT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-VT', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressVTCloudFunction };
