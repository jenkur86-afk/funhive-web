const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');

/**
 * Assabet Interactive Library Calendar Scraper
 * States: NH, MA
 * Coverage: 15 libraries using the Assabet Interactive calendar platform
 * URL pattern: https://[slug].assabetinteractive.com/calendar/
 */

const LIBRARIES = [
  // New Hampshire
  { name: 'Dover Public Library', slug: 'dovernh', eventsUrl: 'https://dovernh.assabetinteractive.com/calendar/', city: 'Dover', state: 'NH', zipCode: '03820' },
  { name: 'Derry Public Library', slug: 'derrypl', eventsUrl: 'https://derrypl.assabetinteractive.com/calendar/', city: 'Derry', state: 'NH', zipCode: '03038' },
  { name: 'Leach Library', slug: 'londonderrynh', eventsUrl: 'https://londonderrynh.assabetinteractive.com/calendar/', city: 'Londonderry', state: 'NH', zipCode: '03053' },
  { name: 'Wadleigh Memorial Library', slug: 'wadleighlibrary', eventsUrl: 'https://wadleighlibrary.assabetinteractive.com/calendar/', city: 'Milford', state: 'NH', zipCode: '03055' },
  { name: 'Lane Memorial Library', slug: 'hampton', eventsUrl: 'https://hampton.assabetinteractive.com/calendar/', city: 'Hampton', state: 'NH', zipCode: '03842' },
  { name: 'Goffstown Public Library', slug: 'goffstownlibrary', eventsUrl: 'https://goffstownlibrary.assabetinteractive.com/calendar/', city: 'Goffstown', state: 'NH', zipCode: '03045' },
  { name: 'Bedford Public Library', slug: 'bedfordnhlibrary', eventsUrl: 'https://bedfordnhlibrary.assabetinteractive.com/calendar/', city: 'Bedford', state: 'NH', zipCode: '03110' },
  { name: 'Amherst Town Library', slug: 'amherstlibrary', eventsUrl: 'https://amherstlibrary.assabetinteractive.com/calendar/', city: 'Amherst', state: 'NH', zipCode: '03031' },
  { name: 'Nesmith Library', slug: 'nesmithlibrary', eventsUrl: 'https://nesmithlibrary.assabetinteractive.com/calendar/', city: 'Windham', state: 'NH', zipCode: '03087' },
  // Moved here 2026-07-06 from scraper-libcal-libraries-nh.js: Kelley Library
  // is on Assabet Interactive, not LibCal. Its old LibCal-NH config
  // (cityofsalemlibrary.libcal.com) was actually Salem, OREGON's library
  // system (Pacific Time, "West Salem Branch") — a wrong-subdomain
  // false-positive that would have imported mismatched out-of-state events.
  { name: 'Kelley Library', slug: 'kelleylibrary', eventsUrl: 'https://kelleylibrary.assabetinteractive.com/calendar/', city: 'Salem', state: 'NH', zipCode: '03079' },
  // Massachusetts
  { name: 'Thomas Crane Public Library', slug: 'thomascranelibrary', eventsUrl: 'https://thomascranelibrary.assabetinteractive.com/calendar/', city: 'Quincy', state: 'MA', zipCode: '02169' },
  { name: 'Somerville Public Library', slug: 'somervillepubliclibrary', eventsUrl: 'https://somervillepubliclibrary.assabetinteractive.com/calendar/', city: 'Somerville', state: 'MA', zipCode: '02143' },
  { name: 'Haverhill Public Library', slug: 'haverhillpl', eventsUrl: 'https://haverhillpl.assabetinteractive.com/calendar/', city: 'Haverhill', state: 'MA', zipCode: '01830' },
  { name: 'Malden Public Library', slug: 'maldenpubliclibrary', eventsUrl: 'https://maldenpubliclibrary.assabetinteractive.com/calendar/', city: 'Malden', state: 'MA', zipCode: '02148' },
  { name: 'Taunton Public Library', slug: 'tauntonlibrary', eventsUrl: 'https://tauntonlibrary.assabetinteractive.com/calendar/', city: 'Taunton', state: 'MA', zipCode: '02780' },
  { name: 'Weymouth Public Libraries', slug: 'weymouth', eventsUrl: 'https://weymouth.assabetinteractive.com/calendar/', city: 'Weymouth', state: 'MA', zipCode: '02188' },
  { name: 'Chicopee Public Library', slug: 'chicopeepubliclibrary', eventsUrl: 'https://chicopeepubliclibrary.assabetinteractive.com/calendar/', city: 'Chicopee', state: 'MA', zipCode: '01013' },
  { name: 'Pollard Memorial Library', slug: 'pollardml', eventsUrl: 'https://pollardml.assabetinteractive.com/calendar/', city: 'Lowell', state: 'MA', zipCode: '01852' },
  // Added 2026-08-27. Relocated from WordPress-MA, where it carried a urlCollision guard
  // saying marshfieldlibrary.org is WI not MA — correct, but that left the library with no
  // coverage at all. It is NOT a LibCal site either: marshfieldlibrary.libcal.com is also
  // Marshfield WISCONSIN. Ventress runs Assabet, and the slug was READ FROM THE LIBRARY OWN
  // PAGE as this file requires — ventresslibrary.org/event-calendar/ embeds an iframe
  // pointing at ventresslibrary.assabetinteractive.com/calendar/. Confirmed live: that URL
  // 301s to /calendar/2026-august/ and titles itself "August 2026 Events | Ventress Memorial
  // Library" with 453 event nodes.
  { name: 'Ventress Memorial Library', slug: 'ventresslibrary', eventsUrl: 'https://ventresslibrary.assabetinteractive.com/calendar/', city: 'Marshfield', state: 'MA', zipCode: '02050' },

  // --- Added 2026-08-24 from the Step 3d zero-event verification -------------
  // All 23 were configured under WordPress-{MA,NH,RI}, where they returned 0
  // events on every run: they run Assabet, which the WordPress DOM extractor
  // cannot read. They were NOT found by name matching. Each slug was READ from
  // the library own site by scripts/find-assabet-instances.js, because the slug
  // is not derivable from the town name - actonmemoriallibrary, dracutlibrary,
  // northbridgemass, sherbornma and newburyportpl are five different conventions,
  // and guessing {city}.assabetinteractive.com would repeat the guessed
  // {city}library.org defect that produced 355 cross-state collisions.
  //
  // Every entry below was then CONFIRMED to carry real upcoming events via its
  // own /calendar/upcoming-events.rss feed before being wired; the trailing
  // comment records the item count seen. Four further candidates (Derry, Dover,
  // Taunton, and Hampton Lane Memorial) were dropped as ALREADY CONFIGURED -
  // matched on SLUG, not name, which is what caught Hampton Lane Memorial Library
  // already being present as Lane Memorial Library. Somerset Public Library was
  // dropped too: its resolved instance 404s, so it stays an open gap.
  // Uxbridge Free Public Library named no instance at all and also stays a gap.
  { name: 'Hampstead Public Library', slug: 'hampsteadlibrary', eventsUrl: 'https://hampsteadlibrary.assabetinteractive.com/calendar/', city: 'Hampstead', state: 'NH', zipCode: '03841' },   // 81 upcoming in RSS
  { name: 'Rye Public Library', slug: 'ryepubliclibrary', eventsUrl: 'https://ryepubliclibrary.assabetinteractive.com/calendar/', city: 'Rye', state: 'NH', zipCode: '03870' },   // 74 upcoming in RSS
  { name: 'Acton Memorial Library', slug: 'actonmemoriallibrary', eventsUrl: 'https://actonmemoriallibrary.assabetinteractive.com/calendar/', city: 'Acton', state: 'MA', zipCode: '01720' },   // 115 upcoming in RSS
  { name: 'Amesbury Public Library', slug: 'amesburylibrary', eventsUrl: 'https://amesburylibrary.assabetinteractive.com/calendar/', city: 'Amesbury', state: 'MA', zipCode: '01913' },   // 26 upcoming in RSS
  { name: 'Boxford Town Library', slug: 'boxfordlibrary', eventsUrl: 'https://boxfordlibrary.assabetinteractive.com/calendar/', city: 'Boxford', state: 'MA', zipCode: '01921' },   // 30 upcoming in RSS
  { name: 'Moses Greeley Parker Memorial Lib.', slug: 'dracutlibrary', eventsUrl: 'https://dracutlibrary.assabetinteractive.com/calendar/', city: 'Dracut', state: 'MA', zipCode: '01826' },   // 53 upcoming in RSS
  { name: 'Grafton Public Library', slug: 'graftonlibrary', eventsUrl: 'https://graftonlibrary.assabetinteractive.com/calendar/', city: 'Grafton', state: 'MA', zipCode: '01519' },   // 58 upcoming in RSS
  { name: 'Hanson Public Library', slug: 'hansonlibrary', eventsUrl: 'https://hansonlibrary.assabetinteractive.com/calendar/', city: 'Hanson', state: 'MA', zipCode: '02341' },   // 42 upcoming in RSS
  { name: 'Hopkinton Public Library', slug: 'hopkintonlibrary', eventsUrl: 'https://hopkintonlibrary.assabetinteractive.com/calendar/', city: 'Hopkinton', state: 'MA', zipCode: '01748' },   // 56 upcoming in RSS
  { name: 'Lunenburg Public Library', slug: 'lunenburglibrary', eventsUrl: 'https://lunenburglibrary.assabetinteractive.com/calendar/', city: 'Lunenburg', state: 'MA', zipCode: '01462' },   // 29 upcoming in RSS
  { name: 'Lynnfield Public Library', slug: 'lynnfieldlibrary', eventsUrl: 'https://lynnfieldlibrary.assabetinteractive.com/calendar/', city: 'Lynnfield', state: 'MA', zipCode: '01940' },   // 39 upcoming in RSS
  { name: 'Medford Public Library', slug: 'medfordlibrary', eventsUrl: 'https://medfordlibrary.assabetinteractive.com/calendar/', city: 'Medford', state: 'MA', zipCode: '02155' },   // 160 upcoming in RSS
  { name: 'Needham Free Public Library', slug: 'needhamma', eventsUrl: 'https://needhamma.assabetinteractive.com/calendar/', city: 'Needham', state: 'MA', zipCode: '02494' },   // 72 upcoming in RSS
  { name: 'Newburyport Public Library', slug: 'newburyportpl', eventsUrl: 'https://newburyportpl.assabetinteractive.com/calendar/', city: 'Newburyport', state: 'MA' },   // 43 upcoming in RSS
  { name: 'Northborough Free Library', slug: 'northboroughlibrary', eventsUrl: 'https://northboroughlibrary.assabetinteractive.com/calendar/', city: 'Northborough', state: 'MA', zipCode: '01532' },   // 76 upcoming in RSS
  { name: 'Oxford Free Public Library', slug: 'oxfordmapubliclibrary', eventsUrl: 'https://oxfordmapubliclibrary.assabetinteractive.com/calendar/', city: 'Oxford', state: 'MA', zipCode: '01540' },   // 21 upcoming in RSS
  { name: 'Palmer Public Library', slug: 'palmerlibrary', eventsUrl: 'https://palmerlibrary.assabetinteractive.com/calendar/', city: 'Palmer', state: 'MA', zipCode: '01069' },   // 20 upcoming in RSS
  { name: 'Rowley Public Library', slug: 'rowleylibrary', eventsUrl: 'https://rowleylibrary.assabetinteractive.com/calendar/', city: 'Rowley', state: 'MA', zipCode: '01969' },   // 73 upcoming in RSS
  { name: 'Sherborn Library', slug: 'sherbornma', eventsUrl: 'https://sherbornma.assabetinteractive.com/calendar/', city: 'Sherborn', state: 'MA', zipCode: '01770' },   // 32 upcoming in RSS
  { name: 'Townsend Public Library', slug: 'townsendlibrary', eventsUrl: 'https://townsendlibrary.assabetinteractive.com/calendar/', city: 'Townsend', state: 'MA', zipCode: '01469' },   // 263 upcoming in RSS
  { name: 'Weston Public Library', slug: 'westonlibrary', eventsUrl: 'https://westonlibrary.assabetinteractive.com/calendar/', city: 'Weston', state: 'MA', zipCode: '02493' },   // 47 upcoming in RSS
  { name: 'Whitinsville Social Library', slug: 'northbridgemass', eventsUrl: 'https://northbridgemass.assabetinteractive.com/calendar/', city: 'Whitinsville', state: 'MA', zipCode: '01588' },   // 27 upcoming in RSS
  { name: 'Portsmouth Free Public Library', slug: 'portsmouthlibrary', eventsUrl: 'https://portsmouthlibrary.assabetinteractive.com/calendar/', city: 'Portsmouth', state: 'RI', zipCode: '02871' },   // 27 upcoming in RSS
];

// The registry key, byte-for-byte. This was 'assabet-NH-MA' (lowercase 'a') until
// 2026-08-24, which is a CASE_MISMATCH under CLAUDE.md's naming rules and joins to
// no registry entry. Fixed while adding the 23 relocated libraries below.
const REGISTRY_KEY = 'Assabet-NH-MA';

/**
 * PER-SITE scraper_name is NOT possible here, and this note exists so it is not
 * attempted a third time.
 *
 * This scraper covers 41 library websites that all write the SAME bare name, which
 * is the "No aggregation, ever" problem AGE-RANGE-AUDIT.md describes — 41 libraries
 * collapse to one row in the per-site audits. The obvious fix is to emit
 * `Assabet-NH-MA-<slug>` per event, and it does NOT work: this scraper saves through
 * saveEventsWithGeocoding(), and that helper REBUILDS metadata from its own options
 * and overwrites metadata.scraperName with the single option-level value. Tried and
 * measured on 2026-08-24 — all 562 rows from that run came back under the bare name.
 *
 * It is not merely overridden, it is load-bearing: verifyAndCleanupEvents() looks
 * existing events up by `metadata.scraperName == scraperName`, so a per-site variant
 * makes that lookup miss every row. That is why the same attempt was REVERTED on
 * 2026-08-06 (see the comment in event-save-helper.js next to `platform`), and that
 * function deletes, so breaking its lookup is not a cosmetic risk.
 *
 * Fixing this properly means changing the helper's lookup to prefix-match the
 * registry key across all ~50 scrapers that use it — a deliberate shared-helper
 * migration, not a daily-diagnosis change. `sites: 41` is declared in the registry
 * so check-scraper-names.js reports this scraper as COLLAPSED and the debt stays
 * visible instead of silently passing.
 */

async function scrapeAssabetEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`Scraping: ${library.name} (${library.slug})`);
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName, libSlug) => {
        const events = [];

        // Strategy 1: Look for Assabet-specific calendar event selectors
        const selectors = [
          '.event-card', '.event-listing', '.calendar-event',
          '.event-item', '.cal-event', '.event-entry',
          '.event_card', '.eventCard', '.event-row',
          '[class*="event-card"]', '[class*="calendar-event"]', '[class*="event-list"]',
          '[class*="event_item"]', '[class*="eventItem"]',
          '.fc-event', '.tribe-events-single', '.type-tribe_events'
        ];

        let eventElements = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            eventElements = found;
            break;
          }
        }

        // Strategy 2: Look for generic article/list patterns with event-like content
        if (eventElements.length === 0) {
          eventElements = document.querySelectorAll('article, .post, li[class*="event"], div[class*="event"]');
        }

        // Strategy 3: Look for links inside a calendar/events container
        if (eventElements.length === 0) {
          const containers = document.querySelectorAll('[class*="calendar"], [class*="events"], [id*="calendar"], [id*="events"], main, .content, #content');
          for (const container of containers) {
            const links = container.querySelectorAll('a[href*="/calendar/"], a[href*="/event/"], a[href*="/events/"]');
            if (links.length > 0) {
              eventElements = links;
              break;
            }
          }
        }

        eventElements.forEach(card => {
          // Try to extract title
          const titleEl = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
          const title = titleEl ? titleEl.textContent.trim() : (card.tagName === 'A' ? card.textContent.trim() : '');

          if (!title || title.length < 3) return;

          // Try to extract date
          const dateEl = card.querySelector('[class*="date"], time, [class*="when"], [class*="time"], [datetime]');
          let dateText = '';
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }

          // Assabet's calendar puts the date as a day-header outside the time
          // element — the time field often holds just "All Day" or "10:00—11:00 AM"
          // with no month name. If dateText is missing or has no month, scan the
          // card's textContent for a "[Weekday,] Month DD" pattern and use that.
          const hasMonth = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i.test(dateText);
          if (!hasMonth) {
            const cardText = card.textContent || '';
            const dateMatch = cardText.match(/(?:Today)?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*,?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s*\d{4})?/i);
            if (dateMatch) {
              // Prepend the day-header so normalizeDateString sees Month+Day first
              dateText = dateText ? `${dateMatch[0]} ${dateText}` : dateMatch[0];
            }
          }

          // Try to extract time
          const timeEl = card.querySelector('[class*="time"]');
          let timeText = '';
          if (timeEl && timeEl !== dateEl) {
            timeText = timeEl.textContent.trim();
          }
          if (timeText && dateText && !dateText.includes(timeText)) {
            dateText = dateText + ' ' + timeText;
          }

          // Try to extract description
          const descEl = card.querySelector('[class*="desc"], [class*="summary"], [class*="excerpt"], p');
          const description = descEl ? descEl.textContent.trim() : '';

          // Try to extract link
          let url = '';
          if (card.tagName === 'A') {
            url = card.href;
          } else {
            const linkEl = card.querySelector('a');
            if (linkEl) url = linkEl.href;
          }

          // Try to extract age/audience info
          const ageEl = [
            card.querySelector('[class*="audience"]'),
            card.querySelector('[class*="age"]'),
            card.querySelector('[class*="category"]')
          ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

          // Skip events with no parseable date — without a date, the row ends
          // up in the DB with null `date` TIMESTAMPTZ and is invisible to
          // date-filtered queries. 212 assabet events were in this state on
          // 2026-05-17. Require at least a month name to consider it a date.
          if (!dateText || !/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i.test(dateText)) {
            return;
          }

          events.push({
            title: title,
            date: dateText,
            description: description.substring(0, 500),
            url: url,
            ageRange: ageEl ? ageEl.textContent.trim() : '',
            location: libName,
            venueName: libName
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(e => {
          const key = e.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name, library.slug);

      console.log(`  Found ${libraryEvents.length} events at ${library.name}`);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.eventsUrl,
            scrapedAt: new Date().toISOString(),
            // Overwritten by saveEventsWithGeocoding with its option-level value —
            // see the REGISTRY_KEY note above. Kept as the registry key so it is
            // correct either way rather than silently wrong if that ever changes.
            scraperName: REGISTRY_KEY,
            category: 'library',
            state: library.state,
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Error: ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    // Option-level FALLBACK only. flattenEvent() reads metadata.scraperName first,
    // and every event above now carries its own per-site name, so this is only
    // reached if that is ever dropped. The bare registry key is the right value
    // here — a slug would be wrong for whichever library it did not come from.
    scraperName: REGISTRY_KEY,
    // Each library carries its own `state` field (NH, MA or RI as of 2026-08-24)
    // which takes priority
    // inside saveEventsWithGeocoding via `library.state || state`. The option-level
    // `state` is required as a fallback, so pass a multi-state sentinel.
    state: 'NH',
    category: 'library',
    platform: 'assabet-interactive'
  });
}

async function main() {
  const events = await scrapeAssabetEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeAssabetLibrariesCloudFunction() {
  console.log('☁️ Running Assabet Libraries NH-MA as Cloud Function');
  const events = await scrapeAssabetEvents();
  if (events.length === 0) {
    await logScraperResult('Assabet-NH-MA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('Assabet-NH-MA', {
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

module.exports = { scrapeAssabetEvents, saveToDatabase, scrapeAssabetLibrariesCloudFunction };
