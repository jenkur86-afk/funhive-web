#!/usr/bin/env node

/**
 * ADD SUMMER OUTDOOR FAMILY EVENTS — April–August 2026
 *
 * Imports:
 *   1. Spring festivals & cultural events (April–May)
 *   2. Free outdoor concert & movie series (June–August)
 *   3. July 4th celebrations & summer festivals
 *   4. County & state fairs (July–August)
 *   5. Splash pads & water play (seasonal)
 *   6. Maryland Renaissance Festival & late-summer events
 *
 * Usage:
 *   node add-summer-outdoor-events-2026.js          # Run full import
 *   node add-summer-outdoor-events-2026.js --dry-run # Preview without saving
 */

const ngeohash = require('ngeohash');
const { admin, db } = require('../../scrapers/helpers/supabase-adapter');
const { getOrCreateActivity } = require('../../scrapers/venue-matcher');

const SCRAPER_NAME = 'Summer-Outdoor-Events-2026';

// ==========================================
// 1. SPRING FESTIVALS & CULTURAL EVENTS
// ==========================================

const SPRING_FESTIVALS = [
  { name: 'National Cherry Blossom Festival', address: '1250 Maryland Ave SW', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8814, longitude: -77.0365, website: 'https://nationalcherryblossomfestival.org', description: 'Annual celebration of the blooming cherry blossom trees along the Tidal Basin. Includes the Blossom Kite Festival, parade, fireworks, and family activities across DC. Free to attend most events.', cost: 'Free (most events)', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'March 20 - April 12, 2026' },
  { name: 'Sakura Matsuri Japanese Street Festival', address: '1300 Pennsylvania Ave NW', city: 'Washington', state: 'DC', zipCode: '20004', latitude: 38.8952, longitude: -77.0289, website: 'https://sakuramatsuri.org', description: 'Largest one-day Japanese cultural event in the US, held during the Cherry Blossom Festival. Traditional and modern Japanese performances, martial arts demos, Japanese street food, cosplay, and kids\' activities.', cost: '$10-15', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, dates: 'April 11, 2026' },
  { name: 'Maryland International Kite Expo', address: '200 S Baltimore Ave', city: 'Ocean City', state: 'MD', zipCode: '21842', latitude: 38.3365, longitude: -75.0849, website: 'https://kiteloft.com', description: 'Massive kite festival on the Ocean City beach and boardwalk. Professional kite flyers, giant show kites, free kite-making workshops for kids, and indoor kite-flying demos.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'April 24-26, 2026' },
  { name: 'Petalpalooza at The Wharf', address: '760 Maine Ave SW', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8783, longitude: -77.0238, website: 'https://www.wharfdc.com', description: 'Free Cherry Blossom Festival event at The Wharf. Live music on multiple stages, kids\' activities, food vendors, and culminates in a spectacular fireworks show over the Potomac.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'April 2026' },
  { name: 'Nationals Pups in the Park', address: '1500 S Capitol St SE', city: 'Washington', state: 'DC', zipCode: '20003', latitude: 38.8730, longitude: -77.0074, website: 'https://www.mlb.com/nationals', description: 'Dog-friendly baseball game at Nationals Park. Bring your pup to the game, enjoy special doggy areas, photo ops, and watch baseball together. Fun for the whole family including furry members.', cost: '$20-40/ticket', ageRange: 'All Ages', isFree: false, type: 'sporting-event', isIndoor: false, dates: 'April 7, 2026' },
  { name: 'Shenandoah Apple Blossom Festival', address: '135 N Cameron St', city: 'Winchester', state: 'VA', zipCode: '22601', latitude: 39.1857, longitude: -78.1633, website: 'https://thebloom.com', description: 'Ten-day festival celebrating spring in the Shenandoah Valley. Grand Feature Parade, carnival rides, live entertainment, arts & crafts, kids\' activities, and apple-themed treats. Since 1927.', cost: 'Free-$15', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, dates: 'April 24 - May 3, 2026' },
  { name: 'Maryland Sheep & Wool Festival', address: '2210 Fairgrounds Rd', city: 'West Friendship', state: 'MD', zipCode: '21794', latitude: 39.2937, longitude: -76.9494, website: 'https://sheepandwool.org', description: 'Annual fiber arts festival at the Howard County Fairgrounds. Over 275 vendors, sheep shearing demos, sheep dog herding, lamb petting area, fleece show, kids\' crafts, and farm animals.', cost: '$5-10', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, dates: 'May 2-3, 2026' },
  { name: 'Preakness Stakes InfieldFest', address: '5201 Park Heights Ave', city: 'Baltimore', state: 'MD', zipCode: '21215', latitude: 39.3490, longitude: -76.6497, website: 'https://www.preakness.com', description: 'Iconic horse race and festival. Family-friendly infield area with live music, food, and the excitement of Triple Crown horse racing at Pimlico Race Course.', cost: '$60-100+', ageRange: 'All Ages', isFree: false, type: 'sporting-event', isIndoor: false, dates: 'May 16, 2026' },
];

// ==========================================
// 2. FREE OUTDOOR CONCERT & MOVIE SERIES
// ==========================================

const OUTDOOR_ENTERTAINMENT = [
  { name: 'District Wharf Free Wednesday Concerts', address: '760 Maine Ave SW', city: 'Washington', state: 'DC', zipCode: '20024', latitude: 38.8783, longitude: -77.0238, website: 'https://www.wharfdc.com', description: 'Free live music every Wednesday evening at The Wharf\'s Transit Pier. Enjoy waterfront concerts with a variety of genres from local and regional artists. Family-friendly atmosphere with nearby restaurants.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'concert-series', isIndoor: false, dates: 'June-August 2026, Wednesdays' },
  { name: 'Movies on the Potomac at National Harbor', address: '165 Waterfront St', city: 'National Harbor', state: 'MD', zipCode: '20745', latitude: 38.7826, longitude: -77.0164, website: 'https://www.nationalharbor.com', description: 'Free outdoor movies by the waterfront at National Harbor. Family-friendly films shown on a giant screen on the Plaza. Bring blankets and chairs. Food and snacks available from nearby restaurants.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'outdoor-movies', isIndoor: false, dates: 'June-September 2026, Thursdays & Sundays' },
  { name: 'Mosaic District Strawberry Park Movies', address: '2910 District Ave', city: 'Fairfax', state: 'VA', zipCode: '22031', latitude: 38.8641, longitude: -77.2346, website: 'https://www.mosaicdistrict.com', description: 'Free outdoor movie screenings in Strawberry Park at Mosaic District. Family-friendly films on a big screen in the park. Arrive early for a good spot — bring your own seating.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'outdoor-movies', isIndoor: false, dates: 'June-August 2026' },
  { name: 'Mosaic District Saturday Concerts', address: '2910 District Ave', city: 'Fairfax', state: 'VA', zipCode: '22031', latitude: 38.8641, longitude: -77.2346, website: 'https://www.mosaicdistrict.com', description: 'Free live music every Saturday in Strawberry Park. Local bands and musicians perform a mix of genres perfect for a family outing with shopping and dining nearby.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'concert-series', isIndoor: false, dates: 'June-August 2026, Saturdays' },
  { name: 'Salute the Sunset Concerts at National Harbor', address: '165 Waterfront St', city: 'National Harbor', state: 'MD', zipCode: '20745', latitude: 38.7826, longitude: -77.0164, website: 'https://www.nationalharbor.com', description: 'Free Saturday evening military band concerts at National Harbor. US military bands perform patriotic and popular music as the sun sets over the Potomac. Family-friendly with picnic atmosphere.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'concert-series', isIndoor: false, dates: 'May-September 2026, Saturdays' },
  { name: 'Bethesda Outdoor Movies', address: '7700 Woodmont Ave', city: 'Bethesda', state: 'MD', zipCode: '20814', latitude: 39.0001, longitude: -77.0970, website: 'https://www.bethesda.org', description: 'Free outdoor movie screenings in downtown Bethesda. Family-friendly films on select summer evenings. Bring blankets and lawn chairs — food trucks and nearby restaurants available.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'outdoor-movies', isIndoor: false, dates: 'June-August 2026' },
  { name: 'Movies in the Parks - Rockville', address: '603 Edmonston Dr', city: 'Rockville', state: 'MD', zipCode: '20851', latitude: 39.0840, longitude: -77.1528, website: 'https://www.rockvillemd.gov', description: 'Free outdoor movie screenings at various Rockville parks. Family-friendly films shown at dusk. Bring blankets and chairs. Different park locations throughout the summer.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'outdoor-movies', isIndoor: false, dates: 'June-August 2026' },
  { name: 'Movies Under the Moon - Fairfax County', address: '12055 Government Center Pkwy', city: 'Fairfax', state: 'VA', zipCode: '22035', latitude: 38.8532, longitude: -77.3560, website: 'https://www.fairfaxcounty.gov/parks', description: 'Free outdoor movies at parks throughout Fairfax County. Family-friendly films shown after sunset. Different locations each week — check schedule for nearest showing.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'outdoor-movies', isIndoor: false, dates: 'June-August 2026' },
  { name: 'US Army Twilight Tattoo', address: '201 Lee Ave', city: 'Arlington', state: 'VA', zipCode: '22211', latitude: 38.8787, longitude: -77.0823, website: 'https://twilight.mdw.army.mil', description: 'Free military pageant featuring The US Army Band, The US Army Drill Team, The Old Guard Fife and Drum Corps, and more. Impressive displays of precision, history, and patriotism on Wednesday evenings.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'concert-series', isIndoor: false, dates: 'June-August 2026, Wednesdays' },
  { name: 'National Harbor Kids Activities', address: '165 Waterfront St', city: 'National Harbor', state: 'MD', zipCode: '20745', latitude: 38.7826, longitude: -77.0164, website: 'https://www.nationalharbor.com', description: 'Free kids\' programming at National Harbor every Tuesday morning. Storytime, crafts, interactive activities, and family fun on the waterfront. Perfect for toddlers and preschoolers.', cost: 'Free', ageRange: 'Ages 2-8', isFree: true, type: 'kids-program', isIndoor: false, dates: 'June-August 2026, Tuesdays 10:30am' },
];

// ==========================================
// 3. JULY 4TH & SUMMER FESTIVALS
// ==========================================

const SUMMER_FESTIVALS = [
  { name: 'Smithsonian Folklife Festival', address: 'National Mall', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8893, longitude: -77.0230, website: 'https://festival.si.edu', description: 'Free annual cultural festival on the National Mall featuring music, dance, artisan demos, storytelling, cooking demos, and hands-on activities. Celebrates living cultural heritage from communities around the world.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'July 2-7, 2026' },
  { name: 'July 4th on the National Mall', address: 'National Mall', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8893, longitude: -77.0350, website: 'https://www.nps.gov/nama', description: 'America\'s 250th birthday celebration! The National Independence Day Parade down Constitution Ave, A Capitol Fourth concert on the West Lawn, and spectacular fireworks over the Washington Monument. Bigger than ever for the semiquincentennial.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'holiday-event', isIndoor: false, dates: 'July 4, 2026' },
  { name: 'Mount Vernon Independence Day Celebration & Fireworks', address: '3200 Mount Vernon Memorial Hwy', city: 'Mount Vernon', state: 'VA', zipCode: '22121', latitude: 38.7093, longitude: -77.0861, phone: '(703) 780-2000', website: 'https://www.mountvernon.org', description: 'Daytime festivities at George Washington\'s Mount Vernon including military reenactments, Declaration of Independence reading, and evening fireworks over the Potomac. Unique historical setting for July 4th.', cost: '$30-36/adult, $18-20/child', ageRange: 'All Ages', isFree: false, type: 'holiday-event', isIndoor: false, dates: 'July 4, 2026' },
  { name: 'National Archives July 4th Family Activities', address: '700 Pennsylvania Ave NW', city: 'Washington', state: 'DC', zipCode: '20408', latitude: 38.8927, longitude: -77.0230, website: 'https://www.archives.gov', description: 'Free family-friendly Independence Day event at the National Archives. Public reading of the Declaration of Independence, patriotic performances, kids\' activities, and historical exhibits at the home of the original document.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'holiday-event', isIndoor: false, dates: 'July 4, 2026' },
  { name: 'Columbia Festival of the Arts LakeFest', address: '10275 Wincopin Cir', city: 'Columbia', state: 'MD', zipCode: '21044', latitude: 39.2037, longitude: -76.8610, website: 'https://www.columbiafestival.org', description: 'Free lakeside arts festival at the Columbia Lakefront. Live music on multiple stages, kids\' activities, interactive art, dance performances, food, and fireworks. A beloved community tradition.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 12-14, 2026' },
  { name: 'Maryland Renaissance Festival', address: '1821 Crownsville Rd', city: 'Annapolis', state: 'MD', zipCode: '21401', latitude: 39.0292, longitude: -76.6093, phone: '(410) 266-7304', website: 'https://www.rennfest.com', description: 'Step into a 16th-century English village! Jousting, live entertainment on 10 stages, craft demonstrations, Renaissance food, artisan marketplace, and family-friendly shows. One of the nation\'s largest Renaissance fairs.', cost: '$30/adult, $15/child', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, dates: 'Late August - October 2026' },
];

// ==========================================
// 4. COUNTY & STATE FAIRS
// ==========================================

const FAIRS = [
  { name: 'Delaware State Fair', address: '18500 S DuPont Hwy', city: 'Harrington', state: 'DE', zipCode: '19952', latitude: 38.9227, longitude: -75.5803, phone: '(302) 398-3269', website: 'https://delawarestatefair.com', description: 'Ten-day state fair with carnival rides, live concerts, livestock shows, demolition derbies, pig races, agricultural exhibits, and family entertainment. One of the oldest state fairs on the East Coast.', cost: '$8-12/person', ageRange: 'All Ages', isFree: false, type: 'fair', isIndoor: false, dates: 'July 23 - August 1, 2026' },
  { name: 'Talbot County Fair', address: '8780 Ocean Gateway', city: 'Easton', state: 'MD', zipCode: '21601', latitude: 38.7630, longitude: -76.0254, website: 'https://talbotcountyfair.org', description: 'Classic Eastern Shore county fair with carnival rides, livestock exhibits, tractor pulls, live music, 4-H competitions, fair food, and family-friendly entertainment.', cost: '$5-10/person', ageRange: 'All Ages', isFree: false, type: 'fair', isIndoor: false, dates: 'July 9-11, 2026' },
  { name: 'Harford County Farm Fair', address: '501 Tollgate Rd', city: 'Bel Air', state: 'MD', zipCode: '21014', latitude: 39.5389, longitude: -76.3574, website: 'https://www.harfordcountyfarmfair.org', description: 'Week-long agricultural fair with carnival rides, livestock shows, tractor pulls, demolition derby, pig scrambles, farm exhibits, and plenty of fair food and entertainment.', cost: '$5-10/person', ageRange: 'All Ages', isFree: false, type: 'fair', isIndoor: false, dates: 'July 18-25, 2026' },
  { name: 'Garrett County Agricultural Fair', address: '292 S 4th St', city: 'McHenry', state: 'MD', zipCode: '21541', latitude: 39.5605, longitude: -79.3746, website: 'https://garrettcountyfair.org', description: 'Traditional Western Maryland fair with carnival midway, livestock judging, horse and pony shows, tractor pulls, demolition derby, and mountain-country entertainment in beautiful Garrett County.', cost: '$5-10/person', ageRange: 'All Ages', isFree: false, type: 'fair', isIndoor: false, dates: 'July 25 - August 1, 2026' },
  { name: 'Howard County Fair', address: '2210 Fairgrounds Rd', city: 'West Friendship', state: 'MD', zipCode: '21794', latitude: 39.2937, longitude: -76.9494, phone: '(410) 442-1022', website: 'https://www.howardcountyfair.com', description: 'Family-friendly county fair with carnival rides, livestock exhibits, local food, live entertainment, and agricultural displays. Fun for all ages in the heart of Howard County.', cost: '$8-12/person', ageRange: 'All Ages', isFree: false, type: 'fair', isIndoor: false, dates: 'August 8-15, 2026' },
  { name: 'Maryland State Fair', address: '2200 York Rd', city: 'Timonium', state: 'MD', zipCode: '21093', latitude: 39.4343, longitude: -76.6199, phone: '(410) 252-0200', website: 'https://www.marylandstatefair.com', description: 'Maryland\'s biggest fair with carnival rides, livestock competitions, horse racing, live music, agricultural exhibits, midway games, and classic fair food. A late-summer tradition since 1878.', cost: '$10-15/person', ageRange: 'All Ages', isFree: false, type: 'fair', isIndoor: false, dates: 'August 27 - September 7, 2026' },
];

// ==========================================
// 5. SPLASH PADS & WATER PLAY
// ==========================================

const SPLASH_PADS = [
  // --- Montgomery County, MD (Free) ---
  { name: 'Wheaton Regional Park Splash Playground', address: '2002 Shorefield Rd', city: 'Wheaton', state: 'MD', zipCode: '20902', latitude: 39.0547, longitude: -77.0488, website: 'https://www.montgomeryparks.org', description: 'Free splash playground in Wheaton Regional Park with water jets, sprayers, and water play features. Adjacent to playground and picnic areas. Open seasonally Memorial Day through Labor Day.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'South Germantown Splash Park', address: '18041 Central Park Cir', city: 'Boyds', state: 'MD', zipCode: '20841', latitude: 39.1732, longitude: -77.2609, website: 'https://www.montgomeryparks.org', description: 'Free splash park with interactive water features, spray jets, and a water play area for kids. Located next to the South Germantown Recreational Park with mini-golf and playgrounds.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Rockville Town Square Splash Pad', address: '200 E Middle Ln', city: 'Rockville', state: 'MD', zipCode: '20850', latitude: 39.0842, longitude: -77.1500, website: 'https://www.rockvilletownsquare.com', description: 'Free splash pad fountain in the heart of Rockville Town Square. Kids play in choreographed water jets surrounded by restaurants and shops. Perfect for a quick cool-down during shopping trips.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },

  // --- Prince George's County, MD ---
  { name: 'Watkins Regional Park Splash Pad', address: '301 Watkins Park Dr', city: 'Upper Marlboro', state: 'MD', zipCode: '20774', latitude: 38.8799, longitude: -76.7960, website: 'https://www.pgparks.com', description: 'Splash pad at Watkins Regional Park near the carousel, mini-train, and playground. Great add-on to a day at the park with Old Maryland Farm and nature center nearby.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Glenn Dale Splash Park', address: '11901 Glenn Dale Blvd', city: 'Glenn Dale', state: 'MD', zipCode: '20769', latitude: 38.9864, longitude: -76.8195, website: 'https://www.pgparks.com', description: 'Community splash park with spray features and water play area. Open seasonally for neighborhood families looking to cool off on hot summer days.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },

  // --- Virginia ---
  { name: 'Clemyjontri Park Splash Pad', address: '6317 Georgetown Pike', city: 'McLean', state: 'VA', zipCode: '22101', latitude: 38.9579, longitude: -77.1762, website: 'https://www.fairfaxcounty.gov/parks/clemyjontri', description: 'Universally accessible splash pad at the beloved Clemyjontri Park. Water play features designed for children of all abilities. Connected to the amazing all-inclusive playground with swings, carousel, and more.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Lee District Park Splash Pad', address: '6601 Telegraph Rd', city: 'Franconia', state: 'VA', zipCode: '22310', latitude: 38.7697, longitude: -77.0957, website: 'https://www.fairfaxcounty.gov/parks/lee-district', description: 'Splash pad with interactive water features at Lee District Park. Adjacent to playground, volleyball courts, and walking trails. Open seasonally for summer fun.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Fairfax Corner Splash Pad', address: '11900 Palace Way', city: 'Fairfax', state: 'VA', zipCode: '22030', latitude: 38.8573, longitude: -77.3706, website: 'https://www.fairfaxcorner.com', description: 'Interactive splash pad with ground-level jets at Fairfax Corner shopping center. Kids run through choreographed water sprays while parents relax nearby. Dining and shopping steps away.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Dulles Town Center Splash Pad', address: '21100 Dulles Town Cir', city: 'Dulles', state: 'VA', zipCode: '20166', latitude: 39.0367, longitude: -77.4180, website: 'https://www.shopdustc.com', description: 'Outdoor splash pad area near the Dulles Town Center mall. Interactive water jets and sprayers perfect for a summer cool-down during a family shopping trip.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'One Loudoun Splash Pad', address: '20366 Exchange St', city: 'Ashburn', state: 'VA', zipCode: '20147', latitude: 39.0493, longitude: -77.4635, website: 'https://www.oneloudoun.com', description: 'Interactive splash pad at the One Loudoun town center. Ground-level water jets and spray features in a walkable mixed-use area with restaurants, shops, and a playground.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Canal Park Ice Rink & Splash Pad', address: '200 M St SE', city: 'Washington', state: 'DC', zipCode: '20003', latitude: 38.8763, longitude: -77.0038, website: 'https://www.canalparkdc.org', description: 'Converts from ice rink in winter to splash pad and fountain park in summer. Interactive water features in the Navy Yard neighborhood near Nationals Park. Open daily in summer.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Georgetown Waterfront Park Fountain', address: '3303 Water St NW', city: 'Washington', state: 'DC', zipCode: '20007', latitude: 38.9020, longitude: -77.0630, website: 'https://www.georgetownwaterfrontpark.org', description: 'Interactive fountain along the Georgetown Waterfront where kids splash and play in shooting water jets. Beautiful Potomac River views, walkways, and nearby Georgetown shops and restaurants.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
  { name: 'Yards Park Splash Pad', address: '355 Water St SE', city: 'Washington', state: 'DC', zipCode: '20003', latitude: 38.8754, longitude: -76.9972, website: 'https://www.yardspark.org', description: 'Large splash pad and wading canal at Yards Park in the Navy Yard. Kids play in the interactive fountains and wade in the canal water feature. Adjacent to playground, lawn, and boardwalk along the Anacostia River.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'splash-pad', isIndoor: false, dates: 'Memorial Day - Labor Day' },
];

// ==========================================
// 6. ADDITIONAL SUMMER EVENTS
// ==========================================

const MORE_SUMMER_EVENTS = [
  { name: 'Earth Day at the National Mall', address: 'National Mall', city: 'Washington', state: 'DC', zipCode: '20560', latitude: 38.8893, longitude: -77.0230, website: 'https://www.earthday.org', description: 'Earth Day celebrations on the National Mall with environmental exhibits, science demos, kids\' activities, live performances, and eco-friendly vendor marketplace. Free family-friendly event celebrating sustainability.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'April 22, 2026' },
  { name: 'Fiesta Asia Street Fair', address: '1300 Pennsylvania Ave NW', city: 'Washington', state: 'DC', zipCode: '20004', latitude: 38.8952, longitude: -77.0289, website: 'https://fiestaasia.org', description: 'Vibrant celebration of Asian American and Pacific Islander heritage. Performances, food vendors, cultural exhibitions, and kids\' activities. One of the largest AAPI cultural events in the DMV.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'May 2026' },
  { name: 'Celebrate Fairfax Festival', address: '12000 Government Center Pkwy', city: 'Fairfax', state: 'VA', zipCode: '22035', latitude: 38.8530, longitude: -77.3560, website: 'https://www.celebratefairfax.com', description: 'Fairfax County\'s largest community-wide event. Live music on multiple stages, carnival rides, craft vendors, Fairfax County exhibits, fireworks, and a huge kids\' zone with inflatables and activities.', cost: '$10-15', ageRange: 'All Ages', isFree: false, type: 'festival', isIndoor: false, dates: 'June 2026' },
  { name: 'Capital Pride Festival', address: '1300 Pennsylvania Ave NW', city: 'Washington', state: 'DC', zipCode: '20004', latitude: 38.8952, longitude: -77.0289, website: 'https://www.capitalpride.org', description: 'Colorful Pride parade down Pennsylvania Avenue followed by a festival with live entertainment, food, vendors, and community booths. Family-friendly with a dedicated family area and kids\' activities.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 2026' },
  { name: 'Fourth of July Fireworks at Old Town Alexandria', address: '100 Madison St', city: 'Alexandria', state: 'VA', zipCode: '22314', latitude: 38.8065, longitude: -77.0399, website: 'https://www.visitalexandriava.com', description: 'Alexandria\'s waterfront July 4th celebration along the Potomac. Family-friendly festivities, live music, and a spectacular fireworks display over the river. Bring blankets and chairs for the best views.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'holiday-event', isIndoor: false, dates: 'July 4, 2026' },
  { name: 'Annapolis Fourth of July Celebration', address: 'City Dock', city: 'Annapolis', state: 'MD', zipCode: '21401', latitude: 38.9784, longitude: -76.4922, website: 'https://www.visitannapolis.org', description: 'Annapolis\'s Independence Day celebration along the harbor. Live music, food vendors, family activities, and fireworks over the Chesapeake Bay. Arrive early for waterfront seating.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'holiday-event', isIndoor: false, dates: 'July 4, 2026' },
  { name: 'Silver Spring World Heritage Festival', address: '1 Veterans Pl', city: 'Silver Spring', state: 'MD', zipCode: '20910', latitude: 39.0066, longitude: -77.0333, website: 'https://www.silverspringtown.com', description: 'Free multicultural celebration in downtown Silver Spring featuring music and dance from around the world, international food, kids\' activities, cultural exhibits, and artisan vendors.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'festival', isIndoor: false, dates: 'June 2026' },
  { name: 'Baltimore Fourth of July Celebration', address: '301 E Pratt St', city: 'Baltimore', state: 'MD', zipCode: '21202', latitude: 39.2858, longitude: -76.6094, website: 'https://www.baltimore.org', description: 'Inner Harbor Independence Day celebration with live entertainment, food vendors, family activities, and a massive fireworks display over the harbor. Free admission to the waterfront festivities.', cost: 'Free', ageRange: 'All Ages', isFree: true, type: 'holiday-event', isIndoor: false, dates: 'July 4, 2026' },
];


// ==========================================
// Category mapping
// ==========================================
function getCategory(venue) {
  const map = {
    'festival': { category: 'Events', subcategory: 'Festival' },
    'sporting-event': { category: 'Events', subcategory: 'Sporting Event' },
    'concert-series': { category: 'Events', subcategory: 'Free Concert Series' },
    'outdoor-movies': { category: 'Events', subcategory: 'Outdoor Movies' },
    'kids-program': { category: 'Events', subcategory: 'Kids Program' },
    'holiday-event': { category: 'Events', subcategory: 'Holiday Celebration' },
    'fair': { category: 'Events', subcategory: 'County/State Fair' },
    'splash-pad': { category: 'Outdoor', subcategory: 'Splash Pad & Water Play' },
  };
  return map[venue.type] || { category: 'Events', subcategory: 'Outdoor Event' };
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
      source: 'summer-outdoor-events-2026',
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

  console.log(`\n☀️  SUMMER OUTDOOR EVENTS 2026 — April through August`);
  console.log(`📍 Coverage: DC, MD, VA, DE`);
  console.log('='.repeat(60));
  if (isDryRun) console.log('🏃 DRY RUN MODE\n');

  const startTime = Date.now();
  const allActivities = [];

  const sections = [
    { label: '🌸 Spring Festivals & Cultural Events', data: SPRING_FESTIVALS },
    { label: '🎵 Free Outdoor Concerts & Movies', data: OUTDOOR_ENTERTAINMENT },
    { label: '🎆 July 4th & Summer Festivals', data: SUMMER_FESTIVALS },
    { label: '🎡 County & State Fairs', data: FAIRS },
    { label: '💦 Splash Pads & Water Play', data: SPLASH_PADS },
    { label: '🎉 Additional Summer Events', data: MORE_SUMMER_EVENTS },
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
    for (const a of allActivities.slice(0, 10)) console.log(`  - ${a.name} [${a.category} > ${a.subcategory}] (${a.state}) ${a.isFree ? '🆓' : a.cost}`);
    if (allActivities.length > 10) console.log(`  ... and ${allActivities.length - 10} more`);
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
