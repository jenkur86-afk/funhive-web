#!/usr/bin/env node

/**
 * SCIENCE & DISCOVERY CENTERS DMV ACTIVITIES SCRAPER
 *
 * Adds science museums, discovery centers, and STEM learning venues
 * to the activities collection. Focuses on hands-on educational
 * experiences for kids and families.
 *
 * Coverage:
 * - Science Museums
 * - Discovery Centers
 * - Planetariums
 * - STEM Education Centers
 * - Smithsonian Museums
 *
 * Usage:
 *   node scraper-activities-science-discovery-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledScienceDiscoveryDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'ScienceDiscovery-Eastern';

// ==========================================
// VENUE DATA - DMV Science & Discovery Centers
// ==========================================

const SCIENCE_DISCOVERY_CENTERS = [
  // MARYLAND SCIENCE CENTER & MUSEUMS
  {
    name: 'Maryland Science Center',
    address: '601 Light Street',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21230',
    latitude: 39.2818,
    longitude: -76.6118,
    phone: '(410) 685-2370',
    website: 'https://www.mdsci.org',
    hours: 'Tue-Sun 10am-5pm',
    county: 'Baltimore City',
    description: 'Interactive science museum with hands-on exhibits, planetarium, and IMAX theater. KidsRoom for ages 0-8 with sensory play.',
    cost: '$20-28/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'science-museum',
    features: ['interactive-exhibits', 'planetarium', 'imax', 'kids-room', 'sensory-play', 'stem'],
  },
  {
    name: 'National Children\'s Museum',
    address: '1300 Pennsylvania Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20004',
    latitude: 38.8948,
    longitude: -77.0288,
    phone: '(202) 844-2486',
    website: 'https://nationalchildrensmuseum.org',
    hours: 'Tue-Sun 9:30am-4:30pm',
    county: 'District of Columbia',
    description: 'STEM-focused children\'s museum with Dream Machine, exhibits on engineering, and play areas. Perfect for ages 0-12.',
    cost: '$16-20/person',
    ageRange: 'Ages 0-12',
    isFree: false,
    venueType: 'childrens-museum',
    features: ['interactive-exhibits', 'stem', 'play-areas', 'engineering', 'toddler-area'],
  },
  {
    name: 'Port Discovery Children\'s Museum',
    address: '35 Market Place',
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21202',
    latitude: 39.2898,
    longitude: -76.6058,
    phone: '(410) 727-8120',
    website: 'https://www.portdiscovery.org',
    hours: 'Tue-Sat 10am-5pm, Sun 12pm-5pm',
    county: 'Baltimore City',
    description: 'Award-winning children\'s museum with three floors of interactive exhibits. Adventure Expeditions climbing structure and Tot Trails for babies.',
    cost: '$18-22/person',
    ageRange: 'Ages 0-10',
    isFree: false,
    venueType: 'childrens-museum',
    features: ['interactive-exhibits', 'climbing', 'tot-area', 'stem', 'play-areas'],
  },

  // SMITHSONIAN MUSEUMS (Free)
  {
    name: 'National Air and Space Museum',
    address: '655 Jefferson Drive SW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20560',
    latitude: 38.8881,
    longitude: -77.0199,
    phone: '(202) 633-2214',
    website: 'https://airandspace.si.edu',
    hours: 'Daily 10am-5:30pm',
    county: 'District of Columbia',
    description: 'Iconic Smithsonian museum with historic aircraft, spacecraft, and flight simulators. Free admission with timed entry passes.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['aircraft', 'spacecraft', 'simulators', 'imax', 'free', 'smithsonian'],
  },
  {
    name: 'Steven F. Udvar-Hazy Center',
    address: '14390 Air and Space Museum Parkway',
    city: 'Chantilly',
    state: 'VA',
    zipCode: '20151',
    latitude: 38.9114,
    longitude: -77.4438,
    phone: '(703) 572-4118',
    website: 'https://airandspace.si.edu/udvar-hazy-center',
    hours: 'Daily 10am-5:30pm',
    county: 'Fairfax County',
    description: 'Smithsonian Air and Space annex with Space Shuttle Discovery, SR-71 Blackbird, and thousands of artifacts. Free admission.',
    cost: 'Free (parking $15)',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['aircraft', 'spacecraft', 'space-shuttle', 'observation-tower', 'free', 'smithsonian'],
  },
  {
    name: 'National Museum of Natural History',
    address: '10th Street & Constitution Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20560',
    latitude: 38.8913,
    longitude: -77.0261,
    phone: '(202) 633-1000',
    website: 'https://naturalhistory.si.edu',
    hours: 'Daily 10am-5:30pm',
    county: 'District of Columbia',
    description: 'Smithsonian museum with dinosaurs, Hope Diamond, and Q?rius science education center. Free admission with family programs.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['dinosaurs', 'gems', 'interactive-exhibits', 'butterfly-pavilion', 'free', 'smithsonian'],
  },
  {
    name: 'National Museum of American History',
    address: '1300 Constitution Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20560',
    latitude: 38.8912,
    longitude: -77.0299,
    phone: '(202) 633-1000',
    website: 'https://americanhistory.si.edu',
    hours: 'Daily 10am-5:30pm',
    county: 'District of Columbia',
    description: 'Smithsonian museum with Spark!Lab invention center for kids. Free hands-on activities and historic treasures.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'museum',
    features: ['spark-lab', 'interactive-exhibits', 'invention', 'free', 'smithsonian'],
  },

  // PLANETARIUMS
  {
    name: 'Howard B. Owens Science Center',
    address: '9601 Greenbelt Road',
    city: 'Lanham',
    state: 'MD',
    zipCode: '20706',
    latitude: 38.9848,
    longitude: -76.8578,
    phone: '(301) 918-8750',
    website: 'https://www.pgcps.org/owenssciencecenter',
    hours: 'By appointment and public shows',
    county: "Prince George's County",
    description: 'Planetarium and science center with dome shows and hands-on exhibits. Public shows on weekends. School programs during week.',
    cost: '$4-6/show',
    ageRange: 'Ages 4+',
    isFree: false,
    venueType: 'planetarium',
    features: ['planetarium', 'dome-shows', 'exhibits', 'school-programs', 'affordable'],
  },
  {
    name: 'Arlington Planetarium',
    address: '1426 N Quincy Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22207',
    latitude: 38.8918,
    longitude: -77.1078,
    phone: '(703) 228-6070',
    website: 'https://arlingtonva.us/planetarium',
    hours: 'Public shows on schedule',
    county: 'Arlington County',
    description: 'Newly renovated planetarium with full-dome shows about space and astronomy. Family shows and night sky programs.',
    cost: '$3-5/show',
    ageRange: 'Ages 4+',
    isFree: false,
    venueType: 'planetarium',
    features: ['planetarium', 'dome-shows', 'astronomy', 'affordable', 'public-school'],
  },

  // DISCOVERY CENTERS & STEM EDUCATION
  {
    name: 'VisArts at Rockville',
    address: '155 Gibbs Street',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20850',
    latitude: 39.0878,
    longitude: -77.1488,
    phone: '(301) 315-8200',
    website: 'https://www.visartscenter.org',
    hours: 'Mon-Sat 10am-6pm',
    county: 'Montgomery County',
    description: 'Arts center with STEAM programs combining art and science. Maker spaces, classes, and family workshops.',
    cost: 'Classes: $25-50',
    ageRange: 'Ages 3-18',
    isFree: false,
    venueType: 'stem-center',
    features: ['steam', 'maker-space', 'classes', 'workshops', 'art-science'],
  },
  {
    name: 'Imagination Stage',
    address: '4908 Auburn Avenue',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20814',
    latitude: 38.9858,
    longitude: -77.0958,
    phone: '(301) 961-6060',
    website: 'https://imaginationstage.org',
    hours: 'By show and class schedule',
    county: 'Montgomery County',
    description: 'Theater arts education with classes in acting, music, and stagecraft. Shows and summer camps for kids.',
    cost: 'Shows: $15-30, Classes vary',
    ageRange: 'Ages 1-18',
    isFree: false,
    venueType: 'arts-education',
    features: ['theater', 'classes', 'shows', 'camps', 'performing-arts'],
  },
  {
    name: 'Children\'s Science Center Lab',
    address: '11954 Fair Oaks Mall',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22033',
    latitude: 38.8628,
    longitude: -77.3588,
    phone: '(703) 648-3130',
    website: 'https://childsci.org',
    hours: 'Tue-Sun 10am-6pm',
    county: 'Fairfax County',
    description: 'Hands-on science lab for kids with rotating exhibits and STEM activities. Great for young scientists ages 2-12.',
    cost: '$8-12/person',
    ageRange: 'Ages 2-12',
    isFree: false,
    venueType: 'stem-center',
    features: ['interactive-exhibits', 'stem', 'hands-on', 'rotating-exhibits', 'mall-location'],
  },
  {
    name: 'Shenandoah Valley Discovery Museum',
    address: '19 West Cork Street',
    city: 'Winchester',
    state: 'VA',
    zipCode: '22601',
    latitude: 39.1858,
    longitude: -78.1658,
    phone: '(540) 722-2020',
    website: 'https://discoverymuseum.net',
    hours: 'Tue-Sat 9am-5pm, Sun 1pm-5pm',
    county: 'City of Winchester',
    description: 'Children\'s discovery museum with hands-on exhibits on science, art, and culture. Outdoor science garden.',
    cost: '$9-11/person',
    ageRange: 'Ages 1-10',
    isFree: false,
    venueType: 'childrens-museum',
    features: ['interactive-exhibits', 'science-garden', 'outdoor', 'hands-on', 'regional'],
  },

  // NASA & SPACE CENTERS
  {
    name: 'NASA Goddard Visitor Center',
    address: '8800 Greenbelt Road',
    city: 'Greenbelt',
    state: 'MD',
    zipCode: '20771',
    latitude: 38.9958,
    longitude: -76.8518,
    phone: '(301) 286-8981',
    website: 'https://www.nasa.gov/goddard/visitor-center',
    hours: 'Tue-Fri 10am-3pm, Sat-Sun 12pm-4pm',
    county: "Prince George's County",
    description: 'Free NASA visitor center with rockets, satellites, and space science exhibits. Science on a Sphere and model rockets.',
    cost: 'Free admission',
    ageRange: 'All Ages',
    isFree: true,
    venueType: 'science-museum',
    features: ['rockets', 'satellites', 'space-science', 'free', 'nasa', 'stem'],
  },

  // NATURE/SCIENCE HYBRIDS
  {
    name: 'Leesburg Animal Park',
    address: '19270 James Monroe Highway',
    city: 'Leesburg',
    state: 'VA',
    zipCode: '20175',
    latitude: 39.0418,
    longitude: -77.5418,
    phone: '(703) 433-0002',
    website: 'https://leesburganimalpark.com',
    hours: 'Daily 10am-5pm (seasonal)',
    county: 'Loudoun County',
    description: 'Animal park with exotic and farm animals. Pony rides, petting zoo, and animal education programs.',
    cost: '$12-16/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'animal-park',
    features: ['petting-zoo', 'pony-rides', 'exotic-animals', 'education', 'seasonal'],
  },
  {
    name: 'Roer\'s Zoofari',
    address: '1228 Hunter Mill Road',
    city: 'Vienna',
    state: 'VA',
    zipCode: '22182',
    latitude: 38.9018,
    longitude: -77.2858,
    phone: '(703) 757-6222',
    website: 'https://roerszoofari.com',
    hours: 'Mon-Sat 10am-5pm, Sun 11am-5pm',
    county: 'Fairfax County',
    description: 'Interactive animal experience with feeding encounters, educational programs, and birthday parties.',
    cost: '$15-20/person',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'animal-park',
    features: ['animal-encounters', 'feeding', 'education', 'birthday-parties'],
  },

  // ==========================================
  // EASTERN US EXPANSION — SCIENCE DISCOVERY
  // ==========================================

  // NEW YORK
  { name: 'American Museum of Natural History', address: 'Central Park West at 79th St', city: 'New York', state: 'NY', zipCode: '10024', latitude: 40.7813, longitude: -73.9740, phone: '(212) 769-5100', website: 'https://www.amnh.org', hours: 'Daily 10am-5:30pm', county: 'New York County', description: 'World-renowned natural history museum in Manhattan with dinosaur fossils, space show, live butterflies, and ocean hall. Iconic family destination.', cost: '$28 adults, $16 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['dinosaurs', 'space-show', 'butterflies', 'ocean-hall', 'imax', 'field-trips'] },
  { name: 'New York Hall of Science Queens', address: '47-01 111th St', city: 'Corona', state: 'NY', zipCode: '11368', latitude: 40.7467, longitude: -73.8464, phone: '(718) 699-0005', website: 'https://www.nysci.org', hours: 'Tue-Sun 10am-5pm', county: 'Queens County', description: 'Hands-on science museum in Queens with 450 interactive exhibits, outdoor Science Playground, and family science programs.', cost: '$17 adults, $14 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['interactive-exhibits', 'playground', 'maker-space', 'science-programs', 'outdoor-exhibits'] },

  // NEW JERSEY
  { name: 'Liberty Science Center Jersey City', address: '222 Jersey City Blvd', city: 'Jersey City', state: 'NJ', zipCode: '07305', latitude: 40.7028, longitude: -74.0611, phone: '(201) 200-1000', website: 'https://www.lsc.org', hours: 'Tue-Sun 9am-5:30pm', county: 'Hudson County', description: 'Liberty Science Center with hands-on exhibits, IMAX dome theater, animal lab, and Manhattan skyline views. Top NJ family destination.', cost: '$25 adults, $20 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['imax-dome', 'animal-lab', 'interactive-exhibits', 'outdoor-areas', 'field-trips'] },

  // PENNSYLVANIA
  { name: 'Franklin Institute Philadelphia', address: '222 N 20th St', city: 'Philadelphia', state: 'PA', zipCode: '19103', latitude: 39.9588, longitude: -75.1729, phone: '(215) 448-1200', website: 'https://www.fi.edu', hours: 'Daily 9:30am-5pm', county: 'Philadelphia County', description: 'Historic science museum in Philadelphia with giant heart walk-through, space command, electricity, train factory, and IMAX. World-class family science destination.', cost: '$25 adults, $20 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['imax', 'interactive-exhibits', 'giant-heart', 'space-exhibits', 'physics', 'field-trips'] },
  { name: 'Carnegie Science Center Pittsburgh', address: '1 Allegheny Ave', city: 'Pittsburgh', state: 'PA', zipCode: '15212', latitude: 40.4472, longitude: -80.0148, phone: '(412) 237-3400', website: 'https://www.carnegiesciencecenter.org', hours: 'Daily 10am-5pm', county: 'Allegheny County', description: 'Carnegie Science Center in Pittsburgh with submarine tour, UPMC SportsWorks, Buhl Planetarium, and roboworld. Premier science museum for families.', cost: '$20 adults, $15 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['planetarium', 'submarine', 'sports-science', 'robotics', 'aquarium', 'imax'] },

  // CONNECTICUT
  { name: 'Connecticut Science Center Hartford', address: '250 Columbus Blvd', city: 'Hartford', state: 'CT', zipCode: '06103', latitude: 41.7651, longitude: -72.6685, phone: '(860) 724-3623', website: 'https://www.ctsciencecenter.org', hours: 'Tue-Sun 10am-5pm', county: 'Hartford County', description: 'Connecticut Science Center with 165 exhibits across 4 floors, 3D theater, and hands-on science programming for all ages.', cost: '$22 adults, $18 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['3d-theater', 'interactive-exhibits', 'field-trips', 'outdoor-terrace', 'family-programs'] },

  // MASSACHUSETTS
  { name: 'Museum of Science Boston', address: '1 Science Park', city: 'Boston', state: 'MA', zipCode: '02114', latitude: 42.3676, longitude: -71.0703, phone: '(617) 723-2500', website: 'https://www.mos.org', hours: 'Daily 9am-5pm (summer 9am-7pm)', county: 'Suffolk County', description: 'Boston Museum of Science with live animal presentations, Hayden Planetarium, lightning show, dinosaurs, and IMAX theater. World-class family science museum.', cost: '$29 adults, $21 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['planetarium', 'lightning-show', 'live-animals', 'imax', 'dinosaurs', 'nanotechnology'] },

  // RHODE ISLAND
  { name: 'Providence Children s Museum', address: '100 South St', city: 'Providence', state: 'RI', zipCode: '02903', latitude: 41.8158, longitude: -71.4134, phone: '(401) 273-5437', website: 'https://www.childrenmuseum.org', hours: 'Tue-Sun 9am-6pm', county: 'Providence County', description: 'Hands-on children s museum in Providence RI with interactive science, art, and culture exhibits for children and families.', cost: '$14 per person', ageRange: 'Ages 1-11', isFree: false, venueType: 'childrens-museum', features: ['interactive-exhibits', 'water-play', 'art-studio', 'climbing-structure', 'birthday-parties'] },

  // NEW HAMPSHIRE
  { name: 'SEE Science Center Manchester', address: '200 Bedford St', city: 'Manchester', state: 'NH', zipCode: '03101', latitude: 42.9951, longitude: -71.4556, phone: '(603) 669-0400', website: 'https://www.see-sciencecenter.org', hours: 'Mon-Fri 10am-4pm, Sat-Sun 10am-5pm', county: 'Hillsborough County', description: 'Hands-on science center in Manchester NH with world s largest LEGO model display, science experiments, and youth programs.', cost: '$10 per person', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['lego-displays', 'interactive-exhibits', 'science-programs', 'hands-on', 'birthday-parties'] },

  // MAINE
  { name: 'Seashore Trolley Museum Kennebunkport', address: '195 Log Cabin Rd', city: 'Kennebunkport', state: 'ME', zipCode: '04046', latitude: 43.4115, longitude: -70.5282, phone: '(207) 967-2800', website: 'https://www.trolleymuseum.org', hours: 'May-Oct: Daily 10am-5pm', county: 'York County', description: 'Unique trolley museum in Maine with restored streetcars, rides, and hands-on transportation history. Fun family outing.', cost: '$12 adults, $8 children', ageRange: 'All Ages', isFree: false, venueType: 'transportation-museum', features: ['trolley-rides', 'historical-exhibits', 'hands-on', 'seasonal', 'family-programs'] },

  // VERMONT
  { name: 'ECHO Leahy Center Burlington', address: '1 College St', city: 'Burlington', state: 'VT', zipCode: '05401', latitude: 44.4773, longitude: -73.2212, phone: '(802) 864-1848', website: 'https://www.echovermont.org', hours: 'Daily 10am-5pm', county: 'Chittenden County', description: 'ECHO Science Center on Lake Champlain with interactive exhibits on ecology, biodiversity, and Great Lakes science. Family favorite in Vermont.', cost: '$15 adults, $12 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['lake-science', 'ecology', 'interactive-exhibits', 'birthday-parties', 'field-trips'] },

  // DELAWARE
  { name: 'Delaware Museum of Nature and Science', address: '4840 Kennett Pike', city: 'Wilmington', state: 'DE', zipCode: '19807', latitude: 39.8131, longitude: -75.5736, phone: '(302) 658-9111', website: 'https://www.delmnh.org', hours: 'Tue-Sun 9:30am-4:30pm', county: 'New Castle County', description: 'Delaware Museum of Nature and Science (new in 2025) with natural history exhibits, live animals, and educational programs for families.', cost: '$15 adults, $12 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['natural-history', 'live-animals', 'interactive-exhibits', 'field-trips', 'birthday-parties'] },

  // WEST VIRGINIA
  { name: 'Tamarack Science Center Beckley', address: '1 Tamarack Park Rd', city: 'Beckley', state: 'WV', zipCode: '25801', latitude: 37.7782, longitude: -81.1873, phone: '(304) 256-6843', website: 'https://www.tamarackwv.com', hours: 'Daily 9am-6pm', county: 'Raleigh County', description: 'Tamarack arts and science center in Beckley WV with hands-on science exhibits, nature programs, and family events.', cost: 'Free admission', ageRange: 'All Ages', isFree: true, venueType: 'science-museum', features: ['natural-science', 'interactive-exhibits', 'art', 'nature-programs', 'free'] },

  // NORTH CAROLINA
  { name: 'Marbles Kids Museum Raleigh', address: '201 E Hargett St', city: 'Raleigh', state: 'NC', zipCode: '27601', latitude: 35.7797, longitude: -78.6376, phone: '(919) 834-4040', website: 'https://www.marbleskidsmuseum.org', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Wake County', description: 'Marbles Kids Museum in downtown Raleigh with interactive play and learning exhibits, IMAX theater, and creative programs for children.', cost: '$12 per person', ageRange: 'Ages 1-10', isFree: false, venueType: 'childrens-museum', features: ['interactive-exhibits', 'imax', 'creative-play', 'science', 'birthday-parties'] },
  { name: 'Discovery Place Charlotte', address: '301 N Tryon St', city: 'Charlotte', state: 'NC', zipCode: '28202', latitude: 35.2282, longitude: -80.8441, phone: '(704) 372-6261', website: 'https://www.discoveryplace.org', hours: 'Tue-Sat 10am-5pm, Sun 12pm-5pm', county: 'Mecklenburg County', description: 'Discovery Place science museum in Charlotte NC with hands-on STEM exhibits, aquarium, rainforest, and IMAX dome.', cost: '$20 adults, $16 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['aquarium', 'rainforest', 'imax-dome', 'interactive-exhibits', 'field-trips'] },

  // SOUTH CAROLINA
  { name: 'EdVenture Children s Museum Columbia', address: '211 Gervais St', city: 'Columbia', state: 'SC', zipCode: '29201', latitude: 33.9997, longitude: -81.0351, phone: '(803) 779-3100', website: 'https://www.edventure.org', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Richland County', description: 'EdVenture children s museum in Columbia SC with interactive exhibits including Eddie the Giant, construction zone, and market place.', cost: '$14.95 adults, $12.95 children', ageRange: 'Ages 0-12', isFree: false, venueType: 'childrens-museum', features: ['interactive-exhibits', 'eddie-giant', 'construction', 'market-place', 'birthday-parties'] },

  // GEORGIA
  { name: 'Fernbank Museum of Natural History', address: '767 Clifton Rd NE', city: 'Atlanta', state: 'GA', zipCode: '30307', latitude: 33.7760, longitude: -84.3291, phone: '(404) 929-6300', website: 'https://www.fernbankmuseum.org', hours: 'Mon-Sat 10am-5pm, Sun 12pm-5pm', county: 'DeKalb County', description: 'Fernbank Museum in Atlanta with world s largest dinosaurs exhibit, IMAX, planetarium, and NatureQuest hands-on exhibits for families.', cost: '$20 adults, $19 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['dinosaurs', 'imax', 'planetarium', 'nature-quest', 'interactive-exhibits', 'birthday-parties'] },

  // FLORIDA
  { name: 'Orlando Science Center', address: '777 E Princeton St', city: 'Orlando', state: 'FL', zipCode: '32803', latitude: 28.5699, longitude: -81.3700, phone: '(407) 514-2000', website: 'https://www.osc.org', hours: 'Tue-Sun 10am-5pm', county: 'Orange County', description: 'Orlando Science Center with four floors of interactive exhibits, Dr. Phillips CineDome, KidsTown for ages 0-7, and SciencePlay outdoor area.', cost: '$20 adults, $15 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['cinedome', 'kids-town', 'interactive-exhibits', 'outdoor-science', 'birthday-parties'] },
  { name: 'MOSI Tampa', address: '4801 E Fowler Ave', city: 'Tampa', state: 'FL', zipCode: '33617', latitude: 28.0618, longitude: -82.4072, phone: '(813) 987-6000', website: 'https://www.mosi.org', hours: 'Tue-Sun 10am-5pm', county: 'Hillsborough County', description: 'Museum of Science and Industry in Tampa with 450 hands-on exhibits, IMAX, high-wire bicycle, hurricane simulator, and Kids in Charge area.', cost: '$25 adults, $18 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['imax', 'hurricane-sim', 'high-wire', 'kids-in-charge', 'interactive-exhibits'] },

  // ALABAMA
  { name: 'McWane Science Center Birmingham', address: '200 19th St N', city: 'Birmingham', state: 'AL', zipCode: '35203', latitude: 33.5172, longitude: -86.8048, phone: '(205) 714-8300', website: 'https://www.mcwane.org', hours: 'Mon-Sat 9am-5pm, Sun 12pm-5pm', county: 'Jefferson County', description: 'McWane Science Center in Birmingham with Alabama dinosaurs, aquarium, IMAX theater, and Itty Bitty Magic City for young children.', cost: '$18 adults, $14 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['imax', 'aquarium', 'dinosaurs', 'young-childrens-area', 'interactive-exhibits', 'birthday-parties'] },

  // MISSISSIPPI
  { name: 'Mississippi Children s Museum Jackson', address: '2145 Museum Blvd', city: 'Jackson', state: 'MS', zipCode: '39202', latitude: 32.3119, longitude: -90.1748, phone: '(601) 981-5469', website: 'https://www.mschildrensmuseum.org', hours: 'Tue-Sat 9am-5pm, Sun 12pm-5pm', county: 'Hinds County', description: 'Mississippi Children s Museum with interactive art, literacy, health, and science exhibits for children ages 0-12.', cost: '$12 per person', ageRange: 'Ages 0-12', isFree: false, venueType: 'childrens-museum', features: ['interactive-exhibits', 'literacy', 'art', 'health', 'birthday-parties'] },

  // TENNESSEE
  { name: 'Adventure Science Center Nashville', address: '800 Fort Negley Blvd', city: 'Nashville', state: 'TN', zipCode: '37203', latitude: 36.1443, longitude: -86.8020, phone: '(615) 862-5160', website: 'https://www.adventuresci.org', hours: 'Mon-Sat 10am-5pm, Sun 12pm-5pm', county: 'Davidson County', description: 'Adventure Science Center in Nashville with hands-on exhibits, Space Chase planetarium, and Exploration Tower with Nashville panorama.', cost: '$18 adults, $13 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['planetarium', 'space-exhibits', 'exploration-tower', 'interactive-exhibits', 'birthday-parties'] },

  // KENTUCKY
  { name: 'Louisville Science Center', address: '727 W Main St', city: 'Louisville', state: 'KY', zipCode: '40202', latitude: 38.2570, longitude: -85.7657, phone: '(502) 561-6100', website: 'https://www.louisvillescience.org', hours: 'Tue-Sat 10am-5pm, Sun 12pm-5pm', county: 'Jefferson County', description: 'Louisville Science Center in the NuLu arts district with IMAX, hands-on exhibits, and KidZone for young visitors.', cost: '$18 adults, $13 children', ageRange: 'All Ages', isFree: false, venueType: 'science-museum', features: ['imax', 'interactive-exhibits', 'kid-zone', 'birthday-parties', 'field-trips'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'science-museum': { category: 'Indoor', subcategory: 'Science Museum' },
    'childrens-museum': { category: 'Indoor', subcategory: 'Children\'s Museum' },
    'museum': { category: 'Indoor', subcategory: 'Museum' },
    'planetarium': { category: 'Indoor', subcategory: 'Planetarium' },
    'stem-center': { category: 'Indoor', subcategory: 'STEM Center' },
    'arts-education': { category: 'Indoor', subcategory: 'Arts Education' },
    'animal-park': { category: 'Outdoor', subcategory: 'Animal Park' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Discovery Center' };
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
      source: 'science-discovery-dmv',
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
      hasInteractiveExhibits: location.features.includes('interactive-exhibits') || location.features.includes('hands-on'),
      hasSTEM: location.features.includes('stem') || location.features.includes('steam'),
      hasPlanetarium: location.features.includes('planetarium'),
      isSmithsonian: location.features.includes('smithsonian'),
      hasToddlerArea: location.features.includes('toddler-area') || location.features.includes('tot-area') || location.features.includes('kids-room'),
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

async function scrapeScienceDiscoveryDMV() {
  console.log(`\n🔬 SCIENCE & DISCOVERY CENTERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🔬 Processing Science & Discovery Centers...');

  // Group by state
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of SCIENCE_DISCOVERY_CENTERS) {
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
  console.log(`✅ SCIENCE & DISCOVERY CENTERS DMV SCRAPER COMPLETE`);
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

async function scrapeScienceDiscoveryDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeScienceDiscoveryDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Science & Discovery Centers DMV Scraper');
  scrapeScienceDiscoveryDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeScienceDiscoveryDMV,
  scrapeScienceDiscoveryDMVCloudFunction,
};
