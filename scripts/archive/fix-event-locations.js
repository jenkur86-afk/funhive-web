#!/usr/bin/env node

/**
 * FIX EVENT LOCATIONS
 *
 * Fixes:
 *   1. Events with geohash but no PostGIS location geometry (799 expected)
 *   2. Events with location but no geohash (derive geohash from location)
 *
 * Usage:
 *   node fix-event-locations.js              # Dry run
 *   node fix-event-locations.js --save       # Apply fixes
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('../../scrapers/node_modules/ngeohash'); }

const DRY_RUN = !process.argv.includes('--save');

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

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX EVENT LOCATIONS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  let totalFixed = 0;

  // Load all events — we need geohash and location columns
  const allEvents = await fetchAll('events', 'id, name, geohash, location');
  console.log(`  Events loaded: ${allEvents.length}\n`);

  // ── 1. EVENTS WITH GEOHASH BUT NO LOCATION ────────────
  console.log('🗺️  EVENTS: GEOHASH → LOCATION');
  console.log('─'.repeat(50));

  const hasGeohashNoLocation = allEvents.filter(e => e.geohash && !e.location);
  console.log(`  Events with geohash but no location: ${hasGeohashNoLocation.length}`);

  if (!DRY_RUN && hasGeohashNoLocation.length > 0) {
    let fixed = 0;
    for (let i = 0; i < hasGeohashNoLocation.length; i++) {
      const evt = hasGeohashNoLocation[i];
      try {
        const { latitude, longitude } = ngeohash.decode(evt.geohash);
        const location = `SRID=4326;POINT(${longitude} ${latitude})`;
        const { error } = await supabase.from('events').update({ location }).eq('id', evt.id);
        if (!error) fixed++;
      } catch {}
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${hasGeohashNoLocation.length}`);
    }
    console.log(`  💾 Set location for ${fixed} events`);
    totalFixed += fixed;
  } else if (DRY_RUN) {
    console.log(`  Would fix: ${hasGeohashNoLocation.length}`);
  }

  // ── 2. EVENTS WITH LOCATION BUT NO GEOHASH ────────────
  console.log('\n📍 EVENTS: LOCATION → GEOHASH');
  console.log('─'.repeat(50));

  const hasLocationNoGeohash = allEvents.filter(e => e.location && !e.geohash);
  console.log(`  Events with location but no geohash: ${hasLocationNoGeohash.length}`);

  // For these we need to extract lat/lng from the PostGIS geometry
  // The location comes back as a WKT or GeoJSON from Supabase
  if (!DRY_RUN && hasLocationNoGeohash.length > 0) {
    let fixed = 0;
    for (const evt of hasLocationNoGeohash) {
      try {
        let lat, lng;
        if (typeof evt.location === 'string') {
          // WKT: "SRID=4326;POINT(lng lat)" or "POINT(lng lat)"
          const m = evt.location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
          if (m) { lng = parseFloat(m[1]); lat = parseFloat(m[2]); }
        } else if (evt.location?.coordinates) {
          // GeoJSON
          [lng, lat] = evt.location.coordinates;
        }
        if (lat && lng) {
          const geohash = ngeohash.encode(lat, lng, 7);
          const { error } = await supabase.from('events').update({ geohash }).eq('id', evt.id);
          if (!error) fixed++;
        }
      } catch {}
    }
    console.log(`  💾 Set geohash for ${fixed} events`);
    totalFixed += fixed;
  } else if (DRY_RUN) {
    console.log(`  Would fix: ${hasLocationNoGeohash.length}`);
  }

  // ── 3. SAME FOR ACTIVITIES ─────────────────────────────
  console.log('\n🏢 ACTIVITIES: GEOHASH → LOCATION');
  console.log('─'.repeat(50));

  const allActivities = await fetchAll('activities', 'id, name, geohash, location');
  console.log(`  Activities loaded: ${allActivities.length}`);

  const actGeohashNoLoc = allActivities.filter(a => a.geohash && !a.location);
  console.log(`  With geohash but no location: ${actGeohashNoLoc.length}`);

  if (!DRY_RUN && actGeohashNoLoc.length > 0) {
    let fixed = 0;
    for (let i = 0; i < actGeohashNoLoc.length; i++) {
      const act = actGeohashNoLoc[i];
      try {
        const { latitude, longitude } = ngeohash.decode(act.geohash);
        const location = `SRID=4326;POINT(${longitude} ${latitude})`;
        const { error } = await supabase.from('activities').update({ location }).eq('id', act.id);
        if (!error) fixed++;
      } catch {}
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${actGeohashNoLoc.length}`);
    }
    console.log(`  💾 Set location for ${fixed} activities`);
    totalFixed += fixed;
  } else if (DRY_RUN) {
    console.log(`  Would fix: ${actGeohashNoLoc.length}`);
  }

  // ── 4. RE-EXTRACT START_TIME FROM EVENT_DATE TEXT ──────
  console.log('\n⏰ EVENTS: RE-EXTRACT START_TIME');
  console.log('─'.repeat(50));

  // Load events missing start_time with their event_date text
  const eventsForTime = await fetchAll('events', 'id, event_date, start_time, description');
  const noStartTime = eventsForTime.filter(e => !e.start_time && e.event_date);
  console.log(`  Events missing start_time: ${noStartTime.length}`);

  // Re-use the same time extraction logic from supabase-adapter
  function _fmt12(h, m, ap) {
    if (h > 12) h -= 12; if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  }

  function extractTime(str) {
    if (!str || typeof str !== 'string') return null;
    str = str.trim();
    const isoM = str.match(/T(\d{2}):(\d{2})/);
    if (isoM) {
      let h = parseInt(isoM[1]); const m = isoM[2];
      if (h === 0 && m === '00') return null;
      const ap = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12; if (h === 0) h = 12;
      return `${h}:${m} ${ap}`;
    }
    const rm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (rm) return _fmt12(parseInt(rm[1]), rm[2], (rm[3] || 'AM').toUpperCase());
    const rn = str.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
    if (rn) return _fmt12(parseInt(rn[1]), '00', rn[2].toUpperCase());
    const sm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (sm) return _fmt12(parseInt(sm[1]), sm[2], sm[3].toUpperCase());
    const sn = str.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (sn) return _fmt12(parseInt(sn[1]), '00', sn[2].toUpperCase());
    return null;
  }

  const timeUpdates = [];
  for (const evt of noStartTime) {
    // Try event_date first, then description
    let time = extractTime(evt.event_date);
    if (!time && evt.description) time = extractTime(evt.description);
    if (time) {
      timeUpdates.push({ id: evt.id, start_time: time });
    }
  }

  console.log(`  Can extract time: ${timeUpdates.length}/${noStartTime.length}`);

  if (!DRY_RUN && timeUpdates.length > 0) {
    let fixed = 0;
    for (let i = 0; i < timeUpdates.length; i++) {
      const { id, start_time } = timeUpdates[i];
      const { error } = await supabase.from('events').update({ start_time }).eq('id', id);
      if (!error) fixed++;
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${timeUpdates.length}`);
    }
    console.log(`  💾 Set start_time for ${fixed} events`);
    totalFixed += fixed;
  } else if (DRY_RUN) {
    console.log(`  Would fix: ${timeUpdates.length}`);
  }

  // ── DONE ───────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ COMPLETE — ${DRY_RUN ? 'would fix' : 'fixed'} ${totalFixed} items`);
  if (DRY_RUN) console.log(`  ℹ️  Run with --save to apply fixes`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
