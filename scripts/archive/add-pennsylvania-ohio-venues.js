#!/usr/bin/env node

/**
 * ADD PENNSYLVANIA & OHIO FAMILY VENUES & EVENTS
 *
 * Imports:
 *   1. Theme parks & amusement parks
 *   2. Museums & learning
 *   3. Zoos & animal attractions
 *   4. Water parks & aquatic centers
 *   5. Nature, trails & gardens
 *   6. Heritage railroads & boat rides
 *   7. Entertainment centers (bowling, arcades, escape rooms)
 *   8. June 2026 events & festivals
 *   9. Destination playgrounds
 *
 * Usage:
 *   node add-pennsylvania-ohio-venues.js          # Run full import
 *   node add-pennsylvania-ohio-venues.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('../../scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('../../scrapers/venue-matcher');

const SCRAPER_NAME = 'Pennsylvania-Ohio-Venues-2026';

// ==========================================
// 1. THEME PARKS & AMUSEMENT PARKS
// ==========================================

const THEME_PARKS = [
  // --- Pennsylvania ---
  { name: 'Hersheypark', address: '100 Hersheypark Dr', city: 'Hershey', state: 'PA', zipCode: '17033', latitude: 40.2868, longitude: -76.6558, phone: '(800) 437-7439', website: 'https://www.hersheypark.com', description: 'Pennsylvania\'s largest theme park spanning 120+ acres with 70+ rides including 14 roller coasters. Boardwalk water park area, Chocolate World factory tour, and ZooAmerica. Hershey\'s sweet-themed fun for all ages.', cost: '$55-85/person', ageRange: 'All Ages', isFree: false, type: 'theme-park', isIndoor: false },
  { name: 'Dutch Wonderland', address: '2249 Rt 30 East', city: 'Lancaster', state: 'PA', zipCode: '17602', latitude: 40.0432, longitude: -76.2429, phone: '(866) 386-2839', website: 'https://www.dutchwonderland.com', description: 'Theme park designed specifically for young kids. Gentle rides, water play areas, character meet-and-greets, and Duke\'s Lagoon water park. Perfect for toddlers through age 10. In the heart of Amish Country.', cost: '$45-55/person', ageRange: 'Ages 2-10', isFree: false, type: 'theme-park', isIndoor: false },
  { name: 'Sesame Place Philadelphia', address: '100 Sesame Rd', city: 'Langhorne', state: 'PA', zipCode: '19047', latitude: 40.1816, longitude: -74.8716, phone: '(215) 752-7070', website: 'https://www.sesameplace.com', description: 'World\'s first Certified Autism Center theme park! 25+ rides, 9 water rides, live Sesame Street shows, daily parade, and Dine with Elmo experience. Staff trained in sensory needs with quiet rooms and headphones available.', cost: '$45-70/person', ageRange: 'Ages 1-8', isFree: false, type: 'theme-park', isIndoor: false },
  { name: 'Knoebels Amusement Resort', address: '391 Knoebels Blvd', city: 'Elysburg', state: 'PA', zipCode: '17824', latitude: 40.8792, longitude: -76.5009, phone: '(570) 672-2572', website: 'https://www.knoebels.com', description: 'FREE admission, FREE parking family amusement park with 60+ rides and world-famous food (rated best amusement park food 22 times). Pay-per-ride or get a wristband. Classic wooden coasters, kiddie rides, pool, and campground.', cost: 'Free admission, rides $2-5', ageRange: 'All Ages', isFree: true, type: 'theme-park', isIndoor: false },
  { name: 'Idlewild & SoakZone', address: '2574 US Route 30', city: 'Ligonier', state: 'PA', zipCode: '15658', latitude: 40.2250, longitude: -79.2387, phone: '(724) 238-3666', website: 'https://www.idlewild.com', description: 'Named Best Kids\' Park in the World multiple times. Story Book Forest, Daniel Tiger\'s Neighborhood, Raccoon Lagoon, and SoakZone water park. Gentle rides, shaded walkways, and a nostalgic family atmosphere since 1878.', cost: '$40-55/person', ageRange: 'Ages 1-10', isFree: false, type: 'theme-park', isIndoor: false },

  // --- Ohio ---
  { name: 'Cedar Point', address: '1 Cedar Point Dr', city: 'Sandusky', state: 'OH', zipCode: '44870', latitude: 41.4814, longitude: -82.6835, phone: '(419) 627-2350', website: 'https://www.cedarpoint.com', description: 'Roller coaster capital of the world with 70+ rides including 17 coasters. Camp Snoopy kids\' area, live shows, and Cedar Point Shores water park. On a Lake Erie peninsula — an iconic American theme park.', cost: '$50-85/person', ageRange: 'All Ages', isFree: false, type: 'theme-park', isIndoor: false },
  { name: 'Kings Island', address: '6300 Kings Island Dr', city: 'Mason', state: 'OH', zipCode: '45040', latitude: 39.3447, longitude: -84.2694, phone: '(513) 754-5700', website: 'https://www.visitkingsisland.com', description: 'Major theme park with 100+ rides, Planet Snoopy kids\' area (voted best kids\' area in the world), Soak City water park, and world-class coasters. Family-friendly with shows and dining.', cost: '$45-75/person', ageRange: 'All Ages', isFree: false, type: 'theme-park', isIndoor: false },
  { name: 'Coney Island Cincinnati', address: '6201 Kellogg Ave', city: 'Cincinnati', state: 'OH', zipCode: '45230', latitude: 39.0918, longitude: -84.4164, phone: '(513) 232-8230', website: 'https://www.coneyislandpark.com', description: 'Classic family park with Sunlite Pool (one of the world\'s largest recirculating pools), water slides, paddle boats, mini golf, and rides. Affordable summer fun along the Ohio River.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'theme-park', isIndoor: false },
];

// ==========================================
// 2. MUSEUMS & LEARNING
// ==========================================

const MUSEUMS = [
  // --- Pennsylvania ---
  { name: 'The Franklin Institute', address: '222 N 20th St', city: 'Philadelphia', state: 'PA', zipCode: '19103', latitude: 39.9582, longitude: -75.1731, phone: '(215) 448-1200', website: 'https://www.fi.edu', description: 'World-class science museum with interactive exhibits on the human body, space, electricity, and more. Giant heart walk-through, planetarium, escape rooms, and special exhibitions. A must for curious kids.', cost: '$23-30/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Please Touch Museum', address: '4231 Avenue of the Republic', city: 'Philadelphia', state: 'PA', zipCode: '19131', latitude: 39.9793, longitude: -75.2093, phone: '(215) 581-3181', website: 'https://www.pleasetouchmuseum.org', description: 'Hands-on children\'s museum designed for kids 7 and under. River Adventures water play, Imagination Playground, Roadside Attractions, and a restored 100-year-old carousel. Sensory-friendly hours available.', cost: '$22-25/person', ageRange: 'Ages 0-7', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Crayola Experience', address: '30 Centre Square', city: 'Easton', state: 'PA', zipCode: '18042', latitude: 40.6906, longitude: -75.2097, phone: '(610) 515-8000', website: 'https://www.crayolaexperience.com', description: 'Hands-on discovery center where kids name and wrap their own crayons, star in coloring pages, melt crayons into art, and see how crayons are made. 28 creative activities across multiple floors.', cost: '$24-28/person', ageRange: 'Ages 2-12', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Children\'s Museum of Pittsburgh', address: '10 Children\'s Way', city: 'Pittsburgh', state: 'PA', zipCode: '15212', latitude: 40.4529, longitude: -80.0068, phone: '(412) 322-5058', website: 'https://pittsburghkids.org', description: 'Award-winning children\'s museum with Makeshop (real tools for building), Waterplay area, Nursery for babies, art studio, theater, and outdoor play. Designed for kids birth to 10 years.', cost: '$16-20/person', ageRange: 'Ages 0-10', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Carnegie Science Center', address: '1 Allegheny Ave', city: 'Pittsburgh', state: 'PA', zipCode: '15212', latitude: 40.4457, longitude: -80.0183, phone: '(412) 237-3400', website: 'https://carnegiesciencecenter.org', description: 'Interactive science museum on the Allegheny River with planetarium, submarine USS Requin tour, Miniature Railroad & Village, SportsWorks, and Rangos Giant Cinema. Hands-on STEM fun for all ages.', cost: '$20-25/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },

  // --- Ohio ---
  { name: 'COSI - Center of Science and Industry', address: '333 W Broad St', city: 'Columbus', state: 'OH', zipCode: '43215', latitude: 39.9588, longitude: -83.0068, phone: '(614) 228-2674', website: 'https://cosi.org', description: 'Ohio\'s largest science center with 300+ interactive exhibits across Ocean, Space, Gadgets, and Life zones. Ohio\'s largest planetarium, live shows, outdoor Big Science Park, and Little Kidspace for toddlers.', cost: '$18-25/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Great Lakes Science Center', address: '601 Erieside Ave', city: 'Cleveland', state: 'OH', zipCode: '44114', latitude: 41.5075, longitude: -81.6966, phone: '(216) 694-2000', website: 'https://greatscience.com', description: 'Science center with 400+ interactive exhibits, NASA Glenn Visitor Center, planetarium, and STEM workshops. Explores Great Lakes science, space, and engineering. On the Cleveland waterfront.', cost: '$16-22/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Cincinnati Museum Center', address: '1301 Western Ave', city: 'Cincinnati', state: 'OH', zipCode: '45203', latitude: 39.1098, longitude: -84.5375, phone: '(513) 287-7000', website: 'https://www.cincymuseum.org', description: 'Housed in the stunning Art Deco Union Terminal. Children\'s Museum with Kids Town, Dinosaur Hall with real fossils, Cave exploration, Cincinnati History Museum, and science galleries. Multiple museums under one roof.', cost: '$16-22/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Children\'s Museum of Cleveland', address: '3813 Euclid Ave', city: 'Cleveland', state: 'OH', zipCode: '44115', latitude: 41.5010, longitude: -81.6559, phone: '(216) 791-7114', website: 'https://www.cmcleveland.org', description: 'Hands-on museum for kids birth to 8 years. Splash Zone water play, Wonder Lab, Big Creek outdoor play area, and creative arts studio. Designed for early learners with sensory-friendly hours.', cost: '$14-17/person', ageRange: 'Ages 0-8', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Cleveland Museum of Natural History', address: '1 Wade Oval Dr NW', city: 'Cleveland', state: 'OH', zipCode: '44106', latitude: 41.5114, longitude: -81.6131, phone: '(216) 231-4600', website: 'https://www.cmnh.org', description: 'Newly renovated natural history museum with dinosaur gallery, live animals, outdoor nature trails, planetarium, and Perkins Wildlife Center. Kids love the hands-on Smead Discovery Center.', cost: '$15-19/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Rock & Roll Hall of Fame', address: '1100 Rock and Roll Blvd', city: 'Cleveland', state: 'OH', zipCode: '44114', latitude: 41.5085, longitude: -81.6954, phone: '(216) 781-7625', website: 'https://www.rockhall.com', description: 'Iconic museum celebrating rock and roll history. Interactive exhibits, instrument play zones, music-making stations, and memorabilia from legendary artists. Fun for music-loving families and older kids.', cost: '$30-35/person', ageRange: 'Ages 5+', isFree: false, type: 'museum', isIndoor: true },
];

// ==========================================
// 3. ZOOS & ANIMAL ATTRACTIONS
// ==========================================

const ZOOS = [
  // --- Pennsylvania ---
  { name: 'Philadelphia Zoo', address: '3400 W Girard Ave', city: 'Philadelphia', state: 'PA', zipCode: '19104', latitude: 39.9714, longitude: -75.1955, phone: '(215) 243-1100', website: 'https://philadelphiazoo.org', description: 'America\'s first zoo with 1,300+ animals. Zoo360 elevated mesh trails let animals walk above visitors. KidZooU children\'s zoo, paddle boats, train ride, carousel, and seasonal events.', cost: '$24-30/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
  { name: 'Pittsburgh Zoo & PPG Aquarium', address: '7340 Butler St', city: 'Pittsburgh', state: 'PA', zipCode: '15206', latitude: 40.4844, longitude: -79.9219, phone: '(412) 665-3640', website: 'https://www.pittsburghzoo.org', description: 'Combined zoo and aquarium with 8,000+ animals. Kids Kingdom interactive area, Jungle Odyssey, shark tunnel, and seasonal events. Water play area in summer. Penguin and polar bear exhibits.', cost: '$18-22/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
  { name: 'ZooAmerica', address: '100 Hersheypark Dr', city: 'Hershey', state: 'PA', zipCode: '17033', latitude: 40.2856, longitude: -76.6525, phone: '(717) 534-3860', website: 'https://www.zooamerica.com', description: 'Walk-through zoo focused on North American wildlife — bears, wolves, bald eagles, bison, and more. Connected to Hersheypark by bridge. 11-acre zoo with 200+ animals from five regions of the continent.', cost: '$14-18/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },

  // --- Ohio ---
  { name: 'Columbus Zoo and Aquarium', address: '4850 W Powell Rd', city: 'Powell', state: 'OH', zipCode: '43065', latitude: 40.1559, longitude: -83.1175, phone: '(614) 645-3400', website: 'https://www.columbuszoo.org', description: 'One of the best zoos in the US with 10,000+ animals across themed regions. New North America Trek expansion, elephant calves, and adjacent Zoombezi Bay water park and Jungle Jack\'s Landing rides.', cost: '$20-28/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
  { name: 'Cincinnati Zoo & Botanical Garden', address: '3400 Vine St', city: 'Cincinnati', state: 'OH', zipCode: '45220', latitude: 39.1454, longitude: -84.5082, phone: '(513) 281-4700', website: 'https://cincinnatizoo.org', description: 'Home of famous hippo Fiona! 500+ animal species, 3,000 plant types, train ride, 4-D theater, and seasonal festivals. Named greenest zoo in the US. Wildlife Canyon, Africa exhibit, and beautiful botanical gardens.', cost: '$20-28/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
  { name: 'Cleveland Metroparks Zoo', address: '3900 Wildlife Way', city: 'Cleveland', state: 'OH', zipCode: '44109', latitude: 41.4458, longitude: -81.7112, phone: '(216) 661-6500', website: 'https://www.clevelandmetroparks.com/zoo', description: 'Largest collection of primates in the US plus the incredible Rainforest exhibit — a two-story indoor tropical forest. Australian Adventure, African Elephant Crossing, and seasonal events.', cost: '$17-22/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
  { name: 'Akron Zoo', address: '505 Euclid Ave', city: 'Akron', state: 'OH', zipCode: '44307', latitude: 41.0755, longitude: -81.5255, phone: '(330) 375-2550', website: 'https://www.akronzoo.org', description: 'Compact family-friendly zoo with Komodo Kingdom, Grizzly Ridge, penguin exhibit, and Pride of Africa. Perfect size for young kids — see everything without exhaustion. Nature play area and splash pad.', cost: '$12-17/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
];

// ==========================================
// 4. WATER PARKS & AQUATIC CENTERS
// ==========================================

const WATER_PARKS = [
  // --- Pennsylvania ---
  { name: 'Kalahari Resorts - Pocono Mountains', address: '250 Kalahari Blvd', city: 'Pocono Manor', state: 'PA', zipCode: '18349', latitude: 41.1042, longitude: -75.3736, phone: '(877) 525-2427', website: 'https://www.kalahariresorts.com/pennsylvania', description: 'America\'s largest indoor water park at 220,000 sq ft! Tube slides, body slides, family raft rides, wave pool, lazy river, water coaster, FlowRider surf simulator, and toddler pools. Always 84 degrees.', cost: '$250-500/night (hotel)', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Camelback Resort - Aquatopia', address: '193 Resort Dr', city: 'Tannersville', state: 'PA', zipCode: '18372', latitude: 41.0460, longitude: -75.3249, phone: '(570) 629-1661', website: 'https://www.camelbackresort.com', description: 'PA\'s #1-ranked indoor water park with 125,000 sq ft of water fun. 13 slides, adventure river, kiddie pools, splash zones, and Aquatopia\'s signature transparent roof. Adjacent ski resort for winter fun.', cost: '$200-450/night (hotel)', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Great Wolf Lodge - Scotrun', address: '1 Great Wolf Dr', city: 'Scotrun', state: 'PA', zipCode: '18355', latitude: 41.0654, longitude: -75.2700, phone: '(800) 768-9653', website: 'https://www.greatwolf.com/pocono-mountains', description: 'Recently renovated indoor water park resort in the Poconos. Multi-story slides, Fort Mackenzie water treehouse, kiddie pools, and wave pool. MagiQuest, Build-A-Bear, and Howl-In-One mini golf included.', cost: '$200-400/night (hotel)', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Splash Lagoon Indoor Water Park', address: '8091 Peach St', city: 'Erie', state: 'PA', zipCode: '16509', latitude: 42.0578, longitude: -80.1064, phone: '(866) 377-5274', website: 'https://www.splashlagoon.com', description: '80,000 sq ft indoor water park with 7 slides, FlowRider surf simulator, 200,000-gallon wave pool (largest in Eastern US), 4-story Tiki treehouse, lazy river, and kids\' activity area. Open year-round.', cost: '$30-55/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Sandcastle Waterpark', address: '1000 Sandcastle Dr', city: 'West Homestead', state: 'PA', zipCode: '15120', latitude: 40.3908, longitude: -79.9123, phone: '(412) 462-6666', website: 'https://www.sandcastlewaterpark.com', description: 'Pittsburgh\'s premier outdoor water park along the Monongahela River. 15 water slides, lazy river, wave pool, kiddie pool area, and boardwalk games. Mon Tsunami wave pool is a family favorite.', cost: '$25-40/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },

  // --- Ohio ---
  { name: 'Kalahari Resorts - Sandusky', address: '7000 Kalahari Dr', city: 'Sandusky', state: 'OH', zipCode: '44870', latitude: 41.4055, longitude: -82.6488, phone: '(877) 525-2427', website: 'https://www.kalahariresorts.com/ohio', description: 'Midwest\'s largest indoor water park — voted #1 by USA TODAY! Tube slides, water coaster, FlowRider, wave pool, lazy river, family raft rides, and toddler splash area. Also has outdoor water park in summer.', cost: '$200-450/night (hotel)', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
  { name: 'Cedar Point Shores', address: '1 Cedar Point Dr', city: 'Sandusky', state: 'OH', zipCode: '44870', latitude: 41.4800, longitude: -82.6830, phone: '(419) 627-2350', website: 'https://www.cedarpoint.com/cedar-point-shores', description: '18-acre outdoor water park at Cedar Point. Riptide Raceway, Point Plummet speed slides, lazy river, wave pool, and Lemmy\'s Lagoon & Lakeside Landing kids\' areas with pint-sized slides and wading pools.', cost: '$35-50/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Zoombezi Bay', address: '4850 W Powell Rd', city: 'Powell', state: 'OH', zipCode: '43065', latitude: 40.1565, longitude: -83.1190, phone: '(614) 645-3400', website: 'https://www.columbuszoo.org/zoombezi-bay', description: 'Water park at the Columbus Zoo complex. Family raft rides, speed slides, lazy river, wave pool, and Baboon Lagoon kids\' area. Combo tickets let you visit both the zoo and water park in one day.', cost: '$25-40/person', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: false },
  { name: 'Great Wolf Lodge - Mason', address: '2501 Great Wolf Dr', city: 'Mason', state: 'OH', zipCode: '45040', latitude: 39.3610, longitude: -84.2830, phone: '(800) 913-9653', website: 'https://www.greatwolf.com/mason', description: 'Indoor water park resort near Cincinnati and Kings Island. Multi-level slides, Fort Mackenzie treehouse, kiddie area, wave pool, and lazy river. MagiQuest, arcade, and Build-A-Bear on-site.', cost: '$200-400/night (hotel)', ageRange: 'All Ages', isFree: false, type: 'water-park', isIndoor: true },
];

// ==========================================
// 5. NATURE, TRAILS & GARDENS
// ==========================================

const NATURE_VENUES = [
  // --- Pennsylvania ---
  { name: 'Longwood Gardens', address: '1001 Longwood Rd', city: 'Kennett Square', state: 'PA', zipCode: '19348', latitude: 39.8717, longitude: -75.6736, phone: '(610) 388-1000', website: 'https://longwoodgardens.org', description: 'World-renowned 1,077-acre botanical garden. Spectacular conservatory, outdoor fountains with illuminated shows, children\'s garden with a maze, treehouse, and water play. Seasonal festivals and holiday displays.', cost: '$25-30/person', ageRange: 'All Ages', isFree: false, type: 'botanical-garden', isIndoor: false },
  { name: 'Phipps Conservatory & Botanical Gardens', address: '1 Schenley Park', city: 'Pittsburgh', state: 'PA', zipCode: '15213', latitude: 40.4389, longitude: -79.9479, phone: '(412) 622-6914', website: 'https://www.phipps.conservatory.org', description: 'Historic Victorian glasshouse with stunning seasonal flower shows, tropical forest room, orchid room, and outdoor gardens. Discovery Garden for kids with hands-on nature play. In beautiful Schenley Park.', cost: '$18-22/person', ageRange: 'All Ages', isFree: false, type: 'botanical-garden', isIndoor: false },
  { name: 'Ohiopyle State Park', address: '124 Main St', city: 'Ohiopyle', state: 'PA', zipCode: '15470', latitude: 39.8681, longitude: -79.4948, phone: '(724) 329-8591', website: 'https://www.dcnr.pa.gov/StateParks/FindAPark/OhiopyleStatePark', description: 'Stunning park with kid-friendly Ferncliff Trail loop, natural rock waterslide at Meadow Run (free!), scenic waterfalls, and family-friendly whitewater rafting. Bike the Great Allegheny Passage trail.', cost: 'Free (parking fee)', ageRange: 'All Ages', isFree: true, type: 'nature-trail', isIndoor: false },
  { name: 'Ricketts Glen State Park', address: '695 State Rt 487', city: 'Benton', state: 'PA', zipCode: '17814', latitude: 41.3271, longitude: -76.2671, phone: '(570) 477-5675', website: 'https://www.dcnr.pa.gov/StateParks/FindAPark/RickettsGlenStatePark', description: 'Home to 22 named waterfalls along the Falls Trail. The most spectacular waterfall hiking in PA. Lake beach, camping, and shorter family-friendly trail options. Iconic Adams Falls is a quick walk.', cost: 'Free', ageRange: 'Ages 5+', isFree: true, type: 'nature-trail', isIndoor: false },
  { name: 'Cherry Crest Adventure Farm', address: '150 Cherry Hill Rd', city: 'Ronks', state: 'PA', zipCode: '17572', latitude: 40.0075, longitude: -76.1808, phone: '(717) 687-6843', website: 'https://www.cherrycrestfarm.com', description: 'Amazing Amazing Maze — a 5-acre corn maze that\'s been named best in America. 50+ farm activities including gem mining, pedal carts, barnyard animals, apple cannons, and wagon rides in Lancaster County.', cost: '$20-30/person', ageRange: 'All Ages', isFree: false, type: 'farm', isIndoor: false },

  // --- Ohio ---
  { name: 'Franklin Park Conservatory & Botanical Gardens', address: '1777 E Broad St', city: 'Columbus', state: 'OH', zipCode: '43203', latitude: 39.9648, longitude: -82.9543, phone: '(614) 715-8000', website: 'https://www.fpconservatory.org', description: 'Botanical garden and conservatory with tropical, desert, and Himalayan biomes. Chihuly glass art collection, children\'s garden with nature play, seasonal butterfly exhibit, and Scotts Miracle-Gro Community Garden.', cost: '$16-20/person', ageRange: 'All Ages', isFree: false, type: 'botanical-garden', isIndoor: false },
  { name: 'Hocking Hills State Park', address: '19852 State Rt 664 S', city: 'Logan', state: 'OH', zipCode: '43138', latitude: 39.4415, longitude: -82.5384, phone: '(740) 385-6842', website: 'https://thehockinghills.org', description: 'Ohio\'s most scenic park with caves, waterfalls, and gorges. Old Man\'s Cave trail is iconic. Ash Cave is wheelchair/stroller-accessible with a stunning 90-foot waterfall. Cedar Falls and Rock House are kid favorites.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-trail', isIndoor: false },
  { name: 'Quarry Trails Metro Park', address: '2245 Dublin Rd', city: 'Columbus', state: 'OH', zipCode: '43228', latitude: 39.9820, longitude: -83.0770, website: 'https://www.metroparks.net', description: 'Stunning converted quarry with waterfall, floating boardwalk, zip line, mountain bike trails, and the largest free outdoor climbing wall in the country. A unique urban adventure park.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-trail', isIndoor: false },
  { name: 'Penitentiary Glen Nature Center', address: '8668 Kirtland Chardon Rd', city: 'Kirtland', state: 'OH', zipCode: '44094', latitude: 41.5984, longitude: -81.3453, phone: '(440) 256-1404', website: 'https://www.lakemetroparks.com', description: 'Nature center with incredible indoor and outdoor play areas. Nature playground with water station, sandbox, and children\'s garden. Wildlife center with live animals, plus miles of wooded gorge trails.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'nature-center', isIndoor: false },
  { name: 'Inniswood Metro Gardens', address: '940 S Hempstead Rd', city: 'Westerville', state: 'OH', zipCode: '43081', latitude: 40.0937, longitude: -82.8778, website: 'https://www.metroparks.net', description: 'Beautiful free public gardens with kids\' Secret Garden, herb garden, rock garden, and woodland trails. Sister of the Winds sculpture garden and seasonal displays. Peaceful family outing.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'botanical-garden', isIndoor: false },
];

// ==========================================
// 6. HERITAGE RAILROADS & UNIQUE EXPERIENCES
// ==========================================

const UNIQUE_EXPERIENCES = [
  // --- Pennsylvania ---
  { name: 'Strasburg Rail Road', address: '301 Gap Rd', city: 'Ronks', state: 'PA', zipCode: '17572', latitude: 40.0044, longitude: -76.1793, phone: '(717) 687-7522', website: 'https://www.strasburgrailroad.com', description: 'America\'s oldest operating short-line railroad. Scenic steam train rides through Amish farmland in Lancaster County. Thomas the Tank Engine events, dining trains, and adjacent Railroad Museum of Pennsylvania.', cost: '$18-30/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: false },
  { name: 'Railroad Museum of Pennsylvania', address: '300 Gap Rd', city: 'Ronks', state: 'PA', zipCode: '17572', latitude: 40.0040, longitude: -76.1780, phone: '(717) 687-8628', website: 'https://rrmuseumpa.org', description: 'Over 100 historic locomotives and railroad cars spanning 200 years of railroad history. Climb into train cabs, operate model trains, and explore rail cars. Right across from Strasburg Rail Road.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
  { name: 'Scene75 Entertainment Center - Pittsburgh', address: '3100 S Braddock Ave', city: 'Pittsburgh', state: 'PA', zipCode: '15218', latitude: 40.4230, longitude: -79.8825, website: 'https://www.scene75.com', description: '90,000 sq ft indoor entertainment mega-center. 120+ arcade games, indoor go-karts, 2-story laser tag, black light mini golf, duckpin bowling, bumper cars, and virtual reality. All under one roof.', cost: '$15-40/person', ageRange: 'All Ages', isFree: false, type: 'entertainment-center', isIndoor: true },
  { name: 'Zone 28', address: '26 Freeport Rd', city: 'Pittsburgh', state: 'PA', zipCode: '15238', latitude: 40.5160, longitude: -79.8545, phone: '(412) 828-1015', website: 'https://www.zone28.com', description: '33 bowling lanes, 3,000 sq ft laser tag arena, 85+ arcade games, and immersive escape rooms. Full restaurant and bar for parents. One of Pittsburgh\'s top family entertainment destinations.', cost: '$10-30/person', ageRange: 'All Ages', isFree: false, type: 'entertainment-center', isIndoor: true },

  // --- Ohio ---
  { name: 'Hocking Valley Scenic Railway', address: '33 E Canal St', city: 'Nelsonville', state: 'OH', zipCode: '45764', latitude: 39.4570, longitude: -82.2330, phone: '(740) 753-9531', website: 'https://www.hvsry.org', description: 'Scenic train rides behind a 1920 Baldwin steam locomotive through the beautiful Hocking Hills. Regular excursions plus themed rides — Santa trains, Easter Bunny, robbery trains, and caboose rides.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: false },
  { name: 'Cuyahoga Valley Scenic Railroad', address: '7900 Old Rockside Rd', city: 'Independence', state: 'OH', zipCode: '44131', latitude: 41.3800, longitude: -81.6350, phone: '(800) 468-4070', website: 'https://www.cvsr.org', description: 'Scenic train through Cuyahoga Valley National Park. Bike Aboard lets you ride one way and bike back. Polar Express, Easter, and fall foliage excursions. National Park scenery from vintage train cars.', cost: '$20-35/person', ageRange: 'All Ages', isFree: false, type: 'heritage-railroad', isIndoor: false },
  { name: 'Scene75 Entertainment Center - Columbus', address: '3659 Parkway Ln', city: 'Hilliard', state: 'OH', zipCode: '43026', latitude: 40.0445, longitude: -83.1610, website: 'https://www.scene75.com', description: 'Massive indoor entertainment center with go-karts, laser tag, 120+ arcade games, mini golf, bumper cars, bowling, and virtual reality. Multiple attractions for one price or pay-as-you-go.', cost: '$15-40/person', ageRange: 'All Ages', isFree: false, type: 'entertainment-center', isIndoor: true },
  { name: 'Magic Mountain Fun Center', address: '10015 E Broad St', city: 'Pataskala', state: 'OH', zipCode: '43062', latitude: 39.9927, longitude: -82.7185, phone: '(740) 927-3224', website: 'https://www.magicmountainfuncenter.com', description: 'Year-round fun with outdoor go-karts, bumper boats, batting cages (summer), plus 10,000 sq ft roller skating rink, laser tag, arcade, and play zones for big and little kids.', cost: '$8-25/person', ageRange: 'All Ages', isFree: false, type: 'entertainment-center', isIndoor: false },
];

// ==========================================
// 7. JUNE 2026 EVENTS & FESTIVALS
// ==========================================

const JUNE_EVENTS = [
  // --- Pennsylvania ---
  { name: 'Intercourse Heritage Days', address: '3542 Old Philadelphia Pike', city: 'Intercourse', state: 'PA', zipCode: '17534', latitude: 40.0380, longitude: -76.1083, website: 'https://www.padutchcountry.com', description: 'Family-friendly heritage festival in the heart of Amish Country. Spelling bee, live music, heritage craftsmen demos, local food fair, kids\' activities, and a glimpse into Lancaster County traditions.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 19-20, 2026' },
  { name: 'Pittsburgh Three Rivers Arts Festival', address: '803 Liberty Ave', city: 'Pittsburgh', state: 'PA', zipCode: '15222', latitude: 40.4418, longitude: -79.9977, website: 'https://www.traf.co', description: 'Free 10-day arts festival at Point State Park. Live music, visual art exhibitions, artist marketplace, kids\' activities and art-making workshops, food vendors, and outdoor performances.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 2026' },

  // --- Ohio ---
  { name: 'Columbus Arts Festival', address: '233 Civic Center Dr', city: 'Columbus', state: 'OH', zipCode: '43215', latitude: 39.9545, longitude: -83.0020, website: 'https://www.columbusartsfestival.org', description: 'Free three-day festival along the Scioto Mile riverfront. 300+ juried artists, live music on multiple stages, interactive children\'s art area, community mural painting, and diverse food vendors.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 2026' },
  { name: 'Troy Strawberry Festival', address: '1 Public Square', city: 'Troy', state: 'OH', zipCode: '45373', latitude: 40.0393, longitude: -84.2033, website: 'https://www.troystrawberryfest.com', description: 'Beloved two-day small-town festival with live entertainment, classic car cruise, 5K run, strawberry treats everywhere, food vendors, craft booths, and family activities in charming downtown Troy.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 6-7, 2026' },
  { name: 'Ohio Renaissance Festival', address: '10542 E State Route 73', city: 'Waynesville', state: 'OH', zipCode: '45068', latitude: 39.5100, longitude: -84.0600, phone: '(513) 897-7000', website: 'https://www.renfestival.com', description: '30-acre 16th-century English village with jousting, 150+ artisan shops, live stage shows, themed weekends, turkey legs, and sword fights. One of the largest Renaissance fairs in the US. Weekends late Aug-Oct.', cost: '$25-35/person', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, dates: 'Late August - October 2026' },
  { name: 'Holland Strawberry Festival', address: '402 Clark St', city: 'Holland', state: 'OH', zipCode: '43528', latitude: 41.6187, longitude: -83.7121, website: 'https://hollandstrawberryfestival.com', description: 'Five-day community festival with carnival rides, live music, pageants, car show, strawberry shortcake eating contests, parade, and tons of strawberry-themed food. A Northwest Ohio tradition.', cost: 'Free admission', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 17-21, 2026' },
];


// ==========================================
// Category mapping
// ==========================================
function getCategory(venue) {
  const map = {
    'theme-park': { category: 'Outdoor', subcategory: 'Theme Park & Amusement' },
    'museum': { category: 'Learning & Culture', subcategory: 'Museum' },
    'zoo': { category: 'Outdoor', subcategory: 'Zoo & Aquarium' },
    'water-park': { category: 'Outdoor', subcategory: 'Water Park & Pool' },
    'botanical-garden': { category: 'Outdoor', subcategory: 'Botanical Garden' },
    'nature-trail': { category: 'Outdoor', subcategory: 'Nature Trail & Hike' },
    'nature-center': { category: 'Learning & Culture', subcategory: 'Nature Center' },
    'farm': { category: 'Agritourism', subcategory: 'Farm Experience' },
    'heritage-railroad': { category: 'Outdoor', subcategory: 'Heritage Railroad' },
    'entertainment-center': { category: 'Indoor Fun', subcategory: 'Entertainment Center' },
    'festival': { category: 'Events', subcategory: 'Festival' },
  };
  return map[venue.type] || { category: 'Family Fun', subcategory: 'Activity' };
}

// ==========================================
// Create activity document
// ==========================================
function createActivityDocument(venue) {
  const lat = venue.latitude || 40.0;
  const lng = venue.longitude || -80.0;
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
      source: 'pennsylvania-ohio-venues-2026',
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

  console.log(`\n🏗️  PENNSYLVANIA & OHIO FAMILY VENUES`);
  console.log(`📍 Coverage: PA & OH`);
  console.log('='.repeat(60));
  if (isDryRun) console.log('🏃 DRY RUN MODE\n');

  const startTime = Date.now();
  const allActivities = [];

  const sections = [
    { label: '🎢 Theme Parks & Amusement Parks', data: THEME_PARKS },
    { label: '🏛️  Museums & Learning', data: MUSEUMS },
    { label: '🦁 Zoos & Animal Attractions', data: ZOOS },
    { label: '🌊 Water Parks & Aquatic Centers', data: WATER_PARKS },
    { label: '🌿 Nature, Trails & Gardens', data: NATURE_VENUES },
    { label: '🚂 Railroads & Unique Experiences', data: UNIQUE_EXPERIENCES },
    { label: '🎉 June 2026 Events & Festivals', data: JUNE_EVENTS },
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
