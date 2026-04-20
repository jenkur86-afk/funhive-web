#!/usr/bin/env node

/**
 * Find and fix all events with NULL age_range.
 * Assigns age ranges based on keywords in name, description, venue, and category.
 *
 * Usage: node fix-missing-age-ranges.js [--save]
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

// Age detection patterns — ordered from most specific to least
const AGE_RULES = [
  // Baby/Toddler indicators
  { range: 'Babies & Toddlers (0-2)', patterns: [
    /\b(baby|babies|infant|newborn)\b/i,
    /\bage\s*[:\-]?\s*0\s*[-–]\s*[12]\b/i,
    /\b(0\s*[-–]\s*2\s*(years?|yrs?|months?))\b/i,
    /\blapsit\b/i,
  ]},
  // Toddler/Preschool indicators
  { range: 'Preschool (3-5)', patterns: [
    /\b(toddler|preschool|pre-school|pre-k|prek)\b/i,
    /\bage\s*[:\-]?\s*[2-3]\s*[-–]\s*[4-5]\b/i,
    /\b[23]\s*[-–]\s*5\s*(years?|yrs?)\b/i,
  ]},
  // Young kids
  { range: 'Kids (6-8)', patterns: [
    /\bage\s*[:\-]?\s*[5-6]\s*[-–]\s*[8-9]\b/i,
    /\b[56]\s*[-–]\s*[89]\s*(years?|yrs?)\b/i,
  ]},
  // Tweens
  { range: 'Tweens (9-12)', patterns: [
    /\b(tween)\b/i,
    /\bage\s*[:\-]?\s*[89]\s*[-–]\s*1[0-2]\b/i,
    /\b[89]\s*[-–]\s*1[0-2]\s*(years?|yrs?)\b/i,
  ]},
  // Teens
  { range: 'Teens (13-18)', patterns: [
    /\bteen\b/i,
    /\bage\s*[:\-]?\s*1[2-3]\s*[-–]\s*1[5-8]\b/i,
    /\b1[23]\s*[-–]\s*1[78]\s*(years?|yrs?)\b/i,
    /\byoung\s*adult\b/i,
  ]},
  // Broad kids range
  { range: 'Kids (6-12)', patterns: [
    /\b(kids?|children|child|elementary)\b/i,
    /\bschool\s*age\b/i,
    /\b(6|5)\s*[-–]\s*1[0-2]\s*(years?|yrs?)\b/i,
  ]},
  // Broad family range
  { range: 'All Ages', patterns: [
    /\b(family|families|all\s*ages?|everyone|community|public)\b/i,
    /\bstorytime\b/i,
    /\bstory\s*time\b/i,
    /\bcrafts?\b/i,
    /\bpuppet/i,
    /\bmagic\s*show\b/i,
    /\bcarnival\b/i,
    /\bfestival\b/i,
    /\bfair\b/i,
    /\bparade\b/i,
    /\bfarmers?\s*market\b/i,
    /\bbook\s*(club|mobile|sale)\b/i,
    /\bbookmobile\b/i,
    /\blibrary/i,
    /\bmuseum\b/i,
    /\bnature\s*(walk|hike|center|program)/i,
    /\bgarden\b/i,
    /\bplayground\b/i,
    /\bpark\b/i,
    /\bfree\s*(event|admission|entry)\b/i,
    /\bopen\s*house\b/i,
    /\bworkshop\b/i,
    /\bclass\b/i,
    /\bcamp\b/i,
    /\bsummer\s*(reading|program|camp)\b/i,
    /\bart\s*(class|show|exhibit|walk)\b/i,
    /\bmusic\b/i,
    /\bconcert\b/i,
    /\bmovie\b/i,
    /\bfilm\s*(showing|screening|night)\b/i,
    /\byoga\b/i,
    /\bdance\b/i,
    /\bsports?\b/i,
    /\bsoccer|baseball|basketball|football|swim/i,
    /\bscience\b/i,
    /\bSTEM|STEAM\b/i,
    /\bcoding|robot/i,
    /\blego/i,
    /\bgaming|game\s*night\b/i,
    /\btrivia\b/i,
    /\bvolunteer\b/i,
    /\bearth\s*day\b/i,
    /\bholiday/i,
    /\beaster|christmas|halloween|thanksgiving/i,
    /\bfood\s*truck\b/i,
    /\bpetting\s*zoo\b/i,
    /\bface\s*paint/i,
    /\bbounce\s*house\b/i,
    /\bhayride\b/i,
    /\bpumpkin\b/i,
    /\begg\s*hunt\b/i,
  ]},
];

function detectAgeRange(name, description, category, venue) {
  const text = `${name || ''} ${description || ''} ${category || ''} ${venue || ''}`;

  // Check specific age ranges first (baby, toddler, teen, etc.)
  for (const rule of AGE_RULES) {
    if (rule.range === 'All Ages') continue; // Check specific ranges first
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) return rule.range;
    }
  }

  // Fall back to "All Ages" if any general family indicator matches
  const allAgesRule = AGE_RULES.find(r => r.range === 'All Ages');
  for (const pattern of allAgesRule.patterns) {
    if (pattern.test(text)) return 'All Ages';
  }

  return null; // Truly can't determine
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
  console.log(`  FIX MISSING AGE RANGES ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const events = await fetchAll(
    'id, name, description, venue, scraper_name, category, event_date, age_range',
    q => q.is('age_range', null)
  );
  console.log(`Events with NULL age_range: ${events.length}\n`);

  if (events.length === 0) {
    console.log('No events to fix!');
    process.exit(0);
  }

  const fixed = [];
  const unfixable = [];

  for (const e of events) {
    const detected = detectAgeRange(e.name, e.description, e.category, e.venue);
    if (detected) {
      fixed.push({ id: e.id, name: e.name, age_range: detected, scraper: e.scraper_name });
    } else {
      unfixable.push(e);
    }
  }

  console.log(`Auto-fixable: ${fixed.length}`);
  console.log(`Unfixable (no keywords): ${unfixable.length}\n`);

  // Group by assigned age range
  const byRange = {};
  for (const f of fixed) { byRange[f.age_range] = (byRange[f.age_range] || 0) + 1; }
  console.log('Assigned age ranges:');
  for (const [range, count] of Object.entries(byRange).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${range}: ${count}`);
  }

  // Group by scraper
  console.log('\nBy scraper (fixable):');
  const byScraper = {};
  for (const f of fixed) { byScraper[f.scraper || 'unknown'] = (byScraper[f.scraper || 'unknown'] || 0) + 1; }
  for (const [s, c] of Object.entries(byScraper).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${s}: ${c}`);
  }

  // Show samples
  console.log('\nSamples (fixed):');
  for (const f of fixed.slice(0, 15)) {
    console.log(`  "${(f.name || '').substring(0, 50)}" → ${f.age_range}`);
  }

  if (unfixable.length > 0) {
    console.log(`\nUnfixable samples (${unfixable.length} total):`);
    for (const e of unfixable.slice(0, 20)) {
      console.log(`  [${e.scraper_name}] "${(e.name || '').substring(0, 50)}" | desc: "${(e.description || '').substring(0, 60)}"`);
    }
  }

  // Save fixes
  if (SAVE && fixed.length > 0) {
    console.log(`\n💾 Updating ${fixed.length} events...`);
    let updated = 0;
    let errors = 0;
    for (let i = 0; i < fixed.length; i++) {
      const { error } = await supabase.from('events').update({ age_range: fixed[i].age_range }).eq('id', fixed[i].id);
      if (error) {
        errors++;
        if (errors <= 3) console.error(`  Error: ${error.message}`);
      } else {
        updated++;
      }
      if (updated % 200 === 0 && updated > 0) console.log(`  ... ${updated} updated`);
    }
    console.log(`\n✅ Updated ${updated} events${errors > 0 ? ` (${errors} errors)` : ''}`);

    // For truly unfixable events, default to "All Ages" since they're on a family platform
    if (unfixable.length > 0) {
      console.log(`\n💾 Setting remaining ${unfixable.length} unfixable events to "All Ages" (family platform default)...`);
      let u2 = 0;
      for (const e of unfixable) {
        const { error } = await supabase.from('events').update({ age_range: 'All Ages' }).eq('id', e.id);
        if (!error) u2++;
      }
      console.log(`✅ Updated ${u2} events to "All Ages"`);
    }
  } else if (!SAVE) {
    console.log(`\n⚠️ Dry run — add --save to update these events`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
