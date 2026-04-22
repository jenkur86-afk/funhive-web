#!/usr/bin/env node

/**
 * FIX ALL DATA QUALITY ISSUES
 *
 * Comprehensive cleanup script that handles:
 *   1. Normalize age_range — collapse hundreds of messy values into 5 standard brackets
 *   2. Delete adult-only events (age_range = "Adults" or adult keywords)
 *   3. Delete past events
 *   4. Backfill missing parsed `date` TIMESTAMPTZ from event_date text
 *
 * Usage:
 *   node fix-all-data-quality.js              # Dry run — shows what would change
 *   node fix-all-data-quality.js --save       # Actually save changes
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
const { normalizeAgeRange } = require('./scrapers/helpers/age-range-normalizer');

const SAVE = process.argv.includes('--save');

// ============================================================================
// STANDARD AGE BRACKETS
// ============================================================================
// These are the ONLY values that should exist in the age_range column:
//   "All Ages"
//   "Babies & Toddlers (0-2)"
//   "Preschool (3-5)"
//   "Kids (6-8)"
//   "Tweens (9-12)"
//   "Teens (13-18)"
//   "Adults" (flagged for deletion)
//
// normalizeAgeRange() is imported from scrapers/helpers/age-range-normalizer.js

// ============================================================================
// HELPERS
// ============================================================================

async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function parseEventDateToTimestamp(eventDate) {
  if (!eventDate || typeof eventDate !== 'string') return null;

  // Try direct Date parse first
  let d = new Date(eventDate);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2030) {
    return d.toISOString();
  }

  // Common formats: "April 25, 2026", "Apr 25 2026", "4/25/2026"
  // Strip time parts and day names for cleaner parsing
  let cleaned = eventDate
    .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/gi, '')
    .replace(/\s+at\s+\d{1,2}[:.]\d{2}\s*(am|pm)?/gi, '')
    .replace(/\s+\d{1,2}[:.]\d{2}\s*(am|pm)?(\s*[-–]\s*\d{1,2}[:.]\d{2}\s*(am|pm)?)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  d = new Date(cleaned);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2030) {
    return d.toISOString();
  }

  // Try MM/DD/YYYY
  const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    d = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try "Month DD, YYYY" or "Month DD YYYY"
  const monthNames = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };

  const monthMatch = cleaned.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
  if (monthMatch) {
    const month = monthNames[monthMatch[1].toLowerCase()];
    const day = parseInt(monthMatch[2]);
    const year = monthMatch[3] ? parseInt(monthMatch[3]) : new Date().getFullYear();
    if (month !== undefined && day >= 1 && day <= 31) {
      d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2030) {
        return d.toISOString();
      }
    }
  }

  return null;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX ALL DATA QUALITY ISSUES ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Fetch all events
  const events = await fetchAll('events', 'id, name, event_date, date, age_range, description');
  console.log(`Total events: ${events.length}\n`);

  // ========================================
  // STEP 1: Normalize age_range
  // ========================================
  console.log('━'.repeat(50));
  console.log('STEP 1: NORMALIZE AGE RANGES');
  console.log('━'.repeat(50));

  const normalizations = {};  // old → new
  const toUpdate = [];        // {id, newAgeRange}
  const toDelete = [];        // adult events
  const brackets = {};        // count per bracket after normalization

  for (const e of events) {
    const oldVal = e.age_range || '';
    const newVal = normalizeAgeRange(oldVal);

    brackets[newVal] = (brackets[newVal] || 0) + 1;

    if (newVal === 'Adults') {
      toDelete.push(e);
      continue;
    }

    if (oldVal !== newVal) {
      toUpdate.push({ id: e.id, newAgeRange: newVal });
      if (!normalizations[oldVal]) normalizations[oldVal] = { to: newVal, count: 0 };
      normalizations[oldVal].count++;
    }
  }

  console.log(`\n  Events to normalize: ${toUpdate.length}`);
  console.log(`  Events to delete (Adults): ${toDelete.length}`);
  console.log(`  Events already correct: ${events.length - toUpdate.length - toDelete.length}`);

  console.log(`\n  Final bracket distribution:`);
  for (const [b, c] of Object.entries(brackets).sort((a, b) => b[1] - a[1])) {
    const pct = ((c / events.length) * 100).toFixed(1);
    console.log(`    ${b.padEnd(28)} ${String(c).padStart(6)}  (${pct}%)`);
  }

  // Show sample normalizations
  const sortedNorms = Object.entries(normalizations).sort((a, b) => b[1].count - a[1].count);
  console.log(`\n  Top normalization mappings (${sortedNorms.length} unique values mapped):`);
  for (const [old, info] of sortedNorms.slice(0, 30)) {
    const display = old.length > 50 ? old.substring(0, 50) + '...' : old;
    console.log(`    "${display}" → ${info.to}  (${info.count}x)`);
  }
  if (sortedNorms.length > 30) console.log(`    ... and ${sortedNorms.length - 30} more`);

  // Show adult events to delete
  if (toDelete.length > 0) {
    console.log(`\n  Adult events to delete:`);
    for (const e of toDelete.slice(0, 15)) {
      console.log(`    ❌ "${(e.name || '').substring(0, 50)}" [age_range: "${(e.age_range || '').substring(0, 30)}"]`);
    }
    if (toDelete.length > 15) console.log(`    ... and ${toDelete.length - 15} more`);
  }

  // ========================================
  // STEP 2: Delete past events
  // ========================================
  console.log('\n' + '━'.repeat(50));
  console.log('STEP 2: DELETE PAST EVENTS');
  console.log('━'.repeat(50));

  // Compare date-only (ignore time component) so today's events are never flagged as past.
  // Without this, events at midnight UTC on the current day get incorrectly flagged
  // when the check runs later in the day (e.g., the 11 Macaroni Kid McKinney events).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pastEvents = [];

  for (const e of events) {
    // Skip events already marked for deletion
    if (toDelete.find(d => d.id === e.id)) continue;

    let isPast = false;

    // Check parsed date first
    if (e.date) {
      const d = new Date(e.date);
      if (!isNaN(d.getTime())) {
        const eventDay = new Date(d);
        eventDay.setHours(0, 0, 0, 0);
        if (eventDay < today) isPast = true;
      }
    }

    // Check event_date text
    if (!isPast && e.event_date) {
      const parsed = parseEventDateToTimestamp(e.event_date);
      if (parsed) {
        const d = new Date(parsed);
        const eventDay = new Date(d);
        eventDay.setHours(0, 0, 0, 0);
        if (eventDay < today) isPast = true;
      }
    }

    if (isPast) pastEvents.push(e);
  }

  console.log(`\n  Past events found: ${pastEvents.length}`);
  if (pastEvents.length > 0) {
    console.log(`  Samples:`);
    for (const e of pastEvents.slice(0, 10)) {
      console.log(`    🕐 "${(e.name || '').substring(0, 45)}" — ${e.event_date || e.date}`);
    }
    if (pastEvents.length > 10) console.log(`    ... and ${pastEvents.length - 10} more`);
  }

  // ========================================
  // STEP 3: Backfill parsed date
  // ========================================
  console.log('\n' + '━'.repeat(50));
  console.log('STEP 3: BACKFILL PARSED DATE (TIMESTAMPTZ)');
  console.log('━'.repeat(50));

  const toBackfillDate = [];

  for (const e of events) {
    // Skip events being deleted
    if (toDelete.find(d => d.id === e.id)) continue;
    if (pastEvents.find(p => p.id === e.id)) continue;

    if (!e.date && e.event_date) {
      const parsed = parseEventDateToTimestamp(e.event_date);
      if (parsed) {
        toBackfillDate.push({ id: e.id, date: parsed });
      }
    }
  }

  const stillMissing = events.filter(e =>
    !e.date &&
    !toDelete.find(d => d.id === e.id) &&
    !pastEvents.find(p => p.id === e.id) &&
    !toBackfillDate.find(b => b.id === e.id)
  ).length;

  console.log(`\n  Events without parsed date: ${events.filter(e => !e.date).length}`);
  console.log(`  Can backfill from event_date: ${toBackfillDate.length}`);
  console.log(`  Still unparseable after backfill: ${stillMissing}`);

  if (toBackfillDate.length > 0) {
    console.log(`  Samples:`);
    for (const b of toBackfillDate.slice(0, 10)) {
      const e = events.find(ev => ev.id === b.id);
      console.log(`    📅 "${(e?.event_date || '').substring(0, 40)}" → ${b.date.substring(0, 10)}`);
    }
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n' + '━'.repeat(50));
  console.log('SUMMARY');
  console.log('━'.repeat(50));
  console.log(`  Age ranges to normalize:  ${toUpdate.length}`);
  console.log(`  Adult events to delete:   ${toDelete.length}`);
  console.log(`  Past events to delete:    ${pastEvents.length}`);
  console.log(`  Dates to backfill:        ${toBackfillDate.length}`);
  console.log(`  Total DB operations:      ${toUpdate.length + toDelete.length + pastEvents.length + toBackfillDate.length}`);

  // ========================================
  // EXECUTE
  // ========================================
  if (!SAVE) {
    console.log(`\n⚠️  DRY RUN — add --save to apply changes\n`);
    process.exit(0);
  }

  console.log(`\n🔧 APPLYING CHANGES...\n`);

  // Delete adult events
  if (toDelete.length > 0) {
    console.log(`  Deleting ${toDelete.length} adult events...`);
    const ids = toDelete.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) console.error(`    Error: ${error.message}`);
    }
    console.log(`  ✅ Deleted ${toDelete.length} adult events`);
  }

  // Delete past events
  if (pastEvents.length > 0) {
    console.log(`  Deleting ${pastEvents.length} past events...`);
    const ids = pastEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) console.error(`    Error: ${error.message}`);
    }
    console.log(`  ✅ Deleted ${pastEvents.length} past events`);
  }

  // Normalize age ranges (batch by new value for efficiency)
  if (toUpdate.length > 0) {
    console.log(`  Normalizing ${toUpdate.length} age ranges...`);
    let updated = 0;
    // Group by new value
    const byNewVal = {};
    for (const u of toUpdate) {
      if (!byNewVal[u.newAgeRange]) byNewVal[u.newAgeRange] = [];
      byNewVal[u.newAgeRange].push(u.id);
    }

    for (const [newVal, ids] of Object.entries(byNewVal)) {
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error } = await supabase.from('events').update({ age_range: newVal }).in('id', batch);
        if (error) console.error(`    Error updating to "${newVal}": ${error.message}`);
        else updated += batch.length;
      }
    }
    console.log(`  ✅ Normalized ${updated} age ranges`);
  }

  // Backfill dates
  if (toBackfillDate.length > 0) {
    console.log(`  Backfilling ${toBackfillDate.length} parsed dates...`);
    let filled = 0;
    for (const b of toBackfillDate) {
      const { error } = await supabase.from('events').update({ date: b.date }).eq('id', b.id);
      if (error) console.error(`    Error: ${error.message}`);
      else filled++;

      // Progress
      if (filled % 500 === 0) console.log(`    ... ${filled}/${toBackfillDate.length}`);
    }
    console.log(`  ✅ Backfilled ${filled} dates`);
  }

  console.log(`\n✅ ALL DONE\n`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
