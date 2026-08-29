#!/usr/bin/env node
/**
 * Repairs UTF-8-decoded-as-CP-1252 mojibake in stored text.
 *
 * Found 2026-08-29 in the Step 3c age audit: 93 event rows carried the venue
 * "Flinchbaughâ€™s Orchard & Farm Market" (MacaroniKid-PA-york) — a right single
 * quote whose UTF-8 bytes were each rendered as their CP-1252 character. It is
 * user-visible on the event card and the venue detail page.
 *
 * `repairMojibake()` in supabase-adapter.js now runs at save time on both venue
 * and name, so new rows arrive clean; this is the backfill for pre-existing rows.
 * The repair is the same provably-lossless round-trip used there — see that
 * function's comment for why it cannot damage legitimately accented text.
 *
 * Selective .select() only, and .order('id') before .range() per CLAUDE.md.
 *
 * Usage:
 *   node scripts/fix-mojibake-text.js            # dry run (default)
 *   node scripts/fix-mojibake-text.js --save
 *   node scripts/fix-mojibake-text.js --save --recent-only
 */
const { supabase, repairMojibake } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const RECENT_ONLY = process.argv.includes('--recent-only');
const WINDOW_HOURS = parseInt(process.env.FIX_WINDOW_HOURS || '24', 10);

// Every LIKE pattern that can indicate a mis-decode. A row matching any of them is
// a candidate; repairMojibake() is the authority on whether it is actually repaired.
const PATTERNS = ['%Ã%', '%Â%', '%â€%'];

async function collect(table, columns) {
  const byId = new Map();
  for (const pattern of PATTERNS) {
    for (const col of ['name', 'venue'].filter(c => columns.includes(c))) {
      let from = 0;
      while (true) {
        let q = supabase.from(table).select(columns.join(', ')).like(col, pattern);
        if (RECENT_ONLY) {
          q = q.gte('scraped_at', new Date(Date.now() - WINDOW_HOURS * 3600e3).toISOString());
        }
        const { data, error } = await q.order('id', { ascending: true }).range(from, from + 999);
        if (error) throw new Error(`${table}.${col} ${pattern}: ${error.message}`);
        data.forEach(r => byId.set(r.id, r));
        if (data.length < 1000) break;
        from += 1000;
      }
    }
  }
  return [...byId.values()];
}

async function run(table, columns) {
  const rows = await collect(table, columns);
  const fixes = [];
  for (const row of rows) {
    const patch = {};
    for (const col of columns) {
      if (col === 'id' || typeof row[col] !== 'string') continue;
      const repaired = repairMojibake(row[col]);
      if (repaired !== row[col]) patch[col] = repaired;
    }
    if (Object.keys(patch).length) fixes.push({ id: row.id, before: row, patch });
  }

  console.log(`\n${table}: ${rows.length} candidate row(s), ${fixes.length} repairable`);
  const shown = new Set();
  for (const f of fixes) {
    const key = JSON.stringify(f.patch);
    if (shown.has(key)) continue;
    shown.add(key);
    for (const [col, val] of Object.entries(f.patch)) {
      console.log(`  ${col}: ${JSON.stringify(f.before[col])}\n      -> ${JSON.stringify(val)}`);
    }
    if (shown.size >= 15) { console.log(`  ... (${fixes.length - 15} more rows, distinct variants only shown)`); break; }
  }

  if (!SAVE) return fixes.length;

  let updated = 0;
  for (const f of fixes) {
    const { error } = await supabase.from(table).update(f.patch).eq('id', f.id);
    if (error) console.error(`  ✗ ${f.id}: ${error.message}`);
    else updated++;
  }
  console.log(`  ✅ updated ${updated}/${fixes.length} row(s) in ${table}`);
  return fixes.length;
}

(async () => {
  console.log(`Mojibake repair — ${SAVE ? 'SAVE' : 'DRY RUN'}${RECENT_ONLY ? ` (last ${WINDOW_HOURS}h)` : ' (full scan)'}`);
  const a = await run('events', ['id', 'name', 'venue']);
  const b = await run('activities', ['id', 'name']);
  console.log(`\nTotal repairable: ${a + b}`);
  if (!SAVE && a + b > 0) console.log('Re-run with --save to write.');
})().catch(e => { console.error(e.message); process.exit(1); });
