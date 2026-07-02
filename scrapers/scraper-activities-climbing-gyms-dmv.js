#!/usr/bin/env node

/**
 * CLIMBING GYMS DMV ACTIVITIES SCRAPER
 *
 * Adds rock climbing gyms and bouldering facilities to the activities collection.
 * Focuses on venues with youth programs, family climbing, and lessons.
 *
 * Coverage:
 * - Earth Treks / Movement Climbing
 * - Sportrock
 * - Triangle Rock Club
 * - Vertical Rock
 *
 * Usage:
 *   node scraper-activities-climbing-gyms-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledClimbingGymsDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'ClimbingGyms-Eastern';

// ==========================================
// VENUE DATA - DMV Climbing Gyms
// ==========================================

const CLIMBING_GYMS = [
  // EARTH TREKS / MOVEMENT
  {
    name: 'Movement Rockville',
    address: '725 Rockville Pike',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0568,
    longitude: -77.1208,
    phone: '(240) 499-5200',
    website: 'https://movementgyms.com/rockville',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'Montgomery County',
    description: 'Full-service climbing gym with bouldering, top rope, lead climbing, and fitness. Offers youth programs, camps, and family climbing times.',
    cost: '$25-30/day pass',
    ageRange: 'Ages 4+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'camps', 'fitness'],
  },
  {
    name: 'Movement Columbia',
    address: '7125 Columbia Gateway Drive',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21046',
    latitude: 39.1918,
    longitude: -76.8178,
    phone: '(443) 283-8900',
    website: 'https://movementgyms.com/columbia',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'Howard County',
    description: 'State-of-the-art climbing facility with extensive bouldering and rope climbing. Features dedicated kids climbing area and youth team programs.',
    cost: '$25-30/day pass',
    ageRange: 'Ages 4+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'lead-climbing', 'kids-area', 'youth-teams', 'fitness'],
  },
  {
    name: 'Movement Hampden',
    address: '1300 Bank Street',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21231',
    latitude: 39.2978,
    longitude: -76.5998,
    phone: '(410) 878-7280',
    website: 'https://movementgyms.com/hampden',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'Baltimore City',
    description: 'Baltimore\'s premier climbing gym with bouldering and rope climbing. Family-friendly with youth programs and birthday parties.',
    cost: '$22-28/day pass',
    ageRange: 'Ages 4+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'youth-programs', 'birthday-parties', 'fitness'],
  },
  {
    name: 'Movement Timonium',
    address: '10029 York Road',
    city: 'Cockeysville',
    state: 'MD',
    zipCode: '21030',
    latitude: 39.4378,
    longitude: -76.6378,
    phone: '(410) 252-5900',
    website: 'https://movementgyms.com/timonium',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'Baltimore County',
    description: 'Large climbing facility north of Baltimore with extensive walls. Youth climbing programs and family climbing available.',
    cost: '$22-28/day pass',
    ageRange: 'Ages 4+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'fitness'],
  },

  // SPORTROCK
  {
    name: 'Sportrock Climbing Center - Sterling',
    address: '45935 Maries Road',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20166',
    latitude: 39.0178,
    longitude: -77.4178,
    phone: '(703) 212-7625',
    website: 'https://sportrock.com/sterling',
    hours: 'Mon-Fri 10am-10pm, Sat-Sun 10am-8pm',
    county: 'Loudoun County',
    description: 'Premier climbing gym with 45-foot walls, bouldering, and kids area. Offers youth climbing teams, camps, and birthday parties.',
    cost: '$20-26/day pass',
    ageRange: 'Ages 5+',
    isFree: false,
    features: ['tall-walls', 'bouldering', 'kids-area', 'youth-teams', 'camps', 'birthday-parties'],
  },
  {
    name: 'Sportrock Climbing Center - Alexandria',
    address: '5308 Eisenhower Avenue',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22304',
    latitude: 38.8018,
    longitude: -77.1178,
    phone: '(703) 212-7625',
    website: 'https://sportrock.com/alexandria',
    hours: 'Mon-Fri 10am-10pm, Sat-Sun 10am-8pm',
    county: 'City of Alexandria',
    description: 'Full-service climbing gym with bouldering and rope climbing. Family-friendly with youth programs and climbing lessons.',
    cost: '$20-26/day pass',
    ageRange: 'Ages 5+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'fitness'],
  },

  // TRIANGLE ROCK CLUB
  {
    name: 'Triangle Rock Club - Richmond Highway',
    address: '6350 Richmond Highway',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22306',
    latitude: 38.7678,
    longitude: -77.0778,
    phone: '(571) 312-7625',
    website: 'https://trianglerockclub.com/richmond-highway',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'Fairfax County',
    description: 'Climbing gym with bouldering, top rope, and lead climbing. Features youth programs, summer camps, and family climbing.',
    cost: '$24-30/day pass',
    ageRange: 'Ages 5+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'camps'],
  },

  // VERTICAL ROCK
  {
    name: 'Vertical Rock Climbing & Fitness',
    address: '9404-A Main Street',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20110',
    latitude: 38.7518,
    longitude: -77.4718,
    phone: '(703) 369-0222',
    website: 'https://verticalrockva.com',
    hours: 'Mon-Fri 12pm-10pm, Sat-Sun 10am-8pm',
    county: 'Prince William County',
    description: 'Community climbing gym with bouldering and top rope. Great for beginners and families with affordable rates and lessons.',
    cost: '$15-20/day pass',
    ageRange: 'Ages 5+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'lessons', 'beginner-friendly', 'affordable'],
  },

  // EARTH TREKS / MOVEMENT DC
  {
    name: 'Movement DC',
    address: '1901 Rhode Island Avenue NE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20018',
    latitude: 38.9278,
    longitude: -76.9878,
    phone: '(202) 526-1101',
    website: 'https://movementgyms.com/dc',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'District of Columbia',
    description: 'DC\'s largest climbing gym with extensive bouldering and rope climbing. Features youth programs, camps, and fitness facilities.',
    cost: '$25-32/day pass',
    ageRange: 'Ages 4+',
    isFree: false,
    features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'camps', 'fitness', 'yoga'],
  },

  // ADDITIONAL CLIMBING GYMS
  {
    name: 'Climbers Asylum',
    address: '2660 Coney Island Avenue',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21701',
    latitude: 39.4278,
    longitude: -77.4178,
    phone: '(301) 644-3722',
    website: 'https://www.climbersasylum.com',
    hours: 'Mon-Fri 12pm-9pm, Sat-Sun 10am-6pm',
    county: 'Frederick County',
    description: 'Frederick\'s local climbing gym with bouldering and top rope. Friendly atmosphere for beginners and families.',
    cost: '$15-18/day pass',
    ageRange: 'All Ages',
    isFree: false,
    features: ['bouldering', 'top-rope', 'beginner-friendly', 'lessons'],
  },

  // ==========================================
  // EASTERN US EXPANSION — CLIMBING GYMS
  // ==========================================

  // NEW YORK
  { name: 'Brooklyn Boulders Gowanus', address: '575 Degraw St', city: 'Brooklyn', state: 'NY', zipCode: '11217', latitude: 40.6779, longitude: -73.9931, phone: '(347) 834-9066', website: 'https://www.brooklynboulders.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'Kings County', description: 'Brooklyn Boulders flagship with bouldering, top rope, lead climbing, yoga, and fitness. Kids programs and birthday parties.', cost: '$25-35/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'yoga', 'kids-programs', 'birthday-parties'] },
  { name: 'Movement Climbing New York', address: '25 W 26th St', city: 'New York', state: 'NY', zipCode: '10010', latitude: 40.7441, longitude: -73.9897, phone: '(212) 929-2890', website: 'https://www.movementgyms.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'New York County', description: 'Movement Climbing in Chelsea with bouldering, top rope, lead climbing, and fitness. Youth programs and birthday parties.', cost: '$25-35/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'fitness', 'youth-programs', 'birthday-parties'] },

  // NEW JERSEY
  { name: 'Gravity Vault Upper Saddle River', address: '65 Route 17', city: 'Upper Saddle River', state: 'NJ', zipCode: '07458', latitude: 41.0637, longitude: -74.0976, phone: '(201) 760-1800', website: 'https://www.gravityvault.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Bergen County', description: 'Gravity Vault climbing gym with bouldering, top rope, and lead climbing. Youth camps and birthday parties.', cost: '$20-28/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-camps', 'birthday-parties', 'lessons'] },

  // PENNSYLVANIA
  { name: 'Earth Treks Philadelphia', address: '1000 Callowhill St', city: 'Philadelphia', state: 'PA', zipCode: '19123', latitude: 39.9620, longitude: -75.1551, phone: '(215) 278-7900', website: 'https://www.earthtreksclimbing.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'Philadelphia County', description: 'Earth Treks Philadelphia with bouldering, top rope, lead climbing, and fitness. Youth programs and birthday parties.', cost: '$25-35/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'fitness', 'youth-programs', 'birthday-parties'] },
  { name: 'Climbers Edge Pittsburgh', address: '2416 Penn Ave', city: 'Pittsburgh', state: 'PA', zipCode: '15222', latitude: 40.4566, longitude: -79.9914, phone: '(412) 765-3200', website: 'https://www.climbersedge.net', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Allegheny County', description: 'Local Pittsburgh climbing gym with bouldering, top rope, and youth programs. Great for families and beginners.', cost: '$18-25/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'beginner-friendly'] },

  // CONNECTICUT
  { name: 'Central Rock Gym Glastonbury', address: '2 Nye Rd', city: 'Glastonbury', state: 'CT', zipCode: '06033', latitude: 41.7109, longitude: -72.5959, phone: '(860) 633-7625', website: 'https://www.centralrockgym.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Hartford County', description: 'Central Rock Gym near Hartford CT with bouldering, top rope, and lead climbing. Youth programs and birthday parties.', cost: '$20-28/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'birthday-parties'] },

  // MASSACHUSETTS
  { name: 'Brooklyn Boulders Boston', address: '12 Strathmore Rd', city: 'Natick', state: 'MA', zipCode: '01760', latitude: 42.2835, longitude: -71.3620, phone: '(508) 650-8100', website: 'https://www.brooklynboulders.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'Middlesex County', description: 'Brooklyn Boulders in the Boston metro with bouldering, top rope, yoga, and fitness. Kids programs and birthday parties.', cost: '$25-35/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'yoga', 'fitness', 'kids-programs', 'birthday-parties'] },
  { name: 'Central Rock Gym Worcester', address: '195 SW Cutoff', city: 'Worcester', state: 'MA', zipCode: '01604', latitude: 42.2487, longitude: -71.8098, phone: '(508) 459-5296', website: 'https://www.centralrockgym.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Worcester County', description: 'Central Rock Gym in Worcester MA with bouldering, top rope, and youth climbing programs and summer camps.', cost: '$20-28/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'birthday-parties', 'beginner-friendly'] },

  // RHODE ISLAND
  { name: 'Central Rock Gym Warwick', address: '100 Warwick Mall Rd', city: 'Warwick', state: 'RI', zipCode: '02886', latitude: 41.7009, longitude: -71.4680, phone: '(401) 753-9330', website: 'https://www.centralrockgym.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Kent County', description: 'Central Rock Gym in Warwick RI with bouldering, top rope, and youth programs near Providence.', cost: '$20-28/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'birthday-parties', 'beginner-friendly'] },

  // NEW HAMPSHIRE
  { name: 'Vertical Dreams Manchester', address: '250 Commercial St', city: 'Manchester', state: 'NH', zipCode: '03101', latitude: 42.9956, longitude: -71.4548, phone: '(603) 625-6919', website: 'https://www.verticaldreams.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-7pm', county: 'Hillsborough County', description: 'Indoor climbing gym in Manchester NH with bouldering, top rope, and youth programs.', cost: '$18-25/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'beginner-friendly'] },

  // MAINE
  { name: 'Acadia Mountain Guides Portland', address: '67 Maine St', city: 'Portland', state: 'ME', zipCode: '04101', latitude: 43.6591, longitude: -70.2568, phone: '(207) 866-7562', website: 'https://www.acadiamountainguides.com', hours: 'Mon-Fri 10am-8pm, Sat-Sun 9am-6pm', county: 'Cumberland County', description: 'Climbing school and indoor gym in Portland ME with youth programs, birthday parties, and beginner lessons.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'beginner-friendly', 'birthday-parties'] },

  // NORTH CAROLINA
  { name: 'Triangle Rock Club Morrisville', address: '105 Pease Rd', city: 'Morrisville', state: 'NC', zipCode: '27560', latitude: 35.8331, longitude: -78.7958, phone: '(919) 463-7625', website: 'https://www.trianglerockclub.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'Wake County', description: 'Triangle Rock Club in the Raleigh metro with bouldering, top rope, lead climbing, and youth programs.', cost: '$20-28/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'birthday-parties', 'fitness'] },
  { name: 'Summit Climbing Charlotte', address: '400 E Morehead St', city: 'Charlotte', state: 'NC', zipCode: '28202', latitude: 35.2165, longitude: -80.8374, phone: '(704) 716-6400', website: 'https://www.summitclimbing.com', hours: 'Mon-Fri 5am-10pm, Sat 7am-8pm, Sun 12pm-6pm', county: 'Mecklenburg County', description: 'Indoor climbing gym in Charlotte with bouldering, top rope, and youth programs for all skill levels.', cost: '$20-28/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'birthday-parties'] },

  // SOUTH CAROLINA
  { name: 'Vertical Ventures Columbia', address: '1300 Williams St', city: 'Columbia', state: 'SC', zipCode: '29201', latitude: 33.9990, longitude: -81.0348, phone: '(803) 799-0995', website: 'https://www.verticalventuressc.com', hours: 'Mon-Fri 10am-9pm, Sat-Sun 10am-7pm', county: 'Richland County', description: 'Columbia SC climbing gym with bouldering, top rope, and youth climbing programs and summer camps.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'birthday-parties', 'beginner-friendly'] },

  // GEORGIA
  { name: 'Stone Summit Atlanta', address: '3700 Peachtree Rd NE', city: 'Atlanta', state: 'GA', zipCode: '30319', latitude: 33.8462, longitude: -84.3710, phone: '(404) 351-6624', website: 'https://www.stonesummit.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'DeKalb County', description: 'Stone Summit climbing gym in Atlanta with bouldering, top rope, lead climbing, and youth programs.', cost: '$25-35/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'fitness', 'birthday-parties'] },

  // FLORIDA
  { name: 'Aiguille Rock Climbing Orange Park', address: '1757 Wells Rd', city: 'Orange Park', state: 'FL', zipCode: '32073', latitude: 30.1534, longitude: -81.7063, phone: '(904) 272-8066', website: 'https://www.aiguilleclimbing.com', hours: 'Mon-Fri 11am-9pm, Sat-Sun 10am-7pm', county: 'Clay County', description: 'Rock climbing gym near Jacksonville FL with bouldering, top rope, and youth programs.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'birthday-parties'] },
  { name: 'Tampa Bay Boulders', address: '1001 E Palm Ave', city: 'Tampa', state: 'FL', zipCode: '33605', latitude: 27.9591, longitude: -82.4379, phone: '(813) 540-5858', website: 'https://www.tampabayboulders.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Hillsborough County', description: 'Bouldering-focused climbing gym in Tampa with youth programs, summer camps, and birthday parties.', cost: '$18-25/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'youth-programs', 'birthday-parties', 'beginner-friendly', 'fitness'] },

  // ALABAMA
  { name: 'Birmingham Bouldering Project', address: '2600 John Hawkins Pkwy', city: 'Hoover', state: 'AL', zipCode: '35244', latitude: 33.3829, longitude: -86.7944, phone: '(205) 733-1900', website: 'https://www.birminghamboulders.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Jefferson County', description: 'Climbing gym in Birmingham metro with bouldering, top rope, and youth programs. Great for families.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'beginner-friendly'] },

  // MISSISSIPPI
  { name: 'High Point Climbing Flowood', address: '500 Lakeland Dr', city: 'Flowood', state: 'MS', zipCode: '39232', latitude: 32.3526, longitude: -90.0920, phone: '(601) 939-5755', website: 'https://www.highpointclimbing.com', hours: 'Mon-Fri 10am-9pm, Sat-Sun 9am-7pm', county: 'Rankin County', description: 'Indoor climbing gym near Jackson MS with bouldering, top rope, and youth programs. Family friendly.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'birthday-parties'] },

  // TENNESSEE
  { name: 'Climb Nashville', address: '3600 Charlotte Ave', city: 'Nashville', state: 'TN', zipCode: '37209', latitude: 36.1528, longitude: -86.8335, phone: '(615) 385-8000', website: 'https://www.climbnashville.com', hours: 'Mon-Fri 6am-11pm, Sat-Sun 8am-9pm', county: 'Davidson County', description: 'Climb Nashville indoor climbing gym with bouldering, top rope, lead climbing, and youth programs.', cost: '$18-25/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'lead-climbing', 'youth-programs', 'birthday-parties', 'fitness'] },
  { name: 'Climbmax Memphis', address: '2845 Lamar Ave', city: 'Memphis', state: 'TN', zipCode: '38114', latitude: 35.1213, longitude: -90.0054, phone: '(901) 743-0000', website: 'https://www.climbmaxmemphis.com', hours: 'Mon-Fri 10am-9pm, Sat-Sun 9am-7pm', county: 'Shelby County', description: 'Indoor climbing gym in Memphis with bouldering, top rope, and youth climbing programs.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'lessons', 'beginner-friendly'] },

  // KENTUCKY
  { name: 'Climb Time Louisville', address: '4107 Bardstown Rd', city: 'Louisville', state: 'KY', zipCode: '40218', latitude: 38.1929, longitude: -85.6490, phone: '(502) 499-2800', website: 'https://www.climbtimelouisville.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Jefferson County', description: 'Climb Time indoor climbing in Louisville KY with bouldering, top rope, and youth programs. Birthday parties available.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'birthday-parties', 'beginner-friendly'] },

  // WEST VIRGINIA
  { name: 'New River Climbing School Morgantown', address: '300 High St', city: 'Morgantown', state: 'WV', zipCode: '26505', latitude: 39.6295, longitude: -79.9559, phone: '(304) 574-3872', website: 'https://www.newriverclimbing.com', hours: 'Mon-Fri 10am-9pm, Sat-Sun 9am-7pm', county: 'Monongalia County', description: 'Climbing school in Morgantown WV with indoor bouldering and beginner programs near WVU.', cost: '$15-20/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'youth-programs', 'lessons', 'beginner-friendly'] },

  // DELAWARE
  { name: 'Delaware Rocks Wilmington', address: '4521 Stanton Rd', city: 'Wilmington', state: 'DE', zipCode: '19804', latitude: 39.7199, longitude: -75.6379, phone: '(302) 995-6890', website: 'https://www.delawarerocks.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'New Castle County', description: 'Delaware Rocks climbing gym in Wilmington with bouldering, top rope, and youth programs.', cost: '$18-25/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'top-rope', 'youth-programs', 'birthday-parties', 'beginner-friendly'] },

  // VERMONT
  { name: 'Burlington Bouldering Burlington', address: '404 Pine St', city: 'Burlington', state: 'VT', zipCode: '05401', latitude: 44.4741, longitude: -73.2154, phone: '(802) 540-0800', website: 'https://www.burlingtonbouldering.com', hours: 'Mon-Fri 10am-10pm, Sat-Sun 9am-8pm', county: 'Chittenden County', description: 'Indoor bouldering gym in Burlington VT with youth programs, beginner classes, and birthday parties.', cost: '$15-22/day pass', ageRange: 'All Ages', isFree: false, features: ['bouldering', 'youth-programs', 'lessons', 'beginner-friendly', 'birthday-parties'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);

  return {
    name: location.name,
    type: 'Climbing Gym',
    category: 'Indoor',
    subcategory: 'Rock Climbing',
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
      source: 'climbing-gyms-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'climbing-gym',
    },
    filters: {
      isFree: location.isFree,
      isIndoor: true,
      hasParking: true,
      hasYouthPrograms: location.features.includes('youth-programs') || location.features.includes('youth-teams'),
      hasBouldering: location.features.includes('bouldering'),
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

async function scrapeClimbingGymsDMV() {
  console.log(`\n🧗 CLIMBING GYMS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🧗 Processing Climbing Gyms...');

  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of CLIMBING_GYMS) {
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
  console.log(`✅ CLIMBING GYMS DMV SCRAPER COMPLETE`);
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

async function scrapeClimbingGymsDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeClimbingGymsDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Climbing Gyms DMV Scraper');
  scrapeClimbingGymsDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeClimbingGymsDMV,
  scrapeClimbingGymsDMVCloudFunction,
};
