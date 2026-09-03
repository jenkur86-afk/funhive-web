#!/usr/bin/env node

/**
 * LOCAL SCRAPER RUNNER
 * Runs all cloud function scrapers locally
 *
 * Usage:
 *   node local-scraper-runner.js                    # Run today's group automatically
 *   node local-scraper-runner.js --group 1         # Run specific group (1, 2, or 3)
 *   node local-scraper-runner.js --scraper LibCal-MD  # Run specific scraper
 *   node local-scraper-runner.js --all             # Run all scrapers (takes hours)
 *   node local-scraper-runner.js --resume          # Resume from last checkpoint
 *   node local-scraper-runner.js --dry-run         # Preview what would run
 *
 * Created: January 2026 - Cloud-to-Local Migration
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Defensive firebase-admin shim resolution ───
// The shim lives at scrapers/node_modules/firebase-admin/. Node only finds it
// when the requiring file walks the node_modules tree from scrapers/ up. The
// 2026-05-17 batch saw 8 scrapers fail with "Cannot find module
// 'firebase-admin'" while siblings using the same code succeeded — most
// plausibly a transient resolution race during browser-restart cycles. To
// make resolution robust regardless of the require root, monkey-patch
// Module._resolveFilename so any bare 'firebase-admin' request resolves to
// the shim path. Subsequent require() runs hit the standard cache on that
// path, so this is a one-shot redirect, not a per-call cost.
try {
  const Module = require('module');
  const originalResolve = Module._resolveFilename;
  const shimPath = path.join(__dirname, 'firebase-admin-shim.js');
  if (fs.existsSync(shimPath)) {
    Module._resolveFilename = function (request, parent, ...rest) {
      if (request === 'firebase-admin') {
        return shimPath;
      }
      return originalResolve.call(this, request, parent, ...rest);
    };
  }
} catch (e) {
  console.warn('⚠️  firebase-admin shim redirect failed (non-fatal):', e.message);
}

// Initialize Supabase (replaces Firebase Admin)
const { db, supabase, saveScraperLog } = require('./helpers/supabase-adapter');

// Starvation-aware group selection (see helpers/group-catchup.js)
const { selectGroup, recordGroupCompletion } = require('./helpers/group-catchup');
// Full-group runs serialize on this mutex now that MacaroniKid is its own
// scheduled task — see helpers/run-lock.js and ROTATION-STARVATION-LOG.md.
const { acquireRunLock, waitBudget } = require('./helpers/run-lock');

// Import scraper registry
const {
  SCRAPERS,
  MACARONI_SCRAPERS,
  getDayGroup,
  getScrapersForGroup,
  getMacaroniScrapersForGroup,
  getGroupCounts,
  getMacaroniGroupCounts,
  getMacaroniSiteCounts,
  getActiveStates, getScrapersForGroupByRegion, getMacaroniScrapersForGroupByRegion, getRegionSummary, loadRegionConfig
} = require('./scraper-registry');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // How many scrapers to run before restarting browser (memory management)
  BROWSER_RESTART_INTERVAL: 5,

  // Delay between scrapers (ms) to avoid rate limiting
  DELAY_BETWEEN_SCRAPERS: 2000,

  // Checkpoint file for crash recovery
  CHECKPOINT_FILE: path.join(__dirname, 'logs', 'scraper-checkpoint.json'),

  // Log file
  LOG_FILE: path.join(__dirname, 'logs', `scraper-run-${new Date().toISOString().split('T')[0]}.log`),

  // Summary-only log — captures only run headers, per-scraper completion/failure lines,
  // and the final table. Never contains per-event output. Safe to tail -30 for a quick diagnosis.
  SUMMARY_FILE: path.join(__dirname, 'logs', 'scraper-summary.log')
};

// ============================================================================
// LOGGING
// ============================================================================

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  console.log(logLine);

  // Append to log file
  try {
    fs.appendFileSync(CONFIG.LOG_FILE, logLine + '\n');
  } catch (err) {
    // Ignore file write errors
  }
}

// logSummary/formatSummaryRow/table constants live in helpers/scraper-summary-logger.js
// so macaroni-runner-group{1,2,3}.js (separate child processes, not routed through this
// file's runScraper()) can write rows into the exact same scraper-summary.log table
// instead of only their own logs/macaroni-group{N}-<date>.log file. Previously the live
// line only appended "InvalidDate: N" when N > 0, so a scraper with 0 invalid-date skips
// looked indistinguishable from one that was never measured at all (this is why
// `Get-Content scraper-summary.log -Tail 80` looked like it was missing Dupes/Invalid data
// for most scrapers — the field was silently omitted, not broken). Every row now always
// shows Dupes and Invalid.
const {
  SUMMARY_TABLE_HEADER,
  SUMMARY_TABLE_DIVIDER,
  logSummary,
  formatSummaryRow,
} = require('./helpers/scraper-summary-logger');

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

// Checkpoints are PER-GROUP files as of 2026-08-31 (rotation-starvation Layer 1,
// see ROTATION-STARVATION-LOG.md). The old single scraper-checkpoint.json was a
// shared mutable: with the MacaroniKid split introducing a second runner task,
// two runs of different groups would clobber each other's crash-recovery state.
// A per-group file has exactly one writer by construction. Writes go through
// atomic-json (temp+rename) so a crash mid-write can't leave the checkpoint
// unparseable — which the old code treated as "no checkpoint", silently losing
// the resume point. The legacy single file is still READ as a fallback so a
// --resume across this deploy keeps working; it is deleted on the next clear.
const { readJsonSafe, writeJsonAtomic } = require('./helpers/atomic-json');

function checkpointFileFor(group) {
  return path.join(__dirname, 'logs', `scraper-checkpoint-group${group}.json`);
}

function loadCheckpoint(group) {
  const perGroup = readJsonSafe(checkpointFileFor(group), null);
  if (perGroup && perGroup.group === group) return perGroup;
  // Legacy fallback: pre-split single checkpoint file, honored only if it
  // belongs to this group (same guard the old code applied at the call site).
  const legacy = readJsonSafe(CONFIG.CHECKPOINT_FILE, null);
  if (legacy && legacy.group === group) return legacy;
  return null;
}

function saveCheckpoint(data) {
  try {
    writeJsonAtomic(checkpointFileFor(data.group), data);
  } catch (err) {
    log(`Warning: Could not save checkpoint: ${err.message}`, 'warn');
  }
}

function clearCheckpoint(group) {
  for (const file of [checkpointFileFor(group), CONFIG.CHECKPOINT_FILE]) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
      // Ignore
    }
  }
}

// ============================================================================
// SCRAPER EXECUTION
// ============================================================================

async function runScraper(name, config) {
  const startTime = Date.now();
  log(`🚀 Starting ${name}...`);

  try {
    // Load the scraper module dynamically
    const scraperPath = path.join(__dirname, config.file);

    if (!fs.existsSync(scraperPath)) {
      throw new Error(`Scraper file not found: ${scraperPath}`);
    }

    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(scraperPath)];

    const scraper = require(scraperPath);

    if (!scraper[config.exportName]) {
      // Try common export patterns
      const possibleExports = [
        config.exportName,
        'default',
        'scrape',
        'run',
        Object.keys(scraper).find(k => k.toLowerCase().includes('scrape'))
      ].filter(Boolean);

      let foundExport = null;
      for (const exportName of possibleExports) {
        if (typeof scraper[exportName] === 'function') {
          foundExport = exportName;
          break;
        }
      }

      if (!foundExport) {
        throw new Error(`Export '${config.exportName}' not found in ${config.file}. Available: ${Object.keys(scraper).join(', ')}`);
      }

      // Warn loudly rather than repairing in silence. This fallback quietly rewrote the
      // export name on every run, so 9 registry entries drifted from their files and kept
      // working — the rot was invisible until an unrelated audit compared them. A silent
      // self-heal that hides a stale registry is worse than a noisy one: 'Tockify-Horry'
      // pointed at a function that no longer existed and nobody could tell.
      log(`REGISTRY DRIFT: '${name}' declares export '${possibleExports[0]}' ` +
          `but ${config.file} does not export it; falling back to '${foundExport}'. ` +
          `Fix scraper-registry.js — do not rely on this fallback.`, 'warn');
      config.exportName = foundExport;
    }

    // Run the scraper
    const result = await scraper[config.exportName]();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Normalize result (handle various return shapes from different scrapers)
    // Scrapers return many different field combinations:
    //   - Activity scrapers: { saved, updated, failed }
    //   - MacaroniKid scrapers: { imported, failed }
    //   - Library/event scrapers: { found, new, duplicates, errors }
    //   - Some: { saved, skipped, errors }
    //   - CloudFunction-wrapped: { success: true, result: { ... } }  ← unwrap first
    // The 2026-05-18 incident: MK runs reported `Found: 0, New: <high>` because
    // result.saved + result.updated + result.failed = NaN when only `imported`
    // is set (undefined + undefined + 0 → NaN, falls through to 0).
    // The 2026-05-19 follow-up: Gardens-Nature / Zoos-Aquariums still reported
    // 0/0/0 because their CloudFunction wrappers return { success, result } —
    // stats are nested one level deep. Unwrap before normalizing.
    // When a CloudFunction wrapper returns { success, result: stateDict, found, new, duplicates },
    // the inner stateDict (e.g. { AL: 12, FL: 100 }) has no count fields — use outer object instead.
    // ScraperLogger.finish() returns { success, stats: {...} } — the same nesting
    // trap under a different key. 2026-07-11: Louisville-Library returned this
    // raw shape (forgot to flatten it, unlike every other logger.finish()-based
    // scraper) and every run logged Found: 0, New: 0 despite saving 144 real
    // events. Fixed at the source, but also unwrap `result.stats` here as a
    // safety net for the next scraper that makes the same mistake.
    const hasCountFields = (obj) => obj && ('found' in obj || 'new' in obj || 'saved' in obj || 'imported' in obj);
    const nestedKey = result && result.success === true && typeof result.result === 'object' ? 'result'
      : result && typeof result.stats === 'object' ? 'stats'
      : null;
    const stats_src = nestedKey
      ? (hasCountFields(result[nestedKey]) ? result[nestedKey] : result)
      : result;
    const num = (v) => (typeof v === 'number' && !isNaN(v)) ? v : 0;
    // 2026-07-16: "Activity scrapers" ({ saved, updated, failed }) genuinely
    // distinguish new-venue-created (saved) from already-existed-so-refreshed
    // (updated) via getOrCreateActivity()'s isNew flag — but this normalizer
    // used to fold saved+updated into `new`, so every Activities-*-DMV run
    // showed 100% "new" and a permanent 0 in Duplicates even when most venues
    // were just being re-confirmed. `updated` now flows into dupCount below
    // instead, alongside the true "new" count.
    const newCount = num(stats_src?.new) || num(stats_src?.saved) || num(stats_src?.imported);
    // event-save-helper.js now returns a `duplicates`/`invalidDate` breakdown
    // instead of one combined `skipped` bucket. Scrapers that call it (or pass
    // its result straight through) expose both fields, so prefer them over the
    // old combined `skipped` fallback — otherwise invalid-date rejections get
    // mislabeled as "Duplicates" in this table (2026-07-05 incident: OCLS
    // reported "Duplicates: 4805" when all 4805 were actually invalid-date skips).
    const hasBreakdown = stats_src && ('duplicates' in stats_src || 'invalidDate' in stats_src || 'updated' in stats_src);
    const invalidDateCount = num(stats_src?.invalidDate);
    const dupCount = hasBreakdown ? (num(stats_src?.duplicates) || num(stats_src?.updated)) : num(stats_src?.skipped);
    const errCount = num(stats_src?.errors) || num(stats_src?.failed);
    const stats = {
      found: num(stats_src?.found) || num(stats_src?.total) || (newCount + dupCount + invalidDateCount + errCount) || 0,
      new: newCount,
      duplicates: dupCount,
      invalidDate: invalidDateCount,
      errors: errCount
    };

    const invalidDateFlag = stats.invalidDate > 0 ? `, InvalidDate: ${stats.invalidDate}` : '';
    log(`✅ ${name} completed in ${duration}s - Found: ${stats.found}, New: ${stats.new}, Duplicates: ${stats.duplicates}${invalidDateFlag}`);
    logSummary(formatSummaryRow({ success: true, name, stats, duration: parseFloat(duration) }));

    // Log to database
    await logToFirestore(name, 'success', stats, null, parseFloat(duration));

    return { success: true, name, stats, duration: parseFloat(duration) };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`❌ ${name} failed after ${duration}s: ${error.message}`, 'error');
    logSummary(formatSummaryRow({ success: false, name, error: error.message, duration: parseFloat(duration) }));

    // Log to database
    await logToFirestore(name, 'failed', {}, error.message, parseFloat(duration));

    return { success: false, name, error: error.message, duration: parseFloat(duration) };
  }
}

async function logToFirestore(scraperName, status, stats, error, executionTime) {
  try {
    await saveScraperLog({
      scraperName: `Local-${scraperName}`,
      status: status === 'failed' ? 'error' : 'success',
      eventsFound: stats.found || 0,
      eventsSaved: stats.new || 0,
      eventsSkipped: stats.duplicates || 0,
      errorMessage: error || null,
      durationMs: Math.round((executionTime || 0) * 1000),
    });
  } catch (err) {
    log(`Warning: Could not save scraper log: ${err.message}`, 'warn');
  }
}

// ============================================================================
// GROUP EXECUTION
// ============================================================================

async function runScraperGroup(group, options = {}) {
  const regionFilter = options.regionFilter || undefined;
  const scrapers = regionFilter ? getScrapersForGroupByRegion(group, { regionFilter }) : getScrapersForGroupByRegion(group);
  const scraperNames = Object.keys(scrapers);

  log(`\n${'='.repeat(60)}`);
  log(`📋 Running Group ${group} scrapers (${scraperNames.length} total)`);
  log(`${'='.repeat(60)}\n`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  let scraperCount = 0;
  let startIndex = 0;

  // Check for resume
  if (options.resume) {
    const checkpoint = loadCheckpoint(group);
    if (checkpoint && checkpoint.group === group) {
      startIndex = checkpoint.lastIndex + 1;
      log(`📌 Resuming from checkpoint: starting at index ${startIndex}`);
    }
  }

  for (let i = startIndex; i < scraperNames.length; i++) {
    const name = scraperNames[i];
    const config = scrapers[name];

    if (options.dryRun) {
      log(`[DRY RUN] Would run: ${name} (${config.type}, ${config.state})`);
      continue;
    }

    // Save checkpoint before running
    saveCheckpoint({
      group,
      lastIndex: i - 1,
      currentScraper: name,
      timestamp: new Date().toISOString()
    });

    // Run the scraper
    const result = await runScraper(name, config);

    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }

    scraperCount++;

    // Add delay between scrapers
    if (i < scraperNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_SCRAPERS));
    }

    // Browser restart hint (scrapers manage their own browsers, but this helps)
    if (scraperCount % CONFIG.BROWSER_RESTART_INTERVAL === 0) {
      log(`🔄 Completed ${scraperCount} scrapers, memory cleanup...`);
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Clear checkpoint on successful completion
  clearCheckpoint(group);

  return results;
}

// MACARONIKID IS NO LONGER RUN FROM THE SCHEDULED ROTATION — 2026-08-31.
//
// Until 2026-08-31 this file spawned macaroni-runner-group{N}.js as the TAIL of
// every scheduled group run. That welded a ~15h MacaroniKid pass onto an ~11h
// Group 1 regular pass, pushing the task past its own 24h trigger interval —
// and because FunHive-Scrapers is MultipleInstances=IgnoreNew with
// StartWhenAvailable=False, every overrun silently DELETED the next day's
// rotation (2026-08-26 and 2026-08-29 had no rotation at all; Group 2 was the
// perpetual victim). Full history: ROTATION-STARVATION-LOG.md.
//
// MacaroniKid now runs as its own scheduled task (FunHive-Macaroni -> 
// run-macaroni.bat -> macaroni-daily-runner.js), serialized against this
// rotation via helpers/run-lock.js instead of via accidental single-task-ness.
// If you ever see zero MacaroniKid-* activity in scraper-summary.log for an
// extended period, check THAT task and macaroni-last-run.json — not this file.
//
// delegateMacaroniRun() remains only for the MANUAL paths (--all,
// --macaroni). It spawns macaroni-daily-runner.js, which owns group
// selection, its own completion ledger, and the results-file readback that
// used to live here. --no-lock is passed because the caller already holds the
// runner lock — without it, parent and child would deadlock on the mutex.
async function delegateMacaroniRun(group, options = {}, { holdingLock = false } = {}) {
  const scriptPath = path.join(__dirname, 'macaroni-daily-runner.js');

  if (options.dryRun) {
    log(`[DRY RUN] Would run: macaroni-daily-runner.js --group ${group}`);
    return { success: [], failed: [], skipped: [] };
  }

  const argv = [scriptPath, '--group', String(group)];
  if (holdingLock) argv.push('--no-lock');

  log(`🍝 Delegating MacaroniKid Group ${group} to macaroni-daily-runner.js`);
  const result = spawnSync(process.execPath, argv, { cwd: __dirname, stdio: 'inherit' });

  if (result.error) {
    return { success: [], failed: [{ success: false, name: `MacaroniKid-Group${group}`, error: result.error.message }], skipped: [] };
  }
  // Per-state summary rows are written by the group runner child itself; the
  // exit-code result here only feeds this parent's recap totals.
  return result.status === 0
    ? { success: [{ success: true, name: `MacaroniKid-Group${group}` }], failed: [], skipped: [] }
    : { success: [], failed: [{ success: false, name: `MacaroniKid-Group${group}`, error: `exit code ${result.status}` }], skipped: [] };
}

async function runSingleScraper(scraperName, options = {}) {
  const config = SCRAPERS[scraperName] || MACARONI_SCRAPERS[scraperName];

  if (!config) {
    log(`❌ Scraper '${scraperName}' not found in registry`, 'error');
    log(`Available scrapers: ${Object.keys(SCRAPERS).slice(0, 10).join(', ')}...`);
    log(`Macaroni Kid: ${Object.keys(MACARONI_SCRAPERS).slice(0, 5).join(', ')}...`);
    return { success: [], failed: [], skipped: [] };
  }

  if (options.dryRun) {
    log(`[DRY RUN] Would run: ${scraperName}`);
    log(`  File: ${config.file}`);
    log(`  Export: ${config.exportName}`);
    log(`  Type: ${config.type}`);
    return { success: [], failed: [], skipped: [] };
  }

  const result = await runScraper(scraperName, config);

  return {
    success: result.success ? [result] : [],
    failed: result.success ? [] : [result],
    skipped: []
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    group: null,
    scraper: null,
    region: null,
    regionFilter: null,
    macaroni: false,
    macaroniOnly: false,
    noMacaroni: false,
    all: false,
    resume: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--group' && args[i + 1]) {
      options.group = parseInt(args[++i]);
    } else if (arg === '--scraper' && args[i + 1]) {
      options.scraper = args[++i];
    } else if (arg === '--region' && args[i + 1]) {
      options.region = args[++i].toLowerCase();
    } else if (arg === '--regions') {
      const summary = getRegionSummary(); const as = getActiveStates();
      console.log('FunHive Region Configuration - Active: ' + (as ? as.join(', ') : 'ALL'));
      for (const [k,i] of Object.entries(summary)) console.log('  ' + (i.active?'ACTIVE':'INACTIVE') + ' ' + k.toUpperCase() + ' - ' + i.name + ' (' + i.total + ' scrapers)');
      process.exit(0);
    } else if (arg === '--macaroni') {
      options.macaroniOnly = true;
    } else if (arg === '--no-macaroni') {
      options.noMacaroni = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      const mkCounts = getMacaroniGroupCounts();
      const mkSites = getMacaroniSiteCounts();
      console.log(`
FunHive Local Scraper Runner

Usage:
  node local-scraper-runner.js                     # Run today's group (regular scrapers only)
  node local-scraper-runner.js --group 1           # Run specific group (1, 2, or 3)
  node local-scraper-runner.js --scraper LibCal-MD # Run specific scraper
  node local-scraper-runner.js --macaroni          # Delegate to macaroni-daily-runner.js for today's group
  node local-scraper-runner.js --no-macaroni       # (deprecated no-op: this is now the default; MacaroniKid is the FunHive-Macaroni task)
  node local-scraper-runner.js --all               # Run ALL scrapers (slow!)
  node local-scraper-runner.js --resume            # Resume from last checkpoint
  node local-scraper-runner.js --dry-run           # Preview without running

Groups (each scraper runs every 3rd day):
  Group 1: Days 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
  Group 2: Days 2, 5, 8, 11, 14, 17, 20, 23, 26, 29
  Group 3: Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30

Regular Scrapers:  ${JSON.stringify(getGroupCounts())}
Macaroni Kid:      ${JSON.stringify(mkCounts)} (states)
Macaroni Sites:    ${JSON.stringify(mkSites)} (total sites per group)
      `);
      process.exit(0);
    }
  }

  const startTime = Date.now();

  log(`\n${'='.repeat(60)}`);
  log(`🐝 FunHive Local Scraper Runner`);
  log(`📅 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
  log(`${'='.repeat(60)}\n`);
  logSummary(`${'='.repeat(60)}`);
  logSummary(`🐝 FunHive Scraper Run — ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
  // Print the column header up front too, not just in the recap table at the end —
  // otherwise tailing the log mid-run shows unlabeled columns.
  logSummary(SUMMARY_TABLE_DIVIDER);
  logSummary(SUMMARY_TABLE_HEADER);
  logSummary(SUMMARY_TABLE_DIVIDER);

  let results;
  let releaseLock = null;

  try {
    if (options.scraper) {
      // Run single scraper
      results = await runSingleScraper(options.scraper, options);

    } else if (options.macaroniOnly) {
      // Delegate to macaroni-daily-runner.js, which owns MacaroniKid group
      // selection, completion bookkeeping and the run lock (it acquires the
      // lock itself — this parent must NOT also hold it, or they deadlock).
      const dayOfMonth = new Date().getDate();
      const todayGroup = options.group || getDayGroup(dayOfMonth);
      log(`📅 Today is day ${dayOfMonth} → Group ${todayGroup} (Macaroni Kid only — delegating)`);
      results = await delegateMacaroniRun(todayGroup, options);

    } else if (options.all) {
      // Run all groups (regular + Macaroni Kid)
      log('⚠️  Running ALL scrapers (including Macaroni Kid) - this will take many hours!');
      releaseLock = await acquireRunLock('local-scraper-runner --all', { log: (m) => log(m), maxWaitMs: waitBudget({ interactive: true }), pollMs: 15000 });
      process.on('exit', releaseLock);
      results = { success: [], failed: [], skipped: [] };

      for (let group = 1; group <= 3; group++) {
        // Run regular scrapers
        const groupResults = await runScraperGroup(group, options);
        results.success.push(...groupResults.success);
        results.failed.push(...groupResults.failed);
        results.skipped.push(...groupResults.skipped);
        // Completion = the regular list reached its end (2026-08-31 semantics,
        // see group-catchup.js header). MacaroniKid records its own ledger.
        if (!options.dryRun) recordGroupCompletion(group);

        // Delegate Macaroni Kid; we hold the lock, so the child must skip it.
        const mkResults = await delegateMacaroniRun(group, options, { holdingLock: true });
        results.success.push(...mkResults.success);
        results.failed.push(...mkResults.failed);
        results.skipped.push(...mkResults.skipped);
      }

    } else if (options.group) {
      // Run specific group
      if (options.group < 1 || options.group > 3) {
        log('❌ Invalid group. Must be 1, 2, or 3.', 'error');
        process.exit(1);
      }
      results = { success: [], failed: [], skipped: [] };
      releaseLock = await acquireRunLock(`local-scraper-runner --group ${options.group}`, { log: (m) => log(m), maxWaitMs: waitBudget({ interactive: true }), pollMs: 15000 });
      process.on('exit', releaseLock);

      // Run regular scrapers for group
      const groupResults = await runScraperGroup(options.group, options);
      results.success.push(...groupResults.success);
      results.failed.push(...groupResults.failed);
      results.skipped.push(...groupResults.skipped);

      // An explicit --group run is how a starved group gets caught up by hand,
      // so it MUST count as a completion. Since 2026-08-31 completion means
      // "the REGULAR list reached its end" (see group-catchup.js header) —
      // MacaroniKid is a separate task with its own ledger, so it no longer
      // gates this. A run killed mid-list never reaches this line, which is
      // the whole point of the mechanism.
      if (!options.dryRun) recordGroupCompletion(options.group);

      if (options.noMacaroni) {
        log('ℹ️  --no-macaroni is now the default: MacaroniKid runs as its own task (FunHive-Macaroni). Flag ignored.');
      }

    } else {
      // Run today's group (default). REGULAR SCRAPERS ONLY as of 2026-08-31 —
      // MacaroniKid runs as its own scheduled task (FunHive-Macaroni), so this
      // rotation stays well inside its 24h trigger interval and can never eat
      // the next day's trigger again. See ROTATION-STARVATION-LOG.md.
      //
      // The lock is taken BEFORE the day/group is computed: a wait of a few
      // hours behind an overrunning MacaroniKid run can cross midnight, and
      // the group choice must reflect the day the run actually starts.
      releaseLock = await acquireRunLock('local-scraper-runner rotation', { log: (m) => log(m) });
      process.on('exit', releaseLock);

      const dayOfMonth = new Date().getDate();
      const calendarGroup = getDayGroup(dayOfMonth);

      // A group whose run was dropped is never made up by the calendar alone.
      // Prefer a starved group so a missed rotation self-heals. See
      // helpers/group-catchup.js.
      const selection = selectGroup(calendarGroup);
      const todayGroup = selection.group;

      if (todayGroup !== calendarGroup) {
        log(`📅 Today is day ${dayOfMonth} → calendar Group ${calendarGroup}`);
        log(`🔁 CATCH-UP: ${selection.reason}`);
      } else {
        log(`📅 Today is day ${dayOfMonth} → Group ${todayGroup}`);
      }
      results = { success: [], failed: [], skipped: [] };

      // Run regular scrapers
      const groupResults = await runScraperGroup(todayGroup, options);
      results.success.push(...groupResults.success);
      results.failed.push(...groupResults.failed);
      results.skipped.push(...groupResults.skipped);

      // Only a run that reached the END of the group counts as completed — a
      // killed run never gets here and stays marked starved. Completion means
      // the REGULAR list finished (2026-08-31 semantics, group-catchup.js
      // header); the MacaroniKid task keeps its own ledger.
      if (!options.dryRun) recordGroupCompletion(todayGroup);

      if (options.noMacaroni) {
        log('ℹ️  --no-macaroni is now the default: MacaroniKid runs as its own task (FunHive-Macaroni). Flag ignored.');
      }
    }

    // Print summary
    const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    log(`\n${'='.repeat(60)}`);
    log(`📊 SUMMARY`);
    log(`${'='.repeat(60)}`);
    log(`✅ Success: ${results.success.length}`);
    log(`❌ Failed: ${results.failed.length}`);
    log(`⏭️  Skipped: ${results.skipped.length}`);
    log(`⏱️  Total time: ${totalDuration} minutes`);

    if (results.failed.length > 0) {
      log(`\nFailed scrapers:`);
      for (const failed of results.failed) {
        log(`  - ${failed.name}: ${failed.error}`);
      }
    }

    log(`\n${'='.repeat(60)}\n`);

    // ── Per-scraper table written to both stdout log and summary log ──────────
    // Sorted: zero-event first, then failures, then successes by found desc.
    const allResults = [
      ...results.failed.map(r => ({ ...r, sortKey: 0 })),
      ...results.success.filter(r => (r.stats?.found ?? 0) === 0).map(r => ({ ...r, sortKey: 1 })),
      ...results.success.filter(r => (r.stats?.found ?? 0) > 0).sort((a, b) => (b.stats?.found ?? 0) - (a.stats?.found ?? 0)).map(r => ({ ...r, sortKey: 2 })),
    ];

    log(`\n📋 PER-SCRAPER RESULTS`);
    log(SUMMARY_TABLE_DIVIDER);
    log(SUMMARY_TABLE_HEADER);
    log(SUMMARY_TABLE_DIVIDER);
    logSummary(`\n📋 PER-SCRAPER RESULTS — ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST (${totalDuration} min)`);
    logSummary(SUMMARY_TABLE_DIVIDER);
    logSummary(SUMMARY_TABLE_HEADER);
    logSummary(SUMMARY_TABLE_DIVIDER);

    for (const r of allResults) {
      const row = formatSummaryRow(r);
      log(row);
      logSummary(row);
    }

    log(SUMMARY_TABLE_DIVIDER);
    logSummary(SUMMARY_TABLE_DIVIDER);
    logSummary(`✅ ${results.success.length} succeeded  ❌ ${results.failed.length} failed  ⏭️ ${results.skipped.length} skipped  ⏱️ ${totalDuration} min total\n`);

  } catch (error) {
    log(`💥 Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }

  // Exit cleanly
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
