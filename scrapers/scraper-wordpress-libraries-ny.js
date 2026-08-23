// 28 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { tryFetchTecEvents, tryDomScrapeTecEvents } = require('./helpers/tec-rest-helper');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const ngeohash = require('ngeohash');
/**
 * New York Public Libraries Scraper - Coverage: All New York public libraries
 */
const LIBRARIES = [
  // NYC Major Systems
  { name: 'New York Public Library', url: 'https://www.nypl.org', eventsUrl: 'https://www.nypl.org/events/calendar', city: 'New York', state: 'NY', zipCode: '10018', county: 'New York County'},
  { name: 'Brooklyn Public Library', url: 'https://www.bklynlibrary.org', eventsUrl: 'https://www.bklynlibrary.org/calendar', city: 'Brooklyn', state: 'NY', zipCode: '11238', county: 'Kings'},
  { name: 'Queens Public Library', url: 'https://www.queenslibrary.org', eventsUrl: 'https://www.queenslibrary.org/calendar', city: 'Jamaica', state: 'NY', zipCode: '11432', county: 'Queens'},
  // Long Island
  { name: 'Great Neck Library', url: 'https://www.greatnecklibrary.org', eventsUrl: 'https://greatnecklibrary.libcal.com/calendar', city: 'Great Neck', state: 'NY', zipCode: '11023', county: 'Nassau'},
  { name: 'Hicksville Public Library', url: 'https://www.hicksvillelibrary.org', eventsUrl: 'https://hicksvillelibrary.libcal.com/calendar', city: 'Hicksville', state: 'NY', zipCode: '11801', county: 'Nassau'},
  { name: 'Freeport Memorial Library', url: 'https://www.freeportlibrary.info', eventsUrl: 'https://freeportlibrary.libcal.com/calendar', city: 'Freeport', state: 'NY', zipCode: '11520', county: 'Nassau'},
  { name: 'Rockville Centre Public Library', url: 'https://www.rvcpl.org', eventsUrl: 'https://rvcpl.libcal.com/calendar', city: 'Rockville Centre', state: 'NY', zipCode: '11570', county: 'Nassau'},
  { name: 'Oceanside Library', url: 'https://www.oceansidelibrary.com', eventsUrl: 'https://oceansidelibrary.libcal.com/calendar', city: 'Oceanside', state: 'NY', zipCode: '11572', county: 'Nassau'},
  { name: 'North Merrick Public Library', url: 'https://www.nmerricklibrary.org', eventsUrl: 'https://nmerricklibrary.libcal.com/calendar', city: 'North Merrick', state: 'NY', zipCode: '11566', county: 'Nassau'},
  { name: 'Baldwin Public Library', url: 'https://www.baldwinpl.org', eventsUrl: 'https://baldwinlib.libcal.com/calendar', city: 'Baldwin', state: 'NY', zipCode: '11510', county: 'Nassau'},
  { name: 'Garden City Public Library', url: 'https://www.gardencitypl.org', eventsUrl: 'https://gardencitypl.libcal.com/calendar', city: 'Garden City', state: 'NY', zipCode: '11530', county: 'Nassau'},
  // Upstate - Major Cities
  { name: 'Buffalo & Erie County Public Library', url: 'https://www.buffalolib.org', eventsUrl: 'https://events.erielibrary.org/calendar', city: 'Buffalo', state: 'NY', zipCode: '14203', county: 'Erie'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterpubliclibrary.org', eventsUrl: 'https://rochesterpubliclibrary.librarymarket.com/events', city: 'Rochester', state: 'NY', zipCode: '14604', county: 'Monroe'},
  { name: 'Syracuse Public Library', url: 'https://www.onlib.org', eventsUrl: 'https://onlib-central.libcal.com/calendar', city: 'Syracuse', state: 'NY', zipCode: '13202', county: 'Onondaga'},
  { name: 'Albany Public Library', url: 'https://www.albanypubliclibrary.org', eventsUrl: 'https://albany.librarycalendar.com/events', city: 'Albany', state: 'NY', zipCode: '12206', county: 'Albany County'},
  // Regional Systems
  { name: 'Westchester Library System', url: 'https://www.westchesterlibraries.org', eventsUrl: 'https://www.westchesterlibraries.org/events', city: 'Elmsford', state: 'NY', zipCode: '10523', county: 'Westchester'},
  { name: 'Yonkers Public Library', url: 'https://www.ypl.org', eventsUrl: 'https://www.ypl.org/events', city: 'Yonkers', state: 'NY', zipCode: '10701', county: 'Westchester'},
  { name: 'White Plains Public Library', url: 'https://whiteplainslibrary.org', eventsUrl: 'https://whiteplainslibrary.org/events', city: 'White Plains', state: 'NY', zipCode: '10601', county: 'Westchester'},
  { name: 'Schenectady County Public Library', url: 'https://www.scpl.org', eventsUrl: 'https://www.scpl.org/events', city: 'Schenectady', state: 'NY', zipCode: '12305', county: 'Schenectady County'},
  { name: 'Utica Public Library', url: 'https://www.uticapubliclibrary.org', eventsUrl: 'https://www.uticapubliclibrary.org/events', city: 'Utica', state: 'NY', zipCode: '13501', county: 'Oneida'},
  { name: 'Poughkeepsie Public Library District', url: 'https://www.poklib.org', eventsUrl: 'https://www.poklib.org/events', city: 'Poughkeepsie', state: 'NY', zipCode: '12601', county: 'Dutchess'},
  { name: 'New Rochelle Public Library', url: 'https://nrpl.org/', eventsUrl: 'https://nrpl.org/', city: 'New Rochelle', state: 'NY', zipCode: '10801', county: 'Westchester'},
  { name: 'Mount Vernon Public Library', url: 'https://www.mountvernonpubliclibrary.org', eventsUrl: 'https://www.mountvernonpubliclibrary.org/events', city: 'Mount Vernon', state: 'NY', zipCode: '10550', county: 'Westchester'},
  { name: 'Ithaca Tompkins County Public Library', url: 'https://www.tcpl.org', eventsUrl: 'https://www.tcpl.org/events', city: 'Ithaca', state: 'NY', zipCode: '14850', county: 'Tompkins'},
  // Additional libraries from spreadsheet coverage expansion
  // URL corrected 2026-08-11 (was addisonlibrary.org): 6 South St Addison NY 14801, phone 607-359-3888, hosted by Southern Tier Library System. addisonlibrary.org is Addison ILLINOIS, 4 Friendshi
  { name: 'Addison Public Library', url: 'https://addison.stls.org', eventsUrl: 'https://addison.stls.org/events/', city: 'Addison', state: 'NY', zipCode: '14801', county: 'Steuben'},
  { name: 'Newstead Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'NY', zipCode: '14001', county: 'Erie', urlCollision: 'akronlibrary.org is OH, not NY' },
  { name: 'Shelter Rock Public Library', url: 'https://www.albertsonlibrary.org', eventsUrl: 'https://www.albertsonlibrary.org/events', city: 'Albertson', state: 'NY', zipCode: '11507', county: 'Nassau'},
  // URL corrected 2026-08-11 (was albionlibrary.org): Now named Hoag Library of the Swan Library Association, 134 South Main St, Albion NY 14411, phone 585-589-4246; old Swan Library site at 4 N
  { name: 'Swan Library', url: 'https://www.hoaglibrary.org', eventsUrl: 'https://www.hoaglibrary.org/events', city: 'Albion', state: 'NY', zipCode: '14411', county: 'Orleans'},
  { name: 'Alden Ewell Free Library', url: 'https://www.aldenlibrary.org/', eventsUrl: 'https://www.aldenlibrary.org/', city: 'Alden', state: 'NY', zipCode: '14004', county: 'Erie'},
  { name: 'Alfred Box Of Books Library', url: 'https://www.alfredlibrary.org', eventsUrl: 'https://www.alfredlibrary.org/events', city: 'Alfred', state: 'NY', zipCode: '14802', county: 'Allegany'},
  { name: 'Allegany Public Library', url: 'https://alleganylibrary.org/', eventsUrl: 'https://alleganylibrary.org/', city: 'Allegany', state: 'NY', zipCode: '14706', county: 'Allegany County'},
  { name: 'Almond Twentieth Century Club Library', url: 'https://almondlibrary.org/', eventsUrl: 'https://almondlibrary.org/calendar/', city: 'Almond', state: 'NY', zipCode: '14804', county: 'Allegany'},
  { name: 'Amagansett Free Library', url: 'https://amagansettlibrary.org/', eventsUrl: 'https://amagansettlibrary.org/calendar/', city: 'Amagansett', state: 'NY', zipCode: '11930', county: 'Suffolk'},
  { name: 'Amenia Free Library', url: 'https://amenialibrary.org/', eventsUrl: 'https://amenialibrary.org/', city: 'Amenia', state: 'NY', zipCode: '12501', county: 'Dutchess'},
  // URL corrected 2026-08-11 (was amherstlibrary.org): 350 John James Audubon Pkwy Amherst NY 14228, ph 716-689-4922; renamed Honorable Shirley Chisholm Library in 2025, Buffalo and Erie County s
  { name: 'Audubon Branch', url: 'https://www.buffalolib.org/locations-hours/audubon-branch', eventsUrl: 'https://buffalolib.libcal.com/calendar/events', city: 'Amherst', state: 'NY', zipCode: '14228', county: 'Erie'},
  { name: 'Andes Public Library', url: 'https://www.andeslibrary.org', eventsUrl: 'https://www.andeslibrary.org/events', city: 'Andes', state: 'NY', zipCode: '13731', county: 'Delaware'},
  { name: 'Andover Free Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'NY', zipCode: '14806', county: 'Allegany'},
  { name: 'Apalachin Library Association', url: 'https://www.apalachinlibrary.org', eventsUrl: 'https://www.apalachinlibrary.org/events', city: 'Apalachin', state: 'NY', zipCode: '13732', county: 'Tioga'},
  { name: 'Arcade Free Library', url: 'https://www.arcadelibrary.org', eventsUrl: 'https://www.arcadelibrary.org/events', city: 'Arcade', state: 'NY', zipCode: '14009', county: 'Wyoming'},
  { name: 'Ardsley Public Library', url: 'https://www.ardsleylibrary.org', eventsUrl: 'https://www.ardsleylibrary.org/events', city: 'Ardsley', state: 'NY', zipCode: '10502', county: 'Westchester'},
  { name: 'Queens Borough Public Library - Astoria', url: 'https://www.astoria.gov/', eventsUrl: 'https://www.astoria.gov/calendar?deptid=6', city: 'Astoria', state: 'NY', zipCode: '11102', county: 'Queens'},
  // URL corrected 2026-08-11 (was athenslibrary.org): 80 Second Street Athens NY 12015, phone 518-945-1417
  { name: 'D.R. Evarts Library', url: 'https://www.drevartslibrary.org', eventsUrl: 'https://www.drevartslibrary.org/library-calendar', city: 'Athens', state: 'NY', zipCode: '12015', county: 'Greene'},
  // URL corrected 2026-08-11 (was auburnlibrary.org): Site shows Seymour Library, 176 Genesee St, Auburn NY 13021, phone 315-252-7571. auburnlibrary.org is Auburn MA
  { name: 'Seymour Public Library District', url: 'https://seymourlibrary.org', eventsUrl: 'https://seymourlibrary.org/events/', city: 'Auburn', state: 'NY', zipCode: '13021', county: 'Cayuga'},
  { name: 'Aurora Free Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'NY', zipCode: '13026', county: 'Cayuga'},
  { name: 'Babylon School District Public Library', url: 'https://babylonlibrary.org/', eventsUrl: 'https://babylonlibrary.org/', city: 'Babylon', state: 'NY', zipCode: '11702', county: 'Suffolk'},
  { name: 'Bainbridge Free Library', url: 'https://www.bainbridgelibrary.org', eventsUrl: 'https://www.bainbridgelibrary.org/events', city: 'Bainbridge', state: 'NY', zipCode: '13733', county: 'Chenango'},
  { name: 'Barker Free Library', url: 'https://www.barkerlibrary.org', eventsUrl: 'https://www.barkerlibrary.org/events', city: 'Barker', state: 'NY', zipCode: '14012', county: 'Niagara'},
  { name: 'Barneveld Free Library Association', url: 'https://www.barneveldlibrary.org/', eventsUrl: 'https://www.barneveldlibrary.org/', city: 'Barneveld', state: 'NY', zipCode: '13304', county: 'Oneida'},
  { name: 'Richmond Memorial Library', url: 'https://www.batavialibrary.org', eventsUrl: 'https://www.batavialibrary.org/events', city: 'Batavia', state: 'NY', zipCode: '14020', county: 'Genesee'},
  { name: 'Dormann Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'NY', zipCode: '14810', county: 'Steuben', urlCollision: 'bathlibrary.org is KY, not NY' },
  { name: 'Howland Public Library', url: 'https://beaconlibrary.org/', eventsUrl: 'https://beaconlibrary.org/calendar', city: 'Beacon', state: 'NY', zipCode: '12508', county: 'Dutchess'},
  { name: 'Beaver Falls Library', url: 'https://www.beaverfallslibrary.org', eventsUrl: 'https://www.beaverfallslibrary.org/events', city: 'Beaver Falls', state: 'NY', zipCode: '13305', county: 'Lewis'},
  { name: 'Bedford Free Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'NY', zipCode: '10506', county: 'Westchester', urlCollision: 'bedfordlibrary.org is TX, not NY' },
  { name: 'Bedford Hills Free Library', url: 'https://www.bedfordhillsfreelibrary.org/', eventsUrl: 'https://www.bedfordhillsfreelibrary.org/events/upcoming', city: 'Bedford Hills', state: 'NY', zipCode: '10507', county: 'Westchester'},
  { name: 'Belfast Public Library', url: 'https://www.belfastlibrary.org', eventsUrl: 'https://www.belfastlibrary.org/events', city: 'Belfast', state: 'NY', zipCode: '14711', county: 'Allegany', urlCollision: 'belfastlibrary.org is ME, not NY' },
  { name: 'Bellmore Memorial Library', url: 'https://www.bellmorelibrary.org', eventsUrl: 'https://www.bellmorelibrary.org/events', city: 'Bellmore', state: 'NY', zipCode: '11710', county: 'Nassau'},
  { name: 'Free Library Of The Belmont Literary And Historical Society', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'NY', zipCode: '14813', county: 'Allegany', urlCollision: 'smcl.org is CA, not NY' },
  { name: 'Bemus Point Public Library', url: 'https://www.bemuspointlibrary.org', eventsUrl: 'https://www.bemuspointlibrary.org/events', city: 'Bemus Point', state: 'NY', zipCode: '14712', county: 'Chautauqua'},
  { name: 'Eagle Free Library', url: 'https://www.blisslibrary.org/', eventsUrl: 'https://www.blisslibrary.org/', city: 'Bliss', state: 'NY', zipCode: '14024', county: 'Wyoming'},
  { name: 'Erwin Library Institute', url: 'https://www.boonvillelib.org/', eventsUrl: 'https://www.boonvillelib.org/', city: 'Boonville', state: 'NY', zipCode: '13309', county: 'Oneida'},
  { name: 'Modeste Bedient Memorial Library', url: 'https://www.branchportlibrary.org', eventsUrl: 'https://www.branchportlibrary.org/events', city: 'Branchport', state: 'NY', zipCode: '14418', county: 'Yates'},
  { name: 'Brentwood Public Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'NY', zipCode: '11717', county: 'Suffolk'},
  { name: 'Brewster Public Library', url: 'https://brewsterlibrary.libcal.com/', eventsUrl: 'https://brewsterlibrary.libcal.com/', city: 'Brewster', state: 'NY', zipCode: '10509', county: 'Putnam'},
  { name: 'Briarcliff Manor Public Library', url: 'https://briarcliffmanorlibrary.org/', eventsUrl: 'https://briarcliffmanorlibrary.org/calendar/', city: 'Briarcliff Manor', state: 'NY', zipCode: '10510', county: 'Westchester'},
  { name: 'Sullivan Free Library Of Bridgeport', url: 'https://www.bridgeportlibrary.org/', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'NY', zipCode: '13030', county: 'Madison', urlCollision: 'bridgeportlibrary.org is MI, not NY' },
  { name: 'Bronxville Public Library', url: 'https://bronxvillelibrary.org/', eventsUrl: 'https://bronxvillelibrary.org/', city: 'Bronxville', state: 'NY', zipCode: '10708', county: 'Westchester'},
  { name: 'Brownville-Glen Park Library', url: 'https://www.brownvillelibrary.org', eventsUrl: 'https://www.brownvillelibrary.org/events', city: 'Brownville', state: 'NY', zipCode: '13615', county: 'Jefferson'},
  { name: 'Cairo Public Library', url: 'https://cairolibrary.org/', eventsUrl: 'https://cairolibrary.org/calendar/', city: 'Cairo', state: 'NY', zipCode: '12413', county: 'Greene'},
  { name: 'Caledonia Library Association', url: 'https://www.caledonialibrary.org', eventsUrl: 'https://www.caledonialibrary.org/events', city: 'Caledonia', state: 'NY', zipCode: '14423', county: 'Livingston'},
  { name: 'Cambridge Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'NY', zipCode: '12816', county: 'Washington', urlCollision: 'cambridgelibrary.org is MA, not NY' },
  { name: 'Camden Library Association', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'NY', zipCode: '13316', county: 'Oneida', urlCollision: 'camdenlibrary.org is MI, not NY' },
  { name: 'Canajoharie Library And Art Gallery', url: 'https://www.canajoharielibrary.org/', eventsUrl: 'https://www.canajoharielibrary.org/', city: 'Canajoharie', state: 'NY', zipCode: '13317', county: 'Montgomery'},
  { name: 'Canastota Public Library', url: 'https://www.canastotalibrary.org/', eventsUrl: 'https://www.canastotalibrary.org/', city: 'Canastota', state: 'NY', zipCode: '13032', county: 'Madison'},
  // URL corrected 2026-08-11 (was cantonlibrary.org): 8 Park St Canton NY 13617, ph 315-386-3712, email canlib@ncls.org (North Country Library System, St. Lawrence County)
  { name: 'Canton Free Library', url: 'https://cantonfreelibrary.org/', eventsUrl: 'https://cantonfreelibrary.org/programs/', city: 'Canton', state: 'NY', zipCode: '13617', county: 'St. Lawrence'},
  { name: 'Cape Vincent Community Library', url: 'https://www.capevincentlibrary.org', eventsUrl: 'https://www.capevincentlibrary.org/events', city: 'Cape Vincent', state: 'NY', zipCode: '13618', county: 'Jefferson'},
  { name: 'Reed Memorial Library', url: 'https://carmellibrary.org/', eventsUrl: 'https://carmellibrary.org/calendar/', city: 'Carmel', state: 'NY', zipCode: '10512', county: 'Putnam'},
  { name: 'Cattaraugus Free Library', url: 'https://www.cattarauguslibrary.org', eventsUrl: 'https://www.cattarauguslibrary.org/events', city: 'Cattaraugus', state: 'NY', zipCode: '14719', county: 'Cattaraugus County'},
  { name: 'Cazenovia Public Library Society', url: 'https://cazenoviapubliclibrary.org/', eventsUrl: 'https://cazenoviapubliclibrary.org/', city: 'Cazenovia', state: 'NY', zipCode: '13035', county: 'Madison'},
  { name: 'Center Moriches Free Public Library', url: 'https://www.centermoricheslibrary.org', eventsUrl: 'https://www.centermoricheslibrary.org/events', city: 'Center Moriches', state: 'NY', zipCode: '11934', county: 'Suffolk'},
  { name: 'Central Islip Public Library', url: 'https://www.centralisliplibrary.org', eventsUrl: 'https://www.centralisliplibrary.org/events', city: 'Central Islip', state: 'NY', zipCode: '11722', county: 'Suffolk'},
  { name: 'Central Square Library', url: 'https://www.centralsquarelibrary.org', eventsUrl: 'https://www.centralsquarelibrary.org/events', city: 'Central Square', state: 'NY', zipCode: '13036', county: 'Oswego'},
  { name: 'Chappaqua Library', url: 'https://www.chappaqualibrary.org', eventsUrl: 'https://www.chappaqualibrary.org/events', city: 'Chappaqua', state: 'NY', zipCode: '10514', county: 'Westchester'},
  // URL corrected 2026-08-11 (was chathamlibrary.librarycalendar.com): Site lists 11 Woodbridge Ave, Chatham NY 12037, phone 518-392-3666. Shared host belongs to Library of the Chathams in Chatham NJ
  { name: 'Chatham Public Library', url: 'https://chathampubliclibrary.org', eventsUrl: 'https://chathampubliclibrary.org/calendar/', city: 'Chatham', state: 'NY', zipCode: '12037', county: 'Columbia'},
  { name: 'Cherry Valley Memorial Library', url: 'https://cherryvalleylibrary.org/', eventsUrl: 'https://cherryvalleylibrary.org/', city: 'Cherry Valley', state: 'NY', zipCode: '13320', county: 'Otsego'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'NY', zipCode: '10918', county: 'Orange'},
  { name: 'Claverack Library', url: 'https://claveracklibrary.org/', eventsUrl: 'https://claveracklibrary.org/calendar/', city: 'Claverack', state: 'NY', zipCode: '12513', county: 'Columbia'},
  // URL corrected 2026-08-11 (was claytonlibrary.org): Village of Clayton NY official gov site lists this library at 220 John Street Clayton NY, phone 315-686-3762, site hawnmemoriallibrary.org
  { name: 'Hawn Memorial Library', url: 'https://hawnmemoriallibrary.org', eventsUrl: 'https://hawnmemoriallibrary.org', city: 'Clayton', state: 'NY', zipCode: '13624', county: 'Jefferson'},
  { name: 'Kirkland Town Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'NY', zipCode: '13323', county: 'Clinton County'},
  { name: 'Clyde-Savannah Public Library', url: 'https://www.clydelibrary.org/', eventsUrl: 'https://www.clydelibrary.org/', city: 'Clyde', state: 'NY', zipCode: '14433', county: 'Wayne'},
  { name: 'Clymer-French Creek Free Library', url: 'https://www.clymerlibrary.org/', eventsUrl: 'https://www.clymerlibrary.org/', city: 'Clymer', state: 'NY', zipCode: '14724', county: 'Chautauqua'},
  { name: 'Cohocton Public Library', url: 'https://cohoctonlibrary.org/', eventsUrl: 'https://cohoctonlibrary.org/calendar/', city: 'Cohocton', state: 'NY', zipCode: '14826', county: 'Steuben'},
  { name: 'Cohoes Public Library', url: 'https://www.cohoeslibrary.org', eventsUrl: 'https://www.cohoeslibrary.org/events', city: 'Cohoes', state: 'NY', zipCode: '12047', county: 'Albany'},
  { name: 'Village Library Of Cooperstown', url: 'https://www.cooperstownlibrary.org', eventsUrl: 'https://www.cooperstownlibrary.org/events', city: 'Cooperstown', state: 'NY', zipCode: '13326', county: 'Otsego', urlCollision: 'cooperstownlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Copiague Memorial Public Library', url: 'https://www.copiaguelibrary.org', eventsUrl: 'https://www.copiaguelibrary.org/events', city: 'Copiague', state: 'NY', zipCode: '11726', county: 'Suffolk'},
  { name: 'Corfu Free Library', url: 'https://www.corfulibrary.org/', eventsUrl: 'https://www.corfulibrary.org/', city: 'Corfu', state: 'NY', zipCode: '14036', county: 'Genesee'},
  { name: 'Cornwall Public Library', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'NY', zipCode: '12518', county: 'Orange', urlCollision: 'cornwalllibrary.org is CT, not NY' },
  { name: 'Hammond Library Of Crown Point', url: 'https://www.crownpointlibrary.org', eventsUrl: 'https://www.crownpointlibrary.org/events', city: 'Crown Point', state: 'NY', zipCode: '12928', county: 'Essex'},
  { name: 'Cuba Circulating Library Association', url: 'https://www.cubalibrary.org', eventsUrl: 'https://www.cubalibrary.org/events', city: 'Cuba', state: 'NY', zipCode: '14727', county: 'Allegany'},
  { name: 'Cutchogue New Suffolk Free Library', url: 'https://cutchoguelibrary.org/', eventsUrl: 'https://cutchoguelibrary.org/', city: 'Cutchogue', state: 'NY', zipCode: '11935', county: 'Suffolk'},
  { name: 'Dansville Public Library', url: 'https://dansvillelibrary.org/', eventsUrl: 'https://dansvillelibrary.org/calendar/', city: 'Dansville', state: 'NY', zipCode: '14437', county: 'Livingston'},
  { name: 'Deer Park Public Library', url: 'https://www.deerparklibrary.org', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'NY', zipCode: '11729', county: 'Suffolk'},
  { name: 'Delevan-Yorkshire Public Library', url: 'https://www.delevanlibrary.org', eventsUrl: 'https://www.delevanlibrary.org/events', city: 'Delevan', state: 'NY', zipCode: '14042', county: 'Cattaraugus'},
  { name: 'Deruyter Free Library', url: 'https://deruyterlibrary.org/', eventsUrl: 'https://deruyterlibrary.org/', city: 'Deruyter', state: 'NY', zipCode: '13052', county: 'Madison'},
  { name: 'Dewitt Community Library Assoc., Inc', url: 'https://www.dewittlibrary.org', eventsUrl: 'https://www.dewittlibrary.org/events', city: 'Dewitt', state: 'NY', zipCode: '13214', county: 'Onondaga'},
  { name: 'Dobbs Ferry Public Library', url: 'https://www.dobbsferrylibrary.org', eventsUrl: 'https://www.dobbsferrylibrary.org/events', city: 'Dobbs Ferry', state: 'NY', zipCode: '10522', county: 'Westchester'},
  { name: 'Dolgeville-Manheim Public Library', url: 'https://dolgevillelibrary.org/', eventsUrl: 'https://dolgevillelibrary.org/', city: 'Dolgeville', state: 'NY', zipCode: '13329', county: 'Herkimer'},
  { name: 'Dunkirk Free Library', url: 'https://dunkirklibrary.org/', eventsUrl: 'https://dunkirklibrary.org/', city: 'Dunkirk', state: 'NY', zipCode: '14048', county: 'Chautauqua'},
  { name: 'Earlville Free Library', url: 'https://www.earlvillelibrary.org/', eventsUrl: 'https://www.earlvillelibrary.org/', city: 'Earlville', state: 'NY', zipCode: '13332', county: 'Madison'},
  { name: 'East Greenbush Community Library', url: 'https://eglibrary.org/', eventsUrl: 'https://eglibrary.org/', city: 'East Greenbush', state: 'NY', zipCode: '12061', county: 'Rensselaer'},
  { name: 'East Hampton Library', url: 'https://www.easthamptonlibrary.org', eventsUrl: 'https://www.easthamptonlibrary.org/events', city: 'East Hampton', state: 'NY', zipCode: '11937', county: 'Suffolk'},
  { name: 'East Islip Public Library', url: 'https://www.eastisliplibrary.org', eventsUrl: 'https://www.eastisliplibrary.org/events', city: 'East Islip', state: 'NY', zipCode: '11730', county: 'Suffolk'},
  { name: 'East Rochester Public Library', url: 'https://www.eastrochesterlibrary.org', eventsUrl: 'https://www.eastrochesterlibrary.org/events', city: 'East Rochester', state: 'NY', zipCode: '14445', county: 'Monroe'},
  { name: 'East Rockaway Public Library', url: 'https://www.eastrockawaylibrary.org', eventsUrl: 'https://www.eastrockawaylibrary.org/events', city: 'East Rockaway', state: 'NY', zipCode: '11518', county: 'Nassau'},
  { name: 'Eastchester Public Library', url: 'https://www.eastchesterlibrary.org', eventsUrl: 'https://www.eastchesterlibrary.org/events', city: 'Eastchester', state: 'NY', zipCode: '10709', county: 'Westchester'},
  { name: 'Elbridge Free Library', url: 'https://www.elbridgelibrary.org', eventsUrl: 'https://www.elbridgelibrary.org/events', city: 'Elbridge', state: 'NY', zipCode: '13060', county: 'Onondaga'},
  { name: 'Ellicottville Memorial Library', url: 'https://www.ellicottvillelibrary.org', eventsUrl: 'https://www.ellicottvillelibrary.org/events', city: 'Ellicottville', state: 'NY', zipCode: '14731', county: 'Cattaraugus'},
  { name: 'Farman Free Library Association Of Ellington', url: 'https://www.ellingtonlibrary.org', eventsUrl: 'https://www.ellingtonlibrary.org/events', city: 'Ellington', state: 'NY', zipCode: '14732', county: 'Chautauqua'},
  { name: 'Ellisburg Free Library', url: 'https://www.ellisburglibrary.org', eventsUrl: 'https://www.ellisburglibrary.org/events', city: 'Ellisburg', state: 'NY', zipCode: '13636', county: 'Jefferson'},
  { name: 'Queens Borough Public Library - Elmhurst', url: 'https://www.elmhurstlibrary.org', eventsUrl: 'https://www.elmhurstlibrary.org/events', city: 'Elmhurst', state: 'NY', zipCode: '11373', county: 'Queens'},
  { name: 'Elmont Public Library', url: 'https://www.elmontlibrary.org', eventsUrl: 'https://www.elmontlibrary.org/events', city: 'Elmont', state: 'NY', zipCode: '11003', county: 'Nassau'},
  { name: 'Elwood Public Library', url: 'https://www.elwoodlibrary.org', eventsUrl: 'https://www.elwoodlibrary.org/events', city: 'Elwood', state: 'NY', zipCode: '11731', county: 'Suffolk'},
  { name: 'Belden Noble Memorial Library Of Essex', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'NY', zipCode: '12936', county: 'Essex County'},
  { name: 'Fair Haven Public Library', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fair Haven', state: 'NY', zipCode: '00000', county: 'Cortland'},
  { name: 'Fairport Public Library', url: 'https://www.fairportlibrary.org/', eventsUrl: 'https://www.fairportlibrary.org/', city: 'Fairport', state: 'NY', zipCode: '14450', county: 'Monroe'},
  { name: 'Falconer Public Library', url: 'https://www.falconerlibrary.org', eventsUrl: 'https://www.falconerlibrary.org/events', city: 'Falconer', state: 'NY', zipCode: '14733', county: 'Chautauqua'},
  { name: 'Farmingdale Public Library', url: 'https://www.farmingdalelibrary.org', eventsUrl: 'https://www.farmingdalelibrary.org/events', city: 'Farmingdale', state: 'NY', zipCode: '11735', county: 'Nassau'},
  // REMOVED 2026-08-16 — fayettevillelibrary.org is HIJACKED and now serves an
  // Indonesian gambling site, verified live. Same guessed domain was configured in
  // GA, NC and NY simultaneously.
  // LEAD, not yet actioned: this library is real and its own canonical domain
  // fflib.org 301s to https://onlib-fayetteville.libcal.com/calendar?cid=19949 —
  // Onondaga County Public Library's LibCal, matching this entry's county. So it
  // belongs in LibCal-NY, not here. Not moved yet because the LibCal calendar is
  // JS-rendered and WebFetch could not confirm live events, and an unverified move
  // would just relocate a zero. OPEN COVERAGE GAP until someone confirms that cid.
  { name: 'Wide Awake Club Library', url: 'https://fillmoreutlibrary.gov/', eventsUrl: 'https://fillmoreutlibrary.gov/upcoming-events/', city: 'Fillmore', state: 'NY', zipCode: '14735', county: 'Allegany'},
  { name: 'Blodgett Memorial Library District Of Fishkill', url: 'https://www.fishkilllibrary.org', eventsUrl: 'https://www.fishkilllibrary.org/events', city: 'Fishkill', state: 'NY', zipCode: '12524', county: 'Dutchess'},
  { name: 'Floral Park Public Library', url: 'https://floralparklibrary.org/', eventsUrl: 'https://floralparklibrary.org/', city: 'Floral Park', state: 'NY', zipCode: '11001', county: 'Nassau'},
  { name: 'Franklin Free Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NY', zipCode: '13775', county: 'Franklin County'},
  { name: 'Blount Library', url: 'https://franklinvillelibrary.org/', eventsUrl: 'https://franklinvillelibrary.org/', city: 'Franklinville', state: 'NY', zipCode: '14737', county: 'Cattaraugus'},
  { name: 'Fulton Public Library', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'NY', zipCode: '13069', county: 'Fulton County'},
  { name: 'Galway Public Library', url: 'https://www.galwaylibrary.org', eventsUrl: 'https://www.galwaylibrary.org/events', city: 'Galway', state: 'NY', zipCode: '12074', county: 'Saratoga'},
  { name: 'Gardiner Library', url: 'https://www.gardinerlibrary.org/', eventsUrl: 'https://www.gardinerlibrary.org/', city: 'Gardiner', state: 'NY', zipCode: '12525', county: 'Ulster'},
  { name: 'Wadsworth Library', url: 'https://www.geneseolibrary.org/', eventsUrl: 'https://www.geneseolibrary.org/', city: 'Geneseo', state: 'NY', zipCode: '14454', county: 'Livingston'},
  { name: 'Germantown Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'NY', zipCode: '12526', county: 'Columbia'},
  { name: 'Glen Cove Public Library', url: 'https://www.glencovelibrary.org/', eventsUrl: 'https://www.glencovelibrary.org/', city: 'Glen Cove', state: 'NY', zipCode: '11542', county: 'Nassau'},
  { name: 'Queens Borough Public Library - Glendale', url: 'https://www.glendalelibrary.org', eventsUrl: 'https://www.glendalelibrary.org/events', city: 'Glendale', state: 'NY', zipCode: '11385', county: 'Queens'},
  { name: 'Gloversville Public Library', url: 'https://gloversvillelibrary.org/', eventsUrl: 'https://gloversvillelibrary.org/events-calendar/', city: 'Gloversville', state: 'NY', zipCode: '12078', county: 'Fulton'},
  { name: 'Gorham Free Library', url: 'https://gorhamlibrary.org/', eventsUrl: 'https://gorhamlibrary.org/calendar/', city: 'Gorham', state: 'NY', zipCode: '14461', county: 'Ontario', urlCollision: 'gorhamlibrary.org is NH, not NY' },
  { name: 'Goshen Public Library And Historical Society', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'NY', zipCode: '10924', county: 'Orange'},
  { name: 'Reading Room Association Of Gouverneur', url: 'https://www.gouverneurlibrary.org', eventsUrl: 'https://www.gouverneurlibrary.org/events', city: 'Gouverneur', state: 'NY', zipCode: '13642', county: 'St. Lawrence'},
  { name: 'Gowanda Free Library', url: 'https://gowandalibrary.org/', eventsUrl: 'https://gowandalibrary.org/', city: 'Gowanda', state: 'NY', zipCode: '14070', county: 'Cattaraugus'},
  { name: 'Pember Library Museum', url: 'https://www.granvillelibrary.org/', eventsUrl: 'https://www.granvillelibrary.org/', city: 'Granville', state: 'NY', zipCode: '12832', county: 'Washington', urlCollision: 'granvillelibrary.org is OH, not NY' },
  { name: 'Moore Memorial Library', url: 'https://www.greenelibrary.org', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'NY', zipCode: '13778', county: 'Greene County'},
  // URL collision fixed 2026-08-05. This entry pointed at greenvillelibrary.org,
  // which is the Greenville COUNTY Library System in SOUTH CAROLINA — a domain
  // claimed by 10 active states at once. It was not merely returning nothing: it
  // was actively ingesting South Carolina events under a New York label (146
  // upcoming rows, including one literally titled "War in the South Carolina
  // Backcountry" stored as Greenville, NY). Repointed to the real Greenville
  // Public Library of Greene County NY, verified live: 11177 Rte 32, Greenville
  // NY 12083, matching this entry's own ZIP.
  { name: 'Greenville Public Library', url: 'https://greenville.lib.ny.us', eventsUrl: 'https://greenville.lib.ny.us/calendar/', city: 'Greenville', state: 'NY', zipCode: '12083', county: 'Greene'},
  { name: 'Guilderland Public Library', url: 'https://www.guilderlandlibrary.org', eventsUrl: 'https://www.guilderlandlibrary.org/events', city: 'Guilderland', state: 'NY', zipCode: '12084', county: 'Albany'},
  // URL corrected 2026-08-11 (was hamburglibrary.org): Real name Hamburg Public Library, member of Buffalo and Erie County Public Library; 102 Buffalo St Hamburg NY 14075, phone 716-649-4415
  { name: 'Hamburg Library', url: 'https://www.buffalolib.org/locations-hours/hamburg-public-library', eventsUrl: 'https://buffalolib.libcal.com', city: 'Hamburg', state: 'NY', zipCode: '14075', county: 'Erie'},
  { name: 'Hamilton Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'NY', zipCode: '13346', county: 'Hamilton County'},
  { name: 'Hamlin Public Library', url: 'https://www.hamlinlibrary.org/', eventsUrl: 'https://www.hamlinlibrary.org/', city: 'Hamlin', state: 'NY', zipCode: '14464', county: 'Monroe', urlCollision: 'hamlinlibrary.org is PA, not NY' },
  { name: 'Hammond Free Library', url: 'https://www.hammondlibrary.org', eventsUrl: 'https://www.hammondlibrary.org/events', city: 'Hammond', state: 'NY', zipCode: '13646', county: 'St. Lawrence'},
  { name: 'Fred And Harriet Taylor Memorial Library', url: 'https://hammondsportlibrary.org/', eventsUrl: 'https://hammondsportlibrary.org/calendar/', city: 'Hammondsport', state: 'NY', zipCode: '14840', county: 'Steuben'},
  { name: 'Hampton Bays Public Library', url: 'https://www.hamptonbayslibrary.org/', eventsUrl: 'https://www.hamptonbayslibrary.org/', city: 'Hampton Bays', state: 'NY', zipCode: '11946', county: 'Suffolk'},
  // URL corrected 2026-08-11 (was hancocklibrary.org): Four County Library System site; 104 Read St Hancock NY 13783, phone 607-637-2519
  { name: 'Louise Adelia Read Memorial Library', url: 'https://libraries.4cls.org/hancock/', eventsUrl: 'https://libraries.4cls.org/hancock/index.php/calendar/', city: 'Hancock', state: 'NY', zipCode: '13783', county: 'Delaware'},
  { name: 'Hannibal Free Library', url: 'https://www.hanniballibrary.org', eventsUrl: 'https://www.hanniballibrary.org/events', city: 'Hannibal', state: 'NY', zipCode: '13074', county: 'Oswego'},
  { name: 'Harrison Public Library', url: 'https://www.harrisonpl.org/', eventsUrl: 'https://www.harrisonpl.org/', city: 'Harrison', state: 'NY', zipCode: '10528', county: 'Westchester'},
  { name: 'Hauppauge Public Library', url: 'https://www.hauppaugelibrary.org', eventsUrl: 'https://www.hauppaugelibrary.org/events', city: 'Hauppauge', state: 'NY', zipCode: '11788', county: 'Suffolk'},
  { name: 'Haverstraw Kings Daughters Public Library - Village Branch', url: 'https://www.haverstrawlibrary.org', eventsUrl: 'https://www.haverstrawlibrary.org/events', city: 'Haverstraw', state: 'NY', zipCode: '10927', county: 'Rockland'},
  { name: 'Highland Public Library', url: 'https://highlandlibrary.org/', eventsUrl: 'https://highlandlibrary.org/', city: 'Highland', state: 'NY', zipCode: '12528', county: 'Ulster'},
  { name: 'Highland Falls Library', url: 'https://highlandfallslibrary.org/', eventsUrl: 'https://highlandfallslibrary.org/calendar/', city: 'Highland Falls', state: 'NY', zipCode: '10928', county: 'Orange'},
  { name: 'Sachem Public Library', url: 'https://holbrooklibrary.org/', eventsUrl: 'https://holbrooklibrary.org/', city: 'Holbrook', state: 'NY', zipCode: '11741', county: 'Suffolk', urlCollision: 'holbrooklibrary.org is AZ, not NY' },
  { name: 'Holland Patent Free Library', url: 'https://hollandpatentlibrary.org/', eventsUrl: 'https://hollandpatentlibrary.org/', city: 'Holland Patent', state: 'NY', zipCode: '13354', county: 'Oneida'},
  { name: 'Community Free Library', url: 'https://www.holleylibrary.org', eventsUrl: 'https://www.holleylibrary.org/events', city: 'Holley', state: 'NY', zipCode: '14470', county: 'Orleans'},
  // URL corrected 2026-08-11 (was hollislibrary.org): QPL branch page: 202-05 Hillside Avenue Hollis NY 11423, phone 718-465-7355. Note branch closed for renovation until Fall 2027
  { name: 'Queens Borough Public Library - Hollis', url: 'https://www.queenslibrary.org/about-us/locations/hollis', eventsUrl: 'https://www.queenslibrary.org/calendar', city: 'Hollis', state: 'NY', zipCode: '11423', county: 'Queens'},
  // URL collision fixed 2026-08-05. This entry pointed at homerlibrary.org,
  // which is the Homer Township Public Library District in Homer Glen,
  // ILLINOIS — a different Homer entirely. Repointed to the real Phillips Free
  // Library, verified live: 37 South Main St, Homer NY 13077, matching this
  // entry's own ZIP, with real dated events on /events/.
  { name: 'Phillips Free Library', url: 'https://phillipsfreelibrary.org', eventsUrl: 'https://phillipsfreelibrary.org/events/', city: 'Homer', state: 'NY', zipCode: '13077', county: 'Cortland'},
  { name: 'Hudson Area Association Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'NY', zipCode: '12534', county: 'Columbia', urlCollision: 'hudsonlibrary.org is OH, not NY' },
  { name: 'Huntington Public Library', url: 'https://www.huntingtonlibrary.org', eventsUrl: 'https://www.huntingtonlibrary.org/events', city: 'Huntington', state: 'NY', zipCode: '11743', county: 'Suffolk'},
  { name: 'Hurley Library District', url: 'https://hurleylibrary.org/', eventsUrl: 'https://hurleylibrary.org/', city: 'Hurley', state: 'NY', zipCode: '12443', county: 'Ulster'},
  { name: 'Hyde Park Free Library', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'NY', zipCode: '12538', county: 'Dutchess'},
  { name: 'Ilion Free Public Library', url: 'https://www.ilionlibrary.org/', eventsUrl: 'https://www.ilionlibrary.org/', city: 'Ilion', state: 'NY', zipCode: '13357', county: 'Herkimer'},
  { name: 'Seneca Nation Of Indians Library Cattaraugus Territory', url: 'https://www.irvinglibrary.org', eventsUrl: 'https://www.irvinglibrary.org/events', city: 'Irving', state: 'NY', zipCode: '14081', county: 'Chautauqua'},
  { name: 'Irvington Pub Lib Guiteau Foundation', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'NY', zipCode: '10533', county: 'Westchester'},
  { name: 'Island Park Public Library', url: 'https://islandparklibrary.org/', eventsUrl: 'https://islandparklibrary.org/', city: 'Island Park', state: 'NY', zipCode: '11558', county: 'Nassau'},
  { name: 'Islip Public Library', url: 'https://isliplibrary.org/', eventsUrl: 'https://isliplibrary.org/', city: 'Islip', state: 'NY', zipCode: '11751', county: 'Suffolk'},
  { name: 'Jericho Public Library', url: 'https://www.jericholibrary.org', eventsUrl: 'https://www.jericholibrary.org/events', city: 'Jericho', state: 'NY', zipCode: '11753', county: 'Nassau'},
  { name: 'Your Home Public Library', url: 'https://www.johnsoncitylibrary.org', eventsUrl: 'https://www.johnsoncitylibrary.org/events', city: 'Johnson City', state: 'NY', zipCode: '13790', county: 'Broome'},
  { name: 'Jordan Bramley Library', url: 'https://www.jordanlibrary.org', eventsUrl: 'https://www.jordanlibrary.org/events', city: 'Jordan', state: 'NY', zipCode: '13080', county: 'Onondaga'},
  { name: 'Jordanville Public Library', url: 'https://jordanvillelibrary.org/', eventsUrl: 'https://jordanvillelibrary.org/upcoming-events/', city: 'Jordanville', state: 'NY', zipCode: '13361', county: 'Herkimer'},
  { name: 'Katonah Village Library', url: 'https://katonahlibrary.org/', eventsUrl: 'https://katonahlibrary.org/', city: 'Katonah', state: 'NY', zipCode: '10536', county: 'Westchester'},
  { name: 'Keene Valley Public Library', url: 'https://www.keenevalleylibrary.org', eventsUrl: 'https://www.keenevalleylibrary.org/events', city: 'Keene Valley', state: 'NY', zipCode: '12943', county: 'Essex'},
  { name: 'Kennedy Free Library', url: 'https://www.kennedylibrary.org', eventsUrl: 'https://www.kennedylibrary.org/events', city: 'Kennedy', state: 'NY', zipCode: '14747', county: 'Chautauqua', urlCollision: 'kennedylibrary.org is MA, not NY' },
  { name: 'Kinderhook Memorial Library', url: 'https://www.kinderhooklibrary.org', eventsUrl: 'https://www.kinderhooklibrary.org/events', city: 'Kinderhook', state: 'NY', zipCode: '12106', county: 'Columbia'},
  { name: 'Kingston Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'NY', zipCode: '12401', county: 'Ulster'},
  { name: 'Orleans Public Library', url: 'https://www.lafargevillelibrary.org', eventsUrl: 'https://www.lafargevillelibrary.org/events', city: 'Lafargeville', state: 'NY', zipCode: '13656', county: 'Jefferson County'},
  { name: 'Lafayette Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'NY', zipCode: '13084', county: 'Onondaga'},
  { name: 'Lake Placid Public Library', url: 'https://www.lakeplacidlibrary.org', eventsUrl: 'https://www.lakeplacidlibrary.org/events', city: 'Lake Placid', state: 'NY', zipCode: '12946', county: 'Essex'},
  { name: 'Lakewood Memorial Library', url: 'https://lakewoodlibrary.org/', eventsUrl: 'https://lakewoodlibrary.org/events/event/', city: 'Lakewood', state: 'NY', zipCode: '14750', county: 'Chautauqua'},
  { name: 'Lansing Community Library', url: 'https://www.lansinglibrary.org', eventsUrl: 'https://www.lansinglibrary.org/events', city: 'Lansing', state: 'NY', zipCode: '14882', county: 'Tompkins'},
  { name: 'Larchmont Public Library', url: 'https://www.larchmontlibrary.org', eventsUrl: 'https://www.larchmontlibrary.org/events', city: 'Larchmont', state: 'NY', zipCode: '10538', county: 'Westchester'},
  { name: 'Woodward Memorial Library', url: 'https://www.leroylibrary.org/', eventsUrl: 'https://www.leroylibrary.org/', city: 'Leroy', state: 'NY', zipCode: '14482', county: 'Genesee County'},
  { name: 'Lewiston Public Library', url: 'https://www.lewistonlibrary.org/', eventsUrl: 'https://www.lewistonlibrary.org/', city: 'Lewiston', state: 'NY', zipCode: '14092', county: 'Niagara'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX), not NY. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Liberty Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'NY', zipCode: '12754', county: 'Sullivan'},
  { name: 'Lindenhurst Memorial Library', url: 'https://www.lindenhurstlibrary.org', eventsUrl: 'https://www.lindenhurstlibrary.org/events', city: 'Lindenhurst', state: 'NY', zipCode: '11757', county: 'Suffolk'},
  { name: 'Lisle Free Library', url: 'https://www.lislelibrary.org/', eventsUrl: 'https://www.lislelibrary.org/', city: 'Lisle', state: 'NY', zipCode: '13797', county: 'Broome'},
  { name: 'Little Falls Public Library', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'NY', zipCode: '13365', county: 'Herkimer', urlCollision: 'littlefallslibrary.org is NJ, not NY' },
  { name: 'Memorial Library Of Little Valley', url: 'https://littlevalleylibrary.org/', eventsUrl: 'https://littlevalleylibrary.org/', city: 'Little Valley', state: 'NY', zipCode: '14755', county: 'Cattaraugus'},
  { name: 'Livingston Free Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'NY', zipCode: '12541', county: 'Livingston County', urlCollision: 'livingstonlibrary.org is NJ, not NY' },
  { name: 'Livingston Manor Free Library', url: 'https://www.livingstonmanorlibrary.org', eventsUrl: 'https://www.livingstonmanorlibrary.org/events', city: 'Livingston Manor', state: 'NY', zipCode: '12758', county: 'Sullivan'},
  { name: 'Livonia Public Library', url: 'https://livonialibrary.org/', eventsUrl: 'https://livonialibrary.org/', city: 'Livonia', state: 'NY', zipCode: '14487', county: 'Livingston'},
  { name: 'Lockport Public Library', url: 'https://www.lockportlibrary.org', eventsUrl: 'https://www.lockportlibrary.org/events', city: 'Lockport', state: 'NY', zipCode: '14094', county: 'Niagara'},
  { name: 'Locust Valley Library', url: 'https://www.locustvalleylibrary.org', eventsUrl: 'https://www.locustvalleylibrary.org/events', city: 'Locust Valley', state: 'NY', zipCode: '11560', county: 'Nassau'},
  { name: 'Long Beach Public Library', url: 'https://www.longbeachlibrary.org', eventsUrl: 'https://www.longbeachlibrary.org/events', city: 'Long Beach', state: 'NY', zipCode: '11561', county: 'Nassau'},
  { name: 'William K Sanford Town Library', url: 'https://loudonvillelibrary.org/', eventsUrl: 'https://loudonvillelibrary.org/', city: 'Loudonville', state: 'NY', zipCode: '12211', county: 'Albany'},
  { name: 'Lynbrook Public Library', url: 'https://www.lynbrooklibrary.org', eventsUrl: 'https://www.lynbrooklibrary.org/events', city: 'Lynbrook', state: 'NY', zipCode: '11563', county: 'Nassau'},
  { name: 'Lyons Public Library', url: 'https://lyonslibrary.org/', eventsUrl: 'https://lyonslibrary.org/', city: 'Lyons', state: 'NY', zipCode: '14489', county: 'Wayne', urlCollision: 'lyonslibrary.org is IL, not NY' },
  { name: 'Lyons Falls Library', url: 'https://www.lyonsfallslibrary.org', eventsUrl: 'https://www.lyonsfallslibrary.org/events', city: 'Lyons Falls', state: 'NY', zipCode: '13368', county: 'Lewis'},
  { name: 'King Memorial Library', url: 'https://www.machiaslibrary.org', eventsUrl: 'https://www.machiaslibrary.org/events', city: 'Machias', state: 'NY', zipCode: '14101', county: 'Cattaraugus'},
  { name: 'Mahopac Public Library', url: 'https://www.mahopaclibrary.org', eventsUrl: 'https://www.mahopaclibrary.org/events', city: 'Mahopac', state: 'NY', zipCode: '10541', county: 'Putnam'},
  { name: 'Malverne Public Library', url: 'https://malvernelibrary.org/', eventsUrl: 'https://malvernelibrary.org/', city: 'Malverne', state: 'NY', zipCode: '11565', county: 'Nassau'},
  { name: 'Mamaroneck Public Library District', url: 'https://www.mamaronecklibrary.org', eventsUrl: 'https://www.mamaronecklibrary.org/events', city: 'Mamaroneck', state: 'NY', zipCode: '10543', county: 'Westchester'},
  { name: 'Manhasset Public Library', url: 'https://manhassetlibrary.org/', eventsUrl: 'https://manhassetlibrary.org/site/', city: 'Manhasset', state: 'NY', zipCode: '11030', county: 'Nassau'},
  { name: 'Manlius Library', url: 'https://www.manliuslibrary.org', eventsUrl: 'https://www.manliuslibrary.org/events', city: 'Manlius', state: 'NY', zipCode: '13104', county: 'Onondaga'},
  { name: 'Mannsville Free Library', url: 'https://www.mannsvillelibrary.org', eventsUrl: 'https://www.mannsvillelibrary.org/events', city: 'Mannsville', state: 'NY', zipCode: '13661', county: 'Jefferson'},
  { name: 'Marcellus Free Library', url: 'https://www.marcelluslibrary.org', eventsUrl: 'https://www.marcelluslibrary.org/events', city: 'Marcellus', state: 'NY', zipCode: '13108', county: 'Onondaga'},
  { name: 'Marion Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'NY', zipCode: '14505', county: 'Wayne', urlCollision: 'marionlibrary.org is OH, not NY' },
  { name: 'Marlboro Free Library', url: 'https://www.marlborolibrary.org', eventsUrl: 'https://www.marlborolibrary.org/events', city: 'Marlboro', state: 'NY', zipCode: '12542', county: 'Ulster'},
  { name: 'William H. Bush Memorial Library', url: 'https://www.martinsburglibrary.org', eventsUrl: 'https://www.martinsburglibrary.org/events', city: 'Martinsburg', state: 'NY', zipCode: '13404', county: 'Lewis'},
  { name: 'Plainedge Public Library', url: 'https://massapequalibrary.org/', eventsUrl: 'https://massapequalibrary.org/', city: 'Massapequa', state: 'NY', zipCode: '11758', county: 'Nassau'},
  { name: 'Mayville Library', url: 'https://www.mayvillelibrary.org/', eventsUrl: 'https://www.mayvillelibrary.org/calendar', city: 'Mayville', state: 'NY', zipCode: '14757', county: 'Chautauqua'},
  { name: 'Menands Public Library', url: 'https://www.menandslibrary.org', eventsUrl: 'https://www.menandslibrary.org/events', city: 'Menands', state: 'NY', zipCode: '12204', county: 'Albany'},
  { name: 'Merrick Library', url: 'https://www.merricklibrary.org', eventsUrl: 'https://www.merricklibrary.org/events', city: 'Merrick', state: 'NY', zipCode: '11566', county: 'Nassau'},
  { name: 'Middleburgh Library', url: 'https://www.middleburghlibrary.org/', eventsUrl: 'https://www.middleburghlibrary.org/', city: 'Middleburgh', state: 'NY', zipCode: '12122', county: 'Schoharie'},
  { name: 'Ramapo Catskill Library System', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'NY', zipCode: '10940', county: 'Orange'},
  { name: 'Middleville Free Library', url: 'https://middlevillelibrary.org/', eventsUrl: 'https://middlevillelibrary.org/', city: 'Middleville', state: 'NY', zipCode: '13406', county: 'Herkimer'},
  { name: 'Millbrook Free Library', url: 'https://millbrooklibrary.org/', eventsUrl: 'https://millbrooklibrary.org/', city: 'Millbrook', state: 'NY', zipCode: '12545', county: 'Dutchess'},
  { name: 'Minoa Library', url: 'https://www.minoalibrary.org', eventsUrl: 'https://www.minoalibrary.org/events', city: 'Minoa', state: 'NY', zipCode: '13116', county: 'Onondaga'},
  { name: 'Monroe Free Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NY', zipCode: '10950', county: 'Monroe County'},
  { name: 'Montauk Library', url: 'https://www.montauklibrary.org', eventsUrl: 'https://www.montauklibrary.org/events', city: 'Montauk', state: 'NY', zipCode: '11954', county: 'Suffolk'},
  { name: 'Montgomery Free Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'NY', zipCode: '12549', county: 'Montgomery County'},
  { name: 'Ethelbert B. Crawford Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'NY', zipCode: '12701', county: 'Sullivan', urlCollision: 'allertonpubliclibrary.org is IL, not NY' },
  { name: 'Montour Falls Memorial Library', url: 'https://www.montourfallslibrary.org', eventsUrl: 'https://www.montourfallslibrary.org/events', city: 'Montour Falls', state: 'NY', zipCode: '14865', county: 'Schuyler'},
  { name: 'Mooers Free Library', url: 'https://www.mooerslibrary.org', eventsUrl: 'https://www.mooerslibrary.org/events', city: 'Mooers', state: 'NY', zipCode: '12958', county: 'Clinton'},
  { name: 'Morristown Public Library', url: 'https://www.morristownlibrary.org', eventsUrl: 'https://www.morristownlibrary.org/events', city: 'Morristown', state: 'NY', zipCode: '13664', county: 'St. Lawrence', urlCollision: 'morristownlibrary.org is NJ, not NY' },
  { name: 'Mount Morris Library', url: 'https://www.mountmorrislibrary.org', eventsUrl: 'https://www.mountmorrislibrary.org/events', city: 'Mount Morris', state: 'NY', zipCode: '14510', county: 'Livingston'},
  { name: 'Nanuet Public Library', url: 'https://nanuetpubliclibrary.org/', eventsUrl: 'https://nanuetpubliclibrary.org/', city: 'Nanuet', state: 'NY', zipCode: '10954', county: 'Rockland'},
  { name: 'Naples Library', url: 'https://www.napleslibrary.org', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'NY', zipCode: '14512', county: 'Ontario'},
  { name: 'Nassau Free Library', url: 'https://nassaulibrary.org/', eventsUrl: 'https://nassaulibrary.org/', city: 'Nassau', state: 'NY', zipCode: '12123', county: 'Nassau County'},
  { name: 'New Berlin Library', url: 'https://www.newberlinlibrary.org', eventsUrl: 'https://www.newberlinlibrary.org/events', city: 'New Berlin', state: 'NY', zipCode: '13411', county: 'Chenango'},
  { name: 'Library Association Of Rockland County', url: 'https://www.newcitylibrary.org', eventsUrl: 'https://www.newcitylibrary.org/events', city: 'New City', state: 'NY', zipCode: '10956', county: 'Rockland'},
  { name: 'New Lebanon Library', url: 'https://newlebanonlibrary.org/', eventsUrl: 'https://newlebanonlibrary.org/calendar/', city: 'New Lebanon', state: 'NY', zipCode: '12125', county: 'Columbia'},
  { name: 'New Woodstock Free Library', url: 'https://newwoodstocklibrary.org/', eventsUrl: 'https://newwoodstocklibrary.org/', city: 'New Woodstock', state: 'NY', zipCode: '13122', county: 'Madison'},
  { name: 'New York Mills Public Library', url: 'https://www.newyorkmillslibrary.org/', eventsUrl: 'https://www.newyorkmillslibrary.org/', city: 'New York Mills', state: 'NY', zipCode: '13417', county: 'Oneida'},
  { name: 'Newark Public Library', url: 'https://newarklibrary.org/', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'NY', zipCode: '14513', county: 'Wayne'},
  { name: 'Newburgh Free Library', url: 'https://newburghlibrary.org/', eventsUrl: 'https://newburghlibrary.org/', city: 'Newburgh', state: 'NY', zipCode: '12550', county: 'Orange'},
  { name: 'Newfane Free Library', url: 'https://www.newfanelibrary.org', eventsUrl: 'https://www.newfanelibrary.org/events', city: 'Newfane', state: 'NY', zipCode: '14108', county: 'Niagara'},
  { name: 'North Bellmore Public Library', url: 'https://www.northbellmorelibrary.org', eventsUrl: 'https://www.northbellmorelibrary.org/events', city: 'North Bellmore', state: 'NY', zipCode: '11710', county: 'Nassau'},
  { name: 'North Chatham Free Library', url: 'https://www.northchathamlibrary.org', eventsUrl: 'https://www.northchathamlibrary.org/events', city: 'North Chatham', state: 'NY', zipCode: '12132', county: 'Columbia'},
  { name: 'Northville Public Library', url: 'https://www.northvillelibrary.org', eventsUrl: 'https://www.northvillelibrary.org/events', city: 'Northville', state: 'NY', zipCode: '12134', county: 'Suffolk'},
  // URL corrected 2026-08-11 (was norwichlibrary.org): 3 Court St Norwich NY 13815, phone 607-334-4034. norwichlibrary.org is Norwich VERMONT public library
  { name: 'Guernsey Memorial Library Of Norwich', url: 'https://guernseymemoriallibrary.org', eventsUrl: 'https://guernseymemoriallibrary.org', city: 'Norwich', state: 'NY', zipCode: '13815', county: 'Chenango'},
  { name: 'Norwood Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'NY', zipCode: '13668', county: 'St. Lawrence', urlCollision: 'norwoodlibrary.org is MA, not NY' },
  { name: 'Nyack Library', url: 'https://www.nyacklibrary.org', eventsUrl: 'https://www.nyacklibrary.org/events', city: 'Nyack', state: 'NY', zipCode: '10960', county: 'Rockland'},
  { name: 'Haxton Memorial Library', url: 'https://www.oakfieldlibrary.org', eventsUrl: 'https://www.oakfieldlibrary.org/events', city: 'Oakfield', state: 'NY', zipCode: '14125', county: 'Genesee'},
  { name: 'Old Forge Library', url: 'https://oldforgelibrary.org/', eventsUrl: 'https://oldforgelibrary.org/', city: 'Old Forge', state: 'NY', zipCode: '13420', county: 'Herkimer'},
  { name: 'Olean Public Library', url: 'https://oleanlibrary.org/', eventsUrl: 'https://oleanlibrary.org/events/event/', city: 'Olean', state: 'NY', zipCode: '14760', county: 'Cattaraugus'},
  { name: 'Orangeburg Library', url: 'https://orangeburglibrary.org/', eventsUrl: 'https://orangeburglibrary.org/', city: 'Orangeburg', state: 'NY', zipCode: '10962', county: 'Rockland'},
  { name: 'Oriskany Public Library', url: 'https://oriskanylibrary.org/', eventsUrl: 'https://oriskanylibrary.org/', city: 'Oriskany', state: 'NY', zipCode: '13424', county: 'Oneida'},
  { name: 'C. W. Clark Memorial Library', url: 'https://oriskanyfallslibrary.org/', eventsUrl: 'https://oriskanyfallslibrary.org/', city: 'Oriskany Falls', state: 'NY', zipCode: '13425', county: 'Oneida'},
  { name: 'Ossining Public Library', url: 'https://ossininglibrary.org/', eventsUrl: 'https://ossininglibrary.org/', city: 'Ossining', state: 'NY', zipCode: '10562', county: 'Westchester'},
  { name: 'Oswego School District Public Library', url: 'https://oswego.mykansaslibrary.org/', eventsUrl: 'https://oswego.mykansaslibrary.org/', city: 'Oswego', state: 'NY', zipCode: '13126', county: 'Oswego County'},
  { name: 'Edith B. Ford Memorial Library', url: 'https://www.ovidlibrary.org', eventsUrl: 'https://www.ovidlibrary.org/events', city: 'Ovid', state: 'NY', zipCode: '14521', county: 'Seneca'},
  // URL corrected 2026-08-11 (was oxfordlibrary.org): 8 Fort Hill Park Oxford NY 13830, phone 607-843-6146
  { name: 'Oxford Memorial Library', url: 'https://oxfordmemoriallibrary.org', eventsUrl: 'https://oxfordmemoriallibrary.org', city: 'Oxford', state: 'NY', zipCode: '13830', county: 'Chenango'},
  { name: 'Oyster Bay-East Norwich Public Library', url: 'https://oysterbaylibrary.org/', eventsUrl: 'https://oysterbaylibrary.org/', city: 'Oyster Bay', state: 'NY', zipCode: '11771', county: 'Nassau'},
  { name: 'Palisades Free Library', url: 'https://palisadeslibrary.org/', eventsUrl: 'https://palisadeslibrary.org/', city: 'Palisades', state: 'NY', zipCode: '10964', county: 'Rockland'},
  { name: 'Parish Public Library', url: 'https://www.parishlibrary.org', eventsUrl: 'https://www.parishlibrary.org/events', city: 'Parish', state: 'NY', zipCode: '13131', county: 'Oswego'},
  // URL corrected 2026-08-11 (was pattersonlibrary.org): fetched site: 40 S. Portage St Westfield NY 14787, phone 716-326-2154
  { name: 'Patterson Library', url: 'https://pattersonlib.org', eventsUrl: 'https://pattersonlib.org/anchor-links/adultprograms/calendar/', city: 'Patterson', state: 'NY', zipCode: '12563', county: 'Putnam'},
  { name: 'Pawling Free Library', url: 'https://www.pawlinglibrary.org', eventsUrl: 'https://www.pawlinglibrary.org/events', city: 'Pawling', state: 'NY', zipCode: '12564', county: 'Dutchess'},
  { name: 'Pearl River Public Library', url: 'https://pearlriverlibrary.org/', eventsUrl: 'https://pearlriverlibrary.org/', city: 'Pearl River', state: 'NY', zipCode: '10965', county: 'Rockland'},
  { name: 'Town Of Pelham Public Library', url: 'https://www.pelhamlibrary.org/', eventsUrl: 'https://www.pelhamlibrary.org/calendar/', city: 'Pelham', state: 'NY', zipCode: '10803', county: 'Westchester'},
  { name: 'Penfield Public Library', url: 'https://www.penfieldlibrary.org', eventsUrl: 'https://www.penfieldlibrary.org/events', city: 'Penfield', state: 'NY', zipCode: '14526', county: 'Monroe'},
  { name: 'Perry Public Library', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'NY', zipCode: '14530', county: 'Wyoming', urlCollision: 'perrylibrary.org is NC, not NY' },
  { name: 'Peru Free Library', url: 'https://www.perulibrary.org', eventsUrl: 'https://www.perulibrary.org/events', city: 'Peru', state: 'NY', zipCode: '12972', county: 'Clinton', urlCollision: 'perulibrary.org is IL, not NY' },
  { name: 'Phoenicia Library', url: 'https://phoenicialibrary.org/', eventsUrl: 'https://phoenicialibrary.org/calendar/', city: 'Phoenicia', state: 'NY', zipCode: '12464', county: 'Ulster'},
  { name: 'Phoenix Public Library', url: 'https://www.phoenixlibrary.org', eventsUrl: 'https://www.phoenixlibrary.org/events', city: 'Phoenix', state: 'NY', zipCode: '13135', county: 'Oswego'},
  { name: 'Piermont Library District', url: 'https://www.piermontlibrary.org', eventsUrl: 'https://www.piermontlibrary.org/events', city: 'Piermont', state: 'NY', zipCode: '10968', county: 'Rockland'},
  { name: 'Pike Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pike', state: 'NY', zipCode: '14130', county: 'Wyoming'},
  { name: 'Morton Memorial Library', url: 'https://pinehilllibrary.org/', eventsUrl: 'https://pinehilllibrary.org/calendar/', city: 'Pine Hill', state: 'NY', zipCode: '12465', county: 'Ulster'},
  { name: 'Pine Plains Free Library', url: 'https://www.pineplainslibrary.org', eventsUrl: 'https://www.pineplainslibrary.org/events', city: 'Pine Plains', state: 'NY', zipCode: '12567', county: 'Dutchess'},
  { name: 'Pleasant Valley Free Library', url: 'https://www.pleasantvalleylibrary.org', eventsUrl: 'https://www.pleasantvalleylibrary.org/events', city: 'Pleasant Valley', state: 'NY', zipCode: '12569', county: 'Dutchess'},
  { name: 'Poestenkill Library', url: 'https://www.poestenkilllibrary.org', eventsUrl: 'https://www.poestenkilllibrary.org/events', city: 'Poestenkill', state: 'NY', zipCode: '12140', county: 'Rensselaer'},
  { name: 'Port Byron Library', url: 'https://www.portbyronlibrary.org', eventsUrl: 'https://www.portbyronlibrary.org/events', city: 'Port Byron', state: 'NY', zipCode: '13140', county: 'Cayuga'},
  { name: 'Port Chester Public Library', url: 'https://portchesterlibrary.org/', eventsUrl: 'https://portchesterlibrary.org/', city: 'Port Chester', state: 'NY', zipCode: '10573', county: 'Westchester'},
  { name: 'Port Jervis Free Library', url: 'https://www.portjervislibrary.org/', eventsUrl: 'https://www.portjervislibrary.org/', city: 'Port Jervis', state: 'NY', zipCode: '12771', county: 'Orange'},
  { name: 'Port Leyden Community Library', url: 'https://www.portleydenlibrary.org', eventsUrl: 'https://www.portleydenlibrary.org/events', city: 'Port Leyden', state: 'NY', zipCode: '13433', county: 'Lewis'},
  { name: 'Portville Free Library', url: 'https://www.portvillelibrary.org', eventsUrl: 'https://www.portvillelibrary.org/events', city: 'Portville', state: 'NY', zipCode: '14770', county: 'Cattaraugus'},
  { name: 'Potsdam Public Library', url: 'https://www.potsdamlibrary.org', eventsUrl: 'https://www.potsdamlibrary.org/events', city: 'Potsdam', state: 'NY', zipCode: '13676', county: 'St. Lawrence'},
  { name: 'Pound Ridge Library District', url: 'https://www.poundridgelibrary.org', eventsUrl: 'https://www.poundridgelibrary.org/events', city: 'Pound Ridge', state: 'NY', zipCode: '10576', county: 'Westchester'},
  // URL corrected 2026-08-11 (was prospectlibrary.org): Mid-York Library System site; 116 State Street Prospect NY 13435, phone 315-896-2736, Oneida County. No separate calendar page
  { name: 'Prospect Free Library', url: 'https://prospect.midyork.org', eventsUrl: 'https://prospect.midyork.org', city: 'Prospect', state: 'NY', zipCode: '13435', county: 'Oneida'},
  { name: 'Putnam Valley Free Library', url: 'https://putnamvalleylibrary.org/', eventsUrl: 'https://putnamvalleylibrary.org/calendar/', city: 'Putnam Valley', state: 'NY', zipCode: '10579', county: 'Putnam'},
  { name: 'Quogue Library', url: 'https://www.quoguelibrary.org/', eventsUrl: 'https://www.quoguelibrary.org/', city: 'Quogue', state: 'NY', zipCode: '11959', county: 'Suffolk'},
  { name: 'Ransomville Free Library', url: 'https://www.ransomvillelibrary.org/', eventsUrl: 'https://www.ransomvillelibrary.org/', city: 'Ransomville', state: 'NY', zipCode: '14131', county: 'Niagara'},
  { name: 'Red Hook Public Library', url: 'https://redhooklibrary.org/', eventsUrl: 'https://redhooklibrary.org/calendar/', city: 'Red Hook', state: 'NY', zipCode: '12571', county: 'Dutchess'},
  { name: 'Didymus Thomas Library', url: 'https://remsenlibrary.org/', eventsUrl: 'https://remsenlibrary.org/', city: 'Remsen', state: 'NY', zipCode: '13438', county: 'Oneida'},
  { name: 'Rensselaer Public Library', url: 'https://www.rensselaerlibrary.org', eventsUrl: 'https://www.rensselaerlibrary.org/events', city: 'Rensselaer', state: 'NY', zipCode: '12144', county: 'Rensselaer County'},
  { name: 'Rensselaerville Public Library', url: 'https://www.rensselaervillelibrary.org', eventsUrl: 'https://www.rensselaervillelibrary.org/events', city: 'Rensselaerville', state: 'NY', zipCode: '12147', county: 'Albany'},
  { name: 'Ripley Free Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'NY', zipCode: '14775', county: 'Chautauqua'},
  { name: 'Riverhead Free Library', url: 'https://www.riverheadlibrary.org', eventsUrl: 'https://www.riverheadlibrary.org/events', city: 'Riverhead', state: 'NY', zipCode: '11901', county: 'Suffolk'},
  { name: 'Rodman Public Library', url: 'https://www.rodmanlibrary.org', eventsUrl: 'https://www.rodmanlibrary.org/events', city: 'Rodman', state: 'NY', zipCode: '13682', county: 'Jefferson'},
  { name: 'The Jervis Public Library Association, Inc.', url: 'https://www.romelibrary.org', eventsUrl: 'https://www.romelibrary.org/events', city: 'Rome', state: 'NY', zipCode: '13440', county: 'Oneida'},
  { name: 'Roosevelt Public Library', url: 'https://www.rooseveltlibrary.org', eventsUrl: 'https://www.rooseveltlibrary.org/events', city: 'Roosevelt', state: 'NY', zipCode: '11575', county: 'Nassau'},
  { name: 'Rose Free Library', url: 'https://www.roselibrary.org', eventsUrl: 'https://www.roselibrary.org/events', city: 'Rose', state: 'NY', zipCode: '14542', county: 'Wayne'},
  { name: 'Rosendale Library', url: 'https://rosendalelibrary.org/', eventsUrl: 'https://rosendalelibrary.org/', city: 'Rosendale', state: 'NY', zipCode: '12472', county: 'Ulster'},
  { name: 'Bryant Library', url: 'https://www.roslynlibrary.org', eventsUrl: 'https://www.roslynlibrary.org/events', city: 'Roslyn', state: 'NY', zipCode: '11576', county: 'Nassau'},
  { name: 'Womens Round Lake Improvement Society Lib', url: 'https://roundlake.sals.edu/', eventsUrl: 'https://roundlake.sals.edu/', city: 'Round Lake', state: 'NY', zipCode: '12151', county: 'Saratoga'},
  { name: 'Rouses Point Dodge Memorial Library', url: 'https://www.rousespointlibrary.org', eventsUrl: 'https://www.rousespointlibrary.org/events', city: 'Rouses Point', state: 'NY', zipCode: '12979', county: 'Clinton'},
  // URL corrected 2026-08-11 (was roxburylibrary.org): 53742 State Hwy 30 PO Box 186 Roxbury NY 12474, ph 607-326-7901, Four County Library System
  { name: 'Roxbury Library Association', url: 'https://libraries.4cls.org/roxbury/', eventsUrl: 'https://libraries.4cls.org/roxbury/events/', city: 'Roxbury', state: 'NY', zipCode: '12474', county: 'Queens'},
  { name: 'Rush Public Library', url: 'https://rushlibrary.org/', eventsUrl: 'https://rushlibrary.org/', city: 'Rush', state: 'NY', zipCode: '14543', county: 'Monroe'},
  { name: 'Russell Public Library', url: 'https://russelllibrary.org/', eventsUrl: 'https://russelllibrary.org/', city: 'Russell', state: 'NY', zipCode: '13684', county: 'St. Lawrence', urlCollision: 'russelllibrary.org is CT, not NY' },
  { name: 'Rye Free Reading Room', url: 'https://www.ryelibrary.org/', eventsUrl: 'https://www.ryelibrary.org/', city: 'Rye', state: 'NY', zipCode: '10580', county: 'Westchester'},
  { name: 'John Jermain Memorial Library', url: 'https://www.sagharborlibrary.org', eventsUrl: 'https://www.sagharborlibrary.org/events', city: 'Sag Harbor', state: 'NY', zipCode: '11963', county: 'Suffolk'},
  { name: 'Salamanca Public Library', url: 'https://www.salamancalibrary.org', eventsUrl: 'https://www.salamancalibrary.org/events', city: 'Salamanca', state: 'NY', zipCode: '14779', county: 'Cattaraugus'},
  { name: 'Bancroft Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'NY', zipCode: '12865', county: 'Washington', urlCollision: 'salemlibrary.org is OR, not NY' },
  { name: 'Annie Porter Ainsworth Memorial Library', url: 'https://ainsworthmemoriallibrary.org/', eventsUrl: 'https://ainsworthmemoriallibrary.org/', city: 'Sandy Creek', state: 'NY', zipCode: '13145', county: 'Oswego'},
  { name: 'Sayville Library', url: 'https://www.sayvillelibrary.org', eventsUrl: 'https://www.sayvillelibrary.org/events', city: 'Sayville', state: 'NY', zipCode: '11782', county: 'Suffolk'},
  { name: 'Scarsdale Public Library', url: 'https://www.scarsdalelibrary.org', eventsUrl: 'https://www.scarsdalelibrary.org/events', city: 'Scarsdale', state: 'NY', zipCode: '10583', county: 'Westchester'},
  { name: 'Schoharie Free Library Assn.', url: 'https://www.schoharielibrary.org/', eventsUrl: 'https://www.schoharielibrary.org/', city: 'Schoharie', state: 'NY', zipCode: '12157', county: 'Schoharie County'},
  { name: 'Schroon Lake Public Library', url: 'https://www.schroonlakelibrary.org', eventsUrl: 'https://www.schroonlakelibrary.org/events', city: 'Schroon Lake', state: 'NY', zipCode: '12870', county: 'Essex'},
  { name: 'Scio Memorial Library', url: 'https://www.sciolibrary.org', eventsUrl: 'https://www.sciolibrary.org/events', city: 'Scio', state: 'NY', zipCode: '14880', county: 'Allegany'},
  { name: 'Scottsville Free Library', url: 'https://www.scottsvillelibrary.org', eventsUrl: 'https://www.scottsvillelibrary.org/events', city: 'Scottsville', state: 'NY', zipCode: '14546', county: 'Monroe'},
  { name: 'Sea Cliff Village Library', url: 'https://www.seaclifflibrary.org', eventsUrl: 'https://www.seaclifflibrary.org/events', city: 'Sea Cliff', state: 'NY', zipCode: '11579', county: 'Nassau'},
  { name: 'Seaford Public Library', url: 'https://seafordlibrary.org/', eventsUrl: 'https://seafordlibrary.org/library-events/', city: 'Seaford', state: 'NY', zipCode: '11783', county: 'Nassau'},
  { name: 'Seneca Falls Library', url: 'https://senecafallslibrary.org/', eventsUrl: 'https://senecafallslibrary.org/', city: 'Seneca Falls', state: 'NY', zipCode: '13148', county: 'Seneca'},
  { name: 'Shelter Island Public Library Society', url: 'https://www.shelterislandlibrary.org', eventsUrl: 'https://www.shelterislandlibrary.org/events', city: 'Shelter Island', state: 'NY', zipCode: '11964', county: 'Suffolk'},
  { name: 'Sherburne Public Library', url: 'https://www.sherburnelibrary.org', eventsUrl: 'https://www.sherburnelibrary.org/events', city: 'Sherburne', state: 'NY', zipCode: '13460', county: 'Chenango'},
  { name: 'Minerva Free Library', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'NY', zipCode: '14781', county: 'Chautauqua', urlCollision: 'shermanlibrary.org is CT, not NY' },
  { name: 'John C. Hart Memorial Library', url: 'https://www.shruboaklibrary.org', eventsUrl: 'https://www.shruboaklibrary.org/events', city: 'Shrub Oak', state: 'NY', zipCode: '10588', county: 'Westchester'},
  { name: 'Sidney Memorial Public Library', url: 'https://www.sidneylibrary.org/', eventsUrl: 'https://www.sidneylibrary.org/index.php/calendar/', city: 'Sidney', state: 'NY', zipCode: '13838', county: 'Delaware'},
  { name: 'Sinclairville Free Library', url: 'https://www.sinclairvillelibrary.org', eventsUrl: 'https://www.sinclairvillelibrary.org/events', city: 'Sinclairville', state: 'NY', zipCode: '14782', county: 'Chautauqua'},
  { name: 'Sloatsburg Public Library', url: 'https://sloatsburglibrary.org/', eventsUrl: 'https://sloatsburglibrary.org/', city: 'Sloatsburg', state: 'NY', zipCode: '10974', county: 'Rockland'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'NY', zipCode: '13464', county: 'Chenango'},
  { name: 'Sodus Free Library', url: 'https://www.soduslibrary.org', eventsUrl: 'https://www.soduslibrary.org/events', city: 'Sodus', state: 'NY', zipCode: '14551', county: 'Wayne'},
  { name: 'Solvay Public Library', url: 'https://www.solvaylibrary.org', eventsUrl: 'https://www.solvaylibrary.org/events', city: 'Solvay', state: 'NY', zipCode: '13209', county: 'Onondaga'},
  { name: 'Somers Library', url: 'https://www.somerslibrary.org', eventsUrl: 'https://www.somerslibrary.org/events', city: 'Somers', state: 'NY', zipCode: '10589', county: 'Westchester'},
  { name: 'Lewisboro Library', url: 'https://lewisborolibrary.org/', eventsUrl: 'https://lewisborolibrary.org/events/', city: 'South Salem', state: 'NY', zipCode: '10590', county: 'Westchester'},
  { name: 'Southold Free Library', url: 'https://southoldlibrary.org/', eventsUrl: 'https://southoldlibrary.org/', city: 'Southold', state: 'NY', zipCode: '11971', county: 'Suffolk'},
  { name: 'Finkelstein Memorial Library', url: 'https://www.springvalleylibrary.org', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'NY', zipCode: '10977', county: 'Rockland'},
  { name: 'Staatsburg Library', url: 'https://staatsburglibrary.org/', eventsUrl: 'https://staatsburglibrary.org/calendar/', city: 'Staatsburg', state: 'NY', zipCode: '12580', county: 'Dutchess'},
  { name: 'Stamford Village Library', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'NY', zipCode: '12167', county: 'Delaware', urlCollision: 'stamfordlibrary.org is VT, not NY' },
  { name: 'Stephentown Memorial Library', url: 'https://www.stephentownlibrary.org', eventsUrl: 'https://www.stephentownlibrary.org/events', city: 'Stephentown', state: 'NY', zipCode: '12168', county: 'Rensselaer'},
  { name: 'Stillwater Free Library', url: 'https://www.stillwaterlibrary.org', eventsUrl: 'https://www.stillwaterlibrary.org/events', city: 'Stillwater', state: 'NY', zipCode: '12170', county: 'Saratoga'},
  { name: 'Mary E. Seymour Memorial Free Library', url: 'https://stocktonlibrary.org/', eventsUrl: 'https://stocktonlibrary.org/', city: 'Stockton', state: 'NY', zipCode: '14784', county: 'Chautauqua'},
  { name: 'Stone Ridge Public Library', url: 'https://stoneridgelibrary.org/', eventsUrl: 'https://stoneridgelibrary.org/', city: 'Stone Ridge', state: 'NY', zipCode: '12484', county: 'Ulster'},
  { name: 'Rose Memorial Library Association', url: 'https://www.rosememoriallibrary.org/', eventsUrl: 'https://www.rosememoriallibrary.org/events/', city: 'Stony Point', state: 'NY', zipCode: '10980', county: 'Rockland'},
  { name: 'Suffern Free Library', url: 'https://www.suffernlibrary.org', eventsUrl: 'https://www.suffernlibrary.org/events', city: 'Suffern', state: 'NY', zipCode: '10901', county: 'Rockland'},
  { name: 'Syosset Public Library', url: 'https://www.syossetlibrary.org', eventsUrl: 'https://www.syossetlibrary.org/events', city: 'Syosset', state: 'NY', zipCode: '11791', county: 'Nassau'},
  { name: 'Tappan Library', url: 'https://tappanlibrary.org/', eventsUrl: 'https://tappanlibrary.org/', city: 'Tappan', state: 'NY', zipCode: '10983', county: 'Rockland'},
  { name: 'Warner Library', url: 'https://www.tarrytownlibrary.org', eventsUrl: 'https://www.tarrytownlibrary.org/events', city: 'Tarrytown', state: 'NY', zipCode: '10591', county: 'Westchester'},
  { name: 'Tivoli Free Library', url: 'https://engagedpatrons.org/', eventsUrl: 'https://engagedpatrons.org/EventsCalendar.cfm?SiteID=6141', city: 'Tivoli', state: 'NY', zipCode: '12583', county: 'Dutchess'},
  { name: 'Tomkins Cove Public Library', url: 'https://www.tomkinscovelibrary.org/', eventsUrl: 'https://www.tomkinscovelibrary.org/', city: 'Tomkins Cove', state: 'NY', zipCode: '10986', county: 'Rockland'},
  { name: 'Ulysses Philomathic Library', url: 'https://www.trumansburglibrary.org/', eventsUrl: 'https://www.trumansburglibrary.org/', city: 'Trumansburg', state: 'NY', zipCode: '14886', county: 'Tompkins'},
  { name: 'Tuckahoe Public Library', url: 'https://www.tuckahoelibrary.org', eventsUrl: 'https://www.tuckahoelibrary.org/events', city: 'Tuckahoe', state: 'NY', zipCode: '10707', county: 'Westchester'},
  { name: 'B. Elizabeth Strong Memorial Library', url: 'https://www.turinlibrary.org', eventsUrl: 'https://www.turinlibrary.org/events', city: 'Turin', state: 'NY', zipCode: '13473', county: 'Lewis'},
  { name: 'Tuxedo Park Library', url: 'https://www.tuxedoparklibrary.org/', eventsUrl: 'https://www.tuxedoparklibrary.org/calendar/', city: 'Tuxedo Park', state: 'NY', zipCode: '10987', county: 'Orange'},
  { name: 'Unadilla Public Library', url: 'https://www.unadillalibrary.org', eventsUrl: 'https://www.unadillalibrary.org/events', city: 'Unadilla', state: 'NY', zipCode: '13849', county: 'Otsego'},
  { name: 'Nassau Library System', url: 'https://uniondalelibrary.org/', eventsUrl: 'https://uniondalelibrary.org/', city: 'Uniondale', state: 'NY', zipCode: '11553', county: 'Nassau'},
  { name: 'Valley Cottage Free Library', url: 'https://www.valleycottagelibrary.org/', eventsUrl: 'https://www.valleycottagelibrary.org/', city: 'Valley Cottage', state: 'NY', zipCode: '10989', county: 'Rockland'},
  { name: 'Valley Falls Free Library', url: 'https://www.valleyfallslibrary.org', eventsUrl: 'https://www.valleyfallslibrary.org/events', city: 'Valley Falls', state: 'NY', zipCode: '12185', county: 'Rensselaer'},
  { name: 'Henry Waldinger Memorial Library', url: 'https://www.valleystreamlibrary.org', eventsUrl: 'https://www.valleystreamlibrary.org/events', city: 'Valley Stream', state: 'NY', zipCode: '11582', county: 'Nassau'},
  { name: 'Vernon Public Library', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'NY', zipCode: '13476', county: 'Oneida', urlCollision: 'vernonlibrary.org is TX, not NY' },
  { name: 'Voorheesville Public Library', url: 'https://www.voorheesvillelibrary.org', eventsUrl: 'https://www.voorheesvillelibrary.org/events', city: 'Voorheesville', state: 'NY', zipCode: '12186', county: 'Albany'},
  { name: 'Hepburn Library Of Waddington', url: 'https://www.waddingtonlibrary.org', eventsUrl: 'https://www.waddingtonlibrary.org/events', city: 'Waddington', state: 'NY', zipCode: '13694', county: 'St. Lawrence'},
  { name: 'Walworth-Seely Public Library', url: 'https://www.walworthlibrary.org/', eventsUrl: 'https://www.walworthlibrary.org/', city: 'Walworth', state: 'NY', zipCode: '14568', county: 'Wayne'},
  { name: 'Wantagh Public Library', url: 'https://wantaghlibrary.org/', eventsUrl: 'https://wantaghlibrary.org/', city: 'Wantagh', state: 'NY', zipCode: '11793', county: 'Nassau'},
  { name: 'Warsaw Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'NY', zipCode: '14569', county: 'Wyoming', urlCollision: 'warsawlibrary.org is IN, not NY' },
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'NY', zipCode: '12188', county: 'Saratoga', urlCollision: 'waterfordlibrary.org is WA, not NY' },
  { name: 'Waterloo Library And Historical Society', url: 'https://www.waterloolibrary.org', eventsUrl: 'https://www.waterloolibrary.org/events', city: 'Waterloo', state: 'NY', zipCode: '13165', county: 'Seneca'},
  { name: 'Watkins Glen Cen Sch Dis Free Pub Lib', url: 'https://www.watkinsglenlibrary.org', eventsUrl: 'https://www.watkinsglenlibrary.org/events', city: 'Watkins Glen', state: 'NY', zipCode: '14891', county: 'Schuyler'},
  // URL corrected 2026-08-11 (was waverlylibrary.com): 18 Elizabeth St Waverly NY 14892, phone 607-565-9341. waverlylibrary.com is Waverly Community Library in Waverly NEBRASKA
  { name: 'Waverly Free Library', url: 'https://waverlyfreelibrary.org', eventsUrl: 'https://waverlyfreelibrary.org/events/', city: 'Waverly', state: 'NY', zipCode: '14892', county: 'Tioga'},
  { name: 'Wayland Free Library', url: 'https://www.waylandlibrary.org', eventsUrl: 'https://www.waylandlibrary.org/events', city: 'Wayland', state: 'NY', zipCode: '14572', county: 'Steuben', urlCollision: 'waylandlibrary.org is MA, not NY' },
  { name: 'Webster Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'NY', zipCode: '14580', county: 'Monroe'},
  { name: 'Weedsport Free Library', url: 'https://www.weedsportlibrary.org/', eventsUrl: 'https://www.weedsportlibrary.org/calendar', city: 'Weedsport', state: 'NY', zipCode: '13166', county: 'Cayuga'},
  { name: 'David A Howe Public Library', url: 'https://www.wellsvillelibrary.org', eventsUrl: 'https://www.wellsvillelibrary.org/events', city: 'Wellsville', state: 'NY', zipCode: '14895', county: 'Montgomery'},
  { name: 'West Hurley Public Library', url: 'https://westhurleylibrary.org/', eventsUrl: 'https://westhurleylibrary.org/', city: 'West Hurley', state: 'NY', zipCode: '12491', county: 'Ulster'},
  { name: 'West Islip Public Library', url: 'https://westisliplibrary.org/', eventsUrl: 'https://westisliplibrary.org/', city: 'West Islip', state: 'NY', zipCode: '11795', county: 'Suffolk'},
  { name: 'West Nyack Free Library', url: 'https://www.westnyacklibrary.org/', eventsUrl: 'https://www.westnyacklibrary.org/', city: 'West Nyack', state: 'NY', zipCode: '10994', county: 'Rockland'},
  { name: 'West Winfield Library', url: 'https://westwinfieldlibrary.org/', eventsUrl: 'https://westwinfieldlibrary.org/calendar/', city: 'West Winfield', state: 'NY', zipCode: '13491', county: 'Herkimer'},
  { name: 'Westbury Memorial Public Library', url: 'https://www.westburylibrary.org/', eventsUrl: 'https://www.westburylibrary.org/', city: 'Westbury', state: 'NY', zipCode: '11590', county: 'Nassau'},
  { name: 'Town Of Westerlo Public Library', url: 'https://www.westerlolibrary.org', eventsUrl: 'https://www.westerlolibrary.org/events', city: 'Westerlo', state: 'NY', zipCode: '12193', county: 'Albany'},
  { name: 'Patterson Library', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'NY', zipCode: '14787', county: 'Chautauqua', urlCollision: 'westfieldlibrary.org is WI, not NY' },
  { name: 'Westport Library Association', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'NY', zipCode: '12993', county: 'Essex', urlCollision: 'westportlibrary.org is CT, not NY' },
  { name: 'Dunham Public Library', url: 'https://whitesborolibrary.org/', eventsUrl: 'https://whitesborolibrary.org/', city: 'Whitesboro', state: 'NY', zipCode: '13492', county: 'Oneida'},
  { name: 'Whitesville Public Library', url: 'https://www.whitesvillelibrary.org', eventsUrl: 'https://www.whitesvillelibrary.org/events', city: 'Whitesville', state: 'NY', zipCode: '14897', county: 'Allegany'},
  { name: 'Williamson Free Public Library', url: 'https://www.williamsonlibrary.org/', eventsUrl: 'https://www.williamsonlibrary.org/', city: 'Williamson', state: 'NY', zipCode: '14589', county: 'Wayne'},
  { name: 'Williamstown Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'NY', zipCode: '13493', county: 'Oswego'},
  { name: 'Amherst Public Library Clearfield Branch', url: 'https://www.williamsvillelibrary.org/', eventsUrl: 'https://www.williamsvillelibrary.org/', city: 'Williamsville', state: 'NY', zipCode: '14221', county: 'Erie'},
  { name: 'Williston Park Public Library', url: 'https://www.willistonparklibrary.org', eventsUrl: 'https://www.willistonparklibrary.org/events', city: 'Williston Park', state: 'NY', zipCode: '11596', county: 'Nassau'},
  // URL corrected 2026-08-11 (was wilmingtonlibrary.org): 5751 Route 86 Wilmington NY 12997, phone 518-946-7701, Clinton-Essex-Franklin Library System member
  { name: 'Wilmington E.M. Cooper Memorial Public Library', url: 'https://wilmingtoncooperlibrary.org', eventsUrl: 'https://wilmingtoncooperlibrary.org', city: 'Wilmington', state: 'NY', zipCode: '12997', county: 'Essex'},
  { name: 'Wilson Free Library', url: 'https://www.wilsonlibrary.org', eventsUrl: 'https://www.wilsonlibrary.org/events', city: 'Wilson', state: 'NY', zipCode: '14172', county: 'Niagara'},
  { name: 'Windham Public Library', url: 'https://windhamlibrary.org/', eventsUrl: 'https://windhamlibrary.org/', city: 'Windham', state: 'NY', zipCode: '12496', county: 'Greene'},
  // URL corrected 2026-08-11 (was wolcottlibrary.org): 5890 New Hartford St Wolcott NY 14590, ph 315-594-2265, OWWL system Wayne County; site brands itself Wolcott Public Library
  { name: 'Wolcott Civic Free Library', url: 'https://wolcott.owwl.org/', eventsUrl: 'https://wolcott.owwl.org/library-events-2/', city: 'Wolcott', state: 'NY', zipCode: '14590', county: 'Wayne'},
  { name: 'Woodgate Free Library', url: 'https://woodgatelibrary.org/', eventsUrl: 'https://woodgatelibrary.org/calendar/', city: 'Woodgate', state: 'NY', zipCode: '13494', county: 'Oneida'},
  { name: 'Queens Borough Public Library - Woodside', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Woodside', state: 'NY', zipCode: '11377', county: 'Queens', urlCollision: 'smcl.org is CA, not NY' },
  { name: 'Worcester Free Library', url: 'https://www.worcesterlibrary.org', eventsUrl: 'https://www.worcesterlibrary.org/events', city: 'Worcester', state: 'NY', zipCode: '12197', county: 'Otsego', urlCollision: 'worcesterlibrary.org is MD, not NY' },
  { name: 'Wyandanch Public Library', url: 'https://www.wyandanchlibrary.org', eventsUrl: 'https://www.wyandanchlibrary.org/events', city: 'Wyandanch', state: 'NY', zipCode: '11798', county: 'Suffolk'},

];

const SCRAPER_NAME = 'wordpress-NY';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
      // An entry carrying urlCollision points at a DIFFERENT institution than its own
      // name and state claim — the guessed {city}library.org host actually belongs to
      // another state's library. Scraping it imported that library's events under this
      // state. See scripts/disable-collided-urls.js for the per-host evidence.
      // The 📍 header above and the "Found 0 events" line below are BOTH required: the
      // library-site audit pairs them, and dropping the pair would delete this library
      // from the audit instead of showing it as a known, explained gap.
      if (library.urlCollision) {
        console.log(`   ⏭️  skipped — urlCollision: ${library.urlCollision}`);
        console.log(`   Found 0 events`);
        continue;
      }
    try {
      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'NY', city: library.city, zipCode: library.zipCode }}));
        continue;
      }
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // REST API can be reachable-but-403 even on a genuinely TEC-powered
      // site — tryFetchTecEvents() already returned null above in that case.
      // Try TEC's own DOM structure before falling back to fully generic
      // selectors, which can't tell a real event card from the calendar's
      // own day-heading badge on TEC's list-view markup (found 2026-08-08 on
      // WordPress-GA/New Georgia Public Library — see tec-rest-helper.js).
      const domTecEvents = await tryDomScrapeTecEvents(page, library.name);
      if (domTecEvents && domTecEvents.length > 0) {
        domTecEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'wordpress-tec-dom',
            state: 'NY',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

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
            state: event.state || library.state || 'NY',
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
        // Calendar-grid sites (e.g. Drupal "Library Calendar" / lc-event
        // widgets, seen live on ypl.org/events) render each day as a
        // day-cell container carrying the real date, while the individual
        // event cards inside only show a clock time with no day/month at
        // all. Walk up from the event card looking for that ancestor date
        // before giving up. Confirmed live 2026-07-20: ypl.org day cells
        // have <div class="calendar__day" data-date="2026-06-28"><h2
        // class="calendar__day-header">Sunday, June 28, 2026</h2>...
        function findAncestorDate(el) {
          let node = el;
          for (let i = 0; i < 8 && node; i++) {
            if (node.getAttribute) {
              const attr = node.getAttribute('data-date') || node.getAttribute('data-current_date') || node.getAttribute('data-day');
              if (attr && /\d{4}-\d{1,2}-\d{1,2}/.test(attr)) return attr;
              const header = node.querySelector && node.querySelector('.calendar__day-header, [class*="day-header"]');
              if (header && header.textContent.trim()) return header.textContent.trim();
            }
            node = node.parentElement;
          }
          return null;
        }
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            let dateText = date ? date.textContent.trim() : '';
            // If the card's own date text has no day/month at all (bare
            // clock time like "8:30am-12:30pm"), fall back to the
            // ancestor day-cell date and combine it with the time text.
            if (!/[A-Za-z]{3,9}\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/.test(dateText)) {
              const ancestorDate = findAncestorDate(card);
              if (ancestorDate) dateText = dateText ? `${ancestorDate} ${dateText}` : ancestorDate;
            }
            events.push({ title: title.textContent.trim(), date: dateText, ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'NY', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NY',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNYCloudFunction() {
  console.log('☁️ Running WordPress NY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-NY', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNYCloudFunction };
