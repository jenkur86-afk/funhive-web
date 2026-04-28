#!/usr/bin/env node

/**
 * Diagnose events missing age_range and identify non-family events.
 * Also look up the specific flagged event.
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

const FLAGGED_ID = 'f3b7e48d-1b12-456c-82b3-156046e05901';

// Non-family keywords — events with these should be removed
const NON_FAMILY_KEYWORDS = [
  /\bbeer\s*(fest|garden|tasting|crawl|pairing)/i,
  /\bwine\s*(tasting|pairing|night|fest)/i,
  /\bbrewery\b/i,
  /\bcocktail/i,
  /\bhappy\s*hour/i,
  /\bbar\s*crawl/i,
  /\bbooze/i,
  /\bdrinks?\s*(night|special)/i,
  /\bpub\s*(crawl|night|quiz)/i,
  /\btrivia\s*night/i,
  /\bsingles?\s*(night|mixer|mingle|event)/i,
  /\bdating/i,
  /\bspeed\s*dat/i,
  /\bnight\s*club/i,
  /\bstrip\b/i,
  /\badult\s*only\b/i,
  /\b21\+/i,
  /\b18\+\s*(only|event|night|party)/i,
  /\bafter\s*dark/i,
  /\blate\s*night\s*(comedy|show|party)/i,
  /\bkink/i,
  /\bburlesque/i,
  /\bdrag\s*(brunch|show|queen|night|bingo)/i,
  /\bsexy/i,
  /\bsensual/i,
  /\berotic/i,
  /\bcannabis/i,
  /\b420\b/i,
  /\bmarijuana/i,
  /\bweed\b/i,
  /\bstoner/i,
  /\bpoker\s*(night|tournament)/i,
  /\bcasino\s*night/i,
  /\bgambling/i,
  /\bgun\s*show/i,
  /\bfirearms?\s*(show|expo|sale)/i,
  /\bweapons?\s*(show|expo)/i,
];

function isNonFamily(name, description) {
  const text = `${name || ''} ${description || ''}`;
  for (const pattern of NON_FAMILY_KEYWORDS) {
    if (pattern.test(text)) return pattern.toString();
  }
  return false;
}

async function fetchAll(select, filters) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from('events').select(select);
    if (filters) q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log('═══ FLAGGED EVENT ═══');
  const { data: flagged } = await supabase.from('events').select('*').eq('id', FLAGGED_ID).single();
  if (flagged) {
    console.log(`  Name: ${flagged.name}`);
    console.log(`  Venue: ${flagged.venue}`);
    console.log(`  Date: ${flagged.event_date}`);
    console.log(`  Age Range: ${flagged.age_range || 'NONE'}`);
    console.log(`  Scraper: ${flagged.scraper_name}`);
    console.log(`  Description: ${(flagged.description || '').substring(0, 200)}`);
    console.log(`  Category: ${flagged.parent_category} / ${flagged.display_category}`);
    const match = isNonFamily(flagged.name, flagged.description);
    console.log(`  Non-family match: ${match || 'NO PATTERN MATCH — manual review needed'}`);
  } else {
    console.log('  Event not found in DB (may have been deleted)');
  }

  console.log('\n═══ EVENTS WITHOUT AGE RANGE ═══');
  const noAge = await fetchAll('id, name, description, venue, scraper_name, age_range, parent_category, event_date',
    q => q.is('age_range', null));

  // Also find events where age_range is empty string
  const emptyAge = await fetchAll('id, name, description, venue, scraper_name, age_range, parent_category, event_date',
    q => q.eq('age_range', ''));

  const all = [...noAge, ...emptyAge];
  console.log(`  NULL age_range: ${noAge.length}`);
  console.log(`  Empty string age_range: ${emptyAge.length}`);
  console.log(`  Total without age_range: ${all.length}`);

  // Group by scraper
  const byScraperAll = {};
  for (const e of all) {
    const s = e.scraper_name || 'unknown';
    byScraperAll[s] = (byScraperAll[s] || 0) + 1;
  }
  console.log('\n  By scraper:');
  const sortedScrapers = Object.entries(byScraperAll).sort((a, b) => b[1] - a[1]);
  for (const [scraper, count] of sortedScrapers.slice(0, 20)) {
    console.log(`    ${scraper}: ${count}`);
  }

  // Scan ALL events for non-family content
  console.log('\n═══ NON-FAMILY EVENTS (all events, not just missing age) ═══');
  const allEvents = await fetchAll('id, name, description, venue, scraper_name, age_range, event_date');

  const nonFamily = [];
  for (const e of allEvents) {
    const match = isNonFamily(e.name, e.description);
    if (match) {
      nonFamily.push({ ...e, matchPattern: match });
    }
  }

  console.log(`  Total non-family events found: ${nonFamily.length}`);
  console.log('\n  All non-family events:');
  for (const e of nonFamily) {
    console.log(`    [${e.scraper_name}] "${(e.name || '').substring(0, 60)}" | match: ${e.matchPattern}`);
  }

  // Show samples of events missing age range (for manual review)
  console.log('\n═══ SAMPLE EVENTS WITHOUT AGE RANGE (first 30) ═══');
  for (const e of all.slice(0, 30)) {
    console.log(`  [${e.scraper_name}] "${(e.name || '').substring(0, 55)}" | cat: ${e.parent_category || 'none'} | desc: "${(e.description || '').substring(0, 60)}"`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
