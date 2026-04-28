const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Rhode Island Public Libraries Scraper - Coverage: All Rhode Island public libraries
 */
const LIBRARIES = [
  { name: 'Rogers Free Library', url: 'https://www.rogersfreelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rogersfreelibrary.org/events', city: 'Bristol', state: 'RI', zipCode: '02809', county: '' },
  { name: 'Jesse M. Smith Memorial Library', url: 'https://www.jessesmithlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jessesmithlibrary.org/events', city: 'Burrillville', state: 'RI', zipCode: '02830', county: '' },
  { name: 'Central Falls Free Public Library', url: 'https://www.centralfallslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centralfallslibrary.org/events', city: 'Central Falls', state: 'RI', zipCode: '02863', county: '' },
  { name: 'Cross Mills Public Library', url: 'https://www.crossmillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crossmillslibrary.org/events', city: 'Charlestown', state: 'RI', zipCode: '02813', county: '' },
  { name: 'Coventry Public Library', url: 'https://www.coventrylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.coventrylibrary.org/events', city: 'Coventry', state: 'RI', zipCode: '02816', county: '' },
  { name: 'East Greenwich Free Library', url: 'https://www.eastgreenwichlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastgreenwichlibrary.org/events', city: 'East Greenwich', state: 'RI', zipCode: '02818', county: '' },
  { name: 'Exeter Public Library', url: 'https://www.exeterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.exeterlibrary.org/events', city: 'Exeter', state: 'RI', zipCode: '02822', county: '' },
  { name: 'Foster Public Library', url: 'https://www.fosterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fosterlibrary.org/events', city: 'Foster', state: 'RI', zipCode: '02825', county: '' },
  { name: 'Tyler Free Library', url: 'https://www.tylerfreelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tylerfreelibrary.org/events', city: 'Foster', state: 'RI', zipCode: '02825', county: '' },
  { name: 'Glocester Manton Free Public Library', url: 'https://www.glocesterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.glocesterlibrary.org/events', city: 'Glocester', state: 'RI', zipCode: '02814', county: '' },
  { name: 'Harmony Library', url: 'https://www.harmonylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Glocester', state: 'RI', zipCode: '02829', county: '' },
  { name: 'Greene Public Library', url: 'https://www.greenelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'RI', zipCode: '02827', county: '' },
  { name: 'Ashaway Free Library', url: 'https://www.ashawaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ashawaylibrary.org/events', city: 'Hopkinton', state: 'RI', zipCode: '02804', county: '' },
  { name: 'Langworthy Public Library', url: 'https://www.langworthylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.langworthylibrary.org/events', city: 'Hopkinton', state: 'RI', zipCode: '02832', county: '' },
  { name: 'Jamestown Philomenian Library', url: 'https://www.jamestownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'RI', zipCode: '02835', county: '' },
  { name: 'Marian J. Mohr Memorial Library', url: 'https://www.mohrlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mohrlibrary.org/events', city: 'Johnston', state: 'RI', zipCode: '02919', county: '' },
  { name: 'Kingston Free Library', url: 'https://www.kingstonfreelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingstonfreelibrary.org/events', city: 'Kingston', state: 'RI', zipCode: '02881', county: '' },
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'RI', zipCode: '02865', county: '' },
  { name: 'Brownell Library, Home Of Little Compton', url: 'https://www.brownelllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brownelllibrary.org/events', city: 'Little Compton', state: 'RI', zipCode: '02837', county: '' },
  { name: 'Middletown Public Library', url: 'https://www.middletownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'RI', zipCode: '02842', county: '' },
  { name: 'Narragansett Public Library', url: 'https://www.narragansettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.narragansettlibrary.org/events', city: 'Narragansett', state: 'RI', zipCode: '02882', county: '' },
  { name: 'Island Free Library', url: 'https://www.islandfreelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.islandfreelibrary.org/events', city: 'New Shoreham', state: 'RI', zipCode: '02807', county: '' },
  { name: 'Mayor Salvatore Mancini Union Free Library', url: 'https://www.northprovidenceunionlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northprovidenceunionlibrary.org/events', city: 'North Providence', state: 'RI', zipCode: '02904', county: '' },
  { name: 'Pascoag Free Public Library', url: 'https://www.pascoaglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pascoaglibrary.org/events', city: 'Pascoag', state: 'RI', zipCode: '02859', county: '' },
  { name: 'Peace Dale Library', url: 'https://www.peacedalelib.org', platform: 'wordpress', eventsUrl: 'https://www.peacedalelib.org/events', city: 'Peace Dale', state: 'RI', zipCode: '02879', county: '' },
  { name: 'Portsmouth Free Public Library', url: 'https://www.portsmouthlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.portsmouthlibrary.org/events', city: 'Portsmouth', state: 'RI', zipCode: '02871', county: '' },
  { name: 'Fox Point Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02906', county: '' },
  { name: 'Knight Memorial Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02907', county: '' },
  { name: 'Mount Pleasant Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02908', county: '' },
  { name: 'Olneyville Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02909', county: '' },
  { name: 'Providence Public Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02903', county: '' },
  { name: 'Rochambeau Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02906', county: '' },
  { name: 'Smith Hill Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02908', county: '' },
  { name: 'South Providence Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02905', county: '' },
  { name: 'Wanskuck Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02904', county: '' },
  { name: 'Washington Park Library', url: 'https://www.provlib.org', platform: 'wordpress', eventsUrl: 'https://www.provlib.org/events', city: 'Providence', state: 'RI', zipCode: '02905', county: '' },
  { name: 'Clark Memorial Library', url: 'https://www.richmondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'RI', zipCode: '02812', county: '' },
  { name: 'Rumford Branch', url: 'https://www.eastprovidencelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastprovidencelibrary.org/events', city: 'Rumford', state: 'RI', zipCode: '02916', county: '' },
  { name: 'Hope Library', url: 'https://www.hopelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hopelibrary.org/events', city: 'Scituate', state: 'RI', zipCode: '02831', county: '' },
  { name: 'North Scituate Public Library', url: 'https://www.northscituatelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northscituatelibrary.org/events', city: 'Scituate', state: 'RI', zipCode: '02857', county: '' },
  { name: 'North Smithfield Public Library', url: 'https://www.northsmithfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northsmithfieldlibrary.org/events', city: 'Slatersville', state: 'RI', zipCode: '02876', county: '' },
  { name: 'East Smithfield Public Library', url: 'https://www.eastsmithfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastsmithfieldlibrary.org/events', city: 'Smithfield', state: 'RI', zipCode: '02917', county: '' },
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Smithfield', state: 'RI', zipCode: '02828', county: '' },
  { name: 'South Kingstown Public Library', url: 'https://www.skplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.skplibrary.org/events', city: 'South Kingstown', state: 'RI', zipCode: '02879', county: '' },
  { name: 'Essex Public Library', url: 'https://www.tivertonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tivertonlibrary.org/events', city: 'Tiverton', state: 'RI', zipCode: '02878', county: '' },
  { name: 'Union Free Library', url: 'https://www.unionfreelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.unionfreelibrary.org/events', city: 'Tiverton', state: 'RI', zipCode: '02878', county: '' },
  { name: 'Robert Beverly Hale Library', url: 'https://www.halelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.halelibrary.org/events', city: 'Wakefield', state: 'RI', zipCode: '02879', county: '' },
  { name: 'George Hail Free Library', url: 'https://www.georgehail.org', platform: 'wordpress', eventsUrl: 'https://www.georgehail.org/events', city: 'Warren', state: 'RI', zipCode: '02885', county: '' },
  { name: 'Louttit Memorial Library', url: 'https://www.louttitlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.louttitlibrary.org/events', city: 'West Greenwich', state: 'RI', zipCode: '02817', county: '' },
  { name: 'Westerly Public Library', url: 'https://www.westerlylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westerlylibrary.org/events', city: 'Westerly', state: 'RI', zipCode: '02891', county: '' },
  { name: 'Fairmount Branch', url: 'https://www.woonsocketlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woonsocketlibrary.org/events', city: 'Woonsocket', state: 'RI', zipCode: '02895', county: '' },
  { name: 'Woonsocket Harris Public Library', url: 'https://www.woonsocketlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woonsocketlibrary.org/events', city: 'Woonsocket', state: 'RI', zipCode: '02895', county: '' },

];

const SCRAPER_NAME = 'generic-RI';

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
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'RI', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'RI',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressRICloudFunction() {
  console.log('☁️ Running WordPress RI as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-RI', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-RI', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressRICloudFunction };
