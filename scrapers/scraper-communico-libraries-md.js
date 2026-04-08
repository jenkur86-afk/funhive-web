const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { getBranchAddress } = require('./library-addresses');
const ngeohash = require('ngeohash');
const admin = require('firebase-admin');

/**
 * AUTO-GENERATED COMMUNICO SCRAPER
 * State: MD
 * Libraries: [
  {
    "name": "Baltimore County Public Library",
    "url": "https://www.bcpl.info",
    "platform": "communico",
    "eventsUrl": "https://events.bcpl.info"
  },
  {
    "name": "Anne Arundel County Public Library",
    "url": "https://www.aacpl.net",
    "platform": "communico",
    "eventsUrl": "https://www.aacpl.net/events"
  },
  {
    "name": "Howard County Library System",
    "url": "https://www.hclibrary.org",
    "platform": "communico",
    "eventsUrl": "https://programs.hcplonline.org"
  },
  {
    "name": "Montgomery County Public Libraries",
    "url": "https://www.montgomerycountymd.gov/library",
    "platform": "communico",
    "eventsUrl": "https://www.montgomerycountymd.gov/library/events.html"
  },
  {
    "name": "Harford County Public Library",
    "url": "https://www.hcplonline.org",
    "platform": "communico",
    "eventsUrl": "https://hcplonline.org/events"
  },
  {
    "name": "Frederick County Public Libraries",
    "url": "https://www.fcpl.org",
    "platform": "communico",
    "eventsUrl": "https://www.fcpl.org/events"
  }
]
 */

const LIBRARIES = [
  { name: "Baltimore County Public Library", url: "https://www.bcpl.info", platform: "communico", eventsUrl: "https://events.bcpl.info", city: "Towson", state: "MD", zipCode: "21204", county: "Baltimore" },
  { name: "Anne Arundel County Public Library", url: "https://www.aacpl.net", platform: "communico", eventsUrl: "https://www.aacpl.net/events", city: "Annapolis", state: "MD", zipCode: "21401", county: "Anne Arundel" },
  { name: "Howard County Library System", url: "https://www.hclibrary.org", platform: "communico", eventsUrl: "https://programs.hcplonline.org", city: "Columbia", state: "MD", zipCode: "21044", county: "Howard" },
  // REMOVED: Montgomery County Public Libraries - 404 page moved
  // { name: "Montgomery County Public Libraries", url: "https://www.montgomerycountymd.gov/library", platform: "communico", eventsUrl: "https://www.montgomerycountymd.gov/library/events.html", city: "Rockville", state: "MD", zipCode: "20850", county: "Montgomery" },
  { name: "Harford County Public Library", url: "https://www.hcplonline.org", platform: "communico", eventsUrl: "https://hcplonline.org/events", city: "Bel Air", state: "MD", zipCode: "21014", county: "Harford" },
  { name: "Frederick County Public Libraries", url: "https://www.fcpl.org", platform: "communico", eventsUrl: "https://www.fcpl.org/events", city: "Frederick", state: "MD", zipCode: "21701", county: "Frederick" }
];

const SCRAPER_NAME = 'communico-MD';

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

      // Transform and add to collection with branch address lookup
      for (const event of libraryEvents) {
        // Try to extract branch name from location field
        let branchName = null;
        const locationText = event.location || '';

        // Common branch patterns in location text
        // e.g., "Towson Branch", "Elkridge Library", "Central Library"
        const branchMatch = locationText.match(/^([^,\-–]+?)(?:\s+(?:Branch|Library))?(?:\s*[-–,]|$)/i);
        if (branchMatch && branchMatch[1].trim().length > 3) {
          branchName = branchMatch[1].trim();
        }

        // Get branch address from library-addresses.js
        const branchLocation = getBranchAddress(library.name, branchName, 'MD');

        events.push({
          ...event,
          state: 'MD',
          branchName: branchName,
          branchAddress: branchLocation?.address || '',
          branchCity: branchLocation?.city || '',
          branchZipCode: branchLocation?.zipCode || '',
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'communico',
            state: 'MD'
          }
        });
      }

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

async function saveToFirebase(events) {
  await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'MD',
    category: 'library',
    platform: 'communico'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Communico Scraper - MD (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeCommunicoEvents();

  if (events.length > 0) {
    await saveToFirebase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeCommunicoEvents, saveToFirebase };
