#!/usr/bin/env node

/**
 * TRAMPOLINE & NINJA PARKS DMV ACTIVITIES SCRAPER
 *
 * Adds trampoline parks, ninja warrior gyms, and active play centers
 * to the activities collection. Focuses on venues with structured
 * programs for kids and open jump/play sessions.
 *
 * Coverage:
 * - Launch Trampoline Park
 * - AirTime Trampoline
 * - Altitude Trampoline Park
 * - Ultimate Ninjas
 * - Ninja Quest
 * - Various ninja/obstacle course gyms
 *
 * Usage:
 *   node scraper-activities-trampoline-ninja-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledTrampolineNinjaDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'TrampolineNinja-Eastern';

// ==========================================
// VENUE DATA - DMV Trampoline & Ninja Parks
// ==========================================

const TRAMPOLINE_NINJA_VENUES = [
  // LAUNCH TRAMPOLINE PARK
  {
    name: 'Launch Trampoline Park Gaithersburg',
    address: '926 North Frederick Avenue',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20879',
    latitude: 39.1568,
    longitude: -77.2018,
    phone: '(301) 330-5867',
    website: 'https://launchtrampolinepark.com/gaithersburg',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Montgomery County',
    description: 'Trampoline park with wall-to-wall trampolines, foam pits, dodgeball, basketball slam, and ninja obstacles. Toddler time available.',
    cost: '$15-25/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'dodgeball', 'basketball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'],
  },
  {
    name: 'Launch Trampoline Park Herndon',
    address: '198 Spring Street',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20170',
    latitude: 38.9698,
    longitude: -77.3858,
    phone: '(703) 996-9889',
    website: 'https://launchtrampolinepark.com/herndon',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Fairfax County',
    description: 'Full-service trampoline park with open jump, ninja course, foam zone, and dodgeball. Hosts kids birthday parties and events.',
    cost: '$15-25/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'ninja-obstacles', 'dodgeball', 'toddler-time', 'birthday-parties'],
  },

  // AIRTIME TRAMPOLINE
  {
    name: 'AirTime Trampoline & Game Park Waldorf',
    address: '3380 Crain Highway',
    city: 'Waldorf',
    state: 'MD',
    zipCode: '20603',
    latitude: 38.6318,
    longitude: -76.9118,
    phone: '(301) 396-3300',
    website: 'https://airtimetrampoline.com/waldorf',
    hours: 'Mon-Thu 11am-8pm, Fri-Sat 10am-10pm, Sun 11am-8pm',
    county: 'Charles County',
    description: 'Trampoline and game park with trampolines, arcade, laser maze, and climbing walls. Family fun destination with toddler hours.',
    cost: '$18-30/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'arcade', 'laser-maze', 'climbing', 'toddler-time', 'birthday-parties'],
  },

  // ALTITUDE TRAMPOLINE PARK
  {
    name: 'Altitude Trampoline Park Manassas',
    address: '8206 Sudley Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7818,
    longitude: -77.4618,
    phone: '(703) 659-9500',
    website: 'https://altitudetrampolinepark.com/manassas',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm',
    county: 'Prince William County',
    description: 'Trampoline park featuring main court, foam pit, battle beams, basketball, and kids court. Fitness classes and toddler time.',
    cost: '$15-28/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'battle-beams', 'basketball', 'kids-court', 'fitness-classes', 'birthday-parties'],
  },
  {
    name: 'Altitude Trampoline Park Frederick',
    address: '5525 Spectrum Drive',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21703',
    latitude: 39.3978,
    longitude: -77.4318,
    phone: '(301) 360-0102',
    website: 'https://altitudetrampolinepark.com/frederick',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm',
    county: 'Frederick County',
    description: 'High-energy trampoline park with main court, foam zone, dodgeball, and fitness programs. Toddler time and birthday packages.',
    cost: '$15-28/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'dodgeball', 'fitness-classes', 'toddler-time', 'birthday-parties'],
  },

  // ULTIMATE NINJAS / NINJA WARRIOR GYMS
  {
    name: 'Ultimate Ninjas Alexandria',
    address: '501 E Monroe Avenue',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22301',
    latitude: 38.8218,
    longitude: -77.0618,
    phone: '(703) 567-0100',
    website: 'https://ultimateninjas.com/alexandria',
    hours: 'Mon-Fri 3pm-8pm, Sat-Sun 9am-6pm',
    county: 'City of Alexandria',
    description: 'Ninja warrior training gym with American Ninja Warrior-style obstacles. Classes for kids ages 5-14, open gym sessions, and camps.',
    cost: '$20-30/class, $25/open gym',
    ageRange: 'Ages 5-14',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'climbing', 'classes', 'camps', 'open-gym', 'birthday-parties'],
  },
  {
    name: 'Ninja Quest Fitness Vienna',
    address: '160 Maple Avenue E',
    city: 'Vienna',
    state: 'VA',
    zipCode: '22180',
    latitude: 38.9018,
    longitude: -77.2558,
    phone: '(703) 659-9900',
    website: 'https://ninjaquestfitness.com',
    hours: 'Mon-Fri 3pm-9pm, Sat 9am-6pm, Sun 10am-5pm',
    county: 'Fairfax County',
    description: 'Ninja warrior training center with obstacles, rock climbing, and fitness training. Youth programs, open gym, and competitive teams.',
    cost: '$25-35/class, $20-30/open gym',
    ageRange: 'Ages 4-14',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'rock-climbing', 'fitness', 'classes', 'competitive-teams', 'open-gym', 'birthday-parties'],
  },
  {
    name: 'American Ninja Warrior Gym Rockville',
    address: '12266 Wilkins Avenue',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0618,
    longitude: -77.1178,
    phone: '(240) 800-0050',
    website: 'https://anwgym.com/rockville',
    hours: 'Mon-Fri 3pm-9pm, Sat 9am-7pm, Sun 10am-6pm',
    county: 'Montgomery County',
    description: 'Official American Ninja Warrior gym with authentic obstacles. Youth ninja classes, camps, and competitive training.',
    cost: '$25-40/class, $20-35/open gym',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'anw-official', 'classes', 'camps', 'competitive-teams', 'open-gym'],
  },

  // REBOUNDERZ
  {
    name: 'Rebounderz Sterling',
    address: '21800 Towncenter Plaza',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20164',
    latitude: 39.0118,
    longitude: -77.4078,
    phone: '(703) 997-9111',
    website: 'https://rfranchising.com/sterling',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Loudoun County',
    description: 'Indoor trampoline arena with wall-to-wall trampolines, ninja course, foam pits, and slam dunk zone. Toddler time and camps.',
    cost: '$16-28/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'ninja-course', 'foam-pits', 'basketball', 'toddler-time', 'camps', 'birthday-parties'],
  },

  // FLYING SQUIRREL
  {
    name: 'Flying Squirrel Sports Warrenton',
    address: '6345 Trading Square',
    city: 'Warrenton',
    state: 'VA',
    zipCode: '20187',
    latitude: 38.7318,
    longitude: -77.7918,
    phone: '(540) 216-2009',
    website: 'https://flyingsquirrelsports.com/warrenton',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Fauquier County',
    description: 'Trampoline and adventure park with trampolines, zip line, ninja course, and climbing wall. Birthday parties and toddler time.',
    cost: '$18-30/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'zip-line', 'ninja-course', 'climbing', 'toddler-time', 'birthday-parties'],
  },

  // BIG AIR
  {
    name: 'Big Air Trampoline Park Columbia',
    address: '6630 Marie Curie Drive',
    city: 'Elkridge',
    state: 'MD',
    zipCode: '21075',
    latitude: 39.2118,
    longitude: -76.7778,
    phone: '(410) 540-0400',
    website: 'https://bigairusa.com/columbia',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Howard County',
    description: 'Trampoline park with 100+ connected trampolines, battle beams, ninja course, and stunt fall. Kids jump time available.',
    cost: '$18-32/hour',
    ageRange: 'Ages 3+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'battle-beams', 'ninja-course', 'stunt-fall', 'kids-time', 'birthday-parties'],
  },

  // FLIGHT TRAMPOLINE
  {
    name: 'Flight Trampoline Park Springfield',
    address: '6546-B Backlick Road',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22150',
    latitude: 38.7778,
    longitude: -77.1918,
    phone: '(703) 924-7529',
    website: 'https://flightfit.com/springfield',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 10am-9pm',
    county: 'Fairfax County',
    description: 'Trampoline park with open jump, foam pits, dodgeball, fitness classes, and ninja zone. Kids fitness programs available.',
    cost: '$15-28/hour',
    ageRange: 'Ages 3+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'dodgeball', 'fitness-classes', 'ninja-zone', 'birthday-parties'],
  },

  // CLIFF HANGER ACADEMY (Ninja + Climbing)
  {
    name: 'CliffHanger Academy Kensington',
    address: '10400 Connecticut Avenue',
    city: 'Kensington',
    state: 'MD',
    zipCode: '20895',
    latitude: 39.0318,
    longitude: -77.0778,
    phone: '(301) 962-0123',
    website: 'https://cliffhangeracademy.com',
    hours: 'Mon-Fri 3pm-8pm, Sat-Sun 9am-5pm',
    county: 'Montgomery County',
    description: 'Climbing and ninja warrior gym with bouldering, rope climbing, and obstacle courses. Classes for kids ages 4-14, camps, and open gym.',
    cost: '$20-35/class, $18-25/open gym',
    ageRange: 'Ages 4-14',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'rock-climbing', 'bouldering', 'classes', 'camps', 'open-gym', 'birthday-parties'],
  },

  // SUPER FUN OBSTACLE COURSE
  {
    name: 'Super Fun Obstacle Course Rockville',
    address: '1500 E Gude Drive',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20850',
    latitude: 39.0878,
    longitude: -77.1388,
    phone: '(301) 309-0202',
    website: 'https://superfunobstaclecourse.com',
    hours: 'Mon-Fri 4pm-8pm, Sat-Sun 10am-6pm',
    county: 'Montgomery County',
    description: 'Indoor obstacle course park with ninja warrior obstacles, wipeout-style challenges, and fitness games. Classes and open play.',
    cost: '$15-25/session',
    ageRange: 'Ages 5-12',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'obstacle-course', 'fitness', 'classes', 'open-play', 'birthday-parties'],
  },

  // ==========================================
  // EASTERN US EXPANSION
  // ==========================================

  // NEW YORK
  { name: 'Sky Zone West Nyack', address: '150 N Middletown Rd', city: 'West Nyack', state: 'NY', zipCode: '10994', latitude: 41.0889, longitude: -73.9500, phone: '', website: 'https://www.skyzone.com/westnyack', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Rockland County', description: 'Sky Zone trampoline park with open jump, dodgeball, foam pit, ninja course, and birthday party packages.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Lake Grove', address: '2187 Nesconset Hwy', city: 'Lake Grove', state: 'NY', zipCode: '11755', latitude: 40.8483, longitude: -73.1225, phone: '', website: 'https://www.skyzone.com/lakegrove', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Suffolk County', description: 'Long Island Sky Zone with wall-to-wall trampolines, sky slam basketball, foam zone, and ninja warrior obstacles.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'basketball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Defy Plainview', address: '330 Old Country Rd', city: 'Plainview', state: 'NY', zipCode: '11803', latitude: 40.7763, longitude: -73.4672, phone: '', website: 'https://defy.com/parks/plainview', hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Nassau County', description: 'Defy adventure park with trampolines, ninja obstacles, climbing walls, foam pits, and dodgeball on Long Island.', cost: '$19-28/hour', ageRange: 'Ages 3+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'ninja-obstacles', 'climbing', 'dodgeball', 'birthday-parties'] },
  { name: 'Urban Air Wappingers Falls', address: '1620 US-9', city: 'Wappingers Falls', state: 'NY', zipCode: '12590', latitude: 41.5926, longitude: -73.9176, phone: '', website: 'https://www.urbanair.com/new-york/wappingers-falls', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Dutchess County', description: 'Urban Air adventure park with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },

  // NEW JERSEY
  { name: 'Sky Zone Parsippany', address: '3640 Route 46', city: 'Parsippany', state: 'NJ', zipCode: '07054', latitude: 40.8573, longitude: -74.4357, phone: '', website: 'https://www.skyzone.com/parsippany', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Morris County', description: 'Sky Zone with open jump, dodgeball courts, foam zone, and SkySlam basketball. Toddler time available.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'basketball', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Freehold', address: '3710 Route 9', city: 'Freehold', state: 'NJ', zipCode: '07728', latitude: 40.2268, longitude: -74.2732, phone: '', website: 'https://www.urbanair.com/new-jersey/freehold', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Monmouth County', description: 'Urban Air adventure park with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Launch Trampoline Park Lakewood', address: '1900 Ocean Ave', city: 'Lakewood', state: 'NJ', zipCode: '08701', latitude: 40.0751, longitude: -74.2043, phone: '', website: 'https://launchtrampolinepark.com/lakewood', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Ocean County', description: 'Launch Trampoline Park with wall-to-wall trampolines, ninja course, foam pits, and toddler time.', cost: '$15-25/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // PENNSYLVANIA
  { name: 'Sky Zone Allentown', address: '5000 Mack Blvd', city: 'Allentown', state: 'PA', zipCode: '18103', latitude: 40.6085, longitude: -75.4800, phone: '', website: 'https://www.skyzone.com/allentown', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Lehigh County', description: 'Sky Zone trampoline park in the Lehigh Valley with open jump, foam pit, dodgeball, and ninja course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Pittsburgh', address: '580 Rodi Rd', city: 'Pittsburgh', state: 'PA', zipCode: '15235', latitude: 40.4500, longitude: -79.8200, phone: '', website: 'https://www.urbanair.com/pennsylvania/pittsburgh', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Allegheny County', description: 'Urban Air with trampolines, climbing walls, ninja warrior obstacles, and laser tag in the Pittsburgh area.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Altitude Trampoline Park Dickson City', address: '5099 Commerce Blvd', city: 'Dickson City', state: 'PA', zipCode: '18519', latitude: 41.4603, longitude: -75.6246, phone: '', website: 'https://altitudetrampolinepark.com/dickson-city', hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm', county: 'Lackawanna County', description: 'Altitude Trampoline Park in Scranton area with main court, foam zone, dodgeball, and kids court.', cost: '$15-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'kids-court', 'toddler-time', 'birthday-parties'] },

  // CONNECTICUT
  { name: 'Sky Zone Rocky Hill', address: '2003 Silas Deane Hwy', city: 'Rocky Hill', state: 'CT', zipCode: '06067', latitude: 41.6615, longitude: -72.6404, phone: '', website: 'https://www.skyzone.com/rockyhill', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Hartford County', description: 'Sky Zone with open jump, foam pit, dodgeball courts, and ninja warrior obstacles in central CT.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Milford', address: '75 Barnum Ave Cutoff', city: 'Milford', state: 'CT', zipCode: '06460', latitude: 41.2224, longitude: -73.0565, phone: '', website: 'https://www.urbanair.com/connecticut/milford', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'New Haven County', description: 'Urban Air adventure park in southern CT with trampolines, climbing walls, and ninja obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // MASSACHUSETTS
  { name: 'Sky Zone Braintree', address: '250 Granite St', city: 'Braintree', state: 'MA', zipCode: '02184', latitude: 42.2084, longitude: -71.0035, phone: '', website: 'https://www.skyzone.com/braintree', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Norfolk County', description: 'Sky Zone south of Boston with trampolines, foam pits, dodgeball, sky slam basketball, and toddler time.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'basketball', 'toddler-time', 'birthday-parties'] },
  { name: 'Launch Trampoline Park Woburn', address: '35 Cabot Rd', city: 'Woburn', state: 'MA', zipCode: '01801', latitude: 42.4890, longitude: -71.1544, phone: '', website: 'https://launchtrampolinepark.com/woburn', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Middlesex County', description: 'Launch Trampoline Park north of Boston with trampolines, foam zones, ninja obstacles, and toddler time.', cost: '$15-25/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Dartmouth', address: '700 State Rd', city: 'Dartmouth', state: 'MA', zipCode: '02747', latitude: 41.6390, longitude: -70.9672, phone: '', website: 'https://www.skyzone.com/dartmouth', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Bristol County', description: 'Sky Zone in SouthCoast MA with open jump, foam pit, dodgeball, and ninja warrior course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // RHODE ISLAND
  { name: 'Launch Trampoline Park Warwick', address: '975 Bald Hill Rd', city: 'Warwick', state: 'RI', zipCode: '02886', latitude: 41.7001, longitude: -71.4162, phone: '', website: 'https://launchtrampolinepark.com/warwick', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Kent County', description: 'Launch Trampoline Park in Warwick with trampolines, ninja obstacles, foam pits, and toddler time.', cost: '$15-25/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // NEW HAMPSHIRE
  { name: 'Sky Zone Manchester', address: '1000 S River Rd', city: 'Manchester', state: 'NH', zipCode: '03103', latitude: 42.9956, longitude: -71.4548, phone: '', website: 'https://www.skyzone.com/manchester-nh', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Hillsborough County', description: 'Sky Zone in Manchester NH with trampolines, foam pits, dodgeball, and ninja warrior course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // MAINE
  { name: 'Sky Zone South Portland', address: '555 Gorham Rd', city: 'South Portland', state: 'ME', zipCode: '04106', latitude: 43.6359, longitude: -70.3072, phone: '', website: 'https://www.skyzone.com/southportland', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Cumberland County', description: 'Sky Zone in the Portland ME area with open jump, foam zone, dodgeball, and ninja obstacles.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // DELAWARE
  { name: 'Urban Air Newark', address: '1401 Churchmans Rd', city: 'Newark', state: 'DE', zipCode: '19713', latitude: 39.6837, longitude: -75.7497, phone: '', website: 'https://www.urbanair.com/delaware/newark', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'New Castle County', description: 'Urban Air adventure park in northern Delaware with trampolines, climbing walls, and ninja obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // NORTH CAROLINA
  { name: 'Urban Air Matthews', address: '1901 Matthews Township Pkwy', city: 'Matthews', state: 'NC', zipCode: '28105', latitude: 35.1160, longitude: -80.7205, phone: '', website: 'https://www.urbanair.com/north-carolina/matthews', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Mecklenburg County', description: 'Urban Air adventure park in Charlotte metro with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Garner', address: '101 Mall Service Rd', city: 'Garner', state: 'NC', zipCode: '27529', latitude: 35.6721, longitude: -78.6208, phone: '', website: 'https://www.urbanair.com/north-carolina/garner', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Wake County', description: 'Urban Air in Raleigh metro with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Cary', address: '1540 NW Maynard Rd', city: 'Cary', state: 'NC', zipCode: '27513', latitude: 35.7904, longitude: -78.7811, phone: '', website: 'https://www.skyzone.com/cary', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Wake County', description: 'Sky Zone in Cary NC with open jump, foam pit, dodgeball, and ninja warrior course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Altitude Trampoline Park Greensboro', address: '3905 W Market St', city: 'Greensboro', state: 'NC', zipCode: '27407', latitude: 36.0726, longitude: -79.7920, phone: '', website: 'https://altitudetrampolinepark.com/greensboro', hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm', county: 'Guilford County', description: 'Altitude Trampoline Park in Greensboro with main court, foam zone, dodgeball, and fitness classes.', cost: '$15-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'fitness-classes', 'toddler-time', 'birthday-parties'] },

  // SOUTH CAROLINA
  { name: 'Urban Air Columbia', address: '3500 Landmark Dr', city: 'Columbia', state: 'SC', zipCode: '29204', latitude: 34.0007, longitude: -81.0348, phone: '', website: 'https://www.urbanair.com/south-carolina/columbia', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Richland County', description: 'Urban Air in Columbia SC with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Myrtle Beach', address: '3080 Howard Ave', city: 'Myrtle Beach', state: 'SC', zipCode: '29577', latitude: 33.6891, longitude: -78.8867, phone: '', website: 'https://www.urbanair.com/south-carolina/myrtle-beach', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Horry County', description: 'Urban Air in Myrtle Beach with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Greenville', address: '3620 Pelham Rd', city: 'Greenville', state: 'SC', zipCode: '29615', latitude: 34.8526, longitude: -82.3940, phone: '', website: 'https://www.skyzone.com/greenville', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Greenville County', description: 'Sky Zone in Upstate SC with open jump, foam pit, dodgeball, and ninja course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // GEORGIA
  { name: 'Urban Air Kennesaw', address: '1600 Roberts Blvd NW', city: 'Kennesaw', state: 'GA', zipCode: '30144', latitude: 34.0200, longitude: -84.6000, phone: '', website: 'https://www.urbanair.com/georgia/kennesaw', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Cobb County', description: 'Urban Air in the Atlanta metro north area with trampolines, climbing walls, and ninja obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Savannah', address: '7805 Abercorn St', city: 'Savannah', state: 'GA', zipCode: '31406', latitude: 32.0835, longitude: -81.0998, phone: '', website: 'https://www.urbanair.com/georgia/savannah', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Chatham County', description: 'Urban Air in Savannah GA with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Sandy Springs', address: '200 Hammond Dr NE', city: 'Sandy Springs', state: 'GA', zipCode: '30328', latitude: 33.9260, longitude: -84.3710, phone: '', website: 'https://www.skyzone.com/sandysprings', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Fulton County', description: 'Sky Zone in Atlanta metro north with open jump, dodgeball, foam pit, and ninja course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Altitude Trampoline Park Augusta', address: '2625 Washington Rd', city: 'Augusta', state: 'GA', zipCode: '30904', latitude: 33.4735, longitude: -82.0105, phone: '', website: 'https://altitudetrampolinepark.com/augusta', hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm', county: 'Richmond County', description: 'Altitude Trampoline Park in Augusta GA with main court, foam zone, dodgeball, and kids area.', cost: '$15-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'kids-court', 'toddler-time', 'birthday-parties'] },

  // FLORIDA
  { name: 'Urban Air Brandon', address: '1600 W Brandon Blvd', city: 'Brandon', state: 'FL', zipCode: '33511', latitude: 27.9371, longitude: -82.2870, phone: '', website: 'https://www.urbanair.com/florida/brandon', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Hillsborough County', description: 'Urban Air in Tampa Bay area with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Jacksonville', address: '9450 Arlington Expy', city: 'Jacksonville', state: 'FL', zipCode: '32225', latitude: 30.3540, longitude: -81.5460, phone: '', website: 'https://www.urbanair.com/florida/jacksonville', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Duval County', description: 'Urban Air in Jacksonville FL with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Altamonte Springs', address: '475 E Altamonte Dr', city: 'Altamonte Springs', state: 'FL', zipCode: '32701', latitude: 28.6610, longitude: -81.3650, phone: '', website: 'https://www.urbanair.com/florida/altamonte-springs', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Seminole County', description: 'Urban Air near Orlando with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Pensacola', address: '5100 N 9th Ave', city: 'Pensacola', state: 'FL', zipCode: '32504', latitude: 30.4213, longitude: -87.2169, phone: '', website: 'https://www.skyzone.com/pensacola', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Escambia County', description: 'Sky Zone in the Florida Panhandle with open jump, foam pit, dodgeball, and ninja warrior course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // ALABAMA
  { name: 'Urban Air Hoover', address: '1590 Montgomery Hwy', city: 'Hoover', state: 'AL', zipCode: '35216', latitude: 33.3966, longitude: -86.7971, phone: '', website: 'https://www.urbanair.com/alabama/hoover', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Jefferson County', description: 'Urban Air in Birmingham metro with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Huntsville', address: '6275 University Dr NW', city: 'Huntsville', state: 'AL', zipCode: '35806', latitude: 34.7304, longitude: -86.5861, phone: '', website: 'https://www.urbanair.com/alabama/huntsville', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Madison County', description: 'Urban Air in Huntsville AL with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Sky Zone Montgomery', address: '1505 Eastern Blvd', city: 'Montgomery', state: 'AL', zipCode: '36117', latitude: 32.3617, longitude: -86.2792, phone: '', website: 'https://www.skyzone.com/montgomery', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Montgomery County', description: 'Sky Zone in Montgomery AL with trampolines, foam pits, dodgeball, and ninja warrior course.', cost: '$18-24/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },

  // TENNESSEE
  { name: 'Urban Air Antioch', address: '1000 Bell Rd', city: 'Antioch', state: 'TN', zipCode: '37013', latitude: 36.0607, longitude: -86.5863, phone: '', website: 'https://www.urbanair.com/tennessee/antioch', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Davidson County', description: 'Urban Air in Nashville metro with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Memphis', address: '8455 Hwy 64', city: 'Memphis', state: 'TN', zipCode: '38133', latitude: 35.2200, longitude: -89.8900, phone: '', website: 'https://www.urbanair.com/tennessee/memphis', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Shelby County', description: 'Urban Air in Memphis TN with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
  { name: 'Altitude Trampoline Park Knoxville', address: '2250 Thunderhead Rd', city: 'Knoxville', state: 'TN', zipCode: '37922', latitude: 35.9606, longitude: -83.9207, phone: '', website: 'https://altitudetrampolinepark.com/knoxville', hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm', county: 'Knox County', description: 'Altitude Trampoline Park in West Knoxville with main court, foam zone, dodgeball, and kids area.', cost: '$15-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'foam-pits', 'dodgeball', 'kids-court', 'toddler-time', 'birthday-parties'] },

  // KENTUCKY
  { name: 'Urban Air Louisville', address: '4201 Shelbyville Rd', city: 'Louisville', state: 'KY', zipCode: '40207', latitude: 38.2527, longitude: -85.7585, phone: '', website: 'https://www.urbanair.com/kentucky/louisville', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Jefferson County', description: 'Urban Air in Louisville KY with trampolines, climbing walls, ninja obstacles, and laser tag.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'laser-tag', 'toddler-time', 'birthday-parties'] },
  { name: 'Urban Air Lexington', address: '1980 Star Shoot Pkwy', city: 'Lexington', state: 'KY', zipCode: '40509', latitude: 38.0406, longitude: -84.5037, phone: '', website: 'https://www.urbanair.com/kentucky/lexington', hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm', county: 'Fayette County', description: 'Urban Air in Lexington KY with trampolines, climbing walls, and ninja warrior obstacles.', cost: '$19-28/hour', ageRange: 'Ages 2+', isFree: false, venueType: 'trampoline-park', features: ['trampolines', 'climbing', 'ninja-obstacles', 'toddler-time', 'birthday-parties'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'trampoline-park': { category: 'Indoor', subcategory: 'Trampoline Park' },
    'ninja-gym': { category: 'Indoor', subcategory: 'Ninja Warrior Gym' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Active Play' };
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
      source: 'trampoline-ninja-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: true,
      hasParking: true,
      hasToddlerTime: location.features.includes('toddler-time') || location.features.includes('kids-time'),
      hasNinjaObstacles: location.features.includes('ninja-obstacles') || location.features.includes('ninja-course'),
      hasTrampolines: location.features.includes('trampolines'),
      hasBirthdayParties: location.features.includes('birthday-parties'),
      hasClasses: location.features.includes('classes') || location.features.includes('fitness-classes'),
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

async function scrapeTrampolineNinjaDMV() {
  console.log(`\n🦘 TRAMPOLINE & NINJA PARKS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🦘 Processing Trampoline & Ninja Parks...');

  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of TRAMPOLINE_NINJA_VENUES) {
    if (!stateGroups[venue.state]) stateGroups[venue.state] = [];
    stateGroups[venue.state].push(venue);
  }
  for (const [state, venues] of Object.entries(stateGroups).sort()) {
    console.log(`\n  ${state} (${venues.length} venues):`);
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
  console.log(`✅ TRAMPOLINE & NINJA PARKS DMV SCRAPER COMPLETE`);
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

async function scrapeTrampolineNinjaDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeTrampolineNinjaDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Trampoline & Ninja Parks DMV Scraper');
  scrapeTrampolineNinjaDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeTrampolineNinjaDMV,
  scrapeTrampolineNinjaDMVCloudFunction,
};
