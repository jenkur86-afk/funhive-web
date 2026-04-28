#!/usr/bin/env node

/**
 * WORDPRESS THE EVENTS CALENDAR (TEC) STATE PARKS SCRAPER
 *
 * Scrapes state parks events from WordPress sites using The Events Calendar
 * plugin's REST API — no browser needed.
 *
 * API pattern:
 *   GET https://{host}/wp-json/tribe/events/v1/events?per_page=50&page=N
 *   Returns: { events: [...], total, total_pages, ... }
 *
 * Supports: West Virginia, New Jersey
 *
 * Usage:
 *   node scraper-wordpress-tec-parks.js --state WV    # West Virginia only
 *   node scraper-wordpress-tec-parks.js               # All states
 *
 * Cloud Function: scrapeWordPressTecParksCloudFunction
 * Schedule: Group 3 (every 3 days on days 3, 6, 9, 12...)
 */

const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'WordPressTecParks';

// ──────────────────────────────────────────────────────────────────────
// State configurations
// ──────────────────────────────────────────────────────────────────────

const TEC_CONFIGS = [
  {
    name: 'West Virginia State Parks',
    state: 'WV',
    host: 'https://wvstateparks.com',
    apiPath: '/wp-json/tribe/events/v1/events',
    perPage: 50,
    county: 'Multi-County'
  },
  {
    name: 'New Jersey State Parks',
    state: 'NJ',
    host: 'https://dep.nj.gov',
    apiPath: '/wp-json/tribe/events/v1/events',
    perPage: 50,
    county: 'Multi-County'
  }
];

// ──────────────────────────────────────────────────────────────────────
// API fetching
// ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all pages of events from a WordPress TEC REST API endpoint.
 */
