#!/usr/bin/env node
/**
 * purge-gcal-glued-paren-venues.js
 *
 * Deletes rows whose venue is a library name with half a street address welded on by an
 * UNCLOSED parenthesis — "Iuka Library (204 N Main St", "Corinth Public Library (1023 N
 * Fillmore St".
 *
 * WHY THEY EXIST AND WHY THEY DO NOT SELF-REPAIR
 * scraper-gcal-libraries.js splits the ICS LOCATION on commas to separate venue from
 * address. Northeast Regional MS writes LOCATION as "Iuka Library (204 N Main St, Iuka, MS
 * 38852)", where the paren opens BEFORE the first comma, so the venue kept the fragment.
 * Fixed at source on 2026-09-09 by cutting at an unclosed "(".
 *
 * The fix alone is not enough. These events carry the library's listing URL rather than a
 * per-event URL, so _stableEventId falls through to the `name|eventDate|venue` hash — and
 * THE VENUE IS PART OF THAT KEY. Correcting the venue therefore mints a NEW id and writes a
 * new row rather than upserting the old one, leaving the glued row behind as an orphan that
 * no future run will ever match. Measured on the repair run: 107 rewritten, 15 orphans left.
 *
 * SCOPE IS DELIBERATELY NARROW: one scraper family, and only venues with an opening paren
 * and no closing one. A venue with a complete parenthetical ("Main Library (Annex)") is a
 * real name and is never touched.
 *
 * Dry run by default. --save to delete. Orders before ranging, per CLAUDE.md.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const CEILING = 500;
// EXACT NAMES, NOT A LIKE PREFIX. `like 'GoogleCalendar-%'` on the events table has no
// usable index and cancels with a statement timeout on this database — measured, not
// assumed. An `in (...)` on exact values uses the index and returns instantly.
const namesArg = process.argv.find(a => a.startsWith('--names='));
const NAMES = namesArg
  ? namesArg.split('=').slice(1).join('=').split(',').map(s => s.trim()).filter(Boolean)
  : ['GoogleCalendar-MS'];

const isGlued = v => typeof v === 'string' && v.includes('(') && !v.includes(')');

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('events')
      .select('id, name, venue, scraper_name')
      .in('scraper_name', NAMES)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error('read failed:', error.message); process.exit(1); }
    if (!data || !data.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }

  console.log(`rows scanned for [${NAMES.join(', ')}]: ${rows.length}`);
  const doomed = rows.filter(r => isGlued(r.venue));
  const byVenue = new Map();
  doomed.forEach(r => byVenue.set(r.venue, (byVenue.get(r.venue) || 0) + 1));

  if (!doomed.length) { console.log('No glued-paren venues found. Nothing to do.'); process.exit(0); }

  console.log('\nGlued venues found:');
  [...byVenue.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([v, n]) => console.log(`  ${String(n).padStart(4)}  ${v}`));

  // Show that a clean counterpart exists, so deleting is a cleanup and not a coverage loss.
  console.log('\nClean counterpart present for each?');
  for (const v of byVenue.keys()) {
    const clean = v.slice(0, v.indexOf('(')).trim();
    const n = rows.filter(r => r.venue === clean).length;
    console.log(`  ${n > 0 ? 'YES' : 'NO '}  ${clean}  (${n} rows)`);
  }

  console.log(`\nWould delete: ${doomed.length}`);
  if (doomed.length > CEILING) {
    console.error(`REFUSING: ${doomed.length} exceeds the ${CEILING}-row ceiling.`);
    process.exit(1);
  }
  if (!SAVE) { console.log('\nDry run — nothing written. Re-run with --save.'); process.exit(0); }

  let deleted = 0;
  for (let i = 0; i < doomed.length; i += 100) {
    const ids = doomed.slice(i, i + 100).map(r => r.id);
    const { error } = await supabase.from('events').delete().in('id', ids);
    if (error) { console.error('delete failed:', error.message); process.exit(1); }
    deleted += ids.length;
  }
  console.log(`\n✅ Deleted ${deleted} rows.`);
  process.exit(0);
})();
