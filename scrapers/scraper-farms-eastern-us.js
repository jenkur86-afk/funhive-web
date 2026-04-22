#!/usr/bin/env node

/**
 * EASTERN US FAMILY FARMS SCRAPER
 *
 * Scrapes family-friendly farms from multiple sources across 27 eastern US states + DC.
 *
 * Sources:
 *   1. PickYourOwn.org — comprehensive U-pick farm directory by state/region (→ activities table)
 *   2. Eventbrite — seasonal farm events: pumpkin patches, corn mazes, hayrides (→ events table)
 *
 * Coverage: DC, MD, VA, WV, PA, NJ, DE, NY, CT, MA, RI, VT, NH, ME,
 *           NC, SC, GA, FL, AL, MS, TN, KY, OH, IN, MI, IL, WI
 *
 * Activity types (venues): U-pick farms, petting zoos, farm parks, orchards, agritourism
 * Event types: Pumpkin patches, corn mazes, hayrides, berry picking days, farm festivals,
 *              Easter egg hunts, harvest festivals, farm-to-table events
 *
 * Usage:
 *   node scraper-farms-eastern-us.js                    # Test mode (3 states: VA, MD, PA)
 *   node scraper-farms-eastern-us.js --full             # All 27 states
 *   node scraper-farms-eastern-us.js --state VA         # Single state
 *   node scraper-farms-eastern-us.js --events-only      # Only scrape Eventbrite events
 *   node scraper-farms-eastern-us.js --farms-only       # Only scrape PickYourOwn farm venues
 *
 * Cloud Function: scrapeFarmsEasternUSCloudFunction
 * Schedule: Every 3 days (Group 3)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { geocodeAddress } = require('./helpers/geocoding-helper');

const SCRAPER_NAME = 'Farms-Eastern-US';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// All 27 eastern states + DC
const STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MD', name: 'Maryland' },
  { code: 'ME', name: 'Maine' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NY', name: 'New York' },
  { code: 'OH', name: 'Ohio' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'VA', name: 'Virginia' },
  { code: 'VT', name: 'Vermont' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WV', name: 'West Virginia' },
];

// PickYourOwn.org regional sub-pages per state
// Each state has 1+ regional pages. The main page (e.g., MD.htm) has links to sub-regions.
const PYO_REGIONS = {
  AL: ['AL.htm'],
  CT: ['CT.htm'],
  DC: ['DCmetro.htm'],
  DE: ['DE.htm'],
  FL: ['FLnorth.htm', 'FLcentral.htm', 'FLsouth.htm'],
  GA: ['GAnorth.htm', 'GAsouth.htm'],
  IL: ['ILchicago.htm', 'ILcentral.htm', 'ILsouth.htm'],
  IN: ['INnorth.htm', 'INsouth.htm'],
  KY: ['KY.htm'],
  MA: ['MAeast.htm', 'MAwest.htm'],
  MD: ['MDbalt.htm', 'MDeast.htm', 'MDwest.htm'],
  ME: ['ME.htm'],
  MI: ['MIeast.htm', 'MIwest.htm'],
  MS: ['MS.htm'],
  NC: ['NCeast.htm', 'NCwest.htm'],
  NH: ['NH.htm'],
  NJ: ['NJnorth.htm', 'NJsouth.htm'],
  NY: ['NYcity.htm', 'NYhudson.htm', 'NYwest.htm'],
  OH: ['OHnorth.htm', 'OHsouth.htm'],
  PA: ['PAeast.htm', 'PAwest.htm'],
  RI: ['RI.htm'],
  SC: ['SC.htm'],
  TN: ['TNeast.htm', 'TNwest.htm'],
  VA: ['VAnorthern.htm', 'VAsoutheast-Richmond.htm', 'VAroanoke.htm'],
  VT: ['VT.htm'],
  WI: ['WI.htm'],
  WV: ['WVeast.htm', 'WVcharleston.htm'],
};

// ============================================================================
// SOURCE 1: PickYourOwn.org — farm venue directory
// ============================================================================

const PYO_BASE = 'https://www.pickyourown.org/';

/**
 * Scrape a single PickYourOwn.org regional page for farm listings.
 *
 * Page structure: farms are <li> elements containing "Phone:".
 * Farm name = text before the first " - " in the <li>.
 * Address follows as "street, City, ST ZIP".
 */
