/**
 * LIBRARY BRANCH DETECTOR
 *
 * When a MacaroniKid event surfaces with a generic library-system name as the
 * venue (e.g. "Denver Public Library", "Jefferson County Public Library",
 * "Sno-Isle Libraries"), the actual storytime/program happens at a *specific
 * branch*. The branch name is almost always present in the event title or
 * description, but the venue field only contains the system name.
 *
 * This helper scans the event title + description for a branch name from the
 * known library-systems table (in library-addresses.js) and returns the
 * branch's full street address, so the geocoder can pin the event to the
 * actual building instead of falling back to city center.
 *
 * Result of NOT using this (May 2026 scrape): ~50 storytimes/programs landed
 * at the city centroid of Denver / Lakewood / etc., making them indistinguishable
 * on the map and unhelpful for finding "library events near me."
 */

const { LIBRARY_ADDRESSES } = require('./library-addresses');

/**
 * Parse a "Street, City, ST ZIP" address string into parts.
 *
 * @param {string} addr - e.g. "1055 S Tejon St, Denver, CO 80223"
 * @returns {{ address: string, city: string, state: string, zipCode: string } | null}
 */
function parseFullAddress(addr) {
  if (!addr || typeof addr !== 'string') return null;
  const m = addr.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
  if (!m) return null;
  return {
    address: m[1].trim(),
    city: m[2].trim(),
    state: m[3].trim(),
    zipCode: (m[4] || '').trim()
  };
}

/**
 * Find a matching library system whose canonical name (case-insensitively)
 * is contained in the venue string, OR whose stripped form matches.
 *
 * Examples that should match "Denver Public Library":
 *   - "Denver Public Library"
 *   - "Denver Public Library — Athmar Park"
 *   - "DENVER PUBLIC LIBRARIES" (allow trailing 's')
 *
 * Examples that should match "Jefferson County Public Library":
 *   - "Jefferson County Public Library"
 *   - "Jeffco Libraries"               (alias)
 *   - "Jeffco Library"
 *
 * Examples that should match "Sno-Isle Libraries":
 *   - "Sno-Isle Libraries"
 *   - "Sno-Isle Library"
 *
 * @param {string} venue
 * @returns {{ systemName: string, mainAddress: string, branches: Object } | null}
 */
function findMatchingSystem(venue) {
  if (!venue) return null;
  const v = venue.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!v) return null;

  // Aliases for systems whose canonical name is awkward or community-known by
  // a different label. Keep this list small — most systems match by name.
  const ALIASES = {
    'jeffco libraries': 'Jefferson County Public Library',
    'jeffco library': 'Jefferson County Public Library',
    'jefferson county libraries': 'Jefferson County Public Library'
  };
  if (ALIASES[v]) {
    const sys = LIBRARY_ADDRESSES[ALIASES[v]];
    if (sys) return { systemName: ALIASES[v], mainAddress: sys.mainAddress, branches: sys.branches };
  }

  // Direct / containment match against canonical system names
  for (const [name, sys] of Object.entries(LIBRARY_ADDRESSES)) {
    const n = name.toLowerCase();
    // Trim trailing 's' for plural vs singular ("Libraries" vs "Library")
    const nStripped = n.replace(/libraries?$/i, 'library');
    const vStripped = v.replace(/libraries?$/i, 'library');
    if (n === v || nStripped === vStripped) {
      return { systemName: name, mainAddress: sys.mainAddress, branches: sys.branches };
    }
    if (v.includes(n) || v.includes(nStripped)) {
      return { systemName: name, mainAddress: sys.mainAddress, branches: sys.branches };
    }
  }
  return null;
}

/**
 * Given a venue that matches a library system and free-text fields (name,
 * description), try to identify the specific branch.
 *
 * Strategy:
 *   1. Combine name + description into a haystack.
 *   2. For each branch in the system, check if its name appears in the haystack.
 *   3. Prefer the LONGEST branch-name match (so "Bear Valley" beats "Valley"
 *      and "Pauline Robinson" beats "Robinson").
 *   4. Skip very short branch names (< 4 chars) to avoid false positives
 *      against common words.
 *   5. Optionally constrain to a given state when we know the event's state —
 *      prevents "Lakewood" in CO matching "Lakewood, NJ".
 *
 * @param {Object} params
 * @param {string} params.venue       - the event's venue field
 * @param {string} params.eventName   - the event title
 * @param {string} params.description - the event description (may be empty)
 * @param {string} [params.state]     - 2-letter state code (e.g. "CO")
 * @returns {{ systemName: string, branchName: string, address: string,
 *             city: string, state: string, zipCode: string } | null}
 */
function detectLibraryBranch({ venue, eventName, description, state }) {
  const system = findMatchingSystem(venue);
  if (!system || !system.branches) return null;

  const haystack = `${eventName || ''} ${description || ''}`.toLowerCase();
  if (!haystack.trim()) return null;

  let best = null;
  for (const [branchName, branchAddr] of Object.entries(system.branches)) {
    const bn = branchName.toLowerCase();
    if (bn.length < 4) continue;
    if (bn === 'main' || bn === 'central') continue; // ambiguous fallback names

    // Substring match (whole-word-ish — guard against partial matches inside
    // unrelated words by requiring a non-letter boundary on both sides).
    const re = new RegExp(`(^|[^a-z])${bn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (!re.test(haystack)) continue;

    const parsed = parseFullAddress(branchAddr);
    if (!parsed) continue;
    if (state && parsed.state !== state.toUpperCase()) continue; // wrong-state guard

    if (!best || bn.length > best.matchLen) {
      best = {
        systemName: system.systemName,
        branchName: branchName,
        address: parsed.address,
        city: parsed.city,
        state: parsed.state,
        zipCode: parsed.zipCode,
        matchLen: bn.length
      };
    }
  }

  if (!best) return null;
  delete best.matchLen;
  return best;
}

module.exports = {
  detectLibraryBranch,
  findMatchingSystem,
  parseFullAddress
};
