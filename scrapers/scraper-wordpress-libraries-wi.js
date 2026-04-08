const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Wisconsin Public Libraries Scraper
 * State: WI
 * Coverage: All Wisconsin Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Milwaukee Public Library', url: 'https://www.mpl.org', eventsUrl: 'https://www.mpl.org/events', city: 'Milwaukee', state: 'WI', zipCode: '53202', county: 'Milwaukee County'},
  { name: 'Madison Public Library', url: 'https://www.madisonpubliclibrary.org', eventsUrl: 'https://www.madisonpubliclibrary.org/events', city: 'Madison', state: 'WI', zipCode: '53703', county: 'Madison County'},
  // Regional Libraries
  { name: 'Brown County Library', url: 'https://www.browncountylibrary.org', eventsUrl: 'https://www.browncountylibrary.org/events', city: 'Green Bay', state: 'WI', zipCode: '54301' },
  { name: 'Kenosha Public Library', url: 'https://www.kenoshalibrary.org', eventsUrl: 'https://www.kenoshalibrary.org/events', city: 'Kenosha', state: 'WI', zipCode: '53140', county: 'Kenosha County'},
  { name: 'Racine Public Library', url: 'https://www.racinelibrary.info', eventsUrl: 'https://www.racinelibrary.info/events', city: 'Racine', state: 'WI', zipCode: '53403', county: 'Racine County'},
  { name: 'Appleton Public Library', url: 'https://www.apl.org', eventsUrl: 'https://www.apl.org/events', city: 'Appleton', state: 'WI', zipCode: '54911', county: 'Appleton County'},
  { name: 'Waukesha Public Library', url: 'https://www.waukeshapubliclibrary.org', eventsUrl: 'https://www.waukeshapubliclibrary.org/events', city: 'Waukesha', state: 'WI', zipCode: '53186', county: 'Waukesha County'},
  { name: 'Oshkosh Public Library', url: 'https://www.oshkoshpubliclibrary.org', eventsUrl: 'https://www.oshkoshpubliclibrary.org/events', city: 'Oshkosh', state: 'WI', zipCode: '54901', county: 'Oshkosh County'},
  { name: 'Eau Claire Public Library', url: 'https://www.eauclaire.lib.wi.us', eventsUrl: 'https://www.eauclaire.lib.wi.us/events', city: 'Eau Claire', state: 'WI', zipCode: '54701', county: 'Eau Claire County'},
  { name: 'Janesville Public Library', url: 'https://www.janesvillelibrary.info', eventsUrl: 'https://www.janesvillelibrary.info/events', city: 'Janesville', state: 'WI', zipCode: '53545', county: 'Janesville County'},
  { name: 'La Crosse Public Library', url: 'https://www.lacrosselibrary.org', eventsUrl: 'https://www.lacrosselibrary.org/events', city: 'La Crosse', state: 'WI', zipCode: '54601', county: 'La Crosse County'},
  { name: 'West Allis Public Library', url: 'https://www.westallis.lib.wi.us', eventsUrl: 'https://www.westallis.lib.wi.us/events', city: 'West Allis', state: 'WI', zipCode: '53214', county: 'West Allis County'},
  { name: 'Sheboygan Public Library', url: 'https://www.sheboyganfalls.lib.wi.us', eventsUrl: 'https://www.sheboyganfalls.lib.wi.us/events', city: 'Sheboygan', state: 'WI', zipCode: '53081', county: 'Sheboygan County'},
  { name: 'Wauwatosa Public Library', url: 'https://www.wauwatosalibrary.org', eventsUrl: 'https://www.wauwatosalibrary.org/events', city: 'Wauwatosa', state: 'WI', zipCode: '53213', county: 'Wauwatosa County'},
  { name: 'Fond du Lac Public Library', url: 'https://www.fdlpl.org', eventsUrl: 'https://www.fdlpl.org/events', city: 'Fond du Lac', state: 'WI', zipCode: '54935', county: 'Fond du Lac County'},
  { name: 'Brookfield Public Library', url: 'https://www.brookfieldlibrary.info', eventsUrl: 'https://www.brookfieldlibrary.info/events', city: 'Brookfield', state: 'WI', zipCode: '53045', county: 'Brookfield County'},
  { name: 'Beloit Public Library', url: 'https://www.beloitlibrary.info', eventsUrl: 'https://www.beloitlibrary.info/events', city: 'Beloit', state: 'WI', zipCode: '53511', county: 'Beloit County'},
  { name: 'Greenfield Public Library', url: 'https://www.greenfieldwi.us/library', eventsUrl: 'https://www.greenfieldwi.us/library/events', city: 'Greenfield', state: 'WI', zipCode: '53220', county: 'Greenfield County'},
  { name: 'Manitowoc Public Library', url: 'https://www.manitowoclibrary.org', eventsUrl: 'https://www.manitowoclibrary.org/events', city: 'Manitowoc', state: 'WI', zipCode: '54220', county: 'Manitowoc County'},
  { name: 'Wausau Public Library', url: 'https://www.wausaupubliclibrary.org', eventsUrl: 'https://www.wausaupubliclibrary.org/events', city: 'Wausau', state: 'WI', zipCode: '54403', county: 'Wausau County'},
  { name: 'Stevens Point Public Library', url: 'https://www.stevenspoint.org/library', eventsUrl: 'https://www.stevenspoint.org/library/events', city: 'Stevens Point', state: 'WI', zipCode: '54481', county: 'Stevens Point County'},
  { name: 'Sun Prairie Public Library', url: 'https://www.sunprairiepubliclibrary.org', eventsUrl: 'https://www.sunprairiepubliclibrary.org/events', city: 'Sun Prairie', state: 'WI', zipCode: '53590', county: 'Sun Prairie County'},
  { name: 'Neenah Public Library', url: 'https://www.neenahlibrary.org', eventsUrl: 'https://www.neenahlibrary.org/events', city: 'Neenah', state: 'WI', zipCode: '54956', county: 'Neenah County'},
  { name: 'Superior Public Library', url: 'https://www.superiorlibrary.org', eventsUrl: 'https://www.superiorlibrary.org/events', city: 'Superior', state: 'WI', zipCode: '54880', county: 'Superior County'},
  { name: 'Marshfield Public Library', url: 'https://www.marshfieldlibrary.org', eventsUrl: 'https://www.marshfieldlibrary.org/events', city: 'Marshfield', state: 'WI', zipCode: '54449', county: 'Marshfield County'},
  { name: 'Pewaukee Public Library', url: 'https://www.pewaukeelibrary.org', eventsUrl: 'https://www.pewaukeelibrary.org/events', city: 'Pewaukee', state: 'WI', zipCode: '53072', county: 'Pewaukee County'},
  { name: 'Mequon Public Library', url: 'https://www.mequonlibrary.org', eventsUrl: 'https://www.mequonlibrary.org/events', city: 'Mequon', state: 'WI', zipCode: '53092', county: 'Mequon County'},
  { name: 'Middleton Public Library', url: 'https://www.midlibrary.org', eventsUrl: 'https://www.midlibrary.org/events', city: 'Middleton', state: 'WI', zipCode: '53562', county: 'Middleton County'},
  { name: 'Fitchburg Public Library', url: 'https://www.fitchburgwi.gov/library', eventsUrl: 'https://www.fitchburgwi.gov/library/events', city: 'Fitchburg', state: 'WI', zipCode: '53711', county: 'Fitchburg County'},
  { name: 'De Pere Public Library', url: 'https://www.deperelibrary.org', eventsUrl: 'https://www.deperelibrary.org/events', city: 'De Pere', state: 'WI', zipCode: '54115', county: 'De Pere County'}
];

const SCRAPER_NAME = 'wordpress-WI';

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
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WI', city: library.city, zipCode: library.zipCode }}));
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
    state: 'WI',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWICloudFunction() {
  console.log('☁️ Running WordPress WI as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WI', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-WI', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressWICloudFunction };
