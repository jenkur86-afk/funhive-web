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

const SCRAPER_NAME = 'NatureFarms-DMV';

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
 * Save activities to Firestore using venue-matcher for deduplication
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
  const mdVenues = NATURE_FARMS.filter(v => v.state === 'MD');
  const vaVenues = NATURE_FARMS.filter(v => v.state === 'VA');
  const dcVenues = NATURE_FARMS.filter(v => v.state === 'DC');

  console.log(`\n  Maryland (${mdVenues.length} venues):`);
  for (const location of mdVenues) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  Virginia (${vaVenues.length} venues):`);
  for (const location of vaVenues) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  DC (${dcVenues.length} venues):`);
  for (const location of dcVenues) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);
  console.log('\n💾 Saving to Firestore...');

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
