const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Tennessee Public Libraries Scraper
 * State: TN
 * Coverage: All Tennessee Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Nashville Public Library', url: 'https://library.nashville.org', eventsUrl: 'https://library.nashville.org/events', city: 'Nashville', state: 'TN', zipCode: '37203', county: 'Nashville County'},
  { name: 'Memphis Public Libraries', url: 'https://www.memphislibrary.org', eventsUrl: 'https://www.memphislibrary.org/events', city: 'Memphis', state: 'TN', zipCode: '38103', county: 'Memphis County'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlib.org', eventsUrl: 'https://www.knoxlib.org/events', city: 'Knoxville', state: 'TN', zipCode: '37902', county: 'Knoxville County'},
  { name: 'Chattanooga Public Library', url: 'https://chattlibrary.org', eventsUrl: 'https://chattlibrary.org/events', city: 'Chattanooga', state: 'TN', zipCode: '37402', county: 'Chattanooga County'},
  // Regional Libraries
  { name: 'Clarksville-Montgomery County Public Library', url: 'https://mcgtn.org/library', eventsUrl: 'https://mcgtn.org/library/events', city: 'Clarksville', state: 'TN', zipCode: '37040', county: 'Clarksville County'},
  { name: 'Murfreesboro City Library', url: 'https://www.murfreesborolibrary.org', eventsUrl: 'https://www.murfreesborolibrary.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Murfreesboro County'},
  { name: 'Jackson-Madison County Library', url: 'https://www.jmcl.tn.org', eventsUrl: 'https://www.jmcl.tn.org/events', city: 'Jackson', state: 'TN', zipCode: '38301', county: 'Jackson County'},
  { name: 'Johnson City Public Library', url: 'https://www.jcpl.org', eventsUrl: 'https://www.jcpl.org/events', city: 'Johnson City', state: 'TN', zipCode: '37601', county: 'Johnson City County'},
  { name: 'Kingsport Public Library', url: 'https://www.kingsportlibrary.org', eventsUrl: 'https://www.kingsportlibrary.org/events', city: 'Kingsport', state: 'TN', zipCode: '37660', county: 'Kingsport County'},
  { name: 'Franklin Public Library', url: 'https://www.franklintn.gov/library', eventsUrl: 'https://www.franklintn.gov/library/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'},
  { name: 'Williamson County Public Library', url: 'https://www.wcpltn.org', eventsUrl: 'https://www.wcpltn.org/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'},
  { name: 'Sumner County Library', url: 'https://www.sumnercountylibrary.org', eventsUrl: 'https://www.sumnercountylibrary.org/events', city: 'Gallatin', state: 'TN', zipCode: '37066' },
  { name: 'Rutherford County Library System', url: 'https://www.rcls.org', eventsUrl: 'https://www.rcls.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Murfreesboro County'},
  { name: 'Blount County Public Library', url: 'https://www.blountlibrary.org', eventsUrl: 'https://www.blountlibrary.org/events', city: 'Maryville', state: 'TN', zipCode: '37801', county: 'Maryville County'},
  { name: 'Cleveland-Bradley County Public Library', url: 'https://www.clevelandlibrary.org', eventsUrl: 'https://www.clevelandlibrary.org/events', city: 'Cleveland', state: 'TN', zipCode: '37311', county: 'Cleveland County'},
  { name: 'Oak Ridge Public Library', url: 'https://www.oakridgelibrary.org', eventsUrl: 'https://www.oakridgelibrary.org/events', city: 'Oak Ridge', state: 'TN', zipCode: '37830', county: 'Oak Ridge County'},
  { name: 'Bristol Public Library', url: 'https://www.bristoltnlibrary.org', eventsUrl: 'https://www.bristoltnlibrary.org/events', city: 'Bristol', state: 'TN', zipCode: '37620', county: 'Bristol County'},
  { name: 'Germantown Community Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'TN', zipCode: '38138', county: 'Germantown County'},
  { name: 'Collierville Burch Library', url: 'https://www.colliervillelibrary.org', eventsUrl: 'https://www.colliervillelibrary.org/events', city: 'Collierville', state: 'TN', zipCode: '38017', county: 'Collierville County'},
  { name: 'Bartlett Library', url: 'https://www.cityofbartlett.org/library', eventsUrl: 'https://www.cityofbartlett.org/library/events', city: 'Bartlett', state: 'TN', zipCode: '38134', county: 'Bartlett County'},
  { name: 'Hendersonville Public Library', url: 'https://www.hendersonvillelibrary.org', eventsUrl: 'https://www.hendersonvillelibrary.org/events', city: 'Hendersonville', state: 'TN', zipCode: '37075', county: 'Hendersonville County'},
  { name: 'Morristown-Hamblen Library', url: 'https://www.mhlibrary.org', eventsUrl: 'https://www.mhlibrary.org/events', city: 'Morristown', state: 'TN', zipCode: '37814', county: 'Morristown County'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'TN', zipCode: '37167', county: 'Smyrna County'},
  { name: 'Columbia Public Library', url: 'https://www.youseemore.com/columbia', eventsUrl: 'https://www.youseemore.com/columbia/events', city: 'Columbia', state: 'TN', zipCode: '38401', county: 'Columbia County'},
  { name: 'La Vergne Public Library', url: 'https://www.lavergnelibrary.org', eventsUrl: 'https://www.lavergnelibrary.org/events', city: 'La Vergne', state: 'TN', zipCode: '37086', county: 'La Vergne County'},
  { name: 'Cookeville-Putnam County Library', url: 'https://www.cookevillelibrary.org', eventsUrl: 'https://www.cookevillelibrary.org/events', city: 'Cookeville', state: 'TN', zipCode: '38501', county: 'Cookeville County'},
  { name: 'Shelbyville-Bedford County Public Library', url: 'https://www.sbcpl.org', eventsUrl: 'https://www.sbcpl.org/events', city: 'Shelbyville', state: 'TN', zipCode: '37160', county: 'Shelbyville County'},
  { name: 'Sevier County Public Library System', url: 'https://www.sevierlibrary.org', eventsUrl: 'https://www.sevierlibrary.org/events', city: 'Sevierville', state: 'TN', zipCode: '37862', county: 'Sevierville County'},
  { name: 'Greeneville-Greene County Public Library', url: 'https://www.greenevillelibrary.org', eventsUrl: 'https://www.greenevillelibrary.org/events', city: 'Greeneville', state: 'TN', zipCode: '37743', county: 'Greeneville County'},
  { name: 'Dyersburg-Dyer County Public Library', url: 'https://www.dyersburglibrary.org', eventsUrl: 'https://www.dyersburglibrary.org/events', city: 'Dyersburg', state: 'TN', zipCode: '38024', county: 'Dyersburg County'},
  { name: 'Tullahoma Public Library', url: 'https://www.tullahoma-tn.com/library', eventsUrl: 'https://www.tullahoma-tn.com/library/events', city: 'Tullahoma', state: 'TN', zipCode: '37388', county: 'Tullahoma County'},
  { name: 'Lebanon Wilson County Library', url: 'https://www.lwcl.org', eventsUrl: 'https://www.lwcl.org/events', city: 'Lebanon', state: 'TN', zipCode: '37087', county: 'Lebanon County'},
  { name: 'Springfield-Robertson County Public Library', url: 'https://www.springfieldtnlibrary.org', eventsUrl: 'https://www.springfieldtnlibrary.org/events', city: 'Springfield', state: 'TN', zipCode: '37172', county: 'Springfield County'},
  { name: 'Dickson County Public Library', url: 'https://www.dicksoncountylibrary.org', eventsUrl: 'https://www.dicksoncountylibrary.org/events', city: 'Dickson', state: 'TN', zipCode: '37055' },
  { name: 'McMinn County Public Library', url: 'https://www.mcminnlib.org', eventsUrl: 'https://www.mcminnlib.org/events', city: 'Athens', state: 'TN', zipCode: '37303', county: 'Athens County'},
  { name: 'Maury County Public Library', url: 'https://www.maurylibrary.org', eventsUrl: 'https://www.maurylibrary.org/events', city: 'Columbia', state: 'TN', zipCode: '38401', county: 'Columbia County'},
  { name: 'Elizabethton-Carter County Public Library', url: 'https://www.elizabethtonlibrary.org', eventsUrl: 'https://www.elizabethtonlibrary.org/events', city: 'Elizabethton', state: 'TN', zipCode: '37643', county: 'Elizabethton County'},
  { name: 'Athens Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'TN', zipCode: '37303', county: 'Athens County'},
  { name: 'Lawrenceburg Public Library', url: 'https://www.lawrencelibrary.org', eventsUrl: 'https://www.lawrencelibrary.org/events', city: 'Lawrenceburg', state: 'TN', zipCode: '38464', county: 'Lawrenceburg County'},
  { name: 'Martin-Weakley County Public Library', url: 'https://www.weakleycountylibrary.org', eventsUrl: 'https://www.weakleycountylibrary.org/events', city: 'Martin', state: 'TN', zipCode: '38237' },
  { name: 'Union City Public Library', url: 'https://www.unioncitylibrary.org', eventsUrl: 'https://www.unioncitylibrary.org/events', city: 'Union City', state: 'TN', zipCode: '38261', county: 'Union City County'},
  { name: 'Paris-Henry County Library', url: 'https://www.parishenrylibrary.org', eventsUrl: 'https://www.parishenrylibrary.org/events', city: 'Paris', state: 'TN', zipCode: '38242', county: 'Paris County'},
  { name: 'Crossville-Cumberland County Public Library', url: 'https://www.cumberlandcountylibrary.org', eventsUrl: 'https://www.cumberlandcountylibrary.org/events', city: 'Crossville', state: 'TN', zipCode: '38555' },
  { name: 'Manchester Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'TN', zipCode: '37355', county: 'Manchester County'},
  { name: 'Rogersville Public Library', url: 'https://www.rogersvillelibrary.org', eventsUrl: 'https://www.rogersvillelibrary.org/events', city: 'Rogersville', state: 'TN', zipCode: '37857', county: 'Rogersville County'},
  { name: 'Fayetteville-Lincoln County Public Library', url: 'https://www.faylinclib.org', eventsUrl: 'https://www.faylinclib.org/events', city: 'Fayetteville', state: 'TN', zipCode: '37334', county: 'Fayetteville County'},
  { name: 'Loudon County Public Library', url: 'https://www.loudoncountylibrary.org', eventsUrl: 'https://www.loudoncountylibrary.org/events', city: 'Loudon', state: 'TN', zipCode: '37774' },
  { name: 'Newport Plain Talk Memorial Library', url: 'https://www.cockelibrary.org', eventsUrl: 'https://www.cockelibrary.org/events', city: 'Newport', state: 'TN', zipCode: '37821', county: 'Newport County'},
  { name: 'Henderson County Library', url: 'https://www.hendersoncountylibrary.org', eventsUrl: 'https://www.hendersoncountylibrary.org/events', city: 'Lexington', state: 'TN', zipCode: '38351' },
  { name: 'Tipton County Public Library', url: 'https://www.tiptoncountylibrary.org', eventsUrl: 'https://www.tiptoncountylibrary.org/events', city: 'Covington', state: 'TN', zipCode: '38019' },
  { name: 'Humboldt Public Library', url: 'https://www.humboldtlibrary.org', eventsUrl: 'https://www.humboldtlibrary.org/events', city: 'Humboldt', state: 'TN', zipCode: '38343', county: 'Humboldt County'},
  { name: 'McMinnville-Warren County Library', url: 'https://www.warrencountylibrary.org', eventsUrl: 'https://www.warrencountylibrary.org/events', city: 'McMinnville', state: 'TN', zipCode: '37110' },
  { name: 'Mount Pleasant Public Library', url: 'https://www.mtpleasantlibrary.org', eventsUrl: 'https://www.mtpleasantlibrary.org/events', city: 'Mount Pleasant', state: 'TN', zipCode: '38474', county: 'Mount Pleasant County'},
  { name: 'Savannah-Hardin County Library', url: 'https://www.hardincountylibrary.org', eventsUrl: 'https://www.hardincountylibrary.org/events', city: 'Savannah', state: 'TN', zipCode: '38372' },
  { name: 'Selmer-McNairy County Library', url: 'https://www.mcnairycountylibrary.org', eventsUrl: 'https://www.mcnairycountylibrary.org/events', city: 'Selmer', state: 'TN', zipCode: '38375' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Irving Meek Jr., Public Library', url: 'https://www.adamsvillelibrary.org', eventsUrl: 'https://www.adamsvillelibrary.org/events', city: 'Adamsville', state: 'TN', zipCode: '38310', county: 'Adamsville County'},
  { name: 'Crockett County Library', url: 'https://www.alamolibrary.org', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'TN', zipCode: '38001', county: 'Alamo County'},
  { name: 'Alexandria Branch Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'TN', zipCode: '00000', county: 'Alexandria County'},
  { name: 'Algood Branch Library', url: 'https://www.algoodlibrary.org', eventsUrl: 'https://www.algoodlibrary.org/events', city: 'Algood', state: 'TN', zipCode: '00000', county: 'Algood County'},
  { name: 'Altamont Public Library', url: 'https://www.altamontlibrary.org', eventsUrl: 'https://www.altamontlibrary.org/events', city: 'Altamont', state: 'TN', zipCode: '37305', county: 'Altamont County'},
  { name: 'Southeast Branch Library', url: 'https://www.antiochlibrary.org', eventsUrl: 'https://www.antiochlibrary.org/events', city: 'Antioch', state: 'TN', zipCode: '00000', county: 'Antioch County'},
  { name: 'Ardmore Public Library', url: 'https://www.ardmorelibrary.org', eventsUrl: 'https://www.ardmorelibrary.org/events', city: 'Ardmore', state: 'TN', zipCode: '38449', county: 'Ardmore County'},
  { name: 'Sam T. Wilson Public Library', url: 'https://www.arlingtonlibrary.org', eventsUrl: 'https://www.arlingtonlibrary.org/events', city: 'Arlington', state: 'TN', zipCode: '38002', county: 'Arlington County'},
  { name: 'Cheatham County Public Library', url: 'https://www.ashlandcitylibrary.org', eventsUrl: 'https://www.ashlandcitylibrary.org/events', city: 'Ashland City', state: 'TN', zipCode: '37015', county: 'Ashland City County'},
  { name: 'Auburntown Public Library', url: 'https://www.auburntownlibrary.org', eventsUrl: 'https://www.auburntownlibrary.org/events', city: 'Auburntown', state: 'TN', zipCode: '00000', county: 'Auburntown County'},
  { name: 'Baxter Branch Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Baxter', state: 'TN', zipCode: '00000', county: 'Baxter County'},
  { name: 'Bean Station Public Library', url: 'https://www.beanstationlibrary.org', eventsUrl: 'https://www.beanstationlibrary.org/events', city: 'Bean Station', state: 'TN', zipCode: '37708', county: 'Bean Station County'},
  { name: 'Beersheba Springs Public Library', url: 'https://www.beershebaspringslibrary.org', eventsUrl: 'https://www.beershebaspringslibrary.org/events', city: 'Beersheba Springs', state: 'TN', zipCode: '37305', county: 'Beersheba Springs County'},
  { name: 'Benton Public Library', url: 'https://www.bentonlibrary.org', eventsUrl: 'https://www.bentonlibrary.org/events', city: 'Benton', state: 'TN', zipCode: '37307', county: 'Benton County'},
  { name: 'Big Sandy Branch Library', url: 'https://www.bigsandylibrary.org', eventsUrl: 'https://www.bigsandylibrary.org/events', city: 'Big Sandy', state: 'TN', zipCode: '00000', county: 'Big Sandy County'},
  { name: 'Blaine Public Library', url: 'https://www.blainelibrary.org', eventsUrl: 'https://www.blainelibrary.org/events', city: 'Blaine', state: 'TN', zipCode: '37709', county: 'Blaine County'},
  { name: 'Sullivan County Public Library', url: 'https://www.blountvillelibrary.org', eventsUrl: 'https://www.blountvillelibrary.org/events', city: 'Blountville', state: 'TN', zipCode: '37617', county: 'Blountville County'},
  { name: 'Thomas Memorial Branch Library', url: 'https://www.bluffcitylibrary.org', eventsUrl: 'https://www.bluffcitylibrary.org/events', city: 'Bluff City', state: 'TN', zipCode: '00000', county: 'Bluff City County'},
  { name: 'Bolivar Hardeman County Library', url: 'https://www.bolivarlibrary.org', eventsUrl: 'https://www.bolivarlibrary.org/events', city: 'Bolivar', state: 'TN', zipCode: '38008', county: 'Bolivar County'},
  { name: 'The Brentwood Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'TN', zipCode: '37027', county: 'Brentwood County'},
  { name: 'Briceville Public Library', url: 'https://www.bricevillelibrary.org', eventsUrl: 'https://www.bricevillelibrary.org/events', city: 'Briceville', state: 'TN', zipCode: '37710', county: 'Briceville County'},
  { name: 'Elma Ross Public Library', url: 'https://www.brownsvillelibrary.org', eventsUrl: 'https://www.brownsvillelibrary.org/events', city: 'Brownsville', state: 'TN', zipCode: '38012', county: 'Brownsville County'},
  { name: 'St. Clair Library', url: 'https://www.bullsgapstclairlibrary.org', eventsUrl: 'https://www.bullsgapstclairlibrary.org/events', city: 'Bulls Gap-St. Clair', state: 'TN', zipCode: '00000', county: 'Bulls Gap-St. Clair County'},
  { name: 'Pickett County Library', url: 'https://www.byrdstownlibrary.org', eventsUrl: 'https://www.byrdstownlibrary.org/events', city: 'Byrdstown', state: 'TN', zipCode: '38549', county: 'Byrdstown County'},
  { name: 'Calhoun Public Library', url: 'https://www.calhounlibrary.org', eventsUrl: 'https://www.calhounlibrary.org/events', city: 'Calhoun', state: 'TN', zipCode: '37309', county: 'Calhoun County'},
  { name: 'Benton County Library', url: 'https://www.camdenlibrary.org', eventsUrl: 'https://www.camdenlibrary.org/events', city: 'Camden', state: 'TN', zipCode: '38320', county: 'Camden County'},
  { name: 'Smith County Public Library', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'TN', zipCode: '37030', county: 'Carthage County'},
  { name: 'Caryville Public Library', url: 'https://www.caryvillelibrary.org', eventsUrl: 'https://www.caryvillelibrary.org/events', city: 'Caryville', state: 'TN', zipCode: '37714', county: 'Caryville County'},
  { name: 'Clay County Public Library', url: 'https://www.celinalibrary.org', eventsUrl: 'https://www.celinalibrary.org/events', city: 'Celina', state: 'TN', zipCode: '38551', county: 'Celina County'},
  { name: 'Hickman County Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'TN', zipCode: '37033', county: 'Centerville County'},
  { name: 'Church Hillbranch Library', url: 'https://www.churchhilllibrary.org', eventsUrl: 'https://www.churchhilllibrary.org/events', city: 'Church Hill', state: 'TN', zipCode: '00000', county: 'Church Hill County'},
  { name: 'Clifton Branch Library', url: 'https://www.cliftonlibrary.org', eventsUrl: 'https://www.cliftonlibrary.org/events', city: 'Clifton', state: 'TN', zipCode: '00000', county: 'Clifton County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'TN', zipCode: '37716', county: 'Clinton County'},
  { name: 'Coalfield Public Library', url: 'https://www.coalfieldlibrary.org', eventsUrl: 'https://www.coalfieldlibrary.org/events', city: 'Coalfield', state: 'TN', zipCode: '37719', county: 'Coalfield County'},
  { name: 'Coalmont Public Library', url: 'https://www.coalmontlibrary.org', eventsUrl: 'https://www.coalmontlibrary.org/events', city: 'Coalmont', state: 'TN', zipCode: '37313', county: 'Coalmont County'},
  { name: 'Collinwood Depot Branch Library', url: 'https://www.collinwoodlibrary.org', eventsUrl: 'https://www.collinwoodlibrary.org/events', city: 'Collinwood', state: 'TN', zipCode: '00000', county: 'Collinwood County'},
  { name: 'Copperhill Public Library', url: 'https://www.copperhilllibrary.org', eventsUrl: 'https://www.copperhilllibrary.org/events', city: 'Copperhill', state: 'TN', zipCode: '37317', county: 'Copperhill County'},
  { name: 'Cordova Branch Library', url: 'https://www.cordovalibrary.org', eventsUrl: 'https://www.cordovalibrary.org/events', city: 'Cordova', state: 'TN', zipCode: '00000', county: 'Cordova County'},
  { name: 'Corryton Branch Library', url: 'https://www.corrytonlibrary.org', eventsUrl: 'https://www.corrytonlibrary.org/events', city: 'Corryton', state: 'TN', zipCode: '00000', county: 'Corryton County'},
  { name: 'Cosby Community Library', url: 'https://www.cosbylibrary.org', eventsUrl: 'https://www.cosbylibrary.org/events', city: 'Cosby', state: 'TN', zipCode: '37722', county: 'Cosby County'},
  { name: 'Dandridge Memorial Library', url: 'https://www.dandridgelibrary.org', eventsUrl: 'https://www.dandridgelibrary.org/events', city: 'Dandridge', state: 'TN', zipCode: '37725', county: 'Dandridge County'},
  { name: 'Clyde W. Roddy Public Library', url: 'https://www.daytonlibrary.org', eventsUrl: 'https://www.daytonlibrary.org/events', city: 'Dayton', state: 'TN', zipCode: '37321', county: 'Dayton County'},
  { name: 'Meigs-Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'TN', zipCode: '37322', county: 'Decatur County'},
  { name: 'Decatur County Public Library', url: 'https://www.decaturvillelibrary.org', eventsUrl: 'https://www.decaturvillelibrary.org/events', city: 'Decaturville', state: 'TN', zipCode: '38329', county: 'Decaturville County'},
  { name: 'Deer Lodge Public Library', url: 'https://www.deerlodgelibrary.org', eventsUrl: 'https://www.deerlodgelibrary.org/events', city: 'Deer Lodge', state: 'TN', zipCode: '37726', county: 'Deer Lodge County'},
  { name: 'Marie Ellison Memorial Library', url: 'https://www.delriolibrary.org', eventsUrl: 'https://www.delriolibrary.org/events', city: 'Del Rio', state: 'TN', zipCode: '37727', county: 'Del Rio County'},
  { name: 'Stewart County Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'TN', zipCode: '37058', county: 'Dover County'},
  { name: 'Dowelltown Branch Library', url: 'https://www.dowelltownlibrary.org', eventsUrl: 'https://www.dowelltownlibrary.org/events', city: 'Dowelltown', state: 'TN', zipCode: '00000', county: 'Dowelltown County'},
  { name: 'Ned R. Mcwherter Weakley County Library', url: 'https://www.dresdenlibrary.org', eventsUrl: 'https://www.dresdenlibrary.org/events', city: 'Dresden', state: 'TN', zipCode: '38225', county: 'Dresden County'},
  { name: 'Ducktown Public Library', url: 'https://www.ducktownlibrary.org', eventsUrl: 'https://www.ducktownlibrary.org/events', city: 'Ducktown', state: 'TN', zipCode: '37326', county: 'Ducktown County'},
  { name: 'Sequatchie County Public Library', url: 'https://www.dunlaplibrary.org', eventsUrl: 'https://www.dunlaplibrary.org/events', city: 'Dunlap', state: 'TN', zipCode: '37327', county: 'Dunlap County'},
  { name: 'Eagleville Bicentennial Public Library', url: 'https://www.eaglevillelibrary.org', eventsUrl: 'https://www.eaglevillelibrary.org/events', city: 'Eagleville', state: 'TN', zipCode: '00000', county: 'Eagleville County'},
  { name: 'East Ridge City Library', url: 'https://www.eastridgeinlibrary.org', eventsUrl: 'https://www.eastridgeinlibrary.org/events', city: 'East Ridge (In)', state: 'TN', zipCode: '37412', county: 'East Ridge (In) County'},
  { name: 'Elkton Branch Library', url: 'https://www.elktonlibrary.org', eventsUrl: 'https://www.elktonlibrary.org/events', city: 'Elkton', state: 'TN', zipCode: '00000', county: 'Elkton County'},
  { name: 'Englewood Public Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'TN', zipCode: '37329', county: 'Englewood County'},
  { name: 'Houston County Public Library', url: 'https://www.erinlibrary.org', eventsUrl: 'https://www.erinlibrary.org/events', city: 'Erin', state: 'TN', zipCode: '37061', county: 'Erin County'},
  { name: 'Unicoi County Public Library', url: 'https://www.erwinlibrary.org', eventsUrl: 'https://www.erwinlibrary.org/events', city: 'Erwin', state: 'TN', zipCode: '37650', county: 'Erwin County'},
  { name: 'Etowah Carnegie Library', url: 'https://www.etowahlibrary.org', eventsUrl: 'https://www.etowahlibrary.org/events', city: 'Etowah', state: 'TN', zipCode: '37331', county: 'Etowah County'},
  { name: 'Fairview Public Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'TN', zipCode: '00000', county: 'Fairview County'},
  { name: 'Charles Ralph Holland Memorial Library', url: 'https://www.gainesborolibrary.org', eventsUrl: 'https://www.gainesborolibrary.org/events', city: 'Gainesboro', state: 'TN', zipCode: '38562', county: 'Gainesboro County'},
  { name: 'Anna Porter Public Library', url: 'https://www.gatlinburglibrary.org', eventsUrl: 'https://www.gatlinburglibrary.org/events', city: 'Gatlinburg', state: 'TN', zipCode: '37738', county: 'Gatlinburg County'},
  { name: 'Gleason Memorial Library', url: 'https://www.gleasonlibrary.org', eventsUrl: 'https://www.gleasonlibrary.org/events', city: 'Gleason', state: 'TN', zipCode: '38229', county: 'Gleason County'},
  { name: 'Goodlettsville Branch Library', url: 'https://www.goodlettsvillelibrary.org', eventsUrl: 'https://www.goodlettsvillelibrary.org/events', city: 'Goodlettsville', state: 'TN', zipCode: '00000', county: 'Goodlettsville County'},
  { name: 'Gordonsville Branch Library', url: 'https://www.gordonsvillelibrary.org', eventsUrl: 'https://www.gordonsvillelibrary.org/events', city: 'Gordonsville', state: 'TN', zipCode: '00000', county: 'Gordonsville County'},
  { name: 'Grand Junction Community Library', url: 'https://www.grandjunctionlibrary.org', eventsUrl: 'https://www.grandjunctionlibrary.org/events', city: 'Grand Junction', state: 'TN', zipCode: '38039', county: 'Grand Junction County'},
  { name: 'Gray Branch Library', url: 'https://www.graylibrary.org', eventsUrl: 'https://www.graylibrary.org/events', city: 'Gray', state: 'TN', zipCode: '00000', county: 'Gray County'},
  { name: 'Graysville Public Library', url: 'https://www.graysvillelibrary.org', eventsUrl: 'https://www.graysvillelibrary.org/events', city: 'Graysville', state: 'TN', zipCode: '37338', county: 'Graysville County'},
  { name: 'Greenback Public Library', url: 'https://www.greenbacklibrary.org', eventsUrl: 'https://www.greenbacklibrary.org/events', city: 'Greenback', state: 'TN', zipCode: '37742', county: 'Greenback County'},
  { name: 'Dr. Nathan Porter Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'TN', zipCode: '38230', county: 'Greenfield County'},
  { name: 'Halls Public Library', url: 'https://www.hallslibrary.org', eventsUrl: 'https://www.hallslibrary.org/events', city: 'Halls', state: 'TN', zipCode: '38040', county: 'Halls County'},
  { name: 'Harriman Public Library', url: 'https://www.harrimanlibrary.org', eventsUrl: 'https://www.harrimanlibrary.org/events', city: 'Harriman', state: 'TN', zipCode: '37748', county: 'Harriman County'},
  { name: 'Fred A. Vaught Memorial Library', url: 'https://www.hartsvillelibrary.org', eventsUrl: 'https://www.hartsvillelibrary.org/events', city: 'Hartsville', state: 'TN', zipCode: '37074', county: 'Hartsville County'},
  { name: 'Chester County Library', url: 'https://www.hendersonlibrary.org', eventsUrl: 'https://www.hendersonlibrary.org/events', city: 'Henderson', state: 'TN', zipCode: '38340', county: 'Henderson County'},
  { name: 'Hermitage Branch Library', url: 'https://www.hermitagelibrary.org', eventsUrl: 'https://www.hermitagelibrary.org/events', city: 'Hermitage', state: 'TN', zipCode: '00000', county: 'Hermitage County'},
  { name: 'Lewis County Public Library', url: 'https://www.hohenwaldlibrary.org', eventsUrl: 'https://www.hohenwaldlibrary.org/events', city: 'Hohenwald', state: 'TN', zipCode: '38462', county: 'Hohenwald County'},
  { name: 'Carroll County Library', url: 'https://www.huntingdonlibrary.org', eventsUrl: 'https://www.huntingdonlibrary.org/events', city: 'Huntingdon', state: 'TN', zipCode: '38344', county: 'Huntingdon County'},
  { name: 'Huntsville Public Library', url: 'https://www.huntsvillelibrary.org', eventsUrl: 'https://www.huntsvillelibrary.org/events', city: 'Huntsville', state: 'TN', zipCode: '37756', county: 'Huntsville County'},
  { name: 'Jacksboro Public Library', url: 'https://www.jacksborolibrary.org', eventsUrl: 'https://www.jacksborolibrary.org/events', city: 'Jacksboro', state: 'TN', zipCode: '37757', county: 'Jacksboro County'},
  { name: 'Fentress County Library', url: 'https://www.jamestownlibrary.org', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'TN', zipCode: '38556', county: 'Jamestown County'},
  { name: 'Jasper Public Library', url: 'https://www.jasperlibrary.org', eventsUrl: 'https://www.jasperlibrary.org/events', city: 'Jasper', state: 'TN', zipCode: '37347', county: 'Jasper County'},
  { name: 'Jefferson City Public Library', url: 'https://www.jeffersoncitylibrary.org', eventsUrl: 'https://www.jeffersoncitylibrary.org/events', city: 'Jefferson City', state: 'TN', zipCode: '37760', county: 'Jefferson City County'},
  { name: 'Jellico Public Library', url: 'https://www.jellicolibrary.org', eventsUrl: 'https://www.jellicolibrary.org/events', city: 'Jellico', state: 'TN', zipCode: '37762', county: 'Jellico County'},
  { name: 'Washington County-Jonesborough Public Library', url: 'https://www.jonesboroughlibrary.org', eventsUrl: 'https://www.jonesboroughlibrary.org/events', city: 'Jonesborough', state: 'TN', zipCode: '37659', county: 'Jonesborough County'},
  { name: 'Kingston Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'TN', zipCode: '37763', county: 'Kingston County'},
  { name: 'South Cheatham Public Library', url: 'https://www.kingstonspringslibrary.org', eventsUrl: 'https://www.kingstonspringslibrary.org/events', city: 'Kingston Springs', state: 'TN', zipCode: '37082', county: 'Kingston Springs County'},
  { name: 'Kodak Branch', url: 'https://www.kodaklibrary.org', eventsUrl: 'https://www.kodaklibrary.org/events', city: 'Kodak', state: 'TN', zipCode: '00000', county: 'Kodak County'},
  { name: 'Macon County Public Library', url: 'https://www.lafayettelibrary.org', eventsUrl: 'https://www.lafayettelibrary.org/events', city: 'Lafayette', state: 'TN', zipCode: '37083', county: 'Lafayette County'},
  { name: 'Lafollette Public Library', url: 'https://www.lafollettelibrary.org', eventsUrl: 'https://www.lafollettelibrary.org/events', city: 'Lafollette', state: 'TN', zipCode: '37766', county: 'Lafollette County'},
  { name: 'Lake City Public Library', url: 'https://www.lakecitylibrary.org', eventsUrl: 'https://www.lakecitylibrary.org/events', city: 'Lake City', state: 'TN', zipCode: '37769', county: 'Lake City County'},
  { name: 'Lenoir City Public Library', url: 'https://www.lenoircitylibrary.org', eventsUrl: 'https://www.lenoircitylibrary.org/events', city: 'Lenoir City', state: 'TN', zipCode: '37771', county: 'Lenoir City County'},
  { name: 'Marshall County Memorial Library', url: 'https://www.lewisburglibrary.org', eventsUrl: 'https://www.lewisburglibrary.org/events', city: 'Lewisburg', state: 'TN', zipCode: '37091', county: 'Lewisburg County'},
  { name: 'Perry County Public Library', url: 'https://www.lindenlibrary.org', eventsUrl: 'https://www.lindenlibrary.org/events', city: 'Linden', state: 'TN', zipCode: '37096', county: 'Linden County'},
  { name: 'Millard Oakley Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'TN', zipCode: '38570', county: 'Livingston County'},
  { name: 'Lobelville Public Library', url: 'https://www.lobelvillelibrary.org', eventsUrl: 'https://www.lobelvillelibrary.org/events', city: 'Lobelville', state: 'TN', zipCode: '37097', county: 'Lobelville County'},
  { name: 'Loretto Branch Library', url: 'https://www.lorettolibrary.org', eventsUrl: 'https://www.lorettolibrary.org/events', city: 'Loretto', state: 'TN', zipCode: '00000', county: 'Loretto County'},
  { name: 'Luttrell Public Library', url: 'https://www.luttrelllibrary.org', eventsUrl: 'https://www.luttrelllibrary.org/events', city: 'Luttrell', state: 'TN', zipCode: '37779', county: 'Luttrell County'},
  { name: 'East Hickman Public Library', url: 'https://www.lyleslibrary.org', eventsUrl: 'https://www.lyleslibrary.org/events', city: 'Lyles', state: 'TN', zipCode: '00000', county: 'Lyles County'},
  { name: 'Moore County Public Library', url: 'https://www.lynchburglibrary.org', eventsUrl: 'https://www.lynchburglibrary.org/events', city: 'Lynchburg', state: 'TN', zipCode: '37352', county: 'Lynchburg County'},
  { name: 'Robert B. Jones Memorial Library Museum', url: 'https://www.lynnvillelibrary.org', eventsUrl: 'https://www.lynnvillelibrary.org/events', city: 'Lynnville', state: 'TN', zipCode: '38472', county: 'Lynnville County'},
  { name: 'Nashville Talking Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'TN', zipCode: '00000', county: 'Madison County'},
  { name: 'Madisonville Public Library', url: 'https://www.madisonvillelibrary.org', eventsUrl: 'https://www.madisonvillelibrary.org/events', city: 'Madisonville', state: 'TN', zipCode: '37354', county: 'Madisonville County'},
  { name: 'Mascot Branch Library', url: 'https://www.mascotlibrary.org', eventsUrl: 'https://www.mascotlibrary.org/events', city: 'Mascot', state: 'TN', zipCode: '00000', county: 'Mascot County'},
  { name: 'Maynardville Public Library', url: 'https://www.maynardvillelibrary.org', eventsUrl: 'https://www.maynardvillelibrary.org/events', city: 'Maynardville', state: 'TN', zipCode: '37807', county: 'Maynardville County'},
  { name: 'Mckenzie Memorial Library', url: 'https://www.mckenzielibrary.org', eventsUrl: 'https://www.mckenzielibrary.org/events', city: 'Mckenzie', state: 'TN', zipCode: '38201', county: 'Mckenzie County'},
  { name: 'Middleton Community Library', url: 'https://www.middletonlibrary.org', eventsUrl: 'https://www.middletonlibrary.org/events', city: 'Middleton', state: 'TN', zipCode: '38052', county: 'Middleton County'},
  { name: 'Mildred G. Fields Memorial Library', url: 'https://www.milanlibrary.org', eventsUrl: 'https://www.milanlibrary.org/events', city: 'Milan', state: 'TN', zipCode: '38358', county: 'Milan County'},
  { name: 'Millington Public Library', url: 'https://www.millingtonlibrary.org', eventsUrl: 'https://www.millingtonlibrary.org/events', city: 'Millington', state: 'TN', zipCode: '38053', county: 'Millington County'},
  { name: 'Minor Hill Public Library', url: 'https://www.minorhilllibrary.org', eventsUrl: 'https://www.minorhilllibrary.org/events', city: 'Minor Hill', state: 'TN', zipCode: '38473', county: 'Minor Hill County'},
  { name: 'May Justus Memorial Library', url: 'https://www.monteaglelibrary.org', eventsUrl: 'https://www.monteaglelibrary.org/events', city: 'Monteagle', state: 'TN', zipCode: '37356', county: 'Monteagle County'},
  { name: 'Monterey Branch Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'TN', zipCode: '00000', county: 'Monterey County'},
  { name: 'Mosheim Public Library', url: 'https://www.mosheimlibrary.org', eventsUrl: 'https://www.mosheimlibrary.org/events', city: 'Mosheim', state: 'TN', zipCode: '37818', county: 'Mosheim County'},
  { name: 'Johnson County Public Library', url: 'https://www.mountaincitylibrary.org', eventsUrl: 'https://www.mountaincitylibrary.org/events', city: 'Mountain City', state: 'TN', zipCode: '37683', county: 'Mountain City County'},
  { name: 'Mt. Pleasant Branch Library', url: 'https://www.mtpleasantlibrary.org', eventsUrl: 'https://www.mtpleasantlibrary.org/events', city: 'Mt Pleasant', state: 'TN', zipCode: '00000', county: 'Mt Pleasant County'},
  { name: 'Mt. Carmel Library', url: 'https://www.mtcarmelinlibrary.org', eventsUrl: 'https://www.mtcarmelinlibrary.org/events', city: 'Mt. Carmel (In)', state: 'TN', zipCode: '37645', county: 'Mt. Carmel (In) County'},
  { name: 'Mt. Juliet-Harvey Freeman Public Library', url: 'https://www.mtjulietlibrary.org', eventsUrl: 'https://www.mtjulietlibrary.org/events', city: 'Mt. Juliet', state: 'TN', zipCode: '37122', county: 'Mt. Juliet County'},
  { name: 'Munford-Tipton Memorial Public Library', url: 'https://www.munfordlibrary.org', eventsUrl: 'https://www.munfordlibrary.org/events', city: 'Munford', state: 'TN', zipCode: '38058', county: 'Munford County'},
  { name: 'Newbern City Library', url: 'https://www.newbernlibrary.org', eventsUrl: 'https://www.newbernlibrary.org/events', city: 'Newbern', state: 'TN', zipCode: '38059', county: 'Newbern County'},
  { name: 'Niota Public Library', url: 'https://www.niotalibrary.org', eventsUrl: 'https://www.niotalibrary.org/events', city: 'Niota', state: 'TN', zipCode: '37826', county: 'Niota County'},
  { name: 'Nolensville Public Library', url: 'https://www.nolensvillelibrary.org', eventsUrl: 'https://www.nolensvillelibrary.org/events', city: 'Nolensville', state: 'TN', zipCode: '00000', county: 'Nolensville County'},
  { name: 'Norris Community Library', url: 'https://www.norrislibrary.org', eventsUrl: 'https://www.norrislibrary.org/events', city: 'Norris', state: 'TN', zipCode: '37828', county: 'Norris County'},
  { name: 'Oak Ridge Public Library', url: 'https://www.oakridgeinlibrary.org', eventsUrl: 'https://www.oakridgeinlibrary.org/events', city: 'Oak Ridge (In)', state: 'TN', zipCode: '37830', county: 'Oak Ridge (In) County'},
  { name: 'Oakdale Public Library', url: 'https://www.oakdalelibrary.org', eventsUrl: 'https://www.oakdalelibrary.org/events', city: 'Oakdale', state: 'TN', zipCode: '37829', county: 'Oakdale County'},
  { name: 'Old Hickory Branch Library', url: 'https://www.oldhickorylibrary.org', eventsUrl: 'https://www.oldhickorylibrary.org/events', city: 'Old Hickory', state: 'TN', zipCode: '00000', county: 'Old Hickory County'},
  { name: 'Oliver Springs Public Library', url: 'https://www.oliverspringslibrary.org', eventsUrl: 'https://www.oliverspringslibrary.org/events', city: 'Oliver Springs', state: 'TN', zipCode: '37840', county: 'Oliver Springs County'},
  { name: 'Oneida Public Library', url: 'https://www.oneidalibrary.org', eventsUrl: 'https://www.oneidalibrary.org/events', city: 'Oneida', state: 'TN', zipCode: '37841', county: 'Oneida County'},
  { name: 'Ooltewah-Collegedale Branch Library', url: 'https://www.ooltewahlibrary.org', eventsUrl: 'https://www.ooltewahlibrary.org/events', city: 'Ooltewah', state: 'TN', zipCode: '00000', county: 'Ooltewah County'},
  { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'TN', zipCode: '37365', county: 'Palmer County'},
  { name: 'Parrottsville Community Library', url: 'https://www.parrottsvillelibrary.org', eventsUrl: 'https://www.parrottsvillelibrary.org/events', city: 'Parrottsville', state: 'TN', zipCode: '37843', county: 'Parrottsville County'},
  { name: 'Parsons Public Library', url: 'https://www.parsonslibrary.org', eventsUrl: 'https://www.parsonslibrary.org/events', city: 'Parsons', state: 'TN', zipCode: '38363', county: 'Parsons County'},
  { name: 'Petros Public Library', url: 'https://www.petroslibrary.org', eventsUrl: 'https://www.petroslibrary.org/events', city: 'Petros', state: 'TN', zipCode: '37845', county: 'Petros County'},
  { name: 'Philadelphia Public Library', url: 'https://www.philadelphialibrary.org', eventsUrl: 'https://www.philadelphialibrary.org/events', city: 'Philadelphia', state: 'TN', zipCode: '37846', county: 'Philadelphia County'},
  { name: 'Pigeon Forge Public Library', url: 'https://www.pigeonforgelibrary.org', eventsUrl: 'https://www.pigeonforgelibrary.org/events', city: 'Pigeon Forge', state: 'TN', zipCode: '37863', county: 'Pigeon Forge County'},
  { name: 'Bledsoe County Library', url: 'https://www.pikevillelibrary.org', eventsUrl: 'https://www.pikevillelibrary.org/events', city: 'Pikeville', state: 'TN', zipCode: '37367', county: 'Pikeville County'},
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.org', eventsUrl: 'https://www.portlandlibrary.org/events', city: 'Portland', state: 'TN', zipCode: '37148', county: 'Portland County'},
  { name: 'Powell Branch Library', url: 'https://www.powelllibrary.org', eventsUrl: 'https://www.powelllibrary.org/events', city: 'Powell', state: 'TN', zipCode: '00000', county: 'Powell County'},
  { name: 'Giles County Public Library', url: 'https://www.pulaskilibrary.org', eventsUrl: 'https://www.pulaskilibrary.org/events', city: 'Pulaski', state: 'TN', zipCode: '38478', county: 'Pulaski County'},
  { name: 'Red Boiling Springs Branch Library', url: 'https://www.redboilingspringslibrary.org', eventsUrl: 'https://www.redboilingspringslibrary.org/events', city: 'Red Boiling Springs', state: 'TN', zipCode: '00000', county: 'Red Boiling Springs County'},
  { name: 'Ridgely Public Library', url: 'https://www.ridgelylibrary.org', eventsUrl: 'https://www.ridgelylibrary.org/events', city: 'Ridgely', state: 'TN', zipCode: '38080', county: 'Ridgely County'},
  { name: 'Lauderdale County Library', url: 'https://www.ripleylibrary.org', eventsUrl: 'https://www.ripleylibrary.org/events', city: 'Ripley', state: 'TN', zipCode: '38063', county: 'Ripley County'},
  { name: 'Rockwood Public Library', url: 'https://www.rockwoodlibrary.org', eventsUrl: 'https://www.rockwoodlibrary.org/events', city: 'Rockwood', state: 'TN', zipCode: '37854', county: 'Rockwood County'},
  { name: 'Rutledge Public Library', url: 'https://www.rutledgelibrary.org', eventsUrl: 'https://www.rutledgelibrary.org/events', city: 'Rutledge', state: 'TN', zipCode: '37861', county: 'Rutledge County'},
  { name: 'Seymour Branch Library', url: 'https://www.seymourlibrary.org', eventsUrl: 'https://www.seymourlibrary.org/events', city: 'Seymour', state: 'TN', zipCode: '00000', county: 'Seymour County'},
  { name: 'Sharon Public Library', url: 'https://www.sharonlibrary.org', eventsUrl: 'https://www.sharonlibrary.org/events', city: 'Sharon', state: 'TN', zipCode: '38255', county: 'Sharon County'},
  { name: 'Signal Mountain Public Library', url: 'https://www.signalmountainlibrary.org', eventsUrl: 'https://www.signalmountainlibrary.org/events', city: 'Signal Mountain', state: 'TN', zipCode: '00000', county: 'Signal Mountain County'},
  { name: 'Justin Potter Library', url: 'https://www.smithvillelibrary.org', eventsUrl: 'https://www.smithvillelibrary.org/events', city: 'Smithville', state: 'TN', zipCode: '37166', county: 'Smithville County'},
  { name: 'Hancock County Public Library', url: 'https://www.sneedvillelibrary.org', eventsUrl: 'https://www.sneedvillelibrary.org/events', city: 'Sneedville', state: 'TN', zipCode: '37869', county: 'Sneedville County'},
  { name: 'Somerville-Fayette County Library', url: 'https://www.somervillelibrary.org', eventsUrl: 'https://www.somervillelibrary.org/events', city: 'Somerville', state: 'TN', zipCode: '38068', county: 'Somerville County'},
  { name: 'Beene-Pearson Public Library', url: 'https://www.southpittsburglibrary.org', eventsUrl: 'https://www.southpittsburglibrary.org/events', city: 'South Pittsburg', state: 'TN', zipCode: '37380', county: 'South Pittsburg County'},
  { name: 'White County Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'TN', zipCode: '38583', county: 'Sparta County'},
  { name: 'Burritt Memorial Library', url: 'https://www.spencerlibrary.org', eventsUrl: 'https://www.spencerlibrary.org/events', city: 'Spencer', state: 'TN', zipCode: '38585', county: 'Spencer County'},
  { name: 'Audrey Pack Memorial Library', url: 'https://www.springcitylibrary.org', eventsUrl: 'https://www.springcitylibrary.org/events', city: 'Spring City', state: 'TN', zipCode: '37381', county: 'Spring City County'},
  { name: 'Spring Hill Public Library', url: 'https://www.springhilllibrary.org', eventsUrl: 'https://www.springhilllibrary.org/events', city: 'Spring Hill', state: 'TN', zipCode: '37174', county: 'Spring Hill County'},
  { name: 'Parrott-Wood Memorial Library', url: 'https://www.strawberryplainslibrary.org', eventsUrl: 'https://www.strawberryplainslibrary.org/events', city: 'Strawberry Plains', state: 'TN', zipCode: '37871', county: 'Strawberry Plains County'},
  { name: 'Sunbright Public Library', url: 'https://www.sunbrightlibrary.org', eventsUrl: 'https://www.sunbrightlibrary.org/events', city: 'Sunbright', state: 'TN', zipCode: '37872', county: 'Sunbright County'},
  { name: 'Surgoinsville Public Library', url: 'https://www.surgoinsvillelibrary.org', eventsUrl: 'https://www.surgoinsvillelibrary.org/events', city: 'Surgoinsville', state: 'TN', zipCode: '00000', county: 'Surgoinsville County'},
  { name: 'Sweetwater Public Library', url: 'https://www.sweetwaterlibrary.org', eventsUrl: 'https://www.sweetwaterlibrary.org/events', city: 'Sweetwater', state: 'TN', zipCode: '37874', county: 'Sweetwater County'},
  { name: 'Barbara Reynolds Carr Memorial Library', url: 'https://www.tazewelllibrary.org', eventsUrl: 'https://www.tazewelllibrary.org/events', city: 'Tazewell', state: 'TN', zipCode: '37879', county: 'Tazewell County'},
  { name: 'Tellico Plains Public Library', url: 'https://www.tellicoplainslibrary.org', eventsUrl: 'https://www.tellicoplainslibrary.org/events', city: 'Tellico Plains', state: 'TN', zipCode: '37385', county: 'Tellico Plains County'},
  { name: 'Bethesda Public Library', url: 'https://www.thompsonsstationlibrary.org', eventsUrl: 'https://www.thompsonsstationlibrary.org/events', city: 'Thompsons Station', state: 'TN', zipCode: '00000', county: 'Thompsons Station County'},
  { name: 'Tiptonville Public Library', url: 'https://www.tiptonvillelibrary.org', eventsUrl: 'https://www.tiptonvillelibrary.org/events', city: 'Tiptonville', state: 'TN', zipCode: '38079', county: 'Tiptonville County'},
  { name: 'Mary E. Tippitt Memorial Library', url: 'https://www.townsendlibrary.org', eventsUrl: 'https://www.townsendlibrary.org/events', city: 'Townsend', state: 'TN', zipCode: '37882', county: 'Townsend County'},
  { name: 'Tracy City Public Library', url: 'https://www.tracycitylibrary.org', eventsUrl: 'https://www.tracycitylibrary.org/events', city: 'Tracy City', state: 'TN', zipCode: '37387', county: 'Tracy City County'},
  { name: 'Gibson County Memorial Library', url: 'https://www.trentonlibrary.org', eventsUrl: 'https://www.trentonlibrary.org/events', city: 'Trenton', state: 'TN', zipCode: '38382', county: 'Trenton County'},
  { name: 'Hamilton Parks Public Library', url: 'https://www.trimblelibrary.org', eventsUrl: 'https://www.trimblelibrary.org/events', city: 'Trimble', state: 'TN', zipCode: '38259', county: 'Trimble County'},
  { name: 'Vonore Public Library', url: 'https://www.vonorelibrary.org', eventsUrl: 'https://www.vonorelibrary.org/events', city: 'Vonore', state: 'TN', zipCode: '37885', county: 'Vonore County'},
  { name: 'Wartburg Public Library', url: 'https://www.wartburglibrary.org', eventsUrl: 'https://www.wartburglibrary.org/events', city: 'Wartburg', state: 'TN', zipCode: '37887', county: 'Wartburg County'},
  { name: 'Washburn Public Library', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'TN', zipCode: '37888', county: 'Washburn County'},
  { name: 'Watertown-Wilson County Library', url: 'https://www.watertownlibrary.org', eventsUrl: 'https://www.watertownlibrary.org/events', city: 'Watertown', state: 'TN', zipCode: '00000', county: 'Watertown County'},
  { name: 'Humphreys County Public Library', url: 'https://www.waverlylibrary.org', eventsUrl: 'https://www.waverlylibrary.org/events', city: 'Waverly', state: 'TN', zipCode: '37185', county: 'Waverly County'},
  { name: 'Wayne County Public Library', url: 'https://www.waynesborolibrary.org', eventsUrl: 'https://www.waynesborolibrary.org/events', city: 'Waynesboro', state: 'TN', zipCode: '38485', county: 'Waynesboro County'},
  { name: 'Westmoreland Public Library', url: 'https://www.westmorelandlibrary.org', eventsUrl: 'https://www.westmorelandlibrary.org/events', city: 'Westmoreland', state: 'TN', zipCode: '37186', county: 'Westmoreland County'},
  { name: 'White House Inn Library', url: 'https://www.whitehouselibrary.org', eventsUrl: 'https://www.whitehouselibrary.org/events', city: 'White House', state: 'TN', zipCode: '37188', county: 'White House County'},
  { name: 'White Pine Public Library', url: 'https://www.whitepinelibrary.org', eventsUrl: 'https://www.whitepinelibrary.org/events', city: 'White Pine', state: 'TN', zipCode: '37890', county: 'White Pine County'},
  { name: 'Lee Ola Roberts Library', url: 'https://www.whitevillelibrary.org', eventsUrl: 'https://www.whitevillelibrary.org/events', city: 'Whiteville', state: 'TN', zipCode: '38075', county: 'Whiteville County'},
  { name: 'Orena Humphreys Public Library', url: 'https://www.whitwelllibrary.org', eventsUrl: 'https://www.whitwelllibrary.org/events', city: 'Whitwell', state: 'TN', zipCode: '37397', county: 'Whitwell County'},
  { name: 'Franklin County Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'TN', zipCode: '37398', county: 'Winchester County'},
  { name: 'Winfield Public Library', url: 'https://www.winfieldlibrary.org', eventsUrl: 'https://www.winfieldlibrary.org/events', city: 'Winfield', state: 'TN', zipCode: '37892', county: 'Winfield County'},
  { name: 'Adams Memorial Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'TN', zipCode: '00000', county: 'Woodbury County'}

];

const SCRAPER_NAME = 'wordpress-TN';

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
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          'article',
          '.post',
          '.item'
        ];

        const foundElements = new Set();

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('time')
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');

              // Look for age/audience info on the event card
              const ageEl = [
                card.querySelector('[class*="audience"]'),
                card.querySelector('[class*="age-range"]'),
                card.querySelector('[class*="age_range"]'),
                card.querySelector('[class*="ages"]'),
                card.querySelector('[class*="age-group"]'),
                card.querySelector('[class*="category"]')
              ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (possibleTitles.length > 0) {
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {}
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            state: 'TN',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'TN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
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
async function scrapeWordpressTNCloudFunction() {
  console.log('☁️ Running WordPress TN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-TN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-TN', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressTNCloudFunction };
