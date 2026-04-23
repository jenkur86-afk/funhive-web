#!/usr/bin/env node

/**
 * Fix events with duplicated date strings in the event_date field.
 *
 * The Communico scraper had a bug where .eelisttime contains the full
 * "Wednesday, April 22: 5:45pm - 6:30pm" and it got concatenated with
 * the regex-extracted date, producing doubled strings like:
 * "Wednesday, April 22: 5:45pm - 6:30pm Wednesday, April 22: 5:45pm - 6:30pm"
 *
 * This script finds all such events and fixes them by removing the duplicate half.
 *
 * Usage:
 *   node fix-duplicate-dates.js          # Dry run (shows what would change)
 *   node fix-duplicate-dates.js --save   # Actually update the database
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

async function fixDuplicateDates() {
  console.log(`\n🔍 Finding events with duplicated date strings...`);
  console.log(`   Mode: ${SAVE ? '💾 SAVE (will update DB)' : '👀 DRY RUN (preview only)'}\n`);

  // Fetch all events — we need to check event_date text for duplication patterns
  // Do it in batches since there could be many
  let offset = 0;
  const batchSize = 1000;
  let totalFound = 0;
  let totalFixed = 0;

  while (true) {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, event_date')
      .not('event_date', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('❌ Query error:', error.message);
      break;
    }

    if (!events || events.length === 0) break;

    for (const event of events) {
      const eventDate = event.event_date || '';
      if (eventDate.length < 10) continue;

      // Check if the string is exactly doubled
      // Pattern: the first half equals the second half
      const len = eventDate.length;
      if (len % 2 === 1) {
        // Odd length — could be "X Y" where X === Y (space in middle)
        const mid = Math.floor(len / 2);
        const firstHalf = eventDate.substring(0, mid).trim();
        const secondHalf = eventDate.substring(mid + 1).trim();
        if (firstHalf === secondHalf && firstHalf.length > 5) {
          totalFound++;
          console.log(`  📅 "${event.name}" — "${eventDate}" → "${firstHalf}"`);
          if (SAVE) {
            const { error: updateErr } = await supabase
              .from('events')
              .update({ event_date: firstHalf })
              .eq('id', event.id);
            if (updateErr) {
              console.error(`    ❌ Update failed: ${updateErr.message}`);
            } else {
              totalFixed++;
            }
          }
          continue;
        }
      }

      // Also check for even-length doubles (no space separator)
      if (len % 2 === 0) {
        const half = len / 2;
        const firstHalf = eventDate.substring(0, half).trim();
        const secondHalf = eventDate.substring(half).trim();
        if (firstHalf === secondHalf && firstHalf.length > 5) {
          totalFound++;
          console.log(`  📅 "${event.name}" — "${eventDate}" → "${firstHalf}"`);
          if (SAVE) {
            const { error: updateErr } = await supabase
              .from('events')
              .update({ event_date: firstHalf })
              .eq('id', event.id);
            if (updateErr) {
              console.error(`    ❌ Update failed: ${updateErr.message}`);
            } else {
              totalFixed++;
            }
          }
          continue;
        }
      }

      // Check for day-name-based duplication: "DayName, ... DayName, ..."
      // This catches cases with uneven whitespace
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const day of dayNames) {
        const firstIdx = eventDate.indexOf(day);
        if (firstIdx === -1) continue;
        const secondIdx = eventDate.indexOf(day, firstIdx + day.length);
        if (secondIdx === -1) continue;

        // Found the day name twice — check if it's a true duplicate
        const firstPart = eventDate.substring(firstIdx, secondIdx).trim();
        const secondPart = eventDate.substring(secondIdx).trim();
        if (firstPart === secondPart && firstPart.length > 5) {
          totalFound++;
          console.log(`  📅 "${event.name}" — "${eventDate}" → "${firstPart}"`);
          if (SAVE) {
            const { error: updateErr } = await supabase
              .from('events')
              .update({ event_date: firstPart })
              .eq('id', event.id);
            if (updateErr) {
              console.error(`    ❌ Update failed: ${updateErr.message}`);
            } else {
              totalFixed++;
            }
          }
          break;
        }
      }
    }

    offset += batchSize;
    if (events.length < batchSize) break;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Found: ${totalFound} events with duplicated dates`);
  if (SAVE) {
    console.log(`   Fixed: ${totalFixed} events`);
  } else {
    console.log(`   Run with --save to fix them`);
  }
}

fixDuplicateDates().catch(console.error);
