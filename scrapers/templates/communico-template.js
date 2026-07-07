const { launchBrowser } = require('../puppeteer-config');
const { saveEventsWithGeocoding } = require('../event-save-helper');
const { logScraperResult } = require('../scraper-logger');

/**
 * AUTO-GENERATED COMMUNICO SCRAPER
 * State: {{state}}
 * Libraries: {{libraries}}
 */

const LIBRARIES = {{libraries}};

const SCRAPER_NAME = 'communico-{{state}}';

async function scrapeCommunicoEvents() {
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

      // Wait for Communico events
      await page.waitForSelector('.eventCardContainer, .eventCard, .event-item', { timeout: 10000 }).catch(() => null);

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Communico event cards
        document.querySelectorAll('.eventCardContainer, .eventCard, .event-item').forEach(card => {
          try {
            const titleEl = card.querySelector('.eventCardTitle, .event-title, h3, h4');
            const dateEl = card.querySelector('.eventCardDate, .event-date, .date');
            const timeEl = card.querySelector('.eventCardTime, .event-time, .time');
            const descEl = card.querySelector('.eventCardDescription, .event-description, .description');
            const linkEl = card.querySelector('a[href]');
            const imageEl = card.querySelector('img');
            const locationEl = card.querySelector('.eventCardLocation, .event-location, .location');
            const ageEl = card.querySelector('.eventCardAudience, .audience, .age-range');

            if (titleEl && (dateEl || timeEl)) {
              const event = {
                title: titleEl.textContent.trim(),
                date: dateEl ? dateEl.textContent.trim() : '',
                time: timeEl ? timeEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : '',
                url: linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : new URL(linkEl.href, window.location.origin).href) : window.location.href,
                imageUrl: imageEl ? imageEl.src : '',
                location: locationEl ? locationEl.textContent.trim() : libName,
                ageRange: ageEl ? ageEl.textContent.trim() : '',
                venueName: libName
              };

              events.push(event);
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
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'communico',
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
    platform: 'communico'
  });
}

// Entry point for local-scraper-runner.js's registry (exportName should
// match this function, e.g. 'scrapeCommunico{{state}}'). Must not call
// process.exit() here — that would kill the whole Node process if this
// scraper is ever run as part of a multi-scraper group.
async function scrapeCommunico{{state}}() {
  const events = await scrapeCommunicoEvents();

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
  console.log(`║  Communico Scraper - {{state}} (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  await scrapeCommunico{{state}}();

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeCommunicoEvents, saveToDatabase, scrapeCommunico{{state}} };
