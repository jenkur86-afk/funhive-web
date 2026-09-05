// Local Puppeteer stack, matching the registered LibCal-VA2 twin. This file
// originally required puppeteer-core + @sparticuz/chromium — the AWS Lambda
// pair, which is NOT installed in this repo — so it threw
// "Cannot find module '@sparticuz/chromium'" on require and could never have
// run here. That is almost certainly why it was never registered, and it is
// worth knowing that `node -c` PASSES on it: a syntax check does not resolve
// requires, so "it compiles" was never evidence this orphan was viable.
const { launchBrowser } = require('./puppeteer-config');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: FL
 * Libraries: [
  {
    "name": "Jacksonville Public Library",
    "url": "https://jaxpubliclibrary.org",
    "platform": "libcal",
    "eventsUrl": "https://events.jaxpubliclibrary.org"
  }
]
 */

// TWO SYSTEMS REMOVED 2026-09-03 when this file was registered as LibCal-FL2:
//
//   Jacksonville Public Library — its LibCal URL is DEAD, not merely slow:
//   events.jaxpubliclibrary.org returns HTTP 404 ("Sorry, page not found -
//   Jacksonville Public Library") behind a TLS certificate that does not even
//   match the host, and jaxpubliclibrary.libcal.com does not resolve at all.
//   It is not a coverage loss: the library is ALREADY SCRAPED by Communico-FL at
//   jaxpubliclibrary.libnet.info/events, proven by database-backed audit rows
//   (492, 23 and 21 events across three cycles), not by name similarity.
//
//   Clay County Public Library — already present in the shared LibCal file
//   (scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js) with the
//   identical claycountygov.libcal.com URL. The shared file wins; keeping both
//   would double-scrape one calendar under two scraper names. Note this is the
//   same Clay County that was moved OUT of the KY section on 2026-08-28 for
//   being Florida's, so it has now been mis-filed twice — check the shared file
//   before re-adding any Clay entry anywhere.
//
// The five below were each verified live on 2026-09-03 by their own LibCal page
// <title>, never by name similarity:
//   Collier  "LibCal - Collier County Public Library"
//   Volusia  "LibCal - Volusia County Public Library"
//   Osceola  "LibCal - Osceola Library System"
//   Leon     "Events - LCPL LibCal - Leon County Public Library"
//   Manatee  "Manatee Library Events & Spaces - Manatee Library"
// Event COUNTS are deliberately not claimed from those fetches: a LibCal grid
// renders client-side, so a plain read returns a shell whether the calendar is
// full or empty. That is what the Puppeteer run is for.
const LIBRARIES = [
  { name: "Collier County Public Library", url: "https://collier-lib.libcal.com", platform: "libcal", eventsUrl: "https://collier-lib.libcal.com/", city: "Naples", state: "FL", zipCode: "34102", county: "Collier" },
  { name: "Volusia County Public Library", url: "https://volusialibrary.libcal.com", platform: "libcal", eventsUrl: "https://volusialibrary.libcal.com/", city: "Daytona Beach", state: "FL", zipCode: "32114", county: "Volusia" },
  { name: "Osceola Library System", url: "https://osceolalibrary.libcal.com", platform: "libcal", eventsUrl: "https://osceolalibrary.libcal.com/calendar", city: "Kissimmee", state: "FL", zipCode: "34741", county: "Osceola" },
  { name: "Leon County Public Library", url: "https://leoncountyfl.libcal.com", platform: "libcal", eventsUrl: "https://leoncountyfl.libcal.com/calendar/events", city: "Tallahassee", state: "FL", zipCode: "32301", county: "Leon" },
  { name: "Manatee County Public Library", url: "https://manateelibrary.libcal.com", platform: "libcal", eventsUrl: "https://manateelibrary.libcal.com/calendar", city: "Bradenton", state: "FL", zipCode: "34205", county: "Manatee" },
];

const SCRAPER_NAME = 'LibCal-FL2';

async function scrapeLibCalEvents() {
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

      // Wait for LibCal events container
      await page.waitForSelector('.s-lc-ea-e, .s-lc-whw-row', { timeout: 10000 }).catch(() => null);

      // EXTRACTION REPLACED 2026-09-03 with the block from its registered twin
      // scraper-libcal-libraries-va.js, verbatim. The auto-generated original tried
      // exactly two container selectors (.s-lc-ea-e, .s-lc-whw-row) and required BOTH
      // a title AND a date element to be present, so the first real run of this file
      // found 0 events on all five Florida systems even though every one of them
      // returned HTTP 200 with a correct LibCal <title>. LibCal renders several
      // different card layouts depending on the tenant's chosen view; the VA2 block
      // cascades through nine container selectors, then through title selectors, then
      // falls back to date PATTERNS rather than a date element. Reused rather than
      // reinvented so both files behave identically and only one has to be maintained.
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const selectors = [
          '.event-card', 'article.lc-event', '.s-lc-c-evt', '.s-lc-eventcard',
          '.s-lc-evt', '.s-lc-mc-evt', 'article.event', '.event-item', '[data-event-id]'
        ];
        let cards = [];
        for (const selector of selectors) {
          cards = document.querySelectorAll(selector);
          if (cards.length > 0) break;
        }

        const currentYear = new Date().getFullYear();
        const datePatterns = [
          /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i,
          /\w{3,9}\s+\d{1,2},?\s+\d{4}/i,
          /\d{1,2}\/\d{1,2}\/\d{4}/,
          /\w{3}\s+\d{1,2},?\s+\d{4}/i,
          /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\s+\d{4}\b/i,
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i
        ];

        cards.forEach(card => {
          try {
            const titleSelectors = ['.s-lc-eventcard-title', '.s-lc-evt-title', '.lc-event__title', 'h2', 'h3', 'h4', '.event-title', 'a[href*="event"]'];
            let title = '';
            for (const sel of titleSelectors) {
              const el = card.querySelector(sel);
              if (el && el.textContent.trim()) { title = el.textContent.trim(); break; }
            }
            if (!title) return;

            const linkEl = card.querySelector('a[href*="event"], a[href]');
            const url = linkEl ? linkEl.href : window.location.href;
            const imageEl = card.querySelector('img');
            const fullText = card.textContent.replace(/\s+/g, ' ').trim();

            let date = '';
            for (const pattern of datePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                date = match[0];
                if (!/\d{4}/.test(date)) date = date + ', ' + currentYear;
                break;
              }
            }
            if (!date) return;

            let time = '';
            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) || fullText.match(/All day/i);
            if (timeMatch) time = timeMatch[0];

            let location = '';
            const locationMatch = fullText.match(/(?:Location|Branch|Library|Venue):\s*([^.]+?)(?=\s+Audience:|\s+Categories:|$)/i);
            if (locationMatch) {
              location = locationMatch[1].trim().split(/\n|,/)[0];
              if (/^(Audience|Categories|Ages?|Date|Time|Cost|Price|Free|Register|Contact):/i.test(location)) location = '';
            }

            let ageRange = '';
            if (fullText.match(/baby|infant/i)) ageRange = 'Babies & Toddlers (0-2)';
            else if (fullText.match(/toddler|preschool/i)) ageRange = 'Preschool (3-5)';
            else if (fullText.match(/children|kids|ages 6|elementary/i)) ageRange = 'Kids (6-8)';
            else if (fullText.match(/teen|ages 13|middle school|high school/i)) ageRange = 'Teens (13-18)';

            const descEl = card.querySelector('.s-lc-eventcard-desc, .event-description, p, .description');
            const description = descEl ? descEl.textContent.trim() : fullText.substring(0, 300);

            events.push({
              title,
              date,
              time,
              description,
              url,
              imageUrl: imageEl ? imageEl.src : '',
              ageRange,
              location: location || libName,
              venueName: libName
            });
          } catch (e) {
            console.error('Error parsing event:', e);
          }
        });

        return events;
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      // Transform and add to collection
      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'libcal',
            state: 'FL'
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();

  console.log(`\n📊 Total events found: ${events.length}`);

  return events;
}

async function saveToDatabase(events) {
  await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'FL',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - FL (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  // Log to database for monitoring


  await logScraperResult('Libcal Libraries FL', {


    found: events.length,


    new: events.length,


  }, { state: 'FL', source: 'libcal' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

// Cloud-function entry point, mirroring scraper-libcal-libraries-va.js so the
// registry's exportName resolves and the runner gets real stats back.
async function scrapeLibCalEventsCloudFunction() {
  const events = await scrapeLibCalEvents();
  if (!events.length) {
    await logScraperResult(SCRAPER_NAME, { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  const stats = {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.duplicates ?? result?.skipped ?? 0,
    invalidDate: result?.invalidDate || 0,
  };
  await logScraperResult(SCRAPER_NAME, stats, { dataType: 'events' });
  return stats;
}

module.exports = { scrapeLibCalEvents, saveToDatabase, scrapeLibCalEventsCloudFunction };
