#!/usr/bin/env node

/**
 * BOWLING ALLEYS DMV ACTIVITIES SCRAPER
 *
 * Adds family-friendly bowling alleys to the activities collection.
 * These venues offer bumper bowling, cosmic bowling, and family programs.
 *
 * Coverage:
 * - Bowlero locations (multiple)
 * - Bowl America locations (multiple)
 * - AMF locations
 * - Independent bowling centers
 *
 * Usage:
 *   node scraper-activities-bowling-alleys-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledBowlingAlleysDMV
 * Schedule: Weekly (activities don't change often)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'BowlingAlleys-DMV';

// ==========================================
// VENUE DATA - DMV Bowling Alleys
// ==========================================

const BOWLING_ALLEYS = [
  // BOWLERO LOCATIONS
  {
    name: 'Bowlero Centreville',
    address: '13814 Lee Highway',
    city: 'Centreville',
    state: 'VA',
    zipCode: '20120',
    latitude: 38.8432,
    longitude: -77.4287,
    phone: '(703) 830-1600',
    website: 'https://www.bowlero.com/location/bowlero-centreville',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Fairfax County',
    description: 'Modern bowling center with 40 lanes, arcade, laser tag, and full bar. Features bumper bowling for kids, cosmic bowling nights, and party packages.',
    cost: '$5-8/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'laser-tag', 'bar'],
  },
  {
    name: 'Bowlero Tysons',
    address: '8521 Leesburg Pike',
    city: 'Vienna',
    state: 'VA',
    zipCode: '22182',
    latitude: 38.9178,
    longitude: -77.2298,
    phone: '(703) 893-8802',
    website: 'https://www.bowlero.com/location/bowlero-tysons',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Fairfax County',
    description: 'Upscale bowling entertainment venue with state-of-the-art lanes, arcade games, and sports bar. Perfect for family outings and birthday parties.',
    cost: '$6-9/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'bar'],
  },
  {
    name: 'Bowlero Waldorf',
    address: '3270 Crain Highway',
    city: 'Waldorf',
    state: 'MD',
    zipCode: '20603',
    latitude: 38.6378,
    longitude: -76.8989,
    phone: '(301) 645-4444',
    website: 'https://www.bowlero.com/location/bowlero-waldorf',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Charles County',
    description: 'Family entertainment center with 40 lanes, arcade, and cosmic bowling. Offers bumper bowling for kids and VIP party rooms.',
    cost: '$5-8/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'party-rooms'],
  },
  {
    name: 'Bowlero Columbia',
    address: '10300 Little Patuxent Parkway',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21044',
    latitude: 39.2151,
    longitude: -76.8527,
    phone: '(410) 730-3200',
    website: 'https://www.bowlero.com/location/bowlero-columbia',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 10am-11pm',
    county: 'Howard County',
    description: 'Modern bowling and entertainment venue at Columbia Mall area. Features 48 lanes, arcade, and event spaces for parties.',
    cost: '$5-9/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'bar'],
  },

  // BOWL AMERICA LOCATIONS
  {
    name: 'Bowl America Gaithersburg',
    address: '1101 Clopper Road',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20878',
    latitude: 39.1389,
    longitude: -77.2167,
    phone: '(301) 948-8800',
    website: 'https://www.bowl-america.com/gaithersburg',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Montgomery County',
    description: 'Classic family bowling center with 32 lanes. Features bumper bowling, birthday parties, leagues, and Kids Bowl Free program.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'kids-bowl-free', 'leagues', 'snack-bar'],
  },
  {
    name: 'Bowl America Woodlawn',
    address: '6410 Security Boulevard',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21207',
    latitude: 39.3237,
    longitude: -76.7478,
    phone: '(410) 298-9720',
    website: 'https://www.bowl-america.com/woodlawn',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Baltimore County',
    description: 'Community bowling center with 40 lanes serving Baltimore area families. Offers bumper bowling, cosmic bowling, and party packages.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'kids-bowl-free', 'snack-bar'],
  },
  {
    name: 'Bowl America Falls Church',
    address: '140 S Maple Avenue',
    city: 'Falls Church',
    state: 'VA',
    zipCode: '22046',
    latitude: 38.8818,
    longitude: -77.1698,
    phone: '(703) 533-5500',
    website: 'https://www.bowl-america.com/fallschurch',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Falls Church City',
    description: 'Long-established bowling center in Falls Church. Family-friendly with bumper bowling, arcade games, and birthday party packages.',
    cost: '$4-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'arcade', 'kids-bowl-free', 'snack-bar'],
  },
  {
    name: 'Bowl America Bull Run',
    address: '13710 Marblestone Drive',
    city: 'Gainesville',
    state: 'VA',
    zipCode: '20155',
    latitude: 38.8098,
    longitude: -77.6078,
    phone: '(703) 753-8000',
    website: 'https://www.bowl-america.com/bullrun',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Prince William County',
    description: 'Modern family bowling center with 40 lanes. Features bumper bowling, Kids Bowl Free program, and cosmic bowling nights.',
    cost: '$4-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'kids-bowl-free', 'snack-bar'],
  },
  {
    name: 'Bowl America Shirley',
    address: '6450 Edsall Road',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22312',
    latitude: 38.8089,
    longitude: -77.1378,
    phone: '(703) 354-3300',
    website: 'https://www.bowl-america.com/shirley',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Fairfax County',
    description: 'Family bowling center serving Alexandria and Springfield area. Bumper bowling available for kids, party rooms for birthdays.',
    cost: '$4-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'party-rooms', 'kids-bowl-free', 'snack-bar'],
  },

  // AMF LOCATIONS
  {
    name: 'AMF College Park Lanes',
    address: '9021 Baltimore Avenue',
    city: 'College Park',
    state: 'MD',
    zipCode: '20740',
    latitude: 38.9897,
    longitude: -76.9378,
    phone: '(301) 474-8282',
    website: 'https://www.amf.com/location/amf-college-park-lanes',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-10pm',
    county: 'Prince George\'s County',
    description: 'Classic bowling center near University of Maryland. Features bumper bowling for kids and cosmic bowling nights.',
    cost: '$5-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'arcade', 'snack-bar'],
  },
  {
    name: 'AMF Annandale Lanes',
    address: '4245 Markham Street',
    city: 'Annandale',
    state: 'VA',
    zipCode: '22003',
    latitude: 38.8298,
    longitude: -77.1987,
    phone: '(703) 256-2211',
    website: 'https://www.amf.com/location/amf-annandale-lanes',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-10pm',
    county: 'Fairfax County',
    description: 'Community bowling center serving Annandale area. Family-friendly with bumper bowling, birthday parties, and leagues.',
    cost: '$5-7/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'],
  },

  // INDEPENDENT / OTHER BOWLING CENTERS
  {
    name: 'Pinstripes Georgetown',
    address: '1064 Wisconsin Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20007',
    latitude: 38.9048,
    longitude: -77.0632,
    phone: '(202) 706-5630',
    website: 'https://pinstripes.com/location/washington-dc',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-12am, Sun 10am-10pm',
    county: 'District of Columbia',
    description: 'Upscale bowling bistro in Georgetown with Italian-American cuisine. Features boutique bowling lanes, bocce courts, and elegant event spaces.',
    cost: '$8-12/game',
    ageRange: 'All Ages',
    features: ['boutique-bowling', 'bocce', 'restaurant', 'bar'],
  },
  {
    name: 'Splitsville Luxury Lanes',
    address: '1500 South Joyce Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22202',
    latitude: 38.8618,
    longitude: -77.0632,
    phone: '(571) 358-2900',
    website: 'https://www.splitsvillelanes.com/pentagon-city',
    hours: 'Mon-Thu 11am-11pm, Fri-Sat 11am-1am, Sun 11am-10pm',
    county: 'Arlington County',
    description: 'Upscale bowling experience at Pentagon City with retro lanes, craft cocktails, and elevated food. Family-friendly during day hours.',
    cost: '$8-12/game',
    ageRange: 'All Ages',
    features: ['boutique-bowling', 'restaurant', 'bar', 'retro-style'],
  },
  {
    name: 'White Oak Lanes',
    address: '11207 New Hampshire Avenue',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20904',
    latitude: 39.0498,
    longitude: -76.9897,
    phone: '(301) 593-3000',
    website: 'https://www.whiteoaklanes.com',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-1am, Sun 9am-10pm',
    county: 'Montgomery County',
    description: 'Classic family bowling center with 48 lanes serving Silver Spring area. Features bumper bowling, cosmic bowling, and party facilities.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'cosmic-bowling', 'snack-bar', 'arcade'],
  },
  {
    name: 'Laurel Lanes',
    address: '15013 Baltimore Avenue',
    city: 'Laurel',
    state: 'MD',
    zipCode: '20707',
    latitude: 39.1007,
    longitude: -76.8626,
    phone: '(301) 725-1200',
    website: 'https://laurellanes.com',
    hours: 'Mon-Thu 9am-11pm, Fri-Sat 9am-12am, Sun 9am-10pm',
    county: 'Prince George\'s County',
    description: 'Family-owned bowling center with 32 lanes. Offers bumper bowling, birthday parties, and league bowling for all ages.',
    cost: '$4-6/game',
    ageRange: 'All Ages',
    features: ['bumper-bowling', 'leagues', 'party-rooms', 'snack-bar'],
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
    type: 'Bowling Alley',
    category: 'Indoor',
    subcategory: 'Bowling',
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
    amenities: location.features,
    metadata: {
      source: 'bowling-alleys-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'bowling',
    },
    filters: {
      isFree: false,
      isIndoor: true,
      hasParking: true,
      hasBumperBowling: location.features.includes('bumper-bowling'),
      hasCosmicBowling: location.features.includes('cosmic-bowling'),
      hasArcade: location.features.includes('arcade'),
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

/**
 * Main scraper function
 */
async function scrapeBowlingAlleysDMV() {
  console.log(`\n🎳 BOWLING ALLEYS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Bowling Alleys
  console.log('\n🎳 Processing Bowling Alleys...');

  // Group by state for organized output
  const mdAlleys = BOWLING_ALLEYS.filter(a => a.state === 'MD');
  const vaAlleys = BOWLING_ALLEYS.filter(a => a.state === 'VA');
  const dcAlleys = BOWLING_ALLEYS.filter(a => a.state === 'DC');

  console.log(`\n  Maryland (${mdAlleys.length} alleys):`);
  for (const location of mdAlleys) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  Virginia (${vaAlleys.length} alleys):`);
  for (const location of vaAlleys) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  DC (${dcAlleys.length} alleys):`);
  for (const location of dcAlleys) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);

  // Save to Firestore
  console.log('\n💾 Saving to Firestore...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ BOWLING ALLEYS DMV SCRAPER COMPLETE`);
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
      states: ['MD', 'VA', 'DC'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeBowlingAlleysDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeBowlingAlleysDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Bowling Alleys DMV Scraper');

  scrapeBowlingAlleysDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeBowlingAlleysDMV,
  scrapeBowlingAlleysDMVCloudFunction,
};
