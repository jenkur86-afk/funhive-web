#!/usr/bin/env node

/**
 * EASTERN US ACTIVITIES SCRAPER
 *
 * Data-driven venue scraper for family destinations across the eastern US.
 * Reads curated venue data from JSON, geocodes using Nominatim, and saves to Supabase.
 *
 * Coverage:
 * - PA, NJ, DE, NY, CT, MA, RI, VT, NH, ME
 * - NC, SC, GA, FL, AL, MS, TN, KY, OH, IN, MI, IL, WI, WV
 * - 15 venue categories covering recreation, education, and entertainment
 *
 * Usage:
 *   node scraper-activities-eastern-us.js                    # Run all states/categories
 *   node scraper-activities-eastern-us.js --state PA         # Run single state
 *   node scraper-activities-eastern-us.js --category "Children's Museums"
 *   node scraper-activities-eastern-us.js --state MA --category "Science & Discovery Centers"
 *
 * Cloud Function: scrapeEasternUSActivitiesCloudFunction
 * Schedule: Monthly (curated data doesn't change often)
 */

const fs = require('fs');
const path = require('path');
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'EasternUS-Activities';
const DATA_FILE = path.join(__dirname, 'data', 'eastern-us-venues.json');
const GEOCODE_CACHE_FILE = path.join(__dirname, '.geocode-cache.json');

// Rate limiting for Nominatim (1 req/sec)
const NOMINATIM_DELAY_MS = 1000;
let lastNominatimRequest = 0;

// ==========================================
// CONFIGURATION
// ==========================================

const CATEGORIES = [
  "Children's Museums",
  "Science & Discovery Centers",
  "Trampoline & Ninja Parks",
  "Indoor Playgrounds",
  "Gymnastics Centers",
  "Ice Skating Rinks",
  "Roller Skating Rinks",
  "Bowling Alleys",
  "Mini Golf & Batting Cages",
  "Art Studios & Pottery",
  "Swimming & Splash Pads",
  "Movie Theaters",
  "Climbing Gyms",
  "Family Entertainment Centers",
  "Farms, Zoos & Nature Centers"
];

const STATES = [
  'PA', 'NJ', 'DE', 'NY', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME',
  'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY', 'OH', 'IN', 'MI', 'IL', 'WI', 'WV'
];

// ==========================================
// GEOCODING HELPER FUNCTIONS
// ==========================================

/**
 * Load geocode cache from disk
 */
function loadGeocodeCache() {
  try {
    if (fs.existsSync(GEOCODE_CACHE_FILE)) {
      const data = fs.readFileSync(GEOCODE_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('  ⚠️ Could not load geocode cache, starting fresh');
  }
  return {};
}

/**
 * Save geocode cache to disk
 */
function saveGeocodeCache(cache) {
  try {
    fs.writeFileSync(GEOCODE_CACHE_FILE, JSON.stringify(cache, null, 0));
  } catch (error) {
    console.error('  ❌ Failed to save geocode cache:', error.message);
  }
}

/**
 * Sleep for a duration (in milliseconds)
 */
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate-limited Nominatim geocoding request
 */
async function geocodeAddress(query) {
  // Check cache first
  const cache = loadGeocodeCache();
  if (cache[query]) {
    return cache[query];
  }

  // Rate limit to 1 request/second
  const now = Date.now();
  const timeSinceLastRequest = now - lastNominatimRequest;
  if (timeSinceLastRequest < NOMINATIM_DELAY_MS) {
    await sleep(NOMINATIM_DELAY_MS - timeSinceLastRequest);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'FunHive-Scraper/1.0'
        }
      }
    );

    lastNominatimRequest = Date.now();

    if (!response.ok) {
      console.error(`  ❌ Nominatim error for "${query}": ${response.status}`);
      return null;
    }

    const results = await response.json();
    if (results.length === 0) {
      console.warn(`  ⚠️ No geocode result for "${query}"`);
      return null;
    }

    const coords = {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon)
    };

    // Save to cache
    cache[query] = coords;
    saveGeocodeCache(cache);

    return coords;
  } catch (error) {
    console.error(`  ❌ Geocoding failed for "${query}": ${error.message}`);
    return null;
  }
}

/**
 * Determine category mapping for activity document
 */
function mapActivityCategory(venueName, category, subcategory) {
  const mappings = {
    "Children's Museums": { category: "Learning & Culture", subcategory: "Children's Museum" },
    "Science & Discovery Centers": { category: "Learning & Culture", subcategory: "Science Center" },
    "Trampoline & Ninja Parks": { category: "Recreation", subcategory: "Trampoline Park" },
    "Indoor Playgrounds": { category: "Recreation", subcategory: "Indoor Play" },
    "Gymnastics Centers": { category: "Recreation", subcategory: "Gymnastics" },
    "Ice Skating Rinks": { category: "Recreation", subcategory: "Ice Skating" },
    "Roller Skating Rinks": { category: "Recreation", subcategory: "Roller Skating" },
    "Bowling Alleys": { category: "Recreation", subcategory: "Bowling" },
    "Mini Golf & Batting Cages": { category: "Recreation", subcategory: "Mini Golf" },
    "Art Studios & Pottery": { category: "Learning & Culture", subcategory: "Art Studio" },
    "Swimming & Splash Pads": { category: "Recreation", subcategory: "Water Park" },
    "Movie Theaters": { category: "Entertainment", subcategory: "Movie Theater" },
    "Climbing Gyms": { category: "Recreation", subcategory: "Climbing Gym" },
    "Family Entertainment Centers": { category: "Entertainment", subcategory: "Entertainment Center" },
    "Farms, Zoos & Nature Centers": { category: "Outdoor", subcategory: "Zoo" }
  };

  return mappings[category] || { category: "Entertainment", subcategory: "Family Activity" };
}