async function scrapePickYourOwnPage(page, regionSlug, stateCode) {
  const url = `${PYO_BASE}${regionSlug}`;
  console.log(`    🌾 PickYourOwn: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Extract farm listings from <li> elements that contain "Phone:"
    const farms = await page.evaluate((stCode) => {
      const STATE_ABBRS = 'AL|CT|DC|DE|FL|GA|IL|IN|KY|MA|MD|ME|MI|MS|NC|NH|NJ|NY|OH|PA|RI|SC|TN|VA|VT|WI|WV';
      const stateRe = new RegExp(',\\s*([A-Za-z .]+),?\\s*(?:' + STATE_ABBRS + ')\\s+(\\d{5})', 'i');
      const results = [];
      const lis = document.querySelectorAll('li');

      for (const li of lis) {
        const text = (li.textContent || '').trim().replace(/\s+/g, ' ');
        if (!text.includes('Phone:')) continue;

        // ── Name: text before the first " - " ──
        const dashIdx = text.indexOf(' - ');
        if (dashIdx < 1 || dashIdx > 80) continue;
        const name = text.substring(0, dashIdx).trim();
        if (name.length < 3) continue;

        // Skip obviously closed farms
        const lower = text.toLowerCase();
        if (/permanently\s*closed|no\s+longer\s+open|out\s+of\s+business/i.test(lower)) continue;

        // ── Phone ──
        const phoneMatch = text.match(/Phone:\s*([\d(). -]+)/);
        let phone = phoneMatch ? phoneMatch[1].trim() : '';
        phone = phone.replace(/[.\s]+$/, ''); // strip trailing dots/spaces

        // ── Address, City, ZIP ──
        // Pattern: "123 Street Name, City, ST 12345"
        // Use a generous regex — PYO listings often have extra whitespace/commas
        const addrPatterns = [
          // Full: "22222 Davis Mill Rd, Germantown, MD 20876"
          /(\d+\s+[A-Za-z0-9\s.'-]+?(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Highway|Hwy|Route|Rt|Boulevard|Blvd|Pike|Way|Trail|Court|Ct|Circle|Place|Pl|Mill\s+Rd)[.,]?)\s*,?\s*([A-Za-z][A-Za-z\s.]+?),?\s*(?:AL|CT|DC|DE|FL|GA|IL|IN|KY|MA|MD|ME|MI|MS|NC|NH|NJ|NY|OH|PA|RI|SC|TN|VA|VT|WI|WV)\s+(\d{5})/i,
          // Generic: "number words, City, ST ZIP"
          /(\d+[A-Za-z0-9\s.,()'-]+?),\s*([A-Za-z][A-Za-z\s.]+?),\s*(?:AL|CT|DC|DE|FL|GA|IL|IN|KY|MA|MD|ME|MI|MS|NC|NH|NJ|NY|OH|PA|RI|SC|TN|VA|VT|WI|WV)\s+(\d{5})/i,
        ];
        let address = '', city = '', zip = '';
        for (const pat of addrPatterns) {
          const m = text.match(pat);
          if (m) {
            address = m[1].trim().replace(/[,.\s]+$/, '');
            city = m[2].trim();
            zip = m[3];
            break;
          }
        }
        if (!city) {
          // Fallback: just try to get city + zip from state pattern
          const cityMatch = text.match(stateRe);
          if (cityMatch) { city = cityMatch[1].trim(); zip = cityMatch[2]; }
        }

        // ── Website: extract the real farm URL ──
        // PYO wraps farm links in redirects like PYO.php?...&URL=https://realfarm.com
        // Also filter out YouTube, Facebook, Google Maps, and other non-farm links
        const links = Array.from(li.querySelectorAll('a'));
        let website = '';
        for (const a of links) {
          const href = a.href || '';
          // Check PYO redirect links first — these contain the real farm URL
          if (href.includes('PYO.php') || href.includes('PAGGE')) {
            const urlParam = href.match(/URL=([^&]+)/);
            if (urlParam) {
              const realUrl = decodeURIComponent(urlParam[1]);
              if (!realUrl.includes('youtube') && !realUrl.includes('facebook')) {
                website = realUrl;
                break;
              }
            }
            continue;
          }
          // Skip internal, maps, social media, video, and mail links
          if (href.includes('pickyourown')) continue;
          if (href.includes('mailto:')) continue;
          if (href.includes('maps.google')) continue;
          if (href.includes('javascript:')) continue;
          if (href.includes('youtube.com') || href.includes('youtu.be')) continue;
          if (href.includes('facebook.com') || href.includes('fb.com')) continue;
          if (href.includes('instagram.com')) continue;
          if (href.includes('twitter.com') || href.includes('x.com')) continue;
          if (href.includes('yelp.com')) continue;
          if (href.includes('tripadvisor')) continue;
          // If we get here, it's likely the farm's own website
          website = href;
          break;
        }

        // ── Detect farm activities from the text ──
        const activities = [];
        if (/u-pick|u pick|pick.your.own|pyo\b/i.test(lower)) activities.push('U-Pick');
        if (/pumpkin/i.test(lower)) activities.push('Pumpkin Patch');
        if (/corn\s*maze/i.test(lower)) activities.push('Corn Maze');
        if (/hayride|hay\s*ride/i.test(lower)) activities.push('Hayrides');
        if (/petting\s*zoo|petting\s*farm|farm\s*animal/i.test(lower)) activities.push('Petting Zoo');
        if (/apple|orchard/i.test(lower)) activities.push('Apple Orchard');
        if (/berr(?:y|ies)|strawberr|blueberr|blackberr|raspberr/i.test(lower)) activities.push('Berry Picking');
        if (/christmas\s*tree|tree\s*farm/i.test(lower)) activities.push('Christmas Tree Farm');
        if (/flower/i.test(lower)) activities.push('Flower Farm');
        if (/peach/i.test(lower)) activities.push('Peach Orchard');
        if (/sunflower/i.test(lower)) activities.push('Sunflower Field');
        if (/lavender/i.test(lower)) activities.push('Lavender Farm');
        if (/playground|play\s*area/i.test(lower)) activities.push('Playground');
        if (/farm\s*market|farm\s*stand|farm\s*store/i.test(lower)) activities.push('Farm Market');

        // ── Skip wineries / breweries ──
        if (/winery|wine\s*cellar|wine\s*tasting|brewery|distillery|spirits/i.test(lower)) continue;

        results.push({
          name,
          website,
          phone,
          address,
          city,
          zip,
          state: stCode,
          activities,
          description: activities.length > 0 ? activities.join(', ') : 'Family farm',
        });
      }

      return results;
    }, stateCode);

    console.log(`    ✓ Found ${farms.length} farm listings`);
    return farms;

  } catch (err) {
    console.error(`    ❌ Error scraping ${url}: ${err.message}`);
    return [];
  }
}

/**
 * Scrape all PickYourOwn.org pages for a given state
 */
async function scrapePickYourOwnState(page, stateObj) {
  const regions = PYO_REGIONS[stateObj.code] || [`${stateObj.code}.htm`];
  const allFarms = [];

  for (const region of regions) {
    const farms = await scrapePickYourOwnPage(page, region, stateObj.code);
    allFarms.push(...farms);
  }

  // Deduplicate by name (case-insensitive)
  const seen = new Set();
  return allFarms.filter(f => {
    const key = f.name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


// ============================================================================
// SOURCE 2: Farm website scraping — visit each farm's site for real events
// ============================================================================

// Month names for date parsing
const MONTH_NAMES = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Extract events from a farm's own website text.
 * Looks for patterns like:
 *   - Named events with dates: "Spring Festival April 18, 19, 25 & 26"
 *   - Seasonal activities: "Now Picking: Asparagus" / "U-Pick Cherry Adventures starting mid-June"
 *   - Hours/open dates: "Farm Market OPEN Tuesdays-Sundays 9am-6pm"
 *   - Reopening dates: "Grand Reopening June 5"
 */
function extractEventsFromPageText(pageText, farm) {
  const events = [];
  const text = pageText.replace(/\s+/g, ' ').trim();
  const currentYear = new Date().getFullYear();

  // Words/phrases that indicate this is NOT a real event
  const REJECT_WORDS = /closed|cancelled|canceled|postponed|suspended|no longer|sold out|past event|hours of operation|open daily|open weekends|business hours|store hours|farm hours|market hours|we will be open|check facebook|check instagram|for\s*details|page for|on\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*$/i;
  // Day-of-week prefixes to strip from captured names
  const DAY_PREFIX = /^(?:Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\s*/i;
  // Full day-of-week names for rejection (when the entire cleaned name is just a day)
  const JUST_A_DAY = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i;
  // Navigation/UI junk words and lead-in phrases to strip from the start of event names
  const NAV_JUNK = /^(?:Home|About|Contact|Menu|Shop|Store|Photos?|Gallery|Jobs?|Careers?|Blog|News|FAQ|Login|Sign\s*[Uu]p|Cart|Search|Skip|Close|Toggle|Back|Next|Previous|More|Read\s+More|Learn\s+More|Click|View|Visit|Welcome|See|Our|The|Open\s+|Now\s+(?:through|thru|until)\s+\w+\s*|Starting\s+\w+\s*|Join\s+us\s+(?:for|at|on)\s+(?:our\s+)?(?:annual\s+)?|Come\s+(?:to|enjoy)\s+(?:our\s+)?|Hours?\s+of\s+Operation\s*|Opening\s+|Comments?\s+|We\s+will\s+be\s+)\s*/i;
  // Reject event names that are clearly sentence fragments (start with lowercase, conjunctions, prepositions, or time fragments)
  const FRAGMENT_START = /^(?:or|and|for|the|at|on|in|to|of|with|by|from|we|you|our|is|are|was|will|be|do|has|pm|am|a\.?m\.?|p\.?m\.?|page|please|also|just|only|but|if|then|so|check|see|click|call|email|field|bring)\s/i;
  // Reject garbled text where words are jammed together (missing spaces from HTML extraction)
  const GARBLED_TEXT = /on(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday)|for(?:details|more|info)|check(?:out|back)|click(?:here)/i;

  /**
   * Clean up an extracted event name — strip junk prefixes and trailing punctuation.
   */
  function cleanEventName(name) {
    let cleaned = name.trim();
    // Remove nav/UI junk words from the start (may need multiple passes)
    for (let i = 0; i < 5; i++) {
      const before = cleaned;
      cleaned = cleaned.replace(NAV_JUNK, '');
      cleaned = cleaned.replace(DAY_PREFIX, '');
      if (cleaned === before) break;
    }
    // Remove trailing punctuation
    cleaned = cleaned.replace(/[!.,;:\-–]+$/, '').trim();
    return cleaned;
  }

  // ── Strategy 1: Find named events with specific dates ──
  // Patterns like "Spring Festival April 18, 19, 25 & 26" or "Easter Festival May 3-4"
  // NOTE: No /i flag — [A-Z] must truly match uppercase so the name group doesn't
  //       grab lowercase lead-in text like "keep the spring fun going at the..."
  const eventPatterns = [
    // Pattern 0: "Event Name[!?.] Month Day(s)" — name then date
    { re: /(?:[Tt]he\s+)?([A-Z][A-Za-z'&\s]{3,40}(?:[Ff]estival|[Ff]est|[Ff]air|[Dd]ays?|[Cc]elebration|[Hh]unt|[Ee]vent|[Pp]arty|[Pp]arties|[Aa]dventures?))[!?.,;:\-–\s]*(?:(?:[Oo]pen|[Ss]tarts?|[Rr]unning|[Hh]appening)\s+)?(?:[Oo]n\s+)?([A-Za-z]+\s+\d{1,2}(?:\s*[-–,&]\s*\d{1,2})*(?:\s*[,&]\s*[A-Za-z]+\s+\d{1,2}(?:\s*[-–,&]\s*\d{1,2})*)*)/g, nameGroup: 1 },
    // Pattern 1: "Month Day(s) - Event Name" — date then name
    { re: /([A-Za-z]+\s+\d{1,2}(?:\s*[-–,&]\s*\d{1,2})*)\s+[-–]\s+([A-Z][A-Za-z'&\s]{3,40}(?:[Ff]estival|[Ff]est|[Ff]air|[Dd]ays?|[Cc]elebration|[Hh]unt|[Ee]vent|[Pp]arty|[Aa]dventures?))/g, nameGroup: 2 },
  ];

  for (const { re: pattern, nameGroup } of eventPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const dateGroup = nameGroup === 1 ? 2 : 1;
      let eventName = match[nameGroup].trim();
      let dateStr = match[dateGroup].trim();

      // Clean the event name
      eventName = cleanEventName(eventName);
      if (!eventName || eventName.length < 4) continue;
      // Reject names that are just a day-of-week or a single common word
      if (JUST_A_DAY.test(eventName)) continue;
      // Must have 2-6 words — real event names are short ("Spring Festival", "Easter Egg Hunt")
      // Longer strings are usually descriptive text that happened to contain a keyword
      const wordCount = eventName.split(/\s+/).length;
      if (wordCount < 2 || wordCount > 6) continue;

      // Skip events with rejection words (closed, cancelled, etc.)
      if (REJECT_WORDS.test(eventName)) continue;
      // Also check the surrounding context (30 chars before + match) for "closed"
      const contextStart = Math.max(0, match.index - 30);
      const context = text.substring(contextStart, match.index + match[0].length);
      if (REJECT_WORDS.test(context)) continue;
      // Reject sentence fragments that start with prepositions, conjunctions, etc.
      if (FRAGMENT_START.test(eventName)) continue;
      // Reject garbled text (words jammed together)
      if (GARBLED_TEXT.test(eventName)) continue;
      // Event name must start with an uppercase letter (after cleaning)
      if (!/^[A-Z]/.test(eventName)) continue;

      // Try to parse the first date from the date string
      const dateMatch = dateStr.match(/(\w+)\s+(\d{1,2})/);
      if (dateMatch) {
        const monthStr = dateMatch[1].toLowerCase();
        const day = parseInt(dateMatch[2]);
        const monthNum = MONTH_NAMES[monthStr];
        if (monthNum !== undefined && day >= 1 && day <= 31) {
          const eventDate = new Date(currentYear, monthNum, day);
          // If date already passed this year, skip
          if (eventDate < new Date()) continue;

          events.push({
            name: `${eventName} at ${farm.name}`,
            eventDate: eventDate.toISOString(),
            description: `${eventName} at ${farm.name}. Visit the farm website for details, hours, and tickets.`,
            venue: farm.name,
            url: farm.website,
            address: farm.address,
            city: farm.city,
            stateCode: farm.state,
            zipCode: farm.zip,
            source: 'farm-website',
          });
        }
      }
    }
  }

  // ── Strategy 2: Seasonal activity patterns with dates ──
  // "Now Picking: Asparagus (Open Saturdays & Sundays, 10am-4pm)"
  // "U-Pick Cherry Adventures Starting early-mid June"
  // "Grand Reopening June 5"
  const activityPatterns = [
    { re: /(?:now\s+picking|currently\s+picking|pick\s+your\s+own|u-pick)\s*[:\-–]?\s*([A-Za-z,\s&]+?)(?:\.|!|\(|open|$)/gi, type: 'U-Pick' },
    { re: /(?:grand\s+)?reopening\s+(?:is\s+)?(?:on\s+)?(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/gi, type: 'Farm Opening' },
    { re: /(pumpkin\s+(?:patch|festival|fest))\s*[:\-–]?\s*(?:open(?:s|ing)?\s+)?(\w+\s+\d{1,2})/gi, type: 'Pumpkin Patch' },
    { re: /(corn\s+maze)\s*[:\-–]?\s*(?:open(?:s|ing)?\s+)?(\w+\s+\d{1,2})/gi, type: 'Corn Maze' },
    { re: /(hayride|hay\s+ride)s?\s*[:\-–]?\s*(?:open(?:s|ing)?\s+)?(\w+\s+\d{1,2})/gi, type: 'Hayrides' },
    { re: /(easter\s+(?:egg\s+hunt|festival|celebration|bunny))/gi, type: 'Easter Event' },
    { re: /(fall\s+festival|harvest\s+festival|autumn\s+fest)/gi, type: 'Harvest Festival' },
  ];

  for (const { re, type } of activityPatterns) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(text)) !== null) {
      // Try to find a date near this match
      const surrounding = text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 80);
      const dateInContext = surrounding.match(/(\w+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/);

      if (dateInContext) {
        const monthStr = dateInContext[1].toLowerCase();
        const day = parseInt(dateInContext[2]);
        const year = dateInContext[3] ? parseInt(dateInContext[3]) : currentYear;
        const monthNum = MONTH_NAMES[monthStr];

        if (monthNum !== undefined && day >= 1 && day <= 31) {
          const eventDate = new Date(year, monthNum, day);
          if (eventDate < new Date()) continue;

          const activityName = cleanEventName(match[1]?.trim() || type);
          // Skip "closed", "cancelled", operational text, etc.
          if (REJECT_WORDS.test(activityName) || REJECT_WORDS.test(surrounding)) continue;
          // Reject names that are just a day-of-week
          if (JUST_A_DAY.test(activityName)) continue;
          // Reject sentence fragments
          if (FRAGMENT_START.test(activityName)) continue;
          // Reject garbled text
          if (GARBLED_TEXT.test(activityName)) continue;
          // Must start with uppercase and be 2+ chars
          if (!/^[A-Z]/.test(activityName) || activityName.length < 4) continue;
          // Word count: 1-6 words (strategy 2 can have single-word like "Hayrides")
          if (activityName.split(/\s+/).length > 6) continue;
          // Skip if we already have an event with this name
          const nameKey = activityName.toLowerCase();
          if (events.some(e => e.name.toLowerCase().includes(nameKey))) continue;

          events.push({
            name: `${activityName} at ${farm.name}`,
            eventDate: eventDate.toISOString(),
            description: `${type} at ${farm.name}. Visit the farm website for hours and details.`,
            venue: farm.name,
            url: farm.website,
            address: farm.address,
            city: farm.city,
            stateCode: farm.state,
            zipCode: farm.zip,
            source: 'farm-website',
          });
        }
      }
    }
  }

  return events;
}

/**
 * Visit each farm's website and extract events from the page content.
 * Only visits farms that have a website URL.
 */
async function scrapeFarmWebsiteEvents(page, stateObj, farms) {
  const farmsWithSites = farms.filter(f => {
    if (!f.website || !f.website.startsWith('http')) return false;
    // Filter out non-URL strings that slipped through (e.g., "Coming Soon" text that got parsed)
    const url = f.website.toLowerCase();
    if (url.length < 10) return false;
    // Must have a dot after the protocol (basic URL validation)
    try { new URL(f.website); } catch { return false; }
    return true;
  });
  if (farmsWithSites.length === 0) {
    console.log(`    🌐 No farm websites to visit`);
    return [];
  }

  console.log(`    🌐 Visiting ${farmsWithSites.length} farm websites for events...`);
  const allEvents = [];

  for (const farm of farmsWithSites) {
    try {
      await page.goto(farm.website, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await delay(2000);

      // Extract all visible text from the page (skip nav, header, footer, scripts)
      const pageText = await page.evaluate(() => {
        const body = document.body;
        if (!body) return '';
        const clone = body.cloneNode(true);
        // Remove nav, header, footer, and non-content elements
        clone.querySelectorAll('script, style, noscript, iframe, nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"], .nav, .navbar, .footer, .header, .menu, .sidebar').forEach(el => el.remove());
        return (clone.textContent || '').replace(/\s+/g, ' ').substring(0, 10000);
      });

      if (!pageText || pageText.length < 50) continue;

      const events = extractEventsFromPageText(pageText, farm);
      if (events.length > 0) {
        console.log(`    🌐 ${farm.name}: found ${events.length} event(s)`);
        events.forEach(e => console.log(`        → "${e.name}" on ${e.eventDate.substring(0, 10)}`));
        allEvents.push(...events);
      } else if (farm.name.toLowerCase().includes('butler')) {
        // Debug: show why Butler's has no events
        console.log(`    🔍 ${farm.name}: no events found. Page text preview: "${pageText.substring(0, 200)}..."`);
      }

    } catch (err) {
      // Timeout or navigation error — skip silently (many small farm sites are slow)
      if (!err.message.includes('timeout')) {
        console.error(`    ⚠️ ${farm.name}: ${err.message.substring(0, 60)}`);
      }
    }
  }

  console.log(`    🌐 Total farm website events: ${allEvents.length}`);
  return allEvents;
}


// ============================================================================
// SOURCE 3: Eventbrite — supplemental farm event search
// ============================================================================

function getEventbriteUrl(stateName, searchTerm) {
  const slug = stateName.toLowerCase().replace(/\s+/g, '-');
  const q = encodeURIComponent(searchTerm);
  return `https://www.eventbrite.com/d/united-states--${slug}/${q}/?page=1`;
}

/**
 * Scrape Eventbrite for farm-related events in a state (supplemental)
 */
async function scrapeEventbriteFarmEvents(page, stateObj) {
  const allEvents = [];
  const terms = ['farm festival', 'pumpkin patch corn maze', 'u-pick farm hayride'];

  for (const term of terms) {
    const url = getEventbriteUrl(stateObj.name, term);
    console.log(`    🎫 Eventbrite: ${term}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await delay(3000);

      // Try JSON-LD structured data first
      const jsonLdEvents = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const events = [];
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent);
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item['@type'] === 'Event' || item['@type'] === 'SocialEvent') {
                events.push({
                  name: item.name || '',
                  description: (item.description || '').substring(0, 1000),
                  eventDate: item.startDate || '',
                  endDate: item.endDate || '',
                  url: item.url || '',
                  image: item.image || (item.image && item.image[0]) || '',
                  venue: item.location?.name || '',
                  address: item.location?.address?.streetAddress || '',
                  city: item.location?.address?.addressLocality || '',
                  stateCode: item.location?.address?.addressRegion || '',
                  zipCode: item.location?.address?.postalCode || '',
                  isFree: item.isAccessibleForFree === true || (item.offers && item.offers.price === 0),
                  price: item.offers?.price || '',
                });
              }
            }
          } catch (_) {}
        }
        return events;
      });

      if (jsonLdEvents.length > 0) {
        allEvents.push(...jsonLdEvents);
        continue;
      }

      // Fallback: DOM scraping
      const domEvents = await page.evaluate(() => {
        const events = [];
        const cards = document.querySelectorAll('[data-testid="event-card"], .search-event-card-wrapper, .eds-event-card, a[data-event-id]');
        for (const card of cards) {
          const nameEl = card.querySelector('h2, h3, [data-testid="event-card-title"], .event-card__clamp-line--two');
          const dateEl = card.querySelector('[data-testid="event-card-date"], .event-card__clamp-line--one, time');
          const locEl = card.querySelector('[data-testid="event-card-location"], .event-card__location');
          const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="eventbrite"]');
          const imgEl = card.querySelector('img');

          events.push({
            name: nameEl ? nameEl.textContent.trim() : '',
            eventDate: dateEl ? dateEl.textContent.trim() : '',
            city: locEl ? locEl.textContent.trim() : '',
            url: linkEl ? linkEl.href : '',
            image: imgEl ? imgEl.src : '',
            description: '',
          });
        }
        return events;
      });

      allEvents.push(...domEvents);

    } catch (err) {
      console.error(`    ⚠️ Eventbrite error for "${term}": ${err.message}`);
    }
  }

  console.log(`    ✓ Found ${allEvents.length} Eventbrite farm events`);
  return allEvents;
}


// ============================================================================
// FAMILY-FRIENDLY FILTER (for events)
// ============================================================================

function isFamilyFriendlyFarm(name, description) {
  const text = `${name} ${description}`.toLowerCase();

  const adultKeywords = [
    'wine tasting', 'wine fest', 'wine festival', 'wine walk', 'wine trail',
    'beer fest', 'beer festival', 'craft beer', 'brew fest', 'brewfest',
    'bourbon', 'whiskey', 'cocktail', 'mixology', 'spirits fest',
    'bar crawl', 'pub crawl', 'happy hour', 'adults only', 'adult only',
    '21+', '21 and over', 'must be 21', 'nightclub',
    'burlesque', 'strip club', 'drag brunch',
    'cannabis', 'weed fest', '420',
    'poker tournament', 'casino night',
    'tequila', 'margarita', 'mimosa crawl', 'boozy',
    'uncorked', 'vodka', 'rosé festival', 'cigar',
  ];

  for (const kw of adultKeywords) {
    if (text.includes(kw)) return false;
  }

  const adultPatterns = [
    /\bwine\b.*\bfest/,
    /\bbeer\b.*\bfest/,
    /\bbrews?\b/,
    /\bbourbon\b/,
    /\bwhiskey\b/,
    /\bwinery\b/,
    /\bvineyard\b.*\b(tour|fest|tasting)\b/,
    /\bdistillery\b/,
    /\b21\s*\+/,
  ];

  for (const pat of adultPatterns) {
    if (pat.test(text)) return false;
  }

  return true;
}


// ============================================================================
// GEOCODING
// ============================================================================

async function geocodeFarm(address, city, state, zipCode, farmName) {
  // Try full address
  if (address && city) {
    const fullAddr = `${address}, ${city}, ${state} ${zipCode || ''}`.trim();
    try {
      const coords = await geocodeAddress(fullAddr);
      if (coords) return coords;
    } catch (_) {}
  }

  // Try city + state + zip
  if (city) {
    const cityAddr = `${city}, ${state} ${zipCode || ''}`.trim();
    try {
      const coords = await geocodeAddress(cityAddr);
      if (coords) return coords;
    } catch (_) {}
  }

  // Try just zip + state
  if (zipCode) {
    try {
      const coords = await geocodeAddress(`${zipCode}, ${state}`);
      if (coords) return coords;
    } catch (_) {}
  }

  // Last resort: try farm name + state (many farms are well-known landmarks)
  if (farmName) {
    try {
      const coords = await geocodeAddress(`${farmName}, ${state}`);
      if (coords) return coords;
    } catch (_) {}
  }

  return null;
}


// ============================================================================
// SAVE FARM VENUES (activities table)
// ============================================================================

async function saveFarmVenues(stateObj, farms) {
  if (farms.length === 0) return { saved: 0, skipped: 0 };

  let saved = 0, skipped = 0;

  for (const farm of farms) {
    try {
      if (!farm.name || farm.name.trim().length < 3) { skipped++; continue; }

      // Skip wineries/breweries that might have slipped through
      if (!isFamilyFriendlyFarm(farm.name, farm.description || '')) { skipped++; continue; }

      // Generate a stable ID from farm name + state
      const farmId = `farm-${stateObj.code}-${farm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60)}`;

      // Check if already exists by our ID
      const existingById = await db.collection('activities').where('id', '==', farmId).limit(1).get();
      if (!existingById.empty) { skipped++; continue; }

      // Also check if another scraper already created this venue (by name + state)
      const existingByName = await db.collection('activities')
        .where('name', '==', farm.name.trim())
        .where('state', '==', stateObj.code)
        .limit(1).get();
      if (!existingByName.empty) {
        console.log(`    ⏭️ Already exists (from ${existingByName.docs[0].data()?.scraper_name || 'another scraper'}): ${farm.name}`);
        skipped++;
        continue;
      }

      // Geocode the farm
      const coords = await geocodeFarm(farm.address, farm.city, stateObj.code, farm.zip, farm.name);
      let geohash = '';
      if (coords) {
        geohash = ngeohash.encode(coords.lat || coords.latitude, coords.lon || coords.longitude, 7);
      }

      // Build activity category description
      const activityDesc = farm.activities.length > 0
        ? `Family farm offering ${farm.activities.join(', ').toLowerCase()}. Visit for a fun family outing!`
        : `Family-friendly farm in ${farm.city || stateObj.name}. Visit for fresh produce and farm activities.`;

      // Determine subcategory based on activities
      let subcategory = 'Family Farm';
      if (farm.activities.includes('U-Pick')) subcategory = 'U-Pick Farm';
      else if (farm.activities.includes('Petting Zoo')) subcategory = 'Petting Zoo';
      else if (farm.activities.includes('Apple Orchard') || farm.activities.includes('Peach Orchard')) subcategory = 'Orchard';
      else if (farm.activities.includes('Berry Picking')) subcategory = 'Berry Farm';
      else if (farm.activities.includes('Christmas Tree Farm')) subcategory = 'Christmas Tree Farm';
      else if (farm.activities.includes('Sunflower Field') || farm.activities.includes('Lavender Farm') || farm.activities.includes('Flower Farm')) subcategory = 'Flower Farm';

      // Save to activities table via adapter
      await db.collection('activities').doc(farmId).set({
        name: farm.name.trim(),
        description: activityDesc,
        category: 'Outdoor & Nature',
        subcategory,
        url: farm.website || '',
        phone: farm.phone || '',
        isFree: false,
        ageRange: 'All Ages',
        address: farm.address || '',
        city: farm.city || '',
        state: stateObj.code,
        zipCode: farm.zip || '',
        geohash,
        source: 'pickyourown.org',
        scraperName: SCRAPER_NAME,
        metadata: {
          scraperName: SCRAPER_NAME,
          scrapedAt: new Date().toISOString(),
          source: 'pickyourown.org',
          state: stateObj.code,
          category: 'Outdoor & Nature',
          farmActivities: farm.activities,
        },
        location: coords ? {
          name: farm.name.trim(),
          city: farm.city || '',
          state: stateObj.code,
          zipCode: farm.zip || '',
          address: farm.address || '',
          latitude: coords.lat || coords.latitude,
          longitude: coords.lon || coords.longitude,
          coordinates: { latitude: coords.lat || coords.latitude, longitude: coords.lon || coords.longitude }
        } : {
          name: farm.name.trim(),
          city: farm.city || '',
          state: stateObj.code,
          zipCode: farm.zip || '',
          address: farm.address || '',
        },
      });

      process.stdout.write(`    ✅ ${farm.name.substring(0, 50)}\n`);
      saved++;

    } catch (err) {
      if (err.message?.includes('Skipping')) { skipped++; continue; }
      console.error(`    ❌ Error saving farm "${farm.name}": ${err.message}`);
      skipped++;
    }
  }

  return { saved, skipped };
}


// ============================================================================
// SAVE FARM EVENTS (events table)
// ============================================================================

function parseFarmEventDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch (_) {}

  // Try common formats: "Sat, Apr 26, 2026", "April 26, 2026", etc.
  const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const m = dateStr.match(/(\w{3,9})\s+(\d{1,2})(?:\w{0,2})?,?\s*(\d{4})/i);
  if (m) {
    const mon = months[m[1].substring(0,3).toLowerCase()];
    if (mon !== undefined) return new Date(parseInt(m[3]), mon, parseInt(m[2]));
  }
  return null;
}

function extractTime(dateStr) {
  if (!dateStr) return '';
  const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`;
  }
  return '';
}

async function saveFarmEvents(stateObj, rawEvents) {
  if (rawEvents.length === 0) return { saved: 0, skipped: 0, failed: 0 };

  // Deduplicate: farm-website events share the same URL (farm homepage),
  // so use name+date as key for those; use URL for Eventbrite events.
  const seen = new Set();
  const unique = rawEvents.filter(e => {
    let key;
    if (e.source === 'farm-website') {
      // Name+date dedup — multiple events at the same farm should all be kept
      key = `${e.name}|||${e.eventDate}`.toLowerCase().replace(/\s+/g, ' ').trim();
    } else {
      // Eventbrite events have unique URLs
      key = e.url ? e.url.toLowerCase() : `${e.name}|||${e.eventDate}`.toLowerCase().replace(/\s+/g, ' ').trim();
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let saved = 0, skipped = 0, failed = 0;
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 120); // Farms plan further ahead

  for (const event of unique) {
    try {
      if (!event.name || event.name.trim().length < 3) { skipped++; continue; }

      // Filter adult events
      if (!isFamilyFriendlyFarm(event.name, event.description || '')) { skipped++; continue; }

      // Must be farm-related (skip check for events sourced from farm websites — they're relevant by definition)
      const farmText = `${event.name} ${event.description || ''}`.toLowerCase();
      if (event.source !== 'farm-website') {
        const isFarmRelated = /farm|pumpkin|corn\s*maze|hayride|hay\s*ride|u-pick|pick.your.own|berry|orchard|harvest|petting\s*zoo|sunflower|apple\s*pick|agri/i.test(farmText);
        if (!isFarmRelated) { skipped++; continue; }
      }

      // Parse and validate date
      const parsedDate = parseFarmEventDate(event.eventDate);
      if (!parsedDate) { skipped++; continue; }
      if (parsedDate < now) { skipped++; continue; }
      if (parsedDate > maxDate) { skipped++; continue; }

      const normalizedDate = normalizeDateString(parsedDate.toISOString());
      if (!normalizedDate) { skipped++; continue; }

      // Categorize — force farm category
      const city = event.city || '';
      const zip = event.zipCode || '';
      const address = event.address || '';
      const stateCode = event.stateCode || stateObj.code;

      // Geocode
      const venueName = event.venue || event.name.trim();
      const coords = await geocodeFarm(address, city, stateCode, zip, venueName);
      let geohash = '';
      if (coords) {
        geohash = ngeohash.encode(coords.lat || coords.latitude, coords.lon || coords.longitude, 7);
      }

      // Check for duplicate by URL (Eventbrite events have unique URLs; farm-website events don't)
      if (event.url && event.source !== 'farm-website') {
        const existing = await db.collection('events').where('url', '==', event.url).limit(1).get();
        if (!existing.empty) { skipped++; continue; }
      }

      // Check for duplicate by venue name + similar date (catches Eventbrite dupes of website events)
      if (event.venue) {
        const venueEvents = await db.collection('events')
          .where('venue', '==', event.venue)
          .where('state', '==', stateCode)
          .limit(10).get();
        if (!venueEvents.empty) {
          const parsedMs = parsedDate.getTime();
          const isDupe = venueEvents.docs.some(doc => {
            const d = doc.data();
            if (!d.date) return false;
            const existingMs = new Date(d.date).getTime();
            // Same venue, within 3 days = likely duplicate
            return Math.abs(existingMs - parsedMs) < 3 * 24 * 60 * 60 * 1000;
          });
          if (isDupe) { skipped++; continue; }
        }
      }

      // Determine subcategory
      let subcategory = 'Farm Event';
      if (/pumpkin/i.test(farmText)) subcategory = 'Pumpkin Patch';
      else if (/corn\s*maze/i.test(farmText)) subcategory = 'Corn Maze';
      else if (/hayride|hay\s*ride/i.test(farmText)) subcategory = 'Hayride';
      else if (/berry|strawberr|blueberr/i.test(farmText)) subcategory = 'Berry Picking';
      else if (/apple.*pick|orchard/i.test(farmText)) subcategory = 'Apple Picking';
      else if (/sunflower/i.test(farmText)) subcategory = 'Sunflower Field';
      else if (/petting.*zoo/i.test(farmText)) subcategory = 'Petting Zoo';
      else if (/harvest|fall.*fest/i.test(farmText)) subcategory = 'Harvest Festival';

      let cost = 'See website';
      if (event.isFree) cost = 'Free';
      else if (event.price) cost = `$${event.price}`;

      // Link event to farm venue (activity) by generating the same ID format
      const farmActivityId = `farm-${stateCode}-${venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60)}`;

      // Build event document
      const eventDoc = {
        name: event.name.trim(),
        venue: venueName,
        activityId: farmActivityId,
        eventDate: normalizedDate,
        date: parsedDate,
        startTime: extractTime(event.eventDate),
        endTime: event.endDate ? extractTime(event.endDate) : '',
        description: (event.description || `Family farm event in ${city || stateObj.name}`).substring(0, 2000),
        address, city, state: stateCode, zipCode: zip,
        geohash,
        location: coords ? {
          name: event.venue || event.name.trim(),
          city, state: stateCode, zipCode: zip, address,
          latitude: coords.lat || coords.latitude,
          longitude: coords.lon || coords.longitude,
          coordinates: { latitude: coords.lat || coords.latitude, longitude: coords.lon || coords.longitude }
        } : { name: event.venue || event.name.trim(), city, state: stateCode, zipCode: zip, address },
        parentCategory: 'Outdoor & Nature',
        displayCategory: 'Outdoor & Nature',
        subcategory,
        ageRange: 'All Ages',
        cost,
        url: event.url || '',
        imageUrl: event.image || '',
        metadata: {
          sourceName: `Farm Events in ${stateObj.name}`,
          sourceUrl: event.url || '',
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          platform: 'farm-events-aggregator',
          state: stateCode,
          category: 'Outdoor & Nature'
        }
      };

      try {
        await db.collection('events').add(eventDoc);
      } catch (saveErr) {
        // If foreign key constraint fails (activity doesn't exist), retry without activity_id
        if (saveErr.message?.includes('activity_id_fkey') || saveErr.message?.includes('foreign key constraint')) {
          delete eventDoc.activityId;
          await db.collection('events').add(eventDoc);
        } else {
          throw saveErr;
        }
      }
      process.stdout.write(`    ✅ ${event.name.substring(0, 50)}\n`);
      saved++;

    } catch (err) {
      if (err.message?.includes('Skipping')) { skipped++; continue; }
      console.error(`    ❌ Failed: ${event.name}: ${err.message}`);
      failed++;
    }
  }

  return { saved, skipped, failed };
}


// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function scrapeFarmsForState(browser, stateObj, options = {}) {
  const page = await createStealthPage(browser);
  let farmVenueResult = { saved: 0, skipped: 0 };
  let farmEventResult = { saved: 0, skipped: 0, failed: 0 };
  let farms = [];

  try {
    // Source 1: PickYourOwn.org farm venues (activities table)
    // Always scrape the farm list (we need website URLs for Source 2),
    // but only SAVE venues when not in events-only mode.
    farms = await scrapePickYourOwnState(page, stateObj);
    if (!options.eventsOnly) {
      farmVenueResult = await saveFarmVenues(stateObj, farms);
      console.log(`    🌾 Venues: ${farmVenueResult.saved} saved | ${farmVenueResult.skipped} skipped`);
    } else {
      console.log(`    🌾 Loaded ${farms.length} farms (events-only mode, not saving venues)`);
    }

    // Source 2: Visit farm websites for real event details
    if (!options.farmsOnly) {
      const websiteEvents = await scrapeFarmWebsiteEvents(page, stateObj, farms);

      // Source 3: Eventbrite (supplemental)
      const ebEvents = await scrapeEventbriteFarmEvents(page, stateObj);

      const allEvents = [...websiteEvents, ...ebEvents];
      console.log(`    📊 Total raw farm events: ${allEvents.length} (${websiteEvents.length} from websites, ${ebEvents.length} from Eventbrite)`);
      farmEventResult = await saveFarmEvents(stateObj, allEvents);
      console.log(`    🎫 Events: ${farmEventResult.saved} saved | ${farmEventResult.skipped} skipped | ${farmEventResult.failed} failed`);
    }

  } finally {
    await page.close();
  }

  return { venues: farmVenueResult, events: farmEventResult };
}

async function main() {
  const args = process.argv.slice(2);
  const isFullMode = args.includes('--full');
  const eventsOnly = args.includes('--events-only');
  const farmsOnly = args.includes('--farms-only');
  const stateArg = args.find((a, i) => args[i - 1] === '--state');

  let statesToScrape;
  if (stateArg) {
    const match = STATES.find(s => s.code === stateArg.toUpperCase());
    if (!match) { console.error(`Unknown state: ${stateArg}`); process.exit(1); }
    statesToScrape = [match];
  } else if (isFullMode) {
    statesToScrape = STATES;
  } else {
    // Test mode: VA, MD, PA
    statesToScrape = STATES.filter(s => ['VA', 'MD', 'PA'].includes(s.code));
  }

  console.log('\n======================================================================');
  console.log('🌾  EASTERN US FAMILY FARMS SCRAPER');
  console.log('======================================================================');
  console.log(`📍 States: ${statesToScrape.map(s => s.code).join(', ')}`);
  console.log(`📊 Mode: ${isFullMode ? 'FULL' : stateArg ? `SINGLE (${stateArg.toUpperCase()})` : 'TEST'}`);
  console.log(`📡 Sources: ${farmsOnly ? 'PickYourOwn.org only' : eventsOnly ? 'Farm websites + Eventbrite only' : 'PickYourOwn.org + Farm websites + Eventbrite'}`);
  console.log('======================================================================\n');

  let browser = await launchBrowser();
  const startTime = Date.now();

  let totalVenuesSaved = 0, totalVenuesSkipped = 0;
  let totalEventsSaved = 0, totalEventsSkipped = 0, totalEventsFailed = 0;

  try {
    for (let i = 0; i < statesToScrape.length; i++) {
      const state = statesToScrape[i];
      console.log(`\n────────────────────────────────────────────────────────────`);
      console.log(`📍 [${i + 1}/${statesToScrape.length}] ${state.name} (${state.code})`);
      console.log(`────────────────────────────────────────────────────────────`);

      const result = await scrapeFarmsForState(browser, state, { eventsOnly, farmsOnly });

      totalVenuesSaved += result.venues.saved;
      totalVenuesSkipped += result.venues.skipped;
      totalEventsSaved += result.events.saved;
      totalEventsSkipped += result.events.skipped;
      totalEventsFailed += result.events.failed;

      console.log(`    ✅ Saved: ${result.venues.saved} venues + ${result.events.saved} events | ⏭️ Skipped: ${result.venues.skipped + result.events.skipped} | ❌ Failed: ${result.events.failed}`);

      // Restart browser every 10 states to prevent memory issues
      if ((i + 1) % 10 === 0 && i + 1 < statesToScrape.length) {
        console.log('\n🔄 Restarting browser to prevent memory issues...');
        await browser.close();
        browser = await launchBrowser();
      }
    }
  } finally {
    await browser.close();
  }

  const duration = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log('\n======================================================================');
  console.log('✅ FARMS SCRAPER COMPLETE');
  console.log(`   States: ${statesToScrape.length}`);
  console.log(`   Farm venues saved: ${totalVenuesSaved}`);
  console.log(`   Farm venues skipped: ${totalVenuesSkipped}`);
  console.log(`   Farm events saved: ${totalEventsSaved}`);
  console.log(`   Farm events skipped: ${totalEventsSkipped}`);
  console.log(`   Farm events failed: ${totalEventsFailed}`);
  console.log(`   Duration: ${duration} minutes`);
  console.log('======================================================================\n');

  // Log scraper result
  try {
    await logScraperResult({
      scraperName: SCRAPER_NAME,
      eventsFound: totalVenuesSaved + totalEventsSaved,
      eventsSaved: totalVenuesSaved + totalEventsSaved,
      eventsSkipped: totalVenuesSkipped + totalEventsSkipped,
      errors: totalEventsFailed,
      duration: parseFloat(duration),
    });
  } catch (_) {}
}

// Cloud function export
async function scrapeFarmsEasternUSCloudFunction() {
  process.argv.push('--full');
  await main();
}

module.exports = { scrapeFarmsEasternUSCloudFunction };

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
