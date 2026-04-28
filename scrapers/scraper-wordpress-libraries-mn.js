const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Minnesota Public Libraries Scraper
 * State: MN
 * Coverage: All Minnesota Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Minneapolis Public Library', url: 'https://www.hclib.org', eventsUrl: 'https://www.hclib.org/events', city: 'Minneapolis', state: 'MN', zipCode: '55401', county: 'Hennepin County'},
  { name: 'St. Paul Public Library', url: 'https://sppl.org', eventsUrl: 'https://sppl.org/events', city: 'St. Paul', state: 'MN', zipCode: '55102', county: 'Ramsey County'},
  { name: 'Duluth Public Library', url: 'https://www.duluthlibrary.org', eventsUrl: 'https://www.duluthlibrary.org/events', city: 'Duluth', state: 'MN', zipCode: '55802', county: 'St. Louis County'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterpubliclibrary.org', eventsUrl: 'https://www.rochesterpubliclibrary.org/events', city: 'Rochester', state: 'MN', zipCode: '55901', county: 'Olmsted County'},
  // Regional Libraries
  { name: 'St. Cloud Public Library', url: 'https://www.grrl.lib.mn.us', eventsUrl: 'https://www.grrl.lib.mn.us/events', city: 'St. Cloud', state: 'MN', zipCode: '56301', county: 'Stearns County'},
  { name: 'Bloomington Public Library', url: 'https://www.bloomingtonmn.gov/library', eventsUrl: 'https://www.bloomingtonmn.gov/library/events', city: 'Bloomington', state: 'MN', zipCode: '55431', county: 'Hennepin County'},
  { name: 'Plymouth Public Library', url: 'https://www.plymouthmn.gov/library', eventsUrl: 'https://www.plymouthmn.gov/library/events', city: 'Plymouth', state: 'MN', zipCode: '55441', county: 'Hennepin County'},
  { name: 'Edina Public Library', url: 'https://www.edinamn.gov/library', eventsUrl: 'https://www.edinamn.gov/library/events', city: 'Edina', state: 'MN', zipCode: '55424', county: 'Hennepin County'},
  { name: 'Moorhead Public Library', url: 'https://www.larl.org', eventsUrl: 'https://www.larl.org/events', city: 'Moorhead', state: 'MN', zipCode: '56560', county: 'Clay County'},
  { name: 'Mankato Public Library', url: 'https://www.bfrlib.org', eventsUrl: 'https://www.bfrlib.org/events', city: 'Mankato', state: 'MN', zipCode: '56001', county: 'Blue Earth County'},
  { name: 'Dakota County Library', url: 'https://www.dakotacounty.us/library', eventsUrl: 'https://www.dakotacounty.us/library/events', city: 'Apple Valley', state: 'MN', zipCode: '55124', county: 'Dakota County'},
  { name: 'Anoka County Library', url: 'https://www.anokacounty.us/library', eventsUrl: 'https://www.anokacounty.us/library/events', city: 'Blaine', state: 'MN', zipCode: '55434', county: 'Anoka County'},
  { name: 'Washington County Library', url: 'https://www.washcolib.org', eventsUrl: 'https://www.washcolib.org/events', city: 'Woodbury', state: 'MN', zipCode: '55125', county: 'Washington County'},
  { name: 'Scott County Library', url: 'https://www.scottlib.org', eventsUrl: 'https://www.scottlib.org/events', city: 'Savage', state: 'MN', zipCode: '55378', county: 'Scott County'},
  { name: 'Ramsey County Library', url: 'https://www.rclreads.org', eventsUrl: 'https://www.rclreads.org/events', city: 'Roseville', state: 'MN', zipCode: '55113', county: 'Ramsey County'},
  { name: 'Minnetonka Library', url: 'https://www.minnetonkamn.gov/library', eventsUrl: 'https://www.minnetonkamn.gov/library/events', city: 'Minnetonka', state: 'MN', zipCode: '55305', county: 'Hennepin County'},
  { name: 'Brooklyn Park Library', url: 'https://www.brooklynpark.org/library', eventsUrl: 'https://www.brooklynpark.org/library/events', city: 'Brooklyn Park', state: 'MN', zipCode: '55443', county: 'Hennepin County'},
  { name: 'Eagan Library', url: 'https://www.eaganmn.gov/library', eventsUrl: 'https://www.eaganmn.gov/library/events', city: 'Eagan', state: 'MN', zipCode: '55121', county: 'Dakota County'},
  { name: 'Burnsville Library', url: 'https://www.burnsville.org/library', eventsUrl: 'https://www.burnsville.org/library/events', city: 'Burnsville', state: 'MN', zipCode: '55337', county: 'Dakota County'},
  { name: 'Woodbury Library', url: 'https://www.woodburymn.gov/library', eventsUrl: 'https://www.woodburymn.gov/library/events', city: 'Woodbury', state: 'MN', zipCode: '55125', county: 'Washington County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Ada Public Library', url: 'https://www.adalibrary.org', eventsUrl: 'https://www.adalibrary.org/events', city: 'Ada', state: 'MN', zipCode: '56510', county: 'Ada County'},
  { name: 'Adrian Branch Library', url: 'https://www.adrianlibrary.org', eventsUrl: 'https://www.adrianlibrary.org/events', city: 'Adrian', state: 'MN', zipCode: '00000', county: 'Adrian County'},
  { name: 'Aitkin Public Library', url: 'https://www.aitkinlibrary.org', eventsUrl: 'https://www.aitkinlibrary.org/events', city: 'Aitkin', state: 'MN', zipCode: '00000', county: 'Aitkin County'},
  { name: 'Great River Regional Library - Albany', url: 'https://www.albanylibrary.org', eventsUrl: 'https://www.albanylibrary.org/events', city: 'Albany', state: 'MN', zipCode: '00000', county: 'Albany County'},
  { name: 'Albert Lea Public Library', url: 'https://www.albertlealibrary.org', eventsUrl: 'https://www.albertlealibrary.org/events', city: 'Albert Lea', state: 'MN', zipCode: '56007', county: 'Albert Lea County'},
  { name: 'Douglas County Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'MN', zipCode: '56308', county: 'Alexandria County'},
  { name: 'Great River Regional Library - Annandale Branch', url: 'https://www.annandalelibrary.org', eventsUrl: 'https://www.annandalelibrary.org/events', city: 'Annandale', state: 'MN', zipCode: '00000', county: 'Annandale County'},
  { name: 'Rum River Library', url: 'https://www.anokalibrary.org', eventsUrl: 'https://www.anokalibrary.org/events', city: 'Anoka', state: 'MN', zipCode: '00000', county: 'Anoka County'},
  { name: 'Appleton Public Library', url: 'https://www.appletonlibrary.org', eventsUrl: 'https://www.appletonlibrary.org/events', city: 'Appleton', state: 'MN', zipCode: '00000', county: 'Appleton County'},
  { name: 'Arden Hills Library', url: 'https://www.ardenhillslibrary.org', eventsUrl: 'https://www.ardenhillslibrary.org/events', city: 'Arden Hills', state: 'MN', zipCode: '00000', county: 'Arden Hills County'},
  { name: 'Arlington Public Library', url: 'https://www.arlingtonlibrary.org', eventsUrl: 'https://www.arlingtonlibrary.org/events', city: 'Arlington', state: 'MN', zipCode: '00000', county: 'Arlington County'},
  { name: 'Atwater Public Library', url: 'https://www.atwaterlibrary.org', eventsUrl: 'https://www.atwaterlibrary.org/events', city: 'Atwater', state: 'MN', zipCode: '00000', county: 'Atwater County'},
  { name: 'Aurora Public Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'MN', zipCode: '55705', county: 'Aurora County'},
  { name: 'Austin Public Library', url: 'https://www.austinlibrary.org', eventsUrl: 'https://www.austinlibrary.org/events', city: 'Austin', state: 'MN', zipCode: '55912', county: 'Austin County'},
  { name: 'Babbitt Public Library', url: 'https://www.babbittlibrary.org', eventsUrl: 'https://www.babbittlibrary.org/events', city: 'Babbitt', state: 'MN', zipCode: '55706', county: 'Babbitt County'},
  { name: 'Bagley Public Library', url: 'https://www.bagleylibrary.org', eventsUrl: 'https://www.bagleylibrary.org/events', city: 'Bagley', state: 'MN', zipCode: '00000', county: 'Bagley County'},
  { name: 'Balaton Community Library', url: 'https://www.balatonlibrary.org', eventsUrl: 'https://www.balatonlibrary.org/events', city: 'Balaton', state: 'MN', zipCode: '00000', county: 'Balaton County'},
  { name: 'Barnesville Public Library', url: 'https://www.barnesvillelibrary.org', eventsUrl: 'https://www.barnesvillelibrary.org/events', city: 'Barnesville', state: 'MN', zipCode: '00000', county: 'Barnesville County'},
  { name: 'Baudette Public Library', url: 'https://www.baudettelibrary.org', eventsUrl: 'https://www.baudettelibrary.org/events', city: 'Baudette', state: 'MN', zipCode: '56623', county: 'Baudette County'},
  { name: 'Bayport Public Library', url: 'https://www.bayportlibrary.org', eventsUrl: 'https://www.bayportlibrary.org/events', city: 'Bayport', state: 'MN', zipCode: '55003', county: 'Bayport County'},
  { name: 'Great River Regional Library - Becker Branch', url: 'https://www.beckerlibrary.org', eventsUrl: 'https://www.beckerlibrary.org/events', city: 'Becker', state: 'MN', zipCode: '00000', county: 'Becker County'},
  { name: 'Great River Regional Library - Belgrade (Myrtle Mabee Library)', url: 'https://www.belgradelibrary.org', eventsUrl: 'https://www.belgradelibrary.org/events', city: 'Belgrade', state: 'MN', zipCode: '56312', county: 'Belgrade County'},
  { name: 'Belle Plaine Branch Library', url: 'https://www.belleplainelibrary.org', eventsUrl: 'https://www.belleplainelibrary.org/events', city: 'Belle Plaine', state: 'MN', zipCode: '00000', county: 'Belle Plaine County'},
  { name: 'Bemidji Public Library', url: 'https://www.bemidjilibrary.org', eventsUrl: 'https://www.bemidjilibrary.org/events', city: 'Bemidji', state: 'MN', zipCode: '00000', county: 'Bemidji County'},
  { name: 'Benson Public Library', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'MN', zipCode: '00000', county: 'Benson County'},
  { name: 'Great River Regional Library - Big Lake', url: 'https://www.biglakelibrary.org', eventsUrl: 'https://www.biglakelibrary.org/events', city: 'Big Lake', state: 'MN', zipCode: '00000', county: 'Big Lake County'},
  { name: 'Bird Island Public Library', url: 'https://www.birdislandlibrary.org', eventsUrl: 'https://www.birdislandlibrary.org/events', city: 'Bird Island', state: 'MN', zipCode: '00000', county: 'Bird Island County'},
  { name: 'Blackduck Public Library', url: 'https://www.blackducklibrary.org', eventsUrl: 'https://www.blackducklibrary.org/events', city: 'Blackduck', state: 'MN', zipCode: '00000', county: 'Blackduck County'},
  { name: 'Blooming Prairie Public Library', url: 'https://www.bloomingprairielibrary.org', eventsUrl: 'https://www.bloomingprairielibrary.org/events', city: 'Blooming Prairie', state: 'MN', zipCode: '00000', county: 'Blooming Prairie County'},
  { name: 'Blue Earth Community Library', url: 'https://www.blueearthlibrary.org', eventsUrl: 'https://www.blueearthlibrary.org/events', city: 'Blue Earth', state: 'MN', zipCode: '56013', county: 'Blue Earth County'},
  { name: 'Bovey Public Library', url: 'https://www.boveylibrary.org', eventsUrl: 'https://www.boveylibrary.org/events', city: 'Bovey', state: 'MN', zipCode: '55709', county: 'Bovey County'},
  { name: 'Brainerd Public Library', url: 'https://www.brainerdlibrary.org', eventsUrl: 'https://www.brainerdlibrary.org/events', city: 'Brainerd', state: 'MN', zipCode: '00000', county: 'Brainerd County'},
  { name: 'Breckenridge Public Library', url: 'https://www.breckenridgelibrary.org', eventsUrl: 'https://www.breckenridgelibrary.org/events', city: 'Breckenridge', state: 'MN', zipCode: '00000', county: 'Breckenridge County'},
  { name: 'Hennepin County Library - Brookdale', url: 'https://www.brooklyncenterlibrary.org', eventsUrl: 'https://www.brooklyncenterlibrary.org/events', city: 'Brooklyn Center', state: 'MN', zipCode: '55430', county: 'Brooklyn Center County'},
  { name: 'Browns Valley Public Library', url: 'https://www.brownsvalleylibrary.org', eventsUrl: 'https://www.brownsvalleylibrary.org/events', city: 'Browns Valley', state: 'MN', zipCode: '56219', county: 'Browns Valley County'},
  { name: 'Brownsdale Public Library', url: 'https://www.brownsdalelibrary.org', eventsUrl: 'https://www.brownsdalelibrary.org/events', city: 'Brownsdale', state: 'MN', zipCode: '55918', county: 'Brownsdale County'},
  { name: 'Brownton Public Library', url: 'https://www.browntonlibrary.org', eventsUrl: 'https://www.browntonlibrary.org/events', city: 'Brownton', state: 'MN', zipCode: '00000', county: 'Brownton County'},
  { name: 'Great River Regional Library - Buffalo Branch', url: 'https://www.buffalolibrary.org', eventsUrl: 'https://www.buffalolibrary.org/events', city: 'Buffalo', state: 'MN', zipCode: '00000', county: 'Buffalo County'},
  { name: 'Buhl Public Library', url: 'https://www.buhllibrary.org', eventsUrl: 'https://www.buhllibrary.org/events', city: 'Buhl', state: 'MN', zipCode: '55713', county: 'Buhl County'},
  { name: 'Butterfield Branch Library', url: 'https://www.butterfieldlibrary.org', eventsUrl: 'https://www.butterfieldlibrary.org/events', city: 'Butterfield', state: 'MN', zipCode: '00000', county: 'Butterfield County'},
  { name: 'Caledonia Public Library', url: 'https://www.caledonialibrary.org', eventsUrl: 'https://www.caledonialibrary.org/events', city: 'Caledonia', state: 'MN', zipCode: '55921', county: 'Caledonia County'},
  { name: 'Calumet Public Library', url: 'https://www.calumetlibrary.org', eventsUrl: 'https://www.calumetlibrary.org/events', city: 'Calumet', state: 'MN', zipCode: '55716', county: 'Calumet County'},
  { name: 'Cambridge Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'MN', zipCode: '00000', county: 'Cambridge County'},
  { name: 'Canby Public Library', url: 'https://www.canbylibrary.org', eventsUrl: 'https://www.canbylibrary.org/events', city: 'Canby', state: 'MN', zipCode: '00000', county: 'Canby County'},
  { name: 'Cannon Falls Library', url: 'https://www.cannonfallslibrary.org', eventsUrl: 'https://www.cannonfallslibrary.org/events', city: 'Cannon Falls', state: 'MN', zipCode: '55009', county: 'Cannon Falls County'},
  { name: 'Carlton Public Library', url: 'https://www.carltonlibrary.org', eventsUrl: 'https://www.carltonlibrary.org/events', city: 'Carlton', state: 'MN', zipCode: '55718', county: 'Carlton County'},
  { name: 'Cass Lake Community Library', url: 'https://www.casslakelibrary.org', eventsUrl: 'https://www.casslakelibrary.org/events', city: 'Cass Lake', state: 'MN', zipCode: '00000', county: 'Cass Lake County'},
  { name: 'Ceylon Branch Library', url: 'https://www.ceylonlibrary.org', eventsUrl: 'https://www.ceylonlibrary.org/events', city: 'Ceylon', state: 'MN', zipCode: '00000', county: 'Ceylon County'},
  { name: 'Hennepin County Library - Champlin', url: 'https://www.champlinlibrary.org', eventsUrl: 'https://www.champlinlibrary.org/events', city: 'Champlin', state: 'MN', zipCode: '55316', county: 'Champlin County'},
  { name: 'Chanhassen Public Library', url: 'https://www.chanhassenlibrary.org', eventsUrl: 'https://www.chanhassenlibrary.org/events', city: 'Chanhassen', state: 'MN', zipCode: '00000', county: 'Chanhassen County'},
  { name: 'Carver County Library System', url: 'https://www.chaskalibrary.org', eventsUrl: 'https://www.chaskalibrary.org/events', city: 'Chaska', state: 'MN', zipCode: '55318', county: 'Chaska County'},
  { name: 'Chatfield Public Library', url: 'https://www.chatfieldlibrary.org', eventsUrl: 'https://www.chatfieldlibrary.org/events', city: 'Chatfield', state: 'MN', zipCode: '55923', county: 'Chatfield County'},
  { name: 'Chisago Lakes Area Library', url: 'https://www.chisagocitylibrary.org', eventsUrl: 'https://www.chisagocitylibrary.org/events', city: 'Chisago City', state: 'MN', zipCode: '55013', county: 'Chisago City County'},
  { name: 'Chisholm Public Library', url: 'https://www.chisholmlibrary.org', eventsUrl: 'https://www.chisholmlibrary.org/events', city: 'Chisholm', state: 'MN', zipCode: '55719', county: 'Chisholm County'},
  { name: 'Centennial Branch Library', url: 'https://www.circlepineslibrary.org', eventsUrl: 'https://www.circlepineslibrary.org/events', city: 'Circle Pines', state: 'MN', zipCode: '00000', county: 'Circle Pines County'},
  { name: 'Clara City Library', url: 'https://www.claracitylibrary.org', eventsUrl: 'https://www.claracitylibrary.org/events', city: 'Clara City', state: 'MN', zipCode: '00000', county: 'Clara City County'},
  { name: 'Clarkfield Public Library', url: 'https://www.clarkfieldlibrary.org', eventsUrl: 'https://www.clarkfieldlibrary.org/events', city: 'Clarkfield', state: 'MN', zipCode: '56223', county: 'Clarkfield County'},
  { name: 'Great River Regional Library - Clearwater (Stickney Crossing Library)', url: 'https://www.clearwaterlibrary.org', eventsUrl: 'https://www.clearwaterlibrary.org/events', city: 'Clearwater', state: 'MN', zipCode: '00000', county: 'Clearwater County'},
  { name: 'Cleveland Public Library', url: 'https://www.clevelandlibrary.org', eventsUrl: 'https://www.clevelandlibrary.org/events', city: 'Cleveland', state: 'MN', zipCode: '00000', county: 'Cleveland County'},
  { name: 'Climax Public Library', url: 'https://www.climaxlibrary.org', eventsUrl: 'https://www.climaxlibrary.org/events', city: 'Climax', state: 'MN', zipCode: '00000', county: 'Climax County'},
  { name: 'Cloquet Public Library', url: 'https://www.cloquetlibrary.org', eventsUrl: 'https://www.cloquetlibrary.org/events', city: 'Cloquet', state: 'MN', zipCode: '55720', county: 'Cloquet County'},
  { name: 'Great River Regional Library - Cokato Branch', url: 'https://www.cokatolibrary.org', eventsUrl: 'https://www.cokatolibrary.org/events', city: 'Cokato', state: 'MN', zipCode: '00000', county: 'Cokato County'},
  { name: 'Great River Regional Library - Cold Spring', url: 'https://www.coldspringlibrary.org', eventsUrl: 'https://www.coldspringlibrary.org/events', city: 'Cold Spring', state: 'MN', zipCode: '00000', county: 'Cold Spring County'},
  { name: 'Coleraine Public Library', url: 'https://www.colerainelibrary.org', eventsUrl: 'https://www.colerainelibrary.org/events', city: 'Coleraine', state: 'MN', zipCode: '55722', county: 'Coleraine County'},
  { name: 'Columbia Heights Public Library', url: 'https://www.columbiaheightslibrary.org', eventsUrl: 'https://www.columbiaheightslibrary.org/events', city: 'Columbia Heights', state: 'MN', zipCode: '55421', county: 'Columbia Heights County'},
  { name: 'Comfrey Community Library', url: 'https://www.comfreylibrary.org', eventsUrl: 'https://www.comfreylibrary.org/events', city: 'Comfrey', state: 'MN', zipCode: '56019', county: 'Comfrey County'},
  { name: 'Cook Public Library', url: 'https://www.cooklibrary.org', eventsUrl: 'https://www.cooklibrary.org/events', city: 'Cook', state: 'MN', zipCode: '55723', county: 'Cook County'},
  { name: 'Crooked Lake Branch Library', url: 'https://www.coonrapidslibrary.org', eventsUrl: 'https://www.coonrapidslibrary.org/events', city: 'Coon Rapids', state: 'MN', zipCode: '00000', county: 'Coon Rapids County'},
  { name: 'Cosmos Public Library', url: 'https://www.cosmoslibrary.org', eventsUrl: 'https://www.cosmoslibrary.org/events', city: 'Cosmos', state: 'MN', zipCode: '00000', county: 'Cosmos County'},
  { name: 'Park Grove Library', url: 'https://www.cottagegrovelibrary.org', eventsUrl: 'https://www.cottagegrovelibrary.org/events', city: 'Cottage Grove', state: 'MN', zipCode: '55016', county: 'Cottage Grove County'},
  { name: 'Cottonwood Community Library', url: 'https://www.cottonwoodlibrary.org', eventsUrl: 'https://www.cottonwoodlibrary.org/events', city: 'Cottonwood', state: 'MN', zipCode: '00000', county: 'Cottonwood County'},
  { name: 'Crookston Public Library', url: 'https://www.crookstonlibrary.org', eventsUrl: 'https://www.crookstonlibrary.org/events', city: 'Crookston', state: 'MN', zipCode: '00000', county: 'Crookston County'},
  { name: 'Jessie F. Hallett Memorial Library', url: 'https://www.crosbylibrary.org', eventsUrl: 'https://www.crosbylibrary.org/events', city: 'Crosby', state: 'MN', zipCode: '56441', county: 'Crosby County'},
  { name: 'Hennepin County Library - Rockford Road', url: 'https://www.crystallibrary.org', eventsUrl: 'https://www.crystallibrary.org/events', city: 'Crystal', state: 'MN', zipCode: '55427', county: 'Crystal County'},
  { name: 'Darfur Branch Library', url: 'https://www.darfurlibrary.org', eventsUrl: 'https://www.darfurlibrary.org/events', city: 'Darfur', state: 'MN', zipCode: '00000', county: 'Darfur County'},
  { name: 'Dassel Public Library', url: 'https://www.dassellibrary.org', eventsUrl: 'https://www.dassellibrary.org/events', city: 'Dassel', state: 'MN', zipCode: '00000', county: 'Dassel County'},
  { name: 'Dawson Public Library', url: 'https://www.dawsonlibrary.org', eventsUrl: 'https://www.dawsonlibrary.org/events', city: 'Dawson', state: 'MN', zipCode: '00000', county: 'Dawson County'},
  { name: 'Great River Regional Library - Delano', url: 'https://www.delanolibrary.org', eventsUrl: 'https://www.delanolibrary.org/events', city: 'Delano', state: 'MN', zipCode: '00000', county: 'Delano County'},
  { name: 'Detroit Lakes Public Library', url: 'https://www.detroitlakeslibrary.org', eventsUrl: 'https://www.detroitlakeslibrary.org/events', city: 'Detroit Lakes', state: 'MN', zipCode: '00000', county: 'Detroit Lakes County'},
  { name: 'Dodge Center Public Library', url: 'https://www.dodgecenterlibrary.org', eventsUrl: 'https://www.dodgecenterlibrary.org/events', city: 'Dodge Center', state: 'MN', zipCode: '55927', county: 'Dodge Center County'},
  { name: 'Dunnell Branch Library', url: 'https://www.dunnelllibrary.org', eventsUrl: 'https://www.dunnelllibrary.org/events', city: 'Dunnell', state: 'MN', zipCode: '00000', county: 'Dunnell County'},
  { name: 'Great River Regional Library - Eagle Bend', url: 'https://www.eaglebendlibrary.org', eventsUrl: 'https://www.eaglebendlibrary.org/events', city: 'Eagle Bend', state: 'MN', zipCode: '00000', county: 'Eagle Bend County'},
  { name: 'East Grand Forks-Campbell Library', url: 'https://www.eastgrandforkslibrary.org', eventsUrl: 'https://www.eastgrandforkslibrary.org/events', city: 'East Grand Forks', state: 'MN', zipCode: '56721', county: 'East Grand Forks County'},
  { name: 'Hennepin County Library - Eden Prairie', url: 'https://www.edenprairielibrary.org', eventsUrl: 'https://www.edenprairielibrary.org/events', city: 'Eden Prairie', state: 'MN', zipCode: '55344', county: 'Eden Prairie County'},
  { name: 'Edgerton Public Library', url: 'https://www.edgertonlibrary.org', eventsUrl: 'https://www.edgertonlibrary.org/events', city: 'Edgerton', state: 'MN', zipCode: '56128', county: 'Edgerton County'},
  { name: 'Elbow Lake Thorson Mem Library', url: 'https://www.elbowlakelibrary.org', eventsUrl: 'https://www.elbowlakelibrary.org/events', city: 'Elbow Lake', state: 'MN', zipCode: '56531', county: 'Elbow Lake County'},
  { name: 'Great River Regional Library - Elk River', url: 'https://www.elkriverlibrary.org', eventsUrl: 'https://www.elkriverlibrary.org/events', city: 'Elk River', state: 'MN', zipCode: '00000', county: 'Elk River County'},
  { name: 'Elmore Library', url: 'https://www.elmorelibrary.org', eventsUrl: 'https://www.elmorelibrary.org/events', city: 'Elmore', state: 'MN', zipCode: '56027', county: 'Elmore County'},
  { name: 'Ely Public Library', url: 'https://www.elylibrary.org', eventsUrl: 'https://www.elylibrary.org/events', city: 'Ely', state: 'MN', zipCode: '55731', county: 'Ely County'},
  { name: 'Elysian Public Library', url: 'https://www.elysianlibrary.org', eventsUrl: 'https://www.elysianlibrary.org/events', city: 'Elysian', state: 'MN', zipCode: '00000', county: 'Elysian County'},
  { name: 'Eveleth Public Library', url: 'https://www.evelethlibrary.org', eventsUrl: 'https://www.evelethlibrary.org/events', city: 'Eveleth', state: 'MN', zipCode: '55734', county: 'Eveleth County'},
  { name: 'Hennepin County Library - Excelsior', url: 'https://www.excelsiorlibrary.org', eventsUrl: 'https://www.excelsiorlibrary.org/events', city: 'Excelsior', state: 'MN', zipCode: '55331', county: 'Excelsior County'},
  { name: 'Fairfax Public Library', url: 'https://www.fairfaxlibrary.org', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'MN', zipCode: '00000', county: 'Fairfax County'},
  { name: 'Central Library', url: 'https://www.fairmontlibrary.org', eventsUrl: 'https://www.fairmontlibrary.org/events', city: 'Fairmont', state: 'MN', zipCode: '00000', county: 'Fairmont County'},
  { name: 'Faribault Buckham Memorial Library', url: 'https://www.faribaultlibrary.org', eventsUrl: 'https://www.faribaultlibrary.org/events', city: 'Faribault', state: 'MN', zipCode: '55021', county: 'Faribault County'},
  { name: 'Farmington Community Library', url: 'https://www.farmingtonlibrary.org', eventsUrl: 'https://www.farmingtonlibrary.org/events', city: 'Farmington', state: 'MN', zipCode: '00000', county: 'Farmington County'},
  { name: 'Fergus Falls Public Library', url: 'https://www.fergusfallslibrary.org', eventsUrl: 'https://www.fergusfallslibrary.org/events', city: 'Fergus Falls', state: 'MN', zipCode: '56537', county: 'Fergus Falls County'},
  { name: 'Fertile Public Library', url: 'https://www.fertilelibrary.org', eventsUrl: 'https://www.fertilelibrary.org/events', city: 'Fertile', state: 'MN', zipCode: '00000', county: 'Fertile County'},
  { name: 'Great River Regional Library - Foley', url: 'https://www.foleylibrary.org', eventsUrl: 'https://www.foleylibrary.org/events', city: 'Foley', state: 'MN', zipCode: '00000', county: 'Foley County'},
  { name: 'Hardwood Creek Library', url: 'https://www.forestlakelibrary.org', eventsUrl: 'https://www.forestlakelibrary.org/events', city: 'Forest Lake', state: 'MN', zipCode: '55025', county: 'Forest Lake County'},
  { name: 'Fosston Public Library', url: 'https://www.fosstonlibrary.org', eventsUrl: 'https://www.fosstonlibrary.org/events', city: 'Fosston', state: 'MN', zipCode: '00000', county: 'Fosston County'},
  { name: 'Mississippi Branch Library', url: 'https://www.fridleylibrary.org', eventsUrl: 'https://www.fridleylibrary.org/events', city: 'Fridley', state: 'MN', zipCode: '00000', county: 'Fridley County'},
  { name: 'Fulda Memorial Library', url: 'https://www.fuldalibrary.org', eventsUrl: 'https://www.fuldalibrary.org/events', city: 'Fulda', state: 'MN', zipCode: '56131', county: 'Fulda County'},
  { name: 'Gaylord Public Library', url: 'https://www.gaylordlibrary.org', eventsUrl: 'https://www.gaylordlibrary.org/events', city: 'Gaylord', state: 'MN', zipCode: '00000', county: 'Gaylord County'},
  { name: 'Gibbon Public Library', url: 'https://www.gibbonlibrary.org', eventsUrl: 'https://www.gibbonlibrary.org/events', city: 'Gibbon', state: 'MN', zipCode: '00000', county: 'Gibbon County'},
  { name: 'Gilbert Public Library', url: 'https://www.gilbertlibrary.org', eventsUrl: 'https://www.gilbertlibrary.org/events', city: 'Gilbert', state: 'MN', zipCode: '55741', county: 'Gilbert County'},
  { name: 'Glencoe Public Library', url: 'https://www.glencoelibrary.org', eventsUrl: 'https://www.glencoelibrary.org/events', city: 'Glencoe', state: 'MN', zipCode: '00000', county: 'Glencoe County'},
  { name: 'Glenwood Public Library', url: 'https://www.glenwoodlibrary.org', eventsUrl: 'https://www.glenwoodlibrary.org/events', city: 'Glenwood', state: 'MN', zipCode: '56334', county: 'Glenwood County'},
  { name: 'Hennepin County Library - Golden Valley', url: 'https://www.goldenvalleylibrary.org', eventsUrl: 'https://www.goldenvalleylibrary.org/events', city: 'Golden Valley', state: 'MN', zipCode: '55427', county: 'Golden Valley County'},
  { name: 'Graceville Public Library', url: 'https://www.gracevillelibrary.org', eventsUrl: 'https://www.gracevillelibrary.org/events', city: 'Graceville', state: 'MN', zipCode: '00000', county: 'Graceville County'},
  { name: 'Grand Marais Public Library', url: 'https://www.grandmaraislibrary.org', eventsUrl: 'https://www.grandmaraislibrary.org/events', city: 'Grand Marais', state: 'MN', zipCode: '55604', county: 'Grand Marais County'},
  { name: 'Grand Meadow Public Library', url: 'https://www.grandmeadowlibrary.org', eventsUrl: 'https://www.grandmeadowlibrary.org/events', city: 'Grand Meadow', state: 'MN', zipCode: '55936', county: 'Grand Meadow County'},
  { name: 'Grand Rapids Area Library', url: 'https://www.grandrapidslibrary.org', eventsUrl: 'https://www.grandrapidslibrary.org/events', city: 'Grand Rapids', state: 'MN', zipCode: '55744', county: 'Grand Rapids County'},
  { name: 'Granite Falls Public Library', url: 'https://www.granitefallslibrary.org', eventsUrl: 'https://www.granitefallslibrary.org/events', city: 'Granite Falls', state: 'MN', zipCode: '00000', county: 'Granite Falls County'},
  { name: 'Greenbush Public Library', url: 'https://www.greenbushlibrary.org', eventsUrl: 'https://www.greenbushlibrary.org/events', city: 'Greenbush', state: 'MN', zipCode: '00000', county: 'Greenbush County'},
  { name: 'Great River Regional Library - Grey Eagle', url: 'https://www.greyeaglelibrary.org', eventsUrl: 'https://www.greyeaglelibrary.org/events', city: 'Grey Eagle', state: 'MN', zipCode: '00000', county: 'Grey Eagle County'},
  { name: 'Grove City Public Library', url: 'https://www.grovecitylibrary.org', eventsUrl: 'https://www.grovecitylibrary.org/events', city: 'Grove City', state: 'MN', zipCode: '00000', county: 'Grove City County'},
  { name: 'Hallock Public Library', url: 'https://www.hallocklibrary.org', eventsUrl: 'https://www.hallocklibrary.org/events', city: 'Hallock', state: 'MN', zipCode: '00000', county: 'Hallock County'},
  { name: 'North Central Branch Library', url: 'https://www.hamlakelibrary.org', eventsUrl: 'https://www.hamlakelibrary.org/events', city: 'Ham Lake', state: 'MN', zipCode: '00000', county: 'Ham Lake County'},
  { name: 'Hancock Community Library', url: 'https://www.hancocklibrary.org', eventsUrl: 'https://www.hancocklibrary.org/events', city: 'Hancock', state: 'MN', zipCode: '56244', county: 'Hancock County'},
  { name: 'Hanska Public Library', url: 'https://www.hanskalibrary.org', eventsUrl: 'https://www.hanskalibrary.org/events', city: 'Hanska', state: 'MN', zipCode: '56041', county: 'Hanska County'},
  { name: 'Harmony Public Library', url: 'https://www.harmonylibrary.org', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Harmony', state: 'MN', zipCode: '55939', county: 'Harmony County'},
  { name: 'Pleasant Hill Library', url: 'https://www.hastingslibrary.org', eventsUrl: 'https://www.hastingslibrary.org/events', city: 'Hastings', state: 'MN', zipCode: '00000', county: 'Hastings County'},
  { name: 'Hawley Public Library', url: 'https://www.hawleylibrary.org', eventsUrl: 'https://www.hawleylibrary.org/events', city: 'Hawley', state: 'MN', zipCode: '00000', county: 'Hawley County'},
  { name: 'Hector Public Library', url: 'https://www.hectorlibrary.org', eventsUrl: 'https://www.hectorlibrary.org/events', city: 'Hector', state: 'MN', zipCode: '00000', county: 'Hector County'},
  { name: 'Henderson Public Library', url: 'https://www.hendersonlibrary.org', eventsUrl: 'https://www.hendersonlibrary.org/events', city: 'Henderson', state: 'MN', zipCode: '00000', county: 'Henderson County'},
  { name: 'Hendricks Siverson Public Library', url: 'https://www.hendrickslibrary.org', eventsUrl: 'https://www.hendrickslibrary.org/events', city: 'Hendricks', state: 'MN', zipCode: '56136', county: 'Hendricks County'},
  { name: 'Heron Lake Public Library', url: 'https://www.heronlakelibrary.org', eventsUrl: 'https://www.heronlakelibrary.org/events', city: 'Heron Lake', state: 'MN', zipCode: '00000', county: 'Heron Lake County'},
  { name: 'Hibbing Public Library', url: 'https://www.hibbinglibrary.org', eventsUrl: 'https://www.hibbinglibrary.org/events', city: 'Hibbing', state: 'MN', zipCode: '55746', county: 'Hibbing County'},
  { name: 'Hinckley Public Library', url: 'https://www.hinckleylibrary.org', eventsUrl: 'https://www.hinckleylibrary.org/events', city: 'Hinckley', state: 'MN', zipCode: '00000', county: 'Hinckley County'},
  { name: 'Hokah Public Library', url: 'https://www.hokahlibrary.org', eventsUrl: 'https://www.hokahlibrary.org/events', city: 'Hokah', state: 'MN', zipCode: '55941', county: 'Hokah County'},
  { name: 'Hennepin County Library - Hopkins', url: 'https://www.hopkinslibrary.org', eventsUrl: 'https://www.hopkinslibrary.org/events', city: 'Hopkins', state: 'MN', zipCode: '55343', county: 'Hopkins County'},
  { name: 'Houston Public Library', url: 'https://www.houstonlibrary.org', eventsUrl: 'https://www.houstonlibrary.org/events', city: 'Houston', state: 'MN', zipCode: '55943', county: 'Houston County'},
  { name: 'Great River Regional Library - Howard Lake', url: 'https://www.howardlakelibrary.org', eventsUrl: 'https://www.howardlakelibrary.org/events', city: 'Howard Lake', state: 'MN', zipCode: '00000', county: 'Howard Lake County'},
  { name: 'Hoyt Lakes Public Library', url: 'https://www.hoytlakeslibrary.org', eventsUrl: 'https://www.hoytlakeslibrary.org/events', city: 'Hoyt Lakes', state: 'MN', zipCode: '55750', county: 'Hoyt Lakes County'},
  { name: 'Hutchinson Public Library', url: 'https://www.hutchinsonlibrary.org', eventsUrl: 'https://www.hutchinsonlibrary.org/events', city: 'Hutchinson', state: 'MN', zipCode: '00000', county: 'Hutchinson County'},
  { name: 'International Falls Public Library', url: 'https://www.internationalfallslibrary.org', eventsUrl: 'https://www.internationalfallslibrary.org/events', city: 'International Falls', state: 'MN', zipCode: '56649', county: 'International Falls County'},
  { name: 'Inver Glen Library', url: 'https://www.invergroveheightslibrary.org', eventsUrl: 'https://www.invergroveheightslibrary.org/events', city: 'Inver Grove Heights', state: 'MN', zipCode: '00000', county: 'Inver Grove Heights County'},
  { name: 'Mille Lacs Community Library', url: 'https://www.islelibrary.org', eventsUrl: 'https://www.islelibrary.org/events', city: 'Isle', state: 'MN', zipCode: '00000', county: 'Isle County'},
  { name: 'Ivanhoe Public Library', url: 'https://www.ivanhoelibrary.org', eventsUrl: 'https://www.ivanhoelibrary.org/events', city: 'Ivanhoe', state: 'MN', zipCode: '56142', county: 'Ivanhoe County'},
  { name: 'Jackson County Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'MN', zipCode: '56143', county: 'Jackson County'},
  { name: 'Janesville Public Library', url: 'https://www.janesvillelibrary.org', eventsUrl: 'https://www.janesvillelibrary.org/events', city: 'Janesville', state: 'MN', zipCode: '00000', county: 'Janesville County'},
  { name: 'Jordan Branch Library', url: 'https://www.jordanlibrary.org', eventsUrl: 'https://www.jordanlibrary.org/events', city: 'Jordan', state: 'MN', zipCode: '00000', county: 'Jordan County'},
  { name: 'Kasson Public Library', url: 'https://www.kassonlibrary.org', eventsUrl: 'https://www.kassonlibrary.org/events', city: 'Kasson', state: 'MN', zipCode: '55944', county: 'Kasson County'},
  { name: 'Keewatin Public Library', url: 'https://www.keewatinlibrary.org', eventsUrl: 'https://www.keewatinlibrary.org/events', city: 'Keewatin', state: 'MN', zipCode: '55753', county: 'Keewatin County'},
  { name: 'Kenyon Public Library', url: 'https://www.kenyonlibrary.org', eventsUrl: 'https://www.kenyonlibrary.org/events', city: 'Kenyon', state: 'MN', zipCode: '55946', county: 'Kenyon County'},
  { name: 'Kerkhoven Public Library', url: 'https://www.kerkhovenlibrary.org', eventsUrl: 'https://www.kerkhovenlibrary.org/events', city: 'Kerkhoven', state: 'MN', zipCode: '00000', county: 'Kerkhoven County'},
  { name: 'Great River Regional Library - Kimball', url: 'https://www.kimballlibrary.org', eventsUrl: 'https://www.kimballlibrary.org/events', city: 'Kimball', state: 'MN', zipCode: '00000', county: 'Kimball County'},
  { name: 'Kinney Public Library', url: 'https://www.kinneylibrary.org', eventsUrl: 'https://www.kinneylibrary.org/events', city: 'Kinney', state: 'MN', zipCode: '55758', county: 'Kinney County'},
  { name: 'La Crescent Public Library', url: 'https://www.lacrescentlibrary.org', eventsUrl: 'https://www.lacrescentlibrary.org/events', city: 'La Crescent', state: 'MN', zipCode: '55947', county: 'La Crescent County'},
  { name: 'Lake Benton Public Library', url: 'https://www.lakebentonlibrary.org', eventsUrl: 'https://www.lakebentonlibrary.org/events', city: 'Lake Benton', state: 'MN', zipCode: '56149', county: 'Lake Benton County'},
  { name: 'Lake City Public Library', url: 'https://www.lakecitylibrary.org', eventsUrl: 'https://www.lakecitylibrary.org/events', city: 'Lake City', state: 'MN', zipCode: '55041', county: 'Lake City County'},
  { name: 'Lake Crystal Public Library', url: 'https://www.lakecrystallibrary.org', eventsUrl: 'https://www.lakecrystallibrary.org/events', city: 'Lake Crystal', state: 'MN', zipCode: '00000', county: 'Lake Crystal County'},
  { name: 'Lake Elmo Library', url: 'https://www.lakeelmolibrary.org', eventsUrl: 'https://www.lakeelmolibrary.org/events', city: 'Lake Elmo', state: 'MN', zipCode: '55042', county: 'Lake Elmo County'},
  { name: 'Lake Lillian Public Library', url: 'https://www.lakelillianlibrary.org', eventsUrl: 'https://www.lakelillianlibrary.org/events', city: 'Lake Lillian', state: 'MN', zipCode: '00000', county: 'Lake Lillian County'},
  { name: 'Lakefield Public Library', url: 'https://www.lakefieldlibrary.org', eventsUrl: 'https://www.lakefieldlibrary.org/events', city: 'Lakefield', state: 'MN', zipCode: '00000', county: 'Lakefield County'},
  { name: 'Valley Library', url: 'https://www.lakelandlibrary.org', eventsUrl: 'https://www.lakelandlibrary.org/events', city: 'Lakeland', state: 'MN', zipCode: '55043', county: 'Lakeland County'},
  { name: 'Heritage Library', url: 'https://www.lakevillelibrary.org', eventsUrl: 'https://www.lakevillelibrary.org/events', city: 'Lakeville', state: 'MN', zipCode: '00000', county: 'Lakeville County'},
  { name: 'Lamberton Public Library', url: 'https://www.lambertonlibrary.org', eventsUrl: 'https://www.lambertonlibrary.org/events', city: 'Lamberton', state: 'MN', zipCode: '56152', county: 'Lamberton County'},
  { name: 'Lanesboro Public Library', url: 'https://www.lanesborolibrary.org', eventsUrl: 'https://www.lanesborolibrary.org/events', city: 'Lanesboro', state: 'MN', zipCode: '55949', county: 'Lanesboro County'},
  { name: 'Le Center Public Library', url: 'https://www.lecenterlibrary.org', eventsUrl: 'https://www.lecenterlibrary.org/events', city: 'Le Center', state: 'MN', zipCode: '00000', county: 'Le Center County'},
  { name: 'Le Roy Public Library', url: 'https://www.leroylibrary.org', eventsUrl: 'https://www.leroylibrary.org/events', city: 'Le Roy', state: 'MN', zipCode: '55951', county: 'Le Roy County'},
  { name: 'Le Sueur Public Library', url: 'https://www.lesueurlibrary.org', eventsUrl: 'https://www.lesueurlibrary.org/events', city: 'Le Sueur', state: 'MN', zipCode: '00000', county: 'Le Sueur County'},
  { name: 'Lewisville Branch Library', url: 'https://www.lewisvillelibrary.org', eventsUrl: 'https://www.lewisvillelibrary.org/events', city: 'Lewisville', state: 'MN', zipCode: '00000', county: 'Lewisville County'},
  { name: 'Lindstrom Public Library', url: 'https://www.lindstromlibrary.org', eventsUrl: 'https://www.lindstromlibrary.org/events', city: 'Lindstrom', state: 'MN', zipCode: '00000', county: 'Lindstrom County'},
  { name: 'Litchfield Public Library', url: 'https://www.litchfieldlibrary.org', eventsUrl: 'https://www.litchfieldlibrary.org/events', city: 'Litchfield', state: 'MN', zipCode: '00000', county: 'Litchfield County'},
  { name: 'Great River Regional Library - Little Falls', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'MN', zipCode: '00000', county: 'Little Falls County'},
  { name: 'Hennepin County Library - Long Lake', url: 'https://www.longlakelibrary.org', eventsUrl: 'https://www.longlakelibrary.org/events', city: 'Long Lake', state: 'MN', zipCode: '55356', county: 'Long Lake County'},
  { name: 'Great River Regional Library - Long Prairie', url: 'https://www.longprairielibrary.org', eventsUrl: 'https://www.longprairielibrary.org/events', city: 'Long Prairie', state: 'MN', zipCode: '00000', county: 'Long Prairie County'},
  { name: 'Margaret Welch Memorial Library', url: 'https://www.longvillelibrary.org', eventsUrl: 'https://www.longvillelibrary.org/events', city: 'Longville', state: 'MN', zipCode: '00000', county: 'Longville County'},
  { name: 'Rock County Community Library', url: 'https://www.luvernelibrary.org', eventsUrl: 'https://www.luvernelibrary.org/events', city: 'Luverne', state: 'MN', zipCode: '56156', county: 'Luverne County'},
  { name: 'Mabel Public Library', url: 'https://www.mabellibrary.org', eventsUrl: 'https://www.mabellibrary.org/events', city: 'Mabel', state: 'MN', zipCode: '55954', county: 'Mabel County'},
  { name: 'Madelia Branch Library', url: 'https://www.madelialibrary.org', eventsUrl: 'https://www.madelialibrary.org/events', city: 'Madelia', state: 'MN', zipCode: '00000', county: 'Madelia County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'MN', zipCode: '00000', county: 'Madison County'},
  { name: 'Mahnomen Public Library', url: 'https://www.mahnomenlibrary.org', eventsUrl: 'https://www.mahnomenlibrary.org/events', city: 'Mahnomen', state: 'MN', zipCode: '00000', county: 'Mahnomen County'},
  { name: 'Wildwood Library', url: 'https://www.mahtomedilibrary.org', eventsUrl: 'https://www.mahtomedilibrary.org/events', city: 'Mahtomedi', state: 'MN', zipCode: '55115', county: 'Mahtomedi County'},
  { name: 'Hennepin County Library - Maple Grove', url: 'https://www.maplegrovelibrary.org', eventsUrl: 'https://www.maplegrovelibrary.org/events', city: 'Maple Grove', state: 'MN', zipCode: '55369', county: 'Maple Grove County'},
  { name: 'Hennepin County Library - Maple Plain', url: 'https://www.mapleplainlibrary.org', eventsUrl: 'https://www.mapleplainlibrary.org/events', city: 'Maple Plain', state: 'MN', zipCode: '55359', county: 'Maple Plain County'},
  { name: 'Mapleton Public Library', url: 'https://www.mapletonlibrary.org', eventsUrl: 'https://www.mapletonlibrary.org/events', city: 'Mapleton', state: 'MN', zipCode: '00000', county: 'Mapleton County'},
  { name: 'Maplewood Library', url: 'https://www.maplewoodlibrary.org', eventsUrl: 'https://www.maplewoodlibrary.org/events', city: 'Maplewood', state: 'MN', zipCode: '00000', county: 'Maplewood County'},
  { name: 'Marble Public Library', url: 'https://www.marblelibrary.org', eventsUrl: 'https://www.marblelibrary.org/events', city: 'Marble', state: 'MN', zipCode: '55764', county: 'Marble County'},
  { name: 'Marine Community Library', url: 'https://www.marineonstcroixlibrary.org', eventsUrl: 'https://www.marineonstcroixlibrary.org/events', city: 'Marine on St Croix', state: 'MN', zipCode: '55047', county: 'Marine on St Croix County'},
  { name: 'Marshall-Lyon County Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'MN', zipCode: '56258', county: 'Marshall County'},
  { name: 'Maynard Public Library', url: 'https://www.maynardlibrary.org', eventsUrl: 'https://www.maynardlibrary.org/events', city: 'Maynard', state: 'MN', zipCode: '00000', county: 'Maynard County'},
  { name: 'Mcgregor Public Library', url: 'https://www.mcgregorlibrary.org', eventsUrl: 'https://www.mcgregorlibrary.org/events', city: 'Mcgregor', state: 'MN', zipCode: '00000', county: 'Mcgregor County'},
  { name: 'Mcintosh Public Library', url: 'https://www.mcintoshlibrary.org', eventsUrl: 'https://www.mcintoshlibrary.org/events', city: 'Mcintosh', state: 'MN', zipCode: '00000', county: 'Mcintosh County'},
  { name: 'Mckinley Public Library', url: 'https://www.mckinleylibrary.org', eventsUrl: 'https://www.mckinleylibrary.org/events', city: 'Mckinley', state: 'MN', zipCode: '55741', county: 'Mckinley County'},
  { name: 'Great River Regional Library - Melrose', url: 'https://www.melroselibrary.org', eventsUrl: 'https://www.melroselibrary.org/events', city: 'Melrose', state: 'MN', zipCode: '00000', county: 'Melrose County'},
  { name: 'Milaca Community Library', url: 'https://www.milacalibrary.org', eventsUrl: 'https://www.milacalibrary.org/events', city: 'Milaca', state: 'MN', zipCode: '00000', county: 'Milaca County'},
  { name: 'Milan Public Library', url: 'https://www.milanlibrary.org', eventsUrl: 'https://www.milanlibrary.org/events', city: 'Milan', state: 'MN', zipCode: '00000', county: 'Milan County'},
  { name: 'Minneota Public Library', url: 'https://www.minneotalibrary.org', eventsUrl: 'https://www.minneotalibrary.org/events', city: 'Minneota', state: 'MN', zipCode: '56264', county: 'Minneota County'},
  { name: 'Chippewa County Public Library', url: 'https://www.montevideolibrary.org', eventsUrl: 'https://www.montevideolibrary.org/events', city: 'Montevideo', state: 'MN', zipCode: '56265', county: 'Montevideo County'},
  { name: 'Montgomery Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'MN', zipCode: '00000', county: 'Montgomery County'},
  { name: 'Great River Regional Library - Monticello', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'MN', zipCode: '00000', county: 'Monticello County'},
  { name: 'Moose Lake Public Library', url: 'https://www.mooselakelibrary.org', eventsUrl: 'https://www.mooselakelibrary.org/events', city: 'Moose Lake', state: 'MN', zipCode: '55767', county: 'Moose Lake County'},
  { name: 'Mora Public Library', url: 'https://www.moralibrary.org', eventsUrl: 'https://www.moralibrary.org/events', city: 'Mora', state: 'MN', zipCode: '00000', county: 'Mora County'},
  { name: 'Morgan Public Library', url: 'https://www.morganlibrary.org', eventsUrl: 'https://www.morganlibrary.org/events', city: 'Morgan', state: 'MN', zipCode: '56266', county: 'Morgan County'},
  { name: 'Morris Public Library', url: 'https://www.morrislibrary.org', eventsUrl: 'https://www.morrislibrary.org/events', city: 'Morris', state: 'MN', zipCode: '56267', county: 'Morris County'},
  { name: 'Hennepin County Library - Westonka', url: 'https://www.moundlibrary.org', eventsUrl: 'https://www.moundlibrary.org/events', city: 'Mound', state: 'MN', zipCode: '55364', county: 'Mound County'},
  { name: 'Mounds View Library', url: 'https://www.moundsviewlibrary.org', eventsUrl: 'https://www.moundsviewlibrary.org/events', city: 'Mounds View', state: 'MN', zipCode: '00000', county: 'Mounds View County'},
  { name: 'Arrowhead Library System', url: 'https://www.mountainironlibrary.org', eventsUrl: 'https://www.mountainironlibrary.org/events', city: 'Mountain Iron', state: 'MN', zipCode: '55768', county: 'Mountain Iron County'},
  { name: 'Mountain Lake Public Library', url: 'https://www.mountainlakelibrary.org', eventsUrl: 'https://www.mountainlakelibrary.org/events', city: 'Mountain Lake', state: 'MN', zipCode: '56159', county: 'Mountain Lake County'},
  { name: 'New London Public Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'MN', zipCode: '00000', county: 'New London County'},
  { name: 'New Market Branch Library', url: 'https://www.newmarketlibrary.org', eventsUrl: 'https://www.newmarketlibrary.org/events', city: 'New Market', state: 'MN', zipCode: '00000', county: 'New Market County'},
  { name: 'New Prague Branch Library', url: 'https://www.newpraguelibrary.org', eventsUrl: 'https://www.newpraguelibrary.org/events', city: 'New Prague', state: 'MN', zipCode: '56071', county: 'New Prague County'},
  { name: 'New Richland Public Library', url: 'https://www.newrichlandlibrary.org', eventsUrl: 'https://www.newrichlandlibrary.org/events', city: 'New Richland', state: 'MN', zipCode: '00000', county: 'New Richland County'},
  { name: 'New Ulm Public Library', url: 'https://www.newulmlibrary.org', eventsUrl: 'https://www.newulmlibrary.org/events', city: 'New Ulm', state: 'MN', zipCode: '56073', county: 'New Ulm County'},
  { name: 'New York Mills Public Library', url: 'https://www.newyorkmillslibrary.org', eventsUrl: 'https://www.newyorkmillslibrary.org/events', city: 'New York Mills', state: 'MN', zipCode: '56567', county: 'New York Mills County'},
  { name: 'Newport Library and Community Center', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'MN', zipCode: '55055', county: 'Newport County'},
  { name: 'North Branch Area Library', url: 'https://www.northbranchlibrary.org', eventsUrl: 'https://www.northbranchlibrary.org/events', city: 'North Branch', state: 'MN', zipCode: '00000', county: 'North Branch County'},
  { name: 'North Mankato Taylor Library', url: 'https://www.northmankatolibrary.org', eventsUrl: 'https://www.northmankatolibrary.org/events', city: 'North Mankato', state: 'MN', zipCode: '56003', county: 'North Mankato County'},
  { name: 'North St. Paul Library', url: 'https://www.northstpaullibrary.org', eventsUrl: 'https://www.northstpaullibrary.org/events', city: 'North St. Paul', state: 'MN', zipCode: '55109', county: 'North St. Paul County'},
  { name: 'Northfield Public Library', url: 'https://www.northfieldlibrary.org', eventsUrl: 'https://www.northfieldlibrary.org/events', city: 'Northfield', state: 'MN', zipCode: '55057', county: 'Northfield County'},
  { name: 'Norwood Young America Public Library', url: 'https://www.norwoodlibrary.org', eventsUrl: 'https://www.norwoodlibrary.org/events', city: 'Norwood', state: 'MN', zipCode: '00000', county: 'Norwood County'},
  { name: 'Oakdale Library', url: 'https://www.oakdalelibrary.org', eventsUrl: 'https://www.oakdalelibrary.org/events', city: 'Oakdale', state: 'MN', zipCode: '55128', county: 'Oakdale County'},
  { name: 'Olivia Public Library', url: 'https://www.olivialibrary.org', eventsUrl: 'https://www.olivialibrary.org/events', city: 'Olivia', state: 'MN', zipCode: '00000', county: 'Olivia County'},
  { name: 'Ortonville Public Library', url: 'https://www.ortonvillelibrary.org', eventsUrl: 'https://www.ortonvillelibrary.org/events', city: 'Ortonville', state: 'MN', zipCode: '00000', county: 'Ortonville County'},
  { name: 'Hennepin County Library - Osseo', url: 'https://www.osseolibrary.org', eventsUrl: 'https://www.osseolibrary.org/events', city: 'Osseo', state: 'MN', zipCode: '55369', county: 'Osseo County'},
  { name: 'Owatonna-Steele County Library', url: 'https://www.owatonnalibrary.org', eventsUrl: 'https://www.owatonnalibrary.org/events', city: 'Owatonna', state: 'MN', zipCode: '55060', county: 'Owatonna County'},
  { name: 'Park Rapids Public Library', url: 'https://www.parkrapidslibrary.org', eventsUrl: 'https://www.parkrapidslibrary.org/events', city: 'Park Rapids', state: 'MN', zipCode: '00000', county: 'Park Rapids County'},
  { name: 'Great River Regional Library - Paynesville', url: 'https://www.paynesvillelibrary.org', eventsUrl: 'https://www.paynesvillelibrary.org/events', city: 'Paynesville', state: 'MN', zipCode: '00000', county: 'Paynesville County'},
  { name: 'Pelican Rapids Public Library A Multicultural Learning Cent', url: 'https://www.pelicanrapidslibrary.org', eventsUrl: 'https://www.pelicanrapidslibrary.org/events', city: 'Pelican Rapids', state: 'MN', zipCode: '56572', county: 'Pelican Rapids County'},
  { name: 'Perham Area Public Library', url: 'https://www.perhamlibrary.org', eventsUrl: 'https://www.perhamlibrary.org/events', city: 'Perham', state: 'MN', zipCode: '56573', county: 'Perham County'},
  { name: 'Great River Regional Library - Pierz', url: 'https://www.pierzlibrary.org', eventsUrl: 'https://www.pierzlibrary.org/events', city: 'Pierz', state: 'MN', zipCode: '00000', county: 'Pierz County'},
  { name: 'Pine City Public Library', url: 'https://www.pinecitylibrary.org', eventsUrl: 'https://www.pinecitylibrary.org/events', city: 'Pine City', state: 'MN', zipCode: '00000', county: 'Pine City County'},
  { name: 'Pine Island Van Horn Public Library', url: 'https://www.pineislandlibrary.org', eventsUrl: 'https://www.pineislandlibrary.org/events', city: 'Pine Island', state: 'MN', zipCode: '55963', county: 'Pine Island County'},
  { name: 'Kitchigami Regional Library', url: 'https://www.pineriverlibrary.org', eventsUrl: 'https://www.pineriverlibrary.org/events', city: 'Pine River', state: 'MN', zipCode: '56474', county: 'Pine River County'},
  { name: 'Pipestone Meinders Community Library', url: 'https://www.pipestonelibrary.org', eventsUrl: 'https://www.pipestonelibrary.org/events', city: 'Pipestone', state: 'MN', zipCode: '56164', county: 'Pipestone County'},
  { name: 'Plainview Public Library', url: 'https://www.plainviewlibrary.org', eventsUrl: 'https://www.plainviewlibrary.org/events', city: 'Plainview', state: 'MN', zipCode: '55964', county: 'Plainview County'},
  { name: 'Preston Public Library', url: 'https://www.prestonlibrary.org', eventsUrl: 'https://www.prestonlibrary.org/events', city: 'Preston', state: 'MN', zipCode: '55965', county: 'Preston County'},
  { name: 'Princeton Area Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'MN', zipCode: '00000', county: 'Princeton County'},
  { name: 'Prior Lake Branch Library', url: 'https://www.priorlakelibrary.org', eventsUrl: 'https://www.priorlakelibrary.org/events', city: 'Prior Lake', state: 'MN', zipCode: '00000', county: 'Prior Lake County'},
  { name: 'Raymond Public Library', url: 'https://www.raymondlibrary.org', eventsUrl: 'https://www.raymondlibrary.org/events', city: 'Raymond', state: 'MN', zipCode: '00000', county: 'Raymond County'},
  { name: 'Red Lake Falls Public Library', url: 'https://www.redlakefallslibrary.org', eventsUrl: 'https://www.redlakefallslibrary.org/events', city: 'Red Lake Falls', state: 'MN', zipCode: '00000', county: 'Red Lake Falls County'},
  { name: 'Red Wing Public Library', url: 'https://www.redwinglibrary.org', eventsUrl: 'https://www.redwinglibrary.org/events', city: 'Red Wing', state: 'MN', zipCode: '55066', county: 'Red Wing County'},
  { name: 'Redwood Falls Public Library', url: 'https://www.redwoodfallslibrary.org', eventsUrl: 'https://www.redwoodfallslibrary.org/events', city: 'Redwood Falls', state: 'MN', zipCode: '56283', county: 'Redwood Falls County'},
  { name: 'Renville Public Library', url: 'https://www.renvillelibrary.org', eventsUrl: 'https://www.renvillelibrary.org/events', city: 'Renville', state: 'MN', zipCode: '00000', county: 'Renville County'},
  { name: 'Hennepin County Library - Augsburg Park', url: 'https://www.richfieldlibrary.org', eventsUrl: 'https://www.richfieldlibrary.org/events', city: 'Richfield', state: 'MN', zipCode: '55423', county: 'Richfield County'},
  { name: 'Great River Regional Library - Richmond', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'MN', zipCode: '00000', county: 'Richmond County'},
  { name: 'Great River Regional Library - Rockford', url: 'https://www.rockfordlibrary.org', eventsUrl: 'https://www.rockfordlibrary.org/events', city: 'Rockford', state: 'MN', zipCode: '55373', county: 'Rockford County'},
  { name: 'Hennepin County Library - Rogers', url: 'https://www.rogerslibrary.org', eventsUrl: 'https://www.rogerslibrary.org/events', city: 'Rogers', state: 'MN', zipCode: '55374', county: 'Rogers County'},
  { name: 'Roseau Public Library', url: 'https://www.roseaulibrary.org', eventsUrl: 'https://www.roseaulibrary.org/events', city: 'Roseau', state: 'MN', zipCode: '00000', county: 'Roseau County'},
  { name: 'Robert Trail Library', url: 'https://www.rosemountlibrary.org', eventsUrl: 'https://www.rosemountlibrary.org/events', city: 'Rosemount', state: 'MN', zipCode: '55068', county: 'Rosemount County'},
  { name: 'Great River Regional Library - Royalton', url: 'https://www.royaltonlibrary.org', eventsUrl: 'https://www.royaltonlibrary.org/events', city: 'Royalton', state: 'MN', zipCode: '00000', county: 'Royalton County'},
  { name: 'Rush City Public Library', url: 'https://www.rushcitylibrary.org', eventsUrl: 'https://www.rushcitylibrary.org/events', city: 'Rush City', state: 'MN', zipCode: '00000', county: 'Rush City County'},
  { name: 'Rushford Public Library', url: 'https://www.rushfordlibrary.org', eventsUrl: 'https://www.rushfordlibrary.org/events', city: 'Rushford', state: 'MN', zipCode: '55971', county: 'Rushford County'},
  { name: 'Arlington Hills Branch Library', url: 'https://www.saintpaullibrary.org', eventsUrl: 'https://www.saintpaullibrary.org/events', city: 'Saint Paul', state: 'MN', zipCode: '00000', county: 'Saint Paul County'},
  { name: 'St. Peter Public Library', url: 'https://www.saintpeterlibrary.org', eventsUrl: 'https://www.saintpeterlibrary.org/events', city: 'Saint Peter', state: 'MN', zipCode: '56082', county: 'Saint Peter County'},
  { name: 'Sandstone Community Library', url: 'https://www.sandstonelibrary.org', eventsUrl: 'https://www.sandstonelibrary.org/events', city: 'Sandstone', state: 'MN', zipCode: '00000', county: 'Sandstone County'},
  { name: 'Great River Regional Library - Sauk (Bryant Public Library)', url: 'https://www.saukcentrelibrary.org', eventsUrl: 'https://www.saukcentrelibrary.org/events', city: 'Sauk Centre', state: 'MN', zipCode: '00000', county: 'Sauk Centre County'},
  { name: 'Shakopee Branch Library', url: 'https://www.shakopeelibrary.org', eventsUrl: 'https://www.shakopeelibrary.org/events', city: 'Shakopee', state: 'MN', zipCode: '00000', county: 'Shakopee County'},
  { name: 'Sherburn Branch Library', url: 'https://www.sherburnlibrary.org', eventsUrl: 'https://www.sherburnlibrary.org/events', city: 'Sherburn', state: 'MN', zipCode: '00000', county: 'Sherburn County'},
  { name: 'Ramsey County Library', url: 'https://www.shoreviewlibrary.org', eventsUrl: 'https://www.shoreviewlibrary.org/events', city: 'Shoreview', state: 'MN', zipCode: '55126', county: 'Shoreview County'},
  { name: 'Silver Bay Public Library', url: 'https://www.silverbaylibrary.org', eventsUrl: 'https://www.silverbaylibrary.org/events', city: 'Silver Bay', state: 'MN', zipCode: '55614', county: 'Silver Bay County'},
  { name: 'Slayton Public Library', url: 'https://www.slaytonlibrary.org', eventsUrl: 'https://www.slaytonlibrary.org/events', city: 'Slayton', state: 'MN', zipCode: '56172', county: 'Slayton County'},
  { name: 'Sleepy Eye Dyckman Free Library', url: 'https://www.sleepyeyelibrary.org', eventsUrl: 'https://www.sleepyeyelibrary.org/events', city: 'Sleepy Eye', state: 'MN', zipCode: '56085', county: 'Sleepy Eye County'},
  { name: 'South Saint Paul Public Library', url: 'https://www.southstpaullibrary.org', eventsUrl: 'https://www.southstpaullibrary.org/events', city: 'South St Paul', state: 'MN', zipCode: '55075', county: 'South St Paul County'},
  { name: 'City Of South St. Paul Library', url: 'https://www.southstpaullibrary.org', eventsUrl: 'https://www.southstpaullibrary.org/events', city: 'South St. Paul', state: 'MN', zipCode: '55075', county: 'South St. Paul County'},
  { name: 'Spicer Public Library', url: 'https://www.spicerlibrary.org', eventsUrl: 'https://www.spicerlibrary.org/events', city: 'Spicer', state: 'MN', zipCode: '00000', county: 'Spicer County'},
  { name: 'Spring Grove Public Library', url: 'https://www.springgrovelibrary.org', eventsUrl: 'https://www.springgrovelibrary.org/events', city: 'Spring Grove', state: 'MN', zipCode: '55974', county: 'Spring Grove County'},
  { name: 'Spring Valley Public Library', url: 'https://www.springvalleylibrary.org', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'MN', zipCode: '55975', county: 'Spring Valley County'},
  { name: 'Springfield Public Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'MN', zipCode: '56087', county: 'Springfield County'},
  { name: 'Hennepin County Library - St. Anthony', url: 'https://www.stanthonylibrary.org', eventsUrl: 'https://www.stanthonylibrary.org/events', city: 'St Anthony', state: 'MN', zipCode: '55418', county: 'St Anthony County'},
  { name: 'Hennepin County Library - St. Bonifacius', url: 'https://www.stbonifaciuslibrary.org', eventsUrl: 'https://www.stbonifaciuslibrary.org/events', city: 'St Bonifacius', state: 'MN', zipCode: '55375', county: 'St Bonifacius County'},
  { name: 'Great River Regional Library - St. Cloud', url: 'https://www.stcloudlibrary.org', eventsUrl: 'https://www.stcloudlibrary.org/events', city: 'St Cloud', state: 'MN', zipCode: '56301', county: 'St Cloud County'},
  { name: 'St. Francis Branch Library', url: 'https://www.stfrancislibrary.org', eventsUrl: 'https://www.stfrancislibrary.org/events', city: 'St Francis', state: 'MN', zipCode: '00000', county: 'St Francis County'},
  { name: 'St. James-Watonwan County Library', url: 'https://www.stjameslibrary.org', eventsUrl: 'https://www.stjameslibrary.org/events', city: 'St James', state: 'MN', zipCode: '00000', county: 'St James County'},
  { name: 'Hennepin County Library - St. Louis Park', url: 'https://www.stlouisparklibrary.org', eventsUrl: 'https://www.stlouisparklibrary.org/events', city: 'St Louis Park', state: 'MN', zipCode: '55426', county: 'St Louis Park County'},
  { name: 'Roy Simms Community Library', url: 'https://www.stmichaellibrary.org', eventsUrl: 'https://www.stmichaellibrary.org/events', city: 'St Michael', state: 'MN', zipCode: '00000', county: 'St Michael County'},
  { name: 'St. Charles Public Library', url: 'https://www.stcharleslibrary.org', eventsUrl: 'https://www.stcharleslibrary.org/events', city: 'St. Charles', state: 'MN', zipCode: '55972', county: 'St. Charles County'},
  { name: 'Great River Regional Library - St. Michael', url: 'https://www.stmichaellibrary.org', eventsUrl: 'https://www.stmichaellibrary.org/events', city: 'St. Michael', state: 'MN', zipCode: '55376', county: 'St. Michael County'},
  { name: 'Great River Regional Library - Staples', url: 'https://www.stapleslibrary.org', eventsUrl: 'https://www.stapleslibrary.org/events', city: 'Staples', state: 'MN', zipCode: '00000', county: 'Staples County'},
  { name: 'Stewartville Public Library', url: 'https://www.stewartvillelibrary.org', eventsUrl: 'https://www.stewartvillelibrary.org/events', city: 'Stewartville', state: 'MN', zipCode: '55976', county: 'Stewartville County'},
  { name: 'Stillwater Public Library', url: 'https://www.stillwaterlibrary.org', eventsUrl: 'https://www.stillwaterlibrary.org/events', city: 'Stillwater', state: 'MN', zipCode: '55082', county: 'Stillwater County'},
  { name: 'Great River Regional Library - Swanville', url: 'https://www.swanvillelibrary.org', eventsUrl: 'https://www.swanvillelibrary.org/events', city: 'Swanville', state: 'MN', zipCode: '00000', county: 'Swanville County'},
  { name: 'Taylors Falls Public Library', url: 'https://www.taylorsfallslibrary.org', eventsUrl: 'https://www.taylorsfallslibrary.org/events', city: 'Taylors Falls', state: 'MN', zipCode: '55084', county: 'Taylors Falls County'},
  { name: 'Northwest Regional Library', url: 'https://www.thiefriverfallslibrary.org', eventsUrl: 'https://www.thiefriverfallslibrary.org/events', city: 'Thief River Falls', state: 'MN', zipCode: '56701', county: 'Thief River Falls County'},
  { name: 'Tracy Public Library', url: 'https://www.tracylibrary.org', eventsUrl: 'https://www.tracylibrary.org/events', city: 'Tracy', state: 'MN', zipCode: '56175', county: 'Tracy County'},
  { name: 'Trimont Branch Library', url: 'https://www.trimontlibrary.org', eventsUrl: 'https://www.trimontlibrary.org/events', city: 'Trimont', state: 'MN', zipCode: '00000', county: 'Trimont County'},
  { name: 'Truman Branch Library', url: 'https://www.trumanlibrary.org', eventsUrl: 'https://www.trumanlibrary.org/events', city: 'Truman', state: 'MN', zipCode: '00000', county: 'Truman County'},
  { name: 'Two Harbors Public Library', url: 'https://www.twoharborslibrary.org', eventsUrl: 'https://www.twoharborslibrary.org/events', city: 'Two Harbors', state: 'MN', zipCode: '55616', county: 'Two Harbors County'},
  { name: 'Tyler Public Library', url: 'https://www.tylerlibrary.org', eventsUrl: 'https://www.tylerlibrary.org/events', city: 'Tyler', state: 'MN', zipCode: '56178', county: 'Tyler County'},
  { name: 'Great River Regional Library - Upsala', url: 'https://www.upsalalibrary.org', eventsUrl: 'https://www.upsalalibrary.org/events', city: 'Upsala', state: 'MN', zipCode: '00000', county: 'Upsala County'},
  { name: 'Virginia Public Library', url: 'https://www.virginialibrary.org', eventsUrl: 'https://www.virginialibrary.org/events', city: 'Virginia', state: 'MN', zipCode: '55792', county: 'Virginia County'},
  { name: 'Wabasha Public Library', url: 'https://www.wabashalibrary.org', eventsUrl: 'https://www.wabashalibrary.org/events', city: 'Wabasha', state: 'MN', zipCode: '55981', county: 'Wabasha County'},
  { name: 'Wabasso Public Library', url: 'https://www.wabassolibrary.org', eventsUrl: 'https://www.wabassolibrary.org/events', city: 'Wabasso', state: 'MN', zipCode: '56293', county: 'Wabasso County'},
  { name: 'Waconia Public Library', url: 'https://www.waconialibrary.org', eventsUrl: 'https://www.waconialibrary.org/events', city: 'Waconia', state: 'MN', zipCode: '00000', county: 'Waconia County'},
  { name: 'Wadena Public Library', url: 'https://www.wadenalibrary.org', eventsUrl: 'https://www.wadenalibrary.org/events', city: 'Wadena', state: 'MN', zipCode: '00000', county: 'Wadena County'},
  { name: 'Great River Regional Library - Waite Park', url: 'https://www.waiteparklibrary.org', eventsUrl: 'https://www.waiteparklibrary.org/events', city: 'Waite Park', state: 'MN', zipCode: '00000', county: 'Waite Park County'},
  { name: 'Waldorf Public Library', url: 'https://www.waldorflibrary.org', eventsUrl: 'https://www.waldorflibrary.org/events', city: 'Waldorf', state: 'MN', zipCode: '00000', county: 'Waldorf County'},
  { name: 'Walker Public Library', url: 'https://www.walkerlibrary.org', eventsUrl: 'https://www.walkerlibrary.org/events', city: 'Walker', state: 'MN', zipCode: '00000', county: 'Walker County'},
  { name: 'Godel Memorial Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'MN', zipCode: '00000', county: 'Warren County'},
  { name: 'Warroad Public Library', url: 'https://www.warroadlibrary.org', eventsUrl: 'https://www.warroadlibrary.org/events', city: 'Warroad', state: 'MN', zipCode: '00000', county: 'Warroad County'},
  { name: 'Waseca-Le Sueur Regional Library', url: 'https://www.wasecalibrary.org', eventsUrl: 'https://www.wasecalibrary.org/events', city: 'Waseca', state: 'MN', zipCode: '56093', county: 'Waseca County'},
  { name: 'Watertown Library', url: 'https://www.watertownlibrary.org', eventsUrl: 'https://www.watertownlibrary.org/events', city: 'Watertown', state: 'MN', zipCode: '00000', county: 'Watertown County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'MN', zipCode: '00000', county: 'Waterville County'},
  { name: 'Hennepin County Library - Wayzata', url: 'https://www.wayzatalibrary.org', eventsUrl: 'https://www.wayzatalibrary.org/events', city: 'Wayzata', state: 'MN', zipCode: '55391', county: 'Wayzata County'},
  { name: 'Welcome Branch Library', url: 'https://www.welcomelibrary.org', eventsUrl: 'https://www.welcomelibrary.org/events', city: 'Welcome', state: 'MN', zipCode: '00000', county: 'Welcome County'},
  { name: 'Wells Public Library', url: 'https://www.wellslibrary.org', eventsUrl: 'https://www.wellslibrary.org/events', city: 'Wells', state: 'MN', zipCode: '56097', county: 'Wells County'},
  { name: 'West Concord Public Library', url: 'https://www.westconcordlibrary.org', eventsUrl: 'https://www.westconcordlibrary.org/events', city: 'West Concord', state: 'MN', zipCode: '55985', county: 'West Concord County'},
  { name: 'Wentworth Library', url: 'https://www.weststpaullibrary.org', eventsUrl: 'https://www.weststpaullibrary.org/events', city: 'West St. Paul', state: 'MN', zipCode: '00000', county: 'West St. Paul County'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'MN', zipCode: '56183', county: 'Westbrook County'},
  { name: 'Wheaton Community Library', url: 'https://www.wheatonlibrary.org', eventsUrl: 'https://www.wheatonlibrary.org/events', city: 'Wheaton', state: 'MN', zipCode: '56296', county: 'Wheaton County'},
  { name: 'White Bear Lake Library', url: 'https://www.whitebearlakelibrary.org', eventsUrl: 'https://www.whitebearlakelibrary.org/events', city: 'White Bear Lake', state: 'MN', zipCode: '00000', county: 'White Bear Lake County'},
  { name: 'Pioneerland Library System', url: 'https://www.willmarlibrary.org', eventsUrl: 'https://www.willmarlibrary.org/events', city: 'Willmar', state: 'MN', zipCode: '56201', county: 'Willmar County'},
  { name: 'Windom Public Library', url: 'https://www.windomlibrary.org', eventsUrl: 'https://www.windomlibrary.org/events', city: 'Windom', state: 'MN', zipCode: '56101', county: 'Windom County'},
  { name: 'Winnebago Muir Library', url: 'https://www.winnebagolibrary.org', eventsUrl: 'https://www.winnebagolibrary.org/events', city: 'Winnebago', state: 'MN', zipCode: '56098', county: 'Winnebago County'},
  { name: 'Winona Public Library', url: 'https://www.winonalibrary.org', eventsUrl: 'https://www.winonalibrary.org/events', city: 'Winona', state: 'MN', zipCode: '55987', county: 'Winona County'},
  { name: 'Winsted Public Library', url: 'https://www.winstedlibrary.org', eventsUrl: 'https://www.winstedlibrary.org/events', city: 'Winsted', state: 'MN', zipCode: '00000', county: 'Winsted County'},
  { name: 'Winthrop Public Library', url: 'https://www.winthroplibrary.org', eventsUrl: 'https://www.winthroplibrary.org/events', city: 'Winthrop', state: 'MN', zipCode: '00000', county: 'Winthrop County'},
  { name: 'Nobles County Library', url: 'https://www.worthingtonlibrary.org', eventsUrl: 'https://www.worthingtonlibrary.org/events', city: 'Worthington', state: 'MN', zipCode: '56187', county: 'Worthington County'},
  { name: 'Wyoming Area Giese Memorial Library', url: 'https://www.wyominglibrary.org', eventsUrl: 'https://www.wyominglibrary.org/events', city: 'Wyoming', state: 'MN', zipCode: '55092', county: 'Wyoming County'},
  { name: 'Zumbrota Public Library', url: 'https://www.zumbrotalibrary.org', eventsUrl: 'https://www.zumbrotalibrary.org/events', city: 'Zumbrota', state: 'MN', zipCode: '55992', county: 'Zumbrota County'}

];

const SCRAPER_NAME = 'wordpress-MN';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'MN', city: library.city, zipCode: library.zipCode }}));
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
    state: 'MN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMNCloudFunction() {
  console.log('☁️ Running WordPress MN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-MN', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMNCloudFunction };
