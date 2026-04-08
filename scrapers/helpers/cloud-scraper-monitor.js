const admin = require('firebase-admin');
const XLSX = require('xlsx');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { runDataQualityValidation } = require('./data-quality-validator');

// Initialize if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Cloud Scraper Monitor
 * Runs daily at 8 AM EST to collect Cloud Function scraper health metrics
 *
 * UPDATED 2025-11-24: Fixed to query Firestore scraperLogs collection
 * instead of Cloud Logging, and use correct metadata.addedDate field.
 *
 * IMPORTANT: This only monitors Cloud Functions (202 scrapers).
 * It does NOT track manual/local scrapers like Macaroni Kid.
 * Manual scrapers run locally and don't write to scraperLogs collection.
 *
 * Data Sources:
 * - scraperLogs collection: Tracks scraper executions (status, stats, errors)
 * - events/activities collections: Counts recent data additions
 *
 * Stores results in Firestore and generates alerts for:
 * - Scraper execution failures
 * - Stale scrapers (not run in 7 days)
 * - Data import issues
 */
exports.scheduledCloudScraperMonitor = async (req, res) => {
  console.log('🔍 Starting Cloud Scraper Monitor (Cloud Functions only)...');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Collect scraper execution metrics from logs
    console.log('📊 Collecting Cloud Function scraper metrics...');
    const scraperMetrics = await collectScraperMetrics(oneDayAgo, sevenDaysAgo);

    // 2. Collect data import metrics from Firestore
    console.log('📊 Collecting data import metrics...');
    const dataMetrics = await collectDataMetrics(oneDayAgo);

    // 3. Collect invalid location data and generate Excel report
    console.log('📍 Collecting invalid location data...');
    const invalidLocationData = await collectInvalidLocations();
    let excelUrl = null;
    if (invalidLocationData.length > 0) {
      excelUrl = await generateInvalidLocationsExcel(invalidLocationData, dateStr);
    }

    // 3.5 Run comprehensive data quality validation
    console.log('✅ Running comprehensive data quality validation...');
    let dataQualityReport = null;
    try {
      dataQualityReport = await runDataQualityValidation({ dmvOnly: true, limit: 10000 });
      console.log(`   Events: ${dataQualityReport.events?.validPercent || 'N/A'}% valid`);
      console.log(`   Venues: ${dataQualityReport.venues?.validPercent || 'N/A'}% valid`);
    } catch (err) {
      console.error('Error running data quality validation:', err.message);
    }

    // 4. Detect issues and generate alerts
    console.log('🚨 Checking for alerts...');
    const alerts = generateAlerts(scraperMetrics, dataMetrics);

    // Add data quality alerts
    if (dataQualityReport?.summary?.alerts) {
      dataQualityReport.summary.alerts.forEach(alert => {
        alerts.push({
          severity: alert.severity,
          category: 'data_quality',
          message: alert.message,
          details: alert.topIssues ? alert.topIssues.join(', ') : ''
        });
      });
    }

    // 5. Compile monitoring report
    const report = {
      date: dateStr,
      timestamp: now.toISOString(),
      scrapers: scraperMetrics,
      data: dataMetrics,
      dataQuality: {
        invalidLocations: invalidLocationData.length,
        excelReportUrl: excelUrl,
        validation: dataQualityReport ? {
          events: {
            total: dataQualityReport.events?.total || 0,
            valid: dataQualityReport.events?.valid || 0,
            validPercent: dataQualityReport.events?.validPercent || '0',
            topIssues: dataQualityReport.events?.issuesByType || {}
          },
          venues: {
            total: dataQualityReport.venues?.total || 0,
            valid: dataQualityReport.venues?.valid || 0,
            validPercent: dataQualityReport.venues?.validPercent || '0',
            topIssues: dataQualityReport.venues?.issuesByType || {}
          }
        } : null
      },
      alerts: alerts,
      status: alerts.length === 0 ? 'healthy' : 'warning',
      note: 'This report only tracks Cloud Functions. Manual scrapers (e.g., Macaroni Kid) are not included.'
    };

    // 5. Store in Firestore
    console.log('💾 Storing monitoring report...');
    await db.collection('cloudScraperMonitoring').doc(dateStr).set(report);

    // 6. Log summary
    logSummary(report);

    // 7. Send response
    if (res) {
      res.status(200).json({
        success: true,
        date: dateStr,
        status: report.status,
        alerts: alerts.length,
        summary: {
          scrapersExecuted: scraperMetrics.executed24h,
          scrapersSuccess: scraperMetrics.successful24h,
          scrapersFailed: scraperMetrics.failed24h,
          eventsAdded: dataMetrics.events.added24h,
          activitiesAdded: dataMetrics.activities.added24h
        },
        note: 'Cloud Functions only. Manual scrapers not tracked.'
      });
    }

    console.log('✅ Cloud Scraper Monitor completed successfully');
    return report;

  } catch (error) {
    console.error('❌ Error in Cloud Scraper Monitor:', error);
    if (res) {
      res.status(500).json({ success: false, error: error.message });
    }
    throw error;
  }
};

/**
 * Collect Cloud Function scraper execution metrics from Firestore scraperLogs
 *
 * NOTE: This queries the scraperLogs collection which tracks all scraper executions.
 * This includes Cloud Functions but NOT manual scrapers (like Macaroni Kid).
 */
async function collectScraperMetrics(oneDayAgo, sevenDaysAgo) {
  const metrics = {
    total: 202, // Total number of deployed Cloud Functions (excludes manual scrapers)
    executed24h: 0,
    successful24h: 0,
    failed24h: 0,
    executed7d: 0,
    failures: [],
    staleScrapers: [],
    zeroEventScrapers: [],
    scraperStats: {} // Detailed stats per scraper
  };

  try {
    // Query scraperLogs for executions in last 24 hours
    const logs24h = await db.collection('scraperLogs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .get();

    const successfulScrapers24h = new Set();
    const failedScrapers = new Map();
    const scraperEventCounts = new Map();

    logs24h.forEach(doc => {
      const data = doc.data();
      const scraperName = data.scraperName;

      if (!scraperName) return;

      // Track event counts per scraper (support both old and new field names)
      const eventsImported = data.new || data.imported || data.stats?.new || data.stats?.imported || data.total || 0;
      if (!scraperEventCounts.has(scraperName)) {
        scraperEventCounts.set(scraperName, { total: 0, runs: 0 });
      }
      const stats = scraperEventCounts.get(scraperName);
      stats.total += eventsImported;
      stats.runs++;

      // Count successful executions
      if (data.status === 'success') {
        successfulScrapers24h.add(scraperName);
      }

      // Track failures
      if (data.status === 'failed') {
        if (!failedScrapers.has(scraperName)) {
          failedScrapers.set(scraperName, {
            scraperName: scraperName,
            errorCount: 0,
            firstError: data.timestamp,
            lastError: data.timestamp,
            errorMessage: data.error || (data.errorMessages && data.errorMessages[0]) || 'Unknown error'
          });
        }

        const failure = failedScrapers.get(scraperName);
        failure.errorCount++;
        if (data.timestamp > failure.lastError) {
          failure.lastError = data.timestamp;
          failure.errorMessage = data.error || (data.errorMessages && data.errorMessages[0]) || failure.errorMessage;
        }
      }
    });

    // Find scrapers that ran but imported 0 events
    scraperEventCounts.forEach((stats, scraperName) => {
      if (stats.total === 0 && successfulScrapers24h.has(scraperName)) {
        metrics.zeroEventScrapers.push(scraperName);
      }
      metrics.scraperStats[scraperName] = stats;
    });

    metrics.executed24h = successfulScrapers24h.size + failedScrapers.size;  // Total runs (success + failed)
    metrics.successful24h = successfulScrapers24h.size;
    metrics.failed24h = failedScrapers.size;
    metrics.failures = Array.from(failedScrapers.values());

    // Query for 7-day window to detect stale scrapers
    const logs7d = await db.collection('scraperLogs')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .where('status', '==', 'success')
      .get();

    const executedScrapers7d = new Set();
    logs7d.forEach(doc => {
      const scraperName = doc.data().scraperName;
      if (scraperName) {
        executedScrapers7d.add(scraperName);
      }
    });

    metrics.executed7d = executedScrapers7d.size;

    // Identify potentially stale scrapers (not executed in 7 days)
    // Note: Normal rotation is 3 days, so 7 days is genuinely concerning
    const potentiallyStale = metrics.total - metrics.executed7d;
    if (potentiallyStale > 50) { // More than ~25% not running is concerning
      metrics.staleScrapers.push({
        count: potentiallyStale,
        message: `${potentiallyStale} scrapers have not executed in 7 days`
      });
    }

  } catch (error) {
    console.error('Error collecting scraper metrics:', error);
    metrics.error = error.message;
  }

  return metrics;
}

/**
 * Collect data import metrics from Firestore
 */
async function collectDataMetrics(oneDayAgo) {
  const metrics = {
    events: {
      total: 0,
      added24h: 0,
      recentSources: {}
    },
    activities: {
      total: 0,
      added24h: 0,
      recentSources: {}
    }
  };

  try {
    // Get total event count
    const eventsSnapshot = await db.collection('events').count().get();
    metrics.events.total = eventsSnapshot.data().count;

    // Get events added in last 24h
    // NOTE: Using metadata.addedDate (what scrapers actually use), not metadata.scrapedAt
    try {
      const recentEventsSnapshot = await db.collection('events')
        .where('metadata.addedDate', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .get();

      metrics.events.added24h = recentEventsSnapshot.size;

      // Count by source
      recentEventsSnapshot.forEach(doc => {
        const data = doc.data();
        const source = data.metadata?.sourceName || data.metadata?.source || 'Unknown';
        metrics.events.recentSources[source] = (metrics.events.recentSources[source] || 0) + 1;
      });
    } catch (error) {
      console.log('Note: Could not query recent events (index may not exist yet):', error.message);
      metrics.events.added24h = -1; // Indicates query not available
    }

    // Get total activity count
    const activitiesSnapshot = await db.collection('activities').count().get();
    metrics.activities.total = activitiesSnapshot.data().count;

    // Get activities added in last 24h
    // NOTE: Using metadata.addedDate (what scrapers actually use), not metadata.scrapedAt
    try {
      const recentActivitiesSnapshot = await db.collection('activities')
        .where('metadata.addedDate', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .get();

      metrics.activities.added24h = recentActivitiesSnapshot.size;

      // Count by source
      recentActivitiesSnapshot.forEach(doc => {
        const data = doc.data();
        const source = data.metadata?.sourceName || data.metadata?.source || 'Unknown';
        metrics.activities.recentSources[source] = (metrics.activities.recentSources[source] || 0) + 1;
      });
    } catch (error) {
      console.log('Note: Could not query recent activities (index may not exist yet):', error.message);
      metrics.activities.added24h = -1; // Indicates query not available
    }

  } catch (error) {
    console.error('Error collecting data metrics:', error);
    metrics.error = error.message;
  }

  return metrics;
}

/**
 * Generate alerts based on collected metrics
 */
function generateAlerts(scraperMetrics, dataMetrics) {
  const alerts = [];

  // Analyze error patterns to find common issues
  const errorPatterns = analyzeErrorPatterns(scraperMetrics.failures);

  // Alert: Common error patterns (grouped by error type)
  if (errorPatterns.length > 0) {
    errorPatterns.forEach(pattern => {
      alerts.push({
        severity: pattern.count >= 3 ? 'error' : 'warning',
        category: 'error_pattern',
        message: `${pattern.count} scraper(s) failing with: "${pattern.errorType}"`,
        details: pattern.scrapers.join(', '),
        recommendation: pattern.recommendation
      });
    });
  }

  // Alert: Individual scraper failures (if no pattern found)
  if (scraperMetrics.failed24h > 0 && errorPatterns.length === 0) {
    alerts.push({
      severity: 'warning',
      category: 'scraper_failures',
      message: `${scraperMetrics.failed24h} Cloud Function scraper(s) failed in last 24 hours`,
      details: scraperMetrics.failures.map(f => `${f.scraperName}: ${f.errorMessage}`).join('; ')
    });
  }

  // Alert: Multiple failures on same scraper
  const multipleFailures = scraperMetrics.failures.filter(f => f.errorCount > 3);
  if (multipleFailures.length > 0) {
    alerts.push({
      severity: 'error',
      category: 'repeated_failures',
      message: `${multipleFailures.length} Cloud Function scraper(s) with 3+ failures`,
      details: multipleFailures.map(f => `${f.scraperName} (${f.errorCount} errors)`).join(', ')
    });
  }

  // Alert: No data imported in 24h (only if query is working)
  if (dataMetrics.events.added24h === 0 && dataMetrics.activities.added24h === 0) {
    alerts.push({
      severity: 'warning',
      category: 'no_data_import',
      message: 'No events or activities imported in last 24 hours',
      details: 'This may be normal if no scrapers were scheduled to run today'
    });
  }

  // Alert: Stale scrapers
  if (scraperMetrics.staleScrapers.length > 0) {
    alerts.push({
      severity: 'warning',
      category: 'stale_scrapers',
      message: scraperMetrics.staleScrapers[0].message,
      details: 'These Cloud Function scrapers may be disabled or have scheduler issues'
    });
  }

  // Alert: Low execution rate (less than 5% of scrapers ran)
  const executionRate = (scraperMetrics.executed24h / scraperMetrics.total) * 100;
  if (scraperMetrics.executed24h > 0 && executionRate < 5) {
    alerts.push({
      severity: 'info',
      category: 'low_execution',
      message: `Only ${scraperMetrics.executed24h} Cloud Function scrapers (${executionRate.toFixed(1)}%) ran today`,
      details: 'This is normal with 3-day rotation schedules'
    });
  }

  // Alert: Zero events from scrapers that ran
  if (scraperMetrics.zeroEventScrapers && scraperMetrics.zeroEventScrapers.length > 5) {
    alerts.push({
      severity: 'warning',
      category: 'zero_events',
      message: `${scraperMetrics.zeroEventScrapers.length} scrapers ran but imported 0 events`,
      details: 'May indicate parsing issues or no new events. Top: ' +
               scraperMetrics.zeroEventScrapers.slice(0, 5).join(', ')
    });
  }

  return alerts;
}

/**
 * Analyze error messages to find common patterns
 * Groups scrapers by similar error types for better diagnosis
 */
function analyzeErrorPatterns(failures) {
  if (!failures || failures.length === 0) return [];

  // Known error patterns and their recommendations
  const knownPatterns = [
    {
      pattern: /skipped is not defined/i,
      type: 'skipped is not defined',
      recommendation: 'FIX AVAILABLE: Run `node scripts/fix-skipped-variable-bug.js` then deploy to Firebase'
    },
    {
      pattern: /scraperFunction is not a function/i,
      type: 'scraperFunction is not a function',
      recommendation: 'Check if scraper function is properly exported in index.js'
    },
    {
      pattern: /Cannot find module/i,
      type: 'Module not found',
      recommendation: 'Check file paths and ensure all dependencies are installed'
    },
    {
      pattern: /PERMISSION_DENIED/i,
      type: 'Permission denied',
      recommendation: 'Grant Cloud Scheduler service account the run.invoker role'
    },
    {
      pattern: /timeout|DEADLINE_EXCEEDED/i,
      type: 'Timeout exceeded',
      recommendation: 'Scraper taking too long. Consider splitting into smaller batches'
    },
    {
      pattern: /Navigation timeout|net::ERR_/i,
      type: 'Network/Navigation error',
      recommendation: 'Target website may be slow or blocking scrapers. Check URL accessibility'
    },
    {
      pattern: /puppeteer|browser|page\./i,
      type: 'Puppeteer/Browser error',
      recommendation: 'Check Puppeteer configuration and ensure puppeteer-core is used for Cloud Functions'
    }
  ];

  // Group failures by error pattern
  const patternGroups = {};

  failures.forEach(failure => {
    const errorMsg = failure.errorMessage || '';
    let matched = false;

    for (const known of knownPatterns) {
      if (known.pattern.test(errorMsg)) {
        if (!patternGroups[known.type]) {
          patternGroups[known.type] = {
            errorType: known.type,
            recommendation: known.recommendation,
            scrapers: [],
            count: 0
          };
        }
        patternGroups[known.type].scrapers.push(failure.scraperName);
        patternGroups[known.type].count++;
        matched = true;
        break;
      }
    }

    // If no known pattern, group by first 50 chars of error
    if (!matched && errorMsg) {
      const shortError = errorMsg.substring(0, 50).replace(/[^\w\s]/g, '').trim();
      if (!patternGroups[shortError]) {
        patternGroups[shortError] = {
          errorType: shortError + '...',
          recommendation: 'Investigate error logs for this scraper',
          scrapers: [],
          count: 0
        };
      }
      patternGroups[shortError].scrapers.push(failure.scraperName);
      patternGroups[shortError].count++;
    }
  });

  // Convert to array and sort by count
  return Object.values(patternGroups)
    .sort((a, b) => b.count - a.count);
}

/**
 * Log monitoring summary to console
 */
function logSummary(report) {
  console.log('\n' + '='.repeat(70));
  console.log('  📊 CLOUD SCRAPER MONITOR REPORT');
  console.log('  Date:', report.date);
  console.log('  (Cloud Functions only - excludes manual scrapers like Macaroni Kid)');
  console.log('='.repeat(70) + '\n');

  console.log('🔧 CLOUD FUNCTION SCRAPER STATUS:');
  console.log(`  • Total deployed: ${report.scrapers.total}`);
  console.log(`  • Executed (24h): ${report.scrapers.executed24h}`);
  console.log(`  • Successful (24h): ${report.scrapers.successful24h}`);
  console.log(`  • Failed (24h): ${report.scrapers.failed24h}`);
  console.log(`  • Executed (7d): ${report.scrapers.executed7d}`);

  // Show zero-event scrapers if any
  if (report.scrapers.zeroEventScrapers && report.scrapers.zeroEventScrapers.length > 0) {
    console.log(`  • Ran but 0 events: ${report.scrapers.zeroEventScrapers.length}`);
  }
  console.log('');

  console.log('📊 DATA IMPORT:');
  console.log(`  • Total events: ${report.data.events.total.toLocaleString()}`);
  console.log(`  • Events added (24h): ${report.data.events.added24h === -1 ? 'N/A' : report.data.events.added24h}`);
  console.log(`  • Total activities: ${report.data.activities.total.toLocaleString()}`);
  console.log(`  • Activities added (24h): ${report.data.activities.added24h === -1 ? 'N/A' : report.data.activities.added24h}\n`);

  if (Object.keys(report.data.events.recentSources).length > 0) {
    console.log('📈 TOP EVENT SOURCES (24h):');
    const topSources = Object.entries(report.data.events.recentSources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topSources.forEach(([source, count]) => {
      console.log(`  • ${source}: ${count} events`);
    });
    console.log('');
  }

  if (report.dataQuality) {
    console.log('📍 DATA QUALITY:');
    console.log(`  • Invalid locations found: ${report.dataQuality.invalidLocations}`);
    if (report.dataQuality.excelReportUrl) {
      console.log(`  • Excel report: ${report.dataQuality.excelReportUrl}`);
    }
    console.log('');
  }

  if (report.alerts.length > 0) {
    console.log('🚨 ALERTS & ISSUES:\n');
    report.alerts.forEach((alert, i) => {
      const icon = alert.severity === 'error' ? '❌' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} [${alert.category.toUpperCase()}] ${alert.message}`);
      if (alert.details) {
        console.log(`     Affected: ${alert.details}`);
      }
      if (alert.recommendation) {
        console.log(`     💡 Fix: ${alert.recommendation}`);
      }
      console.log('');
    });
  } else {
    console.log('✅ NO ALERTS - All Cloud Function scrapers healthy\n');
  }

  // Show failure details if any
  if (report.scrapers.failures && report.scrapers.failures.length > 0) {
    console.log('📋 FAILURE DETAILS:');
    report.scrapers.failures.forEach(f => {
      console.log(`  • ${f.scraperName}`);
      console.log(`    Error: ${f.errorMessage}`);
      console.log(`    Count: ${f.errorCount} time(s)`);
    });
    console.log('');
  }

  console.log('='.repeat(70));
  console.log(`Overall Status: ${report.status === 'healthy' ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Collect events and activities with invalid location values
 * These are values that the app filters out as non-location data
 *
 * DISABLED Jan 2026: Reading 10,000 documents daily was causing ~$1-2/month in Firestore costs.
 * This feature has been disabled to reduce costs. To re-enable for one-time audits,
 * uncomment the scanning code below.
 */
async function collectInvalidLocations() {
  // DISABLED: Skip expensive document scans to reduce Firestore read costs
  console.log('  Invalid location scanning disabled (cost reduction)');
  return [];

  /* DISABLED - Uncomment for one-time audits if needed:
  // Values that are NOT valid locations (same list as in ActivityCard.js)
  const invalidLocationValues = [
    'see website', 'n/a', 'all day', 'all-day', 'various', 'tbd', 'tba',
    'online', 'virtual', 'check website', 'contact for details'
  ];

  const isInvalidLocation = (value) => {
    if (!value) return false;
    const lower = value.toLowerCase().trim();
    if (invalidLocationValues.includes(lower)) return true;
    if (/^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(lower)) return true;
    if (/^all\s*day$/i.test(lower)) return true;
    return false;
  };

  const invalidItems = [];

  try {
    console.log('  Scanning events for invalid locations...');
    const eventsSnapshot = await db.collection('events').limit(5000).get();
    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      const venue = data.venue;
      const locationName = data.location?.name;
      if (isInvalidLocation(venue) || isInvalidLocation(locationName)) {
        invalidItems.push({
          id: doc.id, type: 'event', name: data.name || 'Unknown',
          venue: venue || '', locationName: locationName || '',
          city: data.city || data.location?.city || '',
          invalidValue: isInvalidLocation(venue) ? venue : locationName,
          source: data.metadata?.sourceName || data.metadata?.source || data.source || 'Unknown'
        });
      }
    });

    console.log('  Scanning activities for invalid locations...');
    const activitiesSnapshot = await db.collection('activities').limit(5000).get();
    activitiesSnapshot.forEach(doc => {
      const data = doc.data();
      const venue = data.venue;
      const locationName = data.location?.name;
      if (isInvalidLocation(venue) || isInvalidLocation(locationName)) {
        invalidItems.push({
          id: doc.id, type: 'activity', name: data.name || 'Unknown',
          venue: venue || '', locationName: locationName || '',
          city: data.city || data.location?.city || '',
          invalidValue: isInvalidLocation(venue) ? venue : locationName,
          source: data.metadata?.sourceName || data.metadata?.source || data.source || 'Unknown'
        });
      }
    });

    console.log(`  Found ${invalidItems.length} items with invalid locations`);
  } catch (error) {
    console.error('Error collecting invalid locations:', error);
  }

  return invalidItems;
  */
}

/**
 * Generate Excel spreadsheet of invalid location data and upload to Firebase Storage
 * Bucket: social-spot-bd53f.firebasestorage.app
 */
async function generateInvalidLocationsExcel(invalidItems, dateStr) {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();

    // Prepare data for Excel
    const excelData = invalidItems.map(item => ({
      'Document ID': item.id,
      'Type': item.type,
      'Name': item.name,
      'Invalid Value': item.invalidValue,
      'Venue Field': item.venue,
      'Location Name': item.locationName,
      'City': item.city,
      'Source': item.source
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 },  // Document ID
      { wch: 10 },  // Type
      { wch: 40 },  // Name
      { wch: 20 },  // Invalid Value
      { wch: 30 },  // Venue Field
      { wch: 30 },  // Location Name
      { wch: 20 },  // City
      { wch: 30 }   // Source
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invalid Locations');

    // Add summary sheet
    const summaryBySource = {};
    const summaryByInvalidValue = {};

    invalidItems.forEach(item => {
      summaryBySource[item.source] = (summaryBySource[item.source] || 0) + 1;
      const normalizedValue = item.invalidValue?.toLowerCase().trim() || 'empty';
      summaryByInvalidValue[normalizedValue] = (summaryByInvalidValue[normalizedValue] || 0) + 1;
    });

    const summaryData = [
      { 'Metric': 'Total Invalid Locations', 'Value': invalidItems.length },
      { 'Metric': 'Events', 'Value': invalidItems.filter(i => i.type === 'event').length },
      { 'Metric': 'Activities', 'Value': invalidItems.filter(i => i.type === 'activity').length },
      { 'Metric': '', 'Value': '' },
      { 'Metric': '--- By Source ---', 'Value': '' },
      ...Object.entries(summaryBySource)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => ({ 'Metric': source, 'Value': count })),
      { 'Metric': '', 'Value': '' },
      { 'Metric': '--- By Invalid Value ---', 'Value': '' },
      ...Object.entries(summaryByInvalidValue)
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ 'Metric': value, 'Value': count }))
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Write to temp file
    const tempFilePath = path.join(os.tmpdir(), `invalid-locations-${dateStr}.xlsx`);
    XLSX.writeFile(workbook, tempFilePath);

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const destinationPath = `reports/invalid-locations/invalid-locations-${dateStr}.xlsx`;

    await bucket.upload(tempFilePath, {
      destination: destinationPath,
      metadata: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        metadata: {
          generatedAt: new Date().toISOString(),
          itemCount: invalidItems.length.toString()
        }
      }
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    // Return Firebase Storage path - can be accessed via Firebase Console
    const storageUrl = `gs://${bucket.name}/${destinationPath}`;
    const consoleUrl = `https://console.firebase.google.com/project/social-spot-bd53f/storage/${encodeURIComponent(bucket.name)}/files~2F${encodeURIComponent(destinationPath.replace(/\//g, '~2F'))}`;

    console.log(`📊 Excel report generated: ${storageUrl}`);
    console.log(`📁 View in Firebase Console: ${consoleUrl}`);

    return storageUrl;

  } catch (error) {
    console.error('Error generating Excel report:', error);

    // Fallback: store in Firestore if Storage fails
    try {
      console.log('📊 Falling back to Firestore storage for invalid locations...');
      await db.collection('cloudScraperMonitoring').doc(`${dateStr}-invalid-locations`).set({
        date: dateStr,
        totalCount: invalidItems.length,
        items: invalidItems.slice(0, 500),
        bySource: invalidItems.reduce((acc, item) => {
          acc[item.source] = (acc[item.source] || 0) + 1;
          return acc;
        }, {}),
        byInvalidValue: invalidItems.reduce((acc, item) => {
          const val = item.invalidValue?.toLowerCase().trim() || 'empty';
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {}),
        error: error.message,
        note: 'Excel report failed - data stored in Firestore instead'
      });
      console.log(`📊 Invalid location data stored in Firestore: cloudScraperMonitoring/${dateStr}-invalid-locations`);
      return `firestore://cloudScraperMonitoring/${dateStr}-invalid-locations`;
    } catch (firestoreError) {
      console.error('Error storing in Firestore fallback:', firestoreError);
      return null;
    }
  }
}

// For local testing
if (require.main === module) {
  (async () => {
    try {
      await exports.scheduledCloudScraperMonitor();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
