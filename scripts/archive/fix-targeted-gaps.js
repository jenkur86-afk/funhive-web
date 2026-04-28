#!/usr/bin/env node

/**
 * TARGETED FIX — addresses specific remaining data gaps:
 *
 *   1. Parse 20 KOAA event venue fields to extract address/city/state → geocode
 *   2. Fix 6 events missing state (DC Power Club → DC, online events)
 *   3. Delete 15 junk wordpress-VA "events" (error messages, category headers)
 *   4. Delete 7 junk CA city-name "venues" (data artifacts)
 *   5. Try to geocode 32 farm venues using website URL scraping + search
 *
 * Usage:
 *   node fix-targeted-gaps.js              # Dry run
 *   node fix-targeted-gaps.js --save       # Apply fixes
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('../../scrapers/node_modules/ngeohash'); }
let axios;
try { axios = require('axios'); } catch { axios = require('../../scrapers/node_modules/axios'); }
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
  if (geocodeCache[key] !== undefined) return geocodeCache[key];
  if (geocodeCache[query] !== undefined) return geocodeCache[query];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rateLimitedDelay();
      apiCalls++;
      const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: query, format: 'json', limit: 1, countrycodes: 'us', addressdetails: 1 },
        headers: { 'User-Agent': 'FunHive-Fix/1.0 (jenkur86@gmail.com)' },
        timeout: 10000
      });
      if (resp.data?.length > 0) {
        const r = resp.data[0];
        const a = r.address || {};
        const result = {
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          display_name: r.display_name || '',
          city: a.city || a.town || a.village || a.hamlet || '',
          state: a.state || '',
          road: a.road || '',
          house_number: a.house_number || '',
          postcode: a.postcode || ''
        };
        geocodeCache[key] = result;
        if (apiCalls % 20 === 0) saveCache();
        return result;
      }
      geocodeCache[key] = null;
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
          zip_code: a.postcode || '',
          road: a.road || '',
          house_number: a.house_number || ''
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
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

const STATE_ABBREVS = {};
for (const [abbr, name] of Object.entries(STATE_NAMES)) STATE_ABBREVS[name.toLowerCase()] = abbr;

/**
 * Parse a KOAA venue field that contains address info like:
 *   "Shipgarten, 7581 Colshire Dr, McLean, VA 22102, United States \n See map: Google Maps"
 *   "Baker Park, North Bentz Street, Frederick, MD, USA \n See map: Google Maps"
 *   "Lake Fairfax Park, 1400 Lake Fairfax Dr, Reston, VA 20190, USA \n See map: Google Maps"
 *   "100 Potomac Ave Audi Field"
 */
