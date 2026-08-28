// 8 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * Mississippi Public Libraries Scraper
 * State: MS
 * Coverage: All Mississippi Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Jackson-Hinds Library System', url: 'https://www.jhlibrary.org', eventsUrl: 'https://www.jhlibrary.org/events', city: 'Jackson', state: 'MS', zipCode: '39201', county: 'Jackson County'},
  { name: 'Harrison County Library System', url: 'https://www.harrison.lib.ms.us/', eventsUrl: 'https://www.harrison.lib.ms.us/', city: 'Gulfport', state: 'MS', zipCode: '39501', county: 'Harrison'},
  // Regional Libraries
  { name: 'First Regional Library', url: 'https://www.firstregional.org', eventsUrl: 'https://www.firstregional.org/events', city: 'Hernando', state: 'MS', zipCode: '38632', county: 'DeSoto'},
  { name: 'Lee-Itawamba Library System', url: 'https://www.leeitawambalibrary.org/', eventsUrl: 'https://www.leeitawambalibrary.org/events', city: 'Tupelo', state: 'MS', zipCode: '38801', county: 'Lee'},
  { name: 'Jackson-George Regional Library System', url: 'https://www.jgrls.org', eventsUrl: 'https://www.jgrls.org/events', city: 'Pascagoula', state: 'MS', zipCode: '39567', county: 'Jackson'},
  { name: 'Columbus-Lowndes Public Library', url: 'https://www.lowndeslibrary.com/', eventsUrl: 'https://www.lowndeslibrary.com/', city: 'Columbus', state: 'MS', zipCode: '39701', county: 'Lowndes'},
  { name: 'Warren County-Vicksburg Public Library', url: 'https://www.warren.lib.ms.us/', eventsUrl: 'https://www.warren.lib.ms.us/', city: 'Vicksburg', state: 'MS', zipCode: '39180', county: 'Warren'},
  { name: 'Laurel-Jones County Library', url: 'https://www.laurel.lib.ms.us', eventsUrl: 'https://www.laurel.lib.ms.us/events', city: 'Laurel', state: 'MS', zipCode: '39440', county: 'Jones'},
  { name: 'Pine Forest Regional Library', url: 'https://www.pineforest.lib.ms.us/', eventsUrl: 'https://www.pineforest.lib.ms.us/', city: 'Richton', state: 'MS', zipCode: '39476', county: 'Perry'},
  { name: 'Starkville-Oktibbeha County Public Library', url: 'https://www.starkville.lib.ms.us/', eventsUrl: 'https://www.starkville.lib.ms.us/', city: 'Starkville', state: 'MS', zipCode: '39759', county: 'Oktibbeha'},
  { name: 'Bolivar County Library System', url: 'https://www.bolivar.lib.ms.us/', eventsUrl: 'https://www.bolivar.lib.ms.us/', city: 'Cleveland', state: 'MS', zipCode: '38732', county: 'Bolivar'},
  { name: 'Pearl River County Library System', url: 'https://www.pearlriver.lib.ms.us', eventsUrl: 'https://www.pearlriver.lib.ms.us/events', city: 'Picayune', state: 'MS', zipCode: '39466', county: 'Pearl River'},
  { name: 'Lincoln-Lawrence-Franklin Regional Library', url: 'https://www.llf.lib.ms.us', eventsUrl: 'https://www.llf.lib.ms.us/events', city: 'Brookhaven', state: 'MS', zipCode: '39601', county: 'Lincoln'},
  { name: 'Dixie Regional Library System', url: 'https://dixie.lib.ms.us/', eventsUrl: 'https://dixie.lib.ms.us/', city: 'Pontotoc', state: 'MS', zipCode: '38863', county: 'Pontotoc County'},
  { name: 'Northeast Regional Library', url: 'https://www.nereg.lib.ms.us', eventsUrl: 'https://www.nereg.lib.ms.us/events', city: 'Corinth', state: 'MS', zipCode: '38834', county: 'Alcorn'},
  { name: 'Central Mississippi Regional Library System', url: 'https://www.cmrls.lib.ms.us', eventsUrl: 'https://www.cmrls.lib.ms.us/events', city: 'Kosciusko', state: 'MS', zipCode: '39090', county: 'Attala'},
  { name: 'Tombigbee Regional Library System', url: 'https://www.tombigbee.lib.ms.us/', eventsUrl: 'https://www.tombigbee.lib.ms.us/', city: 'West Point', state: 'MS', zipCode: '39773', county: 'Clay'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'William Estes Powell Memorial Library', url: 'https://www.beaumontlibrary.org', eventsUrl: 'https://www.beaumontlibrary.org/events', city: 'Beaumont', state: 'MS', zipCode: '00000', county: 'Perry'},
  { name: 'Belmont Public Library', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'MS', zipCode: '00000', county: 'Tishomingo', urlCollision: 'smcl.org is CA, not MS' },
  { name: 'A. E. Wood Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'MS', zipCode: '00000', county: 'Hinds', urlCollision: 'clintonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Columbia-Marion County Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'MS', zipCode: '00000', county: 'Marion', urlCollision: 'columbialibrary.org is IL, not MS' },
  { name: 'Crawford Public Library', url: 'https://crawfordlibrary.org/', eventsUrl: 'https://crawfordlibrary.org/', city: 'Crawford', state: 'MS', zipCode: '00000', county: 'Lowndes'},
  { name: 'Crosby Public Library', url: 'https://www.crosbylibrary.org', eventsUrl: 'https://www.crosbylibrary.org/events', city: 'Crosby', state: 'MS', zipCode: '00000', county: 'Amite'},
  // URL corrected 2026-08-11 (was decaturlibrary.org): Kemper-Newton Regional Library System Decatur Branch, phone 601-635-2777; real name is Jessie Mae Everett Public Library, 306 W Broad St Dec
  { name: 'Decatur Public Library', url: 'https://www.knrls.lib.ms.us/', eventsUrl: 'https://www.knrls.lib.ms.us/', city: 'Decatur', state: 'MS', zipCode: '00000', county: 'Newton'},
  { name: 'Dekalb Public Library', url: 'https://www.dekalblibrary.org', eventsUrl: 'https://www.dekalblibrary.org/events', city: 'Dekalb', state: 'MS', zipCode: '39328', county: 'Kemper County', urlCollision: 'dekalblibrary.org is GA, not MS' },
  { name: 'Enterprise Public Library', url: 'https://www.enterpriselibrary.org', eventsUrl: 'https://www.enterpriselibrary.org/events', city: 'Enterprise', state: 'MS', zipCode: '00000', county: 'Clarke'},
  { name: 'Florence Public Library', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'MS', zipCode: '00000', county: 'Rankin', urlCollision: 'florencelibrary.org is SC, not MS' },
  { name: 'Forest Public Library', url: 'https://www.forestlibrary.org/', eventsUrl: 'https://www.forestlibrary.org/', city: 'Forest', state: 'MS', zipCode: '00000', county: 'Scott'},
  { name: 'Itawamba County-Pratt Memorial Library', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'MS', zipCode: '00000', county: 'Itawamba'},
  // URL corrected 2026-08-11 (was hamiltonlibrary.org): Tombigbee Regional Library System branch page lists 40460 Old Highway 45 South, Hamilton MS 39746, phone 662-343-8962
  { name: 'Hamilton Public Library', url: 'https://www.tombigbee.lib.ms.us/hamilton', eventsUrl: 'https://www.tombigbee.lib.ms.us/hamilton', city: 'Hamilton', state: 'MS', zipCode: '00000', county: 'Monroe'},
  { name: 'Houston Carnegie Library', url: 'https://www.houstonlibrary.org', eventsUrl: 'https://www.houstonlibrary.org/events', city: 'Houston', state: 'MS', zipCode: '00000', county: 'Chickasaw'},
  { name: 'Leland Public Library', url: 'https://www.lelandlibrary.org', eventsUrl: 'https://www.lelandlibrary.org/events', city: 'Leland', state: 'MS', zipCode: '00000', county: 'Washington', urlCollision: 'lelandlibrary.org is MI, not MS' },
  { name: 'Lexington Public Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'MS', zipCode: '00000', county: 'Holmes', urlCollision: 'lexingtonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX), not MS. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Liberty Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'MS', zipCode: '00000', county: 'Amite'},
  { name: 'Long Beach Public Library', url: 'https://www.longbeachlibrary.org', eventsUrl: 'https://www.longbeachlibrary.org/events', city: 'Long Beach', state: 'MS', zipCode: '39560', county: 'Harrison', urlCollision: 'longbeachlibrary.org is NY, not MS' },
  // URL corrected 2026-08-11 (was louisvillelibrary.org): Mid-MS Regional Library System page gives 100 West Park Street, Louisville MS 39339, phone 662-773-3212
  { name: 'Winston County Library', url: 'https://midmisslib.com/winston/', eventsUrl: 'https://midmisslib.com/events/', city: 'Louisville', state: 'MS', zipCode: '00000', county: 'Winston'},
  { name: 'Ada S. Fant Memorial Library', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'MS', zipCode: '00000', county: 'Noxubee', urlCollision: 'maconlibrary.org is MO, not MS' },
  { name: 'Rebecca Baine Rigby Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'MS', zipCode: '00000', county: 'Madison County', urlCollision: 'madisonlibrary.org is KY, not MS' },
  { name: 'Magnolia Public Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'MS', zipCode: '00000', county: 'Pike'},
  { name: 'William And Dolores Mauldin Library', url: 'https://www.mchenrylibrary.org/', eventsUrl: 'https://www.mchenrylibrary.org/', city: 'Mchenry', state: 'MS', zipCode: '00000', county: 'Stone'},
  { name: 'Franklin County Public Library', url: 'https://www.meadvillelibrary.org', eventsUrl: 'https://www.meadvillelibrary.org/events', city: 'Meadville', state: 'MS', zipCode: '00000', county: 'Franklin', urlCollision: 'meadvillelibrary.org is PA, not MS' },
  { name: 'Lawrence County Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'MS', zipCode: '00000', county: 'Lawrence', urlCollision: 'allertonpubliclibrary.org is IL, not MS' },
  { name: 'Morton Public Library', url: 'https://mortonlibrary.org/', eventsUrl: 'https://mortonlibrary.org/', city: 'Morton', state: 'MS', zipCode: '00000', county: 'Scott', urlCollision: 'mortonlibrary.org is Morton, ILLINOIS, not Morton MS - live page shows ZIP 61550 and area code 309, and links mortonlibrary.libcal.com. There are two Mortons and this host serves the wrong one. OPEN COVERAGE GAP'},
  { name: 'J. Elliott Mcmullan Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'MS', zipCode: '00000', county: 'Newton County', urlCollision: 'newtonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'MS', zipCode: '00000', county: 'Yalobusha', urlCollision: 'oaklandlibrary.org is CA, not MS' },
  // URL corrected 2026-08-11 (was oxfordlibrary.org): 401 Bramlett Blvd Oxford MS, phone 662-234-5751; branch of First Regional Library system site
  { name: 'Lafayette County-Oxford Public Library', url: 'https://www.first.lib.ms.us', eventsUrl: 'https://www.first.lib.ms.us', city: 'Oxford', state: 'MS', zipCode: '00000', county: 'Lafayette'},
  { name: 'Clarke County-Quitman Public Library', url: 'https://www.quitmanlibrary.org/', eventsUrl: 'https://www.quitmanlibrary.org/', city: 'Quitman', state: 'MS', zipCode: '00000', county: 'Quitman County', urlCollision: 'quitmanlibrary.org is TX, not MS' },
  { name: 'Richland Public Library', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'MS', zipCode: '00000', county: 'Rankin', urlCollision: 'richlandlibrary.org is MI, not MS' },
  // URL corrected 2026-08-11 (was ripleylibrary.org): Northeast Regional Library page shows 308 Commerce St, Ripley MS 38663, phone 662-837-7773; branch is titled Ripley Library
  { name: 'Ripley Public Library', url: 'https://www.nereg.lib.ms.us/ripley-public-library/', eventsUrl: 'https://www.nereg.lib.ms.us/events', city: 'Ripley', state: 'MS', zipCode: '00000', county: 'Tippah'},
  { name: 'Field Memorial Library', url: 'https://www.shawlibrary.org/', eventsUrl: 'https://www.shawlibrary.org/', city: 'Shaw', state: 'MS', zipCode: '00000', county: 'Bolivar'},
  // REMOVED 2026-08-11 (Defect A): no verifiable official site. Bolivar County Library System branches page lists Dr. Robert T. Hollingsworth Public Library as Closed Until Further Notice; no branch site or calenda
  // RECORDED COVERAGE GAP - restore if a real URL is found.
  // { name: 'Dr. Robert T. Hollingsworth Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'MS', zipCode: '00000', county: 'Bolivar'},
  { name: 'Sherman Library', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'MS', zipCode: '00000', county: 'Pontotoc', urlCollision: 'shermanlibrary.org is CT, not MS' },
  { name: 'Kemper-Newton Regional Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'MS', zipCode: '39365', county: 'Union County', urlCollision: 'unionlibrary.org is SC, not MS' },
  { name: 'Evelyn Taylor Majure Library', url: 'https://www.uticalibrary.org', eventsUrl: 'https://www.uticalibrary.org/events', city: 'Utica', state: 'MS', zipCode: '00000', county: 'Hinds'},
  // URL corrected 2026-08-11 (was woodvillelibrary.org): Wilkinson County Library System site; Woodville branch 489 Main Street Woodville MS 39669, phone 601-888-6712
  { name: 'Woodville Public Library', url: 'https://www.wcplibrary.com', eventsUrl: 'https://www.wcplibrary.com/events', city: 'Woodville', state: 'MS', zipCode: '00000', county: 'Wilkinson'},

];

const SCRAPER_NAME = 'WordPress-MS';

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
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'MS', city: library.city, zipCode: library.zipCode }}));
        continue;
      }
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
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
            state: 'MS',
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
            state: event.state || library.state || 'MS',
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
        const eventSelectors = ['[class*="event"]', '[class*="program"]', 'article', '.post'];
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
              // Month-grid calendars (YUI3 / Weebly "yui3-calendar-grid", live on
              // drevartslibrary.org and weedsportlibrary.org) carry NEITHER a
              // data-date attribute NOR a day-header element. The day number is
              // bare text at the top of the <td>, usually behind a weekday
              // abbreviation ("Tue 4 ..."), and the month/year lives in a
              // .yui3-calendar-header-label OUTSIDE the grid table entirely, so
              // neither check above can reach it. Without this branch every event
              // on such a page arrives at the date parser as a bare clock time
              // ("5:00 PM - 6:00 PM") and is dropped: 27 of WordPress-NY's 56
              // INVALID rows on 2026-08-27 were three such libraries, losing real
              // programming like Library Littles Playgroup and Stuffed Animal
              // Sleepover. Padding cells for the previous/next month are excluded
              // so they are never dated into the month being displayed.
              const gridCls = (node.className || '').toString();
              if (node.tagName === 'TD' && /calendar[-_]?day|calendar_col/i.test(gridCls)
                  && !/prevmonth|nextmonth|othermonth/i.test(gridCls)) {
                const cellText = (node.textContent || '').replace(/\s+/g, ' ').trim();
                const dayM = /^(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s+)?(\d{1,2})\b/i.exec(cellText);
                if (dayM) {
                  let hdr = null, scope = node;
                  for (let j = 0; j < 6 && scope && !hdr; j++) {
                    hdr = scope.querySelector && scope.querySelector('[class*="calendar-header-label"], [class*="calendar-header"], caption');
                    scope = scope.parentElement;
                  }
                  if (!hdr) hdr = document.querySelector('[class*="calendar-header-label"]');
                  const hdrText = hdr ? (hdr.textContent || '').replace(/\s+/g, ' ').trim() : '';
                  const hM = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i.exec(hdrText);
                  if (hM) return hM[1] + ' ' + dayM[1] + ', ' + hM[2];
                }
              }
            }
            node = node.parentElement;
          }
          return null;
        }

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);
            try {
              const title = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], a');
              const date = card.querySelector('[class*="date"], time');
              const desc = card.querySelector('[class*="description"], p');
              const link = card.querySelector('a[href]');
              const ageEl = [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              let dateText = date ? date.textContent.trim() : '';
              if (!/[A-Za-z]{3,9}\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/.test(dateText)) {
                const ancestorDate = findAncestorDate(card);
                if (ancestorDate) dateText = dateText ? `${ancestorDate} ${dateText}` : ancestorDate;
              }

              if (title && title.textContent.trim()) {
                events.push({
                  title: title.textContent.trim(),
                  date: dateText,
                  description: desc ? desc.textContent.trim() : '',
                  url: link ? link.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                });
              }
            } catch (e) {}
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return evt.date || evt.description;
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
            state: 'MS',
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
    state: 'MS',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMSCloudFunction() {
  console.log('☁️ Running WordPress MS as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MS', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-MS', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMSCloudFunction };
