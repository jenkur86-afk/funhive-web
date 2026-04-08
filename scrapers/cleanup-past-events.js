#!/usr/bin/env node
/**
 * Remove past events from the database.
 *
 * Usage:
 *   node scrapers/cleanup-past-events.js --dry-run   # preview what would be deleted
 *   node scrapers/cleanup-past-events.js              # actually delete past events
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DRY_RUN = process.argv.includes('--dry-run');

function isDateInPast(dateStr) {
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(parsed);
  eventDay.setHours(0, 0, 0, 0);
  return eventDay < today;
}

async function main() {
  console.log(`${DRY_RUN ? '🔍 DRY RUN — ' : '🗑️  '}Cleaning up past events...\n`);

  // Fetch all events
  let allEvents = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_date, scraper_name')
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

  console.log(`Total events in database: ${allEvents.length}`);

  // Find past events
  const pastEvents = allEvents.filter(e => isDateInPast(e.event_date));
  const futureEvents = allEvents.filter(e => !isDateInPast(e.event_date));
  const unparseable = allEvents.filter(e => {
    if (!e.event_date) return true;
    const d = new Date(e.event_date);
    return isNaN(d.getTime());
  });

  console.log(`Future/current events: ${futureEvents.length}`);
  console.log(`Past events to remove: ${pastEvents.length}`);
  console.log(`Unparseable dates (kept): ${unparseable.length}`);

  if (pastEvents.length === 0) {
    console.log('\nNo past events found. Database is clean!');
    return;
  }

  // Breakdown by scraper
  const scraperCounts = {};
  for (const ev of pastEvents) {
    const s = ev.scraper_name || 'unknown';
    scraperCounts[s] = (scraperCounts[s] || 0) + 1;
  }
  console.log('\nPast events by scraper:');
  const sorted = Object.entries(scraperCounts).sort((a, b) => b[1] - a[1]);
  for (const [scraper, count] of sorted) {
    console.log(`  ${scraper}: ${count}`);
  }

  // Show some examples
  console.log('\nSample past events:');
  for (const ev of pastEvents.slice(0, 5)) {
    console.log(`  "${ev.name}" — ${ev.event_date} (${ev.scraper_name || 'unknown'})`);
  }

  if (DRY_RUN) {
    console.log(`\n🔍 Dry run complete. ${pastEvents.length} past events would be deleted.`);
    console.log('Run without --dry-run to delete them.');
    return;
  }

  // Delete in batches of 100 IDs
  console.log(`\nDeleting ${pastEvents.length} past events...`);
  let deleted = 0;
  let failures = 0;

  for (let i = 0; i < pastEvents.length; i += 100) {
    const batch = pastEvents.slice(i, i + 100);
    const ids = batch.map(e => e.id);

    const { error } = await supabase
      .from('events')
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`  Batch delete error: ${error.message}`);
      failures += batch.length;
    } else {
      deleted += batch.length;
    }

    if ((i + 100) % 500 === 0) {
      console.log(`  Progress: ${Math.min(i + 100, pastEvents.length)}/${pastEvents.length}`);
    }
  }

  console.log(`\n✅ Deleted: ${deleted}`);
  if (failures > 0) console.log(`❌ Failed: ${failures}`);
  console.log('Done!');
}

main().catch(console.error);
