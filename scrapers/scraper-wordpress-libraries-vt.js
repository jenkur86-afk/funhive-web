// 16 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * Vermont Public Libraries Scraper - Coverage: All Vermont public libraries
 */
const LIBRARIES = [
  { name: 'Fletcher Free Library', url: 'https://fletcherfree.org/', eventsUrl: 'https://fletcherfree.org/', city: 'Burlington', state: 'VT', zipCode: '05401', county: 'Chittenden'},
  { name: 'Kellogg-Hubbard Library', url: 'https://kellogghubbard.org/', eventsUrl: 'https://kellogghubbard.org/calendar/', city: 'Montpelier', state: 'VT', zipCode: '05602', county: 'Washington'},
  { name: 'Brooks Memorial Library', url: 'https://www.brookslibraryvt.org', eventsUrl: 'https://www.brookslibraryvt.org/events', city: 'Brattleboro', state: 'VT', zipCode: '05301', county: 'Windham'},
  { name: 'St. Johnsbury Athenaeum', url: 'https://www.stjathenaeum.org', eventsUrl: 'https://www.stjathenaeum.org/events', city: 'St. Johnsbury', state: 'VT', zipCode: '05819', county: 'Caledonia'},
  { name: 'Ilsley Public Library', url: 'https://www.ilsleypubliclibrary.org', eventsUrl: 'https://www.ilsleypubliclibrary.org/events', city: 'Middlebury', state: 'VT', zipCode: '05753', county: 'Middlebury County'},
  { name: 'Norman Williams Public Library', url: 'https://www.normanwilliams.org', eventsUrl: 'https://www.normanwilliams.org/events', city: 'Woodstock', state: 'VT', zipCode: '05091', county: 'Windsor'},
  { name: 'Aldrich Public Library', url: 'https://www.aldrichpubliclibrary.org', eventsUrl: 'https://www.aldrichpubliclibrary.org/events', city: 'Barre', state: 'VT', zipCode: '05641', county: 'Washington'},
  { name: 'Brownell Library', url: 'https://www.brownelllibrary.org', eventsUrl: 'https://www.brownelllibrary.org/events', city: 'Essex Junction', state: 'VT', zipCode: '05452', county: 'Chittenden'},
  { name: 'Pierson Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Shelburne', state: 'VT', zipCode: '05482', county: 'Chittenden'},
  { name: 'Rockingham Free Public Library', url: 'https://www.rockinghamlibrary.org', eventsUrl: 'https://www.rockinghamlibrary.org/events', city: 'Bellows Falls', state: 'VT', zipCode: '05101', county: 'Windham'},
  { name: 'Springfield Town Library', url: 'https://www.springfieldtownlibrary.org/', eventsUrl: 'https://www.springfieldtownlibrary.org/calendar', city: 'Springfield', state: 'VT', zipCode: '05156', county: 'Windsor'},
  { name: 'Morristown Centennial Library', url: 'https://www.centenniallibrary.org/', eventsUrl: 'https://www.centenniallibrary.org/', city: 'Morrisville', state: 'VT', zipCode: '05661', county: 'Lamoille'},
  { name: 'Haskell Free Library', url: 'https://www.haskellopera.com/library', eventsUrl: 'https://www.haskellopera.com/library/events', city: 'Derby Line', state: 'VT', zipCode: '05830', county: 'Orleans'},
  { name: 'Cobleigh Public Library', url: 'https://www.cobleighlibrary.org', eventsUrl: 'https://www.cobleighlibrary.org/events', city: 'Lyndonville', state: 'VT', zipCode: '05851', county: 'Caledonia'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibraryvt.org/', eventsUrl: 'https://www.hartlandlibraryvt.org/calendar/', city: 'Hartland', state: 'VT', zipCode: '05048', county: 'Windsor'},
  { name: 'Deborah Rawson Memorial Library', url: 'https://www.drml.org/', eventsUrl: 'https://www.drml.org/programs/calendar/', city: 'Jericho', state: 'VT', zipCode: '05465', county: 'Chittenden'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Martha Canfield Memorial', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'VT', zipCode: '05250', county: 'Bennington'},
  { name: 'Barton Public', url: 'https://www.bartonlibrary.org', eventsUrl: 'https://www.bartonlibrary.org/events', city: 'Barton', state: 'VT', zipCode: '05822', county: 'Orleans'},
  { name: 'Mount Holly', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'VT', zipCode: '05730', county: 'Rutland'},
  { name: 'Bennington Free', url: 'https://www.benningtonlibrary.org', eventsUrl: 'https://www.benningtonlibrary.org/events', city: 'Bennington', state: 'VT', zipCode: '05201', county: 'Bennington County'},
  { name: 'Benson Public', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'VT', zipCode: '05731', county: 'Rutland'},
  { name: 'Bethel Public', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'VT', zipCode: '05032', county: 'Windsor'},
  { name: 'Bradford Public', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'VT', zipCode: '05033', county: 'Orange'},
  { name: 'Brandon Free Public', url: 'https://www.brandonlibrary.org/', eventsUrl: 'https://www.brandonlibrary.org/events-calendar', city: 'Brandon', state: 'VT', zipCode: '05733', county: 'Rutland'},
  { name: 'Cabot Public', url: 'https://www.cabotlibrary.org', eventsUrl: 'https://www.cabotlibrary.org/events', city: 'Cabot', state: 'VT', zipCode: '05647', county: 'Washington'},
  { name: 'Charlotte', url: 'https://charlottelibrary.org/', eventsUrl: 'https://charlottelibrary.org/calendar/', city: 'Charlotte', state: 'VT', zipCode: '05445', county: 'Chittenden'},
  { name: 'Chelsea Public', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'VT', zipCode: '05038', county: 'Orange'},
  { name: 'Whiting', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'VT', zipCode: '05143', county: 'Windsor'},
  { name: 'Cornwall Free Public', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'VT', zipCode: '05753', county: 'Addison'},
  { name: 'Pope Memorial', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'VT', zipCode: '05828', county: 'Caledonia'},
  { name: 'Essex Free', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'VT', zipCode: '05451', county: 'Essex County'},
  { name: 'Fair Haven Free', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fair Haven', state: 'VT', zipCode: '05743', county: 'Rutland'},
  { name: 'Fairfax Community', url: 'https://www.fairfaxlibrary.org', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'VT', zipCode: '05454', county: 'Franklin'},
  { name: 'Bent Northrup Memorial', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'VT', zipCode: '05455', county: 'Franklin'},
  { name: 'Haston', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'VT', zipCode: '05457', county: 'Franklin County'},
  { name: 'Gilman Public Library', url: 'https://gilmanlibrary.org/', eventsUrl: 'https://gilmanlibrary.org/calendar', city: 'Gilman', state: 'VT', zipCode: '05904', county: 'Essex'},
  { name: 'Glover Public', url: 'https://gloverlibrary.org/', eventsUrl: 'https://gloverlibrary.org/', city: 'Glover', state: 'VT', zipCode: '05839', county: 'Orleans'},
  { name: 'Greensboro Free', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'VT', zipCode: '05841', county: 'Orleans'},
  { name: 'Hancock Free Public', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'VT', zipCode: '05748', county: 'Addison'},
  { name: 'Hartford', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'VT', zipCode: '05047', county: 'Windsor'},
  { name: 'Huntington Public', url: 'https://www.huntingtonlibrary.org/', eventsUrl: 'https://www.huntingtonlibrary.org/', city: 'Huntington', state: 'VT', zipCode: '05462', county: 'Chittenden'},
  { name: 'Lanpher Memorial', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'VT', zipCode: '05655', county: 'Lamoille'},
  { name: 'Jaquith Public', url: 'https://marshfieldlibrary.org/', eventsUrl: 'https://marshfieldlibrary.org/', city: 'Marshfield', state: 'VT', zipCode: '05658', county: 'Washington'},
  { name: 'Russell Memorial', url: 'https://www.monktonlibrary.org', eventsUrl: 'https://www.monktonlibrary.org/events', city: 'Monkton', state: 'VT', zipCode: '05469', county: 'Monkton County'},
  { name: 'Tenney Memorial', url: 'https://www.newburylibrary.org', eventsUrl: 'https://www.newburylibrary.org/events', city: 'Newbury', state: 'VT', zipCode: '05051', county: 'Orange'},
  { name: 'Moore Free', url: 'https://www.newfanelibrary.org', eventsUrl: 'https://www.newfanelibrary.org/events', city: 'Newfane', state: 'VT', zipCode: '05345', county: 'Windham'},
  { name: 'North Hero Public', url: 'https://northherolibrary.org/', eventsUrl: 'https://northherolibrary.org/', city: 'North Hero', state: 'VT', zipCode: '05474', county: 'Grand Isle'},
  { name: 'Norwich Public', url: 'https://www.norwichlibrary.org/', eventsUrl: 'https://www.norwichlibrary.org/category/events/', city: 'Norwich', state: 'VT', zipCode: '05055', county: 'Windsor'},
  { name: 'Peacham', url: 'https://www.peachamlibrary.org/', eventsUrl: 'https://www.peachamlibrary.org/', city: 'Peacham', state: 'VT', zipCode: '05862', county: 'Caledonia'},
  { name: 'Roger Clark Memorial', url: 'https://www.pittsfieldlibrary.org/', eventsUrl: 'https://www.pittsfieldlibrary.org/', city: 'Pittsfield', state: 'VT', zipCode: '05762', county: 'Rutland'},
  { name: 'Cutler Memorial', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'VT', zipCode: '05667', county: 'Washington'},
  { name: 'Proctor Free', url: 'https://www.proctorlibrary.org', eventsUrl: 'https://www.proctorlibrary.org/events', city: 'Proctor', state: 'VT', zipCode: '05765', county: 'Rutland'},
  { name: 'Putney Public', url: 'https://www.putneylibrary.org', eventsUrl: 'https://www.putneylibrary.org/events', city: 'Putney', state: 'VT', zipCode: '05346', county: 'Windham'},
  { name: 'Quechee', url: 'https://www.quecheeandwilderlibraries.com/', eventsUrl: 'https://www.quecheeandwilderlibraries.com/', city: 'Quechee', state: 'VT', zipCode: '05059', county: 'Windsor'},
  { name: 'Reading Public', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'VT', zipCode: '05060', county: 'Reading County'},
  { name: 'Readsboro Community', url: 'https://www.readsborolibrary.org', eventsUrl: 'https://www.readsborolibrary.org/events', city: 'Readsboro', state: 'VT', zipCode: '05350', county: 'Bennington'},
  { name: 'Rochester Public', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'VT', zipCode: '05767', county: 'Windsor'},
  { name: 'Roxbury Free', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'VT', zipCode: '05669', county: 'Washington'},
  { name: 'Salisbury Free Public', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'VT', zipCode: '05769', county: 'Addison'},
  { name: 'Sheldon Public', url: 'https://www.sheldonlibrary.org', eventsUrl: 'https://www.sheldonlibrary.org/events', city: 'Sheldon', state: 'VT', zipCode: '05483', county: 'Franklin'},
  { name: 'Shrewsbury', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'VT', zipCode: '05738', county: 'Rutland'},
  { name: 'Stamford Community', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'VT', zipCode: '05352', county: 'Bennington'},
  { name: 'Stowe Free', url: 'https://www.stowelibrary.org', eventsUrl: 'https://www.stowelibrary.org/events', city: 'Stowe', state: 'VT', zipCode: '05672', county: 'Lamoille'},
  { name: 'Morrill Mem. Harris', url: 'https://www.straffordlibrary.org/', eventsUrl: 'https://www.straffordlibrary.org/', city: 'Strafford', state: 'VT', zipCode: '05072', county: 'Orange'},
  { name: 'Franklin-Grand Isle Bookmobile', url: 'https://www.swantonlibrary.org', eventsUrl: 'https://www.swantonlibrary.org/events', city: 'Swanton', state: 'VT', zipCode: '05488', county: 'Franklin'},
  { name: 'Latham Memorial', url: 'https://www.thetfordlibrary.org', eventsUrl: 'https://www.thetfordlibrary.org/events', city: 'Thetford', state: 'VT', zipCode: '05074', county: 'Thetford County'},
  { name: 'Tunbridge Public', url: 'https://www.tunbridgelibrary.org', eventsUrl: 'https://www.tunbridgelibrary.org/events', city: 'Tunbridge', state: 'VT', zipCode: '05077', county: 'Orange'},
  { name: 'Vernon Free', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'VT', zipCode: '05354', county: 'Windham'},
  { name: 'Warren Public', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'VT', zipCode: '05674', county: 'Washington'},
  { name: 'Wells Village', url: 'https://wellslibrary.org/', eventsUrl: 'https://wellslibrary.org/', city: 'Wells', state: 'VT', zipCode: '05774', county: 'Rutland'},
  { name: 'West Hartford', url: 'https://www.westhartfordlibrary.org/', eventsUrl: 'https://www.westhartfordlibrary.org/', city: 'West Hartford', state: 'VT', zipCode: '05084', county: 'Windsor'},
  { name: 'Hitchcock Museum', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'VT', zipCode: '05874', county: 'Orleans'},
  { name: 'Butterfield', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'VT', zipCode: '05158', county: 'Windham'},
  { name: 'Westminster West Public', url: 'https://www.westminsterwestlibrary.org', eventsUrl: 'https://www.westminsterwestlibrary.org/events', city: 'Westminster West', state: 'VT', zipCode: '05346', county: 'Windham'},
  { name: 'Ainsworth Public', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'VT', zipCode: '05679', county: 'Orange'},
  { name: 'Pettee Memorial', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'VT', zipCode: '05363', county: 'Windham'},
  { name: 'Windham Town', url: 'https://windhamlibrary.org/', eventsUrl: 'https://windhamlibrary.org/', city: 'Windham', state: 'VT', zipCode: '05359', county: 'Windham County'},
  { name: 'Windsor Public', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'VT', zipCode: '05089', county: 'Windsor County'},
  { name: 'G. M. Kelley Community', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'VT', zipCode: '05680', county: 'Lamoille'},
  { name: 'Woodbury Community', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'VT', zipCode: '05681', county: 'Washington'}

];

const SCRAPER_NAME = 'wordpress-VT';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'VT', city: library.city, zipCode: library.zipCode }}));
        continue;
      }
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

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
            state: 'VT',
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
            state: event.state || library.state || 'VT',
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
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            events.push({ title: title.textContent.trim(), date: resolveEventDate(card) || (date ? date.textContent.trim() : ''), ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name, RESOLVER_SRC);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'VT', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressVTCloudFunction() {
  console.log('☁️ Running WordPress VT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-VT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-VT', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressVTCloudFunction };
