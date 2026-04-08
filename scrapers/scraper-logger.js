/**
 * STANDARDIZED SCRAPER LOGGING HELPER
 *
 * Provides consistent logging and statistics tracking for all scrapers.
 * Logs to both console (for Cloud Function logs) and Firestore (for reports).
 *
 * Usage:
 *   const { ScraperLogger } = require('./scraper-logger');
 *   const logger = new ScraperLogger('My Scraper Name', 'events'); // or 'venues'
 *
 *   // For multi-site scrapers, track per-site stats:
 *   for (const library of LIBRARIES) {
 *     logger.startSite(library.name, library.url);  // Start tracking this site
 *
 *     // Track events as you process them (updates both site AND aggregate stats)
 *     logger.trackNew();           // New event/venue added
 *     logger.trackDuplicate();     // Already exists in DB
 *     logger.trackPastDate();      // Event date in the past (events only)
 *     logger.trackNoCoords();      // Missing coordinates
 *     logger.trackInvalid();       // Online/virtual or invalid venue
 *     logger.trackError(error);    // Processing error
 *
 *     logger.endSite();  // End tracking this site
 *   }
 *
 *   // At the end, log results to Firestore (includes per-site breakdown)
 *   await logger.finish();
 *
 * The finish() method logs to:
 *   - Console (for Cloud Function logs)
 *   - Firestore scraperLogs collection (for monitoring reports)
 *   - Includes siteStats object with per-site breakdown for multi-site scrapers
 */

const admin = require('firebase-admin');

class ScraperLogger {
  /**
   * @param {string} scraperName - Name of the scraper (e.g., "Macaroni Kid Alabama")
   * @param {string} dataType - Type of data: 'events' or 'venues' (activities)
   * @param {Object} options - Optional configuration
   * @param {string} options.state - State code (e.g., "MD")
   * @param {string} options.county - County name
   * @param {string} options.source - Source identifier (e.g., "macaroni-kid", "osm")
   */
  constructor(scraperName, dataType = 'events', options = {}) {
    this.scraperName = scraperName;
    this.dataType = dataType;
    this.options = options;
    this.startTime = Date.now();

    // Event/venue counts (aggregate totals)
    this.stats = {
      found: 0,           // Total items found/scraped
      new: 0,             // New items added to DB
      duplicates: 0,      // Already existed in DB
      pastDate: 0,        // Events with past dates (events only)
      futureDate: 0,      // Events too far in future (events only)
      noCoords: 0,        // Missing coordinates
      noCity: 0,          // Missing city field
      noState: 0,         // Missing state field
      noName: 0,          // Missing name
      noDate: 0,          // Missing date (events only)
      invalidVenue: 0,    // Invalid/placeholder venue (e.g., "Your Home", "Your neighborhood")
      rejected: 0,        // Rejected for data quality
      errors: 0           // Processing errors
    };

    // Per-site tracking (for multi-site scrapers)
    this.siteStats = {};      // { siteName: { found, new, duplicates, ... } }
    this.currentSite = null;  // Currently processing site
    this.currentSiteStart = null;  // Start time for current site

    // Quality metrics for venues
    this.qualityStats = {
      hasPhone: 0,
      hasWebsite: 0,
      hasHours: 0,
      hasDescription: 0,
      hasCategory: 0,
      hasAddress: 0
    };

    this.errors = [];
  }

  // === Per-Site Tracking Methods ===

  /**
   * Start tracking a specific site (for multi-site scrapers)
   * @param {string} siteName - Name of the site/library
   * @param {string} siteUrl - URL of the site (optional)
   * @param {Object} metadata - Additional metadata (county, state, etc.)
   */
  startSite(siteName, siteUrl = null, metadata = {}) {
    this.currentSite = siteName;
    this.currentSiteStart = Date.now();

    // Initialize site stats if not exists
    if (!this.siteStats[siteName]) {
      this.siteStats[siteName] = {
        found: 0,
        new: 0,
        duplicates: 0,
        pastDate: 0,
        invalid: 0,      // Online/virtual or invalid venue
        noCoords: 0,
        noState: 0,
        badDate: 0,
        errors: 0,
        url: siteUrl,
        county: metadata.county || null,
        state: metadata.state || this.options.state || null,
        executionTime: 0
      };
    }
  }

  /**
   * End tracking current site
   */
  endSite() {
    if (this.currentSite && this.siteStats[this.currentSite]) {
      // Calculate execution time for this site
      const siteTime = (Date.now() - this.currentSiteStart) / 1000;
      this.siteStats[this.currentSite].executionTime = parseFloat(siteTime.toFixed(1));
    }
    this.currentSite = null;
    this.currentSiteStart = null;
  }

  /**
   * Update current site stats (internal helper)
   */
  _updateSiteStats(field, increment = 1) {
    if (this.currentSite && this.siteStats[this.currentSite]) {
      if (this.siteStats[this.currentSite][field] !== undefined) {
        this.siteStats[this.currentSite][field] += increment;
      }
    }
  }

  // === Tracking Methods ===

  /** Track total items found */
  trackFound(count = 1) {
    this.stats.found += count;
    this._updateSiteStats('found', count);
  }

  /** Track new item added to database */
  trackNew() {
    this.stats.new++;
    this._updateSiteStats('new');
  }

  /** Track duplicate item (already in DB) */
  trackDuplicate() {
    this.stats.duplicates++;
    this._updateSiteStats('duplicates');
  }

  /** Track event with past date (skipped) */
  trackPastDate() {
    this.stats.pastDate++;
    this._updateSiteStats('pastDate');
  }

  /** Track event too far in future (skipped) */
  trackFutureDate() {
    this.stats.futureDate++;
  }

  /** Track item missing coordinates */
  trackNoCoords() {
    this.stats.noCoords++;
    this._updateSiteStats('noCoords');
  }

  /** Track item missing city */
  trackNoCity() {
    this.stats.noCity++;
  }

  /** Track item missing state */
  trackNoState() {
    this.stats.noState++;
    this._updateSiteStats('noState');
  }

  /** Track item missing name */
  trackNoName() {
    this.stats.noName++;
  }

  /** Track event missing date */
  trackNoDate() {
    this.stats.noDate++;
    this._updateSiteStats('badDate');
  }

  /** Track invalid/placeholder venue (e.g., "Your Home", "Your neighborhood") or online/virtual event */
  trackInvalidVenue() {
    this.stats.invalidVenue++;
    this._updateSiteStats('invalid');
  }

  /** Alias for trackInvalidVenue - for online/virtual events */
  trackInvalid() {
    this.trackInvalidVenue();
  }

  /** Track rejected item (data quality issues) */
  trackRejected(reason) {
    this.stats.rejected++;
    this._updateSiteStats('invalid');
    if (reason && this.errors.length < 10) {
      this.errors.push(`Rejected: ${reason}`);
    }
  }

  /** Track processing error */
  trackError(error) {
    this.stats.errors++;
    this._updateSiteStats('errors');
    if (this.errors.length < 10) {
      this.errors.push(error.message || String(error));
    }
  }

  // === Quality Tracking (for venues) ===

  /** Track venue quality metrics */
  trackVenueQuality(venue) {
    if (venue.contact?.phone || venue.phone) this.qualityStats.hasPhone++;
    if (venue.contact?.website || venue.website || venue.url) this.qualityStats.hasWebsite++;
    if (venue.hours || venue.operatingHours) this.qualityStats.hasHours++;
    if (venue.description) this.qualityStats.hasDescription++;
    if (venue.category || venue.parentCategory) this.qualityStats.hasCategory++;
    if (venue.address || venue.location?.address) this.qualityStats.hasAddress++;
  }

  // === Console Output ===

  /** Print site-level summary (like Macaroni Kid format) */
  printSiteSummary(siteName) {
    const newCount = this.stats.new;
    const pastCount = this.stats.pastDate;
    const noCoordsCount = this.stats.noCoords;
    console.log(`  ✅ ${newCount} new | ⏭️ ${pastCount} past | ⚠️ ${noCoordsCount} no coords`);
  }

  /** Get formatted summary string */
  getSummaryString() {
    if (this.dataType === 'events') {
      let summary = `✅ ${this.stats.new} new | ⏭️ ${this.stats.pastDate} past | 🔁 ${this.stats.duplicates} dupe | ⚠️ ${this.stats.noCoords} no coords`;
      if (this.stats.invalidVenue > 0) {
        summary += ` | 🏠 ${this.stats.invalidVenue} invalid venue`;
      }
      return summary;
    } else {
      return `✅ ${this.stats.new} new | 🔁 ${this.stats.duplicates} dupe | ⚠️ ${this.stats.noCoords} no coords | 🏙️ ${this.stats.noCity} no city`;
    }
  }

  // === Finish and Log ===

