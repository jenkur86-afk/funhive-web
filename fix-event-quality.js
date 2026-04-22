#!/usr/bin/env node

/**
 * FIX EVENT & ACTIVITY DATA QUALITY ISSUES
 *
 * Event fixes:
 *   1. Missing event_date (16) — delete these (events without dates are useless)
 *   2. Past events (2532) — delete events with dates before today
 *   3. Missing state (34) — infer from city/venue/other events
 *   4. Missing geohash (2262) — compute from existing location coordinates
 *   5. Missing city (660) — reverse-geocode from coordinates or parse from address
 *   6. Missing location (3015) — geocode from city+state or address
 *   7. Missing description (6618) — generate from name + category + venue + city
 *   8. Missing start_time/end_time — parse from event_date text
 *
 * Activity fixes:
 *   9.  Missing geohash (24) — compute from existing location coordinates
 *   10. Missing city (24) — reverse-geocode from coordinates
 *   11. Missing location (36) — geocode from city+state
 *   12. Missing description (276) — generate from name + category + city + state
 *
 * Usage:
 *   node fix-event-quality.js                # Dry run (preview)
 *   node fix-event-quality.js --save         # Save changes to DB
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

// Inline geohash encoder (no dependency needed)
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function encodeGeohash(lat, lng, precision = 7) {
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let hash = '', bit = 0, ch = 0, isLng = true;
  while (hash.length < precision) {
    const mid = isLng ? (minLng + maxLng) / 2 : (minLat + maxLat) / 2;
    const val = isLng ? lng : lat;
    if (val >= mid) {
      ch |= (1 << (4 - bit));
      if (isLng) minLng = mid; else minLat = mid;
    } else {
      if (isLng) maxLng = mid; else maxLat = mid;
    }
    isLng = !isLng;
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

const SAVE = process.argv.includes('--save');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Paginated fetch with retries ──
async function fetchAll(table, select, filters = {}) {
  let all = [];
  let from = 0;
  const pageSize = 500;

  while (true) {
    let retries = 0;
    let data, error;

    while (retries < 3) {
      let query = supabase.from(table).select(select);
      if (filters.or) query = query.or(filters.or);
      if (filters.is) query = query.is(filters.is[0], filters.is[1]);
      if (filters.not) query = query.not(filters.not[0], filters.not[1], filters.not[2]);
      if (filters.eq) query = query.eq(filters.eq[0], filters.eq[1]);
      if (filters.lt) query = query.lt(filters.lt[0], filters.lt[1]);
      query = query.range(from, from + pageSize - 1);

      const result = await query;
      data = result.data;
      error = result.error;

      if (!error) break;
      retries++;
      console.log(`  ⚠️ Retry ${retries}/3: ${error.message}`);
      await sleep(2000 * retries);
    }

    if (error) { console.error(`  ❌ Query failed: ${error.message}`); break; }
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
    await sleep(50);
  }
  return all;
}

// ── Reverse geocode ──
let consecutiveFails = 0;
async function reverseGeocode(lat, lng) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=12`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FunHive/1.0 (event-fix)' },
        signal: AbortSignal.timeout(15000)
      });
      if (response.status === 429) { console.log(`  ⚠️ 429 rate limit — cooling down ${10 * (attempt + 1)}s`); await sleep(10000 * (attempt + 1)); continue; }
      if (!response.ok) { await sleep(2000); continue; }
      const data = await response.json();
      consecutiveFails = 0;
      if (data?.address) {
        return {
          city: data.address.city || data.address.town || data.address.village || data.address.hamlet || null,
          state: data.address.state || null,
          address: [data.address.house_number, data.address.road || data.address.street].filter(Boolean).join(' ') || null,
          zip: data.address.postcode || null
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

// ── Forward geocode (city-level) ──
async function forwardGeocode(city, state) {
  try {
    const q = `${city}, ${state}, USA`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FunHive/1.0 (event-fix)' },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {}
  return null;
}

// ── Forward geocode (free-text query — address, venue name, etc.) ──
async function forwardGeocodeQuery(query) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FunHive/1.0 (event-fix)' },
        signal: AbortSignal.timeout(15000)
      });
      if (response.status === 429) { await sleep(10000 * (attempt + 1)); continue; }
      if (!response.ok) return null;
      const data = await response.json();
      consecutiveFails = 0;
      if (data?.[0]) {
        const addr = data[0].address || {};
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          city: addr.city || addr.town || addr.village || addr.hamlet || null,
          state: addr.state || null
        };
      }
    } catch (err) {
      consecutiveFails++;
      if (attempt < 1) await sleep(3000);
    }
  }
  return null;
}

// ── Extract lat/lng from PostGIS location ──
function parseLocation(loc) {
  if (!loc) return null;
  if (typeof loc === 'object' && loc.coordinates) {
    return { lat: loc.coordinates[1], lng: loc.coordinates[0] };
  }
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (m) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
  }
  return null;
}

// ── State abbreviation lookup ──
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
const STATE_ABBREV_SET = new Set(Object.values(STATE_ABBREVS));
// Match: "..., City, ST ..." or "..., City, ST ZIP"
const CITY_STATE_RE = /,\s*([A-Z][a-zA-Z\s.'-]+?),\s*([A-Z]{2})\b/;

// ── Description generator for events ──
function generateEventDescription(event) {
  const name = event.name || '';
  const venue = event.venue || '';
  const city = event.city || '';
  const state = event.state || '';
  const category = (event.category || '').toLowerCase();

  const location = city && state ? `in ${city}, ${state}` : city ? `in ${city}` : state ? `in ${state}` : '';
  const at = venue ? `at ${venue}` : '';
  const where = [at, location].filter(Boolean).join(' ');

  if (category.includes('storytime') || category.includes('library')) {
    return `Join us for ${name} ${where}. A fun, free library program with stories, songs, and activities for young readers and their families.`;
  } else if (category.includes('outdoor') || category.includes('nature')) {
    return `${name} ${where}. Enjoy outdoor fun and fresh-air activities the whole family can enjoy together.`;
  } else if (category.includes('art') || category.includes('craft')) {
    return `${name} ${where}. Get creative with hands-on art and craft activities for all ages and skill levels.`;
  } else if (category.includes('class') || category.includes('workshop')) {
    return `${name} ${where}. Learn something new in this engaging class designed for families and kids.`;
  } else if (category.includes('festival') || category.includes('celebration')) {
    return `${name} ${where}. A festive community gathering with entertainment, food, and family fun.`;
  } else if (category.includes('indoor')) {
    return `${name} ${where}. An exciting indoor activity perfect for a fun family outing any day.`;
  } else if (category.includes('animal') || category.includes('farm')) {
    return `${name} ${where}. Meet animals, explore nature, and enjoy a memorable family experience.`;
  } else {
    return `${name} ${where}. A family-friendly community event with activities and fun for all ages.`;
  }
}

// ── Parse time from event_date text ──
function parseTimesFromEventDate(eventDate) {
  if (!eventDate) return null;
  const text = eventDate.trim();

  // Normalize unicode dashes and whitespace
  const normalized = text.replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ');

  // Pattern 1: "10:00 AM - 12:00 PM" or "10:00am-12:00pm" or "10:00 AM to 12:00 PM"
  const timeRange = normalized.match(/(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))\s*[-\u2013\u2014to]+\s*(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))/i);
  if (timeRange) {
    return { start: normalizeTimeStr(timeRange[1]), end: normalizeTimeStr(timeRange[2]) };
  }

  // Pattern 2: "10am - 2pm" or "10am-2pm" (no minutes)
  const shortRange = normalized.match(/(\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.))\s*[-\u2013\u2014to]+\s*(\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.))/i);
  if (shortRange) {
    return { start: normalizeTimeStr(shortRange[1]), end: normalizeTimeStr(shortRange[2]) };
  }

  // Pattern 3: "10:00 AM" or "3:30pm" (single time with prefix)
  const singleTime = normalized.match(/(?:at|@|from)\s+(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))/i);
  if (singleTime) {
    return { start: normalizeTimeStr(singleTime[1]), end: null };
  }

  // Pattern 4: Standalone time without prefix "April 21, 2026 3:30 PM"
  const standaloneTime = normalized.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))/i);
  if (standaloneTime) {
    // Check if there's a second time nearby
    const afterFirst = normalized.substring(normalized.indexOf(standaloneTime[0]) + standaloneTime[0].length);
    const secondTime = afterFirst.match(/^\s*[-\u2013\u2014to]+\s*(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))/i);
    return {
      start: normalizeTimeStr(standaloneTime[1]),
      end: secondTime ? normalizeTimeStr(secondTime[1]) : null
    };
  }

  // Pattern 5: "at 3pm" or "@ 10am" (no minutes, with prefix)
  const shortSingle = normalized.match(/(?:at|@|from)\s+(\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.))/i);
  if (shortSingle) {
    return { start: normalizeTimeStr(shortSingle[1]), end: null };
  }

  return null;
}

function normalizeTimeStr(raw) {
  if (!raw) return null;
  let t = raw.trim().replace(/\./g, '').replace(/\s+/g, ' ');
  // "10am" -> "10:00 AM", "3:30pm" -> "3:30 PM"
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const min = m[2] || '00';
  const period = m[3].toUpperCase();
  if (hour < 1 || hour > 12) return null;
  return `${hour}:${min} ${period}`;
}

// ── Description generator for activities ──
function generateActivityDescription(activity) {
  const name = activity.name || '';
  const city = activity.city || '';
  const state = activity.state || '';
  const category = (activity.category || '').toLowerCase();
  const location = city && state ? `in ${city}, ${state}` : city ? `in ${city}` : state ? `in ${state}` : '';

  if (category.includes('library')) {
    return `${name} ${location}. A family-friendly library offering programs, storytimes, and resources for all ages.`;
  } else if (category.includes('park') || category.includes('outdoor')) {
    return `${name} ${location}. A great outdoor destination for family fun, play, and recreation.`;
  } else if (category.includes('museum')) {
    return `${name} ${location}. An engaging museum with exhibits and activities for curious minds of all ages.`;
  } else if (category.includes('zoo') || category.includes('aquarium')) {
    return `${name} ${location}. Meet amazing animals and enjoy a memorable family outing.`;
  } else {
    return `${name} ${location}. A family-friendly venue with activities and fun for all ages.`;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX EVENT DATA QUALITY`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  let totalFixed = 0;
  // Cache city+state -> coords to avoid duplicate geocode calls (shared by Steps 6 & 11)
  const geoCache = {};

  // ── 1. Delete events with no date (16) ──
  console.log(`\n🗑️  STEP 1: Remove events with no date`);
  console.log(`───────────────────────────────────────`);
  const noDate = await fetchAll('events', 'id, name', { or: 'event_date.is.null,event_date.eq.' });
  console.log(`  Found ${noDate.length} events with no date`);
  if (SAVE && noDate.length > 0) {
    const ids = noDate.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase.from('events').delete().in('id', batch);
    }
    console.log(`  ✅ Deleted ${noDate.length} dateless events`);
  } else {
    noDate.slice(0, 5).forEach(e => console.log(`  - "${e.name}" (no date)`));
  }
  totalFixed += noDate.length;

  // ── 1b. Delete junk title events ──
  console.log(`\n🗑️  STEP 1b: Remove events with junk titles`);
  console.log(`───────────────────────────────────────`);
  const allForJunk = await fetchAll('events', 'id, name', {});
  const junkEvents = allForJunk.filter(e => {
    if (!e.name) return true;
    const n = e.name.trim();
    if (n.length < 4) return true;  // Too short to be a real event name
    if (n.length < 8 && /^[A-Z\s\d]+$/.test(n)) return true;  // All-caps gibberish
    if (/^(menu|home|about|contact|login|sign\s*up|subscribe|search|nav|header|footer|click\s+here|read\s+more|learn\s+more|view\s+all)$/i.test(n)) return true;  // Navigation junk
    return false;
  });
  console.log(`  Found ${junkEvents.length} events with junk titles`);
  if (SAVE && junkEvents.length > 0) {
    const ids = junkEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase.from('events').delete().in('id', batch);
    }
    console.log(`  ✅ Deleted ${junkEvents.length} junk events`);
  } else {
    junkEvents.slice(0, 10).forEach(e => console.log(`  - "${e.name}"`));
  }
  totalFixed += junkEvents.length;

  // ── 2. Delete past events (2532) ──
  console.log(`\n🗑️  STEP 2: Remove past events`);
  console.log(`───────────────────────────────────────`);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const pastEvents = await fetchAll('events', 'id, name, event_date, date', { lt: ['date', today] });
  console.log(`  Found ${pastEvents.length} past events`);
  if (SAVE && pastEvents.length > 0) {
    const ids = pastEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase.from('events').delete().in('id', batch);
    }
    console.log(`  ✅ Deleted ${pastEvents.length} past events`);
  } else {
    pastEvents.slice(0, 5).forEach(e => console.log(`  - "${e.name}" (${e.event_date})`));
  }
  totalFixed += pastEvents.length;

  // ── 2b. Remove duplicate events (same name + date + venue) ──
  console.log(`\n🔄 STEP 2b: Remove duplicate events`);
  console.log(`───────────────────────────────────────`);
  const allForDedup = await fetchAll('events', 'id, name, event_date, venue, created_at');
  const dupeGroups = {};
  for (const e of allForDedup) {
    const key = `${(e.name || '').toLowerCase().trim()}|${(e.event_date || '').toLowerCase().trim()}|${(e.venue || '').toLowerCase().trim()}`;
    if (!dupeGroups[key]) dupeGroups[key] = [];
    dupeGroups[key].push(e);
  }
  const dupesToDelete = [];
  for (const [key, group] of Object.entries(dupeGroups)) {
    if (group.length <= 1) continue;
    // Keep the oldest (first created), delete the rest
    group.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    for (let i = 1; i < group.length; i++) {
      dupesToDelete.push({ id: group[i].id, name: group[i].name });
    }
  }
  console.log(`  Found ${dupesToDelete.length} duplicate events to remove`);
  if (dupesToDelete.length > 0) {
    dupesToDelete.slice(0, 5).forEach(d => console.log(`  - "${d.name}"`));
    if (SAVE) {
      const ids = dupesToDelete.map(d => d.id);
      for (let i = 0; i < ids.length; i += 100) {
        await supabase.from('events').delete().in('id', ids.slice(i, i + 100));
      }
      console.log(`  ✅ Deleted ${dupesToDelete.length} duplicates`);
    }
  }
  totalFixed += dupesToDelete.length;

  // ── 3. Fix missing state (34) ──
  console.log(`\n🏛️  STEP 3: Fix missing state`);
  console.log(`───────────────────────────────────────`);
  const noState = await fetchAll('events', 'id, name, city, state, venue, address, scraper_name',
    { or: 'state.is.null,state.eq.' });
  console.log(`  Found ${noState.length} events with no state`);

  let stateFixed = 0;
  for (const event of noState) {
    let inferredState = null;

    // Try scraper name (e.g. "MacaroniKid-MD", "Communico-VA")
    if (event.scraper_name) {
      const m = event.scraper_name.match(/[-_ ]([A-Z]{2})$/);
      if (m && Object.values(STATE_ABBREVS).includes(m[1])) {
        inferredState = m[1];
      }
    }

    // Try address (e.g. "123 Main St, Springfield, VA 22150")
    if (!inferredState && event.address) {
      const m = event.address.match(/\b([A-Z]{2})\s+\d{5}\b/);
      if (m && Object.values(STATE_ABBREVS).includes(m[1])) {
        inferredState = m[1];
      }
    }

    if (inferredState) {
      if (SAVE) {
        await supabase.from('events').update({ state: inferredState }).eq('id', event.id);
      }
      stateFixed++;
      if (stateFixed <= 5) console.log(`  ✅ "${event.name}" → ${inferredState}`);
    }
  }
  console.log(`  Fixed: ${stateFixed}/${noState.length}`);
  totalFixed += stateFixed;

  // ── 4. Fix missing geohash from existing coordinates (2262) ──
  console.log(`\n#️⃣  STEP 4: Fix missing geohash (from existing coordinates)`);
  console.log(`───────────────────────────────────────`);
  const noGeohash = await fetchAll('events', 'id, name, location, geohash',
    { or: 'geohash.is.null,geohash.eq.', not: ['location', 'is', null] });
  console.log(`  Found ${noGeohash.length} events with coordinates but no geohash`);

  let geohashFixed = 0;
  for (let i = 0; i < noGeohash.length; i++) {
    const event = noGeohash[i];
    const coords = parseLocation(event.location);
    if (!coords) continue;

    const hash = encodeGeohash(coords.lat, coords.lng, 7);
    if (hash) {
      if (SAVE) {
        await supabase.from('events').update({ geohash: hash }).eq('id', event.id);
      }
      geohashFixed++;
    }
  }
  console.log(`  ✅ Fixed: ${geohashFixed}/${noGeohash.length}`);
  totalFixed += geohashFixed;

  // ── 5. Fix missing city — reverse geocode from coordinates ──
  console.log(`\n🏙️  STEP 5: Fix missing city (reverse geocode + address parsing)`);
  console.log(`───────────────────────────────────────`);

  // 5a. Reverse geocode events that have coordinates but no city
  const noCity = await fetchAll('events', 'id, name, city, location, address, state',
    { or: 'city.is.null,city.eq.', not: ['location', 'is', null] });
  console.log(`  5a: ${noCity.length} events with coordinates but no city`);
  console.log(`  ⏱️  ~${Math.ceil(noCity.length * 2 / 60)} min at 2s/request\n`);

  let cityFixed = 0;
  for (let i = 0; i < noCity.length; i++) {
    if (consecutiveFails >= 10) {
      console.log(`  ⚠️ 10 consecutive failures — pausing 90s for rate limit recovery...`);
      await sleep(90000);
      consecutiveFails = 0;
    }
    const event = noCity[i];
    const coords = parseLocation(event.location);
    if (!coords) continue;

    const geo = await reverseGeocode(coords.lat, coords.lng);
    if (geo?.city) {
      const updates = { city: geo.city };
      if (geo.state) {
        const abbrev = STATE_ABBREVS[geo.state.toLowerCase()];
        if (abbrev) updates.state = abbrev;
      }
      if (SAVE) {
        await supabase.from('events').update(updates).eq('id', event.id);
      }
      cityFixed++;
      if (cityFixed <= 5) console.log(`  ✅ "${event.name}" → ${geo.city}`);
      else if (cityFixed % 100 === 0) console.log(`  ... ${cityFixed} cities fixed`);
    }
    await sleep(2000);
  }
  console.log(`  5a fixed: ${cityFixed}/${noCity.length}`);

  // 5b. Parse city from address string for events with no coordinates AND no city
  //     Matches patterns like "123 Main St, Springfield, IL 62704" or "Springfield, IL"
  const noCityNoLoc = await fetchAll('events', 'id, name, city, location, address, state',
    { or: 'city.is.null,city.eq.', is: ['location', null] });
  const withAddress = noCityNoLoc.filter(e => e.address && e.address.length > 5);
  console.log(`  5b: ${noCityNoLoc.length} events with no city AND no coordinates, ${withAddress.length} have address`);

  let cityParsed = 0;
  for (const event of withAddress) {
    const m = event.address.match(CITY_STATE_RE);
    if (m) {
      const parsedCity = m[1].trim();
      const parsedState = m[2].trim();
      // Validate state is a real US state abbreviation
      if (STATE_ABBREV_SET.has(parsedState) && parsedCity.length >= 2 && parsedCity.length <= 50) {
        const updates = { city: parsedCity };
        if (!event.state) updates.state = parsedState;
        if (SAVE) {
          await supabase.from('events').update(updates).eq('id', event.id);
        }
        cityParsed++;
        if (cityParsed <= 5) console.log(`  ✅ [parsed] "${event.name}" → ${parsedCity}, ${parsedState}`);
      }
    }
  }
  console.log(`  5b parsed: ${cityParsed}/${withAddress.length}`);
  console.log(`  Step 5 total: ${cityFixed + cityParsed}`);
  totalFixed += cityFixed + cityParsed;

  // ── 6. Fix missing location (geocode from city+state, then address/venue fallback) ──
  console.log(`\n📍 STEP 6: Fix missing location (geocode from city+state + address/venue fallback)`);
  console.log(`───────────────────────────────────────`);
  const noLoc = await fetchAll('events', 'id, name, city, state, address, venue, location, geohash',
    { is: ['location', null] });
  // Split into city+state geocodable vs. fallback (address/venue)
  const geocodable = noLoc.filter(e => e.city && e.state);
  const fallbackable = noLoc.filter(e => !(e.city && e.state) && (e.address || e.venue));
  console.log(`  Found ${noLoc.length} events with no location:`);
  console.log(`    ${geocodable.length} have city+state (primary geocode)`);
  console.log(`    ${fallbackable.length} have address or venue (fallback geocode)`);
  console.log(`  ⏱️  ~${Math.ceil((geocodable.length + fallbackable.length) * 2 / 60)} min\n`);

  let locFixed = 0;

  // 6a. Geocode from city+state
  for (let i = 0; i < geocodable.length; i++) {
    if (consecutiveFails >= 10) {
      console.log(`  ⚠️ 10 consecutive failures — pausing 90s for rate limit recovery...`);
      await sleep(90000);
      consecutiveFails = 0;
    }
    const event = geocodable[i];
    const cacheKey = `${event.city}|${event.state}`;

    let coords = geoCache[cacheKey];
    if (coords === undefined) {
      coords = await forwardGeocode(event.city, event.state);
      geoCache[cacheKey] = coords || null;
      await sleep(2000);
    }

    if (coords) {
      const hash = encodeGeohash(coords.lat, coords.lng, 7);
      const updates = {
        location: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
        geohash: event.geohash || hash
      };
      if (SAVE) {
        await supabase.from('events').update(updates).eq('id', event.id);
      }
      locFixed++;
      if (locFixed <= 5) console.log(`  ✅ "${event.name}" → ${event.city}, ${event.state}`);
      else if (locFixed % 100 === 0) console.log(`  ... ${locFixed} locations fixed`);
    }
  }

  // 6b. Fallback: geocode from address or venue name
  let fallbackFixed = 0;
  for (let i = 0; i < fallbackable.length; i++) {
    if (consecutiveFails >= 10) {
      console.log(`  ⚠️ 10 consecutive failures — pausing 90s for rate limit recovery...`);
      await sleep(90000);
      consecutiveFails = 0;
    }
    const event = fallbackable[i];

    // Try address first, then "venue, state", then just venue
    const queries = [];
    if (event.address) queries.push(event.address);
    if (event.venue && event.state) queries.push(`${event.venue}, ${event.state}`);
    else if (event.venue) queries.push(event.venue);

    let result = null;
    for (const q of queries) {
      const cacheKey = `query:${q}`;
      if (geoCache[cacheKey] !== undefined) {
        result = geoCache[cacheKey];
        if (result) break;
        continue;
      }
      result = await forwardGeocodeQuery(q);
      geoCache[cacheKey] = result || null;
      await sleep(2000);
      if (result) break;
    }

    if (result) {
      const hash = encodeGeohash(result.lat, result.lng, 7);
      const updates = {
        location: `SRID=4326;POINT(${result.lng} ${result.lat})`,
        geohash: event.geohash || hash
      };
      // Also fill in city/state if we got them from the geocoder
      if (!event.city && result.city) updates.city = result.city;
      if (!event.state && result.state) {
        const abbrev = STATE_ABBREVS[(result.state || '').toLowerCase()];
        if (abbrev) updates.state = abbrev;
      }
      if (SAVE) {
        await supabase.from('events').update(updates).eq('id', event.id);
      }
      fallbackFixed++;
      if (fallbackFixed <= 5) console.log(`  ✅ [fallback] "${event.name}" → ${result.city || '?'}, ${result.state || '?'}`);
      else if (fallbackFixed % 50 === 0) console.log(`  ... ${fallbackFixed} fallback locations fixed`);
    }
  }
  console.log(`  Fixed: ${locFixed} (city+state) + ${fallbackFixed} (address/venue fallback) = ${locFixed + fallbackFixed}/${noLoc.length}`);
  totalFixed += locFixed + fallbackFixed;

  // ── 7. Fix missing descriptions (6618) ──
  console.log(`\n📝 STEP 7: Fix missing descriptions`);
  console.log(`───────────────────────────────────────`);
  const noDesc = await fetchAll('events', 'id, name, category, venue, city, state',
    { or: 'description.is.null,description.eq.' });
  console.log(`  Found ${noDesc.length} events with no description`);

  let descFixed = 0;
  for (const event of noDesc) {
    const description = generateEventDescription(event);
    if (description && description.length > 20) {
      if (SAVE) {
        await supabase.from('events').update({ description }).eq('id', event.id);
      }
      descFixed++;
      if (descFixed <= 5) {
        console.log(`  ✅ "${event.name}":`);
        console.log(`     "${description.substring(0, 100)}..."`);
      } else if (descFixed % 1000 === 0) {
        console.log(`  ... ${descFixed} descriptions generated`);
      }
    }
  }
  console.log(`  Fixed: ${descFixed}/${noDesc.length}`);
  totalFixed += descFixed;

  // ── 8. Fix missing start_time / end_time ──
  console.log(`\n⏰ STEP 8: Fix missing start_time / end_time`);
  console.log(`───────────────────────────────────────`);
  const noStartTime = await fetchAll('events', 'id, name, event_date, start_time, end_time',
    { is: ['start_time', null], not: ['event_date', 'is', null] });
  console.log(`  Found ${noStartTime.length} events with no start_time`);

  let startFixed = 0, endFixed = 0;
  const timeUpdates = []; // {id, updates}

  for (const event of noStartTime) {
    const times = parseTimesFromEventDate(event.event_date);
    if (times?.start) {
      const updates = { start_time: times.start };
      if (!event.end_time && times.end) {
        updates.end_time = times.end;
      }
      timeUpdates.push({ id: event.id, updates });
      startFixed++;
      if (times.end && !event.end_time) endFixed++;
      if (startFixed <= 5) {
        console.log(`  ✅ "${event.event_date}" → start: ${times.start}${times.end ? `, end: ${times.end}` : ''}`);
      }
    }
  }

  // Also check events that have start_time but no end_time
  const noEndTime = await fetchAll('events', 'id, name, event_date, start_time, end_time',
    { is: ['end_time', null], not: ['start_time', 'is', null] });
  console.log(`  Found ${noEndTime.length} events with start_time but no end_time`);

  let endOnlyFixed = 0;
  for (const event of noEndTime) {
    // Skip if already in timeUpdates
    if (timeUpdates.find(u => u.id === event.id)) continue;
    const times = parseTimesFromEventDate(event.event_date);
    if (times?.end) {
      timeUpdates.push({ id: event.id, updates: { end_time: times.end } });
      endOnlyFixed++;
      if (endOnlyFixed <= 5) {
        console.log(`  ✅ "${event.event_date}" → end: ${times.end}`);
      }
    }
  }

  if (SAVE && timeUpdates.length > 0) {
    let saved = 0;
    for (const u of timeUpdates) {
      const { error } = await supabase.from('events').update(u.updates).eq('id', u.id);
      if (!error) saved++;
      else if (saved === 0) console.log(`    ⚠️ ${error.message}`);
    }
    console.log(`  ✅ Updated ${saved} events (${startFixed} start times, ${endFixed + endOnlyFixed} end times)`);
  } else {
    console.log(`  Parseable: ${startFixed} start times, ${endFixed + endOnlyFixed} end times`);
  }
  totalFixed += timeUpdates.length;

  // ══════════════════════════════════════════════════════════
  // ACTIVITIES FIXES
  // ══════════════════════════════════════════════════════════
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`  FIX ACTIVITIES DATA QUALITY`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── 9. Fix activities missing geohash ──
  console.log(`\n#️⃣  STEP 9: Fix activities missing geohash`);
  console.log(`───────────────────────────────────────`);
  const actNoGeohash = await fetchAll('activities', 'id, name, location, geohash',
    { or: 'geohash.is.null,geohash.eq.', not: ['location', 'is', null] });
  console.log(`  Found ${actNoGeohash.length} activities with coordinates but no geohash`);

  let actGeohashFixed = 0;
  for (const act of actNoGeohash) {
    const coords = parseLocation(act.location);
    if (!coords) continue;
    const hash = encodeGeohash(coords.lat, coords.lng, 7);
    if (hash) {
      if (SAVE) {
        await supabase.from('activities').update({ geohash: hash }).eq('id', act.id);
      }
      actGeohashFixed++;
    }
  }
  console.log(`  ✅ Fixed: ${actGeohashFixed}/${actNoGeohash.length}`);
  totalFixed += actGeohashFixed;

  // ── 10. Fix activities missing city (reverse geocode + address parsing) ──
  console.log(`\n🏙️  STEP 10: Fix activities missing city`);
  console.log(`───────────────────────────────────────`);

  // 10a. Reverse geocode activities that have coordinates but no city
  const actNoCity = await fetchAll('activities', 'id, name, city, location, address, state',
    { or: 'city.is.null,city.eq.', not: ['location', 'is', null] });
  console.log(`  10a: ${actNoCity.length} activities with coordinates but no city`);

  let actCityFixed = 0;
  for (let i = 0; i < actNoCity.length; i++) {
    if (consecutiveFails >= 10) {
      console.log(`  ⚠️ 10 consecutive failures — pausing 90s for rate limit recovery...`);
      await sleep(90000);
      consecutiveFails = 0;
    }
    const act = actNoCity[i];
    const coords = parseLocation(act.location);
    if (!coords) continue;

    const geo = await reverseGeocode(coords.lat, coords.lng);
    if (geo?.city) {
      const updates = { city: geo.city };
      if (geo.state) {
        const abbrev = STATE_ABBREVS[geo.state.toLowerCase()];
        if (abbrev) updates.state = abbrev;
      }
      if (SAVE) {
        await supabase.from('activities').update(updates).eq('id', act.id);
      }
      actCityFixed++;
      if (actCityFixed <= 5) console.log(`  ✅ "${act.name}" → ${geo.city}`);
    }
    await sleep(2000);
  }
  console.log(`  10a fixed: ${actCityFixed}/${actNoCity.length}`);

  // 10b. Parse city from address for activities with no coordinates AND no city
  const actNoCityNoLoc = await fetchAll('activities', 'id, name, city, location, address, state',
    { or: 'city.is.null,city.eq.', is: ['location', null] });
  const actWithAddress = actNoCityNoLoc.filter(a => a.address && a.address.length > 5);
  console.log(`  10b: ${actNoCityNoLoc.length} activities with no city AND no coordinates, ${actWithAddress.length} have address`);

  let actCityParsed = 0;
  for (const act of actWithAddress) {
    const m = act.address.match(CITY_STATE_RE);
    if (m) {
      const parsedCity = m[1].trim();
      const parsedState = m[2].trim();
      if (STATE_ABBREV_SET.has(parsedState) && parsedCity.length >= 2 && parsedCity.length <= 50) {
        const updates = { city: parsedCity };
        if (!act.state) updates.state = parsedState;
        if (SAVE) {
          await supabase.from('activities').update(updates).eq('id', act.id);
        }
        actCityParsed++;
        if (actCityParsed <= 5) console.log(`  ✅ [parsed] "${act.name}" → ${parsedCity}, ${parsedState}`);
      }
    }
  }
  console.log(`  10b parsed: ${actCityParsed}/${actWithAddress.length}`);
  console.log(`  Step 10 total: ${actCityFixed + actCityParsed}`);
  totalFixed += actCityFixed + actCityParsed;

  // ── 11. Fix activities missing location (geocode from city+state + address/name fallback) ──
  console.log(`\n📍 STEP 11: Fix activities missing location`);
  console.log(`───────────────────────────────────────`);
  const actNoLoc = await fetchAll('activities', 'id, name, city, state, address, location, geohash',
    { is: ['location', null] });
  const actGeocodable = actNoLoc.filter(a => a.city && a.state);
  const actFallbackable = actNoLoc.filter(a => !(a.city && a.state) && (a.address || a.name));
  console.log(`  Found ${actNoLoc.length} activities with no location:`);
  console.log(`    ${actGeocodable.length} have city+state, ${actFallbackable.length} have address/name for fallback`);

  let actLocFixed = 0;
  for (let i = 0; i < actGeocodable.length; i++) {
    if (consecutiveFails >= 10) {
      console.log(`  ⚠️ 10 consecutive failures — pausing 90s for rate limit recovery...`);
      await sleep(90000);
      consecutiveFails = 0;
    }
    const act = actGeocodable[i];
    const cacheKey = `${act.city}|${act.state}`;

    let coords = geoCache[cacheKey];
    if (coords === undefined) {
      coords = await forwardGeocode(act.city, act.state);
      geoCache[cacheKey] = coords || null;
      await sleep(2000);
    }

    if (coords) {
      const hash = encodeGeohash(coords.lat, coords.lng, 7);
      const updates = {
        location: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
        geohash: act.geohash || hash
      };
      if (SAVE) {
        await supabase.from('activities').update(updates).eq('id', act.id);
      }
      actLocFixed++;
      if (actLocFixed <= 5) console.log(`  ✅ "${act.name}" → ${act.city}, ${act.state}`);
    }
  }

  // 11b. Fallback: geocode activities from address or name
  let actFallbackFixed = 0;
  for (let i = 0; i < actFallbackable.length; i++) {
    if (consecutiveFails >= 10) {
      console.log(`  ⚠️ 10 consecutive failures — pausing 90s for rate limit recovery...`);
      await sleep(90000);
      consecutiveFails = 0;
    }
    const act = actFallbackable[i];

    const queries = [];
    if (act.address) queries.push(act.address);
    if (act.name && act.state) queries.push(`${act.name}, ${act.state}`);
    else if (act.name) queries.push(act.name);

    let result = null;
    for (const q of queries) {
      const cacheKey = `query:${q}`;
      if (geoCache[cacheKey] !== undefined) {
        result = geoCache[cacheKey];
        if (result) break;
        continue;
      }
      result = await forwardGeocodeQuery(q);
      geoCache[cacheKey] = result || null;
      await sleep(2000);
      if (result) break;
    }

    if (result) {
      const hash = encodeGeohash(result.lat, result.lng, 7);
      const updates = {
        location: `SRID=4326;POINT(${result.lng} ${result.lat})`,
        geohash: act.geohash || hash
      };
      if (!act.city && result.city) updates.city = result.city;
      if (!act.state && result.state) {
        const abbrev = STATE_ABBREVS[(result.state || '').toLowerCase()];
        if (abbrev) updates.state = abbrev;
      }
      if (SAVE) {
        await supabase.from('activities').update(updates).eq('id', act.id);
      }
      actFallbackFixed++;
      if (actFallbackFixed <= 5) console.log(`  ✅ [fallback] "${act.name}" → ${result.city || '?'}, ${result.state || '?'}`);
    }
  }
  console.log(`  Fixed: ${actLocFixed} (city+state) + ${actFallbackFixed} (fallback) = ${actLocFixed + actFallbackFixed}/${actNoLoc.length}`);
  totalFixed += actLocFixed + actFallbackFixed;

  // ── 12. Fix activities missing descriptions ──
  console.log(`\n📝 STEP 12: Fix activities missing descriptions`);
  console.log(`───────────────────────────────────────`);
  const actNoDesc = await fetchAll('activities', 'id, name, category, city, state',
    { or: 'description.is.null,description.eq.' });
  console.log(`  Found ${actNoDesc.length} activities with no description`);

  let actDescFixed = 0;
  for (const act of actNoDesc) {
    const description = generateActivityDescription(act);
    if (description && description.length > 20) {
      if (SAVE) {
        await supabase.from('activities').update({ description }).eq('id', act.id);
      }
      actDescFixed++;
      if (actDescFixed <= 5) {
        console.log(`  ✅ "${act.name}":`);
        console.log(`     "${description.substring(0, 100)}..."`);
      }
    }
  }
  console.log(`  Fixed: ${actDescFixed}/${actNoDesc.length}`);
  totalFixed += actDescFixed;

  // ── Summary ──
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  Total fixes: ${totalFixed}`);
  if (!SAVE) {
    console.log(`  👀 DRY RUN — run with --save to apply`);
  } else {
    console.log(`  💾 All changes saved to database`);
  }
  console.log(`════════════════════════════════════════════════════════════\n`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
