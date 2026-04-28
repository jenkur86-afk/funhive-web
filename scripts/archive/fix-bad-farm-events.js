#!/usr/bin/env node
/**
 * Clean up bad farm events saved by the Farms-Eastern-US scraper.
 * Finds events with scraper_name = 'Farms-Eastern-US' whose names
 * match known bad patterns (sentence fragments, garbled text, operational text).
 *
 * Usage:
 *   node fix-bad-farm-events.js          # dry run
 *   node fix-bad-farm-events.js --save   # delete
 */
const { supabase } = require('../../scrapers/helpers/supabase-adapter');
const SAVE = process.argv.includes('--save');

// Patterns that indicate a bad event name
const BAD_PATTERNS = [
  /^(?:or|and|for|the|at|on|in|to|of|with|by|from|we|you|our|is|are|was|will|be|pm|am|page|field|bring)\s/i,
  /on\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:at|$)/i,
  /onsaturday|onfriday|onmonday|ontwesday|onwednesday|onthursday|onsunday/i,
  /for\s*details|check\s*facebook|check\s*instagram|page\s*for/i,
  /we will be open|will resume|hours of operation|open daily/i,
  /^(?:Comments?|Photos?|Jobs?|Gallery)\s/i,
  /^(?:PM|AM)\s/i,
  /and other seasonal|and seasonal|events to follow/i,
  /lavender, baby animals/i,
];

(async () => {
  console.log(SAVE ? '🔧 SAVE mode — will DELETE bad events\n' : '🧪 DRY RUN\n');

  const { data, error } = await supabase
    .from('events')
    .select('id, name, state, city, venue, date')
    .eq('scraper_name', 'Farms-Eastern-US');

  if (error) { console.error('Error:', error.message); process.exit(1); }
  if (!data || data.length === 0) { console.log('No Farms-Eastern-US events found.'); return; }

  console.log(`Found ${data.length} total farm events.\n`);

  const badEvents = data.filter(e => {
    return BAD_PATTERNS.some(p => p.test(e.name));
  });

  const goodEvents = data.filter(e => !badEvents.includes(e));

  console.log('BAD events to delete:');
  for (const e of badEvents) {
    console.log(`  ❌ [${e.state}] "${e.name}" — ${e.venue || ''}`);
  }

  console.log(`\nGOOD events to keep:`);
  for (const e of goodEvents) {
    console.log(`  ✅ [${e.state}] "${e.name}" — ${e.venue || ''}`);
  }

  if (badEvents.length === 0) {
    console.log('\n✨ No bad events found!');
    return;
  }

  if (!SAVE) {
    console.log(`\n🧪 Dry run. ${badEvents.length} bad events would be deleted, ${goodEvents.length} kept.`);
    console.log('Run with --save to delete.');
    return;
  }

  const ids = badEvents.map(r => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error: delErr } = await supabase.from('events').delete().in('id', chunk);
    if (delErr) console.error(`  ❌ Delete error: ${delErr.message}`);
  }

  console.log(`\n✅ Deleted ${badEvents.length} bad farm events. ${goodEvents.length} good events kept.`);
})();
