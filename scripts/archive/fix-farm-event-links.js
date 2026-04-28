#!/usr/bin/env node

/**
 * FIX FARM EVENT-VENUE LINKS
 *
 * Links farm events to their corresponding farm venue (activity) records
 * via the activity_id field. Farm events currently have venue names but
 * no activity_id, so they don't show up on venue detail pages.
 *
 * Matching strategy:
 *   1. Exact venue name + state match to activity
 *   2. Normalized name match (strip punctuation, lowercase)
 *   3. Partial match (event venue contains activity name or vice versa)
 *
 * Usage:
 *   node fix-farm-event-links.js              # Dry run
 *   node fix-farm-event-links.js --save       # Apply fixes
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

const DRY_RUN = !process.argv.includes('--save');

async function fetchAll(table, select = '*', filter = null) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`  Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX FARM EVENT → VENUE LINKS`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '💾 SAVING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Load farm venues (activities) — farms have category 'Outdoor & Nature' or 'Farms & Nature'
  // and are typically created by scraper 'Farms-Eastern-US' or have 'farm' in their name
  const allActivities = await fetchAll('activities', 'id, name, state, city, category, subcategory, scraper_name');
  console.log(`  Total activities: ${allActivities.length}`);

  // Filter to farm-related activities
  const farmActivities = allActivities.filter(a => {
    const name = (a.name || '').toLowerCase();
    const cat = (a.category || '').toLowerCase();
    const subcat = (a.subcategory || '').toLowerCase();
    const scraper = (a.scraper_name || '').toLowerCase();

    return scraper.includes('farm') ||
           subcat.includes('farm') || subcat.includes('orchard') || subcat.includes('berry') ||
           subcat.includes('petting zoo') || subcat.includes('christmas tree') ||
           subcat.includes('flower') || subcat.includes('pumpkin') ||
           name.includes('farm') || name.includes('orchard') || name.includes('ranch') ||
           name.includes('petting zoo') || name.includes('berry') ||
           (cat === 'farms & nature');
  });

  console.log(`  Farm-related activities: ${farmActivities.length}`);

  // Build lookup maps for farm venues
  // Key: normalized name + state → activity
  const exactLookup = {};    // "name|||state" → activity
  const normalLookup = {};   // normalized "name|||state" → activity

  for (const act of farmActivities) {
    const exactKey = `${(act.name || '').trim()}|||${(act.state || '').toUpperCase()}`;
    exactLookup[exactKey] = act;

    const normKey = `${normalize(act.name)}|||${(act.state || '').toUpperCase()}`;
    normalLookup[normKey] = act;
  }

  // Load farm events (no activity_id set)
  const allEvents = await fetchAll('events', 'id, name, venue, state, city, activity_id, scraper_name, category');

  // Filter to farm events that don't have activity_id
  const farmEvents = allEvents.filter(e => {
    if (e.activity_id) return false; // Already linked

    const name = (e.name || '').toLowerCase();
    const venue = (e.venue || '').toLowerCase();
    const cat = (e.category || '').toLowerCase();
    const scraper = (e.scraper_name || '').toLowerCase();

    return scraper.includes('farm') ||
           cat.includes('farm') || cat.includes('outdoor') ||
           venue.includes('farm') || venue.includes('orchard') || venue.includes('ranch') ||
           venue.includes('petting zoo') || venue.includes('berry') ||
           name.includes('farm') || name.includes('pumpkin patch') ||
           name.includes('corn maze') || name.includes('hayride');
  });

  console.log(`  Farm events without activity_id: ${farmEvents.length}`);

  // Match events to venues
  let matched = 0;
  let unmatched = 0;
  const updates = [];
  const unmatchedVenues = {};

  for (const evt of farmEvents) {
    const venueName = (evt.venue || evt.name || '').trim();
    const state = (evt.state || '').toUpperCase();

    if (!venueName || !state) { unmatched++; continue; }

    // Strategy 1: Exact match
    let activity = exactLookup[`${venueName}|||${state}`];

    // Strategy 2: Normalized match
    if (!activity) {
      activity = normalLookup[`${normalize(venueName)}|||${state}`];
    }

    // Strategy 3: Partial match — event venue contains activity name or vice versa
    if (!activity) {
      const normVenue = normalize(venueName);
      for (const act of farmActivities) {
        if ((act.state || '').toUpperCase() !== state) continue;
        const normAct = normalize(act.name);
        if (normAct.length < 4) continue; // Skip very short names

        if (normVenue.includes(normAct) || normAct.includes(normVenue)) {
          activity = act;
          break;
        }
      }
    }

    // Strategy 4: City-based matching — same city + both have "farm" in name
    if (!activity) {
      const evtCity = (evt.city || '').toLowerCase().trim();
      if (evtCity) {
        for (const act of farmActivities) {
          if ((act.state || '').toUpperCase() !== state) continue;
          if ((act.city || '').toLowerCase().trim() !== evtCity) continue;

          // Both names share significant words
          const evtWords = new Set(normalize(venueName).split(' ').filter(w => w.length > 3));
          const actWords = new Set(normalize(act.name).split(' ').filter(w => w.length > 3));
          const overlap = [...evtWords].filter(w => actWords.has(w));
          if (overlap.length >= 1) {
            activity = act;
            break;
          }
        }
      }
    }

    if (activity) {
      updates.push({ id: evt.id, activity_id: activity.id });
      matched++;
      if (matched <= 20) {
        console.log(`  ✅ "${(venueName).substring(0, 35)}" → ${activity.name.substring(0, 35)} (${activity.id.substring(0, 30)})`);
      }
    } else {
      unmatched++;
      const key = `${venueName} (${state})`;
      unmatchedVenues[key] = (unmatchedVenues[key] || 0) + 1;
    }
  }

  if (matched > 20) console.log(`    ... and ${matched - 20} more matches`);

  console.log(`\n  Matched: ${matched}`);
  console.log(`  Unmatched: ${unmatched}`);

  if (Object.keys(unmatchedVenues).length > 0) {
    console.log(`\n  Top unmatched venues:`);
    const sorted = Object.entries(unmatchedVenues).sort((a, b) => b[1] - a[1]);
    for (const [venue, count] of sorted.slice(0, 15)) {
      console.log(`    ${count}x ${venue}`);
    }
  }

  // Apply updates
  if (!DRY_RUN && updates.length > 0) {
    console.log(`\n  💾 Updating ${updates.length} events...`);
    let fixed = 0;
    for (let i = 0; i < updates.length; i++) {
      const { error } = await supabase.from('events').update({ activity_id: updates[i].activity_id }).eq('id', updates[i].id);
      if (!error) fixed++;
      if ((i + 1) % 100 === 0) console.log(`    ...${i + 1}/${updates.length}`);
    }
    console.log(`  ✅ Linked ${fixed} farm events to venues`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ COMPLETE — ${matched} events ${DRY_RUN ? 'can be' : ''} linked`);
  if (DRY_RUN) console.log(`  ℹ️  Run with --save to apply`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
