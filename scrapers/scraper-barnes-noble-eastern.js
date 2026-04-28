#!/usr/bin/env node

/**
 * BARNES & NOBLE EVENTS SCRAPER - EASTERN US
 *
 * Scrapes family-friendly events from Barnes & Noble store events pages across 28 eastern US states.
 * Events include: storytimes, author signings, book clubs, craft events, LEGO builds, and more.
 *
 * Source: Barnes & Noble store events pages
 * URL pattern: https://stores.barnesandnoble.com/event/{store-slug}
 *
 * Coverage: AL, CT, DC, DE, FL, GA, IA, IL, IN, KY, MA, MD, ME, MN, MS, NC, NH, NJ, NY,
 *           OH, PA, RI, SC, TN, VA, VT, WI, WV
 *
 * Estimated Events: 200-600 per run (varies by store event schedules)
 *
 * Usage:
 *   node scraper-barnes-noble-eastern.js                # All stores
 *   node scraper-barnes-noble-eastern.js --state NY     # Single state
 *   node scraper-barnes-noble-eastern.js --dry          # Dry run (no DB save)
 *
 * Cloud Function: scrapeBarnesNobleCloudFunction
 * Schedule: Every 3 days (Group 1: days 1,4,7,10...)
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');

const SCRAPER_NAME = 'BarnesNoble-Eastern';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

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
// STORES CONFIGURATION (5-10 per state, major locations)
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
  // Tribeca NYC: DISABLED — storeSlug '2289' is actually Paramus NJ (duplicate).
  // TODO: Find correct Tribeca store slug from stores.barnesandnoble.com
  // { name: 'Barnes & Noble Tribeca NYC', storeSlug: 'FIXME', city: 'New York', state: 'NY', zip: '10013' },
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
 *                  "05/10/2026", or ISO strings
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
// SCRAPING FUNCTIONS
// ==========================================

/**
 * Scrape events from a single Barnes & Noble store's events page.
 */
async function scrapeStore(browser, store) {
  // B&N store pages show events at /store/{slug} — /event/{slug} returns 404
  const storePageUrl = `https://stores.barnesandnoble.com/store/${store.storeSlug}`;

  console.log(`  🔍 Scraping ${store.name}: ${storePageUrl}`);

  const events = [];
  let page = null;

  try {
    page = await createStealthPage(browser);
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the store page (events are listed here)
    let navigated = false;
    try {
      const response = await page.goto(storePageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      if (response && response.status() < 400) {
        // Check for Cloudflare challenge or empty body
        const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '');
        if (bodyText.includes('Checking your browser') || bodyText.includes('Just a moment') || bodyText.length < 50) {
          console.log(`    ⏳ Anti-bot challenge detected, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 8000));
          const retryBody = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '');
          if (retryBody.includes('Checking your browser') || retryBody.length < 50) {
            console.log(`    ⚠️  Challenge not resolved for ${storePageUrl}`);
          } else {
            navigated = true;
          }
        } else {
          navigated = true;
        }
      }
    } catch (navErr) {
      // On timeout, check if page still has usable content
      if (navErr.message.includes('timeout') || navErr.message.includes('Timeout')) {
        try {
          const bodyLen = await page.evaluate(() => document.body?.innerHTML?.length || 0);
          if (bodyLen > 1000) {
            console.log(`    ⚠️  Timeout but page has content (${bodyLen} chars), continuing...`);
            navigated = true;
          }
        } catch (e) { /* page not usable */ }
      }
      if (!navigated) {
        console.log(`    ⚠️  Could not load ${storePageUrl}: ${navErr.message.substring(0, 80)}`);
      }
    }

    if (!navigated) {
      console.log(`    ❌ Could not access store page for ${store.name}`);
      return [];
    }

    // Wait for dynamic content to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from the page
    // B&N store pages have a flat DOM structure (no CSS class containers).
    // Events appear as flat sibling elements under a main container:
    //   heading(month) → heading(day) → image → "In Store"/"Virtual" text →
    //   link(title, href=/event/...) → text(full date) → text(event type) →
    //   link("VIEW DETAILS") → optional button("Buy Tickets")
    // Two sections: "Upcoming Events at This Store" (local) and "Featured Events" (virtual/national)
    const rawEvents = await page.evaluate((sourceUrl) => {
      const results = [];
      const seenHrefs = new Set();

      // JUNK link text to skip
      const JUNK_LINKS = new Set([
        'view details', 'buy tickets', 'register here', 'register now',
        'get tickets', 'rsvp', 'learn more', 'see all', 'view all',
      ]);

      // Date patterns — multiple formats B&N uses:
      // "Saturday, April 25, 2026 11:00 AM ET" (full)
      // "Apr 25, 2026" or "April 25, 2026" (no day name)
      // "04/25/2026" (numeric)
      const DATE_FULL = /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i;
      const DATE_SHORT = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i;
      const DATE_NUMERIC = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
      const hasDate = (t) => DATE_FULL.test(t) || DATE_SHORT.test(t) || DATE_NUMERIC.test(t);

      // Find all links pointing to /event/ pages — these are event title links
      const allLinks = document.querySelectorAll('a[href*="/event/"]');

      for (const link of allLinks) {
        const title = link.textContent.trim();

        // Skip junk links
        if (!title || title.length < 5 || title.length > 300) continue;
        if (JUNK_LINKS.has(title.toLowerCase())) continue;

        // Skip duplicate hrefs (same event linked multiple times)
        const href = link.getAttribute('href') || '';
        if (seenHrefs.has(href)) continue;
        seenHrefs.add(href);

        // Determine if this is a virtual/national event by checking nearby "Virtual" text
        let isVirtual = false;
        let dateText = '';
        let eventType = '';
        let imageUrl = '';

        // Walk siblings and nearby elements to find date, type, and virtual flag
        // The DOM is flat: elements are siblings of the link or siblings of link's parent
        const parent = link.parentElement;
        const grandparent = parent ? parent.parentElement : null;
        const searchRoot = grandparent || parent || link;

        // Look at previous siblings of the link for "In Store"/"Virtual" text and image
        let el = link.previousElementSibling;
        let lookback = 0;
        while (el && lookback < 6) {
          const text = el.textContent.trim();
          if (/^virtual$/i.test(text)) isVirtual = true;
          if (/^in store$/i.test(text)) isVirtual = false;
          if (!imageUrl && el.tagName === 'IMG') {
            imageUrl = el.src || '';
          }
          // Also check inside the element for images
          if (!imageUrl) {
            const img = el.querySelector && el.querySelector('img');
            if (img) imageUrl = img.src || '';
          }
          el = el.previousElementSibling;
          lookback++;
        }

        // Look at next siblings for date text and event type (check up to 8 siblings)
        el = link.nextElementSibling;
        let lookahead = 0;
        while (el && lookahead < 8) {
          const text = el.textContent.trim();

          // Date: various formats
          if (!dateText && text.length > 3 && text.length < 200 && hasDate(text)) {
            dateText = text;
          }

          // Event type: "Author Event", "Special Event", etc.
          if (!eventType && /^(author|special|community|kids|children|family|store)\s*(event|signing|reading)/i.test(text)) {
            eventType = text;
          }
          // Also catch multi-type like "Author Event, Special Event"
          if (!eventType && text.includes('Event') && text.length < 60 && !hasDate(text)) {
            eventType = text;
          }

          el = el.nextElementSibling;
          lookahead++;
        }

        // If no date found in siblings, check text within the link's parent container
        if (!dateText && parent) {
          const parentText = parent.textContent || '';
          // Try to extract date from the container text
          const fullMatch = parentText.match(DATE_FULL);
          const shortMatch = parentText.match(DATE_SHORT);
          const numMatch = parentText.match(DATE_NUMERIC);
          if (fullMatch) dateText = fullMatch[0];
          else if (shortMatch) dateText = shortMatch[0];
          else if (numMatch) dateText = numMatch[0];
        }

        // Also check grandparent container as last resort
        if (!dateText && grandparent) {
          // Look for date in nearby child elements of grandparent
          const allText = grandparent.querySelectorAll('*');
          for (const child of allText) {
            if (child === link) continue;
            const ct = child.textContent.trim();
            if (ct.length > 3 && ct.length < 200 && hasDate(ct)) {
              dateText = ct;
              break;
            }
          }
        }

        // Build full URL
        let fullUrl = href;
        if (href.startsWith('/')) {
          fullUrl = 'https://stores.barnesandnoble.com' + href;
        }

        results.push({
          name: title.substring(0, 200),
          dateText: dateText.substring(0, 150),
          timeText: '',
          description: eventType || '',
          url: fullUrl || sourceUrl,
          imageUrl: imageUrl,
          isVirtual: isVirtual,
        });
      }

      return results;
    }, storePageUrl);

    // Filter out virtual/national events and count
    const localEvents = rawEvents.filter(e => !e.isVirtual);
    const virtualCount = rawEvents.length - localEvents.length;
    console.log(`    📦 Raw: ${rawEvents.length} total (${localEvents.length} local, ${virtualCount} virtual/national skipped)`);

    // Process and filter local events
    for (const raw of localEvents) {
      // Skip adult-only events
      if (isAdultEvent(raw.name, raw.description)) {
        console.log(`    ⏭️  Skipping adult event: ${raw.name.substring(0, 40)}...`);
        continue;
      }

      // Parse date
      const { eventDate, date } = parseBNDate(raw.dateText);

      // Skip events with no date at all
      if (!eventDate && !date) {
        console.log(`    ⏭️  Skipping dateless event: ${raw.name.substring(0, 40)}...`);
        continue;
      }

      // Detect category
      const category = detectCategory(raw.name, raw.description);

      events.push({
        title: raw.name,
        name: raw.name,
        eventDate: eventDate || '',
        date: date,
        description: raw.description || `${category} event at ${store.name}`,
        url: raw.url || storePageUrl,
        imageUrl: raw.imageUrl || '',
        venue: store.name,
        venueName: store.name,
        address: `${store.city}, ${store.state} ${store.zip}`,
        city: store.city,
        state: store.state,
        zipCode: store.zip,
        category: category,
        source_url: storePageUrl,
        scraper_name: SCRAPER_NAME,
        metadata: {
          sourceName: store.name,
          sourceUrl: storePageUrl,
          scrapedAt: new Date().toISOString()
        }
      });
    }

    console.log(`    ✅ ${events.length} family events after filtering`);

  } catch (error) {
    console.error(`    ❌ Error scraping ${store.name}: ${error.message}`);
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
async function scrapeBarnesNoble(options = {}) {
  const { state: filterState = null, dry = false } = options;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📚 BARNES & NOBLE EVENTS SCRAPER - EASTERN US`);
  console.log(`${'='.repeat(70)}`);

  // Filter stores
  let stores = STORES;
  if (filterState) {
    stores = stores.filter(s => s.state.toUpperCase() === filterState.toUpperCase());
    console.log(`📍 Filtering by state: ${filterState.toUpperCase()}`);
  }

  console.log(`📊 Stores to scrape: ${stores.length}`);
  if (dry) console.log(`🧪 DRY RUN — will not save to database`);
  console.log(`${'='.repeat(70)}\n`);

  let browser = null;
  const allEvents = [];
  let sitesSinceRestart = 0;
  const RESTART_INTERVAL = 20; // Restart browser every 20 stores

  try {
    browser = await launchBrowser({ stealth: true });

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const progress = `[${i + 1}/${stores.length}]`;

      console.log(`\n${progress} 📚 ${store.name} (${store.city}, ${store.state})`);

      // Restart browser periodically
      if (sitesSinceRestart >= RESTART_INTERVAL) {
        console.log('\n🔄 Restarting browser to prevent memory issues...');
        try { await browser.close(); } catch (e) { /* ignore */ }
        browser = await launchBrowser({ stealth: true });
        sitesSinceRestart = 0;
      }

      try {
        const storeEvents = await scrapeStore(browser, store);
        allEvents.push(...storeEvents);
        sitesSinceRestart++;
      } catch (error) {
        console.error(`  ❌ Fatal error for ${store.name}: ${error.message}`);
        // Restart browser on protocol errors
        if (error.message.includes('Protocol error') || error.message.includes('Connection closed') ||
            error.message.includes('Target closed') || error.message.includes('detached')) {
          console.log('  🔄 Browser crashed, restarting...');
          try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
          browser = await launchBrowser({ stealth: true });
          sitesSinceRestart = 0;
        }
      }

      // Rate limiting: 3-5 second random delay between stores
      if (i < stores.length - 1) {
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
  console.log(`📥 Total events extracted: ${allEvents.length}`);
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
        totalErrors += result.errors || 0;
      } catch (saveError) {
        console.error(`  ❌ Error saving ${st} events: ${saveError.message}`);
        totalErrors++;
      }
    }

    console.log(`✅ Save complete: ${totalSaved} saved across ${Object.keys(eventsByState).length} states, ${totalErrors} errors`);
  } else if (dry) {
    console.log('🧪 Dry run — skipping database save');
    console.log(`   Would have saved ${allEvents.length} events`);
    for (const evt of allEvents.slice(0, 5)) {
      console.log(`   - ${evt.name} | ${evt.event_date} | ${evt.venue}`);
    }
  } else {
    console.log('⚠️  No events found — nothing to save');
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ BARNES & NOBLE EVENTS SCRAPER COMPLETE`);
  console.log(`${'='.repeat(70)}\n`);

  return { total: allEvents.length, events: allEvents };
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
};
