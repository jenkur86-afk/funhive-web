const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Georgia Public Libraries Scraper - Coverage: All Georgia public libraries
 */
const LIBRARIES = [
  { name: 'Wilcox County Public Library', url: 'https://www.abbevillelibrary.org/', eventsUrl: 'https://www.abbevillelibrary.org/', city: 'Abbeville', state: 'GA', zipCode: '00000', county: 'Abbeville County'},
  { name: 'Wheeler County Library', url: 'https://www.alamolibrary.org', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'GA', zipCode: '00000', county: 'Alamo County'},
  { name: 'Alma-Bacon County Public Library', url: 'https://www.almalibrary.org', eventsUrl: 'https://www.almalibrary.org/events', city: 'Alma', state: 'GA', zipCode: '00000', county: 'Alma County'},
  { name: 'Athens Regional Library System', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'GA', zipCode: '30606', county: 'Athens County'},
  { name: 'Auburn Library', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'GA', zipCode: '00000', county: 'Auburn County'},
  { name: 'Appleby Branch', url: 'https://www.augustalibrary.org', eventsUrl: 'https://www.augustalibrary.org/events', city: 'Augusta', state: 'GA', zipCode: '00000', county: 'Augusta County'},
  { name: 'Decatur County - Gilbert H. Gragg Library', url: 'https://www.bainbridgelibrary.org', eventsUrl: 'https://www.bainbridgelibrary.org/events', city: 'Bainbridge', state: 'GA', zipCode: '00000', county: 'Bainbridge County'},
  { name: 'Berlin Community Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'GA', zipCode: '00000', county: 'Berlin County'},
  { name: 'Boston Carnegie Library', url: 'https://www.bostonlibrary.org', eventsUrl: 'https://www.bostonlibrary.org/events', city: 'Boston', state: 'GA', zipCode: '00000', county: 'Boston County'},
  { name: 'Bowman Branch', url: 'https://www.bowmanlibrary.org', eventsUrl: 'https://www.bowmanlibrary.org/events', city: 'Bowman', state: 'GA', zipCode: '00000', county: 'Bowman County'},
  { name: 'Warren P. Sewell Memorial Library-Bremen', url: 'https://www.bremenlibrary.org', eventsUrl: 'https://www.bremenlibrary.org/events', city: 'Bremen', state: 'GA', zipCode: '00000', county: 'Bremen County'},
  { name: 'Brunswick Glynn County Regional Library', url: 'https://www.brunswicklibrary.org', eventsUrl: 'https://www.brunswicklibrary.org/events', city: 'Brunswick', state: 'GA', zipCode: '00000', county: 'Brunswick County'},
  { name: 'Marion County Library', url: 'https://www.buenavistalibrary.org', eventsUrl: 'https://www.buenavistalibrary.org/events', city: 'Buena Vista', state: 'GA', zipCode: '00000', county: 'Buena Vista County'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'GA', zipCode: '00000', county: 'Butler County'},
  { name: 'Byron Public Library', url: 'https://www.byronlibrary.org', eventsUrl: 'https://www.byronlibrary.org/events', city: 'Byron', state: 'GA', zipCode: '00000', county: 'Byron County'},
  { name: 'Roddenbery Memorial Library System', url: 'https://cairolibrary.org/', eventsUrl: 'https://cairolibrary.org/calendar/', city: 'Cairo', state: 'GA', zipCode: '39828', county: 'Cairo County'},
  { name: 'Hickory Flat Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'GA', zipCode: '00000', county: 'Canton County'},
  { name: 'Cedartown Library', url: 'https://www.cedartownlibrary.org/', eventsUrl: 'https://www.cedartownlibrary.org/', city: 'Cedartown', state: 'GA', zipCode: '00000', county: 'Cedartown County'},
  { name: 'Centerville Branch Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'GA', zipCode: '00000', county: 'Centerville County'},
  { name: 'Clarkesville-Habersham Co. Lib.', url: 'https://clarkesvillelibrary.org/', eventsUrl: 'https://clarkesvillelibrary.org/library-events', city: 'Clarkesville', state: 'GA', zipCode: '00000', county: 'Clarkesville County'},
  { name: 'Clarkston Branch', url: 'https://www.clarkstonlibrary.org', eventsUrl: 'https://www.clarkstonlibrary.org/events', city: 'Clarkston', state: 'GA', zipCode: '00000', county: 'Clarkston County'},
  { name: 'Rabun Co. Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'GA', zipCode: '00000', county: 'Clayton County'},
  { name: 'Clermont Library', url: 'https://www.clermontlibrary.org/', eventsUrl: 'https://www.clermontlibrary.org/', city: 'Clermont', state: 'GA', zipCode: '00000', county: 'Clermont County'},
  { name: 'White County Public Library-Cleveland Branch', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'GA', zipCode: '00000', county: 'Cleveland County'},
  { name: 'Chattahoochee Valley Regional Library System', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'GA', zipCode: '31906', county: 'Columbus County'},
  { name: 'Commerce Public Library', url: 'https://www.commercelibrary.org/', eventsUrl: 'https://www.commercelibrary.org/', city: 'Commerce', state: 'GA', zipCode: '00000', county: 'Commerce County'},
  { name: 'Coolidge Public Library', url: 'https://www.coolidgelibrary.org', eventsUrl: 'https://www.coolidgelibrary.org/events', city: 'Coolidge', state: 'GA', zipCode: '00000', county: 'Coolidge County'},
  { name: 'Cornelia-Habersham Co. Lib.', url: 'https://www.cornelialibrary.org', eventsUrl: 'https://www.cornelialibrary.org/events', city: 'Cornelia', state: 'GA', zipCode: '00000', county: 'Cornelia County'},
  { name: 'New Georgia Public Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'GA', zipCode: '00000', county: 'Dallas County'},
  { name: 'Dalton-Whitfield County Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'GA', zipCode: '00000', county: 'Dalton County'},
  { name: 'Ida Hilton Public Library', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'GA', zipCode: '00000', county: 'Darien County'},
  { name: 'Covington Branch', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'GA', zipCode: '00000', county: 'Decatur County'},
  { name: 'Douglas-Coffee County Public Library', url: 'https://douglaslibrary.org/', eventsUrl: 'https://douglaslibrary.org/', city: 'Douglas', state: 'GA', zipCode: '00000', county: 'Douglas County'},
  { name: 'Laurens County Library', url: 'https://www.dublinlibrary.org/', eventsUrl: 'https://www.dublinlibrary.org/', city: 'Dublin', state: 'GA', zipCode: '00000', county: 'Dublin County'},
  { name: 'Duluth', url: 'https://duluthlibrary.org/', eventsUrl: 'https://duluthlibrary.org/', city: 'Duluth', state: 'GA', zipCode: '00000', county: 'Duluth County'},
  { name: 'Gibbs Memorial Library', url: 'https://www.evanslibrary.org', eventsUrl: 'https://www.evanslibrary.org/events', city: 'Evans', state: 'GA', zipCode: '00000', county: 'Evans County'},
  { name: 'Fayette County Public Library', url: 'https://www.fayettevillelibrary.org', eventsUrl: 'https://www.fayettevillelibrary.org/events', city: 'Fayetteville', state: 'GA', zipCode: '00000', county: 'Fayetteville County'},
  { name: 'Monroe County Library', url: 'https://www.forsythlibrary.org', eventsUrl: 'https://www.forsythlibrary.org/events', city: 'Forsyth', state: 'GA', zipCode: '00000', county: 'Forsyth County'},
  { name: 'Heard County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'GA', zipCode: '00000', county: 'Franklin County'},
  { name: 'Gordon Public Library', url: 'https://gordonlibrary.org/', eventsUrl: 'https://gordonlibrary.org/', city: 'Gordon', state: 'GA', zipCode: '00000', county: 'Gordon County'},
  { name: 'Grantville Public Library', url: 'https://cowt.ent.sirsi.net/', eventsUrl: 'https://cowt.ent.sirsi.net/client/en_US/default/', city: 'Grantville', state: 'GA', zipCode: '00000', county: 'Grantville County'},
  { name: 'Greene County Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'GA', zipCode: '00000', county: 'Greensboro County'},
  { name: 'Greenville Area Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'GA', zipCode: '00000', county: 'Greenville County'},
  { name: 'Harris County Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'GA', zipCode: '00000', county: 'Hamilton County'},
  { name: 'Banks County Public Library', url: 'https://www.homerlibrary.org', eventsUrl: 'https://www.homerlibrary.org/events', city: 'Homer', state: 'GA', zipCode: '00000', county: 'Homer County'},
  { name: 'Wayne County Library', url: 'https://www.jesuplibrary.org', eventsUrl: 'https://www.jesuplibrary.org/events', city: 'Jesup', state: 'GA', zipCode: '00000', county: 'Jesup County'},
  { name: 'Cherokee Regional Library System', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'GA', zipCode: '30728', county: 'Lafayette County'},
  { name: 'Lagrange Memorial Library', url: 'https://lagrangelibrary.org/', eventsUrl: 'https://lagrangelibrary.org/', city: 'Lagrange', state: 'GA', zipCode: '00000', county: 'Lagrange County'},
  { name: 'Miller Lakeland Library', url: 'https://llcoop.org/', eventsUrl: 'https://llcoop.org/calendar/', city: 'Lakeland', state: 'GA', zipCode: '00000', county: 'Lakeland County'},
  { name: 'Oglethorpe County Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'GA', zipCode: '00000', county: 'Lexington County'},
  { name: 'Jefferson County Library System', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'GA', zipCode: '30434', county: 'Louisville County'},
  { name: 'Nelle Brown Memorial Public Library', url: 'https://lyonslibrary.org/', eventsUrl: 'https://lyonslibrary.org/', city: 'Lyons', state: 'GA', zipCode: '00000', county: 'Lyons County'},
  { name: 'Middle Georgia Regional Library System', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'GA', zipCode: '31201', county: 'Macon County'},
  { name: 'Morgan County Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'GA', zipCode: '00000', county: 'Madison County'},
  { name: 'Manchester Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'GA', zipCode: '00000', county: 'Manchester County'},
  { name: 'Maysville Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'GA', zipCode: '00000', county: 'Maysville County'},
  { name: 'Meigs Public Library', url: 'https://www.meigslibrary.org/', eventsUrl: 'https://www.meigslibrary.org/', city: 'Meigs', state: 'GA', zipCode: '00000', county: 'Meigs County'},
  { name: 'Lake Sinclair Library', url: 'https://milledgevillelibrary.org/', eventsUrl: 'https://milledgevillelibrary.org/calendar', city: 'Milledgeville', state: 'GA', zipCode: '00000', county: 'Milledgeville County'},
  { name: 'Monroe-Walton County Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'GA', zipCode: '00000', county: 'Monroe County'},
  { name: 'Baker County', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'GA', zipCode: '00000', county: 'Newton County'},
  { name: 'Pelham-Carnegie Library', url: 'https://www.pelhamlibrary.org/', eventsUrl: 'https://www.pelhamlibrary.org/calendar/', city: 'Pelham', state: 'GA', zipCode: '00000', county: 'Pelham County'},
  { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'GA', zipCode: '00000', county: 'Pembroke County'},
  { name: 'Houston County Public Libraries System', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'GA', zipCode: '31069', county: 'Perry County'},
  { name: 'Webster County Library', url: 'https://prestonpubliclibrary.org/', eventsUrl: 'https://prestonpubliclibrary.org/events/', city: 'Preston', state: 'GA', zipCode: '00000', county: 'Preston County'},
  { name: 'Brooks County Public Library System', url: 'https://www.quitmanlibrary.org/', eventsUrl: 'https://www.quitmanlibrary.org/', city: 'Quitman', state: 'GA', zipCode: '31643', county: 'Quitman County'},
  { name: 'Parks Memorial Library', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'GA', zipCode: '00000', county: 'Richland County'},
  { name: 'Riverdale Branch Library', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'GA', zipCode: '00000', county: 'Riverdale County'},
  { name: 'Rockmart Library', url: 'https://www.rockmartlibrary.org', eventsUrl: 'https://www.rockmartlibrary.org/events', city: 'Rockmart', state: 'GA', zipCode: '00000', county: 'Rockmart County'},
  { name: 'Rossville Public Library', url: 'https://www.rossvillelibrary.org', eventsUrl: 'https://www.rossvillelibrary.org/events', city: 'Rossville', state: 'GA', zipCode: '00000', county: 'Rossville County'},
  { name: 'Scottdale-Tobie Grant Branch', url: 'https://www.scottdalelibrary.org/', eventsUrl: 'https://www.scottdalelibrary.org/', city: 'Scottdale', state: 'GA', zipCode: '00000', county: 'Scottdale County'},
  { name: 'Senoia Area Public Library', url: 'https://cowt.ent.sirsi.net/', eventsUrl: 'https://cowt.ent.sirsi.net/client/en_US/default/', city: 'Senoia', state: 'GA', zipCode: '00000', county: 'Senoia County'},
  { name: 'Lewis A. Ray Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'GA', zipCode: '00000', county: 'Smyrna County'},
  { name: 'Hancock County Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'GA', zipCode: '00000', county: 'Sparta County'},
  { name: 'Effingham', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'GA', zipCode: '00000', county: 'Springfield County'},
  { name: 'Cochran Public Library', url: 'https://www.stockbridgelibrary.org', eventsUrl: 'https://www.stockbridgelibrary.org/events', city: 'Stockbridge', state: 'GA', zipCode: '00000', county: 'Stockbridge County'},
  { name: 'Chattooga County Library System', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'GA', zipCode: '30747', county: 'Summerville County'},
  { name: 'Hightower Memorial Library', url: 'https://thomastonlibrary.org/', eventsUrl: 'https://thomastonlibrary.org/', city: 'Thomaston', state: 'GA', zipCode: '00000', county: 'Thomaston County'},
  { name: 'Thomson-Mcduffie County Library', url: 'https://www.thomsonlibrary.org/', eventsUrl: 'https://www.thomsonlibrary.org/', city: 'Thomson', state: 'GA', zipCode: '00000', county: 'Thomson County'},
  { name: 'Tyrone Public Library', url: 'https://www.tyronelibrary.org', eventsUrl: 'https://www.tyronelibrary.org/events', city: 'Tyrone', state: 'GA', zipCode: '00000', county: 'Tyrone County'},
  { name: 'Elizabeth Harris Library', url: 'https://www.unadillalibrary.org', eventsUrl: 'https://www.unadillalibrary.org/events', city: 'Unadilla', state: 'GA', zipCode: '00000', county: 'Unadilla County'},
  { name: 'Warren County Public Library', url: 'https://www.warrentonlibrary.org', eventsUrl: 'https://www.warrentonlibrary.org/events', city: 'Warrenton', state: 'GA', zipCode: '00000', county: 'Warrenton County'},
  { name: 'Warwick City Library', url: 'https://warwicklibrary.org/', eventsUrl: 'https://warwicklibrary.org/', city: 'Warwick', state: 'GA', zipCode: '00000', county: 'Warwick County'},
  { name: 'Harlie Fulford Memorial Library', url: 'https://www.wrightsvillelibrary.org', eventsUrl: 'https://www.wrightsvillelibrary.org/events', city: 'Wrightsville', state: 'GA', zipCode: '00000', county: 'Wrightsville County'},
];

const SCRAPER_NAME = 'wordpress-GA';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
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
            state: 'GA',
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
    }
  }

  await browser.close();
  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'GA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Georgia Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressGACloudFunction() {
  console.log('☁️ Running WordPress GA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-GA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-GA', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressGACloudFunction };
