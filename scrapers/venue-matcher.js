/**
 * VENUE MATCHER
 *
 * Smart venue matching to link events to existing venues/activities.
 * Uses multiple strategies:
 * 1. Exact ID match (normalized name+city+state)
 * 2. Fuzzy name match within same city
 * 3. Address match (same street address)
 * 4. Geohash proximity match (within ~150m)
 */

const { db } = require('./helpers/supabase-adapter');
const ngeohash = require('ngeohash');

// Cache for venue lookups
let venueCache = null;
let venueCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize a string for matching
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Create a simple activity ID from venue+city+state
 */
function createActivityId(venue, city, state) {
  return `${venue}${city}${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
}

/**
 * Extract the core venue name (remove location suffixes)
 * "Sky Zone Gambrills" -> "Sky Zone"
 * "Dave & Buster's - Arundel Mills" -> "Dave & Buster's"
 */
function extractCoreName(name) {
  if (!name) return '';

  // Remove common suffixes/location patterns
  let core = name
    .replace(/\s*[-–—@]\s*.*$/, '') // Remove "- Location" or "@ Location"
    .replace(/\s+\d+$/, '') // Remove trailing numbers
    .replace(/\s+(at|in|of)\s+.+$/i, '') // Remove "at/in/of Location"
    .trim();

  // Known chain patterns - extract just the chain name
  const chains = [
    { pattern: /sky\s*zone/i, name: 'Sky Zone' },
    { pattern: /dave\s*[&']?\s*buster/i, name: "Dave & Buster's" },
    { pattern: /chuck\s*e\.?\s*cheese/i, name: "Chuck E. Cheese" },
    { pattern: /urban\s*air/i, name: 'Urban Air' },
    { pattern: /main\s*event/i, name: 'Main Event' },
    { pattern: /topgolf/i, name: 'Topgolf' },
    { pattern: /round\s*1|round\s*one/i, name: 'Round1' },
    { pattern: /bowlero/i, name: 'Bowlero' },
    { pattern: /launch\s*trampoline/i, name: 'Launch Trampoline' },
    { pattern: /altitude\s*trampoline/i, name: 'Altitude Trampoline' },
    { pattern: /regal\s*(cinema|theater|movie)/i, name: 'Regal' },
    { pattern: /amc\s*(theater|cinema|movie)?/i, name: 'AMC' },
    { pattern: /cinemark/i, name: 'Cinemark' },
    { pattern: /alamo\s*drafthouse/i, name: 'Alamo Drafthouse' },
  ];

  for (const chain of chains) {
    if (chain.pattern.test(name)) {
      return chain.name;
    }
  }

  return core || name;
}

/**
 * Load all venues into cache
 */
async function loadVenueCache() {
  const now = Date.now();
  if (venueCache && (now - venueCacheTime) < CACHE_TTL) {
    return venueCache;
  }

  console.log('  📦 Loading venue cache...');
  const snapshot = await db.collection('activities').get();

  venueCache = {
    byId: new Map(),
    byNormalizedName: new Map(),
    byGeohash: new Map(),
    byAddress: new Map(),
    all: []
  };

  snapshot.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };

    // Index by ID
    venueCache.byId.set(doc.id, data);

    // Index by normalized name + city + state
    const city = data.city || data.location?.city || '';
    const state = data.state || '';
    const nameKey = normalize(`${data.name} ${city} ${state}`);
    if (!venueCache.byNormalizedName.has(nameKey)) {
      venueCache.byNormalizedName.set(nameKey, []);
    }
    venueCache.byNormalizedName.get(nameKey).push(data);

    // Index by core name (for chain matching)
    const coreName = normalize(extractCoreName(data.name));
    const coreKey = `${coreName}|${normalize(city)}|${state.toUpperCase()}`;
    if (!venueCache.byNormalizedName.has(coreKey)) {
      venueCache.byNormalizedName.set(coreKey, []);
    }
    venueCache.byNormalizedName.get(coreKey).push(data);

    // Index by geohash (6 chars = ~1.2km precision)
    const lat = data.location?.coordinates?.latitude || data.location?.latitude;
    const lng = data.location?.coordinates?.longitude || data.location?.longitude;
    if (lat && lng) {
      const gh = ngeohash.encode(lat, lng, 6);
      if (!venueCache.byGeohash.has(gh)) {
        venueCache.byGeohash.set(gh, []);
      }
      venueCache.byGeohash.get(gh).push(data);
    }

    // Index by normalized address
    const address = normalize(data.location?.address || data.address || '');
    if (address && address.length > 5) {
      if (!venueCache.byAddress.has(address)) {
        venueCache.byAddress.set(address, []);
      }
      venueCache.byAddress.get(address).push(data);
    }

    venueCache.all.push(data);
  });

  venueCacheTime = now;
  console.log(`  📦 Loaded ${venueCache.all.length} venues into cache`);

  return venueCache;
}

/**
 * Calculate string similarity (simple Jaccard-like)
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  const setA = new Set(normalize(a).split(' '));
  const setB = new Set(normalize(b).split(' '));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Calculate distance between two points (Haversine)
 */
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find matching venue for an event
 *
 * @param {Object} eventData - Event data with venue, location info
 * @param {string} eventData.venue - Venue name from event
 * @param {string} eventData.city - City name
 * @param {string} eventData.state - State abbreviation
 * @param {string} eventData.address - Street address
 * @param {number} eventData.latitude - Latitude
 * @param {number} eventData.longitude - Longitude
 * @returns {Object|null} Matching venue or null
 */
async function findMatchingVenue(eventData) {
  const cache = await loadVenueCache();

  const { venue, city, state, address, latitude, longitude } = eventData;

  if (!venue) return null;

  // Strategy 1: Exact ID match
  const expectedId = createActivityId(venue, city, state);
  if (cache.byId.has(expectedId)) {
    return cache.byId.get(expectedId);
  }

  // Strategy 2: Normalized name match
  const nameKey = normalize(`${venue} ${city} ${state}`);
  const nameMatches = cache.byNormalizedName.get(nameKey);
  if (nameMatches && nameMatches.length > 0) {
    return nameMatches[0];
  }

  // Strategy 3: Core name match (for chains like "Sky Zone Gambrills" -> "Sky Zone")
  const coreName = normalize(extractCoreName(venue));
  const coreKey = `${coreName}|${normalize(city)}|${(state || '').toUpperCase()}`;
  const coreMatches = cache.byNormalizedName.get(coreKey);
  if (coreMatches && coreMatches.length > 0) {
    // If multiple matches, find closest by coordinates
    if (latitude && longitude && coreMatches.length > 1) {
      let closest = null;
      let closestDist = Infinity;
      for (const m of coreMatches) {
        const mLat = m.location?.coordinates?.latitude || m.location?.latitude;
        const mLng = m.location?.coordinates?.longitude || m.location?.longitude;
        if (mLat && mLng) {
          const d = distance(latitude, longitude, mLat, mLng);
          if (d < closestDist) {
            closestDist = d;
            closest = m;
          }
        }
      }
      if (closest && closestDist < 5000) { // Within 5km
        return closest;
      }
    }
    return coreMatches[0];
  }

  // Strategy 4: Address match
  if (address) {
    const normalizedAddr = normalize(address);
    const addrMatches = cache.byAddress.get(normalizedAddr);
    if (addrMatches && addrMatches.length > 0) {
      return addrMatches[0];
    }
  }

  // Strategy 5: Geohash proximity match + name similarity
  if (latitude && longitude) {
    const eventGeohash = ngeohash.encode(latitude, longitude, 6);
    const nearbyVenues = cache.byGeohash.get(eventGeohash) || [];

    // Also check adjacent geohashes
    const neighbors = ngeohash.neighbors(eventGeohash);
    for (const n of Object.values(neighbors)) {
      const nVenues = cache.byGeohash.get(n) || [];
      nearbyVenues.push(...nVenues);
    }

    if (nearbyVenues.length > 0) {
      // Find best match by name similarity
      let bestMatch = null;
      let bestScore = 0;

      for (const v of nearbyVenues) {
        const sim = similarity(venue, v.name);
        if (sim > bestScore && sim > 0.5) { // At least 50% similar
          bestScore = sim;
          bestMatch = v;
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }
  }

  return null;
}

/**
 * Get or create activity for a venue
 * First tries to find existing match, then creates new if needed
 */
async function getOrCreateVenue(eventData, options = {}) {
  const { venue, city, state, address, latitude, longitude, zipCode } = eventData;
  const { category = 'Entertainment', subcategory = 'Family Entertainment' } = options;

  // Skip invalid venues
  const invalidPatterns = [
    /^your home$/i, /^online$/i, /^virtual$/i, /^tbd$/i, /^various/i,
    /^everywhere$/i, /^see website$/i, /^n\/a$/i, /^anywhere$/i
  ];

  if (!venue || invalidPatterns.some(p => p.test(venue))) {
    return null;
  }

  // Reject venue names that are clearly scraped page dumps or event data
  if (venue.length > 150) {
    console.log(`  ⚠️ Skipping venue with excessively long name (${venue.length} chars): "${venue.substring(0, 60)}..."`);
    return null;
  }
  // Reject names containing embedded date/time patterns (e.g., "Budgeting...Tuesday, April 07: 6:00pm")
  if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2}/i.test(venue) &&
      /\d{1,2}:\d{2}\s*(am|pm)/i.test(venue)) {
    console.log(`  ⚠️ Skipping venue with embedded date/time: "${venue.substring(0, 60)}..."`);
    return null;
  }
  // Reject names that appear to contain multiple events (repeated structural patterns)
  if ((venue.match(/Registration/gi) || []).length >= 2 ||
      (venue.match(/Age group/gi) || []).length >= 2) {
    console.log(`  ⚠️ Skipping venue that appears to be a page dump: "${venue.substring(0, 60)}..."`);
    return null;
  }

  // Try to find existing venue
  const existingVenue = await findMatchingVenue(eventData);
  if (existingVenue) {
    return existingVenue.id;
  }

  // Create new venue if we have enough info
  if (!city || !state) {
    return null;
  }

  const activityId = createActivityId(venue, city, state);
  const activityRef = db.collection('activities').doc(activityId);
  const activityDoc = await activityRef.get();

  if (!activityDoc.exists) {
    const activityData = {
      id: activityId,
      name: venue,
      venue: venue,
      category: category,
      subcategory: subcategory,
      state: state,
      city: city,
      location: {
        name: venue,
        address: address || '',
        city: city,
        state: state,
        zipCode: zipCode || ''
      },
      source: 'auto-created-by-scraper',
      active: true
    };

    if (latitude && longitude) {
      activityData.location.coordinates = { latitude, longitude };
      activityData.geohash = ngeohash.encode(latitude, longitude, 7);
    }

    await activityRef.set(activityData);

    // Add new venue to cache directly instead of invalidating entire cache
    if (venueCache) {
      const newVenue = { id: activityId, ...activityData };
      venueCache.byId.set(activityId, newVenue);
      venueCache.all.push(newVenue);

      // Index by normalized name
      const nameKey = normalize(`${venue} ${city} ${state}`);
      if (!venueCache.byNormalizedName.has(nameKey)) {
        venueCache.byNormalizedName.set(nameKey, []);
      }
      venueCache.byNormalizedName.get(nameKey).push(newVenue);

      // Index by geohash if coordinates exist
      if (latitude && longitude) {
        const gh = ngeohash.encode(latitude, longitude, 6);
        if (!venueCache.byGeohash.has(gh)) {
          venueCache.byGeohash.set(gh, []);
        }
        venueCache.byGeohash.get(gh).push(newVenue);
      }
    }
  }

  return activityId;
}

/**
 * Get or create activity with full data (for activity scrapers)
 * Handles rich venue data including hours, amenities, etc.
 *
 * @param {Object} activityData - Full activity data
 * @param {Object} options - Options including source name
 * @returns {Object} { id, isNew, updated } - Activity ID and status
 */
async function getOrCreateActivity(activityData, options = {}) {
  const { admin } = require('./helpers/supabase-adapter');
  const { source = 'activity-scraper' } = options;

  const name = activityData.name;
  const city = activityData.location?.city || activityData.city;
  const state = activityData.state;
  const latitude = activityData.location?.coordinates?.latitude || activityData.latitude;
  const longitude = activityData.location?.coordinates?.longitude || activityData.longitude;
  const address = activityData.location?.address || activityData.address;

  if (!name || !city || !state) {
    return { id: null, isNew: false, updated: false };
  }

  // Try to find existing venue using matching strategies
  const existingVenue = await findMatchingVenue({
    venue: name,
    city,
    state,
    address,
    latitude,
    longitude
  });

  if (existingVenue) {
    // Update existing venue with new data
    const updateData = {
      'metadata.lastSeen': admin.firestore.FieldValue.serverTimestamp(),
      'metadata.scrapedAt': admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only update fields if they have values
    if (activityData.hours) updateData.hours = activityData.hours;
    if (activityData.website) updateData.website = activityData.website;
    if (activityData.phone) updateData.phone = activityData.phone;
    if (activityData.cost) updateData.cost = activityData.cost;
    if (activityData.amenities) updateData.amenities = activityData.amenities;
    if (activityData.description) updateData.description = activityData.description;
    if (activityData.filters) updateData.filters = activityData.filters;

    await db.collection('activities').doc(existingVenue.id).update(updateData);
    return { id: existingVenue.id, isNew: false, updated: true };
  }

  // Create new activity with standard ID
  const activityId = createActivityId(name, city, state);
  const activityRef = db.collection('activities').doc(activityId);
  const existingDoc = await activityRef.get();

  if (existingDoc.exists) {
    // Update existing document (found by ID but not by matching)
    const updateData = {
      'metadata.lastSeen': admin.firestore.FieldValue.serverTimestamp(),
      'metadata.scrapedAt': admin.firestore.FieldValue.serverTimestamp(),
    };
    if (activityData.hours) updateData.hours = activityData.hours;
    if (activityData.website) updateData.website = activityData.website;
    if (activityData.phone) updateData.phone = activityData.phone;
    if (activityData.cost) updateData.cost = activityData.cost;
    if (activityData.amenities) updateData.amenities = activityData.amenities;
    if (activityData.description) updateData.description = activityData.description;
    if (activityData.filters) updateData.filters = activityData.filters;

    await activityRef.update(updateData);
    return { id: activityId, isNew: false, updated: true };
  }

  // Create new activity with full data
  const newActivity = {
    ...activityData,
    id: activityId,
    metadata: {
      ...(activityData.metadata || {}),
      source: source,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  };

  // Ensure geohash is set
  if (latitude && longitude && !newActivity.geohash) {
    newActivity.geohash = ngeohash.encode(latitude, longitude, 7);
  }

  await activityRef.set(newActivity);

  // Add to cache directly instead of full invalidation
  if (venueCache) {
    const newVenue = { id: activityId, ...newActivity };
    venueCache.byId.set(activityId, newVenue);
    venueCache.all.push(newVenue);

    const nameKey = normalize(`${name} ${city} ${state}`);
    if (!venueCache.byNormalizedName.has(nameKey)) {
      venueCache.byNormalizedName.set(nameKey, []);
    }
    venueCache.byNormalizedName.get(nameKey).push(newVenue);

    if (latitude && longitude) {
      const gh = ngeohash.encode(latitude, longitude, 6);
      if (!venueCache.byGeohash.has(gh)) {
        venueCache.byGeohash.set(gh, []);
      }
      venueCache.byGeohash.get(gh).push(newVenue);
    }
  }

  return { id: activityId, isNew: true, updated: false };
}

/**
 * Clear the venue cache (useful for testing)
 */
function clearCache() {
  venueCache = null;
  venueCacheTime = 0;
}

/**
 * Simple helper to link an event to a venue
 * Use this when you have an event object and want to add activityId to it
 *
 * @param {Object} event - Event object with venue, city, state, location info
 * @returns {Promise<string|null>} Activity ID or null if venue couldn't be linked
 */
async function linkEventToVenue(event) {
  const venue = event.venue || event.location?.name;
  const city = event.city || event.location?.city;
  const state = event.state || event.location?.state;
  const address = event.address || event.location?.address;
  const latitude = event.latitude || event.location?.coordinates?.latitude || event.location?.latitude;
  const longitude = event.longitude || event.location?.coordinates?.longitude || event.location?.longitude;

  if (!venue || !city || !state) {
    return null;
  }

  return await getOrCreateVenue({
    venue,
    city,
    state,
    address,
    latitude,
    longitude
  }, {
    category: event.category || 'Learning & Culture',
    subcategory: event.subcategory || 'Library'
  });
}

module.exports = {
  findMatchingVenue,
  getOrCreateVenue,
  getOrCreateActivity,
  linkEventToVenue,
  createActivityId,
  extractCoreName,
  normalize,
  clearCache,
  loadVenueCache
};
