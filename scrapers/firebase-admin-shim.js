/**
 * FIREBASE ADMIN SHIM
 * Provides a firebase-admin compatible interface that routes to Supabase.
 * This allows scraper files that `require('firebase-admin')` to work
 * without code changes, while all writes go to Supabase.
 *
 * Usage: In package.json or via NODE_PATH, this file can be required
 * as a drop-in replacement. Or use the resolve-alias approach below.
 */

const { db, supabase } = require('./helpers/supabase-adapter');

// Mimic firebase-admin's interface
const shim = {
  apps: [true], // Pretend already initialized

  initializeApp() {
    // No-op — Supabase is already initialized in the adapter
    console.log('ℹ️  Firebase Admin shim: initializeApp() called — using Supabase instead');
    return this;
  },

  credential: {
    cert() { return {}; },
    applicationDefault() { return {}; },
  },

  firestore() {
    return db;
  },

  // Field values used by some scrapers
  firestore: Object.assign(
    function() { return db; },
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

module.exports = shim;
