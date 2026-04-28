#!/usr/bin/env node

/**
 * PRINCE GEORGE'S COUNTY PARKS SCRAPER (Maryland)
 *
 * Scrapes family events from PG Parks & Recreation
 * Platform: WordPress with The Events Calendar (Tribe Events)
 * Coverage: Prince George's County, Maryland (~900,000+ residents)
 *
 * Data Source: https://pgparks.com/activities-events-events
 * Estimated Events: 50-100+ per month
 *
 * Usage:
 *   node scraper-pgparks-md.js          # Test mode (first 50 events)
 *   node scraper-pgparks-md.js --full   # Full mode (all events)
 *
 * Cloud Function: scheduledPGParksMD
 * Schedule: Every 3 days
 */

const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

const SCRAPER_NAME = 'PGParks-MD';
const BASE_URL = 'https://pgparks.com';
const CALENDAR_URL = `${BASE_URL}/activities-events-events`;

// Maximum days in future to scrape
const MAX_DAYS_AHEAD = 60;

// PG County center coordinates
const PG_COUNTY_CENTER = {
  latitude: 38.8286,
  longitude: -76.8453,
};

// Common PG Parks locations
const PARK_LOCATIONS = {
  'Watkins Regional Park': { lat: 38.8872, lng: -76.8308, city: 'Upper Marlboro', zip: '20774' },
  'Lake Artemesia': { lat: 38.9842, lng: -76.9342, city: 'College Park', zip: '20740' },
  'Riversdale House Museum': { lat: 38.9536, lng: -76.9389, city: 'Riverdale Park', zip: '20737' },
  'Bladensburg Waterfront Park': { lat: 38.9397, lng: -76.9347, city: 'Bladensburg', zip: '20710' },
  'Allen Pond Park': { lat: 38.9575, lng: -76.7289, city: 'Bowie', zip: '20716' },
  'Tucker Road Ice Rink': { lat: 38.8014, lng: -76.8886, city: 'Fort Washington', zip: '20744' },
  'Prince George\'s Sports and Learning Complex': { lat: 38.8583, lng: -76.9003, city: 'Landover', zip: '20785' },
  'Fairland Regional Park': { lat: 39.0614, lng: -76.9256, city: 'Laurel', zip: '20708' },
  'Walker Mill Regional Park': { lat: 38.8731, lng: -76.8722, city: 'Capitol Heights', zip: '20743' },
  'Cosca Regional Park': { lat: 38.7256, lng: -76.8975, city: 'Clinton', zip: '20735' },
};

/**
 * Get coordinates for a park/venue
 */
function getLocationCoordinates(venueName) {
  if (!venueName) return PG_COUNTY_CENTER;

  const lowerVenue = venueName.toLowerCase();
  for (const [parkName, coords] of Object.entries(PARK_LOCATIONS)) {
    if (lowerVenue.includes(parkName.toLowerCase()) || parkName.toLowerCase().includes(lowerVenue)) {
      return { latitude: coords.lat, longitude: coords.lng, city: coords.city, zip: coords.zip };
    }
  }

  return PG_COUNTY_CENTER;
}

// Browser launch handled by puppeteer-config.js

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
 * Fetch events using Puppeteer (site loads via JavaScript)
 */
