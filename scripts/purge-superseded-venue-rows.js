#!/usr/bin/env node
/**
 * Delete rows orphaned by a VENUE NORMALISATION, but only where the corrected twin
 * already exists.
 *
 * WHY THIS IS NEEDED AT ALL — the general hazard, not just today's incident.
 * `_stableEventId()` keys on the normalised URL first and falls back to
 * `name|eventDate|venue`. Scrapers whose events all share ONE listing URL — the whole
 * GoogleCalendar-* family, since every event carries `library.url` — therefore land on
 * the FALLBACK key, and `venue` is part of it. So any change that corrects a venue
 * name does NOT upsert the existing row: it mints a new id and leaves the old row
 * behind, looking exactly like a real second event.
 *
 * Measured 2026-09-06: adding the URL/street-address venue guard to
 * scraper-gcal-libraries.js produced 16 such pairs — "Online Qigong" on seven dates
 * with venue "https://zoom.us/j/117278043" alongside the same event with venue
 * "Leverett Library". Both rows are real events; one of them is stale rubbish.
 *
 * SAFETY RULES, in order of importance:
 *  1. A row is deleted ONLY when a twin with the SAME name + event_date + scraper_name
 *     and a GOOD venue exists. No twin means no delete — a lone bad-venue row is a
 *     coverage question, not a duplicate, and deleting it would lose the event.
 *  2. Only the BAD-venue row of a pair is ever deleted, never the good one, and never
 *     the newer one by default (--prefer=good is the rule, not recency).
 *  3. Dry run by default; --save to write.
 *  4. `.order('id')` before every `.range()` — the 2026-05-15 paginator incident.
 *  5. Selective `.select()`, never `select('*')`.
 *  6. MAX_DELETE ceiling: an unexpectedly large match means the predicate is wrong.
 *
 * Usage:
 *   node scripts/purge-superseded-venue-rows.js --scrapers=A,B,C
 *   node scripts/purge-superseded-venue-rows.js --scrapers=A,B,C --save
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const scrapersArg = args.find(a => a.startsWith('--scrapers='));
if (!scrapersArg) {
  console.error('Missing --scrapers=Name1,Name2  (exact scraper_name values; keeps the query indexed)');
  process.exit(1);
}
const SCRAPERS = scrapersArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
const PAGE = 1000;
const MAX_DELETE = 500;

// A venue that is not a venue. Kept identical in spirit to the guard in
// scraper-gcal-libraries.js: a meeting link, or a string opening with a street number.
const isBadVenue = v => {
  const s = String(v || '').trim();
  if (!s) return false;
  return /^(https?:\/\/|www\.)/i.test(s) || /^zoom$/i.test(s) || /^\d+\s+\S/.test(s);
};

(async () => {
  console.log(`\n=== purge superseded venue rows ===  ${SAVE ? 'SAVE' : 'DRY RUN'}`);
  console.log(`scrapers: ${SCRAPERS.join(', ')}\n`);

  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, venue, event_date, scraper_name, scraped_at')
      .in('scraper_name', SCRAPERS)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error('Read failed:', error.message); process.exit(1); }
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`scanned ${all.length} rows`);

  const groups = new Map();
  for (const r of all) {
    const k = `${r.scraper_name}|||${r.name}|||${r.event_date}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  const doomed = [];
  let lonelyBad = 0;
  for (const [k, rows] of groups) {
    const bad = rows.filter(r => isBadVenue(r.venue));
    const good = rows.filter(r => !isBadVenue(r.venue));
    if (!bad.length) continue;
    if (!good.length) { lonelyBad += bad.length; continue; }   // rule 1 — never delete
    for (const b of bad) doomed.push({ ...b, replacedBy: good[0] });
  }

  console.log(`groups with a bad-venue row AND a good twin : ${new Set(doomed.map(d => `${d.name}|${d.event_date}`)).size}`);
  console.log(`rows to delete                              : ${doomed.length}`);
  console.log(`bad-venue rows with NO good twin (KEPT)     : ${lonelyBad}`);

  for (const d of doomed.slice(0, 20)) {
    console.log(`  - ${d.name} | ${d.event_date}`);
    console.log(`      delete venue=${JSON.stringify(d.venue)}  ->  keep venue=${JSON.stringify(d.replacedBy.venue)}`);
  }
  if (doomed.length > 20) console.log(`  … and ${doomed.length - 20} more`);

  if (!doomed.length) { console.log('\nNothing to do.\n'); return; }
  if (doomed.length > MAX_DELETE) {
    console.error(`\nREFUSING: ${doomed.length} exceeds the MAX_DELETE ceiling of ${MAX_DELETE}.`);
    process.exit(1);
  }
  if (!SAVE) { console.log('\nDry run — nothing written. Re-run with --save.\n'); return; }

  const ids = doomed.map(d => d.id);
  const { error: delErr } = await supabase.from('events').delete().in('id', ids);
  if (delErr) { console.error('Delete failed:', delErr.message); process.exit(1); }
  const { data: check } = await supabase.from('events').select('id').in('id', ids);
  console.log(`\nDeleted ${ids.length}. Re-check: ${check ? check.length : '?'} of ${ids.length} remain (expected 0).\n`);
})();