function parseKOAAVenue(venueStr) {
  if (!venueStr) return null;

  // Strip "See map: Google Maps" suffix and trailing whitespace
  let cleaned = venueStr.replace(/\s*See\s*map:\s*Google\s*Maps\s*/gi, '').trim();
  // Strip "United States" / "USA"
  cleaned = cleaned.replace(/,?\s*(United States|USA)\s*$/i, '').trim();

  // Try to extract: Venue Name, [Street Address,] City, STATE [ZIP]
  // Pattern 1: "Name, Address, City, ST ZIP"
  const fullMatch = cleaned.match(/^(.+?),\s*(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
  if (fullMatch) {
    return {
      venueName: fullMatch[1].trim(),
      address: fullMatch[2].trim(),
      city: fullMatch[3].trim(),
      state: fullMatch[4],
      zip: (fullMatch[5] || '').trim()
    };
  }

  // Pattern 2: "Name, Street, City, ST, ..." (no zip)
  const streetMatch = cleaned.match(/^(.+?),\s*([^,]+(?:Street|Road|Avenue|Drive|Boulevard|Blvd|Lane|Way|Pike|Pkwy|Parkway|Hwy|Highway|Rd|Dr|Ave|St|Ln|Ct|Pl|Circle|Trail|Tr)[^,]*),\s*([^,]+),\s*([A-Z]{2})/i);
  if (streetMatch) {
    return {
      venueName: streetMatch[1].trim(),
      address: streetMatch[2].trim(),
      city: streetMatch[3].trim(),
      state: streetMatch[4]
    };
  }

  // Pattern 3: "Name, City, ST ZIP" (no street)
  const nStreetMatch = cleaned.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
  if (nStreetMatch) {
    return {
      venueName: nStreetMatch[1].trim(),
      address: '',
      city: nStreetMatch[2].trim(),
      state: nStreetMatch[3],
      zip: (nStreetMatch[4] || '').trim()
    };
  }

  // Pattern 4: Just "Address City" like "100 Potomac Ave Audi Field"
  // Try to extract state from the whole string
  const stateMatch = cleaned.match(/\b(DC|MD|VA)\b/);
  if (stateMatch) {
    return {
      venueName: cleaned,
      address: '',
      city: '',
      state: stateMatch[1]
    };
  }

  return null;
}

async function fetchAll(table, select, filters) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select || '*');
    if (filters) q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) { console.error(`  Error: ${error.message}`); break; }
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
  console.log(`  TARGETED FIX — REMAINING DATA GAPS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── 1. DELETE 15 JUNK WORDPRESS-VA EVENTS ──────────
  console.log('🗑️  1. DELETE JUNK WORDPRESS-VA EVENTS');
  console.log('─'.repeat(50));

  const junkPatterns = [
    /^sorry there are no events/i,
    /^but don't give up/i,
    /^details:?$/i,
    /^event details:?$/i,
    /^export outlook \.ics file/i,
    /^early literacy$/i,
    /^technology training$/i,
    /^literacy & learning$/i,
    /^volunteer opportunity$/i,
    /^family$/i,
  ];

  // Get all wordpress-VA events without dates (the junk ones)
  const wpEvents = await fetchAll('events', 'id, name, event_date, date, scraper_name',
    q => q.eq('scraper_name', 'wordpress-VA').or('event_date.is.null,event_date.eq.'));
  const wpNoDate = wpEvents.filter(e => !e.event_date || e.event_date.trim() === '');

  // Also check for name-pattern junk that might have dates
  const wpAll = await fetchAll('events', 'id, name, scraper_name', q => q.eq('scraper_name', 'wordpress-VA'));
  const junkByName = wpAll.filter(e => junkPatterns.some(p => p.test((e.name || '').trim())));

  // Combine unique
  const junkIds = new Set([...wpNoDate.map(e => e.id), ...junkByName.map(e => e.id)]);
  const junkToDelete = [...junkIds];

  console.log(`  Found ${wpNoDate.length} without date + ${junkByName.length} name-pattern matches`);
  console.log(`  Total unique junk events to delete: ${junkToDelete.length}\n`);

  // Show them
  const allJunk = [...wpNoDate, ...junkByName].filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);
  for (const e of allJunk.slice(0, 20)) {
    console.log(`  🗑️  "${(e.name || '').substring(0, 60)}"`);
  }

  if (!DRY_RUN && junkToDelete.length > 0) {
    for (let i = 0; i < junkToDelete.length; i += 50) {
      const batch = junkToDelete.slice(i, i + 50);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) console.error(`  Error deleting: ${error.message}`);
    }
    console.log(`  ✅ Deleted ${junkToDelete.length} junk events`);
  }

  // ── 2. DELETE 7 JUNK CA CITY-NAME VENUES ───────────
  console.log('\n🗑️  2. DELETE JUNK CA CITY-NAME VENUES');
  console.log('─'.repeat(50));

  const junkVenueNames = ['San Clemente', 'Ladera Ranch', 'Laguna Beach', 'Tustin', 'Mobile Library', 'Westminster', 'Laguna Woods'];
  const { data: junkVenues } = await supabase.from('activities')
    .select('id, name, city, state, category')
    .in('name', junkVenueNames)
    .eq('category', 'Learning & Culture')
    .eq('city', 'Santa Ana');

  console.log(`  Found ${junkVenues?.length || 0} junk city-name venues\n`);
  for (const v of (junkVenues || [])) {
    console.log(`  🗑️  "${v.name}" [${v.category}] city=${v.city}`);
  }

  if (!DRY_RUN && junkVenues?.length > 0) {
    // First unlink any events
    for (const v of junkVenues) {
      await supabase.from('events').update({ activity_id: null }).eq('activity_id', v.id);
    }
    const { error } = await supabase.from('activities').delete().in('id', junkVenues.map(v => v.id));
    if (error) console.error(`  Error: ${error.message}`);
    else console.log(`  ✅ Deleted ${junkVenues.length} junk venues`);
  }

  // ── 3. FIX 20 KOAA EVENTS — PARSE VENUE ADDRESSES ─
  console.log('\n📍 3. FIX KOAA EVENTS — PARSE VENUE FIELD ADDRESSES');
  console.log('─'.repeat(50));

  const koaaNoGeo = await fetchAll('events', 'id, name, venue, city, state, address, geohash, scraper_name',
    q => q.is('geohash', null).eq('scraper_name', 'KidsOutAndAbout-DMV'));
  console.log(`  Found ${koaaNoGeo.length} KOAA events missing geohash\n`);

  let koaaFixed = 0;
  for (const e of koaaNoGeo) {
    const parsed = parseKOAAVenue(e.venue);
    if (!parsed) {
      console.log(`  ❌ Can't parse: "${(e.venue || '').substring(0, 60)}"`);
      continue;
    }

    console.log(`  📋 Parsed: venue="${parsed.venueName}" addr="${parsed.address}" city="${parsed.city}" state="${parsed.state}"`);

    // Build geocode query
    let coords = null;
    let method = '';
    const stateFull = STATE_NAMES[parsed.state] || parsed.state || '';

    // Try full address first
    if (parsed.address && parsed.city && stateFull) {
      coords = await forwardGeocode(`${parsed.address}, ${parsed.city}, ${stateFull}`);
      if (coords) method = 'full_addr';
    }

    // Try venue + city + state
    if (!coords && parsed.venueName && parsed.city && stateFull) {
      coords = await forwardGeocode(`${parsed.venueName}, ${parsed.city}, ${stateFull}`);
      if (coords) method = 'venue_city';
    }

    // Try venue + state
    if (!coords && parsed.venueName && stateFull) {
      coords = await forwardGeocode(`${parsed.venueName}, ${stateFull}`);
      if (coords) method = 'venue_state';
    }

    // Try city + state as fallback
    if (!coords && parsed.city && stateFull) {
      coords = await forwardGeocode(`${parsed.city}, ${stateFull}`);
      if (coords) method = 'city_center';
    }

    if (coords) {
      const gh = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const wkt = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;
      const city = parsed.city || coords.city || '';
      const state = parsed.state || '';

      console.log(`  ✅ "${(e.name || '').substring(0, 40)}" → ${method} (${gh}) ${city}, ${state}`);
      koaaFixed++;

      if (!DRY_RUN) {
        const update = { geohash: gh, location: wkt };
        if (!e.city && city) update.city = city;
        if (!e.state && state) update.state = state;
        if (!e.address && parsed.address) update.address = parsed.address;
        // Clean venue field — just keep the venue name, not the full address blob
        if (parsed.venueName && parsed.venueName !== e.venue) {
          update.venue = parsed.venueName;
        }
        await supabase.from('events').update(update).eq('id', e.id);
      }
    } else {
      console.log(`  ❌ "${(e.name || '').substring(0, 40)}" — geocode failed for parsed data`);
    }
  }
  console.log(`\n  Fixed: ${koaaFixed}/${koaaNoGeo.length}\n`);

  // ── 4. FIX 6 EVENTS MISSING STATE ─────────────────
  console.log('🗺️  4. FIX EVENTS MISSING STATE');
  console.log('─'.repeat(50));

  const noState = await fetchAll('events', 'id, name, venue, city, state, address, geohash, scraper_name',
    q => q.or('state.is.null,state.eq.'));
  const truly = noState.filter(e => !e.state || e.state.trim() === '');
  console.log(`  Found ${truly.length} events missing state\n`);

  let stateFixed = 0;
  for (const e of truly) {
    let state = null;
    let method = '';
    const name = (e.name || '').toLowerCase();
    const venue = (e.venue || '').toLowerCase();
    const city = (e.city || '').toLowerCase();

    // DC Power Football Club → DC
    if (name.includes('dc power') || name.includes('d.c. united') || venue.includes('audi field')) {
      state = 'DC'; method = 'known_dc';
    }
    // Venue contains state abbreviation
    else if (/\bDC\b/.test(e.venue || '')) { state = 'DC'; method = 'venue_state'; }
    else if (/\bMD\b/.test(e.venue || '')) { state = 'MD'; method = 'venue_state'; }
    else if (/\bVA\b/.test(e.venue || '')) { state = 'VA'; method = 'venue_state'; }
    // "ONLINE ONLY" events from KOAA-DMV → default to DC
    else if (venue.includes('online only') && e.scraper_name === 'KidsOutAndAbout-DMV') {
      state = 'DC'; method = 'online_dmv';
    }
    // Parse venue field for KOAA events
    else if (e.scraper_name === 'KidsOutAndAbout-DMV') {
      const parsed = parseKOAAVenue(e.venue);
      if (parsed?.state) { state = parsed.state; method = 'parsed_venue'; }
    }
    // City-based inference
    else if (['washington', 'dc'].includes(city)) { state = 'DC'; method = 'city_infer'; }
    else if (['indianapolis'].includes(city)) { state = 'IN'; method = 'city_infer'; }
    // Reverse geocode from geohash
    else if (e.geohash) {
      const { latitude: lat, longitude: lng } = ngeohash.decode(e.geohash);
      const rev = await reverseGeocode(lat, lng);
      if (rev?.state) {
        state = STATE_ABBREVS[rev.state.toLowerCase()] || rev.state;
        method = 'reverse_geo';
      }
    }

    if (state) {
      console.log(`  ✅ "${(e.name || '').substring(0, 50)}" → ${state} [${method}]`);
      stateFixed++;
      if (!DRY_RUN) {
        await supabase.from('events').update({ state }).eq('id', e.id);
      }
    } else {
      console.log(`  ❌ "${(e.name || '').substring(0, 50)}" — can't determine state`);
    }
  }
  console.log(`\n  Fixed: ${stateFixed}/${truly.length}\n`);

  // ── 5. TRY FARM VENUES AGAIN WITH BETTER STRATEGIES ─
  console.log('🌾 5. FARM VENUES — EXPANDED GEOCODING');
  console.log('─'.repeat(50));

  const farms = await fetchAll('activities', 'id, name, state, city, url, category, description',
    q => q.is('geohash', null));
  console.log(`  Found ${farms.length} venues still missing geohash\n`);

  let farmFixed = 0;
  for (const f of farms) {
    const stateFull = STATE_NAMES[f.state] || f.state || '';
    const name = (f.name || '').trim();
    if (!name || !stateFull) continue;

    let coords = null;
    let method = '';

    // Strategy 1: Name, State (already tried but let's be sure with cache)
    coords = await forwardGeocode(`${name}, ${stateFull}`);
    if (coords) { method = 'name_state'; }

    // Strategy 2: If has "Farm" in name, try without it and vice versa
    if (!coords) {
      if (/farm/i.test(name)) {
        const noFarm = name.replace(/\s*farm\s*/i, ' ').trim();
        coords = await forwardGeocode(`${noFarm}, ${stateFull}`);
        if (coords) method = 'name_no_farm';
      } else {
        coords = await forwardGeocode(`${name} Farm, ${stateFull}`);
        if (coords) method = 'name_plus_farm';
      }
    }

    // Strategy 3: Extract possible location hint from name
    if (!coords) {
      // "Schwartz Farms Mt. Vernon" → try "Mt. Vernon, Illinois"
      const locationHint = name.match(/\b(Mt\.?\s*\w+|St\.?\s*\w+|Fort\s+\w+|Lake\s+\w+|Mount\s+\w+)\b/i);
      if (locationHint) {
        coords = await forwardGeocode(`${locationHint[0]}, ${stateFull}`);
        if (coords) method = 'location_hint';
      }
    }

    // Strategy 4: Try the possessive/cleaned name (e.g., "Pryor's Orchard" → "Pryors Orchard")
    if (!coords) {
      const cleaned = name.replace(/['']s?\b/g, 's').replace(/[()]/g, '');
      if (cleaned !== name) {
        coords = await forwardGeocode(`${cleaned}, ${stateFull}`);
        if (coords) method = 'cleaned_name';
      }
    }

    if (coords) {
      const gh = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const wkt = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;

      let city = f.city;
      if (!city) {
        const rev = await reverseGeocode(coords.latitude, coords.longitude);
        if (rev?.city) city = rev.city;
      }

      console.log(`  ✅ ${name} [${f.state}] → ${method} (${gh}) ${city || ''}`);
      farmFixed++;

      if (!DRY_RUN) {
        const update = { geohash: gh, location: wkt };
        if (city && !f.city) update.city = city;
        await supabase.from('activities').update(update).eq('id', f.id);
      }
    } else {
      console.log(`  ❌ ${name} [${f.state}]`);
    }
  }
  console.log(`\n  Fixed: ${farmFixed}/${farms.length}\n`);

  // ── SAVE CACHE ─────────────────────────────────────
  saveCache();

  // ── SUMMARY ────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Junk WP-VA events deleted:  ${junkToDelete.length}`);
  console.log(`  Junk CA venues deleted:     ${junkVenues?.length || 0}`);
  console.log(`  KOAA events geocoded:       ${koaaFixed}/${koaaNoGeo.length}`);
  console.log(`  Events state fixed:         ${stateFixed}/${truly.length}`);
  console.log(`  Farm venues geocoded:       ${farmFixed}/${farms.length}`);
  console.log(`  API calls:                  ${apiCalls}`);

  if (DRY_RUN) {
    console.log(`\n  ⚠️  DRY RUN — run with --save to apply all fixes\n`);
  } else {
    console.log(`\n  ✅ All fixes applied!\n`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
