#!/usr/bin/env node

/**
 * ADD WATER PARKS, NATURE, UNIQUE EXPERIENCES & DESTINATION PLAYGROUNDS
 *
 * Imports:
 *   1. Water parks & family pools
 *   2. Nature centers, trails & botanical gardens
 *   3. Heritage railroads & boat rides
 *   4. Bowling, arcades, roller skating & escape rooms
 *   5. Drive-in & outdoor movie theaters
 *   6. Destination & inclusive playgrounds
 *
 * Usage:
 *   node add-waterparks-nature-unique-playgrounds.js          # Run full import
 *   node add-waterparks-nature-unique-playgrounds.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('./scrapers/venue-matcher');

const SCRAPER_NAME = 'Waterparks-Nature-Unique-Playgrounds-2026';

// ==========================================
// 1. WATER PARKS & FAMILY POOLS
// ==========================================

const WATER_PARKS = [
  { name: 'Great Wolf Lodge - Perryville', address: '1164 Pulaski Hwy', city: 'Perryville', state: 'MD', zipCode: '21903', latitude: 39.5596, longitude: -76.0636, phone: '(410) 378-7000', website: 'https://www.greatwolf.com/maryland', description: 'Massive indoor water park resort with 22 water slides, wave pool, lazy river, Fort Mackenzie water treehouse, and kiddie pool area. Day passes sometimes available. Hotel guests get unlimited water park access.', cost: '$250-500/night (hotel)', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Hurricane Harbor Maryland', address: '13710 Central Ave', city: 'Bowie', state: 'MD', zipCode: '20721', latitude: 38.9025, longitude: -76.7695, website: 'https://www.sixflags.com/hurricaneharbormaryland', description: 'Maryland\'s largest water park with thrilling slides, wave pool, lazy river, and Buccaneer Beach kids\' area with pint-sized slides and water play. Formerly Six Flags water park.', cost: '$30-50/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Water Country USA', address: '176 Water Country Pkwy', city: 'Williamsburg', state: 'VA', zipCode: '23185', latitude: 37.2596, longitude: -76.6402, phone: '(757) 229-9300', website: 'https://www.watercountryusa.com', description: 'Virginia\'s largest water park with 40+ rides and slides, wave pool, lazy river, and kids\' water play areas. Family raft rides, speed slides, and relaxation areas. Part of SeaWorld Parks.', cost: '$40-65/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'SplashDown Waterpark', address: '7500 Ben Lomond Park Rd', city: 'Manassas', state: 'VA', zipCode: '20109', latitude: 38.7561, longitude: -77.4798, phone: '(703) 361-4451', website: 'https://www.splashdownwaterpark.com', description: 'Family-friendly outdoor water park with four-story slides, cannonball slide, lily pad walk, lazy river, activity pool, and toddler splash area. Perfect for a hot summer day.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Chesapeake Beach Water Park', address: '4079 Gordon Stinnett Ave', city: 'Chesapeake Beach', state: 'MD', zipCode: '20732', latitude: 38.6864, longitude: -76.5345, phone: '(410) 257-1404', website: 'https://www.chesapeakebeachwaterpark.com', description: 'Bayside water park with tube slides, raft slide, kiddie slides, lazy river, lap pool, and activity pool. Great day trip from DC with beach town charm. Residents get discounted rates.', cost: '$10-20/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Bohrer Park at Summit Hall Farm', address: '506 S Frederick Ave', city: 'Gaithersburg', state: 'MD', zipCode: '20877', latitude: 39.1316, longitude: -77.2074, phone: '(301) 258-6350', website: 'https://www.gaithersburgmd.gov', description: 'Popular community water park with large and small water slides, fountains, interactive spray features, lap pool, and playground. Affordable family fun in the heart of Gaithersburg.', cost: '$5-10/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Freedom Aquatic & Fitness Center', address: '9009 Highridge Dr', city: 'Manassas', state: 'VA', zipCode: '20110', latitude: 38.7505, longitude: -77.4930, phone: '(703) 792-8200', website: 'https://www.manassascity.org', description: 'Indoor leisure pool with zero-entry area, tumble buckets, water slides, current channel, and swirling vortex. Year-round family swimming in a warm, covered facility.', cost: '$5-10/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'North Arundel Aquatic Center', address: '7888 Crain Hwy S', city: 'Glen Burnie', state: 'MD', zipCode: '21061', latitude: 39.1570, longitude: -76.6265, phone: '(410) 222-6244', website: 'https://www.aacounty.org', description: 'Indoor aquatic center with zero-depth entry, 134-foot water slide, splash-down area, dumping water buckets, preschool slide, water vortex, and lap pool. Fun year-round.', cost: '$5-8/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Germantown Indoor Swim Center', address: '18000 Central Park Cir', city: 'Boyds', state: 'MD', zipCode: '20841', latitude: 39.1730, longitude: -77.2610, phone: '(240) 777-6830', website: 'https://www.montgomerycountymd.gov', description: 'Indoor aquatic facility with leisure pool, water slides, interactive water play features, and lap lanes. Great rainy-day option for families with young kids.', cost: '$5-8/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Columbia Association Pools', address: '10221 Wincopin Cir', city: 'Columbia', state: 'MD', zipCode: '21044', latitude: 39.2040, longitude: -76.8610, website: 'https://www.columbiaassociation.org', description: '23 outdoor pools and two mini water parks across Howard County. Various pool types including tot pools, lap lanes, diving boards, and water features. Day passes available for non-residents.', cost: '$5-15/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
];

// ==========================================
// 2. NATURE CENTERS, TRAILS & GARDENS
// ==========================================

const NATURE_VENUES = [
  { name: 'Rock Creek Park Nature Center & Planetarium', address: '5200 Glover Rd NW', city: 'Washington', state: 'DC', zipCode: '20015', latitude: 38.9572, longitude: -77.0520, phone: '(202) 895-6070', website: 'https://www.nps.gov/rocr', description: 'Free nature center with live animal exhibits, planetarium shows, interactive discovery room, and miles of wooded trails. Great loop trail starts at the center. Open Wed-Sun 9am-5pm.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Brookside Gardens', address: '1800 Glenallan Ave', city: 'Wheaton', state: 'MD', zipCode: '20902', latitude: 39.0560, longitude: -77.0420, phone: '(301) 962-1400', website: 'https://www.montgomeryparks.org/parks-and-trails/brookside-gardens/', description: 'Free 50-acre award-winning public garden with Children\'s Garden, Butterfly Garden, Japanese Garden, Aquatic Garden, Rose Garden, and two conservatories. Walking paths, seasonal exhibits, and family programs.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'botanical-garden', isIndoor: false },
  { name: 'Brookside Nature Center', address: '1400 Glenallan Ave', city: 'Wheaton', state: 'MD', zipCode: '20902', latitude: 39.0545, longitude: -77.0435, phone: '(301) 946-9071', website: 'https://www.montgomeryparks.org', description: 'Nature center with live reptiles, amphibians, and insects. Interactive exhibits about local ecosystems, plus trails through surrounding parkland. Great for curious toddlers and young kids.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Croydon Creek Nature Center', address: '852 Avery Rd', city: 'Rockville', state: 'MD', zipCode: '20851', latitude: 39.0905, longitude: -77.1350, phone: '(240) 314-8770', website: 'https://www.rockvillemd.gov/croydoncreek', description: 'Free nature center with live animals, nature exhibits, gardens, playground, and 1.3 miles of wooded trails along Croydon Creek. Family nature programs, camps, and seasonal events.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Gulf Branch Nature Center', address: '3608 N Military Rd', city: 'Arlington', state: 'VA', zipCode: '22207', latitude: 38.9145, longitude: -77.1168, phone: '(703) 228-3403', website: 'https://www.arlingtonva.us', description: 'Nature center with natural and cultural history exhibits, live animals, wooded trails, pollinator garden, vernal pond, and a restored 19th-century log cabin. Free family programs.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Long Branch Nature Center', address: '625 S Carlin Springs Rd', city: 'Arlington', state: 'VA', zipCode: '22204', latitude: 38.8620, longitude: -77.1095, phone: '(703) 228-6535', website: 'https://www.arlingtonva.us', description: 'Nature center with turtle pond, live snakes, fish tanks, and interactive exhibits on local wildlife. Wooded trails, creek exploration, and nature programs for young kids.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Locust Grove Nature Center', address: '7777 Democracy Blvd', city: 'Bethesda', state: 'MD', zipCode: '20817', latitude: 39.0245, longitude: -77.1430, phone: '(301) 765-8660', website: 'https://www.montgomeryparks.org', description: 'Nature center with woodland trails, live animals, family programs, and a teaching garden. Located in Cabin John Regional Park near the popular miniature train and playground.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Huntley Meadows Park', address: '3701 Lockheed Blvd', city: 'Alexandria', state: 'VA', zipCode: '22306', latitude: 38.7570, longitude: -77.1000, phone: '(703) 768-2525', website: 'https://www.fairfaxcounty.gov/parks/huntley-meadows-park', description: 'Premier wetland park with boardwalk trail through marshes. Incredible birdwatching — herons, egrets, beavers, turtles, and frogs. Visitor center with exhibits. One of the best nature walks in NOVA.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-trail', isIndoor: false },
  { name: 'Meadowlark Botanical Gardens', address: '9750 Meadowlark Gardens Ct', city: 'Vienna', state: 'VA', zipCode: '22182', latitude: 38.9245, longitude: -77.2745, phone: '(703) 255-3631', website: 'https://www.novaparks.com/parks/meadowlark-botanical-gardens', description: '95-acre garden blending native and exotic plants. Walking trails, lake, Korean Bell Garden, children\'s garden area, and seasonal events including Winter Walk of Lights. Open daily 10am-7:30pm spring/summer.', cost: '$5-8/person', ageRange: 'All Ages', isFree: false, type: 'botanical-garden', isIndoor: false },
  { name: 'US Botanic Garden', address: '100 Maryland Ave SW', city: 'Washington', state: 'DC', zipCode: '20001', latitude: 38.8882, longitude: -77.0128, phone: '(202) 225-8333', website: 'https://www.usbg.gov', description: 'Free botanical garden at the foot of the Capitol with conservatory, outdoor gardens, and a recently reopened children\'s garden with hands-on plant exploration. Tropical, desert, and native plant collections.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'botanical-garden', isIndoor: false },
  { name: 'River Farm', address: '7931 E Boulevard Dr', city: 'Alexandria', state: 'VA', zipCode: '22308', latitude: 38.7250, longitude: -77.0560, website: 'https://www.ahsgardening.org/river-farm', description: '25-acre historic site on the Potomac with award-winning children\'s garden featuring over a dozen themed areas. Meadows, woodland walks, and river views. Free admission, open weekdays and select weekends.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'botanical-garden', isIndoor: false },
  { name: 'Turkey Run Park', address: 'GW Memorial Pkwy', city: 'McLean', state: 'VA', zipCode: '22101', latitude: 38.9640, longitude: -77.1505, website: 'https://www.nps.gov/gwmp/planyourvisit/turkeyrun.htm', description: 'Nearly 700 acres of woods and trails along the Potomac River. Streams, ravines, and moderate kid-friendly hiking. Access via George Washington Memorial Parkway near I-495.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-trail', isIndoor: false },
  { name: 'Calvert Cliffs State Park', address: '10540 H G Trueman Rd', city: 'Lusby', state: 'MD', zipCode: '20657', latitude: 38.3936, longitude: -76.4497, phone: '(301) 743-7613', website: 'https://dnr.maryland.gov/publiclands/pages/southern/calvertcliffs.aspx', description: 'Hike 1.8 miles through forest to a Chesapeake Bay beach where kids hunt for millions-of-years-old shark teeth and fossils in the cliff base. One of Maryland\'s most unique family hikes.', cost: '$5 parking', ageRange: 'Ages 3+', isFree: false, type: 'nature-trail', isIndoor: false },
  { name: 'Kenilworth Aquatic Gardens', address: '1550 Anacostia Ave NE', city: 'Washington', state: 'DC', zipCode: '20019', latitude: 38.9132, longitude: -76.9430, phone: '(202) 692-6080', website: 'https://www.nps.gov/keaq', description: 'Only National Park dedicated to water plants. Stunning lotus and water lily gardens bloom June-August. Boardwalk trail through marsh habitat with turtles, herons, and frogs. Free admission.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'botanical-garden', isIndoor: false },
];

// ==========================================
// 3. HERITAGE RAILROADS & BOAT RIDES
// ==========================================

const RAILROADS_BOATS = [
  { name: 'Western Maryland Scenic Railroad', address: '13 Canal St', city: 'Cumberland', state: 'MD', zipCode: '21502', latitude: 39.6496, longitude: -78.7638, phone: '(301) 759-4400', website: 'https://wmsr.com', description: 'Award-winning scenic train ride through Allegheny Mountains between Cumberland and Frostburg. Largest operating steam locomotive of its type in the world. Family events include Ice Cream Trains, Pumpkin Patch Express, and Polar Express.', cost: '$35-60/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: false },
  { name: 'Walkersville Southern Railroad', address: '34 W Pennsylvania Ave', city: 'Walkersville', state: 'MD', zipCode: '21793', latitude: 39.4872, longitude: -77.3519, phone: '(301) 898-0899', website: 'https://wsrr.org', description: 'Scenic train rides through Frederick County countryside. Family-friendly excursions including Easter Bunny, Mother\'s Day, ice cream trains, and fall foliage rides. Museum with railroad artifacts.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: false },
  { name: 'Wilmington & Western Railroad', address: '2201 Newport Gap Pike', city: 'Wilmington', state: 'DE', zipCode: '19808', latitude: 39.7408, longitude: -75.6112, phone: '(302) 998-1930', website: 'https://wwrr.com', description: 'Historic train rides through the Red Clay Valley since 1867. One of Delaware\'s leading tourist attractions. Themed rides include Easter Bunny Express, Princess Train, Haunted Halloween, and Santa\'s Magical Express.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: false },
  { name: 'B&O Railroad Museum', address: '901 W Pratt St', city: 'Baltimore', state: 'MD', zipCode: '21223', latitude: 39.2854, longitude: -76.6327, phone: '(410) 752-2490', website: 'https://www.borail.org', description: 'Birthplace of American railroading with the oldest and most comprehensive collection of railroad artifacts. Kids ride a mini train, explore historic locomotives, and enjoy interactive exhibits.', cost: '$18-22/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: true },
  { name: 'Cabin John Regional Park Miniature Train', address: '7410 Tuckerman Ln', city: 'Bethesda', state: 'MD', zipCode: '20817', latitude: 39.0230, longitude: -77.1410, phone: '(301) 765-8670', website: 'https://www.montgomeryparks.org', description: 'Miniature train ride through the woods at Cabin John Regional Park. Perfect for toddlers and young kids. Adjacent to adventure playground, dog park, and nature center.', cost: '$3-5/ride', ageRange: 'All Ages', isFree: false, type: 'train-ride', isIndoor: false },
  { name: 'Pirate Adventures on the Chesapeake', address: '311 Third St', city: 'Annapolis', state: 'MD', zipCode: '21403', latitude: 38.9742, longitude: -76.4832, phone: '(410) 263-0002', website: 'https://www.chesapeakepirates.com', description: 'Interactive pirate ship cruise for kids! Young pirates dress up, read treasure maps, fire water cannons, and find sunken treasure in Annapolis Harbor. 75-minute swashbuckling family adventure.', cost: '$25-30/person', ageRange: 'Ages 2-10', isFree: false, type: 'boat-ride', isIndoor: false },
  { name: 'Urban Pirates', address: '913 S Ann St', city: 'Baltimore', state: 'MD', zipCode: '21231', latitude: 39.2810, longitude: -76.5910, phone: '(410) 327-8378', website: 'https://www.urbanpirates.com', description: 'Pirate-themed cruises from Fell\'s Point. The crew guides families through pirate dances, games, water cannon battles, and treasure hunts aboard the ship Fearless. Public and private cruises available.', cost: '$25-30/person', ageRange: 'Ages 2-12', isFree: false, type: 'boat-ride', isIndoor: false },
  { name: 'Tidal Basin Paddle Boats', address: '1501 Maine Ave SW', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8837, longitude: -77.0374, phone: '(202) 479-2426', website: 'https://tidalbasinpaddleboats.com', description: 'Pedal boat and swan boat rentals on the Tidal Basin with views of the Jefferson Memorial, Washington Monument, and cherry blossom trees. Iconic DC family activity.', cost: '$18-35/boat', ageRange: 'All Ages', isFree: false, type: 'boat-ride', isIndoor: false },
  { name: 'C&D Canal Cruises', address: '215 Bohemia Ave', city: 'Chesapeake City', state: 'MD', zipCode: '21915', latitude: 39.5269, longitude: -75.8093, phone: '(410) 885-5088', website: 'https://www.mvsummerbreeze.com', description: 'Scenic cruises on the Chesapeake & Delaware Canal. Family sightseeing tours, crab feasts, sunset cruises, and themed events aboard the M/V Summer Breeze. Charming waterfront town.', cost: '$18-30/person', ageRange: 'All Ages', isFree: false, type: 'boat-ride', isIndoor: false },
];

// ==========================================
// 4. BOWLING, ARCADES, SKATING & ESCAPE ROOMS
// ==========================================

const ENTERTAINMENT_VENUES = [
  // --- Bowling ---
  { name: 'Bowlero College Park', address: '9021 Baltimore Ave', city: 'College Park', state: 'MD', zipCode: '20740', latitude: 39.0003, longitude: -76.9280, website: 'https://www.bowlero.com', description: 'Modern bowling entertainment center with glow-in-the-dark lanes, bumper bowling for kids, arcade games, and a sports bar. Kids Bowl Free program during summer.', cost: '$6-12/game', ageRange: 'All Ages', isFree: false, type: 'bowling', isIndoor: true },
  { name: 'Bowlero Centreville', address: '6201 Multiplex Dr', city: 'Centreville', state: 'VA', zipCode: '20121', latitude: 38.8372, longitude: -77.4333, website: 'https://www.bowlero.com', description: 'Upscale bowling with arcade, laser tag, and bumper bowling for little ones. Neon lights and music create a fun family atmosphere. Party packages available.', cost: '$6-12/game', ageRange: 'All Ages', isFree: false, type: 'bowling', isIndoor: true },
  { name: 'Bowl America - Fairfax', address: '9699 Fairfax Blvd', city: 'Fairfax', state: 'VA', zipCode: '22031', latitude: 38.8598, longitude: -77.2838, website: 'https://www.bowl-america.com', description: 'Family-friendly bowling center with bumper bowling, lightweight balls for kids, birthday party packages, and a game room. Multiple NOVA locations.', cost: '$5-10/game', ageRange: 'All Ages', isFree: false, type: 'bowling', isIndoor: true },
  { name: 'Pinstripes Georgetown', address: '1064 Wisconsin Ave NW', city: 'Washington', state: 'DC', zipCode: '20007', latitude: 38.9053, longitude: -77.0633, phone: '(202) 706-5610', website: 'https://pinstripes.com', description: 'Upscale bowling and bocce in Georgetown with Italian-American bistro dining. 16 lanes, kids\' menu with $10 meals, and Sunday half-price kids\' specials. A unique family outing.', cost: '$7-15/game', ageRange: 'All Ages', isFree: false, type: 'bowling', isIndoor: true },
  { name: 'Shake & Bake Family Fun Center', address: '4100 Reisterstown Rd', city: 'Baltimore', state: 'MD', zipCode: '21215', latitude: 39.3309, longitude: -76.6667, phone: '(410) 396-4044', website: 'https://bcrp.baltimorecity.gov/shake-bake-family-fun-center', description: 'Baltimore city-operated family center with 32-lane bowling with bumpers and roller skating rink. Affordable family fun — one of the best deals in the Baltimore area.', cost: '$3-8/activity', ageRange: 'All Ages', isFree: false, type: 'bowling', isIndoor: true },

  // --- Arcades & Entertainment Centers ---
  { name: 'Main Event - Columbia', address: '6181 Old Dobbin Ln', city: 'Columbia', state: 'MD', zipCode: '21045', latitude: 39.1973, longitude: -76.8345, website: 'https://www.mainevent.com', description: 'Mega entertainment center with bowling, laser tag, massive arcade, billiards, gravity ropes, and mini golf. Eat-and-play combos make it a great value for families.', cost: '$15-35/person', ageRange: 'All Ages', isFree: false, type: 'arcade', isIndoor: true },
  { name: 'Round 1 - Wheaton', address: '11160 Veirs Mill Rd', city: 'Wheaton', state: 'MD', zipCode: '20902', latitude: 39.0450, longitude: -77.0520, website: 'https://www.round1usa.com', description: 'Japanese-style entertainment center with massive arcade, bowling, billiards, karaoke, and darts. Imported Japanese arcade games and giant collection of claw machines with brand-name prizes.', cost: '$5-20/activity', ageRange: 'All Ages', isFree: false, type: 'arcade', isIndoor: true },
  { name: 'Dave & Buster\'s - Arundel Mills', address: '7000 Arundel Mills Cir', city: 'Hanover', state: 'MD', zipCode: '21076', latitude: 39.1544, longitude: -76.7241, website: 'https://www.daveandbusters.com', description: 'Huge arcade and entertainment venue with hundreds of games, VR experiences, sports viewing, and a full restaurant. Win tickets and trade for prizes. Multiple DMV locations.', cost: '$10-30/person', ageRange: 'All Ages', isFree: false, type: 'arcade', isIndoor: true },

  // --- Roller Skating ---
  { name: 'Laurel Roller Skating Center', address: '9890 Brewers Ct', city: 'Laurel', state: 'MD', zipCode: '20723', latitude: 39.0977, longitude: -76.8445, phone: '(301) 725-2244', website: 'https://www.laurelskating.com', description: 'Classic roller skating rink with family skate sessions, weekend DJ nights, birthday parties, and a game room. Rental skates available. A nostalgic family outing.', cost: '$8-12/person', ageRange: 'All Ages', isFree: false, type: 'skating', isIndoor: true },
  { name: 'Skate Zone - Crofton', address: '1800 Rosemary Hills Dr', city: 'Crofton', state: 'MD', zipCode: '21114', latitude: 39.0095, longitude: -76.6871, phone: '(410) 721-7444', website: 'https://www.skatezone.us', description: 'Family roller skating center with open skate sessions, Tiny Tot mornings, birthday parties, and arcade games. Regular theme nights and special events.', cost: '$8-12/person', ageRange: 'All Ages', isFree: false, type: 'skating', isIndoor: true },
  { name: 'Skate-N-Fun Zone', address: '7878 Sudley Rd', city: 'Manassas', state: 'VA', zipCode: '20109', latitude: 38.7667, longitude: -77.4823, phone: '(703) 361-7465', website: 'https://www.skatenfunzone.com', description: 'Roller skating, bounce houses, arcade, and play structures. Perfect for young kids with dedicated toddler areas and family skate sessions. Birthday party venue.', cost: '$8-14/person', ageRange: 'All Ages', isFree: false, type: 'skating', isIndoor: true },

  // --- Escape Rooms ---
  { name: 'The Escape Game - Georgetown', address: '3345 M St NW', city: 'Washington', state: 'DC', zipCode: '20007', latitude: 38.9050, longitude: -77.0640, phone: '(202) 450-6072', website: 'https://theescapegame.com/washington-dc/', description: 'Nine themed escape rooms with immersive sets and puzzles. All ages welcome — kids 4 and under free. Themes range from prison breaks to gold rush adventures. Voted best escape room in DC.', cost: '$35-42/person', ageRange: 'All Ages', isFree: false, type: 'escape-room', isIndoor: true },
  { name: 'Escapology - National Harbor', address: '170 American Way', city: 'National Harbor', state: 'MD', zipCode: '20745', latitude: 38.7836, longitude: -77.0158, website: 'https://www.escapology.com/en/national-harbor-md', description: 'Pirate adventures and Scooby-Doo themed escape rooms perfect for families. Kids Mode (ages 7-14) gives unlimited hints via walkie-talkie. Multiple themed rooms for different skill levels.', cost: '$30-38/person', ageRange: 'Ages 7+', isFree: false, type: 'escape-room', isIndoor: true },
  { name: 'Escapology - Fairfax', address: '11935 Grand Commons Ave', city: 'Fairfax', state: 'VA', zipCode: '22030', latitude: 38.8580, longitude: -77.3700, website: 'https://www.escapology.com/en/fairfax-va', description: 'Family-friendly escape rooms including pirate and mystery themes. Kids Mode for ages 7-14 with unlimited hints. Great for birthday parties and family outings at Fairfax Corner.', cost: '$30-38/person', ageRange: 'Ages 7+', isFree: false, type: 'escape-room', isIndoor: true },
  { name: 'Clue IQ', address: '122 E Patrick St', city: 'Frederick', state: 'MD', zipCode: '21701', latitude: 39.4143, longitude: -77.4098, phone: '(301) 668-0077', website: 'https://clueiq.com', description: 'Immersive family-friendly escape rooms in downtown Frederick. Multiple themed rooms with varying difficulty. Great combined with a visit to charming downtown Frederick shops and restaurants.', cost: '$28-35/person', ageRange: 'Ages 8+', isFree: false, type: 'escape-room', isIndoor: true },
  { name: 'Escape Room Herndon', address: '793 Center St', city: 'Herndon', state: 'VA', zipCode: '20170', latitude: 38.9698, longitude: -77.3860, phone: '(571) 520-3695', website: 'https://escaperoomherndon.com', description: 'Most awarded locally-owned escape room in the DMV. Immersive adventures designed for friends, families, and teams. Multiple difficulty levels with engaging storylines.', cost: '$30-38/person', ageRange: 'Ages 8+', isFree: false, type: 'escape-room', isIndoor: true },
];

// ==========================================
// 5. DRIVE-IN & OUTDOOR MOVIE THEATERS
// ==========================================

const DRIVE_INS = [
  { name: 'Bengies Drive-In Theatre', address: '3417 Eastern Blvd', city: 'Middle River', state: 'MD', zipCode: '21220', latitude: 39.3280, longitude: -76.4520, phone: '(410) 687-5627', website: 'https://www.bengies.com', description: 'Home of the largest movie theater screen in the US! Classic drive-in experience since 1956. Double and triple features on weekends. Snack bar with classic drive-in food. A true family tradition.', cost: '$12-14/person', ageRange: 'All Ages', isFree: false, type: 'drive-in', isIndoor: false },
  { name: 'Family Drive-In Theatre', address: '5890 Valley Pike', city: 'Stephens City', state: 'VA', zipCode: '22655', latitude: 39.0916, longitude: -78.2179, phone: '(540) 869-1740', website: 'https://www.thefamilydrivein.com', description: 'Two-screen drive-in theater operating since 1956. Double features every night during the season. Pet-friendly, snack bar, and that classic drive-in feel. Great family road trip from DMV.', cost: '$10-12/person', ageRange: 'All Ages', isFree: false, type: 'drive-in', isIndoor: false },
  { name: 'Union Market Drive-In Movies', address: '1309 5th St NE', city: 'Washington', state: 'DC', zipCode: '20002', latitude: 38.9081, longitude: -76.9976, website: 'https://www.unionmarketdc.com', description: 'Outdoor movie screenings in the parking lot at Union Market. Park your car or bring chairs and blankets. Food trucks and Union Market vendors nearby. Seasonal Friday evening showings.', cost: '$15-20/car', ageRange: 'All Ages', isFree: false, type: 'drive-in', isIndoor: false },
];

// ==========================================
// 6. DESTINATION & INCLUSIVE PLAYGROUNDS
// ==========================================

const PLAYGROUNDS = [
  { name: 'Watkins Regional Park - Wizard of Oz Playground', address: '301 Watkins Park Dr', city: 'Upper Marlboro', state: 'MD', zipCode: '20774', latitude: 38.8799, longitude: -76.7960, phone: '(301) 218-6700', website: 'https://www.pgparks.com', description: 'Wizard of Oz-themed playground with yellow brick road, rainbow arch, Emerald City towers, Munchkin Land, Dorothy\'s Ruby Slipper slide, and Toto\'s doghouse. Plus carousel, mini train, mini golf, nature center, and farm across the street.', cost: 'Free (playground)', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Clemyjontri Park', address: '6317 Georgetown Pike', city: 'McLean', state: 'VA', zipCode: '22101', latitude: 38.9579, longitude: -77.1762, phone: '(703) 388-2807', website: 'https://www.fairfaxcounty.gov/parks/clemyjontri', description: 'Rainbow-colored fully inclusive playground where children of all abilities play together. Lowered monkey bars, high-backed swings, wheelchair swing, ramps, Braille signage, carousel, and splash pad. A must-visit destination playground.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Burke Lake Park Playground', address: '7315 Ox Rd', city: 'Fairfax Station', state: 'VA', zipCode: '22039', latitude: 38.7610, longitude: -77.2970, phone: '(703) 323-6600', website: 'https://www.fairfaxcounty.gov/parks/burke-lake', description: 'Massive colorful inclusive playground next to Burke Lake. Accessible for kids of all abilities. Also features a miniature train, carousel, ice cream shop, fishing, disc golf, and lakeside trails.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Walker Mill Regional Park Playground', address: '8840 Walker Mill Rd', city: 'Capitol Heights', state: 'MD', zipCode: '20743', latitude: 38.8620, longitude: -76.8380, website: 'https://www.pgparks.com', description: 'Wizard of Oz themed playground with yellow brick road entry, rainbow track, 7-10 play structures from Emerald City to Ruby Slipper Slide to a barn with chicken coop. One of MD\'s most creative playgrounds.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Sophie and Madigan\'s Playground', address: '235 Dill Ave', city: 'Frederick', state: 'MD', zipCode: '21701', latitude: 39.4280, longitude: -77.4030, website: 'https://www.cityoffrederickmd.gov', description: 'One of Maryland\'s newest and most creative inclusive playgrounds. Colorful climbing castle, music garden, swings, themed play zones, and equipment designed for both physical play and creative exploration for all abilities.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Hagerstown City Park Inclusive Playground', address: '501 Virginia Ave', city: 'Hagerstown', state: 'MD', zipCode: '21740', latitude: 39.6409, longitude: -77.7195, website: 'https://www.hagerstownmd.org', description: 'Fully inclusive playground designed for kids with a wide range of disabilities. Multiple swing types, accessible equipment, sensory elements, and a beautiful park setting with lake and museum nearby.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Rosedale Recreation Center Playground', address: '1701 Gales St NE', city: 'Washington', state: 'DC', zipCode: '20002', latitude: 38.8960, longitude: -76.9772, website: 'https://dpr.dc.gov', description: 'National Mall-themed inclusive playground accessible to kids and caregivers of all abilities. Miniature landmarks, creative play structures, and accessible design throughout.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Anacostia Park Pirate Ship Playground', address: '1900 Anacostia Dr SE', city: 'Washington', state: 'DC', zipCode: '20020', latitude: 38.8740, longitude: -76.9710, website: 'https://www.nps.gov/anac', description: 'Giant pirate ship climbing structure where kids climb masts, explore the deck, and zip down slides. Three additional playgrounds plus a roller skating pavilion in the park. Along the Anacostia River.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'Cabin John Regional Park Playground', address: '7410 Tuckerman Ln', city: 'Bethesda', state: 'MD', zipCode: '20817', latitude: 39.0225, longitude: -77.1415, website: 'https://www.montgomeryparks.org', description: 'Adventure-style playground with modern climbing structures, swings, slides, and nature-inspired play elements. Next to the miniature train, nature center, and dog park. Popular MoCo destination.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
  { name: 'South Germantown Recreational Park Playground', address: '18041 Central Park Cir', city: 'Boyds', state: 'MD', zipCode: '20841', latitude: 39.1735, longitude: -77.2612, website: 'https://www.montgomeryparks.org', description: 'Large playground complex with adventure play structures, climbing walls, slides, and zipline. Adjacent to splash park, mini golf, skate park, and sports fields. A full day of family fun.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'playground', isIndoor: false },
];


// ==========================================
// Category mapping
// ==========================================
function getCategory(venue) {
  const map = {
    'water-park': { category: 'Outdoor', subcategory: 'Water Park & Pool' },
    'nature-center': { category: 'Learning & Culture', subcategory: 'Nature Center' },
    'botanical-garden': { category: 'Outdoor', subcategory: 'Botanical Garden' },
    'nature-trail': { category: 'Outdoor', subcategory: 'Nature Trail & Hike' },
    'heritage-railroad': { category: 'Outdoor', subcategory: 'Heritage Railroad' },
    'train-ride': { category: 'Outdoor', subcategory: 'Train Ride' },
    'boat-ride': { category: 'Outdoor', subcategory: 'Boat Ride & Cruise' },
    'bowling': { category: 'Indoor Fun', subcategory: 'Bowling' },
    'arcade': { category: 'Indoor Fun', subcategory: 'Arcade & Entertainment Center' },
    'skating': { category: 'Indoor Fun', subcategory: 'Roller Skating' },
    'escape-room': { category: 'Indoor Fun', subcategory: 'Escape Room' },
    'drive-in': { category: 'Events', subcategory: 'Drive-In Movies' },
    'playground': { category: 'Outdoor', subcategory: 'Destination Playground' },
  };
  return map[venue.type] || { category: 'Family Fun', subcategory: 'Activity' };
}

// ==========================================
// Create activity document
// ==========================================
function createActivityDocument(venue) {
  const lat = venue.latitude || 39.0;
  const lng = venue.longitude || -77.0;
  const geohash = ngeohash.encode(lat, lng, 7);
  const { category, subcategory } = getCategory(venue);

  return {
    name: venue.name,
    type: subcategory,
    category,
    subcategory,
    description: venue.description,
    geohash,
    state: venue.state,
    phone: venue.phone || '',
    website: venue.website || '',
    hours: venue.hours || '',
    isFree: venue.isFree || false,
    ageRange: venue.ageRange || 'All Ages',
    cost: venue.cost || '',
    location: {
      coordinates: { latitude: lat, longitude: lng },
      address: venue.address || '',
      city: venue.city || '',
      zipCode: venue.zipCode || '',
    },
    metadata: {
      source: 'waterparks-nature-unique-playgrounds-2026',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      venueType: venue.type,
      ...(venue.dates && { eventDates: venue.dates }),
    },
    filters: {
      isFree: venue.isFree || false,
      isIndoor: venue.isIndoor !== undefined ? venue.isIndoor : false,
      hasParking: true,
    },
  };
}

// ==========================================
// Save with dedup
// ==========================================
async function saveActivities(activities) {
  let saved = 0, updated = 0, failed = 0;
  for (const activity of activities) {
    try {
      const result = await getOrCreateActivity(activity, { source: SCRAPER_NAME });
      if (result.isNew) { saved++; console.log(`  ✅ NEW: ${activity.name}`); }
      else if (result.updated) { updated++; console.log(`  🔄 Updated: ${activity.name}`); }
      else { console.log(`  ⏭️  Exists: ${activity.name}`); }
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`  ❌ Failed: ${activity.name}: ${error.message}`);
      failed++;
    }
  }
  return { saved, updated, failed };
}

// ==========================================
// Main
// ==========================================
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`\n🌊 WATER PARKS, NATURE, UNIQUE EXPERIENCES & PLAYGROUNDS`);
  console.log(`📍 Coverage: DC, MD, VA, DE (DMV + 2hr drive)`);
  console.log('='.repeat(60));
  if (isDryRun) console.log('🏃 DRY RUN MODE\n');

  const startTime = Date.now();
  const allActivities = [];

  const sections = [
    { label: '🌊 Water Parks & Family Pools', data: WATER_PARKS },
    { label: '🌿 Nature Centers, Trails & Gardens', data: NATURE_VENUES },
    { label: '🚂 Heritage Railroads & Boat Rides', data: RAILROADS_BOATS },
    { label: '🎳 Bowling, Arcades, Skating & Escape Rooms', data: ENTERTAINMENT_VENUES },
    { label: '🎬 Drive-In & Outdoor Movies', data: DRIVE_INS },
    { label: '🛝 Destination & Inclusive Playgrounds', data: PLAYGROUNDS },
  ];

  for (const { label, data } of sections) {
    console.log(`${label}: ${data.length} venues`);
    for (const v of data) allActivities.push(createActivityDocument(v));
  }

  const stateCounts = {};
  const categoryCounts = {};
  for (const a of allActivities) {
    stateCounts[a.state] = (stateCounts[a.state] || 0) + 1;
    categoryCounts[`${a.category} > ${a.subcategory}`] = (categoryCounts[`${a.category} > ${a.subcategory}`] || 0) + 1;
  }

  console.log(`\n📊 By state:`);
  for (const [s, c] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1])) console.log(`   ${s}: ${c}`);
  console.log(`📊 By category:`);
  for (const [s, c] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) console.log(`   ${s}: ${c}`);
  console.log(`\n📊 Total: ${allActivities.length}`);

  if (isDryRun) {
    console.log('\n🏃 DRY RUN — not saving. Sample:');
    for (const a of allActivities.slice(0, 12)) console.log(`  - ${a.name} [${a.category} > ${a.subcategory}] (${a.state}) ${a.isFree ? '🆓' : a.cost}`);
    if (allActivities.length > 12) console.log(`  ... and ${allActivities.length - 12} more`);
    return;
  }

  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ IMPORT COMPLETE`);
  console.log(`   Total: ${allActivities.length} | New: ${saved} | Updated: ${updated} | Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    await db.collection('scraperLogs').add({
      scraperName: SCRAPER_NAME,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      activitiesSaved: saved, activitiesUpdated: updated, activitiesFailed: failed,
      totalLocations: allActivities.length, duration: parseFloat(duration),
      status: failed === 0 ? 'success' : 'partial',
    });
  } catch (e) { console.error('Failed to log:', e.message); }
}

main().then(() => process.exit(0)).catch(e => { console.error('❌', e); process.exit(1); });
