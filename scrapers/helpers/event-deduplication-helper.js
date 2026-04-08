/**
 * EVENT DEDUPLICATION HELPER
 *
 * Provides normalized text comparison and duplicate detection for events.
 * Used by event-save-helper.js and cleanup scripts.
 *
 * Usage:
 *   const { findExistingDuplicate } = require('./event-deduplication-helper');
 *   const result = await findExistingDuplicate(eventData);
 *   if (result.isDuplicate) { skip saving }
 */

const { db } = require('./supabase-adapter');

/**
 * Normalize text for fuzzy comparison
 * - Lowercase
 * - Remove punctuation except hyphens
 * - Collapse whitespace
 * - Remove common filler words
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')        // Remove punctuation except hyphens
    .replace(/\s+/g, ' ')            // Collapse whitespace
    .replace(/\b(the|a|an|at|in|on|for|to|of|and|&)\b/gi, '') // Remove filler words
    .replace(/\s+/g, ' ')            // Re-collapse after filler removal
    .trim();
}

/**
 * Check if eventDate contains a valid date (not just time)
 * Returns false for time-only strings like "2:00 PM" or "2:00pm - 4:00pm"
 */
function isValidEventDate(dateStr) {
  if (!dateStr) return false;

  // Time-only patterns: "2:00 PM", "2:00pm - 4:00pm", "10:00am"
  // Check if it starts with time and doesn't contain month/day
  if (/^\d{1,2}:\d{2}\s*[ap]m/i.test(dateStr) &&
      !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(dateStr) &&
      !/\d{1,2}\/\d{1,2}/.test(dateStr)) {
    return false;  // Time-only, no date
  }

  // Must contain month name OR MM/DD pattern OR day number with month context
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})/i.test(dateStr);
}

/**
 * Extract just the date portion from an eventDate string, ignoring time
 * "December 26, 2025 1:00pm" -> "december 26 2025"
 * "December 26, 2025" -> "december 26 2025"
 */
function extractDateOnly(dateStr) {
  if (!dateStr) return '';

  // Remove time patterns: "1:00pm", "1:00 PM", "10:00am–12:00pm", etc.
  let cleaned = dateStr
    .replace(/\d{1,2}:\d{2}\s*[ap]m\s*[-–]\s*\d{1,2}:\d{2}\s*[ap]m/gi, '')  // Time ranges
    .replace(/\d{1,2}:\d{2}\s*[ap]m/gi, '')  // Single times
    .replace(/\d{1,2}:\d{2}/g, '')  // 24-hour times
    .trim();

  return normalizeText(cleaned);
}

/**
 * Create a deduplication key from event details
 * Key format: normalizedName|normalizedDate|normalizedVenue
 */
function createDedupeKey(name, eventDate, venue) {
  const normalizedName = normalizeText(name);
  const normalizedDate = normalizeText(eventDate);
  const normalizedVenue = normalizeText(venue || '');
  return `${normalizedName}|${normalizedDate}|${normalizedVenue}`;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Jaccard similarity on word tokens
 */
function calculateSimilarity(str1, str2) {
  const tokens1 = new Set(normalizeText(str1).split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(normalizeText(str2).split(' ').filter(t => t.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) {
    // Fallback to exact normalized match for short strings
    return normalizeText(str1) === normalizeText(str2) ? 1.0 : 0;
  }

  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;

  return intersection / union;
}

/**
 * Check if two events are duplicates based on fuzzy matching
 * Returns: { isDuplicate: boolean, confidence: number, reason: string }
 */
function areEventsDuplicates(event1, event2, threshold = 0.7) {
  // Exact URL match is always a duplicate
  if (event1.url && event2.url && event1.url === event2.url) {
    return { isDuplicate: true, confidence: 1.0, reason: 'exact_url_match' };
  }

  // Check date validity - time-only strings are invalid dates
  const date1Valid = isValidEventDate(event1.eventDate);
  const date2Valid = isValidEventDate(event2.eventDate);
  // Extract just the date portion, ignoring any time component
  // "December 26, 2025 1:00pm" and "December 26, 2025" should match
  const date1 = extractDateOnly(event1.eventDate);
  const date2 = extractDateOnly(event2.eventDate);

  // Only reject as "different_dates" if BOTH dates are valid and different
  // If one or both dates are invalid (time-only), continue to name/venue comparison
  if (date1Valid && date2Valid && date1 !== date2) {
    return { isDuplicate: false, confidence: 0, reason: 'different_dates' };
  }

  // Compare venues/locations first
  const venue1 = event1.venue || event1.location?.name || event1.location?.city || '';
  const venue2 = event2.venue || event2.location?.name || event2.location?.city || '';
  const venueSimilarity = calculateSimilarity(venue1, venue2);

  // Compare names
  const nameSimilarity = calculateSimilarity(event1.name, event2.name);
  const name1 = normalizeText(event1.name);
  const name2 = normalizeText(event2.name);

  // SAME VENUE + SAME DATE = likely duplicate (even with different names)
  // Events at the exact same venue on the same date are almost always duplicates
  if (venueSimilarity >= 0.9 && date1 === date2) {
    // Check if names share any significant words (3+ chars)
    const words1 = new Set(name1.split(' ').filter(w => w.length >= 3));
    const words2 = new Set(name2.split(' ').filter(w => w.length >= 3));
    const sharedWords = [...words1].filter(w => words2.has(w));

    if (sharedWords.length >= 2) {
      return { isDuplicate: true, confidence: 0.9, reason: 'same_venue_same_date_shared_words' };
    }
  }

  // If names are very similar (>= 0.8), it's likely a duplicate
  if (nameSimilarity >= 0.8) {
    return { isDuplicate: true, confidence: nameSimilarity, reason: 'high_name_similarity' };
  }

  // Also check if one name contains the other (substring match)
  if (name1 && name2 && (name1.includes(name2) || name2.includes(name1))) {
    // Substring match - check venues to confirm
    if (venueSimilarity >= 0.5) {
      return { isDuplicate: true, confidence: 0.85, reason: 'name_substring_venue_match' };
    }
  }

  // Weighted score: name is more important
  const confidence = (nameSimilarity * 0.7) + (venueSimilarity * 0.3);

  return {
    isDuplicate: confidence >= threshold,
    confidence,
    reason: confidence >= threshold ? 'fuzzy_match' : 'below_threshold'
  };
}

/**
 * Check Firestore for existing duplicate event
 * Queries by date first (indexed), then checks name similarity
 *
 * @param {Object} eventData - Event to check { name, eventDate, venue, url, location }
 * @param {Object} options - { threshold: 0.7, limit: 100 }
 * @returns {Promise<{isDuplicate: boolean, existingId?: string, confidence?: number}>}
 */
async function findExistingDuplicate(eventData, options = {}) {
  const { threshold = 0.7, limit = 100 } = options;

  const hasValidDate = isValidEventDate(eventData.eventDate);

  // If no date or invalid date (time-only), flag it
  if (!eventData.eventDate || !hasValidDate) {
    return {
      isDuplicate: false,
      hasInvalidDate: true,
      dateValue: eventData.eventDate || null
    };
  }

  // Query events with same date (fast indexed query)
  const snapshot = await db.collection('events')
    .where('eventDate', '==', eventData.eventDate)
    .limit(limit)
    .get();

  if (snapshot.empty) {
    return { isDuplicate: false };
  }

  // Check each for similarity
  for (const doc of snapshot.docs) {
    const existing = doc.data();
    const result = areEventsDuplicates(eventData, existing, threshold);

    if (result.isDuplicate) {
      return {
        isDuplicate: true,
        existingId: doc.id,
        existingSource: existing.metadata?.sourceName,
        confidence: result.confidence,
        reason: result.reason
      };
    }
  }

  return { isDuplicate: false };
}

module.exports = {
  normalizeText,
  isValidEventDate,
  extractDateOnly,
  createDedupeKey,
  calculateSimilarity,
  areEventsDuplicates,
  findExistingDuplicate
};
