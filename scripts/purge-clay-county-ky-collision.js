#!/usr/bin/env node
/**
 * purge-clay-county-ky-collision.js — remove the Clay County FLORIDA library events
 * that were filed under Clay County KENTUCKY.
 *
 * THE DEFECT (found 2026-08-28 by the daily diagnosis)
 * ---------------------------------------------------
 * The LibCal registry carried `Clay County Public Library` in its KENTUCKY section
 * pointed at https://claycountygov.libcal.com/. That host is Clay County FLORIDA.
 * Proven from the live page, not from name similarity: its own branch list reads
 * Fleming Island, Green Cove Springs, Keystone Heights, Middleburg-Clay Hill and
 * Orange Park — every one a Clay County FL town — and its contact address is
 * @claycountygov.com. Two states simply both have a Clay County.
 *
 * Every run therefore wrote real Florida library events with `state = 'KY'`, and
 * because no FL branch address resolves inside Kentucky, geocoding fell all the way
 * through to the Manchester KY county centroid. So the rows were wrong in state,
 * city, address, location GEOMETRY and geohash at once — a Florida storytime
 * appearing on the map in eastern Kentucky.
 *
 * The config entry has been MOVED to the FLORIDA section (same commit), so the
 * calendar keeps its coverage under the right state. This script removes the rows
 * the KY entry already wrote.
 *
 * WHY DELETE RATHER THAN RE-TAG THE STATE
 * ---------------------------------------
 * Same reasoning as purge-wrong-state-collision-rows.js: re-tagging fixes one column
 * and leaves city / address / location / geohash still derived from Manchester KY.
 * The relocated FL entry re-scrapes these same events with correct geography on the
 * next Group 3 run, so deleting loses nothing.
 *
 * SAFETY
 * ------
 * Follows the 2026-05-15 paginator rule: always .order('id') before .range(), and
 * SELECT the complete id list in a read-only pass BEFORE deleting anything, so the
 * delete never walks a shifting result set. Refuses to run above MAX_DELETE.
 *
 * Usage:
 *   node scripts/purge-clay-county-ky-collision.js            # dry run
 *   node scripts/purge-clay-county-ky-collision.js --save
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const PAGE = 1000;
const DELETE_BATCH = 200;

// The collision produced exactly one scraper_name. Anything wildly above the measured
// 14 rows means the name is matching more than this one defect — stop rather than guess.
const SCRAPER_NAME = 'LibCal-KY-claycountygov-librarycalendar';
const WRONG_STATE = 'KY';
const MAX_DELETE = 500;

async function main() {
  console.log('\n=== Clay County KY collision purge ===');
  console.log(`scraper_name : ${SCRAPER_NAME}`);
  console.log(`wrong state  : ${WRONG_STATE}`);
  console.log(`mode         : ${SAVE ? 'SAVE (will delete)' : 'DRY RUN'}\n`);

  // Read-only pass: collect the complete id list first.
  const kill = [];
  const keep = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, venue, city, state')
      .eq('scraper_name', SCRAPER_NAME)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('❌ select failed:', error.message);
      process.exit(1);
    }
    if (!data.length) break;
    for (const row of data) {
      if (row.state === WRONG_STATE) kill.push(row);
      else keep.push(row);
    }
    if (data.length < PAGE) break;
  }

  const ids = [...new Set(kill.map(r => r.id))];
  console.log(`wrong-state rows : ${ids.length}`);
  console.log(`other rows left alone: ${keep.length}`);

  if (!ids.length) {
    console.log('\n✅ Nothing to purge.');
    return;
  }

  console.log('\nSample:');
  for (const row of kill.slice(0, 10)) {
    console.log(`  - ${row.venue} | ${row.city}, ${row.state} | ${row.name.slice(0, 55)}`);
  }

  if (ids.length > MAX_DELETE) {
    console.error(`\n❌ Refusing to delete ${ids.length} rows - ceiling is ${MAX_DELETE}.`);
    console.error('   That means the scraper_name match is broader than this defect. Investigate first.');
    process.exit(1);
  }

  if (!SAVE) {
    console.log(`\n🔍 DRY RUN - would delete ${ids.length} rows. Re-run with --save.`);
    return;
  }

  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const batch = ids.slice(i, i + DELETE_BATCH);
    const { error } = await supabase.from('events').delete().in('id', batch);
    if (error) {
      console.error('❌ delete failed:', error.message);
      process.exit(1);
    }
    deleted += batch.length;
  }
  console.log(`\n✅ Deleted ${deleted} rows.`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
