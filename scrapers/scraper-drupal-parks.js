#!/usr/bin/env node

/**
 * DRUPAL JSON:API STATE PARKS SCRAPER
 *
 * Scrapes state parks events from Drupal-based government sites using
 * their JSON:API endpoint — no browser needed.
 *
 * API pattern:
 *   GET https://{host}/jsonapi/node/{contentType}?page[limit]=50&page[offset]=N
 *   Returns: { data: [...], links: { next? } }
 *
 * Each state has its own field mapping because Drupal sites use different
 * field machine names (e.g., field_event_date vs field_dnr_calendar_smart_date).
 *
 * Supports: Vermont, Wisconsin
 *
 * Usage:
 *   node scraper-drupal-parks.js --state VT    # Vermont only
 *   node scraper-drupal-parks.js --state WI    # Wisconsin only
 *   node scraper-drupal-parks.js               # All states
 *
 * Cloud Function: scrapeDrupalParksCloudFunction
 * Schedule: Group 1 (every 3 days on days 1, 4, 7, 10...)
 */

const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'DrupalParks';

// ──────────────────────────────────────────────────────────────────────
// State configurations with field mappings
// ──────────────────────────────────────────────────────────────────────

const DRUPAL_CONFIGS = [
  {
    name: 'Vermont State Parks',
    state: 'VT',
    host: 'https://fpr.vermont.gov',
    contentType: 'event',
    // Sort by date descending so newest come first
    sortField: '-field_event_date',
    county: 'Multi-County',
    /**
     * Map Drupal JSON:API attributes to a standardized event object.
     *
     * VT fields:
     *   title, body.value, field_event_date (array of ISO strings),
     *   field_end_date (ISO string), path.alias
     *   No location coordinates — needs geocoding by venue name.
     */
    mapEvent(attrs, id, host) {
      const dates = attrs.field_event_date; // array like ["2026-03-20T10:00:00-04:00"]
      const dateStr = Array.isArray(dates) ? dates[0] : dates;
      const endDateStr = attrs.field_end_date;

      let eventDate = '';
      let startTime = null;
      let endTime = null;

      if (dateStr) {
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) {
          eventDate = dt.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
            timeZone: 'America/New_York'
          });
          // Check if it has a meaningful time (not midnight)
          const hours = dt.getHours();
          const minutes = dt.getMinutes();
          if (hours !== 0 || minutes !== 0) {
            startTime = dt.toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
              timeZone: 'America/New_York'
            });
          }
        }
      }

      if (endDateStr) {
        const dt = new Date(endDateStr);
        if (!isNaN(dt.getTime())) {
          const hours = dt.getHours();
          const minutes = dt.getMinutes();
          if (hours !== 0 || minutes !== 0) {
            endTime = dt.toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
              timeZone: 'America/New_York'
            });
          }
        }
      }

      // Clean body HTML
      const bodyHtml = attrs.body?.value || '';
      const description = stripHtml(bodyHtml).substring(0, 1500);

      // Extract venue from title or body (VT events often mention park name in body)
      let venue = 'Vermont State Parks';
      const parkMatch = description.match(/(?:at|@)\s+([A-Z][^,.]+(?:State Park|State Forest|Natural Area))/i);
      if (parkMatch) {
        venue = parkMatch[1].trim();
      }

      const url = attrs.path?.alias
        ? `${host}${attrs.path.alias}`
        : `${host}/node/${attrs.drupal_internal__nid}`;

      return { eventDate, startTime, endTime, description, venue, url, latitude: null, longitude: null };
    }
  },
  {
    name: 'Wisconsin State Parks',
    state: 'WI',
    host: 'https://dnr.wisconsin.gov',
    contentType: 'dnr_event',
    sortField: '-field_dnr_calendar_smart_date.value',
    county: 'Multi-County',
    /**
     * WI fields:
     *   field_dnr_event_name (clean title), title (has prefix),
     *   field_dnr_event_details.value (HTML body),
     *   field_dnr_calendar_smart_date[0].{value, end_value, duration},
     *   field_dnr_event_specific_locate.{lat, lon},
     *   field_dnr_event_canceled, path.alias
     */
    mapEvent(attrs, id, host) {
      const smartDate = attrs.field_dnr_calendar_smart_date;
      const dateObj = Array.isArray(smartDate) ? smartDate[0] : smartDate;

      let eventDate = '';
      let startTime = null;
      let endTime = null;

      if (dateObj?.value) {
        const dt = new Date(dateObj.value);
        if (!isNaN(dt.getTime())) {
          eventDate = dt.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
            timeZone: 'America/Chicago' // WI is Central time
          });
          const hours = dt.getUTCHours();
          const minutes = dt.getUTCMinutes();
          if (hours !== 0 || minutes !== 0) {
            startTime = dt.toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
              timeZone: 'America/Chicago'
            });
          }
        }
      }

      if (dateObj?.end_value) {
        const dt = new Date(dateObj.end_value);
        if (!isNaN(dt.getTime())) {
          const hours = dt.getUTCHours();
          const minutes = dt.getUTCMinutes();
          if (hours !== 0 || minutes !== 0) {
            endTime = dt.toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
              timeZone: 'America/Chicago'
            });
          }
        }
      }

      // Body
      const bodyHtml = attrs.field_dnr_event_details?.value || '';
      const description = stripHtml(bodyHtml).substring(0, 1500);

      // Location — WI provides coordinates!
      const loc = attrs.field_dnr_event_specific_locate;
      const lat = loc?.lat || null;
      const lng = loc?.lon || null;

      // Venue: use event name or extract from title (WI title has prefix like "Calendar_Event_...")
      const venue = 'Wisconsin State Parks';

      const url = attrs.path?.alias
        ? `${host}${attrs.path.alias}`
        : `${host}/events/${attrs.drupal_internal__nid}`;

      return { eventDate, startTime, endTime, description, venue, url, latitude: lat, longitude: lng };
    },
    // WI has a canceled field we can check
    isCanceled(attrs) {
      return attrs.field_dnr_event_canceled === true;
    }
  }
];

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function detectAgeRange(title, description) {
  const fullText = `${title || ''} ${description || ''}`.toLowerCase();
  if (fullText.includes('toddler') || fullText.includes('baby') || fullText.match(/\b0[-–]?3\b/)) {
    return 'Babies & Toddlers (0-2)';
  } else if (fullText.includes('preschool') || fullText.match(/\b3[-–]?5\b/)) {
    return 'Preschool (3-5)';
  } else if (fullText.includes('junior ranger') || fullText.includes('jr ranger') || fullText.includes('jr. ranger')) {
    return 'Kids (6-8)';
  } else if (fullText.includes('child') && !fullText.includes('adult')) {
    return 'Kids (6-8)';
  } else if (fullText.includes('tween') || fullText.match(/\b9[-–]?12\b/)) {
    return 'Tweens (9-12)';
  } else if (fullText.includes('teen') && !fullText.includes('volunteer') || fullText.match(/\b13[-–]?18\b/)) {
    return 'Teens (13-18)';
  }
  return 'All Ages';
}

// ──────────────────────────────────────────────────────────────────────
// API fetching
// ──────────────────────────────────────────────────────────────────────

async function fetchAllEvents(config) {
  const allItems = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const url = `${config.host}/jsonapi/node/${config.contentType}`;
    console.log(`  📡 Fetching offset ${offset}... (${url})`);

    try {
      const params = {
        'page[limit]': limit,
        'page[offset]': offset
      };

      // Add sort if configured
      if (config.sortField) {
        params.sort = config.sortField;
      }

      const response = await axios.get(url, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/vnd.api+json, application/json, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': config.host + '/'
        }
      });

      const data = response.data;

      if (!data || !data.data || data.data.length === 0) {
        console.log(`  ⚠️  No data at offset ${offset}`);
        hasMore = false;
        break;
      }

      allItems.push(...data.data);
      console.log(`  ✅ Got ${data.data.length} items (offset ${offset})`);

      // Check if there's a next page
      hasMore = !!data.links?.next;
      offset += limit;

      // Safety: don't fetch more than 500 events
      if (offset >= 500) {
        console.log('  ⚠️  Reached 500 event limit, stopping pagination');
        hasMore = false;
      }

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error(`  ❌ API error at offset ${offset}: ${err.message}`);
      if (offset === 0) throw err;
      hasMore = false;
    }
  }

  return allItems;
}

// ──────────────────────────────────────────────────────────────────────
// Main scraping
// ──────────────────────────────────────────────────────────────────────

async function scrapeDrupalState(config) {
  console.log(`\n🌲 Scraping ${config.name} (${config.state})`);
  console.log('-'.repeat(60));
  console.log(`API: ${config.host}/jsonapi/node/${config.contentType}\n`);

  try {
    const rawItems = await fetchAllEvents(config);
    console.log(`  📋 Total raw items: ${rawItems.length}`);

    if (rawItems.length === 0) {
      console.log('⚠️  No events found from API\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of rawItems) {
      const attrs = item.attributes;
      if (!attrs) continue;

      // Get title — use the clean event name if available, otherwise title
      const title = attrs.field_dnr_event_name || attrs.title || '';
      if (title.length < 5) continue;

      // Check canceled
      if (config.isCanceled && config.isCanceled(attrs)) {
        console.log(`  ⏭️  Skipping canceled: ${title.substring(0, 50)}`);
        continue;
      }

      const titleLower = title.toLowerCase();
      if (titleLower.includes('cancelled') || titleLower.includes('canceled') || titleLower.includes('postponed')) {
        console.log(`  ⏭️  Skipping cancelled: ${title.substring(0, 50)}`);
        continue;
      }

      // Skip unpublished
      if (attrs.status === false) continue;

      // Map fields using state-specific mapper
      const mapped = config.mapEvent(attrs, item.id, config.host);
      if (!mapped.eventDate) continue;

      // Build event object
      const eventObj = {
        title: title.substring(0, 200),
        name: title.substring(0, 200),
        date: mapped.eventDate,
        eventDate: mapped.eventDate,
        startTime: mapped.startTime,
        endTime: mapped.endTime,
        description: mapped.description,
        url: mapped.url,
        imageUrl: '',
        venue: mapped.venue,
        venueName: mapped.venue,
        ageRange: detectAgeRange(title, mapped.description),
        metadata: {
          sourceName: config.name,
          sourceUrl: config.host,
          scrapedAt: new Date().toISOString()
        }
      };

      // Attach coordinates if available (WI has them)
      if (mapped.latitude && mapped.longitude) {
        eventObj.latitude = mapped.latitude;
        eventObj.longitude = mapped.longitude;
      }

      events.push(eventObj);
    }

    console.log(`  ✅ ${events.length} valid events after filtering`);

    if (events.length > 0) {
      // Build venue entries
      const venueMap = new Map();
      for (const event of events) {
        const key = (event.venue || config.name).toLowerCase();
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: event.venue || config.name,
            city: '',
            state: config.state,
            address: '',
            zipCode: '',
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
        platform: 'drupal-parks'
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

async function scrapeDrupalParks() {
  console.log('\n' + '='.repeat(60));
  console.log('🌲 DRUPAL JSON:API STATE PARKS SCRAPER');
  console.log('='.repeat(60));

  const requestedState = parseArgs();
  const configsToScrape = requestedState
    ? DRUPAL_CONFIGS.filter(cfg => cfg.state === requestedState)
    : DRUPAL_CONFIGS;

  if (configsToScrape.length === 0) {
    console.error(`❌ No configuration found for state: ${requestedState}`);
    process.exit(1);
  }

  console.log(`\n📍 Scraping ${configsToScrape.length} state(s)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const config of configsToScrape) {
    const result = await scrapeDrupalState(config);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalErrors += result.errors;

    if (config !== configsToScrape[configsToScrape.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DRUPAL PARKS SCRAPING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Saved: ${totalSaved}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log('='.repeat(60) + '\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors };
}

async function scrapeDrupalParksCloudFunction(req, res) {
  try {
    const result = await scrapeDrupalParks();
    res.status(200).json({ success: true, scraper: SCRAPER_NAME, ...result });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({ success: false, scraper: SCRAPER_NAME, error: error.message });
  }
}

if (require.main === module) {
  scrapeDrupalParks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeDrupalParks, scrapeDrupalParksCloudFunction, DRUPAL_CONFIGS };
