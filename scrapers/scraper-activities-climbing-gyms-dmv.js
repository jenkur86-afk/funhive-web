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

const SCRAPER_NAME = 'ClimbingGyms-DMV';

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

async function scrapeClimbingGymsDMV() {
  console.log(`\n🧗 CLIMBING GYMS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🧗 Processing Climbing Gyms...');

  const mdGyms = CLIMBING_GYMS.filter(g => g.state === 'MD');
  const vaGyms = CLIMBING_GYMS.filter(g => g.state === 'VA');
  const dcGyms = CLIMBING_GYMS.filter(g => g.state === 'DC');

  console.log(`\n  Maryland (${mdGyms.length} gyms):`);
  for (const location of mdGyms) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  Virginia (${vaGyms.length} gyms):`);
  for (const location of vaGyms) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  DC (${dcGyms.length} gyms):`);
  for (const location of dcGyms) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);
  console.log('\n💾 Saving to Firestore...');

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
