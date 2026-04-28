#!/usr/bin/env node

/**
 * FIX ALL REMAINING DATA GAPS — Venues & Events
 *
 * VENUES:
 *   1. 33 missing city/geohash/location — re-geocode with expanded search strategies
 *   2. 68 missing address — reverse geocode from coordinates
 *   3. 2 short descriptions — regenerate
 *   4. 7 missing subcategory — infer from name/category
 *
 * EVENTS:
 *   1. 15 missing event_date — derive from `date` TIMESTAMPTZ column
 *   2. 6 missing state — derive from linked activity or geocode
 *   3. 20 missing geohash/location — derive from linked activity or geocode
 *   4. 155 missing description — generate from event name/venue/category
 *   5. 29 missing city — derive from linked activity or reverse geocode
 *   6. 3301 missing start_time — re-extract from event_date text
 *   7. ALL events missing age_range — detect from name/description
 *
 * Usage:
 *   node fix-all-remaining.js              # Dry run
 *   node fix-all-remaining.js --save       # Apply fixes
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('../../scrapers/node_modules/ngeohash'); }
let axios;
try { axios = require('axios'); } catch { axios = require('../../scrapers/node_modules/axios'); }
const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--save');

// ── GEOCODING CACHE ──────────────────────────────────────
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
        const result = { latitude: parseFloat(resp.data[0].lat), longitude: parseFloat(resp.data[0].lon), display_name: resp.data[0].display_name || '' };
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
          zip_code: a.postcode || '',
          road: a.road || '',
          house_number: a.house_number || '',
          display_name: resp.data.display_name || ''
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

// ── STRUCTURED GEOCODE — uses Nominatim structured query ──
async function structuredGeocode(params) {
  const keyParts = Object.entries(params).sort().map(([k,v]) => `${k}=${v}`).join('&');
  const key = `fwd_s:${keyParts}`;
  if (geocodeCache[key] !== undefined) return geocodeCache[key];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rateLimitedDelay();
      apiCalls++;
      const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { ...params, format: 'json', limit: 1, countrycodes: 'us', addressdetails: 1 },
        headers: { 'User-Agent': 'FunHive-Fix/1.0 (jenkur86@gmail.com)' },
        timeout: 10000
      });
      if (resp.data?.length > 0) {
        const r = resp.data[0];
        const result = {
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          display_name: r.display_name || '',
          address: r.address || {}
        };
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

const STATE_ABBREVS = {};
for (const [abbr, name] of Object.entries(STATE_NAMES)) STATE_ABBREVS[name.toLowerCase()] = abbr;

async function fetchAll(table, select, filters) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select || '*');
    if (filters) q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) { console.error(`  Error fetching ${table}: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// ── AGE RANGE DETECTION (mirrors supabase-adapter.js) ──
function detectAgeRange(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  const ageMatch = text.match(/\bages?\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(months?|mos?\.?)?\b/);
  if (ageMatch) {
    const isMonths = ageMatch[3] || (parseInt(ageMatch[1]) <= 36 && parseInt(ageMatch[2]) <= 36 && /month|mo\b/i.test(text));
    return isMonths ? `${ageMatch[1]}-${ageMatch[2]} months` : `${ageMatch[1]}-${ageMatch[2]}`;
  }

  const parenMatch = text.match(/\((?:ages?\s+)?(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*(?:months?|mos?\.?|yrs?|years?))?\)/);
  if (parenMatch) {
    const parenText = text.substring(text.indexOf(parenMatch[0]), text.indexOf(parenMatch[0]) + parenMatch[0].length + 1);
    const isMonths = /month|mo[\.\)\s]/i.test(parenText);
    return isMonths ? `${parenMatch[1]}-${parenMatch[2]} months` : `${parenMatch[1]}-${parenMatch[2]}`;
  }

  if (/\b(baby|babies|infant|lap\s*sit)\b/.test(text)) return '0-2';
  if (/\btoddler/.test(text)) return '1-3';
  if (/\b(preschool|pre-k|prek|pre\s*k)\b/.test(text)) return '3-5';
  if (/\btween/.test(text)) return '9-12';
  if (/\bteen\b/.test(text) && !/\bfamil(y|ies)\b/.test(text)) return '11-18';
  if (/\belementary/.test(text)) return '5-11';
  if (/\b(kids?|children)\b/.test(text) && !/\bfamil(y|ies)\b/.test(text)) return '4-12';
  if (/\ball\s*ages\b/.test(text)) return 'All Ages';
  if (/\bfamil(y|ies)\b/.test(text)) return 'All Ages';

  return null;
}

// ── TIME EXTRACTION (mirrors supabase-adapter.js) ──
function extractTimeFromDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const str = dateStr.trim();

  const isoM = str.match(/T(\d{2}):(\d{2})/);
  if (isoM) {
    let h = parseInt(isoM[1]); const m = isoM[2];
    if (h === 0 && m === '00') return null;
    const ap = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12; if (h === 0) h = 12;
    return { startTime: `${h}:${m} ${ap}`, endTime: null };
  }

  const rm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (rm) {
    const sap = (rm[3] || (parseInt(rm[1]) >= 7 && parseInt(rm[1]) < 12 ? 'AM' : 'PM')).toUpperCase();
    const eap = rm[6].toUpperCase();
    return { startTime: fmt12(parseInt(rm[1]), rm[2], sap), endTime: fmt12(parseInt(rm[4]), rm[5], eap) };
  }

  const rn = str.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
  if (rn) {
    return { startTime: fmt12(parseInt(rn[1]), '00', rn[2].toUpperCase()), endTime: fmt12(parseInt(rn[3]), '00', rn[4].toUpperCase()) };
  }

  const sm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (sm) {
    return { startTime: fmt12(parseInt(sm[1]), sm[2], sm[3].toUpperCase()), endTime: null };
  }

  const sn = str.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (sn) {
    return { startTime: fmt12(parseInt(sn[1]), '00', sn[2].toUpperCase()), endTime: null };
  }

  return null;
}

function fmt12(h, m, ap) {
  if (h > 12) h -= 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

// ── SUBCATEGORY INFERENCE ──
function inferSubcategory(name, category) {
  const text = `${name || ''}`.toLowerCase();
  const cat = (category || '').toLowerCase();

  if (cat === 'parks & nature') {
    if (/farm|ranch|orchard|vineyard|garden/i.test(text)) return 'Farms & Gardens';
    if (/playground|splash|spray|water\s*pad/i.test(text)) return 'Playgrounds';
    if (/trail|hike|hiking|nature\s*center/i.test(text)) return 'Trails & Nature Centers';
    if (/lake|river|beach|pool|swim/i.test(text)) return 'Swimming & Beaches';
    return 'Parks';
  }
  if (cat === 'museums & attractions') {
    if (/museum/i.test(text)) return 'Museums';
    if (/zoo|aquarium|animal|wildlife/i.test(text)) return 'Zoos & Aquariums';
    if (/amusement|theme\s*park|waterpark|water\s*park/i.test(text)) return 'Theme Parks';
    return 'Attractions';
  }
  if (cat === 'libraries') return 'Public Libraries';
  if (cat === 'sports & recreation') {
    if (/swim|pool|aquatic/i.test(text)) return 'Swimming';
    if (/gym|fitness|ymca/i.test(text)) return 'Fitness Centers';
    if (/skate|ice\s*rink|roller/i.test(text)) return 'Ice & Roller Skating';
    return 'Sports Facilities';
  }
  if (cat === 'arts & culture') {
    if (/theater|theatre|playhouse/i.test(text)) return 'Theaters';
    if (/art|gallery/i.test(text)) return 'Art Galleries';
    if (/music|concert/i.test(text)) return 'Music Venues';
    return 'Cultural Centers';
  }
  if (cat === 'entertainment') {
    if (/bowl/i.test(text)) return 'Bowling';
    if (/laser|arcade|trampoline|bounce/i.test(text)) return 'Indoor Fun';
    if (/movie|cinema|theater/i.test(text)) return 'Movies';
    return 'Entertainment';
  }
  return null;
}

// ============================================================

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX ALL REMAINING DATA GAPS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const stats = { venues: {}, events: {} };

  // ════════════════════════════════════════════════════════════
  // PART 1: VENUE FIXES
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60));
  console.log('█  PART 1: VENUE FIXES');
  console.log('█'.repeat(60) + '\n');

  // ── 1A. VENUES MISSING CITY/GEOHASH/LOCATION ──────────
  console.log('🌾 1A. VENUES MISSING GEOHASH (the 33 farms + any new)');
  console.log('─'.repeat(50));

  const missingGeo = await fetchAll('activities', 'id, name, state, city, address, geohash, location, category', q => q.is('geohash', null));
  console.log(`  Found ${missingGeo.length} venues missing geohash\n`);
  stats.venues.missingGeo = missingGeo.length;
  let geoFixed = 0;

  for (const v of missingGeo) {
    const stateFull = STATE_NAMES[v.state] || v.state || '';
    const name = (v.name || '').trim();
    if (!name) continue;

    let coords = null;
    let method = '';

    // Strategy 1: Full address
    if (v.address && v.city && stateFull) {
      coords = await forwardGeocode(`${v.address}, ${v.city}, ${stateFull}`);
      if (coords) method = 'full_address';
    }

    // Strategy 2: Name + City + State (structured)
    if (!coords && v.city && stateFull) {
      coords = await structuredGeocode({ q: name, city: v.city, state: stateFull });
      if (coords) method = 'name_city_state';
    }

    // Strategy 3: Name + State (free text)
    if (!coords && stateFull) {
      coords = await forwardGeocode(`${name}, ${stateFull}`);
      if (coords) method = 'name_state';
    }

    // Strategy 4: Append "Farm" if category suggests it
    if (!coords && stateFull && /farm|ranch|orchard|garden/i.test(`${name} ${v.category || ''}`)) {
      const farmName = /farm/i.test(name) ? name : `${name} Farm`;
      coords = await forwardGeocode(`${farmName}, ${stateFull}`);
      if (coords) method = 'farm_append';
    }

    // Strategy 5: Extract city from venue name suffix (e.g. "Happy Acres - Springfield")
    if (!coords && stateFull) {
      const cityMatch = name.match(/[-–—]\s*(.+?)$/);
      if (cityMatch) {
        coords = await forwardGeocode(`${cityMatch[1].trim()}, ${stateFull}`);
        if (coords) method = 'name_suffix_city';
      }
    }

    // Strategy 6: City-center fallback
    if (!coords && v.city && stateFull) {
      coords = await forwardGeocode(`${v.city}, ${stateFull}`);
      if (coords) method = 'city_center';
    }

    if (coords) {
      const gh = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const wkt = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;

      let city = v.city;
      if (!city) {
        const rev = await reverseGeocode(coords.latitude, coords.longitude);
        if (rev?.city) city = rev.city;
      }

      console.log(`  ✅ ${name} [${v.state}] → ${method} (${gh})`);
      geoFixed++;

      if (!DRY_RUN) {
        const update = { geohash: gh, location: wkt };
        if (city && !v.city) update.city = city;
        await supabase.from('activities').update(update).eq('id', v.id);
      }
    } else {
      console.log(`  ❌ ${name} [${v.state}] — no match`);
    }
  }
  stats.venues.geoFixed = geoFixed;
  console.log(`\n  Fixed: ${geoFixed}/${missingGeo.length}\n`);

  // ── 1B. VENUES MISSING ADDRESS ──────────────────────
  console.log('📫 1B. VENUES MISSING ADDRESS');
  console.log('─'.repeat(50));

  const missingAddr = await fetchAll('activities', 'id, name, address, city, state, geohash, location', q => q.is('address', null).not('geohash', 'is', null));
  console.log(`  Found ${missingAddr.length} venues missing address (that have geohash)\n`);
  stats.venues.missingAddr = missingAddr.length;
  let addrFixed = 0;

  for (const v of missingAddr) {
    if (!v.geohash) continue;
    const { latitude: lat, longitude: lng } = ngeohash.decode(v.geohash);
    const rev = await reverseGeocode(lat, lng);
    if (rev?.road) {
      const addr = rev.house_number ? `${rev.house_number} ${rev.road}` : rev.road;
      console.log(`  ✅ ${(v.name || '').substring(0, 40)} → ${addr}`);
      addrFixed++;
      if (!DRY_RUN) {
        const update = { address: addr };
        if (!v.city && rev.city) update.city = rev.city;
        await supabase.from('activities').update(update).eq('id', v.id);
      }
    }
  }
  stats.venues.addrFixed = addrFixed;
  console.log(`\n  Fixed: ${addrFixed}/${missingAddr.length}\n`);

  // ── 1C. VENUES WITH SHORT/NULL DESCRIPTIONS ────────
  console.log('📝 1C. VENUES WITH SHORT OR NULL DESCRIPTIONS');
  console.log('─'.repeat(50));

  const allVenues = await fetchAll('activities', 'id, name, description, category, city, state');
  const toFixDesc = allVenues.filter(v => !v.description || v.description.length < 30);
  console.log(`  Found ${toFixDesc.length} venues with short/null descriptions\n`);
  stats.venues.shortDesc = toFixDesc.length;
  let descFixed = 0;

  for (const v of toFixDesc) {
    const city = v.city || '';
    const state = v.state || '';
    const cat = v.category || 'venue';
    const loc = city && state ? ` in ${city}, ${state}` : state ? ` in ${STATE_NAMES[state] || state}` : '';
    const newDesc = `${v.name} — a ${cat.toLowerCase()}${loc}. Visit for family-friendly activities, programs, and events.`;
    descFixed++;
    if (!DRY_RUN) {
      await supabase.from('activities').update({ description: newDesc }).eq('id', v.id);
    }
  }
  stats.venues.descFixed = descFixed;
  console.log(`  Fixed: ${descFixed}\n`);

  // ── 1D. VENUES MISSING SUBCATEGORY ──────────────────
  console.log('🏷️  1D. VENUES MISSING SUBCATEGORY');
  console.log('─'.repeat(50));

  const missingSub = await fetchAll('activities', 'id, name, category, subcategory', q => q.is('subcategory', null).not('category', 'is', null));
  console.log(`  Found ${missingSub.length} venues missing subcategory (that have category)\n`);
  stats.venues.missingSub = missingSub.length;
  let subFixed = 0;

  for (const v of missingSub) {
    const sub = inferSubcategory(v.name, v.category);
    if (sub) {
      console.log(`  ✅ ${(v.name || '').substring(0, 40)} [${v.category}] → ${sub}`);
      subFixed++;
      if (!DRY_RUN) {
        await supabase.from('activities').update({ subcategory: sub }).eq('id', v.id);
      }
    }
  }
  stats.venues.subFixed = subFixed;
  console.log(`\n  Fixed: ${subFixed}/${missingSub.length}\n`);

  // ════════════════════════════════════════════════════════════
  // PART 2: EVENT FIXES
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60));
  console.log('█  PART 2: EVENT FIXES');
  console.log('█'.repeat(60) + '\n');

  // ── 2A. EVENTS MISSING EVENT_DATE ──────────────────
  console.log('📅 2A. EVENTS MISSING EVENT_DATE');
  console.log('─'.repeat(50));

  const missingEventDate = await fetchAll('events', 'id, name, event_date, date', q => q.or('event_date.is.null,event_date.eq.'));
  const noEventDate = missingEventDate.filter(e => !e.event_date || e.event_date.trim() === '');
  console.log(`  Found ${noEventDate.length} events missing event_date\n`);
  stats.events.missingEventDate = noEventDate.length;
  let eventDateFixed = 0;

  for (const e of noEventDate) {
    if (e.date) {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
        console.log(`  ✅ "${(e.name || '').substring(0, 40)}" → ${dateStr}`);
        eventDateFixed++;
        if (!DRY_RUN) {
          await supabase.from('events').update({ event_date: dateStr }).eq('id', e.id);
        }
      }
    }
  }
  stats.events.eventDateFixed = eventDateFixed;
  console.log(`\n  Fixed: ${eventDateFixed}/${noEventDate.length}\n`);

  // ── 2B. EVENTS MISSING STATE ───────────────────────
  console.log('🗺️  2B. EVENTS MISSING STATE');
  console.log('─'.repeat(50));

  const missingState = await fetchAll('events', 'id, name, state, city, venue, activity_id, geohash', q => q.or('state.is.null,state.eq.'));
  const noState = missingState.filter(e => !e.state || e.state.trim() === '');
  console.log(`  Found ${noState.length} events missing state\n`);
  stats.events.missingState = noState.length;
  let stateFixed = 0;

  for (const e of noState) {
    let state = null;
    let method = '';

    if (e.activity_id) {
      const { data: act } = await supabase.from('activities').select('state, city').eq('id', e.activity_id).single();
      if (act?.state) { state = act.state; method = 'activity'; }
    }

    if (!state && e.venue) {
      const { data: acts } = await supabase.from('activities').select('state').eq('name', e.venue).not('state', 'is', null).limit(1);
      if (acts?.length > 0) { state = acts[0].state; method = 'venue_match'; }
    }

    if (!state && e.geohash) {
      const { latitude: lat, longitude: lng } = ngeohash.decode(e.geohash);
      const rev = await reverseGeocode(lat, lng);
      if (rev?.state) {
        const abbr = STATE_ABBREVS[rev.state.toLowerCase()] || rev.state;
        state = abbr;
        method = 'reverse_geo';
      }
    }

    if (state) {
      console.log(`  ✅ "${(e.name || '').substring(0, 40)}" → ${state} [${method}]`);
      stateFixed++;
      if (!DRY_RUN) {
        await supabase.from('events').update({ state }).eq('id', e.id);
      }
    } else {
      console.log(`  ❌ "${(e.name || '').substring(0, 40)}" — no source for state`);
    }
  }
  stats.events.stateFixed = stateFixed;
  console.log(`\n  Fixed: ${stateFixed}/${noState.length}\n`);

  // ── 2C. EVENTS MISSING GEOHASH/LOCATION ────────────
  console.log('📍 2C. EVENTS MISSING GEOHASH/LOCATION');
  console.log('─'.repeat(50));

  const missingGeoEvt = await fetchAll('events', 'id, name, venue, city, state, address, geohash, location, activity_id', q => q.is('geohash', null));
  console.log(`  Found ${missingGeoEvt.length} events missing geohash\n`);
  stats.events.missingGeoEvt = missingGeoEvt.length;
  let evtGeoFixed = 0;

  for (const e of missingGeoEvt) {
    let coords = null;
    let method = '';

    if (e.activity_id) {
      const { data: act } = await supabase.from('activities').select('geohash').eq('id', e.activity_id).single();
      if (act?.geohash) {
        const decoded = ngeohash.decode(act.geohash);
        coords = { latitude: decoded.latitude, longitude: decoded.longitude };
        method = 'activity';
      }
    }

    if (!coords && e.venue) {
      const { data: acts } = await supabase.from('activities').select('geohash').eq('name', e.venue).not('geohash', 'is', null).limit(1);
      if (acts?.length > 0) {
        const decoded = ngeohash.decode(acts[0].geohash);
        coords = { latitude: decoded.latitude, longitude: decoded.longitude };
        method = 'venue_match';
      }
    }

    if (!coords) {
      const stateFull = STATE_NAMES[e.state] || e.state || '';
      if (e.address && e.city && stateFull) {
        coords = await forwardGeocode(`${e.address}, ${e.city}, ${stateFull}`);
        if (coords) method = 'geocode_addr';
      }
      if (!coords && e.venue && e.city && stateFull) {
        coords = await forwardGeocode(`${e.venue}, ${e.city}, ${stateFull}`);
        if (coords) method = 'geocode_venue_city';
      }
      if (!coords && e.venue && stateFull) {
        coords = await forwardGeocode(`${e.venue}, ${stateFull}`);
        if (coords) method = 'geocode_venue_state';
      }
      if (!coords && e.city && stateFull) {
        coords = await forwardGeocode(`${e.city}, ${stateFull}`);
        if (coords) method = 'geocode_city';
      }
    }

    if (coords) {
      const gh = ngeohash.encode(coords.latitude, coords.longitude, 7);
      const wkt = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;
      console.log(`  ✅ "${(e.name || '').substring(0, 40)}" → ${method} (${gh})`);
      evtGeoFixed++;
      if (!DRY_RUN) {
        await supabase.from('events').update({ geohash: gh, location: wkt }).eq('id', e.id);
      }
    } else {
      console.log(`  ❌ "${(e.name || '').substring(0, 40)}" — no source for location`);
    }
  }
  stats.events.evtGeoFixed = evtGeoFixed;
  console.log(`\n  Fixed: ${evtGeoFixed}/${missingGeoEvt.length}\n`);

  // ── 2D. EVENTS MISSING CITY ────────────────────────
  console.log('🏙️  2D. EVENTS MISSING CITY');
  console.log('─'.repeat(50));

  const missingCity = await fetchAll('events', 'id, name, city, state, venue, activity_id, geohash', q => q.or('city.is.null,city.eq.'));
  const noCity = missingCity.filter(e => !e.city || e.city.trim() === '');
  console.log(`  Found ${noCity.length} events missing city\n`);
  stats.events.missingCity = noCity.length;
  let cityFixed = 0;

  for (const e of noCity) {
    let city = null;
    let method = '';

    if (e.activity_id) {
      const { data: act } = await supabase.from('activities').select('city').eq('id', e.activity_id).single();
      if (act?.city) { city = act.city; method = 'activity'; }
    }

    if (!city && e.venue) {
      const { data: acts } = await supabase.from('activities').select('city').eq('name', e.venue).not('city', 'is', null).limit(1);
      if (acts?.length > 0) { city = acts[0].city; method = 'venue_match'; }
    }

    if (!city && e.geohash) {
      const { latitude: lat, longitude: lng } = ngeohash.decode(e.geohash);
      const rev = await reverseGeocode(lat, lng);
      if (rev?.city) { city = rev.city; method = 'reverse_geo'; }
    }

    if (city) {
      console.log(`  ✅ "${(e.name || '').substring(0, 40)}" → ${city} [${method}]`);
      cityFixed++;
      if (!DRY_RUN) {
        await supabase.from('events').update({ city }).eq('id', e.id);
      }
    } else {
      console.log(`  ❌ "${(e.name || '').substring(0, 40)}" — no source for city`);
    }
  }
  stats.events.cityFixed = cityFixed;
  console.log(`\n  Fixed: ${cityFixed}/${noCity.length}\n`);

  // ── 2E. EVENTS MISSING DESCRIPTION ─────────────────
  console.log('📝 2E. EVENTS MISSING DESCRIPTION');
  console.log('─'.repeat(50));

  const missingDescEvt = await fetchAll('events', 'id, name, description, venue, city, state, category, event_date', q => q.is('description', null));
  console.log(`  Found ${missingDescEvt.length} events missing description\n`);
  stats.events.missingDesc = missingDescEvt.length;
  let evtDescFixed = 0;

  for (const e of missingDescEvt) {
    const parts = [];
    if (e.venue) parts.push(`at ${e.venue}`);
    if (e.city && e.state) parts.push(`in ${e.city}, ${e.state}`);
    else if (e.city) parts.push(`in ${e.city}`);
    else if (e.state) parts.push(`in ${STATE_NAMES[e.state] || e.state}`);

    const where = parts.length > 0 ? ` ${parts.join(' ')}` : '';
    const cat = e.category ? ` ${e.category.toLowerCase()}` : '';
    const desc = `Join us for ${e.name}${where}. A${cat} event for families and kids of all ages.`;

    evtDescFixed++;
    if (!DRY_RUN) {
      await supabase.from('events').update({ description: desc }).eq('id', e.id);
    }
  }
  stats.events.evtDescFixed = evtDescFixed;
  console.log(`  Fixed: ${evtDescFixed}/${missingDescEvt.length}\n`);

  // ── 2F. EVENTS MISSING START_TIME ──────────────────
  console.log('⏰ 2F. EVENTS MISSING START_TIME');
  console.log('─'.repeat(50));

  const missingTime = await fetchAll('events', 'id, name, event_date, start_time', q => q.is('start_time', null).not('event_date', 'is', null));
  console.log(`  Found ${missingTime.length} events missing start_time (with event_date text)\n`);
  stats.events.missingTime = missingTime.length;
  let timeFixed = 0;

  for (const e of missingTime) {
    const time = extractTimeFromDateString(e.event_date);
    if (time?.startTime) {
      timeFixed++;
      if (!DRY_RUN) {
        const update = { start_time: time.startTime };
        if (time.endTime) update.end_time = time.endTime;
        await supabase.from('events').update(update).eq('id', e.id);
      }
    }
  }
  stats.events.timeFixed = timeFixed;
  console.log(`  Fixed: ${timeFixed}/${missingTime.length} (rest have no time in event_date text)\n`);

  // ── 2G. EVENTS MISSING AGE_RANGE ──────────────────
  console.log('👶 2G. EVENTS MISSING AGE_RANGE');
  console.log('─'.repeat(50));

  const missingAge = await fetchAll('events', 'id, name, description, age_range', q => q.is('age_range', null));
  console.log(`  Found ${missingAge.length} events missing age_range\n`);
  stats.events.missingAge = missingAge.length;
  let ageFixed = 0;

  const ageBatches = [];
  for (const e of missingAge) {
    const age = detectAgeRange(e.name, e.description);
    if (age) {
      ageFixed++;
      ageBatches.push({ id: e.id, age_range: age });
    }
  }

  if (!DRY_RUN && ageBatches.length > 0) {
    for (let i = 0; i < ageBatches.length; i++) {
      await supabase.from('events').update({ age_range: ageBatches[i].age_range }).eq('id', ageBatches[i].id);
      if ((i + 1) % 200 === 0) {
        process.stdout.write(`  Updated ${i + 1}/${ageBatches.length}...\r`);
      }
    }
    console.log(`  Updated ${ageBatches.length}/${ageBatches.length}    `);
  }

  // Show distribution
  const ageDistribution = {};
  for (const item of ageBatches) {
    ageDistribution[item.age_range] = (ageDistribution[item.age_range] || 0) + 1;
  }
  console.log('\n  Age range distribution of newly tagged events:');
  for (const [range, count] of Object.entries(ageDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${range}: ${count}`);
  }

  stats.events.ageFixed = ageFixed;
  console.log(`\n  Fixed: ${ageFixed}/${missingAge.length} (rest have no age keywords in name/description)\n`);

  // ── SAVE GEOCODE CACHE ─────────────────────────────
  saveCache();

  // ── SUMMARY ────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log('\n  VENUES:');
  console.log(`    Geohash/location: ${stats.venues.geoFixed}/${stats.venues.missingGeo} fixed`);
  console.log(`    Address:          ${stats.venues.addrFixed}/${stats.venues.missingAddr} fixed`);
  console.log(`    Description:      ${stats.venues.descFixed} fixed`);
  console.log(`    Subcategory:      ${stats.venues.subFixed}/${stats.venues.missingSub} fixed`);
  console.log('\n  EVENTS:');
  console.log(`    Event date:       ${stats.events.eventDateFixed}/${stats.events.missingEventDate} fixed`);
  console.log(`    State:            ${stats.events.stateFixed}/${stats.events.missingState} fixed`);
  console.log(`    Geohash/location: ${stats.events.evtGeoFixed}/${stats.events.missingGeoEvt} fixed`);
  console.log(`    City:             ${stats.events.cityFixed}/${stats.events.missingCity} fixed`);
  console.log(`    Description:      ${stats.events.evtDescFixed}/${stats.events.missingDesc} fixed`);
  console.log(`    Start time:       ${stats.events.timeFixed}/${stats.events.missingTime} fixed`);
  console.log(`    Age range:        ${stats.events.ageFixed}/${stats.events.missingAge} fixed`);
  console.log(`\n  API calls: ${apiCalls}`);

  if (DRY_RUN) {
    console.log(`\n  ⚠️  DRY RUN — run with --save to apply all fixes\n`);
  } else {
    console.log(`\n  ✅ All fixes applied!\n`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
