#!/usr/bin/env node

/**
 * LOCAL SCRAPER MONITOR
 * Monitors scraper health and generates daily reports
 * Runs after scrapers complete to check for issues
 *
 * Usage:
 *   node local-scraper-monitor.js           # Generate report
 *   node local-scraper-monitor.js --email   # Generate and email report
 *   node local-scraper-monitor.js --alert   # Only report failures
 *   node local-scraper-monitor.js --days 7  # Report for last 7 days
 *
 * Created: January 2026 - Cloud-to-Local Migration
 * Rewritten 2026-07-06: originally read Firestore (admin.firestore(),
 * db.collection('scraperLogs'/'events'/'activities')), which was
 * decommissioned when the project migrated to Supabase — this crashed with
 * "Cannot find module 'firebase-admin'" since that package was removed and
 * never reinstalled, and even with the package present there is no
 * firebase-service-account.json anymore. Scrapers now write run telemetry to
 * Supabase's `scraper_logs` table via saveScraperLog() in
 * helpers/supabase-adapter.js (see database/schema.sql) — this script reads
 * from there instead. Output format and CLI flags are unchanged.
 */

const { supabase, saveScraperLog } = require('./helpers/supabase-adapter');

// ============================================================================
// REPORT GENERATION
// ============================================================================

