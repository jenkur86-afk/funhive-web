#!/usr/bin/env node

/**
 * BOTANICAL GARDENS & NATURE CENTERS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for botanical gardens, arboretums, nature centers,
 * and wildlife sanctuaries across all 28 eastern US states.
 *
 * Multi-strategy scraping per venue:
 *   1. Try WordPress REST API: {url}/wp-json/tribe/events/v1/events/ (The Events Calendar plugin)
 *   2. Fall back to Puppeteer HTML scraping for event listing pages
 *   3. Look for common event card patterns: .tribe-events-list, .event-card, .upcoming-events
 *
 * Coverage: 28 states (~80-120 venues)
 *
 * Usage:
 *   node scrapers/scraper-gardens-nature-eastern.js                    # All states
 *   node scrapers/scraper-gardens-nature-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-gardens-nature-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-gardens-nature-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeGardensNatureCloudFunction
 * Registry: Group 2
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'Gardens-Nature-Eastern';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(gun\s*show|beer\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|burlesque|tattoo\s*convention|cannabis|hemp\s*fest|cigar|whiskey|vodka|tequila|happy\s*hour|nightclub|strip\s*club|lingerie|singles\s*night)\b/i;

// ==========================================
// VENUES CONFIG (~80-120 botanical gardens, arboretums, and nature centers)
// ==========================================
const VENUES = [
  // Alabama
  { name: 'Birmingham Botanical Gardens', url: 'https://www.bbgardens.org', eventsUrl: 'https://www.bbgardens.org/events', city: 'Birmingham', state: 'AL', platform: 'custom' },
  { name: 'Huntsville Botanical Garden', url: 'https://hsvbg.org', eventsUrl: 'https://hsvbg.org/events/', city: 'Huntsville', state: 'AL', platform: 'wordpress' },
  { name: 'Mobile Botanical Gardens', url: 'https://www.mobilebotanicalgardens.org', eventsUrl: 'https://www.mobilebotanicalgardens.org/events/', city: 'Mobile', state: 'AL', platform: 'wordpress' },
  { name: 'Aldridge Botanical Gardens', url: 'https://www.aldridgegardens.com', eventsUrl: 'https://www.aldridgegardens.com/events/', city: 'Hoover', state: 'AL', platform: 'wordpress' },

  // Connecticut
  { name: 'Connecticut College Arboretum', url: 'https://www.conncoll.edu/the-arboretum/', eventsUrl: 'https://www.conncoll.edu/the-arboretum/events/', city: 'New London', state: 'CT', platform: 'custom' },
  { name: 'Bartlett Arboretum', url: 'https://www.bartlettarboretum.org', eventsUrl: 'https://www.bartlettarboretum.org/events', city: 'Stamford', state: 'CT', platform: 'wordpress' },
  { name: 'Roaring Brook Nature Center', url: 'https://www.roaringbrook.org', eventsUrl: 'https://www.roaringbrook.org/programs-events/', city: 'Canton', state: 'CT', platform: 'custom' },

  // DC
  { name: 'United States Botanic Garden', url: 'https://www.usbg.gov', eventsUrl: 'https://www.usbg.gov/programs-and-events', city: 'Washington', state: 'DC', platform: 'custom' },
  { name: 'United States National Arboretum', url: 'https://www.usna.usda.gov', eventsUrl: 'https://www.usna.usda.gov/discover/events', city: 'Washington', state: 'DC', platform: 'custom' },
  { name: 'Dumbarton Oaks Gardens', url: 'https://www.doaks.org', eventsUrl: 'https://www.doaks.org/visit/garden/events', city: 'Washington', state: 'DC', platform: 'custom' },

  // Delaware
  { name: 'Mt. Cuba Center', url: 'https://mtcubacenter.org', eventsUrl: 'https://mtcubacenter.org/events/', city: 'Hockessin', state: 'DE', platform: 'wordpress' },
  { name: 'Winterthur Museum & Garden', url: 'https://www.winterthur.org', eventsUrl: 'https://www.winterthur.org/events/', city: 'Winterthur', state: 'DE', platform: 'custom' },
  { name: 'Delaware Nature Society', url: 'https://www.delawarenaturesociety.org', eventsUrl: 'https://www.delawarenaturesociety.org/events/', city: 'Hockessin', state: 'DE', platform: 'wordpress' },

  // Florida
  { name: 'Fairchild Tropical Botanic Garden', url: 'https://www.fairchildgarden.org', eventsUrl: 'https://www.fairchildgarden.org/events', city: 'Coral Gables', state: 'FL', platform: 'custom' },
  { name: 'Marie Selby Botanical Gardens', url: 'https://selby.org', eventsUrl: 'https://selby.org/events/', city: 'Sarasota', state: 'FL', platform: 'custom' },
  { name: 'Mounts Botanical Garden', url: 'https://www.mounts.org', eventsUrl: 'https://www.mounts.org/events/', city: 'West Palm Beach', state: 'FL', platform: 'wordpress' },
  { name: 'Bok Tower Gardens', url: 'https://boktowergardens.org', eventsUrl: 'https://boktowergardens.org/events/', city: 'Lake Wales', state: 'FL', platform: 'wordpress' },
  { name: 'Naples Botanical Garden', url: 'https://www.naplesgarden.org', eventsUrl: 'https://www.naplesgarden.org/events/', city: 'Naples', state: 'FL', platform: 'custom' },

  // Georgia
  { name: 'Atlanta Botanical Garden', url: 'https://atlantabg.org', eventsUrl: 'https://atlantabg.org/events/', city: 'Atlanta', state: 'GA', platform: 'custom' },
  { name: 'Callaway Gardens', url: 'https://www.callawaygardens.com', eventsUrl: 'https://www.callawaygardens.com/events', city: 'Pine Mountain', state: 'GA', platform: 'custom' },
  { name: 'State Botanical Garden of Georgia', url: 'https://botgarden.uga.edu', eventsUrl: 'https://botgarden.uga.edu/events/', city: 'Athens', state: 'GA', platform: 'wordpress' },
  { name: 'Chattahoochee Nature Center', url: 'https://www.chattnaturecenter.org', eventsUrl: 'https://www.chattnaturecenter.org/events/', city: 'Roswell', state: 'GA', platform: 'wordpress' },

  // Iowa
  { name: 'Reiman Gardens', url: 'https://www.reimangardens.com', eventsUrl: 'https://www.reimangardens.com/events/', city: 'Ames', state: 'IA', platform: 'wordpress' },
  { name: 'Des Moines Botanical Garden', url: 'https://www.dmbotanicalgarden.com', eventsUrl: 'https://www.dmbotanicalgarden.com/events/', city: 'Des Moines', state: 'IA', platform: 'wordpress' },
  { name: 'Indian Creek Nature Center', url: 'https://www.indiancreeknaturecenter.org', eventsUrl: 'https://www.indiancreeknaturecenter.org/events/', city: 'Cedar Rapids', state: 'IA', platform: 'wordpress' },

  // Illinois
  { name: 'Chicago Botanic Garden', url: 'https://www.chicagobotanic.org', eventsUrl: 'https://www.chicagobotanic.org/events', city: 'Glencoe', state: 'IL', platform: 'custom' },
  { name: 'Morton Arboretum', url: 'https://www.mortonarb.org', eventsUrl: 'https://www.mortonarb.org/events', city: 'Lisle', state: 'IL', platform: 'custom' },
  { name: 'Anderson Japanese Gardens', url: 'https://andersongardens.org', eventsUrl: 'https://andersongardens.org/events/', city: 'Rockford', state: 'IL', platform: 'wordpress' },
  { name: 'Lurie Garden', url: 'https://www.luriegarden.org', eventsUrl: 'https://www.luriegarden.org/events/', city: 'Chicago', state: 'IL', platform: 'wordpress' },

  // Indiana
  { name: 'Indianapolis Museum of Art at Newfields', url: 'https://discovernewfields.org', eventsUrl: 'https://discovernewfields.org/calendar', city: 'Indianapolis', state: 'IN', platform: 'custom' },
  { name: 'Garfield Park Conservatory', url: 'https://www.garfieldgardensconservatory.org', eventsUrl: 'https://www.garfieldgardensconservatory.org/events/', city: 'Indianapolis', state: 'IN', platform: 'wordpress' },
  { name: 'Foellinger-Freimann Botanical Conservatory', url: 'https://www.botanicalconservatory.org', eventsUrl: 'https://www.botanicalconservatory.org/events/', city: 'Fort Wayne', state: 'IN', platform: 'wordpress' },

  // Kentucky
  { name: 'Bernheim Arboretum and Research Forest', url: 'https://bernheim.org', eventsUrl: 'https://bernheim.org/events/', city: 'Clermont', state: 'KY', platform: 'wordpress' },
  { name: 'Louisville Nature Center', url: 'https://www.louisvillenaturecenter.org', eventsUrl: 'https://www.louisvillenaturecenter.org/events/', city: 'Louisville', state: 'KY', platform: 'wordpress' },
  { name: 'Yew Dell Botanical Gardens', url: 'https://www.yewdellgardens.org', eventsUrl: 'https://www.yewdellgardens.org/events/', city: 'Crestwood', state: 'KY', platform: 'wordpress' },

  // Massachusetts
  { name: 'Arnold Arboretum of Harvard University', url: 'https://arboretum.harvard.edu', eventsUrl: 'https://arboretum.harvard.edu/visit/events/', city: 'Boston', state: 'MA', platform: 'custom' },
  { name: 'Tower Hill Botanic Garden', url: 'https://www.towerhillbg.org', eventsUrl: 'https://www.towerhillbg.org/events/', city: 'Boylston', state: 'MA', platform: 'wordpress' },
  { name: 'Garden in the Woods', url: 'https://www.nativeplanttrust.org', eventsUrl: 'https://www.nativeplanttrust.org/events/', city: 'Framingham', state: 'MA', platform: 'wordpress' },
  { name: 'Mass Audubon Drumlin Farm', url: 'https://www.massaudubon.org/get-outdoors/wildlife-sanctuaries/drumlin-farm', eventsUrl: 'https://www.massaudubon.org/programs', city: 'Lincoln', state: 'MA', platform: 'custom' },

  // Maryland
  { name: 'Brookside Gardens', url: 'https://www.montgomeryparks.org/parks-and-trails/brookside-gardens/', eventsUrl: 'https://www.montgomeryparks.org/parks-and-trails/brookside-gardens/events/', city: 'Wheaton', state: 'MD', platform: 'custom' },
  { name: 'Ladew Topiary Gardens', url: 'https://www.ladewgardens.com', eventsUrl: 'https://www.ladewgardens.com/events/', city: 'Monkton', state: 'MD', platform: 'wordpress' },
  { name: 'Cylburn Arboretum', url: 'https://www.cylburn.org', eventsUrl: 'https://www.cylburn.org/events/', city: 'Baltimore', state: 'MD', platform: 'wordpress' },
  { name: 'Irvine Nature Center', url: 'https://www.explorenature.org', eventsUrl: 'https://www.explorenature.org/events/', city: 'Owings Mills', state: 'MD', platform: 'wordpress' },

  // Maine
  { name: 'Coastal Maine Botanical Gardens', url: 'https://www.mainegardens.org', eventsUrl: 'https://www.mainegardens.org/events/', city: 'Boothbay', state: 'ME', platform: 'custom' },
  { name: 'Viles Arboretum', url: 'https://www.vilesarboretum.org', eventsUrl: 'https://www.vilesarboretum.org/events/', city: 'Augusta', state: 'ME', platform: 'wordpress' },

  // Minnesota
  { name: 'Minnesota Landscape Arboretum', url: 'https://arb.umn.edu', eventsUrl: 'https://arb.umn.edu/events', city: 'Chaska', state: 'MN', platform: 'custom' },
  { name: 'Como Park Zoo & Conservatory', url: 'https://comozooconservatory.org', eventsUrl: 'https://comozooconservatory.org/events/', city: 'Saint Paul', state: 'MN', platform: 'wordpress' },
  { name: 'Eastman Nature Center', url: 'https://www.threeriversparks.org/location/eastman-nature-center', eventsUrl: 'https://www.threeriversparks.org/events', city: 'Dayton', state: 'MN', platform: 'custom' },

  // Mississippi
  { name: 'Crosby Arboretum', url: 'https://www.crosbyarboretum.msstate.edu', eventsUrl: 'https://www.crosbyarboretum.msstate.edu/events/', city: 'Picayune', state: 'MS', platform: 'custom' },
  { name: 'Hattiesburg Zoo Nature Center', url: 'https://www.hattiesburgzoo.com', eventsUrl: 'https://www.hattiesburgzoo.com/events/', city: 'Hattiesburg', state: 'MS', platform: 'wordpress' },

  // North Carolina
  { name: 'North Carolina Arboretum', url: 'https://www.ncarboretum.org', eventsUrl: 'https://www.ncarboretum.org/events/', city: 'Asheville', state: 'NC', platform: 'wordpress' },
  { name: 'Daniel Stowe Botanical Garden', url: 'https://www.dsbg.org', eventsUrl: 'https://www.dsbg.org/events/', city: 'Belmont', state: 'NC', platform: 'wordpress' },
  { name: 'JC Raulston Arboretum', url: 'https://jcra.ncsu.edu', eventsUrl: 'https://jcra.ncsu.edu/events/', city: 'Raleigh', state: 'NC', platform: 'custom' },
  { name: 'Cape Fear Botanical Garden', url: 'https://www.capefearbg.org', eventsUrl: 'https://www.capefearbg.org/events/', city: 'Fayetteville', state: 'NC', platform: 'wordpress' },

  // New Hampshire
  { name: 'Squam Lakes Natural Science Center', url: 'https://www.nhnature.org', eventsUrl: 'https://www.nhnature.org/programs/', city: 'Holderness', state: 'NH', platform: 'custom' },
  { name: 'Bedrock Gardens', url: 'https://www.bedrockgardens.org', eventsUrl: 'https://www.bedrockgardens.org/events/', city: 'Lee', state: 'NH', platform: 'wordpress' },

  // New Jersey
  { name: 'New Jersey Botanical Garden', url: 'https://www.njbg.org', eventsUrl: 'https://www.njbg.org/events/', city: 'Ringwood', state: 'NJ', platform: 'wordpress' },
  { name: 'Grounds For Sculpture', url: 'https://www.groundsforsculpture.org', eventsUrl: 'https://www.groundsforsculpture.org/events/', city: 'Hamilton', state: 'NJ', platform: 'custom' },
  { name: 'Reeves-Reed Arboretum', url: 'https://www.reeves-reedarboretum.org', eventsUrl: 'https://www.reeves-reedarboretum.org/events/', city: 'Summit', state: 'NJ', platform: 'wordpress' },
  { name: 'Duke Farms', url: 'https://www.dukefarms.org', eventsUrl: 'https://www.dukefarms.org/events/', city: 'Hillsborough', state: 'NJ', platform: 'wordpress' },

  // New York
  { name: 'Brooklyn Botanic Garden', url: 'https://www.bbg.org', eventsUrl: 'https://www.bbg.org/visit/event_calendar', city: 'Brooklyn', state: 'NY', platform: 'custom' },
  { name: 'New York Botanical Garden', url: 'https://www.nybg.org', eventsUrl: 'https://www.nybg.org/event/', city: 'Bronx', state: 'NY', platform: 'custom' },
  { name: 'Wave Hill', url: 'https://www.wavehill.org', eventsUrl: 'https://www.wavehill.org/events', city: 'Bronx', state: 'NY', platform: 'custom' },
  { name: 'Buffalo Botanical Gardens', url: 'https://www.buffalogardens.com', eventsUrl: 'https://www.buffalogardens.com/pages/events', city: 'Buffalo', state: 'NY', platform: 'custom' },

  // Ohio
  { name: 'Cleveland Botanical Garden', url: 'https://holdenfg.org', eventsUrl: 'https://holdenfg.org/events/', city: 'Cleveland', state: 'OH', platform: 'wordpress' },
  { name: 'Franklin Park Conservatory', url: 'https://www.fpconservatory.org', eventsUrl: 'https://www.fpconservatory.org/events/', city: 'Columbus', state: 'OH', platform: 'custom' },
  { name: 'Cincinnati Nature Center', url: 'https://www.cincynature.org', eventsUrl: 'https://www.cincynature.org/visit-explore/events/', city: 'Milford', state: 'OH', platform: 'custom' },
  { name: 'Dawes Arboretum', url: 'https://dawesarb.org', eventsUrl: 'https://dawesarb.org/events/', city: 'Newark', state: 'OH', platform: 'wordpress' },

  // Pennsylvania
  { name: 'Longwood Gardens', url: 'https://longwoodgardens.org', eventsUrl: 'https://longwoodgardens.org/events', city: 'Kennett Square', state: 'PA', platform: 'custom' },
  { name: 'Phipps Conservatory', url: 'https://www.phipps.conservatory.org', eventsUrl: 'https://www.phipps.conservatory.org/calendar-of-events', city: 'Pittsburgh', state: 'PA', platform: 'custom' },
  { name: 'Morris Arboretum', url: 'https://www.morrisarboretum.org', eventsUrl: 'https://www.morrisarboretum.org/events/', city: 'Philadelphia', state: 'PA', platform: 'wordpress' },
  { name: 'Bowmans Hill Wildflower Preserve', url: 'https://www.bhwp.org', eventsUrl: 'https://www.bhwp.org/events/', city: 'New Hope', state: 'PA', platform: 'wordpress' },
  { name: 'Tyler Arboretum', url: 'https://www.tylerarboretum.org', eventsUrl: 'https://www.tylerarboretum.org/events/', city: 'Media', state: 'PA', platform: 'wordpress' },

  // Rhode Island
  { name: 'Blithewold Mansion & Gardens', url: 'https://www.blithewold.org', eventsUrl: 'https://www.blithewold.org/events/', city: 'Bristol', state: 'RI', platform: 'wordpress' },
  { name: 'Roger Williams Park Botanical Center', url: 'https://www.providenceri.gov/botanical-center/', eventsUrl: 'https://www.providenceri.gov/botanical-center/events/', city: 'Providence', state: 'RI', platform: 'custom' },

  // South Carolina
  { name: 'Brookgreen Gardens', url: 'https://www.brookgreen.org', eventsUrl: 'https://www.brookgreen.org/events', city: 'Murrells Inlet', state: 'SC', platform: 'custom' },
  { name: 'Magnolia Plantation and Gardens', url: 'https://www.magnoliaplantation.com', eventsUrl: 'https://www.magnoliaplantation.com/events.html', city: 'Charleston', state: 'SC', platform: 'custom' },
  { name: 'South Carolina Botanical Garden', url: 'https://www.clemson.edu/public/scbg/', eventsUrl: 'https://www.clemson.edu/public/scbg/events/', city: 'Clemson', state: 'SC', platform: 'custom' },

  // Tennessee
  { name: 'Cheekwood Estate & Gardens', url: 'https://www.cheekwood.org', eventsUrl: 'https://www.cheekwood.org/calendar', city: 'Nashville', state: 'TN', platform: 'custom' },
  { name: 'Memphis Botanic Garden', url: 'https://www.memphisbotanicgarden.com', eventsUrl: 'https://www.memphisbotanicgarden.com/events/', city: 'Memphis', state: 'TN', platform: 'wordpress' },
  { name: 'Knoxville Botanical Garden', url: 'https://knoxgarden.org', eventsUrl: 'https://knoxgarden.org/events/', city: 'Knoxville', state: 'TN', platform: 'wordpress' },
  { name: 'Reflection Riding Arboretum', url: 'https://www.reflectionriding.org', eventsUrl: 'https://www.reflectionriding.org/events/', city: 'Chattanooga', state: 'TN', platform: 'wordpress' },

  // Virginia
  { name: 'Lewis Ginter Botanical Garden', url: 'https://www.lewisginter.org', eventsUrl: 'https://www.lewisginter.org/events/', city: 'Richmond', state: 'VA', platform: 'custom' },
  { name: 'Norfolk Botanical Garden', url: 'https://norfolkbotanicalgarden.org', eventsUrl: 'https://norfolkbotanicalgarden.org/events/', city: 'Norfolk', state: 'VA', platform: 'wordpress' },
  { name: 'Green Spring Gardens', url: 'https://www.fairfaxcounty.gov/parks/green-spring', eventsUrl: 'https://www.fairfaxcounty.gov/parks/green-spring/events', city: 'Alexandria', state: 'VA', platform: 'custom' },
  { name: 'Maymont', url: 'https://maymont.org', eventsUrl: 'https://maymont.org/events/', city: 'Richmond', state: 'VA', platform: 'wordpress' },

  // Vermont
  { name: 'ECHO Leahy Center for Lake Champlain', url: 'https://www.echovermont.org', eventsUrl: 'https://www.echovermont.org/events/', city: 'Burlington', state: 'VT', platform: 'custom' },
  { name: 'North Branch Nature Center', url: 'https://www.northbranchnaturecenter.org', eventsUrl: 'https://www.northbranchnaturecenter.org/events/', city: 'Montpelier', state: 'VT', platform: 'wordpress' },

  // Wisconsin
  { name: 'Olbrich Botanical Gardens', url: 'https://www.olbrich.org', eventsUrl: 'https://www.olbrich.org/events/', city: 'Madison', state: 'WI', platform: 'wordpress' },
  { name: 'Boerner Botanical Gardens', url: 'https://www.boernerbotanicalgardens.org', eventsUrl: 'https://www.boernerbotanicalgardens.org/events/', city: 'Hales Corners', state: 'WI', platform: 'wordpress' },
  { name: 'Green Bay Botanical Garden', url: 'https://www.gbbg.org', eventsUrl: 'https://www.gbbg.org/events/', city: 'Green Bay', state: 'WI', platform: 'wordpress' },
  { name: 'Schlitz Audubon Nature Center', url: 'https://www.schlitzaudubon.org', eventsUrl: 'https://www.schlitzaudubon.org/events/', city: 'Milwaukee', state: 'WI', platform: 'wordpress' },

  // West Virginia
  { name: 'West Virginia Botanic Garden', url: 'https://wvbg.org', eventsUrl: 'https://wvbg.org/events/', city: 'Morgantown', state: 'WV', platform: 'wordpress' },
  { name: 'Oglebay Good Zoo & Nature Center', url: 'https://oglebay.com/good-zoo/', eventsUrl: 'https://oglebay.com/events/', city: 'Wheeling', state: 'WV', platform: 'custom' },
];

// ==========================================
// JUNK/INVALID TITLE FILTER
// ==========================================
function isJunkTitle(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length < 4 || t.length > 200) return true;
  if (/^\d+\s*events?\b/i.test(t)) return true;
  if (/^[MTWFS]\n/i.test(t)) return true;
  if (/^\d{1,2}\n/.test(t)) return true;
  const UI_JUNK = /^(skip to|rsvp|google calendar|icalendar|outlook|export|download|add to calendar|share this|list|month|day|week|this month|prev|next|view all|see all|show more|load more|back to|return to|sign up|log in|register|subscribe|more info|learn more|read more|click here|view details|event details|events search|views navigation)\b/i;
  if (UI_JUNK.test(t)) return true;
  const ERROR_JUNK = /^(sorry|no events|there are no|no results|nothing found|loading|please wait|search results|filter|we couldn't find|page not found|error|oops)/i;
  if (ERROR_JUNK.test(t)) return true;
  if (/^\d+$/.test(t)) return true;

  // Navigation & site chrome junk (common in gardens/nature sites)
  const NAV_JUNK = /^(breadcrumb|footer\s*(top|bottom)|social\s*sharing|buy\s*(gardens\s*)?tickets|book\s*your\s*stay|main\s*navigation|header|sidebar|menu|copyright|privacy\s*policy|terms\s*of\s*use|contact\s*us|about\s*us|visit\s*us|plan\s*your\s*visit|become\s*a\s*member|donate|gift\s*shop|volunteer|careers|press|media|newsletter|get\s*directions|parking|hours|admission|map|site\s*map|search|login|my\s*account|cart|checkout|shop)\b/i;
  if (NAV_JUNK.test(t)) return true;

  // Generic nav link patterns
  if (/^(social sharing links?|footer (top|bottom)|breadcrumb)/i.test(t)) return true;

  return false;
}

/**
 * Clean raw date strings extracted from garden/nature sites.
 * Handles multi-line dates, "Featured" prefix, day-only formats, etc.
 */
function cleanRawDateString(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.trim();

  // Collapse newlines into spaces
  t = t.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // Remove "Featured" prefix (e.g., "Featured Apr 2 @10:00am")
  t = t.replace(/^Featured\s+/i, '');

  // If it's just a day name + number with no month (e.g., "Fri 1"), it's not a parseable date
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}$/i.test(t)) {
    return '';
  }

  return t;
}

function isValidDateString(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 5) return false;
  if (/^\d{1,2}:\d{2}\s*(am|pm)/i.test(t) && !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(t) && !/\d{1,2}\/\d{1,2}/.test(t)) return false;
  const hasMonth = /\b(jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|oct|nov|dec|january|february|august|september|october|november|december)\b/i.test(t);
  const hasNumericDate = /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}/.test(t);
  return hasMonth || hasNumericDate;
}

// ==========================================
// STRATEGY 1: WordPress REST API (The Events Calendar)
// ==========================================
async function tryWordPressAPI(venue, page) {
  const apiUrl = `${venue.url}/wp-json/tribe/events/v1/events/?per_page=50&start_date=now`;
  try {
    const response = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        return data;
      } catch (e) {
        return null;
      }
    }, apiUrl);

    if (!response || !response.events || !Array.isArray(response.events)) return null;

    const events = [];
    for (const ev of response.events) {
      const title = (ev.title || '').replace(/<[^>]*>/g, '').trim();
      if (!title || isJunkTitle(title)) continue;
      if (NON_FAMILY_PATTERNS.test(`${title} ${ev.description || ''}`)) continue;

      const description = (ev.description || '').replace(/<[^>]*>/g, '').trim().substring(0, 1000);
      const dateStr = ev.start_date || ev.utc_start_date || '';
      const imageUrl = ev.image?.url || '';
      const eventUrl = ev.url || venue.eventsUrl;

      events.push({
        title,
        eventDate: dateStr,
        date: dateStr,
        description: description || `${title} at ${venue.name}`,
        url: eventUrl,
        imageUrl,
        venue: venue.name,
        venueName: venue.name,
        city: venue.city,
        state: venue.state,
        category: 'Nature & Outdoors',
        source_url: venue.eventsUrl,
        scraper_name: SCRAPER_NAME,
      });
    }

    return events.length > 0 ? events : null;
  } catch (err) {
    return null;
  }
}

// ==========================================
// STRATEGY 2: Puppeteer HTML Scraping
// ==========================================
async function tryHTMLScraping(venue, page) {
  try {
    await page.goto(venue.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(3000);

    const rawEvents = await page.evaluate((venueName) => {
      const results = [];
      const seen = new Set();

      function addEvent(title, date, description, url, imageUrl, ageRange) {
        if (!title || title.length < 4) return;
        const key = title.toLowerCase().trim();
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          title: title.trim(),
          date: date || '',
          description: (description || '').substring(0, 1000),
          url: url || '',
          imageUrl: imageUrl || '',
          ageRange: ageRange || '',
          venueName: venueName,
        });
      }

      // Strategy A: Tribe Events Calendar plugin (very common on WordPress)
      document.querySelectorAll(
        '.tribe-events-single, .type-tribe_events, ' +
        '.tribe-common-g-row, .tribe-events-calendar-list__event, ' +
        '.tribe-events-pro-summary__event'
      ).forEach(card => {
        const titleEl = card.querySelector(
          '.tribe-events-list-event-title a, .tribe-events-calendar-list__event-title a, ' +
          '.tribe-events-pro-summary__event-title a, ' +
          'h2 a, h3 a, .tribe-event-url a'
        );
        const title = titleEl?.textContent?.trim() || card.querySelector('h2, h3')?.textContent?.trim();
        const dateEl = card.querySelector(
          '.tribe-events-schedule, .tribe-event-schedule-details, ' +
          '.tribe-events-calendar-list__event-datetime, time, .tribe-common-b2'
        );
        const date = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime') || '';
        const desc = card.querySelector('.tribe-events-list-event-description, .tribe-events-content, p')?.textContent?.trim();
        const url = titleEl?.getAttribute('href') || '';
        const img = card.querySelector('img')?.getAttribute('src') || '';
        addEvent(title, date, desc, url, img);
      });

      // Strategy B: Generic event card patterns
      if (results.length === 0) {
        document.querySelectorAll(
          '.event-card, .event-item, .events-listing, .event-listing, ' +
          '.event-entry, .upcoming-event, .calendar-event, ' +
          '[class*="event-card"], [class*="event-item"], ' +
          '.views-row, .node--type-event, article.event'
        ).forEach(card => {
          const title = card.querySelector('h2, h3, h4, .event-title, .title, [class*="title"] a')?.textContent?.trim();
          const date = card.querySelector('time, .date, .event-date, [class*="date"], .meta')?.textContent?.trim() ||
                       card.querySelector('time')?.getAttribute('datetime') || '';
          const desc = card.querySelector('p, .description, .excerpt, .event-description, [class*="desc"]')?.textContent?.trim();
          const url = card.querySelector('a')?.getAttribute('href') || '';
          const img = card.querySelector('img')?.getAttribute('src') || '';
          addEvent(title, date, desc, url, img);
        });
      }

      // Strategy C: Broad fallback — links in list/article structures
      if (results.length === 0) {
        document.querySelectorAll('article, .card, li.event, .list-item').forEach(card => {
          const linkEl = card.querySelector('a[href]');
          const title = card.querySelector('h2, h3, h4')?.textContent?.trim() || linkEl?.textContent?.trim();
          const date = card.querySelector('time, .date, span[class*="date"]')?.textContent?.trim() ||
                       card.querySelector('time')?.getAttribute('datetime') || '';
          const desc = card.querySelector('p')?.textContent?.trim();
          const url = linkEl?.getAttribute('href') || '';
          const img = card.querySelector('img')?.getAttribute('src') || '';
          addEvent(title, date, desc, url, img);
        });
      }

      return results;
    }, venue.name);

    return rawEvents.length > 0 ? rawEvents : null;
  } catch (err) {
    return null;
  }
}

