const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Nebraska Public Libraries Scraper
 * State: NE
 * Coverage: All Nebraska Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Omaha Public Library', url: 'https://omahalibrary.org', eventsUrl: 'https://omahalibrary.org/events', city: 'Omaha', state: 'NE', zipCode: '68102', county: 'Omaha County'},
  { name: 'Lincoln City Libraries', url: 'https://www.lincolnlibraries.org/', eventsUrl: 'https://www.lincolnlibraries.org/programs-and-events/events-calendar/', city: 'Lincoln', state: 'NE', zipCode: '68508', county: 'Lincoln County'},
  // Regional Libraries
  { name: 'Bellevue Public Library', url: 'https://www.bellevue.net/', eventsUrl: 'https://www.bellevue.net/176/Library', city: 'Bellevue', state: 'NE', zipCode: '68005', county: 'Bellevue County'},
  { name: 'Grand Island Public Library', url: 'https://www.gilibrary.org', eventsUrl: 'https://www.gilibrary.org/events', city: 'Grand Island', state: 'NE', zipCode: '68801', county: 'Grand Island County'},
  { name: 'Kearney Public Library', url: 'https://www.cityofkearney.org/library', eventsUrl: 'https://www.cityofkearney.org/library/events', city: 'Kearney', state: 'NE', zipCode: '68847', county: 'Kearney County'},
  { name: 'Fremont Public Library', url: 'https://www.fremontlibrary.com', eventsUrl: 'https://www.fremontlibrary.com/events', city: 'Fremont', state: 'NE', zipCode: '68025', county: 'Fremont County'},
  { name: 'Norfolk Public Library', url: 'https://www.norfolkne.gov/library', eventsUrl: 'https://www.norfolkne.gov/library/events', city: 'Norfolk', state: 'NE', zipCode: '68701', county: 'Norfolk County'},
  { name: 'Columbus Public Library', url: 'https://www.columbusne.us/library', eventsUrl: 'https://www.columbusne.us/library/events', city: 'Columbus', state: 'NE', zipCode: '68601', county: 'Columbus County'},
  { name: 'Papillion Public Library', url: 'https://www.papillion.org/library', eventsUrl: 'https://www.papillion.org/library/events', city: 'Papillion', state: 'NE', zipCode: '68046', county: 'Papillion County'},
  { name: 'La Vista Public Library', url: 'https://www.cityoflavista.org/library', eventsUrl: 'https://www.cityoflavista.org/library/events', city: 'La Vista', state: 'NE', zipCode: '68128', county: 'La Vista County'},
  { name: 'Lexington Public Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'NE', zipCode: '68850', county: 'Lexington County'},
  { name: 'York Public Library', url: 'https://www.yorkpubliclibrary.org', eventsUrl: 'https://www.yorkpubliclibrary.org/events', city: 'York', state: 'NE', zipCode: '68467', county: 'York County'},
  { name: 'McCook Public Library', url: 'https://mccooklibrary.org/', eventsUrl: 'https://mccooklibrary.org/', city: 'McCook', state: 'NE', zipCode: '69001', county: 'McCook County'},
  { name: 'Sidney Public Library', url: 'https://www.sidneypubliclibrary.org', eventsUrl: 'https://www.sidneypubliclibrary.org/events', city: 'Sidney', state: 'NE', zipCode: '69162', county: 'Sidney County'},
  { name: 'Chadron Public Library', url: 'https://www.chadronpubliclibrary.com', eventsUrl: 'https://www.chadronpubliclibrary.com/events', city: 'Chadron', state: 'NE', zipCode: '69337', county: 'Chadron County'},
  { name: 'Wayne Public Library', url: 'https://www.waynepubliclibrary.org', eventsUrl: 'https://www.waynepubliclibrary.org/events', city: 'Wayne', state: 'NE', zipCode: '68787', county: 'Wayne County'},
  { name: 'Seward Memorial Library', url: 'https://www.sewardlibrary.org', eventsUrl: 'https://www.sewardlibrary.org/events', city: 'Seward', state: 'NE', zipCode: '68434', county: 'Seward County'},
  { name: 'Holdrege Public Library', url: 'https://www.holdregelibrary.org/', eventsUrl: 'https://www.holdregelibrary.org/', city: 'Holdrege', state: 'NE', zipCode: '68949', county: 'Holdrege County'},
  { name: 'Gering Public Library', url: 'https://www.geringlibrary.org', eventsUrl: 'https://www.geringlibrary.org/events', city: 'Gering', state: 'NE', zipCode: '69341', county: 'Gering County'},
];

const SCRAPER_NAME = 'wordpress-NE';

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
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

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
            state: 'NE',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    state: 'NE',
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
async function scrapeWordpressNECloudFunction() {
  console.log('☁️ Running WordPress NE as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NE', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-NE', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNECloudFunction };
