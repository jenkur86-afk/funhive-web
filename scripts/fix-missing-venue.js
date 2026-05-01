#!/usr/bin/env node

/**
 * FIX EVENTS MISSING VENUE
 *
 * Finds events with venue IS NULL or venue = '' and attempts to backfill from:
 *   1. Name "at <Venue>" / "@ <Venue>" / "<Event> - <Venue>" patterns
 *   2. First comma-separated component of address (if not a street number)
 *   3. Falls back to city + " (general area)" so the event still has SOMETHING
 *      and isn't excluded from venue-aware UI elements
 *
 * Also reports per-scraper counts so you can identify which scrapers need
 * fixing to extract venue at scrape time.
 *
 * Usage:
 *   node scripts/fix-missing-venue.js                # Dry run (preview)
 *   node scripts/fix-missing-venue.js --save         # Save changes to DB
 *   node scripts/fix-missing-venue.js --recent-only  # Last 72h only
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const RECENT_ONLY = process.argv.includes('--recent-only');
const FIX_WINDOW_HOURS = parseInt(process.env.FIX_WINDOW_HOURS || '72', 10);
const RECENT_THRESHOLD_ISO = RECENT_ONLY
  ? new Date(Date.now() - FIX_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  : null;

// ── Pull all venue-null events with selective columns ──
async function fetchMissingVenue() {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase
      .from('events')
      .select('id, name, venue, address, city, state, scraper_name, url, source_url')
      .or('venue.is.null,venue.eq.')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (RECENT_THRESHOLD_ISO) q = q.gte('created_at', RECENT_THRESHOLD_ISO);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ── Strategy 1: extract venue from event name ──
// Matches: "Storytime at Brooklyn Public Library", "Yoga @ Central Park",
//          "Spring Festival - Town Square", "Movie Night | Civic Center"
// Avoids matching time fragments like "Storytime at 10am".
function extractVenueFromName(name) {
  if (!name || typeof name !== 'string') return null;
  const cleaned = name
    .replace(/\s+/g, ' ')
    .trim();

  // "X at Y" / "X @ Y" — Y must not start with a digit/time
  const atMatch = cleaned.match(/\s+(?:at|@)\s+([A-Z][^!?,–—\-|]{2,80})$/);
  if (atMatch) {
    const candidate = atMatch[1].trim();
    if (!/^\d/.test(candidate) && !/^\d+\s*(am|pm)/i.test(candidate)) {
      return cleanCandidate(candidate);
    }
  }

  // "Event - Venue" / "Event – Venue" / "Event | Venue" — last segment is the venue
  // Only trust this when the last segment starts with a capital letter
  const sepMatch = cleaned.match(/[\s][-–—|][\s]([A-Z][^|]{3,80})$/);
  if (sepMatch) {
    const candidate = sepMatch[1].trim();
    // Skip obvious non-venue suffixes
    if (/^(free|paid|online|virtual|register|registration|all\s*ages|kids|adults|family|teens?|preschool)/i.test(candidate)) return null;
    if (!/\d{1,2}\s*(am|pm)/i.test(candidate) && /[a-zA-Z]/.test(candidate)) {
      return cleanCandidate(candidate);
    }
  }

  return null;
}

function cleanCandidate(s) {
  return s
    .replace(/^[\s\-–—|:]+/, '')
    .replace(/[\s\-–—|:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

// ── Strategy 2: extract venue from address ──
// Address patterns we see:
//   "123 Main St, Springfield, IL 12345"            → no venue (street number first)
//   "Brooklyn Public Library, 123 Main St, ..."     → "Brooklyn Public Library"
//   "Central Park, New York, NY"                    → "Central Park"
function extractVenueFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  // Skip if first part looks like a street address (starts with a number)
  if (/^\d+\s/.test(first)) return null;
  // Skip if first part is a state abbrev or zip
  if (/^[A-Z]{2}$/.test(first) || /^\d{5}/.test(first)) return null;
  // Must have at least one letter and be 3-80 chars
  if (first.length < 3 || first.length > 80 || !/[a-zA-Z]/.test(first)) return null;
  return cleanCandidate(first);
}

// ── Strategy 3: city fallback ──
function cityFallback(city, state) {
  if (!city) return null;
  return state ? `${city}, ${state}` : city;
}

// ── Build the backfill plan for one event ──
function planBackfill(event) {
  const sources = [];

  const fromName = extractVenueFromName(event.name);
  if (fromName) sources.push({ source: 'name', venue: fromName });

  const fromAddr = extractVenueFromAddress(event.address);
  if (fromAddr) sources.push({ source: 'address', venue: fromAddr });

  const fromCity = cityFallback(event.city, event.state);
  if (fromCity) sources.push({ source: 'city', venue: fromCity });

  // Pick the first non-empty source — name > address > city
  return sources[0] || null;
}

// ── Main ──
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX EVENTS MISSING VENUE  (${SAVE ? '💾 SAVE' : '👀 DRY RUN'})`);
  console.log(`  Mode: ${RECENT_ONLY ? `--recent-only (last ${FIX_WINDOW_HOURS}h, since ${RECENT_THRESHOLD_ISO})` : 'full scan'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const events = await fetchMissingVenue();
  console.log(`Total events with missing venue: ${events.length}\n`);
  if (events.length === 0) {
    console.log('Nothing to fix.');
    return;
  }

  // Per-scraper breakdown
  const byScraper = new Map();
  for (const e of events) {
    const k = e.scraper_name || '(unknown)';
    if (!byScraper.has(k)) byScraper.set(k, []);
    byScraper.get(k).push(e);
  }
  const scraperRows = [...byScraper.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log('PER-SCRAPER BREAKDOWN:');
  console.log('─'.repeat(60));
  for (const [scraper, list] of scraperRows) {
    console.log(`  ${list.length.toString().padStart(4)}  ${scraper}`);
  }
  console.log();

  // Plan backfill
  const plans = events.map(e => ({ event: e, plan: planBackfill(e) }));
  const fixable = plans.filter(p => p.plan);
  const unfixable = plans.filter(p => !p.plan);

  // Source breakdown
  const bySource = { name: 0, address: 0, city: 0 };
  for (const p of fixable) bySource[p.plan.source]++;

  console.log('BACKFILL PLAN:');
  console.log('─'.repeat(60));
  console.log(`  Fixable:   ${fixable.length}`);
  console.log(`    from name "at X":   ${bySource.name}`);
  console.log(`    from address:       ${bySource.address}`);
  console.log(`    from city fallback: ${bySource.city}`);
  console.log(`  Unfixable: ${unfixable.length}\n`);

  // Show samples
  console.log('SAMPLES (first 12 fixable):');
  console.log('─'.repeat(60));
  for (const p of fixable.slice(0, 12)) {
    const ev = p.event;
    console.log(`  [${p.plan.source.padEnd(7)}] "${truncStr(ev.name, 50)}"`);
    console.log(`             venue → "${p.plan.venue}"`);
    console.log(`             scraper: ${ev.scraper_name || '?'}, city: ${ev.city || '?'}`);
  }
  console.log();

  if (unfixable.length > 0) {
    console.log(`UNFIXABLE SAMPLES (first 5) — these have no name/address/city to derive from:`);
    console.log('─'.repeat(60));
    for (const p of unfixable.slice(0, 5)) {
      const ev = p.event;
      console.log(`  ❌ "${truncStr(ev.name, 60)}"`);
      console.log(`       scraper: ${ev.scraper_name || '?'}, city: ${ev.city || '∅'}, addr: ${ev.address || '∅'}`);
    }
    console.log();
  }

  if (!SAVE) {
    console.log('🔎 DRY RUN — re-run with --save to apply.\n');
    return;
  }

  // Apply
  console.log(`🔧 APPLYING ${fixable.length} VENUE BACKFILLS...\n`);
  let ok = 0, fail = 0;
  for (const p of fixable) {
    const { error } = await supabase
      .from('events')
      .update({ venue: p.plan.venue })
      .eq('id', p.event.id);
    if (error) {
      fail++;
      console.log(`  ❌ ${p.event.id}: ${error.message}`);
    } else {
      ok++;
    }
  }
  console.log(`\n✅ Updated ${ok} events  (${fail} failed)`);
  if (unfixable.length > 0) {
    console.log(`ℹ️  ${unfixable.length} events left with venue=NULL — not enough info to derive a venue.`);
    console.log(`   Consider deleting them manually or fixing the scraper to extract venue.`);
  }
}

function truncStr(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '…' : s;
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
