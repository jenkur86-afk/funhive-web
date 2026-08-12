// 3 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * Delaware Public Libraries Scraper - Coverage: All Delaware public libraries
 */
const LIBRARIES = [
  // New Castle County Libraries
  { name: 'Wilmington Public Library', url: 'https://www.wilmingtonde.gov/library', eventsUrl: 'https://www.wilmingtonde.gov/library/events', city: 'Wilmington', state: 'DE', zipCode: '19801', county: 'New Castle'},
  { name: 'Newark Free Library', url: 'https://www.nccde.org/newark', eventsUrl: 'https://www.nccde.org/newark/events', city: 'Newark', state: 'DE', zipCode: '19711', county: 'New Castle'},
  { name: 'Bear Library', url: 'https://www.nccde.org/bear', eventsUrl: 'https://www.nccde.org/bear/events', city: 'Bear', state: 'DE', zipCode: '19701', county: 'New Castle'},
  { name: 'Kirkwood Library', url: 'https://www.nccde.org/kirkwood', eventsUrl: 'https://www.nccde.org/kirkwood/events', city: 'Wilmington', state: 'DE', zipCode: '19808', county: 'New Castle'},
  { name: 'Claymont Library', url: 'https://www.nccde.org/claymont', eventsUrl: 'https://www.nccde.org/claymont/events', city: 'Claymont', state: 'DE', zipCode: '19703', county: 'New Castle'},
  { name: 'Elsmere Library', url: 'https://www.nccde.org/elsmere', eventsUrl: 'https://www.nccde.org/elsmere/events', city: 'Elsmere', state: 'DE', zipCode: '19805', county: 'New Castle'},
  { name: 'Hockessin Library', url: 'https://www.nccde.org/hockessin', eventsUrl: 'https://www.nccde.org/hockessin/events', city: 'Hockessin', state: 'DE', zipCode: '19707', county: 'New Castle'},
  { name: 'Garfield Park Library', url: 'https://www.nccde.org/garfield', eventsUrl: 'https://www.nccde.org/garfield/events', city: 'New Castle', state: 'DE', zipCode: '19720', county: 'New Castle County'},
  { name: 'Brandywine Hundred Library', url: 'https://www.nccde.org/brandywine', eventsUrl: 'https://www.nccde.org/brandywine/events', city: 'Wilmington', state: 'DE', zipCode: '19810', county: 'New Castle'},
  { name: 'Woodlawn Library', url: 'https://www.nccde.org/woodlawn', eventsUrl: 'https://www.nccde.org/woodlawn/events', city: 'Wilmington', state: 'DE', zipCode: '19805', county: 'New Castle'},
  // Kent County Libraries
  { name: 'Dover Public Library', url: 'https://www.doverpubliclibrary.org', eventsUrl: 'https://www.doverpubliclibrary.org/events', city: 'Dover', state: 'DE', zipCode: '19901', county: 'Kent'},
  { name: 'Kent County Library', url: 'https://www.kentcountyde.gov/library', eventsUrl: 'https://www.kentcountyde.gov/library/events', city: 'Dover', state: 'DE', zipCode: '19904' },
  // Sussex County Libraries
  { name: 'Georgetown Public Library', url: 'https://www.georgetownpubliclibrary.org', eventsUrl: 'https://www.georgetownpubliclibrary.org/events', city: 'Georgetown', state: 'DE', zipCode: '19947', county: 'Sussex'},
  { name: 'Lewes Public Library', url: 'https://www.leweslibrary.org', eventsUrl: 'https://www.leweslibrary.org/events', city: 'Lewes', state: 'DE', zipCode: '19958', county: 'Sussex'},
  { name: 'Rehoboth Beach Public Library', url: 'https://www.rehobothbeachde.gov/library', eventsUrl: 'https://www.rehobothbeachde.gov/experience-rehoboth-beach/calendar/', city: 'Rehoboth Beach', state: 'DE', zipCode: '19971', county: 'Sussex'},
  // URL corrected 2026-08-11 (was bridgevillelibrary.org): Sussex County Library System site lists Bridgeville Public Library, 600 South Cannon St, Bridgeville DE 19933, 302-337-7401. bridgevillelibr
  { name: 'Bridgeville Public Library', url: 'https://sussexcounty.lib.de.us', eventsUrl: 'https://delawarelibraries.libcal.com/calendar/bridgeville', city: 'Bridgeville', state: 'DE', zipCode: '19933', county: 'Sussex'},
  { name: 'Laurel Public Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'Laurel', state: 'DE', zipCode: '19956', county: 'Sussex'},
  // Additional libraries from coverage audit
  { name: 'Frankford Public Library', url: 'https://www.frankfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.frankfordlibrary.org/events', city: 'Frankford', state: 'DE', zipCode: '19945', county: '' },
  { name: 'Appoquinimink Public Library', url: 'https://www.nccde.org/appoquinimink', platform: 'wordpress', eventsUrl: 'https://www.nccde.org/appoquinimink/events', city: 'Middletown', state: 'DE', zipCode: '19709', county: '' },
];

const SCRAPER_NAME = 'wordpress-DE';

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
            state: event.state || library.state || 'DE',
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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'DE', city: library.city, zipCode: library.zipCode }}));
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
    state: 'DE',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressDECloudFunction() {
  console.log('☁️ Running WordPress DE as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-DE', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-DE', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressDECloudFunction };
