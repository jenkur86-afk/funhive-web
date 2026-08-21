// 9 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: FL
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Miami-Dade Public Library System",
    "url": "https://www.mdpls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mdpls.org/events"
  },
  {
    "name": "Orange County Library System",
    "url": "https://www.ocls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ocls.org/events"
  },
  {
    "name": "Tampa-Hillsborough County Public Library",
    "url": "https://www.hcplc.org",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org"
  },
  {
    "name": "Broward County Library",
    "url": "https://www.broward.org/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.broward.org/library/events"
  },
  {
    "name": "Palm Beach County Library System",
    "url": "https://www.pbclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.pbclibrary.org/events"
  }
]
 */

const LIBRARIES = [
  // These five entries had NO city/state at all and every one carried
  // county: 'Baltimore City' — a Maryland county, copy-pasted from an MD seed
  // file. With no city/state the geocoding chain had nothing to work with, and
  // the bogus county made getCountyCentroid() return null (it normalizes away a
  // " County" suffix but cannot rescue a county that is in the wrong state), so
  // all five of Florida's largest library systems fell through to the FL state
  // centroid. Corrected 2026-08-05 to each system's main-branch location; county
  // values match the bare keys in utils/county-centroids.js exactly so they hit
  // that lookup's exact-match pass.
  {
    "name": "Miami-Dade Public Library System",
    "url": "https://www.mdpls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mdpls.org/events",
    city: 'Miami', state: 'FL', zipCode: '33130', county: 'Miami-Dade'},
  {
    "name": "Orange County Library System",
    "url": "https://www.ocls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ocls.org/events",
    city: 'Orlando', state: 'FL', zipCode: '32801', county: 'Orange'},
  {
    "name": "Tampa-Hillsborough County Public Library",
    "url": "https://www.hcplc.org",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org",
    city: 'Tampa', state: 'FL', zipCode: '33602', county: 'Hillsborough'},
  {
    "name": "Broward County Library",
    "url": "https://www.broward.org/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.broward.org/library/events",
    city: 'Fort Lauderdale', state: 'FL', zipCode: '33301', county: 'Broward'},
  {
    "name": "Palm Beach County Library System",
    "url": "https://www.pbclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.pbclibrary.org/events",
    city: 'West Palm Beach', state: 'FL', zipCode: '33406', county: 'Palm Beach'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Alachua Branch Library', url: 'https://www.alachualibrary.org', eventsUrl: 'https://www.alachualibrary.org/events', city: 'Alachua', state: 'FL', zipCode: '00000', county: 'Alachua County'},
  { name: 'Desoto County Library', url: 'https://www.arcadialibrary.org', eventsUrl: 'https://www.arcadialibrary.org/events', city: 'Arcadia', state: 'FL', zipCode: '00000', county: 'DeSoto'},
  { name: 'Archer Branch Library', url: 'https://www.archerlibrary.org/', eventsUrl: 'https://www.archerlibrary.org/', city: 'Archer', state: 'FL', zipCode: '00000', county: 'Alachua'},
  // URL corrected 2026-08-11 (was auburndalelibrary.org): 100 West Bridgers Avenue Auburndale FL, phone 863-965-5548, Polk County Library Cooperative
  { name: 'Auburndale Public Library', url: 'https://auburndalefl.com/library/', eventsUrl: 'https://auburndalefl.com/library/', city: 'Auburndale', state: 'FL', zipCode: '00000', county: 'Polk'},
  { name: 'Bartow Public Library', url: 'https://www.bartowlibrary.org', eventsUrl: 'https://www.bartowlibrary.org/events', city: 'Bartow', state: 'FL', zipCode: '00000', county: 'Polk'},
  { name: 'Brandon Branch', url: 'https://www.brandonlibrary.org/', eventsUrl: 'https://www.brandonlibrary.org/events-calendar', city: 'Brandon', state: 'FL', zipCode: '00000', county: 'Hillsborough'},
  { name: 'Levy County Public Library System', url: 'https://www.bronsonlibrary.org/', eventsUrl: 'https://www.bronsonlibrary.org/calendar', city: 'Bronson', state: 'FL', zipCode: '32621', county: 'Levy'},
  { name: 'Celebration Library', url: 'https://www.celebrationlibrary.org', eventsUrl: 'https://www.celebrationlibrary.org/events', city: 'Celebration', state: 'FL', zipCode: '00000', county: 'Osceola'},
  { name: 'Cooper Memorial Library', url: 'https://www.clermontlibrary.org/', eventsUrl: 'https://www.clermontlibrary.org/', city: 'Clermont', state: 'FL', zipCode: '00000', county: 'Lake'},
  { name: 'Coleman Library', url: 'https://www.colemanlibrary.org/', eventsUrl: 'https://www.colemanlibrary.org/calendar', city: 'Coleman', state: 'FL', zipCode: '00000', county: 'Sumter'},
  { name: 'Edgewater Public Library', url: 'https://www.edgewaterlibrary.org', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'FL', zipCode: '00000', county: 'Volusia'},
  { name: 'Eustis Memorial Library', url: 'https://eustislibrary.org/', eventsUrl: 'https://eustislibrary.org/', city: 'Eustis', state: 'FL', zipCode: '32726', county: 'Lake'},
  { name: 'Freeport Branch Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'FL', zipCode: '00000', county: 'Walton'},
  { name: 'Fruitland Park Library', url: 'https://www.fruitlandparklibrary.org', eventsUrl: 'https://www.fruitlandparklibrary.org/events', city: 'Fruitland Park', state: 'FL', zipCode: '00000', county: 'Lake'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'FL', zipCode: '00000', county: 'Madison'},
  { name: 'Havana Public Library', url: 'https://www.havanalibrary.org/', eventsUrl: 'https://www.havanalibrary.org/calendar', city: 'Havana', state: 'FL', zipCode: '00000', county: 'Gadsden'},
  { name: 'Homestead Branch Library', url: 'https://www.homesteadlibrary.org', eventsUrl: 'https://www.homesteadlibrary.org/events', city: 'Homestead', state: 'FL', zipCode: '00000', county: 'Miami-Dade'},
  { name: 'Hudson Regional Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'FL', zipCode: '00000', county: 'Pasco'},
  // URL corrected 2026-08-11 (was lakeplacidlibrary.org): Highlands County FL Library System branch; 205 W Interlake Blvd Lake Placid FL 33852, phone 863-699-3705
  { name: 'Lake Placid Memorial Library', url: 'https://www.myhlc.org/lake-placid-memorial-library', eventsUrl: 'https://myhlc.specialdistrict.org/programming-upcoming-events', city: 'Lake Placid', state: 'FL', zipCode: '00000', county: 'Highlands'},
  { name: 'Lakeland Public Library', url: 'https://www.lakelandlibrary.org', eventsUrl: 'https://www.lakelandlibrary.org/events', city: 'Lakeland', state: 'FL', zipCode: '00000', county: 'Polk'},
  { name: 'Land Olakes Branch Library', url: 'https://www.landolakeslibrary.org', eventsUrl: 'https://www.landolakeslibrary.org/events', city: "Land O' Lakes", state: 'FL', zipCode: '34639', county: 'Pasco County'},
  { name: 'Lantana Public Library', url: 'https://www.lantanalibrary.org/', eventsUrl: 'https://www.lantanalibrary.org/', city: 'Lantana', state: 'FL', zipCode: '33462', county: 'Palm Beach'},
  { name: 'Largo Public Library', url: 'https://www.largolibrary.org', eventsUrl: 'https://www.largolibrary.org/events', city: 'Largo', state: 'FL', zipCode: '00000', county: 'Pinellas'},
  { name: 'West Branch Library', url: 'https://www.longwoodlibrary.org', eventsUrl: 'https://www.longwoodlibrary.org/events', city: 'Longwood', state: 'FL', zipCode: '00000', county: 'Seminole'},
  { name: 'Madison County Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'FL', zipCode: '00000', county: 'Madison County', urlCollision: 'madisonlibrary.org is KY, not FL' },
  { name: 'Margate Catharine Young Branch', url: 'https://www.margatelibrary.org', eventsUrl: 'https://www.margatelibrary.org/events', city: 'Margate', state: 'FL', zipCode: '00000', county: 'Broward'},
  { name: 'Jefferson County R. J. Bailar Public Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'FL', zipCode: '00000', county: 'Jefferson'},
  { name: 'Newberry Branch Library', url: 'https://www.newberrylibrary.org', eventsUrl: 'https://www.newberrylibrary.org/events', city: 'Newberry', state: 'FL', zipCode: '00000', county: 'Alachua'},
  { name: 'Oldsmar Public Library', url: 'https://myoldsmar.com/', eventsUrl: 'https://myoldsmar.com/1379/Oldsmar-Public-Library', city: 'Oldsmar', state: 'FL', zipCode: '00000', county: 'Pinellas'},
  { name: 'Orange City Dickinson Memorial Library', url: 'https://www.orangecitylibrary.org', eventsUrl: 'https://www.orangecitylibrary.org/events', city: 'Orange City', state: 'FL', zipCode: '00000', county: 'Volusia'},
  { name: 'East Lake Community Library', url: 'https://www.palmharborlibrary.org', eventsUrl: 'https://www.palmharborlibrary.org/events', city: 'Palm Harbor', state: 'FL', zipCode: '00000', county: 'Pinellas'},
  { name: 'Palm Springs Public Library', url: 'https://www.palmspringsca.gov/', eventsUrl: 'https://www.palmspringsca.gov/government/departments/library', city: 'Palm Springs', state: 'FL', zipCode: '33461', county: 'Palm Beach'},
  { name: 'Parker Public Library', url: 'https://www.parkerlibrary.org', eventsUrl: 'https://www.parkerlibrary.org/events', city: 'Parker', state: 'FL', zipCode: '00000', county: 'Bay'},
  { name: 'Parkland Library', url: 'https://www.parklandlibrary.org/', eventsUrl: 'https://www.parklandlibrary.org/calendar/', city: 'Parkland', state: 'FL', zipCode: '33067', county: 'Broward'},
  { name: 'Taylor County Public Library', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'FL', zipCode: '32347', county: 'Taylor'},
  { name: 'Pierson Public Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Pierson', state: 'FL', zipCode: '00000', county: 'Volusia'},
  { name: 'Polk City Library', url: 'https://www.polkcitylibrary.org', eventsUrl: 'https://www.polkcitylibrary.org/events', city: 'Polk City', state: 'FL', zipCode: '00000', county: 'Polk'},
  { name: 'Reddick Public Library', url: 'https://www.reddicklibrary.org/', eventsUrl: 'https://www.reddicklibrary.org/', city: 'Reddick', state: 'FL', zipCode: '00000', county: 'Marion'},
  { name: 'Safety Harbor Public Library', url: 'https://www.safetyharborlibrary.org', eventsUrl: 'https://www.safetyharborlibrary.org/events', city: 'Safety Harbor', state: 'FL', zipCode: '00000', county: 'Pinellas'},
  { name: 'Springfield Branch', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'FL', zipCode: '00000', county: 'Bay', urlCollision: 'springfieldlibrary.org is MA, not FL' },
  { name: 'Blake Library', url: 'https://stuartlibrary.org/', eventsUrl: 'https://stuartlibrary.org/calendar/', city: 'Stuart', state: 'FL', zipCode: '00000', county: 'Martin'},
  { name: 'Sunrise Dan Pearl Branch', url: 'https://www.sunriselibrary.org', eventsUrl: 'https://www.sunriselibrary.org/events', city: 'Sunrise', state: 'FL', zipCode: '00000', county: 'Broward'},
  { name: 'Lake County Library System', url: 'https://www.tavareslibrary.org', eventsUrl: 'https://www.tavareslibrary.org/events', city: 'Tavares', state: 'FL', zipCode: '32778', county: 'Lake'},
  { name: 'Umatilla Public Library', url: 'https://www.umatillalibrary.org/', eventsUrl: 'https://www.umatillalibrary.org/', city: 'Umatilla', state: 'FL', zipCode: '00000', county: 'Lake'},
  { name: 'Jacaranda Public Library', url: 'https://www.venicelibrary.org', eventsUrl: 'https://www.venicelibrary.org/events', city: 'Venice', state: 'FL', zipCode: '00000', county: 'Sarasota'},
  { name: 'Vernon Branch Library', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'FL', zipCode: '00000', county: 'Washington'},
  { name: 'E.C. Rowell Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'FL', zipCode: '00000', county: 'Sumter'},
  { name: 'Mandel Public Library Of West Palm Beach', url: 'https://www.westpalmbeachlibrary.org', eventsUrl: 'https://www.westpalmbeachlibrary.org/events', city: 'West Palm Beach', state: 'FL', zipCode: '33401', county: 'Palm Beach'},
  { name: 'Wildwood Public Library', url: 'https://www.wildwoodlibrary.org', eventsUrl: 'https://www.wildwoodlibrary.org/events', city: 'Wildwood', state: 'FL', zipCode: '00000', county: 'Sumter'},
  { name: 'Winter Park Public Library', url: 'https://www.winterparklibrary.org', eventsUrl: 'https://www.winterparklibrary.org/events', city: 'Winter Park', state: 'FL', zipCode: '32789', county: 'Orange'},
  { name: 'Zephyrhills Library', url: 'https://www.zephyrhillslibrary.org', eventsUrl: 'https://www.zephyrhillslibrary.org/events', city: 'Zephyrhills', state: 'FL', zipCode: '00000', county: 'Pasco'}

];

const SCRAPER_NAME = 'generic-FL';

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
      console.log(`\n📚 Scraping ${library.name}...`);

      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        console.log(`   ✅ TEC REST API: ${tecEvents.length} events`);
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', platform: 'generic', state: 'FL', needsReview: true }}));
        continue;
      }

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for any event-like content
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
            state: 'FL',
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
            state: event.state || library.state || 'FL',
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

            const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Generic selectors for event cards/items
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

        // Calendar-grid sites render each day as a day-cell container
        // carrying the real date, while individual event cards inside only
        // show a clock time with no day/month at all. Walk up from the
        // event card looking for that ancestor date before giving up.
        // Confirmed live 2026-07-20 on ypl.org/events (same platform
        // family): <div class="calendar__day" data-date="2026-06-28">
        // <h2 class="calendar__day-header">Sunday, June 28, 2026</h2>...
        function findAncestorDate(el) {
          let node = el;
          for (let i = 0; i < 8 && node; i++) {
            if (node.getAttribute) {
              const attr = node.getAttribute('data-date') || node.getAttribute('data-current_date') || node.getAttribute('data-day');
              if (attr && /\d{4}-\d{1,2}-\d{1,2}/.test(attr)) return attr;
              const header = node.querySelector && node.querySelector('.calendar__day-header, [class*="day-header"]');
              if (header && header.textContent.trim()) return header.textContent.trim();
            }
            node = node.parentElement;
          }
          return null;
        }

        // Try each selector
        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              // Try to find title, date, description
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
                let dateText = possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '';
                if (!/[A-Za-z]{3,9}\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/.test(dateText)) {
                  const ancestorDate = findAncestorDate(card);
                  if (ancestorDate) dateText = dateText ? `${ancestorDate} ${dateText}` : ancestorDate;
                }
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: dateText,
                  time: possibleDates.length > 1 ? possibleDates[1].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                // Only add if it looks like an event (has title and some other field)
                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      // Transform and add to collection
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
            state: 'FL',
            needsReview: true // Flag for manual review
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 3000));

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
    state: 'FL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - FL (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressFLCloudFunction() {
  console.log('☁️ Running WordPress FL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-FL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-FL', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressFLCloudFunction };
