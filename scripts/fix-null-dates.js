#!/usr/bin/env node

/**
 * FIX NULL `date` COLUMN — backfill from event_date text
 *
 * Re-runs the (now stricter) parseEventDateText from supabase-adapter against
 * every events row with `date IS NULL AND event_date IS NOT NULL`, backfills
 * the parsed timestamp, and reports any remaining unparseable formats so we
 * can extend the parser.
 *
 * Caught 2026-05-10: 507 events stuck with NULL date because the old parser
 * didn't handle "9:30am–10:00am" (no-space en-dash time range). Parser has
 * since been updated; this script applies the fix to the existing rows.
 *
 * Usage:
 *   node scripts/fix-null-dates.js          # dry run (preview + format report)
 *   node scripts/fix-null-dates.js --save   # apply backfill to DB
 *
 * Selective columns — no select('*') — to keep egress small.
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

// Replica of parseEventDateText from supabase-adapter.js, kept local so this
// script is self-contained and easy to debug. Edit BOTH if you change one.
function parseEventDateText(eventDateStr) {
  if (!eventDateStr || typeof eventDateStr !== 'string') return null;
  const trimmed = eventDateStr.trim();
  if (!trimmed) return null;
  let cleaned = trimmed
    .replace(/\s*\(.*?\)\s*$/, '')
    .replace(/\s+(EST|EDT|PST|PDT|CST|CDT|MST|MDT|UTC|GMT)\b/i, '')
    .replace(/\s+at\s+/i, ' ')
    .replace(/\s+@\s+/i, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+all\s*day\s*$/i, '')
    .replace(/\s*-\s*\d{1,2}(?::\d{2})?\s*[ap]\.?\s*m\.?\s*$/i, '')
    .replace(/\s+\d{1,2}(?::\d{2})?\s*[ap]\.?\s*m\.?\s*$/i, '')
    .trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) cleaned = `${cleaned}T00:00:00`;
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return null;
  const now = Date.now();
  const ts = parsed.getTime();
  if (ts < now - 5 * 365 * 24 * 60 * 60 * 1000) return null;
  if (ts > now + 3 * 365 * 24 * 60 * 60 * 1000) return null;
  return parsed.toISOString();
}

async function fetchAll() {
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, scraper_name')
      .is('date', null)
      .not('event_date', 'is', null)
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
  console.log(`  BACKFILL NULL date COLUMN`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} events with NULL date and non-NULL event_date\n`);

  const parseable = [];
  const unparseableByFormat = new Map();
  const unparseableByScraper = new Map();

  for (const r of rows) {
    const iso = parseEventDateText(r.event_date);
    if (iso) {
      parseable.push({ id: r.id, date: iso });
    } else {
      const key = (r.event_date || '').trim().substring(0, 80);
      if (!unparseableByFormat.has(key)) unparseableByFormat.set(key, []);
      unparseableByFormat.get(key).push(r);
      const sk = r.scraper_name || 'unknown';
      unparseableByScraper.set(sk, (unparseableByScraper.get(sk) || 0) + 1);
    }
  }

  console.log(`Parseable: ${parseable.length}`);
  console.log(`Unparseable: ${rows.length - parseable.length}`);

  // Sample of newly-parseable dates so you can sanity-check the parser
  console.log(`\nSample parseable backfills:`);
  for (const p of parseable.slice(0, 8)) {
    const orig = rows.find(r => r.id === p.id);
    console.log(`  ✓ "${(orig?.event_date || '').substring(0, 60)}" → ${p.date.substring(0, 10)}`);
  }

  // Unique unparseable formats sorted by frequency — these tell you what to teach the parser next
  const fmts = [...unparseableByFormat.entries()]
    .map(([fmt, items]) => ({ fmt, count: items.length, sampleName: items[0].name }))
    .sort((a, b) => b.count - a.count);

  console.log(`\nTop unparseable event_date formats (${fmts.length} unique):`);
  for (const f of fmts.slice(0, 20)) {
    console.log(`  ${String(f.count).padStart(4)}× "${f.fmt.substring(0, 70)}"`);
    if (fmts.indexOf(f) < 5) console.log(`         e.g. "${(f.sampleName || '').substring(0, 60)}"`);
  }

  // Unparseable by scraper — tells you whose date format is non-standard
  const byScraper = [...unparseableByScraper.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\nUnparseable by scraper:`);
  for (const [name, n] of byScraper.slice(0, 15)) {
    console.log(`  ${String(n).padStart(4)} ${name}`);
  }

  if (SAVE && parseable.length > 0) {
    console.log(`\n💾 Writing ${parseable.length} backfills to DB...`);
    let saved = 0, failed = 0;
    for (let i = 0; i < parseable.length; i += 50) {
      const batch = parseable.slice(i, i + 50);
      // Issue updates one-at-a-time per row (Supabase update() doesn't batch
      // different values across rows). Still cheap — selective writes only.
      await Promise.all(batch.map(async (p) => {
        const { error } = await supabase.from('events').update({ date: p.date }).eq('id', p.id);
        if (error) { failed++; } else { saved++; }
      }));
      if ((i + 50) % 250 === 0) console.log(`  ...${i + 50}/${parseable.length}`);
    }
    console.log(`✅ Saved: ${saved}, Failed: ${failed}`);
  } else if (parseable.length > 0) {
    console.log(`\n(dry run — re-run with --save to apply ${parseable.length} backfills)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
