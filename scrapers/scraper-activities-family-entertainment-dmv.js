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

const SCRAPER_NAME = 'FamilyEntertainment-Eastern';

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

  // ==========================================
  // EASTERN US EXPANSION — FAMILY ENTERTAINMENT
  // ==========================================

  // NEW YORK
  { name: 'Dave and Busters Times Square', address: '234 W 42nd St', city: 'New York', state: 'NY', zipCode: '10036', latitude: 40.7568, longitude: -73.9879, phone: '(646) 495-2015', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'New York County', description: 'Dave and Busters in Times Square with hundreds of arcade games, billiards, and American food. Family gaming for all ages.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Adventureland Farmingdale', address: '2245 Broad Hollow Rd', city: 'Farmingdale', state: 'NY', zipCode: '11735', latitude: 40.7337, longitude: -73.4143, phone: '(631) 694-6868', website: 'https://www.adventurelandusa.com', hours: 'Summer: Daily 11am-10pm; Spring/Fall: weekends only', county: 'Nassau County', description: 'Outdoor family amusement park on Long Island with rides, go-karts, mini golf, and arcade. All ages welcome.', cost: '$10-35/person', ageRange: 'All Ages', isFree: false, venueType: 'amusement-park', features: ['rides', 'go-karts', 'mini-golf', 'arcade', 'birthday-parties', 'outdoor'] },
  { name: 'Chuck E Cheese New York Yonkers', address: '2548 Central Park Ave', city: 'Yonkers', state: 'NY', zipCode: '10710', latitude: 40.9515, longitude: -73.8477, phone: '(914) 793-1177', website: 'https://www.chuckecheese.com', hours: 'Sun-Thu 10am-9pm, Fri-Sat 10am-10pm', county: 'Westchester County', description: 'Chuck E. Cheese in Yonkers with play structures, arcade games, and birthday party packages.', cost: '$15-25/person', ageRange: 'Ages 2-12', isFree: false, venueType: 'kids-entertainment', features: ['arcade', 'play-structures', 'birthday-parties', 'pizza'] },

  // NEW JERSEY
  { name: 'Dave and Busters Westfield', address: '450 State Route 35', city: 'Aberdeen', state: 'NJ', zipCode: '07747', latitude: 40.4200, longitude: -74.2237, phone: '(732) 988-1001', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Monmouth County', description: 'Dave and Busters in Monmouth County NJ with arcade games, billiards, and dining. Family friendly.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Diggerland USA West Berlin', address: '100 Pinedge Dr', city: 'West Berlin', state: 'NJ', zipCode: '08091', latitude: 39.8037, longitude: -74.9274, phone: '(856) 768-1110', website: 'https://www.diggerlandusa.com', hours: 'Seasonal Apr-Oct weekends, summer daily', county: 'Camden County', description: 'Unique construction-themed family park in NJ where kids operate real excavators, diggers, and construction equipment.', cost: '$32-42/person', ageRange: 'Ages 3+', isFree: false, venueType: 'theme-park', features: ['construction-rides', 'water-park', 'birthday-parties', 'unique-experience'] },

  // PENNSYLVANIA
  { name: 'Dave and Busters Philadelphia', address: '325 N Columbus Blvd', city: 'Philadelphia', state: 'PA', zipCode: '19106', latitude: 39.9529, longitude: -75.1390, phone: '(215) 413-1951', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Philadelphia County', description: 'Dave and Busters on the Philadelphia waterfront with arcade games, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Palace Entertainment Idlewild', address: '2574 US Route 30', city: 'Ligonier', state: 'PA', zipCode: '15658', latitude: 40.2326, longitude: -79.2368, phone: '(724) 238-3666', website: 'https://www.idlewild.com', hours: 'Seasonal May-Oct: Tue-Sun 10am-6pm', county: 'Westmoreland County', description: 'Classic family amusement park in Pennsylvania with Mister Rogers Neighborhood attraction, rides, and Story Book Forest.', cost: '$25-35/person', ageRange: 'All Ages', isFree: false, venueType: 'amusement-park', features: ['rides', 'story-book-forest', 'mr-rogers', 'water-park', 'birthday-parties'] },

  // CONNECTICUT
  { name: 'Dave and Busters Manchester CT', address: '194 Buckland Hills Dr', city: 'Manchester', state: 'CT', zipCode: '06042', latitude: 41.7876, longitude: -72.5282, phone: '(860) 644-1300', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Hartford County', description: 'Dave and Busters in Manchester CT with arcade games, billiards, and American dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },

  // MASSACHUSETTS
  { name: 'Dave and Busters Boston', address: '210 Old Orchard Shopping Ctr', city: 'Skokie', state: 'MA', zipCode: '02169', latitude: 42.2557, longitude: -71.0003, phone: '(781) 848-9600', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Norfolk County', description: 'Dave and Busters south of Boston in Quincy/Braintree area with arcade, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Canobie Lake Park Salem', address: '85 N Policy St', city: 'Salem', state: 'MA', zipCode: '03079', latitude: 42.8023, longitude: -71.2237, phone: '(603) 893-3506', website: 'https://www.canobie.com', hours: 'Seasonal May-Oct: daily 10am-9pm', county: 'Rockingham County', description: 'Classic New England amusement park in Salem NH (near MA border) with 85+ rides, water park, and live entertainment.', cost: '$25-40/person', ageRange: 'All Ages', isFree: false, venueType: 'amusement-park', features: ['rides', 'water-park', 'live-shows', 'birthday-parties', 'seasonal'] },

  // RHODE ISLAND
  { name: 'Dave and Busters Providence', address: '1 Providence Place', city: 'Providence', state: 'RI', zipCode: '02903', latitude: 41.8265, longitude: -71.4195, phone: '(401) 270-4555', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Providence County', description: 'Dave and Busters in Providence Place Mall with arcade games, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },

  // NORTH CAROLINA
  { name: 'Dave and Busters Charlotte', address: '4310 Sharon Rd', city: 'Charlotte', state: 'NC', zipCode: '28211', latitude: 35.1597, longitude: -80.8331, phone: '(704) 544-5555', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Mecklenburg County', description: 'Dave and Busters in Charlotte NC with arcade, billiards, and dining. Family friendly with games for all ages.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Frankie s Fun Park Charlotte', address: '4012 Yancey Rd', city: 'Charlotte', state: 'NC', zipCode: '28217', latitude: 35.2034, longitude: -80.9076, phone: '(704) 522-7888', website: 'https://www.frankiesfunpark.com', hours: 'Mon-Thu 12pm-9pm, Fri-Sat 10am-11pm, Sun 12pm-9pm', county: 'Mecklenburg County', description: 'Frankie s Fun Park with go-karts, mini golf, laser tag, batting cages, and arcade. Great for family outings.', cost: '$5-35 per activity', ageRange: 'All Ages', isFree: false, venueType: 'family-fun', features: ['go-karts', 'mini-golf', 'laser-tag', 'batting-cages', 'arcade', 'birthday-parties'] },

  // SOUTH CAROLINA
  { name: 'Medieval Times Myrtle Beach', address: '2904 Fantasy Way', city: 'Myrtle Beach', state: 'SC', zipCode: '29579', latitude: 33.7469, longitude: -78.9136, phone: '(866) 543-9637', website: 'https://www.medievaltimes.com/myrtle-beach', hours: 'Various shows Tue-Sun', county: 'Horry County', description: 'Medieval Times dinner and tournament with jousting knights, horses, and a 4-course feast. Spectacular family entertainment.', cost: '$50-65/person', ageRange: 'All Ages', isFree: false, venueType: 'dinner-show', features: ['dinner-show', 'jousting', 'live-performance', 'birthday-parties', 'unique-experience'] },

  // GEORGIA
  { name: 'Dave and Busters Atlanta', address: '2215 D W Briarcliff Rd NE', city: 'Atlanta', state: 'GA', zipCode: '30329', latitude: 33.8109, longitude: -84.3319, phone: '(404) 320-6100', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'DeKalb County', description: 'Dave and Busters in Atlanta with arcade games, billiards, and dining. Family friendly with games for all ages.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Stars and Strikes Kennesaw', address: '2700 Town Center Dr', city: 'Kennesaw', state: 'GA', zipCode: '30144', latitude: 34.0343, longitude: -84.6139, phone: '(770) 422-7005', website: 'https://www.starsandstrikes.com', hours: 'Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 12pm-9pm', county: 'Cobb County', description: 'Stars and Strikes family entertainment in Kennesaw GA with bowling, laser tag, arcade, and go-karts.', cost: '$5-35 per activity', ageRange: 'All Ages', isFree: false, venueType: 'family-fun', features: ['bowling', 'laser-tag', 'arcade', 'go-karts', 'birthday-parties'] },

  // FLORIDA
  { name: 'Dave and Busters Jacksonville', address: '7631 Gate Pkwy', city: 'Jacksonville', state: 'FL', zipCode: '32256', latitude: 30.2384, longitude: -81.5526, phone: '(904) 997-4011', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Duval County', description: 'Dave and Busters in Jacksonville FL with arcade games, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Andretti Indoor Karting Orlando', address: '9299 Universal Blvd', city: 'Orlando', state: 'FL', zipCode: '32819', latitude: 28.4659, longitude: -81.4628, phone: '(407) 988-0040', website: 'https://www.andrettikarting.com', hours: 'Mon-Thu 11am-10pm, Fri-Sat 11am-12am, Sun 11am-9pm', county: 'Orange County', description: 'Andretti Indoor Karting in Orlando with go-karts, laser tag, bowling, arcade, and VR. Massive family entertainment complex.', cost: '$15-45 per activity', ageRange: 'All Ages', isFree: false, venueType: 'family-fun', features: ['go-karts', 'laser-tag', 'bowling', 'arcade', 'vr', 'birthday-parties'] },

  // ALABAMA
  { name: 'Dave and Busters Hoover', address: '2000 Riverchase Galleria', city: 'Hoover', state: 'AL', zipCode: '35244', latitude: 33.3794, longitude: -86.7990, phone: '(205) 990-2450', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Jefferson County', description: 'Dave and Busters in the Riverchase Galleria in Hoover AL with arcade, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },

  // MISSISSIPPI
  { name: 'Fun Zone Jackson', address: '1 Lakeland Dr', city: 'Jackson', state: 'MS', zipCode: '39216', latitude: 32.3456, longitude: -90.1234, phone: '(601) 981-9800', website: 'https://www.funzonejackson.com', hours: 'Mon-Thu 11am-9pm, Fri-Sat 11am-11pm, Sun 12pm-8pm', county: 'Hinds County', description: 'Family entertainment center in Jackson MS with go-karts, mini golf, laser tag, and arcade games.', cost: '$5-25 per activity', ageRange: 'All Ages', isFree: false, venueType: 'family-fun', features: ['go-karts', 'mini-golf', 'laser-tag', 'arcade', 'birthday-parties'] },

  // TENNESSEE
  { name: 'Dave and Busters Nashville', address: '1975 Galleria Blvd', city: 'Franklin', state: 'TN', zipCode: '37067', latitude: 35.9671, longitude: -86.8364, phone: '(615) 771-7700', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Williamson County', description: 'Dave and Busters in Cool Springs Galleria near Nashville with arcade games, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
  { name: 'Gatlinburg SkyPark', address: '805 Parkway', city: 'Gatlinburg', state: 'TN', zipCode: '37738', latitude: 35.7143, longitude: -83.5129, phone: '(865) 436-4307', website: 'https://www.gatlinburgskypark.com', hours: 'Daily 9am-9pm (seasonal hours)', county: 'Sevier County', description: 'Mountain adventure park in Gatlinburg TN with Sky Bridge, zip lines, and mountain-top views. Family adventure for all ages.', cost: '$25-40/person', ageRange: 'All Ages', isFree: false, venueType: 'adventure-park', features: ['sky-bridge', 'zip-lines', 'mountain-views', 'adventure', 'birthday-parties'] },

  // KENTUCKY
  { name: 'Dave and Busters Louisville', address: '4600 Shelbyville Rd', city: 'Louisville', state: 'KY', zipCode: '40207', latitude: 38.2486, longitude: -85.6254, phone: '(502) 893-4600', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'Jefferson County', description: 'Dave and Busters in Louisville KY at St. Matthews with arcade games, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },

  // WEST VIRGINIA
  { name: 'GameWorks Charleston', address: '3000 Town Center Dr', city: 'Charleston', state: 'WV', zipCode: '25389', latitude: 38.3984, longitude: -81.6998, phone: '(304) 925-8000', website: 'https://www.gameworkscharleston.com', hours: 'Mon-Thu 12pm-9pm, Fri-Sat 11am-11pm, Sun 12pm-8pm', county: 'Kanawha County', description: 'Family entertainment center in Charleston WV with arcade games, laser tag, and birthday party packages.', cost: '$10-30 per activity', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'laser-tag', 'birthday-parties', 'family-fun'] },

  // DELAWARE
  { name: 'Dave and Busters Wilmington', address: '1600 Wilmington Pike', city: 'Glen Mills', state: 'DE', zipCode: '19342', latitude: 39.8920, longitude: -75.5157, phone: '(610) 358-8900', website: 'https://www.daveandbusters.com', hours: 'Mon-Thu 10am-12am, Fri-Sat 10am-2am, Sun 10am-12am', county: 'New Castle County', description: 'Dave and Busters near Wilmington DE at Brandywine Town Center with arcade, billiards, and dining.', cost: '$20-40 game play', ageRange: 'All Ages', isFree: false, venueType: 'arcade', features: ['arcade', 'billiards', 'dining', 'birthday-parties'] },
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

async function scrapeFamilyEntertainmentDMV() {
  console.log(`\n🎮 FAMILY ENTERTAINMENT CENTERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🎮 Processing Family Entertainment Centers...');

  // Group by state
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of FAMILY_ENTERTAINMENT_CENTERS) {
    if (!stateGroups[venue.state]) stateGroups[venue.state] = [];
    stateGroups[venue.state].push(venue);
  }
  for (const [state, venues] of Object.entries(stateGroups).sort()) {
    console.log(`
  ${state} (${venues.length} venues):`);
    for (const location of venues) {
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
