const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * North Dakota Public Libraries Scraper - Coverage: All North Dakota public libraries
 */
const LIBRARIES = [
  // Major Libraries
  { name: 'Fargo Public Library', url: 'https://www.fargolibrary.org', eventsUrl: 'https://www.fargolibrary.org/events', city: 'Fargo', state: 'ND', zipCode: '58102', county: 'Fargo County'},
  { name: 'Bismarck Veterans Memorial Public Library', url: 'https://www.bismarcklibrary.org', eventsUrl: 'https://bismarcklib.librarycalendar.com/events/upcoming', city: 'Bismarck', state: 'ND', zipCode: '58501', county: 'Bismarck County'},
  { name: 'Grand Forks Public Library', url: 'https://www.gflibrary.com', eventsUrl: 'https://www.gflibrary.com/events', city: 'Grand Forks', state: 'ND', zipCode: '58201', county: 'Grand Forks County'},
  { name: 'Minot Public Library', url: 'https://www.minotlibrary.org', eventsUrl: 'https://www.minotlibrary.org/events', city: 'Minot', state: 'ND', zipCode: '58701', county: 'Minot County'},
  { name: 'West Fargo Public Library', url: 'https://www.westfargolibrary.org', eventsUrl: 'https://westfargolibrary.org/calendar.aspx', city: 'West Fargo', state: 'ND', zipCode: '58078', county: 'West Fargo County'},
  // Regional Libraries
  { name: 'Dickinson Area Public Library', url: 'https://www.dickinsonlibrary.org', eventsUrl: 'https://www.dickinsonlibrary.org/events', city: 'Dickinson', state: 'ND', zipCode: '58601', county: 'Dickinson County'},
  { name: 'Mandan Public Library', url: 'https://www.mandanlibrary.org', eventsUrl: 'https://www.mandanlibrary.org/events', city: 'Mandan', state: 'ND', zipCode: '58554', county: 'Mandan County'},
  { name: 'Williston Community Library', url: 'https://www.willistonndlibrary.com', eventsUrl: 'https://www.willistonndlibrary.com/events', city: 'Williston', state: 'ND', zipCode: '58801', county: 'Williston County'},
  { name: 'Jamestown Stutsman County Library', url: 'https://www.jamestownlibrary.org', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'ND', zipCode: '58401', county: 'Jamestown County'},
  { name: 'Valley City Barnes County Public Library', url: 'https://www.vcbclibrary.org', eventsUrl: 'https://www.vcbclibrary.org/events', city: 'Valley City', state: 'ND', zipCode: '58072', county: 'Valley City County'},
  { name: 'Devils Lake Public Library', url: 'https://www.devilslakelibrary.org', eventsUrl: 'https://www.devilslakelibrary.org/events', city: 'Devils Lake', state: 'ND', zipCode: '58301', county: 'Devils Lake County'},
  { name: 'Wahpeton Public Library', url: 'https://www.wahpetonlibrary.com', eventsUrl: 'https://www.wahpetonlibrary.com/events', city: 'Wahpeton', state: 'ND', zipCode: '58075', county: 'Wahpeton County'},
  { name: 'North Dakota State Library', url: 'https://www.library.nd.gov', eventsUrl: 'https://www.library.nd.gov/events', city: 'Bismarck', state: 'ND', zipCode: '58505', county: 'Bismarck County'},
  { name: 'Leach Public Library', url: 'https://www.leachpubliclibrary.org', eventsUrl: 'https://www.leachpubliclibrary.org/events', city: 'Wahpeton', state: 'ND', zipCode: '58075', county: 'Wahpeton County'},
  { name: 'Bottineau County Library', url: 'https://www.bottineaucountylibrary.org', eventsUrl: 'https://www.bottineaucountylibrary.org/events', city: 'Bottineau', state: 'ND', zipCode: '58318' }
];

const SCRAPER_NAME = 'wordpress-ND';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'ND', city: library.city, zipCode: library.zipCode }}));
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
    state: 'ND',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNDCloudFunction() {
  console.log('☁️ Running WordPress ND as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-ND', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-ND', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressNDCloudFunction };
