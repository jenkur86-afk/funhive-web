#!/usr/bin/env node
/**
 * fix-dover-ma-wrong-state.js — repair the 33 Dover Town Library rows stored as NH.
 *
 * WHAT HAPPENED. Dover Town Library (Dover, MASSACHUSETTS) was wired into
 * Assabet-NH-MA on 2026-09-06. The array already held Dover Public Library (Dover,
 * NEW HAMPSHIRE) at an earlier index, and findLibraryForEvent() tested
 * name-containment and city-containment in ONE loop — so the weak city match on the
 * NH entry fired before the exact name match on the MA entry, and every Dover MA
 * event was saved with New Hampshire's state, city, coordinates and geohash.
 *
 * The matcher is fixed (three ordered passes, exact name first) and covered by
 * scripts/test-library-matching.js. This repairs the rows that were already written.
 *
 * WHY NOT JUST RE-RUN THE SCRAPER. That would work — every one of these rows has a
 * distinct event URL, so _stableEventId is URL-derived and a re-scrape upserts in
 * place rather than duplicating. But it costs a ~1.5h pass over all 61 libraries to
 * correct 33 rows, and Assabet's next scheduled turn is two days out. This corrects
 * them now and leaves the scheduled run to confirm.
 *
 * HOW THE GEOGRAPHY IS REPAIRED. state and city are set directly. location and
 * geohash are NULLED rather than recomputed here, because they currently hold Dover
 * NH's coordinates and this script has no geocoder: nulling hands them to the
 * existing backfill in scripts/fix-event-quality.js, which is the designed path and
 * already runs daily under FunHive-DataQuality. A null coordinate makes the row
 * invisible to the nearby_events RPC until then, which is the right failure — better
 * than being visible 60 miles away in the wrong state.
 *
 * SCOPE IS PINNED to one venue on one host, and the script asserts the state it is
 * about to change is the wrong one before writing. Dry run by default; --save to write.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const VENUE = 'Dover Town Library';
const HOST = 'dovertownlibrary.assabetinteractive.com';
const WRONG_STATE = 'NH';
const RIGHT = { state: 'MA', city: 'Dover' };
const MAX = 200;

(async () => {
  console.log(`\n=== fix Dover MA wrong-state rows ===  ${SAVE ? 'SAVE' : 'DRY RUN'}\n`);

  const { data, error } = await supabase
    .from('events')
    .select('id, name, venue, city, state, url')
    .in('scraper_name', ['Assabet-NH-MA', 'assabet-NH-MA'])
    .eq('venue', VENUE)
    .order('id', { ascending: true })
    .range(0, 999);
  if (error) { console.error('Read failed:', error.message); process.exit(1); }

  // Only rows on the right host AND currently carrying the wrong state.
  const target = (data || []).filter(r => String(r.url || '').includes(HOST) && r.state === WRONG_STATE);
  const alreadyOk = (data || []).filter(r => r.state === RIGHT.state).length;
  const offHost = (data || []).filter(r => !String(r.url || '').includes(HOST)).length;

  console.log(`rows for venue "${VENUE}"      : ${(data || []).length}`);
  console.log(`  already ${RIGHT.state}                        : ${alreadyOk}`);
  console.log(`  not on ${HOST}: ${offHost}  (left alone)`);
  console.log(`  to correct ${WRONG_STATE} -> ${RIGHT.state}             : ${target.length}\n`);

  target.slice(0, 8).forEach(r => console.log(`   ${r.name}  [${r.city}, ${r.state}]`));
  if (target.length > 8) console.log(`   … and ${target.length - 8} more`);

  if (!target.length) { console.log('\nNothing to do.\n'); return; }
  if (target.length > MAX) {
    console.error(`\nREFUSING: ${target.length} exceeds the ceiling of ${MAX} — the scope is meant to be one venue.`);
    process.exit(1);
  }
  if (!SAVE) { console.log('\nDry run — nothing written. Re-run with --save.\n'); return; }

  const ids = target.map(r => r.id);
  const { error: upErr } = await supabase
    .from('events')
    .update({ state: RIGHT.state, city: RIGHT.city, location: null, geohash: null })
    .in('id', ids);
  if (upErr) { console.error('Update failed:', upErr.message); process.exit(1); }

  const { data: check } = await supabase
    .from('events')
    .select('id, state, city, geohash')
    .in('id', ids)
    .order('id', { ascending: true });
  const stillWrong = (check || []).filter(r => r.state !== RIGHT.state).length;
  const nulled = (check || []).filter(r => r.geohash === null).length;
  console.log(`\nUpdated ${ids.length}. Re-check: ${stillWrong} still ${WRONG_STATE} (expected 0), ${nulled} awaiting re-geocode.`);
  console.log('The geohash/location backfill in scripts/fix-event-quality.js will repair the coordinates.\n');
})();
