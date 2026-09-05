#!/usr/bin/env node
/**
 * Delete `activities` rows whose NAME is nothing but a date or a date range.
 *
 * These are not places. They are created when a scraper's venue fallback adopts
 * a card's date block as the venue name — proven on 2026-09-05, when
 * Simpleview-Tourism-Eastern wrote four of them for visitburlingtonvt.com
 * ("June 20 - September 6", "January 17 - September 7", "May 25 - September 7",
 * "July 3 - June 22"). The scraper-side cause is fixed by the isDateOnly()
 * guard in scraper-simpleview-tourism-eastern.js; this is the backfill for rows
 * already written.
 *
 * Dry run by default. Pass --save to delete.
 *
 * Safety, per CLAUDE.md:
 *  - selective .select(), never select('*')
 *  - .order('id') before every .range()   (the 2026-05-15 paginator incident)
 *  - the full id list is collected in a complete read-only pass BEFORE any
 *    delete, and events referencing a doomed activity are detached first so the
 *    activity_id foreign key cannot orphan them
 *  - MAX_DELETE ceiling: refuses to run if the match count looks like a
 *    predicate bug rather than a handful of junk rows
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');
const PAGE = 1000;
const MAX_DELETE = 200;

// Mirrors isDateOnly() in scraper-simpleview-tourism-eastern.js: the name must
// carry a date signal AND reduce to nothing once date tokens and punctuation
// are stripped, so "May Street Center" and "August Wilson Center" are safe.
const MONTH_DAY_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i;
const DATE_TOKEN_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?|\b(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?|\d+|\b(?:am|pm|to|through|thru|now|and|at|st|nd|rd|th|all|day|days|ongoing)\b/gi;

function isDateOnly(str) {
  const t = (str || '').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  const hasDateSignal =
    MONTH_DAY_RE.test(t) || /\d{1,2}\s*[/-]\s*\d{1,2}/.test(t) || /^now\b/i.test(t);
  if (!hasDateSignal) return false;
  return t.replace(DATE_TOKEN_RE, '').replace(/[\s,.;:•|\-–—/&()]+/g, '') === '';
}

(async () => {
  console.log(`\n=== purge date-named activities ===  ${SAVE ? 'SAVE' : 'DRY RUN'}\n`);

  let from = 0;
  let scanned = 0;
  const doomed = [];

  while (true) {
    const { data, error } = await supabase
      .from('activities')
      .select('id, name, city, state, source, created_at')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Read failed:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    scanned += data.length;
    for (const a of data) if (isDateOnly(a.name)) doomed.push(a);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Scanned ${scanned} activities.`);
  console.log(`Date-named rows: ${doomed.length}\n`);
  for (const a of doomed) {
    console.log(`  ${a.id}  ${JSON.stringify(a.name)}  |  ${a.city}, ${a.state}  |  ${a.source}  |  ${a.created_at}`);
  }

  if (doomed.length === 0) {
    console.log('\nNothing to do.\n');
    return;
  }
  if (doomed.length > MAX_DELETE) {
    console.error(`\nREFUSING: ${doomed.length} matches exceeds the MAX_DELETE ceiling of ${MAX_DELETE}.`);
    console.error('That many matches means the predicate is wrong, not that the data is that bad.\n');
    process.exit(1);
  }

  // Events pointing at a doomed activity must be detached first.
  const ids = doomed.map(a => a.id);
  const { data: refs, error: refErr } = await supabase
    .from('events')
    .select('id, name, activity_id')
    .in('activity_id', ids)
    .order('id', { ascending: true });
  if (refErr) {
    console.error('Reference check failed:', refErr.message);
    process.exit(1);
  }
  console.log(`\nEvents referencing these activities: ${refs ? refs.length : 0}`);
  if (refs) for (const e of refs.slice(0, 20)) console.log(`  event ${e.id}  ${e.name}`);

  if (!SAVE) {
    console.log('\nDry run — nothing written. Re-run with --save to delete.\n');
    return;
  }

  if (refs && refs.length) {
    const { error: detachErr } = await supabase
      .from('events')
      .update({ activity_id: null })
      .in('activity_id', ids);
    if (detachErr) {
      console.error('Detach failed:', detachErr.message);
      process.exit(1);
    }
    console.log(`Detached ${refs.length} events from the doomed activities.`);
  }

  const { error: delErr } = await supabase.from('activities').delete().in('id', ids);
  if (delErr) {
    console.error('Delete failed:', delErr.message);
    process.exit(1);
  }
  console.log(`Deleted ${ids.length} date-named activities.`);

  const { data: check, error: checkErr } = await supabase
    .from('activities')
    .select('id')
    .in('id', ids);
  if (checkErr) console.error('Re-check failed:', checkErr.message);
  else console.log(`Re-check: ${check.length} of ${ids.length} remain (expected 0).\n`);
})();