async function fetchAllEvents(config) {
  const allEvents = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${config.host}${config.apiPath}`;
    console.log(`  📡 Fetching page ${page}/${totalPages}... (${url})`);

    try {
      const response = await axios.get(url, {
        params: {
          per_page: config.perPage || 50,
          page,
          start_date: new Date().toISOString().split('T')[0] // Only future events
        },
        timeout: 30000,
        headers: {
          'User-Agent': 'FunHive-Family-Events-Scraper/1.0 (https://funhive.co)',
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      if (!data || !data.events) {
        console.log(`  ⚠️  No events in response for page ${page}`);
        break;
      }

      allEvents.push(...data.events);

      totalPages = data.total_pages || 1;
      console.log(`  ✅ Got ${data.events.length} events (page ${page}/${totalPages}, total: ${data.total})`);

      page++;

      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error(`  ❌ API error on page ${page}: ${err.message}`);
      if (page === 1) throw err;
      break;
    }
  }

  return allEvents;
}

// ──────────────────────────────────────────────────────────────────────
// Event transformation
// ──────────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags from a string
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/**
 * Transform a WordPress TEC event into the format expected by saveEventsWithGeocoding.
 *
 * TEC event fields:
 *   title, description, excerpt, url, start_date, end_date, all_day,
 *   venue.venue, venue.city, venue.state, venue.zip, venue.address,
 *   cost, image.url, categories[]
 */
function transformEvent(raw, config) {
  const startDate = raw.start_date; // "2026-04-24 00:00:00"
  const endDate = raw.end_date;     // "2026-04-25 23:59:59"

  // Format date for TEXT column
  let eventDate = '';
  let startTime = null;
  let endTime = null;

  if (startDate) {
    const dt = new Date(startDate.replace(' ', 'T'));
    if (!isNaN(dt.getTime())) {
      eventDate = dt.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });

      if (!raw.all_day) {
        startTime = dt.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true
        });
      }
    }
  }

  if (endDate && !raw.all_day) {
    const dt = new Date(endDate.replace(' ', 'T'));
    if (!isNaN(dt.getTime())) {
      endTime = dt.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    }
  }

  // Venue info
  const venue = raw.venue?.venue || config.name;
  const city = raw.venue?.city || '';
  const venueState = raw.venue?.state || config.state;
  const zipCode = raw.venue?.zip || '';

  // Clean description
  const description = stripHtml(raw.description || raw.excerpt || '').substring(0, 1500);

  // Age range detection
  const fullText = `${raw.title || ''} ${description}`.toLowerCase();
  let ageRange = 'All Ages';
  if (fullText.includes('toddler') || fullText.includes('baby') || fullText.match(/\b0[-–]?3\b/)) {
    ageRange = 'Babies & Toddlers (0-2)';
  } else if (fullText.includes('preschool') || fullText.match(/\b3[-–]?5\b/)) {
    ageRange = 'Preschool (3-5)';
  } else if (fullText.includes('junior ranger') || fullText.includes('jr ranger') || fullText.includes('jr. ranger')) {
    ageRange = 'Kids (6-8)';
  } else if (fullText.includes('child') && !fullText.includes('adult')) {
    ageRange = 'Kids (6-8)';
  } else if (fullText.includes('tween') || fullText.match(/\b9[-–]?12\b/)) {
    ageRange = 'Tweens (9-12)';
  } else if (fullText.includes('teen') && !fullText.includes('volunteer') || fullText.match(/\b13[-–]?18\b/)) {
    ageRange = 'Teens (13-18)';
  } else if (fullText.includes('family') || fullText.includes('all ages') || fullText.includes('homeschool')) {
    ageRange = 'All Ages';
  }

  return {
    title: (raw.title || '').substring(0, 200),
    name: (raw.title || '').substring(0, 200),
    date: eventDate,
    eventDate: eventDate,
    startTime,
    endTime,
    description,
    url: raw.url || '',
    imageUrl: raw.image?.url || '',
    venue,
    venueName: venue,
    city,
    zipCode,
    ageRange,
    metadata: {
      sourceName: config.name,
      sourceUrl: config.host,
      scrapedAt: new Date().toISOString()
    }
  };
}

// ──────────────────────────────────────────────────────────────────────
// Main scraping
// ──────────────────────────────────────────────────────────────────────

async function scrapeTecState(config) {
  console.log(`\n🌲 Scraping ${config.name} (${config.state})`);
  console.log('-'.repeat(60));
  console.log(`API: ${config.host}${config.apiPath}\n`);

  try {
    const rawEvents = await fetchAllEvents(config);
    console.log(`  📋 Total raw events: ${rawEvents.length}`);

    if (rawEvents.length === 0) {
      console.log('⚠️  No events found from API\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

    const events = [];
    for (const raw of rawEvents) {
      if (!raw.title || raw.title.trim().length < 5) continue;

      const titleLower = (raw.title || '').toLowerCase();
      if (titleLower.includes('cancelled') || titleLower.includes('canceled') || titleLower.includes('postponed')) {
        console.log(`  ⏭️  Skipping cancelled: ${raw.title.substring(0, 50)}`);
        continue;
      }

      const event = transformEvent(raw, config);
      if (event.date) {
        events.push(event);
      }
    }

    console.log(`  ✅ ${events.length} valid events after filtering`);

    if (events.length > 0) {
      // Build venue library entries
      const venueMap = new Map();
      for (const event of events) {
        const key = (event.venue || config.name).toLowerCase();
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: event.venue || config.name,
            city: event.city || '',
            state: config.state,
            address: '',
            zipCode: event.zipCode || '',
            url: config.host,
            county: config.county
          });
        }
      }

      const libraries = Array.from(venueMap.values());

      const result = await saveEventsWithGeocoding(events, libraries, {
        scraperName: `${SCRAPER_NAME}-${config.state}`,
        state: config.state,
        category: 'parks',
        platform: 'wordpress-tec-parks'
      });

      console.log(`  📊 Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors\n`);
      return result;
    } else {
      console.log('⚠️  No valid events after filtering\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }
  } catch (error) {
    console.error(`❌ Error scraping ${config.name}:`, error.message);
    return { saved: 0, skipped: 0, errors: 1, deleted: 0 };
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const stateIdx = args.indexOf('--state');
  if (stateIdx !== -1 && args[stateIdx + 1]) {
    return args[stateIdx + 1].toUpperCase();
  }
  return null;
}

async function scrapeWordPressTecParks() {
  console.log('\n' + '='.repeat(60));
  console.log('🌲 WORDPRESS TEC STATE PARKS SCRAPER');
  console.log('='.repeat(60));

  const requestedState = parseArgs();
  const configsToScrape = requestedState
    ? TEC_CONFIGS.filter(cfg => cfg.state === requestedState)
    : TEC_CONFIGS;

  if (configsToScrape.length === 0) {
    console.error(`❌ No configuration found for state: ${requestedState}`);
    process.exit(1);
  }

  console.log(`\n📍 Scraping ${configsToScrape.length} state(s)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const config of configsToScrape) {
    const result = await scrapeTecState(config);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalErrors += result.errors;

    if (config !== configsToScrape[configsToScrape.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ WORDPRESS TEC PARKS SCRAPING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Saved: ${totalSaved}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log('='.repeat(60) + '\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors };
}

async function scrapeWordPressTecParksCloudFunction(req, res) {
  try {
    const result = await scrapeWordPressTecParks();
    res.status(200).json({ success: true, scraper: SCRAPER_NAME, ...result });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({ success: false, scraper: SCRAPER_NAME, error: error.message });
  }
}

if (require.main === module) {
  scrapeWordPressTecParks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeWordPressTecParks, scrapeWordPressTecParksCloudFunction, TEC_CONFIGS };
