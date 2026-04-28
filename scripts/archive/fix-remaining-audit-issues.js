#!/usr/bin/env node

/**
 * FIX REMAINING AUDIT ISSUES
 *
 * Handles leftover issues from the data-quality-check:
 *   1. Fix "Adults" age_range on family events (rescue mislabeled)
 *   2. Delete truly adult-only events still in DB
 *   3. Fix junk titles
 *   4. Deduplicate venues
 *   5. Report flagged adult/non-family events that are false positives
 *
 * Usage:
 *   node fix-remaining-audit-issues.js          # Dry run
 *   node fix-remaining-audit-issues.js --save   # Save changes
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');
const SAVE = process.argv.includes('--save');

async function main() {
  console.log(`\n${SAVE ? '💾 SAVE MODE' : '🔍 DRY RUN'}\n`);

  // ══════════════════════════════════════════════
  // STEP 1: Fix remaining "Adults" age_range events
  // ══════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: Fix remaining "Adults" age_range');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: adultEvents, error: adultErr } = await supabase
    .from('events')
    .select('id, name, age_range, venue, description')
    .eq('age_range', 'Adults')
    .eq('reported', false);

  if (adultErr) { console.error('Error:', adultErr.message); process.exit(1); }

  const familyRescue = /\b(toddler|baby|babies|infant|preschool|kid|kids|children|child|youth|teen|teens|family|families|storytime|story\s*time|lego|playgroup|play\s*group|mommy|daddy|parent|nursery|kindergarten|puppet|craft|pajama|pj\s)/i;

  const toRescue = [];
  const toDelete = [];

  for (const e of adultEvents) {
    const text = `${e.name || ''} ${e.description || ''}`;
    if (familyRescue.test(text)) {
      // Determine correct age bracket from name
      const nameLower = (e.name || '').toLowerCase();
      const fixedAge = /\b(toddler|baby|babies|infant|nursery)\b/i.test(nameLower) ? 'Babies & Toddlers (0-2)'
        : /\b(preschool|kindergarten)\b/i.test(nameLower) ? 'Preschool (3-5)'
        : /\b(teen)\b/i.test(nameLower) ? 'Teens (13-18)'
        : 'All Ages';
      toRescue.push({ id: e.id, name: e.name, newAge: fixedAge });
    } else {
      toDelete.push({ id: e.id, name: e.name });
    }
  }

  console.log(`  Found ${adultEvents.length} events with age_range="Adults"`);
  console.log(`  Rescue (family events): ${toRescue.length}`);
  for (const e of toRescue) {
    console.log(`    ✅ "${e.name}" → ${e.newAge}`);
  }
  console.log(`  Delete (truly adult): ${toDelete.length}`);
  for (const e of toDelete) {
    console.log(`    ❌ "${e.name}"`);
  }

  if (SAVE) {
    for (const e of toRescue) {
      await supabase.from('events').update({ age_range: e.newAge }).eq('id', e.id);
    }
    if (toDelete.length > 0) {
      await supabase.from('events').delete().in('id', toDelete.map(e => e.id));
    }
    console.log(`  💾 Rescued ${toRescue.length}, deleted ${toDelete.length}`);
  }

  // ══════════════════════════════════════════════
  // STEP 2: Check flagged "adult/non-family" events
  // ══════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: Check flagged adult/non-family events');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // These are the specific events flagged in the audit
  const falsePositiveNames = [
    'Winter GreenMarket | Old School Square',
    'NWA Naturals vs Wichita Wind Surge @ Arvest Ballpark',
    'Chow Wagon',
    'Britton Coffee Co Spring Market',
    'Farm Open House',
  ];

  // These are family-friendly events with misleading names — fix age_range to All Ages
  for (const name of falsePositiveNames) {
    const { data } = await supabase
      .from('events')
      .select('id, name, age_range')
      .ilike('name', `%${name}%`)
      .eq('reported', false);

    if (data && data.length > 0) {
      console.log(`  📋 "${name}" — ${data.length} events, age_range: "${data[0].age_range}"`);
      if (data[0].age_range === 'Adults' && SAVE) {
        const ids = data.map(e => e.id);
        await supabase.from('events').update({ age_range: 'All Ages' }).in('id', ids);
        console.log(`     → Fixed to "All Ages"`);
      }
    }
  }

  // The book club and "Adult glow in the dark bingo bash" are legitimately adult-only — delete
  const trulyAdultNames = [
    'First Thursday Book Club',
    'Adult glow in the dark  bingo bash',
  ];

  for (const name of trulyAdultNames) {
    const { data } = await supabase
      .from('events')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .eq('reported', false);

    if (data && data.length > 0) {
      console.log(`  ❌ "${name}" — ${data.length} events (truly adult, will delete)`);
      if (SAVE) {
        await supabase.from('events').delete().in('id', data.map(e => e.id));
      }
    }
  }

  // ══════════════════════════════════════════════
  // STEP 3: Fix duplicate venues
  // ══════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: Deduplicate venues');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const dupeNames = ['charmingfare farm', 'tuscan village', 'andres institute of art'];

  for (const dupeName of dupeNames) {
    const { data: dupes } = await supabase
      .from('activities')
      .select('id, name, city, state, created_at')
      .ilike('name', dupeName)
      .order('created_at', { ascending: true });

    if (dupes && dupes.length > 1) {
      const keep = dupes[0];
      const remove = dupes.slice(1);
      console.log(`  🔄 "${keep.name}" in ${keep.city}, ${keep.state} — keeping oldest, removing ${remove.length} dupe(s)`);

      if (SAVE) {
        for (const dupe of remove) {
          // Reassign any events pointing to the duplicate
          await supabase.from('events').update({ activity_id: keep.id }).eq('activity_id', dupe.id);
          // Delete the duplicate venue
          await supabase.from('activities').delete().eq('id', dupe.id);
        }
        console.log(`     → Merged and deleted`);
      }
    }
  }

  // ══════════════════════════════════════════════
  // STEP 4: Fix junk titles
  // ══════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4: Find remaining junk titles');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: junkEvents } = await supabase
    .from('events')
    .select('id, name')
    .eq('reported', false)
    .or('name.ilike.%click here%,name.ilike.%read more%,name.ilike.%learn more%,name.eq.Events,name.eq.Event');

  if (junkEvents && junkEvents.length > 0) {
    console.log(`  Found ${junkEvents.length} junk title events:`);
    for (const e of junkEvents) {
      console.log(`    🗑️ "${e.name}"`);
    }
    if (SAVE) {
      await supabase.from('events').delete().in('id', junkEvents.map(e => e.id));
      console.log(`  💾 Deleted ${junkEvents.length} junk events`);
    }
  } else {
    console.log('  No junk title events found');
  }

  // ══════════════════════════════════════════════
  // STEP 5: Fix the failed Children's Museums scraper
  // ══════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 5: Check Children\'s Museums scraper');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('  ⚠️  Local-Venue-Events-ChildrensMuseums failed with:');
  console.log('     "scraperName and state are required options"');
  console.log('  → This is a code bug in the scraper — needs investigation');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Adults rescued:     ${toRescue.length}`);
  console.log(`  Adults deleted:     ${toDelete.length}`);
  console.log(`  Dupes merged:       ${dupeNames.length} groups`);
  console.log(`  Junk titles:        ${junkEvents ? junkEvents.length : 0}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
