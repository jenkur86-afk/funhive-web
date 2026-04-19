#!/usr/bin/env node

/**
 * DIAGNOSE MISSING DATA
 *
 * Detailed analysis of events missing geohash (263) and city (242)
 * to understand WHY the fix script couldn't fix them and find alternative approaches.
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

async function fetchAll(table, select, filters = {}) {
  let all = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    for (const [key, val] of Object.entries(filters)) {
      if (val === null) query = query.is(key, null);
      else query = query.eq(key, val);
    }
    const { data, error } = await query;
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log('Loading events missing geohash...\n');

  // Get events missing geohash
  const noGeohash = await fetchAll('events',
    'id, name, venue, city, state, address, zip_code, geohash, scraper_name, activity_id, event_date',
    {}
  );
  const missingGeohash = noGeohash.filter(e => !e.geohash);

  console.log(`Total events missing geohash: ${missingGeohash.length}\n`);

  // Analyze what data they DO have
  let hasVenue = 0, hasCity = 0, hasState = 0, hasAddress = 0, hasZip = 0, hasActivityId = 0;
  let hasVenueAndCity = 0, hasAddressAndCity = 0, hasCityAndState = 0;
  let hasNothing = 0;

  const bySource = {};
  const byState = {};
  const sampleEvents = [];

  for (const evt of missingGeohash) {
    if (evt.venue) hasVenue++;
    if (evt.city) hasCity++;
    if (evt.state) hasState++;
    if (evt.address) hasAddress++;
    if (evt.zip_code) hasZip++;
    if (evt.activity_id) hasActivityId++;
    if (evt.venue && evt.city) hasVenueAndCity++;
    if (evt.address && evt.city) hasAddressAndCity++;
    if (evt.city && evt.state) hasCityAndState++;
    if (!evt.venue && !evt.city && !evt.address && !evt.zip_code) hasNothing++;

    const src = evt.scraper_name || 'unknown';
    bySource[src] = (bySource[src] || 0) + 1;

    const st = evt.state || 'no-state';
    byState[st] = (byState[st] || 0) + 1;
  }

  console.log('=== EVENTS MISSING GEOHASH — DATA AVAILABILITY ===');
  console.log(`  Has venue:          ${hasVenue}/${missingGeohash.length}`);
  console.log(`  Has city:           ${hasCity}/${missingGeohash.length}`);
  console.log(`  Has state:          ${hasState}/${missingGeohash.length}`);
  console.log(`  Has address:        ${hasAddress}/${missingGeohash.length}`);
  console.log(`  Has zip_code:       ${hasZip}/${missingGeohash.length}`);
  console.log(`  Has activity_id:    ${hasActivityId}/${missingGeohash.length}`);
  console.log(`  Has venue + city:   ${hasVenueAndCity}/${missingGeohash.length}`);
  console.log(`  Has address + city: ${hasAddressAndCity}/${missingGeohash.length}`);
  console.log(`  Has city + state:   ${hasCityAndState}/${missingGeohash.length}`);
  console.log(`  Has NOTHING:        ${hasNothing}/${missingGeohash.length}`);

  console.log('\n  By scraper:');
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${src.padEnd(45)} ${count}`);
  }

  console.log('\n  By state:');
  for (const [st, count] of Object.entries(byState).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${st.padEnd(10)} ${count}`);
  }

  // Show sample events grouped by scraper
  console.log('\n  Sample events (first 5 per top scraper):');
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [src] of topSources) {
    console.log(`\n  --- ${src} ---`);
    const evts = missingGeohash.filter(e => (e.scraper_name || 'unknown') === src).slice(0, 5);
    for (const e of evts) {
      console.log(`    "${(e.name || '').substring(0, 50)}"`);
      console.log(`      venue="${e.venue || ''}" city="${e.city || ''}" state="${e.state || ''}" addr="${(e.address || '').substring(0, 40)}" zip="${e.zip_code || ''}" activity_id=${e.activity_id ? 'YES' : 'no'}`);
    }
  }

  // Now check: for events with activity_id, does the linked activity have a geohash?
  console.log('\n\n=== CHECKING LINKED ACTIVITIES ===');
  const withActivityId = missingGeohash.filter(e => e.activity_id);
  if (withActivityId.length > 0) {
    const actIds = [...new Set(withActivityId.map(e => e.activity_id))];
    console.log(`  Events with activity_id: ${withActivityId.length} (${actIds.length} unique activities)`);

    // Fetch those activities
    let activitiesWithGeohash = 0;
    for (let i = 0; i < actIds.length; i += 50) {
      const batch = actIds.slice(i, i + 50);
      const { data } = await supabase.from('activities').select('id, geohash, city, state').in('id', batch);
      if (data) {
        for (const a of data) {
          if (a.geohash) activitiesWithGeohash++;
        }
      }
    }
    console.log(`  Linked activities WITH geohash: ${activitiesWithGeohash}`);
    console.log(`  Linked activities WITHOUT geohash: ${actIds.length - activitiesWithGeohash}`);
  }

  // Now check events missing city
  console.log('\n\n=== EVENTS MISSING CITY ===');
  const missingCity = noGeohash.filter(e => !e.city || e.city.trim() === '');
  console.log(`  Total: ${missingCity.length}`);

  const cityBySource = {};
  let cityHasVenue = 0, cityHasAddress = 0, cityHasGeohash = 0, cityHasState = 0, cityHasZip = 0;

  for (const evt of missingCity) {
    if (evt.venue) cityHasVenue++;
    if (evt.address) cityHasAddress++;
    if (evt.geohash) cityHasGeohash++;
    if (evt.state) cityHasState++;
    if (evt.zip_code) cityHasZip++;
    const src = evt.scraper_name || 'unknown';
    cityBySource[src] = (cityBySource[src] || 0) + 1;
  }

  console.log(`  Has venue:    ${cityHasVenue}/${missingCity.length}`);
  console.log(`  Has address:  ${cityHasAddress}/${missingCity.length}`);
  console.log(`  Has geohash:  ${cityHasGeohash}/${missingCity.length}`);
  console.log(`  Has state:    ${cityHasState}/${missingCity.length}`);
  console.log(`  Has zip_code: ${cityHasZip}/${missingCity.length}`);

  console.log('\n  By scraper:');
  for (const [src, count] of Object.entries(cityBySource).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${src.padEnd(45)} ${count}`);
  }

  console.log('\n  Sample events (first 5 per top scraper):');
  const topCitySources = Object.entries(cityBySource).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [src] of topCitySources) {
    console.log(`\n  --- ${src} ---`);
    const evts = missingCity.filter(e => (e.scraper_name || 'unknown') === src).slice(0, 5);
    for (const e of evts) {
      console.log(`    "${(e.name || '').substring(0, 50)}"`);
      console.log(`      venue="${e.venue || ''}" state="${e.state || ''}" addr="${(e.address || '').substring(0, 50)}" zip="${e.zip_code || ''}" geohash="${e.geohash || ''}"`);
    }
  }

  // Check overlap: events missing BOTH geohash and city
  const missingBoth = missingGeohash.filter(e => !e.city || e.city.trim() === '');
  console.log(`\n\n=== OVERLAP ===`);
  console.log(`  Missing geohash only: ${missingGeohash.length - missingBoth.length}`);
  console.log(`  Missing city only:    ${missingCity.length - missingBoth.length}`);
  console.log(`  Missing BOTH:         ${missingBoth.length}`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
