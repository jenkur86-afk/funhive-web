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

const SCRAPER_NAME = 'ChildrensMuseums-DMV';

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
