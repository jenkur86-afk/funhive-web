const { launchBrowser } = require('./helpers/puppeteer-config');
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
  { name: 'Johnson City Public Library', url: 'https://www.jcpl.org', eventsUrl: 'https://www.jcpl.org/events', city: 'Johnson City', state: 'TN', zipCode: '37601', county: 'Johnson City County'},
  { name: 'Kingsport Public Library', url: 'https://www.kingsportlibrary.org/', eventsUrl: 'https://www.kingsportlibrary.org/', city: 'Kingsport', state: 'TN', zipCode: '37660', county: 'Kingsport County'},
  { name: 'Williamson County Public Library', url: 'https://www.wcpltn.org/', eventsUrl: 'https://www.wcpltn.org/', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'},
  { name: 'Rutherford County Library System', url: 'https://www.rcls.org', eventsUrl: 'https://www.rcls.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Murfreesboro County'},
  { name: 'Blount County Public Library', url: 'https://www.blountlibrary.org', eventsUrl: 'https://www.blountlibrary.org/events', city: 'Maryville', state: 'TN', zipCode: '37801', county: 'Maryville County'},
  { name: 'Cleveland-Bradley County Public Library', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'TN', zipCode: '37311', county: 'Cleveland County'},
  { name: 'Germantown Community Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'TN', zipCode: '38138', county: 'Germantown County'},
  { name: 'Collierville Burch Library', url: 'https://www.colliervillelibrary.org', eventsUrl: 'https://www.colliervillelibrary.org/events', city: 'Collierville', state: 'TN', zipCode: '38017', county: 'Collierville County'},
  { name: 'Bartlett Library', url: 'https://www.cityofbartlett.org/library', eventsUrl: 'https://www.cityofbartlett.org/calendar.aspx?CID=34', city: 'Bartlett', state: 'TN', zipCode: '38134', county: 'Bartlett County'},
  { name: 'Hendersonville Public Library', url: 'https://youseemore.com/', eventsUrl: 'https://youseemore.com/hendersonville/', city: 'Hendersonville', state: 'TN', zipCode: '37075', county: 'Hendersonville County'},
  { name: 'Morristown-Hamblen Library', url: 'https://www.mhlibrary.org', eventsUrl: 'https://www.mhlibrary.org/events', city: 'Morristown', state: 'TN', zipCode: '37814', county: 'Morristown County'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'TN', zipCode: '37167', county: 'Smyrna County'},
  { name: 'Sevier County Public Library System', url: 'https://www.sevierlibrary.org/', eventsUrl: 'https://www.sevierlibrary.org/', city: 'Sevierville', state: 'TN', zipCode: '37862', county: 'Sevierville County'},
  { name: 'Tullahoma Public Library', url: 'https://www.tullahoma-tn.com/library', eventsUrl: 'https://www.tullahoma-tn.com/library/events', city: 'Tullahoma', state: 'TN', zipCode: '37388', county: 'Tullahoma County'},
  { name: 'Athens Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'TN', zipCode: '37303', county: 'Athens County'},
  { name: 'Lawrenceburg Public Library', url: 'https://lawrencelibrary.org/', eventsUrl: 'https://lawrencelibrary.org/', city: 'Lawrenceburg', state: 'TN', zipCode: '38464', county: 'Lawrenceburg County'},
  { name: 'Crossville-Cumberland County Public Library', url: 'https://www.cumberlandcountylibrary.org', eventsUrl: 'https://www.cumberlandcountylibrary.org/events', city: 'Crossville', state: 'TN', zipCode: '38555' },
  { name: 'Manchester Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'TN', zipCode: '37355', county: 'Manchester County'},
  { name: 'Rogersville Public Library', url: 'https://www.rogersvillelibrary.org', eventsUrl: 'https://www.rogersvillelibrary.org/events', city: 'Rogersville', state: 'TN', zipCode: '37857', county: 'Rogersville County'},
  { name: 'Tipton County Public Library', url: 'https://www.tiptoncountylibrary.org/', eventsUrl: 'https://www.tiptoncountylibrary.org/', city: 'Covington', state: 'TN', zipCode: '38019' },
  { name: 'Savannah-Hardin County Library', url: 'https://www.hardincountylibrary.org', eventsUrl: 'https://www.hardincountylibrary.org/events', city: 'Savannah', state: 'TN', zipCode: '38372' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Crockett County Library', url: 'https://www.alamolibrary.org', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'TN', zipCode: '38001', county: 'Alamo County'},
  { name: 'Alexandria Branch Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'TN', zipCode: '00000', county: 'Alexandria County'},
  { name: 'Southeast Branch Library', url: 'https://www.antiochlibrary.org', eventsUrl: 'https://www.antiochlibrary.org/events', city: 'Antioch', state: 'TN', zipCode: '00000', county: 'Antioch County'},
  { name: 'Ardmore Public Library', url: 'https://ardmore.okpls.org/', eventsUrl: 'https://ardmore.okpls.org/calendar', city: 'Ardmore', state: 'TN', zipCode: '38449', county: 'Ardmore County'},
  { name: 'Sam T. Wilson Public Library', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'TN', zipCode: '38002', county: 'Arlington County'},
  { name: 'Auburntown Public Library', url: 'https://adamsmemoriallibrary.org/', eventsUrl: 'https://adamsmemoriallibrary.org/', city: 'Auburntown', state: 'TN', zipCode: '00000', county: 'Auburntown County'},
  { name: 'Baxter Branch Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Baxter', state: 'TN', zipCode: '00000', county: 'Baxter County'},
  { name: 'The Brentwood Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'TN', zipCode: '37027', county: 'Brentwood County'},
  { name: 'Benton County Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'TN', zipCode: '38320', county: 'Camden County'},
  { name: 'Smith County Public Library', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'TN', zipCode: '37030', county: 'Carthage County'},
  { name: 'Hickman County Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'TN', zipCode: '37033', county: 'Centerville County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'TN', zipCode: '37716', county: 'Clinton County'},
  { name: 'Cordova Branch Library', url: 'https://cordovalibrary.org/', eventsUrl: 'https://cordovalibrary.org/', city: 'Cordova', state: 'TN', zipCode: '00000', county: 'Cordova County'},
  { name: 'Meigs-Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'TN', zipCode: '37322', county: 'Decatur County'},
  { name: 'Stewart County Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'TN', zipCode: '37058', county: 'Dover County'},
  { name: 'Sequatchie County Public Library', url: 'https://www.dunlaplibrary.org', eventsUrl: 'https://www.dunlaplibrary.org/events', city: 'Dunlap', state: 'TN', zipCode: '37327', county: 'Dunlap County'},
  { name: 'Englewood Public Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'TN', zipCode: '37329', county: 'Englewood County'},
  { name: 'Unicoi County Public Library', url: 'https://erwinlibrary.org/', eventsUrl: 'https://erwinlibrary.org/', city: 'Erwin', state: 'TN', zipCode: '37650', county: 'Erwin County'},
  { name: 'Fairview Public Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'TN', zipCode: '00000', county: 'Fairview County'},
  { name: 'Gleason Memorial Library', url: 'https://www.gleasonlibrary.org', eventsUrl: 'https://www.gleasonlibrary.org/events', city: 'Gleason', state: 'TN', zipCode: '38229', county: 'Gleason County'},
  { name: 'Dr. Nathan Porter Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'TN', zipCode: '38230', county: 'Greenfield County'},
  { name: 'Harriman Public Library', url: 'https://www.harrimanlibrary.org/', eventsUrl: 'https://www.harrimanlibrary.org/', city: 'Harriman', state: 'TN', zipCode: '37748', county: 'Harriman County'},
  { name: 'Carroll County Library', url: 'https://www.huntingdonlibrary.org', eventsUrl: 'https://www.huntingdonlibrary.org/events', city: 'Huntingdon', state: 'TN', zipCode: '38344', county: 'Huntingdon County'},
  { name: 'Fentress County Library', url: 'https://www.jamestownlibrary.org', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'TN', zipCode: '38556', county: 'Jamestown County'},
  { name: 'Kingston Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'TN', zipCode: '37763', county: 'Kingston County'},
  { name: 'Macon County Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'TN', zipCode: '37083', county: 'Lafayette County'},
  { name: 'Millard Oakley Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'TN', zipCode: '38570', county: 'Livingston County'},
  { name: 'Nashville Talking Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'TN', zipCode: '00000', county: 'Madison County'},
  { name: 'Madisonville Public Library', url: 'https://www.madisonvillelibrary.org', eventsUrl: 'https://www.madisonvillelibrary.org/events', city: 'Madisonville', state: 'TN', zipCode: '37354', county: 'Madisonville County'},
  { name: 'Middleton Community Library', url: 'https://www.middletonlibrary.org/', eventsUrl: 'https://www.middletonlibrary.org/calendar', city: 'Middleton', state: 'TN', zipCode: '38052', county: 'Middleton County'},
  { name: 'Mildred G. Fields Memorial Library', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'TN', zipCode: '38358', county: 'Milan County'},
  { name: 'Monterey Branch Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'TN', zipCode: '00000', county: 'Monterey County'},
  { name: 'Mt. Juliet-Harvey Freeman Public Library', url: 'https://www.mtjulietlibrary.org', eventsUrl: 'https://www.mtjulietlibrary.org/events', city: 'Mt. Juliet', state: 'TN', zipCode: '37122', county: 'Mt. Juliet County'},
  { name: 'Newbern City Library', url: 'https://www.newbernlibrary.org', eventsUrl: 'https://www.newbernlibrary.org/events', city: 'Newbern', state: 'TN', zipCode: '38059', county: 'Newbern County'},
  { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'TN', zipCode: '37365', county: 'Palmer County'},
  { name: 'Parsons Public Library', url: 'https://www.parsonslibrary.org/', eventsUrl: 'https://www.parsonslibrary.org/', city: 'Parsons', state: 'TN', zipCode: '38363', county: 'Parsons County'},
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.org', eventsUrl: 'https://www.portlandlibrary.org/events', city: 'Portland', state: 'TN', zipCode: '37148', county: 'Portland County'},
  { name: 'Lauderdale County Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'TN', zipCode: '38063', county: 'Ripley County'},
  { name: 'Seymour Branch Library', url: 'https://www.seymourlibrary.org', eventsUrl: 'https://www.seymourlibrary.org/events', city: 'Seymour', state: 'TN', zipCode: '00000', county: 'Seymour County'},
  { name: 'Somerville-Fayette County Library', url: 'https://www.somervillelibrary.org/', eventsUrl: 'https://www.somervillelibrary.org/', city: 'Somerville', state: 'TN', zipCode: '38068', county: 'Somerville County'},
  { name: 'White County Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'TN', zipCode: '38583', county: 'Sparta County'},
  { name: 'Audrey Pack Memorial Library', url: 'https://springcitylibrary.org/', eventsUrl: 'https://springcitylibrary.org/', city: 'Spring City', state: 'TN', zipCode: '37381', county: 'Spring City County'},
  { name: 'Spring Hill Public Library', url: 'https://www.springhilllibrary.org', eventsUrl: 'https://www.springhilllibrary.org/events', city: 'Spring Hill', state: 'TN', zipCode: '37174', county: 'Spring Hill County'},
  { name: 'Sweetwater Public Library', url: 'https://www.sweetwaterlibrary.org/', eventsUrl: 'https://www.sweetwaterlibrary.org/', city: 'Sweetwater', state: 'TN', zipCode: '37874', county: 'Sweetwater County'},
  { name: 'Mary E. Tippitt Memorial Library', url: 'https://www.townsendlibrary.org', eventsUrl: 'https://www.townsendlibrary.org/events', city: 'Townsend', state: 'TN', zipCode: '37882', county: 'Townsend County'},
  { name: 'Hamilton Parks Public Library', url: 'https://www.trimblelibrary.org', eventsUrl: 'https://www.trimblelibrary.org/events', city: 'Trimble', state: 'TN', zipCode: '38259', county: 'Trimble County'},
  { name: 'Washburn Public Library', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'TN', zipCode: '37888', county: 'Washburn County'},
  { name: 'Watertown-Wilson County Library', url: 'https://www.watertownlibrary.org/', eventsUrl: 'https://www.watertownlibrary.org/', city: 'Watertown', state: 'TN', zipCode: '00000', county: 'Watertown County'},
  { name: 'Humphreys County Public Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'TN', zipCode: '37185', county: 'Waverly County'},
  { name: 'Westmoreland Public Library', url: 'https://www.westmorelandpubliclibrary.com/', eventsUrl: 'https://www.westmorelandpubliclibrary.com/', city: 'Westmoreland', state: 'TN', zipCode: '37186', county: 'Westmoreland County'},
  { name: 'White Pine Public Library', url: 'https://whitepinelibrary.org/', eventsUrl: 'https://whitepinelibrary.org/', city: 'White Pine', state: 'TN', zipCode: '37890', county: 'White Pine County'},
  { name: 'Franklin County Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'TN', zipCode: '37398', county: 'Winchester County'},
  { name: 'Winfield Public Library', url: 'https://www.winfieldlibrary.org/', eventsUrl: 'https://www.winfieldlibrary.org/', city: 'Winfield', state: 'TN', zipCode: '37892', county: 'Winfield County'},
  { name: 'Adams Memorial Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'TN', zipCode: '00000', county: 'Woodbury County'},
  { name: 'Franklin Public Library', url: 'https://www.franklintn.gov/library', eventsUrl: 'https://www.franklintn.gov/library/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'}

];

const SCRAPER_NAME = 'wordpress-TN';

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

async function saveToDatabase(events) {
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
async function scrapeWordpressTNCloudFunction() {
  console.log('☁️ Running WordPress TN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-TN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-TN', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressTNCloudFunction };
