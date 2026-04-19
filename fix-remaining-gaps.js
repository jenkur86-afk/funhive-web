#!/usr/bin/env node

/**
 * FIX REMAINING GAPS
 *
 * Targeted fix for the 263 events missing geohash and 242 missing city.
 *
 * Root causes:
 *   1. Festivals-Eastern-US (254): venue = festival name, no address/city.
 *      Fix: geocode "festival name, state", clean garbage city values.
 *   2. KidsOutAndAbout-DMV (5): venue contains full address + "See map: Google Maps".
 *      Fix: extract address from venue, geocode it.
 *   3. Macaroni Kid (4): venue = event name, no city.
 *      Fix: geocode "venue, state".
 *   4. Also fix the 45 venues missing city (reverse geocode from geohash).
 *
 * Usage:
 *   node fix-remaining-gaps.js              # Dry run
 *   node fix-remaining-gaps.js --save       # Apply fixes
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('./scrapers/node_modules/ngeohash'); }
let axios;
try { axios = require('axios'); } catch { axios = require('./scrapers/node_modules/axios'); }
const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--save');

const CACHE_FILE = path.join(__dirname, 'scrapers', '.geocode-cache.json');
let geocodeCache = {};
try {
  if (fs.existsSync(CACHE_FILE)) {
    geocodeCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`📍 Loaded ${Object.keys(geocodeCache).length} cached geocode results`);
  }
} catch { geocodeCache = {}; }

let lastNominatimCall = 0;
let rateLimitedUntil = 0;
let apiCalls = 0;

function saveCache() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(geocodeCache, null, 0)); } catch {}
}

async function rateLimitedDelay() {
  const now = Date.now();
  if (now < rateLimitedUntil) {
    const wait = rateLimitedUntil - now;
    console.log(`  ⏳ Cooldown: ${Math.ceil(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  const elapsed = Date.now() - lastNominatimCall;
  if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));
  lastNominatimCall = Date.now();
}

async function forwardGeocode(query) {
  const key = `fwd:${query}`;
  if (geocodeCache[key]) return geocodeCache[key];
  if (geocodeCache[query]) return geocodeCache[query];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rateLimitedDelay();
      apiCalls++;
      const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
        headers: { 'User-Agent': 'FunHive-Fix/1.0 (jenkur86@gmail.com)' },
        timeout: 10000
      });
      if (resp.data?.length > 0) {
        const result = { latitude: parseFloat(resp.data[0].lat), longitude: parseFloat(resp.data[0].lon) };
        geocodeCache[key] = result;
        geocodeCache[query] = result;
        if (apiCalls % 20 === 0) saveCache();
        return result;
      }
      geocodeCache[key] = null; // Cache misses too
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        const cooldown = Math.min(60000 * (attempt + 1), 180000);
        rateLimitedUntil = Date.now() + cooldown;
        await new Promise(r => setTimeout(r, cooldown));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function reverseGeocode(lat, lng) {
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache[key]) return geocodeCache[key];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rateLimitedDelay();
      apiCalls++;
      const resp = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json', addressdetails: 1 },
        headers: { 'User-Agent': 'FunHive-Fix/1.0 (jenkur86@gmail.com)' },
        timeout: 10000
      });
      if (resp.data?.address) {
        const a = resp.data.address;
        const result = {
          city: a.city || a.town || a.village || a.hamlet || a.county || '',
          state: a.state || '',
          zip_code: a.postcode || ''
        };
        geocodeCache[key] = result;
        if (apiCalls % 20 === 0) saveCache();
        return result;
      }
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        const cooldown = Math.min(60000 * (attempt + 1), 180000);
        rateLimitedUntil = Date.now() + cooldown;
        await new Promise(r => setTimeout(r, cooldown));
        continue;
      }
      return null;
    }
  }
  return null;
}

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

/**
 * Clean venue string from KidsOutAndAbout — extract address from venue field.
 * e.g. "Annmarie Sculpture Garden & Arts Center, Dowell Road, Solomons, MD, USA\n\nSee map: Google Maps"
 * → { venue: "Annmarie Sculpture Garden & Arts Center", address: "Dowell Road, Solomons, MD" }
 */
function cleanKOAAVenue(venue) {
  if (!venue) return null;

  // Remove "See map: Google Maps" and surrounding whitespace
  let cleaned = venue.replace(/\s*see\s*map\s*:\s*google\s*maps\s*/gi, '').trim();
  // Remove "USA" / "United States" at the end
  cleaned = cleaned.replace(/,?\s*(USA|United States)\s*$/i, '').trim();

  // If it contains a comma-separated address, split it
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
  if (parts.length >= 3) {
    // First part is the venue name, rest is the address
    const venueName = parts[0];
    const addressParts = parts.slice(1);
    return { venue: venueName, address: addressParts.join(', '), full: cleaned };
  }

  return { venue: cleaned, address: null, full: cleaned };
}

/**
 * Clean Festivals venue — often the venue IS the festival name.
 * Try to extract a real venue name or location from it.
 * e.g. "93rd Annual Dover Days Festival - Vendor & Parade Registration" → "Dover"
 */
function extractFestivalLocation(venue, city, state) {
  if (!venue) return [];

  // If city looks like garbage (contains festival terms), clear it
  const garbageCity = /festival|registration|parade|vendor|music|annual|birthplace|celebration/i;
  const cleanCity = (city && !garbageCity.test(city)) ? city : null;

  const queries = [];

  // If we have a clean city, that's our best bet
  if (cleanCity) {
    queries.push(`${cleanCity}, ${STATE_NAMES[state] || state}`);
  }

  // Try to extract a city/location name from the festival name
  // Pattern: "Dover Days Festival" → "Dover"
  // Pattern: "Lancaster Wheels and Wings Festival" → "Lancaster"
  const cityFromName = venue
    .replace(/\d+(st|nd|rd|th)\s+annual\s+/i, '')  // Remove "93rd Annual"
    .replace(/\bannual\b/i, '')
    .replace(/\b(festival|fest|celebration|fair|fling|jam|bash|fiesta)\b.*/i, '')  // Remove from "Festival" onwards
    .replace(/[-–—].*/g, '')  // Remove after dash
    .replace(/\b(music|food|art|wine|craft|beer|farm|garden|harvest|spring|summer|fall|winter|national|urban|county|state|rotary\s+club\s+of)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cityFromName && cityFromName.length >= 3 && cityFromName.length <= 30) {
    queries.push(`${cityFromName}, ${STATE_NAMES[state] || state}`);
  }

  // Try the full festival name + state (Nominatim sometimes knows festival locations)
  const shortVenue = venue.substring(0, 60);
  queries.push(`${shortVenue}, ${STATE_NAMES[state] || state}`);

  return queries;
}

async function fetchAll(table, select = '*') {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// ============================================================

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX REMAINING GAPS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  let totalFixed = 0;

  // ── 1. FIX EVENTS MISSING GEOHASH + CITY ───────────────
  console.log('📍 EVENTS MISSING GEOHASH (263 expected)');
  console.log('─'.repeat(50));

  const allEvents = await fetchAll('events',
    'id, name, venue, city, state, address, zip_code, geohash, scraper_name'
  );
  const missingGeohash = allEvents.filter(e => !e.geohash);
  console.log(`  Found: ${missingGeohash.length}\n`);

  const eventUpdates = [];
  let fixedBySource = { festivals: 0, koaa: 0, macaroni: 0, other: 0 };

  for (const evt of missingGeohash) {
    const scraper = evt.scraper_name || '';
    let coords = null;
    let city = null;
    let address = null;
    let venue = evt.venue;

    // ── KidsOutAndAbout: extract address from venue field ──
    if (scraper.includes('KidsOutAndAbout')) {
      const parsed = cleanKOAAVenue(evt.venue);
      if (parsed) {
        venue = parsed.venue;
        address = parsed.address;

        // Try geocoding the full cleaned string
        if (parsed.full) {
          coords = await forwardGeocode(parsed.full);
          if (coords) console.log(`  ✅ KOAA: "${evt.name?.substring(0, 40)}" → ${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`);
        }

        // Try just the address part
        if (!coords && parsed.address) {
          coords = await forwardGeocode(`${parsed.address}`);
          if (coords) console.log(`  ✅ KOAA addr: "${parsed.address?.substring(0, 40)}" → ${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`);
        }

        // Try venue name + state
        if (!coords && parsed.venue) {
          coords = await forwardGeocode(`${parsed.venue}, ${STATE_NAMES[evt.state] || evt.state}`);
          if (coords) console.log(`  ✅ KOAA venue: "${parsed.venue?.substring(0, 40)}" → ${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`);
        }

        if (coords) fixedBySource.koaa++;
      }
    }

    // ── Festivals-Eastern-US: extract location from festival name ──
    else if (scraper.includes('Festivals')) {
      const queries = extractFestivalLocation(evt.venue, evt.city, evt.state);

      for (const query of queries) {
        coords = await forwardGeocode(query);
        if (coords) {
          console.log(`  ✅ Festival: "${evt.name?.substring(0, 40)}" → query="${query.substring(0, 40)}" → ${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`);
          fixedBySource.festivals++;
          break;
        }
      }

      // Last resort: just the state (gives state center, better than nothing)
      if (!coords) {
        const stateQuery = STATE_NAMES[evt.state] || evt.state;
        coords = await forwardGeocode(stateQuery);
        if (coords) {
          console.log(`  ⚠️ Festival state-level: "${evt.name?.substring(0, 40)}" → ${evt.state}`);
          fixedBySource.festivals++;
        }
      }
    }

    // ── Macaroni Kid / other: try venue + state ──
    else {
      // Try venue + state
      if (evt.venue && evt.state) {
        coords = await forwardGeocode(`${evt.venue}, ${STATE_NAMES[evt.state] || evt.state}`);
        if (coords) {
          console.log(`  ✅ Other: "${evt.name?.substring(0, 40)}" → ${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`);
          fixedBySource.macaroni++;
        }
      }

      // Try state only as last resort
      if (!coords && evt.state) {
        const stateQuery = STATE_NAMES[evt.state] || evt.state;
        coords = await forwardGeocode(stateQuery);
        if (coords) {
          console.log(`  ⚠️ State-level: "${evt.name?.substring(0, 40)}" → ${evt.state}`);
          fixedBySource.other++;
        }
      }
    }

    if (coords) {
      const geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const update = {
        id: evt.id,
        geohash,
        location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`
      };

      // Fix city if missing — reverse geocode
      if (!evt.city || /festival|registration|parade|vendor|music|annual|birthplace/i.test(evt.city)) {
        const revGeo = await reverseGeocode(coords.latitude, coords.longitude);
        if (revGeo?.city) {
          update.city = revGeo.city;
          city = revGeo.city;
        }
      }

      // Fix venue if we cleaned it (KidsOutAndAbout)
      if (venue !== evt.venue && venue) {
        update.venue = venue;
      }
      if (address) {
        update.address = address;
      }

      // Clean garbage city values
      if (evt.city && /festival|registration|parade|vendor|music|annual|birthplace/i.test(evt.city)) {
        if (!update.city) update.city = null; // Clear garbage, will try reverse geocode
      }

      eventUpdates.push(update);
    }

    // Rate limit protection
    if (apiCalls > 800) {
      console.log(`\n  ⚠️ API call limit approaching (${apiCalls}), saving cache...`);
      saveCache();
    }
  }

  console.log(`\n  Results:`);
  console.log(`    Festivals fixed: ${fixedBySource.festivals}`);
  console.log(`    KOAA fixed:      ${fixedBySource.koaa}`);
  console.log(`    Macaroni fixed:  ${fixedBySource.macaroni}`);
  console.log(`    Other fixed:     ${fixedBySource.other}`);
  console.log(`    Total:           ${eventUpdates.length}/${missingGeohash.length}`);

  if (!DRY_RUN && eventUpdates.length > 0) {
    let saved = 0;
    for (let i = 0; i < eventUpdates.length; i++) {
      const { id, ...fields } = eventUpdates[i];
      const { error } = await supabase.from('events').update(fields).eq('id', id);
      if (!error) saved++;
      if ((i + 1) % 50 === 0) console.log(`    ...${i + 1}/${eventUpdates.length} saved`);
    }
    console.log(`  💾 Fixed ${saved} events`);
    totalFixed += saved;
  }

  // ── 2. FIX VENUES MISSING CITY ─────────────────────────
  console.log('\n🏙️  VENUES MISSING CITY (45 expected)');
  console.log('─'.repeat(50));

  const allActivities = await fetchAll('activities',
    'id, name, city, state, address, geohash, zip_code'
  );
  const noCityVenues = allActivities.filter(a => !a.city || a.city.trim() === '');
  console.log(`  Found: ${noCityVenues.length}`);

  const venueCityUpdates = [];
  for (const act of noCityVenues) {
    let city = null;

    // From address string
    if (act.address) {
      const parts = act.address.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2] || parts[1];
        if (candidate && candidate.length > 1 && !/^\d{5}/.test(candidate) && !/^[A-Z]{2}\s+\d{5}/.test(candidate)) {
          city = candidate;
        }
      }
    }

    // Reverse geocode from geohash
    if (!city && act.geohash) {
      try {
        const { latitude, longitude } = ngeohash.decode(act.geohash);
        const result = await reverseGeocode(latitude, longitude);
        if (result?.city) city = result.city;
      } catch {}
    }

    // Forward geocode venue name + state, then reverse geocode for city
    if (!city && act.name && act.state) {
      const coords = await forwardGeocode(`${act.name}, ${STATE_NAMES[act.state] || act.state}`);
      if (coords) {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        if (result?.city) city = result.city;

        // Also set geohash/location if missing
        if (!act.geohash) {
          const update = {
            id: act.id,
            city,
            geohash: ngeohash.encode(coords.latitude, coords.longitude, 7),
            location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`
          };
          venueCityUpdates.push(update);
          console.log(`  ✅ ${act.name?.substring(0, 40)} → ${city}`);
          continue;
        }
      }
    }

    if (city) {
      venueCityUpdates.push({ id: act.id, city });
      console.log(`  ✅ ${act.name?.substring(0, 40)} → ${city}`);
    }
  }

  console.log(`  Can fix: ${venueCityUpdates.length}/${noCityVenues.length}`);

  if (!DRY_RUN && venueCityUpdates.length > 0) {
    let saved = 0;
    for (const { id, ...fields } of venueCityUpdates) {
      const { error } = await supabase.from('activities').update(fields).eq('id', id);
      if (!error) saved++;
    }
    console.log(`  💾 Fixed ${saved} venue cities`);
    totalFixed += saved;
  }

  // ── DONE ───────────────────────────────────────────────
  saveCache();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ COMPLETE — ${DRY_RUN ? 'would fix' : 'fixed'} ${totalFixed} items`);
  console.log(`  📍 Nominatim API calls: ${apiCalls}`);
  if (DRY_RUN) console.log(`  ℹ️  Run with --save to apply fixes`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
