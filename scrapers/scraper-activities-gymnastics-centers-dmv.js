#!/usr/bin/env node

/**
 * GYMNASTICS CENTERS DMV ACTIVITIES SCRAPER
 *
 * Adds gymnastics centers with open gym sessions to the activities collection.
 * These venues offer structured classes plus drop-in open gym times.
 *
 * Coverage:
 * - Hill's Gymnastics (Gaithersburg)
 * - Dominique Dawes Gymnastics Academy (Clarksburg)
 * - Columbia Gymnastics (Columbia)
 * - Frederick Gymnastics (Frederick)
 * - Silver Stars Gymnastics (Silver Spring, Bowie)
 * - Rebounders Gymnastics (Manassas)
 * - Capital Gymnastics (Burke, Chantilly, Woodbridge)
 * - ASI Gymnastics (Gaithersburg)
 *
 * Usage:
 *   node scraper-activities-gymnastics-centers-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledGymnasticsCentersDMV
 * Schedule: Weekly (activities don't change often)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'GymnasticsCenters-DMV';

// ==========================================
// VENUE DATA - DMV Gymnastics Centers
// ==========================================

const GYMNASTICS_CENTERS = [
  // MARYLAND
  {
    name: 'Hill\'s Gymnastics',
    address: '18909 Earhart Court',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20879',
    latitude: 39.1542,
    longitude: -77.2197,
    phone: '(301) 840-5900',
    website: 'https://www.hillsgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm',
    county: 'Montgomery County',
    description: 'Premier gymnastics facility offering recreational and competitive programs. Features open gym sessions, birthday parties, camps, and classes for all ages and skill levels.',
    cost: '$15-20/session',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun (check schedule)',
  },
  {
    name: 'Dominique Dawes Gymnastics Academy',
    address: '13001 Clarksburg Square Road Suite 100',
    city: 'Clarksburg',
    state: 'MD',
    zipCode: '20871',
    latitude: 39.2368,
    longitude: -77.2789,
    phone: '(240) 364-4334',
    website: 'https://www.ddgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Montgomery County',
    description: 'Olympic gymnast Dominique Dawes\' gymnastics academy offering recreational and competitive programs. State-of-the-art facility with spring floors and foam pits.',
    cost: '$18-25/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Select weekends',
  },
  {
    name: 'Columbia Gymnastics',
    address: '9050 Red Branch Road',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21045',
    latitude: 39.2018,
    longitude: -76.8412,
    phone: '(410) 381-1894',
    website: 'https://www.columbiagy.com',
    hours: 'Mon-Thu 9am-8pm, Fri 9am-7pm, Sat 9am-4pm',
    county: 'Howard County',
    description: 'Family-owned gymnastics center offering classes, camps, and birthday parties. Features preschool programs, recreational classes, and competitive teams.',
    cost: '$15-22/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri evenings, Sun afternoons',
  },
  {
    name: 'Frederick Gymnastics Club',
    address: '7800 Reichs Ford Road',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21704',
    latitude: 39.4015,
    longitude: -77.4089,
    phone: '(301) 662-7700',
    website: 'https://www.frederickgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-4pm',
    county: 'Frederick County',
    description: 'Established gymnastics club with recreational and competitive programs. Features 20,000+ sq ft facility with spring floors, bars, beams, and trampolines.',
    cost: '$16-24/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat mornings',
  },
  {
    name: 'Silver Stars Gymnastics - Silver Spring',
    address: '8505 Fenton Street',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9959,
    longitude: -77.0254,
    phone: '(301) 589-6800',
    website: 'https://www.silverstarsgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Montgomery County',
    description: 'Gymnastics center offering parent-tot, preschool, and recreational classes. Features open gym sessions, camps, and birthday parties.',
    cost: '$15-20/class',
    ageRange: 'Ages 6mo-12yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun',
  },
  {
    name: 'Silver Stars Gymnastics - Bowie',
    address: '4220 Lafayette Center Drive Suite C',
    city: 'Bowie',
    state: 'MD',
    zipCode: '20715',
    latitude: 38.9607,
    longitude: -76.7312,
    phone: '(301) 805-5500',
    website: 'https://www.silverstarsgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Prince George\'s County',
    description: 'Second location of Silver Stars Gymnastics serving Prince George\'s County. Full gymnastics programming for toddlers through teens.',
    cost: '$15-20/class',
    ageRange: 'Ages 6mo-12yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun',
  },
  {
    name: 'ASI Gymnastics Gaithersburg',
    address: '9411 Gaither Road',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    latitude: 39.1318,
    longitude: -77.2147,
    phone: '(301) 948-0880',
    website: 'https://www.asigymnastics.com/gaithersburg',
    hours: 'Mon-Thu 9am-8pm, Fri 9am-7pm, Sat 9am-4pm',
    county: 'Montgomery County',
    description: 'Part of national ASI Gymnastics chain. Offers recreational and competitive gymnastics with open gym, camps, and birthday parties.',
    cost: '$18-25/class',
    ageRange: 'Ages 4mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Weekly open gym sessions',
  },
  {
    name: 'Harford Gymnastics Club',
    address: '1000 Beards Hill Road',
    city: 'Aberdeen',
    state: 'MD',
    zipCode: '21001',
    latitude: 39.5095,
    longitude: -76.1753,
    phone: '(410) 272-0014',
    website: 'https://www.harfordgymnasticsclub.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-2pm',
    county: 'Harford County',
    description: 'Community gymnastics center serving Harford County. Offers preschool through competitive programs, open gym, and camps.',
    cost: '$14-18/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat mornings',
  },

  // VIRGINIA
  {
    name: 'Capital Gymnastics - Burke',
    address: '6055 Burke Centre Parkway',
    city: 'Burke',
    state: 'VA',
    zipCode: '22015',
    latitude: 38.7918,
    longitude: -77.2826,
    phone: '(703) 250-8000',
    website: 'https://www.cgnc.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm',
    county: 'Fairfax County',
    description: 'Largest gymnastics center in Northern Virginia with 45,000 sq ft facility. Features Ninja Zone, open gym, camps, and competitive teams.',
    cost: '$18-28/class',
    ageRange: 'Ages 6mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri-Sun',
  },
  {
    name: 'Capital Gymnastics - Chantilly',
    address: '4240 Pleasant Valley Road',
    city: 'Chantilly',
    state: 'VA',
    zipCode: '20151',
    latitude: 38.8738,
    longitude: -77.4318,
    phone: '(703) 222-1100',
    website: 'https://www.cgnc.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm',
    county: 'Fairfax County',
    description: 'Capital Gymnastics Chantilly location serving western Fairfax County. Full gymnastics programming with Ninja Zone and open gym.',
    cost: '$18-28/class',
    ageRange: 'Ages 6mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri-Sun',
  },
  {
    name: 'Rebounders Gymnastics',
    address: '10890 Nokesville Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20110',
    latitude: 38.7298,
    longitude: -77.4512,
    phone: '(703) 331-1050',
    website: 'https://www.reboundersgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Prince William County',
    description: 'Family-owned gymnastics center with recreational and competitive programs. Features trampolines, foam pit, and tumble track.',
    cost: '$16-22/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Weekly open gym',
  },
  {
    name: 'Paragon Gymnastics',
    address: '10417 Portsmouth Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7589,
    longitude: -77.4267,
    phone: '(703) 393-7100',
    website: 'https://www.paragongymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-4pm',
    county: 'Prince William County',
    description: 'Gymnastics training center with recreational classes, competitive teams, and Ninja training. Open gym and birthday parties available.',
    cost: '$17-24/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun',
  },
  {
    name: 'Arlington Gymnastics Club',
    address: '3209 N Pershing Drive',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22201',
    latitude: 38.8842,
    longitude: -77.0998,
    phone: '(703) 522-5550',
    website: 'https://www.arlingtongymnasticsclub.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Arlington County',
    description: 'Community gymnastics center serving Arlington. Offers parent-child classes, recreational gymnastics, and competitive teams.',
    cost: '$18-25/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Weekends',
  },
  {
    name: 'Loudoun Gymnastics Center',
    address: '44675 Cape Court Suite 130',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0318,
    longitude: -77.4901,
    phone: '(571) 321-8888',
    website: 'https://www.loudoungymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-4pm',
    county: 'Loudoun County',
    description: 'Premier Loudoun County gymnastics facility with 25,000 sq ft of training space. Features recreational and competitive programs.',
    cost: '$18-26/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri-Sun',
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
    type: 'Gymnastics Center',
    category: 'Indoor',
    subcategory: 'Gymnastics',
    description: location.description,
    geohash: geohash,
    state: location.state,
    phone: location.phone || '',
    website: location.website,
    hours: location.hours,
    isFree: false,
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
    features: {
      hasOpenGym: location.hasOpenGym,
      openGymHours: location.openGymHours,
      hasBirthdayParties: true,
      hasCamps: true,
    },
    metadata: {
      source: 'gymnastics-centers-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'gymnastics',
    },
    filters: {
      isFree: false,
      isIndoor: true,
      hasParking: true,
      hasOpenGym: location.hasOpenGym,
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
async function scrapeGymnasticsCentersDMV() {
  console.log(`\n🤸 GYMNASTICS CENTERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Gymnastics Centers
  console.log('\n🏅 Processing Gymnastics Centers...');

  // Group by state for organized output
  const mdCenters = GYMNASTICS_CENTERS.filter(c => c.state === 'MD');
  const vaCenters = GYMNASTICS_CENTERS.filter(c => c.state === 'VA');

  console.log(`\n  Maryland (${mdCenters.length} centers):`);
  for (const location of mdCenters) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  Virginia (${vaCenters.length} centers):`);
  for (const location of vaCenters) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ GYMNASTICS CENTERS DMV SCRAPER COMPLETE`);
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
      states: ['MD', 'VA'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeGymnasticsCentersDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeGymnasticsCentersDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Gymnastics Centers DMV Scraper');

  scrapeGymnasticsCentersDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeGymnasticsCentersDMV,
  scrapeGymnasticsCentersDMVCloudFunction,
};
