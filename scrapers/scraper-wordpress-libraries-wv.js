const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * West Virginia Public Libraries Scraper - Coverage: All West Virginia public libraries
 */
const LIBRARIES = [
  { name: 'Kanawha County Public Library', url: 'https://www.kcpls.org/', eventsUrl: 'https://www.kcpls.org/', city: 'Charleston', state: 'WV', zipCode: '25301', county: 'Charleston County'},
  { name: 'Ohio County Public Library', url: 'https://www.ohiocountylibrary.org/', eventsUrl: 'https://www.ohiocountylibrary.org/calendar', city: 'Wheeling', state: 'WV', zipCode: '26003' },
  { name: 'Berkeley County Public Library', url: 'https://bcpls.org/', eventsUrl: 'https://bcpls.org/', city: 'Martinsburg', state: 'WV', zipCode: '25401', county: 'Martinsburg County'},
  { name: 'Harrison County Public Library', url: 'https://www.clarksburglibrary.org', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'WV', zipCode: '26301', county: 'Clarksburg County'},
  { name: 'Marion County Public Library', url: 'https://www.marioncountylibrary.org/', eventsUrl: 'https://www.marioncountylibrary.org/calendar', city: 'Fairmont', state: 'WV', zipCode: '26554' },
  { name: 'Mercer County Public Library', url: 'https://www.mercercountylibrary.org/', eventsUrl: 'https://www.mercercountylibrary.org/', city: 'Princeton', state: 'WV', zipCode: '24740' },
  { name: 'Putnam County Public Library', url: 'https://putnamcountylibrary.org/', eventsUrl: 'https://putnamcountylibrary.org/', city: 'Hurricane', state: 'WV', zipCode: '25526' },
  { name: 'Marshall County Public Library', url: 'https://www.marshallcountylibrary.org', eventsUrl: 'https://www.marshallcountylibrary.org/events', city: 'Moundsville', state: 'WV', zipCode: '26041' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'East Hardy Branch Public Library', url: 'https://www.bakerlibrary.org/', eventsUrl: 'https://www.bakerlibrary.org/', city: 'Baker', state: 'WV', zipCode: '26801', county: 'Baker County'},
  { name: 'Barrett-Wharton Public Library', url: 'https://www.barrettlibrary.org', eventsUrl: 'https://www.barrettlibrary.org/events', city: 'Barrett', state: 'WV', zipCode: '25208', county: 'Barrett County'},
  { name: 'Bridgeport Public Library', url: 'https://www.bridgeportlibrary.org/', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'WV', zipCode: '26330', county: 'Bridgeport County'},
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'WV', zipCode: '26710', county: 'Burlington County'},
  { name: 'Cameron Public Library', url: 'https://www.cameronlibrary.org/', eventsUrl: 'https://www.cameronlibrary.org/calendar', city: 'Cameron', state: 'WV', zipCode: '26033', county: 'Cameron County'},
  { name: 'Center Point Public Library', url: 'https://www.centerpointlibrary.org', eventsUrl: 'https://www.centerpointlibrary.org/events', city: 'Center Point', state: 'WV', zipCode: '26339', county: 'Center Point County'},
  { name: 'Lynn Murray Memorial Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'WV', zipCode: '26034', county: 'Chester County'},
  { name: 'Clay County Public Library', url: 'https://www.claylibrary.org/', eventsUrl: 'https://www.claylibrary.org/', city: 'Clay', state: 'WV', zipCode: '25043', county: 'Clay County'},
  { name: 'Sand Hill Public Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'WV', zipCode: '26036', county: 'Dallas County'},
  { name: 'Dunbar Branch Library', url: 'https://www.dunbarlibrary.org', eventsUrl: 'https://www.dunbarlibrary.org/events', city: 'Dunbar', state: 'WV', zipCode: '25064', county: 'Dunbar County'},
  { name: 'Fairview Public Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'WV', zipCode: '26570', county: 'Fairview County'},
  { name: 'Pendleton County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'WV', zipCode: '26807', county: 'Franklin County'},
  { name: 'Gilbert Public Library', url: 'https://www.gilbertlibrary.org/', eventsUrl: 'https://www.gilbertlibrary.org/', city: 'Gilbert', state: 'WV', zipCode: '25621', county: 'Gilbert County'},
  { name: 'Glasgow Branch Library', url: 'https://www.glasgowlibrary.org/', eventsUrl: 'https://www.glasgowlibrary.org/upcoming-events', city: 'Glasgow', state: 'WV', zipCode: '25086', county: 'Glasgow County'},
  { name: 'Taylor County Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'WV', zipCode: '26354', county: 'Grafton County'},
  { name: 'Hamlin-Lincoln County Public Library', url: 'https://www.hamlinlibrary.org/', eventsUrl: 'https://www.hamlinlibrary.org/', city: 'Hamlin', state: 'WV', zipCode: '25523', county: 'Hamlin County'},
  { name: 'Hanover Public Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'WV', zipCode: '24839', county: 'Hanover County'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'WV', zipCode: '24946', county: 'Hillsboro County'},
  { name: 'Summers County Public Library', url: 'https://www.hintonlibrary.org', eventsUrl: 'https://www.hintonlibrary.org/events', city: 'Hinton', state: 'WV', zipCode: '25951', county: 'Hinton County'},
  { name: 'Boone-Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'WV', zipCode: '25130', county: 'Madison County'},
  { name: 'Milton Branch Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'WV', zipCode: '25541', county: 'Milton County'},
  { name: 'Montgomery Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'WV', zipCode: '25136', county: 'Montgomery County'},
  { name: 'Swaney Memorial Library', url: 'https://www.newcumberlandlibrary.org', eventsUrl: 'https://www.newcumberlandlibrary.org/events', city: 'New Cumberland', state: 'WV', zipCode: '26047', county: 'New Cumberland County'},
  { name: 'Paden City Public Library', url: 'https://www.padencitylibrary.org/', eventsUrl: 'https://www.padencitylibrary.org/calendar', city: 'Paden City', state: 'WV', zipCode: '26159', county: 'Paden City County'},
  { name: 'Paw Paw Public Library', url: 'https://www.pawpawlibrary.org', eventsUrl: 'https://www.pawpawlibrary.org/events', city: 'Paw Paw', state: 'WV', zipCode: '25434', county: 'Paw Paw County'},
  { name: 'Piedmont Public Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'WV', zipCode: '26750', county: 'Piedmont County'},
  { name: 'Richwood Public Library', url: 'https://www.richwoodlibrary.org', eventsUrl: 'https://www.richwoodlibrary.org/events', city: 'Richwood', state: 'WV', zipCode: '26261', county: 'Richwood County'},
  { name: 'Jackson County Public Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'WV', zipCode: '25271', county: 'Ripley County'},
  { name: 'Ronceverte Public Library', url: 'https://www.roncevertelibrary.org/', eventsUrl: 'https://www.roncevertelibrary.org/', city: 'Ronceverte', state: 'WV', zipCode: '24970', county: 'Ronceverte County'},
  { name: 'South Charleston Public Library', url: 'https://www.scplwv.org/', eventsUrl: 'https://www.scplwv.org/events', city: 'South Charleston', state: 'WV', zipCode: '25303', county: 'South Charleston County'},
  { name: 'Pleasants County Public Library', url: 'https://www.stmaryslibrary.org', eventsUrl: 'https://www.stmaryslibrary.org/events', city: 'St. Marys', state: 'WV', zipCode: '26170', county: 'St. Marys County'},
  { name: 'Monroe County Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'WV', zipCode: '24983', county: 'Union County'},
  { name: 'Waverly Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'WV', zipCode: '26184', county: 'Waverly County'},
  { name: 'Louis Bennett Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'WV', zipCode: '26452', county: 'Weston County'},
  { name: 'Whitesville Public Library', url: 'https://www.whitesvillelibrary.org', eventsUrl: 'https://www.whitesvillelibrary.org/events', city: 'Whitesville', state: 'WV', zipCode: '25209', county: 'Whitesville County'},
  { name: 'Williamson Public Library', url: 'https://www.williamsonlibrary.org/', eventsUrl: 'https://www.williamsonlibrary.org/', city: 'Williamson', state: 'WV', zipCode: '25661', county: 'Williamson County'},
  { name: 'Williamstown Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'WV', zipCode: '26187', county: 'Williamstown County'}

];

const SCRAPER_NAME = 'wordpress-WV';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WV', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'WV',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWVCloudFunction() {
  console.log('☁️ Running WordPress WV as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WV', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-WV', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressWVCloudFunction };
