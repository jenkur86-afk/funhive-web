const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Connecticut Public Libraries Scraper - Coverage: All Connecticut public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Hartford Public Library', url: 'https://www.hplct.org', eventsUrl: 'https://www.hplct.org/events', city: 'Hartford', state: 'CT', zipCode: '06103', county: 'Hartford County'},
  { name: 'New Haven Free Public Library', url: 'https://www.nhfpl.org', eventsUrl: 'https://www.nhfpl.org/events', city: 'New Haven', state: 'CT', zipCode: '06510', county: 'New Haven County'},
  { name: 'Bridgeport Public Library', url: 'https://www.bportlibrary.org', eventsUrl: 'https://www.bportlibrary.org/events', city: 'Bridgeport', state: 'CT', zipCode: '06604', county: 'Bridgeport County'},
  // Regional Libraries
  { name: 'Stamford Public Library', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'CT', zipCode: '06901', county: 'Stamford County'},
  { name: 'Waterbury Public Library', url: 'https://www.siloam.com', eventsUrl: 'https://www.siloam.com/events', city: 'Waterbury', state: 'CT', zipCode: '06702', county: 'Waterbury County'},
  { name: 'Norwalk Public Library', url: 'https://www.norwalkpubliclibrary.org', eventsUrl: 'https://www.norwalkpubliclibrary.org/events', city: 'Norwalk', state: 'CT', zipCode: '06850', county: 'Norwalk County'},
  { name: 'Danbury Public Library', url: 'https://www.danburylibrary.org', eventsUrl: 'https://www.danburylibrary.org/events', city: 'Danbury', state: 'CT', zipCode: '06810', county: 'Danbury County'},
  { name: 'New Britain Public Library', url: 'https://www.nbpl.info', eventsUrl: 'https://www.nbpl.info/events', city: 'New Britain', state: 'CT', zipCode: '06051', county: 'New Britain County'},
  { name: 'West Hartford Public Library', url: 'https://www.westhartfordlibrary.org', eventsUrl: 'https://www.westhartfordlibrary.org/events', city: 'West Hartford', state: 'CT', zipCode: '06107', county: 'West Hartford County'},
  { name: 'Greenwich Library', url: 'https://www.greenwichlibrary.org', eventsUrl: 'https://www.greenwichlibrary.org/events', city: 'Greenwich', state: 'CT', zipCode: '06830', county: 'Greenwich County'},
  { name: 'Fairfield Public Library', url: 'https://www.fairfieldpubliclibrary.org', eventsUrl: 'https://www.fairfieldpubliclibrary.org/events', city: 'Fairfield', state: 'CT', zipCode: '06824', county: 'Fairfield County'},
  { name: 'Bristol Public Library', url: 'https://www.bristollib.com', eventsUrl: 'https://www.bristollib.com/events', city: 'Bristol', state: 'CT', zipCode: '06010', county: 'Bristol County'},
  { name: 'Meriden Public Library', url: 'https://www.meridenpubliclibrary.org', eventsUrl: 'https://www.meridenpubliclibrary.org/events', city: 'Meriden', state: 'CT', zipCode: '06450', county: 'Meriden County'},
  { name: 'Manchester Public Library', url: 'https://www.manchesterct.gov/library', eventsUrl: 'https://www.manchesterct.gov/library/events', city: 'Manchester', state: 'CT', zipCode: '06040', county: 'Manchester County'},
  { name: 'Milford Public Library', url: 'https://www.ci.milford.ct.us/milford-public-library', eventsUrl: 'https://www.ci.milford.ct.us/milford-public-library/events', city: 'Milford', state: 'CT', zipCode: '06460', county: 'Milford County'},
  { name: 'Stratford Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'CT', zipCode: '06615', county: 'Stratford County'},
  { name: 'East Hartford Public Library', url: 'https://www.easthartfordct.gov/library', eventsUrl: 'https://www.easthartfordct.gov/library/events', city: 'East Hartford', state: 'CT', zipCode: '06108', county: 'East Hartford County'},
  { name: 'Middletown Public Library', url: 'https://www.russelllibrary.org', eventsUrl: 'https://www.russelllibrary.org/events', city: 'Middletown', state: 'CT', zipCode: '06457', county: 'Middletown County'},
  { name: 'Wallingford Public Library', url: 'https://www.wallingfordlibrary.org', eventsUrl: 'https://www.wallingfordlibrary.org/events', city: 'Wallingford', state: 'CT', zipCode: '06492', county: 'Wallingford County'},
  { name: 'Enfield Public Library', url: 'https://www.enfieldpubliclibrary.org', eventsUrl: 'https://www.enfieldpubliclibrary.org/events', city: 'Enfield', state: 'CT', zipCode: '06082', county: 'Enfield County'},
  { name: 'Southington Public Library', url: 'https://www.southingtonlibrary.org', eventsUrl: 'https://www.southingtonlibrary.org/events', city: 'Southington', state: 'CT', zipCode: '06489', county: 'Southington County'},
  { name: 'Shelton Public Library', url: 'https://www.sheltonlibrarysystem.org', eventsUrl: 'https://www.sheltonlibrarysystem.org/events', city: 'Shelton', state: 'CT', zipCode: '06484', county: 'Shelton County'},
  { name: 'Torrington Library', url: 'https://www.torringtonlibrary.org', eventsUrl: 'https://www.torringtonlibrary.org/events', city: 'Torrington', state: 'CT', zipCode: '06790', county: 'Torrington County'},
  { name: 'Trumbull Library', url: 'https://www.trumbullct-library.org', eventsUrl: 'https://www.trumbullct-library.org/events', city: 'Trumbull', state: 'CT', zipCode: '06611', county: 'Trumbull County'},
  { name: 'Vernon Public Library', url: 'https://www.vernon-ct.gov/library', eventsUrl: 'https://www.vernon-ct.gov/library/events', city: 'Vernon', state: 'CT', zipCode: '06066', county: 'Vernon County'}
];

const SCRAPER_NAME = 'wordpress-CT';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'CT', city: library.city, zipCode: library.zipCode }}));
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
    state: 'CT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToFirebase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressCTCloudFunction() {
  console.log('☁️ Running WordPress CT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-CT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-CT', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressCTCloudFunction };
