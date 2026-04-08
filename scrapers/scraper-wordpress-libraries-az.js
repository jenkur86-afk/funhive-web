const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Arizona Public Libraries Scraper - Coverage: All Arizona public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Phoenix Public Library', url: 'https://www.phoenixpubliclibrary.org', eventsUrl: 'https://www.phoenixpubliclibrary.org/events', city: 'Phoenix', state: 'AZ', zipCode: '85003', county: 'Phoenix County'},
  { name: 'Mesa Public Library', url: 'https://www.mesalibrary.org', eventsUrl: 'https://events.mesalibrary.org/events/month', city: 'Mesa', state: 'AZ', zipCode: '85201', county: 'Mesa County'},
  { name: 'Scottsdale Public Library', url: 'https://www.scottsdalelibrary.org', eventsUrl: 'https://scottsdale.libnet.info/events', city: 'Scottsdale', state: 'AZ', zipCode: '85251', county: 'Scottsdale County'},
  { name: 'Tucson-Pima Public Library', url: 'https://www.library.pima.gov', eventsUrl: 'https://www.library.pima.gov/events', city: 'Tucson', state: 'AZ', zipCode: '85701', county: 'Tucson County'},
  { name: 'Tempe Public Library', url: 'https://www.tempe.gov/city-hall/community-development/tempe-public-library', eventsUrl: 'https://www.tempe.gov/city-hall/community-development/tempe-public-library/events-programs', city: 'Tempe', state: 'AZ', zipCode: '85281', county: 'Tempe County'},
  { name: 'Glendale Public Library', url: 'https://www.glendaleaz.com/live/departments/library', eventsUrl: 'https://www.glendaleaz.com/live/departments/library/events', city: 'Glendale', state: 'AZ', zipCode: '85301', county: 'Glendale County'},
  { name: 'Chandler Public Library', url: 'https://www.chandlerlibrary.org', eventsUrl: 'https://www.chandlerlibrary.org/events', city: 'Chandler', state: 'AZ', zipCode: '85225', county: 'Chandler County'},
  { name: 'Gilbert Public Library', url: 'https://www.gilbertlibrary.org', eventsUrl: 'https://www.gilbertlibrary.org/events', city: 'Gilbert', state: 'AZ', zipCode: '85234', county: 'Gilbert County'},
  { name: 'Peoria Public Library', url: 'https://www.peoriaaz.gov/residents/city-services/peoria-public-library', eventsUrl: 'https://www.peoriaaz.gov/residents/city-services/peoria-public-library/events-programs', city: 'Peoria', state: 'AZ', zipCode: '85345', county: 'Peoria County'},
  { name: 'Surprise Public Library', url: 'https://www.surpriseaz.gov/179/Library', eventsUrl: 'https://www.surpriseaz.gov/179/Library', city: 'Surprise', state: 'AZ', zipCode: '85374', county: 'Surprise County'},
  // Regional Libraries
  { name: 'Flagstaff City-Coconino County Public Library', url: 'https://www.flagstaffpubliclibrary.org', eventsUrl: 'https://www.flagstaffpubliclibrary.org/events', city: 'Flagstaff', state: 'AZ', zipCode: '86001', county: 'Flagstaff County'},
  { name: 'Yuma County Library District', url: 'https://www.yumalibrary.org', eventsUrl: 'https://www.yumalibrary.org/events', city: 'Yuma', state: 'AZ', zipCode: '85364', county: 'Yuma County'},
  { name: 'Prescott Public Library', url: 'https://www.prescottlibrary.info', eventsUrl: 'https://www.prescottlibrary.info/events', city: 'Prescott', state: 'AZ', zipCode: '86301', county: 'Prescott County'},
  { name: 'Lake Havasu City Public Library', url: 'https://www.lhcaz.gov/library', eventsUrl: 'https://www.lhcaz.gov/library/events', city: 'Lake Havasu City', state: 'AZ', zipCode: '86403', county: 'Lake Havasu City County'},
  { name: 'Mohave County Library District', url: 'https://www.mohavecounty.us/library', eventsUrl: 'https://www.mohavecounty.us/library/events', city: 'Kingman', state: 'AZ', zipCode: '86401' },
  { name: 'Sierra Vista Public Library', url: 'https://www.sierravistaaz.gov/library', eventsUrl: 'https://www.sierravistaaz.gov/library/events', city: 'Sierra Vista', state: 'AZ', zipCode: '85635', county: 'Sierra Vista County'},
  { name: 'Maricopa County Library District', url: 'https://mcldaz.org', eventsUrl: 'https://mcldaz.org/events', city: 'Phoenix', state: 'AZ', zipCode: '85004', county: 'Phoenix County'},
  { name: 'Goodyear Public Library', url: 'https://www.goodyearaz.gov/residents/library', eventsUrl: 'https://www.goodyearaz.gov/residents/library/events', city: 'Goodyear', state: 'AZ', zipCode: '85338', county: 'Goodyear County'},
  { name: 'Avondale Public Library', url: 'https://www.avondaleaz.gov/government/departments/library', eventsUrl: 'https://www.avondaleaz.gov/government/departments/library/events', city: 'Avondale', state: 'AZ', zipCode: '85323', county: 'Avondale County'},
  { name: 'Buckeye Public Library', url: 'https://www.buckeyeaz.gov/residents/library', eventsUrl: 'https://www.buckeyeaz.gov/residents/library/programs-events', city: 'Buckeye', state: 'AZ', zipCode: '85326', county: 'Buckeye County'}
];

const SCRAPER_NAME = 'wordpress-AZ';

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
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'AZ', city: library.city, zipCode: library.zipCode }}));
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
    state: 'AZ',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressAZCloudFunction() {
  console.log('☁️ Running WordPress AZ as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-AZ', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-AZ', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressAZCloudFunction };
