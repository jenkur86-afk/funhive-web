#!/usr/bin/env node

/**
 * FAIRS & FESTIVALS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for fairs, festivals, craft shows, and art fairs
 * across all 25 active eastern US states + DC.
 *
 * SOURCE: FairsAndFestivals.net — a comprehensive directory with 28,000+ listings.
 * Each state page loads ALL events into the DOM at once (no pagination needed).
 *
 * DOM STRUCTURE (per event):
 *   div.event
 *     h4 — Event title
 *     span.timestamp — Unix timestamp
 *     p.date — Human-readable date ("April 24 2026")
 *     table tr — Location, Description, Types of Vendor rows
 *     a[href*="/events/details/"] — Detail page link
 *
 * COVERAGE: 25 states + DC (~5,000-8,000 events total)
 *
 * Usage:
 *   node scrapers/scraper-fairs-festivals-eastern.js                    # All states
 *   node scrapers/scraper-fairs-festivals-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-fairs-festivals-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-fairs-festivals-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeFairsFestivalsCloudFunction
 * Registry: Group 1
 */

const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'FairsFestivals-Eastern';
const BASE_URL = 'https://www.fairsandfestivals.net/states';

// All active eastern US states
const STATES = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DC', name: 'District of Columbia' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WV', name: 'West Virginia' },
];

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(gun\s*show|beer\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|burlesque|tattoo\s*convention|cannabis|hemp\s*fest|cigar|whiskey|vodka|tequila|happy\s*hour|nightclub|strip\s*club|lingerie)\b/i;

// ==========================================
// SCRAPE A SINGLE STATE
// ==========================================

