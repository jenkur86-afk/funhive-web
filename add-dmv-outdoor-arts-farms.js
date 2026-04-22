#!/usr/bin/env node

/**
 * ADD DMV OUTDOOR FUN, FARMS, ARTS & FREE EVENTS
 *
 * Imports family venues across 4 categories:
 *   1. Outdoor Fun — water parks, amusement parks, mini golf, go-karts
 *   2. Agritourism — u-pick farms, orchards, pumpkin patches
 *   3. Arts & Culture — theaters, art studios, maker spaces
 *   4. Free Community — Smithsonian museums, free events, outdoor movies
 *
 * Usage:
 *   node add-dmv-outdoor-arts-farms.js          # Run full import
 *   node add-dmv-outdoor-arts-farms.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('./scrapers/venue-matcher');

const SCRAPER_NAME = 'DMV-Outdoor-Arts-Farms-2026';

// ==========================================
// 1. OUTDOOR FUN — Water Parks, Amusement, Mini Golf, Go-Karts
// ==========================================

const OUTDOOR_FUN = [
  // --- Water Parks ---
  { name: 'Great Wolf Lodge Maryland', address: '20 Heather Way', city: 'Perryville', state: 'MD', zipCode: '21903', latitude: 39.5640, longitude: -76.0651, phone: '(866) 925-9653', website: 'https://www.greatwolf.com/maryland', description: '128,000 sq ft indoor water park resort with 22 water slides, four-story water treehouse, lazy river, wave pool, and themed suites. Year-round family fun.', cost: '$50-100/day pass', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Great Wolf Lodge Williamsburg', address: '549 E Rochambeau Dr', city: 'Williamsburg', state: 'VA', zipCode: '23188', latitude: 37.3518, longitude: -76.7645, phone: '(757) 229-9700', website: 'https://www.greatwolf.com/williamsburg', description: 'Indoor water park resort with water slides, wave pool, lazy river, MagiQuest, mini golf, and arcade.', cost: '$50-100/day pass', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'SplashDown Waterpark', address: '7500 Ben Lomond Park Dr', city: 'Manassas', state: 'VA', zipCode: '20109', latitude: 38.7879, longitude: -77.4751, phone: '(703) 792-8085', website: 'https://www.splashdownwaterpark.com', description: 'Northern Virginia\'s largest waterpark on 13 acres. Features Big Kahuna wave pool, 70-ft water slides, lazy river, Cannonball and Tropical Twister slides, and children\'s play area.', cost: '$20-30/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Water Park at Bohrer Park', address: '506 S Frederick Ave', city: 'Gaithersburg', state: 'MD', zipCode: '20877', latitude: 39.1348, longitude: -77.2025, phone: '(301) 258-6445', website: 'https://www.gaithersburgmd.gov/recreation/pools', description: 'Community outdoor water park with water slides, lazy river, zero-depth entry pool, and splash playground. Affordable summer fun.', cost: '$8-15/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'South Germantown Splash Park', address: '18041 Central Park Cir', city: 'Boyds', state: 'MD', zipCode: '20841', latitude: 39.1595, longitude: -77.2616, website: 'https://www.montgomeryparks.org', description: 'Free splash pad and spray ground at South Germantown Recreational Park. Plus miniature golf nearby.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false },
  { name: 'Chesapeake Beach Water Park', address: '4079 Gordon Stinnett Ave', city: 'Chesapeake Beach', state: 'MD', zipCode: '20732', latitude: 38.6861, longitude: -76.5344, phone: '(410) 257-1404', website: 'https://www.chesapeakebeachwaterpark.com', description: 'Community water park with water slides, lazy river, children\'s activity pool, and beach area along the Chesapeake Bay. Reopening 2026 after renovations.', cost: '$10-20/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },

  // --- Amusement Parks ---
  { name: 'Adventure Park USA', address: '11113 W Baldwin Rd', city: 'New Market', state: 'MD', zipCode: '21774', latitude: 39.3906, longitude: -77.2752, phone: '(301) 865-6800', website: 'https://adventureparkusa.com', description: 'Maryland\'s largest family fun center with roller coasters, go-karts, mini golf, giant arcade, ropes course, laser tag, and batting cages. Indoor and outdoor attractions.', cost: '$15-40/activity', ageRange: 'All Ages', isFree: false, type: 'amusement', isIndoor: false },
  { name: 'Jolly Roger Amusement Park', address: '2901 Coastal Hwy', city: 'Ocean City', state: 'MD', zipCode: '21842', latitude: 38.3660, longitude: -75.0694, phone: '(410) 289-3477', website: 'https://jollyrogerpark.com', description: 'Ocean City\'s premier amusement park with rides, the largest go-kart facility on the East Coast (10 racetracks), two mini golf courses, and Splash Mountain water park.', cost: 'Varies by ride', ageRange: 'All Ages', isFree: false, type: 'amusement', isIndoor: false },
  { name: 'Trimper\'s Rides', address: '700 S Atlantic Ave', city: 'Ocean City', state: 'MD', zipCode: '21842', latitude: 38.3343, longitude: -75.0813, phone: '(410) 289-8617', website: 'https://www.trimperrides.com', description: 'Historic Ocean City boardwalk amusement park since 1893. Features classic and modern rides, including a 1902 Herschell-Spillman carousel, indoor rides, and more.', cost: 'Varies by ride', ageRange: 'All Ages', isFree: false, type: 'amusement', isIndoor: false },
  { name: 'Atlantic Fun Park', address: '233 15th St', city: 'Virginia Beach', state: 'VA', zipCode: '23451', latitude: 36.8560, longitude: -75.9687, website: 'https://www.atlanticfunpark.com', description: 'Oceanfront amusement park with 3 roller coasters, 100-foot ferris wheel, carousel, paddle boats, and boardwalk rides.', cost: 'Varies by ride', ageRange: 'All Ages', isFree: false, type: 'amusement', isIndoor: false },
  { name: 'Kings Dominion', address: '16000 Theme Park Way', city: 'Doswell', state: 'VA', zipCode: '23047', latitude: 37.8399, longitude: -77.4432, phone: '(804) 876-5000', website: 'https://www.kingsdominion.com', description: 'Major theme park with roller coasters, Soak City water park, Planet Snoopy kids area, and live entertainment. One of Virginia\'s top family attractions.', cost: '$40-80/person', ageRange: 'All Ages', isFree: false, type: 'amusement', isIndoor: false },
  { name: 'Busch Gardens Williamsburg', address: '1 Busch Gardens Blvd', city: 'Williamsburg', state: 'VA', zipCode: '23185', latitude: 37.2350, longitude: -76.6453, phone: '(757) 229-4386', website: 'https://buschgardens.com/williamsburg', description: 'European-themed amusement park with world-class roller coasters, kids area, animal encounters, and seasonal festivals. Voted the world\'s most beautiful theme park.', cost: '$50-100/person', ageRange: 'All Ages', isFree: false, type: 'amusement', isIndoor: false },
  { name: 'Water Country USA', address: '176 Water Country Pkwy', city: 'Williamsburg', state: 'VA', zipCode: '23185', latitude: 37.2612, longitude: -76.6726, phone: '(757) 229-9300', website: 'https://www.watercountryusa.com', description: 'Virginia\'s largest water park with wave pools, water slides, lazy river, and kids play areas. Sister park to Busch Gardens.', cost: '$40-70/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },

  // --- Mini Golf ---
  { name: 'South Germantown Mini Golf', address: '18041 Central Park Cir', city: 'Boyds', state: 'MD', zipCode: '20841', latitude: 39.1600, longitude: -77.2610, website: 'https://www.montgomeryparks.org', description: 'Two 18-hole miniature golf courses in a park setting. Adjacent to splash park and adventure playground.', cost: '$6-8/round', ageRange: 'All Ages', isFree: false, type: 'mini-golf', isIndoor: false },
  { name: 'Hadley\'s Park Mini Golf & Go-Karts', address: '1351 Generals Hwy', city: 'Crownsville', state: 'MD', zipCode: '21032', latitude: 39.0302, longitude: -76.6013, website: 'https://www.hadleyspark.com', description: 'Family entertainment center with 18-hole mini golf, go-karts, batting cages, and arcade games near Annapolis.', cost: '$8-12/activity', ageRange: 'All Ages', isFree: false, type: 'mini-golf', isIndoor: false },
  { name: 'Volcano Island Mini Golf', address: '4550 Painter Ct', city: 'Baltimore', state: 'MD', zipCode: '21226', latitude: 39.2198, longitude: -76.5865, website: 'https://www.volcanoIslandminigolf.com', description: 'Tropical-themed outdoor mini golf with waterfalls, caves, and a volcano centerpiece near Baltimore.', cost: '$9-12/round', ageRange: 'All Ages', isFree: false, type: 'mini-golf', isIndoor: false },
  { name: 'TopGolf Germantown', address: '20410 Century Blvd', city: 'Germantown', state: 'MD', zipCode: '20874', latitude: 39.1723, longitude: -77.2585, website: 'https://topgolf.com/us/germantown', description: 'High-tech driving range and entertainment venue with climate-controlled hitting bays, games for all skill levels, food, and drinks.', cost: '$25-50/bay/hour', ageRange: 'All Ages', isFree: false, type: 'golf-entertainment', isIndoor: false },
  { name: 'TopGolf Loudoun', address: '20356 Commonwealth Center Dr', city: 'Ashburn', state: 'VA', zipCode: '20147', latitude: 39.0435, longitude: -77.4685, website: 'https://topgolf.com/us/loudoun', description: 'High-tech driving range with climate-controlled bays, games, food, and drinks. Family-friendly daytime hours.', cost: '$25-50/bay/hour', ageRange: 'All Ages', isFree: false, type: 'golf-entertainment', isIndoor: false },

  // --- Go-Karts & Outdoor Adventures ---
  { name: 'Autobahn Indoor Speedway - Baltimore', address: '8415 Kelso Dr', city: 'Essex', state: 'MD', zipCode: '21221', latitude: 39.3040, longitude: -76.4749, website: 'https://autobahnspeed.com', description: 'European-style indoor electric go-kart racing with speeds up to 50mph. Junior karts available for ages 8+.', cost: '$20-25/race', ageRange: 'Ages 8+', isFree: false, type: 'go-karts', isIndoor: true },
  { name: 'Autobahn Indoor Speedway - Manassas', address: '8300 Sudley Rd', city: 'Manassas', state: 'VA', zipCode: '20109', latitude: 38.7742, longitude: -77.4866, website: 'https://autobahnspeed.com', description: 'European-style indoor electric go-kart racing. Junior karts for kids ages 8+.', cost: '$20-25/race', ageRange: 'Ages 8+', isFree: false, type: 'go-karts', isIndoor: true },

  // --- Fenwick/Ocean Area ---
  { name: 'Fenwick Fun - Thunder Lagoon Waterpark', address: '3 Lighthouse Rd', city: 'Fenwick Island', state: 'DE', zipCode: '19944', latitude: 38.4635, longitude: -75.0534, website: 'https://fenwickfun.com', description: 'Waterpark, 19-hole Viking mini golf, and go-kart raceway. Open Memorial Day through Labor Day.', cost: '$20-35/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Jungle Jim\'s Waterpark', address: '36944 Country Club Rd', city: 'Rehoboth Beach', state: 'DE', zipCode: '19971', latitude: 38.7010, longitude: -75.1090, website: 'https://www.funatjunglejims.com', description: 'Region\'s largest waterpark with go-karts, bumper boats, mini-golf, batting cages, and Splash Zone kids area.', cost: '$25-40/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
];

// ==========================================
// 2. AGRITOURISM — Farms, Orchards, U-Pick
// ==========================================

const FARMS_ORCHARDS = [
  { name: 'Butler\'s Orchard', address: '22222 Davis Mill Rd', city: 'Germantown', state: 'MD', zipCode: '20876', latitude: 39.1892, longitude: -77.2695, phone: '(301) 972-3299', website: 'https://www.butlersorchard.com', description: 'U-pick strawberries (May), cherries, tomatoes, blackberries, apples, and pumpkins. Plus Bunnyland and fall festivals with hayrides and corn maze.', cost: 'Varies by activity', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Larriland Farm', address: '2415 Woodbine Rd', city: 'Woodbine', state: 'MD', zipCode: '21797', latitude: 39.3480, longitude: -77.0505, phone: '(410) 442-2605', website: 'https://www.pickyourown.com', description: 'Pick-your-own from late May through early November: strawberries, cherries, blackberries, peaches, apples, and pumpkins. Farm market with baked goods.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Swann Farms', address: '7740 Swan Lane', city: 'Owings', state: 'MD', zipCode: '20736', latitude: 38.7470, longitude: -76.5663, phone: '(443) 770-3510', website: 'https://www.swannfarms.com', description: 'U-pick strawberries, blueberries, and blackberries. Seasonal produce and local honey. Family-friendly farm in Calvert County.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Shaw Orchards', address: '5594 Norrisville Rd', city: 'White Hall', state: 'MD', zipCode: '21161', latitude: 39.6505, longitude: -76.6189, phone: '(410) 692-2429', website: 'https://www.shaworchards.com', description: 'Pick-your-own strawberries, blueberries, raspberries, cherries, apples, and pumpkins. Family farm in Northern Baltimore County.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Milburn Orchards', address: '1495 Appleton Rd', city: 'Elkton', state: 'MD', zipCode: '21921', latitude: 39.6275, longitude: -75.8340, phone: '(410) 398-1349', website: 'https://www.milburnorchards.com', description: 'U-pick cherries, blackberries, blueberries, peaches, raspberries, and apples. Fall festival with corn maze, hayrides, and pumpkin patch.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Montpelier Farms', address: '16417 Montpelier Rd', city: 'Upper Marlboro', state: 'MD', zipCode: '20772', latitude: 38.8358, longitude: -76.7490, website: 'https://www.montpelierfarms.com', description: 'Family farm with corn maze, pumpkin patch, hayrides, farm animals, and fall festival activities in Prince George\'s County.', cost: '$10-20/person', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Rock Hill Orchard', address: '28600 Ridge Rd', city: 'Mount Airy', state: 'MD', zipCode: '21771', latitude: 39.3851, longitude: -77.1538, website: 'https://rockhillorchard.com', description: 'Pick-your-own apples, pumpkins, and flowers. 10-acre corn maze open weekends. Reservations recommended.', cost: '$10-15 entry', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Maryland Corn Maze at Bowles Farm', address: '22222 Hardings Ln', city: 'Great Mills', state: 'MD', zipCode: '20634', latitude: 38.2651, longitude: -76.5050, website: 'https://bowlesfarms.com', description: '8-acre themed corn maze, petting zoo, hayrides, zip line, pedal tractors, and pumpkin patch. Great family fall attraction.', cost: '$14-16/person', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Great Country Farms', address: '18780 Foggy Bottom Rd', city: 'Bluemont', state: 'VA', zipCode: '20135', latitude: 39.1137, longitude: -77.8257, phone: '(540) 554-2073', website: 'https://greatcountryfarms.com', description: 'Pick-your-own strawberries, peaches, blackberries, and apples. Seasonal festivals, farm animals, playground, and market.', cost: '$10-15/entry', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Wegmeyer Farms', address: '39399 Irish Corner Rd', city: 'Hamilton', state: 'VA', zipCode: '20158', latitude: 39.1297, longitude: -77.6766, website: 'https://wegmeyerfarms.com', description: 'Family farm with u-pick produce, playground, farm animals, pedal tractors, and seasonal pumpkin patch. $5 entry.', cost: '$5 entry + produce by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Hollin Farms', address: '11107 Maidstone Rd', city: 'Delaplane', state: 'VA', zipCode: '20144', latitude: 38.9213, longitude: -77.9543, website: 'https://www.hollinfarms.com', description: 'Pick-your-own apples, pumpkins, and fall greens next to Sky Meadows State Park. Beautiful mountain setting.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Mackintosh Fruit Farm', address: '1 S Church St', city: 'Berryville', state: 'VA', zipCode: '22611', latitude: 39.1505, longitude: -77.9822, website: 'https://mackintoshfruitfarm.com', description: 'Pick blueberries, apples, strawberries, raspberries, blackberries, and peaches in the Shenandoah Valley.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Linvilla Orchards', address: '137 W Knowlton Rd', city: 'Media', state: 'PA', zipCode: '19063', latitude: 39.8838, longitude: -75.4174, phone: '(610) 876-7116', website: 'https://www.linvilla.com', description: 'Major family farm near Philadelphia with pick-your-own, pumpkin patch, hayrides, fishing, playground, garden center, and farm market.', cost: 'Varies by activity', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Cherry Crest Adventure Farm', address: '150 Cherry Hill Rd', city: 'Ronks', state: 'PA', zipCode: '17572', latitude: 40.0543, longitude: -76.0833, website: 'https://www.cherrycrestfarm.com', description: '5-acre Amazing Maize Maze corn maze, 50+ farm activities including pedal karts, jumping pillows, gem mining, and animal encounters.', cost: '$20-30/person', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Fifer Orchards', address: '1919 Allabands Mill Rd', city: 'Camden Wyoming', state: 'DE', zipCode: '19934', latitude: 39.0901, longitude: -75.5639, website: 'https://www.fiferorchards.com', description: 'U-pick apples, peaches, and pumpkins. 6-acre themed corn maze, farm market, and family activities in central Delaware.', cost: '$8-12/entry', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
  { name: 'Ramsey\'s Farm', address: '3537 Ramsey Church Rd', city: 'Wilmington', state: 'DE', zipCode: '19810', latitude: 39.7823, longitude: -75.5570, website: 'https://www.ramseysfarm.com', description: '50,000 pumpkins, corn maze, hayrides, and fall activities. One of Delaware\'s premier pumpkin destinations.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },
];

// ==========================================
// 3. ARTS & CULTURE
// ==========================================

const ARTS_CULTURE = [
  // --- Children's Theater ---
  { name: 'Imagination Stage', address: '4908 Auburn Ave', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9826, longitude: -77.0969, phone: '(301) 280-1660', website: 'https://imaginationstage.org', description: 'DMV\'s premier theatre for young audiences. Professional productions, acting classes, camps, and education programs at 50+ locations throughout the DC region.', cost: '$15-30/ticket', ageRange: 'Ages 1-18', isFree: false, type: 'theater', isIndoor: true },
  { name: 'Adventure Theatre MTC', address: '7300 MacArthur Blvd', city: 'Glen Echo', state: 'MD', zipCode: '20812', latitude: 38.9671, longitude: -77.1405, phone: '(301) 634-2270', website: 'https://www.adventuretheatre-mtc.org', description: 'Professional children\'s theater inside historic Glen Echo Park. Performances, classes, and camps for kids and teens.', cost: '$15-25/ticket', ageRange: 'Ages 2-12', isFree: false, type: 'theater', isIndoor: true },
  { name: 'Encore Theatrical Arts Project', address: '1801 Research Blvd', city: 'Rockville', state: 'MD', zipCode: '20850', latitude: 39.0918, longitude: -77.1588, website: 'https://www.encoretheatricalarts.org', description: 'Youth performing arts organization offering musical theatre training, performances, and camps for ages 5-18.', cost: 'Varies', ageRange: 'Ages 5-18', isFree: false, type: 'theater', isIndoor: true },
  { name: 'Moonlit Wings Productions', address: '9925 Main St', city: 'Damascus', state: 'MD', zipCode: '20872', latitude: 39.2892, longitude: -77.2008, website: 'https://www.moonlitwings.org', description: 'Award-winning performing arts programs, acting classes, camps, and advising for arts college admissions.', cost: 'Varies', ageRange: 'Ages 5-18', isFree: false, type: 'theater', isIndoor: true },
  { name: 'The Puppet Co. Playhouse', address: '7300 MacArthur Blvd', city: 'Glen Echo', state: 'MD', zipCode: '20812', latitude: 38.9671, longitude: -77.1405, phone: '(301) 634-5380', website: 'https://thepuppetco.org', description: 'Professional puppet theater in Glen Echo Park with original productions, classic fairy tales, and interactive shows for young audiences.', cost: '$12-15/ticket', ageRange: 'Ages 1-10', isFree: false, type: 'theater', isIndoor: true },
  { name: 'Glen Echo Park', address: '7300 MacArthur Blvd', city: 'Glen Echo', state: 'MD', zipCode: '20812', latitude: 38.9671, longitude: -77.1405, phone: '(301) 634-2222', website: 'https://glenechopark.org', description: 'Historic arts and cultural center with 13 resident art groups, 100+ instructors teaching visual and performing arts. Classes in ceramics, painting, photography, glass, dance, and theater. Summer camps.', cost: 'Varies by class', ageRange: 'All Ages', isFree: false, type: 'arts-center', isIndoor: false },

  // --- Art Studios ---
  { name: 'Emma\'s Art Studio', address: '4803 Bethesda Ave', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9813, longitude: -77.0968, website: 'https://www.emmasartstudio.com', description: 'New creative space (opened Jan 2026) offering fine arts programs for children, teens, and adults. Classes, camps, private lessons, and art parties.', cost: '$30-50/class', ageRange: 'Ages 4+', isFree: false, type: 'art-studio', isIndoor: true },
  { name: 'Young Masters Art Studio', address: 'Multiple locations', city: 'Various', state: 'MD', zipCode: '', latitude: 39.0000, longitude: -77.0000, website: 'https://www.youngmastersartstudio.com', description: 'Skill-based realistic art curriculum for ages 5-13. Teaches classical drawing, color theory, and fine arts principles in a structured program.', cost: '$30-45/class', ageRange: 'Ages 5-13', isFree: false, type: 'art-studio', isIndoor: true },
  { name: 'Chesapeake Arts Center', address: '194 Hammonds Ln', city: 'Brooklyn Park', state: 'MD', zipCode: '21225', latitude: 39.2268, longitude: -76.6128, phone: '(410) 636-6597', website: 'https://www.chesapeakearts.org', description: 'Community arts center with makerspace, art classes, pottery & ceramics, dance, theater rentals, and gallery exhibitions in Anne Arundel County.', cost: '$15-40/class', ageRange: 'All Ages', isFree: false, type: 'arts-center', isIndoor: true },
  { name: 'VisArts', address: '155 Gibbs St', city: 'Rockville', state: 'MD', zipCode: '20850', latitude: 39.0800, longitude: -77.1512, phone: '(301) 315-8200', website: 'https://www.visartscenter.org', description: 'Visual arts center offering classes, camps, and open studios in painting, ceramics, jewelry, printmaking, and digital media for all ages.', cost: '$20-50/class', ageRange: 'All Ages', isFree: false, type: 'arts-center', isIndoor: true },
  { name: 'Color Me Mine - Bethesda', address: '4923 Elm St', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9813, longitude: -77.0960, website: 'https://www.colormemine.com', description: 'Paint-your-own pottery studio. Walk-in friendly with hundreds of ceramic pieces to choose from. Great for birthday parties.', cost: '$15-25/person + piece', ageRange: 'All Ages', isFree: false, type: 'art-studio', isIndoor: true },
];

// ==========================================
// 4. FREE COMMUNITY EVENTS & ATTRACTIONS
// ==========================================

const FREE_COMMUNITY = [
  // --- Smithsonian Museums (All Free) ---
  { name: 'National Air and Space Museum', address: '655 Jefferson Dr SW', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8882, longitude: -77.0199, phone: '(202) 633-2214', website: 'https://airandspace.si.edu', description: 'Free Smithsonian museum with aircraft, spacecraft, and interactive exhibits. Includes flight simulators and IMAX theater. Timed-entry passes required.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },
  { name: 'National Museum of Natural History', address: '10th St & Constitution Ave NW', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8913, longitude: -77.0261, phone: '(202) 633-1000', website: 'https://naturalhistory.si.edu', description: 'Free Smithsonian museum with Hope Diamond, dinosaur fossils, live butterfly pavilion, ocean hall, and interactive discovery rooms for kids.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },
  { name: 'National Museum of American History', address: '1300 Constitution Ave NW', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8912, longitude: -77.0299, phone: '(202) 633-1000', website: 'https://americanhistory.si.edu', description: 'Free Smithsonian museum with Wegmans Wonderplace interactive kids room, Star-Spangled Banner, and American history exhibits.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },
  { name: 'Smithsonian National Zoo', address: '3001 Connecticut Ave NW', city: 'Washington', state: 'DC', zipCode: '20008', latitude: 38.9296, longitude: -77.0498, phone: '(202) 633-4888', website: 'https://nationalzoo.si.edu', description: 'Free zoo with giant pandas, great apes, big cats, elephants, and Kids\' Farm. Timed-entry passes required. 163 acres of animals and gardens.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'zoo-free', isIndoor: false },
  { name: 'National Museum of the American Indian', address: '4th St & Independence Ave SW', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8884, longitude: -77.0163, website: 'https://americanindian.si.edu', description: 'Free Smithsonian museum with imagiNATIONS interactive kids activity center, cultural exhibits, and Native arts.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },
  { name: 'National Museum of African American History and Culture', address: '1400 Constitution Ave NW', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8910, longitude: -77.0328, website: 'https://nmaahc.si.edu', description: 'Free Smithsonian museum exploring African American history and culture. Interactive exhibits, Explore More room for kids. Timed-entry passes required.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },
  { name: 'Hirshhorn Museum and Sculpture Garden', address: '700 Independence Ave SW', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8881, longitude: -77.0230, website: 'https://hirshhorn.si.edu', description: 'Free modern and contemporary art museum with outdoor sculpture garden. Family-friendly programs and interactive art experiences.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },
  { name: 'National Gallery of Art', address: '6th & Constitution Ave NW', city: 'Washington', state: 'DC', zipCode: '20565', latitude: 38.8913, longitude: -77.0198, website: 'https://www.nga.gov', description: 'Free world-class art museum with family programs, kids\' audio tours, and a Sculpture Garden with ice skating in winter and jazz in summer.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'museum-free', isIndoor: true },

  // --- Free Community Events ---
  { name: 'Petalpalooza', address: 'The Wharf', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8776, longitude: -77.0227, website: 'https://nationalcherryblossomfestival.org', description: 'Free day-long outdoor festival along the Anacostia River with live music, interactive art installations, hands-on activities, roaming entertainers, and fireworks at 8:30pm.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival-free', isIndoor: false, dates: 'April 2026' },
  { name: 'First Fridays in Historic Manassas', address: '9431 West St', city: 'Manassas', state: 'VA', zipCode: '20110', latitude: 38.7509, longitude: -77.4753, website: 'https://www.visitmanassas.org', description: 'Monthly block party in Historic Downtown Manassas (Feb-Nov), 6-9pm with live music, family activities, food vendors, and special events.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival-free', isIndoor: false, dates: 'First Friday, Feb-Nov' },
  { name: 'Smithsonian Earth Day Celebration', address: 'National Mall', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8893, longitude: -77.0232, website: 'https://www.si.edu', description: 'Free family-friendly Earth Day activities including Stamped for Sustainability murals, Postcards for the Planets, Upcycle Studio crafts. Hosted by Smithsonian Gardens & Natural History Museum.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival-free', isIndoor: false, dates: 'April 2026' },
  { name: 'Delaware State Parks Family Programs', address: 'Various locations', city: 'Various', state: 'DE', zipCode: '', latitude: 38.9000, longitude: -75.5000, website: 'https://destateparks.com', description: 'Free and low-cost guided hikes, bird walks, hands-on nature programs, festivals, and family-friendly outdoor adventures throughout Delaware State Parks.', cost: 'Free (park entry may apply)', ageRange: 'All Ages', isFree: true, type: 'nature-program', isIndoor: false, dates: 'Year-round' },
];


// ==========================================
// HELPER: Category mapping
// ==========================================
function getCategory(venue) {
  const t = venue.type;
  const map = {
    'water-park': { category: 'Outdoor Fun', subcategory: 'Water Park' },
    'splash-pad': { category: 'Outdoor Fun', subcategory: 'Splash Pad' },
    'amusement': { category: 'Outdoor Fun', subcategory: 'Amusement Park' },
    'mini-golf': { category: 'Outdoor Fun', subcategory: 'Mini Golf' },
    'golf-entertainment': { category: 'Outdoor Fun', subcategory: 'Golf Entertainment' },
    'go-karts': { category: 'Outdoor Fun', subcategory: 'Go-Karts' },
    'farm': { category: 'Agritourism', subcategory: 'Farm & Orchard' },
    'theater': { category: 'Arts & Culture', subcategory: 'Children\'s Theater' },
    'arts-center': { category: 'Arts & Culture', subcategory: 'Arts Center' },
    'art-studio': { category: 'Arts & Culture', subcategory: 'Art Studio' },
    'museum-free': { category: 'Free Attractions', subcategory: 'Free Museum' },
    'zoo-free': { category: 'Free Attractions', subcategory: 'Free Zoo' },
    'festival-free': { category: 'Free Attractions', subcategory: 'Free Festival' },
    'nature-program': { category: 'Free Attractions', subcategory: 'Nature Program' },
  };
  return map[t] || { category: 'Family Fun', subcategory: 'Activity' };
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
      source: 'dmv-outdoor-arts-farms-2026',
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

  console.log(`\n🎢 DMV OUTDOOR FUN, FARMS, ARTS & FREE EVENTS`);
  console.log(`📍 Coverage: DC, MD, VA, PA, DE`);
  console.log('='.repeat(60));
  if (isDryRun) console.log('🏃 DRY RUN MODE\n');

  const startTime = Date.now();
  const allActivities = [];

  const sections = [
    { label: '🎢 Outdoor Fun', data: OUTDOOR_FUN },
    { label: '🌾 Farms & Orchards', data: FARMS_ORCHARDS },
    { label: '🎭 Arts & Culture', data: ARTS_CULTURE },
    { label: '🆓 Free Community', data: FREE_COMMUNITY },
  ];

  for (const { label, data } of sections) {
    console.log(`${label}: ${data.length} venues`);
    for (const v of data) allActivities.push(createActivityDocument(v));
  }

  // Stats
  const stateCounts = {};
  const categoryCounts = {};
  for (const a of allActivities) {
    stateCounts[a.state] = (stateCounts[a.state] || 0) + 1;
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  }

  console.log(`\n📊 By state:`);
  for (const [s, c] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1])) console.log(`   ${s}: ${c}`);
  console.log(`📊 By category:`);
  for (const [s, c] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) console.log(`   ${s}: ${c}`);
  console.log(`\n📊 Total: ${allActivities.length}`);

  if (isDryRun) {
    console.log('\n🏃 DRY RUN — not saving. Sample:');
    for (const a of allActivities.slice(0, 8)) console.log(`  - ${a.name} [${a.category} > ${a.subcategory}] (${a.state})`);
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
