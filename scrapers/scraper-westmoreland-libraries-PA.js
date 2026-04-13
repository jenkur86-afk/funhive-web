/**
 * WESTMORELAND COUNTY LIBRARIES SCRAPER
 *
 * Scrapes events from Westmoreland Library Network
 * Uses Evanced Solutions (Legacy ASP.NET Event Management System)
 *
 * COVERAGE:
 * - Westmoreland County, PA - 350,000 population
 * - 23 public libraries in the Westmoreland Library Network
 *
 * PLATFORM: Evanced Solutions (Legacy ASP.NET)
 * - Server-side rendered event calendar
 * - Form-based navigation system
 * - Table-based event listings
 * - Calendar and list view options
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
// NOTE: Website migrated from events.wlnonline.org to wclibraries.org in 2025
// Platform changed from Evanced Solutions to The Events Calendar (WordPress)
const LIBRARY = {
  name: 'Westmoreland Library Network',
  baseUrl: 'https://www.wclibraries.org/events/',
  listUrl: 'https://www.wclibraries.org/events/list/',
  county: 'Westmoreland',
  state: 'PA',
  website: 'https://www.wclibraries.org',
  city: 'Greensburg',
  zipCode: '15601'
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

// Scrape events from the page using The Events Calendar (WordPress) selectors
async function scrapeEvents(page) {
  try {
    // Use the list view for easier parsing
    await page.goto(LIBRARY.listUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from The Events Calendar (WordPress plugin)
    const events = await page.evaluate(() => {
      const results = [];

      // The Events Calendar list view selectors
      const eventArticles = document.querySelectorAll('.tribe-events-calendar-list__event, article.tribe-events-calendar-list__event-row, .tribe-common-g-row');

      if (eventArticles.length === 0) {
        // Fallback: try month view event links
        const monthLinks = document.querySelectorAll('a.tribe-events-calendar-month__calendar-event-title-link, a[href*="/event/"]');
        monthLinks.forEach(link => {
          const title = link.textContent.trim();
          const url = link.href;
          if (title && title.length > 3 && url.includes('/event/')) {
            results.push({
              title: title,
              url: url,
              date: '',
              time: '',
              location: '',
              description: '',
              ageInfo: ''
            });
          }
        });
        return results;
      }

      eventArticles.forEach(article => {
        try {
          // Extract title - The Events Calendar uses specific title class
          let title = '';
          const titleEl = article.querySelector('.tribe-events-calendar-list__event-title a, .tribe-events-calendar-list__event-title, h3 a');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }

          if (!title || title.length < 3) return;

          // Extract URL
          let url = '';
          const linkEl = article.querySelector('a[href*="/event/"]');
          if (linkEl) {
            url = linkEl.href;
          }

          // Extract date from datetime attribute or text
          let dateText = '';
          const dateEl = article.querySelector('.tribe-events-calendar-list__event-datetime, time, .tribe-event-date-start');
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }

          // Extract time
          let timeText = '';
          const timeEl = article.querySelector('.tribe-event-time, .tribe-events-calendar-list__event-datetime');
          if (timeEl) {
            const timeMatch = timeEl.textContent.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
            if (timeMatch) timeText = timeMatch[0];
          }

          // Extract venue/location
          let location = '';
          const venueEl = article.querySelector('.tribe-events-calendar-list__event-venue, .tribe-events-venue, .tribe-event-location');
          if (venueEl) {
            location = venueEl.textContent.trim();
          }

          // Extract description
          let description = '';
          const descEl = article.querySelector('.tribe-events-calendar-list__event-description, .tribe-events-content p');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Age info from title or description
          let ageInfo = '';
          const fullText = (title + ' ' + description).toLowerCase();
          if (fullText.match(/baby|babies|infant/)) ageInfo = 'babies';
          else if (fullText.match(/toddler/)) ageInfo = 'toddlers';
          else if (fullText.match(/preschool/)) ageInfo = 'preschool';
          else if (fullText.match(/children|kids|child/)) ageInfo = 'children';
          else if (fullText.match(/teen|tween/)) ageInfo = 'teens';
          else if (fullText.match(/family|families|all ages/)) ageInfo = 'all ages';

          results.push({
            title: title,
            url: url,
            date: dateText,
            time: timeText,
            location: location,
            description: description,
            ageInfo: ageInfo
          });
        } catch (err) {
          console.error('Error parsing event:', err);
        }
      });

      return results;
    });

    return events;

  } catch (error) {
    console.error(`Error scraping Westmoreland events:`, error.message);
    return [];
  }
}

// Main scraper function
async function scrapeWestmorelandLibrary() {
  console.log('\n📚 WESTMORELAND COUNTY LIBRARIES SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: Westmoreland County, PA (350K population)\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('   Scraping Evanced Solutions calendar...');

    const events = await scrapeEvents(page);
    console.log(`   Found ${events.length} events`);

    // Process events
    for (const event of events) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.description + ' ' + event.ageInfo);

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

        // Geocode library address (all events at same library)
        // Clean location string: remove newlines, extra whitespace, and duplicate info
        const cleanLocation = event.location
          ? event.location.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim()
          : '';

        // Extract just the address portion (after library name if present)
        let addressForGeocode;
        if (cleanLocation) {
          // If location contains both library name and address, use just the address part
          // Example: "Delmont Public Library 75 School Rd, Delmont, PA, United States"
          const addressMatch = cleanLocation.match(/\d+\s+[^,]+,\s*[^,]+,\s*PA/i);
          if (addressMatch) {
            addressForGeocode = addressMatch[0];
          } else {
            addressForGeocode = `${cleanLocation}, ${LIBRARY.state}`;
          }
        } else {
          addressForGeocode = `${LIBRARY.name}, ${LIBRARY.city}, ${LIBRARY.state}`;
        }
        const address = addressForGeocode;

        const coordinates = await geocodeAddress(address);

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
          venue: cleanLocation || LIBRARY.name,
          eventDate: normalizedDate,
          scheduleDescription: event.time ? `${event.date} ${event.time}` : event.date,
          state: LIBRARY.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.ageInfo || '',
          location: {
            name: cleanLocation || LIBRARY.name,
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
            source: 'Westmoreland Library Scraper',
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
    console.error(`  ❌ Error scraping Westmoreland Library:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ WESTMORELAND COUNTY LIBRARIES SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Westmoreland Library Network', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeWestmorelandLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeWestmorelandLibrary };
