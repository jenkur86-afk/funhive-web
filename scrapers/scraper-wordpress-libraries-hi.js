const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Hawaii Public Libraries Scraper - Coverage: All Hawaii public libraries
 */
const LIBRARIES = [
  { name: 'Hawaii State Library', url: 'https://www.librarieshawaii.org', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Honolulu', state: 'HI', zipCode: '96813', county: 'Honolulu County'},
  { name: 'Aiea Public Library', url: 'https://www.librarieshawaii.org/branch/aiea', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Aiea', state: 'HI', zipCode: '96701', county: 'Aiea County'},
  { name: 'Ewa Beach Public Library', url: 'https://www.librarieshawaii.org/branch/ewa-beach', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Ewa Beach', state: 'HI', zipCode: '96706', county: 'Ewa Beach County'},
  { name: 'Kailua Public Library', url: 'https://www.librarieshawaii.org/branch/kailua', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Kailua', state: 'HI', zipCode: '96734', county: 'Kailua County'},
  { name: 'Kapolei Public Library', url: 'https://www.librarieshawaii.org/branch/kapolei', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Kapolei', state: 'HI', zipCode: '96707', county: 'Kapolei County'},
  { name: 'Pearl City Public Library', url: 'https://www.librarieshawaii.org/branch/pearl-city', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Pearl City', state: 'HI', zipCode: '96782', county: 'Pearl City County'},
  { name: 'Waipahu Public Library', url: 'https://www.librarieshawaii.org/branch/waipahu', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Waipahu', state: 'HI', zipCode: '96797', county: 'Waipahu County'},
  { name: 'Kaneohe Public Library', url: 'https://www.librarieshawaii.org/branch/kaneohe', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Kaneohe', state: 'HI', zipCode: '96744', county: 'Kaneohe County'},
  { name: 'Mililani Public Library', url: 'https://www.librarieshawaii.org/branch/mililani', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Mililani', state: 'HI', zipCode: '96789', county: 'Mililani County'},
  { name: 'Hilo Public Library', url: 'https://www.librarieshawaii.org/branch/hilo', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Hilo', state: 'HI', zipCode: '96720', county: 'Hilo County'},
  { name: 'Kona Public Library', url: 'https://www.librarieshawaii.org/branch/kona', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Kailua-Kona', state: 'HI', zipCode: '96740', county: 'Kailua-Kona County'},
  { name: 'Kahului Public Library', url: 'https://www.librarieshawaii.org/branch/kahului', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Kahului', state: 'HI', zipCode: '96732', county: 'Kahului County'},
  { name: 'Kihei Public Library', url: 'https://www.librarieshawaii.org/branch/kihei', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Kihei', state: 'HI', zipCode: '96753', county: 'Kihei County'},
  { name: 'Lihue Public Library', url: 'https://www.librarieshawaii.org/branch/lihue', eventsUrl: 'https://www.librarieshawaii.org/events', city: 'Lihue', state: 'HI', zipCode: '96766', county: 'Lihue County'}
];

const SCRAPER_NAME = 'wordpress-HI';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'HI', city: library.city, zipCode: library.zipCode }}));
      await page.close();
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'HI',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressHICloudFunction() {
  console.log('☁️ Running WordPress HI as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-HI', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-HI', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressHICloudFunction };
