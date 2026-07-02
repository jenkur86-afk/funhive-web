#!/usr/bin/env node

/**
 * NATURE CENTERS & FARMS DMV ACTIVITIES SCRAPER
 *
 * Adds nature centers, educational farms, and outdoor education venues
 * to the activities collection. Focuses on family-friendly outdoor
 * learning experiences.
 *
 * Coverage:
 * - Nature Centers
 * - Educational Farms
 * - Wildlife Sanctuaries
 * - Botanical Gardens
 * - Environmental Education Centers
 *
 * Usage:
 *   node scraper-activities-nature-farms-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledNatureFarmsDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'NatureFarms-Eastern';

// ==========================================
// VENUE DATA - DMV Nature Centers & Farms
// ==========================================

const NATURE_FARMS = [
  // NATURE CENTERS - MARYLAND
  {
    name: 'Locust Grove Nature Center',
    address: '7777 Democracy Boulevard',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20817',
    latitude: 39.0078,
    longitude: -77.1458,
    phone: '(301) 765-8660',
    website: 'https://www.montgomeryparks.org/parks-and-trails/cabin-john-regional-park/locust-grove-nature-center/',
    hours: 'Tue-Sat 9am-5pm',
    county: 'Montgomery County',
    description: 'Nature center in Cabin John Regional Park with live animals, exhibits, and nature trails. Free admission with programs for kids.',
    cost: 'Free admission, Programs vary',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'nature-trails', 'exhibits', 'programs', 'free', 'parks-department'],
  },
  {
    name: 'Brookside Nature Center',
    address: '1400 Glenallan Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0558,
    longitude: -77.0518,
    phone: '(301) 962-1480',
    website: 'https://www.montgomeryparks.org/parks-and-trails/brookside-gardens/nature-center/',
    hours: 'Tue-Sat 9am-5pm',
    county: 'Montgomery County',
    description: 'Nature center adjacent to Brookside Gardens with live reptiles, insects, and hands-on exhibits. Free family programs.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'gardens', 'exhibits', 'programs', 'free', 'parks-department'],
  },
  {
    name: 'Black Hill Nature Center',
    address: '20926 Lake Ridge Drive',
    city: 'Boyds',
    state: 'MD',
    zipCode: '20841',
    latitude: 39.2058,
    longitude: -77.2918,
    phone: '(301) 972-9458',
    website: 'https://www.montgomeryparks.org/parks-and-trails/black-hill-regional-park/',
    hours: 'Tue-Sat 11am-5pm, Sun 11am-5pm',
    county: 'Montgomery County',
    description: 'Nature center at Black Hill Regional Park with exhibits on local wildlife and ecology. Boat rentals and nature trails nearby.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['exhibits', 'nature-trails', 'lake', 'boat-rentals', 'free', 'parks-department'],
  },
  {
    name: 'Robinson Nature Center',
    address: '6692 Cedar Lane',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21044',
    latitude: 39.2118,
    longitude: -76.8978,
    phone: '(410) 313-0400',
    website: 'https://www.hocospark.com/robinson-nature-center/',
    hours: 'Wed-Sat 9am-5pm, Sun 12pm-5pm',
    county: 'Howard County',
    description: 'LEED Platinum certified nature center with interactive exhibits, live animals, and extensive trail system. Environmental education programs.',
    cost: '$5/adult, $3/child',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'nature-center',
    features: ['live-animals', 'interactive-exhibits', 'nature-trails', 'programs', 'green-building'],
  },
  {
    name: 'Watkins Nature Center',
    address: '301 Watkins Park Drive',
    city: 'Upper Marlboro',
    state: 'MD',
    zipCode: '20774',
    latitude: 38.8698,
    longitude: -76.7818,
    phone: '(301) 218-6702',
    website: 'https://www.pgparks.com/facilities/watkins-nature-center',
    hours: 'Wed-Fri 9am-4pm, Sat-Sun 9am-5pm',
    county: "Prince George's County",
    description: 'Nature center with live animals, planetarium shows, and nature trails at Watkins Regional Park. Connected to historic carousel.',
    cost: 'Free admission, Planetarium $2',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'planetarium', 'nature-trails', 'carousel', 'parks-department'],
  },
  {
    name: 'Clearwater Nature Center',
    address: '11000 Thrift Road',
    city: 'Clinton',
    state: 'MD',
    zipCode: '20735',
    latitude: 38.7358,
    longitude: -76.9278,
    phone: '(301) 297-4575',
    website: 'https://www.pgparks.com/facilities/clearwater-nature-center',
    hours: 'Thu-Sat 10am-4pm',
    county: "Prince George's County",
    description: 'Nature center with exhibits on Chesapeake Bay watershed. Trails, live animals, and environmental education programs.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'exhibits', 'nature-trails', 'programs', 'free', 'parks-department'],
  },

  // NATURE CENTERS - VIRGINIA
  {
    name: 'Hidden Oaks Nature Center',
    address: '7701 Royce Street',
    city: 'Annandale',
    state: 'VA',
    zipCode: '22003',
    latitude: 38.8308,
    longitude: -77.2108,
    phone: '(703) 941-1065',
    website: 'https://www.fairfaxcounty.gov/parks/hidden-oaks-nature-center',
    hours: 'Mon-Fri 9am-5pm, Sat-Sun 12pm-5pm',
    county: 'Fairfax County',
    description: 'Nature center at Hidden Pond Park with live animals, exhibits, and trails. Free admission with nature programs for families.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'exhibits', 'nature-trails', 'pond', 'programs', 'free'],
  },
  {
    name: 'Gulf Branch Nature Center',
    address: '3608 N Military Road',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22207',
    latitude: 38.9058,
    longitude: -77.1218,
    phone: '(703) 228-3403',
    website: 'https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Locations/Gulf-Branch-Nature-Center',
    hours: 'Tue-Sat 10am-5pm, Sun 1pm-5pm',
    county: 'Arlington County',
    description: 'Historic nature center in Arlington with live animals, exhibits, and stream valley trails. Free programs for kids and families.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'exhibits', 'nature-trails', 'stream-valley', 'programs', 'free', 'historic'],
  },
  {
    name: 'Long Branch Nature Center',
    address: '625 S Carlin Springs Road',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22204',
    latitude: 38.8618,
    longitude: -77.1058,
    phone: '(703) 228-6535',
    website: 'https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Locations/Long-Branch-Nature-Center',
    hours: 'Tue-Sat 10am-5pm, Sun 1pm-5pm',
    county: 'Arlington County',
    description: 'Nature center with live animals, exhibits, and garden. Part of Glencarlyn Park with trails and picnic areas.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'exhibits', 'nature-trails', 'gardens', 'programs', 'free'],
  },
  {
    name: 'Riverbend Park Nature Center',
    address: '8700 Potomac Hills Street',
    city: 'Great Falls',
    state: 'VA',
    zipCode: '22066',
    latitude: 39.0218,
    longitude: -77.2458,
    phone: '(703) 759-9018',
    website: 'https://www.fairfaxcounty.gov/parks/riverbend',
    hours: 'Wed-Mon 9am-5pm',
    county: 'Fairfax County',
    description: 'Nature center along the Potomac River with wildlife exhibits and extensive trail system. Kayak and canoe rentals available.',
    cost: '$10 parking (weekends)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'nature-center',
    features: ['exhibits', 'nature-trails', 'river-access', 'kayaking', 'wildlife-viewing'],
  },

  // EDUCATIONAL FARMS - MARYLAND
  {
    name: "Clark's Elioak Farm",
    address: '10500 Clarksville Pike',
    city: 'Ellicott City',
    state: 'MD',
    zipCode: '21042',
    latitude: 39.2378,
    longitude: -76.9018,
    phone: '(410) 730-4049',
    website: 'https://clarklandfarm.com',
    hours: 'Daily 10am-5pm (seasonal)',
    county: 'Howard County',
    description: 'Enchanted petting farm with fairy tale structures, farm animals, and pony rides. Home to rescued Enchanted Forest storybook attractions.',
    cost: '$10-12/person',
    ageRange: 'Ages 1-10',
    isFree: false,
    venueType: 'farm',
    features: ['petting-zoo', 'pony-rides', 'fairy-tale', 'playground', 'seasonal'],
  },
  {
    name: 'Homestead Farm',
    address: '15604 Sugarland Road',
    city: 'Poolesville',
    state: 'MD',
    zipCode: '20837',
    latitude: 39.1378,
    longitude: -77.4078,
    phone: '(301) 977-3761',
    website: 'https://www.homestead-farm.net',
    hours: 'Daily 9am-6pm (seasonal)',
    county: 'Montgomery County',
    description: 'Pick-your-own farm with strawberries, apples, pumpkins, and more. Farm animals and country store. Open seasonally.',
    cost: 'Free admission, Pay for produce',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'farm',
    features: ['pick-your-own', 'farm-animals', 'seasonal', 'country-store', 'u-pick'],
  },
  {
    name: 'Butler\'s Orchard',
    address: '22222 Davis Mill Road',
    city: 'Germantown',
    state: 'MD',
    zipCode: '20876',
    latitude: 39.1878,
    longitude: -77.2618,
    phone: '(301) 972-3299',
    website: 'https://butlersorchard.com',
    hours: 'Daily 9am-6pm (seasonal)',
    county: 'Montgomery County',
    description: 'Pick-your-own farm with seasonal activities. Fall festival with corn maze, hayrides, and pumpkin patch. Berry picking in summer.',
    cost: 'Varies by activity ($5-20)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'farm',
    features: ['pick-your-own', 'corn-maze', 'hayrides', 'pumpkin-patch', 'seasonal', 'fall-festival'],
  },
  {
    name: 'Oxon Cove Park & Farm',
    address: '6411 Oxon Hill Road',
    city: 'Oxon Hill',
    state: 'MD',
    zipCode: '20745',
    latitude: 38.7948,
    longitude: -76.9918,
    phone: '(301) 839-1176',
    website: 'https://www.nps.gov/oxhi/',
    hours: 'Daily 8am-4:30pm',
    county: "Prince George's County",
    description: 'National Park Service farm with farm animals, gardens, and trails. Free admission with ranger-led programs and wagon rides.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'farm',
    features: ['farm-animals', 'gardens', 'trails', 'ranger-programs', 'free', 'national-park'],
  },
  {
    name: 'Larriland Farm',
    address: '2415 Woodbine Road',
    city: 'Woodbine',
    state: 'MD',
    zipCode: '21797',
    latitude: 39.3578,
    longitude: -77.0478,
    phone: '(410) 442-2605',
    website: 'https://www.pickyourown.com',
    hours: 'Daily 9am-6pm (seasonal)',
    county: 'Howard County',
    description: 'Pick-your-own farm with strawberries, berries, peaches, apples, and pumpkins. Seasonal activities and farm market.',
    cost: 'Free admission, Pay for produce',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'farm',
    features: ['pick-your-own', 'seasonal', 'farm-market', 'u-pick'],
  },

  // EDUCATIONAL FARMS - VIRGINIA
  {
    name: 'Frying Pan Farm Park',
    address: '2709 West Ox Road',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20171',
    latitude: 38.8978,
    longitude: -77.3518,
    phone: '(703) 437-9101',
    website: 'https://www.fairfaxcounty.gov/parks/frying-pan-park',
    hours: 'Daily 9am-5pm',
    county: 'Fairfax County',
    description: 'Working farm with livestock, gardens, and historic equipment. Free admission with wagon rides and programs. Carousel on-site.',
    cost: 'Free admission, Activities vary',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'farm',
    features: ['farm-animals', 'carousel', 'wagon-rides', 'gardens', 'free', 'parks-department'],
  },
  {
    name: 'Kidwell Farm at Frying Pan Park',
    address: '2709 West Ox Road',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20171',
    latitude: 38.8978,
    longitude: -77.3518,
    phone: '(703) 437-9101',
    website: 'https://www.fairfaxcounty.gov/parks/frying-pan-park/kidwell-farm',
    hours: 'Daily 9am-5pm',
    county: 'Fairfax County',
    description: 'Interactive farm experience for kids at Frying Pan Park. Feed animals, collect eggs, and learn about farm life.',
    cost: '$5-8/child for programs',
    ageRange: 'Ages 2-10',
    isFree: false,
    venueType: 'farm',
    features: ['farm-animals', 'interactive', 'egg-collecting', 'programs', 'kids-focused'],
  },
  {
    name: 'Great Country Farms',
    address: '18780 Foggy Bottom Road',
    city: 'Bluemont',
    state: 'VA',
    zipCode: '20135',
    latitude: 39.1218,
    longitude: -77.8318,
    phone: '(540) 554-2073',
    website: 'https://greatcountryfarms.com',
    hours: 'Thu-Sun 9am-6pm (seasonal)',
    county: 'Loudoun County',
    description: 'Pick-your-own farm with seasonal activities. Strawberries, peaches, apples, pumpkins. Farm playground and animal barn.',
    cost: '$10-15/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'farm',
    features: ['pick-your-own', 'playground', 'farm-animals', 'seasonal', 'fall-festival'],
  },
  {
    name: 'Temple Hall Farm Regional Park',
    address: '15789 Temple Hall Lane',
    city: 'Leesburg',
    state: 'VA',
    zipCode: '20176',
    latitude: 39.1098,
    longitude: -77.5318,
    phone: '(703) 779-9372',
    website: 'https://www.novaparks.com/parks/temple-hall-farm-regional-park',
    hours: 'Daily dawn-dusk',
    county: 'Loudoun County',
    description: 'Historic farm with trails, farm animals, and gardens. Free admission with special events throughout the year.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'farm',
    features: ['farm-animals', 'trails', 'gardens', 'historic', 'free', 'regional-park'],
  },

  // DC NATURE/GARDENS
  {
    name: 'US Botanic Garden',
    address: '100 Maryland Avenue SW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20001',
    latitude: 38.8878,
    longitude: -77.0128,
    phone: '(202) 225-8333',
    website: 'https://www.usbg.gov',
    hours: 'Daily 10am-5pm',
    county: 'District of Columbia',
    description: 'Free botanical garden near Capitol with conservatory, outdoor gardens, and Bartholdi Park. Special exhibits and family programs.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'botanical-garden',
    features: ['conservatory', 'outdoor-gardens', 'free', 'family-programs', 'historic'],
  },
  {
    name: 'Rock Creek Park Nature Center',
    address: '5200 Glover Road NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20015',
    latitude: 38.9598,
    longitude: -77.0508,
    phone: '(202) 895-6070',
    website: 'https://www.nps.gov/rocr/planyourvisit/naturecenter.htm',
    hours: 'Wed-Sun 9am-5pm',
    county: 'District of Columbia',
    description: 'National Park Service nature center with live animals, planetarium, and exhibits. Free programs and extensive trail network.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'nature-center',
    features: ['live-animals', 'planetarium', 'exhibits', 'nature-trails', 'free', 'national-park'],
  },
  {
    name: 'Kenilworth Aquatic Gardens',
    address: '1550 Anacostia Avenue NE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20019',
    latitude: 38.9128,
    longitude: -76.9438,
    phone: '(202) 692-6080',
    website: 'https://www.nps.gov/keaq/',
    hours: 'Daily 8am-4pm',
    county: 'District of Columbia',
    description: 'National Park with water lilies, lotus flowers, and wetland wildlife. Best visited June-July for lotus blooms. Free admission.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'botanical-garden',
    features: ['water-gardens', 'lotus', 'wildlife', 'trails', 'free', 'national-park'],
  },

  // ==========================================
  // EASTERN US EXPANSION — NATURE & FARMS
  // ==========================================

  // NEW YORK
  { name: 'Queens County Farm Museum', address: '73-50 Little Neck Pkwy', city: 'Floral Park', state: 'NY', zipCode: '11004', latitude: 40.7412, longitude: -73.7059, phone: '(718) 347-3276', website: 'https://www.queensfarm.org', hours: 'Grounds: Daily dawn-dusk; Farm Shop: Tue-Sun 11am-4pm', county: 'Queens County', description: 'Historic working farm in Queens NYC with farm animals, orchards, hayrides, and seasonal festivals. Free admission to grounds.', cost: 'Free (special events extra)', ageRange: 'All Ages', isFree: true, venueType: 'farm', features: ['farm-animals', 'hayrides', 'orchard', 'pumpkin-picking', 'festivals', 'historic', 'free'] },
  { name: 'Connetquot River State Park Preserve', address: 'PO Box 505', city: 'Oakdale', state: 'NY', zipCode: '11769', latitude: 40.7281, longitude: -73.1454, phone: '(631) 581-1005', website: 'https://www.nysparks.com', hours: 'Wed-Sun sunrise-sunset (by reservation)', county: 'Suffolk County', description: 'Nature preserve on Long Island with trout streams, wildlife trails, and historic grist mill. Hiking and nature walks for families.', cost: '$8/vehicle', ageRange: 'All Ages', isFree: false, venueType: 'nature-preserve', features: ['trails', 'wildlife', 'fishing', 'historic', 'nature-walks'] },

  // NEW JERSEY
  { name: 'Terhune Orchards Princeton', address: '330 Cold Soil Rd', city: 'Princeton', state: 'NJ', zipCode: '08540', latitude: 40.3219, longitude: -74.7152, phone: '(609) 924-2310', website: 'https://www.terhuneorchards.com', hours: 'May-Nov: Daily 9am-6pm', county: 'Mercer County', description: 'Family farm in Princeton NJ with pick-your-own fruit, farm animals, hay wagon rides, corn maze, and farm store. Seasonal fun for all ages.', cost: '$10-20/person', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['pick-your-own', 'farm-animals', 'hayrides', 'corn-maze', 'pumpkins', 'seasonal'] },
  { name: 'Laurita Winery and Farm New Egypt', address: '85 Pin Oak Rd', city: 'New Egypt', state: 'NJ', zipCode: '08533', latitude: 40.0690, longitude: -74.5376, phone: '(609) 752-0200', website: 'https://www.lauritawinery.com', hours: 'Wed-Sun 11am-5pm', county: 'Ocean County', description: 'Laurita Winery and Farm in NJ with farm animals, pumpkin patch, seasonal festivals, and family-friendly events.', cost: 'Seasonal events vary', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['farm-animals', 'pumpkins', 'seasonal-festivals', 'petting-zoo'] },

  // PENNSYLVANIA
  { name: 'Linvilla Orchards Media', address: '137 W Knowlton Rd', city: 'Media', state: 'PA', zipCode: '19063', latitude: 39.9084, longitude: -75.4232, phone: '(610) 876-7116', website: 'https://www.linvilla.com', hours: 'Daily 9am-6pm (seasonal)', county: 'Delaware County', description: 'Classic family orchard near Philadelphia with pick-your-own apples, pumpkins, Christmas trees, farm animals, and seasonal fun.', cost: '$5-15/person', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['pick-your-own', 'pumpkins', 'farm-animals', 'hayrides', 'corn-maze', 'christmas-trees'] },
  { name: 'Delaware Water Gap NRA', address: '1 River Rd', city: 'Bushkill', state: 'PA', zipCode: '18324', latitude: 41.0917, longitude: -74.9007, phone: '(570) 426-2452', website: 'https://www.nps.gov/dewa', hours: 'Daily dawn-dusk', county: 'Pike County', description: 'National Recreation Area with 70,000 acres of forests, rivers, and waterfalls on the NJ-PA border. Hiking, swimming, picnicking for families.', cost: 'Free', ageRange: 'All Ages', isFree: true, venueType: 'nature-preserve', features: ['hiking', 'swimming', 'waterfalls', 'fishing', 'picnicking', 'free'] },

  // CONNECTICUT
  { name: 'Lyman Orchards Middlefield', address: '70 Lyman Rd', city: 'Middlefield', state: 'CT', zipCode: '06455', latitude: 41.5323, longitude: -72.6831, phone: '(860) 349-1793', website: 'https://www.lymanorchards.com', hours: 'Daily 8am-6pm (seasonal)', county: 'Middlesex County', description: 'Historic 1741 orchard in Connecticut with pick-your-own apples, strawberries, blueberries, sunflowers, and corn maze. Family tradition for generations.', cost: 'Free entry, pay for picked fruit', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['pick-your-own', 'corn-maze', 'sunflowers', 'farm-store', 'seasonal', 'historic'] },

  // MASSACHUSETTS
  { name: 'Davis Farmland Sterling', address: '145 Newton Rd', city: 'Sterling', state: 'MA', zipCode: '01564', latitude: 42.4390, longitude: -71.7712, phone: '(978) 422-6595', website: 'https://www.davisfarmland.com', hours: 'May-Oct: daily 9:30am-5pm', county: 'Worcester County', description: 'Family farm in Sterling MA with rare farm animals, nature-themed water playground, hayrides, and conservation programs. Top Central MA family destination.', cost: '$18/person', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['rare-animals', 'water-play', 'hayrides', 'conservation', 'petting-zoo', 'birthday-parties'] },
  { name: 'Drumlin Farm Wildlife Sanctuary Lincoln', address: '208 S Great Rd', city: 'Lincoln', state: 'MA', zipCode: '01773', latitude: 42.4065, longitude: -71.3376, phone: '(781) 259-2200', website: 'https://www.massaudubon.org/drumlin', hours: 'Tue-Sun 9am-5pm', county: 'Middlesex County', description: 'Mass Audubon working farm near Boston with farm animals, nature trails, wildlife programs, and seasonal events for families.', cost: '$10 adults, $6 children', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['farm-animals', 'wildlife', 'nature-trails', 'seasonal-programs', 'education'] },

  // RHODE ISLAND
  { name: 'Coggeshall Farm Museum Bristol', address: '1 Colt Dr', city: 'Bristol', state: 'RI', zipCode: '02809', latitude: 41.6766, longitude: -71.2768, phone: '(401) 253-9062', website: 'https://www.coggeshall.org', hours: 'Tue-Sun 10am-5pm (winter hours vary)', county: 'Bristol County', description: 'Living history farm museum in Bristol RI with 18th-century farming demonstrations, farm animals, and seasonal festivals.', cost: '$8 adults, $5 children', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['historic-farm', 'farm-animals', 'demonstrations', 'seasonal-festivals', 'education'] },

  // NEW HAMPSHIRE
  { name: 'Beans and Greens Farm Gilford', address: '245 Intervale Rd', city: 'Gilford', state: 'NH', zipCode: '03249', latitude: 43.5326, longitude: -71.4100, phone: '(603) 293-2853', website: 'https://www.beansandgreensfarm.com', hours: 'Summer-Fall: Daily 9am-6pm', county: 'Belknap County', description: 'Working family farm in NH with pick-your-own blueberries, corn, pumpkins, corn maze, hayrides, and farm animals.', cost: '$5 entry, plus pick price', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['pick-your-own', 'corn-maze', 'hayrides', 'farm-animals', 'pumpkins', 'seasonal'] },

  // MAINE
  { name: 'Acadia National Park Bar Harbor', address: '25 Visitor Center Rd', city: 'Bar Harbor', state: 'ME', zipCode: '04609', latitude: 44.3516, longitude: -68.2148, phone: '(207) 288-3338', website: 'https://www.nps.gov/acad', hours: 'Year-round (Visitor Center May-Oct)', county: 'Hancock County', description: 'Acadia National Park in Maine with ocean views, hiking, carriage roads, tide pools, and wildlife. Iconic New England nature destination for families.', cost: '$35/vehicle', ageRange: 'All Ages', isFree: false, venueType: 'national-park', features: ['hiking', 'ocean', 'tide-pools', 'wildlife', 'carriage-roads', 'camping'] },

  // VERMONT
  { name: 'Vermont Teddy Bear Farm Shelburne', address: '6655 Shelburne Rd', city: 'Shelburne', state: 'VT', zipCode: '05482', latitude: 44.3821, longitude: -73.2354, phone: '(802) 985-3001', website: 'https://www.vermontteddybear.com', hours: 'Daily 9am-5pm', county: 'Chittenden County', description: 'Vermont Teddy Bear Company with factory tours, make-your-own bears, and nature trail. Unique family experience near Burlington.', cost: 'Factory tour $4/person', ageRange: 'All Ages', isFree: false, venueType: 'attraction', features: ['factory-tour', 'make-your-own', 'nature-trail', 'family-fun', 'unique'] },

  // DELAWARE
  { name: 'Brandywine Creek State Park Wilmington', address: '41 Adams Dam Rd', city: 'Wilmington', state: 'DE', zipCode: '19807', latitude: 39.8090, longitude: -75.5814, phone: '(302) 577-3534', website: 'https://www.destateparks.com', hours: 'Daily 8am-sunset', county: 'New Castle County', description: 'Scenic state park along Brandywine Creek with nature trails, butterfly garden, freshwater pond, and family nature programs.', cost: '$4-8/vehicle', ageRange: 'All Ages', isFree: false, venueType: 'nature-preserve', features: ['trails', 'butterfly-garden', 'freshwater-pond', 'wildlife', 'nature-programs'] },

  // WEST VIRGINIA
  { name: 'Blackwater Falls State Park Davis', address: '1584 Blackwater Lodge Rd', city: 'Davis', state: 'WV', zipCode: '26260', latitude: 39.0971, longitude: -79.4841, phone: '(304) 259-5216', website: 'https://www.wvstateparks.com', hours: 'Daily dawn-dusk', county: 'Tucker County', description: 'Blackwater Falls State Park with stunning waterfall, hiking, rhododendron garden, and wildlife viewing. Beautiful WV nature for families.', cost: 'Free', ageRange: 'All Ages', isFree: true, venueType: 'nature-preserve', features: ['waterfalls', 'hiking', 'rhododendrons', 'wildlife', 'scenic-views', 'free'] },

  // NORTH CAROLINA
  { name: 'Elma C Lomax Incubator Farm Concord', address: '1950 Patterson Farm Rd', city: 'Concord', state: 'NC', zipCode: '28027', latitude: 35.4037, longitude: -80.6199, phone: '(704) 920-2991', website: 'https://www.cabarruscountync.gov', hours: 'Year-round (tours vary)', county: 'Cabarrus County', description: 'Working incubator farm near Charlotte with farm animals, educational programs, and seasonal family events.', cost: 'Free / minimal fees', ageRange: 'All Ages', isFree: true, venueType: 'farm', features: ['farm-animals', 'education', 'seasonal-events', 'family-programs'] },
  { name: 'Shelton Herb Farm Leasburg', address: '435 Batters Creek Rd', city: 'Leasburg', state: 'NC', zipCode: '27291', latitude: 36.3968, longitude: -79.1790, phone: '(336) 694-5595', website: 'https://www.sheltonherbfarm.com', hours: 'Fri-Sat 10am-5pm, Sun 12pm-5pm', county: 'Caswell County', description: 'Family herb farm in NC with herb gardens, farm animals, pick-your-own herbs, and seasonal events. Educational farm experience.', cost: '$6 adults, $3 children', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['herb-gardens', 'farm-animals', 'pick-your-own', 'seasonal-events', 'education'] },

  // SOUTH CAROLINA
  { name: 'Boone Hall Plantation Mount Pleasant', address: '1235 Long Point Rd', city: 'Mount Pleasant', state: 'SC', zipCode: '29466', latitude: 32.8635, longitude: -79.8372, phone: '(843) 884-4371', website: 'https://www.boonehallplantation.com', hours: 'Mon-Sat 9am-5pm, Sun 12pm-5pm', county: 'Charleston County', description: 'Historic plantation near Charleston SC with seasonal picking, farm animals, nature trails, and living history demonstrations.', cost: '$28 adults, $15 children', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['historic', 'pick-your-own', 'farm-animals', 'nature-trails', 'demonstrations', 'living-history'] },

  // GEORGIA
  { name: 'Yellow River Wildlife Sanctuary Lilburn', address: '4525 Hwy 78', city: 'Lilburn', state: 'GA', zipCode: '30047', latitude: 33.8975, longitude: -84.1270, phone: '(770) 972-6643', website: 'https://www.yellowriverwildlife.com', hours: 'Daily 9:30am-5:30pm', county: 'Gwinnett County', description: 'Wildlife sanctuary near Atlanta with 600+ native animals, petting areas, and nature trails. Family nature and wildlife education.', cost: '$15 adults, $13 children', ageRange: 'All Ages', isFree: false, venueType: 'wildlife-sanctuary', features: ['native-animals', 'petting-area', 'nature-trails', 'wildlife-education', 'birthday-parties'] },
  { name: 'Jaemor Farms Alto', address: '5340 Cornelia Hwy', city: 'Alto', state: 'GA', zipCode: '30510', latitude: 34.4628, longitude: -83.5713, phone: '(706) 869-3999', website: 'https://www.jaemorfarms.com', hours: 'Seasonal: Daily 9am-6pm', county: 'Habersham County', description: 'Family farm in North Georgia with peach picking, apple orchard, farm animals, pumpkin patch, and seasonal festivals.', cost: 'Free entry, pick-your-own pricing', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['peach-picking', 'apple-orchard', 'farm-animals', 'pumpkins', 'seasonal', 'festivals'] },

  // FLORIDA
  { name: 'Green Meadows Petting Farm Kissimmee', address: '1368 S Poinciana Blvd', city: 'Kissimmee', state: 'FL', zipCode: '34746', latitude: 28.1756, longitude: -81.4526, phone: '(407) 846-0770', website: 'https://www.greenmeadowsfarm.com', hours: 'Daily 9:30am-4pm (last tour 1pm)', county: 'Osceola County', description: 'Guided petting farm tour near Orlando with 300+ animals, milking cows, pony rides, and hay wagon rides. Great for young children.', cost: '$28 per person (all-inclusive)', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['petting-zoo', 'pony-rides', 'cow-milking', 'hayrides', 'guided-tours', 'young-children'] },
  { name: 'Corkscrew Swamp Sanctuary Naples', address: '375 Sanctuary Rd W', city: 'Naples', state: 'FL', zipCode: '34120', latitude: 26.3808, longitude: -81.6025, phone: '(239) 348-9151', website: 'https://corkscrew.audubon.org', hours: 'Daily 7am-7pm', county: 'Collier County', description: 'Audubon sanctuary with ancient cypress forest boardwalk, alligators, birds, and wildlife. Serene nature experience in Southwest Florida.', cost: '$16 adults, $6 children', ageRange: 'All Ages', isFree: false, venueType: 'nature-preserve', features: ['boardwalk', 'cypress-forest', 'alligators', 'birdwatching', 'wildlife', 'guided-walks'] },

  // ALABAMA
  { name: 'Desoto State Park Fort Payne', address: '13883 County Rd 89', city: 'Fort Payne', state: 'AL', zipCode: '35968', latitude: 34.5623, longitude: -85.6278, phone: '(256) 845-0051', website: 'https://www.alapark.com', hours: 'Daily dawn-dusk', county: 'DeKalb County', description: 'DeSoto State Park on Lookout Mountain with Little River Canyon, hiking, swimming holes, waterfalls, and nature programs for families.', cost: '$4/person', ageRange: 'All Ages', isFree: false, venueType: 'nature-preserve', features: ['canyon', 'hiking', 'swimming', 'waterfalls', 'nature-programs', 'camping'] },

  // MISSISSIPPI
  { name: 'Natchez Trace Parkway Headquarters Tupelo', address: '2680 Natchez Trace Pkwy', city: 'Tupelo', state: 'MS', zipCode: '38804', latitude: 34.1804, longitude: -88.7079, phone: '(800) 305-7417', website: 'https://www.nps.gov/natr', hours: 'Daily dawn-dusk', county: 'Lee County', description: 'Historic Natchez Trace Parkway with scenic drives, hiking, cycling, wildlife, and ancient mound sites. Family nature and history exploration.', cost: 'Free', ageRange: 'All Ages', isFree: true, venueType: 'national-park', features: ['hiking', 'cycling', 'wildlife', 'historic-sites', 'scenic-drive', 'free'] },

  // TENNESSEE
  { name: 'Great Smoky Mountains National Park Gatlinburg', address: '107 Park Headquarters Rd', city: 'Gatlinburg', state: 'TN', zipCode: '37738', latitude: 35.6965, longitude: -83.5332, phone: '(865) 436-1200', website: 'https://www.nps.gov/grsm', hours: 'Daily 24 hours', county: 'Sevier County', description: 'America most-visited national park with scenic drives, hiking, wildlife (black bears, deer), and waterfalls. No admission fee. Perfect family nature destination.', cost: 'Free', ageRange: 'All Ages', isFree: true, venueType: 'national-park', features: ['hiking', 'wildlife', 'waterfalls', 'black-bears', 'scenic-drive', 'camping', 'free'] },

  // KENTUCKY
  { name: 'Kentucky Horse Park Lexington', address: '4089 Ironworks Pike', city: 'Lexington', state: 'KY', zipCode: '40511', latitude: 38.1202, longitude: -84.5315, phone: '(859) 233-4303', website: 'https://www.kyhorsepark.com', hours: 'Apr-Oct: Daily 9am-5pm; Nov-Mar: Wed-Sun 9am-5pm', county: 'Fayette County', description: 'One-of-a-kind working horse farm and park with live horse shows, pony rides, horse museum, and camping. Unique family experience in the Bluegrass.', cost: '$20 adults, $12 children', ageRange: 'All Ages', isFree: false, venueType: 'farm', features: ['horse-shows', 'pony-rides', 'museum', 'trails', 'camping', 'unique-experience'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'nature-center': { category: 'Outdoor', subcategory: 'Nature Center' },
    'farm': { category: 'Outdoor', subcategory: 'Farm' },
    'botanical-garden': { category: 'Outdoor', subcategory: 'Botanical Garden' },
  };
  return categories[venueType] || { category: 'Outdoor', subcategory: 'Nature' };
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
      source: 'nature-farms-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: false,
      hasParking: true,
      hasLiveAnimals: location.features.includes('live-animals') || location.features.includes('farm-animals'),
      hasTrails: location.features.includes('nature-trails') || location.features.includes('trails'),
      hasPrograms: location.features.includes('programs') || location.features.includes('ranger-programs'),
      isPickYourOwn: location.features.includes('pick-your-own') || location.features.includes('u-pick'),
      isParksDepartment: location.features.includes('parks-department') || location.features.includes('national-park') || location.features.includes('regional-park'),
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

async function scrapeNatureFarmsDMV() {
  console.log(`\n🌿 NATURE CENTERS & FARMS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🌿 Processing Nature Centers & Farms...');

  // Group by state
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of NATURE_FARMS) {
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
  console.log(`✅ NATURE CENTERS & FARMS DMV SCRAPER COMPLETE`);
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

async function scrapeNatureFarmsDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeNatureFarmsDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Nature Centers & Farms DMV Scraper');
  scrapeNatureFarmsDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeNatureFarmsDMV,
  scrapeNatureFarmsDMVCloudFunction,
};
