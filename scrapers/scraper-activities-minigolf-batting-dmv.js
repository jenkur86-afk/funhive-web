#!/usr/bin/env node

/**
 * MINI GOLF & BATTING CAGES DMV ACTIVITIES SCRAPER
 *
 * Adds mini golf courses, batting cages, and driving ranges to the
 * activities collection. Focuses on family-friendly outdoor recreation.
 *
 * Coverage:
 * - Mini golf courses
 * - Batting cages
 * - Driving ranges with family programs
 * - Combined entertainment centers
 *
 * Usage:
 *   node scraper-activities-minigolf-batting-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledMinigolfBattingDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'MinigolfBatting-Eastern';

// ==========================================
// VENUE DATA - DMV Mini Golf & Batting Cages
// ==========================================

const MINIGOLF_BATTING_VENUES = [
  // MINI GOLF COURSES
  {
    name: 'Rockville Mini Golf',
    address: '1130 Rockville Pike',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0778,
    longitude: -77.1248,
    phone: '(301) 762-4670',
    website: 'https://rockvilleminigolf.com',
    hours: 'Daily 10am-10pm (seasonal)',
    county: 'Montgomery County',
    description: 'Classic 18-hole mini golf course with waterfalls and obstacles. Family-owned and operated for over 40 years.',
    cost: '$8-12/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'waterfalls', 'family-friendly', 'outdoor'],
  },
  {
    name: 'South Germantown Miniature Golf',
    address: '18041 Central Park Circle',
    city: 'Boyds',
    state: 'MD',
    zipCode: '20841',
    latitude: 39.1678,
    longitude: -77.2978,
    phone: '(301) 601-2960',
    website: 'https://www.montgomeryparks.org/facilities/miniature-golf/',
    hours: 'Daily 10am-8pm (seasonal)',
    county: 'Montgomery County',
    description: 'Montgomery Parks mini golf at South Germantown Recreation Park. Features two 18-hole courses with splash playground nearby.',
    cost: '$6-8/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '36-holes', 'splash-park', 'parks-department', 'outdoor', 'affordable'],
  },
  {
    name: 'Wheaton Miniature Golf',
    address: '11701 Orebaugh Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0518,
    longitude: -77.0578,
    phone: '(301) 622-1193',
    website: 'https://www.montgomeryparks.org/facilities/miniature-golf/',
    hours: 'Daily 10am-8pm (seasonal)',
    county: 'Montgomery County',
    description: 'Affordable county-operated mini golf near Wheaton Regional Park. Great for families with young children.',
    cost: '$6-8/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'parks-department', 'outdoor', 'affordable'],
  },
  {
    name: 'Uptown Putt',
    address: '3419 Connecticut Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20008',
    latitude: 38.9378,
    longitude: -77.0578,
    phone: '(202) 966-7888',
    website: 'https://uptownputtdc.com',
    hours: 'Mon-Thu 4pm-10pm, Fri-Sun 11am-11pm',
    county: 'District of Columbia',
    description: 'DC-themed indoor mini golf with 18 holes representing DC neighborhoods and landmarks. Climate-controlled year-round fun.',
    cost: '$12-16/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'indoor', 'dc-themed', 'year-round'],
  },
  {
    name: 'Dulles Golf Center & Sports Park',
    address: '21593 Jesse Court',
    city: 'Dulles',
    state: 'VA',
    zipCode: '20166',
    latitude: 38.9718,
    longitude: -77.4318,
    phone: '(703) 404-8800',
    website: 'https://dullesgolfcenter.com',
    hours: 'Daily 8am-10pm',
    county: 'Loudoun County',
    description: 'Sports complex with 18-hole mini golf, driving range, batting cages, and TopTracer technology. Family fun destination.',
    cost: 'Mini golf: $10-14, Batting: $2-3/token',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['mini-golf', 'driving-range', 'batting-cages', 'top-tracer', 'outdoor'],
  },
  {
    name: 'Cameron Run Regional Park',
    address: '4001 Eisenhower Avenue',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22304',
    latitude: 38.8048,
    longitude: -77.1018,
    phone: '(703) 960-0767',
    website: 'https://www.novaparks.com/parks/cameron-run-regional-park',
    hours: 'Seasonal: 10am-8pm',
    county: 'City of Alexandria',
    description: 'Regional park with mini golf, batting cages, and Great Waves Waterpark. Perfect family outing destination.',
    cost: 'Mini golf: $7-10, Batting: $2/token',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['mini-golf', 'batting-cages', 'water-park', 'regional-park', 'outdoor'],
  },
  {
    name: 'Jefferson District Golf Course Mini Golf',
    address: '7900 Lee Highway',
    city: 'Falls Church',
    state: 'VA',
    zipCode: '22042',
    latitude: 38.8718,
    longitude: -77.2118,
    phone: '(703) 573-0443',
    website: 'https://www.fairfaxcounty.gov/parks/golf/jefferson',
    hours: 'Daily 9am-dusk (seasonal)',
    county: 'Fairfax County',
    description: 'Fairfax County golf course with 18-hole mini golf. Affordable family activity adjacent to par-3 course.',
    cost: '$7-9/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'county-park', 'outdoor', 'affordable'],
  },
  {
    name: 'Woody\'s Golf Range',
    address: '11801 Leesburg Pike',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20170',
    latitude: 38.9318,
    longitude: -77.3918,
    phone: '(703) 430-8337',
    website: 'https://woodysgolf.com',
    hours: 'Daily 8am-10pm',
    county: 'Fairfax County',
    description: 'Golf range with mini golf, batting cages, and driving range. Great for family golf and sports activities.',
    cost: 'Mini golf: $8-12, Batting: $2-3/token',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['mini-golf', 'driving-range', 'batting-cages', 'outdoor'],
  },

  // BATTING CAGES
  {
    name: 'Olney Manor Recreation Park Batting Cages',
    address: '16601 Georgia Avenue',
    city: 'Olney',
    state: 'MD',
    zipCode: '20832',
    latitude: 39.1378,
    longitude: -77.0678,
    phone: '(301) 570-1140',
    website: 'https://www.montgomeryparks.org/parks-and-trails/olney-manor-recreational-park/',
    hours: 'Daily 9am-9pm (seasonal)',
    county: 'Montgomery County',
    description: 'County park batting cages with multiple speed settings. Affordable option for baseball and softball practice.',
    cost: '$2/token',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'batting-cages',
    features: ['batting-cages', 'multiple-speeds', 'parks-department', 'outdoor', 'affordable'],
  },
  {
    name: 'Hadley\'s Park',
    address: '9801 Rosemont Drive',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    latitude: 39.1578,
    longitude: -77.1818,
    phone: '(301) 926-2030',
    website: 'https://www.gaithersburgmd.gov/recreation',
    hours: 'Mon-Fri 4pm-9pm, Sat-Sun 10am-9pm (seasonal)',
    county: 'Montgomery County',
    description: 'City-operated batting cages with baseball and softball options. Part of Hadley\'s Park recreation complex.',
    cost: '$2/token',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'batting-cages',
    features: ['batting-cages', 'baseball', 'softball', 'city-park', 'outdoor', 'affordable'],
  },
  {
    name: 'Go-Kart Track & Batting Cages',
    address: '6401 Pohick Bay Drive',
    city: 'Lorton',
    state: 'VA',
    zipCode: '22079',
    latitude: 38.6818,
    longitude: -77.1718,
    phone: '(703) 339-6104',
    website: 'https://www.novaparks.com/parks/pohick-bay-regional-park',
    hours: 'Seasonal hours vary',
    county: 'Fairfax County',
    description: 'Pohick Bay Regional Park batting cages and go-karts. Great family recreation along the Potomac.',
    cost: 'Batting: $2/token, Go-Karts: $8-10',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'sports-complex',
    features: ['batting-cages', 'go-karts', 'regional-park', 'outdoor'],
  },
  {
    name: 'Prince William Golf Course Batting Cages',
    address: '14631 Vint Hill Road',
    city: 'Nokesville',
    state: 'VA',
    zipCode: '20181',
    latitude: 38.7518,
    longitude: -77.5918,
    phone: '(703) 754-7111',
    website: 'https://www.pwcgov.org/government/dept/park/pages/prince-william-golf-course.aspx',
    hours: 'Daily 9am-9pm (seasonal)',
    county: 'Prince William County',
    description: 'County golf course with batting cages and driving range. Family-friendly with affordable rates.',
    cost: '$2-3/token',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'sports-complex',
    features: ['batting-cages', 'driving-range', 'county-park', 'outdoor', 'affordable'],
  },

  // DRIVING RANGES WITH FAMILY PROGRAMS
  {
    name: 'Falls Road Golf Course',
    address: '10800 Falls Road',
    city: 'Potomac',
    state: 'MD',
    zipCode: '20854',
    latitude: 39.0418,
    longitude: -77.1718,
    phone: '(301) 299-5156',
    website: 'https://www.montgomeryparks.org/facilities/golf-courses/falls-road-golf-course/',
    hours: 'Daily 7am-dusk',
    county: 'Montgomery County',
    description: 'County golf course with driving range and junior golf programs. Introduction to golf for kids and families.',
    cost: 'Range: $8-15/bucket, Junior lessons available',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'driving-range',
    features: ['driving-range', 'junior-golf', 'lessons', 'county-park', 'outdoor'],
  },
  {
    name: 'University of Maryland Golf Course',
    address: '3800 Golf Course Road',
    city: 'College Park',
    state: 'MD',
    zipCode: '20742',
    latitude: 38.9818,
    longitude: -76.9478,
    phone: '(301) 314-4653',
    website: 'https://www.umgolf.com',
    hours: 'Daily 7am-dusk',
    county: "Prince George's County",
    description: 'Public golf course with driving range and practice facilities. Junior golf camps and lessons available.',
    cost: 'Range: $8-14/bucket',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'driving-range',
    features: ['driving-range', 'junior-golf', 'lessons', 'camps', 'outdoor'],
  },
  {
    name: 'East Potomac Golf Links',
    address: '972 Ohio Drive SW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20024',
    latitude: 38.8718,
    longitude: -77.0278,
    phone: '(202) 554-7660',
    website: 'https://golfdc.com/east-potomac-golf-course/',
    hours: 'Daily 6am-dusk',
    county: 'District of Columbia',
    description: 'Historic DC golf course with driving range, mini golf, and foot golf. Affordable family golf in the heart of DC.',
    cost: 'Range: $10-18/bucket, Mini golf: $8-10',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['driving-range', 'mini-golf', 'foot-golf', 'historic', 'affordable', 'outdoor'],
  },
  {
    name: 'Burke Lake Golf Center',
    address: '6915 Ox Road',
    city: 'Fairfax Station',
    state: 'VA',
    zipCode: '22039',
    latitude: 38.7618,
    longitude: -77.2918,
    phone: '(703) 323-1641',
    website: 'https://www.fairfaxcounty.gov/parks/golf/burke-lake',
    hours: 'Daily 8am-10pm',
    county: 'Fairfax County',
    description: 'Golf practice facility with driving range, mini golf, and par-3 course. Junior golf programs and lessons.',
    cost: 'Range: $8-14/bucket, Mini golf: $8-10',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['driving-range', 'mini-golf', 'par-3', 'junior-golf', 'lessons', 'outdoor'],
  },

  // COMBINATION VENUES
  {
    name: 'Eisenhower Golf Course',
    address: '1576 Generals Highway',
    city: 'Crownsville',
    state: 'MD',
    zipCode: '21032',
    latitude: 39.0118,
    longitude: -76.5978,
    phone: '(410) 571-0973',
    website: 'https://www.aacounty.org/services-and-programs/golf',
    hours: 'Daily 7am-dusk',
    county: 'Anne Arundel County',
    description: 'County golf course with mini golf, driving range, and foot golf. Affordable family recreation.',
    cost: 'Range: $7-12/bucket, Mini golf: $6-8',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['driving-range', 'mini-golf', 'foot-golf', 'county-park', 'affordable', 'outdoor'],
  },
  {
    name: 'South Riding Golf Club',
    address: '43237 Golf View Drive',
    city: 'South Riding',
    state: 'VA',
    zipCode: '20152',
    latitude: 38.9218,
    longitude: -77.5118,
    phone: '(703) 327-4653',
    website: 'https://southridinggolf.com',
    hours: 'Daily 7am-dusk',
    county: 'Loudoun County',
    description: 'Golf course with driving range and junior programs. Family-friendly with golf lessons for kids.',
    cost: 'Range: $10-18/bucket',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'driving-range',
    features: ['driving-range', 'junior-golf', 'lessons', 'outdoor'],
  },

  // ==========================================
  // EASTERN US EXPANSION — MINI GOLF & BATTING
  // ==========================================

  // NEW YORK
  { name: 'Adventureland Mini Golf Farmingdale', address: '2245 Broad Hollow Rd', city: 'Farmingdale', state: 'NY', zipCode: '11735', latitude: 40.7337, longitude: -73.4143, phone: '(631) 694-6868', website: 'https://www.adventurelandusa.com', hours: 'Seasonal: Daily 11am-10pm summer', county: 'Nassau County', description: 'Mini golf at Adventureland amusement park on Long Island with 18-hole course. Plus arcade and go-karts.', cost: '$8/game', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'outdoor', 'amusement-park', 'family-fun', 'seasonal'] },
  { name: 'Randall s Island Mini Golf', address: '20 Randall s Island Park', city: 'New York', state: 'NY', zipCode: '10035', latitude: 40.7920, longitude: -73.9272, phone: '(212) 860-1819', website: 'https://www.randallsisland.org', hours: 'Seasonal: Daily 10am-8pm', county: 'New York County', description: 'Mini golf on Randall s Island in Manhattan with 18 holes and scenic views. Batting cages also available.', cost: '$8-10/game', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'outdoor', 'parks', 'nyc-parks', 'seasonal'] },

  // NEW JERSEY
  { name: 'Putting Edge Turnersville', address: '3000 NJ-168', city: 'Turnersville', state: 'NJ', zipCode: '08012', latitude: 39.7609, longitude: -75.0612, phone: '(856) 374-9100', website: 'https://www.puttingedge.com', hours: 'Mon-Thu 12pm-9pm, Fri-Sat 12pm-11pm, Sun 12pm-9pm', county: 'Gloucester County', description: 'Glow-in-the-dark indoor mini golf near Philadelphia in NJ with 18-hole cosmic course. Great year-round family activity.', cost: '$12/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'indoor', 'glow-in-dark', 'year-round', 'birthday-parties'] },

  // PENNSYLVANIA
  { name: 'Palace Entertainment Mini Golf Ligonier', address: '2574 US Route 30', city: 'Ligonier', state: 'PA', zipCode: '15658', latitude: 40.2326, longitude: -79.2368, phone: '(724) 238-3666', website: 'https://www.idlewild.com', hours: 'Seasonal May-Oct: Tue-Sun', county: 'Westmoreland County', description: 'Mini golf at Idlewild and Soakzone in western Pennsylvania. Whimsical 18-hole course in a beautiful park setting.', cost: '$6/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'outdoor', 'amusement-park', 'seasonal', 'family-friendly'] },
  { name: 'Golf Galaxy Batting Cages Philadelphia', address: '2250 E Lincoln Hwy', city: 'Langhorne', state: 'PA', zipCode: '19047', latitude: 40.1789, longitude: -74.9122, phone: '(215) 750-8883', website: 'https://www.golfgalaxy.com', hours: 'Mon-Sat 9am-9pm, Sun 10am-7pm', county: 'Bucks County', description: 'Golf Galaxy with simulator bays, mini golf practice area, and batting cage rentals near Philadelphia.', cost: '$15-30/session', ageRange: 'Ages 6+', isFree: false, venueType: 'driving-range', features: ['batting-cages', 'golf-simulator', 'mini-golf', 'lessons', 'junior-golf'] },

  // CONNECTICUT
  { name: 'Back Nine Fun Center Middlefield', address: '1005 Linden St', city: 'Middlefield', state: 'CT', zipCode: '06455', latitude: 41.5212, longitude: -72.7254, phone: '(860) 349-0066', website: 'https://www.backninefuncenter.com', hours: 'Seasonal: Daily 10am-9pm summer', county: 'Middlesex County', description: 'Back Nine Fun Center with 18-hole mini golf, batting cages, and driving range in central Connecticut.', cost: '$7-12 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'driving-range', 'outdoor', 'seasonal'] },

  // MASSACHUSETTS
  { name: 'Kimball Farm Westford', address: '400 Littleton Rd', city: 'Westford', state: 'MA', zipCode: '01886', latitude: 42.5774, longitude: -71.4606, phone: '(978) 486-3891', website: 'https://www.kimballfarm.com', hours: 'Seasonal: Daily 10am-9pm', county: 'Middlesex County', description: 'Kimball Farm in Westford MA with 2 mini golf courses, bumper boats, batting cages, go-karts, and famous ice cream.', cost: '$7-10 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'bumper-boats', 'ice-cream', 'seasonal'] },
  { name: 'Batter s Box Easton', address: '53 Hayward St', city: 'Easton', state: 'MA', zipCode: '02375', latitude: 41.9859, longitude: -71.0892, phone: '(508) 230-4900', website: 'https://www.battersboxeaston.com', hours: 'Mon-Fri 12pm-9pm, Sat-Sun 9am-9pm', county: 'Bristol County', description: 'Batting cages complex in Easton MA with baseball and softball cages, pitching machines, and lessons for youth players.', cost: '$5-8/token', ageRange: 'Ages 5+', isFree: false, venueType: 'batting-cages', features: ['batting-cages', 'pitching-machines', 'lessons', 'youth-programs', 'indoor-cages'] },

  // RHODE ISLAND
  { name: 'Miniature Village Mini Golf Charlestown', address: '1 Miniature Village Rd', city: 'Charlestown', state: 'RI', zipCode: '02813', latitude: 41.4024, longitude: -71.6520, phone: '(401) 364-9050', website: 'https://www.miniatrevillage.com', hours: 'Seasonal Jun-Sep: Daily 10am-9pm', county: 'Washington County', description: 'Charming 19-hole mini golf in Charlestown RI featuring miniature New England buildings and coastal scenery.', cost: '$6/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'outdoor', 'scenic', 'seasonal', 'new-england-theme'] },

  // NEW HAMPSHIRE
  { name: 'Family Fun Pitch and Putt Laconia', address: '1 Scenic Dr', city: 'Laconia', state: 'NH', zipCode: '03246', latitude: 43.5279, longitude: -71.4695, phone: '(603) 528-2228', website: 'https://www.familyfunnh.com', hours: 'Seasonal: Daily 10am-9pm summer', county: 'Belknap County', description: 'Mini golf, batting cages, and go-karts at Lakes Region family fun center near Lake Winnipesaukee.', cost: '$7-10 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'outdoor', 'seasonal', 'lake-region'] },

  // MAINE
  { name: 'Pirate s Cove Mini Golf Yarmouth', address: '192 Gilman Rd', city: 'Yarmouth', state: 'ME', zipCode: '04096', latitude: 43.7950, longitude: -70.1965, phone: '(207) 846-5227', website: 'https://www.piratescove.net', hours: 'Seasonal May-Sep: Daily 10am-9pm', county: 'Cumberland County', description: 'Pirate-themed mini golf adventure park in Yarmouth ME with 18 holes. Family classic near Portland Maine.', cost: '$8/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'pirate-theme', 'outdoor', 'seasonal', 'family-classic'] },

  // VERMONT
  { name: 'Spare Time Mini Golf Williston', address: '222 Granger Rd', city: 'Williston', state: 'VT', zipCode: '05495', latitude: 44.4311, longitude: -73.0652, phone: '(802) 862-0500', website: 'https://www.sparetimevt.com', hours: 'Daily 10am-10pm', county: 'Chittenden County', description: 'Indoor mini golf at Spare Time Entertainment near Burlington VT. Laser tag, bowling, and arcade also available.', cost: '$8/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'indoor', 'year-round', 'family-fun', 'entertainment-center'] },

  // DELAWARE
  { name: 'Swings N Things Frankford', address: '37310 Cedar Neck Rd', city: 'Frankford', state: 'DE', zipCode: '19945', latitude: 38.5012, longitude: -75.2393, phone: '(302) 732-3445', website: 'https://www.swingsnthings.com', hours: 'Seasonal: Daily 10am-9pm summer', county: 'Sussex County', description: 'Mini golf and batting cages at the Delaware beach area in Frankford. Go-karts and bumper boats also available.', cost: '$7-10 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'bumper-boats', 'outdoor', 'seasonal'] },

  // WEST VIRGINIA
  { name: 'Fun Zone Family Entertainment Parkersburg', address: '2001 Seventh St', city: 'Parkersburg', state: 'WV', zipCode: '26101', latitude: 39.2650, longitude: -81.5537, phone: '(304) 485-0000', website: 'https://www.funzonewv.com', hours: 'Daily 11am-9pm', county: 'Wood County', description: 'Family entertainment center in Parkersburg WV with mini golf, batting cages, go-karts, and arcade.', cost: '$5-12 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'arcade', 'birthday-parties'] },

  // NORTH CAROLINA
  { name: 'Frankie s Fun Park Mini Golf Raleigh', address: '1215 Pine Plaza Dr', city: 'Raleigh', state: 'NC', zipCode: '27615', latitude: 35.9013, longitude: -78.6578, phone: '(919) 846-4150', website: 'https://www.frankiesfunpark.com', hours: 'Mon-Thu 12pm-9pm, Fri-Sat 10am-11pm, Sun 12pm-9pm', county: 'Wake County', description: 'Frankie s Fun Park in Raleigh with 36-hole mini golf, batting cages, go-karts, laser tag, and arcade.', cost: '$5-20 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'laser-tag', 'arcade', 'birthday-parties'] },
  { name: 'Speed Street Mini Golf Charlotte', address: '8907 J M Keynes Dr', city: 'Charlotte', state: 'NC', zipCode: '28262', latitude: 35.3192, longitude: -80.7614, phone: '(704) 548-3555', website: 'https://www.speedstreetfun.com', hours: 'Mon-Thu 11am-9pm, Fri-Sat 11am-11pm, Sun 12pm-9pm', county: 'Mecklenburg County', description: 'Mini golf, go-karts, batting cages, and laser tag in Charlotte NC. Family entertainment complex.', cost: '$5-15 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'laser-tag', 'birthday-parties'] },

  // SOUTH CAROLINA
  { name: 'Myrtle Beach Mini Golf Championship Course', address: '1800 21st Ave N', city: 'Myrtle Beach', state: 'SC', zipCode: '29577', latitude: 33.7054, longitude: -78.8791, phone: '(843) 626-1777', website: 'https://www.myrtlebeachminigolf.com', hours: 'Daily 9am-10pm (seasonal hours)', county: 'Horry County', description: 'Championship mini golf in Myrtle Beach with elaborately themed 18-hole courses. Multiple locations available.', cost: '$12-15/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'outdoor', 'themed', 'beach-location', 'family-fun'] },

  // GEORGIA
  { name: 'Stars and Strikes Mini Golf Kennesaw', address: '2700 Town Center Dr', city: 'Kennesaw', state: 'GA', zipCode: '30144', latitude: 34.0343, longitude: -84.6139, phone: '(770) 422-7005', website: 'https://www.starsandstrikes.com', hours: 'Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 12pm-9pm', county: 'Cobb County', description: 'Stars and Strikes Kennesaw with indoor mini golf, bowling, batting cages, laser tag, and arcade.', cost: '$5-15 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'bowling', 'laser-tag', 'birthday-parties'] },
  { name: 'Mountasia Fun Center Marietta', address: '2200 Delk Rd SE', city: 'Marietta', state: 'GA', zipCode: '30067', latitude: 33.9162, longitude: -84.5187, phone: '(770) 955-3776', website: 'https://www.mountasiamarietta.com', hours: 'Mon-Thu 12pm-9pm, Fri-Sat 11am-11pm, Sun 12pm-9pm', county: 'Cobb County', description: 'Mountasia Fun Center in Marietta GA with 54 holes of mini golf, go-karts, batting cages, laser tag, and arcade.', cost: '$6-15 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'laser-tag', 'birthday-parties'] },

  // FLORIDA
  { name: 'Congo River Mini Golf Orlando', address: '6812 International Dr', city: 'Orlando', state: 'FL', zipCode: '32819', latitude: 28.4618, longitude: -81.4639, phone: '(407) 352-0042', website: 'https://www.congoriver.com', hours: 'Daily 10am-11pm', county: 'Orange County', description: 'Congo River mini golf on International Drive Orlando with two 18-hole jungle courses, real alligators, and gem mining.', cost: '$11-14/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'alligators', 'gem-mining', 'themed', 'outdoor', 'family-fun'] },
  { name: 'Batter Up Batting Cages Fort Lauderdale', address: '7250 N University Dr', city: 'Tamarac', state: 'FL', zipCode: '33321', latitude: 26.2122, longitude: -80.2554, phone: '(954) 726-0600', website: 'https://www.batterupfl.com', hours: 'Mon-Fri 12pm-9pm, Sat-Sun 9am-9pm', county: 'Broward County', description: 'Batting cages in South Florida with baseball and softball pitching machines, lessons, and youth clinics.', cost: '$3-5/token', ageRange: 'Ages 5+', isFree: false, venueType: 'batting-cages', features: ['batting-cages', 'pitching-machines', 'lessons', 'youth-programs', 'indoor-cages'] },

  // ALABAMA
  { name: 'Back Forty Fun Park Huntsville', address: '8180 US-72 W', city: 'Madison', state: 'AL', zipCode: '35758', latitude: 34.7085, longitude: -86.7495, phone: '(256) 837-8080', website: 'https://www.back40funpark.com', hours: 'Mon-Thu 12pm-9pm, Fri-Sat 10am-11pm, Sun 12pm-9pm', county: 'Madison County', description: 'Family fun park in Huntsville area with mini golf, go-karts, batting cages, laser tag, and arcade games.', cost: '$5-15 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'laser-tag', 'birthday-parties'] },

  // MISSISSIPPI
  { name: 'Springridge Mini Golf Clinton', address: '100 Springridge Rd', city: 'Clinton', state: 'MS', zipCode: '39056', latitude: 32.3441, longitude: -90.3274, phone: '(601) 924-0000', website: 'https://www.springridgegolf.com', hours: 'Mon-Sat 10am-9pm, Sun 12pm-7pm', county: 'Hinds County', description: 'Mini golf and driving range in Clinton MS near Jackson. Batting cages and junior golf lessons available.', cost: '$7-10 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'driving-range', 'junior-golf', 'lessons'] },

  // TENNESSEE
  { name: 'Nashville Shores Mini Golf', address: '4001 Bell Rd', city: 'Hermitage', state: 'TN', zipCode: '37076', latitude: 36.1710, longitude: -86.6072, phone: '(615) 889-7050', website: 'https://www.nashvilleshores.com', hours: 'Seasonal: Daily 10am-8pm', county: 'Davidson County', description: 'Mini golf at Nashville Shores Lakeside Resort with 18-hole course plus waterpark and lakeside activities.', cost: '$8/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'outdoor', 'waterpark', 'lakeside', 'seasonal', 'birthday-parties'] },
  { name: 'Putt Putt Golf Memphis', address: '5484 Summer Ave', city: 'Memphis', state: 'TN', zipCode: '38134', latitude: 35.1677, longitude: -89.8717, phone: '(901) 386-2992', website: 'https://www.puttputt.com', hours: 'Daily 10am-10pm', county: 'Shelby County', description: 'Putt-Putt Golf and Games in Memphis with 18-hole mini golf, go-karts, batting cages, and arcade.', cost: '$5-12 per activity', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'batting-cages', 'go-karts', 'arcade', 'birthday-parties'] },

  // KENTUCKY
  { name: 'Glowgolf Louisville', address: '2350 Cane Run Rd', city: 'Louisville', state: 'KY', zipCode: '40211', latitude: 38.2290, longitude: -85.8056, phone: '(502) 588-0000', website: 'https://www.glowgolf.com', hours: 'Mon-Thu 11am-8pm, Fri-Sat 11am-10pm, Sun 11am-7pm', county: 'Jefferson County', description: 'Glow-in-the-dark indoor mini golf in Louisville KY. 18-hole cosmic course with neon lights and fun for all ages.', cost: '$10/round', ageRange: 'All Ages', isFree: false, venueType: 'mini-golf', features: ['mini-golf', 'indoor', 'glow-in-dark', 'year-round', 'birthday-parties'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'mini-golf': { category: 'Outdoor', subcategory: 'Mini Golf' },
    'batting-cages': { category: 'Outdoor', subcategory: 'Batting Cages' },
    'driving-range': { category: 'Outdoor', subcategory: 'Driving Range' },
    'sports-complex': { category: 'Outdoor', subcategory: 'Sports Complex' },
  };
  return categories[venueType] || { category: 'Outdoor', subcategory: 'Recreation' };
}

function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);
  const { category, subcategory } = getCategory(location.venueType);

  // Check if indoor (like Uptown Putt)
  const isIndoor = location.features.includes('indoor');

  return {
    name: location.name,
    type: subcategory,
    category: isIndoor ? 'Indoor' : category,
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
      source: 'minigolf-batting-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: isIndoor,
      hasParking: true,
      hasMiniGolf: location.features.includes('mini-golf'),
      hasBattingCages: location.features.includes('batting-cages'),
      hasDrivingRange: location.features.includes('driving-range'),
      isParksDepartment: location.features.includes('parks-department') || location.features.includes('county-park') || location.features.includes('city-park'),
      isAffordable: location.features.includes('affordable'),
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

async function scrapeMinigolfBattingDMV() {
  console.log(`\n⛳ MINI GOLF & BATTING CAGES DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n⛳ Processing Mini Golf & Batting Cage Venues...');

  // Group by state
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of MINIGOLF_BATTING_VENUES) {
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
  console.log(`✅ MINI GOLF & BATTING CAGES DMV SCRAPER COMPLETE`);
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

async function scrapeMinigolfBattingDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeMinigolfBattingDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Mini Golf & Batting Cages DMV Scraper');
  scrapeMinigolfBattingDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeMinigolfBattingDMV,
  scrapeMinigolfBattingDMVCloudFunction,
};
