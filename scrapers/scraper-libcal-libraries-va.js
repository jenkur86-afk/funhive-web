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
    county: 'Norfolk city'
  },
  // Newport News and Hampton removed 2026-08-09: both eventsUrl domains
  // (newportnews.libcal.com, hampton.libcal.com) returned net::ERR_NAME_NOT_RESOLVED
  // on a live run. Verified neither library is actually on LibCal: Newport News
  // (library.nnva.gov, nnva.gov/library redirects here) runs its own
  // /264/Events-Calendar page, a different platform this scraper doesn't parse.
  // Hampton's old hamptonpubliclibrary.org domain now redirects to an unrelated
  // church site (seminalchurch.org) — hijacked/expired domain; the library's
  // real home is hampton.gov's Libraries department page, no LibCal calendar
  // found there either. Open coverage gap, not fixed: see fix-notes.json.
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
    county: 'Suffolk city'
  },
  {
    name: "Williamsburg Regional Library",
    url: "https://www.wrl.org",
    platform: "libcal",
    eventsUrl: "https://libcal.wrl.org/calendar",
    city: "Williamsburg",
    state: "VA",
    zipCode: "23185",
    county: 'Williamsburg city'
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

const SCRAPER_NAME = 'LibCal-VA2';

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

      // '.s-lc-ea-e, .s-lc-whw-row' never matched current LibCal markup (confirmed
      // 2026-08-09: two consecutive live runs, 0 events across all 11 systems
      // including Fairfax County). The shared multi-state LibCal scraper
      // (scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js) finds
      // real events using '.s-lc-c-evt' / '.s-lc-eventcard' / '.s-lc-mc-evt' — same
      // fallback selector list and text-pattern date extraction adopted here.
      await page.waitForSelector('.s-lc-eventcard, .s-lc-c-evt', { timeout: 10000 }).catch(() => null);
      await new Promise(resolve => setTimeout(resolve, 1500));

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
            sourceUrl: library.eventsUrl,
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
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VA',
    category: 'library',
    platform: 'libcal'
  });
}

// The registry's exportName previously pointed straight at scrapeLibCalEvents(),
// which only scrapes and returns a raw array — it never calls saveToDatabase()
// or reports {found, new, duplicates} stats, only main() did both and main() was
// never exported. Confirmed live 2026-08-09: with the selector fix above, the
// scraper found 182 real events across 8 of 11 systems, but the run still
// completed as "Found: 0, New: 0" and nothing reached the DB, because the
// runner's local-scraper-runner.js calls whatever exportName resolves to
// directly and expects a stats object back, not an events array. This
// CloudFunction wrapper does what main() did, minus the process.exit(0), and
// returns real stats — same pattern as scrapeSouthwestGeorgiaLibrariesCloudFunction.
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

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  LibCal Scraper - VA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  await scrapeLibCalEventsCloudFunction();

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeLibCalEvents, saveToDatabase, scrapeLibCalEventsCloudFunction };
