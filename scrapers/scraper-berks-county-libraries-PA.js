/**
 * BERKS COUNTY PUBLIC LIBRARIES SCRAPER
 *
 * Scrapes events from Berks County Public Libraries (Reading, PA)
 * Uses Custom Drupal with embedded LibCal widget
 *
 * COVERAGE:
 * - Berks County, PA - 425,000 population
 * - 19 libraries across 23 locations
 *
 * PLATFORM: Custom Drupal with LibCal Widget (ID: nth05YUKc5)
 * - JavaScript-rendered event calendar
 * - Widget loads events dynamically
 * - Filterable by location, category, and age group
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Berks County Public Libraries',
  baseUrl: 'https://www.berkslibraries.org',
  eventsPath: '/events',
  county: 'Berks',
  state: 'PA',
  website: 'https://www.berkslibraries.org',
  city: 'Reading',
  zipCode: '19601',
  // Default coordinates for Reading, PA (used when no specific venue location)
  defaultCoordinates: {
    latitude: 40.3356,
    longitude: -75.9269
  }
};

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

// Parse age range from text
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  // Skip adult-only events
  if (lowerText.match(/adults? only/i) || lowerText.match(/\b18\+/i) || lowerText.match(/\b21\+/i)) {
    return 'Adults';
  }

  // Check for age indicators
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages/i)) return 'All Ages';

  // Look for specific age mentions
  const ageMatch = lowerText.match(/ages?\s+(\d+)/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age <= 2) return 'Babies & Toddlers (0-2)';
    if (age <= 5) return 'Preschool (3-5)';
    if (age <= 12) return 'Children (6-12)';
    if (age <= 17) return 'Teens (13-17)';
    return 'Adults';
  }

  return 'All Ages';
}

// Scrape events from LibraryHippo (LH) calendar widget
async function scrapeEvents(page) {
  // Page redirects to /events-classes
  const url = `${LIBRARY.baseUrl}/events-classes`;

  try {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Wait for LibraryHippo (LH) calendar widget to load
    console.log('   Waiting for LH calendar widget to load...');

    // Try to wait for LH calendar grid
    try {
      await page.waitForSelector('.lh-calendar-grid, .lh-calendar-grid__day', {
        timeout: 15000
      });
      console.log('   LH Calendar grid detected!');
    } catch (e) {
      console.log('   LH Calendar not found, waiting additional time...');
    }

    // Additional wait for events to populate
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to find any events on the page using LibraryHippo calendar structure
    const events = await page.evaluate(() => {
      const results = [];
      const processedEvents = new Set();

      // LibraryHippo calendar - events are within day cells
      // Day number is in format "Monday, December1" in the .lh-calendar-grid__day-number
      const dayElements = document.querySelectorAll('.lh-calendar-grid__day');

      dayElements.forEach(dayEl => {
        // Get the date from the day-number element (format: "Monday, December16")
        const dayNumberEl = dayEl.querySelector('.lh-calendar-grid__day-number');
        const dayText = dayNumberEl?.textContent?.trim() || '';

        // Parse "Monday, December16" format - use [A-Za-z]+ for month to not capture digits
        const dateMatch = dayText.match(/(\w+),?\s*([A-Za-z]+)(\d{1,2})/);
        if (!dateMatch) return;

        const [, , month, day] = dateMatch;
        const year = new Date().getFullYear();
        // Handle year rollover (if month is before current month, it might be next year)
        const monthNum = new Date(`${month} 1, 2025`).getMonth();
        const currentMonth = new Date().getMonth();
        const eventYear = monthNum < currentMonth - 6 ? year + 1 : year;

        // Get events container
        const eventsContainer = dayEl.querySelector('.lh-calendar-grid__events');
        if (!eventsContainer) return;

        // Split by event entries - each line with time is an event
        const eventText = eventsContainer.textContent;
        // Match pattern: Event Name + Time (e.g., "Baby Lap Sit  9:30am - 10:00am")
        const eventMatches = eventText.match(/([^\d]+)\s+(\d{1,2}:\d{2}\s*(?:am|pm)\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))/gi);

        if (eventMatches) {
          eventMatches.forEach(match => {
            const parts = match.match(/(.+?)\s+(\d{1,2}:\d{2}\s*(?:am|pm)\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))/i);
            if (!parts) return;

            let [, title, time] = parts;
            title = title.trim().replace(/\s+/g, ' ');
            time = time.trim();

            // Skip non-events and "All Day" entries
            if (title.toLowerCase().includes('all day') ||
                title.toLowerCase().includes('closing') ||
                title.toLowerCase().includes('anything but') ||
                title.toLowerCase().includes('show past') ||
                title.length < 5) return;

            const dateText = `${month} ${day} ${eventYear}`;
            const eventKey = `${title}-${dateText}`;

            if (!processedEvents.has(eventKey)) {
              processedEvents.add(eventKey);
              results.push({
                title: title,
                url: '',
                date: dateText,
                time: time,
                location: '',
                description: '',
                categoryInfo: ''
              });
            }
          });
        }
      });

      return results;
    });

    return events;

  } catch (error) {
    console.error(`Error scraping Berks events:`, error.message);
    return [];
  }
}

// Main scraper function
async function scrapeBerksLibrary() {
  console.log('\n📚 BERKS COUNTY PUBLIC LIBRARIES SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: Berks County, PA (425K population)\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('   Scraping LibCal widget events...');

    const events = await scrapeEvents(page);
    console.log(`   Found ${events.length} events`);

    // Process events
    for (const event of events) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.description + ' ' + event.categoryInfo);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.title,
          description: event.description
        });

        // Get coordinates - only geocode if there's a specific venue location
        let coordinates = null;
        if (event.location && event.location.trim()) {
          // Try to geocode specific venue location
          const address = `${event.location}, Reading, PA`;
          coordinates = await geocodeAddress(address);
        }
        // Use default Reading, PA coordinates if no location or geocoding failed
        if (!coordinates) {
          coordinates = LIBRARY.defaultCoordinates;
        }

        // Normalize date format
        const rawDate = event.time ? `${event.date} ${event.time}` : event.date;
        const normalizedDate = normalizeDateString(rawDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${rawDate}"`);
          skipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: event.title,
          venue: event.location || LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: event.time ? `${event.date} ${event.time}` : event.date,
          state: LIBRARY.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: event.description.substring(0, 1000),
          moreInfo: event.categoryInfo || '',
          location: {
            name: event.location || LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Berks County Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
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
          .where('metadata.sourceName', '==', LIBRARY.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.title.substring(0, 50)}${event.title.length > 50 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping Berks Library:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ BERKS COUNTY PUBLIC LIBRARIES SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Berks County Public Libraries', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeBerksLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeBerksLibrary };
