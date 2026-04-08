#!/usr/bin/env node

/**
 * TRUMBA SCRAPER - Spartanburg County Public Libraries (SC)
 *
 * Scrapes events from Spartanburg County Public Libraries using Trumba RSS feed
 *
 * COVERAGE:
 * - Spartanburg County Public Libraries (SC) - 320K people
 *
 * Usage:
 *   node functions/scrapers/scraper-trumba-spartanburg-sc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const axios = require('axios');
const cheerio = require('cheerio');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Spartanburg County Public Libraries',
  rssUrl: 'http://www.trumba.com/calendars/scpl_events.rss',
  county: 'Spartanburg',
  state: 'SC',
  website: 'https://www.spartanburglibraries.org',
  city: 'Spartanburg',
  zipCode: '29301'
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

// Scrape events from Trumba RSS feed
async function scrapeTrumbaEvents() {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   RSS Feed: ${LIBRARY.rssUrl}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Fetch RSS feed - force responseType to 'text' to get raw XML string
    const response = await axios.get(LIBRARY.rssUrl, {
      headers: {
        'User-Agent': 'SocialSpot/1.0'
      },
      responseType: 'text'  // Force axios to return raw text, not parsed object
    });

    // Parse RSS XML
    const $ = cheerio.load(response.data, { xmlMode: true });

    // Extract events from RSS items
    const items = $('item');
    console.log(`   Found ${items.length} events in RSS feed`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const title = $(item).find('title').text().trim();
        const description = $(item).find('description').text().trim();
        const link = $(item).find('link').text().trim();

        // Get date from <category> tag - format: "2026/01/21 (Wed)"
        const category = $(item).find('category').text().trim();
        let eventDateStr = '';

        // Parse category date format: "2026/01/21 (Wed)"
        const categoryDateMatch = category.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (categoryDateMatch) {
          const [, year, month, day] = categoryDateMatch;
          // Convert to "Month Day, Year" format
          const months = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
          eventDateStr = `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
        }

        // Also try to extract time from description (format: "10:30–11:30am EST")
        const timeMatch = description.match(/\d{1,2}(?::\d{2})?\s*[-–]?\s*\d{0,2}:?\d{0,2}\s*(?:am|pm)/i);
        if (timeMatch && eventDateStr) {
          eventDateStr = `${eventDateStr} ${timeMatch[0]}`;
        }

        // Parse age range
        const ageRange = parseAgeRange(title + ' ' + description);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to extract location from description or title
        let venue = LIBRARY.name;
        let locationText = '';

        // Look for "Location:" or "@" or "at" patterns in description
        const locationMatch = description.match(/(?:Location|@|at)\s*:\s*([^<\n]+)/i);
        if (locationMatch) {
          locationText = locationMatch[1].trim();
          venue = locationText;
        }

        // Geocode location
        let coordinates = null;
        const fullAddress = locationText ?
          `${locationText}, ${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}` :
          `${LIBRARY.city}, ${LIBRARY.county} County, ${LIBRARY.state}`;

        coordinates = await geocodeAddress(fullAddress);

        // Categorize event
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: title,
          description: description
        });

        // Normalize date format
        const normalizedDate = normalizeDateString(eventDateStr);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${eventDateStr}"`);
          skipped++;
          continue;
        }

        // Default coordinates for Spartanburg County Library (Spartanburg, SC)
        if (!coordinates) {
          coordinates = { latitude: 34.9496, longitude: -81.9320 };
        }

        // Build event document
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
          geohash: ngeohash.encode(coordinates.latitude, coordinates.longitude, 7), // Always add geohash
          location: {
            name: venue,
            address: locationText,
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          },
          contact: {
            website: link || LIBRARY.website,
            phone: ''
          },
          url: link || LIBRARY.website,
          metadata: {
            source: 'Trumba Scraper',
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
        const eventId = generateEventId(link || `${LIBRARY.name}-${title}-${eventDateStr}`);

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
        console.error(`     Stack:`, error.stack);
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
async function scrapeTrumbaLibrary() {
  console.log('\n📚 TRUMBA SCRAPER - SPARTANBURG COUNTY PUBLIC LIBRARIES');
  console.log('='.repeat(60));

  const { imported, skipped, failed } = await scrapeTrumbaEvents();

  console.log('\n' + '='.repeat(60));
  console.log('✅ TRUMBA SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Trumba Spartanburg Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Cloud Function wrapper - renamed to match index.js
async function scrapeTrumbaSpartanburgCloudFunction() {
  console.log('\n📚 Trumba Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const result = await scrapeTrumbaLibrary();
    return {
      ...result,
      message: 'Trumba scraper completed'
    };
  } catch (error) {
    console.error('Error in Trumba scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeTrumbaLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeTrumbaLibrary, scrapeTrumbaSpartanburgCloudFunction };
