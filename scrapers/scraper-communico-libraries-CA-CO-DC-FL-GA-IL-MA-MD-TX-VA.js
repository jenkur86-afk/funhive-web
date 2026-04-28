#!/usr/bin/env node

/**
 * COMMUNICO LIBRARIES SCRAPER
 *
 * Scrapes events from libraries using Communico platform (HTML method)
 * API requires authentication, so we scrape the HTML pages directly
 *
 * COVERAGE (87 libraries across 26 states):
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
 * FL (8 libraries):
 * - Miami-Dade Public Library (2.77M)
 * - Broward County Library (1.98M)
 * - Hillsborough County Public Library Cooperative (1.56M)
 * - Jacksonville Public Library (1.05M)
 * - Pasco County Libraries (590K)
 * - Martin County Library System (165K)
 * - Largo Public Library (100K)
 * - Alachua County Library District (Gainesville)
 *
 * GA (5 libraries):
 * - Gwinnett County Public Library (950K)
 * - DeKalb County Public Library (750K)
 * - Chattahoochee Valley Libraries (Columbus) (325K)
 * - Forsyth County Public Library (Cumming) (251K)
 * - Henry County Library System (McDonough)
 *
 * IL (11 libraries):
 * - Joliet Public Library (147K)
 * - Schaumburg Township District Library (135K)
 * - Champaign Public Library (90K)
 * - Mount Prospect Public Library (55K)
 * - Elk Grove Village Public Library (33K)
 * - Rolling Meadows Library (24K)
 * - Rockford Public Library
 * - Gail Borden Public Library (Elgin)
 * - Skokie Public Library
 * - Des Plaines Public Library
 * - Waukegan Public Library
 *
 * IN (6 libraries):
 * - Indianapolis Public Library (970K)
 * - Evansville Vanderburgh Public Library (290K)
 * - Allen County Public Library (407K)
 * - St. Joseph County Public Library (South Bend)
 * - Monroe County Public Library (Bloomington)
 * - Kokomo-Howard County Library
 *
 * IA (7 libraries):
 * - Waterloo Public Library (67K)
 * - Des Moines Public Library
 * - Cedar Rapids Public Library
 * - Council Bluffs Public Library
 * - Ames Public Library
 * - Bettendorf Public Library
 * - Fort Dodge Public Library
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
 * NJ (8 libraries):
 * - Ocean County Library (600K)
 * - Somerset County Library System (345K)
 * - Middlesex County Library (860K)
 * - Camden County Library System (Voorhees)
 * - Montclair Public Library
 * - Warren County Library (Belvidere)
 * - Cape May County Library
 * - Hoboken Public Library
 *
 * NV (1 library - 2.3M people):
 * - Las Vegas-Clark County Library District (2.3M)
 *
 * NY (3 libraries - 234K people):
 * - Huntington Public Library (175K)
 * - Massapequa Public Library (21K)
 * - Patchogue-Medford Library (38K)
 *
 * OH (5 libraries):
 * - Columbus Metropolitan Library (2.1M)
 * - Akron-Summit County Public Library (540K)
 * - Toledo Lucas County Public Library (430K)
 * - Stark County District Library (Canton)
 * - Mansfield-Richland County Library
 *
 * OR (1 library - 820K people):
 * - Multnomah County Library (820K)
 *
 * PA (1 library - 420K people):
 * - Reading Public Library (420K)
 *
 * SC (3 libraries):
 * - Richland Library (500K)
 * - Greenville County Library System (520K)
 * - Pickens County Library (Easley)
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
 * MN (1 library):
 * - Lake Agassiz Regional Library (Moorhead)
 *
 * NH (1 library):
 * - Peterborough Town Library
 *
 * Total: 87 libraries serving ~50+ million people
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

  // FLORIDA (8 libraries)
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
  {
    name: 'Alachua County Library District',
    url: 'https://attend.aclib.us/events',
    county: 'Alachua',
    state: 'FL',
    website: 'https://www.aclib.us',
    city: 'Gainesville',
    zipCode: '32601'
  },
  {
    name: 'Hernando County Public Library',
    url: 'https://hernandocounty.librarycalendar.com/',
    county: 'Hernando',
    state: 'FL',
    website: 'https://hernandocountylibrary.us',
    city: 'Brooksville',
    zipCode: '34601'
  },

  // GEORGIA (5 libraries)
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
  {
    name: 'Henry County Library System',
    url: 'https://henrylibraries.libnet.info/events',
    county: 'Henry',
    state: 'GA',
    website: 'https://www.henrylibraries.org',
    city: 'McDonough',
    zipCode: '30253'
  },

  // NEW JERSEY (8 libraries)
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
  {
    name: 'Camden County Library System',
    url: 'https://events.camdencountylibrary.org/',
    county: 'Camden',
    state: 'NJ',
    website: 'https://www.camdencountylibrary.org',
    city: 'Voorhees',
    zipCode: '08043'
  },
  {
    name: 'Montclair Public Library',
    url: 'https://montclairlibrary.libnet.info/events',
    county: 'Essex',
    state: 'NJ',
    website: 'https://www.montclairlibrary.org',
    city: 'Montclair',
    zipCode: '07042'
  },
  {
    name: 'Warren County Library',
    url: 'https://warrenlib.libnet.info/events',
    county: 'Warren',
    state: 'NJ',
    website: 'https://www.warrenlib.org',
    city: 'Belvidere',
    zipCode: '07823'
  },
  {
    name: 'Cape May County Library',
    url: 'https://events.cmclibrary.org/events',
    county: 'Cape May',
    state: 'NJ',
    website: 'https://www.cmclibrary.org',
    city: 'Cape May Court House',
    zipCode: '08210'
  },
  {
    name: 'Hoboken Public Library',
    url: 'https://hobokenlibrary.libnet.info/events',
    county: 'Hudson',
    state: 'NJ',
    website: 'https://www.hobokenlibrary.org',
    city: 'Hoboken',
    zipCode: '07030'
  },

  // ILLINOIS (11 libraries)
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
  {
    name: 'Elk Grove Village Public Library',
    url: 'https://egvpl.libnet.info/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://www.egvpl.org',
    city: 'Elk Grove Village',
    zipCode: '60007'
  },
  {
    name: 'Rolling Meadows Library',
    url: 'https://rmlib.libnet.info/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://www.rmlib.org',
    city: 'Rolling Meadows',
    zipCode: '60008'
  },
  {
    name: 'Rockford Public Library',
    url: 'https://rockford.libnet.info/events',
    county: 'Winnebago',
    state: 'IL',
    website: 'https://www.rockfordpubliclibrary.org',
    city: 'Rockford',
    zipCode: '61101'
  },
  {
    name: 'Gail Borden Public Library',
    url: 'https://attend.gailborden.info/events',
    county: 'Kane',
    state: 'IL',
    website: 'https://www.gailborden.info',
    city: 'Elgin',
    zipCode: '60120'
  },
  {
    name: 'Skokie Public Library',
    url: 'https://skokie.libnet.info/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://www.skokielibrary.info',
    city: 'Skokie',
    zipCode: '60077'
  },
  {
    name: 'Des Plaines Public Library',
    url: 'https://desplaines.libnet.info/events',
    county: 'Cook',
    state: 'IL',
    website: 'https://www.dppl.org',
    city: 'Des Plaines',
    zipCode: '60016'
  },
  {
    name: 'Waukegan Public Library',
    url: 'https://events.waukeganpl.org/events',
    county: 'Lake',
    state: 'IL',
    website: 'https://www.waukeganpl.org',
    city: 'Waukegan',
    zipCode: '60085'
  },

  // INDIANA (6 libraries)
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
  {
    name: 'St. Joseph County Public Library',
    url: 'https://sjcpl.libnet.info/events',
    county: 'St. Joseph',
    state: 'IN',
    website: 'https://www.sjcpl.org',
    city: 'South Bend',
    zipCode: '46601'
  },
  {
    name: 'Monroe County Public Library',
    url: 'https://mcplin.libnet.info/events',
    county: 'Monroe',
    state: 'IN',
    website: 'https://www.mcpl.info',
    city: 'Bloomington',
    zipCode: '47408'
  },
  {
    name: 'Kokomo-Howard County Library',
    url: 'https://khcpl.libnet.info/events',
    county: 'Howard',
    state: 'IN',
    website: 'https://www.khcpl.org',
    city: 'Kokomo',
    zipCode: '46901'
  },
  {
    name: 'Lake County Public Library',
    url: 'https://lcplin.libnet.info/events',
    county: 'Lake',
    state: 'IN',
    website: 'https://www.lcplin.org',
    city: 'Merrillville',
    zipCode: '46410'
  },

  // IOWA (7 libraries)
  // NOTE: Cedar Rapids Public Library (crlibrary.org) removed — NOT a Communico/LibNet site.
  // It's a custom website. Needs its own scraper or a WordPress scraper if applicable.
  {
    name: 'Waterloo Public Library',
    url: 'https://wpl.libnet.info/events',
    county: 'Black Hawk',
    state: 'IA',
    website: 'https://www.waterloopubliclibrary.org',
    city: 'Waterloo',
    zipCode: '50703'
  },
  {
    name: 'Des Moines Public Library',
    url: 'https://www.dmpl.org/events/month',
    county: 'Polk',
    state: 'IA',
    website: 'https://www.dmpl.org',
    city: 'Des Moines',
    zipCode: '50309'
  },
  {
    name: 'Cedar Rapids Public Library',
    url: 'https://crlibrary.libnet.info/events',
    county: 'Linn',
    state: 'IA',
    website: 'https://www.crlibrary.org',
    city: 'Cedar Rapids',
    zipCode: '52401'
  },
  {
    name: 'Council Bluffs Public Library',
    url: 'https://www.councilbluffslibrary.org/events/month',
    county: 'Pottawattamie',
    state: 'IA',
    website: 'https://www.councilbluffslibrary.org',
    city: 'Council Bluffs',
    zipCode: '51503'
  },
  {
    name: 'Ames Public Library',
    url: 'https://www.amespubliclibrary.org/events/month',
    county: 'Story',
    state: 'IA',
    website: 'https://www.amespubliclibrary.org',
    city: 'Ames',
    zipCode: '50010'
  },
  {
    name: 'Bettendorf Public Library',
    url: 'https://events.bettendorflibrary.com/',
    county: 'Scott',
    state: 'IA',
    website: 'https://www.bettendorflibrary.com',
    city: 'Bettendorf',
    zipCode: '52722'
  },
  {
    name: 'Fort Dodge Public Library',
    url: 'https://www.fortdodgelibrary.org/events/month',
    county: 'Webster',
    state: 'IA',
    website: 'https://www.fortdodgelibrary.org',
    city: 'Fort Dodge',
    zipCode: '50501'
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
  // Howard County Library System and Frederick County Public Libraries removed —
  // they use LibraryCalendar.com, not Communico. Covered by scraper-librarycalendar-libraries-MD-VA.js

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
    url: 'https://events.thelibrarydistrict.org/events',
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
  {
    name: 'Poughkeepsie Public Library District',
    url: 'https://poughkeepsie.librarycalendar.com/events/list',
    county: 'Dutchess',
    state: 'NY',
    website: 'https://www.poklib.org',
    city: 'Poughkeepsie',
    zipCode: '12601'
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

  // OHIO (5 libraries)
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
  {
    name: 'Stark County District Library',
    url: 'https://events.starklibrary.org/events',
    county: 'Stark',
    state: 'OH',
    website: 'https://www.starklibrary.org',
    city: 'Canton',
    zipCode: '44702'
  },
  {
    name: 'Mansfield-Richland County Library',
    url: 'https://mrcpl.libnet.info/events',
    county: 'Richland',
    state: 'OH',
    website: 'https://www.mrcpl.org',
    city: 'Mansfield',
    zipCode: '44902'
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

  // SOUTH CAROLINA (3 libraries)
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
  {
    name: 'Pickens County Library',
    url: 'https://pickenscountylibrarysystem.libnet.info/events',
    county: 'Pickens',
    state: 'SC',
    website: 'https://www.pickenslib.org',
    city: 'Easley',
    zipCode: '29640'
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
  },

  // MINNESOTA (1 library)
  {
    name: 'Lake Agassiz Regional Library',
    url: 'https://larl.libnet.info/events',
    county: 'Clay',
    state: 'MN',
    website: 'https://www.larl.org',
    city: 'Moorhead',
    zipCode: '56560'
  },

  // NEW HAMPSHIRE (1 library)
  {
    name: 'Peterborough Town Library',
    url: 'https://peterboroughtownlibrary.libnet.info/events',
    county: 'Hillsborough',
    state: 'NH',
    website: 'https://www.peterboroughtownlibrary.org',
    city: 'Peterborough',
    zipCode: '03458'
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

// ─── API-FIRST APPROACH ─────────────────────────────────────────────────────
// Communico/LibNet sites expose a JSON API at /eeventcaldata that returns
// structured event data without needing Puppeteer. This is faster, more
// reliable, and avoids AJAX-rendering timing issues.
async function tryApiScrape(library) {
  // Extract base URL (origin) from the library URL
  const urlObj = new URL(library.url);
  const baseUrl = urlObj.origin;

  // Build date range: today → 30 days out
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const reqPayload = JSON.stringify({
    date: formatDate(today),
    endDate: formatDate(endDate),
    search: '',
    locations: [],
    ages: [],
    types: [],
    private: false
  });

  const apiUrl = `${baseUrl}/eeventcaldata?event_type=0&req=${encodeURIComponent(reqPayload)}`;

  try {
    const response = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': library.url
      }
    });

    // Response should be a JSON array of events
    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) {
      return null; // No events or unexpected format — fall back to Puppeteer
    }

    console.log(`   📡 API returned ${data.length} events`);

    // Map API response to the same format used by the Puppeteer extraction
    const events = data.map(item => {
      // Build date string from API fields
      let eventDate = item.datestring || item.date || '';
      const timeStr = item.time_string || '';
      if (timeStr && !eventDate.includes(timeStr)) {
        eventDate = eventDate ? `${eventDate} ${timeStr}` : timeStr;
      }

      // Extract audience/age from agesArray
      let audience = '';
      if (item.agesArray && Array.isArray(item.agesArray)) {
        audience = item.agesArray.map(a => a.name || a).join(', ');
      }

      // Build full URL for the event
      let eventUrl = '';
      if (item.url) {
        eventUrl = item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`;
      } else if (item.id) {
        eventUrl = `${baseUrl}/event/${item.id}`;
      }

      // Get venue/location name
      let venue = '';
      if (item.location) {
        venue = typeof item.location === 'string' ? item.location : (item.location.name || '');
      } else if (item.library) {
        venue = typeof item.library === 'string' ? item.library : (item.library.name || '');
      }
      if (!venue && item.venues && Array.isArray(item.venues) && item.venues.length > 0) {
        venue = item.venues[0].name || item.venues[0] || '';
      }

      // Use long_description if available, otherwise short description
      const description = (item.long_description || item.description || '').replace(/<[^>]+>/g, '').trim();

      // Build start_time / end_time from raw timestamps
      const startTime = item.raw_start_time || item.start_time || '';
      const endTime = item.raw_end_time || item.end_time || '';

      return {
        name: (item.title || '').trim(),
        eventDate: eventDate,
        venue: venue,
        description: description.substring(0, 1000),
        url: eventUrl,
        audience: audience,
        startTime: startTime,
        endTime: endTime
      };
    }).filter(e => e.name && e.name.length >= 3);

    return events;
  } catch (error) {
    // API not available or returned error — fall back to Puppeteer
    console.log(`   ⚠ API scrape failed (${error.message}) — falling back to Puppeteer`);
    return null;
  }
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

  // ── TRY API FIRST ──────────────────────────────────────────────────────
  // The Communico /eeventcaldata endpoint returns structured JSON without
  // needing Puppeteer. Try it first; fall back to Puppeteer if it fails.
  const apiEvents = await tryApiScrape(library);
  if (apiEvents && apiEvents.length > 0) {
    console.log(`   ✓ Using API data (${apiEvents.length} events)`);

    for (const event of apiEvents) {
      try {
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);
        if (ageRange === 'Adults') { skipped++; continue; }

        let coordinates = null;
        if (event.venue && event.venue.trim()) {
          const countyPart = library.state === 'DC' ? '' : `, ${library.county} County`;
          const fullAddress = `${event.venue}, ${library.city}${countyPart}, ${library.state}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: library.city, zipCode: library.zipCode,
            state: library.state, county: library.county,
            venueName: event.venue, sourceName: library.name
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
          state: library.state,
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: { website: event.url || library.website, phone: '' },
          url: event.url || library.website,
          metadata: {
            source: 'Communico Scraper',
            sourceName: library.name,
            county: library.county,
            state: library.state,
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

        await new Promise(resolve => setTimeout(resolve, 300));
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

    // Wait for Communico event elements to appear
    // Some libraries use standard Communico selectors, others (custom domains) use different ones
    const waitSelectors = '.eelistevent, .em-event-list-item, .event-item, [data-event-id], .program-item, article.node--type-event';
    try {
      await page.waitForSelector(waitSelectors, { timeout: 10000 });
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
            // Avoid duplicating date+time when .eelisttime contains the full date string
            // (e.g. "Wednesday, April 22: 5:45pm - 6:30pm" in both eventDate and time)
            const rawDate = (time && !eventDate.includes(time) && !time.includes(eventDate))
              ? `${eventDate} ${time}` : eventDate;

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

      // FALLBACK 2: Link-based extraction — find event links and extract text from parent cards
      if (events.length === 0) {
        console.log('   ⚠ Still no events — trying link-based extraction');
        events = await page.evaluate(() => {
          const results = [];
          // Look for any links to event/program detail pages
          const links = document.querySelectorAll('a[href*="/event/"], a[href*="/program/"], a[href*="/events/"], a[href*="event_id="]');
          const seen = new Set();

          links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || seen.has(href)) return;
            seen.add(href);

            // Walk up to find the event card container (up to 5 levels)
            let card = link;
            for (let i = 0; i < 5; i++) {
              if (!card.parentElement) break;
              card = card.parentElement;
              // Stop at list-level containers
              if (card.tagName === 'UL' || card.tagName === 'OL' || card.tagName === 'MAIN' || card.id === 'main-content') {
                card = link.parentElement;
                break;
              }
            }

            const title = link.textContent.trim();
            if (!title || title.length < 3 || title.length > 200) return;

            const cardText = card.textContent || '';
            // Try to extract a date from the card text
            const dateMatch = cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)/i)
              || cardText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
            const timeMatch = cardText.match(/(\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:am|pm))?)/i);

            const eventDate = dateMatch ? dateMatch[1].trim() : '';
            const time = timeMatch ? timeMatch[1].trim() : '';
            const rawDate = (time && !eventDate.includes(time) && !time.includes(eventDate))
              ? `${eventDate} ${time}` : eventDate;

            if (title && eventDate) {
              results.push({
                name: title,
                eventDate: rawDate,
                venue: '',
                description: '',
                url: href.startsWith('http') ? href : (href.startsWith('/') ? window.location.origin + href : ''),
                audience: ''
              });
            }
          });
          return results;
        });
        console.log(`   Link-based fallback: found ${events.length} events`);
      }
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

  // Log to database with aggregate + per-site breakdown
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
async function scrapeCommunicoMN() { return scrapeCommunicoLibraries('MN'); }
async function scrapeCommunicoNH() { return scrapeCommunicoLibraries('NH'); }
async function scrapeCommunicoSC() { return scrapeCommunicoLibraries('SC'); }
async function scrapeCommunicoNC() { return scrapeCommunicoLibraries('NC'); }
async function scrapeCommunicoKY() { return scrapeCommunicoLibraries('KY'); }
async function scrapeCommunicoTN() { return scrapeCommunicoLibraries('TN'); }
async function scrapeCommunicoWA() { return scrapeCommunicoLibraries('WA'); }

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
  scrapeCommunicoWI,
  scrapeCommunicoMN,
  scrapeCommunicoNH,
  scrapeCommunicoSC,
  scrapeCommunicoNC,
  scrapeCommunicoKY,
  scrapeCommunicoTN,
  scrapeCommunicoWA
};
