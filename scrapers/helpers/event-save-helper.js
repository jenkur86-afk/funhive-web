/**
 * EVENT SAVE HELPER
 *
 * Standardized helper for saving events with proper location data.
 * Ensures all events have required fields:
 * - geohash
 * - location.latitude / location.longitude
 * - state
 * - date (Timestamp)
 * - activityId (auto-created/linked)
 *
 * Usage:
 *   const { saveEventsWithGeocoding } = require('./event-save-helper');
 *   await saveEventsWithGeocoding(events, LIBRARIES, { scraperName: 'my-scraper', state: 'MD' });
 */

const { admin, db } = require('./supabase-adapter');
const ngeohash = require('ngeohash');
const { geocodeWithFallback } = require('./geocoding-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { findExistingDuplicate } = require('./event-deduplication-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');

// Cache for activity lookups to avoid repeated queries
const activityCache = new Map();

/**
 * Extract start/end time from a raw date string before normalization strips it.
 * Handles: "Wed, April 8 9:00am – 10:30am", "April 10, 2026 6:00pm", "10am-2pm"
 */
function _extractTimeFromRaw(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const str = dateStr.trim();

  // ISO datetime "T14:00:00"
  const isoM = str.match(/T(\d{2}):(\d{2})/);
  if (isoM) {
    let h = parseInt(isoM[1]); const m = isoM[2];
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
    return { startTime: _fmt(parseInt(rm[1]), rm[2], sap), endTime: _fmt(parseInt(rm[4]), rm[5], eap) };
  }

  // Range without minutes "10am-2pm"
  const rn = str.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
  if (rn) {
    return { startTime: _fmt(parseInt(rn[1]), '00', rn[2].toUpperCase()), endTime: _fmt(parseInt(rn[3]), '00', rn[4].toUpperCase()) };
  }

  // Single time with minutes "6:30pm"
  const sm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (sm) {
    return { startTime: _fmt(parseInt(sm[1]), sm[2], sm[3].toUpperCase()), endTime: null };
  }

  // Single time no minutes "6pm"
  const sn = str.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (sn) {
    return { startTime: _fmt(parseInt(sn[1]), '00', sn[2].toUpperCase()), endTime: null };
  }

  return null;
}

function _fmt(h, m, ap) {
  if (h > 12) h -= 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

/**
 * Create a unique key for event comparison
 * Uses normalized name + date + venue for matching
 */
function createEventKey(name, eventDate, venue) {
  const normalizedName = (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedDate = (eventDate || '').toLowerCase().trim();
  const normalizedVenue = (venue || '').toLowerCase().trim();
  return `${normalizedName}|||${normalizedDate}|||${normalizedVenue}`;
}

/**
 * Get existing future events for a specific scraper and source
 * @param {string} scraperName - The scraper name
 * @param {string} sourceName - The source/library name (optional)
 * @returns {Promise<Array>} Array of existing event documents
 */
async function getExistingEventsForSource(scraperName, sourceName = null) {
  const now = new Date();

  let query = db.collection('events')
    .where('metadata.scraperName', '==', scraperName);

  // If sourceName provided, filter by that too
  if (sourceName) {
    query = query.where('metadata.sourceName', '==', sourceName);
  }

  const snapshot = await query.get();

  // Filter to only future events
  const futureEvents = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    let eventDate = null;

    // Try to get date from Timestamp or string
    if (data.date && data.date.toDate) {
      eventDate = data.date.toDate();
    } else if (data.eventDate) {
      eventDate = new Date(data.eventDate);
    }

    // Only include future events
    if (eventDate && eventDate >= now) {
      futureEvents.push({
        id: doc.id,
        data: data,
        key: createEventKey(data.name, data.eventDate, data.venue || data.metadata?.sourceName)
      });
    }
  });

  return futureEvents;
}

/**
 * Delete events that are no longer found on the source
 * @param {Array} existingEvents - Existing events from getExistingEventsForSource
 * @param {Set} foundEventKeys - Set of event keys that were found in this scrape
 * @returns {Promise<number>} Number of events deleted
 */
async function deleteRemovedEvents(existingEvents, foundEventKeys) {
  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const existing of existingEvents) {
    if (!foundEventKeys.has(existing.key)) {
      // Event no longer exists on source - delete it
      const docRef = db.collection('events').doc(existing.id);
      batch.delete(docRef);
      deleted++;
      batchCount++;

      console.log(`  🗑️ Deleting removed event: "${(existing.data.name || '').substring(0, 50)}..." (${existing.data.eventDate})`);

      // Commit batch every 500 documents
      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  return deleted;
}

/**
 * Verify events and remove those no longer on source
 * Call this after scraping to clean up removed/cancelled events
 *
 * @param {Array} scrapedEvents - Events found in this scrape run
 * @param {string} scraperName - The scraper name
 * @param {Array} libraries - Array of libraries/sources that were scraped
 * @returns {Promise<{verified: number, deleted: number}>}
 */
async function verifyAndCleanupEvents(scrapedEvents, scraperName, libraries = []) {
  console.log(`\n🔍 Verifying events for ${scraperName}...`);

  // Build set of found event keys from scraped events
  const foundEventKeys = new Set();
  for (const event of scrapedEvents) {
    const venue = event.venueName || event.venue || event.location || '';
    const key = createEventKey(
      event.title || event.name,
      event.date || event.eventDate,
      venue
    );
    foundEventKeys.add(key);
  }

  console.log(`  Found ${foundEventKeys.size} unique events in scrape`);

  let totalDeleted = 0;
  let totalVerified = 0;

  // If we have specific libraries, verify each one separately
  if (libraries.length > 0) {
    for (const library of libraries) {
      const sourceName = library.name;
      const existingEvents = await getExistingEventsForSource(scraperName, sourceName);

      if (existingEvents.length > 0) {
        // Filter foundEventKeys to only those for this source
        const sourceFoundKeys = new Set();
        for (const event of scrapedEvents) {
          const eventVenue = event.venueName || event.venue || event.location || '';
          // Check if this event belongs to this library
          if (eventVenue.toLowerCase().includes(library.name.toLowerCase()) ||
              library.name.toLowerCase().includes(eventVenue.toLowerCase()) ||
              event.metadata?.sourceName === sourceName) {
            const key = createEventKey(
              event.title || event.name,
              event.date || event.eventDate,
              eventVenue
            );
            sourceFoundKeys.add(key);
          }
        }

        const deleted = await deleteRemovedEvents(existingEvents, sourceFoundKeys);
        totalDeleted += deleted;
        totalVerified += existingEvents.length - deleted;
      }
    }
  } else {
    // No specific libraries - verify all events for this scraper
    const existingEvents = await getExistingEventsForSource(scraperName);

    if (existingEvents.length > 0) {
      const deleted = await deleteRemovedEvents(existingEvents, foundEventKeys);
      totalDeleted += deleted;
      totalVerified += existingEvents.length - deleted;
    }
  }

  console.log(`✅ Verification complete: ${totalVerified} verified, ${totalDeleted} deleted`);

  return { verified: totalVerified, deleted: totalDeleted };
}

// Invalid/placeholder venue names that should NOT create activities
const INVALID_VENUE_PATTERNS = [
  /^your home$/i,
  /^your house$/i,
  /^your neighborhood$/i,
  /^your local/i,
  /^your hobby/i,
  /^your backyard$/i,
  /^your kitchen$/i,
  /^your living room$/i,
  /^your garage$/i,
  /^home$/i,
  /^online$/i,
  /^virtual$/i,
  /^zoom$/i,
  /^tbd$/i,
  /^tba$/i,
  /^various locations$/i,
  /^multiple locations$/i,
  /^see website$/i,
  /^check website$/i,
  /^contact for location$/i,
  /^location tbd$/i,
  /^to be announced$/i,
  /^n\/a$/i,
  /^none$/i,
  /^unknown$/i,
  /^anywhere$/i,
  /^everywhere$/i,
  /^off site$/i,
  /^offsite$/i,
];

/**
 * Check if a venue name is invalid/placeholder
 */
function isInvalidVenue(venueName) {
  if (!venueName) return true;
  const name = venueName.trim();
  if (name.length < 3) return true;
  // Reject excessively long names (likely page dumps or concatenated text)
  if (name.length > 150) return true;
  // Reject names with embedded date/time patterns (scraper picked up event data as venue)
  if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2}/i.test(name) &&
      /\d{1,2}:\d{2}\s*(am|pm)/i.test(name)) return true;
  // Reject names with multiple "Registration" or "Age group" (page dumps)
  if ((name.match(/Registration/gi) || []).length >= 2 ||
      (name.match(/Age group/gi) || []).length >= 2) return true;

  for (const pattern of INVALID_VENUE_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Create a normalized key for activity matching
 */
function createActivityKey(venue, city, state) {
  const normalizedVenue = (venue || '').toLowerCase().trim();
  const normalizedCity = (city || '').toLowerCase().trim();
  const normalizedState = (state || '').toUpperCase().trim();
  return `${normalizedVenue}|||${normalizedCity}|||${normalizedState}`;
}

/**
 * Create an activity ID from venue info
 */
function createActivityId(venue, city, state) {
  const normalized = `${venue}${city}${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
  return normalized || 'library-' + Date.now();
}

/**
 * Get or create an activity for a library/venue
 * Returns the activityId, or null if venue is invalid/placeholder
 *
 * Now tracks:
 * - eventCount: Number of events at this venue
 * - lastEventDate: Most recent event date
 * - metadata.lastSeen: Last time this venue had an event scraped
 */
async function getOrCreateActivity(library, coordinates, state, eventDate = null) {
  const venue = library.name;
  const city = library.city || '';
  const libraryState = library.state || state;

  // Skip invalid/placeholder venue names - don't create activities for these
  if (isInvalidVenue(venue)) {
    return null;
  }

  const cacheKey = createActivityKey(venue, city, libraryState);

  // Generate activity ID
  const activityId = createActivityId(venue, city, libraryState);

  // Check if activity exists in Firestore
  const activityRef = db.collection('activities').doc(activityId);
  const activityDoc = await activityRef.get();

  if (!activityDoc.exists) {
    // Create new activity
    const activityData = {
      id: activityId,
      name: venue,
      venue: venue,
      category: 'Learning & Culture',
      subcategory: 'Library',
      state: libraryState,
      city: city,
      location: {
        name: venue,
        address: library.address || '',
        city: city,
        state: libraryState,
        zipCode: library.zipCode || '',
        // Save coordinates at BOTH locations for compatibility
        latitude: coordinates ? coordinates.latitude : null,
        longitude: coordinates ? coordinates.longitude : null,
        coordinates: coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : null
      },
      description: `${venue} - Public Library`,
      source: 'event-scraper',
      eventCount: 1,
      lastEventDate: eventDate,
      scraperName: 'Event Save Helper',
      metadata: {
        source: 'Event Save Helper',
        scraperName: 'Event Save Helper',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      },
      active: true
    };

    // Add geohash if coordinates exist
    if (coordinates) {
      activityData.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
    }

    await activityRef.set(activityData);
    console.log(`  📍 Created activity: ${venue} (${city}, ${libraryState})`);
  } else {
    // Activity exists - update event tracking (only if not cached this session)
    if (!activityCache.has(cacheKey)) {
      try {
        const updateData = {
          'metadata.lastSeen': admin.firestore.FieldValue.serverTimestamp()
        };
        await activityRef.update(updateData);
      } catch (updateErr) {
        // Non-critical: activity tracking update failed, continue with event save
      }
    }
  }

  // Cache the result to avoid repeated updates in same scraper run
  activityCache.set(cacheKey, activityId);

  return activityId;
}

/**
 * Save events to Firestore with proper geocoding and geohash
 *
 * @param {Array} events - Array of event objects from scraper
 * @param {Array} libraries - Array of library objects with city/zipCode/state/county
 * @param {Object} options - Configuration options
 * @param {string} options.scraperName - Name of the scraper for document IDs
 * @param {string} options.state - State abbreviation (e.g., 'MD')
 * @param {string} [options.category='library'] - Event category
 * @param {string} [options.platform='generic'] - Platform type
 * @returns {Promise<{saved: number, skipped: number, errors: number}>}
 */
async function saveEventsWithGeocoding(events, libraries, options = {}) {
  const {
    scraperName,
    state,
    category = 'library',
    platform = 'generic',
    skipDuplicateCheck = false,
    duplicateThreshold = 0.7
  } = options;

  if (!scraperName || !state) {
    throw new Error('scraperName and state are required options');
  }

  let batch = db.batch();
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  let batchCount = 0;

  console.log(`\n💾 Saving ${events.length} events with geocoding...`);

  for (const event of events) {
    try {
      // Find matching library for this event
      const library = findLibraryForEvent(event, libraries);
      if (!library) {
        console.log(`  ⚠️ No library found for event: ${event.title || event.name}`);
        skipped++;
        continue;
      }

      // Get coordinates
      let coordinates = null;

      // Try event-specific location first
      if (event.location?.latitude && event.location?.longitude) {
        coordinates = {
          latitude: event.location.latitude,
          longitude: event.location.longitude
        };
      } else if (event.latitude && event.longitude) {
        coordinates = {
          latitude: event.latitude,
          longitude: event.longitude
        };
      } else {
        // Geocode based on library location
        const geocodeAddr = library.address
          ? `${library.address}, ${library.city}, ${library.state}`
          : `${library.name}, ${library.city}, ${library.state}`;

        // Pass venue name and source name for library-addresses.js lookup
        coordinates = await geocodeWithFallback(geocodeAddr, {
          city: library.city,
          zipCode: library.zipCode,
          state: library.state || state,
          county: library.county,
          venueName: event.venueName || event.venue || library.name,
          sourceName: event.metadata?.sourceName || library.name
        });

        // Rate limiting for geocoding API (Nominatim needs ≥2.5s between requests)
        await new Promise(resolve => setTimeout(resolve, 2500));
      }

      if (!coordinates) {
        console.log(`  ⚠️ Could not geocode: ${event.title || event.name}`);
        skipped++;
        continue;
      }

      // Calculate geohash
      const eventGeohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);

      // Extract time from raw date string BEFORE normalization strips it
      let extractedStartTime = event.startTime || null;
      let extractedEndTime = event.endTime || null;
      const rawDateStr = event.date || event.eventDate;

      // Many scrapers (WordPress per-state, etc.) capture time in a separate event.time field
      // that was previously ignored. Check it before falling back to date string extraction.
      if (!extractedStartTime && event.time) {
        const timeFromField = _extractTimeFromRaw(event.time);
        if (timeFromField) {
          extractedStartTime = timeFromField.startTime;
          extractedEndTime = timeFromField.endTime;
        }
      }

      if (!extractedStartTime && rawDateStr) {
        const timeInfo = _extractTimeFromRaw(rawDateStr);
        if (timeInfo) {
          extractedStartTime = timeInfo.startTime;
          extractedEndTime = timeInfo.endTime;
        }
      }

      // Parse date to Timestamp - REQUIRE normalized date format
      let dateTimestamp = null;
      const dateStr = normalizeDateString(rawDateStr);

      // Skip events with invalid/unparseable dates
      if (!dateStr && rawDateStr) {
        console.log(`  ⚠️ Skipping event with invalid date: "${rawDateStr}" - ${(event.title || event.name || '').substring(0, 40)}`);
        skipped++;
        continue;
      }

      if (dateStr) {
        try {
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            // Skip past events
            if (dateObj < new Date()) {
              skipped++;
              continue;
            }
            dateTimestamp = admin.firestore.Timestamp.fromDate(dateObj);
          }
        } catch (e) {
          // Date parsing failed - still save but without timestamp
        }
      }

      // Get or create activity for this library/venue (after date parsing)
      const activityId = await getOrCreateActivity(library, coordinates, state, dateTimestamp);

      // Check for duplicates before saving
      if (!skipDuplicateCheck && dateStr) {
        try {
          const duplicateCheck = await findExistingDuplicate({
            name: event.title || event.name,
            eventDate: dateStr,
            venue: event.venueName || event.venue || library.name,
            url: event.url,
            location: { city: library.city }
          }, { threshold: duplicateThreshold });

          if (duplicateCheck.isDuplicate) {
            console.log(`  Skipping duplicate: "${(event.title || event.name || '').substring(0, 40)}..." (matches ${duplicateCheck.existingSource || duplicateCheck.existingId})`);
            skipped++;
            continue;
          }

          // Skip events with invalid dates (time-only like "2:00 PM")
          if (duplicateCheck.hasInvalidDate) {
            console.log(`  Skipping invalid date: "${(event.title || event.name || '').substring(0, 40)}..." (date: "${duplicateCheck.dateValue}")`);
            skipped++;
            continue;
          }
        } catch (e) {
          // If duplicate check fails, proceed with save
          console.log(`  Warning: Duplicate check failed, proceeding with save: ${e.message}`);
        }
      }

      // Build standardized event document
      // If activityId is null (invalid venue), don't include venue info on the event
      const hasValidVenue = activityId !== null;

      const eventDoc = {
        name: event.title || event.name,
        eventDate: dateStr || '',
        startTime: extractedStartTime,
        endTime: extractedEndTime,
        date: dateTimestamp,
        description: (event.description || '').substring(0, 1500),
        url: event.url || library.url,
        imageUrl: event.imageUrl || '',
        state: library.state || state,
        geohash: eventGeohash,
        location: {
          city: library.city,
          state: library.state || state,
          zipCode: library.zipCode,
          // Save coordinates at BOTH locations for compatibility
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          }
        },
        metadata: {
          sourceUrl: library.url,
          scrapedAt: new Date().toISOString(),
          scraperName: scraperName,
          category: category,
          platform: platform,
          state: library.state || state
        }
      };

      // Pass through age range from scraper (source-extracted takes priority)
      // The adapter will fall back to keyword detection if this is empty
      if (event.ageRange || event.age_range || event.audience) {
        eventDoc.ageRange = event.ageRange || event.age_range || event.audience;
      }

      // Only add venue-related fields if we have a valid venue
      if (hasValidVenue) {
        eventDoc.venue = event.venueName || event.venue || library.name;
        eventDoc.activityId = activityId;
        eventDoc.location.name = library.name;
        eventDoc.location.address = library.address || '';
        eventDoc.metadata.sourceName = library.name;
      }

      // Validate required fields and clean data
      const warnings = [];
      if (!eventDoc.state) warnings.push('Missing state');
      if (!eventDoc.geohash) warnings.push('Missing geohash');
      if (!eventDoc.eventDate) warnings.push('Missing eventDate');
      if (eventDoc.venue && eventDoc.venue.includes('<')) {
        eventDoc.venue = eventDoc.venue.replace(/<[^>]*>/g, '').trim();
        warnings.push('Stripped HTML from venue');
      }
      if (warnings.length > 0) {
        console.log(`  ⚠️ "${eventDoc.name?.substring(0, 30)}": ${warnings.join(', ')}`);
      }

      // Generate deterministic ID so re-scraping the same event upserts instead of duplicating
      const eventId = eventDoc.url
        ? generateEventId(eventDoc.url)
        : generateEventIdFromDetails(eventDoc.name, eventDoc.eventDate, eventDoc.venue || '');
      const docRef = db.collection('events').doc(eventId);
      batch.set(docRef, eventDoc);

      saved++;
      batchCount++;

      // Commit batch every 500 documents
      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log(`   💾 Committed ${saved} events...`);
      }

    } catch (error) {
      console.error(`  ❌ Error saving event: ${error.message}`);
      errors++;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Save complete: ${saved} saved, ${skipped} skipped, ${errors} errors`);

  // Verify and cleanup events that are no longer on source
  let deleted = 0;
  try {
    const verifyResult = await verifyAndCleanupEvents(events, scraperName, libraries);
    deleted = verifyResult.deleted;
  } catch (verifyError) {
    console.error(`  ⚠️ Verification failed: ${verifyError.message}`);
  }

  return { saved, skipped, errors, deleted };
}

/**
 * Find the library that matches an event
 */
function findLibraryForEvent(event, libraries) {
  if (!libraries || libraries.length === 0) return null;

  // Try to match by venue name or location
  const eventVenue = (event.venueName || event.location || event.venue || '').toLowerCase();

  for (const lib of libraries) {
    if (lib.name.toLowerCase().includes(eventVenue) ||
        eventVenue.includes(lib.name.toLowerCase()) ||
        (lib.city && eventVenue.includes(lib.city.toLowerCase()))) {
      return lib;
    }
  }

  // Default to first library if no match
  return libraries[0];
}

/**
 * Simple event save without geocoding (for scrapers that already have coordinates)
 */
async function saveEventsSimple(events, options = {}) {
  const {
    scraperName,
    state,
    skipDuplicateCheck = false,
    duplicateThreshold = 0.7
  } = options;

  let batch = db.batch();
  let saved = 0;
  let skipped = 0;
  let batchCount = 0;

  for (const event of events) {
    // Ensure required fields exist
    if (!event.geohash && event.location?.latitude && event.location?.longitude) {
      event.geohash = ngeohash.encode(event.location.latitude, event.location.longitude, 7);
    }

    if (!event.state) {
      event.state = state;
    }

    // Check for duplicates before saving
    if (!skipDuplicateCheck && event.eventDate) {
      try {
        const duplicateCheck = await findExistingDuplicate({
          name: event.name,
          eventDate: event.eventDate,
          venue: event.venue,
          url: event.url,
          location: event.location
        }, { threshold: duplicateThreshold });

        if (duplicateCheck.isDuplicate) {
          console.log(`  Skipping duplicate: "${(event.name || '').substring(0, 40)}..." (matches ${duplicateCheck.existingSource || duplicateCheck.existingId})`);
          skipped++;
          continue;
        }

        // Skip events with invalid dates (time-only like "2:00 PM")
        if (duplicateCheck.hasInvalidDate) {
          console.log(`  Skipping invalid date: "${(event.name || '').substring(0, 40)}..." (date: "${duplicateCheck.dateValue}")`);
          skipped++;
          continue;
        }
      } catch (e) {
        // If duplicate check fails, proceed with save
        console.log(`  Warning: Duplicate check failed, proceeding with save: ${e.message}`);
      }
    }

    // Get or create activity if venue info exists
    if (!event.activityId && event.venue && event.location?.city) {
      const library = {
        name: event.venue,
        city: event.location.city,
        state: event.state || state,
        address: event.location.address,
        zipCode: event.location.zipCode
      };
      const coordinates = event.location?.latitude && event.location?.longitude
        ? { latitude: event.location.latitude, longitude: event.location.longitude }
        : null;
      const eventDate = event.date || null; // Pass event date for tracking
      const activityId = await getOrCreateActivity(library, coordinates, state, eventDate);

      // If venue is invalid (activityId is null), remove venue info from event
      if (activityId === null) {
        delete event.venue;
        delete event.activityId;
        if (event.location) {
          delete event.location.name;
          delete event.location.address;
        }
      } else {
        event.activityId = activityId;
      }
    }

    // Validate required fields and clean data
    const warnings = [];
    if (!event.state) warnings.push('Missing state');
    if (!event.geohash) warnings.push('Missing geohash');
    if (!event.eventDate) warnings.push('Missing eventDate');
    if (event.venue && event.venue.includes('<')) {
      event.venue = event.venue.replace(/<[^>]*>/g, '').trim();
      warnings.push('Stripped HTML from venue');
    }
    if (warnings.length > 0) {
      console.log(`  ⚠️ "${event.name?.substring(0, 30)}": ${warnings.join(', ')}`);
    }

    const eventId = event.url
      ? generateEventId(event.url)
      : generateEventIdFromDetails(event.name, event.eventDate, event.venue || '');
    const docRef = db.collection('events').doc(eventId);
    batch.set(docRef, event);

    saved++;
    batchCount++;

    if (batchCount >= 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  // Verify and cleanup events that are no longer on source
  let deleted = 0;
  if (scraperName) {
    try {
      const verifyResult = await verifyAndCleanupEvents(events, scraperName, []);
      deleted = verifyResult.deleted;
    } catch (verifyError) {
      console.error(`  ⚠️ Verification failed: ${verifyError.message}`);
    }
  }

  return { saved, skipped, deleted };
}

module.exports = {
  saveEventsWithGeocoding,
  saveEventsSimple,
  findLibraryForEvent,
  getOrCreateActivity,
  createActivityId,
  verifyAndCleanupEvents,
  getExistingEventsForSource
};
