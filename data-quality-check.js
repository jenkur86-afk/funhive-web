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

// Import scraper registry to know which scrapers are currently active
let ACTIVE_SCRAPERS = {};
try {
  const { SCRAPERS } = require('./scrapers/scraper-registry');
  ACTIVE_SCRAPERS = SCRAPERS || {};
} catch (e) {
  // Registry not available — skip active scraper filtering
}

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
    // Compare date-only (ignore time component) so today's events are never flagged as past.
    // Without this, events at midnight UTC on the current day get incorrectly flagged
    // when the check runs later in the day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(d);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay < today;
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
    'id, name, event_date, date, description, venue, state, city, address, geohash, url, scraper_name, start_time, end_time, age_range, category, location, source_url, platform, created_at'
  );

  if (data.length === 0) {
    console.log('  No events found in database.');
    return { total: 0 };
  }

  console.log(`  Total events: ${data.length}`);

  // Non-family detection patterns (subset of what scrapers use)
  const ADULT_PATTERNS = [
    /\badults?\s*only\b/i,
    /\bfor\s+(older\s+)?adults\b/i,
    /\badult\s+(program|workshop|class|craft|event|coloring|book\s*club)\b/i,
    /\bcareer\s+(coach|counseli?ng|fair|services|workshop)\b/i,
    /\bjob\s+(search|seeker|fair|workshop)\b/i,
    /\bresume\s+(writing|workshop|help|review|clinic)\b/i,
    /\bnetworking\s+(event|mixer|session|group)\b/i,
    /\bseniors?\s+only\b/i,
    /\bfor\s+seniors\b/i,
    /\b(50|55|60|65)\s*\+/i,
    /\bwine\s+tasting\b/i,
    /\bbeer\s+tasting\b/i,
    /\bhappy\s+hour\b/i,
    /\bbar\s+crawl\b/i,
    /\bpub\s+crawl\b/i,
    /\bspeed\s+dating\b/i,
    /\bburlesque\b/i,
  ];
  const FAMILY_RESCUE = [
    /\bfamil(y|ies)\b/i, /\bkid/i, /\bchild/i, /\btoddler/i,
    /\ball\s*ages\b/i, /\bstorytime/i, /\bteen/i, /\byouth\b/i,
    /\bexplorer/i, /\bmagic\s+(show|trick|class|camp|workshop|explorers?)\b/i,
  ];
  function isAdultEvent(name, desc) {
    const text = `${name || ''} ${desc || ''}`;
    for (const p of ADULT_PATTERNS) {
      if (p.test(text) && !FAMILY_RESCUE.some(fp => fp.test(text))) return true;
    }
    return false;
  }

  // Cancelled/postponed detection
  const CANCELLED_PATTERN = /\b(cancelled|canceled|postponed|closed permanently|no longer)\b/i;

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
    missingEndTime: 0,
    missingCategory: 0,
    missingAgeRange: 0,
    missingParsedDate: 0,
    pastEvents: 0,
    missingLocation: 0,
    malformedDate: 0,
    adultEvents: 0,
    cancelledEvents: 0,
    junkTitles: 0,
    duplicateEvents: 0,
  };

  const stateCounts = {};
  const scraperCounts = {};
  const categoryCounts = {};
  const ageRangeCounts = {};
  const pastBySource = {};
  const adultEventSamples = [];
  const cancelledSamples = [];
  const junkSamples = [];
  const duplicateCheck = {};

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
    if (!row.end_time) stats.missingEndTime++;
    if (!row.category) stats.missingCategory++;
    if (!row.age_range) stats.missingAgeRange++;
    if (!row.date) stats.missingParsedDate++;

    // Age range distribution
    ageRangeCounts[row.age_range || 'NULL'] = (ageRangeCounts[row.age_range || 'NULL'] || 0) + 1;

    // Past events check
    if (row.date && isDateInPast(row.date)) {
      stats.pastEvents++;
      const src = row.scraper_name || 'unknown';
      pastBySource[src] = (pastBySource[src] || 0) + 1;
    } else if (!row.date && row.event_date && isDateInPast(row.event_date)) {
      stats.pastEvents++;
      const src = row.scraper_name || 'unknown';
      pastBySource[src] = (pastBySource[src] || 0) + 1;
    }

    // Non-family/adult event detection
    if (isAdultEvent(row.name, row.description)) {
      stats.adultEvents++;
      if (adultEventSamples.length < 15) adultEventSamples.push({ name: row.name, scraper: row.scraper_name });
    }

    // Cancelled events
    if (row.name && CANCELLED_PATTERN.test(row.name)) {
      stats.cancelledEvents++;
      if (cancelledSamples.length < 10) cancelledSamples.push(row.name);
    }

    // Junk titles (very short, all caps gibberish, or suspicious patterns)
    if (row.name && (row.name.trim().length < 5 || /^[A-Z\s\d]{3,}$/.test(row.name.trim()) && row.name.trim().length < 8)) {
      stats.junkTitles++;
      if (junkSamples.length < 10) junkSamples.push(row.name);
    }

    // Duplicate detection (same name + same date + same venue)
    const dupeKey = `${(row.name || '').toLowerCase().trim()}|${(row.event_date || '').toLowerCase().trim()}|${(row.venue || '').toLowerCase().trim()}`;
    if (!duplicateCheck[dupeKey]) duplicateCheck[dupeKey] = [];
    duplicateCheck[dupeKey].push(row.id);

    // Distributions
    stateCounts[row.state || 'MISSING'] = (stateCounts[row.state || 'MISSING'] || 0) + 1;
    const scraper = row.scraper_name || 'unknown';
    scraperCounts[scraper] = (scraperCounts[scraper] || 0) + 1;
    categoryCounts[row.category || 'Uncategorized'] = (categoryCounts[row.category || 'Uncategorized'] || 0) + 1;
  }

  // Count duplicates
  const duplicates = Object.entries(duplicateCheck).filter(([, ids]) => ids.length > 1);
  stats.duplicateEvents = duplicates.reduce((sum, [, ids]) => sum + ids.length - 1, 0); // extra copies

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
  console.log(`    Missing end_time:    ${stats.missingEndTime}`);
  console.log(`    Missing category:    ${stats.missingCategory}`);
  console.log(`    Missing age_range:   ${stats.missingAgeRange}`);
  console.log(`    Missing parsed date: ${stats.missingParsedDate} (TIMESTAMPTZ column)`);

  console.log(`\n  Content Quality:`);
  console.log(`    Adult/non-family:    ${stats.adultEvents}`);
  console.log(`    Cancelled/postponed: ${stats.cancelledEvents}`);
  console.log(`    Junk titles:         ${stats.junkTitles}`);
  console.log(`    Duplicate events:    ${stats.duplicateEvents} extra copies (${duplicates.length} groups)`);

  if (stats.adultEvents > 0 && adultEventSamples.length > 0) {
    console.log(`\n    Adult event samples:`);
    for (const s of adultEventSamples.slice(0, 10)) {
      console.log(`      ❌ [${s.scraper || '?'}] "${(s.name || '').substring(0, 55)}"`);
    }
  }

  if (stats.cancelledEvents > 0 && cancelledSamples.length > 0) {
    console.log(`\n    Cancelled event samples:`);
    for (const s of cancelledSamples.slice(0, 5)) {
      console.log(`      🚫 "${s.substring(0, 60)}"`);
    }
  }

  if (stats.pastEvents > 0) {
    console.log(`\n  ⚠️  Past events still in DB: ${stats.pastEvents}`);
    console.log(`    By source (top 10):`);
    for (const [src, c] of Object.entries(pastBySource).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`      ${src.padEnd(40)} ${c}`);
    }
  }

  if (duplicates.length > 0) {
    console.log(`\n  ⚠️  Duplicate event groups: ${duplicates.length}`);
    for (const [key, ids] of duplicates.slice(0, 10)) {
      const [name] = key.split('|');
      console.log(`    "${name.substring(0, 50)}" — ${ids.length} copies`);
    }
    if (duplicates.length > 10) console.log(`    ... and ${duplicates.length - 10} more`);
  }

  console.log(`\n  By age range:`);
  for (const [ar, c] of Object.entries(ageRangeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${ar.padEnd(25)} ${String(c).padStart(5)}  (${pct(c, stats.total)}%)`);
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
  console.log(`  Unique scrapers in logs: ${scraperNames.length}`);

  // Helper: check if a log name maps to an active registry scraper
  function isActiveInRegistry(logName) {
    const registryName = logName.replace(/^Local-/, '');
    return !!(ACTIVE_SCRAPERS[registryName] || ACTIVE_SCRAPERS[logName]);
  }

  function isOneOffImport(name) {
    return /\d{4}$/.test(name) || /^(MarylandKid|DMV-|Pennsylvania-|Waterparks-|Summer-|Gyms-|add-|fix-|backfill-)/.test(name);
  }

  // Build a set of registry keys we've already accounted for, to avoid double-counting
  // when both "Local-Foo" and "Foo" appear in logs for the same registry entry
  const accountedRegistryKeys = new Set();

  // Classify each scraper from logs into exactly one category:
  //   healthy, zeroEvent, or ignored (not in registry / one-off import)
  // A scraper can also independently be "failed" (latest run errored)
  const zeroEventScrapers = [];
  const failedScrapers = [];
  const healthyScrapers = [];

  for (const [name, runs] of Object.entries(scraperMap)) {
    const registryName = name.replace(/^Local-/, '');

    // Skip if not active in registry or is a one-off import
    if (!isActiveInRegistry(name) || isOneOffImport(name)) continue;

    // Skip if we already counted this registry entry via a different log name
    const registryKey = ACTIVE_SCRAPERS[registryName] ? registryName : name;
    if (accountedRegistryKeys.has(registryKey)) continue;
    accountedRegistryKeys.add(registryKey);

    // Check latest run status
    const latest = runs[runs.length - 1];
    if (latest.status === 'error' || latest.status === 'failed') {
      failedScrapers.push({ name, error: latest.error_message });
    }

    // Check for zero events across all runs
    const totalEventsFound = runs.reduce((sum, r) => sum + (r.events_found || 0), 0);
    const totalEventsSaved = runs.reduce((sum, r) => sum + (r.events_saved || 0), 0);

    // Also check if this scraper has events in the DB (cross-reference)
    let hasEventsInDB = false;
    if (eventScraperCounts) {
      hasEventsInDB = (eventScraperCounts[name] > 0) || (eventScraperCounts[registryName] > 0);
    }

    if (totalEventsFound === 0 && totalEventsSaved === 0 && !hasEventsInDB) {
      zeroEventScrapers.push({ name, runs: runs.length });
    } else {
      healthyScrapers.push(name);
    }
  }

  // Check for registry scrapers that have NO log entries at all (never ran)
  const neverRanScrapers = [];
  for (const registryKey of Object.keys(ACTIVE_SCRAPERS)) {
    if (accountedRegistryKeys.has(registryKey)) continue;
    // Check if it appeared under a "Local-" prefix
    if (accountedRegistryKeys.has(`Local-${registryKey}`)) continue;
    neverRanScrapers.push(registryKey);
  }

  // Print event counts by scraper from DB
  if (eventScraperCounts) {
    console.log(`\n  Scrapers by event count in DB:`);
    const sorted = Object.entries(eventScraperCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted.slice(0, 15)) {
      console.log(`    ${name.padEnd(40)} ${String(count).padStart(5)} events`);
    }
  }

  // Count active scrapers in registry for accurate totals
  const activeRegistryCount = Object.keys(ACTIVE_SCRAPERS).length;
  const activeTotal = activeRegistryCount || scraperNames.length; // fallback if registry unavailable

  // Print results
  console.log(`\n  Summary:`);
  console.log(`    Active scrapers (registry): ${activeRegistryCount}`);
  console.log(`    Healthy:              ${healthyScrapers.length}`);
  console.log(`    Zero-event:           ${zeroEventScrapers.length}`);
  console.log(`    Failed (latest run):  ${failedScrapers.length}`);
  if (neverRanScrapers.length > 0) {
    console.log(`    Never ran (no logs):  ${neverRanScrapers.length}`);
  }

  if (zeroEventScrapers.length > 0) {
    console.log(`\n  🔴 Zero-event scrapers (${zeroEventScrapers.length}):`);
    for (const s of zeroEventScrapers.slice(0, 30)) {
      console.log(`    ${s.name.padEnd(40)} ${s.runs} runs`);
    }
    if (zeroEventScrapers.length > 30) console.log(`    ... and ${zeroEventScrapers.length - 30} more`);
  }

  if (failedScrapers.length > 0) {
    console.log(`\n  🔴 Failed scrapers (latest run):`);
    for (const s of failedScrapers.slice(0, 10)) {
      console.log(`    ${s.name}: ${(s.error || 'no error message').substring(0, 80)}`);
    }
  }

  if (neverRanScrapers.length > 0) {
    console.log(`\n  ⚠️  Registered but never ran (${neverRanScrapers.length}):`);
    for (const name of neverRanScrapers.slice(0, 20)) {
      console.log(`    - ${name}`);
    }
    if (neverRanScrapers.length > 20) console.log(`    ... and ${neverRanScrapers.length - 20} more`);
  }

  return { total: activeTotal, healthy: healthyScrapers.length, zeroEvent: zeroEventScrapers.length, failed: failedScrapers.length, neverRan: neverRanScrapers.length };
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
  console.log(`  Unique scrapers in logs: ${scraperNames.length}`);

  function isOneOffImport(name) {
    return /\d{4}$/.test(name) || /^(MarylandKid|DMV-|Pennsylvania-|Waterparks-|Summer-|Gyms-|add-|fix-|backfill-)/.test(name);
  }

  const accountedRegistryKeys = new Set();
  const zeroEventScrapers = [];
  const failedScrapers = [];
  const healthyScrapers = [];

  for (const [name, runs] of Object.entries(scraperMap)) {
    const registryName = name.replace(/^Local-/, '');
    const isActive = !!(ACTIVE_SCRAPERS[registryName] || ACTIVE_SCRAPERS[name]);

    // Skip if not active in registry or is a one-off import
    if (!isActive || isOneOffImport(name)) continue;

    // Skip if we already counted this registry entry via a different log name
    const registryKey = ACTIVE_SCRAPERS[registryName] ? registryName : name;
    if (accountedRegistryKeys.has(registryKey)) continue;
    accountedRegistryKeys.add(registryKey);

    const totalSaved = runs.reduce((sum, r) => sum + (r.activitiesSaved || r.events_saved || 0), 0);
    const totalLocations = runs.reduce((sum, r) => sum + (r.totalLocations || 0), 0);
    const hasFailure = runs.some(r => r.status === 'error' || r.status === 'failed' || (r.activitiesFailed || 0) > 0);

    // Cross-reference with events table
    let hasEventsInDB = false;
    if (eventScraperCounts) {
      hasEventsInDB = (eventScraperCounts[name] > 0) || (eventScraperCounts[registryName] > 0);
    }

    if (totalSaved === 0 && totalLocations === 0 && !hasEventsInDB) {
      zeroEventScrapers.push({ name, runs: runs.length });
    } else {
      healthyScrapers.push(name);
    }
    if (hasFailure) {
      failedScrapers.push({ name });
    }
  }

  const activeRegistryCount = Object.keys(ACTIVE_SCRAPERS).length;
  const activeTotal = activeRegistryCount || scraperNames.length;

  console.log(`\n  Summary:`);
  console.log(`    Active scrapers (registry): ${activeRegistryCount}`);
  console.log(`    Healthy:              ${healthyScrapers.length}`);
  console.log(`    Zero-event scrapers:  ${zeroEventScrapers.length}`);
  console.log(`    Had failures:         ${failedScrapers.length}`);

  if (zeroEventScrapers.length > 0) {
    console.log(`\n  🔴 Zero-event scrapers (${zeroEventScrapers.length}):`);
    for (const s of zeroEventScrapers.slice(0, 20)) console.log(`    - ${s.name} (${s.runs} runs)`);
  }

  return { total: activeTotal, healthy: healthyScrapers.length, zeroEvent: zeroEventScrapers.length, failed: failedScrapers.length };
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
    console.log(`║     Missing age_range:${String(eventsResult.stats?.missingAgeRange || 0).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Adult/non-family: ${String(eventsResult.stats?.adultEvents || 0).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Duplicates:       ${String(eventsResult.stats?.duplicateEvents || 0).padStart(5)}`.padEnd(59) + '║');
  }

  if (scraperResult && scraperResult.total > 0) {
    const healthyCount = scraperResult.healthy || 0;
    const scraperHealthPct = pct(healthyCount, scraperResult.total);
    const badge = healthBadge(scraperHealthPct);
    console.log(`║  ${badge} Scrapers:    ${String(scraperResult.total).padStart(6)} registered, ${scraperHealthPct}% healthy`.padEnd(59) + '║');
    console.log(`║     Healthy:          ${String(healthyCount).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Zero-event:       ${String(scraperResult.zeroEvent || 0).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Failed:           ${String(scraperResult.failed || 0).padStart(5)}`.padEnd(59) + '║');
    if (scraperResult.neverRan) {
      console.log(`║     Never ran:        ${String(scraperResult.neverRan).padStart(5)}`.padEnd(59) + '║');
    }
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
