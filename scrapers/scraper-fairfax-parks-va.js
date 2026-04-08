#!/usr/bin/env node

/**
 * FAIRFAX COUNTY PARKS SCRAPER (Virginia)
 *
 * Scrapes family events from Fairfax County Park Authority
 * Platform: Drupal with Views AJAX API
 * Coverage: Fairfax County, Virginia (~1.1 million residents)
 *
 * Data Source: https://www.fairfaxcounty.gov/parks/events-calendar
 * Estimated Events: 100-200+ per month
 *
 * Usage:
 *   node scraper-fairfax-parks-va.js          # Test mode (first 50 events)
 *   node scraper-fairfax-parks-va.js --full   # Full mode (all events)
 *
 * Cloud Function: scheduledFairfaxParksVA
 * Schedule: Every 3 days
 */

const axios = require('axios');
const cheerio = require('cheerio');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

const SCRAPER_NAME = 'FairfaxParks-VA';
const BASE_URL = 'https://www.fairfaxcounty.gov';
const CALENDAR_URL = `${BASE_URL}/parks/events-calendar`;

// Maximum days in future to scrape (Cloud Functions have timeout limits)
const MAX_DAYS_AHEAD = 60;

// Fairfax County center coordinates
const FAIRFAX_COUNTY_CENTER = {
  latitude: 38.8462,
  longitude: -77.3064,
};

// Common Fairfax County park locations
const PARK_LOCATIONS = {
  'Hidden Oaks Nature Center': { lat: 38.8619, lng: -77.2414, city: 'Annandale', zip: '22003' },
  'Lake Fairfax Park': { lat: 38.9562, lng: -77.3128, city: 'Reston', zip: '20190' },
  'Frying Pan Farm Park': { lat: 38.9264, lng: -77.3533, city: 'Herndon', zip: '20170' },
  'Burke Lake Park': { lat: 38.7628, lng: -77.2969, city: 'Fairfax Station', zip: '22039' },
  'Colvin Run Mill': { lat: 38.9500, lng: -77.2906, city: 'Great Falls', zip: '22066' },
  'Riverbend Park': { lat: 38.9686, lng: -77.2528, city: 'Great Falls', zip: '22066' },
  'Ellanor C. Lawrence Park': { lat: 38.8361, lng: -77.4442, city: 'Chantilly', zip: '20151' },
  'Huntley Meadows Park': { lat: 38.7564, lng: -77.1008, city: 'Alexandria', zip: '22306' },
  'Sully Historic Site': { lat: 38.9292, lng: -77.4428, city: 'Chantilly', zip: '20151' },
  'Green Spring Gardens': { lat: 38.8208, lng: -77.1664, city: 'Alexandria', zip: '22312' },
  'Cub Run RECenter': { lat: 38.8208, lng: -77.4294, city: 'Chantilly', zip: '20151' },
  'Spring Hill RECenter': { lat: 38.9350, lng: -77.2011, city: 'McLean', zip: '22102' },
  'Lee District RECenter': { lat: 38.7978, lng: -77.1208, city: 'Alexandria', zip: '22303' },
  'Providence RECenter': { lat: 38.8392, lng: -77.2825, city: 'Fairfax', zip: '22030' },
  'South Run RECenter': { lat: 38.7356, lng: -77.2656, city: 'Springfield', zip: '22153' },
  'Mount Vernon RECenter': { lat: 38.7175, lng: -77.0969, city: 'Alexandria', zip: '22309' },
  'Oak Marr RECenter': { lat: 38.8881, lng: -77.2761, city: 'Oakton', zip: '22124' },
  'Audrey Moore RECenter': { lat: 38.7614, lng: -77.1700, city: 'Annandale', zip: '22003' },
};

/**
 * Get coordinates for a park/venue
 */
function getLocationCoordinates(venueName) {
  if (!venueName) return FAIRFAX_COUNTY_CENTER;

  const lowerVenue = venueName.toLowerCase();
  for (const [parkName, coords] of Object.entries(PARK_LOCATIONS)) {
    if (lowerVenue.includes(parkName.toLowerCase()) || parkName.toLowerCase().includes(lowerVenue)) {
      return { latitude: coords.lat, longitude: coords.lng, city: coords.city, zip: coords.zip };
    }
  }

  return FAIRFAX_COUNTY_CENTER;
}

/**
 * Geocode an address using Nominatim
 */
async function geocodeAddress(address) {
  if (!address) return null;

  try {
    const query = `${address}, Fairfax County, VA`;
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'FunHive/1.0' },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
      };
    }
  } catch (error) {}

  return null;
}

/**
 * Parse age range from event text
 */
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lower = text.toLowerCase();

  // Look for specific age patterns
  const ageMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(yrs?|years?)?/i);
  if (ageMatch) {
    const minAge = parseInt(ageMatch[1]);
    const maxAge = parseInt(ageMatch[2]);
    if (minAge <= 3) return 'Toddlers (1-3)';
    if (minAge <= 5 && maxAge <= 6) return 'Preschool (3-5)';
    if (maxAge <= 12) return 'Elementary (6-12)';
    if (maxAge <= 18) return 'Teens';
    return `${minAge}-${maxAge} years`;
  }

  // Check for age range patterns like "3-Adult"
  if (text.match(/(\d+)\s*[-–]\s*adult/i)) {
    const min = parseInt(text.match(/(\d+)/)[1]);
    if (min <= 3) return 'All Ages';
    if (min <= 5) return 'Preschool & Up';
    return `${min}+ years`;
  }

  // Keyword matching
  if (lower.includes('adult') && !lower.includes('family')) return 'Adults';
  if (lower.includes('senior')) return 'Seniors';
  if (lower.includes('teen')) return 'Teens';
  if (lower.includes('family') || lower.includes('all ages')) return 'All Ages';
  if (lower.includes('toddler')) return 'Toddlers (1-3)';
  if (lower.includes('preschool')) return 'Preschool (3-5)';
  if (lower.includes('kid') || lower.includes('child')) return 'Children';

  return 'All Ages';
}

/**
 * Parse cost from event text
 */
function parseCost(text) {
  if (!text) return 'See website';

  const lower = text.toLowerCase();
  if (lower.includes('free')) return 'Free';

  // Look for dollar amounts
  const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) return `$${priceMatch[1]}`;

  return 'See website';
}

/**
 * Parse date from text like "Dec 06" or "December 6"
 */
function parseDateFromText(dateText, currentYear) {
  if (!dateText) return null;

  // Try "Dec 06" or "Dec 6" format
  const shortMatch = dateText.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i);
  if (shortMatch) {
    const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const month = monthMap[shortMatch[1].toLowerCase()];
    const day = parseInt(shortMatch[2]);
    const date = new Date(currentYear, month, day);
    // If month is in the past, it's probably next year
    const now = new Date();
    if (date < now && month < now.getMonth()) {
      date.setFullYear(currentYear + 1);
    }
    return date;
  }

  // Try standard date parsing
  const parsed = new Date(dateText);
  if (!isNaN(parsed)) return parsed;

  return null;
}

/**
 * Fetch events from a single page
 */
async function fetchPage(pageNum = 0) {
  const url = pageNum === 0 ? CALENDAR_URL : `${CALENDAR_URL}?page=${pageNum}`;

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 30000,
  });

  return response.data;
}

/**
 * Fetch events from the calendar page (with pagination)
 */
async function fetchEvents() {
  console.log(`\n📅 Fetching events from: ${CALENDAR_URL}`);

  const events = [];
  const currentYear = new Date().getFullYear();
  const maxPages = 20; // Safety limit - fetch up to 20 pages
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

  try {
    for (let page = 0; page < maxPages; page++) {
      console.log(`  Fetching page ${page + 1}...`);
      const html = await fetchPage(page);
      const $ = cheerio.load(html);

      // Parse event listings using Fairfax County's actual structure
      const eventElements = $('.events-list.views-row');
      console.log(`    Found ${eventElements.length} events on page ${page + 1}`);

      // No more events - stop paginating
      if (eventElements.length === 0) {
        console.log('    No more events, stopping pagination');
        break;
      }

      let pageEvents = 0;
      eventElements.each((i, el) => {
        const $el = $(el);

        // Extract date from .date div (contains "Nov<br>30" format)
        const dateEl = $el.find('.date');
        const dateHtml = dateEl.html() || '';
        const dateMatch = dateHtml.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(?:<br\s*\/?>)?\s*(\d{1,2})/i);

        let eventDate = null;
        let dateText = '';
        if (dateMatch) {
          dateText = `${dateMatch[1]} ${dateMatch[2]}`;
          eventDate = parseDateFromText(dateText, currentYear);
        }

        // Skip if no valid date or outside our range
        if (!eventDate || eventDate < today || eventDate > maxDate) return;

        // Extract title from .calendar-title a
        const titleEl = $el.find('.calendar-title a').first();
        const title = titleEl.text().trim();
        if (!title || title.length < 3) return;

        // Extract link
        let link = titleEl.attr('href') || '';
        if (link && !link.startsWith('http')) {
          link = `${BASE_URL}${link}`;
        }

        // Extract description from .calendar-description
        const descEl = $el.find('.calendar-description');
        const descText = descEl.text().trim() || '';

        // Parse time from description (e.g., "3:00PM, (4-Adult) ...")
        let timeText = '';
        const timeMatch = descText.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (timeMatch) timeText = timeMatch[1];

        // Parse age range from description
        const ageText = parseAgeRange(descText);

        // Skip adult-only events (but keep "4-Adult" which means family-friendly)
        if (ageText === 'Adults' || ageText === 'Seniors') return;

        // Try to find park name from link path
        let venue = '';
        const linkPath = link.toLowerCase();
        for (const parkName of Object.keys(PARK_LOCATIONS)) {
          const parkSlug = parkName.toLowerCase().replace(/\s+/g, '-');
          if (linkPath.includes(parkSlug) || linkPath.includes(parkSlug.replace(/-/g, ''))) {
            venue = parkName;
            break;
          }
        }
        // Also check common link patterns
        if (!venue) {
          if (linkPath.includes('hidden-oaks')) venue = 'Hidden Oaks Nature Center';
          else if (linkPath.includes('huntley-meadows')) venue = 'Huntley Meadows Park';
          else if (linkPath.includes('riverbend')) venue = 'Riverbend Park';
          else if (linkPath.includes('lake-fairfax')) venue = 'Lake Fairfax Park';
          else if (linkPath.includes('frying-pan')) venue = 'Frying Pan Farm Park';
          else if (linkPath.includes('burke-lake')) venue = 'Burke Lake Park';
          else if (linkPath.includes('colvin-run')) venue = 'Colvin Run Mill';
          else if (linkPath.includes('ellanor')) venue = 'Ellanor C. Lawrence Park';
          else if (linkPath.includes('sully')) venue = 'Sully Historic Site';
          else if (linkPath.includes('green-spring')) venue = 'Green Spring Gardens';
        }

        // Clean description (remove time and age range prefix)
        let description = descText.replace(/^\d{1,2}:\d{2}\s*(?:AM|PM),?\s*/i, '')
                                  .replace(/^\([^)]+\)\s*/, '')
                                  .trim()
                                  .substring(0, 500);

        events.push({
          title,
          link,
          dateText,
          eventDate,
          timeText,
          venue,
          description,
          ageText,
          fullText: `${title} ${descText}`,
        });
        pageEvents++;
      });

      console.log(`    Added ${pageEvents} events (total: ${events.length})`);

      // Rate limiting between pages
      if (page < maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`  Total parsed: ${events.length} valid events`);
    return events;

  } catch (error) {
    console.log(`  ⚠️ Error fetching events: ${error.message}`);
    return events; // Return what we have so far
  }
}

/**
 * Save events to Firestore
 */
async function saveEvents(events) {
  if (events.length === 0) return { saved: 0, failed: 0 };

  const batch = db.batch();
  let saved = 0, failed = 0;

  for (const event of events) {
    try {
      const eventId = generateEventId(event.url);
      const docRef = db.collection('events').doc(eventId);
      batch.set(docRef, event, { merge: true });
      saved++;
    } catch (error) {
      failed++;
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Batch commit error:', error.message);
    failed = events.length;
    saved = 0;
  }

  return { saved, failed };
}

/**
 * Main scraper function
 */
async function scrapeFairfaxParks(options = {}) {
  const { testMode = false } = options;

  console.log(`\n🏞️  FAIRFAX COUNTY PARKS SCRAPER`);
  console.log(`📍 Coverage: Fairfax County, Virginia`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  const rawEvents = await fetchEvents();

  // Process events
  const processedEvents = [];

  for (const raw of rawEvents) {
    // Get coordinates
    let coords = getLocationCoordinates(raw.venue);
    if (coords === FAIRFAX_COUNTY_CENTER && raw.venue) {
      const geocoded = await geocodeAddress(raw.venue);
      if (geocoded) coords = geocoded;
    }

    // Categorize
    const { parentCategory, displayCategory, subcategory } = categorizeEvent({
      name: raw.title,
      description: raw.description,
    });

    const event = {
      name: raw.title,
      eventDate: raw.eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      startTime: raw.timeText || '',
      endTime: '',
      description: raw.description,
      venue: raw.venue || 'Fairfax County Parks',
      address: '',
      city: coords.city || 'Fairfax',
      state: 'VA',
      zipCode: coords.zip || '',
      location: {
        latitude: coords.latitude || FAIRFAX_COUNTY_CENTER.latitude,
        longitude: coords.longitude || FAIRFAX_COUNTY_CENTER.longitude,
      },
      geohash: ngeohash.encode(
        coords.latitude || FAIRFAX_COUNTY_CENTER.latitude,
        coords.longitude || FAIRFAX_COUNTY_CENTER.longitude,
        7
      ),
      ageRange: raw.ageText || 'All Ages',
      cost: parseCost(raw.fullText),
      parentCategory,
      displayCategory,
      subcategory,
      url: raw.link || CALENDAR_URL,
      imageUrl: '',
      metadata: {
        sourceName: 'Fairfax County Parks',
        sourceUrl: BASE_URL,
        scrapedAt: new Date().toISOString(),
        scraperName: SCRAPER_NAME,
        platform: 'drupal',
        state: 'VA',
        county: 'Fairfax',
        addedDate: new Date().toISOString(),
      },
    };

    processedEvents.push(event);

    // Rate limiting for geocoding
    if (coords === FAIRFAX_COUNTY_CENTER) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n📊 SAVING TO FIRESTORE`);
  console.log('-'.repeat(40));

  const { saved, failed } = await saveEvents(processedEvents);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCRAPER COMPLETE`);
  console.log(`   Events found: ${rawEvents.length}`);
  console.log(`   Events processed: ${processedEvents.length}`);
  console.log(`   Events saved: ${saved}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection (legacy)
  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventsImported: saved,
      eventsFailed: failed,
      eventsFound: rawEvents.length,
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  // Log scraper stats to Firestore (standard format)
  await logScraperResult('FairfaxParks-VA', {
    found: rawEvents.length,
    new: saved,
    duplicates: rawEvents.length - saved - failed
  }, { dataType: 'events' });

  return { imported: saved, failed, total: processedEvents.length };
}

/**
 * Cloud Function export
 */
async function scrapeFairfaxParksCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeFairfaxParks({ testMode: false });
}

// Run if executed directly
if (require.main === module) {
  console.log(`\n🚀 Starting Fairfax Parks Scraper`);

  scrapeFairfaxParks({ testMode: false })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeFairfaxParks,
  scrapeFairfaxParksCloudFunction,
};
