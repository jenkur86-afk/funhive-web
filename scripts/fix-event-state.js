#!/usr/bin/env node

/**
 * FIX EVENT STATE — backstop for the 8+8 events fix-event-quality.js Step 3
 * couldn't infer.
 *
 * Existing Step 3 tries (in order):
 *   1. scraper_name regex [-_ ]([A-Z]{2})(?:$|\d)
 *   2. address "XX 12345" pattern
 *   3. Reverse geocode from coordinates
 *
 * This script adds:
 *   4. Full state name in any text field (name, venue, address, city)
 *   5. scraper-registry lookup (e.g. "Macaroni Kid Brooklyn NW" → NY)
 *   6. Nominatim forward-geocode on city alone (last resort, slow)
 *
 * Also dumps the problem rows so you can eyeball anything still left.
 *
 * Usage:
 *   node scripts/fix-event-state.js          # dry run (lists what would change)
 *   node scripts/fix-event-state.js --save   # apply
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');
const axios = require('axios');

const SAVE = process.argv.includes('--save');

const STATE_NAME_TO_ABBREV = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'district of columbia': 'DC',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL',
  'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA',
  'maine': 'ME', 'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR',
  'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA',
  'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};
const VALID = new Set(Object.values(STATE_NAME_TO_ABBREV));

// Pull state hints out of the scraper registry by reading raw scraper-registry.js.
// We do this once at startup so per-row lookups are pure dictionary hits.
let SCRAPER_STATE_HINTS = {};
try {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'scrapers', 'scraper-registry.js'), 'utf8');
  // Match every "'Foo': { ... state: 'XX' ... }" or "state: ['XX', ...]" block — loose but enough
  const blockRe = /'([^']+)':\s*\{([^}]*?)\}/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const key = m[1];
    const block = m[2];
    const stateM = block.match(/state:\s*['"]([A-Z]{2})['"]/);
    if (stateM && VALID.has(stateM[1])) SCRAPER_STATE_HINTS[key] = stateM[1];
  }
} catch (_) { /* registry missing — fine */ }

const NOMINATIM_UA = 'FunHive/1.0 (https://funhive.co; jenkur86@gmail.com)';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function nominatimState(city, country = 'us') {
  if (!city) return null;
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: city, format: 'json', limit: 1, countrycodes: country, addressdetails: 1 },
      headers: { 'User-Agent': NOMINATIM_UA },
      timeout: 8000,
    });
    if (res.data && res.data[0] && res.data[0].address) {
      const a = res.data[0].address;
      const raw = (a.state || '').toLowerCase();
      const abbrev = STATE_NAME_TO_ABBREV[raw];
      if (abbrev) return abbrev;
    }
  } catch (_) { /* ignore */ }
  return null;
}

function inferFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // ", XX " or ", XX," — anchored 2-letter abbrev after a comma
  const abbrevM = text.match(/,\s*([A-Z]{2})(?=\s|,|$|\d{5})/);
  if (abbrevM && VALID.has(abbrevM[1])) return abbrevM[1];

  // "XX 12345" zip pattern (already tried by Step 3, but covers cases that script missed)
  const zipM = text.match(/\b([A-Z]{2})\s+\d{5}\b/);
  if (zipM && VALID.has(zipM[1])) return zipM[1];

  // Full state name anywhere
  for (const [name, abbrev] of Object.entries(STATE_NAME_TO_ABBREV)) {
    // Skip "washington" because it ambiguously matches "Washington DC" — handled by abbrev match above
    if (name === 'washington') continue;
    const re = new RegExp(`\\b${name.replace(/\s/g, '\\s+')}\\b`, 'i');
    if (re.test(t)) return abbrev;
  }
  return null;
}

// URL subdomain → state hints (e.g. KidsOutAndAbout regional sites).
// Added 2026-05-11 after the previous run left 10 events unresolved because
// the existing strategies couldn't see past the venue name.
const URL_SUBDOMAIN_STATE = {
  'pittsburgh': 'PA',
  'philadelphia': 'PA',
  'atlanta': 'GA',
  'albany': 'NY',
  'rochester': 'NY',
  'buffalo': 'NY',
  'syracuse': 'NY',
  'boston': 'MA',
  'chicago': 'IL',
  'detroit': 'MI',
  'cleveland': 'OH',
  'cincinnati': 'OH',
  'columbus': 'OH',
  'milwaukee': 'WI',
  'minneapolis': 'MN',
  'denver': 'CO',
  'houston': 'TX',
  'dallas': 'TX',
  'austin': 'TX',
  'phoenix': 'AZ',
  'seattle': 'WA',
  'portland': 'OR',
  'sacramento': 'CA',
  'losangeles': 'CA',
  'sandiego': 'CA',
  'tampa': 'FL',
  'orlando': 'FL',
  'miami': 'FL',
  'charlotte': 'NC',
  'raleigh': 'NC',
  'nashville': 'TN',
  'memphis': 'TN',
  'louisville': 'KY',
  'baltimore': 'MD',
  // DMV subdomain is multi-state; venue-text fallback resolves it (see CITY_TO_STATE)
};

// Specific city → state lookups that survive when the row's `city` field
// is junk (sometimes it's a street name) but the venue/name reveals the city.
const CITY_TO_STATE = {
  'annapolis': 'MD',
  'baltimore': 'MD',
  'bethesda': 'MD',
  'rockville': 'MD',
  'frederick': 'MD',  // MD-leaning vs. VA
  'bethany beach': 'DE',
  'rehoboth beach': 'DE',
  'wilmington': 'DE',
  'dover': 'DE',
  'niskayuna': 'NY',
  'schenectady': 'NY',
  'acworth': 'GA',
  'kennesaw': 'GA',
  'marietta': 'GA',
  'roswell': 'GA',
  'alpharetta': 'GA',
};

// Non-US states that get scraped accidentally (Eventbrite, etc.) — flag for delete.
const NON_US_STATES = new Set(['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE']);

function inferFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/^https?:\/\/([^.]+)\.([^.]+)\./i);
  if (!m) return null;
  const sub = m[1].toLowerCase();
  return URL_SUBDOMAIN_STATE[sub] || null;
}

function inferFromCity(...values) {
  for (const v of values) {
    if (!v) continue;
    const lower = String(v).toLowerCase();
    for (const [city, state] of Object.entries(CITY_TO_STATE)) {
      // Word-boundary match so "Annapolis" matches inside "Annapolis Irish Festival"
      if (new RegExp(`\\b${city.replace(/\s+/g, '\\s+')}\\b`, 'i').test(lower)) {
        return state;
      }
    }
  }
  return null;
}

async function inferState(row) {
  // 1. scraper-registry exact match
  if (row.scraper_name && SCRAPER_STATE_HINTS[row.scraper_name]) {
    return { state: SCRAPER_STATE_HINTS[row.scraper_name], via: 'scraper-registry' };
  }

  // 2. scraper_name regex (loose — "Macaroni Kid Brooklyn NW" doesn't match the
  // existing fix-event-quality regex because it's space-separated and lacks state code)
  if (row.scraper_name) {
    const m = row.scraper_name.match(/[-_ ]([A-Z]{2})(?:$|\d|\s|-)/);
    if (m && VALID.has(m[1])) return { state: m[1], via: 'scraper-name-regex' };
  }

  // 3. URL subdomain (e.g. "pittsburgh.kidsoutandabout.com" → PA)
  const urlState = inferFromUrl(row.url) || inferFromUrl(row.source_url);
  if (urlState) return { state: urlState, via: 'url-subdomain' };

  // 4. City keyword in name/venue/city/address (catches "Annapolis Irish Festival" → MD
  //    even when row.city is a street name)
  const cityState = inferFromCity(row.city, row.venue, row.name, row.address);
  if (cityState) return { state: cityState, via: 'city-keyword' };

  // 5. address/venue/city/name textual match (full state name / abbrev / zip)
  const textChunks = [row.address, row.venue, row.city, row.name].filter(Boolean);
  for (const chunk of textChunks) {
    const got = inferFromText(chunk);
    if (got) return { state: got, via: `text: ${chunk.substring(0, 30)}` };
  }

  // 6. Nominatim by city (last resort — costs ~1s per call)
  if (row.city) {
    await sleep(1100);
    const s = await nominatimState(row.city);
    if (s) return { state: s, via: 'nominatim-city' };
  }

  return null;
}

async function fetchAll(filter) {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let q = supabase.from('events').select(
      'id, name, state, city, address, venue, scraper_name, source_url, url'
    );
    if (filter === 'missing') q = q.or('state.is.null,state.eq.');
    else if (filter === 'invalid') q = q.not('state', 'is', null);
    // .order('id') required for stable pagination — see 2026-05-15 incident.
    q = q.order('id', { ascending: true }).range(from, from + PAGE - 1);
    const { data, error } = await q;
    if (error) { console.error('Fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (filter === 'invalid') {
    all = all.filter(r => r.state && !VALID.has(String(r.state).toUpperCase()));
  }
  return all;
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX EVENT STATE (missing + invalid)`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`  Loaded ${Object.keys(SCRAPER_STATE_HINTS).length} scraper→state hints from registry`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  const missing = await fetchAll('missing');
  const invalid = await fetchAll('invalid');

  console.log(`Missing state: ${missing.length}`);
  console.log(`Invalid state: ${invalid.length}\n`);

  const all = [
    ...missing.map(r => ({ row: r, kind: 'missing' })),
    ...invalid.map(r => ({ row: r, kind: 'invalid' })),
  ];

  let fixed = 0;
  let deletedNonUs = 0;
  let unresolved = [];

  for (const { row, kind } of all) {
    // Non-US (typically Canada via Eventbrite) — FunHive is US-only, so delete.
    // E.g. "Niagara Ukrainian Family Festival" with state=ON.
    const stateUpper = (row.state || '').toUpperCase();
    if (NON_US_STATES.has(stateUpper)) {
      console.log(`  🗑️  [${kind}] non-US (state=${stateUpper}): "${(row.name || '').substring(0, 50)}"`);
      if (SAVE) {
        const { error } = await supabase.from('events').delete().eq('id', row.id);
        if (!error) deletedNonUs++;
      } else {
        deletedNonUs++;
      }
      continue;
    }

    const inf = await inferState(row);
    const original = row.state || '(null)';
    if (inf) {
      console.log(`  ✅ [${kind}] "${(row.name || '').substring(0, 50)}"`);
      console.log(`         scraper=${row.scraper_name || '?'} city=${row.city || '?'} state=${original} → ${inf.state} (via ${inf.via})`);
      if (SAVE) {
        const { error } = await supabase.from('events').update({ state: inf.state }).eq('id', row.id);
        if (!error) fixed++;
      } else {
        fixed++;
      }
    } else {
      unresolved.push({ row, kind, original });
    }
  }

  if (unresolved.length > 0) {
    console.log(`\n⚠️  Unresolved (manual review):`);
    for (const u of unresolved) {
      console.log(`  ✗ [${u.kind}] state=${u.original} | "${(u.row.name || '').substring(0, 50)}"`);
      console.log(`         id=${u.row.id} scraper=${u.row.scraper_name || '?'} city=${u.row.city || '?'} venue=${u.row.venue || '?'}`);
      console.log(`         address=${u.row.address || '?'}`);
      console.log(`         url=${u.row.url || u.row.source_url || '?'}`);
    }
  }

  console.log(`\n${SAVE ? '💾' : '👀'} ${fixed} fixed, ${deletedNonUs} non-US deleted, ${unresolved.length} unresolved (of ${all.length})`);
}

main().catch(e => { console.error(e); process.exit(1); });
