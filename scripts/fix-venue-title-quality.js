#!/usr/bin/env node

/**
 * FIX VENUE/TITLE DATA QUALITY ISSUES
 *
 * One-off backfill for rows scraped before saveEvent()/flattenEvent() started
 * applying stripPromoBracketCruft() / normalizeShoutedTitle() / the
 * venue-equals-title guard (see scrapers/helpers/supabase-adapter.js).
 *
 *   Step 1 : Strip bracketed promo/ticket cruft and screen-reader chrome from
 *            event titles, e.g. "Toddler Time (TICKET LINK)" -> "Toddler Time",
 *            "Baby Storytime(Opens in a new tab)" -> "Baby Storytime"
 *   Step 1b: Collapse a title stored as the same phrase twice, e.g.
 *            "Family FestFamily Fest" -> "Family Fest"
 *   Step 1c: Decode HTML entities left raw in a title or venue, e.g.
 *            "Rocky&#8217;s Book Club" -> "Rocky’s Book Club"
 *   Step 2 : Normalize SHOUTED all-caps titles to Title Case (guarded against
 *            mangling short acronyms like "GLOW"/"STEM"/"4H")
 *   Step 3 : Null out + re-derive venue when venue exactly duplicates the
 *            event title (usually a scraper bug, not a real venue name)
 *
 * Usage:
 *   node scripts/fix-venue-title-quality.js                # Dry run (preview)
 *   node scripts/fix-venue-title-quality.js --save          # Save changes to DB
 *   node scripts/fix-venue-title-quality.js --recent-only   # Last 24h only (FIX_WINDOW_HOURS to override)
 *   node scripts/fix-venue-title-quality.js --only=1b       # Run one step only (ids: 1, 1b, 1c, 2, 3)
 *
 * This script is NOT part of the nightly fix-all chain — it is run by hand.
 */

const {
  supabase,
  cleanVenueName,
  deriveVenueFallback,
  stripPromoBracketCruft,
  collapseDoubledTitle,
  decodeHtmlEntities,
  normalizeShoutedTitle,
} = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const RECENT_ONLY = process.argv.includes('--recent-only');
// --only=<ids> runs just the named steps, e.g. --only=1b or --only=1,1b.
// Valid ids: 1 (promo/a11y cruft), 1b (doubled titles), 1c (HTML entities),
// 2 (shouted titles), 3 (venue == title). Default is all of them.
//
// It exists because the steps have independent risk profiles and a targeted
// backfill should not have to accept an unrelated rewrite as a side effect:
// normalizeShoutedTitle() lower-cases a leading acronym in a long shouted title
// ("AAAC ART -..." -> "Aaac Art -..."), which is a known rough edge, so running
// step 1b alone must not drag step 2 along with it.
const onlyArg = process.argv.find(a => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.split("=")[1].split(",").map(s => s.trim())) : null;
const runStep = (id) => !ONLY || ONLY.has(id);
const FIX_WINDOW_HOURS = parseInt(process.env.FIX_WINDOW_HOURS || '24', 10);
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

/**
 * Rename one event's title, and report what actually happened.
 *
 * Two things this must not do, both learned on 2026-08-23:
 *
 * 1. SWALLOW THE ERROR. The old loops fired `await supabase.update(...)` and
 *    ignored the result, then printed "✅ Cleaned N titles" using the count of
 *    rows they had *intended* to change. Four rows failed on every attempt and
 *    the script reported success three runs in a row.
 *
 * 2. TREAT A UNIQUE-CONTENT COLLISION AS A FAILURE. Those four failed with
 *    `idx_events_unique_content`, because the cleaned title already existed as
 *    its own row: "Books and Melodies in the Courtyard(Opens in a new tab)" and
 *    "Books and Melodies in the Courtyard" are the same event scraped through
 *    two different link elements. Renaming is impossible, but the row is a
 *    genuine duplicate of one that is already correct, so the right resolution
 *    is to delete it — after CONFIRMING the clean twin exists, never on the
 *    strength of the error message alone.
 *
 * Returns 'renamed' | 'deduped' | 'failed'.
 */
async function renameOrDedupe(id, cleaned) {
  const { error } = await supabase.from('events').update({ name: cleaned }).eq('id', id);
  if (!error) return 'renamed';
  if (!/idx_events_unique_content|duplicate key/i.test(error.message || '')) {
    console.log(`  ⚠️ update failed for ${id}: ${error.message}`);
    return 'failed';
  }
  // Prove the twin is really there before deleting anything.
  const { data: twin, error: twinErr } = await supabase
    .from('events').select('id').eq('name', cleaned).neq('id', id).limit(1);
  if (twinErr || !twin || twin.length === 0) {
    console.log(`  ⚠️ ${id} collided but no clean twin found — left alone`);
    return 'failed';
  }
  const { error: delErr } = await supabase.from('events').delete().eq('id', id);
  if (delErr) {
    console.log(`  ⚠️ delete failed for ${id}: ${delErr.message}`);
    return 'failed';
  }
  return 'deduped';
}

function reportRenameOutcome(label, counts) {
  const parts = [`${counts.renamed} ${label}`];
  if (counts.deduped) parts.push(`${counts.deduped} deleted as duplicates of an already-clean row`);
  if (counts.failed) parts.push(`${counts.failed} FAILED`);
  console.log(`  ${counts.failed ? '⚠️' : '✅'} ${parts.join(', ')}`);
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX VENUE/TITLE QUALITY`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}${RECENT_ONLY ? ` (recent ${FIX_WINDOW_HOURS}h only)` : ''}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  let totalFixed = 0;

  if (runStep("1")) {
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
      const counts = { renamed: 0, deduped: 0, failed: 0 };
      for (const e of cruftRows) counts[await renameOrDedupe(e.id, e.cleaned)]++;
      reportRenameOutcome("titles cleaned", counts);
    } else {
      cruftRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" -> "${e.cleaned}"`));
    }
    totalFixed += cruftRows.length;

  }

  if (runStep("1b")) {
    // ── Step 1b: Collapse titles stored as the same phrase twice ──
    // Some sites carry the event name in two nested elements and a container-level
    // textContent read concatenates both. flattenEvent() now collapses these at
    // scrape time; this is the backfill for rows written before 2026-08-23.
    // See collapseDoubledTitle() for the two guards that keep real doubled words
    // ("couscous", "cancan") and separated repeats ("New York, New York") intact.
    console.log(`
  🪞 STEP 1b: Collapse doubled titles`);
    console.log(`───────────────────────────────────────`);
    const forDoubled = await fetchAll("events", "id, name");
    const doubledRows = forDoubled
      .map(e => ({ id: e.id, name: e.name, cleaned: collapseDoubledTitle(e.name) }))
      .filter(e => e.cleaned && e.cleaned !== e.name);
    console.log(`  Scanned ${forDoubled.length} events`);
    console.log(`  Found ${doubledRows.length} doubled titles`);
    if (SAVE && doubledRows.length > 0) {
      const counts = { renamed: 0, deduped: 0, failed: 0 };
      for (const e of doubledRows) counts[await renameOrDedupe(e.id, e.cleaned)]++;
      reportRenameOutcome("titles collapsed", counts);
    } else {
      doubledRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" -> "${e.cleaned}"`));
    }
    totalFixed += doubledRows.length;
  }

  if (runStep("1c")) {
    // ── Step 1c: Decode HTML entities left raw in titles and venue names ──
    // 344 event names and 7 venues held an undecoded entity and rendered it literally on
    // the site — "Rocky&#8217;s Book Club", "Sit &amp; Stitch". flattenEvent() now decodes
    // at save time; this is the backfill. Venues go through cleanVenueName(), which decodes
    // first and can then also see a dash the entity had been hiding.
    console.log(`\n🔤 STEP 1c: Decode HTML entities in titles and venues`);
    console.log(`───────────────────────────────────────`);
    const forEnt = await fetchAll("events", "id, name, venue");
    const entNameRows = forEnt
      .map(e => ({ id: e.id, name: e.name, cleaned: decodeHtmlEntities(e.name) }))
      .filter(e => e.cleaned && e.cleaned !== e.name);
    const entVenueRows = forEnt
      .map(e => ({ id: e.id, venue: e.venue, cleaned: e.venue ? cleanVenueName(e.venue) : null }))
      .filter(e => e.cleaned && e.cleaned !== e.venue);
    console.log(`  Scanned ${forEnt.length} events`);
    console.log(`  Found ${entNameRows.length} titles and ${entVenueRows.length} venues with an HTML entity`);
    if (SAVE && (entNameRows.length || entVenueRows.length)) {
      const counts = { renamed: 0, deduped: 0, failed: 0 };
      for (const e of entNameRows) counts[await renameOrDedupe(e.id, e.cleaned)]++;
      reportRenameOutcome("titles decoded", counts);
      let venues = 0;
      for (const e of entVenueRows) {
        const { error } = await supabase.from("events").update({ venue: e.cleaned }).eq("id", e.id);
        if (error) console.log(`  ⚠️ venue update failed for ${e.id}: ${error.message}`);
        else venues++;
      }
      if (entVenueRows.length) console.log(`  ✅ ${venues} venues decoded`);
    } else {
      entNameRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" -> "${e.cleaned}"`));
      entVenueRows.slice(0, 5).forEach(e => console.log(`  - venue "${e.venue}" -> "${e.cleaned}"`));
    }
    totalFixed += entNameRows.length + entVenueRows.length;
  }

  if (runStep("2")) {
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
      const counts = { renamed: 0, deduped: 0, failed: 0 };
      for (const e of shoutRows) counts[await renameOrDedupe(e.id, e.cleaned)]++;
      reportRenameOutcome("titles normalized", counts);
    } else {
      shoutRows.slice(0, 10).forEach(e => console.log(`  - "${e.name}" -> "${e.cleaned}"`));
    }
    totalFixed += shoutRows.length;
  }

  if (runStep("3")) {
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

  }

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
