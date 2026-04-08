#!/usr/bin/env node

/**
 * SAN ANTONIO PUBLIC LIBRARY SCRAPER
 *
 * Scrapes events from San Antonio Public Library's Trumba calendar
 *
 * COVERAGE:
 * TX:
 * - San Antonio Public Library (1.5M people)
 *
 * Platform: Trumba Calendar (JSON API)
 * URL: https://www.trumba.com/calendars/san-antonio-public-library.json
 *
 * Usage:
 *   node functions/scrapers/scraper-san-antonio-library.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// San Antonio Library System
const LIBRARY = {
  name: 'San Antonio Public Library',
  url: 'https://www.trumba.com/calendars/san-antonio-public-library.json',
  county: 'Bexar',
  state: 'TX',
  website: 'https://mysapl.org',
  city: 'San Antonio',
  zipCode: '78205'
};

// Geocode address using OpenStreetMap Nominatim
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

// Extract location from Trumba event
function extractLocation(event) {
  // Check customFields for branch location and address
  if (event.customFields && event.customFields.length > 0) {
    const branchField = event.customFields.find(f =>
      f.fieldID === 'X-trumba-branch' ||
      f.fieldID === 'branch' ||
      f.label?.toLowerCase().includes('branch') ||
      f.label?.toLowerCase().includes('location')
    );

    const addressField = event.customFields.find(f =>
      f.fieldID === 'address' ||
      f.label?.toLowerCase().includes('address')
    );

    if (branchField?.value) {
      // Strip HTML tags if present
      const branch = branchField.value.replace(/<[^>]*>/g, '').replace(/&#\d+;/g, '').trim();
      const address = addressField?.value?.replace(/<[^>]*>/g, '').trim() || '';
      return { name: branch, address };
    }
  }

  // Fall back to location field if available
  if (event.location) {
    // Strip HTML tags if present
    const locationText = event.location.replace(/<[^>]*>/g, '').trim();
    return { name: locationText, address: '' };
  }

  return { name: LIBRARY.name, address: '' };
}

// Extract age range from Trumba event
function extractAgeRange(event) {
  // Check customFields for audience
  if (event.customFields && event.customFields.length > 0) {
    const audienceField = event.customFields.find(f =>
      f.fieldID === 'audience' ||
      f.label?.toLowerCase().includes('audience') ||
      f.label?.toLowerCase().includes('age')
    );

    if (audienceField?.value) {
      const audience = audienceField.value.toLowerCase();

      // Map common audience values
      if (audience.includes('children') || audience.includes('kids')) {
        return 'Children';
      }
      if (audience.includes('teen') || audience.includes('young adult')) {
        return 'Teens';
      }
      if (audience.includes('family') || audience.includes('all ages')) {
        return 'All Ages';
      }
      if (audience.includes('adult') || audience.includes('senior')) {
        return 'Adults';
      }
    }
  }

  // Check title and description for age keywords
  const text = `${event.title} ${event.description || ''}`.toLowerCase();

  if (text.match(/\bchildren\b|\bkids?\b|\bstorytime\b|\btoddler\b/)) {
    return 'Children';
  }
  if (text.match(/\bteen\b|\byoung adult\b|\bya\b/)) {
    return 'Teens';
  }
  if (text.match(/\bfamily\b|\ball ages\b/)) {
    return 'All Ages';
  }
  if (text.match(/\badult\b|\bsenior/)) {
    return 'Adults';
  }

  // Default to All Ages for library events
  return 'All Ages';
}

// Scrape events from San Antonio Library Trumba calendar
async function scrapeSanAntonioLibrary() {
  console.log(`\n📚 SAN ANTONIO PUBLIC LIBRARY SCRAPER`);
  console.log('='.repeat(60));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, TX)`);
  console.log(`   URL: ${LIBRARY.url}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  try {
    // Fetch JSON feed from Trumba
    console.log('   Fetching events from Trumba JSON API...\n');

    const response = await axios.get(LIBRARY.url, {
      headers: {
        'User-Agent': 'SocialSpot/1.0'
      },
      timeout: 30000
    });

    const events = response.data || [];
    console.log(`   Found ${events.length} events in JSON feed\n`);

    // Process each event
    for (const event of events) {
      try {
        // Skip canceled events
        if (event.canceled) {
          continue;
        }

        // Skip closures and administrative events
        if (event.template?.toLowerCase().includes('closure')) {
          continue;
        }

        // Skip events without titles
        if (!event.title || event.title.trim().length < 3) {
          continue;
        }

        // Extract age range
        const ageRange = extractAgeRange(event);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          continue;
        }

        // Extract location
        const location = extractLocation(event);

        // Geocode location
        let coordinates = null;
        if (location.address) {
          const fullAddress = `${location.address}, San Antonio, TX`;
          coordinates = await geocodeAddress(fullAddress);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        } else if (location.name !== LIBRARY.name) {
          const fullAddress = `${location.name}, San Antonio, TX`;
          coordinates = await geocodeAddress(fullAddress);
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }
        // Fallback to downtown San Antonio coordinates if geocoding failed
        if (!coordinates) {
          coordinates = { latitude: 29.4241, longitude: -98.4936 };
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.title,
          description: event.description || ''
        });

        // Parse date - Trumba provides dateTimeFormatted or startDateTime
        let eventDate = event.dateTimeFormatted || event.startDateTime;

        // Try to normalize the date
        const normalizedDate = normalizeDateString(eventDate) || eventDate;

        // Build event document
        const eventDoc = {
          name: event.title.trim(),
          venue: location.name,
          eventDate: normalizedDate,
          scheduleDescription: normalizedDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          state: LIBRARY.state,
          location: {
            name: location.name,
            address: location.address,
            city: LIBRARY.city,
            state: LIBRARY.state,
            zipCode: LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.eventActionUrl || LIBRARY.website,
            phone: ''
          },
          url: event.eventActionUrl || LIBRARY.website,
          metadata: {
            source: 'San Antonio Library Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            state: 'TX',
            addedDate: admin.firestore.FieldValue.serverTimestamp(),
            trumbaEventID: event.eventID || null
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Always add geohash since we always have coordinates (with fallback)
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
          console.log(`  ✅ ${event.title.substring(0, 60)}${event.title.length > 60 ? '...' : ''}`);
          totalImported++;
        } else {
          totalSkipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`  ❌ Error processing event "${event.title}":`, error.message);
        totalFailed++;
      }
    }

  } catch (error) {
    console.error(`\n❌ Error fetching Trumba feed:`, error.message);
    throw error;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ SAN ANTONIO PUBLIC LIBRARY SCRAPER COMPLETE!`);
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('San Antonio Public Library', {
    found: totalImported + totalSkipped,
    new: totalImported,
    duplicates: totalSkipped
  }, { dataType: 'events' });

  return { totalImported, totalSkipped, totalFailed };
}

// Run scraper if called directly
if (require.main === module) {
  scrapeSanAntonioLibrary()
    .then(() => {
      console.log('Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeSanAntonioLibrary };
