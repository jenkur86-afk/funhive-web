#!/usr/bin/env node

/**
 * KIDS OUT AND ABOUT REGIONAL EVENTS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for family events from KidsOutAndAbout.com
 * regional subdomains across eastern US cities.
 *
 * SOURCE: KidsOutAndAbout.com — a family-focused event directory with regional
 * subdomains. Each region has an event-list page with date-based navigation.
 *
 * DOM STRUCTURE (per event on list page):
 *   Event links under /content/ paths
 *   JSON-LD structured data on individual event pages
 *
 * COVERAGE: 25+ eastern US regions (~200-500 events per region per month)
 *
 * Usage:
 *   node scrapers/scraper-kidsoutandabout-eastern.js                    # All regions
 *   node scrapers/scraper-kidsoutandabout-eastern.js --state NY         # New York regions only
 *   node scrapers/scraper-kidsoutandabout-eastern.js --state OH,PA      # Multiple states
 *   node scrapers/scraper-kidsoutandabout-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeKidsOutAndAboutCloudFunction
 * Registry: Group 3
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'KidsOutAndAbout-Eastern';

// ==========================================
// REGIONS CONFIG — eastern US KidsOutAndAbout subdomains
// ==========================================
const REGIONS = [
  // New York
  { slug: 'rochester', name: 'Rochester', state: 'NY', city: 'Rochester' },
  { slug: 'albany', name: 'Albany', state: 'NY', city: 'Albany' },
  { slug: 'buffalo', name: 'Buffalo', state: 'NY', city: 'Buffalo' },
  { slug: 'nyc', name: 'New York City', state: 'NY', city: 'New York' },
  { slug: 'longisland', name: 'Long Island', state: 'NY', city: 'Long Island' },
  { slug: 'syracuse', name: 'Syracuse', state: 'NY', city: 'Syracuse' },
  { slug: 'hudsonvalley', name: 'Hudson Valley', state: 'NY', city: 'Hudson Valley' },

  // Georgia
  { slug: 'atlanta', name: 'Atlanta', state: 'GA', city: 'Atlanta' },

  // North Carolina
  { slug: 'charlotte', name: 'Charlotte', state: 'NC', city: 'Charlotte' },
  { slug: 'raleigh', name: 'Raleigh', state: 'NC', city: 'Raleigh' },

  // Illinois
  { slug: 'chicago', name: 'Chicago', state: 'IL', city: 'Chicago' },

  // Ohio
  { slug: 'columbus', name: 'Columbus', state: 'OH', city: 'Columbus' },
  { slug: 'cincinnati', name: 'Cincinnati', state: 'OH', city: 'Cincinnati' },
  { slug: 'cleveland', name: 'Cleveland', state: 'OH', city: 'Cleveland' },

  // Pennsylvania
  { slug: 'philadelphia', name: 'Philadelphia', state: 'PA', city: 'Philadelphia' },
  { slug: 'pittsburgh', name: 'Pittsburgh', state: 'PA', city: 'Pittsburgh' },

  // Massachusetts
  { slug: 'boston', name: 'Boston', state: 'MA', city: 'Boston' },

  // Connecticut
  { slug: 'hartford', name: 'Hartford', state: 'CT', city: 'Hartford' },
  { slug: 'newhaven', name: 'New Haven', state: 'CT', city: 'New Haven' },

  // DC / Maryland / Virginia (DMV handled separately but include for completeness)
  { slug: 'dmv', name: 'Washington DC Metro', state: 'DC', city: 'Washington' },

  // Maryland
  { slug: 'baltimore', name: 'Baltimore', state: 'MD', city: 'Baltimore' },

  // Florida
  { slug: 'tampa', name: 'Tampa', state: 'FL', city: 'Tampa' },
  { slug: 'orlando', name: 'Orlando', state: 'FL', city: 'Orlando' },
  { slug: 'southflorida', name: 'South Florida', state: 'FL', city: 'Miami' },
  { slug: 'jacksonville', name: 'Jacksonville', state: 'FL', city: 'Jacksonville' },

  // New Jersey
  { slug: 'newjersey', name: 'New Jersey', state: 'NJ', city: 'Newark' },
  { slug: 'centraljersey', name: 'Central New Jersey', state: 'NJ', city: 'Princeton' },

  // Indiana
  { slug: 'indianapolis', name: 'Indianapolis', state: 'IN', city: 'Indianapolis' },

  // Tennessee
  { slug: 'nashville', name: 'Nashville', state: 'TN', city: 'Nashville' },

  // Wisconsin
  { slug: 'milwaukee', name: 'Milwaukee', state: 'WI', city: 'Milwaukee' },
  { slug: 'madison', name: 'Madison', state: 'WI', city: 'Madison' },

  // Minnesota
  { slug: 'twincities', name: 'Twin Cities', state: 'MN', city: 'Minneapolis' },

  // Virginia
  { slug: 'richmond', name: 'Richmond', state: 'VA', city: 'Richmond' },

  // South Carolina
  { slug: 'charleston', name: 'Charleston', state: 'SC', city: 'Charleston' },
];

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// This site is family-focused so minimal filtering needed
// ==========================================
const NON_FAMILY_PATTERNS = /\b(adults?\s*only|21\+|18\+|bar\s*crawl|pub\s*crawl|burlesque|strip\s*club|nightclub|cannabis|beer\s*fest|wine\s*tasting|happy\s*hour|singles\s*mixer)\b/i;

// Promotional/meta content patterns to skip
const PROMO_PATTERNS = /^(how to list|free things to do|free places to take|things to do this|top \d+ things|best things to do|submit your event|add your event)/i;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Format date as YYYY-MM-DD for URL
 */
function formatDateForUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse venue/address blob into structured components
 * e.g. "Venue Name, 123 Main St, City, ST 12345, United States"
 */
function parseVenueBlob(venueText) {
  if (!venueText) return { venue: '', address: '', city: '', state: '', zipCode: '' };

  let cleaned = venueText.replace(/\s*See\s*map:\s*Google\s*Maps\s*/gi, '').trim();
  cleaned = cleaned.replace(/,?\s*(United States|USA)\s*$/i, '').trim();

  // Try: "Name, Street, City, ST ZIP"
  const fullMatch = cleaned.match(/^(.+?),\s*(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
  if (fullMatch) {
    return {
      venue: fullMatch[1].trim(),
      address: fullMatch[2].trim(),
      city: fullMatch[3].trim(),
      state: fullMatch[4],
      zipCode: (fullMatch[5] || '').trim(),
    };
  }

  // Try: "Name, Street Name, City, ST" (no house number)
  const streetMatch = cleaned.match(/^(.+?),\s*([^,]+(?:Street|Road|Avenue|Drive|Boulevard|Blvd|Lane|Way|Pike|Pkwy|Parkway|Hwy|Highway|Rd|Dr|Ave|St|Ln|Ct|Pl|Circle|Trail|Tr)[^,]*),\s*([^,]+),\s*([A-Z]{2})/i);
  if (streetMatch) {
    return {
      venue: streetMatch[1].trim(),
      address: streetMatch[2].trim(),
      city: streetMatch[3].trim(),
      state: streetMatch[4],
      zipCode: '',
    };
  }

  // Try: "Name, City, ST ZIP"
  const nStreetMatch = cleaned.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
  if (nStreetMatch) {
    return {
      venue: nStreetMatch[1].trim(),
      address: '',
      city: nStreetMatch[2].trim(),
      state: nStreetMatch[3],
      zipCode: (nStreetMatch[4] || '').trim(),
    };
  }

  return { venue: cleaned, address: '', city: '', state: '', zipCode: '' };
}

// ==========================================
// SCRAPE A SINGLE REGION
// ==========================================

/**
 * Extract events directly from the list page DOM.
 * Each .views-row contains a .node with:
 *   .group-activity-image → image + venue (.field-name-field-venue-places-api)
 *   .group-activity-details → h2 title, description, dates, time
 *
 * This avoids visiting individual detail pages, which:
 *   1. Reduces requests from ~200+ to ~14 per region
 *   2. Prevents IP rate-limiting/bans from KOAA
 *   3. Eliminates the venue HTML-pollution bug
 */
async function scrapeRegion(region, browser, daysToScrape) {
  const baseUrl = `https://${region.slug}.kidsoutandabout.com`;
  console.log(`\n📍 ${region.name} (${region.state})`);
  console.log(`   🌐 ${baseUrl}`);

  const events = [];
  const seenUrls = new Set();

  // Reuse a single page for this region to reduce resource usage
  const page = await createStealthPage(browser);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < daysToScrape; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = formatDateForUrl(date);
      const listUrl = `${baseUrl}/event-list/${dateStr}`;

      try {
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // Check for IP ban
        const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '');
        if (pageText.includes('has been banned')) {
          console.log(`   ⛔ IP banned on ${region.slug}.kidsoutandabout.com — skipping region`);
          break;
        }

        // Extract all event data directly from the list page
        const listEvents = await page.evaluate((base, dateStr) => {
          const rows = document.querySelectorAll('.views-row');
          const results = [];

          for (const row of rows) {
            const node = row.querySelector('.node');
            if (!node) continue;

            // Title from the second h2 inside .group-activity-details
            const titleLink = node.querySelector('.group-activity-details h2 a[href*="/content/"]');
            if (!titleLink) continue;
            const title = titleLink.textContent?.trim();
            if (!title || title.length < 4) continue;

            const href = titleLink.getAttribute('href') || '';
            const url = href.startsWith('http') ? href : `${base}${href}`;

            // Venue from Drupal field
            const venueEl = node.querySelector('.field-name-field-venue-places-api .field-items');
            let venueText = venueEl?.textContent?.trim() || '';
            // Clean up "See map: Google Maps" and extra whitespace
            venueText = venueText.replace(/\s*See\s*map:\s*Google\s*Maps\s*/gi, '').trim();
            // Collapse multiple spaces/newlines
            venueText = venueText.replace(/\s+/g, ' ').trim();

            // Description
            const descEl = node.querySelector('.field-name-field-short-description');
            const description = descEl?.textContent?.trim()?.substring(0, 500) || '';

            // Date (MM/DD/YYYY format from the field)
            const dateEl = node.querySelector('.field-type-datetime .field-items');
            const eventDateRaw = dateEl?.textContent?.trim() || dateStr;

            // Time
            const timeEl = node.querySelector('.field-name-field-time .field-items, .field-name-field-time-text .field-items');
            const time = timeEl?.textContent?.trim() || '';

            // Image
            const imgEl = node.querySelector('.field-name-field-enhanced-activity-image img');
            const imageUrl = imgEl?.getAttribute('src') || '';

            // Age range (if present on list page)
            const ageEl = node.querySelector('[class*="field-name-field-age"] .field-items');
            const ageRange = ageEl?.textContent?.trim()?.substring(0, 50) || 'All Ages';

            results.push({ title, url, venueText, description, eventDateRaw, time, imageUrl, ageRange });
          }

          return results;
        }, baseUrl, dateStr);

        // Filter and deduplicate
        let newCount = 0;
        for (const ev of listEvents) {
          if (seenUrls.has(ev.url)) continue;
          seenUrls.add(ev.url);
          newCount++;

          // Skip promo/meta content — check is done outside evaluate
          if (PROMO_PATTERNS.test(ev.title)) continue;
          if (NON_FAMILY_PATTERNS.test(`${ev.title} ${ev.description}`)) continue;

          // Parse venue blob into components
          const parsed = parseVenueBlob(ev.venueText);
          const eventCity = parsed.city || region.city;
          const eventState = parsed.state || region.state;

          // Parse the date from MM/DD/YYYY format
          let eventDate = '';
          const dateParts = ev.eventDateRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateParts) {
            const d = new Date(`${dateParts[3]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}T00:00:00`);
            if (!isNaN(d.getTime())) {
              eventDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
          }
          if (!eventDate) {
            eventDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          }

          events.push({
            title: ev.title,
            eventDate: eventDate,
            time: ev.time || '',
            description: ev.description || `${ev.title} in ${eventCity}, ${eventState}`,
            venueName: parsed.venue || 'See event page',
            city: eventCity,
            state: eventState,
            url: ev.url,
            imageUrl: ev.imageUrl || '',
            ageRange: ev.ageRange || 'All Ages',
            category: 'Family Events',
            latitude: null,
            longitude: null,
            details: {
              city: eventCity,
              state: eventState,
              address: parsed.address
                ? `${parsed.address}, ${eventCity}, ${eventState}`
                : `${eventCity}, ${eventState}`,
              zipCode: parsed.zipCode || '',
            },
          });
        }

        if (dayOffset % 3 === 0) {
          console.log(`   📆 ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${newCount} new events`);
        }
      } catch (err) {
        console.log(`   ⚠️ Failed to fetch ${dateStr}: ${err.message}`);
      }

      // Rate limiting between days — generous to avoid bans
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (err) {
    console.error(`   ❌ Region failed: ${err.message}`);
  } finally {
    try { await page.close(); } catch (e) {}
  }

  console.log(`   ✅ ${events.length} events extracted from ${region.name}`);
  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================

async function scrapeKidsOutAndAbout(filterStates = null, daysToScrape = 14) {
  console.log('\n\x1b[33m👶━━━━━━━━━━━━━ KIDS OUT AND ABOUT SCRAPER (Eastern) ━━━━━━━━━━━━━━👶\x1b[0m');

  const regionsToScrape = filterStates
    ? REGIONS.filter(r => filterStates.includes(r.state))
    : REGIONS;

  const stateCount = new Set(regionsToScrape.map(r => r.state)).size;
  console.log(`📍 Target: ${regionsToScrape.length} regions across ${stateCount} states`);
  console.log(`📅 Scraping ${daysToScrape} days of events per region`);
  console.log(`🌐 Source: KidsOutAndAbout.com\n`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};

  try {
    for (let i = 0; i < regionsToScrape.length; i++) {
      const region = regionsToScrape[i];
      console.log(`\n[${i + 1}/${regionsToScrape.length}] ${region.name} (${region.state})`);

      const regionEvents = await scrapeRegion(region, browser, daysToScrape);
      allEvents.push(...regionEvents);

      if (!stateResults[region.state]) stateResults[region.state] = 0;
      stateResults[region.state] += regionEvents.length;

      // Save in batches per region to keep memory manageable
      if (allEvents.length >= 500 || i === regionsToScrape.length - 1) {
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
                category: 'Family Events',
                platform: 'kidsoutandabout',
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

      // 5-second delay between regions to avoid IP bans
      if (i < regionsToScrape.length - 1) {
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

  const fullMode = args.includes('--full');
  const daysToScrape = fullMode ? 30 : 14;

  scrapeKidsOutAndAbout(statesToScrape, daysToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeKidsOutAndAboutCloudFunction() {
  try {
    const result = await scrapeKidsOutAndAbout(null, 14);
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeKidsOutAndAbout,
  scrapeKidsOutAndAboutCloudFunction,
};