async function scrapeState(stateInfo, browser) {
  const url = `${BASE_URL}/${stateInfo.abbr}`;
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

    // Wait for events to render
    await page.waitForSelector('div.event', { timeout: 15000 }).catch(() => {
      console.log(`   ⚠️ No div.event found, page may have no events`);
    });

    // Allow full render
    await new Promise(r => setTimeout(r, 2000));

    // Extract all events from the DOM
    const rawEvents = await page.evaluate(() => {
      // Helper: decode HTML entities using a DOM textarea
      const decodeEntities = (str) => {
        if (!str) return str;
        const el = document.createElement('textarea');
        el.innerHTML = str;
        return el.value;
      };

      // Helper: fix Windows-1252 encoding artifacts (smart quotes, dashes, etc.)
      const fixEncoding = (str) => {
        if (!str) return str;
        return str
          .replace(/\u0092/g, "'")    // Windows-1252 right single quote
          .replace(/\u0091/g, "'")    // Windows-1252 left single quote
          .replace(/\u0093/g, '"')    // Windows-1252 left double quote
          .replace(/\u0094/g, '"')    // Windows-1252 right double quote
          .replace(/\u0096/g, '–')    // Windows-1252 en dash
          .replace(/\u0097/g, '—')    // Windows-1252 em dash
          .replace(/Æ(?=[a-z])/g, "'") // Æ before lowercase = mangled apostrophe
          .replace(/\u2019/g, "'")    // Unicode right single quote
          .replace(/\u2018/g, "'")    // Unicode left single quote
          .replace(/\u201C/g, '"')    // Unicode left double quote
          .replace(/\u201D/g, '"');   // Unicode right double quote
      };

      const cleanText = (str) => fixEncoding(decodeEntities(str));

      const results = [];
      const eventDivs = document.querySelectorAll('div.event');

      eventDivs.forEach(ev => {
        try {
          // Title
          const h4 = ev.querySelector('h4');
          const title = cleanText(h4?.textContent?.trim());
          if (!title || title.length < 4) return;

          // Date
          const dateP = ev.querySelector('p.date');
          const dateText = dateP?.textContent?.trim()?.replace(/\s+/g, ' ') || '';
          const timestamp = ev.querySelector('span.timestamp')?.textContent?.trim();

          // Table fields (Location, Description, Types of Vendor)
          const fields = {};
          const rows = ev.querySelectorAll('table tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim().replace(':', '');
              const value = cleanText(cells[1].textContent.trim());
              fields[label] = value;
            }
          });

          // Detail URL
          const detailLink = ev.querySelector('a[href*="/events/details/"]');
          const detailUrl = detailLink?.getAttribute('href') || '';

          // Parse location: "City, ST Venue/Address"
          const locRaw = (fields['Location'] || '').replace(/\s+/g, ' ').trim();
          let city = '', venue = '';
          // Pattern: "Winchester, VA Downtown" or "Tampa, FL"
          const locMatch = locRaw.match(/^([^,]+),\s*([A-Z]{2})\s*(.*)/);
          if (locMatch) {
            city = locMatch[1].trim();
            venue = locMatch[3].trim();
          }

          results.push({
            title,
            dateText,
            timestamp,
            city,
            venue,
            locationRaw: locRaw,
            description: (fields['Description'] || '').substring(0, 1000),
            vendorTypes: (fields['Types of Vendor'] || '').replace(/\s+/g, ' ').trim(),
            detailUrl,
          });
        } catch (err) {
          // Skip individual event errors
        }
      });

      return results;
    });

    console.log(`   📋 Found ${rawEvents.length} events in DOM`);

    // Filter out non-family events and build event objects
    let skippedNonFamily = 0;
    for (const raw of rawEvents) {
      // Skip non-family events
      if (NON_FAMILY_PATTERNS.test(`${raw.title} ${raw.description}`)) {
        skippedNonFamily++;
        continue;
      }

      // Build date string — use the readable date text
      let eventDate = raw.dateText || '';
      // If we have a unix timestamp, convert to readable date as fallback
      if (!eventDate && raw.timestamp) {
        const d = new Date(parseInt(raw.timestamp) * 1000);
        eventDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      // Build venue name — use extracted venue or fall back to title context
      const venueName = raw.venue || '';

      // Determine category from vendor types
      let category = 'Fairs & Festivals';
      const vt = (raw.vendorTypes || '').toLowerCase();
      if (vt.includes('craft')) category = 'Craft Shows & Fairs';
      else if (vt.includes('music') && !vt.includes('craft') && !vt.includes('food')) category = 'Music Festivals';
      else if (vt.includes('food') && !vt.includes('craft') && !vt.includes('art')) category = 'Food Festivals';
      else if (vt.includes('art') && !vt.includes('craft') && !vt.includes('food')) category = 'Art Fairs';

      events.push({
        title: raw.title,
        eventDate: eventDate,
        description: raw.description || `${raw.title} in ${raw.city || stateInfo.name}`,
        venueName: venueName,
        city: raw.city || '',
        state: stateInfo.abbr,
        url: raw.detailUrl ? `https://www.fairsandfestivals.net${raw.detailUrl}` : url,
        category: category,
        details: {
          city: raw.city || '',
          state: stateInfo.abbr,
          address: raw.locationRaw || `${raw.city || ''}, ${stateInfo.abbr}`,
        },
      });
    }

    if (skippedNonFamily > 0) {
      console.log(`   🚫 Skipped ${skippedNonFamily} non-family events (gun shows, beer fests, etc.)`);
    }
    console.log(`   ✅ ${events.length} family-friendly events extracted`);

    await page.close();
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================

async function scrapeFairsFestivals(filterStates = null) {
  console.log('\n\x1b[33m🎪🎡━━━━━━━━━━━━━ FAIRS & FESTIVALS SCRAPER ━━━━━━━━━━━━━━🎪🎡\x1b[0m');

  const statesToScrape = filterStates
    ? STATES.filter(s => filterStates.includes(s.abbr))
    : STATES;

  console.log(`📍 Target: ${statesToScrape.length} states`);
  console.log(`🌐 Source: FairsAndFestivals.net\n`);

  let browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};

  try {
    for (let i = 0; i < statesToScrape.length; i++) {
      const stateInfo = statesToScrape[i];
      console.log(`\n[${i + 1}/${statesToScrape.length}] ${stateInfo.name}`);

      let stateEvents = [];
      try {
        stateEvents = await scrapeState(stateInfo, browser);
      } catch (err) {
        // Browser crash detection and recovery
        if (err.message.includes('Protocol error') || err.message.includes('Connection closed') ||
            err.message.includes('Target closed') || err.message.includes('detached') ||
            err.message.includes('main frame too early')) {
          console.log(`   🔄 Browser crashed on ${stateInfo.name}, restarting...`);
          try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
          browser = null;
          await new Promise(r => setTimeout(r, 3000));
          browser = await launchBrowser();
          await new Promise(r => setTimeout(r, 2000));
          // Retry the state once with the fresh browser
          try {
            stateEvents = await scrapeState(stateInfo, browser);
          } catch (retryErr) {
            console.error(`   ❌ Retry failed for ${stateInfo.name}: ${retryErr.message}`);
          }
        } else {
          console.error(`   ❌ Failed ${stateInfo.name}: ${err.message}`);
        }
      }

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
                platform: 'fairsandfestivals',
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
    try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
  }

  // Log summary
  const totalEvents = Object.values(stateResults).reduce((sum, n) => sum + n, 0);
  console.log('\n\x1b[33m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events found: ${totalEvents}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} events`);
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
    console.log('🔍 DRY RUN MODE — events will be extracted but NOT saved');
  }

  let statesToScrape = null;
  if (stateArgIdx !== -1 && args[stateArgIdx + 1]) {
    statesToScrape = args[stateArgIdx + 1].split(',').map(s => s.trim().toUpperCase());
  }

  scrapeFairsFestivals(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeFairsFestivalsCloudFunction() {
  try {
    const result = await scrapeFairsFestivals();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeFairsFestivals,
  scrapeFairsFestivalsCloudFunction,
};
