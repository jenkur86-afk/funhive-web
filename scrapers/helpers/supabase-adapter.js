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
const ngeohash = require('ngeohash');
const { normalizeAgeRange } = require('./age-range-normalizer');
// Lazy-loaded state centroids — used as a last-resort safety net so events and
// activities never land with a null location when at least the state is known.
let _STATE_CENTROIDS = null;
function getStateCentroid(state) {
  if (!state) return null;
  if (!_STATE_CENTROIDS) {
    try {
      _STATE_CENTROIDS = require('./geocoding-helper').STATE_CENTROIDS || {};
    } catch (e) {
      _STATE_CENTROIDS = {};
    }
  }
  return _STATE_CENTROIDS[state] || null;
}

// ============================================================================
// STABLE-ID DERIVATION — for the .add() Firestore-compat path.
// Caught 2026-05-14: 3576 duplicates because scrapers call `.add()` without
// setting data.id, and the old fallback was `crypto.randomUUID()` (different
// every call). Now we hash content to get a deterministic id, so re-scrapes
// of the same event upsert to the same row.
// ============================================================================
function _hash30(s) {
  return crypto.createHash('sha256').update(s).digest('base64url').substring(0, 30);
}
function _normalizeUrl(u) {
  if (!u || typeof u !== 'string') return '';
  try {
    const url = new URL(u);
    // Strip query string + fragment + trailing slash — those are the common
    // sources of URL drift between scrape runs.
    return `${url.origin}${url.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch (_) {
    return u.trim().toLowerCase();
  }
}
function _stableEventId(data) {
  // 1) Prefer URL — most stable across re-scrapes.
  const url = data.url || data.source_url || data.sourceUrl || (data.metadata && data.metadata.sourceUrl) || '';
  const normUrl = _normalizeUrl(url);
  if (normUrl) return _hash30(`url:${normUrl}`);
  // 2) Fallback: name|eventDate|venue (matches Step 2b dedup key + DB unique constraint).
  const name = (data.name || '').toLowerCase().trim();
  const date = (data.eventDate || data.event_date || '').toLowerCase().trim();
  const venue = (data.venue || '').toLowerCase().trim();
  if (name && date && venue) return _hash30(`evt:${name}|${date}|${venue}`);
  // 3) Last resort: random UUID. Means we couldn't tell anything about the
  // event — better to insert and let the cleanup script find it later than
  // to drop the row.
  return crypto.randomUUID();
}
function _stableActivityId(data) {
  const url = data.url || data.website || (data.contact && data.contact.website) || '';
  const normUrl = _normalizeUrl(url);
  if (normUrl) return _hash30(`url:${normUrl}`);
  const name = (data.name || '').toLowerCase().trim();
  const city = (data.city || (data.location && data.location.city) || '').toLowerCase().trim();
  const state = (data.state || (data.location && data.location.state) || '').toLowerCase().trim();
  if (name && city && state) return _hash30(`act:${name}|${city}|${state}`);
  return crypto.randomUUID();
}
function _stableIdForCollection(collection, data) {
  if (collection === 'events') return _stableEventId(data);
  if (collection === 'activities') return _stableActivityId(data);
  return crypto.randomUUID();
}

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
// STATE NORMALIZATION
// ============================================================================

// Some scrapers (and JSON-LD addressRegion fields on event pages) emit full
// state names like "Virginia" instead of the 2-letter postal code "VA".
// `state` is a TEXT column, so the bad values just sit there until a fix
// script catches them. Normalize at save time so this never reaches the DB.
const STATE_ABBREVS = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
  'colorado':'CO','connecticut':'CT','delaware':'DE','district of columbia':'DC',
  'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
  'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
  'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN',
  'mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
  'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR',
  'pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',
  'tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA',
  'washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
};

// Set of valid US 2-letter postal codes (built from STATE_ABBREVS values).
const VALID_US_STATE_CODES = new Set(Object.values(STATE_ABBREVS));

function normalizeState(rawState) {
  if (!rawState || typeof rawState !== 'string') return rawState || null;
  const trimmed = rawState.trim();
  if (!trimmed) return null;
  // Already a 2-letter code → upper-case it and validate. Anything that's
  // exactly two letters but not a real US state code (caught on 2026-05-17:
  // "BO", "GE", "RO", "US", "NI" — all city-name truncations or country codes)
  // is rejected so we don't write garbage to the activities table.
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    return VALID_US_STATE_CODES.has(upper) ? upper : null;
  }
  const abbrev = STATE_ABBREVS[trimmed.toLowerCase()];
  return abbrev || null;
}

// ============================================================================
// VENUE NAME CLEANING
// ============================================================================

/**
 * Strip room/department/floor suffixes from venue names to prevent duplicates.
 * "Aberdeen Library - Meeting Room" → "Aberdeen Library"
 * "Pratt Library - Teen Department Floor" → "Pratt Library"
 * "Main Library - Zoom Program 2" → "Main Library"
 */
const ROOM_KEYWORDS = /\b(room|meeting|conference|study|program|children|teen|makerspace|lab|studio|space|area|floor|auditorium|gallery|caf[eé]|parking|outdoor|outside|public|department|zoom|virtual|online|computer|board|storytime|story\s*time|large|small|grounds|lounge|lobby|patio|terrace|garden|courtyard|annex|wing|level|basement|lower)\b/i;

// Maps internal category slugs to the display names used by the frontend.
// The frontend's CATEGORIES array in events/page.tsx, activities/page.tsx, and
// HomeEvents.tsx uses these exact strings for both filtering and display.
const CATEGORY_SLUG_MAP = {
  'library': 'Storytimes & Library',
  'parks': 'Outdoor & Nature',
  'parks-rec': 'Outdoor & Nature',
  'parks_rec': 'Outdoor & Nature',
  'community': 'Community',
  'learning-culture': 'Arts & Culture',
  'learning_culture': 'Arts & Culture',
  'arts': 'Arts & Culture',
  'arts-culture': 'Arts & Culture',
  'festivals': 'Festivals',
  'animals': 'Animals & Wildlife',
  'wildlife': 'Animals & Wildlife',
  'indoor': 'Indoor',
  'classes': 'Classes & Workshops',
  'workshops': 'Classes & Workshops',
  'nature': 'Outdoor & Nature',
  'outdoor': 'Outdoor & Nature',
};

function normalizeCategory(cat) {
  if (!cat) return cat;
  return CATEGORY_SLUG_MAP[cat.toLowerCase().trim()] || cat;
}

function cleanVenueName(venue) {
  if (!venue || typeof venue !== 'string') return venue;
  let cleaned = venue.trim();

  // If venue contains " - " and anything after the first " - " has a room keyword,
  // keep only the part before the first " - "
  const dashIndex = cleaned.search(/\s+[-–—]\s+/);
  if (dashIndex > 0) {
    const suffix = cleaned.substring(dashIndex);
    if (ROOM_KEYWORDS.test(suffix)) {
      cleaned = cleaned.substring(0, dashIndex);
    }
  }

  // Also handle repeated name patterns like "Porter BranchPorter Branch"
  if (cleaned.length > 10) {
    const half = Math.floor(cleaned.length / 2);
    const first = cleaned.substring(0, half);
    const second = cleaned.substring(half);
    if (first === second) {
      cleaned = first;
    }
  }

  return cleaned.trim();
}

// ============================================================================
// TITLE CLEANING
// ============================================================================

// Strips bracketed/parenthetical promo-ticket cruft scrapers sometimes pick up
// from source markup, e.g. "Toddler Time (TICKET LINK)", "Fall Fest [SOLD OUT]".
// Also collapses leftover double-spaces (from HTML whitespace or the strip
// above) — harmless and desirable regardless of whether a bracket matched.
const PROMO_BRACKET_RE = /\s*[([]\s*(tickets?|ticket\s*link|buy\s*tickets?|sold\s*out|register(?:\s*(now|here))?|rsvp|click\s*here|more\s*info|link\s*in\s*bio)\s*[)\]]\s*/gi;

function stripPromoBracketCruft(title) {
  if (!title || typeof title !== 'string') return title;
  return title.replace(PROMO_BRACKET_RE, ' ').replace(/\s{2,}/g, ' ').trim();
}

// Small words kept lowercase in title-case output (except when first word).
const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

// Dot-separated initialisms like "L.Y.E", "U.S.A." — preserve as-is (uppercase)
// rather than title-casing, which would otherwise mangle them into "L.y.e".
const DOT_INITIALISM_RE = /^([A-Za-z]\.){2,}[A-Za-z]?\.?$/;

function capitalizeShoutedWord(word) {
  if (DOT_INITIALISM_RE.test(word)) return word.toUpperCase();
  const lower = word.toLowerCase();
  // Capitalize the first letter and the letter after any internal "/" or "-"
  // delimiter, e.g. "w/miss" -> "W/Miss", "drop-in" -> "Drop-In".
  return lower.replace(/(^|[/-])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Normalize a SHOUTED all-caps title to Title Case, without mangling short
 * acronyms (STEM, PTA, 4H, GLOW), dot-separated initialisms (L.Y.E, U.S.A.),
 * or already mixed-case titles.
 * Only fires when the title is long enough to be a real "shouted" sentence
 * (not a short acronym) AND the majority of its letters are uppercase.
 * A mixed-case title like "STEM Night at the Library" is left alone since
 * most of its letters are lowercase.
 */
function normalizeShoutedTitle(title) {
  if (!title || typeof title !== 'string') return title;
  const trimmed = title.trim();
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 16) return title;
  if (!/\s/.test(trimmed)) return title;
  const upperCount = (trimmed.match(/[A-Z]/g) || []).length;
  if (upperCount / letters.length < 0.85) return title;

  return trimmed.split(' ').map((word, i) => {
    if (!word) return word;
    if (i > 0 && SMALL_WORDS.has(word.toLowerCase()) && !DOT_INITIALISM_RE.test(word)) {
      return word.toLowerCase();
    }
    return capitalizeShoutedWord(word);
  }).join(' ');
}

/**
 * Derive a venue when the scraper didn't supply one.
 * Tries (in order): "X at <Venue>" / "@ <Venue>" pattern in name,
 * first comma-separated component of address (if not a street number),
 * then "<city>, <state>" as a last resort. Returns null if nothing works.
 *
 * Used as a fallback in saveEvent/flattenEvent so new rows never land with
 * venue=NULL.
 */
function deriveVenueFallback(name, address, city, state) {
  // 1. Name "at <Venue>" / "@ <Venue>"
  if (name && typeof name === 'string') {
    const cleaned = name.replace(/\s+/g, ' ').trim();
    const atMatch = cleaned.match(/\s+(?:at|@)\s+([A-Z][^!?,–—\-|]{2,80})$/);
    if (atMatch) {
      const candidate = atMatch[1].trim();
      if (!/^\d/.test(candidate) && !/^\d+\s*(am|pm)/i.test(candidate)) {
        const v = candidate.replace(/[\s\-–—|:]+$/, '').trim();
        if (v.length >= 3) return v;
      }
    }
  }

  // 2. First component of address (if not a street number / state / zip)
  if (address && typeof address === 'string') {
    const first = address.split(',')[0]?.trim() || '';
    if (
      first.length >= 3 &&
      first.length <= 80 &&
      /[a-zA-Z]/.test(first) &&
      !/^\d+\s/.test(first) &&     // skip "123 Main St"
      !/^[A-Z]{2}$/.test(first) && // skip "TX"
      !/^\d{5}/.test(first)         // skip zip
    ) {
      return first;
    }
  }

  // 3. City fallback so the event has SOMETHING
  if (city) {
    return state ? `${city}, ${state}` : String(city);
  }

  return null;
}

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

/**
 * Returns true if the string contains time tokens but no date components.
 * Examples that match (rejected by saveEvent):
 *   "2:00pm–3:00pm", "10:00am - 11:00am", "6:30pm", "2 PM-3 PM"
 * Examples that don't match (allowed through):
 *   "May 11, 2026 2:00pm–3:00pm" (contains month name)
 *   "2026-05-11" (contains date)
 *   "Saturday, May 11"
 */
function _isTimeOnlyDateString(s) {
  if (!s || typeof s !== 'string') return false;
  // If it has a year, a month name/abbrev, or an ISO/slash date — it's not time-only.
  if (/\b\d{4}\b/.test(s)) return false;                                   // year present
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)) return false;
  if (/\b(mon|tue|wed|thu|fri|sat|sun)/i.test(s)) return false;            // weekday — usually paired with date
  if (/\d{1,2}\/\d{1,2}/.test(s)) return false;                            // 4/8 style
  if (/\d{4}-\d{2}-\d{2}/.test(s)) return false;                           // ISO
  // No date markers — does it look like only times?
  return /\d{1,2}(:\d{2})?\s*[ap]\.?\s*m\.?/i.test(s);
}

// ============================================================================
// AGE DETECTION — auto-tag events with age ranges
// ============================================================================

function detectAgeRange(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  // Explicit age ranges: "ages 3-5", "age 6 to 12", "ages 0-18"
  // Check for "months" or "mo" after the range to preserve month-based ages
  const ageMatch = text.match(/\bages?\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(months?|mos?\.?)?\b/);
  if (ageMatch) {
    const isMonths = ageMatch[3] || (parseInt(ageMatch[1]) <= 36 && parseInt(ageMatch[2]) <= 36 && /month|mo\b/i.test(text));
    return isMonths ? `${ageMatch[1]}-${ageMatch[2]} months` : `${ageMatch[1]}-${ageMatch[2]}`;
  }

  // Parenthetical ages: "(ages 11-18)", "(3-5 yrs)", "(6-24 months)"
  const parenMatch = text.match(/\((?:ages?\s+)?(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*(?:months?|mos?\.?|yrs?|years?))?\)/);
  if (parenMatch) {
    const parenText = text.substring(text.indexOf(parenMatch[0]), text.indexOf(parenMatch[0]) + parenMatch[0].length + 1);
    const isMonths = /month|mo[\.\)\s]/i.test(parenText);
    return isMonths ? `${parenMatch[1]}-${parenMatch[2]} months` : `${parenMatch[1]}-${parenMatch[2]}`;
  }

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
  /\badult\s+(program|workshop|class|craft|event|coloring|book\s*club|knitting|crochet|quilting|writing|painting|literacy|swim|hour|night|social|trivia|games?|prom)\b/i,
  // "Color Your World: Adult Coloring" pattern (subtitle position)
  /:\s*adult\s+coloring\b/i,
  // Adult X program / Adult X Y program — for cases like "May Adult Workshop -
  // Adult Abstract Painting Workshop" where "adult" and the activity word are
  // separated by 1-2 modifier words (caught 2026-05-17 by data-quality-check).
  /\badult\s+\w+\s+(workshop|class|program|painting|coloring|craft|book\s*club|knitting|crochet|quilting|literacy|swim|night|social|prom)\b/i,
  /\badult\s+\w+\s+\w+\s+(workshop|class|program|painting|coloring|prom)\b/i,

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
  /\bwine\s+fest(ival)?\b/i,
  /\bwine\s+walk\b/i,
  /\bwine\s+trail\b/i,
  /\bwine\s+crawl\b/i,
  /\bwine\s+at\s+sunset\b/i,
  /\bwine\s+(and|&)\s+music\b/i,
  /\bwine\s+cup\b/i,
  /\bbeer\s+tasting\b/i,
  /\bbeer\s+fest(ival)?\b/i,
  /\bbrews?\s*fest\b/i,
  /\bbrews?\b.*\bfest\b/i,
  /\bcraft\s+beer\b/i,
  /\b(rhythm|r)\s*(and|&|n)\s*brews?\b/i,
  /\bbourbon\s+fest(ival)?\b/i,
  /\bbourbon\s+trail\b/i,
  /\bwhiskey\s+fest(ival)?\b/i,
  /\bspirits?\s+fest(ival)?\b/i,
  /\bmimosa\s+(crawl|fest|brunch)\b/i,
  /\bcocktail\s+(class|hour|making|tasting|fest)\b/i,
  /(?:and|&)\s*cocktails?\b/i,  // "Creatures & Cocktails", "Tacos & Cocktails"
  /\bhappy\s+hour\b/i,
  /\bbar\s+crawl\b/i,
  /\bpub\s+crawl\b/i,
  /\bbrewery\s+tour\b/i,
  /\bbyob\b/i,
  /\bvineyard\s+fest(ival)?\b/i,
  /\bwinery\s+tour\b/i,
  /\bcider\s+fest(ival)?\b/i,
  /\bmead(ery)?\s+fest(ival)?\b/i,
  /\bbeer\s*(,|&|and)\s*bourbon\b/i,
  /\bbeer\s*(,|&|and)\s*bbq\b/i,
  /\bbooze\b/i,

  // Dating / adult social
  /\bsingles?\s+night\b/i,
  /\bsingles?\s+(mixer|mingle|event)\b/i,
  /\bspeed\s+dating\b/i,
  /\bdate\s+night\b/i,
  /\bburlesque\b/i,
  /\bnight\s*club\b/i,
  // Moms/dads/parents night out (without kids — these are explicitly
  // adult-only socials, not family events). Caught one on 2026-05-05 via
  // "adults only" — adding explicit patterns so we don't rely on that.
  /\b(mom'?s?|moms|mama'?s?|mamas|mommy)\s+night\s+out\b/i,
  /\b(dad'?s?|dads|daddy|papa)\s+night\s+out\b/i,
  /\bparents?\s+night\s+out\s+\(no\s+kids?\)/i,
  /\bgirls?\s+night\s+out\b/i,
  /\bladies?\s+night\b/i,

  // Explicit adult content
  /\bsexy\b/i,
  /\bsensual\b/i,
  /\berotic\b/i,
  /\bkink\b/i,

  // Cannabis / drugs (420 is handled in NAME_ONLY_NON_FAMILY_PATTERNS above)
  /\bcannabis\b/i,
  /\bmarijuana\b/i,
  /\bstoner\b/i,
  /\bdrug\s*take\s*back\b/i,

  // Firearms / gambling
  /\bgambling\b/i,
  /\bgun\s*show\b/i,
  /\bfirearms?\s*(show|expo|sale)\b/i,

  // Adult library / community programs
  /\bbook\s+club\b/i,
  /\bknitting\s+(circle|club|group)\b/i,
  /\bquilting\b/i,
  /\bcrochet\s+(circle|club|group)\b/i,
  /\bmahjong\b/i,
  /\bbridge\s+club\b/i,
  /\bjob\s+(search|seeker|fair|workshop)\b/i,
  /\bresume\s+(writing|workshop|help|review|clinic)\b/i,
  /\bcareer\s+(coach|counseli?ng|fair|services|workshop)\b/i,
  /\binterview\s+(prep|skills|workshop|tips)\b/i,
  /\bnetworking\s+(event|mixer|session|group)\b/i,
  /\bprofessional\s+development\b/i,
  /\blinkedin\s+(workshop|profile|class)\b/i,
  /\bcover\s+letter\b/i,
  /\bworkforce\s+(development|training)\b/i,
  /\btax\s+(prep|help|assistance|filing|clinic)\b/i,
  /\bestate\s+planning\b/i,
  /\bretirement\s+planning\b/i,
  /\bsocial\s+security\s+(workshop|info|seminar)\b/i,
  /\bscam[\s-]proof/i,
  /\bfraud\s+prevention\b/i,
  /\bgenealogy\b/i,
  /\bblood\s+(drive|donation)\b/i,
  /\bnarcan\b/i,

  // Promotional / submit-your-event junk
  /\bsubmit\s+(it\s+to|your|an?\s+event)\b/i,
  /\bpost\s+your\s+event\b/i,
  /\bcheat\s+sheet\b/i,
  /\blooking\s+for\s+library\s+story\s+times\b/i,
  /\bstart\s+here!?\s*$/i,
  /\bvisit\s+our\s+(full\s+)?guide\b/i,
  // Trader Joe's "Get a Free Carnation" Mother's Day cross-syndicated promo
  // (appeared in 40+ MacaroniKid feeds in May 2026 with no real venue)
  /\bfree\s+carnation\b/i,
  // "Local Library Activities & Events" — generic aggregator link, not an event
  /^local\s+library\s+activit(y|ies)\b/i,
  // "Plan Your Family Fun" — MK aggregator nav link
  /^plan\s+your\s+family\s+fun\b/i,

  // Newsletter / mailing list sign-up promo events
  /\bjoin\s+our\s+e-?newsletter\b/i,
  /\byou'?re\s+invited\b.*\be-?newsletter\b/i,
  /\bsign\s+up\s+for\s+(our\s+)?(e-?)?newsletter\b/i,
  /\bsubscribe\s+to\s+(our\s+)?(e-?)?newsletter\b/i,
  /\bjoin\s+our\s+(email|mailing)\s+list\b/i,
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
  /\bstory\s*time\b/i,
  /\bpuppet/i,
  /\bteen/i,
  /\byouth\b/i,
  /\bjunior\b/i,
  /\bpreschool/i,
  /\belementary/i,
  /\bexplorer/i,
  /\bmagic\s+(show|trick|class|camp|workshop|explorers?)\b/i,
  /\bfarmers?\s*market\b/i,
  /\bcarnival\b/i,
  /\bmusical\b/i,
  /\btheater\b/i,
  /\btheatre\b/i,
  /\bswim\b/i,
  /\bkaraoke\b/i,
  /\bbingo\b/i,
  /\bspring\s*fest\b/i,
  /\bfood\s+truck/i,
  /\bhome\s+game\b/i,
  /\bsoccer\b|rugby|football/i,
  /\bfirst\s+friday\b/i,
  /\bfirst\s+thursday\b/i,
  /\bgarden\b/i,
  /\bbotanical\b/i,
  // Specific titles seen on 2026-05-17 audit that were flagged as adult but
  // are actually family/teen library programs. "Coloring Club" appeared 3x
  // for Wythe-Grayson Regional Library — they run a multi-age coloring club.
  // "Zen Art" / "Zen Coloring" is typically a teen library program.
  // These match only when the title doesn't ALSO contain "adult" (the
  // explicit-adult check in isFalsePositive runs first and bypasses rescue).
  /\bcoloring\s+club\b/i,
  /\bzen\s+(art|coloring|tangle|doodle)\b/i,
];

// Venue-name patterns that indicate non-family venues (checked separately)
// These only trigger if the EVENT name+description does NOT have a family rescue pattern
const NON_FAMILY_VENUE_PATTERNS = [
  /\bbrewing\s*(co\.?|company)?\b/i,
  /\bbrewery\b/i,
  /\bbrew\s*(pub|house|works)\b/i,
  /\btaproom\b/i,
  /\btap\s*house\b/i,
  /\bwinery\b/i,
  /\bvineyards?\b/i,
  /\bdistillery\b/i,
  /\btavern\b/i,
  /\bsaloon\b/i,
  /\bale\s*house\b/i,
  /\breal\s+ale\b/i,
  /\bbeer\s*(garden|hall|bar)\b/i,
  /\bcocktail\s*(bar|lounge)\b/i,
  /\bspeakeasy\b/i,
];

// Patterns that should only be checked against the event name, not description.
// "420" as a room number, date, or address number appears in many library
// descriptions (e.g., "We meet in Room 420"). Cannabis events reliably put
// "420" in their title, not just a description.
const NAME_ONLY_NON_FAMILY_PATTERNS = [
  /\b420\b/i,
];

function isNonFamilyEvent(name, description, venue) {
  const text = `${name || ''} ${description || ''}`;
  const nameOnly = name || '';

  // Check name-only patterns first (these must not fire on description alone)
  for (const pattern of NAME_ONLY_NON_FAMILY_PATTERNS) {
    if (pattern.test(nameOnly)) {
      const rescued = FAMILY_RESCUE_PATTERNS.some(fp => fp.test(text));
      if (!rescued) return pattern.source;
    }
  }

  for (const pattern of NON_FAMILY_PATTERNS) {
    if (pattern.test(text)) {
      const rescued = FAMILY_RESCUE_PATTERNS.some(fp => fp.test(text));
      if (!rescued) return pattern.source;
    }
  }

  // Check venue name for bar/brewery patterns (only if event itself isn't obviously family)
  if (venue) {
    const eventText = `${name || ''} ${description || ''}`;
    const isRescued = FAMILY_RESCUE_PATTERNS.some(fp => fp.test(eventText));
    if (!isRescued) {
      for (const pattern of NON_FAMILY_VENUE_PATTERNS) {
        if (pattern.test(venue)) {
          return `venue: ${pattern.source}`;
        }
      }
    }
  }

  return null;
}

// ============================================================================
// CANCELLED/CLOSED EVENT DETECTION
// ============================================================================

function isCancelledEvent(name, description) {
  const nameStr = (name || '').trim();
  const descStr = (description || '').trim();
  const text = `${nameStr} ${descStr}`;

  // Strong signals in the NAME — these almost always mean the event is cancelled
  if (/\b(cancelled|canceled|postponed|suspended|rescheduled)\b/i.test(nameStr)) {
    if (!/\b(not\s+cancelled|not\s+canceled|rain\s+or\s+shine|unless\s+cancelled)\b/i.test(nameStr)) {
      return true;
    }
  }

  // "closed" in the NAME only if it means the event is closed (not "roads closed", "doors closed at 6pm", etc.)
  // Match: "event closed", "closed for season", "closed permanently", "temporarily closed"
  // Skip: "road closed", "doors close at", "gates close", "box office closed"
  if (/\bclosed\b/i.test(nameStr) && /\b(event|season|permanently|temporarily|until\s+further)\b/i.test(nameStr)) {
    return true;
  }

  // Facility/library closure notices — Communico libraries publish these as calendar entries.
  // "Library Closed", "All CCPL Locations Closed", "Branch Closed for Juneteenth", etc.
  if (/\b(library|branch[es]?|location[s]?|center)\s+closed\b/i.test(nameStr)) return true;

  // Strong signals in the DESCRIPTION — only cancelled/postponed/suspended (NOT "closed")
  // "closed" in descriptions causes too many false positives (gates close, road closed, registration closed, etc.)
  if (/\b(cancelled|canceled|postponed|suspended)\b/i.test(descStr)) {
    if (!/\b(not\s+cancelled|not\s+canceled|rain\s+or\s+shine|unless\s+cancelled|if\s+cancelled)\b/i.test(descStr)) {
      return true;
    }
  }

  // Scraper artifacts — error pages, 404s, "page no longer exists"
  if (/\b(page\s+(you\s+requested\s+)?(no\s+longer\s+exists|not\s+found|cannot\s+be\s+found|has\s+been\s+removed|does\s+not\s+exist))\b/i.test(text)) return true;
  if (/\b(404\s*(error|not\s+found)?|error\s+404)\b/i.test(nameStr)) return true;
  if (/\b(access\s+denied|forbidden|unauthorized)\b/i.test(nameStr)) return true;

  return false;
}

// ============================================================================
// JUNK TITLE DETECTION — reject scraper-extracted nav/footer/menu junk
// ============================================================================

/**
 * Detect titles that are clearly not real event names — extracted nav links,
 * footer items, all-caps menu strings, gibberish, etc. Used by saveEvent()
 * to reject these at scrape time so they never hit the DB.
 *
 * Returns true if the title is junk and the event should be skipped.
 */
function isJunkTitle(name) {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();

  // Empty or extremely short — but allow 3-4 char real event names (GLOW, PAWS, WORM, 4H)
  if (trimmed.length < 3) return true;

  // (Removed prior "all caps short" rule — it was rejecting legitimate MacaroniKid
  // titles like "GLOW", "KIDS FIT", "TOT ROCK", "STEAM CLUB". The explicit NAV_JUNK
  // list below catches the real menu acronyms.)

  // Common navigation / boilerplate strings
  const NAV_JUNK = [
    /^(home|about|contact|menu|search|login|sign\s*in|sign\s*up|register|subscribe)$/i,
    /^(about|contact)\s+us$/i,
    /^(log|sign)\s+(in|out|up)$/i,
    /^(events?|calendar|schedule|programs?|services?|resources?|news|blog)$/i,
    /^(faq|faqs|terms|privacy|policy|sitemap|copyright|all\s*rights\s*reserved)$/i,
    /^our\s+(team|story|mission|sponsors?|staff|values?)$/i,
    /^(read\s*more|learn\s*more|view\s*all|see\s*all|click\s*here|more\s*info)$/i,
    /^(next|previous|prev|back|forward|page\s*\d+|»|«|→|←)$/i,
    /^(loading|please\s*wait|error)$/i,
    /^404\b/i,
    /page\s+not\s+found/i,
    /^(cookies?|gdpr|accept|decline|opt\s*out)$/i,
    /^(view|browse|filter|sort|reset|clear|apply|submit|cancel|close|save)$/i,
    /^(skip\s+to\s+(content|main(\s+content)?|navigation|current\s+day))$/i,
    /^(toggle\s+(menu|navigation|search))$/i,
    /^(rss|feed|share|tweet|like|follow|email)$/i,
    // Aggregate/listing-page junk that slips through individual scrapers
    /^all\s+events?$/i,
    /^upcoming\s+(events?|launches?|activities|programs?)/i,
    /^recurring\s+events?$/i,
    /^events?\s+(from|search|search\s+and\s+views|time|by\s+date)/i,
    /^by\s+date(\(s\))?$/i,
    /^sold\s+out$/i,
    /^shopping\s+cart$/i,
    /^more\s+to\s+explore$/i,
    /^benefits?\s+of\s+season\s+tickets?$/i,
    /^production\s+history$/i,
    /^make\s+a\s+donation$/i,
    /^season\s+tickets?$/i,
    /^the\s+content\s+you\s+were\s+looking/i,
    /^it\s+appears\s+we\s+have\s+a/i,
    /^(events?|programs?|activities)\s+and\s+activities/i,
  ];
  for (const pattern of NAV_JUNK) {
    if (pattern.test(trimmed)) return true;
  }

  // Title with no letters (just numbers, punctuation, or whitespace)
  if (!/[a-zA-Z]/.test(trimmed)) return true;

  // Single repeated character (e.g. "------", "....", "***")
  if (/^(.)\1{4,}$/.test(trimmed)) return true;

  return false;
}

// ============================================================================
// PARSED-DATE FALLBACK — derive TIMESTAMPTZ from event_date text when missing
// ============================================================================

/**
 * Try to coerce arbitrary scraper date strings into an ISO timestamp string.
 * Used by saveEvent() to backfill the `date` column when the scraper supplied
 * `event_date` text but no parsed Date. Returns null if unparseable.
 */
function parseEventDateText(eventDateStr) {
  if (!eventDateStr || typeof eventDateStr !== 'string') return null;
  const trimmed = eventDateStr.trim();
  if (!trimmed) return null;

  // Strip common suffixes that confuse Date.parse.
  // Caught 2026-05-10: 507 events with "Mon, May 11, 2026 9:30am–10:00am"
  // (no-space en-dash time range, then a leading time the old regex left in
  // place — Date.parse can't read "9:30am" without a space before am/pm).
  let cleaned = trimmed
    .replace(/\s*\(.*?\)\s*$/, '')                              // trailing "(EDT)"
    .replace(/\s+(EST|EDT|PST|PDT|CST|CDT|MST|MDT|UTC|GMT)\b/i, '') // tz abbreviations
    .replace(/\s+at\s+/i, ' ')                                  // "April 8 at 10am" → "April 8 10am"
    .replace(/\s+@\s+/i, ' ')                                   // "April 8 @ 10am" → "April 8 10am"
    .replace(/[–—]/g, '-')                                      // normalize en/em dash to hyphen
    .replace(/\s+all\s*day\s*$/i, '')                           // "May 25, 2026 All Day" → "May 25, 2026"
    // Strip the END half of a time range first: "-10:00am", "- 10am", "-10pm"
    .replace(/\s*-\s*\d{1,2}(?::\d{2})?\s*[ap]\.?\s*m\.?\s*$/i, '')
    // Then strip any remaining single trailing time: "9:30am", " 9 AM", " 9:30 a.m."
    .replace(/\s+\d{1,2}(?::\d{2})?\s*[ap]\.?\s*m\.?\s*$/i, '')
    .trim();

  // ISO date-only ("2026-04-23") — append local midnight to avoid UTC shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    cleaned = `${cleaned}T00:00:00`;
  }

  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return null;

  // Sanity check: reject dates more than 5 years in the past or 3 years in the future
  const now = Date.now();
  const ts = parsed.getTime();
  if (ts < now - 5 * 365 * 24 * 60 * 60 * 1000) return null;
  if (ts > now + 3 * 365 * 24 * 60 * 60 * 1000) return null;

  return parsed.toISOString();
}

// ============================================================================
// DIRECT SUPABASE FUNCTIONS (recommended for new code)
// ============================================================================

/**
 * Save an event to the events table
 * Converts Firestore event document format to PostgreSQL columns
 */
async function saveEvent(id, data) {
  // Reject junk titles (nav links, footer items, all-caps acronyms, gibberish)
  if (isJunkTitle(data.name)) {
    console.log(`  ⏭️ Skipping junk-title event: "${data.name}"`);
    return null;
  }

  // Reject non-family events
  const nonFamilyReason = isNonFamilyEvent(data.name, data.description, data.venue);
  if (nonFamilyReason) {
    console.log(`  ⏭️ Skipping non-family event: "${data.name}" [${nonFamilyReason}]`);
    return null;
  }

  // Reject cancelled/closed events
  if (isCancelledEvent(data.name, data.description)) {
    console.log(`  ⏭️ Skipping cancelled/closed event: "${data.name}"`);
    return null;
  }

  // Reject events with placeholder venues and no real location data
  const venueLower = (data.venue || '').toLowerCase().trim();
  if (/^(see event page|see website|visit website|check website|see details|see link|tbd|tba|various|various locations|online\/virtual)$/i.test(venueLower)) {
    if (!data.location?.city && !data.address && !data.city) {
      console.log(`  ⏭️ Skipping placeholder-venue event: "${data.name}" [venue="${data.venue}"]`);
      return null;
    }
  }

  // Reject events with no date string at all — they cannot be filtered or
  // displayed meaningfully and just get deleted by fix-event-quality.js Step 1.
  // Catch them here so they never hit the DB.
  // Sanitize first: strip HTML tags and newlines that leaked from page DOM.
  // Without this, ~29 events landed with `event_date` containing "<br>" or
  // "\n" (caught 2026-05-10 as "Malformed dates" in data-quality-check).
  let evtDateStr = (data.eventDate || '').trim()
    .replace(/<[^>]+>/g, ' ')        // strip HTML tags (e.g. "<br>", "<span>")
    .replace(/&[a-z]+;/gi, ' ')      // strip HTML entities (&nbsp;, &amp;, etc.)
    .replace(/[\r\n\t]+/g, ' ')      // collapse newlines/tabs into spaces
    .replace(/\s{2,}/g, ' ')         // squeeze repeated spaces
    .trim();
  if (data.eventDate !== evtDateStr) {
    data.eventDate = evtDateStr;     // propagate cleaned value to row below
  }
  if (!evtDateStr || evtDateStr.length < 4) {
    console.log(`  ⏭️ Skipping dateless event: "${data.name}"`);
    return null;
  }

  // Reject time-only event_date strings ("2:00pm–3:00pm", "10:00am–11:00am").
  // Caught 2026-05-11: 470 events from Communico libraries (Ames, Des Moines,
  // Massapequa, etc.) landed with no date because the API path fell back to
  // item.time_string when datestring/date were missing. Source bug is fixed,
  // this is the belt-and-suspenders guard.
  if (_isTimeOnlyDateString(evtDateStr)) {
    console.log(`  ⏭️ Skipping time-only event_date: "${data.name}" (${evtDateStr})`);
    return null;
  }

  // Reject literal "Invalid Date" strings from broken Date() formatting.
  // Caught 2026-05-11: 35 BiblioCommons-VA events with event_date
  // "Invalid Date Invalid Date - Invalid Date" because Date(malformed) → NaN
  // and toLocaleDateString cheerfully serialized that as "Invalid Date".
  if (/^invalid\s+date\b/i.test(evtDateStr)) {
    console.log(`  ⏭️ Skipping "Invalid Date" event: "${data.name}" (${evtDateStr})`);
    return null;
  }

  // Reject past events
  if (_isDateInPast(evtDateStr)) {
    console.log(`  ⏭️ Skipping past event: "${data.name}" (${evtDateStr})`);
    return null;
  }

  // Truncate fields to prevent btree index overflow (max row size ~2704 bytes for idx_events_unique_content)
  // Total budget must stay under 2704. Using conservative limits:
  // name(300) + event_date(100) + venue(200) + description(1000) + source_url(400) + city(100) + address(200) = 2300
  const truncate = (str, maxLen) => str && str.length > maxLen ? str.substring(0, maxLen) : str;

  const row = {
    id,
    name: truncate(normalizeShoutedTitle(stripPromoBracketCruft(data.name)), 300),
    event_date: truncate(evtDateStr, 100),
    date: data.date instanceof Date ? data.date.toISOString()
      : (typeof data.date?.toDate === 'function') ? data.date.toDate().toISOString()
      : data.date || null,
    description: truncate(data.description, 1000) || null,
    url: truncate(data.url, 400) || null,
    image_url: truncate(data.imageUrl, 500) || null,
    venue: truncate(cleanVenueName(data.venue), 200) || null,
    category: data.metadata?.category || data.category || null,
    city: truncate(data.location?.city, 100) || null,
    state: normalizeState(data.state || data.location?.state) || null,
    zip_code: data.location?.zipCode || null,
    address: truncate(data.location?.address, 200) || null,
  };

  // Treat venue as missing if it's literally the same as the event title —
  // usually means the scraper mistakenly copied the title into the venue
  // field, not a real venue name. Exact match only; a venue that's merely a
  // substring of a longer descriptive title (e.g. "Aberdeen Library" inside
  // "Aberdeen Library Summer Concert Series") is legitimate and left alone.
  if (row.venue && row.name && row.venue.trim().toLowerCase() === row.name.trim().toLowerCase()) {
    row.venue = null;
  }

  // Backfill venue if the scraper didn't supply one — tries name "at X",
  // address first component, then city fallback. Better than venue=NULL.
  if (!row.venue) {
    const derived = deriveVenueFallback(row.name, row.address, row.city, row.state);
    if (derived) row.venue = truncate(cleanVenueName(derived), 200);
  }

  Object.assign(row, {
    geohash: data.geohash || null,
    activity_id: data.activityId || null,
    source_url: truncate(data.metadata?.sourceUrl, 400) || null,
    scraper_name: data.metadata?.scraperName || null,
    platform: data.metadata?.platform || null,
    scraped_at: data.metadata?.scrapedAt || new Date().toISOString(),
    start_time: data.startTime || null,
    end_time: data.endTime || null,
    age_range: null,  // set below after normalization
  });

  // Normalize age_range: use scraper-provided value or auto-detect, then normalize to standard brackets
  const rawAgeRange = data.ageRange || detectAgeRange(data.name, data.description) || null;
  if (rawAgeRange) {
    row.age_range = normalizeAgeRange(rawAgeRange);
  } else {
    row.age_range = 'All Ages';
  }

  // Reject adult-only events — not family content
  if (row.age_range === 'Adults') {
    if (process.env.DEBUG_SAVE) console.log(`  ⛔ Skipping adult-only event: ${row.name}`);
    return null;
  }

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
    // Compute geohash from coords if scraper didn't supply one
    // (avoids fix-event-quality.js Step 4 having to backfill it later)
    if (!row.geohash) {
      try {
        row.geohash = ngeohash.encode(lat, lng, 7);
      } catch (e) { /* ignore — geohash is best-effort */ }
    }
  }

  // Universal state-centroid safety net: if we still have no location but the
  // state is a valid US code, drop in the state centroid. This means the row
  // shows up on the map (at state granularity) instead of disappearing from
  // every map query. Replaces the per-scraper logic that used to be needed in
  // each individual scraper — caught by Festivals-Eastern-US 2026-05-17 where
  // 107 events landed with null location.
  if (!row.location && row.state) {
    const centroid = getStateCentroid(row.state);
    if (centroid) {
      row.location = `SRID=4326;POINT(${centroid.lng} ${centroid.lat})`;
      if (!row.geohash) {
        try {
          row.geohash = ngeohash.encode(centroid.lat, centroid.lng, 7);
        } catch (e) { /* ignore */ }
      }
    }
  }

  // Backfill parsed date TIMESTAMPTZ from event_date text when missing.
  // Without this, events are invisible to date-filtered queries until the
  // weekly fix scripts run. Doing it at save-time eliminates that dependency.
  if (!row.date && row.event_date) {
    const parsed = parseEventDateText(row.event_date);
    if (parsed) row.date = parsed;
  }

  const { error } = await supabase.from('events').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save event ${id}: ${error.message}`);
  return row;
}

/**
 * Save an activity/venue to the activities table
 */
async function saveActivity(id, data) {
  if (!data.name || !data.name.trim()) {
    console.log(`  ⏭️ Skipping activity with missing name (id: ${id})`);
    return null;
  }

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
    age_range: data.ageRange || detectAgeRange(data.name, data.description) || null,
    address: data.address || data.location?.address || null,
    city: data.city || data.location?.city || null,
    state: normalizeState(data.state || data.location?.state) || null,
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
    // Compute geohash from coords if scraper didn't supply one
    // (eliminates fix-event-quality.js Step 9 backfill for new venues)
    if (!row.geohash) {
      try {
        row.geohash = ngeohash.encode(lat, lng, 7);
      } catch (e) { /* ignore — geohash is best-effort */ }
    }
  }

  // Universal state-centroid safety net (same as saveEvent above). Without
  // this, venues whose scraper geocoding chain failed entirely would land
  // with null location / null geohash and disappear from the venue map.
  if (!row.location && row.state) {
    const centroid = getStateCentroid(row.state);
    if (centroid) {
      row.location = `SRID=4326;POINT(${centroid.lng} ${centroid.lat})`;
      if (!row.geohash) {
        try {
          row.geohash = ngeohash.encode(centroid.lat, centroid.lng, 7);
        } catch (e) { /* ignore */ }
      }
    }
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
    id: crypto.randomUUID(),
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
  // Default projection for read-only Firestore-compat queries on the events/activities tables.
  // Excludes the 3 heavy columns (description, image_url, location-GEOMETRY) which scrapers
  // never read off dedup-check results — keeping them in select('*') made every per-event
  // existence check pull ~3 KB instead of ~600 bytes. Callers that need a different shape
  // can chain .select('col1, col2') (or .select('*') for everything).
  // Columns must exist in the live database. Only include columns confirmed in
  // database/schema.sql + applied migrations (add-age-range-column.sql,
  // migration-reports.sql). Adding a column that doesn't exist makes every
  // dedup query 400 — and a previous version of this list referenced
  // events.min_age / events.max_age which silently caused a flood of 400s and
  // burned ~1 GB/day in error responses + retries.
  //
  // Events confirmed columns: id, name, event_date, date, end_date, description,
  // url, image_url, venue, category, city, state, zip_code, address, location,
  // geohash, activity_id, source_url, scraper_name, platform, scraped_at,
  // created_at, updated_at, review_count, average_rating, is_sponsored,
  // sponsor_expires_at, age_range (migration), reported (migration),
  // start_time, end_time (added via saveEvent inserts so they must exist).
  //
  // Activities confirmed columns: per schema.sql includes min_age / max_age /
  // is_free directly on the table.
  //
  // The lean projection still drops the heavy ones: description, image_url,
  // location (GEOMETRY).
  const DEFAULT_PROJECTIONS = {
    events: 'id, name, event_date, date, end_date, venue, address, city, state, zip_code, geohash, scraper_name, url, source_url, category, age_range, start_time, end_time, activity_id, reported, is_sponsored, scraped_at, created_at, updated_at, platform, review_count',
    activities: 'id, name, address, city, state, zip_code, geohash, scraper_name, source, url, category, subcategory, age_range, min_age, max_age, hours, phone, price_range, is_free, reported, scraped_at, created_at, updated_at',
  };

  function defaultProjectionFor(collectionName) {
    const table = mapCollectionName(collectionName);
    return DEFAULT_PROJECTIONS[table] || '*';
  }

  // Helper to create a chainable query object (supports .where().where().limit().get())
  function createQuery(collectionName, filters = [], opts = {}) {
    const state = {
      filters,
      _limit: opts._limit,
      _orderBy: opts._orderBy,
      _select: opts._select,
    };
    return {
      where(field, op, value) {
        return createQuery(collectionName, [...state.filters, { field, op, value }], state);
      },
      // Now actually tracked and applied in .get(). Previously a no-op which silently
      // turned every .limit(1) dedup check into a full unbounded SELECT.
      limit(n) {
        return createQuery(collectionName, state.filters, { ...state, _limit: n });
      },
      orderBy(field, dir) {
        return createQuery(collectionName, state.filters, { ...state, _orderBy: { field, dir } });
      },
      // Opt-in column projection. Pass '*' to force select('*'), pass 'id' for a minimal
      // existence-check, or pass a comma-separated column list. If unset, defaults to
      // DEFAULT_PROJECTIONS above (which already drops the heavy columns).
      select(cols) {
        return createQuery(collectionName, state.filters, { ...state, _select: cols });
      },
      async get() {
        const tableName = mapCollectionName(collectionName);
        const projection = state._select || defaultProjectionFor(collectionName);
        let query = supabase.from(tableName).select(projection);

        // Map Firestore dot-notation fields to Supabase column names
        for (const filter of state.filters) {
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
          } else if (filter.op === 'in') {
            query = query.in(col, filter.value);
          }
        }

        if (state._orderBy) {
          query = query.order(
            mapFieldName(collectionName, state._orderBy.field),
            { ascending: (state._orderBy.dir || 'asc') !== 'desc' }
          );
        }
        if (typeof state._limit === 'number' && state._limit > 0) {
          query = query.limit(state._limit);
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
    };
  }

  return {
    collection(collectionName) {
      const queryBase = createQuery(collectionName);
      return {
        // Chainable query methods on the collection itself — delegate to queryBase so
        // `db.collection('events').limit(50).get()` and `.orderBy(...).limit(...).get()`
        // patterns work the same as `.where(...).limit(...).get()`. Without these the
        // bare-collection chain would TypeError on the second call.
        where(field, op, value) {
          return queryBase.where(field, op, value);
        },
        limit(n) {
          return queryBase.limit(n);
        },
        orderBy(field, dir) {
          return queryBase.orderBy(field, dir);
        },
        select(cols) {
          return queryBase.select(cols);
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
                if (e.message?.includes('Skipping past event') || e.message?.includes('empty/null name') || e.message?.includes('Skipping non-family event') || e.message?.includes('Skipping cancelled/closed event') || e.message?.includes('Skipping placeholder-venue') || e.message?.includes('Skipping adult-only event') || e.message?.includes('Skipping junk-title event') || e.message?.includes('Skipping dateless event') || e.message?.includes('Skipping time-only event_date') || e.message?.includes('Skipping "Invalid Date" event')) {
                  return; // silently skip
                }
                throw e;
              }
              const row = { id: docId, ...flattened };
              const { error } = await supabase
                .from(mapCollectionName(table))
                .upsert(row, { onConflict: 'id' });
              if (error) {
                // Gracefully handle duplicate content constraint violations
                if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
                  console.log(`  ℹ️ Duplicate content for ${table}/${docId}, skipping`);
                  return;
                }
                throw error;
              }
            },
            async get() {
              // Default to the same lean projection used by createQuery — every observed
              // caller of .doc(id).get() reads only `.exists` (venue-matcher creating a
              // venue, scraper-macaroni-md early dedup, scraper-port-discovery dedup),
              // so we don't need description / image_url / GEOMETRY here either.
              const projection = defaultProjectionFor(collectionName);
              const { data, error } = await supabase
                .from(mapCollectionName(collectionName))
                .select(projection)
                .eq('id', docId)
                .maybeSingle();
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
          // Derive a STABLE id from event/activity content rather than minting
          // a random UUID. The old `crypto.randomUUID()` fallback was the root
          // cause of the 3576 duplicate events deleted on 2026-05-14 — 89
          // scrapers call `.add()` without setting data.id, so every re-scrape
          // produced a new random row with identical content.
          // Same event → same id → upsert dedupes naturally.
          const id = data.id || _stableIdForCollection(collectionName, data);
          let flattened;
          try {
            flattened = flattenForTable(collectionName, data);
          } catch (e) {
            if (e.message?.includes('Skipping past event') || e.message?.includes('empty/null name') || e.message?.includes('Skipping non-family event') || e.message?.includes('Skipping cancelled/closed event') || e.message?.includes('Skipping placeholder-venue') || e.message?.includes('Skipping adult-only event') || e.message?.includes('Skipping junk-title event') || e.message?.includes('Skipping dateless event') || e.message?.includes('Skipping time-only event_date') || e.message?.includes('Skipping "Invalid Date" event')) {
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
          if (error) {
            // Handle duplicate key constraint gracefully (event already exists)
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
              return { id, duplicate: true };
            }
            throw error;
          }
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
                if (e.message?.includes('Skipping past event') || e.message?.includes('empty/null name') || e.message?.includes('Skipping non-family event') || e.message?.includes('Skipping cancelled/closed event') || e.message?.includes('Skipping placeholder-venue') || e.message?.includes('Skipping adult-only event') || e.message?.includes('Skipping junk-title event') || e.message?.includes('Skipping dateless event') || e.message?.includes('Skipping time-only event_date') || e.message?.includes('Skipping "Invalid Date" event')) {
                  continue;
                }
                throw e;
              }
            } else if (op.type === 'delete') {
              if (!deleteByTable[table]) deleteByTable[table] = [];
              deleteByTable[table].push(op.id);
            }
          }

          // Execute upserts (deduplicate by ID to avoid "cannot affect row a second time" error)
          for (const [table, rows] of Object.entries(upsertByTable)) {
            const deduped = {};
            for (const row of rows) {
              deduped[row.id] = row; // last occurrence wins
            }
            const uniqueRows = Object.values(deduped);
            if (uniqueRows.length < rows.length) {
              console.log(`  ℹ️ Deduplicated batch for ${table}: ${rows.length} → ${uniqueRows.length} rows`);
            }
            const { error } = await supabase
              .from(mapCollectionName(table))
              .upsert(uniqueRows, { onConflict: 'id' });
            if (error) {
              // If batch fails due to a secondary unique constraint (e.g. idx_events_unique_content),
              // fall back to row-by-row upserts so one bad row doesn't block the entire batch
              if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
                console.log(`  ⚠️ Batch upsert hit unique constraint on ${table}, falling back to row-by-row...`);
                let rowErrors = 0;
                for (const row of uniqueRows) {
                  const { error: rowErr } = await supabase
                    .from(mapCollectionName(table))
                    .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
                  if (rowErr) {
                    if (rowErr.code === '23505' || rowErr.message?.includes('duplicate key') || rowErr.message?.includes('unique constraint')) {
                      // Silently skip content-duplicate rows
                      continue;
                    }
                    console.error(`  ❌ Row upsert error (${row.id}): ${rowErr.message}`);
                    rowErrors++;
                  }
                }
                if (rowErrors > 0) {
                  console.log(`  ⚠️ Row-by-row fallback completed with ${rowErrors} errors`);
                } else {
                  console.log(`  ✅ Row-by-row fallback completed successfully (skipped duplicates)`);
                }
              } else {
                throw error;
              }
            }
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
    'metadata.sourceName': 'scraper_name',
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
    'cost': 'price_range',
    'isFree': 'is_free',
    'ageRange': 'age_range',
    'isSponsored': 'is_sponsored',
    'metadata.lastSeen': 'scraped_at',
    'website': 'url',
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

  // Reject junk titles (nav links, footer items, all-caps acronyms, gibberish)
  if (isJunkTitle(data.name)) {
    console.log(`  ⏭️ Skipping junk-title event: "${data.name}"`);
    throw new Error(`Skipping junk-title event: "${data.name}"`);
  }

  // Reject non-family events
  const nonFamilyReason = isNonFamilyEvent(data.name, data.description, data.venue);
  if (nonFamilyReason) {
    throw new Error(`Skipping non-family event: "${data.name}" [${nonFamilyReason}]`);
  }

  // Reject cancelled/closed events
  if (isCancelledEvent(data.name, data.description)) {
    console.log(`  ⏭️ Skipping cancelled/closed event: "${data.name}"`);
    throw new Error(`Skipping cancelled/closed event: "${data.name}"`);
  }

  // Reject events with placeholder venues and no real location data
  const venueLower = (data.venue || '').toLowerCase().trim();
  if (/^(see event page|see website|visit website|check website|see details|see link|tbd|tba|various|various locations|online\/virtual)$/i.test(venueLower)) {
    if (!data.location?.city && !data.address && !data.city) {
      throw new Error(`Skipping placeholder-venue event: "${data.name}" [venue="${data.venue}"]`);
    }
  }

  // Reject events with no date string at all — they cannot be filtered or
  // displayed meaningfully and just get deleted by fix-event-quality.js.
  // Sanitize first: strip HTML tags / newlines / entities that leaked in from
  // page DOM (caught 2026-05-10 — 29 events with "<br>" or "\n" in event_date).
  let eventDateStr = ((data.eventDate || data.event_date) || '').toString().trim()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (data.eventDate && data.eventDate !== eventDateStr) data.eventDate = eventDateStr;
  if (data.event_date && data.event_date !== eventDateStr) data.event_date = eventDateStr;
  if (!eventDateStr || eventDateStr.length < 4) {
    console.log(`  ⏭️ Skipping dateless event: "${data.name}"`);
    throw new Error(`Skipping dateless event: "${data.name}"`);
  }

  // Reject time-only event_date strings ("2:00pm–3:00pm"). Caught 2026-05-11 —
  // see saveEvent for the full story. Same guard, applied to the flatten path.
  if (_isTimeOnlyDateString(eventDateStr)) {
    throw new Error(`Skipping time-only event_date: "${data.name}" (${eventDateStr})`);
  }

  // Reject literal "Invalid Date" strings (caught 2026-05-11 in 35 BiblioCommons-VA rows).
  if (/^invalid\s+date\b/i.test(eventDateStr)) {
    throw new Error(`Skipping "Invalid Date" event: "${data.name}" (${eventDateStr})`);
  }

  // Reject past events — parse date from eventDate string or date field
  if (_isDateInPast(eventDateStr)) {
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

  // Truncate fields to prevent btree index overflow (max row size ~2704 bytes for idx_events_unique_content)
  // Total budget must stay under 2704. Using conservative limits:
  // name(300) + event_date(100) + venue(200) + description(1000) + source_url(400) + city(100) + address(200) = 2300
  const trunc = (str, maxLen) => str && str.length > maxLen ? str.substring(0, maxLen) : str;

  const row = {};
  row.name = trunc(normalizeShoutedTitle(stripPromoBracketCruft(data.name.trim())), 300);
  if (data.eventDate) row.event_date = trunc(data.eventDate, 100);
  if (data.date) {
    if (data.date instanceof Date) row.date = data.date.toISOString();
    else if (typeof data.date.toDate === 'function') row.date = data.date.toDate().toISOString();
    else row.date = data.date;
  }
  if (data.description) row.description = trunc(data.description, 1000);
  if (data.url) row.url = trunc(data.url, 400);
  if (data.imageUrl) row.image_url = trunc(data.imageUrl, 500);
  if (data.venue) row.venue = trunc(cleanVenueName(data.venue), 200);
  // Treat venue as missing if it's literally the same as the event title (see saveEvent for rationale).
  if (row.venue && row.name && row.venue.trim().toLowerCase() === row.name.trim().toLowerCase()) {
    row.venue = null;
  }
  if (data.state) row.state = normalizeState(data.state);
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
  // Normalize internal category slugs to frontend display names
  if (row.category) row.category = normalizeCategory(row.category);

  // Scraper name: check top-level, then metadata, then source field
  if (data.scraperName) row.scraper_name = data.scraperName;

  if (data.location) {
    row.city = trunc(data.location.city, 100);
    row.state = row.state || normalizeState(data.location.state);
    row.zip_code = data.location.zipCode;
    row.address = trunc(data.location.address, 200);
    const lat = data.location.latitude || data.location.coordinates?.latitude;
    const lng = data.location.longitude || data.location.coordinates?.longitude;
    if (lat && lng) {
      row.location = `SRID=4326;POINT(${lng} ${lat})`;
      // Compute geohash from coords if scraper didn't supply one
      if (!row.geohash) {
        try { row.geohash = ngeohash.encode(lat, lng, 7); } catch (e) { /* ignore */ }
      }
    }
  }

  // Backfill venue if scraper didn't supply one — must run after location
  // so address/city are populated. Tries name "at X", address first
  // component, then city fallback. Better than venue=NULL.
  if (!row.venue) {
    const derived = deriveVenueFallback(row.name, row.address, row.city, row.state);
    if (derived) row.venue = trunc(cleanVenueName(derived), 200);
  }

  if (data.metadata) {
    row.source_url = row.source_url || trunc(data.metadata.sourceUrl, 500);
    row.scraper_name = row.scraper_name || data.metadata.scraperName || data.metadata.sourceName || data.metadata.source;
    row.platform = row.platform || data.metadata.platform;
    row.scraped_at = row.scraped_at || data.metadata.scrapedAt;
    // Category: metadata.category as fallback if not already set
    row.category = row.category || (data.metadata.category ? normalizeCategory(data.metadata.category) : null);
    // State: metadata.state as additional fallback
    row.state = row.state || normalizeState(data.metadata.state);
  }

  // Additional scraper_name fallbacks (top-level fields some scrapers use)
  row.scraper_name = row.scraper_name || data.source || data.sourceName || data.source_url || null;

  // SAFETY NET: if scraper_name is still empty, derive one from the URL so we never
  // silently bucket events into "unknown". Logs a warning so the offending scraper
  // can be fixed.
  if (!row.scraper_name) {
    const urlForDerive = row.url || row.source_url || data.url || data.sourceUrl;
    if (urlForDerive) {
      try {
        const host = new URL(urlForDerive).hostname.replace(/^www\./, '');
        row.scraper_name = `auto:${host}`;
      } catch (_) { /* not a valid URL, fall through */ }
    }
    if (!row.scraper_name) {
      row.scraper_name = 'auto:unidentified';
    }
    console.warn(`  ⚠️  scraper_name missing for event "${(row.name || '').substring(0, 50)}" — derived as "${row.scraper_name}". Set metadata.scraperName in the scraper.`);
  }

  // Auto-detect age range from event name/description, then normalize to standard brackets
  const rawAge = data.ageRange || data.age_range || detectAgeRange(data.name, data.description) || null;
  if (rawAge) {
    row.age_range = normalizeAgeRange(rawAge);
  } else {
    row.age_range = 'All Ages';
  }

  // Reject adult-only events — not family content
  if (row.age_range === 'Adults') {
    throw new Error(`Skipping adult-only event: "${data.name}"`);
  }

  // Backfill parsed date TIMESTAMPTZ from event_date text when missing.
  // Without this, events end up invisible to date-filtered queries until
  // the weekly fix scripts backfill them. Doing it at save time removes
  // that dependency.
  if (!row.date && row.event_date) {
    const parsed = parseEventDateText(row.event_date);
    if (parsed) row.date = parsed;
  }

  // Clean up nulls — don't write null values that overwrite existing data
  Object.keys(row).forEach(k => { if (row[k] === null || row[k] === undefined) delete row[k]; });

  return row;
}

function flattenActivity(data) {
  const row = {};
  if (data.name) row.name = data.name;
  if (data.description) row.description = data.description;
  if (data.category) row.category = normalizeCategory(data.category);
  if (data.subcategory) row.subcategory = data.subcategory;
  if (data.url || data.website) row.url = data.url || data.website;
  if (data.imageUrl) row.image_url = data.imageUrl;
  if (data.phone) row.phone = data.phone;
  if (data.hours) row.hours = data.hours;
  if (data.priceRange || data.cost) row.price_range = data.priceRange || data.cost;
  if (data.isFree != null) row.is_free = data.isFree;
  if (data.ageRange) row.age_range = data.ageRange;
  if (data.state) row.state = normalizeState(data.state);
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
    row.category = row.category || (data.metadata.category ? normalizeCategory(data.metadata.category) : null);
    row.state = row.state || normalizeState(data.metadata.state);
    // Derive source from metadata sourceUrl if not set (track by site URL)
    if (!row.source) row.source = data.metadata.sourceUrl || null;
  }
  // Final fallback: derive source from activity URL (site tracking)
  if (!row.source) row.source = data.url || data.website || null;
  if (data.location) {
    row.city = row.city || data.location.city;
    row.state = row.state || normalizeState(data.location.state);
    row.zip_code = row.zip_code || data.location.zipCode;
    row.address = row.address || data.location.address;
    // Pull phone/url/hours from location if not at top level (some scrapers nest these)
    row.phone = row.phone || data.location.phone;
    row.url = row.url || data.location.website || data.location.url;
    row.hours = row.hours || data.location.hours;
    const lat = data.location.latitude || data.location.coordinates?.latitude;
    const lng = data.location.longitude || data.location.coordinates?.longitude;
    if (lat && lng) {
      row.location = `SRID=4326;POINT(${lng} ${lat})`;
      // Compute geohash from coords if scraper didn't supply one
      if (!row.geohash) {
        try { row.geohash = ngeohash.encode(lat, lng, 7); } catch (e) { /* ignore */ }
      }
    }
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
  cleanVenueName,
  deriveVenueFallback,
  stripPromoBracketCruft,
  normalizeShoutedTitle,
};
