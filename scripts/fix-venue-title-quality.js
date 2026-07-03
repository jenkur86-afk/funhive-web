#!/usr/bin/env node

/**
 * FIX VENUE/TITLE DATA QUALITY ISSUES
 *
 * One-off backfill for rows scraped before saveEvent()/flattenEvent() started
 * applying stripPromoBracketCruft() / normalizeShoutedTitle() / the
 * venue-equals-title guard (see scrapers/helpers/supabase-adapter.js).
 *
 *   Step 1: Strip bracketed promo/ticket cruft from event titles, e.g.
 *           "Toddler Time (TICKET LINK)" -> "Toddler Time"
 *   Step 2: Normalize SHOUTED all-caps titles to Title Case (guarded against
 *           mangling short acronyms like "GLOW"/"STEM"/"4H")
 *   Step 3: Null out + re-derive venue when venue exactly duplicates the
 *           event title (usually a scraper bug, not a real venue name)
 *
 * Usage:
 *   node scripts/fix-venue-title-quality.js                # Dry run (preview)
 *   node scripts/fix-venue-title-quality.js --save          # Save changes to DB
 *   node scripts/fix-venue-title-quality.js --recent-only   # Last 72h only (FIX_WINDOW_HOURS to override)
 */

const {
  supabase,
  cleanVenueName,
  deriveVenueFallback,
  stripPromoBracketCruft,
  normalizeShoutedTitle,
} = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const RECENT_ONLY = process.argv.includes('--recent-only');
const FIX_WINDOW_HOURS = parseInt(process.env.FIX_WINDOW_HOURS || '72', 10);
const RECENT_THRESHOLD_ISO = RECENT_ONLY
  ? new Date(Date.now() - FIX_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  : null;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Paginated fetch with retries (mirrors scripts/fix-event-quality.js) ──
async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  const pageSize = 500;

  while (true) {
    let retries = 0;
    let data, error;

    while (retries < 3) {
      let query = supabase.from(table).select(select);
      if (RECENT_THRESHOLD_ISO) {
        query = query.gte('created_at', RECENT_THRESHOLD_ISO);
      }
      // CRITICAL: must order by a stable column before .range() — Postgres
      // gives no row-order guarantee without ORDER BY, so unordered pagination
      // can return the same row on multiple pages (see fix-event-quality.js
      // comment on the 2026-05-15 incident this rule prevents).
      query = query.order('id', { ascending: true }).range(from, from + pageSize - 1);

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

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX VENUE/TITLE QUALITY`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}${RECENT_ONLY ? ` (recent ${FIX_WINDOW_HOURS}h only)` : ''}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  let totalFixed = 0;

  // ── Step 1: Strip promo/ticket bracket cruft + extra whitespace from titles ──
  console.log(`\n🧹 STEP 1: Strip promo/ticket cruft & extra whitespace from titles`);
  console.log(`───────────────────────────────────────`);
  const forCruft = await fetchAll('events', 'id, name');
  const cruftRows = forCruft
    .map(e => ({ id: e.id, name: e.name, cleaned: stripPromoBracketCruft(e.name) }))
    .filter(e => e.cleaned && e.cleaned !== e.name);
  console.log(`  Scanned ${forCruft.length} events`);
  console.log(`  Found ${cruftRows.length} titles with promo/ticket cruft or extra whitespace`);
  if (SAVE && cruftRows.length > 0) {
    for (const e of cruftRows) {
      await supabase.from('events').update({ name: e.cleaned }).eq('id', e.id);
    }
    console.log(`  ✅ Cleaned ${cruftRows.length} titles`);
  } else {
    cruftRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" -> "${e.cleaned}"`));
  }
  totalFixed += cruftRows.length;

  // ── Step 2: Normalize SHOUTED all-caps titles to Title Case ──
  console.log(`\n🔤 STEP 2: Normalize all-caps titles`);
  console.log(`───────────────────────────────────────`);
  const forShout = await fetchAll('events', 'id, name');
  const shoutRows = forShout
    .map(e => ({ id: e.id, name: e.name, cleaned: normalizeShoutedTitle(e.name) }))
    .filter(e => e.cleaned && e.cleaned !== e.name);
  console.log(`  Scanned ${forShout.length} events`);
  console.log(`  Found ${shoutRows.length} shouted titles`);
  if (SAVE && shoutRows.length > 0) {
    for (const e of shoutRows) {
      await supabase.from('events').update({ name: e.cleaned }).eq('id', e.id);
    }
    console.log(`  ✅ Normalized ${shoutRows.length} titles`);
  } else {
    shoutRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" -> "${e.cleaned}"`));
  }
  totalFixed += shoutRows.length;

  // ── Step 3: Null out + re-derive venue when venue == title ──
  console.log(`\n🏛️  STEP 3: Fix venue duplicating event title`);
  console.log(`───────────────────────────────────────`);
  const forVenue = await fetchAll('events', 'id, name, venue, address, city, state');
  const dupeVenueRows = forVenue.filter(e =>
    e.venue && e.name && e.venue.trim().toLowerCase() === e.name.trim().toLowerCase()
  );
  console.log(`  Scanned ${forVenue.length} events`);
  console.log(`  Found ${dupeVenueRows.length} events where venue duplicates the title`);
  if (SAVE && dupeVenueRows.length > 0) {
    let rederived = 0;
    for (const e of dupeVenueRows) {
      const derived = deriveVenueFallback(e.name, e.address, e.city, e.state);
      const newVenue = derived ? cleanVenueName(derived).substring(0, 200) : null;
      await supabase.from('events').update({ venue: newVenue }).eq('id', e.id);
      if (newVenue) rederived++;
    }
    console.log(`  ✅ Fixed ${dupeVenueRows.length} rows (${rederived} re-derived a venue, ${dupeVenueRows.length - rederived} set to null)`);
  } else {
    dupeVenueRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" [venue="${e.venue}"]`));
  }
  totalFixed += dupeVenueRows.length;

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
