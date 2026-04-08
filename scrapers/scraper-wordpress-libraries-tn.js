const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Tennessee Public Libraries Scraper
 * State: TN
 * Coverage: All Tennessee Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Nashville Public Library', url: 'https://library.nashville.org', eventsUrl: 'https://library.nashville.org/events', city: 'Nashville', state: 'TN', zipCode: '37203', county: 'Nashville County'},
  { name: 'Memphis Public Libraries', url: 'https://www.memphislibrary.org', eventsUrl: 'https://www.memphislibrary.org/events', city: 'Memphis', state: 'TN', zipCode: '38103', county: 'Memphis County'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlib.org', eventsUrl: 'https://www.knoxlib.org/events', city: 'Knoxville', state: 'TN', zipCode: '37902', county: 'Knoxville County'},
  { name: 'Chattanooga Public Library', url: 'https://chattlibrary.org', eventsUrl: 'https://chattlibrary.org/events', city: 'Chattanooga', state: 'TN', zipCode: '37402', county: 'Chattanooga County'},
  // Regional Libraries
  { name: 'Clarksville-Montgomery County Public Library', url: 'https://mcgtn.org/library', eventsUrl: 'https://mcgtn.org/library/events', city: 'Clarksville', state: 'TN', zipCode: '37040', county: 'Clarksville County'},
  { name: 'Murfreesboro City Library', url: 'https://www.murfreesborolibrary.org', eventsUrl: 'https://www.murfreesborolibrary.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Murfreesboro County'},
  { name: 'Jackson-Madison County Library', url: 'https://www.jmcl.tn.org', eventsUrl: 'https://www.jmcl.tn.org/events', city: 'Jackson', state: 'TN', zipCode: '38301', county: 'Jackson County'},
  { name: 'Johnson City Public Library', url: 'https://www.jcpl.org', eventsUrl: 'https://www.jcpl.org/events', city: 'Johnson City', state: 'TN', zipCode: '37601', county: 'Johnson City County'},
  { name: 'Kingsport Public Library', url: 'https://www.kingsportlibrary.org', eventsUrl: 'https://www.kingsportlibrary.org/events', city: 'Kingsport', state: 'TN', zipCode: '37660', county: 'Kingsport County'},
  { name: 'Franklin Public Library', url: 'https://www.franklintn.gov/library', eventsUrl: 'https://www.franklintn.gov/library/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'},
  { name: 'Williamson County Public Library', url: 'https://www.wcpltn.org', eventsUrl: 'https://www.wcpltn.org/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'},
  { name: 'Sumner County Library', url: 'https://www.sumnercountylibrary.org', eventsUrl: 'https://www.sumnercountylibrary.org/events', city: 'Gallatin', state: 'TN', zipCode: '37066' },
  { name: 'Rutherford County Library System', url: 'https://www.rcls.org', eventsUrl: 'https://www.rcls.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Murfreesboro County'},
  { name: 'Blount County Public Library', url: 'https://www.blountlibrary.org', eventsUrl: 'https://www.blountlibrary.org/events', city: 'Maryville', state: 'TN', zipCode: '37801', county: 'Maryville County'},
  { name: 'Cleveland-Bradley County Public Library', url: 'https://www.clevelandlibrary.org', eventsUrl: 'https://www.clevelandlibrary.org/events', city: 'Cleveland', state: 'TN', zipCode: '37311', county: 'Cleveland County'},
  { name: 'Oak Ridge Public Library', url: 'https://www.oakridgelibrary.org', eventsUrl: 'https://www.oakridgelibrary.org/events', city: 'Oak Ridge', state: 'TN', zipCode: '37830', county: 'Oak Ridge County'},
  { name: 'Bristol Public Library', url: 'https://www.bristoltnlibrary.org', eventsUrl: 'https://www.bristoltnlibrary.org/events', city: 'Bristol', state: 'TN', zipCode: '37620', county: 'Bristol County'},
  { name: 'Germantown Community Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'TN', zipCode: '38138', county: 'Germantown County'},
  { name: 'Collierville Burch Library', url: 'https://www.colliervillelibrary.org', eventsUrl: 'https://www.colliervillelibrary.org/events', city: 'Collierville', state: 'TN', zipCode: '38017', county: 'Collierville County'},
  { name: 'Bartlett Library', url: 'https://www.cityofbartlett.org/library', eventsUrl: 'https://www.cityofbartlett.org/library/events', city: 'Bartlett', state: 'TN', zipCode: '38134', county: 'Bartlett County'},
  { name: 'Hendersonville Public Library', url: 'https://www.hendersonvillelibrary.org', eventsUrl: 'https://www.hendersonvillelibrary.org/events', city: 'Hendersonville', state: 'TN', zipCode: '37075', county: 'Hendersonville County'},
  { name: 'Morristown-Hamblen Library', url: 'https://www.mhlibrary.org', eventsUrl: 'https://www.mhlibrary.org/events', city: 'Morristown', state: 'TN', zipCode: '37814', county: 'Morristown County'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'TN', zipCode: '37167', county: 'Smyrna County'},
  { name: 'Columbia Public Library', url: 'https://www.youseemore.com/columbia', eventsUrl: 'https://www.youseemore.com/columbia/events', city: 'Columbia', state: 'TN', zipCode: '38401', county: 'Columbia County'},
  { name: 'La Vergne Public Library', url: 'https://www.lavergnelibrary.org', eventsUrl: 'https://www.lavergnelibrary.org/events', city: 'La Vergne', state: 'TN', zipCode: '37086', county: 'La Vergne County'},
  { name: 'Cookeville-Putnam County Library', url: 'https://www.cookevillelibrary.org', eventsUrl: 'https://www.cookevillelibrary.org/events', city: 'Cookeville', state: 'TN', zipCode: '38501', county: 'Cookeville County'},
  { name: 'Shelbyville-Bedford County Public Library', url: 'https://www.sbcpl.org', eventsUrl: 'https://www.sbcpl.org/events', city: 'Shelbyville', state: 'TN', zipCode: '37160', county: 'Shelbyville County'},
  { name: 'Sevier County Public Library System', url: 'https://www.sevierlibrary.org', eventsUrl: 'https://www.sevierlibrary.org/events', city: 'Sevierville', state: 'TN', zipCode: '37862', county: 'Sevierville County'},
  { name: 'Greeneville-Greene County Public Library', url: 'https://www.greenevillelibrary.org', eventsUrl: 'https://www.greenevillelibrary.org/events', city: 'Greeneville', state: 'TN', zipCode: '37743', county: 'Greeneville County'},
  { name: 'Dyersburg-Dyer County Public Library', url: 'https://www.dyersburglibrary.org', eventsUrl: 'https://www.dyersburglibrary.org/events', city: 'Dyersburg', state: 'TN', zipCode: '38024', county: 'Dyersburg County'},
  { name: 'Tullahoma Public Library', url: 'https://www.tullahoma-tn.com/library', eventsUrl: 'https://www.tullahoma-tn.com/library/events', city: 'Tullahoma', state: 'TN', zipCode: '37388', county: 'Tullahoma County'},
  { name: 'Lebanon Wilson County Library', url: 'https://www.lwcl.org', eventsUrl: 'https://www.lwcl.org/events', city: 'Lebanon', state: 'TN', zipCode: '37087', county: 'Lebanon County'},
  { name: 'Springfield-Robertson County Public Library', url: 'https://www.springfieldtnlibrary.org', eventsUrl: 'https://www.springfieldtnlibrary.org/events', city: 'Springfield', state: 'TN', zipCode: '37172', county: 'Springfield County'},
  { name: 'Dickson County Public Library', url: 'https://www.dicksoncountylibrary.org', eventsUrl: 'https://www.dicksoncountylibrary.org/events', city: 'Dickson', state: 'TN', zipCode: '37055' },
  { name: 'McMinn County Public Library', url: 'https://www.mcminnlib.org', eventsUrl: 'https://www.mcminnlib.org/events', city: 'Athens', state: 'TN', zipCode: '37303', county: 'Athens County'},
  { name: 'Maury County Public Library', url: 'https://www.maurylibrary.org', eventsUrl: 'https://www.maurylibrary.org/events', city: 'Columbia', state: 'TN', zipCode: '38401', county: 'Columbia County'},
  { name: 'Elizabethton-Carter County Public Library', url: 'https://www.elizabethtonlibrary.org', eventsUrl: 'https://www.elizabethtonlibrary.org/events', city: 'Elizabethton', state: 'TN', zipCode: '37643', county: 'Elizabethton County'},
  { name: 'Athens Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'TN', zipCode: '37303', county: 'Athens County'},
  { name: 'Lawrenceburg Public Library', url: 'https://www.lawrencelibrary.org', eventsUrl: 'https://www.lawrencelibrary.org/events', city: 'Lawrenceburg', state: 'TN', zipCode: '38464', county: 'Lawrenceburg County'},
  { name: 'Martin-Weakley County Public Library', url: 'https://www.weakleycountylibrary.org', eventsUrl: 'https://www.weakleycountylibrary.org/events', city: 'Martin', state: 'TN', zipCode: '38237' },
  { name: 'Union City Public Library', url: 'https://www.unioncitylibrary.org', eventsUrl: 'https://www.unioncitylibrary.org/events', city: 'Union City', state: 'TN', zipCode: '38261', county: 'Union City County'},
  { name: 'Paris-Henry County Library', url: 'https://www.parishenrylibrary.org', eventsUrl: 'https://www.parishenrylibrary.org/events', city: 'Paris', state: 'TN', zipCode: '38242', county: 'Paris County'},
  { name: 'Crossville-Cumberland County Public Library', url: 'https://www.cumberlandcountylibrary.org', eventsUrl: 'https://www.cumberlandcountylibrary.org/events', city: 'Crossville', state: 'TN', zipCode: '38555' },
  { name: 'Manchester Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'TN', zipCode: '37355', county: 'Manchester County'},
  { name: 'Rogersville Public Library', url: 'https://www.rogersvillelibrary.org', eventsUrl: 'https://www.rogersvillelibrary.org/events', city: 'Rogersville', state: 'TN', zipCode: '37857', county: 'Rogersville County'},
  { name: 'Fayetteville-Lincoln County Public Library', url: 'https://www.faylinclib.org', eventsUrl: 'https://www.faylinclib.org/events', city: 'Fayetteville', state: 'TN', zipCode: '37334', county: 'Fayetteville County'},
  { name: 'Loudon County Public Library', url: 'https://www.loudoncountylibrary.org', eventsUrl: 'https://www.loudoncountylibrary.org/events', city: 'Loudon', state: 'TN', zipCode: '37774' },
  { name: 'Newport Plain Talk Memorial Library', url: 'https://www.cockelibrary.org', eventsUrl: 'https://www.cockelibrary.org/events', city: 'Newport', state: 'TN', zipCode: '37821', county: 'Newport County'},
  { name: 'Henderson County Library', url: 'https://www.hendersoncountylibrary.org', eventsUrl: 'https://www.hendersoncountylibrary.org/events', city: 'Lexington', state: 'TN', zipCode: '38351' },
  { name: 'Tipton County Public Library', url: 'https://www.tiptoncountylibrary.org', eventsUrl: 'https://www.tiptoncountylibrary.org/events', city: 'Covington', state: 'TN', zipCode: '38019' },
  { name: 'Humboldt Public Library', url: 'https://www.humboldtlibrary.org', eventsUrl: 'https://www.humboldtlibrary.org/events', city: 'Humboldt', state: 'TN', zipCode: '38343', county: 'Humboldt County'},
  { name: 'McMinnville-Warren County Library', url: 'https://www.warrencountylibrary.org', eventsUrl: 'https://www.warrencountylibrary.org/events', city: 'McMinnville', state: 'TN', zipCode: '37110' },
  { name: 'Mount Pleasant Public Library', url: 'https://www.mtpleasantlibrary.org', eventsUrl: 'https://www.mtpleasantlibrary.org/events', city: 'Mount Pleasant', state: 'TN', zipCode: '38474', county: 'Mount Pleasant County'},
  { name: 'Savannah-Hardin County Library', url: 'https://www.hardincountylibrary.org', eventsUrl: 'https://www.hardincountylibrary.org/events', city: 'Savannah', state: 'TN', zipCode: '38372' },
  { name: 'Selmer-McNairy County Library', url: 'https://www.mcnairycountylibrary.org', eventsUrl: 'https://www.mcnairycountylibrary.org/events', city: 'Selmer', state: 'TN', zipCode: '38375' }
];

const SCRAPER_NAME = 'wordpress-TN';

async function scrapeGenericEvents() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });
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

              if (possibleTitles.length > 0) {
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
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
            state: 'TN',
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

async function saveToFirebase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'TN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) {
    await saveToFirebase(events);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressTNCloudFunction() {
  console.log('☁️ Running WordPress TN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-TN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-TN', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressTNCloudFunction };
