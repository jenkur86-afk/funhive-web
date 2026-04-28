#!/usr/bin/env node

/**
 * ICE RINKS DMV ACTIVITIES SCRAPER
 *
 * Adds ice skating rinks to the activities collection.
 * These venues offer public skate sessions, lessons, and hockey.
 *
 * Coverage:
 * - Cabin John Ice Rink (Rockville)
 * - Wheaton Ice Arena (Wheaton)
 * - Gardens Ice House (Laurel)
 * - Herbert Wells Ice Rink (College Park)
 * - Mt. Vernon Recreation Center Ice Rink (Alexandria)
 * - Pentagon Row Ice Skating (Arlington - seasonal)
 * - Kettler Capitals Iceplex (Arlington)
 * - Reston Town Center Ice Pavilion (Reston - seasonal)
 *
 * Usage:
 *   node scraper-activities-ice-rinks-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledIceRinksDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'IceRinks-DMV';

// ==========================================
// VENUE DATA - DMV Ice Rinks
// ==========================================

const ICE_RINKS = [
  // MARYLAND
  {
    name: 'Cabin John Ice Rink',
    address: '10610 Westlake Drive',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0378,
    longitude: -77.1419,
    phone: '(301) 765-8620',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/icerinks/cabinjohn.html',
    hours: 'Daily - varies by session (check schedule)',
    county: 'Montgomery County',
    description: 'Montgomery County public ice rink with NHL-sized rink. Offers public skating, lessons, hockey leagues, and birthday parties. Skate rentals available.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'birthday-parties'],
  },
  {
    name: 'Wheaton Ice Arena',
    address: '11717 Orebaugh Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0398,
    longitude: -77.0497,
    phone: '(301) 649-3640',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/icerinks/wheaton.html',
    hours: 'Daily - varies by session (check schedule)',
    county: 'Montgomery County',
    description: 'Year-round ice arena with public skating sessions, figure skating, and hockey programs. Family-friendly with affordable skate rentals.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating'],
  },
  {
    name: 'The Gardens Ice House',
    address: '13800 Old Gunpowder Road',
    city: 'Laurel',
    state: 'MD',
    zipCode: '20707',
    latitude: 39.1178,
    longitude: -76.8367,
    phone: '(301) 953-0100',
    website: 'https://www.thegardens.com',
    hours: 'Daily - varies by session',
    county: 'Prince George\'s County',
    description: 'Large ice complex with two NHL-sized rinks. Offers public skating, learn to skate programs, hockey, and figure skating. Home to Washington Capitals practice facility.',
    cost: '$9-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating', 'pro-shop'],
  },
  {
    name: 'Herbert Wells Ice Rink',
    address: '5211 Campus Drive',
    city: 'College Park',
    state: 'MD',
    zipCode: '20740',
    latitude: 38.9897,
    longitude: -76.9418,
    phone: '(301) 277-3719',
    website: 'https://www.pgparks.com/facilities/facility/details/Herbert-Wells-Ice-Rink-128',
    hours: 'Daily - varies by session',
    county: 'Prince George\'s County',
    description: 'Prince George\'s County ice rink near University of Maryland. Public skating, lessons, and hockey programs available.',
    cost: '$7-9/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals'],
  },
  {
    name: 'Piney Orchard Ice Arena',
    address: '2425 Evergreen Road',
    city: 'Odenton',
    state: 'MD',
    zipCode: '21113',
    latitude: 39.0789,
    longitude: -76.7018,
    phone: '(410) 674-1014',
    website: 'https://pineyorchardicearena.com',
    hours: 'Daily - varies by session',
    county: 'Anne Arundel County',
    description: 'Community ice arena with public skating, learn to skate, and hockey programs. Features NHL-sized rink with great viewing areas.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'birthday-parties'],
  },

  // VIRGINIA
  {
    name: 'Mt. Vernon Recreation Center Ice Arena',
    address: '2017 Belle View Boulevard',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22307',
    latitude: 38.7698,
    longitude: -77.0578,
    phone: '(703) 768-3224',
    website: 'https://www.fairfaxcounty.gov/parks/rec/mtvernon/ice-arena',
    hours: 'Daily - varies by session',
    county: 'Fairfax County',
    description: 'Fairfax County ice arena offering public skating, lessons, and hockey. Affordable family skating with skate rentals available.',
    cost: '$7-9/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals'],
  },
  {
    name: 'Kettler Capitals Iceplex',
    address: '627 N Glebe Road',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22203',
    latitude: 38.8818,
    longitude: -77.1058,
    phone: '(571) 224-0555',
    website: 'https://www.kettlercapitalsiceplex.com',
    hours: 'Daily - varies by session',
    county: 'Arlington County',
    description: 'Official practice facility of the Washington Capitals. Features two NHL-sized rinks, public skating, lessons, and hockey programs.',
    cost: '$10-14/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'pro-shop', 'capitals-practice'],
  },
  {
    name: 'Ashburn Ice House',
    address: '21595 Smith Switch Road',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0478,
    longitude: -77.4578,
    phone: '(703) 858-0300',
    website: 'https://www.ashburnicehouse.com',
    hours: 'Daily - varies by session',
    county: 'Loudoun County',
    description: 'Loudoun County ice facility with two rinks. Offers public skating, learn to skate, hockey, and figure skating programs.',
    cost: '$9-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating'],
  },
  {
    name: 'SkateQuest Reston',
    address: '1800 Michael Faraday Court',
    city: 'Reston',
    state: 'VA',
    zipCode: '20190',
    latitude: 38.9518,
    longitude: -77.3418,
    phone: '(703) 709-1010',
    website: 'https://www.skatequestreston.com',
    hours: 'Daily - varies by session',
    county: 'Fairfax County',
    description: 'Year-round ice skating facility in Reston. Features public skating, learn to skate, hockey, and figure skating. Great for beginners.',
    cost: '$8-11/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating'],
  },
  {
    name: 'Prince William Ice Center',
    address: '5180 Dale Boulevard',
    city: 'Woodbridge',
    state: 'VA',
    zipCode: '22193',
    latitude: 38.6378,
    longitude: -77.2878,
    phone: '(703) 730-8423',
    website: 'https://www.pwcgov.org/government/dept/park/facilities/Pages/Prince-William-Ice-Center.aspx',
    hours: 'Daily - varies by session',
    county: 'Prince William County',
    description: 'Prince William County ice arena with NHL-sized rink. Public skating, lessons, hockey, and birthday parties available.',
    cost: '$7-9/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'birthday-parties'],
  },

  // DC & SEASONAL RINKS
  {
    name: 'Washington Harbour Ice Rink',
    address: '3000 K Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20007',
    latitude: 38.9018,
    longitude: -77.0628,
    phone: '(202) 706-7666',
    website: 'https://www.thewashingtonharbour.com/ice-rink',
    hours: 'Daily Nov-Mar (seasonal)',
    county: 'District of Columbia',
    description: 'Scenic outdoor ice rink on the Georgetown waterfront. Open November through March with stunning views of the Potomac River.',
    cost: '$10-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: true,
    features: ['public-skating', 'rentals', 'outdoor', 'waterfront-views'],
  },
  {
    name: 'National Gallery of Art Ice Rink',
    address: '4th Street & Constitution Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20565',
    latitude: 38.8918,
    longitude: -77.0178,
    phone: '(202) 216-9397',
    website: 'https://www.nga.gov/visit/sculpture-garden-ice-rink.html',
    hours: 'Daily Nov-Mar (seasonal)',
    county: 'District of Columbia',
    description: 'Iconic outdoor ice rink in the National Gallery Sculpture Garden on the National Mall. Open November through mid-March.',
    cost: '$10-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: true,
    features: ['public-skating', 'rentals', 'outdoor', 'national-mall'],
  },
  {
    name: 'Pentagon Row Ice Skating',
    address: '1201 S Joyce Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22202',
    latitude: 38.8618,
    longitude: -77.0632,
    phone: '(703) 418-6666',
    website: 'https://www.pentagonrowskating.com',
    hours: 'Daily Nov-Mar (seasonal)',
    county: 'Arlington County',
    description: 'Outdoor skating rink at Pentagon Row shopping center. Open November through March with nearby dining and shopping.',
    cost: '$9-11/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: true,
    features: ['public-skating', 'rentals', 'outdoor', 'shopping-nearby'],
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
    type: location.seasonal ? 'Seasonal Ice Rink' : 'Ice Rink',
    category: 'Indoor',
    subcategory: 'Ice Skating',
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
      source: 'ice-rinks-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'ice-rink',
      isSeasonal: location.seasonal,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: !location.seasonal,
      isOutdoor: location.seasonal,
      hasParking: true,
      hasRentals: location.features.includes('rentals'),
      hasLessons: location.features.includes('lessons'),
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
async function scrapeIceRinksDMV() {
  console.log(`\n⛸️ ICE RINKS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Ice Rinks
  console.log('\n⛸️ Processing Ice Rinks...');

  // Group by state and type
  const mdRinks = ICE_RINKS.filter(r => r.state === 'MD');
  const vaRinks = ICE_RINKS.filter(r => r.state === 'VA');
  const dcRinks = ICE_RINKS.filter(r => r.state === 'DC');

  console.log(`\n  Maryland (${mdRinks.length} rinks):`);
  for (const location of mdRinks) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})${location.seasonal ? ' [seasonal]' : ''}`);
  }

  console.log(`\n  Virginia (${vaRinks.length} rinks):`);
  for (const location of vaRinks) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})${location.seasonal ? ' [seasonal]' : ''}`);
  }

  console.log(`\n  DC (${dcRinks.length} rinks):`);
  for (const location of dcRinks) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})${location.seasonal ? ' [seasonal]' : ''}`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ICE RINKS DMV SCRAPER COMPLETE`);
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
async function scrapeIceRinksDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeIceRinksDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Ice Rinks DMV Scraper');

  scrapeIceRinksDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeIceRinksDMV,
  scrapeIceRinksDMVCloudFunction,
};
