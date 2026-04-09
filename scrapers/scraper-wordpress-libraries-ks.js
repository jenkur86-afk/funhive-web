const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Kansas Public Libraries Scraper - Coverage: All Kansas public libraries
 */
const LIBRARIES = [
  { name: 'Wichita Public Library', url: 'https://www.wichitalibrary.org', eventsUrl: 'https://www.wichitalibrary.org/events', city: 'Wichita', state: 'KS', zipCode: '67202', county: 'Wichita County'},
  { name: 'Johnson County Library', url: 'https://www.jocolibrary.org', eventsUrl: 'https://www.jocolibrary.org/events', city: 'Overland Park', state: 'KS', zipCode: '66210', county: 'Overland Park County'},
  { name: 'Kansas City Kansas Public Library', url: 'https://www.kckpl.org', eventsUrl: 'https://www.kckpl.org/events', city: 'Kansas City', state: 'KS', zipCode: '66101', county: 'Kansas City County'},
  { name: 'Topeka and Shawnee County Public Library', url: 'https://www.tscpl.org', eventsUrl: 'https://www.tscpl.org/events', city: 'Topeka', state: 'KS', zipCode: '66604', county: 'Topeka County'},
  { name: 'Olathe Public Library', url: 'https://www.olathelibrary.org', eventsUrl: 'https://www.olathelibrary.org/events', city: 'Olathe', state: 'KS', zipCode: '66061', county: 'Olathe County'},
  { name: 'Lawrence Public Library', url: 'https://www.lawrenceks.org/library', eventsUrl: 'https://www.lawrenceks.org/library/events', city: 'Lawrence', state: 'KS', zipCode: '66044', county: 'Lawrence County'},
  { name: 'Manhattan Public Library', url: 'https://www.manhattanks.gov/library', eventsUrl: 'https://www.manhattanks.gov/library/events', city: 'Manhattan', state: 'KS', zipCode: '66502', county: 'Manhattan County'},
  { name: 'Salina Public Library', url: 'https://www.salinapubliclibrary.org', eventsUrl: 'https://www.salinapubliclibrary.org/events', city: 'Salina', state: 'KS', zipCode: '67401', county: 'Salina County'},
  { name: 'Hutchinson Public Library', url: 'https://www.hutchpl.org', eventsUrl: 'https://www.hutchpl.org/events', city: 'Hutchinson', state: 'KS', zipCode: '67501', county: 'Hutchinson County'},
  { name: 'Leavenworth Public Library', url: 'https://www.leavenworthpubliclibrary.org', eventsUrl: 'https://www.leavenworthpubliclibrary.org/events', city: 'Leavenworth', state: 'KS', zipCode: '66048', county: 'Leavenworth County'},
  { name: 'Shawnee Public Library', url: 'https://www.shawneelibrary.org', eventsUrl: 'https://www.shawneelibrary.org/events', city: 'Shawnee', state: 'KS', zipCode: '66216', county: 'Shawnee County'},
  { name: 'Lenexa Public Library', url: 'https://www.lenexa.com/library', eventsUrl: 'https://www.lenexa.com/library/events', city: 'Lenexa', state: 'KS', zipCode: '66215', county: 'Lenexa County'},
  { name: 'Emporia Public Library', url: 'https://www.emporialibrary.org', eventsUrl: 'https://www.emporialibrary.org/events', city: 'Emporia', state: 'KS', zipCode: '66801', county: 'Emporia County'},
  { name: 'Garden City Public Library', url: 'https://www.gcpld.org', eventsUrl: 'https://www.gcpld.org/events', city: 'Garden City', state: 'KS', zipCode: '67846', county: 'Garden City County'},
  { name: 'Dodge City Public Library', url: 'https://www.dodgecitylibrary.org', eventsUrl: 'https://www.dodgecitylibrary.org/events', city: 'Dodge City', state: 'KS', zipCode: '67801', county: 'Dodge City County'},
  { name: 'Derby Public Library', url: 'https://www.derbylibrary.com', eventsUrl: 'https://www.derbylibrary.com/events', city: 'Derby', state: 'KS', zipCode: '67037', county: 'Derby County'},
  { name: 'Pittsburg Public Library', url: 'https://www.pittsburglibrary.org', eventsUrl: 'https://www.pittsburglibrary.org/events', city: 'Pittsburg', state: 'KS', zipCode: '66762', county: 'Pittsburg County'},
  { name: 'Junction City Public Library', url: 'https://www.jcpl.org', eventsUrl: 'https://www.jcpl.org/events', city: 'Junction City', state: 'KS', zipCode: '66441', county: 'Junction City County'},
  { name: 'Liberal Memorial Library', url: 'https://www.liberalmemoriallibrary.org', eventsUrl: 'https://www.liberalmemoriallibrary.org/events', city: 'Liberal', state: 'KS', zipCode: '67901', county: 'Liberal County'},
  { name: 'Hays Public Library', url: 'https://www.hayspubliclibrary.org', eventsUrl: 'https://www.hayspubliclibrary.org/events', city: 'Hays', state: 'KS', zipCode: '67601', county: 'Hays County'},
  { name: 'Newton Public Library', url: 'https://www.newtonplks.org', eventsUrl: 'https://www.newtonplks.org/events', city: 'Newton', state: 'KS', zipCode: '67114', county: 'Newton County'},
  { name: 'Great Bend Public Library', url: 'https://www.greatbendks.net/library', eventsUrl: 'https://www.greatbendks.net/library/events', city: 'Great Bend', state: 'KS', zipCode: '67530', county: 'Great Bend County'},
  { name: 'McPherson Public Library', url: 'https://www.maclib.org', eventsUrl: 'https://www.maclib.org/events', city: 'McPherson', state: 'KS', zipCode: '67460', county: 'McPherson County'},
  { name: 'El Dorado Public Library', url: 'https://www.eldoradolibrary.org', eventsUrl: 'https://www.eldoradolibrary.org/events', city: 'El Dorado', state: 'KS', zipCode: '67042', county: 'El Dorado County'},
  { name: 'Ottawa Library', url: 'https://www.ottawalibrary.org', eventsUrl: 'https://www.ottawalibrary.org/events', city: 'Ottawa', state: 'KS', zipCode: '66067', county: 'Ottawa County'},
  { name: 'Winfield Public Library', url: 'https://www.wpl.org', eventsUrl: 'https://www.wpl.org/events', city: 'Winfield', state: 'KS', zipCode: '67156', county: 'Winfield County'},
  { name: 'Arkansas City Public Library', url: 'https://www.arkcity.org/library', eventsUrl: 'https://www.arkcity.org/library/events', city: 'Arkansas City', state: 'KS', zipCode: '67005', county: 'Arkansas City County'},
  { name: 'Parsons Public Library', url: 'https://www.parsonslibrary.org', eventsUrl: 'https://www.parsonslibrary.org/events', city: 'Parsons', state: 'KS', zipCode: '67357', county: 'Parsons County'},
  { name: 'Atchison Library', url: 'https://www.atchisonlibrary.org', eventsUrl: 'https://www.atchisonlibrary.org/events', city: 'Atchison', state: 'KS', zipCode: '66002', county: 'Atchison County'},
  { name: 'Coffeyville Public Library', url: 'https://www.coffeyvillelibrary.org', eventsUrl: 'https://www.coffeyvillelibrary.org/events', city: 'Coffeyville', state: 'KS', zipCode: '67337', county: 'Coffeyville County'}
];

const SCRAPER_NAME = 'wordpress-KS';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'KS', city: library.city, zipCode: library.zipCode }}));
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
    state: 'KS',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressKSCloudFunction() {
  console.log('☁️ Running WordPress KS as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-KS', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-KS', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressKSCloudFunction };
