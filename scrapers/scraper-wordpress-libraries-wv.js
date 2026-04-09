const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * West Virginia Public Libraries Scraper - Coverage: All West Virginia public libraries
 */
const LIBRARIES = [
  { name: 'Kanawha County Public Library', url: 'https://www.kanawhalibrary.org', eventsUrl: 'https://www.kanawhalibrary.org/events', city: 'Charleston', state: 'WV', zipCode: '25301', county: 'Charleston County'},
  { name: 'Cabell County Public Library', url: 'https://www.caaborlibrary.org', eventsUrl: 'https://www.caaborlibrary.org/events', city: 'Huntington', state: 'WV', zipCode: '25701', county: 'Huntington County'},
  { name: 'Ohio County Public Library', url: 'https://www.ohiocountylibrary.org', eventsUrl: 'https://www.ohiocountylibrary.org/events', city: 'Wheeling', state: 'WV', zipCode: '26003' },
  { name: 'Raleigh County Public Library', url: 'https://www.raleighcountylibrary.org', eventsUrl: 'https://www.raleighcountylibrary.org/events', city: 'Beckley', state: 'WV', zipCode: '25801' },
  { name: 'Monongalia County Public Library', url: 'https://www.moncpl.org', eventsUrl: 'https://www.moncpl.org/events', city: 'Morgantown', state: 'WV', zipCode: '26501', county: 'Morgantown County'},
  { name: 'Wood County Public Library', url: 'https://www.woodcountylibrary.org', eventsUrl: 'https://www.woodcountylibrary.org/events', city: 'Parkersburg', state: 'WV', zipCode: '26101' },
  { name: 'Berkeley County Public Library', url: 'https://www.bcpls.org', eventsUrl: 'https://www.bcpls.org/events', city: 'Martinsburg', state: 'WV', zipCode: '25401', county: 'Martinsburg County'},
  { name: 'Harrison County Public Library', url: 'https://www.clarksburglibrary.org', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'WV', zipCode: '26301', county: 'Clarksburg County'},
  { name: 'Marion County Public Library', url: 'https://www.marioncountylibrary.org', eventsUrl: 'https://www.marioncountylibrary.org/events', city: 'Fairmont', state: 'WV', zipCode: '26554' },
  { name: 'Mercer County Public Library', url: 'https://www.mercercountylibrary.org', eventsUrl: 'https://www.mercercountylibrary.org/events', city: 'Princeton', state: 'WV', zipCode: '24740' },
  { name: 'Jefferson County Public Library', url: 'https://www.jcpl.lib.wv.us', eventsUrl: 'https://www.jcpl.lib.wv.us/events', city: 'Charles Town', state: 'WV', zipCode: '25414', county: 'Jefferson'},
  { name: 'Putnam County Public Library', url: 'https://www.putnamcountylibrary.org', eventsUrl: 'https://www.putnamcountylibrary.org/events', city: 'Hurricane', state: 'WV', zipCode: '25526' },
  { name: 'Marshall County Public Library', url: 'https://www.marshallcountylibrary.org', eventsUrl: 'https://www.marshallcountylibrary.org/events', city: 'Moundsville', state: 'WV', zipCode: '26041' },
  { name: 'Greenbrier County Public Library', url: 'https://www.greenbrierlib.org', eventsUrl: 'https://www.greenbrierlib.org/events', city: 'Lewisburg', state: 'WV', zipCode: '24901', county: 'Lewisburg County'},
  { name: 'Logan County Public Library', url: 'https://www.logancountylibrary.org', eventsUrl: 'https://www.logancountylibrary.org/events', city: 'Logan', state: 'WV', zipCode: '25601' },
  { name: 'Fayette County Public Library', url: 'https://www.fayettecountylibraries.org', eventsUrl: 'https://www.fayettecountylibraries.org/events', city: 'Fayetteville', state: 'WV', zipCode: '25840' },
  { name: 'Brooke County Public Library', url: 'https://www.brookecountylibrary.org', eventsUrl: 'https://www.brookecountylibrary.org/events', city: 'Wellsburg', state: 'WV', zipCode: '26070' },
  { name: 'Wyoming County Public Library', url: 'https://www.wyomingcountylibrary.org', eventsUrl: 'https://www.wyomingcountylibrary.org/events', city: 'Pineville', state: 'WV', zipCode: '24874' },
  { name: 'Nicholas County Public Library', url: 'https://www.nicholascountylibrary.org', eventsUrl: 'https://www.nicholascountylibrary.org/events', city: 'Summersville', state: 'WV', zipCode: '26651' },
  { name: 'McDowell County Public Library', url: 'https://www.mcdowellcountylibrary.org', eventsUrl: 'https://www.mcdowellcountylibrary.org/events', city: 'Welch', state: 'WV', zipCode: '24801' }
];

const SCRAPER_NAME = 'wordpress-WV';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WV', city: library.city, zipCode: library.zipCode }}));
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
    state: 'WV',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWVCloudFunction() {
  console.log('☁️ Running WordPress WV as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WV', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-WV', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressWVCloudFunction };
