#!/usr/bin/env node

/**
 * Diagnose the last remaining unfixable items:
 *   - 113 events with location that couldn't be set
 *   - 33 farm venues that didn't geocode
 *   - 6 venues without scraper_name
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

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

async function main() {
  const events = await fetchAll('events', 'id, name, venue, city, state, address, zip_code, geohash, location, scraper_name, activity_id');
  const acts = await fetchAll('activities', 'id, name, city, state, geohash, location, scraper_name');

  // Build activity ID set for quick lookup
  const actById = {};
  for (const a of acts) actById[a.id] = a;

  // Events missing location
  const noLoc = events.filter(e => !e.location);
  console.log(`\n=== EVENTS MISSING LOCATION: ${noLoc.length} ===\n`);

  const byScraper = {};
  let hasActivityId = 0, activityHasGeohash = 0, activityMissing = 0;
  let noVenueMatch = 0;

  // Build venue lookup
  const venueLookup = {};
  for (const a of acts) {
    if (a.name && a.geohash) venueLookup[a.name.toLowerCase().trim()] = true;
  }
  const eventVenueLookup = {};
  for (const e of events) {
    if (e.venue && e.geohash) eventVenueLookup[e.venue.toLowerCase().trim()] = true;
  }

  for (const e of noLoc) {
    const s = e.scraper_name || 'unknown';
    byScraper[s] = (byScraper[s] || 0) + 1;

    if (e.activity_id) {
      hasActivityId++;
      const linked = actById[e.activity_id];
      if (linked?.geohash) activityHasGeohash++;
      else if (!linked) activityMissing++;
    }

    const vKey = (e.venue || '').toLowerCase().trim();
    if (!venueLookup[vKey] && !eventVenueLookup[vKey]) noVenueMatch++;
  }

  console.log(`By scraper:`);
  for (const [s, c] of Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${s.padEnd(50)} ${c}`);
  }

  console.log(`\nHas activity_id: ${hasActivityId}`);
  console.log(`  Linked activity HAS geohash: ${activityHasGeohash}`);
  console.log(`  Linked activity MISSING from DB: ${activityMissing}`);
  console.log(`No venue match in activities or events: ${noVenueMatch}`);

  // Show samples grouped by scraper
  const topScrapers = Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [scraper] of topScrapers) {
    console.log(`\n  --- ${scraper} ---`);
    const samples = noLoc.filter(e => (e.scraper_name || 'unknown') === scraper).slice(0, 5);
    for (const e of samples) {
      const linked = e.activity_id ? actById[e.activity_id] : null;
      console.log(`    "${(e.name || '').substring(0, 50)}"`);
      console.log(`      venue="${(e.venue || '').substring(0, 40)}" city=${e.city || 'none'} state=${e.state} addr="${(e.address || '').substring(0, 35)}"`);
      console.log(`      activity_id=${e.activity_id ? 'YES' : 'no'} linked_geohash=${linked?.geohash ? 'YES' : 'no'} linked_loc=${linked?.location ? 'YES' : 'no'}`);
    }
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
