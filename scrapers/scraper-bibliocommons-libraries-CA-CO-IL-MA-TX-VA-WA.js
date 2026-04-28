#!/usr/bin/env node

/**
 * BIBLIOCOMMONS MULTI-LIBRARY SCRAPER
 *
 * Scrapes events from libraries using BiblioCommons platform
 *
 * COVERAGE (41 library systems across 22 states):
 *
 * AZ (1 library - 1M people):
 * - Pima County Public Library (Tucson) (1M)
 *
 * CA (7 libraries - 7.1M people):
 * - San Jose Public Library (1M)
 * - Oakland Public Library (440K)
 * - Santa Clara County Library District (1.9M)
 * - Contra Costa County Library (1.146M)
 * - Alameda County Library (1.64M)
 * - San Mateo County Libraries (765K)
 * - San Diego County Library (1.2M)
 *
 * CO (2 libraries - 544K people):
 * - Arapahoe Libraries (210K)
 * - Jefferson County Public Library (334K)
 *
 * CT (1 library):
 * - Hartford Public Library
 *
 * GA (1 library - 1M people):
 * - Fulton County Library System (1M)
 *
 * IL (3 libraries - 275K people):
 * - Chicago Public Library
 * - Aurora Public Library (200K)
 * - Evanston Public Library (75K)
 *
 * IN (1 library):
 * - Indianapolis Public Library
 *
 * KY (1 library):
 * - Kenton County Public Library
 *
 * MA (2 libraries):
 * - Boston Public Library
 * - Lawrence Public Library
 *
 * MI (1 library - 200K people):
 * - Grand Rapids Public Library (200K)
 *
 * MN (3 libraries - 1.8M+ people):
 * - Hennepin County Library (Minneapolis) (1.26M)
 * - St. Paul Public Library (545K)
 * - Ramsey County Library (Roseville)
 *
 * MO (1 library - 280K people):
 * - St. Louis Public Library (280K)
 *
 * NC (1 library - 900K people):
 * - Charlotte Mecklenburg Library (900K)
 *
 * OH (3 libraries):
 * - Cincinnati & Hamilton County Public Library
 * - Cleveland Public Library
 * - Cuyahoga County Public Library
 *
 * TX (4 libraries - 6.3M people):
 * - Harris County Public Library (5M)
 * - Austin Public Library (993K)
 * - Frisco Public Library (200K)
 * - Denton Public Library (150K)
 *
 * VA (1 library):
 * - Central Rappahannock Regional Library
 *
 * WA (7 libraries - 2.38M people):
 * - Seattle Public Library
 * - King County Library System
 * - Tacoma Public Library
 * - Sno-Isle Libraries (750K)
 * - Kitsap Regional Library (260K)
 * - Fort Vancouver Regional Library (500K)
 * - Timberland Regional Library (380K)
 *
 * WI (2 libraries):
 * - Madison Public Library
 * - Kenosha Public Library
 *
 * NJ (1 library - 450K people):
 * - Burlington County Library System (450K)
 *
 * NY (3 libraries - 8.4M people):
 * - New York Public Library (3.5M) (NEW)
 * - Brooklyn Public Library (2.6M) (NEW)
 * - Queens Public Library (2.3M) (NEW)
 *
 * Total: 44 active libraries serving ~40M+ people
 *
 * Usage:
 *   node functions/scrapers/scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// BiblioCommons Library Systems
const LIBRARY_SYSTEMS = [
  // ARIZONA (1 library)
  {
    name: 'Pima County Public Library',
    url: 'https://pima.bibliocommons.com/v2/events',
    county: 'Pima',
    state: 'AZ',
    website: 'https://www.library.pima.gov',
    city: 'Tucson',
    zipCode: '85701'
  },

  // CALIFORNIA (6 libraries)
  {
    name: 'San Jose Public Library',
    url: 'https://sjpl.bibliocommons.com/v2/events',
    county: 'Santa Clara',
    state: 'CA',
    website: 'https://www.sjpl.org',
    city: 'San Jose',
    zipCode: '95113'
  },
  {
    name: 'Oakland Public Library',
    url: 'https://oaklandlibrary.bibliocommons.com/v2/events',
    county: 'Alameda',
    state: 'CA',
    website: 'https://oaklandlibrary.org',
    city: 'Oakland',
    zipCode: '94612'
  },
  {
    name: 'Santa Clara County Library District',
    url: 'https://sccl.bibliocommons.com/v2/events',
    county: 'Santa Clara',
    state: 'CA',
    website: 'https://sccld.org',
    city: 'Gilroy',
    zipCode: '95020'
  },
  {
    name: 'Contra Costa County Library',
    url: 'https://ccclib.bibliocommons.com/v2/events',
    county: 'Contra Costa',
    state: 'CA',
    website: 'https://ccclib.org',
    city: 'Pleasant Hill',
    zipCode: '94523'
  },
  {
    name: 'Alameda County Library',
    url: 'https://aclibrary.bibliocommons.com/v2/events',
    county: 'Alameda',
    state: 'CA',
    website: 'https://aclibrary.org',
    city: 'Fremont',
    zipCode: '94536'
  },
  {
    name: 'San Mateo County Libraries',
    url: 'https://smcl.bibliocommons.com/v2/events',
    county: 'San Mateo',
    state: 'CA',
    website: 'https://smcl.org',
    city: 'San Mateo',
    zipCode: '94402'
  },
  {
    name: 'San Diego County Library',
    url: 'https://sdcl.bibliocommons.com/v2/events',
    county: 'San Diego',
    state: 'CA',
    website: 'https://www.sdcl.org',
    city: 'San Diego',
    zipCode: '92123'
  },
  {
    name: 'San Diego Public Library',
    url: 'https://sandiego.bibliocommons.com/v2/events',
    county: 'San Diego',
    state: 'CA',
    website: 'https://www.sandiego.gov/public-library',
    city: 'San Diego',
    zipCode: '92101'
  },

  // COLORADO (2 libraries)
  {
    name: 'Arapahoe Libraries',
    url: 'https://arapahoelibraries.bibliocommons.com/v2/events',
    county: 'Arapahoe',
    state: 'CO',
    website: 'https://arapahoelibraries.org',
    city: 'Englewood',
    zipCode: '80110'
  },
  {
    name: 'Jefferson County Public Library',
    url: 'https://jeffcolibrary.bibliocommons.com/events/search/index',
    county: 'Jefferson',
    state: 'CO',
    website: 'https://jeffcolibrary.org',
    city: 'Lakewood',
    zipCode: '80226'
  },

  // CONNECTICUT (1 library)
  {
    name: 'Hartford Public Library',
    url: 'https://hartfordlibrary.bibliocommons.com/v2/events',
    county: 'Hartford',
    state: 'CT',
    website: 'https://www.hplct.org',
    city: 'Hartford',
    zipCode: '06103'
  },

  // GEORGIA (1 library)
  {
    name: 'Fulton County Library System',
    url: 'https://fulcolibrary.bibliocommons.com/v2/events',
    county: 'Fulton',
    state: 'GA',
    website: 'https://www.fulcolibrary.org',
    city: 'Atlanta',
    zipCode: '30303'
  },

  // ILLINOIS (3 libraries)
  {
    name: 'Chicago Public Library',
    url: 'https://chipublib.bibliocommons.com/v2/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://www.chipublib.org',
    city: 'Chicago',
    zipCode: '60602'
  },
  {
    name: 'Aurora Public Library',
    url: 'https://aurora.bibliocommons.com/v2/events',
    county: 'Kane',
    state: 'IL',
    website: 'https://www.aurorapubliclibrary.org',
    city: 'Aurora',
    zipCode: '60505'
  },
  {
    name: 'Evanston Public Library',
    url: 'https://evanstonlibrary.bibliocommons.com/v2/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://epl.org',
    city: 'Evanston',
    zipCode: '60201'
  },

  // INDIANA (1 library)
  {
    name: 'Indianapolis Public Library',
    url: 'https://indypl.bibliocommons.com/v2/events',
    county: 'Marion',
    state: 'IN',
    website: 'https://www.indypl.org',
    city: 'Indianapolis',
    zipCode: '46204'
  },

  // KENTUCKY (1 library)
  {
    name: 'Kenton County Public Library',
    url: 'https://kentonlibrary.bibliocommons.com/v2/events',
    county: 'Kenton',
    state: 'KY',
    website: 'https://www.kentonlibrary.org',
    city: 'Covington',
    zipCode: '41011'
  },

  // MASSACHUSETTS (2 libraries)
  {
    name: 'Boston Public Library',
    url: 'https://bpl.bibliocommons.com/v2/events',
    county: 'Suffolk',
    state: 'MA',
    website: 'https://www.bpl.org',
    city: 'Boston',
    zipCode: '02116'
  },
  {
    name: 'Lawrence Public Library',
    url: 'https://lawrence.bibliocommons.com/v2/events',
    county: 'Essex',
    state: 'MA',
    website: 'https://www.lawrencefreelibrary.org',
    city: 'Lawrence',
    zipCode: '01840'
  },

  // MICHIGAN (1 library)
  {
    name: 'Grand Rapids Public Library',
    url: 'https://grpl.bibliocommons.com/v2/events',
    county: 'Kent',
    state: 'MI',
    website: 'https://www.grpl.org',
    city: 'Grand Rapids',
    zipCode: '49503'
  },

  // MINNESOTA (3 libraries)
  {
    name: 'Hennepin County Library',
    url: 'https://hclib.bibliocommons.com/v2/events',
    county: 'Hennepin',
    state: 'MN',
    website: 'https://www.hclib.org',
    city: 'Minneapolis',
    zipCode: '55401'
  },
  {
    name: 'St. Paul Public Library',
    url: 'https://sppl.bibliocommons.com/v2/events',
    county: 'Ramsey',
    state: 'MN',
    website: 'https://sppl.org',
    city: 'St. Paul',
    zipCode: '55102'
  },
  {
    name: 'Ramsey County Library',
    url: 'https://rclreads.bibliocommons.com/v2/events',
    county: 'Ramsey',
    state: 'MN',
    website: 'https://www.rclreads.org',
    city: 'Roseville',
    zipCode: '55113'
  },

  // MISSOURI (1 library)
  {
    name: 'St. Louis Public Library',
    url: 'https://slpl.bibliocommons.com/v2/events',
    county: 'St. Louis City',
    state: 'MO',
    website: 'https://www.slpl.org',
    city: 'St. Louis',
    zipCode: '63103'
  },

  // NEW JERSEY (1 library)
  {
    name: 'Burlington County Library System',
    url: 'https://bclsnj.bibliocommons.com/v2/events',
    county: 'Burlington',
    state: 'NJ',
    website: 'https://bcls.lib.nj.us',
    city: 'Westampton',
    zipCode: '08060'
  },

  // NEW YORK - REMOVED (libraries migrated away from BiblioCommons)
  // NYPL, Brooklyn, Queens now use different platforms
  // NY is covered by LibCal scraper for upstate/suburban areas

  // NORTH CAROLINA (1 library)
  {
    name: 'Charlotte Mecklenburg Library',
    url: 'https://cmlibrary.bibliocommons.com/v2/events',
    county: 'Mecklenburg',
    state: 'NC',
    website: 'https://www.cmlibrary.org',
    city: 'Charlotte',
    zipCode: '28202'
  },

  // OHIO (3 libraries)
  {
    name: 'Cincinnati & Hamilton County Public Library',
    url: 'https://cincinnatilibrary.bibliocommons.com/v2/events',
    county: 'Hamilton',
    state: 'OH',
    website: 'https://www.cincinnatilibrary.org',
    city: 'Cincinnati',
    zipCode: '45202'
  },
  {
    name: 'Cleveland Public Library',
    url: 'https://cpl.bibliocommons.com/v2/events',
    county: 'Cuyahoga',
    state: 'OH',
    website: 'https://cpl.org',
    city: 'Cleveland',
    zipCode: '44114'
  },
  {
    name: 'Cuyahoga County Public Library',
    url: 'https://cuyahoga.bibliocommons.com/v2/events',
    county: 'Cuyahoga',
    state: 'OH',
    website: 'https://cuyahogalibrary.org',
    city: 'Parma',
    zipCode: '44134'
  },

  // TEXAS (4 libraries)
  {
    name: 'Harris County Public Library',
    url: 'https://hcpl.bibliocommons.com/v2/events',
    county: 'Harris',
    state: 'TX',
    website: 'https://hcpl.net',
    city: 'Houston',
    zipCode: '77002'
  },
  // REMOVED: Austin Public Library - uses custom Drupal, not BiblioCommons
  // {
  //   name: 'Austin Public Library',
  //   url: 'https://library.austintexas.gov/events',
  //   county: 'Travis',
  //   state: 'TX',
  //   website: 'https://library.austintexas.gov',
  //   city: 'Austin',
  //   zipCode: '78701'
  // },
  {
    name: 'Frisco Public Library',
    url: 'https://friscolibrary.bibliocommons.com/v2/events',
    county: 'Collin',
    state: 'TX',
    website: 'https://friscolibrary.com',
    city: 'Frisco',
    zipCode: '75034'
  },
  {
    name: 'Denton Public Library',
    url: 'https://denton.bibliocommons.com/v2/events',
    county: 'Denton',
    state: 'TX',
    website: 'https://www.cityofdenton.com/government/departments/library',
    city: 'Denton',
    zipCode: '76201'
  },

  // VIRGINIA (1 library)
  {
    name: 'Central Rappahannock Regional Library',
    url: 'https://librarypoint.bibliocommons.com/v2/events',
    county: 'Fredericksburg',
    state: 'VA',
    website: 'https://www.librarypoint.org',
    city: 'Fredericksburg',
    zipCode: '22401'
  },

  // WASHINGTON (7 libraries)
  // REMOVED: Seattle Public Library - 403 Forbidden, events disabled
  // {
  //   name: 'Seattle Public Library',
  //   url: 'https://seattle.bibliocommons.com/v2/events',
  //   county: 'King',
  //   state: 'WA',
  //   website: 'https://www.spl.org',
  //   city: 'Seattle',
  //   zipCode: '98104'
  // },
  {
    name: 'King County Library System',
    url: 'https://kcls.bibliocommons.com/v2/events',
    county: 'King',
    state: 'WA',
    website: 'https://kcls.org',
    city: 'Issaquah',
    zipCode: '98027'
  },
  {
    name: 'Tacoma Public Library',
    url: 'https://tacoma.bibliocommons.com/v2/events',
    county: 'Pierce',
    state: 'WA',
    website: 'https://www.tacomalibrary.org',
    city: 'Tacoma',
    zipCode: '98402'
  },
  {
    name: 'Sno-Isle Libraries',
    url: 'https://sno-isle.bibliocommons.com/v2/events',
    county: 'Snohomish',
    state: 'WA',
    website: 'https://www.sno-isle.org',
    city: 'Marysville',
    zipCode: '98270'
  },
  {
    name: 'Kitsap Regional Library',
    url: 'https://krl.bibliocommons.com/v2/events',
    county: 'Kitsap',
    state: 'WA',
    website: 'https://www.krl.org',
    city: 'Bremerton',
    zipCode: '98337'
  },
  {
    name: 'Fort Vancouver Regional Library',
    url: 'https://fvrlibraries.bibliocommons.com/v2/events',
    county: 'Clark',
    state: 'WA',
    website: 'https://www.fvrl.org',
    city: 'Vancouver',
    zipCode: '98660'
  },
  {
    name: 'Timberland Regional Library',
    url: 'https://timberland.bibliocommons.com/v2/events',
    county: 'Thurston',
    state: 'WA',
    website: 'https://www.trl.org',
    city: 'Olympia',
    zipCode: '98501'
  },

  // WISCONSIN (2 libraries)
  {
    name: 'Madison Public Library',
    url: 'https://madisonpubliclibrary.bibliocommons.com/v2/events',
    county: 'Dane',
    state: 'WI',
    website: 'https://www.madisonpubliclibrary.org',
    city: 'Madison',
    zipCode: '53703'
  },
  {
    name: 'Kenosha Public Library',
    url: 'https://mykpl.bibliocommons.com/v2/events',
    county: 'Kenosha',
    state: 'WI',
    website: 'https://www.mykpl.info',
    city: 'Kenosha',
    zipCode: '53140'
  }
];

// Note: geocodeAddress is now imported from geocoding-helper.js with fallback support

// Parse age range from audience string
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults?:\s*18/i) || lowerText.match(/adults? only/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';

  return 'All Ages';
}

// ─── API-FIRST APPROACH ���────────────────────────────────────────────────────
// BiblioCommons exposes a gateway API at gateway.bibliocommons.com that returns
// structured JSON with events, locations (with coordinates!), and audiences.
// This is far more reliable than Puppeteer for their React SPA.
async function tryApiScrape(library) {
  // Extract library slug from URL: https://{slug}.bibliocommons.com/v2/events
  const slugMatch = library.url.match(/https?:\/\/([^.]+)\.bibliocommons\.com/);
  if (!slugMatch) return null;
  const slug = slugMatch[1];

  try {
    const events = [];
    let page = 1;
    const limit = 50;
    let totalPages = 1;

    while (page <= totalPages && page <= 10) { // Cap at 10 pages (500 events)
      const apiUrl = `https://gateway.bibliocommons.com/v2/libraries/${slug}/events?page=${page}&limit=${limit}`;
      const response = await axios.get(apiUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      if (!data || !data.events || !data.events.items || data.events.items.length === 0) break;

      // Update total pages from pagination
      if (data.events.pagination) {
        totalPages = Math.min(data.events.pagination.pages || 1, 10);
      }

      const entities = data.entities || {};
      const eventEntities = entities.events || {};
      const locations = entities.locations || {};
      const audiences = entities.eventAudiences || {};

      for (const eventId of data.events.items) {
        const eventData = eventEntities[eventId];
        if (!eventData || !eventData.definition) continue;
        const def = eventData.definition;

        // Skip cancelled events
        if (def.isCancelled) continue;

        // Build audience string from audience IDs
        let audienceStr = '';
        if (def.audienceIds && Array.isArray(def.audienceIds)) {
          audienceStr = def.audienceIds
            .map(id => audiences[id] ? audiences[id].name : '')
            .filter(Boolean)
            .join(', ');
        }

        // Get location info
        let venue = '';
        let locAddress = '';
        let locCity = library.city;
        let locState = library.state;
        let locZip = library.zipCode;
        let locLat = null;
        let locLng = null;

        if (def.branchLocationId && locations[def.branchLocationId]) {
          const loc = locations[def.branchLocationId];
          venue = loc.name || '';
          if (loc.address) {
            locAddress = [loc.address.number, loc.address.street].filter(Boolean).join(' ');
            locCity = loc.address.city || locCity;
            locState = loc.address.state || locState;
            locZip = loc.address.zip || locZip;
          }
          if (loc.mapLocation && loc.mapLocation.centrePoint) {
            locLat = loc.mapLocation.centrePoint.lat;
            locLng = loc.mapLocation.centrePoint.lng;
          }
        }

        // Build date string from start/end
        let eventDate = '';
        let startTime = '';
        let endTime = '';
        if (def.start) {
          // Format: "2026-06-26T10:00" (local time)
          const startDate = new Date(def.start + ':00'); // Append seconds for parsing
          eventDate = startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        if (def.end) {
          const endDate = new Date(def.end + ':00');
          endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        if (startTime) {
          eventDate += ` ${startTime}`;
          if (endTime) eventDate += ` - ${endTime}`;
        }

        // Clean description (strip HTML tags)
        const description = (def.description || '').replace(/<[^>]+>/g, '').trim();

        // Build event URL
        const eventUrl = `https://${slug}.bibliocommons.com/v2/events/${eventId}`;

        events.push({
          name: (def.title || '').trim(),
          eventDate: eventDate,
          venue: venue || library.name,
          description: description.substring(0, 1000),
          url: eventUrl,
          audience: audienceStr,
          address: locAddress,
          city: locCity,
          state: locState,
          zipCode: locZip,
          lat: locLat,
          lng: locLng,
          startTime: startTime,
          endTime: endTime,
          isVirtual: def.isVirtual || false
        });
      }

      page++;
      // Rate limit between pages
      if (page <= totalPages) await new Promise(r => setTimeout(r, 500));
    }

    if (events.length === 0) return null;
    console.log(`   📡 API returned ${events.length} events (${totalPages} pages)`);
    return events;
  } catch (error) {
    console.log(`   ⚠ API scrape failed (${error.message}) — falling back to Puppeteer`);
    return null;
  }
}

// Scrape events from BiblioCommons library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // ── TRY API FIRST ────���─────────────────────────────────────────────────
  const apiEvents = await tryApiScrape(library);
  if (apiEvents && apiEvents.length > 0) {
    console.log(`   ✓ Using API data (${apiEvents.length} events)`);

    for (const event of apiEvents) {
      try {
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);
        if (ageRange === 'Adults') { skipped++; continue; }

        // Use coordinates from API if available, otherwise geocode
        let coordinates = null;
        if (event.lat && event.lng) {
          coordinates = { latitude: event.lat, longitude: event.lng };
        } else if (event.venue && event.venue.trim()) {
          const countyPart = `, ${library.county} County`;
          const fullAddress = event.address
            ? `${event.address}, ${event.city}, ${event.state} ${event.zipCode}`
            : `${event.venue}, ${library.city}${countyPart}, ${library.state}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            state: event.state || library.state,
            county: library.county,
            venueName: event.venue,
            sourceName: library.name
          });
        } else {
          coordinates = await geocodeWithFallback(`${library.city}, ${library.state}`, {
            city: library.city, zipCode: library.zipCode,
            state: library.state, county: library.county, sourceName: library.name
          });
        }

        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name, description: event.description
        });

        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: event.eventDate,
          parentCategory, displayCategory, subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: event.description || '',
          moreInfo: event.audience || '',
          location: {
            name: event.venue || library.name,
            address: event.address || '',
            city: event.city || library.city,
            state: event.state || library.state,
            zipCode: event.zipCode || library.zipCode,
            coordinates: coordinates
          },
          contact: { website: event.url || library.website, phone: '' },
          url: event.url || library.website,
          metadata: {
            source: 'BiblioCommons Scraper',
            scraperName: 'BiblioCommons-' + library.state,
            sourceName: library.name,
            county: library.county,
            state: library.state,
            category: 'Storytimes & Library',
            scrapedAt: new Date().toISOString(),
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: { isFree: true, ageRange: ageRange }
        };

        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', library.name)
          .limit(1)
          .get();

        if (existing.empty) {
          const activityId = await linkEventToVenue(eventDoc);
          if (activityId) { eventDoc.activityId = activityId; }
          await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    return { imported, failed, skipped };
  }
  // ── END API-FIRST PATH ─────────────────────────────────────────────────

  console.log('   ⚙ Falling back to Puppeteer scraping');

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Wait for BiblioCommons to load events - wait for JS to render
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced from 5000ms

    // Try to wait for event content to appear
    await page.waitForSelector('[class*="event"], [class*="Event"], .listItem', { timeout: 10000 }).catch(() => {
      console.log('   Note: Event selector timeout - page may have no events');
    });

    // Extract events using BiblioCommons CSS selectors
    const events = await page.evaluate(() => {
      const results = [];

      // BiblioCommons uses specific containers for event lists
      // First, try to find the main events container
      const listContainers = [
        '.events-search-results',
        '.cp-events-search-page',
        '.cp-events-list',
        '.events-list',
        '[class*="eventsList"]',
        '[class*="events-list"]',
        '[class*="search-results"]',
        'main',
        '#main-content'
      ];

      let container = null;
      for (const selector of listContainers) {
        container = document.querySelector(selector);
        if (container) break;
      }

      // If no container found, use main content area
      if (!container) {
        container = document.querySelector('main') || document.querySelector('#main-content') || document.body;
      }

      // Now find event items within the container
      // BiblioCommons uses cp-events-search-item for event cards
      const eventSelectors = [
        '.cp-events-search-item',
        '.cp-event-item',
        '.cp-event-card',
        '.events-search-item',
        '[class*="events-search-item"]',
        '[class*="event-item"]',
        '[class*="event-card"]'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        eventElements = container.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      // Fallback: look for event links with hex IDs (BiblioCommons format)
      if (eventElements.length === 0) {
        const eventLinks = container.querySelectorAll('a[href*="/events/"]');
        const containers = new Set();

        eventLinks.forEach(link => {
          const href = link.getAttribute('href');
          // Match BiblioCommons event IDs (24-char hex strings)
          if (!href.match(/\/events\/[a-f0-9]{20,}/i)) return;

          let parent = link.parentElement;
          // Go up to find a meaningful container
          for (let i = 0; i < 5 && parent && parent !== container; i++) {
            if (parent.tagName === 'DIV' || parent.tagName === 'LI' || parent.tagName === 'ARTICLE') {
              const className = parent.className || '';
              if (className.includes('item') || className.includes('card') || className.includes('event')) {
                containers.add(parent);
                break;
              }
            }
            parent = parent.parentElement;
          }
        });
        eventElements = Array.from(containers);
      }

      eventElements.forEach(el => {
        try {
          // Look for event title - try multiple selectors
          const titleSelectors = [
            '.cp-event-title',
            '.event-title',
            '[class*="title"] a',
            'h2 a', 'h3 a', 'h4 a',
            'a[href*="/events/"]'
          ];

          let titleEl = null;
          let title = '';
          for (const selector of titleSelectors) {
            titleEl = el.querySelector(selector);
            if (titleEl) {
              title = titleEl.textContent.trim();
              if (title) break;
            }
          }

          if (!title) return;

          // Extract link
          const linkEl = el.querySelector('a[href*="/events/"]');
          const url = linkEl ? linkEl.href : '';

          // Get all text content
          const fullText = el.textContent;

          // Extract date and time - look for date elements first
          let eventDate = '';
          const dateEl = el.querySelector('.cp-event-date, .event-date, [class*="date"], time');
          if (dateEl) {
            eventDate = dateEl.textContent.trim();

            // Clean up BiblioCommons date format
            // Handle "All day, Sunday, March 29 to Sunday, May 03from March 29, 2026 to May 3, 2026"
            // Priority: extract the "from X to Y" portion if it exists (cleaner format)
            if (eventDate.includes('from')) {
              const fromMatch = eventDate.match(/from\s+(.+?)(?:\s+to\s+(.+?))?$/i);
              if (fromMatch) {
                // Extract the "from X to Y" portion
                eventDate = fromMatch[0].substring(5).trim(); // Remove "from " prefix
              }
            }

            // Strip "All day, " prefix and weekday prefixes
            eventDate = eventDate.replace(/^all\s+day,?\s*/i, '');

            // If eventDate contains "to" (range), keep it as-is for the normalization function
            // Otherwise, remove weekday names that precede the date
            if (!eventDate.includes(' to ')) {
              // Remove weekday names (e.g., "Sunday, March 29" -> "March 29")
              eventDate = eventDate.replace(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, '');
            }

            eventDate = eventDate.trim();
          }

          // Fallback to regex patterns
          if (!eventDate) {
            const datePatterns = [
              /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i,
              /\w{3,9}\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/
            ];

            for (const pattern of datePatterns) {
              const match = fullText.match(pattern);
              if (match) {
                eventDate = match[0];
                break;
              }
            }
          }

          // Extract time
          let time = '';
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*(?:to|–|-)\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                           fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
          if (timeMatch) time = timeMatch[0];

          // Extract audience/age range
          let audience = '';
          const audienceEl = el.querySelector('.cp-event-audience, .event-tags, [class*="audience"], [class*="tags"]') ||
                            el.querySelector('a[href*="audiences="]');
          if (audienceEl) {
            audience = audienceEl.textContent.trim();
          }

          // Extract location/branch
          let location = '';
          const locationEl = el.querySelector('.cp-event-location, .event-location, [class*="location"], [class*="branch"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
            // Remove "Event location:" label if present
            location = location.replace(/Event location:\s*/gi, '').trim();
            // If location was duplicated (e.g., "BascomEvent location: Bascom" -> "Bascom"), clean it up
            const dupMatch = location.match(/^(.+?)Event location:\s*\1$/i);
            if (dupMatch) {
              location = dupMatch[1].trim();
            }
          } else {
            const locationLinks = el.querySelectorAll('a');
            for (const link of locationLinks) {
              const href = link.getAttribute('href');
              if (href && (href.includes('locations=') || href.includes('branch'))) {
                location = link.textContent.trim();
                break;
              }
            }
          }

          // Extract description
          const descEl = el.querySelector('.cp-event-description, .event-description, p');
          const description = descEl ? descEl.textContent.trim() : '';

          // Only add if we have at least title (date might be in a separate element)
          if (title) {
            const rawDate = eventDate ? (time && !eventDate.includes(time) ? `${eventDate} ${time}` : eventDate) : '';

            results.push({
              name: title,
              eventDate: rawDate || 'Date TBD',
              venue: location,
              description: description,
              url: url,
              audience: audience
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // RETRY: BiblioCommons v2 is a React SPA — if no events found, wait longer for hydration
    if (events.length === 0) {
      console.log('   ⚠ No events found — waiting 8s for React SPA hydration then retrying');
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Scroll to trigger lazy rendering
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      events = await page.evaluate(() => {
        const results = [];
        const seen = new Set();

        // Broad link-based extraction: find all event detail links
        const eventLinks = document.querySelectorAll('a[href*="/events/"]');

        eventLinks.forEach(link => {
          const href = link.getAttribute('href') || '';
          const title = link.textContent.trim();
          if (!title || title.length < 3 || title.length > 200) return;
          // Skip navigation/filter links
          if (href.endsWith('/events') || href.endsWith('/events/') || href.includes('/events/search')) return;
          if (seen.has(title)) return;
          seen.add(title);

          // Walk up to find the card container
          let card = link.parentElement;
          for (let i = 0; i < 6 && card; i++) {
            const cn = card.className || '';
            if (cn.includes('item') || cn.includes('card') || cn.includes('event') || cn.includes('list')) break;
            if (card.parentElement) card = card.parentElement;
          }

          const cardText = card ? card.textContent : '';
          // Extract date
          let eventDate = '';
          const dateMatch = cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)/i);
          if (dateMatch) eventDate = dateMatch[1].trim();

          // Extract time
          const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*(?:to|[-–])\s*\d{1,2}:\d{2}\s*(?:am|pm))?)/i);
          const time = timeMatch ? timeMatch[1].trim() : '';
          const rawDate = eventDate ? (time ? `${eventDate} ${time}` : eventDate) : 'Date TBD';

          results.push({
            name: title,
            eventDate: rawDate,
            venue: '',
            description: '',
            url: href.startsWith('http') ? href : (href.startsWith('/') ? window.location.origin + href : ''),
            audience: ''
          });
        });
        return results;
      });
      console.log(`   After SPA retry: found ${events.length} events`);
    }

    // Process each event
    for (const event of events) {
      try {
        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to geocode location with fallback
        let coordinates = null;
        if (event.venue) {
          const fullAddress = `${event.venue}, ${library.city}, ${library.county} County, ${library.state}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            venueName: event.venue,
            sourceName: library.name
          });
        } else {
          // If no venue specified, use library's main location
          coordinates = await geocodeWithFallback(`${library.city}, ${library.state}`, {
            city: library.city,
            zipCode: library.zipCode,
            state: library.state,
            county: library.county,
            sourceName: library.name
          });
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Normalize date format and get Date object for Timestamp
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event: "${event.name}"`);
          console.log(`     Raw date from page: "${event.eventDate}"`);
          console.log(`     Could not normalize to "Month Day, Year" format`);
          skipped++;
          continue;
        }
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'BiblioCommons Scraper',
            scraperName: 'BiblioCommons-' + library.state,
            sourceName: library.name,
            county: library.county,
            state: library.state,
            category: 'Storytimes & Library',
            scrapedAt: new Date().toISOString(),
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Add geohash if we have coordinates
        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', library.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting (reduced from 300ms)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function - now supports state filtering
async function scrapeBiblioCommonsLibraries(stateFilter = null) {
  // Filter libraries by state if specified
  const libraries = stateFilter
    ? LIBRARY_SYSTEMS.filter(lib => lib.state === stateFilter)
    : LIBRARY_SYSTEMS;

  const stateInfo = stateFilter ? `State: ${stateFilter}` : 'All States';
  console.log('\n📚 BIBLIOCOMMONS LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log(`${stateInfo} - ${libraries.length} libraries`);
  console.log('='.repeat(60) + '\n');

  if (libraries.length === 0) {
    console.log(`⚠️ No libraries found for state: ${stateFilter}`);

    // Log scraper stats to database with state-specific name
    const scraperName = stateFilter ? `BiblioCommons-${stateFilter}` : 'BiblioCommons-All';
    await logScraperResult(scraperName, {
      found: 0,
      new: 0,
      duplicates: 0
    }, { dataType: 'events' });

    return { imported: 0, skipped: 0, failed: 0 };
  }

  // Initialize logger with per-site tracking
  const scraperName = stateFilter ? `BiblioCommons-${stateFilter}` : 'BiblioCommons-All';
  const logger = new ScraperLogger(scraperName, 'events', {
    state: stateFilter,
    source: 'bibliocommons'
  });

  const browser = await launchBrowser();

  try {
    for (const library of libraries) {
      // Start tracking this site
      logger.startSite(library.name, library.url, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);

        // Track per-site stats (updates both site AND aggregate totals)
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  // Log to database with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// State-specific wrapper functions for Cloud Functions
async function scrapeBiblioCommonsCA() { return scrapeBiblioCommonsLibraries('CA'); }

// Split CA into two batches to avoid timeout
async function scrapeBiblioCommonsCA1() {
  // Northern CA: San Jose, Oakland, Santa Clara, Contra Costa
  const caLibraries = LIBRARY_SYSTEMS.filter(lib => lib.state === 'CA');
  const batch1 = caLibraries.slice(0, 4);

  console.log('\n📚 BIBLIOCOMMONS CA BATCH 1 SCRAPER');
  console.log('='.repeat(60));
  console.log(`Libraries: ${batch1.map(l => l.name).join(', ')}`);
  console.log('='.repeat(60) + '\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('BiblioCommons-CA-Batch1', 'events', {
    state: 'CA',
    source: 'bibliocommons'
  });

  const browser = await launchBrowser();

  try {
    for (const library of batch1) {
      logger.startSite(library.name, library.url, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  const result = await logger.finish();
  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

async function scrapeBiblioCommonsCA2() {
  // Southern/Central CA: Alameda, San Mateo, San Diego County, San Diego Public
  const caLibraries = LIBRARY_SYSTEMS.filter(lib => lib.state === 'CA');
  const batch2 = caLibraries.slice(4, 8);

  console.log('\n📚 BIBLIOCOMMONS CA BATCH 2 SCRAPER');
  console.log('='.repeat(60));
  console.log(`Libraries: ${batch2.map(l => l.name).join(', ')}`);
  console.log('='.repeat(60) + '\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('BiblioCommons-CA-Batch2', 'events', {
    state: 'CA',
    source: 'bibliocommons'
  });

  const browser = await launchBrowser();

  try {
    for (const library of batch2) {
      logger.startSite(library.name, library.url, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  const result = await logger.finish();
  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}
async function scrapeBiblioCommonsCO() { return scrapeBiblioCommonsLibraries('CO'); }
async function scrapeBiblioCommonsGA() { return scrapeBiblioCommonsLibraries('GA'); }
async function scrapeBiblioCommonsIL() { return scrapeBiblioCommonsLibraries('IL'); }
async function scrapeBiblioCommonsMA() { return scrapeBiblioCommonsLibraries('MA'); }
async function scrapeBiblioCommonsMI() { return scrapeBiblioCommonsLibraries('MI'); }
async function scrapeBiblioCommonsMN() { return scrapeBiblioCommonsLibraries('MN'); }
async function scrapeBiblioCommonsMO() { return scrapeBiblioCommonsLibraries('MO'); }
async function scrapeBiblioCommonsNC() { return scrapeBiblioCommonsLibraries('NC'); }
async function scrapeBiblioCommonsNJ() { return scrapeBiblioCommonsLibraries('NJ'); }
// NY removed - libraries migrated to other platforms
async function scrapeBiblioCommonsOH() { return scrapeBiblioCommonsLibraries('OH'); }
async function scrapeBiblioCommonsTX() { return scrapeBiblioCommonsLibraries('TX'); }
async function scrapeBiblioCommonsVA() { return scrapeBiblioCommonsLibraries('VA'); }
async function scrapeBiblioCommonsWA() { return scrapeBiblioCommonsLibraries('WA'); }
async function scrapeBiblioCommonsWI() { return scrapeBiblioCommonsLibraries('WI'); }
async function scrapeBiblioCommonsAZ() { return scrapeBiblioCommonsLibraries('AZ'); }

// Cloud Function wrapper
async function scrapeBiblioCommonsLibrariesCloudFunction() {
  console.log('\n📚 BiblioCommons Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const stats = await scrapeBiblioCommonsLibraries();
    // Note: logging is handled in scrapeBiblioCommonsLibraries() with state-specific name
    return {
      imported: stats.imported,
      skipped: stats.skipped,
      failed: stats.failed,
      message: 'BiblioCommons libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in BiblioCommons scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeBiblioCommonsLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1)
    });
}

module.exports = {
  scrapeBiblioCommonsLibraries,
  scrapeBiblioCommonsLibrariesCloudFunction,
  // State-specific exports
  scrapeBiblioCommonsAZ,
  scrapeBiblioCommonsCA,
  scrapeBiblioCommonsCA1,  // Northern CA batch
  scrapeBiblioCommonsCA2,  // Southern CA batch
  scrapeBiblioCommonsCO,
  scrapeBiblioCommonsGA,
  scrapeBiblioCommonsIL,
  scrapeBiblioCommonsMA,
  scrapeBiblioCommonsMI,
  scrapeBiblioCommonsMN,
  scrapeBiblioCommonsMO,
  scrapeBiblioCommonsNC,
  scrapeBiblioCommonsNJ,
  // scrapeBiblioCommonsNY removed - libraries migrated
  scrapeBiblioCommonsOH,
  scrapeBiblioCommonsTX,
  scrapeBiblioCommonsVA,
  scrapeBiblioCommonsWA,
  scrapeBiblioCommonsWI
};
