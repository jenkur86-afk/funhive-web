/**
 * SUPABASE ADAPTER
 * Drop-in replacement for Firebase Admin SDK in scraper scripts.
 *
 * This module provides a compatible interface so existing scrapers
 * can switch from Firestore to Supabase with minimal code changes.
 *
 * BEFORE (Firebase):
 *   const { db } = require('../firebaseAdmin');
 *   await db.collection('events').doc(id).set(eventData);
 *
 * AFTER (Supabase):
 *   const { db, saveEvent, saveActivity } = require('./helpers/supabase-adapter');
 *   await saveEvent(id, eventData);
 *
 * Or use the Firestore-compatible wrapper:
 *   const { db } = require('./helpers/supabase-adapter');
 *   await db.collection('events').doc(id).set(eventData);
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const crypto = require('crypto');

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ Supabase client initialized');

// ============================================================================
// TIME EXTRACTION HELPER
// ============================================================================

/**
 * Extract start/end time from an event_date string.
 * Handles: "Wed, April 8 9:00am – 10:30am", "April 10, 2026 6:00pm",
 *          "2026-04-08T14:00:00", "Sat Apr 12 10am-2pm"
 */
function extractTimeFromDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const str = dateStr.trim();

  // ISO datetime "T14:00:00"
  const isoM = str.match(/T(\d{2}):(\d{2})/);
  if (isoM) {
    let h = parseInt(isoM[1]);
    const m = isoM[2];
    if (h === 0 && m === '00') return null;
    const ap = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12; if (h === 0) h = 12;
    return { startTime: `${h}:${m} ${ap}`, endTime: null };
  }

  // Range with minutes "9:00am - 10:30pm"
  const rm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (rm) {
    const sap = (rm[3] || (parseInt(rm[1]) >= 7 && parseInt(rm[1]) < 12 ? 'AM' : 'PM')).toUpperCase();
    const eap = rm[6].toUpperCase();
    return { startTime: _fmt12(parseInt(rm[1]), rm[2], sap), endTime: _fmt12(parseInt(rm[4]), rm[5], eap) };
  }

  // Range without minutes "10am-2pm"
  const rn = str.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
  if (rn) {
    return { startTime: _fmt12(parseInt(rn[1]), '00', rn[2].toUpperCase()), endTime: _fmt12(parseInt(rn[3]), '00', rn[4].toUpperCase()) };
  }

  // Single time with minutes "6:30pm"
  const sm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (sm) {
    return { startTime: _fmt12(parseInt(sm[1]), sm[2], sm[3].toUpperCase()), endTime: null };
  }

  // Single time no minutes "6pm" (careful not to match year)
  const sn = str.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (sn) {
    return { startTime: _fmt12(parseInt(sn[1]), '00', sn[2].toUpperCase()), endTime: null };
  }

  return null;
}

function _fmt12(h, m, ap) {
  if (h > 12) h -= 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

/**
 * Check if a date string (e.g. "April 8, 2026" or "2026-04-08") is in the past.
 * Compares at midnight granularity so same-day events always pass.
 */
function _isDateInPast(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false; // can't parse → don't reject
  return _isDateObjInPast(parsed);
}

function _isDateObjInPast(dateObj) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(dateObj);
  eventDay.setHours(0, 0, 0, 0);
  return eventDay < today;
}

// ============================================================================
// AGE DETECTION — auto-tag events with age ranges
// ============================================================================

