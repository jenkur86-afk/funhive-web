/**
 * JSON-LD (schema.org) event extraction.
 *
 * WHY THIS EXISTS
 * A 2026-08-09 re-probe of the 73 open MISMATCH bugs found that 20 of them sit on pages
 * that already publish their events as schema.org `Event` objects in
 * `<script type="application/ld+json">` — across EIGHT different scrapers (WordPress-VT,
 * TN, GA, MS, AL, CT, PA, plus Venue-Events-ZoosAquariums and WordPress-Events-Calendar).
 * The pages were being scraped with generic DOM selectors that missed all of it, while
 * clean structured data sat in the markup: Brownell Library exposes 59 Event objects,
 * Brandywine Zoo 107, Hickman County 58.
 *
 * This is MASTER-PLAN Phase 4's tier-1 case — "known plugin markup, one fix serves many"
 * — and it is strictly better than DOM scraping where available:
 *   - `startDate` is a real ISO timestamp, so it cannot produce the time-only "10:30 am"
 *     values that drive this family's InvalidDate counts.
 *   - `location.address` carries a full PostalAddress, so events geocode to the actual
 *     venue instead of falling back to a city or county centroid.
 *   - No per-site selectors, so it does not rot when a theme changes.
 *
 * Try it AFTER the TEC REST API (which is cleaner still when present) and BEFORE any DOM
 * scraping.
 */

// WordPress serialises descriptions with entities already escaped once ("&lt;p&gt;"), so
// entities must be decoded BEFORE tags are stripped or the markup survives as visible text.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', middot: '·',
};
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
}
function toPlainText(s) {
  // Decode twice: the value is escaped once by the serialiser and may contain entities
  // of its own ("Tots &amp; Books" arrives as "Tots &amp;amp; Books").
  return decodeEntities(decodeEntities(s))
    .replace(/<[^>]+>/g, ' ')
    // Some sites emit JS-style escapes inside the JSON string, so a venue survives
    // JSON.parse still carrying a literal backslash — "Hyde Park Library Children\'s
    // Room" reached the venue column that way on the first live run. Drop a backslash
    // that precedes a quote or another backslash; leave other backslashes alone so
    // legitimate text is not mangled.
    .replace(/\\(['"\\])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Split an ISO-ish timestamp into the date/time shape saveEventsWithGeocoding expects.
 * Deliberately reads the LOCAL wall-clock fields textually rather than via `new Date()`:
 * these strings carry their own offset ("2026-08-10T16:00:00-04:00") and parsing them into
 * a Date would re-express the event in the runner's timezone, shifting evening events onto
 * the wrong day — the same class of bug as CLAUDE.md's rule against `new Date("2026-04-23")`.
 */
function splitIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(iso || ''));
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const month = MONTHS[parseInt(mo, 10) - 1];
  if (!month) return null;
  const date = `${month} ${parseInt(d, 10)}, ${y}`;
  let time = null;
  if (hh !== undefined) {
    const h = parseInt(hh, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    time = `${h12}:${mm} ${ampm}`;
  }
  return { date, time };
}

// Walk any JSON-LD shape — bare object, array, or @graph — collecting Event nodes.
function collectEvents(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, found)); return found; }
  const t = node['@type'];
  const types = Array.isArray(t) ? t : [t];
  // Accept Event and its subtypes (ChildrensEvent, EducationEvent, …) but never Place-ish
  // nodes that merely end in "Event", and require enough to build a row from.
  const isEvent = types.some(x => typeof x === 'string' && /(^|\b)Event$/.test(x));
  if (isEvent && node.name && node.startDate) found.push(node);
  Object.values(node).forEach(v => { if (v && typeof v === 'object') collectEvents(v, found); });
  return found;
}

/**
 * Extract schema.org events from a page's HTML.
 *
 * @param {string} html - raw page HTML
 * @param {string} fallbackVenue - venue name to use when the Event carries no location
 * @returns {Array} normalized event objects, or [] when the page has no JSON-LD events
 */
function extractJsonLdEvents(html, fallbackVenue) {
  if (!html || typeof html !== 'string') return [];
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  const raw = [];
  for (const m of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;   // one malformed block must not lose the rest of the page
    }
    collectEvents(parsed, raw);
  }
  if (!raw.length) return [];

  const seen = new Set();
  const out = [];
  for (const ev of raw) {
    const name = toPlainText(ev.name);
    const start = splitIso(ev.startDate);
    if (!name || !start) continue;

    // Recurring series repeat the same title on the same day across blocks.
    const key = `${name.toLowerCase()}|${start.date}|${start.time || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const end = ev.endDate ? splitIso(ev.endDate) : null;
    const loc = ev.location && typeof ev.location === 'object'
      ? (Array.isArray(ev.location) ? ev.location[0] : ev.location) : null;
    const addr = loc && loc.address && typeof loc.address === 'object' ? loc.address : null;
    const venueName = (loc && toPlainText(loc.name)) || fallbackVenue || '';

    out.push({
      title: name,
      date: start.date,
      startTime: start.time,
      // Only carry an end time when the event ends the same day; a multi-day range's
      // end time would otherwise read as this day's finish.
      endTime: end && end.date === start.date ? end.time : null,
      description: toPlainText(ev.description).slice(0, 1500),
      url: typeof ev.url === 'string' ? ev.url : '',
      imageUrl: typeof ev.image === 'string' ? ev.image
        : (ev.image && typeof ev.image === 'object' ? (ev.image.url || '') : ''),
      venueName,
      location: venueName,
      // A real street address here is what lets geocoding hit the venue rather than
      // falling back to a city or county centroid.
      address: addr ? toPlainText(addr.streetAddress) : '',
      city: addr ? toPlainText(addr.addressLocality) : '',
      state: addr ? toPlainText(addr.addressRegion) : '',
      zipCode: addr ? toPlainText(addr.postalCode) : '',
    });
  }
  return out;
}

module.exports = { extractJsonLdEvents, splitIso, toPlainText };
