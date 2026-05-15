#!/usr/bin/env node

/**
 * FIX BROKEN EVENT_DATE rows — delete events whose event_date contains no
 * recoverable date.
 *
 * Two categories caught 2026-05-11:
 *   1. Time-only strings: "2:00pm–3:00pm", "10:00am-11:00am", etc.
 *      (~470 rows from Communico libraries — API path was falling back to
 *      item.time_string when item.datestring/item.date were both missing.
 *      Scraper bug fixed in scraper-communico-libraries-*.js.)
 *   2. Literal "Invalid Date" strings: "Invalid Date Invalid Date - Invalid Date"
 *      (35 rows from BiblioCommons-VA — `new Date(malformed)` returned NaN
 *      and toLocaleDateString serialized that as the literal "Invalid Date".
 *      Fixed in scraper-bibliocommons-libraries-*.js.)
 *
 * Both scrapers now reject these at save time, but the historical rows have
 * to be removed by hand because there's no way to recover the actual date.
 *
 * Usage:
 *   node scripts/fix-broken-event-dates.js          # dry run — list matches
 *   node scripts/fix-broken-event-dates.js --save   # delete
 *
 * Selective columns to keep egress small.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

// Returns true if event_date contains only time tokens, no date components.
function isTimeOnly(s) {
  if (!s || typeof s !== 'string') return false;
  if (/\b\d{4}\b/.test(s)) return false;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)) return false;
  if (/\b(mon|tue|wed|thu|fri|sat|sun)/i.test(s)) return false;
  if (/\d{1,2}\/\d{1,2}/.test(s)) return false;
  if (/\d{4}-\d{2}-\d{2}/.test(s)) return false;
  return /\d{1,2}(:\d{2})?\s*[ap]\.?\s*m\.?/i.test(s);
}

function isInvalidDateLiteral(s) {
  return typeof s === 'string' && /^invalid\s+date\b/i.test(s.trim());
}

async function fetchTargets() {
  // We only need events with `date IS NULL`. Anything with a real parsed `date`
  // isn't broken in this sense even if event_date is weird text.
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, scraper_name')
      .is('date', null)
      .not('event_date', 'is', null)
      .order('id', { ascending: true }) // stable pagination — see 2026-05-15 incident
      .range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  DELETE BROKEN-DATE EVENTS`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  const rows = await fetchTargets();
  console.log(`Scanned ${rows.length} events with NULL date and non-NULL event_date\n`);

  const timeOnly = [];
  const invalidDate = [];
  const other = [];

  for (const r of rows) {
    if (isTimeOnly(r.event_date)) timeOnly.push(r);
    else if (isInvalidDateLiteral(r.event_date)) invalidDate.push(r);
    else other.push(r);
  }

  console.log(`Time-only event_date:    ${timeOnly.length}`);
  console.log(`"Invalid Date" literal:  ${invalidDate.length}`);
  console.log(`Other (kept):            ${other.length}`);

  if (timeOnly.length > 0) {
    console.log(`\nSample time-only deletes:`);
    for (const r of timeOnly.slice(0, 5)) {
      console.log(`  ✗ [${r.scraper_name}] "${(r.name || '').substring(0, 50)}" — event_date="${r.event_date}"`);
    }
  }
  if (invalidDate.length > 0) {
    console.log(`\nSample "Invalid Date" deletes:`);
    for (const r of invalidDate.slice(0, 5)) {
      console.log(`  ✗ [${r.scraper_name}] "${(r.name || '').substring(0, 50)}" — event_date="${r.event_date}"`);
    }
  }

  // Group by scraper so the user can see where the rot came from
  const byScraper = new Map();
  for (const r of [...timeOnly, ...invalidDate]) {
    const k = r.scraper_name || 'unknown';
    byScraper.set(k, (byScraper.get(k) || 0) + 1);
  }
  if (byScraper.size > 0) {
    console.log(`\nBy scraper:`);
    for (const [k, n] of [...byScraper.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)} ${k}`);
    }
  }

  const toDelete = [...timeOnly, ...invalidDate];
  console.log(`\nTotal to delete: ${toDelete.length}`);

  if (SAVE && toDelete.length > 0) {
    const ids = toDelete.map(r => r.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) console.error('Delete error:', error.message);
      else deleted += batch.length;
    }
    console.log(`✅ Deleted ${deleted} broken-date events`);
  } else if (toDelete.length > 0) {
    console.log(`(dry run — re-run with --save to delete)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
