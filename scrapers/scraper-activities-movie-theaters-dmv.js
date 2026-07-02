#!/usr/bin/env node

/**
 * MOVIE THEATERS DMV ACTIVITIES SCRAPER
 *
 * Adds family-friendly movie theaters to the activities collection.
 * Focuses on theaters with special kids programming, sensory-friendly shows,
 * and premium family experiences.
 *
 * Coverage:
 * - AMC Theatres (with Sensory Friendly Films)
 * - Regal Cinemas
 * - Cinemark
 * - Alamo Drafthouse
 * - Angelika Film Center
 * - AFI Silver Theatre
 * - Landmark Theatres
 *
 * Usage:
 *   node scraper-activities-movie-theaters-dmv.js          # Run scraper
 *
 * Cloud Function: scheduledMovieTheatersDMV
 * Schedule: Weekly
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { getOrCreateActivity } = require('./venue-matcher');

const SCRAPER_NAME = 'MovieTheaters-Eastern';

// ==========================================
// VENUE DATA - DMV Movie Theaters
// ==========================================

const MOVIE_THEATERS = [
  // AMC THEATRES (with Sensory Friendly Films program)
  {
    name: 'AMC Columbia 14',
    address: '10300 Little Patuxent Parkway',
    city: 'Columbia',
    state: 'MD',
    zipCode: '21044',
    latitude: 39.2158,
    longitude: -76.8618,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/baltimore/amc-columbia-14',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Howard County',
    description: 'Modern multiplex with IMAX, Dolby Cinema, and recliner seating. Offers Sensory Friendly Films for kids with autism and sensory sensitivities.',
    cost: '$12-20/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Owings Mills 17',
    address: '10100 Mill Run Circle',
    city: 'Owings Mills',
    state: 'MD',
    zipCode: '21117',
    latitude: 39.4118,
    longitude: -76.7818,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/baltimore/amc-owings-mills-17',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Baltimore County',
    description: 'Large multiplex with IMAX and premium formats. Participates in Sensory Friendly Films program for special needs families.',
    cost: '$12-20/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Tysons Corner 16',
    address: '7850 Tysons Corner Center',
    city: 'McLean',
    state: 'VA',
    zipCode: '22102',
    latitude: 38.9178,
    longitude: -77.2228,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/washington-dc/amc-tysons-corner-16',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Fairfax County',
    description: 'Premier shopping mall theater with IMAX, Dolby Cinema, and luxury seating. Family-friendly with kids programming.',
    cost: '$14-22/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Hoffman Center 22',
    address: '206 Swamp Fox Road',
    city: 'Alexandria',
    state: 'VA',
    zipCode: '22314',
    latitude: 38.8018,
    longitude: -77.0828,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/washington-dc/amc-hoffman-center-22',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'City of Alexandria',
    description: 'Large 22-screen complex near Old Town Alexandria. IMAX, Dolby, and Sensory Friendly screenings available.',
    cost: '$14-22/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', 'dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'AMC Georgetown 14',
    address: '3111 K Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20007',
    latitude: 38.9028,
    longitude: -77.0618,
    phone: '(888) 262-4386',
    website: 'https://www.amctheatres.com/movie-theatres/washington-dc/amc-georgetown-14',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'District of Columbia',
    description: 'Georgetown waterfront theater with premium formats. Family-friendly location near shops and restaurants.',
    cost: '$14-22/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['dolby-cinema', 'recliners', 'sensory-friendly', 'discount-days', 'waterfront'],
  },

  // REGAL CINEMAS
  {
    name: 'Regal Majestic Stadium 20 & IMAX',
    address: '900 Ellsworth Drive',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9948,
    longitude: -77.0248,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-majestic-imax/0137',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Montgomery County',
    description: 'Downtown Silver Spring theater with IMAX and 4DX experiences. Offers kids summer movie deals and birthday party packages.',
    cost: '$13-20/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['imax', '4dx', 'rpx', 'summer-movies', 'birthday-parties', 'reserved-seating'],
  },
  {
    name: 'Regal Germantown Stadium 14',
    address: '20000 Century Boulevard',
    city: 'Germantown',
    state: 'MD',
    zipCode: '20874',
    latitude: 39.1758,
    longitude: -77.2628,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-germantown-stadium-14/0097',
    hours: 'Daily 10am-11pm (varies by showtime)',
    county: 'Montgomery County',
    description: 'Stadium seating theater with RPX premium format. Family-friendly with summer movie series for kids.',
    cost: '$12-18/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['rpx', 'stadium-seating', 'summer-movies', 'reserved-seating'],
  },
  {
    name: 'Regal Fairfax Towne Center 10',
    address: '4110 West Ox Road',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22033',
    latitude: 38.8578,
    longitude: -77.3758,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-fairfax-towne-center/0196',
    hours: 'Daily 10am-11pm (varies by showtime)',
    county: 'Fairfax County',
    description: 'Community theater with comfortable seating and good family atmosphere. Participates in summer kids movies.',
    cost: '$12-16/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['stadium-seating', 'summer-movies', 'reserved-seating'],
  },
  {
    name: 'Regal Gallery Place',
    address: '707 7th Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20001',
    latitude: 38.8978,
    longitude: -77.0218,
    phone: '(844) 462-7342',
    website: 'https://www.regmovies.com/theatres/regal-gallery-place/1662',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'District of Columbia',
    description: 'Downtown DC theater in Chinatown. Convenient Metro access makes it easy for family outings.',
    cost: '$14-20/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['stadium-seating', 'metro-accessible', 'reserved-seating'],
  },

  // CINEMARK
  {
    name: 'Cinemark Egyptian 24 and XD',
    address: '7000 Arundel Mills Circle',
    city: 'Hanover',
    state: 'MD',
    zipCode: '21076',
    latitude: 39.1578,
    longitude: -76.7318,
    phone: '(443) 755-8990',
    website: 'https://www.cinemark.com/theatres/md-hanover/cinemark-egyptian-24-and-xd',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Anne Arundel County',
    description: 'Egyptian-themed theater with 24 screens and XD premium format. Offers Sensory Friendly Films and Summer Movie Clubhouse for kids.',
    cost: '$11-18/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['xd', 'themed-decor', 'sensory-friendly', 'summer-movies', 'discount-days', 'reserved-seating'],
  },
  {
    name: 'Cinemark Fairfax Corner 14 + XD',
    address: '11900 Palace Way',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22030',
    latitude: 38.8628,
    longitude: -77.3918,
    phone: '(703) 502-4060',
    website: 'https://www.cinemark.com/theatres/va-fairfax/cinemark-fairfax-corner-14-xd',
    hours: 'Daily 10am-12am (varies by showtime)',
    county: 'Fairfax County',
    description: 'Modern theater at Fairfax Corner shopping center. XD auditorium and sensory-friendly screenings for families.',
    cost: '$11-18/ticket, Discount Tuesdays',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'multiplex',
    features: ['xd', 'sensory-friendly', 'summer-movies', 'discount-days', 'reserved-seating'],
  },

  // ALAMO DRAFTHOUSE (Family-friendly with special screenings)
  {
    name: 'Alamo Drafthouse Cinema DC Bryant Street',
    address: '4701 Rhode Island Avenue NE',
    city: 'Washington',
    state: 'DC',
    zipCode: '20018',
    latitude: 38.9358,
    longitude: -76.9928,
    phone: '(202) 617-2390',
    website: 'https://drafthouse.com/dc/theater/dc-bryant-street',
    hours: 'Daily 11am-12am (varies by showtime)',
    county: 'District of Columbia',
    description: 'Dine-in cinema with strict no-talking policy. Offers Kids Camp screenings with family-friendly matinees and special events.',
    cost: '$14-20/ticket',
    ageRange: 'All Ages (Kids Camp for families)',
    isFree: false,
    venueType: 'dine-in',
    features: ['dine-in', 'kids-camp', 'special-events', 'reserved-seating', 'no-talking-policy'],
  },
  {
    name: 'Alamo Drafthouse Cinema Woodbridge',
    address: '2700 Potomac Mills Circle',
    city: 'Woodbridge',
    state: 'VA',
    zipCode: '22192',
    latitude: 38.6428,
    longitude: -77.3018,
    phone: '(571) 398-2700',
    website: 'https://drafthouse.com/dc/theater/woodbridge',
    hours: 'Daily 11am-12am (varies by showtime)',
    county: 'Prince William County',
    description: 'Dine-in movie theater with full food and drink service. Kids Camp offers family-friendly screenings with relaxed rules.',
    cost: '$12-18/ticket',
    ageRange: 'All Ages (Kids Camp for families)',
    isFree: false,
    venueType: 'dine-in',
    features: ['dine-in', 'kids-camp', 'special-events', 'reserved-seating'],
  },
  {
    name: 'Alamo Drafthouse Cinema Loudoun',
    address: '21100 Dulles Town Circle',
    city: 'Sterling',
    state: 'VA',
    zipCode: '20166',
    latitude: 39.0278,
    longitude: -77.4178,
    phone: '(571) 355-4800',
    website: 'https://drafthouse.com/dc/theater/loudoun',
    hours: 'Daily 11am-12am (varies by showtime)',
    county: 'Loudoun County',
    description: 'Premium dine-in theater experience. Features Kids Camp matinees where kids can be kids during family-friendly films.',
    cost: '$14-20/ticket',
    ageRange: 'All Ages (Kids Camp for families)',
    isFree: false,
    venueType: 'dine-in',
    features: ['dine-in', 'kids-camp', 'special-events', 'reserved-seating'],
  },

  // AFI SILVER THEATRE (Special programming)
  {
    name: 'AFI Silver Theatre and Cultural Center',
    address: '8633 Colesville Road',
    city: 'Silver Spring',
    state: 'MD',
    zipCode: '20910',
    latitude: 38.9938,
    longitude: -77.0288,
    phone: '(301) 495-6700',
    website: 'https://silver.afi.com',
    hours: 'Daily 12pm-10pm (varies by programming)',
    county: 'Montgomery County',
    description: 'Historic art deco theater operated by AFI. Features family matinees, classic films, and special kids programming. Great for introducing kids to film history.',
    cost: '$13-15/ticket, Member discounts',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'classic-films', 'family-matinees', 'historic', 'film-education'],
  },

  // ANGELIKA FILM CENTER
  {
    name: 'Angelika Film Center Mosaic',
    address: '2911 District Avenue',
    city: 'Fairfax',
    state: 'VA',
    zipCode: '22031',
    latitude: 38.8678,
    longitude: -77.2218,
    phone: '(571) 512-2939',
    website: 'https://www.angelikafilmcenter.com/mosaic',
    hours: 'Daily 10am-11pm (varies by showtime)',
    county: 'Fairfax County',
    description: 'Upscale theater showing independent and mainstream films. Offers family-friendly screenings and special kids events.',
    cost: '$13-17/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'independent-films', 'dine-in', 'reserved-seating', 'upscale'],
  },

  // LANDMARK THEATRES
  {
    name: 'Landmark E Street Cinema',
    address: '555 11th Street NW',
    city: 'Washington',
    state: 'DC',
    zipCode: '20004',
    latitude: 38.8958,
    longitude: -77.0278,
    phone: '(202) 452-7672',
    website: 'https://www.landmarktheatres.com/washington-d-c/e-street-cinema',
    hours: 'Daily 11am-11pm (varies by showtime)',
    county: 'District of Columbia',
    description: 'Downtown DC art house theater showing independent, foreign, and documentary films. Great for exposing kids to diverse cinema.',
    cost: '$13-16/ticket',
    ageRange: 'All Ages (film dependent)',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'independent-films', 'foreign-films', 'documentaries', 'metro-accessible'],
  },
  {
    name: 'Landmark Bethesda Row Cinema',
    address: '7235 Woodmont Avenue',
    city: 'Bethesda',
    state: 'MD',
    zipCode: '20814',
    latitude: 38.9828,
    longitude: -77.0958,
    phone: '(301) 652-7273',
    website: 'https://www.landmarktheatres.com/bethesda/bethesda-row-cinema',
    hours: 'Daily 11am-11pm (varies by showtime)',
    county: 'Montgomery County',
    description: 'Upscale Bethesda theater with premium seating. Shows mix of independent and mainstream family-friendly films.',
    cost: '$13-16/ticket',
    ageRange: 'All Ages (film dependent)',
    isFree: false,
    venueType: 'art-house',
    features: ['art-house', 'independent-films', 'upscale', 'metro-accessible'],
  },

  // IPIC (Premium family experience)
  {
    name: 'IPIC North Bethesda',
    address: '11830 Grand Park Avenue',
    city: 'North Bethesda',
    state: 'MD',
    zipCode: '20852',
    latitude: 39.0288,
    longitude: -77.1148,
    phone: '(301) 230-1800',
    website: 'https://www.ipic.com/north-bethesda',
    hours: 'Daily 11am-11pm (varies by showtime)',
    county: 'Montgomery County',
    description: 'Luxury dine-in theater with pod seating and full-service dining. Premium family experience for special occasions.',
    cost: '$18-30/ticket',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'luxury',
    features: ['luxury', 'dine-in', 'pod-seating', 'full-service', 'reserved-seating'],
  },

  // DRIVE-IN THEATERS (Seasonal family fun)
  {
    name: 'Bengies Drive-In Theatre',
    address: '3417 Eastern Boulevard',
    city: 'Middle River',
    state: 'MD',
    zipCode: '21220',
    latitude: 39.3318,
    longitude: -76.4178,
    phone: '(410) 687-5627',
    website: 'https://www.bengies.com',
    hours: 'Seasonal: Gates open 7pm, Movies at dusk',
    county: 'Baltimore County',
    description: 'Classic drive-in theater with the largest outdoor movie screen in America. Family-friendly atmosphere with double features. Kids under 11 free!',
    cost: '$12/adult, Kids under 11 free',
    ageRange: 'All Ages',
    isFree: false,
    venueType: 'drive-in',
    features: ['drive-in', 'double-features', 'largest-screen', 'kids-free', 'seasonal', 'snack-bar'],
  },

  // ==========================================
  // EASTERN US EXPANSION — MOVIE THEATERS
  // ==========================================

  // NEW YORK
  { name: 'AMC Empire 25 Manhattan', address: '234 W 42nd St', city: 'New York', state: 'NY', zipCode: '10036', latitude: 40.7569, longitude: -73.9875, phone: '(888) 262-4386', website: 'https://www.amctheatres.com/movie-theatres/new-york-ny/amc-empire-25', hours: 'Daily first show 10am, last show varies', county: 'New York County', description: 'AMC Empire 25 in Times Square with 25 screens, IMAX, Dolby Cinema, and family movies. Iconic Manhattan movie theater.', cost: '$15-25/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['imax', 'dolby', 'reserved-seating', 'family-films', 'matinees'] },
  { name: 'Alamo Drafthouse Brooklyn', address: '445 Albee Square W', city: 'Brooklyn', state: 'NY', zipCode: '11201', latitude: 40.6918, longitude: -73.9839, phone: '(718) 513-2547', website: 'https://www.drafthouse.com/brooklyn', hours: 'Daily first show 11am, last show varies', county: 'Kings County', description: 'Alamo Drafthouse in Downtown Brooklyn with dine-in movies, craft cocktails, and family matinees.', cost: '$12-24/ticket', ageRange: 'All Ages', isFree: false, venueType: 'dine-in', features: ['dine-in', 'reserved-seating', 'family-films', 'matinees', 'craft-food'] },

  // NEW JERSEY
  { name: 'AMC Deptford 8', address: '1750 Deptford Center Rd', city: 'Deptford', state: 'NJ', zipCode: '08096', latitude: 39.8326, longitude: -75.1074, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Gloucester County', description: 'AMC multiplex in South Jersey with 8 screens, family films, and matinee pricing.', cost: '$10-18/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['reserved-seating', 'family-films', 'matinees', 'recliners'] },

  // PENNSYLVANIA
  { name: 'AMC Philadelphia Mills 14', address: '1995 Franklin Mills Cir', city: 'Philadelphia', state: 'PA', zipCode: '19154', latitude: 40.0795, longitude: -74.9637, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Philadelphia County', description: 'AMC at Franklin Mills Mall with 14 screens, family films, and premium formats.', cost: '$10-20/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['imax', 'reserved-seating', 'family-films', 'matinees'] },
  { name: 'Regal Pittsburgh Waterfront', address: '300 W Waterfront Dr', city: 'West Homestead', state: 'PA', zipCode: '15120', latitude: 40.3977, longitude: -79.9004, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Allegheny County', description: 'Regal multiplex at Pittsburgh Waterfront with 22 screens, IMAX, RPX, and family movies.', cost: '$10-20/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['imax', 'rpx', 'reserved-seating', 'family-films', 'matinees'] },

  // CONNECTICUT
  { name: 'Cinemark Movies 14 Milford', address: '1255 Boston Post Rd', city: 'Milford', state: 'CT', zipCode: '06460', latitude: 41.2213, longitude: -73.0631, phone: '(203) 878-5003', website: 'https://www.cinemark.com', hours: 'Daily first show 10am', county: 'New Haven County', description: 'Cinemark multiplex in Milford CT with 14 screens, XD, and family movies at affordable prices.', cost: '$9-16/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['xd', 'reserved-seating', 'family-films', 'matinees', 'affordable'] },

  // MASSACHUSETTS
  { name: 'AMC Fenway 13 Boston', address: '401 Park Dr', city: 'Boston', state: 'MA', zipCode: '02215', latitude: 42.3465, longitude: -71.1001, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Suffolk County', description: 'AMC Fenway 13 in Boston with 13 screens, DINE-IN, Dolby Cinema, and family films near the Fenway neighborhood.', cost: '$13-22/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['dine-in', 'dolby', 'reserved-seating', 'family-films', 'matinees'] },
  { name: 'Showcase Cinemas Dedham', address: '950 Providence Hwy', city: 'Dedham', state: 'MA', zipCode: '02026', latitude: 42.2473, longitude: -71.1810, phone: '(781) 326-8100', website: 'https://www.showcasecinemas.com', hours: 'Daily first show 10am', county: 'Norfolk County', description: 'Showcase SuperLux dine-in theater south of Boston with premium seating, food service, and family screenings.', cost: '$12-22/ticket', ageRange: 'All Ages', isFree: false, venueType: 'dine-in', features: ['dine-in', 'reserved-seating', 'family-films', 'matinees', 'premium'] },

  // RHODE ISLAND
  { name: 'Showcase Cinemas Warwick', address: '1200 Bald Hill Rd', city: 'Warwick', state: 'RI', zipCode: '02886', latitude: 41.7048, longitude: -71.5198, phone: '(401) 821-8900', website: 'https://www.showcasecinemas.com', hours: 'Daily first show 10am', county: 'Kent County', description: 'Showcase Cinemas in Warwick RI with family films, premium formats, and matinee pricing.', cost: '$9-18/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['reserved-seating', 'family-films', 'matinees', 'concessions'] },

  // NEW HAMPSHIRE
  { name: 'Regal Fox Run Stadium 15', address: '45 Gosling Rd', city: 'Newington', state: 'NH', zipCode: '03801', latitude: 43.1012, longitude: -70.8209, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Rockingham County', description: 'Regal Fox Run Stadium with 15 screens, RPX, and family movies near Portsmouth NH.', cost: '$9-16/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['rpx', 'reserved-seating', 'family-films', 'matinees'] },

  // MAINE
  { name: 'Regal Cinemas Falmouth', address: '206 US Route 1', city: 'Falmouth', state: 'ME', zipCode: '04105', latitude: 43.7295, longitude: -70.2427, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Cumberland County', description: 'Regal Cinemas in Falmouth ME north of Portland with 10 screens, reserved seating, and family films.', cost: '$9-16/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['reserved-seating', 'family-films', 'matinees', 'concessions'] },

  // VERMONT
  { name: 'Palace 9 Cinemas South Burlington', address: '1 Dorset St', city: 'South Burlington', state: 'VT', zipCode: '05403', latitude: 44.4601, longitude: -73.1870, phone: '(802) 864-6969', website: 'https://www.palacetheatres.com', hours: 'Daily first show 11am', county: 'Chittenden County', description: 'Palace 9 Cinemas in South Burlington VT with 9 screens, family films, and convenient shopping mall location.', cost: '$8-14/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['reserved-seating', 'family-films', 'matinees', 'concessions'] },

  // DELAWARE
  { name: 'Regal Brandywine Town Center', address: '3700 Brandywine Pkwy', city: 'Wilmington', state: 'DE', zipCode: '19803', latitude: 39.7792, longitude: -75.5711, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'New Castle County', description: 'Regal Cinema at Brandywine Town Center in Wilmington DE with family films and premium formats.', cost: '$9-18/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['reserved-seating', 'family-films', 'matinees', 'rpx'] },

  // WEST VIRGINIA
  { name: 'Marquee Cinemas Morgantown', address: '9635 Mall Rd', city: 'Morgantown', state: 'WV', zipCode: '26501', latitude: 39.6521, longitude: -79.9272, phone: '(304) 598-9100', website: 'https://www.marqueecinemas.com', hours: 'Daily first show 11am', county: 'Monongalia County', description: 'Marquee Cinemas in Morgantown WV near WVU with family films and affordable matinee pricing.', cost: '$8-13/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['reserved-seating', 'family-films', 'matinees', 'affordable'] },

  // NORTH CAROLINA
  { name: 'AMC Carolina Pavilion 22 Charlotte', address: '9541 South Blvd', city: 'Charlotte', state: 'NC', zipCode: '28273', latitude: 35.1038, longitude: -80.8819, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Mecklenburg County', description: 'AMC 22-screen multiplex in Charlotte with IMAX, Dolby, and premium dine-in options. Family films and matinees.', cost: '$12-22/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['imax', 'dolby', 'dine-in', 'reserved-seating', 'family-films'] },
  { name: 'Regal Triangle Town Center Raleigh', address: '5901 Triangle Town Blvd', city: 'Raleigh', state: 'NC', zipCode: '27616', latitude: 35.8700, longitude: -78.5753, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Wake County', description: 'Regal multiplex in north Raleigh with 14 screens, RPX, and family movie options.', cost: '$10-18/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['rpx', 'reserved-seating', 'family-films', 'matinees'] },

  // SOUTH CAROLINA
  { name: 'Regal Hollywood Stadium 20 Greenville', address: '1 Rocky Creek Rd', city: 'Greenville', state: 'SC', zipCode: '29607', latitude: 34.8416, longitude: -82.3613, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Greenville County', description: 'Regal Hollywood Stadium with 20 screens and RPX in Greenville SC. Family films and matinee pricing.', cost: '$9-18/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['rpx', 'reserved-seating', 'family-films', 'matinees'] },

  // GEORGIA
  { name: 'AMC Phipps Plaza 14 Atlanta', address: '3500 Peachtree Rd NE', city: 'Atlanta', state: 'GA', zipCode: '30326', latitude: 33.8490, longitude: -84.3634, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Fulton County', description: 'AMC dine-in theater at Phipps Plaza in Atlanta with 14 screens, DINE-IN, and Dolby Cinema.', cost: '$13-24/ticket', ageRange: 'All Ages', isFree: false, venueType: 'dine-in', features: ['dine-in', 'dolby', 'reserved-seating', 'family-films', 'matinees'] },

  // FLORIDA
  { name: 'AMC Universal Cineplex 20 Orlando', address: '6000 Universal Blvd', city: 'Orlando', state: 'FL', zipCode: '32819', latitude: 28.4751, longitude: -81.4665, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Orange County', description: 'AMC 20-screen multiplex at Universal Studios in Orlando with IMAX, Dolby, and family films.', cost: '$13-24/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['imax', 'dolby', 'dine-in', 'reserved-seating', 'family-films'] },
  { name: 'Regal Sawgrass Stadium Fort Lauderdale', address: '12801 W Sunrise Blvd', city: 'Sunrise', state: 'FL', zipCode: '33323', latitude: 26.1516, longitude: -80.3259, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Broward County', description: 'Regal Sawgrass Stadium with 23 screens and RPX near Fort Lauderdale FL. Family films and matinee pricing.', cost: '$10-20/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['rpx', 'reserved-seating', 'family-films', 'matinees'] },

  // ALABAMA
  { name: 'Regal Hollywood Stadium 18 Huntsville', address: '11250 County Line Rd', city: 'Madison', state: 'AL', zipCode: '35758', latitude: 34.7151, longitude: -86.7529, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Madison County', description: 'Regal Hollywood Stadium near Huntsville AL with 18 screens, RPX, and family movie options.', cost: '$9-16/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['rpx', 'reserved-seating', 'family-films', 'matinees'] },

  // MISSISSIPPI
  { name: 'Malco Grandview Cinema Madison', address: '855 Grandview Blvd', city: 'Madison', state: 'MS', zipCode: '39110', latitude: 32.4546, longitude: -90.1160, phone: '(601) 898-2500', website: 'https://www.malco.com', hours: 'Daily first show 10am', county: 'Madison County', description: 'Malco Grandview Cinema in Madison MS near Jackson with 14 screens, SuperScreen DLX, and family films.', cost: '$9-15/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['superscreen', 'reserved-seating', 'family-films', 'matinees'] },

  // TENNESSEE
  { name: 'AMC Thoroughbred 20 Nashville', address: '624 Frazier Dr', city: 'Franklin', state: 'TN', zipCode: '37067', latitude: 35.9658, longitude: -86.8490, phone: '(888) 262-4386', website: 'https://www.amctheatres.com', hours: 'Daily first show 10am', county: 'Williamson County', description: 'AMC Thoroughbred 20 in Franklin TN near Nashville with Dolby Cinema, DINE-IN, and family films.', cost: '$12-22/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['dolby', 'dine-in', 'reserved-seating', 'family-films', 'matinees'] },

  // KENTUCKY
  { name: 'Regal Hamburg Pavilion Louisville', address: '2285 Sir Barton Way', city: 'Lexington', state: 'KY', zipCode: '40509', latitude: 38.0012, longitude: -84.4289, phone: '(844) 462-7342', website: 'https://www.regmovies.com', hours: 'Daily first show 10am', county: 'Fayette County', description: 'Regal Hamburg Pavilion in Lexington KY with 16 screens, RPX, and family films.', cost: '$9-16/ticket', ageRange: 'All Ages', isFree: false, venueType: 'multiplex', features: ['rpx', 'reserved-seating', 'family-films', 'matinees'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCategory(venueType) {
  const categories = {
    'multiplex': { category: 'Indoor', subcategory: 'Movie Theater' },
    'dine-in': { category: 'Indoor', subcategory: 'Dine-In Theater' },
    'art-house': { category: 'Indoor', subcategory: 'Art House Cinema' },
    'luxury': { category: 'Indoor', subcategory: 'Luxury Theater' },
    'drive-in': { category: 'Outdoor', subcategory: 'Drive-In Theater' },
  };
  return categories[venueType] || { category: 'Indoor', subcategory: 'Movie Theater' };
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
      source: 'movie-theaters-dmv',
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
      hasSensoryFriendly: location.features.includes('sensory-friendly'),
      hasIMAX: location.features.includes('imax'),
      hasDineIn: location.features.includes('dine-in'),
      hasKidsPrograms: location.features.includes('kids-camp') || location.features.includes('summer-movies'),
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

async function scrapeMovieTheatersDMV() {
  console.log(`\n🎬 MOVIE THEATERS DMV ACTIVITIES SCRAPER`);
  console.log(`📍 Region: MD, VA, DC`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const allActivities = [];

  console.log('\n🎬 Processing Movie Theaters...');

  // Group by state
  // Group by state — handles all eastern states
  const stateGroups = {};
  for (const venue of MOVIE_THEATERS) {
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
  console.log(`✅ MOVIE THEATERS DMV SCRAPER COMPLETE`);
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

async function scrapeMovieTheatersDMVCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeMovieTheatersDMV();
}

if (require.main === module) {
  console.log('\n🚀 Starting Movie Theaters DMV Scraper');
  scrapeMovieTheatersDMV()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeMovieTheatersDMV,
  scrapeMovieTheatersDMVCloudFunction,
};
