/**
 * SHARED GEOCODING FOR MACARONI KID SCRAPERS
 *
 * Replaces the inline tryGeocode/geocodeAddress in each state scraper.
 * Key improvements over the old inline version:
 *   1. Persistent file cache — addresses geocoded in past runs are instant hits
 *   2. Global 429 cooldown — one rate-limit triggers a 60s pause for ALL calls
 *   3. City-center cache — when API is down, city centers come from cache, not county centroids
 *   4. In-memory cache — same address in one run is never looked up twice
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ── Persistent cache (shared with geocoding-helper.js) ──────────────────────
const CACHE_FILE = path.join(__dirname, '..', '.geocode-cache.json');
let persistentCache = {};

try {
  if (fs.existsSync(CACHE_FILE)) {
    persistentCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
} catch (e) {
  persistentCache = {};
}

let savePending = false;
function savePersistentCache() {
  if (savePending) return;
  savePending = true;
  setTimeout(() => {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(persistentCache, null, 0));
    } catch (e) { /* ignore */ }
    savePending = false;
  }, 5000);
}

function flushMacaroniGeocodeCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(persistentCache, null, 0));
  } catch (e) { /* ignore */ }
}

// ── In-memory caches ────────────────────────────────────────────────────────
const memCache = {};          // address → {latitude,longitude} or null
let rateLimitedUntil = 0;     // timestamp: skip API calls until this time

// ── Core geocode function ───────────────────────────────────────────────────
async function tryGeocode(address) {
  // 1. In-memory cache (instant)
  if (address in memCache) return memCache[address];

  // 2. Persistent file cache (no API call needed)
  if (persistentCache[address]) {
    memCache[address] = persistentCache[address];
    return persistentCache[address];
  }

  // 3. If we're in a 429 cooldown, skip the API call entirely
  if (Date.now() < rateLimitedUntil) {
    return null;  // don't cache as null — we want to retry later
  }

  // 4. Call Nominatim
  await new Promise(r => setTimeout(r, 1500)); // respect rate limit
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'FunHive/1.0 (+https://funhive.com; family-events)' },
      timeout: 10000
    });
    if (response.data && response.data.length > 0) {
      const result = {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
      memCache[address] = result;
      persistentCache[address] = result;
      savePersistentCache();
      return result;
    }
    // Genuine miss — cache as null so we don't retry
    memCache[address] = null;
    return null;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log(`  ⚠️  Geocoding 429 rate limited for "${address.substring(0, 40)}" — cooling down 60s`);
      rateLimitedUntil = Date.now() + 60000; // 60-second global cooldown
      return null; // DON'T cache as null — address might work later
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || /timeout/i.test(error.message || '')) {
      console.log(`  ⚠️  Geocoding timeout for "${address.substring(0, 40)}"`);
    } else {
      console.log(`  ⚠️  Geocoding error for "${address.substring(0, 40)}": ${error.message}`);
    }
    return null;
  }
}

// ── Full geocode with address cleaning (replaces geocodeAddress) ────────────
async function geocodeAddress(address, city, state, zipCode) {
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
  let result = await tryGeocode(fullAddress);
  if (result) return result;

  // Strip suite/unit numbers
  const cleaned = address.replace(/,?\s*Suite\s+[A-Z0-9-]+/i, '').replace(/,?\s*#\s*[A-Z0-9-]+/i, '');
  if (cleaned !== address) {
    result = await tryGeocode(`${cleaned}, ${city}, ${state} ${zipCode}`);
    if (result) return result;
  }

  // Street name only + state + zip
  const streetOnly = cleaned.split(',')[0];
  result = await tryGeocode(`${streetOnly}, ${state} ${zipCode}`);
  if (result) return result;

  // ZIP-code only (accurate to ~2-5 miles)
  if (zipCode) {
    result = await tryGeocode(`${zipCode}, ${state}`);
    if (result) return result;
  }

  return null;
}

// ── Clean venue name for geocoding ─────────────────────────────────────────
function cleanVenueForGeocoding(venue) {
  if (!venue) return null;
  let cleaned = venue;

  // Extract venue from pipe-delimited names: "Baby Storytime | Denver Public Libraries" → "Denver Public Libraries"
  if (cleaned.includes('|')) {
    const parts = cleaned.split('|').map(p => p.trim());
    // The part AFTER the pipe is usually the venue; the part before is the event name
    // Pick the last part that looks like a place name (not an event description)
    cleaned = parts[parts.length - 1];
  }

  // Strip leading emojis and whitespace
  cleaned = cleaned.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\s]+/u, '');

  // Strip event-name prefixes that got mixed into venue: "Kids Workshop at The Home Depot" → "The Home Depot"
  const atMatch = cleaned.match(/\bat\s+(the\s+)?(.{4,})$/i);
  if (atMatch && atMatch[2]) {
    const afterAt = (atMatch[1] || '') + atMatch[2];
    // Only use the "at X" extraction if the result looks like a place name (>= 4 chars, not all lowercase generic words)
    if (afterAt.length >= 4) {
      cleaned = afterAt.trim();
    }
  }

  // Strip trailing event descriptions: "Home Depot - Kids Workshop" → "Home Depot"
  cleaned = cleaned.replace(/\s*[-–—]\s*(kids?|family|free|summer|spring|fall|winter)\b.*/i, '');

  // Strip "Kids Workshop" / "Kids Workshops" suffix
  cleaned = cleaned.replace(/\s+kids?\s+workshops?$/i, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned.length >= 3 ? cleaned : null;
}

// ── Venue-name geocoding (searches for named places, NOT street addresses) ──
async function geocodeVenue(venue, city, state, zipCode) {
  if (!venue) return null;

  // Skip venue names that are clearly not geocodable places
  const skipPatterns = /^(see website|n\/a|various|tbd|tba|online|virtual|everywhere|your home|contact for|check website|play at a|earth day|discover pass|free state|kids eat free|a local|local park|looking for)/i;
  if (skipPatterns.test(venue)) return null;

  // Clean the venue name (handle pipes, emoji prefixes, event-name contamination)
  const cleaned = cleanVenueForGeocoding(venue);
  if (!cleaned) return null;

  // Try with cleaned venue name first, then fall back to original if different
  const candidates = [cleaned];
  if (cleaned !== venue && venue.length >= 3) candidates.push(venue);

  for (const venueName of candidates) {
    // Try "Venue, City, State ZipCode" (most specific)
    if (city) {
      const withCityZip = zipCode
        ? `${venueName}, ${city}, ${state} ${zipCode}`
        : `${venueName}, ${city}, ${state}`;
      let result = await tryGeocode(withCityZip);
      if (result) return result;

      // Try without zip if we had one
      if (zipCode) {
        result = await tryGeocode(`${venueName}, ${city}, ${state}`);
        if (result) return result;
      }
    }

    // Try "Venue, State" (less specific — only for well-known places)
    if (!city) {
      const result = await tryGeocode(`${venueName}, ${state}`);
      if (result) return result;
    }
  }

  return null;
}

// ── City-center lookup (uses persistent cache from prior runs) ──────────────
async function getCityCenterCoords(city, state, zipCode) {
  if (!city) return null;

  // Check cache for "City, ST ZIP" or "City, ST"
  const withZip = `${city}, ${state} ${zipCode || ''}`.trim();
  const withoutZip = `${city}, ${state}`;

  if (persistentCache[withZip]) {
    memCache[withZip] = persistentCache[withZip];
    return persistentCache[withZip];
  }
  if (persistentCache[withoutZip]) {
    memCache[withoutZip] = persistentCache[withoutZip];
    return persistentCache[withoutZip];
  }

  // If not in 429 cooldown, try API
  if (Date.now() >= rateLimitedUntil) {
    const coords = await tryGeocode(withZip) || await tryGeocode(withoutZip);
    return coords;
  }

  return null;
}

module.exports = {
  tryGeocode,
  geocodeAddress,
  geocodeVenue,
  getCityCenterCoords,
  flushMacaroniGeocodeCache
};
