const admin = require('firebase-admin');
const axios = require('axios');
const { getOrCreateActivity } = require('./venue-matcher');

// ==========================================
// CONFIGURATION
// ==========================================

// OpenStreetMap amenity/leisure tags by category (19 venue types)
const OSM_VENUE_TYPES = {
  'Learning & Culture': [
    { tag: 'library', type: 'amenity', name: 'Library', isFree: true },
    { tag: 'museum', type: 'amenity', name: 'Museum', isFree: false },
    { tag: 'arts_centre', type: 'amenity', name: 'Arts Center', isFree: false }
  ],
  'Entertainment': [
    { tag: 'cinema', type: 'amenity', name: 'Cinema', isFree: false },
    { tag: 'theatre', type: 'amenity', name: 'Theatre', isFree: false }
  ],
  'Community': [
    { tag: 'community_centre', type: 'amenity', name: 'Community Center', isFree: false }
  ],
  'Indoor': [
    { tag: 'ice_rink', type: 'leisure', name: 'Ice Rink', isFree: false },
    { tag: 'bowling_alley', type: 'leisure', name: 'Bowling', isFree: false },
    { tag: 'swimming_pool', type: 'leisure', name: 'Swimming Pool', isFree: false },
    { tag: 'sports_centre', type: 'leisure', name: 'Sports Center', isFree: false },
    { tag: 'fitness_centre', type: 'leisure', name: 'Fitness Center', isFree: false }
  ],
  'Outdoor': [
    { tag: 'playground', type: 'leisure', name: 'Playground', isFree: true },
    { tag: 'park', type: 'leisure', name: 'Park', isFree: true },
    { tag: 'nature_reserve', type: 'leisure', name: 'Nature Reserve', isFree: true },
    { tag: 'dog_park', type: 'leisure', name: 'Dog Park', isFree: true },
    { tag: 'zoo', type: 'tourism', name: 'Zoo', isFree: false },
    { tag: 'aquarium', type: 'tourism', name: 'Aquarium', isFree: false },
    { tag: 'theme_park', type: 'tourism', name: 'Theme Park', isFree: false },
    { tag: 'miniature_golf', type: 'leisure', name: 'Mini Golf', isFree: false }
  ]
};

// State ISO codes for boundary queries (admin_level=4)
const STATE_ISO_CODES = {
  'AL': 'US-AL', 'AK': 'US-AK', 'AZ': 'US-AZ', 'AR': 'US-AR', 'CA': 'US-CA',
  'CO': 'US-CO', 'CT': 'US-CT', 'DE': 'US-DE', 'FL': 'US-FL', 'GA': 'US-GA',
  'HI': 'US-HI', 'ID': 'US-ID', 'IL': 'US-IL', 'IN': 'US-IN', 'IA': 'US-IA',
  'KS': 'US-KS', 'KY': 'US-KY', 'LA': 'US-LA', 'ME': 'US-ME', 'MD': 'US-MD',
  'MA': 'US-MA', 'MI': 'US-MI', 'MN': 'US-MN', 'MS': 'US-MS', 'MO': 'US-MO',
  'MT': 'US-MT', 'NE': 'US-NE', 'NV': 'US-NV', 'NH': 'US-NH', 'NJ': 'US-NJ',
  'NM': 'US-NM', 'NY': 'US-NY', 'NC': 'US-NC', 'ND': 'US-ND', 'OH': 'US-OH',
  'OK': 'US-OK', 'OR': 'US-OR', 'PA': 'US-PA', 'RI': 'US-RI', 'SC': 'US-SC',
  'SD': 'US-SD', 'TN': 'US-TN', 'TX': 'US-TX', 'UT': 'US-UT', 'VT': 'US-VT',
  'VA': 'US-VA', 'WA': 'US-WA', 'WV': 'US-WV', 'WI': 'US-WI', 'WY': 'US-WY',
  'DC': 'US-DC'
};

// State name mapping
const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Make axios request with retry logic for transient errors
 */
async function axiosWithRetry(url, data, config, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.post(url, data, config);
    } catch (error) {
      const isRetryable =
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'EPIPE' ||
        error.message?.includes('socket hang up') ||
        error.response?.status === 502 ||
        error.response?.status === 503 ||
        error.response?.status === 504;

      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
        console.log(`        ⏳ Retry ${attempt}/${maxRetries} after ${delay}ms (${error.code || error.message})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Search OpenStreetMap using state boundary (complete coverage)
 */
async function searchStateByBoundary(stateCode, venueType) {
  const venues = [];
  const isoCode = STATE_ISO_CODES[stateCode];

  if (!isoCode) {
    console.error(`❌ Invalid state code: ${stateCode}`);
    return venues;
  }

  try {
    // Build Overpass QL query for ENTIRE STATE using admin boundaries
    // 45s timeout per query, limit 100 results to prevent Cloud Function timeout
    const query = `
      [out:json][timeout:45];
      area["ISO3166-2"="${isoCode}"]["admin_level"="4"];
      (
        node["${venueType.type}"="${venueType.tag}"](area);
        way["${venueType.type}"="${venueType.tag}"](area);
      );
      out center body 100;
      >;
      out skel qt;
    `;

    console.log(`      Searching ${venueType.name} across entire ${stateCode}...`);

    const response = await axiosWithRetry('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 60000 // 60 second timeout (increased from 50)
    }, 3);

    if (response.data && response.data.elements) {
      const elements = response.data.elements;
      console.log(`        Found ${elements.length} venues`);

      elements.forEach(element => {
        if (element.tags && element.tags.name) {
          // Get coordinates
          let lat, lon;
          if (element.type === 'node') {
            lat = element.lat;
            lon = element.lon;
          } else if (element.center) {
            lat = element.center.lat;
            lon = element.center.lon;
          }

          if (lat && lon) {
            venues.push({
              name: element.tags.name,
              type: venueType.name,
              category: venueType.name,
              lat,
              lon,
              address: element.tags['addr:street'] || '',
              city: element.tags['addr:city'] || '',
              state: stateCode,
              zipCode: element.tags['addr:postcode'] || '',
              phone: element.tags.phone || '',
              website: element.tags.website || '',
              isFree: venueType.isFree,
              metadata: {
                source: 'openstreetmap',
                osmId: element.id,
                osmType: element.type
              }
            });
          }
        }
      });
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log(`        ⏸️  Rate limited - skipping (no retry to save time)`);
    } else if (error.response?.status === 504 || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log(`        ⏸️  Timeout - skipping...`);
    } else if (error.code === 'ECONNRESET' || error.message?.includes('socket hang up')) {
      console.log(`        ⏸️  Connection reset after retries - skipping...`);
    } else {
      console.error(`        ❌ Error:`, error.message);
    }
  }

  return venues;
}

/**
 * Calculate geohash (7-character precision for ~150m resolution)
 */
function encodeGeohash(lat, lon, precision = 7) {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  let geohash = '';
  let isEven = true;

  while (geohash.length < precision) {
    let mid, bit = 0, ch = 0;

    for (let i = 0; i < 5; i++) {
      if (isEven) {
        mid = (lonMin + lonMax) / 2;
        if (lon > mid) {
          ch |= (1 << (4 - i));
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        mid = (latMin + latMax) / 2;
        if (lat > mid) {
          ch |= (1 << (4 - i));
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
    geohash += base32[ch];
  }
  return geohash;
}

/**
 * Main scraper function for state boundary coverage
 */
async function scrapeStateByBoundary(statesToScrape) {
  console.log(`\n🗺️  Starting STATE BOUNDARY Scraper (OpenStreetMap)...`);
  console.log(`📍 States: ${statesToScrape.join(', ')}`);

  const allVenues = [];
  const venueTypes = Object.values(OSM_VENUE_TYPES).flat();
  console.log(`📂 Venue types: ${venueTypes.length}`);
  console.log(`🌎 Coverage: COMPLETE state (all cities, towns, rural areas)\n`);

  for (const stateCode of statesToScrape) {
    console.log(`\n🏛️  ===== ${STATE_NAMES[stateCode].toUpperCase()} (${stateCode}) =====`);
    console.log(`📊 Searching entire state boundary...`);

    const stateVenues = [];

    // Process by category for organized output
    for (const [category, types] of Object.entries(OSM_VENUE_TYPES)) {
      console.log(`\n  📂 ${category}`);

      for (const venueType of types) {
        const venues = await searchStateByBoundary(stateCode, venueType);
        stateVenues.push(...venues);

        if (venues.length > 0) {
          console.log(`        ✓ ${venues[0].name}`);
          if (venues.length > 1) {
            console.log(`        ✓ ${venues[1].name}`);
          }
        }

        // Brief delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ ${STATE_NAMES[stateCode]} complete`);
    console.log(`📊 Total venues: ${stateVenues.length}`);

    allVenues.push(...stateVenues);
  }

  console.log(`\n✅ SCRAPING COMPLETE!`);
  console.log(`📊 States processed: ${statesToScrape.length}`);
  console.log(`📊 Total searches: ${venueTypes.length * statesToScrape.length}`);
  console.log(`📊 Unique venues: ${allVenues.length}\n`);

  return allVenues;
}

/**
 * Save venues to Firebase using venue-matcher for deduplication
 */
async function saveToFirebase(venues) {
  if (!venues || venues.length === 0) {
    console.log('⚠️  No venues to save');
    return;
  }

  console.log(`\n💾 Saving ${venues.length} venues to Firebase using venue-matcher...`);

  let saved = 0;
  let updated = 0;
  let errors = 0;

  for (const venue of venues) {
    try {
      // Build activity data in the expected format
      const activityData = {
        name: venue.name,
        type: venue.type,
        category: venue.category,
        state: venue.state,
        location: {
          coordinates: {
            latitude: venue.lat,
            longitude: venue.lon
          },
          address: venue.address || '',
          city: venue.city || '',
          state: venue.state,
          zipCode: venue.zipCode || ''
        },
        phone: venue.phone || '',
        website: venue.website || '',
        isFree: venue.isFree,
        metadata: {
          ...venue.metadata,
          scraperName: 'osm-state-boundary'
        }
      };

      // Use venue-matcher for deduplication
      const result = await getOrCreateActivity(activityData, { source: 'openstreetmap' });

      if (result.isNew) {
        saved++;
      } else if (result.updated) {
        updated++;
      }

      const total = saved + updated;
      if (total % 100 === 0) {
        console.log(`   ✓ Processed: ${total}/${venues.length}`);
      }

      // Rate limiting
      if (total % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`   ❌ Error saving venue ${venue.name}:`, error.message);
      errors++;
    }
  }

  console.log(`\n✅ Save complete!`);
  console.log(`   📝 New venues: ${saved}`);
  console.log(`   🔄 Updated existing: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total processed: ${saved + updated}\n`);

  return { saved, updated, errors, total: saved + updated };
}

/**
 * Main export function for Cloud Functions
 */
async function scrapeAndImportActivities(states) {
  console.log(`\n🚀 Starting OSM State Boundary Scraper for: ${states.join(', ')}`);

  const venues = await scrapeStateByBoundary(states);
  let saveResult = { saved: 0, skipped: 0, total: 0 };

  if (venues.length > 0) {
    saveResult = await saveToFirebase(venues);
  } else {
    console.log('⚠️  No venues found to import');
  }

  return {
    success: true,
    states,
    venuesFound: venues.length,
    // Stats for scraper logger
    found: venues.length,
    new: saveResult.saved,
    duplicates: saveResult.skipped
  };
}

module.exports = {
  scrapeAndImportActivities,
  scrapeStateByBoundary,
  saveToFirebase
};
