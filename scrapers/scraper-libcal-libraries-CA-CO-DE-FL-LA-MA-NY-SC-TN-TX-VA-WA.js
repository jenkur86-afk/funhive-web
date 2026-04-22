#!/usr/bin/env node

/**
 * LIBCAL MULTI-LIBRARY SCRAPER
 *
 * Scrapes events from libraries using LibCal/Springshare platform
 *
 * COVERAGE (101 library systems across 26 states):
 * CA:
 * - Orange County Public Library
 * - Riverside County Library System
 * - Santa Cruz Public Libraries
 * - San Leandro Public Library
 * - Placer County Library
 * - Sonoma County Library
 * - Anaheim Public Library
 * - Fresno County Public Library
 *
 * CO:
 * - Denver Public Library (NEW)
 * - Douglas County Libraries (NEW)
 * - Boulder Public Library (NEW)
 * - Mesa County Libraries (NEW)
 * - Lafayette Public Library
 *
 * CT:
 * - Bridgeport Public Library
 * - New Haven Free Public Library
 * - Stratford Library
 * - Hartford Public Library (NEW)
 * - East Hartford Public Library (NEW)
 *
 * DE:
 * - Delaware Libraries (all counties via unified calendar)
 *
 * FL:
 * - Lakeland Public Library (Polk County)
 * - Palm Beach County Library System (NEW)
 * - St. Johns County Public Library (NEW)
 * - Seminole County Library (NEW)
 *
 * LA:
 * - Lafayette Public Library
 *
 * MA:
 * - Cambridge Public Library
 * - Newton Free Library (NEW)
 * - Brookline Public Library (NEW)
 *
 * NJ:
 * - BCCLS - Bergen County Cooperative Library System (78 libraries)
 * - Jersey City Free Public Library
 * - Newark Public Library
 * - Monmouth County Library System (NEW)
 * - Mercer County Library System (NEW)
 *
 * NY:
 * - Buffalo & Erie County Public Library
 * - Monroe County Library System
 * - Onondaga County Public Libraries
 * - Northern Onondaga Public Libraries
 * - Westchester Library System
 * - Suffolk Cooperative Library System (NEW)
 * - Nassau Library System (NEW)
 * - Albany Public Library (NEW)
 * - Great Neck Library
 * - Hicksville Public Library
 * - Long Beach Public Library
 * - Garden City Public Library
 * - Baldwin Public Library
 * - North Bellmore Public Library
 * - Levittown Public Library
 * - Plainview-Old Bethpage Public Library
 * - Freeport Memorial Library
 * - Rockville Centre Public Library
 * - Oceanside Public Library
 * - North Merrick Public Library
 * - Wantagh Public Library
 * - East Meadow Public Library
 *
 * GA:
 * - Live Oak Public Libraries (Savannah) (NEW)
 *
 * OH:
 * - Cleveland Public Library
 *
 * NC:
 * - Durham County Library
 * - Wake County Public Libraries
 * - New Hanover County Public Library (Wilmington) (NEW)
 * - Gaston County Public Library (NEW)
 * - Union County Public Library (NEW)
 * - Alamance County Library (NEW)
 * - Brunswick County Public Library (NEW)
 *
 * SC:
 * - Charleston County Public Library
 * - Berkeley County Library System
 * - South Carolina State Library
 *
 * TN:
 * - Clarksville-Montgomery County Public Library
 * - Memphis Public Libraries (NEW)
 * - Knox County Public Library (NEW)
 *
 * TX:
 * - Arlington Public Library
 * - Corpus Christi Public Library
 * - McKinney Public Library
 * - Fort Worth Public Library (added Dec 2025 - migrated from OpenCities)
 *
 * PA:
 * - Carnegie Library of Pittsburgh
 * - Montgomery County-Norristown Public Library
 * - Erie County Public Library
 * - Chester County Library System
 * - Delaware County Library System
 * - Bucks County Free Library (NEW)
 *
 * RI:
 * - Warwick Public Library
 * - Cranston Public Library
 * - East Providence Public Library
 * - West Warwick Public Library
 *
 * IA:
 * - Davenport Public Library
 * - Sioux City Public Library
 *
 * VA:
 * - Arlington County Public Library
 * - Fairfax County Public Library
 *
 * WA:
 * - Spokane County Library District (NEW)
 * - NCW Libraries (NEW)
 * - Whatcom County Library System (NEW)
 *
 * AL (NEW):
 * - Huntsville-Madison County Public Library
 *
 * KY (NEW):
 * - Kenton County Public Library
 * - Boone County Public Library
 *
 * MI (NEW):
 * - Monroe County Library System
 *
 * NH (NEW):
 * - Nashua Public Library
 * - Keene Public Library
 *
 * Usage:
 *   node scripts/scraper-libcal-libraries.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// LibCal Library Systems
const LIBRARY_SYSTEMS = [
  // CALIFORNIA
  {
    name: 'Orange County Public Library',
    url: 'https://ocpl.libcal.com/calendar?cid=-1&t=d&d=0000-00-00&cal=-1&inc=0',
    county: 'Orange',
    state: 'CA',
    website: 'https://www.ocpl.org',
    city: 'Santa Ana',
    zipCode: '92701'
  },

  {
    name: 'Riverside County Library System',
    url: 'https://rivlib.libcal.com/calendar/rcls?cid=15516&t=g&d=0000-00-00&cal=15516&inc&cid=-1&t=d',
    county: 'Riverside',
    state: 'CA',
    website: 'https://www.rivlib.info',
    city: 'Riverside',
    zipCode: '92501'
  },

  // REMOVED: Santa Cruz Public Libraries - migrated to LibNet platform
  // {
  //   name: 'Santa Cruz Public Libraries',
  //   url: 'https://santacruzpl.libcal.com/calendar/SCPL?cid=-1&t=d',
  //   county: 'Santa Cruz',
  //   state: 'CA',
  //   website: 'https://www.santacruzpl.org',
  //   city: 'Santa Cruz',
  //   zipCode: '95060'
  // },

  {
    name: 'San Leandro Public Library',
    url: 'https://sanleandro.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Alameda',
    state: 'CA',
    website: 'https://www.sanleandro.org/depts/lib/',
    city: 'San Leandro',
    zipCode: '94577'
  },
  {
    name: 'Placer County Library',
    url: 'https://placer.libcal.com/calendar?cid=-1&t=d',
    county: 'Placer',
    state: 'CA',
    website: 'https://www.placerlibrary.org',
    city: 'Auburn',
    zipCode: '95603'
  },
  // REMOVED: Sonoma County Library - now uses WordPress at events.sonomalibrary.org
  // {
  //   name: 'Sonoma County Library',
  //   url: 'https://sonomacounty.libcal.com/calendar?cid=-1&t=d',
  //   county: 'Sonoma',
  //   state: 'CA',
  //   website: 'https://sonomalibrary.org',
  //   city: 'Santa Rosa',
  //   zipCode: '95404'
  // },
  {
    name: 'Anaheim Public Library',
    url: 'https://anaheim.libcal.com/calendar?cid=-1&t=d',
    county: 'Orange',
    state: 'CA',
    website: 'https://www.anaheim.net/library',
    city: 'Anaheim',
    zipCode: '92805'
  },
  {
    name: 'Fresno County Public Library',
    url: 'https://fresnolibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Fresno',
    state: 'CA',
    website: 'https://www.fresnolibrary.org',
    city: 'Fresno',
    zipCode: '93721'
  },

  // COLORADO
  {
    name: 'Denver Public Library',
    url: 'https://denverlibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Denver',
    state: 'CO',
    website: 'https://www.denverlibrary.org',
    city: 'Denver',
    zipCode: '80203'
  },

  // Douglas County Libraries - REMOVED: Uses Communico platform, not LibCal
  // {
  //   name: 'Douglas County Libraries',
  //   url: 'https://go.dcl.org/events',
  //   county: 'Douglas',
  //   state: 'CO',
  //   website: 'https://www.dcl.org',
  //   city: 'Castle Rock',
  //   zipCode: '80104'
  // },

  {
    name: 'Boulder Public Library District',
    url: 'https://calendar.boulderlibrary.org',
    county: 'Boulder',
    state: 'CO',
    website: 'https://boulderlibrary.org',
    city: 'Boulder',
    zipCode: '80302'
  },

  {
    name: 'Mesa County Libraries',
    url: 'https://mesacountylibraries.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Mesa',
    state: 'CO',
    website: 'https://mesacountylibraries.org',
    city: 'Grand Junction',
    zipCode: '81501'
  },

  {
    name: 'Lafayette Public Library',
    url: 'https://lafayettepubliclibrary.libcal.com/calendar/main?cid=-1&t=d',
    county: 'Boulder',
    state: 'CO',
    website: 'https://www.cityoflafayette.com/267/Library',
    city: 'Lafayette',
    zipCode: '80026'
  },

  // CONNECTICUT
  {
    name: 'Bridgeport Public Library',
    url: 'https://bportlibrary.libcal.com',
    county: 'Fairfield',
    state: 'CT',
    website: 'https://bportlibrary.org',
    city: 'Bridgeport',
    zipCode: '06604'
  },
  {
    name: 'New Haven Free Public Library',
    url: 'https://nhfpl.libcal.com/calendar?cid=-1&t=d',
    county: 'New Haven',
    state: 'CT',
    website: 'https://nhfpl.org',
    city: 'New Haven',
    zipCode: '06510'
  },
  {
    name: 'Stratford Library',
    url: 'https://stratfordlibrary.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Fairfield',
    state: 'CT',
    website: 'https://www.stratfordlibrary.org',
    city: 'Stratford',
    zipCode: '06615'
  },
  {
    name: 'Hartford Public Library',
    url: 'https://hplct.libcal.com/calendar?cid=-1&t=d',
    county: 'Hartford',
    state: 'CT',
    website: 'https://hplct.org',
    city: 'Hartford',
    zipCode: '06103'
  },
  {
    name: 'East Hartford Public Library',
    url: 'https://easthartfordct.libcal.com/calendar?cid=-1&t=d',
    county: 'Hartford',
    state: 'CT',
    website: 'https://www.easthartfordlibrary.org',
    city: 'East Hartford',
    zipCode: '06108'
  },

  // DELAWARE - All Counties (unfiltered)
  {
    name: 'Delaware Libraries',
    url: 'https://delawarelibraries.libcal.com/calendar/?cid=-1&t=d&d=0000-00-00&cal=-1&inc=0',
    county: 'Delaware',
    state: 'DE',
    website: 'https://lib.de.us',
    city: 'Dover',
    zipCode: '19901'
  },

  // FLORIDA
  {
    name: 'Lakeland Public Library',
    url: 'https://lakelandpl.libcal.com/calendar?cid=2787&t=d&d=0000-00-00&cal=2787&inc=0',
    county: 'Polk',
    state: 'FL',
    website: 'https://www.lakelandgov.net/departments/library/',
    city: 'Lakeland',
    zipCode: '33801'
  },
  {
    name: 'Palm Beach County Library System',
    url: 'https://pbclibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Palm Beach',
    state: 'FL',
    website: 'https://www.pbclibrary.org',
    city: 'West Palm Beach',
    zipCode: '33401'
  },
  {
    name: 'St. Johns County Public Library',
    url: 'https://sjcpls.libcal.com/calendar?cid=-1&t=d',
    county: 'St. Johns',
    state: 'FL',
    website: 'https://www.sjcpls.org',
    city: 'St. Augustine',
    zipCode: '32084'
  },
  {
    name: 'Seminole County Library',
    url: 'https://seminolecountylibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Seminole',
    state: 'FL',
    website: 'https://www.seminolecountylibrary.org',
    city: 'Sanford',
    zipCode: '32771'
  },

  // IOWA
  {
    name: 'Davenport Public Library',
    url: 'https://davenportlibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Scott',
    state: 'IA',
    website: 'https://www.davenportlibrary.com',
    city: 'Davenport',
    zipCode: '52801'
  },
  {
    name: 'Sioux City Public Library',
    url: 'https://siouxcitylibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Woodbury',
    state: 'IA',
    website: 'https://www.siouxcitylibrary.org',
    city: 'Sioux City',
    zipCode: '51101'
  },

  // VIRGINIA
  {
    name: 'Arlington County Public Library',
    url: 'https://arlingtonva.libcal.com/calendar?cid=-1&t=d&d=0000-00-00&cal=-1&inc=0',
    county: 'Arlington',
    state: 'VA',
    website: 'https://library.arlingtonva.us',
    city: 'Arlington',
    zipCode: '22204'
  },

  {
    name: 'Fairfax County Public Library',
    url: 'https://librarycalendar.fairfaxcounty.gov/calendar?cid=6524&t=d&d=0000-00-00&cal=6524&inc=0',
    county: 'Fairfax',
    state: 'VA',
    website: 'https://www.fairfaxcounty.gov/library/',
    city: 'Fairfax',
    zipCode: '22035'
  },

  // LOUISIANA
  {
    name: 'Lafayette Public Library',
    url: 'https://lafayettela.libcal.com/calendar?cid=-1&t=d',
    county: 'Lafayette',
    state: 'LA',
    website: 'https://www.lafayettela.gov/library',
    city: 'Lafayette',
    zipCode: '70501'
  },

  // MASSACHUSETTS
  {
    name: 'Cambridge Public Library',
    url: 'https://cambridgepl.libcal.com',
    county: 'Middlesex',
    state: 'MA',
    website: 'https://www.cambridgema.gov/cpl',
    city: 'Cambridge',
    zipCode: '02138'
  },

  {
    name: 'Newton Free Library',
    url: 'https://newtonfreelibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Middlesex',
    state: 'MA',
    website: 'https://newtonfreelibrary.net',
    city: 'Newton',
    zipCode: '02458'
  },

  {
    name: 'Brookline Public Library',
    url: 'https://brooklinelibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Norfolk',
    state: 'MA',
    website: 'https://www.brooklinelibrary.org',
    city: 'Brookline',
    zipCode: '02445'
  },

  // NEW YORK
  {
    name: 'Buffalo & Erie County Public Library',
    url: 'https://buffalolib.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Erie',
    state: 'NY',
    website: 'https://www.buffalolib.org',
    city: 'Buffalo',
    zipCode: '14203'
  },

  {
    name: 'Monroe County Library System',
    url: 'https://calendar.libraryweb.org/calendar',
    county: 'Monroe',
    state: 'NY',
    website: 'https://www.libraryweb.org',
    city: 'Rochester',
    zipCode: '14614'
  },

  {
    name: 'Onondaga County Public Libraries',
    url: 'https://onlib-central.libcal.com/calendar?cid=-1&t=d',
    county: 'Onondaga',
    state: 'NY',
    website: 'https://www.onlib.org',
    city: 'Syracuse',
    zipCode: '13202'
  },
  {
    name: 'Northern Onondaga Public Libraries',
    url: 'https://onlib-nopl.libcal.com/',
    county: 'Onondaga',
    state: 'NY',
    website: 'https://www.nopl.org',
    city: 'North Syracuse',
    zipCode: '13212'
  },
  {
    name: 'Westchester Library System',
    url: 'https://westchesterlibraries.libcal.com/calendar?cid=-1&t=d',
    county: 'Westchester',
    state: 'NY',
    website: 'https://www.westchesterlibraries.org',
    city: 'White Plains',
    zipCode: '10601'
  },
  {
    name: 'Suffolk Cooperative Library System',
    url: 'https://suffolk.libcal.com/calendar?cid=-1&t=d',
    county: 'Suffolk',
    state: 'NY',
    website: 'https://www.suffolk.lib.ny.us',
    city: 'Bellport',
    zipCode: '11713'
  },
  // REMOVED: Nassau Library System - now uses WordPress at events.nassaulibrary.org
  // {
  //   name: 'Nassau Library System',
  //   url: 'https://nassaulibrary.libcal.com/calendar?cid=-1&t=d',
  //   county: 'Nassau',
  //   state: 'NY',
  //   website: 'https://www.nassaulibrary.org',
  //   city: 'Uniondale',
  //   zipCode: '11553'
  // },
  {
    name: 'Albany Public Library',
    url: 'https://albany.librarycalendar.com/',
    county: 'Albany',
    state: 'NY',
    website: 'https://www.albanypubliclibrary.org',
    city: 'Albany',
    zipCode: '12207'
  },
  {
    name: 'Great Neck Library',
    url: 'https://greatnecklibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://www.greatnecklibrary.org',
    city: 'Great Neck',
    zipCode: '11023'
  },
  {
    name: 'Hicksville Public Library',
    url: 'https://hicksvillelibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://www.hicksvillelibrary.org',
    city: 'Hicksville',
    zipCode: '11801'
  },
  {
    name: 'Long Beach Public Library',
    url: 'https://longbeachpl.librarycalendar.com/',
    county: 'Nassau',
    state: 'NY',
    website: 'https://longbeachlibrary.org',
    city: 'Long Beach',
    zipCode: '11561'
  },
  {
    name: 'Garden City Public Library',
    url: 'https://gardencitypl.libcal.com/',
    county: 'Nassau',
    state: 'NY',
    website: 'https://gardencitypl.org',
    city: 'Garden City',
    zipCode: '11530'
  },
  {
    name: 'Freeport Memorial Library',
    url: 'https://freeportlibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://freeportlibrary.org',
    city: 'Freeport',
    zipCode: '11520'
  },
  {
    name: 'Rockville Centre Public Library',
    url: 'https://rvcpl.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://rvclibrary.org',
    city: 'Rockville Centre',
    zipCode: '11570'
  },
  {
    name: 'Oceanside Public Library',
    url: 'https://oceansidelibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://oceansidelibrary.org',
    city: 'Oceanside',
    zipCode: '11572'
  },
  {
    name: 'North Merrick Public Library',
    url: 'https://nmerricklibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://nmerricklibrary.org',
    city: 'North Merrick',
    zipCode: '11566'
  },
  {
    name: 'Wantagh Public Library',
    url: 'https://wantaghlibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://wantaghlibrary.org',
    city: 'Wantagh',
    zipCode: '11793'
  },
  {
    name: 'East Meadow Public Library',
    url: 'https://eastmeadow.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://eastmeadowlibrary.org',
    city: 'East Meadow',
    zipCode: '11554'
  },
  {
    name: 'Baldwin Public Library',
    url: 'https://baldwinlib.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://www.baldwinlib.org',
    city: 'Baldwin',
    zipCode: '11510'
  },
  {
    name: 'North Bellmore Public Library',
    url: 'https://northbellmorelibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Nassau',
    state: 'NY',
    website: 'https://northbellmorelibrary.org',
    city: 'North Bellmore',
    zipCode: '11710'
  },
  {
    name: 'Levittown Public Library',
    url: 'https://levittown.librarycalendar.com/',
    county: 'Nassau',
    state: 'NY',
    website: 'https://levittownpl.org',
    city: 'Levittown',
    zipCode: '11756'
  },
  {
    name: 'Plainview-Old Bethpage Public Library',
    url: 'https://poblib.librarycalendar.com/',
    county: 'Nassau',
    state: 'NY',
    website: 'https://www.poblib.org',
    city: 'Plainview',
    zipCode: '11803'
  },

  // NEW JERSEY
  {
    name: 'BCCLS - Bergen County Cooperative Library System',
    url: 'https://bccls.libcal.com/calendar/bccls/?cid=-1&t=m&d=0000-00-00&cal=-1&inc=0',
    county: 'Bergen',
    state: 'NJ',
    website: 'https://www.bccls.org',
    city: 'Paramus',
    zipCode: '07652'
  },
  {
    name: 'Jersey City Free Public Library',
    url: 'https://jclibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Hudson',
    state: 'NJ',
    website: 'https://jclibrary.org',
    city: 'Jersey City',
    zipCode: '07302'
  },
  {
    name: 'Newark Public Library',
    url: 'https://npl.libcal.com/calendar?cid=-1&t=d',
    county: 'Essex',
    state: 'NJ',
    website: 'https://www.npl.org',
    city: 'Newark',
    zipCode: '07102'
  },
  {
    name: 'Monmouth County Library System',
    url: 'https://monmouthcountylib.libcal.com/calendar?cid=-1&t=d',
    county: 'Monmouth',
    state: 'NJ',
    website: 'https://monmouthcountylib.org',
    city: 'Manalapan',
    zipCode: '07726'
  },
  {
    name: 'Mercer County Library System',
    url: 'https://events.mcl.org/',
    county: 'Mercer',
    state: 'NJ',
    website: 'https://www.mcl.org',
    city: 'Trenton',
    zipCode: '08618'
  },
  // Burlington County Library System - REMOVED: bcls-nj.libcal.com is a room booking system, not events calendar
  // {
  //   name: 'Burlington County Library System',
  //   url: 'https://bcls-nj.libcal.com/',
  //   county: 'Burlington',
  //   state: 'NJ',
  //   website: 'https://bcls.lib.nj.us/',
  //   city: 'Westampton',
  //   zipCode: '08060'
  // },

  // NORTH CAROLINA
  {
    name: 'Durham County Library',
    url: 'https://durhamcountylibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Durham',
    state: 'NC',
    website: 'https://www.durhamcountylibrary.org',
    city: 'Durham',
    zipCode: '27701'
  },
  // REMOVED: Wake County Public Libraries - now uses Eventbrite at wake.gov/events
  // {
  //   name: 'Wake County Public Libraries',
  //   url: 'https://wakegov.libcal.com/calendar?cid=-1&t=d',
  //   county: 'Wake',
  //   state: 'NC',
  //   website: 'https://www.wake.gov/departments-government/libraries',
  //   city: 'Raleigh',
  //   zipCode: '27601'
  // },
  {
    name: 'New Hanover County Public Library',
    url: 'https://libcal.nhcgov.com/calendar/nhcpl',
    county: 'New Hanover',
    state: 'NC',
    website: 'https://www.nhcgov.com/2628/Library',
    city: 'Wilmington',
    zipCode: '28401'
  },
  {
    name: 'Gaston County Public Library',
    url: 'https://gastonlibrary.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Gaston',
    state: 'NC',
    website: 'https://www.gastongov.com/183/Public-Library',
    city: 'Gastonia',
    zipCode: '28052'
  },
  {
    name: 'Union County Public Library',
    url: 'https://union-nc.libcal.com/',
    county: 'Union',
    state: 'NC',
    website: 'https://www.uclnc.org',
    city: 'Monroe',
    zipCode: '28110'
  },
  {
    name: 'Alamance County Library',
    url: 'https://alamancelibraries.libcal.com/calendars?cid=-1&t=g&d=0000-00-00&cal=-1&inc=0',
    county: 'Alamance',
    state: 'NC',
    website: 'https://library.alamancecountync.gov',
    city: 'Burlington',
    zipCode: '27215'
  },
  {
    name: 'Brunswick County Public Library',
    url: 'https://brunsco.libcal.com/',
    county: 'Brunswick',
    state: 'NC',
    website: 'https://www.brunswickcountync.gov/160/Library',
    city: 'Bolivia',
    zipCode: '28422'
  },

  // GEORGIA
  // REMOVED: Live Oak Public Libraries - now uses Eventpace at spaces.liveoakpl.org
  // {
  //   name: 'Live Oak Public Libraries',
  //   url: 'https://libcal.liveoakpl.org/calendar/programs',
  //   county: 'Chatham',
  //   state: 'GA',
  //   website: 'https://www.liveoakpl.org',
  //   city: 'Savannah',
  //   zipCode: '31401'
  // },

  // OHIO
  {
    name: 'Cleveland Public Library',
    url: 'https://cpl.libcal.com/calendar/events/?cid=8758&t=g&d=0000-00-00&cal=8758&cid=-1&t=d',
    county: 'Cuyahoga',
    state: 'OH',
    website: 'https://cpl.org',
    city: 'Cleveland',
    zipCode: '44114'
  },

  // PENNSYLVANIA
  // REMOVED: Carnegie Library of Pittsburgh - now uses WordPress Events Calendar at carnegielibrary.org/events
  // {
  //   name: 'Carnegie Library of Pittsburgh',
  //   url: 'https://carnegielibrary.libcal.com/calendar?cid=-1&t=d',
  //   county: 'Allegheny',
  //   state: 'PA',
  //   website: 'https://www.carnegielibrary.org',
  //   city: 'Pittsburgh',
  //   zipCode: '15213'
  // },
  {
    name: 'Montgomery County-Norristown Public Library',
    url: 'https://mnl.libcal.com/calendar?cid=-1&t=d',
    county: 'Montgomery',
    state: 'PA',
    website: 'https://www.mc-norristown.lib.pa.us',
    city: 'Norristown',
    zipCode: '19401'
  },
  {
    name: 'Erie County Public Library',
    url: 'https://events.erielibrary.org/',
    county: 'Erie',
    state: 'PA',
    website: 'https://www.erielibrary.org',
    city: 'Erie',
    zipCode: '16501'
  },
  {
    name: 'Chester County Library System',
    url: 'https://ccls.libcal.com/calendar/ChesterCountyLibrary?cid=-1&t=d',
    county: 'Chester',
    state: 'PA',
    website: 'https://www.ccls.org',
    city: 'Exton',
    zipCode: '19341'
  },
  {
    name: 'Delaware County Library System',
    url: 'https://delcolibraries.libcal.com/calendar?cid=-1&t=d',
    county: 'Delaware',
    state: 'PA',
    website: 'https://www.delcolibraries.org',
    city: 'Media',
    zipCode: '19063'
  },
  {
    name: 'Bucks County Free Library',
    url: 'https://calendar.buckslib.org/',
    county: 'Bucks',
    state: 'PA',
    website: 'https://www.buckslib.org',
    city: 'Doylestown',
    zipCode: '18901'
  },

  // RHODE ISLAND
  {
    name: 'Warwick Public Library',
    url: 'https://warwicklibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Kent',
    state: 'RI',
    website: 'https://www.warwicklibrary.org',
    city: 'Warwick',
    zipCode: '02886'
  },
  {
    name: 'Cranston Public Library',
    url: 'https://events.cranstonlibrary.org/calendar/events',
    county: 'Providence',
    state: 'RI',
    website: 'https://www.cranstonlibrary.org',
    city: 'Cranston',
    zipCode: '02920'
  },
  {
    name: 'East Providence Public Library',
    url: 'https://eplib.libcal.com/calendar?cid=-1&t=d',
    county: 'Providence',
    state: 'RI',
    website: 'https://www.eastprovidencelibrary.org',
    city: 'East Providence',
    zipCode: '02914'
  },
  {
    name: 'West Warwick Public Library',
    url: 'https://wwpl.libcal.com/calendar/WWPL?cid=-1&t=d',
    county: 'Kent',
    state: 'RI',
    website: 'https://www.westwarwicklibrary.org',
    city: 'West Warwick',
    zipCode: '02893'
  },

  // SOUTH CAROLINA
  {
    name: 'Charleston County Public Library',
    url: 'https://ccplsc.libcal.com/calendar?cid=-1&t=d',
    county: 'Charleston',
    state: 'SC',
    website: 'https://www.ccpl.org',
    city: 'Charleston',
    zipCode: '29401'
  },
  {
    name: 'Berkeley County Library System',
    url: 'https://berkeleylibrarysc.libcal.com/calendar?cid=-1&t=d',
    county: 'Berkeley',
    state: 'SC',
    website: 'https://www.berkeleylibrarysc.org',
    city: 'Moncks Corner',
    zipCode: '29461'
  },
  {
    name: 'South Carolina State Library',
    url: 'https://statelibrary.sc.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Richland',
    state: 'SC',
    website: 'https://www.statelibrary.sc.gov',
    city: 'Columbia',
    zipCode: '29201'
  },

  // TENNESSEE
  {
    name: 'Clarksville-Montgomery County Public Library',
    url: 'https://mcgtn.libcal.com/calendar?cid=14859',
    county: 'Montgomery',
    state: 'TN',
    website: 'https://www.clarksvillelibrary.org',
    city: 'Clarksville',
    zipCode: '37040'
  },
  {
    name: 'Memphis Public Libraries',
    url: 'https://memphislibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Shelby',
    state: 'TN',
    website: 'https://www.memphislibrary.org',
    city: 'Memphis',
    zipCode: '38103'
  },
  {
    name: 'Knox County Public Library',
    url: 'https://knoxlib.libcal.com/calendar?cid=-1&t=d',
    county: 'Knox',
    state: 'TN',
    website: 'https://www.knoxlibrary.org',
    city: 'Knoxville',
    zipCode: '37902'
  },

  // TEXAS
  {
    name: 'Arlington Public Library',
    url: 'https://arlingtontx.libcal.com/calendar?cid=-1&t=d',
    county: 'Tarrant',
    state: 'TX',
    website: 'https://arlingtontx.gov/library',
    city: 'Arlington',
    zipCode: '76010'
  },

  {
    name: 'Corpus Christi Public Library',
    url: 'https://cctexas.libcal.com/calendar?cid=-1&t=d',
    county: 'Nueces',
    state: 'TX',
    website: 'https://www.cctexas.com/departments/library',
    city: 'Corpus Christi',
    zipCode: '78401'
  },

  {
    name: 'McKinney Public Library',
    url: 'https://mckinneytexas.libcal.com/calendar?cid=-1&t=d',
    county: 'Collin',
    state: 'TX',
    website: 'https://www.mckinneytexas.org/350/Public-Library',
    city: 'McKinney',
    zipCode: '75069'
  },

  {
    name: 'Fort Worth Public Library',
    url: 'https://fortworthtexas.libcal.com/calendar?cid=-1&t=g&d=0000-00-00&cal=-1&inc=0',
    county: 'Tarrant',
    state: 'TX',
    website: 'https://www.fortworthtexas.gov/departments/library',
    city: 'Fort Worth',
    zipCode: '76102'
  },

  // WEST VIRGINIA — removed: WV Library Commission has no events ("No events are scheduled")
  // WV libraries are covered by scraper-wordpress-libraries-wv.js and scraper-custom-drupal-libraries-GA-NC-SC-WV.js

  // ALABAMA
  {
    name: 'Huntsville-Madison County Public Library',
    url: 'https://hmcpl.libcal.com/calendar?cid=-1&t=d',
    county: 'Madison',
    state: 'AL',
    website: 'https://www.hmcpl.org',
    city: 'Huntsville',
    zipCode: '35801'
  },

  // KENTUCKY
  {
    name: 'Kenton County Public Library',
    url: 'https://kentonlibrary.libcal.com/calendar?cid=-1&t=d',
    county: 'Kenton',
    state: 'KY',
    website: 'https://www.kentonlibrary.org',
    city: 'Covington',
    zipCode: '41011'
  },
  {
    name: 'Boone County Public Library',
    url: 'https://bcpl.libcal.com/calendar?cid=-1&t=d',
    county: 'Boone',
    state: 'KY',
    website: 'https://www.bcpl.org',
    city: 'Burlington',
    zipCode: '41005'
  },

  // MICHIGAN
  {
    name: 'Monroe County Library System',
    url: 'https://mymcls.libcal.com/calendar?cid=-1&t=d',
    county: 'Monroe',
    state: 'MI',
    website: 'https://www.mymcls.org',
    city: 'Monroe',
    zipCode: '48161'
  },

  // NEW HAMPSHIRE
  {
    name: 'Nashua Public Library',
    url: 'https://nashualibrary.libcal.com/calendar/events',
    county: 'Hillsborough',
    state: 'NH',
    website: 'https://www.nashunh.gov/library',
    city: 'Nashua',
    zipCode: '03060'
  },
  {
    name: 'Keene Public Library',
    url: 'https://keenenh.libcal.com/calendar',
    county: 'Cheshire',
    state: 'NH',
    website: 'https://www.ci.keene.nh.us/library',
    city: 'Keene',
    zipCode: '03431'
  },

  // WASHINGTON
  {
    name: 'Spokane County Library District',
    url: 'https://scld.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Spokane',
    state: 'WA',
    website: 'https://www.scld.org',
    city: 'Spokane Valley',
    zipCode: '99016'
  },

  {
    name: 'North Central Regional Library (NCW Libraries)',
    url: 'https://ncwlibraries.libcal.com',
    county: 'Chelan',
    state: 'WA',
    website: 'https://www.ncwlibraries.org',
    city: 'Wenatchee',
    zipCode: '98801'
  },

  {
    name: 'Whatcom County Library System',
    url: 'https://wcls.libcal.com/calendar/events?cid=-1&t=d',
    county: 'Whatcom',
    state: 'WA',
    website: 'https://www.wcls.org',
    city: 'Bellingham',
    zipCode: '98225'
  }
];

// Note: geocodeAddress is now imported from geocoding-helper.js with fallback support

// Scrape events from LibCal library
async function scrapeLibraryEvents(library, browser) {
  // Bright cyan separator for each new site
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // OPTIMIZED: Faster page load strategy
    await page.goto(library.url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Wait for LibCal to load events (AJAX)
    // LibCal uses JavaScript templates - need enough time for AJAX to complete
    await page.waitForSelector('body', { timeout: 5000 });

    // Try to wait for event cards to appear (with fallback timeout)
    try {
      await page.waitForSelector('.s-lc-eventcard, .s-lc-c-evt', { timeout: 8000 });
    } catch (e) {
      // No events or slow load - continue anyway
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // Extra buffer for JS rendering

    // Extract events
    const events = await page.evaluate(() => {
      const results = [];

      // LibCal selectors (multiple variations)
      const selectors = [
        '.event-card',                  // librarycalendar.com format (Albany, Long Beach, Levittown, etc.)
        'article.lc-event',             // librarycalendar.com article format
        '.s-lc-c-evt',                 // LibCal list view event
        '.s-lc-eventcard',              // LibCal card view event
        '.s-lc-evt',                    // LibCal alternate event format
        '.s-lc-mc-evt',                // LibCal monthly calendar view (Lafayette LA, etc.)
        'article.event',                // Generic event article
        '.event-item',                  // Alternative
        '[data-event-id]'               // Data attribute
      ];

      let eventElements = [];
      for (const selector of selectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      eventElements.forEach(el => {
        try {
          // Extract title - try each selector until we find one with actual text
          const titleSelectors = ['.s-lc-eventcard-title', '.s-lc-evt-title', '.lc-event__title', 'h2', 'h3', 'h4', '.event-title', 'a[href*="event"]'];
          let title = '';
          for (const sel of titleSelectors) {
            const titleEl = el.querySelector(sel);
            if (titleEl) {
              const text = titleEl.textContent.trim();
              if (text) {
                title = text;
                break;
              }
            }
          }
          if (!title) return;

          // Extract link
          const linkEl = el.querySelector('a[href*="event"], a');
          const url = linkEl ? linkEl.href : '';

          // Get all text and normalize
          const fullText = el.textContent.replace(/\s+/g, ' ').trim();

          // Extract date - LibCal formats
          let eventDate = '';
          const currentYear = new Date().getFullYear();
          const datePatterns = [
            /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?/i,  // "Friday, November 7, 2025"
            /\w{3,9}\s+\d{1,2},?\s+\d{4}/i,  // "November 7, 2025"
            /\d{1,2}\/\d{1,2}\/\d{4}/,        // "11/7/2025"
            /\w{3}\s+\d{1,2},?\s+\d{4}/i,    // "Nov 7, 2025"
            /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\s+\d{4}\b/i,  // "JAN 22 2026" (librarycalendar.com)
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i  // "Dec 22" (no year - LibCal card view)
          ];

          for (const pattern of datePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              eventDate = match[0];
              // If no year in the date, add current year
              if (!/\d{4}/.test(eventDate)) {
                eventDate = eventDate + ', ' + currentYear;
              }
              break;
            }
          }

          // For monthly calendar view (.s-lc-mc-evt), date is in a separate header row
          if (!eventDate && el.classList.contains('s-lc-mc-evt')) {
            // Find the parent TD cell
            let td = el.closest('td');
            if (td && td.classList.contains('s-lc-desktop-only')) {
              // Get column index among desktop-only cells in the row
              const row = td.parentElement;
              const desktopCells = row.querySelectorAll('td.s-lc-desktop-only');
              let colIndex = -1;
              desktopCells.forEach((c, i) => { if (c === td) colIndex = i; });

              // Find the nearest date row above and get the corresponding date cell
              if (colIndex >= 0) {
                const tbody = row.closest('tbody');
                const allRows = Array.from(tbody.querySelectorAll('tr'));
                const rowIndex = allRows.indexOf(row);

                for (let i = rowIndex - 1; i >= 0; i--) {
                  const prevRow = allRows[i];
                  if (prevRow.classList.contains('s-lc-mc-date-row') &&
                      prevRow.classList.contains('s-lc-desktop-only')) {
                    const dateCells = prevRow.querySelectorAll('td');
                    if (dateCells[colIndex]) {
                      const dateText = dateCells[colIndex].textContent.trim();
                      // Date format is "Jan 24" or "Dec 31"
                      const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
                      if (dateMatch) {
                        eventDate = dateMatch[0] + ', ' + currentYear;
                      }
                    }
                    break;
                  }
                }
              }
            }
          }

          // Extract time
          let time = '';
          const timeMatch = fullText.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/i) ||
                           fullText.match(/All day/i);
          if (timeMatch) time = timeMatch[0];

          // Extract location/venue (stop at Audience:, Categories:, or period)
          let location = '';
          const locationMatch = fullText.match(/(?:Location|Branch|Library|Venue):\s*([^.]+?)(?=\s+Audience:|\s+Categories:|$)/i);
          if (locationMatch) {
            location = locationMatch[1].trim().split(/\n|,/)[0];
            // Filter out metadata fields captured as location (e.g., "Audience: Teens")
            if (/^(Audience|Categories|Ages?|Date|Time|Cost|Price|Free|Register|Contact):/i.test(location)) {
              location = '';
            }
          }

          // Extract age range
          let ageRange = 'All Ages';
          if (fullText.match(/baby|infant/i)) ageRange = 'Babies & Toddlers (0-2)';
          else if (fullText.match(/toddler|preschool/i)) ageRange = 'Preschool (3-5)';
          else if (fullText.match(/children|kids|ages 6|elementary/i)) ageRange = 'Children (6-12)';
          else if (fullText.match(/teen|ages 13|middle school|high school/i)) ageRange = 'Teens (13-17)';
          else if (fullText.match(/adult|seniors/i)) ageRange = 'Adults';

          // Extract description
          const descEl = el.querySelector('.s-lc-eventcard-desc, .event-description, p, .description');
          const description = descEl ? descEl.textContent.trim() : fullText.substring(0, 200);

          if (title && eventDate) {
            // Combine date and time
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: description,
              url: url,
              ageRange: ageRange
            });
          }
        } catch (err) {
          console.log('Error parsing event:', err);
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Skip events with no name or placeholder names
        if (!event.name || !event.name.trim()) {
          skipped++;
          continue;
        }

        // Skip CLOSED / closure entries (e.g., "CLOSED", "Library Closed", "Closed for Holiday")
        if (/^\s*closed\b/i.test(event.name) || /\bclosed\s*$/i.test(event.name) || /^(library|branch)?\s*closed/i.test(event.name)) {
          console.log(`  ⏭️ Skipping closure entry: "${event.name}"`);
          skipped++;
          continue;
        }

        // Skip adult-only events
        if (event.ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Clean venue name: remove metadata suffixes like "Room: ...", "Age Group: ...", "Program Type: ..."
        if (event.venue) {
          event.venue = event.venue
            .replace(/\s*Room:\s*.*/i, '')
            .replace(/\s*Age Group:\s*.*/i, '')
            .replace(/\s*Program Type:\s*.*/i, '')
            .replace(/\s*Audience:\s*.*/i, '')
            .replace(/\s*Categories:\s*.*/i, '')
            .trim();
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

        // Normalize the date string
        const normalizedDate = normalizeDateString(event.eventDate) || event.eventDate;

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: event.ageRange,
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
            source: 'LibCal Scraper',
            sourceName: library.name,
            county: library.county,
            state: library.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: event.ageRange
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
          console.log(`  ✅ ${event.name}`);
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

  return { imported, skipped, failed };
}

