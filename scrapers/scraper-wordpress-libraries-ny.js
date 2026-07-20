const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * New York Public Libraries Scraper - Coverage: All New York public libraries
 */
const LIBRARIES = [
  // NYC Major Systems
  { name: 'New York Public Library', url: 'https://www.nypl.org', eventsUrl: 'https://www.nypl.org/events/calendar', city: 'New York', state: 'NY', zipCode: '10018', county: 'New York County'},
  { name: 'Brooklyn Public Library', url: 'https://www.bklynlibrary.org', eventsUrl: 'https://www.bklynlibrary.org/calendar', city: 'Brooklyn', state: 'NY', zipCode: '11238', county: 'Kings'},
  { name: 'Queens Public Library', url: 'https://www.queenslibrary.org', eventsUrl: 'https://www.queenslibrary.org/calendar', city: 'Jamaica', state: 'NY', zipCode: '11432', county: 'Jamaica County'},
  // Long Island
  { name: 'Great Neck Library', url: 'https://www.greatnecklibrary.org', eventsUrl: 'https://greatnecklibrary.libcal.com/calendar', city: 'Great Neck', state: 'NY', zipCode: '11023', county: 'Great Neck County'},
  { name: 'Hicksville Public Library', url: 'https://www.hicksvillelibrary.org', eventsUrl: 'https://hicksvillelibrary.libcal.com/calendar', city: 'Hicksville', state: 'NY', zipCode: '11801', county: 'Hicksville County'},
  { name: 'Freeport Memorial Library', url: 'https://www.freeportlibrary.info', eventsUrl: 'https://freeportlibrary.libcal.com/calendar', city: 'Freeport', state: 'NY', zipCode: '11520', county: 'Freeport County'},
  { name: 'Rockville Centre Public Library', url: 'https://www.rvcpl.org', eventsUrl: 'https://rvcpl.libcal.com/calendar', city: 'Rockville Centre', state: 'NY', zipCode: '11570', county: 'Rockville Centre County'},
  { name: 'Oceanside Library', url: 'https://www.oceansidelibrary.com', eventsUrl: 'https://oceansidelibrary.libcal.com/calendar', city: 'Oceanside', state: 'NY', zipCode: '11572', county: 'Oceanside County'},
  { name: 'North Merrick Public Library', url: 'https://www.nmerricklibrary.org', eventsUrl: 'https://nmerricklibrary.libcal.com/calendar', city: 'North Merrick', state: 'NY', zipCode: '11566', county: 'North Merrick County'},
  { name: 'Baldwin Public Library', url: 'https://www.baldwinpl.org', eventsUrl: 'https://baldwinlib.libcal.com/calendar', city: 'Baldwin', state: 'NY', zipCode: '11510', county: 'Baldwin County'},
  { name: 'Garden City Public Library', url: 'https://www.gardencitypl.org', eventsUrl: 'https://gardencitypl.libcal.com/calendar', city: 'Garden City', state: 'NY', zipCode: '11530', county: 'Garden City County'},
  // Upstate - Major Cities
  { name: 'Buffalo & Erie County Public Library', url: 'https://www.buffalolib.org', eventsUrl: 'https://events.erielibrary.org/calendar', city: 'Buffalo', state: 'NY', zipCode: '14203', county: 'Buffalo County'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterpubliclibrary.org', eventsUrl: 'https://rochesterpubliclibrary.librarymarket.com/events', city: 'Rochester', state: 'NY', zipCode: '14604', county: 'Rochester County'},
  { name: 'Syracuse Public Library', url: 'https://www.onlib.org', eventsUrl: 'https://onlib-central.libcal.com/calendar', city: 'Syracuse', state: 'NY', zipCode: '13202', county: 'Syracuse County'},
  { name: 'Albany Public Library', url: 'https://www.albanypubliclibrary.org', eventsUrl: 'https://albany.librarycalendar.com/events', city: 'Albany', state: 'NY', zipCode: '12206', county: 'Albany County'},
  // Regional Systems
  { name: 'Westchester Library System', url: 'https://www.westchesterlibraries.org', eventsUrl: 'https://www.westchesterlibraries.org/events', city: 'Elmsford', state: 'NY', zipCode: '10523', county: 'Elmsford County'},
  { name: 'Yonkers Public Library', url: 'https://www.ypl.org', eventsUrl: 'https://www.ypl.org/events', city: 'Yonkers', state: 'NY', zipCode: '10701', county: 'Yonkers County'},
  { name: 'White Plains Public Library', url: 'https://whiteplainslibrary.org', eventsUrl: 'https://whiteplainslibrary.org/events', city: 'White Plains', state: 'NY', zipCode: '10601', county: 'White Plains County'},
  { name: 'Schenectady County Public Library', url: 'https://www.scpl.org', eventsUrl: 'https://www.scpl.org/events', city: 'Schenectady', state: 'NY', zipCode: '12305', county: 'Schenectady County'},
  { name: 'Utica Public Library', url: 'https://www.uticapubliclibrary.org', eventsUrl: 'https://www.uticapubliclibrary.org/events', city: 'Utica', state: 'NY', zipCode: '13501', county: 'Utica County'},
  { name: 'Poughkeepsie Public Library District', url: 'https://www.poklib.org', eventsUrl: 'https://www.poklib.org/events', city: 'Poughkeepsie', state: 'NY', zipCode: '12601', county: 'Poughkeepsie County'},
  { name: 'New Rochelle Public Library', url: 'https://nrpl.org/', eventsUrl: 'https://nrpl.org/', city: 'New Rochelle', state: 'NY', zipCode: '10801', county: 'New Rochelle County'},
  { name: 'Mount Vernon Public Library', url: 'https://www.mountvernonpubliclibrary.org', eventsUrl: 'https://www.mountvernonpubliclibrary.org/events', city: 'Mount Vernon', state: 'NY', zipCode: '10550', county: 'Mount Vernon County'},
  { name: 'Ithaca Tompkins County Public Library', url: 'https://www.tcpl.org', eventsUrl: 'https://www.tcpl.org/events', city: 'Ithaca', state: 'NY', zipCode: '14850', county: 'Ithaca County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Adams Free Library', url: 'https://www.adamslibrary.org', eventsUrl: 'https://www.adamslibrary.org/events', city: 'Adams', state: 'NY', zipCode: '13605', county: 'Adams County'},
  { name: 'Addison Public Library', url: 'https://www.addisonlibrary.org', eventsUrl: 'https://www.addisonlibrary.org/events', city: 'Addison', state: 'NY', zipCode: '14801', county: 'Addison County'},
  { name: 'Newstead Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'NY', zipCode: '14001', county: 'Akron County'},
  { name: 'Shelter Rock Public Library', url: 'https://www.albertsonlibrary.org', eventsUrl: 'https://www.albertsonlibrary.org/events', city: 'Albertson', state: 'NY', zipCode: '11507', county: 'Albertson County'},
  { name: 'Swan Library', url: 'https://www.albionlibrary.org/', eventsUrl: 'https://www.albionlibrary.org/', city: 'Albion', state: 'NY', zipCode: '14411', county: 'Albion County'},
  { name: 'Alden Ewell Free Library', url: 'https://www.aldenlibrary.org/', eventsUrl: 'https://www.aldenlibrary.org/', city: 'Alden', state: 'NY', zipCode: '14004', county: 'Alden County'},
  { name: 'Alfred Box Of Books Library', url: 'https://www.alfredlibrary.org', eventsUrl: 'https://www.alfredlibrary.org/events', city: 'Alfred', state: 'NY', zipCode: '14802', county: 'Alfred County'},
  { name: 'Allegany Public Library', url: 'https://alleganylibrary.org/', eventsUrl: 'https://alleganylibrary.org/', city: 'Allegany', state: 'NY', zipCode: '14706', county: 'Allegany County'},
  { name: 'Almond Twentieth Century Club Library', url: 'https://almondlibrary.org/', eventsUrl: 'https://almondlibrary.org/calendar/', city: 'Almond', state: 'NY', zipCode: '14804', county: 'Almond County'},
  { name: 'Amagansett Free Library', url: 'https://amagansettlibrary.org/', eventsUrl: 'https://amagansettlibrary.org/calendar/', city: 'Amagansett', state: 'NY', zipCode: '11930', county: 'Amagansett County'},
  { name: 'Amenia Free Library', url: 'https://amenialibrary.org/', eventsUrl: 'https://amenialibrary.org/', city: 'Amenia', state: 'NY', zipCode: '12501', county: 'Amenia County'},
  { name: 'Audubon Branch', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'NY', zipCode: '14228', county: 'Amherst County'},
  { name: 'Andes Public Library', url: 'https://www.andeslibrary.org', eventsUrl: 'https://www.andeslibrary.org/events', city: 'Andes', state: 'NY', zipCode: '13731', county: 'Andes County'},
  { name: 'Andover Free Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'NY', zipCode: '14806', county: 'Andover County'},
  { name: 'Apalachin Library Association', url: 'https://www.apalachinlibrary.org', eventsUrl: 'https://www.apalachinlibrary.org/events', city: 'Apalachin', state: 'NY', zipCode: '13732', county: 'Apalachin County'},
  { name: 'Arcade Free Library', url: 'https://www.arcadelibrary.org', eventsUrl: 'https://www.arcadelibrary.org/events', city: 'Arcade', state: 'NY', zipCode: '14009', county: 'Arcade County'},
  { name: 'Ardsley Public Library', url: 'https://www.ardsleylibrary.org', eventsUrl: 'https://www.ardsleylibrary.org/events', city: 'Ardsley', state: 'NY', zipCode: '10502', county: 'Ardsley County'},
  { name: 'Queens Borough Public Library - Astoria', url: 'https://www.astoria.gov/', eventsUrl: 'https://www.astoria.gov/calendar?deptid=6', city: 'Astoria', state: 'NY', zipCode: '11102', county: 'Astoria County'},
  { name: 'D.R. Evarts Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'NY', zipCode: '12015', county: 'Athens County'},
  { name: 'Seymour Public Library District', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'NY', zipCode: '13021', county: 'Auburn County'},
  { name: 'Aurora Free Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'NY', zipCode: '13026', county: 'Aurora County'},
  { name: 'Avon Free Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'NY', zipCode: '14414', county: 'Avon County'},
  { name: 'Babylon School District Public Library', url: 'https://babylonlibrary.org/', eventsUrl: 'https://babylonlibrary.org/', city: 'Babylon', state: 'NY', zipCode: '11702', county: 'Babylon County'},
  { name: 'Bainbridge Free Library', url: 'https://www.bainbridgelibrary.org', eventsUrl: 'https://www.bainbridgelibrary.org/events', city: 'Bainbridge', state: 'NY', zipCode: '13733', county: 'Bainbridge County'},
  { name: 'Barker Free Library', url: 'https://www.barkerlibrary.org', eventsUrl: 'https://www.barkerlibrary.org/events', city: 'Barker', state: 'NY', zipCode: '14012', county: 'Barker County'},
  { name: 'Barneveld Free Library Association', url: 'https://www.barneveldlibrary.org/', eventsUrl: 'https://www.barneveldlibrary.org/', city: 'Barneveld', state: 'NY', zipCode: '13304', county: 'Barneveld County'},
  { name: 'Richmond Memorial Library', url: 'https://www.batavialibrary.org', eventsUrl: 'https://www.batavialibrary.org/events', city: 'Batavia', state: 'NY', zipCode: '14020', county: 'Batavia County'},
  { name: 'Dormann Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'NY', zipCode: '14810', county: 'Bath County'},
  { name: 'Howland Public Library', url: 'https://beaconlibrary.org/', eventsUrl: 'https://beaconlibrary.org/calendar', city: 'Beacon', state: 'NY', zipCode: '12508', county: 'Beacon County'},
  { name: 'Beaver Falls Library', url: 'https://www.beaverfallslibrary.org', eventsUrl: 'https://www.beaverfallslibrary.org/events', city: 'Beaver Falls', state: 'NY', zipCode: '13305', county: 'Beaver Falls County'},
  { name: 'Bedford Free Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'NY', zipCode: '10506', county: 'Bedford County'},
  { name: 'Bedford Hills Free Library', url: 'https://www.bedfordhillsfreelibrary.org/', eventsUrl: 'https://www.bedfordhillsfreelibrary.org/events/upcoming', city: 'Bedford Hills', state: 'NY', zipCode: '10507', county: 'Bedford Hills County'},
  { name: 'Belfast Public Library', url: 'https://www.belfastlibrary.org', eventsUrl: 'https://www.belfastlibrary.org/events', city: 'Belfast', state: 'NY', zipCode: '14711', county: 'Belfast County'},
  { name: 'Belleville Free Library', url: 'https://bellevillelibrary.org/', eventsUrl: 'https://bellevillelibrary.org/', city: 'Belleville', state: 'NY', zipCode: '13611', county: 'Belleville County'},
  { name: 'Bellmore Memorial Library', url: 'https://www.bellmorelibrary.org', eventsUrl: 'https://www.bellmorelibrary.org/events', city: 'Bellmore', state: 'NY', zipCode: '11710', county: 'Bellmore County'},
  { name: 'Free Library Of The Belmont Literary And Historical Society', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'NY', zipCode: '14813', county: 'Belmont County'},
  { name: 'Bemus Point Public Library', url: 'https://www.bemuspointlibrary.org', eventsUrl: 'https://www.bemuspointlibrary.org/events', city: 'Bemus Point', state: 'NY', zipCode: '14712', county: 'Bemus Point County'},
  { name: 'Berlin Free Town Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'NY', zipCode: '12022', county: 'Berlin County'},
  { name: 'Eagle Free Library', url: 'https://www.blisslibrary.org/', eventsUrl: 'https://www.blisslibrary.org/', city: 'Bliss', state: 'NY', zipCode: '14024', county: 'Bliss County'},
  { name: 'Erwin Library Institute', url: 'https://www.boonvillelib.org/', eventsUrl: 'https://www.boonvillelib.org/', city: 'Boonville', state: 'NY', zipCode: '13309', county: 'Boonville County'},
  { name: 'Boston Free Library', url: 'https://www.bostonlibrary.org', eventsUrl: 'https://www.bostonlibrary.org/events', city: 'Boston', state: 'NY', zipCode: '14025', county: 'Boston County'},
  { name: 'Modeste Bedient Memorial Library', url: 'https://www.branchportlibrary.org', eventsUrl: 'https://www.branchportlibrary.org/events', city: 'Branchport', state: 'NY', zipCode: '14418', county: 'Branchport County'},
  { name: 'Brentwood Public Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'NY', zipCode: '11717', county: 'Brentwood County'},
  { name: 'Brewster Public Library', url: 'https://brewsterlibrary.libcal.com/', eventsUrl: 'https://brewsterlibrary.libcal.com/', city: 'Brewster', state: 'NY', zipCode: '10509', county: 'Brewster County'},
  { name: 'Briarcliff Manor Public Library', url: 'https://briarcliffmanorlibrary.org/', eventsUrl: 'https://briarcliffmanorlibrary.org/calendar/', city: 'Briarcliff Manor', state: 'NY', zipCode: '10510', county: 'Briarcliff Manor County'},
  { name: 'Sullivan Free Library Of Bridgeport', url: 'https://www.bridgeportlibrary.org/', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'NY', zipCode: '13030', county: 'Bridgeport County'},
  { name: 'Bronxville Public Library', url: 'https://bronxvillelibrary.org/', eventsUrl: 'https://bronxvillelibrary.org/', city: 'Bronxville', state: 'NY', zipCode: '10708', county: 'Bronxville County'},
  { name: 'Brownville-Glen Park Library', url: 'https://www.brownvillelibrary.org', eventsUrl: 'https://www.brownvillelibrary.org/events', city: 'Brownville', state: 'NY', zipCode: '13615', county: 'Brownville County'},
  { name: 'Cairo Public Library', url: 'https://cairolibrary.org/', eventsUrl: 'https://cairolibrary.org/calendar/', city: 'Cairo', state: 'NY', zipCode: '12413', county: 'Cairo County'},
  { name: 'Caledonia Library Association', url: 'https://www.caledonialibrary.org', eventsUrl: 'https://www.caledonialibrary.org/events', city: 'Caledonia', state: 'NY', zipCode: '14423', county: 'Caledonia County'},
  { name: 'Cambridge Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'NY', zipCode: '12816', county: 'Cambridge County'},
  { name: 'Camden Library Association', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'NY', zipCode: '13316', county: 'Camden County'},
  { name: 'Canajoharie Library And Art Gallery', url: 'https://www.canajoharielibrary.org/', eventsUrl: 'https://www.canajoharielibrary.org/', city: 'Canajoharie', state: 'NY', zipCode: '13317', county: 'Canajoharie County'},
  { name: 'Canastota Public Library', url: 'https://www.canastotalibrary.org/', eventsUrl: 'https://www.canastotalibrary.org/', city: 'Canastota', state: 'NY', zipCode: '13032', county: 'Canastota County'},
  { name: 'Canton Free Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'NY', zipCode: '13617', county: 'Canton County'},
  { name: 'Cape Vincent Community Library', url: 'https://www.capevincentlibrary.org', eventsUrl: 'https://www.capevincentlibrary.org/events', city: 'Cape Vincent', state: 'NY', zipCode: '13618', county: 'Cape Vincent County'},
  { name: 'Reed Memorial Library', url: 'https://carmellibrary.org/', eventsUrl: 'https://carmellibrary.org/calendar/', city: 'Carmel', state: 'NY', zipCode: '10512', county: 'Carmel County'},
  { name: 'Carthage Free Library', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'NY', zipCode: '13619', county: 'Carthage County'},
  { name: 'Cattaraugus Free Library', url: 'https://www.cattarauguslibrary.org', eventsUrl: 'https://www.cattarauguslibrary.org/events', city: 'Cattaraugus', state: 'NY', zipCode: '14719', county: 'Cattaraugus County'},
  { name: 'Cazenovia Public Library Society', url: 'https://cazenoviapubliclibrary.org/', eventsUrl: 'https://cazenoviapubliclibrary.org/', city: 'Cazenovia', state: 'NY', zipCode: '13035', county: 'Cazenovia County'},
  { name: 'Center Moriches Free Public Library', url: 'https://www.centermoricheslibrary.org', eventsUrl: 'https://www.centermoricheslibrary.org/events', city: 'Center Moriches', state: 'NY', zipCode: '11934', county: 'Center Moriches County'},
  { name: 'Central Islip Public Library', url: 'https://www.centralisliplibrary.org', eventsUrl: 'https://www.centralisliplibrary.org/events', city: 'Central Islip', state: 'NY', zipCode: '11722', county: 'Central Islip County'},
  { name: 'Central Square Library', url: 'https://www.centralsquarelibrary.org', eventsUrl: 'https://www.centralsquarelibrary.org/events', city: 'Central Square', state: 'NY', zipCode: '13036', county: 'Central Square County'},
  { name: 'Chappaqua Library', url: 'https://www.chappaqualibrary.org', eventsUrl: 'https://www.chappaqualibrary.org/events', city: 'Chappaqua', state: 'NY', zipCode: '10514', county: 'Chappaqua County'},
  { name: 'Chatham Public Library', url: 'https://chathamlibrary.librarycalendar.com/', eventsUrl: 'https://chathamlibrary.librarycalendar.com/events/month/', city: 'Chatham', state: 'NY', zipCode: '12037', county: 'Chatham County'},
  { name: 'Cherry Valley Memorial Library', url: 'https://cherryvalleylibrary.org/', eventsUrl: 'https://cherryvalleylibrary.org/', city: 'Cherry Valley', state: 'NY', zipCode: '13320', county: 'Cherry Valley County'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'NY', zipCode: '10918', county: 'Chester County'},
  { name: 'Claverack Library', url: 'https://claveracklibrary.org/', eventsUrl: 'https://claveracklibrary.org/calendar/', city: 'Claverack', state: 'NY', zipCode: '12513', county: 'Claverack County'},
  { name: 'Hawn Memorial Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'NY', zipCode: '13624', county: 'Clayton County'},
  { name: 'Kirkland Town Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'NY', zipCode: '13323', county: 'Clinton County'},
  { name: 'Clyde-Savannah Public Library', url: 'https://www.clydelibrary.org/', eventsUrl: 'https://www.clydelibrary.org/', city: 'Clyde', state: 'NY', zipCode: '14433', county: 'Clyde County'},
  { name: 'Clymer-French Creek Free Library', url: 'https://www.clymerlibrary.org/', eventsUrl: 'https://www.clymerlibrary.org/', city: 'Clymer', state: 'NY', zipCode: '14724', county: 'Clymer County'},
  { name: 'Cohocton Public Library', url: 'https://cohoctonlibrary.org/', eventsUrl: 'https://cohoctonlibrary.org/calendar/', city: 'Cohocton', state: 'NY', zipCode: '14826', county: 'Cohocton County'},
  { name: 'Cohoes Public Library', url: 'https://www.cohoeslibrary.org', eventsUrl: 'https://www.cohoeslibrary.org/events', city: 'Cohoes', state: 'NY', zipCode: '12047', county: 'Cohoes County'},
  { name: 'Village Library Of Cooperstown', url: 'https://www.cooperstownlibrary.org', eventsUrl: 'https://www.cooperstownlibrary.org/events', city: 'Cooperstown', state: 'NY', zipCode: '13326', county: 'Cooperstown County'},
  { name: 'Copiague Memorial Public Library', url: 'https://www.copiaguelibrary.org', eventsUrl: 'https://www.copiaguelibrary.org/events', city: 'Copiague', state: 'NY', zipCode: '11726', county: 'Copiague County'},
  { name: 'Corfu Free Library', url: 'https://www.corfulibrary.org/', eventsUrl: 'https://www.corfulibrary.org/', city: 'Corfu', state: 'NY', zipCode: '14036', county: 'Corfu County'},
  { name: 'Cornwall Public Library', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'NY', zipCode: '12518', county: 'Cornwall County'},
  { name: 'Hammond Library Of Crown Point', url: 'https://www.crownpointlibrary.org', eventsUrl: 'https://www.crownpointlibrary.org/events', city: 'Crown Point', state: 'NY', zipCode: '12928', county: 'Crown Point County'},
  { name: 'Cuba Circulating Library Association', url: 'https://www.cubalibrary.org', eventsUrl: 'https://www.cubalibrary.org/events', city: 'Cuba', state: 'NY', zipCode: '14727', county: 'Cuba County'},
  { name: 'Cutchogue New Suffolk Free Library', url: 'https://cutchoguelibrary.org/', eventsUrl: 'https://cutchoguelibrary.org/', city: 'Cutchogue', state: 'NY', zipCode: '11935', county: 'Cutchogue County'},
  { name: 'Dansville Public Library', url: 'https://dansvillelibrary.org/', eventsUrl: 'https://dansvillelibrary.org/calendar/', city: 'Dansville', state: 'NY', zipCode: '14437', county: 'Dansville County'},
  { name: 'Deer Park Public Library', url: 'https://www.deerparklibrary.org', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'NY', zipCode: '11729', county: 'Deer Park County'},
  { name: 'Delevan-Yorkshire Public Library', url: 'https://www.delevanlibrary.org', eventsUrl: 'https://www.delevanlibrary.org/events', city: 'Delevan', state: 'NY', zipCode: '14042', county: 'Delevan County'},
  { name: 'Deruyter Free Library', url: 'https://deruyterlibrary.org/', eventsUrl: 'https://deruyterlibrary.org/', city: 'Deruyter', state: 'NY', zipCode: '13052', county: 'Deruyter County'},
  { name: 'Dewitt Community Library Assoc., Inc', url: 'https://www.dewittlibrary.org', eventsUrl: 'https://www.dewittlibrary.org/events', city: 'Dewitt', state: 'NY', zipCode: '13214', county: 'Dewitt County'},
  { name: 'Dobbs Ferry Public Library', url: 'https://www.dobbsferrylibrary.org', eventsUrl: 'https://www.dobbsferrylibrary.org/events', city: 'Dobbs Ferry', state: 'NY', zipCode: '10522', county: 'Dobbs Ferry County'},
  { name: 'Dolgeville-Manheim Public Library', url: 'https://dolgevillelibrary.org/', eventsUrl: 'https://dolgevillelibrary.org/', city: 'Dolgeville', state: 'NY', zipCode: '13329', county: 'Dolgeville County'},
  { name: 'Dunkirk Free Library', url: 'https://dunkirklibrary.org/', eventsUrl: 'https://dunkirklibrary.org/', city: 'Dunkirk', state: 'NY', zipCode: '14048', county: 'Dunkirk County'},
  { name: 'Earlville Free Library', url: 'https://www.earlvillelibrary.org/', eventsUrl: 'https://www.earlvillelibrary.org/', city: 'Earlville', state: 'NY', zipCode: '13332', county: 'Earlville County'},
  { name: 'East Greenbush Community Library', url: 'https://eglibrary.org/', eventsUrl: 'https://eglibrary.org/', city: 'East Greenbush', state: 'NY', zipCode: '12061', county: 'East Greenbush County'},
  { name: 'East Hampton Library', url: 'https://www.easthamptonlibrary.org', eventsUrl: 'https://www.easthamptonlibrary.org/events', city: 'East Hampton', state: 'NY', zipCode: '11937', county: 'East Hampton County'},
  { name: 'East Islip Public Library', url: 'https://www.eastisliplibrary.org', eventsUrl: 'https://www.eastisliplibrary.org/events', city: 'East Islip', state: 'NY', zipCode: '11730', county: 'East Islip County'},
  { name: 'East Rochester Public Library', url: 'https://www.eastrochesterlibrary.org', eventsUrl: 'https://www.eastrochesterlibrary.org/events', city: 'East Rochester', state: 'NY', zipCode: '14445', county: 'East Rochester County'},
  { name: 'East Rockaway Public Library', url: 'https://www.eastrockawaylibrary.org', eventsUrl: 'https://www.eastrockawaylibrary.org/events', city: 'East Rockaway', state: 'NY', zipCode: '11518', county: 'East Rockaway County'},
  { name: 'Eastchester Public Library', url: 'https://www.eastchesterlibrary.org', eventsUrl: 'https://www.eastchesterlibrary.org/events', city: 'Eastchester', state: 'NY', zipCode: '10709', county: 'Eastchester County'},
  { name: 'Elbridge Free Library', url: 'https://www.elbridgelibrary.org', eventsUrl: 'https://www.elbridgelibrary.org/events', city: 'Elbridge', state: 'NY', zipCode: '13060', county: 'Elbridge County'},
  { name: 'Ellicottville Memorial Library', url: 'https://www.ellicottvillelibrary.org', eventsUrl: 'https://www.ellicottvillelibrary.org/events', city: 'Ellicottville', state: 'NY', zipCode: '14731', county: 'Ellicottville County'},
  { name: 'Farman Free Library Association Of Ellington', url: 'https://www.ellingtonlibrary.org', eventsUrl: 'https://www.ellingtonlibrary.org/events', city: 'Ellington', state: 'NY', zipCode: '14732', county: 'Ellington County'},
  { name: 'Ellisburg Free Library', url: 'https://www.ellisburglibrary.org', eventsUrl: 'https://www.ellisburglibrary.org/events', city: 'Ellisburg', state: 'NY', zipCode: '13636', county: 'Ellisburg County'},
  { name: 'Queens Borough Public Library - Elmhurst', url: 'https://www.elmhurstlibrary.org', eventsUrl: 'https://www.elmhurstlibrary.org/events', city: 'Elmhurst', state: 'NY', zipCode: '11373', county: 'Elmhurst County'},
  { name: 'Elmont Public Library', url: 'https://www.elmontlibrary.org', eventsUrl: 'https://www.elmontlibrary.org/events', city: 'Elmont', state: 'NY', zipCode: '11003', county: 'Elmont County'},
  { name: 'Elwood Public Library', url: 'https://www.elwoodlibrary.org', eventsUrl: 'https://www.elwoodlibrary.org/events', city: 'Elwood', state: 'NY', zipCode: '11731', county: 'Elwood County'},
  { name: 'Belden Noble Memorial Library Of Essex', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'NY', zipCode: '12936', county: 'Essex County'},
  { name: 'Fair Haven Public Library', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fair Haven', state: 'NY', zipCode: '00000', county: 'Fair Haven County'},
  { name: 'Fairport Public Library', url: 'https://www.fairportlibrary.org/', eventsUrl: 'https://www.fairportlibrary.org/', city: 'Fairport', state: 'NY', zipCode: '14450', county: 'Fairport County'},
  { name: 'Falconer Public Library', url: 'https://www.falconerlibrary.org', eventsUrl: 'https://www.falconerlibrary.org/events', city: 'Falconer', state: 'NY', zipCode: '14733', county: 'Falconer County'},
  { name: 'Farmingdale Public Library', url: 'https://www.farmingdalelibrary.org', eventsUrl: 'https://www.farmingdalelibrary.org/events', city: 'Farmingdale', state: 'NY', zipCode: '11735', county: 'Farmingdale County'},
  { name: 'Fayetteville Free Library', url: 'https://www.fayettevillelibrary.org', eventsUrl: 'https://www.fayettevillelibrary.org/events', city: 'Fayetteville', state: 'NY', zipCode: '13066', county: 'Fayetteville County'},
  { name: 'Wide Awake Club Library', url: 'https://fillmoreutlibrary.gov/', eventsUrl: 'https://fillmoreutlibrary.gov/upcoming-events/', city: 'Fillmore', state: 'NY', zipCode: '14735', county: 'Fillmore County'},
  { name: 'Blodgett Memorial Library District Of Fishkill', url: 'https://www.fishkilllibrary.org', eventsUrl: 'https://www.fishkilllibrary.org/events', city: 'Fishkill', state: 'NY', zipCode: '12524', county: 'Fishkill County'},
  { name: 'Floral Park Public Library', url: 'https://floralparklibrary.org/', eventsUrl: 'https://floralparklibrary.org/', city: 'Floral Park', state: 'NY', zipCode: '11001', county: 'Floral Park County'},
  { name: 'Frankfort Free Library', url: 'https://www.frankfortlibrary.org/', eventsUrl: 'https://www.frankfortlibrary.org/', city: 'Frankfort', state: 'NY', zipCode: '13340', county: 'Frankfort County'},
  { name: 'Franklin Free Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NY', zipCode: '13775', county: 'Franklin County'},
  { name: 'Blount Library', url: 'https://franklinvillelibrary.org/', eventsUrl: 'https://franklinvillelibrary.org/', city: 'Franklinville', state: 'NY', zipCode: '14737', county: 'Franklinville County'},
  { name: 'Fulton Public Library', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'NY', zipCode: '13069', county: 'Fulton County'},
  { name: 'Galway Public Library', url: 'https://www.galwaylibrary.org', eventsUrl: 'https://www.galwaylibrary.org/events', city: 'Galway', state: 'NY', zipCode: '12074', county: 'Galway County'},
  { name: 'Gardiner Library', url: 'https://www.gardinerlibrary.org/', eventsUrl: 'https://www.gardinerlibrary.org/', city: 'Gardiner', state: 'NY', zipCode: '12525', county: 'Gardiner County'},
  { name: 'Wadsworth Library', url: 'https://www.geneseolibrary.org/', eventsUrl: 'https://www.geneseolibrary.org/', city: 'Geneseo', state: 'NY', zipCode: '14454', county: 'Geneseo County'},
  { name: 'Germantown Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'NY', zipCode: '12526', county: 'Germantown County'},
  { name: 'Glen Cove Public Library', url: 'https://www.glencovelibrary.org/', eventsUrl: 'https://www.glencovelibrary.org/', city: 'Glen Cove', state: 'NY', zipCode: '11542', county: 'Glen Cove County'},
  { name: 'Queens Borough Public Library - Glendale', url: 'https://www.glendalelibrary.org', eventsUrl: 'https://www.glendalelibrary.org/events', city: 'Glendale', state: 'NY', zipCode: '11385', county: 'Glendale County'},
  { name: 'Gloversville Public Library', url: 'https://gloversvillelibrary.org/', eventsUrl: 'https://gloversvillelibrary.org/events-calendar/', city: 'Gloversville', state: 'NY', zipCode: '12078', county: 'Gloversville County'},
  { name: 'Gorham Free Library', url: 'https://gorhamlibrary.org/', eventsUrl: 'https://gorhamlibrary.org/calendar/', city: 'Gorham', state: 'NY', zipCode: '14461', county: 'Gorham County'},
  { name: 'Goshen Public Library And Historical Society', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'NY', zipCode: '10924', county: 'Goshen County'},
  { name: 'Reading Room Association Of Gouverneur', url: 'https://www.gouverneurlibrary.org', eventsUrl: 'https://www.gouverneurlibrary.org/events', city: 'Gouverneur', state: 'NY', zipCode: '13642', county: 'Gouverneur County'},
  { name: 'Gowanda Free Library', url: 'https://gowandalibrary.org/', eventsUrl: 'https://gowandalibrary.org/', city: 'Gowanda', state: 'NY', zipCode: '14070', county: 'Gowanda County'},
  { name: 'Grafton Community Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'NY', zipCode: '12082', county: 'Grafton County'},
  { name: 'Pember Library Museum', url: 'https://www.granvillelibrary.org/', eventsUrl: 'https://www.granvillelibrary.org/', city: 'Granville', state: 'NY', zipCode: '12832', county: 'Granville County'},
  { name: 'Moore Memorial Library', url: 'https://www.greenelibrary.org', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'NY', zipCode: '13778', county: 'Greene County'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'NY', zipCode: '12083', county: 'Greenville County'},
  { name: 'Easton Library', url: 'https://www.greenwichlibrary.org/', eventsUrl: 'https://www.greenwichlibrary.org/', city: 'Greenwich', state: 'NY', zipCode: '12834', county: 'Greenwich County'},
  { name: 'Guilderland Public Library', url: 'https://www.guilderlandlibrary.org', eventsUrl: 'https://www.guilderlandlibrary.org/events', city: 'Guilderland', state: 'NY', zipCode: '12084', county: 'Guilderland County'},
  { name: 'Hamburg Library', url: 'https://www.hamburglibrary.org/', eventsUrl: 'https://www.hamburglibrary.org/', city: 'Hamburg', state: 'NY', zipCode: '14075', county: 'Hamburg County'},
  { name: 'Hamilton Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'NY', zipCode: '13346', county: 'Hamilton County'},
  { name: 'Hamlin Public Library', url: 'https://www.hamlinlibrary.org/', eventsUrl: 'https://www.hamlinlibrary.org/', city: 'Hamlin', state: 'NY', zipCode: '14464', county: 'Hamlin County'},
  { name: 'Hammond Free Library', url: 'https://www.hammondlibrary.org', eventsUrl: 'https://www.hammondlibrary.org/events', city: 'Hammond', state: 'NY', zipCode: '13646', county: 'Hammond County'},
  { name: 'Fred And Harriet Taylor Memorial Library', url: 'https://hammondsportlibrary.org/', eventsUrl: 'https://hammondsportlibrary.org/calendar/', city: 'Hammondsport', state: 'NY', zipCode: '14840', county: 'Hammondsport County'},
  { name: 'Hampton Bays Public Library', url: 'https://www.hamptonbayslibrary.org/', eventsUrl: 'https://www.hamptonbayslibrary.org/', city: 'Hampton Bays', state: 'NY', zipCode: '11946', county: 'Hampton Bays County'},
  { name: 'Louise Adelia Read Memorial Library', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'NY', zipCode: '13783', county: 'Hancock County'},
  { name: 'Hannibal Free Library', url: 'https://www.hanniballibrary.org', eventsUrl: 'https://www.hanniballibrary.org/events', city: 'Hannibal', state: 'NY', zipCode: '13074', county: 'Hannibal County'},
  { name: 'Harrison Public Library', url: 'https://www.harrisonpl.org/', eventsUrl: 'https://www.harrisonpl.org/', city: 'Harrison', state: 'NY', zipCode: '10528', county: 'Harrison County'},
  { name: 'Hauppauge Public Library', url: 'https://www.hauppaugelibrary.org', eventsUrl: 'https://www.hauppaugelibrary.org/events', city: 'Hauppauge', state: 'NY', zipCode: '11788', county: 'Hauppauge County'},
  { name: 'Haverstraw Kings Daughters Public Library - Village Branch', url: 'https://www.haverstrawlibrary.org', eventsUrl: 'https://www.haverstrawlibrary.org/events', city: 'Haverstraw', state: 'NY', zipCode: '10927', county: 'Haverstraw County'},
  { name: 'Highland Public Library', url: 'https://highlandlibrary.org/', eventsUrl: 'https://highlandlibrary.org/', city: 'Highland', state: 'NY', zipCode: '12528', county: 'Highland County'},
  { name: 'Highland Falls Library', url: 'https://highlandfallslibrary.org/', eventsUrl: 'https://highlandfallslibrary.org/calendar/', city: 'Highland Falls', state: 'NY', zipCode: '10928', county: 'Highland Falls County'},
  { name: 'Roeliff Jansen Community Library Association', url: 'https://www.cityofsanmateo.org/', eventsUrl: 'https://www.cityofsanmateo.org/507/Library', city: 'Hillsdale', state: 'NY', zipCode: '12529', county: 'Hillsdale County'},
  { name: 'Sachem Public Library', url: 'https://holbrooklibrary.org/', eventsUrl: 'https://holbrooklibrary.org/', city: 'Holbrook', state: 'NY', zipCode: '11741', county: 'Holbrook County'},
  { name: 'Holland Patent Free Library', url: 'https://hollandpatentlibrary.org/', eventsUrl: 'https://hollandpatentlibrary.org/', city: 'Holland Patent', state: 'NY', zipCode: '13354', county: 'Holland Patent County'},
  { name: 'Community Free Library', url: 'https://www.holleylibrary.org', eventsUrl: 'https://www.holleylibrary.org/events', city: 'Holley', state: 'NY', zipCode: '14470', county: 'Holley County'},
  { name: 'Queens Borough Public Library - Hollis', url: 'https://www.hollislibrary.org', eventsUrl: 'https://www.hollislibrary.org/events', city: 'Hollis', state: 'NY', zipCode: '11423', county: 'Hollis County'},
  { name: 'Phillips Free Library', url: 'https://www.homerlibrary.org', eventsUrl: 'https://www.homerlibrary.org/events', city: 'Homer', state: 'NY', zipCode: '13077', county: 'Homer County'},
  { name: 'Hudson Area Association Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'NY', zipCode: '12534', county: 'Hudson County'},
  { name: 'Huntington Public Library', url: 'https://www.huntingtonlibrary.org', eventsUrl: 'https://www.huntingtonlibrary.org/events', city: 'Huntington', state: 'NY', zipCode: '11743', county: 'Huntington County'},
  { name: 'Hurley Library District', url: 'https://hurleylibrary.org/', eventsUrl: 'https://hurleylibrary.org/', city: 'Hurley', state: 'NY', zipCode: '12443', county: 'Hurley County'},
  { name: 'Hyde Park Free Library', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'NY', zipCode: '12538', county: 'Hyde Park County'},
  { name: 'Ilion Free Public Library', url: 'https://www.ilionlibrary.org/', eventsUrl: 'https://www.ilionlibrary.org/', city: 'Ilion', state: 'NY', zipCode: '13357', county: 'Ilion County'},
  { name: 'Seneca Nation Of Indians Library Cattaraugus Territory', url: 'https://www.irvinglibrary.org', eventsUrl: 'https://www.irvinglibrary.org/events', city: 'Irving', state: 'NY', zipCode: '14081', county: 'Irving County'},
  { name: 'Irvington Pub Lib Guiteau Foundation', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'NY', zipCode: '10533', county: 'Irvington County'},
  { name: 'Island Park Public Library', url: 'https://islandparklibrary.org/', eventsUrl: 'https://islandparklibrary.org/', city: 'Island Park', state: 'NY', zipCode: '11558', county: 'Island Park County'},
  { name: 'Islip Public Library', url: 'https://isliplibrary.org/', eventsUrl: 'https://isliplibrary.org/', city: 'Islip', state: 'NY', zipCode: '11751', county: 'Islip County'},
  { name: 'Chautauqua-Cattaraugus Library System', url: 'https://www.jamestownlibrary.org', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'NY', zipCode: '14701', county: 'Jamestown County'},
  { name: 'Jericho Public Library', url: 'https://www.jericholibrary.org', eventsUrl: 'https://www.jericholibrary.org/events', city: 'Jericho', state: 'NY', zipCode: '11753', county: 'Jericho County'},
  { name: 'Your Home Public Library', url: 'https://www.johnsoncitylibrary.org', eventsUrl: 'https://www.johnsoncitylibrary.org/events', city: 'Johnson City', state: 'NY', zipCode: '13790', county: 'Johnson City County'},
  { name: 'Jordan Bramley Library', url: 'https://www.jordanlibrary.org', eventsUrl: 'https://www.jordanlibrary.org/events', city: 'Jordan', state: 'NY', zipCode: '13080', county: 'Jordan County'},
  { name: 'Jordanville Public Library', url: 'https://jordanvillelibrary.org/', eventsUrl: 'https://jordanvillelibrary.org/upcoming-events/', city: 'Jordanville', state: 'NY', zipCode: '13361', county: 'Jordanville County'},
  { name: 'Katonah Village Library', url: 'https://katonahlibrary.org/', eventsUrl: 'https://katonahlibrary.org/', city: 'Katonah', state: 'NY', zipCode: '10536', county: 'Katonah County'},
  { name: 'Keene Valley Public Library', url: 'https://www.keenevalleylibrary.org', eventsUrl: 'https://www.keenevalleylibrary.org/events', city: 'Keene Valley', state: 'NY', zipCode: '12943', county: 'Keene Valley County'},
  { name: 'Kennedy Free Library', url: 'https://www.kennedylibrary.org', eventsUrl: 'https://www.kennedylibrary.org/events', city: 'Kennedy', state: 'NY', zipCode: '14747', county: 'Kennedy County'},
  { name: 'Kinderhook Memorial Library', url: 'https://www.kinderhooklibrary.org', eventsUrl: 'https://www.kinderhooklibrary.org/events', city: 'Kinderhook', state: 'NY', zipCode: '12106', county: 'Kinderhook County'},
  { name: 'Kingston Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'NY', zipCode: '12401', county: 'Kingston County'},
  { name: 'Orleans Public Library', url: 'https://www.lafargevillelibrary.org', eventsUrl: 'https://www.lafargevillelibrary.org/events', city: 'Lafargeville', state: 'NY', zipCode: '13656', county: 'Lafargeville County'},
  { name: 'Lafayette Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'NY', zipCode: '13084', county: 'Lafayette County'},
  { name: 'Lake Placid Public Library', url: 'https://www.lakeplacidlibrary.org', eventsUrl: 'https://www.lakeplacidlibrary.org/events', city: 'Lake Placid', state: 'NY', zipCode: '12946', county: 'Lake Placid County'},
  { name: 'Lakewood Memorial Library', url: 'https://lakewoodlibrary.org/', eventsUrl: 'https://lakewoodlibrary.org/events/event/', city: 'Lakewood', state: 'NY', zipCode: '14750', county: 'Lakewood County'},
  { name: 'Lancaster Public Library', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'NY', zipCode: '14086', county: 'Lancaster County'},
  { name: 'Lansing Community Library', url: 'https://www.lansinglibrary.org', eventsUrl: 'https://www.lansinglibrary.org/events', city: 'Lansing', state: 'NY', zipCode: '14882', county: 'Lansing County'},
  { name: 'Larchmont Public Library', url: 'https://www.larchmontlibrary.org', eventsUrl: 'https://www.larchmontlibrary.org/events', city: 'Larchmont', state: 'NY', zipCode: '10538', county: 'Larchmont County'},
  { name: 'Peninsula Public Library', url: 'https://lawrencelibrary.org/', eventsUrl: 'https://lawrencelibrary.org/', city: 'Lawrence', state: 'NY', zipCode: '11559', county: 'Lawrence County'},
  { name: 'Woodward Memorial Library', url: 'https://www.leroylibrary.org/', eventsUrl: 'https://www.leroylibrary.org/', city: 'Leroy', state: 'NY', zipCode: '14482', county: 'Leroy County'},
  { name: 'Lewiston Public Library', url: 'https://www.lewistonlibrary.org/', eventsUrl: 'https://www.lewistonlibrary.org/', city: 'Lewiston', state: 'NY', zipCode: '14092', county: 'Lewiston County'},
  { name: 'Liberty Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'NY', zipCode: '12754', county: 'Liberty County'},
  { name: 'Lindenhurst Memorial Library', url: 'https://www.lindenhurstlibrary.org', eventsUrl: 'https://www.lindenhurstlibrary.org/events', city: 'Lindenhurst', state: 'NY', zipCode: '11757', county: 'Lindenhurst County'},
  { name: 'Lisle Free Library', url: 'https://www.lislelibrary.org/', eventsUrl: 'https://www.lislelibrary.org/', city: 'Lisle', state: 'NY', zipCode: '13797', county: 'Lisle County'},
  { name: 'Little Falls Public Library', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'NY', zipCode: '13365', county: 'Little Falls County'},
  { name: 'Memorial Library Of Little Valley', url: 'https://littlevalleylibrary.org/', eventsUrl: 'https://littlevalleylibrary.org/', city: 'Little Valley', state: 'NY', zipCode: '14755', county: 'Little Valley County'},
  { name: 'Livingston Free Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'NY', zipCode: '12541', county: 'Livingston County'},
  { name: 'Livingston Manor Free Library', url: 'https://www.livingstonmanorlibrary.org', eventsUrl: 'https://www.livingstonmanorlibrary.org/events', city: 'Livingston Manor', state: 'NY', zipCode: '12758', county: 'Livingston Manor County'},
  { name: 'Livonia Public Library', url: 'https://livonialibrary.org/', eventsUrl: 'https://livonialibrary.org/', city: 'Livonia', state: 'NY', zipCode: '14487', county: 'Livonia County'},
  { name: 'Lockport Public Library', url: 'https://www.lockportlibrary.org', eventsUrl: 'https://www.lockportlibrary.org/events', city: 'Lockport', state: 'NY', zipCode: '14094', county: 'Lockport County'},
  { name: 'Locust Valley Library', url: 'https://www.locustvalleylibrary.org', eventsUrl: 'https://www.locustvalleylibrary.org/events', city: 'Locust Valley', state: 'NY', zipCode: '11560', county: 'Locust Valley County'},
  { name: 'Long Beach Public Library', url: 'https://www.longbeachlibrary.org', eventsUrl: 'https://www.longbeachlibrary.org/events', city: 'Long Beach', state: 'NY', zipCode: '11561', county: 'Long Beach County'},
  { name: 'William K Sanford Town Library', url: 'https://loudonvillelibrary.org/', eventsUrl: 'https://loudonvillelibrary.org/', city: 'Loudonville', state: 'NY', zipCode: '12211', county: 'Loudonville County'},
  { name: 'Lynbrook Public Library', url: 'https://www.lynbrooklibrary.org', eventsUrl: 'https://www.lynbrooklibrary.org/events', city: 'Lynbrook', state: 'NY', zipCode: '11563', county: 'Lynbrook County'},
  { name: 'Lyons Public Library', url: 'https://lyonslibrary.org/', eventsUrl: 'https://lyonslibrary.org/', city: 'Lyons', state: 'NY', zipCode: '14489', county: 'Lyons County'},
  { name: 'Lyons Falls Library', url: 'https://www.lyonsfallslibrary.org', eventsUrl: 'https://www.lyonsfallslibrary.org/events', city: 'Lyons Falls', state: 'NY', zipCode: '13368', county: 'Lyons Falls County'},
  { name: 'King Memorial Library', url: 'https://www.machiaslibrary.org', eventsUrl: 'https://www.machiaslibrary.org/events', city: 'Machias', state: 'NY', zipCode: '14101', county: 'Machias County'},
  { name: 'Mahopac Public Library', url: 'https://www.mahopaclibrary.org', eventsUrl: 'https://www.mahopaclibrary.org/events', city: 'Mahopac', state: 'NY', zipCode: '10541', county: 'Mahopac County'},
  { name: 'Malverne Public Library', url: 'https://malvernelibrary.org/', eventsUrl: 'https://malvernelibrary.org/', city: 'Malverne', state: 'NY', zipCode: '11565', county: 'Malverne County'},
  { name: 'Mamaroneck Public Library District', url: 'https://www.mamaronecklibrary.org', eventsUrl: 'https://www.mamaronecklibrary.org/events', city: 'Mamaroneck', state: 'NY', zipCode: '10543', county: 'Mamaroneck County'},
  { name: 'Manhasset Public Library', url: 'https://manhassetlibrary.org/', eventsUrl: 'https://manhassetlibrary.org/site/', city: 'Manhasset', state: 'NY', zipCode: '11030', county: 'Manhasset County'},
  { name: 'Manlius Library', url: 'https://www.manliuslibrary.org', eventsUrl: 'https://www.manliuslibrary.org/events', city: 'Manlius', state: 'NY', zipCode: '13104', county: 'Manlius County'},
  { name: 'Mannsville Free Library', url: 'https://www.mannsvillelibrary.org', eventsUrl: 'https://www.mannsvillelibrary.org/events', city: 'Mannsville', state: 'NY', zipCode: '13661', county: 'Mannsville County'},
  { name: 'Marcellus Free Library', url: 'https://www.marcelluslibrary.org', eventsUrl: 'https://www.marcelluslibrary.org/events', city: 'Marcellus', state: 'NY', zipCode: '13108', county: 'Marcellus County'},
  { name: 'Marion Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'NY', zipCode: '14505', county: 'Marion County'},
  { name: 'Marlboro Free Library', url: 'https://www.marlborolibrary.org', eventsUrl: 'https://www.marlborolibrary.org/events', city: 'Marlboro', state: 'NY', zipCode: '12542', county: 'Marlboro County'},
  { name: 'William H. Bush Memorial Library', url: 'https://www.martinsburglibrary.org', eventsUrl: 'https://www.martinsburglibrary.org/events', city: 'Martinsburg', state: 'NY', zipCode: '13404', county: 'Martinsburg County'},
  { name: 'Plainedge Public Library', url: 'https://massapequalibrary.org/', eventsUrl: 'https://massapequalibrary.org/', city: 'Massapequa', state: 'NY', zipCode: '11758', county: 'Massapequa County'},
  { name: 'Mayville Library', url: 'https://www.mayvillelibrary.org/', eventsUrl: 'https://www.mayvillelibrary.org/calendar', city: 'Mayville', state: 'NY', zipCode: '14757', county: 'Mayville County'},
  { name: 'Menands Public Library', url: 'https://www.menandslibrary.org', eventsUrl: 'https://www.menandslibrary.org/events', city: 'Menands', state: 'NY', zipCode: '12204', county: 'Menands County'},
  { name: 'Merrick Library', url: 'https://www.merricklibrary.org', eventsUrl: 'https://www.merricklibrary.org/events', city: 'Merrick', state: 'NY', zipCode: '11566', county: 'Merrick County'},
  { name: 'Middleburgh Library', url: 'https://www.middleburghlibrary.org/', eventsUrl: 'https://www.middleburghlibrary.org/', city: 'Middleburgh', state: 'NY', zipCode: '12122', county: 'Middleburgh County'},
  { name: 'Ramapo Catskill Library System', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'NY', zipCode: '10940', county: 'Middletown County'},
  { name: 'Middleville Free Library', url: 'https://middlevillelibrary.org/', eventsUrl: 'https://middlevillelibrary.org/', city: 'Middleville', state: 'NY', zipCode: '13406', county: 'Middleville County'},
  { name: 'Milford Free Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'NY', zipCode: '13807', county: 'Milford County'},
  { name: 'Millbrook Free Library', url: 'https://millbrooklibrary.org/', eventsUrl: 'https://millbrooklibrary.org/', city: 'Millbrook', state: 'NY', zipCode: '12545', county: 'Millbrook County'},
  { name: 'Sarah Hull Hallock Free Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'NY', zipCode: '12547', county: 'Milton County'},
  { name: 'Minoa Library', url: 'https://www.minoalibrary.org', eventsUrl: 'https://www.minoalibrary.org/events', city: 'Minoa', state: 'NY', zipCode: '13116', county: 'Minoa County'},
  { name: 'Monroe Free Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NY', zipCode: '10950', county: 'Monroe County'},
  { name: 'Montauk Library', url: 'https://www.montauklibrary.org', eventsUrl: 'https://www.montauklibrary.org/events', city: 'Montauk', state: 'NY', zipCode: '11954', county: 'Montauk County'},
  { name: 'Montgomery Free Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'NY', zipCode: '12549', county: 'Montgomery County'},
  { name: 'Ethelbert B. Crawford Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'NY', zipCode: '12701', county: 'Monticello County'},
  { name: 'Montour Falls Memorial Library', url: 'https://www.montourfallslibrary.org', eventsUrl: 'https://www.montourfallslibrary.org/events', city: 'Montour Falls', state: 'NY', zipCode: '14865', county: 'Montour Falls County'},
  { name: 'Hendrick Hudson Free Library', url: 'https://www.montroselibrary.org', eventsUrl: 'https://www.montroselibrary.org/events', city: 'Montrose', state: 'NY', zipCode: '10548', county: 'Montrose County'},
  { name: 'Mooers Free Library', url: 'https://www.mooerslibrary.org', eventsUrl: 'https://www.mooerslibrary.org/events', city: 'Mooers', state: 'NY', zipCode: '12958', county: 'Mooers County'},
  { name: 'Morristown Public Library', url: 'https://www.morristownlibrary.org', eventsUrl: 'https://www.morristownlibrary.org/events', city: 'Morristown', state: 'NY', zipCode: '13664', county: 'Morristown County'},
  { name: 'Mount Morris Library', url: 'https://www.mountmorrislibrary.org', eventsUrl: 'https://www.mountmorrislibrary.org/events', city: 'Mount Morris', state: 'NY', zipCode: '14510', county: 'Mount Morris County'},
  { name: 'Nanuet Public Library', url: 'https://nanuetpubliclibrary.org/', eventsUrl: 'https://nanuetpubliclibrary.org/', city: 'Nanuet', state: 'NY', zipCode: '10954', county: 'Nanuet County'},
  { name: 'Naples Library', url: 'https://www.napleslibrary.org', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'NY', zipCode: '14512', county: 'Naples County'},
  { name: 'Nassau Free Library', url: 'https://nassaulibrary.org/', eventsUrl: 'https://nassaulibrary.org/', city: 'Nassau', state: 'NY', zipCode: '12123', county: 'Nassau County'},
  { name: 'New Berlin Library', url: 'https://www.newberlinlibrary.org', eventsUrl: 'https://www.newberlinlibrary.org/events', city: 'New Berlin', state: 'NY', zipCode: '13411', county: 'New Berlin County'},
  { name: 'Library Association Of Rockland County', url: 'https://www.newcitylibrary.org', eventsUrl: 'https://www.newcitylibrary.org/events', city: 'New City', state: 'NY', zipCode: '10956', county: 'New City County'},
  { name: 'New Lebanon Library', url: 'https://newlebanonlibrary.org/', eventsUrl: 'https://newlebanonlibrary.org/calendar/', city: 'New Lebanon', state: 'NY', zipCode: '12125', county: 'New Lebanon County'},
  { name: 'New Woodstock Free Library', url: 'https://newwoodstocklibrary.org/', eventsUrl: 'https://newwoodstocklibrary.org/', city: 'New Woodstock', state: 'NY', zipCode: '13122', county: 'New Woodstock County'},
  { name: 'New York Mills Public Library', url: 'https://www.newyorkmillslibrary.org/', eventsUrl: 'https://www.newyorkmillslibrary.org/', city: 'New York Mills', state: 'NY', zipCode: '13417', county: 'New York Mills County'},
  { name: 'Newark Public Library', url: 'https://newarklibrary.org/', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'NY', zipCode: '14513', county: 'Newark County'},
  { name: 'Newburgh Free Library', url: 'https://newburghlibrary.org/', eventsUrl: 'https://newburghlibrary.org/', city: 'Newburgh', state: 'NY', zipCode: '12550', county: 'Newburgh County'},
  { name: 'Newfane Free Library', url: 'https://www.newfanelibrary.org', eventsUrl: 'https://www.newfanelibrary.org/events', city: 'Newfane', state: 'NY', zipCode: '14108', county: 'Newfane County'},
  { name: 'Newport Free Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'NY', zipCode: '13416', county: 'Newport County'},
  { name: 'Hepburn Library Of Norfolk', url: 'https://www.norfolklibrary.org', eventsUrl: 'https://www.norfolklibrary.org/events', city: 'Norfolk', state: 'NY', zipCode: '13667', county: 'Norfolk County'},
  { name: 'North Bellmore Public Library', url: 'https://www.northbellmorelibrary.org', eventsUrl: 'https://www.northbellmorelibrary.org/events', city: 'North Bellmore', state: 'NY', zipCode: '11710', county: 'North Bellmore County'},
  { name: 'North Chatham Free Library', url: 'https://www.northchathamlibrary.org', eventsUrl: 'https://www.northchathamlibrary.org/events', city: 'North Chatham', state: 'NY', zipCode: '12132', county: 'North Chatham County'},
  { name: 'Northville Public Library', url: 'https://www.northvillelibrary.org', eventsUrl: 'https://www.northvillelibrary.org/events', city: 'Northville', state: 'NY', zipCode: '12134', county: 'Northville County'},
  { name: 'Guernsey Memorial Library Of Norwich', url: 'https://www.norwichlibrary.org/', eventsUrl: 'https://www.norwichlibrary.org/category/events/', city: 'Norwich', state: 'NY', zipCode: '13815', county: 'Norwich County'},
  { name: 'Norwood Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'NY', zipCode: '13668', county: 'Norwood County'},
  { name: 'Nyack Library', url: 'https://www.nyacklibrary.org', eventsUrl: 'https://www.nyacklibrary.org/events', city: 'Nyack', state: 'NY', zipCode: '10960', county: 'Nyack County'},
  { name: 'Haxton Memorial Library', url: 'https://www.oakfieldlibrary.org', eventsUrl: 'https://www.oakfieldlibrary.org/events', city: 'Oakfield', state: 'NY', zipCode: '14125', county: 'Oakfield County'},
  { name: 'Old Forge Library', url: 'https://oldforgelibrary.org/', eventsUrl: 'https://oldforgelibrary.org/', city: 'Old Forge', state: 'NY', zipCode: '13420', county: 'Old Forge County'},
  { name: 'Olean Public Library', url: 'https://oleanlibrary.org/', eventsUrl: 'https://oleanlibrary.org/events/event/', city: 'Olean', state: 'NY', zipCode: '14760', county: 'Olean County'},
  { name: 'Orangeburg Library', url: 'https://orangeburglibrary.org/', eventsUrl: 'https://orangeburglibrary.org/', city: 'Orangeburg', state: 'NY', zipCode: '10962', county: 'Orangeburg County'},
  { name: 'Oriskany Public Library', url: 'https://oriskanylibrary.org/', eventsUrl: 'https://oriskanylibrary.org/', city: 'Oriskany', state: 'NY', zipCode: '13424', county: 'Oriskany County'},
  { name: 'C. W. Clark Memorial Library', url: 'https://oriskanyfallslibrary.org/', eventsUrl: 'https://oriskanyfallslibrary.org/', city: 'Oriskany Falls', state: 'NY', zipCode: '13425', county: 'Oriskany Falls County'},
  { name: 'Ossining Public Library', url: 'https://ossininglibrary.org/', eventsUrl: 'https://ossininglibrary.org/', city: 'Ossining', state: 'NY', zipCode: '10562', county: 'Ossining County'},
  { name: 'Oswego School District Public Library', url: 'https://oswego.mykansaslibrary.org/', eventsUrl: 'https://oswego.mykansaslibrary.org/', city: 'Oswego', state: 'NY', zipCode: '13126', county: 'Oswego County'},
  { name: 'Edith B. Ford Memorial Library', url: 'https://www.ovidlibrary.org', eventsUrl: 'https://www.ovidlibrary.org/events', city: 'Ovid', state: 'NY', zipCode: '14521', county: 'Ovid County'},
  { name: 'Oxford Memorial Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'NY', zipCode: '13830', county: 'Oxford County'},
  { name: 'Oyster Bay-East Norwich Public Library', url: 'https://oysterbaylibrary.org/', eventsUrl: 'https://oysterbaylibrary.org/', city: 'Oyster Bay', state: 'NY', zipCode: '11771', county: 'Oyster Bay County'},
  { name: 'Palisades Free Library', url: 'https://palisadeslibrary.org/', eventsUrl: 'https://palisadeslibrary.org/', city: 'Palisades', state: 'NY', zipCode: '10964', county: 'Palisades County'},
  { name: 'Parish Public Library', url: 'https://www.parishlibrary.org', eventsUrl: 'https://www.parishlibrary.org/events', city: 'Parish', state: 'NY', zipCode: '13131', county: 'Parish County'},
  { name: 'Patterson Library', url: 'https://pattersonlibrary.org/', eventsUrl: 'https://pattersonlibrary.org/calendar/', city: 'Patterson', state: 'NY', zipCode: '12563', county: 'Patterson County'},
  { name: 'Pawling Free Library', url: 'https://www.pawlinglibrary.org', eventsUrl: 'https://www.pawlinglibrary.org/events', city: 'Pawling', state: 'NY', zipCode: '12564', county: 'Pawling County'},
  { name: 'Pearl River Public Library', url: 'https://pearlriverlibrary.org/', eventsUrl: 'https://pearlriverlibrary.org/', city: 'Pearl River', state: 'NY', zipCode: '10965', county: 'Pearl River County'},
  { name: 'Town Of Pelham Public Library', url: 'https://www.pelhamlibrary.org/', eventsUrl: 'https://www.pelhamlibrary.org/calendar/', city: 'Pelham', state: 'NY', zipCode: '10803', county: 'Pelham County'},
  { name: 'Penfield Public Library', url: 'https://www.penfieldlibrary.org', eventsUrl: 'https://www.penfieldlibrary.org/events', city: 'Penfield', state: 'NY', zipCode: '14526', county: 'Penfield County'},
  { name: 'Perry Public Library', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'NY', zipCode: '14530', county: 'Perry County'},
  { name: 'Peru Free Library', url: 'https://www.perulibrary.org', eventsUrl: 'https://www.perulibrary.org/events', city: 'Peru', state: 'NY', zipCode: '12972', county: 'Peru County'},
  { name: 'Phelps Community Memorial Library', url: 'https://www.phelpslibrary.org', eventsUrl: 'https://www.phelpslibrary.org/events', city: 'Phelps', state: 'NY', zipCode: '14532', county: 'Phelps County'},
  { name: 'Phoenicia Library', url: 'https://phoenicialibrary.org/', eventsUrl: 'https://phoenicialibrary.org/calendar/', city: 'Phoenicia', state: 'NY', zipCode: '12464', county: 'Phoenicia County'},
  { name: 'Phoenix Public Library', url: 'https://www.phoenixlibrary.org', eventsUrl: 'https://www.phoenixlibrary.org/events', city: 'Phoenix', state: 'NY', zipCode: '13135', county: 'Phoenix County'},
  { name: 'Piermont Library District', url: 'https://www.piermontlibrary.org', eventsUrl: 'https://www.piermontlibrary.org/events', city: 'Piermont', state: 'NY', zipCode: '10968', county: 'Piermont County'},
  { name: 'Pike Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pike', state: 'NY', zipCode: '14130', county: 'Pike County'},
  { name: 'Morton Memorial Library', url: 'https://pinehilllibrary.org/', eventsUrl: 'https://pinehilllibrary.org/calendar/', city: 'Pine Hill', state: 'NY', zipCode: '12465', county: 'Pine Hill County'},
  { name: 'Pine Plains Free Library', url: 'https://www.pineplainslibrary.org', eventsUrl: 'https://www.pineplainslibrary.org/events', city: 'Pine Plains', state: 'NY', zipCode: '12567', county: 'Pine Plains County'},
  { name: 'Pleasant Valley Free Library', url: 'https://www.pleasantvalleylibrary.org', eventsUrl: 'https://www.pleasantvalleylibrary.org/events', city: 'Pleasant Valley', state: 'NY', zipCode: '12569', county: 'Pleasant Valley County'},
  { name: 'Poestenkill Library', url: 'https://www.poestenkilllibrary.org', eventsUrl: 'https://www.poestenkilllibrary.org/events', city: 'Poestenkill', state: 'NY', zipCode: '12140', county: 'Poestenkill County'},
  { name: 'Port Byron Library', url: 'https://www.portbyronlibrary.org', eventsUrl: 'https://www.portbyronlibrary.org/events', city: 'Port Byron', state: 'NY', zipCode: '13140', county: 'Port Byron County'},
  { name: 'Port Chester Public Library', url: 'https://portchesterlibrary.org/', eventsUrl: 'https://portchesterlibrary.org/', city: 'Port Chester', state: 'NY', zipCode: '10573', county: 'Port Chester County'},
  { name: 'Port Jervis Free Library', url: 'https://www.portjervislibrary.org/', eventsUrl: 'https://www.portjervislibrary.org/', city: 'Port Jervis', state: 'NY', zipCode: '12771', county: 'Port Jervis County'},
  { name: 'Port Leyden Community Library', url: 'https://www.portleydenlibrary.org', eventsUrl: 'https://www.portleydenlibrary.org/events', city: 'Port Leyden', state: 'NY', zipCode: '13433', county: 'Port Leyden County'},
  { name: 'Portville Free Library', url: 'https://www.portvillelibrary.org', eventsUrl: 'https://www.portvillelibrary.org/events', city: 'Portville', state: 'NY', zipCode: '14770', county: 'Portville County'},
  { name: 'Potsdam Public Library', url: 'https://www.potsdamlibrary.org', eventsUrl: 'https://www.potsdamlibrary.org/events', city: 'Potsdam', state: 'NY', zipCode: '13676', county: 'Potsdam County'},
  { name: 'Pound Ridge Library District', url: 'https://www.poundridgelibrary.org', eventsUrl: 'https://www.poundridgelibrary.org/events', city: 'Pound Ridge', state: 'NY', zipCode: '10576', county: 'Pound Ridge County'},
  { name: 'Prospect Free Library', url: 'https://www.prospectlibrary.org/', eventsUrl: 'https://www.prospectlibrary.org/calendar', city: 'Prospect', state: 'NY', zipCode: '13435', county: 'Prospect County'},
  { name: 'Putnam Valley Free Library', url: 'https://putnamvalleylibrary.org/', eventsUrl: 'https://putnamvalleylibrary.org/calendar/', city: 'Putnam Valley', state: 'NY', zipCode: '10579', county: 'Putnam Valley County'},
  { name: 'Quogue Library', url: 'https://www.quoguelibrary.org/', eventsUrl: 'https://www.quoguelibrary.org/', city: 'Quogue', state: 'NY', zipCode: '11959', county: 'Quogue County'},
  { name: 'Randolph Free Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'NY', zipCode: '14772', county: 'Randolph County'},
  { name: 'Ransomville Free Library', url: 'https://www.ransomvillelibrary.org/', eventsUrl: 'https://www.ransomvillelibrary.org/', city: 'Ransomville', state: 'NY', zipCode: '14131', county: 'Ransomville County'},
  { name: 'Red Hook Public Library', url: 'https://redhooklibrary.org/', eventsUrl: 'https://redhooklibrary.org/calendar/', city: 'Red Hook', state: 'NY', zipCode: '12571', county: 'Red Hook County'},
  { name: 'Didymus Thomas Library', url: 'https://remsenlibrary.org/', eventsUrl: 'https://remsenlibrary.org/', city: 'Remsen', state: 'NY', zipCode: '13438', county: 'Remsen County'},
  { name: 'Rensselaer Public Library', url: 'https://www.rensselaerlibrary.org', eventsUrl: 'https://www.rensselaerlibrary.org/events', city: 'Rensselaer', state: 'NY', zipCode: '12144', county: 'Rensselaer County'},
  { name: 'Rensselaerville Public Library', url: 'https://www.rensselaervillelibrary.org', eventsUrl: 'https://www.rensselaervillelibrary.org/events', city: 'Rensselaerville', state: 'NY', zipCode: '12147', county: 'Rensselaerville County'},
  { name: 'Queens Borough Public Library - Ridgewood', url: 'https://ridgewoodlibrary.org/', eventsUrl: 'https://ridgewoodlibrary.org/', city: 'Ridgewood', state: 'NY', zipCode: '11385', county: 'Ridgewood County'},
  { name: 'Ripley Free Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'NY', zipCode: '14775', county: 'Ripley County'},
  { name: 'Riverhead Free Library', url: 'https://www.riverheadlibrary.org', eventsUrl: 'https://www.riverheadlibrary.org/events', city: 'Riverhead', state: 'NY', zipCode: '11901', county: 'Riverhead County'},
  { name: 'Rodman Public Library', url: 'https://www.rodmanlibrary.org', eventsUrl: 'https://www.rodmanlibrary.org/events', city: 'Rodman', state: 'NY', zipCode: '13682', county: 'Rodman County'},
  { name: 'The Jervis Public Library Association, Inc.', url: 'https://www.romelibrary.org', eventsUrl: 'https://www.romelibrary.org/events', city: 'Rome', state: 'NY', zipCode: '13440', county: 'Rome County'},
  { name: 'Roosevelt Public Library', url: 'https://www.rooseveltlibrary.org', eventsUrl: 'https://www.rooseveltlibrary.org/events', city: 'Roosevelt', state: 'NY', zipCode: '11575', county: 'Roosevelt County'},
  { name: 'Rose Free Library', url: 'https://www.roselibrary.org', eventsUrl: 'https://www.roselibrary.org/events', city: 'Rose', state: 'NY', zipCode: '14542', county: 'Rose County'},
  { name: 'Rosendale Library', url: 'https://rosendalelibrary.org/', eventsUrl: 'https://rosendalelibrary.org/', city: 'Rosendale', state: 'NY', zipCode: '12472', county: 'Rosendale County'},
  { name: 'Bryant Library', url: 'https://www.roslynlibrary.org', eventsUrl: 'https://www.roslynlibrary.org/events', city: 'Roslyn', state: 'NY', zipCode: '11576', county: 'Roslyn County'},
  { name: 'Womens Round Lake Improvement Society Lib', url: 'https://roundlake.sals.edu/', eventsUrl: 'https://roundlake.sals.edu/', city: 'Round Lake', state: 'NY', zipCode: '12151', county: 'Round Lake County'},
  { name: 'Rouses Point Dodge Memorial Library', url: 'https://www.rousespointlibrary.org', eventsUrl: 'https://www.rousespointlibrary.org/events', city: 'Rouses Point', state: 'NY', zipCode: '12979', county: 'Rouses Point County'},
  { name: 'Roxbury Library Association', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'NY', zipCode: '12474', county: 'Roxbury County'},
  { name: 'Rush Public Library', url: 'https://rushlibrary.org/', eventsUrl: 'https://rushlibrary.org/', city: 'Rush', state: 'NY', zipCode: '14543', county: 'Rush County'},
  { name: 'Russell Public Library', url: 'https://russelllibrary.org/', eventsUrl: 'https://russelllibrary.org/', city: 'Russell', state: 'NY', zipCode: '13684', county: 'Russell County'},
  { name: 'Rye Free Reading Room', url: 'https://www.ryelibrary.org/', eventsUrl: 'https://www.ryelibrary.org/', city: 'Rye', state: 'NY', zipCode: '10580', county: 'Rye County'},
  { name: 'John Jermain Memorial Library', url: 'https://www.sagharborlibrary.org', eventsUrl: 'https://www.sagharborlibrary.org/events', city: 'Sag Harbor', state: 'NY', zipCode: '11963', county: 'Sag Harbor County'},
  { name: 'Salamanca Public Library', url: 'https://www.salamancalibrary.org', eventsUrl: 'https://www.salamancalibrary.org/events', city: 'Salamanca', state: 'NY', zipCode: '14779', county: 'Salamanca County'},
  { name: 'Bancroft Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'NY', zipCode: '12865', county: 'Salem County'},
  { name: 'Annie Porter Ainsworth Memorial Library', url: 'https://ainsworthmemoriallibrary.org/', eventsUrl: 'https://ainsworthmemoriallibrary.org/', city: 'Sandy Creek', state: 'NY', zipCode: '13145', county: 'Sandy Creek County'},
  { name: 'Sayville Library', url: 'https://www.sayvillelibrary.org', eventsUrl: 'https://www.sayvillelibrary.org/events', city: 'Sayville', state: 'NY', zipCode: '11782', county: 'Sayville County'},
  { name: 'Scarsdale Public Library', url: 'https://www.scarsdalelibrary.org', eventsUrl: 'https://www.scarsdalelibrary.org/events', city: 'Scarsdale', state: 'NY', zipCode: '10583', county: 'Scarsdale County'},
  { name: 'Schoharie Free Library Assn.', url: 'https://www.schoharielibrary.org/', eventsUrl: 'https://www.schoharielibrary.org/', city: 'Schoharie', state: 'NY', zipCode: '12157', county: 'Schoharie County'},
  { name: 'Schroon Lake Public Library', url: 'https://www.schroonlakelibrary.org', eventsUrl: 'https://www.schroonlakelibrary.org/events', city: 'Schroon Lake', state: 'NY', zipCode: '12870', county: 'Schroon Lake County'},
  { name: 'Scio Memorial Library', url: 'https://www.sciolibrary.org', eventsUrl: 'https://www.sciolibrary.org/events', city: 'Scio', state: 'NY', zipCode: '14880', county: 'Scio County'},
  { name: 'Scottsville Free Library', url: 'https://www.scottsvillelibrary.org', eventsUrl: 'https://www.scottsvillelibrary.org/events', city: 'Scottsville', state: 'NY', zipCode: '14546', county: 'Scottsville County'},
  { name: 'Sea Cliff Village Library', url: 'https://www.seaclifflibrary.org', eventsUrl: 'https://www.seaclifflibrary.org/events', city: 'Sea Cliff', state: 'NY', zipCode: '11579', county: 'Sea Cliff County'},
  { name: 'Seaford Public Library', url: 'https://seafordlibrary.org/', eventsUrl: 'https://seafordlibrary.org/library-events/', city: 'Seaford', state: 'NY', zipCode: '11783', county: 'Seaford County'},
  { name: 'Seneca Falls Library', url: 'https://senecafallslibrary.org/', eventsUrl: 'https://senecafallslibrary.org/', city: 'Seneca Falls', state: 'NY', zipCode: '13148', county: 'Seneca Falls County'},
  { name: 'Shelter Island Public Library Society', url: 'https://www.shelterislandlibrary.org', eventsUrl: 'https://www.shelterislandlibrary.org/events', city: 'Shelter Island', state: 'NY', zipCode: '11964', county: 'Shelter Island County'},
  { name: 'Sherburne Public Library', url: 'https://www.sherburnelibrary.org', eventsUrl: 'https://www.sherburnelibrary.org/events', city: 'Sherburne', state: 'NY', zipCode: '13460', county: 'Sherburne County'},
  { name: 'Minerva Free Library', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'NY', zipCode: '14781', county: 'Sherman County'},
  { name: 'Mastics-Moriches-Shirley Community Lib', url: 'https://www.shirleylibrary.org/', eventsUrl: 'https://www.shirleylibrary.org/', city: 'Shirley', state: 'NY', zipCode: '11967', county: 'Shirley County'},
  { name: 'John C. Hart Memorial Library', url: 'https://www.shruboaklibrary.org', eventsUrl: 'https://www.shruboaklibrary.org/events', city: 'Shrub Oak', state: 'NY', zipCode: '10588', county: 'Shrub Oak County'},
  { name: 'Sidney Memorial Public Library', url: 'https://www.sidneylibrary.org/', eventsUrl: 'https://www.sidneylibrary.org/index.php/calendar/', city: 'Sidney', state: 'NY', zipCode: '13838', county: 'Sidney County'},
  { name: 'Sinclairville Free Library', url: 'https://www.sinclairvillelibrary.org', eventsUrl: 'https://www.sinclairvillelibrary.org/events', city: 'Sinclairville', state: 'NY', zipCode: '14782', county: 'Sinclairville County'},
  { name: 'Sloatsburg Public Library', url: 'https://sloatsburglibrary.org/', eventsUrl: 'https://sloatsburglibrary.org/', city: 'Sloatsburg', state: 'NY', zipCode: '10974', county: 'Sloatsburg County'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'NY', zipCode: '13464', county: 'Smyrna County'},
  { name: 'Sodus Free Library', url: 'https://www.soduslibrary.org', eventsUrl: 'https://www.soduslibrary.org/events', city: 'Sodus', state: 'NY', zipCode: '14551', county: 'Sodus County'},
  { name: 'Solvay Public Library', url: 'https://www.solvaylibrary.org', eventsUrl: 'https://www.solvaylibrary.org/events', city: 'Solvay', state: 'NY', zipCode: '13209', county: 'Solvay County'},
  { name: 'Somers Library', url: 'https://www.somerslibrary.org', eventsUrl: 'https://www.somerslibrary.org/events', city: 'Somers', state: 'NY', zipCode: '10589', county: 'Somers County'},
  { name: 'Lewisboro Library', url: 'https://lewisborolibrary.org/', eventsUrl: 'https://lewisborolibrary.org/events/', city: 'South Salem', state: 'NY', zipCode: '10590', county: 'South Salem County'},
  { name: 'Rogers Memorial Library', url: 'https://www.southamptonlibrary.org', eventsUrl: 'https://www.southamptonlibrary.org/events', city: 'Southampton', state: 'NY', zipCode: '11968', county: 'Southampton County'},
  { name: 'Southold Free Library', url: 'https://southoldlibrary.org/', eventsUrl: 'https://southoldlibrary.org/', city: 'Southold', state: 'NY', zipCode: '11971', county: 'Southold County'},
  { name: 'Finkelstein Memorial Library', url: 'https://www.springvalleylibrary.org', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'NY', zipCode: '10977', county: 'Spring Valley County'},
  { name: 'Staatsburg Library', url: 'https://staatsburglibrary.org/', eventsUrl: 'https://staatsburglibrary.org/calendar/', city: 'Staatsburg', state: 'NY', zipCode: '12580', county: 'Staatsburg County'},
  { name: 'Stamford Village Library', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'NY', zipCode: '12167', county: 'Stamford County'},
  { name: 'Stephentown Memorial Library', url: 'https://www.stephentownlibrary.org', eventsUrl: 'https://www.stephentownlibrary.org/events', city: 'Stephentown', state: 'NY', zipCode: '12168', county: 'Stephentown County'},
  { name: 'Stillwater Free Library', url: 'https://www.stillwaterlibrary.org', eventsUrl: 'https://www.stillwaterlibrary.org/events', city: 'Stillwater', state: 'NY', zipCode: '12170', county: 'Stillwater County'},
  { name: 'Mary E. Seymour Memorial Free Library', url: 'https://stocktonlibrary.org/', eventsUrl: 'https://stocktonlibrary.org/', city: 'Stockton', state: 'NY', zipCode: '14784', county: 'Stockton County'},
  { name: 'Stone Ridge Public Library', url: 'https://stoneridgelibrary.org/', eventsUrl: 'https://stoneridgelibrary.org/', city: 'Stone Ridge', state: 'NY', zipCode: '12484', county: 'Stone Ridge County'},
  { name: 'Rose Memorial Library Association', url: 'https://www.rosememoriallibrary.org/', eventsUrl: 'https://www.rosememoriallibrary.org/events/', city: 'Stony Point', state: 'NY', zipCode: '10980', county: 'Stony Point County'},
  { name: 'Suffern Free Library', url: 'https://www.suffernlibrary.org', eventsUrl: 'https://www.suffernlibrary.org/events', city: 'Suffern', state: 'NY', zipCode: '10901', county: 'Suffern County'},
  { name: 'Syosset Public Library', url: 'https://www.syossetlibrary.org', eventsUrl: 'https://www.syossetlibrary.org/events', city: 'Syosset', state: 'NY', zipCode: '11791', county: 'Syosset County'},
  { name: 'Tappan Library', url: 'https://tappanlibrary.org/', eventsUrl: 'https://tappanlibrary.org/', city: 'Tappan', state: 'NY', zipCode: '10983', county: 'Tappan County'},
  { name: 'Warner Library', url: 'https://www.tarrytownlibrary.org', eventsUrl: 'https://www.tarrytownlibrary.org/events', city: 'Tarrytown', state: 'NY', zipCode: '10591', county: 'Tarrytown County'},
  { name: 'Tivoli Free Library', url: 'https://engagedpatrons.org/', eventsUrl: 'https://engagedpatrons.org/EventsCalendar.cfm?SiteID=6141', city: 'Tivoli', state: 'NY', zipCode: '12583', county: 'Tivoli County'},
  { name: 'Tomkins Cove Public Library', url: 'https://www.tomkinscovelibrary.org/', eventsUrl: 'https://www.tomkinscovelibrary.org/', city: 'Tomkins Cove', state: 'NY', zipCode: '10986', county: 'Tomkins Cove County'},
  { name: 'Brunswick Community Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'NY', zipCode: '12180', county: 'Troy County'},
  { name: 'Ulysses Philomathic Library', url: 'https://www.trumansburglibrary.org/', eventsUrl: 'https://www.trumansburglibrary.org/', city: 'Trumansburg', state: 'NY', zipCode: '14886', county: 'Trumansburg County'},
  { name: 'Tuckahoe Public Library', url: 'https://www.tuckahoelibrary.org', eventsUrl: 'https://www.tuckahoelibrary.org/events', city: 'Tuckahoe', state: 'NY', zipCode: '10707', county: 'Tuckahoe County'},
  { name: 'B. Elizabeth Strong Memorial Library', url: 'https://www.turinlibrary.org', eventsUrl: 'https://www.turinlibrary.org/events', city: 'Turin', state: 'NY', zipCode: '13473', county: 'Turin County'},
  { name: 'Tuxedo Park Library', url: 'https://www.tuxedoparklibrary.org/', eventsUrl: 'https://www.tuxedoparklibrary.org/calendar/', city: 'Tuxedo Park', state: 'NY', zipCode: '10987', county: 'Tuxedo Park County'},
  { name: 'Unadilla Public Library', url: 'https://www.unadillalibrary.org', eventsUrl: 'https://www.unadillalibrary.org/events', city: 'Unadilla', state: 'NY', zipCode: '13849', county: 'Unadilla County'},
  { name: 'Nassau Library System', url: 'https://uniondalelibrary.org/', eventsUrl: 'https://uniondalelibrary.org/', city: 'Uniondale', state: 'NY', zipCode: '11553', county: 'Uniondale County'},
  { name: 'Brookhaven National Laboratory', url: 'https://uptonlibrarystaff.wixsite.com/', eventsUrl: 'https://uptonlibrarystaff.wixsite.com/uptontownlibrary', city: 'Upton', state: 'NY', zipCode: '11973', county: 'Upton County'},
  { name: 'Valley Cottage Free Library', url: 'https://www.valleycottagelibrary.org/', eventsUrl: 'https://www.valleycottagelibrary.org/', city: 'Valley Cottage', state: 'NY', zipCode: '10989', county: 'Valley Cottage County'},
  { name: 'Valley Falls Free Library', url: 'https://www.valleyfallslibrary.org', eventsUrl: 'https://www.valleyfallslibrary.org/events', city: 'Valley Falls', state: 'NY', zipCode: '12185', county: 'Valley Falls County'},
  { name: 'Henry Waldinger Memorial Library', url: 'https://www.valleystreamlibrary.org', eventsUrl: 'https://www.valleystreamlibrary.org/events', city: 'Valley Stream', state: 'NY', zipCode: '11582', county: 'Valley Stream County'},
  { name: 'Vernon Public Library', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'NY', zipCode: '13476', county: 'Vernon County'},
  { name: 'Voorheesville Public Library', url: 'https://www.voorheesvillelibrary.org', eventsUrl: 'https://www.voorheesvillelibrary.org/events', city: 'Voorheesville', state: 'NY', zipCode: '12186', county: 'Voorheesville County'},
  { name: 'Hepburn Library Of Waddington', url: 'https://www.waddingtonlibrary.org', eventsUrl: 'https://www.waddingtonlibrary.org/events', city: 'Waddington', state: 'NY', zipCode: '13694', county: 'Waddington County'},
  { name: 'Walworth-Seely Public Library', url: 'https://www.walworthlibrary.org/', eventsUrl: 'https://www.walworthlibrary.org/', city: 'Walworth', state: 'NY', zipCode: '14568', county: 'Walworth County'},
  { name: 'Wantagh Public Library', url: 'https://wantaghlibrary.org/', eventsUrl: 'https://wantaghlibrary.org/', city: 'Wantagh', state: 'NY', zipCode: '11793', county: 'Wantagh County'},
  { name: 'Warsaw Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'NY', zipCode: '14569', county: 'Warsaw County'},
  { name: 'Albert Wisner Public Library', url: 'https://warwicklibrary.org/', eventsUrl: 'https://warwicklibrary.org/', city: 'Warwick', state: 'NY', zipCode: '10990', county: 'Warwick County'},
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'NY', zipCode: '12188', county: 'Waterford County'},
  { name: 'Waterloo Library And Historical Society', url: 'https://www.waterloolibrary.org', eventsUrl: 'https://www.waterloolibrary.org/events', city: 'Waterloo', state: 'NY', zipCode: '13165', county: 'Waterloo County'},
  { name: 'East Hounsfield Free Library', url: 'https://www.watertownlibrary.org/', eventsUrl: 'https://www.watertownlibrary.org/', city: 'Watertown', state: 'NY', zipCode: '13601', county: 'Watertown County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'NY', zipCode: '13480', county: 'Waterville County'},
  { name: 'Watkins Glen Cen Sch Dis Free Pub Lib', url: 'https://www.watkinsglenlibrary.org', eventsUrl: 'https://www.watkinsglenlibrary.org/events', city: 'Watkins Glen', state: 'NY', zipCode: '14891', county: 'Watkins Glen County'},
  { name: 'Waverly Free Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'NY', zipCode: '14892', county: 'Waverly County'},
  { name: 'Wayland Free Library', url: 'https://www.waylandlibrary.org', eventsUrl: 'https://www.waylandlibrary.org/events', city: 'Wayland', state: 'NY', zipCode: '14572', county: 'Wayland County'},
  { name: 'Webster Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'NY', zipCode: '14580', county: 'Webster County'},
  { name: 'Weedsport Free Library', url: 'https://www.weedsportlibrary.org/', eventsUrl: 'https://www.weedsportlibrary.org/calendar', city: 'Weedsport', state: 'NY', zipCode: '13166', county: 'Weedsport County'},
  { name: 'David A Howe Public Library', url: 'https://www.wellsvillelibrary.org', eventsUrl: 'https://www.wellsvillelibrary.org/events', city: 'Wellsville', state: 'NY', zipCode: '14895', county: 'Wellsville County'},
  { name: 'West Hurley Public Library', url: 'https://westhurleylibrary.org/', eventsUrl: 'https://westhurleylibrary.org/', city: 'West Hurley', state: 'NY', zipCode: '12491', county: 'West Hurley County'},
  { name: 'West Islip Public Library', url: 'https://westisliplibrary.org/', eventsUrl: 'https://westisliplibrary.org/', city: 'West Islip', state: 'NY', zipCode: '11795', county: 'West Islip County'},
  { name: 'West Nyack Free Library', url: 'https://www.westnyacklibrary.org/', eventsUrl: 'https://www.westnyacklibrary.org/', city: 'West Nyack', state: 'NY', zipCode: '10994', county: 'West Nyack County'},
  { name: 'West Winfield Library', url: 'https://westwinfieldlibrary.org/', eventsUrl: 'https://westwinfieldlibrary.org/calendar/', city: 'West Winfield', state: 'NY', zipCode: '13491', county: 'West Winfield County'},
  { name: 'Westbury Memorial Public Library', url: 'https://www.westburylibrary.org/', eventsUrl: 'https://www.westburylibrary.org/', city: 'Westbury', state: 'NY', zipCode: '11590', county: 'Westbury County'},
  { name: 'Town Of Westerlo Public Library', url: 'https://www.westerlolibrary.org', eventsUrl: 'https://www.westerlolibrary.org/events', city: 'Westerlo', state: 'NY', zipCode: '12193', county: 'Westerlo County'},
  { name: 'Patterson Library', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'NY', zipCode: '14787', county: 'Westfield County'},
  { name: 'Westport Library Association', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'NY', zipCode: '12993', county: 'Westport County'},
  { name: 'Dunham Public Library', url: 'https://whitesborolibrary.org/', eventsUrl: 'https://whitesborolibrary.org/', city: 'Whitesboro', state: 'NY', zipCode: '13492', county: 'Whitesboro County'},
  { name: 'Whitesville Public Library', url: 'https://www.whitesvillelibrary.org', eventsUrl: 'https://www.whitesvillelibrary.org/events', city: 'Whitesville', state: 'NY', zipCode: '14897', county: 'Whitesville County'},
  { name: 'Williamson Free Public Library', url: 'https://www.williamsonlibrary.org/', eventsUrl: 'https://www.williamsonlibrary.org/', city: 'Williamson', state: 'NY', zipCode: '14589', county: 'Williamson County'},
  { name: 'Williamstown Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'NY', zipCode: '13493', county: 'Williamstown County'},
  { name: 'Amherst Public Library Clearfield Branch', url: 'https://www.williamsvillelibrary.org/', eventsUrl: 'https://www.williamsvillelibrary.org/', city: 'Williamsville', state: 'NY', zipCode: '14221', county: 'Williamsville County'},
  { name: 'Williston Park Public Library', url: 'https://www.willistonparklibrary.org', eventsUrl: 'https://www.willistonparklibrary.org/events', city: 'Williston Park', state: 'NY', zipCode: '11596', county: 'Williston Park County'},
  { name: 'Wilmington E.M. Cooper Memorial Public Library', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'NY', zipCode: '12997', county: 'Wilmington County'},
  { name: 'Wilson Free Library', url: 'https://www.wilsonlibrary.org', eventsUrl: 'https://www.wilsonlibrary.org/events', city: 'Wilson', state: 'NY', zipCode: '14172', county: 'Wilson County'},
  { name: 'Windham Public Library', url: 'https://windhamlibrary.org/', eventsUrl: 'https://windhamlibrary.org/', city: 'Windham', state: 'NY', zipCode: '12496', county: 'Windham County'},
  { name: 'Wolcott Civic Free Library', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'NY', zipCode: '14590', county: 'Wolcott County'},
  { name: 'Woodgate Free Library', url: 'https://woodgatelibrary.org/', eventsUrl: 'https://woodgatelibrary.org/calendar/', city: 'Woodgate', state: 'NY', zipCode: '13494', county: 'Woodgate County'},
  { name: 'Queens Borough Public Library - Woodside', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Woodside', state: 'NY', zipCode: '11377', county: 'Woodside County'},
  { name: 'Worcester Free Library', url: 'https://www.worcesterlibrary.org', eventsUrl: 'https://www.worcesterlibrary.org/events', city: 'Worcester', state: 'NY', zipCode: '12197', county: 'Worcester County'},
  { name: 'Wyandanch Public Library', url: 'https://www.wyandanchlibrary.org', eventsUrl: 'https://www.wyandanchlibrary.org/events', city: 'Wyandanch', state: 'NY', zipCode: '11798', county: 'Wyandanch County'},

];

const SCRAPER_NAME = 'wordpress-NY';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
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
