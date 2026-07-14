#!/usr/bin/env node

/**
 * BARNES & NOBLE EVENTS SCRAPER - EASTERN US
 *
 * Rewritten 2026-07-09: B&N rebuilt stores.barnesandnoble.com as a Next.js/MUI
 * app. All 136 previously-hardcoded store IDs (storeSlug) went stale — some
 * now silently resolve to a DIFFERENT physical store than before (e.g. the
 * old Dover-DE id started resolving to a real store in Eugene, OR) — and the
 * old `a[href*="/event/"]` DOM selector no longer matches anything, so every
 * store returned 0 events. Rather than re-discover 136 current store IDs and
 * DOM-scrape a new page structure, this now calls the site's own JSON API
 * directly (found via live network inspection, not publicly documented):
 *
 *   1. GET /locator-api/v1/location/change/{zip}  — sets a session location
 *      (returns cookies), response body: {lat,lng,city,state,zip}
 *   2. GET /locator-api/v1/events  (same cookies) — returns every event
 *      within ~40mi of that location, each item carrying its OWN live store
 *      info (storeId, storeName, address, city, state) straight from B&N,
 *      not from our config. That live data is what makes the old
 *      stale-ID data-corruption risk moot: venue city/state now always
 *      reflects reality, so there's nothing to cross-check against a
 *      hardcoded id anymore.
 *
 * No Puppeteer needed — plain fetch(). STORES below is now used purely as a
 * list of search points (zip codes); a 40mi-radius search naturally covers
 * overlapping ground between nearby points, so results are deduped by
 * eventId and filtered to ACTIVE_STATES using the API's own live `state`
 * field.
 *
 * Coverage (search points; results are filtered to FunHive's active region —
 * see ACTIVE_STATES below): AL, CT, DC, DE, FL, GA, IA, IL, IN, KY, MA, MD,
 * ME, MN, MS, NC, NH, NJ, NY, OH, PA, RI, SC, TN, VA, VT, WI, WV
 *
 * Usage:
 *   node scraper-barnes-noble-eastern.js                # All search points
 *   node scraper-barnes-noble-eastern.js --state NY     # Single state's search points
 *   node scraper-barnes-noble-eastern.js --dry          # Dry run (no DB save)
 *
 * Cloud Function: scrapeBarnesNobleCloudFunction
 * Schedule: Every 3 days (Group 1: days 1,4,7,10...)
 */

const { saveEventsWithGeocoding } = require('./event-save-helper');

const SCRAPER_NAME = 'BarnesNoble-Eastern';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Matches scrapers/region-config.json's dmv + eastern active regions. The
// 40mi-radius API search can occasionally pick up a store just across a
// state line into a region FunHive doesn't serve yet — filter those out.
const ACTIVE_STATES = new Set([
  'DC', 'MD', 'VA', 'ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE',
  'WV', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY'
]);

// ==========================================
// ADULT-ONLY / NON-FAMILY KEYWORDS
// ==========================================

const ADULT_KEYWORDS = [
  'beer', 'wine', 'brewery', 'cocktail', 'happy hour',
  '21+', '21 and over', 'ages 21', 'must be 21',
  'burlesque', 'singles night', 'speed dating',
  'adult only', 'adults only', 'no kids',
  'cannabis', 'marijuana', '420',
];

// ==========================================
// SEARCH POINTS (reused as zip codes only — storeSlug/name/city here are
// historical labels for the search point, not authoritative venue data;
// the API response's own storeName/city/state is what actually gets saved)
// ==========================================

const STORES = [
  // Alabama (AL)
  { name: 'Barnes & Noble Birmingham', storeSlug: '2238', city: 'Birmingham', state: 'AL', zip: '35244' },
  { name: 'Barnes & Noble Huntsville', storeSlug: '2801', city: 'Huntsville', state: 'AL', zip: '35806' },
  { name: 'Barnes & Noble Mobile', storeSlug: '2059', city: 'Mobile', state: 'AL', zip: '36609' },
  { name: 'Barnes & Noble Montgomery', storeSlug: '2812', city: 'Montgomery', state: 'AL', zip: '36117' },
  { name: 'Barnes & Noble Tuscaloosa', storeSlug: '2091', city: 'Tuscaloosa', state: 'AL', zip: '35406' },

  // Connecticut (CT)
  { name: 'Barnes & Noble West Hartford', storeSlug: '2327', city: 'West Hartford', state: 'CT', zip: '06110' },
  { name: 'Barnes & Noble Stamford', storeSlug: '2256', city: 'Stamford', state: 'CT', zip: '06901' },
  { name: 'Barnes & Noble North Haven', storeSlug: '2861', city: 'North Haven', state: 'CT', zip: '06473' },
  { name: 'Barnes & Noble Milford', storeSlug: '2328', city: 'Milford', state: 'CT', zip: '06460' },
  { name: 'Barnes & Noble Waterbury', storeSlug: '2736', city: 'Waterbury', state: 'CT', zip: '06705' },

  // District of Columbia (DC)
  { name: 'Barnes & Noble Georgetown', storeSlug: '2735', city: 'Washington', state: 'DC', zip: '20007' },

  // Delaware (DE)
  { name: 'Barnes & Noble Wilmington', storeSlug: '2620', city: 'Wilmington', state: 'DE', zip: '19803' },
  { name: 'Barnes & Noble Newark', storeSlug: '2044', city: 'Newark', state: 'DE', zip: '19702' },
  { name: 'Barnes & Noble Dover', storeSlug: '2978', city: 'Dover', state: 'DE', zip: '19901' },

  // Florida (FL)
  { name: 'Barnes & Noble Miami', storeSlug: '2597', city: 'Miami', state: 'FL', zip: '33156' },
  { name: 'Barnes & Noble Orlando', storeSlug: '2132', city: 'Orlando', state: 'FL', zip: '32839' },
  { name: 'Barnes & Noble Tampa', storeSlug: '2752', city: 'Tampa', state: 'FL', zip: '33609' },
  { name: 'Barnes & Noble Jacksonville', storeSlug: '2087', city: 'Jacksonville', state: 'FL', zip: '32246' },
  { name: 'Barnes & Noble Fort Lauderdale', storeSlug: '2598', city: 'Fort Lauderdale', state: 'FL', zip: '33324' },
  { name: 'Barnes & Noble Sarasota', storeSlug: '2714', city: 'Sarasota', state: 'FL', zip: '34238' },
  { name: 'Barnes & Noble Naples', storeSlug: '2772', city: 'Naples', state: 'FL', zip: '34108' },
  { name: 'Barnes & Noble Tallahassee', storeSlug: '2135', city: 'Tallahassee', state: 'FL', zip: '32301' },

  // Georgia (GA)
  { name: 'Barnes & Noble Atlanta Buckhead', storeSlug: '2226', city: 'Atlanta', state: 'GA', zip: '30326' },
  { name: 'Barnes & Noble Savannah', storeSlug: '2625', city: 'Savannah', state: 'GA', zip: '31406' },
  { name: 'Barnes & Noble Augusta', storeSlug: '2788', city: 'Augusta', state: 'GA', zip: '30909' },
  { name: 'Barnes & Noble Kennesaw', storeSlug: '2889', city: 'Kennesaw', state: 'GA', zip: '30144' },
  { name: 'Barnes & Noble Snellville', storeSlug: '2227', city: 'Snellville', state: 'GA', zip: '30078' },

  // Iowa (IA)
  { name: 'Barnes & Noble West Des Moines', storeSlug: '2968', city: 'West Des Moines', state: 'IA', zip: '50266' },
  { name: 'Barnes & Noble Cedar Rapids', storeSlug: '2581', city: 'Cedar Rapids', state: 'IA', zip: '52402' },
  { name: 'Barnes & Noble Coralville', storeSlug: '2582', city: 'Coralville', state: 'IA', zip: '52241' },
  { name: 'Barnes & Noble Davenport', storeSlug: '2906', city: 'Davenport', state: 'IA', zip: '52806' },
  { name: 'Barnes & Noble Ames', storeSlug: '2907', city: 'Ames', state: 'IA', zip: '50010' },

  // Illinois (IL)
  { name: 'Barnes & Noble Chicago', storeSlug: '2628', city: 'Chicago', state: 'IL', zip: '60614' },
  { name: 'Barnes & Noble Naperville', storeSlug: '2346', city: 'Naperville', state: 'IL', zip: '60540' },
  { name: 'Barnes & Noble Schaumburg', storeSlug: '2740', city: 'Schaumburg', state: 'IL', zip: '60173' },
  { name: 'Barnes & Noble Skokie', storeSlug: '2192', city: 'Skokie', state: 'IL', zip: '60077' },
  { name: 'Barnes & Noble Springfield', storeSlug: '2345', city: 'Springfield', state: 'IL', zip: '62704' },
  { name: 'Barnes & Noble Orland Park', storeSlug: '2348', city: 'Orland Park', state: 'IL', zip: '60462' },

  // Indiana (IN)
  { name: 'Barnes & Noble Indianapolis', storeSlug: '2631', city: 'Indianapolis', state: 'IN', zip: '46240' },
  { name: 'Barnes & Noble Fort Wayne', storeSlug: '2825', city: 'Fort Wayne', state: 'IN', zip: '46804' },
  { name: 'Barnes & Noble Evansville', storeSlug: '2630', city: 'Evansville', state: 'IN', zip: '47715' },
  { name: 'Barnes & Noble Carmel', storeSlug: '2629', city: 'Carmel', state: 'IN', zip: '46032' },
  { name: 'Barnes & Noble Mishawaka', storeSlug: '2824', city: 'Mishawaka', state: 'IN', zip: '46545' },

  // Kentucky (KY)
  { name: 'Barnes & Noble Louisville', storeSlug: '2648', city: 'Louisville', state: 'KY', zip: '40222' },
  { name: 'Barnes & Noble Lexington', storeSlug: '2647', city: 'Lexington', state: 'KY', zip: '40503' },
  { name: 'Barnes & Noble Florence', storeSlug: '2646', city: 'Florence', state: 'KY', zip: '41042' },
  { name: 'Barnes & Noble Bowling Green', storeSlug: '2649', city: 'Bowling Green', state: 'KY', zip: '42104' },
  { name: 'Barnes & Noble Ashland', storeSlug: '2650', city: 'Ashland', state: 'KY', zip: '41101' },

  // Massachusetts (MA)
  { name: 'Barnes & Noble Boston', storeSlug: '2955', city: 'Boston', state: 'MA', zip: '02199' },
  { name: 'Barnes & Noble Burlington', storeSlug: '2307', city: 'Burlington', state: 'MA', zip: '01803' },
  { name: 'Barnes & Noble Framingham', storeSlug: '2308', city: 'Framingham', state: 'MA', zip: '01701' },
  { name: 'Barnes & Noble Hingham', storeSlug: '2306', city: 'Hingham', state: 'MA', zip: '02043' },
  { name: 'Barnes & Noble Springfield', storeSlug: '2311', city: 'Springfield', state: 'MA', zip: '01107' },

  // Maryland (MD)
  { name: 'Barnes & Noble Bethesda', storeSlug: '2514', city: 'Bethesda', state: 'MD', zip: '20817' },
  { name: 'Barnes & Noble Towson', storeSlug: '2975', city: 'Towson', state: 'MD', zip: '21286' },
  { name: 'Barnes & Noble Annapolis', storeSlug: '2516', city: 'Annapolis', state: 'MD', zip: '21401' },
  { name: 'Barnes & Noble Columbia', storeSlug: '2515', city: 'Columbia', state: 'MD', zip: '21044' },
  { name: 'Barnes & Noble Bel Air', storeSlug: '2974', city: 'Bel Air', state: 'MD', zip: '21014' },
  { name: 'Barnes & Noble Frederick', storeSlug: '2517', city: 'Frederick', state: 'MD', zip: '21703' },

  // Maine (ME)
  { name: 'Barnes & Noble South Portland', storeSlug: '2859', city: 'South Portland', state: 'ME', zip: '04106' },
  { name: 'Barnes & Noble Bangor', storeSlug: '2858', city: 'Bangor', state: 'ME', zip: '04401' },
  { name: 'Barnes & Noble Augusta', storeSlug: '2857', city: 'Augusta', state: 'ME', zip: '04330' },

  // Minnesota (MN)
  { name: 'Barnes & Noble Edina', storeSlug: '2521', city: 'Edina', state: 'MN', zip: '55435' },
  { name: 'Barnes & Noble Roseville', storeSlug: '2522', city: 'Roseville', state: 'MN', zip: '55113' },
  { name: 'Barnes & Noble Maple Grove', storeSlug: '2523', city: 'Maple Grove', state: 'MN', zip: '55369' },
  { name: 'Barnes & Noble Rochester', storeSlug: '2524', city: 'Rochester', state: 'MN', zip: '55901' },
  { name: 'Barnes & Noble Duluth', storeSlug: '2525', city: 'Duluth', state: 'MN', zip: '55811' },

  // Mississippi (MS)
  { name: 'Barnes & Noble Jackson', storeSlug: '2832', city: 'Jackson', state: 'MS', zip: '39211' },
  { name: 'Barnes & Noble Gulfport', storeSlug: '2833', city: 'Gulfport', state: 'MS', zip: '39503' },
  { name: 'Barnes & Noble Hattiesburg', storeSlug: '2834', city: 'Hattiesburg', state: 'MS', zip: '39402' },
  { name: 'Barnes & Noble Tupelo', storeSlug: '2835', city: 'Tupelo', state: 'MS', zip: '38801' },
  { name: 'Barnes & Noble Oxford', storeSlug: '2836', city: 'Oxford', state: 'MS', zip: '38655' },

  // North Carolina (NC)
  { name: 'Barnes & Noble Charlotte', storeSlug: '2611', city: 'Charlotte', state: 'NC', zip: '28277' },
  { name: 'Barnes & Noble Raleigh', storeSlug: '2612', city: 'Raleigh', state: 'NC', zip: '27612' },
  { name: 'Barnes & Noble Durham', storeSlug: '2614', city: 'Durham', state: 'NC', zip: '27707' },
  { name: 'Barnes & Noble Greensboro', storeSlug: '2613', city: 'Greensboro', state: 'NC', zip: '27408' },
  { name: 'Barnes & Noble Cary', storeSlug: '2615', city: 'Cary', state: 'NC', zip: '27511' },

  // New Hampshire (NH)
  { name: 'Barnes & Noble Nashua', storeSlug: '2860', city: 'Nashua', state: 'NH', zip: '03060' },
  { name: 'Barnes & Noble Manchester', storeSlug: '2862', city: 'Manchester', state: 'NH', zip: '03101' },
  { name: 'Barnes & Noble Salem', storeSlug: '2863', city: 'Salem', state: 'NH', zip: '03079' },
  { name: 'Barnes & Noble Concord', storeSlug: '2864', city: 'Concord', state: 'NH', zip: '03301' },
  { name: 'Barnes & Noble Newington', storeSlug: '2865', city: 'Newington', state: 'NH', zip: '03801' },

  // New Jersey (NJ)
  { name: 'Barnes & Noble Princeton', storeSlug: '2290', city: 'Princeton', state: 'NJ', zip: '08540' },
  { name: 'Barnes & Noble Paramus', storeSlug: '2289', city: 'Paramus', state: 'NJ', zip: '07652' },
  { name: 'Barnes & Noble Bridgewater', storeSlug: '2291', city: 'Bridgewater', state: 'NJ', zip: '08807' },
  { name: 'Barnes & Noble Clifton', storeSlug: '2288', city: 'Clifton', state: 'NJ', zip: '07014' },
  { name: 'Barnes & Noble Cherry Hill', storeSlug: '2292', city: 'Cherry Hill', state: 'NJ', zip: '08002' },
  { name: 'Barnes & Noble Wayne', storeSlug: '2287', city: 'Wayne', state: 'NJ', zip: '07470' },

  // New York (NY)
  { name: 'Barnes & Noble Union Square NYC', storeSlug: '2675', city: 'New York', state: 'NY', zip: '10003' },
  { name: 'Barnes & Noble Brooklyn', storeSlug: '2676', city: 'Brooklyn', state: 'NY', zip: '11201' },
  { name: 'Barnes & Noble Manhasset', storeSlug: '2677', city: 'Manhasset', state: 'NY', zip: '11030' },
  { name: 'Barnes & Noble Rochester', storeSlug: '2679', city: 'Rochester', state: 'NY', zip: '14623' },
  { name: 'Barnes & Noble Buffalo', storeSlug: '2678', city: 'Buffalo', state: 'NY', zip: '14221' },
  { name: 'Barnes & Noble Albany', storeSlug: '2680', city: 'Albany', state: 'NY', zip: '12205' },

  // Ohio (OH)
  { name: 'Barnes & Noble Columbus', storeSlug: '2197', city: 'Columbus', state: 'OH', zip: '43219' },
  { name: 'Barnes & Noble Cleveland', storeSlug: '2195', city: 'Cleveland', state: 'OH', zip: '44124' },
  { name: 'Barnes & Noble Cincinnati', storeSlug: '2198', city: 'Cincinnati', state: 'OH', zip: '45209' },
  { name: 'Barnes & Noble Akron', storeSlug: '2196', city: 'Akron', state: 'OH', zip: '44333' },
  { name: 'Barnes & Noble Toledo', storeSlug: '2199', city: 'Toledo', state: 'OH', zip: '43615' },
  { name: 'Barnes & Noble Dayton', storeSlug: '2200', city: 'Dayton', state: 'OH', zip: '45459' },

  // Pennsylvania (PA)
  { name: 'Barnes & Noble Rittenhouse Philadelphia', storeSlug: '2501', city: 'Philadelphia', state: 'PA', zip: '19103' },
  { name: 'Barnes & Noble Pittsburgh', storeSlug: '2502', city: 'Pittsburgh', state: 'PA', zip: '15237' },
  { name: 'Barnes & Noble King of Prussia', storeSlug: '2503', city: 'King of Prussia', state: 'PA', zip: '19406' },
  { name: 'Barnes & Noble Harrisburg', storeSlug: '2504', city: 'Harrisburg', state: 'PA', zip: '17110' },
  { name: 'Barnes & Noble Allentown', storeSlug: '2505', city: 'Allentown', state: 'PA', zip: '18104' },
  { name: 'Barnes & Noble Erie', storeSlug: '2506', city: 'Erie', state: 'PA', zip: '16565' },

  // Rhode Island (RI)
  { name: 'Barnes & Noble Warwick', storeSlug: '2870', city: 'Warwick', state: 'RI', zip: '02886' },
  { name: 'Barnes & Noble Cranston', storeSlug: '2871', city: 'Cranston', state: 'RI', zip: '02920' },
  { name: 'Barnes & Noble Smithfield', storeSlug: '2872', city: 'Smithfield', state: 'RI', zip: '02917' },

  // South Carolina (SC)
  { name: 'Barnes & Noble Charleston', storeSlug: '2780', city: 'Charleston', state: 'SC', zip: '29406' },
  { name: 'Barnes & Noble Columbia', storeSlug: '2781', city: 'Columbia', state: 'SC', zip: '29210' },
  { name: 'Barnes & Noble Greenville', storeSlug: '2782', city: 'Greenville', state: 'SC', zip: '29607' },
  { name: 'Barnes & Noble Myrtle Beach', storeSlug: '2783', city: 'Myrtle Beach', state: 'SC', zip: '29577' },
  { name: 'Barnes & Noble Spartanburg', storeSlug: '2784', city: 'Spartanburg', state: 'SC', zip: '29301' },

  // Tennessee (TN)
  { name: 'Barnes & Noble Nashville', storeSlug: '2702', city: 'Nashville', state: 'TN', zip: '37215' },
  { name: 'Barnes & Noble Memphis', storeSlug: '2703', city: 'Memphis', state: 'TN', zip: '38120' },
  { name: 'Barnes & Noble Knoxville', storeSlug: '2704', city: 'Knoxville', state: 'TN', zip: '37919' },
  { name: 'Barnes & Noble Chattanooga', storeSlug: '2705', city: 'Chattanooga', state: 'TN', zip: '37421' },
  { name: 'Barnes & Noble Franklin', storeSlug: '2706', city: 'Franklin', state: 'TN', zip: '37067' },

  // Virginia (VA)
  { name: 'Barnes & Noble Arlington', storeSlug: '2540', city: 'Arlington', state: 'VA', zip: '22203' },
  { name: 'Barnes & Noble Tysons Corner', storeSlug: '2541', city: 'McLean', state: 'VA', zip: '22102' },
  { name: 'Barnes & Noble Richmond', storeSlug: '2542', city: 'Richmond', state: 'VA', zip: '23233' },
  { name: 'Barnes & Noble Virginia Beach', storeSlug: '2543', city: 'Virginia Beach', state: 'VA', zip: '23462' },
  { name: 'Barnes & Noble Reston', storeSlug: '2544', city: 'Reston', state: 'VA', zip: '20190' },
  { name: 'Barnes & Noble Charlottesville', storeSlug: '2545', city: 'Charlottesville', state: 'VA', zip: '22901' },

  // Vermont (VT)
  { name: 'Barnes & Noble Burlington', storeSlug: '2875', city: 'South Burlington', state: 'VT', zip: '05403' },
  { name: 'Barnes & Noble Montpelier', storeSlug: '2876', city: 'Berlin', state: 'VT', zip: '05602' },
  { name: 'Barnes & Noble Rutland', storeSlug: '2877', city: 'Rutland', state: 'VT', zip: '05701' },

  // Wisconsin (WI)
  { name: 'Barnes & Noble Milwaukee', storeSlug: '2410', city: 'Milwaukee', state: 'WI', zip: '53202' },
  { name: 'Barnes & Noble Madison', storeSlug: '2411', city: 'Madison', state: 'WI', zip: '53719' },
  { name: 'Barnes & Noble Brookfield', storeSlug: '2412', city: 'Brookfield', state: 'WI', zip: '53005' },
  { name: 'Barnes & Noble Green Bay', storeSlug: '2413', city: 'Green Bay', state: 'WI', zip: '54304' },
  { name: 'Barnes & Noble Appleton', storeSlug: '2414', city: 'Appleton', state: 'WI', zip: '54913' },

  // West Virginia (WV)
  { name: 'Barnes & Noble Charleston', storeSlug: '2880', city: 'Charleston', state: 'WV', zip: '25309' },
  { name: 'Barnes & Noble Huntington', storeSlug: '2881', city: 'Huntington', state: 'WV', zip: '25701' },
  { name: 'Barnes & Noble Morgantown', storeSlug: '2882', city: 'Morgantown', state: 'WV', zip: '26501' },
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
 * Parse date string from Barnes & Noble event listing.
 * Typical formats: "May 10, 2026", "Saturday, May 10, 2026 11:00 AM",
 *                  "05/10/2026", ISO strings, or "2026-07-11, 11:00 AM"
 *                  (the API's ISO date plus separately-tracked time).
 */
function parseBNDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { eventDate: '', date: null };

  const cleaned = dateStr.trim();

  const MONTHS = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // ISO datetime
  const isoMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { eventDate: cleaned, date: isoMatch[1] + 'T00:00:00' };
  }

  // "May 10, 2026", "Saturday, May 10, 2026", "Apr 25, 2026", "Saturday April 25 2026"
  const fullDate = cleaned.match(/(?:\w+[,.]?\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (fullDate) {
    const monthStr = fullDate[1];
    const day = fullDate[2].padStart(2, '0');
    const year = fullDate[3];
    const month = MONTHS[monthStr.toLowerCase()];
    if (month) {
      return { eventDate: cleaned, date: `${year}-${month}-${day}T00:00:00` };
    }
  }

  // "05/10/2026"
  const slashDate = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDate) {
    const month = slashDate[1].padStart(2, '0');
    const day = slashDate[2].padStart(2, '0');
    const year = slashDate[3];
    return { eventDate: cleaned, date: `${year}-${month}-${day}T00:00:00` };
  }

  // "May 10" or "Apr 25" (no year — assume current year, or next year if month has passed)
  const noYearDate = cleaned.match(/\b(\w+)\s+(\d{1,2})\b/);
  if (noYearDate) {
    const monthStr = noYearDate[1];
    const month = MONTHS[monthStr.toLowerCase()];
    if (month) {
      const day = noYearDate[2].padStart(2, '0');
      const now = new Date();
      let year = now.getFullYear();
      // If the month has already passed, assume next year
      const eventMonth = parseInt(month, 10);
      if (eventMonth < now.getMonth() + 1) {
        year++;
      }
      return { eventDate: cleaned, date: `${year}-${month}-${day}T00:00:00` };
    }
  }

  // "5/10" or "05/10" (month/day no year)
  const slashNoYear = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\s|$)/);
  if (slashNoYear) {
    const month = slashNoYear[1].padStart(2, '0');
    const day = slashNoYear[2].padStart(2, '0');
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const now = new Date();
      let year = now.getFullYear();
      if (monthNum < now.getMonth() + 1) year++;
      return { eventDate: cleaned, date: `${year}-${month}-${day}T00:00:00` };
    }
  }

  return { eventDate: cleaned, date: null };
}

/**
 * Detect event category from title/description.
 * Barnes & Noble events are often storytimes, author events, or crafts.
 */
function detectCategory(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  if (/\b(storytime|story time|story hour|read-?aloud|reading)\b/.test(text)) return 'Storytime';
  if (/\b(craft|art|draw|paint|creative|color|build|lego|make)\b/.test(text)) return 'Arts & Crafts';
  if (/\b(author|book signing|book launch|book release|meet the author)\b/.test(text)) return 'Community';
  if (/\b(book club|reading group|discussion)\b/.test(text)) return 'Community';
  if (/\b(trivia|game|puzzle|scavenger hunt)\b/.test(text)) return 'Community';
  if (/\b(music|concert|perform|sing|dance)\b/.test(text)) return 'Performing Arts';
  if (/\b(science|stem|coding|robot|experiment)\b/.test(text)) return 'STEM & Science';
  if (/\b(holiday|christmas|halloween|easter|valentine)\b/.test(text)) return 'Festivals & Fairs';

  return 'Community';
}

// ==========================================
// API FUNCTIONS
// ==========================================

const API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

/**
 * Fetch all B&N events within ~40mi of a zip code via the site's own
 * (undocumented) locator API. Two-step: set the session location, then
 * read events for it — the events endpoint ignores a bare storeId query
 * param and only respects the session set by step 1.
 */
async function fetchEventsNearZip(zip) {
  const changeRes = await fetch(`https://stores.barnesandnoble.com/locator-api/v1/location/change/${zip}`, {
    headers: API_HEADERS
  });
  if (!changeRes.ok) {
    throw new Error(`location/change returned HTTP ${changeRes.status}`);
  }
  const cookies = changeRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

  const eventsRes = await fetch('https://stores.barnesandnoble.com/locator-api/v1/events', {
    headers: { ...API_HEADERS, Cookie: cookies }
  });
  if (!eventsRes.ok) {
    throw new Error(`events fetch returned HTTP ${eventsRes.status}`);
  }
  const data = await eventsRes.json();
  return data.content || [];
}

// ==========================================
// MAIN SCRAPER
// ==========================================

/**
 * Main scraper function
 */
async function scrapeBarnesNoble(options = {}) {
  const { state: filterState = null, dry = false } = options;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📚 BARNES & NOBLE EVENTS SCRAPER - EASTERN US`);
  console.log(`${'='.repeat(70)}`);

  let stores = STORES;
  if (filterState) {
    stores = stores.filter(s => s.state.toUpperCase() === filterState.toUpperCase());
    console.log(`📍 Filtering by state: ${filterState.toUpperCase()}`);
  }

  // Dedupe zip codes — multiple stores can share a metro area / zip, and a
  // 40mi radius search will naturally re-find the same real stores from
  // several nearby zips anyway (handled below via eventId dedup).
  const zips = [...new Set(stores.map(s => s.zip))];

  console.log(`📊 Search points (zips): ${zips.length}`);
  if (dry) console.log(`🧪 DRY RUN — will not save to database`);
  console.log(`${'='.repeat(70)}\n`);

  const seenEventIds = new Set();
  const allEvents = [];
  let failedZips = 0;

  for (let i = 0; i < zips.length; i++) {
    const zip = zips[i];
    const progress = `[${i + 1}/${zips.length}]`;

    try {
      const rawEvents = await fetchEventsNearZip(zip);
      let newCount = 0;

      for (const raw of rawEvents) {
        if (seenEventIds.has(raw.eventId)) continue; // already captured from an overlapping search
        seenEventIds.add(raw.eventId);

        if (!ACTIVE_STATES.has(raw.state)) continue; // outside FunHive's active region
        if (raw.isVirtualEvent) continue; // not tied to a real, geocodable venue
        if (isAdultEvent(raw.name, raw.descriptionText)) continue;

        const { eventDate, date } = parseBNDate(`${raw.date}, ${raw.time || ''}`.trim());
        if (!eventDate && !date) continue;

        const category = detectCategory(raw.name, raw.descriptionText);
        const storeUrl = `https://stores.barnesandnoble.com/store/${raw.storeId}`;
        const venueName = `Barnes & Noble ${raw.storeName}`;
        const address = [raw.storeAddress1, raw.storeAddress2].filter(Boolean).join(', ') || `${raw.city}, ${raw.state} ${raw.zip}`;

        allEvents.push({
          title: raw.name,
          name: raw.name,
          eventDate: eventDate || '',
          date: date,
          startTime: raw.time || '',
          description: raw.descriptionText || `${category} event at ${venueName}`,
          url: storeUrl,
          imageUrl: raw.largeIcon ? `https://cdn.shopify.com${raw.largeIcon}` : '',
          venue: venueName,
          venueName: venueName,
          address: address,
          city: raw.city,
          state: raw.state,
          zipCode: raw.zip,
          category: category,
          source_url: storeUrl,
          scraper_name: SCRAPER_NAME,
          metadata: {
            sourceName: venueName,
            sourceUrl: storeUrl,
            scrapedAt: new Date().toISOString()
          }
        });
        newCount++;
      }

      console.log(`${progress} zip ${zip}: ${rawEvents.length} events in range, ${newCount} new/in-region/family`);
    } catch (error) {
      failedZips++;
      console.error(`${progress} zip ${zip}: ❌ ${error.message}`);
    }

    if (i < zips.length - 1) {
      await delay(400 + Math.floor(Math.random() * 300));
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📥 Total unique family events in active region: ${allEvents.length}${failedZips > 0 ? ` (${failedZips} zip searches failed)` : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  // Save events grouped by state — saveEventsWithGeocoding requires `state` in options
  if (allEvents.length > 0 && !dry) {
    console.log('💾 Saving events to database...');

    // Group events by state
    const eventsByState = {};
    for (const evt of allEvents) {
      const st = evt.state || 'XX';
      if (!eventsByState[st]) eventsByState[st] = [];
      eventsByState[st].push(evt);
    }

    let totalSaved = 0;
    let totalSkipped = 0;
    let totalInvalidDate = 0;
    let totalErrors = 0;

    for (const [st, stateEvents] of Object.entries(eventsByState)) {
      try {
        // Build venue list for this state's events
        const venueMap = new Map();
        for (const evt of stateEvents) {
          const vName = evt.venue || 'Barnes & Noble';
          if (!venueMap.has(vName)) {
            venueMap.set(vName, {
              name: vName,
              address: evt.address || '',
              city: evt.city || '',
              state: st,
              zipCode: evt.zipCode || '',
              url: evt.source_url || evt.url || '',
            });
          }
        }

        const venues = Array.from(venueMap.values());

        const result = await saveEventsWithGeocoding(stateEvents, venues, {
          scraperName: SCRAPER_NAME,
          state: st,
          category: 'community',
          platform: 'barnes-noble'
        });

        console.log(`  📊 ${st}: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors`);
        totalSaved += result.saved || 0;
        totalSkipped += result.skipped || 0;
        totalInvalidDate += result.invalidDate || 0;
        totalErrors += result.errors || 0;
      } catch (saveError) {
        console.error(`  ❌ Error saving ${st} events: ${saveError.message}`);
        totalErrors++;
      }
    }

    console.log(`✅ Save complete: ${totalSaved} saved across ${Object.keys(eventsByState).length} states, ${totalErrors} errors`);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ BARNES & NOBLE EVENTS SCRAPER COMPLETE`);
    console.log(`${'='.repeat(70)}\n`);

    return {
      found: allEvents.length,
      new: totalSaved,
      saved: totalSaved,
      duplicates: totalSkipped,
      skipped: totalSkipped,
      invalidDate: totalInvalidDate,
      errors: totalErrors,
      total: allEvents.length,
      events: allEvents
    };
  } else if (dry) {
    console.log('🧪 Dry run — skipping database save');
    console.log(`   Would have saved ${allEvents.length} events`);
    for (const evt of allEvents.slice(0, 5)) {
      console.log(`   - ${evt.name} | ${evt.eventDate} | ${evt.venue}`);
    }
  } else {
    console.log('⚠️  No events found — nothing to save');
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ BARNES & NOBLE EVENTS SCRAPER COMPLETE`);
  console.log(`${'='.repeat(70)}\n`);

  return { found: allEvents.length, new: 0, saved: 0, duplicates: 0, invalidDate: 0, errors: 0, total: allEvents.length, events: allEvents };
}

// ==========================================
// CLOUD FUNCTION
// ==========================================

async function scrapeBarnesNobleCloudFunction(req = null, res = null) {
  console.log('☁️  Running as Cloud Function');

  const state = req?.query?.state || req?.body?.state || null;
  const result = await scrapeBarnesNoble({ state });

  if (res) {
    res.status(200).json({
      success: true,
      total: result.total,
      saved: result.saved,
      scraperName: SCRAPER_NAME,
    });
  }

  // Return the raw result so the local-scraper-runner can read found/new/duplicates
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

  scrapeBarnesNoble(options)
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
  scrapeBarnesNoble,
  scrapeBarnesNobleCloudFunction,
  STORES,
  fetchEventsNearZip,
};
