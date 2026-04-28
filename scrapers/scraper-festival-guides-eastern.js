#!/usr/bin/env node

/**
 * FESTIVAL GUIDES SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for festivals from FestivalGuidesAndReviews.com.
 * This is a curated WordPress blog with ~500-1000 festivals per state, organized
 * by month with linked event names.
 *
 * SOURCE: FestivalGuidesAndReviews.com — curated festival directory covering all 50 states.
 * Each state page is a single long post with all festivals listed by month.
 *
 * DOM STRUCTURE (per state page):
 *   .entry-content
 *     p > strong — Month heading ("APRIL", "MAY", etc.)
 *     p — Festival entries separated by <br>, each entry:
 *       "DATE – <a href="URL">FESTIVAL NAME</a> – CITY"
 *       Optional: "*" after date (unconfirmed), "– DISCONTINUED" suffix
 *
 * Entry format examples:
 *   "4/22-4/26 –Tom Tom Festival – Charlottesville"
 *   "4/24 – Bloomin' Wine Fest – Winchester"
 *   "5/9* – Henrico SkyGlow – Glen Allen – DISCONTINUED"
 *
 * COVERAGE: 27 eastern states + DC
 *
 * Usage:
 *   node scrapers/scraper-festival-guides-eastern.js                    # All states
 *   node scrapers/scraper-festival-guides-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-festival-guides-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-festival-guides-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeFestivalGuidesCloudFunction
 * Registry: Group 2
 */

const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'FestivalGuides-Eastern';
const BASE_URL = 'https://festivalguidesandreviews.com';

// All active eastern US states with their URL slugs
// States with confirmed pages on FestivalGuidesAndReviews.com
// Missing from site: CT, IN, MA, ME, NH, OH, RI, VT (no pages as of April 2026)
// DC is combined with MD on a single page
const STATES = [
  { abbr: 'AL', name: 'Alabama', slug: 'alabama-festivals' },
  { abbr: 'DE', name: 'Delaware', slug: 'delaware-festivals' },
  { abbr: 'FL', name: 'Florida', slug: 'florida-festivals' },
  { abbr: 'GA', name: 'Georgia', slug: 'georgia-festivals' },
  { abbr: 'IL', name: 'Illinois', slug: 'illinois-festivals' },
  { abbr: 'KY', name: 'Kentucky', slug: 'kentucky-festivals' },
  { abbr: 'MD', name: 'Maryland & DC', slug: 'maryland-washington-dc-festivals' },
  { abbr: 'MI', name: 'Michigan', slug: 'michigan-festivals' },
  { abbr: 'MS', name: 'Mississippi', slug: 'mississippi-festivals' },
  { abbr: 'NC', name: 'North Carolina', slug: 'north-carolina-festivals' },
  { abbr: 'NJ', name: 'New Jersey', slug: 'new-jersey-festivals' },
  { abbr: 'NY', name: 'New York', slug: 'new-york-festivals' },
  { abbr: 'PA', name: 'Pennsylvania', slug: 'pennsylvania-festivals' },
  { abbr: 'SC', name: 'South Carolina', slug: 'south-carolina-festivals' },
  { abbr: 'TN', name: 'Tennessee', slug: 'tennessee-festivals' },
  { abbr: 'VA', name: 'Virginia', slug: 'virginia-festivals' },
  { abbr: 'WI', name: 'Wisconsin', slug: 'wisconsin-festivals' },
  { abbr: 'WV', name: 'West Virginia', slug: 'west-virginia-festivals' },
];

// Current year for date parsing
const CURRENT_YEAR = new Date().getFullYear();

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(gun\s*show|beer\s*fest|wine\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|burlesque|tattoo\s*convention|cannabis|hemp\s*fest|cigar|whiskey|vodka|tequila|happy\s*hour|nightclub|strip\s*club|lingerie|mead\s*fest|mead\s*and\s*viking)\b/i;

// ==========================================
// PARSE A SINGLE FESTIVAL LINE
// ==========================================

/**
 * Parse a single festival entry line from the page.
 * Format: "DATE – FESTIVAL NAME – CITY"
 * The festival name may be wrapped in an <a> tag in the HTML,
 * but we receive the pre-parsed text and URL separately.
 */
