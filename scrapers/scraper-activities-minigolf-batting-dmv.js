#!/usr/bin/env node

/**
 * MINI GOLF & BATTING CAGES DMV ACTIVITIES SCRAPER
 *
 * Adds mini golf courses, batting cages, and driving ranges to the
 * activities collection. Focuses on family-friendly outdoor recreation.
 *
 * Coverage:
 * - Mini golf courses
 * - Batting cages
 * - Driving ranges with family programs
 * - Combined entertainment centers
 *
 * Usage:
 *   node scraper-activities-minigolf-batting-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledMinigolfBattingDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'MinigolfBatting-DMV';

// ==========================================
// VENUE DATA - DMV Mini Golf & Batting Cages
// ==========================================

const MINIGOLF_BATTING_VENUES = [
  // MINI GOLF COURSES
  {
    name: 'Rockville Mini Golf',
    address: '1130 Rockville Pike',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0778,
    longitude: -77.1248,
    phone: '(301) 762-4670',
    website: 'https://rockvilleminigolf.com',
    hours: 'Daily 10am-10pm (seasonal)',
    county: 'Montgomery County',
    description: 'Classic 18-hole mini golf course with waterfalls and obstacles. Family-owned and operated for over 40 years.',
    cost: '$8-12/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'waterfalls', 'family-friendly', 'outdoor'],
  },
  {
    name: 'South Germantown Miniature Golf',
    address: '18041 Central Park Circle',
    city: 'Boyds',
    state: 'MD',
    zipCode: '20841',
    latitude: 39.1678,
    longitude: -77.2978,
    phone: '(301) 601-2960',
    website: 'https://www.montgomeryparks.org/facilities/miniature-golf/',
    hours: 'Daily 10am-8pm (seasonal)',
    county: 'Montgomery County',
    description: 'Montgomery Parks mini golf at South Germantown Recreation Park. Features two 18-hole courses with splash playground nearby.',
    cost: '$6-8/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '36-holes', 'splash-park', 'parks-department', 'outdoor', 'affordable'],
  },
  {
    name: 'Wheaton Miniature Golf',
    address: '11701 Orebaugh Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0518,
    longitude: -77.0578,
    phone: '(301) 622-1193',
    website: 'https://www.montgomeryparks.org/facilities/miniature-golf/',
    hours: 'Daily 10am-8pm (seasonal)',
    county: 'Montgomery County',
    description: 'Affordable county-operated mini golf near Wheaton Regional Park. Great for families with young children.',
    cost: '$6-8/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'parks-department', 'outdoor', 'affordable'],
  },
  {
    name: 'Uptown Putt',
    address: '3419 Connecticut Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20008',
    latitude: 38.9378,
    longitude: -77.0578,
    phone: '(202) 966-7888',
    website: 'https://uptownputtdc.com',
    hours: 'Mon-Thu 4pm-10pm, Fri-Sun 11am-11pm',
    county: 'District of Columbia',
    description: 'DC-themed indoor mini golf with 18 holes representing DC neighborhoods and landmarks. Climate-controlled year-round fun.',
    cost: '$12-16/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'indoor', 'dc-themed', 'year-round'],
  },
  {
    name: 'Dulles Golf Center & Sports Park',
    address: '21593 Jesse Court',
    city: 'Dulles',
    state: 'VA',
    zipCode: '20166',
    latitude: 38.9718,
    longitude: -77.4318,
    phone: '(703) 404-8800',
    website: 'https://dullesgolfcenter.com',
    hours: 'Daily 8am-10pm',
    county: 'Loudoun County',
    description: 'Sports complex with 18-hole mini golf, driving range, batting cages, and TopTracer technology. Family fun destination.',
    cost: 'Mini golf: $10-14, Batting: $2-3/token',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['mini-golf', 'driving-range', 'batting-cages', 'top-tracer', 'outdoor'],
  },
  {
    name: 'Cameron Run Regional Park',
    address: '4001 Eisenhower Avenue',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22304',
    latitude: 38.8048,
    longitude: -77.1018,
    phone: '(703) 960-0767',
    website: 'https://www.novaparks.com/parks/cameron-run-regional-park',
    hours: 'Seasonal: 10am-8pm',
    county: 'City of Alexandria',
    description: 'Regional park with mini golf, batting cages, and Great Waves Waterpark. Perfect family outing destination.',
    cost: 'Mini golf: $7-10, Batting: $2/token',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['mini-golf', 'batting-cages', 'water-park', 'regional-park', 'outdoor'],
  },
  {
    name: 'Jefferson District Golf Course Mini Golf',
    address: '7900 Lee Highway',
    city: 'Falls Church',
    state: 'VA',
    zipCode: '22042',
    latitude: 38.8718,
    longitude: -77.2118,
    phone: '(703) 573-0443',
    website: 'https://www.fairfaxcounty.gov/parks/golf/jefferson',
    hours: 'Daily 9am-dusk (seasonal)',
    county: 'Fairfax County',
    description: 'Fairfax County golf course with 18-hole mini golf. Affordable family activity adjacent to par-3 course.',
    cost: '$7-9/round',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'mini-golf',
    features: ['mini-golf', '18-holes', 'county-park', 'outdoor', 'affordable'],
  },
  {
    name: 'Woody\'s Golf Range',
    address: '11801 Leesburg Pike',
    city: 'Herndon',
    state: 'VA',
    zipCode: '20170',
    latitude: 38.9318,
    longitude: -77.3918,
    phone: '(703) 430-8337',
    website: 'https://woodysgolf.com',
    hours: 'Daily 8am-10pm',
    county: 'Fairfax County',
    description: 'Golf range with mini golf, batting cages, and driving range. Great for family golf and sports activities.',
    cost: 'Mini golf: $8-12, Batting: $2-3/token',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['mini-golf', 'driving-range', 'batting-cages', 'outdoor'],
  },

  // BATTING CAGES
  {
    name: 'Olney Manor Recreation Park Batting Cages',
    address: '16601 Georgia Avenue',
    city: 'Olney',
    state: 'MD',
    zipCode: '20832',
    latitude: 39.1378,
    longitude: -77.0678,
    phone: '(301) 570-1140',
    website: 'https://www.montgomeryparks.org/parks-and-trails/olney-manor-recreational-park/',
    hours: 'Daily 9am-9pm (seasonal)',
    county: 'Montgomery County',
    description: 'County park batting cages with multiple speed settings. Affordable option for baseball and softball practice.',
    cost: '$2/token',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'batting-cages',
    features: ['batting-cages', 'multiple-speeds', 'parks-department', 'outdoor', 'affordable'],
  },
  {
    name: 'Hadley\'s Park',
    address: '9801 Rosemont Drive',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    latitude: 39.1578,
    longitude: -77.1818,
    phone: '(301) 926-2030',
    website: 'https://www.gaithersburgmd.gov/recreation',
    hours: 'Mon-Fri 4pm-9pm, Sat-Sun 10am-9pm (seasonal)',
    county: 'Montgomery County',
    description: 'City-operated batting cages with baseball and softball options. Part of Hadley\'s Park recreation complex.',
    cost: '$2/token',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'batting-cages',
    features: ['batting-cages', 'baseball', 'softball', 'city-park', 'outdoor', 'affordable'],
  },
  {
    name: 'Go-Kart Track & Batting Cages',
    address: '6401 Pohick Bay Drive',
    city: 'Lorton',
    state: 'VA',
    zipCode: '22079',
    latitude: 38.6818,
    longitude: -77.1718,
    phone: '(703) 339-6104',
    website: 'https://www.novaparks.com/parks/pohick-bay-regional-park',
    hours: 'Seasonal hours vary',
    county: 'Fairfax County',
    description: 'Pohick Bay Regional Park batting cages and go-karts. Great family recreation along the Potomac.',
    cost: 'Batting: $2/token, Go-Karts: $8-10',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'sports-complex',
    features: ['batting-cages', 'go-karts', 'regional-park', 'outdoor'],
  },
  {
    name: 'Prince William Golf Course Batting Cages',
    address: '14631 Vint Hill Road',
    city: 'Nokesville',
    state: 'VA',
    zipCode: '20181',
    latitude: 38.7518,
    longitude: -77.5918,
    phone: '(703) 754-7111',
    website: 'https://www.pwcgov.org/government/dept/park/pages/prince-william-golf-course.aspx',
    hours: 'Daily 9am-9pm (seasonal)',
    county: 'Prince William County',
    description: 'County golf course with batting cages and driving range. Family-friendly with affordable rates.',
    cost: '$2-3/token',
    ageRange: 'Ages 5+',
    isFree: false,
    venueType: 'sports-complex',
    features: ['batting-cages', 'driving-range', 'county-park', 'outdoor', 'affordable'],
  },

  // DRIVING RANGES WITH FAMILY PROGRAMS
  {
    name: 'Falls Road Golf Course',
    address: '10800 Falls Road',
    city: 'Potomac',
    state: 'MD',
    zipCode: '20854',
    latitude: 39.0418,
    longitude: -77.1718,
    phone: '(301) 299-5156',
    website: 'https://www.montgomeryparks.org/facilities/golf-courses/falls-road-golf-course/',
    hours: 'Daily 7am-dusk',
    county: 'Montgomery County',
    description: 'County golf course with driving range and junior golf programs. Introduction to golf for kids and families.',
    cost: 'Range: $8-15/bucket, Junior lessons available',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'driving-range',
    features: ['driving-range', 'junior-golf', 'lessons', 'county-park', 'outdoor'],
  },
  {
    name: 'University of Maryland Golf Course',
    address: '3800 Golf Course Road',
    city: 'College Park',
    state: 'MD',
    zipCode: '20742',
    latitude: 38.9818,
    longitude: -76.9478,
    phone: '(301) 314-4653',
    website: 'https://www.umgolf.com',
    hours: 'Daily 7am-dusk',
    county: "Prince George's County",
    description: 'Public golf course with driving range and practice facilities. Junior golf camps and lessons available.',
    cost: 'Range: $8-14/bucket',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'driving-range',
    features: ['driving-range', 'junior-golf', 'lessons', 'camps', 'outdoor'],
  },
  {
    name: 'East Potomac Golf Links',
    address: '972 Ohio Drive SW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20024',
    latitude: 38.8718,
    longitude: -77.0278,
    phone: '(202) 554-7660',
    website: 'https://golfdc.com/east-potomac-golf-course/',
    hours: 'Daily 6am-dusk',
    county: 'District of Columbia',
    description: 'Historic DC golf course with driving range, mini golf, and foot golf. Affordable family golf in the heart of DC.',
    cost: 'Range: $10-18/bucket, Mini golf: $8-10',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['driving-range', 'mini-golf', 'foot-golf', 'historic', 'affordable', 'outdoor'],
  },
  {
    name: 'Burke Lake Golf Center',
    address: '6915 Ox Road',
    city: 'Fairfax Station',
    state: 'VA',
    zipCode: '22039',
    latitude: 38.7618,
    longitude: -77.2918,
    phone: '(703) 323-1641',
    website: 'https://www.fairfaxcounty.gov/parks/golf/burke-lake',
    hours: 'Daily 8am-10pm',
    county: 'Fairfax County',
    description: 'Golf practice facility with driving range, mini golf, and par-3 course. Junior golf programs and lessons.',
    cost: 'Range: $8-14/bucket, Mini golf: $8-10',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['driving-range', 'mini-golf', 'par-3', 'junior-golf', 'lessons', 'outdoor'],
  },

  // COMBINATION VENUES
  {
    name: 'Eisenhower Golf Course',
    address: '1576 Generals Highway',
    city: 'Crownsville',
    state: 'MD',
    zipCode: '21032',
    latitude: 39.0118,
    longitude: -76.5978,
    phone: '(410) 571-0973',
    website: 'https://www.aacounty.org/services-and-programs/golf',
    hours: 'Daily 7am-dusk',
    county: 'Anne Arundel County',
    description: 'County golf course with mini golf, driving range, and foot golf. Affordable family recreation.',
    cost: 'Range: $7-12/bucket, Mini golf: $6-8',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'sports-complex',
    features: ['driving-range', 'mini-golf', 'foot-golf', 'county-park', 'affordable', 'outdoor'],
  },
  {
    name: 'South Riding Golf Club',
    address: '43237 Golf View Drive',
    city: 'South Riding',
    state: 'VA',
    zipCode: '20152',
    latitude: 38.9218,
    longitude: -77.5118,
    phone: '(703) 327-4653',
    website: 'https://southridinggolf.com',
    hours: 'Daily 7am-dusk',
    county: 'Loudoun County',
    description: 'Golf course with driving range and junior programs. Family-friendly with golf lessons for kids.',
    cost: 'Range: $10-18/bucket',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'driving-range',
    features: ['driving-range', 'junior-golf', 'lessons', 'outdoor'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'mini-golf': { category: 'Outdoor', subcategory: 'Mini Golf' },
    'batting-cages': { category: 'Outdoor', subcategory: 'Batting Cages' },
    'driving-range': { category: 'Outdoor', subcategory: 'Driving Range' },
    'sports-complex': { category: 'Outdoor', subcategory: 'Sports Complex' },
  };
  return categories[venueType] || { category: 'Outdoor', subcategory: 'Recreation' };
}

function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);
  const { category, subcategory } = getCategory(location.venueType);

  // Check if indoor (like Uptown Putt)
  const isIndoor = location.features.includes('indoor');

  return {
    name: location.name,
    type: subcategory,
    category: isIndoor ? 'Indoor' : category,
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
      source: 'minigolf-batting-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: location.venueType,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: isIndoor,
      hasParking: true,
      hasMiniGolf: location.features.includes('mini-golf'),
      hasBattingCages: location.features.includes('batting-cages'),
      hasDrivingRange: location.features.includes('driving-range'),
      isParksDepartment: location.features.includes('parks-department') || location.features.includes('county-park') || location.features.includes('city-park'),
      isAffordable: location.features.includes('affordable'),
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

async function scrapeMinigolfBattingDMV() {
  console.log(`\n⛳ MINI GOLF & BATTING CAGES DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n⛳ Processing Mini Golf & Batting Cage Venues...');

  // Group by state
  const mdVenues = MINIGOLF_BATTING_VENUES.filter(v => v.state === 'MD');
  const vaVenues = MINIGOLF_BATTING_VENUES.filter(v => v.state === 'VA');
  const dcVenues = MINIGOLF_BATTING_VENUES.filter(v => v.state === 'DC');

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
  console.log(`✅ MINI GOLF & BATTING CAGES DMV SCRAPER COMPLETE`);
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

async function scrapeMinigolfBattingDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeMinigolfBattingDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Mini Golf & Batting Cages DMV Scraper');
  scrapeMinigolfBattingDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeMinigolfBattingDMV,
  scrapeMinigolfBattingDMVCloudFunction,
};
