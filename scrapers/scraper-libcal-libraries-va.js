const { launchBrowser } = require('./puppeteer-config');

const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
const { logScraperResult } = require('./scraper-logger');

/**
 * AUTO-GENERATED LIBCAL SCRAPER
 * State: VA
 * Libraries: [
  {
    "name": "Fairfax County Public Library",
    "url": "https://www.fairfaxcounty.gov/library",
    "platform": "libcal",
    "eventsUrl": "https://librarycalendar.fairfaxcounty.gov"
  },
  {
    "name": "Arlington Public Library",
    "url": "https://library.arlingtonva.us",
    "platform": "libcal",
    "eventsUrl": "https://arlingtonva.libcal.com"
  },
  {
    "name": "Prince William Public Library System",
    "url": "https://www.pwcgov.org/library",
    "platform": "libcal",
    "eventsUrl": "https://pwcgov.libcal.com"
  }
]
 */

const LIBRARIES = [
  {
    name: "Fairfax County Public Library",
    url: "https://www.fairfaxcounty.gov/library",
    platform: "libcal",
    eventsUrl: "https://librarycalendar.fairfaxcounty.gov",
    city: "Fairfax",
    state: "VA",
    zipCode: "22030",
    county: "Fairfax"
  },
  {
    name: "Arlington Public Library",
    url: "https://library.arlingtonva.us",
    platform: "libcal",
    eventsUrl: "https://arlingtonva.libcal.com",
    city: "Arlington",
    state: "VA",
    zipCode: "22201",
    county: "Arlington"
  },
  {
    name: "Prince William Public Library System",
    url: "https://www.pwcgov.org/library",
    platform: "libcal",
    eventsUrl: "https://pwcgov.libcal.com",
    city: "Woodbridge",
    state: "VA",
    zipCode: "22192",
    county: "Prince William"
  },
  // ── Added: LibCal libraries previously in wordpress-VA ──
  {
    name: "Richmond Public Library",
    url: "https://rvalibrary.org",
    platform: "libcal",
    eventsUrl: "https://rvalibrary.libcal.com/calendar/main",
    city: "Richmond",
    state: "VA",
    zipCode: "23219",
    county: "Richmond"
  },
  {
    name: "Norfolk Public Library",
    url: "https://www.norfolkpubliclibrary.org",
    platform: "libcal",
    eventsUrl: "https://norfolk.libcal.com/calendars",
    city: "Norfolk",
    state: "VA",
    zipCode: "23510",
    county: "Norfolk"
  },
  {
    name: "Newport News Public Library System",
    url: "https://www.nnva.gov/library",
    platform: "libcal",
    eventsUrl: "https://newportnews.libcal.com/calendar",
    city: "Newport News",
    state: "VA",
    zipCode: "23606",
    county: "Newport News"
  },
  {
    name: "Hampton Public Library",
    url: "https://www.hamptonpubliclibrary.org",
    platform: "libcal",
    eventsUrl: "https://hampton.libcal.com/calendar",
    city: "Hampton",
    state: "VA",
    zipCode: "23669",
    county: "Hampton"
  },
  {
    name: "Roanoke Public Libraries",
    url: "https://www.roanokeva.gov/library",
    platform: "libcal",
    eventsUrl: "https://roanokeva.libcal.com/calendar",
    city: "Roanoke",
    state: "VA",
    zipCode: "24011",
    county: "Roanoke"
  },
  {
    name: "Suffolk Public Library",
    url: "https://www.suffolkpubliclibrary.com",
    platform: "libcal",
    eventsUrl: "https://suffolkpubliclibrary.libcal.com/calendar",
    city: "Suffolk",
    state: "VA",
    zipCode: "23434",
    county: "Suffolk"
  },
  {
    name: "Williamsburg Regional Library",
    url: "https://www.wrl.org",
    platform: "libcal",
    eventsUrl: "https://libcal.wrl.org/calendar",
    city: "Williamsburg",
    state: "VA",
    zipCode: "23185",
    county: "Williamsburg"
  },
  {
    name: "Library of Virginia",
    url: "https://www.lva.virginia.gov",
    platform: "libcal",
    eventsUrl: "https://lva-virginia.libcal.com/calendar",
    city: "Richmond",
    state: "VA",
    zipCode: "23219",
    county: "Richmond"
  }
];

const SCRAPER_NAME = 'libcal-VA';

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

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // LibCal event cards
        document.querySelectorAll('.s-lc-ea-e, .s-lc-whw-row').forEach(card => {
          try {
            const titleEl = card.querySelector('.s-lc-ea-ttl, h3');
            const dateEl = card.querySelector('.s-lc-ea-date, .event-date');
            const timeEl = card.querySelector('.s-lc-ea-time, .event-time');
            const descEl = card.querySelector('.s-lc-ea-desc, .event-description');
            const linkEl = card.querySelector('a[href]');
            const imageEl = card.querySelector('img');
            const locationEl = card.querySelector('.s-lc-ea-loc, .event-location');
            const ageEl = card.querySelector('.s-lc-ea-audience, .s-lc-ea-cat, [class*="audience"], [class*="age"], .event-category');

            if (titleEl && dateEl) {
              const event = {
                title: titleEl.textContent.trim(),
                date: dateEl.textContent.trim(),
                time: timeEl ? timeEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : '',
                url: linkEl ? linkEl.href : window.location.href,
                imageUrl: imageEl ? imageEl.src : '',
                ageRange: ageEl ? ageEl.textContent.trim() : '',
                location: locationEl ? locationEl.textContent.trim() : libName,
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

      // Filter out cancelled/postponed/closed events
      const filteredEvents = libraryEvents.filter(event => {
        const title = (event.title || '').toLowerCase();
        if (/\b(cancelled|canceled|postponed|suspended|closed)\b/.test(title)) {
          console.log(`   ⏭️ Skipping cancelled/postponed event: "${event.title}"`);
          return false;
        }
        return true;
      });

      console.log(`   ✅ Found ${filteredEvents.length} events (${libraryEvents.length - filteredEvents.length} cancelled/postponed skipped)`);

      // Transform and add to collection
      filteredEvents.forEach(event => {
        events.push({
          ...event,
          state: 'VA',
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'libcal',
            state: 'VA'
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
    state: 'VA',
    category: 'library',
    platform: 'libcal'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - VA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeLibCalEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  // Log to database for monitoring
  await logScraperResult('LibCal Libraries VA', {
    found: events.length,
    new: events.length,
  }, { state: 'VA', source: 'libcal' });

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalEvents, saveToDatabase };
