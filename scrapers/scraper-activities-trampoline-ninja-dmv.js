#!/usr/bin/env node

/**
 * TRAMPOLINE & NINJA PARKS DMV ACTIVITIES SCRAPER
 *
 * Adds trampoline parks, ninja warrior gyms, and active play centers
 * to the activities collection. Focuses on venues with structured
 * programs for kids and open jump/play sessions.
 *
 * Coverage:
 * - Launch Trampoline Park
 * - AirTime Trampoline
 * - Altitude Trampoline Park
 * - Ultimate Ninjas
 * - Ninja Quest
 * - Various ninja/obstacle course gyms
 *
 * Usage:
 *   node scraper-activities-trampoline-ninja-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledTrampolineNinjaDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'TrampolineNinja-DMV';

// ==========================================
// VENUE DATA - DMV Trampoline & Ninja Parks
// ==========================================

const TRAMPOLINE_NINJA_VENUES = [
  // LAUNCH TRAMPOLINE PARK
  {
    name: 'Launch Trampoline Park Gaithersburg',
    address: '926 North Frederick Avenue',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20879',
    latitude: 39.1568,
    longitude: -77.2018,
    phone: '(301) 330-5867',
    website: 'https://launchtrampolinepark.com/gaithersburg',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Montgomery County',
    description: 'Trampoline park with wall-to-wall trampolines, foam pits, dodgeball, basketball slam, and ninja obstacles. Toddler time available.',
    cost: '$15-25/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'dodgeball', 'basketball', 'ninja-obstacles', 'toddler-time', 'birthday-parties'],
  },
  {
    name: 'Launch Trampoline Park Herndon',
    address: '198 Spring Street',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20170',
    latitude: 38.9698,
    longitude: -77.3858,
    phone: '(703) 996-9889',
    website: 'https://launchtrampolinepark.com/herndon',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Fairfax County',
    description: 'Full-service trampoline park with open jump, ninja course, foam zone, and dodgeball. Hosts kids birthday parties and events.',
    cost: '$15-25/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'ninja-obstacles', 'dodgeball', 'toddler-time', 'birthday-parties'],
  },

  // AIRTIME TRAMPOLINE
  {
    name: 'AirTime Trampoline & Game Park Waldorf',
    address: '3380 Crain Highway',
    city: 'Waldorf',
    state: 'MD',
    zipCode: '20603',
    latitude: 38.6318,
    longitude: -76.9118,
    phone: '(301) 396-3300',
    website: 'https://airtimetrampoline.com/waldorf',
    hours: 'Mon-Thu 11am-8pm, Fri-Sat 10am-10pm, Sun 11am-8pm',
    county: 'Charles County',
    description: 'Trampoline and game park with trampolines, arcade, laser maze, and climbing walls. Family fun destination with toddler hours.',
    cost: '$18-30/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'arcade', 'laser-maze', 'climbing', 'toddler-time', 'birthday-parties'],
  },

  // ALTITUDE TRAMPOLINE PARK
  {
    name: 'Altitude Trampoline Park Manassas',
    address: '8206 Sudley Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7818,
    longitude: -77.4618,
    phone: '(703) 659-9500',
    website: 'https://altitudetrampolinepark.com/manassas',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm',
    county: 'Prince William County',
    description: 'Trampoline park featuring main court, foam pit, battle beams, basketball, and kids court. Fitness classes and toddler time.',
    cost: '$15-28/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'battle-beams', 'basketball', 'kids-court', 'fitness-classes', 'birthday-parties'],
  },
  {
    name: 'Altitude Trampoline Park Frederick',
    address: '5525 Spectrum Drive',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21703',
    latitude: 39.3978,
    longitude: -77.4318,
    phone: '(301) 360-0102',
    website: 'https://altitudetrampolinepark.com/frederick',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 11am-8pm',
    county: 'Frederick County',
    description: 'High-energy trampoline park with main court, foam zone, dodgeball, and fitness programs. Toddler time and birthday packages.',
    cost: '$15-28/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'dodgeball', 'fitness-classes', 'toddler-time', 'birthday-parties'],
  },

  // ULTIMATE NINJAS / NINJA WARRIOR GYMS
  {
    name: 'Ultimate Ninjas Alexandria',
    address: '501 E Monroe Avenue',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22301',
    latitude: 38.8218,
    longitude: -77.0618,
    phone: '(703) 567-0100',
    website: 'https://ultimateninjas.com/alexandria',
    hours: 'Mon-Fri 3pm-8pm, Sat-Sun 9am-6pm',
    county: 'City of Alexandria',
    description: 'Ninja warrior training gym with American Ninja Warrior-style obstacles. Classes for kids ages 5-14, open gym sessions, and camps.',
    cost: '$20-30/class, $25/open gym',
    ageRange: 'Ages 5-14',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'climbing', 'classes', 'camps', 'open-gym', 'birthday-parties'],
  },
  {
    name: 'Ninja Quest Fitness Vienna',
    address: '160 Maple Avenue E',
    city: 'Vienna',
    state: 'VA',
    zipCode: '22180',
    latitude: 38.9018,
    longitude: -77.2558,
    phone: '(703) 659-9900',
    website: 'https://ninjaquestfitness.com',
    hours: 'Mon-Fri 3pm-9pm, Sat 9am-6pm, Sun 10am-5pm',
    county: 'Fairfax County',
    description: 'Ninja warrior training center with obstacles, rock climbing, and fitness training. Youth programs, open gym, and competitive teams.',
    cost: '$25-35/class, $20-30/open gym',
    ageRange: 'Ages 4-14',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'rock-climbing', 'fitness', 'classes', 'competitive-teams', 'open-gym', 'birthday-parties'],
  },
  {
    name: 'American Ninja Warrior Gym Rockville',
    address: '12266 Wilkins Avenue',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0618,
    longitude: -77.1178,
    phone: '(240) 800-0050',
    website: 'https://anwgym.com/rockville',
    hours: 'Mon-Fri 3pm-9pm, Sat 9am-7pm, Sun 10am-6pm',
    county: 'Montgomery County',
    description: 'Official American Ninja Warrior gym with authentic obstacles. Youth ninja classes, camps, and competitive training.',
    cost: '$25-40/class, $20-35/open gym',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'anw-official', 'classes', 'camps', 'competitive-teams', 'open-gym'],
  },

  // REBOUNDERZ
  {
    name: 'Rebounderz Sterling',
    address: '21800 Towncenter Plaza',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20164',
    latitude: 39.0118,
    longitude: -77.4078,
    phone: '(703) 997-9111',
    website: 'https://rfranchising.com/sterling',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Loudoun County',
    description: 'Indoor trampoline arena with wall-to-wall trampolines, ninja course, foam pits, and slam dunk zone. Toddler time and camps.',
    cost: '$16-28/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'ninja-course', 'foam-pits', 'basketball', 'toddler-time', 'camps', 'birthday-parties'],
  },

  // FLYING SQUIRREL
  {
    name: 'Flying Squirrel Sports Warrenton',
    address: '6345 Trading Square',
    city: 'Warrenton',
    state: 'VA',
    zipCode: '20187',
    latitude: 38.7318,
    longitude: -77.7918,
    phone: '(540) 216-2009',
    website: 'https://flyingsquirrelsports.com/warrenton',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 11am-7pm',
    county: 'Fauquier County',
    description: 'Trampoline and adventure park with trampolines, zip line, ninja course, and climbing wall. Birthday parties and toddler time.',
    cost: '$18-30/hour',
    ageRange: 'Ages 2+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'zip-line', 'ninja-course', 'climbing', 'toddler-time', 'birthday-parties'],
  },

  // BIG AIR
  {
    name: 'Big Air Trampoline Park Columbia',
    address: '6630 Marie Curie Drive',
    city: 'Elkridge',
    state: 'MD',
    zipCode: '21075',
    latitude: 39.2118,
    longitude: -76.7778,
    phone: '(410) 540-0400',
    website: 'https://bigairusa.com/columbia',
    hours: 'Mon-Thu 10am-8pm, Fri-Sat 10am-10pm, Sun 10am-8pm',
    county: 'Howard County',
    description: 'Trampoline park with 100+ connected trampolines, battle beams, ninja course, and stunt fall. Kids jump time available.',
    cost: '$18-32/hour',
    ageRange: 'Ages 3+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'battle-beams', 'ninja-course', 'stunt-fall', 'kids-time', 'birthday-parties'],
  },

  // FLIGHT TRAMPOLINE
  {
    name: 'Flight Trampoline Park Springfield',
    address: '6546-B Backlick Road',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22150',
    latitude: 38.7778,
    longitude: -77.1918,
    phone: '(703) 924-7529',
    website: 'https://flightfit.com/springfield',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-11pm, Sun 10am-9pm',
    county: 'Fairfax County',
    description: 'Trampoline park with open jump, foam pits, dodgeball, fitness classes, and ninja zone. Kids fitness programs available.',
    cost: '$15-28/hour',
    ageRange: 'Ages 3+',
    isFree: false,
    venueType: 'trampoline-park',
    features: ['trampolines', 'foam-pits', 'dodgeball', 'fitness-classes', 'ninja-zone', 'birthday-parties'],
  },

  // CLIFF HANGER ACADEMY (Ninja + Climbing)
  {
    name: 'CliffHanger Academy Kensington',
    address: '10400 Connecticut Avenue',
    city: 'Kensington',
    state: 'MD',
    zipCode: '20895',
    latitude: 39.0318,
    longitude: -77.0778,
    phone: '(301) 962-0123',
    website: 'https://cliffhangeracademy.com',
    hours: 'Mon-Fri 3pm-8pm, Sat-Sun 9am-5pm',
    county: 'Montgomery County',
    description: 'Climbing and ninja warrior gym with bouldering, rope climbing, and obstacle courses. Classes for kids ages 4-14, camps, and open gym.',
    cost: '$20-35/class, $18-25/open gym',
    ageRange: 'Ages 4-14',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'rock-climbing', 'bouldering', 'classes', 'camps', 'open-gym', 'birthday-parties'],
  },

  // SUPER FUN OBSTACLE COURSE
  {
    name: 'Super Fun Obstacle Course Rockville',
    address: '1500 E Gude Drive',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20850',
    latitude: 39.0878,
    longitude: -77.1388,
    phone: '(301) 309-0202',
    website: 'https://superfunobstaclecourse.com',
    hours: 'Mon-Fri 4pm-8pm, Sat-Sun 10am-6pm',
    county: 'Montgomery County',
    description: 'Indoor obstacle course park with ninja warrior obstacles, wipeout-style challenges, and fitness games. Classes and open play.',
    cost: '$15-25/session',
    ageRange: 'Ages 5-12',
    isFree: false,
    venueType: 'ninja-gym',
    features: ['ninja-obstacles', 'obstacle-course', 'fitness', 'classes', 'open-play', 'birthday-parties'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'trampoline-park': { category: 'Indoor', subcategory: 'Trampoline Park' },
    'ninja-gym': { category: 'Indoor', subcategory: 'Ninja Warrior Gym' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Active Play' };
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
      source: 'trampoline-ninja-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: true,
      hasParking: true,
      hasToddlerTime: location.features.includes('toddler-time') || location.features.includes('kids-time'),
      hasNinjaObstacles: location.features.includes('ninja-obstacles') || location.features.includes('ninja-course'),
      hasTrampolines: location.features.includes('trampolines'),
      hasBirthdayParties: location.features.includes('birthday-parties'),
      hasClasses: location.features.includes('classes') || location.features.includes('fitness-classes'),
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

async function scrapeTrampolineNinjaDMV() {
  console.log(`\n🦘 TRAMPOLINE & NINJA PARKS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🦘 Processing Trampoline & Ninja Parks...');

  // Group by state
  const mdVenues = TRAMPOLINE_NINJA_VENUES.filter(v => v.state === 'MD');
  const vaVenues = TRAMPOLINE_NINJA_VENUES.filter(v => v.state === 'VA');
  const dcVenues = TRAMPOLINE_NINJA_VENUES.filter(v => v.state === 'DC');

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

  if (dcVenues.length > 0) {
    console.log(`\n  DC (${dcVenues.length} venues):`);
    for (const location of dcVenues) {
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
  console.log(`✅ TRAMPOLINE & NINJA PARKS DMV SCRAPER COMPLETE`);
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

async function scrapeTrampolineNinjaDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeTrampolineNinjaDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Trampoline & Ninja Parks DMV Scraper');
  scrapeTrampolineNinjaDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeTrampolineNinjaDMV,
  scrapeTrampolineNinjaDMVCloudFunction,
};
