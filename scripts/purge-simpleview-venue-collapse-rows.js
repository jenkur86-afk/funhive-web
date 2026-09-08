#!/usr/bin/env node
/**
 * purge-simpleview-venue-collapse-rows.js
 *
 * Deletes the residue of the findLibraryForEvent() empty-venue collapse, for
 * Simpleview-Tourism-Eastern only.
 *
 * WHAT THE BUG WAS (fixed in event-save-helper.js on 2026-08-27)
 * findLibraryForEvent() matched an EMPTY venue name against every library, because
 * both includes() checks are trivially true against the empty string, so the event
 * silently took libraries[0]. Simpleview batches ~51 CVB sites across 28 states into
 * one save call, so libraries[0] was a different city and state entirely — Nashville
 * hockey games stored as "Moonshine Alley, Providence, RI".
 *
 * WHY A SCRIPT AND NOT WAITING IT OUT
 * The re-scrape upsert repairs a row only if the scraper still finds that event.
 * Measured across three Group 2 rotations: 96 (2026-08-27) -> 54 (09-05) -> 52 (09-08).
 * It has plateaued, which is exactly the falsification condition written into
 * reports/fix-notes.json when the fix shipped: "if it plateaus near 54 rather than
 * continuing to fall, the remaining rows are ones the scraper no longer re-finds and
 * they need deleting rather than waiting out."
 *
 * HOW A ROW IS PROVEN WRONG — never by venue name alone.
 * A row qualifies only when its own `url` host contradicts the stored venue's state.
 * Every one of the 52 measured on 2026-09-08 carries a host that is not Rhode Island:
 * visitmusiccity.com (Nashville TN), iloveny.com, visitbuffalo.com, visitnc.com,
 * bundymodern.com. That is the row's own evidence about where it came from, in the
 * same spirit as the identity-from-the-page rule for URL collisions. A row whose host
 * genuinely IS the collapsed venue's own site is LEFT ALONE.
 *
 * Dry run by default. --save to delete. Refuses above a ceiling, and selects the id
 * list read-only before deleting, with .order() before .range() per CLAUDE.md.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SCRAPER = 'Simpleview-Tourism-Eastern';
const SAVE = process.argv.includes('--save');
const CEILING = 200;

// The collapse always lands on libraries[0] of the batch, so the wrong venue is a
// single stable name rather than a pattern. Passing it explicitly keeps this script
// from ever becoming a generic venue deleter.
const COLLAPSED_VENUE = process.argv.find(a => a.startsWith('--venue='))
  ? process.argv.find(a => a.startsWith('--venue=')).split('=').slice(1).join('=')
  : 'Moonshine Alley';

// Hosts that would legitimately belong to the collapsed venue's own state. A row
// pointing at one of these is NOT proven wrong and is kept.
const STATE_OF_VENUE = process.argv.find(a => a.startsWith('--state='))
  ? process.argv.find(a => a.startsWith('--state=')).split('=').slice(1).join('=')
  : 'RI';

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch (_) { return ''; }
}

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('events')
      .select('id, name, venue, city, state, url, scraped_at')
      .eq('scraper_name', SCRAPER)
      .eq('venue', COLLAPSED_VENUE)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error('read failed:', error.message); process.exit(1); }
    if (!data || !data.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }

  console.log(`${SCRAPER} rows with venue "${COLLAPSED_VENUE}": ${rows.length}`);
  if (!rows.length) { console.log('Nothing to do.'); process.exit(0); }

  const doomed = [];
  const kept = [];
  for (const r of rows) {
    const host = hostOf(r.url);
    // No host at all is not evidence of anything — keep it rather than guess.
    if (!host) { kept.push({ r, why: 'no url host — cannot prove it wrong' }); continue; }
    if (String(r.state || '').toUpperCase() !== STATE_OF_VENUE) {
      kept.push({ r, why: `state is ${r.state}, not the collapsed ${STATE_OF_VENUE}` });
      continue;
    }
    doomed.push({ r, host });
  }

  const byHost = new Map();
  doomed.forEach(d => byHost.set(d.host, (byHost.get(d.host) || 0) + 1));
  console.log('\nProven wrong (stored as ' + STATE_OF_VENUE + ' but sourced elsewhere), by host:');
  [...byHost.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([h, n]) => console.log(`  ${String(n).padStart(4)}  ${h}`));

  console.log('\nSample:');
  doomed.slice(0, 8).forEach(d => console.log(`  ${d.r.name.slice(0, 50)}  <- ${d.host}  [${(d.r.scraped_at || '').slice(0, 10)}]`));

  if (kept.length) {
    console.log(`\nKept ${kept.length} row(s) that were not proven wrong:`);
    kept.slice(0, 10).forEach(k => console.log(`  ${k.r.name.slice(0, 45)} — ${k.why}`));
  }

  console.log(`\nWould delete: ${doomed.length}   Keep: ${kept.length}`);

  if (doomed.length > CEILING) {
    console.error(`\nREFUSING: ${doomed.length} exceeds the ${CEILING}-row ceiling. Inspect before raising it.`);
    process.exit(1);
  }
  if (!SAVE) { console.log('\nDry run — nothing written. Re-run with --save.'); process.exit(0); }

  let deleted = 0;
  for (let i = 0; i < doomed.length; i += 100) {
    const ids = doomed.slice(i, i + 100).map(d => d.r.id);
    const { error } = await supabase.from('events').delete().in('id', ids);
    if (error) { console.error('delete failed:', error.message); process.exit(1); }
    deleted += ids.length;
  }
  console.log(`\n✅ Deleted ${deleted} rows.`);
  process.exit(0);
})();
