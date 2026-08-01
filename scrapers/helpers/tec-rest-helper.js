/**
 * TEC (WordPress "The Events Calendar" plugin) REST API helper.
 *
 * Root cause found 2026-07-31 diagnosing WordPress-NY/FL/NJ/MS/ME's elevated
 * InvalidDate counts (NJ was the outlier at ~29%, vs ~8-12% for the other
 * four, despite NJ and FL running byte-identical DOM extraction code): a
 * meaningful share of these library sites run WordPress's "The Events
 * Calendar" plugin, whose list view groups events under a bare day heading
 * like "Tue 4" or "Sat 1" — no month/year on the heading itself, only once
 * at the top of the whole page. Confirmed live via WebFetch on
 * unionlibrary.org and veronalibrary.org (both NJ). That markup doesn't
 * carry a `data-date` attribute or a `.calendar__day-header`/
 * `[class*="day-header"]` class (the pattern the 2026-07-20 findAncestorDate
 * fix targets — that fix was built against ypl.org's Drupal-style calendar
 * widget, a different platform), so findAncestorDate() never fires for TEC
 * cards, and even if it did, "Tue 4" alone has no month/year to build a
 * real date from.
 *
 * TEC ships a public REST API that sidesteps DOM date-scraping entirely.
 * Confirmed live against unionlibrary.org/wp-json/tribe/events/v1/events/:
 * clean start_date/end_date fields ("2026-08-04 10:00:00"), real titles,
 * descriptions, venue info. Try this FIRST for any WordPress library/venue
 * scraper, before falling back to DOM scraping — cheap to attempt (one
 * request, fails fast with a 404/non-JSON response on non-TEC sites), and
 * far more reliable than DOM date extraction when it succeeds.
 *
 * This isn't NJ-specific — any WordPress-{state} scraper hitting a TEC site
 * benefits. If a future diagnosis session finds another state with a high
 * InvalidDate count on WordPress library scrapers, check for TEC
 * (?post_type=tribe_events / ?eventDisplay=list in the site's URLs) before
 * assuming it needs another DOM-parsing patch.
 */

const axios = require('axios');

const TEC_TIMEOUT_MS = 8000;
const TEC_PER_PAGE = 50;
const TEC_MAX_PAGES = 3; // caps egress/runtime; saveEventsWithGeocoding already filters the date window

function _formatTecTime(details) {
  if (!details) return null;
  const hour = parseInt(details.hour, 10);
  if (isNaN(hour)) return null;
  const minutes = String(details.minutes !== undefined ? details.minutes : '00').padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// WordPress's wptexturize() runs titles/descriptions through smart-quote and
// dash substitution before the REST API serializes them, so this needs both
// numeric refs (&#8217;) and the common named ones, not just &nbsp;/&amp;.
const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…'
};

function _stripHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try to fetch events from a site's TEC REST API.
 *
 * @param {string} baseUrl - any page on the site (library.url); origin is derived from it
 * @param {string} libName - library/venue display name, used for location/venueName fields
 * @returns {Promise<Array|null>} normalized event objects if the site runs TEC and the
 *   API responded, or null if the site isn't TEC / the API is unreachable — callers
 *   should fall back to DOM scraping only when this returns null (an empty array [] is
 *   a confirmed-TEC site with genuinely zero upcoming events, not a signal to fall back).
 */
async function tryFetchTecEvents(baseUrl, libName) {
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return null;
  }

  const allEvents = [];
  let page = 1;
  let totalPages = 1;

  while (page <= Math.min(totalPages, TEC_MAX_PAGES)) {
    const url = `${origin}/wp-json/tribe/events/v1/events/?per_page=${TEC_PER_PAGE}&start_date=now&page=${page}`;
    let res;
    try {
      res = await axios.get(url, {
        timeout: TEC_TIMEOUT_MS,
        headers: { Accept: 'application/json' },
        validateStatus: null
      });
    } catch (e) {
      return page === 1 ? null : allEvents;
    }

    if (!res || res.status !== 200 || typeof res.data !== 'object') {
      return page === 1 ? null : allEvents;
    }

    const data = res.data;
    if (!Array.isArray(data.events)) return page === 1 ? null : allEvents;
    if (data.events.length === 0) break;

    for (const ev of data.events) {
      if (!ev.title || !ev.start_date) continue;
      allEvents.push({
        title: _stripHtml(ev.title),
        date: ev.start_date,
        startTime: _formatTecTime(ev.start_date_details),
        endTime: _formatTecTime(ev.end_date_details),
        description: _stripHtml(ev.description),
        url: ev.url || '',
        imageUrl: (ev.image && ev.image.url) || '',
        ageRange: Array.isArray(ev.categories) ? ev.categories.map(c => c.name).filter(Boolean).join(', ') : '',
        location: libName,
        venueName: libName
      });
    }

    totalPages = data.total_pages || 1;
    page++;
  }

  return allEvents;
}

module.exports = { tryFetchTecEvents };
