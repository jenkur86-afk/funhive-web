#!/usr/bin/env node

/**
 * BACKFILL: All Ages -> a specific bracket, where TODAY's detector finds a
 * signal the row was stored without.
 *
 * Added 2026-09-01 (SITE-IMPROVEMENT-REVIEW.md §1.2 / MASTER-PLAN Phase 5).
 *
 * SCOPE IS DELIBERATELY ONE DIRECTION ONLY. It touches rows whose stored
 * age_range is exactly 'All Ages' and which now resolve to something specific.
 * It never rewrites one specific bracket into another, and never turns a
 * specific bracket back into All Ages. Why:
 *
 *  - 'All Ages' is the CATCH-ALL DEFAULT, so replacing it with a detected
 *    bracket can only add information. This also matches the precedence the
 *    project already asserts in scripts/test-age-detection.js, where an
 *    explicit title beats a supplied 'All Ages' label.
 *  - A full re-derivation was measured first and rejected: it would change
 *    8,760 future rows for a net gain of only ~276 specific brackets, because
 *    its 6,795 specific->specific shifts cancel out and its 887
 *    specific->All Ages losses are the deliberate "Family Storytime" family
 *    guard undoing older, more confident tags. Churning thousands of rows for
 *    a wash is exactly the backfill CLAUDE.md warns about (2026-08-04).
 *
 * Future-dated rows only — past rows are expiring anyway.
 *
 * Usage:
 *   node scripts/backfill-allages-to-specific.js          # dry run + samples
 *   node scripts/backfill-allages-to-specific.js --save   # apply
 */

const { supabase, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');
const { normalizeAgeRange } = require('../scrapers/helpers/age-range-normalizer');

const SAVE = process.argv.includes('--save');
const MAX_UPDATES = 5000; // measured candidate set is ~1.2k; refuse a runaway

(async () => {
  console.log(`\n  BACKFILL All Ages -> specific   Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}\n`);
  const nowIso = new Date().toISOString();
  const candidates = [];
  const byBracket = new Map();
  let from = 0, scanned = 0;

  for (;;) {
    const { data, error } = await supabase.from('events')
      .select('id, name, age_range, scraper_name, date')
      .eq('age_range', 'All Ages')
      .gte('date', nowIso)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error('  ❌ ' + error.message); process.exitCode = 1; return; }
    if (!data.length) break;
    for (const r of data) {
      scanned++;
      const raw = detectAgeRange(r.name, '');
      if (!raw) continue;
      const proposed = normalizeAgeRange(raw);
      if (!proposed || proposed === 'All Ages') continue;
      // 'Adults' is NOT written here. An adult row is supposed to be REJECTED at
      // save time, not re-tagged in place; quietly relabelling one would hide it
      // from that path. Report the count instead so it can be handled properly.
      if (proposed === 'Adults') { byBracket.set('(skipped: Adults)', (byBracket.get('(skipped: Adults)') || 0) + 1); continue; }
      candidates.push({ id: r.id, name: r.name, proposed });
      byBracket.set(proposed, (byBracket.get(proposed) || 0) + 1);
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`  scanned ${scanned} future All-Ages rows`);
  console.log(`  ${candidates.length} would gain a specific bracket\n`);
  [...byBracket.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`     ${String(v).padStart(5)}  ${k}`));
  console.log('\n  samples:');
  candidates.slice(0, 20).forEach((c) => console.log(`     ${c.proposed.padEnd(24)} ${c.name.slice(0, 70)}`));

  if (!SAVE) { console.log('\n  👀 DRY RUN — re-run with --save to apply.\n'); return; }
  if (!candidates.length) { console.log('\n  nothing to do\n'); return; }
  if (candidates.length > MAX_UPDATES) {
    console.error(`\n  ❌ REFUSING: ${candidates.length} exceeds the ${MAX_UPDATES} ceiling. Investigate first.`);
    process.exitCode = 1; return;
  }

  let done = 0, failed = 0;
  for (const c of candidates) {
    const { error } = await supabase.from('events').update({ age_range: c.proposed }).eq('id', c.id);
    if (error) { failed++; if (failed <= 3) console.log(`     ⚠️ ${c.id}: ${error.message}`); }
    else done++;
    if (done % 250 === 0) process.stdout.write(`     ...${done}\n`);
  }
  console.log(`\n  ✅ ${done} rows given a specific bracket${failed ? `, ⚠️ ${failed} failed` : ''}\n`);
})();
