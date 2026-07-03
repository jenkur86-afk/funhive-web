#!/usr/bin/env node
/**
 * fix-category-slugs.js
 *
 * Normalizes raw category slugs to frontend display names for existing DB rows.
 * The supabase-adapter.js normalizeCategory() now handles this at scrape time,
 * but rows already in the DB need a one-time backfill.
 *
 * Slug → Display name mapping:
 *   library         → Storytimes & Library
 *   parks           → Outdoor & Nature
 *   parks-rec       → Outdoor & Nature
 *   community       → Community (caps fix only)
 *   learning-culture→ Arts & Culture
 *
 * Usage:
 *   node scripts/fix-category-slugs.js          # dry run
 *   node scripts/fix-category-slugs.js --save   # write to DB
 */

'use strict';

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

const SLUG_MAP = {
  'library': 'Storytimes & Library',
  'parks': 'Outdoor & Nature',
  'parks-rec': 'Outdoor & Nature',
  'parks_rec': 'Outdoor & Nature',
  'community': 'Community',
  'learning-culture': 'Arts & Culture',
  'learning_culture': 'Arts & Culture',
  'arts': 'Arts & Culture',
  'arts-culture': 'Arts & Culture',
  'festivals': 'Festivals',
  'animals': 'Animals & Wildlife',
  'wildlife': 'Animals & Wildlife',
  'indoor': 'Indoor',
  'classes': 'Classes & Workshops',
  'workshops': 'Classes & Workshops',
  'nature': 'Outdoor & Nature',
  'outdoor': 'Outdoor & Nature',
};

const PAGE_SIZE = 1000;

async function fetchBatch(table, slug, from) {
  return supabase
    .from(table)
    .select('id, name, category')
    .eq('category', slug)
    .order('id', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
}

async function fixTable(table) {
  let totalFixed = 0;

  for (const [slug, displayName] of Object.entries(SLUG_MAP)) {
    let from = 0;
    let batchTotal = 0;

    while (true) {
      const { data, error } = await fetchBatch(table, slug, from);
      if (error) { console.error(`  Error fetching ${table} where category='${slug}':`, error.message); break; }
      if (!data || data.length === 0) break;

      batchTotal += data.length;
      console.log(`  ${table}: "${slug}" → "${displayName}" (${data.length} rows at offset ${from})`);

      if (SAVE) {
        const ids = data.map(r => r.id);
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          const { error: updateErr } = await supabase
            .from(table)
            .update({ category: displayName })
            .in('id', batch);
          if (updateErr) console.error(`  Update error:`, updateErr.message);
        }
      }

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (batchTotal > 0) totalFixed += batchTotal;
  }

  return totalFixed;
}

async function main() {
  console.log(`\n🏷️  FIX CATEGORY SLUGS ${SAVE ? '(SAVE MODE)' : '(DRY RUN)'}`);
  console.log('='.repeat(60));

  console.log('\n📋 Events table:');
  const eventsFixed = await fixTable('events');

  console.log('\n📋 Activities table:');
  const activitiesFixed = await fixTable('activities');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total rows to update: ${eventsFixed + activitiesFixed}`);
  if (!SAVE) console.log('\n⚠️  DRY RUN — pass --save to write changes.');
  else console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