/**
 * Create activity document for venue
 */
function createActivityDocument(venue, coords) {
  const { category, subcategory } = mapActivityCategory(venue.name, venue.category, venue.subcategory);
  const geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);

  return {
    name: venue.name,
    city: venue.city,
    state: venue.state,
    category: category,
    subcategory: subcategory,
    type: subcategory,
    description: `Family-friendly ${venue.category.toLowerCase()} venue in ${venue.city}, ${venue.state}`,
    geohash: geohash,
    location: {
      city: venue.city,
      state: venue.state,
      coordinates: {
        latitude: coords.latitude,
        longitude: coords.longitude
      }
    },
    metadata: {
      source: 'eastern-us-activities',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      venueType: venue.subcategory,
      dataType: 'curated'
    },
    filters: {
      isFree: false,
      isIndoor: !['Farms, Zoos & Nature Centers', 'Swimming & Splash Pads'].includes(venue.category)
    }
  };
}

/**
 * Process and save venues
 */
async function processVenues(venues, filterState = null, filterCategory = null) {
  if (venues.length === 0) {
    console.log('  ℹ️ No venues to process');
    return { saved: 0, updated: 0, failed: 0, skipped: 0 };
  }

  let saved = 0, updated = 0, failed = 0, skipped = 0;

  for (const venue of venues) {
    // Apply filters
    if (filterState && venue.state !== filterState) {
      skipped++;
      continue;
    }
    if (filterCategory && venue.category !== filterCategory) {
      skipped++;
      continue;
    }

    try {
      // Geocode the venue (city + state)
      const query = `${venue.city}, ${venue.state}`;
      const coords = await geocodeAddress(query);

      if (!coords) {
        console.warn(`  ❌ Could not geocode ${venue.name} (${query})`);
        failed++;
        continue;
      }

      // Create activity document
      const activity = createActivityDocument(venue, coords);

      // Save via venue-matcher for deduplication
      const result = await getOrCreateActivity(activity, { source: SCRAPER_NAME });

      if (result.isNew) {
        saved++;
        console.log(`  ✓ ${venue.name} (${venue.city}, ${venue.state})`);
      } else if (result.updated) {
        updated++;
        console.log(`  ↻ ${venue.name} (updated)`);
      }

      // Rate limiting for Firestore writes
      await sleep(100);

    } catch (error) {
      console.error(`  ❌ Failed to save ${venue.name}: ${error.message}`);
      failed++;
    }
  }

  return { saved, updated, failed, skipped };
}

/**
 * Main scraper function
 */
async function scrapeEasternUSActivities() {
  console.log(`\n🗺️ EASTERN US ACTIVITIES SCRAPER`);
  console.log(`📍 Region: All Eastern US States`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Load venue data
  console.log('\n📂 Loading venue data...');
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ Data file not found: ${DATA_FILE}`);
    return { saved: 0, updated: 0, failed: 1 };
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  let venues = JSON.parse(rawData);
  console.log(`  ✓ Loaded ${venues.length} venues`);

  // Parse CLI arguments
  const args = process.argv.slice(2);
  let filterState = null;
  let filterCategory = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--state' && i + 1 < args.length) {
      filterState = args[i + 1].toUpperCase();
      console.log(`  📍 Filtering by state: ${filterState}`);
    }
    if (args[i] === '--category' && i + 1 < args.length) {
      filterCategory = args[i + 1];
      console.log(`  🏷️ Filtering by category: ${filterCategory}`);
    }
  }

  // Process venues
  console.log('\n🌍 Processing venues with geocoding...');
  const { saved, updated, failed, skipped } = await processVenues(venues, filterState, filterCategory);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ EASTERN US ACTIVITIES SCRAPER COMPLETE`);
  console.log(`   Total venues processed: ${venues.length - skipped}`);
  console.log(`   New activities saved: ${saved}`);
  console.log(`   Existing updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped (by filter): ${skipped}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection
  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      activitiesSaved: saved,
      activitiesUpdated: updated,
      activitiesFailed: failed,
      totalLocations: venues.length - skipped,
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
      venueTypes: CATEGORIES,
      filterState: filterState,
      filterCategory: filterCategory
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeEasternUSActivitiesCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeEasternUSActivities();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Eastern US Activities Scraper');

  scrapeEasternUSActivities()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeEasternUSActivities,
  scrapeEasternUSActivitiesCloudFunction
};
