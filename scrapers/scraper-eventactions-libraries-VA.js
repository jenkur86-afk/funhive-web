#!/usr/bin/env node

/**
 * EVENTACTIONS PLATFORM SCRAPER
 *
 * Scrapes events from libraries using EventActions event management platform
 *
 * COVERAGE (1 library system in VA):
 * - Jefferson-Madison Regional Library (Charlottesville, VA) - 250,000 population
 *   8 branches across 3 counties (Albemarle, Charlottesville, Nelson)
 *
 * Usage:
 *   node functions/scrapers/scraper-eventactions-libraries-VA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { getBranchAddress } = require('./library-addresses');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using EventActions/Trumba
const LIBRARY_SYSTEMS = [
  {
    name: 'Jefferson-Madison Regional Library',
    // EventActions page (for reference)
    eventActionsUrl: 'https://eventactions.com/eventactions/jefferson-madison-regional-library-events',
    // Trumba JSON API - much more reliable than scraping!
    jsonUrl: 'https://www.trumba.com/calendars/jefferson-madison-regional-library-events.json',
    county: 'Albemarle',
    state: 'VA',
    website: 'https://jmrl.org',
    city: 'Charlottesville',
    zipCode: '22902',
    branches: 8,
    countiesServed: ['Albemarle', 'Charlottesville', 'Nelson']
  }
];

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

// Scrape events from EventActions/Trumba library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   JSON URL: ${library.jsonUrl}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Fetch events directly from Trumba JSON API
    const response = await axios.get(library.jsonUrl, {
      headers: {
        'User-Agent': 'FunHive/1.0'
      }
    });

    const events = response.data || [];
    console.log(`   Found ${events.length} events from Trumba API`);

    // Process each event from Trumba JSON
    for (const event of events) {
      try {
        // Extract audience from customFields
        let audience = '';
        if (event.customFields) {
          const audienceField = event.customFields.find(f => f.label === 'Audience');
          if (audienceField) {
            audience = audienceField.value || '';
          }
        }

        // Extract branch/location from customFields
        let branchName = '';
        if (event.customFields) {
          const branchField = event.customFields.find(f => f.label === 'Format & Branch' || f.label === 'Format &amp; Branch');
          if (branchField) {
            // Extract branch name from HTML like "<strong>Central Library</strong>"
            const match = branchField.value.match(/<strong>([^<]+)<\/strong>/);
            if (match) {
              branchName = match[1];
            }
          }
        }

        // Clean HTML from description
        const cleanDescription = (event.description || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();

        // Parse age range from description and audience
        const ageRange = parseAgeRange(cleanDescription + ' ' + audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Format event date from startDateTime - use ISO format for reliable parsing
        // Convert ISO format "2025-12-23T09:00:00" to "December 23, 2025 9:00 AM"
        let eventDate = '';
        if (event.startDateTime) {
          const d = new Date(event.startDateTime);
          const monthName = d.toLocaleString('en-US', { month: 'long' });
          const day = d.getDate();
          const year = d.getFullYear();
          const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          eventDate = `${monthName} ${day}, ${year} ${time}`;
        } else if (event.dateTimeFormatted) {
          eventDate = event.dateTimeFormatted
            .replace(/&nbsp;/g, ' ')
            .replace(/&ndash;/g, '-')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'");
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${eventDate}"`);
          skipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.title,
          description: cleanDescription
        });

        // Get branch address from library-addresses.js
        const branchLocation = branchName
          ? getBranchAddress(library.name, branchName, library.state)
          : getBranchAddress(library.name, null, library.state);

        // Try to geocode using the branch address
        let coordinates = null;
        if (branchLocation && branchLocation.address) {
          const fullAddress = `${branchLocation.address}, ${branchLocation.city}, ${branchLocation.state} ${branchLocation.zipCode}`;
          coordinates = await geocodeAddress(fullAddress);
        }

        // Fallback to generic geocoding if branch address didn't work
        if (!coordinates) {
          const venueAddress = branchName
            ? `${branchName}, ${library.city}, ${library.county} County, ${library.state}`
            : `${library.name}, ${library.city}, ${library.county} County, ${library.state}`;
          coordinates = await geocodeAddress(venueAddress);
        }

        // Build event document
        const eventDoc = {
          name: event.title,
          venue: branchName || library.name,
          eventDate: normalizedDate,
          scheduleDescription: eventDate,
          state: library.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: cleanDescription.substring(0, 1000),
          moreInfo: audience || '',
          location: {
            name: branchName || library.name,
            address: branchLocation?.address || '',
            city: branchLocation?.city || library.city,
            state: library.state,
            zipCode: branchLocation?.zipCode || library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.permaLinkUrl || library.website,
            phone: ''
          },
          url: event.permaLinkUrl || library.website,
          metadata: {
            source: 'Trumba/EventActions Scraper',
            sourceName: library.name,
            county: library.county,
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
          console.log(`  ✅ ${event.title.substring(0, 60)}${event.title.length > 60 ? '...' : ''}`);
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

  } catch (error) {
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeEventActionsLibraries() {
  console.log('\n📚 TRUMBA/EVENTACTIONS SCRAPER - JMRL');
  console.log('='.repeat(60));
  console.log('Coverage: 1 major library system in VA (8 branches)\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // No browser needed - using JSON API directly
  for (const library of LIBRARY_SYSTEMS) {
    const { imported, failed, skipped } = await scrapeLibraryEvents(library, null);
    totalImported += imported;
    totalSkipped += skipped;
    totalFailed += failed;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ EVENTACTIONS SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  
  // Log scraper stats to Firestore
  await logScraperResult('EventActions-VA', {
    found: totalImported,
    new: totalImported,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// Run if executed directly
if (require.main === module) {
  scrapeEventActionsLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeEventActionsLibraries };
