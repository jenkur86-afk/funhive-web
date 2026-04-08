#!/usr/bin/env node

/**
 * LOCAL SCRAPER RUNNER
 * Runs all cloud function scrapers locally on your Mac
 *
 * Usage:
 *   node local-scraper-runner.js                    # Run today's group automatically
 *   node local-scraper-runner.js --group 1         # Run specific group (1, 2, or 3)
 *   node local-scraper-runner.js --scraper LibCal-MD  # Run specific scraper
 *   node local-scraper-runner.js --osm             # Run OSM scrapers for today
 *   node local-scraper-runner.js --all             # Run all scrapers (takes hours)
 *   node local-scraper-runner.js --resume          # Resume from last checkpoint
 *   node local-scraper-runner.js --dry-run         # Preview what would run
 *
 * Created: January 2026 - Cloud-to-Local Migration
 */

const fs = require('fs');
const path = require('path');

// Initialize Supabase (replaces Firebase Admin)
const { db, supabase, saveScraperLog } = require('./helpers/supabase-adapter');

// Import scraper registry
const {
  SCRAPERS,
  MACARONI_SCRAPERS,
  OSM_SCRAPERS,
  getDayGroup,
  getScrapersForGroup,
  getMacaroniScrapersForGroup,
  getOSMScrapersForDay,
  getGroupCounts,
  getMacaroniGroupCounts,
  getMacaroniSiteCounts
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
  CHECKPOINT_FILE: path.join(__dirname, '..', 'logs', 'scraper-checkpoint.json'),

  // Log file
  LOG_FILE: path.join(__dirname, '..', 'logs', `scraper-run-${new Date().toISOString().split('T')[0]}.log`)
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

// ============================================================================
// CHECKPOINT MANAGEMENT
// ============================================================================

function loadCheckpoint() {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.CHECKPOINT_FILE, 'utf8'));
      return data;
    }
  } catch (err) {
    log(`Warning: Could not load checkpoint: ${err.message}`, 'warn');
  }
  return null;
}

function saveCheckpoint(data) {
  try {
    fs.writeFileSync(CONFIG.CHECKPOINT_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    log(`Warning: Could not save checkpoint: ${err.message}`, 'warn');
  }
}

function clearCheckpoint() {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) {
      fs.unlinkSync(CONFIG.CHECKPOINT_FILE);
    }
  } catch (err) {
    // Ignore
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

      config.exportName = foundExport;
    }

    // Run the scraper
    const result = await scraper[config.exportName]();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Normalize result
    const stats = {
      found: result?.found || result?.total || 0,
      new: result?.new || result?.imported || 0,
      duplicates: result?.duplicates || result?.skipped || 0,
      errors: result?.errors || 0
    };

    log(`✅ ${name} completed in ${duration}s - Found: ${stats.found}, New: ${stats.new}, Duplicates: ${stats.duplicates}`);

    // Log to Firestore
    await logToFirestore(name, 'success', stats, null, parseFloat(duration));

    return { success: true, name, stats, duration: parseFloat(duration) };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`❌ ${name} failed after ${duration}s: ${error.message}`, 'error');

    // Log to Firestore
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
  const scrapers = getScrapersForGroup(group);
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
    const checkpoint = loadCheckpoint();
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
  clearCheckpoint();

  return results;
}

async function runMacaroniGroup(group, options = {}) {
  const scrapers = getMacaroniScrapersForGroup(group);
  const scraperNames = Object.keys(scrapers);

  if (scraperNames.length === 0) {
    log(`ℹ️  No Macaroni Kid scrapers for group ${group}`);
    return { success: [], failed: [], skipped: [] };
  }

  const siteCounts = getMacaroniSiteCounts();

  log(`\n${'='.repeat(60)}`);
  log(`🍝 Running Macaroni Kid Group ${group} (${scraperNames.length} states, ~${siteCounts[group]} sites)`);
  log(`${'='.repeat(60)}\n`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  let scraperCount = 0;

  for (let i = 0; i < scraperNames.length; i++) {
    const name = scraperNames[i];
    const config = scrapers[name];

    if (options.dryRun) {
      log(`[DRY RUN] Would run: ${name} (${config.state}, ${config.sites} sites)`);
      continue;
    }

    // Run the scraper
    const result = await runScraper(name, config);

    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }

    scraperCount++;

    // Add delay between scrapers (Macaroni Kid scrapers need more time)
    if (i < scraperNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_SCRAPERS * 2));
    }

    // Memory cleanup every 5 scrapers (Macaroni Kid is memory-intensive)
    if (scraperCount % CONFIG.BROWSER_RESTART_INTERVAL === 0) {
      log(`🔄 Completed ${scraperCount} Macaroni Kid states, memory cleanup...`);
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  return results;
}

async function runOSMScrapers(options = {}) {
  const dayOfMonth = new Date().getDate();

  if (dayOfMonth > 10) {
    log(`ℹ️  OSM scrapers only run on days 1-10. Today is day ${dayOfMonth}.`);
    return { success: [], failed: [], skipped: [] };
  }

  const scrapers = getOSMScrapersForDay(dayOfMonth);
  const scraperNames = Object.keys(scrapers);

  log(`\n${'='.repeat(60)}`);
  log(`🗺️  Running OSM scrapers for day ${dayOfMonth} (${scraperNames.length} total)`);
  log(`${'='.repeat(60)}\n`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const name of scraperNames) {
    const config = scrapers[name];

    if (options.dryRun) {
      log(`[DRY RUN] Would run: ${name} (${config.states.join(', ')})`);
      continue;
    }

    const result = await runScraper(name, config);

    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }

    // Delay between scrapers
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_SCRAPERS));
  }

  return results;
}

async function runSingleScraper(scraperName, options = {}) {
  const config = SCRAPERS[scraperName] || MACARONI_SCRAPERS[scraperName] || OSM_SCRAPERS[scraperName];

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
    osm: false,
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
    } else if (arg === '--osm') {
      options.osm = true;
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
  node local-scraper-runner.js                     # Run today's group (including Macaroni Kid)
  node local-scraper-runner.js --group 1           # Run specific group (1, 2, or 3)
  node local-scraper-runner.js --scraper LibCal-MD # Run specific scraper
  node local-scraper-runner.js --macaroni          # Run only Macaroni Kid for today's group
  node local-scraper-runner.js --no-macaroni       # Run today's group WITHOUT Macaroni Kid
  node local-scraper-runner.js --osm               # Run OSM scrapers for today
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

  let results;

  try {
    if (options.scraper) {
      // Run single scraper
      results = await runSingleScraper(options.scraper, options);

    } else if (options.osm) {
      // Run OSM scrapers
      results = await runOSMScrapers(options);

    } else if (options.macaroniOnly) {
      // Run only Macaroni Kid scrapers for today's group
      const dayOfMonth = new Date().getDate();
      const todayGroup = options.group || getDayGroup(dayOfMonth);
      log(`📅 Today is day ${dayOfMonth} → Group ${todayGroup} (Macaroni Kid only)`);
      results = await runMacaroniGroup(todayGroup, options);

    } else if (options.all) {
      // Run all groups (regular + Macaroni Kid)
      log('⚠️  Running ALL scrapers (including Macaroni Kid) - this will take many hours!');
      results = { success: [], failed: [], skipped: [] };

      for (let group = 1; group <= 3; group++) {
        // Run regular scrapers
        const groupResults = await runScraperGroup(group, options);
        results.success.push(...groupResults.success);
        results.failed.push(...groupResults.failed);
        results.skipped.push(...groupResults.skipped);

        // Run Macaroni Kid scrapers
        const mkResults = await runMacaroniGroup(group, options);
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

      // Run regular scrapers for group
      const groupResults = await runScraperGroup(options.group, options);
      results.success.push(...groupResults.success);
      results.failed.push(...groupResults.failed);
      results.skipped.push(...groupResults.skipped);

      // Run Macaroni Kid for group (unless --no-macaroni)
      if (!options.noMacaroni) {
        const mkResults = await runMacaroniGroup(options.group, options);
        results.success.push(...mkResults.success);
        results.failed.push(...mkResults.failed);
        results.skipped.push(...mkResults.skipped);
      }

    } else {
      // Run today's group (default) - includes Macaroni Kid
      const dayOfMonth = new Date().getDate();
      const todayGroup = getDayGroup(dayOfMonth);

      log(`📅 Today is day ${dayOfMonth} → Group ${todayGroup}`);
      results = { success: [], failed: [], skipped: [] };

      // Run regular scrapers
      const groupResults = await runScraperGroup(todayGroup, options);
      results.success.push(...groupResults.success);
      results.failed.push(...groupResults.failed);
      results.skipped.push(...groupResults.skipped);

      // Run Macaroni Kid scrapers (unless --no-macaroni)
      if (!options.noMacaroni) {
        const mkResults = await runMacaroniGroup(todayGroup, options);
        results.success.push(...mkResults.success);
        results.failed.push(...mkResults.failed);
        results.skipped.push(...mkResults.skipped);
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