function parseFestivalLine(text, url) {
  if (!text || text.length < 5) return null;

  const trimmed = text.trim();

  // Skip DISCONTINUED entries
  if (/DISCONTINUED/i.test(trimmed)) return null;

  // Match pattern: DATE – NAME – CITY[, ST]
  // Date patterns: "4/22", "4/22-4/26", "4/22*", "4/22-4/26*"
  // City may include state suffix: "Washington, DC", "New York, NY"

  // First, try pattern with "City, ST" at the end (e.g., "Washington, DC")
  const matchWithState = trimmed.match(
    /^(\d{1,2}\/\d{1,2}(?:\s*-\s*\d{1,2}\/\d{1,2})?)\s*\*?\s*[-–—]+\s*(.+?)\s*[-–—]+\s*([A-Za-z][A-Za-z\s.']+),\s*([A-Z]{2})$/
  );
  if (matchWithState) {
    return {
      dateRaw: matchWithState[1].trim(),
      name: matchWithState[2].trim(),
      city: matchWithState[3].trim(),
      state: matchWithState[4].trim(), // Override state (e.g., DC)
      url: url || '',
    };
  }

  // Standard pattern: DATE – NAME – CITY
  const match = trimmed.match(
    /^(\d{1,2}\/\d{1,2}(?:\s*-\s*\d{1,2}\/\d{1,2})?)\s*\*?\s*[-–—]+\s*(.+?)\s*[-–—]+\s*([A-Za-z][A-Za-z\s.']+)$/
  );

  if (!match) {
    // Try simpler pattern without city: "DATE – NAME"
    const simpleMatch = trimmed.match(
      /^(\d{1,2}\/\d{1,2}(?:\s*-\s*\d{1,2}\/\d{1,2})?)\s*\*?\s*[-–—]+\s*(.+)$/
    );
    if (simpleMatch) {
      return {
        dateRaw: simpleMatch[1].trim(),
        name: simpleMatch[2].trim(),
        city: '',
        url: url || '',
      };
    }
    return null;
  }

  return {
    dateRaw: match[1].trim(),
    name: match[2].trim(),
    city: match[3].trim(),
    url: url || '',
  };
}

/**
 * Convert a raw date like "4/22" or "4/22-4/26" into a readable date string.
 * Returns { eventDate, endDate } where dates are like "April 22, 2026".
 */
function convertDate(dateRaw) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const parts = dateRaw.split(/\s*-\s*/);
  const startParts = parts[0].split('/');
  if (startParts.length !== 2) return { eventDate: '', endDate: '' };

  const startMonth = parseInt(startParts[0]) - 1;
  const startDay = parseInt(startParts[1]);
  if (startMonth < 0 || startMonth > 11 || startDay < 1 || startDay > 31) {
    return { eventDate: '', endDate: '' };
  }

  const eventDate = `${months[startMonth]} ${startDay}, ${CURRENT_YEAR}`;

  let endDate = '';
  if (parts.length > 1) {
    const endParts = parts[1].split('/');
    if (endParts.length === 2) {
      const endMonth = parseInt(endParts[0]) - 1;
      const endDay = parseInt(endParts[1]);
      if (endMonth >= 0 && endMonth <= 11 && endDay >= 1 && endDay <= 31) {
        endDate = `${months[endMonth]} ${endDay}, ${CURRENT_YEAR}`;
      }
    }
  }

  return { eventDate, endDate };
}

// ==========================================
// SCRAPE A SINGLE STATE
// ==========================================

async function scrapeState(stateInfo, browser) {
  const url = `${BASE_URL}/${stateInfo.slug}/`;
  console.log(`\n📍 ${stateInfo.name} (${stateInfo.abbr})`);
  console.log(`   🌐 ${url}`);

  const events = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate with retry
    let retries = 2;
    while (retries > 0) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`   ⚠️ Navigation retry...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Wait for content to render
    await page.waitForSelector('.entry-content', { timeout: 15000 }).catch(() => {
      console.log(`   ⚠️ No .entry-content found`);
    });

    // Extract all festival entries from the DOM
    const rawEntries = await page.evaluate(() => {
      const content = document.querySelector('.entry-content');
      if (!content) return [];

      // Helper to decode HTML entities using the DOM
      const decodeEntities = (str) => {
        const el = document.createElement('textarea');
        el.innerHTML = str;
        return el.value;
      };

      const results = [];
      let currentMonth = '';

      // Walk through all child elements of entry-content
      const children = content.children;
      for (let i = 0; i < children.length; i++) {
        const el = children[i];

        // Check for month heading (bold text in a <p>)
        const strong = el.querySelector('strong, b');
        if (strong) {
          const monthText = strong.textContent.trim().toUpperCase();
          if (/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/.test(monthText)) {
            currentMonth = monthText;
            continue;
          }
        }

        // Check if this element contains festival entries (lines with dates)
        const html = el.innerHTML || '';
        if (!html.match(/\d+\/\d+/)) continue;

        // Split by <br> to get individual entries
        const lines = html.split(/<br\s*\/?>/i);

        for (const line of lines) {
          // Strip HTML tags, then decode entities like &amp; → &
          const stripped = decodeEntities(line.replace(/<[^>]+>/g, '')).trim();
          if (!stripped.match(/^\d+\/\d+/)) continue;

          // Extract the URL from any <a> tag in this line
          const linkMatch = line.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
          const festUrl = linkMatch ? linkMatch[1] : '';
          const festName = linkMatch ? decodeEntities(linkMatch[2]).trim() : '';

          // Get the full text for parsing
          results.push({
            text: stripped,
            url: festUrl,
            linkedName: festName,
            month: currentMonth,
          });
        }
      }

      return results;
    });

    console.log(`   📋 Found ${rawEntries.length} raw entries in DOM`);

    // Parse and filter entries
    let skippedNonFamily = 0;
    let skippedDiscontinued = 0;
    let skippedParseFail = 0;

    for (const raw of rawEntries) {
      // Skip DISCONTINUED
      if (/DISCONTINUED/i.test(raw.text)) {
        skippedDiscontinued++;
        continue;
      }

      // Parse the line
      const parsed = parseFestivalLine(raw.text, raw.url);
      if (!parsed) {
        skippedParseFail++;
        continue;
      }

      // Use the linked name if we found one (more reliable)
      const name = raw.linkedName || parsed.name;
      if (!name || name.length < 3) continue;

      // Skip non-family events
      if (NON_FAMILY_PATTERNS.test(name)) {
        skippedNonFamily++;
        continue;
      }

      // Convert date
      const { eventDate, endDate } = convertDate(parsed.dateRaw);
      if (!eventDate) continue;

      // Use parsed state override if available (e.g., DC from "Washington, DC")
      const eventState = parsed.state || stateInfo.abbr;
      const eventCity = parsed.city || '';

      // Build the event object
      events.push({
        title: name,
        eventDate: eventDate,
        endDate: endDate || undefined,
        description: `${name} in ${eventCity || stateInfo.name}`,
        venueName: name, // Festival name as venue since no specific venue given
        city: eventCity,
        state: eventState,
        url: parsed.url || url,
        category: 'Fairs & Festivals',
        details: {
          city: eventCity,
          state: eventState,
          address: eventCity ? `${eventCity}, ${eventState}` : stateInfo.name,
          month: raw.month,
        },
      });
    }

    if (skippedDiscontinued > 0) {
      console.log(`   🚫 Skipped ${skippedDiscontinued} DISCONTINUED entries`);
    }
    if (skippedNonFamily > 0) {
      console.log(`   🚫 Skipped ${skippedNonFamily} non-family events (wine fests, beer fests, etc.)`);
    }
    if (skippedParseFail > 0) {
      console.log(`   ⚠️ Could not parse ${skippedParseFail} entries`);
    }
    console.log(`   ✅ ${events.length} family-friendly festivals extracted`);

    await page.close();
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================

async function scrapeFestivalGuides(filterStates = null) {
  console.log('\n\x1b[35m🎭🎪━━━━━━━━━━━━━ FESTIVAL GUIDES SCRAPER ━━━━━━━━━━━━━━🎭🎪\x1b[0m');

  const statesToScrape = filterStates
    ? STATES.filter(s => filterStates.includes(s.abbr))
    : STATES;

  console.log(`📍 Target: ${statesToScrape.length} states`);
  console.log(`🌐 Source: FestivalGuidesAndReviews.com\n`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};

  try {
    for (let i = 0; i < statesToScrape.length; i++) {
      const stateInfo = statesToScrape[i];
      console.log(`\n[${i + 1}/${statesToScrape.length}] ${stateInfo.name}`);

      const stateEvents = await scrapeState(stateInfo, browser);
      allEvents.push(...stateEvents);
      stateResults[stateInfo.abbr] = stateEvents.length;

      // Save in batches per state to keep memory manageable
      if (allEvents.length >= 500 || i === statesToScrape.length - 1) {
        if (allEvents.length > 0 && !DRY_RUN) {
          console.log(`\n💾 Saving batch of ${allEvents.length} events...`);

          // Build venues list for geocoding
          const venues = allEvents.map(e => ({
            name: e.venueName || e.title,
            city: e.city,
            state: e.state,
          }));

          try {
            const result = await saveEventsWithGeocoding(
              allEvents,
              venues,
              {
                scraperName: SCRAPER_NAME,
                state: allEvents[0].state,
                category: 'Fairs & Festivals',
                platform: 'festivalguidesandreviews',
              }
            );
            const saved = result?.saved || result?.new || result?.imported || 0;
            console.log(`   💾 Saved: ${saved}`);
          } catch (err) {
            console.error(`   ❌ Save error: ${err.message}`);
          }
        }
        allEvents = [];
      }

      // 5-second delay between states to be polite
      if (i < statesToScrape.length - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  } catch (err) {
    console.error('❌ Scraper fatal error:', err);
    throw err;
  } finally {
    await browser.close();
  }

  // Log summary
  const totalEvents = Object.values(stateResults).reduce((sum, n) => sum + n, 0);
  console.log('\n\x1b[35m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total festivals found: ${totalEvents}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} festivals`);
  }

  logScraperResult(SCRAPER_NAME, {
    found: totalEvents,
    new: totalEvents,
    duplicates: 0,
  });

  return stateResults;
}

// ==========================================
// CLI & CLOUD FUNCTION EXPORTS
// ==========================================

const args = process.argv.slice(2);
const stateArgIdx = args.findIndex(a => a === '--state');
const DRY_RUN = args.includes('--dry');

if (require.main === module) {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — festivals will be extracted but NOT saved');
  }

  let statesToScrape = null;
  if (stateArgIdx !== -1 && args[stateArgIdx + 1]) {
    statesToScrape = args[stateArgIdx + 1].split(',').map(s => s.trim().toUpperCase());
  }

  scrapeFestivalGuides(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeFestivalGuidesCloudFunction() {
  try {
    const result = await scrapeFestivalGuides();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeFestivalGuides,
  scrapeFestivalGuidesCloudFunction,
};
