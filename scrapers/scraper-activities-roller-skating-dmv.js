#!/usr/bin/env node

/**
 * ROLLER SKATING RINKS DMV ACTIVITIES SCRAPER
 *
 * Adds roller skating rinks and inline skating venues to the
 * activities collection. Focuses on family skating sessions
 * and kids programs.
 *
 * Coverage:
 * - Roller skating rinks
 * - Family skate sessions
 * - Birthday party venues
 * - Skate lessons
 *
 * Usage:
 *   node scraper-activities-roller-skating-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledRollerSkatingDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'RollerSkating-Eastern';

// ==========================================
// VENUE DATA - DMV Roller Skating Rinks
// ==========================================

const ROLLER_SKATING_RINKS = [
  // MARYLAND
  {
    name: 'Skate Zone Fun Center',
    address: '5929 E Virginia Beach Boulevard',
    city: 'Dundalk',
    state: 'MD',
    zipCode: '21222',
    latitude: 39.2718,
    longitude: -76.4978,
    phone: '(410) 285-7272',
    website: 'https://skatezone.fun',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 1pm-5pm',
    county: 'Baltimore County',
    description: 'Roller skating rink with family sessions, birthday parties, and skating lessons. DJ nights and themed events.',
    cost: '$10-15/session, Skate rental $4',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'family-sessions', 'birthday-parties', 'lessons', 'dj-nights', 'snack-bar'],
  },
  {
    name: 'Wheaton Ice Arena Roller Skating',
    address: '11717 Orebaugh Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0518,
    longitude: -77.0548,
    phone: '(301) 649-3640',
    website: 'https://www.montgomeryparks.org/facilities/ice-arenas/wheaton-ice-arena/',
    hours: 'Check schedule for roller sessions',
    county: 'Montgomery County',
    description: 'Montgomery Parks facility offering roller skating sessions during summer months. Family-friendly with affordable rates.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'seasonal', 'family-sessions', 'parks-department', 'affordable'],
  },
  {
    name: 'Sportland America',
    address: '7015 Arundel Mills Circle',
    city: 'Hanover',
    state: 'MD',
    zipCode: '21076',
    latitude: 39.1618,
    longitude: -76.7218,
    phone: '(410) 609-0900',
    website: 'https://sportlandamerica.com',
    hours: 'Mon-Thu 11am-9pm, Fri-Sat 10am-11pm, Sun 10am-9pm',
    county: 'Anne Arundel County',
    description: 'Family entertainment center with roller skating, laser tag, arcade, and more. Regular family skate sessions.',
    cost: '$12-18/activity',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'entertainment-complex',
    features: ['roller-skating', 'laser-tag', 'arcade', 'family-sessions', 'birthday-parties'],
  },
  {
    name: 'Laurel Skateland',
    address: '9501 Gerwig Lane',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21046',
    latitude: 39.1818,
    longitude: -76.8118,
    phone: '(410) 792-5678',
    website: 'https://laurelskateland.com',
    hours: 'Fri 7pm-11pm, Sat 12pm-4pm & 7pm-11pm, Sun 1pm-5pm',
    county: 'Howard County',
    description: 'Classic roller skating rink with family sessions and adult nights. Birthday party packages and group events.',
    cost: '$10-14/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'family-sessions', 'adult-nights', 'birthday-parties', 'lessons'],
  },
  {
    name: 'Skate Frederick',
    address: '1215 E Patrick Street',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21701',
    latitude: 39.4118,
    longitude: -77.3918,
    phone: '(301) 695-0800',
    website: 'https://skatefrederick.com',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 1pm-5pm',
    county: 'Frederick County',
    description: 'Family roller skating rink with open skate, lessons, and private parties. Affordable family entertainment.',
    cost: '$8-12/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'family-sessions', 'birthday-parties', 'lessons', 'affordable'],
  },
  {
    name: 'Roller Dome at Prince George\'s Stadium',
    address: '4601 Donnell Drive',
    city: 'Forestville',
    state: 'MD',
    zipCode: '20747',
    latitude: 38.8458,
    longitude: -76.8718,
    phone: '(301) 420-1600',
    website: 'https://pgparks.com',
    hours: 'Check seasonal schedule',
    county: "Prince George's County",
    description: 'Outdoor roller skating venue at sports complex. Seasonal family skating with affordable county rates.',
    cost: '$5-8/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'outdoor', 'seasonal', 'parks-department', 'affordable'],
  },

  // VIRGINIA
  {
    name: 'Dulles SkateQuest',
    address: '21770 Beaumeade Circle',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0418,
    longitude: -77.4878,
    phone: '(703) 858-9020',
    website: 'https://skatequest.com',
    hours: 'See schedule for public sessions',
    county: 'Loudoun County',
    description: 'Roller skating and ice skating dual facility. Family skate sessions, birthday parties, and skating camps.',
    cost: '$10-15/session, Skate rental $4',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'skating-complex',
    features: ['roller-skating', 'ice-skating', 'family-sessions', 'birthday-parties', 'camps'],
  },
  {
    name: 'Skate N Fun Zone',
    address: '7878 Sudley Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7718,
    longitude: -77.4578,
    phone: '(703) 361-7465',
    website: 'https://skatenfunzone.com',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 1pm-5pm',
    county: 'Prince William County',
    description: 'Roller skating rink with arcade and laser tag. Family fun center with skating lessons and birthday parties.',
    cost: '$10-14/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'entertainment-complex',
    features: ['roller-skating', 'arcade', 'laser-tag', 'family-sessions', 'birthday-parties', 'lessons'],
  },
  {
    name: 'Cavalier Family Skating Center',
    address: '9100 Centreville Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20110',
    latitude: 38.7978,
    longitude: -77.4878,
    phone: '(703) 369-9100',
    website: 'https://cavalierskating.com',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 2pm-5pm',
    county: 'Prince William County',
    description: 'Family roller skating rink with toddler skate, family sessions, and teen nights. Birthday party packages.',
    cost: '$8-12/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'toddler-skate', 'family-sessions', 'teen-nights', 'birthday-parties'],
  },
  {
    name: 'Springfield Skate Park',
    address: '6601 Industrial Road',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22151',
    latitude: 38.7878,
    longitude: -77.1818,
    phone: '(703) 354-7222',
    website: 'https://springfieldskatepark.com',
    hours: 'Check schedule for sessions',
    county: 'Fairfax County',
    description: 'Indoor skate park with roller skating and skateboarding. Family sessions and lessons available.',
    cost: '$10-15/session',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'skate-park',
    features: ['roller-skating', 'skateboarding', 'lessons', 'family-sessions'],
  },
  {
    name: 'Rink at Park Place',
    address: '6260 Old Dominion Drive',
    city: 'McLean',
    state: 'VA',
    zipCode: '22101',
    latitude: 38.9218,
    longitude: -77.1458,
    phone: '(703) 556-5599',
    website: 'https://thejstreetmclean.com',
    hours: 'Seasonal - check schedule',
    county: 'Fairfax County',
    description: 'Seasonal outdoor skating at Park Place retail center. Ice skating in winter, roller skating in summer.',
    cost: '$10-15/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'outdoor-rink',
    features: ['roller-skating', 'ice-skating', 'outdoor', 'seasonal', 'shopping-center'],
  },

  // DC
  {
    name: 'Canal Park Roller Rink',
    address: '200 M Street SE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20003',
    latitude: 38.8768,
    longitude: -77.0068,
    phone: '(202) 505-9422',
    website: 'https://canalparkdc.org',
    hours: 'Seasonal - May to September',
    county: 'District of Columbia',
    description: 'Outdoor roller skating at Capitol Riverfront. Seasonal skating rink with rentals and lessons. Free to skate with own equipment.',
    cost: '$8-15/session, Rentals $5',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'outdoor-rink',
    features: ['roller-skating', 'outdoor', 'seasonal', 'waterfront', 'lessons'],
  },
  {
    name: 'Martin Luther King Jr. Recreation Center',
    address: '601 North Carolina Avenue SE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20003',
    latitude: 38.8848,
    longitude: -76.9958,
    phone: '(202) 698-1873',
    website: 'https://dpr.dc.gov',
    hours: 'Check schedule for skating sessions',
    county: 'District of Columbia',
    description: 'DC recreation center with roller skating sessions. Affordable community skating with lessons available.',
    cost: '$3-5/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'community-center', 'lessons', 'affordable', 'rec-department'],
  },

  // ==========================================
  // EASTERN US EXPANSION — ROLLER SKATING
  // ==========================================

  // NEW YORK
  { name: 'United Skates of America Seaford', address: '1276 Hicksville Rd', city: 'Seaford', state: 'NY', zipCode: '11783', latitude: 40.6652, longitude: -73.4882, phone: '(516) 795-5474', website: 'https://www.unitedskates.com', hours: 'Mon-Fri 4pm-9pm, Sat 11am-5pm 7pm-11pm, Sun 1pm-5pm', county: 'Nassau County', description: 'United Skates of America on Long Island with roller skating, arcade, and birthday party packages. Skate lessons available.', cost: '$8-14/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'arcade', 'lessons', 'birthday-parties', 'cosmic-skate'] },
  { name: 'Brooklyn Skate Zone', address: '7922 Flatbush Ave', city: 'Brooklyn', state: 'NY', zipCode: '11236', latitude: 40.6335, longitude: -73.9318, phone: '(718) 763-5050', website: 'https://www.brooklynskatezone.com', hours: 'Mon-Fri 4pm-10pm, Sat-Sun 12pm-8pm', county: 'Kings County', description: 'Roller skating rink in Brooklyn with public sessions, DJ nights, and birthday party packages. Family friendly.', cost: '$8-14/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'dj-nights', 'birthday-parties', 'lessons'] },

  // NEW JERSEY
  { name: 'NJ Skate Zone Westfield', address: '500 E Broad St', city: 'Westfield', state: 'NJ', zipCode: '07090', latitude: 40.6506, longitude: -74.3394, phone: '(908) 301-0303', website: 'https://www.njskatezone.com', hours: 'Mon-Fri 4pm-9pm, Sat-Sun 12pm-9pm', county: 'Union County', description: 'Family roller skating rink in Westfield NJ with public sessions, lessons, and birthday party packages.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'lessons', 'birthday-parties', 'cosmic-skate'] },
  { name: 'Skateland Pennsauken', address: '3000 Haddonfield Rd', city: 'Pennsauken', state: 'NJ', zipCode: '08110', latitude: 39.9524, longitude: -75.0621, phone: '(856) 662-9500', website: 'https://www.skatelandnj.com', hours: 'Fri 7pm-10pm, Sat 12pm-5pm 7pm-10pm, Sun 1pm-5pm', county: 'Camden County', description: 'Classic roller skating rink in South Jersey with public sessions, cosmic skate, and birthday parties.', cost: '$7-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'lessons', 'arcade'] },

  // PENNSYLVANIA
  { name: 'SkateZone 123 Philadelphia', address: '850 DeKalb Pike', city: 'Blue Bell', state: 'PA', zipCode: '19422', latitude: 40.1534, longitude: -75.2754, phone: '(215) 643-8300', website: 'https://www.skatezone123.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Montgomery County', description: 'Roller skating rink north of Philadelphia with public sessions, cosmic skate, and birthday party packages.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },
  { name: 'RinkAtErie', address: '3402 Peach St', city: 'Erie', state: 'PA', zipCode: '16508', latitude: 42.0967, longitude: -80.0644, phone: '(814) 864-8400', website: 'https://www.rinkaterie.com', hours: 'Mon-Sat various sessions', county: 'Erie County', description: 'Family roller skating rink in Erie PA with public sessions, birthday parties, and special event nights.', cost: '$7-11/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'birthday-parties', 'lessons', 'family-sessions'] },

  // CONNECTICUT
  { name: 'Roller Magic Vernon', address: '10 Dobson Rd', city: 'Vernon', state: 'CT', zipCode: '06066', latitude: 41.8468, longitude: -72.4690, phone: '(860) 871-0505', website: 'https://www.rollermagicct.com', hours: 'Fri 7pm-10pm, Sat 1pm-5pm 7pm-10pm, Sun 1pm-5pm', county: 'Tolland County', description: 'Roller skating rink in Vernon CT with public sessions, cosmic skate, and birthday party packages.', cost: '$7-11/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },

  // MASSACHUSETTS
  { name: 'Interskate 91 North Chelmsford', address: '290 Littleton Rd', city: 'Chelmsford', state: 'MA', zipCode: '01824', latitude: 42.5956, longitude: -71.3893, phone: '(978) 250-2400', website: 'https://www.interskate91.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Middlesex County', description: 'Roller skating rink north of Boston with public sessions, birthday parties, and cosmic skate nights.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },
  { name: 'Bourne Skating Club', address: '231 N Quincy St', city: 'Brockton', state: 'MA', zipCode: '02302', latitude: 42.0834, longitude: -71.0184, phone: '(508) 587-2200', website: 'https://www.skatebrockton.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Plymouth County', description: 'Family roller skating in Brockton MA south of Boston with public sessions and birthday parties.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'birthday-parties', 'lessons', 'family-sessions'] },

  // RHODE ISLAND
  { name: 'Skater Island Providence', address: '800 Branch Ave', city: 'Providence', state: 'RI', zipCode: '02904', latitude: 41.8268, longitude: -71.4273, phone: '(401) 454-5500', website: 'https://www.skaterisland.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Providence County', description: 'Roller skating rink in Providence RI with public sessions, cosmic skate nights, and birthday party packages.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },

  // NEW HAMPSHIRE
  { name: 'Skate 3 Manchester', address: '235 Massabesic St', city: 'Manchester', state: 'NH', zipCode: '03103', latitude: 42.9832, longitude: -71.4267, phone: '(603) 668-0400', website: 'https://www.skate3nh.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Hillsborough County', description: 'Roller skating rink in Manchester NH with public sessions, birthday parties, and special event nights.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'birthday-parties', 'cosmic-skate', 'family-sessions'] },

  // MAINE
  { name: 'Vacationland Family Fun Center Portland', address: '101 Auburn St', city: 'Portland', state: 'ME', zipCode: '04103', latitude: 43.6779, longitude: -70.2927, phone: '(207) 774-7427', website: 'https://www.vffc.com', hours: 'Sat-Sun 1pm-5pm, Fri 7pm-10pm', county: 'Cumberland County', description: 'Family fun center in Portland ME with roller skating, arcade, and birthday party packages.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'arcade', 'birthday-parties', 'family-sessions'] },

  // VERMONT
  { name: 'Roller Kingdom South Burlington', address: '1000 Williston Rd', city: 'South Burlington', state: 'VT', zipCode: '05403', latitude: 44.4629, longitude: -73.1746, phone: '(802) 863-5636', website: 'https://www.rollerkingdomvt.com', hours: 'Fri 7pm-10pm, Sat 1pm-5pm 7pm-10pm, Sun 1pm-5pm', county: 'Chittenden County', description: 'Roller skating rink in South Burlington VT with public sessions, cosmic skate, and birthday parties.', cost: '$7-11/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },

  // DELAWARE
  { name: 'Rollercade Wilmington', address: '800 N DuPont Rd', city: 'Wilmington', state: 'DE', zipCode: '19803', latitude: 39.7847, longitude: -75.5630, phone: '(302) 764-4600', website: 'https://www.rollercade.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'New Castle County', description: 'Classic roller skating rink in Wilmington DE with public sessions, cosmic skate, and birthday party packages.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },

  // WEST VIRGINIA
  { name: 'Skate Estate Charleston', address: '4715 MacCorkle Ave SW', city: 'South Charleston', state: 'WV', zipCode: '25303', latitude: 38.3532, longitude: -81.6998, phone: '(304) 744-7555', website: 'https://www.skateestatewv.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Kanawha County', description: 'Roller skating rink in the Charleston WV area with public sessions, cosmic skate nights, and birthday parties.', cost: '$6-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade'] },

  // NORTH CAROLINA
  { name: 'Xtreme Ice and Skating Charlotte', address: '8118 Outlet Village Way', city: 'Charlotte', state: 'NC', zipCode: '28273', latitude: 35.1060, longitude: -80.9613, phone: '(704) 500-9300', website: 'https://www.xtremeiceskating.com', hours: 'Fri-Sat 7pm-10pm, Sat-Sun 1pm-5pm', county: 'Mecklenburg County', description: 'Roller skating and ice skating in Charlotte NC with family sessions and birthday party packages.', cost: '$8-13/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'birthday-parties', 'cosmic-skate', 'arcade', 'lessons'] },
  { name: 'Skateland of Raleigh', address: '2804 Atlantic Ave', city: 'Raleigh', state: 'NC', zipCode: '27604', latitude: 35.8004, longitude: -78.6043, phone: '(919) 876-7433', website: 'https://www.skatelandraleigh.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Wake County', description: 'Family roller skating rink in Raleigh NC with public sessions, birthday parties, and DJ nights.', cost: '$7-11/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'dj-nights', 'birthday-parties', 'arcade', 'lessons'] },

  // SOUTH CAROLINA
  { name: 'Rock Hill Skate Center', address: '740 N Anderson Rd', city: 'Rock Hill', state: 'SC', zipCode: '29730', latitude: 34.9399, longitude: -81.0289, phone: '(803) 324-5522', website: 'https://www.rockhillskate.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'York County', description: 'Roller skating rink near Charlotte metro in Rock Hill SC with public sessions and birthday party packages.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade'] },

  // GEORGIA
  { name: 'Sparkles Family Fun Center Kennesaw', address: '655 Ernest W Barrett Pkwy', city: 'Kennesaw', state: 'GA', zipCode: '30144', latitude: 34.0316, longitude: -84.5997, phone: '(770) 422-7547', website: 'https://www.sparklesfun.com', hours: 'Fri 7pm-10pm, Sat 12pm-5pm 7pm-11pm, Sun 1pm-5pm', county: 'Cobb County', description: 'Sparkles Family Fun Center in Kennesaw GA with roller skating, laser tag, arcade, and birthday parties.', cost: '$8-13/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'laser-tag', 'arcade', 'birthday-parties', 'cosmic-skate'] },
  { name: 'Skate Zone Columbus', address: '3020 Macon Rd', city: 'Columbus', state: 'GA', zipCode: '31906', latitude: 32.5060, longitude: -84.9658, phone: '(706) 322-1388', website: 'https://www.skatezonecolumbus.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Muscogee County', description: 'Roller skating rink in Columbus GA with public sessions, birthday party packages, and arcade.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade'] },

  // FLORIDA
  { name: 'RollerNation Tampa', address: '1802 West Hillsborough Ave', city: 'Tampa', state: 'FL', zipCode: '33603', latitude: 27.9891, longitude: -82.4800, phone: '(813) 237-8900', website: 'https://www.rollernation.com', hours: 'Fri 8pm-11pm, Sat 1pm-5pm 8pm-11pm, Sun 1pm-5pm', county: 'Hillsborough County', description: 'Roller skating rink in Tampa FL with cosmic skate nights, birthday parties, and family sessions.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'dj-nights'] },
  { name: 'Semoran Skateway Orlando', address: '3101 N Semoran Blvd', city: 'Orlando', state: 'FL', zipCode: '32807', latitude: 28.5624, longitude: -81.3113, phone: '(407) 273-4500', website: 'https://www.semoransk8way.com', hours: 'Fri 8pm-11pm, Sat 12pm-5pm 7pm-11pm, Sun 1pm-5pm', county: 'Orange County', description: 'Family roller skating rink in Orlando FL with public sessions, cosmic skate, and birthday parties.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'arcade', 'lessons'] },

  // ALABAMA
  { name: 'Classic Skate Center Huntsville', address: '2780 Governors Dr SW', city: 'Huntsville', state: 'AL', zipCode: '35805', latitude: 34.7183, longitude: -86.6291, phone: '(256) 533-8010', website: 'https://www.classicskatecenterhuntsville.com', hours: 'Fri 7pm-10pm, Sat 1pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Madison County', description: 'Family roller skating rink in Huntsville AL with public sessions, birthday parties, and skate lessons.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'birthday-parties', 'lessons', 'arcade'] },

  // MISSISSIPPI
  { name: 'Skateland Jackson', address: '6001 Medgar Evers Blvd', city: 'Jackson', state: 'MS', zipCode: '39213', latitude: 32.3456, longitude: -90.1890, phone: '(601) 362-9660', website: 'https://www.skatelandjackson.com', hours: 'Fri 7pm-10pm, Sat 12pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Hinds County', description: 'Family roller skating rink in Jackson MS with public sessions, birthday parties, and skate lessons.', cost: '$6-9/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'birthday-parties', 'lessons', 'arcade'] },

  // TENNESSEE
  { name: 'Xtreme Wheels Nashville', address: '6760 Centennial Blvd', city: 'Nashville', state: 'TN', zipCode: '37209', latitude: 36.1672, longitude: -86.8693, phone: '(615) 352-5660', website: 'https://www.xtremewheelsnashville.com', hours: 'Fri 7pm-10pm, Sat 12pm-4pm 7pm-10pm, Sun 1pm-5pm', county: 'Davidson County', description: 'Roller skating rink in Nashville TN with public sessions, birthday parties, and DJ skate nights.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'cosmic-skate', 'birthday-parties', 'dj-nights', 'arcade'] },
  { name: 'Skate & Fun Zone Memphis', address: '4995 Summer Ave', city: 'Memphis', state: 'TN', zipCode: '38122', latitude: 35.1527, longitude: -90.0017, phone: '(901) 682-7777', website: 'https://www.memphisskate.com', hours: 'Fri 7pm-10pm, Sat 12pm-5pm 7pm-10pm, Sun 1pm-5pm', county: 'Shelby County', description: 'Roller skating and fun zone in Memphis TN with public sessions, birthday party rooms, and arcade.', cost: '$7-10/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'arcade', 'birthday-parties', 'cosmic-skate'] },

  // KENTUCKY
  { name: 'United Skates of America Louisville', address: '4451 Outer Loop', city: 'Louisville', state: 'KY', zipCode: '40219', latitude: 38.1282, longitude: -85.6910, phone: '(502) 964-0660', website: 'https://www.unitedskates.com', hours: 'Fri 7pm-10pm, Sat 1pm-5pm 7pm-10pm, Sun 1pm-5pm', county: 'Jefferson County', description: 'United Skates of America in Louisville KY with roller skating, arcade, and birthday party packages.', cost: '$8-13/session', ageRange: 'All Ages', isFree: false, venueType: 'roller-rink', features: ['roller-skating', 'arcade', 'birthday-parties', 'cosmic-skate', 'lessons'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'roller-rink': { category: 'Indoor', subcategory: 'Roller Skating Rink' },
    'entertainment-complex': { category: 'Indoor', subcategory: 'Entertainment Center' },
    'skating-complex': { category: 'Indoor', subcategory: 'Skating Complex' },
    'skate-park': { category: 'Indoor', subcategory: 'Skate Park' },
    'outdoor-rink': { category: 'Outdoor', subcategory: 'Outdoor Skating' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Roller Skating' };
}

function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);
  const { category, subcategory } = getCategory(location.venueType);

  return {
    name: location.name,
    type: subcategory,
    category: category,
    subcategory: subcategory,
    description: location.description,
    geohash: geohash,
    state: location.state,
    phone: location.phone || '',
    website: location.website,
    hours: location.hours,
    isFree: location.isFree,
    ageRange: location.ageRange,
    cost: location.cost,
    location: {
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      address: location.address,
      city: location.city,
      zipCode: location.zipCode,
    },
    amenities: location.features,
    metadata: {
      source: 'roller-skating-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: category === 'Indoor',
      hasParking: true,
      hasBirthdayParties: location.features.includes('birthday-parties'),
      hasLessons: location.features.includes('lessons'),
      hasFamilySessions: location.features.includes('family-sessions'),
      isSeasonal: location.features.includes('seasonal'),
      isParksDepartment: location.features.includes('parks-department') || location.features.includes('rec-department'),
    },
  };
}

/**
 * Save activities to database using venue-matcher for deduplication
 */
async function saveActivities(activities) {
  if (activities.length === 0) return { saved: 0, updated: 0, failed: 0 };

  let saved = 0, updated = 0, failed = 0;

  for (const activity of activities) {
    try {
      // Use venue-matcher to find existing or create new with standard ID
      const result = await getOrCreateActivity(activity, { source: SCRAPER_NAME });

      if (result.isNew) {
        saved++;
      } else if (result.updated) {
        updated++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  Failed to save activity ${activity.name}: ${error.message}`);
      failed++;
    }
  }

  return { saved, updated, failed };
}

async function scrapeRollerSkatingDMV() {
  console.log(`\n🛼 ROLLER SKATING RINKS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🛼 Processing Roller Skating Rinks...');

  // Group by state
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of ROLLER_SKATING_RINKS) {
    if (!stateGroups[venue.state]) stateGroups[venue.state] = [];
    stateGroups[venue.state].push(venue);
  }
  for (const [state, venues] of Object.entries(stateGroups).sort()) {
    console.log(`
  ${state} (${venues.length} venues):`);
    for (const location of venues) {
      const activity = createActivityDocument(location);
      allActivities.push(activity);
      console.log(`    ✓ ${location.name} (${location.city})`);
    }
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);
  console.log('\n💾 Saving to database...');

  const { saved, updated, failed } = await saveActivities(allActivities);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ROLLER SKATING RINKS DMV SCRAPER COMPLETE`);
  console.log(`   Total locations: ${allActivities.length}`);
  console.log(`   New activities saved: ${saved}`);
  console.log(`   Existing updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      activitiesSaved: saved,
      activitiesUpdated: updated,
      activitiesFailed: failed,
      totalLocations: allActivities.length,
      duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

async function scrapeRollerSkatingDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeRollerSkatingDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Roller Skating Rinks DMV Scraper');
  scrapeRollerSkatingDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeRollerSkatingDMV,
  scrapeRollerSkatingDMVCloudFunction,
};
