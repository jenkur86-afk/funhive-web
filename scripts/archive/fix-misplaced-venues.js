#!/usr/bin/env node

/**
 * FIX MISPLACED VENUES
 *
 * Corrects venues that were geocoded to wrong states due to the
 * library-addresses.js cross-state matching bug.
 *
 * The bug: getLibraryAddress() matched venue names like "Downtown" or
 * "Springfield Town Center" to library branch addresses in other states
 * (e.g., Cedar Rapids IA, Springfield PA) because it had no state filter.
 *
 * This script:
 *   1. Finds activities in the wrong location (location far from their city/state)
 *   2. Re-geocodes them using Nominatim with the correct city, state
 *   3. Updates the activity and all linked events
 *
 * Usage:
 *   node fix-misplaced-venues.js          # Dry run
 *   node fix-misplaced-venues.js --save   # Save changes
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');
const ngeohash = require('ngeohash');
const axios = require('axios');

const SAVE = process.argv.includes('--save');

// Known misplaced venues from the fairs scraper run
// Format: { name, city, state, wrongReason }
const MISPLACED_VENUES = [
  { name: 'Downtown', city: 'Winchester', state: 'VA', wrongReason: 'Matched Cedar Rapids, IA' },
  { name: '4031 University Drive', city: 'Fairfax', state: 'VA', wrongReason: 'Matched Seattle, WA' },
  { name: 'Potomac Center', city: 'Woodbridge', state: 'VA', wrongReason: 'Matched Potomac, MD' },
  { name: 'Town Point Park', city: 'Norfolk', state: 'VA', wrongReason: 'Matched Gloucester Point, VA (wrong location)' },
  { name: 'Springfield Town Center', city: 'Springfield', state: 'VA', wrongReason: 'Matched Springfield, PA' },
  { name: 'Greenbrier Mall', city: 'Chesapeake', state: 'VA', wrongReason: 'Matched Brier, WA' },
  { name: 'Southwest Virginia Museum Historical State Park', city: 'Big Stone Gap', state: 'VA', wrongReason: 'Matched Washington, DC' },
  { name: 'The Crossing Clarendon', city: 'Arlington', state: 'VA', wrongReason: 'Matched Brooklyn, NY' },
  { name: 'Hewick Plantation', city: 'Urbanna', state: 'VA', wrongReason: 'Matched Plantation, FL' },
  { name: 'Randolph Macon College', city: 'Ashland', state: 'VA', wrongReason: 'Matched Brooklyn, NY' },
  { name: 'Hardywood West Creek Brewery', city: 'Richmond', state: 'VA', wrongReason: 'Matched Jacksonville, FL' },
  { name: 'White Oaks Preserve', city: 'Skipwith', state: 'VA', wrongReason: 'Matched Silver Spring, MD' },
  { name: 'West End Baptist Church', city: 'Petersburg', state: 'VA', wrongReason: 'Matched Jacksonville, FL' },
  { name: 'Chester Village Green', city: 'Chester', state: 'VA', wrongReason: 'Matched Mt Pleasant, SC' },
  { name: 'Clover Hill High School', city: 'Midlothian', state: 'VA', wrongReason: 'Matched Clover, SC' },
  { name: 'Eastern Montgomery Elementary School', city: 'Elliston', state: 'VA', wrongReason: 'Matched Colorado Springs, CO' },
];

// State centroid fallbacks (also misplaced — using VA center instead of actual city)
const CENTROID_VENUES = [
  { name: 'Shops at the Old Shed', city: 'Weyers Cove', state: 'VA' },
  { name: 'Bear Chase Brewing Company', city: 'Bluemont', state: 'VA' },
  { name: 'Oronoco Bay Park', city: 'Alexandria', state: 'VA' },
  { name: 'American Legion Post 175', city: 'Mechanicsville', state: 'VA' },
];

async function geocodeAddress(query) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'FunHive/1.0 (fix-misplaced-venues)' }
    });
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
  } catch (err) {
    console.error(`  Geocoding error: ${err.message}`);
  }
  return null;
}

async function fixVenue(venue) {
  // Find the activity in the database
  const { data: activities } = await supabase
    .from('activities')
    .select('id, name, city, state, location')
    .ilike('name', venue.name)
    .eq('state', venue.state);

  if (!activities || activities.length === 0) {
    console.log(`  ⚠️ Not found in DB: "${venue.name}" (${venue.city}, ${venue.state})`);
    return 0;
  }

  for (const activity of activities) {
    // Geocode the correct location
    const queries = [
      `${venue.name}, ${venue.city}, ${venue.state}`,
      `${venue.city}, ${venue.state}`,
    ];

    let coords = null;
    for (const q of queries) {
      coords = await geocodeAddress(q);
      if (coords) break;
      await new Promise(r => setTimeout(r, 2600)); // Nominatim rate limit
    }

    if (!coords) {
      console.log(`  ❌ Could not geocode: "${venue.name}" (${venue.city}, ${venue.state})`);
      return 0;
    }

    const geohash = ngeohash.encode(coords.latitude, coords.longitude, 7);
    const locationWKT = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;

    console.log(`  ✅ "${venue.name}" → ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (${venue.city}, ${venue.state})`);
    if (venue.wrongReason) {
      console.log(`     Was: ${venue.wrongReason}`);
    }

    if (SAVE) {
      // Update the activity
      await supabase.from('activities').update({
        location: locationWKT,
        geohash: geohash,
        city: venue.city,
      }).eq('id', activity.id);

      // Update all events linked to this activity
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('activity_id', activity.id);

      if (events && events.length > 0) {
        for (const event of events) {
          await supabase.from('events').update({
            location: locationWKT,
            geohash: geohash,
            city: venue.city,
          }).eq('id', event.id);
        }
        console.log(`     Updated ${events.length} linked events`);
      }
    }

    await new Promise(r => setTimeout(r, 2600)); // Rate limit
    return 1;
  }
  return 0;
}

async function main() {
  console.log(`\n${SAVE ? '💾 SAVE MODE' : '🔍 DRY RUN'}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Fix cross-state mismatched venues');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let fixed = 0;
  for (const venue of MISPLACED_VENUES) {
    fixed += await fixVenue(venue);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Fix state centroid fallbacks');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const venue of CENTROID_VENUES) {
    fixed += await fixVenue(venue);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Fixed: ${fixed}/${MISPLACED_VENUES.length + CENTROID_VENUES.length} venues`);
  if (!SAVE) console.log('  Run with --save to apply fixes');

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