async function fetchEvents(maxEvents = 100) {
  console.log(`\n📅 Fetching events from: ${CALENDAR_URL}`);

  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to the calendar page
    console.log('  Navigating to calendar page...');
    await page.goto(CALENDAR_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for events to load
    await page.waitForSelector('article, .tribe-events-calendar-list__event, .tribe-common-g-row, article[class*="event"], .event-card, [class*="event-item"]', { timeout: 15000 }).catch(() => {
      console.log('  ⚠️ No standard event selectors found, checking for other content...');
    });

    // Give extra time for JS rendering
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    const rawEvents = await page.evaluate((baseUrl, maxEventsLimit) => {
      const events = [];

      // Try multiple selector strategies for Tribe Events and WordPress calendars
      const eventSelectors = [
        'article',  // Photo view layout (bare article elements)
        '.tribe-events-calendar-list__event',
        '.tribe-common-g-row.tribe-events-calendar-list__event-row',
        'article.tribe-events-calendar-list__event-row',
        '.tribe-events-list-event',
        '.event-card',
        '[class*="event-item"]',
        '.wp-block-tribe-events-event-datetime',
        'article[class*="event"]'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          eventElements = Array.from(found);
          console.log(`Found ${found.length} events with selector: ${selector}`);
          break;
        }
      }

      // If still no events, try parsing from JSON-LD structured data
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type'] === 'Event' || (Array.isArray(data) && data[0]?.['@type'] === 'Event')) {
            const eventData = Array.isArray(data) ? data : [data];
            eventData.forEach(e => {
              if (e['@type'] === 'Event' && e.name) {
                events.push({
                  title: e.name,
                  link: e.url || window.location.href,
                  dateText: e.startDate || '',
                  timeText: '',
                  venue: e.location?.name || '',
                  description: e.description || '',
                });
              }
            });
          }
        } catch (err) {}
      });

      // Parse found elements
      eventElements.slice(0, maxEventsLimit).forEach(el => {
        try {
          // Title
          const titleEl = el.querySelector('.tribe-events-pro-photo__event-title-link, .tribe-events-pro-photo__event-title a, .tribe-events-calendar-list__event-title a, .tribe-events-list-event-title a, h3 a, h2 a, .event-title a, a[class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 3) return;

          // Link
          let link = titleEl?.href || '';
          if (link && !link.startsWith('http')) {
            link = baseUrl + link;
          }

          // Date
          const dateEl = el.querySelector('.tribe-events-pro-photo__event-date-tag-datetime, .tribe-events-pro-photo__event-datetime, .tribe-events-calendar-list__event-datetime, time, .tribe-event-date-start, [datetime], .event-date');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';

          // Venue
          const venueEl = el.querySelector('.tribe-events-pro-photo__event-venue, .tribe-events-calendar-list__event-venue, .tribe-events-venue, .tribe-venue, .event-venue, .location');
          const venue = venueEl?.textContent?.trim() || '';

          // Description
          const descEl = el.querySelector('.event-summary, .tribe-events-calendar-list__event-description, .tribe-events-list-event-description, .event-description, p');
          const description = (descEl?.textContent?.trim() || '').substring(0, 500);

          // Time
          const timeEl = el.querySelector('.tribe-events-pro-photo__event-datetime, .tribe-events-calendar-list__event-datetime-time, .tribe-event-time, .event-time');
          const timeText = timeEl?.textContent?.trim() || '';

          events.push({
            title,
            link,
            dateText,
            timeText,
            venue,
            description,
          });
        } catch (err) {}
      });

      return events;
    }, BASE_URL, maxEvents);

    console.log(`  Found ${rawEvents.length} raw events`);

    // Process and filter events
    for (const raw of rawEvents) {
      if (events.length >= maxEvents) break;

      let eventDate = null;
      if (raw.dateText) {
        eventDate = new Date(raw.dateText);
        if (isNaN(eventDate.getTime())) {
          // Try parsing various date formats
          const datePatterns = [
            /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,  // January 15, 2025
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // 01/15/2025
          ];
          for (const pattern of datePatterns) {
            const match = raw.dateText.match(pattern);
            if (match) {
              const parsed = Date.parse(raw.dateText);
              if (!isNaN(parsed)) {
                eventDate = new Date(parsed);
                break;
              }
            }
          }
        }
      }

      // Skip if no valid date or outside range
      if (!eventDate || isNaN(eventDate.getTime())) continue;
      if (eventDate < today || eventDate > maxDate) continue;

      events.push({
        title: raw.title,
        link: raw.link,
        eventDate,
        dateText: raw.dateText,
        timeText: raw.timeText,
        venue: raw.venue,
        description: raw.description,
        fullText: `${raw.title} ${raw.description}`,
      });
    }

    console.log(`  Total valid events: ${events.length}`);
    return events;

  } catch (error) {
    console.log(`  ⚠️ Error fetching events: ${error.message}`);
    return events;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Save events to database
 */
async function saveEvents(events) {
  if (events.length === 0) return { saved: 0, failed: 0 };

  let saved = 0, failed = 0;
  const batchSize = 500;

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = db.batch();
    const batchEvents = events.slice(i, i + batchSize);

    for (const event of batchEvents) {
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
      failed += batchEvents.length;
      saved -= batchEvents.length;
    }
  }

  return { saved, failed };
}

/**
 * Main scraper function
 */
async function scrapePGParks(options = {}) {
  const { maxEvents = 100, testMode = false } = options;

  console.log(`\n🏞️  PRINCE GEORGE'S COUNTY PARKS SCRAPER`);
  console.log(`📍 Coverage: Prince George's County, Maryland`);
  console.log(`📄 Max events: ${maxEvents}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  const rawEvents = await fetchEvents(maxEvents);

  // Process events
  const processedEvents = [];

  for (const raw of rawEvents) {
    // Get coordinates
    let coords = getLocationCoordinates(raw.venue);
    if (coords === PG_COUNTY_CENTER && raw.venue) {
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
      description: raw.description || '',
      venue: raw.venue || 'PG Parks',
      address: '',
      city: coords.city || 'Upper Marlboro',
      state: 'MD',
      zipCode: coords.zip || '',
      location: {
        latitude: coords.latitude || PG_COUNTY_CENTER.latitude,
        longitude: coords.longitude || PG_COUNTY_CENTER.longitude,
      },
      geohash: ngeohash.encode(
        coords.latitude || PG_COUNTY_CENTER.latitude,
        coords.longitude || PG_COUNTY_CENTER.longitude,
        7
      ),
      ageRange: parseAgeRange(raw.fullText),
      cost: parseCost(raw.fullText),
      parentCategory,
      displayCategory,
      subcategory,
      url: raw.link || CALENDAR_URL,
      imageUrl: '',
      metadata: {
        sourceName: 'PG Parks & Recreation',
        sourceUrl: BASE_URL,
        scrapedAt: new Date().toISOString(),
        scraperName: SCRAPER_NAME,
        platform: 'tribe-events',
        state: 'MD',
        county: 'Prince Georges',
        addedDate: new Date().toISOString(),
      },
    };

    processedEvents.push(event);

    // Rate limiting for geocoding
    if (coords === PG_COUNTY_CENTER) {
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

  // Log to scraperLogs collection (standardized format)
  try {
    await db.collection('scraperLogs').add({
      scraperName: 'PGParks-MD',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      stats: {
        found: rawEvents.length,
        new: saved,
        duplicates: 0,
        errors: failed
      },
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { imported: saved, failed, total: processedEvents.length };
}

/**
 * Cloud Function export
 */
async function scrapePGParksCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapePGParks({ maxEvents: 150, testMode: false });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const fullMode = args.includes('--full');
  const maxEvents = fullMode ? 150 : 50;

  console.log(`\n🚀 Starting PG Parks Scraper (${fullMode ? 'Full' : 'Test'} Mode)`);

  scrapePGParks({ maxEvents, testMode: !fullMode })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapePGParks,
  scrapePGParksCloudFunction,
};