  /**
   * Finish logging and write to Firestore
   * @returns {Object} Summary stats
   */
  async finish() {
    const endTime = Date.now();
    const executionTime = (endTime - this.startTime) / 1000; // seconds

    // Determine success/failure
    const success = this.stats.errors === 0 || this.stats.new > 0;
    const status = success ? 'success' : 'failed';

    // Build log entry
    const logEntry = {
      scraperName: this.scraperName,
      dataType: this.dataType,
      success: success,
      status: status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      executionTime: parseFloat(executionTime.toFixed(1)),

      // Core stats
      found: this.stats.found,
      imported: this.stats.new,  // Alias for backward compatibility
      new: this.stats.new,
      duplicates: this.stats.duplicates,

      // Skip reasons
      skippedPast: this.stats.pastDate,
      skippedFuture: this.stats.futureDate,

      // Data quality issues
      noCoords: this.stats.noCoords,
      noCity: this.stats.noCity,
      noState: this.stats.noState,
      noName: this.stats.noName,
      noDate: this.stats.noDate,
      invalidVenue: this.stats.invalidVenue,
      rejected: this.stats.rejected,

      // Errors
      errors: this.stats.errors,
      errorMessages: this.errors.slice(0, 5), // First 5 errors

      // Metadata
      metadata: {
        state: this.options.state || null,
        county: this.options.county || null,
        source: this.options.source || null
      }
    };

    // Add venue quality stats if applicable
    if (this.dataType === 'venues' && this.stats.new > 0) {
      const total = this.stats.new;
      logEntry.qualityMetrics = {
        hasPhone: this.qualityStats.hasPhone,
        hasPhonePercent: Math.round((this.qualityStats.hasPhone / total) * 100),
        hasWebsite: this.qualityStats.hasWebsite,
        hasWebsitePercent: Math.round((this.qualityStats.hasWebsite / total) * 100),
        hasHours: this.qualityStats.hasHours,
        hasHoursPercent: Math.round((this.qualityStats.hasHours / total) * 100),
        hasDescription: this.qualityStats.hasDescription,
        hasAddress: this.qualityStats.hasAddress
      };
    }

    // Add per-site stats if any sites were tracked
    const siteNames = Object.keys(this.siteStats);
    if (siteNames.length > 0) {
      logEntry.siteStats = this.siteStats;

      // Calculate site summary
      const withEvents = siteNames.filter(name => this.siteStats[name].new > 0).length;
      const withErrors = siteNames.filter(name => this.siteStats[name].errors > 0).length;
      const zeroEvents = siteNames.filter(name =>
        this.siteStats[name].new === 0 && this.siteStats[name].errors === 0
      ).length;

      logEntry.siteSummary = {
        total: siteNames.length,
        withEvents: withEvents,
        zeroEvents: zeroEvents,
        withErrors: withErrors
      };
    }

    // Console output
    console.log('\n' + '─'.repeat(50));
    console.log(`📊 ${this.scraperName} Summary:`);
    console.log(`   ${this.getSummaryString()}`);
    if (this.stats.errors > 0) {
      console.log(`   ❌ ${this.stats.errors} errors`);
    }
    if (siteNames.length > 0) {
      console.log(`   📍 ${siteNames.length} sites tracked`);
    }
    console.log(`   ⏱️  ${executionTime.toFixed(1)}s`);
    console.log('─'.repeat(50));

    // Write to Firestore
    try {
      const db = admin.firestore();
      await db.collection('scraperLogs').add(logEntry);
    } catch (error) {
      console.error('Failed to write scraper log:', error.message);
    }

    return {
      success,
      stats: this.stats,
      executionTime
    };
  }
}

/**
 * Quick helper for simple scrapers that just need to log at the end
 *
 * Usage:
 *   await logScraperResult('My Scraper', {
 *     found: 100,
 *     new: 45,
 *     duplicates: 50,
 *     pastDate: 5,
 *     noCoords: 3
 *   });
 */
async function logScraperResult(scraperName, stats, options = {}) {
  const db = admin.firestore();

  const logEntry = {
    scraperName,
    success: true,
    status: 'success',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    dataType: options.dataType || 'events',

    // Stats
    found: stats.found || 0,
    imported: stats.new || stats.imported || 0,
    new: stats.new || stats.imported || 0,
    duplicates: stats.duplicates || 0,
    skippedPast: stats.pastDate || stats.skippedPast || 0,
    skippedFuture: stats.futureDate || stats.skippedFuture || 0,
    noCoords: stats.noCoords || 0,
    noCity: stats.noCity || 0,
    noState: stats.noState || 0,
    invalidVenue: stats.invalidVenue || 0,
    errors: stats.errors || 0,

    // Metadata
    metadata: {
      state: options.state || null,
      source: options.source || null
    }
  };

  if (stats.executionTime) {
    logEntry.executionTime = stats.executionTime;
  }

  await db.collection('scraperLogs').add(logEntry);

  console.log(`📊 ${scraperName}: ✅ ${logEntry.new} new | ⏭️ ${logEntry.skippedPast} past | ⚠️ ${logEntry.noCoords} no coords`);

  return logEntry;
}

module.exports = {
  ScraperLogger,
  logScraperResult
};
