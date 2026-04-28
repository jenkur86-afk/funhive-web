#!/usr/bin/env node
/**
 * Clean up adult/non-family events that were saved by the festival scraper
 * before the family-friendly filter was in place.
 *
 * Targets events where scraper_name = 'Festivals-Eastern-US' and the name
 * matches known adult event patterns (wine, beer, bourbon, mimosa, etc.).
 *
 * Usage:
 *   node fix-adult-festival-events.js          # dry run
 *   node fix-adult-festival-events.js --save   # delete matching events
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

// Patterns that indicate non-family events (same as isFamilyFriendly + NON_FAMILY_PATTERNS)
const ADULT_PATTERNS = [
  /\bwine\b/i,
  /\bbeer\b/i,
  /\bbrews?\b/i,
  /\bbourbon\b/i,
  /\bwhiskey\b/i,
  /\bspirits?\s+fest/i,
  /\bmimosa\b/i,
  /\bvineyard\b/i,
  /\bwinery\b/i,
  /\bcider\s+fest/i,
  /\bmead(ery)?\s+fest/i,
  /\bburlesque\b/i,
  /\bdrag\s+brunch\b/i,
  /\bbar\s+crawl\b/i,
  /\bpub\s+crawl\b/i,
  /\bnight\s*club\b/i,
  /\b21\+\b/i,
  /\b21\s+and\s+over\b/i,
  /\badults?\s+only\b/i,
  /\bcocktail\s+(crawl|fest|walk)\b/i,
  /\btequila\b/i,
  /\bsake\s+fest/i,
];

function isAdultEvent(name) {
  const lower = (name || '').toLowerCase();
  return ADULT_PATTERNS.some(p => p.test(lower));
}

(async () => {
  console.log(SAVE ? '🔧 SAVE mode — will DELETE matching events\n' : '🧪 DRY RUN — no changes (pass --save to delete)\n');

  // Fetch all events from the festival scraper
  const { data, error } = await supabase
    .from('events')
    .select('id, name, state, date')
    .eq('scraper_name', 'Festivals-Eastern-US');

  if (error) { console.error('Query error:', error.message); process.exit(1); }
  if (!data || data.length === 0) {
    console.log('No events found from Festivals-Eastern-US scraper.');
    return;
  }

  console.log(`Found ${data.length} total festival events.`);

  // Filter to adult events
  const adultEvents = data.filter(e => isAdultEvent(e.name));

  if (adultEvents.length === 0) {
    console.log('✅ No adult events found — nothing to clean up!');
    return;
  }

  console.log(`\n🚫 Found ${adultEvents.length} adult/non-family events:\n`);
  for (const e of adultEvents) {
    console.log(`  ❌ [${e.state || '??'}] ${e.name}`);
  }

  if (!SAVE) {
    console.log(`\n🧪 Dry run complete. ${adultEvents.length} events would be deleted.`);
    console.log('Run with --save to delete: node fix-adult-festival-events.js --save');
    return;
  }

  // Delete in chunks of 100
  const ids = adultEvents.map(e => e.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error: delErr } = await supabase
      .from('events')
      .delete()
      .in('id', chunk);
    if (delErr) {
      console.error(`  ❌ Delete error: ${delErr.message}`);
    } else {
      deleted += chunk.length;
    }
  }

  console.log(`\n✅ Done. Deleted ${deleted}/${adultEvents.length} adult events.`);
  console.log(`Remaining family-friendly festival events: ${data.length - deleted}`);
})();
