// 5 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * South Carolina Public Libraries Scraper - Coverage: All South Carolina public libraries
 */
const LIBRARIES = [
  // URL corrected 2026-08-11 (was abbevillelibrary.org): Site lists Abbeville Main Branch, 1407 N. Main St, Abbeville SC 29620, phone 864-459-4009, plus Calhoun Falls and Donalds branches
  { name: 'Abbeville County Library System', url: 'https://abbevillecounty.org', eventsUrl: 'https://abbevillecounty.org/calendar/', city: 'Abbeville', state: 'SC', zipCode: '29620', county: 'Abbeville County'},
  { name: 'Anderson County Library', url: 'https://www.andersonlibrary.org', eventsUrl: 'https://www.andersonlibrary.org/events', city: 'Anderson', state: 'SC', zipCode: '29621', county: 'Anderson County'},
  { name: 'Kershaw County Library - Camden Branch Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'SC', zipCode: '29020', county: 'Kershaw', urlCollision: 'camdenlibrary.org is MI, not SC' },
  { name: 'Pickens County Library - Central-Clemson Branch Library', url: 'https://www.centrallibrary.org', eventsUrl: 'https://www.centrallibrary.org/events', city: 'Central', state: 'SC', zipCode: '29630', county: 'Pickens'},
  { name: 'Lexington County Library - Chapin', url: 'https://www.chapinlibrary.org', eventsUrl: 'https://www.chapinlibrary.org/events', city: 'Chapin', state: 'SC', zipCode: '29036', county: 'Lexington'},
  { name: 'Chester County Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'SC', zipCode: '29706', county: 'Chester County', urlCollision: 'chesterlibrary.org is NY, not SC' },
  // URL corrected 2026-08-11 (was chesterfieldlibrary.org): Own site; 119 Main St Chesterfield SC 29709, phone 843-623-7489, five-branch county system
  { name: 'Chesterfield County Library System', url: 'https://www.cclssc.org', eventsUrl: 'https://www.cclssc.org/calendar', city: 'Chesterfield', state: 'SC', zipCode: '29709', county: 'Chesterfield County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'SC', zipCode: '29325', county: 'Laurens', urlCollision: 'clintonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Lexington County Library - Irmo', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'SC', zipCode: '29212', county: 'Richland', urlCollision: 'columbialibrary.org is IL, not SC' },
  { name: 'Dillon County Library System', url: 'https://www.dillonlibrary.org/', eventsUrl: 'https://www.dillonlibrary.org/', city: 'Dillon', state: 'SC', zipCode: '29536', county: 'Dillon County'},
  { name: 'Kershaw County Library - Elgin Branch Library', url: 'https://www.elginlibrary.org/', eventsUrl: 'https://www.elginlibrary.org/', city: 'Elgin', state: 'SC', zipCode: '29045', county: 'Lancaster'},
  { name: 'Hampton County Library - Estill Branch Library', url: 'https://www.estilllibrary.org', eventsUrl: 'https://www.estilllibrary.org/events', city: 'Estill', state: 'SC', zipCode: '29918', county: 'Hampton', urlCollision: 'estilllibrary.org is KY, not SC' },
  { name: 'Florence County Library System', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'SC', zipCode: '29506', county: 'Florence County'},
  { name: 'Lexington County Library - Gilbert-Summit', url: 'https://www.gilbertlibrary.org/', eventsUrl: 'https://www.gilbertlibrary.org/', city: 'Gilbert', state: 'SC', zipCode: '29054', county: 'Lexington', urlCollision: 'gilbertlibrary.org is CT, not SC' },
  { name: 'Great Falls Library', url: 'https://www.greatfallslibrary.org', eventsUrl: 'https://www.greatfallslibrary.org/events', city: 'Great Falls', state: 'SC', zipCode: '29055', county: 'Chester'},
  { name: 'Greenville County Library - Anderson Road (West) Branch', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'SC', zipCode: '29611', county: 'Greenville County'},
  { name: 'Edgefield County Public Library - Johnston Branch (Mobley Library)', url: 'https://www.johnstonlibrary.org', eventsUrl: 'https://www.johnstonlibrary.org/events', city: 'Johnston', state: 'SC', zipCode: '29832', county: 'Edgefield'},
  { name: 'Lake View Library', url: 'https://lakeviewlibrary.org/', eventsUrl: 'https://lakeviewlibrary.org/', city: 'Lake View', state: 'SC', zipCode: '29563', county: 'Dillon'},
  { name: 'Lamar District Library', url: 'https://www.lamarlibrary.org', eventsUrl: 'https://www.lamarlibrary.org/events', city: 'Lamar', state: 'SC', zipCode: '29069', county: 'Darlington', urlCollision: 'lamarlibrary.org is GA, not SC' },
  { name: 'Aiken County Library - Midland Valley Branch Library', url: 'https://www.langleylibrary.org', eventsUrl: 'https://www.langleylibrary.org/events', city: 'Langley', state: 'SC', zipCode: '29834', county: 'Aiken'},
  { name: 'Lexington County Public Library System - Main', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'SC', zipCode: '29072', county: 'Lexington County', urlCollision: 'lexingtonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // URL corrected 2026-08-11 (was libertylibrary.org): Sarlin Library 15 S Palmetto St Liberty SC 29657, 864-843-5805, listed on Pickens County Library System contact page
  { name: 'Pickens County Library - Sarlin Branch Library', url: 'https://pickenscountylibrarysystem.com', eventsUrl: 'https://pickenscountylibrarysystem.libnet.info/events', city: 'Liberty', state: 'SC', zipCode: '29657', county: 'Pickens'},
  { name: 'Horry County Memorial Library - Loris Library', url: 'https://www.lorislibrary.org/', eventsUrl: 'https://www.lorislibrary.org/', city: 'Loris', state: 'SC', zipCode: '29569', county: 'Horry'},
  { name: 'Marion County Library System', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'SC', zipCode: '29571', county: 'Marion County', urlCollision: 'marionlibrary.org is OH, not SC' },
  { name: 'Mccormick County Library System', url: 'https://mccormicklibrary.org/', eventsUrl: 'https://mccormicklibrary.org/', city: 'Mccormick', state: 'SC', zipCode: '29835', county: 'Mccormick County'},
  { name: 'Hal Kohn Memorial Library', url: 'https://www.newberrylibrary.org', eventsUrl: 'https://www.newberrylibrary.org/events', city: 'Newberry', state: 'SC', zipCode: '29108', county: 'Newberry County'},
  { name: 'Orangeburg County Library Commission', url: 'https://orangeburglibrary.org/', eventsUrl: 'https://orangeburglibrary.org/', city: 'Orangeburg', state: 'SC', zipCode: '29115', county: 'Orangeburg County', urlCollision: 'orangeburglibrary.org is NY, not SC' },
  { name: 'Anderson County Library - Piedmont Branch Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'SC', zipCode: '29673', county: 'Anderson', urlCollision: 'piedmontlibrary.org is OK, not SC' },
  { name: 'Oconee County Public Library - Salem Branch Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'SC', zipCode: '29676', county: 'Oconee', urlCollision: 'salemlibrary.org is OR, not SC' },
  { name: 'Saluda County Library System', url: 'https://www.saludalibrary.org', eventsUrl: 'https://www.saludalibrary.org/events', city: 'Saluda', state: 'SC', zipCode: '29138', county: 'Saluda County'},
  { name: 'Oconee County Public Library - Seneca Branch Library', url: 'https://www.senecalibrary.org', eventsUrl: 'https://www.senecalibrary.org/events', city: 'Seneca', state: 'SC', zipCode: '29678', county: 'Oconee'},
  { name: 'Spartanburg County Public Library - H. Carlisle Bean Law Library', url: 'https://www.spartanburglibrary.org', eventsUrl: 'https://www.spartanburglibrary.org/events', city: 'Spartanburg', state: 'SC', zipCode: '29306', county: 'Spartanburg County'},
  { name: 'Orangeburg County Library - Springfield Branch Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'SC', zipCode: '29146', county: 'Orangeburg', urlCollision: 'springfieldlibrary.org is MA, not SC' },
  // Berkeley County Library - Sangaree RELOCATED 2026-08-18 to GoogleCalendar-SC.
  // Same cross-origin Google Calendar iframe pattern as Ashby (MA).
  // ICS feed verified at 40 events.
  // URL corrected 2026-08-11 (was swansealibrary.org): Lexington County Library locations page lists Swansea branch, 199 N. Lawrence Avenue, Swansea SC 29160, phone 803-785-3519. swansealibrary.o
  { name: 'Lexington County Library - Swansea', url: 'https://lexcolibrary.com', eventsUrl: 'https://lexcolibrary.libcal.com', city: 'Swansea', state: 'SC', zipCode: '29160', county: 'Lexington'},
  { name: 'Union County Library System', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'SC', zipCode: '29379', county: 'Union County'},
  { name: 'Oconee County Public Library - Westminster Branch Library', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'SC', zipCode: '29693', county: 'Oconee', urlCollision: 'westminsterlibrary.org is CO, not SC' },
  { name: 'York Public Library', url: 'https://yorklibrary.org/', eventsUrl: 'https://yorklibrary.org/', city: 'York', state: 'SC', zipCode: '29745', county: 'York County', urlCollision: 'yorklibrary.org is NE, not SC' }
];

const SCRAPER_NAME = 'wordpress-SC';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
      // An entry carrying urlCollision points at a DIFFERENT institution than its own
      // name and state claim — the guessed {city}library.org host actually belongs to
      // another state's library. Scraping it imported that library's events under this
      // state. See scripts/disable-collided-urls.js for the per-host evidence.
      // The 📍 header above and the "Found 0 events" line below are BOTH required: the
      // library-site audit pairs them, and dropping the pair would delete this library
      // from the audit instead of showing it as a known, explained gap.
      if (library.urlCollision) {
        console.log(`   ⏭️  skipped — urlCollision: ${library.urlCollision}`);
        console.log(`   Found 0 events`);
        continue;
      }
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
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
            state: event.state || library.state || 'SC',
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
                  date: resolveEventDate(card),
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
      }, library.name, RESOLVER_SRC);

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
    } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressSCCloudFunction };
