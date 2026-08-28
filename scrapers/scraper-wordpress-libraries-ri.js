// 4 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const { tryFetchTecEvents, tryDomScrapeTecEvents } = require('./helpers/tec-rest-helper');
const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Rhode Island Public Libraries Scraper - Coverage: All Rhode Island public libraries
 */
const LIBRARIES = [
  // 2026-08-26: PLATFORM MISMATCH - relocated to LibCal-RI. Bristol publishes on
  // rogersfreelibrary.libcal.com, confirmed by that page titling itself "LibCal - Rogers Free Library".
  { name: 'Rogers Free Library', url: 'https://rogersfreelibrary.org/', platform: 'wordpress', eventsUrl: 'https://rogersfreelibrary.org/', city: 'Bristol', state: 'RI', zipCode: '02809', county: 'Bristol', urlCollision: 'platform mismatch - publishes on rogersfreelibrary.libcal.com; relocated to LibCal-RI 2026-08-26' },
  { name: 'Central Falls Free Public Library', url: 'https://www.centralfallslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centralfallslibrary.org/events', city: 'Central Falls', state: 'RI', zipCode: '02863', county: '' },
  // 2026-08-26: PLATFORM MISMATCH, not a selector problem - this entry had produced ZERO database rows, ever.
  // Coventry publishes its calendar on LibCal (coventrylibrary.libcal.com), which a WordPress DOM extractor
  // cannot read. Relocated to LibCal-RI and PROVEN LIVE the same day: 20 events found, 7 rows saved under
  // LibCal-RI-coventrylibrary, including its Greene branch. Guarded here rather than deleted so the library keeps
  // an explained row in LIBRARY-SITE-AUDIT.md instead of silently vanishing from the audit.
  { name: 'Coventry Public Library', url: 'https://www.coventrylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.coventrylibrary.org/', city: 'Coventry', state: 'RI', zipCode: '02816', county: 'Kent', urlCollision: 'platform mismatch - Coventry runs LibCal; relocated to LibCal-RI and proven live with 20 events' },
  { name: 'East Greenwich Free Library', url: 'https://www.eastgreenwichlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastgreenwichlibrary.org/events', city: 'East Greenwich', state: 'RI', zipCode: '02818', county: '' },
  { name: 'Exeter Public Library', url: 'https://www.exeterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.exeterlibrary.org/events', city: 'Exeter', state: 'RI', zipCode: '02822', county: '' },
  { name: 'Harmony Library', url: 'https://www.harmonylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Glocester', state: 'RI', zipCode: '02829', county: '' , urlCollision: 'harmonylibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // 2026-08-26: NOW GENUINELY COVERED ELSEWHERE, AND PROVEN - retired from this family rather than repointed.
  // Greene is a BRANCH of Coventry Public Library (179 Hopkins Hollow Rd, Greene RI 02827, ph 401-397-3873).
  // Coventry runs LibCal, not WordPress, which is why this family could never read it. Coventry was added to
  // LibCal-RI the same day and RUN: it returned 20 events, and 4 of the 7 rows saved carry venue "Greene Branch"
  // - Tech Tuesdays @ GREENE, Children s Book Club @ GREENE, Farmer s Market @ GREENE - under scraper_name
  // LibCal-RI-coventrylibrary. That is DATABASE-ROW evidence for this specific branch, which is the standard the
  // Worcester rule demands; a name match or a config entry would not have been enough.
  { name: 'Greene Public Library', url: 'https://www.greenelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'RI', zipCode: '02827', county: 'Kent', urlCollision: 'greenelibrary.org is dead and was shared with NY/ME; Greene is a Coventry branch now covered live by LibCal-RI-coventrylibrary, proven by 4 Greene Branch rows' },
  { name: 'Ashaway Free Library', url: 'https://www.ashawaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ashawaylibrary.org/events', city: 'Hopkinton', state: 'RI', zipCode: '02804', county: '' },
  { name: 'Langworthy Public Library', url: 'https://www.langworthylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.langworthylibrary.org/events', city: 'Hopkinton', state: 'RI', zipCode: '02832', county: '' },
  { name: 'Marian J. Mohr Memorial Library', url: 'https://www.mohrlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.mohrlibrary.org/', city: 'Johnston', state: 'RI', zipCode: '02919', county: '' },
  { name: 'Brownell Library, Home Of Little Compton', url: 'https://www.brownelllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brownelllibrary.org/events', city: 'Little Compton', state: 'RI', zipCode: '02837', county: '' , urlCollision: 'brownelllibrary.org is VT, not RI' },
  { name: 'Middletown Public Library', url: 'https://www.middletownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'RI', zipCode: '02842', county: '' , urlCollision: 'middletownlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Island Free Library', url: 'https://www.islandfreelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.islandfreelibrary.org/events', city: 'New Shoreham', state: 'RI', zipCode: '02807', county: '' },
  { name: 'Pascoag Free Public Library', url: 'https://www.pascoaglibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.pascoaglibrary.org/calendar', city: 'Pascoag', state: 'RI', zipCode: '02859', county: '' },
  { name: 'Portsmouth Free Public Library', url: 'https://www.portsmouthlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.portsmouthlibrary.org/', city: 'Portsmouth', state: 'RI', zipCode: '02871', county: '' },
  { name: 'Fox Point Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02906', county: '' },
  { name: 'Knight Memorial Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02907', county: '' },
  { name: 'Mount Pleasant Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02908', county: '' },
  { name: 'Olneyville Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02909', county: '' },
  { name: 'Providence Public Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02903', county: '' },
  { name: 'Rochambeau Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02906', county: '' },
  { name: 'Smith Hill Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02908', county: '' },
  { name: 'South Providence Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02905', county: '' },
  { name: 'Wanskuck Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02904', county: '' },
  { name: 'Washington Park Library', url: 'https://provlib.org/', platform: 'wordpress', eventsUrl: 'https://provlib.org/', city: 'Providence', state: 'RI', zipCode: '02905', county: '' },
  // 2026-08-26: PLATFORM MISMATCH, and a branch with no calendar of its own. East Providence
  // publishes on eplib.libcal.com, already covered by the East Providence entry in LibCal-RI.
  // Rumford has NO separate LibCal calendar - eplib.libcal.com/calendar/rumford returns 404 - so
  // its events, if any, post under the system calendar. HONEST LIMIT: the LibCal-RI-eplib rows
  // currently carry only Weaver Library, Weaver Library - Lawn and Fuller Creative Learning Center
  // as venues, so no Rumford-specific row has actually been observed. Recorded as covered at
  // SYSTEM level and as an unproven gap at BRANCH level, rather than claimed as resolved.
  { name: 'Rumford Branch', url: 'https://eastprovidencelibrary.org/', platform: 'wordpress', eventsUrl: 'https://eastprovidencelibrary.org/', city: 'Rumford', state: 'RI', zipCode: '02916', county: 'Providence', urlCollision: 'platform mismatch - East Providence publishes on eplib.libcal.com (covered by LibCal-RI); Rumford has no separate calendar, 404 on /calendar/rumford' },
  { name: 'North Smithfield Public Library', url: 'https://www.northsmithfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northsmithfieldlibrary.org/events', city: 'Slatersville', state: 'RI', zipCode: '02876', county: '' },
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Smithfield', state: 'RI', zipCode: '02828', county: '' , urlCollision: 'greenvillelibrary.org is SC, not RI' },
  { name: 'Essex Public Library', url: 'https://www.tivertonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tivertonlibrary.org/events', city: 'Tiverton', state: 'RI', zipCode: '02878', county: '' },
  { name: 'George Hail Free Library', url: 'https://www.georgehail.org/', platform: 'wordpress', eventsUrl: 'https://www.georgehail.org/', city: 'Warren', state: 'RI', zipCode: '02885', county: '' },
  { name: 'Louttit Memorial Library', url: 'https://www.louttitlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.louttitlibrary.org/events', city: 'West Greenwich', state: 'RI', zipCode: '02817', county: '' },
  { name: 'Westerly Public Library', url: 'https://www.westerlylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.westerlylibrary.org/', city: 'Westerly', state: 'RI', zipCode: '02891', county: '' },
  { name: 'Fairmount Branch', url: 'https://www.woonsocketlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woonsocketlibrary.org/events', city: 'Woonsocket', state: 'RI', zipCode: '02895', county: '' },
  { name: 'Woonsocket Harris Public Library', url: 'https://www.woonsocketlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woonsocketlibrary.org/events', city: 'Woonsocket', state: 'RI', zipCode: '02895', county: '' },

];

const SCRAPER_NAME = 'WordPress-RI';

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
      // Try the site's TEC REST API before opening a page at all — same order as the
      // other WordPress state files; see helpers/tec-rest-helper.js (2026-07-31).
      // RI was the ONE active state this was never wired into: grep for
      // tryFetchTecEvents across scraper-wordpress-libraries-*.js returned
      // al ct fl ga me ms nc nj ny pa tn vt and no ri. Measured cost on 2026-08-27:
      // islandfreelibrary.org's TEC endpoint returns 143 upcoming events - "Chess with
      // Graham" and the like - while the DOM path below logged "Found 0 events" for it
      // on the 2026-08-24 run. TEC's list view groups events under a bare day heading
      // with no month or year, which is why DOM scraping this platform fails.
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'RI', city: library.city, zipCode: library.zipCode }}));
        // No "Found N" print here on purpose: the finally at the bottom of this loop
        // already emits it, and `continue` still runs a finally. Printing again would
        // emit TWO Found lines for one 📍 header and desynchronise build-library-site-audit.js,
        // which pairs those lines positionally for every library after this one.
        continue;
      }

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // REST can be reachable-but-403 on a genuinely TEC-powered site, in which case
      // tryFetchTecEvents() returned null above. Try TEC's own DOM shape before the
      // generic selectors, which mistake TEC's day-heading badges for event cards.
      const domTecEvents = await tryDomScrapeTecEvents(page, library.name);
      if (domTecEvents && domTecEvents.length > 0) {
        domTecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', platform: 'wordpress-tec-dom', state: 'RI', city: library.city, zipCode: library.zipCode, needsReview: true }}));
        await page.close();
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
            state: event.state || library.state || 'RI',
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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'RI', city: library.city, zipCode: library.zipCode }}));
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
    state: 'RI',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressRICloudFunction() {
  console.log('☁️ Running WordPress RI as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-RI', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-RI', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressRICloudFunction };
