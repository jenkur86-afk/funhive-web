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

const SCRAPER_NAME = 'ChildrensMuseums-Events-Eastern';

// ==========================================
// VENUE CONFIGURATION ARRAY
// ==========================================

const VENUES = [
  // Alabama
  { name: "McWane Science Center", eventsUrl: "https://mcwane.org/events/", city: "Birmingham", state: "AL", zip: "35203",
    extraction: 'mec' },
  { name: "EarlyWorks Children's Museum", eventsUrl: "https://earlyworks.com/events/", city: "Huntsville", state: "AL", zip: "35801",
    extraction: 'mec' },
  // Connecticut
  { name: "Stepping Stones Museum for Children", eventsUrl: "https://steppingstonesmuseum.org/calendar/", city: "Norwalk", state: "CT", zip: "06854" },
  { name: "Imagine Nation Museum", eventsUrl: "https://imaginenation.org/events/", city: "Bristol", state: "CT", zip: "06010" },
  // DC
  { name: "National Children's Museum", eventsUrl: "https://nationalchildrensmuseum.org/events/", city: "Washington", state: "DC", zip: "20004" },
  // Delaware
  { name: "Delaware Children's Museum", eventsUrl: "https://delawarechildrensmuseum.org/events/", city: "Wilmington", state: "DE", zip: "19801" },
  // Florida
  { name: "Miami Children's Museum", eventsUrl: "https://www.miamichildrensmuseum.org/events/", city: "Miami", state: "FL", zip: "33132",
    extraction: 'webflow' },
  { name: "Glazer Children's Museum", eventsUrl: "https://www.glazermuseum.org/visit/calendar", city: "Tampa", state: "FL", zip: "33602" },
  { name: "Golisano Children's Museum of Naples", eventsUrl: "https://cmonaples.org/events/", city: "Naples", state: "FL", zip: "34110" },
  { name: "Great Explorations", eventsUrl: "https://www.greatexplorations.org/events/", city: "St. Petersburg", state: "FL", zip: "33701" },
  // Georgia
  { name: "Children's Museum of Atlanta", eventsUrl: "https://childrensmuseumatlanta.org/events/", city: "Atlanta", state: "GA", zip: "30313" },
  // Illinois
  { name: "Chicago Children's Museum", eventsUrl: "https://www.chicagochildrensmuseum.org/program-calendar", city: "Chicago", state: "IL", zip: "60611",
    extraction: 'squarespace' },
  { name: "Kohl Children's Museum", eventsUrl: "https://www.kohlchildrensmuseum.org/visit/events-and-programs/", city: "Glenview", state: "IL", zip: "60025" },
  // Indiana
  { name: "The Children's Museum of Indianapolis", eventsUrl: "https://www.childrensmuseum.org/visit/calendar", city: "Indianapolis", state: "IN", zip: "46208" },
  // Kentucky
  { name: "Kentucky Science Center", eventsUrl: "https://kysciencecenter.org/events/", city: "Louisville", state: "KY", zip: "40202",
    extraction: 'tec' },
  // Maine
  { name: "Children's Museum & Theatre of Maine", eventsUrl: "https://www.kitetails.org/calendar/", city: "Portland", state: "ME", zip: "04101",
    extraction: 'squarespace' },
  { name: "Maine Discovery Museum", eventsUrl: "https://www.mainediscoverymuseum.org/special-events", city: "Bangor", state: "ME", zip: "04401",
    extraction: 'squarespace' },
  // Massachusetts
  { name: "Boston Children's Museum", eventsUrl: "https://www.bostonchildrensmuseum.org/programs-events", city: "Boston", state: "MA", zip: "02210" },
  { name: "Discovery Museum", eventsUrl: "https://www.discoveryacton.org/visit/programs", city: "Acton", state: "MA", zip: "01720" },
  // Michigan
  { name: "Grand Rapids Children's Museum", eventsUrl: "https://www.grcm.org/events/", city: "Grand Rapids", state: "MI", zip: "49503" },
  // Mississippi
  { name: "Mississippi Children's Museum", eventsUrl: "https://mschildrensmuseum.org/events/", city: "Jackson", state: "MS", zip: "39202",
    extraction: 'tec' },
  // New Hampshire
  { name: "Children's Museum of New Hampshire", eventsUrl: "https://childrens-museum.org/calendar/", city: "Dover", state: "NH", zip: "03820" },
  // New Jersey
  { name: "Garden State Discovery Museum", eventsUrl: "https://discoverymuseum.com/events/", city: "Cherry Hill", state: "NJ", zip: "08003" },
  // New York
  { name: "Children's Museum of Manhattan", eventsUrl: "https://cmom.org/visit/calendar/", city: "New York", state: "NY", zip: "10024" },
  { name: "Brooklyn Children's Museum", eventsUrl: "https://www.brooklynkids.org/calendar/", city: "Brooklyn", state: "NY", zip: "11213",
    extraction: 'events-manager' },
  { name: "Long Island Children's Museum", eventsUrl: "https://www.licm.org/events/", city: "Garden City", state: "NY", zip: "11530" },
  { name: "Strong National Museum of Play", eventsUrl: "https://www.museumofplay.org/visit/calendar/", city: "Rochester", state: "NY", zip: "14607",
    extraction: 'tec' },
  // North Carolina
  { name: "Marbles Kids Museum", eventsUrl: "https://www.marbleskidsmuseum.org/events", city: "Raleigh", state: "NC", zip: "27601" },
  { name: "Discovery Place Science", eventsUrl: "https://science.discoveryplace.org/events-calendar", city: "Charlotte", state: "NC", zip: "28202" },
  { name: "Kidzu Children's Museum", eventsUrl: "https://kidzuchildrensmuseum.org/events/", city: "Chapel Hill", state: "NC", zip: "27516" },
  // Ohio
  { name: "COSI Columbus", eventsUrl: "https://cosi.org/events/", city: "Columbus", state: "OH", zip: "43215" },
  { name: "Children's Museum of Cleveland", eventsUrl: "https://cmcleveland.org/events/", city: "Cleveland", state: "OH", zip: "44106" },
  // Pennsylvania
  { name: "Please Touch Museum", eventsUrl: "https://www.pleasetouchmuseum.org/visit/events/", city: "Philadelphia", state: "PA", zip: "19131" },
  { name: "Children's Museum of Pittsburgh", eventsUrl: "https://pittsburghkids.org/events", city: "Pittsburgh", state: "PA", zip: "15212" },
  // Rhode Island
  { name: "Providence Children's Museum", eventsUrl: "https://providencechildrensmuseum.org/events/", city: "Providence", state: "RI", zip: "02903",
    extraction: 'eventon' },
  // South Carolina
  { name: "EdVenture Children's Museum", eventsUrl: "https://edventure.org/events/", city: "Columbia", state: "SC", zip: "29201",
    extraction: 'eventon' },
  { name: "Children's Museum of the Upstate", eventsUrl: "https://tcmupstate.org/events/", city: "Greenville", state: "SC", zip: "29601" },
  // Tennessee
  { name: "Adventure Science Center", eventsUrl: "https://www.adventuresci.org/events/", city: "Nashville", state: "TN", zip: "37210",
    extraction: 'tec' },
  { name: "Creative Discovery Museum", eventsUrl: "https://www.cdmfun.org/events", city: "Chattanooga", state: "TN", zip: "37402",
    extraction: 'webflow' },
  { name: "Muse Knoxville", eventsUrl: "https://themuseknoxville.org/events/", city: "Knoxville", state: "TN", zip: "37902",
    extraction: 'eventon' },
  // Vermont
  { name: "ECHO Leahy Center", eventsUrl: "https://www.echovermont.org/events/", city: "Burlington", state: "VT", zip: "05401",
    extraction: 'tec' },
  { name: "Montshire Museum of Science", eventsUrl: "https://montshire.org/events/", city: "Norwich", state: "VT", zip: "05055",
    extraction: 'tec' },
  // Virginia
  { name: "Virginia Discovery Museum", eventsUrl: "https://www.vadm.org/events/", city: "Charlottesville", state: "VA", zip: "22902",
    extraction: 'squarespace' },
  { name: "Children's Museum of Richmond", eventsUrl: "https://www.c-mor.org/events", city: "Richmond", state: "VA", zip: "23219" },
  // West Virginia
  { name: "Clay Center / Avampato Discovery Museum", eventsUrl: "https://www.theclaycenter.org/events/", city: "Charleston", state: "WV", zip: "25301" },
  // Wisconsin
  { name: "Betty Brinn Children's Museum", eventsUrl: "https://bbcmkids.org/events/", city: "Milwaukee", state: "WI", zip: "53202",
    extraction: 'events-manager' },
  { name: "Madison Children's Museum", eventsUrl: "https://madisonchildrensmuseum.org/events/", city: "Madison", state: "WI", zip: "53703",
    extraction: 'tec' },
  { name: "Discovery World", eventsUrl: "https://www.discoveryworld.org/events/", city: "Milwaukee", state: "WI", zip: "53202" },
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
  // Date selectors
  date: [
    // TEC
    '.tribe-events-calendar-list__event-datetime',
    'time[datetime]',
    // MEC
    '.mec-start-date-details',
    '.mec-event-date',
    '.mec-start-date-label',
    // EventON
    '.evcal_desc2 .date',
    // Squarespace
    '.eventlist-datetag',
    '.eventlist-meta-date',
    // Generic
    '.event-date',
    '[class*="date"]',
    'time',
    '[data-date]',
    '.when',
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
  document.querySelectorAll('.eventon_list_event, .evcal_list_event').forEach(el => {
    const titleEl = el.querySelector('.eventon_event_title, .evcal_desc_title, .evcal_event_title');
    const dateEl = el.querySelector('.evcal_desc2 .date, .evcal_date, [class*="date"]');
    const linkEl = el.querySelector('a[href]');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const url = linkEl ? makeAbsoluteUrl(linkEl.getAttribute('href'), baseUrl) : '';
    const dateText = dateEl ? dateEl.textContent.trim() : '';
    if (title) results.push({ name: title.substring(0, 200), eventDate: dateText.substring(0, 100), url: url || baseUrl, description: '' });
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

  // Try platform-specific extraction first
  if (platform) {
    let platformEvents = [];
    switch (platform) {
      case 'tec': platformEvents = extractTEC(document, baseUrl); break;
      case 'mec': platformEvents = extractMEC(document, baseUrl); break;
      case 'eventon': platformEvents = extractEventON(document, baseUrl); break;
      case 'squarespace': platformEvents = extractSquarespace(document, baseUrl); break;
      case 'webflow': platformEvents = extractWebflow(document, baseUrl); break;
      case 'events-manager': platformEvents = extractEventsManager(document, baseUrl); break;
    }
    if (platformEvents.length > 0) {
      console.log(`      [${platform}] extracted ${platformEvents.length} events`);
      return filterJunkEvents(platformEvents);
    }
    // Fall through to generic if platform-specific found nothing
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

        // Extract date
        let eventDate = '';
        for (const dateSel of EVENT_SELECTORS.date) {
          const dateElem = container.querySelector(dateSel);
          if (dateElem) {
            eventDate = dateElem.getAttribute('datetime') || dateElem.textContent.trim() || '';
            if (eventDate) break;
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
 * Scrape a single venue's events page
 */
async function scrapeVenue(browser, venue, logger) {
  logger.startSite(venue.name, venue.eventsUrl, { state: venue.state });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to events page
    await page.goto(venue.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract HTML
    const html = await page.content();
    await page.close();

    // Parse events from HTML
    const pageEvents = extractEventsFromPage(html, venue.eventsUrl, venue);
    logger.trackFound(pageEvents.length);

    // Convert events to FunHive format
    const convertedEvents = pageEvents.map(event => ({
      name: event.name || 'Untitled Event',
      eventDate: event.eventDate || '',
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
  if (allEvents.length > 0) {
    console.log('💾 Saving events to database...');
    const saveOptions = {
      scraperName: SCRAPER_NAME,
      state: filterState || 'Multi',
    };
    console.log(`   Save options: scraperName=${saveOptions.scraperName}, state=${saveOptions.state}`);
    try {
      await saveEventsWithGeocoding(
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
    } catch (saveError) {
      console.error(`❌ Error saving events: ${saveError.message}`);
      logger.logError(saveError.message);
    }
  } else {
    console.log('⚠️  No events found across all venues — nothing to save');
  }

  // Finish logging
  const result = await logger.finish();

  console.log(`${'='.repeat(70)}\n`);

  return result;
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
