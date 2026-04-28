const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Alabama Public Libraries Scraper
 * State: AL
 * Libraries:
 * - Birmingham Public Library (200K)
 * - Huntsville-Madison County Public Library (450K)
 * - Mobile Public Library (200K)
 * - Montgomery City-County Public Library (230K)
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Birmingham Public Library', url: 'https://www.bplonline.org', eventsUrl: 'https://www.bplonline.org/events', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Birmingham County'},
  { name: 'Huntsville-Madison County Public Library', url: 'https://www.hmcpl.org', eventsUrl: 'https://www.hmcpl.org/events', city: 'Huntsville', state: 'AL', zipCode: '35801', county: 'Huntsville County'},
  { name: 'Mobile Public Library', url: 'https://www.mplonline.org', eventsUrl: 'https://www.mplonline.org/events', city: 'Mobile', state: 'AL', zipCode: '36602', county: 'Mobile County'},
  { name: 'Montgomery City-County Public Library', url: 'https://www.mccpl.lib.al.us', eventsUrl: 'https://www.mccpl.lib.al.us/events', city: 'Montgomery', state: 'AL', zipCode: '36104', county: 'Montgomery County'},
  // Regional Libraries
  { name: 'Tuscaloosa Public Library', url: 'https://www.tuscaloosa-library.org', eventsUrl: 'https://www.tuscaloosa-library.org/events', city: 'Tuscaloosa', state: 'AL', zipCode: '35401', county: 'Tuscaloosa County'},
  { name: 'Auburn Public Library', url: 'https://www.auburnalabama.org/library', eventsUrl: 'https://www.auburnalabama.org/library/events', city: 'Auburn', state: 'AL', zipCode: '36830', county: 'Auburn County'},
  { name: 'Dothan Houston County Library System', url: 'https://www.dhcls.org', eventsUrl: 'https://www.dhcls.org/events', city: 'Dothan', state: 'AL', zipCode: '36301', county: 'Dothan County'},
  { name: 'Gadsden Public Library', url: 'https://www.gadsdenpl.org', eventsUrl: 'https://www.gadsdenpl.org/events', city: 'Gadsden', state: 'AL', zipCode: '35901', county: 'Gadsden County'},
  { name: 'Anniston-Calhoun County Public Library', url: 'https://www.annistonlibrary.org', eventsUrl: 'https://www.annistonlibrary.org/events', city: 'Anniston', state: 'AL', zipCode: '36201', county: 'Anniston County'},
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'AL', zipCode: '35601', county: 'Decatur County'},
  { name: 'Florence-Lauderdale Public Library', url: 'https://www.flpl.org', eventsUrl: 'https://www.flpl.org/events', city: 'Florence', state: 'AL', zipCode: '35630', county: 'Florence County'},
  { name: 'Hoover Public Library', url: 'https://www.hooverlibrary.org', eventsUrl: 'https://www.hooverlibrary.org/events', city: 'Hoover', state: 'AL', zipCode: '35244', county: 'Hoover County'},
  { name: 'Vestavia Hills Library', url: 'https://www.vestavialibrary.org', eventsUrl: 'https://www.vestavialibrary.org/events', city: 'Vestavia Hills', state: 'AL', zipCode: '35216', county: 'Vestavia Hills County'},
  { name: 'Homewood Public Library', url: 'https://www.homewoodpubliclibrary.org', eventsUrl: 'https://www.homewoodpubliclibrary.org/events', city: 'Homewood', state: 'AL', zipCode: '35209', county: 'Homewood County'},
  { name: 'Mountain Brook Library', url: 'https://www.mtbrooklibrary.org', eventsUrl: 'https://www.mtbrooklibrary.org/events', city: 'Mountain Brook', state: 'AL', zipCode: '35213', county: 'Mountain Brook County'},
  { name: 'Shelby County Libraries', url: 'https://www.shelbycounty-al.org/library', eventsUrl: 'https://www.shelbycounty-al.org/library/events', city: 'Columbiana', state: 'AL', zipCode: '35051' },
  { name: 'Jefferson County Library Cooperative', url: 'https://www.jclc.org', eventsUrl: 'https://www.jclc.org/events', city: 'Birmingham', state: 'AL', zipCode: '35203', county: 'Birmingham County'},
  { name: 'Opelika Public Library', url: 'https://www.opelika-al.gov/library', eventsUrl: 'https://www.opelika-al.gov/library/events', city: 'Opelika', state: 'AL', zipCode: '36801', county: 'Opelika County'},
  { name: 'Phenix City-Russell County Library', url: 'https://www.pcrclibrary.org', eventsUrl: 'https://www.pcrclibrary.org/events', city: 'Phenix City', state: 'AL', zipCode: '36867', county: 'Phenix City County'},
  { name: 'Prattville Public Library', url: 'https://www.prattvillelibrary.com', eventsUrl: 'https://www.prattvillelibrary.com/events', city: 'Prattville', state: 'AL', zipCode: '36067', county: 'Prattville County'},
  { name: 'Talladega Public Library', url: 'https://www.talladegalibrary.org', eventsUrl: 'https://www.talladegalibrary.org/events', city: 'Talladega', state: 'AL', zipCode: '35160', county: 'Talladega County'},
  { name: 'Selma-Dallas County Public Library', url: 'https://www.selmalibrary.org', eventsUrl: 'https://www.selmalibrary.org/events', city: 'Selma', state: 'AL', zipCode: '36701', county: 'Selma County'},
  { name: 'Enterprise Public Library', url: 'https://www.enterpriseal.gov/library', eventsUrl: 'https://www.enterpriseal.gov/library/events', city: 'Enterprise', state: 'AL', zipCode: '36330', county: 'Enterprise County'},
  { name: 'Albertville Public Library', url: 'https://www.albertvillelibrary.org', eventsUrl: 'https://www.albertvillelibrary.org/events', city: 'Albertville', state: 'AL', zipCode: '35950', county: 'Albertville County'},
  { name: 'Cullman County Public Library', url: 'https://www.ccpls.com', eventsUrl: 'https://www.ccpls.com/events', city: 'Cullman', state: 'AL', zipCode: '35055', county: 'Cullman County'},
  { name: 'Athens-Limestone Public Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'AL', zipCode: '35611', county: 'Athens County'},
  { name: 'Bessemer Public Library', url: 'https://www.bessemerlibrary.org', eventsUrl: 'https://www.bessemerlibrary.org/events', city: 'Bessemer', state: 'AL', zipCode: '35020', county: 'Bessemer County'},
  { name: 'Fairhope Public Library', url: 'https://www.fairhopelibrary.org', eventsUrl: 'https://www.fairhopelibrary.org/events', city: 'Fairhope', state: 'AL', zipCode: '36532', county: 'Fairhope County'},
  { name: 'Daphne Public Library', url: 'https://www.daphnelibrary.org', eventsUrl: 'https://www.daphnelibrary.org/events', city: 'Daphne', state: 'AL', zipCode: '36526', county: 'Daphne County'},
  { name: 'Gulf Shores Public Library', url: 'https://www.gulfshoresal.gov/library', eventsUrl: 'https://www.gulfshoresal.gov/library/events', city: 'Gulf Shores', state: 'AL', zipCode: '36542', county: 'Gulf Shores County'},
  { name: 'Jasper Public Library', url: 'https://www.jasperlibrary.org', eventsUrl: 'https://www.jasperlibrary.org/events', city: 'Jasper', state: 'AL', zipCode: '35501', county: 'Jasper County'},
  { name: 'Scottsboro Public Library', url: 'https://www.scottsborolibrary.org', eventsUrl: 'https://www.scottsborolibrary.org/events', city: 'Scottsboro', state: 'AL', zipCode: '35768', county: 'Scottsboro County'},
  { name: 'Troy Public Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'AL', zipCode: '36081', county: 'Troy County'},
  { name: 'Pelham Public Library', url: 'https://www.pelhamlibrary.org', eventsUrl: 'https://www.pelhamlibrary.org/events', city: 'Pelham', state: 'AL', zipCode: '35124', county: 'Pelham County'},
  { name: 'Trussville Public Library', url: 'https://www.trussvillelibrary.com', eventsUrl: 'https://www.trussvillelibrary.com/events', city: 'Trussville', state: 'AL', zipCode: '35173', county: 'Trussville County'},
  { name: 'Gardendale Public Library', url: 'https://www.gardendalelibrary.org', eventsUrl: 'https://www.gardendalelibrary.org/events', city: 'Gardendale', state: 'AL', zipCode: '35071', county: 'Gardendale County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Abbeville Memorial Library', url: 'https://www.abbevillelibrary.org', eventsUrl: 'https://www.abbevillelibrary.org/events', city: 'Abbeville', state: 'AL', zipCode: '36310', county: 'Abbeville County'},
  { name: 'Adamsville Public Library', url: 'https://www.adamsvillelibrary.org', eventsUrl: 'https://www.adamsvillelibrary.org/events', city: 'Adamsville', state: 'AL', zipCode: '35005', county: 'Adamsville County'},
  { name: 'Akron Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'AL', zipCode: '35441', county: 'Akron County'},
  { name: 'Alabaster - Albert L. Scott Library', url: 'https://www.alabasterlibrary.org', eventsUrl: 'https://www.alabasterlibrary.org/events', city: 'Alabaster', state: 'AL', zipCode: '35007', county: 'Alabaster County'},
  { name: 'Alexander City - Adelia Mcconnell Russell Library', url: 'https://www.alexandercitylibrary.org', eventsUrl: 'https://www.alexandercitylibrary.org/events', city: 'Alexander City', state: 'AL', zipCode: '35010', county: 'Alexander City County'},
  { name: 'Aliceville Public Library', url: 'https://www.alicevillelibrary.org', eventsUrl: 'https://www.alicevillelibrary.org/events', city: 'Aliceville', state: 'AL', zipCode: '35442', county: 'Aliceville County'},
  { name: 'Andalusia Public Library', url: 'https://www.andalusialibrary.org', eventsUrl: 'https://www.andalusialibrary.org/events', city: 'Andalusia', state: 'AL', zipCode: '36420', county: 'Andalusia County'},
  { name: 'Arab Public Library', url: 'https://www.arablibrary.org', eventsUrl: 'https://www.arablibrary.org/events', city: 'Arab', state: 'AL', zipCode: '35016', county: 'Arab County'},
  { name: 'Ariton - Dot Laney Memorial Library', url: 'https://www.aritonlibrary.org', eventsUrl: 'https://www.aritonlibrary.org/events', city: 'Ariton', state: 'AL', zipCode: '36311', county: 'Ariton County'},
  { name: 'Arley Public Library', url: 'https://www.arleylibrary.org', eventsUrl: 'https://www.arleylibrary.org/events', city: 'Arley', state: 'AL', zipCode: '35541', county: 'Arley County'},
  { name: 'Houston-Love Memorial Library - Ashford', url: 'https://www.ashfordlibrary.org', eventsUrl: 'https://www.ashfordlibrary.org/events', city: 'Ashford', state: 'AL', zipCode: '36312', county: 'Ashford County'},
  { name: 'Ashland City Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'AL', zipCode: '36251', county: 'Ashland County'},
  { name: 'Ashville Public Library', url: 'https://www.ashvillelibrary.org', eventsUrl: 'https://www.ashvillelibrary.org/events', city: 'Ashville', state: 'AL', zipCode: '35953', county: 'Ashville County'},
  { name: 'Atmore Public', url: 'https://www.atmorelibrary.org', eventsUrl: 'https://www.atmorelibrary.org/events', city: 'Atmore', state: 'AL', zipCode: '36502', county: 'Atmore County'},
  { name: 'Etowah County Public Library', url: 'https://www.attallalibrary.org', eventsUrl: 'https://www.attallalibrary.org/events', city: 'Attalla', state: 'AL', zipCode: '35954', county: 'Attalla County'},
  { name: 'Autauga Prattville Public Library - Autaugaville', url: 'https://www.autaugavillelibrary.org', eventsUrl: 'https://www.autaugavillelibrary.org/events', city: 'Autaugaville', state: 'AL', zipCode: '36003', county: 'Autaugaville County'},
  { name: 'Bay Minette Public Library', url: 'https://www.bayminettelibrary.org', eventsUrl: 'https://www.bayminettelibrary.org/events', city: 'Bay Minette', state: 'AL', zipCode: '36507', county: 'Bay Minette County'},
  { name: 'Autauga Prattville Public Library - Billingsley', url: 'https://www.billingsleylibrary.org', eventsUrl: 'https://www.billingsleylibrary.org/events', city: 'Billingsley', state: 'AL', zipCode: '36006', county: 'Billingsley County'},
  { name: 'Blountsville Public Library', url: 'https://www.blountsvillelibrary.org', eventsUrl: 'https://www.blountsvillelibrary.org/events', city: 'Blountsville', state: 'AL', zipCode: '35031', county: 'Blountsville County'},
  { name: 'Boaz Public Library', url: 'https://www.boazlibrary.org', eventsUrl: 'https://www.boazlibrary.org/events', city: 'Boaz', state: 'AL', zipCode: '35957', county: 'Boaz County'},
  { name: 'Brantley Public Library', url: 'https://www.brantleylibrary.org', eventsUrl: 'https://www.brantleylibrary.org/events', city: 'Brantley', state: 'AL', zipCode: '36009', county: 'Brantley County'},
  { name: 'Brewton Public Library', url: 'https://www.brewtonlibrary.org', eventsUrl: 'https://www.brewtonlibrary.org/events', city: 'Brewton', state: 'AL', zipCode: '36426', county: 'Brewton County'},
  { name: 'Bridgeport - Lena Cagle Public Library', url: 'https://www.bridgeportlibrary.org', eventsUrl: 'https://www.bridgeportlibrary.org/events', city: 'Bridgeport', state: 'AL', zipCode: '35740', county: 'Bridgeport County'},
  { name: 'Brundidge - Tupper Lightfoot Memorial Library', url: 'https://www.brundidgelibrary.org', eventsUrl: 'https://www.brundidgelibrary.org/events', city: 'Brundidge', state: 'AL', zipCode: '36010', county: 'Brundidge County'},
  { name: 'Choctaw County Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'AL', zipCode: '36904', county: 'Butler County'},
  { name: 'Calera Public Library', url: 'https://www.caleralibrary.org', eventsUrl: 'https://www.caleralibrary.org/events', city: 'Calera', state: 'AL', zipCode: '35040', county: 'Calera County'},
  { name: 'Wilcox County Library', url: 'https://www.camdenlibrary.org', eventsUrl: 'https://www.camdenlibrary.org/events', city: 'Camden', state: 'AL', zipCode: '36726', county: 'Camden County'},
  { name: 'Carbon Hill City Library', url: 'https://www.carbonhilllibrary.org', eventsUrl: 'https://www.carbonhilllibrary.org/events', city: 'Carbon Hill', state: 'AL', zipCode: '35549', county: 'Carbon Hill County'},
  { name: 'Carrollton Public Library', url: 'https://www.carrolltonlibrary.org', eventsUrl: 'https://www.carrolltonlibrary.org/events', city: 'Carrollton', state: 'AL', zipCode: '35447', county: 'Carrollton County'},
  { name: 'Cherokee County Public Library', url: 'https://www.centrelibrary.org', eventsUrl: 'https://www.centrelibrary.org/events', city: 'Centre', state: 'AL', zipCode: '35960', county: 'Centre County'},
  { name: 'Brent-Centreville Public Library', url: 'https://www.centrevillelibrary.org', eventsUrl: 'https://www.centrevillelibrary.org/events', city: 'Centreville', state: 'AL', zipCode: '35042', county: 'Centreville County'},
  { name: 'Washington County Public Library', url: 'https://www.chatomlibrary.org', eventsUrl: 'https://www.chatomlibrary.org/events', city: 'Chatom', state: 'AL', zipCode: '36518', county: 'Chatom County'},
  { name: 'Chelsea Public Library', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'AL', zipCode: '35043', county: 'Chelsea County'},
  { name: 'Cherokee Public Library', url: 'https://www.cherokeelibrary.org', eventsUrl: 'https://www.cherokeelibrary.org/events', city: 'Cherokee', state: 'AL', zipCode: '35616', county: 'Cherokee County'},
  { name: 'Chickasaw - Ina Pullen Smallwood Memorial Library', url: 'https://www.chickasawlibrary.org', eventsUrl: 'https://www.chickasawlibrary.org/events', city: 'Chickasaw', state: 'AL', zipCode: '36611', county: 'Chickasaw County'},
  { name: 'Childersburg - Earle A. Rainwater Memorial Library', url: 'https://www.childersburglibrary.org', eventsUrl: 'https://www.childersburglibrary.org/events', city: 'Childersburg', state: 'AL', zipCode: '35044', county: 'Childersburg County'},
  { name: 'Citronelle Memorial Library', url: 'https://www.citronellelibrary.org', eventsUrl: 'https://www.citronellelibrary.org/events', city: 'Citronelle', state: 'AL', zipCode: '36522', county: 'Citronelle County'},
  { name: 'Clanton Public Library', url: 'https://www.clantonlibrary.org', eventsUrl: 'https://www.clantonlibrary.org/events', city: 'Clanton', state: 'AL', zipCode: '35045', county: 'Clanton County'},
  { name: 'Clayton Town And County Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'AL', zipCode: '36016', county: 'Clayton County'},
  { name: 'Elton B. Stephens Library', url: 'https://www.cliolibrary.org', eventsUrl: 'https://www.cliolibrary.org/events', city: 'Clio', state: 'AL', zipCode: '36017', county: 'Clio County'},
  { name: 'Collinsville Public Library', url: 'https://www.collinsvillelibrary.org', eventsUrl: 'https://www.collinsvillelibrary.org/events', city: 'Collinsville', state: 'AL', zipCode: '35961', county: 'Collinsville County'},
  { name: 'Houston-Love Memorial Library - Columbia', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'AL', zipCode: '36319', county: 'Columbia County'},
  { name: 'Cordova Public Library', url: 'https://www.cordovalibrary.org', eventsUrl: 'https://www.cordovalibrary.org/events', city: 'Cordova', state: 'AL', zipCode: '35550', county: 'Cordova County'},
  { name: 'Courtland Public Library', url: 'https://www.courtlandlibrary.org', eventsUrl: 'https://www.courtlandlibrary.org/events', city: 'Courtland', state: 'AL', zipCode: '35618', county: 'Courtland County'},
  { name: 'Crane Hill Community Library', url: 'https://www.cranehilllibrary.org', eventsUrl: 'https://www.cranehilllibrary.org/events', city: 'Crane Hill', state: 'AL', zipCode: '35053', county: 'Crane Hill County'},
  { name: 'Crossville Public Library', url: 'https://www.crossvillelibrary.org', eventsUrl: 'https://www.crossvillelibrary.org/events', city: 'Crossville', state: 'AL', zipCode: '35962', county: 'Crossville County'},
  { name: 'Dadeville Public Library', url: 'https://www.dadevillelibrary.org', eventsUrl: 'https://www.dadevillelibrary.org/events', city: 'Dadeville', state: 'AL', zipCode: '36853', county: 'Dadeville County'},
  { name: 'Daleville Public Library', url: 'https://www.dalevillelibrary.org', eventsUrl: 'https://www.dalevillelibrary.org/events', city: 'Daleville', state: 'AL', zipCode: '36322', county: 'Daleville County'},
  { name: 'Demopolis Public Library', url: 'https://www.demopolislibrary.org', eventsUrl: 'https://www.demopolislibrary.org/events', city: 'Demopolis', state: 'AL', zipCode: '36732', county: 'Demopolis County'},
  { name: 'Dora Public Library', url: 'https://www.doralibrary.org', eventsUrl: 'https://www.doralibrary.org/events', city: 'Dora', state: 'AL', zipCode: '35062', county: 'Dora County'},
  { name: 'Double Springs Public Library', url: 'https://www.doublespringslibrary.org', eventsUrl: 'https://www.doublespringslibrary.org/events', city: 'Double Springs', state: 'AL', zipCode: '35553', county: 'Double Springs County'},
  { name: 'Dutton Public Library', url: 'https://www.duttonlibrary.org', eventsUrl: 'https://www.duttonlibrary.org/events', city: 'Dutton', state: 'AL', zipCode: '35744', county: 'Dutton County'},
  { name: 'Mitchell Branch Library', url: 'https://www.eightmilelibrary.org', eventsUrl: 'https://www.eightmilelibrary.org/events', city: 'Eight Mile', state: 'AL', zipCode: '36613', county: 'Eight Mile County'},
  { name: 'Elba Public Library', url: 'https://www.elbalibrary.org', eventsUrl: 'https://www.elbalibrary.org/events', city: 'Elba', state: 'AL', zipCode: '36323', county: 'Elba County'},
  { name: 'Eufaula Carnegie Library', url: 'https://www.eufaulalibrary.org', eventsUrl: 'https://www.eufaulalibrary.org/events', city: 'Eufaula', state: 'AL', zipCode: '36027', county: 'Eufaula County'},
  { name: 'James C. Poole Jr. Memorial Library', url: 'https://www.eutawlibrary.org', eventsUrl: 'https://www.eutawlibrary.org/events', city: 'Eutaw', state: 'AL', zipCode: '35462', county: 'Eutaw County'},
  { name: 'Eva Public Library', url: 'https://www.evalibrary.org', eventsUrl: 'https://www.evalibrary.org/events', city: 'Eva', state: 'AL', zipCode: '35621', county: 'Eva County'},
  { name: 'Evergreen Public Library', url: 'https://www.evergreenlibrary.org', eventsUrl: 'https://www.evergreenlibrary.org/events', city: 'Evergreen', state: 'AL', zipCode: '36401', county: 'Evergreen County'},
  { name: 'Walter J. Hanna Memorial Library', url: 'https://www.fairfieldlibrary.org', eventsUrl: 'https://www.fairfieldlibrary.org/events', city: 'Fairfield', state: 'AL', zipCode: '35064', county: 'Fairfield County'},
  { name: 'Falkville Public Library', url: 'https://www.falkvillelibrary.org', eventsUrl: 'https://www.falkvillelibrary.org/events', city: 'Falkville', state: 'AL', zipCode: '35622', county: 'Falkville County'},
  { name: 'Fayette County Memorial Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'AL', zipCode: '35555', county: 'Fayette County'},
  { name: 'Flomaton Public Library', url: 'https://www.flomatonlibrary.org', eventsUrl: 'https://www.flomatonlibrary.org/events', city: 'Flomaton', state: 'AL', zipCode: '36441', county: 'Flomaton County'},
  { name: 'Florala Public Library', url: 'https://www.floralalibrary.org', eventsUrl: 'https://www.floralalibrary.org/events', city: 'Florala', state: 'AL', zipCode: '36442', county: 'Florala County'},
  { name: 'Foley Public Library', url: 'https://www.foleylibrary.org', eventsUrl: 'https://www.foleylibrary.org/events', city: 'Foley', state: 'AL', zipCode: '36535', county: 'Foley County'},
  { name: 'Fort Deposit Public Library', url: 'https://www.fortdepositlibrary.org', eventsUrl: 'https://www.fortdepositlibrary.org/events', city: 'Fort Deposit', state: 'AL', zipCode: '36032', county: 'Fort Deposit County'},
  { name: 'Dekalb County Public Library', url: 'https://www.fortpaynelibrary.org', eventsUrl: 'https://www.fortpaynelibrary.org/events', city: 'Fort Payne', state: 'AL', zipCode: '35967', county: 'Fort Payne County'},
  { name: 'Fultondale Public Library', url: 'https://www.fultondalelibrary.org', eventsUrl: 'https://www.fultondalelibrary.org/events', city: 'Fultondale', state: 'AL', zipCode: '35068', county: 'Fultondale County'},
  { name: 'Garden City Public Library', url: 'https://www.gardencitylibrary.org', eventsUrl: 'https://www.gardencitylibrary.org/events', city: 'Garden City', state: 'AL', zipCode: '35070', county: 'Garden City County'},
  { name: 'Emma Knox Kenan Public Library', url: 'https://www.genevalibrary.org', eventsUrl: 'https://www.genevalibrary.org/events', city: 'Geneva', state: 'AL', zipCode: '36340', county: 'Geneva County'},
  { name: 'Geraldine Public Library', url: 'https://www.geraldinelibrary.org', eventsUrl: 'https://www.geraldinelibrary.org/events', city: 'Geraldine', state: 'AL', zipCode: '35974', county: 'Geraldine County'},
  { name: 'Goodwater Public Library', url: 'https://www.goodwaterlibrary.org', eventsUrl: 'https://www.goodwaterlibrary.org/events', city: 'Goodwater', state: 'AL', zipCode: '35072', county: 'Goodwater County'},
  { name: 'Ruth Holliman Memorial Public Library', url: 'https://www.gordolibrary.org', eventsUrl: 'https://www.gordolibrary.org/events', city: 'Gordo', state: 'AL', zipCode: '35466', county: 'Gordo County'},
  { name: 'Grant Public Library', url: 'https://www.grantlibrary.org', eventsUrl: 'https://www.grantlibrary.org/events', city: 'Grant', state: 'AL', zipCode: '35747', county: 'Grant County'},
  { name: 'Graysville Public Library', url: 'https://www.graysvillelibrary.org', eventsUrl: 'https://www.graysvillelibrary.org/events', city: 'Graysville', state: 'AL', zipCode: '35073', county: 'Graysville County'},
  { name: 'Woodstock Library', url: 'https://www.greenpondlibrary.org', eventsUrl: 'https://www.greenpondlibrary.org/events', city: 'Green Pond', state: 'AL', zipCode: '35074', county: 'Green Pond County'},
  { name: 'Hale County Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'AL', zipCode: '36744', county: 'Greensboro County'},
  { name: 'Butler County Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'AL', zipCode: '36037', county: 'Greenville County'},
  { name: 'Grove Hill Public Library', url: 'https://www.grovehilllibrary.org', eventsUrl: 'https://www.grovehilllibrary.org/events', city: 'Grove Hill', state: 'AL', zipCode: '36451', county: 'Grove Hill County'},
  { name: 'Mchs Community Library', url: 'https://www.guinlibrary.org', eventsUrl: 'https://www.guinlibrary.org/events', city: 'Guin', state: 'AL', zipCode: '35563', county: 'Guin County'},
  { name: 'Guntersville Public Library', url: 'https://www.guntersvillelibrary.org', eventsUrl: 'https://www.guntersvillelibrary.org/events', city: 'Guntersville', state: 'AL', zipCode: '35976', county: 'Guntersville County'},
  { name: 'Gurley Public Library', url: 'https://www.gurleylibrary.org', eventsUrl: 'https://www.gurleylibrary.org/events', city: 'Gurley', state: 'AL', zipCode: '35748', county: 'Gurley County'},
  { name: 'Haleyville Public Library', url: 'https://www.haleyvillelibrary.org', eventsUrl: 'https://www.haleyvillelibrary.org/events', city: 'Haleyville', state: 'AL', zipCode: '35565', county: 'Haleyville County'},
  { name: 'Clyde Nix Public Library', url: 'https://www.hamiltonlibrary.org', eventsUrl: 'https://www.hamiltonlibrary.org/events', city: 'Hamilton', state: 'AL', zipCode: '35570', county: 'Hamilton County'},
  { name: 'Hanceville Public Library', url: 'https://www.hancevillelibrary.org', eventsUrl: 'https://www.hancevillelibrary.org/events', city: 'Hanceville', state: 'AL', zipCode: '35077', county: 'Hanceville County'},
  { name: 'Harpersville Public Library', url: 'https://www.harpersvillelibrary.org', eventsUrl: 'https://www.harpersvillelibrary.org/events', city: 'Harpersville', state: 'AL', zipCode: '35078', county: 'Harpersville County'},
  { name: 'Hartford - Mcgregor-Mckinney Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'AL', zipCode: '36344', county: 'Hartford County'},
  { name: 'Hartselle - William Bradford Huie Public Library', url: 'https://www.hartsellelibrary.org', eventsUrl: 'https://www.hartsellelibrary.org/events', city: 'Hartselle', state: 'AL', zipCode: '35640', county: 'Hartselle County'},
  { name: 'Hayneville-Lowndes County Public Library', url: 'https://www.haynevillelibrary.org', eventsUrl: 'https://www.haynevillelibrary.org/events', city: 'Hayneville', state: 'AL', zipCode: '36040', county: 'Hayneville County'},
  { name: 'Tillman Hill Branch Library', url: 'https://www.hazelgreenlibrary.org', eventsUrl: 'https://www.hazelgreenlibrary.org/events', city: 'Hazel Green', state: 'AL', zipCode: '35750', county: 'Hazel Green County'},
  { name: 'Blanche R. Solomon Memorial Library', url: 'https://www.headlandlibrary.org', eventsUrl: 'https://www.headlandlibrary.org/events', city: 'Headland', state: 'AL', zipCode: '36345', county: 'Headland County'},
  { name: 'Cheaha Regional Library', url: 'https://www.heflinlibrary.org', eventsUrl: 'https://www.heflinlibrary.org/events', city: 'Heflin', state: 'AL', zipCode: '36264', county: 'Heflin County'},
  { name: 'Jane B. Holmes Public Library', url: 'https://www.helenalibrary.org', eventsUrl: 'https://www.helenalibrary.org/events', city: 'Helena', state: 'AL', zipCode: '35080', county: 'Helena County'},
  { name: 'Henagar Public Library', url: 'https://www.henagarlibrary.org', eventsUrl: 'https://www.henagarlibrary.org/events', city: 'Henagar', state: 'AL', zipCode: '35978', county: 'Henagar County'},
  { name: 'Hokes Bluff - Rufus Floyd Public Library', url: 'https://www.hokesblufflibrary.org', eventsUrl: 'https://www.hokesblufflibrary.org/events', city: 'Hokes Bluff', state: 'AL', zipCode: '35903', county: 'Hokes Bluff County'},
  { name: 'Hueytown Public Library', url: 'https://www.hueytownlibrary.org', eventsUrl: 'https://www.hueytownlibrary.org/events', city: 'Hueytown', state: 'AL', zipCode: '35023', county: 'Hueytown County'},
  { name: 'Ider Public Library', url: 'https://www.iderlibrary.org', eventsUrl: 'https://www.iderlibrary.org/events', city: 'Ider', state: 'AL', zipCode: '35981', county: 'Ider County'},
  { name: 'Irondale Public Library', url: 'https://www.irondalelibrary.org', eventsUrl: 'https://www.irondalelibrary.org/events', city: 'Irondale', state: 'AL', zipCode: '35210', county: 'Irondale County'},
  { name: 'City Of Bayou La Batre Public Library', url: 'https://www.irvingtonlibrary.org', eventsUrl: 'https://www.irvingtonlibrary.org/events', city: 'Irvington', state: 'AL', zipCode: '36509', county: 'Irvington County'},
  { name: 'White Smith Memorial Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'AL', zipCode: '36545', county: 'Jackson County'},
  { name: 'Jacksonville Public Library', url: 'https://www.jacksonvillelibrary.org', eventsUrl: 'https://www.jacksonvillelibrary.org/events', city: 'Jacksonville', state: 'AL', zipCode: '36265', county: 'Jacksonville County'},
  { name: 'Jemison Public Library', url: 'https://www.jemisonlibrary.org', eventsUrl: 'https://www.jemisonlibrary.org/events', city: 'Jemison', state: 'AL', zipCode: '00000', county: 'Jemison County'},
  { name: 'Kennedy Public Library', url: 'https://www.kennedylibrary.org', eventsUrl: 'https://www.kennedylibrary.org/events', city: 'Kennedy', state: 'AL', zipCode: '35574', county: 'Kennedy County'},
  { name: 'Killen Public Library', url: 'https://www.killenlibrary.org', eventsUrl: 'https://www.killenlibrary.org/events', city: 'Killen', state: 'AL', zipCode: '35645', county: 'Killen County'},
  { name: 'Lafayette Pilot Public Library', url: 'https://www.lafayettelibrary.org', eventsUrl: 'https://www.lafayettelibrary.org/events', city: 'Lafayette', state: 'AL', zipCode: '36862', county: 'Lafayette County'},
  { name: 'Jane Culbreth Library', url: 'https://www.leedslibrary.org', eventsUrl: 'https://www.leedslibrary.org/events', city: 'Leeds', state: 'AL', zipCode: '35094', county: 'Leeds County'},
  { name: 'Leighton Public Library', url: 'https://www.leightonlibrary.org', eventsUrl: 'https://www.leightonlibrary.org/events', city: 'Leighton', state: 'AL', zipCode: '35646', county: 'Leighton County'},
  { name: 'Burchell Campbell Memorial Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'AL', zipCode: '35648', county: 'Lexington County'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'AL', zipCode: '35096', county: 'Lincoln County'},
  { name: 'Marengo County Public Library', url: 'https://www.lindenlibrary.org', eventsUrl: 'https://www.lindenlibrary.org/events', city: 'Linden', state: 'AL', zipCode: '36748', county: 'Linden County'},
  { name: 'Lineville Public Library', url: 'https://www.linevillelibrary.org', eventsUrl: 'https://www.linevillelibrary.org/events', city: 'Lineville', state: 'AL', zipCode: '36266', county: 'Lineville County'},
  { name: 'Ruby Pickens Tartt Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'AL', zipCode: '35470', county: 'Livingston County'},
  { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'AL', zipCode: '36048', county: 'Louisville County'},
  { name: 'Loxley Public Library', url: 'https://www.loxleyabamalibrary.org', eventsUrl: 'https://www.loxleyabamalibrary.org/events', city: 'Loxleyabama', state: 'AL', zipCode: '36551', county: 'Loxleyabama County'},
  { name: 'Luverne Public Library', url: 'https://www.luvernelibrary.org', eventsUrl: 'https://www.luvernelibrary.org/events', city: 'Luverne', state: 'AL', zipCode: '36049', county: 'Luverne County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'AL', zipCode: '35758', county: 'Madison County'},
  { name: 'Maplesville Public Library', url: 'https://www.maplesvillelibrary.org', eventsUrl: 'https://www.maplesvillelibrary.org/events', city: 'Maplesville', state: 'AL', zipCode: '36750', county: 'Maplesville County'},
  { name: 'Autauga Prattville Public Library - Marbury', url: 'https://www.marburylibrary.org', eventsUrl: 'https://www.marburylibrary.org/events', city: 'Marbury', state: 'AL', zipCode: '36051', county: 'Marbury County'},
  { name: 'Marion-Perry County Library', url: 'https://www.marionlibrary.org', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'AL', zipCode: '36756', county: 'Marion County'},
  { name: 'Mcintosh Public Library', url: 'https://www.mcintoshlibrary.org', eventsUrl: 'https://www.mcintoshlibrary.org/events', city: 'Mcintosh', state: 'AL', zipCode: '36553', county: 'Mcintosh County'},
  { name: 'Midfield Public Library', url: 'https://www.midfieldlibrary.org', eventsUrl: 'https://www.midfieldlibrary.org/events', city: 'Midfield', state: 'AL', zipCode: '35228', county: 'Midfield County'},
  { name: 'Mary Berry Brown Memorial Library', url: 'https://www.midlandcitylibrary.org', eventsUrl: 'https://www.midlandcitylibrary.org/events', city: 'Midland City', state: 'AL', zipCode: '36350', county: 'Midland City County'},
  { name: 'Millbrook Public Library', url: 'https://www.millbrooklibrary.org', eventsUrl: 'https://www.millbrooklibrary.org/events', city: 'Millbrook', state: 'AL', zipCode: '36054', county: 'Millbrook County'},
  { name: 'Millport Public Library', url: 'https://www.millportlibrary.org', eventsUrl: 'https://www.millportlibrary.org/events', city: 'Millport', state: 'AL', zipCode: '35576', county: 'Millport County'},
  { name: 'Monroe County Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'AL', zipCode: '36460', county: 'Monroeville County'},
  { name: 'Montevallo - Parnell Memorial Library', url: 'https://www.montevallolibrary.org', eventsUrl: 'https://www.montevallolibrary.org/events', city: 'Montevallo', state: 'AL', zipCode: '35115', county: 'Montevallo County'},
  { name: 'Doris Stanley Memorial Library', url: 'https://www.moodylibrary.org', eventsUrl: 'https://www.moodylibrary.org/events', city: 'Moody', state: 'AL', zipCode: '35004', county: 'Moody County'},
  { name: 'Lawrence County Public Library', url: 'https://www.moultonlibrary.org', eventsUrl: 'https://www.moultonlibrary.org/events', city: 'Moulton', state: 'AL', zipCode: '35650', county: 'Moulton County'},
  { name: 'Moundville Public Library', url: 'https://www.moundvillelibrary.org', eventsUrl: 'https://www.moundvillelibrary.org/events', city: 'Moundville', state: 'AL', zipCode: '35474', county: 'Moundville County'},
  { name: 'Mt. Vernon Public Library', url: 'https://www.mtvernonlibrary.org', eventsUrl: 'https://www.mtvernonlibrary.org/events', city: 'Mt. Vernon', state: 'AL', zipCode: '36560', county: 'Mt. Vernon County'},
  { name: 'Muscle Shoals Public Library', url: 'https://www.muscleshoalslibrary.org', eventsUrl: 'https://www.muscleshoalslibrary.org/events', city: 'Muscle Shoals', state: 'AL', zipCode: '35661', county: 'Muscle Shoals County'},
  { name: 'Elizabeth Carpenter Public Library', url: 'https://www.newhopelibrary.org', eventsUrl: 'https://www.newhopelibrary.org/events', city: 'New Hope', state: 'AL', zipCode: '00000', county: 'New Hope County'},
  { name: 'Newton Public Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'AL', zipCode: '36352', county: 'Newton County'},
  { name: 'Odenville Public Library', url: 'https://www.odenvillelibrary.org', eventsUrl: 'https://www.odenvillelibrary.org/events', city: 'Odenville', state: 'AL', zipCode: '35120', county: 'Odenville County'},
  { name: 'Ohatchee Public Library', url: 'https://www.ohatcheelibrary.org', eventsUrl: 'https://www.ohatcheelibrary.org/events', city: 'Ohatchee', state: 'AL', zipCode: '36271', county: 'Ohatchee County'},
  { name: 'Oneonta Public Library', url: 'https://www.oneontalibrary.org', eventsUrl: 'https://www.oneontalibrary.org/events', city: 'Oneonta', state: 'AL', zipCode: '35121', county: 'Oneonta County'},
  { name: 'Opp Public Library', url: 'https://www.opplibrary.org', eventsUrl: 'https://www.opplibrary.org/events', city: 'Opp', state: 'AL', zipCode: '36467', county: 'Opp County'},
  { name: 'Orange Beach Public Library', url: 'https://www.orangebeachlibrary.org', eventsUrl: 'https://www.orangebeachlibrary.org/events', city: 'Orange Beach', state: 'AL', zipCode: '36561', county: 'Orange Beach County'},
  { name: 'Oxford Public Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'AL', zipCode: '36203', county: 'Oxford County'},
  { name: 'Ozark - Dale County Public Library', url: 'https://www.ozarklibrary.org', eventsUrl: 'https://www.ozarklibrary.org/events', city: 'Ozark', state: 'AL', zipCode: '36360', county: 'Ozark County'},
  { name: 'Pell City Public Library', url: 'https://www.pellcitylibrary.org', eventsUrl: 'https://www.pellcitylibrary.org/events', city: 'Pell City', state: 'AL', zipCode: '35125', county: 'Pell City County'},
  { name: 'Piedmont Public Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'AL', zipCode: '36272', county: 'Piedmont County'},
  { name: 'Pike Road Branch Library', url: 'https://www.pikeroadlibrary.org', eventsUrl: 'https://www.pikeroadlibrary.org/events', city: 'Pike Road', state: 'AL', zipCode: '36064', county: 'Pike Road County'},
  { name: 'Pine Hill Branch Public Library', url: 'https://www.pinehilllibrary.org', eventsUrl: 'https://www.pinehilllibrary.org/events', city: 'Pine Hill', state: 'AL', zipCode: '36769', county: 'Pine Hill County'},
  { name: 'Pine Level Branch Library', url: 'https://www.pinelevellibrary.org', eventsUrl: 'https://www.pinelevellibrary.org/events', city: 'Pine Level', state: 'AL', zipCode: '36065', county: 'Pine Level County'},
  { name: 'Clay Public Library', url: 'https://www.pinsonlibrary.org', eventsUrl: 'https://www.pinsonlibrary.org/events', city: 'Pinson', state: 'AL', zipCode: '35126', county: 'Pinson County'},
  { name: 'Pleasant Grove Public Library', url: 'https://www.pleasantgrovelibrary.org', eventsUrl: 'https://www.pleasantgrovelibrary.org/events', city: 'Pleasant Grove', state: 'AL', zipCode: '35127', county: 'Pleasant Grove County'},
  { name: 'Priceville Public Library', url: 'https://www.pricevillelibrary.org', eventsUrl: 'https://www.pricevillelibrary.org/events', city: 'Priceville', state: 'AL', zipCode: '35603', county: 'Priceville County'},
  { name: 'Prichard Public Library', url: 'https://www.prichardlibrary.org', eventsUrl: 'https://www.prichardlibrary.org/events', city: 'Prichard', state: 'AL', zipCode: '36610', county: 'Prichard County'},
  { name: 'Ragland Public Library', url: 'https://www.raglandlibrary.org', eventsUrl: 'https://www.raglandlibrary.org/events', city: 'Ragland', state: 'AL', zipCode: '35131', county: 'Ragland County'},
  { name: 'Rainbow City Public Library', url: 'https://www.rainbowcitylibrary.org', eventsUrl: 'https://www.rainbowcitylibrary.org/events', city: 'Rainbow City', state: 'AL', zipCode: '35906', county: 'Rainbow City County'},
  { name: 'Rainsville Public Library', url: 'https://www.rainsvillelibrary.org', eventsUrl: 'https://www.rainsvillelibrary.org/events', city: 'Rainsville', state: 'AL', zipCode: '35986', county: 'Rainsville County'},
  { name: 'Ramer Branch Library', url: 'https://www.ramerlibrary.org', eventsUrl: 'https://www.ramerlibrary.org/events', city: 'Ramer', state: 'AL', zipCode: '36069', county: 'Ramer County'},
  { name: 'Red Bay - Weatherford Public Library', url: 'https://www.redbaylibrary.org', eventsUrl: 'https://www.redbaylibrary.org/events', city: 'Red Bay', state: 'AL', zipCode: '35582', county: 'Red Bay County'},
  { name: 'Reform Public Library', url: 'https://www.reformlibrary.org', eventsUrl: 'https://www.reformlibrary.org/events', city: 'Reform', state: 'AL', zipCode: '35481', county: 'Reform County'},
  { name: 'Roanoke - Annie L. Awbrey Public Library', url: 'https://www.roanokelibrary.org', eventsUrl: 'https://www.roanokelibrary.org/events', city: 'Roanoke', state: 'AL', zipCode: '36274', county: 'Roanoke County'},
  { name: 'Baldwin County Library Cooperative', url: 'https://www.robertsdalelibrary.org', eventsUrl: 'https://www.robertsdalelibrary.org/events', city: 'Robertsdale', state: 'AL', zipCode: '36567', county: 'Robertsdale County'},
  { name: 'Rockford Public Library', url: 'https://www.rockfordlibrary.org', eventsUrl: 'https://www.rockfordlibrary.org/events', city: 'Rockford', state: 'AL', zipCode: '35136', county: 'Rockford County'},
  { name: 'Rogersville Public Library', url: 'https://www.rogersvillelibrary.org', eventsUrl: 'https://www.rogersvillelibrary.org/events', city: 'Rogersville', state: 'AL', zipCode: '35652', county: 'Rogersville County'},
  { name: 'Russellville Public Library', url: 'https://www.russellvillelibrary.org', eventsUrl: 'https://www.russellvillelibrary.org/events', city: 'Russellville', state: 'AL', zipCode: '35653', county: 'Russellville County'},
  { name: 'Samson Public Library', url: 'https://www.samsonlibrary.org', eventsUrl: 'https://www.samsonlibrary.org/events', city: 'Samson', state: 'AL', zipCode: '36477', county: 'Samson County'},
  { name: 'Saraland Public Library', url: 'https://www.saralandlibrary.org', eventsUrl: 'https://www.saralandlibrary.org/events', city: 'Saraland', state: 'AL', zipCode: '36571', county: 'Saraland County'},
  { name: 'Sardis City Public Library', url: 'https://www.sardiscitylibrary.org', eventsUrl: 'https://www.sardiscitylibrary.org/events', city: 'Sardis City', state: 'AL', zipCode: '35956', county: 'Sardis City County'},
  { name: 'Satsuma Public Library', url: 'https://www.satsumalibrary.org', eventsUrl: 'https://www.satsumalibrary.org/events', city: 'Satsuma', state: 'AL', zipCode: '36572', county: 'Satsuma County'},
  { name: 'Sheffield Public Library', url: 'https://www.sheffieldlibrary.org', eventsUrl: 'https://www.sheffieldlibrary.org/events', city: 'Sheffield', state: 'AL', zipCode: '35660', county: 'Sheffield County'},
  { name: 'Oscar Johnson Memorial Library', url: 'https://www.silverhilllibrary.org', eventsUrl: 'https://www.silverhilllibrary.org/events', city: 'Silverhill', state: 'AL', zipCode: '36576', county: 'Silverhill County'},
  { name: 'Slocomb Public Library', url: 'https://www.slocomblibrary.org', eventsUrl: 'https://www.slocomblibrary.org/events', city: 'Slocomb', state: 'AL', zipCode: '36375', county: 'Slocomb County'},
  { name: 'Somerville Public Library', url: 'https://www.somervillelibrary.org', eventsUrl: 'https://www.somervillelibrary.org/events', city: 'Somerville', state: 'AL', zipCode: '35670', county: 'Somerville County'},
  { name: 'Springville Public Library', url: 'https://www.springvillelibrary.org', eventsUrl: 'https://www.springvillelibrary.org/events', city: 'Springville', state: 'AL', zipCode: '35146', county: 'Springville County'},
  { name: 'Steele Public Library', url: 'https://www.steelelibrary.org', eventsUrl: 'https://www.steelelibrary.org/events', city: 'Steele', state: 'AL', zipCode: '35987', county: 'Steele County'},
  { name: 'Stevenson Public Library', url: 'https://www.stevensonlibrary.org', eventsUrl: 'https://www.stevensonlibrary.org/events', city: 'Stevenson', state: 'AL', zipCode: '35772', county: 'Stevenson County'},
  { name: 'Sulligent Public Library', url: 'https://www.sulligentlibrary.org', eventsUrl: 'https://www.sulligentlibrary.org/events', city: 'Sulligent', state: 'AL', zipCode: '35586', county: 'Sulligent County'},
  { name: 'Sumiton Public Library', url: 'https://www.sumitonlibrary.org', eventsUrl: 'https://www.sumitonlibrary.org/events', city: 'Sumiton', state: 'AL', zipCode: '35148', county: 'Sumiton County'},
  { name: 'Summerdale - Marjorie Younce Snook Public Library', url: 'https://www.summerdalelibrary.org', eventsUrl: 'https://www.summerdalelibrary.org/events', city: 'Summerdale', state: 'AL', zipCode: '36580', county: 'Summerdale County'},
  { name: 'B .B. Comer Memorial Library', url: 'https://www.sylacaugalibrary.org', eventsUrl: 'https://www.sylacaugalibrary.org/events', city: 'Sylacauga', state: 'AL', zipCode: '35150', county: 'Sylacauga County'},
  { name: 'Tallassee Community Library', url: 'https://www.tallasseelibrary.org', eventsUrl: 'https://www.tallasseelibrary.org/events', city: 'Tallassee', state: 'AL', zipCode: '36078', county: 'Tallassee County'},
  { name: 'Tarrant Public Library', url: 'https://www.tarrantlibrary.org', eventsUrl: 'https://www.tarrantlibrary.org/events', city: 'Tarrant', state: 'AL', zipCode: '35217', county: 'Tarrant County'},
  { name: 'Thomasville Public Library', url: 'https://www.thomasvillelibrary.org', eventsUrl: 'https://www.thomasvillelibrary.org/events', city: 'Thomasville', state: 'AL', zipCode: '36784', county: 'Thomasville County'},
  { name: 'Thorsby Public Library', url: 'https://www.thorsbylibrary.org', eventsUrl: 'https://www.thorsbylibrary.org/events', city: 'Thorsby', state: 'AL', zipCode: '00000', county: 'Thorsby County'},
  { name: 'Tuscumbia - Helen Keller Public Library', url: 'https://www.tuscumbialibrary.org', eventsUrl: 'https://www.tuscumbialibrary.org/events', city: 'Tuscumbia', state: 'AL', zipCode: '35674', county: 'Tuscumbia County'},
  { name: 'Macon County - Tuskegee Public Library', url: 'https://www.tuskegeelibrary.org', eventsUrl: 'https://www.tuskegeelibrary.org/events', city: 'Tuskegee', state: 'AL', zipCode: '36083', county: 'Tuskegee County'},
  { name: 'Union Springs Public Library', url: 'https://www.unionspringslibrary.org', eventsUrl: 'https://www.unionspringslibrary.org/events', city: 'Union Springs', state: 'AL', zipCode: '36089', county: 'Union Springs County'},
  { name: 'Uniontown Public Library', url: 'https://www.uniontownlibrary.org', eventsUrl: 'https://www.uniontownlibrary.org/events', city: 'Uniontown', state: 'AL', zipCode: '36786', county: 'Uniontown County'},
  { name: 'H. Grady Bradshaw - Chambers County Library', url: 'https://www.valleylibrary.org', eventsUrl: 'https://www.valleylibrary.org/events', city: 'Valley', state: 'AL', zipCode: '36854', county: 'Valley County'},
  { name: 'Vernon - Mary Wallace Cobb Memorial Library', url: 'https://www.vernonlibrary.org', eventsUrl: 'https://www.vernonlibrary.org/events', city: 'Vernon', state: 'AL', zipCode: '35592', county: 'Vernon County'},
  { name: 'Vincent - Lallouise F. Mcgraw Library', url: 'https://www.vincentlibrary.org', eventsUrl: 'https://www.vincentlibrary.org/events', city: 'Vincent', state: 'AL', zipCode: '35178', county: 'Vincent County'},
  { name: 'Westside Public Library', url: 'https://www.walnutgrovelibrary.org', eventsUrl: 'https://www.walnutgrovelibrary.org/events', city: 'Walnut Grove', state: 'AL', zipCode: '35990', county: 'Walnut Grove County'},
  { name: 'Warrior Public Library', url: 'https://www.warriorlibrary.org', eventsUrl: 'https://www.warriorlibrary.org/events', city: 'Warrior', state: 'AL', zipCode: '35180', county: 'Warrior County'},
  { name: 'West Blocton Public Library', url: 'https://www.westbloctonlibrary.org', eventsUrl: 'https://www.westbloctonlibrary.org/events', city: 'West Blocton', state: 'AL', zipCode: '35184', county: 'West Blocton County'},
  { name: 'Westover Public Library', url: 'https://www.westoverlibrary.org', eventsUrl: 'https://www.westoverlibrary.org/events', city: 'Westover', state: 'AL', zipCode: '00000', county: 'Westover County'},
  { name: 'Wetumpka Public Library', url: 'https://www.wetumpkalibrary.org', eventsUrl: 'https://www.wetumpkalibrary.org/events', city: 'Wetumpka', state: 'AL', zipCode: '36092', county: 'Wetumpka County'},
  { name: 'White Hall Public Library', url: 'https://www.whitehalllibrary.org', eventsUrl: 'https://www.whitehalllibrary.org/events', city: 'White Hall', state: 'AL', zipCode: '36040', county: 'White Hall County'},
  { name: 'Wilsonville - Vernice Stoudenmire Library', url: 'https://www.wilsonvillelibrary.org', eventsUrl: 'https://www.wilsonvillelibrary.org/events', city: 'Wilsonville', state: 'AL', zipCode: '35186', county: 'Wilsonville County'},
  { name: 'Northwest Regional Library', url: 'https://www.winfieldlibrary.org', eventsUrl: 'https://www.winfieldlibrary.org/events', city: 'Winfield', state: 'AL', zipCode: '35594', county: 'Winfield County'},
  { name: 'Woodville Public Library', url: 'https://www.woodvillelibrary.org', eventsUrl: 'https://www.woodvillelibrary.org/events', city: 'Woodville', state: 'AL', zipCode: '35776', county: 'Woodville County'},
  { name: 'Hightower Memorial Library', url: 'https://www.yorklibrary.org', eventsUrl: 'https://www.yorklibrary.org/events', city: 'York', state: 'AL', zipCode: '36925', county: 'York County'}

];

const SCRAPER_NAME = 'wordpress-AL';

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
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
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

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('[class*="name"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}|^\d{1,2}:\d{2}/i)
                )
              ].filter(el => el);

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

              if (possibleTitles.length > 0) {
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  time: possibleDates.length > 1 ? possibleDates[1].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
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
            platform: 'generic',
            state: 'AL',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'AL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Alabama Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressALCloudFunction() {
  console.log('☁️ Running WordPress AL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-AL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-AL', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressALCloudFunction };
