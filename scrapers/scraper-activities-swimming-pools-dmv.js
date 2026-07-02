#!/usr/bin/env node

/**
 * SWIMMING POOLS DMV ACTIVITIES SCRAPER
 *
 * Adds indoor swimming pools and aquatic centers to the activities collection.
 * Focuses on venues with public swim, lessons, and family swim times.
 *
 * Coverage:
 * - Montgomery County Aquatic Centers
 * - Fairfax County RECenters
 * - Prince George's County Pools
 * - Arlington Aquatic Centers
 * - Private swim clubs with public programs
 *
 * Usage:
 *   node scraper-activities-swimming-pools-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledSwimmingPoolsDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'SwimmingPools-Eastern';

// ==========================================
// VENUE DATA - DMV Swimming Pools & Aquatic Centers
// ==========================================

const SWIMMING_POOLS = [
  // MONTGOMERY COUNTY
  {
    name: 'Germantown Indoor Swim Center',
    address: '18000 Central Park Circle',
    city: 'Boyds',
    state: 'MD',
    zipCode: '20841',
    latitude: 39.1718,
    longitude: -77.2497,
    phone: '(240) 777-6830',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/aquatics/germantown.html',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Montgomery County',
    description: 'Indoor aquatic center with lap pool, leisure pool with water features, diving well, and warm water therapy pool. Swim lessons and water fitness classes available.',
    cost: '$6-8/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'leisure-pool', 'diving', 'lessons', 'water-fitness', 'therapy-pool'],
  },
  {
    name: 'Montgomery Aquatic Center',
    address: '5900 Executive Boulevard',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0578,
    longitude: -77.1198,
    phone: '(240) 777-8070',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/aquatics/mac.html',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Montgomery County',
    description: 'Premier aquatic facility with Olympic-sized pool, diving platforms, leisure pool, and water slide. Home to competitive swim teams and public swim programs.',
    cost: '$6-8/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['olympic-pool', 'diving', 'water-slide', 'lessons', 'competitive-swimming'],
  },
  {
    name: 'Olney Indoor Swim Center',
    address: '16601 Georgia Avenue',
    city: 'Olney',
    state: 'MD',
    zipCode: '20832',
    latitude: 39.1518,
    longitude: -77.0678,
    phone: '(240) 777-4995',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/aquatics/olney.html',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Montgomery County',
    description: 'Community indoor pool with lap lanes, leisure area, and warm water pool. Offers swim lessons, water aerobics, and family swim times.',
    cost: '$6-8/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'leisure-pool', 'lessons', 'water-aerobics'],
  },
  {
    name: 'Kennedy Shriver Aquatic Center',
    address: '5900 Executive Boulevard',
    city: 'North Bethesda',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0598,
    longitude: -77.1178,
    phone: '(240) 777-8060',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/aquatics/kennedyshriver.html',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Montgomery County',
    description: 'State-of-the-art aquatic center with competition pool, diving well, leisure pool, and therapy pool. Accessible facilities for all abilities.',
    cost: '$6-8/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['competition-pool', 'diving', 'leisure-pool', 'therapy-pool', 'accessible'],
  },

  // PRINCE GEORGE'S COUNTY
  {
    name: 'Prince George\'s Sports & Learning Complex',
    address: '8001 Sheriff Road',
    city: 'Landover',
    state: 'MD',
    zipCode: '20785',
    latitude: 38.9298,
    longitude: -76.8897,
    phone: '(301) 583-2400',
    website: 'https://www.pgparks.com/facilities/facility/details/PG-Sports-Learning-Complex-36',
    hours: 'Mon-Fri 6am-10pm, Sat-Sun 8am-8pm',
    county: 'Prince George\'s County',
    description: 'Large sports complex with Olympic-sized pool, diving area, and leisure pool. Home to competitive swimming and public swim programs.',
    cost: '$5-7/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['olympic-pool', 'diving', 'leisure-pool', 'lessons', 'competitive-swimming'],
  },
  {
    name: 'Theresa Banks Aquatic Center',
    address: '7720 Glenarden Parkway',
    city: 'Glenarden',
    state: 'MD',
    zipCode: '20706',
    latitude: 38.9298,
    longitude: -76.8617,
    phone: '(301) 583-2582',
    website: 'https://www.pgparks.com/facilities/facility/details/Theresa-Banks-Aquatic-Center-35',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 9am-6pm',
    county: 'Prince George\'s County',
    description: 'Indoor aquatic center with lap pool, leisure pool, and water features. Offers swim lessons, water fitness, and family swim times.',
    cost: '$5-7/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'leisure-pool', 'lessons', 'water-fitness'],
  },

  // HOWARD COUNTY
  {
    name: 'North Laurel Community Center Pool',
    address: '9411 Whiskey Bottom Road',
    city: 'Laurel',
    state: 'MD',
    zipCode: '20723',
    latitude: 39.1278,
    longitude: -76.8478,
    phone: '(410) 313-4656',
    website: 'https://www.howardcountymd.gov/recreation-parks/pools',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Howard County',
    description: 'Community center with indoor pool offering lap swim, family swim, and lessons. Part of Howard County Recreation system.',
    cost: '$5-7/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'lessons', 'family-swim'],
  },

  // FAIRFAX COUNTY RECENFERS
  {
    name: 'Cub Run RECenter',
    address: '4630 Stonecroft Boulevard',
    city: 'Chantilly',
    state: 'VA',
    zipCode: '20151',
    latitude: 38.8678,
    longitude: -77.4318,
    phone: '(703) 817-9407',
    website: 'https://www.fairfaxcounty.gov/parks/recenter/cub-run',
    hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-8pm',
    county: 'Fairfax County',
    description: 'Full-service recreation center with lap pool, leisure pool with water slide, diving boards, and hot tub. Swim lessons and water fitness available.',
    cost: '$8-12/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'water-slide', 'diving', 'hot-tub', 'lessons'],
  },
  {
    name: 'South Run RECenter',
    address: '7550 Reservation Drive',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22153',
    latitude: 38.7418,
    longitude: -77.2178,
    phone: '(703) 866-0566',
    website: 'https://www.fairfaxcounty.gov/parks/recenter/south-run',
    hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-8pm',
    county: 'Fairfax County',
    description: 'Recreation center with indoor pool, leisure pool with water features, and fitness facilities. Popular for family swim and lessons.',
    cost: '$8-12/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'leisure-pool', 'lessons', 'fitness-center'],
  },
  {
    name: 'Spring Hill RECenter',
    address: '1239 Spring Hill Road',
    city: 'McLean',
    state: 'VA',
    zipCode: '22102',
    latitude: 38.9318,
    longitude: -77.1878,
    phone: '(703) 827-0989',
    website: 'https://www.fairfaxcounty.gov/parks/recenter/spring-hill',
    hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-8pm',
    county: 'Fairfax County',
    description: 'RECenter with indoor pool, water slide, diving boards, and therapy pool. Offers comprehensive swim lesson programs.',
    cost: '$8-12/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'water-slide', 'diving', 'therapy-pool', 'lessons'],
  },
  {
    name: 'Audrey Moore RECenter',
    address: '8100 Braddock Road',
    city: 'Annandale',
    state: 'VA',
    zipCode: '22003',
    latitude: 38.8178,
    longitude: -77.2078,
    phone: '(703) 321-7081',
    website: 'https://www.fairfaxcounty.gov/parks/recenter/audrey-moore',
    hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-8pm',
    county: 'Fairfax County',
    description: 'Large RECenter with 50-meter pool, leisure pool, diving well, and water features. Home to competitive swimming programs.',
    cost: '$8-12/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['50-meter-pool', 'leisure-pool', 'diving', 'lessons', 'competitive-swimming'],
  },

  // ARLINGTON COUNTY
  {
    name: 'Yorktown Aquatic Center',
    address: '5201 N 28th Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22207',
    latitude: 38.8998,
    longitude: -77.1178,
    phone: '(703) 536-9660',
    website: 'https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Aquatics',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Arlington County',
    description: 'Indoor aquatic center with lap pool, diving area, and leisure pool. Offers swim lessons, water aerobics, and open swim times.',
    cost: '$6-9/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'diving', 'leisure-pool', 'lessons'],
  },
  {
    name: 'Wakefield Aquatic Center',
    address: '4901 S Chesterfield Road',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22206',
    latitude: 38.8378,
    longitude: -77.0878,
    phone: '(703) 578-3061',
    website: 'https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Aquatics',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'Arlington County',
    description: 'Community aquatic facility with pool and diving area. Family-friendly with lessons and open swim programs.',
    cost: '$6-9/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'diving', 'lessons', 'family-swim'],
  },

  // LOUDOUN COUNTY
  {
    name: 'Claude Moore Recreation Center',
    address: '46105 Loudoun Park Lane',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20164',
    latitude: 39.0178,
    longitude: -77.3978,
    phone: '(571) 258-3600',
    website: 'https://www.loudoun.gov/1155/Claude-Moore-Recreation-Center',
    hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-8pm',
    county: 'Loudoun County',
    description: 'Full-service recreation center with indoor pool, water slide, lazy river, and zero-depth entry. Great for families with young children.',
    cost: '$8-12/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'water-slide', 'lazy-river', 'zero-depth', 'lessons'],
  },
  {
    name: 'Dulles South Recreation Center',
    address: '24950 Riding Center Drive',
    city: 'South Riding',
    state: 'VA',
    zipCode: '20152',
    latitude: 38.9078,
    longitude: -77.5078,
    phone: '(571) 258-3456',
    website: 'https://www.loudoun.gov/1154/Dulles-South-Recreation-Center',
    hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-8pm',
    county: 'Loudoun County',
    description: 'Modern recreation center with indoor pool, water playground, and lap lanes. Offers comprehensive swim lesson programs.',
    cost: '$8-12/visit',
    ageRange: 'All Ages',
    isFree: false,
    features: ['lap-pool', 'water-playground', 'lessons', 'fitness-center'],
  },

  // DC
  {
    name: 'Wilson Aquatic Center',
    address: '4551 Fort Drive NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20016',
    latitude: 38.9478,
    longitude: -77.0778,
    phone: '(202) 282-2216',
    website: 'https://dpr.dc.gov/page/wilson-aquatic-center',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm',
    county: 'District of Columbia',
    description: 'DC\'s premier indoor aquatic facility with 50-meter pool, diving well, and leisure area. Home to competitive swimming and public programs.',
    cost: 'Free for DC residents',
    ageRange: 'All Ages',
    isFree: true,
    features: ['50-meter-pool', 'diving', 'leisure-pool', 'lessons', 'free-dc-residents'],
  },
  {
    name: 'Takoma Aquatic Center',
    address: '300 Van Buren Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20012',
    latitude: 38.9678,
    longitude: -77.0178,
    phone: '(202) 576-8660',
    website: 'https://dpr.dc.gov/page/takoma-aquatic-center',
    hours: 'Mon-Fri 6am-9pm, Sat-Sun 9am-5pm',
    county: 'District of Columbia',
    description: 'Community aquatic center with lap pool and diving area. Free for DC residents with swim lessons and open swim.',
    cost: 'Free for DC residents',
    ageRange: 'All Ages',
    isFree: true,
    features: ['lap-pool', 'diving', 'lessons', 'free-dc-residents'],
  },

  // ==========================================
  // EASTERN US EXPANSION — SWIMMING POOLS
  // ==========================================

  // NEW YORK
  { name: 'Flushing Meadows Aquatic Center', address: ' Avery Ave and 111th St', city: 'Flushing', state: 'NY', zipCode: '11368', latitude: 40.7506, longitude: -73.8397, phone: '(718) 760-6380', website: 'https://www.nycparks.com', hours: 'Summer: Daily 11am-7pm', county: 'Queens County', description: 'NYC Parks aquatic center in Flushing Meadows with outdoor pools, family swim sessions, and swim lessons. Free for NYC residents.', cost: 'Free for NYC residents', ageRange: 'All Ages', isFree: true, features: ['outdoor-pool', 'family-swim', 'lessons', 'free', 'summer-only', 'nyc-parks'] },
  { name: 'Asphalt Green NYC', address: '555 E 90th St', city: 'New York', state: 'NY', zipCode: '10128', latitude: 40.7816, longitude: -73.9485, phone: '(212) 369-8890', website: 'https://www.asphaltgreen.org', hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-9pm', county: 'New York County', description: 'Olympic-size indoor aquatic center on the Upper East Side with lap swim, family swim, and youth swim lessons year-round.', cost: '$25-35/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'indoor', 'year-round', 'lessons', 'family-swim', 'lap-swim'] },

  // NEW JERSEY
  { name: 'Monmouth County Aquatic Center', address: '3000 Kozloski Rd', city: 'Freehold', state: 'NJ', zipCode: '07728', latitude: 40.2612, longitude: -74.3118, phone: '(732) 431-7990', website: 'https://www.monmouthcountyparks.com', hours: 'Mon-Fri 5:30am-9pm, Sat-Sun 6am-8pm', county: 'Monmouth County', description: 'Monmouth County aquatic center with Olympic lap pool, leisure pool, waterslides, and swim lessons for all ages.', cost: '$5-10/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'leisure-pool', 'waterslides', 'lessons', 'year-round', 'county-park'] },

  // PENNSYLVANIA
  { name: 'Philadelphia Citywide Pool Program', address: '1500 Pattison Ave', city: 'Philadelphia', state: 'PA', zipCode: '19145', latitude: 39.9074, longitude: -75.1726, phone: '(215) 685-0152', website: 'https://www.phila.gov/pools', hours: 'Summer: Daily 12pm-5pm and 6pm-8pm', county: 'Philadelphia County', description: 'Philadelphia Parks and Rec outdoor pools with free public swim, lessons, and youth programs. Multiple locations throughout the city.', cost: 'Free', ageRange: 'All Ages', isFree: true, features: ['outdoor-pool', 'family-swim', 'lessons', 'free', 'summer-only', 'multiple-locations'] },
  { name: 'Pittsburgh Citiparks Pools', address: '6000 Broad St', city: 'Pittsburgh', state: 'PA', zipCode: '15213', latitude: 40.4374, longitude: -79.9578, phone: '(412) 682-7275', website: 'https://www.pittsburghpa.gov/citiparks', hours: 'Summer: Daily 1pm-5pm and 6pm-8pm', county: 'Allegheny County', description: 'Pittsburgh Citiparks outdoor community pools with free public swim and swim lessons for youth. Multiple locations.', cost: 'Free', ageRange: 'All Ages', isFree: true, features: ['outdoor-pool', 'family-swim', 'lessons', 'free', 'summer-only', 'multiple-locations'] },

  // CONNECTICUT
  { name: 'Mitchell Aquatic Center Hartford', address: '150 New Britain Ave', city: 'Hartford', state: 'CT', zipCode: '06106', latitude: 41.7543, longitude: -72.6987, phone: '(860) 722-6350', website: 'https://www.hartford.gov/parks', hours: 'Year-round: Mon-Fri 6am-9pm, Sat-Sun 7am-6pm', county: 'Hartford County', description: 'Hartford city aquatic center with indoor 25-yard pool, family swim, and youth swim lessons year-round.', cost: '$4-8/session', ageRange: 'All Ages', isFree: false, features: ['indoor-pool', 'family-swim', 'lessons', 'year-round', 'community-center'] },

  // MASSACHUSETTS
  { name: 'Clarksburg State Park Pool Clarksburg', address: '1199 Middle Rd', city: 'Clarksburg', state: 'MA', zipCode: '01247', latitude: 42.7188, longitude: -73.0599, phone: '(413) 664-8345', website: 'https://www.mass.gov/dcr', hours: 'Summer: Daily 10am-6pm', county: 'Berkshire County', description: 'State park swimming area in the Berkshires with supervised beach and pond swimming. Lifeguards on duty during summer.', cost: '$5/person', ageRange: 'All Ages', isFree: false, features: ['pond-swimming', 'lifeguards', 'summer-only', 'nature', 'picnicking'] },
  { name: 'YMCA Aquatics Boston', address: '316 Huntington Ave', city: 'Boston', state: 'MA', zipCode: '02115', latitude: 42.3427, longitude: -71.0898, phone: '(617) 927-8040', website: 'https://www.ymcaboston.org', hours: 'Mon-Fri 5:30am-10pm, Sat-Sun 7am-9pm', county: 'Suffolk County', description: 'Boston YMCA with indoor pool, lap swim, family swim, and swim lessons for all ages year-round.', cost: '$5-15/session (membership)', ageRange: 'All Ages', isFree: false, features: ['indoor-pool', 'family-swim', 'lessons', 'year-round', 'ymca', 'lap-swim'] },

  // RHODE ISLAND
  { name: 'Providence Recreation Centers Pools', address: '401 Elmwood Ave', city: 'Providence', state: 'RI', zipCode: '02907', latitude: 41.8066, longitude: -71.4299, phone: '(401) 680-7260', website: 'https://www.providenceri.gov/parks', hours: 'Summer: Daily 1pm-8pm', county: 'Providence County', description: 'Providence city outdoor pools with free public swim and youth programs during summer. Multiple neighborhood locations.', cost: 'Free', ageRange: 'All Ages', isFree: true, features: ['outdoor-pool', 'family-swim', 'lessons', 'free', 'summer-only', 'neighborhood-pools'] },

  // NEW HAMPSHIRE
  { name: 'Gill Stadium Pool Manchester', address: '280 Mast Rd', city: 'Manchester', state: 'NH', zipCode: '03102', latitude: 42.9907, longitude: -71.4867, phone: '(603) 624-6444', website: 'https://www.manchesternh.gov/parks', hours: 'Summer: Daily 1pm-5pm and 6pm-8pm', county: 'Hillsborough County', description: 'Manchester city outdoor pool with free public swim and youth swim lessons during summer months.', cost: '$2-4/person', ageRange: 'All Ages', isFree: false, features: ['outdoor-pool', 'family-swim', 'lessons', 'summer-only', 'affordable'] },

  // MAINE
  { name: 'Portland Recreation Pools', address: '66 Payson Park Rd', city: 'Portland', state: 'ME', zipCode: '04103', latitude: 43.6850, longitude: -70.3153, phone: '(207) 756-8275', website: 'https://www.portlandmaine.gov/parks', hours: 'Summer: Daily 1pm-5pm', county: 'Cumberland County', description: 'Portland ME city outdoor pools with supervised family swim and youth programs during summer season.', cost: '$3-5/session', ageRange: 'All Ages', isFree: false, features: ['outdoor-pool', 'family-swim', 'lessons', 'summer-only', 'affordable'] },

  // VERMONT
  { name: 'Burlington City Pool', address: '802 North Ave', city: 'Burlington', state: 'VT', zipCode: '05408', latitude: 44.4967, longitude: -73.2411, phone: '(802) 864-0123', website: 'https://www.enjoyburlington.com', hours: 'Summer: Daily 12pm-6pm', county: 'Chittenden County', description: 'Burlington VT outdoor pool with family swim and youth lessons during summer. Lifeguards on duty.', cost: '$4-6/session', ageRange: 'All Ages', isFree: false, features: ['outdoor-pool', 'family-swim', 'lessons', 'summer-only', 'community'] },

  // DELAWARE
  { name: 'Kirkwood Pool Wilmington', address: '523 Kirkwood Hwy', city: 'Wilmington', state: 'DE', zipCode: '19808', latitude: 39.7287, longitude: -75.6155, phone: '(302) 995-7620', website: 'https://www.destateparks.com', hours: 'Summer: Daily 1pm-5pm and 6pm-8pm', county: 'New Castle County', description: 'Community pool in Wilmington DE with outdoor family swim, youth lessons, and recreational swim sessions.', cost: '$3-5/session', ageRange: 'All Ages', isFree: false, features: ['outdoor-pool', 'family-swim', 'lessons', 'summer-only', 'affordable'] },

  // WEST VIRGINIA
  { name: 'Cabell Midland Aquatic Center Huntington', address: '2300 US-60', city: 'Huntington', state: 'WV', zipCode: '25701', latitude: 38.4221, longitude: -82.3953, phone: '(304) 525-9393', website: 'https://www.cabellmidlandaquatics.com', hours: 'Year-round: Mon-Fri 5:30am-9pm, Sat-Sun 7am-6pm', county: 'Cabell County', description: 'Year-round indoor aquatic center in Huntington WV with lap pool, family swim, waterslides, and swim lessons.', cost: '$5-8/session', ageRange: 'All Ages', isFree: false, features: ['indoor-pool', 'waterslides', 'family-swim', 'lessons', 'year-round', 'lap-swim'] },

  // NORTH CAROLINA
  { name: 'Charlotte Mecklenburg Aquatic Center', address: '21 W Lakeview Ave', city: 'Charlotte', state: 'NC', zipCode: '28202', latitude: 35.2271, longitude: -80.8375, phone: '(704) 336-2884', website: 'https://www.cmsparks.com', hours: 'Year-round: Mon-Fri 5:30am-9pm, Sat-Sun 7am-6pm', county: 'Mecklenburg County', description: 'Charlotte city aquatic center with indoor Olympic pool, leisure pool, family swim, and lessons for all ages.', cost: '$4-8/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'leisure-pool', 'indoor', 'year-round', 'lessons', 'family-swim'] },
  { name: 'Raleigh Aquatic Center', address: '1680 Lake Wheeler Rd', city: 'Raleigh', state: 'NC', zipCode: '27603', latitude: 35.7615, longitude: -78.6757, phone: '(919) 831-6935', website: 'https://www.raleighnc.gov', hours: 'Year-round: Mon-Fri 5:30am-9pm, Sat-Sun 7am-6pm', county: 'Wake County', description: 'Raleigh city aquatic center with 50-meter indoor pool, family swim, diving well, and youth lessons.', cost: '$4-8/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'indoor', 'diving', 'year-round', 'lessons', 'family-swim'] },

  // SOUTH CAROLINA
  { name: 'Myrtle Beach Aquatics Center', address: '2000 Oak St', city: 'Myrtle Beach', state: 'SC', zipCode: '29577', latitude: 33.7001, longitude: -78.9023, phone: '(843) 918-1260', website: 'https://www.cityofmyrtlebeach.com', hours: 'Year-round: Mon-Fri 6am-9pm, Sat-Sun 7am-6pm', county: 'Horry County', description: 'Myrtle Beach city aquatic center with indoor pool, leisure pool, waterslides, and swim lessons for families.', cost: '$4-7/session', ageRange: 'All Ages', isFree: false, features: ['indoor-pool', 'waterslides', 'leisure-pool', 'year-round', 'lessons', 'family-swim'] },

  // GEORGIA
  { name: 'Georgia Tech Aquatic Center Atlanta', address: '177 North Ave NW', city: 'Atlanta', state: 'GA', zipCode: '30332', latitude: 33.7742, longitude: -84.3944, phone: '(404) 894-5100', website: 'https://www.gatech.edu/aquatics', hours: 'Mon-Fri 6am-9pm, Sat-Sun 8am-6pm (community hours)', county: 'Fulton County', description: 'Olympic-venue aquatic center at Georgia Tech open for community swim, lessons, and family programs.', cost: '$5-10/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'indoor', 'year-round', 'lessons', 'family-swim', 'university'] },
  { name: 'City of Savannah Pools', address: '1700 Drayton St', city: 'Savannah', state: 'GA', zipCode: '30315', latitude: 31.9790, longitude: -81.0990, phone: '(912) 351-3852', website: 'https://www.savannahga.gov', hours: 'Summer: Daily 12pm-5pm and 6pm-8pm', county: 'Chatham County', description: 'Savannah city outdoor pools with free family swim, youth lessons, and recreational programs during summer.', cost: 'Free', ageRange: 'All Ages', isFree: true, features: ['outdoor-pool', 'family-swim', 'lessons', 'free', 'summer-only', 'community'] },

  // FLORIDA
  { name: 'Sailfish Splash Waterpark Stuart', address: '931 SE Monterey Rd', city: 'Stuart', state: 'FL', zipCode: '34994', latitude: 27.1736, longitude: -80.2445, phone: '(772) 320-3150', website: 'https://www.sailfishsplash.com', hours: 'Seasonal: Daily 10am-6pm', county: 'Martin County', description: 'Family water park in Stuart FL with indoor Olympic pool, waterslides, lazy river, and kids water playground.', cost: '$12-18/person', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'waterslides', 'lazy-river', 'kids-area', 'lessons', 'year-round'] },
  { name: 'Fort Lauderdale Aquatic Complex', address: '501 Seabreeze Blvd', city: 'Fort Lauderdale', state: 'FL', zipCode: '33316', latitude: 26.1145, longitude: -80.1076, phone: '(954) 468-1580', website: 'https://www.fortlauderdale.gov', hours: 'Year-round: Mon-Fri 5:30am-9pm, Sat-Sun 7am-7pm', county: 'Broward County', description: 'Olympic aquatic center in Fort Lauderdale with 50-meter outdoor pool, family swim, and youth lessons. Former Olympic and World Championship venue.', cost: '$5-10/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'outdoor', 'year-round', 'lessons', 'family-swim', 'championship-venue'] },

  // ALABAMA
  { name: 'Huntsville Aquatics Center', address: '1025 Nolen Ave SW', city: 'Huntsville', state: 'AL', zipCode: '35801', latitude: 34.7175, longitude: -86.5921, phone: '(256) 427-5900', website: 'https://www.huntsvilleal.gov', hours: 'Year-round: Mon-Fri 5:30am-9pm, Sat-Sun 7am-6pm', county: 'Madison County', description: 'Huntsville city aquatic center with indoor 50-meter pool, family swim, waterslides, and lessons for all ages.', cost: '$4-7/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'indoor', 'waterslides', 'year-round', 'lessons', 'family-swim'] },

  // MISSISSIPPI
  { name: 'Ridgeland Natatorium', address: '1060 Old Agency Rd', city: 'Ridgeland', state: 'MS', zipCode: '39157', latitude: 32.4074, longitude: -90.1312, phone: '(601) 853-2011', website: 'https://www.ridgelandms.org', hours: 'Year-round: Mon-Fri 6am-9pm, Sat-Sun 8am-6pm', county: 'Madison County', description: 'Ridgeland city natatorium with indoor pool, family swim, and youth swim lessons near Jackson MS.', cost: '$4-6/session', ageRange: 'All Ages', isFree: false, features: ['indoor-pool', 'family-swim', 'lessons', 'year-round', 'lap-swim', 'affordable'] },

  // TENNESSEE
  { name: 'Nashville Centennial Sportsplex Aquatic', address: '222 25th Ave N', city: 'Nashville', state: 'TN', zipCode: '37203', latitude: 36.1534, longitude: -86.8254, phone: '(615) 862-8480', website: 'https://www.nashville.gov/sportsplex', hours: 'Year-round: Mon-Fri 5:30am-9pm, Sat-Sun 7am-6pm', county: 'Davidson County', description: 'Nashville Centennial Sportsplex aquatic center with indoor 50-meter pool, family swim, and lessons for all ages.', cost: '$4-7/session', ageRange: 'All Ages', isFree: false, features: ['olympic-pool', 'indoor', 'year-round', 'lessons', 'family-swim', 'lap-swim'] },

  // KENTUCKY
  { name: 'Louisville Crescent Hill Pool', address: '3109 Frankfort Ave', city: 'Louisville', state: 'KY', zipCode: '40206', latitude: 38.2580, longitude: -85.7119, phone: '(502) 456-8000', website: 'https://www.louisvilleky.gov/parks', hours: 'Summer: Daily 1pm-8pm', county: 'Jefferson County', description: 'Louisville outdoor pool with family swim, lap swim, and youth lessons during summer season. Affordable community aquatics.', cost: '$2-4/session', ageRange: 'All Ages', isFree: false, features: ['outdoor-pool', 'family-swim', 'lessons', 'summer-only', 'affordable', 'lap-swim'] },
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
    type: 'Aquatic Center',
    category: 'Indoor',
    subcategory: 'Swimming',
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
      source: 'swimming-pools-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'swimming-pool',
    },
    filters: {
      isFree: location.isFree,
      isIndoor: true,
      hasParking: true,
      hasLessons: location.features.includes('lessons'),
      hasWaterSlide: location.features.includes('water-slide'),
      hasDiving: location.features.includes('diving'),
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
async function scrapeSwimmingPoolsDMV() {
  console.log(`\n🏊 SWIMMING POOLS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🏊 Processing Swimming Pools...');

  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of SWIMMING_POOLS) {
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
  console.log(`✅ SWIMMING POOLS DMV SCRAPER COMPLETE`);
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

async function scrapeSwimmingPoolsDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeSwimmingPoolsDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Swimming Pools DMV Scraper');
  scrapeSwimmingPoolsDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeSwimmingPoolsDMV,
  scrapeSwimmingPoolsDMVCloudFunction,
};
