#!/usr/bin/env node

/**
 * Diagnose zero-event scrapers
 *
 * Categories:
 * 1. WORKING — scraper logs show events_saved > 0 (events just stored under different name)
 * 2. TRULY BROKEN — scraper logs show events_saved = 0 across ALL runs
 * 3. NEEDS MORE RUNS — only 1 run so far, saved=0 (might work on retry)
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

async function fetchAll(table, select) {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

async function diagnose() {
  console.log('\n🔍 DIAGNOSING ZERO-EVENT SCRAPERS\n');

  // 1. Get all scraper_names from scraper_logs
  console.log('Fetching scraper_logs...');
  const logs = await fetchAll('scraper_logs', 'scraper_name, events_found, events_saved');

  const logNames = {};
  for (const log of logs) {
    const name = log.scraper_name || 'unknown';
    if (!logNames[name]) logNames[name] = { runs: 0, totalFound: 0, totalSaved: 0 };
    logNames[name].runs++;
    logNames[name].totalFound += log.events_found || 0;
    logNames[name].totalSaved += log.events_saved || 0;
  }

  // 2. Get event counts by scraper_name from events table
  console.log('Fetching event scraper_names...');
  const events = await fetchAll('events', 'scraper_name');

  const eventCounts = {};
  for (const evt of events) {
    const name = evt.scraper_name || 'unknown';
    eventCounts[name] = (eventCounts[name] || 0) + 1;
  }

  // 3. Categorize each logged scraper
  const working = [];       // logs show saved > 0 (events exist under different name)
  const updatingOnly = [];  // logs show found > 0 but saved = 0 (activity scrapers updating existing records)
  const trulyBroken = [];   // logs show saved = 0 AND found = 0 across 2+ runs
  const needsMoreRuns = []; // logs show saved = 0 but only 1 run
  const hasEventsInDB = []; // direct match found in events table

  const localPrefixed = Object.keys(logNames).filter(n => n.startsWith('Local-'));

  for (const logName of localPrefixed.sort()) {
    const stats = logNames[logName];
    const withoutLocal = logName.replace('Local-', '');

    // Check if events exist under this exact log name or the non-prefixed version
    const dbDirect = eventCounts[logName] || 0;
    const dbAlt = eventCounts[withoutLocal] || 0;
    // WordPress pattern: Local-WordPress-VA → wordpress-VA
    const wpMatch = withoutLocal.match(/WordPress-([A-Z0-9]+)/);
    const wpName = wpMatch ? `wordpress-${wpMatch[1]}` : null;
    const dbWP = wpName ? (eventCounts[wpName] || 0) : 0;

    if (dbDirect > 0 || dbAlt > 0 || dbWP > 0) {
      const matchedName = dbDirect > 0 ? logName : dbAlt > 0 ? withoutLocal : wpName;
      const matchedCount = dbDirect || dbAlt || dbWP;
      hasEventsInDB.push({ logName, matchedName, count: matchedCount, stats });
    } else if (stats.totalSaved > 0) {
      // Logs say events were saved, but we can't find them under any obvious name
      // → events are stored under library names (e.g., "DC Public Library")
      working.push({ logName, stats });
    } else if (stats.totalFound > 0 && stats.totalSaved === 0) {
      // Found items but saved=0 — likely activity scrapers that only update existing records
      // (runner counts result.saved as "new" but not "updated")
      updatingOnly.push({ logName, stats });
    } else if (stats.runs >= 2) {
      trulyBroken.push({ logName, stats });
    } else {
      needsMoreRuns.push({ logName, stats });
    }
  }

  // Print results
  console.log('\n' + '═'.repeat(70));

  console.log(`\n✅ MATCHED IN DB (${hasEventsInDB.length} scrapers — log name maps to event name):`);
  for (const h of hasEventsInDB) {
    console.log(`    ${h.logName.padEnd(40)} → ${h.matchedName} (${h.count} events)`);
  }

  console.log(`\n✅ WORKING (${working.length} scrapers — logs show saved > 0, events under library names):`);
  for (const w of working) {
    console.log(`    ${w.logName.padEnd(40)} ${w.stats.runs} runs, saved=${w.stats.totalSaved}`);
  }

  console.log(`\n🔄 UPDATING ONLY (${updatingOnly.length} scrapers — found items, saved=0 because all are updates):`);
  for (const u of updatingOnly) {
    console.log(`    ${u.logName.padEnd(40)} ${u.stats.runs} runs, found=${u.stats.totalFound}, saved=0 (updating existing)`);
  }

  console.log(`\n❌ TRULY BROKEN (${trulyBroken.length} scrapers — 0 found AND 0 saved across 2+ runs):`);
  for (const b of trulyBroken) {
    console.log(`    ${b.logName.padEnd(40)} ${b.stats.runs} runs, found=0, saved=0`);
  }

  console.log(`\n⚠️  NEEDS MORE RUNS (${needsMoreRuns.length} scrapers — only 1 run, saved=0):`);
  for (const n of needsMoreRuns) {
    const foundStr = n.stats.totalFound > 0 ? `found=${n.stats.totalFound}` : 'found=0';
    console.log(`    ${n.logName.padEnd(40)} ${n.stats.runs} run, ${foundStr}, saved=0`);
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log(`SUMMARY: ${localPrefixed.length} scrapers in logs`);
  console.log(`  ✅ Matched in DB:    ${hasEventsInDB.length}`);
  console.log(`  ✅ Working (logs):   ${working.length}`);
  console.log(`  🔄 Updating only:   ${updatingOnly.length}`);
  console.log(`  ❌ Truly broken:     ${trulyBroken.length}`);
  console.log(`  ⚠️  Needs more runs: ${needsMoreRuns.length}`);
  console.log('');
}

diagnose().catch(console.error);
