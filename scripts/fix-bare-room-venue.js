#!/usr/bin/env node
/**
 * Repairs event rows whose `venue` is a BARE ROOM NAME rather than a place.
 *
 * WHY A BACKFILL EXISTS AT ALL, since the scraper already guards this at save time:
 * a stored row cannot heal itself on a re-scrape. The scrapers skip an event they
 * have already seen BEFORE the write, so the row's columns are never rewritten.
 * Measured 2026-09-09: `LibCal-NJ-mmtlibrary` ran on its scheduled Group 3 turn,
 * logged `Found 20 events`, and all 7 of its stored rows still read "Children's Room"
 * / "Meeting Room" with an unchanged `scraped_at`. The prediction recorded in
 * reports/fix-notes.json `_pending.LIBCAL-BARE-ROOM-VENUE-NOT-RETROACTIVE` — that a
 * URL-keyed `_stableEventId` would upsert the correction in place — is therefore
 * REFUTED, and this script is the correction path instead.
 *
 * SCOPE, deliberately narrow. A census of all 146,402 venue-bearing rows on
 * 2026-09-09 found 2,725 bare-room rows, but only the LibCal family can be repaired
 * *provably*:
 *
 *   - LibCal rows CAN be repaired. The scraper's own config array names the
 *     institution, and `buildScraperName()` — imported here rather than
 *     reimplemented — is the same function that wrote the row's `scraper_name`.
 *     So slug -> library.name is an identity mapping, not an inference.
 *   - RecDesk-Parks (~1,900 rows), WordPress-{state} (~180) and the MacaroniKid
 *     rows CANNOT, from this script. Nothing in those rows names the institution,
 *     and inventing one would be worse than the room name it replaced. They are
 *     reported as an explicit unresolved count and left alone.
 *
 * Three slugs map to more than one library because they are consortium LibCal
 * tenants (`LibCal-NJ-bccls`, `LibCal-PA-ccls`, `LibCal-NY-owwl`). Those are skipped
 * by name — a consortium slug cannot identify which member library a row belongs to,
 * and picking one would attribute events to the wrong institution.
 *
 * Usage:
 *   node scripts/fix-bare-room-venue.js            # dry run, prints every change
 *   node scripts/fix-bare-room-venue.js --save     # apply
 *   node scripts/fix-bare-room-venue.js --limit=50 # cap the number of updates
 *
 * --delete-duplicates (requires --save) handles the residue. Some rows cannot be
 * renamed: the rename would collide with `idx_events_unique_content` (name + date +
 * venue), which is the database itself stating that the same event is ALREADY stored
 * under the correct venue by another scraper. Measured 2026-09-09: 26 of 180. Those
 * are the room-named duplicate copies. This flag deletes them, but only after
 * re-confirming each one's twin by an explicit query — the constraint error alone is
 * not treated as sufficient, because CLAUDE.md's 2026-05-15 incident is exactly a case
 * of trusting an inferred duplicate grouping and destroying ~17,000 real events.
 */
const { supabase } = require('../scrapers/helpers/supabase-adapter');
const libcal = require('../scrapers/scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js');

const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const DELETE_DUPES = args.includes('--delete-duplicates');

// Byte-identical to the guard in scraper-libcal-libraries-CA-CO-...js. If that
// predicate is ever widened, widen this one in the same commit — a census that
// disagrees with the guard is how a "fixed" class quietly keeps growing.
const NAMES_A_PLACE = /\b(librar|branch|center|centre|museum|school|park|hall|annex)\b/i;
const IS_BARE_ROOM = /^(the\s+)?[a-z0-9'’.\- ]{0,28}\b(room|rooms|auditorium|lab|studio|gallery|meeting\s*space|community\s*space)\b\s*(?:#?\d{1,3}|[a-z])?$/i;

function buildSlugMap() {
  const map = new Map();
  for (const lib of libcal.LIBRARY_SYSTEMS) {
    const key = libcal.buildScraperName(lib);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(lib.name);
  }
  const resolved = new Map();
  const ambiguous = [];
  for (const [key, names] of map) {
    if (names.size === 1) resolved.set(key, [...names][0]);
    else ambiguous.push(key);
  }
  return { resolved, ambiguous };
}

async function main() {
  const { resolved, ambiguous } = buildSlugMap();
  console.log(`LibCal config: ${libcal.LIBRARY_SYSTEMS.length} libraries -> ${resolved.size} unambiguous slugs, ${ambiguous.length} consortium slugs skipped (${ambiguous.join(', ')})`);
  console.log(SAVE ? '\n*** --save: changes WILL be written ***\n' : '\nDRY RUN — no writes. Re-run with --save to apply.\n');

  const PAGE = 1000;
  let from = 0;
  const repairable = [];
  const unresolved = new Map();
  let scanned = 0;

  for (;;) {
    // .order() before .range() — an unordered paginator returns overlapping pages
    // (CLAUDE.md; the 2026-05-15 incident lost ~17,000 events that way).
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, venue, scraper_name')
      .not('venue', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    scanned += data.length;

    for (const row of data) {
      const v = (row.venue || '').trim();
      if (!v || NAMES_A_PLACE.test(v) || !IS_BARE_ROOM.test(v)) continue;
      const name = resolved.get(row.scraper_name);
      if (name) repairable.push({ ...row, newVenue: name });
      else unresolved.set(row.scraper_name, (unresolved.get(row.scraper_name) || 0) + 1);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  const totalBare = repairable.length + [...unresolved.values()].reduce((a, b) => a + b, 0);
  console.log(`Scanned ${scanned} venue-bearing rows.`);
  console.log(`Bare-room venues: ${totalBare}  ->  repairable ${repairable.length}, unresolved ${totalBare - repairable.length}\n`);

  const byScraper = new Map();
  for (const r of repairable) {
    if (!byScraper.has(r.scraper_name)) byScraper.set(r.scraper_name, []);
    byScraper.get(r.scraper_name).push(r);
  }
  for (const [scraper, rows] of [...byScraper].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${scraper}  (${rows.length} rows) -> "${rows[0].newVenue}"`);
    for (const r of rows.slice(0, 5)) console.log(`      "${r.venue}"`);
    if (rows.length > 5) console.log(`      … ${rows.length - 5} more`);
  }

  console.log('\nUNRESOLVED — no config mapping, left unchanged (these need their own fix):');
  for (const [s, n] of [...unresolved].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${n}\t${s}`);
  }
  if (unresolved.size > 15) console.log(`  … ${unresolved.size - 15} more scrapers`);

  if (!SAVE) {
    console.log('\nDry run complete — nothing written.');
    return;
  }

  let updated = 0;
  const collided = [];
  for (const r of repairable) {
    if (updated >= LIMIT) break;
    const { error } = await supabase.from('events').update({ venue: r.newVenue }).eq('id', r.id);
    if (!error) { updated++; continue; }
    if (/idx_events_unique_content/.test(error.message)) collided.push(r);
    else console.error(`  ✗ ${r.id}: ${error.message}`);
  }
  console.log(`\n✅ Updated ${updated} rows.`);
  if (collided.length === 0) return;

  console.log(`\n${collided.length} rows could not be renamed — the target name+date+venue already exists.`);
  if (!DELETE_DUPES) {
    console.log('These are duplicate copies of rows already stored under the correct venue.');
    console.log('Re-run with --save --delete-duplicates to remove them after per-row twin verification.');
    return;
  }

  let deleted = 0;
  let kept = 0;
  for (const r of collided) {
    // Do NOT trust the constraint error on its own. Prove the twin exists, that it is
    // a DIFFERENT row, and that it carries the venue this row was going to be renamed to.
    const { data: twins, error } = await supabase
      .from('events')
      .select('id, venue')
      .eq('name', r.name)
      .eq('event_date', r.event_date)
      .eq('venue', r.newVenue)
      .order('id', { ascending: true })
      .limit(5);
    if (error) { console.error(`  ✗ ${r.id}: twin check failed: ${error.message}`); kept++; continue; }
    const proven = (twins || []).filter(t => t.id !== r.id);
    if (proven.length === 0) {
      console.log(`  … ${r.id} kept — no twin found on re-check, not deleting`);
      kept++;
      continue;
    }
    const { error: delErr } = await supabase.from('events').delete().eq('id', r.id);
    if (delErr) { console.error(`  ✗ ${r.id}: ${delErr.message}`); kept++; }
    else { deleted++; console.log(`  🗑  ${r.id} "${r.venue}" — duplicate of ${proven[0].id} "${proven[0].venue}"`); }
  }
  console.log(`\n✅ Deleted ${deleted} verified duplicate rows; kept ${kept}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
