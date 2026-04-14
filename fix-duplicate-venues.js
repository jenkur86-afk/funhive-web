#!/usr/bin/env node

/**
 * FIX DUPLICATE VENUES
 *
 * Cleans venue names in the events table by stripping room/department suffixes.
 * "Aberdeen Library - Meeting Room" → "Aberdeen Library"
 *
 * Usage:
 *   node fix-duplicate-venues.js           # Dry run (preview)
 *   node fix-duplicate-venues.js --save    # Save changes to DB
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

const ROOM_KEYWORDS = /\b(room|meeting|conference|study|program|children|teen|makerspace|lab|studio|space|area|floor|auditorium|gallery|caf[eé]|parking|outdoor|outside|public|department|zoom|virtual|online|computer|board|storytime|story\s*time|large|small|grounds|lounge|lobby|patio|terrace|garden|courtyard|annex|wing|level|basement|lower)\b/i;

function cleanVenueName(venue) {
  if (!venue || typeof venue !== 'string') return venue;
  let cleaned = venue.trim();

  // If venue contains " - " and anything after it has a room keyword, strip it
  const dashIndex = cleaned.search(/\s+[-–—]\s+/);
  if (dashIndex > 0) {
    const suffix = cleaned.substring(dashIndex);
    if (ROOM_KEYWORDS.test(suffix)) {
      cleaned = cleaned.substring(0, dashIndex);
    }
  }

  // Fix repeated name patterns like "Porter BranchPorter Branch"
  if (cleaned.length > 10) {
    const half = Math.floor(cleaned.length / 2);
    if (cleaned.substring(0, half) === cleaned.substring(half)) {
      cleaned = cleaned.substring(0, half);
    }
  }

  return cleaned.trim();
}

async function main() {
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  FIX DUPLICATE VENUE NAMES`);
  console.log(`  Mode: ${SAVE ? '💾 SAVE' : '👀 DRY RUN'}`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  // Fetch all events with venue names containing " - "
  let allEvents = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, venue')
      .like('venue', '% - %')
      .range(from, from + pageSize - 1);

    if (error) { console.error('Error:', error.message); break; }
    allEvents = allEvents.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`  Found ${allEvents.length} events with " - " in venue name`);

  // Find ones that need cleaning
  const toFix = [];
  for (const event of allEvents) {
    const cleaned = cleanVenueName(event.venue);
    if (cleaned !== event.venue) {
      toFix.push({ id: event.id, oldVenue: event.venue, newVenue: cleaned });
    }
  }

  console.log(`  ${toFix.length} need cleaning\n`);

  // Show samples grouped by new venue name
  const groups = {};
  for (const fix of toFix) {
    if (!groups[fix.newVenue]) groups[fix.newVenue] = new Set();
    groups[fix.newVenue].add(fix.oldVenue);
  }

  let shown = 0;
  for (const [newVenue, oldNames] of Object.entries(groups)) {
    if (shown >= 10) { console.log(`  ... and ${Object.keys(groups).length - 10} more venues`); break; }
    console.log(`  📍 ${newVenue}`);
    for (const old of oldNames) {
      console.log(`     ← "${old}"`);
    }
    shown++;
  }

  // Apply fixes
  if (SAVE && toFix.length > 0) {
    console.log(`\n  Updating ${toFix.length} events...`);
    let updated = 0;
    let failed = 0;

    for (const fix of toFix) {
      const { error } = await supabase
        .from('events')
        .update({ venue: fix.newVenue })
        .eq('id', fix.id);

      if (error) {
        failed++;
        if (failed <= 3) console.error(`  ❌ ${fix.id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    console.log(`\n  ✅ Updated: ${updated}`);
    if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
  }

  // Also fix repeated-name venues (no dash pattern)
  console.log(`\n  Checking for repeated-name patterns...`);
  let repeatedAll = [];
  from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, venue')
      .not('venue', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) { console.error('Error:', error.message); break; }
    repeatedAll = repeatedAll.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const repeatedFixes = [];
  for (const event of repeatedAll) {
    const v = event.venue;
    if (v && v.length > 10) {
      const half = Math.floor(v.length / 2);
      if (v.substring(0, half) === v.substring(half)) {
        repeatedFixes.push({ id: event.id, oldVenue: v, newVenue: v.substring(0, half) });
      }
    }
  }

  console.log(`  Found ${repeatedFixes.length} repeated-name venues`);
  repeatedFixes.slice(0, 5).forEach(f => console.log(`  "${f.oldVenue}" → "${f.newVenue}"`));

  if (SAVE && repeatedFixes.length > 0) {
    let updated = 0;
    for (const fix of repeatedFixes) {
      const { error } = await supabase
        .from('events')
        .update({ venue: fix.newVenue })
        .eq('id', fix.id);
      if (!error) updated++;
    }
    console.log(`  ✅ Fixed ${updated} repeated-name venues`);
  }

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`  Total: ${toFix.length + repeatedFixes.length} venue names to clean`);
  if (!SAVE) console.log(`  👀 DRY RUN — run with --save to apply`);
  else console.log(`  💾 Changes saved`);
  console.log(`════════════════════════════════════════════════════════════\n`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
