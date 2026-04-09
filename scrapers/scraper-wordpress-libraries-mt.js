const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Montana Public Libraries Scraper - Coverage: All Montana public libraries
 */
const LIBRARIES = [
  { name: 'Billings Public Library', url: 'https://www.billingslibrary.org', eventsUrl: 'https://www.billingslibrary.org/events', city: 'Billings', state: 'MT', zipCode: '59101', county: 'Billings County'},
  { name: 'Missoula Public Library', url: 'https://www.missoulapubliclibrary.org', eventsUrl: 'https://www.missoulapubliclibrary.org/events', city: 'Missoula', state: 'MT', zipCode: '59801', county: 'Missoula County'},
  { name: 'Great Falls Public Library', url: 'https://www.greatfallslibrary.org', eventsUrl: 'https://www.greatfallslibrary.org/events', city: 'Great Falls', state: 'MT', zipCode: '59401', county: 'Great Falls County'},
  { name: 'Bozeman Public Library', url: 'https://www.bozemanlibrary.org', eventsUrl: 'https://www.bozemanlibrary.org/events', city: 'Bozeman', state: 'MT', zipCode: '59715', county: 'Bozeman County'},
  { name: 'Butte-Silver Bow Public Library', url: 'https://www.buttepubliclibrary.info', eventsUrl: 'https://www.buttepubliclibrary.info/events', city: 'Butte', state: 'MT', zipCode: '59701', county: 'Butte County'},
  { name: 'Helena Public Library', url: 'https://www.helenalibrary.org', eventsUrl: 'https://www.helenalibrary.org/events', city: 'Helena', state: 'MT', zipCode: '59601', county: 'Helena County'},
  { name: 'Kalispell Public Library', url: 'https://www.imagineiflibraries.org', eventsUrl: 'https://www.imagineiflibraries.org/events', city: 'Kalispell', state: 'MT', zipCode: '59901', county: 'Kalispell County'},
  { name: 'Havre-Hill County Library', url: 'https://www.havrelibrary.org', eventsUrl: 'https://www.havrelibrary.org/events', city: 'Havre', state: 'MT', zipCode: '59501', county: 'Havre County'},
  { name: 'Miles City Public Library', url: 'https://www.milescitylibrary.org', eventsUrl: 'https://www.milescitylibrary.org/events', city: 'Miles City', state: 'MT', zipCode: '59301', county: 'Miles City County'},
  { name: 'Belgrade Community Library', url: 'https://www.belgradelibrary.org', eventsUrl: 'https://www.belgradelibrary.org/events', city: 'Belgrade', state: 'MT', zipCode: '59714', county: 'Belgrade County'},
  { name: 'Livingston-Park County Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'MT', zipCode: '59047', county: 'Livingston County'},
  { name: 'Whitefish Community Library', url: 'https://www.whitefishlibrary.org', eventsUrl: 'https://www.whitefishlibrary.org/events', city: 'Whitefish', state: 'MT', zipCode: '59937', county: 'Whitefish County'}
];

const SCRAPER_NAME = 'wordpress-MT';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'MT', city: library.city, zipCode: library.zipCode }}));
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
    state: 'MT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMTCloudFunction() {
  console.log('☁️ Running WordPress MT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-MT', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressMTCloudFunction };
