const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Indiana Public Libraries Scraper - Coverage: All Indiana public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Indianapolis Public Library', url: 'https://www.indypl.org', eventsUrl: 'https://www.indypl.org/events', city: 'Indianapolis', state: 'IN', zipCode: '46204', county: 'Indianapolis County'},
  { name: 'Allen County Public Library', url: 'https://www.acpl.info', eventsUrl: 'https://www.acpl.info/events', city: 'Fort Wayne', state: 'IN', zipCode: '46802', county: 'Fort Wayne County'},
  { name: 'Evansville Vanderburgh Public Library', url: 'https://www.evpl.org', eventsUrl: 'https://www.evpl.org/events', city: 'Evansville', state: 'IN', zipCode: '47708', county: 'Evansville County'},
  // Regional Libraries
  { name: 'Hamilton East Public Library', url: 'https://www.hepl.lib.in.us', eventsUrl: 'https://www.hepl.lib.in.us/events', city: 'Noblesville', state: 'IN', zipCode: '46060', county: 'Noblesville County'},
  { name: 'Carmel Clay Public Library', url: 'https://www.carmelclaylibrary.org', eventsUrl: 'https://www.carmelclaylibrary.org/events', city: 'Carmel', state: 'IN', zipCode: '46032', county: 'Carmel County'},
  { name: 'Tippecanoe County Public Library', url: 'https://www.tcpl.lib.in.us', eventsUrl: 'https://www.tcpl.lib.in.us/events', city: 'Lafayette', state: 'IN', zipCode: '47901', county: 'Lafayette County'},
  { name: 'Muncie Public Library', url: 'https://www.munciepubliclibrary.org', eventsUrl: 'https://www.munciepubliclibrary.org/events', city: 'Muncie', state: 'IN', zipCode: '47305', county: 'Muncie County'},
  { name: 'Anderson Public Library', url: 'https://www.andersonlibrary.net', eventsUrl: 'https://www.andersonlibrary.net/events', city: 'Anderson', state: 'IN', zipCode: '46016', county: 'Anderson County'},
  { name: 'Bloomington Public Library', url: 'https://www.mcpl.info', eventsUrl: 'https://www.mcpl.info/events', city: 'Bloomington', state: 'IN', zipCode: '47404', county: 'Bloomington County'},
  { name: 'Vigo County Public Library', url: 'https://www.vigo.lib.in.us', eventsUrl: 'https://www.vigo.lib.in.us/events', city: 'Terre Haute', state: 'IN', zipCode: '47807', county: 'Terre Haute County'},
  { name: 'Elkhart Public Library', url: 'https://www.myepl.org', eventsUrl: 'https://www.myepl.org/events', city: 'Elkhart', state: 'IN', zipCode: '46516', county: 'Elkhart County'},
  { name: 'Kokomo-Howard County Public Library', url: 'https://www.khcpl.org/', eventsUrl: 'https://www.khcpl.org/', city: 'Kokomo', state: 'IN', zipCode: '46901', county: 'Kokomo County'},
  { name: 'Mishawaka-Penn-Harris Public Library', url: 'https://www.mphpl.org/', eventsUrl: 'https://www.mphpl.org/', city: 'Mishawaka', state: 'IN', zipCode: '46544', county: 'Mishawaka County'},
  { name: 'Jeffersonville Township Public Library', url: 'https://www.jefflibrary.org', eventsUrl: 'https://www.jefflibrary.org/events', city: 'Jeffersonville', state: 'IN', zipCode: '47130', county: 'Jeffersonville County'},
  { name: 'Columbus-Bartholomew County Public Library', url: 'https://www.barth.lib.in.us', eventsUrl: 'https://www.barth.lib.in.us/events', city: 'Columbus', state: 'IN', zipCode: '47201', county: 'Columbus County'},
  { name: 'Lawrence Public Library', url: 'https://www.lawrencelibrary.net', eventsUrl: 'https://www.lawrencelibrary.net/events', city: 'Lawrence', state: 'IN', zipCode: '46226', county: 'Lawrence County'},
  { name: 'Plainfield-Guilford Township Public Library', url: 'https://www.plainfieldlibrary.net/', eventsUrl: 'https://www.plainfieldlibrary.net/', city: 'Plainfield', state: 'IN', zipCode: '46168', county: 'Plainfield County'},
  { name: 'Westfield Washington Public Library', url: 'https://wwpl.lib.in.us/', eventsUrl: 'https://wwpl.lib.in.us/', city: 'Westfield', state: 'IN', zipCode: '46074', county: 'Westfield County'},
  { name: 'Greenwood Public Library', url: 'https://www.greenwoodlibrary.us', eventsUrl: 'https://www.greenwoodlibrary.us/events', city: 'Greenwood', state: 'IN', zipCode: '46142', county: 'Greenwood County'},
  { name: 'Portage Public Library', url: 'https://www.portagelibrary.info', eventsUrl: 'https://www.portagelibrary.info/events', city: 'Portage', state: 'IN', zipCode: '46368', county: 'Portage County'},
  { name: 'Crown Point Community Library', url: 'https://www.crownpointlibrary.org', eventsUrl: 'https://www.crownpointlibrary.org/events', city: 'Crown Point', state: 'IN', zipCode: '46307', county: 'Crown Point County'},
  { name: 'Lake County Public Library', url: 'https://www.lcplin.org', eventsUrl: 'https://www.lcplin.org/events', city: 'Merrillville', state: 'IN', zipCode: '46410', county: 'Merrillville County'},
  { name: 'Gary Public Library', url: 'https://www.garypubliclibrary.org', eventsUrl: 'https://www.garypubliclibrary.org/events', city: 'Gary', state: 'IN', zipCode: '46402', county: 'Gary County'},
  { name: 'Hammond Public Library', url: 'https://www.hammondpubliclibrary.org', eventsUrl: 'https://www.hammondpubliclibrary.org/events', city: 'Hammond', state: 'IN', zipCode: '46320', county: 'Hammond County'},
  { name: 'East Chicago Public Library', url: 'https://www.ecpl.org', eventsUrl: 'https://www.ecpl.org/events', city: 'East Chicago', state: 'IN', zipCode: '46312', county: 'East Chicago County'},
  { name: 'Michigan City Public Library', url: 'https://www.mclib.org', eventsUrl: 'https://www.mclib.org/events', city: 'Michigan City', state: 'IN', zipCode: '46360', county: 'Michigan City County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Akron Carnegie Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'IN', zipCode: '46910', county: 'Akron County'},
  { name: 'Noble County Public Library', url: 'https://www.albionlibrary.org/', eventsUrl: 'https://www.albionlibrary.org/', city: 'Albion', state: 'IN', zipCode: '46701', county: 'Albion County'},
  { name: 'Alexandria-Monroe Public Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'IN', zipCode: '46001', county: 'Alexandria County'},
  { name: 'Eckhart Public Library', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'IN', zipCode: '46706', county: 'Auburn County'},
  { name: 'Aurora Public Library District', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'IN', zipCode: '47001', county: 'Aurora County'},
  { name: 'Austin Branch Library', url: 'https://www.austinlibrary.org', eventsUrl: 'https://www.austinlibrary.org/events', city: 'Austin', state: 'IN', zipCode: '00000', county: 'Austin County'},
  { name: 'Avon-Washington Township Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'IN', zipCode: '46123', county: 'Avon County'},
  { name: 'Bedford Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'IN', zipCode: '47421', county: 'Bedford County'},
  { name: 'Boonville-Warrick County Public Library', url: 'https://www.boonvillelib.org/', eventsUrl: 'https://www.boonvillelib.org/', city: 'Boonville', state: 'IN', zipCode: '47601', county: 'Boonville County'},
  { name: 'Boswell-Grant Township Public Library', url: 'https://www.boswelllibrary.org', eventsUrl: 'https://www.boswelllibrary.org/events', city: 'Boswell', state: 'IN', zipCode: '47921', county: 'Boswell County'},
  { name: 'Bourbon Public Library', url: 'https://www.bourbonlibrary.org', eventsUrl: 'https://www.bourbonlibrary.org/events', city: 'Bourbon', state: 'IN', zipCode: '46504', county: 'Bourbon County'},
  { name: 'Bremen Public Library', url: 'https://www.bremenlibrary.org', eventsUrl: 'https://www.bremenlibrary.org/events', city: 'Bremen', state: 'IN', zipCode: '46506', county: 'Bremen County'},
  { name: 'Brookston-Prairie Township Public Library', url: 'https://www.brookstonlibrary.org', eventsUrl: 'https://www.brookstonlibrary.org/events', city: 'Brookston', state: 'IN', zipCode: '47923', county: 'Brookston County'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'IN', zipCode: '46721', county: 'Butler County'},
  { name: 'Camden-Jackson Township Public Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'IN', zipCode: '46917', county: 'Camden County'},
  { name: 'Carlisle Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'IN', zipCode: '00000', county: 'Carlisle County'},
  { name: 'Henry Henley Public Library', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'IN', zipCode: '46115', county: 'Carthage County'},
  { name: 'Centerville-Center Township Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'IN', zipCode: '47330', county: 'Centerville County'},
  { name: 'Chandler Branch', url: 'https://www.chandlerlibrary.org', eventsUrl: 'https://www.chandlerlibrary.org/events', city: 'Chandler', state: 'IN', zipCode: '00000', county: 'Chandler County'},
  { name: 'Thomas Library', url: 'https://www.chestertonlibrary.org', eventsUrl: 'https://www.chestertonlibrary.org/events', city: 'Chesterton', state: 'IN', zipCode: '00000', county: 'Chesterton County'},
  { name: 'Clayton-Liberty Township Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'IN', zipCode: '46118', county: 'Clayton County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'IN', zipCode: '47842', county: 'Clinton County'},
  { name: 'Coatesville-Clay Township Public Library', url: 'https://www.coatesvillelibrary.org', eventsUrl: 'https://www.coatesvillelibrary.org/events', city: 'Coatesville', state: 'IN', zipCode: '46121', county: 'Coatesville County'},
  { name: 'Danville-Center Township Public Library', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'IN', zipCode: '46122', county: 'Danville County'},
  { name: 'Adams Public Library System', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'IN', zipCode: '46733', county: 'Decatur County'},
  { name: 'Delphi Public Library', url: 'https://www.delphilibrary.org/', eventsUrl: 'https://www.delphilibrary.org/', city: 'Delphi', state: 'IN', zipCode: '46923', county: 'Delphi County'},
  { name: 'Dublin Public Library', url: 'https://www.dublinlibrary.org/', eventsUrl: 'https://www.dublinlibrary.org/', city: 'Dublin', state: 'IN', zipCode: '47335', county: 'Dublin County'},
  { name: 'Dunkirk Public Library', url: 'https://dunkirklibrary.org/', eventsUrl: 'https://dunkirklibrary.org/', city: 'Dunkirk', state: 'IN', zipCode: '47336', county: 'Dunkirk County'},
  { name: 'Elwood Public Library', url: 'https://www.elwoodlibrary.org', eventsUrl: 'https://www.elwoodlibrary.org/events', city: 'Elwood', state: 'IN', zipCode: '00000', county: 'Elwood County'},
  { name: 'Crawford County Public Library', url: 'https://www.englishlibrary.org', eventsUrl: 'https://www.englishlibrary.org/events', city: 'English', state: 'IN', zipCode: '47118', county: 'English County'},
  { name: 'Fairmount Public Library', url: 'https://fairmountlibrary.org/', eventsUrl: 'https://fairmountlibrary.org/', city: 'Fairmount', state: 'IN', zipCode: '46928', county: 'Fairmount County'},
  { name: 'Frankfort-Clinton County Contractual Public Library', url: 'https://www.frankfortlibrary.org/', eventsUrl: 'https://www.frankfortlibrary.org/', city: 'Frankfort', state: 'IN', zipCode: '46041', county: 'Frankfort County'},
  { name: 'Johnson County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'IN', zipCode: '46131', county: 'Franklin County'},
  { name: 'Fremont Public Library', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'IN', zipCode: '46737', county: 'Fremont County'},
  { name: 'Goodland Grant Township Public Library', url: 'https://www.goodlandlibrary.org', eventsUrl: 'https://www.goodlandlibrary.org/events', city: 'Goodland', state: 'IN', zipCode: '47948', county: 'Goodland County'},
  { name: 'Goshen Public Library', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'IN', zipCode: '46526', county: 'Goshen County'},
  { name: 'Grandview Branch', url: 'https://www.grandviewlibrary.org/', eventsUrl: 'https://www.grandviewlibrary.org/', city: 'Grandview', state: 'IN', zipCode: '00000', county: 'Grandview County'},
  { name: 'Hancock County Public Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'IN', zipCode: '46140', county: 'Greenfield County'},
  { name: 'Greensburg-Decatur County Contractual Public Library', url: 'https://www.greensburglibrary.org', eventsUrl: 'https://www.greensburglibrary.org/events', city: 'Greensburg', state: 'IN', zipCode: '47240', county: 'Greensburg County'},
  { name: 'Hagerstown-Jefferson Township Public Library', url: 'https://hagerstownlibrary.org/', eventsUrl: 'https://hagerstownlibrary.org/calendar/', city: 'Hagerstown', state: 'IN', zipCode: '47346', county: 'Hagerstown County'},
  { name: 'Harlan Branch', url: 'https://www.harlan.lib.ia.us/', eventsUrl: 'https://www.harlan.lib.ia.us/events', city: 'Harlan', state: 'IN', zipCode: '00000', county: 'Harlan County'},
  { name: 'Hebron Library', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'IN', zipCode: '00000', county: 'Hebron County'},
  { name: 'Highland Branch', url: 'https://highlandlibrary.org/', eventsUrl: 'https://highlandlibrary.org/', city: 'Highland', state: 'IN', zipCode: '00000', county: 'Highland County'},
  { name: 'Hillsdale Branch Library', url: 'https://www.cityofsanmateo.org/', eventsUrl: 'https://www.cityofsanmateo.org/507/Library', city: 'Hillsdale', state: 'IN', zipCode: '00000', county: 'Hillsdale County'},
  { name: 'Hope Branch Library', url: 'https://www.hopelibrary.org', eventsUrl: 'https://www.hopelibrary.org/events', city: 'Hope', state: 'IN', zipCode: '00000', county: 'Hope County'},
  { name: 'Huntingburg Public Library', url: 'https://huntingburglibrary.org/', eventsUrl: 'https://huntingburglibrary.org/calendar/', city: 'Huntingburg', state: 'IN', zipCode: '47542', county: 'Huntingburg County'},
  { name: 'Huntington City-Township Public Library', url: 'https://www.huntingtonlibrary.org', eventsUrl: 'https://www.huntingtonlibrary.org/events', city: 'Huntington', state: 'IN', zipCode: '46750', county: 'Huntington County'},
  { name: 'Kendallville Public Library', url: 'https://www.kendallvillelibrary.org', eventsUrl: 'https://www.kendallvillelibrary.org/events', city: 'Kendallville', state: 'IN', zipCode: '46755', county: 'Kendallville County'},
  { name: 'Kingman-Millcreek Public Library', url: 'https://www.kingmanlibrary.org', eventsUrl: 'https://www.kingmanlibrary.org/events', city: 'Kingman', state: 'IN', zipCode: '47952', county: 'Kingman County'},
  { name: 'Henry F. Schricker Main Library', url: 'https://www.knoxlibrary.org', eventsUrl: 'https://www.knoxlibrary.org/events', city: 'Knox', state: 'IN', zipCode: '00000', county: 'Knox County'},
  { name: 'La Crosse Public Library', url: 'https://www.lacrosselibrary.org', eventsUrl: 'https://www.lacrosselibrary.org/events', city: 'La Crosse', state: 'IN', zipCode: '46348', county: 'La Crosse County'},
  { name: 'La Porte County Public Library', url: 'https://www.laportelibrary.org', eventsUrl: 'https://www.laportelibrary.org/events', city: 'La Porte', state: 'IN', zipCode: '46350', county: 'La Porte County'},
  { name: 'La Grange County Public Library', url: 'https://lagrangelibrary.org/', eventsUrl: 'https://lagrangelibrary.org/', city: 'Lagrange', state: 'IN', zipCode: '46761', county: 'Lagrange County'},
  { name: 'Lakeville Branch', url: 'https://lakevillelibrary.org/', eventsUrl: 'https://lakevillelibrary.org/', city: 'Lakeville', state: 'IN', zipCode: '00000', county: 'Lakeville County'},
  { name: 'Laurel Community Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'Laurel', state: 'IN', zipCode: '00000', county: 'Laurel County'},
  { name: 'Lebanon Public Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'IN', zipCode: '46052', county: 'Lebanon County'},
  { name: 'Union County Public Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'IN', zipCode: '47353', county: 'Liberty County'},
  { name: 'Ligonier Public Library', url: 'https://www.ligonierlibrary.org', eventsUrl: 'https://www.ligonierlibrary.org/events', city: 'Ligonier', state: 'IN', zipCode: '46767', county: 'Ligonier County'},
  { name: 'Lowell Public Library', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'IN', zipCode: '46356', county: 'Lowell County'},
  { name: 'Madison-Jefferson County Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'IN', zipCode: '47250', county: 'Madison County'},
  { name: 'Marion Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'IN', zipCode: '46953', county: 'Marion County'},
  { name: 'Matthews Public Library', url: 'https://www.matthewslibrary.org', eventsUrl: 'https://www.matthewslibrary.org/events', city: 'Matthews', state: 'IN', zipCode: '46957', county: 'Matthews County'},
  { name: 'Middlebury Community Public Library', url: 'https://www.middleburylibrary.org', eventsUrl: 'https://www.middleburylibrary.org/events', city: 'Middlebury', state: 'IN', zipCode: '46540', county: 'Middlebury County'},
  { name: 'Middletown Fall Creek Township Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'IN', zipCode: '47356', county: 'Middletown County'},
  { name: 'Milan Public Library', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'IN', zipCode: '00000', county: 'Milan County'},
  { name: 'Milford Public Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'IN', zipCode: '46542', county: 'Milford County'},
  { name: 'Mitchell Community Public Library', url: 'https://www.mitchelllibrary.org/', eventsUrl: 'https://www.mitchelllibrary.org/virtualmitchell/', city: 'Mitchell', state: 'IN', zipCode: '47446', county: 'Mitchell County'},
  { name: 'Monroeville Branch', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'IN', zipCode: '00000', county: 'Monroeville County'},
  { name: 'Monrovia Branch', url: 'https://www.monrovialibrary.org', eventsUrl: 'https://www.monrovialibrary.org/events', city: 'Monrovia', state: 'IN', zipCode: '00000', county: 'Monrovia County'},
  { name: 'Monterey-Tippecanoe Township Public Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'IN', zipCode: '46960', county: 'Monterey County'},
  { name: 'Monticello-Union Township Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'IN', zipCode: '47960', county: 'Monticello County'},
  { name: 'Montpelier-Harrison Township Public Library', url: 'https://www.montpelierlibrary.org', eventsUrl: 'https://www.montpelierlibrary.org/events', city: 'Montpelier', state: 'IN', zipCode: '47359', county: 'Montpelier County'},
  { name: 'Mooresville Public Library', url: 'https://www.mooresvillelibrary.org/', eventsUrl: 'https://www.mooresvillelibrary.org/', city: 'Mooresville', state: 'IN', zipCode: '46158', county: 'Mooresville County'},
  { name: 'Nappanee Public Library', url: 'https://www.nappaneelibrary.org/', eventsUrl: 'https://www.nappaneelibrary.org/', city: 'Nappanee', state: 'IN', zipCode: '46550', county: 'Nappanee County'},
  { name: 'New Carlisle Olive Township Public Library', url: 'https://www.newcarlislelibrary.org', eventsUrl: 'https://www.newcarlislelibrary.org/events', city: 'New Carlisle', state: 'IN', zipCode: '46552', county: 'New Carlisle County'},
  { name: 'Central Library', url: 'https://newburghlibrary.org/', eventsUrl: 'https://newburghlibrary.org/', city: 'Newburgh', state: 'IN', zipCode: '47629', county: 'Newburgh County'},
  { name: 'Newport-Vermillion County Public Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'IN', zipCode: '00000', county: 'Newport County'},
  { name: 'North Liberty Branch', url: 'https://www.northlibertylibrary.org', eventsUrl: 'https://www.northlibertylibrary.org/events', city: 'North Liberty', state: 'IN', zipCode: '00000', county: 'North Liberty County'},
  { name: 'Osgood Public Library', url: 'https://www.osgoodlibrary.org', eventsUrl: 'https://www.osgoodlibrary.org/events', city: 'Osgood', state: 'IN', zipCode: '47037', county: 'Osgood County'},
  { name: 'Owensville Carnegie Public Library', url: 'https://owensville.evergreenindiana.org/', eventsUrl: 'https://owensville.evergreenindiana.org/calendar', city: 'Owensville', state: 'IN', zipCode: '47665', county: 'Owensville County'},
  { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'IN', zipCode: '47971', county: 'Oxford County'},
  { name: 'Peru Public Library', url: 'https://www.perulibrary.org', eventsUrl: 'https://www.perulibrary.org/events', city: 'Peru', state: 'IN', zipCode: '46970', county: 'Peru County'},
  { name: 'Plainville Branch Library', url: 'https://www.plainvillelibrary.org', eventsUrl: 'https://www.plainvillelibrary.org/events', city: 'Plainville', state: 'IN', zipCode: '00000', county: 'Plainville County'},
  { name: 'Plymouth Public Library', url: 'https://plymouthlibrary.org/', eventsUrl: 'https://plymouthlibrary.org/', city: 'Plymouth', state: 'IN', zipCode: '46563', county: 'Plymouth County'},
  { name: 'Hageman Memorial Library', url: 'https://www.porterlibrary.org/', eventsUrl: 'https://www.porterlibrary.org/upcoming-events', city: 'Porter', state: 'IN', zipCode: '00000', county: 'Porter County'},
  { name: 'Jay County Public Library', url: 'https://www.portlandlibrary.org', eventsUrl: 'https://www.portlandlibrary.org/events', city: 'Portland', state: 'IN', zipCode: '47371', county: 'Portland County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'IN', zipCode: '47670', county: 'Princeton County'},
  { name: 'Jasper County Public Library', url: 'https://www.rensselaerlibrary.org', eventsUrl: 'https://www.rensselaerlibrary.org/events', city: 'Rensselaer', state: 'IN', zipCode: '47978', county: 'Rensselaer County'},
  { name: 'Marylee Vogel', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'IN', zipCode: '00000', county: 'Richland County'},
  { name: 'Fulton County Public Library', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'IN', zipCode: '46975', county: 'Rochester County'},
  { name: 'Spencer County Public Library', url: 'https://www.rockportlibrary.org', eventsUrl: 'https://www.rockportlibrary.org/events', city: 'Rockport', state: 'IN', zipCode: '47635', county: 'Rockport County'},
  { name: 'Rossville Community Library', url: 'https://www.rossvillelibrary.org', eventsUrl: 'https://www.rossvillelibrary.org/events', city: 'Rossville', state: 'IN', zipCode: '00000', county: 'Rossville County'},
  { name: 'Salem-Washington Township Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'IN', zipCode: '47167', county: 'Salem County'},
  { name: 'Jackson County Public Library', url: 'https://www.seymourlibrary.org', eventsUrl: 'https://www.seymourlibrary.org/events', city: 'Seymour', state: 'IN', zipCode: '47274', county: 'Seymour County'},
  { name: 'Shelby Branch', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'IN', zipCode: '00000', county: 'Shelby County'},
  { name: 'Genealogy And History Room', url: 'https://www.shelbyvillelibrary.org/', eventsUrl: 'https://www.shelbyvillelibrary.org/', city: 'Shelbyville', state: 'IN', zipCode: '00000', county: 'Shelbyville County'},
  { name: 'St. John Branch', url: 'https://www.stjohnlibrary.org', eventsUrl: 'https://www.stjohnlibrary.org/events', city: 'St. John', state: 'IN', zipCode: '00000', county: 'St. John County'},
  { name: 'Sullivan County Public Library', url: 'https://www.sullivanil.us/', eventsUrl: 'https://www.sullivanil.us/departments/library/index.php', city: 'Sullivan', state: 'IN', zipCode: '47882', county: 'Sullivan County'},
  { name: 'Syracuse-Turkey Creek Township Public Library', url: 'https://www.syracuselibrary.org/', eventsUrl: 'https://www.syracuselibrary.org/', city: 'Syracuse', state: 'IN', zipCode: '46567', county: 'Syracuse County'},
  { name: 'Van Buren Public Library', url: 'https://www.vbdl.org/', eventsUrl: 'https://www.vbdl.org/events/', city: 'Van Buren', state: 'IN', zipCode: '46991', county: 'Van Buren County'},
  { name: 'Knox County Public Library', url: 'https://www.vincenneslibrary.org', eventsUrl: 'https://www.vincenneslibrary.org/events', city: 'Vincennes', state: 'IN', zipCode: '47591', county: 'Vincennes County'},
  { name: 'Warren Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'IN', zipCode: '46792', county: 'Warren County'},
  { name: 'Warsaw Community Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'IN', zipCode: '46580', county: 'Warsaw County'},
  { name: 'Waterloo-Grant Township Public Library', url: 'https://www.waterloolibrary.org', eventsUrl: 'https://www.waterloolibrary.org/events', city: 'Waterloo', state: 'IN', zipCode: '46793', county: 'Waterloo County'},
  { name: 'Westport Branch Library', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'IN', zipCode: '00000', county: 'Westport County'},
  { name: 'Whiting Public Library', url: 'https://www.whitinglibrary.org', eventsUrl: 'https://www.whitinglibrary.org/events', city: 'Whiting', state: 'IN', zipCode: '46394', county: 'Whiting County'},
  { name: 'Winchester Community Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'IN', zipCode: '47394', county: 'Winchester County'},
  { name: 'Wolcott Community Public Library', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'IN', zipCode: '47995', county: 'Wolcott County'},
  { name: 'Yorktown-M. Pleasant Township Public Library', url: 'https://yorktownlibrary.org/', eventsUrl: 'https://yorktownlibrary.org/', city: 'Yorktown', state: 'IN', zipCode: '47396', county: 'Yorktown County'},
  { name: 'Hussey-Mayfield Memorial Public Library', url: 'https://www.zionsvillelibrary.org', eventsUrl: 'https://www.zionsvillelibrary.org/events', city: 'Zionsville', state: 'IN', zipCode: '46077', county: 'Zionsville County'}

];

const SCRAPER_NAME = 'wordpress-IN';

async function scrapeGenericEvents() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'IN', city: library.city, zipCode: library.zipCode }}));
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
    state: 'IN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressINCloudFunction() {
  console.log('☁️ Running WordPress IN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-IN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-IN', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressINCloudFunction };
