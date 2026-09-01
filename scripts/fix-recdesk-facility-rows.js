#!/usr/bin/env node

/**
 * FIX RECDESK FACILITY-BOOKING ROWS — one-off backfill.
 * Plan and evidence: reports/recdesk-junk-taxonomy.md (2026-08-31).
 *
 * RecDesk's calendar API discriminates item kinds via EventType: 'P' = real
 * program, 'F' = facility booking (private team reservations: "MJBSA
 * Practice", "Field Prep"), 'G' = league game rows ("X vs. Y (field)"). The
 * scraper stored all three as events for months; it now skips F and G at
 * source. This script removes the F/G rows already in the database.
 *
 * Stored rows never persisted EventType, so classification comes from the
 * committed fleet snapshot reports/recdesk-classification-2026-08-31.json —
 * a live pull of every tenant's calendar over the scraper's own window.
 *
 * NO-INFORMATION-LOSS RULES (taxonomy doc, "mechanics" section):
 *  - A row is deleted ONLY on a positive, UNANIMOUS classification: every
 *    snapshot item sharing its (tenant, title) is typed F or G. Any P among
 *    them → KEEP. No snapshot match → UNMATCHED, left alone and counted.
 *  - Only future-dated rows are touched; past rows expire via the normal
 *    past-event cleanup.
 *  - Before deleting, every doomed row is written in full to
 *    reports/recdesk-deleted-rows-<date>.jsonl. _stableEventId is
 *    deterministic, so restoration is a mechanical re-insert from that file.
 *  - Dry run by default; --save deletes. A hard ceiling refuses to delete
 *    more than MAX_DELETIONS rows no matter what the classification says.
 *
 * Usage:
 *   node scripts/fix-recdesk-facility-rows.js          # dry run + cross-tab
 *   node scripts/fix-recdesk-facility-rows.js --save   # snapshot, then delete
 */

const fs = require('fs');
const path = require('path');
const {
  supabase,
  stripVenueSuffixFromTitle,
} = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const SNAPSHOT = path.join(__dirname, '..', 'reports', 'recdesk-classification-2026-08-31.json');
const DELETED_LOG = path.join(__dirname, '..', 'reports',
  `recdesk-deleted-rows-${new Date().toISOString().slice(0, 10)}.jsonl`);
const MAX_DELETIONS = 14000; // expected ~10.3k F + ~0.7k G; anything past this is a bug

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function loadClassification() {
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  // slug -> normalized stripped title -> Set of EventTypes seen for it
  const map = new Map();
  for (const t of snap.tenants) {
    if (t.error || !t.items) continue;
    const m = new Map();
    for (const i of t.items) {
      // Snapshot titles are raw EventName with the facility appended; stored
      // names had that suffix stripped by the 2026-08-31 venue-suffix fix, so
      // apply the same strip before matching.
      const key = norm(stripVenueSuffixFromTitle(i.title, i.facility));
      if (!m.has(key)) m.set(key, new Set());
      m.get(key).add(i.type);
    }
    map.set(t.slug, m);
  }
  return map;
}

async function fetchStoredRows() {
  const rows = [];
  let from = 0;
  const nowIso = new Date().toISOString();
  for (;;) {
    const { data, error } = await supabase.from('events')
      .select('id, name, venue, scraper_name, event_date, date, start_time, end_time, city, state, zip_code, address, url, source_url, category, age_range, description')
      .or('scraper_name.like.RecDesk-Parks%,scraper_name.like.RecDeskParks%')
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error('fetch failed: ' + error.message);
    if (!data.length) break;
    for (const r of data) if (r.date && r.date > nowIso) rows.push(r);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

(async () => {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX RECDESK FACILITY/GAME ROWS`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  const classification = loadClassification();
  const rows = await fetchStoredRows();
  console.log(`  ${rows.length} future-dated RecDesk rows in the database\n`);

  const junk = [], keep = [], unmatched = [];
  const perTenant = {};
  for (const r of rows) {
    const slug = (r.scraper_name || '').replace(/^RecDesk-?Parks-?/i, '');
    const tenant = classification.get(slug);
    const types = tenant ? tenant.get(norm(r.name)) : undefined;
    const pt = (perTenant[slug] = perTenant[slug] || { junk: 0, keep: 0, unmatched: 0 });
    if (!types) { unmatched.push(r); pt.unmatched++; continue; }
    const all = [...types];
    if (all.length > 0 && all.every((t) => t === 'F' || t === 'G')) { junk.push(r); pt.junk++; }
    else { keep.push(r); pt.keep++; }
  }

  console.log(`  CLASSIFIED JUNK (unanimous F/G): ${junk.length}`);
  console.log(`  CLASSIFIED KEEP (P or mixed):    ${keep.length}`);
  console.log(`  UNMATCHED (left alone):          ${unmatched.length}\n`);
  console.log(`  per tenant (junk/keep/unmatched):`);
  Object.entries(perTenant).sort((a, b) => b[1].junk - a[1].junk)
    .forEach(([k, v]) => console.log(`    ${k.padEnd(18)} ${String(v.junk).padStart(5)} / ${String(v.keep).padStart(5)} / ${v.unmatched}`));

  const sample = (arr, n) => arr.slice(0, n).map((r) => `    "${r.name}"  @${r.venue}`).join('\n');
  console.log(`\n  junk samples:\n${sample(junk, 10)}`);
  console.log(`\n  keep samples:\n${sample(keep, 10)}`);
  console.log(`\n  unmatched samples:\n${sample(unmatched, 10)}`);

  if (!SAVE) {
    console.log(`\n  👀 DRY RUN — nothing deleted. Re-run with --save to apply.`);
    return;
  }

  if (junk.length === 0) { console.log('  nothing to delete'); return; }
  if (junk.length > MAX_DELETIONS) {
    console.error(`  ❌ REFUSING: ${junk.length} classified junk exceeds the ${MAX_DELETIONS} ceiling. Investigate before raising it.`);
    process.exitCode = 1;
    return;
  }

  // Snapshot-before-delete (no-information-loss rule 4). Written and flushed
  // BEFORE the first delete so a crash mid-delete still leaves a full record.
  fs.writeFileSync(DELETED_LOG, junk.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`\n  📦 wrote ${junk.length} rows to ${path.basename(DELETED_LOG)} (${(fs.statSync(DELETED_LOG).size / 1024 / 1024).toFixed(1)} MB) BEFORE deleting`);

  let deleted = 0;
  for (let i = 0; i < junk.length; i += 100) {
    const ids = junk.slice(i, i + 100).map((r) => r.id);
    const { error } = await supabase.from('events').delete().in('id', ids);
    if (error) { console.error(`  ❌ delete batch failed at ${i}: ${error.message}`); process.exitCode = 1; return; }
    deleted += ids.length;
    if (deleted % 2000 === 0) console.log(`    ...${deleted}`);
  }
  console.log(`\n  ✅ deleted ${deleted} facility-booking/game rows (snapshot: ${path.basename(DELETED_LOG)})`);
})();
