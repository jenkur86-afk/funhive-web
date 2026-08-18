// 17 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
//
// A FURTHER 17 removed 2026-08-10, same defect, different evidence path: these came from
// the daily diagnosis's Step 3d live verification of this file's zero-event entries, which
// checked each site individually rather than one fetch per shared host. Listed in
// reports/pa-removals-2026-08-10.json. Highlights: harrisburglibrary.org is Harrisburg
// district library in ILLINOIS (not Dauphin County PA), eastonlibrary.org is Easton
// CONNECTICUT, greenvillelibrary.org is Greenville County SOUTH CAROLINA.
// One entry was CORRECTED rather than removed: hamlinlibrary.org is a real PA library
// (Hamlin Memorial, Smethport) that had been filed under the wrong name, city and county.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: PA
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Free Library of Philadelphia",
    "url": "https://www.freelibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://libwww.freelibrary.org/calendar"
  },
  {
    "name": "Carnegie Library of Pittsburgh",
    "url": "https://www.carnegielibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.carnegielibrary.org/events"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Free Library of Philadelphia",
    "url": "https://www.freelibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://libwww.freelibrary.org/calendar", county: 'Philadelphia'},
  {
    "name": "Carnegie Library of Pittsburgh",
    "url": "https://www.carnegielibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.carnegielibrary.org/events", county: 'Allegheny'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Altoona Area Public Library', url: 'https://www.altoonalibrary.org', eventsUrl: 'https://www.altoonalibrary.org/events', city: 'Altoona', state: 'PA', zipCode: '16602', county: 'Blair'},
  { name: 'Aston Public Library', url: 'https://www.astonlibrary.org', eventsUrl: 'https://www.astonlibrary.org/events', city: 'Aston', state: 'PA', zipCode: '19014', county: 'Delaware'},
  // URL corrected 2026-08-11 (was athenslibrary.org): 724 South Main Street Athens PA 18810, phone 570-888-7117
  { name: 'Spalding Memorial Library', url: 'http://spaldinglibrary.org', eventsUrl: 'http://spaldinglibrary.org', city: 'Athens', state: 'PA', zipCode: '18810', county: 'Bradford'},
  { name: 'Avalon Public Library', url: 'https://avalonlibrary.org/', eventsUrl: 'https://avalonlibrary.org/', city: 'Avalon', state: 'PA', zipCode: '15202', county: 'Allegheny'},
  { name: 'Avella Area Library Center', url: 'https://www.avellalibrary.org', eventsUrl: 'https://www.avellalibrary.org/events', city: 'Avella', state: 'PA', zipCode: '15312', county: 'Washington'},
  { name: 'Avonmore Public Library', url: 'https://www.avonmorelibrary.org', eventsUrl: 'https://www.avonmorelibrary.org/events', city: 'Avonmore', state: 'PA', zipCode: '15618', county: 'Westmoreland'},
  { name: 'Bangor Public Library', url: 'https://www.bangorlibrary.org', eventsUrl: 'https://www.bangorlibrary.org/events', city: 'Bangor', state: 'PA', zipCode: '18013', county: 'Northampton'},
  { name: 'Beaver County Bookmobile Schedule', url: 'https://www.beaverfallslibrary.org', eventsUrl: 'https://www.beaverfallslibrary.org/events', city: 'Beaver Falls', state: 'PA', zipCode: '15010', county: 'Beaver'},
  { name: 'Belle Vernon Public Library', url: 'https://www.bellevernonlibrary.org/', eventsUrl: 'https://www.bellevernonlibrary.org/upcoming-events/', city: 'Belle Vernon', state: 'PA', zipCode: '15012', county: 'Fayette'},
  { name: 'Bellwood Antis Public Library', url: 'https://www.bellwoodlibrary.org', eventsUrl: 'https://www.bellwoodlibrary.org/events', city: 'Bellwood', state: 'PA', zipCode: '16617', county: 'Blair'},
  { name: 'Bernville Area Community Library', url: 'https://www.bernvillelibrary.org', eventsUrl: 'https://www.bernvillelibrary.org/events', city: 'Bernville', state: 'PA', zipCode: '19506', county: 'Berks'},
  { name: 'Bethel-Tulpehocken Public Library', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'PA', zipCode: '19507', county: 'Berks'},
  { name: 'Bethel Park Public Library', url: 'https://www.bethelparklibrary.org/', eventsUrl: 'https://www.bethelparklibrary.org/', city: 'Bethel Park', state: 'PA', zipCode: '15102', county: 'Allegheny'},
  { name: 'Bethlehem Area Public Library', url: 'https://www.bethlehemlibrary.org', eventsUrl: 'https://www.bethlehemlibrary.org/events', city: 'Bethlehem', state: 'PA', zipCode: '18018', county: 'Northampton'},
  { name: 'Boyertown Community Library', url: 'https://www.boyertownlibrary.org', eventsUrl: 'https://www.boyertownlibrary.org/events', city: 'Boyertown', state: 'PA', zipCode: '19512', county: 'Berks'},
  { name: 'Bradford Area Public Library', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'PA', zipCode: '16701', county: 'Bradford County'},
  { name: 'Bridgeville Public Library', url: 'https://bridgevillelibrary.org/', eventsUrl: 'https://bridgevillelibrary.org/', city: 'Bridgeville', state: 'PA', zipCode: '15017', county: 'Allegheny'},
  { name: 'Mengle Memorial Library', url: 'https://www.brockwaylibrary.org', eventsUrl: 'https://www.brockwaylibrary.org/events', city: 'Brockway', state: 'PA', zipCode: '15824', county: 'Jefferson'},
  { name: 'Butler Area Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'PA', zipCode: '16001', county: 'Butler County'},
  { name: 'Green Free Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'PA', zipCode: '17724', county: 'Bradford'},
  { name: 'Carbondale Public Library', url: 'https://carbondalelibrary.org/', eventsUrl: 'https://carbondalelibrary.org/', city: 'Carbondale', state: 'PA', zipCode: '18407', county: 'Lackawanna'},
  { name: 'Bosler Free Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'PA', zipCode: '17013', county: 'Cumberland'},
  { name: 'Andrew Carnegie Free Library', url: 'https://www.carnegielibrary.org', eventsUrl: 'https://www.carnegielibrary.org/events', city: 'Carnegie', state: 'PA', zipCode: '15106', county: 'Allegheny'},
  { name: 'Community Library Of Castle Shannon', url: 'https://castleshannonlibrary.org/', eventsUrl: 'https://castleshannonlibrary.org/', city: 'Castle Shannon', state: 'PA', zipCode: '15234', county: 'Allegheny'},
  { name: 'Chester Springs Library', url: 'https://www.chesterspringslibrary.org/', eventsUrl: 'https://www.chesterspringslibrary.org/', city: 'Chester Springs', state: 'PA', zipCode: '19425', county: 'Chester'},
  { name: 'Moores Memorial Library', url: 'https://www.christianalibrary.org', eventsUrl: 'https://www.christianalibrary.org/events', city: 'Christiana', state: 'PA', zipCode: '17509', county: 'Lancaster'},
  { name: 'Clairton Public Library', url: 'https://clairtonlibrary.org/', eventsUrl: 'https://clairtonlibrary.org/', city: 'Clairton', state: 'PA', zipCode: '15025', county: 'Allegheny'},
  { name: 'Claysburg Area Public Library Inc', url: 'https://www.claysburglibrary.org', eventsUrl: 'https://www.claysburglibrary.org/events', city: 'Claysburg', state: 'PA', zipCode: '16625', county: 'Blair'},
  { name: 'Coatesville Area Public Library', url: 'https://www.coatesvillelibrary.org', eventsUrl: 'https://www.coatesvillelibrary.org/events', city: 'Coatesville', state: 'PA', zipCode: '19320', county: 'Chester'},
  { name: 'Cooperstown Public Library', url: 'https://www.cooperstownlibrary.org', eventsUrl: 'https://www.cooperstownlibrary.org/events', city: 'Cooperstown', state: 'PA', zipCode: '16317', county: 'Venango'},
  { name: 'Coraopolis Memorial Library', url: 'https://coraopolislibrary.org/', eventsUrl: 'https://coraopolislibrary.org/', city: 'Coraopolis', state: 'PA', zipCode: '15108', county: 'Allegheny'},
  { name: 'Corry Public Library', url: 'https://www.corrylibrary.org', eventsUrl: 'https://www.corrylibrary.org/events', city: 'Corry', state: 'PA', zipCode: '16407', county: 'Erie'},
  { name: 'Coudersport Public Library', url: 'https://www.coudersportlibrary.org', eventsUrl: 'https://www.coudersportlibrary.org/events', city: 'Coudersport', state: 'PA', zipCode: '16915', county: 'Potter'},
  { name: 'Back Mountain Memorial Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'PA', zipCode: '18612', county: 'Luzerne'},
  { name: 'Dalton Community Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'PA', zipCode: '18414', county: 'Lackawanna'},
  { name: 'Darby Library', url: 'https://www.darbylibrary.org', eventsUrl: 'https://www.darbylibrary.org/events', city: 'Darby', state: 'PA', zipCode: '19023', county: 'Delaware'},
  { name: 'Delmont Public Library', url: 'https://www.delmontlibrary.org', eventsUrl: 'https://www.delmontlibrary.org/events', city: 'Delmont', state: 'PA', zipCode: '15626', county: 'Westmoreland'},
  { name: 'Downingtown Library Company', url: 'https://downingtownlibrary.org/', eventsUrl: 'https://downingtownlibrary.org/home/', city: 'Downingtown', state: 'PA', zipCode: '19335', county: 'Chester'},
  { name: 'East Berlin Community Library', url: 'https://www.adamslibrary.org/', eventsUrl: 'https://www.adamslibrary.org/events/upcoming', city: 'East Berlin', state: 'PA', zipCode: '17316', county: 'Adams'},
  { name: 'Ellwood City Area Pub Library', url: 'https://www.ellwoodcitylibrary.org', eventsUrl: 'https://www.ellwoodcitylibrary.org/events', city: 'Ellwood City', state: 'PA', zipCode: '16117', county: 'Lawrence'},
  { name: 'Emmaus Public Library', url: 'https://www.emmauslibrary.org/', eventsUrl: 'https://www.emmauslibrary.org/', city: 'Emmaus', state: 'PA', zipCode: '18049', county: 'Lehigh'},
  { name: 'Barbara Moscato Brown Memorial Library', url: 'https://www.emporiumlibrary.org', eventsUrl: 'https://www.emporiumlibrary.org/events', city: 'Emporium', state: 'PA', zipCode: '15834', county: 'Cameron'},
  { name: 'Erie County Public Library', url: 'https://erielibrary.org/', eventsUrl: 'https://erielibrary.org/', city: 'Erie', state: 'PA', zipCode: '16507', county: 'Erie County'},
  { name: 'Evans City Public Library', url: 'https://www.evanscitylibrary.org', eventsUrl: 'https://www.evanscitylibrary.org/events', city: 'Evans City', state: 'PA', zipCode: '16033', county: 'Butler'},
  { name: 'Everett Free Library', url: 'https://www.everettlibrary.org', eventsUrl: 'https://www.everettlibrary.org/events', city: 'Everett', state: 'PA', zipCode: '15537', county: 'Bedford'},
  { name: 'Bucks County Free Library - Fallsington Library', url: 'https://www.fallsingtonlibrary.org', eventsUrl: 'https://www.fallsingtonlibrary.org/events', city: 'Fallsington', state: 'PA', zipCode: '19054', county: 'Bucks'},
  { name: 'Fleetwood Area Public Library', url: 'https://www.fleetwoodlibrary.org', eventsUrl: 'https://www.fleetwoodlibrary.org/events', city: 'Fleetwood', state: 'PA', zipCode: '19522', county: 'Berks'},
  { name: 'Borough Of Folcroft Public Library', url: 'https://www.folcroftlibrary.org', eventsUrl: 'https://www.folcroftlibrary.org/events', city: 'Folcroft', state: 'PA', zipCode: '19032', county: 'Delaware'},
  { name: 'Foxburg Free Library Association', url: 'https://www.foxburglibrary.org', eventsUrl: 'https://www.foxburglibrary.org/events', city: 'Foxburg', state: 'PA', zipCode: '16036', county: 'Clarion'},
  { name: 'Pequea Valley Public Library - Gap Branch', url: 'https://www.gaplibrary.org', eventsUrl: 'https://www.gaplibrary.org/events', city: 'Gap', state: 'PA', zipCode: '17527', county: 'Lancaster'},
  { name: 'Genesee Area Library', url: 'https://www.geneseelibrary.org', eventsUrl: 'https://www.geneseelibrary.org/events', city: 'Genesee', state: 'PA', zipCode: '16923', county: 'Potter'},
  { name: 'Glenolden Library', url: 'https://www.glenoldenlibrary.org', eventsUrl: 'https://www.glenoldenlibrary.org/events', city: 'Glenolden', state: 'PA', zipCode: '19036', county: 'Delaware'},
  // Corrected 2026-08-10, verified live: hamlinlibrary.org is Hamlin Memorial
  // Library at 123 South Mechanic Street, SMETHPORT PA (Seneca District
  // Libraries) — a real PA library that the seed generator had filed under the
  // wrong name, city and county. Renamed rather than removed: the URL is right,
  // only the label was wrong, so deleting it would have dropped real coverage.
  { name: 'Hamlin Memorial Library', url: 'https://www.hamlinlibrary.org/', eventsUrl: 'https://www.hamlinlibrary.org/', city: 'Smethport', state: 'PA', zipCode: '16749', county: 'McKean'},
  { name: 'Union Library Company Of Hatborough', url: 'https://www.hatborolibrary.org', eventsUrl: 'https://www.hatborolibrary.org/events', city: 'Hatboro', state: 'PA', zipCode: '19040', county: 'Montgomery'},
  { name: 'Hawley Library', url: 'https://www.hawleylibrary.org/', eventsUrl: 'https://www.hawleylibrary.org/', city: 'Hawley', state: 'PA', zipCode: '18428', county: 'Wayne'},
  { name: 'Hazleton Area Public Library', url: 'https://www.hazletonlibrary.org/', eventsUrl: 'https://www.hazletonlibrary.org/calendar', city: 'Hazleton', state: 'PA', zipCode: '18201', county: 'Luzerne'},
  { name: 'Hellertown Area Library', url: 'https://www.hellertownlibrary.org', eventsUrl: 'https://www.hellertownlibrary.org/events', city: 'Hellertown', state: 'PA', zipCode: '18055', county: 'Northampton'},
  { name: 'Hershey Public Library', url: 'https://www.hersheylibrary.org/', eventsUrl: 'https://www.hersheylibrary.org/', city: 'Hershey', state: 'PA', zipCode: '17033', county: 'Dauphin'},
  { name: 'Hollidaysburg Area Public Library', url: 'https://hollidaysburglibrary.org/', eventsUrl: 'https://hollidaysburglibrary.org/', city: 'Hollidaysburg', state: 'PA', zipCode: '16648', county: 'Blair'},
  { name: 'Honey Brook Community Library', url: 'https://www.honeybrooklibrary.org', eventsUrl: 'https://www.honeybrooklibrary.org/events', city: 'Honey Brook', state: 'PA', zipCode: '19344', county: 'Chester'},
  { name: 'Horsham Township Library', url: 'https://www.horshamlibrary.org/', eventsUrl: 'https://www.horshamlibrary.org/', city: 'Horsham', state: 'PA', zipCode: '19044', county: 'Montgomery'},
  { name: 'Hughesville Area Public Library', url: 'https://www.hughesvillelibrary.org', eventsUrl: 'https://www.hughesvillelibrary.org/events', city: 'Hughesville', state: 'PA', zipCode: '17737', county: 'Lycoming'},
  { name: 'Huntingdon County Library', url: 'https://www.huntingdonlibrary.org', eventsUrl: 'https://www.huntingdonlibrary.org/events', city: 'Huntingdon', state: 'PA', zipCode: '16652', county: 'Huntingdon County'},
  // REMOVED 2026-08-11 (Defect A): no verifiable official site. Exists at 700 Main St Hyde Park PA 15641, ph 724-845-1944, but contact is a comcast.net email; no site in POWER Library or county directory
  // RECORDED COVERAGE GAP - restore if a real URL is found.
  // { name: 'Hyde Park Public Library', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'PA', zipCode: '15641', county: 'Berks'},
  { name: 'Hyndman-Londonderry Public Library', url: 'https://www.hyndmanlibrary.org/', eventsUrl: 'https://www.hyndmanlibrary.org/', city: 'Hyndman', state: 'PA', zipCode: '15545', county: 'Bedford'},
  { name: 'Pequea Valley Public Library', url: 'https://www.intercourselibrary.org', eventsUrl: 'https://www.intercourselibrary.org/events', city: 'Intercourse', state: 'PA', zipCode: '17534', county: 'Lancaster'},
  { name: 'Jefferson Hills Public Library', url: 'https://www.jeffersonhillslibrary.org', eventsUrl: 'https://www.jeffersonhillslibrary.org/events', city: 'Jefferson Hills', state: 'PA', zipCode: '15025', county: 'Allegheny'},
  { name: 'Jenkintown Library', url: 'https://www.jenkintownlibrary.org', eventsUrl: 'https://www.jenkintownlibrary.org/events', city: 'Jenkintown', state: 'PA', zipCode: '19046', county: 'Montgomery'},
  { name: 'Johnsonburg Public Library', url: 'https://www.johnsonburglibrary.org/', eventsUrl: 'https://www.johnsonburglibrary.org/', city: 'Johnsonburg', state: 'PA', zipCode: '15845', county: 'Indiana'},
  { name: 'Hoyt Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'PA', zipCode: '18704', county: 'Luzerne'},
  { name: 'Louisa Gonser Community Library Inc', url: 'https://www.berkslibraries.org/', eventsUrl: 'https://www.berkslibraries.org/branch/kutztown', city: 'Kutztown', state: 'PA', zipCode: '19530', county: 'Berks'},
  { name: 'Northern Wayne Community Library', url: 'https://lakewoodlibrary.org/', eventsUrl: 'https://lakewoodlibrary.org/events/event/', city: 'Lakewood', state: 'PA', zipCode: '18439', county: 'Erie'},
  { name: 'Lansdale Public Library', url: 'https://www.lansdalelibrary.org', eventsUrl: 'https://www.lansdalelibrary.org/events', city: 'Lansdale', state: 'PA', zipCode: '19446', county: 'Montgomery'},
  { name: 'Lansdowne Public Library', url: 'https://lansdownelibrary.org/', eventsUrl: 'https://lansdownelibrary.org/', city: 'Lansdowne', state: 'PA', zipCode: '19050', county: 'Delaware'},
  { name: 'Adams Memorial Library', url: 'https://www.latrobelibrary.org', eventsUrl: 'https://www.latrobelibrary.org/events', city: 'Latrobe', state: 'PA', zipCode: '15650', county: 'Westmoreland'},
  { name: 'Lebanon Community Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'PA', zipCode: '17046', county: 'Lebanon County'},
  { name: 'Mifflin County Library', url: 'https://www.lewistownlibrary.org', eventsUrl: 'https://www.lewistownlibrary.org/events', city: 'Lewistown', state: 'PA', zipCode: '17044', county: 'Mifflin'},
  { name: 'Ligonier Valley Library', url: 'https://www.ligonierlibrary.org', eventsUrl: 'https://www.ligonierlibrary.org/events', city: 'Ligonier', state: 'PA', zipCode: '15658', county: 'Westmoreland'},
  { name: 'Lilly Washington Pub Library', url: 'https://www.lillylibrary.org/', eventsUrl: 'https://www.lillylibrary.org/', city: 'Lilly', state: 'PA', zipCode: '15938', county: 'Cambria'},
  { name: 'Lititz Public Library', url: 'https://www.lititzlibrary.org', eventsUrl: 'https://www.lititzlibrary.org/events', city: 'Lititz', state: 'PA', zipCode: '17543', county: 'Lancaster'},
  { name: 'Malvern Public Library', url: 'https://www.malvernlibrary.org', eventsUrl: 'https://www.malvernlibrary.org/events', city: 'Malvern', state: 'PA', zipCode: '19355', county: 'Chester'},
  { name: 'Manheim Community Library', url: 'https://www.manheimlibrary.org', eventsUrl: 'https://www.manheimlibrary.org/events', city: 'Manheim', state: 'PA', zipCode: '17545', county: 'Lancaster'},
  { name: 'Marienville Area Library', url: 'https://www.marienvillelibrary.org', eventsUrl: 'https://www.marienvillelibrary.org/events', city: 'Marienville', state: 'PA', zipCode: '16239', county: 'Forest'},
  { name: 'Mars Area Public Library', url: 'https://www.marslibrary.org', eventsUrl: 'https://www.marslibrary.org/events', city: 'Mars', state: 'PA', zipCode: '16046', county: 'Butler'},
  { name: 'Martinsburg Community Library', url: 'https://www.martinsburglibrary.org', eventsUrl: 'https://www.martinsburglibrary.org/events', city: 'Martinsburg', state: 'PA', zipCode: '16662', county: 'Blair'},
  { name: 'Carnegie Library Of Mckeesport', url: 'https://mckeesportlibrary.org/', eventsUrl: 'https://mckeesportlibrary.org/', city: 'Mckeesport', state: 'PA', zipCode: '15132', county: 'Allegheny'},
  { name: 'Meadville Public Library', url: 'https://www.meadvillelibrary.org', eventsUrl: 'https://www.meadvillelibrary.org/events', city: 'Meadville', state: 'PA', zipCode: '16335', county: 'Crawford'},
  { name: 'Joseph T. Simpson Public Library', url: 'https://www.mechanicsburglibrary.org', eventsUrl: 'https://www.mechanicsburglibrary.org/events', city: 'Mechanicsburg', state: 'PA', zipCode: '17055', county: 'Cumberland'},
  { name: 'Francis J. Catania Law Library', url: 'https://www.medialibrary.org', eventsUrl: 'https://www.medialibrary.org/events', city: 'Media', state: 'PA', zipCode: '19063', county: 'Delaware'},
  { name: 'Mercer Area Library', url: 'https://www.mercerlibrary.org', eventsUrl: 'https://www.mercerlibrary.org/events', city: 'Mercer', state: 'PA', zipCode: '16137', county: 'Mercer County'},
  { name: 'Meyersdale Public Library', url: 'https://www.meyersdalelibrary.org/', eventsUrl: 'https://www.meyersdalelibrary.org/', city: 'Meyersdale', state: 'PA', zipCode: '15552', county: 'Somerset'},
  { name: 'Middletown Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'PA', zipCode: '17057', county: 'Dauphin'},
  { name: 'Carnegie Library, Midland', url: 'https://www.midlandlibrary.org', eventsUrl: 'https://www.midlandlibrary.org/events', city: 'Midland', state: 'PA', zipCode: '15059', county: 'Washington'},
  { name: 'Minersville Public Library', url: 'https://www.minersvillelibrary.org/', eventsUrl: 'https://www.minersvillelibrary.org/', city: 'Minersville', state: 'PA', zipCode: '17954', county: 'Schuylkill'},
  { name: 'Community College Of Beaver County', url: 'https://www.monacalibrary.org/', eventsUrl: 'https://www.monacalibrary.org/', city: 'Monaca', state: 'PA', zipCode: '15061', county: 'Beaver'},
  { name: 'Monessen Public Library District Center', url: 'https://www.monessenlibrary.org', eventsUrl: 'https://www.monessenlibrary.org/events', city: 'Monessen', state: 'PA', zipCode: '15062', county: 'Westmoreland'},
  { name: 'Monroeton Public Library', url: 'https://www.monroetonlibrary.org', eventsUrl: 'https://www.monroetonlibrary.org/events', city: 'Monroeton', state: 'PA', zipCode: '18832', county: 'Bradford'},
  { name: 'Monroeville Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'PA', zipCode: '15146', county: 'Allegheny'},
  { name: 'Montgomery Area Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'PA', zipCode: '17752', county: 'Montgomery County'},
  { name: 'South Fayette Township Library', url: 'https://www.morganlibrary.org', eventsUrl: 'https://www.morganlibrary.org/events', city: 'Morgan', state: 'PA', zipCode: '15064', county: 'Delaware'},
  { name: 'Mount Pleasant Free Public Library Association', url: 'https://www.mountpleasantlibrary.org/', eventsUrl: 'https://www.mountpleasantlibrary.org/', city: 'Mount Pleasant', state: 'PA', zipCode: '15666', county: 'Philadelphia'},
  { name: 'Marian Sutherland Kirby Library', url: 'https://mountaintoplibrary.org/', eventsUrl: 'https://mountaintoplibrary.org/calendar/', city: 'Mountain Top', state: 'PA', zipCode: '18707', county: 'Luzerne County'},
  { name: 'Murrysville Community Library', url: 'https://www.murrysvillelibrary.org', eventsUrl: 'https://www.murrysvillelibrary.org/events', city: 'Murrysville', state: 'PA', zipCode: '15668', county: 'Westmoreland'},
  { name: 'Narberth Community Library', url: 'https://www.narberthlibrary.org', eventsUrl: 'https://www.narberthlibrary.org/events', city: 'Narberth', state: 'PA', zipCode: '19072', county: 'Montgomery'},
  { name: 'Memorial Library Of Nazareth Vicinity', url: 'https://www.nazarethlibrary.org', eventsUrl: 'https://www.nazarethlibrary.org/events', city: 'Nazareth', state: 'PA', zipCode: '18064', county: 'Northampton'},
  { name: 'New Cumberland Public Library', url: 'https://www.newcumberlandlibrary.org', eventsUrl: 'https://www.newcumberlandlibrary.org/events', city: 'New Cumberland', state: 'PA', zipCode: '17070', county: 'Cumberland'},
  { name: 'New Florence Community Library', url: 'https://www.newflorencelibrary.org', eventsUrl: 'https://www.newflorencelibrary.org/events', city: 'New Florence', state: 'PA', zipCode: '15944', county: 'Westmoreland'},
  { name: 'Pratt Memorial Library', url: 'https://newmilfordlibrary.org/', eventsUrl: 'https://newmilfordlibrary.org/', city: 'New Milford', state: 'PA', zipCode: '18834', county: 'Susquehanna'},
  { name: 'North Versailles Public Library', url: 'https://northversailleslibrary.org/', eventsUrl: 'https://northversailleslibrary.org/', city: 'North Versailles', state: 'PA', zipCode: '15137', county: 'Allegheny'},
  { name: 'North Wales Library', url: 'https://www.northwaleslibrary.org', eventsUrl: 'https://www.northwaleslibrary.org/events', city: 'North Wales', state: 'PA', zipCode: '19454', county: 'Montgomery'},
  { name: 'Priestley Forsyth Memorial Library', url: 'https://www.northumberlandlibrary.org/', eventsUrl: 'https://www.northumberlandlibrary.org/', city: 'Northumberland', state: 'PA', zipCode: '17857', county: 'Northumberland County'},
  { name: 'Norwood Public Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'PA', zipCode: '19074', county: 'Delaware'},
  { name: 'Oakmont Carnegie Library', url: 'https://oakmontlibrary.org/', eventsUrl: 'https://oakmontlibrary.org/', city: 'Oakmont', state: 'PA', zipCode: '15139', county: 'Allegheny'},
  { name: 'Oil City Library', url: 'https://www.oilcitylibrary.org', eventsUrl: 'https://www.oilcitylibrary.org/events', city: 'Oil City', state: 'PA', zipCode: '16301', county: 'Venango'},
  { name: 'Orwigsburg Area Fr Pub Library', url: 'https://www.orwigsburglibrary.org/', eventsUrl: 'https://www.orwigsburglibrary.org/', city: 'Orwigsburg', state: 'PA', zipCode: '17961', county: 'Schuylkill'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in WI, not PA. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'PA', zipCode: '19363', county: 'Chester'},
  { name: 'Parkesburg Free Library', url: 'https://www.parkesburglibrary.org/', eventsUrl: 'https://www.parkesburglibrary.org/upcoming-events', city: 'Parkesburg', state: 'PA', zipCode: '19365', county: 'Chester'},
  { name: 'Phoenixville Public Library', url: 'https://phoenixvillelibrary.org/', eventsUrl: 'https://phoenixvillelibrary.org/', city: 'Phoenixville', state: 'PA', zipCode: '19460', county: 'Chester'},
  { name: 'Bucks County Free Library - Pipersville Free Library', url: 'https://pipersvillelibrary.org/', eventsUrl: 'https://pipersvillelibrary.org/', city: 'Pipersville', state: 'PA', zipCode: '18947', county: 'Bucks'},
  { name: 'Portage Public Library', url: 'https://www.portagelibrary.org', eventsUrl: 'https://www.portagelibrary.org/events', city: 'Portage', state: 'PA', zipCode: '15946', county: 'Cambria'},
  { name: 'Pottsville Free Public Library', url: 'https://www.pottsvillelibrary.org', eventsUrl: 'https://www.pottsvillelibrary.org/events', city: 'Pottsville', state: 'PA', zipCode: '17901', county: 'Schuylkill'},
  { name: 'Prospect Community Library', url: 'https://www.prospectlibrary.org/', eventsUrl: 'https://www.prospectlibrary.org/calendar', city: 'Prospect', state: 'PA', zipCode: '16052', county: 'Butler'},
  { name: 'Prospect Park Free Library', url: 'https://prospectparklibrary.org/', eventsUrl: 'https://prospectparklibrary.org/calendar/', city: 'Prospect Park', state: 'PA', zipCode: '19076', county: 'Delaware'},
  { name: 'Punxsutawney Memorial Library', url: 'https://www.punxsutawneylibrary.org', eventsUrl: 'https://www.punxsutawneylibrary.org/events', city: 'Punxsutawney', state: 'PA', zipCode: '15767', county: 'Jefferson'},
  { name: 'Quarryville Library Center', url: 'https://quarryvillelibrary.org/', eventsUrl: 'https://quarryvillelibrary.org/', city: 'Quarryville', state: 'PA', zipCode: '17566', county: 'Lancaster'},
  { name: 'Ralston Link', url: 'https://www.ralstonlibrary.org/', eventsUrl: 'https://www.ralstonlibrary.org/calendar', city: 'Ralston', state: 'PA', zipCode: '17763', county: 'Lycoming'},
  { name: 'Berks County Public Libraries', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'PA', zipCode: '19605', county: 'Berks'},
  { name: 'Reynoldsville Public Library', url: 'https://www.reynoldsvillelibrary.org', eventsUrl: 'https://www.reynoldsvillelibrary.org/events', city: 'Reynoldsville', state: 'PA', zipCode: '15851', county: 'Jefferson'},
  { name: 'Richland Community Library', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'PA', zipCode: '17087', county: 'Lebanon'},
  { name: 'Ridgway Public Library', url: 'https://www.ridgwaylibrary.org', eventsUrl: 'https://www.ridgwaylibrary.org/events', city: 'Ridgway', state: 'PA', zipCode: '15853', county: 'Elk'},
  { name: 'Ridley Park Public Library', url: 'https://www.ridleyparklibrary.org', eventsUrl: 'https://www.ridleyparklibrary.org/events', city: 'Ridley Park', state: 'PA', zipCode: '19078', county: 'Delaware'},
  { name: 'Ringtown Area Library', url: 'https://www.ringtownlibrary.org/', eventsUrl: 'https://www.ringtownlibrary.org/', city: 'Ringtown', state: 'PA', zipCode: '17967', county: 'Schuylkill'},
  { name: 'Roaring Spring Comm Library', url: 'https://www.roaringspringlibrary.org/', eventsUrl: 'https://www.roaringspringlibrary.org/', city: 'Roaring Spring', state: 'PA', zipCode: '16673', county: 'Blair'},
  { name: 'Robesonia Community Library', url: 'https://www.robesonialibrary.org', eventsUrl: 'https://www.robesonialibrary.org/events', city: 'Robesonia', state: 'PA', zipCode: '19551', county: 'Berks'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'PA', zipCode: '15074', county: 'Beaver'},
  { name: 'Saxonburg Area Library', url: 'https://www.saxonburglibrary.org', eventsUrl: 'https://www.saxonburglibrary.org/events', city: 'Saxonburg', state: 'PA', zipCode: '16056', county: 'Butler'},
  { name: 'Saxton Community Library', url: 'https://www.saxtonlibrary.org/', eventsUrl: 'https://www.saxtonlibrary.org/', city: 'Saxton', state: 'PA', zipCode: '16678', county: 'Bedford'},
  { name: 'Scottdale Public Library', url: 'https://www.scottdalelibrary.org/', eventsUrl: 'https://www.scottdalelibrary.org/', city: 'Scottdale', state: 'PA', zipCode: '15683', county: 'Westmoreland'},
  { name: 'Albright Memorial Library', url: 'https://lclshome.org', eventsUrl: 'https://lclshome.org/event/', city: 'Scranton', state: 'PA', zipCode: '18509', county: 'Lackawanna'},
  { name: 'Sewickley Public Library', url: 'https://www.sewickleylibrary.org', eventsUrl: 'https://www.sewickleylibrary.org/events', city: 'Sewickley', state: 'PA', zipCode: '15143', county: 'Allegheny'},
  { name: 'Sheffield Township Library', url: 'https://www.sheffieldlibrary.org/', eventsUrl: 'https://www.sheffieldlibrary.org/', city: 'Sheffield', state: 'PA', zipCode: '16347', county: 'Warren'},
  { name: 'Shippensburg Public Library', url: 'https://www.shippensburglibrary.org', eventsUrl: 'https://www.shippensburglibrary.org/events', city: 'Shippensburg', state: 'PA', zipCode: '17257', county: 'Cumberland'},
  { name: 'Paul Smith Library Of Southern York County', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'PA', zipCode: '17361', county: 'York'},
  { name: 'Sinking Spring Public Library', url: 'https://www.sinkingspringlibrary.org', eventsUrl: 'https://www.sinkingspringlibrary.org/events', city: 'Sinking Spring', state: 'PA', zipCode: '19608', county: 'Berks'},
  { name: 'Slatington Library Inc', url: 'https://sites.google.com/', eventsUrl: 'https://sites.google.com/view/slatingtonlibrary/calendar', city: 'Slatington', state: 'PA', zipCode: '18080', county: 'Lehigh'},
  { name: 'Smithfield Library', url: 'https://www.smithfieldlibrary.org/', eventsUrl: 'https://www.smithfieldlibrary.org/', city: 'Smithfield', state: 'PA', zipCode: '15478', county: 'Fayette'},
  // URL corrected 2026-08-11 (was somersetlibrary.org): Own site; 230 South Rosina Avenue Somerset PA 15501, phone 814-445-4011
  { name: 'Mary S Biesecker Public Library', url: 'https://www.maryslibrary.com', eventsUrl: 'https://www.maryslibrary.com/?page_id=22', city: 'Somerset', state: 'PA', zipCode: '15501', county: 'Somerset County'},
  { name: 'South Park Township Library', url: 'https://southparklibrary.org/', eventsUrl: 'https://southparklibrary.org/', city: 'South Park', state: 'PA', zipCode: '15129', county: 'Allegheny County'},
  { name: 'Spring City Free Public Library', url: 'https://springcitylibrary.org/', eventsUrl: 'https://springcitylibrary.org/', city: 'Spring City', state: 'PA', zipCode: '19475', county: 'Chester'},
  { name: 'Springdale Free Public Library', url: 'https://springdalelibrary.org/', eventsUrl: 'https://springdalelibrary.org/upcoming-events/', city: 'Springdale', state: 'PA', zipCode: '15144', county: 'Allegheny'},
  { name: 'Springfield Township Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'PA', zipCode: '19064', county: 'Delaware'},
  { name: 'Strasburg-Heisler Library', url: 'https://www.strasburglibrary.org', eventsUrl: 'https://www.strasburglibrary.org/events', city: 'Strasburg', state: 'PA', zipCode: '17579', county: 'Lancaster'},
  { name: 'Summerville Public Library', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'PA', zipCode: '15864', county: 'Jefferson'},
  { name: 'Degenstein Community Library', url: 'https://www.sunburylibrary.org', eventsUrl: 'https://www.sunburylibrary.org/events', city: 'Sunbury', state: 'PA', zipCode: '17801', county: 'Northumberland'},
  { name: 'Carnegie Free Library Of Swissvale', url: 'https://swissvalelibrary.org/', eventsUrl: 'https://swissvalelibrary.org/', city: 'Swissvale', state: 'PA', zipCode: '15218', county: 'Allegheny'},
  { name: 'Sykesville Public Library', url: 'https://www.sykesvillelibrary.org', eventsUrl: 'https://www.sykesvillelibrary.org/events', city: 'Sykesville', state: 'PA', zipCode: '15865', county: 'Jefferson'},
  { name: 'Taylor Community Library', url: 'https://www.taylorlibrary.org', eventsUrl: 'https://www.taylorlibrary.org/events', city: 'Taylor', state: 'PA', zipCode: '18517', county: 'Lackawanna'},
  { name: 'Sarah S Bovard Memorial Library', url: 'https://www.tionestalibrary.org/', eventsUrl: 'https://www.tionestalibrary.org/', city: 'Tionesta', state: 'PA', zipCode: '16353', county: 'Forest'},
  { name: 'Towanda Public Library', url: 'https://towandalibrary.org/', eventsUrl: 'https://towandalibrary.org/', city: 'Towanda', state: 'PA', zipCode: '18848', county: 'Bradford'},
  { name: 'Trafford Community Public Library', url: 'https://www.traffordlibrary.org', eventsUrl: 'https://www.traffordlibrary.org/events', city: 'Trafford', state: 'PA', zipCode: '15085', county: 'Westmoreland'},
  { name: 'Tunkhannock Public Library', url: 'https://www.tunkhannocklibrary.org/', eventsUrl: 'https://www.tunkhannocklibrary.org/', city: 'Tunkhannock', state: 'PA', zipCode: '18657', county: 'Wyoming'},
  { name: 'Tyrone-Snyder Township Public Library', url: 'https://www.tyronelibrary.org', eventsUrl: 'https://www.tyronelibrary.org/events', city: 'Tyrone', state: 'PA', zipCode: '16686', county: 'Blair'},
  { name: 'Warren Library Association', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'PA', zipCode: '16365', county: 'Warren County'},
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'PA', zipCode: '16441', county: 'Erie'},
  { name: 'West Chester Public Library', url: 'https://www.westchesterlibrary.org', eventsUrl: 'https://www.westchesterlibrary.org/events', city: 'West Chester', state: 'PA', zipCode: '19380', county: 'Chester'},
  { name: 'West Newton Public Library', url: 'https://www.westnewtonlibrary.org', eventsUrl: 'https://www.westnewtonlibrary.org/events', city: 'West Newton', state: 'PA', zipCode: '15089', county: 'Westmoreland'},
  { name: 'West Pittston Library', url: 'https://www.westpittstonlibrary.org', eventsUrl: 'https://www.westpittstonlibrary.org/events', city: 'West Pittston', state: 'PA', zipCode: '18643', county: 'Luzerne'},
  // URL corrected 2026-08-11 (was westfieldlibrary.org): 147 Maple St Westfield PA 16950, phone 814-367-5411, Potter-Tioga Library System
  { name: 'Westfield Public Library', url: 'https://www.westfieldpubliclibrary.com', eventsUrl: 'https://www.westfieldpubliclibrary.com', city: 'Westfield', state: 'PA', zipCode: '16950', county: 'Tioga'},
  { name: 'Carnegie Library Of Mckeesport - White Oak', url: 'https://www.whiteoaklibrary.org', eventsUrl: 'https://www.whiteoaklibrary.org/events', city: 'White Oak', state: 'PA', zipCode: '15131', county: 'Allegheny'},
  { name: 'Wilcox Public Library', url: 'https://www.wilcoxlibrary.org/', eventsUrl: 'https://www.wilcoxlibrary.org/', city: 'Wilcox', state: 'PA', zipCode: '15870', county: 'Elk'},
  { name: 'Wilkinsburg Public Library', url: 'https://wilkinsburglibrary.org/', eventsUrl: 'https://wilkinsburglibrary.org/', city: 'Wilkinsburg', state: 'PA', zipCode: '15221', county: 'Allegheny'},
  { name: 'Windber Public Library Association', url: 'https://www.windberlibrary.org', eventsUrl: 'https://www.windberlibrary.org/events', city: 'Windber', state: 'PA', zipCode: '15963', county: 'Somerset'},
  { name: 'Bucks County Free Library - Village Library Of Wrightstown', url: 'https://wrightstownlibrary.org/', eventsUrl: 'https://wrightstownlibrary.org/', city: 'Wrightstown', state: 'PA', zipCode: '18940', county: 'Bucks'},
  { name: 'Wyalusing Public Library', url: 'https://www.wyalusinglibrary.org', eventsUrl: 'https://www.wyalusinglibrary.org/events', city: 'Wyalusing', state: 'PA', zipCode: '18853', county: 'Bradford'},
  { name: 'Yeadon Public Library', url: 'https://www.yeadonlibrary.org', eventsUrl: 'https://www.yeadonlibrary.org/events', city: 'Yeadon', state: 'PA', zipCode: '19050', county: 'Delaware'},
  { name: 'Jefferson Resource Center And Computer Lab', url: 'https://yorklibrary.org/', eventsUrl: 'https://yorklibrary.org/', city: 'York', state: 'PA', zipCode: '17404', county: 'York County'},
  { name: 'Zelienople Public Library', url: 'https://www.zelienoplelibrary.org', eventsUrl: 'https://www.zelienoplelibrary.org/events', city: 'Zelienople', state: 'PA', zipCode: '16063', county: 'Butler'}

];

const SCRAPER_NAME = 'generic-PA';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for any event-like content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Structured schema.org data beats any DOM guess, so try it before scraping markup.
      // Found 2026-08-09: 20 of the family's open MISMATCH bugs sit on pages that already
      // publish <script type="application/ld+json"> Event objects — 59 on Brownell, 107 on
      // Brandywine Zoo — which the generic selectors below miss entirely. startDate is a
      // real ISO timestamp, so this also avoids the time-only values behind this family's
      // InvalidDate counts, and location.address geocodes to the venue not a centroid.
      const jsonLdEvents = extractJsonLdEvents(await page.content(), library.name);
      if (jsonLdEvents.length > 0) {
        jsonLdEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'jsonld',
            state: event.state || library.state || 'PA',
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

            const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Generic selectors for event cards/items
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          '[id*="event"]',
          'article',
          '.post',
          '.item'
        ];

        const foundElements = new Set();

        // Try each selector
        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              // Try to find title, date, description
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('[class*="name"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              // A real calendar date needs a month name or MM/DD numeral —
              // matches calendar-grid day cells ("28", "1 event, 30"),
              // navigation chrome ("Select Month...Year", "Date Range...
              // Today Tomorrow"), and bare time-only strings ("6:30 PM -
              // 8:00 PM" with no date at all) all fail this and are
              // rejected, instead of being blindly accepted as a date the
              // way [class*="date"] used to (that selector matches date
              // *picker*/filter UI as often as it matches a real event
              // date — caught 2026-07-06, ~91% of scraped items across PA
              // were being rejected downstream as "invalid date" because of
              // exactly this).
              const looksLikeRealDate = (text) => {
                if (!text) return false;
                const t = text.trim();
                // Real date strings from a single date/time element are
                // short. Anything longer is almost always calendar-widget
                // chrome (a whole mini-calendar's day grid, month/year
                // picker dropdown, etc. dumped as one text blob) — reject
                // outright rather than pattern-matching inside it, since a
                // long blob can easily contain a stray "2026" and "Jul"
                // that have nothing to do with each other.
                if (t.length > 40) return false;
                if (/^\d{1,2}$/.test(t)) return false; // bare day-of-month
                if (/^\d+\s*events?,?\s*$/i.test(t)) return false; // calendar cell "1 event, 30"
                if (/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*\d{1,2}$/i.test(t)) return false; // "Mon 6"
                return /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t) ||
                       /\d{4}-\d{2}-\d{2}/.test(t) ||
                       /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s*\d{0,4}\b/i.test(t) ||
                       /(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i.test(t);
              };

              // Prefer a real <time datetime="..."> attribute (semantic,
              // most reliable) before falling back to loosely-matched text.
              const timeEl = card.querySelector('time[datetime]');
              const timeAttr = timeEl ? timeEl.getAttribute('datetime') : null;

              const dateCandidates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}/i)
                )
              ].filter(el => el && looksLikeRealDate(el.textContent));

              const possibleTimes = [
                card.querySelector('[class*="time"]')
              ].filter(el => el && /\d{1,2}:\d{2}/.test(el.textContent));

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('[class*="summary"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');
              const imageEl = card.querySelector('img');

              // Look for age/audience info on the event card
              const ageEl = [
                card.querySelector('[class*="audience"]'),
                card.querySelector('[class*="age-range"]'),
                card.querySelector('[class*="age_range"]'),
                card.querySelector('[class*="ages"]'),
                card.querySelector('[class*="age-group"]'),
                card.querySelector('[class*="category"]')
              ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              const titleText = possibleTitles.length > 0 ? possibleTitles[0].textContent.trim() : '';
              // Reject generic nav/filter chrome and date-header/divider
              // elements that sometimes match the title selectors too (seen
              // on Bedework-style date-grouped list calendars, where a day
              // divider like "Sunday, June 28, 2026" gets matched as if it
              // were an event card, and "Toggle the date picker" / "Ongoing
              // events for..." navigation text along with it).
              const normalizedTitle = titleText.trim();
              const isJunkTitle = /^(events?|upcoming events?|filter( events?)?|open filter|close filter|events? search and views navigation|primary tabs)$/i.test(normalizedTitle) ||
                /^toggle the date picker/i.test(normalizedTitle) ||
                /^ongoing events for/i.test(normalizedTitle) ||
                /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday),?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}$/i.test(normalizedTitle);

              if (titleText && !isJunkTitle) {
                const dateText = timeAttr || (dateCandidates.length > 0 ? dateCandidates[0].textContent.trim() : '');
                const event = {
                  title: titleText,
                  date: dateText,
                  time: possibleTimes.length > 0 ? possibleTimes[0].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                // Only add if it looks like an event (has title and a real date)
                if (event.title && event.date) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      // Transform and add to collection
      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'generic',
            state: 'PA',
            needsReview: true // Flag for manual review
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }

  await browser.close();

  console.log(`\n📊 Total events found: ${events.length}`);

  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'PA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - PA (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressPACloudFunction() {
  console.log('☁️ Running WordPress PA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-PA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-PA', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressPACloudFunction };
