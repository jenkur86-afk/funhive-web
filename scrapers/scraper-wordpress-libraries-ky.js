// 12 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');
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
  { name: 'Louisville Free Public Library', url: 'https://www.lfpl.org', eventsUrl: 'https://www.lfpl.org/events', city: 'Louisville', state: 'KY', zipCode: '40203', county: 'Jefferson'},
  { name: 'Lexington Public Library', url: 'https://www.lexpublib.org', eventsUrl: 'https://www.lexpublib.org/events', city: 'Lexington', state: 'KY', zipCode: '40507', county: 'Fayette'},
  { name: 'Kenton County Public Library', url: 'https://www.kentonlibrary.org', eventsUrl: 'https://www.kentonlibrary.org/events', city: 'Covington', state: 'KY', zipCode: '41011', county: 'Kenton'},
  { name: 'Campbell County Public Library', url: 'https://www.cc-pl.org', eventsUrl: 'https://www.cc-pl.org/events', city: 'Cold Spring', state: 'KY', zipCode: '41076', county: 'Campbell'},
  // Regional Libraries
  { name: 'Boone County Public Library', url: 'https://www.bcpl.org', eventsUrl: 'https://www.bcpl.org/events', city: 'Burlington', state: 'KY', zipCode: '41005', county: 'Boone'},
  { name: 'Warren County Public Library', url: 'https://www.warrenpl.org', eventsUrl: 'https://www.warrenpl.org/events', city: 'Bowling Green', state: 'KY', zipCode: '42101', county: 'Warren'},
  { name: 'Daviess County Public Library', url: 'https://www.dcplibrary.org', eventsUrl: 'https://www.dcplibrary.org/events', city: 'Owensboro', state: 'KY', zipCode: '42301', county: 'Daviess'},
  { name: 'McCracken County Public Library', url: 'https://www.mclib.net', eventsUrl: 'https://www.mclib.net/events', city: 'Paducah', state: 'KY', zipCode: '42001', county: 'McCracken'},
  { name: 'Hardin County Public Library', url: 'https://www.hcpl.info', eventsUrl: 'https://www.hcpl.info/events', city: 'Elizabethtown', state: 'KY', zipCode: '42701', county: 'Hardin'},
  { name: 'Madison County Public Library', url: 'https://www.madisoncountylibrary.org', eventsUrl: 'https://www.madisoncountylibrary.org/events', city: 'Richmond', state: 'KY', zipCode: '40475' },
  { name: 'Oldham County Public Library', url: 'https://www.oldhampl.org', eventsUrl: 'https://www.oldhampl.org/events', city: 'La Grange', state: 'KY', zipCode: '40031', county: 'Oldham'},
  { name: 'Bullitt County Public Library', url: 'https://bcplibrary.org/', eventsUrl: 'https://bcplibrary.org/', city: 'Shepherdsville', state: 'KY', zipCode: '40165', county: 'Bullitt'},
  { name: 'Jessamine County Public Library', url: 'https://www.jesspublib.org', eventsUrl: 'https://www.jesspublib.org/events', city: 'Nicholasville', state: 'KY', zipCode: '40356', county: 'Jessamine'},
  { name: 'Scott County Public Library', url: 'https://scottpublib.org/', eventsUrl: 'https://scottpublib.org/', city: 'Georgetown', state: 'KY', zipCode: '40324', county: 'Scott'},
  { name: 'Clark County Public Library', url: 'https://www.clarkbooks.org', eventsUrl: 'https://www.clarkbooks.org/events', city: 'Winchester', state: 'KY', zipCode: '40391', county: 'Clark'},
  { name: 'Laurel County Public Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'London', state: 'KY', zipCode: '40741', county: 'Laurel'},
  { name: 'Christian County Public Library', url: 'https://www.christiancountylibrary.org', eventsUrl: 'https://www.christiancountylibrary.org/events', city: 'Hopkinsville', state: 'KY', zipCode: '42240' },
  { name: 'Pike County Public Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pikeville', state: 'KY', zipCode: '41501', county: 'Pike'},
  { name: 'Greenup County Public Library', url: 'https://www.greenuplibrary.org', eventsUrl: 'https://www.greenuplibrary.org/events', city: 'Greenup', state: 'KY', zipCode: '41144', county: 'Greenup County'},
  { name: 'Henderson County Public Library', url: 'https://www.hcpl.org', eventsUrl: 'https://www.hcpl.org/events', city: 'Henderson', state: 'KY', zipCode: '42420', county: 'Henderson County'},
  { name: 'Graves County Public Library', url: 'https://www.graveslibrary.org', eventsUrl: 'https://www.graveslibrary.org/events', city: 'Mayfield', state: 'KY', zipCode: '42066', county: 'Graves'},
  { name: 'Calloway County Public Library', url: 'https://www.callowaycountylibrary.org', eventsUrl: 'https://www.callowaycountylibrary.org/events', city: 'Murray', state: 'KY', zipCode: '42071' },
  { name: 'Woodford County Library', url: 'https://www.woodfordlibrary.org', eventsUrl: 'https://www.woodfordlibrary.org/events', city: 'Versailles', state: 'KY', zipCode: '40383', county: 'Woodford'},
  { name: 'Rowan County Public Library', url: 'https://www.rowancountylibrary.org', eventsUrl: 'https://www.rowancountylibrary.org/events', city: 'Morehead', state: 'KY', zipCode: '40351' },
  { name: 'Montgomery County Public Library', url: 'https://www.mcplib.org', eventsUrl: 'https://www.mcplib.org/events', city: 'Mount Sterling', state: 'KY', zipCode: '40353', county: 'Montgomery'},
  { name: 'Grant County Public Library', url: 'https://www.grantlibrary.net/', eventsUrl: 'https://www.grantlibrary.net/', city: 'Williamstown', state: 'KY', zipCode: '41097', county: 'Grant'},
  { name: 'Whitley County Public Library', url: 'https://www.whitleylibrary.org', eventsUrl: 'https://www.whitleylibrary.org/events', city: 'Williamsburg', state: 'KY', zipCode: '40769', county: 'Whitley'},
  { name: 'Floyd County Public Library', url: 'https://floydlibrary.org/', eventsUrl: 'https://floydlibrary.org/indiana-history-room/events/', city: 'Prestonsburg', state: 'KY', zipCode: '41653', county: 'Floyd'},
  // Additional libraries from spreadsheet coverage expansion
  // URL corrected 2026-08-11 (was auburnlibrary.org): Real name Logan County Public Library Auburn Branch; site lists 106 Spring St, Auburn KY 42206, phone 270-542-8180
  { name: 'Auburn Branch', url: 'https://loganlibrary.org', eventsUrl: 'https://loganlibrary.org/calendar/', city: 'Auburn', state: 'KY', zipCode: '00000', county: 'Logan'},
  { name: 'Trimble County Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'KY', zipCode: '40006', county: 'Trimble'},
  { name: 'Nicholas County Public Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'KY', zipCode: '40311', county: 'Carlisle County'},
  { name: 'Hickman County Memorial Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'KY', zipCode: '42031', county: 'Clinton County'},
  { name: 'Adair County Public Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'KY', zipCode: '42728', county: 'Adair'},
  { name: 'South Branch', url: 'https://corbinlibrary.org/', eventsUrl: 'https://corbinlibrary.org/', city: 'Corbin', state: 'KY', zipCode: '00000', county: 'Whitley'},
  { name: 'Oldham County Public Library', url: 'https://www.crestwoodlibrary.org/', eventsUrl: 'https://www.crestwoodlibrary.org/news-events/lib-cal/calendar', city: 'Crestwood', state: 'KY', zipCode: '40014', county: 'Oldham'},
  // URL corrected 2026-08-11 (was cumberlandlibrary.org): Harlan County Public Libraries site lists Rebecca Caudill branch, 310 West Main Street, Cumberland KY 40823, phone 606-589-2409. No calendar
  { name: 'Rebecca Caudill Public Library', url: 'https://harlancountylibraries.org', eventsUrl: 'https://harlancountylibraries.org', city: 'Cumberland', state: 'KY', zipCode: '00000', county: 'Cumberland County'},
  { name: 'Cynthiana-Harrison County Public Library', url: 'https://www.cynthianalibrary.org/', eventsUrl: 'https://www.cynthianalibrary.org/calendar', city: 'Cynthiana', state: 'KY', zipCode: '41031', county: 'Harrison'},
  { name: 'Florence Branch', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'KY', zipCode: '00000', county: 'Boone'},
  { name: 'Goodnight Memorial Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'KY', zipCode: '42134', county: 'Franklin County'},
  { name: 'Fulton Public Library', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'KY', zipCode: '42041', county: 'Fulton County'},
  // URL corrected 2026-08-11 (was glasgowlibrary.org): Site header reads Barren County Public Library - Mary Wood Weldon Memorial Library, 1530 S Green St, Glasgow KY 42141, phone 270-651-2824
  { name: 'Mary Wood Weldon Memorial Public Library', url: 'https://weldonpubliclibrary.org', eventsUrl: 'https://weldonpubliclibrary.org/index.php/events/', city: 'Glasgow', state: 'KY', zipCode: '42141', county: 'Barren'},
  { name: 'Mahan-Oldham County Library', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'KY', zipCode: '00000', county: 'Oldham'},
  { name: 'Green County Public Library', url: 'https://www.greensburglibrary.org', eventsUrl: 'https://www.greensburglibrary.org/events', city: 'Greensburg', state: 'KY', zipCode: '42743', county: 'Green'},
  { name: 'Harlan County Public Library', url: 'https://www.harlanlibrary.org', eventsUrl: 'https://www.harlanlibrary.org/events', city: 'Harlan', state: 'KY', zipCode: '40831', county: 'Harlan County'},
  { name: 'Ohio County Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'KY', zipCode: '42347', county: 'Ohio'},
  { name: 'Perry County Public Library', url: 'https://www.hazardlibrary.org/', eventsUrl: 'https://www.hazardlibrary.org/', city: 'Hazard', state: 'KY', zipCode: '41701', county: 'Perry'},
  { name: 'Lents Branch', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'KY', zipCode: '00000', county: 'Boone'},
  { name: 'Estill County Public Library', url: 'https://www.irvinelibrary.org', eventsUrl: 'https://www.irvinelibrary.org/events', city: 'Irvine', state: 'KY', zipCode: '40336', county: 'Estill'},
  // URL corrected 2026-08-11 (was irvingtonlibrary.org): Breckinridge County Public Library Irvington Branch, 1109 US-60 Irvington KY 40146, phone 270-547-7404
  { name: 'Irvington Branch', url: 'https://bcplibrary.org/irvington-branch', eventsUrl: 'https://bcplibrary.org/program-calendars-1', city: 'Irvington', state: 'KY', zipCode: '00000', county: 'Breckinridge'},
  { name: 'Marion County Public Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'KY', zipCode: '40033', county: 'Marion'},
  // URL corrected 2026-08-11 (was libertylibrary.org): 238 Middleburg St Liberty KY 42539, phone 606-787-9381. libertylibrary.org is a Conroe TX charity, not this library
  { name: 'Casey County Public Library', url: 'https://www.caseylibrary.org', eventsUrl: 'https://www.caseylibrary.org/calendar/', city: 'Liberty', state: 'KY', zipCode: '42539', county: 'Casey'},
  { name: 'Crittenden County Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'KY', zipCode: '42064', county: 'Marion County'},
  { name: 'Mason County Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'KY', zipCode: '41056', county: 'Mason'},
  { name: 'Wayne County Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'KY', zipCode: '42633', county: 'Wayne'},
  // URL corrected 2026-08-11 (was scottsvillelibrary.org): Site says located in Scottsville Kentucky, phone 270-237-3861 (KY area code). scottsvillelibrary.org is Scottsville Free Library in Scottsvi
  { name: 'Allen County Public Library', url: 'https://www.allencountylibrary.com', eventsUrl: 'https://www.allencountylibrary.com/calendar/', city: 'Scottsville', state: 'KY', zipCode: '42164', county: 'Allen'},
  { name: 'Washington County Public Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'KY', zipCode: '40069', county: 'Washington'},
  { name: 'Gallatin County Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'KY', zipCode: '41095', county: 'Gallatin'},

];

const SCRAPER_NAME = 'wordpress-KY';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Structured schema.org data beats any DOM guess, so try it before scraping markup.
      // Found 2026-08-09: 20 of the family's open MISMATCH bugs sit on pages that already
      // publish <script type="application/ld+json"> Event objects — 59 on Brownell, 107 on
      // Brandywine Zoo — which the generic selectors below miss entirely. startDate is a
      // real ISO timestamp, so this also avoids the time-only values behind this family's
      // InvalidDate counts, and location.address geocodes to the venue not a centroid.
      const jsonLdEvents = extractJsonLdEvents(await page.content(), library.name);
      if (jsonLdEvents.length > 0) {
        jsonLdEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'jsonld',
            state: event.state || library.state || 'KY',
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

            const libraryEvents = await page.evaluate((libName, __resolverSrc) => {
        // Rehydrate the shared resolver — page.evaluate cannot close over Node scope.
        const resolveEventDate = new Function('return ' + __resolverSrc)();
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
                  date: resolveEventDate(card),
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
      }, library.name, RESOLVER_SRC);

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
    } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
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
async function scrapeWordpressKYCloudFunction() {
  console.log('☁️ Running WordPress KY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-KY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-KY', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressKYCloudFunction };
