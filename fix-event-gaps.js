#!/usr/bin/env node

/**
 * FIX EVENT GAPS
 *
 * Targeted fixes for remaining data quality issues:
 *   1. Fix events with invalid state codes
 *   2. Fix events missing geohash (decode from existing geohash, venue lookup, or geocode)
 *   3. Fix events missing city (from venue/address/reverse geocode)
 *   4. Delete events missing event_date (unsalvageable)
 *   5. Fill events missing description (generate from name + venue + date)
 *
 * Schema notes:
 *   - Coordinates stored in PostGIS `location` geometry column (not lat/lng columns)
 *   - `geohash` is a 7-char string — decode with ngeohash to get lat/lng
 *   - `event_date` is TEXT, `date` is TIMESTAMPTZ
 *
 * Usage:
 *   node fix-event-gaps.js              # Dry run
 *   node fix-event-gaps.js --save       # Apply fixes
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('./scrapers/node_modules/ngeohash'); }
let axios;
try { axios = require('axios'); } catch { axios = require('./scrapers/node_modules/axios'); }
const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--save');

const VALID_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

const STATE_FROM_NAME = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
  'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY'
};

// Persistent geocode cache (shared with scrapers)
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
        console.log(`  ⏳ Rate limited, cooldown ${cooldown / 1000}s...`);
        await new Promise(r => setTimeout(r, cooldown));
        continue;
      }
      return null;
    }
  }
  return null;
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

async function fetchAll(table, select = '*') {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) { console.error(`  Error fetching ${table}: ${error.message}`); break; }
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
  console.log(`  FIX EVENT GAPS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  let totalFixed = 0;

  // Load all events with the columns that actually exist in the schema
  const allEvents = await fetchAll('events',
    'id, name, state, venue, city, address, zip_code, scraper_name, geohash, description, event_date, start_time'
  );
  console.log(`  Total events loaded: ${allEvents.length}\n`);

  if (allEvents.length === 0) {
    console.log('  ❌ No events loaded — check Supabase connection');
    process.exit(1);
  }

  // Build venue lookup from activities table (uses columns that exist)
  const activities = await fetchAll('activities', 'id, name, geohash, city, state, address, zip_code');
  const venueLookup = {};
  for (const a of activities) {
    if (a.name && a.geohash) {
      venueLookup[a.name.toLowerCase()] = a;
    }
  }
  console.log(`  Venue lookup from activities: ${Object.keys(venueLookup).length} venues\n`);

  // Also build event-to-event venue lookup (events that have full data can help fill siblings)
  const eventVenueLookup = {};
  for (const evt of allEvents) {
    if (evt.venue && evt.city && evt.state && evt.geohash) {
      const key = evt.venue.toLowerCase().trim();
      if (!eventVenueLookup[key]) {
        eventVenueLookup[key] = { city: evt.city, state: evt.state, geohash: evt.geohash, address: evt.address, zip_code: evt.zip_code };
      }
    }
  }
  console.log(`  Event-to-event venue lookup: ${Object.keys(eventVenueLookup).length} venues\n`);

  // ── 1. INVALID STATE CODES ──────────────────────────────
  console.log('🏛️ INVALID STATE CODES');
  console.log('─'.repeat(50));

  const invalidStateEvents = allEvents.filter(e => e.state && !VALID_STATES.includes(e.state));
  console.log(`  Invalid state codes: ${invalidStateEvents.length}`);

  const stateFixUpdates = [];
  for (const evt of invalidStateEvents) {
    let fixedState = null;

    // From scraper name: "WordPress-VA" → VA
    if (evt.scraper_name) {
      const m = evt.scraper_name.match(/[-_]([A-Z]{2})(?:\d|$|-|_)/i) || evt.scraper_name.match(/\b([A-Z]{2})$/);
      if (m && VALID_STATES.includes(m[1].toUpperCase())) fixedState = m[1].toUpperCase();
    }

    // From address
    if (!fixedState && evt.address) {
      const m = evt.address.match(/,\s*([A-Z]{2})\s+\d{5}/);
      if (m && VALID_STATES.includes(m[1])) fixedState = m[1];
    }

    // From venue lookup
    if (!fixedState && evt.venue) {
      const v = venueLookup[(evt.venue || '').toLowerCase()];
      if (v?.state && VALID_STATES.includes(v.state)) fixedState = v.state;
    }

    // From event-to-event lookup
    if (!fixedState && evt.venue) {
      const v = eventVenueLookup[(evt.venue || '').toLowerCase().trim()];
      if (v?.state && VALID_STATES.includes(v.state)) fixedState = v.state;
    }

    if (fixedState) {
      console.log(`  ✅ ${(evt.name || '').substring(0, 40)}: "${evt.state}" → "${fixedState}"`);
      stateFixUpdates.push({ id: evt.id, state: fixedState });
    } else {
      console.log(`  ❌ Cannot fix: ${(evt.name || '').substring(0, 40)} (state="${evt.state}", scraper="${evt.scraper_name}")`);
    }
  }

  if (!DRY_RUN && stateFixUpdates.length > 0) {
    for (const u of stateFixUpdates) {
      await supabase.from('events').update({ state: u.state }).eq('id', u.id);
    }
    console.log(`  💾 Fixed ${stateFixUpdates.length} state codes`);
    totalFixed += stateFixUpdates.length;
  }

  // ── 2. MISSING GEOHASH ──────────────────────────────────
  console.log('\n📍 MISSING GEOHASH');
  console.log('─'.repeat(50));

  const noGeohash = allEvents.filter(e => !e.geohash);
  console.log(`  Events missing geohash: ${noGeohash.length}`);

  const geohashUpdates = [];

  for (const evt of noGeohash) {
    let geohash = null;

    // Strategy 1: Copy from venue lookup (activities table)
    if (evt.venue) {
      const v = venueLookup[(evt.venue || '').toLowerCase()];
      if (v?.geohash) geohash = v.geohash;
    }

    // Strategy 2: Copy from event-to-event sibling
    if (!geohash && evt.venue) {
      const v = eventVenueLookup[(evt.venue || '').toLowerCase().trim()];
      if (v?.geohash) geohash = v.geohash;
    }

    // Strategy 3: Forward geocode from address/city
    if (!geohash) {
      const query = evt.address && evt.city && evt.state
        ? `${evt.address}, ${evt.city}, ${evt.state}`
        : evt.city && evt.state
          ? `${evt.city}, ${evt.state}`
          : evt.venue && evt.state
            ? `${evt.venue}, ${evt.state}`
            : null;

      if (query) {
        const coords = await forwardGeocode(query);
        if (coords) {
          geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
        }
      }
    }

    if (geohash) {
      geohashUpdates.push({ id: evt.id, geohash });
    }

    if (apiCalls > 400) {
      console.log(`  ⚠️ API call limit reached (${apiCalls}), stopping geocoding`);
      break;
    }
  }

  console.log(`  Can fix: ${geohashUpdates.length}/${noGeohash.length}`);

  if (!DRY_RUN && geohashUpdates.length > 0) {
    for (let i = 0; i < geohashUpdates.length; i++) {
      await supabase.from('events').update({ geohash: geohashUpdates[i].geohash }).eq('id', geohashUpdates[i].id);
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${geohashUpdates.length} geohash set`);
    }
    console.log(`  💾 Set geohash for ${geohashUpdates.length} events`);
    totalFixed += geohashUpdates.length;
  }

  // ── 3. MISSING CITY ─────────────────────────────────────
  console.log('\n🏙️ MISSING CITY');
  console.log('─'.repeat(50));

  const noCity = allEvents.filter(e => !e.city || e.city.trim() === '');
  console.log(`  Events missing city: ${noCity.length}`);

  const cityUpdates = [];

  for (const evt of noCity) {
    let city = null;

    // Strategy 1: Get from venue lookup (activities table)
    if (evt.venue) {
      const v = venueLookup[(evt.venue || '').toLowerCase()];
      if (v?.city) city = v.city;
    }

    // Strategy 2: Get from event-to-event siblings
    if (!city && evt.venue) {
      const v = eventVenueLookup[(evt.venue || '').toLowerCase().trim()];
      if (v?.city) city = v.city;
    }

    // Strategy 3: Extract from address string
    if (!city && evt.address) {
      const parts = evt.address.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2] || parts[1];
        if (candidate && candidate.length > 1 && !/^\d{5}/.test(candidate) && !/^[A-Z]{2}\s+\d{5}/.test(candidate)) {
          city = candidate;
        }
      }
    }

    // Strategy 4: Reverse geocode from geohash
    if (!city && evt.geohash) {
      try {
        const { latitude, longitude } = ngeohash.decode(evt.geohash);
        const result = await reverseGeocode(latitude, longitude);
        if (result?.city) city = result.city;
      } catch {}
    }

    if (city) {
      cityUpdates.push({ id: evt.id, city });
    }

    if (apiCalls > 600) {
      console.log(`  ⚠️ API limit, stopping city lookups`);
      break;
    }
  }

  console.log(`  Can fix: ${cityUpdates.length}/${noCity.length}`);

  if (!DRY_RUN && cityUpdates.length > 0) {
    for (let i = 0; i < cityUpdates.length; i++) {
      await supabase.from('events').update({ city: cityUpdates[i].city }).eq('id', cityUpdates[i].id);
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${cityUpdates.length} cities set`);
    }
    console.log(`  💾 Fixed city for ${cityUpdates.length} events`);
    totalFixed += cityUpdates.length;
  }

  // ── 4. EVENTS MISSING DATE ──────────────────────────────
  console.log('\n📅 EVENTS MISSING DATE');
  console.log('─'.repeat(50));

  const noDate = allEvents.filter(e => !e.event_date || e.event_date.trim() === '');
  console.log(`  Events with no date: ${noDate.length}`);

  for (const evt of noDate) {
    console.log(`  🗑️ ${DRY_RUN ? 'Would delete' : 'Deleting'}: "${(evt.name || 'unnamed').substring(0, 50)}" (no date)`);
  }

  if (!DRY_RUN && noDate.length > 0) {
    for (const evt of noDate) {
      await supabase.from('events').delete().eq('id', evt.id);
    }
    console.log(`  💾 Deleted ${noDate.length} dateless events`);
    totalFixed += noDate.length;
  }

  // ── 5. MISSING DESCRIPTIONS ─────────────────────────────
  console.log('\n📝 MISSING DESCRIPTIONS');
  console.log('─'.repeat(50));

  const noDesc = allEvents.filter(e => !e.description || e.description.trim() === '');
  console.log(`  Events missing description: ${noDesc.length}`);

  const descUpdates = [];
  for (const evt of noDesc) {
    const parts = [];
    if (evt.name) parts.push(evt.name);
    if (evt.venue) parts.push(`at ${evt.venue}`);
    if (evt.city && evt.state) parts.push(`in ${evt.city}, ${evt.state}`);
    else if (evt.city) parts.push(`in ${evt.city}`);
    if (evt.event_date) parts.push(`on ${evt.event_date}`);
    if (evt.start_time) parts.push(`at ${evt.start_time}`);

    if (parts.length > 1) {
      const desc = parts.join(' ') + '. Visit the event page for more details.';
      descUpdates.push({ id: evt.id, description: desc });
    }
  }

  console.log(`  Can generate: ${descUpdates.length}/${noDesc.length}`);

  if (!DRY_RUN && descUpdates.length > 0) {
    for (let i = 0; i < descUpdates.length; i++) {
      await supabase.from('events').update({ description: descUpdates[i].description }).eq('id', descUpdates[i].id);
      if ((i + 1) % 200 === 0) console.log(`    ...${i + 1}/${descUpdates.length} descriptions set`);
    }
    console.log(`  💾 Set description for ${descUpdates.length} events`);
    totalFixed += descUpdates.length;
  }

  // ── DONE ────────────────────────────────────────────────
  saveCache();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ COMPLETE — ${DRY_RUN ? 'would fix' : 'fixed'} ${totalFixed} items`);
  if (apiCalls > 0) console.log(`  📍 Nominatim API calls: ${apiCalls}`);
  if (DRY_RUN) console.log(`  ℹ️  Run with --save to apply fixes`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
