#!/usr/bin/env node

/**
 * FAMILY ENTERTAINMENT CENTERS DMV ACTIVITIES SCRAPER
 *
 * Adds family entertainment centers to the activities collection.
 * Covers arcades, entertainment complexes, and family fun centers.
 *
 * Coverage:
 * - Dave & Buster's
 * - Chuck E. Cheese
 * - Main Event
 * - Adventure Park USA
 * - Autobahn Indoor Speedway
 * - K1 Speed
 * - TopGolf
 * - Fun Land of Fairfax
 *
 * Usage:
 *   node scraper-activities-family-entertainment-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledFamilyEntertainmentDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'FamilyEntertainment-DMV';

// ==========================================
// VENUE DATA - DMV Family Entertainment Centers
// ==========================================

const FAMILY_ENTERTAINMENT_CENTERS = [
  // DAVE & BUSTER'S
  {
    name: "Dave & Buster's Arundel Mills",
    address: '7000 Arundel Mills Circle',
    city: 'Hanover',
    state: 'MD',
    zipCode: '21076',
    latitude: 39.1618,
    longitude: -76.7248,
    phone: '(443) 755-0200',
    website: 'https://www.daveandbusters.com/locations/arundel-mills',
    hours: 'Sun-Thu 11am-12am, Fri-Sat 11am-1am',
    county: 'Anne Arundel County',
    description: 'Arcade and restaurant combo featuring hundreds of games, virtual reality, and bowling. Family-friendly during daytime hours with special kids deals.',
    cost: 'Games: $1-15/play, Meals: $15-30',
    ageRange: 'All Ages (family hours vary)',
    isFree: false,
    venueType: 'arcade-restaurant',
    features: ['arcade', 'virtual-reality', 'bowling', 'restaurant', 'sports-bar', 'prizes'],
  },
  {
    name: "Dave & Buster's White Marsh",
    address: '8200 Perry Hall Boulevard',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21236',
    latitude: 39.3848,
    longitude: -76.5178,
    phone: '(410) 933-4600',
    website: 'https://www.daveandbusters.com/locations/white-marsh',
    hours: 'Sun-Thu 11am-12am, Fri-Sat 11am-1am',
    county: 'Baltimore County',
    description: 'Arcade entertainment center with games, bowling, and dining. Great for family outings and birthday parties.',
    cost: 'Games: $1-15/play, Meals: $15-30',
    ageRange: 'All Ages (family hours vary)',
    isFree: false,
    venueType: 'arcade-restaurant',
    features: ['arcade', 'virtual-reality', 'bowling', 'restaurant', 'birthday-parties', 'prizes'],
  },
  {
    name: "Dave & Buster's Silver Spring",
    address: '8661 Colesville Road',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9968,
    longitude: -77.0278,
    phone: '(301) 565-6655',
    website: 'https://www.daveandbusters.com/locations/silver-spring',
    hours: 'Sun-Thu 11am-12am, Fri-Sat 11am-1am',
    county: 'Montgomery County',
    description: 'Downtown Silver Spring entertainment venue with arcade games, sports viewing, and American fare. Family-friendly afternoons.',
    cost: 'Games: $1-15/play, Meals: $15-30',
    ageRange: 'All Ages (family hours vary)',
    isFree: false,
    venueType: 'arcade-restaurant',
    features: ['arcade', 'virtual-reality', 'restaurant', 'sports-bar', 'birthday-parties'],
  },
  {
    name: "Dave & Buster's Springfield",
    address: '6654 Springfield Mall',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22150',
    latitude: 38.7768,
    longitude: -77.1718,
    phone: '(703) 924-1600',
    website: 'https://www.daveandbusters.com/locations/springfield',
    hours: 'Sun-Thu 11am-12am, Fri-Sat 11am-1am',
    county: 'Fairfax County',
    description: 'Springfield Town Center entertainment destination with extensive arcade, VR games, and dining. Great for family entertainment.',
    cost: 'Games: $1-15/play, Meals: $15-30',
    ageRange: 'All Ages (family hours vary)',
    isFree: false,
    venueType: 'arcade-restaurant',
    features: ['arcade', 'virtual-reality', 'restaurant', 'birthday-parties', 'prizes'],
  },
  {
    name: "Dave & Buster's Fairfax",
    address: '11954 Fair Oaks Mall',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22033',
    latitude: 38.8628,
    longitude: -77.3588,
    phone: '(703) 273-5500',
    website: 'https://www.daveandbusters.com/locations/fairfax',
    hours: 'Sun-Thu 11am-12am, Fri-Sat 11am-1am',
    county: 'Fairfax County',
    description: 'Fair Oaks Mall location with arcade games, simulators, and family dining. Popular for kids birthdays.',
    cost: 'Games: $1-15/play, Meals: $15-30',
    ageRange: 'All Ages (family hours vary)',
    isFree: false,
    venueType: 'arcade-restaurant',
    features: ['arcade', 'virtual-reality', 'simulators', 'restaurant', 'birthday-parties'],
  },

  // CHUCK E. CHEESE
  {
    name: 'Chuck E. Cheese Columbia',
    address: '9041 Snowden Square Drive',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21046',
    latitude: 39.2078,
    longitude: -76.8518,
    phone: '(410) 381-9880',
    website: 'https://www.chuckecheese.com/locations/md/columbia',
    hours: 'Sun-Thu 11am-9pm, Fri-Sat 11am-10pm',
    county: 'Howard County',
    description: 'Classic kids entertainment center with arcade games, climbing structures, and pizza. Features animatronic shows and birthday packages.',
    cost: 'Play packages: $20-50, Pizza: $15-25',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'kids-entertainment',
    features: ['arcade', 'climbing', 'pizza', 'birthday-parties', 'prizes', 'toddler-area'],
  },
  {
    name: 'Chuck E. Cheese Glen Burnie',
    address: '6637 Ritchie Highway',
    city: 'Glen Burnie',
    state: 'MD',
    zipCode: '21061',
    latitude: 39.1628,
    longitude: -76.6128,
    phone: '(410) 761-3700',
    website: 'https://www.chuckecheese.com/locations/md/glen-burnie',
    hours: 'Sun-Thu 11am-9pm, Fri-Sat 11am-10pm',
    county: 'Anne Arundel County',
    description: 'Family entertainment venue with games, rides, and pizza. Safe environment with security features for families with young children.',
    cost: 'Play packages: $20-50, Pizza: $15-25',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'kids-entertainment',
    features: ['arcade', 'kiddie-rides', 'pizza', 'birthday-parties', 'prizes'],
  },
  {
    name: 'Chuck E. Cheese Bowie',
    address: '15426 Excelsior Drive',
    city: 'Bowie',
    state: 'MD',
    zipCode: '20716',
    latitude: 38.9478,
    longitude: -76.7278,
    phone: '(301) 249-3130',
    website: 'https://www.chuckecheese.com/locations/md/bowie',
    hours: 'Sun-Thu 11am-9pm, Fri-Sat 11am-10pm',
    county: "Prince George's County",
    description: 'Kids entertainment center with arcade games, play area, and pizza dining. Popular birthday party destination.',
    cost: 'Play packages: $20-50, Pizza: $15-25',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'kids-entertainment',
    features: ['arcade', 'play-area', 'pizza', 'birthday-parties', 'prizes'],
  },
  {
    name: 'Chuck E. Cheese Rockville',
    address: '1256 E Gude Drive',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20850',
    latitude: 39.0878,
    longitude: -77.1448,
    phone: '(301) 340-8818',
    website: 'https://www.chuckecheese.com/locations/md/rockville',
    hours: 'Sun-Thu 11am-9pm, Fri-Sat 11am-10pm',
    county: 'Montgomery County',
    description: 'Family-friendly entertainment venue with games, pizza, and birthday celebrations. Features modern game selection.',
    cost: 'Play packages: $20-50, Pizza: $15-25',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'kids-entertainment',
    features: ['arcade', 'play-area', 'pizza', 'birthday-parties', 'prizes', 'toddler-area'],
  },
  {
    name: 'Chuck E. Cheese Fairfax',
    address: '10259 Fairfax Boulevard',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22030',
    latitude: 38.8578,
    longitude: -77.2958,
    phone: '(703) 385-8520',
    website: 'https://www.chuckecheese.com/locations/va/fairfax',
    hours: 'Sun-Thu 11am-9pm, Fri-Sat 11am-10pm',
    county: 'Fairfax County',
    description: 'Kids entertainment center with arcade, games, and pizza. Safe family environment with parent-child matching system.',
    cost: 'Play packages: $20-50, Pizza: $15-25',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'kids-entertainment',
    features: ['arcade', 'play-area', 'pizza', 'birthday-parties', 'prizes'],
  },
  {
    name: 'Chuck E. Cheese Springfield',
    address: '6417 Springfield Plaza',
    city: 'Springfield',
    state: 'VA',
    zipCode: '22150',
    latitude: 38.7878,
    longitude: -77.1818,
    phone: '(703) 922-6575',
    website: 'https://www.chuckecheese.com/locations/va/springfield',
    hours: 'Sun-Thu 11am-9pm, Fri-Sat 11am-10pm',
    county: 'Fairfax County',
    description: 'Classic kids entertainment with games, pizza, and fun. Great for birthday parties and family outings.',
    cost: 'Play packages: $20-50, Pizza: $15-25',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'kids-entertainment',
    features: ['arcade', 'play-area', 'pizza', 'birthday-parties', 'prizes'],
  },

  // MAIN EVENT
  {
    name: 'Main Event Columbia',
    address: '6070 Dobbin Road',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21045',
    latitude: 39.1918,
    longitude: -76.8218,
    phone: '(410) 910-2001',
    website: 'https://www.mainevent.com/locations/maryland/columbia',
    hours: 'Sun-Thu 10am-12am, Fri-Sat 10am-2am',
    county: 'Howard County',
    description: 'Entertainment complex with bowling, laser tag, arcade, and more. Features escape rooms, VR, and dining options for all ages.',
    cost: 'Activities: $5-25/each, Packages: $30-60',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'entertainment-complex',
    features: ['bowling', 'laser-tag', 'arcade', 'escape-rooms', 'virtual-reality', 'restaurant', 'birthday-parties'],
  },
  {
    name: 'Main Event Fairfax',
    address: '11게0 Fair Oaks Mall',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22033',
    latitude: 38.8618,
    longitude: -77.3628,
    phone: '(571) 458-0110',
    website: 'https://www.mainevent.com/locations/virginia/fairfax',
    hours: 'Sun-Thu 10am-12am, Fri-Sat 10am-2am',
    county: 'Fairfax County',
    description: 'All-in-one entertainment destination with bowling, laser tag, VR, and arcade. Great for family fun and celebrations.',
    cost: 'Activities: $5-25/each, Packages: $30-60',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'entertainment-complex',
    features: ['bowling', 'laser-tag', 'arcade', 'virtual-reality', 'billiards', 'restaurant', 'birthday-parties'],
  },

  // ADVENTURE PARK USA
  {
    name: 'Adventure Park USA',
    address: '11113 W Baldwin Road',
    city: 'Monrovia',
    state: 'MD',
    zipCode: '21770',
    latitude: 39.3518,
    longitude: -77.2448,
    phone: '(301) 865-6800',
    website: 'https://www.adventureparkusa.com',
    hours: 'Mon-Thu 11am-9pm, Fri 11am-11pm, Sat 10am-11pm, Sun 10am-9pm',
    county: 'Frederick County',
    description: 'Full-service family fun park with go-karts, mini golf, laser tag, batting cages, bumper boats, and arcade. Indoor and outdoor attractions.',
    cost: 'Activities: $5-15/each, Day pass: $40-60',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'amusement-park',
    features: ['go-karts', 'mini-golf', 'laser-tag', 'bumper-boats', 'batting-cages', 'arcade', 'birthday-parties', 'outdoor'],
  },

  // AUTOBAHN INDOOR SPEEDWAY / GO-KARTS
  {
    name: 'Autobahn Indoor Speedway Baltimore',
    address: '8415 Kelso Drive',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21221',
    latitude: 39.3118,
    longitude: -76.4878,
    phone: '(410) 686-7223',
    website: 'https://www.autobahnspeed.com/baltimore',
    hours: 'Mon-Thu 12pm-9pm, Fri 12pm-11pm, Sat 10am-11pm, Sun 10am-8pm',
    county: 'Baltimore County',
    description: 'Indoor electric go-kart racing with European-style karts reaching 50mph. Junior karts available for ages 8-12.',
    cost: '$25-35/race',
    ageRange: 'Ages 8+ (48" min height)',
    isFree: false,
    venueType: 'go-kart',
    features: ['go-karts', 'electric-karts', 'junior-karts', 'racing', 'birthday-parties'],
  },
  {
    name: 'Autobahn Indoor Speedway Dulles',
    address: '45448 E Severn Way',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20166',
    latitude: 39.0178,
    longitude: -77.4378,
    phone: '(703) 544-4444',
    website: 'https://www.autobahnspeed.com/dulles',
    hours: 'Mon-Thu 12pm-9pm, Fri 12pm-11pm, Sat 10am-11pm, Sun 10am-8pm',
    county: 'Loudoun County',
    description: 'High-speed indoor karting with electric karts. Features junior karts for younger racers and multi-level track.',
    cost: '$25-35/race',
    ageRange: 'Ages 8+ (48" min height)',
    isFree: false,
    venueType: 'go-kart',
    features: ['go-karts', 'electric-karts', 'junior-karts', 'racing', 'birthday-parties'],
  },
  {
    name: 'K1 Speed Capitol Heights',
    address: '7939 Central Avenue',
    city: 'Capitol Heights',
    state: 'MD',
    zipCode: '20743',
    latitude: 38.8818,
    longitude: -76.8878,
    phone: '(240) 391-5900',
    website: 'https://www.k1speed.com/capitol-heights-location.html',
    hours: 'Mon-Thu 12pm-10pm, Fri 12pm-11pm, Sat 10am-11pm, Sun 10am-8pm',
    county: "Prince George's County",
    description: 'Indoor electric kart racing with zero-emission karts. Junior karts available. Professional racing experience for all skill levels.',
    cost: '$25-30/race',
    ageRange: 'Ages 8+ (48" min height)',
    isFree: false,
    venueType: 'go-kart',
    features: ['go-karts', 'electric-karts', 'junior-karts', 'racing', 'birthday-parties', 'leagues'],
  },

  // TOPGOLF
  {
    name: 'Topgolf Germantown',
    address: '20410 Century Boulevard',
    city: 'Germantown',
    state: 'MD',
    zipCode: '20874',
    latitude: 39.1818,
    longitude: -77.2378,
    phone: '(240) 912-4653',
    website: 'https://topgolf.com/us/germantown',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-11pm',
    county: 'Montgomery County',
    description: 'Golf entertainment complex with climate-controlled hitting bays, games, and dining. Junior clubs available for kids. Great for families.',
    cost: '$30-60/hour per bay (up to 6 players)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'golf-entertainment',
    features: ['golf', 'games', 'restaurant', 'bar', 'birthday-parties', 'junior-clubs', 'climate-controlled'],
  },
  {
    name: 'Topgolf National Harbor',
    address: '6400 Clipper Way',
    city: 'Oxon Hill',
    state: 'MD',
    zipCode: '20745',
    latitude: 38.7818,
    longitude: -77.0178,
    phone: '(240) 491-1153',
    website: 'https://topgolf.com/us/national-harbor',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-11pm',
    county: "Prince George's County",
    description: 'Waterfront golf entertainment venue with games, food, and stunning views. Family-friendly with kids programming and junior equipment.',
    cost: '$30-75/hour per bay (up to 6 players)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'golf-entertainment',
    features: ['golf', 'games', 'restaurant', 'bar', 'birthday-parties', 'junior-clubs', 'waterfront'],
  },
  {
    name: 'Topgolf Loudoun',
    address: '20356 Commonwealth Center Drive',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0478,
    longitude: -77.4678,
    phone: '(571) 366-6894',
    website: 'https://topgolf.com/us/loudoun',
    hours: 'Mon-Thu 10am-11pm, Fri-Sat 10am-1am, Sun 10am-11pm',
    county: 'Loudoun County',
    description: 'Golf entertainment destination with high-tech hitting bays and family dining. Offers kids birthday parties and junior programs.',
    cost: '$30-60/hour per bay (up to 6 players)',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'golf-entertainment',
    features: ['golf', 'games', 'restaurant', 'bar', 'birthday-parties', 'junior-clubs'],
  },

  // FUN LAND / SMALLER VENUES
  {
    name: 'Fun Land of Fairfax',
    address: '10361 Lee Highway',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22030',
    latitude: 39.8578,
    longitude: -77.2858,
    phone: '(703) 385-3880',
    website: 'https://funlandoffairfax.com',
    hours: 'Mon-Thu 10am-9pm, Fri-Sat 10am-10pm, Sun 11am-8pm',
    county: 'Fairfax County',
    description: 'Local family fun center with mini golf, go-karts, batting cages, and arcade. Affordable family entertainment.',
    cost: 'Activities: $5-10/each',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'family-fun-center',
    features: ['mini-golf', 'go-karts', 'batting-cages', 'arcade', 'bumper-cars', 'birthday-parties'],
  },
  {
    name: "Shadowland Laser Adventures",
    address: '3035 Nutley Street',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22031',
    latitude: 38.8718,
    longitude: -77.2618,
    phone: '(703) 560-0707',
    website: 'https://shadowlandadventures.com',
    hours: 'Mon-Thu 3pm-9pm, Fri 3pm-11pm, Sat 10am-11pm, Sun 12pm-8pm',
    county: 'Fairfax County',
    description: 'Multi-level laser tag arena with blacklight adventure theme. Great for kids parties and family competitive fun.',
    cost: '$10-12/game',
    ageRange: 'Ages 6+',
    isFree: false,
    venueType: 'laser-tag',
    features: ['laser-tag', 'arcade', 'birthday-parties', 'group-events'],
  },
  {
    name: 'Escape Room Live Alexandria',
    address: '814 King Street',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22314',
    latitude: 38.8048,
    longitude: -77.0428,
    phone: '(800) 616-4880',
    website: 'https://escaperoomlive.com/alexandria',
    hours: 'Mon-Thu 3pm-9pm, Fri 3pm-11pm, Sat 10am-11pm, Sun 10am-9pm',
    county: 'City of Alexandria',
    description: 'Family-friendly escape rooms with puzzles and adventures for all ages. Includes kid-appropriate themes.',
    cost: '$30-40/person',
    ageRange: 'Ages 8+ (varies by room)',
    isFree: false,
    venueType: 'escape-room',
    features: ['escape-rooms', 'puzzles', 'team-building', 'birthday-parties'],
  },
  {
    name: 'Escape Room Live DC',
    address: '814 King Street',
    city: 'Washington',
    state: 'DC',
    zipCode: '20001',
    latitude: 38.9008,
    longitude: -77.0308,
    phone: '(800) 616-4880',
    website: 'https://escaperoomlive.com/dc',
    hours: 'Mon-Thu 3pm-9pm, Fri 3pm-11pm, Sat 10am-11pm, Sun 10am-9pm',
    county: 'District of Columbia',
    description: 'DC escape room experience with family-friendly and challenging rooms. Great for family bonding and problem-solving fun.',
    cost: '$30-40/person',
    ageRange: 'Ages 8+ (varies by room)',
    isFree: false,
    venueType: 'escape-room',
    features: ['escape-rooms', 'puzzles', 'team-building', 'birthday-parties'],
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'arcade-restaurant': { category: 'Indoor', subcategory: 'Arcade' },
    'kids-entertainment': { category: 'Indoor', subcategory: 'Kids Entertainment' },
    'entertainment-complex': { category: 'Indoor', subcategory: 'Entertainment Center' },
    'amusement-park': { category: 'Outdoor', subcategory: 'Amusement Park' },
    'go-kart': { category: 'Indoor', subcategory: 'Go-Karts' },
    'golf-entertainment': { category: 'Indoor', subcategory: 'Golf Entertainment' },
    'family-fun-center': { category: 'Outdoor', subcategory: 'Family Fun Center' },
    'laser-tag': { category: 'Indoor', subcategory: 'Laser Tag' },
    'escape-room': { category: 'Indoor', subcategory: 'Escape Room' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Entertainment' };
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
      source: 'family-entertainment-dmv',
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
      hasArcade: location.features.includes('arcade'),
      hasFood: location.features.includes('restaurant') || location.features.includes('pizza'),
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

async function scrapeFamilyEntertainmentDMV() {
  console.log(`\n🎮 FAMILY ENTERTAINMENT CENTERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🎮 Processing Family Entertainment Centers...');

  // Group by state
  const mdVenues = FAMILY_ENTERTAINMENT_CENTERS.filter(v => v.state === 'MD');
  const vaVenues = FAMILY_ENTERTAINMENT_CENTERS.filter(v => v.state === 'VA');
  const dcVenues = FAMILY_ENTERTAINMENT_CENTERS.filter(v => v.state === 'DC');

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
  console.log(`✅ FAMILY ENTERTAINMENT DMV SCRAPER COMPLETE`);
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

async function scrapeFamilyEntertainmentDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeFamilyEntertainmentDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Family Entertainment DMV Scraper');
  scrapeFamilyEntertainmentDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeFamilyEntertainmentDMV,
  scrapeFamilyEntertainmentDMVCloudFunction,
};
