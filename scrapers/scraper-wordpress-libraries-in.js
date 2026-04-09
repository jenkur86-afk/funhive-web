const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Indiana Public Libraries Scraper - Coverage: All Indiana public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Indianapolis Public Library', url: 'https://www.indypl.org', eventsUrl: 'https://www.indypl.org/events', city: 'Indianapolis', state: 'IN', zipCode: '46204', county: 'Indianapolis County'},
  { name: 'Allen County Public Library', url: 'https://www.acpl.info', eventsUrl: 'https://www.acpl.info/events', city: 'Fort Wayne', state: 'IN', zipCode: '46802', county: 'Fort Wayne County'},
  { name: 'Evansville Vanderburgh Public Library', url: 'https://www.evpl.org', eventsUrl: 'https://www.evpl.org/events', city: 'Evansville', state: 'IN', zipCode: '47708', county: 'Evansville County'},
  // Regional Libraries
  { name: 'South Bend Public Library', url: 'https://www.sbpl.lib.in.us', eventsUrl: 'https://www.sbpl.lib.in.us/events', city: 'South Bend', state: 'IN', zipCode: '46601', county: 'South Bend County'},
  { name: 'Hamilton East Public Library', url: 'https://www.hepl.lib.in.us', eventsUrl: 'https://www.hepl.lib.in.us/events', city: 'Noblesville', state: 'IN', zipCode: '46060', county: 'Noblesville County'},
  { name: 'Carmel Clay Public Library', url: 'https://www.carmelclaylibrary.org', eventsUrl: 'https://www.carmelclaylibrary.org/events', city: 'Carmel', state: 'IN', zipCode: '46032', county: 'Carmel County'},
  { name: 'Tippecanoe County Public Library', url: 'https://www.tcpl.lib.in.us', eventsUrl: 'https://www.tcpl.lib.in.us/events', city: 'Lafayette', state: 'IN', zipCode: '47901', county: 'Lafayette County'},
  { name: 'Muncie Public Library', url: 'https://www.munciepubliclibrary.org', eventsUrl: 'https://www.munciepubliclibrary.org/events', city: 'Muncie', state: 'IN', zipCode: '47305', county: 'Muncie County'},
  { name: 'Anderson Public Library', url: 'https://www.andersonlibrary.net', eventsUrl: 'https://www.andersonlibrary.net/events', city: 'Anderson', state: 'IN', zipCode: '46016', county: 'Anderson County'},
  { name: 'Bloomington Public Library', url: 'https://www.mcpl.info', eventsUrl: 'https://www.mcpl.info/events', city: 'Bloomington', state: 'IN', zipCode: '47404', county: 'Bloomington County'},
  { name: 'Vigo County Public Library', url: 'https://www.vigo.lib.in.us', eventsUrl: 'https://www.vigo.lib.in.us/events', city: 'Terre Haute', state: 'IN', zipCode: '47807', county: 'Terre Haute County'},
  { name: 'Elkhart Public Library', url: 'https://www.myepl.org', eventsUrl: 'https://www.myepl.org/events', city: 'Elkhart', state: 'IN', zipCode: '46516', county: 'Elkhart County'},
  { name: 'Kokomo-Howard County Public Library', url: 'https://www.khcpl.org', eventsUrl: 'https://www.khcpl.org/events', city: 'Kokomo', state: 'IN', zipCode: '46901', county: 'Kokomo County'},
  { name: 'Mishawaka-Penn-Harris Public Library', url: 'https://www.mphpl.org', eventsUrl: 'https://www.mphpl.org/events', city: 'Mishawaka', state: 'IN', zipCode: '46544', county: 'Mishawaka County'},
  { name: 'New Albany-Floyd County Public Library', url: 'https://www.nafclibrary.org', eventsUrl: 'https://www.nafclibrary.org/events', city: 'New Albany', state: 'IN', zipCode: '47150', county: 'New Albany County'},
  { name: 'Jeffersonville Township Public Library', url: 'https://www.jefflibrary.org', eventsUrl: 'https://www.jefflibrary.org/events', city: 'Jeffersonville', state: 'IN', zipCode: '47130', county: 'Jeffersonville County'},
  { name: 'Richmond-Wayne County Public Library', url: 'https://www.mywcpl.info', eventsUrl: 'https://www.mywcpl.info/events', city: 'Richmond', state: 'IN', zipCode: '47374', county: 'Richmond County'},
  { name: 'Columbus-Bartholomew County Public Library', url: 'https://www.barth.lib.in.us', eventsUrl: 'https://www.barth.lib.in.us/events', city: 'Columbus', state: 'IN', zipCode: '47201', county: 'Columbus County'},
  { name: 'Lawrence Public Library', url: 'https://www.lawrencelibrary.net', eventsUrl: 'https://www.lawrencelibrary.net/events', city: 'Lawrence', state: 'IN', zipCode: '46226', county: 'Lawrence County'},
  { name: 'Plainfield-Guilford Township Public Library', url: 'https://www.plainfieldlibrary.net', eventsUrl: 'https://www.plainfieldlibrary.net/events', city: 'Plainfield', state: 'IN', zipCode: '46168', county: 'Plainfield County'},
  { name: 'Westfield Washington Public Library', url: 'https://www.wwpl.lib.in.us', eventsUrl: 'https://www.wwpl.lib.in.us/events', city: 'Westfield', state: 'IN', zipCode: '46074', county: 'Westfield County'},
  { name: 'Greenwood Public Library', url: 'https://www.greenwoodlibrary.us', eventsUrl: 'https://www.greenwoodlibrary.us/events', city: 'Greenwood', state: 'IN', zipCode: '46142', county: 'Greenwood County'},
  { name: 'Portage Public Library', url: 'https://www.portagelibrary.info', eventsUrl: 'https://www.portagelibrary.info/events', city: 'Portage', state: 'IN', zipCode: '46368', county: 'Portage County'},
  { name: 'Crown Point Community Library', url: 'https://www.crownpointlibrary.org', eventsUrl: 'https://www.crownpointlibrary.org/events', city: 'Crown Point', state: 'IN', zipCode: '46307', county: 'Crown Point County'},
  { name: 'Lake County Public Library', url: 'https://www.lcplin.org', eventsUrl: 'https://www.lcplin.org/events', city: 'Merrillville', state: 'IN', zipCode: '46410', county: 'Merrillville County'},
  { name: 'Gary Public Library', url: 'https://www.garypubliclibrary.org', eventsUrl: 'https://www.garypubliclibrary.org/events', city: 'Gary', state: 'IN', zipCode: '46402', county: 'Gary County'},
  { name: 'Hammond Public Library', url: 'https://www.hammondpubliclibrary.org', eventsUrl: 'https://www.hammondpubliclibrary.org/events', city: 'Hammond', state: 'IN', zipCode: '46320', county: 'Hammond County'},
  { name: 'East Chicago Public Library', url: 'https://www.ecpl.org', eventsUrl: 'https://www.ecpl.org/events', city: 'East Chicago', state: 'IN', zipCode: '46312', county: 'East Chicago County'},
  { name: 'Michigan City Public Library', url: 'https://www.mclib.org', eventsUrl: 'https://www.mclib.org/events', city: 'Michigan City', state: 'IN', zipCode: '46360', county: 'Michigan City County'},
  { name: 'Valparaiso Public Library', url: 'https://www.valpopubliclibrary.org', eventsUrl: 'https://www.valpopubliclibrary.org/events', city: 'Valparaiso', state: 'IN', zipCode: '46383', county: 'Valparaiso County'}
];

const SCRAPER_NAME = 'wordpress-IN';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'IN', city: library.city, zipCode: library.zipCode }}));
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
    state: 'IN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressINCloudFunction() {
  console.log('☁️ Running WordPress IN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-IN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-IN', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressINCloudFunction };
