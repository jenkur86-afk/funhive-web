#!/usr/bin/env node

/**
 * MOVIE THEATERS DMV ACTIVITIES SCRAPER
 *
 * Adds family-friendly movie theaters to the activities collection.
 * Focuses on theaters with special kids programming, sensory-friendly shows,
 * and premium family experiences.
 *
 * Coverage:
 * - AMC Theatres (with Sensory Friendly Films)
 * - Regal Cinemas
 * - Cinemark
 * - Alamo Drafthouse
 * - Angelika Film Center
 * - AFI Silver Theatre
 * - Landmark Theatres
 *
 * Usage:
 *   node scraper-activities-movie-theaters-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledMovieTheatersDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'MovieTheaters-DMV';

// ==========================================
// VENUE DATA - DMV Movie Theaters
// ==========================================

const MOVIE_THEATERS = [
  // AMC THEATRES (with Sensory Friendly Films program)
  {
    name: 'AMC Columbia 14',
    address: '10300 Little Patuxent Parkway',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21044',
    latitude: 39.2158,
    longitude: -76.8618,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/baltimore/amc-columbia-14',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Howard County',
    description: 'Modern multiplex with IMAX, Dolby Cinema, and recliner seating. Offers Sensory Friendly Films for kids with autism and sensory sensitivities.',
    cost: '$12-20/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Owings Mills 17',
    address: '10100 Mill Run Circle',
    city: 'Owings Mills',
    state: 'MD',
    zipCode: '21117',
    latitude: 39.4118,
    longitude: -76.7818,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/baltimore/amc-owings-mills-17',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Baltimore County',
    description: 'Large multiplex with IMAX and premium formats. Participates in Sensory Friendly Films program for special needs families.',
    cost: '$12-20/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Tysons Corner 16',
    address: '7850 Tysons Corner Center',
    city: 'McLean',
    state: 'VA',
    zipCode: '22102',
    latitude: 38.9178,
    longitude: -77.2228,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/washington-dc/amc-tysons-corner-16',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Fairfax County',
    description: 'Premier shopping mall theater with IMAX, Dolby Cinema, and luxury seating. Family-friendly with kids programming.',
    cost: '$14-22/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Hoffman Center 22',
    address: '206 Swamp Fox Road',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22314',
    latitude: 38.8018,
    longitude: -77.0828,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/washington-dc/amc-hoffman-center-22',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'City of Alexandria',
    description: 'Large 22-screen complex near Old Town Alexandria. IMAX, Dolby, and Sensory Friendly screenings available.',
    cost: '$14-22/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Georgetown 14',
    address: '3111 K Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20007',
    latitude: 38.9028,
    longitude: -77.0618,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/washington-dc/amc-georgetown-14',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'District of Columbia',
    description: 'Georgetown waterfront theater with premium formats. Family-friendly location near shops and restaurants.',
    cost: '$14-22/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'waterfront'],
  },

  // REGAL CINEMAS
  {
    name: 'Regal Majestic Stadium 20 & IMAX',
    address: '900 Ellsworth Drive',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9948,
    longitude: -77.0248,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-majestic-imax/0137',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Montgomery County',
    description: 'Downtown Silver Spring theater with IMAX and 4DX experiences. Offers kids summer movie deals and birthday party packages.',
    cost: '$13-20/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', '4dx', 'rpx', 'summer-movies', 'birthday-parties', 'reserved-seating'],
  },
  {
    name: 'Regal Germantown Stadium 14',
    address: '20000 Century Boulevard',
    city: 'Germantown',
    state: 'MD',
    zipCode: '20874',
    latitude: 39.1758,
    longitude: -77.2628,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-germantown-stadium-14/0097',
    hours: 'Daily 10am-11pm (varies by showtime)',
    county: 'Montgomery County',
    description: 'Stadium seating theater with RPX premium format. Family-friendly with summer movie series for kids.',
    cost: '$12-18/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['rpx', 'stadium-seating', 'summer-movies', 'reserved-seating'],
  },
  {
    name: 'Regal Fairfax Towne Center 10',
    address: '4110 West Ox Road',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22033',
    latitude: 38.8578,
    longitude: -77.3758,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-fairfax-towne-center/0196',
    hours: 'Daily 10am-11pm (varies by showtime)',
    county: 'Fairfax County',
    description: 'Community theater with comfortable seating and good family atmosphere. Participates in summer kids movies.',
    cost: '$12-16/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['stadium-seating', 'summer-movies', 'reserved-seating'],
  },
  {
    name: 'Regal Gallery Place',
    address: '707 7th Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20001',
    latitude: 38.8978,
    longitude: -77.0218,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-gallery-place/1662',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'District of Columbia',
    description: 'Downtown DC theater in Chinatown. Convenient Metro access makes it easy for family outings.',
    cost: '$14-20/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['stadium-seating', 'metro-accessible', 'reserved-seating'],
  },

  // CINEMARK
  {
    name: 'Cinemark Egyptian 24 and XD',
    address: '7000 Arundel Mills Circle',
    city: 'Hanover',
    state: 'MD',
    zipCode: '21076',
    latitude: 39.1578,
    longitude: -76.7318,
    phone: '(443) 755-8990',
    website: 'https://www.cinemark.com/theatres/md-hanover/cinemark-egyptian-24-and-xd',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Anne Arundel County',
    description: 'Egyptian-themed theater with 24 screens and XD premium format. Offers Sensory Friendly Films and Summer Movie Clubhouse for kids.',
    cost: '$11-18/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['xd', 'themed-decor', 'sensory-friendly', 'summer-movies', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'Cinemark Fairfax Corner 14 + XD',
    address: '11900 Palace Way',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22030',
    latitude: 38.8628,
    longitude: -77.3918,
    phone: '(703) 502-4060',
    website: 'https://www.cinemark.com/theatres/va-fairfax/cinemark-fairfax-corner-14-xd',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Fairfax County',
    description: 'Modern theater at Fairfax Corner shopping center. XD auditorium and sensory-friendly screenings for families.',
    cost: '$11-18/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['xd', 'sensory-friendly', 'summer-movies', 'discount-days', 'reserved-seating'],
  },

  // ALAMO DRAFTHOUSE (Family-friendly with special screenings)
  {
    name: 'Alamo Drafthouse Cinema DC Bryant Street',
    address: '4701 Rhode Island Avenue NE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20018',
    latitude: 38.9358,
    longitude: -76.9928,
    phone: '(202) 617-2390',
    website: 'https://drafthouse.com/dc/theater/dc-bryant-street',
    hours: 'Daily 11am-12am (varies by showtime)',
    county: 'District of Columbia',
    description: 'Dine-in cinema with strict no-talking policy. Offers Kids Camp screenings with family-friendly matinees and special events.',
    cost: '$14-20/ticket',
    ageRange: 'All Ages (Kids Camp for families)',
    isFree: false,
    venueType: 'dine-in',
    features: ['dine-in', 'kids-camp', 'special-events', 'reserved-seating', 'no-talking-policy'],
  },
  {
    name: 'Alamo Drafthouse Cinema Woodbridge',
    address: '2700 Potomac Mills Circle',
    city: 'Woodbridge',
    state: 'VA',
    zipCode: '22192',
    latitude: 38.6428,
    longitude: -77.3018,
    phone: '(571) 398-2700',
    website: 'https://drafthouse.com/dc/theater/woodbridge',
    hours: 'Daily 11am-12am (varies by showtime)',
    county: 'Prince William County',
    description: 'Dine-in movie theater with full food and drink service. Kids Camp offers family-friendly screenings with relaxed rules.',
    cost: '$12-18/ticket',
    ageRange: 'All Ages (Kids Camp for families)',
    isFree: false,
    venueType: 'dine-in',
    features: ['dine-in', 'kids-camp', 'special-events', 'reserved-seating'],
  },
  {
    name: 'Alamo Drafthouse Cinema Loudoun',
    address: '21100 Dulles Town Circle',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20166',
    latitude: 39.0278,
    longitude: -77.4178,
    phone: '(571) 355-4800',
    website: 'https://drafthouse.com/dc/theater/loudoun',
    hours: 'Daily 11am-12am (varies by showtime)',
    county: 'Loudoun County',
    description: 'Premium dine-in theater experience. Features Kids Camp matinees where kids can be kids during family-friendly films.',
    cost: '$14-20/ticket',
    ageRange: 'All Ages (Kids Camp for families)',
    isFree: false,
    venueType: 'dine-in',
    features: ['dine-in', 'kids-camp', 'special-events', 'reserved-seating'],
  },

  // AFI SILVER THEATRE (Special programming)
  {
    name: 'AFI Silver Theatre and Cultural Center',
    address: '8633 Colesville Road',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9938,
    longitude: -77.0288,
    phone: '(301) 495-6700',
    website: 'https://silver.afi.com',
    hours: 'Daily 12pm-10pm (varies by programming)',
    county: 'Montgomery County',
    description: 'Historic art deco theater operated by AFI. Features family matinees, classic films, and special kids programming. Great for introducing kids to film history.',
    cost: '$13-15/ticket, Member discounts',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'classic-films', 'family-matinees', 'historic', 'film-education'],
  },

  // ANGELIKA FILM CENTER
  {
    name: 'Angelika Film Center Mosaic',
    address: '2911 District Avenue',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22031',
    latitude: 38.8678,
    longitude: -77.2218,
    phone: '(571) 512-2939',
    website: 'https://www.angelikafilmcenter.com/mosaic',
    hours: 'Daily 10am-11pm (varies by showtime)',
    county: 'Fairfax County',
    description: 'Upscale theater showing independent and mainstream films. Offers family-friendly screenings and special kids events.',
    cost: '$13-17/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'independent-films', 'dine-in', 'reserved-seating', 'upscale'],
  },

  // LANDMARK THEATRES
  {
    name: 'Landmark E Street Cinema',
    address: '555 11th Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20004',
    latitude: 38.8958,
    longitude: -77.0278,
    phone: '(202) 452-7672',
    website: 'https://www.landmarktheatres.com/washington-d-c/e-street-cinema',
    hours: 'Daily 11am-11pm (varies by showtime)',
    county: 'District of Columbia',
    description: 'Downtown DC art house theater showing independent, foreign, and documentary films. Great for exposing kids to diverse cinema.',
    cost: '$13-16/ticket',
    ageRange: 'All Ages (film dependent)',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'independent-films', 'foreign-films', 'documentaries', 'metro-accessible'],
  },
  {
    name: 'Landmark Bethesda Row Cinema',
    address: '7235 Woodmont Avenue',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20814',
    latitude: 38.9828,
    longitude: -77.0958,
    phone: '(301) 652-7273',
    website: 'https://www.landmarktheatres.com/bethesda/bethesda-row-cinema',
    hours: 'Daily 11am-11pm (varies by showtime)',
    county: 'Montgomery County',
    description: 'Upscale Bethesda theater with premium seating. Shows mix of independent and mainstream family-friendly films.',
    cost: '$13-16/ticket',
    ageRange: 'All Ages (film dependent)',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'independent-films', 'upscale', 'metro-accessible'],
  },

  // IPIC (Premium family experience)
  {
    name: 'IPIC North Bethesda',
    address: '11830 Grand Park Avenue',
    city: 'North Bethesda',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0288,
    longitude: -77.1148,
    phone: '(301) 230-1800',
    website: 'https://www.ipic.com/north-bethesda',
    hours: 'Daily 11am-11pm (varies by showtime)',
    county: 'Montgomery County',
    description: 'Luxury dine-in theater with pod seating and full-service dining. Premium family experience for special occasions.',
    cost: '$18-30/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'luxury',
    features: ['luxury', 'dine-in', 'pod-seating', 'full-service', 'reserved-seating'],
  },

  // DRIVE-IN THEATERS (Seasonal family fun)
  {
    name: 'Bengies Drive-In Theatre',
    address: '3417 Eastern Boulevard',
    city: 'Middle River',
    state: 'MD',
    zipCode: '21220',
    latitude: 39.3318,
    longitude: -76.4178,
    phone: '(410) 687-5627',
    website: 'https://www.bengies.com',
    hours: 'Seasonal: Gates open 7pm, Movies at dusk',
    county: 'Baltimore County',
    description: 'Classic drive-in theater with the largest outdoor movie screen in America. Family-friendly atmosphere with double features. Kids under 11 free!',
    cost: '$12/adult, Kids under 11 free',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'drive-in',
    features: ['drive-in', 'double-features', 'largest-screen', 'kids-free', 'seasonal', 'snack-bar'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'multiplex': { category: 'Indoor', subcategory: 'Movie Theater' },
    'dine-in': { category: 'Indoor', subcategory: 'Dine-In Theater' },
    'art-house': { category: 'Indoor', subcategory: 'Art House Cinema' },
    'luxury': { category: 'Indoor', subcategory: 'Luxury Theater' },
    'drive-in': { category: 'Outdoor', subcategory: 'Drive-In Theater' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Movie Theater' };
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
      source: 'movie-theaters-dmv',
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
      hasSensoryFriendly: location.features.includes('sensory-friendly'),
      hasIMAX: location.features.includes('imax'),
      hasDineIn: location.features.includes('dine-in'),
      hasKidsPrograms: location.features.includes('kids-camp') || location.features.includes('summer-movies'),
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

async function scrapeMovieTheatersDMV() {
  console.log(`\n🎬 MOVIE THEATERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🎬 Processing Movie Theaters...');

  // Group by state
  const mdTheaters = MOVIE_THEATERS.filter(t => t.state === 'MD');
  const vaTheaters = MOVIE_THEATERS.filter(t => t.state === 'VA');
  const dcTheaters = MOVIE_THEATERS.filter(t => t.state === 'DC');

  console.log(`\n  Maryland (${mdTheaters.length} theaters):`);
  for (const location of mdTheaters) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  Virginia (${vaTheaters.length} theaters):`);
  for (const location of vaTheaters) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n  DC (${dcTheaters.length} theaters):`);
  for (const location of dcTheaters) {
    const activity = createActivityDocument(location);
    allActivities.push(activity);
    console.log(`    ✓ ${location.name} (${location.city})`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);
  console.log('\n💾 Saving to database...');

  const { saved, updated, failed } = await saveActivities(allActivities);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ MOVIE THEATERS DMV SCRAPER COMPLETE`);
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

async function scrapeMovieTheatersDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeMovieTheatersDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Movie Theaters DMV Scraper');
  scrapeMovieTheatersDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeMovieTheatersDMV,
  scrapeMovieTheatersDMVCloudFunction,
};
