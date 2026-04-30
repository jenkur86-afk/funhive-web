#!/usr/bin/env node

/**
 * PORT DISCOVERY CHILDREN'S MUSEUM SCRAPER
 *
 * Scrapes family events from Port Discovery Children's Museum in Baltimore, MD
 * Uses JSON-LD structured data from their calendar page
 *
 * Location: 35 Market Place, Baltimore, MD 21202
 * Website: https://www.portdiscovery.org
 *
 * Usage:
 *   node scraper-port-discovery-md.js          # Test mode
 *   node scraper-port-discovery-md.js --full   # Full mode (60 days)
 *
 * Cloud Function: scheduledPortDiscoveryMD
 * Schedule: Every 3 days
 */

const axios = require('axios');
const cheerio = require('cheerio');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

const SCRAPER_NAME = 'PortDiscovery-MD';
const BASE_URL = 'https://www.portdiscovery.org';
const CALENDAR_URL = `${BASE_URL}/plan-your-visit/calendar`;

// Port Discovery location
const VENUE = {
  name: 'Port Discovery Children\'s Museum',
  address: '35 Market Place',
  city: 'Baltimore',
  state: 'MD',
  zipCode: '21202',
  latitude: 39.2890,
  longitude: -76.6069,
  website: 'https://www.portdiscovery.org',
  phone: '410-727-8120',
};

/**
 * Parse date string from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Handle ISO format
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }

  // Try direct parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format date for display
 */
function formatEventDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Extract time from ISO date string
 */
function extractTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parse age range from event name/description
 */
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lower = text.toLowerCase();
  if (lower.includes('toddler')) return 'Toddlers (1-3)';
  if (lower.includes('preschool')) return 'Preschool (3-5)';
  if (lower.includes('budding') || lower.includes('baby')) return 'Babies & Toddlers (0-2)';
  if (lower.includes('all ages')) return 'All Ages';

  return 'All Ages';
}

/**
 * Parse cost from event description
 */
function parseCost(text, offers) {
  // Check offers from JSON-LD
  if (offers) {
    if (offers.price === 0 || offers.price === '0') return 'Free';
    if (offers.price) return `$${offers.price}`;
    if (offers.lowPrice && offers.highPrice) return `$${offers.lowPrice}-$${offers.highPrice}`;
  }

  if (!text) return 'Included with admission';

  const lower = text.toLowerCase();
  if (lower.includes('free') || lower.includes('included')) return 'Included with admission';
  if (lower.includes('$')) {
    const match = text.match(/\$[\d,.]+(?:\s*-\s*\$?[\d,.]+)?/);
    if (match) return match[0];
  }

  return 'Included with admission';
}

/**
 * Fetch calendar page and extract events
 */
async function fetchCalendarEvents() {
  try {
    const response = await axios.get(CALENDAR_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error(`Failed to fetch calendar: ${error.message}`);
    return null;
  }
}

/**
 * Extract JSON-LD events from HTML
 */
function extractJsonLdEvents(html) {
  const $ = cheerio.load(html);
  const events = [];

  // Find all JSON-LD scripts
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      const json = JSON.parse(content);

      // Handle single event or array of events
      if (Array.isArray(json)) {
        json.forEach(item => {
          if (item['@type'] === 'Event') {
            events.push(item);
          }
        });
      } else if (json['@type'] === 'Event') {
        events.push(json);
      } else if (json['@graph']) {
        json['@graph'].forEach(item => {
          if (item['@type'] === 'Event') {
            events.push(item);
          }
        });
      }
    } catch (e) {
      // Skip invalid JSON
    }
  });

  return events;
}

/**
 * Also extract events from HTML if JSON-LD is incomplete
 */
function extractHtmlEvents(html) {
  const $ = cheerio.load(html);
  const events = [];

  // Look for event cards/listings on the page
  $('.tribe-events-calendar-list__event, .tribe-events-pro-week-grid__event, .event-item, article[class*="event"]').each((_, el) => {
    try {
      const $el = $(el);

      const title = $el.find('h3, h4, .tribe-events-calendar-list__event-title').first().text().trim();
      const link = $el.find('a[href*="event"]').first().attr('href');
      const dateText = $el.find('.tribe-events-calendar-list__event-datetime, .event-date, time').first().text().trim();
      const description = $el.find('.tribe-events-calendar-list__event-description, .event-description, p').first().text().trim();

      if (title) {
        events.push({
          name: title,
          url: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : '',
          dateText: dateText,
          description: description,
        });
      }
    } catch (e) {
      // Skip invalid entries
    }
  });

  return events;
}

/**
 * Convert JSON-LD event to our format
 */
/**
 * Check if an event name is actually operational status junk (not a real event).
 * Filters out entries like "CLOSED", "OPEN", "OPEN | 10AM-3PM" that appear
 * in the calendar as day-level status indicators, not actual events.
 */
function isOperationalJunk(name) {
  if (!name || typeof name !== 'string') return true;
  const t = name.trim().toUpperCase();
  if (t.length < 3) return true;
  // Exact matches for operational status
  if (/^(CLOSED|OPEN|MUSEUM CLOSED|MUSEUM OPEN|WE'RE CLOSED|WE ARE CLOSED|HOLIDAY HOURS?|EARLY CLOSE|LATE OPEN|SPECIAL HOURS?)$/i.test(t)) return true;
  // "OPEN | 10AM-3PM" or "OPEN 10AM - 3PM" patterns
  if (/^(OPEN|CLOSED)\s*[\|:]\s*\d/i.test(name.trim())) return true;
  // Very short names that look like status labels
  if (t.length < 6 && !/\w+\s+\w+/.test(t)) return true;
  return false;
}

function convertJsonLdEvent(jsonLdEvent) {
  const name = jsonLdEvent.name || '';
  const description = jsonLdEvent.description || '';

  // Skip operational status entries (CLOSED, OPEN | 10AM-3PM, etc.)
  if (isOperationalJunk(name)) {
    return null;
  }
  const startDate = jsonLdEvent.startDate || '';
  const endDate = jsonLdEvent.endDate || '';
  const url = jsonLdEvent.url || '';

  // Parse dates
  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);

  // Skip past events
  const now = new Date();
  if (startDateObj && startDateObj < now) {
    return null;
  }

  // Skip events more than 60 days out
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  if (startDateObj && startDateObj > maxDate) {
    return null;
  }

  // Extract times
  const startTime = extractTime(startDate);
  const endTime = extractTime(endDate);

  // Parse age range and cost
  const ageRange = parseAgeRange(name + ' ' + description);
  const cost = parseCost(description, jsonLdEvent.offers);

  // Get categorization
  const { parentCategory, displayCategory, subcategory } = categorizeEvent({
    name: name,
    description: description,
  });

  // Normalize date format
  const rawDate = startDateObj ? startDateObj.toISOString() : '';
  const normalizedDate = normalizeDateString(rawDate);
  if (!normalizedDate) {
    return null; // Invalid date - caller should skip
  }

  // Build event object
  return {
    name: name,
    eventDate: normalizedDate,
    startTime: startTime,
    endTime: endTime,
    scheduleDescription: startDateObj ? formatEventDate(startDateObj) : '',
    description: description.substring(0, 500),
    venue: VENUE.name,
    address: VENUE.address,
    city: VENUE.city,
    state: VENUE.state,
    zipCode: VENUE.zipCode,
    location: {
      name: VENUE.name,
      address: VENUE.address,
      city: VENUE.city,
      zipCode: VENUE.zipCode,
      coordinates: {
        latitude: VENUE.latitude,
        longitude: VENUE.longitude,
      },
    },
    geohash: ngeohash.encode(VENUE.latitude, VENUE.longitude, 7),
    ageRange: ageRange,
    cost: cost,
    parentCategory,
    displayCategory,
    subcategory,
    url: url || CALENDAR_URL,
    contact: {
      website: VENUE.website,
      phone: VENUE.phone,
    },
    metadata: {
      sourceName: 'Port Discovery Children\'s Museum',
      sourceUrl: BASE_URL,
      scrapedAt: new Date().toISOString(),
      scraperName: SCRAPER_NAME,
      platform: 'port-discovery',
      state: 'MD',
      county: 'Baltimore City',
      addedDate: admin.firestore.FieldValue.serverTimestamp(),
    },
    filters: {
      isFree: cost === 'Free' || cost.toLowerCase().includes('included'),
      ageRange: ageRange,
    },
  };
}

/**
 * Save events to database
 */
async function saveEvents(events) {
  if (events.length === 0) return { saved: 0, skipped: 0, failed: 0 };

  let saved = 0, skipped = 0, failed = 0;

  for (const event of events) {
    try {
      // Generate unique ID
      const eventId = generateEventId(event.url + event.name + event.eventDate);

      // Check for existing event
      const existingDoc = await db.collection('events').doc(eventId).get();
      if (existingDoc.exists) {
        skipped++;
        continue;
      }

      // Save new event
      
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(event);
        if (activityId) {
          event.activityId = activityId;
        }

        await db.collection('events').doc(eventId).set(event);
      saved++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  Failed to save event: ${error.message}`);
      failed++;
    }
  }

  return { saved, skipped, failed };
}

/**
 * Main scraper function
 */
async function scrapePortDiscovery(options = {}) {
  const { maxDays = 60 } = options;

  console.log(`\n🏛️ PORT DISCOVERY CHILDREN'S MUSEUM SCRAPER`);
  console.log(`📍 Location: Baltimore, MD`);
  console.log(`📅 Scraping up to ${maxDays} days of events`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Fetch calendar page
  console.log('\n📥 Fetching calendar page...');
  const html = await fetchCalendarEvents();

  if (!html) {
    console.error('❌ Failed to fetch calendar page');
    
  // Log scraper stats to database
  await logScraperResult('PortDiscovery-MD', {
    found: 0,
    new: 0,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: 0, skipped: 0, failed: 0 };
  }

  // Extract events from JSON-LD
  console.log('🔍 Extracting JSON-LD events...');
  const jsonLdEvents = extractJsonLdEvents(html);
  console.log(`   Found ${jsonLdEvents.length} JSON-LD events`);

  // Also check HTML for additional events
  console.log('🔍 Extracting HTML events...');
  const htmlEvents = extractHtmlEvents(html);
  console.log(`   Found ${htmlEvents.length} HTML events`);

  // Convert events to our format
  console.log('\n📝 Processing events...');
  const processedEvents = [];
  const seenNames = new Set();

  for (const event of jsonLdEvents) {
    const converted = convertJsonLdEvent(event);
    if (converted && !seenNames.has(converted.name + converted.eventDate)) {
      processedEvents.push(converted);
      seenNames.add(converted.name + converted.eventDate);
      console.log(`  ✓ ${converted.name.substring(0, 50)}${converted.name.length > 50 ? '...' : ''}`);
    }
  }

  console.log(`\n📊 Total events to save: ${processedEvents.length}`);

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, skipped, failed } = await saveEvents(processedEvents);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ PORT DISCOVERY SCRAPER COMPLETE`);
  console.log(`   Events found: ${processedEvents.length}`);
  console.log(`   Events saved: ${saved}`);
  console.log(`   Skipped (duplicates): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection
  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventsImported: saved,
      eventsSkipped: skipped,
      eventsFailed: failed,
      eventsFound: processedEvents.length,
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { imported: saved, skipped, failed };
}

/**
 * Cloud Function export
 */
async function scrapePortDiscoveryCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapePortDiscovery({ maxDays: 60 });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const fullMode = args.includes('--full');

  console.log(`\n🚀 Starting Port Discovery Scraper (${fullMode ? 'Full' : 'Test'} Mode)`);

  scrapePortDiscovery({ maxDays: fullMode ? 60 : 30 })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapePortDiscovery,
  scrapePortDiscoveryCloudFunction,
};
