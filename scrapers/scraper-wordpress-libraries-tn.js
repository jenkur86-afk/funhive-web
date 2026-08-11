// 13 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { tryFetchTecEvents, tryDomScrapeTecEvents } = require('./helpers/tec-rest-helper');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');
const ngeohash = require('ngeohash');
/**
 * Tennessee Public Libraries Scraper
 * State: TN
 * Coverage: All Tennessee Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Nashville Public Library', url: 'https://library.nashville.org', eventsUrl: 'https://library.nashville.org/events', city: 'Nashville', state: 'TN', zipCode: '37203', county: 'Davidson'},
  { name: 'Memphis Public Libraries', url: 'https://www.memphislibrary.org', eventsUrl: 'https://www.memphislibrary.org/events', city: 'Memphis', state: 'TN', zipCode: '38103', county: 'Shelby'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlib.org', eventsUrl: 'https://www.knoxlib.org/events', city: 'Knoxville', state: 'TN', zipCode: '37902', county: 'Knox'},
  { name: 'Chattanooga Public Library', url: 'https://chattlibrary.org', eventsUrl: 'https://chattlibrary.org/events', city: 'Chattanooga', state: 'TN', zipCode: '37402', county: 'Hamilton'},
  // Regional Libraries
  { name: 'Clarksville-Montgomery County Public Library', url: 'https://mcgtn.org/library', eventsUrl: 'https://mcgtn.org/library/events', city: 'Clarksville', state: 'TN', zipCode: '37040', county: 'Montgomery'},
  { name: 'Johnson City Public Library', url: 'https://www.jcpl.org', eventsUrl: 'https://www.jcpl.org/events', city: 'Johnson City', state: 'TN', zipCode: '37601', county: 'Washington'},
  { name: 'Kingsport Public Library', url: 'https://www.kingsportlibrary.org/', eventsUrl: 'https://www.kingsportlibrary.org/', city: 'Kingsport', state: 'TN', zipCode: '37660', county: 'Sullivan'},
  // Williamson County Public Library MOVED to CivicEngage-Libraries 2026-08-11.
  // wcpltn.org is CivicPlus (.aspx), not WordPress, so this family could never
  // extract it — it returned 0 on every run. Verified live there before removal;
  // this is a move, not a dropped library.
  { name: 'Rutherford County Library System', url: 'https://www.rcls.org', eventsUrl: 'https://www.rcls.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Rutherford'},
  { name: 'Blount County Public Library', url: 'https://www.blountlibrary.org', eventsUrl: 'https://www.blountlibrary.org/events', city: 'Maryville', state: 'TN', zipCode: '37801', county: 'Blount'},
  { name: 'Cleveland-Bradley County Public Library', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'TN', zipCode: '37311', county: 'Bradley'},
  { name: 'Germantown Community Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'TN', zipCode: '38138', county: 'Shelby'},
  { name: 'Collierville Burch Library', url: 'https://www.colliervillelibrary.org', eventsUrl: 'https://www.colliervillelibrary.org/events', city: 'Collierville', state: 'TN', zipCode: '38017', county: 'Shelby'},
  { name: 'Bartlett Library', url: 'https://www.cityofbartlett.org/library', eventsUrl: 'https://www.cityofbartlett.org/calendar.aspx?CID=34', city: 'Bartlett', state: 'TN', zipCode: '38134', county: 'Shelby'},
  { name: 'Hendersonville Public Library', url: 'https://youseemore.com/', eventsUrl: 'https://youseemore.com/hendersonville/', city: 'Hendersonville', state: 'TN', zipCode: '37075', county: 'Sumner'},
  { name: 'Morristown-Hamblen Library', url: 'https://www.mhlibrary.org', eventsUrl: 'https://www.mhlibrary.org/events', city: 'Morristown', state: 'TN', zipCode: '37814', county: 'Hamblen'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'TN', zipCode: '37167', county: 'Rutherford'},
  { name: 'Sevier County Public Library System', url: 'https://www.sevierlibrary.org/', eventsUrl: 'https://www.sevierlibrary.org/', city: 'Sevierville', state: 'TN', zipCode: '37862', county: 'Sevier'},
  { name: 'Tullahoma Public Library', url: 'https://www.tullahoma-tn.com/library', eventsUrl: 'https://www.tullahoma-tn.com/library/events', city: 'Tullahoma', state: 'TN', zipCode: '37388', county: 'Coffee'},
  { name: 'Athens Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'TN', zipCode: '37303', county: 'McMinn'},
  { name: 'Crossville-Cumberland County Public Library', url: 'https://www.cumberlandcountylibrary.org', eventsUrl: 'https://www.cumberlandcountylibrary.org/events', city: 'Crossville', state: 'TN', zipCode: '38555' },
  { name: 'Rogersville Public Library', url: 'https://www.rogersvillelibrary.org', eventsUrl: 'https://www.rogersvillelibrary.org/events', city: 'Rogersville', state: 'TN', zipCode: '37857', county: 'Hawkins'},
  { name: 'Tipton County Public Library', url: 'https://www.tiptoncountylibrary.org/', eventsUrl: 'https://www.tiptoncountylibrary.org/', city: 'Covington', state: 'TN', zipCode: '38019' },
  { name: 'Savannah-Hardin County Library', url: 'https://www.hardincountylibrary.org', eventsUrl: 'https://www.hardincountylibrary.org/events', city: 'Savannah', state: 'TN', zipCode: '38372' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Crockett County Library', url: 'https://www.alamolibrary.org', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'TN', zipCode: '38001', county: 'Crockett'},
  { name: 'Alexandria Branch Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'TN', zipCode: '00000', county: 'DeKalb'},
  { name: 'Southeast Branch Library', url: 'https://www.antiochlibrary.org', eventsUrl: 'https://www.antiochlibrary.org/events', city: 'Antioch', state: 'TN', zipCode: '00000', county: 'Bedford'},
  { name: 'Sam T. Wilson Public Library', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'TN', zipCode: '38002', county: 'Shelby'},
  { name: 'Auburntown Public Library', url: 'https://adamsmemoriallibrary.org/', eventsUrl: 'https://adamsmemoriallibrary.org/', city: 'Auburntown', state: 'TN', zipCode: '00000', county: 'Cannon'},
  { name: 'Baxter Branch Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Baxter', state: 'TN', zipCode: '00000', county: 'Putnam'},
  { name: 'The Brentwood Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'TN', zipCode: '37027', county: 'Williamson'},
  { name: 'Benton County Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'TN', zipCode: '38320', county: 'Benton'},
  { name: 'Hickman County Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'TN', zipCode: '37033', county: 'Hickman'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'TN', zipCode: '37716', county: 'Anderson'},
  { name: 'Cordova Branch Library', url: 'https://cordovalibrary.org/', eventsUrl: 'https://cordovalibrary.org/', city: 'Cordova', state: 'TN', zipCode: '00000', county: 'Shelby'},
  { name: 'Meigs-Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'TN', zipCode: '37322', county: 'Decatur County'},
  { name: 'Stewart County Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'TN', zipCode: '37058', county: 'Stewart'},
  { name: 'Sequatchie County Public Library', url: 'https://www.dunlaplibrary.org', eventsUrl: 'https://www.dunlaplibrary.org/events', city: 'Dunlap', state: 'TN', zipCode: '37327', county: 'Sequatchie'},
  { name: 'Gleason Memorial Library', url: 'https://www.gleasonlibrary.org', eventsUrl: 'https://www.gleasonlibrary.org/events', city: 'Gleason', state: 'TN', zipCode: '38229', county: 'Weakley'},
  { name: 'Harriman Public Library', url: 'https://www.harrimanlibrary.org/', eventsUrl: 'https://www.harrimanlibrary.org/', city: 'Harriman', state: 'TN', zipCode: '37748', county: 'Roane'},
  { name: 'Carroll County Library', url: 'https://www.huntingdonlibrary.org', eventsUrl: 'https://www.huntingdonlibrary.org/events', city: 'Huntingdon', state: 'TN', zipCode: '38344', county: 'Carroll'},
  { name: 'Kingston Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'TN', zipCode: '37763', county: 'Roane'},
  { name: 'Macon County Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'TN', zipCode: '37083', county: 'Macon'},
  { name: 'Millard Oakley Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'TN', zipCode: '38570', county: 'Overton'},
  { name: 'Nashville Talking Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'TN', zipCode: '00000', county: 'Madison County'},
  { name: 'Madisonville Public Library', url: 'https://www.madisonvillelibrary.org', eventsUrl: 'https://www.madisonvillelibrary.org/events', city: 'Madisonville', state: 'TN', zipCode: '37354', county: 'Monroe'},
  { name: 'Middleton Community Library', url: 'https://www.middletonlibrary.org/', eventsUrl: 'https://www.middletonlibrary.org/calendar', city: 'Middleton', state: 'TN', zipCode: '38052', county: 'Hardeman'},
  { name: 'Mildred G. Fields Memorial Library', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'TN', zipCode: '38358', county: 'Gibson'},
  { name: 'Monterey Branch Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'TN', zipCode: '00000', county: 'Putnam'},
  { name: 'Mt. Juliet-Harvey Freeman Public Library', url: 'https://www.mtjulietlibrary.org', eventsUrl: 'https://www.mtjulietlibrary.org/events', city: 'Mt. Juliet', state: 'TN', zipCode: '37122', county: 'Wilson'},
  { name: 'Newbern City Library', url: 'https://www.newbernlibrary.org', eventsUrl: 'https://www.newbernlibrary.org/events', city: 'Newbern', state: 'TN', zipCode: '38059', county: 'Dyer'},
  { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'TN', zipCode: '37365', county: 'Grundy'},
  { name: 'Parsons Public Library', url: 'https://www.parsonslibrary.org/', eventsUrl: 'https://www.parsonslibrary.org/', city: 'Parsons', state: 'TN', zipCode: '38363', county: 'Decatur'},
  { name: 'Lauderdale County Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'TN', zipCode: '38063', county: 'Lauderdale'},
  { name: 'White County Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'TN', zipCode: '38583', county: 'White'},
  { name: 'Audrey Pack Memorial Library', url: 'https://springcitylibrary.org/', eventsUrl: 'https://springcitylibrary.org/', city: 'Spring City', state: 'TN', zipCode: '37381', county: 'Rhea'},
  { name: 'Spring Hill Public Library', url: 'https://www.springhilllibrary.org', eventsUrl: 'https://www.springhilllibrary.org/events', city: 'Spring Hill', state: 'TN', zipCode: '37174', county: 'Maury'},
  { name: 'Sweetwater Public Library', url: 'https://www.sweetwaterlibrary.org/', eventsUrl: 'https://www.sweetwaterlibrary.org/', city: 'Sweetwater', state: 'TN', zipCode: '37874', county: 'Monroe'},
  { name: 'Mary E. Tippitt Memorial Library', url: 'https://www.townsendlibrary.org', eventsUrl: 'https://www.townsendlibrary.org/events', city: 'Townsend', state: 'TN', zipCode: '37882', county: 'Blount'},
  { name: 'Hamilton Parks Public Library', url: 'https://www.trimblelibrary.org', eventsUrl: 'https://www.trimblelibrary.org/events', city: 'Trimble', state: 'TN', zipCode: '38259', county: 'Dyer'},
  { name: 'Washburn Public Library', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'TN', zipCode: '37888', county: 'Grainger'},
  { name: 'Humphreys County Public Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'TN', zipCode: '37185', county: 'Humphreys'},
  { name: 'Westmoreland Public Library', url: 'https://www.westmorelandpubliclibrary.com/', eventsUrl: 'https://www.westmorelandpubliclibrary.com/', city: 'Westmoreland', state: 'TN', zipCode: '37186', county: 'Sumner'},
  { name: 'White Pine Public Library', url: 'https://whitepinelibrary.org/', eventsUrl: 'https://whitepinelibrary.org/', city: 'White Pine', state: 'TN', zipCode: '37890', county: 'Jefferson'},
  { name: 'Franklin County Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'TN', zipCode: '37398', county: 'Franklin'},
  { name: 'Winfield Public Library', url: 'https://www.winfieldlibrary.org/', eventsUrl: 'https://www.winfieldlibrary.org/', city: 'Winfield', state: 'TN', zipCode: '37892', county: 'Scott'},
  { name: 'Adams Memorial Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'TN', zipCode: '00000', county: 'Cannon'},
  { name: 'Franklin Public Library', url: 'https://www.franklintn.gov/library', eventsUrl: 'https://www.franklintn.gov/library/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'}

];

const SCRAPER_NAME = 'wordpress-TN';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        console.log(`   ✅ TEC REST API: ${tecEvents.length} events`);
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'TN', city: library.city, zipCode: library.zipCode }}));
        continue;
      }

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // REST API can be reachable-but-403 even on a genuinely TEC-powered
      // site — tryFetchTecEvents() already returned null above in that case.
      // Try TEC's own DOM structure before falling back to fully generic
      // selectors, which can't tell a real event card from the calendar's
      // own day-heading badge on TEC's list-view markup (found 2026-08-08 on
      // WordPress-GA/New Georgia Public Library — see tec-rest-helper.js).
      const domTecEvents = await tryDomScrapeTecEvents(page, library.name);
      if (domTecEvents && domTecEvents.length > 0) {
        domTecEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'wordpress-tec-dom',
            state: 'TN',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

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
            state: event.state || library.state || 'TN',
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
                  date: resolveEventDate(card) || (possibleDates.length > 0 ? possibleDates[0].textContent.trim() : ''),
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
            state: 'TN',
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
    state: 'TN',
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
async function scrapeWordpressTNCloudFunction() {
  console.log('☁️ Running WordPress TN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-TN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-TN', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressTNCloudFunction };
