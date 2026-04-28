#!/usr/bin/env node

/**
 * COMPLETE DATA QUALITY CHECK
 *
 * One script to audit everything in the FunHive database:
 *   1. Activities — field completeness, coordinates, state codes, descriptions
 *   2. Events — field completeness, past events, missing dates/times
 *   3. Scraper health — zero-event scrapers, stale scrapers, failure rates
 *   4. Duplicates — same name+city+state appearing multiple times
 *   5. Geographic coverage — state and category distribution
 *   6. Summary with health score
 *
 * Usage:
 *   node data-quality-check.js              # Full check
 *   node data-quality-check.js --activities # Activities only
 *   node data-quality-check.js --events     # Events only
 *   node data-quality-check.js --scrapers   # Scraper health only
 *   node data-quality-check.js --fix        # Auto-fix what we can (dry-run by default)
 *   node data-quality-check.js --fix --save # Actually save fixes
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

// Import scraper registry to know which scrapers are currently active
let ACTIVE_SCRAPERS = {};
try {
  const { SCRAPERS } = require('../scrapers/scraper-registry');
  ACTIVE_SCRAPERS = SCRAPERS || {};
} catch (e) {
  // Registry not available — skip active scraper filtering
}

// ==========================================
// SCRAPER SITE MAP — websites within multi-site scrapers
// Used to report zero-event status per-website instead of per-scraper
// ==========================================
const SCRAPER_SITES = {
  // ── Communico Libraries ──
  'Communico-IA': [
    { name: 'Waterloo Public Library', url: 'https://wpl.libnet.info/events' },
  ],
  'Communico-MA': [
    { name: 'Worcester Public Library', url: 'https://mywpl.libnet.info/events' },
  ],
  'Communico-NV': [
    { name: 'Las Vegas-Clark County Library District', url: 'https://events.thelibrarydistrict.org/events' },
  ],
  'Communico-OR': [
    { name: 'Multnomah County Library', url: 'https://multcolib.libnet.info/events' },
  ],
  'Communico-CA': [
    { name: 'Riverside County Library', url: 'https://rivlib.libnet.info/events' },
  ],
  'Communico-CO': [
    { name: 'Arapahoe Libraries', url: 'https://arapahoelibraries.libnet.info/events' },
  ],
  'Communico-DC': [
    { name: 'DC Public Library', url: 'https://dclibrary.libnet.info/events' },
  ],
  'Communico-FL': [
    { name: 'Orange County Library System', url: 'https://ocls.libnet.info/events' },
    { name: 'Seminole County Public Library', url: 'https://seminolecountyfl.libnet.info/events' },
  ],
  'Communico-GA': [
    { name: 'Cobb County Library', url: 'https://cobbcat.libnet.info/events' },
    { name: 'Gwinnett County Library', url: 'https://gwinnettcounty.libnet.info/events' },
  ],
  'Communico-IL': [
    { name: 'Schaumburg Township Library', url: 'https://stdl.libnet.info/events' },
    { name: 'Vernon Area Library (Lincolnshire)', url: 'https://vapld.libnet.info/events' },
  ],
  'Communico-IN': [
    { name: 'Hamilton East Public Library', url: 'https://hepl.libnet.info/events' },
  ],
  'Communico-MD': [
    { name: 'Anne Arundel County Library', url: 'https://aacpl.libnet.info/events' },
    { name: 'Baltimore County Library', url: 'https://bcpl.libnet.info/events' },
    { name: 'Carroll County Library', url: 'https://carr.libnet.info/events' },
    { name: 'Harford County Library', url: 'https://hcpl.libnet.info/events' },
    { name: 'Howard County Library', url: 'https://hclibrary.libnet.info/events' },
    { name: 'St. Mary\'s County Library', url: 'https://stmalib.libnet.info/events' },
  ],
  'Communico-NJ': [
    { name: 'Somerset County Library', url: 'https://sclsnj.libnet.info/events' },
    { name: 'Montclair Public Library', url: 'https://montclairpubliclibrary.libnet.info/events' },
  ],
  'Communico-NY': [
    { name: 'Westchester Library System', url: 'https://westchesterlibraries.libnet.info/events' },
  ],
  'Communico-OH': [
    { name: 'Columbus Metropolitan Library', url: 'https://events.columbuslibrary.org/events' },
  ],
  'Communico-PA': [
    { name: 'Chester County Library System', url: 'https://ccls.libnet.info/events' },
    { name: 'Montgomery County-Norristown Library', url: 'https://mc-npl.libnet.info/events' },
  ],
  'Communico-TX': [
    { name: 'Fort Worth Library', url: 'https://fwpl.libnet.info/events' },
  ],
  'Communico-VA': [
    { name: 'Arlington Public Library', url: 'https://arlingtonva.libnet.info/events' },
    { name: 'Fairfax County Library', url: 'https://librarycalendar.fairfaxcounty.gov/events' },
    { name: 'Loudoun County Library', url: 'https://library.loudoun.gov/events' },
    { name: 'Prince William Library', url: 'https://pwpls.libnet.info/events' },
  ],
  'Communico-WI': [
    { name: 'Madison Public Library', url: 'https://madisonpubliclibrary.libnet.info/events' },
  ],

  // ── BiblioCommons Libraries ──
  'BiblioCommons-CA2': [
    { name: 'Alameda County Library', url: 'https://aclibrary.bibliocommons.com/v2/events' },
    { name: 'San Mateo County Libraries', url: 'https://smcl.bibliocommons.com/v2/events' },
    { name: 'San Diego County Library', url: 'https://sdcl.bibliocommons.com/v2/events' },
    { name: 'San Diego Public Library', url: 'https://sandiego.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-IL': [
    { name: 'Chicago Public Library', url: 'https://chipublib.bibliocommons.com/v2/events' },
    { name: 'Aurora Public Library', url: 'https://aurora.bibliocommons.com/v2/events' },
    { name: 'Evanston Public Library', url: 'https://evanstonlibrary.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-MN': [
    { name: 'Hennepin County Library', url: 'https://hclib.bibliocommons.com/v2/events' },
    { name: 'St. Paul Public Library', url: 'https://sppl.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-NJ': [
    { name: 'Burlington County Library System', url: 'https://bclsnj.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-AZ': [
    { name: 'Scottsdale Public Library', url: 'https://scottsdale.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-CO': [
    { name: 'Denver Public Library', url: 'https://denverlibrary.bibliocommons.com/v2/events' },
    { name: 'Jefferson County Library', url: 'https://jefferson.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-MA': [
    { name: 'Boston Public Library', url: 'https://bpl.bibliocommons.com/v2/events' },
    { name: 'Cambridge Public Library', url: 'https://cambridgepl.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-MO': [
    { name: 'St. Louis County Library', url: 'https://slcl.bibliocommons.com/v2/events' },
    { name: 'Kansas City Public Library', url: 'https://kclibrary.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-OH': [
    { name: 'Cleveland Public Library', url: 'https://cpl.bibliocommons.com/v2/events' },
    { name: 'Cincinnati & Hamilton County Library', url: 'https://cincinnatilibrary.bibliocommons.com/v2/events' },
  ],

  // ── Drupal Libraries ──
  'Drupal-Pennsylvania': [
    { name: 'Library System of Lancaster County', url: 'https://calendar.lancasterlibraries.org/events/feed/html' },
    { name: 'York County Libraries', url: 'https://events.yorklibraries.org/events/feed/html' },
  ],

  // ── EventON ──
  'EventON-Lexington': [
    { name: 'Lexington County Public Library', url: 'https://lexcolibrary.com/wp-json/wp/v2/ajde_events' },
  ],

  // ── State Parks ──
  'State-Parks-Events': [
    { name: 'Florida State Parks', url: 'https://www.floridastateparks.org/events' },
    { name: 'Georgia State Parks', url: 'https://explore.gastateparks.org/events' },
    { name: 'North Carolina State Parks', url: 'https://events.dncr.nc.gov/department/north-carolina-state-parks-and-recreation/calendar' },
    { name: 'Tennessee State Parks', url: 'https://tnstateparks.com/happenings' },
    { name: 'Kentucky State Parks', url: 'https://parks.ky.gov/events' },
    { name: 'Alabama State Parks', url: 'https://www.alapark.com/events' },
    { name: 'Virginia State Parks', url: 'https://www.dcr.virginia.gov/state-parks/events' },
    { name: 'New York State Parks', url: 'https://parks.ny.gov/visit/events' },
    { name: 'South Carolina State Parks', url: 'https://southcarolinaparks.com/programs-and-events' },
    { name: 'Ohio State Parks', url: 'https://ohiodnr.gov/home/news-and-events/all-events/parks-wc-events' },
    { name: 'Maryland State Parks', url: 'https://dnr.maryland.gov/publiclands/pages/park-events.aspx' },
    { name: 'Michigan State Parks', url: 'https://www.michigan.gov/dnr/things-to-do/calendar' },
    { name: 'Massachusetts State Parks', url: 'https://www.mass.gov/info-details/massachusetts-state-parks-programs-and-events' },
    { name: 'Illinois State Parks', url: 'https://dnr.illinois.gov/parks/event.html' },
    { name: 'Delaware State Parks', url: 'https://www.destateparks.com/programs' },
    { name: 'Rhode Island State Parks', url: 'https://riparks.ri.gov/events' },
    { name: 'Mississippi State Parks', url: 'https://www.mdwfp.com/events/' },
    { name: 'Maine State Parks', url: 'https://www.maine.gov/dacf/parks/discover_history_explore_nature/activities/index.shtml' },
  ],

  // ── Science & Arts Venues ──
  'Venue-Events-ScienceArts': [
    { name: 'Connecticut Science Center', url: 'https://ctsciencecenter.org/events/' },
    { name: 'Yale Peabody Museum', url: 'https://peabody.yale.edu/events' },
    { name: 'Smithsonian Air & Space Museum', url: 'https://airandspace.si.edu/events' },
    { name: 'Smithsonian Natural History Museum', url: 'https://naturalhistory.si.edu/events' },
    { name: 'National Building Museum', url: 'https://www.nbm.org/events/' },
    { name: 'Frost Science Museum', url: 'https://www.frostscience.org/calendar-events/' },
    { name: 'Museum of Science & Industry', url: 'https://www.mosi.org/events/' },
    { name: 'Bishop Museum of Science & Nature', url: 'https://bishopscience.org/events/' },
    { name: 'Kennedy Space Center Visitor Complex', url: 'https://www.kennedyspacecenter.com/launches-and-events/featured-events' },
    { name: 'Fernbank Museum of Natural History', url: 'https://www.fernbankmuseum.org/events/calendar-of-events/' },
    { name: 'Tellus Science Museum', url: 'https://tellusmuseum.org/events/' },
    { name: 'Griffin Museum of Science and Industry', url: 'https://www.griffinmsi.org/events' },
    { name: 'Adler Planetarium', url: 'https://www.adlerplanetarium.org/explore/events/' },
    { name: 'Field Museum', url: 'https://www.fieldmuseum.org/events' },
    { name: 'Art Institute of Chicago', url: 'https://www.artic.edu/events' },
    { name: 'Indiana State Museum', url: 'https://www.indianamuseum.org/events/' },
    { name: 'Conner Prairie Living History', url: 'https://www.connerprairie.org/visit/events/' },
    { name: 'Maryland Science Center', url: 'https://www.mdsci.org/whats-happening/events/' },
    { name: 'Museum of Science Boston', url: 'https://www.mos.org/events' },
    { name: 'EcoTarium', url: 'https://ecotarium.org/events/' },
    { name: 'Michigan Science Center', url: 'https://www.mi-sci.org/calendar/' },
    { name: 'Impression 5 Science Center', url: 'https://impression5.org/events/' },
    { name: 'Henry Ford Museum', url: 'https://www.thehenryford.org/visit/events/' },
    { name: 'McAuliffe-Shepard Discovery Center', url: 'https://www.starhop.com/events/' },
    { name: 'American Museum of Natural History', url: 'https://www.amnh.org/calendar' },
    { name: 'New York Hall of Science', url: 'https://nysci.org/nysci-events' },
    { name: 'Intrepid Sea Air & Space Museum', url: 'https://www.intrepidmuseum.org/events/calendar' },
    { name: 'Corning Museum of Glass', url: 'https://whatson.cmog.org/events-programs' },
    { name: 'NC Museum of Natural Sciences', url: 'https://naturalsciences.org/calendar' },
    { name: 'Great Lakes Science Center', url: 'https://greatscience.com/explore/events-programs' },
    { name: 'Imagination Station', url: 'https://www.imaginationstationtoledo.org/visit/events' },
    { name: 'Franklin Institute', url: 'https://www.fi.edu/en/events-calendar' },
    { name: 'Academy of Natural Sciences', url: 'https://ansp.org/experience/events' },
    { name: 'Kamin Science Center', url: 'https://kaminsciencecenter.org/plan-a-visit/?filter_exhibit=events' },
    { name: 'Tennessee State Museum', url: 'https://tnmuseum.org/calendar-of-events' },
    { name: 'Science Museum of Virginia', url: 'https://smv.org/explore/things-to-do/?things_to_do_type=eventpage' },
    { name: 'Virginia Museum of Natural History', url: 'https://www.vmnh.net/calendar' },
    { name: 'Milwaukee Art Museum', url: 'https://mam.org/events/' },
  ],

  // ── Children's Museums ──
  'Venue-Events-ChildrensMuseums': [
    { name: 'McWane Science Center', url: 'https://mcwane.org/explore/events/' },
    { name: 'EarlyWorks Children\'s Museum', url: 'https://earlyworks.com/events/' },
    { name: 'Stepping Stones Museum for Children', url: 'https://steppingstonesmuseum.org/calendar/' },
    { name: 'Imagine Nation Museum', url: 'https://imaginenation.org/events/' },
    { name: 'National Children\'s Museum', url: 'https://nationalchildrensmuseum.org/events/' },
    { name: 'Delaware Children\'s Museum', url: 'https://delawarechildrensmuseum.org/events/' },
    { name: 'Miami Children\'s Museum', url: 'https://www.miamichildrensmuseum.org/events/' },
    { name: 'Glazer Children\'s Museum', url: 'https://www.glazermuseum.org/visit/calendar' },
    { name: 'Golisano Children\'s Museum of Naples', url: 'https://cmonaples.org/events/' },
    { name: 'Great Explorations', url: 'https://www.greatexplorations.org/events/' },
    { name: 'Children\'s Museum of Atlanta', url: 'https://childrensmuseumatlanta.org/events/' },
    { name: 'Chicago Children\'s Museum', url: 'https://www.chicagochildrensmuseum.org/program-calendar' },
    { name: 'Kohl Children\'s Museum', url: 'https://www.kohlchildrensmuseum.org/visit/events-and-programs/' },
    { name: 'The Children\'s Museum of Indianapolis', url: 'https://www.childrensmuseum.org/visit/calendar' },
    { name: 'Kentucky Science Center', url: 'https://kysciencecenter.org/events/' },
    { name: 'Children\'s Museum & Theatre of Maine', url: 'https://www.kitetails.org/calendar/' },
    { name: 'Maine Discovery Museum', url: 'https://www.mainediscoverymuseum.org/special-events' },
    { name: 'Boston Children\'s Museum', url: 'https://www.bostonchildrensmuseum.org/programs-events' },
    { name: 'Discovery Museum', url: 'https://www.discoveryacton.org/visit/programs' },
    { name: 'Grand Rapids Children\'s Museum', url: 'https://www.grcm.org/events/' },
    { name: 'Mississippi Children\'s Museum', url: 'https://mschildrensmuseum.org/events/' },
    { name: 'Children\'s Museum of New Hampshire', url: 'https://childrens-museum.org/calendar/' },
    { name: 'Garden State Discovery Museum', url: 'https://discoverymuseum.com/events/' },
    { name: 'Children\'s Museum of Manhattan', url: 'https://cmom.org/visit/calendar/' },
    { name: 'Brooklyn Children\'s Museum', url: 'https://www.brooklynkids.org/calendar/' },
    { name: 'Long Island Children\'s Museum', url: 'https://www.licm.org/events/' },
    { name: 'Strong National Museum of Play', url: 'https://www.museumofplay.org/visit/calendar/' },
    { name: 'Marbles Kids Museum', url: 'https://www.marbleskidsmuseum.org/events' },
    { name: 'Discovery Place Science', url: 'https://science.discoveryplace.org/events-calendar' },
    { name: 'Kidzu Children\'s Museum', url: 'https://kidzuchildrensmuseum.org/events/' },
    { name: 'COSI Columbus', url: 'https://cosi.org/events/' },
    { name: 'Children\'s Museum of Cleveland', url: 'https://cmcleveland.org/events/' },
    { name: 'Please Touch Museum', url: 'https://www.pleasetouchmuseum.org/visit/events/' },
    { name: 'Children\'s Museum of Pittsburgh', url: 'https://pittsburghkids.org/events' },
    { name: 'Providence Children\'s Museum', url: 'https://providencechildrensmuseum.org/events/' },
    { name: 'EdVenture Children\'s Museum', url: 'https://edventure.org/events/' },
    { name: 'Children\'s Museum of the Upstate', url: 'https://tcmupstate.org/events/' },
    { name: 'Adventure Science Center', url: 'https://www.adventuresci.org/events/' },
    { name: 'Creative Discovery Museum', url: 'https://www.cdmfun.org/events' },
    { name: 'Muse Knoxville', url: 'https://themuseknoxville.org/events/' },
    { name: 'ECHO Leahy Center', url: 'https://www.echovermont.org/events/' },
    { name: 'Montshire Museum of Science', url: 'https://montshire.org/events/' },
    { name: 'Virginia Discovery Museum', url: 'https://www.vadm.org/events/' },
    { name: 'Children\'s Museum of Richmond', url: 'https://www.c-mor.org/events' },
    { name: 'Clay Center / Avampato Discovery Museum', url: 'https://www.theclaycenter.org/events/' },
    { name: 'Betty Brinn Children\'s Museum', url: 'https://bbcmkids.org/events/' },
    { name: 'Madison Children\'s Museum', url: 'https://madisonchildrensmuseum.org/events/' },
    { name: 'Discovery World', url: 'https://www.discoveryworld.org/events/' },
  ],

  // ── LibCal Libraries ──
  'LibCal-CO': [
    { name: 'Denver Public Library', url: 'https://denverlibrary.libcal.com/calendar?cid=-1&t=d' },
    { name: 'Boulder Public Library District', url: 'https://calendar.boulderlibrary.org' },
    { name: 'Mesa County Libraries', url: 'https://mesacountylibraries.libcal.com/calendar/events?cid=-1&t=d' },
    { name: 'Lafayette Public Library', url: 'https://lafayettepubliclibrary.libcal.com/calendar/main?cid=-1&t=d' },
  ],
  'LibCal-FL': [
    { name: 'Lakeland Public Library', url: 'https://lakelandpl.libcal.com/calendar?cid=2787&t=d' },
    { name: 'Palm Beach County Library System', url: 'https://pbclibrary.libcal.com/calendar?cid=-1&t=d' },
    { name: 'St. Johns County Public Library', url: 'https://sjcpls.libcal.com/calendar?cid=-1&t=d' },
    { name: 'Seminole County Library', url: 'https://seminolecountylibrary.libcal.com/calendar?cid=-1&t=d' },
  ],
  'LibCal-GA': [],  // Live Oak removed (now uses Eventpace)
  'LibCal-LA': [
    { name: 'Lafayette Public Library', url: 'https://lafayettela.libcal.com/calendar?cid=-1&t=d' },
  ],
  'LibCal-NJ': [
    { name: 'BCCLS - Bergen County', url: 'https://bccls.libcal.com/calendar/bccls/?cid=-1&t=m' },
    { name: 'Jersey City Free Public Library', url: 'https://jclibrary.libcal.com/calendar?cid=-1&t=d' },
    { name: 'Newark Public Library', url: 'https://npl.libcal.com/calendar?cid=-1&t=d' },
    { name: 'Monmouth County Library', url: 'https://monmouthcountylib.libcal.com/calendar?cid=-1&t=d' },
    { name: 'Mercer County Library', url: 'https://events.mcl.org/' },
  ],
  'LibCal-OH': [
    { name: 'Cleveland Public Library', url: 'https://cpl.libcal.com/calendar/events/?cid=8758&t=g' },
  ],
  'LibCal-SC': [
    { name: 'Charleston County Public Library', url: 'https://ccplsc.libcal.com/calendar?cid=-1&t=d' },
    { name: 'Berkeley County Library System', url: 'https://berkeleylibrarysc.libcal.com/calendar?cid=-1&t=d' },
    { name: 'South Carolina State Library', url: 'https://statelibrary.sc.libcal.com/calendar/events?cid=-1&t=d' },
  ],

  // ── Remaining BiblioCommons ──
  'BiblioCommons-AZ': [
    { name: 'Pima County Public Library', url: 'https://pima.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-CO': [
    { name: 'Arapahoe Libraries', url: 'https://arapahoelibraries.bibliocommons.com/v2/events' },
    { name: 'Jefferson County Public Library', url: 'https://jeffcolibrary.bibliocommons.com/events/search/index' },
  ],
  'BiblioCommons-GA': [
    { name: 'Fulton County Library System', url: 'https://fulcolibrary.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-MA': [
    { name: 'Boston Public Library', url: 'https://bpl.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-MI': [
    { name: 'Grand Rapids Public Library', url: 'https://grpl.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-MO': [
    { name: 'St. Louis Public Library', url: 'https://slpl.bibliocommons.com/v2/events' },
    { name: 'Kansas City Public Library', url: 'https://kclibrary.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-NC': [
    { name: 'Charlotte Mecklenburg Library', url: 'https://cmlibrary.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-OH': [
    { name: 'Cincinnati & Hamilton County Library', url: 'https://cincinnatilibrary.bibliocommons.com/v2/events' },
    { name: 'Cleveland Public Library', url: 'https://cpl.bibliocommons.com/v2/events' },
    { name: 'Cuyahoga County Public Library', url: 'https://cuyahoga.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-TX': [
    { name: 'Harris County Public Library', url: 'https://hcpl.bibliocommons.com/v2/events' },
    { name: 'Frisco Public Library', url: 'https://friscolibrary.bibliocommons.com/v2/events' },
    { name: 'Denton Public Library', url: 'https://denton.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-VA': [
    { name: 'Central Rappahannock Regional Library', url: 'https://librarypoint.bibliocommons.com/v2/events' },
  ],
  'BiblioCommons-WA': [
    { name: 'King County Library System', url: 'https://kcls.bibliocommons.com/v2/events' },
    { name: 'Tacoma Public Library', url: 'https://tacoma.bibliocommons.com/v2/events' },
    { name: 'Sno-Isle Libraries', url: 'https://sno-isle.bibliocommons.com/v2/events' },
    { name: 'Kitsap Regional Library', url: 'https://krl.bibliocommons.com/v2/events' },
    { name: 'Fort Vancouver Regional Library', url: 'https://fvrlibraries.bibliocommons.com/v2/events' },
    { name: 'Timberland Regional Library', url: 'https://timberland.bibliocommons.com/v2/events' },
  ],

  // ── Individual Library Scrapers ──
  'SanAntonio-Library': [
    { name: 'San Antonio Public Library', url: 'https://www.trumba.com/calendars/san-antonio-public-library.json' },
  ],
  'LA-Public-Library': [
    { name: 'Los Angeles Public Library', url: 'https://www.lapl.org/events' },
  ],
  'DesMoines-Library': [
    { name: 'Des Moines Public Library', url: 'https://www.dmpl.org/events/upcoming' },
  ],
  'Brooklyn-Library': [
    { name: 'Brooklyn Public Library', url: 'https://www.bklynlibrary.org/calendar/list' },
  ],
  'FreeLibrary-Philadelphia': [
    { name: 'Free Library of Philadelphia', url: 'https://libwww.freelibrary.org/calendar/main/home/having/all' },
  ],
  'Louisville-Library': [
    { name: 'Louisville Free Public Library', url: 'https://www.lfpl.org/events' },
  ],
  'Miami-Dade-Library': [
    { name: 'Miami-Dade Public Library System', url: 'https://mdpls.org/events' },
  ],
  'Orange-County-Library-FL': [
    { name: 'Orange County Library System', url: 'https://ocls.org/calendar/' },
  ],

  // ── Specialized Platform Scrapers ──
  'CivicEngage-Libraries': [
    { name: 'Colonial Heights Public Library', url: 'https://colonialheightsva.gov/calendar.aspx?CID=25' },
    { name: 'Onslow County Public Library', url: 'https://www.onslowcountync.gov/1640/Family-Programs-Events' },
  ],
  'EventActions-Libraries': [
    { name: 'Jefferson-Madison Regional Library', url: 'https://www.trumba.com/calendars/jefferson-madison-regional-library-events.json' },
  ],
  'Firespring-Libraries': [
    { name: 'Massanutten Regional Library', url: 'https://mrlib.org/events/events/all-events.html' },
  ],
  'FullCalendar-Libraries': [
    { name: 'Blue Ridge Regional Library', url: 'https://events.brrl.us/iframe-events' },
  ],
  'WithApps-Libraries': [
    { name: 'Hampton Public Library', url: 'https://calendar.hampton.gov/hamptonva/calendar' },
  ],
  'WordPress-Events-Calendar': [
    { name: 'Washington County Public Library', url: 'https://www.wcpl.net/events/' },
    { name: 'Wythe-Grayson Regional Library', url: 'https://wythegrayson.lib.va.us/calendar/' },
    { name: 'Alleghany Highlands Regional Library', url: 'https://ahrlib.org/events/' },
    { name: 'Galax-Carroll Regional Library', url: 'https://galaxcarroll.lib.va.us/events/' },
    { name: 'Charlotte County Library', url: 'https://cclibrary.net/events/' },
    { name: 'Halifax County-South Boston Library', url: 'https://halifaxlibrary.org/events/' },
    { name: 'Blackwater Regional Library', url: 'https://blackwaterlib.org/events/' },
    { name: 'Rappahannock County Library', url: 'https://rappahannocklibrary.org/events/' },
    { name: 'Heritage Public Library', url: 'https://heritagepubliclibrary.org/events-programs/' },
    { name: 'Bristol Public Library', url: 'https://bristolpubliclibrary.org/events/' },
    { name: 'Pittsylvania County Public Library', url: 'https://pcplib.org/events/' },
    { name: 'Carnegie Library of Pittsburgh', url: 'https://www.carnegielibrary.org/events/' },
    { name: 'Osterhout Free Library', url: 'https://osterhout.info/events/' },
  ],
  'Squarespace-Libraries': [
    { name: 'Queen Anne\'s County Library', url: 'https://api3.libcal.com/embed_calendar.php?iid=3092&cal_id=13052' },
  ],
  'LibraryCalendar-Libraries': [
    { name: 'Howard County Library System', url: 'https://howardcounty.librarycalendar.com/events/month' },
    { name: 'Frederick County Public Libraries', url: 'https://frederick.librarycalendar.com/events/month' },
    { name: 'Talbot County Free Library', url: 'https://talbot.librarycalendar.com/events/month' },
    { name: 'Caroline County Public Library', url: 'https://carolinecounty.librarycalendar.com/events/month' },
    { name: 'Amherst County Public Library', url: 'https://amherstpl.librarycalendar.com/events/month' },
    { name: 'Appomattox Regional Library', url: 'https://appomattox.librarycalendar.com/events/month' },
    { name: 'Bedford Public Library System', url: 'https://bedford.librarycalendar.com/events/month' },
    { name: 'Essex Public Library', url: 'https://essex.librarycalendar.com/events/month' },
    { name: 'Lynchburg Public Library', url: 'https://lynchburg.librarycalendar.com/events/month' },
    { name: 'Petersburg Public Library', url: 'https://petersburg.librarycalendar.com/events/month' },
    { name: 'Poquoson Public Library', url: 'https://poquoson.librarycalendar.com/events/month' },
    { name: 'Powhatan County Public Library', url: 'https://powhatancounty.librarycalendar.com/events/month' },
    { name: 'Waynesboro Public Library', url: 'https://waynesboro.librarycalendar.com/events/month' },
    { name: 'York County Public Library', url: 'https://yorkcountyva.librarycalendar.com/events/month' },
    { name: 'Portsmouth Public Library', url: 'https://portsmouthpl.librarycalendar.com/events/month' },
    { name: 'Forsyth County Public Library', url: 'https://forsythcounty.librarycalendar.com/events/month' },
    { name: 'Cumberland County Public Library', url: 'https://cumberland.librarycalendar.com/events/month' },
    { name: 'Atlantic County Library System', url: 'https://atlanticcounty.librarycalendar.com/events/month' },
    { name: 'Gloucester County Library System', url: 'https://gcls.librarycalendar.com/events/month' },
    { name: 'York County Library (SC)', url: 'https://yorkcounty.librarycalendar.com/events/month' },
    { name: 'Bloomingdale Public Library', url: 'https://bloomingdale.librarycalendar.com/events/month' },
  ],
  'CustomDrupal-Libraries': [
    { name: 'Richland Library', url: 'https://www.richlandlibrary.com/events' },
    { name: 'Greenville County Library System', url: 'https://www.greenvillelibrary.org/events' },
    { name: 'Anderson County Library System', url: 'https://www.andersonlibrary.org/events/month' },
    { name: 'Florence County Library System', url: 'https://www.florencelibrary.org/events' },
    { name: 'Rowan County Public Library', url: 'https://www.rowancountylibrary.org/events/upcoming' },
    { name: 'Cobb County Public Library System', url: 'https://www.cobbcounty.gov/events?department=85' },
    { name: 'Kanawha County Public Library', url: 'https://www.kcpls.org/events/upcoming' },
  ],
  'Drupal-Virginia': [
    { name: 'Handley Regional Library', url: 'https://www.handleyregional.org/events/upcoming' },
  ],

  // ── Parks & Recreation ──
  'Localist-Parks': [
    { name: 'Pennsylvania State Parks', url: 'https://events.dcnr.pa.gov/api/2/events' },
    { name: 'Indiana State Parks', url: 'https://events.in.gov/api/2/events' },
  ],
  'Drupal-Parks': [
    { name: 'Vermont State Parks', url: 'https://fpr.vermont.gov/jsonapi/node/event' },
    { name: 'Wisconsin State Parks', url: 'https://dnr.wisconsin.gov/jsonapi/node/dnr_event' },
  ],
  'WordPressTec-Parks': [
    { name: 'West Virginia State Parks', url: 'https://wvstateparks.com/wp-json/tribe/events/v1/events' },
    { name: 'New Jersey State Parks', url: 'https://dep.nj.gov/wp-json/tribe/events/v1/events' },
  ],
  'NPS-Parks': [
    { name: 'National Park Service - DC', url: 'https://developer.nps.gov/api/v1/events?stateCode=DC' },
  ],
  'RecDesk-Parks': [
    { name: 'Mobile Parks and Recreation', url: 'https://mprd.recdesk.com' },
    { name: 'Jacksonville Parks and Recreation (AL)', url: 'https://jacksonvilleal.recdesk.com' },
    { name: 'Portland Parks & Recreation (CT)', url: 'https://portland.recdesk.com' },
    { name: 'West Hartford Leisure Services', url: 'https://westhartford.recdesk.com' },
    { name: 'City of Dover Parks & Recreation', url: 'https://cityofdover.recdesk.com' },
    { name: 'Maitland Parks & Recreation', url: 'https://maitland.recdesk.com' },
    { name: 'Woodstock Parks and Recreation', url: 'https://woodstock.recdesk.com' },
    { name: 'Charleston Parks & Recreation (IL)', url: 'https://charparksandrec.recdesk.com' },
    { name: 'Hendricks County Parks', url: 'https://hcparks.recdesk.com' },
    { name: 'Hopkinsville Parks', url: 'https://hpr.recdesk.com' },
    { name: 'Carroll County Rec & Parks (MD)', url: 'https://ccrec.recdesk.com' },
    { name: 'Worcester Parks (MA)', url: 'https://worcesterparksma.recdesk.com' },
    { name: 'Keene Parks (NH)', url: 'https://keeneparks.recdesk.com' },
    { name: 'Jersey City Recreation', url: 'https://jcrec.recdesk.com' },
    { name: 'Hoboken Parks & Recreation', url: 'https://hoboken.recdesk.com' },
    { name: 'Syracuse Parks', url: 'https://syracuse.recdesk.com' },
    { name: 'City of Akron Recreation & Parks', url: 'https://akron.recdesk.com' },
    { name: 'Providence Recreation', url: 'https://providenceri.recdesk.com' },
    { name: 'City of Aiken Parks', url: 'https://cityofaikensc.recdesk.com' },
    { name: 'Culpeper Recreation (VA)', url: 'https://crpr.recdesk.com' },
    { name: 'City of Wheeling Parks', url: 'https://wheeling.recdesk.com' },
    { name: 'Watertown Parks (WI)', url: 'https://watertownwi.recdesk.com' },
  ],
};

// ── Dynamic site loading for WordPress per-state scrapers ──
// These have 900+ libraries total — loaded from scraper files at runtime
function loadWordPressSites(scraperName) {
  const stateCode = scraperName.replace('WordPress-', '').toLowerCase();
  try {
    const filePath = `./scrapers/scraper-wordpress-libraries-${stateCode}.js`;
    // Read the file as text and count LIBRARIES entries
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf8');
    // Extract library names and URLs from the LIBRARIES array
    const sites = [];
    const re = /name:\s*['"]([^'"]+)['"]\s*,[\s\S]*?(?:eventsUrl|url|calendarUrl):\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      sites.push({ name: m[1], url: m[2] });
    }
    return sites.length > 0 ? sites : null;
  } catch (e) {
    return null;
  }
}

// Get sites for any scraper — static map first, then dynamic WordPress loader
function getSitesForScraper(scraperName) {
  if (SCRAPER_SITES[scraperName]) return SCRAPER_SITES[scraperName];
  if (scraperName.startsWith('WordPress-')) return loadWordPressSites(scraperName);
  return null;
}

// ==========================================
// CONFIG
// ==========================================

const VALID_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

const TARGET_STATES = ['MD','VA','DC','PA','OH','DE','NJ','NY','NC','WV'];

const PLACEHOLDER_VALUES = ['tbd','tba','n/a','none','unknown','null','undefined','test','xxx','---'];

// ==========================================
// HELPERS
// ==========================================

async function fetchAll(table, select = '*') {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) { console.error(`  Error fetching ${table}:`, error.message); break; }
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

function isPlaceholder(val) {
  if (!val || typeof val !== 'string') return false;
  return PLACEHOLDER_VALUES.includes(val.toLowerCase().trim());
}

function isValidUrl(val) {
  if (!val || typeof val !== 'string') return false;
  return /^https?:\/\/.+/.test(val.trim());
}

function isDateInPast(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    // Compare date-only (ignore time component) so today's events are never flagged as past.
    // Without this, events at midnight UTC on the current day get incorrectly flagged
    // when the check runs later in the day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(d);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay < today;
  } catch { return false; }
}

function printSection(title, emoji) {
  console.log(`\n${emoji} ${title}`);
  console.log('─'.repeat(60));
}

function pct(n, total) {
  if (total === 0) return '0.0';
  return ((n / total) * 100).toFixed(1);
}

function healthBadge(percent) {
  const p = parseFloat(percent);
  if (p >= 95) return '🟢';
  if (p >= 85) return '🟡';
  if (p >= 70) return '🟠';
  return '🔴';
}

// ==========================================
// 1. ACTIVITIES CHECK
// ==========================================

async function checkActivities() {
  printSection('ACTIVITIES / VENUES', '🏢');

  const data = await fetchAll('activities',
    'id, name, description, category, subcategory, state, city, address, zip_code, geohash, phone, url, age_range, is_free, scraper_name, location, price_range, hours, source'
  );

  if (data.length === 0) {
    console.log('  No activities found in database.');
    return { total: 0, issues: [] };
  }

  console.log(`  Total activities: ${data.length}`);

  const issues = [];
  const stats = {
    total: data.length,
    missingName: 0,
    missingState: 0,
    invalidState: 0,
    missingCity: 0,
    missingAddress: 0,
    missingGeohash: 0,
    missingDescription: 0,
    shortDescription: 0,
    missingCategory: 0,
    missingSubcategory: 0,
    missingPhone: 0,
    missingWebsite: 0,
    missingAgeRange: 0,
    placeholderValues: 0,
    missingLocation: 0,
  };

  // State & category distribution
  const stateCounts = {};
  const categoryCounts = {};
  const scraperCounts = {};
  const duplicateCheck = {};

  for (const row of data) {
    // --- Critical fields ---
    if (!row.name || row.name.trim().length === 0) {
      stats.missingName++;
      issues.push({ id: row.id, field: 'name', severity: 'critical', msg: 'Missing name' });
    }
    if (!row.state) {
      stats.missingState++;
      issues.push({ id: row.id, name: row.name, field: 'state', severity: 'critical', msg: 'Missing state' });
    } else if (!VALID_STATES.includes(row.state.toUpperCase())) {
      stats.invalidState++;
      issues.push({ id: row.id, name: row.name, field: 'state', severity: 'critical', msg: `Invalid state: "${row.state}"` });
    }
    if (!row.city || isPlaceholder(row.city)) {
      stats.missingCity++;
      issues.push({ id: row.id, name: row.name, field: 'city', severity: 'critical', msg: 'Missing city' });
    }
    if (!row.geohash) {
      stats.missingGeohash++;
      issues.push({ id: row.id, name: row.name, field: 'geohash', severity: 'critical', msg: 'Missing geohash (breaks map queries)' });
    }

    // --- Important fields ---
    if (!row.address || isPlaceholder(row.address)) stats.missingAddress++;
    if (!row.description || row.description.trim().length === 0) {
      stats.missingDescription++;
    } else if (row.description.trim().length < 30) {
      stats.shortDescription++;
    }
    if (!row.category) stats.missingCategory++;
    if (!row.subcategory) stats.missingSubcategory++;

    // --- Nice to have ---
    if (!row.phone || row.phone.trim().length === 0) stats.missingPhone++;
    if (!row.url || !isValidUrl(row.url)) stats.missingWebsite++;
    if (!row.age_range) stats.missingAgeRange++;

    // Check for placeholder values in key fields
    if (isPlaceholder(row.name) || isPlaceholder(row.city) || isPlaceholder(row.address)) {
      stats.placeholderValues++;
    }

    // Check location (PostGIS point or null)
    if (!row.location) stats.missingLocation++;

    // Distributions
    stateCounts[row.state || 'MISSING'] = (stateCounts[row.state || 'MISSING'] || 0) + 1;
    const cat = row.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    const site = row.source || row.scraper_name || 'unknown';
    scraperCounts[site] = (scraperCounts[site] || 0) + 1;

    // Duplicate detection
    const dupeKey = `${(row.name || '').toLowerCase().trim()}|${(row.city || '').toLowerCase().trim()}|${(row.state || '').toLowerCase().trim()}`;
    if (!duplicateCheck[dupeKey]) duplicateCheck[dupeKey] = [];
    duplicateCheck[dupeKey].push(row.id);
  }

  // Find actual duplicates
  const duplicates = Object.entries(duplicateCheck).filter(([, ids]) => ids.length > 1);

  // --- Print results ---
  const criticalCount = stats.missingName + stats.missingState + stats.invalidState + stats.missingCity + stats.missingGeohash;
  const completenessScore = pct(stats.total - criticalCount, stats.total);

  console.log(`\n  ${healthBadge(completenessScore)} Data Completeness: ${completenessScore}% (${stats.total - criticalCount}/${stats.total} pass critical checks)`);

  console.log(`\n  Critical (breaks app display):`);
  console.log(`    Missing name:       ${stats.missingName}`);
  console.log(`    Missing state:      ${stats.missingState}`);
  console.log(`    Invalid state:      ${stats.invalidState}`);
  console.log(`    Missing city:       ${stats.missingCity}`);
  console.log(`    Missing geohash:    ${stats.missingGeohash}`);
  console.log(`    Missing location:   ${stats.missingLocation}`);

  console.log(`\n  Important (hurts user experience):`);
  console.log(`    Missing address:      ${stats.missingAddress}`);
  console.log(`    Missing description:  ${stats.missingDescription}`);
  console.log(`    Short description:    ${stats.shortDescription} (<30 chars)`);
  console.log(`    Missing category:     ${stats.missingCategory}`);
  console.log(`    Missing subcategory:  ${stats.missingSubcategory}`);

  console.log(`\n  Nice to have:`);
  console.log(`    Missing phone:      ${stats.missingPhone}`);
  console.log(`    Missing website:    ${stats.missingWebsite}`);
  console.log(`    Missing age range:  ${stats.missingAgeRange}`);
  console.log(`    Placeholder values: ${stats.placeholderValues}`);

  if (duplicates.length > 0) {
    console.log(`\n  ⚠️  Duplicates found: ${duplicates.length} groups`);
    for (const [key, ids] of duplicates.slice(0, 10)) {
      const [name, city, state] = key.split('|');
      console.log(`    "${name}" in ${city}, ${state.toUpperCase()} — ${ids.length} copies`);
    }
    if (duplicates.length > 10) console.log(`    ... and ${duplicates.length - 10} more`);
  } else {
    console.log(`\n  ✅ No duplicate activities found`);
  }

  console.log(`\n  By state:`);
  for (const [s, c] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    const bar = '█'.repeat(Math.min(Math.round(c / 5), 40));
    console.log(`    ${(s || '??').padEnd(3)} ${String(c).padStart(5)}  ${bar}`);
  }

  console.log(`\n  By category:`);
  for (const [s, c] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${s.padEnd(25)} ${String(c).padStart(5)}`);
  }

  console.log(`\n  By site/source:`);
  for (const [s, c] of Object.entries(scraperCounts).sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`    ${s.padEnd(55)} ${String(c).padStart(5)}`);
  }

  // Print sample critical issues
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    console.log(`\n  Sample critical issues (first 10):`);
    for (const issue of criticalIssues.slice(0, 10)) {
      console.log(`    ${issue.name || issue.id}: ${issue.msg}`);
    }
  }

  return { total: stats.total, criticalCount, completenessScore, duplicates: duplicates.length, stats, stateCounts, categoryCounts };
}

// ==========================================
// 2. EVENTS CHECK
// ==========================================

async function checkEvents() {
  printSection('EVENTS', '📅');

  const data = await fetchAll('events',
    'id, name, event_date, date, description, venue, state, city, address, geohash, url, scraper_name, start_time, end_time, age_range, category, location, source_url, platform, created_at'
  );

  if (data.length === 0) {
    console.log('  No events found in database.');
    return { total: 0 };
  }

  console.log(`  Total events: ${data.length}`);

  // Non-family detection patterns (subset of what scrapers use)
  const ADULT_PATTERNS = [
    /\badults?\s*only\b/i,
    /\bfor\s+(older\s+)?adults\b/i,
    /\badult\s+(program|workshop|class|craft|event|coloring|book\s*club)\b/i,
    /\bcareer\s+(coach|counseli?ng|fair|services|workshop)\b/i,
    /\bjob\s+(search|seeker|fair|workshop)\b/i,
    /\bresume\s+(writing|workshop|help|review|clinic)\b/i,
    /\bnetworking\s+(event|mixer|session|group)\b/i,
    /\bseniors?\s+only\b/i,
    /\bfor\s+seniors\b/i,
    /\b(50|55|60|65)\s*\+/i,
    /\bwine\s+tasting\b/i,
    /\bbeer\s+tasting\b/i,
    /\bhappy\s+hour\b/i,
    /\bbar\s+crawl\b/i,
    /\bpub\s+crawl\b/i,
    /\bspeed\s+dating\b/i,
    /\bburlesque\b/i,
  ];
  const FAMILY_RESCUE = [
    /\bfamil(y|ies)\b/i, /\bkid/i, /\bchild/i, /\btoddler/i,
    /\bbab(y|ies)\b/i, /\binfant/i,
    /\ball\s*ages\b/i, /\bstorytime/i, /\bpuppet/i,
    /\bteen/i, /\byouth\b/i, /\bjunior\b/i,
    /\bpreschool/i, /\belementary/i,
    /\bexplorer/i, /\bmagic\s+(show|trick|class|camp|workshop|explorers?)\b/i,
    /\bfarmers?\s*market\b/i, /\bgreen\s*market\b/i,
    /\bcarnival\b/i, /\bmusical\b/i,
    /\btheater\b/i, /\btheatre\b/i,
    /\bswim\b/i, /\bkaraoke\b/i, /\bbingo\b/i,
    /\bspring\s*fest\b/i, /\bfall\s*fest\b/i,
    /\bfood\s+truck/i,
    /\bhome\s+game\b/i, /\bballpark\b/i, /\b(baseball|softball|little\s+league)\b/i,
    /\bsoccer\b|rugby|football/i,
    /\bfirst\s+friday\b/i, /\bfirst\s+thursday\b/i,
    /\bgarden\b/i, /\bbotanical\b/i,
    /\bfarm\b/i, /\bopen\s+house\b/i,
    /\bfestival\b/i,
    /\bmarket\b/i,
    /\bderby\b/i,
  ];
  function isAdultEvent(name, desc) {
    const text = `${name || ''} ${desc || ''}`;
    for (const p of ADULT_PATTERNS) {
      if (p.test(text) && !FAMILY_RESCUE.some(fp => fp.test(text))) return true;
    }
    return false;
  }

  // Cancelled/postponed detection
  const CANCELLED_PATTERN = /\b(cancelled|canceled|postponed|closed permanently|no longer)\b/i;

  const stats = {
    total: data.length,
    missingName: 0,
    missingEventDate: 0,
    missingState: 0,
    invalidState: 0,
    missingGeohash: 0,
    missingDescription: 0,
    missingVenue: 0,
    missingCity: 0,
    missingUrl: 0,
    missingStartTime: 0,
    missingEndTime: 0,
    missingCategory: 0,
    missingAgeRange: 0,
    missingParsedDate: 0,
    pastEvents: 0,
    missingLocation: 0,
    malformedDate: 0,
    adultEvents: 0,
    cancelledEvents: 0,
    junkTitles: 0,
    duplicateEvents: 0,
  };

  const stateCounts = {};
  const scraperCounts = {};
  const categoryCounts = {};
  const ageRangeCounts = {};
  const pastBySource = {};
  const missingDateBySource = {};
  const missingLocationBySource = {};
  const adultEventSamples = [];
  const cancelledSamples = [];
  const junkSamples = [];
  const duplicateCheck = {};

  for (const row of data) {
    // Critical
    if (!row.name || row.name.trim().length === 0) stats.missingName++;
    if (!row.event_date || row.event_date.trim().length === 0) {
      stats.missingEventDate++;
    } else {
      // Check for HTML garbage in dates
      if (row.event_date.includes('<') || row.event_date.includes('\n')) stats.malformedDate++;
    }
    if (!row.state) stats.missingState++;
    else if (!VALID_STATES.includes(row.state.toUpperCase())) stats.invalidState++;
    if (!row.geohash) stats.missingGeohash++;
    if (!row.location) {
      stats.missingLocation++;
      const src = row.scraper_name || 'unknown';
      missingLocationBySource[src] = (missingLocationBySource[src] || 0) + 1;
    }

    // Important
    if (!row.description) stats.missingDescription++;
    if (!row.venue) stats.missingVenue++;
    if (!row.city) stats.missingCity++;
    if (!row.url && !row.source_url) stats.missingUrl++;
    if (!row.start_time) stats.missingStartTime++;
    if (!row.end_time) stats.missingEndTime++;
    if (!row.category) stats.missingCategory++;
    if (!row.age_range) stats.missingAgeRange++;
    if (!row.date) {
      stats.missingParsedDate++;
      const src = row.scraper_name || 'unknown';
      missingDateBySource[src] = (missingDateBySource[src] || 0) + 1;
    }

    // Age range distribution
    ageRangeCounts[row.age_range || 'NULL'] = (ageRangeCounts[row.age_range || 'NULL'] || 0) + 1;

    // Past events check
    if (row.date && isDateInPast(row.date)) {
      stats.pastEvents++;
      const src = row.scraper_name || 'unknown';
      pastBySource[src] = (pastBySource[src] || 0) + 1;
    } else if (!row.date && row.event_date && isDateInPast(row.event_date)) {
      stats.pastEvents++;
      const src = row.scraper_name || 'unknown';
      pastBySource[src] = (pastBySource[src] || 0) + 1;
    }

    // Non-family/adult event detection
    if (isAdultEvent(row.name, row.description)) {
      stats.adultEvents++;
      if (adultEventSamples.length < 15) adultEventSamples.push({ name: row.name, scraper: row.scraper_name });
    }

    // Cancelled events
    if (row.name && CANCELLED_PATTERN.test(row.name)) {
      stats.cancelledEvents++;
      if (cancelledSamples.length < 10) cancelledSamples.push(row.name);
    }

    // Junk titles (very short, all caps gibberish, or suspicious patterns)
    if (row.name && (row.name.trim().length < 5 || /^[A-Z\s\d]{3,}$/.test(row.name.trim()) && row.name.trim().length < 8)) {
      stats.junkTitles++;
      if (junkSamples.length < 10) junkSamples.push(row.name);
    }

    // Duplicate detection (same name + same date + same venue)
    const dupeKey = `${(row.name || '').toLowerCase().trim()}|${(row.event_date || '').toLowerCase().trim()}|${(row.venue || '').toLowerCase().trim()}`;
    if (!duplicateCheck[dupeKey]) duplicateCheck[dupeKey] = [];
    duplicateCheck[dupeKey].push(row.id);

    // Distributions
    stateCounts[row.state || 'MISSING'] = (stateCounts[row.state || 'MISSING'] || 0) + 1;
    const scraper = row.scraper_name || 'unknown';
    scraperCounts[scraper] = (scraperCounts[scraper] || 0) + 1;
    categoryCounts[row.category || 'Uncategorized'] = (categoryCounts[row.category || 'Uncategorized'] || 0) + 1;
  }

  // Count duplicates
  const duplicates = Object.entries(duplicateCheck).filter(([, ids]) => ids.length > 1);
  stats.duplicateEvents = duplicates.reduce((sum, [, ids]) => sum + ids.length - 1, 0); // extra copies

  const criticalCount = stats.missingName + stats.missingEventDate + stats.missingState + stats.invalidState + stats.missingGeohash;
  const completenessScore = pct(stats.total - criticalCount, stats.total);

  console.log(`\n  ${healthBadge(completenessScore)} Data Completeness: ${completenessScore}% (${stats.total - criticalCount}/${stats.total} pass critical checks)`);

  console.log(`\n  Critical:`);
  console.log(`    Missing name:        ${stats.missingName}`);
  console.log(`    Missing event_date:  ${stats.missingEventDate}`);
  console.log(`    Malformed dates:     ${stats.malformedDate}`);
  console.log(`    Missing state:       ${stats.missingState}`);
  console.log(`    Invalid state:       ${stats.invalidState}`);
  console.log(`    Missing geohash:     ${stats.missingGeohash}`);
  console.log(`    Missing location:    ${stats.missingLocation}`);
  if (stats.missingLocation > 0) {
    console.log(`      By scraper (top 10):`);
    for (const [src, c] of Object.entries(missingLocationBySource).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`        ${src.padEnd(45)} ${c}`);
    }
  }

  console.log(`\n  Important:`);
  console.log(`    Missing description: ${stats.missingDescription}`);
  console.log(`    Missing venue:       ${stats.missingVenue}`);
  console.log(`    Missing city:        ${stats.missingCity}`);
  console.log(`    Missing URL:         ${stats.missingUrl}`);
  console.log(`    Missing start_time:  ${stats.missingStartTime}`);
  console.log(`    Missing end_time:    ${stats.missingEndTime}`);
  console.log(`    Missing category:    ${stats.missingCategory}`);
  console.log(`    Missing age_range:   ${stats.missingAgeRange}`);
  console.log(`    Missing parsed date: ${stats.missingParsedDate} (TIMESTAMPTZ column)`);
  if (stats.missingParsedDate > 0) {
    console.log(`      By scraper (top 10):`);
    for (const [src, c] of Object.entries(missingDateBySource).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`        ${src.padEnd(45)} ${c}`);
    }
  }

  console.log(`\n  Content Quality:`);
  console.log(`    Adult/non-family:    ${stats.adultEvents}`);
  console.log(`    Cancelled/postponed: ${stats.cancelledEvents}`);
  console.log(`    Junk titles:         ${stats.junkTitles}`);
  console.log(`    Duplicate events:    ${stats.duplicateEvents} extra copies (${duplicates.length} groups)`);

  if (stats.adultEvents > 0 && adultEventSamples.length > 0) {
    console.log(`\n    Adult event samples:`);
    for (const s of adultEventSamples.slice(0, 10)) {
      console.log(`      ❌ [${s.scraper || '?'}] "${(s.name || '').substring(0, 55)}"`);
    }
  }

  if (stats.cancelledEvents > 0 && cancelledSamples.length > 0) {
    console.log(`\n    Cancelled event samples:`);
    for (const s of cancelledSamples.slice(0, 5)) {
      console.log(`      🚫 "${s.substring(0, 60)}"`);
    }
  }

  if (stats.pastEvents > 0) {
    console.log(`\n  ⚠️  Past events still in DB: ${stats.pastEvents}`);
    console.log(`    By source (top 10):`);
    for (const [src, c] of Object.entries(pastBySource).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`      ${src.padEnd(40)} ${c}`);
    }
  }

  if (duplicates.length > 0) {
    console.log(`\n  ⚠️  Duplicate event groups: ${duplicates.length}`);
    for (const [key, ids] of duplicates.slice(0, 10)) {
      const [name] = key.split('|');
      console.log(`    "${name.substring(0, 50)}" — ${ids.length} copies`);
    }
    if (duplicates.length > 10) console.log(`    ... and ${duplicates.length - 10} more`);
  }

  console.log(`\n  By age range:`);
  for (const [ar, c] of Object.entries(ageRangeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${ar.padEnd(25)} ${String(c).padStart(5)}  (${pct(c, stats.total)}%)`);
  }

  console.log(`\n  By state:`);
  for (const [s, c] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    const bar = '█'.repeat(Math.min(Math.round(c / 10), 40));
    console.log(`    ${(s || '??').padEnd(3)} ${String(c).padStart(5)}  ${bar}`);
  }

  console.log(`\n  By category:`);
  for (const [s, c] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${s.padEnd(30)} ${String(c).padStart(5)}`);
  }

  return { total: stats.total, criticalCount, completenessScore, pastEvents: stats.pastEvents, stats, stateCounts, scraperCounts };
}

// ==========================================
// 3. SCRAPER HEALTH CHECK
// ==========================================

async function checkScrapers(eventScraperCounts) {
  printSection('SCRAPER HEALTH', '🤖');

  // Get scraper logs
  const logs = await fetchAll('scraper_logs',
    'id, scraper_name, status, events_found, events_saved, events_skipped, error_message, duration_ms'
  );

  if (logs.length === 0) {
    // Try alternate table name (some scripts use Firestore compat layer)
    const logs2 = await fetchAll('scraper_logs',
      'id, scraper_name, status, events_found, events_saved'
    );
    if (logs2.length === 0) {
      console.log('  No scraper logs found.');
      return {};
    }
    // Use the alternate format
    return checkScraperLogsAlt(logs2, eventScraperCounts);
  }

  console.log(`  Total scraper log entries: ${logs.length}`);

  // Group by scraper
  const scraperMap = {};
  for (const log of logs) {
    const name = log.scraper_name || 'unknown';
    if (!scraperMap[name]) scraperMap[name] = [];
    scraperMap[name].push(log);
  }

  const scraperNames = Object.keys(scraperMap);
  console.log(`  Unique scrapers in logs: ${scraperNames.length}`);

  // Helper: check if a log name maps to an active registry scraper
  function isActiveInRegistry(logName) {
    const registryName = logName.replace(/^Local-/, '');
    return !!(ACTIVE_SCRAPERS[registryName] || ACTIVE_SCRAPERS[logName]);
  }

  function isOneOffImport(name) {
    return /\d{4}$/.test(name) || /^(MarylandKid|DMV-|Pennsylvania-|Waterparks-|Summer-|Gyms-|add-|fix-|backfill-)/.test(name);
  }

  // Build a set of registry keys we've already accounted for, to avoid double-counting
  // when both "Local-Foo" and "Foo" appear in logs for the same registry entry
  const accountedRegistryKeys = new Set();

  // Classify each scraper from logs into exactly one category:
  //   healthy, zeroEvent, or ignored (not in registry / one-off import)
  // A scraper can also independently be "failed" (latest run errored)
  const zeroEventScrapers = [];
  const failedScrapers = [];
  const healthyScrapers = [];

  for (const [name, runs] of Object.entries(scraperMap)) {
    const registryName = name.replace(/^Local-/, '');

    // Skip if not active in registry or is a one-off import
    if (!isActiveInRegistry(name) || isOneOffImport(name)) continue;

    // Skip if we already counted this registry entry via a different log name
    const registryKey = ACTIVE_SCRAPERS[registryName] ? registryName : name;
    if (accountedRegistryKeys.has(registryKey)) continue;
    accountedRegistryKeys.add(registryKey);

    // Check latest run status
    const latest = runs[runs.length - 1];
    if (latest.status === 'error' || latest.status === 'failed') {
      failedScrapers.push({ name, error: latest.error_message });
    }

    // Check for zero events across all runs
    const totalEventsFound = runs.reduce((sum, r) => sum + (r.events_found || 0), 0);
    const totalEventsSaved = runs.reduce((sum, r) => sum + (r.events_saved || 0), 0);

    // Also check if this scraper has events in the DB (cross-reference)
    let hasEventsInDB = false;
    if (eventScraperCounts) {
      hasEventsInDB = (eventScraperCounts[name] > 0) || (eventScraperCounts[registryName] > 0);
    }

    if (totalEventsFound === 0 && totalEventsSaved === 0 && !hasEventsInDB) {
      zeroEventScrapers.push({ name, runs: runs.length });
    } else {
      healthyScrapers.push(name);
    }
  }

  // Check for registry scrapers that have NO log entries at all (never ran)
  const neverRanScrapers = [];
  for (const registryKey of Object.keys(ACTIVE_SCRAPERS)) {
    if (accountedRegistryKeys.has(registryKey)) continue;
    // Check if it appeared under a "Local-" prefix
    if (accountedRegistryKeys.has(`Local-${registryKey}`)) continue;
    neverRanScrapers.push(registryKey);
  }

  // Print event counts by scraper from DB
  if (eventScraperCounts) {
    console.log(`\n  Scrapers by event count in DB:`);
    const sorted = Object.entries(eventScraperCounts).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted.slice(0, 15)) {
      console.log(`    ${name.padEnd(40)} ${String(count).padStart(5)} events`);
    }
  }

  // Count active scrapers in registry for accurate totals
  const activeRegistryCount = Object.keys(ACTIVE_SCRAPERS).length;
  const activeTotal = activeRegistryCount || scraperNames.length; // fallback if registry unavailable

  // Print results
  console.log(`\n  Summary:`);
  console.log(`    Active scrapers (registry): ${activeRegistryCount}`);
  console.log(`    Healthy:              ${healthyScrapers.length}`);
  console.log(`    Zero-event:           ${zeroEventScrapers.length} scrapers`);
  console.log(`    Failed (latest run):  ${failedScrapers.length}`);
  if (neverRanScrapers.length > 0) {
    console.log(`    Never ran (no logs):  ${neverRanScrapers.length}`);
  }

  // Count total zero-event websites
  const zeroEventWebsites = [];
  for (const s of zeroEventScrapers) {
    const registryName = s.name.replace(/^Local-/, '');
    const sites = getSitesForScraper(registryName);
    if (sites && sites.length > 0) {
      for (const site of sites) {
        zeroEventWebsites.push({ scraper: registryName, name: site.name, url: site.url, runs: s.runs });
      }
    } else {
      zeroEventWebsites.push({ scraper: registryName, name: registryName, url: '', runs: s.runs });
    }
  }

  if (zeroEventWebsites.length > 0) {
    console.log(`\n  🔴 Zero-event websites (${zeroEventWebsites.length} sites across ${zeroEventScrapers.length} scrapers):`);
    let currentScraper = '';
    for (const site of zeroEventWebsites) {
      if (site.scraper !== currentScraper) {
        currentScraper = site.scraper;
        console.log(`\n    [${currentScraper}] (${site.runs} runs):`);
      }
      if (site.url) {
        console.log(`      ${site.name}`);
        console.log(`        ${site.url}`);
      } else {
        console.log(`      ${site.name} (single-site scraper)`);
      }
    }
  }

  if (failedScrapers.length > 0) {
    console.log(`\n  🔴 Failed scrapers (latest run):`);
    for (const s of failedScrapers.slice(0, 10)) {
      console.log(`    ${s.name}: ${(s.error || 'no error message').substring(0, 80)}`);
    }
  }

  // Build per-website breakdown for never-ran scrapers
  let neverRanSiteCount = 0;
  const neverRanWebsites = [];
  for (const name of neverRanScrapers) {
    const sites = getSitesForScraper(name);
    if (sites && sites.length > 0) {
      neverRanSiteCount += sites.length;
      neverRanWebsites.push({ scraper: name, sites });
    } else {
      neverRanSiteCount += 1;
      neverRanWebsites.push({ scraper: name, sites: null });
    }
  }

  if (neverRanScrapers.length > 0) {
    console.log(`\n  ⚠️  Registered but never ran (${neverRanScrapers.length} scrapers, ${neverRanSiteCount} websites):`);
    for (const entry of neverRanWebsites) {
      if (entry.sites && entry.sites.length > 0) {
        console.log(`\n    [${entry.scraper}] (${entry.sites.length} sites):`);
        // Show first 5 sites, summarize the rest
        const toShow = entry.sites.slice(0, 5);
        for (const site of toShow) {
          console.log(`      ${site.name}`);
          console.log(`        ${site.url}`);
        }
        if (entry.sites.length > 5) {
          console.log(`      ... and ${entry.sites.length - 5} more`);
        }
      } else {
        console.log(`\n    [${entry.scraper}] (single-site)`);
      }
    }
  }

  return { total: activeTotal, healthy: healthyScrapers.length, zeroEvent: zeroEventScrapers.length, zeroEventSites: zeroEventWebsites.length, failed: failedScrapers.length, neverRan: neverRanScrapers.length, neverRanSites: neverRanSiteCount };
}

// Alternate scraper log format (scraperLogs collection via Firestore compat layer)
async function checkScraperLogsAlt(logs, eventScraperCounts) {
  console.log(`  Total scraper log entries: ${logs.length}`);

  const scraperMap = {};
  for (const log of logs) {
    const name = log.scraperName || log.scraper_name || 'unknown';
    if (!scraperMap[name]) scraperMap[name] = [];
    scraperMap[name].push(log);
  }

  const scraperNames = Object.keys(scraperMap);
  console.log(`  Unique scrapers in logs: ${scraperNames.length}`);

  function isOneOffImport(name) {
    return /\d{4}$/.test(name) || /^(MarylandKid|DMV-|Pennsylvania-|Waterparks-|Summer-|Gyms-|add-|fix-|backfill-)/.test(name);
  }

  const accountedRegistryKeys = new Set();
  const zeroEventScrapers = [];
  const failedScrapers = [];
  const healthyScrapers = [];

  for (const [name, runs] of Object.entries(scraperMap)) {
    const registryName = name.replace(/^Local-/, '');
    const isActive = !!(ACTIVE_SCRAPERS[registryName] || ACTIVE_SCRAPERS[name]);

    // Skip if not active in registry or is a one-off import
    if (!isActive || isOneOffImport(name)) continue;

    // Skip if we already counted this registry entry via a different log name
    const registryKey = ACTIVE_SCRAPERS[registryName] ? registryName : name;
    if (accountedRegistryKeys.has(registryKey)) continue;
    accountedRegistryKeys.add(registryKey);

    const totalSaved = runs.reduce((sum, r) => sum + (r.activitiesSaved || r.events_saved || 0), 0);
    const totalLocations = runs.reduce((sum, r) => sum + (r.totalLocations || 0), 0);
    const hasFailure = runs.some(r => r.status === 'error' || r.status === 'failed' || (r.activitiesFailed || 0) > 0);

    // Cross-reference with events table
    let hasEventsInDB = false;
    if (eventScraperCounts) {
      hasEventsInDB = (eventScraperCounts[name] > 0) || (eventScraperCounts[registryName] > 0);
    }

    if (totalSaved === 0 && totalLocations === 0 && !hasEventsInDB) {
      zeroEventScrapers.push({ name, runs: runs.length });
    } else {
      healthyScrapers.push(name);
    }
    if (hasFailure) {
      failedScrapers.push({ name });
    }
  }

  const activeRegistryCount = Object.keys(ACTIVE_SCRAPERS).length;
  const activeTotal = activeRegistryCount || scraperNames.length;

  console.log(`\n  Summary:`);
  console.log(`    Active scrapers (registry): ${activeRegistryCount}`);
  console.log(`    Healthy:              ${healthyScrapers.length}`);
  console.log(`    Zero-event scrapers:  ${zeroEventScrapers.length} (check per-website detail below)`);
  console.log(`    Had failures:         ${failedScrapers.length}`);

  if (zeroEventScrapers.length > 0) {
    const altZeroSites = [];
    for (const s of zeroEventScrapers) {
      const rn = s.name.replace(/^Local-/, '');
      const sites = getSitesForScraper(rn);
      if (sites && sites.length > 0) {
        for (const site of sites) altZeroSites.push({ scraper: rn, name: site.name, url: site.url, runs: s.runs });
      } else {
        altZeroSites.push({ scraper: rn, name: rn, url: '', runs: s.runs });
      }
    }
    console.log(`\n  🔴 Zero-event websites (${altZeroSites.length} sites across ${zeroEventScrapers.length} scrapers):`);
    for (const site of altZeroSites.slice(0, 30)) {
      console.log(`    - ${site.name}${site.url ? ' (' + site.url + ')' : ''} [${site.scraper}]`);
    }
    if (altZeroSites.length > 30) console.log(`    ... and ${altZeroSites.length - 30} more`);
  }

  return { total: activeTotal, healthy: healthyScrapers.length, zeroEvent: zeroEventScrapers.length, failed: failedScrapers.length };
}

// ==========================================
// 4. OVERALL SUMMARY
// ==========================================

function printOverallSummary(activitiesResult, eventsResult, scraperResult) {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  FUNHIVE DATA QUALITY REPORT — SUMMARY'.padEnd(58) + '║');
  console.log('╠' + '═'.repeat(58) + '╣');

  if (activitiesResult && activitiesResult.total > 0) {
    const badge = healthBadge(activitiesResult.completenessScore);
    console.log(`║  ${badge} Activities:  ${String(activitiesResult.total).padStart(6)} total, ${activitiesResult.completenessScore}% complete`.padEnd(59) + '║');
    console.log(`║     Critical issues: ${String(activitiesResult.criticalCount).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Duplicates:      ${String(activitiesResult.duplicates).padStart(5)}`.padEnd(59) + '║');
  }

  if (eventsResult && eventsResult.total > 0) {
    const badge = healthBadge(eventsResult.completenessScore);
    console.log(`║  ${badge} Events:      ${String(eventsResult.total).padStart(6)} total, ${eventsResult.completenessScore}% complete`.padEnd(59) + '║');
    console.log(`║     Critical issues: ${String(eventsResult.criticalCount).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Past events:     ${String(eventsResult.pastEvents).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Missing age_range:${String(eventsResult.stats?.missingAgeRange || 0).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Adult/non-family: ${String(eventsResult.stats?.adultEvents || 0).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Duplicates:       ${String(eventsResult.stats?.duplicateEvents || 0).padStart(5)}`.padEnd(59) + '║');
  }

  if (scraperResult && scraperResult.total > 0) {
    const healthyCount = scraperResult.healthy || 0;
    const scraperHealthPct = pct(healthyCount, scraperResult.total);
    const badge = healthBadge(scraperHealthPct);
    console.log(`║  ${badge} Scrapers:    ${String(scraperResult.total).padStart(6)} registered, ${scraperHealthPct}% healthy`.padEnd(59) + '║');
    console.log(`║     Healthy:          ${String(healthyCount).padStart(5)}`.padEnd(59) + '║');
    console.log(`║     Zero-event:       ${String(scraperResult.zeroEvent || 0).padStart(5)} scrapers (${scraperResult.zeroEventSites || 0} websites)`.padEnd(59) + '║');
    console.log(`║     Failed:           ${String(scraperResult.failed || 0).padStart(5)}`.padEnd(59) + '║');
    if (scraperResult.neverRan) {
      console.log(`║     Never ran:        ${String(scraperResult.neverRan).padStart(5)} scrapers (${scraperResult.neverRanSites || 0} websites)`.padEnd(59) + '║');
    }
  }

  // Overall health
  let overallHealth = '🟢 HEALTHY';
  const scores = [];
  if (activitiesResult?.completenessScore) scores.push(parseFloat(activitiesResult.completenessScore));
  if (eventsResult?.completenessScore) scores.push(parseFloat(eventsResult.completenessScore));
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 70) overallHealth = '🔴 NEEDS ATTENTION';
    else if (avg < 85) overallHealth = '🟠 FAIR';
    else if (avg < 95) overallHealth = '🟡 GOOD';
  }

  console.log('╠' + '═'.repeat(58) + '╣');
  console.log(`║  Overall: ${overallHealth}`.padEnd(59) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  const totalItems = (activitiesResult?.total || 0) + (eventsResult?.total || 0);
  console.log(`\n  📊 Total items in database: ${totalItems}`);
  console.log(`  🕐 Report generated: ${new Date().toISOString()}\n`);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  const activitiesOnly = args.includes('--activities');
  const eventsOnly = args.includes('--events');
  const scrapersOnly = args.includes('--scrapers');
  const runAll = !activitiesOnly && !eventsOnly && !scrapersOnly;

  console.log('\n' + '═'.repeat(60));
  console.log('  FUNHIVE COMPLETE DATA QUALITY CHECK');
  console.log('═'.repeat(60));
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Scope: ${runAll ? 'Full (activities + events + scrapers)' : args.join(', ')}`);

  let activitiesResult = null;
  let eventsResult = null;
  let scraperResult = null;

  if (runAll || activitiesOnly) {
    activitiesResult = await checkActivities();
  }

  if (runAll || eventsOnly) {
    eventsResult = await checkEvents();
  }

  // Build a combined scraper count from both tables for the scraper check
  let combinedScraperCounts = {};
  if (eventsResult?.scraperCounts) {
    combinedScraperCounts = { ...eventsResult.scraperCounts };
  }

  if (runAll || scrapersOnly) {
    scraperResult = await checkScrapers(combinedScraperCounts);
  }

  // Overall summary
  printOverallSummary(activitiesResult, eventsResult, scraperResult);
}

main().then(() => process.exit(0)).catch(e => { console.error('❌ Fatal error:', e); process.exit(1); });