// ==========================================
// SCRAPE A SINGLE VENUE
// ==========================================
async function scrapeVenue(venue, browser) {
  console.log(`\n🌿 ${venue.name} (${venue.city}, ${venue.state})`);
  console.log(`   🌐 ${venue.eventsUrl}`);

  const events = [];
  let page;

  try {
    page = await createStealthPage(browser);

    // Strategy 1: Try WordPress REST API first (for WordPress sites)
    if (venue.platform === 'wordpress') {
      const apiEvents = await tryWordPressAPI(venue, page);
      if (apiEvents && apiEvents.length > 0) {
        console.log(`   ✅ WordPress API: ${apiEvents.length} events`);
        events.push(...apiEvents);
        await page.close();
        return events;
      }
      console.log(`   ⚠️ WordPress API failed, falling back to HTML scraping`);
    }

    // Strategy 2: Puppeteer HTML scraping
    const htmlEvents = await tryHTMLScraping(venue, page);
    if (htmlEvents && htmlEvents.length > 0) {
      let skippedNonFamily = 0;

      for (const raw of htmlEvents) {
        if (isJunkTitle(raw.title)) continue;
        if (NON_FAMILY_PATTERNS.test(`${raw.title} ${raw.description || ''}`)) {
          skippedNonFamily++;
          continue;
        }

        // Clean and validate the date string
        const cleanedDate = cleanRawDateString(raw.date || '');

        // Resolve relative URLs
        let eventUrl = raw.url || venue.eventsUrl;
        if (eventUrl && eventUrl.startsWith('/')) {
          eventUrl = `${venue.url}${eventUrl}`;
        }

        let imageUrl = raw.imageUrl || '';
        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = `${venue.url}${imageUrl}`;
        }

        events.push({
          title: raw.title,
          eventDate: cleanedDate,
          date: cleanedDate,
          description: raw.description || `${raw.title} at ${venue.name}`,
          url: eventUrl,
          imageUrl: imageUrl,
          venue: venue.name,
          venueName: venue.name,
          city: venue.city,
          state: venue.state,
          category: 'Nature & Outdoors',
          source_url: venue.eventsUrl,
          scraper_name: SCRAPER_NAME,
          ageRange: raw.ageRange || '',
        });
      }

      if (skippedNonFamily > 0) {
        console.log(`   🚫 Skipped ${skippedNonFamily} non-family events`);
      }
      console.log(`   ✅ HTML scrape: ${events.length} events`);
    } else {
      console.log(`   ⚠️ No events found`);
    }

    await page.close();
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    if (page) await page.close().catch(() => {});
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================
async function scrapeGardensNature(filterStates = null) {
  console.log('\n\x1b[32m🌿🌸━━━━━━━━━━━━━ GARDENS & NATURE CENTERS SCRAPER ━━━━━━━━━━━━━━🌿🌸\x1b[0m');

  const venuesToScrape = filterStates
    ? VENUES.filter(v => filterStates.includes(v.state))
    : VENUES;

  console.log(`📍 Target: ${venuesToScrape.length} venues across ${new Set(venuesToScrape.map(v => v.state)).size} states`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};
  let totalFound = 0;

  try {
    for (let i = 0; i < venuesToScrape.length; i++) {
      const venue = venuesToScrape[i];
      console.log(`\n[${i + 1}/${venuesToScrape.length}] ${venue.name}`);

      const venueEvents = await scrapeVenue(venue, browser);
      allEvents.push(...venueEvents);

      if (!stateResults[venue.state]) stateResults[venue.state] = 0;
      stateResults[venue.state] += venueEvents.length;
      totalFound += venueEvents.length;

      // Save in batches to keep memory manageable
      if (allEvents.length >= 200 || i === venuesToScrape.length - 1) {
        if (allEvents.length > 0 && !DRY_RUN) {
          console.log(`\n💾 Saving batch of ${allEvents.length} events...`);

          const venues = allEvents.map(e => ({
            name: e.venueName || e.venue,
            city: e.city,
            state: e.state,
          }));

          try {
            const result = await saveEventsWithGeocoding(
              allEvents,
              venues,
              {
                scraperName: SCRAPER_NAME,
                state: allEvents[0].state,
                category: 'Nature & Outdoors',
                platform: 'gardens-nature',
              }
            );
            const saved = result?.saved || result?.new || result?.imported || 0;
            console.log(`   💾 Saved: ${saved}`);
          } catch (err) {
            console.error(`   ❌ Save error: ${err.message}`);
          }
        }
        allEvents = [];
      }

      // Polite delay between venues
      if (i < venuesToScrape.length - 1) {
        await delay(3000);
      }
    }
  } catch (err) {
    console.error('❌ Scraper fatal error:', err);
    throw err;
  } finally {
    await browser.close();
  }

  // Log summary
  console.log('\n\x1b[32m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events found: ${totalFound}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} events`);
  }

  logScraperResult(SCRAPER_NAME, {
    found: totalFound,
    new: totalFound,
    duplicates: 0,
  });

  return stateResults;
}

// ==========================================
// CLI & CLOUD FUNCTION EXPORTS
// ==========================================

const args = process.argv.slice(2);
const stateArgIdx = args.findIndex(a => a === '--state');
const DRY_RUN = args.includes('--dry');

if (require.main === module) {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — events will be extracted but NOT saved');
  }

  let statesToScrape = null;
  if (stateArgIdx !== -1 && args[stateArgIdx + 1]) {
    statesToScrape = args[stateArgIdx + 1].split(',').map(s => s.trim().toUpperCase());
  }

  scrapeGardensNature(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapeGardensNatureCloudFunction() {
  try {
    const result = await scrapeGardensNature();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapeGardensNature,
  scrapeGardensNatureCloudFunction,
};
