#!/usr/bin/env node

/**
 * LOCALIST STATE PARKS SCRAPER (API-based)
 *
 * Scrapes state parks events from Localist-platform sites using their
 * public JSON API — no browser needed.
 *
 * Supports: Pennsylvania, Indiana
 *
 * API pattern:
 *   GET https://{host}/api/2/events?pp=100&page=N[&group_id=X]
 *   Returns: { events: [{ event: {...} }], page: { current, size, total } }
 *
 * Usage:
 *   node scraper-localist-parks.js --state PA    # Pennsylvania only
 *   node scraper-localist-parks.js --state IN    # Indiana only
 *   node scraper-localist-parks.js               # All states
 *
 * Cloud Function: scrapeLocalistParksCloudFunction
 * Schedule: Group 2 (every 3 days on days 2, 5, 8, 11...)
 */

const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'LocalistParks';

// ──────────────────────────────────────────────────────────────────────
// State configurations
// ──────────────────────────────────────────────────────────────────────

const LOCALIST_CONFIGS = [
  {
    name: 'Pennsylvania State Parks',
    state: 'PA',
    host: 'https://events.dcnr.pa.gov',
    apiPath: '/api/2/events',
    extraParams: {},
    county: 'Multi-County'
  },
  {
    name: 'Indiana State Parks',
    state: 'IN',
    host: 'https://events.in.gov',
    apiPath: '/api/2/events',
    extraParams: { group_id: 'dnr' },
    county: 'Multi-County'
  }
];

// ──────────────────────────────────────────────────────────────────────
// API fetching
// ──────────────────────────────────────────────────────────────────────

/**
 * Fetch all pages of events from a Localist API endpoint.
 * Returns an array of raw Localist event objects.
 */
async function fetchAllEvents(config) {
  const allEvents = [];
  let page = 1;
  let totalPages = 1;
  const perPage = 100;

  while (page <= totalPages) {
    const params = {
      pp: perPage,
      page,
      ...config.extraParams
    };

    const url = `${config.host}${config.apiPath}`;
    console.log(`  📡 Fetching page ${page}/${totalPages}... (${url})`);

    try {
      const response = await axios.get(url, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'FunHive-Family-Events-Scraper/1.0 (https://funhive.co)',
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      if (!data || !data.events) {
        console.log(`  ⚠️  No events array in response for page ${page}`);
        break;
      }

      // Extract events from the nested { event: {...} } wrapper
      for (const wrapper of data.events) {
        if (wrapper.event) {
          allEvents.push(wrapper.event);
        }
      }

      // Update pagination
      if (data.page) {
        totalPages = data.page.total || 1;
      }

      console.log(`  ✅ Got ${data.events.length} events (page ${page}/${totalPages})`);

      page++;

      // Rate limiting between pages
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error(`  ❌ API error on page ${page}: ${err.message}`);
      // If first page fails, bail. Otherwise, keep what we have.
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
 * Transform a raw Localist event into the format expected by saveEventsWithGeocoding.
 *
 * Localist event fields used:
 *   title, description_text, location_name, address, url (localist_url),
 *   geo.{latitude, longitude, city, state, zip},
 *   event_instances[0].event_instance.{start, end, all_day},
 *   photo_url, filters.event_types, free
 */
function transformEvent(raw, config) {
  // Get the first (upcoming) event instance for date/time
  const instance = raw.event_instances?.[0]?.event_instance;
  const startIso = instance?.start;
  const endIso = instance?.end;
  const allDay = instance?.all_day;

  // Build date string from ISO start
  let eventDate = '';
  let startTime = null;
  let endTime = null;

  if (startIso) {
    const startDt = new Date(startIso);
    if (!isNaN(startDt.getTime())) {
      // Format as "Month Day, Year" for the TEXT column
      eventDate = startDt.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        timeZone: 'America/New_York'
      });

      // Extract start time (skip for all-day events)
      if (!allDay) {
        startTime = startDt.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
          timeZone: 'America/New_York'
        });
      }
    }
  }

  if (endIso && !allDay) {
    const endDt = new Date(endIso);
    if (!isNaN(endDt.getTime())) {
      endTime = endDt.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: 'America/New_York'
      });
    }
  }

  // Extract coordinates from geo object
  const lat = raw.geo?.latitude ? parseFloat(raw.geo.latitude) : null;
  const lng = raw.geo?.longitude ? parseFloat(raw.geo.longitude) : null;

  // Clean description — Localist provides both HTML (description) and plain text (description_text)
  const description = stripHtml(raw.description_text || raw.description || '').substring(0, 1500);

  // Build venue name: prefer location_name, fall back to park name from address
  const venue = raw.location_name || config.name;

  // Determine age range from title + description
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

  const eventObj = {
    title: (raw.title || '').substring(0, 200),
    name: (raw.title || '').substring(0, 200),
    date: eventDate,
    eventDate: eventDate,
    startTime,
    endTime,
    description,
    url: raw.localist_url || raw.url || '',
    imageUrl: raw.photo_url || '',
    venue,
    venueName: venue,
    ageRange,
    metadata: {
      sourceName: config.name,
      sourceUrl: config.host,
      scrapedAt: new Date().toISOString()
    }
  };

  // If Localist gives us coordinates, attach them so saveEventsWithGeocoding skips geocoding
  if (lat && lng && Math.abs(lat) > 0.1 && Math.abs(lng) > 0.1) {
    eventObj.latitude = lat;
    eventObj.longitude = lng;
  }

  // Attach city info from Localist geo object
  if (raw.geo?.city) {
    eventObj.city = raw.geo.city;
  }
  if (raw.geo?.zip) {
    eventObj.zipCode = raw.geo.zip;
  }

  return eventObj;
}

