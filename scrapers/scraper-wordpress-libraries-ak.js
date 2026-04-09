const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Alaska Public Libraries Scraper - Coverage: All Alaska public libraries
 */
const LIBRARIES = [
  // Major Libraries
  { name: 'Anchorage Public Library', url: 'https://www.anchoragelibrary.org', eventsUrl: 'https://anchorage.librarycalendar.com/events/upcoming', city: 'Anchorage', state: 'AK', zipCode: '99501', county: 'Anchorage County'},
  { name: 'Fairbanks North Star Borough Public Library', url: 'https://www.fnsblibrary.org', eventsUrl: 'https://www.fnsblibrary.org/events', city: 'Fairbanks', state: 'AK', zipCode: '99701', county: 'Fairbanks County'},
  { name: 'Juneau Public Libraries', url: 'https://juneau.org/library', eventsUrl: 'https://www.trumba.com/calendars/juneau-public-libraries', city: 'Juneau', state: 'AK', zipCode: '99801', county: 'Juneau County'},
  { name: 'Alaska State Library', url: 'https://library.alaska.gov', eventsUrl: 'https://library.alaska.gov/events', city: 'Juneau', state: 'AK', zipCode: '99811', county: 'Juneau County'},
  // Regional Libraries
  { name: 'Matanuska-Susitna Borough Libraries', url: 'https://www.matsulibrary.org', eventsUrl: 'https://www.matsulibrary.org/events', city: 'Wasilla', state: 'AK', zipCode: '99654', county: 'Wasilla County'},
  { name: 'Kenai Community Library', url: 'https://www.kenailibrary.org', eventsUrl: 'https://www.kenailibrary.org/events', city: 'Kenai', state: 'AK', zipCode: '99611', county: 'Kenai County'},
  { name: 'Soldotna Public Library', url: 'https://www.soldotna.org/library', eventsUrl: 'https://www.soldotna.org/library/events', city: 'Soldotna', state: 'AK', zipCode: '99669', county: 'Soldotna County'},
  { name: 'Kodiak Public Library', url: 'https://www.city.kodiak.ak.us/library', eventsUrl: 'https://www.city.kodiak.ak.us/library/events', city: 'Kodiak', state: 'AK', zipCode: '99615', county: 'Kodiak County'},
  { name: 'Ketchikan Public Library', url: 'https://www.firstcitylibraries.org', eventsUrl: 'https://www.firstcitylibraries.org/events', city: 'Ketchikan', state: 'AK', zipCode: '99901', county: 'Ketchikan County'},
  { name: 'Sitka Public Library', url: 'https://www.cityofsitka.com/library', eventsUrl: 'https://www.cityofsitka.com/library/events', city: 'Sitka', state: 'AK', zipCode: '99835', county: 'Sitka County'},
  { name: 'Palmer Public Library', url: 'https://www.cityofpalmer.org/library', eventsUrl: 'https://www.cityofpalmer.org/library/events', city: 'Palmer', state: 'AK', zipCode: '99645', county: 'Palmer County'},
  { name: 'Valdez Consortium Library', url: 'https://www.ci.valdez.ak.us/library', eventsUrl: 'https://www.ci.valdez.ak.us/library/events', city: 'Valdez', state: 'AK', zipCode: '99686', county: 'Valdez County'},
  { name: 'Homer Public Library', url: 'https://www.cityofhomer-ak.gov/library', eventsUrl: 'https://www.cityofhomer-ak.gov/library/events', city: 'Homer', state: 'AK', zipCode: '99603', county: 'Homer County'},
  { name: 'Seward Community Library', url: 'https://www.cityofseward.us/library', eventsUrl: 'https://www.cityofseward.us/library/events', city: 'Seward', state: 'AK', zipCode: '99664', county: 'Seward County'},
  { name: 'Bethel Public Library', url: 'https://www.cityofbethel.net/library', eventsUrl: 'https://www.cityofbethel.net/library/events', city: 'Bethel', state: 'AK', zipCode: '99559', county: 'Bethel County'}
];

const SCRAPER_NAME = 'wordpress-AK';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'AK', city: library.city, zipCode: library.zipCode }}));
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
    state: 'AK',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressAKCloudFunction() {
  console.log('☁️ Running WordPress AK as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-AK', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-AK', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressAKCloudFunction };
