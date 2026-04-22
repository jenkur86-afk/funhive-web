/**
 * GEOCODING HELPER WITH FALLBACK
 *
 * Provides intelligent geocoding with multiple fallback strategies:
 * 1. Try library-addresses.js lookup first (for known libraries)
 * 2. Try specific venue/location via Nominatim
 * 3. Fall back to library's main address (city + zip)
 * 4. Cache results to avoid repeated failed lookups
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getLibraryAddress } = require('./library-addresses');
const { getCountyCentroid } = require('../utils/county-centroids');

// Persistent file-based geocoding cache
// Stores results across runs to avoid re-geocoding the same addresses
const CACHE_FILE = path.join(__dirname, '..', '.geocode-cache.json');
let persistentCache = {};

// Load persistent cache from disk on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    persistentCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`📍 Loaded ${Object.keys(persistentCache).length} cached geocode results`);
  }
} catch (e) {
  console.warn('⚠️ Failed to load geocode cache, starting fresh:', e.message);
  persistentCache = {};
}

// Save persistent cache to disk (debounced)
let savePending = false;
function savePersistentCache() {
  if (savePending) return;
  savePending = true;
  setTimeout(() => {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(persistentCache, null, 0));
    } catch (e) {
      console.warn('⚠️ Failed to save geocode cache:', e.message);
    }
    savePending = false;
  }, 5000); // Batch saves every 5 seconds
}

// Force-save cache (call at end of scraper run)
function flushGeocodeCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(persistentCache, null, 0));
    console.log(`📍 Saved ${Object.keys(persistentCache).length} geocode results to cache`);
  } catch (e) {
    console.warn('⚠️ Failed to flush geocode cache:', e.message);
  }
}

// Simple in-memory cache for geocoding results (per-run, fast lookups)
const geocodeCache = new Map();
const failedAddresses = new Set();

// Rate limiter for Nominatim (max 1 request per second, with extra buffer)
let lastNominatimCall = 0;
// Global 429 cooldown — when ANY call gets rate-limited, ALL calls pause
let rateLimitedUntil = 0;

async function rateLimitedDelay() {
  // Respect global 429 cooldown first
  const now = Date.now();
  if (now < rateLimitedUntil) {
    const cooldownRemaining = rateLimitedUntil - now;
    console.log(`  ⏳ Global 429 cooldown: waiting ${Math.ceil(cooldownRemaining / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, cooldownRemaining));
  }

  const elapsed = Date.now() - lastNominatimCall;
  const minDelay = 2500; // 2.5s between requests — generous buffer over Nominatim's 1/s limit
  if (elapsed < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
  }
  lastNominatimCall = Date.now();
}

// Hard fallback: US state centroids for last resort
const STATE_CENTROIDS = {
  'AL': { lat: 32.806671, lng: -86.791130 },
  'AK': { lat: 61.370716, lng: -152.404419 },
  'AZ': { lat: 33.729759, lng: -111.431221 },
  'AR': { lat: 34.969704, lng: -92.373123 },
  'CA': { lat: 36.116203, lng: -119.681564 },
  'CO': { lat: 39.059811, lng: -105.311104 },
  'CT': { lat: 41.597782, lng: -72.755371 },
  'DC': { lat: 38.897438, lng: -77.026817 },
  'DE': { lat: 39.318523, lng: -75.507141 },
  'FL': { lat: 27.766279, lng: -81.686783 },
  'GA': { lat: 33.040619, lng: -83.643074 },
  'HI': { lat: 21.094318, lng: -157.498337 },
  'ID': { lat: 44.240459, lng: -114.478828 },
  'IL': { lat: 40.349457, lng: -88.986137 },
  'IN': { lat: 39.849426, lng: -86.258278 },
  'IA': { lat: 42.011539, lng: -93.210526 },
  'KS': { lat: 38.526600, lng: -96.726486 },
  'KY': { lat: 37.668140, lng: -84.670067 },
  'LA': { lat: 31.169546, lng: -91.867805 },
  'ME': { lat: 44.693947, lng: -69.381927 },
  'MD': { lat: 39.063946, lng: -76.802101 },
  'MA': { lat: 42.230171, lng: -71.530106 },
  'MI': { lat: 43.326618, lng: -84.536095 },
  'MN': { lat: 45.694454, lng: -93.900192 },
  'MS': { lat: 32.741646, lng: -89.678696 },
  'MO': { lat: 38.456085, lng: -92.288368 },
  'MT': { lat: 46.921925, lng: -110.454353 },
  'NE': { lat: 41.125370, lng: -98.268082 },
  'NV': { lat: 38.313515, lng: -117.055374 },
  'NH': { lat: 43.452492, lng: -71.563896 },
  'NJ': { lat: 40.298904, lng: -74.521011 },
  'NM': { lat: 34.840515, lng: -106.248482 },
  'NY': { lat: 42.165726, lng: -74.948051 },
  'NC': { lat: 35.630066, lng: -79.806419 },
  'ND': { lat: 47.528912, lng: -99.784012 },
  'OH': { lat: 40.388783, lng: -82.764915 },
  'OK': { lat: 35.565342, lng: -96.928917 },
  'OR': { lat: 44.572021, lng: -122.070938 },
  'PA': { lat: 40.590752, lng: -77.209755 },
  'RI': { lat: 41.680893, lng: -71.511780 },
  'SC': { lat: 33.856892, lng: -80.945007 },
  'SD': { lat: 44.299782, lng: -99.438828 },
  'TN': { lat: 35.747845, lng: -86.692345 },
  'TX': { lat: 31.054487, lng: -97.563461 },
  'UT': { lat: 40.150032, lng: -111.862434 },
  'VT': { lat: 44.045876, lng: -72.710686 },
  'VA': { lat: 37.769337, lng: -78.169968 },
  'WA': { lat: 47.400902, lng: -121.490494 },
  'WV': { lat: 38.491226, lng: -80.954453 },
  'WI': { lat: 44.268543, lng: -89.616508 },
  'WY': { lat: 42.755966, lng: -107.302490 }
};

/**
 * Geocode an address using OpenStreetMap Nominatim API
 *
 * @param {string} address - The address to geocode
 * @param {Object} options - Additional options
 * @param {string} options.city - City for fallback
 * @param {string} options.zipCode - Zip code for fallback
 * @param {string} options.state - State abbreviation
 * @param {string} options.county - County name
 * @param {string} options.venueName - Venue name for library address lookup
 * @param {string} options.sourceName - Source name for library address lookup
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
async function geocodeWithFallback(address, options = {}) {
  const {
    city,
    zipCode,
    state,
    county,
    venueName,
    sourceName,
    useCache = true
  } = options;

  // Check in-memory cache first
  if (useCache && geocodeCache.has(address)) {
    return geocodeCache.get(address);
  }

  // Check persistent file cache (survives across runs)
  if (useCache && persistentCache[address]) {
    const cached = persistentCache[address];
    geocodeCache.set(address, cached); // Promote to in-memory
    return cached;
  }

  // Strategy 0: Try library-addresses.js lookup first
  // This avoids API calls for known library addresses
  if (venueName || sourceName) {
    const libraryAddress = getLibraryAddress(venueName, sourceName);
    if (libraryAddress) {
      // Cache the library address lookup key
      const libraryKey = `library:${venueName}:${sourceName}`;
      if (useCache && geocodeCache.has(libraryKey)) {
        return geocodeCache.get(libraryKey);
      }

      // Geocode the library address
      const coords = await geocodeAddress(libraryAddress);
      if (coords) {
        console.log(`✅ Library address found: ${venueName} -> ${libraryAddress.substring(0, 50)}`);
        if (useCache) {
          geocodeCache.set(libraryKey, coords);
          geocodeCache.set(address, coords);
          persistentCache[address] = coords;
          savePersistentCache();
        }
        return coords;
      }
    }
  }

  // Skip if we've already failed on this address
  if (failedAddresses.has(address)) {
    // Try fallback immediately
    return await tryFallbackGeocode(city, zipCode, state, county);
  }

  try {
    // Strategy 1: Try the specific address first
    const coords = await geocodeAddress(address);

    if (coords) {
      // Cache successful result (in-memory + persistent)
      if (useCache) {
        geocodeCache.set(address, coords);
        persistentCache[address] = coords;
        savePersistentCache();
      }
      return coords;
    }

    // Strategy 2: Address geocoding failed, try fallback
    console.log(`⚠️  Geocoding failed for "${address}", trying fallback...`);
    failedAddresses.add(address);

    return await tryFallbackGeocode(city, zipCode, state, county);

  } catch (error) {
    console.error(`❌ Geocoding error for "${address}":`, error.message);

    // Try fallback on error
    return await tryFallbackGeocode(city, zipCode, state, county);
  }
}

/**
 * Try fallback geocoding strategies
 * ALWAYS returns coordinates - uses county/state centroid as hard fallback
 *
 * @param {string} city - City name
 * @param {string} zipCode - Zip code
 * @param {string} state - State abbreviation
 * @param {string} county - County name
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
async function tryFallbackGeocode(city, zipCode, state, county) {
  // Fallback 1: Try city + zip code + state
  if (city && zipCode && state) {
    const fallbackAddress1 = `${city}, ${state} ${zipCode}`;

    // Check in-memory + persistent cache for fallback
    if (geocodeCache.has(fallbackAddress1)) {
      return geocodeCache.get(fallbackAddress1);
    }
    if (persistentCache[fallbackAddress1]) {
      geocodeCache.set(fallbackAddress1, persistentCache[fallbackAddress1]);
      return persistentCache[fallbackAddress1];
    }

    const coords1 = await geocodeAddress(fallbackAddress1);
    if (coords1) {
      console.log(`✅ Fallback geocoding succeeded: ${fallbackAddress1}`);
      geocodeCache.set(fallbackAddress1, coords1);
      persistentCache[fallbackAddress1] = coords1;
      savePersistentCache();
      return coords1;
    }
  }

  // Fallback 2: Try just city + state
  if (city && state) {
    const fallbackAddress2 = `${city}, ${state}`;

    if (geocodeCache.has(fallbackAddress2)) {
      return geocodeCache.get(fallbackAddress2);
    }
    if (persistentCache[fallbackAddress2]) {
      geocodeCache.set(fallbackAddress2, persistentCache[fallbackAddress2]);
      return persistentCache[fallbackAddress2];
    }

    const coords2 = await geocodeAddress(fallbackAddress2);
    if (coords2) {
      console.log(`✅ Fallback geocoding succeeded: ${fallbackAddress2}`);
      geocodeCache.set(fallbackAddress2, coords2);
      persistentCache[fallbackAddress2] = coords2;
      savePersistentCache();
      return coords2;
    }
  }

  // Fallback 3: Try county + state via Nominatim
  if (county && state) {
    const fallbackAddress3 = `${county} County, ${state}`;

    if (geocodeCache.has(fallbackAddress3)) {
      return geocodeCache.get(fallbackAddress3);
    }
    if (persistentCache[fallbackAddress3]) {
      geocodeCache.set(fallbackAddress3, persistentCache[fallbackAddress3]);
      return persistentCache[fallbackAddress3];
    }

    const coords3 = await geocodeAddress(fallbackAddress3);
    if (coords3) {
      console.log(`✅ Fallback geocoding succeeded (county): ${fallbackAddress3}`);
      geocodeCache.set(fallbackAddress3, coords3);
      persistentCache[fallbackAddress3] = coords3;
      savePersistentCache();
      return coords3;
    }
  }

  // Fallback 4: Use county centroid from local database (HARD FALLBACK)
  if (county && state) {
    const centroid = getCountyCentroid(county, state);
    if (centroid) {
      const coords4 = { latitude: centroid.lat, longitude: centroid.lng };
      console.log(`✅ Using county centroid: ${county}, ${state}`);
      return coords4;
    }
  }

  // Fallback 5: Use state centroid as LAST RESORT (HARD FALLBACK)
  if (state && STATE_CENTROIDS[state]) {
    const stateCoords = STATE_CENTROIDS[state];
    const coords5 = { latitude: stateCoords.lat, longitude: stateCoords.lng };
    console.log(`⚠️ Using state centroid as last resort: ${state}`);
    return coords5;
  }

  console.log(`❌ All geocoding strategies failed for city: ${city}, ${state}`);
  return null;
}

/**
 * Core geocoding function using OpenStreetMap Nominatim
 *
 * @param {string} address - Address to geocode
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
async function geocodeAddress(address, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimitedDelay(); // Respect Nominatim's 1 req/sec limit
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          countrycodes: 'us'
        },
        headers: {
          'User-Agent': 'FunHive-EventAggregator/1.0 (family-events; contact@funhive.com)'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data && response.data.length > 0) {
        const result = {
          latitude: parseFloat(response.data[0].lat),
          longitude: parseFloat(response.data[0].lon)
        };
        // Save to persistent cache for future runs
        persistentCache[address] = result;
        savePersistentCache();
        return result;
      }

      return null;
    } catch (error) {
      // Handle 429 rate limiting with global cooldown + exponential backoff
      if (error.response && error.response.status === 429) {
        // Set global cooldown so ALL concurrent geocode calls also pause
        const cooldownMs = Math.min(60000 * Math.pow(2, attempt), 180000); // 60s, 120s, 180s
        rateLimitedUntil = Date.now() + cooldownMs;
        console.log(`  ⏳ Nominatim rate limited (429), global cooldown ${cooldownMs / 1000}s (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, cooldownMs));
        lastNominatimCall = Date.now();
        continue;
      }
      // Handle 502/503 server errors with retry
      if (error.response && (error.response.status === 502 || error.response.status === 503)) {
        const backoffMs = 3000 * (attempt + 1);
        console.log(`  ⏳ Nominatim server error (${error.response.status}), retrying in ${backoffMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      // Handle timeout with retry
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        if (attempt < retries - 1) {
          console.log(`  ⏳ Nominatim timeout, retrying (attempt ${attempt + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      console.error('Geocoding API error:', error.message);
      return null;
    }
  }
  return null;
}

/**
 * Clear the geocoding cache
 */
function clearGeocodeCache() {
  geocodeCache.clear();
  failedAddresses.clear();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    cacheSize: geocodeCache.size,
    failedCount: failedAddresses.size
  };
}

module.exports = {
  geocodeWithFallback,
  geocodeAddress,
  clearGeocodeCache,
  getCacheStats,
  flushGeocodeCache
};
