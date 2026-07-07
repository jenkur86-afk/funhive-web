const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * South Carolina Public Libraries Scraper - Coverage: All South Carolina public libraries
 */
const LIBRARIES = [
  { name: 'Abbeville County Library System', url: 'https://www.abbevillelibrary.org/', eventsUrl: 'https://www.abbevillelibrary.org/', city: 'Abbeville', state: 'SC', zipCode: '29620', county: 'Abbeville County'},
  { name: 'Allendale County Library', url: 'https://www.allendalelibrary.org', eventsUrl: 'https://www.allendalelibrary.org/events', city: 'Allendale', state: 'SC', zipCode: '29810', county: 'Allendale County'},
  { name: 'Anderson County Library', url: 'https://www.andersonlibrary.org', eventsUrl: 'https://www.andersonlibrary.org/events', city: 'Anderson', state: 'SC', zipCode: '29621', county: 'Anderson County'},
  { name: 'Kershaw County Library - Camden Branch Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'SC', zipCode: '29020', county: 'Camden County'},
  { name: 'Pickens County Library - Central-Clemson Branch Library', url: 'https://www.centrallibrary.org', eventsUrl: 'https://www.centrallibrary.org/events', city: 'Central', state: 'SC', zipCode: '29630', county: 'Central County'},
  { name: 'Lexington County Library - Chapin', url: 'https://www.chapinlibrary.org', eventsUrl: 'https://www.chapinlibrary.org/events', city: 'Chapin', state: 'SC', zipCode: '29036', county: 'Chapin County'},
  { name: 'Berkeley County Library - Daniel Island', url: 'https://charlestonlibrary.org/', eventsUrl: 'https://charlestonlibrary.org/library-events', city: 'Charleston', state: 'SC', zipCode: '29492', county: 'Charleston County'},
  { name: 'Chester County Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'SC', zipCode: '29706', county: 'Chester County'},
  { name: 'Chesterfield County Library System', url: 'https://www.chesterfieldlibrary.org', eventsUrl: 'https://www.chesterfieldlibrary.org/events', city: 'Chesterfield', state: 'SC', zipCode: '29709', county: 'Chesterfield County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'SC', zipCode: '29325', county: 'Clinton County'},
  { name: 'Lexington County Library - Irmo', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'SC', zipCode: '29212', county: 'Columbia County'},
  { name: 'Dillon County Library System', url: 'https://www.dillonlibrary.org/', eventsUrl: 'https://www.dillonlibrary.org/', city: 'Dillon', state: 'SC', zipCode: '29536', county: 'Dillon County'},
  { name: 'Kershaw County Library - Elgin Branch Library', url: 'https://www.elginlibrary.org/', eventsUrl: 'https://www.elginlibrary.org/', city: 'Elgin', state: 'SC', zipCode: '29045', county: 'Elgin County'},
  { name: 'Hampton County Library - Estill Branch Library', url: 'https://www.estilllibrary.org', eventsUrl: 'https://www.estilllibrary.org/events', city: 'Estill', state: 'SC', zipCode: '29918', county: 'Estill County'},
  { name: 'Florence County Library System', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'SC', zipCode: '29506', county: 'Florence County'},
  { name: 'Lexington County Library - Gaston', url: 'https://www.gastonlibrary.org/', eventsUrl: 'https://www.gastonlibrary.org/31/Calendar', city: 'Gaston', state: 'SC', zipCode: '29053', county: 'Gaston County'},
  { name: 'Lexington County Library - Gilbert-Summit', url: 'https://www.gilbertlibrary.org/', eventsUrl: 'https://www.gilbertlibrary.org/', city: 'Gilbert', state: 'SC', zipCode: '29054', county: 'Gilbert County'},
  { name: 'Great Falls Library', url: 'https://www.greatfallslibrary.org', eventsUrl: 'https://www.greatfallslibrary.org/events', city: 'Great Falls', state: 'SC', zipCode: '29055', county: 'Great Falls County'},
  { name: 'Greenville County Library - Anderson Road (West) Branch', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'SC', zipCode: '29611', county: 'Greenville County'},
  { name: 'Greenwood County Library System', url: 'https://www.greenwoodlibrary.org', eventsUrl: 'https://www.greenwoodlibrary.org/events', city: 'Greenwood', state: 'SC', zipCode: '29646', county: 'Greenwood County'},
  { name: 'Edgefield County Public Library - Johnston Branch (Mobley Library)', url: 'https://www.johnstonlibrary.org', eventsUrl: 'https://www.johnstonlibrary.org/events', city: 'Johnston', state: 'SC', zipCode: '29832', county: 'Johnston County'},
  { name: 'Lake View Library', url: 'https://lakeviewlibrary.org/', eventsUrl: 'https://lakeviewlibrary.org/', city: 'Lake View', state: 'SC', zipCode: '29563', county: 'Lake View County'},
  { name: 'Lamar District Library', url: 'https://www.lamarlibrary.org', eventsUrl: 'https://www.lamarlibrary.org/events', city: 'Lamar', state: 'SC', zipCode: '29069', county: 'Lamar County'},
  { name: 'Lancaster County Library System', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'SC', zipCode: '29720', county: 'Lancaster County'},
  { name: 'Aiken County Library - Midland Valley Branch Library', url: 'https://www.langleylibrary.org', eventsUrl: 'https://www.langleylibrary.org/events', city: 'Langley', state: 'SC', zipCode: '29834', county: 'Langley County'},
  { name: 'Lexington County Public Library System - Main', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'SC', zipCode: '29072', county: 'Lexington County'},
  { name: 'Pickens County Library - Sarlin Branch Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'SC', zipCode: '29657', county: 'Liberty County'},
  { name: 'Horry County Memorial Library - Loris Library', url: 'https://www.lorislibrary.org/', eventsUrl: 'https://www.lorislibrary.org/', city: 'Loris', state: 'SC', zipCode: '29569', county: 'Loris County'},
  { name: 'Spartanburg County Public Library - Middle Tyger Branch Library', url: 'https://www.lymanlibrary.org/', eventsUrl: 'https://www.lymanlibrary.org/', city: 'Lyman', state: 'SC', zipCode: '29365', county: 'Lyman County'},
  { name: 'Marion County Library System', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'SC', zipCode: '29571', county: 'Marion County'},
  { name: 'Mccormick County Library System', url: 'https://mccormicklibrary.org/', eventsUrl: 'https://mccormicklibrary.org/', city: 'Mccormick', state: 'SC', zipCode: '29835', county: 'Mccormick County'},
  { name: 'Hal Kohn Memorial Library', url: 'https://www.newberrylibrary.org', eventsUrl: 'https://www.newberrylibrary.org/events', city: 'Newberry', state: 'SC', zipCode: '29108', county: 'Newberry County'},
  { name: 'Orangeburg County Library Commission', url: 'https://orangeburglibrary.org/', eventsUrl: 'https://orangeburglibrary.org/', city: 'Orangeburg', state: 'SC', zipCode: '29115', county: 'Orangeburg County'},
  { name: 'Anderson County Library - Piedmont Branch Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'SC', zipCode: '29673', county: 'Piedmont County'},
  { name: 'Oconee County Public Library - Salem Branch Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'SC', zipCode: '29676', county: 'Salem County'},
  { name: 'Saluda County Library System', url: 'https://www.saludalibrary.org', eventsUrl: 'https://www.saludalibrary.org/events', city: 'Saluda', state: 'SC', zipCode: '29138', county: 'Saluda County'},
  { name: 'Oconee County Public Library - Seneca Branch Library', url: 'https://www.senecalibrary.org', eventsUrl: 'https://www.senecalibrary.org/events', city: 'Seneca', state: 'SC', zipCode: '29678', county: 'Seneca County'},
  { name: 'Spartanburg County Public Library - H. Carlisle Bean Law Library', url: 'https://www.spartanburglibrary.org', eventsUrl: 'https://www.spartanburglibrary.org/events', city: 'Spartanburg', state: 'SC', zipCode: '29306', county: 'Spartanburg County'},
  { name: 'Orangeburg County Library - Springfield Branch Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'SC', zipCode: '29146', county: 'Springfield County'},
  { name: 'Berkeley County Library - Sangaree Library', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'SC', zipCode: '29483', county: 'Summerville County'},
  { name: 'Lexington County Library - Swansea', url: 'https://www.swansealibrary.org', eventsUrl: 'https://www.swansealibrary.org/events', city: 'Swansea', state: 'SC', zipCode: '29160', county: 'Swansea County'},
  { name: 'Union County Library System', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'SC', zipCode: '29379', county: 'Union County'},
  { name: 'Oconee County Public Library - Westminster Branch Library', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'SC', zipCode: '29693', county: 'Westminster County'},
  { name: 'York Public Library', url: 'https://yorklibrary.org/', eventsUrl: 'https://yorklibrary.org/', city: 'York', state: 'SC', zipCode: '29745', county: 'York County'}
];

const SCRAPER_NAME = 'wordpress-SC';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          '[id*="event"]',
          'article',
          '.post',
          '.item'
        ];

        const foundElements = new Set();

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('[class*="name"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}|^\d{1,2}:\d{2}/i)
                )
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('[class*="summary"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');
              const imageEl = card.querySelector('img');

              const ageEl = [
                card.querySelector('[class*="audience"]'),
                card.querySelector('[class*="age-range"]'),
                card.querySelector('[class*="age_range"]'),
                card.querySelector('[class*="ages"]'),
                card.querySelector('[class*="age-group"]'),
                card.querySelector('[class*="category"]')
              ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (possibleTitles.length > 0) {
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  time: possibleDates.length > 1 ? possibleDates[1].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'generic',
            state: 'SC',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
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
  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'SC',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  South Carolina Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressSCCloudFunction() {
  console.log('☁️ Running WordPress SC as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-SC', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-SC', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressSCCloudFunction };
