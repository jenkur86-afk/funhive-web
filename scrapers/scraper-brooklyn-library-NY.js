#!/usr/bin/env node

/**
 * BROOKLYN PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from Brooklyn Public Library's JSON API
 * Second largest public library system in the United States
 *
 * COVERAGE:
 * NY:
 * - Brooklyn Public Library (2.7M people)
 * - 60+ library locations throughout Brooklyn
 *
 * Platform: Custom Solr-based JSON API
 * URL: https://discover.bklynlibrary.org/api/search/index.php?event=true
 *
 * Usage:
 *   node functions/scrapers/scraper-brooklyn-library-NY.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Brooklyn Public Library
const LIBRARY = {
  name: 'Brooklyn Public Library',
  baseUrl: 'https://discover.bklynlibrary.org',
  // Use select API with pagination (search API limits to 20 results)
  selectApiBase: 'https://discover.bklynlibrary.org/api/select/index.php',
  county: 'Kings',
  state: 'NY',
  website: 'https://www.bklynlibrary.org',
  city: 'Brooklyn',
  zipCode: '11238'
};

// Pagination settings
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // Limit to 1000 events per run to avoid timeouts

// Map Brooklyn API age ranges to our format
const AGE_RANGE_MAP = {
  'Birth to Five Years': 'Babies & Toddlers (0-2)',
  'Children': 'Children (6-12)',
  'Tweens': 'Tweens (9-12)',
  'Teens': 'Teens (13-17)',
  'Young Adults': 'Teens (13-17)',
  'Adults': 'Adults',
  'All Ages': 'All Ages',
  'Families': 'All Ages'
};

// Map age range to our standard format
function mapAgeRange(apiAge) {
  if (!apiAge) return 'All Ages';

  // Direct mapping
  if (AGE_RANGE_MAP[apiAge]) {
    return AGE_RANGE_MAP[apiAge];
  }

  // Fuzzy matching
  const lowerAge = apiAge.toLowerCase();
  if (lowerAge.includes('birth') || lowerAge.includes('baby') || lowerAge.includes('toddler')) {
    return 'Babies & Toddlers (0-2)';
  }
  if (lowerAge.includes('preschool')) {
    return 'Preschool (3-5)';
  }
  if (lowerAge.includes('children') || lowerAge.includes('kids')) {
    return 'Children (6-12)';
  }
  if (lowerAge.includes('tween')) {
    return 'Tweens (9-12)';
  }
  if (lowerAge.includes('teen') || lowerAge.includes('young adult')) {
    return 'Teens (13-17)';
  }
  if (lowerAge.includes('adult')) {
    return 'Adults';
  }
  if (lowerAge.includes('all') || lowerAge.includes('famil')) {
    return 'All Ages';
  }

  return 'All Ages';
}

// Geocode Brooklyn library locations (we can build a cache of known locations)
const LOCATION_COORDINATES = {
  'Central Library': { latitude: 40.6724, longitude: -73.9682 },
  'Red Hook Library': { latitude: 40.6754, longitude: -74.0051 },
  'Red Hook Interim Library': { latitude: 40.6754, longitude: -74.0051 },
  'Williamsburg Library': { latitude: 40.7141, longitude: -73.9571 },
  'Park Slope Library': { latitude: 40.6732, longitude: -73.9794 },
  'Brooklyn Heights Library': { latitude: 40.6943, longitude: -73.9927 },
  'Carroll Gardens Library': { latitude: 40.6774, longitude: -73.9985 },
  // Add more as discovered
};

// Get coordinates for a location
function getLocationCoordinates(locationName) {
  if (!locationName) return null;

  // Check exact match
  if (LOCATION_COORDINATES[locationName]) {
    return LOCATION_COORDINATES[locationName];
  }

  // Check partial match
  for (const [name, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (locationName.includes(name) || name.includes(locationName)) {
      return coords;
    }
  }

  // Default to Central Library coordinates
  return LOCATION_COORDINATES['Central Library'];
}

// Scrape events from Brooklyn Public Library
async function scrapeBrooklynLibrary() {
  console.log(`\n📚 BROOKLYN PUBLIC LIBRARY SCRAPER`);
  console.log('='.repeat(60));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, NY)`);
  console.log(`   Using Select API with pagination\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  try {
    // Build API URL with future events filter
    // Use date format without milliseconds, and properly escape Solr query syntax
    const now = new Date().toISOString().split('.')[0] + 'Z'; // Remove milliseconds
    // Note: Solr range query syntax requires escaping brackets and colons
    const dateFilter = `ds_event_start_date:[${now} TO *]`;
    const baseUrl = `${LIBRARY.selectApiBase}?fq=ss_type:event&fq=is_event_canceled:0&fq=${encodeURIComponent(dateFilter)}&sort=ds_event_start_date asc&rows=${PAGE_SIZE}`;

    // Fetch first page to get total count
    console.log('   Fetching events from API...\n');

    const firstResponse = await axios.get(baseUrl + '&start=0', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://discover.bklynlibrary.org/?event=true'
      },
      timeout: 30000
    });

    if (!firstResponse.data || !firstResponse.data.response) {
      throw new Error('Invalid API response structure');
    }

    const totalAvailable = firstResponse.data.response.numFound;
    const pagesToFetch = Math.min(MAX_PAGES, Math.ceil(totalAvailable / PAGE_SIZE));

    console.log(`   Found ${totalAvailable} upcoming events (fetching up to ${pagesToFetch * PAGE_SIZE})\n`);

    // Process all pages
    for (let page = 0; page < pagesToFetch; page++) {
      const start = page * PAGE_SIZE;
      let events;

      if (page === 0) {
        events = firstResponse.data.response.docs;
      } else {
        const response = await axios.get(baseUrl + '&start=' + start, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://discover.bklynlibrary.org/?event=true'
          },
          timeout: 30000
        });
        events = response.data.response.docs;
      }

      console.log(`   Processing page ${page + 1}/${pagesToFetch} (${events.length} events)...`);

      // Process each event
      for (const event of events) {
        try {

        if (!event || !event.ts_title) {
          totalSkipped++;
          continue;
        }

        // Map age range
        const ageRange = mapAgeRange(event.ss_event_age);

        // Skip adult-only events unless family-friendly
        if (ageRange === 'Adults' &&
            !(event.ts_body && event.ts_body.toLowerCase().includes('famil'))) {
          totalSkipped++;
          continue;
        }

        // Skip canceled events
        if (event.is_event_canceled === 1) {
          totalSkipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.ts_title,
          description: event.ts_body
        });

        // Parse dates
        const startDateObj = event.ds_event_start_date
          ? new Date(event.ds_event_start_date)
          : null;

        const startTimestamp = startDateObj
          ? admin.firestore.Timestamp.fromDate(startDateObj)
          : null;

        // Format event date string
        const eventDateStr = startDateObj
          ? startDateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          : 'Date TBD';

        // Normalize date format
        const normalizedDate = normalizeDateString(eventDateStr);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${eventDateStr}"`);
          totalSkipped++;
          continue;
        }

        // Get location coordinates
        const locationName = event.ss_event_location || event.ss_event_location_master || LIBRARY.name;
        const coordinates = getLocationCoordinates(locationName);

        // Build event document
        const eventDoc = {
          name: event.ts_title.trim(),
          venue: locationName,
          eventDate: normalizedDate,
          date: startTimestamp,
          startDate: startTimestamp,
          scheduleDescription: eventDateStr,
          state: LIBRARY.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange,
          cost: 'Free',
          description: (event.ts_body || '').substring(0, 1000),
          moreInfo: event.sm_event_tags ? event.sm_event_tags.join(', ') : '',
          location: {
            name: locationName,
            address: '',
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: `${LIBRARY.website}/events`,
            phone: ''
          },
          url: `${LIBRARY.website}/events`,
          imageUrl: event.ss_image_url || '',
          metadata: {
            source: 'Brooklyn Public Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp(),
            eventId: event.id,
            virtual: event.is_virtual === 1,
            hybrid: event.is_hybrid === 1
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
          .where('metadata.eventId', '==', event.id)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.ts_title.substring(0, 60)}${event.ts_title.length > 60 ? '...' : ''}`);
          totalImported++;
        } else {
          totalSkipped++;
        }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`  ❌ Error processing event:`, error.message);
          totalFailed++;
        }
      }

      // Small delay between pages
      if (page < pagesToFetch - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

  } catch (error) {
    console.error(`\n❌ Error scraping Brooklyn Public Library:`, error.message);
    throw error;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ BROOKLYN PUBLIC LIBRARY SCRAPER COMPLETE!`);
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Brooklyn Public Library NY', {
    found: totalImported + totalSkipped,
    new: totalImported,
    duplicates: totalSkipped
  }, { dataType: 'events' });

  return { totalImported, totalSkipped, totalFailed };
}

// Run scraper if called directly
if (require.main === module) {
  scrapeBrooklynLibrary()
    .then(() => {
      console.log('Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeBrooklynLibrary };
