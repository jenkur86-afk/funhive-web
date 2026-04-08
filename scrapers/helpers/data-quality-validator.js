/**
 * data-quality-validator.js
 *
 * Comprehensive data validation for events and venues.
 * Checks all required fields for items to display correctly in the app.
 *
 * Integrates with cloud-scraper-monitor.js to run during scheduled checks.
 *
 * Created: 2025-12-09
 *
 * Required fields for EVENTS to show in app:
 * - name (string, non-empty)
 * - eventDate (valid date string)
 * - location.latitude (number, valid range)
 * - location.longitude (number, valid range)
 * - geohash (string, for geographic queries)
 * - state (string, 2 letters for filtering)
 *
 * Required fields for VENUES/ACTIVITIES to show in app:
 * - name (string, non-empty)
 * - location.coordinates.latitude (number, valid range)
 * - location.coordinates.longitude (number, valid range)
 * - geohash (string, for geographic queries)
 * - state (string, 2 letters for filtering)
 * - city (string, non-empty)
 * - address (string, non-empty)
 */

const admin = require('firebase-admin');

// Initialize if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Validation rules for events
const EVENT_VALIDATION_RULES = {
  required: {
    name: { type: 'string', minLength: 1, displayName: 'Event Name' },
    eventDate: { type: 'date', displayName: 'Event Date' },
    state: { type: 'state', displayName: 'State' },
  },
  location: {
    // Events use location.latitude, location.longitude
    latField: 'location.latitude',
    lngField: 'location.longitude',
    geohashField: 'geohash',
  },
  recommended: {
    venue: { type: 'string', displayName: 'Venue Name' },
    city: { type: 'string', displayName: 'City' },
    address: { type: 'string', displayName: 'Address' },
    description: { type: 'string', displayName: 'Description' },
    url: { type: 'url', displayName: 'Event URL' },
    startTime: { type: 'time', displayName: 'Start Time' },
  }
};

// Validation rules for venues/activities
const VENUE_VALIDATION_RULES = {
  required: {
    name: { type: 'string', minLength: 1, displayName: 'Venue Name' },
    state: { type: 'state', displayName: 'State' },
    city: { type: 'string', minLength: 1, displayName: 'City' },
    address: { type: 'string', minLength: 1, displayName: 'Address' },
  },
  location: {
    // Venues use location.coordinates.latitude, location.coordinates.longitude
    latField: 'location.coordinates.latitude',
    lngField: 'location.coordinates.longitude',
    geohashField: 'geohash',
  },
  recommended: {
    zipCode: { type: 'string', displayName: 'ZIP Code' },
    phone: { type: 'string', displayName: 'Phone' },
    website: { type: 'url', displayName: 'Website' },
    description: { type: 'string', displayName: 'Description' },
  }
};

// US State codes
const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
  'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// DMV States for focused reporting
const DMV_STATES = ['MD', 'VA', 'DC'];

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Validate a single field value
 */
function validateField(value, rule) {
  if (value === undefined || value === null) {
    return { valid: false, error: 'missing' };
  }

  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: 'not a string' };
      }
      if (rule.minLength && value.trim().length < rule.minLength) {
        return { valid: false, error: 'empty or too short' };
      }
      // Check for placeholder values
      const lowerVal = value.toLowerCase();
      if (['tbd', 'tba', 'n/a', 'none', 'unknown', 'null', 'undefined'].includes(lowerVal)) {
        return { valid: false, error: 'placeholder value' };
      }
      return { valid: true };

    case 'date':
      if (!value) return { valid: false, error: 'missing' };
      // Check for common date formats
      const dateStr = String(value);
      // ISO format, Month Day Year, etc.
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/) ||
          dateStr.match(/^[A-Z][a-z]+ \d{1,2}, \d{4}/) ||
          dateStr.match(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}/)) {
        return { valid: true };
      }
      // Check for malformed dates (HTML artifacts)
      if (dateStr.includes('\n') || dateStr.includes('<')) {
        return { valid: false, error: 'malformed (HTML artifacts)' };
      }
      return { valid: true }; // Accept other formats loosely

    case 'state':
      if (typeof value !== 'string') {
        return { valid: false, error: 'not a string' };
      }
      const stateUpper = value.toUpperCase().trim();
      if (!VALID_STATES.includes(stateUpper)) {
        return { valid: false, error: `invalid state code: ${value}` };
      }
      return { valid: true };

    case 'url':
      if (typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'missing' };
      }
      if (!value.match(/^https?:\/\//)) {
        return { valid: false, error: 'invalid URL format' };
      }
      return { valid: true };

    case 'time':
      if (typeof value !== 'string') {
        return { valid: false, error: 'not a string' };
      }
      const timeStr = value.trim();
      if (!timeStr) {
        return { valid: false, error: 'missing' };
      }
      // Check for calendar picker UI garbage (Select a Date, Time zone, etc.)
      if (/select|choose|pick|time zone|timezone|standard time|daylight time/i.test(timeStr)) {
        return { valid: false, error: 'UI picker garbage text' };
      }
      // Check for excessively long time strings (likely concatenated or garbage)
      if (timeStr.length > 30) {
        return { valid: false, error: 'time string too long (likely garbage)' };
      }
      // Check for concatenated times without proper spacing (e.g., "1:00 pm4:15 pm")
      if (/\d{1,2}:\d{2}\s*(am|pm)\d{1,2}:\d{2}/i.test(timeStr)) {
        return { valid: false, error: 'concatenated times (missing separator)' };
      }
      // Check for multiple am/pm occurrences which indicates concatenation
      const ampmMatches = timeStr.match(/(am|pm)/gi);
      if (ampmMatches && ampmMatches.length > 2) {
        return { valid: false, error: 'multiple time values concatenated' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Validate coordinates
 */
function validateCoordinates(data, locationRules) {
  const lat = getNestedValue(data, locationRules.latField);
  const lng = getNestedValue(data, locationRules.lngField);
  const geohash = getNestedValue(data, locationRules.geohashField);

  const issues = [];

  // Check latitude
  if (lat === undefined || lat === null) {
    issues.push('missing latitude');
  } else if (typeof lat !== 'number' || isNaN(lat)) {
    issues.push('latitude is not a number');
  } else if (lat < -90 || lat > 90) {
    issues.push(`latitude out of range: ${lat}`);
  } else if (lat === 0) {
    issues.push('latitude is 0 (likely invalid)');
  }

  // Check longitude
  if (lng === undefined || lng === null) {
    issues.push('missing longitude');
  } else if (typeof lng !== 'number' || isNaN(lng)) {
    issues.push('longitude is not a number');
  } else if (lng < -180 || lng > 180) {
    issues.push(`longitude out of range: ${lng}`);
  } else if (lng === 0) {
    issues.push('longitude is 0 (likely invalid)');
  }

  // Check geohash
  if (!geohash) {
    issues.push('missing geohash');
  } else if (typeof geohash !== 'string' || geohash.length < 4) {
    issues.push('geohash too short or invalid');
  }

  return issues;
}

/**
 * Validate a single event
 */
function validateEvent(data, docId) {
  const issues = {
    critical: [], // Prevents display in app
    warning: [],  // Should be fixed but doesn't block display
    info: []      // Nice to have
  };

  // Check required fields
  for (const [field, rule] of Object.entries(EVENT_VALIDATION_RULES.required)) {
    const value = data[field];
    const result = validateField(value, rule);
    if (!result.valid) {
      issues.critical.push(`${rule.displayName}: ${result.error}`);
    }
  }

  // Check location/coordinates
  const coordIssues = validateCoordinates(data, EVENT_VALIDATION_RULES.location);
  coordIssues.forEach(issue => issues.critical.push(issue));

  // Check recommended fields
  for (const [field, rule] of Object.entries(EVENT_VALIDATION_RULES.recommended)) {
    const value = data[field];
    const result = validateField(value, rule);
    if (!result.valid) {
      issues.warning.push(`${rule.displayName}: ${result.error}`);
    }
  }

  // Additional quality checks
  if (data.eventDate) {
    const eventDateLower = String(data.eventDate).toLowerCase();
    // Check for past events (more than 1 month old)
    try {
      const eventDate = new Date(data.eventDate);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (eventDate < oneMonthAgo) {
        issues.info.push('Event date is more than 1 month in the past');
      }
    } catch (e) {
      // Date parsing failed, already caught above
    }
  }

  return {
    docId,
    name: data.name,
    source: data.source || data.metadata?.sourceName || 'Unknown',
    state: data.state,
    isValid: issues.critical.length === 0,
    issues
  };
}

/**
 * Validate a single venue/activity
 */
function validateVenue(data, docId) {
  const issues = {
    critical: [],
    warning: [],
    info: []
  };

  // Check required fields
  for (const [field, rule] of Object.entries(VENUE_VALIDATION_RULES.required)) {
    const value = data[field];
    const result = validateField(value, rule);
    if (!result.valid) {
      issues.critical.push(`${rule.displayName}: ${result.error}`);
    }
  }

  // Check location/coordinates
  const coordIssues = validateCoordinates(data, VENUE_VALIDATION_RULES.location);
  coordIssues.forEach(issue => issues.critical.push(issue));

  // Check recommended fields
  for (const [field, rule] of Object.entries(VENUE_VALIDATION_RULES.recommended)) {
    const value = data[field];
    const result = validateField(value, rule);
    if (!result.valid) {
      issues.warning.push(`${rule.displayName}: ${result.error}`);
    }
  }

  return {
    docId,
    name: data.name,
    source: data.source || data.metadata?.sourceName || 'Unknown',
    state: data.state,
    isValid: issues.critical.length === 0,
    issues
  };
}

/**
 * Run full data quality validation
 * @param {Object} options - { dmvOnly: boolean, limit: number, collection: 'events'|'activities'|'both' }
 * @returns {Object} Validation report
 */
async function runDataQualityValidation(options = {}) {
  const {
    dmvOnly = true,
    limit = 10000,
    collection = 'both'
  } = options;

  console.log('🔍 Starting Data Quality Validation...');
  console.log(`   Scope: ${dmvOnly ? 'DMV only (MD, VA, DC)' : 'All states'}`);
  console.log(`   Collections: ${collection}`);

  const report = {
    timestamp: new Date().toISOString(),
    scope: dmvOnly ? 'DMV' : 'All',
    events: null,
    venues: null,
    summary: {}
  };

  // Validate Events
  if (collection === 'both' || collection === 'events') {
    console.log('\n📅 Validating Events...');
    report.events = await validateCollection('events', validateEvent, EVENT_VALIDATION_RULES, { dmvOnly, limit });
  }

  // Validate Venues/Activities
  if (collection === 'both' || collection === 'activities') {
    console.log('\n🏢 Validating Venues/Activities...');
    report.venues = await validateCollection('activities', validateVenue, VENUE_VALIDATION_RULES, { dmvOnly, limit });
  }

  // Generate summary
  report.summary = generateSummary(report);

  return report;
}

/**
 * Validate a collection
 */
async function validateCollection(collectionName, validateFn, rules, options) {
  const { dmvOnly, limit } = options;

  let query = db.collection(collectionName);
  if (dmvOnly) {
    query = query.where('state', 'in', DMV_STATES);
  }
  query = query.limit(limit);

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} documents to validate`);

  const results = {
    total: snapshot.size,
    valid: 0,
    invalid: 0,
    issuesByType: {},
    issuesBySource: {},
    sampleInvalid: []
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const validation = validateFn(data, doc.id);

    if (validation.isValid) {
      results.valid++;
    } else {
      results.invalid++;

      // Track issues by type
      validation.issues.critical.forEach(issue => {
        const issueType = issue.split(':')[0].trim();
        results.issuesByType[issueType] = (results.issuesByType[issueType] || 0) + 1;
      });

      // Track issues by source
      const source = validation.source;
      if (!results.issuesBySource[source]) {
        results.issuesBySource[source] = { count: 0, issues: {} };
      }
      results.issuesBySource[source].count++;
      validation.issues.critical.forEach(issue => {
        const issueType = issue.split(':')[0].trim();
        results.issuesBySource[source].issues[issueType] =
          (results.issuesBySource[source].issues[issueType] || 0) + 1;
      });

      // Keep sample of invalid items
      if (results.sampleInvalid.length < 10) {
        results.sampleInvalid.push({
          id: doc.id,
          name: validation.name,
          source: validation.source,
          issues: validation.issues.critical
        });
      }
    }
  });

  results.validPercent = ((results.valid / results.total) * 100).toFixed(1);

  console.log(`   ✅ Valid: ${results.valid} (${results.validPercent}%)`);
  console.log(`   ❌ Invalid: ${results.invalid}`);

  return results;
}

/**
 * Generate summary report
 */
function generateSummary(report) {
  const summary = {
    overallHealth: 'healthy',
    alerts: []
  };

  // Check events validity rate
  if (report.events) {
    const eventsValidRate = parseFloat(report.events.validPercent);
    if (eventsValidRate < 90) {
      summary.overallHealth = 'warning';
      summary.alerts.push({
        severity: eventsValidRate < 80 ? 'error' : 'warning',
        message: `Events validity rate is ${eventsValidRate}% (target: 90%+)`,
        topIssues: Object.entries(report.events.issuesByType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => `${type}: ${count}`)
      });
    }
  }

  // Check venues validity rate
  if (report.venues) {
    const venuesValidRate = parseFloat(report.venues.validPercent);
    if (venuesValidRate < 90) {
      summary.overallHealth = 'warning';
      summary.alerts.push({
        severity: venuesValidRate < 80 ? 'error' : 'warning',
        message: `Venues validity rate is ${venuesValidRate}% (target: 90%+)`,
        topIssues: Object.entries(report.venues.issuesByType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => `${type}: ${count}`)
      });
    }
  }

  return summary;
}

/**
 * Print formatted report to console
 */
function printReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('DATA QUALITY VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Scope: ${report.scope}`);

  if (report.events) {
    console.log('\n📅 EVENTS');
    console.log('-'.repeat(40));
    console.log(`Total: ${report.events.total}`);
    console.log(`Valid: ${report.events.valid} (${report.events.validPercent}%)`);
    console.log(`Invalid: ${report.events.invalid}`);

    if (Object.keys(report.events.issuesByType).length > 0) {
      console.log('\nIssues by Type:');
      Object.entries(report.events.issuesByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
    }

    if (Object.keys(report.events.issuesBySource).length > 0) {
      console.log('\nTop Sources with Issues:');
      Object.entries(report.events.issuesBySource)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .forEach(([source, data]) => {
          console.log(`  ${source}: ${data.count} invalid`);
        });
    }
  }

  if (report.venues) {
    console.log('\n🏢 VENUES/ACTIVITIES');
    console.log('-'.repeat(40));
    console.log(`Total: ${report.venues.total}`);
    console.log(`Valid: ${report.venues.valid} (${report.venues.validPercent}%)`);
    console.log(`Invalid: ${report.venues.invalid}`);

    if (Object.keys(report.venues.issuesByType).length > 0) {
      console.log('\nIssues by Type:');
      Object.entries(report.venues.issuesByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
    }
  }

  console.log('\n📊 SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Overall Health: ${report.summary.overallHealth.toUpperCase()}`);

  if (report.summary.alerts.length > 0) {
    console.log('\nAlerts:');
    report.summary.alerts.forEach(alert => {
      console.log(`  [${alert.severity.toUpperCase()}] ${alert.message}`);
      if (alert.topIssues) {
        alert.topIssues.forEach(issue => console.log(`    - ${issue}`));
      }
    });
  }

  console.log('\n' + '='.repeat(60));
}

// Export for use in cloud-scraper-monitor.js
module.exports = {
  runDataQualityValidation,
  validateEvent,
  validateVenue,
  printReport,
  EVENT_VALIDATION_RULES,
  VENUE_VALIDATION_RULES
};

// Run standalone if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const dmvOnly = !args.includes('--all');
  const collection = args.includes('--events') ? 'events' :
                     args.includes('--venues') ? 'activities' : 'both';

  runDataQualityValidation({ dmvOnly, collection })
    .then(report => {
      printReport(report);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}
