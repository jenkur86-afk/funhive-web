const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Mississippi Public Libraries Scraper
 * State: MS
 * Coverage: All Mississippi Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Jackson-Hinds Library System', url: 'https://www.jhlibrary.org', eventsUrl: 'https://www.jhlibrary.org/events', city: 'Jackson', state: 'MS', zipCode: '39201', county: 'Jackson County'},
  { name: 'Harrison County Library System', url: 'https://www.harrison.lib.ms.us/', eventsUrl: 'https://www.harrison.lib.ms.us/', city: 'Gulfport', state: 'MS', zipCode: '39501', county: 'Gulfport County'},
  // Regional Libraries
  { name: 'First Regional Library', url: 'https://www.firstregional.org', eventsUrl: 'https://www.firstregional.org/events', city: 'Hernando', state: 'MS', zipCode: '38632', county: 'Hernando County'},
  { name: 'Lee-Itawamba Library System', url: 'https://www.leeitawambalibrary.org/', eventsUrl: 'https://www.leeitawambalibrary.org/events', city: 'Tupelo', state: 'MS', zipCode: '38801', county: 'Tupelo County'},
  { name: 'Jackson-George Regional Library System', url: 'https://www.jgrls.org', eventsUrl: 'https://www.jgrls.org/events', city: 'Pascagoula', state: 'MS', zipCode: '39567', county: 'Pascagoula County'},
  { name: 'Columbus-Lowndes Public Library', url: 'https://www.lowndeslibrary.com/', eventsUrl: 'https://www.lowndeslibrary.com/', city: 'Columbus', state: 'MS', zipCode: '39701', county: 'Columbus County'},
  { name: 'Warren County-Vicksburg Public Library', url: 'https://www.warren.lib.ms.us/', eventsUrl: 'https://www.warren.lib.ms.us/', city: 'Vicksburg', state: 'MS', zipCode: '39180', county: 'Vicksburg County'},
  { name: 'Laurel-Jones County Library', url: 'https://www.laurel.lib.ms.us', eventsUrl: 'https://www.laurel.lib.ms.us/events', city: 'Laurel', state: 'MS', zipCode: '39440', county: 'Laurel County'},
  { name: 'Pine Forest Regional Library', url: 'https://www.pineforest.lib.ms.us/', eventsUrl: 'https://www.pineforest.lib.ms.us/', city: 'Richton', state: 'MS', zipCode: '39476', county: 'Richton County'},
  { name: 'Starkville-Oktibbeha County Public Library', url: 'https://www.starkville.lib.ms.us/', eventsUrl: 'https://www.starkville.lib.ms.us/', city: 'Starkville', state: 'MS', zipCode: '39759', county: 'Starkville County'},
  { name: 'Bolivar County Library System', url: 'https://www.bolivar.lib.ms.us/', eventsUrl: 'https://www.bolivar.lib.ms.us/', city: 'Cleveland', state: 'MS', zipCode: '38732', county: 'Cleveland County'},
  { name: 'Pearl River County Library System', url: 'https://www.pearlriver.lib.ms.us', eventsUrl: 'https://www.pearlriver.lib.ms.us/events', city: 'Picayune', state: 'MS', zipCode: '39466', county: 'Picayune County'},
  { name: 'Lincoln-Lawrence-Franklin Regional Library', url: 'https://www.llf.lib.ms.us', eventsUrl: 'https://www.llf.lib.ms.us/events', city: 'Brookhaven', state: 'MS', zipCode: '39601', county: 'Brookhaven County'},
  { name: 'Dixie Regional Library System', url: 'https://dixie.lib.ms.us/', eventsUrl: 'https://dixie.lib.ms.us/', city: 'Pontotoc', state: 'MS', zipCode: '38863', county: 'Pontotoc County'},
  { name: 'Northeast Regional Library', url: 'https://www.nereg.lib.ms.us', eventsUrl: 'https://www.nereg.lib.ms.us/events', city: 'Corinth', state: 'MS', zipCode: '38834', county: 'Corinth County'},
  { name: 'Central Mississippi Regional Library System', url: 'https://www.cmrls.lib.ms.us', eventsUrl: 'https://www.cmrls.lib.ms.us/events', city: 'Kosciusko', state: 'MS', zipCode: '39090', county: 'Kosciusko County'},
  { name: 'Tombigbee Regional Library System', url: 'https://www.tombigbee.lib.ms.us/', eventsUrl: 'https://www.tombigbee.lib.ms.us/', city: 'West Point', state: 'MS', zipCode: '39773', county: 'West Point County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Benton County Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'MS', zipCode: '38603', county: 'Ashland County'},
  { name: 'Avon Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'MS', zipCode: '00000', county: 'Avon County'},
  { name: 'William Estes Powell Memorial Library', url: 'https://www.beaumontlibrary.org', eventsUrl: 'https://www.beaumontlibrary.org/events', city: 'Beaumont', state: 'MS', zipCode: '00000', county: 'Beaumont County'},
  { name: 'Belmont Public Library', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'MS', zipCode: '00000', county: 'Belmont County'},
  { name: 'Brooksville Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'MS', zipCode: '00000', county: 'Brooksville County'},
  { name: 'Caledonia Public Library', url: 'https://www.caledonialibrary.org', eventsUrl: 'https://www.caledonialibrary.org/events', city: 'Caledonia', state: 'MS', zipCode: '00000', county: 'Caledonia County'},
  { name: 'Charleston Public Library', url: 'https://charlestonlibrary.org/', eventsUrl: 'https://charlestonlibrary.org/library-events', city: 'Charleston', state: 'MS', zipCode: '00000', county: 'Charleston County'},
  { name: 'A. E. Wood Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'MS', zipCode: '00000', county: 'Clinton County'},
  { name: 'Columbia-Marion County Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'MS', zipCode: '00000', county: 'Columbia County'},
  { name: 'Crawford Public Library', url: 'https://crawfordlibrary.org/', eventsUrl: 'https://crawfordlibrary.org/', city: 'Crawford', state: 'MS', zipCode: '00000', county: 'Crawford County'},
  { name: 'Crosby Public Library', url: 'https://www.crosbylibrary.org', eventsUrl: 'https://www.crosbylibrary.org/events', city: 'Crosby', state: 'MS', zipCode: '00000', county: 'Crosby County'},
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'MS', zipCode: '00000', county: 'Decatur County'},
  { name: 'Dekalb Public Library', url: 'https://www.dekalblibrary.org', eventsUrl: 'https://www.dekalblibrary.org/events', city: 'Dekalb', state: 'MS', zipCode: '00000', county: 'Dekalb County'},
  { name: 'Enterprise Public Library', url: 'https://www.enterpriselibrary.org', eventsUrl: 'https://www.enterpriselibrary.org/events', city: 'Enterprise', state: 'MS', zipCode: '00000', county: 'Enterprise County'},
  { name: 'Jefferson County Public Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'MS', zipCode: '00000', county: 'Fayette County'},
  { name: 'Florence Public Library', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'MS', zipCode: '00000', county: 'Florence County'},
  { name: 'Forest Public Library', url: 'https://www.forestlibrary.org/', eventsUrl: 'https://www.forestlibrary.org/', city: 'Forest', state: 'MS', zipCode: '00000', county: 'Forest County'},
  { name: 'Itawamba County-Pratt Memorial Library', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'MS', zipCode: '00000', county: 'Fulton County'},
  { name: 'Greenwood-Leflore Public Library', url: 'https://www.greenwoodlibrary.org', eventsUrl: 'https://www.greenwoodlibrary.org/events', city: 'Greenwood', state: 'MS', zipCode: '38930', county: 'Greenwood County'},
  { name: 'Hamilton Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'MS', zipCode: '00000', county: 'Hamilton County'},
  { name: 'Houston Carnegie Library', url: 'https://www.houstonlibrary.org', eventsUrl: 'https://www.houstonlibrary.org/events', city: 'Houston', state: 'MS', zipCode: '00000', county: 'Houston County'},
  { name: 'Leland Public Library', url: 'https://www.lelandlibrary.org', eventsUrl: 'https://www.lelandlibrary.org/events', city: 'Leland', state: 'MS', zipCode: '00000', county: 'Leland County'},
  { name: 'Lexington Public Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'MS', zipCode: '00000', county: 'Lexington County'},
  { name: 'Liberty Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'MS', zipCode: '00000', county: 'Liberty County'},
  { name: 'Long Beach Public Library', url: 'https://www.longbeachlibrary.org', eventsUrl: 'https://www.longbeachlibrary.org/events', city: 'Long Beach', state: 'MS', zipCode: '39560', county: 'Long Beach County'},
  { name: 'Winston County Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'MS', zipCode: '00000', county: 'Louisville County'},
  { name: 'Ada S. Fant Memorial Library', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'MS', zipCode: '00000', county: 'Macon County'},
  { name: 'Rebecca Baine Rigby Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'MS', zipCode: '00000', county: 'Madison County'},
  { name: 'Magnolia Public Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'MS', zipCode: '00000', county: 'Magnolia County'},
  { name: 'William And Dolores Mauldin Library', url: 'https://www.mchenrylibrary.org/', eventsUrl: 'https://www.mchenrylibrary.org/', city: 'Mchenry', state: 'MS', zipCode: '00000', county: 'Mchenry County'},
  { name: 'Franklin County Public Library', url: 'https://www.meadvillelibrary.org', eventsUrl: 'https://www.meadvillelibrary.org/events', city: 'Meadville', state: 'MS', zipCode: '00000', county: 'Meadville County'},
  { name: 'Lawrence County Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'MS', zipCode: '00000', county: 'Monticello County'},
  { name: 'Morton Public Library', url: 'https://mortonlibrary.org/', eventsUrl: 'https://mortonlibrary.org/', city: 'Morton', state: 'MS', zipCode: '00000', county: 'Morton County'},
  { name: 'J. Elliott Mcmullan Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'MS', zipCode: '00000', county: 'Newton County'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'MS', zipCode: '00000', county: 'Oakland County'},
  { name: 'Lafayette County-Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'MS', zipCode: '00000', county: 'Oxford County'},
  { name: 'Clarke County-Quitman Public Library', url: 'https://www.quitmanlibrary.org/', eventsUrl: 'https://www.quitmanlibrary.org/', city: 'Quitman', state: 'MS', zipCode: '00000', county: 'Quitman County'},
  { name: 'Richland Public Library', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'MS', zipCode: '00000', county: 'Richland County'},
  { name: 'Ripley Public Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'MS', zipCode: '00000', county: 'Ripley County'},
  { name: 'Field Memorial Library', url: 'https://www.shawlibrary.org/', eventsUrl: 'https://www.shawlibrary.org/', city: 'Shaw', state: 'MS', zipCode: '00000', county: 'Shaw County'},
  { name: 'Dr. Robert T. Hollingsworth Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'MS', zipCode: '00000', county: 'Shelby County'},
  { name: 'Sherman Library', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'MS', zipCode: '00000', county: 'Sherman County'},
  { name: 'Sturgis Public Library', url: 'https://www.sturgislibrary.org', eventsUrl: 'https://www.sturgislibrary.org/events', city: 'Sturgis', state: 'MS', zipCode: '00000', county: 'Sturgis County'},
  { name: 'Kemper-Newton Regional Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'MS', zipCode: '39365', county: 'Union County'},
  { name: 'Evelyn Taylor Majure Library', url: 'https://www.uticalibrary.org', eventsUrl: 'https://www.uticalibrary.org/events', city: 'Utica', state: 'MS', zipCode: '00000', county: 'Utica County'},
  { name: 'Woodville Public Library', url: 'https://www.woodvillelibrary.org', eventsUrl: 'https://www.woodvillelibrary.org/events', city: 'Woodville', state: 'MS', zipCode: '00000', county: 'Woodville County'},

];

const SCRAPER_NAME = 'wordpress-MS';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`\n📚 Scraping ${library.name}...`);
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = ['[class*="event"]', '[class*="program"]', 'article', '.post'];
        const foundElements = new Set();

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

              if (title && title.textContent.trim()) {
                events.push({
                  title: title.textContent.trim(),
                  date: date ? date.textContent.trim() : '',
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
