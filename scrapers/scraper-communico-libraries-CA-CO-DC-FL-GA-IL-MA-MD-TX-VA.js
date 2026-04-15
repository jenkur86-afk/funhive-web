#!/usr/bin/env node

/**
 * COMMUNICO LIBRARIES SCRAPER
 *
 * Scrapes events from libraries using Communico platform (HTML method)
 * API requires authentication, so we scrape the HTML pages directly
 *
 * COVERAGE (62 libraries across 24 states):
 *
 * CA (4 libraries - 4.39M people):
 * - Berkeley Public Library (120K)
 * - Glendale Library, Arts & Culture (200K)
 * - LA County Library (3.5M)
 * - Sacramento Public Library (525K)
 *
 * CO (2 libraries - 1.1M people):
 * - Aurora Public Library (380K)
 * - Douglas County Libraries (725K)
 *
 * DC (1 library - 700K people):
 * - DC Public Library (700K)
 *
 * FL (7 libraries - 8.2M people):
 * - Miami-Dade Public Library (2.77M)
 * - Broward County Library (1.98M)
 * - Hillsborough County Public Library Cooperative (1.56M)
 * - Jacksonville Public Library (1.05M)
 * - Pasco County Libraries (590K)
 * - Martin County Library System (165K)
 * - Largo Public Library (100K)
 *
 * GA (4 libraries - 2.276M people):
 * - Gwinnett County Public Library (950K)
 * - DeKalb County Public Library (750K)
 * - Chattahoochee Valley Libraries (Columbus) (325K)
 * - Forsyth County Public Library (Cumming) (251K)
 *
 * IL (4 libraries - 427K people):
 * - Joliet Public Library (147K)
 * - Schaumburg Township District Library (135K)
 * - Champaign Public Library (90K)
 * - Mount Prospect Public Library (55K)
 *
 * IN (3 libraries - 1.54M people):
 * - Indianapolis Public Library (970K)
 * - Evansville Vanderburgh Public Library (290K) (NEW)
 * - Allen County Public Library (407K) (NEW)
 *
 * IA (2 libraries - 201K people):
 * - Cedar Rapids Public Library (134K)
 * - Waterloo Public Library (67K)
 *
 * KY (1 library - 321K people) (NEW):
 * - Lexington Public Library (321K)
 *
 * MA (1 library - 185K people):
 * - Worcester Public Library (185K)
 *
 * MD (9 libraries - 3.5M people):
 * - Baltimore County Public Library (830K)
 * - Montgomery County Public Library (1.06M)
 * - Harford County Public Library (250K)
 * - Calvert Library (92K)
 * - Charles County Public Library (160K)
 * - St. Mary's County Library (113K)
 * - Anne Arundel County Public Library (580K)
 * - Howard County Library System (830K)
 * - Frederick County Public Libraries (240K)
 *
 * NC (2 libraries - 1.2M people) (NEW):
 * - Wake County Public Libraries (1M)
 * - Forsyth County Public Library (200K)
 *
 * NJ (3 libraries - 1.805M people):
 * - Ocean County Library (600K)
 * - Somerset County Library System (345K)
 * - Middlesex County Library (860K)
 *
 * NV (1 library - 2.3M people):
 * - Las Vegas-Clark County Library District (2.3M)
 *
 * NY (3 libraries - 234K people):
 * - Huntington Public Library (175K)
 * - Massapequa Public Library (21K)
 * - Patchogue-Medford Library (38K)
 *
 * OH (3 libraries - 3.0M people):
 * - Columbus Metropolitan Library (2.1M)
 * - Akron-Summit County Public Library (540K)
 * - Toledo Lucas County Public Library (430K)
 *
 * OR (1 library - 820K people):
 * - Multnomah County Library (820K)
 *
 * PA (1 library - 420K people):
 * - Reading Public Library (420K)
 *
 * SC (2 libraries - 1.4M people) (NEW):
 * - Richland Library (500K)
 * - Greenville County Library System (520K)
 *
 * TN (2 libraries - 1.25M people) (NEW):
 * - Nashville Public Library (715K)
 * - Chattanooga Public Library (540K)
 *
 * TX (3 libraries - 511K people):
 * - McAllen Public Library (143K)
 * - Plano Public Library (288K)
 * - Flower Mound Public Library (80K)
 *
 * VA (2 libraries - 830K people):
 * - Loudoun County Public Library (420K)
 * - Prince William Public Library (410K)
 *
 * WA (1 library - 925K people):
 * - Pierce County Library System (925K)
 *
 * WI (1 library - 925K people):
 * - Milwaukee Public Library (925K)
 *
 * Total: 62 libraries serving ~45+ million people
 *
 * Usage:
 *   node functions/scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js
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

// Library Systems using Communico
const LIBRARY_SYSTEMS = [
  // CALIFORNIA (3 libraries)
  {
    name: 'Berkeley Public Library',
    url: 'https://berkeleypubliclibrary.libnet.info/events',
    county: 'Alameda',
    state: 'CA',
    website: 'https://www.berkeleypubliclibrary.org',
    city: 'Berkeley',
    zipCode: '94704'
  },
  {
    name: 'Glendale Library, Arts & Culture',
    url: 'https://glendaleca.libnet.info/events',
    county: 'Los Angeles',
    state: 'CA',
    website: 'https://www.glendaleca.gov/government/departments/library-arts-culture',
    city: 'Glendale',
    zipCode: '91205'
  },
  {
    name: 'LA County Library',
    url: 'https://lacountylibrary.libnet.info/events',
    county: 'Los Angeles',
    state: 'CA',
    website: 'https://lacountylibrary.org',
    city: 'Los Angeles',
    zipCode: '90012'
  },
  {
    name: 'Sacramento Public Library',
    url: 'https://saclibrary.libnet.info/events',
    county: 'Sacramento',
    state: 'CA',
    website: 'https://www.saclibrary.org',
    city: 'Sacramento',
    zipCode: '95814'
  },

  // COLORADO (2 libraries)
  {
    name: 'Aurora Public Library',
    url: 'https://auroraco.libnet.info/events',
    county: 'Adams',
    state: 'CO',
    website: 'https://www.aurorapubliclibrary.org',
    city: 'Aurora',
    zipCode: '80010'
  },
  {
    name: 'Douglas County Libraries',
    url: 'https://go.dcl.org/events',
    county: 'Douglas',
    state: 'CO',
    website: 'https://www.dcl.org',
    city: 'Castle Rock',
    zipCode: '80104'
  },

  // DISTRICT OF COLUMBIA (1 library)
  {
    name: 'DC Public Library',
    url: 'https://dclibrary.libnet.info/events',
    county: 'District of Columbia',
    state: 'DC',
    website: 'https://www.dclibrary.org',
    city: 'Washington',
    zipCode: '20001'
  },

  // FLORIDA (7 libraries)
  {
    name: 'Miami-Dade Public Library',
    url: 'https://mdpls.org/events',
    county: 'Miami-Dade',
    state: 'FL',
    website: 'https://www.mdpls.org',
    city: 'Miami',
    zipCode: '33128'
  },
  {
    name: 'Broward County Library',
    url: 'https://broward.libnet.info/events',
    county: 'Broward',
    state: 'FL',
    website: 'https://www.broward.org/library',
    city: 'Fort Lauderdale',
    zipCode: '33301'
  },
  {
    name: 'Hillsborough County Public Library Cooperative',
    url: 'https://attend.hcplc.org/events',
    county: 'Hillsborough',
    state: 'FL',
    website: 'https://www.hcplc.org',
    city: 'Tampa',
    zipCode: '33602'
  },
  {
    name: 'Jacksonville Public Library',
    url: 'https://jaxpubliclibrary.libnet.info/events',
    county: 'Duval',
    state: 'FL',
    website: 'https://jaxpubliclibrary.org',
    city: 'Jacksonville',
    zipCode: '32202'
  },
  {
    name: 'Pasco County Libraries',
    url: 'https://pascolibraries.libnet.info/events',
    county: 'Pasco',
    state: 'FL',
    website: 'https://www.pascolibraries.org',
    city: 'New Port Richey',
    zipCode: '34652'
  },
  {
    name: 'Martin County Library System',
    url: 'https://mcls.libnet.info/events',
    county: 'Martin',
    state: 'FL',
    website: 'https://www.martin.fl.us/Libraries',
    city: 'Stuart',
    zipCode: '34994'
  },
  {
    name: 'Largo Public Library',
    url: 'https://largopubliclibrary.libnet.info/events',
    county: 'Pinellas',
    state: 'FL',
    website: 'https://www.largo.com/library',
    city: 'Largo',
    zipCode: '33770'
  },

  // GEORGIA (2 libraries)
  {
    name: 'Gwinnett County Public Library',
    url: 'https://gwinnettpl.libnet.info/events',
    county: 'Gwinnett',
    state: 'GA',
    website: 'https://www.gwinnettpl.org',
    city: 'Lawrenceville',
    zipCode: '30046'
  },
  {
    name: 'DeKalb County Public Library',
    url: 'https://events.dekalblibrary.org/events',
    county: 'DeKalb',
    state: 'GA',
    website: 'https://dekalblibrary.org',
    city: 'Decatur',
    zipCode: '30030'
  },
  {
    name: 'Chattahoochee Valley Libraries',
    url: 'https://cvl.libnet.info/events',
    county: 'Muscogee',
    state: 'GA',
    website: 'https://www.cvlga.org',
    city: 'Columbus',
    zipCode: '31901'
  },
  {
    name: 'Forsyth County Public Library',
    url: 'https://events.forsythpl.org/events',
    county: 'Forsyth',
    state: 'GA',
    website: 'https://www.forsythpl.org',
    city: 'Cumming',
    zipCode: '30040'
  },

  // NEW JERSEY (1 library)
  {
    name: 'Ocean County Library',
    url: 'https://theoceancountylibrary.libnet.info/ocean-county-library/events',
    county: 'Ocean',
    state: 'NJ',
    website: 'https://www.theoceancountylibrary.org',
    city: 'Toms River',
    zipCode: '08753'
  },
  {
    name: 'Somerset County Library System',
    url: 'https://sclsnj.libnet.info/events',
    county: 'Somerset',
    state: 'NJ',
    website: 'https://sclsnj.org',
    city: 'Bridgewater',
    zipCode: '08807'
  },
  {
    name: 'Middlesex County Library',
    url: 'https://middlesex.libnet.info/events',
    county: 'Middlesex',
    state: 'NJ',
    website: 'https://yourmiddlesexlibrary.org',
    city: 'New Brunswick',
    zipCode: '08901'
  },

  // ILLINOIS (4 libraries)
  {
    name: 'Joliet Public Library',
    url: 'https://jolietpubliclibrary.libnet.info/events',
    county: 'Will',
    state: 'IL',
    website: 'https://jolietlibrary.org',
    city: 'Joliet',
    zipCode: '60432'
  },
  {
    name: 'Schaumburg Township District Library',
    url: 'https://schaumburg.libnet.info/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://www.schaumburglibrary.org',
    city: 'Schaumburg',
    zipCode: '60193'
  },
  {
    name: 'Champaign Public Library',
    url: 'https://champaign.libnet.info/events',
    county: 'Champaign',
    state: 'IL',
    website: 'https://champaign.org',
    city: 'Champaign',
    zipCode: '61820'
  },
  {
    name: 'Mount Prospect Public Library',
    url: 'https://mppl.libnet.info/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://mppl.org',
    city: 'Mount Prospect',
    zipCode: '60056'
  },

  // INDIANA (3 libraries)
  {
    name: 'Indianapolis Public Library',
    url: 'https://indianapolis.libnet.info/events',
    county: 'Marion',
    state: 'IN',
    website: 'https://www.indypl.org',
    city: 'Indianapolis',
    zipCode: '46204'
  },
  {
    name: 'Allen County Public Library',
    url: 'https://acpl.libnet.info/events',
    county: 'Allen',
    state: 'IN',
    website: 'https://www.acpl.info',
    city: 'Fort Wayne',
    zipCode: '46802'
  },
  {
    name: 'Evansville Vanderburgh Public Library',
    url: 'https://evansville.libnet.info/events',
    county: 'Vanderburgh',
    state: 'IN',
    website: 'https://www.evpl.org',
    city: 'Evansville',
    zipCode: '47708'
  },

  // IOWA (2 libraries)
  {
    name: 'Cedar Rapids Public Library',
    url: 'https://crlibrary.org/events',
    county: 'Linn',
    state: 'IA',
    website: 'https://www.crlibrary.org',
    city: 'Cedar Rapids',
    zipCode: '52401'
  },
  {
    name: 'Waterloo Public Library',
    url: 'https://wpl.libnet.info/events',
    county: 'Black Hawk',
    state: 'IA',
    website: 'https://www.waterloopubliclibrary.org',
    city: 'Waterloo',
    zipCode: '50703'
  },

  // KENTUCKY (1 library)
  {
    name: 'Lexington Public Library',
    url: 'https://lexpublib.libnet.info/events',
    county: 'Fayette',
    state: 'KY',
    website: 'https://www.lexpublib.org',
    city: 'Lexington',
    zipCode: '40507'
  },

  // MASSACHUSETTS (1 library)
  {
    name: 'Worcester Public Library',
    url: 'https://mywpl.libnet.info/events',
    county: 'Worcester',
    state: 'MA',
    website: 'https://www.worcpublib.org',
    city: 'Worcester',
    zipCode: '01608'
  },

  // MARYLAND (9 libraries)
  {
    name: 'Baltimore County Public Library',
    url: 'https://events.bcpl.info/events',
    county: 'Baltimore',
    state: 'MD',
    website: 'https://bcpl.info',
    city: 'Towson',
    zipCode: '21204'
  },
  {
    name: 'Montgomery County Public Library',
    url: 'https://mcpl.libnet.info/events',
    county: 'Montgomery',
    state: 'MD',
    website: 'https://www.montgomerycountymd.gov/library',
    city: 'Rockville',
    zipCode: '20850'
  },
  {
    name: 'Harford County Public Library',
    url: 'https://programs.hcplonline.org/events',
    county: 'Harford',
    state: 'MD',
    website: 'https://hcplonline.org',
    city: 'Belcamp',
    zipCode: '21017'
  },
  {
    name: 'Calvert Library',
    url: 'https://calvertlibrary.libnet.info/events',
    county: 'Calvert',
    state: 'MD',
    website: 'https://calvertlibrary.info',
    city: 'Prince Frederick',
    zipCode: '20678'
  },
  {
    name: 'Charles County Public Library',
    url: 'https://ccplonline.libnet.info/events',
    county: 'Charles',
    state: 'MD',
    website: 'https://www.ccplonline.org',
    city: 'La Plata',
    zipCode: '20646'
  },
  {
    name: "St. Mary's County Library",
    url: 'https://stmalib.libnet.info/events',
    county: "St. Mary's",
    state: 'MD',
    website: 'https://www.stmalib.org',
    city: 'Leonardtown',
    zipCode: '20650'
  },
  {
    name: 'Anne Arundel County Public Library',
    url: 'https://www.aacpl.net/events',
    county: 'Anne Arundel',
    state: 'MD',
    website: 'https://www.aacpl.net',
    city: 'Annapolis',
    zipCode: '21401'
  },
  {
    name: 'Howard County Library System',
    url: 'https://hclibrary.org/events',
    county: 'Howard',
    state: 'MD',
    website: 'https://www.hclibrary.org',
    city: 'Columbia',
    zipCode: '21044'
  },
  {
    name: 'Frederick County Public Libraries',
    url: 'https://www.fcpl.org/events',
    county: 'Frederick',
    state: 'MD',
    website: 'https://www.fcpl.org',
    city: 'Frederick',
    zipCode: '21701'
  },

  // NORTH CAROLINA (2 libraries)
  {
    name: 'Forsyth County Public Library',
    url: 'https://forsyth.libnet.info/events',
    county: 'Forsyth',
    state: 'NC',
    website: 'https://www.forsyth.cc/library',
    city: 'Winston-Salem',
    zipCode: '27101'
  },
  {
    name: 'Wake County Public Libraries',
    url: 'https://wake.libnet.info/events',
    county: 'Wake',
    state: 'NC',
    website: 'https://www.wake.gov/libraries',
    city: 'Raleigh',
    zipCode: '27601'
  },

  // NEVADA (1 library)
  {
    name: 'Las Vegas-Clark County Library District',
    url: 'https://events.thelibrarydistrict.org',
    county: 'Clark',
    state: 'NV',
    website: 'https://thelibrarydistrict.org',
    city: 'Las Vegas',
    zipCode: '89101'
  },

  // NEW YORK (3 libraries)
  {
    name: 'Huntington Public Library',
    url: 'https://myhpl.libnet.info/events',
    county: 'Suffolk',
    state: 'NY',
    website: 'https://huntingtonpl.org',
    city: 'Huntington',
    zipCode: '11743'
  },
  {
    name: 'Massapequa Public Library',
    url: 'https://massapequa.librarycalendar.com/events',
    county: 'Nassau',
    state: 'NY',
    website: 'https://massapequalibrary.org',
    city: 'Massapequa',
    zipCode: '11758'
  },
  {
    name: 'Patchogue-Medford Library',
    url: 'https://pmlib.libnet.info/events',
    county: 'Suffolk',
    state: 'NY',
    website: 'https://pmlib.org',
    city: 'Patchogue',
    zipCode: '11772'
  },

  // TEXAS (3 libraries) - Houston moved to LibCal scraper
  {
    name: 'McAllen Public Library',
    url: 'https://mcallenlibrary.libnet.info/events',
    county: 'Hidalgo',
    state: 'TX',
    website: 'https://www.mcallen.net/services/library',
    city: 'McAllen',
    zipCode: '78501'
  },
  {
    name: 'Plano Public Library',
    url: 'https://plano.libnet.info/events',
    county: 'Collin',
    state: 'TX',
    website: 'https://www.planolibrary.org',
    city: 'Plano',
    zipCode: '75074'
  },
  {
    name: 'Flower Mound Public Library',
    url: 'https://fmlibrary.libnet.info/events',
    county: 'Denton',
    state: 'TX',
    website: 'https://www.flowermound.gov/library',
    city: 'Flower Mound',
    zipCode: '75028'
  },

  // OHIO (3 libraries)
  {
    name: 'Columbus Metropolitan Library',
    url: 'https://events.columbuslibrary.org/events',
    county: 'Franklin',
    state: 'OH',
    website: 'https://www.columbuslibrary.org',
    city: 'Columbus',
    zipCode: '43215'
  },
  {
    name: 'Akron-Summit County Public Library',
    url: 'https://services.akronlibrary.org/events',
    county: 'Summit',
    state: 'OH',
    website: 'https://www.akronlibrary.org',
    city: 'Akron',
    zipCode: '44308'
  },
  {
    name: 'Toledo Lucas County Public Library',
    url: 'https://events.toledolibrary.org/events',
    county: 'Lucas',
    state: 'OH',
    website: 'https://www.toledolibrary.org',
    city: 'Toledo',
    zipCode: '43604'
  },

  // OREGON (1 library)
  {
    name: 'Multnomah County Library',
    url: 'https://multcolib.libnet.info/events',
    county: 'Multnomah',
    state: 'OR',
    website: 'https://multcolib.org',
    city: 'Portland',
    zipCode: '97204'
  },

  // PENNSYLVANIA (1 library)
  {
    name: 'Reading Public Library',
    url: 'https://readingpl.libnet.info/events',
    county: 'Berks',
    state: 'PA',
    website: 'https://readingpubliclibrary.org',
    city: 'Reading',
    zipCode: '19602'
  },

  // SOUTH CAROLINA (2 libraries)
  {
    name: 'Greenville County Library System',
    url: 'https://greenville.libnet.info/events',
    county: 'Greenville',
    state: 'SC',
    website: 'https://www.greenvillelibrary.org',
    city: 'Greenville',
    zipCode: '29601'
  },
  {
    name: 'Richland Library',
    url: 'https://richland.libnet.info/events',
    county: 'Richland',
    state: 'SC',
    website: 'https://www.richlandlibrary.com',
    city: 'Columbia',
    zipCode: '29201'
  },

  // TENNESSEE (2 libraries)
  {
    name: 'Chattanooga Public Library',
    url: 'https://chattanooga.libnet.info/events',
    county: 'Hamilton',
    state: 'TN',
    website: 'https://chattlibrary.org',
    city: 'Chattanooga',
    zipCode: '37402'
  },
  {
    name: 'Nashville Public Library',
    url: 'https://nashville.libnet.info/events',
    county: 'Davidson',
    state: 'TN',
    website: 'https://www.library.nashville.org',
    city: 'Nashville',
    zipCode: '37219'
  },

  // VIRGINIA (2 libraries)
  {
    name: 'Loudoun County Public Library',
    url: 'https://loudoun.libnet.info/events',
    county: 'Loudoun',
    state: 'VA',
    website: 'https://library.loudoun.gov',
    city: 'Leesburg',
    zipCode: '20175'
  },
  {
    name: 'Prince William Public Library',
    url: 'https://pwcgov.libnet.info/events',
    county: 'Prince William',
    state: 'VA',
    website: 'https://www.pwcva.gov/department/library',
    city: 'Manassas',
    zipCode: '20110'
  },

  // WISCONSIN (1 library)
  {
    name: 'Milwaukee Public Library',
    url: 'https://mpl.libnet.info/events',
    county: 'Milwaukee',
    state: 'WI',
    website: 'https://www.mpl.org',
    city: 'Milwaukee',
    zipCode: '53233'
  },

  // WASHINGTON (1 library - 925K people)
  {
    name: 'Pierce County Library System',
    url: 'https://calendar.piercecountylibrary.org/events',
    county: 'Pierce',
    state: 'WA',
    website: 'https://www.piercecountylibrary.org',
    city: 'Tacoma',
    zipCode: '98444'
  }
];

// Note: geocodeAddress is now imported from geocoding-helper.js with fallback support

// Parse age range from audience text
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from Communico library
async function scrapeLibraryEvents(library, browser) {
  // DC is not a county - it's a federal district
  const countyDisplay = library.state === 'DC' ? library.county : `${library.county} County`;
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${countyDisplay}, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Communico/LibNet defaults to showing only today's events
    // Add ?r=thismonth to get all events for the current month
    let url = library.url;
    if (!url.includes('r=thismonth') && !url.includes('r=nextmonth')) {
      if (!url.includes('?')) {
        url = `${url}?r=thismonth`;
      } else if (!url.includes('r=')) {
        url = `${url}&r=thismonth`;
      }
    }

    // Wait for full page + AJAX to load (Communico loads events via AJAX)
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for Communico event elements to appear (specific selectors only, not generic 'article')
    try {
      await page.waitForSelector('.eelistevent, .em-event-list-item', { timeout: 10000 });
      console.log('   ✓ Event selectors found');
    } catch (error) {
      console.log('   ⚠ Event selectors timeout - waiting additional 5 seconds for AJAX render');
      // Fallback wait for slow AJAX rendering
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to load lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract events from the page
    let events = await page.evaluate(() => {
      const results = [];

      // Communico uses various selectors
      const selectors = [
        '.eelistevent',      // Douglas County Libraries (go.dcl.org) format
        '.em-event-list-item', // Standard Communico format
        '.event-item',
        'article',
        '.program-item',
        '[data-event-id]'
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Look for event title
          let titleEl = el.querySelector('h1, h2, h3, h4, .event-title, .program-title, .eelistevent-name, a');
          let title = '';

          if (titleEl) {
            title = titleEl.textContent.trim();
          } else {
            // For text-based cards (like Douglas County), first line is the title
            const lines = el.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0) {
              // First line that doesn't look like a date/time is the title
              for (const line of lines) {
                if (!line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}:\d{2})/i) &&
                    line.length > 3 && line.length < 150) {
                  title = line;
                  break;
                }
              }
            }
          }

          if (!title || title.length < 3) return;

          // Get all text content
          const fullText = el.textContent;

          // Extract date/time
          let eventDate = '';
          const dateEl = el.querySelector('.event-date, .date, time, .eelistevent-date, [class*="date"]');
          if (dateEl) {
            eventDate = dateEl.textContent.trim();
          } else {
            // Match formats like "Thursday, January 22: 9:00am - 9:30am" or "Thursday, January 22, 2026"
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?::?\s*\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))?)?/i) ||
                             fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                             fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract time
          let time = '';
          const timeEl = el.querySelector('.event-time, .time, .eelisttime, [class*="time"]');
          if (timeEl) {
            time = timeEl.textContent.trim();
          } else {
            const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location/branch
          let location = '';
          const locationEl = el.querySelector('.location, .branch, [class*="location"]');
          if (locationEl) {
            location = locationEl.textContent.trim();
          }

          // Fallback: Extract location-like text from card if CSS selector failed
          if (!location && fullText) {
            const textLines = fullText.split('\n').filter(t => t.trim().length > 5 && t.trim().length < 60);
            const locationLine = textLines.find(t => t.match(/Library|Branch|Room|Hall|Center/i));
            if (locationLine) {
              location = locationLine.trim();
            }
          }

          // Extract description
          let description = '';
          const descEl = el.querySelector('.description, .eelistdesc, p, [class*="description"]');
          if (descEl) {
            description = descEl.textContent.trim();
          }

          // Extract age/audience
          let audience = '';
          const audienceEl = el.querySelector('.audience, [class*="age"]');
          if (audienceEl) {
            audience = audienceEl.textContent.trim();
          } else {
            const audienceMatch = fullText.match(/(?:Age|Audience|Grade)s?:\s*([^\n|]+)/i);
            if (audienceMatch) audience = audienceMatch[1].trim();
          }

          // Get event URL
          let url = '';
          const linkEl = el.querySelector('a[href*="event"], a[href*="program"]');
          if (linkEl && linkEl.href) {
            url = linkEl.href;
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
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

    // RETRY: If no events found, wait longer and try again
    // This handles AJAX-heavy sites that render events later
    if (events.length === 0) {
      console.log('   ⚠ No events found - waiting 5 more seconds and retrying extraction');
      await new Promise(resolve => setTimeout(resolve, 5000));

      events = await page.evaluate(() => {
        const results = [];
        const selectors = [
          '.eelistevent',
          '.em-event-list-item',
          '.event-item',
          'article',
          '.program-item',
          '[data-event-id]'
        ];

        let eventElements = [];
        for (const selector of selectors) {
          eventElements = document.querySelectorAll(selector);
          if (eventElements.length > 0) break;
        }

        eventElements.forEach(el => {
          try {
            let titleEl = el.querySelector('h1, h2, h3, h4, .event-title, .program-title, .eelistevent-name, a');
            let title = '';

            if (titleEl) {
              title = titleEl.textContent.trim();
            } else {
              const lines = el.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              if (lines.length > 0) {
                for (const line of lines) {
                  if (!line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}:\d{2})/i) &&
                      line.length > 3 && line.length < 150) {
                    title = line;
                    break;
                  }
                }
              }
            }

            if (!title || title.length < 3) return;

            const fullText = el.textContent;

            let eventDate = '';
            const dateEl = el.querySelector('.event-date, .date, time, .eelistevent-date, [class*="date"]');
            if (dateEl) {
              eventDate = dateEl.textContent.trim();
            } else {
              const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?::?\s*\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))?)?/i) ||
                               fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i) ||
                               fullText.match(/\w{3,9}\s+\d{1,2},?\s+\d{4}/i);
              if (dateMatch) eventDate = dateMatch[0];
            }

            let time = '';
            const timeEl = el.querySelector('.event-time, .time, .eelisttime, [class*="time"]');
            if (timeEl) {
              time = timeEl.textContent.trim();
            } else {
              const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i);
              if (timeMatch) time = timeMatch[0];
            }

            let location = '';
            const locationEl = el.querySelector('.location, .branch, [class*="location"]');
            if (locationEl) {
              location = locationEl.textContent.trim();
            }

            if (!location && fullText) {
              const textLines = fullText.split('\n').filter(t => t.trim().length > 5 && t.trim().length < 60);
              const locationLine = textLines.find(t => t.match(/Library|Branch|Room|Hall|Center/i));
              if (locationLine) {
                location = locationLine.trim();
              }
            }

            let description = '';
            const descEl = el.querySelector('.description, .eelistdesc, p, [class*="description"]');
            if (descEl) {
              description = descEl.textContent.trim();
            }

            let audience = '';
            const audienceEl = el.querySelector('.audience, [class*="age"]');
            if (audienceEl) {
              audience = audienceEl.textContent.trim();
            } else {
              const audienceMatch = fullText.match(/(?:Age|Audience|Grade)s?:\s*([^\n|]+)/i);
              if (audienceMatch) audience = audienceMatch[1].trim();
            }

            let url = '';
            const linkEl = el.querySelector('a[href*="event"], a[href*="program"]');
            if (linkEl && linkEl.href) {
              url = linkEl.href;
            }

            if (title && eventDate) {
              const rawDate = time ? `${eventDate} ${time}` : eventDate;

              results.push({
                name: title,
                eventDate: rawDate,
                venue: location,
                description: description,
                url: url,
                audience: audience
              });
            }
          } catch (err) {
            console.log('Error parsing event on retry:', err);
          }
        });

        return results;
      });
      console.log(`   After retry: found ${events.length} events`);
    }

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description and audience
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Geocode with intelligent fallback
        let coordinates = null;
        if (event.venue && event.venue.trim()) {
          // DC doesn't have counties - use just city, state for cleaner geocoding
          const countyPart = library.state === 'DC' ? '' : `, ${library.county} County`;
          const fullAddress = `${event.venue}, ${library.city}${countyPart}, ${library.state}`;
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

        // Normalize and parse date
        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;
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
          moreInfo: event.audience || '',
          state: library.state,
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
            source: 'Communico Scraper',
            sourceName: library.name,
            county: library.county,
            state: library.state,
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

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

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

// Main scraper function - supports state filtering
async function scrapeCommunicoLibraries(stateFilter = null) {
  // Filter libraries by state if specified
  const libraries = stateFilter
    ? LIBRARY_SYSTEMS.filter(lib => lib.state === stateFilter)
    : LIBRARY_SYSTEMS;

  console.log('\n📚 COMMUNICO LIBRARY SCRAPER');
  console.log('='.repeat(60));
  if (stateFilter) {
    console.log(`State: ${stateFilter} - ${libraries.length} libraries`);
  } else {
    console.log('Coverage: 49 libraries across 19 states');
    console.log('(CA, CO, DC, FL, GA, IA, IL, IN, MA, MD, NJ, NV, NY, OH, OR, PA, TX, VA, WI)');
  }
  console.log('='.repeat(60) + '\n');

  // Initialize logger with per-site tracking
  const scraperName = stateFilter ? `Communico-${stateFilter}` : 'Communico-All';
  const logger = new ScraperLogger(scraperName, 'events', {
    state: stateFilter,
    source: 'communico'
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

  // Log to Firestore with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// State-specific wrapper functions
async function scrapeCommunicoCA() { return scrapeCommunicoLibraries('CA'); }
async function scrapeCommunicoCO() { return scrapeCommunicoLibraries('CO'); }
async function scrapeCommunicoDC() { return scrapeCommunicoLibraries('DC'); }
async function scrapeCommunicoFL() { return scrapeCommunicoLibraries('FL'); }
async function scrapeCommunicoGA() { return scrapeCommunicoLibraries('GA'); }
async function scrapeCommunicoIA() { return scrapeCommunicoLibraries('IA'); }
async function scrapeCommunicoIL() { return scrapeCommunicoLibraries('IL'); }
async function scrapeCommunicoIN() { return scrapeCommunicoLibraries('IN'); }
async function scrapeCommunicoMA() { return scrapeCommunicoLibraries('MA'); }
async function scrapeCommunicoMD() { return scrapeCommunicoLibraries('MD'); }
async function scrapeCommunicoNJ() { return scrapeCommunicoLibraries('NJ'); }
async function scrapeCommunicoNV() { return scrapeCommunicoLibraries('NV'); }
async function scrapeCommunicoNY() { return scrapeCommunicoLibraries('NY'); }
async function scrapeCommunicoOH() { return scrapeCommunicoLibraries('OH'); }
async function scrapeCommunicoOR() { return scrapeCommunicoLibraries('OR'); }
async function scrapeCommunicoPA() { return scrapeCommunicoLibraries('PA'); }
async function scrapeCommunicoTX() { return scrapeCommunicoLibraries('TX'); }
async function scrapeCommunicoVA() { return scrapeCommunicoLibraries('VA'); }
async function scrapeCommunicoWI() { return scrapeCommunicoLibraries('WI'); }

// Cloud Function wrapper
async function scrapeCommunicoLibrariesCloudFunction() {
  console.log('\n📚 Communico Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const stats = await scrapeCommunicoLibraries();
    // Note: logging is handled in scrapeCommunicoLibraries() with state-specific name
    return {
      imported: stats.imported,
      skipped: stats.skipped,
      failed: stats.failed,
      message: 'Communico libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in Communico scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeCommunicoLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeCommunicoLibraries,
  scrapeCommunicoLibrariesCloudFunction,
  // State-specific exports
  scrapeCommunicoCA,
  scrapeCommunicoCO,
  scrapeCommunicoDC,
  scrapeCommunicoFL,
  scrapeCommunicoGA,
  scrapeCommunicoIA,
  scrapeCommunicoIL,
  scrapeCommunicoIN,
  scrapeCommunicoMA,
  scrapeCommunicoMD,
  scrapeCommunicoNJ,
  scrapeCommunicoNV,
  scrapeCommunicoNY,
  scrapeCommunicoOH,
  scrapeCommunicoOR,
  scrapeCommunicoPA,
  scrapeCommunicoTX,
  scrapeCommunicoVA,
  scrapeCommunicoWI
};
