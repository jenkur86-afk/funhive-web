#!/usr/bin/env node

/**
 * ART STUDIOS & POTTERY DMV ACTIVITIES SCRAPER
 *
 * Adds paint-your-own pottery studios, art centers, and creative
 * spaces to the activities collection. Focuses on drop-in friendly
 * venues for families with kids.
 *
 * Coverage:
 * - Color Me Mine
 * - Pottery Stop
 * - All Fired Up
 * - Art Barn
 * - Paint and Create Studios
 * - Art Centers with kids programs
 *
 * Usage:
 *   node scraper-activities-art-studios-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledArtStudiosDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'ArtStudios-DMV';

// ==========================================
// VENUE DATA - DMV Art Studios & Pottery
// ==========================================

const ART_STUDIOS = [
  // COLOR ME MINE
  {
    name: 'Color Me Mine Bethesda',
    address: '4923 Elm Street',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20814',
    latitude: 38.9818,
    longitude: -77.0958,
    phone: '(301) 654-3206',
    website: 'https://bethesda.colormemine.com',
    hours: 'Mon-Sat 10am-9pm, Sun 11am-6pm',
    county: 'Montgomery County',
    description: 'Paint-your-own pottery studio with wide selection of ceramics. Walk-ins welcome. Perfect for birthday parties and family outings.',
    cost: '$8 studio fee + pottery price ($10-50)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'kids-friendly', 'family-activity'],
  },
  {
    name: 'Color Me Mine Columbia',
    address: '10300 Little Patuxent Parkway',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21044',
    latitude: 39.2148,
    longitude: -76.8628,
    phone: '(410) 730-0022',
    website: 'https://columbia.colormemine.com',
    hours: 'Mon-Sat 10am-9pm, Sun 11am-6pm',
    county: 'Howard County',
    description: 'Creative pottery painting studio in the Mall in Columbia. Great for rainy day activities and creative family time.',
    cost: '$8 studio fee + pottery price ($10-50)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'kids-friendly', 'mall-location'],
  },
  {
    name: 'Color Me Mine Fairfax',
    address: '9524 Main Street',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22031',
    latitude: 38.8498,
    longitude: -77.2898,
    phone: '(703) 218-2881',
    website: 'https://fairfax.colormemine.com',
    hours: 'Mon-Sat 10am-9pm, Sun 11am-6pm',
    county: 'Fairfax County',
    description: 'Paint-your-own pottery in Old Town Fairfax. Walk-ins welcome, great for spontaneous family fun.',
    cost: '$8 studio fee + pottery price ($10-50)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'kids-friendly', 'downtown'],
  },
  {
    name: 'Color Me Mine Springfield',
    address: '6219 Rolling Road',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22152',
    latitude: 38.7678,
    longitude: -77.1878,
    phone: '(703) 451-2255',
    website: 'https://springfield-va.colormemine.com',
    hours: 'Mon-Sat 10am-9pm, Sun 11am-6pm',
    county: 'Fairfax County',
    description: 'Family-friendly pottery studio. Perfect for drop-in creative time and birthday celebrations.',
    cost: '$8 studio fee + pottery price ($10-50)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'kids-friendly'],
  },
  {
    name: 'Color Me Mine Ashburn',
    address: '44110 Ashburn Shopping Plaza',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0378,
    longitude: -77.4818,
    phone: '(571) 291-3000',
    website: 'https://ashburn.colormemine.com',
    hours: 'Mon-Sat 10am-9pm, Sun 11am-6pm',
    county: 'Loudoun County',
    description: 'Paint-your-own pottery studio in Ashburn. Walk-in friendly with birthday party options.',
    cost: '$8 studio fee + pottery price ($10-50)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'kids-friendly'],
  },

  // ALL FIRED UP
  {
    name: 'All Fired Up Kensington',
    address: '3726 Howard Avenue',
    city: 'Kensington',
    state: 'MD',
    zipCode: '20895',
    latitude: 39.0258,
    longitude: -77.0768,
    phone: '(301) 933-3090',
    website: 'https://allfiredupkensington.com',
    hours: 'Tue-Sat 10am-6pm, Sun 12pm-5pm',
    county: 'Montgomery County',
    description: 'Local pottery painting studio in Antique Row. Intimate setting great for families. Canvas painting and mosaics also available.',
    cost: '$6 studio fee + pottery price ($8-45)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'canvas-painting', 'mosaics', 'walk-in', 'birthday-parties', 'local-business'],
  },
  {
    name: 'All Fired Up Alexandria',
    address: '1004 King Street',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22314',
    latitude: 38.8048,
    longitude: -77.0428,
    phone: '(703) 836-4644',
    website: 'https://allfiredupalexandria.com',
    hours: 'Mon-Sat 10am-8pm, Sun 11am-6pm',
    county: 'City of Alexandria',
    description: 'Old Town Alexandria pottery studio. Paint ceramics, glass fusion, and canvas. Great location near waterfront.',
    cost: '$7 studio fee + pottery price ($10-50)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'glass-fusion', 'canvas-painting', 'walk-in', 'birthday-parties', 'old-town'],
  },

  // POTTERY STOP / DO OR DYE
  {
    name: 'Do or Dye Ceramics',
    address: '8757 Georgia Avenue',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9948,
    longitude: -77.0268,
    phone: '(301) 589-3937',
    website: 'https://doordyeceramics.com',
    hours: 'Tue-Sat 11am-7pm, Sun 12pm-5pm',
    county: 'Montgomery County',
    description: 'Downtown Silver Spring pottery painting studio. Eclectic selection of ceramics for all ages.',
    cost: '$6 studio fee + pottery price ($8-40)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'downtown'],
  },

  // ART BARN
  {
    name: 'The Art Barn',
    address: '11325 Seven Locks Road',
    city: 'Potomac',
    state: 'MD',
    zipCode: '20854',
    latitude: 39.0218,
    longitude: -77.1518,
    phone: '(301) 299-8259',
    website: 'https://theartbarn.net',
    hours: 'Mon-Fri 9am-5pm, Sat 10am-4pm',
    county: 'Montgomery County',
    description: 'Art education center offering classes and camps for kids. Drawing, painting, pottery wheel, and sculpture.',
    cost: 'Classes: $25-40/session',
    ageRange: 'Ages 3-18',
    isFree: false,
    venueType: 'art-center',
    features: ['art-classes', 'pottery-wheel', 'drawing', 'painting', 'sculpture', 'camps', 'kids-focused'],
  },

  // CREATIVE CAULDRON
  {
    name: 'Creative Cauldron',
    address: '410 South Maple Avenue',
    city: 'Falls Church',
    state: 'VA',
    zipCode: '22046',
    latitude: 38.8818,
    longitude: -77.1728,
    phone: '(703) 436-9948',
    website: 'https://creativecauldron.org',
    hours: 'Varies by program',
    county: 'Fairfax County',
    description: 'Arts venue offering theater, visual arts, and music programs for kids. Classes, camps, and performances.',
    cost: 'Classes: $20-50/session',
    ageRange: 'Ages 3-18',
    isFree: false,
    venueType: 'arts-center',
    features: ['theater', 'visual-arts', 'music', 'classes', 'camps', 'performances', 'kids-focused'],
  },

  // KILN & CO
  {
    name: 'Kiln & Co.',
    address: '4867 Massachusetts Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20016',
    latitude: 38.9408,
    longitude: -77.0828,
    phone: '(202) 363-7800',
    website: 'https://kilnandco.com',
    hours: 'Tue-Sat 10am-7pm, Sun 11am-5pm',
    county: 'District of Columbia',
    description: 'DC pottery painting studio in Spring Valley. Contemporary ceramics selection. Family-friendly with kids activities.',
    cost: '$8 studio fee + pottery price ($12-60)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-painting', 'walk-in', 'birthday-parties', 'kids-friendly', 'contemporary'],
  },

  // MUSE PAINTBAR
  {
    name: 'Muse Paintbar National Harbor',
    address: '150 American Way',
    city: 'National Harbor',
    state: 'MD',
    zipCode: '20745',
    latitude: 38.7818,
    longitude: -77.0168,
    phone: '(301) 749-1905',
    website: 'https://musepaintbar.com/national-harbor',
    hours: 'Daily 11am-10pm',
    county: "Prince George's County",
    description: 'Paint and sip studio with family-friendly daytime sessions. Guided painting classes for all skill levels.',
    cost: '$35-50/class',
    ageRange: 'All Ages (family sessions)',
    isFree: false,
    venueType: 'paint-studio',
    features: ['guided-painting', 'canvas-painting', 'family-sessions', 'birthday-parties', 'waterfront'],
  },
  {
    name: 'Muse Paintbar Gainesville',
    address: '7453 Somerset Crossing Drive',
    city: 'Gainesville',
    state: 'VA',
    zipCode: '20155',
    latitude: 38.7978,
    longitude: -77.6178,
    phone: '(571) 261-7066',
    website: 'https://musepaintbar.com/gainesville',
    hours: 'Daily 11am-10pm',
    county: 'Prince William County',
    description: 'Guided painting studio with daytime family sessions. Create your own masterpiece with step-by-step instruction.',
    cost: '$35-50/class',
    ageRange: 'All Ages (family sessions)',
    isFree: false,
    venueType: 'paint-studio',
    features: ['guided-painting', 'canvas-painting', 'family-sessions', 'birthday-parties'],
  },

  // PINOT'S PALETTE
  {
    name: "Pinot's Palette Bethesda",
    address: '7251 Woodmont Avenue',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20814',
    latitude: 38.9828,
    longitude: -77.0958,
    phone: '(301) 652-7473',
    website: 'https://pinotspalette.com/bethesda',
    hours: 'Daily varies by class',
    county: 'Montgomery County',
    description: 'Paint and sip studio with family-friendly kids classes. Guided painting with all supplies included.',
    cost: '$35-45/class',
    ageRange: 'All Ages (kids classes available)',
    isFree: false,
    venueType: 'paint-studio',
    features: ['guided-painting', 'canvas-painting', 'kids-classes', 'birthday-parties'],
  },
  {
    name: "Pinot's Palette Leesburg",
    address: '1 Loudoun Street SE',
    city: 'Leesburg',
    state: 'VA',
    zipCode: '20175',
    latitude: 39.1148,
    longitude: -77.5628,
    phone: '(571) 291-3600',
    website: 'https://pinotspalette.com/leesburg',
    hours: 'Daily varies by class',
    county: 'Loudoun County',
    description: 'Downtown Leesburg painting studio with kids and family classes. Step-by-step guided painting instruction.',
    cost: '$35-45/class',
    ageRange: 'All Ages (kids classes available)',
    isFree: false,
    venueType: 'paint-studio',
    features: ['guided-painting', 'canvas-painting', 'kids-classes', 'birthday-parties', 'downtown'],
  },

  // GLEN ECHO PARK ARTS
  {
    name: 'Glen Echo Park Partnership for Arts & Culture',
    address: '7300 MacArthur Boulevard',
    city: 'Glen Echo',
    state: 'MD',
    zipCode: '20812',
    latitude: 39.0858,
    longitude: -77.1408,
    phone: '(301) 634-2222',
    website: 'https://glenechopark.org',
    hours: 'Varies by class',
    county: 'Montgomery County',
    description: 'Historic arts park with pottery, glassblowing, painting, and more. Year-round classes and summer camps for kids.',
    cost: 'Classes: $25-75/session',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'arts-center',
    features: ['pottery-wheel', 'glassblowing', 'painting', 'classes', 'camps', 'historic', 'national-park'],
  },

  // TORPEDO FACTORY
  {
    name: 'Torpedo Factory Art Center',
    address: '105 N Union Street',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22314',
    latitude: 38.8048,
    longitude: -77.0398,
    phone: '(703) 746-4570',
    website: 'https://torpedofactory.org',
    hours: 'Daily 10am-6pm',
    county: 'City of Alexandria',
    description: 'Historic art center with working artists, galleries, and classes. Family workshops and kids art programs available.',
    cost: 'Free to visit, Classes: $30-60',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'arts-center',
    features: ['galleries', 'working-artists', 'classes', 'workshops', 'family-programs', 'waterfront', 'historic'],
  },

  // CLAYWORKS
  {
    name: 'ClayWorks at Rockville',
    address: '604 E Diamond Avenue',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    latitude: 39.1458,
    longitude: -77.2018,
    phone: '(301) 519-6789',
    website: 'https://clayworksgaithersburg.com',
    hours: 'Mon-Fri 4pm-8pm, Sat 10am-4pm',
    county: 'Montgomery County',
    description: 'Pottery studio offering wheel-throwing and hand-building classes for kids and adults. Summer camps available.',
    cost: 'Classes: $30-50/session',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'pottery-studio',
    features: ['pottery-wheel', 'hand-building', 'classes', 'camps', 'kids-focused'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'pottery-studio': { category: 'Indoor', subcategory: 'Pottery Studio' },
    'paint-studio': { category: 'Indoor', subcategory: 'Paint Studio' },
    'art-center': { category: 'Indoor', subcategory: 'Art Center' },
    'arts-center': { category: 'Indoor', subcategory: 'Arts Center' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Art Studio' };
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
      source: 'art-studios-dmv',
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
      hasBirthdayParties: location.features.includes('birthday-parties'),
      hasWalkIn: location.features.includes('walk-in'),
      hasClasses: location.features.includes('classes') || location.features.includes('kids-classes'),
      hasCamps: location.features.includes('camps'),
      isPotteryPainting: location.features.includes('pottery-painting'),
      isCanvasPainting: location.features.includes('canvas-painting') || location.features.includes('guided-painting'),
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

async function scrapeArtStudiosDMV() {
  console.log(`\n🎨 ART STUDIOS & POTTERY DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🎨 Processing Art Studios & Pottery...');

  // Group by state
  const mdVenues = ART_STUDIOS.filter(v => v.state === 'MD');
  const vaVenues = ART_STUDIOS.filter(v => v.state === 'VA');
  const dcVenues = ART_STUDIOS.filter(v => v.state === 'DC');

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
  console.log(`✅ ART STUDIOS & POTTERY DMV SCRAPER COMPLETE`);
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

async function scrapeArtStudiosDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeArtStudiosDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Art Studios & Pottery DMV Scraper');
  scrapeArtStudiosDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeArtStudiosDMV,
  scrapeArtStudiosDMVCloudFunction,
};
