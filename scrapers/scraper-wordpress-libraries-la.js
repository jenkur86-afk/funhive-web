const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Louisiana Public Libraries Scraper
 * State: LA
 * Coverage: All 64 Parish Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'New Orleans Public Library', url: 'https://nolalibrary.org', eventsUrl: 'https://nolalibrary.org/events', city: 'New Orleans', state: 'LA', zipCode: '70112', county: 'New Orleans County'},
  { name: 'East Baton Rouge Parish Library', url: 'https://www.ebrpl.com', eventsUrl: 'https://www.ebrpl.com/events', city: 'Baton Rouge', state: 'LA', zipCode: '70802', county: 'Baton Rouge County'},
  { name: 'Jefferson Parish Library', url: 'https://www.jefferson.lib.la.us', eventsUrl: 'https://www.jefferson.lib.la.us/events', city: 'Metairie', state: 'LA', zipCode: '70001', county: 'Metairie County'},
  { name: 'Shreve Memorial Library', url: 'https://www.shreve-lib.org', eventsUrl: 'https://www.shreve-lib.org/events', city: 'Shreveport', state: 'LA', zipCode: '71101', county: 'Shreveport County'},
  // Regional Parish Libraries
  { name: 'Lafayette Public Library', url: 'https://lafayettepubliclibrary.org', eventsUrl: 'https://lafayettepubliclibrary.org/events', city: 'Lafayette', state: 'LA', zipCode: '70501', county: 'Lafayette County'},
  { name: 'Calcasieu Parish Public Library', url: 'https://www.calcasieulibrary.org', eventsUrl: 'https://www.calcasieulibrary.org/events', city: 'Lake Charles', state: 'LA', zipCode: '70601', county: 'Lake Charles County'},
  { name: 'Ouachita Parish Public Library', url: 'https://www.oplib.org', eventsUrl: 'https://www.oplib.org/events', city: 'Monroe', state: 'LA', zipCode: '71201', county: 'Monroe County'},
  { name: 'Rapides Parish Library', url: 'https://www.rfrpl.org', eventsUrl: 'https://www.rfrpl.org/events', city: 'Alexandria', state: 'LA', zipCode: '71301', county: 'Alexandria County'},
  { name: 'St. Tammany Parish Library', url: 'https://www.sttammany.lib.la.us', eventsUrl: 'https://www.sttammany.lib.la.us/events', city: 'Covington', state: 'LA', zipCode: '70433', county: 'Covington County'},
  { name: 'Terrebonne Parish Library', url: 'https://www.mytpl.org', eventsUrl: 'https://www.mytpl.org/events', city: 'Houma', state: 'LA', zipCode: '70360', county: 'Houma County'},
  { name: 'Livingston Parish Library', url: 'https://www.livingston.lib.la.us', eventsUrl: 'https://www.livingston.lib.la.us/events', city: 'Livingston', state: 'LA', zipCode: '70754', county: 'Livingston County'},
  { name: 'Bossier Parish Libraries', url: 'https://www.bossierlibrary.org', eventsUrl: 'https://www.bossierlibrary.org/events', city: 'Bossier City', state: 'LA', zipCode: '71111', county: 'Bossier City County'},
  { name: 'Tangipahoa Parish Library', url: 'https://www.tangipahoa.lib.la.us', eventsUrl: 'https://www.tangipahoa.lib.la.us/events', city: 'Amite', state: 'LA', zipCode: '70422', county: 'Amite County'},
  { name: 'St. Charles Parish Library', url: 'https://www.stcharles.lib.la.us', eventsUrl: 'https://www.stcharles.lib.la.us/events', city: 'Destrehan', state: 'LA', zipCode: '70047', county: 'Destrehan County'},
  { name: 'Ascension Parish Library', url: 'https://www.myapl.org', eventsUrl: 'https://www.myapl.org/events', city: 'Gonzales', state: 'LA', zipCode: '70737', county: 'Gonzales County'},
  { name: 'St. Bernard Parish Library', url: 'https://www.sbpl.net', eventsUrl: 'https://www.sbpl.net/events', city: 'Chalmette', state: 'LA', zipCode: '70043', county: 'Chalmette County'},
  { name: 'Iberia Parish Library', url: 'https://www.iberia.lib.la.us', eventsUrl: 'https://www.iberia.lib.la.us/events', city: 'New Iberia', state: 'LA', zipCode: '70560', county: 'New Iberia County'},
  { name: 'St. Landry Parish Library', url: 'https://www.stlandry.lib.la.us', eventsUrl: 'https://www.stlandry.lib.la.us/events', city: 'Opelousas', state: 'LA', zipCode: '70570', county: 'Opelousas County'},
  { name: 'Lafourche Parish Public Library', url: 'https://www.lafourche.org/library', eventsUrl: 'https://www.lafourche.org/library/events', city: 'Thibodaux', state: 'LA', zipCode: '70301', county: 'Thibodaux County'},
  { name: 'St. Martin Parish Library', url: 'https://www.stmartin.lib.la.us', eventsUrl: 'https://www.stmartin.lib.la.us/events', city: 'St. Martinville', state: 'LA', zipCode: '70582', county: 'St. Martinville County'},
  { name: 'Vermilion Parish Library', url: 'https://www.vermilion.lib.la.us', eventsUrl: 'https://www.vermilion.lib.la.us/events', city: 'Abbeville', state: 'LA', zipCode: '70510', county: 'Abbeville County'},
  { name: 'Acadia Parish Library', url: 'https://www.acadia.lib.la.us', eventsUrl: 'https://www.acadia.lib.la.us/events', city: 'Crowley', state: 'LA', zipCode: '70526', county: 'Crowley County'},
  { name: 'St. Mary Parish Library', url: 'https://www.stmary.lib.la.us', eventsUrl: 'https://www.stmary.lib.la.us/events', city: 'Franklin', state: 'LA', zipCode: '70538', county: 'Franklin County'},
  { name: 'Allen Parish Libraries', url: 'https://www.allen.lib.la.us', eventsUrl: 'https://www.allen.lib.la.us/events', city: 'Oberlin', state: 'LA', zipCode: '70655', county: 'Oberlin County'},
  { name: 'Beauregard Parish Library', url: 'https://www.beauregard.lib.la.us', eventsUrl: 'https://www.beauregard.lib.la.us/events', city: 'DeRidder', state: 'LA', zipCode: '70634', county: 'DeRidder County'},
  { name: 'Vernon Parish Library', url: 'https://www.vernon.lib.la.us', eventsUrl: 'https://www.vernon.lib.la.us/events', city: 'Leesville', state: 'LA', zipCode: '71446', county: 'Leesville County'},
  { name: 'Natchitoches Parish Library', url: 'https://www.natchitoches.lib.la.us', eventsUrl: 'https://www.natchitoches.lib.la.us/events', city: 'Natchitoches', state: 'LA', zipCode: '71457', county: 'Natchitoches County'},
  { name: 'Lincoln Parish Library', url: 'https://www.lincoln.lib.la.us', eventsUrl: 'https://www.lincoln.lib.la.us/events', city: 'Ruston', state: 'LA', zipCode: '71270', county: 'Ruston County'},
  { name: 'Union Parish Library', url: 'https://www.union.lib.la.us', eventsUrl: 'https://www.union.lib.la.us/events', city: 'Farmerville', state: 'LA', zipCode: '71241', county: 'Farmerville County'},
  { name: 'Webster Parish Library', url: 'https://www.webster.lib.la.us', eventsUrl: 'https://www.webster.lib.la.us/events', city: 'Minden', state: 'LA', zipCode: '71055', county: 'Minden County'},
  { name: 'Morehouse Parish Library', url: 'https://www.morehouse.lib.la.us', eventsUrl: 'https://www.morehouse.lib.la.us/events', city: 'Bastrop', state: 'LA', zipCode: '71220', county: 'Bastrop County'},
  { name: 'Richland Parish Library', url: 'https://www.richland.lib.la.us', eventsUrl: 'https://www.richland.lib.la.us/events', city: 'Rayville', state: 'LA', zipCode: '71269', county: 'Rayville County'},
  { name: 'Madison Parish Library', url: 'https://www.madison.lib.la.us', eventsUrl: 'https://www.madison.lib.la.us/events', city: 'Tallulah', state: 'LA', zipCode: '71282', county: 'Tallulah County'},
  { name: 'Franklin Parish Library', url: 'https://www.franklin.lib.la.us', eventsUrl: 'https://www.franklin.lib.la.us/events', city: 'Winnsboro', state: 'LA', zipCode: '71295', county: 'Winnsboro County'},
  { name: 'Tensas Parish Library', url: 'https://www.tensas.lib.la.us', eventsUrl: 'https://www.tensas.lib.la.us/events', city: 'St. Joseph', state: 'LA', zipCode: '71366', county: 'St. Joseph County'},
  { name: 'Concordia Parish Library', url: 'https://www.concordia.lib.la.us', eventsUrl: 'https://www.concordia.lib.la.us/events', city: 'Vidalia', state: 'LA', zipCode: '71373', county: 'Vidalia County'},
  { name: 'Catahoula Parish Library', url: 'https://www.catahoula.lib.la.us', eventsUrl: 'https://www.catahoula.lib.la.us/events', city: 'Harrisonburg', state: 'LA', zipCode: '71340', county: 'Harrisonburg County'},
  { name: 'LaSalle Parish Library', url: 'https://www.lasalle.lib.la.us', eventsUrl: 'https://www.lasalle.lib.la.us/events', city: 'Jena', state: 'LA', zipCode: '71342', county: 'Jena County'},
  { name: 'Grant Parish Library', url: 'https://www.grant.lib.la.us', eventsUrl: 'https://www.grant.lib.la.us/events', city: 'Colfax', state: 'LA', zipCode: '71417', county: 'Colfax County'},
  { name: 'Winn Parish Library', url: 'https://www.winn.lib.la.us', eventsUrl: 'https://www.winn.lib.la.us/events', city: 'Winnfield', state: 'LA', zipCode: '71483', county: 'Winnfield County'},
  { name: 'Jackson Parish Library', url: 'https://www.jackson.lib.la.us', eventsUrl: 'https://www.jackson.lib.la.us/events', city: 'Jonesboro', state: 'LA', zipCode: '71251', county: 'Jonesboro County'},
  { name: 'Claiborne Parish Library', url: 'https://www.claiborne.lib.la.us', eventsUrl: 'https://www.claiborne.lib.la.us/events', city: 'Homer', state: 'LA', zipCode: '71040', county: 'Homer County'},
  { name: 'Bienville Parish Library', url: 'https://www.bienville.lib.la.us', eventsUrl: 'https://www.bienville.lib.la.us/events', city: 'Arcadia', state: 'LA', zipCode: '71001', county: 'Arcadia County'},
  { name: 'Red River Parish Library', url: 'https://www.redriver.lib.la.us', eventsUrl: 'https://www.redriver.lib.la.us/events', city: 'Coushatta', state: 'LA', zipCode: '71019', county: 'Coushatta County'},
  { name: 'Sabine Parish Library', url: 'https://www.sabine.lib.la.us', eventsUrl: 'https://www.sabine.lib.la.us/events', city: 'Many', state: 'LA', zipCode: '71449', county: 'Many County'},
  { name: 'De Soto Parish Library', url: 'https://www.desoto.lib.la.us', eventsUrl: 'https://www.desoto.lib.la.us/events', city: 'Mansfield', state: 'LA', zipCode: '71052', county: 'Mansfield County'},
  { name: 'Caldwell Parish Library', url: 'https://www.caldwell.lib.la.us', eventsUrl: 'https://www.caldwell.lib.la.us/events', city: 'Columbia', state: 'LA', zipCode: '71418', county: 'Columbia County'},
  { name: 'East Carroll Parish Library', url: 'https://www.eastcarroll.lib.la.us', eventsUrl: 'https://www.eastcarroll.lib.la.us/events', city: 'Lake Providence', state: 'LA', zipCode: '71254', county: 'Lake Providence County'},
  { name: 'West Carroll Parish Library', url: 'https://www.westcarroll.lib.la.us', eventsUrl: 'https://www.westcarroll.lib.la.us/events', city: 'Oak Grove', state: 'LA', zipCode: '71263', county: 'Oak Grove County'},
  { name: 'Pointe Coupee Parish Library', url: 'https://www.pointe-coupee.lib.la.us', eventsUrl: 'https://www.pointe-coupee.lib.la.us/events', city: 'New Roads', state: 'LA', zipCode: '70760', county: 'New Roads County'},
  { name: 'West Baton Rouge Parish Library', url: 'https://www.wbrpl.com', eventsUrl: 'https://www.wbrpl.com/events', city: 'Port Allen', state: 'LA', zipCode: '70767', county: 'Port Allen County'},
  { name: 'Iberville Parish Library', url: 'https://www.iberville.lib.la.us', eventsUrl: 'https://www.iberville.lib.la.us/events', city: 'Plaquemine', state: 'LA', zipCode: '70764', county: 'Plaquemine County'},
  { name: 'East Feliciana Parish Library', url: 'https://www.efpl.org', eventsUrl: 'https://www.efpl.org/events', city: 'Clinton', state: 'LA', zipCode: '70722', county: 'Clinton County'},
  { name: 'West Feliciana Parish Library', url: 'https://www.westfeliciana.lib.la.us', eventsUrl: 'https://www.westfeliciana.lib.la.us/events', city: 'St. Francisville', state: 'LA', zipCode: '70775', county: 'St. Francisville County'},
  { name: 'St. Helena Parish Library', url: 'https://www.sthelena.lib.la.us', eventsUrl: 'https://www.sthelena.lib.la.us/events', city: 'Greensburg', state: 'LA', zipCode: '70441', county: 'Greensburg County'},
  { name: 'Washington Parish Library', url: 'https://www.washington.lib.la.us', eventsUrl: 'https://www.washington.lib.la.us/events', city: 'Franklinton', state: 'LA', zipCode: '70438', county: 'Franklinton County'},
  { name: 'St. James Parish Library', url: 'https://www.stjames.lib.la.us', eventsUrl: 'https://www.stjames.lib.la.us/events', city: 'Lutcher', state: 'LA', zipCode: '70071', county: 'Lutcher County'},
  { name: 'Assumption Parish Library', url: 'https://www.assumption.lib.la.us', eventsUrl: 'https://www.assumption.lib.la.us/events', city: 'Napoleonville', state: 'LA', zipCode: '70390', county: 'Napoleonville County'},
  { name: 'Plaquemines Parish Library', url: 'https://www.plaquemines.lib.la.us', eventsUrl: 'https://www.plaquemines.lib.la.us/events', city: 'Belle Chasse', state: 'LA', zipCode: '70037', county: 'Belle Chasse County'},
  { name: 'Jefferson Davis Parish Library', url: 'https://www.jdparishlibrary.org', eventsUrl: 'https://www.jdparishlibrary.org/events', city: 'Jennings', state: 'LA', zipCode: '70546', county: 'Jennings County'},
  { name: 'Cameron Parish Library', url: 'https://www.cameron.lib.la.us', eventsUrl: 'https://www.cameron.lib.la.us/events', city: 'Cameron', state: 'LA', zipCode: '70631', county: 'Cameron County'},
  { name: 'Evangeline Parish Library', url: 'https://www.evangeline.lib.la.us', eventsUrl: 'https://www.evangeline.lib.la.us/events', city: 'Ville Platte', state: 'LA', zipCode: '70586', county: 'Ville Platte County'},
  { name: 'Avoyelles Parish Library', url: 'https://www.avoyelles.lib.la.us', eventsUrl: 'https://www.avoyelles.lib.la.us/events', city: 'Marksville', state: 'LA', zipCode: '71351', county: 'Marksville County'},
  { name: 'St. John the Baptist Parish Library', url: 'https://www.stjohn.lib.la.us', eventsUrl: 'https://www.stjohn.lib.la.us/events', city: 'LaPlace', state: 'LA', zipCode: '70068', county: 'LaPlace County'}
];

const SCRAPER_NAME = 'wordpress-LA';

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
                card.querySelector('time')
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('[class*="summary"]'),
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
            state: 'LA',
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
    state: 'LA',
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
async function scrapeWordpressLACloudFunction() {
  console.log('☁️ Running WordPress LA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-LA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToFirebase(events);
  // Log scraper stats to Firestore
  await logScraperResult('WordPress-LA', {
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

module.exports = { scrapeGenericEvents, saveToFirebase, scrapeWordpressLACloudFunction };
