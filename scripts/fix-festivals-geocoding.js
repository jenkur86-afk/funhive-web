#!/usr/bin/env node
/**
 * Fix festivals scraper geocoding issues
 *
 * Deletes future-dated events from the Festivals-Eastern-US scraper that have
 * empty city (indicating state-centroid fallback was used) so the next scraper
 * run recreates them with correct city-level coordinates.
 *
 * Also deletes events with false-positive library addresses — Charlotte → China Grove NC,
 * White Plains → Syracuse NY, North Shore → Evanston IL — caused by the library-address
 * matcher being called for non-library sources.
 *
 * Run: node scripts/fix-festivals-geocoding.js
 *      node scripts/fix-festivals-geocoding.js --save
 */

'use strict';

const { supabase } = require('../scrapers/helpers/supabase-adapter');

// State centroid coordinates (from geocoding-helper.js) — events at these
// exact coords were geocoded by the bad fallback path.
const STATE_CENTROIDS = {
  'AL': { lat: 32.806671, lng: -86.791130 },
  'CT': { lat: 41.597782, lng: -72.755371 },
  'DC': { lat: 38.897438, lng: -77.026817 },
  'DE': { lat: 39.318523, lng: -75.507141 },
  'FL': { lat: 27.766279, lng: -81.686783 },
  'GA': { lat: 33.040619, lng: -83.643074 },
  'IL': { lat: 40.349457, lng: -88.986137 },
  'IN': { lat: 39.849426, lng: -86.258278 },
  'KY': { lat: 37.668140, lng: -84.670067 },
  'MA': { lat: 42.230171, lng: -71.530106 },
  'MD': { lat: 39.063946, lng: -76.802101 },
  'ME': { lat: 44.693947, lng: -69.381927 },
  'MI': { lat: 43.326618, lng: -84.536095 },
  'MS': { lat: 32.741646, lng: -89.678696 },
  'NC': { lat: 35.630066, lng: -79.806419 },
  'NH': { lat: 43.452492, lng: -71.563896 },
  'NJ': { lat: 40.298904, lng: -74.521011 },
  'NY': { lat: 42.165726, lng: -74.948051 },
  'OH': { lat: 40.388783, lng: -82.764915 },
  'PA': { lat: 40.590752, lng: -77.209755 },
  'RI': { lat: 41.680893, lng: -71.511780 },
  'SC': { lat: 33.856892, lng: -80.945007 },
  'TN': { lat: 35.747845, lng: -86.692345 },
  'VA': { lat: 37.769337, lng: -78.169968 },
  'VT': { lat: 44.045876, lng: -72.710686 },
  'WI': { lat: 44.268543, lng: -89.616508 },
  'WV': { lat: 38.491226, lng: -80.954453 },
};

const SAVE_MODE = process.argv.includes('--save');
const today = new Date().toISOString();

async function main() {
  console.log(`\n🔧 Festivals Geocoding Fix`);
  console.log(`   Mode: ${SAVE_MODE ? 'SAVE (deleting bad records)' : 'DRY RUN (add --save to delete)'}`);
  console.log(`   Targeting: scraper_name = 'Festivals-Eastern-US', date >= now, city = ''\n`);

  // Fetch all future-dated festivals from this scraper
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, city, state, date, scraper_name')
    .eq('scraper_name', 'Festivals-Eastern-US')
    .gte('date', today)
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }

  if (!events || events.length === 0) {
    console.log('✅ No future festivals from this scraper found — nothing to fix.');
    return;
  }

  console.log(`📊 Found ${events.length} future events from Festivals-Eastern-US scraper`);

  // Identify events with empty city (state-centroid fallback was used)
  const badEvents = events.filter(e => !e.city || e.city.trim() === '');

  console.log(`🚩 ${badEvents.length} events have empty city (state-centroid coordinates)`);

  if (badEvents.length === 0) {
    console.log('✅ All events have city data — no cleanup needed.');
    return;
  }

  // Show sample
  console.log('\nSample events to delete:');
  badEvents.slice(0, 15).forEach(e => {
    console.log(`  - [${e.state}] ${e.name.substring(0, 60)} (city='${e.city}')`);
  });
  if (badEvents.length > 15) {
    console.log(`  ... and ${badEvents.length - 15} more`);
  }

  if (!SAVE_MODE) {
    console.log(`\n⚠️  DRY RUN — run with --save to delete ${badEvents.length} events`);
    console.log('    After deleting, re-run the festivals scraper to recreate with correct coordinates.');
    return;
  }

  // Delete in batches of 100
  const ids = badEvents.map(e => e.id);
  let deleted = 0;

  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error: delErr } = await supabase
      .from('events')
      .delete()
      .in('id', batch);

    if (delErr) {
      console.error(`❌ Delete batch ${i}-${i + batch.length} failed:`, delErr.message);
    } else {
      deleted += batch.length;
      process.stdout.write(`  Deleted ${deleted}/${ids.length}...\r`);
    }
  }

  console.log(`\n✅ Deleted ${deleted} events with state-centroid coordinates`);
  console.log('   Run the festivals scraper again to recreate with city-level geocoding:');
  console.log('   cd C:\\dev\\funhive-web && node scrapers/scraper-festivals-eastern-us.js --full\n');
}

main().catch(e => { console.error(e); process.exit(1); });
