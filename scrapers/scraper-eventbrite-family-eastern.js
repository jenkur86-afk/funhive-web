#!/usr/bin/env node

/**
 * EVENTBRITE FAMILY EVENTS SCRAPER - EASTERN US
 *
 * Scrapes family-friendly events from Eventbrite discovery pages across 28 eastern US states.
 * For each state, scrapes the top 3-5 cities by population using Eventbrite's family events
 * category pages.
 *
 * Coverage: AL, CT, DC, DE, FL, GA, IA, IL, IN, KY, MA, MD, ME, MN, MS, NC, NH, NJ, NY,
 *           OH, PA, RI, SC, TN, VA, VT, WI, WV
 *
 * Estimated Events: 300-800 per run (varies by city event availability)
 *
 * Usage:
 *   node scraper-eventbrite-family-eastern.js                # All cities
 *   node scraper-eventbrite-family-eastern.js --state NY     # Single state
 *   node scraper-eventbrite-family-eastern.js --dry          # Dry run (no DB save)
 *
 * Cloud Function: scrapeEventbriteFamilyCloudFunction
 * Schedule: Every 3 days (Group 2: days 2,5,8,11...)
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');

const SCRAPER_NAME = 'Eventbrite-Family-Eastern';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// VALID US STATE ABBREVIATIONS (filter out Canadian provinces, etc.)
// ==========================================
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]);

// ==========================================
// ADULT-ONLY / NON-FAMILY KEYWORDS
// ==========================================

const ADULT_KEYWORDS = [
  'beer', 'wine', 'brewery', 'cocktail', 'happy hour', 'bar crawl',
  'pub crawl', 'wine tasting', 'spirits', 'bourbon', 'whiskey',
  '21+', '21 and over', 'ages 21', 'must be 21',
  'burlesque', 'drag brunch', 'singles night', 'speed dating',
  'strip', 'pole dance', 'adult only', 'adults only', 'no kids',
  'nightclub', 'club night', 'rave', 'edm night',
  'cannabis', 'marijuana', '420',
  'bachelorette', 'bachelor party',
];

// ==========================================
// CITIES CONFIGURATION (~100 entries, 3-5 per state)
// ==========================================

const CITIES = [
  // Alabama (AL)
  { city: 'Birmingham', state: 'AL', slug: 'al--birmingham' },
  { city: 'Huntsville', state: 'AL', slug: 'al--huntsville' },
  { city: 'Montgomery', state: 'AL', slug: 'al--montgomery' },
  { city: 'Mobile', state: 'AL', slug: 'al--mobile' },

  // Connecticut (CT)
  { city: 'Hartford', state: 'CT', slug: 'ct--hartford' },
  { city: 'New Haven', state: 'CT', slug: 'ct--new-haven' },
  { city: 'Stamford', state: 'CT', slug: 'ct--stamford' },

  // District of Columbia (DC)
  { city: 'Washington', state: 'DC', slug: 'dc--washington' },

  // Delaware (DE)
  { city: 'Wilmington', state: 'DE', slug: 'de--wilmington' },
  { city: 'Dover', state: 'DE', slug: 'de--dover' },
  { city: 'Newark', state: 'DE', slug: 'de--newark' },

  // Florida (FL)
  { city: 'Miami', state: 'FL', slug: 'fl--miami' },
  { city: 'Orlando', state: 'FL', slug: 'fl--orlando' },
  { city: 'Tampa', state: 'FL', slug: 'fl--tampa' },
  { city: 'Jacksonville', state: 'FL', slug: 'fl--jacksonville' },
  { city: 'Fort Lauderdale', state: 'FL', slug: 'fl--fort-lauderdale' },

  // Georgia (GA)
  { city: 'Atlanta', state: 'GA', slug: 'ga--atlanta' },
  { city: 'Savannah', state: 'GA', slug: 'ga--savannah' },
  { city: 'Augusta', state: 'GA', slug: 'ga--augusta' },

  // Iowa (IA)
  { city: 'Des Moines', state: 'IA', slug: 'ia--des-moines' },
  { city: 'Cedar Rapids', state: 'IA', slug: 'ia--cedar-rapids' },
  { city: 'Iowa City', state: 'IA', slug: 'ia--iowa-city' },

  // Illinois (IL)
  { city: 'Chicago', state: 'IL', slug: 'il--chicago' },
  { city: 'Springfield', state: 'IL', slug: 'il--springfield' },
  { city: 'Naperville', state: 'IL', slug: 'il--naperville' },
  { city: 'Rockford', state: 'IL', slug: 'il--rockford' },

  // Indiana (IN)
  { city: 'Indianapolis', state: 'IN', slug: 'in--indianapolis' },
  { city: 'Fort Wayne', state: 'IN', slug: 'in--fort-wayne' },
  { city: 'Evansville', state: 'IN', slug: 'in--evansville' },

  // Kentucky (KY)
  { city: 'Louisville', state: 'KY', slug: 'ky--louisville' },
  { city: 'Lexington', state: 'KY', slug: 'ky--lexington' },
  { city: 'Bowling Green', state: 'KY', slug: 'ky--bowling-green' },

  // Massachusetts (MA)
  { city: 'Boston', state: 'MA', slug: 'ma--boston' },
  { city: 'Worcester', state: 'MA', slug: 'ma--worcester' },
  { city: 'Cambridge', state: 'MA', slug: 'ma--cambridge' },
  { city: 'Springfield', state: 'MA', slug: 'ma--springfield' },

  // Maryland (MD)
  { city: 'Baltimore', state: 'MD', slug: 'md--baltimore' },
  { city: 'Bethesda', state: 'MD', slug: 'md--bethesda' },
  { city: 'Silver Spring', state: 'MD', slug: 'md--silver-spring' },
  { city: 'Annapolis', state: 'MD', slug: 'md--annapolis' },

  // Maine (ME)
  { city: 'Portland', state: 'ME', slug: 'me--portland' },
  { city: 'Bangor', state: 'ME', slug: 'me--bangor' },
  { city: 'Lewiston', state: 'ME', slug: 'me--lewiston' },

  // Minnesota (MN)
  { city: 'Minneapolis', state: 'MN', slug: 'mn--minneapolis' },
  { city: 'Saint Paul', state: 'MN', slug: 'mn--saint-paul' },
  { city: 'Rochester', state: 'MN', slug: 'mn--rochester' },
  { city: 'Duluth', state: 'MN', slug: 'mn--duluth' },

  // Mississippi (MS)
  { city: 'Jackson', state: 'MS', slug: 'ms--jackson' },
  { city: 'Gulfport', state: 'MS', slug: 'ms--gulfport' },
  { city: 'Hattiesburg', state: 'MS', slug: 'ms--hattiesburg' },

  // North Carolina (NC)
  { city: 'Charlotte', state: 'NC', slug: 'nc--charlotte' },
  { city: 'Raleigh', state: 'NC', slug: 'nc--raleigh' },
  { city: 'Durham', state: 'NC', slug: 'nc--durham' },
  { city: 'Greensboro', state: 'NC', slug: 'nc--greensboro' },

  // New Hampshire (NH)
  { city: 'Manchester', state: 'NH', slug: 'nh--manchester' },
  { city: 'Nashua', state: 'NH', slug: 'nh--nashua' },
  { city: 'Concord', state: 'NH', slug: 'nh--concord' },

  // New Jersey (NJ)
  { city: 'Newark', state: 'NJ', slug: 'nj--newark' },
  { city: 'Jersey City', state: 'NJ', slug: 'nj--jersey-city' },
  { city: 'Princeton', state: 'NJ', slug: 'nj--princeton' },
  { city: 'Hoboken', state: 'NJ', slug: 'nj--hoboken' },

  // New York (NY)
  { city: 'New York', state: 'NY', slug: 'ny--new-york' },
  { city: 'Brooklyn', state: 'NY', slug: 'ny--brooklyn' },
  { city: 'Buffalo', state: 'NY', slug: 'ny--buffalo' },
  { city: 'Rochester', state: 'NY', slug: 'ny--rochester' },
  { city: 'Albany', state: 'NY', slug: 'ny--albany' },

  // Ohio (OH)
  { city: 'Columbus', state: 'OH', slug: 'oh--columbus' },
  { city: 'Cleveland', state: 'OH', slug: 'oh--cleveland' },
  { city: 'Cincinnati', state: 'OH', slug: 'oh--cincinnati' },
  { city: 'Akron', state: 'OH', slug: 'oh--akron' },

  // Pennsylvania (PA)
  { city: 'Philadelphia', state: 'PA', slug: 'pa--philadelphia' },
  { city: 'Pittsburgh', state: 'PA', slug: 'pa--pittsburgh' },
  { city: 'Harrisburg', state: 'PA', slug: 'pa--harrisburg' },
  { city: 'Allentown', state: 'PA', slug: 'pa--allentown' },

  // Rhode Island (RI)
  { city: 'Providence', state: 'RI', slug: 'ri--providence' },
  { city: 'Warwick', state: 'RI', slug: 'ri--warwick' },
  { city: 'Newport', state: 'RI', slug: 'ri--newport' },

  // South Carolina (SC)
  { city: 'Charleston', state: 'SC', slug: 'sc--charleston' },
  { city: 'Columbia', state: 'SC', slug: 'sc--columbia' },
  { city: 'Greenville', state: 'SC', slug: 'sc--greenville' },

  // Tennessee (TN)
  { city: 'Nashville', state: 'TN', slug: 'tn--nashville' },
  { city: 'Memphis', state: 'TN', slug: 'tn--memphis' },
  { city: 'Knoxville', state: 'TN', slug: 'tn--knoxville' },
  { city: 'Chattanooga', state: 'TN', slug: 'tn--chattanooga' },

  // Virginia (VA)
  { city: 'Richmond', state: 'VA', slug: 'va--richmond' },
  { city: 'Virginia Beach', state: 'VA', slug: 'va--virginia-beach' },
  { city: 'Arlington', state: 'VA', slug: 'va--arlington' },
  { city: 'Norfolk', state: 'VA', slug: 'va--norfolk' },

  // Vermont (VT)
  { city: 'Burlington', state: 'VT', slug: 'vt--burlington' },
  { city: 'Montpelier', state: 'VT', slug: 'vt--montpelier' },
  { city: 'Rutland', state: 'VT', slug: 'vt--rutland' },

  // Wisconsin (WI)
  { city: 'Milwaukee', state: 'WI', slug: 'wi--milwaukee' },
  { city: 'Madison', state: 'WI', slug: 'wi--madison' },
  { city: 'Green Bay', state: 'WI', slug: 'wi--green-bay' },

  // West Virginia (WV)
  { city: 'Charleston', state: 'WV', slug: 'wv--charleston' },
  { city: 'Huntington', state: 'WV', slug: 'wv--huntington' },
  { city: 'Morgantown', state: 'WV', slug: 'wv--morgantown' },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Check if an event title/description contains adult-only keywords
 */
function isAdultEvent(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();
  return ADULT_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * Parse date string from Eventbrite event card into ISO format.
 * Eventbrite dates are typically like "Sat, May 10, 2026 10:00 AM" or "Tomorrow at 2:00 PM"
 */
function parseEventbriteDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { eventDate: '', date: null };

  const cleaned = dateStr.trim();

  // Try ISO datetime attribute first (from <time datetime="...">)
  const isoMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { eventDate: cleaned, date: isoMatch[1] + 'T00:00:00' };
  }

  // "Sat, May 10, 2026 10:00 AM" or "May 10, 2026"
  const fullDate = cleaned.match(/(?:\w+,\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (fullDate) {
    const monthStr = fullDate[1];
    const day = fullDate[2].padStart(2, '0');
    const year = fullDate[3];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const month = months[monthStr.toLowerCase()];
    if (month) {
      return { eventDate: cleaned, date: `${year}-${month}-${day}T00:00:00` };
    }
  }

  // Fallback: return raw text as event_date, no parsed date
  return { eventDate: cleaned, date: null };
}

/**
 * Detect category from event title/description
 */
function detectCategory(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  if (/\b(storytime|story time|reading|book|library)\b/.test(text)) return 'Storytime';
  if (/\b(art|craft|painting|drawing|pottery|creative)\b/.test(text)) return 'Arts & Crafts';
  if (/\b(science|stem|coding|robot|experiment|lab)\b/.test(text)) return 'STEM & Science';
  if (/\b(music|concert|sing|dance|ballet|recital|theater|theatre|show|performance)\b/.test(text)) return 'Performing Arts';
  if (/\b(sport|soccer|basketball|baseball|swim|gymnastics|martial|karate|yoga)\b/.test(text)) return 'Sports & Fitness';
  if (/\b(nature|hike|garden|farm|outdoor|wildlife|animal|zoo)\b/.test(text)) return 'Nature & Outdoors';
  if (/\b(festival|fair|carnival|parade|celebration|holiday)\b/.test(text)) return 'Festivals & Fairs';
  if (/\b(camp|summer camp|day camp)\b/.test(text)) return 'Camps';
  if (/\b(museum|exhibit|gallery)\b/.test(text)) return 'Museum';

  return 'Community';
}

// ==========================================
// SCRAPING FUNCTIONS
// ==========================================

/**
 * Parse events from Eventbrite's internal API response.
 * Handles multiple response shapes (destination/search, v3/events, etc.)
 */
function parseApiEvents(apiData, city, state) {
  const results = [];
  // Possible event arrays in API response
  const eventLists = [
    apiData?.events?.results,
    apiData?.events,
    apiData?.event_results?.results,
    apiData?.data?.events,
    apiData?.search_data?.events?.results,
  ];

  const eventArray = eventLists.find(arr => Array.isArray(arr) && arr.length > 0);
  if (!eventArray) return results;

  for (const eb of eventArray) {
    try {
      const name = eb.name || eb.title || '';
      if (!name || name.length < 5) continue;

      // URL
      const url = eb.url || eb.vanity_url ||
        (eb.id ? `https://www.eventbrite.com/e/${eb.id}` : '');
      if (!url) continue;

      // Date
      const startLocal = eb.start?.local || eb.start_date || eb.start_datetime || '';
      const startUtc = eb.start?.utc || '';
      const dateText = eb.start?.display || eb.date_display || startLocal || '';

      // Venue
      const venue = eb.primary_venue || eb.venue || {};
      const venueName = venue.name || venue.venue_name || '';
      const venueCity = venue.address?.city || city;
      const venueState = venue.address?.region || venue.address?.state || state;
      const venueAddress = venue.address?.localized_address_display ||
        [venue.address?.address_1, venue.address?.city, venue.address?.region].filter(Boolean).join(', ') || '';

      // Description & image
      const description = eb.summary || eb.description?.text || eb.short_description || '';
      const imageUrl = eb.image?.url || eb.image?.original?.url || eb.logo?.url || '';

      results.push({
        name: name.substring(0, 200),
        dateText: dateText.substring(0, 150),
        startLocal,
        venue: venueName.substring(0, 150),
        venueCity,
        venueState,
        venueAddress,
        description: description.substring(0, 500),
        url,
        imageUrl,
      });
    } catch (e) {
      // Skip malformed entries
    }
  }

  return results;
}

/**
 * Scrape a single Eventbrite city page for family events.
 *
 * 3-strategy approach:
 *   1. Intercept API responses during page load (XHR capture)
 *   2. Fetch Eventbrite's search API from within page context (inherits cookies/CSRF)
 *   3. DOM extraction fallback (original approach, improved with networkidle2)
 */
async function scrapeCity(browser, cityConfig) {
  const { city, state, slug } = cityConfig;
  const sourceUrl = `https://www.eventbrite.com/d/${slug}/family--events/`;

  console.log(`  🔍 Scraping ${city}, ${state}: ${sourceUrl}`);

  const events = [];
  let page = null;
  const interceptedApiData = [];

  try {
    page = await createStealthPage(browser);
    await page.setViewport({ width: 1920, height: 1080 });

    // ── Strategy 1: Intercept API responses during page load ──
    page.on('response', async (response) => {
      try {
        const respUrl = response.url();
        if (response.status() !== 200) return;
        if (!respUrl.includes('/api/') && !respUrl.includes('search')) return;

        // Match Eventbrite API patterns
        const isEventApi =
          respUrl.includes('/api/v3/destination/search') ||
          respUrl.includes('/api/v3/destination/events') ||
          respUrl.includes('/api/v3/events/search') ||
          respUrl.includes('search_events') ||
          (respUrl.includes('/api/') && respUrl.includes('event'));

        if (isEventApi) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const json = await response.json();
            interceptedApiData.push(json);
          }
        }
      } catch (e) {
        // Silently skip non-JSON or timing errors
      }
    });

    // Navigate with networkidle2 for full SPA rendering (was domcontentloaded)
    await page.goto(sourceUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Extra wait for React hydration
    await delay(3000);

    // Scroll to trigger lazy loading
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 500));
      }
    });
    await delay(2000);

    // Diagnostic: what did the page actually render?
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      bodyLen: document.body?.innerHTML?.length || 0,
      eventEls: document.querySelectorAll('[data-event-id], [data-testid="event-card"], a[href*="/e/"]').length,
      url: window.location.href,
    }));
    console.log(`    📄 Page: "${pageInfo.title}" (${pageInfo.bodyLen} chars, ${pageInfo.eventEls} event elements)`);

    let rawEvents = [];

    // ── Check intercepted API data first ──
    if (interceptedApiData.length > 0) {
      console.log(`    🔌 Captured ${interceptedApiData.length} API response(s)`);
      for (const apiData of interceptedApiData) {
        const parsed = parseApiEvents(apiData, city, state);
        rawEvents.push(...parsed);
      }
      if (rawEvents.length > 0) {
        console.log(`    📦 ${rawEvents.length} events from API interception`);
      }
    }

    // ── Strategy 2: In-page API fetch (inherits cookies & CSRF) ──
    if (rawEvents.length === 0) {
      console.log(`    🔄 Trying in-page API fetch...`);
      const apiResult = await page.evaluate(async (citySlug) => {
        // Try multiple Eventbrite API endpoint patterns
        const endpoints = [
          `/api/v3/destination/search/?event_search.dates=current_future&event_search.dedup=true&event_search.q=family&expand=event_sales_status,image,primary_venue,saves,ticket_availability&page_size=50&place.slug=${citySlug}`,
          `/api/v3/destination/search/?event_search.dates=current_future&expand=event_sales_status,image,primary_venue&page_size=50&place.slug=${citySlug}&event_search.online_events_only=false`,
          `/api/v3/destination/events/?event_search.dates=current_future&event_search.q=family&place.slug=${citySlug}&page_size=50&expand=image,primary_venue`,
        ];

        for (const endpoint of endpoints) {
          try {
            const resp = await fetch(endpoint, {
              headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
              credentials: 'same-origin',
            });
            if (resp.ok) {
              const json = await resp.json();
              // Check if this response has actual event data
              const hasEvents = json?.events?.results?.length > 0 ||
                (Array.isArray(json?.events) && json.events.length > 0) ||
                json?.event_results?.results?.length > 0;
              if (hasEvents) return json;
            }
          } catch (e) {
            // Try next endpoint
          }
        }
        return null;
      }, slug);

      if (apiResult) {
        const parsed = parseApiEvents(apiResult, city, state);
        rawEvents.push(...parsed);
        if (rawEvents.length > 0) {
          console.log(`    📦 ${rawEvents.length} events from in-page API fetch`);
        }
      }
    }

    // ── Strategy 3: Extract embedded JSON data (__NEXT_DATA__, __SERVER_DATA__) ──
    if (rawEvents.length === 0) {
      const embeddedData = await page.evaluate(() => {
        // Next.js data
        const nextData = document.querySelector('#__NEXT_DATA__');
        if (nextData) {
          try { return { source: 'next', data: JSON.parse(nextData.textContent) }; } catch (e) {}
        }
        // Eventbrite server data
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
          const text = s.textContent || '';
          if (text.includes('window.__SERVER_DATA__')) {
            try {
              const match = text.match(/window\.__SERVER_DATA__\s*=\s*({[\s\S]+?});?\s*$/m);
              if (match) return { source: 'server', data: JSON.parse(match[1]) };
            } catch (e) {}
          }
          if (text.includes('"events"') && text.includes('"results"') && text.length > 500) {
            try {
              const jsonMatch = text.match(/({[\s\S]*"events"[\s\S]*"results"[\s\S]*})/);
              if (jsonMatch) return { source: 'inline', data: JSON.parse(jsonMatch[1]) };
            } catch (e) {}
          }
        }
        return null;
      });

      if (embeddedData) {
        console.log(`    📝 Found embedded ${embeddedData.source} data`);
        // Navigate through possible nested structures
        const data = embeddedData.data;
        const possibleRoots = [data, data?.props?.pageProps, data?.search_data, data?.page_data];
        for (const root of possibleRoots) {
          if (root) {
            const parsed = parseApiEvents(root, city, state);
            if (parsed.length > 0) {
              rawEvents.push(...parsed);
              break;
            }
          }
        }
        if (rawEvents.length > 0) {
          console.log(`    📦 ${rawEvents.length} events from embedded data`);
        }
      }
    }

    // ── Strategy 4: DOM extraction (original approach, improved) ──
    if (rawEvents.length === 0) {
      console.log(`    🔍 Falling back to DOM extraction...`);
      const domEvents = await page.evaluate(() => {
        const results = [];
        const seenUrls = new Set();

        const cardSelectors = [
          'a[data-event-id]',
          'div[data-testid="event-card"]',
          'article[data-testid="search-event-card"]',
          '.search-event-card-wrapper',
          '.eds-event-card-content',
          '.discover-search-desktop-card',
          '.event-card-link',
          '[class*="event-card"]',
          'div[class*="EventCard"]',
        ];

        for (const selector of cardSelectors) {
          const cards = document.querySelectorAll(selector);
          if (cards.length === 0) continue;

          cards.forEach(card => {
            try {
              const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="eventbrite.com/e/"]');
              if (!linkEl) return;
              const url = linkEl.href || '';
              if (!url || !url.includes('eventbrite.com/e/')) return;
              if (seenUrls.has(url)) return;
              seenUrls.add(url);

              const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="event-name"], [data-testid="event-name"]');
              const name = titleEl ? titleEl.textContent.trim() : (linkEl.textContent || '').trim().split('\n')[0].trim();
              if (!name || name.length < 5) return;

              const dateEl = card.querySelector('time, [class*="date"], [data-testid="event-date"], p[class*="date"]');
              let dateText = '';
              if (dateEl) dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();

              const venueEl = card.querySelector('[class*="location"], [class*="venue"], [data-testid="event-location"], p[class*="location"]');
              const venueText = venueEl ? venueEl.textContent.trim() : '';

              const descEl = card.querySelector('[class*="description"], [class*="summary"], p[class*="desc"]');
              const description = descEl ? descEl.textContent.trim() : '';

              const imgEl = card.querySelector('img[src], img[data-src]');
              const imageUrl = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

              results.push({
                name: name.substring(0, 200),
                dateText: dateText.substring(0, 150),
                venue: venueText.substring(0, 150),
                description: description.substring(0, 500),
                url,
                imageUrl,
              });
            } catch (e) {}
          });
          if (results.length > 0) break;
        }

        // Fallback: scan all eventbrite.com/e/ links
        if (results.length === 0) {
          document.querySelectorAll('a[href*="eventbrite.com/e/"]').forEach(link => {
            const url = link.href;
            if (!url || seenUrls.has(url)) return;
            seenUrls.add(url);

            let container = link.closest('div[class*="card"], article, section, li') || link.parentElement;
            if (!container) container = link;

            const titleEl = container.querySelector('h2, h3, h4') || link;
            const name = titleEl.textContent.trim().split('\n')[0].trim();
            if (!name || name.length < 5) return;

            const dateEl = container.querySelector('time, [class*="date"]');
            const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : '';

            const venueEl = container.querySelector('[class*="location"], [class*="venue"]');
            const venueText = venueEl ? venueEl.textContent.trim() : '';

            const imgEl = container.querySelector('img[src]');
            const imageUrl = imgEl ? imgEl.src : '';

            results.push({
              name: name.substring(0, 200),
              dateText: dateText.substring(0, 150),
              venue: venueText.substring(0, 150),
              description: '',
              url,
              imageUrl,
            });
          });
        }

        return results;
      });

      rawEvents.push(...domEvents);
      if (rawEvents.length > 0) {
        console.log(`    📦 ${rawEvents.length} events from DOM extraction`);
      }
    }

    console.log(`    📦 Raw events extracted: ${rawEvents.length}`);

    // Process and filter events
    for (const raw of rawEvents) {
      // Skip adult-only events
      if (isAdultEvent(raw.name, raw.description)) {
        continue;
      }

      // Skip non-US events (Canadian provinces leak in from border city searches)
      const evtState = (raw.venueState || state || '').toUpperCase();
      if (evtState && !US_STATES.has(evtState)) {
        continue;
      }

      // Parse date
      let eventDate = raw.dateText || '';
      let parsedDate = null;

      // If we got a startLocal ISO string from the API, use it directly
      if (raw.startLocal) {
        const pd = parseEventbriteDate(raw.startLocal);
        eventDate = eventDate || pd.eventDate;
        parsedDate = pd.date;
      } else {
        const pd = parseEventbriteDate(raw.dateText);
        eventDate = pd.eventDate;
        parsedDate = pd.date;
      }

      // Detect category
      const category = detectCategory(raw.name, raw.description);

      // Parse venue name from location text (often "Venue Name . City, ST")
      let venueName = raw.venue || '';
      let parsedCity = raw.venueCity || city;
      const venueParts = venueName.split('\u2022').map(s => s.trim()); // bullet character
      if (venueParts.length > 1) {
        venueName = venueParts[0];
        const cityMatch = venueParts[1].match(/^([\w\s.'-]+),\s*[A-Z]{2}/);
        if (cityMatch) parsedCity = cityMatch[1].trim();
      }

      events.push({
        name: raw.name,
        event_date: eventDate,
        date: parsedDate,
        description: raw.description || `Family event in ${city}, ${state}`,
        url: raw.url,
        image_url: raw.imageUrl || '',
        venue: venueName || `Event in ${city}`,
        city: parsedCity,
        state: raw.venueState || state,
        category: category,
        source_url: sourceUrl,
        scraper_name: SCRAPER_NAME,
      });
    }

    console.log(`    ✅ ${events.length} family events after filtering`);

  } catch (error) {
    console.error(`    ❌ Error scraping ${city}, ${state}: ${error.message}`);
  } finally {
    if (page) {
      try { await page.close(); } catch (e) { /* ignore */ }
    }
  }

  return events;
}

// ==========================================
// MAIN SCRAPER
// ==========================================

/**
 * Main scraper function
 */
async function scrapeEventbriteFamily(options = {}) {
  const { state: filterState = null, dry = false } = options;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎪 EVENTBRITE FAMILY EVENTS SCRAPER - EASTERN US`);
  console.log(`${'='.repeat(70)}`);

  // Filter cities
  let cities = CITIES;
  if (filterState) {
    cities = cities.filter(c => c.state.toUpperCase() === filterState.toUpperCase());
    console.log(`📍 Filtering by state: ${filterState.toUpperCase()}`);
  }

  console.log(`📊 Cities to scrape: ${cities.length}`);
  if (dry) console.log(`🧪 DRY RUN — will not save to database`);
  console.log(`${'='.repeat(70)}\n`);

  let browser = null;
  const allEvents = [];
  let sitesSinceRestart = 0;
  const RESTART_INTERVAL = 15; // Restart browser every 15 cities

  try {
    browser = await launchBrowser({ stealth: true });

    for (let i = 0; i < cities.length; i++) {
      const cityConfig = cities[i];
      const progress = `[${i + 1}/${cities.length}]`;

      console.log(`\n${progress} 🏙️  ${cityConfig.city}, ${cityConfig.state}`);

      // Restart browser periodically to prevent memory issues
      if (sitesSinceRestart >= RESTART_INTERVAL) {
        console.log('\n🔄 Restarting browser to prevent memory issues...');
        try { await browser.close(); } catch (e) { /* ignore */ }
        browser = await launchBrowser({ stealth: true });
        sitesSinceRestart = 0;
      }

      try {
        const cityEvents = await scrapeCity(browser, cityConfig);
        allEvents.push(...cityEvents);
        sitesSinceRestart++;
      } catch (error) {
        console.error(`  ❌ Fatal error for ${cityConfig.city}: ${error.message}`);
        // Restart browser on protocol errors
        if (error.message.includes('Protocol error') || error.message.includes('Connection closed') ||
            error.message.includes('Target closed') || error.message.includes('detached')) {
          console.log('  🔄 Browser crashed, restarting...');
          try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
          browser = await launchBrowser({ stealth: true });
          sitesSinceRestart = 0;
        }
      }

      // Rate limiting: 3-5 second random delay between cities
      if (i < cities.length - 1) {
        const delayMs = 3000 + Math.floor(Math.random() * 2000);
        await delay(delayMs);
      }
    }

  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📥 Total family events extracted: ${allEvents.length}`);
  console.log(`${'='.repeat(70)}\n`);

  // Save events with geocoding — batch by state since saveEventsWithGeocoding requires a state
  if (allEvents.length > 0 && !dry) {
    console.log('💾 Saving events to database...');

    // Group events by state
    const byState = {};
    for (const evt of allEvents) {
      const st = evt.state || 'XX';
      if (!byState[st]) byState[st] = [];
      byState[st].push(evt);
    }

    let totalSaved = 0;
    for (const [st, stateEvents] of Object.entries(byState)) {
      // Build per-event venue entries for geocoding (not one generic per city)
      const venueMap = new Map();
      for (const evt of stateEvents) {
        const vKey = evt.venue || evt.name;
        if (!venueMap.has(vKey)) {
          venueMap.set(vKey, {
            name: vKey,
            city: evt.city,
            state: evt.state,
          });
        }
      }

      try {
        const result = await saveEventsWithGeocoding(
          stateEvents,
          Array.from(venueMap.values()),
          {
            scraperName: SCRAPER_NAME,
            state: st,
            category: 'Community',
            platform: 'eventbrite',
          }
        );
        const saved = result?.saved || result?.new || result?.imported || 0;
        console.log(`   💾 ${st}: ${saved} saved`);
        totalSaved += saved;
      } catch (saveError) {
        console.error(`   ❌ ${st} save error: ${saveError.message}`);
      }
    }
    console.log(`✅ Save complete: ${totalSaved} total`);
  } else if (dry) {
    console.log('🧪 Dry run — skipping database save');
    console.log(`   Would have saved ${allEvents.length} events`);
    // Print sample events
    for (const evt of allEvents.slice(0, 5)) {
      console.log(`   - ${evt.name} | ${evt.event_date} | ${evt.city}, ${evt.state}`);
    }
  } else {
    console.log('⚠️  No events found — nothing to save');
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ EVENTBRITE FAMILY EVENTS SCRAPER COMPLETE`);
  console.log(`${'='.repeat(70)}\n`);

  return { total: allEvents.length, events: allEvents };
}

// ==========================================
// CLOUD FUNCTION
// ==========================================

async function scrapeEventbriteFamilyCloudFunction(req = null, res = null) {
  console.log('☁️  Running as Cloud Function');

  const state = req?.query?.state || req?.body?.state || null;
  const result = await scrapeEventbriteFamily({ state });

  if (res) {
    res.status(200).json({
      success: true,
      total: result.total,
      scraperName: SCRAPER_NAME,
    });
  }

  return result;
}

// ==========================================
// CLI EXECUTION
// ==========================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--state' && args[i + 1]) {
      options.state = args[i + 1];
      i++;
    } else if (args[i] === '--dry') {
      options.dry = true;
    }
  }

  scrapeEventbriteFamily(options)
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
  scrapeEventbriteFamily,
  scrapeEventbriteFamilyCloudFunction,
  CITIES,
};
