#!/usr/bin/env node

/**
 * CHILDREN'S MUSEUMS DMV ACTIVITIES SCRAPER
 *
 * Adds children's museums and discovery centers to the activities collection.
 * These are curated family venues with interactive exhibits.
 *
 * Coverage:
 * - Port Discovery Children's Museum (Baltimore)
 * - National Children's Museum (DC)
 * - Maryland Science Center (Baltimore)
 * - Maryland Zoo (Baltimore)
 * - National Zoo (DC)
 * - National Aquarium (Baltimore)
 * - Imagine That! (Reston, VA)
 * - Chesapeake Children's Museum (Annapolis)
 * - Kidwell Farm at Frying Pan Park (Herndon, VA)
 *
 * Usage:
 *   node scraper-activities-childrens-museums-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledChildrensMuseumsDMV
 * Schedule: Weekly (activities don't change often)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'ChildrensMuseums-Eastern';

// ==========================================
// VENUE DATA - DMV Children's Museums & Discovery Centers
// ==========================================

const CHILDRENS_MUSEUMS = [
  {
    name: 'Port Discovery Children\'s Museum',
    address: '35 Market Place',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21202',
    latitude: 39.2890,
    longitude: -76.6069,
    phone: '(410) 727-8120',
    website: 'https://www.portdiscovery.org',
    hours: 'Fri-Mon 10am-5pm (Thu members only)',
    county: 'Baltimore City',
    description: 'Interactive children\'s museum featuring three floors of hands-on exhibits including the award-winning KidWorks, Tot Trails for babies, and rotating exhibitions. Perfect for ages 0-10.',
    cost: '$18.95/person',
    ageRange: 'Ages 0-10',
    isFree: false,
    type: 'museum',
  },
  {
    name: 'National Children\'s Museum',
    address: '1300 Pennsylvania Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20004',
    latitude: 38.8942,
    longitude: -77.0281,
    phone: '(202) 844-2486',
    website: 'https://nationalchildrensmuseum.org',
    hours: 'Thu-Mon 9:30am-4:30pm',
    county: 'District of Columbia',
    description: 'Interactive museum focused on STEAM learning with hands-on exhibits. Features Dream Machine, climbing structures, and rotating special exhibits. Located inside the Ronald Reagan Building.',
    cost: '$16.95/person',
    ageRange: 'Ages 0-12',
    isFree: false,
    type: 'museum',
  },
  {
    name: 'Maryland Science Center',
    address: '601 Light Street',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21230',
    latitude: 39.2818,
    longitude: -76.6134,
    phone: '(410) 685-5225',
    website: 'https://www.mdsci.org',
    hours: 'Fri-Sun 10am-5pm',
    county: 'Baltimore City',
    description: 'Science center featuring hands-on exhibits, planetarium, and IMAX theater. Includes Kids Room for ages 0-5 with water play, magnetic wall, and discovery stations.',
    cost: '$25-30/person',
    ageRange: 'All Ages',
    isFree: false,
    type: 'science-center',
  },
  {
    name: 'Chesapeake Children\'s Museum',
    address: '25 Silopanna Road',
    city: 'Annapolis',
    state: 'MD',
    zipCode: '21403',
    latitude: 38.9701,
    longitude: -76.4753,
    phone: '(410) 990-1993',
    website: 'https://www.theccm.org',
    hours: 'Thu-Sun 10am-3pm',
    county: 'Anne Arundel County',
    description: 'Community children\'s museum with focus on Chesapeake Bay ecology and regional heritage. Features outdoor nature trails, boat-building area, and seasonal programs.',
    cost: '$7/person',
    ageRange: 'Ages 1-10',
    isFree: false,
    type: 'museum',
  },
  {
    name: 'Imagine That! Discovery Museum',
    address: '1961 Chain Bridge Road',
    city: 'Reston',
    state: 'VA',
    zipCode: '20190',
    latitude: 38.9501,
    longitude: -77.3491,
    phone: '(703) 476-8200',
    website: 'https://imaginethatreston.com',
    hours: 'Tue-Sun 9am-5pm',
    county: 'Fairfax County',
    description: 'Discovery museum with hands-on exhibits for young children including pretend play, building zones, and sensory activities. Great for toddlers and preschoolers.',
    cost: '$14/person',
    ageRange: 'Ages 1-8',
    isFree: false,
    type: 'museum',
  },

  // ==========================================
  // EASTERN US EXPANSION — CHILDREN'S MUSEUMS
  // ==========================================

  // NEW YORK
  { name: 'Children s Museum of Manhattan', address: '212 W 83rd St', city: 'New York', state: 'NY', zipCode: '10024', latitude: 40.7857, longitude: -73.9791, phone: '(212) 721-1223', website: 'https://www.cmom.org', hours: 'Mon-Sun 10am-5pm', county: 'New York County', description: 'Children s Museum of Manhattan with five floors of hands-on exhibits, media lab, and cooking studio for ages 0-10.', cost: '$16/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },
  { name: 'Staten Island Children s Museum', address: '1000 Richmond Terrace', city: 'Staten Island', state: 'NY', zipCode: '10301', latitude: 40.6442, longitude: -74.1046, phone: '(718) 273-2060', website: 'https://www.sichildrensmuseum.org', hours: 'Tue-Sun 10am-5pm', county: 'Richmond County', description: 'Interactive children s museum on Staten Island with creative play zones, performance stages, and hands-on STEAM exhibits.', cost: '$12/person', ageRange: 'Ages 1-10', isFree: false, type: 'museum' },

  // NEW JERSEY
  { name: 'New Jersey Children s Museum Paramus', address: '599 Industrial Ave', city: 'Paramus', state: 'NJ', zipCode: '07652', latitude: 40.9491, longitude: -74.0715, phone: '(201) 262-5151', website: 'https://www.njcm.com', hours: 'Tue-Sun 10am-5pm', county: 'Bergen County', description: 'NJ Children s Museum with 30 themed play rooms including helicopter, fire station, TV studio, and castle. Imaginative play for all young children.', cost: '$14/person', ageRange: 'Ages 1-9', isFree: false, type: 'museum' },

  // PENNSYLVANIA
  { name: 'Please Touch Museum Philadelphia', address: '4231 Avenue of the Republic', city: 'Philadelphia', state: 'PA', zipCode: '19131', latitude: 39.9747, longitude: -75.2029, phone: '(215) 581-3181', website: 'https://www.pleasetouchmuseum.org', hours: 'Mon-Sat 9am-5pm, Sun 11am-5pm', county: 'Philadelphia County', description: 'Please Touch Museum in Philadelphia with 38,000 sq ft of interactive exhibits, river adventures, Alice in Wonderland, and birthday party spaces.', cost: '$20/person', ageRange: 'Ages 0-7', isFree: false, type: 'museum' },
  { name: 'Pittsburgh Children s Museum', address: '10 Children s Way', city: 'Pittsburgh', state: 'PA', zipCode: '15212', latitude: 40.4533, longitude: -80.0061, phone: '(412) 322-5058', website: 'https://www.pittsburghkids.org', hours: 'Mon-Sat 10am-5pm, Sun 12pm-5pm', county: 'Allegheny County', description: 'Pittsburgh Children s Museum with three floors of hands-on exhibits, Mister Rogers Neighborhood exhibit, art studio, and STEM activities.', cost: '$16/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },

  // CONNECTICUT
  { name: 'Children s Museum of Greater Hartford', address: '950 Trout Brook Dr', city: 'West Hartford', state: 'CT', zipCode: '06119', latitude: 41.7698, longitude: -72.7558, phone: '(860) 231-2824', website: 'https://www.thechildrensmuseumct.org', hours: 'Tue-Sun 10am-5pm', county: 'Hartford County', description: 'Children s Museum of West Hartford with planetarium, nature center with live animals, and interactive exhibits for families.', cost: '$15/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },

  // MASSACHUSETTS
  { name: 'Boston Children s Museum', address: '308 Congress St', city: 'Boston', state: 'MA', zipCode: '02210', latitude: 42.3526, longitude: -71.0476, phone: '(617) 426-6500', website: 'https://www.bostonchildrensmuseum.org', hours: 'Sat-Thu 10am-5pm, Fri 10am-9pm', county: 'Suffolk County', description: 'Boston Children s Museum with 3 floors of interactive exhibits including Art Studio, Boston Black, Japanese House, and Tot Spot for infants.', cost: '$18/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },

  // RHODE ISLAND
  { name: 'Providence Children s Museum', address: '100 South St', city: 'Providence', state: 'RI', zipCode: '02903', latitude: 41.8158, longitude: -71.4134, phone: '(401) 273-5437', website: 'https://www.childrenmuseum.org', hours: 'Tue-Sun 9am-6pm', county: 'Providence County', description: 'Providence Children s Museum with hands-on exhibits on science, art, and world cultures. Water play, art studio, and climbing structures.', cost: '$14/person', ageRange: 'Ages 1-11', isFree: false, type: 'museum' },

  // NORTH CAROLINA
  { name: 'Marbles Kids Museum Raleigh', address: '201 E Hargett St', city: 'Raleigh', state: 'NC', zipCode: '27601', latitude: 35.7797, longitude: -78.6376, phone: '(919) 834-4040', website: 'https://www.marbleskidsmuseum.org', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Wake County', description: 'Marbles Kids Museum with interactive play exhibits, IMAX theater, and creative learning programs for children.', cost: '$12/person', ageRange: 'Ages 1-10', isFree: false, type: 'museum' },
  { name: 'Discovery Place Kids Huntersville', address: '105 Gilead Rd', city: 'Huntersville', state: 'NC', zipCode: '28078', latitude: 35.4098, longitude: -80.8467, phone: '(704) 372-6261', website: 'https://www.discoveryplace.org', hours: 'Tue-Sat 10am-5pm, Sun 12pm-5pm', county: 'Mecklenburg County', description: 'Discovery Place Kids in Huntersville near Charlotte with 3 floors of interactive exhibits for young children.', cost: '$15/person', ageRange: 'Ages 0-8', isFree: false, type: 'museum' },

  // SOUTH CAROLINA
  { name: 'EdVenture Children s Museum Columbia', address: '211 Gervais St', city: 'Columbia', state: 'SC', zipCode: '29201', latitude: 33.9997, longitude: -81.0351, phone: '(803) 779-3100', website: 'https://www.edventure.org', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Richland County', description: 'EdVenture children s museum with Eddie the Giant, construction zone, and 90+ interactive exhibits for young learners.', cost: '$14.95/person', ageRange: 'Ages 0-12', isFree: false, type: 'museum' },

  // GEORGIA
  { name: 'Children s Museum of Atlanta', address: '275 Centennial Olympic Park Dr NW', city: 'Atlanta', state: 'GA', zipCode: '30313', latitude: 33.7603, longitude: -84.3942, phone: '(404) 659-5437', website: 'https://www.childrensmuseumatlanta.org', hours: 'Tue-Sun 10am-4pm', county: 'Fulton County', description: 'Children s Museum of Atlanta near the aquarium with interactive exhibits on science, art, and storytelling for children ages 0-8.', cost: '$19.75/person', ageRange: 'Ages 0-8', isFree: false, type: 'museum' },

  // FLORIDA
  { name: 'Museum of Science and Industry Kids Zone Tampa', address: '4801 E Fowler Ave', city: 'Tampa', state: 'FL', zipCode: '33617', latitude: 28.0618, longitude: -82.4072, phone: '(813) 987-6000', website: 'https://www.mosi.org', hours: 'Tue-Sun 10am-5pm', county: 'Hillsborough County', description: 'MOSI Tampa Kids in Charge exhibit with hands-on science for young children. Plus IMAX and full museum access.', cost: '$25/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },
  { name: 'Orlando Science Center KidsTown', address: '777 E Princeton St', city: 'Orlando', state: 'FL', zipCode: '32803', latitude: 28.5699, longitude: -81.3700, phone: '(407) 514-2000', website: 'https://www.osc.org', hours: 'Tue-Sun 10am-5pm', county: 'Orange County', description: 'Orlando Science Center KidsTown for ages 0-7 with Nature Works outdoor play and interactive exhibits for young learners.', cost: '$20/person', ageRange: 'Ages 0-7', isFree: false, type: 'museum' },

  // ALABAMA
  { name: 'Children s Museum of Huntsville Imagination Place', address: '1302 SE Court St', city: 'Huntsville', state: 'AL', zipCode: '35801', latitude: 34.7285, longitude: -86.5859, phone: '(256) 536-3188', website: 'https://www.imaginationplace.com', hours: 'Tue-Sat 9am-5pm, Sun 1pm-5pm', county: 'Madison County', description: 'Imagination Place children s museum in Huntsville AL with interactive exhibits, Space Zone, and creative play spaces.', cost: '$12/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },

  // MISSISSIPPI
  { name: 'Mississippi Children s Museum Jackson', address: '2145 Museum Blvd', city: 'Jackson', state: 'MS', zipCode: '39202', latitude: 32.3119, longitude: -90.1748, phone: '(601) 981-5469', website: 'https://www.mschildrensmuseum.org', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Hinds County', description: 'Mississippi Children s Museum with interactive exhibits on literacy, art, health, and science for children ages 0-12.', cost: '$12/person', ageRange: 'Ages 0-12', isFree: false, type: 'museum' },

  // TENNESSEE
  { name: 'Children s Museum of Memphis', address: '2525 Central Ave', city: 'Memphis', state: 'TN', zipCode: '38104', latitude: 35.1374, longitude: -90.0219, phone: '(901) 458-2678', website: 'https://www.cmom.com', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Shelby County', description: 'Children s Museum of Memphis with 26 interactive exhibits including world cultures, science, and dramatic play spaces.', cost: '$14/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },
  { name: 'Nashville Zoo Children s Activity Zone', address: '3777 Nolensville Pike', city: 'Nashville', state: 'TN', zipCode: '37211', latitude: 36.1079, longitude: -86.7540, phone: '(615) 833-1534', website: 'https://www.nashvillezoo.org', hours: 'Daily 9am-4pm', county: 'Davidson County', description: 'Nashville Zoo with Jungle Gym playground, Critter Encounters, and WildTown children s area. Family-focused zoo with 3,000+ animals.', cost: '$20 adults, $15 children', ageRange: 'All Ages', isFree: false, type: 'museum' },

  // KENTUCKY
  { name: 'Louisville Mega Cavern', address: '1841 Taylor Ave', city: 'Louisville', state: 'KY', zipCode: '40213', latitude: 38.2012, longitude: -85.7289, phone: '(502) 993-3100', website: 'https://www.louisvillemegacavern.com', hours: 'Daily 9am-6pm', county: 'Jefferson County', description: 'Underground mega cavern in Louisville with bike trails, ziplines, and Christmas lights attraction. Unique family underground adventure.', cost: '$18-35/person', ageRange: 'All Ages', isFree: false, type: 'attraction' },

  // WEST VIRGINIA
  { name: 'Tamarack Children s Program Beckley', address: '1 Tamarack Park Rd', city: 'Beckley', state: 'WV', zipCode: '25801', latitude: 37.7782, longitude: -81.1873, phone: '(304) 256-6843', website: 'https://www.tamarackwv.com', hours: 'Daily 9am-6pm', county: 'Raleigh County', description: 'Tamarack arts center with youth art programs, hands-on crafts, and family educational events in WV.', cost: 'Varies by program', ageRange: 'Ages 0-12', isFree: false, type: 'museum' },

  // DELAWARE
  { name: 'Delaware Children s Museum Wilmington', address: '550 Justison St', city: 'Wilmington', state: 'DE', zipCode: '19801', latitude: 39.7456, longitude: -75.5508, phone: '(302) 654-2340', website: 'https://www.delawarechildrensmuseum.org', hours: 'Tue-Sat 10am-4pm, Sun 11am-4pm', county: 'New Castle County', description: 'Delaware Children s Museum in Wilmington with interactive exhibits on science, music, engineering, and water play.', cost: '$10/person', ageRange: 'Ages 1-10', isFree: false, type: 'museum' },

  // NEW HAMPSHIRE
  { name: 'Children s Museum of New Hampshire Dover', address: '6 Washington St', city: 'Dover', state: 'NH', zipCode: '03820', latitude: 43.1979, longitude: -70.8737, phone: '(603) 742-2002', website: 'https://www.childrens-museum.org', hours: 'Tue-Sat 10am-5pm, Sun 12pm-5pm', county: 'Strafford County', description: 'Children s Museum of NH in Dover with submarines, science lab, art studio, and outdoor garden for young explorers.', cost: '$12/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum' },

  // MAINE
  { name: 'Maine Children s Museum Portland', address: '142 Free St', city: 'Portland', state: 'ME', zipCode: '04101', latitude: 43.6558, longitude: -70.2603, phone: '(207) 828-1234', website: 'https://www.kitetails.org', hours: 'Mon-Sat 10am-5pm, Sun 12pm-5pm', county: 'Cumberland County', description: 'Maine Children s Museum in Portland with interactive exhibits on local lobstering, dairy farms, and community helpers.', cost: '$12/person', ageRange: 'Ages 0-8', isFree: false, type: 'museum' },

  // VERMONT
  { name: 'ECHO Leahy Center Children s Exhibits', address: '1 College St', city: 'Burlington', state: 'VT', zipCode: '05401', latitude: 44.4773, longitude: -73.2212, phone: '(802) 864-1848', website: 'https://www.echovermont.org', hours: 'Daily 10am-5pm', county: 'Chittenden County', description: 'ECHO Science Center on Lake Champlain with children s exhibits on Lake ecology, biodiversity, and hands-on science exploration.', cost: '$15 adults, $12 children', ageRange: 'Ages 0-12', isFree: false, type: 'museum' },
];

const ZOOS_AND_AQUARIUMS = [
  {
    name: 'Smithsonian\'s National Zoo',
    address: '3001 Connecticut Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20008',
    latitude: 38.9296,
    longitude: -77.0497,
    phone: '(202) 633-4888',
    website: 'https://nationalzoo.si.edu',
    hours: 'Daily 8am-6pm (summer), 8am-5pm (winter)',
    county: 'District of Columbia',
    description: 'Free admission zoo with 2,700+ animals including giant pandas. Features Kids\' Farm, playground, and conservation programs. Part of the Smithsonian Institution.',
    cost: 'Free',
    ageRange: 'All Ages',
    isFree: true,
    type: 'zoo',
  },
  {
    name: 'Maryland Zoo in Baltimore',
    address: '1 Safari Place',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21217',
    latitude: 39.3227,
    longitude: -76.6496,
    phone: '(410) 396-7102',
    website: 'https://www.marylandzoo.org',
    hours: 'Daily 10am-4pm',
    county: 'Baltimore City',
    description: 'Historic zoo with 1,500+ animals including African penguins, giraffes, and lions. Features goat yard petting zoo, train ride, and children\'s zoo area.',
    cost: '$24.95/adult, $19.95/child',
    ageRange: 'All Ages',
    isFree: false,
    type: 'zoo',
  },
  {
    name: 'National Aquarium',
    address: '501 East Pratt Street',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21202',
    latitude: 39.2858,
    longitude: -76.6081,
    phone: '(410) 576-3800',
    website: 'https://www.aqua.org',
    hours: 'Daily 9am-5pm (varies by season)',
    county: 'Baltimore City',
    description: 'World-class aquarium featuring dolphins, sharks, jellyfish, and coral reef exhibits. Interactive touch tanks and 4D immersive experiences available.',
    cost: '$39.95/adult, $29.95/child',
    ageRange: 'All Ages',
    isFree: false,
    type: 'aquarium',
  },
  {
    name: 'Leesburg Animal Park',
    address: '19270 James Monroe Highway',
    city: 'Leesburg',
    state: 'VA',
    zipCode: '20175',
    latitude: 39.0987,
    longitude: -77.5632,
    phone: '(703) 433-0002',
    website: 'https://leesburganimalpark.com',
    hours: 'Daily 10am-5pm',
    county: 'Loudoun County',
    description: 'Family-friendly petting zoo with exotic and farm animals. Features wagon rides, playgrounds, and animal encounters. Great for young children.',
    cost: '$14.95/person',
    ageRange: 'All Ages',
    isFree: false,
    type: 'petting-zoo',
  },
];

const FARMS_AND_NATURE = [
  {
    name: 'Kidwell Farm at Frying Pan Park',
    address: '2709 West Ox Road',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20171',
    latitude: 38.9293,
    longitude: -77.3568,
    phone: '(703) 437-9101',
    website: 'https://www.fairfaxcounty.gov/parks/fryingpanpark',
    hours: 'Daily 9am-5pm',
    county: 'Fairfax County',
    description: 'Working farm with heritage breed animals, blacksmith shop, and country store. Free admission, educational programs available. Features seasonal events and farm activities.',
    cost: 'Free',
    ageRange: 'All Ages',
    isFree: true,
    type: 'farm',
  },
  {
    name: 'Clark\'s Elioak Farm',
    address: '10500 Clarksville Pike',
    city: 'Ellicott City',
    state: 'MD',
    zipCode: '21042',
    latitude: 39.2407,
    longitude: -76.8612,
    phone: '(410) 730-4049',
    website: 'https://www.clarklandfarm.com',
    hours: 'Thu-Sun 10am-5pm (seasonal)',
    county: 'Howard County',
    description: 'Enchanted farm featuring rescued fairytale displays from the old Enchanted Forest amusement park. Includes petting zoo, pony rides, and seasonal activities.',
    cost: '$10-15/person',
    ageRange: 'Ages 2-10',
    isFree: false,
    type: 'farm',
  },
  {
    name: 'Oxon Cove Park Farm',
    address: '6411 Oxon Hill Road',
    city: 'Oxon Hill',
    state: 'MD',
    zipCode: '20745',
    latitude: 38.8007,
    longitude: -76.9889,
    phone: '(301) 839-1176',
    website: 'https://www.nps.gov/oxhi',
    hours: 'Daily 8am-4:30pm',
    county: 'Prince George\'s County',
    description: 'National Park Service farm with farm animals, hiking trails, and programs. Free admission, perfect for family outings. Features milking demonstrations and seasonal activities.',
    cost: 'Free',
    ageRange: 'All Ages',
    isFree: true,
    type: 'farm',
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Convert location data to activity document format
 */
function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);

  // Determine category and subcategory
  let category, subcategory;
  switch (location.type) {
    case 'museum':
      category = 'Learning & Culture';
      subcategory = 'Children\'s Museum';
      break;
    case 'science-center':
      category = 'Learning & Culture';
      subcategory = 'Science Center';
      break;
    case 'zoo':
      category = 'Outdoor';
      subcategory = 'Zoo';
      break;
    case 'aquarium':
      category = 'Learning & Culture';
      subcategory = 'Aquarium';
      break;
    case 'petting-zoo':
      category = 'Outdoor';
      subcategory = 'Petting Zoo';
      break;
    case 'farm':
      category = 'Outdoor';
      subcategory = 'Farm';
      break;
    default:
      category = 'Learning & Culture';
      subcategory = 'Museum';
  }

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
    metadata: {
      source: 'childrens-museums-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.type,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: location.type === 'museum' || location.type === 'science-center' || location.type === 'aquarium',
      hasParking: true,
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
async function scrapeChildrensMuseumsDMV() {
  console.log(`\n🏛️ CHILDREN'S MUSEUMS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Children's Museums
  console.log('\n🖼️ Processing Children\'s Museums...');
  for (const location of CHILDRENS_MUSEUMS) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  // Process Zoos and Aquariums
  console.log('\n🦁 Processing Zoos & Aquariums...');
  for (const location of ZOOS_AND_AQUARIUMS) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  // Process Farms and Nature Centers
  console.log('\n🐔 Processing Farms & Nature Centers...');
  for (const location of FARMS_AND_NATURE) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ CHILDREN'S MUSEUMS DMV SCRAPER COMPLETE`);
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
      venueTypes: ['museum', 'science-center', 'zoo', 'aquarium', 'petting-zoo', 'farm'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeChildrensMuseumsDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeChildrensMuseumsDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Children\'s Museums DMV Scraper');

  scrapeChildrensMuseumsDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeChildrensMuseumsDMV,
  scrapeChildrensMuseumsDMVCloudFunction,
};
