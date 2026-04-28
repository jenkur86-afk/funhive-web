#!/usr/bin/env node

/**
 * Delete junk KidsOutAndAbout-DMV events that have:
 *   - venue = "See event page"
 *   - No city, no state, no address, no geohash, no location
 * These are promo/meta listings, not real events.
 *
 * Usage:
 *   node delete-junk-koaa-events.js          # dry run
 *   node delete-junk-koaa-events.js --save   # actually delete
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

async function main() {
  console.log(`\n🗑️  Delete Junk KidsOutAndAbout Events ${SAVE ? '(LIVE)' : '(DRY RUN)'}\n`);

  // Find all events with venue="See event page" and no location data
  const { data: junk, error } = await supabase
    .from('events')
    .select('id, name, venue, city, state, address, geohash, location, scraper_name')
    .eq('venue', 'See event page')
    .is('location', null);

  if (error) {
    console.error('Error fetching:', error.message);
    process.exit(1);
  }

  // Further filter: only those with no city AND no state AND no geohash
  const toDelete = junk.filter(e => !e.city && !e.state && !e.geohash && !e.address);

  console.log(`Found ${junk.length} events with venue="See event page" and no location`);
  console.log(`Of those, ${toDelete.length} also have no city/state/address/geohash → junk\n`);

  if (toDelete.length === 0) {
    console.log('Nothing to delete!');
    process.exit(0);
  }

  // Show samples
  console.log('Samples:');
  for (const e of toDelete.slice(0, 10)) {
    console.log(`  "${(e.name || '').substring(0, 60)}" [${e.scraper_name || '?'}]`);
  }
  if (toDelete.length > 10) console.log(`  ... and ${toDelete.length - 10} more`);

  if (!SAVE) {
    console.log(`\n⚠️  DRY RUN — run with --save to delete ${toDelete.length} events`);
    process.exit(0);
  }

  // Delete in batches of 50
  const ids = toDelete.map(e => e.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { error: delErr } = await supabase
      .from('events')
      .delete()
      .in('id', batch);

    if (delErr) {
      console.error(`Error deleting batch ${i}: ${delErr.message}`);
    } else {
      deleted += batch.length;
      console.log(`  Deleted ${deleted}/${ids.length}`);
    }
  }

  console.log(`\n✅ Deleted ${deleted} junk events`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
