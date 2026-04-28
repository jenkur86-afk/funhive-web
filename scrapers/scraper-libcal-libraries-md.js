const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');
const ngeohash = require('ngeohash');
const admin = require('firebase-admin');

/**
 * LIBCAL SCRAPER - MARYLAND LIBRARIES
 * State: MD
 * Libraries covered:
 *   - Kent County Public Library
 *   - Worcester County Library
 *
 * NOTE: Caroline County uses LibraryCalendar (carolinecounty.librarycalendar.com), covered by LibraryCalendar MD/VA scraper
 * NOTE: Queen Anne's County uses Squarespace calendar (qaclibrary.org/calendar-monthly), needs separate scraper
 * NOTE: Carroll County uses LibraryMarket (ccpl.librarymarket.com), covered by LibraryMarket MD scraper
 * NOTE: Prince George's County uses custom events page, covered by scheduledPrinceGeorgesCountyLibrary
 *
 * Cloud Function: scheduledLibCalMD
 * Schedule: Every 3 days
 */

const LIBRARIES = [
  {
    name: "Kent County Public Library",
    url: "https://www.kentcountylibrary.org",
    platform: "libcal",
    eventsUrl: "https://kent-md.libcal.com/calendar",
    city: "Chestertown",
    state: "MD",
    zipCode: "21620",
    county: "Kent"
  },
  {
    name: "Worcester County Library",
    url: "https://www.worcesterlibrary.org",
    platform: "libcal",
    eventsUrl: "https://worcesterlibrary.libcal.com/calendar/Library_Events",
    city: "Snow Hill",
    state: "MD",
    zipCode: "21863",
    county: "Worcester"
  }
];

const SCRAPER_NAME = 'libcal-MD';

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

      // Wait for LibCal events container (multiple possible selectors)
      await page.waitForSelector('.s-lc-c-evt, .s-lc-eventcard, .s-lc-ea-e, .s-lc-mc-evt', { timeout: 15000 }).catch(() => null);

      // Extra wait for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // LibCal event cards - try multiple selectors for different LibCal versions
        const eventSelectors = [
          '.s-lc-c-evt',           // List view events
          '.s-lc-eventcard',       // Card view events
          '.s-lc-ea-e',            // Older LibCal format
          '.s-lc-whw-row',         // Week/day view
          '.s-lc-mc-evt'           // Monthly calendar view events (Kent County format)
        ];

        let foundElements = [];
        for (const selector of eventSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements = elements;
            break;
          }
        }

        foundElements.forEach(card => {
          try {
            // Try multiple title selectors
            let titleEl = card.querySelector('.s-lc-c-evt-title, .s-lc-eventcard-title, .s-lc-ea-ttl, h2, h3');
            // For monthly calendar view, title is in the link directly
            if (!titleEl) {
              titleEl = card.querySelector('a[href*="/event/"]');
            }

            // Try multiple date selectors - PRIMARY: dl.dl-horizontal format (From/To dates)
            let dateStr = '';
            const dlElement = card.querySelector('dl.dl-horizontal');
            if (dlElement) {
              const dlText = dlElement.textContent || '';
              // Extract "From: Wednesday, April 1, 2026" format
              const fromMatch = dlText.match(/From:\s*(.*?)(?:To:|$)/i);
              if (fromMatch) {
                dateStr = fromMatch[1].trim();
              }
            }

            // FALLBACK 1: Try .s-lc-evt-date-m and .s-lc-evt-date-d selectors
            if (!dateStr) {
              const monthEl = card.querySelector('.s-lc-evt-date-m');
              const dayEl = card.querySelector('.s-lc-evt-date-d');
              if (monthEl && dayEl) {
                const yearEl = card.querySelector('.s-lc-evt-date-y, .lc-date-icon__item--year');
                const year = yearEl ? yearEl.textContent.trim() : new Date().getFullYear();
                dateStr = `${monthEl.textContent.trim()} ${dayEl.textContent.trim()}, ${year}`;
              }
            }

            // FALLBACK 2: Try other date element selectors
            if (!dateStr) {
              const dateEl = card.querySelector('.s-lc-ea-date, .event-date');
              if (dateEl) {
                dateStr = dateEl.textContent.trim();
              }
            }

            // FALLBACK 3: For monthly calendar view (.s-lc-mc-evt), get date from parent day cell
            if (!dateStr && card.classList.contains('s-lc-mc-evt')) {
              // Navigate up to find the day container
              let dayCell = card.parentElement;
              let depth = 0;
              while (dayCell && depth < 3) {
                if (dayCell.classList.contains('s-lc-mc-day')) {
                  // Get the date from the day cell header
                  const dateHeader = dayCell.querySelector('[class*="s-lc-mc-day-header"], .s-lc-mc-day-date');
                  if (dateHeader) {
                    dateStr = dateHeader.textContent.trim();
                  } else {
                    // Try to extract from the cell's aria-label or data attributes
                    dateStr = dayCell.getAttribute('aria-label') || dayCell.getAttribute('data-date') || '';
                  }
                  break;
                }
                dayCell = dayCell.parentElement;
                depth++;
              }
            }

            const timeEl = card.querySelector('.s-lc-eventcard-heading-text, .s-lc-ea-time, .event-time');
            const descEl = card.querySelector('.s-lc-c-evt-des, .s-lc-eventcard-description, .s-lc-ea-desc');
            const linkEl = card.querySelector('a[href]');
            const imageEl = card.querySelector('img');
            const locationEl = card.querySelector('dl.dl-horizontal dd, .s-lc-ea-loc');
            const ageEl = card.querySelector('.s-lc-ea-audience, .s-lc-ea-cat, [class*="audience"], [class*="age"], .event-category');

            if (titleEl) {
              const event = {
                title: titleEl.textContent.trim(),
                date: dateStr,
                time: timeEl ? timeEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim().substring(0, 500) : '',
                url: linkEl ? linkEl.href : window.location.href,
                imageUrl: imageEl ? imageEl.src : '',
                ageRange: ageEl ? ageEl.textContent.trim() : '',
                location: locationEl ? locationEl.textContent.trim() : libName,
                venueName: libName
              };

              // Only add if we have a valid title
              if (event.title && event.title.length > 2) {
                events.push(event);
              }
            }
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
          state: 'MD',
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'libcal',
            state: 'MD'
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
    state: 'MD',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - MD (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

/**
 * Cloud Function export
 */
async function scrapeLibCalMDCloudFunction() {
  console.log('☁️ Running LibCal MD as Cloud Function');
  const events = await scrapeLibCalEvents();
  if (events.length > 0) {
    await saveToDatabase(events);
  }
  
  // Log scraper stats to database
  await logScraperResult('libcal-MD', {
    found: events.length,
    new: events.length,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: events.length, total: events.length };
}

module.exports = { scrapeLibCalEvents, saveToDatabase, scrapeLibCalMDCloudFunction };
