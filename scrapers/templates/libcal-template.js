const { launchBrowser } = require('../puppeteer-config');
const { saveEventsWithGeocoding } = require('../event-save-helper');
const { logScraperResult } = require('../scraper-logger');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: {{state}}
 * Libraries: {{libraries}}
 */

const LIBRARIES = {{libraries}};

const SCRAPER_NAME = 'libcal-{{state}}';

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

      // Some LibCal calendars default to Monthly/grid view instead of Card
      // view — the grid view has no structured per-event markup. The "Card
      // View" toggle is a <button>, not a link with a URL param, so it must
      // be clicked. Fails harmlessly (caught below) if already in Card view.
      await page.click('.s-lc-nav-card').catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // LibCal's event-card markup as of 2026-07 uses .s-lc-eventcard (older
      // .s-lc-ea-e/.s-lc-whw-row selectors matched 0 elements with no error —
      // confirmed live against several NH libraries).
      await page.waitForSelector('.s-lc-eventcard', { timeout: 10000 }).catch(() => null);

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        document.querySelectorAll('.s-lc-eventcard').forEach(card => {
          try {
            const titleEl = card.querySelector('.s-lc-eventcard-title a');
            const monthEl = card.querySelector('.s-lc-evt-date-m');
            const dayEl = card.querySelector('.s-lc-evt-date-d');
            const headingTextEls = card.querySelectorAll('.s-lc-eventcard-heading-text');
            const descEl = card.querySelector('.s-lc-eventcard-description');
            const imageEl = card.querySelector('.s-lc-eventcard-heading-image img');
            const tagEls = card.querySelectorAll('.s-lc-event-category-link');

            if (!titleEl || !monthEl || !dayEl) return;

            // First heading-text div holds either "Sat, 10:00 AM - 12:00 PM"
            // (single occurrence) or "Jun 22 - Jul 31" (multi-day range, no
            // time); second holds the room/location (often blank).
            const dateTimeText = headingTextEls[0] ? headingTextEls[0].textContent.trim().replace(/\s+/g, ' ') : '';
            const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
            const location = headingTextEls[1] ? headingTextEls[1].textContent.trim() : '';

            // Infer year: LibCal's month/day-only date has no year. Assume
            // current year unless that would place the event more than ~30
            // days in the past (calendar always shows "today forward").
            const now = new Date();
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const monthIdx = monthNames.indexOf(monthEl.textContent.trim());
            const day = parseInt(dayEl.textContent.trim(), 10);
            let year = now.getFullYear();
            if (monthIdx >= 0 && !isNaN(day)) {
              const candidate = new Date(year, monthIdx, day);
              if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) {
                year += 1;
              }
            }

            const dateStr = monthIdx >= 0
              ? `${monthNames[monthIdx]} ${day}, ${year}${timeMatch ? ' ' + timeMatch[1] : ''}`
              : '';

            const rawDescription = descEl ? descEl.textContent.replace(/\s*More\s*$/i, '').trim() : '';
            const tags = Array.from(tagEls).map(t => t.getAttribute('data-original-title') || t.textContent.trim()).filter(Boolean);

            const event = {
              title: titleEl.textContent.trim(),
              date: dateStr,
              time: timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '',
              description: rawDescription,
              url: titleEl.href || window.location.href,
              imageUrl: imageEl ? imageEl.src : '',
              ageRange: tags.join(', '),
              location: location || libName,
              venueName: libName
            };

            events.push(event);
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
            state: '{{state}}'
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
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: '{{state}}',
    category: 'library',
    platform: 'libcal'
  });
}

// Entry point for local-scraper-runner.js's registry (exportName should
// match this function, e.g. 'scrapeLibCal{{state}}'). Must not call
// process.exit() here — that would kill the whole Node process if this
// scraper is ever run as part of a multi-scraper group.
async function scrapeLibCal{{state}}() {
  const events = await scrapeLibCalEvents();

  const result = events.length > 0
    ? await saveToDatabase(events)
    : { saved: 0, skipped: 0, errors: 0, deleted: 0 };

  await logScraperResult(SCRAPER_NAME, {
    found: events.length,
    new: result.saved,
  }, { state: '{{state}}' });

  return { found: events.length, ...result };
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - {{state}} (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  await scrapeLibCal{{state}}();

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalEvents, saveToDatabase, scrapeLibCal{{state}} };
