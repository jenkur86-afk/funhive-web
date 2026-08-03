#!/usr/bin/env node

/**
 * BACKFILL AGE_RANGE FOR EXISTING "ALL AGES" EVENTS
 *
 * On 2026-08-03 the save-time age detection pipeline (supabase-adapter.js's
 * detectAgeRange()) was extended to recognize grade-level phrasing — "Gr 4-8",
 * "K-1st Grade", "6-8th Grade", "Grades 3-5" — that keyword matching missed
 * before. (An earlier version of this fix fell back to normalizing the raw
 * title directly when nothing matched; that was reverted the same day after
 * it started misreading unrelated numbers in titles — times, registration-ID/
 * year pairs, skill levels — as ages. The grade checks are anchored to
 * "grade"/"gr"/"k-" context specifically to avoid that.) Five scrapers' own
 * weaker local detectors were also removed in favor of the shared pipeline.
 * See SCRAPER-FIX-LOG.jsonl for the full trace.
 *
 * That fix only applies going forward — dedup skips already-known events
 * before they ever reach the save path, so their age_range never gets
 * refreshed by a re-scrape. This script re-derives age_range for every
 * existing event currently tagged "All Ages" using the SAME detection chain
 * now used at save time, and updates any row where a better bracket is found.
 *
 * Only "All Ages" rows are touched — a row already correctly bracketed
 * (e.g. "Kids (6-8)") was already detected fine and won't change.
 *
 * Usage:
 *   node scripts/backfill-age-range.js                # Dry run (preview)
 *   node scripts/backfill-age-range.js --save         # Write changes to DB
 *   node scripts/backfill-age-range.js --limit=500    # Cap rows fetched (testing)
 */

const { supabase, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');
const { normalizeAgeRange } = require('../scrapers/helpers/age-range-normalizer');

const SAVE = process.argv.includes('--save');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

// ── Pull every event currently tagged "All Ages" ──
async function fetchAllAgesEvents() {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    if (LIMIT && all.length >= LIMIT) break;
    const pageSize = LIMIT ? Math.min(PAGE, LIMIT - all.length) : PAGE;
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, scraper_name')
      .eq('age_range', 'All Ages')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// ── Re-derive age_range using the exact same chain as save time ──
// (data.ageRange isn't available here — we only have what's already in the
// DB — so this mirrors the live save-path chain exactly.) Deliberately does
// NOT fall back to normalizing the raw name directly when detectAgeRange finds
// nothing — that misreads unrelated numbers in titles (times, IDs, prices) as
// ages. See the note above detectAgeRange() in supabase-adapter.js.
function reDerive(name, description) {
  const candidate = detectAgeRange(name, description) || null;
  return candidate ? normalizeAgeRange(candidate) : 'All Ages';
}

function truncStr(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '…' : s;
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  BACKFILL AGE_RANGE  (${SAVE ? '💾 SAVE' : '👀 DRY RUN'})`);
  console.log(`  Mode: full scan of age_range = 'All Ages'${LIMIT ? ` (capped at ${LIMIT})` : ''}`);
  console.log(`${'═'.repeat(60)}\n`);

  const events = await fetchAllAgesEvents();
  console.log(`Total "All Ages" events fetched: ${events.length}\n`);
  if (events.length === 0) {
    console.log('Nothing to check.');
    return;
  }

  const changes = [];
  const flaggedAdult = [];
  const unchanged = { count: 0 };
  for (const e of events) {
    const newAgeRange = reDerive(e.name, e.description);
    if (newAgeRange === 'Adults') {
      // Don't silently relabel — per CLAUDE.md, "Adults" rows are meant to be
      // DELETED by a dedicated cleanup pass, not just re-bracketed. Flag for a
      // human/cleanup-script decision instead of writing it here.
      flaggedAdult.push(e);
    } else if (newAgeRange !== 'All Ages') {
      changes.push({ event: e, newAgeRange });
    } else {
      unchanged.count++;
    }
  }

  console.log('RESULT:');
  console.log('─'.repeat(60));
  console.log(`  Would reclassify: ${changes.length}`);
  console.log(`  Staying All Ages: ${unchanged.count}`);
  console.log(`  Flagged as adult-only (NOT changed — see below): ${flaggedAdult.length}\n`);

  if (flaggedAdult.length > 0) {
    console.log('FLAGGED AS ADULT-ONLY (left as All Ages, not auto-changed):');
    console.log('─'.repeat(60));
    for (const e of flaggedAdult.slice(0, 20)) {
      console.log(`  [${e.id}] "${truncStr(e.name, 70)}"  (${e.scraper_name || '?'})`);
    }
    if (flaggedAdult.length > 20) console.log(`  ...and ${flaggedAdult.length - 20} more`);
    console.log('  Consider running scripts/fix-all-data-quality.js (which deletes adult-only rows) instead.\n');
  }

  // Breakdown of new brackets assigned
  const byBracket = new Map();
  for (const c of changes) byBracket.set(c.newAgeRange, (byBracket.get(c.newAgeRange) || 0) + 1);
  console.log('NEW BRACKET BREAKDOWN:');
  console.log('─'.repeat(60));
  for (const [bracket, count] of [...byBracket.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(6)}  ${bracket}`);
  }
  console.log();

  // Per-scraper breakdown (top 20 by change count)
  const byScraper = new Map();
  for (const c of changes) {
    const k = c.event.scraper_name || '(unknown)';
    byScraper.set(k, (byScraper.get(k) || 0) + 1);
  }
  const scraperRows = [...byScraper.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('TOP 20 SCRAPERS BY RECLASSIFICATION COUNT:');
  console.log('─'.repeat(60));
  for (const [scraper, count] of scraperRows) {
    console.log(`  ${count.toString().padStart(6)}  ${scraper}`);
  }
  console.log();

  console.log('SAMPLES (first 12 reclassifications):');
  console.log('─'.repeat(60));
  for (const c of changes.slice(0, 12)) {
    console.log(`  "${truncStr(c.event.name, 60)}"`);
    console.log(`     All Ages → ${c.newAgeRange}   (${c.event.scraper_name || '?'})`);
  }
  console.log();

  if (!SAVE) {
    console.log('🔎 DRY RUN — re-run with --save to apply.\n');
    return;
  }

  console.log(`🔧 APPLYING ${changes.length} AGE_RANGE UPDATES...\n`);
  let ok = 0, fail = 0;
  for (const c of changes) {
    const { error } = await supabase
      .from('events')
      .update({ age_range: c.newAgeRange })
      .eq('id', c.event.id);
    if (error) {
      fail++;
      console.log(`  ❌ ${c.event.id}: ${error.message}`);
    } else {
      ok++;
    }
  }
  console.log(`\n✅ Updated ${ok} events  (${fail} failed)`);
  console.log(`ℹ️  ${unchanged.count} events left as All Ages — no age signal found in name/description.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
