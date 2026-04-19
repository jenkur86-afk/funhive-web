#!/usr/bin/env node

/**
 * FIX FINAL DATA GAPS
 *
 * Fixes:
 *   1. 33 farm venues missing city/geohash/location — geocode "name, state"
 *   2. 7 venues missing scraper_name — infer from events or source
 *   3. 1 venue missing description — generate
 *   4. 840 events missing geohash+location — geocode from venue/city/state
 *   5. Any events with geohash but no location (derive geometry)
 *
 * Usage:
 *   node fix-final-gaps.js              # Dry run
 *   node fix-final-gaps.js --save       # Apply fixes
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
  if (geocodeCache[key] !== undefined) return geocodeCache[key];
  if (geocodeCache[query] !== undefined) return geocodeCache[query];

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
  console.log(`  FIX FINAL GAPS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  let totalFixed = 0;

  // ── 1. VENUES MISSING GEOHASH (farms) ──────────────────
  console.log('🌾 VENUES MISSING GEOHASH');
  console.log('─'.repeat(50));

  const acts = await fetchAll('activities', 'id, name, city, state, address, geohash, location, description, scraper_name, source, category');
  const noGeohashVenues = acts.filter(a => !a.geohash);
  console.log(`  Count: ${noGeohashVenues.length}`);

  const farmUpdates = [];
  for (const act of noGeohashVenues) {
    const stateName = STATE_NAMES[act.state] || act.state;
    let coords = null;

    // Try "Name, State"
    if (act.name && act.state) {
      coords = await forwardGeocode(`${act.name}, ${stateName}`);
    }

    // Try "Name Farm, State" if name doesn't include "farm"
    if (!coords && act.name && !/farm/i.test(act.name)) {
      coords = await forwardGeocode(`${act.name} Farm, ${stateName}`);
    }

    if (coords) {
      const geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const update = {
        id: act.id,
        geohash,
        location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`
      };
      const revGeo = await reverseGeocode(coords.latitude, coords.longitude);
      if (revGeo?.city && !act.city) update.city = revGeo.city;
      farmUpdates.push(update);
      console.log(`  ✅ ${act.name?.substring(0, 35)} → ${revGeo?.city || '?'}, ${act.state}`);
    } else {
      console.log(`  ❌ ${act.name?.substring(0, 35)} (${act.state})`);
    }
  }

  console.log(`  Can fix: ${farmUpdates.length}/${noGeohashVenues.length}`);
  if (!DRY_RUN && farmUpdates.length > 0) {
    let fixed = 0;
    for (const { id, ...fields } of farmUpdates) {
      const { error } = await supabase.from('activities').update(fields).eq('id', id);
      if (!error) fixed++;
    }
    console.log(`  💾 Fixed ${fixed} venues`);
    totalFixed += fixed;
  }

  // ── 2. VENUES MISSING SCRAPER_NAME ─────────────────────
  console.log('\n🏷️  VENUES MISSING SCRAPER_NAME');
  console.log('─'.repeat(50));

  const noScraperName = acts.filter(a => !a.scraper_name);
  console.log(`  Count: ${noScraperName.length}`);

  const events = await fetchAll('events', 'id, venue, scraper_name, activity_id, geohash, city, state, address, location');
  const evtScraperByActivity = {};
  const evtScraperByVenue = {};
  for (const e of events) {
    if (e.activity_id && e.scraper_name) evtScraperByActivity[e.activity_id] = e.scraper_name;
    if (e.venue && e.scraper_name) evtScraperByVenue[e.venue.toLowerCase().trim()] = e.scraper_name;
  }

  const scraperUpdates = [];
  for (const act of noScraperName) {
    let scraperName = evtScraperByActivity[act.id]
      || evtScraperByVenue[(act.name || '').toLowerCase().trim()]
      || act.source
      || null;
    if (scraperName) {
      scraperUpdates.push({ id: act.id, scraper_name: scraperName });
      console.log(`  ✅ ${act.name?.substring(0, 35)} → ${scraperName}`);
    } else {
      console.log(`  ❌ ${act.name?.substring(0, 35)}`);
    }
  }

  if (!DRY_RUN && scraperUpdates.length > 0) {
    let fixed = 0;
    for (const { id, ...fields } of scraperUpdates) {
      const { error } = await supabase.from('activities').update(fields).eq('id', id);
      if (!error) fixed++;
    }
    console.log(`  💾 Fixed ${fixed}`);
    totalFixed += fixed;
  }

  // ── 3. VENUE MISSING DESCRIPTION ───────────────────────
  console.log('\n📝 VENUES MISSING DESCRIPTION');
  console.log('─'.repeat(50));

  const noDesc = acts.filter(a => !a.description || a.description.trim() === '');
  console.log(`  Count: ${noDesc.length}`);

  if (!DRY_RUN && noDesc.length > 0) {
    let fixed = 0;
    for (const act of noDesc) {
      const parts = [act.name || 'Venue'];
      if (act.category) parts.push(`— ${act.category}`);
      if (act.city && act.state) parts.push(`in ${act.city}, ${act.state}`);
      else if (act.state) parts.push(`in ${act.state}`);
      const desc = parts.join(' ') + '. Visit for family-friendly activities and events.';
      const { error } = await supabase.from('activities').update({ description: desc }).eq('id', act.id);
      if (!error) fixed++;
    }
    console.log(`  💾 Fixed ${fixed}`);
    totalFixed += fixed;
  }

  // ── 4. EVENTS MISSING GEOHASH + LOCATION ───────────────
  console.log('\n📍 EVENTS MISSING LOCATION');
  console.log('─'.repeat(50));

  const noLocEvents = events.filter(e => !e.geohash && !e.location);
  console.log(`  Count: ${noLocEvents.length}`);

  // Build lookups
  const venueLookup = {};
  for (const a of acts) {
    if (a.name && a.geohash) venueLookup[a.name.toLowerCase().trim()] = a;
  }
  const eventVenueLookup = {};
  for (const e of events) {
    if (e.venue && e.geohash) eventVenueLookup[e.venue.toLowerCase().trim()] = { geohash: e.geohash, city: e.city };
  }

  // Analyze
  let hasVenue = 0, hasCity = 0, hasAddr = 0;
  for (const e of noLocEvents) { if (e.venue) hasVenue++; if (e.city) hasCity++; if (e.address) hasAddr++; }
  console.log(`  Has venue: ${hasVenue}, city: ${hasCity}, address: ${hasAddr}`);

  const eventUpdates = [];
  let src = { act: 0, evt: 0, geo_addr: 0, geo_venue: 0, geo_city: 0 };

  for (const evt of noLocEvents) {
    let geohash = null;
    let city = evt.city;

    // From activity lookup
    if (evt.venue) {
      const v = venueLookup[evt.venue.toLowerCase().trim()];
      if (v?.geohash) { geohash = v.geohash; if (!city && v.city) city = v.city; src.act++; }
    }

    // From event lookup
    if (!geohash && evt.venue) {
      const v = eventVenueLookup[evt.venue.toLowerCase().trim()];
      if (v?.geohash) { geohash = v.geohash; if (!city && v.city) city = v.city; src.evt++; }
    }

    // Geocode address + city + state
    if (!geohash && evt.address && evt.city && evt.state && apiCalls < 2000) {
      const coords = await forwardGeocode(`${evt.address}, ${evt.city}, ${evt.state}`);
      if (coords) { geohash = ngeohash.encode(coords.latitude, coords.longitude, 7); src.geo_addr++; }
    }

    // Geocode venue + city + state
    if (!geohash && evt.venue && evt.city && evt.state && apiCalls < 2000) {
      const coords = await forwardGeocode(`${evt.venue}, ${evt.city}, ${evt.state}`);
      if (coords) { geohash = ngeohash.encode(coords.latitude, coords.longitude, 7); src.geo_venue++; }
    }

    // Geocode venue + state
    if (!geohash && evt.venue && evt.state && apiCalls < 2000) {
      const coords = await forwardGeocode(`${evt.venue}, ${STATE_NAMES[evt.state] || evt.state}`);
      if (coords) { geohash = ngeohash.encode(coords.latitude, coords.longitude, 7); src.geo_venue++; }
    }

    // City + state (last resort)
    if (!geohash && evt.city && evt.state && apiCalls < 2000) {
      const coords = await forwardGeocode(`${evt.city}, ${STATE_NAMES[evt.state] || evt.state}`);
      if (coords) { geohash = ngeohash.encode(coords.latitude, coords.longitude, 7); src.geo_city++; }
    }

    if (geohash) {
      const { latitude, longitude } = ngeohash.decode(geohash);
      const update = { id: evt.id, geohash, location: `SRID=4326;POINT(${longitude} ${latitude})` };
      if (city && city !== evt.city) update.city = city;
      eventUpdates.push(update);
    }
  }

  console.log(`  Can fix: ${eventUpdates.length}/${noLocEvents.length}`);
  console.log(`    Activity lookup: ${src.act}`);
  console.log(`    Event lookup:    ${src.evt}`);
  console.log(`    Geocode addr:    ${src.geo_addr}`);
  console.log(`    Geocode venue:   ${src.geo_venue}`);
  console.log(`    Geocode city:    ${src.geo_city}`);

  if (!DRY_RUN && eventUpdates.length > 0) {
    let fixed = 0;
    for (let i = 0; i < eventUpdates.length; i++) {
      const { id, ...fields } = eventUpdates[i];
      const { error } = await supabase.from('events').update(fields).eq('id', id);
      if (!error) fixed++;
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${eventUpdates.length}`);
    }
    console.log(`  💾 Fixed ${fixed} events`);
    totalFixed += fixed;
  }

  // ── 5. EVENTS WITH GEOHASH BUT NO LOCATION ────────────
  console.log('\n🗺️  GEOHASH → LOCATION');
  console.log('─'.repeat(50));

  const hasGeohashNoLoc = events.filter(e => e.geohash && !e.location);
  console.log(`  Count: ${hasGeohashNoLoc.length}`);

  if (!DRY_RUN && hasGeohashNoLoc.length > 0) {
    let fixed = 0;
    for (const evt of hasGeohashNoLoc) {
      try {
        const { latitude, longitude } = ngeohash.decode(evt.geohash);
        const { error } = await supabase.from('events').update({
          location: `SRID=4326;POINT(${longitude} ${latitude})`
        }).eq('id', evt.id);
        if (!error) fixed++;
      } catch {}
    }
    console.log(`  💾 Fixed ${fixed}`);
    totalFixed += fixed;
  }

  // ── DONE ───────────────────────────────────────────────
  saveCache();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ COMPLETE — ${DRY_RUN ? 'would fix' : 'fixed'} ${totalFixed} items`);
  if (apiCalls > 0) console.log(`  📍 Nominatim API calls: ${apiCalls}`);
  if (DRY_RUN) console.log(`  ℹ️  Run with --save to apply fixes`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
