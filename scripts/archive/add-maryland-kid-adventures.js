#!/usr/bin/env node

/**
 * ADD MARYLAND KID ADVENTURES VENUES
 *
 * Adds Dinosaur Park (PG County) + 197 venues from "Maryland Kid Adventures"
 * Google Maps custom map as activities to the database.
 *
 * Source: https://www.google.com/maps/d/u/0/edit?mid=1v3XsBrnw_-JKx1wc0iPwu5cW1BoTK62n
 *
 * Usage:
 *   node add-maryland-kid-adventures.js          # Run full import
 *   node add-maryland-kid-adventures.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('../../scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('../../scrapers/venue-matcher');

const SCRAPER_NAME = 'MarylandKidAdventures';

// ==========================================
// DINOSAUR PARK — Full details from pgparks.com
// ==========================================
const DINOSAUR_PARK = {
  name: 'Dinosaur Park',
  address: '13100 Mid Atlantic Boulevard',
  city: 'Laurel',
  state: 'MD',
  zipCode: '20708',
  latitude: 39.0764,
  longitude: -76.8614,
  phone: '(301) 627-1286',
  website: 'https://www.pgparks.com/parks_trails/dinosaur-park',
  hours: 'Fossil Site: 1st & 3rd Saturday (12pm-4pm Jan-May, 10am-2pm Jun-Dec). Playground: Daily dawn-dusk.',
  county: 'Prince George\'s',
  description: 'Outdoor fossil site featuring 115-million-year-old Early Cretaceous period fossils. Home to Astrodon Johnstoni, the Maryland state dinosaur. Free Open House programs and paid Dig Day experiences on a 3.63-acre park with playground.',
  cost: 'Free (Open House) / $10-$13 (Dig Day)',
  ageRange: 'All Ages (Dig Day: 8+)',
  isFree: true,
  type: 'park',
  isIndoor: false,
};

// ==========================================
// VENUES FROM GOOGLE MAPS "Maryland Kid Adventures"
// Format: [name, latitude, longitude]
// ==========================================
const GOOGLE_MAP_VENUES = [
  ["Lake Waterford Park",39.1127595,-76.5590473],
  ["Downs Park",39.10947439999999,-76.4402897],
  ["Fort Smallwood Park",39.163801,-76.4808893],
  ["Severn-Danza Park",39.1379831,-76.6809744],
  ["Governor Bridge Natural Area",38.94686,-76.699162],
  ["Friendship Park",39.1611989,-76.6607634],
  ["Carlson's Donuts",39.137379,-76.68627],
  ["Wincopin Trails",39.1499866,-76.833823],
  ["Archaeology Dig Playground - Fairland Regional Park",39.0827808,-76.91995530000001],
  ["Dragon Park - South Bowie Community Center",38.914114,-76.719673],
  ["The Maryland Zoo in Baltimore",39.32270679999999,-76.6498096],
  ["Beverly Triton Nature Park",38.8830993,-76.4964294],
  ["Indian Creek Park",38.9923751,-76.9194704],
  ["United States National Arboretum",38.91213,-76.9657782],
  ["Patuxent Research Refuge",39.0264262,-76.7990493],
  ["Fairwood Community Park",38.9653185,-76.7901847],
  ["Bowie Railroad Museum",39.0071229,-76.77915279999999],
  ["Marlton Community Park",38.7762094,-76.7733943],
  ["Patuxent River Park - Jug Bay Natural Area",38.7736,-76.70555],
  ["Blandair Regional Park",39.2152479,-76.8536026],
  ["White Marsh Park Drive",39.11456,-76.630638],
  ["Bear Legacy Adventure Trails",39.4085903,-76.4530025],
  ["Rockfield Park",39.2118449,-76.8771019],
  ["Davidsonville Park",38.9327973,-76.6340697],
  ["Horsepen Park",39.0652133,-76.5372073],
  ["Clark's Elioak Farm",39.263306,-76.896854],
  ["Allen Pond Park",39.010627,-76.755474],
  ["Jonas and Anne Catharine Green Park",38.97698,-76.475204],
  ["North Beach Boardwalk/Beach",38.7068063,-76.5312247],
  ["Callis Park",38.73216669999999,-76.52416089999999],
  ["Wetlands overlook park",38.9718316,-76.5117012],
  ["Watkins Regional Park",38.8803,-76.80508],
  ["Wild Kid Acres, LLC",39.0186634,-76.6269039],
  ["Brown Mustache Coffee, LLC",39.1055505,-76.6377759],
  ["Greenstreet Gardens",38.7828946,-76.8768903],
  ["Good Luck Community Center",38.9848576,-76.8856282],
  ["Kinder Farm Park",39.078966,-76.5677949],
  ["Tire Park",39.0671736,-76.5362558],
  ["Wheaton Regional Park",39.0590785,-77.0530459],
  ["Cabin John Regional Park",39.0220804,-77.1381949],
  ["Quiet Waters Park",38.938613,-76.4916826],
  ["South River Farm Park",38.94008,-76.54018],
  ["Grump's Cafe",39.5001529,-76.2960791],
  ["Cascades Park",38.903063,-76.889427],
  ["Annmarie Sculpture Garden & Arts Center",38.44853100000001,-76.4862973],
  ["Bladensburg Waterfront Park",38.940889,-76.939259],
  ["Swann Farms - Produce & U-Pick Berries",38.7469519,-76.5662698],
  ["The B&O Railroad Museum",39.28541,-76.63265],
  ["Mallows Bay",38.4709959,-77.2614423],
  ["Flag Ponds Nature Park",38.39938,-76.42861],
  ["Hillwood Estate, Museum & Gardens",38.9310131,-77.0533997],
  ["Walden Park",39.14002,-76.6255],
  ["Sophie & Madigan's Playground",38.983752,-76.492076],
  ["Thomas Point Park",38.8893019,-76.4354866],
  ["Arundel Olympic Swim Center",39.1183652,-76.5993698],
  ["Sandy Point State Park",38.9848,-76.4026],
  ["Lake Shore Athletic Fields",39.1106972,-76.5085685],
  ["North Glen Playground",39.10379,-76.57478],
  ["Truxton Park",38.97102,-76.48876],
  ["The Yard's Park",38.8759575,-77.0012419],
  ["Kenilworth Park & Aquatic Gardens",38.9127319,-76.9435441],
  ["National Harbor",38.78475460000001,-77.0147082],
  ["Riva Road skate park",38.9647484,-76.5618736],
  ["Oxon Cove Park & Oxon Hill Farm",38.79415120000001,-77.0150222],
  ["Chesapeake Children's Museum",38.9717,-76.5123],
  ["Historic London Town & Gardens",38.932095,-76.5471685],
  ["US Naval Academy Stadium",38.9844963,-76.50436680000001],
  ["Lincoln Memorial and Washington Monument",38.8892686,-77.050176],
  ["Somerset Park",38.9685763,-76.73671829999999],
  ["Dunkirk District Park",38.724989,-76.66186809999999],
  ["TaKorean | The Yards",38.875188,-77.00032519999999],
  ["Ice Cream Jubilee",38.8736581,-77.0013985],
  ["Bowie Heritage Park",39.0073366,-76.7779015],
  ["Transportation Walk",38.87540149999999,-77.002887],
  ["Woodland Wonderland Playground",38.8754015,-76.86885079999999],
  ["Chesepiooc Real Ale Brewery",39.01571729999999,-76.6985763],
  ["Sailwinds Park",38.5722827,-76.0692268],
  ["Patterson Park",39.2898331,-76.5762756],
  ["BMORE LICKS",39.28586,-76.5815889],
  ["Café Dear Leon",39.2799175,-76.5743493],
  ["Matapeake Clubhouse and Beach",38.9563819,-76.3532481],
  ["Mowbray Park",38.96484699999999,-76.3338059],
  ["The Station at Riverdale Park",38.9697026,-76.9367419],
  ["University of Maryland",38.9869183,-76.9425543],
  ["High Ridge Park",39.11400220000001,-76.86271719999999],
  ["Turkey Thill Farm",38.53281930000001,-76.7091093],
  ["Battle Creek Cypress Swamp",38.50023,-76.63011],
  ["Cosca Regional Park",38.74206000000001,-76.89267],
  ["Gaylord National Resort & Convention Center",38.783,-77.01461],
  ["Homestead Gardens",38.988968,-76.651978],
  ["B&O Railroad Museum",39.28569490000001,-76.6327439],
  ["Lake Elkhorn",39.19204030000001,-76.8425946],
  ["South Germantown Splash Park and Miniature Golf",39.15953009999999,-77.2615951],
  ["Robert E. Lee Park/Lake Roland",39.3763009,-76.6472819],
  ["Lakeshore Swim Club",39.10919539999999,-76.5092571],
  ["Terrapin Adventures",39.1333576,-76.82649409999999],
  ["Bitty & Beau's Coffee",38.98197839999999,-76.4911764],
  ["National Children's Museum",38.8942,-77.0281],
  ["The Enchanted Forest",39.262997,-76.901126],
  ["Sandlot",38.7793082,-77.01725029999999],
  ["Goldpetal Farms Maryland",39.1655284,-76.6923009],
  ["Rock the Hill Concerts at Fair Hill",39.0137929,-76.7461424],
  ["Turner Park",39.3316969,-76.7434949],
  ["Centreville Wharf Park",39.04281,-76.06817],
  ["Millstream Park",38.98693999999999,-76.661],
  ["Ten Eyck Brewing Company",39.0144,-76.696],
  ["Peachwood Neighborhood Park",38.8830024,-76.7968702],
  ["Blandair Regional Park North Playground",39.22045,-76.85003],
  ["Annapolis Town Center",38.9706103,-76.51103859999999],
  ["Vanderwende Farm Creamery",38.7361483,-75.5883803],
  ["Silver Lake Tot Lot",38.9771946,-76.49126779999999],
  ["Frank & Louie's Italian Specialties",38.9840785,-76.4933783],
  ["Rehoboth Elementary School Playground",38.7163,-75.083],
  ["Rehoboth Beach, Delaware",38.7109267,-75.0756926],
  ["Crumbl Cookies - Waugh Chapel",39.0088458,-76.72762909999999],
  ["Blandair Park East Playground",39.21335,-76.84698],
  ["Swann Park",39.2724,-76.60456],
  ["Port Discovery Children's Museum",39.2890,-76.6069],
  ["Piney Orchard Community Center Play Ground",39.1018,-76.7127],
  ["Broom's Bloom Dairy",39.54174,-76.4087101],
  ["Solomons Town Center Park",38.31976,-76.45483],
  ["Riva Area Park",38.95217,-76.56617],
  ["Always Ice Cream Company",38.9764236,-76.4885755],
  ["West Annapolis Elementary School Playground",38.9717,-76.5075],
  ["Garcelon Athletic Complex",38.9876,-76.4923],
  ["Cherry Crest Adventure Farm",40.0543,-76.08325],
  ["Strasburg Rail Road",39.97393,-76.17449],
  ["Verdant View Farm",40.00715,-76.18389],
  ["W.O. Riley Park",38.7702,-76.56255],
  ["Hallowing Point Park",38.6302,-76.6018],
  ["Ellen Moyer Nature Trail",38.9787,-76.49547],
  ["Primrose Park",39.1008,-76.66025],
  ["Robinson Nature Center",39.190158,-76.89488999999999],
  ["Centennial Park",39.2407142,-76.8594124],
  ["Pip Moyer Recreation Center Playground",38.9632709,-76.50514969999999],
  ["Savage Park",39.1403235,-76.82943809999999],
  ["Historic Savage Mill",39.13573540000001,-76.82686559999999],
  ["The Wiggle Room",38.990838,-76.7015529],
  ["Rash Field",39.2812881,-76.6094012],
  ["Pongos Learning Lab",38.9882195,-76.6980249],
  ["Hyper Kidz Baltimore",39.4408709,-76.7766619],
  ["Bell Branch Park",38.9886127,-76.6775114],
  ["National Harbor",38.7818036,-77.014663],
  ["United States Botanic Garden",38.8881451,-77.0128833],
  ["Maryland Hall",38.97390879999999,-76.50562289999999],
  ["Queenstown Community Park",38.9916118,-76.15299639999999],
  ["Linthicum Walks",38.99907639999999,-76.6703572],
  ["David Kerr Nature Trail",38.95734189999999,-76.7255741],
  ["The Fields at RFK Campus",38.89291360000001,-76.9713975],
  ["Kingman And Heritage Islands Park",38.8954241,-76.9680091],
  ["Play n Learn - Columbia Maryland",39.22973630000001,-76.8595889],
  ["Opie's Soft Serve & Snowballs",39.1072063,-76.6310289],
  ["Crumbl Cookies",39.10747130000001,-76.6324131],
  ["Childs Play Adventure Playground",39.1556,-76.63455],
  ["Quiet Waters Dog Beach",38.93529,-76.48828],
  ["Fish Tales Bar and Grill",38.3515314,-75.0784304],
  ["Chuck E. Cheese",38.9802547,-76.54604739999999],
  ["Latrobe Park",39.2669523,-76.5933429],
  ["Ice Queens Snowball Shop",39.1056133,-76.6367752],
  ["Cross Street Market",39.2782476,-76.6112003],
  ["Jungle Jim's",39.1558048,-76.6344805],
  ["Adventure Park USA",39.4070458,-77.3698614],
  ["Rommel's Ace Hardware",39.1037,-76.6309],
  ["Heritage Farm Park",39.08893,-76.58507],
];

// ==========================================
// Determine state from coordinates (simple bounding box check)
// ==========================================
function getStateFromCoords(lat, lng) {
  // Delaware
  if (lat > 38.45 && lat < 39.85 && lng > -75.8 && lng < -75.0) return 'DE';
  // DC
  if (lat > 38.8 && lat < 38.96 && lng > -77.12 && lng < -76.91) return 'DC';
  // Pennsylvania (Cherry Crest, Strasburg, Verdant View)
  if (lat > 39.7 && lng > -76.3 && lng < -75.5) return 'PA';
  // Virginia
  if (lat < 38.85 && lng < -77.0) return 'VA';
  // Default: Maryland
  return 'MD';
}

// ==========================================
// Classify venue type from name
// ==========================================
function classifyVenue(name) {
  const lower = name.toLowerCase();

  // Restaurants, cafes, food
  if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('café') ||
      lower.includes('donut') || lower.includes('ice cream') || lower.includes('licks') ||
      lower.includes('cookies') || lower.includes('snowball') || lower.includes('bar and grill') ||
      lower.includes('italian specialties') || lower.includes('soft serve')) {
    return { type: 'food', category: 'Food & Drink', subcategory: 'Family-Friendly Restaurant', isIndoor: true };
  }

  // Farms
  if (lower.includes('farm') && !lower.includes('kinder farm')) {
    return { type: 'farm', category: 'Outdoor', subcategory: 'Farm', isIndoor: false };
  }

  // Museums
  if (lower.includes('museum') || lower.includes('railroad museum')) {
    return { type: 'museum', category: 'Learning & Culture', subcategory: 'Museum', isIndoor: true };
  }

  // Zoo
  if (lower.includes('zoo')) {
    return { type: 'zoo', category: 'Outdoor', subcategory: 'Zoo', isIndoor: false };
  }

  // Nature centers, trails, nature parks
  if (lower.includes('nature') || lower.includes('trail') || lower.includes('swamp') ||
      lower.includes('refuge') || lower.includes('arboretum') || lower.includes('garden') ||
      lower.includes('botanic') || lower.includes('sculpture garden')) {
    return { type: 'nature', category: 'Outdoor', subcategory: 'Nature Center', isIndoor: false };
  }

  // Playgrounds
  if (lower.includes('playground') || lower.includes('tot lot') || lower.includes('play ground')) {
    return { type: 'playground', category: 'Outdoor', subcategory: 'Playground', isIndoor: false };
  }

  // Indoor play
  if (lower.includes('wiggle room') || lower.includes('play n learn') || lower.includes('hyper kidz') ||
      lower.includes('jungle jim') || lower.includes('chuck e') || lower.includes('pongos') ||
      lower.includes('adventure park')) {
    return { type: 'indoor-play', category: 'Indoor Play', subcategory: 'Indoor Play Center', isIndoor: true };
  }

  // Swim / splash
  if (lower.includes('swim') || lower.includes('splash') || lower.includes('beach') ||
      lower.includes('boardwalk') || lower.includes('waterfront')) {
    return { type: 'water', category: 'Outdoor', subcategory: 'Beach & Water Play', isIndoor: false };
  }

  // Adventure / outdoor activity
  if (lower.includes('adventure') || lower.includes('terrapin')) {
    return { type: 'adventure', category: 'Outdoor', subcategory: 'Adventure', isIndoor: false };
  }

  // Brewery / adult-ish
  if (lower.includes('brewing') || lower.includes('brewery')) {
    return { type: 'food', category: 'Food & Drink', subcategory: 'Family-Friendly Restaurant', isIndoor: true };
  }

  // Hardware store (Rommel's)
  if (lower.includes('hardware')) {
    return { type: 'shop', category: 'Shopping', subcategory: 'Family-Friendly Shop', isIndoor: true };
  }

  // Skate park
  if (lower.includes('skate')) {
    return { type: 'skatepark', category: 'Outdoor', subcategory: 'Skate Park', isIndoor: false };
  }

  // Market
  if (lower.includes('market') && !lower.includes('library')) {
    return { type: 'market', category: 'Food & Drink', subcategory: 'Market', isIndoor: true };
  }

  // Resort / entertainment
  if (lower.includes('resort') || lower.includes('enchanted') || lower.includes('sandlot')) {
    return { type: 'entertainment', category: 'Entertainment', subcategory: 'Family Entertainment', isIndoor: true };
  }

  // Stadium
  if (lower.includes('stadium') || lower.includes('athletic')) {
    return { type: 'sports', category: 'Outdoor', subcategory: 'Sports Facility', isIndoor: false };
  }

  // University / historic
  if (lower.includes('university') || lower.includes('historic') || lower.includes('memorial') ||
      lower.includes('monument') || lower.includes('heritage')) {
    return { type: 'historic', category: 'Learning & Culture', subcategory: 'Historic Site', isIndoor: false };
  }

  // Default: Park
  return { type: 'park', category: 'Outdoor', subcategory: 'Park', isIndoor: false };
}

// ==========================================
// Create activity document from venue data
// ==========================================
function createActivityDocument(venue) {
  const geohash = ngeohash.encode(venue.latitude, venue.longitude, 7);
  const classification = classifyVenue(venue.name);

  return {
    name: venue.name,
    type: classification.subcategory,
    category: classification.category,
    subcategory: classification.subcategory,
    description: venue.description || `Family-friendly ${classification.subcategory.toLowerCase()} in Maryland.`,
    geohash: geohash,
    state: venue.state,
    phone: venue.phone || '',
    website: venue.website || '',
    hours: venue.hours || '',
    isFree: venue.isFree !== undefined ? venue.isFree : true,
    ageRange: venue.ageRange || 'All Ages',
    cost: venue.cost || 'Free',
    location: {
      coordinates: {
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
      address: venue.address || '',
      city: venue.city || '',
      zipCode: venue.zipCode || '',
    },
    metadata: {
      source: 'maryland-kid-adventures',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: venue.county || '',
      venueType: classification.type,
      googleMapsSource: 'https://www.google.com/maps/d/u/0/edit?mid=1v3XsBrnw_-JKx1wc0iPwu5cW1BoTK62n',
    },
    filters: {
      isFree: venue.isFree !== undefined ? venue.isFree : true,
      isIndoor: classification.isIndoor,
      hasParking: true,
    },
  };
}

// ==========================================
// Save activities using venue-matcher dedup
// ==========================================
async function saveActivities(activities) {
  if (activities.length === 0) return { saved: 0, updated: 0, failed: 0 };

  let saved = 0, updated = 0, failed = 0;

  for (const activity of activities) {
    try {
      const result = await getOrCreateActivity(activity, { source: SCRAPER_NAME });

      if (result.isNew) {
        saved++;
        console.log(`  ✅ NEW: ${activity.name}`);
      } else if (result.updated) {
        updated++;
        console.log(`  🔄 Updated: ${activity.name}`);
      } else {
        console.log(`  ⏭️  Exists: ${activity.name}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  ❌ Failed: ${activity.name}: ${error.message}`);
      failed++;
    }
  }

  return { saved, updated, failed };
}

// ==========================================
// Main function
// ==========================================
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`\n🦕 MARYLAND KID ADVENTURES — VENUE IMPORTER`);
  console.log(`📍 Sources: Dinosaur Park (PG County) + Google Maps custom map (197 venues)`);
  console.log('='.repeat(60));

  if (isDryRun) {
    console.log('🏃 DRY RUN MODE — no data will be saved\n');
  }

  const startTime = Date.now();
  const allActivities = [];

  // 1. Add Dinosaur Park with full details
  console.log('\n🦕 Adding Dinosaur Park...');
  const dinoActivity = createActivityDocument(DINOSAUR_PARK);
  allActivities.push(dinoActivity);
  console.log(`  ✓ ${DINOSAUR_PARK.name} (${DINOSAUR_PARK.city}, ${DINOSAUR_PARK.state})`);

  // 2. Process Google Maps venues
  console.log(`\n🗺️  Processing ${GOOGLE_MAP_VENUES.length} Google Maps venues...`);

  const stateCounts = {};
  const typeCounts = {};

  for (const [name, lat, lng] of GOOGLE_MAP_VENUES) {
    const state = getStateFromCoords(lat, lng);
    const venue = {
      name: name.trim(),
      latitude: lat,
      longitude: lng,
      state,
    };

    const activity = createActivityDocument(venue);
    allActivities.push(activity);

    stateCounts[state] = (stateCounts[state] || 0) + 1;
    const cls = classifyVenue(name);
    typeCounts[cls.subcategory] = (typeCounts[cls.subcategory] || 0) + 1;
  }

  console.log(`\n📊 Venue breakdown by state:`);
  for (const [state, count] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${state}: ${count}`);
  }

  console.log(`\n📊 Venue breakdown by type:`);
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }

  console.log(`\n📊 Total activities to save: ${allActivities.length}`);

  if (isDryRun) {
    console.log('\n🏃 DRY RUN — skipping save. Run without --dry-run to import.');
    console.log(`\nSample activities:`);
    for (const a of allActivities.slice(0, 5)) {
      console.log(`  - ${a.name} [${a.category} > ${a.subcategory}] (${a.state})`);
    }
    return;
  }

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ MARYLAND KID ADVENTURES IMPORT COMPLETE`);
  console.log(`   Total venues: ${allActivities.length}`);
  console.log(`   New saved: ${saved}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs
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
}

// Run
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
