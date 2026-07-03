#!/usr/bin/env node
/**
 * fix-dateless-events.js
 *
 * Deletes events where `date` TIMESTAMPTZ is NULL and `event_date` text cannot
 * be parsed by normalizeDateString. These rows are invisible to date-sorted
 * queries and cannot be displayed to users.
 *
 * Root cause: the assabet-NH-MA scraper saved 390 events before the "require
 * month name" guard was added. The remaining 54 are from other scrapers with
 * unparseable date formats.
 *
 * Usage:
 *   node scripts/fix-dateless-events.js          # dry run (no changes)
 *   node scripts/fix-dateless-events.js --save   # delete from DB
 */

'use strict';

const { supabase } = require('../scrapers/helpers/supabase-adapter');
const { normalizeDateString } = require('../scrapers/date-normalization-helper');

const SAVE = process.argv.includes('--save');
const PAGE_SIZE = 500;

async function fetchAll() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, scraper_name')
      .is('date', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('Fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  console.log(`\n🗑️  FIX DATELESS EVENTS ${SAVE ? '(SAVE MODE)' : '(DRY RUN)'}`);
  console.log('='.repeat(60));

  const rows = await fetchAll();
  console.log(`\nFound ${rows.length} events with NULL date TIMESTAMPTZ`);

  // Filter to only those where event_date also can't be parsed
  const toDelete = rows.filter(r => {
    if (!r.event_date || r.event_date.trim().length === 0) return true;
    const parsed = normalizeDateString(r.event_date);
    return !parsed;
  });

  // Report by scraper
  const byScraperCount = {};
  for (const r of toDelete) {
    const key = r.scraper_name || '(unknown)';
    byScraperCount[key] = (byScraperCount[key] || 0) + 1;
  }

  console.log(`\nEvents to delete (NULL date, unparseable event_date): ${toDelete.length}`);
  console.log('\nBy scraper:');
  for (const [scraper, count] of Object.entries(byScraperCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${scraper}: ${count}`);
  }

  if (toDelete.length === 0) {
    console.log('\n✅ Nothing to delete.');
    return;
  }

  if (!SAVE) {
    console.log('\n⚠️  DRY RUN — pass --save to delete these events.');
    return;
  }

  // Delete in batches of 100
  const ids = toDelete.map(r => r.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error } = await supabase
      .from('events')
      .delete()
      .in('id', batch);
    if (error) {
      console.error(`Batch delete error at ${i}:`, error.message);
    } else {
      deleted += batch.length;
      process.stdout.write(`\r  Deleted ${deleted} / ${ids.length}...`);
    }
  }
  console.log(`\n\n✅ Deleted ${deleted} dateless events.`);
}

main().catch(e => { console.error(e); process.exit(1); });