// ──────────────────────────────────────────────────────────────────────
// Main scraping
// ──────────────────────────────────────────────────────────────────────

/**
 * Scrape a single Localist state parks site
 */
async function scrapeLocalistState(config) {
  console.log(`\n🌲 Scraping ${config.name} (${config.state})`);
  console.log('-'.repeat(60));
  console.log(`API: ${config.host}${config.apiPath}\n`);

  try {
    // Fetch all events from the API
    const rawEvents = await fetchAllEvents(config);
    console.log(`  📋 Total raw events: ${rawEvents.length}`);

    if (rawEvents.length === 0) {
      console.log('⚠️  No events found from API\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

    // Transform events
    const events = [];
    for (const raw of rawEvents) {
      if (!raw.title || raw.title.trim().length < 5) continue;

      // Skip cancelled events
      const titleLower = (raw.title || '').toLowerCase();
      if (titleLower.includes('cancelled') || titleLower.includes('canceled') || titleLower.includes('postponed')) {
        console.log(`  ⏭️  Skipping cancelled: ${raw.title.substring(0, 50)}`);
        continue;
      }

      // Skip past events — only keep events whose first instance starts today or later
      const instance = raw.event_instances?.[0]?.event_instance;
      if (instance?.start) {
        const startDt = new Date(instance.start);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDt < today) continue;
      }

      const event = transformEvent(raw, config);
      if (event.date) {
        events.push(event);
      }
    }

    console.log(`  ✅ ${events.length} valid events after filtering`);

    // Save events via the standard helper
    if (events.length > 0) {
      // Build a "library" object for each unique venue with coordinates
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
            url: `${config.host}${config.apiPath}`,
            county: config.county
          });
        }
      }

      const libraries = Array.from(venueMap.values());

      const result = await saveEventsWithGeocoding(events, libraries, {
        scraperName: `${SCRAPER_NAME}-${config.state}`,
        state: config.state,
        category: 'parks',
        platform: 'localist-parks'
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

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const stateIdx = args.indexOf('--state');
  if (stateIdx !== -1 && args[stateIdx + 1]) {
    return args[stateIdx + 1].toUpperCase();
  }
  return null;
}

/**
 * Main scraper function
 */
async function scrapeLocalistParks() {
  console.log('\n' + '='.repeat(60));
  console.log('🌲 LOCALIST STATE PARKS SCRAPER (API-based)');
  console.log('='.repeat(60));

  const requestedState = parseArgs();
  const configsToScrape = requestedState
    ? LOCALIST_CONFIGS.filter(cfg => cfg.state === requestedState)
    : LOCALIST_CONFIGS;

  if (configsToScrape.length === 0) {
    console.error(`❌ No configuration found for state: ${requestedState}`);
    process.exit(1);
  }

  console.log(`\n📍 Scraping ${configsToScrape.length} state(s)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const config of configsToScrape) {
    const result = await scrapeLocalistState(config);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalErrors += result.errors;

    // Brief pause between states
    if (config !== configsToScrape[configsToScrape.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ LOCALIST PARKS SCRAPING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Saved: ${totalSaved}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log('='.repeat(60) + '\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors };
}

/**
 * Cloud Function wrapper
 */
async function scrapeLocalistParksCloudFunction(req, res) {
  try {
    const result = await scrapeLocalistParks();
    res.status(200).json({
      success: true,
      scraper: SCRAPER_NAME,
      ...result
    });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({
      success: false,
      scraper: SCRAPER_NAME,
      error: error.message
    });
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeLocalistParks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeLocalistParks, scrapeLocalistParksCloudFunction, LOCALIST_CONFIGS };
