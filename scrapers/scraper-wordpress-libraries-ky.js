const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Kentucky Public Libraries Scraper
 * State: KY
 * Coverage: All Kentucky Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Louisville Free Public Library', url: 'https://www.lfpl.org', eventsUrl: 'https://www.lfpl.org/events', city: 'Louisville', state: 'KY', zipCode: '40203', county: 'Louisville County'},
  { name: 'Lexington Public Library', url: 'https://www.lexpublib.org', eventsUrl: 'https://www.lexpublib.org/events', city: 'Lexington', state: 'KY', zipCode: '40507', county: 'Lexington County'},
  { name: 'Kenton County Public Library', url: 'https://www.kentonlibrary.org', eventsUrl: 'https://www.kentonlibrary.org/events', city: 'Covington', state: 'KY', zipCode: '41011', county: 'Covington County'},
  { name: 'Campbell County Public Library', url: 'https://www.cc-pl.org', eventsUrl: 'https://www.cc-pl.org/events', city: 'Cold Spring', state: 'KY', zipCode: '41076', county: 'Cold Spring County'},
  // Regional Libraries
  { name: 'Boone County Public Library', url: 'https://www.bcpl.org', eventsUrl: 'https://www.bcpl.org/events', city: 'Burlington', state: 'KY', zipCode: '41005', county: 'Burlington County'},
  { name: 'Warren County Public Library', url: 'https://www.warrenpl.org', eventsUrl: 'https://www.warrenpl.org/events', city: 'Bowling Green', state: 'KY', zipCode: '42101', county: 'Bowling Green County'},
  { name: 'Daviess County Public Library', url: 'https://www.dcplibrary.org', eventsUrl: 'https://www.dcplibrary.org/events', city: 'Owensboro', state: 'KY', zipCode: '42301', county: 'Owensboro County'},
  { name: 'McCracken County Public Library', url: 'https://www.mclib.net', eventsUrl: 'https://www.mclib.net/events', city: 'Paducah', state: 'KY', zipCode: '42001', county: 'Paducah County'},
  { name: 'Hardin County Public Library', url: 'https://www.hcpl.info', eventsUrl: 'https://www.hcpl.info/events', city: 'Elizabethtown', state: 'KY', zipCode: '42701', county: 'Elizabethtown County'},
  { name: 'Madison County Public Library', url: 'https://www.madisoncountylibrary.org', eventsUrl: 'https://www.madisoncountylibrary.org/events', city: 'Richmond', state: 'KY', zipCode: '40475' },
  { name: 'Oldham County Public Library', url: 'https://www.oldhampl.org', eventsUrl: 'https://www.oldhampl.org/events', city: 'La Grange', state: 'KY', zipCode: '40031', county: 'La Grange County'},
  { name: 'Bullitt County Public Library', url: 'https://bcplibrary.org/', eventsUrl: 'https://bcplibrary.org/', city: 'Shepherdsville', state: 'KY', zipCode: '40165', county: 'Shepherdsville County'},
  { name: 'Jessamine County Public Library', url: 'https://www.jesspublib.org', eventsUrl: 'https://www.jesspublib.org/events', city: 'Nicholasville', state: 'KY', zipCode: '40356', county: 'Nicholasville County'},
  { name: 'Scott County Public Library', url: 'https://scottpublib.org/', eventsUrl: 'https://scottpublib.org/', city: 'Georgetown', state: 'KY', zipCode: '40324', county: 'Georgetown County'},
  { name: 'Clark County Public Library', url: 'https://www.clarkbooks.org', eventsUrl: 'https://www.clarkbooks.org/events', city: 'Winchester', state: 'KY', zipCode: '40391', county: 'Winchester County'},
  { name: 'Laurel County Public Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'London', state: 'KY', zipCode: '40741', county: 'London County'},
  { name: 'Christian County Public Library', url: 'https://www.christiancountylibrary.org', eventsUrl: 'https://www.christiancountylibrary.org/events', city: 'Hopkinsville', state: 'KY', zipCode: '42240' },
  { name: 'Pike County Public Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pikeville', state: 'KY', zipCode: '41501', county: 'Pikeville County'},
  { name: 'Greenup County Public Library', url: 'https://www.greenuplibrary.org', eventsUrl: 'https://www.greenuplibrary.org/events', city: 'Greenup', state: 'KY', zipCode: '41144', county: 'Greenup County'},
  { name: 'Franklin County Public Library', url: 'https://www.frankfortlibrary.org/', eventsUrl: 'https://www.frankfortlibrary.org/', city: 'Frankfort', state: 'KY', zipCode: '40601', county: 'Frankfort County'},
  { name: 'Henderson County Public Library', url: 'https://www.hcpl.org', eventsUrl: 'https://www.hcpl.org/events', city: 'Henderson', state: 'KY', zipCode: '42420', county: 'Henderson County'},
  { name: 'Graves County Public Library', url: 'https://www.graveslibrary.org', eventsUrl: 'https://www.graveslibrary.org/events', city: 'Mayfield', state: 'KY', zipCode: '42066', county: 'Mayfield County'},
  { name: 'Calloway County Public Library', url: 'https://www.callowaycountylibrary.org', eventsUrl: 'https://www.callowaycountylibrary.org/events', city: 'Murray', state: 'KY', zipCode: '42071' },
  { name: 'Woodford County Library', url: 'https://www.woodfordlibrary.org', eventsUrl: 'https://www.woodfordlibrary.org/events', city: 'Versailles', state: 'KY', zipCode: '40383', county: 'Versailles County'},
  { name: 'Rowan County Public Library', url: 'https://www.rowancountylibrary.org', eventsUrl: 'https://www.rowancountylibrary.org/events', city: 'Morehead', state: 'KY', zipCode: '40351' },
  { name: 'Montgomery County Public Library', url: 'https://www.mcplib.org', eventsUrl: 'https://www.mcplib.org/events', city: 'Mount Sterling', state: 'KY', zipCode: '40353', county: 'Mount Sterling County'},
  { name: 'Grant County Public Library', url: 'https://www.grantlibrary.net/', eventsUrl: 'https://www.grantlibrary.net/', city: 'Williamstown', state: 'KY', zipCode: '41097', county: 'Williamstown County'},
  { name: 'Marshall County Public Library', url: 'https://www.marshallcountylibrary.org', eventsUrl: 'https://www.marshallcountylibrary.org/events', city: 'Benton', state: 'KY', zipCode: '42025' },
  { name: 'Whitley County Public Library', url: 'https://www.whitleylibrary.org', eventsUrl: 'https://www.whitleylibrary.org/events', city: 'Williamsburg', state: 'KY', zipCode: '40769', county: 'Williamsburg County'},
  { name: 'Floyd County Public Library', url: 'https://floydlibrary.org/', eventsUrl: 'https://floydlibrary.org/indiana-history-room/events/', city: 'Prestonsburg', state: 'KY', zipCode: '41653', county: 'Prestonsburg County'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlibrary.org', eventsUrl: 'https://www.knoxlibrary.org/events', city: 'Barbourville', state: 'KY', zipCode: '40906', county: 'Barbourville County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Auburn Branch', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'KY', zipCode: '00000', county: 'Auburn County'},
  { name: 'Trimble County Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'KY', zipCode: '40006', county: 'Bedford County'},
  { name: 'Bracken County Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'KY', zipCode: '41004', county: 'Brooksville County'},
  { name: 'Nicholas County Public Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'KY', zipCode: '40311', county: 'Carlisle County'},
  { name: 'Hickman County Memorial Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'KY', zipCode: '42031', county: 'Clinton County'},
  { name: 'Adair County Public Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'KY', zipCode: '42728', county: 'Columbia County'},
  { name: 'South Branch', url: 'https://corbinlibrary.org/', eventsUrl: 'https://corbinlibrary.org/', city: 'Corbin', state: 'KY', zipCode: '00000', county: 'Corbin County'},
  { name: 'Oldham County Public Library', url: 'https://www.crestwoodlibrary.org/', eventsUrl: 'https://www.crestwoodlibrary.org/news-events/lib-cal/calendar', city: 'Crestwood', state: 'KY', zipCode: '40014', county: 'Crestwood County'},
  { name: 'Rebecca Caudill Public Library', url: 'https://www.cumberlandlibrary.org', eventsUrl: 'https://www.cumberlandlibrary.org/events', city: 'Cumberland', state: 'KY', zipCode: '00000', county: 'Cumberland County'},
  { name: 'Cynthiana-Harrison County Public Library', url: 'https://www.cynthianalibrary.org/', eventsUrl: 'https://www.cynthianalibrary.org/calendar', city: 'Cynthiana', state: 'KY', zipCode: '41031', county: 'Cynthiana County'},
  { name: 'Boyle County Public Library', url: 'http://www.danvilleva.gov/', eventsUrl: 'http://www.danvilleva.gov/2467/Public-Library', city: 'Danville', state: 'KY', zipCode: '40422', county: 'Danville County'},
  { name: 'Florence Branch', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'KY', zipCode: '00000', county: 'Florence County'},
  { name: 'Goodnight Memorial Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'KY', zipCode: '42134', county: 'Franklin County'},
  { name: 'Fulton Public Library', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'KY', zipCode: '42041', county: 'Fulton County'},
  { name: 'Mary Wood Weldon Memorial Public Library', url: 'https://www.glasgowlibrary.org/', eventsUrl: 'https://www.glasgowlibrary.org/upcoming-events', city: 'Glasgow', state: 'KY', zipCode: '42141', county: 'Glasgow County'},
  { name: 'Mahan-Oldham County Library', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'KY', zipCode: '00000', county: 'Goshen County'},
  { name: 'Green County Public Library', url: 'https://www.greensburglibrary.org', eventsUrl: 'https://www.greensburglibrary.org/events', city: 'Greensburg', state: 'KY', zipCode: '42743', county: 'Greensburg County'},
  { name: 'Harlan County Public Library', url: 'https://www.harlanlibrary.org', eventsUrl: 'https://www.harlanlibrary.org/events', city: 'Harlan', state: 'KY', zipCode: '40831', county: 'Harlan County'},
  { name: 'Ohio County Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'KY', zipCode: '42347', county: 'Hartford County'},
  { name: 'Perry County Public Library', url: 'https://www.hazardlibrary.org/', eventsUrl: 'https://www.hazardlibrary.org/', city: 'Hazard', state: 'KY', zipCode: '41701', county: 'Hazard County'},
  { name: 'Lents Branch', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'KY', zipCode: '00000', county: 'Hebron County'},
  { name: 'Estill County Public Library', url: 'https://www.irvinelibrary.org', eventsUrl: 'https://www.irvinelibrary.org/events', city: 'Irvine', state: 'KY', zipCode: '40336', county: 'Irvine County'},
  { name: 'Irvington Branch', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'KY', zipCode: '00000', county: 'Irvington County'},
  { name: 'Russell County Public Library District', url: 'https://www.jamestownlibrary.org', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'KY', zipCode: '42629', county: 'Jamestown County'},
  { name: 'Garrard County Public Library', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'KY', zipCode: '40444', county: 'Lancaster County'},
  { name: 'Marion County Public Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'KY', zipCode: '40033', county: 'Lebanon County'},
  { name: 'Casey County Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'KY', zipCode: '42539', county: 'Liberty County'},
  { name: 'Clay County Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'KY', zipCode: '40962', county: 'Manchester County'},
  { name: 'Crittenden County Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'KY', zipCode: '42064', county: 'Marion County'},
  { name: 'Mason County Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'KY', zipCode: '41056', county: 'Maysville County'},
  { name: 'Wayne County Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'KY', zipCode: '42633', county: 'Monticello County'},
  { name: 'Newport Branch', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'KY', zipCode: '00000', county: 'Newport County'},
  { name: 'Phelps Branch', url: 'https://www.phelpslibrary.org', eventsUrl: 'https://www.phelpslibrary.org/events', city: 'Phelps', state: 'KY', zipCode: '00000', county: 'Phelps County'},
  { name: 'George Coon Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'KY', zipCode: '42445', county: 'Princeton County'},
  { name: 'Allen County Public Library', url: 'https://www.scottsvillelibrary.org', eventsUrl: 'https://www.scottsvillelibrary.org/events', city: 'Scottsville', state: 'KY', zipCode: '42164', county: 'Scottsville County'},
  { name: 'Washington County Public Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'KY', zipCode: '40069', county: 'Springfield County'},
  { name: 'Sturgis Branch', url: 'https://www.sturgislibrary.org', eventsUrl: 'https://www.sturgislibrary.org/events', city: 'Sturgis', state: 'KY', zipCode: '00000', county: 'Sturgis County'},
  { name: 'Gallatin County Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'KY', zipCode: '41095', county: 'Warsaw County'},

];

const SCRAPER_NAME = 'wordpress-KY';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          'article',
          '.post'
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
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
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
            state: 'KY',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'KY',
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
async function scrapeWordpressKYCloudFunction() {
  console.log('☁️ Running WordPress KY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-KY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-KY', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressKYCloudFunction };
