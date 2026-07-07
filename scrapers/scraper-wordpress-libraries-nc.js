const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * North Carolina Public Libraries Scraper - Coverage: All North Carolina public libraries
 */
const LIBRARIES = [
  { name: 'Hazel W. Guilford Memorial Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'NC', zipCode: '00000', county: 'Aurora County'},
  { name: 'Bath Community Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'NC', zipCode: '00000', county: 'Bath County'},
  { name: 'Belmont Branch Library', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'NC', zipCode: '00000', county: 'Belmont County'},
  { name: 'Mary Duncan Public Library', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'NC', zipCode: '00000', county: 'Benson County'},
  { name: 'Margaret Little Blount Library', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'NC', zipCode: '00000', county: 'Bethel County'},
  { name: 'Black Creek Branch Library', url: 'https://www.blackcreeklibrary.org', eventsUrl: 'https://www.blackcreeklibrary.org/events', city: 'Black Creek', state: 'NC', zipCode: '00000', county: 'Black Creek County'},
  { name: 'Watauga County Public Library', url: 'https://www.boonelibrary.org', eventsUrl: 'https://www.boonelibrary.org/events', city: 'Boone', state: 'NC', zipCode: '00000', county: 'Boone County'},
  { name: 'Boonville Community Public Library', url: 'https://www.boonvillelib.org/', eventsUrl: 'https://www.boonvillelib.org/', city: 'Boonville', state: 'NC', zipCode: '00000', county: 'Boonville County'},
  { name: 'Bunn Branch Library', url: 'https://www.bunnlibrary.org', eventsUrl: 'https://www.bunnlibrary.org/events', city: 'Bunn', state: 'NC', zipCode: '00000', county: 'Bunn County'},
  { name: 'Alamance County Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'NC', zipCode: '27215', county: 'Burlington County'},
  { name: 'Canton Branch Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'NC', zipCode: '00000', county: 'Canton County'},
  { name: 'Moore County Library', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'NC', zipCode: '00000', county: 'Carthage County'},
  { name: 'Cary Branch Library', url: 'https://www.carylibrary.org', eventsUrl: 'https://www.carylibrary.org/events', city: 'Cary', state: 'NC', zipCode: '00000', county: 'Cary County'},
  { name: 'Beatties Ford Road Branch Library', url: 'https://charlottelibrary.org/', eventsUrl: 'https://charlottelibrary.org/calendar/', city: 'Charlotte', state: 'NC', zipCode: '00000', county: 'Charlotte County'},
  { name: 'Claremont Branch Library', url: 'https://www.claremontlibrary.org/', eventsUrl: 'https://www.claremontlibrary.org/', city: 'Claremont', state: 'NC', zipCode: '00000', county: 'Claremont County'},
  { name: 'Hocutt Ellington Memorial Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'NC', zipCode: '00000', county: 'Clayton County'},
  { name: 'J.C. Holliday Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'NC', zipCode: '00000', county: 'Clinton County'},
  { name: 'Tyrrell County Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'NC', zipCode: '00000', county: 'Columbia County'},
  { name: 'Polk County Public Library', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'NC', zipCode: '28722', county: 'Columbus County'},
  { name: 'Cabarrus County Public Library', url: 'https://www.concordlibrary.org', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'NC', zipCode: '28025', county: 'Concord County'},
  { name: 'Dallas Branch Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'NC', zipCode: '00000', county: 'Dallas County'},
  { name: 'Danbury Public Library', url: 'https://danburylibrary.org/', eventsUrl: 'https://danburylibrary.org/', city: 'Danbury', state: 'NC', zipCode: '00000', county: 'Danbury County'},
  { name: 'Florence S. Shanklin Branch Library', url: 'https://www.denverlibrary.org', eventsUrl: 'https://www.denverlibrary.org/events', city: 'Denver', state: 'NC', zipCode: '00000', county: 'Denver County'},
  { name: 'Dobson Community Library', url: 'https://www.dobsonlibrary.org', eventsUrl: 'https://www.dobsonlibrary.org/events', city: 'Dobson', state: 'NC', zipCode: '00000', county: 'Dobson County'},
  { name: 'Bragtown Branch Library', url: 'https://www.durhamlibrary.org', eventsUrl: 'https://www.durhamlibrary.org/events', city: 'Durham', state: 'NC', zipCode: '00000', county: 'Durham County'},
  { name: 'Erwin Public Library', url: 'https://erwinlibrary.org/', eventsUrl: 'https://erwinlibrary.org/', city: 'Erwin', state: 'NC', zipCode: '00000', county: 'Erwin County'},
  { name: 'Fairview Branch Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'NC', zipCode: '00000', county: 'Fairview County'},
  { name: 'Farmville Public Library', url: 'https://farmvillelibrary.libguides.com/', eventsUrl: 'https://farmvillelibrary.libguides.com/home', city: 'Farmville', state: 'NC', zipCode: '27828', county: 'Farmville County'},
  { name: 'Bordeaux Branch Library', url: 'https://www.fayettevillelibrary.org', eventsUrl: 'https://www.fayettevillelibrary.org/events', city: 'Fayetteville', state: 'NC', zipCode: '00000', county: 'Fayetteville County'},
  { name: 'Macon County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NC', zipCode: '00000', county: 'Franklin County'},
  { name: 'John W. Clark Public Library', url: 'https://franklinvillelibrary.org/', eventsUrl: 'https://franklinvillelibrary.org/', city: 'Franklinville', state: 'NC', zipCode: '00000', county: 'Franklinville County'},
  { name: 'Wayne County Public Library, Fremont', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'NC', zipCode: '00000', county: 'Fremont County'},
  { name: 'Graham Public Library', url: 'https://www.grahamlibrary.org', eventsUrl: 'https://www.grahamlibrary.org/events', city: 'Graham', state: 'NC', zipCode: '00000', county: 'Graham County'},
  { name: 'Blanche Benjamin Branch Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'NC', zipCode: '00000', county: 'Greensboro County'},
  { name: 'Carver Branch Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'NC', zipCode: '00000', county: 'Greenville County'},
  { name: 'Halifax County Library System', url: 'https://www.halifaxlibrary.org', eventsUrl: 'https://www.halifaxlibrary.org/events', city: 'Halifax', state: 'NC', zipCode: '27839', county: 'Halifax County'},
  { name: 'Hampstead Branch Library', url: 'https://www.hampsteadlibrary.org/', eventsUrl: 'https://www.hampsteadlibrary.org/', city: 'Hampstead', state: 'NC', zipCode: '00000', county: 'Hampstead County'},
  { name: 'Harmony Branch Library', url: 'https://www.harmonylibrary.org', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Harmony', state: 'NC', zipCode: '00000', county: 'Harmony County'},
  { name: 'Harrisburg Library', url: 'https://www.harrisburglibrary.org/', eventsUrl: 'https://www.harrisburglibrary.org/calendar', city: 'Harrisburg', state: 'NC', zipCode: '00000', county: 'Harrisburg County'},
  { name: 'Havelock-Craven County Public', url: 'https://citylibrary.com/', eventsUrl: 'https://citylibrary.com/public-libraries/havelock-public-library/', city: 'Havelock', state: 'NC', zipCode: '00000', county: 'Havelock County'},
  { name: 'Henderson County Public Library', url: 'https://youseemore.com/', eventsUrl: 'https://youseemore.com/hendersonville/', city: 'Hendersonville', state: 'NC', zipCode: '28739', county: 'Hendersonville County'},
  { name: 'Hickory Public Library', url: 'https://www.hickorylibrary.org', eventsUrl: 'https://www.hickorylibrary.org/events', city: 'Hickory', state: 'NC', zipCode: '28601', county: 'Hickory County'},
  { name: 'Hudson Branch Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'NC', zipCode: '00000', county: 'Hudson County'},
  { name: 'Union West Branch Library', url: 'https://www.indiantraillibrary.org', eventsUrl: 'https://www.indiantraillibrary.org/events', city: 'Indian Trail', state: 'NC', zipCode: '00000', county: 'Indian Trail County'},
  { name: 'King Public Library', url: 'https://www.kinglibrary.org', eventsUrl: 'https://www.kinglibrary.org/events', city: 'King', state: 'NC', zipCode: '00000', county: 'King County'},
  { name: 'La Grange Branch Library', url: 'https://lagrangelibrary.org/', eventsUrl: 'https://lagrangelibrary.org/', city: 'La Grange', state: 'NC', zipCode: '00000', county: 'La Grange County'},
  { name: 'Leicester Branch Library', url: 'https://www.leicesterlibrary.org', eventsUrl: 'https://www.leicesterlibrary.org/events', city: 'Leicester', state: 'NC', zipCode: '00000', county: 'Leicester County'},
  { name: 'Leland Branch Library', url: 'https://www.lelandlibrary.org', eventsUrl: 'https://www.lelandlibrary.org/events', city: 'Leland', state: 'NC', zipCode: '00000', county: 'Leland County'},
  { name: 'Davidson County Public Library System', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'NC', zipCode: '27292', county: 'Lexington County'},
  { name: 'Liberty Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'NC', zipCode: '00000', county: 'Liberty County'},
  { name: 'Littleton Public Library (Wc Jones Memorial)', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'NC', zipCode: '00000', county: 'Littleton County'},
  { name: 'Franklin County Library', url: 'https://www.louisburglibrary.org', eventsUrl: 'https://www.louisburglibrary.org/events', city: 'Louisburg', state: 'NC', zipCode: '27549', county: 'Louisburg County'},
  { name: 'Lowell Branch Library', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'NC', zipCode: '00000', county: 'Lowell County'},
  { name: 'Madison Branch Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NC', zipCode: '00000', county: 'Madison County'},
  { name: 'Florence Gallier Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'NC', zipCode: '00000', county: 'Magnolia County'},
  { name: 'Mcdowell County Law Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'NC', zipCode: '00000', county: 'Marion County'},
  { name: 'Madison County Public Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'NC', zipCode: '28753', county: 'Marshall County'},
  { name: 'Matthews Branch Library', url: 'https://www.matthewslibrary.org', eventsUrl: 'https://www.matthewslibrary.org/events', city: 'Matthews', state: 'NC', zipCode: '00000', county: 'Matthews County'},
  { name: 'Maysville Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'NC', zipCode: '00000', county: 'Maysville County'},
  { name: 'Union County Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NC', zipCode: '28112', county: 'Monroe County'},
  { name: 'Mooresville Public Library', url: 'https://www.mooresvillelibrary.org/', eventsUrl: 'https://www.mooresvillelibrary.org/', city: 'Mooresville', state: 'NC', zipCode: '28115', county: 'Mooresville County'},
  { name: 'Craven-Pamlico-Carteret Regional Library', url: 'https://www.newbernlibrary.org', eventsUrl: 'https://www.newbernlibrary.org/events', city: 'New Bern', state: 'NC', zipCode: '28560', county: 'New Bern County'},
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'NC', zipCode: '00000', county: 'Newport County'},
  { name: 'Catawba County Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NC', zipCode: '28658', county: 'Newton County'},
  { name: 'Norwood Branch Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'NC', zipCode: '00000', county: 'Norwood County'},
  { name: 'Berea Branch Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'NC', zipCode: '00000', county: 'Oxford County'},
  { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'NC', zipCode: '00000', county: 'Pembroke County'},
  { name: 'Pinebluff Public Library', url: 'https://www.pineblufflibrary.org/', eventsUrl: 'https://www.pineblufflibrary.org/', city: 'Pinebluff', state: 'NC', zipCode: '00000', county: 'Pinebluff County'},
  { name: 'Pettigrew Regional Library', url: 'https://plymouthlibrary.org/', eventsUrl: 'https://plymouthlibrary.org/', city: 'Plymouth', state: 'NC', zipCode: '27962', county: 'Plymouth County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'NC', zipCode: '00000', county: 'Princeton County'},
  { name: 'Roanoke Rapids Public Library', url: 'https://www.roanokerapidslibrary.org/', eventsUrl: 'https://www.roanokerapidslibrary.org/', city: 'Roanoke Rapids', state: 'NC', zipCode: '27870', county: 'Roanoke Rapids County'},
  { name: 'Robbins Area Branch', url: 'https://www.robbinslibrary.org', eventsUrl: 'https://www.robbinslibrary.org/events', city: 'Robbins', state: 'NC', zipCode: '00000', county: 'Robbins County'},
  { name: 'Leath Memorial Library', url: 'https://www.rockinghamlibrary.org', eventsUrl: 'https://www.rockinghamlibrary.org/events', city: 'Rockingham', state: 'NC', zipCode: '00000', county: 'Rockingham County'},
  { name: 'Rowan Public Library', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'NC', zipCode: '28145', county: 'Salisbury County'},
  { name: 'Saluda Branch Library', url: 'https://www.saludalibrary.org', eventsUrl: 'https://www.saludalibrary.org/events', city: 'Saluda', state: 'NC', zipCode: '00000', county: 'Saluda County'},
  { name: 'Selma Public Library', url: 'https://selmalibrary.org/', eventsUrl: 'https://selmalibrary.org/', city: 'Selma', state: 'NC', zipCode: '00000', county: 'Selma County'},
  { name: 'Cleveland County Memorial Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'NC', zipCode: '28150', county: 'Shelby County'},
  { name: 'Public Library Of Johnston County Smithfield', url: 'https://www.smithfieldlibrary.org/', eventsUrl: 'https://www.smithfieldlibrary.org/', city: 'Smithfield', state: 'NC', zipCode: '27577', county: 'Smithfield County'},
  { name: 'Brunswick County Library', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'NC', zipCode: '28461', county: 'Southport County'},
  { name: 'Alleghany County Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'NC', zipCode: '00000', county: 'Sparta County'},
  { name: 'Spring Lake Branch', url: 'https://www.springlakelibrary.org', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Spring Lake', state: 'NC', zipCode: '00000', county: 'Spring Lake County'},
  { name: 'Stanley Branch Library', url: 'https://www.stanleylibrary.org', eventsUrl: 'https://www.stanleylibrary.org/events', city: 'Stanley', state: 'NC', zipCode: '00000', county: 'Stanley County'},
  { name: 'Star Branch', url: 'https://www.starlibrary.org', eventsUrl: 'https://www.starlibrary.org/events', city: 'Star', state: 'NC', zipCode: '00000', county: 'Star County'},
  { name: 'Montgomery County Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'NC', zipCode: '00000', county: 'Troy County'},
  { name: 'Warren County Memorial Library', url: 'https://www.warrentonlibrary.org', eventsUrl: 'https://www.warrentonlibrary.org/events', city: 'Warrenton', state: 'NC', zipCode: '27589', county: 'Warrenton County'},
  { name: 'Warsaw-Kornegay Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'NC', zipCode: '00000', county: 'Warsaw County'},
  { name: 'Myrtle Grove Branch', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'NC', zipCode: '00000', county: 'Wilmington County'},
  { name: 'East Branch Library', url: 'https://www.wilsonlibrary.org', eventsUrl: 'https://www.wilsonlibrary.org/events', city: 'Wilson', state: 'NC', zipCode: '00000', county: 'Wilson County'},
  { name: 'Lawrence Memorial Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'NC', zipCode: '00000', county: 'Windsor County'},
];

const SCRAPER_NAME = 'wordpress-NC';

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
            state: 'NC',
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
    state: 'NC',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  North Carolina Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressNCCloudFunction() {
  console.log('☁️ Running WordPress NC as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NC', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-NC', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNCCloudFunction };
