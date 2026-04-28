#!/usr/bin/env node

/**
 * INDOOR PLAYGROUNDS DMV ACTIVITIES SCRAPER
 *
 * Adds indoor playground venues to the activities collection.
 * These venues offer drop-in play with regular hours (not discrete events).
 *
 * Chains covered:
 * - Hyper Kidz (6 DMV locations)
 * - Sky Zone (selected DMV locations)
 * - Urban Air (MD locations)
 *
 * Usage:
 *   node scraper-activities-indoor-playgrounds-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledIndoorPlaygroundsDMV
 * Schedule: Weekly (activities don't change often)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'IndoorPlaygrounds-DMV';

// ==========================================
// VENUE DATA - DMV Indoor Playgrounds
// ==========================================

const HYPER_KIDZ_LOCATIONS = [
  {
    name: 'Hyper Kidz Columbia',
    address: '8880 McGaw Court',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21045',
    latitude: 39.1969,
    longitude: -76.8391,
    phone: '(443) 546-5437',
    website: 'https://hyperkidzplay.com/columbia',
    hours: 'Mon-Thu 10am-7pm, Fri-Sat 10am-8pm, Sun 10am-7pm',
    county: 'Howard County',
  },
  {
    name: 'Hyper Kidz Rockville',
    address: '1500 Research Blvd Suite 100',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20850',
    latitude: 39.0924,
    longitude: -77.1855,
    phone: '(301) 838-8585',
    website: 'https://hyperkidzplay.com/rockville',
    hours: 'Mon-Thu 10am-7pm, Fri-Sat 10am-8pm, Sun 10am-7pm',
    county: 'Montgomery County',
  },
  {
    name: 'Hyper Kidz Crofton',
    address: '2120 Priest Bridge Drive Suite 9',
    city: 'Crofton',
    state: 'MD',
    zipCode: '21114',
    latitude: 39.0018,
    longitude: -76.6789,
    phone: '(410) 451-5437',
    website: 'https://hyperkidzplay.com/crofton',
    hours: 'Mon-Thu 10am-7pm, Fri-Sat 10am-8pm, Sun 10am-7pm',
    county: 'Anne Arundel County',
  },
  {
    name: 'Hyper Kidz Baltimore',
    address: '6200 Baltimore National Pike',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21228',
    latitude: 39.2851,
    longitude: -76.7474,
    phone: '(410) 788-5437',
    website: 'https://hyperkidzplay.com/baltimore',
    hours: 'Mon-Thu 10am-7pm, Fri-Sat 10am-8pm, Sun 10am-7pm',
    county: 'Baltimore County',
  },
  {
    name: 'Hyper Kidz Ashburn',
    address: '44050 Ashburn Shopping Plaza Suite 180',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0437,
    longitude: -77.4875,
    phone: '(571) 510-5437',
    website: 'https://hyperkidzplay.com/ashburn',
    hours: 'Mon-Thu 10am-7pm, Fri-Sat 10am-8pm, Sun 10am-7pm',
    county: 'Loudoun County',
  },
  {
    name: 'Hyper Kidz Alexandria',
    address: '6303 Little River Turnpike Suite 250',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22312',
    latitude: 38.8178,
    longitude: -77.1378,
    phone: '(703) 914-5437',
    website: 'https://hyperkidzplay.com/alexandria',
    hours: 'Mon-Thu 10am-7pm, Fri-Sat 10am-8pm, Sun 10am-7pm',
    county: 'Fairfax County',
  },
];

const SKY_ZONE_LOCATIONS = [
  {
    name: 'Sky Zone Columbia',
    address: '7175 Oakland Mills Road',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21046',
    latitude: 39.1907,
    longitude: -76.8195,
    phone: '(443) 546-4386',
    website: 'https://www.skyzone.com/columbia',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Howard County',
  },
  {
    name: 'Sky Zone Timonium',
    address: '2100 York Road Suite E',
    city: 'Timonium',
    state: 'MD',
    zipCode: '21093',
    latitude: 39.4436,
    longitude: -76.6197,
    phone: '(410) 308-0700',
    website: 'https://www.skyzone.com/timonium',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Baltimore County',
  },
  {
    name: 'Sky Zone Waldorf',
    address: '11750 Business Park Drive',
    city: 'Waldorf',
    state: 'MD',
    zipCode: '20601',
    latitude: 38.6246,
    longitude: -76.9089,
    phone: '(301) 392-0220',
    website: 'https://www.skyzone.com/waldorf',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Charles County',
  },
  {
    name: 'Sky Zone Manassas',
    address: '7401 Stream Walk Lane',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7509,
    longitude: -77.4748,
    phone: '(703) 659-0033',
    website: 'https://www.skyzone.com/manassas',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Prince William County',
  },
  {
    name: 'Sky Zone Sterling',
    address: '21610 Ridgetop Circle',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20166',
    latitude: 39.0077,
    longitude: -77.4067,
    phone: '(703) 421-0033',
    website: 'https://www.skyzone.com/sterling',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Loudoun County',
  },
  {
    name: 'Sky Zone Fredericksburg',
    address: '4201 Plank Road',
    city: 'Fredericksburg',
    state: 'VA',
    zipCode: '22407',
    latitude: 38.2871,
    longitude: -77.5198,
    phone: '(540) 735-5867',
    website: 'https://www.skyzone.com/fredericksburg',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Spotsylvania County',
  },
];

const URBAN_AIR_LOCATIONS = [
  {
    name: 'Urban Air Adventure Park - Columbia',
    address: '8775 Centre Park Drive',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21045',
    latitude: 39.1921,
    longitude: -76.8438,
    phone: '(443) 583-1020',
    website: 'https://www.urbanair.com/maryland-columbia',
    hours: 'Mon-Thu 12pm-8pm, Fri 12pm-9pm, Sat 10am-9pm, Sun 11am-7pm',
    county: 'Howard County',
  },
  {
    name: 'Urban Air Adventure Park - Hagerstown',
    address: '17301 Valley Mall Road',
    city: 'Hagerstown',
    state: 'MD',
    zipCode: '21740',
    latitude: 39.6218,
    longitude: -77.7227,
    phone: '(240) 329-7474',
    website: 'https://www.urbanair.com/maryland-hagerstown',
    hours: 'Mon-Thu 12pm-8pm, Fri 12pm-9pm, Sat 10am-9pm, Sun 11am-7pm',
    county: 'Washington County',
  },
  {
    name: 'Urban Air Adventure Park - Gaithersburg',
    address: '620 Quince Orchard Road',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20878',
    latitude: 39.1389,
    longitude: -77.2106,
    phone: '(301) 960-4200',
    website: 'https://www.urbanair.com/maryland-gaithersburg',
    hours: 'Mon-Thu 12pm-8pm, Fri 12pm-9pm, Sat 10am-9pm, Sun 11am-7pm',
    county: 'Montgomery County',
  },
  {
    name: 'Urban Air Adventure Park - Laurel',
    address: '14400 Baltimore Avenue',
    city: 'Laurel',
    state: 'MD',
    zipCode: '20707',
    latitude: 39.1007,
    longitude: -76.8626,
    phone: '(301) 604-3700',
    website: 'https://www.urbanair.com/maryland-laurel',
    hours: 'Mon-Thu 12pm-8pm, Fri 12pm-9pm, Sat 10am-9pm, Sun 11am-7pm',
    county: 'Prince George\'s County',
  },
];

const ZAVAZONE_LOCATIONS = [
  {
    name: 'ZavaZone Rockville',
    address: '12131 Nebel Street',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0593,
    longitude: -77.1227,
    phone: '(301) 881-6600',
    website: 'https://zavazone.com/rockville',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Montgomery County',
  },
  {
    name: 'ZavaZone Sterling',
    address: '21070 Southbank Street',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20165',
    latitude: 39.0179,
    longitude: -77.4048,
    phone: '(571) 313-3410',
    website: 'https://zavazone.com/sterling',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Loudoun County',
  },
  {
    name: 'ZavaZone Manassas',
    address: '10940 Balls Ford Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7638,
    longitude: -77.4689,
    phone: '(703) 659-2950',
    website: 'https://zavazone.com/manassas',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Prince William County',
  },
];

const ROLLY_POLLIES_LOCATIONS = [
  {
    name: 'Rolly Pollies - Severna Park',
    address: '476 Ritchie Highway Unit D',
    city: 'Severna Park',
    state: 'MD',
    zipCode: '21146',
    latitude: 39.0704,
    longitude: -76.5452,
    phone: '(410) 431-2008',
    website: 'https://www.rollypolliesmaryland.com',
    hours: 'Mon-Fri 9am-6pm, Sat 9am-3pm, Sun Closed',
    county: 'Anne Arundel County',
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Convert location data to activity document format
 */
function createActivityDocument(location, chain, type) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);

  // Determine category based on type
  let category, subcategory;
  switch (type) {
    case 'indoor-playground':
      category = 'Indoor';
      subcategory = 'Indoor Playground';
      break;
    case 'trampoline-park':
      category = 'Indoor';
      subcategory = 'Trampoline Park';
      break;
    case 'ninja-adventure':
      category = 'Indoor';
      subcategory = 'Adventure Park';
      break;
    case 'kids-gym':
      category = 'Indoor';
      subcategory = 'Kids Gym';
      break;
    default:
      category = 'Indoor';
      subcategory = 'Family Entertainment';
  }

  return {
    name: location.name,
    type: subcategory,
    category: category,
    subcategory: subcategory,
    description: getDescription(chain, type),
    geohash: geohash,
    address: location.address,
    city: location.city,
    state: location.state,
    zipCode: location.zipCode,
    phone: location.phone || '',
    website: location.website,
    hours: location.hours,
    isFree: false,
    ageRange: getAgeRange(chain),
    cost: getCost(chain),
    location: {
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      address: location.address,
      city: location.city,
      zipCode: location.zipCode,
      geohash: geohash,
    },
    metadata: {
      source: chain.toLowerCase().replace(/\s+/g, '-'),
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      chain: chain,
    },
    filters: {
      isFree: false,
      isIndoor: true,
      hasParking: true,
    },
  };
}

/**
 * Get description for venue type
 */
function getDescription(chain, type) {
  const descriptions = {
    'Hyper Kidz': 'Indoor playground featuring multi-level play structures, LED dance floors, and separate play zones for different age groups. Drop-in play, birthday parties, and special events available.',
    'Sky Zone': 'Indoor trampoline park with freestyle jump, foam zone, dodgeball courts, and SkySlam basketball. Features programs for all ages including toddler time and GLOW nights.',
    'Urban Air': 'Adventure park featuring trampolines, climbing walls, ropes course, tube playground, and battle beam. Offers drop-in play and birthday party packages.',
    'ZavaZone': 'Ninja warrior-style adventure park with trampolines, climbing walls, obstacle courses, and parkour zones. Great for active kids and teens.',
    'Rolly Pollies': 'Kids gym offering parent-child classes, open play sessions, and birthday parties. Focuses on motor skill development for ages 6 months to 8 years.',
  };
  return descriptions[chain] || 'Indoor family entertainment center with activities for all ages.';
}

/**
 * Get age range for venue type
 */
function getAgeRange(chain) {
  const ageRanges = {
    'Hyper Kidz': 'Ages 1-12',
    'Sky Zone': 'All Ages',
    'Urban Air': 'All Ages',
    'ZavaZone': 'Ages 4+',
    'Rolly Pollies': 'Ages 6mo-8yrs',
  };
  return ageRanges[chain] || 'All Ages';
}

/**
 * Get typical cost range
 */
function getCost(chain) {
  const costs = {
    'Hyper Kidz': '$12-18/child',
    'Sky Zone': '$15-30/person',
    'Urban Air': '$15-35/person',
    'ZavaZone': '$20-35/person',
    'Rolly Pollies': '$12-15/child',
  };
  return costs[chain] || 'Varies';
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
async function scrapeIndoorPlaygroundsDMV() {
  console.log(`\n🎢 INDOOR PLAYGROUNDS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Hyper Kidz
  console.log('\n🏃 Processing Hyper Kidz locations...');
  for (const location of HYPER_KIDZ_LOCATIONS) {
    const activity = createActivityDocument(location, 'Hyper Kidz', 'indoor-playground');
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  // Process Sky Zone
  console.log('\n🦘 Processing Sky Zone locations...');
  for (const location of SKY_ZONE_LOCATIONS) {
    const activity = createActivityDocument(location, 'Sky Zone', 'trampoline-park');
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  // Process Urban Air
  console.log('\n🎪 Processing Urban Air locations...');
  for (const location of URBAN_AIR_LOCATIONS) {
    const activity = createActivityDocument(location, 'Urban Air', 'trampoline-park');
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  // Process ZavaZone
  console.log('\n🥷 Processing ZavaZone locations...');
  for (const location of ZAVAZONE_LOCATIONS) {
    const activity = createActivityDocument(location, 'ZavaZone', 'ninja-adventure');
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  // Process Rolly Pollies
  console.log('\n🤸 Processing Rolly Pollies locations...');
  for (const location of ROLLY_POLLIES_LOCATIONS) {
    const activity = createActivityDocument(location, 'Rolly Pollies', 'kids-gym');
    allActivities.push(activity);
    console.log(`  ✓ ${location.name}`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ INDOOR PLAYGROUNDS DMV SCRAPER COMPLETE`);
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
      chains: ['Hyper Kidz', 'Sky Zone', 'Urban Air', 'ZavaZone', 'Rolly Pollies'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeIndoorPlaygroundsDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeIndoorPlaygroundsDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Indoor Playgrounds DMV Scraper');

  scrapeIndoorPlaygroundsDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeIndoorPlaygroundsDMV,
  scrapeIndoorPlaygroundsDMVCloudFunction,
};
