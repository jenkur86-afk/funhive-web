#!/usr/bin/env node

/**
 * TOCKIFY SCRAPER - Horry County Memorial Library (SC)
 *
 * Scrapes events from Horry County Memorial Library using Tockify iCal feed
 *
 * COVERAGE:
 * - Horry County Memorial Library (SC - Myrtle Beach) - 380K people
 *
 * Usage:
 *   node functions/scrapers/scraper-tockify-horry-sc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const axios = require('axios');
const ical = require('node-ical');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Horry County Memorial Library',
  icsUrl: 'https://tockify.com/api/feeds/ics/hcm.library',
  county: 'Horry',
  state: 'SC',
  website: 'https://www.horrycountysc.gov/departments/libraries/',
  city: 'Myrtle Beach',
  zipCode: '29577'
};

// Geocode address using OpenStreetMap
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
        'User-Agent': 'SocialSpot/1.0'
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

// Parse age range from event title/description
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/\badults?\s+only\b/i) || lowerText.match(/\b18\+/)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/\b(babies?|infants?|0-2)\b/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/\b(toddlers?|preschool|3-5)\b/i)) return 'Preschool (3-5)';
  if (lowerText.match(/\b(children|kids|6-12|elementary)\b/i)) return 'Children (6-12)';
  if (lowerText.match(/\b(teens?|13-17|teenage|youth)\b/i)) return 'Teens (13-17)';
  if (lowerText.match(/\b(family|families|everyone|all ages)\b/i)) return 'All Ages';

  return 'All Ages';
}

// Format date for display: "Month Day, Year Time"
function formatDate(date) {
  if (!date) return '';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Convert to EST
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  const month = months[estDate.getMonth()];
  const day = estDate.getDate();
  const year = estDate.getFullYear();

  let hours = estDate.getHours();
  const minutes = estDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}

// Scrape events from Tockify iCal feed
async function scrapeTockifyEvents() {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   iCal Feed: ${LIBRARY.icsUrl}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Fetch and parse iCal feed
    const events = await ical.async.fromURL(LIBRARY.icsUrl, {
      headers: {
        'User-Agent': 'SocialSpot/1.0'
      }
    });

    const eventArray = Object.values(events).filter(e => e.type === 'VEVENT');
    console.log(`   Found ${eventArray.length} events in iCal feed`);

    for (const event of eventArray) {
      try {
        const title = event.summary || 'Untitled Event';
        const description = event.description || '';
        const start = event.start;
        const end = event.end;
        const location = event.location || '';
        const url = event.url || '';

        // Skip events without a start date
        if (!start) {
          skipped++;
          continue;
        }

        // Format event date
        const eventDateStr = formatDate(start);
        if (!eventDateStr) {
          skipped++;
          continue;
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(eventDateStr);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${eventDateStr}"`);
          skipped++;
          continue;
        }

        // Parse age range
        const ageRange = parseAgeRange(title + ' ' + description);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Determine venue
        let venue = location || LIBRARY.name;

        // Geocode location
        let coordinates = null;
        const fullAddress = location ?
          `${location}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}` :
          `${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`;

        coordinates = await geocodeAddress(fullAddress);

        // Categorize event
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: title,
          description: description
        });

        // Build event document
        // Use default coordinates if geocoding fails
        if (!coordinates) {
          coordinates = { latitude: 33.6891, longitude: -78.8867 }; // Myrtle Beach default
        }

        const eventDoc = {
          name: title,
          venue: venue,
          state: LIBRARY.state, // CRITICAL: Add state field
          eventDate: normalizedDate,
          scheduleDescription: eventDateStr,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: description.substring(0, 1000),
          location: {
            name: venue,
            address: location,
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          },
          contact: {
            website: url || LIBRARY.website,
            phone: ''
          },
          url: url || LIBRARY.website,
          metadata: {
            source: 'Tockify Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Add geohash (we always have coordinates now)
        eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);

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
          console.log(`  ✅ ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`);
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
  }

  console.log(`\n   Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}\n`);
  return { imported, skipped, failed };
}

// Main function
async function scrapeTockifyLibrary() {
  console.log('\n📚 TOCKIFY SCRAPER - HORRY COUNTY MEMORIAL LIBRARY');
  console.log('='.repeat(60));

  const { imported, skipped, failed } = await scrapeTockifyEvents();

  console.log('\n' + '='.repeat(60));
  console.log('✅ TOCKIFY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeTockifyLibraryCloudFunction() {
  console.log('\n📚 Tockify Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const result = await scrapeTockifyLibrary();

    // Log scraper stats to database
    await logScraperResult('Tockify Horry Library', {
      found: result.imported + result.skipped,
      new: result.imported,
      duplicates: result.skipped
    }, { dataType: 'events' });

    return {
      ...result,
      message: 'Tockify scraper completed'
    };
  } catch (error) {
    console.error('Error in Tockify scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeTockifyLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeTockifyLibrary, scrapeTockifyLibraryCloudFunction };
