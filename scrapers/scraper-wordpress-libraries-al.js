// 7 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
 * Alabama Public Libraries Scraper
 * State: AL
 * Libraries:
 * - Birmingham Public Library (200K)
 * - Huntsville-Madison County Public Library (450K)
 * - Mobile Public Library (200K)
 * - Montgomery City-County Public Library (230K)
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Birmingham Public Library', url: 'https://www.cobpl.org', eventsUrl: 'https://www.cobpl.org/calendar/', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Jefferson'},
  { name: 'Huntsville-Madison County Public Library', url: 'https://www.hmcpl.org', eventsUrl: 'https://www.hmcpl.org/events', city: 'Huntsville', state: 'AL', zipCode: '35801', county: 'Madison'},
  { name: 'Mobile Public Library', url: 'https://www.mplonline.org', eventsUrl: 'https://www.mplonline.org/events', city: 'Mobile', state: 'AL', zipCode: '36602', county: 'Mobile County'},
  { name: 'Montgomery City-County Public Library', url: 'https://www.mccpl.lib.al.us', eventsUrl: 'https://www.mccpl.lib.al.us/events', city: 'Montgomery', state: 'AL', zipCode: '36104', county: 'Montgomery County'},
  // Regional Libraries
  { name: 'Tuscaloosa Public Library', url: 'https://www.tuscaloosa-library.org', eventsUrl: 'https://www.tuscaloosa-library.org/events', city: 'Tuscaloosa', state: 'AL', zipCode: '35401', county: 'Tuscaloosa County'},
  { name: 'Auburn Public Library', url: 'https://www.auburnal.gov/', eventsUrl: 'https://www.auburnal.gov/library/', city: 'Auburn', state: 'AL', zipCode: '36830', county: 'Lee'},
  { name: 'Dothan Houston County Library System', url: 'https://www.dhcls.org', eventsUrl: 'https://www.dhcls.org/events', city: 'Dothan', state: 'AL', zipCode: '36301', county: 'Houston'},
  // URL corrected 2026-08-11 (was decaturlibrary.org): Site shows 504 Cherry Street, Decatur AL 35601, phone 256-353-2993 (Morgan County)
  { name: 'Decatur Public Library', url: 'https://mydpl.org', eventsUrl: 'https://mydpl.org/event/', city: 'Decatur', state: 'AL', zipCode: '35601', county: 'Morgan'},
  { name: 'Florence-Lauderdale Public Library', url: 'https://www.flpl.org/', eventsUrl: 'https://www.flpl.org/calendar/', city: 'Florence', state: 'AL', zipCode: '35630', county: 'Lauderdale'},
  { name: 'Hoover Public Library', url: 'https://www.hooverlibrary.org', eventsUrl: 'https://www.hooverlibrary.org/events', city: 'Hoover', state: 'AL', zipCode: '35244', county: 'Jefferson'},
  { name: 'Vestavia Hills Library', url: 'https://www.vestavialibrary.org', eventsUrl: 'https://www.vestavialibrary.org/events', city: 'Vestavia Hills', state: 'AL', zipCode: '35216', county: 'Jefferson'},
  { name: 'Homewood Public Library', url: 'https://www.homewoodpubliclibrary.org', eventsUrl: 'https://www.homewoodpubliclibrary.org/events', city: 'Homewood', state: 'AL', zipCode: '35209', county: 'Jefferson'},
  { name: 'Jefferson County Library Cooperative', url: 'https://www.jclc.org', eventsUrl: 'https://www.jclc.org/events', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Jefferson'},
  { name: 'Selma-Dallas County Public Library', url: 'https://selmalibrary.org/', eventsUrl: 'https://selmalibrary.org/', city: 'Selma', state: 'AL', zipCode: '36701', county: 'Dallas'},
  // URL corrected 2026-08-11 (was athenslibrary.org): 603 S Jefferson St Athens AL 35611, phone 256-232-1233; events run on The Events Calendar
  { name: 'Athens-Limestone Public Library', url: 'https://www.alcpl.org', eventsUrl: 'https://www.alcpl.org/events/list/', city: 'Athens', state: 'AL', zipCode: '35611', county: 'Limestone'},
  { name: 'Fairhope Public Library', url: 'https://fairhopelibrary.org/', eventsUrl: 'https://fairhopelibrary.org/index.php/calendar/', city: 'Fairhope', state: 'AL', zipCode: '36532', county: 'Baldwin'},
  { name: 'Daphne Public Library', url: 'http://www.daphneal.com/', eventsUrl: 'http://www.daphneal.com/178/Public-Library', city: 'Daphne', state: 'AL', zipCode: '36526', county: 'Baldwin'},
  { name: 'Scottsboro Public Library', url: 'https://scottsborolibrary.org/', eventsUrl: 'https://scottsborolibrary.org/', city: 'Scottsboro', state: 'AL', zipCode: '35768', county: 'Jackson'},
  { name: 'Trussville Public Library', url: 'https://www.trussvillelibrary.com', eventsUrl: 'https://www.trussvillelibrary.com/events', city: 'Trussville', state: 'AL', zipCode: '35173', county: 'Jefferson'},
  { name: 'Gardendale Public Library', url: 'https://www.gardendalelibrary.org', eventsUrl: 'https://www.gardendalelibrary.org/events', city: 'Gardendale', state: 'AL', zipCode: '35071', county: 'Jefferson'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Abbeville Memorial Library', url: 'https://www.abbevillelibrary.org/', eventsUrl: 'https://www.abbevillelibrary.org/', city: 'Abbeville', state: 'AL', zipCode: '36310', county: 'Henry'},
  { name: 'Akron Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'AL', zipCode: '35441', county: 'Hale', urlCollision: 'akronlibrary.org is OH, not AL' },
  { name: 'Andalusia Public Library', url: 'https://www.andalusialibrary.org/', eventsUrl: 'https://www.andalusialibrary.org/', city: 'Andalusia', state: 'AL', zipCode: '36420', county: 'Covington'},
  { name: 'Bridgeport - Lena Cagle Public Library', url: 'https://www.bridgeportlibrary.org/', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'AL', zipCode: '35740', county: 'Jackson', urlCollision: 'bridgeportlibrary.org is MI, not AL' },
  { name: 'Choctaw County Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'AL', zipCode: '36904', county: 'Butler County', urlCollision: 'butlerlibrary.org is NJ, not AL' },
  { name: 'Wilcox County Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'AL', zipCode: '36726', county: 'Wilcox', urlCollision: 'camdenlibrary.org is MI, not AL' },
  { name: 'Chelsea Public Library', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'AL', zipCode: '35043', county: 'Shelby', urlCollision: 'chelsealibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // REMOVED 2026-08-11 (Defect A): no verifiable official site. Real name Town and County Library, 45 N Midway St Clayton AL 36016, 334-775-3506, Barbour County - only a Facebook page exists, no official website
  // RECORDED COVERAGE GAP - restore if a real URL is found.
  // { name: 'Clayton Town And County Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'AL', zipCode: '36016', county: 'Barbour'},
  { name: 'Collinsville Public Library', url: 'https://www.collinsvillelibrary.org', eventsUrl: 'https://www.collinsvillelibrary.org/events', city: 'Collinsville', state: 'AL', zipCode: '35961', county: 'DeKalb'},
  { name: 'Houston-Love Memorial Library - Columbia', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'AL', zipCode: '36319', county: 'Houston', urlCollision: 'columbialibrary.org is IL, not AL' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in AK, not AL. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Cordova Public Library', url: 'https://cordovalibrary.org/', eventsUrl: 'https://cordovalibrary.org/', city: 'Cordova', state: 'AL', zipCode: '35550', county: 'Walker'},
  { name: 'Daleville Public Library', url: 'https://www.dalevillelibrary.org', eventsUrl: 'https://www.dalevillelibrary.org/events', city: 'Daleville', state: 'AL', zipCode: '36322', county: 'Dale'},
  // URL corrected 2026-08-11 (was fairfieldlibrary.org): Site titled Walter J Hanna (Fairfield) Public Library, Gary Avenue Fairfield AL 35064, phone 205-783-6007
  { name: 'Walter J. Hanna Memorial Library', url: 'https://fairfield.lib.al.us', eventsUrl: 'https://fairfield.lib.al.us', city: 'Fairfield', state: 'AL', zipCode: '35064', county: 'Jefferson'},
  { name: 'Foley Public Library', url: 'https://www.foleylibrary.org/', eventsUrl: 'https://www.foleylibrary.org/', city: 'Foley', state: 'AL', zipCode: '36535', county: 'Baldwin'},
  { name: 'Grant Public Library', url: 'https://www.grantlibrary.org', eventsUrl: 'https://www.grantlibrary.org/events', city: 'Grant', state: 'AL', zipCode: '35747', county: 'Marshall'},
  { name: 'Hale County Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'AL', zipCode: '36744', county: 'Hale', urlCollision: 'greensborolibrary.org is NC, not AL' },
  { name: 'Butler County Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'AL', zipCode: '36037', county: 'Butler', urlCollision: 'greenvillelibrary.org is SC, not AL' },
  { name: 'Guntersville Public Library', url: 'https://www.guntersvillelibrary.org', eventsUrl: 'https://www.guntersvillelibrary.org/events', city: 'Guntersville', state: 'AL', zipCode: '35976', county: 'Marshall'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in NY, not AL. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Clyde Nix Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'AL', zipCode: '35570', county: 'Marion'},
  { name: 'Hartford - Mcgregor-Mckinney Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'AL', zipCode: '36344', county: 'Geneva', urlCollision: 'hartfordlibrary.org is WI, not AL' },
  { name: 'Blanche R. Solomon Memorial Library', url: 'https://www.headlandlibrary.org/', eventsUrl: 'https://www.headlandlibrary.org/', city: 'Headland', state: 'AL', zipCode: '36345', county: 'Henry'},
  { name: 'Jane B. Holmes Public Library', url: 'https://www.lclibrary.org/', eventsUrl: 'https://www.lclibrary.org/', city: 'Helena', state: 'AL', zipCode: '35080', county: 'Shelby'},
  { name: 'Hueytown Public Library', url: 'https://www.hueytownlibrary.org/', eventsUrl: 'https://www.hueytownlibrary.org/', city: 'Hueytown', state: 'AL', zipCode: '35023', county: 'Jefferson'},
  { name: 'Irondale Public Library', url: 'https://www.irondalelibrary.org', eventsUrl: 'https://www.irondalelibrary.org/events', city: 'Irondale', state: 'AL', zipCode: '35210', county: 'Jefferson'},
  // URL corrected 2026-08-11 (was irvingtonlibrary.org): City of Bayou La Batre Public Library, 12747 Padgett Switch Rd Irvington AL 36544, phone 251-824-4213. No calendar page, events via Facebook
  { name: 'City Of Bayou La Batre Public Library', url: 'https://www.cityofbayoulabatre.com/departments/public_library/index.php', eventsUrl: 'https://www.cityofbayoulabatre.com/departments/public_library/index.php', city: 'Irvington', state: 'AL', zipCode: '36509', county: 'Limestone'},
  { name: 'Kennedy Public Library', url: 'https://www.kennedylibrary.org', eventsUrl: 'https://www.kennedylibrary.org/events', city: 'Kennedy', state: 'AL', zipCode: '35574', county: 'Lamar', urlCollision: 'kennedylibrary.org is MA, not AL' },
  // URL corrected 2026-08-11 (was lafayettelibrary.org): Chambers County Library system site lists LaFayette Library, LaFayette AL, phone 334-864-0012 matching this entry. Site name is LaFayette Li
  { name: 'Lafayette Pilot Public Library', url: 'https://chamberscountylibrary.org', eventsUrl: 'https://chamberscountylibrary.org/calendar/', city: 'Lafayette', state: 'AL', zipCode: '36862', county: 'Chambers'},
  { name: 'Jane Culbreth Library', url: 'https://www.leedslibrary.org', eventsUrl: 'https://www.leedslibrary.org/events', city: 'Leeds', state: 'AL', zipCode: '35094', county: 'Jefferson'},
  { name: 'Leighton Public Library', url: 'https://www.leightonlibrary.org/', eventsUrl: 'https://www.leightonlibrary.org/news-events/library-events', city: 'Leighton', state: 'AL', zipCode: '35646', county: 'Colbert'},
  { name: 'Burchell Campbell Memorial Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'AL', zipCode: '35648', county: 'Lauderdale', urlCollision: 'lexingtonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Ruby Pickens Tartt Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'AL', zipCode: '35470', county: 'Sumter', urlCollision: 'livingstonlibrary.org is NJ, not AL' },
  // REMOVED 2026-08-11 (Defect A): no verifiable official site. Library exists at 1951 Main St, Louisville AL 36048, phone 334-266-5210 per library directories, but no official website; town site louisvillealabama.
  // RECORDED COVERAGE GAP - restore if a real URL is found.
  // { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'AL', zipCode: '36048', county: 'Barbour'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'AL', zipCode: '35758', county: 'Madison County', urlCollision: 'madisonlibrary.org is KY, not AL' },
  { name: 'Marion-Perry County Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'AL', zipCode: '36756', county: 'Marion County', urlCollision: 'marionlibrary.org is OH, not AL' },
  { name: 'Millbrook Public Library', url: 'https://millbrooklibrary.org/', eventsUrl: 'https://millbrooklibrary.org/', city: 'Millbrook', state: 'AL', zipCode: '36054', county: 'Elmore', urlCollision: 'millbrooklibrary.org is NY, not AL' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in PA, not AL. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Monroe County Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'AL', zipCode: '36460', county: 'Monroe'},
  { name: 'Doris Stanley Memorial Library', url: 'https://moodylibrary.org/', eventsUrl: 'https://moodylibrary.org/calendar', city: 'Moody', state: 'AL', zipCode: '35004', county: 'St. Clair'},
  { name: 'Newton Public Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'AL', zipCode: '36352', county: 'Dale', urlCollision: 'newtonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Opp Public Library', url: 'https://www.opplibrary.org', eventsUrl: 'https://www.opplibrary.org/events', city: 'Opp', state: 'AL', zipCode: '36467', county: 'Covington'},
  { name: 'Orange Beach Public Library', url: 'https://www.orangebeachlibrary.org', eventsUrl: 'https://www.orangebeachlibrary.org/events', city: 'Orange Beach', state: 'AL', zipCode: '36561', county: 'Baldwin'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in WI, not AL. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'AL', zipCode: '36203', county: 'Calhoun'},
  { name: 'Piedmont Public Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'AL', zipCode: '36272', county: 'Calhoun', urlCollision: 'piedmontlibrary.org is OK, not AL' },
  { name: 'Clay Public Library', url: 'https://www.pinsonlibrary.org', eventsUrl: 'https://www.pinsonlibrary.org/events', city: 'Pinson', state: 'AL', zipCode: '35126', county: 'Jefferson'},
  { name: 'Satsuma Public Library', url: 'https://www.satsumalibrary.com/', eventsUrl: 'https://www.satsumalibrary.com/upcoming-events', city: 'Satsuma', state: 'AL', zipCode: '36572', county: 'Mobile'},
  { name: 'Evergreen Public Library', url: 'https://www.evergreenlibrary.org', eventsUrl: 'https://www.evergreenlibrary.org/events', city: 'Evergreen', state: 'AL', zipCode: '36401', county: 'Conecuh'},
  { name: 'Sheffield Public Library', url: 'https://www.sheffieldlibrary.org/', eventsUrl: 'https://www.sheffieldlibrary.org/', city: 'Sheffield', state: 'AL', zipCode: '35660', county: 'Colbert', urlCollision: 'sheffieldlibrary.org is PA, not AL' },
  { name: 'Stevenson Public Library', url: 'https://www.stevensonlibrary.org', eventsUrl: 'https://www.stevensonlibrary.org/events', city: 'Stevenson', state: 'AL', zipCode: '35772', county: 'Jackson'},
  { name: 'H. Grady Bradshaw - Chambers County Library', url: 'https://www.valleylibrary.org/', eventsUrl: 'https://www.valleylibrary.org/', city: 'Valley', state: 'AL', zipCode: '36854', county: 'Chambers'},
  { name: 'Vernon - Mary Wallace Cobb Memorial Library', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'AL', zipCode: '35592', county: 'Lamar', urlCollision: 'vernonlibrary.org is TX, not AL' },
  { name: 'Warrior Public Library', url: 'https://www.warriorlibrary.org', eventsUrl: 'https://www.warriorlibrary.org/events', city: 'Warrior', state: 'AL', zipCode: '35180', county: 'Jefferson'},
  { name: 'Wilsonville - Vernice Stoudenmire Library', url: 'https://www.wilsonvillelibrary.org', eventsUrl: 'https://www.wilsonvillelibrary.org/events', city: 'Wilsonville', state: 'AL', zipCode: '35186', county: 'Shelby'},
  // URL corrected 2026-08-11 (was winfieldlibrary.org): 185 Ashwood Dr Winfield AL 35594, ph 205-487-2330, serves Marion, Franklin and Lamar Counties AL
  { name: 'Northwest Regional Library', url: 'https://northwestregional.net/', eventsUrl: 'https://northwestregional.net/events/', city: 'Winfield', state: 'AL', zipCode: '35594', county: 'Marion'},
  // REMOVED 2026-08-11 (Defect A): no verifiable official site. 26 Venson Street Woodville AL 35776, phone 256-776-2796, Jackson County - library has only a Facebook page, no official website found
  // RECORDED COVERAGE GAP - restore if a real URL is found.
  // { name: 'Woodville Public Library', url: 'https://www.woodvillelibrary.org', eventsUrl: 'https://www.woodvillelibrary.org/events', city: 'Woodville', state: 'AL', zipCode: '35776', county: 'Jackson'}

  // 2026-08-05: 'Hightower Memorial Library' (York, AL 36925) removed. Its configured URL
  // https://yorklibrary.org/ serves Kilgore Memorial Library in York, NEBRASKA — verified live.
  // No official website for the Alabama library could be found; its only web presence is a
  // Facebook page, which this scraper cannot read. Left out rather than pointed at a wrong-state
  // domain, because broadening extraction would otherwise ingest Nebraska events as Alabama.
  // Documented as a coverage gap in reports/fix-notes.json.
];

const SCRAPER_NAME = 'wordpress-AL';

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
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', platform: 'generic', state: 'AL', city: library.city, zipCode: library.zipCode, needsReview: true }}));
        continue;
      }

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

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
            state: 'AL',
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
            state: event.state || library.state || 'AL',
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
            platform: 'generic',
            state: 'AL',
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
    state: 'AL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Alabama Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressALCloudFunction() {
  console.log('☁️ Running WordPress AL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-AL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-AL', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressALCloudFunction };
