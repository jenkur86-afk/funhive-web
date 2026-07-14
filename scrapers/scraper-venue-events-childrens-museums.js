#!/usr/bin/env node

/**
 * CHILDREN'S MUSEUMS EVENTS SCRAPER - ALL EASTERN US
 *
 * Data-driven Puppeteer scraper for children's museum events across all eastern US states.
 * Each venue has a specific events page URL. The scraper visits each venue's events page,
 * extracts event listings, and saves them to the FunHive database.
 *
 * Coverage: 50+ children's museums across 25+ eastern US states:
 * AL, CT, DC, DE, FL, GA, IL, IN, KY, ME, MA, MI, MS, NH, NJ, NY, NC, OH, PA, RI, SC, TN, VT, VA, WV, WI
 *
 * Estimated Events: 200-500 per run (varies by museum availability)
 *
 * Usage:
 *   node scraper-venue-events-childrens-museums.js          # Scrape all museums
 *   node scraper-venue-events-childrens-museums.js --state AL  # Scrape specific state
 *   node scraper-venue-events-childrens-museums.js --venue "Museum Name"  # Scrape specific museum
 *
 * Cloud Function: scrapeChildrensMuseumEventsCloudFunction
 * Schedule: Every 3 days (Group 2: days 2,5,8,11...)
 */

const { launchBrowser } = require('./puppeteer-config');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const axios = require('axios');

const SCRAPER_NAME = 'ChildrensMuseums-Events-Eastern';

// ==========================================
// VENUE CONFIGURATION ARRAY
// ==========================================

const VENUES = [
  // Alabama
  { name: "McWane Science Center", eventsUrl: "https://mcwane.org/events/", city: "Birmingham", state: "AL", zip: "35203",
    extraction: 'mec' },
  // Uses STEC (Simple/Smart Events Calendar), not MEC.
  { name: "EarlyWorks Children's Museum", eventsUrl: "https://earlyworks.com/explore/events/", city: "Huntsville", state: "AL", zip: "35801",
    extraction: 'stec' },
  // Connecticut
  // /calendar 404s; /events is the correct path (Puppeteer follows the JS redirect).
  { name: "Stepping Stones Museum for Children", eventsUrl: "https://www.steppingstonesmuseum.org/events", city: "Norwalk", state: "CT", zip: "06854" },
  // Imagine Nation: the bare-domain `imaginenation.org` refuses connections;
  // the `www.` host responds and the calendar lives at /calendar (not /events).
  { name: "Imagine Nation Museum", eventsUrl: "https://www.imaginenation.org/calendar", city: "Bristol", state: "CT", zip: "06010" },
  // DC
  { name: "National Children's Museum", eventsUrl: "https://nationalchildrensmuseum.org/tickets", city: "Washington", state: "DC", zip: "20004" },
  // Delaware
  { name: "Delaware Children's Museum", eventsUrl: "https://delawarechildrensmuseum.org/events/", city: "Wilmington", state: "DE", zip: "19801" },
  // Florida
  { name: "Miami Children's Museum", eventsUrl: "https://www.miamichildrensmuseum.org/events/", city: "Miami", state: "FL", zip: "33132",
    extraction: 'webflow' },
  // www. host 404s; bare domain works. TEC REST API confirmed 2026-06-29.
  { name: "Glazer Children's Museum", eventsUrl: "https://glazermuseum.org/events/", city: "Tampa", state: "FL", zip: "33602",
    extraction: 'tec-api', tecApiUrl: 'https://glazermuseum.org/wp-json/tribe/events/v1/events' },
  // The cmonaples.org domain was decommissioned (DNS no longer resolves).
  // The museum (CMON) now lives at cmon.org. Verified 2026-04-30: HTTP 200.
  // TEC REST API confirmed available 2026-06-28.
  { name: "Golisano Children's Museum of Naples", eventsUrl: "https://www.cmon.org/events/", city: "Naples", state: "FL", zip: "34110",
    extraction: 'tec-api', tecApiUrl: 'https://www.cmon.org/wp-json/tribe/events/v1/events' },
  // Domain moved from greatexplorations.org to greatex.org. TEC REST API confirmed 2026-06-29.
  { name: "Great Explorations", eventsUrl: "https://greatex.org/events/", city: "St. Petersburg", state: "FL", zip: "33701",
    extraction: 'tec-api', tecApiUrl: 'https://greatex.org/wp-json/tribe/events/v1/events' },
  // Georgia
  // /events/ returns 404; /programs/ is the WordPress CPT archive for their programs.
  { name: "Children's Museum of Atlanta", eventsUrl: "https://childrensmuseumatlanta.org/programs/", city: "Atlanta", state: "GA", zip: "30313",
    extraction: 'wp-cpt' },
  // Illinois
  // Uses TEC Photo view (class: event-thumbnail-size-32-standard), not Squarespace.
  { name: "Chicago Children's Museum", eventsUrl: "https://www.chicagochildrensmuseum.org/program-calendar", city: "Chicago", state: "IL", zip: "60611",
    extraction: 'tec-photo' },
  // /visit/events-and-programs/ returns 404; /events/ returns 200.
  { name: "Kohl Children's Museum", eventsUrl: "https://www.kohlchildrensmuseum.org/events/", city: "Glenview", state: "IL", zip: "60025" },
  // Indiana
  // /visit/calendar redirects to /visit/experiences/activities (exhibits, not a calendar).
  // /visit/calendar redirects to activities; special-events has a custom card layout.
  { name: "The Children's Museum of Indianapolis", eventsUrl: "https://www.childrensmuseum.org/visit/experiences/special-events", city: "Indianapolis", state: "IN", zip: "46208",
    extraction: 'custom-indy' },
  // Kentucky
  { name: "Kentucky Science Center", eventsUrl: "https://kysciencecenter.org/events/", city: "Louisville", state: "KY", zip: "40202",
    extraction: 'tec' },
  // Maine
  { name: "Children's Museum & Theatre of Maine", eventsUrl: "https://www.kitetails.org/", city: "Portland", state: "ME", zip: "04101",
    extraction: 'squarespace' },
  { name: "Maine Discovery Museum", eventsUrl: "https://www.mainediscoverymuseum.org/special-events", city: "Bangor", state: "ME", zip: "04401",
    extraction: 'squarespace' },
  // Massachusetts
  // www. host returns 404; bare domain works.
  { name: "Boston Children's Museum", eventsUrl: "https://bostonchildrensmuseum.org/calendar/", city: "Boston", state: "MA", zip: "02210" },
  // /visit/programs returns 404; /visit/events-programs is the correct Drupal path.
  { name: "Discovery Museum", eventsUrl: "https://www.discoveryacton.org/visit/events-programs", city: "Acton", state: "MA", zip: "01720",
    extraction: 'drupal' },
  // Michigan
  { name: "Grand Rapids Children's Museum", eventsUrl: "https://www.grcm.org/events", city: "Grand Rapids", state: "MI", zip: "49503" },
  // Mississippi
  { name: "Mississippi Children's Museum", eventsUrl: "https://mschildrensmuseum.org/events/", city: "Jackson", state: "MS", zip: "39202",
    extraction: 'tec' },
  // New Hampshire
  { name: "Children's Museum of New Hampshire", eventsUrl: "https://childrens-museum.org/calendar/", city: "Dover", state: "NH", zip: "03820" },
  // New Jersey
  { name: "Garden State Discovery Museum", eventsUrl: "https://www.discoverymuseum.com/", city: "Cherry Hill", state: "NJ", zip: "08003" },
  // New York
  { name: "Children's Museum of Manhattan", eventsUrl: "https://cmom.org/", city: "New York", state: "NY", zip: "10024" },
  { name: "Brooklyn Children's Museum", eventsUrl: "https://www.brooklynkids.org/calendar/", city: "Brooklyn", state: "NY", zip: "11213",
    extraction: 'events-manager' },
  // /events/ returns 404; /calendar/ returns 200. Uses custom .event-result layout.
  { name: "Long Island Children's Museum", eventsUrl: "https://www.licm.org/calendar/", city: "Garden City", state: "NY", zip: "11530",
    extraction: 'licm' },
  { name: "Strong National Museum of Play", eventsUrl: "https://www.museumofplay.org/events/", city: "Rochester", state: "NY", zip: "14607",
    extraction: 'tec-api', tecApiUrl: 'https://www.museumofplay.org/wp-json/tribe/events/v1/events' },
  // North Carolina
  // www. host redirects to bare domain; use canonical form.
  { name: "Marbles Kids Museum", eventsUrl: "https://marbleskidsmuseum.org/events/", city: "Raleigh", state: "NC", zip: "27601" },
  { name: "Discovery Place Science", eventsUrl: "https://discoveryplace.org/events-calendar", city: "Charlotte", state: "NC", zip: "28202" },
  // DISABLED 2026-04-30: Kidzu's main location closed in August 2024 after a
  // water main break. Both kidzuchildrensmuseum.org and kidzuchildrensmuseum.com
  // are currently unreachable. They operate from a temporary location at 1712
  // Willow Dr, Chapel Hill ("The Nest"). Re-enable once the museum publishes a
  // public events calendar at a reachable URL.
  // { name: "Kidzu Children's Museum", eventsUrl: "https://kidzuchildrensmuseum.org/events/", city: "Chapel Hill", state: "NC", zip: "27516" },
  // Ohio
  // COSI's /events/ 404s — calendar lives at /visit/hours-events-calendar
  { name: "COSI Columbus", eventsUrl: "https://cosi.org/visit/hours-events-calendar", city: "Columbus", state: "OH", zip: "43215" },
  { name: "Children's Museum of Cleveland", eventsUrl: "https://cmcleveland.org/events/", city: "Cleveland", state: "OH", zip: "44106" },
  // Pennsylvania
  // /visit/events/ returns 404. TEC REST API confirmed available 2026-06-28.
  { name: "Please Touch Museum", eventsUrl: "https://www.pleasetouchmuseum.org/learn/programs/", city: "Philadelphia", state: "PA", zip: "19131",
    extraction: 'tec-api', tecApiUrl: 'https://www.pleasetouchmuseum.org/wp-json/tribe/events/v1/events' },
  { name: "Children's Museum of Pittsburgh", eventsUrl: "https://pittsburghkids.org/events", city: "Pittsburgh", state: "PA", zip: "15212" },
  // Rhode Island
  { name: "Providence Children's Museum", eventsUrl: "https://providencechildrensmuseum.org/events/", city: "Providence", state: "RI", zip: "02903",
    extraction: 'eventon' },
  // South Carolina
  { name: "EdVenture Children's Museum", eventsUrl: "https://edventure.org/events/", city: "Columbia", state: "SC", zip: "29201",
    extraction: 'eventon' },
  { name: "Children's Museum of the Upstate", eventsUrl: "https://tcmupstate.org/events/", city: "Greenville", state: "SC", zip: "29601" },
  // Tennessee
  // adventuresci.org/events/ 404s — events live at /events-programs/events/; TEC REST API available
  { name: "Adventure Science Center", eventsUrl: "https://www.adventuresci.org/events-programs/events/", city: "Nashville", state: "TN", zip: "37210",
    extraction: 'tec-api', tecApiUrl: 'https://www.adventuresci.org/wp-json/tribe/events/v1/events' },
  { name: "Creative Discovery Museum", eventsUrl: "https://www.cdmfun.org/events", city: "Chattanooga", state: "TN", zip: "37402",
    extraction: 'webflow' },
  { name: "Muse Knoxville", eventsUrl: "https://themuseknoxville.org/events/", city: "Knoxville", state: "TN", zip: "37902",
    extraction: 'eventon' },
  // Vermont
  // TEC REST API confirmed 2026-06-29 (87 events); API more reliable than Puppeteer.
  { name: "ECHO Leahy Center", eventsUrl: "https://www.echovermont.org/events/", city: "Burlington", state: "VT", zip: "05401",
    extraction: 'tec-api', tecApiUrl: 'https://www.echovermont.org/wp-json/tribe/events/v1/events' },
  { name: "Montshire Museum of Science", eventsUrl: "https://montshire.org/events/", city: "Norwich", state: "VT", zip: "05055",
    extraction: 'tec-api', tecApiUrl: 'https://montshire.org/wp-json/tribe/events/v1/events' },
  // Virginia
  { name: "Virginia Discovery Museum", eventsUrl: "https://www.vadm.org/events/", city: "Charlottesville", state: "VA", zip: "22902",
    extraction: 'squarespace' },
  // www.c-mor.org's TLS cert no longer matches the host. The museum rebranded
  // to childrensmuseumofrichmond.org (verified 2026-04-30: HTTP 200).
  { name: "Children's Museum of Richmond", eventsUrl: "https://www.childrensmuseumofrichmond.org/events/", city: "Richmond", state: "VA", zip: "23219" },
  // West Virginia
  { name: "Clay Center / Avampato Discovery Museum", eventsUrl: "https://www.theclaycenter.org/events/", city: "Charleston", state: "WV", zip: "25301" },
  // Wisconsin
  { name: "Betty Brinn Children's Museum", eventsUrl: "https://bbcmkids.org/events/", city: "Milwaukee", state: "WI", zip: "53202",
    extraction: 'events-manager' },
  { name: "Madison Children's Museum", eventsUrl: "https://madisonchildrensmuseum.org/events/", city: "Madison", state: "WI", zip: "53703",
    extraction: 'tec' },
  // www. redirects to bare domain. TEC REST API confirmed 2026-06-29 (62 events).
  { name: "Discovery World", eventsUrl: "https://discoveryworld.org/", city: "Milwaukee", state: "WI", zip: "53202",
    extraction: 'tec-api', tecApiUrl: 'https://discoveryworld.org/wp-json/tribe/events/v1/events' },
];

// ==========================================
// EVENT EXTRACTION SELECTORS
// ==========================================

const EVENT_SELECTORS = {
  // Generic event card selectors (fallback chain)
  eventContainer: [
    // TEC (The Events Calendar) — very common on museum sites
    'article.tribe-events-calendar-list__event',
    'article.tribe-event',
    '.tribe-events-calendar-list__event-row',
    // MEC (Modern Events Calendar)
    'article.mec-event-article',
    '.mec-event-article',
    // EventON
    '.eventon_list_event',
    // Events Manager
    '.event-single',
    // Squarespace
    '.eventlist-event',
    // Webflow CMS collections
    '.w-dyn-item',
    // Generic selectors
    '.event-card',
    'article[class*="event"]',
    '[class*="event-item"]',
    '[class*="event-listing"]',
    '.event',
    '[data-event-id]',
  ],
  // Event title selectors
  title: [
    // TEC
    'a.tribe-events-calendar-list__event-title-link',
    'a.tribe-event-url',
    // MEC
    '.mec-event-title a',
    'h4.mec-event-title',
    // EventON
    '.eventon_event_title',
    // Squarespace
    '.eventlist-title a',
    'a.eventlist-title-link',
    // Events Manager
    '.event-title a',
    // Generic
    '.event-title',
    'h3',
    'h2',
    '[class*="event-name"]',
    '[class*="event-title"]',
  ],
  // Date selectors — deliberately specific; avoid [class*="date"] (matches month pickers)
  // and bare `time` (matches time-only elements like "14:00")
  date: [
    // TEC
    '.tribe-events-calendar-list__event-datetime',
    // MEC
    '.mec-start-date-details',
    '.mec-event-date',
    '.mec-start-date-label',
    // EventON
    '.evcal_desc2 .date',
    // Squarespace
    '.eventlist-datetag',
    '.eventlist-meta-date',
    // Generic — specific enough to avoid month pickers
    '.event-date',
    '.event-start-date',
    '.event-datetime',
    '[data-date]',
    '.when',
    // time[datetime] last — only used if datetime attr contains a full date (see extraction logic)
    'time[datetime]',
  ],
  // Description selectors
  description: [
    '.tribe-events-calendar-list__event-description p',
    '.mec-event-description',
    '.event-description',
    '.event-summary',
    '[class*="description"]',
    '.content',
    'p',
  ],
  // Link selectors
  link: [
    'a.tribe-events-calendar-list__event-title-link',
    'a.tribe-event-url',
    '.mec-event-title a',
    '.eventlist-title a',
    'a[href]',
    '[class*="event-link"]',
  ],
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Validate that a string looks like an actual event date (not a time, day-number, or dropdown text)
 */
function isValidEventDate(s) {
  if (!s || !s.trim()) return false;
  s = s.trim().replace(/\s+/g, ' ');
  if (s.length < 4) return false;
  if (/^\d{1,2}:\d{2}(:\d{2})?(\s*(am|pm|AM|PM|Z))?$/.test(s)) return false; // time-only
  if (/^\d{1,2}$/.test(s)) return false;                                        // day-only
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}$/.test(s)) return false;      // weekday + day only
  if (/select\s+month/i.test(s)) return false;                                  // dropdown text
  // Must contain a year OR a month name/abbrev OR ISO date
  return /\b(202[4-9]|203\d)\b/.test(s)
    || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)
    || /\d{4}-\d{2}-\d{2}/.test(s);
}

/**
 * Extract events from JSON-LD structured data (most reliable when available)
 */
function extractJsonLd(document, baseUrl) {
  const results = [];
  const now = new Date();
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      let data = JSON.parse(script.textContent);
      if (!Array.isArray(data)) data = [data];
      data.forEach(item => {
        const items = item['@graph'] ? item['@graph'] : [item];
        items.filter(i => i['@type'] === 'Event' && i.name).forEach(e => {
          const dateText = e.startDate || '';
          if (dateText) {
            const d = new Date(dateText);
            if (!isNaN(d.getTime()) && d < now) return; // skip past
          }
          results.push({
            name: String(e.name).replace(/\s+/g, ' ').trim().substring(0, 200),
            eventDate: dateText,
            description: (e.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
            url: e.url || baseUrl,
          });
        });
      });
    } catch (e) {}
  });
  return results;
}

/**
 * Fetch events from TEC (The Events Calendar) REST API.
 * Returns events in FunHive format with clean ISO dates.
 */
async function fetchTecApiEvents(venue) {
  const results = [];
  const today = new Date().toISOString().split('T')[0];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  let page = 1;
  while (page <= 6) {
    const url = `${venue.tecApiUrl}?per_page=50&page=${page}&start_date=${today}&end_date=${cutoffStr}`;
    let response;
    try {
      response = await axios.get(url, {
        headers: { 'User-Agent': 'FunHive-EventAggregator/1.0 (family-events)' },
        timeout: 15000
      });
    } catch (e) {
      console.log(`      [tec-api] page ${page} error: ${e.message}`);
      break;
    }

    const events = response.data.events || [];
    if (events.length === 0) break;

    events.forEach(e => {
      if (!e.title || !e.start_date) return;
      const d = new Date(e.start_date.replace(' ', 'T'));
      if (isNaN(d.getTime()) || d < new Date()) return;

      const dateOnly = e.start_date.split(' ')[0];  // "2026-07-15"
      const startTime = e.start_date.split(' ')[1]?.substring(0, 5) || '';
      const endTime = e.end_date?.split(' ')[1]?.substring(0, 5) || '';

      results.push({
        name: String(e.title).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 200),
        eventDate: dateOnly,
        startTime,
        endTime,
        description: (e.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 500),
        url: e.url || venue.eventsUrl,
      });
    });

    if (!response.data.next_rest_url) break;
    page++;
  }

  console.log(`      [tec-api] fetched ${results.length} events`);
  return results;
}

/**
 * Extract text safely from element
 */
function safeText(elem, selector) {
  if (!elem) return '';
  try {
    if (selector) {
      const selected = elem.querySelector(selector);
      return selected?.textContent?.trim() || '';
    }
    return elem.textContent?.trim() || '';
  } catch (e) {
    return '';
  }
}

/**
 * Make a URL absolute relative to the base URL.
 */
function makeAbsoluteUrl(link, baseUrl) {
  if (!link) return '';
  try {
    if (link.startsWith('/')) return new URL(link, baseUrl).href;
    if (!link.startsWith('http')) return new URL(link, baseUrl).href;
    return link;
  } catch (e) {
    return link;
  }
}

/**
 * Platform-specific extraction: TEC (The Events Calendar)
 */
function extractTEC(document, baseUrl) {
  const results = [];
  // List view
  document.querySelectorAll(
    'article.tribe-events-calendar-list__event, article.tribe-event, .tribe-events-calendar-list__event-row'
  ).forEach(el => {
    const titleEl = el.querySelector('a.tribe-events-calendar-list__event-title-link, a.tribe-event-url, .tribe-events-calendar-list__event-title a');
    const dateEl = el.querySelector('.tribe-events-calendar-list__event-datetime, time[datetime], .tribe-events-calendar-list__event-date-tag');
    const descEl = el.querySelector('.tribe-events-calendar-list__event-description p, .tribe-events-content p');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const url = titleEl ? makeAbsoluteUrl(titleEl.getAttribute('href'), baseUrl) : '';
    let dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    if (title) results.push({ name: title.substring(0, 200), eventDate: dateText.substring(0, 100), url: url || baseUrl, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  // Day/month view fallback
  if (results.length === 0) {
    document.querySelectorAll('a.tribe-events-calendar-day__event-title-link, a.tribe-events-calendar-month__calendar-event-title-link').forEach(a => {
      results.push({ name: a.textContent.trim().substring(0, 200), eventDate: '', url: makeAbsoluteUrl(a.getAttribute('href'), baseUrl) || baseUrl, description: '' });
    });
  }
  return results;
}

/**
 * Platform-specific extraction: MEC (Modern Events Calendar)
 */
function extractMEC(document, baseUrl) {
  const results = [];
  document.querySelectorAll('article.mec-event-article, .mec-event-article').forEach(el => {
    const titleEl = el.querySelector('.mec-event-title a, h4.mec-event-title');
    const dateEl = el.querySelector('.mec-start-date-details, .mec-event-date, .mec-start-date-label');
    const descEl = el.querySelector('.mec-event-description');
    const linkEl = el.querySelector('.mec-event-title a');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : '';
    const dateText = dateEl ? dateEl.textContent.trim() : '';
    if (title) results.push({ name: title.substring(0, 200), eventDate: dateText.substring(0, 100), url: url || baseUrl, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  return results;
}

/**
 * Platform-specific extraction: EventON
 */
function extractEventON(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.eventon_list_event, .evcal_list_event, .evo_event').forEach(el => {
    // Title: broad fallback + data-attr (EventON v4 stores title in data-event_title)
    const titleEl = el.querySelector('.eventon_event_title a, .evcal_desc_title a, .evcal_event_title a, .evcal_event_title, .eventon_event_title, h3 a, h2 a, a');
    const name = (titleEl ? titleEl.textContent.trim() : '') || el.getAttribute('data-event_title') || '';
    if (!name) return;
    const linkEl = el.querySelector('a[href]');
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : baseUrl;
    // Date: data attribute first (EventON v4 stores ISO date in data-event_startdate)
    const startDate = el.getAttribute('data-event_startdate') || el.getAttribute('data-start-date') || '';
    const dateEl = el.querySelector('.evcal_desc2 .date, .evcal_date, .evo_date, .evcal_dateformat_span');
    const dateText = startDate || (dateEl ? dateEl.textContent.trim() : '');
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: '' });
  });
  return results;
}

/**
 * Platform-specific extraction: Squarespace
 */
function extractSquarespace(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.eventlist-event').forEach(el => {
    const titleEl = el.querySelector('.eventlist-title a, a.eventlist-title-link, .eventlist-title');
    const dateEl = el.querySelector('.eventlist-datetag, .eventlist-meta-date, time.event-date');
    const descEl = el.querySelector('.eventlist-description p');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const url = titleEl && titleEl.getAttribute('href') ? makeAbsoluteUrl(titleEl.getAttribute('href'), baseUrl) : '';
    let dateText = '';
    if (dateEl) {
      dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
    }
    if (title) results.push({ name: title.substring(0, 200), eventDate: dateText.substring(0, 100), url: url || baseUrl, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  return results;
}

/**
 * Platform-specific extraction: Webflow CMS collection lists
 */
function extractWebflow(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.w-dyn-item, .calendar-event').forEach(el => {
    const titleEl = el.querySelector('h5, h4, h3, .event-title, [class*="title"]');
    const dateEl = el.querySelector('.meta-tag, .event-date, .start-date, time, [class*="date"]');
    const linkEl = el.querySelector('a[href]');
    const descEl = el.querySelector('p, .description');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : '';
    const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    if (title) results.push({ name: title.substring(0, 200), eventDate: dateText.substring(0, 100), url: url || baseUrl, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  return results;
}

/**
 * Platform-specific extraction: WP Events Manager plugin
 */
function extractEventsManager(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.event-single, .em-item, .event').forEach(el => {
    const titleEl = el.querySelector('.event-title a, h3 a, h2 a, .event-title');
    const dateEl = el.querySelector('.event-date, time[datetime], .date');
    const linkEl = el.querySelector('.event-title a, h3 a, a[href]');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : '';
    const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    if (title) results.push({ name: title.substring(0, 200), eventDate: dateText.substring(0, 100), url: url || baseUrl, description: '' });
  });
  return results;
}

/**
 * Platform-specific extraction: STEC (Simple/Smart Events Calendar plugin)
 * Classes: .stec-grid-event, .stec-grid-event-title, .stec-grid-event-nfo
 */
function extractSTEC(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.stec-grid-event, .stec-list-event').forEach(el => {
    const titleEl = el.querySelector('.stec-grid-event-title, .stec-list-event-title, [class*="stec-"][class*="title"]');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    // STEC stores start date in data-start (Unix ms) or data-start-date (ISO)
    const rawDate = el.getAttribute('data-start-date') || el.getAttribute('data-start') || '';
    let dateText = rawDate;
    if (rawDate && /^\d{10,13}$/.test(rawDate)) {
      const ms = rawDate.length === 10 ? parseInt(rawDate) * 1000 : parseInt(rawDate);
      dateText = new Date(ms).toISOString().split('T')[0];
    }
    if (!dateText) {
      const nfo = el.querySelector('.stec-grid-event-nfo, .stec-list-event-nfo, [class*="stec-"][class*="nfo"]');
      dateText = nfo ? nfo.textContent.trim().substring(0, 100) : '';
    }
    const linkEl = el.querySelector('a[href]');
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : baseUrl;
    const descEl = el.querySelector('.stec-grid-event-description, .stec-list-event-description');
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  return results;
}

/**
 * Platform-specific extraction: TEC Photo/List view
 * Classes: event-thumbnail-size-*, event-date-label, a.url
 * Used by Chicago Children's Museum (TEC with Photo view template)
 */
function extractTECPhotoView(document, baseUrl) {
  const results = [];
  document.querySelectorAll('article[class*="event-thumbnail"], [class*="event-thumbnail-size"]').forEach(el => {
    const titleEl = el.querySelector('a.url, .tribe-events-list-event-title a, h2 a, h3 a');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    const url = titleEl ? makeAbsoluteUrl(titleEl.getAttribute('href'), baseUrl) : baseUrl;
    const dateEl = el.querySelector('.event-date-label, .tribe-events-abbr, abbr[title], .tribe-events-start-datetime');
    const dateText = dateEl ? (dateEl.getAttribute('title') || dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    const descEl = el.querySelector('.event-excerpt p, .tribe-events-list-event-description p, p');
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  return results;
}

/**
 * Platform-specific extraction: Indianapolis Children's Museum custom calendar
 * Classes: .calendar-event-card, .calendar-event-info, .calendar-event-info-items
 */
function extractCustomIndy(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.calendar-event-card').forEach(el => {
    const titleEl = el.querySelector('h3, h2, h4, [class*="title"], a');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    const linkEl = el.querySelector('a[href]');
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : baseUrl;
    const dateEl = el.querySelector('.calendar-event-info-items time, time[datetime], [class*="date"]');
    const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: '' });
  });
  return results;
}

/**
 * Platform-specific extraction: Drupal calendar views
 * Classes: .node--type-event, .event-title, .field--name-field-event-date
 * Used by Discovery Museum Acton (Drupal 8/9 with Views calendar)
 */
function extractDrupal(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.node--type-event, article[class*="node--type-event"]').forEach(el => {
    const titleEl = el.querySelector('.event-title a, .node-title a, h3 a, h2 a');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    const url = titleEl ? makeAbsoluteUrl(titleEl.getAttribute('href'), baseUrl) : baseUrl;
    const dateEl = el.querySelector('.field--name-field-event-date time, time[datetime], .event-date');
    const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    const descEl = el.querySelector('.field--name-body p, .node__content p');
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: (descEl ? descEl.textContent.trim() : '').substring(0, 500) });
  });
  return results;
}

/**
 * Platform-specific extraction: Long Island Children's Museum custom layout
 * Classes: .event-result, .event-info, .event-image
 */
function extractLICM(document, baseUrl) {
  const results = [];
  document.querySelectorAll('.event-result').forEach(el => {
    const titleEl = el.querySelector('.event-info h3, .event-info h2, .event-info a, h3, h2');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    const linkEl = el.querySelector('a[href]');
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : baseUrl;
    const dateEl = el.querySelector('.event-info time, time[datetime], .event-info [class*="date"], [class*="event-date"]');
    const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: '' });
  });
  return results;
}

/**
 * Platform-specific extraction: WordPress custom post type archive
 * Classes: post-type-archive-cma-program (body), article[class*="type-cma"]
 * Used by Children's Museum of Atlanta (/programs/ archive)
 */
function extractWordPressCPT(document, baseUrl) {
  const results = [];
  document.querySelectorAll('article[class*="cma-program"], article[class*="type-cma"], .program-item, article.post').forEach(el => {
    const titleEl = el.querySelector('.entry-title a, h2 a, h3 a, a[rel="bookmark"]');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;
    const url = titleEl ? makeAbsoluteUrl(titleEl.getAttribute('href'), baseUrl) : baseUrl;
    const dateEl = el.querySelector('time[datetime], .entry-date, .event-date, [class*="date"]');
    const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';
    results.push({ name: name.substring(0, 200), eventDate: dateText.substring(0, 100), url, description: '' });
  });
  return results;
}

/**
 * Extract events from page using platform-specific or generic CSS selectors.
 * @param {string} html - The page HTML
 * @param {string} baseUrl - The base URL for resolving relative links
 * @param {object} venue - The venue object (may have .extraction platform hint)
 */
function extractEventsFromPage(html, baseUrl, venue = {}) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const platform = venue.extraction || null;

  // 1. Try JSON-LD structured data first (most reliable when present)
  const jsonLdEvents = extractJsonLd(document, baseUrl);
  if (jsonLdEvents.length > 0) {
    console.log(`      [json-ld] extracted ${jsonLdEvents.length} events`);
    return filterJunkEvents(jsonLdEvents);
  }

  // 2. Try platform-specific extraction
  if (platform) {
    let platformEvents = [];
    switch (platform) {
      case 'tec': platformEvents = extractTEC(document, baseUrl); break;
      case 'mec': platformEvents = extractMEC(document, baseUrl); break;
      case 'eventon': platformEvents = extractEventON(document, baseUrl); break;
      case 'squarespace': platformEvents = extractSquarespace(document, baseUrl); break;
      case 'webflow': platformEvents = extractWebflow(document, baseUrl); break;
      case 'events-manager': platformEvents = extractEventsManager(document, baseUrl); break;
      case 'stec': platformEvents = extractSTEC(document, baseUrl); break;
      case 'tec-photo': platformEvents = extractTECPhotoView(document, baseUrl); break;
      case 'custom-indy': platformEvents = extractCustomIndy(document, baseUrl); break;
      case 'drupal': platformEvents = extractDrupal(document, baseUrl); break;
      case 'licm': platformEvents = extractLICM(document, baseUrl); break;
      case 'wp-cpt': platformEvents = extractWordPressCPT(document, baseUrl); break;
    }
    if (platformEvents.length > 0) {
      console.log(`      [${platform}] extracted ${platformEvents.length} events`);
      return filterJunkEvents(platformEvents);
    }
  }

  const events = [];
  const seenTitles = new Set();

  // Try each container selector
  for (const containerSelector of EVENT_SELECTORS.eventContainer) {
    const containers = document.querySelectorAll(containerSelector);
    if (containers.length === 0) continue;

    containers.forEach((container) => {
      try {
        // Extract title
        let title = '';
        for (const titleSel of EVENT_SELECTORS.title) {
          const titleElem = container.querySelector(titleSel);
          if (titleElem) {
            title = titleElem.textContent.trim();
            if (title) break;
          }
        }

        if (!title || title.length < 3) return;
        if (seenTitles.has(title)) return;
        seenTitles.add(title);

        // Extract date — for time[datetime] elements only accept the attribute if it
        // contains a full date (has a year); time-only values like "14:00" are skipped.
        let eventDate = '';
        for (const dateSel of EVENT_SELECTORS.date) {
          const dateElem = container.querySelector(dateSel);
          if (!dateElem) continue;
          const datetimeAttr = dateElem.getAttribute('datetime') || '';
          const textContent = dateElem.textContent.trim();
          // For time[datetime]: only use attribute if it has a year
          if (dateSel === 'time[datetime]' && datetimeAttr && !/\d{4}/.test(datetimeAttr)) {
            continue; // time-only attribute like "14:00" or "T09:30" — skip
          }
          const candidate = (/\d{4}/.test(datetimeAttr) ? datetimeAttr : '') || textContent;
          if (candidate && isValidEventDate(candidate)) {
            eventDate = candidate;
            break;
          }
        }

        // Extract description
        let description = '';
        for (const descSel of EVENT_SELECTORS.description) {
          const descElem = container.querySelector(descSel);
          if (descElem) {
            description = descElem.textContent.trim();
            if (description && description.length > 10) break;
          }
        }

        // Extract link
        let link = '';
        for (const linkSel of EVENT_SELECTORS.link) {
          const linkElem = container.querySelector(linkSel);
          if (linkElem) {
            link = linkElem.getAttribute('href') || '';
            if (link) {
              link = makeAbsoluteUrl(link, baseUrl);
              break;
            }
          }
        }

        if (title) {
          events.push({
            name: title.substring(0, 200),
            eventDate: eventDate.substring(0, 100),
            description: description.substring(0, 500),
            url: link || baseUrl,
          });
        }
      } catch (e) {
        // Skip malformed entries
      }
    });

    if (events.length > 0) break; // Stop if we found events
  }

  return filterJunkEvents(events);
}

/**
 * Filter out navigation elements and page chrome
 */
function filterJunkEvents(events) {
  return events.filter(e => {
    if (!e.name || e.name.trim().length < 4) return false;
    // Keep events even without dates (platform-specific extractors may get URL-only entries)
    // but filter obvious non-event entries
    if (/^(visit|plan your|get ticket|buy ticket|membership|explore|animals?|exhibits?|learn|support|about|contact|404|page not found|oops|search|login|sign up|my account|footer|header|menu|nav)/i.test(e.name.trim())) return false;
    return true;
  });
}

/**
 * Scrape a single venue's events page (or REST API if venue.tecApiUrl is set)
 */
async function scrapeVenue(browser, venue, logger) {
  logger.startSite(venue.name, venue.eventsUrl, { state: venue.state });

  try {
    let pageEvents = [];

    // REST API path — no Puppeteer needed
    if (venue.extraction === 'tec-api' && venue.tecApiUrl) {
      pageEvents = await fetchTecApiEvents(venue);
    } else {
      // Puppeteer path
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(venue.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(resolve => setTimeout(resolve, 3500));

      const html = await page.content();
      await page.close();

      pageEvents = extractEventsFromPage(html, venue.eventsUrl, venue);
    }

    logger.trackFound(pageEvents.length);

    const convertedEvents = pageEvents.map(event => ({
      name: event.name || 'Untitled Event',
      eventDate: event.eventDate || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      description: event.description || '',
      venue: venue.name,
      address: `${venue.city}, ${venue.state} ${venue.zip}`,
      city: venue.city,
      state: venue.state,
      zipCode: venue.zip,
      url: event.url || venue.eventsUrl,
      category: 'Community Events',
      parentCategory: 'Learning & Culture',
      displayCategory: 'Museum Event',
      subcategory: 'Museum Workshop',
      metadata: {
        sourceName: venue.name,
        sourceUrl: venue.eventsUrl,
        scraperName: SCRAPER_NAME,
        state: venue.state,
        venueType: 'children-museum',
      },
    }));

    logger.endSite();
    return convertedEvents;

  } catch (error) {
    console.error(`    ❌ Error scraping ${venue.name}: ${error.message}`);
    logger.trackError(error);
    logger.endSite();
    return [];
  }
}

/**
 * Main scraper function
 */
async function scrapeChildrensMuseumEvents(options = {}) {
  const { state: filterState = null, venue: filterVenue = null, maxVenues = null } = options;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎨 CHILDREN'S MUSEUMS EVENTS SCRAPER - EASTERN US`);
  console.log(`${'='.repeat(70)}`);

  // Filter venues if needed
  let venues = VENUES;
  if (filterState) {
    venues = venues.filter(v => v.state.toUpperCase() === filterState.toUpperCase());
    console.log(`📍 Filtering by state: ${filterState}`);
  }
  if (filterVenue) {
    venues = venues.filter(v => v.name.toLowerCase().includes(filterVenue.toLowerCase()));
    console.log(`🏛️  Filtering by venue: ${filterVenue}`);
  }
  if (maxVenues) {
    venues = venues.slice(0, maxVenues);
  }

  console.log(`📊 Total venues to scrape: ${venues.length}`);
  console.log(`${'='.repeat(70)}\n`);

  const logger = new ScraperLogger(SCRAPER_NAME, 'events', { source: 'children-museums' });

  let browser = null;
  const allEvents = [];

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await launchBrowser({ stealth: true });

    // Scrape each venue
    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];
      const progress = `[${i + 1}/${venues.length}]`;

      console.log(`\n${progress} 🏛️  ${venue.name} (${venue.city}, ${venue.state})`);
      const venueEvents = await scrapeVenue(browser, venue, logger);

      if (venueEvents.length > 0) {
        console.log(`    ✅ Found ${venueEvents.length} events`);
        allEvents.push(...venueEvents);
      } else {
        console.log(`    ⚠️  No events found`);
      }

      // Rate limiting: 3 second delay between venues
      if (i < venues.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📥 Total events extracted: ${allEvents.length}`);
  console.log(`${'='.repeat(70)}\n`);

  // Save events with geocoding
  let saveStats = { saved: 0, skipped: 0, invalidDate: 0, errors: 0 };
  if (allEvents.length > 0) {
    console.log('💾 Saving events to database...');
    const saveOptions = {
      scraperName: SCRAPER_NAME,
      state: filterState || 'Multi',
    };
    console.log(`   Save options: scraperName=${saveOptions.scraperName}, state=${saveOptions.state}`);
    try {
      const result = await saveEventsWithGeocoding(
        allEvents,
        VENUES.map(v => ({
          name: v.name,
          address: `${v.city}, ${v.state} ${v.zip}`,
          city: v.city,
          state: v.state,
          zipCode: v.zip,
        })),
        saveOptions
      );
      if (result) {
        saveStats.saved = result.saved || 0;
        saveStats.skipped = result.skipped || 0;
        saveStats.invalidDate = result.invalidDate || 0;
        saveStats.errors = result.errors || 0;
        console.log(`   💾 Saved: ${saveStats.saved} | ⏭️ Skipped: ${saveStats.skipped} | ❌ Errors: ${saveStats.errors}`);
      }
    } catch (saveError) {
      console.error(`❌ Error saving events: ${saveError.message}`);
      logger.logError(saveError.message);
    }
  } else {
    console.log('⚠️  No events found across all venues — nothing to save');
  }

  // Finish logging
  await logger.finish();

  console.log(`${'='.repeat(70)}\n`);

  return {
    found: allEvents.length,
    new: saveStats.saved,
    saved: saveStats.saved,
    duplicates: saveStats.skipped,
    skipped: saveStats.skipped,
    invalidDate: saveStats.invalidDate,
    errors: saveStats.errors,
  };
}

/**
 * Cloud Function export
 */
async function scrapeChildrensMuseumEventsCloudFunction(req = null, res = null) {
  console.log('☁️  Running as Cloud Function');

  // Parse query parameters if available
  const state = req?.query?.state || null;
  const venue = req?.query?.venue || null;

  const result = await scrapeChildrensMuseumEvents({ state, venue });

  if (res) {
    res.json({ success: true, stats: result.stats, executionTime: result.executionTime });
  }

  return result;
}

// ==========================================
// CLI EXECUTION
// ==========================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--state' && args[i + 1]) {
      options.state = args[i + 1];
      i++;
    } else if (args[i] === '--venue' && args[i + 1]) {
      options.venue = args[i + 1];
      i++;
    } else if (args[i] === '--max' && args[i + 1]) {
      options.maxVenues = parseInt(args[i + 1], 10);
      i++;
    }
  }

  scrapeChildrensMuseumEvents(options)
    .then(() => {
      console.log('✅ Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeChildrensMuseumEvents,
  scrapeChildrensMuseumEventsCloudFunction,
  VENUES,
};
