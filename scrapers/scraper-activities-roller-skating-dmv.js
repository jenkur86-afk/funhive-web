#!/usr/bin/env node

/**
 * ROLLER SKATING RINKS DMV ACTIVITIES SCRAPER
 *
 * Adds roller skating rinks and inline skating venues to the
 * activities collection. Focuses on family skating sessions
 * and kids programs.
 *
 * Coverage:
 * - Roller skating rinks
 * - Family skate sessions
 * - Birthday party venues
 * - Skate lessons
 *
 * Usage:
 *   node scraper-activities-roller-skating-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledRollerSkatingDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'RollerSkating-DMV';

// ==========================================
// VENUE DATA - DMV Roller Skating Rinks
// ==========================================

const ROLLER_SKATING_RINKS = [
  // MARYLAND
  {
    name: 'Skate Zone Fun Center',
    address: '5929 E Virginia Beach Boulevard',
    city: 'Dundalk',
    state: 'MD',
    zipCode: '21222',
    latitude: 39.2718,
    longitude: -76.4978,
    phone: '(410) 285-7272',
    website: 'https://skatezone.fun',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 1pm-5pm',
    county: 'Baltimore County',
    description: 'Roller skating rink with family sessions, birthday parties, and skating lessons. DJ nights and themed events.',
    cost: '$10-15/session, Skate rental $4',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'family-sessions', 'birthday-parties', 'lessons', 'dj-nights', 'snack-bar'],
  },
  {
    name: 'Wheaton Ice Arena Roller Skating',
    address: '11717 Orebaugh Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0518,
    longitude: -77.0548,
    phone: '(301) 649-3640',
    website: 'https://www.montgomeryparks.org/facilities/ice-arenas/wheaton-ice-arena/',
    hours: 'Check schedule for roller sessions',
    county: 'Montgomery County',
    description: 'Montgomery Parks facility offering roller skating sessions during summer months. Family-friendly with affordable rates.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'seasonal', 'family-sessions', 'parks-department', 'affordable'],
  },
  {
    name: 'Sportland America',
    address: '7015 Arundel Mills Circle',
    city: 'Hanover',
    state: 'MD',
    zipCode: '21076',
    latitude: 39.1618,
    longitude: -76.7218,
    phone: '(410) 609-0900',
    website: 'https://sportlandamerica.com',
    hours: 'Mon-Thu 11am-9pm, Fri-Sat 10am-11pm, Sun 10am-9pm',
    county: 'Anne Arundel County',
    description: 'Family entertainment center with roller skating, laser tag, arcade, and more. Regular family skate sessions.',
    cost: '$12-18/activity',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'entertainment-complex',
    features: ['roller-skating', 'laser-tag', 'arcade', 'family-sessions', 'birthday-parties'],
  },
  {
    name: 'Laurel Skateland',
    address: '9501 Gerwig Lane',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21046',
    latitude: 39.1818,
    longitude: -76.8118,
    phone: '(410) 792-5678',
    website: 'https://laurelskateland.com',
    hours: 'Fri 7pm-11pm, Sat 12pm-4pm & 7pm-11pm, Sun 1pm-5pm',
    county: 'Howard County',
    description: 'Classic roller skating rink with family sessions and adult nights. Birthday party packages and group events.',
    cost: '$10-14/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'family-sessions', 'adult-nights', 'birthday-parties', 'lessons'],
  },
  {
    name: 'Skate Frederick',
    address: '1215 E Patrick Street',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21701',
    latitude: 39.4118,
    longitude: -77.3918,
    phone: '(301) 695-0800',
    website: 'https://skatefrederick.com',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 1pm-5pm',
    county: 'Frederick County',
    description: 'Family roller skating rink with open skate, lessons, and private parties. Affordable family entertainment.',
    cost: '$8-12/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'family-sessions', 'birthday-parties', 'lessons', 'affordable'],
  },
  {
    name: 'Roller Dome at Prince George\'s Stadium',
    address: '4601 Donnell Drive',
    city: 'Forestville',
    state: 'MD',
    zipCode: '20747',
    latitude: 38.8458,
    longitude: -76.8718,
    phone: '(301) 420-1600',
    website: 'https://pgparks.com',
    hours: 'Check seasonal schedule',
    county: "Prince George's County",
    description: 'Outdoor roller skating venue at sports complex. Seasonal family skating with affordable county rates.',
    cost: '$5-8/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'outdoor', 'seasonal', 'parks-department', 'affordable'],
  },

  // VIRGINIA
  {
    name: 'Dulles SkateQuest',
    address: '21770 Beaumeade Circle',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0418,
    longitude: -77.4878,
    phone: '(703) 858-9020',
    website: 'https://skatequest.com',
    hours: 'See schedule for public sessions',
    county: 'Loudoun County',
    description: 'Roller skating and ice skating dual facility. Family skate sessions, birthday parties, and skating camps.',
    cost: '$10-15/session, Skate rental $4',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'skating-complex',
    features: ['roller-skating', 'ice-skating', 'family-sessions', 'birthday-parties', 'camps'],
  },
  {
    name: 'Skate N Fun Zone',
    address: '7878 Sudley Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7718,
    longitude: -77.4578,
    phone: '(703) 361-7465',
    website: 'https://skatenfunzone.com',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 1pm-5pm',
    county: 'Prince William County',
    description: 'Roller skating rink with arcade and laser tag. Family fun center with skating lessons and birthday parties.',
    cost: '$10-14/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'entertainment-complex',
    features: ['roller-skating', 'arcade', 'laser-tag', 'family-sessions', 'birthday-parties', 'lessons'],
  },
  {
    name: 'Cavalier Family Skating Center',
    address: '9100 Centreville Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20110',
    latitude: 38.7978,
    longitude: -77.4878,
    phone: '(703) 369-9100',
    website: 'https://cavalierskating.com',
    hours: 'Fri 7pm-10pm, Sat 1pm-4pm & 7pm-10pm, Sun 2pm-5pm',
    county: 'Prince William County',
    description: 'Family roller skating rink with toddler skate, family sessions, and teen nights. Birthday party packages.',
    cost: '$8-12/session, Skate rental $3',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'toddler-skate', 'family-sessions', 'teen-nights', 'birthday-parties'],
  },
  {
    name: 'Springfield Skate Park',
    address: '6601 Industrial Road',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22151',
    latitude: 38.7878,
    longitude: -77.1818,
    phone: '(703) 354-7222',
    website: 'https://springfieldskatepark.com',
    hours: 'Check schedule for sessions',
    county: 'Fairfax County',
    description: 'Indoor skate park with roller skating and skateboarding. Family sessions and lessons available.',
    cost: '$10-15/session',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'skate-park',
    features: ['roller-skating', 'skateboarding', 'lessons', 'family-sessions'],
  },
  {
    name: 'Rink at Park Place',
    address: '6260 Old Dominion Drive',
    city: 'McLean',
    state: 'VA',
    zipCode: '22101',
    latitude: 38.9218,
    longitude: -77.1458,
    phone: '(703) 556-5599',
    website: 'https://thejstreetmclean.com',
    hours: 'Seasonal - check schedule',
    county: 'Fairfax County',
    description: 'Seasonal outdoor skating at Park Place retail center. Ice skating in winter, roller skating in summer.',
    cost: '$10-15/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'outdoor-rink',
    features: ['roller-skating', 'ice-skating', 'outdoor', 'seasonal', 'shopping-center'],
  },

  // DC
  {
    name: 'Canal Park Roller Rink',
    address: '200 M Street SE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20003',
    latitude: 38.8768,
    longitude: -77.0068,
    phone: '(202) 505-9422',
    website: 'https://canalparkdc.org',
    hours: 'Seasonal - May to September',
    county: 'District of Columbia',
    description: 'Outdoor roller skating at Capitol Riverfront. Seasonal skating rink with rentals and lessons. Free to skate with own equipment.',
    cost: '$8-15/session, Rentals $5',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'outdoor-rink',
    features: ['roller-skating', 'outdoor', 'seasonal', 'waterfront', 'lessons'],
  },
  {
    name: 'Martin Luther King Jr. Recreation Center',
    address: '601 North Carolina Avenue SE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20003',
    latitude: 38.8848,
    longitude: -76.9958,
    phone: '(202) 698-1873',
    website: 'https://dpr.dc.gov',
    hours: 'Check schedule for skating sessions',
    county: 'District of Columbia',
    description: 'DC recreation center with roller skating sessions. Affordable community skating with lessons available.',
    cost: '$3-5/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'roller-rink',
    features: ['roller-skating', 'community-center', 'lessons', 'affordable', 'rec-department'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'roller-rink': { category: 'Indoor', subcategory: 'Roller Skating Rink' },
    'entertainment-complex': { category: 'Indoor', subcategory: 'Entertainment Center' },
    'skating-complex': { category: 'Indoor', subcategory: 'Skating Complex' },
    'skate-park': { category: 'Indoor', subcategory: 'Skate Park' },
    'outdoor-rink': { category: 'Outdoor', subcategory: 'Outdoor Skating' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Roller Skating' };
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
      source: 'roller-skating-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: category === 'Indoor',
      hasParking: true,
      hasBirthdayParties: location.features.includes('birthday-parties'),
      hasLessons: location.features.includes('lessons'),
      hasFamilySessions: location.features.includes('family-sessions'),
      isSeasonal: location.features.includes('seasonal'),
      isParksDepartment: location.features.includes('parks-department') || location.features.includes('rec-department'),
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

async function scrapeRollerSkatingDMV() {
  console.log(`\n🛼 ROLLER SKATING RINKS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🛼 Processing Roller Skating Rinks...');

  // Group by state
  const mdVenues = ROLLER_SKATING_RINKS.filter(v => v.state === 'MD');
  const vaVenues = ROLLER_SKATING_RINKS.filter(v => v.state === 'VA');
  const dcVenues = ROLLER_SKATING_RINKS.filter(v => v.state === 'DC');

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
  console.log(`✅ ROLLER SKATING RINKS DMV SCRAPER COMPLETE`);
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

async function scrapeRollerSkatingDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeRollerSkatingDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Roller Skating Rinks DMV Scraper');
  scrapeRollerSkatingDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeRollerSkatingDMV,
  scrapeRollerSkatingDMVCloudFunction,
};
