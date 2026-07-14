const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Oklahoma Public Libraries Scraper
 * State: OK
 * Coverage: All Oklahoma Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Metropolitan Library System', url: 'https://www.metrolibrary.org', eventsUrl: 'https://www.metrolibrary.org/events', city: 'Oklahoma City', state: 'OK', zipCode: '73102', county: 'Oklahoma City County'},
  { name: 'Tulsa City-County Library', url: 'https://www.tulsalibrary.org', eventsUrl: 'https://www.tulsalibrary.org/events', city: 'Tulsa', state: 'OK', zipCode: '74103', county: 'Tulsa County'},
  { name: 'Pioneer Library System', url: 'https://www.pioneerlibrarysystem.org', eventsUrl: 'https://www.pioneerlibrarysystem.org/events', city: 'Norman', state: 'OK', zipCode: '73069', county: 'Norman County'},
  // Regional Libraries
  { name: 'Broken Arrow Library', url: 'https://www.tulsalibrary.org/broken-arrow', eventsUrl: 'https://www.tulsalibrary.org/events', city: 'Broken Arrow', state: 'OK', zipCode: '74012', county: 'Broken Arrow County'},
  { name: 'Moore Public Library', url: 'https://www.cityofmoore.com/library', eventsUrl: 'https://www.cityofmoore.com/library/events', city: 'Moore', state: 'OK', zipCode: '73160', county: 'Moore County'},
  { name: 'Stillwater Public Library', url: 'https://library.stillwater.org', eventsUrl: 'https://library.stillwater.org/events', city: 'Stillwater', state: 'OK', zipCode: '74074', county: 'Stillwater County'},
  { name: 'Bartlesville Public Library', url: 'https://bartlesvillelibrary.com/', eventsUrl: 'https://bartlesvillelibrary.com/events/', city: 'Bartlesville', state: 'OK', zipCode: '74003', county: 'Bartlesville County'},
  { name: 'Owasso Library', url: 'https://www.tulsalibrary.org/owasso', eventsUrl: 'https://www.tulsalibrary.org/events', city: 'Owasso', state: 'OK', zipCode: '74055', county: 'Owasso County'},
  { name: 'Ardmore Public Library', url: 'https://ardmore.okpls.org/', eventsUrl: 'https://ardmore.okpls.org/calendar', city: 'Ardmore', state: 'OK', zipCode: '73401', county: 'Ardmore County'},
  { name: 'Del City Library', url: 'https://www.cityofdelcity.com/library', eventsUrl: 'https://www.cityofdelcity.com/library/events', city: 'Del City', state: 'OK', zipCode: '73115', county: 'Del City County'},
  { name: 'Bethany Library', url: 'https://www.bethanyok.org/library', eventsUrl: 'https://www.bethanyok.org/library/events', city: 'Bethany', state: 'OK', zipCode: '73008', county: 'Bethany County'},
  { name: 'Sand Springs Library', url: 'https://www.sandspringsok.org/library', eventsUrl: 'https://www.sandspringsok.org/library/events', city: 'Sand Springs', state: 'OK', zipCode: '74063', county: 'Sand Springs County'},
  { name: 'Claremore Public Library', url: 'https://www.claremore.org/library', eventsUrl: 'https://www.claremore.org/library/events', city: 'Claremore', state: 'OK', zipCode: '74017', county: 'Claremore County'},
  { name: 'El Reno Carnegie Library', url: 'https://elrenolibrary.okpls.org/', eventsUrl: 'https://elrenolibrary.okpls.org/', city: 'El Reno', state: 'OK', zipCode: '73036', county: 'El Reno County'},
  { name: 'Ada Public Library', url: 'https://www.adalibrary.org/', eventsUrl: 'https://www.adalibrary.org/', city: 'Ada', state: 'OK', zipCode: '74820', county: 'Ada County'},
  { name: 'Guthrie Public Library', url: 'https://www.guthrielibrary.org', eventsUrl: 'https://www.guthrielibrary.org/events', city: 'Guthrie', state: 'OK', zipCode: '73044', county: 'Guthrie County'},
];

const SCRAPER_NAME = 'wordpress-OK';

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
            state: 'OK',
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
    state: 'OK',
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
async function scrapeWordpressOKCloudFunction() {
  console.log('☁️ Running WordPress OK as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-OK', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-OK', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressOKCloudFunction };
