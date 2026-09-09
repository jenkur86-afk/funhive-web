#!/usr/bin/env node
/**
 * Re-tags stored events whose TITLE carries an explicit adults-only marker but
 * whose `age_range` says otherwise, so the standard adult-only cleanup can remove
 * them.
 *
 * WHY THIS EXISTS
 * ---------------
 * `detectAgeRange()` gained a title-only adults-marker rule on 2026-09-09, after
 * the Step 3c flagged->=70% check on St. Stephens Branch Library (GoogleCalendar-NC)
 * showed 32 of 34 All-Ages rows reading "Mindful Movement (Adults)",
 * "Stitch & Social (Adults)", "Dungeons & Dragons (Adults)" — adult programming
 * published on a family events site.
 *
 * That fix is SAVE-TIME ONLY and stored rows cannot heal themselves: the scrapers
 * skip an already-seen event before the write, so nothing rewrites the column.
 * Proven the same day on a different class — `LibCal-NJ-mmtlibrary` re-ran on its
 * scheduled Group 3 turn and every stale venue survived unchanged.
 *
 * WHAT IT WRITES, AND WHAT IT DELIBERATELY DOES NOT
 * -------------------------------------------------
 * It sets `age_range = 'Adults'`. It does NOT delete. Deletion of adult-only rows
 * belongs to `scripts/fix-all-data-quality.js` Step 1, which owns that decision and
 * runs daily under the FunHive-DataQuality task; duplicating it here would put the
 * same irreversible action in two places. `scripts/backfill-age-range.js` refuses to
 * write 'Adults' for exactly this reason and flags instead — this script is the
 * narrow, explicitly-scoped counterpart that does the flagged half, and only for
 * titles the shipped detector itself calls Adults.
 *
 * AUTHORITY: the verdict comes from `detectAgeRange()` imported from
 * supabase-adapter.js, never from a predicate reimplemented here. A copy would drift
 * from the rule it is meant to mirror, and this one deletes events downstream.
 *
 * A row is only touched when BOTH hold:
 *   - the shipped detector resolves its title to Adults, and
 *   - its stored age_range is not already Adults.
 * A row whose title also carries a child signal never reaches here: detectAgeRange()
 * returns the child bracket first, by rule ordering.
 *
 * Usage:
 *   node scripts/retag-adult-only-events.js          # dry run, lists every row
 *   node scripts/retag-adult-only-events.js --save   # apply
 */
const { supabase, titleSaysAdultAudience, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');
const { normalizeAgeRange } = require('../scrapers/helpers/age-range-normalizer');

const SAVE = process.argv.includes('--save');

(async () => {
  console.log(SAVE ? '*** --save: changes WILL be written ***\n' : 'DRY RUN — no writes. Re-run with --save to apply.\n');

  const PAGE = 1000;
  let from = 0;
  let scanned = 0;
  const hits = [];

  for (;;) {
    // .order() before .range() — CLAUDE.md's pagination rule. An unordered
    // paginator returns overlapping pages; the 2026-05-15 incident lost ~17k events.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, age_range, scraper_name, venue')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    scanned += data.length;

    for (const r of data) {
      if (r.age_range === 'Adults') continue;
      // Keyed on the MARKER RULE, not on a detectAgeRange() == Adults verdict.
      // Those differ, and the difference is data loss: on the first dry run of
      // this script, "Tales for Tots (18-36 mos." resolved to Adults through an
      // unrelated rule that reads the months range as years, and a verdict-keyed
      // retag would have swept a real toddler storytime into the deletion path.
      // The regex is imported, never copied, so it cannot drift from the rule.
      //
      // Title only. Passing the description would be the catastrophic direction:
      // "children must be accompanied by an adult" is one of the commonest
      // sentences in this dataset, and Adults is a deletion verdict downstream.
      if (!titleSaysAdultAudience(r.name)) continue;
      // AND the rule must actually have FIRED. Testing the regex alone bypasses
      // detectAgeRange()'s rule ordering, and ordering is what protects titles
      // that carry an adults marker alongside a stronger child signal. Caught on
      // the second dry run: a title reading "$25 (adults) $10 (kids under 12)"
      // matched the regex but resolves to Kids, because the kids rule wins first.
      // Requiring both means the script can only ever agree with the save path.
      const detected = detectAgeRange(r.name, '');
      if (!detected || normalizeAgeRange(detected) !== 'Adults') continue;
      hits.push(r);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Scanned ${scanned} rows. Rows whose title resolves to Adults but are stored otherwise: ${hits.length}\n`);

  const byScraper = new Map();
  for (const h of hits) byScraper.set(h.scraper_name, (byScraper.get(h.scraper_name) || 0) + 1);
  console.log('by scraper:');
  for (const [s, n] of [...byScraper].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${s}`);

  const byStored = new Map();
  for (const h of hits) byStored.set(h.age_range, (byStored.get(h.age_range) || 0) + 1);
  console.log('\ncurrently stored as:');
  for (const [a, n] of [...byStored].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${a}`);

  console.log('\nsample titles:');
  for (const h of hits.slice(0, 25)) console.log(`  [${h.age_range}] "${h.name}"  — ${h.venue || '?'}`);
  if (hits.length > 25) console.log(`  … ${hits.length - 25} more`);

  if (!SAVE) {
    console.log('\nDry run complete — nothing written.');
    console.log('After --save these become Adults; fix-all-data-quality.js Step 1 removes them on its next pass.');
    return;
  }

  let updated = 0;
  for (const h of hits) {
    const { error } = await supabase.from('events').update({ age_range: 'Adults' }).eq('id', h.id);
    if (error) console.error(`  ✗ ${h.id}: ${error.message}`);
    else updated++;
  }
  console.log(`\n✅ Re-tagged ${updated} rows as Adults. They are now in scope for the adult-only deletion in fix-all-data-quality.js Step 1.`);
})().catch(e => { console.error(e); process.exit(1); });
