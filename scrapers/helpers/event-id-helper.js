/**
 * EVENT ID HELPER
 *
 * Generates consistent, unique event IDs from event URLs for better deduplication
 * and updates instead of creating duplicates.
 */

const crypto = require('crypto');

/**
 * Generate a consistent event ID from a URL
 * @param {string} url - The event URL
 * @returns {string} - A URL-safe event ID (max 30 chars)
 */
function generateEventId(url) {
  if (!url) {
    // Fallback to random ID if no URL provided
    return crypto.randomBytes(15).toString('base64url').substring(0, 30);
  }

  // Create hash of URL for consistent ID
  const hash = crypto.createHash('sha256').update(url).digest('base64url');

  // Return first 30 chars (Firestore document ID limit considerations)
  return hash.substring(0, 30);
}

/**
 * Generate a fallback event ID from event details
 * Used when URL is not available
 * @param {string} name - Event name
 * @param {string} date - Event date
 * @param {string} location - Event location
 * @returns {string} - A consistent event ID
 */
function generateEventIdFromDetails(name, date, location) {
  const combined = `${name}|${date}|${location}`.toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(combined).digest('base64url');
  return hash.substring(0, 30);
}

module.exports = {
  generateEventId,
  generateEventIdFromDetails
};
