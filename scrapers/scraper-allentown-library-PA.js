/**
 * ALLENTOWN PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Allentown Public Library (Lehigh County, PA)
 * Uses WordPress Events Manager plugin (different from The Events Calendar)
 *
 * COVERAGE:
 * - Lehigh County, PA - 375,000 population
 * - Allentown Public Library system
 *
 * PLATFORM: WordPress Events Manager Plugin v7.1.7
 * - Server-side rendered event listings with pagination
 * - 78+ pages of events
 * - Date format: MM/DD/YYYY HH:MM am/pm
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
  name: 'Allentown Public Library',
  baseUrl: 'https://www.allentownpl.org',
  eventsPath: '/events/',
  county: 'Lehigh',
  state: 'PA',
  website: 'https://www.allentownpl.org',
  city: 'Allentown',
  zipCode: '18101'
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

// Scrape events from a single page
async function scrapePage(page, pageNum) {
  const url = pageNum === 1
    ? `${LIBRARY.baseUrl}${LIBRARY.eventsPath}`
    : `${LIBRARY.baseUrl}${LIBRARY.eventsPath}page/${pageNum}/`;

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 5000 });

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // WordPress Events Manager selectors - try multiple patterns
      const selectors = [
        'article',
        '.event-item',
        '.wp-block-post',
        '[class*="event"]',
        '.entry'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Find title
          const titleEl = el.querySelector('h1, h2, h3, h4, .entry-title, .event-title, a');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Find event URL
          const linkEl = el.querySelector('a[href*="/events/"]');
          const eventUrl = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date/time - MM/DD/YYYY HH:MM am/pm format
          let eventDate = '';
          let eventTime = '';

          // Look for date patterns
          const dateMatch = fullText.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
          if (dateMatch) {
            eventDate = dateMatch[0];
          }

          // Look for time patterns
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))?/i);
          if (timeMatch) {
            eventTime = timeMatch[0];
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('p, .entry-content, .event-description, .excerpt');
          if (descEl) {
            description = descEl.textContent.trim();
          } else {
            // Use full text as fallback, truncated
            description = fullText.substring(0, 300);
          }

          // Extract location if available
          let location = '';
          const locationMatch = fullText.match(/(?:Location|Where|Venue):\s*([^\n]+)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          if (title && eventDate) {
            results.push({
              title: title,
              url: eventUrl,
              date: eventDate,
              time: eventTime,
              location: location,
              description: description
            });
          }
        } catch (err) {
          console.error('Error parsing event:', err);
        }
      });

      return results;
    });

    return events;

  } catch (error) {
    console.error(`Error scraping page ${pageNum}:`, error.message);
    return [];
  }
}

// Main scraper function
async function scrapeAllentownLibrary() {
  console.log('\n📚 ALLENTOWN PUBLIC LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: Lehigh County, PA (375K population)\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('   Scraping event pages...');

    // Scrape first page
    const firstPageEvents = await scrapePage(page, 1);
    console.log(`   Page 1: Found ${firstPageEvents.length} events`);

    // Process first page events
    for (const event of firstPageEvents) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.description);

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
        const address = event.location && event.location.trim()
          ? `${event.location}, Allentown, PA`
          : `${LIBRARY.name}, ${LIBRARY.city}, ${LIBRARY.state}`;

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
          venue: event.location || LIBRARY.name,
          state: LIBRARY.state,
          eventDate: normalizedDate,
          scheduleDescription: event.time ? `${event.date} ${event.time}` : event.date,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: event.description.substring(0, 1000),
          moreInfo: '',
          location: {
            name: event.location || LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates || null
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'Allentown Library Scraper',
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

    // Scrape additional pages (up to 30 pages to avoid overload)
    const maxPages = 30;
    for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
      const events = await scrapePage(page, pageNum);

      if (events.length === 0) {
        console.log(`   No more events found at page ${pageNum}. Stopping.`);
        break;
      }

      console.log(`   Page ${pageNum}: Found ${events.length} events`);

      for (const event of events) {
        try {
          const ageRange = parseAgeRange(event.description);

          if (ageRange === 'Adults') {
            skipped++;
            continue;
          }

          const { parentCategory, displayCategory, subcategory } = categorizeEvent({
            name: event.title,
            description: event.description
          });

          // Geocode library address (all events at same library)
          const address = event.location && event.location.trim()
            ? `${event.location}, Allentown, PA`
            : `${LIBRARY.name}, ${LIBRARY.city}, ${LIBRARY.state}`;

          const coordinates = await geocodeAddress(address);

          // Normalize date format
          const rawDate2 = event.time ? `${event.date} ${event.time}` : event.date;
          const normalizedDate2 = normalizeDateString(rawDate2);
          if (!normalizedDate2) {
            console.log(`  ⚠️ Skipping event with invalid date: "${rawDate2}"`);
            skipped++;
            continue;
          }

          const eventDoc = {
            name: event.title,
            venue: event.location || LIBRARY.name,
            state: LIBRARY.state,
            eventDate: normalizedDate2,
            scheduleDescription: event.time ? `${event.date} ${event.time}` : event.date,
            parentCategory,
            displayCategory,
            subcategory,
            ageRange: ageRange,
            cost: 'Free',
            description: event.description.substring(0, 1000),
            moreInfo: '',
            location: {
              name: event.location || LIBRARY.name,
              address: '',
              city: LIBRARY.city,
              state: LIBRARY.state,
              zipCode: LIBRARY.zipCode,
              coordinates: coordinates || null
            },
            contact: {
              website: event.url || LIBRARY.website,
              phone: ''
            },
            url: event.url || LIBRARY.website,
            metadata: {
              source: 'Allentown Library Scraper',
              sourceName: LIBRARY.name,
              county: LIBRARY.county,
              addedDate: admin.firestore.FieldValue.serverTimestamp()
            },
            filters: {
              isFree: true,
              ageRange: ageRange
            }
          };

          if (coordinates) {
            eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
          }

          const existing = await db.collection('events')
            .where('name', '==', eventDoc.name)
            .where('eventDate', '==', eventDoc.eventDate)
            .where('metadata.sourceName', '==', LIBRARY.name)
            .limit(1)
            .get();

          if (existing.empty) {
            await db.collection('events').add(eventDoc);
            console.log(`  ✅ ${event.title.substring(0, 50)}${event.title.length > 50 ? '...' : ''}`);
            imported++;
          } else {
            skipped++;
          }

          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`  ❌ Error processing event:`, error.message);
          failed++;
        }
      }

      // Delay between pages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping Allentown Library:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALLENTOWN PUBLIC LIBRARY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Allentown Public Library PA', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeAllentownLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeAllentownLibrary };
