#!/usr/bin/env node
/**
 * BACKFILL EVENTS DATA (v2)
 *
 * Fixes events that are missing critical fields:
 * 1. Missing state — extracts from address, geocodes city to find state, reverse geocodes from location
 * 2. Missing geohash/location — geocodes using address/city/state and generates geohash + PostGIS point
 *
 * Usage:
 *   node backfill-events-data.js --dry-run       # Preview what would be fixed
 *   node backfill-events-data.js                  # Actually fix the data
 *   node backfill-events-data.js --state-only     # Only fix missing state
 *   node backfill-events-data.js --geo-only       # Only fix missing geohash/location
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
const ngeohash = require('ngeohash');

const DRY_RUN = process.argv.includes('--dry-run');
const STATE_ONLY = process.argv.includes('--state-only');
const GEO_ONLY = process.argv.includes('--geo-only');
const BATCH_SIZE = 50;
const PAGE_SIZE = 1000; // Supabase default max per query

// ── Nominatim rate limiter ──────────────────────────────────────────────────
let lastNominatimCall = 0;
let nominatimCalls = 0;
async function rateLimitedDelay() {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < 1100) {
    await new Promise(resolve => setTimeout(resolve, 1100 - elapsed));
  }
  lastNominatimCall = Date.now();
  nominatimCalls++;
}

// ── State abbreviation lookup ───────────────────────────────────────────────
const STATE_NAMES_TO_ABBR = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
  'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
  'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
  'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX',
  'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
  'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

const VALID_STATE_ABBRS = new Set(Object.values(STATE_NAMES_TO_ABBR));

/**
 * Paginated fetch — gets ALL rows matching a query, not just the first 1000
 */
async function fetchAllRows(queryBuilder) {
  const allRows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await queryBuilder
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break; // Last page
    offset += PAGE_SIZE;
  }
  return allRows;
}

/**
 * Try to extract state from address string
 */
function extractStateFromAddress(address) {
  if (!address) return null;

  // Try matching ", ST " or ", ST\d{5}" pattern (state abbreviation before zip)
  const abbrMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  if (abbrMatch && VALID_STATE_ABBRS.has(abbrMatch[1])) {
    return abbrMatch[1];
  }

  // Try matching ", State Name," or ", State Name \d{5}"
  const lowerAddr = address.toLowerCase();
  for (const [name, abbr] of Object.entries(STATE_NAMES_TO_ABBR)) {
    if (lowerAddr.includes(`, ${name},`) || lowerAddr.includes(`, ${name} `)) {
      return abbr;
    }
  }

  // Try just finding a 2-letter state code at word boundaries
  const parts = address.split(/[,\s]+/);
  for (const part of parts) {
    if (part.length === 2 && VALID_STATE_ABBRS.has(part.toUpperCase())) {
      return part.toUpperCase();
    }
  }

  return null;
}

/**
 * Geocode an address using Nominatim (OSM) — returns { lat, lng, state } or null
 */
async function geocodeAddress(query) {
  await rateLimitedDelay();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&addressdetails=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FunHive-Backfill/1.0 (jenkur86@gmail.com)' }
    });
    const results = await response.json();
    if (results && results.length > 0) {
      const r = results[0];
      let state = null;
      if (r.address?.state) {
        state = STATE_NAMES_TO_ABBR[r.address.state.toLowerCase()] || null;
      }
      return {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        state,
        display: r.display_name
      };
    }
  } catch (err) {
    // Silently fail, will be counted in stats
  }
  return null;
}

/**
 * Reverse geocode to get state from coordinates
 */
async function reverseGeocodeForState(lat, lng) {
  await rateLimitedDelay();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FunHive-Backfill/1.0 (jenkur86@gmail.com)' }
    });
    const result = await response.json();
    if (result?.address?.state) {
      const stateName = result.address.state.toLowerCase();
      return STATE_NAMES_TO_ABBR[stateName] || null;
    }
  } catch (err) {
    // Silently fail
  }
  return null;
}

// ── City→State cache (populated by geocoding, avoids re-geocoding same city) ──
const cityStateCache = new Map();

/**
 * Geocode a city name to determine its state
 */
async function getCityState(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  if (cityStateCache.has(key)) return cityStateCache.get(key);

  const result = await geocodeAddress(`${city}, United States`);
  const state = result?.state || null;
  cityStateCache.set(key, state);
  return state;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           FUNHIVE EVENT DATA BACKFILL (v2)                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('🔍 DRY RUN MODE — no changes will be made\n');

  const stats = {
    stateFixed: 0, stateFailed: 0,
    geoFixed: 0, geoFailed: 0,
    totalProcessed: 0
  };

  // ── PHASE 1: Fix missing state ──────────────────────────────────────────
  if (!GEO_ONLY) {
    console.log('\n📍 PHASE 1: Fixing events with missing state field...');
    console.log('  Fetching all events with missing state (paginated)...');

    let noStateEvents;
    try {
      noStateEvents = await fetchAllRows(
        supabase
          .from('events')
          .select('id, name, city, address, zip_code, venue, location')
          .is('state', null)
          .order('id')
      );
    } catch (err) {
      console.error('  ❌ Error fetching events:', err.message);
      noStateEvents = [];
    }

    console.log(`  Found ${noStateEvents.length} events missing state`);

    const updates = [];
    let fromAddress = 0, fromCityGeo = 0, fromReverseGeo = 0;

    for (let i = 0; i < noStateEvents.length; i++) {
      const event = noStateEvents[i];
      let state = null;

      // Strategy 1: Extract from address field
      if (!state && event.address) {
        state = extractStateFromAddress(event.address);
        if (state) fromAddress++;
      }

      // Strategy 2: Extract from venue field (sometimes has full address)
      if (!state && event.venue) {
        state = extractStateFromAddress(event.venue);
        if (state) fromAddress++;
      }

      // Strategy 3: Geocode the city name to find its state
      if (!state && event.city) {
        state = await getCityState(event.city);
        if (state) fromCityGeo++;
      }

      // Strategy 4: Reverse geocode from existing location coordinates
      if (!state && event.location) {
        const pointMatch = String(event.location).match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
        if (pointMatch) {
          const lng = parseFloat(pointMatch[1]);
          const lat = parseFloat(pointMatch[2]);
          state = await reverseGeocodeForState(lat, lng);
          if (state) fromReverseGeo++;
        }
      }

      if (state) {
        updates.push({ id: event.id, state });
        stats.stateFixed++;
      } else {
        stats.stateFailed++;
        if (stats.stateFailed <= 10) {
          console.log(`  ⚠️  Could not determine state for: "${event.name}" (city: ${event.city || 'none'}, addr: ${event.address ? 'yes' : 'no'}, loc: ${event.location ? 'yes' : 'no'})`);
        }
      }

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r  Processing ${i + 1}/${noStateEvents.length}... (${updates.length} fixable, ${nominatimCalls} API calls)`);
      }
    }

    console.log(`\n\n  State resolution: ${stats.stateFixed} fixable, ${stats.stateFailed} unfixable`);
    console.log(`    From address: ${fromAddress} | From city geocode: ${fromCityGeo} | From reverse geocode: ${fromReverseGeo}`);
    console.log(`    City cache entries: ${cityStateCache.size} (saved ${noStateEvents.length - cityStateCache.size - fromAddress - fromReverseGeo} API calls)`);

    // Apply updates in batches
    if (!DRY_RUN && updates.length > 0) {
      console.log(`  💾 Applying ${updates.length} state updates...`);
      let applied = 0;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        for (const { id, state } of batch) {
          const { error } = await supabase
            .from('events')
            .update({ state })
            .eq('id', id);
          if (!error) applied++;
        }
        process.stdout.write(`\r  Updated ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}...`);
      }
      console.log(`\n  ✅ Applied ${applied} state updates`);
    }
  }

  // ── PHASE 2: Fix missing geohash/location ─────────────────────────────
  if (!STATE_ONLY) {
    console.log('\n🌐 PHASE 2: Fixing events with missing geohash or location...');
    console.log('  Fetching all events with missing geohash/location (paginated)...');

    let noGeoEvents;
    try {
      noGeoEvents = await fetchAllRows(
        supabase
          .from('events')
          .select('id, name, address, city, state, zip_code, venue, geohash, location')
          .or('geohash.is.null,location.is.null')
          .order('id')
      );
    } catch (err) {
      console.error('  ❌ Error fetching events:', err.message);
      noGeoEvents = [];
    }

    console.log(`  Found ${noGeoEvents.length} events missing geohash or location`);

    // Separate into quick fixes (has location but no geohash) vs needs geocoding
    const quickFixes = [];
    const needsGeocoding = [];

    for (const event of noGeoEvents) {
      if (event.location && !event.geohash) {
        const pointMatch = String(event.location).match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
        if (pointMatch) {
          const lng = parseFloat(pointMatch[1]);
          const lat = parseFloat(pointMatch[2]);
          const geohash = ngeohash.encode(lat, lng, 7);
          quickFixes.push({ id: event.id, geohash });
        } else {
          needsGeocoding.push(event);
        }
      } else {
        needsGeocoding.push(event);
      }
    }

    console.log(`  Quick fixes (has location, missing geohash): ${quickFixes.length}`);
    console.log(`  Needs geocoding: ${needsGeocoding.length}`);

    // Apply quick fixes immediately
    if (!DRY_RUN && quickFixes.length > 0) {
      console.log(`  💾 Applying ${quickFixes.length} quick geohash fixes...`);
      let applied = 0;
      for (const { id, geohash } of quickFixes) {
        const { error } = await supabase
          .from('events')
          .update({ geohash })
          .eq('id', id);
        if (!error) applied++;
      }
      console.log(`  ✅ Applied ${applied} geohash fixes`);
    }
    stats.geoFixed += quickFixes.length;

    // Cache geocode results by city+state to avoid redundant API calls
    const geoCache = new Map();
    const updates = [];
    let fromFullAddr = 0, fromCityState = 0, fromVenue = 0, fromCache = 0;

    for (let i = 0; i < needsGeocoding.length; i++) {
      const event = needsGeocoding[i];
      stats.totalProcessed++;

      let coords = null;
      const cacheKey = `${(event.city || '').toLowerCase()}|${(event.state || '').toLowerCase()}`;

      // Check cache first (same city+state = same coordinates is good enough)
      if (event.city && event.state && geoCache.has(cacheKey)) {
        coords = geoCache.get(cacheKey);
        if (coords) fromCache++;
      }

      // Try full address
      if (!coords && event.address && event.city && event.state) {
        const query = `${event.address}, ${event.city}, ${event.state} ${event.zip_code || ''}`.trim();
        coords = await geocodeAddress(query);
        if (coords) fromFullAddr++;
      }

      // Try city + state
      if (!coords && event.city && event.state) {
        coords = await geocodeAddress(`${event.city}, ${event.state}`);
        if (coords) {
          fromCityState++;
          geoCache.set(cacheKey, coords); // Cache for other events in same city
        }
      }

      // Try venue name + city + state
      if (!coords && event.venue && event.city) {
        const venueQuery = event.state
          ? `${event.venue}, ${event.city}, ${event.state}`
          : `${event.venue}, ${event.city}`;
        coords = await geocodeAddress(venueQuery);
        if (coords) fromVenue++;
      }

      // Try just city (last resort, less accurate)
      if (!coords && event.city) {
        coords = await geocodeAddress(`${event.city}, US`);
        if (coords) {
          fromCityState++;
          if (event.state) geoCache.set(cacheKey, coords);
        }
      }

      if (coords) {
        const geohash = ngeohash.encode(coords.lat, coords.lng, 7);
        const location = `SRID=4326;POINT(${coords.lng} ${coords.lat})`;
        const update = { id: event.id };
        if (!event.geohash) update.geohash = geohash;
        if (!event.location) update.location = location;
        updates.push(update);
        stats.geoFixed++;
      } else {
        stats.geoFailed++;
        if (stats.geoFailed <= 10) {
          console.log(`  ⚠️  Could not geocode: "${event.name}" (city: ${event.city || 'none'}, state: ${event.state || 'none'}, addr: ${event.address ? 'yes' : 'no'})`);
        }
      }

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r  Geocoding ${i + 1}/${needsGeocoding.length}... (${updates.length} fixable, ${nominatimCalls} API calls)`);
      }
    }

    console.log(`\n\n  Geocoding resolution: ${stats.geoFixed} total fixed (${quickFixes.length} quick + ${updates.length} geocoded)`);
    console.log(`    From full address: ${fromFullAddr} | From city+state: ${fromCityState} | From venue: ${fromVenue} | From cache: ${fromCache}`);
    console.log(`    Unfixable: ${stats.geoFailed} | Geo cache entries: ${geoCache.size} | Total API calls: ${nominatimCalls}`);

    // Apply geocoded updates in batches
    if (!DRY_RUN && updates.length > 0) {
      console.log(`  💾 Applying ${updates.length} geocoded updates...`);
      let applied = 0;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        for (const update of batch) {
          const id = update.id;
          const fields = { ...update };
          delete fields.id;
          const { error } = await supabase
            .from('events')
            .update(fields)
            .eq('id', id);
          if (!error) applied++;
        }
        process.stdout.write(`\r  Updated ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}...`);
      }
      console.log(`\n  ✅ Applied ${applied} geocoded updates`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     BACKFILL SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (!GEO_ONLY) {
    console.log(`  State:    ${stats.stateFixed} fixed, ${stats.stateFailed} could not resolve`);
  }
  if (!STATE_ONLY) {
    console.log(`  Geo:      ${stats.geoFixed} fixed, ${stats.geoFailed} could not geocode`);
  }
  console.log(`  API calls: ${nominatimCalls} total to Nominatim`);
  if (DRY_RUN) {
    console.log('\n  🔍 This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n  ✅ All updates applied. Run data-quality-check.js to verify.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
