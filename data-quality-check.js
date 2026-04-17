#!/usr/bin/env node

/**
 * COMPLETE DATA QUALITY CHECK
 *
 * One script to audit everything in the FunHive database:
 *   1. Activities — field completeness, coordinates, state codes, descriptions
 *   2. Events — field completeness, past events, missing dates/times
 *   3. Scraper health — zero-event scrapers, stale scrapers, failure rates
 *   4. Duplicates — same name+city+state appearing multiple times
 *   5. Geographic coverage — state and category distribution
 *   6. Summary with health score
 *
 * Usage:
 *   node data-quality-check.js              # Full check
 *   node data-quality-check.js --activities # Activities only
 *   node data-quality-check.js --events     # Events only
 *   node data-quality-check.js --scrapers   # Scraper health only
 *   node data-quality-check.js --fix        # Auto-fix what we can (dry-run by default)
 *   node data-quality-check.js --fix --save # Actually save fixes
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

// ==========================================
// CONFIG
// ==========================================

const VALID_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

const TARGET_STATES = ['MD','VA','DC','PA','OH','DE','NJ','NY','NC','WV'];

const PLACEHOLDER_VALUES = ['tbd','tba','n/a','none','unknown','null','undefined','test','xxx','---'];

// ==========================================
// HELPERS
// ==========================================

async function fetchAll(table, select = '*') {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) { console.error(`  Error fetching ${table}:`, error.message); break; }
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

function isPlaceholder(val) {
  if (!val || typeof val !== 'string') return false;
  return PLACEHOLDER_VALUES.includes(val.toLowerCase().trim());
}

function isValidUrl(val) {
  if (!val || typeof val !== 'string') return false;
  return /^https?:\/\/.+/.test(val.trim());
}

function isDateInPast(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d < new Date();
  } catch { return false; }
}

function printSection(title, emoji) {
  console.log(`\n${emoji} ${title}`);
  console.log('─'.repeat(60));
}

function pct(n, total) {
  if (total === 0) return '0.0';
  return ((n / total) * 100).toFixed(1);
}

function healthBadge(percent) {
  const p = parseFloat(percent);
  if (p >= 95) return '🟢';
  if (p >= 85) return '🟡';
  if (p >= 70) return '🟠';
  return '🔴';
}

// ==========================================
// 1. ACTIVITIES CHECK
// ==========================================

async function checkActivities() {
  printSection('ACTIVITIES / VENUES', '🏢');

  const data = await fetchAll('activities',
    'id, name, description, category, subcategory, state, city, address, zip_code, geohash, phone, url, age_range, is_free, scraper_name, location, price_range, hours, source'
  );

  if (data.length === 0) {
    console.log('  No activities found in database.');
    return { total: 0, issues: [] };
  }

  console.log(`  Total activities: ${data.length}`);

  const issues = [];
  const stats = {
    total: data.length,
    missingName: 0,
    missingState: 0,
    invalidState: 0,
    missingCity: 0,
    missingAddress: 0,
    missingGeohash: 0,
    missingDescription: 0,
    shortDescription: 0,
    missingCategory: 0,
    missingSubcategory: 0,
    missingPhone: 0,
    missingWebsite: 0,
    missingAgeRange: 0,
    placeholderValues: 0,
    missingLocation: 0,
  };

  // State & category distribution
  const stateCounts = {};
  const categoryCounts = {};
  const scraperCounts = {};
  const duplicateCheck = {};

  for (const row of data) {
    // --- Critical fields ---
    if (!row.name || row.name.trim().length === 0) {
      stats.missingName++;
      issues.push({ id: row.id, field: 'name', severity: 'critical', msg: 'Missing name' });
    }
    if (!row.state) {
      stats.missingState++;
      issues.push({ id: row.id, name: row.name, field: 'state', severity: 'critical', msg: 'Missing state' });
    } else if (!VALID_STATES.includes(row.state.toUpperCase())) {
      stats.invalidState++;
      issues.push({ id: row.id, name: row.name, field: 'state', severity: 'critical', msg: `Invalid state: "${row.state}"` });
    }
    if (!row.city || isPlaceholder(row.city)) {
      stats.missingCity++;
      issues.push({ id: row.id, name: row.name, field: 'city', severity: 'critical', msg: 'Missing city' });
    }
    if (!row.geohash) {
      stats.missingGeohash++;
      issues.push({ id: row.id, name: row.name, field: 'geohash', severity: 'critical', msg: 'Missing geohash (breaks map queries)' });
    }

    // --- Important fields ---
    if (!row.address || isPlaceholder(row.address)) stats.missingAddress++;
    if (!row.description || row.description.trim().length === 0) {
      stats.missingDescription++;
    } else if (row.description.trim().length < 30) {
      stats.shortDescription++;
    }
    if (!row.category) stats.missingCategory++;
    if (!row.subcategory) stats.missingSubcategory++;

    // --- Nice to have ---
    if (!row.phone || row.phone.trim().length === 0) stats.missingPhone++;
    if (!row.url || !isValidUrl(row.url)) stats.missingWebsite++;
    if (!row.age_range) stats.missingAgeRange++;

    // Check for placeholder values in key fields
    if (isPlaceholder(row.name) || isPlaceholder(row.city) || isPlaceholder(row.address)) {
      stats.placeholderValues++;
    }

    // Check location (PostGIS point or null)
    if (!row.location) stats.missingLocation++;

    // Distributions
    stateCounts[row.state || 'MISSING'] = (stateCounts[row.state || 'MISSING'] || 0) + 1;
    const cat = row.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    const scraper = row.scraper_name || 'unknown';
    scraperCounts[scraper] = (scraperCounts[scraper] || 0) + 1;

    // Duplicate detection
    const dupeKey = `${(row.name || '').toLowerCase().trim()}|${(row.city || '').toLowerCase().trim()}|${(row.state || '').toLowerCase().trim()}`;
    if (!duplicateCheck[dupeKey]) duplicateCheck[dupeKey] = [];
    duplicateCheck[dupeKey].push(row.id);
  }

  // Find actual duplicates
  const duplicates = Object.entries(duplicateCheck).filter(([, ids]) => ids.length > 1);

  // --- Print results ---
  const criticalCount = stats.missingName + stats.missingState + stats.invalidState + stats.missingCity + stats.missingGeohash;
  const completenessScore = pct(stats.total - criticalCount, stats.total);

  console.log(`\n  ${healthBadge(completenessScore)} Data Completeness: ${completenessScore}% (${stats.total - criticalCount}/${stats.total} pass critical checks)`);

  console.log(`\n  Critical (breaks app display):`);
  console.log(`    Missing name:       ${stats.missingName}`);
  console.log(`    Missing state:      ${stats.missingState}`);
  console.log(`    Invalid state:      ${stats.invalidState}`);
  console.log(`    Missing city:       ${stats.missingCity}`);
  console.log(`    Missing geohash:    ${stats.missingGeohash}`);
  console.log(`    Missing location:   ${stats.missingLocation}`);

  console.log(`\n  Important (hurts user experience):`);
  console.log(`    Missing address:      ${stats.missingAddress}`);
  console.log(`    Missing description:  ${stats.missingDescription}`);
  console.log(`    Short description:    ${stats.shortDescription} (<30 chars)`);
  console.log(`    Missing category:     ${stats.missingCategory}`);
  console.log(`    Missing subcategory:  ${stats.missingSubcategory}`);

  console.log(`\n  Nice to have:`);
  console.log(`    Missing phone:      ${stats.missingPhone}`);
  console.log(`    Missing website:    ${stats.missingWebsite}`);
  console.log(`    Missing age range:  ${stats.missingAgeRange}`);
  console.log(`    Placeholder values: ${stats.placeholderValues}`);

  if (duplicates.length > 0) {
    console.log(`\n  ⚠️  Duplicates found: ${duplicates.length} groups`);
    for (const [key, ids] of duplicates.slice(0, 10)) {
      const [name, city, state] = key.split('|');
      console.log(`    "${name}" in ${city}, ${state.toUpperCase()} — ${ids.length} copies`);
    }
    if (duplicates.length > 10) console.log(`    ... and ${duplicates.length - 10} more`);
  } else {
    console.log(`\n  ✅ No duplicate activities found`);
  }

  console.log(`\n  By state:`);
  for (const [s, c] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    const bar = '█'.repeat(Math.min(Math.round(c / 5), 40));
    console.log(`    ${(s || '??').padEnd(3)} ${String(c).padStart(5)}  ${bar}`);
  }

  console.log(`\n  By category:`);
  for (const [s, c] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${s.padEnd(25)} ${String(c).padStart(5)}`);
  }

  console.log(`\n  By scraper/source:`);
  for (const [s, c] of Object.entries(scraperCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${s.padEnd(40)} ${String(c).padStart(5)}`);
  }

  // Print sample critical issues
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    console.log(`\n  Sample critical issues (first 10):`);
    for (const issue of criticalIssues.slice(0, 10)) {
      console.log(`    ${issue.name || issue.id}: ${issue.msg}`);
    }
  }

  return { total: stats.total, criticalCount, completenessScore, duplicates: duplicates.length, stats, stateCounts, categoryCounts };
}

// ==========================================
// 2. EVENTS CHECK
// ==========================================

async function checkEvents() {
  printSection('EVENTS', '📅');

  const data = await fetchAll('events',
    'id, name, event_date, date, description, venue, state, city, address, geohash, url, scraper_name, start_time, end_time, age_range, category, location, source_url, platform'
  );

  if (data.length === 0) {
    console.log('  No events found in database.');
    return { total: 0 };
  }

  console.log(`  Total events: ${data.length}`);

  const stats = {
    total: data.length,
    missingName: 0,
    missingEventDate: 0,
    missingState: 0,
    invalidState: 0,
    missingGeohash: 0,
    missingDescription: 0,
    missingVenue: 0,
    missingCity: 0,
    missingUrl: 0,
    missingStartTime: 0,
    missingCategory: 0,
    pastEvents: 0,
    missingLocation: 0,
    malformedDate: 0,
  };

  const stateCounts = {};
  const scraperCounts = {};
  const categoryCounts = {};
  const pastBySource = {};

  for (const row of data) {
    // Critical
    if (!row.name || row.name.trim().length === 0) stats.missingName++;
    if (!row.event_date || row.event_date.trim().length === 0) {
      stats.missingEventDate++;
    } else {
      // Check for HTML garbage in dates
      if (row.event_date.includes('<') || row.event_date.includes('\n')) stats.malformedDate++;
    }
    if (!row.state) stats.missingState++;
    else if (!VALID_STATES.includes(row.state.toUpperCase())) stats.invalidState++;
    if (!row.geohash) stats.missingGeohash++;
    if (!row.location) stats.missingLocation++;

    // Important
    if (!row.description) stats.missingDescription++;
    if (!row.venue) stats.missingVenue++;
    if (!row.city) stats.missingCity++;
    if (!row.url && !row.source_url) stats.missingUrl++;
    if (!row.start_time) stats.missingStartTime++;
    if (!row.category) stats.missingCategory++;

    // Past events check
    if (row.event_date && isDateInPast(row.event_date)) {
      stats.pastEvents++;
      const src = row.scraper_name || 'unknown';
      pastBySource[src] = (pastBySource[src] || 0) + 1;
    }

    // Distributions
    stateCounts[row.state || 'MISSING'] = (stateCounts[row.state || 'MISSING'] || 0) + 1;
    const scraper = row.scraper_name || 'unknown';
    scraperCounts[scraper] = (scraperCounts[scraper] || 0) + 1;
    categoryCounts[row.category || 'Uncategorized'] = (categoryCounts[row.category || 'Uncategorized'] || 0) + 1;
  }

  const criticalCount = stats.missingName + stats.missingEventDate + stats.missingState + stats.invalidState + stats.missingGeohash;
  const completenessScore = pct(stats.total - criticalCount, stats.total);

  console.log(`\n  ${healthBadge(completenessScore)} Data Completeness: ${completenessScore}% (${stats.total - criticalCount}/${stats.total} pass critical checks)`);

  console.log(`\n  Critical:`);
  console.log(`    Missing name:        ${stats.missingName}`);
  console.log(`    Missing event_date:  ${stats.missingEventDate}`);
  console.log(`    Malformed dates:     ${stats.malformedDate}`);
  console.log(`    Missing state:       ${stats.missingState}`);
  console.log(`    Invalid state:       ${stats.invalidState}`);
  console.log(`    Missing geohash:     ${stats.missingGeohash}`);
  console.log(`    Missing location:    ${stats.missingLocation}`);

  console.log(`\n  Important:`);
  console.log(`    Missing description: ${stats.missingDescription}`);
  console.log(`    Missing venue:       ${stats.missingVenue}`);
  console.log(`    Missing city:        ${stats.missingCity}`);
  console.log(`    Missing URL:         ${stats.missingUrl}`);
  console.log(`    Missing start_time:  ${stats.missingStartTime}`);
  console.log(`    Missing category:    ${stats.missingCategory}`);

  if (stats.pastEvents > 0) {
    console.log(`\n  ⚠️  Past events still in DB: ${stats.pastEvents}`);
    console.log(`    By source (top 10):`);
    for (const [src, c] of Object.entries(pastBySource).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`      ${src.padEnd(40)} ${c}`);
    }
  }

  console.log(`\n  By state:`);
  for (const [s, c] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    const bar = '█'.repeat(Math.min(Math.round(c / 10), 40));
    console.log(`    ${(s || '??').padEnd(3)} ${String(c).padStart(5)}  ${bar}`);
  }

  console.log(`\n  By category:`);
  for (const [s, c] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${s.padEnd(30)} ${String(c).padStart(5)}`);
  }

  return { total: stats.total, criticalCount, completenessScore, pastEvents: stats.pastEvents, stats, stateCounts, scraperCounts };
}

// ==========================================
// 3. SCRAPER HEALTH CHECK
// ==========================================

async function checkScrapers(eventScraperCounts) {
  printSection('SCRAPER HEALTH', '🤖');

  // Get scraper logs
  const logs = await fetchAll('scraper_logs',
    'id, scraper_name, status, events_found, events_saved, events_skipped, error_message, duration_ms'
  );

  if (logs.length === 0) {
    // Try alternate table name (some scripts use Firestore compat layer)
    const logs2 = await fetchAll('scraper_logs',
      'id, scraper_name, status, events_found, events_saved'
    );
    if (logs2.length === 0) {
      console.log('  No scraper logs found.');
      return {};
    }
    // Use the alternate format
    return checkScraperLogsAlt(logs2, eventScraperCounts);
  }

  console.log(`  Total scraper log entries: ${logs.length}`);

  // Group by scraper
  const scraperMap = {};
  for (const log of logs) {
    const name = log.scraper_name || 'unknown';
    if (!scraperMap[name]) scraperMap[name] = [];
    scraperMap[name].push(log);
  }

  const scraperNames = Object.keys(scraperMap);
  console.log(`  Unique scrapers: ${scraperNames.length}`);

  // Analyze each scraper
  const zeroEventScrapers = [];
  const failedScrapers = [];
  const healthyScrapers = [];

  for (const [name, runs] of Object.entries(scraperMap)) {
    // Latest run is last entry (no reliable timestamp column)
    const latest = runs[runs.length - 1];

    // Check latest run status
    if (latest.status === 'error' || latest.status === 'failed') {
      failedScrapers.push({ name, error: latest.error_message });
    }

    // Check for zero events
    const totalEventsFound = runs.reduce((sum, r) => sum + (r.events_found || 0), 0);
    const totalEventsSaved = runs.reduce((sum, r) => sum + (r.events_saved || 0), 0);
    if (totalEventsFound === 0 && totalEventsSaved === 0) {
      zeroEventScrapers.push({ name, runs: runs.length });
    } else {
      healthyScrapers.push(name);
    }
  }

  // Also check event counts by scraper from the events table
  if (eventScraperCounts) {
    console.log(`\n  Scrapers by event count in DB:`);
    const zeroInDB = [];
    const sorted = Object.entries(eventScraperCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted.slice(0, 15)) {
      console.log(`    ${name.padEnd(40)} ${String(count).padStart(5)} events`);
    }

    // Find scrapers that exist in logs but have 0 events in the events table
    // Note: local runner logs as "Local-{name}" but scrapers save events under
    // different names (library names, platform names, etc.). We only flag scrapers
    // that ALSO had 0 events_saved in their logs — those are truly broken.
    for (const scraperName of scraperNames) {
      if (!eventScraperCounts[scraperName] || eventScraperCounts[scraperName] === 0) {
        // Also check without "Local-" prefix
        const withoutLocal = scraperName.replace(/^Local-/, '');
        if (!eventScraperCounts[withoutLocal] || eventScraperCounts[withoutLocal] === 0) {
          // Check if the scraper actually saved 0 events in its logs too
          const runs = scraperMap[scraperName] || [];
          const totalSaved = runs.reduce((sum, r) => sum + (r.events_saved || 0), 0);
          if (totalSaved === 0) {
            zeroInDB.push(scraperName);
          }
        }
      }
    }

    if (zeroInDB.length > 0) {
      console.log(`\n  ⚠️  Scrapers with 0 events saved (truly broken) (${zeroInDB.length}):`);
      for (const name of zeroInDB.slice(0, 30)) {
        const runs = scraperMap[name] || [];
        const totalRuns = runs.length;
        console.log(`    - ${name} (${totalRuns} runs)`);
      }
      if (zeroInDB.length > 30) console.log(`    ... and ${zeroInDB.length - 30} more`);
    }
  }

  // Print results
  console.log(`\n  Summary:`);
  console.log(`    Healthy scrapers:     ${healthyScrapers.length}`);
  console.log(`    Zero-event scrapers:  ${zeroEventScrapers.length}`);
  console.log(`    Failed (latest run):  ${failedScrapers.length}`);

  if (zeroEventScrapers.length > 0) {
    console.log(`\n  🔴 Zero-event scrapers (${zeroEventScrapers.length}):`);
    for (const s of zeroEventScrapers.slice(0, 20)) {
      console.log(`    ${s.name.padEnd(40)} ${s.runs} runs`);
    }
    if (zeroEventScrapers.length > 20) console.log(`    ... and ${zeroEventScrapers.length - 20} more`);
  }

  if (failedScrapers.length > 0) {
    console.log(`\n  🔴 Failed scrapers (latest run):`);
    for (const s of failedScrapers.slice(0, 10)) {
      console.log(`    ${s.name}: ${(s.error || 'no error message').substring(0, 80)}`);
    }
  }

  return { total: scraperNames.length, healthy: healthyScrapers.length, zeroEvent: zeroEventScrapers.length, failed: failedScrapers.length };
}

// Alternate scraper log format (scraperLogs collection via Firestore compat layer)
async function checkScraperLogsAlt(logs, eventScraperCounts) {
  console.log(`  Total scraper log entries: ${logs.length}`);

  const scraperMap = {};
  for (const log of logs) {
    const name = log.scraperName || log.scraper_name || 'unknown';
    if (!scraperMap[name]) scraperMap[name] = [];
    scraperMap[name].push(log);
  }

  const scraperNames = Object.keys(scraperMap);
  console.log(`  Unique scrapers: ${scraperNames.length}`);

  const zeroEventScrapers = [];
  const failedScrapers = [];

  for (const [name, runs] of Object.entries(scraperMap)) {
    const totalSaved = runs.reduce((sum, r) => sum + (r.activitiesSaved || r.events_saved || 0), 0);
    const totalLocations = runs.reduce((sum, r) => sum + (r.totalLocations || 0), 0);
    const hasFailure = runs.some(r => r.status === 'error' || r.status === 'failed' || (r.activitiesFailed || 0) > 0);

    if (totalSaved === 0 && totalLocations === 0) {
      zeroEventScrapers.push({ name, runs: runs.length });
    }
    if (hasFailure) {
      failedScrapers.push({ name });
    }
  }

  // Check which scrapers have events in the DB
  if (eventScraperCounts) {
    const zeroInDB = [];
    for (const scraperName of scraperNames) {
      if (!eventScraperCounts[scraperName] || eventScraperCounts[scraperName] === 0) {
        zeroInDB.push(scraperName);
      }
    }
    if (zeroInDB.length > 0) {
      console.log(`\n  ⚠️  Scrapers with 0 items in events/activities tables (${zeroInDB.length}):`);
      for (const name of zeroInDB.slice(0, 20)) console.log(`    - ${name}`);
      if (zeroInDB.length > 20) console.log(`    ... and ${zeroInDB.length - 20} more`);
    }
  }

  console.log(`\n  Summary:`);
  console.log(`    Total scrapers:      ${scraperNames.length}`);
  console.log(`    Zero-event scrapers: ${zeroEventScrapers.length}`);
  console.log(`    Had failures:        ${failedScrapers.length}`);

  if (zeroEventScrapers.length > 0) {
    console.log(`\n  🔴 Zero-event scrapers:`);
    for (const s of zeroEventScrapers.slice(0, 20)) console.log(`    - ${s.name} (${s.runs} runs)`);
  }

  return { total: scraperNames.length, zeroEvent: zeroEventScrapers.length, failed: failedScrapers.length };
}

// ==========================================
// 4. OVERALL SUMMARY
// ==========================================

function printOverallSummary(activitiesResult, eventsResult, scraperResult) {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  FUNHIVE DATA QUALITY REPORT — SUMMARY'.padEnd(58) + '║');
  console.log('╠' + '═'.repeat(58) + '╣');

  if (activitiesResult && activitiesResult.total > 0) {
    const badge = healthBadge(activitiesResult.completenessScore);
    console.log(`║  ${badge} Activities:  ${String(activitiesResult.total).padStart(6)} total, ${activitiesResult.completenessScore}% complete`.padEnd(59) + '║');
    console.log(`║     Critical issues: ${String(activitiesResult.criticalCount).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Duplicates:      ${String(activitiesResult.duplicates).padStart(5)}`.padEnd(59) + '║');
  }

  if (eventsResult && eventsResult.total > 0) {
    const badge = healthBadge(eventsResult.completenessScore);
    console.log(`║  ${badge} Events:      ${String(eventsResult.total).padStart(6)} total, ${eventsResult.completenessScore}% complete`.padEnd(59) + '║');
    console.log(`║     Critical issues: ${String(eventsResult.criticalCount).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Past events:     ${String(eventsResult.pastEvents).padStart(5)}`.padEnd(59) + '║');
  }

  if (scraperResult && scraperResult.total > 0) {
    const scraperHealthPct = pct(scraperResult.healthy || (scraperResult.total - (scraperResult.zeroEvent || 0)), scraperResult.total);
    const badge = healthBadge(scraperHealthPct);
    console.log(`║  ${badge} Scrapers:    ${String(scraperResult.total).padStart(6)} total, ${scraperHealthPct}% healthy`.padEnd(59) + '║');
    console.log(`║     Zero-event:      ${String(scraperResult.zeroEvent || 0).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Failed:          ${String(scraperResult.failed || 0).padStart(5)}`.padEnd(59) + '║');
  }

  // Overall health
  let overallHealth = '🟢 HEALTHY';
  const scores = [];
  if (activitiesResult?.completenessScore) scores.push(parseFloat(activitiesResult.completenessScore));
  if (eventsResult?.completenessScore) scores.push(parseFloat(eventsResult.completenessScore));
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 70) overallHealth = '🔴 NEEDS ATTENTION';
    else if (avg < 85) overallHealth = '🟠 FAIR';
    else if (avg < 95) overallHealth = '🟡 GOOD';
  }

  console.log('╠' + '═'.repeat(58) + '╣');
  console.log(`║  Overall: ${overallHealth}`.padEnd(59) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  const totalItems = (activitiesResult?.total || 0) + (eventsResult?.total || 0);
  console.log(`\n  📊 Total items in database: ${totalItems}`);
  console.log(`  🕐 Report generated: ${new Date().toISOString()}\n`);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  const activitiesOnly = args.includes('--activities');
  const eventsOnly = args.includes('--events');
  const scrapersOnly = args.includes('--scrapers');
  const runAll = !activitiesOnly && !eventsOnly && !scrapersOnly;

  console.log('\n' + '═'.repeat(60));
  console.log('  FUNHIVE COMPLETE DATA QUALITY CHECK');
  console.log('═'.repeat(60));
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Scope: ${runAll ? 'Full (activities + events + scrapers)' : args.join(', ')}`);

  let activitiesResult = null;
  let eventsResult = null;
  let scraperResult = null;

  if (runAll || activitiesOnly) {
    activitiesResult = await checkActivities();
  }

  if (runAll || eventsOnly) {
    eventsResult = await checkEvents();
  }

  // Build a combined scraper count from both tables for the scraper check
  let combinedScraperCounts = {};
  if (eventsResult?.scraperCounts) {
    combinedScraperCounts = { ...eventsResult.scraperCounts };
  }

  if (runAll || scrapersOnly) {
    scraperResult = await checkScrapers(combinedScraperCounts);
  }

  // Overall summary
  printOverallSummary(activitiesResult, eventsResult, scraperResult);
}

main().then(() => process.exit(0)).catch(e => { console.error('❌ Fatal error:', e); process.exit(1); });
