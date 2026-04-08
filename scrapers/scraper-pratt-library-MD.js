#!/usr/bin/env node

/**
 * ENOCH PRATT FREE LIBRARY SCRAPER (Baltimore City)
 *
 * Scrapes events from Pratt Library's iCal feed
 * Uses Localist platform with public iCal feed
 *
 * Coverage: Baltimore City (~585,000 residents)
 *
 * Usage:
 *   node scripts/scraper-pratt-library.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const ical = require('node-ical');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { getOrCreateActivity } = require('./event-save-helper');

// Pratt Library iCal feed
const ICAL_FEED_URL = 'https://calendar.prattlibrary.org/calendar/1.ics';

// Maximum days in future to scrape (Cloud Functions have timeout limits)
const MAX_DAYS_AHEAD = 60;

// Pratt Library branches with coordinates
const PRATT_BRANCHES = {
  'Central': { lat: 39.2904, lng: -76.6122, city: 'Baltimore', zipCode: '21201', address: '400 Cathedral St, Baltimore, MD 21201' },
  'Canton': { lat: 39.2824, lng: -76.5769, city: 'Baltimore', zipCode: '21224', address: '1030 S Ellwood Ave, Baltimore, MD 21224' },
  'Cherry Hill': { lat: 39.2456, lng: -76.6258, city: 'Baltimore', zipCode: '21225', address: '4000 Cherry Hill Rd, Baltimore, MD 21225' },
  'Clifton': { lat: 39.3022, lng: -76.5653, city: 'Baltimore', zipCode: '21213', address: '2001 N Wolfe St, Baltimore, MD 21213' },
  'Edmondson': { lat: 39.2937, lng: -76.6829, city: 'Baltimore', zipCode: '21229', address: '4330 Edmondson Ave, Baltimore, MD 21229' },
  'Forest Park': { lat: 39.3246, lng: -76.6788, city: 'Baltimore', zipCode: '21215', address: '3901 Reisterstown Rd, Baltimore, MD 21215' },
  'Hamilton': { lat: 39.3499, lng: -76.5501, city: 'Baltimore', zipCode: '21214', address: '5910 Harford Rd, Baltimore, MD 21214' },
  'Light Street': { lat: 39.2819, lng: -76.6120, city: 'Baltimore', zipCode: '21230', address: '1 E Pratt St, Baltimore, MD 21202' },
  'Orleans': { lat: 39.2960, lng: -76.5968, city: 'Baltimore', zipCode: '21205', address: '1303 Orleans St, Baltimore, MD 21231' },
  'Pennsylvania': { lat: 39.2740, lng: -76.5766, city: 'Baltimore', zipCode: '21224', address: '1531 E Lombard St, Baltimore, MD 21231' },
  'Roland Park': { lat: 39.3424, lng: -76.6321, city: 'Baltimore', zipCode: '21210', address: '5108 Roland Ave, Baltimore, MD 21210' },
  'Southeast Anchor': { lat: 39.2695, lng: -76.5729, city: 'Baltimore', zipCode: '21224', address: '3601 Eastern Ave, Baltimore, MD 21224' },
  'Walbrook': { lat: 39.3058, lng: -76.6798, city: 'Baltimore', zipCode: '21216', address: '3203 W North Ave, Baltimore, MD 21216' },
  'Washington Village': { lat: 39.2718, lng: -76.6277, city: 'Baltimore', zipCode: '21230', address: '856 Washington Blvd, Baltimore, MD 21230' },
  // Additional branches added 2025-12-03
  'Govans': { lat: 39.3633, lng: -76.6097, city: 'Baltimore', zipCode: '21212', address: '5714 Bellona Ave, Baltimore, MD 21212' },
  'Waverly': { lat: 39.3264, lng: -76.6097, city: 'Baltimore', zipCode: '21218', address: '400 E 33rd St, Baltimore, MD 21218' },
  'Patterson Park': { lat: 39.2912, lng: -76.5745, city: 'Baltimore', zipCode: '21224', address: '158 N Linwood Ave, Baltimore, MD 21224' },
  'Hampden': { lat: 39.3312, lng: -76.6363, city: 'Baltimore', zipCode: '21211', address: '3641 Falls Rd, Baltimore, MD 21211' },
  'Northwood': { lat: 39.3401, lng: -76.5824, city: 'Baltimore', zipCode: '21218', address: '4420 Loch Raven Blvd, Baltimore, MD 21218' },
  'Herring Run': { lat: 39.3127, lng: -76.5559, city: 'Baltimore', zipCode: '21213', address: '3801 Erdman Ave, Baltimore, MD 21213' },
  'Brooklyn': { lat: 39.2278, lng: -76.6156, city: 'Baltimore', zipCode: '21225', address: '300 E Patapsco Ave, Baltimore, MD 21225' },
  'Reisterstown Road': { lat: 39.3429, lng: -76.6946, city: 'Baltimore', zipCode: '21215', address: '6310 Reisterstown Rd, Baltimore, MD 21215' }
};

// Geocode address if coordinates not available
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

// Default to Central Library when no branch match
const DEFAULT_BRANCH = {
  name: 'Central',
  lat: 39.2904,
  lng: -76.6122,
  city: 'Baltimore',
  zipCode: '21201',
  address: '400 Cathedral St, Baltimore, MD 21201'
};

// Find matching branch
function findBranch(location) {
  if (!location) return DEFAULT_BRANCH;

  const locationLower = location.toLowerCase();

  for (const [branchName, branchData] of Object.entries(PRATT_BRANCHES)) {
    if (locationLower.includes(branchName.toLowerCase())) {
      return { name: branchName, ...branchData };
    }
  }

  // Return default if no match found
  return DEFAULT_BRANCH;
}

// Scrape Pratt Library events from iCal feed
async function scrapePrattLibrary() {
  console.log('\n📚 ENOCH PRATT FREE LIBRARY SCRAPER (Baltimore City)');
  console.log('='.repeat(60));
  console.log('Source: iCal feed\n');

  let imported = 0;
  let failed = 0;
  let skipped = 0;

  try {
    console.log(`📅 Fetching iCal feed: ${ICAL_FEED_URL}`);

    // Fetch and parse iCal feed
    const events = await ical.async.fromURL(ICAL_FEED_URL);

    const eventList = Object.values(events).filter(e => e.type === 'VEVENT');
    console.log(`  ✅ Found ${eventList.length} events in calendar\n`);

    // Calculate date boundaries
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

    // Process each event
    for (const event of eventList) {
      try {
        // Skip past events
        const eventDate = new Date(event.start);
        if (eventDate < today) {
          skipped++;
          continue;
        }

        // Skip events too far in the future (60-day limit for Cloud Function performance)
        if (eventDate > maxDate) {
          skipped++;
          continue;
        }

        // Extract event details
        const title = event.summary || '';
        const description = event.description || '';
        const location = event.location || '';
        const url = event.url || 'https://calendar.prattlibrary.org';

        // Format date
        const formattedDate = eventDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const formattedTime = eventDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Find matching branch
        const branch = findBranch(location);

        // Get coordinates
        let coordinates = null;
        if (branch) {
          coordinates = { latitude: branch.lat, longitude: branch.lng };
        } else if (location) {
          coordinates = await geocodeAddress(`${location}, Baltimore, MD`);
        }

        // Determine age range from categories or description
        let ageRange = 'All Ages';
        const lowerDesc = `${title} ${description}`.toLowerCase();
        if (lowerDesc.match(/baby|infant/i)) ageRange = 'Babies & Toddlers (0-2)';
        else if (lowerDesc.match(/toddler|preschool/i)) ageRange = 'Preschool (3-5)';
        else if (lowerDesc.match(/children|kids|ages 6-12/i)) ageRange = 'Children (6-12)';
        else if (lowerDesc.match(/teen|ages 13-17/i)) ageRange = 'Teens (13-17)';
        else if (lowerDesc.match(/adult|seniors/i)) ageRange = 'Adults';

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: title,
          description: description
        });

        // Build event document
        const eventDoc = {
          name: title,
          venue: branch ? `${branch.name} Library` : 'Enoch Pratt Free Library',
          eventDate: formattedDate,
          scheduleDescription: `${formattedDate} at ${formattedTime}`,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange,
          cost: 'Free',
          description: description.substring(0, 1000),
          moreInfo: '',
          state: 'MD',
          city: branch ? branch.city : 'Baltimore',
          address: branch ? branch.address : '',
          zipCode: branch ? branch.zipCode : '',
          location: {
            name: branch ? `${branch.name} Library` : location || 'Enoch Pratt Free Library',
            address: branch ? branch.address : '',
            city: branch ? branch.city : 'Baltimore',
            zipCode: branch ? branch.zipCode : '',
            coordinates: coordinates
          },
          contact: {
            website: url,
            phone: ''
          },
          url: url,
          metadata: {
            source: 'Pratt Library Scraper',
            sourceName: 'Enoch Pratt Free Library',
            county: 'Baltimore City',
            state: 'MD',
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

        // Get or create activity for this library branch
        const library = {
          name: eventDoc.venue,
          city: eventDoc.city || 'Baltimore',
          state: 'MD',
          address: branch ? branch.address : '',
          zipCode: branch ? branch.zipCode : ''
        };
        eventDoc.activityId = await getOrCreateActivity(library, coordinates, 'MD');

        // Add lastSeen timestamp for tracking
        eventDoc.metadata.lastSeen = admin.firestore.FieldValue.serverTimestamp();

        // Generate consistent event ID from URL or details
        const eventId = url
          ? generateEventId(url)
          : generateEventIdFromDetails(eventDoc.name, eventDoc.eventDate, eventDoc.location.name);

        // Use set with merge to update existing or create new
        await db.collection('events').doc(eventId).set(eventDoc, { merge: true });

        console.log(`  ✅ ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`);
        imported++;

        // Brief delay for Firestore writes
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ PRATT LIBRARY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Processed: ${imported} events (new or updated)`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  return { imported, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapePrattLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapePrattLibrary };
