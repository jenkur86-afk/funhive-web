#!/usr/bin/env node

/**
 * GYMNASTICS CENTERS DMV ACTIVITIES SCRAPER
 *
 * Adds gymnastics centers with open gym sessions to the activities collection.
 * These venues offer structured classes plus drop-in open gym times.
 *
 * Coverage:
 * - Hill's Gymnastics (Gaithersburg)
 * - Dominique Dawes Gymnastics Academy (Clarksburg)
 * - Columbia Gymnastics (Columbia)
 * - Frederick Gymnastics (Frederick)
 * - Silver Stars Gymnastics (Silver Spring, Bowie)
 * - Rebounders Gymnastics (Manassas)
 * - Capital Gymnastics (Burke, Chantilly, Woodbridge)
 * - ASI Gymnastics (Gaithersburg)
 *
 * Usage:
 *   node scraper-activities-gymnastics-centers-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledGymnasticsCentersDMV
 * Schedule: Weekly (activities don't change often)
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'GymnasticsCenters-Eastern';

// ==========================================
// VENUE DATA - DMV Gymnastics Centers
// ==========================================

const GYMNASTICS_CENTERS = [
  // MARYLAND
  {
    name: 'Hill\'s Gymnastics',
    address: '18909 Earhart Court',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20879',
    latitude: 39.1542,
    longitude: -77.2197,
    phone: '(301) 840-5900',
    website: 'https://www.hillsgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm',
    county: 'Montgomery County',
    description: 'Premier gymnastics facility offering recreational and competitive programs. Features open gym sessions, birthday parties, camps, and classes for all ages and skill levels.',
    cost: '$15-20/session',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun (check schedule)',
  },
  {
    name: 'Dominique Dawes Gymnastics Academy',
    address: '13001 Clarksburg Square Road Suite 100',
    city: 'Clarksburg',
    state: 'MD',
    zipCode: '20871',
    latitude: 39.2368,
    longitude: -77.2789,
    phone: '(240) 364-4334',
    website: 'https://www.ddgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Montgomery County',
    description: 'Olympic gymnast Dominique Dawes\' gymnastics academy offering recreational and competitive programs. State-of-the-art facility with spring floors and foam pits.',
    cost: '$18-25/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Select weekends',
  },
  {
    name: 'Columbia Gymnastics',
    address: '9050 Red Branch Road',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21045',
    latitude: 39.2018,
    longitude: -76.8412,
    phone: '(410) 381-1894',
    website: 'https://www.columbiagy.com',
    hours: 'Mon-Thu 9am-8pm, Fri 9am-7pm, Sat 9am-4pm',
    county: 'Howard County',
    description: 'Family-owned gymnastics center offering classes, camps, and birthday parties. Features preschool programs, recreational classes, and competitive teams.',
    cost: '$15-22/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri evenings, Sun afternoons',
  },
  {
    name: 'Frederick Gymnastics Club',
    address: '7800 Reichs Ford Road',
    city: 'Frederick',
    state: 'MD',
    zipCode: '21704',
    latitude: 39.4015,
    longitude: -77.4089,
    phone: '(301) 662-7700',
    website: 'https://www.frederickgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-4pm',
    county: 'Frederick County',
    description: 'Established gymnastics club with recreational and competitive programs. Features 20,000+ sq ft facility with spring floors, bars, beams, and trampolines.',
    cost: '$16-24/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat mornings',
  },
  {
    name: 'Silver Stars Gymnastics - Silver Spring',
    address: '8505 Fenton Street',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9959,
    longitude: -77.0254,
    phone: '(301) 589-6800',
    website: 'https://www.silverstarsgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Montgomery County',
    description: 'Gymnastics center offering parent-tot, preschool, and recreational classes. Features open gym sessions, camps, and birthday parties.',
    cost: '$15-20/class',
    ageRange: 'Ages 6mo-12yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun',
  },
  {
    name: 'Silver Stars Gymnastics - Bowie',
    address: '4220 Lafayette Center Drive Suite C',
    city: 'Bowie',
    state: 'MD',
    zipCode: '20715',
    latitude: 38.9607,
    longitude: -76.7312,
    phone: '(301) 805-5500',
    website: 'https://www.silverstarsgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Prince George\'s County',
    description: 'Second location of Silver Stars Gymnastics serving Prince George\'s County. Full gymnastics programming for toddlers through teens.',
    cost: '$15-20/class',
    ageRange: 'Ages 6mo-12yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun',
  },
  {
    name: 'ASI Gymnastics Gaithersburg',
    address: '9411 Gaither Road',
    city: 'Gaithersburg',
    state: 'MD',
    zipCode: '20877',
    latitude: 39.1318,
    longitude: -77.2147,
    phone: '(301) 948-0880',
    website: 'https://www.asigymnastics.com/gaithersburg',
    hours: 'Mon-Thu 9am-8pm, Fri 9am-7pm, Sat 9am-4pm',
    county: 'Montgomery County',
    description: 'Part of national ASI Gymnastics chain. Offers recreational and competitive gymnastics with open gym, camps, and birthday parties.',
    cost: '$18-25/class',
    ageRange: 'Ages 4mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Weekly open gym sessions',
  },
  {
    name: 'Harford Gymnastics Club',
    address: '1000 Beards Hill Road',
    city: 'Aberdeen',
    state: 'MD',
    zipCode: '21001',
    latitude: 39.5095,
    longitude: -76.1753,
    phone: '(410) 272-0014',
    website: 'https://www.harfordgymnasticsclub.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-2pm',
    county: 'Harford County',
    description: 'Community gymnastics center serving Harford County. Offers preschool through competitive programs, open gym, and camps.',
    cost: '$14-18/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat mornings',
  },

  // VIRGINIA
  {
    name: 'Capital Gymnastics - Burke',
    address: '6055 Burke Centre Parkway',
    city: 'Burke',
    state: 'VA',
    zipCode: '22015',
    latitude: 38.7918,
    longitude: -77.2826,
    phone: '(703) 250-8000',
    website: 'https://www.cgnc.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm',
    county: 'Fairfax County',
    description: 'Largest gymnastics center in Northern Virginia with 45,000 sq ft facility. Features Ninja Zone, open gym, camps, and competitive teams.',
    cost: '$18-28/class',
    ageRange: 'Ages 6mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri-Sun',
  },
  {
    name: 'Capital Gymnastics - Chantilly',
    address: '4240 Pleasant Valley Road',
    city: 'Chantilly',
    state: 'VA',
    zipCode: '20151',
    latitude: 38.8738,
    longitude: -77.4318,
    phone: '(703) 222-1100',
    website: 'https://www.cgnc.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm',
    county: 'Fairfax County',
    description: 'Capital Gymnastics Chantilly location serving western Fairfax County. Full gymnastics programming with Ninja Zone and open gym.',
    cost: '$18-28/class',
    ageRange: 'Ages 6mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri-Sun',
  },
  {
    name: 'Rebounders Gymnastics',
    address: '10890 Nokesville Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20110',
    latitude: 38.7298,
    longitude: -77.4512,
    phone: '(703) 331-1050',
    website: 'https://www.reboundersgymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Prince William County',
    description: 'Family-owned gymnastics center with recreational and competitive programs. Features trampolines, foam pit, and tumble track.',
    cost: '$16-22/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Weekly open gym',
  },
  {
    name: 'Paragon Gymnastics',
    address: '10417 Portsmouth Road',
    city: 'Manassas',
    state: 'VA',
    zipCode: '20109',
    latitude: 38.7589,
    longitude: -77.4267,
    phone: '(703) 393-7100',
    website: 'https://www.paragongymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-4pm',
    county: 'Prince William County',
    description: 'Gymnastics training center with recreational classes, competitive teams, and Ninja training. Open gym and birthday parties available.',
    cost: '$17-24/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Sat-Sun',
  },
  {
    name: 'Arlington Gymnastics Club',
    address: '3209 N Pershing Drive',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22201',
    latitude: 38.8842,
    longitude: -77.0998,
    phone: '(703) 522-5550',
    website: 'https://www.arlingtongymnasticsclub.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm',
    county: 'Arlington County',
    description: 'Community gymnastics center serving Arlington. Offers parent-child classes, recreational gymnastics, and competitive teams.',
    cost: '$18-25/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Weekends',
  },
  {
    name: 'Loudoun Gymnastics Center',
    address: '44675 Cape Court Suite 130',
    city: 'Ashburn',
    state: 'VA',
    zipCode: '20147',
    latitude: 39.0318,
    longitude: -77.4901,
    phone: '(571) 321-8888',
    website: 'https://www.loudoungymnastics.com',
    hours: 'Mon-Fri 9am-8pm, Sat 9am-4pm',
    county: 'Loudoun County',
    description: 'Premier Loudoun County gymnastics facility with 25,000 sq ft of training space. Features recreational and competitive programs.',
    cost: '$18-26/class',
    ageRange: 'Ages 18mo-18yrs',
    hasOpenGym: true,
    openGymHours: 'Fri-Sun',
  },

  // ==========================================
  // EASTERN US EXPANSION — GYMNASTICS CENTERS
  // ==========================================

  // NEW YORK
  { name: 'USA Gymnastics Training Center Long Island', address: '550 Broadhollow Rd', city: 'Melville', state: 'NY', zipCode: '11747', latitude: 40.7878, longitude: -73.4143, phone: '(631) 756-7570', website: 'https://www.usagymnasticstraining.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm', county: 'Suffolk County', description: 'USA Gymnastics Training Center on Long Island with recreational and competitive gymnastics, tumbling, and birthday parties.', cost: '$18-25/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },
  { name: 'Chelsea Piers Gymnastics New York', address: '62 Chelsea Piers', city: 'New York', state: 'NY', zipCode: '10011', latitude: 40.7484, longitude: -74.0072, phone: '(212) 336-6500', website: 'https://www.chelseapiers.com/gymnastics', hours: 'Mon-Fri 9am-9pm, Sat-Sun 9am-6pm', county: 'New York County', description: 'Chelsea Piers gymnastics academy in Manhattan with recreational classes, advanced training, and birthday parties.', cost: '$25-40/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: false, openGymHours: 'N/A' },

  // NEW JERSEY
  { name: 'NJ Gymnastics Academy Tinton Falls', address: '215 Jumping Brook Rd', city: 'Neptune', state: 'NJ', zipCode: '07753', latitude: 40.2167, longitude: -74.0598, phone: '(732) 922-7267', website: 'https://www.njgymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm', county: 'Monmouth County', description: 'NJ Gymnastics Academy with recreational and competitive programs for all ages. Open gym, parties, and summer camps.', cost: '$18-26/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // PENNSYLVANIA
  { name: 'Parkettes National Gymnastics Allentown', address: '1440 W Fairmont St', city: 'Allentown', state: 'PA', zipCode: '18102', latitude: 40.6101, longitude: -75.5112, phone: '(610) 433-2520', website: 'https://www.parkettes.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm', county: 'Lehigh County', description: 'World-renowned Parkettes gymnastics in Allentown PA with elite training and recreational programs for all skill levels.', cost: '$20-30/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },
  { name: 'Pittsburgh Gymnastics Club', address: '4100 Washington Rd', city: 'McMurray', state: 'PA', zipCode: '15317', latitude: 40.2868, longitude: -80.1087, phone: '(724) 941-5999', website: 'https://www.pghgymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Washington County', description: 'Pittsburgh Gymnastics Club with recreational and competitive gymnastics, tumbling, and cheerleading programs.', cost: '$18-25/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Fri-Sun' },

  // CONNECTICUT
  { name: 'YMCA Gymnastics Hartford', address: '160 Jewell St', city: 'Hartford', state: 'CT', zipCode: '06103', latitude: 41.7616, longitude: -72.6807, phone: '(860) 522-4183', website: 'https://www.ymcaofgreaterhartford.org', hours: 'Mon-Fri 9am-8pm, Sat 9am-5pm', county: 'Hartford County', description: 'Hartford YMCA gymnastics program with recreational classes for toddlers, kids, and teens. Parent-child classes and open gym available.', cost: '$15-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // MASSACHUSETTS
  { name: 'Olympia Gymnastics Weymouth', address: '60 Libbey Industrial Pkwy', city: 'Weymouth', state: 'MA', zipCode: '02189', latitude: 42.2193, longitude: -70.9424, phone: '(781) 335-7555', website: 'https://www.olympiaacademy.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Norfolk County', description: 'Olympia Gymnastics Academy south of Boston with recreational and competitive gymnastics. Open gym and birthday parties.', cost: '$18-26/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Fri-Sun' },
  { name: 'Gymnastics World Worcester', address: '87 Commercial St', city: 'Worcester', state: 'MA', zipCode: '01608', latitude: 42.2593, longitude: -71.8087, phone: '(508) 752-4975', website: 'https://www.gworldworcester.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Worcester County', description: 'Gymnastics World in Worcester MA with recreational programs for toddlers through teens. Open gym and birthday parties available.', cost: '$15-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // RHODE ISLAND
  { name: 'Rhode Island Gymnastics Center East Providence', address: '1 Catamore Blvd', city: 'East Providence', state: 'RI', zipCode: '02914', latitude: 41.8132, longitude: -71.3680, phone: '(401) 431-2800', website: 'https://www.rigymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Providence County', description: 'Rhode Island Gymnastics Center with recreational and competitive programs. Birthday parties, open gym, and summer camps.', cost: '$16-24/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // NEW HAMPSHIRE
  { name: 'Granite State Gymnastics Manchester', address: '1200 Elm St', city: 'Manchester', state: 'NH', zipCode: '03101', latitude: 43.0017, longitude: -71.4557, phone: '(603) 624-3400', website: 'https://www.gsgymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Hillsborough County', description: 'Granite State Gymnastics in Manchester NH with recreational and competitive programs for all ages. Open gym and birthday parties.', cost: '$15-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // MAINE
  { name: 'Portland Gymnastics Academy', address: '49 Eisenhower Dr', city: 'Portland', state: 'ME', zipCode: '04103', latitude: 43.6932, longitude: -70.3217, phone: '(207) 775-2929', website: 'https://www.portlandgymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Cumberland County', description: 'Portland Gymnastics Academy with recreational programs, competitive teams, and open gym in Maine.', cost: '$15-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // VERMONT
  { name: 'Stowe Gymnastics Academy', address: '540 S Main St', city: 'Stowe', state: 'VT', zipCode: '05672', latitude: 44.4652, longitude: -72.6868, phone: '(802) 253-9404', website: 'https://www.stowegymnastics.com', hours: 'Mon-Fri 3pm-8pm, Sat 9am-3pm', county: 'Lamoille County', description: 'Stowe Gymnastics Academy with recreational and competitive programs in Vermont. Great for visitors and locals.', cost: '$15-22/class', ageRange: 'Ages 4-18', hasOpenGym: true, openGymHours: 'Sat' },

  // DELAWARE
  { name: 'Diamond State Gymnastics Middletown', address: '500 E Main St', city: 'Middletown', state: 'DE', zipCode: '19709', latitude: 39.4445, longitude: -75.7163, phone: '(302) 376-7770', website: 'https://www.diamondstategymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'New Castle County', description: 'Diamond State Gymnastics in Middletown DE with recreational and competitive programs. Open gym and birthday parties.', cost: '$16-24/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // WEST VIRGINIA
  { name: 'Charleston Gymnastics School', address: '4000 Pennsylvania Ave', city: 'Charleston', state: 'WV', zipCode: '25302', latitude: 38.3781, longitude: -81.6527, phone: '(304) 343-5200', website: 'https://www.charlestongymnastics.com', hours: 'Mon-Fri 3pm-8pm, Sat 9am-3pm', county: 'Kanawha County', description: 'Charleston Gymnastics School with recreational classes and competitive team for youth in West Virginia.', cost: '$15-20/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // NORTH CAROLINA
  { name: 'Triangle Gymnastics Academy Raleigh', address: '6409 New Bern Ave', city: 'Raleigh', state: 'NC', zipCode: '27610', latitude: 35.7824, longitude: -78.5804, phone: '(919) 231-0688', website: 'https://www.trianglegymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Wake County', description: 'Triangle Gymnastics Academy in Raleigh with recreational and competitive programs. Open gym, birthday parties, and summer camps.', cost: '$18-25/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Fri-Sun' },
  { name: 'Carolina Gymnastics Charlotte', address: '9413 Westinghouse Blvd', city: 'Charlotte', state: 'NC', zipCode: '28273', latitude: 35.1081, longitude: -80.9500, phone: '(704) 583-8700', website: 'https://www.carolinagymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Mecklenburg County', description: 'Carolina Gymnastics in Charlotte with recreational and competitive programs for all ages. Open gym and birthday parties.', cost: '$18-25/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // SOUTH CAROLINA
  { name: 'Coastal Gymnastics Myrtle Beach', address: '1551 Fantasy Harbor Blvd', city: 'Myrtle Beach', state: 'SC', zipCode: '29579', latitude: 33.7434, longitude: -79.0015, phone: '(843) 236-1200', website: 'https://www.coastalgymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Horry County', description: 'Coastal Gymnastics in Myrtle Beach with recreational gymnastics programs for toddlers through teens. Birthday parties available.', cost: '$16-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // GEORGIA
  { name: 'World Champions Centre Alpharetta', address: '2500 Old Milton Pkwy', city: 'Alpharetta', state: 'GA', zipCode: '30009', latitude: 34.0754, longitude: -84.2941, phone: '(770) 642-7770', website: 'https://www.worldchampions.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Fulton County', description: 'Premier gymnastics training facility near Atlanta with recreational and elite programs. Simone Biles s former gym. Open gym and birthday parties.', cost: '$20-30/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },
  { name: 'Gymnastics Plus Savannah', address: '7400 Abercorn St', city: 'Savannah', state: 'GA', zipCode: '31406', latitude: 32.0009, longitude: -81.0878, phone: '(912) 354-3600', website: 'https://www.gymnasticsplusga.com', hours: 'Mon-Fri 3pm-8pm, Sat 9am-3pm', county: 'Chatham County', description: 'Gymnastics Plus in Savannah GA with recreational and competitive programs. Open gym and birthday parties available.', cost: '$16-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // FLORIDA
  { name: 'All Olympia Gymnastics Tampa', address: '7600 Gunn Hwy', city: 'Tampa', state: 'FL', zipCode: '33626', latitude: 28.0516, longitude: -82.5828, phone: '(813) 920-0240', website: 'https://www.allolympia.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Hillsborough County', description: 'All Olympia Gymnastics in Tampa with recreational and competitive programs for all ages. Open gym and birthday parties.', cost: '$18-26/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },
  { name: 'Florida Gymnastics Orlando', address: '6107 S Hourglass Blvd', city: 'Orlando', state: 'FL', zipCode: '32811', latitude: 28.5017, longitude: -81.4578, phone: '(407) 293-4668', website: 'https://www.flagymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Orange County', description: 'Florida Gymnastics in Orlando with recreational and competitive programs. Open gym, birthday parties, and summer camps.', cost: '$18-25/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Fri-Sun' },

  // ALABAMA
  { name: 'Huntsville Gymnastics Club', address: '2601 Jordan Ln NW', city: 'Huntsville', state: 'AL', zipCode: '35816', latitude: 34.7525, longitude: -86.6478, phone: '(256) 830-9500', website: 'https://www.huntsvillegymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Madison County', description: 'Huntsville Gymnastics Club with recreational and competitive programs. Open gym, birthday parties, and summer camps.', cost: '$16-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },

  // MISSISSIPPI
  { name: 'Magic City Gymnastics Ridgeland', address: '220 Madison Landing Cir', city: 'Ridgeland', state: 'MS', zipCode: '39157', latitude: 32.4018, longitude: -90.1476, phone: '(601) 898-9100', website: 'https://www.magiccitygymnastics.com', hours: 'Mon-Fri 3pm-8pm, Sat 9am-3pm', county: 'Madison County', description: 'Gymnastics center near Jackson MS with recreational classes and competitive team for youth. Birthday parties available.', cost: '$15-20/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // TENNESSEE
  { name: 'Tennessee Elite Gymnastics Nashville', address: '5540 Virginia Way', city: 'Brentwood', state: 'TN', zipCode: '37027', latitude: 35.9951, longitude: -86.7933, phone: '(615) 373-3900', website: 'https://www.tnelitegymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Williamson County', description: 'Tennessee Elite Gymnastics in Brentwood near Nashville with recreational and competitive programs. Open gym and birthday parties.', cost: '$18-26/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Fri-Sun' },
  { name: 'Memphis Gymnastics Club', address: '5840 Stage Rd', city: 'Bartlett', state: 'TN', zipCode: '38134', latitude: 35.2046, longitude: -89.8724, phone: '(901) 384-9600', website: 'https://www.memphisgymnastics.com', hours: 'Mon-Fri 3pm-8pm, Sat 9am-3pm', county: 'Shelby County', description: 'Memphis Gymnastics Club in Bartlett TN with recreational and competitive programs. Open gym and birthday parties.', cost: '$16-22/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat' },

  // KENTUCKY
  { name: 'Louisville Gymnastics Academy', address: '4300 Robards Ct', city: 'Louisville', state: 'KY', zipCode: '40218', latitude: 38.1899, longitude: -85.6390, phone: '(502) 961-1800', website: 'https://www.louisvillegymnastics.com', hours: 'Mon-Fri 9am-8pm, Sat 9am-3pm', county: 'Jefferson County', description: 'Louisville Gymnastics Academy with recreational and competitive gymnastics for all ages. Open gym and birthday parties.', cost: '$16-24/class', ageRange: 'Ages 18mo-18yrs', hasOpenGym: true, openGymHours: 'Sat-Sun' },
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
    type: 'Gymnastics Center',
    category: 'Indoor',
    subcategory: 'Gymnastics',
    description: location.description,
    geohash: geohash,
    state: location.state,
    phone: location.phone || '',
    website: location.website,
    hours: location.hours,
    isFree: false,
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
    features: {
      hasOpenGym: location.hasOpenGym,
      openGymHours: location.openGymHours,
      hasBirthdayParties: true,
      hasCamps: true,
    },
    metadata: {
      source: 'gymnastics-centers-dmv',
      scraperName: SCRAPER_NAME,
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      county: location.county,
      venueType: 'gymnastics',
    },
    filters: {
      isFree: false,
      isIndoor: true,
      hasParking: true,
      hasOpenGym: location.hasOpenGym,
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
async function scrapeGymnasticsCentersDMV() {
  console.log(`\n🤸 GYMNASTICS CENTERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  // Process Gymnastics Centers
  console.log('\n🏅 Processing Gymnastics Centers...');

  // Group by state for organized output
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of GYMNASTICS_CENTERS) {
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
  console.log(`✅ GYMNASTICS CENTERS DMV SCRAPER COMPLETE`);
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
      states: ['MD', 'VA'],
    });
  } catch (error) {
    console.error('Failed to log scraper run:', error.message);
  }

  return { saved, updated, failed };
}

/**
 * Cloud Function export
 */
async function scrapeGymnasticsCentersDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeGymnasticsCentersDMV();
}

// Run if executed directly
if (require.main === module) {
  console.log('\n🚀 Starting Gymnastics Centers DMV Scraper');

  scrapeGymnasticsCentersDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeGymnasticsCentersDMV,
  scrapeGymnasticsCentersDMVCloudFunction,
};
