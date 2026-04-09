const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Kentucky Public Libraries Scraper
 * State: KY
 * Coverage: All Kentucky Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Louisville Free Public Library', url: 'https://www.lfpl.org', eventsUrl: 'https://www.lfpl.org/events', city: 'Louisville', state: 'KY', zipCode: '40203', county: 'Louisville County'},
  { name: 'Lexington Public Library', url: 'https://www.lexpublib.org', eventsUrl: 'https://www.lexpublib.org/events', city: 'Lexington', state: 'KY', zipCode: '40507', county: 'Lexington County'},
  { name: 'Kenton County Public Library', url: 'https://www.kentonlibrary.org', eventsUrl: 'https://www.kentonlibrary.org/events', city: 'Covington', state: 'KY', zipCode: '41011', county: 'Covington County'},
  { name: 'Campbell County Public Library', url: 'https://www.cc-pl.org', eventsUrl: 'https://www.cc-pl.org/events', city: 'Cold Spring', state: 'KY', zipCode: '41076', county: 'Cold Spring County'},
  // Regional Libraries
  { name: 'Boone County Public Library', url: 'https://www.bcpl.org', eventsUrl: 'https://www.bcpl.org/events', city: 'Burlington', state: 'KY', zipCode: '41005', county: 'Burlington County'},
  { name: 'Warren County Public Library', url: 'https://www.warrenpl.org', eventsUrl: 'https://www.warrenpl.org/events', city: 'Bowling Green', state: 'KY', zipCode: '42101', county: 'Bowling Green County'},
  { name: 'Daviess County Public Library', url: 'https://www.dcplibrary.org', eventsUrl: 'https://www.dcplibrary.org/events', city: 'Owensboro', state: 'KY', zipCode: '42301', county: 'Owensboro County'},
  { name: 'McCracken County Public Library', url: 'https://www.mclib.net', eventsUrl: 'https://www.mclib.net/events', city: 'Paducah', state: 'KY', zipCode: '42001', county: 'Paducah County'},
  { name: 'Hardin County Public Library', url: 'https://www.hcpl.info', eventsUrl: 'https://www.hcpl.info/events', city: 'Elizabethtown', state: 'KY', zipCode: '42701', county: 'Elizabethtown County'},
  { name: 'Madison County Public Library', url: 'https://www.madisoncountylibrary.org', eventsUrl: 'https://www.madisoncountylibrary.org/events', city: 'Richmond', state: 'KY', zipCode: '40475' },
  { name: 'Oldham County Public Library', url: 'https://www.oldhampl.org', eventsUrl: 'https://www.oldhampl.org/events', city: 'La Grange', state: 'KY', zipCode: '40031', county: 'La Grange County'},
  { name: 'Bullitt County Public Library', url: 'https://www.bcplibrary.org', eventsUrl: 'https://www.bcplibrary.org/events', city: 'Shepherdsville', state: 'KY', zipCode: '40165', county: 'Shepherdsville County'},
  { name: 'Jessamine County Public Library', url: 'https://www.jesspublib.org', eventsUrl: 'https://www.jesspublib.org/events', city: 'Nicholasville', state: 'KY', zipCode: '40356', county: 'Nicholasville County'},
  { name: 'Scott County Public Library', url: 'https://www.scottpublib.org', eventsUrl: 'https://www.scottpublib.org/events', city: 'Georgetown', state: 'KY', zipCode: '40324', county: 'Georgetown County'},
  { name: 'Clark County Public Library', url: 'https://www.clarkbooks.org', eventsUrl: 'https://www.clarkbooks.org/events', city: 'Winchester', state: 'KY', zipCode: '40391', county: 'Winchester County'},
  { name: 'Hopkins County-Madisonville Public Library', url: 'https://www.hcmpl.org', eventsUrl: 'https://www.hcmpl.org/events', city: 'Madisonville', state: 'KY', zipCode: '42431', county: 'Madisonville County'},
  { name: 'Laurel County Public Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'London', state: 'KY', zipCode: '40741', county: 'London County'},
  { name: 'Pulaski County Public Library', url: 'https://www.pulaskilibrary.org', eventsUrl: 'https://www.pulaskilibrary.org/events', city: 'Somerset', state: 'KY', zipCode: '42501', county: 'Somerset County'},
  { name: 'Christian County Public Library', url: 'https://www.christiancountylibrary.org', eventsUrl: 'https://www.christiancountylibrary.org/events', city: 'Hopkinsville', state: 'KY', zipCode: '42240' },
  { name: 'Pike County Public Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pikeville', state: 'KY', zipCode: '41501', county: 'Pikeville County'},
  { name: 'Boyd County Public Library', url: 'https://www.boydpublib.org', eventsUrl: 'https://www.boydpublib.org/events', city: 'Ashland', state: 'KY', zipCode: '41101', county: 'Ashland County'},
  { name: 'Greenup County Public Library', url: 'https://www.greenuplibrary.org', eventsUrl: 'https://www.greenuplibrary.org/events', city: 'Greenup', state: 'KY', zipCode: '41144', county: 'Greenup County'},
  { name: 'Franklin County Public Library', url: 'https://www.frankfortlibrary.org', eventsUrl: 'https://www.frankfortlibrary.org/events', city: 'Frankfort', state: 'KY', zipCode: '40601', county: 'Frankfort County'},
  { name: 'Shelby County Public Library', url: 'https://www.shelbypl.org', eventsUrl: 'https://www.shelbypl.org/events', city: 'Shelbyville', state: 'KY', zipCode: '40065', county: 'Shelbyville County'},
  { name: 'Nelson County Public Library', url: 'https://www.nelsoncountylibrary.org', eventsUrl: 'https://www.nelsoncountylibrary.org/events', city: 'Bardstown', state: 'KY', zipCode: '40004' },
  { name: 'Henderson County Public Library', url: 'https://www.hcpl.org', eventsUrl: 'https://www.hcpl.org/events', city: 'Henderson', state: 'KY', zipCode: '42420', county: 'Henderson County'},
  { name: 'Graves County Public Library', url: 'https://www.graveslibrary.org', eventsUrl: 'https://www.graveslibrary.org/events', city: 'Mayfield', state: 'KY', zipCode: '42066', county: 'Mayfield County'},
  { name: 'Calloway County Public Library', url: 'https://www.callowaycountylibrary.org', eventsUrl: 'https://www.callowaycountylibrary.org/events', city: 'Murray', state: 'KY', zipCode: '42071' },
  { name: 'Muhlenberg County Public Libraries', url: 'https://www.muhlenberg.lib.ky.us', eventsUrl: 'https://www.muhlenberg.lib.ky.us/events', city: 'Greenville', state: 'KY', zipCode: '42345', county: 'Greenville County'},
  { name: 'Woodford County Library', url: 'https://www.woodfordlibrary.org', eventsUrl: 'https://www.woodfordlibrary.org/events', city: 'Versailles', state: 'KY', zipCode: '40383', county: 'Versailles County'},
  { name: 'Rowan County Public Library', url: 'https://www.rowancountylibrary.org', eventsUrl: 'https://www.rowancountylibrary.org/events', city: 'Morehead', state: 'KY', zipCode: '40351' },
  { name: 'Montgomery County Public Library', url: 'https://www.mcplib.org', eventsUrl: 'https://www.mcplib.org/events', city: 'Mount Sterling', state: 'KY', zipCode: '40353', county: 'Mount Sterling County'},
  { name: 'Grant County Public Library', url: 'https://www.grantlibrary.org', eventsUrl: 'https://www.grantlibrary.org/events', city: 'Williamstown', state: 'KY', zipCode: '41097', county: 'Williamstown County'},
  { name: 'Lincoln County Public Library', url: 'https://www.lincolncolibrary.org', eventsUrl: 'https://www.lincolncolibrary.org/events', city: 'Stanford', state: 'KY', zipCode: '40484', county: 'Stanford County'},
  { name: 'Marshall County Public Library', url: 'https://www.marshallcountylibrary.org', eventsUrl: 'https://www.marshallcountylibrary.org/events', city: 'Benton', state: 'KY', zipCode: '42025' },
  { name: 'Meade County Public Library', url: 'https://www.meadecountypl.org', eventsUrl: 'https://www.meadecountypl.org/events', city: 'Brandenburg', state: 'KY', zipCode: '40108' },
  { name: 'Taylor County Public Library', url: 'https://www.taylorcountylibrary.org', eventsUrl: 'https://www.taylorcountylibrary.org/events', city: 'Campbellsville', state: 'KY', zipCode: '42718' },
  { name: 'Whitley County Public Library', url: 'https://www.whitleylibrary.org', eventsUrl: 'https://www.whitleylibrary.org/events', city: 'Williamsburg', state: 'KY', zipCode: '40769', county: 'Williamsburg County'},
  { name: 'Floyd County Public Library', url: 'https://www.floydlibrary.org', eventsUrl: 'https://www.floydlibrary.org/events', city: 'Prestonsburg', state: 'KY', zipCode: '41653', county: 'Prestonsburg County'},
  { name: 'Johnson County Public Library', url: 'https://www.johnson.lib.ky.us', eventsUrl: 'https://www.johnson.lib.ky.us/events', city: 'Paintsville', state: 'KY', zipCode: '41240', county: 'Paintsville County'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlibrary.org', eventsUrl: 'https://www.knoxlibrary.org/events', city: 'Barbourville', state: 'KY', zipCode: '40906', county: 'Barbourville County'},
  { name: 'Bell County Public Library', url: 'https://www.bellcountylibrary.org', eventsUrl: 'https://www.bellcountylibrary.org/events', city: 'Middlesboro', state: 'KY', zipCode: '40965' }
];

const SCRAPER_NAME = 'wordpress-KY';

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
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          'article',
          '.post'
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
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('time')
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');

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
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {}
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
            state: 'KY',
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

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'KY',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
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
async function scrapeWordpressKYCloudFunction() {
  console.log('☁️ Running WordPress KY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-KY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-KY', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressKYCloudFunction };
