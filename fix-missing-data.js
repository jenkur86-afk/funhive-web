#!/usr/bin/env node

/**
 * FIX MISSING DATA IN VENUES AND EVENTS
 *
 * Fixes:
 *   1. Backfill venue scraper_name from linked events (7,868 null → inferred from events)
 *   2. Fill venue missing city/geohash/location from linked events or geocoding
 *   3. Fill venue missing descriptions (generate from name + category + city)
 *   4. Fill event missing geohash from venue lookup or geocoding
 *   5. Fill event missing city from venue lookup or reverse geocode
 *   6. Delete remaining past events
 *
 * Usage:
 *   node fix-missing-data.js              # Dry run
 *   node fix-missing-data.js --save       # Apply fixes
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('./scrapers/node_modules/ngeohash'); }
let axios;
try { axios = require('axios'); } catch { axios = require('./scrapers/node_modules/axios'); }
const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--save');

// Persistent geocode cache
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

async function batchUpdate(table, updates, label) {
  if (updates.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < updates.length; i++) {
    const { id, ...fields } = updates[i];
    const { error } = await supabase.from(table).update(fields).eq('id', id);
    if (!error) count++;
    if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${updates.length} ${label}`);
  }
  return count;
}

// ============================================================

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX MISSING DATA (VENUES + EVENTS)`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  let totalFixed = 0;

  // Load all data
  const activities = await fetchAll('activities',
    'id, name, description, category, subcategory, state, city, address, zip_code, geohash, scraper_name, source, location'
  );
  console.log(`  Activities loaded: ${activities.length}`);

  const events = await fetchAll('events',
    'id, name, state, venue, city, address, zip_code, scraper_name, geohash, description, event_date, date, start_time, activity_id'
  );
  console.log(`  Events loaded: ${events.length}\n`);

  // ── 1. BACKFILL VENUE SCRAPER_NAME ─────────────────────
  console.log('🏷️  VENUE SCRAPER_NAME BACKFILL');
  console.log('─'.repeat(50));

  const noScraperName = activities.filter(a => !a.scraper_name);
  console.log(`  Venues missing scraper_name: ${noScraperName.length}`);

  // Build: activity_id → most common scraper_name from events
  const activityScraperMap = {};
  for (const evt of events) {
    if (evt.activity_id && evt.scraper_name) {
      if (!activityScraperMap[evt.activity_id]) activityScraperMap[evt.activity_id] = {};
      activityScraperMap[evt.activity_id][evt.scraper_name] =
        (activityScraperMap[evt.activity_id][evt.scraper_name] || 0) + 1;
    }
  }

  // Also build: venue name (lowercase) → most common scraper_name from events
  const venueNameScraperMap = {};
  for (const evt of events) {
    if (evt.venue && evt.scraper_name) {
      const key = evt.venue.toLowerCase().trim();
      if (!venueNameScraperMap[key]) venueNameScraperMap[key] = {};
      venueNameScraperMap[key][evt.scraper_name] =
        (venueNameScraperMap[key][evt.scraper_name] || 0) + 1;
    }
  }

  function getMostCommon(countMap) {
    if (!countMap) return null;
    return Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  const scraperNameUpdates = [];
  const scraperNameSources = { event_link: 0, venue_name: 0, source_field: 0, category: 0 };

  for (const act of noScraperName) {
    let scraperName = null;

    // Strategy 1: From linked events via activity_id
    scraperName = getMostCommon(activityScraperMap[act.id]);
    if (scraperName) { scraperNameSources.event_link++; }

    // Strategy 2: From events sharing same venue name
    if (!scraperName) {
      scraperName = getMostCommon(venueNameScraperMap[(act.name || '').toLowerCase().trim()]);
      if (scraperName) scraperNameSources.venue_name++;
    }

    // Strategy 3: From the 'source' column
    if (!scraperName && act.source) {
      scraperName = act.source;
      scraperNameSources.source_field++;
    }

    // Strategy 4: Infer from category/subcategory
    if (!scraperName) {
      if (act.subcategory === 'Library' || act.category === 'Storytimes & Library') {
        scraperName = 'Event Save Helper';
        scraperNameSources.category++;
      }
    }

    if (scraperName) {
      scraperNameUpdates.push({ id: act.id, scraper_name: scraperName });
    }
  }

  console.log(`  Can fix: ${scraperNameUpdates.length}/${noScraperName.length}`);
  console.log(`    From event link:  ${scraperNameSources.event_link}`);
  console.log(`    From venue name:  ${scraperNameSources.venue_name}`);
  console.log(`    From source col:  ${scraperNameSources.source_field}`);
  console.log(`    From category:    ${scraperNameSources.category}`);

  if (!DRY_RUN && scraperNameUpdates.length > 0) {
    const fixed = await batchUpdate('activities', scraperNameUpdates, 'scraper_name set');
    console.log(`  💾 Set scraper_name for ${fixed} venues`);
    totalFixed += fixed;
  }

  // ── 2. VENUE MISSING CITY ──────────────────────────────
  console.log('\n🏙️  VENUE MISSING CITY');
  console.log('─'.repeat(50));

  const noCityVenues = activities.filter(a => !a.city || a.city.trim() === '');
  console.log(`  Venues missing city: ${noCityVenues.length}`);

  // Build event lookup: activity_id → event with city
  const activityCityMap = {};
  for (const evt of events) {
    if (evt.activity_id && evt.city) {
      activityCityMap[evt.activity_id] = { city: evt.city, state: evt.state, address: evt.address, zip_code: evt.zip_code };
    }
  }

  // Also: venue name → city from events
  const venueNameCityMap = {};
  for (const evt of events) {
    if (evt.venue && evt.city) {
      venueNameCityMap[evt.venue.toLowerCase().trim()] = { city: evt.city, state: evt.state };
    }
  }

  const venueCityUpdates = [];
  for (const act of noCityVenues) {
    let city = null;
    let state = null;

    // From linked events
    const evtData = activityCityMap[act.id];
    if (evtData?.city) { city = evtData.city; state = evtData.state; }

    // From events by venue name
    if (!city) {
      const nameData = venueNameCityMap[(act.name || '').toLowerCase().trim()];
      if (nameData?.city) { city = nameData.city; state = nameData.state; }
    }

    // From address string
    if (!city && act.address) {
      const parts = act.address.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2] || parts[1];
        if (candidate && candidate.length > 1 && !/^\d{5}/.test(candidate) && !/^[A-Z]{2}\s+\d{5}/.test(candidate)) {
          city = candidate;
        }
      }
    }

    // Reverse geocode from geohash
    if (!city && act.geohash && apiCalls < 500) {
      try {
        const { latitude, longitude } = ngeohash.decode(act.geohash);
        const result = await reverseGeocode(latitude, longitude);
        if (result?.city) city = result.city;
      } catch {}
    }

    if (city) {
      const update = { id: act.id, city };
      if (state && !act.state) update.state = state;
      venueCityUpdates.push(update);
    }
  }

  console.log(`  Can fix: ${venueCityUpdates.length}/${noCityVenues.length}`);

  if (!DRY_RUN && venueCityUpdates.length > 0) {
    const fixed = await batchUpdate('activities', venueCityUpdates, 'cities set');
    console.log(`  💾 Set city for ${fixed} venues`);
    totalFixed += fixed;
  }

  // ── 3. VENUE MISSING GEOHASH ───────────────────────────
  console.log('\n📍 VENUE MISSING GEOHASH');
  console.log('─'.repeat(50));

  const noGeohashVenues = activities.filter(a => !a.geohash);
  console.log(`  Venues missing geohash: ${noGeohashVenues.length}`);

  // Build event lookup: activity_id → geohash
  const activityGeohashMap = {};
  for (const evt of events) {
    if (evt.activity_id && evt.geohash) {
      activityGeohashMap[evt.activity_id] = evt.geohash;
    }
  }

  // venue name → geohash from events
  const venueNameGeohashMap = {};
  for (const evt of events) {
    if (evt.venue && evt.geohash) {
      venueNameGeohashMap[evt.venue.toLowerCase().trim()] = evt.geohash;
    }
  }

  // Also build from activities that DO have geohash (for name matching)
  const activityGeohashByName = {};
  for (const act of activities) {
    if (act.geohash && act.name) {
      activityGeohashByName[act.name.toLowerCase().trim()] = act.geohash;
    }
  }

  const venueGeohashUpdates = [];
  for (const act of noGeohashVenues) {
    let geohash = null;

    // From linked events
    geohash = activityGeohashMap[act.id];

    // From events by venue name
    if (!geohash) {
      geohash = venueNameGeohashMap[(act.name || '').toLowerCase().trim()];
    }

    // Forward geocode: address + city + state
    if (!geohash && act.address && act.city && act.state && apiCalls < 800) {
      const coords = await forwardGeocode(`${act.address}, ${act.city}, ${act.state}`);
      if (coords) geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
    }

    // Forward geocode: name + city + state (for well-known venues)
    if (!geohash && act.name && act.city && act.state && apiCalls < 800) {
      const coords = await forwardGeocode(`${act.name}, ${act.city}, ${act.state}`);
      if (coords) geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
    }

    // Forward geocode: city + state (last resort, gives city center)
    if (!geohash && act.city && act.state && apiCalls < 800) {
      const coords = await forwardGeocode(`${act.city}, ${act.state}`);
      if (coords) geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
    }

    if (geohash) {
      const update = { id: act.id, geohash };
      // Also set location if missing
      if (!act.location) {
        try {
          const { latitude, longitude } = ngeohash.decode(geohash);
          update.location = `SRID=4326;POINT(${longitude} ${latitude})`;
        } catch {}
      }
      venueGeohashUpdates.push(update);
    }
  }

  console.log(`  Can fix: ${venueGeohashUpdates.length}/${noGeohashVenues.length}`);

  if (!DRY_RUN && venueGeohashUpdates.length > 0) {
    const fixed = await batchUpdate('activities', venueGeohashUpdates, 'geohash set');
    console.log(`  💾 Set geohash for ${fixed} venues`);
    totalFixed += fixed;
  }

  // ── 4. VENUE MISSING LOCATION (has geohash but no PostGIS point) ────
  console.log('\n🗺️  VENUE MISSING LOCATION (has geohash)');
  console.log('─'.repeat(50));

  // Re-check: venues with geohash but no PostGIS location
  const hasGeohashNoLocation = activities.filter(a => a.geohash && !a.location);
  // Also include ones we just fixed
  const alsoFixed = venueGeohashUpdates.filter(u => u.location);
  console.log(`  Venues with geohash but no location: ${hasGeohashNoLocation.length}`);

  const locationUpdates = [];
  for (const act of hasGeohashNoLocation) {
    try {
      const { latitude, longitude } = ngeohash.decode(act.geohash);
      locationUpdates.push({
        id: act.id,
        location: `SRID=4326;POINT(${longitude} ${latitude})`
      });
    } catch {}
  }

  console.log(`  Can fix: ${locationUpdates.length}/${hasGeohashNoLocation.length}`);

  if (!DRY_RUN && locationUpdates.length > 0) {
    const fixed = await batchUpdate('activities', locationUpdates, 'locations set');
    console.log(`  💾 Set location for ${fixed} venues`);
    totalFixed += fixed;
  }

  // ── 5. VENUE MISSING DESCRIPTION ───────────────────────
  console.log('\n📝 VENUE MISSING DESCRIPTION');
  console.log('─'.repeat(50));

  const noDescVenues = activities.filter(a => !a.description || a.description.trim() === '');
  console.log(`  Venues missing description: ${noDescVenues.length}`);

  const venueDescUpdates = [];
  for (const act of noDescVenues) {
    const parts = [];
    if (act.name) parts.push(act.name);

    // Add category info
    if (act.subcategory && act.subcategory !== act.category) {
      parts.push(`— ${act.subcategory}`);
    } else if (act.category) {
      parts.push(`— ${act.category}`);
    }

    // Add location
    if (act.city && act.state) {
      parts.push(`in ${act.city}, ${act.state}`);
    } else if (act.city) {
      parts.push(`in ${act.city}`);
    } else if (act.state) {
      parts.push(`in ${act.state}`);
    }

    if (parts.length >= 1) {
      let desc = parts.join(' ');
      // Make it a proper sentence
      if (!desc.endsWith('.')) desc += '.';
      desc += ' Visit for family-friendly activities and events.';
      venueDescUpdates.push({ id: act.id, description: desc });
    }
  }

  console.log(`  Can fix: ${venueDescUpdates.length}/${noDescVenues.length}`);

  if (!DRY_RUN && venueDescUpdates.length > 0) {
    const fixed = await batchUpdate('activities', venueDescUpdates, 'descriptions set');
    console.log(`  💾 Set description for ${fixed} venues`);
    totalFixed += fixed;
  }

  // ── 6. EVENT MISSING GEOHASH ───────────────────────────
  console.log('\n📍 EVENT MISSING GEOHASH');
  console.log('─'.repeat(50));

  const noGeohashEvents = events.filter(e => !e.geohash);
  console.log(`  Events missing geohash: ${noGeohashEvents.length}`);

  // Rebuild venue lookups with potentially updated data
  const venueLookup = {};
  for (const a of activities) {
    if (a.name && a.geohash) {
      venueLookup[a.name.toLowerCase().trim()] = a;
    }
  }

  const eventGeohashUpdates = [];
  for (const evt of noGeohashEvents) {
    let geohash = null;

    // From activity (linked venue)
    if (evt.activity_id) {
      const linked = activities.find(a => a.id === evt.activity_id);
      if (linked?.geohash) geohash = linked.geohash;
    }

    // From venue name → activities lookup
    if (!geohash && evt.venue) {
      const v = venueLookup[(evt.venue || '').toLowerCase().trim()];
      if (v?.geohash) geohash = v.geohash;
    }

    // From venue name → events lookup
    if (!geohash && evt.venue) {
      geohash = venueNameGeohashMap[(evt.venue || '').toLowerCase().trim()];
    }

    // Forward geocode
    if (!geohash && apiCalls < 1000) {
      const query = evt.address && evt.city && evt.state
        ? `${evt.address}, ${evt.city}, ${evt.state}`
        : evt.venue && evt.city && evt.state
          ? `${evt.venue}, ${evt.city}, ${evt.state}`
          : evt.city && evt.state
            ? `${evt.city}, ${evt.state}`
            : null;
      if (query) {
        const coords = await forwardGeocode(query);
        if (coords) geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
      }
    }

    if (geohash) {
      eventGeohashUpdates.push({ id: evt.id, geohash });
    }
  }

  console.log(`  Can fix: ${eventGeohashUpdates.length}/${noGeohashEvents.length}`);

  if (!DRY_RUN && eventGeohashUpdates.length > 0) {
    const fixed = await batchUpdate('events', eventGeohashUpdates, 'geohash set');
    console.log(`  💾 Set geohash for ${fixed} events`);
    totalFixed += fixed;
  }

  // ── 7. EVENT MISSING CITY ──────────────────────────────
  console.log('\n🏙️  EVENT MISSING CITY');
  console.log('─'.repeat(50));

  const noCityEvents = events.filter(e => !e.city || e.city.trim() === '');
  console.log(`  Events missing city: ${noCityEvents.length}`);

  const eventCityUpdates = [];
  for (const evt of noCityEvents) {
    let city = null;

    // From linked activity
    if (evt.activity_id) {
      const linked = activities.find(a => a.id === evt.activity_id);
      if (linked?.city) city = linked.city;
    }

    // From venue lookup
    if (!city && evt.venue) {
      const v = venueLookup[(evt.venue || '').toLowerCase().trim()];
      if (v?.city) city = v.city;
    }

    // From events sharing same venue
    if (!city && evt.venue) {
      const nameData = venueNameCityMap[(evt.venue || '').toLowerCase().trim()];
      if (nameData?.city) city = nameData.city;
    }

    // From address
    if (!city && evt.address) {
      const parts = evt.address.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2] || parts[1];
        if (candidate && candidate.length > 1 && !/^\d{5}/.test(candidate) && !/^[A-Z]{2}\s+\d{5}/.test(candidate)) {
          city = candidate;
        }
      }
    }

    // Reverse geocode from geohash
    if (!city && evt.geohash && apiCalls < 1200) {
      try {
        const { latitude, longitude } = ngeohash.decode(evt.geohash);
        const result = await reverseGeocode(latitude, longitude);
        if (result?.city) city = result.city;
      } catch {}
    }

    if (city) {
      eventCityUpdates.push({ id: evt.id, city });
    }
  }

  console.log(`  Can fix: ${eventCityUpdates.length}/${noCityEvents.length}`);

  if (!DRY_RUN && eventCityUpdates.length > 0) {
    const fixed = await batchUpdate('events', eventCityUpdates, 'cities set');
    console.log(`  💾 Set city for ${fixed} events`);
    totalFixed += fixed;
  }

  // ── 8. PAST EVENTS CLEANUP ─────────────────────────────
  console.log('\n🗑️  PAST EVENTS CLEANUP');
  console.log('─'.repeat(50));

  const todayISO = new Date().toISOString().split('T')[0];

  function isDateInPast(dateStr) {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return d < new Date();
    } catch { return false; }
  }

  const { count: serverPastCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .lt('date', todayISO);
  console.log(`  Past events (server-side): ${serverPastCount || 0}`);

  const textPastEvents = events.filter(e => isDateInPast(e.event_date));
  console.log(`  Past events (client-side): ${textPastEvents.length}`);

  if (!DRY_RUN) {
    let deleted = 0;
    if (serverPastCount > 0) {
      const { error } = await supabase.from('events').delete().lt('date', todayISO);
      if (!error) { deleted += serverPastCount; console.log(`  💾 Server-side deleted ${serverPastCount}`); }
    }
    const remainingPast = textPastEvents.filter(e => !e.date || !isDateInPast(e.date));
    if (remainingPast.length > 0) {
      for (const evt of remainingPast) {
        const { error } = await supabase.from('events').delete().eq('id', evt.id);
        if (!error) deleted++;
      }
      console.log(`  💾 Client-side deleted ${remainingPast.length} more`);
    }
    totalFixed += deleted;
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
