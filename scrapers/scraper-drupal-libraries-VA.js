#!/usr/bin/env node

/**
 * VIRGINIA DRUPAL LIBRARIES SCRAPER
 *
 * Scrapes events from Virginia libraries using custom Drupal event systems
 * with AJAX-loaded event feeds
 *
 * COVERAGE (1 library system in VA):
 * - Handley Regional Library (Winchester, VA) - 90,000 population
 *
 * Usage:
 *   node scripts/Scraper-event-drupal-virginia.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using Custom Drupal (LibraryCalendar platform)
const LIBRARY_SYSTEMS = [
  {
    name: 'Handley Regional Library',
    url: 'https://www.handleyregional.org/events/upcoming',  // Use upcoming list view, not week grid
    county: 'Frederick',
    state: 'VA',
    website: 'https://www.handleyregional.org',
    city: 'Winchester',
    zipCode: '22601',
    address: '100 W Piccadilly St, Winchester, VA 22601'  // Main library address
  }
];

// Cache geocoded addresses to avoid re-querying same location
const geocodeCache = {};
let lastGeocodeTime = 0;

// Geocode address with rate limiting (1 req/sec max for Nominatim)
async function geocodeAddress(address) {
  // Check cache first
  if (geocodeCache[address]) {
    return geocodeCache[address];
  }

  try {
    // Rate limit: wait 1 second between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastGeocodeTime;
    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
    }
    lastGeocodeTime = Date.now();

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'us'
      },
      headers: {
        'User-Agent': 'FunHive/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const coordinates = {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
      // Cache the result
      geocodeCache[address] = coordinates;
      return coordinates;
    } else {
      console.log(`   ⚠️  Geocoding: No results for "${address}"`);
    }
  } catch (error) {
    console.error(`   ❌ Geocoding error for "${address}":`, error.message);
  }
  return null;
}

// Parse age range from audience text
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Drupal library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load (Drupal uses AJAX)
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Find all event entries by looking for h3 tags with event links
      // Handley uses LibraryCalendar and renders events as:
      // <h3><a href="/event/...">Event Title</a></h3>
      // followed by date/time info in sibling elements

      const eventLinks = document.querySelectorAll('a[href*="/event/"]');

      eventLinks.forEach(link => {
        try {
          const title = link.textContent.trim();
          if (!title || title.length < 3) return;

          // Skip non-event links like "View All Events"
          if (title.includes('View All') || title.includes('Register')) return;

          const url = link.href;

          // Extract date from aria-label attribute
          // Format: "View more about ... on Wednesday, January 21, 2026 @ 11:00am"
          const ariaLabel = link.getAttribute('aria-label') || '';
          let eventDate = '';
          let time = '';

          // Parse aria-label for date and time
          const ariaDateMatch = ariaLabel.match(/on\s+(?:\w+,\s+)?(\w+\s+\d{1,2},?\s+\d{4})\s*@?\s*(\d{1,2}:\d{2}\s*(?:am|pm))?/i);
          if (ariaDateMatch) {
            eventDate = ariaDateMatch[1]; // e.g., "January 21, 2026"
            time = ariaDateMatch[2] || ''; // e.g., "11:00am"
          }

          // Get the parent container for location/audience extraction
          let container = link.parentElement;
          while (container && container.tagName !== 'ARTICLE' && container.tagName !== 'SECTION' && container.tagName !== 'DIV') {
            container = container.parentElement;
          }
          if (!container) container = link.parentElement?.parentElement;

          const fullText = container ? container.textContent : '';

          // Fallback: extract date/time from container if aria-label didn't work
          if (!eventDate) {
            // Try "Mon DD YYYY Day" format first (e.g., "Jan 21 2026 Wed")
            let dateMatch = fullText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}(?:\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun))?/i);
            if (!dateMatch) {
              // Try "Day, Mon DD, YYYY" format (e.g., "Wed, Dec 3, 2025")
              dateMatch = fullText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i);
            }
            if (dateMatch) eventDate = dateMatch[0];
          }

          if (!time) {
            // Extract time - format: "10:30-11:00am" or "10:30am-12:00pm"
            const timeMatch = fullText.match(/\d{1,2}:\d{2}(?:\s*(?:am|pm))?\s*[-–]\s*\d{1,2}:\d{2}\s*(?:am|pm)/i) ||
                             fullText.match(/\d{1,2}:\d{2}\s*(?:am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location - often after the time
          let location = '';
          const locationMatch = fullText.match(/(?:at|@)\s+([A-Za-z\s]+(?:Library|Branch))/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Extract age group from data attribute or text
          let audience = '';
          const ageMatch = fullText.match(/(?:All Ages|Adults|Teens?|Children|Kids|Toddlers?|Baby|Babies|Preschool|School.?Age)/i);
          if (ageMatch) audience = ageMatch[0];

          if (title && (eventDate || time)) {
            const rawDate = eventDate && time ? `${eventDate} ${time}` : (eventDate || time);

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: '',
              url: url,
              audience: audience
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      // Deduplicate by title+date
      const seen = new Set();
      return results.filter(evt => {
        const key = `${evt.name}|${evt.eventDate}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description and audience
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Geocode library address (use event venue or library address as fallback)
        const address = event.venue && event.venue.trim()
          ? `${event.venue}, ${library.city}, ${library.county} County, ${library.state}`
          : library.address || `${library.name}, ${library.city}, ${library.state}`;

        const coordinates = await geocodeAddress(address);

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Parse date to get Date object for Timestamp
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.audience || '',
          state: library.state,  // Top-level state field for queries
          city: library.city,
          zipCode: library.zipCode,
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'Virginia Drupal Scraper',
            sourceName: library.name,
            county: library.county,
            state: library.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Add geohash if we have coordinates
        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', library.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeDrupalVirginiaLibraries() {
  console.log('\n📚 VIRGINIA DRUPAL LIBRARIES SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 1 library in VA\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('Drupal-VA', 'events', {
    state: 'VA',
    source: 'drupal'
  });

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      // Start tracking this site
      logger.startSite(library.name, library.url, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);

        // Track per-site stats (updates both site AND aggregate totals)
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  // Log to Firestore with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Cloud Function wrapper
async function scrapeDrupalVirginiaLibrariesCloudFunction() {
  console.log('\n📚 Virginia Drupal Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const result = await scrapeDrupalVirginiaLibraries();

    return {
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      message: 'Virginia Drupal libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in Virginia Drupal scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeDrupalVirginiaLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeDrupalVirginiaLibraries, scrapeDrupalVirginiaLibrariesCloudFunction };
