// 8 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * West Virginia Public Libraries Scraper - Coverage: All West Virginia public libraries
 */
const LIBRARIES = [
  { name: 'Kanawha County Public Library', url: 'https://www.kcpls.org/', eventsUrl: 'https://www.kcpls.org/', city: 'Charleston', state: 'WV', zipCode: '25301', county: 'Kanawha'},
  { name: 'Ohio County Public Library', url: 'https://www.ohiocountylibrary.org/', eventsUrl: 'https://www.ohiocountylibrary.org/calendar', city: 'Wheeling', state: 'WV', zipCode: '26003' },
  { name: 'Berkeley County Public Library', url: 'https://bcpls.org/', eventsUrl: 'https://bcpls.org/', city: 'Martinsburg', state: 'WV', zipCode: '25401', county: 'Berkeley'},
  { name: 'Harrison County Public Library', url: 'https://www.clarksburglibrary.org', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'WV', zipCode: '26301', county: 'Harrison'},
  { name: 'Marion County Public Library', url: 'https://www.marioncountylibrary.org/', eventsUrl: 'https://www.marioncountylibrary.org/calendar', city: 'Fairmont', state: 'WV', zipCode: '26554' },
  { name: 'Mercer County Public Library', url: 'https://www.mercercountylibrary.org/', eventsUrl: 'https://www.mercercountylibrary.org/', city: 'Princeton', state: 'WV', zipCode: '24740' },
  { name: 'Putnam County Public Library', url: 'https://putnamcountylibrary.org/', eventsUrl: 'https://putnamcountylibrary.org/', city: 'Hurricane', state: 'WV', zipCode: '25526' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'East Hardy Branch Public Library', url: 'https://www.bakerlibrary.org/', eventsUrl: 'https://www.bakerlibrary.org/', city: 'Baker', state: 'WV', zipCode: '26801', county: 'Hardy'},
  { name: 'Barrett-Wharton Public Library', url: 'https://www.barrettlibrary.org', eventsUrl: 'https://www.barrettlibrary.org/events', city: 'Barrett', state: 'WV', zipCode: '25208', county: 'Boone'},
  { name: 'Bridgeport Public Library', url: 'https://www.bridgeportlibrary.org/', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'WV', zipCode: '26330', county: 'Harrison'},
  { name: 'Cameron Public Library', url: 'https://www.cameronlibrary.org/', eventsUrl: 'https://www.cameronlibrary.org/calendar', city: 'Cameron', state: 'WV', zipCode: '26033', county: 'Marshall'},
  { name: 'Center Point Public Library', url: 'https://www.centerpointlibrary.org', eventsUrl: 'https://www.centerpointlibrary.org/events', city: 'Center Point', state: 'WV', zipCode: '26339', county: 'Doddridge'},
  { name: 'Lynn Murray Memorial Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'WV', zipCode: '26034', county: 'Hancock'},
  { name: 'Clay County Public Library', url: 'https://www.claylibrary.org/', eventsUrl: 'https://www.claylibrary.org/', city: 'Clay', state: 'WV', zipCode: '25043', county: 'Clay County'},
  { name: 'Sand Hill Public Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'WV', zipCode: '26036', county: 'Marshall'},
  { name: 'Dunbar Branch Library', url: 'https://www.dunbarlibrary.org', eventsUrl: 'https://www.dunbarlibrary.org/events', city: 'Dunbar', state: 'WV', zipCode: '25064', county: 'Kanawha'},
  { name: 'Pendleton County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'WV', zipCode: '26807', county: 'Pendleton'},
  { name: 'Gilbert Public Library', url: 'https://www.gilbertlibrary.org/', eventsUrl: 'https://www.gilbertlibrary.org/', city: 'Gilbert', state: 'WV', zipCode: '25621', county: 'Mingo'},
  { name: 'Glasgow Branch Library', url: 'https://www.glasgowlibrary.org/', eventsUrl: 'https://www.glasgowlibrary.org/upcoming-events', city: 'Glasgow', state: 'WV', zipCode: '25086', county: 'Kanawha'},
  { name: 'Hamlin-Lincoln County Public Library', url: 'https://www.hamlinlibrary.org/', eventsUrl: 'https://www.hamlinlibrary.org/', city: 'Hamlin', state: 'WV', zipCode: '25523', county: 'Lincoln'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'WV', zipCode: '24946', county: 'Pocahontas'},
  { name: 'Summers County Public Library', url: 'https://www.hintonlibrary.org', eventsUrl: 'https://www.hintonlibrary.org/events', city: 'Hinton', state: 'WV', zipCode: '25951', county: 'Summers'},
  { name: 'Boone-Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'WV', zipCode: '25130', county: 'Boone'},
  { name: 'Montgomery Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'WV', zipCode: '25136', county: 'Kanawha'},
  { name: 'Swaney Memorial Library', url: 'https://www.newcumberlandlibrary.org', eventsUrl: 'https://www.newcumberlandlibrary.org/events', city: 'New Cumberland', state: 'WV', zipCode: '26047', county: 'Hancock'},
  { name: 'Paden City Public Library', url: 'https://www.padencitylibrary.org/', eventsUrl: 'https://www.padencitylibrary.org/calendar', city: 'Paden City', state: 'WV', zipCode: '26159', county: 'Tyler'},
  { name: 'Paw Paw Public Library', url: 'https://www.pawpawlibrary.org', eventsUrl: 'https://www.pawpawlibrary.org/events', city: 'Paw Paw', state: 'WV', zipCode: '25434', county: 'Marion'},
  { name: 'Piedmont Public Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'WV', zipCode: '26750', county: 'Mercer'},
  { name: 'Richwood Public Library', url: 'https://www.richwoodlibrary.org', eventsUrl: 'https://www.richwoodlibrary.org/events', city: 'Richwood', state: 'WV', zipCode: '26261', county: 'Nicholas'},
  { name: 'Jackson County Public Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'WV', zipCode: '25271', county: 'Jackson'},
  { name: 'Ronceverte Public Library', url: 'https://www.roncevertelibrary.org/', eventsUrl: 'https://www.roncevertelibrary.org/', city: 'Ronceverte', state: 'WV', zipCode: '24970', county: 'Greenbrier'},
  { name: 'South Charleston Public Library', url: 'https://www.scplwv.org/', eventsUrl: 'https://www.scplwv.org/events', city: 'South Charleston', state: 'WV', zipCode: '25303', county: 'Kanawha'},
  { name: 'Pleasants County Public Library', url: 'https://www.stmaryslibrary.org', eventsUrl: 'https://www.stmaryslibrary.org/events', city: 'St. Marys', state: 'WV', zipCode: '26170', county: 'Pleasants'},
  { name: 'Monroe County Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'WV', zipCode: '24983', county: 'Monroe'},
  { name: 'Waverly Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'WV', zipCode: '26184', county: 'Wood'},
  { name: 'Whitesville Public Library', url: 'https://www.whitesvillelibrary.org', eventsUrl: 'https://www.whitesvillelibrary.org/events', city: 'Whitesville', state: 'WV', zipCode: '25209', county: 'Boone'},
  { name: 'Williamstown Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'WV', zipCode: '26187', county: 'Wood'}

];

const SCRAPER_NAME = 'wordpress-WV';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
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
            state: event.state || library.state || 'WV',
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
            events.push({ title: title.textContent.trim(), date: resolveEventDate(card), ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name, RESOLVER_SRC);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WV', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    state: 'WV',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWVCloudFunction() {
  console.log('☁️ Running WordPress WV as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WV', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-WV', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressWVCloudFunction };
