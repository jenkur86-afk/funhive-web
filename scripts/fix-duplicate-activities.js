#!/usr/bin/env node

/**
 * FIX DUPLICATE ACTIVITIES
 *
 * Finds activities (venues) duplicated by (lower(name) + lower(city) + state)
 * and removes all but one. Keeps the row with the most non-null fields,
 * or the oldest by created_at as the tiebreak.
 *
 * Caught 2026-05-10 via data-quality-check — pickyourown.org imports created
 * "Aix la Chapelle Farm" and "Bronkberry Farms" twice.
 *
 * Usage:
 *   node scripts/fix-duplicate-activities.js          # dry run
 *   node scripts/fix-duplicate-activities.js --save   # delete dupes
 *
 * Selective columns (no select('*')) to keep egress low.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

async function fetchAll() {
  // NOTE: activities has `url` (not `website`) and `phone`. No `website` column —
  // see database/schema.sql. Adding `website` to select returns 400 from PostgREST.
  const cols = 'id, name, city, state, address, location, geohash, description, phone, url, created_at';
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from('activities').select(cols).range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function score(a) {
  // Higher = more complete
  let s = 0;
  if (a.address) s++;
  if (a.location) s++;
  if (a.geohash) s++;
  if (a.description) s++;
  if (a.phone) s++;
  if (a.url) s++;
  return s;
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX DUPLICATE ACTIVITIES`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} activities\n`);

  // Group by lower(name) + lower(city) + state
  const groups = new Map();
  for (const r of rows) {
    const key = [
      (r.name || '').trim().toLowerCase(),
      (r.city || '').trim().toLowerCase(),
      (r.state || '').trim().toUpperCase(),
    ].join('|');
    if (!key.startsWith('|') && key !== '||') {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
  }

  const dupes = [...groups.values()].filter(g => g.length > 1);
  const toDelete = [];
  for (const g of dupes) {
    // Sort: most complete first, then oldest first
    g.sort((a, b) => {
      const ds = score(b) - score(a);
      if (ds !== 0) return ds;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    const keep = g[0];
    const drop = g.slice(1);
    console.log(`📍 "${keep.name}" in ${keep.city}, ${keep.state} — ${g.length} copies (keeping ${keep.id})`);
    drop.forEach(d => toDelete.push(d.id));
  }

  console.log(`\nGroups with duplicates: ${dupes.length}`);
  console.log(`Activities to delete: ${toDelete.length}`);

  if (SAVE && toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error } = await supabase.from('activities').delete().in('id', batch);
      if (error) console.error('Delete error:', error.message);
    }
    console.log(`✅ Deleted ${toDelete.length} duplicate activities`);
  } else if (toDelete.length > 0) {
    console.log(`\n(dry run — re-run with --save to apply)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
