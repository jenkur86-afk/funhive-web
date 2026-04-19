#!/usr/bin/env node

/**
 * Diagnose all remaining data gaps in activities and events.
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

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
  // ── ACTIVITIES ──
  const acts = await fetchAll('activities', 'id, name, city, state, address, zip_code, geohash, location, description, scraper_name, phone, url, age_range, category, subcategory');
  console.log(`\n=== ACTIVITIES: ${acts.length} total ===\n`);

  const noCity = acts.filter(a => !a.city || a.city.trim() === '');
  const noGeohash = acts.filter(a => !a.geohash);
  const noLocation = acts.filter(a => !a.location);
  const noAddress = acts.filter(a => !a.address || a.address.trim() === '');
  const noDesc = acts.filter(a => !a.description || a.description.trim() === '');
  const noScraperName = acts.filter(a => !a.scraper_name);

  console.log(`Missing city:         ${noCity.length}`);
  console.log(`Missing geohash:      ${noGeohash.length}`);
  console.log(`Missing location:     ${noLocation.length}`);
  console.log(`Missing address:      ${noAddress.length}`);
  console.log(`Missing description:  ${noDesc.length}`);
  console.log(`Missing scraper_name: ${noScraperName.length}`);

  if (noCity.length > 0) {
    console.log(`\n--- VENUES MISSING CITY (${noCity.length}) ---`);
    const byScraper = {};
    for (const a of noCity) { const s = a.scraper_name || 'unknown'; byScraper[s] = (byScraper[s] || 0) + 1; }
    for (const [s, c] of Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${s.padEnd(45)} ${c}`);
    }
    console.log(`  Samples:`);
    for (const a of noCity.slice(0, 10)) {
      console.log(`    "${a.name?.substring(0, 40)}" state=${a.state} addr="${(a.address||'').substring(0,40)}" geohash=${a.geohash||'none'} scraper=${a.scraper_name||'?'}`);
    }
  }

  if (noGeohash.length > 0) {
    console.log(`\n--- VENUES MISSING GEOHASH (${noGeohash.length}) ---`);
    const byScraper = {};
    for (const a of noGeohash) { const s = a.scraper_name || 'unknown'; byScraper[s] = (byScraper[s] || 0) + 1; }
    for (const [s, c] of Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${s.padEnd(45)} ${c}`);
    }
    console.log(`  Samples:`);
    for (const a of noGeohash.slice(0, 10)) {
      console.log(`    "${a.name?.substring(0, 40)}" city=${a.city||'none'} state=${a.state} addr="${(a.address||'').substring(0,40)}" scraper=${a.scraper_name||'?'}`);
    }
  }

  if (noLocation.length > 0) {
    console.log(`\n--- VENUES MISSING LOCATION (${noLocation.length}) ---`);
    let hasGeohash = noLocation.filter(a => a.geohash).length;
    console.log(`  Of these, ${hasGeohash} have geohash (derivable), ${noLocation.length - hasGeohash} have neither`);
  }

  // ── EVENTS ──
  const evts = await fetchAll('events', 'id, name, venue, city, state, address, geohash, location, start_time, event_date, description, scraper_name');
  console.log(`\n\n=== EVENTS: ${evts.length} total ===\n`);

  const eNoGeohash = evts.filter(e => !e.geohash);
  const eNoLocation = evts.filter(e => !e.location);
  const eNoCity = evts.filter(e => !e.city || e.city.trim() === '');
  const eNoTime = evts.filter(e => !e.start_time);

  console.log(`Missing geohash:    ${eNoGeohash.length}`);
  console.log(`Missing location:   ${eNoLocation.length}`);
  console.log(`Missing city:       ${eNoCity.length}`);
  console.log(`Missing start_time: ${eNoTime.length}`);

  if (eNoLocation.length > 0) {
    let hasGeohash = eNoLocation.filter(e => e.geohash).length;
    console.log(`\n--- EVENTS MISSING LOCATION (${eNoLocation.length}) ---`);
    console.log(`  Of these, ${hasGeohash} have geohash (derivable), ${eNoLocation.length - hasGeohash} have neither`);
  }

  if (eNoTime.length > 0) {
    console.log(`\n--- EVENTS MISSING START_TIME (${eNoTime.length}) ---`);
    const byScraper = {};
    for (const e of eNoTime) { const s = e.scraper_name || 'unknown'; byScraper[s] = (byScraper[s] || 0) + 1; }
    console.log(`  By scraper (top 15):`);
    for (const [s, c] of Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`    ${s.padEnd(45)} ${c}`);
    }
    // Check how many have time-like patterns in event_date or description
    let hasTimeInDate = 0, hasTimeInDesc = 0;
    const timePattern = /(\d{1,2}:\d{2}\s*(am|pm)|\d{1,2}\s*(am|pm)|T\d{2}:\d{2})/i;
    for (const e of eNoTime) {
      if (timePattern.test(e.event_date || '')) hasTimeInDate++;
      if (timePattern.test(e.description || '')) hasTimeInDesc++;
    }
    console.log(`  Has time pattern in event_date: ${hasTimeInDate}`);
    console.log(`  Has time pattern in description: ${hasTimeInDesc}`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