function detectAgeRange(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  // Explicit age ranges: "ages 3-5", "age 6 to 12", "ages 0-18"
  const ageMatch = text.match(/\bages?\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})\b/);
  if (ageMatch) return `${ageMatch[1]}-${ageMatch[2]}`;

  // Parenthetical ages: "(ages 11-18)", "(3-5 yrs)"
  const parenMatch = text.match(/\((?:ages?\s+)?(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*(?:yrs?|years?))?\)/);
  if (parenMatch) return `${parenMatch[1]}-${parenMatch[2]}`;

  // Specific group keywords (order matters — check specific before general)
  if (/\b(baby|babies|infant|lap\s*sit)\b/.test(text)) return '0-2';
  if (/\btoddler/.test(text)) return '1-3';
  if (/\b(preschool|pre-k|prek|pre\s*k)\b/.test(text)) return '3-5';
  if (/\btween/.test(text)) return '9-12';
  if (/\bteen\b/.test(text) && !/\bfamil(y|ies)\b/.test(text)) return '11-18';
  if (/\belementary/.test(text)) return '5-11';

  // "kids" or "children" without "family" context → likely 4-12
  if (/\b(kids?|children)\b/.test(text) && !/\bfamil(y|ies)\b/.test(text)) return '4-12';

  // Family / all ages
  if (/\ball\s*ages\b/.test(text)) return 'All Ages';
  if (/\bfamil(y|ies)\b/.test(text)) return 'All Ages';

  return null;
}

// ============================================================================
// NON-FAMILY FILTERING — reject events not suitable for a family site
// ============================================================================

const NON_FAMILY_PATTERNS = [
  // Explicit adult-only labels
  /\badults?\s*only\b/i,
  /\b(18|21)\s*\+/i,
  /\b(18|21)\s*and\s*(over|up|older)\b/i,
  /\bfor\s+(older\s+)?adults\b/i,
  /\badult\s+(program|workshop|class|craft|event)\b/i,

  // Senior-specific programs
  /\bsenior\s+(program|workshop|class|event|group|circle|social|lunch|exercise|fitness|yoga|tai\s*chi|bingo|trip)\b/i,
  /\bseniors?\s+only\b/i,
  /\bfor\s+seniors\b/i,
  /\b(50|55|60|65)\s*\+/i,
  /\bolder\s+adults\b/i,
  /\bretire[ed]/i,
  /\baarp\b/i,
  /\bmedicare\b/i,
  /\bdementia\b/i,
  /\balzheimer/i,
  /\bcaregiver\s+support\b/i,

  // Alcohol / nightlife
  /\bwine\s+tasting\b/i,
  /\bbeer\s+tasting\b/i,
  /\bcocktail\s+(class|hour|making|tasting)\b/i,
  /\bhappy\s+hour\b/i,
  /\bbar\s+crawl\b/i,
  /\bpub\s+crawl\b/i,
  /\bbrewery\s+tour\b/i,
  /\bbyob\b/i,

  // Dating / adult social
  /\bsingles?\s+night\b/i,
  /\bspeed\s+dating\b/i,
  /\bdate\s+night\b/i,
  /\bburlesque\b/i,

  // Adult library / community programs
  /\bbook\s+club\b/i,
  /\bknitting\s+(circle|club|group)\b/i,
  /\bquilting\b/i,
  /\bcrochet\s+(circle|club|group)\b/i,
  /\bmahjong\b/i,
  /\bbridge\s+club\b/i,
  /\bjob\s+(search|seeker|fair|workshop)\b/i,
  /\bresume\s+(writing|workshop|help|review)\b/i,
  /\btax\s+(prep|help|assistance|filing)\b/i,
  /\bestate\s+planning\b/i,
  /\bscam[\s-]proof/i,
  /\bfraud\s+prevention\b/i,
  /\bgenealogy\b/i,
  /\bblood\s+(drive|donation)\b/i,
  /\bnarcan\b/i,
];

// If event matches a non-family pattern BUT also matches these, keep it
const FAMILY_RESCUE_PATTERNS = [
  /\bfamil(y|ies)\b/i,
  /\bkid/i,
  /\bchild/i,
  /\btoddler/i,
  /\bbab(y|ies)\b/i,
  /\binfant/i,
  /\ball\s*ages\b/i,
  /\bstorytime/i,
  /\bpuppet/i,
  /\bteen/i,
  /\byouth\b/i,
  /\bjunior\b/i,
  /\bpreschool/i,
  /\belementary/i,
];

function isNonFamilyEvent(name, description) {
  const text = `${name || ''} ${description || ''}`;

  for (const pattern of NON_FAMILY_PATTERNS) {
    if (pattern.test(text)) {
      const rescued = FAMILY_RESCUE_PATTERNS.some(fp => fp.test(text));
      if (!rescued) return pattern.source;
    }
  }
  return null;
}

// ============================================================================
// DIRECT SUPABASE FUNCTIONS (recommended for new code)
// ============================================================================

/**
 * Save an event to the events table
 * Converts Firestore event document format to PostgreSQL columns
 */
async function saveEvent(id, data) {
  // Reject non-family events
  const nonFamilyReason = isNonFamilyEvent(data.name, data.description);
  if (nonFamilyReason) {
    console.log(`  ⏭️ Skipping non-family event: "${data.name}" [${nonFamilyReason}]`);
    return null;
  }

  // Reject past events
  const evtDateStr = data.eventDate || '';
  if (evtDateStr && _isDateInPast(evtDateStr)) {
    console.log(`  ⏭️ Skipping past event: "${data.name}" (${evtDateStr})`);
    return null;
  }

  const row = {
    id,
    name: data.name,
    event_date: evtDateStr,
    date: data.date instanceof Date ? data.date.toISOString()
      : (typeof data.date?.toDate === 'function') ? data.date.toDate().toISOString()
      : data.date || null,
    description: data.description || null,
    url: data.url || null,
    image_url: data.imageUrl || null,
    venue: data.venue || null,
    category: data.metadata?.category || data.category || null,
    city: data.location?.city || null,
    state: data.state || data.location?.state || null,
    zip_code: data.location?.zipCode || null,
    address: data.location?.address || null,
    geohash: data.geohash || null,
    activity_id: data.activityId || null,
    source_url: data.metadata?.sourceUrl || null,
    scraper_name: data.metadata?.scraperName || null,
    platform: data.metadata?.platform || null,
    scraped_at: data.metadata?.scrapedAt || new Date().toISOString(),
    start_time: data.startTime || null,
    end_time: data.endTime || null,
    age_range: data.ageRange || detectAgeRange(data.name, data.description) || null,
  };

  // Auto-extract time from event_date if not explicitly set
  if (!row.start_time && row.event_date) {
    const extracted = extractTimeFromDateString(row.event_date);
    if (extracted) {
      row.start_time = extracted.startTime;
      if (extracted.endTime) row.end_time = extracted.endTime;
    }
  }

  // Convert lat/lng to PostGIS point
  const lat = data.location?.latitude || data.location?.coordinates?.latitude;
  const lng = data.location?.longitude || data.location?.coordinates?.longitude;
  if (lat && lng) {
    row.location = `SRID=4326;POINT(${lng} ${lat})`;
  }

  const { error } = await supabase.from('events').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save event ${id}: ${error.message}`);
  return row;
}

/**
 * Save an activity/venue to the activities table
 */
async function saveActivity(id, data) {
  const row = {
    id,
    name: data.name,
    description: data.description || null,
    category: data.category || null,
    subcategory: data.subcategory || null,
    image_url: data.imageUrl || null,
    url: data.url || null,
    phone: data.phone || null,
    hours: data.hours || null,
    price_range: data.priceRange || null,
    is_free: data.isFree || false,
    age_range: data.ageRange || null,
    address: data.address || data.location?.address || null,
    city: data.city || data.location?.city || null,
    state: data.state || data.location?.state || null,
    zip_code: data.zipCode || data.location?.zipCode || null,
    geohash: data.geohash || null,
    source: data.source || null,
    scraper_name: data.scraperName || data.metadata?.scraperName || null,
    scraped_at: new Date().toISOString(),
  };

  const lat = data.location?.latitude || data.latitude;
  const lng = data.location?.longitude || data.longitude;
  if (lat && lng) {
    row.location = `SRID=4326;POINT(${lng} ${lat})`;
  }

  const { error } = await supabase.from('activities').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save activity ${id}: ${error.message}`);
  return row;
}

/**
 * Save a scraper log entry
 */
async function saveScraperLog(logData) {
  const { error } = await supabase.from('scraper_logs').insert({
    scraper_name: logData.scraperName,
    status: logData.status || 'success',
    events_found: logData.eventsFound || 0,
    events_saved: logData.eventsSaved || 0,
    events_skipped: logData.eventsSkipped || 0,
    error_message: logData.errorMessage || null,
    duration_ms: logData.durationMs || null,
  });
  if (error) console.error('Failed to save scraper log:', error.message);
}

/**
 * Check for duplicate events
 */
async function checkDuplicate(name, eventDate, venue) {
  const { data } = await supabase
    .from('events')
    .select('id, name')
    .ilike('name', name)
    .eq('event_date', eventDate)
    .limit(1);

  return data && data.length > 0 ? data[0] : null;
}

// ============================================================================
// FIRESTORE-COMPATIBLE WRAPPER (for gradual migration)
// Provides db.collection('x').doc('y').set(data) interface
// ============================================================================

function createFirestoreCompatibleDB() {
  // Helper to create a chainable query object (supports .where().where().get())
  function createQuery(collectionName, filters = []) {
    return {
      where(field, op, value) {
        return createQuery(collectionName, [...filters, { field, op, value }]);
      },
      async get() {
        const tableName = mapCollectionName(collectionName);
        let query = supabase.from(tableName).select('*');

        // Map Firestore dot-notation fields to Supabase column names
        for (const filter of filters) {
          const col = mapFieldName(collectionName, filter.field);
          if (filter.op === '==' || filter.op === '=') {
            query = query.eq(col, filter.value);
          } else if (filter.op === '!=') {
            query = query.neq(col, filter.value);
          } else if (filter.op === '>') {
            query = query.gt(col, filter.value);
          } else if (filter.op === '>=') {
            query = query.gte(col, filter.value);
          } else if (filter.op === '<') {
            query = query.lt(col, filter.value);
          } else if (filter.op === '<=') {
            query = query.lte(col, filter.value);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        // Return Firestore-like snapshot
        const docs = (data || []).map(row => ({
          id: row.id,
          data: () => row,
          exists: true,
        }));
        return {
          docs,
          empty: docs.length === 0,
          size: docs.length,
          forEach(fn) { docs.forEach(fn); },
        };
      },
      // Allow chaining .limit() and .orderBy() (common Firestore patterns)
      limit(n) { return this; },
      orderBy(field, dir) { return this; },
    };
  }

  return {
    collection(collectionName) {
      const queryBase = createQuery(collectionName);
      return {
        // Chainable query methods on the collection itself
        where(field, op, value) {
          return queryBase.where(field, op, value);
        },
        async get() {
          return queryBase.get();
        },
        doc(docId) {
          return {
            // Expose id and table for batch operations
            id: docId,
            table: collectionName,
            async set(data, options = {}) {
              const table = collectionName;
              let flattened;
              try {
                flattened = flattenForTable(table, data);
              } catch (e) {
                if (e.message?.includes('Skipping past event') || e.message?.includes('empty/null name') || e.message?.includes('Skipping non-family event')) {
                  return; // silently skip
                }
                throw e;
              }
              const row = { id: docId, ...flattened };
              const { error } = await supabase
                .from(mapCollectionName(table))
                .upsert(row, { onConflict: 'id' });
              if (error) throw error;
            },
            async get() {
              const { data, error } = await supabase
                .from(mapCollectionName(collectionName))
                .select('*')
                .eq('id', docId)
                .single();
              return {
                exists: !!data && !error,
                data: () => data,
                id: docId,
              };
            },
            async update(data) {
              const mapped = {};
              for (const [key, value] of Object.entries(data)) {
                const col = mapFieldName(collectionName, key);
                mapped[col] = value;
              }
              if (Object.keys(mapped).length === 0) return;
              const { error } = await supabase
                .from(mapCollectionName(collectionName))
                .update(mapped)
                .eq('id', docId);
              if (error) throw error;
            },
            async delete() {
              const { error } = await supabase
                .from(mapCollectionName(collectionName))
                .delete()
                .eq('id', docId);
              if (error) throw error;
            },
          };
        },
        async add(data) {
          const id = data.id || crypto.randomBytes(15).toString('base64url');
          let flattened;
          try {
            flattened = flattenForTable(collectionName, data);
          } catch (e) {
            if (e.message?.includes('Skipping past event') || e.message?.includes('empty/null name') || e.message?.includes('Skipping non-family event')) {
              return { id }; // silently skip
            }
            throw e;
          }
          const row = { id, ...flattened };
          const { data: result, error } = await supabase
            .from(mapCollectionName(collectionName))
            .insert(row)
            .select()
            .single();
          if (error) throw error;
          return { id: result.id };
        },
      };
    },
    batch() {
      const operations = [];
      return {
        set(ref, data) {
          operations.push({ type: 'upsert', id: ref.id, table: ref.table, data });
        },
        delete(ref) {
          operations.push({ type: 'delete', id: ref.id, table: ref.table });
        },
        async commit() {
          // Group operations by table
          const upsertByTable = {};
          const deleteByTable = {};

          for (const op of operations) {
            const table = op.table || 'events';
            if (op.type === 'upsert') {
              if (!upsertByTable[table]) upsertByTable[table] = [];
              try {
                upsertByTable[table].push({ id: op.id, ...flattenForTable(table, op.data) });
              } catch (e) {
                // Skip past events and invalid events gracefully
                if (e.message?.includes('Skipping past event') || e.message?.includes('empty/null name') || e.message?.includes('Skipping non-family event')) {
                  continue;
                }
                throw e;
              }
            } else if (op.type === 'delete') {
              if (!deleteByTable[table]) deleteByTable[table] = [];
              deleteByTable[table].push(op.id);
            }
          }

          // Execute upserts
          for (const [table, rows] of Object.entries(upsertByTable)) {
            const { error } = await supabase
              .from(mapCollectionName(table))
              .upsert(rows, { onConflict: 'id' });
            if (error) throw error;
          }

          // Execute deletes
          for (const [table, ids] of Object.entries(deleteByTable)) {
            const { error } = await supabase
              .from(mapCollectionName(table))
              .delete()
              .in('id', ids);
            if (error) throw error;
          }

          operations.length = 0;
        },
      };
    },
  };
}

// Map Firestore dot-notation field names to Supabase column names
function mapFieldName(collectionName, firestoreField) {
  const fieldMap = {
    'metadata.scraperName': 'scraper_name',
    'metadata.sourceName': 'source_url',
    'metadata.sourceUrl': 'source_url',
    'metadata.platform': 'platform',
    'metadata.category': 'category',
    'metadata.scrapedAt': 'scraped_at',
    'location.city': 'city',
    'location.state': 'state',
    'location.zipCode': 'zip_code',
    'location.address': 'address',
    'eventDate': 'event_date',
    'imageUrl': 'image_url',
    'activityId': 'activity_id',
    'scraperName': 'scraper_name',
    'zipCode': 'zip_code',
    'priceRange': 'price_range',
    'isFree': 'is_free',
    'ageRange': 'age_range',
    'isSponsored': 'is_sponsored',
    'metadata.lastSeen': 'scraped_at',
  };
  if (firestoreField in fieldMap) return fieldMap[firestoreField];
  // Auto-convert camelCase to snake_case for unmapped fields
  return firestoreField.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
}

// Map Firestore collection names to Supabase table names
function mapCollectionName(name) {
  const map = {
    events: 'events',
    activities: 'activities',
    eventSeries: 'event_series',
    reviews: 'reviews',
    userFavorites: 'user_favorites',
    userSettings: 'user_settings',
    scraperLogs: 'scraper_logs',
    performanceMetrics: 'scraper_logs', // Map to scraper_logs
  };
  return map[name] || name;
}

// Flatten nested Firestore document to PostgreSQL columns
function flattenForTable(table, data) {
  if (table === 'events') return flattenEvent(data);
  if (table === 'activities') return flattenActivity(data);
  if (table === 'scraperLogs' || table === 'performanceMetrics') return flattenScraperLog(data);
  return data;
}

function flattenEvent(data) {
  // Reject events with no name (prevents "null value in column 'name'" errors)
  if (!data.name || (typeof data.name === 'string' && data.name.trim().length === 0)) {
    throw new Error('Cannot save event with empty/null name');
  }

  // Reject non-family events
  const nonFamilyReason = isNonFamilyEvent(data.name, data.description);
  if (nonFamilyReason) {
    throw new Error(`Skipping non-family event: "${data.name}" [${nonFamilyReason}]`);
  }

  // Reject past events — parse date from eventDate string or date field
  const eventDateStr = data.eventDate || data.event_date;
  if (eventDateStr && _isDateInPast(eventDateStr)) {
    throw new Error(`Skipping past event: "${data.name}" (${eventDateStr})`);
  }
  // Also check the date/timestamp field
  if (data.date) {
    const dateObj = data.date instanceof Date ? data.date
      : (typeof data.date?.toDate === 'function') ? data.date.toDate()
      : new Date(data.date);
    if (!isNaN(dateObj.getTime()) && _isDateObjInPast(dateObj)) {
      throw new Error(`Skipping past event: "${data.name}" (${dateObj.toISOString()})`);
    }
  }

  const row = {};
  row.name = data.name.trim();
  if (data.eventDate) row.event_date = data.eventDate;
  if (data.date) {
    if (data.date instanceof Date) row.date = data.date.toISOString();
    else if (typeof data.date.toDate === 'function') row.date = data.date.toDate().toISOString();
    else row.date = data.date;
  }
  if (data.description) row.description = data.description;
  if (data.url) row.url = data.url;
  if (data.imageUrl) row.image_url = data.imageUrl;
  if (data.venue) row.venue = data.venue;
  if (data.state) row.state = data.state;
  if (data.geohash) row.geohash = data.geohash;
  if (data.activityId) row.activity_id = data.activityId;
  if (data.startTime) row.start_time = data.startTime;
  if (data.endTime) row.end_time = data.endTime;

  // Auto-extract time from event_date or scheduleDescription (raw date with time)
  if (!row.start_time) {
    // Try event_date first, then scheduleDescription (which has the raw un-normalized date)
    const timeSource = row.event_date || data.scheduleDescription || data.eventDate;
    const extracted = extractTimeFromDateString(timeSource);
    if (extracted) {
      row.start_time = extracted.startTime;
      if (extracted.endTime) row.end_time = extracted.endTime;
    }
    // Also try scheduleDescription if event_date didn't have time
    if (!row.start_time && data.scheduleDescription && data.scheduleDescription !== timeSource) {
      const extracted2 = extractTimeFromDateString(data.scheduleDescription);
      if (extracted2) {
        row.start_time = extracted2.startTime;
        if (extracted2.endTime) row.end_time = extracted2.endTime;
      }
    }
  }

  // Category: check top-level, displayCategory, parentCategory, then metadata
  row.category = data.category || data.displayCategory || data.parentCategory || null;

  // Scraper name: check top-level, then metadata, then source field
  if (data.scraperName) row.scraper_name = data.scraperName;

  if (data.location) {
    row.city = data.location.city;
    row.state = row.state || data.location.state;
    row.zip_code = data.location.zipCode;
    row.address = data.location.address;
    const lat = data.location.latitude || data.location.coordinates?.latitude;
    const lng = data.location.longitude || data.location.coordinates?.longitude;
    if (lat && lng) row.location = `SRID=4326;POINT(${lng} ${lat})`;
  }
  if (data.metadata) {
    row.source_url = row.source_url || data.metadata.sourceUrl;
    row.scraper_name = row.scraper_name || data.metadata.scraperName || data.metadata.source;
    row.platform = row.platform || data.metadata.platform;
    row.scraped_at = row.scraped_at || data.metadata.scrapedAt;
    // Category: metadata.category as fallback if not already set
    row.category = row.category || data.metadata.category;
    // State: metadata.state as additional fallback
    row.state = row.state || data.metadata.state;
  }

  // Auto-detect age range from event name/description
  if (!data.ageRange && !data.age_range) {
    const detectedAge = detectAgeRange(data.name, data.description);
    if (detectedAge) row.age_range = detectedAge;
  } else {
    row.age_range = data.ageRange || data.age_range;
  }

  // Clean up nulls — don't write null values that overwrite existing data
  Object.keys(row).forEach(k => { if (row[k] === null || row[k] === undefined) delete row[k]; });

  return row;
}

function flattenActivity(data) {
  const row = {};
  if (data.name) row.name = data.name;
  if (data.description) row.description = data.description;
  if (data.category) row.category = data.category;
  if (data.subcategory) row.subcategory = data.subcategory;
  if (data.url || data.website) row.url = data.url || data.website;
  if (data.imageUrl) row.image_url = data.imageUrl;
  if (data.phone) row.phone = data.phone;
  if (data.hours) row.hours = data.hours;
  if (data.priceRange || data.cost) row.price_range = data.priceRange || data.cost;
  if (data.isFree != null) row.is_free = data.isFree;
  if (data.ageRange) row.age_range = data.ageRange;
  if (data.state) row.state = data.state;
  if (data.city) row.city = data.city;
  if (data.address) row.address = data.address;
  if (data.zipCode) row.zip_code = data.zipCode;
  if (data.geohash) row.geohash = data.geohash;
  if (data.source) row.source = data.source;
  if (data.scraperName) row.scraper_name = data.scraperName;
  if (data.metadata) {
    row.scraper_name = row.scraper_name || data.metadata.scraperName || data.metadata.source;
    row.scraped_at = data.metadata.scrapedAt;
    // Pull additional fields from metadata if not at top level
    row.category = row.category || data.metadata.category;
    row.state = row.state || data.metadata.state;
  }
  if (data.location) {
    row.city = row.city || data.location.city;
    row.state = row.state || data.location.state;
    row.zip_code = row.zip_code || data.location.zipCode;
    row.address = row.address || data.location.address;
    // Pull phone/url/hours from location if not at top level (some scrapers nest these)
    row.phone = row.phone || data.location.phone;
    row.url = row.url || data.location.website || data.location.url;
    row.hours = row.hours || data.location.hours;
    const lat = data.location.latitude || data.location.coordinates?.latitude;
    const lng = data.location.longitude || data.location.coordinates?.longitude;
    if (lat && lng) row.location = `SRID=4326;POINT(${lng} ${lat})`;
  }

  // Clean up nulls
  Object.keys(row).forEach(k => { if (row[k] === null || row[k] === undefined) delete row[k]; });

  return row;
}

function flattenScraperLog(data) {
  const row = {};
  row.scraper_name = data.scraperName || data.scraper_name || null;
  row.status = data.status || (data.success ? 'success' : 'failed');
  row.events_found = data.found || data.eventsFound || data.events_found || 0;
  row.events_saved = data.imported || data.new || data.eventsSaved || data.events_saved || 0;
  row.events_skipped = (data.skippedPast || 0) + (data.duplicates || 0) + (data.eventsSkipped || 0) + (data.events_skipped || 0);
  row.error_message = (data.errorMessages && data.errorMessages.length > 0)
    ? data.errorMessages.slice(0, 3).join('; ')
    : (data.errorMessage || data.error_message || null);
  row.duration_ms = data.executionTime
    ? Math.round(data.executionTime * 1000)
    : (data.durationMs || data.duration_ms || null);

  // Clean up nulls
  Object.keys(row).forEach(k => { if (row[k] === null || row[k] === undefined) delete row[k]; });

  return row;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Firebase-admin compatible shim for helpers that destructure { admin, db }
const admin = {
  firestore: Object.assign(
    function() { return createFirestoreCompatibleDB(); },
    {
      FieldValue: {
        serverTimestamp() { return new Date().toISOString(); },
        increment(n) { return n; },
        delete() { return null; },
        arrayUnion(...args) { return args; },
        arrayRemove(...args) { return args; },
      },
      Timestamp: {
        now() { return { toDate: () => new Date() }; },
        fromDate(date) { return { toDate: () => date }; },
      },
    }
  ),
};

module.exports = {
  supabase,
  admin,
  db: createFirestoreCompatibleDB(),
  saveEvent,
  saveActivity,
  saveScraperLog,
  checkDuplicate,
};
