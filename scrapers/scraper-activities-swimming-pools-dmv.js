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

const SCRAPER_NAME = 'SwimmingPools-DMV';

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

  const mdPools = SWIMMING_POOLS.filter(p => p.state === 'MD');
  const vaPools = SWIMMING_POOLS.filter(p => p.state === 'VA');
  const dcPools = SWIMMING_POOLS.filter(p => p.state === 'DC');

  console.log(`\n  Maryland (${mdPools.length} pools):`);
  for (const location of mdPools) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  Virginia (${vaPools.length} pools):`);
  for (const location of vaPools) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  DC (${dcPools.length} pools):`);
  for (const location of dcPools) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
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
