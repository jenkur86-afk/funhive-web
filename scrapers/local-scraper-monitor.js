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
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

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

  // Get scraper logs
  const logsSnapshot = await db.collection('scraperLogs')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
    .orderBy('timestamp', 'desc')
    .get();

  const logs = [];
  logsSnapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));

  if (logs.length === 0) {
    console.log('⚠️  No scraper logs found for this period\n');
    return { success: 0, failed: 0, scrapers: {} };
  }

  // Aggregate by scraper
  const scraperStats = {};

  for (const log of logs) {
    const name = log.scraperName || 'Unknown';
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

    if (log.status === 'success' || log.success === true) {
      stats.successes++;
      stats.lastSuccess = log.timestamp;
      stats.totalNew += log.new || log.imported || 0;
      stats.totalDuplicates += log.duplicates || log.skipped || 0;
    } else if (log.status === 'failed' || log.success === false) {
      stats.failures++;
      stats.lastError = log.error;
    }

    if (!stats.lastRun || (log.timestamp && log.timestamp > stats.lastRun)) {
      stats.lastRun = log.timestamp;
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

  // Get database stats
  if (!options.alertOnly) {
    console.log('📈 DATABASE STATUS');
    console.log('-'.repeat(40));

    const now = new Date();
    const futureEvents = await db.collection('events')
      .where('eventDate', '>=', admin.firestore.Timestamp.fromDate(now))
      .count()
      .get();

    const totalEvents = await db.collection('events').count().get();
    const totalVenues = await db.collection('activities').count().get();

    console.log(`Total Events:  ${totalEvents.data().count.toLocaleString()}`);
    console.log(`Future Events: ${futureEvents.data().count.toLocaleString()}`);
    console.log(`Total Venues:  ${totalVenues.data().count.toLocaleString()}`);
    console.log('');
  }

  console.log('='.repeat(70) + '\n');

  // Log monitoring result
  await db.collection('scraperLogs').add({
    scraperName: 'Local-ScraperMonitor',
    status: 'success',
    totalRuns: logs.length,
    totalSuccesses,
    totalFailures,
    failedScrapers: failedScrapers.map(f => f.name),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    runDate: new Date().toISOString(),
    source: 'local-monitor'
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
