#!/usr/bin/env node

/**
 * Remove cancelled/closed/postponed events from the database.
 *
 * Usage:
 *   node fix-cancelled-events.js           # Dry run
 *   node fix-cancelled-events.js --save    # Delete from DB
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

async function main() {
  console.log(`\n  FIX CANCELLED EVENTS — ${SAVE ? 'SAVE' : 'DRY RUN'}\n`);

  const keywords = ['cancelled', 'canceled', 'postponed', 'closed', 'suspended'];
  let toDelete = [];

  for (const keyword of keywords) {
    // Search in name
    const { data: nameMatches } = await supabase
      .from('events')
      .select('id, name')
      .ilike('name', `%${keyword}%`)
      .limit(500);

    // Search in description
    const { data: descMatches } = await supabase
      .from('events')
      .select('id, name')
      .ilike('description', `%${keyword}%`)
      .limit(500);

    const combined = [...(nameMatches || []), ...(descMatches || [])];
    for (const event of combined) {
      // Exclude false positives
      const name = event.name?.toLowerCase() || '';
      if (/\b(not\s+cancelled|not\s+canceled|rain\s+or\s+shine|unless\s+cancelled)\b/i.test(name)) continue;
      toDelete.push(event);
    }
  }

  // Deduplicate
  const seen = new Set();
  toDelete = toDelete.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

  console.log(`  Found ${toDelete.length} cancelled/closed events`);
  toDelete.slice(0, 10).forEach(e => console.log(`  - "${e.name}"`));
  if (toDelete.length > 10) console.log(`  ... and ${toDelete.length - 10} more`);

  if (SAVE && toDelete.length > 0) {
    const ids = toDelete.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase.from('events').delete().in('id', batch);
    }
    console.log(`\n  Deleted ${toDelete.length} events`);
  } else if (!SAVE) {
    console.log(`\n  Run with --save to delete`);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
