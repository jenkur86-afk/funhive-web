#!/usr/bin/env node
/**
 * Fix events with missing start_time by extracting from event_date string.
 *
 * Usage: node scrapers/fix-missing-times.js [--dry-run]
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Extract time from event_date string
 * Handles patterns like:
 *   "Wednesday, April 8th 9:00am – 10:30am"
 *   "April 10, 2026 6:00pm - 7:00pm"
 *   "Sat Apr 12 10am-2pm"
 *   "2026-04-08T14:00:00"
 */
function extractTimeFromDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const str = dateStr.trim();

  // Pattern 1: ISO datetime with T separator — "2026-04-08T14:00:00"
  const isoMatch = str.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    let h = parseInt(isoMatch[1]);
    const m = isoMatch[2];
    if (h === 0 && m === '00') return null; // midnight usually means no time set
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return { startTime: `${h}:${m} ${ampm}`, endTime: null };
  }

  // Pattern 2: Time range with minutes — "9:00am - 10:30pm" or "9:00 AM – 10:30 PM"
  const rangeMinMatch = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (rangeMinMatch) {
    let sh = parseInt(rangeMinMatch[1]);
    const sm = rangeMinMatch[2];
    const sap = (rangeMinMatch[3] || inferAmPm(sh)).toUpperCase();
    let eh = parseInt(rangeMinMatch[4]);
    const em = rangeMinMatch[5];
    const eap = rangeMinMatch[6].toUpperCase();
    return {
      startTime: formatTime12(sh, sm, sap),
      endTime: formatTime12(eh, em, eap),
    };
  }

  // Pattern 3: Time range without minutes — "10am-2pm" or "10 AM - 2 PM"
  const rangeNoMinMatch = str.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
  if (rangeNoMinMatch) {
    return {
      startTime: formatTime12(parseInt(rangeNoMinMatch[1]), '00', rangeNoMinMatch[2].toUpperCase()),
      endTime: formatTime12(parseInt(rangeNoMinMatch[3]), '00', rangeNoMinMatch[4].toUpperCase()),
    };
  }

  // Pattern 4: Single time with minutes — "6:30pm" or "6:30 PM"
  const singleMinMatch = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (singleMinMatch) {
    return {
      startTime: formatTime12(parseInt(singleMinMatch[1]), singleMinMatch[2], singleMinMatch[3].toUpperCase()),
      endTime: null,
    };
  }

  // Pattern 5: Single time no minutes — "6pm" or "6 PM"
  // Be careful not to match year fragments like "2026"
  const singleNoMinMatch = str.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (singleNoMinMatch) {
    return {
      startTime: formatTime12(parseInt(singleNoMinMatch[1]), '00', singleNoMinMatch[2].toUpperCase()),
      endTime: null,
    };
  }

  return null;
}

function formatTime12(hour, minutes, ampm) {
  let h = hour;
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function inferAmPm(hour) {
  if (hour >= 7 && hour < 12) return 'AM';
  return 'PM';
}

async function main() {
  console.log(`${DRY_RUN ? '🔍 DRY RUN — ' : ''}Identifying events without times...\n`);

  // Fetch all events where start_time is null or empty
  let allEvents = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, start_time, end_time, scraper_name')
      .or('start_time.is.null,start_time.eq.')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching events:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allEvents = allEvents.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Found ${allEvents.length} events without start_time\n`);

  // Tally by scraper
  const scraperCounts = {};
  for (const ev of allEvents) {
    const s = ev.scraper_name || 'unknown';
    scraperCounts[s] = (scraperCounts[s] || 0) + 1;
  }
  console.log('Events without times by scraper:');
  const sorted = Object.entries(scraperCounts).sort((a, b) => b[1] - a[1]);
  for (const [scraper, count] of sorted) {
    console.log(`  ${scraper}: ${count}`);
  }

  // Try to extract times from event_date
  let fixable = 0;
  let unfixable = 0;
  const updates = [];
  const unfixableExamples = {};

  for (const ev of allEvents) {
    const result = extractTimeFromDateString(ev.event_date);
    if (result && result.startTime) {
      fixable++;
      updates.push({
        id: ev.id,
        start_time: result.startTime,
        end_time: result.endTime,
      });
    } else {
      unfixable++;
      const s = ev.scraper_name || 'unknown';
      if (!unfixableExamples[s]) unfixableExamples[s] = [];
      if (unfixableExamples[s].length < 3) {
        unfixableExamples[s].push({ name: ev.name, event_date: ev.event_date });
      }
    }
  }

  console.log(`\n✅ Fixable (time extractable from event_date): ${fixable}`);
  console.log(`❌ Unfixable (no time in event_date): ${unfixable}`);

  if (Object.keys(unfixableExamples).length > 0) {
    console.log('\nUnfixable examples by scraper:');
    for (const [scraper, examples] of Object.entries(unfixableExamples)) {
      console.log(`  ${scraper}:`);
      for (const ex of examples) {
        console.log(`    "${ex.name}" → event_date: "${ex.event_date}"`);
      }
    }
  }

  // Show some fix examples
  if (updates.length > 0) {
    console.log('\nSample fixes:');
    for (const u of updates.slice(0, 10)) {
      const ev = allEvents.find(e => e.id === u.id);
      console.log(`  "${ev.name}" | event_date: "${ev.event_date}" → start: ${u.start_time}, end: ${u.end_time || 'n/a'}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🔍 Dry run complete. Run without --dry-run to apply fixes.');
    return;
  }

  // Apply updates in batches
  if (updates.length > 0) {
    console.log(`\nApplying ${updates.length} updates...`);
    let success = 0;
    let failures = 0;

    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);
      for (const upd of batch) {
        const updateData = { start_time: upd.start_time };
        if (upd.end_time) updateData.end_time = upd.end_time;

        const { error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', upd.id);

        if (error) {
          failures++;
          if (failures <= 3) console.error(`  Failed to update ${upd.id}: ${error.message}`);
        } else {
          success++;
        }
      }
      if ((i + 50) % 200 === 0) console.log(`  Progress: ${Math.min(i + 50, updates.length)}/${updates.length}`);
    }

    console.log(`\n✅ Updated: ${success}`);
    if (failures > 0) console.log(`❌ Failed: ${failures}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
