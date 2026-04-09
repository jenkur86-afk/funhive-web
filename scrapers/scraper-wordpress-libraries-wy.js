const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Wyoming Public Libraries Scraper - Coverage: All Wyoming public libraries
 */
const LIBRARIES = [
  { name: 'Laramie County Library System', url: 'https://www.lclsonline.org', eventsUrl: 'https://www.lclsonline.org/events', city: 'Cheyenne', state: 'WY', zipCode: '82001', county: 'Cheyenne County'},
  { name: 'Natrona County Public Library', url: 'https://www.natronacountylibrary.org', eventsUrl: 'https://www.natronacountylibrary.org/events', city: 'Casper', state: 'WY', zipCode: '82601' },
  { name: 'Albany County Public Library', url: 'https://www.acplwy.org', eventsUrl: 'https://www.acplwy.org/events', city: 'Laramie', state: 'WY', zipCode: '82070', county: 'Laramie County'},
  { name: 'Sweetwater County Library System', url: 'https://www.swcl.us', eventsUrl: 'https://www.swcl.us/events', city: 'Green River', state: 'WY', zipCode: '82935', county: 'Green River County'},
  { name: 'Campbell County Public Library', url: 'https://www.ccpls.org', eventsUrl: 'https://www.ccpls.org/events', city: 'Gillette', state: 'WY', zipCode: '82716', county: 'Gillette County'},
  { name: 'Sheridan County Fulmer Public Library', url: 'https://www.sheridanwyolibrary.org', eventsUrl: 'https://www.sheridanwyolibrary.org/events', city: 'Sheridan', state: 'WY', zipCode: '82801', county: 'Sheridan County'},
  { name: 'Fremont County Library System', url: 'https://www.fremontcountylibraries.org', eventsUrl: 'https://www.fremontcountylibraries.org/events', city: 'Riverton', state: 'WY', zipCode: '82501' },
  { name: 'Teton County Library', url: 'https://www.tclib.org', eventsUrl: 'https://www.tclib.org/events', city: 'Jackson', state: 'WY', zipCode: '83001', county: 'Jackson County'},
  { name: 'Park County Library System', url: 'https://www.parkcountylibrary.org', eventsUrl: 'https://www.parkcountylibrary.org/events', city: 'Cody', state: 'WY', zipCode: '82414' },
  { name: 'Uinta County Library', url: 'https://www.uintalibrary.org', eventsUrl: 'https://www.uintalibrary.org/events', city: 'Evanston', state: 'WY', zipCode: '82930', county: 'Evanston County'},
  { name: 'Lincoln County Library', url: 'https://www.linclib.org', eventsUrl: 'https://www.linclib.org/events', city: 'Kemmerer', state: 'WY', zipCode: '83101', county: 'Kemmerer County'},
  { name: 'Carbon County Library System', url: 'https://www.carbonlibraries.org', eventsUrl: 'https://www.carbonlibraries.org/events', city: 'Rawlins', state: 'WY', zipCode: '82301', county: 'Rawlins County'},
  { name: 'Big Horn County Library', url: 'https://www.bighorncountylibrary.org', eventsUrl: 'https://www.bighorncountylibrary.org/events', city: 'Basin', state: 'WY', zipCode: '82410' },
  { name: 'Converse County Library', url: 'https://www.conversecountylibrary.org', eventsUrl: 'https://www.conversecountylibrary.org/events', city: 'Douglas', state: 'WY', zipCode: '82633' },
  { name: 'Goshen County Library', url: 'https://www.goshencountylibrary.org', eventsUrl: 'https://www.goshencountylibrary.org/events', city: 'Torrington', state: 'WY', zipCode: '82240' }
];

const SCRAPER_NAME = 'wordpress-WY';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WY', city: library.city, zipCode: library.zipCode }}));
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
    state: 'WY',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWYCloudFunction() {
  console.log('☁️ Running WordPress WY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-WY', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressWYCloudFunction };
