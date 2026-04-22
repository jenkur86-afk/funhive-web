#!/usr/bin/env node
/**
 * FIX BORDERLINE EVENTS — Delete confirmed non-family events
 *
 * Deletes events manually reviewed and confirmed as non-family:
 * - Creatures & Cocktails at The Music Hall (cocktail event)
 * - Trivia Night @ Three Dollar Cafe (bar trivia)
 * - Black Orchid Trivia Night (at a brewery)
 * - CRABBY Trivia – The Area's Best Trivia Night (at a brewery)
 *
 * Usage:
 *   node fix-borderline-events.js          # Dry run
 *   node fix-borderline-events.js --save   # Delete from DB
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

const DELETE_IDS = [
  '670ba94a-2022-4bcc-a1c1-df0c5decc00e',  // Creatures & Cocktails at The Music Hall
  'suWyVmBT1Vf2yS6Z97J4',                   // Trivia Night @ Three Dollar Cafe
  'VQn1x-ujqjO40nZcM9Lo',                   // Black Orchid Trivia Night
  'sg8UUZN6oOpciCm_nABRCG3rvh2fL8',         // CRABBY Trivia – The Area's Best Trivia Night
];

async function main() {
  console.log(`\n🗑️  BORDERLINE EVENT CLEANUP ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log('='.repeat(50));

  for (const id of DELETE_IDS) {
    // Verify event exists
    const { data, error } = await supabase
      .from('events')
      .select('id, name, venue, event_date')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.log(`  ⚠️  Not found: ${id}`);
      continue;
    }

    console.log(`  🗑️  "${data.name}" at ${data.venue} (${data.event_date})`);

    if (SAVE) {
      const { error: delError } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      if (delError) {
        console.log(`    ❌ Delete failed: ${delError.message}`);
      } else {
        console.log(`    ✅ Deleted`);
      }
    }
  }

  console.log(`\nDone. ${SAVE ? 'Deleted' : 'Would delete'} ${DELETE_IDS.length} events.`);
  if (!SAVE) console.log('Run with --save to apply changes.');
}

main().catch(console.error);
