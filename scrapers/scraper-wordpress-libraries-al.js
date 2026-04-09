const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Alabama Public Libraries Scraper
 * State: AL
 * Libraries:
 * - Birmingham Public Library (200K)
 * - Huntsville-Madison County Public Library (450K)
 * - Mobile Public Library (200K)
 * - Montgomery City-County Public Library (230K)
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Birmingham Public Library', url: 'https://www.bplonline.org', eventsUrl: 'https://www.bplonline.org/events', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Birmingham County'},
  { name: 'Huntsville-Madison County Public Library', url: 'https://www.hmcpl.org', eventsUrl: 'https://www.hmcpl.org/events', city: 'Huntsville', state: 'AL', zipCode: '35801', county: 'Huntsville County'},
  { name: 'Mobile Public Library', url: 'https://www.mplonline.org', eventsUrl: 'https://www.mplonline.org/events', city: 'Mobile', state: 'AL', zipCode: '36602', county: 'Mobile County'},
  { name: 'Montgomery City-County Public Library', url: 'https://www.mccpl.lib.al.us', eventsUrl: 'https://www.mccpl.lib.al.us/events', city: 'Montgomery', state: 'AL', zipCode: '36104', county: 'Montgomery County'},
  // Regional Libraries
  { name: 'Tuscaloosa Public Library', url: 'https://www.tuscaloosa-library.org', eventsUrl: 'https://www.tuscaloosa-library.org/events', city: 'Tuscaloosa', state: 'AL', zipCode: '35401', county: 'Tuscaloosa County'},
  { name: 'Auburn Public Library', url: 'https://www.auburnalabama.org/library', eventsUrl: 'https://www.auburnalabama.org/library/events', city: 'Auburn', state: 'AL', zipCode: '36830', county: 'Auburn County'},
  { name: 'Dothan Houston County Library System', url: 'https://www.dhcls.org', eventsUrl: 'https://www.dhcls.org/events', city: 'Dothan', state: 'AL', zipCode: '36301', county: 'Dothan County'},
  { name: 'Gadsden Public Library', url: 'https://www.gadsdenpl.org', eventsUrl: 'https://www.gadsdenpl.org/events', city: 'Gadsden', state: 'AL', zipCode: '35901', county: 'Gadsden County'},
  { name: 'Anniston-Calhoun County Public Library', url: 'https://www.annistonlibrary.org', eventsUrl: 'https://www.annistonlibrary.org/events', city: 'Anniston', state: 'AL', zipCode: '36201', county: 'Anniston County'},
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'AL', zipCode: '35601', county: 'Decatur County'},
  { name: 'Florence-Lauderdale Public Library', url: 'https://www.flpl.org', eventsUrl: 'https://www.flpl.org/events', city: 'Florence', state: 'AL', zipCode: '35630', county: 'Florence County'},
  { name: 'Hoover Public Library', url: 'https://www.hooverlibrary.org', eventsUrl: 'https://www.hooverlibrary.org/events', city: 'Hoover', state: 'AL', zipCode: '35244', county: 'Hoover County'},
  { name: 'Vestavia Hills Library', url: 'https://www.vestavialibrary.org', eventsUrl: 'https://www.vestavialibrary.org/events', city: 'Vestavia Hills', state: 'AL', zipCode: '35216', county: 'Vestavia Hills County'},
  { name: 'Homewood Public Library', url: 'https://www.homewoodpubliclibrary.org', eventsUrl: 'https://www.homewoodpubliclibrary.org/events', city: 'Homewood', state: 'AL', zipCode: '35209', county: 'Homewood County'},
  { name: 'Mountain Brook Library', url: 'https://www.mtbrooklibrary.org', eventsUrl: 'https://www.mtbrooklibrary.org/events', city: 'Mountain Brook', state: 'AL', zipCode: '35213', county: 'Mountain Brook County'},
  { name: 'Shelby County Libraries', url: 'https://www.shelbycounty-al.org/library', eventsUrl: 'https://www.shelbycounty-al.org/library/events', city: 'Columbiana', state: 'AL', zipCode: '35051' },
  { name: 'Jefferson County Library Cooperative', url: 'https://www.jclc.org', eventsUrl: 'https://www.jclc.org/events', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Birmingham County'},
  { name: 'Opelika Public Library', url: 'https://www.opelika-al.gov/library', eventsUrl: 'https://www.opelika-al.gov/library/events', city: 'Opelika', state: 'AL', zipCode: '36801', county: 'Opelika County'},
  { name: 'Phenix City-Russell County Library', url: 'https://www.pcrclibrary.org', eventsUrl: 'https://www.pcrclibrary.org/events', city: 'Phenix City', state: 'AL', zipCode: '36867', county: 'Phenix City County'},
  { name: 'Prattville Public Library', url: 'https://www.prattvillelibrary.com', eventsUrl: 'https://www.prattvillelibrary.com/events', city: 'Prattville', state: 'AL', zipCode: '36067', county: 'Prattville County'},
  { name: 'Talladega Public Library', url: 'https://www.talladegalibrary.org', eventsUrl: 'https://www.talladegalibrary.org/events', city: 'Talladega', state: 'AL', zipCode: '35160', county: 'Talladega County'},
  { name: 'Selma-Dallas County Public Library', url: 'https://www.selmalibrary.org', eventsUrl: 'https://www.selmalibrary.org/events', city: 'Selma', state: 'AL', zipCode: '36701', county: 'Selma County'},
  { name: 'Enterprise Public Library', url: 'https://www.enterpriseal.gov/library', eventsUrl: 'https://www.enterpriseal.gov/library/events', city: 'Enterprise', state: 'AL', zipCode: '36330', county: 'Enterprise County'},
  { name: 'Albertville Public Library', url: 'https://www.albertvillelibrary.org', eventsUrl: 'https://www.albertvillelibrary.org/events', city: 'Albertville', state: 'AL', zipCode: '35950', county: 'Albertville County'},
  { name: 'Cullman County Public Library', url: 'https://www.ccpls.com', eventsUrl: 'https://www.ccpls.com/events', city: 'Cullman', state: 'AL', zipCode: '35055', county: 'Cullman County'},
  { name: 'Athens-Limestone Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'AL', zipCode: '35611', county: 'Athens County'},
  { name: 'Bessemer Public Library', url: 'https://www.bessemerlibrary.org', eventsUrl: 'https://www.bessemerlibrary.org/events', city: 'Bessemer', state: 'AL', zipCode: '35020', county: 'Bessemer County'},
  { name: 'Fairhope Public Library', url: 'https://www.fairhopelibrary.org', eventsUrl: 'https://www.fairhopelibrary.org/events', city: 'Fairhope', state: 'AL', zipCode: '36532', county: 'Fairhope County'},
  { name: 'Daphne Public Library', url: 'https://www.daphnelibrary.org', eventsUrl: 'https://www.daphnelibrary.org/events', city: 'Daphne', state: 'AL', zipCode: '36526', county: 'Daphne County'},
  { name: 'Gulf Shores Public Library', url: 'https://www.gulfshoresal.gov/library', eventsUrl: 'https://www.gulfshoresal.gov/library/events', city: 'Gulf Shores', state: 'AL', zipCode: '36542', county: 'Gulf Shores County'},
  { name: 'Jasper Public Library', url: 'https://www.jasperlibrary.org', eventsUrl: 'https://www.jasperlibrary.org/events', city: 'Jasper', state: 'AL', zipCode: '35501', county: 'Jasper County'},
  { name: 'Scottsboro Public Library', url: 'https://www.scottsborolibrary.org', eventsUrl: 'https://www.scottsborolibrary.org/events', city: 'Scottsboro', state: 'AL', zipCode: '35768', county: 'Scottsboro County'},
  { name: 'Troy Public Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'AL', zipCode: '36081', county: 'Troy County'},
  { name: 'Pelham Public Library', url: 'https://www.pelhamlibrary.org', eventsUrl: 'https://www.pelhamlibrary.org/events', city: 'Pelham', state: 'AL', zipCode: '35124', county: 'Pelham County'},
  { name: 'Trussville Public Library', url: 'https://www.trussvillelibrary.com', eventsUrl: 'https://www.trussvillelibrary.com/events', city: 'Trussville', state: 'AL', zipCode: '35173', county: 'Trussville County'},
  { name: 'Gardendale Public Library', url: 'https://www.gardendalelibrary.org', eventsUrl: 'https://www.gardendalelibrary.org/events', city: 'Gardendale', state: 'AL', zipCode: '35071', county: 'Gardendale County'}
];

const SCRAPER_NAME = 'wordpress-AL';

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
      await page.goto(library.eventsUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

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

              // Look for age/audience info on the event card
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
            platform: 'generic',
            state: 'AL',
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

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'AL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Alabama Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressALCloudFunction() {
  console.log('☁️ Running WordPress AL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-AL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-AL', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressALCloudFunction };
