#!/usr/bin/env node
/**
 * Deletes Assabet-NH-MA rows whose `name` is the concatenated day/time/room/branch/address
 * string rather than an event title — the ASSABET-CONCAT-TITLES defect.
 *
 * WHY DELETE RATHER THAN REPAIR IN PLACE
 * --------------------------------------
 * The scraper's title selector matched the card's H2, which on an Assabet card holds only
 *
 *     <span class="event-day">   <span class="event-time">   <span class="event-location">
 *
 * while the real title sits in a sibling H3. So a corrupted row does not contain its title
 * anywhere — "Monday, August 3110:00 AM—12:00 PMMeeting RoomHampstead Public L" has no event
 * name in it to recover. Stripping the date prefix would leave "Meeting RoomHampstead…",
 * which is not an improvement. The row has to go and be re-scraped.
 *
 * Re-scraping restores them: the extraction fix landed 2026-08-28 and rows written after it
 * are clean (verified — 50 of 50 from that run, e.g. "3D Printer Badge Class" bracketed
 * Teens 13-18). The scraper skips events it already holds, which is exactly why these
 * pre-fix rows never self-repaired.
 *
 * WHY THE PREDICATE IS TIGHT
 * --------------------------
 * It requires BOTH an anchored "Weekday, Month DD" opening AND a following clock-time run,
 * which is the signature of the H2 concatenation. A legitimate event title does not open
 * that way. Anything failing either half is left alone.
 *
 * Usage:
 *   node scripts/fix-assabet-glued-titles.js            # dry run, prints a sample
 *   node scripts/fix-assabet-glued-titles.js --save     # delete
 */
const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const SCRAPER = 'Assabet-NH-MA';
// Anchored weekday+month+day, THEN the time slot — both halves required.
// The time slot has TWO shapes and the dry run is what surfaced the second: most rows
// carry a clock range ("...August 3110:00 AM—12:00 PM..."), but all-day events render
// the literal "All Day" instead ("Tuesday, June 30All DayOutdoorsMain Library..."). A
// clock-only pattern left every all-day row behind, sitting in the survivors list looking
// exactly as corrupt as the ones being deleted.
const GLUED = /^(?:Mon|Tues?|Wednes|Thurs?|Fri|Satur|Sun)day,?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{1,2}\s*(?:\d{1,2}:\d{2}|All\s*Day)/i;
// Refuse to run away with the table if the predicate ever goes wrong.
const CEILING = 2000;

(async () => {
  let rows = [], from = 0;
  for (;;) {
    // .order() before .range() — an unordered paginator overlaps pages and the
    // 2026-05-15 incident deleted ~17,000 legitimate events that way.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, venue, event_date')
      .eq('scraper_name', SCRAPER)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error('read failed: ' + error.message);
    rows = rows.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  const bad = rows.filter(r => GLUED.test(r.name || ''));
  console.log(`${SCRAPER} rows: ${rows.length}`);
  console.log(`glued-title rows: ${bad.length} (${(bad.length / (rows.length || 1) * 100).toFixed(1)}%)`);

  if (!bad.length) { console.log('nothing to do'); return; }
  if (bad.length > CEILING) {
    throw new Error(`refusing to delete ${bad.length} rows (ceiling ${CEILING}) — check the predicate`);
  }

  console.log('\nsample (first 10):');
  bad.slice(0, 10).forEach(r => console.log('   ' + (r.name || '').slice(0, 76)));
  console.log('\nsurvivors sample (first 10) — these must look like real titles:');
  rows.filter(r => !GLUED.test(r.name || '')).slice(0, 10)
    .forEach(r => console.log('   ' + (r.name || '').slice(0, 76)));

  if (!SAVE) {
    console.log(`\nDRY RUN — would delete ${bad.length} rows. Re-run with --save.`);
    return;
  }

  let deleted = 0;
  for (let i = 0; i < bad.length; i += 100) {
    const ids = bad.slice(i, i + 100).map(r => r.id);
    const { error } = await supabase.from('events').delete().in('id', ids);
    if (error) throw new Error('delete failed: ' + error.message);
    deleted += ids.length;
    process.stdout.write(`\r  deleted ${deleted}/${bad.length}`);
  }
  console.log(`\n✅ deleted ${deleted} rows. Re-run: npm run scraper -- --scraper ${SCRAPER}`);
})();
