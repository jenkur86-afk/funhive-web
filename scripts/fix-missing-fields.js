#!/usr/bin/env node

/**
 * FIX MISSING ACTIVITY FIELDS
 *
 * Fixes two issues from the data quality report:
 *   1. Missing address (1132 activities) — reverse-geocode from PostGIS coordinates
 *   2. Missing description (5334 activities) — generate from name + category + city
 *
 * Usage:
 *   node fix-missing-fields.js                # Dry run (preview changes)
 *   node fix-missing-fields.js --save         # Actually save to DB
 *   node fix-missing-fields.js --addresses    # Fix addresses only
 *   node fix-missing-fields.js --descriptions # Fix descriptions only
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');
const LIBRARY_ADDRESSES = require('../scrapers/helpers/library-addresses');

const SAVE = process.argv.includes('--save');
const ADDRESSES_ONLY = process.argv.includes('--addresses');
const DESCRIPTIONS_ONLY = process.argv.includes('--descriptions');
const DO_ADDRESSES = !DESCRIPTIONS_ONLY;
// Per project decision (Apr 2026): description backfill is disabled — leave empty.
const DO_DESCRIPTIONS = false && !ADDRESSES_ONLY;
const RECENT_ONLY = process.argv.includes('--recent-only');
const FIX_WINDOW_HOURS = parseInt(process.env.FIX_WINDOW_HOURS || '72', 10);
const RECENT_THRESHOLD_ISO = RECENT_ONLY
  ? new Date(Date.now() - FIX_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  : null;

// ============================================================
// HELPERS
// ============================================================

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllPaginated(table, select, filters) {
  let allData = [];
  let from = 0;
  const pageSize = 500; // Smaller pages to avoid timeouts
  let retries = 0;

  while (true) {
    try {
      let query = supabase.from(table).select(select);
      if (filters.or) query = query.or(filters.or);
      if (filters.not) query = query.not(filters.not[0], filters.not[1], filters.not[2]);
      // Recent-only: scope address backfill to recent activities (saveActivity now
      // computes geohash at save time; old gaps are caught by the monthly full run).
      if (RECENT_THRESHOLD_ISO) query = query.gte('created_at', RECENT_THRESHOLD_ISO);
      query = query.range(from, from + pageSize - 1);

      const { data, error } = await query;

      if (error) {
        if (retries < 3) {
          retries++;
          console.log(`  ⚠️ Query error (retry ${retries}/3): ${error.message}`);
          await sleep(2000 * retries);
          continue;
        }
        console.error(`  ❌ Query failed after 3 retries: ${error.message}`);
        break;
      }

      retries = 0;
      allData = allData.concat(data);
      if (allData.length % 2000 === 0 && allData.length > 0) {
        console.log(`  ... fetched ${allData.length} records so far`);
      }
      if (data.length < pageSize) break;
      from += pageSize;
      await sleep(100); // Small pause between pages
    } catch (err) {
      if (retries < 3) {
        retries++;
        console.log(`  ⚠️ Network error (retry ${retries}/3): ${err.message}`);
        await sleep(3000 * retries);
        continue;
      }
      console.error(`  ❌ Network failed after 3 retries: ${err.message}`);
      break;
    }
  }
  return allData;
}

// ============================================================
// REVERSE GEOCODING (with retry + backoff)
// ============================================================

let consecutiveFails = 0;

// US state name → abbreviation lookup
const STATE_ABBREVS = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
  'colorado':'CO','connecticut':'CT','delaware':'DE','district of columbia':'DC',
  'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
  'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
  'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN',
  'mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
  'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR',
  'pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',
  'tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA',
  'washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY'
};

async function reverseGeocode(lat, lng) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FunHive/1.0 (data-quality-fix)' },
        signal: AbortSignal.timeout(15000)
      });

      // Handle rate limiting
      if (response.status === 429) {
        const waitTime = 5000 * (attempt + 1);
        console.log(`  ⏳ Rate limited — waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        await sleep(2000);
        continue;
      }

      const data = await response.json();
      consecutiveFails = 0;

      if (data && data.address) {
        const addr = data.address;
        const houseNumber = addr.house_number || '';
        const road = addr.road || addr.street || '';
        const streetPart = houseNumber && road
          ? `${houseNumber} ${road}`
          : road || data.display_name?.split(',')[0] || '';
        const city = addr.city || addr.town || addr.village || addr.hamlet || '';
        const stateFull = addr.state || '';
        const stateAbbrev = STATE_ABBREVS[(stateFull).toLowerCase()] || '';
        const zip = addr.postcode || '';

        // Build full address string
        const parts = [];
        if (streetPart.trim()) parts.push(streetPart.trim());
        if (city) parts.push(city);
        if (stateAbbrev) parts.push(stateAbbrev);
        else if (stateFull) parts.push(stateFull);
        if (zip && parts.length > 0) parts[parts.length - 1] += ` ${zip}`;
        const fullAddress = parts.join(', ');

        return {
          address: fullAddress || null,
          city: city || null,
          state: stateAbbrev || null,
          zip: zip || null
        };
      }
      return null;
    } catch (err) {
      consecutiveFails++;
      if (attempt < 2) {
        await sleep(3000 * (attempt + 1));
      }
    }
  }
  return null;
}

// ============================================================
// FORWARD GEOCODING (address string → lat/lng + structured address)
// ============================================================

async function forwardGeocode(query) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FunHive/1.0 (data-quality-fix)' },
        signal: AbortSignal.timeout(15000)
      });

      if (response.status === 429) {
        const waitTime = 5000 * (attempt + 1);
        console.log(`  ⏳ Rate limited — waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) { await sleep(2000); continue; }

      const data = await response.json();
      consecutiveFails = 0;

      if (data && data[0]) {
        const addr = data[0].address || {};
        const houseNumber = addr.house_number || '';
        const road = addr.road || addr.street || '';
        const streetPart = houseNumber && road
          ? `${houseNumber} ${road}`
          : road || data[0].display_name?.split(',')[0] || '';
        const city = addr.city || addr.town || addr.village || addr.hamlet || '';
        const stateFull = addr.state || '';
        const stateAbbrev = STATE_ABBREVS[(stateFull).toLowerCase()] || '';
        const zip = addr.postcode || '';

        const parts = [];
        if (streetPart.trim()) parts.push(streetPart.trim());
        if (city) parts.push(city);
        if (stateAbbrev) parts.push(stateAbbrev);
        else if (stateFull) parts.push(stateFull);
        if (zip && parts.length > 0) parts[parts.length - 1] += ` ${zip}`;
        const fullAddress = parts.join(', ');

        return {
          address: fullAddress || null,
          city: city || null,
          state: stateAbbrev || null,
          zip: zip || null,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (err) {
      consecutiveFails++;
      if (attempt < 2) await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

// ============================================================
// LIBRARY ADDRESS LOOKUP
// ============================================================

function findLibraryAddress(activityName) {
  const nameLower = (activityName || '').toLowerCase().trim();
  if (!nameLower.includes('library')) return null;

  // Try exact system name match first
  for (const [systemName, systemData] of Object.entries(LIBRARY_ADDRESSES)) {
    if (nameLower === systemName.toLowerCase()) {
      return systemData.mainAddress;
    }
    // Try branch match
    if (systemData.branches) {
      for (const [branchName, branchAddr] of Object.entries(systemData.branches)) {
        if (nameLower === branchName.toLowerCase() ||
            nameLower === `${branchName} library`.toLowerCase() ||
            nameLower.includes(branchName.toLowerCase())) {
          return branchAddr;
        }
      }
    }
  }

  // Try fuzzy: activity name contains system name or vice versa
  for (const [systemName, systemData] of Object.entries(LIBRARY_ADDRESSES)) {
    const sysLower = systemName.toLowerCase();
    if (nameLower.includes(sysLower) || sysLower.includes(nameLower)) {
      return systemData.mainAddress;
    }
  }

  return null;
}

// ============================================================
// DESCRIPTION GENERATION
// ============================================================

function generateDescription(activity) {
  const name = activity.name || '';
  const category = activity.category || '';
  const subcategory = activity.subcategory || '';
  const city = activity.city || '';
  const state = activity.state || '';
  const ageRange = activity.age_range || '';
  const isFree = activity.is_free;
  const priceRange = activity.price_range || '';

  const location = city && state ? `in ${city}, ${state}` : city ? `in ${city}` : state ? `in ${state}` : '';

  const catLower = (category + ' ' + subcategory).toLowerCase();
  let desc = '';

  if (catLower.includes('library') || catLower.includes('storytime')) {
    desc = `${name} is a family-friendly library program ${location}. ` +
      `Enjoy storytimes, educational activities, and community events for all ages. ` +
      `Most library programs are free and open to the public.`;
  } else if (catLower.includes('museum') || catLower.includes('science') || catLower.includes('discovery')) {
    desc = `${name} is an interactive museum and discovery center ${location}. ` +
      `Explore hands-on exhibits and educational experiences designed for curious minds of all ages.`;
  } else if (catLower.includes('park') || catLower.includes('outdoor') || catLower.includes('nature') || catLower.includes('trail')) {
    desc = `${name} offers outdoor fun and nature activities ${location}. ` +
      `Enjoy fresh air, green spaces, and family-friendly outdoor adventures.`;
  } else if (catLower.includes('play') || catLower.includes('indoor')) {
    desc = `${name} is a family-friendly indoor activity center ${location}. ` +
      `A great place for kids to play, explore, and have fun regardless of the weather.`;
  } else if (catLower.includes('art') || catLower.includes('craft') || catLower.includes('creative')) {
    desc = `${name} offers creative arts and crafts experiences ${location}. ` +
      `Express your creativity through hands-on art projects and workshops for all skill levels.`;
  } else if (catLower.includes('sport') || catLower.includes('gym') || catLower.includes('swim') || catLower.includes('athletic')) {
    desc = `${name} provides sports and fitness activities ${location}. ` +
      `Stay active with programs and facilities designed for kids and families.`;
  } else if (catLower.includes('farm') || catLower.includes('animal') || catLower.includes('zoo') || catLower.includes('petting')) {
    desc = `${name} is a family-friendly animal and farm attraction ${location}. ` +
      `Meet animals, enjoy the outdoors, and experience farm life up close.`;
  } else if (catLower.includes('festival') || catLower.includes('celebration') || catLower.includes('fair')) {
    desc = `${name} is a community celebration and festival ${location}. ` +
      `Enjoy entertainment, food, and fun for the whole family.`;
  } else if (catLower.includes('class') || catLower.includes('workshop') || catLower.includes('learn')) {
    desc = `${name} offers educational classes and workshops ${location}. ` +
      `Learn new skills in a fun, supportive environment for all ages.`;
  } else if (catLower.includes('trampoline') || catLower.includes('bounce') || catLower.includes('ninja')) {
    desc = `${name} is an action-packed activity center ${location}. ` +
      `Jump, climb, and play on trampolines and obstacle courses — great for burning energy.`;
  } else if (catLower.includes('skating') || catLower.includes('roller') || catLower.includes('ice')) {
    desc = `${name} is a skating destination ${location}. ` +
      `Enjoy skating sessions, lessons, and family fun on wheels or ice.`;
  } else if (catLower.includes('movie') || catLower.includes('theater') || catLower.includes('cinema')) {
    desc = `${name} is a family-friendly entertainment venue ${location}. ` +
      `Catch the latest movies and enjoy a fun outing for the whole family.`;
  } else if (catLower.includes('community')) {
    desc = `${name} hosts community events and programs ${location}. ` +
      `Join your neighbors for activities, gatherings, and family-friendly fun.`;
  } else {
    desc = `${name} is a family-friendly destination ${location}. ` +
      `Visit for fun activities and experiences the whole family can enjoy.`;
  }

  if (isFree) {
    desc += ' Admission is free.';
  } else if (priceRange && priceRange !== 'Contact for pricing') {
    desc += ` Pricing: ${priceRange}.`;
  }

  if (ageRange && ageRange !== 'All Ages' && ageRange.length > 2) {
    desc += ` Recommended for ${ageRange}.`;
  }

  return desc;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX MISSING ACTIVITY FIELDS`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE (writing to DB)' : '👀 DRY RUN (preview only)'}`);
  console.log(`  Scope: ${DO_ADDRESSES && DO_DESCRIPTIONS ? 'Addresses + Descriptions' : DO_ADDRESSES ? 'Addresses only' : 'Descriptions only'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  // ─── Fix Missing Descriptions FIRST (fast, no API calls) ───
  if (DO_DESCRIPTIONS) {
    console.log(`📝 FIXING MISSING DESCRIPTIONS`);
    console.log(`─────────────────────────────────────────`);

    const allMissing = await fetchAllPaginated('activities',
      'id, name, category, subcategory, city, state, age_range, is_free, price_range',
      { or: 'description.is.null,description.eq.' }
    );

    console.log(`  Found ${allMissing.length} activities with no description`);

    let descFixed = 0;
    let descFailed = 0;

    for (let i = 0; i < allMissing.length; i++) {
      const activity = allMissing[i];
      const description = generateDescription(activity);

      if (description && description.length > 30) {
        if (SAVE) {
          const { error } = await supabase
            .from('activities')
            .update({ description, updated_at: new Date().toISOString() })
            .eq('id', activity.id);
          if (error) {
            console.error(`  ❌ Failed: ${activity.name}: ${error.message}`);
            descFailed++;
          } else {
            descFixed++;
          }
        } else {
          descFixed++;
        }

        if (descFixed <= 5) {
          console.log(`  ✅ ${activity.name}:`);
          console.log(`     "${description.substring(0, 120)}..."`);
        } else if (descFixed % 1000 === 0) {
          console.log(`  ... ${descFixed} descriptions generated`);
        }
      } else {
        descFailed++;
      }
    }

    console.log(`\n  📊 Description Results:`);
    console.log(`     Fixed:  ${descFixed}`);
    console.log(`     Failed: ${descFailed}`);
    console.log(`     Total:  ${allMissing.length}`);
  }

  // ─── Fix Missing Addresses (slow — Nominatim rate limited) ───
  if (DO_ADDRESSES) {
    console.log(`\n🏠 FIXING MISSING ADDRESSES`);
    console.log(`─────────────────────────────────────────`);
    console.log(`  ⏱️  This takes ~15-20 min (Nominatim rate limit: 1 req/sec)\n`);

    const allMissing = await fetchAllPaginated('activities',
      'id, name, address, city, state, zip_code, location',
      { or: 'address.is.null,address.eq.', not: ['location', 'is', null] }
    );

    console.log(`  Found ${allMissing.length} activities with coordinates but no address`);

    let addressFixed = 0;
    let addressFailed = 0;
    let geocodeCount = 0;

    for (const activity of allMissing) {
      // If we've failed 20 in a row, Nominatim is probably blocking us
      if (consecutiveFails >= 20) {
        console.log(`\n  ⚠️ 20 consecutive failures — Nominatim may be blocking. Pausing 60s...`);
        await sleep(60000);
        consecutiveFails = 0;
      }

      // Extract lat/lng from PostGIS location
      let lat, lng;
      if (activity.location) {
        if (typeof activity.location === 'object' && activity.location.coordinates) {
          lng = activity.location.coordinates[0];
          lat = activity.location.coordinates[1];
        } else if (typeof activity.location === 'string') {
          const match = activity.location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }
      }

      if (!lat || !lng) {
        addressFailed++;
        continue;
      }

      const result = await reverseGeocode(lat, lng);
      geocodeCount++;

      if (result && result.address && result.address.length > 3) {
        const updates = { address: result.address, updated_at: new Date().toISOString() };
        // Also backfill city, state, zip_code if missing
        if (!activity.city && result.city) updates.city = result.city;
        if (!activity.state && result.state) updates.state = result.state;
        if (!activity.zip_code && result.zip) updates.zip_code = result.zip;
        if (SAVE) {
          const { error } = await supabase
            .from('activities')
            .update(updates)
            .eq('id', activity.id);
          if (error) {
            console.error(`  ❌ Failed to update ${activity.name}: ${error.message}`);
          } else {
            addressFixed++;
          }
        } else {
          addressFixed++;
        }
        if (addressFixed <= 10) {
          console.log(`  ✅ ${activity.name}: "${result.address}"`);
        } else if (addressFixed % 100 === 0) {
          console.log(`  ... ${addressFixed} addresses fixed so far`);
        }
      } else {
        addressFailed++;
      }

      if (geocodeCount % 100 === 0) {
        console.log(`  ⏳ ${geocodeCount}/${allMissing.length} processed, ${addressFixed} fixed, ${addressFailed} failed`);
      }

      // Rate limit: 2.5s between requests (conservative — Nominatim 429s at 1.5s)
      await sleep(2500);
    }

    console.log(`\n  📊 Reverse Geocode Results:`);
    console.log(`     Fixed:  ${addressFixed}`);
    console.log(`     Failed: ${addressFailed}`);
    console.log(`     Total:  ${allMissing.length}`);

    // ─── Pass 2: Library address lookup (no API calls, instant) ───
    console.log(`\n📚 FIXING MISSING ADDRESSES — Library Lookup`);
    console.log(`─────────────────────────────────────────`);

    const stillMissing = await fetchAllPaginated('activities',
      'id, name, address, city, state, zip_code, location',
      { or: 'address.is.null,address.eq.' }
    );
    console.log(`  ${stillMissing.length} activities still missing address after reverse geocode`);

    let libFixed = 0;
    for (const activity of stillMissing) {
      const libAddr = findLibraryAddress(activity.name);
      if (libAddr) {
        // Parse address string: "123 Main St, City, ST 12345"
        const parts = libAddr.split(',').map(p => p.trim());
        const updates = { address: libAddr, updated_at: new Date().toISOString() };
        if (!activity.city && parts.length >= 2) updates.city = parts[1];
        if (!activity.state && parts.length >= 3) {
          const stateZip = parts[parts.length - 1];
          const stMatch = stateZip.match(/^([A-Z]{2})\s/);
          if (stMatch) updates.state = stMatch[1];
        }
        if (!activity.zip_code) {
          const zipMatch = libAddr.match(/\b(\d{5})\b/);
          if (zipMatch) updates.zip_code = zipMatch[1];
        }
        if (SAVE) {
          const { error } = await supabase.from('activities').update(updates).eq('id', activity.id);
          if (!error) libFixed++;
        } else {
          libFixed++;
        }
        if (libFixed <= 5) {
          console.log(`  ✅ ${activity.name}: "${libAddr}"`);
        } else if (libFixed % 50 === 0) {
          console.log(`  ... ${libFixed} library addresses fixed`);
        }
      }
    }
    console.log(`  📊 Library lookup: ${libFixed} fixed out of ${stillMissing.length} remaining`);

    // ─── Pass 3: Forward geocode from name + city + state (slow) ───
    console.log(`\n🔍 FIXING MISSING ADDRESSES — Forward Geocode`);
    console.log(`─────────────────────────────────────────`);

    const stillMissing2 = await fetchAllPaginated('activities',
      'id, name, address, city, state, zip_code, location',
      { or: 'address.is.null,address.eq.' }
    );
    // Only try activities that have city OR name to search with
    const forwardCandidates = stillMissing2.filter(a =>
      (a.city || a.name) && (a.city || a.state)
    );
    console.log(`  ${stillMissing2.length} activities still missing address`);
    console.log(`  ${forwardCandidates.length} have enough info for forward geocoding`);
    console.log(`  ⏱️  ETA: ~${Math.ceil(forwardCandidates.length * 2.5 / 60)} min\n`);

    let fwdFixed = 0;
    let fwdFailed = 0;
    for (let i = 0; i < forwardCandidates.length; i++) {
      const activity = forwardCandidates[i];

      if (consecutiveFails >= 20) {
        console.log(`\n  ⚠️ 20 consecutive failures — pausing 60s...`);
        await sleep(60000);
        consecutiveFails = 0;
      }

      // Build search query: name + city + state
      const queryParts = [];
      if (activity.name) queryParts.push(activity.name);
      if (activity.city) queryParts.push(activity.city);
      if (activity.state) queryParts.push(activity.state);
      const query = queryParts.join(', ');

      const result = await forwardGeocode(query);

      if (result && result.address && result.address.length > 3) {
        const updates = { address: result.address, updated_at: new Date().toISOString() };
        if (!activity.city && result.city) updates.city = result.city;
        if (!activity.state && result.state) updates.state = result.state;
        if (!activity.zip_code && result.zip) updates.zip_code = result.zip;
        // Also backfill coordinates if missing
        if (!activity.location && result.lat && result.lng) {
          updates.location = `SRID=4326;POINT(${result.lng} ${result.lat})`;
          const ngeohash = require('ngeohash');
          updates.geohash = ngeohash.encode(result.lat, result.lng, 7);
        }
        if (SAVE) {
          const { error } = await supabase.from('activities').update(updates).eq('id', activity.id);
          if (!error) fwdFixed++;
          else fwdFailed++;
        } else {
          fwdFixed++;
        }
        if (fwdFixed <= 5) {
          console.log(`  ✅ ${activity.name}: "${result.address}"`);
        } else if (fwdFixed % 100 === 0) {
          console.log(`  ... ${fwdFixed} addresses found`);
        }
      } else {
        fwdFailed++;
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  ⏳ ${i + 1}/${forwardCandidates.length} processed, ${fwdFixed} fixed, ${fwdFailed} failed`);
      }

      await sleep(2500);
    }
    console.log(`\n  📊 Forward Geocode Results:`);
    console.log(`     Fixed:  ${fwdFixed}`);
    console.log(`     Failed: ${fwdFailed}`);
    console.log(`     Total:  ${forwardCandidates.length}`);
  }

  // ─── Summary ───
  console.log(`\n════════════════════════════════════════════════════════════`);
  if (!SAVE) {
    console.log(`  👀 DRY RUN complete. Run with --save to apply changes.`);
  } else {
    console.log(`  💾 Changes saved to database.`);
  }
  console.log(`════════════════════════════════════════════════════════════\n`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