// Main scraper function - now supports state filtering and batching
async function scrapeLibCalLibraries(stateFilter = null, batchNumber = null) {
  // Filter libraries by state if specified
  let libraries = stateFilter
    ? LIBRARY_SYSTEMS.filter(lib => lib.state === stateFilter)
    : LIBRARY_SYSTEMS;

  // Handle NY batching (22 libraries split into 2 batches)
  if (stateFilter === 'NY' && batchNumber !== null) {
    const midpoint = Math.ceil(libraries.length / 2);
    if (batchNumber === 1) {
      libraries = libraries.slice(0, midpoint);
    } else if (batchNumber === 2) {
      libraries = libraries.slice(midpoint);
    }
  }

  const stateInfo = stateFilter
    ? (batchNumber ? `State: ${stateFilter} (Batch ${batchNumber})` : `State: ${stateFilter}`)
    : 'All States';

  console.log('\n📚 LIBCAL LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log(`${stateInfo} - ${libraries.length} libraries`);
  console.log('='.repeat(60) + '\n');

  if (libraries.length === 0) {
    console.log(`⚠️ No libraries found for: ${stateInfo}`);

    // Log scraper stats to Firestore with state-specific name
    const scraperName = stateFilter ? `LibCal-${stateFilter}` : 'LibCal-All';
    await logScraperResult(scraperName, {
      found: 0,
      new: 0,
      duplicates: 0
    }, { dataType: 'events' });

    return { imported: 0, skipped: 0, failed: 0 };
  }

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Create logger with per-site tracking
  const scraperName = stateFilter ? `LibCal-${stateFilter}` : 'LibCal-All';
  const logger = new ScraperLogger(scraperName, 'events', {
    state: stateFilter,
    source: 'libcal'
  });

  const browser = await launchBrowser();

  try {
    for (const library of libraries) {
      // Start tracking this site
      logger.startSite(library.name, library.eventsUrl, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, skipped, failed } = await scrapeLibraryEvents(library, browser);
        totalImported += imported;
        totalSkipped += skipped;
        totalFailed += failed;

        // Track per-site stats
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });

      } catch (error) {
        console.error(`  ❌ Error processing ${library.name}:`, error.message);
        logger.trackError(error);
        totalFailed++;
      }

      // End tracking this site
      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ LIBCAL SCRAPER COMPLETE - ${stateInfo}\n`);
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to Firestore with per-site breakdown
  await logger.finish();

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// State-specific wrapper functions for Cloud Functions
async function scrapeLibCalCA() { return scrapeLibCalLibraries('CA'); }
async function scrapeLibCalCO() { return scrapeLibCalLibraries('CO'); }
async function scrapeLibCalCT() { return scrapeLibCalLibraries('CT'); }
async function scrapeLibCalDE() { return scrapeLibCalLibraries('DE'); }
async function scrapeLibCalFL() { return scrapeLibCalLibraries('FL'); }
async function scrapeLibCalGA() { return scrapeLibCalLibraries('GA'); }
async function scrapeLibCalIA() { return scrapeLibCalLibraries('IA'); }
async function scrapeLibCalLA() { return scrapeLibCalLibraries('LA'); }
async function scrapeLibCalMA() { return scrapeLibCalLibraries('MA'); }
async function scrapeLibCalNC() { return scrapeLibCalLibraries('NC'); }
async function scrapeLibCalNJ() { return scrapeLibCalLibraries('NJ'); }
async function scrapeLibCalNY1() { return scrapeLibCalLibraries('NY', 1); }
async function scrapeLibCalNY2() { return scrapeLibCalLibraries('NY', 2); }
async function scrapeLibCalOH() { return scrapeLibCalLibraries('OH'); }
async function scrapeLibCalPA() { return scrapeLibCalLibraries('PA'); }
async function scrapeLibCalRI() { return scrapeLibCalLibraries('RI'); }
async function scrapeLibCalSC() { return scrapeLibCalLibraries('SC'); }
async function scrapeLibCalTN() { return scrapeLibCalLibraries('TN'); }
async function scrapeLibCalTX() { return scrapeLibCalLibraries('TX'); }
async function scrapeLibCalVA() { return scrapeLibCalLibraries('VA'); }
async function scrapeLibCalWA() { return scrapeLibCalLibraries('WA'); }
// scrapeLibCalWV removed — WV Library Commission has no events

// Run if executed directly
if (require.main === module) {
  scrapeLibCalLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeLibCalLibraries,
  // State-specific exports
  scrapeLibCalCA,
  scrapeLibCalCO,
  scrapeLibCalCT,
  scrapeLibCalDE,
  scrapeLibCalFL,
  scrapeLibCalGA,
  scrapeLibCalIA,
  scrapeLibCalLA,
  scrapeLibCalMA,
  scrapeLibCalNC,
  scrapeLibCalNJ,
  scrapeLibCalNY1,
  scrapeLibCalNY2,
  scrapeLibCalOH,
  scrapeLibCalPA,
  scrapeLibCalRI,
  scrapeLibCalSC,
  scrapeLibCalTN,
  scrapeLibCalTX,
  scrapeLibCalVA,
  scrapeLibCalWA
  // scrapeLibCalWV removed — WV Library Commission has no events
};
