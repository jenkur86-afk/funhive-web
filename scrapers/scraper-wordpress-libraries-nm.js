const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * New Mexico Public Libraries Scraper
 * State: NM
 * Coverage: All New Mexico Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Albuquerque Bernalillo County Library', url: 'https://abqlibrary.org', eventsUrl: 'https://abqlibrary.org/events', city: 'Albuquerque', state: 'NM', zipCode: '87102', county: 'Albuquerque County'},
  { name: 'Santa Fe Public Library', url: 'https://www.santafelibrary.org', eventsUrl: 'https://www.santafelibrary.org/events', city: 'Santa Fe', state: 'NM', zipCode: '87501', county: 'Santa Fe County'},
  // Regional Libraries
  { name: 'Las Cruces Public Library', url: 'https://www.las-cruces.org/library', eventsUrl: 'https://www.las-cruces.org/library/events', city: 'Las Cruces', state: 'NM', zipCode: '88001', county: 'Las Cruces County'},
  { name: 'Rio Rancho Public Library', url: 'https://www.riorancholibrary.org', eventsUrl: 'https://www.riorancholibrary.org/events', city: 'Rio Rancho', state: 'NM', zipCode: '87124', county: 'Rio Rancho County'},
  { name: 'Roswell Public Library', url: 'https://www.roswellpubliclibrary.org', eventsUrl: 'https://www.roswellpubliclibrary.org/events', city: 'Roswell', state: 'NM', zipCode: '88201', county: 'Roswell County'},
  { name: 'Farmington Public Library', url: 'https://www.infoway.org', eventsUrl: 'https://www.infoway.org/events', city: 'Farmington', state: 'NM', zipCode: '87401', county: 'Farmington County'},
  { name: 'Hobbs Public Library', url: 'https://www.hobbspubliclibrary.org', eventsUrl: 'https://www.hobbspubliclibrary.org/events', city: 'Hobbs', state: 'NM', zipCode: '88240', county: 'Hobbs County'},
  { name: 'Clovis-Carver Public Library', url: 'https://www.cityofclovis.org/library', eventsUrl: 'https://www.cityofclovis.org/library/events', city: 'Clovis', state: 'NM', zipCode: '88101', county: 'Clovis County'},
  { name: 'Alamogordo Public Library', url: 'https://www.ci.alamogordo.nm.us/library', eventsUrl: 'https://www.ci.alamogordo.nm.us/library/events', city: 'Alamogordo', state: 'NM', zipCode: '88310', county: 'Alamogordo County'},
  { name: 'Carlsbad Public Library', url: 'https://www.cityofcarlsbadnm.com/library', eventsUrl: 'https://www.cityofcarlsbadnm.com/library/events', city: 'Carlsbad', state: 'NM', zipCode: '88220', county: 'Carlsbad County'},
  { name: 'Gallup Public Library', url: 'https://www.galluplibrary.com', eventsUrl: 'https://www.galluplibrary.com/events', city: 'Gallup', state: 'NM', zipCode: '87301', county: 'Gallup County'},
  { name: 'Los Alamos County Library', url: 'https://www.losalamoslibrary.org', eventsUrl: 'https://www.losalamoslibrary.org/events', city: 'Los Alamos', state: 'NM', zipCode: '87544', county: 'Los Alamos County'},
  { name: 'Deming Public Library', url: 'https://www.demingpubliclibrary.org', eventsUrl: 'https://www.demingpubliclibrary.org/events', city: 'Deming', state: 'NM', zipCode: '88030', county: 'Deming County'},
  { name: 'Las Vegas Carnegie Public Library', url: 'https://www.lasvegasnm.gov/library', eventsUrl: 'https://www.lasvegasnm.gov/library/events', city: 'Las Vegas', state: 'NM', zipCode: '87701', county: 'Las Vegas County'},
  { name: 'Lovington Public Library', url: 'https://www.lovingtonlibrary.org', eventsUrl: 'https://www.lovingtonlibrary.org/events', city: 'Lovington', state: 'NM', zipCode: '88260', county: 'Lovington County'},
  { name: 'Portales Public Library', url: 'https://www.portalesnm.gov/library', eventsUrl: 'https://www.portalesnm.gov/library/events', city: 'Portales', state: 'NM', zipCode: '88130', county: 'Portales County'},
  { name: 'Artesia Public Library', url: 'https://www.artesiapubliclibrary.com', eventsUrl: 'https://www.artesiapubliclibrary.com/events', city: 'Artesia', state: 'NM', zipCode: '88210', county: 'Artesia County'},
  { name: 'Silver City Public Library', url: 'https://www.silvercitypubliclibrary.org', eventsUrl: 'https://www.silvercitypubliclibrary.org/events', city: 'Silver City', state: 'NM', zipCode: '88061', county: 'Silver City County'},
  { name: 'Espanola Public Library', url: 'https://www.espanolalibrary.org', eventsUrl: 'https://www.espanolalibrary.org/events', city: 'Espanola', state: 'NM', zipCode: '87532', county: 'Espanola County'},
  { name: 'Ruidoso Public Library', url: 'https://www.rfrlib.org', eventsUrl: 'https://www.rfrlib.org/events', city: 'Ruidoso', state: 'NM', zipCode: '88345', county: 'Ruidoso County'},
  { name: 'Taos Public Library', url: 'https://www.taoslibrary.org', eventsUrl: 'https://www.taoslibrary.org/events', city: 'Taos', state: 'NM', zipCode: '87571', county: 'Taos County'},
  { name: 'Socorro Public Library', url: 'https://www.socorrolibrary.org', eventsUrl: 'https://www.socorrolibrary.org/events', city: 'Socorro', state: 'NM', zipCode: '87801', county: 'Socorro County'},
  { name: 'Aztec Public Library', url: 'https://www.azteclibrary.org', eventsUrl: 'https://www.azteclibrary.org/events', city: 'Aztec', state: 'NM', zipCode: '87410', county: 'Aztec County'},
  { name: 'Bloomfield Public Library', url: 'https://www.bloomfieldlibrary.org', eventsUrl: 'https://www.bloomfieldlibrary.org/events', city: 'Bloomfield', state: 'NM', zipCode: '87413', county: 'Bloomfield County'},
  { name: 'Truth or Consequences Public Library', url: 'https://www.torcnm.org/library', eventsUrl: 'https://www.torcnm.org/library/events', city: 'Truth or Consequences', state: 'NM', zipCode: '87901', county: 'Truth or Consequences County'},
  { name: 'Tucumcari Public Library', url: 'https://www.tucumcarinm.gov/library', eventsUrl: 'https://www.tucumcarinm.gov/library/events', city: 'Tucumcari', state: 'NM', zipCode: '88401', county: 'Tucumcari County'},
  { name: 'Raton Public Library', url: 'https://www.ratonnm.gov/library', eventsUrl: 'https://www.ratonnm.gov/library/events', city: 'Raton', state: 'NM', zipCode: '87740', county: 'Raton County'},
  { name: 'Clayton Public Library', url: 'https://www.claytonpubliclibrary.org', eventsUrl: 'https://www.claytonpubliclibrary.org/events', city: 'Clayton', state: 'NM', zipCode: '88415', county: 'Clayton County'}
];

const SCRAPER_NAME = 'wordpress-NM';

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
      console.log(`\n📚 Scraping ${library.name}...`);
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = ['[class*="event"]', '[class*="program"]', 'article', '.post'];
        const foundElements = new Set();

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);
            try {
              const title = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], a');
              const date = card.querySelector('[class*="date"], time');
              const desc = card.querySelector('[class*="description"], p');
              const link = card.querySelector('a[href]');
              const ageEl = [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (title && title.textContent.trim()) {
                events.push({
                  title: title.textContent.trim(),
                  date: date ? date.textContent.trim() : '',
                  description: desc ? desc.textContent.trim() : '',
                  url: link ? link.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                });
              }
            } catch (e) {}
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return evt.date || evt.description;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);
      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            state: 'NM',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NM',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNMCloudFunction() {
  console.log('☁️ Running WordPress NM as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NM', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-NM', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNMCloudFunction };
