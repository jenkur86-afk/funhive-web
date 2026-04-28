#!/usr/bin/env node

/**
 * SCIENCE & DISCOVERY CENTERS DMV ACTIVITIES SCRAPER
 *
 * Adds science museums, discovery centers, and STEM learning venues
 * to the activities collection. Focuses on hands-on educational
 * experiences for kids and families.
 *
 * Coverage:
 * - Science Museums
 * - Discovery Centers
 * - Planetariums
 * - STEM Education Centers
 * - Smithsonian Museums
 *
 * Usage:
 *   node scraper-activities-science-discovery-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledScienceDiscoveryDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'ScienceDiscovery-DMV';

// ==========================================
// VENUE DATA - DMV Science & Discovery Centers
// ==========================================

const SCIENCE_DISCOVERY_CENTERS = [
  // MARYLAND SCIENCE CENTER & MUSEUMS
  {
    name: 'Maryland Science Center',
    address: '601 Light Street',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21230',
    latitude: 39.2818,
    longitude: -76.6118,
    phone: '(410) 685-2370',
    website: 'https://www.mdsci.org',
    hours: 'Tue-Sun 10am-5pm',
    county: 'Baltimore City',
    description: 'Interactive science museum with hands-on exhibits, planetarium, and IMAX theater. KidsRoom for ages 0-8 with sensory play.',
    cost: '$20-28/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'science-museum',
    features: ['interactive-exhibits', 'planetarium', 'imax', 'kids-room', 'sensory-play', 'stem'],
  },
  {
    name: 'National Children\'s Museum',
    address: '1300 Pennsylvania Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20004',
    latitude: 38.8948,
    longitude: -77.0288,
    phone: '(202) 844-2486',
    website: 'https://nationalchildrensmuseum.org',
    hours: 'Tue-Sun 9:30am-4:30pm',
    county: 'District of Columbia',
    description: 'STEM-focused children\'s museum with Dream Machine, exhibits on engineering, and play areas. Perfect for ages 0-12.',
    cost: '$16-20/person',
    ageRange: 'Ages 0-12',
    isFree: false,
    venueType: 'childrens-museum',
    features: ['interactive-exhibits', 'stem', 'play-areas', 'engineering', 'toddler-area'],
  },
  {
    name: 'Port Discovery Children\'s Museum',
    address: '35 Market Place',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21202',
    latitude: 39.2898,
    longitude: -76.6058,
    phone: '(410) 727-8120',
    website: 'https://www.portdiscovery.org',
    hours: 'Tue-Sat 10am-5pm, Sun 12pm-5pm',
    county: 'Baltimore City',
    description: 'Award-winning children\'s museum with three floors of interactive exhibits. Adventure Expeditions climbing structure and Tot Trails for babies.',
    cost: '$18-22/person',
    ageRange: 'Ages 0-10',
    isFree: false,
    venueType: 'childrens-museum',
    features: ['interactive-exhibits', 'climbing', 'tot-area', 'stem', 'play-areas'],
  },

  // SMITHSONIAN MUSEUMS (Free)
  {
    name: 'National Air and Space Museum',
    address: '655 Jefferson Drive SW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20560',
    latitude: 38.8881,
    longitude: -77.0199,
    phone: '(202) 633-2214',
    website: 'https://airandspace.si.edu',
    hours: 'Daily 10am-5:30pm',
    county: 'District of Columbia',
    description: 'Iconic Smithsonian museum with historic aircraft, spacecraft, and flight simulators. Free admission with timed entry passes.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['aircraft', 'spacecraft', 'simulators', 'imax', 'free', 'smithsonian'],
  },
  {
    name: 'Steven F. Udvar-Hazy Center',
    address: '14390 Air and Space Museum Parkway',
    city: 'Chantilly',
    state: 'VA',
    zipCode: '20151',
    latitude: 38.9114,
    longitude: -77.4438,
    phone: '(703) 572-4118',
    website: 'https://airandspace.si.edu/udvar-hazy-center',
    hours: 'Daily 10am-5:30pm',
    county: 'Fairfax County',
    description: 'Smithsonian Air and Space annex with Space Shuttle Discovery, SR-71 Blackbird, and thousands of artifacts. Free admission.',
    cost: 'Free (parking $15)',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['aircraft', 'spacecraft', 'space-shuttle', 'observation-tower', 'free', 'smithsonian'],
  },
  {
    name: 'National Museum of Natural History',
    address: '10th Street & Constitution Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20560',
    latitude: 38.8913,
    longitude: -77.0261,
    phone: '(202) 633-1000',
    website: 'https://naturalhistory.si.edu',
    hours: 'Daily 10am-5:30pm',
    county: 'District of Columbia',
    description: 'Smithsonian museum with dinosaurs, Hope Diamond, and Q?rius science education center. Free admission with family programs.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['dinosaurs', 'gems', 'interactive-exhibits', 'butterfly-pavilion', 'free', 'smithsonian'],
  },
  {
    name: 'National Museum of American History',
    address: '1300 Constitution Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20560',
    latitude: 38.8912,
    longitude: -77.0299,
    phone: '(202) 633-1000',
    website: 'https://americanhistory.si.edu',
    hours: 'Daily 10am-5:30pm',
    county: 'District of Columbia',
    description: 'Smithsonian museum with Spark!Lab invention center for kids. Free hands-on activities and historic treasures.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'museum',
    features: ['spark-lab', 'interactive-exhibits', 'invention', 'free', 'smithsonian'],
  },

  // PLANETARIUMS
  {
    name: 'Howard B. Owens Science Center',
    address: '9601 Greenbelt Road',
    city: 'Lanham',
    state: 'MD',
    zipCode: '20706',
    latitude: 38.9848,
    longitude: -76.8578,
    phone: '(301) 918-8750',
    website: 'https://www.pgcps.org/owenssciencecenter',
    hours: 'By appointment and public shows',
    county: "Prince George's County",
    description: 'Planetarium and science center with dome shows and hands-on exhibits. Public shows on weekends. School programs during week.',
    cost: '$4-6/show',
    ageRange: 'Ages 4+',
    isFree: false,
    venueType: 'planetarium',
    features: ['planetarium', 'dome-shows', 'exhibits', 'school-programs', 'affordable'],
  },
  {
    name: 'Arlington Planetarium',
    address: '1426 N Quincy Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22207',
    latitude: 38.8918,
    longitude: -77.1078,
    phone: '(703) 228-6070',
    website: 'https://arlingtonva.us/planetarium',
    hours: 'Public shows on schedule',
    county: 'Arlington County',
    description: 'Newly renovated planetarium with full-dome shows about space and astronomy. Family shows and night sky programs.',
    cost: '$3-5/show',
    ageRange: 'Ages 4+',
    isFree: false,
    venueType: 'planetarium',
    features: ['planetarium', 'dome-shows', 'astronomy', 'affordable', 'public-school'],
  },

  // DISCOVERY CENTERS & STEM EDUCATION
  {
    name: 'VisArts at Rockville',
    address: '155 Gibbs Street',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20850',
    latitude: 39.0878,
    longitude: -77.1488,
    phone: '(301) 315-8200',
    website: 'https://www.visartscenter.org',
    hours: 'Mon-Sat 10am-6pm',
    county: 'Montgomery County',
    description: 'Arts center with STEAM programs combining art and science. Maker spaces, classes, and family workshops.',
    cost: 'Classes: $25-50',
    ageRange: 'Ages 3-18',
    isFree: false,
    venueType: 'stem-center',
    features: ['steam', 'maker-space', 'classes', 'workshops', 'art-science'],
  },
  {
    name: 'Imagination Stage',
    address: '4908 Auburn Avenue',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20814',
    latitude: 38.9858,
    longitude: -77.0958,
    phone: '(301) 961-6060',
    website: 'https://imaginationstage.org',
    hours: 'By show and class schedule',
    county: 'Montgomery County',
    description: 'Theater arts education with classes in acting, music, and stagecraft. Shows and summer camps for kids.',
    cost: 'Shows: $15-30, Classes vary',
    ageRange: 'Ages 1-18',
    isFree: false,
    venueType: 'arts-education',
    features: ['theater', 'classes', 'shows', 'camps', 'performing-arts'],
  },
  {
    name: 'Children\'s Science Center Lab',
    address: '11954 Fair Oaks Mall',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22033',
    latitude: 38.8628,
    longitude: -77.3588,
    phone: '(703) 648-3130',
    website: 'https://childsci.org',
    hours: 'Tue-Sun 10am-6pm',
    county: 'Fairfax County',
    description: 'Hands-on science lab for kids with rotating exhibits and STEM activities. Great for young scientists ages 2-12.',
    cost: '$8-12/person',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'stem-center',
    features: ['interactive-exhibits', 'stem', 'hands-on', 'rotating-exhibits', 'mall-location'],
  },
  {
    name: 'Shenandoah Valley Discovery Museum',
    address: '19 West Cork Street',
    city: 'Winchester',
    state: 'VA',
    zipCode: '22601',
    latitude: 39.1858,
    longitude: -78.1658,
    phone: '(540) 722-2020',
    website: 'https://discoverymuseum.net',
    hours: 'Tue-Sat 9am-5pm, Sun 1pm-5pm',
    county: 'City of Winchester',
    description: 'Children\'s discovery museum with hands-on exhibits on science, art, and culture. Outdoor science garden.',
    cost: '$9-11/person',
    ageRange: 'Ages 1-10',
    isFree: false,
    venueType: 'childrens-museum',
    features: ['interactive-exhibits', 'science-garden', 'outdoor', 'hands-on', 'regional'],
  },

  // NASA & SPACE CENTERS
  {
    name: 'NASA Goddard Visitor Center',
    address: '8800 Greenbelt Road',
    city: 'Greenbelt',
    state: 'MD',
    zipCode: '20771',
    latitude: 38.9958,
    longitude: -76.8518,
    phone: '(301) 286-8981',
    website: 'https://www.nasa.gov/goddard/visitor-center',
    hours: 'Tue-Fri 10am-3pm, Sat-Sun 12pm-4pm',
    county: "Prince George's County",
    description: 'Free NASA visitor center with rockets, satellites, and space science exhibits. Science on a Sphere and model rockets.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['rockets', 'satellites', 'space-science', 'free', 'nasa', 'stem'],
  },

  // NATURE/SCIENCE HYBRIDS
  {
    name: 'Leesburg Animal Park',
    address: '19270 James Monroe Highway',
    city: 'Leesburg',
    state: 'VA',
    zipCode: '20175',
    latitude: 39.0418,
    longitude: -77.5418,
    phone: '(703) 433-0002',
    website: 'https://leesburganimalpark.com',
    hours: 'Daily 10am-5pm (seasonal)',
    county: 'Loudoun County',
    description: 'Animal park with exotic and farm animals. Pony rides, petting zoo, and animal education programs.',
    cost: '$12-16/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'animal-park',
    features: ['petting-zoo', 'pony-rides', 'exotic-animals', 'education', 'seasonal'],
  },
  {
    name: 'Roer\'s Zoofari',
    address: '1228 Hunter Mill Road',
    city: 'Vienna',
    state: 'VA',
    zipCode: '22182',
    latitude: 38.9018,
    longitude: -77.2858,
    phone: '(703) 757-6222',
    website: 'https://roerszoofari.com',
    hours: 'Mon-Sat 10am-5pm, Sun 11am-5pm',
    county: 'Fairfax County',
    description: 'Interactive animal experience with feeding encounters, educational programs, and birthday parties.',
    cost: '$15-20/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'animal-park',
    features: ['animal-encounters', 'feeding', 'education', 'birthday-parties'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'science-museum': { category: 'Indoor', subcategory: 'Science Museum' },
    'childrens-museum': { category: 'Indoor', subcategory: 'Children\'s Museum' },
    'museum': { category: 'Indoor', subcategory: 'Museum' },
    'planetarium': { category: 'Indoor', subcategory: 'Planetarium' },
    'stem-center': { category: 'Indoor', subcategory: 'STEM Center' },
    'arts-education': { category: 'Indoor', subcategory: 'Arts Education' },
    'animal-park': { category: 'Outdoor', subcategory: 'Animal Park' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Discovery Center' };
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
      source: 'science-discovery-dmv',
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
      hasInteractiveExhibits: location.features.includes('interactive-exhibits') || location.features.includes('hands-on'),
      hasSTEM: location.features.includes('stem') || location.features.includes('steam'),
      hasPlanetarium: location.features.includes('planetarium'),
      isSmithsonian: location.features.includes('smithsonian'),
      hasToddlerArea: location.features.includes('toddler-area') || location.features.includes('tot-area') || location.features.includes('kids-room'),
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

async function scrapeScienceDiscoveryDMV() {
  console.log(`\n🔬 SCIENCE & DISCOVERY CENTERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🔬 Processing Science & Discovery Centers...');

  // Group by state
  const mdVenues = SCIENCE_DISCOVERY_CENTERS.filter(v => v.state === 'MD');
  const vaVenues = SCIENCE_DISCOVERY_CENTERS.filter(v => v.state === 'VA');
  const dcVenues = SCIENCE_DISCOVERY_CENTERS.filter(v => v.state === 'DC');

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
  console.log('\n💾 Saving to database...');

  const { saved, updated, failed } = await saveActivities(allActivities);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCIENCE & DISCOVERY CENTERS DMV SCRAPER COMPLETE`);
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

async function scrapeScienceDiscoveryDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeScienceDiscoveryDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Science & Discovery Centers DMV Scraper');
  scrapeScienceDiscoveryDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeScienceDiscoveryDMV,
  scrapeScienceDiscoveryDMVCloudFunction,
};
