const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { tryFetchTecEvents, tryDomScrapeTecEvents } = require('./helpers/tec-rest-helper');
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
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'AL', zipCode: '35601', county: 'Morgan'},
  { name: 'Florence-Lauderdale Public Library', url: 'https://www.flpl.org/', eventsUrl: 'https://www.flpl.org/calendar/', city: 'Florence', state: 'AL', zipCode: '35630', county: 'Lauderdale'},
  { name: 'Hoover Public Library', url: 'https://www.hooverlibrary.org', eventsUrl: 'https://www.hooverlibrary.org/events', city: 'Hoover', state: 'AL', zipCode: '35244', county: 'Jefferson'},
  { name: 'Vestavia Hills Library', url: 'https://www.vestavialibrary.org', eventsUrl: 'https://www.vestavialibrary.org/events', city: 'Vestavia Hills', state: 'AL', zipCode: '35216', county: 'Jefferson'},
  { name: 'Homewood Public Library', url: 'https://www.homewoodpubliclibrary.org', eventsUrl: 'https://www.homewoodpubliclibrary.org/events', city: 'Homewood', state: 'AL', zipCode: '35209', county: 'Jefferson'},
  { name: 'Jefferson County Library Cooperative', url: 'https://www.jclc.org', eventsUrl: 'https://www.jclc.org/events', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Jefferson'},
  { name: 'Selma-Dallas County Public Library', url: 'https://selmalibrary.org/', eventsUrl: 'https://selmalibrary.org/', city: 'Selma', state: 'AL', zipCode: '36701', county: 'Dallas'},
  { name: 'Athens-Limestone Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'AL', zipCode: '35611', county: 'Limestone'},
  { name: 'Fairhope Public Library', url: 'https://fairhopelibrary.org/', eventsUrl: 'https://fairhopelibrary.org/index.php/calendar/', city: 'Fairhope', state: 'AL', zipCode: '36532', county: 'Baldwin'},
  { name: 'Daphne Public Library', url: 'http://www.daphneal.com/', eventsUrl: 'http://www.daphneal.com/178/Public-Library', city: 'Daphne', state: 'AL', zipCode: '36526', county: 'Baldwin'},
  { name: 'Scottsboro Public Library', url: 'https://scottsborolibrary.org/', eventsUrl: 'https://scottsborolibrary.org/', city: 'Scottsboro', state: 'AL', zipCode: '35768', county: 'Jackson'},
  { name: 'Troy Public Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'AL', zipCode: '36081', county: 'Pike'},
  { name: 'Pelham Public Library', url: 'https://www.pelhamlibrary.org/', eventsUrl: 'https://www.pelhamlibrary.org/calendar/', city: 'Pelham', state: 'AL', zipCode: '35124', county: 'Shelby'},
  { name: 'Trussville Public Library', url: 'https://www.trussvillelibrary.com', eventsUrl: 'https://www.trussvillelibrary.com/events', city: 'Trussville', state: 'AL', zipCode: '35173', county: 'Jefferson'},
  { name: 'Gardendale Public Library', url: 'https://www.gardendalelibrary.org', eventsUrl: 'https://www.gardendalelibrary.org/events', city: 'Gardendale', state: 'AL', zipCode: '35071', county: 'Jefferson'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Abbeville Memorial Library', url: 'https://www.abbevillelibrary.org/', eventsUrl: 'https://www.abbevillelibrary.org/', city: 'Abbeville', state: 'AL', zipCode: '36310', county: 'Henry'},
  { name: 'Akron Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'AL', zipCode: '35441', county: 'Hale'},
  { name: 'Andalusia Public Library', url: 'https://www.andalusialibrary.org/', eventsUrl: 'https://www.andalusialibrary.org/', city: 'Andalusia', state: 'AL', zipCode: '36420', county: 'Covington'},
  { name: 'Ashland City Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'AL', zipCode: '36251', county: 'Clay'},
  { name: 'Bridgeport - Lena Cagle Public Library', url: 'https://www.bridgeportlibrary.org/', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'AL', zipCode: '35740', county: 'Jackson'},
  { name: 'Choctaw County Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'AL', zipCode: '36904', county: 'Butler County'},
  { name: 'Wilcox County Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'AL', zipCode: '36726', county: 'Wilcox'},
  { name: 'Chelsea Public Library', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'AL', zipCode: '35043', county: 'Shelby'},
  { name: 'Clayton Town And County Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'AL', zipCode: '36016', county: 'Barbour'},
  { name: 'Collinsville Public Library', url: 'https://www.collinsvillelibrary.org', eventsUrl: 'https://www.collinsvillelibrary.org/events', city: 'Collinsville', state: 'AL', zipCode: '35961', county: 'DeKalb'},
  { name: 'Houston-Love Memorial Library - Columbia', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'AL', zipCode: '36319', county: 'Houston'},
  { name: 'Cordova Public Library', url: 'https://cordovalibrary.org/', eventsUrl: 'https://cordovalibrary.org/', city: 'Cordova', state: 'AL', zipCode: '35550', county: 'Walker'},
  { name: 'Daleville Public Library', url: 'https://www.dalevillelibrary.org', eventsUrl: 'https://www.dalevillelibrary.org/events', city: 'Daleville', state: 'AL', zipCode: '36322', county: 'Dale'},
  { name: 'Walter J. Hanna Memorial Library', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'AL', zipCode: '35064', county: 'Jefferson'},
  { name: 'Fayette County Memorial Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'AL', zipCode: '35555', county: 'Fayette County'},
  { name: 'Foley Public Library', url: 'https://www.foleylibrary.org/', eventsUrl: 'https://www.foleylibrary.org/', city: 'Foley', state: 'AL', zipCode: '36535', county: 'Baldwin'},
  { name: 'Grant Public Library', url: 'https://www.grantlibrary.org', eventsUrl: 'https://www.grantlibrary.org/events', city: 'Grant', state: 'AL', zipCode: '35747', county: 'Marshall'},
  { name: 'Hale County Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'AL', zipCode: '36744', county: 'Hale'},
  { name: 'Butler County Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'AL', zipCode: '36037', county: 'Butler'},
  { name: 'Guntersville Public Library', url: 'https://www.guntersvillelibrary.org', eventsUrl: 'https://www.guntersvillelibrary.org/events', city: 'Guntersville', state: 'AL', zipCode: '35976', county: 'Marshall'},
  { name: 'Clyde Nix Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'AL', zipCode: '35570', county: 'Marion'},
  { name: 'Hartford - Mcgregor-Mckinney Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'AL', zipCode: '36344', county: 'Geneva'},
  { name: 'Blanche R. Solomon Memorial Library', url: 'https://www.headlandlibrary.org/', eventsUrl: 'https://www.headlandlibrary.org/', city: 'Headland', state: 'AL', zipCode: '36345', county: 'Henry'},
  { name: 'Jane B. Holmes Public Library', url: 'https://www.lclibrary.org/', eventsUrl: 'https://www.lclibrary.org/', city: 'Helena', state: 'AL', zipCode: '35080', county: 'Shelby'},
  { name: 'Hueytown Public Library', url: 'https://www.hueytownlibrary.org/', eventsUrl: 'https://www.hueytownlibrary.org/', city: 'Hueytown', state: 'AL', zipCode: '35023', county: 'Jefferson'},
  { name: 'Irondale Public Library', url: 'https://www.irondalelibrary.org', eventsUrl: 'https://www.irondalelibrary.org/events', city: 'Irondale', state: 'AL', zipCode: '35210', county: 'Jefferson'},
  { name: 'City Of Bayou La Batre Public Library', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'AL', zipCode: '36509', county: 'Limestone'},
  { name: 'Kennedy Public Library', url: 'https://www.kennedylibrary.org', eventsUrl: 'https://www.kennedylibrary.org/events', city: 'Kennedy', state: 'AL', zipCode: '35574', county: 'Lamar'},
  { name: 'Lafayette Pilot Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'AL', zipCode: '36862', county: 'Chambers'},
  { name: 'Jane Culbreth Library', url: 'https://www.leedslibrary.org', eventsUrl: 'https://www.leedslibrary.org/events', city: 'Leeds', state: 'AL', zipCode: '35094', county: 'Jefferson'},
  { name: 'Leighton Public Library', url: 'https://www.leightonlibrary.org/', eventsUrl: 'https://www.leightonlibrary.org/news-events/library-events', city: 'Leighton', state: 'AL', zipCode: '35646', county: 'Colbert'},
  { name: 'Burchell Campbell Memorial Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'AL', zipCode: '35648', county: 'Lauderdale'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'AL', zipCode: '35096', county: 'Talladega'},
  { name: 'Ruby Pickens Tartt Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'AL', zipCode: '35470', county: 'Sumter'},
  { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'AL', zipCode: '36048', county: 'Barbour'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'AL', zipCode: '35758', county: 'Madison County'},
  { name: 'Marion-Perry County Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'AL', zipCode: '36756', county: 'Marion County'},
  { name: 'Millbrook Public Library', url: 'https://millbrooklibrary.org/', eventsUrl: 'https://millbrooklibrary.org/', city: 'Millbrook', state: 'AL', zipCode: '36054', county: 'Elmore'},
  { name: 'Monroe County Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'AL', zipCode: '36460', county: 'Monroe'},
  { name: 'Doris Stanley Memorial Library', url: 'https://moodylibrary.org/', eventsUrl: 'https://moodylibrary.org/calendar', city: 'Moody', state: 'AL', zipCode: '35004', county: 'St. Clair'},
  { name: 'Newton Public Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'AL', zipCode: '36352', county: 'Dale'},
  { name: 'Opp Public Library', url: 'https://www.opplibrary.org', eventsUrl: 'https://www.opplibrary.org/events', city: 'Opp', state: 'AL', zipCode: '36467', county: 'Covington'},
  { name: 'Orange Beach Public Library', url: 'https://www.orangebeachlibrary.org', eventsUrl: 'https://www.orangebeachlibrary.org/events', city: 'Orange Beach', state: 'AL', zipCode: '36561', county: 'Baldwin'},
  { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'AL', zipCode: '36203', county: 'Calhoun'},
  { name: 'Piedmont Public Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'AL', zipCode: '36272', county: 'Calhoun'},
  { name: 'Pine Hill Branch Public Library', url: 'https://pinehilllibrary.org/', eventsUrl: 'https://pinehilllibrary.org/calendar/', city: 'Pine Hill', state: 'AL', zipCode: '36769', county: 'Wilcox'},
  { name: 'Clay Public Library', url: 'https://www.pinsonlibrary.org', eventsUrl: 'https://www.pinsonlibrary.org/events', city: 'Pinson', state: 'AL', zipCode: '35126', county: 'Jefferson'},
  { name: 'Satsuma Public Library', url: 'https://www.satsumalibrary.com/', eventsUrl: 'https://www.satsumalibrary.com/upcoming-events', city: 'Satsuma', state: 'AL', zipCode: '36572', county: 'Mobile'},
  { name: 'Evergreen Public Library', url: 'https://www.evergreenlibrary.org', eventsUrl: 'https://www.evergreenlibrary.org/events', city: 'Evergreen', state: 'AL', zipCode: '36401', county: 'Conecuh'},
  { name: 'Sheffield Public Library', url: 'https://www.sheffieldlibrary.org/', eventsUrl: 'https://www.sheffieldlibrary.org/', city: 'Sheffield', state: 'AL', zipCode: '35660', county: 'Colbert'},
  { name: 'Somerville Public Library', url: 'https://www.somervillelibrary.org/', eventsUrl: 'https://www.somervillelibrary.org/', city: 'Somerville', state: 'AL', zipCode: '35670', county: 'Morgan'},
  { name: 'Stevenson Public Library', url: 'https://www.stevensonlibrary.org', eventsUrl: 'https://www.stevensonlibrary.org/events', city: 'Stevenson', state: 'AL', zipCode: '35772', county: 'Jackson'},
  { name: 'H. Grady Bradshaw - Chambers County Library', url: 'https://www.valleylibrary.org/', eventsUrl: 'https://www.valleylibrary.org/', city: 'Valley', state: 'AL', zipCode: '36854', county: 'Chambers'},
  { name: 'Vernon - Mary Wallace Cobb Memorial Library', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'AL', zipCode: '35592', county: 'Lamar'},
  { name: 'Warrior Public Library', url: 'https://www.warriorlibrary.org', eventsUrl: 'https://www.warriorlibrary.org/events', city: 'Warrior', state: 'AL', zipCode: '35180', county: 'Jefferson'},
  { name: 'Wilsonville - Vernice Stoudenmire Library', url: 'https://www.wilsonvillelibrary.org', eventsUrl: 'https://www.wilsonvillelibrary.org/events', city: 'Wilsonville', state: 'AL', zipCode: '35186', county: 'Shelby'},
  { name: 'Northwest Regional Library', url: 'https://www.winfieldlibrary.org/', eventsUrl: 'https://www.winfieldlibrary.org/', city: 'Winfield', state: 'AL', zipCode: '35594', county: 'Marion'},
  { name: 'Woodville Public Library', url: 'https://www.woodvillelibrary.org', eventsUrl: 'https://www.woodvillelibrary.org/events', city: 'Woodville', state: 'AL', zipCode: '35776', county: 'Jackson'}

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

      const libraryEvents = await page.evaluate((libName) => {
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
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
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
