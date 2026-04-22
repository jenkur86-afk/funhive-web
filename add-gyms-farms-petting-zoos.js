#!/usr/bin/env node

/**
 * ADD GYMNASTICS CENTERS, OPEN GYMS, PETTING ZOOS & FARM EVENTS
 *
 * Imports:
 *   1. Gymnastics centers with open gym / toddler time
 *   2. Petting zoos and educational farms
 *   3. Farm events & festivals (strawberry, peach, fall)
 *
 * Usage:
 *   node add-gyms-farms-petting-zoos.js          # Run full import
 *   node add-gyms-farms-petting-zoos.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('./scrapers/venue-matcher');

const SCRAPER_NAME = 'Gyms-Farms-PettingZoos-2026';

// ==========================================
// 1. GYMNASTICS CENTERS & OPEN GYMS
// ==========================================

const GYMNASTICS_CENTERS = [
  // --- Maryland ---
  { name: 'Dominique Dawes Gymnastics Academy - Columbia', address: '8970 Route 108', city: 'Columbia', state: 'MD', zipCode: '21045', latitude: 39.2146, longitude: -76.8540, phone: '(443) 546-3924', website: 'https://www.dominiquedawesgymnasticsacademy.com/columbia', description: 'Olympic gold medalist Dominique Dawes\' gymnastics academy. Recreational and competitive gymnastics, tumbling, ninja classes for ages 9 months to 13 years. Open gym sessions available.', cost: '$20-35/class', ageRange: 'Ages 9mo-13yr', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Dominique Dawes Gymnastics Academy - Rockville', address: '5531 Nicholson Ln', city: 'Rockville', state: 'MD', zipCode: '20852', latitude: 39.0560, longitude: -77.1199, phone: '(301) 294-4840', website: 'https://www.dominiquedawesgymnasticsacademy.com/rockville', description: 'Olympic gold medalist Dominique Dawes\' academy. Recreational gymnastics, ninja, and tumbling classes. 90-minute open gym sessions for free play on equipment.', cost: '$20-35/class', ageRange: 'Ages 9mo-13yr', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Dominique Dawes Gymnastics Academy - Clarksburg', address: '23410 Clarksburg Rd', city: 'Clarksburg', state: 'MD', zipCode: '20871', latitude: 39.2368, longitude: -77.2677, phone: '(240) 379-6242', website: 'https://www.dominiquedawesgymnasticsacademy.com/clarksburg', description: 'Olympic gold medalist Dominique Dawes\' academy. Gymnastics, ninja, and tumbling classes. Open gym sessions where kids can jump, climb, and play freely.', cost: '$20-35/class', ageRange: 'Ages 9mo-13yr', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Dynamite Gymnastics Center', address: '10300 Westlake Dr', city: 'North Bethesda', state: 'MD', zipCode: '20852', latitude: 39.0397, longitude: -77.1140, phone: '(301) 468-0028', website: 'https://www.dynamitegc.com', description: 'Gymnastics for ages 6 months through adults. Open gym sessions, classes, camps, and competitive teams. Diverse equipment for safe free play.', cost: '$20-30/class', ageRange: 'Ages 6mo+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Rebounders Gymnastics', address: '2505 Pot Spring Rd', city: 'Timonium', state: 'MD', zipCode: '21093', latitude: 39.4448, longitude: -76.6185, phone: '(410) 252-6767', website: 'https://rebounders.com', description: 'Family-friendly gymnastics center since 1975. Classes, special needs programs, fitness, homeschool activities, competitive teams, and open gym sessions.', cost: '$20-30/class', ageRange: 'Ages 2+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Docksiders Gymnastics', address: '836 Ritchie Hwy Suite 16', city: 'Severna Park', state: 'MD', zipCode: '21146', latitude: 39.0870, longitude: -76.5650, phone: '(410) 544-9002', website: 'https://www.docksidersgymnastics.com', description: 'Gymnastics center with instructional open gyms, recreational and competitive classes, and camps. Kids practice skills in a supervised environment.', cost: '$18-28/class', ageRange: 'Ages 2+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Frederick Gymnastics Club', address: '201 Thomas Johnson Dr', city: 'Frederick', state: 'MD', zipCode: '21702', latitude: 39.4178, longitude: -77.4240, phone: '(301) 694-5530', website: 'https://www.frederickgymnastics.com', description: 'Mid-Maryland\'s largest gymnastics program. Open gym for ages K and up, plus recreational and competitive classes, camps, and birthday parties.', cost: '$18-25/class', ageRange: 'Ages 5+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Mid-Atlantic Gymnastics', address: '7300 Muncaster Mill Rd', city: 'Derwood', state: 'MD', zipCode: '20855', latitude: 39.1200, longitude: -77.1445, phone: '(301) 948-0444', website: 'http://www.midatlanticgymnastics.com', description: 'Gymnastics classes, open gym, tumbling, and competitive teams. Serves the Rockville/Derwood area with programs for toddlers through teens.', cost: '$20-30/class', ageRange: 'Ages 2+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Power Tots', address: '12001 Guilford Rd', city: 'Annapolis Junction', state: 'MD', zipCode: '20701', latitude: 39.1168, longitude: -76.8120, website: 'https://www.powertotsinc.com', description: 'Kids gymnastics, dance, and yoga classes. Specializes in preschool and early childhood movement programs. Open play and birthday parties.', cost: '$18-30/class', ageRange: 'Ages 1-8', isFree: false, type: 'gymnastics', isIndoor: true },

  // --- Virginia ---
  { name: 'Fairfax Gymnastics Academy', address: '3729 Pickett Rd', city: 'Fairfax', state: 'VA', zipCode: '22031', latitude: 38.8536, longitude: -77.2856, phone: '(703) 323-8050', website: 'http://www.fairfaxgymnastics.net', description: 'Gymnastics classes and open gym for ages 2-18. Teaches real gymnastics from the very first class. Open gym sessions, birthday parties, and camps.', cost: '$18-28/class', ageRange: 'Ages 2-18', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Capital Gymnastics National Training Center', address: '14215 Sullyfield Cir', city: 'Chantilly', state: 'VA', zipCode: '20151', latitude: 38.8802, longitude: -77.4404, phone: '(703) 266-7575', website: 'https://www.capitalgymnasticsntc.com', description: 'Gymnastics, tumbling, and cheer for all ages and levels, from preschool to adult. Open gym, recreational and competitive programs.', cost: '$20-35/class', ageRange: 'Ages 2+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'ASI Gymnastics - Herndon', address: '570 Huntmar Park Dr', city: 'Herndon', state: 'VA', zipCode: '20170', latitude: 38.9487, longitude: -77.3891, website: 'https://www.asigymnastics.com', description: 'Fun-focused gymnastics classes for kids and teens. Open gym, camps, birthday parties, and progressive skill-based programs.', cost: '$18-30/class', ageRange: 'Ages 2+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Loudoun Gymnastics Center', address: '45668 Woodland Rd', city: 'Sterling', state: 'VA', zipCode: '20166', latitude: 39.0013, longitude: -77.4180, phone: '(703) 430-4500', website: 'https://www.loudoungymnastics.com', description: 'Gymnastics classes, open gym, tumbling, and competitive teams in Loudoun County. Programs for toddlers through teens.', cost: '$20-30/class', ageRange: 'Ages 18mo+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Gymnastics World', address: '5861 Crossroads Center Way', city: 'Falls Church', state: 'VA', zipCode: '22041', latitude: 38.8520, longitude: -77.1376, website: 'https://www.gymnasticsworldva.com', description: '10,000 sq ft facility with classes in rhythmic and aerobic gymnastics, cheerleading, and more for ages 2+. Open gym and birthday parties.', cost: '$18-28/class', ageRange: 'Ages 2+', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'Nova Gymnastics', address: '8025 Gallows Ct', city: 'Vienna', state: 'VA', zipCode: '22182', latitude: 38.8786, longitude: -77.2283, phone: '(703) 204-0808', website: 'https://www.novagymnastics.com', description: 'Recreational and competitive gymnastics for all ages. Parent & tot classes, open gym, camps, and birthday parties.', cost: '$20-30/class', ageRange: 'Ages 18mo+', isFree: false, type: 'gymnastics', isIndoor: true },

  // --- DC ---
  { name: 'The Little Gym - Capitol Hill', address: '210 7th St SE', city: 'Washington', state: 'DC', zipCode: '20003', latitude: 38.8850, longitude: -76.9958, phone: '(202) 544-5933', website: 'https://www.thelittlegym.com/dc-capitol-hill', description: 'Progressive gymnastics program starting at 4 months with Parent/Child classes through Pre-K and Grade School. Dance, karate, sports skills, and camps.', cost: '$20-30/class', ageRange: 'Ages 4mo-12yr', isFree: false, type: 'gymnastics', isIndoor: true },
  { name: 'The Little Gym - Columbia', address: '8870 McGaw Rd', city: 'Columbia', state: 'MD', zipCode: '21045', latitude: 39.2042, longitude: -76.8350, website: 'https://www.thelittlegym.com/maryland-columbia', description: 'Gymnastics, dance, and movement classes for kids ages 4 months to 12 years. Parent/child, preschool, and grade school programs.', cost: '$20-30/class', ageRange: 'Ages 4mo-12yr', isFree: false, type: 'gymnastics', isIndoor: true },
];

// ==========================================
// 2. PETTING ZOOS & EDUCATIONAL FARMS
// ==========================================

const PETTING_ZOOS_FARMS = [
  { name: 'Frying Pan Farm Park', address: '2709 W Ox Rd', city: 'Herndon', state: 'VA', zipCode: '20171', latitude: 38.9296, longitude: -77.3658, phone: '(703) 437-9101', website: 'https://www.fairfaxcounty.gov/parks/frying-pan-park', description: 'Free working educational farm operated by Fairfax County. Dozens of farm animals, carousel, playground, country store, and seasonal events. Great for toddlers and young kids.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'petting-zoo', isIndoor: false },
  { name: 'Leesburg Animal Park', address: '19270 James Monroe Hwy', city: 'Leesburg', state: 'VA', zipCode: '20175', latitude: 39.0748, longitude: -77.5915, phone: '(703) 433-0002', website: 'https://www.leesburganimalpark.com', description: 'Petting zoo with goats, sheep, llamas, and exotic animals. Live animal shows, wagon rides, pony rides, gemstone mining, and playground.', cost: '$12-15/person', ageRange: 'All Ages', isFree: false, type: 'petting-zoo', isIndoor: false },
  { name: 'Old Maryland Farm at Watkins Regional Park', address: '301 Watkins Park Dr', city: 'Upper Marlboro', state: 'MD', zipCode: '20774', latitude: 38.8799, longitude: -76.7960, phone: '(301) 218-6702', website: 'https://www.pgparks.com', description: 'Interactive educational farm inside Watkins Regional Park. Kids learn about farm life through hands-on exhibits, meet farm animals, and participate in curriculum-based programs.', cost: '$2-4/person', ageRange: 'All Ages', isFree: false, type: 'petting-zoo', isIndoor: false },
  { name: 'Clark\'s Elioak Farm', address: '10500 Clarksville Pike', city: 'Ellicott City', state: 'MD', zipCode: '21042', latitude: 39.2633, longitude: -76.8969, phone: '(410) 730-4049', website: 'https://www.clarklandfarm.com', description: 'Petting farm with goats, sheep, pigs, chickens, and cows. Pony rides, enchanted forest with storybook characters, hayrides, and seasonal pumpkin patch.', cost: '$8-12/person', ageRange: 'All Ages', isFree: false, type: 'petting-zoo', isIndoor: false },
  { name: 'Catoctin Wildlife Preserve', address: '13019 Catoctin Furnace Rd', city: 'Thurmont', state: 'MD', zipCode: '21788', latitude: 39.6355, longitude: -77.4306, phone: '(301) 271-3180', website: 'https://www.cwpzoo.com', description: '50-acre park with 1,000+ exotic animals including big cats, monkeys, reptiles, and birds. Animal encounters, feeding experiences, and educational programs.', cost: '$18-22/person', ageRange: 'All Ages', isFree: false, type: 'zoo', isIndoor: false },
  { name: 'Kidwell Farm at Frying Pan Park', address: '2709 W Ox Rd', city: 'Herndon', state: 'VA', zipCode: '20171', latitude: 38.9290, longitude: -77.3650, website: 'https://www.fairfaxcounty.gov/parks/frying-pan-park', description: 'Working demonstration farm at Frying Pan Park. Meet heritage breed animals including cows, pigs, horses, chickens, and turkeys. Free admission year-round.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'petting-zoo', isIndoor: false },
  { name: 'Homestead Gardens Farm', address: '743 W Central Ave', city: 'Davidsonville', state: 'MD', zipCode: '21035', latitude: 38.9890, longitude: -76.6520, phone: '(410) 798-5000', website: 'https://homesteadgardens.com', description: 'Garden center and farm with seasonal family events including fall festival, petting zoo, corn maze, pumpkin patch, and holiday events.', cost: 'Varies', ageRange: 'All Ages', isFree: false, type: 'farm-events', isIndoor: false },
  { name: 'Shady Brook Farm', address: '931 Stony Hill Rd', city: 'Yardley', state: 'PA', zipCode: '19067', latitude: 40.2110, longitude: -74.8508, phone: '(215) 968-1670', website: 'https://www.shadybrookfarm.com', description: 'Family farm with petting area, seasonal festivals, wagon rides, strawberry picking, pumpkin patch, holiday light show, and farm market. Year-round events.', cost: 'Varies by season', ageRange: 'All Ages', isFree: false, type: 'farm-events', isIndoor: false },
  { name: 'Grim\'s Orchard & Family Farms', address: '9 Grim Rd', city: 'Breinigsville', state: 'PA', zipCode: '18031', latitude: 40.5522, longitude: -75.6367, phone: '(610) 395-5655', website: 'https://grimsorchard.com', description: 'Award-winning family farm with u-pick fruit, hayrides, corn mazes, petting zoo, and farm activities. One of PA\'s best pumpkin patches.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-events', isIndoor: false },
  { name: 'Hellerick\'s Adventure Farm', address: '5500 Loux Dr', city: 'Doylestown', state: 'PA', zipCode: '18902', latitude: 40.3393, longitude: -75.1147, phone: '(215) 766-8388', website: 'https://hellericksfarm.com', description: 'Pumpkin picking, hayrides, corn mazes, sunflower field, farm animals, fresh baked goods, and cider. Spring and fall family festivals.', cost: '$12-18/person', ageRange: 'All Ages', isFree: false, type: 'farm-events', isIndoor: false },
  { name: 'Cedar Hollow Farm', address: '1640 Sleepy Hollow Rd', city: 'Pennsburg', state: 'PA', zipCode: '18073', latitude: 40.3930, longitude: -75.4838, website: 'https://www.cedarhollowfarm.com', description: 'U-pick pumpkins, 8-acre interactive corn maze, apple slingshots, farm animals, and family fall activities.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-events', isIndoor: false },
  { name: 'Delaware Museum of Nature and Science', address: '4840 Kennett Pike', city: 'Wilmington', state: 'DE', zipCode: '19807', latitude: 39.7693, longitude: -75.5769, phone: '(302) 658-9111', website: 'https://www.delmns.org', description: 'Nature museum with PaleoZone dinosaur exhibit, live animal encounters, nature trails, and hands-on science activities. Great for young explorers.', cost: '$10-14/person', ageRange: 'All Ages', isFree: false, type: 'museum', isIndoor: true },
];

// ==========================================
// 3. FARM EVENTS & FESTIVALS
// ==========================================

const FARM_EVENTS = [
  { name: 'Strawberry Jubilee Fest at Great Country Farms', address: '18780 Foggy Bottom Rd', city: 'Bluemont', state: 'VA', zipCode: '20135', latitude: 39.1137, longitude: -77.8257, website: 'https://greatcountryfarms.com/festivals-events/strawberry-jubilee/', description: 'Annual strawberry festival with live music, farm contests, wagon rides, strawberry picking, food, and games for the whole family. Mid-May through mid-June.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'May-June 2026' },
  { name: 'Strawberry Festival at Messick\'s Farm Market', address: '5801 Catlett Rd', city: 'Bealeton', state: 'VA', zipCode: '22712', latitude: 38.5625, longitude: -77.7545, website: 'https://www.messicksfarmmarket.com', description: 'Four-weekend strawberry festival with hayrides, barrel train, zip line, bounce pillow, face painting, kid tattoos, and u-pick strawberries.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'May 2026' },
  { name: 'Lincoln Strawberry Festival at Wegmeyer Farms', address: '39399 Irish Corner Rd', city: 'Hamilton', state: 'VA', zipCode: '20158', latitude: 39.1297, longitude: -77.6766, website: 'https://wegmeyerfarms.com', description: 'Strawberry festival with pancake breakfast, strawberry picking, live music, face painting, hayrides, barrel train rides, interactive farm experiences, and local vendors.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'May 2026' },
  { name: 'Peach Fuzztival at Great Country Farms', address: '18780 Foggy Bottom Rd', city: 'Bluemont', state: 'VA', zipCode: '20135', latitude: 39.1137, longitude: -77.8257, website: 'https://greatcountryfarms.com', description: 'Summer peach festival with u-pick peaches, peach desserts, live music, wagon rides, and farm activities. Peak peach season celebration.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'July-August 2026' },
  { name: 'Big Dig Potato Harvest at Great Country Farms', address: '18780 Foggy Bottom Rd', city: 'Bluemont', state: 'VA', zipCode: '20135', latitude: 39.1137, longitude: -77.8257, website: 'https://greatcountryfarms.com', description: 'Kids dig up their own potatoes straight from the field. Fun hands-on farm activity with wagon rides and farm playground.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'August-September 2026' },
  { name: 'Fall Festival at Larriland Farm', address: '2415 Woodbine Rd', city: 'Woodbine', state: 'MD', zipCode: '21797', latitude: 39.3480, longitude: -77.0505, website: 'https://www.pickyourown.com', description: 'Fall apple picking, pumpkin patch, hayrides, and farm market with fresh cider, baked goods, and seasonal produce.', cost: 'Pay by weight', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'September-November 2026' },
  { name: 'Fall Festival at Buppert\'s Farm', address: '16015 Darnestown Rd', city: 'Poolesville', state: 'MD', zipCode: '20837', latitude: 39.1371, longitude: -77.3736, website: 'https://buppertsfarm.com', description: 'U-pick pumpkin patch, family corn maze, hayrides, farm animals, and fall activities. Seasonal fall fun in Montgomery County.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'September-October 2026' },
  { name: 'Cox Farms Fall Festival', address: '15621 Braddock Rd', city: 'Centreville', state: 'VA', zipCode: '20120', latitude: 38.8137, longitude: -77.4491, phone: '(703) 830-4121', website: 'https://www.coxfarms.com', description: 'Massive fall festival with hayrides, giant slides, rope swings, corn maze, pumpkin patch, farm animals, and the famous Fields of Fear nighttime event. One of the DMV\'s biggest fall destinations.', cost: '$15-25/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'September-November 2026' },
  { name: 'Temple Hall Farm Regional Park', address: '15789 Temple Hall Ln', city: 'Leesburg', state: 'VA', zipCode: '20176', latitude: 39.1364, longitude: -77.5396, phone: '(703) 779-9372', website: 'https://www.novaparks.com/parks/temple-hall-farm', description: 'Working farm with pick-your-own produce, farm animals, fishing pond, and seasonal events. Strawberries in spring, pumpkins in fall.', cost: '$5-10/entry', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'Spring-Fall' },
  { name: 'Fall Harvest Festival at Homestead Gardens', address: '743 W Central Ave', city: 'Davidsonville', state: 'MD', zipCode: '21035', latitude: 38.9890, longitude: -76.6520, website: 'https://homesteadgardens.com', description: 'Annual fall festival with pumpkin patch, corn maze, hayrides, farm animals, live music, food, and seasonal activities in Anne Arundel County.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'farm-festival', isIndoor: false, dates: 'September-October 2026' },
];


// ==========================================
// Category mapping
// ==========================================
function getCategory(venue) {
  const map = {
    'gymnastics': { category: 'Classes & Programs', subcategory: 'Gymnastics & Open Gym' },
    'petting-zoo': { category: 'Outdoor', subcategory: 'Petting Zoo' },
    'zoo': { category: 'Outdoor', subcategory: 'Zoo' },
    'farm-events': { category: 'Agritourism', subcategory: 'Farm Experience' },
    'farm-festival': { category: 'Events', subcategory: 'Farm Festival' },
    'museum': { category: 'Learning & Culture', subcategory: 'Museum' },
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
      source: 'gyms-farms-pettingzoos-2026',
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

  console.log(`\n🤸 GYMNASTICS, FARMS & PETTING ZOOS IMPORTER`);
  console.log(`📍 Coverage: DC, MD, VA, PA, DE`);
  console.log('='.repeat(60));
  if (isDryRun) console.log('🏃 DRY RUN MODE\n');

  const startTime = Date.now();
  const allActivities = [];

  const sections = [
    { label: '🤸 Gymnastics & Open Gyms', data: GYMNASTICS_CENTERS },
    { label: '🐐 Petting Zoos & Educational Farms', data: PETTING_ZOOS_FARMS },
    { label: '🌾 Farm Events & Festivals', data: FARM_EVENTS },
  ];

  for (const { label, data } of sections) {
    console.log(`${label}: ${data.length} venues`);
    for (const v of data) allActivities.push(createActivityDocument(v));
  }

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
