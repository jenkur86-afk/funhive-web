const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Virginia Public Libraries Scraper - Coverage: All Virginia public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Virginia Beach Public Library', url: 'https://libraries.virginiabeach.gov', eventsUrl: 'https://vbpl.librarymarket.com/events/month', city: 'Virginia Beach', state: 'VA', zipCode: '23452', county: 'Virginia Beach County'},
  { name: 'Richmond Public Library', url: 'https://rvalibrary.org', eventsUrl: 'https://rvalibrary.libcal.com/calendar/main', city: 'Richmond', state: 'VA', zipCode: '23219', county: 'Richmond County'},
  { name: 'Norfolk Public Library', url: 'https://www.norfolkpubliclibrary.org', eventsUrl: 'https://norfolk.libcal.com/calendars', city: 'Norfolk', state: 'VA', zipCode: '23510', county: 'Norfolk County'},
  { name: 'Fairfax County Public Library', url: 'https://www.fairfaxcounty.gov/library', eventsUrl: 'https://librarycalendar.fairfaxcounty.gov/events', city: 'Fairfax', state: 'VA', zipCode: '22030' },
  { name: 'Arlington Public Library', url: 'https://library.arlingtonva.us', eventsUrl: 'https://arlingtonva.libcal.com/calendar', city: 'Arlington', state: 'VA', zipCode: '22201', county: 'Arlington'},
  { name: 'Alexandria Library', url: 'https://alexlibraryva.org', eventsUrl: 'https://alexlibraryva.org/events', city: 'Alexandria', state: 'VA', zipCode: '22314', county: 'Alexandria County'},
  { name: 'Chesapeake Public Library', url: 'https://www.chesapeakepubliclibrary.org', eventsUrl: 'https://events.chesapeakelibrary.org/events', city: 'Chesapeake', state: 'VA', zipCode: '23320', county: 'Chesapeake County'},
  { name: 'Newport News Public Library System', url: 'https://www.nnva.gov/library', eventsUrl: 'https://newportnews.libcal.com/calendar', city: 'Newport News', state: 'VA', zipCode: '23606', county: 'Newport News County'},
  { name: 'Hampton Public Library', url: 'https://www.hamptonpubliclibrary.org', eventsUrl: 'https://hampton.libcal.com/calendar', city: 'Hampton', state: 'VA', zipCode: '23669', county: 'Hampton County'},
  { name: 'Henrico County Public Library', url: 'https://www.henricolibrary.org', eventsUrl: 'https://www.henricolibrary.org/events', city: 'Henrico', state: 'VA', zipCode: '23228', county: 'Henrico County'},
  // Regional Libraries
  { name: 'Prince William Public Library', url: 'https://www.pwcgov.org/library', eventsUrl: 'https://pwcgov.libcal.com/calendar', city: 'Woodbridge', state: 'VA', zipCode: '22192', county: 'Woodbridge County'},
  { name: 'Loudoun County Public Library', url: 'https://library.loudoun.gov', eventsUrl: 'https://loudoun.libnet.info/events', city: 'Leesburg', state: 'VA', zipCode: '20175', county: 'Loudoun'},
  { name: 'Chesterfield County Public Library', url: 'https://www.chesterfield.gov/library', eventsUrl: 'https://chesterfield.libnet.info/events', city: 'Chesterfield', state: 'VA', zipCode: '23832', county: 'Chesterfield County'},
  { name: 'Roanoke Public Libraries', url: 'https://www.roanokeva.gov/library', eventsUrl: 'https://roanokeva.libcal.com/calendar', city: 'Roanoke', state: 'VA', zipCode: '24011', county: 'Roanoke County'},
  { name: 'Suffolk Public Library', url: 'https://www.suffolkpubliclibrary.com', eventsUrl: 'https://suffolkpubliclibrary.libcal.com/calendar', city: 'Suffolk', state: 'VA', zipCode: '23434', county: 'Suffolk County'},
  { name: 'Lynchburg Public Library', url: 'https://www.lynchburgva.gov/library', eventsUrl: 'https://lynchburg.librarycalendar.com/events', city: 'Lynchburg', state: 'VA', zipCode: '24501', county: 'Lynchburg County'},
  { name: 'Portsmouth Public Library', url: 'https://www.portsmouthpubliclibrary.org', eventsUrl: 'https://www.portsmouthpubliclibrary.org/events', city: 'Portsmouth', state: 'VA', zipCode: '23704', county: 'Portsmouth County'},
  { name: 'Williamsburg Regional Library', url: 'https://www.wrl.org', eventsUrl: 'https://libcal.wrl.org/calendar', city: 'Williamsburg', state: 'VA', zipCode: '23185', county: 'Williamsburg County'},
  { name: 'Jefferson-Madison Regional Library', url: 'https://jmrl.org', eventsUrl: 'https://jmrl.org/events', city: 'Charlottesville', state: 'VA', zipCode: '22902', county: 'Charlottesville County'},
  { name: 'Library of Virginia', url: 'https://www.lva.virginia.gov', eventsUrl: 'https://lva-virginia.libcal.com/calendar', city: 'Richmond', state: 'VA', zipCode: '23219', county: 'Richmond County'},
  { name: 'Manassas Park City Library', url: 'https://www.manassasparkcitylibrary.org', eventsUrl: 'https://www.manassasparkcitylibrary.org/events', city: 'Manassas Park', state: 'VA', zipCode: '20111', county: 'Manassas Park County'},
  { name: 'Falls Church Library', url: 'https://www.fallschurchva.gov/library', eventsUrl: 'https://www.fallschurchva.gov/library/events', city: 'Falls Church', state: 'VA', zipCode: '22046', county: 'Falls Church County'},
  { name: 'Staunton Public Library', url: 'https://www.stauntonlibrary.org', eventsUrl: 'https://staunton.bibliocommons.com/events', city: 'Staunton', state: 'VA', zipCode: '24401', county: 'Staunton County'},
  { name: 'Harrisonburg-Rockingham Public Library', url: 'https://www.hrbpl.org', eventsUrl: 'https://www.hrbpl.org/events', city: 'Harrisonburg', state: 'VA', zipCode: '22801', county: 'Harrisonburg County'},
  { name: 'Central Rappahannock Regional Library', url: 'https://www.librarypoint.org', eventsUrl: 'https://www.librarypoint.org/events', city: 'Fredericksburg', state: 'VA', zipCode: '22401', county: 'Fredericksburg County'}
];

const SCRAPER_NAME = 'wordpress-VA';

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
      libraryEvents.forEach(event => events.push({ ...event, state: 'VA', metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'VA', city: library.city, zipCode: library.zipCode }}));
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
    state: 'VA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressVACloudFunction() {
  console.log('☁️ Running WordPress VA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-VA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-VA', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressVACloudFunction };
