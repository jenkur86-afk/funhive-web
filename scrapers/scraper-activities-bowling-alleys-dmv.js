#!/usr/bin/env node

/**
 * BOWLING ALLEYS DMV ACTIVITIES SCRAPER
 *
 * Adds family-friendly bowling alleys to the activities collection.
 * These venues offer bumper bowling, cosmic bowling, and family programs.
 *
 * Coverage:
 * - Bowlero locations (multiple)
 * - Bowl America locations (multiple)
 * - AMF locations
 * - Independent bowling centers
 *
 * Usage:
 *   node scraper-activities-bowling-alleys-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledBowlingAlleysDMV
 * Schedule: Weekly (activities don't change often)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'BowlingAlleys-Eastern';

// ==========================================
// VENUE DATA - DMV Bowling Alleys
// ==========================================

const BOWLING_ALLEYS = [
  // BOWLERO LOCATIONS
  {
    name: 'Bowlero Centreville',
    address: '13814 Lee Highway',
    city: 'Centreville',
    state: 'VA',
    zipCode: '20120',
    latitude: 38.8432,
    longitude: -77.4287,
    phone: '(703) 830-1600',
    website: 'https://www.bowlero.com/location/bowlero-centreville',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Fairfax County',
    description: 'Modern bowling center with 40 lanes, arcade, laser tag, and full bar. Features bumper bowling for kids, cosmic bowling nights, and party packages.',
    cost: '$5-8/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'laser-tag', 'bar'],
  },
  {
    name: 'Bowlero Tysons',
    address: '8521 Leesburg Pike',
    city: 'Vienna',
    state: 'VA',
    zipCode: '22182',
    latitude: 38.9178,
    longitude: -77.2298,
    phone: '(703) 893-8802',
    website: 'https://www.bowlero.com/location/bowlero-tysons',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Fairfax County',
    description: 'Upscale bowling entertainment venue with state-of-the-art lanes, arcade games, and sports bar. Perfect for family outings and birthday parties.',
    cost: '$6-9/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'bar'],
  },
  {
    name: 'Bowlero Waldorf',
    address: '3270 Crain Highway',
    city: 'Waldorf',
    state: 'MD',
    zipCode: '20603',
    latitude: 38.6378,
    longitude: -76.8989,
    phone: '(301) 645-4444',
    website: 'https://www.bowlero.com/location/bowlero-waldorf',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Charles County',
    description: 'Family entertainment center with 40 lanes, arcade, and cosmic bowling. Offers bumper bowling for kids and VIP party rooms.',
    cost: '$5-8/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'party-rooms'],
  },
  {
    name: 'Bowlero Columbia',
    address: '10300 Little Patuxent Parkway',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21044',
    latitude: 39.2151,
    longitude: -76.8527,
    phone: '(410) 730-3200',
    website: 'https://www.bowlero.com/location/bowlero-columbia',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Howard County',
    description: 'Modern bowling and entertainment venue at Columbia Mall area. Features 48 lanes, arcade, and event spaces for parties.',
    cost: '$5-9/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'bar'],
  },

  // BOWL AMERICA LOCATIONS
  {
    name: 'Bowl America Gaithersburg',
    address: '1101 Clopper Road',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20878',
    latitude: 39.1389,
    longitude: -77.2167,
    phone: '(301) 948-8800',
    website: 'https://www.bowl-america.com/gaithersburg',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Montgomery County',
    description: 'Classic family bowling center with 32 lanes. Features bumper bowling, birthday parties, leagues, and Kids Bowl Free program.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'kids-bowl-free', 'leagues', 'snack-bar'],
  },
  {
    name: 'Bowl America Woodlawn',
    address: '6410 Security Boulevard',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21207',
    latitude: 39.3237,
    longitude: -76.7478,
    phone: '(410) 298-9720',
    website: 'https://www.bowl-america.com/woodlawn',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Baltimore County',
    description: 'Community bowling center with 40 lanes serving Baltimore area families. Offers bumper bowling, cosmic bowling, and party packages.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'kids-bowl-free', 'snack-bar'],
  },
  {
    name: 'Bowl America Falls Church',
    address: '140 S Maple Avenue',
    city: 'Falls Church',
    state: 'VA',
    zipCode: '22046',
    latitude: 38.8818,
    longitude: -77.1698,
    phone: '(703) 533-5500',
    website: 'https://www.bowl-america.com/fallschurch',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Falls Church City',
    description: 'Long-established bowling center in Falls Church. Family-friendly with bumper bowling, arcade games, and birthday party packages.',
    cost: '$4-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'arcade', 'kids-bowl-free', 'snack-bar'],
  },
  {
    name: 'Bowl America Bull Run',
    address: '13710 Marblestone Drive',
    city: 'Gainesville',
    state: 'VA',
    zipCode: '20155',
    latitude: 38.8098,
    longitude: -77.6078,
    phone: '(703) 753-8000',
    website: 'https://www.bowl-america.com/bullrun',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Prince William County',
    description: 'Modern family bowling center with 40 lanes. Features bumper bowling, Kids Bowl Free program, and cosmic bowling nights.',
    cost: '$4-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'kids-bowl-free', 'snack-bar'],
  },
  {
    name: 'Bowl America Shirley',
    address: '6450 Edsall Road',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22312',
    latitude: 38.8089,
    longitude: -77.1378,
    phone: '(703) 354-3300',
    website: 'https://www.bowl-america.com/shirley',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Fairfax County',
    description: 'Family bowling center serving Alexandria and Springfield area. Bumper bowling available for kids, party rooms for birthdays.',
    cost: '$4-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'party-rooms', 'kids-bowl-free', 'snack-bar'],
  },

  // AMF LOCATIONS
  {
    name: 'AMF College Park Lanes',
    address: '9021 Baltimore Avenue',
    city: 'College Park',
    state: 'MD',
    zipCode: '20740',
    latitude: 38.9897,
    longitude: -76.9378,
    phone: '(301) 474-8282',
    website: 'https://www.amf.com/location/amf-college-park-lanes',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-10pm',
    county: 'Prince George\'s County',
    description: 'Classic bowling center near University of Maryland. Features bumper bowling for kids and cosmic bowling nights.',
    cost: '$5-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'snack-bar'],
  },
  {
    name: 'AMF Annandale Lanes',
    address: '4245 Markham Street',
    city: 'Annandale',
    state: 'VA',
    zipCode: '22003',
    latitude: 38.8298,
    longitude: -77.1987,
    phone: '(703) 256-2211',
    website: 'https://www.amf.com/location/amf-annandale-lanes',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-10pm',
    county: 'Fairfax County',
    description: 'Community bowling center serving Annandale area. Family-friendly with bumper bowling, birthday parties, and leagues.',
    cost: '$5-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'],
  },

  // INDEPENDENT / OTHER BOWLING CENTERS
  {
    name: 'Pinstripes Georgetown',
    address: '1064 Wisconsin Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20007',
    latitude: 38.9048,
    longitude: -77.0632,
    phone: '(202) 706-5630',
    website: 'https://pinstripes.com/location/washington-dc',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-12am, Sun 10am-10pm',
    county: 'District of Columbia',
    description: 'Upscale bowling bistro in Georgetown with Italian-American cuisine. Features boutique bowling lanes, bocce courts, and elegant event spaces.',
    cost: '$8-12/game',
    ageRange: 'All Ages',
    features: ['boutique-bowling', 'bocce', 'restaurant', 'bar'],
  },
  {
    name: 'Splitsville Luxury Lanes',
    address: '1500 South Joyce Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22202',
    latitude: 38.8618,
    longitude: -77.0632,
    phone: '(571) 358-2900',
    website: 'https://www.splitsvillelanes.com/pentagon-city',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 11am-10pm',
    county: 'Arlington County',
    description: 'Upscale bowling experience at Pentagon City with retro lanes, craft cocktails, and elevated food. Family-friendly during day hours.',
    cost: '$8-12/game',
    ageRange: 'All Ages',
    features: ['boutique-bowling', 'restaurant', 'bar', 'retro-style'],
  },
  {
    name: 'White Oak Lanes',
    address: '11207 New Hampshire Avenue',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20904',
    latitude: 39.0498,
    longitude: -76.9897,
    phone: '(301) 593-3000',
    website: 'https://www.whiteoaklanes.com',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-1am, Sun 9am-10pm',
    county: 'Montgomery County',
    description: 'Classic family bowling center with 48 lanes serving Silver Spring area. Features bumper bowling, cosmic bowling, and party facilities.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'snack-bar', 'arcade'],
  },
  {
    name: 'Laurel Lanes',
    address: '15013 Baltimore Avenue',
    city: 'Laurel',
    state: 'MD',
    zipCode: '20707',
    latitude: 39.1007,
    longitude: -76.8626,
    phone: '(301) 725-1200',
    website: 'https://laurellanes.com',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Prince George\'s County',
    description: 'Family-owned bowling center with 32 lanes. Offers bumper bowling, birthday parties, and league bowling for all ages.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'],
  },

  // ==========================================
  // EASTERN US EXPANSION — BOWLING ALLEYS
  // ==========================================

  // NEW YORK
  { name: 'Bowlero Queens', address: '35-10 Steinway St', city: 'Astoria', state: 'NY', zipCode: '11103', latitude: 40.7728, longitude: -73.9272, phone: '', website: 'https://www.bowlero.com/location/bowlero-queens', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Queens County', description: 'Modern Bowlero with 36 lanes, arcade, laser tag, and full bar. Bumper bowling for kids.', cost: '$5-9/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'laser-tag', 'birthday-parties'] },
  { name: 'Bowlero Long Island City', address: '26-20 Jackson Ave', city: 'Long Island City', state: 'NY', zipCode: '11101', latitude: 40.7449, longitude: -73.9426, phone: '', website: 'https://www.bowlero.com/location/bowlero-long-island-city', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Queens County', description: 'Bowlero in Queens with 28 lanes, arcade, and birthday party packages.', cost: '$5-9/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'AMF Babylon Lanes', address: '375 W Main St', city: 'Babylon', state: 'NY', zipCode: '11702', latitude: 40.6990, longitude: -73.3257, phone: '(631) 587-7600', website: 'https://www.bowlero.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-1am, Sun 10am-11pm', county: 'Suffolk County', description: 'AMF bowling center on Long Island with 36 lanes, bumper bowling, and birthday party rooms.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'birthday-parties', 'snack-bar'] },

  // NEW JERSEY
  { name: 'Bowlero Sayreville', address: '525 Washington Rd', city: 'Sayreville', state: 'NJ', zipCode: '08872', latitude: 40.4590, longitude: -74.3505, phone: '', website: 'https://www.bowlero.com/location/bowlero-sayreville', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Middlesex County', description: 'Bowlero with 48 lanes, arcade, bar and grill. Family bowling and bumper lanes for kids.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Cherry Hill', address: '1996 Route 70', city: 'Cherry Hill', state: 'NJ', zipCode: '08003', latitude: 39.9239, longitude: -74.9796, phone: '', website: 'https://www.bowlero.com/location/bowlero-cherry-hill', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Camden County', description: 'Bowlero in South Jersey with 40 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // PENNSYLVANIA
  { name: 'Bowlero Willow Grove', address: '2601 W Moreland Rd', city: 'Willow Grove', state: 'PA', zipCode: '19090', latitude: 40.1470, longitude: -75.1160, phone: '', website: 'https://www.bowlero.com/location/bowlero-willow-grove', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Montgomery County', description: 'Bowlero north of Philadelphia with 44 lanes, arcade, and full bar.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Pittsburgh', address: '4901 McKnight Rd', city: 'Pittsburgh', state: 'PA', zipCode: '15237', latitude: 40.5310, longitude: -79.9700, phone: '', website: 'https://www.bowlero.com/location/bowlero-pittsburgh', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Allegheny County', description: 'Bowlero north Pittsburgh with 32 lanes, arcade, and birthday party packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // CONNECTICUT
  { name: 'Bowlero Trumbull', address: '90 Monroe Tpke', city: 'Trumbull', state: 'CT', zipCode: '06611', latitude: 41.2515, longitude: -73.2098, phone: '', website: 'https://www.bowlero.com/location/bowlero-trumbull', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Fairfield County', description: 'Bowlero in Fairfield County CT with 32 lanes, arcade, and birthday packages.', cost: '$5-9/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // MASSACHUSETTS
  { name: 'Bowlero Lynnfield', address: '320 Colonial Rd', city: 'Lynnfield', state: 'MA', zipCode: '01940', latitude: 42.5326, longitude: -71.0349, phone: '', website: 'https://www.bowlero.com/location/bowlero-lynnfield', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Essex County', description: 'Bowlero north of Boston with 32 lanes, arcade, and birthday party packages.', cost: '$5-9/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Shrewsbury', address: '820 Boston Tpke', city: 'Shrewsbury', state: 'MA', zipCode: '01545', latitude: 42.2832, longitude: -71.7214, phone: '', website: 'https://www.bowlero.com/location/bowlero-shrewsbury', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Worcester County', description: 'Bowlero in the Worcester metro with 36 lanes, arcade, and birthday packages.', cost: '$5-9/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // RHODE ISLAND
  { name: 'Narragansett Bowl', address: '25 Sockanosset Cross Rd', city: 'Cranston', state: 'RI', zipCode: '02920', latitude: 41.7687, longitude: -71.4723, phone: '(401) 942-9797', website: 'https://www.narragansettbowl.com', hours: 'Mon-Sat 9am-11pm, Sun 10am-10pm', county: 'Providence County', description: 'Family bowling center in Cranston RI with 32 lanes, bumper bowling, and birthday party packages.', cost: '$4-6/game', ageRange: 'All Ages', features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'] },

  // NEW HAMPSHIRE
  { name: 'Chunky s Pelham', address: '150 Bridge St', city: 'Pelham', state: 'NH', zipCode: '03076', latitude: 42.7354, longitude: -71.3259, phone: '(603) 635-5055', website: 'https://www.chunkys.com', hours: 'Mon-Thu 4pm-10pm, Fri 4pm-11pm, Sat 11am-11pm, Sun 11am-9pm', county: 'Hillsborough County', description: 'Chunkys Cinema Pub with bowling, movies, and full dining in Southern NH. Family friendly with bumper bowling.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'movies', 'dining', 'birthday-parties'] },

  // MAINE
  { name: 'Bayside Bowl', address: '58 Alder St', city: 'Portland', state: 'ME', zipCode: '04101', latitude: 43.6591, longitude: -70.2568, phone: '(207) 791-2695', website: 'https://www.baysidebowl.com', hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 11am-10pm', county: 'Cumberland County', description: 'Hip rooftop bowling alley in Portland ME with 10 lanes, local craft beer, food trucks, and live music.', cost: '$5-7/game', ageRange: 'All Ages', features: ['bumper-bowling', 'rooftop', 'birthday-parties', 'food-trucks'] },

  // VERMONT
  { name: 'Spare Time Entertainment Williston', address: '222 Granger Rd', city: 'Williston', state: 'VT', zipCode: '05495', latitude: 44.4311, longitude: -73.0652, phone: '(802) 862-0500', website: 'https://www.sparetimevt.com', hours: 'Mon-Thu 10am-10pm, Fri-Sat 10am-12am, Sun 10am-9pm', county: 'Chittenden County', description: 'Spare Time Entertainment near Burlington VT with bowling, laser tag, mini golf, and arcade.', cost: '$4-6/game', ageRange: 'All Ages', features: ['bumper-bowling', 'laser-tag', 'mini-golf', 'arcade', 'birthday-parties'] },

  // DELAWARE
  { name: 'AMF Claymont Lanes', address: '3200 Philadelphia Pike', city: 'Claymont', state: 'DE', zipCode: '19703', latitude: 39.8001, longitude: -75.4650, phone: '(302) 792-7777', website: 'https://www.bowlero.com', hours: 'Mon-Sat 10am-11pm, Sun 10am-9pm', county: 'New Castle County', description: 'AMF bowling center in northern Delaware with bumper bowling, leagues, and birthday party packages.', cost: '$4-6/game', ageRange: 'All Ages', features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'] },

  // WEST VIRGINIA
  { name: 'Mountain Lanes Fairmont', address: '1513 Morgantown Ave', city: 'Fairmont', state: 'WV', zipCode: '26554', latitude: 39.4851, longitude: -80.1454, phone: '(304) 366-3560', website: 'https://www.mountainlaneswv.com', hours: 'Mon-Sat 10am-10pm, Sun 12pm-8pm', county: 'Marion County', description: 'Family bowling center in Fairmont WV with bumper bowling, birthday party rooms, and league bowling.', cost: '$3-5/game', ageRange: 'All Ages', features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'] },

  // NORTH CAROLINA
  { name: 'Bowlero Charlotte', address: '4601 E Independence Blvd', city: 'Charlotte', state: 'NC', zipCode: '28212', latitude: 35.2019, longitude: -80.7741, phone: '', website: 'https://www.bowlero.com/location/bowlero-charlotte', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Mecklenburg County', description: 'Bowlero in Charlotte NC with 40 lanes, arcade, laser tag, and full bar.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'laser-tag', 'birthday-parties'] },
  { name: 'Bowlero Cary', address: '1700 Walnut St', city: 'Cary', state: 'NC', zipCode: '27511', latitude: 35.8012, longitude: -78.7993, phone: '', website: 'https://www.bowlero.com/location/bowlero-cary', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Wake County', description: 'Bowlero in Cary NC (Raleigh metro) with 36 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // SOUTH CAROLINA
  { name: 'Ashley Lanes Bowling', address: '4 Ashley River Rd', city: 'Charleston', state: 'SC', zipCode: '29407', latitude: 32.7765, longitude: -79.9742, phone: '(843) 763-1613', website: 'https://www.ashleylanes.com', hours: 'Mon-Sat 10am-12am, Sun 12pm-10pm', county: 'Charleston County', description: 'Family bowling center in Charleston SC with 32 lanes, bumper bowling, and birthday party rooms.', cost: '$4-6/game', ageRange: 'All Ages', features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'] },
  { name: 'Stars and Strikes Columbia', address: '130 Harbison Blvd', city: 'Columbia', state: 'SC', zipCode: '29212', latitude: 34.0827, longitude: -81.1467, phone: '(803) 749-5003', website: 'https://www.starsandstrikes.com/columbia', hours: 'Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 12pm-9pm', county: 'Lexington County', description: 'Stars and Strikes family entertainment with bowling, laser tag, arcade, and mini golf.', cost: '$5-7/game', ageRange: 'All Ages', features: ['bumper-bowling', 'laser-tag', 'arcade', 'mini-golf', 'birthday-parties'] },

  // GEORGIA
  { name: 'Bowlero Chamblee', address: '2175 Savoy Dr', city: 'Chamblee', state: 'GA', zipCode: '30341', latitude: 33.8934, longitude: -84.2986, phone: '', website: 'https://www.bowlero.com/location/bowlero-chamblee', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'DeKalb County', description: 'Bowlero near Atlanta with 32 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Stars and Strikes Augusta', address: '3045 Washington Rd', city: 'Augusta', state: 'GA', zipCode: '30907', latitude: 33.4735, longitude: -82.0105, phone: '(706) 733-5483', website: 'https://www.starsandstrikes.com/augusta', hours: 'Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 12pm-9pm', county: 'Richmond County', description: 'Stars and Strikes with bowling, laser tag, arcade, go-karts, and mini golf.', cost: '$5-7/game', ageRange: 'All Ages', features: ['bumper-bowling', 'laser-tag', 'arcade', 'go-karts', 'mini-golf', 'birthday-parties'] },

  // FLORIDA
  { name: 'Bowlero Jacksonville', address: '8207 Blanding Blvd', city: 'Jacksonville', state: 'FL', zipCode: '32244', latitude: 30.2354, longitude: -81.7413, phone: '', website: 'https://www.bowlero.com/location/bowlero-jacksonville', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Duval County', description: 'Bowlero in Jacksonville FL with 40 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Tampa', address: '11328 N 30th St', city: 'Tampa', state: 'FL', zipCode: '33612', latitude: 28.0295, longitude: -82.4498, phone: '', website: 'https://www.bowlero.com/location/bowlero-tampa', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Hillsborough County', description: 'Bowlero in Tampa with 40 lanes, arcade, and full bar. Family bowling and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // ALABAMA
  { name: 'Bowlero Hoover', address: '3025 John Hawkins Pkwy', city: 'Hoover', state: 'AL', zipCode: '35244', latitude: 33.3866, longitude: -86.8004, phone: '', website: 'https://www.bowlero.com/location/bowlero-hoover', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Jefferson County', description: 'Bowlero in Birmingham metro with 40 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Madison', address: '8205 Highway 72 W', city: 'Madison', state: 'AL', zipCode: '35758', latitude: 34.7031, longitude: -86.7381, phone: '', website: 'https://www.bowlero.com/location/bowlero-madison', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Madison County', description: 'Bowlero in Huntsville metro with 32 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // MISSISSIPPI
  { name: 'Dogwood Lanes Jackson', address: '4400 I-55 N', city: 'Jackson', state: 'MS', zipCode: '39206', latitude: 32.3845, longitude: -90.1448, phone: '(601) 366-1777', website: 'https://www.dogwoodlanes.com', hours: 'Mon-Sat 10am-12am, Sun 12pm-9pm', county: 'Hinds County', description: 'Family bowling center in Jackson MS with 32 lanes, bumper bowling, and birthday party rooms.', cost: '$3-5/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'leagues', 'party-rooms', 'snack-bar'] },

  // TENNESSEE
  { name: 'Bowlero Nashville', address: '2517 Lebanon Pike', city: 'Nashville', state: 'TN', zipCode: '37214', latitude: 36.1627, longitude: -86.6620, phone: '', website: 'https://www.bowlero.com/location/bowlero-nashville', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Davidson County', description: 'Bowlero in Nashville with 40 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Memphis', address: '5765 Shelby Oaks Dr', city: 'Memphis', state: 'TN', zipCode: '38134', latitude: 35.1995, longitude: -89.8756, phone: '', website: 'https://www.bowlero.com/location/bowlero-memphis', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Shelby County', description: 'Bowlero in Memphis with 40 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },

  // KENTUCKY
  { name: 'Bowlero Louisville', address: '3023 Mallard Cove Ln', city: 'Louisville', state: 'KY', zipCode: '40241', latitude: 38.2894, longitude: -85.5647, phone: '', website: 'https://www.bowlero.com/location/bowlero-louisville', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Jefferson County', description: 'Bowlero in Louisville KY with 40 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
  { name: 'Bowlero Lexington', address: '2250 Regency Rd', city: 'Lexington', state: 'KY', zipCode: '40503', latitude: 38.0044, longitude: -84.5310, phone: '', website: 'https://www.bowlero.com/location/bowlero-lexington', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Fayette County', description: 'Bowlero in Lexington KY with 36 lanes, arcade, and birthday packages.', cost: '$5-8/game', ageRange: 'All Ages', features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'birthday-parties'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Convert location data to activity document format
 */
function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);

  return {
    name: location.name,
    type: 'Bowling Alley',
    category: 'Indoor',
    subcategory: 'Bowling',
    description: location.description,
    geohash: geohash,
    state: location.state,
    phone: location.phone || '',
    website: location.website,
    hours: location.hours,
    isFree: false,
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
      source: 'bowling-alleys-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'bowling',
    },
    filters: {
      isFree: false,
      isIndoor: true,
      hasParking: true,
      hasBumperBowling: location.features.includes('bumper-bowling'),
      hasCosmicBowling: location.features.includes('cosmic-bowling'),
      hasArcade: location.features.includes('arcade'),
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

/**
 * Main scraper function
 */
async function scrapeBowlingAlleysDMV() {
  console.log(`\n🎳 BOWLING ALLEYS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Bowling Alleys
  console.log('\n🎳 Processing Bowling Alleys...');

  // Group by state for organized output
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of BOWLING_ALLEYS) {
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

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ BOWLING ALLEYS DMV SCRAPER COMPLETE`);
  console.log(`   Total locations: ${allActivities.length}`);
  console.log(`   New activities saved: ${saved}`);
  console.log(`   Existing updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection
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
      states: ['MD', 'VA', 'DC'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeBowlingAlleysDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeBowlingAlleysDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Bowling Alleys DMV Scraper');

  scrapeBowlingAlleysDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeBowlingAlleysDMV,
  scrapeBowlingAlleysDMVCloudFunction,
};
