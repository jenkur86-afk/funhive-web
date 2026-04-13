/**
 * PRINCE GEORGE'S COUNTY MEMORIAL LIBRARY SYSTEM SCRAPER
 *
 * Scrapes events from Prince George's County libraries
 * Uses custom event grid platform
 *
 * COVERAGE:
 * - Prince George's County, MD (967,000+ population - largest in MD)
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: "Prince George's County Memorial Library System",
  url: 'https://pgcmls.info/events',
  county: "Prince George's",
  state: 'MD',
  website: 'https://www.pgcmls.info',
  city: 'Hyattsville',
  zipCode: '20781'
};

// Geocode address
async function geocodeAddress(address) {
  try {
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
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
}

// Parse age range from event text
function parseAgeRange(eventText) {
  if (!eventText) return 'All Ages';

  const lowerText = eventText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school|teen zone/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from PGCMLS
async function scrapePGCMLSEvents() {
  console.log(`\n📚 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.url}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Navigate to events page
    await page.goto(LIBRARY.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // PGCMLS uses custom grid structure
      const selectors = [
        '.events-grid-cell',
        '.virtual-event-cal',
        '.event-item',
        'article',
        '[class*="event"]'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Extract title
          const titleEl = el.querySelector('h2, h3, h4, .event-title, a');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;
          // Skip if title is too long - likely a container element with all page text
          if (title.length > 200) return;

          // Extract URL
          const linkEl = el.querySelector('a');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date
          let eventDate = '';
          const dateEl = el.querySelector('.events-grid-cell-date, .virtual-event-date, .date');
          if (dateEl) {
            eventDate = dateEl.textContent.trim();
          } else {
            // Try to extract from text
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                             fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract time
          let time = '';
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                           fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];

          // Extract location/branch
          let location = '';
          const locationMatch = fullText.match(/(?:Location|Branch|Library):\s*([^\n]+)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Extract event types/categories
          let eventType = '';
          const typeEl = el.querySelector('.events-grid-cell-types, .event-type');
          if (typeEl) {
            eventType = typeEl.textContent.trim();
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('.events-grid-cell-content, .event-description, p');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          if (title && eventDate && title.length < 200) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title.substring(0, 150),
              eventDate: rawDate,
              venue: location,
              description: (description || fullText.substring(0, 200)).substring(0, 500),
              url: url,
              eventType: eventType
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events\n`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(`${event.name} ${event.description} ${event.eventType}`);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Try to geocode location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${LIBRARY.county} County, ${LIBRARY.state}`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Default coordinates for PGCMLS (Hyattsville, MD)
        if (!coordinates) {
          coordinates = { latitude: 38.9557, longitude: -76.9456 };
        }

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || LIBRARY.name,
          state: LIBRARY.state, // CRITICAL: Add state field
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.eventType || '',
          geohash: ngeohash.encode(coordinates.latitude, coordinates.longitude, 7), // Always add geohash
          location: {
            name: event.venue || LIBRARY.name,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          },
          contact: {
            website: event.url || LIBRARY.website,
            phone: ''
          },
          url: event.url || LIBRARY.website,
          metadata: {
            source: 'PGCMLS Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: LIBRARY.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

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

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log("✅ PRINCE GEORGE'S COUNTY SCRAPER COMPLETE!\n");
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Prince Georges County Library MD', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapePGCMLSEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapePGCMLSEvents };
