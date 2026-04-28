#!/usr/bin/env node

/**
 * ADD DMV VENUES, EVENTS & PROGRAMS
 *
 * Imports ~100+ family-friendly venues, seasonal events, and programs across
 * DC, MD, VA, PA, DE, NJ into the activities database.
 *
 * Categories:
 *   1. Indoor Attractions — play spaces, trampoline parks, climbing, museums
 *   2. Seasonal Events — spring/summer 2026 festivals and fairs
 *   3. Classes & Programs — swim schools, gyms, art, sports
 *
 * Usage:
 *   node add-dmv-venues-and-events.js          # Run full import
 *   node add-dmv-venues-and-events.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('../../scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('../../scrapers/venue-matcher');

const SCRAPER_NAME = 'DMV-Venues-Events-2026';

// ==========================================
// 1. INDOOR ATTRACTIONS
// ==========================================

const INDOOR_ATTRACTIONS = [
  // --- Indoor Playgrounds ---
  { name: 'ZavaZone', address: '40B Southlawn Court', city: 'Rockville', state: 'MD', zipCode: '20850', latitude: 39.0648, longitude: -77.1221, phone: '(800) 376-9282', website: 'https://www.zavazone.com', description: 'Multi-attraction indoor adventure park with trampolines, ninja courses, zip lines, climbing challenges, and party packages.', cost: '$20-35/person', ageRange: 'Ages 3+', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'ZavaZone Sterling', address: '21070 Southbank St', city: 'Sterling', state: 'VA', zipCode: '20165', latitude: 39.0075, longitude: -77.4088, phone: '(800) 376-9282', website: 'https://www.zavazone.com', description: 'Multi-attraction indoor adventure park with trampolines, ninja courses, zip lines, and climbing challenges.', cost: '$20-35/person', ageRange: 'Ages 3+', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'LEGO Discovery Center Washington, D.C.', address: '6563 Springfield Mall Suite 12004', city: 'Springfield', state: 'VA', zipCode: '22150', latitude: 38.7743, longitude: -77.1739, phone: '(571) 506-4322', website: 'https://www.legodiscoverycenter.com/washington-dc', description: '32,000 sq ft indoor LEGO playground with 12 zones, 4D cinema, MINIWORLD DC landmarks, Creative Workshop, and DUPLO Park for ages 3-12.', cost: '$25-30/person', ageRange: 'Ages 3-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'The Toy Nest', address: '125 N. Washington Street', city: 'Falls Church', state: 'VA', zipCode: '22046', latitude: 38.8845, longitude: -77.1711, phone: '(703) 988-1777', website: 'https://thetoynest.com', description: 'Toy lending library, indoor play space, and party venue. One of only three full-time toy libraries in the U.S. Kids can borrow and play with toys, games, puzzles.', cost: '$10-15/visit', ageRange: 'Ages 0-8', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Beehive Indoor Playground', address: '14215 Smoketown Rd', city: 'Woodbridge', state: 'VA', zipCode: '22192', latitude: 38.6613, longitude: -77.2966, website: 'https://www.beehiveindoorplayground.com', description: 'Indoor playground with climbing structures, slides, ball pits, and imaginative play areas for toddlers and young children.', cost: '$12-18/child', ageRange: 'Ages 1-10', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Billy Beez', address: '8300 Sudley Rd', city: 'Manassas', state: 'VA', zipCode: '20109', latitude: 38.7742, longitude: -77.4866, website: 'https://billybeezus.com', description: 'Large indoor play area with multi-level play structures, slides, ball cannons, sports courts, and toddler zone.', cost: '$15-20/child', ageRange: 'Ages 1-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Jolly Yolly Kids - Bethesda', address: '7315 Wisconsin Ave', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9838, longitude: -77.0935, website: 'https://www.jollyyollykids.com', description: 'Indoor play space with themed play areas, craft stations, and party rooms for young children.', cost: '$15-20/child', ageRange: 'Ages 1-8', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Jolly Yolly Kids - Fairfax', address: '3903 Fair Ridge Dr', city: 'Fairfax', state: 'VA', zipCode: '22033', latitude: 38.8593, longitude: -77.3780, website: 'https://www.jollyyollykids.com', description: 'Indoor play space with themed play areas, craft stations, and party rooms for young children.', cost: '$15-20/child', ageRange: 'Ages 1-8', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Kidz Plaza Indoor Playground', address: '44050 Ashburn Shopping Plaza', city: 'Ashburn', state: 'VA', zipCode: '20147', latitude: 39.0457, longitude: -77.4747, website: 'https://www.kidzplaza.com', description: 'Indoor playground with multi-level play structures, toddler area, and party rooms.', cost: '$12-18/child', ageRange: 'Ages 1-10', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Luv 2 Play', address: '11210 Lee Hwy Suite E2', city: 'Fairfax', state: 'VA', zipCode: '22030', latitude: 38.8616, longitude: -77.3217, website: 'https://www.luv2play.com/fairfax', description: 'Indoor playground with themed play zones, climbing structures, slides, and dedicated toddler area.', cost: '$15-20/child', ageRange: 'Ages 1-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Monkey Joe\'s - Germantown', address: '12825 Wisteria Dr', city: 'Germantown', state: 'MD', zipCode: '20874', latitude: 39.1699, longitude: -77.2585, website: 'https://www.monkeyjoes.com', description: 'Indoor inflatable play center with bounce houses, slides, obstacle courses, and arcade games.', cost: '$12-15/child', ageRange: 'Ages 2-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Monkey Joe\'s - Dulles', address: '21100 Dulles Town Cir', city: 'Sterling', state: 'VA', zipCode: '20166', latitude: 39.0320, longitude: -77.4120, website: 'https://www.monkeyjoes.com', description: 'Indoor inflatable play center with bounce houses, slides, obstacle courses, and arcade games.', cost: '$12-15/child', ageRange: 'Ages 2-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Scramble', address: '210 Commerce St', city: 'Alexandria', state: 'VA', zipCode: '22314', latitude: 38.8026, longitude: -77.0474, website: 'https://www.scramblekids.com', description: 'Modern indoor play space with climbing structures, slides, and creative play areas for toddlers and kids.', cost: '$15-20/child', ageRange: 'Ages 0-8', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Launch Trampoline Park', address: '6240 Old Branch Ave', city: 'Capitol Heights', state: 'MD', zipCode: '20743', latitude: 38.8363, longitude: -76.8930, website: 'https://www.launchtrampolinepark.com', description: 'Trampoline park with wall-to-wall trampolines, foam pits, ninja warrior course, dodgeball courts.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Pump It Up - Lanham', address: '9501 Lanham Severn Rd', city: 'Lanham', state: 'MD', zipCode: '20706', latitude: 38.9604, longitude: -76.8412, website: 'https://www.pumpitupparty.com', description: '100% private inflatable party and play center with huge inflatable slides, jump zones, and games.', cost: '$10-15/child', ageRange: 'Ages 2-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Pump It Up - Alexandria', address: '6224 Richmond Hwy', city: 'Alexandria', state: 'VA', zipCode: '22303', latitude: 38.7801, longitude: -77.0775, website: 'https://www.pumpitupparty.com', description: '100% private inflatable party and play center with huge inflatable slides, jump zones, and games.', cost: '$10-15/child', ageRange: 'Ages 2-12', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Kids Play Gallery', address: '235 N Frederick Ave', city: 'Gaithersburg', state: 'MD', zipCode: '20877', latitude: 39.1470, longitude: -77.2010, website: 'https://www.kidsplaygallery.com', description: 'Imaginative playspace with themed rooms for creative and pretend play, plus art activities.', cost: '$12-15/child', ageRange: 'Ages 1-8', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'The Little Towns Playseum', address: '10400 Old Georgetown Rd', city: 'North Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9940, longitude: -77.1042, website: 'https://thelittletowns.com', description: 'Interactive playspace where kids explore a miniature town with shops, fire station, and vet clinic.', cost: '$15-20/child', ageRange: 'Ages 1-8', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Unplug & Play', address: '4416 Ridgewood Center Dr', city: 'Woodbridge', state: 'VA', zipCode: '22192', latitude: 38.6633, longitude: -77.3043, website: 'https://www.unplugandplay.net', description: 'Screen-free imaginative playspace with themed rooms for creative and pretend play.', cost: '$12-15/child', ageRange: 'Ages 1-10', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'The Tot Space', address: '12159 Nebel St', city: 'Rockville', state: 'MD', zipCode: '20852', latitude: 39.0545, longitude: -77.1203, website: 'https://www.thetotspace.com', description: 'Indoor play space designed specifically for babies and toddlers with sensory activities and soft play.', cost: '$12-15/child', ageRange: 'Ages 0-5', isFree: false, type: 'indoor-play', isIndoor: true },
  { name: 'Kidz City', address: '2429 University Blvd W', city: 'Wheaton', state: 'MD', zipCode: '20902', latitude: 39.0464, longitude: -77.0595, website: 'https://kidzcitymd.com', description: 'Family fun center with indoor playground, arcade, laser tag, and party rooms.', cost: '$15-20/child', ageRange: 'Ages 2-12', isFree: false, type: 'indoor-play', isIndoor: true },

  // --- Trampoline Parks ---
  { name: 'Urban Air - Glen Burnie', address: '6711 Chesapeake Center Dr', city: 'Glen Burnie', state: 'MD', zipCode: '21060', latitude: 39.1625, longitude: -76.6139, website: 'https://www.urbanair.com/maryland-glen-burnie', description: 'Indoor adventure park with trampolines, climbing walls, ropes course, warrior obstacles, go-karts, and virtual reality.', cost: '$20-35/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Urban Air - Laurel', address: '14200 Baltimore Ave', city: 'Laurel', state: 'MD', zipCode: '20707', latitude: 39.0969, longitude: -76.8573, website: 'https://www.urbanair.com/maryland-laurel', description: 'Indoor adventure park with trampolines, climbing walls, ninja warrior course, and go-karts.', cost: '$20-35/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Urban Air - Largo', address: '9131 Alaking Ct', city: 'Largo', state: 'MD', zipCode: '20774', latitude: 38.8924, longitude: -76.8053, website: 'https://www.urbanair.com/maryland-largo', description: 'Indoor adventure park with trampolines, climbing walls, ropes course, and go-karts.', cost: '$20-35/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Urban Air - White Marsh', address: '8133 Honeygo Blvd', city: 'Baltimore', state: 'MD', zipCode: '21236', latitude: 39.3721, longitude: -76.4672, website: 'https://www.urbanair.com/maryland-white-marsh', description: 'Indoor adventure park with trampolines, climbing walls, ropes course, and virtual reality.', cost: '$20-35/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Sky Zone - Bowie', address: '4031 Colgan Ct', city: 'Bowie', state: 'MD', zipCode: '20716', latitude: 38.9444, longitude: -76.7389, website: 'https://www.skyzone.com/bowie', description: 'Wall-to-wall trampolines, ninja warrior courses, foam pits, dodgeball, and trampoline basketball.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Sky Zone - Gaithersburg', address: '9508 Gerwig Ln', city: 'Gaithersburg', state: 'MD', zipCode: '20879', latitude: 39.1548, longitude: -77.1835, website: 'https://www.skyzone.com/gaithersburg', description: 'Wall-to-wall trampolines, ninja warrior courses, foam pits, dodgeball, and zip lines.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Sky Zone - Manassas', address: '7550 Doane Dr', city: 'Manassas', state: 'VA', zipCode: '20109', latitude: 38.7561, longitude: -77.4591, website: 'https://www.skyzone.com/manassas', description: 'Trampoline park with wall-to-wall trampolines, ninja warrior, foam pits, and dodgeball.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Sky Zone - Springfield', address: '7010 Spring Garden Dr', city: 'Springfield', state: 'VA', zipCode: '22150', latitude: 38.7791, longitude: -77.1873, website: 'https://www.skyzone.com/springfield', description: 'Trampoline park with trampolines, ninja course, foam pits, and dodgeball courts.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Sky Zone - Woodbridge', address: '14424 Gideon Dr', city: 'Woodbridge', state: 'VA', zipCode: '22192', latitude: 38.6500, longitude: -77.2720, website: 'https://www.skyzone.com/woodbridge', description: 'Trampoline park with wall-to-wall trampolines, ninja warrior, and foam pits.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Atomic Trampoline', address: '155 Fort Evans Rd NE', city: 'Leesburg', state: 'VA', zipCode: '20176', latitude: 39.1195, longitude: -77.5468, website: 'https://atomictrampoline.com', description: 'Indoor trampoline park with open jump, dodgeball, foam pit, basketball hoops, and ninja course.', cost: '$15-20/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Flight Adventure Park', address: '6410 Springfield Plaza', city: 'Springfield', state: 'VA', zipCode: '22150', latitude: 38.7835, longitude: -77.1842, website: 'https://www.flightadventurepark.com', description: 'Trampoline and adventure park with open jump, dodgeball, ninja warrior, rock climbing, and zip line.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Get Air - Alexandria', address: '6230 N Kings Hwy', city: 'Alexandria', state: 'VA', zipCode: '22303', latitude: 38.7834, longitude: -77.0811, website: 'https://getairsports.com/alexandria', description: 'Trampoline park with open jump, foam pits, dodgeball, ninja course, and kiddie court.', cost: '$15-20/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Altitude Trampoline Park - Delmar', address: '9714 Ocean Gateway', city: 'Delmar', state: 'MD', zipCode: '21875', latitude: 38.4530, longitude: -75.5702, website: 'https://www.altitudedelmar.com', description: 'Trampoline park with Mega Play, trampolines, rock wall, foam pit, and dodgeball for all ages.', cost: '$15-20/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },
  { name: 'Vault Active Play', address: '1919 Rock Spring Rd', city: 'Forest Hill', state: 'MD', zipCode: '21050', latitude: 39.5732, longitude: -76.3777, website: 'https://www.vaultactiveplay.com', description: 'Indoor fun center with trampolines, ninja courses, arcade, café, and party space.', cost: '$15-25/person', ageRange: 'Ages 3+', isFree: false, type: 'trampoline', isIndoor: true },

  // --- Rock Climbing ---
  { name: 'Bouldering Project DC', address: '1325 Okie St NE', city: 'Washington', state: 'DC', zipCode: '20002', latitude: 38.9110, longitude: -76.9876, website: 'https://www.boulderingproject.com/dc', description: 'World-class indoor bouldering gym with climbing walls for all levels, yoga, fitness area, and community events.', cost: '$20-28/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Climb Zone', address: '9161 Rumsey Rd', city: 'Columbia', state: 'MD', zipCode: '21045', latitude: 39.2060, longitude: -76.8615, website: 'https://climbzone.us', description: 'Indoor climbing facility with variety of climbing walls suited for kids and families.', cost: '$15-20/person', ageRange: 'Ages 4+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Movement Rockville', address: '725 Rockville Pike', city: 'Rockville', state: 'MD', zipCode: '20852', latitude: 39.0667, longitude: -77.1212, website: 'https://www.movementgyms.com/rockville', description: 'Indoor climbing gym with bouldering, top-rope, lead climbing, yoga, and fitness classes.', cost: '$20-28/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Movement Arlington', address: '1400 Key Blvd', city: 'Arlington', state: 'VA', zipCode: '22209', latitude: 38.8935, longitude: -77.0750, website: 'https://www.movementgyms.com/arlington', description: 'Indoor climbing gym with bouldering, rope climbing, yoga, and fitness classes.', cost: '$20-28/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Sportrock - Alexandria', address: '5308 Eisenhower Ave', city: 'Alexandria', state: 'VA', zipCode: '22304', latitude: 38.8005, longitude: -77.1149, website: 'https://www.sportrock.com', description: 'Indoor rock climbing gym with bouldering, top-rope, lead climbing, and youth programs.', cost: '$20-25/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Sportrock - Sterling', address: '45935 Maries Rd', city: 'Sterling', state: 'VA', zipCode: '20166', latitude: 39.0175, longitude: -77.4337, website: 'https://www.sportrock.com', description: 'Indoor rock climbing gym with bouldering, top-rope, and lead climbing.', cost: '$20-25/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Sportrock - Gaithersburg', address: '9550 Gerwig Ln', city: 'Gaithersburg', state: 'MD', zipCode: '20879', latitude: 39.1552, longitude: -77.1838, website: 'https://www.sportrock.com', description: 'Indoor rock climbing gym with bouldering, top-rope, and lead climbing. Youth climbing teams.', cost: '$20-25/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Vertical Rock - Manassas', address: '9630 Surveyor Ct', city: 'Manassas', state: 'VA', zipCode: '20110', latitude: 38.7438, longitude: -77.4741, website: 'https://verticalrock.com', description: 'Indoor climbing facility with walls up to 45 ft, bouldering, and kids climbing programs.', cost: '$18-22/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },
  { name: 'Vertical Rock - Tysons', address: '8349 Leesburg Pike', city: 'Tysons', state: 'VA', zipCode: '22182', latitude: 38.9179, longitude: -77.2311, website: 'https://verticalrock.com', description: 'Indoor climbing facility with bouldering and rope climbing.', cost: '$18-22/day', ageRange: 'Ages 5+', isFree: false, type: 'climbing', isIndoor: true },

  // --- Other Indoor Fun ---
  { name: 'Bloombars', address: '3222 11th St NW', city: 'Washington', state: 'DC', zipCode: '20010', latitude: 38.9294, longitude: -77.0261, website: 'https://bloombars.com', description: 'Community arts and music space with family-friendly events, open mics, and creative play.', cost: 'Free-$10', ageRange: 'All Ages', isFree: true, type: 'arts', isIndoor: true },
  { name: 'Ultrazone Laser Tag', address: '3447 Carlin Springs Rd', city: 'Bailey\'s Crossroads', state: 'VA', zipCode: '22041', latitude: 38.8488, longitude: -77.1254, website: 'https://www.ultrazonevirginialasertag.com', description: 'Multi-level laser tag arena with fog, maze, and special effects for exciting team-based play.', cost: '$10-15/game', ageRange: 'Ages 6+', isFree: false, type: 'laser-tag', isIndoor: true },
  { name: 'SkateQuest', address: '1800 Michael Faraday Ct', city: 'Reston', state: 'VA', zipCode: '20190', latitude: 39.0333, longitude: -77.3512, website: 'https://www.skatequest.com', description: 'Indoor ice skating rink with public skating sessions, lessons, and party packages.', cost: '$12-15/session', ageRange: 'All Ages', isFree: false, type: 'skating', isIndoor: true },
  { name: 'Glen Echo Park Aquarium', address: '7300 MacArthur Blvd', city: 'Glen Echo', state: 'MD', zipCode: '20812', latitude: 38.9671, longitude: -77.1405, website: 'https://glenechopark.org', description: 'Small freshwater aquarium inside historic Glen Echo Park. Free admission, great for toddlers.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'aquarium', isIndoor: true },
  { name: 'Bowie Ice Arena', address: '3330 Northview Dr', city: 'Bowie', state: 'MD', zipCode: '20716', latitude: 38.9601, longitude: -76.7255, website: 'https://www.cityofbowie.org/facilities', description: 'Public indoor ice skating arena with learn-to-skate programs, public sessions, and hockey leagues.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, type: 'skating', isIndoor: true },
  { name: 'Children\'s Science Center Lab', address: '11948 Fair Oaks Mall', city: 'Fairfax', state: 'VA', zipCode: '22033', latitude: 38.8633, longitude: -77.3587, website: 'https://www.childsci.org', description: 'Interactive STEM exhibit space with hands-on experiments, coding, robotics, and engineering challenges.', cost: '$8-12/person', ageRange: 'Ages 2-12', isFree: false, type: 'museum', isIndoor: true },
  { name: 'The St. James - Springfield', address: '6805 Industrial Rd', city: 'Springfield', state: 'VA', zipCode: '22151', latitude: 38.7709, longitude: -77.1815, website: 'https://www.thestjames.com', description: 'Massive indoor sports complex with Nerf Battle Zone, trampolines, ninja warrior course, ropes course, climbing walls, and aquatics center.', cost: '$25-50/person', ageRange: 'All Ages', isFree: false, type: 'sports-complex', isIndoor: true },

  // --- Museums with Kids Activity Rooms ---
  { name: 'Museum of the Bible - Courageous Pages', address: '400 4th St SW', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8847, longitude: -77.0166, website: 'https://www.museumofthebible.org', description: 'Kids activity center inside Museum of the Bible with interactive exhibits, crafts, and story time.', cost: '$24.99/adult, kids free', ageRange: 'Ages 3-12', isFree: false, type: 'museum', isIndoor: true },
  { name: 'National Building Museum', address: '401 F St NW', city: 'Washington', state: 'DC', zipCode: '20001', latitude: 38.8980, longitude: -77.0163, website: 'https://www.nbm.org', description: 'Architecture and design museum with rotating interactive family exhibits. Famous for immersive summer installations like the Beach and the Hive.', cost: '$10-16/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
];

// ==========================================
// 2. SEASONAL EVENTS (Spring/Summer 2026)
// ==========================================

const SEASONAL_EVENTS = [
  { name: 'National Cherry Blossom Festival', address: 'Tidal Basin', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8814, longitude: -77.0365, website: 'https://nationalcherryblossomfestival.org', description: 'Annual spring celebration of DC\'s cherry blossoms. Features parade (April 11), Blossom Kite Festival, Bloomaroo at the Wharf, Japanese cultural activities, and family events.', cost: 'Free (most events)', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'March-April 2026' },
  { name: 'Bunnyland Festival at Butler\'s Orchard', address: '22222 Davis Mill Rd', city: 'Germantown', state: 'MD', zipCode: '20876', latitude: 39.1892, longitude: -77.2695, website: 'https://www.butlersorchard.com', description: 'Easter celebration with egg hunts, live bunnies, hayrides, farm animals, and spring activities for families.', cost: '$12-18/person', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'April 2026' },
  { name: 'Shenandoah Apple Blossom Festival', address: '135 N Cameron St', city: 'Winchester', state: 'VA', zipCode: '22601', latitude: 39.1860, longitude: -78.1633, website: 'https://www.thebloom.com', description: 'Historic festival with parades, concerts, races, carnival rides, and family events celebrating apple blossoms in the Shenandoah Valley.', cost: 'Varies by event', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'Late April-Early May 2026' },
  { name: 'Maryland Sheep & Wool Festival', address: '4607 Sheppard Rd', city: 'West Friendship', state: 'MD', zipCode: '21794', latitude: 39.3012, longitude: -76.9620, website: 'https://sheepandwool.org', description: 'Annual festival featuring 800+ sheep, sheep shearing demos, fiber arts, spinning, weaving, and farm activities. Great for kids who love animals.', cost: '$5-10/person', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'May 2026' },
  { name: 'Columbia Festival of the Arts - LakeFest', address: '10275 Wincopin Cir', city: 'Columbia', state: 'MD', zipCode: '21044', latitude: 39.2108, longitude: -76.8546, website: 'https://columbiafestival.org', description: 'FREE 3-day family festival with live music, fine arts & crafts show, kids entertainment, interactive activities, and food vendors at the lakefront.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, seasonal: 'Summer', dates: 'June 2026' },
  { name: 'Silver Spring World Heritage Festival', address: 'Ellsworth Dr', city: 'Silver Spring', state: 'MD', zipCode: '20910', latitude: 38.9953, longitude: -77.0260, website: 'https://www.silverspringdowntown.com', description: 'Cultural festival with ethnic food from 70+ vendors, cultural performances, dance, music, and family activities celebrating Silver Spring\'s diversity.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, seasonal: 'Summer', dates: 'June 2026' },
  { name: 'Enchanted Woods at Winterthur', address: '5105 Kennett Pike', city: 'Winterthur', state: 'DE', zipCode: '19735', latitude: 39.8052, longitude: -75.5967, website: 'https://www.winterthur.org', description: 'Whimsical outdoor play area in Winterthur gardens with Faerie Cottage, giant bird\'s nest, thatched-roof tearoom, and nature exploration.', cost: '$20/adult, $6/child', ageRange: 'Ages 2-10', isFree: false, type: 'garden', isIndoor: false, seasonal: 'Year-round', dates: 'Open seasonally' },
  { name: 'Dino Festival & Tulip Experience at Arrowhead Farmstead', address: '1171 Ringoes-Flemington Rd', city: 'Flemington', state: 'NJ', zipCode: '08822', latitude: 40.5029, longitude: -74.8349, website: 'https://arrowheadfarmstead.com', description: '30 life-sized dinosaurs among 1 million tulips, with fossil hunting, dino stage shows, science lessons, and stunning flower fields.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'April-May 2026' },
  { name: 'PEEPS in the Village at Peddler\'s Village', address: '100 Peddlers Village', city: 'Lahaska', state: 'PA', zipCode: '18931', latitude: 40.3497, longitude: -75.0532, website: 'https://peddlersvillage.com', description: 'Colorful spring festival where beloved Easter candy is transformed into creative sculptures displayed throughout the charming village.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'April 2026' },
  { name: 'Newark Cherry Blossom Festival at Branch Brook Park', address: '55 Clifton Ave', city: 'Newark', state: 'NJ', zipCode: '07104', latitude: 40.7627, longitude: -74.1725, website: 'https://www.branchbrookpark.org', description: 'Festival celebrating the largest collection of cherry blossom trees in the US. Features 5K race, Family Fun Day, and BloomFest.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, seasonal: 'Spring', dates: 'April 2026' },

  // --- Farmers Markets ---
  { name: 'Downtown Silver Spring Farmers Market', address: 'Ellsworth Dr & Fenton St', city: 'Silver Spring', state: 'MD', zipCode: '20910', latitude: 38.9957, longitude: -77.0260, website: 'https://www.freshfarm.org/markets/downtown-silver-spring', description: 'Year-round farmers market with 45+ vendors, fresh produce, local meats, baked goods, flowers, and family activities. Saturdays 9am-1pm.', cost: 'Free entry', ageRange: 'All Ages', isFree: true, type: 'market', isIndoor: false, seasonal: 'Year-round', dates: 'Saturdays' },
  { name: 'Reston Farmers Market', address: '1609 Washington Plaza N', city: 'Reston', state: 'VA', zipCode: '20190', latitude: 38.9583, longitude: -77.3424, website: 'https://www.restonfarmersmarket.com', description: 'Voted Best Farmers Market in NoVA. 25+ years supporting local agriculture with produce, meats, and artisanal goods. Saturdays.', cost: 'Free entry', ageRange: 'All Ages', isFree: true, type: 'market', isIndoor: false, seasonal: 'April-December', dates: 'Saturdays' },
  { name: 'NoMa Farmers Market', address: '3rd St NE', city: 'Washington', state: 'DC', zipCode: '20002', latitude: 38.9066, longitude: -77.0051, website: 'https://nomabid.org/farmersmarket', description: 'Outdoor market with fresh produce, meats, artisanal goods, ready-to-eat meals, and live music. April-October Thursdays 4-8pm.', cost: 'Free entry', ageRange: 'All Ages', isFree: true, type: 'market', isIndoor: false, seasonal: 'April-October', dates: 'Thursdays' },
  { name: 'Takoma Park Farmers Market', address: '6931 Laurel Ave', city: 'Takoma Park', state: 'MD', zipCode: '20912', latitude: 38.9769, longitude: -77.0078, website: 'https://takomaparkmarket.com', description: 'Year-round Sunday farmers market with local produce, baked goods, crafts, and family-friendly atmosphere.', cost: 'Free entry', ageRange: 'All Ages', isFree: true, type: 'market', isIndoor: false, seasonal: 'Year-round', dates: 'Sundays' },
];

// ==========================================
// 3. CLASSES & PROGRAMS
// ==========================================

const CLASSES_PROGRAMS = [
  // --- Swim Schools ---
  { name: 'KIDS FIRST Swim School - Rockville', address: '5530 Wisconsin Ave', city: 'Chevy Chase', state: 'MD', zipCode: '20815', latitude: 38.9609, longitude: -77.0858, website: 'https://kidsfirstswim.com', description: 'Premier swim school with group and semi-private lessons for ages 3+. Part of a 12-location network across the DC area.', cost: '$30-50/lesson', ageRange: 'Ages 3+', isFree: false, type: 'swim', isIndoor: true },
  { name: 'KIDS FIRST Swim School - Bethesda', address: '4800 Auburn Ave', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9826, longitude: -77.0975, website: 'https://kidsfirstswim.com', description: 'Premier swim school with group and semi-private lessons for ages 3+.', cost: '$30-50/lesson', ageRange: 'Ages 3+', isFree: false, type: 'swim', isIndoor: true },
  { name: 'WeAquatics', address: '6010 Executive Blvd', city: 'Rockville', state: 'MD', zipCode: '20852', latitude: 39.0633, longitude: -77.1099, website: 'https://weaquatics.com', description: 'Top-quality swim lessons for children, adults, and beginners in DC, MD & VA. Private and group classes available.', cost: '$40-70/lesson', ageRange: 'Ages 6mo+', isFree: false, type: 'swim', isIndoor: true },
  { name: 'British Swim School - DMV', address: 'Multiple locations', city: 'Various', state: 'MD', zipCode: '', latitude: 39.0000, longitude: -77.0000, website: 'https://www.britishswimschool.com', description: 'Learn-to-swim programs for ages 3 months through adults. Gentle approach with water survival skills focus. Multiple DMV locations in hotel and fitness center pools.', cost: '$35-55/lesson', ageRange: 'Ages 3mo+', isFree: false, type: 'swim', isIndoor: true },
  { name: 'Nation\'s Capital Swim Club', address: 'Multiple locations', city: 'Various', state: 'MD', zipCode: '', latitude: 39.0000, longitude: -77.0500, website: 'https://ncapswim.org', description: 'Swim club operating 12+ locations in DC/MD/VA. Trained Olympians like Katie Ledecky. Learn-to-swim through competitive programs.', cost: 'Varies', ageRange: 'Ages 5+', isFree: false, type: 'swim', isIndoor: true },

  // --- Gyms & Movement ---
  { name: 'Gymboree - Woodley Park', address: '2639 Connecticut Ave NW', city: 'Washington', state: 'DC', zipCode: '20008', latitude: 38.9249, longitude: -77.0530, website: 'https://www.gymboreeclasses.com', description: 'Play-based classes for babies through age 5. Includes music, art, and developmental play programs.', cost: '$20-35/class', ageRange: 'Ages 0-5', isFree: false, type: 'gym', isIndoor: true },
  { name: 'My Gym - Bethesda', address: '4803 Bethesda Ave', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 38.9813, longitude: -77.0968, website: 'https://www.mygym.com/bethesda', description: 'Children\'s fitness center with structured classes combining gymnastics, music, sports, and games for ages 6 weeks to 10 years.', cost: '$20-30/class', ageRange: 'Ages 6wk-10yr', isFree: false, type: 'gym', isIndoor: true },
  { name: 'The Little Gym - Silver Spring', address: '923 Ellsworth Dr', city: 'Silver Spring', state: 'MD', zipCode: '20910', latitude: 38.9949, longitude: -77.0247, website: 'https://www.thelittlegym.com/silverspring', description: 'Gymnastics-based classes for kids including parent/child, gymnastics, dance, karate, and sports skills.', cost: '$20-30/class', ageRange: 'Ages 4mo-12yr', isFree: false, type: 'gym', isIndoor: true },
  { name: 'The Little Gym - Arlington', address: '4001 N Fairfax Dr', city: 'Arlington', state: 'VA', zipCode: '22203', latitude: 38.8850, longitude: -77.1008, website: 'https://www.thelittlegym.com/arlington', description: 'Gymnastics-based classes for kids including parent/child, gymnastics, dance, and sports skills.', cost: '$20-30/class', ageRange: 'Ages 4mo-12yr', isFree: false, type: 'gym', isIndoor: true },
  { name: 'The Little Gym - Alexandria', address: '3443 Richmond Hwy', city: 'Alexandria', state: 'VA', zipCode: '22305', latitude: 38.8111, longitude: -77.0560, website: 'https://www.thelittlegym.com/alexandria', description: 'Gymnastics-based classes for kids including parent/child, gymnastics, dance, and sports skills.', cost: '$20-30/class', ageRange: 'Ages 4mo-12yr', isFree: false, type: 'gym', isIndoor: true },
  { name: 'Silver Stars Gymnastics', address: '8505 Fenton St', city: 'Silver Spring', state: 'MD', zipCode: '20910', latitude: 38.9941, longitude: -77.0253, website: 'https://www.silverstarsgymnastics.com', description: 'Gymnastics training center with recreational and competitive classes for all ages.', cost: '$25-35/class', ageRange: 'Ages 2+', isFree: false, type: 'gym', isIndoor: true },
  { name: 'Tiny Dancers', address: 'Multiple locations', city: 'Various', state: 'DC', zipCode: '', latitude: 38.9100, longitude: -77.0300, website: 'https://tinydancers.com', description: 'Ballet classes and fairy-tale birthday parties for young children. Over 50 ballet stories to choose from. Classes and parties across DC/MD/VA.', cost: '$25-35/class', ageRange: 'Ages 2-8', isFree: false, type: 'dance', isIndoor: true },
  { name: 'Little Ivies', address: '5185 MacArthur Blvd NW', city: 'Washington', state: 'DC', zipCode: '20016', latitude: 38.9284, longitude: -77.1065, website: 'https://littleivies.com', description: 'Enrichment classes, camps, and customizable birthday parties. Whole play space reserved for parties with two party leaders.', cost: '$25-40/class', ageRange: 'Ages 1-8', isFree: false, type: 'enrichment', isIndoor: true },
  { name: 'Magic Ground', address: '3222 11th St NW', city: 'Washington', state: 'DC', zipCode: '20010', latitude: 38.9294, longitude: -77.0261, website: 'https://www.magicgrounddc.com', description: 'Open play space and enrichment classes for babies and toddlers in Columbia Heights.', cost: '$15-25/session', ageRange: 'Ages 0-5', isFree: false, type: 'enrichment', isIndoor: true },
];


// ==========================================
// HELPER: Determine category from type
// ==========================================
function getCategory(venue) {
  const t = venue.type;
  if (['indoor-play', 'trampoline', 'laser-tag'].includes(t))
    return { category: 'Indoor Play', subcategory: t === 'trampoline' ? 'Trampoline Park' : t === 'laser-tag' ? 'Laser Tag' : 'Indoor Playground' };
  if (t === 'climbing')
    return { category: 'Sports & Fitness', subcategory: 'Rock Climbing' };
  if (t === 'skating')
    return { category: 'Sports & Fitness', subcategory: 'Ice Skating' };
  if (t === 'sports-complex')
    return { category: 'Sports & Fitness', subcategory: 'Sports Complex' };
  if (t === 'museum')
    return { category: 'Learning & Culture', subcategory: 'Museum' };
  if (t === 'aquarium')
    return { category: 'Learning & Culture', subcategory: 'Aquarium' };
  if (t === 'arts')
    return { category: 'Learning & Culture', subcategory: 'Arts & Music' };
  if (t === 'festival')
    return { category: 'Events', subcategory: 'Festival' };
  if (t === 'garden')
    return { category: 'Outdoor', subcategory: 'Garden' };
  if (t === 'market')
    return { category: 'Events', subcategory: 'Farmers Market' };
  if (t === 'swim')
    return { category: 'Classes & Programs', subcategory: 'Swim Lessons' };
  if (['gym', 'dance', 'enrichment'].includes(t))
    return { category: 'Classes & Programs', subcategory: t === 'dance' ? 'Dance' : t === 'enrichment' ? 'Enrichment' : 'Kids Gym' };
  return { category: 'Family Fun', subcategory: 'Activity' };
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
      source: 'dmv-venues-events-2026',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      venueType: venue.type,
      ...(venue.seasonal && { seasonal: venue.seasonal }),
      ...(venue.dates && { eventDates: venue.dates }),
    },
    filters: {
      isFree: venue.isFree || false,
      isIndoor: venue.isIndoor !== undefined ? venue.isIndoor : true,
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

  console.log(`\n🎪 DMV VENUES, EVENTS & PROGRAMS IMPORTER`);
  console.log(`📍 Coverage: DC, MD, VA, PA, DE, NJ`);
  console.log('='.repeat(60));
  if (isDryRun) console.log('🏃 DRY RUN MODE\n');

  const startTime = Date.now();
  const allActivities = [];

  // Indoor Attractions
  console.log(`\n🏢 Indoor Attractions: ${INDOOR_ATTRACTIONS.length} venues`);
  for (const v of INDOOR_ATTRACTIONS) {
    allActivities.push(createActivityDocument(v));
  }

  // Seasonal Events
  console.log(`🎉 Seasonal Events: ${SEASONAL_EVENTS.length} events`);
  for (const v of SEASONAL_EVENTS) {
    allActivities.push(createActivityDocument(v));
  }

  // Classes & Programs
  console.log(`📚 Classes & Programs: ${CLASSES_PROGRAMS.length} programs`);
  for (const v of CLASSES_PROGRAMS) {
    allActivities.push(createActivityDocument(v));
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
  console.log(`\n📊 By category:`);
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
