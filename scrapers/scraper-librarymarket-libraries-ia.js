const { launchBrowser } = require('./puppeteer-config');
const { normalizeDateString } = require('./date-normalization-helper');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const { getBranchAddress } = require('./library-addresses');
const ngeohash = require('ngeohash');const admin = require('firebase-admin');
const { ScraperLogger } = require('./scraper-logger');

/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: IA
 * Platform: LibraryMarket
 * Libraries:
 *   - Ankeny Kirkendall Public Library (Ankeny, IA)
 *   - West Des Moines Public Library (West Des Moines, IA)
 *   - Urbandale Public Library (Urbandale, IA)
 *   - Marshalltown Public Library (Marshalltown, IA)
 */

const LIBRARIES = [
  {
    name: 'Ankeny Kirkendall Public Library',
    eventsUrl: 'https://ankeny.librarycalendar.com/',
    city: 'Ankeny',
    state: 'IA',
    zipCode: '50023'
  },
  {
    name: 'West Des Moines Public Library',
    eventsUrl: 'https://wdmlibrary.librarymarket.com/events/month',
    city: 'West Des Moines',
    state: 'IA',
    zipCode: '50265'
  },
  {
    name: 'Urbandale Public Library',
    eventsUrl: 'https://urbandale.librarycalendar.com/',
    city: 'Urbandale',
    state: 'IA',
    zipCode: '50322'
  },
  {
    name: 'Marshalltown Public Library',
    eventsUrl: 'https://marshalltown.librarycalendar.com/',
    city: 'Marshalltown',
    state: 'IA',
    zipCode: '50158'
  }
];

const SCRAPER_NAME = 'librarymarket-IA';

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

      // Wait for platform-specific event containers
      await page.waitForSelector('.em-card, .lc-event, article.event-card', { timeout: 15000 }).catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Platform-specific selectors (not generic)
        const eventSelectors = [
          '.em-card',                    // EventManager (Enoch Pratt)
          '.lc-event',                   // LibraryMarket (Allegany, Ruth Enlow, Carroll)
          '.lc-event--upcoming',         // LibraryMarket upcoming variant
          'article.event-card',          // Alternative LibraryMarket format
        ];

        let foundElements = [];
        for (const selector of eventSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements = Array.from(elements);
            break;
          }
        }

        foundElements.forEach(card => {
          try {
            // --- TITLE ---
            const titleEl =
              card.querySelector('.em-card_title a') ||       // EventManager
              card.querySelector('h2 a, h3 a') ||             // LibraryMarket headings
              card.querySelector('.em-card_title') ||          // EventManager (no link)
              card.querySelector('h2, h3, h4') ||             // Generic heading
              card.querySelector('a[href*="event"]');          // Fallback link
            if (!titleEl) return;
            const title = titleEl.textContent.trim();
            if (!title || title.length < 3) return;

            // --- DATE ---
            let dateStr = '';

            // Method 1: EventManager format ("Mon, Apr 13, 2026 10am" in .em-card_event-text)
            const emDateEl = card.querySelector('.em-card_event-text, .em-card_text p');
            if (emDateEl) {
              const emText = emDateEl.textContent.trim();
              // Match "Mon, Apr 13, 2026" or "April 13, 2026" patterns
              const emDateMatch = emText.match(/((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4}/i);
              if (emDateMatch) {
                dateStr = emDateMatch[0];
              }
            }

            // Method 2: LibraryMarket lc-date-icon elements
            if (!dateStr) {
              const lcMonth = card.querySelector('.lc-date-icon__item--month');
              const lcDay = card.querySelector('.lc-date-icon__item--day');
              if (lcMonth && lcDay) {
                const yearEl = card.querySelector('.lc-date-icon__item--year');
                const year = yearEl ? yearEl.textContent.trim() : new Date().getFullYear();
                dateStr = lcMonth.textContent.trim() + ' ' + lcDay.textContent.trim() + ', ' + year;
              }
            }

            // Method 3: Generic date pattern search in card text
            if (!dateStr) {
              const cardText = card.textContent || '';
              const dateMatch = cardText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4}/i);
              if (dateMatch) dateStr = dateMatch[0];
            }

            // --- TIME ---
            let timeStr = '';
            if (emDateEl) {
              const timeMatch = (emDateEl.textContent || '').match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i);
              if (timeMatch) timeStr = timeMatch[0];
            }

            // --- DESCRIPTION ---
            const descEl = card.querySelector('.em-card_event-text, [class*="description"], [class*="summary"], p');
            const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

            // --- URL ---
            const linkEl = card.querySelector('a[href]');
            const url = linkEl ? linkEl.href : window.location.href;

            // --- IMAGE ---
            const imageEl = card.querySelector('img');
            const imageUrl = imageEl ? imageEl.src : '';

            // --- AGE RANGE ---
            const ageEl = [
              card.querySelector('[class*="audience"]'),
              card.querySelector('[class*="age"]'),
              card.querySelector('[class*="category"]')
            ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

            // --- LOCATION ---
            const locEl = card.querySelector('.em-card_event-text a, [class*="location"], [class*="branch"]');
            const location = locEl ? locEl.textContent.trim() : libName;

            if (title && dateStr) {
              events.push({
                title,
                date: timeStr ? dateStr + ' ' + timeStr : dateStr,
                time: timeStr,
                description,
                url,
                imageUrl,
                ageRange: ageEl ? ageEl.textContent.trim() : '',
                location,
                venueName: libName
              });
            }
          } catch (e) {
            // Skip problematic elements
          }
        });

        // Deduplicate by title + date
        const seen = new Set();
        return events.filter(evt => {
          const key = (evt.title + '|' + evt.date).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      // Transform and add to collection with branch address lookup
      for (const event of libraryEvents) {
        // Normalize date format before saving
        let normalizedDate = normalizeDateString(event.date);
        // If date is time-only (e.g. "10:00am–11:00am"), it normalizes to empty.
        // Use today's date as fallback so we don't lose the event.
        if (!normalizedDate && event.date) {
          const timeOnly = /^\s*\d{1,2}:\d{2}\s*[ap]m/i.test(event.date.trim());
          if (timeOnly) {
            const today = new Date().toISOString().split('T')[0];
            normalizedDate = today;
            console.log(`   ℹ️ Date "${event.date}" is time-only — using today (${today})`);
          } else {
            console.log(`   ⚠️ Skipping event with invalid date: "${event.date}"`);
            continue;
          }
        }

        // Try to extract branch name from location field
        let branchName = null;
        const locationText = event.location || '';

        // Common branch patterns in location text
        // e.g., "Westminster Branch", "Eldersburg Library", "Central"
        if (locationText !== library.name) {
          const branchMatch = locationText.match(/^([^,\-–]+?)(?:\s+(?:Branch|Library))?(?:\s*[-–,]|$)/i);
          if (branchMatch && branchMatch[1].trim().length > 3) {
            branchName = branchMatch[1].trim();
          }
        }

        // Get branch address from library-addresses.js
        const branchLocation = getBranchAddress(library.name, branchName, library.state);

        events.push({
          ...event,
          date: normalizedDate || event.date,
          state: library.state,
          branchName: branchName || '',
          branchAddress: branchLocation?.address || '',
          branchCity: branchLocation?.city || library.city || '',
          branchZipCode: branchLocation?.zipCode || library.zipCode || '',
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url || library.eventsUrl,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'librarymarket',
            state: library.state,
            needsReview: true // Flag for manual review
          }
        });
      }

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 3000));

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
    state: 'IA',
    category: 'library',
    platform: 'librarymarket'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - IA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  // Log to database for monitoring


  await logScraperResult('Librarymarket Libraries IA', {


    found: events.length,


    new: events.length,


  }, { state: 'IA', source: 'librarymarket' });



  process.exit(0);
}

if (require.main === module) {
  main();
}

/**
 * Cloud Function export
 */
async function scrapeLibraryMarketIACloudFunction() {
  console.log('☁️ Running librarymarket-IA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length > 0) {
    await saveToDatabase(events);
  }
  return { imported: events.length, total: events.length };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeLibraryMarketIACloudFunction };
