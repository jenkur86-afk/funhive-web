const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * New York Public Libraries Scraper - Coverage: All New York public libraries
 */
const LIBRARIES = [
  // NYC Major Systems
  { name: 'New York Public Library', url: 'https://www.nypl.org', eventsUrl: 'https://www.nypl.org/events/calendar', city: 'New York', state: 'NY', zipCode: '10018', county: 'New York County'},
  { name: 'Brooklyn Public Library', url: 'https://www.bklynlibrary.org', eventsUrl: 'https://www.bklynlibrary.org/calendar', city: 'Brooklyn', state: 'NY', zipCode: '11238', county: 'Kings'},
  { name: 'Queens Public Library', url: 'https://www.queenslibrary.org', eventsUrl: 'https://www.queenslibrary.org/calendar', city: 'Jamaica', state: 'NY', zipCode: '11432', county: 'Jamaica County'},
  // Long Island
  { name: 'Great Neck Library', url: 'https://www.greatnecklibrary.org', eventsUrl: 'https://greatnecklibrary.libcal.com/calendar', city: 'Great Neck', state: 'NY', zipCode: '11023', county: 'Great Neck County'},
  { name: 'Hicksville Public Library', url: 'https://www.hicksvillelibrary.org', eventsUrl: 'https://hicksvillelibrary.libcal.com/calendar', city: 'Hicksville', state: 'NY', zipCode: '11801', county: 'Hicksville County'},
  { name: 'Freeport Memorial Library', url: 'https://www.freeportlibrary.info', eventsUrl: 'https://freeportlibrary.libcal.com/calendar', city: 'Freeport', state: 'NY', zipCode: '11520', county: 'Freeport County'},
  { name: 'Rockville Centre Public Library', url: 'https://www.rvcpl.org', eventsUrl: 'https://rvcpl.libcal.com/calendar', city: 'Rockville Centre', state: 'NY', zipCode: '11570', county: 'Rockville Centre County'},
  { name: 'Oceanside Library', url: 'https://www.oceansidelibrary.com', eventsUrl: 'https://oceansidelibrary.libcal.com/calendar', city: 'Oceanside', state: 'NY', zipCode: '11572', county: 'Oceanside County'},
  { name: 'North Merrick Public Library', url: 'https://www.nmerricklibrary.org', eventsUrl: 'https://nmerricklibrary.libcal.com/calendar', city: 'North Merrick', state: 'NY', zipCode: '11566', county: 'North Merrick County'},
  { name: 'Baldwin Public Library', url: 'https://www.baldwinpl.org', eventsUrl: 'https://baldwinlib.libcal.com/calendar', city: 'Baldwin', state: 'NY', zipCode: '11510', county: 'Baldwin County'},
  { name: 'Garden City Public Library', url: 'https://www.gardencitypl.org', eventsUrl: 'https://gardencitypl.libcal.com/calendar', city: 'Garden City', state: 'NY', zipCode: '11530', county: 'Garden City County'},
  // Upstate - Major Cities
  { name: 'Buffalo & Erie County Public Library', url: 'https://www.buffalolib.org', eventsUrl: 'https://events.erielibrary.org/calendar', city: 'Buffalo', state: 'NY', zipCode: '14203', county: 'Buffalo County'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterpubliclibrary.org', eventsUrl: 'https://rochesterpubliclibrary.librarymarket.com/events', city: 'Rochester', state: 'NY', zipCode: '14604', county: 'Rochester County'},
  { name: 'Syracuse Public Library', url: 'https://www.onlib.org', eventsUrl: 'https://onlib-central.libcal.com/calendar', city: 'Syracuse', state: 'NY', zipCode: '13202', county: 'Syracuse County'},
  { name: 'Albany Public Library', url: 'https://www.albanypubliclibrary.org', eventsUrl: 'https://albany.librarycalendar.com/events', city: 'Albany', state: 'NY', zipCode: '12206', county: 'Albany County'},
  // Regional Systems
  { name: 'Westchester Library System', url: 'https://www.westchesterlibraries.org', eventsUrl: 'https://www.westchesterlibraries.org/events', city: 'Elmsford', state: 'NY', zipCode: '10523', county: 'Elmsford County'},
  { name: 'Yonkers Public Library', url: 'https://www.ypl.org', eventsUrl: 'https://www.ypl.org/events', city: 'Yonkers', state: 'NY', zipCode: '10701', county: 'Yonkers County'},
  { name: 'White Plains Public Library', url: 'https://whiteplainslibrary.org', eventsUrl: 'https://whiteplainslibrary.org/events', city: 'White Plains', state: 'NY', zipCode: '10601', county: 'White Plains County'},
  { name: 'Schenectady County Public Library', url: 'https://www.scpl.org', eventsUrl: 'https://www.scpl.org/events', city: 'Schenectady', state: 'NY', zipCode: '12305', county: 'Schenectady County'},
  { name: 'Utica Public Library', url: 'https://www.uticapubliclibrary.org', eventsUrl: 'https://www.uticapubliclibrary.org/events', city: 'Utica', state: 'NY', zipCode: '13501', county: 'Utica County'},
  { name: 'Binghamton Public Library', url: 'https://www.binghamtonlibrary.org', eventsUrl: 'https://www.binghamtonlibrary.org/events', city: 'Binghamton', state: 'NY', zipCode: '13901', county: 'Binghamton County'},
  { name: 'Poughkeepsie Public Library District', url: 'https://www.poklib.org', eventsUrl: 'https://www.poklib.org/events', city: 'Poughkeepsie', state: 'NY', zipCode: '12601', county: 'Poughkeepsie County'},
  { name: 'New Rochelle Public Library', url: 'https://www.nrpl.org', eventsUrl: 'https://www.nrpl.org/events', city: 'New Rochelle', state: 'NY', zipCode: '10801', county: 'New Rochelle County'},
  { name: 'Mount Vernon Public Library', url: 'https://www.mountvernonpubliclibrary.org', eventsUrl: 'https://www.mountvernonpubliclibrary.org/events', city: 'Mount Vernon', state: 'NY', zipCode: '10550', county: 'Mount Vernon County'},
  { name: 'Ithaca Tompkins County Public Library', url: 'https://www.tcpl.org', eventsUrl: 'https://www.tcpl.org/events', city: 'Ithaca', state: 'NY', zipCode: '14850', county: 'Ithaca County'}
];

const SCRAPER_NAME = 'wordpress-NY';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'NY', city: library.city, zipCode: library.zipCode }}));
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
    state: 'NY',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNYCloudFunction() {
  console.log('☁️ Running WordPress NY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-NY', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressNYCloudFunction };
