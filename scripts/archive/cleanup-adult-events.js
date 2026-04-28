#!/usr/bin/env node

/**
 * Find and remove adult-only events from the database.
 * Uses the same keyword detection as the scrapers to catch events that slipped through.
 *
 * Usage: node cleanup-adult-events.js [--save]
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

// Adult-only patterns — events that are clearly not for families
const ADULT_PATTERNS = [
  // Explicit adult labels
  /\badults?\s*only\b/i,
  /\bfor\s+(older\s+)?adults\b/i,
  /\badult\s+(program|workshop|class|craft|event|coloring|book\s*club)\b/i,

  // Career/professional events
  /\bcareer\s+(coach|counseli?ng|fair|services|workshop)\b/i,
  /\bjob\s+(search|seeker|fair|workshop)\b/i,
  /\bresume\s+(writing|workshop|help|review|clinic)\b/i,
  /\binterview\s+(prep|skills|workshop|tips)\b/i,
  /\bnetworking\s+(event|mixer|session|group)\b/i,
  /\bprofessional\s+development\b/i,
  /\blinkedin\s+(workshop|profile|class)\b/i,
  /\bcover\s+letter\b/i,
  /\bworkforce\s+(development|training)\b/i,

  // Senior-specific
  /\bsenior\s+(program|workshop|class|event|group|circle|social|lunch|exercise|fitness|yoga|tai\s*chi|bingo|trip)\b/i,
  /\bseniors?\s+only\b/i,
  /\bfor\s+seniors\b/i,
  /\b(50|55|60|65)\s*\+/i,
  /\bolder\s+adults\b/i,
  /\baarp\b/i,
  /\bmedicare\b/i,
  /\bdementia\b/i,
  /\balzheimer/i,

  // Tax/legal/financial (adult services)
  /\btax\s+(prep|help|assistance|filing|clinic)\b/i,
  /\bestate\s+planning\b/i,
  /\bretirement\s+planning\b/i,
  /\bsocial\s+security\s+(workshop|info|seminar)\b/i,

  // Adult social / nightlife
  /\bsingles?\s+night\b/i,
  /\bspeed\s+dating\b/i,
  /\bdate\s+night\b/i,
  /\bhappy\s+hour\b/i,
  /\bbar\s+crawl\b/i,
  /\bpub\s+crawl\b/i,
  /\bburlesque\b/i,

  // Alcohol events
  /\bwine\s+tasting\b/i,
  /\bbeer\s+tasting\b/i,
  /\bbrewery\s+tour\b/i,
  /\bcocktail\s+(class|hour|making|tasting)\b/i,
  /\bbyob\b/i,

  // Other adult library programs
  /\bbook\s+club\b/i,
  /\bknitting\s+(circle|club|group)\b/i,
  /\bquilting\b/i,
  /\bmahjong\b/i,
  /\bbridge\s+club\b/i,
  /\bgenealogy\b/i,
  /\bblood\s+(drive|donation)\b/i,
];

// Rescue patterns — if these appear too, the event is probably family-friendly
const FAMILY_RESCUE = [
  /\bfamil(y|ies)\b/i,
  /\bkid/i,
  /\bchild/i,
  /\btoddler/i,
  /\bbab(y|ies)\b/i,
  /\ball\s*ages\b/i,
  /\bstorytime/i,
  /\bteen/i,
  /\byouth\b/i,
  /\bjunior\b/i,
  /\bpreschool/i,
  /\belementary/i,
  /\byoung\s+adult/i,
];

function isAdultEvent(name, description) {
  const text = `${name || ''} ${description || ''}`;

  for (const pattern of ADULT_PATTERNS) {
    if (pattern.test(text)) {
      // Check rescue patterns
      const rescued = FAMILY_RESCUE.some(fp => fp.test(text));
      if (!rescued) return pattern.source;
    }
  }
  return null;
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
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  CLEANUP ADULT-ONLY EVENTS ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const events = await fetchAll('id, name, description, venue, scraper_name, event_date, age_range');
  console.log(`Total events scanned: ${events.length}\n`);

  const toDelete = [];

  for (const e of events) {
    const reason = isAdultEvent(e.name, e.description);
    if (reason) {
      toDelete.push({ ...e, reason });
    }
  }

  console.log(`Adult-only events found: ${toDelete.length}\n`);

  // Group by reason
  const byReason = {};
  for (const e of toDelete) {
    byReason[e.reason] = (byReason[e.reason] || 0) + 1;
  }
  console.log('By match pattern:');
  for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }

  // Group by scraper
  console.log('\nBy scraper:');
  const byScraper = {};
  for (const e of toDelete) {
    byScraper[e.scraper_name || 'unknown'] = (byScraper[e.scraper_name || 'unknown'] || 0) + 1;
  }
  for (const [s, c] of Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${s}: ${c}`);
  }

  // Show samples
  console.log('\nSamples:');
  for (const e of toDelete.slice(0, 25)) {
    console.log(`  ❌ [${e.scraper_name}] "${(e.name || '').substring(0, 55)}" → ${e.reason}`);
  }
  if (toDelete.length > 25) console.log(`  ... and ${toDelete.length - 25} more`);

  // Delete
  if (SAVE && toDelete.length > 0) {
    console.log(`\n🗑️ Deleting ${toDelete.length} adult-only events...`);
    const ids = toDelete.map(e => e.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) {
        console.error(`  Error: ${error.message}`);
      } else {
        deleted += batch.length;
      }
    }
    console.log(`✅ Deleted ${deleted} adult-only events`);
  } else if (!SAVE) {
    console.log(`\n⚠️ Dry run — add --save to delete these events`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
