#!/usr/bin/env node
/**
 * Deletes events whose TITLE carries an explicit adult age gate ("Ages 18+",
 * "21 and over", "Age 50+") on a family events site.
 *
 *   node scripts/purge-adult-gated-rows.js            # dry run (default)
 *   node scripts/purge-adult-gated-rows.js --save
 *   node scripts/purge-adult-gated-rows.js --save --ceiling=200
 *
 * WHY A DEDICATED SCRIPT, when two cleanup passes already exist
 * ------------------------------------------------------------
 * Because between them they leave a hole these rows fall through, and each defers
 * to the other:
 *   - fix-all-data-quality.js deletes rows whose STORED age_range normalizes to
 *     "Adults". These rows are stored as "All Ages", so it never sees them.
 *   - backfill-age-range.js re-derives from the title, correctly spots them, and
 *     then deliberately does NOT act — it prints "consider running
 *     fix-all-data-quality.js instead", which cannot reach them.
 * So an adult-only row stored as All Ages was unreachable by both. Measured
 * 2026-08-24: "Abington Fest 5K (Ages 18+)" had been re-inserted on three separate
 * rotations (08-15, 08-18, 08-24) and survived every cleanup.
 *
 * HOW IT AVOIDS THE FALSE-POSITIVE TRAP
 * -------------------------------------
 * backfill-age-range.js's refusal is well founded, and this script does NOT
 * simply overrule it. In the same 20k-row sample it flagged 11 rows as adult, and
 * 8 of them were flagged from the DESCRIPTION, not the title — including
 * "Delaware Korean Festival 2026", "Music in the Park" and "Fall Plant Sale",
 * which are ordinary family-suitable listings. Deleting on that signal would
 * remove real content.
 *
 * So this script is deliberately narrower than "is this adult?":
 *   1. TITLE ONLY. A description never triggers a deletion.
 *   2. An EXPLICIT numeric age gate must be present in the title. No keyword
 *      rules — "Adult Coloring Club" is not touched here, on purpose.
 *   3. The shared detectAgeRange() must independently agree the title resolves
 *      to Adults, so the predicate is never forked (the 2026-08-22 lesson).
 *   4. A family-shaped title RESCUES the row, mirroring the rescue already in
 *      fix-all-data-quality.js — a "Family 5K (Ages 18+ and kids)" stays.
 *   5. A ceiling aborts the run rather than deleting an unexpected volume.
 */
const { supabase, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');
const { normalizeAgeRange } = require('../scrapers/helpers/age-range-normalizer');

const SAVE = process.argv.includes('--save');
const ceilArg = process.argv.find(a => a.startsWith('--ceiling='));
const CEILING = ceilArg ? parseInt(ceilArg.split('=')[1], 10) : 500;

// An explicit numeric gate in the TITLE. Anchored on an age word or a bare N+
// directly adjacent to "ages"/"age" so a price ($18+) or a room number cannot match.
const TITLE_GATE = /\bages?\s*\d{1,2}\s*(?:\+|and\s+(?:up|older|over))|\b(?:18|21)\s*\+(?:\s|\)|$)/i;

// Mirrors fix-all-data-quality.js's rescue list. A title naming a child audience
// is never deleted here, even alongside an adult gate.
const FAMILY_TITLE = /\b(toddler|baby|babies|infant|preschool|kid|kids|children|child|youth|teen|teens|tween|family|families|storytime|story\s*time|lego|playgroup|play\s*group|mommy|daddy|parent|nursery|kindergarten|all\s*ages)\b/i;

async function main() {
  console.log(`\n=== ADULT-GATED TITLE PURGE ===  ${SAVE ? 'SAVE' : 'DRY RUN'}  ceiling=${CEILING}\n`);

  const victims = [];
  const rescued = [];
  let from = 0, scanned = 0;
  const PAGE = 1000;

  while (true) {
    // .order() before .range() — an unordered paginator returns overlapping pages
    // and the 2026-05-15 incident deleted ~17,000 legitimate events that way.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, venue, state, age_range, scraper_name')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    scanned += data.length;

    for (const e of data) {
      const name = e.name || '';
      if (!TITLE_GATE.test(name)) continue;
      // Rule 3: the shared predicate must agree, on the TITLE alone.
      const derived = detectAgeRange(name, '');
      if (!derived || normalizeAgeRange(derived) !== 'Adults') continue;
      // Rule 4: family-shaped titles are rescued.
      if (FAMILY_TITLE.test(name)) { rescued.push(e); continue; }
      victims.push(e);
    }

    if (data.length < PAGE) break;
    from += PAGE;
    if (scanned % 20000 === 0) process.stdout.write(`  scanned ${scanned}…\n`);
  }

  console.log(`scanned rows            : ${scanned}`);
  console.log(`adult-gated, to delete  : ${victims.length}`);
  console.log(`rescued by family title : ${rescued.length}\n`);

  if (rescued.length) {
    console.log('RESCUED (kept — family audience named in the title):');
    rescued.slice(0, 10).forEach(e => console.log(`  ~ "${e.name}"  (${e.scraper_name})`));
    console.log('');
  }

  if (!victims.length) { console.log('Nothing to delete.\n'); return; }

  console.log('TO DELETE:');
  victims.slice(0, 40).forEach(e =>
    console.log(`  - [${e.id}] "${e.name}"  (${e.scraper_name}, ${e.state}, stored=${e.age_range})`));
  if (victims.length > 40) console.log(`  ...and ${victims.length - 40} more`);
  console.log('');

  if (victims.length > CEILING) {
    console.error(`ABORT: ${victims.length} exceeds the ceiling of ${CEILING}. ` +
      `Re-read the list above before raising --ceiling; a sudden jump means the ` +
      `title rule got broader, and this step DELETES.`);
    process.exit(1);
  }

  if (!SAVE) { console.log('DRY RUN — re-run with --save to delete.\n'); return; }

  // Ids were collected read-only above, before any delete, per the same rule.
  const ids = victims.map(v => v.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await supabase.from('events').delete().in('id', chunk);
    if (error) throw new Error(`delete chunk ${i}: ${error.message}`);
    deleted += chunk.length;
  }
  console.log(`✅ Deleted ${deleted} adult-gated events.\n`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
