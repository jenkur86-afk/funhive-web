#!/usr/bin/env node

/**
 * ICE RINKS DMV ACTIVITIES SCRAPER
 *
 * Adds ice skating rinks to the activities collection.
 * These venues offer public skate sessions, lessons, and hockey.
 *
 * Coverage:
 * - Cabin John Ice Rink (Rockville)
 * - Wheaton Ice Arena (Wheaton)
 * - Gardens Ice House (Laurel)
 * - Herbert Wells Ice Rink (College Park)
 * - Mt. Vernon Recreation Center Ice Rink (Alexandria)
 * - Pentagon Row Ice Skating (Arlington - seasonal)
 * - Kettler Capitals Iceplex (Arlington)
 * - Reston Town Center Ice Pavilion (Reston - seasonal)
 *
 * Usage:
 *   node scraper-activities-ice-rinks-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledIceRinksDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'IceRinks-Eastern';

// ==========================================
// VENUE DATA - DMV Ice Rinks
// ==========================================

const ICE_RINKS = [
  // MARYLAND
  {
    name: 'Cabin John Ice Rink',
    address: '10610 Westlake Drive',
    city: 'Rockville',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0378,
    longitude: -77.1419,
    phone: '(301) 765-8620',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/icerinks/cabinjohn.html',
    hours: 'Daily - varies by session (check schedule)',
    county: 'Montgomery County',
    description: 'Montgomery County public ice rink with NHL-sized rink. Offers public skating, lessons, hockey leagues, and birthday parties. Skate rentals available.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'birthday-parties'],
  },
  {
    name: 'Wheaton Ice Arena',
    address: '11717 Orebaugh Avenue',
    city: 'Wheaton',
    state: 'MD',
    zipCode: '20902',
    latitude: 39.0398,
    longitude: -77.0497,
    phone: '(301) 649-3640',
    website: 'https://www.montgomerycountymd.gov/rec/facilities/icerinks/wheaton.html',
    hours: 'Daily - varies by session (check schedule)',
    county: 'Montgomery County',
    description: 'Year-round ice arena with public skating sessions, figure skating, and hockey programs. Family-friendly with affordable skate rentals.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating'],
  },
  {
    name: 'The Gardens Ice House',
    address: '13800 Old Gunpowder Road',
    city: 'Laurel',
    state: 'MD',
    zipCode: '20707',
    latitude: 39.1178,
    longitude: -76.8367,
    phone: '(301) 953-0100',
    website: 'https://www.thegardens.com',
    hours: 'Daily - varies by session',
    county: 'Prince George\'s County',
    description: 'Large ice complex with two NHL-sized rinks. Offers public skating, learn to skate programs, hockey, and figure skating. Home to Washington Capitals practice facility.',
    cost: '$9-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating', 'pro-shop'],
  },
  {
    name: 'Herbert Wells Ice Rink',
    address: '5211 Campus Drive',
    city: 'College Park',
    state: 'MD',
    zipCode: '20740',
    latitude: 38.9897,
    longitude: -76.9418,
    phone: '(301) 277-3719',
    website: 'https://www.pgparks.com/facilities/facility/details/Herbert-Wells-Ice-Rink-128',
    hours: 'Daily - varies by session',
    county: 'Prince George\'s County',
    description: 'Prince George\'s County ice rink near University of Maryland. Public skating, lessons, and hockey programs available.',
    cost: '$7-9/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals'],
  },
  {
    name: 'Piney Orchard Ice Arena',
    address: '2425 Evergreen Road',
    city: 'Odenton',
    state: 'MD',
    zipCode: '21113',
    latitude: 39.0789,
    longitude: -76.7018,
    phone: '(410) 674-1014',
    website: 'https://pineyorchardicearena.com',
    hours: 'Daily - varies by session',
    county: 'Anne Arundel County',
    description: 'Community ice arena with public skating, learn to skate, and hockey programs. Features NHL-sized rink with great viewing areas.',
    cost: '$8-10/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'birthday-parties'],
  },

  // VIRGINIA
  {
    name: 'Mt. Vernon Recreation Center Ice Arena',
    address: '2017 Belle View Boulevard',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22307',
    latitude: 38.7698,
    longitude: -77.0578,
    phone: '(703) 768-3224',
    website: 'https://www.fairfaxcounty.gov/parks/rec/mtvernon/ice-arena',
    hours: 'Daily - varies by session',
    county: 'Fairfax County',
    description: 'Fairfax County ice arena offering public skating, lessons, and hockey. Affordable family skating with skate rentals available.',
    cost: '$7-9/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals'],
  },
  {
    name: 'Kettler Capitals Iceplex',
    address: '627 N Glebe Road',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22203',
    latitude: 38.8818,
    longitude: -77.1058,
    phone: '(571) 224-0555',
    website: 'https://www.kettlercapitalsiceplex.com',
    hours: 'Daily - varies by session',
    county: 'Arlington County',
    description: 'Official practice facility of the Washington Capitals. Features two NHL-sized rinks, public skating, lessons, and hockey programs.',
    cost: '$10-14/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'pro-shop', 'capitals-practice'],
  },
  {
    name: 'Ashburn Ice House',
    address: '21595 Smith Switch Road',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0478,
    longitude: -77.4578,
    phone: '(703) 858-0300',
    website: 'https://www.ashburnicehouse.com',
    hours: 'Daily - varies by session',
    county: 'Loudoun County',
    description: 'Loudoun County ice facility with two rinks. Offers public skating, learn to skate, hockey, and figure skating programs.',
    cost: '$9-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating'],
  },
  {
    name: 'SkateQuest Reston',
    address: '1800 Michael Faraday Court',
    city: 'Reston',
    state: 'VA',
    zipCode: '20190',
    latitude: 38.9518,
    longitude: -77.3418,
    phone: '(703) 709-1010',
    website: 'https://www.skatequestreston.com',
    hours: 'Daily - varies by session',
    county: 'Fairfax County',
    description: 'Year-round ice skating facility in Reston. Features public skating, learn to skate, hockey, and figure skating. Great for beginners.',
    cost: '$8-11/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'figure-skating'],
  },
  {
    name: 'Prince William Ice Center',
    address: '5180 Dale Boulevard',
    city: 'Woodbridge',
    state: 'VA',
    zipCode: '22193',
    latitude: 38.6378,
    longitude: -77.2878,
    phone: '(703) 730-8423',
    website: 'https://www.pwcgov.org/government/dept/park/facilities/Pages/Prince-William-Ice-Center.aspx',
    hours: 'Daily - varies by session',
    county: 'Prince William County',
    description: 'Prince William County ice arena with NHL-sized rink. Public skating, lessons, hockey, and birthday parties available.',
    cost: '$7-9/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: false,
    features: ['public-skating', 'lessons', 'hockey', 'rentals', 'birthday-parties'],
  },

  // DC & SEASONAL RINKS
  {
    name: 'Washington Harbour Ice Rink',
    address: '3000 K Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20007',
    latitude: 38.9018,
    longitude: -77.0628,
    phone: '(202) 706-7666',
    website: 'https://www.thewashingtonharbour.com/ice-rink',
    hours: 'Daily Nov-Mar (seasonal)',
    county: 'District of Columbia',
    description: 'Scenic outdoor ice rink on the Georgetown waterfront. Open November through March with stunning views of the Potomac River.',
    cost: '$10-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: true,
    features: ['public-skating', 'rentals', 'outdoor', 'waterfront-views'],
  },
  {
    name: 'National Gallery of Art Ice Rink',
    address: '4th Street & Constitution Avenue NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20565',
    latitude: 38.8918,
    longitude: -77.0178,
    phone: '(202) 216-9397',
    website: 'https://www.nga.gov/visit/sculpture-garden-ice-rink.html',
    hours: 'Daily Nov-Mar (seasonal)',
    county: 'District of Columbia',
    description: 'Iconic outdoor ice rink in the National Gallery Sculpture Garden on the National Mall. Open November through mid-March.',
    cost: '$10-12/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: true,
    features: ['public-skating', 'rentals', 'outdoor', 'national-mall'],
  },
  {
    name: 'Pentagon Row Ice Skating',
    address: '1201 S Joyce Street',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22202',
    latitude: 38.8618,
    longitude: -77.0632,
    phone: '(703) 418-6666',
    website: 'https://www.pentagonrowskating.com',
    hours: 'Daily Nov-Mar (seasonal)',
    county: 'Arlington County',
    description: 'Outdoor skating rink at Pentagon Row shopping center. Open November through March with nearby dining and shopping.',
    cost: '$9-11/session',
    ageRange: 'All Ages',
    isFree: false,
    seasonal: true,
    features: ['public-skating', 'rentals', 'outdoor', 'shopping-nearby'],
  },

  // ==========================================
  // EASTERN US EXPANSION — ICE RINKS
  // ==========================================

  // NEW YORK
  { name: 'The Rink at Rockefeller Center', address: '600 5th Ave', city: 'New York', state: 'NY', zipCode: '10020', latitude: 40.7587, longitude: -73.9787, phone: '(212) 332-7654', website: 'https://www.therinkatrockcenter.com', hours: 'Oct-Apr daily 9am-10pm', county: 'New York County', description: 'Iconic outdoor ice skating rink at Rockefeller Center in Manhattan. Family sessions and public skating available Oct-April.', cost: '$13-33/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'lessons', 'seasonal', 'outdoor', 'iconic'] },
  { name: 'Sky Rink at Chelsea Piers', address: '23rd St at Hudson River Pier 61', city: 'New York', state: 'NY', zipCode: '10011', latitude: 40.7484, longitude: -74.0053, phone: '(212) 336-6100', website: 'https://www.chelseapiers.com/sky-rink', hours: 'Daily 8am-11pm year-round', county: 'New York County', description: 'Year-round indoor ice skating at Chelsea Piers with public sessions, lessons, and hockey programs.', cost: '$15-20/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'lessons', 'year-round', 'indoor'] },
  { name: 'NYCB LIVE Ice Rink', address: '1255 Hempstead Tpke', city: 'Uniondale', state: 'NY', zipCode: '11553', latitude: 40.7224, longitude: -73.5927, phone: '(516) 794-9300', website: 'https://www.nassaucoliseum.com', hours: 'Oct-Mar: Mon-Fri 10am-5pm, Sat-Sun 12pm-5pm', county: 'Nassau County', description: 'Public ice skating at Nassau Coliseum on Long Island with family sessions and holiday skating.', cost: '$10-15/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'hockey', 'lessons', 'seasonal'] },

  // NEW JERSEY
  { name: 'Mennen Sports Arena', address: '161 E Hanover Ave', city: 'Morris Township', state: 'NJ', zipCode: '07960', latitude: 40.8002, longitude: -74.4844, phone: '(973) 326-7651', website: 'https://www.morriscountynj.gov/mennen', hours: 'Oct-Mar: Daily public sessions', county: 'Morris County', description: 'Morris County public ice skating arena with public sessions, figure skating lessons, and youth hockey programs.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'figure-skating', 'hockey', 'lessons'] },
  { name: 'Codey Arena', address: '560 Northfield Ave', city: 'West Orange', state: 'NJ', zipCode: '07052', latitude: 40.7924, longitude: -74.2752, phone: '(973) 731-3828', website: 'https://www.essexcountynj.org/codey-arena', hours: 'Sep-Apr: Tue-Sun with public sessions', county: 'Essex County', description: 'Essex County public ice skating facility with family skating, lessons, and youth hockey leagues.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'hockey', 'lessons', 'county-park'] },

  // PENNSYLVANIA
  { name: 'University of Delaware Ice Arenas', address: '831 S College Ave', city: 'Newark', state: 'PA', zipCode: '19716', latitude: 39.6779, longitude: -75.7524, phone: '(302) 831-2978', website: 'https://www.udel.edu/icearenas', hours: 'Sep-Apr: Tue-Sun public sessions', county: 'New Castle County', description: 'Two ice rinks with public skating, lessons, and youth hockey. Open Sept-April with family sessions.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'figure-skating', 'hockey', 'two-rinks'] },
  { name: 'Igloo Ice Rink Pittsburgh', address: '300 Auditorium Pl', city: 'Pittsburgh', state: 'PA', zipCode: '15212', latitude: 40.4490, longitude: -80.0167, phone: '(412) 323-5500', website: 'https://www.ppgpaints.com/arena', hours: 'Oct-Apr public sessions', county: 'Allegheny County', description: 'Public skating at PPG Paints Arena in Pittsburgh during hockey season, plus nearby outdoor rinks.', cost: '$10-15/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'professional-venue', 'seasonal'] },

  // CONNECTICUT
  { name: 'Ingalls Rink Yale', address: '73 Sachem St', city: 'New Haven', state: 'CT', zipCode: '06520', latitude: 41.3161, longitude: -72.9221, phone: '(203) 432-0895', website: 'https://www.yalebulldogs.com/facilities/ingalls-rink', hours: 'Oct-Mar: Tue-Sun public sessions', county: 'New Haven County', description: 'Historic Yale University skating rink (the "Whale") with public skating sessions and learn-to-skate programs.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'lessons', 'historic', 'university'] },

  // MASSACHUSETTS
  { name: 'Frog Pond Boston', address: '38 Beacon St', city: 'Boston', state: 'MA', zipCode: '02108', latitude: 42.3576, longitude: -71.0682, phone: '(617) 635-2120', website: 'https://www.bostonfrogpond.com', hours: 'Nov-Mar: Daily 10am-9pm', county: 'Suffolk County', description: 'Iconic outdoor ice skating rink in Boston Common, one of New England oldest skating spots. Free admission for children under 14.', cost: 'Adults $6, Kids free', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'outdoor', 'seasonal', 'historic', 'affordable'] },
  { name: 'New England Sports Center', address: '212 Rte 85', city: 'Marlborough', state: 'MA', zipCode: '01752', latitude: 42.3293, longitude: -71.5553, phone: '(508) 481-3111', website: 'https://www.nesc.com', hours: 'Year-round public sessions', county: 'Middlesex County', description: 'Multi-rink ice sports facility near Boston with public skating, figure skating, and youth hockey programs.', cost: '$8-14/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'figure-skating', 'hockey', 'year-round', 'multiple-rinks'] },

  // RHODE ISLAND
  { name: 'Thayer Arena Providence', address: '1 Lasalle Sq', city: 'Providence', state: 'RI', zipCode: '02903', latitude: 41.8236, longitude: -71.4128, phone: '(401) 331-0700', website: 'https://www.thayerarena.com', hours: 'Sep-Apr public sessions weekends', county: 'Providence County', description: 'Public ice skating in downtown Providence with open skating sessions, lessons, and youth hockey.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'hockey', 'lessons', 'downtown'] },

  // NEW HAMPSHIRE
  { name: 'Everett Arena Concord', address: '15 Loudon Rd', city: 'Concord', state: 'NH', zipCode: '03301', latitude: 43.2098, longitude: -71.5374, phone: '(603) 226-3419', website: 'https://www.concordnh.gov/everett-arena', hours: 'Sep-Apr: Multiple public sessions weekly', county: 'Merrimack County', description: 'City of Concord ice arena with public skating, learn-to-skate programs, and youth hockey leagues.', cost: '$6-10/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'lessons', 'hockey', 'affordable'] },

  // MAINE
  { name: 'Alfond Youth Center Waterville', address: '126 North St', city: 'Waterville', state: 'ME', zipCode: '04901', latitude: 44.5526, longitude: -69.6317, phone: '(207) 873-0684', website: 'https://www.alfondyouthcenter.org', hours: 'Sep-Apr: Tue-Sun public sessions', county: 'Kennebec County', description: 'Alfond Youth Center ice arena with public skating, youth programs, and figure skating lessons.', cost: '$5-9/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'lessons', 'youth-programs', 'hockey'] },

  // VERMONT
  { name: 'Cairns Arena Burlington', address: '36 Roosevelt Hwy', city: 'South Burlington', state: 'VT', zipCode: '05403', latitude: 44.4587, longitude: -73.1887, phone: '(802) 864-0023', website: 'https://www.cairnsarena.com', hours: 'Sep-Apr: Tue-Sun public sessions', county: 'Chittenden County', description: 'South Burlington ice arena with public skating, youth hockey, and figure skating programs.', cost: '$6-10/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'hockey', 'figure-skating', 'lessons'] },

  // DELAWARE
  { name: 'University of Delaware Ice Arena Newark', address: '831 S College Ave', city: 'Newark', state: 'DE', zipCode: '19716', latitude: 39.6779, longitude: -75.7524, phone: '(302) 831-2978', website: 'https://www.udel.edu/icearenas', hours: 'Sep-Apr: Tue-Sun public sessions', county: 'New Castle County', description: 'Public ice skating at University of Delaware with figure skating programs and learn-to-skate classes.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'figure-skating', 'lessons', 'university'] },

  // WEST VIRGINIA
  { name: 'Big Sandy Arena Huntington', address: '1 Civic Center Dr', city: 'Huntington', state: 'WV', zipCode: '25701', latitude: 38.4192, longitude: -82.4268, phone: '(304) 696-5990', website: 'https://www.bigsandyarena.com', hours: 'Nov-Mar seasonal public sessions', county: 'Cabell County', description: 'Public ice skating at Big Sandy Arena in Huntington WV during winter season with family sessions.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'seasonal', 'family-sessions'] },

  // NORTH CAROLINA
  { name: 'Polar Ice House Charlotte', address: '8118 Outlet Village Way', city: 'Charlotte', state: 'NC', zipCode: '28273', latitude: 35.1060, longitude: -80.9613, phone: '(704) 527-9260', website: 'https://www.polaricecharlotte.com', hours: 'Year-round: Mon-Sat 10am-9pm, Sun 12pm-6pm', county: 'Mecklenburg County', description: 'Year-round indoor ice skating in Charlotte NC with public sessions, birthday parties, and hockey programs.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'hockey', 'lessons', 'year-round', 'birthday-parties'] },
  { name: 'Triangle Sports Center Raleigh', address: '1250 Baker Rd', city: 'Wake Forest', state: 'NC', zipCode: '27587', latitude: 35.9618, longitude: -78.4874, phone: '(919) 453-0111', website: 'https://www.trianglesportscenter.com', hours: 'Year-round public sessions', county: 'Wake County', description: 'Indoor ice skating near Raleigh with public sessions, figure skating, and youth hockey leagues.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'hockey', 'figure-skating', 'year-round'] },

  // SOUTH CAROLINA
  { name: 'Carolina Ice Palace Greenville', address: '1209 Boiling Springs Rd', city: 'Boiling Springs', state: 'SC', zipCode: '29316', latitude: 35.0476, longitude: -81.9809, phone: '(864) 579-5600', website: 'https://www.carolinaicepalace.com', hours: 'Year-round: Mon-Sat 10am-9pm, Sun 12pm-6pm', county: 'Spartanburg County', description: 'Year-round indoor ice skating near Greenville SC with public sessions, lessons, and youth hockey.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'hockey', 'figure-skating', 'year-round', 'birthday-parties'] },

  // GEORGIA
  { name: 'Cascade Ice Rink Atlanta', address: '2649 Cascade Rd SW', city: 'Atlanta', state: 'GA', zipCode: '30311', latitude: 33.7146, longitude: -84.4696, phone: '(404) 755-0960', website: 'https://www.cascadeatl.com', hours: 'Tue-Sun public sessions', county: 'Fulton County', description: 'Indoor ice and roller skating in Southwest Atlanta. Public sessions and birthday parties available year-round.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'roller-rink', 'birthday-parties', 'year-round'] },

  // FLORIDA
  { name: 'Iceplex Fort Lauderdale', address: '3299 NW 5th Ave', city: 'Pompano Beach', state: 'FL', zipCode: '33064', latitude: 26.2399, longitude: -80.1199, phone: '(954) 946-5000', website: 'https://www.iceplexfl.com', hours: 'Year-round: Mon-Sun multiple sessions', county: 'Broward County', description: 'Year-round ice skating in South Florida with public sessions, youth hockey, and figure skating programs.', cost: '$8-14/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'hockey', 'figure-skating', 'year-round'] },
  { name: 'RDV Sportsplex Ice Den', address: '8701 Maitland Summit Blvd', city: 'Orlando', state: 'FL', zipCode: '32810', latitude: 28.6247, longitude: -81.3958, phone: '(407) 916-2400', website: 'https://www.rdvsportsplex.com', hours: 'Year-round public sessions', county: 'Orange County', description: 'Practice facility for NHL Orlando with public skating, youth hockey, and figure skating programs year-round.', cost: '$9-14/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'nhl-facility', 'hockey', 'figure-skating', 'year-round'] },

  // ALABAMA
  { name: 'BJCC Ice Sports Birmingham', address: '2100 Richard Arrington Jr Blvd N', city: 'Birmingham', state: 'AL', zipCode: '35203', latitude: 33.5250, longitude: -86.8025, phone: '(205) 458-8400', website: 'https://www.bjcc.org/ice-sports', hours: 'Year-round public sessions', county: 'Jefferson County', description: 'Year-round indoor ice skating at Birmingham-Jefferson Convention Complex with public sessions and youth programs.', cost: '$8-12/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'hockey', 'year-round', 'birthday-parties'] },

  // TENNESSEE
  { name: 'Ford Ice Center Nashville', address: '100 Forrest Park Dr', city: 'Antioch', state: 'TN', zipCode: '37013', latitude: 36.0656, longitude: -86.6793, phone: '(615) 880-8869', website: 'https://fordice.com', hours: 'Year-round public sessions', county: 'Davidson County', description: 'Nashville Predators practice facility open to the public with skating sessions, lessons, and hockey programs.', cost: '$9-14/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'nhl-facility', 'hockey', 'lessons', 'year-round'] },

  // KENTUCKY
  { name: 'Lexington Ice Center', address: '560 Eureka Springs Dr', city: 'Lexington', state: 'KY', zipCode: '40517', latitude: 38.0117, longitude: -84.5022, phone: '(859) 269-5578', website: 'https://www.lexingtonicecenter.com', hours: 'Year-round public sessions', county: 'Fayette County', description: 'Year-round indoor ice skating in Lexington KY with public sessions, youth hockey leagues, and figure skating.', cost: '$7-11/session', ageRange: 'All Ages', isFree: false, seasonal: false, features: ['public-skating', 'rentals', 'hockey', 'figure-skating', 'year-round'] },

  // MISSISSIPPI
  { name: 'Ridgeland Ice Sports Center', address: '1060 Old Agency Rd', city: 'Ridgeland', state: 'MS', zipCode: '39157', latitude: 32.4074, longitude: -90.1312, phone: '(601) 853-7680', website: 'https://www.ridgelandms.org/ice-sports', hours: 'Sep-Apr public sessions', county: 'Madison County', description: 'Public ice skating near Jackson MS with seasonal sessions, youth hockey, and learn-to-skate programs.', cost: '$7-11/session', ageRange: 'All Ages', isFree: false, seasonal: true, features: ['public-skating', 'rentals', 'hockey', 'lessons', 'seasonal'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Convert location data to activity document format
 */