async function generateScraperReport(options = {}) {
  const days = options.days || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  console.log('\n' + '='.repeat(70));
  console.log('🔍 FunHive Local Scraper Monitor');
  console.log(`📅 Report for ${days === 1 ? 'today' : `last ${days} days`}`);
  console.log(`🕐 Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
  console.log('='.repeat(70) + '\n');

  // Get scraper logs — selective columns only (bandwidth convention)
  const { data: logs, error: logsError } = await supabase
    .from('scraper_logs')
    .select('scraper_name, status, events_found, events_saved, events_skipped, error_message, run_at')
    .gte('run_at', startDate.toISOString())
    .order('run_at', { ascending: false });

  if (logsError) {
    console.error('❌ Failed to fetch scraper_logs:', logsError.message);
    return { success: 0, failed: 0, scrapers: {} };
  }

  if (!logs || logs.length === 0) {
    console.log('⚠️  No scraper logs found for this period\n');
    return { success: 0, failed: 0, scrapers: {} };
  }

  // Aggregate by scraper
  const scraperStats = {};

  for (const log of logs) {
    const name = log.scraper_name || 'Unknown';
    if (!scraperStats[name]) {
      scraperStats[name] = {
        runs: 0,
        successes: 0,
        failures: 0,
        totalNew: 0,
        totalDuplicates: 0,
        lastRun: null,
        lastError: null,
        lastSuccess: null
      };
    }

    const stats = scraperStats[name];
    stats.runs++;

    if (log.status === 'success') {
      stats.successes++;
      stats.lastSuccess = log.run_at;
      stats.totalNew += log.events_saved || 0;
      stats.totalDuplicates += log.events_skipped || 0;
    } else if (log.status === 'error' || log.status === 'partial') {
      stats.failures++;
      stats.lastError = log.error_message;
    }

    if (!stats.lastRun || (log.run_at && log.run_at > stats.lastRun)) {
      stats.lastRun = log.run_at;
    }
  }

  // Calculate totals
  let totalSuccesses = 0;
  let totalFailures = 0;
  let totalNew = 0;
  const failedScrapers = [];
  const zeroEventScrapers = [];

  for (const [name, stats] of Object.entries(scraperStats)) {
    totalSuccesses += stats.successes;
    totalFailures += stats.failures;
    totalNew += stats.totalNew;

    if (stats.failures > 0 && stats.successes === 0) {
      failedScrapers.push({ name, stats });
    }

    if (stats.successes > 0 && stats.totalNew === 0) {
      zeroEventScrapers.push({ name, stats });
    }
  }

  // Print dashboard
  console.log('📊 DASHBOARD');
  console.log('-'.repeat(40));
  console.log(`Total Runs: ${logs.length}`);
  console.log(`Successes:  ${totalSuccesses} (${((totalSuccesses / logs.length) * 100).toFixed(1)}%)`);
  console.log(`Failures:   ${totalFailures} (${((totalFailures / logs.length) * 100).toFixed(1)}%)`);
  console.log(`New Events: ${totalNew}`);
  console.log(`Scrapers:   ${Object.keys(scraperStats).length}\n`);

  // Failed scrapers section
  if (failedScrapers.length > 0) {
    console.log('❌ FAILED SCRAPERS (0% success rate)');
    console.log('-'.repeat(40));
    for (const { name, stats } of failedScrapers) {
      console.log(`  ${name}`);
      console.log(`    Failures: ${stats.failures}`);
      if (stats.lastError) {
        console.log(`    Error: ${stats.lastError.substring(0, 80)}...`);
      }
    }
    console.log('');
  }

  // Zero event scrapers
  if (zeroEventScrapers.length > 0 && !options.alertOnly) {
    console.log('⚠️  ZERO EVENT SCRAPERS (ran but found nothing)');
    console.log('-'.repeat(40));
    for (const { name, stats } of zeroEventScrapers) {
      console.log(`  ${name} - ${stats.successes} successful runs, 0 new events`);
    }
    console.log('');
  }

  // Top performers
  if (!options.alertOnly) {
    const topScrapers = Object.entries(scraperStats)
      .filter(([_, s]) => s.totalNew > 0)
      .sort((a, b) => b[1].totalNew - a[1].totalNew)
      .slice(0, 10);

    if (topScrapers.length > 0) {
      console.log('🌟 TOP PERFORMERS (by new events)');
      console.log('-'.repeat(40));
      for (const [name, stats] of topScrapers) {
        console.log(`  ${stats.totalNew.toString().padStart(5)} new | ${name}`);
      }
      console.log('');
    }
  }

  // Get database stats — count-only queries (no row downloads)
  if (!options.alertOnly) {
    console.log('📈 DATABASE STATUS');
    console.log('-'.repeat(40));

    const now = new Date().toISOString();

    const { count: futureEventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', now);

    const { count: totalEventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    const { count: totalVenuesCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    console.log(`Total Events:  ${(totalEventsCount || 0).toLocaleString()}`);
    console.log(`Future Events: ${(futureEventsCount || 0).toLocaleString()}`);
    console.log(`Total Venues:  ${(totalVenuesCount || 0).toLocaleString()}`);
    console.log('');
  }

  console.log('='.repeat(70) + '\n');

  // Log monitoring result
  await saveScraperLog({
    scraperName: 'Local-ScraperMonitor',
    status: 'success',
    eventsFound: logs.length,
    eventsSaved: totalSuccesses,
    eventsSkipped: totalFailures,
  });

  return {
    success: totalSuccesses,
    failed: totalFailures,
    newEvents: totalNew,
    scrapers: scraperStats,
    failedScrapers,
    zeroEventScrapers
  };
}

// ============================================================================
// EMAIL NOTIFICATION (Optional)
// ============================================================================

async function sendEmailReport(report, options = {}) {
  // Check if nodemailer is available
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (err) {
    console.log('⚠️  nodemailer not installed, skipping email');
    return;
  }

  // Get email config from environment
  const emailUser = process.env.SMTP_USER;
  const emailPass = process.env.SMTP_PASS;
  const emailTo = process.env.ALERT_EMAIL || 'jenniferkurtz@gmail.com';

  if (!emailUser || !emailPass) {
    console.log('⚠️  Email credentials not configured (SMTP_USER, SMTP_PASS)');
    return;
  }

  const hasFailures = report.failedScrapers.length > 0;

  // Only send if there are failures or --email flag is explicit
  if (!hasFailures && options.alertOnly) {
    console.log('✅ No failures to report');
    return;
  }

  const subject = hasFailures
    ? `🚨 FunHive Scraper Alert: ${report.failedScrapers.length} scrapers failed`
    : `✅ FunHive Scraper Report: ${report.success} successful, ${report.newEvents} new events`;

  const htmlBody = `
    <h2>FunHive Scraper Report</h2>
    <p><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>

    <h3>Summary</h3>
    <ul>
      <li>Successful runs: ${report.success}</li>
      <li>Failed runs: ${report.failed}</li>
      <li>New events: ${report.newEvents}</li>
    </ul>

    ${hasFailures ? `
    <h3>❌ Failed Scrapers</h3>
    <ul>
      ${report.failedScrapers.map(f => `<li>${f.name}</li>`).join('\n')}
    </ul>
    ` : ''}

    <hr>
    <p style="color: #666; font-size: 12px;">
      This is an automated report from FunHive Local Scraper Monitor
    </p>
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: emailUser, pass: emailPass }
    });

    await transporter.sendMail({
      from: `FunHive Scrapers <${emailUser}>`,
      to: emailTo,
      subject,
      html: htmlBody
    });

    console.log(`📧 Report emailed to ${emailTo}`);
  } catch (err) {
    console.log(`⚠️  Failed to send email: ${err.message}`);
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  const options = {
    days: 1,
    email: false,
    alertOnly: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--days' && args[i + 1]) {
      options.days = parseInt(args[++i]);
    } else if (arg === '--email') {
      options.email = true;
    } else if (arg === '--alert') {
      options.alertOnly = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
FunHive Local Scraper Monitor

Usage:
  node local-scraper-monitor.js           # Generate report for today
  node local-scraper-monitor.js --days 7  # Report for last 7 days
  node local-scraper-monitor.js --email   # Send report via email
  node local-scraper-monitor.js --alert   # Only report if failures

Environment variables for email:
  SMTP_USER      - Gmail address
  SMTP_PASS      - Gmail app password
  ALERT_EMAIL    - Recipient (default: jenniferkurtz@gmail.com)
      `);
      process.exit(0);
    }
  }

  try {
    const report = await generateScraperReport(options);

    if (options.email) {
      await sendEmailReport(report, options);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateScraperReport };
