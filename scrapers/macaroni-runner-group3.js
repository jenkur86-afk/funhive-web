#!/usr/bin/env node

/**
 * MACARONI KID RUNNER - GROUP 3
 * Runs MacaroniKid scrapers for Group 3 states only
 *
 * Schedule: Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
 *
 * Usage:
 *   node macaroni-runner-group3.js                 # Run all Group 3 states
 *   node macaroni-runner-group3.js --dry-run       # Preview without running
 *   node macaroni-runner-group3.js --state NY      # Run specific state
 *
 * Created: April 2026 - MacaroniKid Separation
 */

const fs = require('fs');
const path = require('path');

// Initialize Supabase
const { saveScraperLog } = require('./helpers/supabase-adapter');

// Import scraper registry
const {
  MACARONI_SCRAPERS,
  getMacaroniSiteCounts
} = require('./scraper-registry');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Group number
  GROUP: 3,

  // Delay between states (ms) - MacaroniKid scrapers are intensive
  DELAY_BETWEEN_STATES: 4000,

  // Memory cleanup interval (every N states)
  MEMORY_CLEANUP_INTERVAL: 5,

  // Log file
  LOG_FILE: path.join(__dirname, '..', 'logs', `macaroni-group3-${new Date().toISOString().split('T')[0]}.log`)
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
// SCRAPER EXECUTION
// ============================================================================

async function runScraper(name, config) {
  const startTime = Date.now();
  const stateName = config.state;
  const siteCount = config.sites || 0;

  log(`🚀 Starting ${stateName} (${siteCount} sites)...`);

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
    const durationMinutes = (duration / 60).toFixed(1);

    // Normalize result
    const stats = {
      found: result?.found || result?.total || result?.saved + result?.updated + result?.failed || 0,
      new: result?.new || result?.imported || result?.saved || 0,
      duplicates: result?.duplicates || result?.skipped || result?.updated || 0,
      errors: result?.errors || result?.failed || 0
    };

    log(`✅ ${stateName} completed in ${durationMinutes}m - Found: ${stats.found}, New: ${stats.new}, Duplicates: ${stats.duplicates}`);

    // Log to Supabase
    await logToSupabase(name, 'success', stats, null, parseFloat(duration));

    return { success: true, name, stateName, stats, duration: parseFloat(duration) };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const durationMinutes = (duration / 60).toFixed(1);
    log(`❌ ${stateName} failed after ${durationMinutes}m: ${error.message}`, 'error');

    // Log to Supabase
    await logToSupabase(name, 'failed', {}, error.message, parseFloat(duration));

    return { success: false, name, stateName, error: error.message, duration: parseFloat(duration) };
  }
}

async function logToSupabase(scraperName, status, stats, error, executionTime) {
  try {
    await saveScraperLog({
      scraperName: `MacaroniKid-Group3-${scraperName}`,
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
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    state: null,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--state' && args[i + 1]) {
      options.state = args[++i].toUpperCase();
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  if (options.help) {
    console.log(`
MacaroniKid Runner - Group 3

Usage:
  node macaroni-runner-group3.js                 # Run all Group 3 states
  node macaroni-runner-group3.js --state NY      # Run specific state
  node macaroni-runner-group3.js --dry-run       # Preview without running
  node macaroni-runner-group3.js --help          # Show this help

Schedule: Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30

Group 3 States: ${Object.values(MACARONI_SCRAPERS)
        .filter(c => c.group === CONFIG.GROUP)
        .map(c => `${c.state}(${c.sites}sites)`)
        .join(', ')}
    `);
    process.exit(0);
  }

  const startTime = Date.now();

  log(`\n${'='.repeat(70)}`);
  log(`🍝 FunHive MacaroniKid Runner - Group ${CONFIG.GROUP}`);
  log(`📅 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
  log(`${'='.repeat(70)}\n`);

  // Get Group 3 scrapers
  let scrapers = {};
  for (const [name, config] of Object.entries(MACARONI_SCRAPERS)) {
    if (config.group === CONFIG.GROUP) {
      scrapers[name] = config;
    }
  }

  // Filter by state if specified
  if (options.state) {
    const filtered = {};
    for (const [name, config] of Object.entries(scrapers)) {
      if (config.state === options.state) {
        filtered[name] = config;
      }
    }
    scrapers = filtered;

    if (Object.keys(scrapers).length === 0) {
      log(`❌ No scrapers found for state ${options.state}`, 'error');
      process.exit(1);
    }
  }

  const scraperNames = Object.keys(scrapers);
  const siteCounts = getMacaroniSiteCounts();

  log(`📋 Running ${scraperNames.length} state(s) - ~${siteCounts[CONFIG.GROUP]} total sites`);
  log(`${'='.repeat(70)}\n`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  let stateCount = 0;

  for (let i = 0; i < scraperNames.length; i++) {
    const name = scraperNames[i];
    const config = scrapers[name];

    if (options.dryRun) {
      log(`[DRY RUN] Would run: ${config.state} (${config.sites} sites) from ${config.file}`);
      continue;
    }

    // Run the scraper
    const result = await runScraper(name, config);

    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }

    stateCount++;

    // Add delay between states
    if (i < scraperNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_STATES));
    }

    // Memory cleanup
    if (stateCount % CONFIG.MEMORY_CLEANUP_INTERVAL === 0) {
      log(`🔄 Completed ${stateCount} states, running memory cleanup...`);
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Print summary
  const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  log(`\n${'='.repeat(70)}`);
  log(`📊 SUMMARY - Group ${CONFIG.GROUP}`);
  log(`${'='.repeat(70)}`);
  log(`✅ Success: ${results.success.length}`);
  log(`❌ Failed: ${results.failed.length}`);
  log(`⏱️  Total time: ${totalDuration} minutes`);

  if (results.failed.length > 0) {
    log(`\nFailed states:`);
    for (const failed of results.failed) {
      log(`  - ${failed.stateName}: ${failed.error}`);
    }
  }

  log(`\n${'='.repeat(70)}\n`);

  // Exit with error code if any failed
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