function createActivityDocument(location) {
  const geohash = ngeohash.encode(location.latitude, location.longitude, 7);

  return {
    name: location.name,
    type: location.seasonal ? 'Seasonal Ice Rink' : 'Ice Rink',
    category: 'Indoor',
    subcategory: 'Ice Skating',
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
      source: 'ice-rinks-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'ice-rink',
      isSeasonal: location.seasonal,
    },
    filters: {
      isFree: location.isFree,
      isIndoor: !location.seasonal,
      isOutdoor: location.seasonal,
      hasParking: true,
      hasRentals: location.features.includes('rentals'),
      hasLessons: location.features.includes('lessons'),
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

/**
 * Main scraper function
 */
async function scrapeIceRinksDMV() {
  console.log(`\n⛸️ ICE RINKS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Ice Rinks
  console.log('\n⛸️ Processing Ice Rinks...');

  // Group by state and type
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of ICE_RINKS) {
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

  // Save to database
  console.log('\n💾 Saving to database...');
  const { saved, updated, failed } = await saveActivities(allActivities);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ICE RINKS DMV SCRAPER COMPLETE`);
  console.log(`   Total locations: ${allActivities.length}`);
  console.log(`   New activities saved: ${saved}`);
  console.log(`   Existing updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Log to scraperLogs collection
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
      states: ['MD', 'VA', 'DC'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeIceRinksDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeIceRinksDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Ice Rinks DMV Scraper');

  scrapeIceRinksDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeIceRinksDMV,
  scrapeIceRinksDMVCloudFunction,
};
