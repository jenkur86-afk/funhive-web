const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
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
  { name: 'Abington Township Public Library', url: 'https://www.abingtonlibrary.org', eventsUrl: 'https://www.abingtonlibrary.org/events', city: 'Abington', state: 'PA', zipCode: '19001', county: 'Abington County'},
  { name: 'Adamstown Area Library', url: 'https://www.adamstownlibrary.org', eventsUrl: 'https://www.adamstownlibrary.org/events', city: 'Adamstown', state: 'PA', zipCode: '19501', county: 'Adamstown County'},
  { name: 'Aguada Public Library', url: 'https://www.aguadalibrary.org', eventsUrl: 'https://www.aguadalibrary.org/events', city: 'Aguada', state: 'PA', zipCode: '00602', county: 'Aguada County'},
  { name: 'Aguadilla Public Library (Ana Roque De Duprey)', url: 'https://www.aguadillalibrary.org', eventsUrl: 'https://www.aguadillalibrary.org/events', city: 'Aguadilla', state: 'PA', zipCode: '00605', county: 'Aguadilla County'},
  { name: 'Albion Area Public Library', url: 'https://www.albionlibrary.org', eventsUrl: 'https://www.albionlibrary.org/events', city: 'Albion', state: 'PA', zipCode: '16401', county: 'Albion County'},
  { name: 'Beaver County Library System', url: 'https://www.aliqiuipalibrary.org', eventsUrl: 'https://www.aliqiuipalibrary.org/events', city: 'Aliqiuipa', state: 'PA', zipCode: '15001', county: 'Aliqiuipa County'},
  { name: 'B F Jones Memorial Library', url: 'https://www.aliquippalibrary.org', eventsUrl: 'https://www.aliquippalibrary.org/events', city: 'Aliquippa', state: 'PA', zipCode: '15001', county: 'Aliquippa County'},
  { name: 'Allentown Public Library', url: 'https://www.allentownlibrary.org', eventsUrl: 'https://www.allentownlibrary.org/events', city: 'Allentown', state: 'PA', zipCode: '18102', county: 'Allentown County'},
  { name: 'Hampton Community Library', url: 'https://www.allisonparklibrary.org', eventsUrl: 'https://www.allisonparklibrary.org/events', city: 'Allison Park', state: 'PA', zipCode: '15101', county: 'Allison Park County'},
  { name: 'Altoona Area Public Library', url: 'https://www.altoonalibrary.org', eventsUrl: 'https://www.altoonalibrary.org/events', city: 'Altoona', state: 'PA', zipCode: '16602', county: 'Altoona County'},
  { name: 'Laughlin Memorial Free Library', url: 'https://www.ambridgelibrary.org', eventsUrl: 'https://www.ambridgelibrary.org/events', city: 'Ambridge', state: 'PA', zipCode: '15003', county: 'Ambridge County'},
  { name: 'Annville Free Library', url: 'https://www.annvillelibrary.org', eventsUrl: 'https://www.annvillelibrary.org/events', city: 'Annville', state: 'PA', zipCode: '17003', county: 'Annville County'},
  { name: 'Apollo Memorial Library', url: 'https://www.apollolibrary.org', eventsUrl: 'https://www.apollolibrary.org/events', city: 'Apollo', state: 'PA', zipCode: '15613', county: 'Apollo County'},
  { name: 'Ardmore Library', url: 'https://www.ardmorelibrary.org', eventsUrl: 'https://www.ardmorelibrary.org/events', city: 'Ardmore', state: 'PA', zipCode: '19003', county: 'Ardmore County'},
  { name: 'Arecibo Public Library (Nicolas Nabal Barreto)', url: 'https://www.arecibolibrary.org', eventsUrl: 'https://www.arecibolibrary.org/events', city: 'Arecibo', state: 'PA', zipCode: '00612', county: 'Arecibo County'},
  { name: 'Ashland Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'PA', zipCode: '17921', county: 'Ashland County'},
  { name: 'Aston Public Library', url: 'https://www.astonlibrary.org', eventsUrl: 'https://www.astonlibrary.org/events', city: 'Aston', state: 'PA', zipCode: '19014', county: 'Aston County'},
  { name: 'Atglen Public Library', url: 'https://www.atglenlibrary.org', eventsUrl: 'https://www.atglenlibrary.org/events', city: 'Atglen', state: 'PA', zipCode: '19310', county: 'Atglen County'},
  { name: 'Spalding Memorial Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'PA', zipCode: '18810', county: 'Athens County'},
  { name: 'Avalon Public Library', url: 'https://www.avalonlibrary.org', eventsUrl: 'https://www.avalonlibrary.org/events', city: 'Avalon', state: 'PA', zipCode: '15202', county: 'Avalon County'},
  { name: 'Avella Area Library Center', url: 'https://www.avellalibrary.org', eventsUrl: 'https://www.avellalibrary.org/events', city: 'Avella', state: 'PA', zipCode: '15312', county: 'Avella County'},
  { name: 'Avonmore Public Library', url: 'https://www.avonmorelibrary.org', eventsUrl: 'https://www.avonmorelibrary.org/events', city: 'Avonmore', state: 'PA', zipCode: '15618', county: 'Avonmore County'},
  { name: 'Baden Memorial Library', url: 'https://www.badenlibrary.org', eventsUrl: 'https://www.badenlibrary.org/events', city: 'Baden', state: 'PA', zipCode: '15005', county: 'Baden County'},
  { name: 'Bala Cynwyd Library', url: 'https://www.balacynwydlibrary.org', eventsUrl: 'https://www.balacynwydlibrary.org/events', city: 'Bala Cynwyd', state: 'PA', zipCode: '19004', county: 'Bala Cynwyd County'},
  { name: 'Bangor Public Library', url: 'https://www.bangorlibrary.org', eventsUrl: 'https://www.bangorlibrary.org/events', city: 'Bangor', state: 'PA', zipCode: '18013', county: 'Bangor County'},
  { name: 'Beaver Area Memorial Library', url: 'https://www.beaverlibrary.org', eventsUrl: 'https://www.beaverlibrary.org/events', city: 'Beaver', state: 'PA', zipCode: '15009', county: 'Beaver County'},
  { name: 'Beaver County Bookmobile Schedule', url: 'https://www.beaverfallslibrary.org', eventsUrl: 'https://www.beaverfallslibrary.org/events', city: 'Beaver Falls', state: 'PA', zipCode: '15010', county: 'Beaver Falls County'},
  { name: 'Beaverdale Public Library', url: 'https://www.beaverdalelibrary.org', eventsUrl: 'https://www.beaverdalelibrary.org/events', city: 'Beaverdale', state: 'PA', zipCode: '15921', county: 'Beaverdale County'},
  { name: 'Beavertown Community Library', url: 'https://www.beavertownlibrary.org', eventsUrl: 'https://www.beavertownlibrary.org/events', city: 'Beavertown', state: 'PA', zipCode: '17813', county: 'Beavertown County'},
  { name: 'Bedford County Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'PA', zipCode: '15522', county: 'Bedford County'},
  { name: 'Friendship Library', url: 'https://www.beechcreeklibrary.org', eventsUrl: 'https://www.beechcreeklibrary.org/events', city: 'Beech Creek', state: 'PA', zipCode: '16822', county: 'Beech Creek County'},
  { name: 'Belle Vernon Public Library', url: 'https://www.bellevernonlibrary.org', eventsUrl: 'https://www.bellevernonlibrary.org/events', city: 'Belle Vernon', state: 'PA', zipCode: '15012', county: 'Belle Vernon County'},
  { name: 'Centre County Library Historical Museum', url: 'https://www.bellefontelibrary.org', eventsUrl: 'https://www.bellefontelibrary.org/events', city: 'Bellefonte', state: 'PA', zipCode: '16823', county: 'Bellefonte County'},
  { name: 'Andrew Bayne Memorial Library', url: 'https://www.bellevuelibrary.org', eventsUrl: 'https://www.bellevuelibrary.org/events', city: 'Bellevue', state: 'PA', zipCode: '15202', county: 'Bellevue County'},
  { name: 'Bellwood Antis Public Library', url: 'https://www.bellwoodlibrary.org', eventsUrl: 'https://www.bellwoodlibrary.org/events', city: 'Bellwood', state: 'PA', zipCode: '16617', county: 'Bellwood County'},
  { name: 'Bucks County Free Library - Bensalem Branch', url: 'https://www.bensalemlibrary.org', eventsUrl: 'https://www.bensalemlibrary.org/events', city: 'Bensalem', state: 'PA', zipCode: '19020', county: 'Bensalem County'},
  { name: 'Bentleyville Public Library', url: 'https://www.bentleyvillelibrary.org', eventsUrl: 'https://www.bentleyvillelibrary.org/events', city: 'Bentleyville', state: 'PA', zipCode: '15314', county: 'Bentleyville County'},
  { name: 'Bernville Area Community Library', url: 'https://www.bernvillelibrary.org', eventsUrl: 'https://www.bernvillelibrary.org/events', city: 'Bernville', state: 'PA', zipCode: '19506', county: 'Bernville County'},
  { name: 'Mcbride Memorial Library', url: 'https://www.berwicklibrary.org', eventsUrl: 'https://www.berwicklibrary.org/events', city: 'Berwick', state: 'PA', zipCode: '18603', county: 'Berwick County'},
  { name: 'Easttown Library Info Center', url: 'https://www.berwynlibrary.org', eventsUrl: 'https://www.berwynlibrary.org/events', city: 'Berwyn', state: 'PA', zipCode: '19312', county: 'Berwyn County'},
  { name: 'F D Campbell Memorial Library', url: 'https://www.bessemerlibrary.org', eventsUrl: 'https://www.bessemerlibrary.org/events', city: 'Bessemer', state: 'PA', zipCode: '16112', county: 'Bessemer County'},
  { name: 'Bethany Public Library', url: 'https://www.bethanylibrary.org', eventsUrl: 'https://www.bethanylibrary.org/events', city: 'Bethany', state: 'PA', zipCode: '18431', county: 'Bethany County'},
  { name: 'Bethel-Tulpehocken Public Library', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'PA', zipCode: '19507', county: 'Bethel County'},
  { name: 'Bethel Park Public Library', url: 'https://www.bethelparklibrary.org', eventsUrl: 'https://www.bethelparklibrary.org/events', city: 'Bethel Park', state: 'PA', zipCode: '15102', county: 'Bethel Park County'},
  { name: 'Bethlehem Area Public Library', url: 'https://www.bethlehemlibrary.org', eventsUrl: 'https://www.bethlehemlibrary.org/events', city: 'Bethlehem', state: 'PA', zipCode: '18018', county: 'Bethlehem County'},
  { name: 'Harbaugh Thomas Library', url: 'https://www.biglervillelibrary.org', eventsUrl: 'https://www.biglervillelibrary.org/events', city: 'Biglerville', state: 'PA', zipCode: '17307', county: 'Biglerville County'},
  { name: 'Boone Area Library', url: 'https://www.birdsborolibrary.org', eventsUrl: 'https://www.birdsborolibrary.org/events', city: 'Birdsboro', state: 'PA', zipCode: '19508', county: 'Birdsboro County'},
  { name: 'Burrell Township Library', url: 'https://www.blacklicklibrary.org', eventsUrl: 'https://www.blacklicklibrary.org/events', city: 'Black Lick', state: 'PA', zipCode: '15716', county: 'Black Lick County'},
  { name: 'Community Library Of Western Perry County', url: 'https://www.blainlibrary.org', eventsUrl: 'https://www.blainlibrary.org/events', city: 'Blain', state: 'PA', zipCode: '17006', county: 'Blain County'},
  { name: 'Blairsville Public Library', url: 'https://www.blairsvillelibrary.org', eventsUrl: 'https://www.blairsvillelibrary.org/events', city: 'Blairsville', state: 'PA', zipCode: '15717', county: 'Blairsville County'},
  { name: 'Bloomsburg Public Library', url: 'https://www.bloomsburglibrary.org', eventsUrl: 'https://www.bloomsburglibrary.org/events', city: 'Bloomsburg', state: 'PA', zipCode: '17815', county: 'Bloomsburg County'},
  { name: 'Blossburg Memorial Library', url: 'https://www.blossburglibrary.org', eventsUrl: 'https://www.blossburglibrary.org/events', city: 'Blossburg', state: 'PA', zipCode: '16912', county: 'Blossburg County'},
  { name: 'Wissahickon Valley Pub Library', url: 'https://www.bluebelllibrary.org', eventsUrl: 'https://www.bluebelllibrary.org/events', city: 'Blue Bell', state: 'PA', zipCode: '19422', county: 'Blue Bell County'},
  { name: 'Blue Ridge Summit Free Library', url: 'https://www.blueridgesummitlibrary.org', eventsUrl: 'https://www.blueridgesummitlibrary.org/events', city: 'Blue Ridge Summit', state: 'PA', zipCode: '17214', county: 'Blue Ridge Summit County'},
  { name: 'Boyertown Community Library', url: 'https://www.boyertownlibrary.org', eventsUrl: 'https://www.boyertownlibrary.org/events', city: 'Boyertown', state: 'PA', zipCode: '19512', county: 'Boyertown County'},
  { name: 'Braddock Carnegie Library', url: 'https://www.braddocklibrary.org', eventsUrl: 'https://www.braddocklibrary.org/events', city: 'Braddock', state: 'PA', zipCode: '15104', county: 'Braddock County'},
  { name: 'Bradford Area Public Library', url: 'https://www.bradfordlibrary.org', eventsUrl: 'https://www.bradfordlibrary.org/events', city: 'Bradford', state: 'PA', zipCode: '16701', county: 'Bradford County'},
  { name: 'Bridgeville Public Library', url: 'https://www.bridgevillelibrary.org', eventsUrl: 'https://www.bridgevillelibrary.org/events', city: 'Bridgeville', state: 'PA', zipCode: '15017', county: 'Bridgeville County'},
  { name: 'Bucks County Free Library - Margaret R. Grundy Memorial Library', url: 'https://www.bristollibrary.org', eventsUrl: 'https://www.bristollibrary.org/events', city: 'Bristol', state: 'PA', zipCode: '19007', county: 'Bristol County'},
  { name: 'Mengle Memorial Library', url: 'https://www.brockwaylibrary.org', eventsUrl: 'https://www.brockwaylibrary.org/events', city: 'Brockway', state: 'PA', zipCode: '15824', county: 'Brockway County'},
  { name: 'Western Pocono Community Library', url: 'https://www.brodheadsvillelibrary.org', eventsUrl: 'https://www.brodheadsvillelibrary.org/events', city: 'Brodheadsville', state: 'PA', zipCode: '18322', county: 'Brodheadsville County'},
  { name: 'Rebecca M Arthurs Memorial Library', url: 'https://www.brookvillelibrary.org', eventsUrl: 'https://www.brookvillelibrary.org/events', city: 'Brookville', state: 'PA', zipCode: '15825', county: 'Brookville County'},
  { name: 'Marple Public Library', url: 'https://www.broomalllibrary.org', eventsUrl: 'https://www.broomalllibrary.org/events', city: 'Broomall', state: 'PA', zipCode: '19008', county: 'Broomall County'},
  { name: 'Brownsville Free Public Library', url: 'https://www.brownsvillelibrary.org', eventsUrl: 'https://www.brownsvillelibrary.org/events', city: 'Brownsville', state: 'PA', zipCode: '15417', county: 'Brownsville County'},
  { name: 'Ludington Library', url: 'https://www.brynmawrlibrary.org', eventsUrl: 'https://www.brynmawrlibrary.org/events', city: 'Bryn Mawr', state: 'PA', zipCode: '19010', county: 'Bryn Mawr County'},
  { name: 'Burgettstown Community Library', url: 'https://www.burgettstownlibrary.org', eventsUrl: 'https://www.burgettstownlibrary.org/events', city: 'Burgettstown', state: 'PA', zipCode: '15021', county: 'Burgettstown County'},
  { name: 'Pike County Public Library Drop Box - Lehman Township', url: 'https://www.bushkilllibrary.org', eventsUrl: 'https://www.bushkilllibrary.org/events', city: 'Bushkill', state: 'PA', zipCode: '18424', county: 'Bushkill County'},
  { name: 'Butler Area Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'PA', zipCode: '16001', county: 'Butler County'},
  { name: 'Caguas Public Library (Dr. Pedro Albizu Campos)', url: 'https://www.caguaslibrary.org', eventsUrl: 'https://www.caguaslibrary.org/events', city: 'Caguas', state: 'PA', zipCode: '72609', county: 'Caguas County'},
  { name: 'California Area Public Library', url: 'https://www.californialibrary.org', eventsUrl: 'https://www.californialibrary.org/events', city: 'California', state: 'PA', zipCode: '15419', county: 'California County'},
  { name: 'Cambridge Springs Public Library', url: 'https://www.cambridgespringslibrary.org', eventsUrl: 'https://www.cambridgespringslibrary.org/events', city: 'Cambridge Springs', state: 'PA', zipCode: '16403', county: 'Cambridge Springs County'},
  { name: 'Pine Creek Link', url: 'https://www.cammallibrary.org', eventsUrl: 'https://www.cammallibrary.org/events', city: 'Cammal', state: 'PA', zipCode: '17723', county: 'Cammal County'},
  { name: 'Cleve J. Fredricksen Library', url: 'https://www.camphilllibrary.org', eventsUrl: 'https://www.camphilllibrary.org/events', city: 'Camp Hill', state: 'PA', zipCode: '17011', county: 'Camp Hill County'},
  { name: 'Camuy Public Library', url: 'https://www.camuylibrary.org', eventsUrl: 'https://www.camuylibrary.org/events', city: 'Camuy', state: 'PA', zipCode: '00627', county: 'Camuy County'},
  { name: 'Greater Canonsburg Pub Library', url: 'https://www.canonsburglibrary.org', eventsUrl: 'https://www.canonsburglibrary.org/events', city: 'Canonsburg', state: 'PA', zipCode: '15317', county: 'Canonsburg County'},
  { name: 'Green Free Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'PA', zipCode: '17724', county: 'Canton County'},
  { name: 'Carbondale Public Library', url: 'https://www.carbondalelibrary.org', eventsUrl: 'https://www.carbondalelibrary.org/events', city: 'Carbondale', state: 'PA', zipCode: '18407', county: 'Carbondale County'},
  { name: 'Bosler Free Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'PA', zipCode: '17013', county: 'Carlisle County'},
  { name: 'Flenniken Public Library', url: 'https://www.carmichaelslibrary.org', eventsUrl: 'https://www.carmichaelslibrary.org/events', city: 'Carmichaels', state: 'PA', zipCode: '15320', county: 'Carmichaels County'},
  { name: 'Andrew Carnegie Free Library', url: 'https://www.carnegielibrary.org', eventsUrl: 'https://www.carnegielibrary.org/events', city: 'Carnegie', state: 'PA', zipCode: '15106', county: 'Carnegie County'},
  { name: 'Carrolltown Public Library', url: 'https://www.carrolltownlibrary.org', eventsUrl: 'https://www.carrolltownlibrary.org/events', city: 'Carrolltown', state: 'PA', zipCode: '15722', county: 'Carrolltown County'},
  { name: 'Community Library Of Castle Shannon', url: 'https://www.castleshannonlibrary.org', eventsUrl: 'https://www.castleshannonlibrary.org/events', city: 'Castle Shannon', state: 'PA', zipCode: '15234', county: 'Castle Shannon County'},
  { name: 'Catao Public Library (Alberto Davila Fuertes)', url: 'https://www.cataolibrary.org', eventsUrl: 'https://www.cataolibrary.org/events', city: 'Catao', state: 'PA', zipCode: '00962', county: 'Catao County'},
  { name: 'Catasauqua Public Library', url: 'https://www.catasauqualibrary.org', eventsUrl: 'https://www.catasauqualibrary.org/events', city: 'Catasauqua', state: 'PA', zipCode: '18032', county: 'Catasauqua County'},
  { name: 'Ceiba Public Library', url: 'https://www.ceibalibrary.org', eventsUrl: 'https://www.ceibalibrary.org/events', city: 'Ceiba', state: 'PA', zipCode: '00735', county: 'Ceiba County'},
  { name: 'Southern Lehigh Public Library', url: 'https://www.centervalleylibrary.org', eventsUrl: 'https://www.centervalleylibrary.org/events', city: 'Center Valley', state: 'PA', zipCode: '18034', county: 'Center Valley County'},
  { name: 'Coyle Free Library', url: 'https://www.chambersburglibrary.org', eventsUrl: 'https://www.chambersburglibrary.org/events', city: 'Chambersburg', state: 'PA', zipCode: '17201', county: 'Chambersburg County'},
  { name: 'John K Tener Library', url: 'https://www.charleroilibrary.org', eventsUrl: 'https://www.charleroilibrary.org/events', city: 'Charleroi', state: 'PA', zipCode: '15022', county: 'Charleroi County'},
  { name: 'J. Lewis Crozer Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'PA', zipCode: '19013', county: 'Chester County'},
  { name: 'Chester Springs Library', url: 'https://www.chesterspringslibrary.org', eventsUrl: 'https://www.chesterspringslibrary.org/events', city: 'Chester Springs', state: 'PA', zipCode: '19425', county: 'Chester Springs County'},
  { name: 'Moores Memorial Library', url: 'https://www.christianalibrary.org', eventsUrl: 'https://www.christianalibrary.org/events', city: 'Christiana', state: 'PA', zipCode: '17509', county: 'Christiana County'},
  { name: 'Clairton Public Library', url: 'https://www.clairtonlibrary.org', eventsUrl: 'https://www.clairtonlibrary.org/events', city: 'Clairton', state: 'PA', zipCode: '15025', county: 'Clairton County'},
  { name: 'Clarion County Library System', url: 'https://www.clarionlibrary.org', eventsUrl: 'https://www.clarionlibrary.org/events', city: 'Clarion', state: 'PA', zipCode: '00000', county: 'Clarion County'},
  { name: 'Abington Community Library', url: 'https://www.clarkssummitlibrary.org', eventsUrl: 'https://www.clarkssummitlibrary.org/events', city: 'Clarks Summit', state: 'PA', zipCode: '18411', county: 'Clarks Summit County'},
  { name: 'Claysburg Area Public Library Inc', url: 'https://www.claysburglibrary.org', eventsUrl: 'https://www.claysburglibrary.org/events', city: 'Claysburg', state: 'PA', zipCode: '16625', county: 'Claysburg County'},
  { name: 'Joseph Elizabeth Shaw Library', url: 'https://www.clearfieldlibrary.org', eventsUrl: 'https://www.clearfieldlibrary.org/events', city: 'Clearfield', state: 'PA', zipCode: '16830', county: 'Clearfield County'},
  { name: 'Coatesville Area Public Library', url: 'https://www.coatesvillelibrary.org', eventsUrl: 'https://www.coatesvillelibrary.org/events', city: 'Coatesville', state: 'PA', zipCode: '19320', county: 'Coatesville County'},
  { name: 'Cochranton Area Public Library', url: 'https://www.cochrantonlibrary.org', eventsUrl: 'https://www.cochrantonlibrary.org/events', city: 'Cochranton', state: 'PA', zipCode: '16314', county: 'Cochranton County'},
  { name: 'Collingdale Public Library', url: 'https://www.collingdalelibrary.org', eventsUrl: 'https://www.collingdalelibrary.org/events', city: 'Collingdale', state: 'PA', zipCode: '19023', county: 'Collingdale County'},
  { name: 'Columbia Public Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'PA', zipCode: '17512', county: 'Columbia County'},
  { name: 'Margaret Shontz Memorial Library', url: 'https://www.conneautlakelibrary.org', eventsUrl: 'https://www.conneautlakelibrary.org/events', city: 'Conneaut Lake', state: 'PA', zipCode: '16316', county: 'Conneaut Lake County'},
  { name: 'James A Stone Memorial Library', url: 'https://www.conneautvillelibrary.org', eventsUrl: 'https://www.conneautvillelibrary.org/events', city: 'Conneautville', state: 'PA', zipCode: '16406', county: 'Conneautville County'},
  { name: 'Carnegie Free Library - Connellsville', url: 'https://www.connellsvillelibrary.org', eventsUrl: 'https://www.connellsvillelibrary.org/events', city: 'Connellsville', state: 'PA', zipCode: '15425', county: 'Connellsville County'},
  { name: 'Conshohocken Free Library', url: 'https://www.conshohockenlibrary.org', eventsUrl: 'https://www.conshohockenlibrary.org/events', city: 'Conshohocken', state: 'PA', zipCode: '19428', county: 'Conshohocken County'},
  { name: 'Cooperstown Public Library', url: 'https://www.cooperstownlibrary.org', eventsUrl: 'https://www.cooperstownlibrary.org/events', city: 'Cooperstown', state: 'PA', zipCode: '16317', county: 'Cooperstown County'},
  { name: 'Coplay Public Library', url: 'https://www.coplaylibrary.org', eventsUrl: 'https://www.coplaylibrary.org/events', city: 'Coplay', state: 'PA', zipCode: '18037', county: 'Coplay County'},
  { name: 'Coraopolis Memorial Library', url: 'https://www.coraopolislibrary.org', eventsUrl: 'https://www.coraopolislibrary.org/events', city: 'Coraopolis', state: 'PA', zipCode: '15108', county: 'Coraopolis County'},
  { name: 'Corozal Public Library', url: 'https://www.corozallibrary.org', eventsUrl: 'https://www.corozallibrary.org/events', city: 'Corozal', state: 'PA', zipCode: '78322', county: 'Corozal County'},
  { name: 'Corry Public Library', url: 'https://www.corrylibrary.org', eventsUrl: 'https://www.corrylibrary.org/events', city: 'Corry', state: 'PA', zipCode: '16407', county: 'Corry County'},
  { name: 'Coudersport Public Library', url: 'https://www.coudersportlibrary.org', eventsUrl: 'https://www.coudersportlibrary.org/events', city: 'Coudersport', state: 'PA', zipCode: '16915', county: 'Coudersport County'},
  { name: 'Cranberry Public Library', url: 'https://www.cranberrytwplibrary.org', eventsUrl: 'https://www.cranberrytwplibrary.org/events', city: 'Cranberry Twp', state: 'PA', zipCode: '16066', county: 'Cranberry Twp County'},
  { name: 'Barrett Paradise Friendly Library', url: 'https://www.crescolibrary.org', eventsUrl: 'https://www.crescolibrary.org/events', city: 'Cresco', state: 'PA', zipCode: '18326', county: 'Cresco County'},
  { name: 'Cresson Public Library', url: 'https://www.cressonlibrary.org', eventsUrl: 'https://www.cressonlibrary.org/events', city: 'Cresson', state: 'PA', zipCode: '16630', county: 'Cresson County'},
  { name: 'Clearfield County Public Library', url: 'https://www.curwensvillelibrary.org', eventsUrl: 'https://www.curwensvillelibrary.org/events', city: 'Curwensville', state: 'PA', zipCode: '16833', county: 'Curwensville County'},
  { name: 'Back Mountain Memorial Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'PA', zipCode: '18612', county: 'Dallas County'},
  { name: 'Dalton Community Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'PA', zipCode: '18414', county: 'Dalton County'},
  { name: 'Thomas Beaver Free Library', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'PA', zipCode: '17821', county: 'Danville County'},
  { name: 'Darby Library', url: 'https://www.darbylibrary.org', eventsUrl: 'https://www.darbylibrary.org/events', city: 'Darby', state: 'PA', zipCode: '19023', county: 'Darby County'},
  { name: 'Brownfield Community Public Library', url: 'https://www.dawsonlibrary.org', eventsUrl: 'https://www.dawsonlibrary.org/events', city: 'Dawson', state: 'PA', zipCode: '15428', county: 'Dawson County'},
  { name: 'Delmont Public Library', url: 'https://www.delmontlibrary.org', eventsUrl: 'https://www.delmontlibrary.org/events', city: 'Delmont', state: 'PA', zipCode: '15626', county: 'Delmont County'},
  { name: 'Caldwell Memorial Library', url: 'https://www.derrylibrary.org', eventsUrl: 'https://www.derrylibrary.org/events', city: 'Derry', state: 'PA', zipCode: '15627', county: 'Derry County'},
  { name: 'Dillsburg Area Public Library', url: 'https://www.dillsburglibrary.org', eventsUrl: 'https://www.dillsburglibrary.org/events', city: 'Dillsburg', state: 'PA', zipCode: '17019', county: 'Dillsburg County'},
  { name: 'Donora Public Library', url: 'https://www.donoralibrary.org', eventsUrl: 'https://www.donoralibrary.org/events', city: 'Donora', state: 'PA', zipCode: '15033', county: 'Donora County'},
  { name: 'Dover Area Community Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'PA', zipCode: '17315', county: 'Dover County'},
  { name: 'Downingtown Library Company', url: 'https://www.downingtownlibrary.org', eventsUrl: 'https://www.downingtownlibrary.org/events', city: 'Downingtown', state: 'PA', zipCode: '19335', county: 'Downingtown County'},
  { name: 'Bucks County Free Library - Doylestown District Center Library', url: 'https://www.doylestownlibrary.org', eventsUrl: 'https://www.doylestownlibrary.org/events', city: 'Doylestown', state: 'PA', zipCode: '18901', county: 'Doylestown County'},
  { name: 'Dubois Public Library', url: 'https://www.duboislibrary.org', eventsUrl: 'https://www.duboislibrary.org/events', city: 'Dubois', state: 'PA', zipCode: '15801', county: 'Dubois County'},
  { name: 'Dunbar Community Library', url: 'https://www.dunbarlibrary.org', eventsUrl: 'https://www.dunbarlibrary.org/events', city: 'Dunbar', state: 'PA', zipCode: '15431', county: 'Dunbar County'},
  { name: 'Carnegie Library Of Mckeesport - Duquesne', url: 'https://www.duquesnelibrary.org', eventsUrl: 'https://www.duquesnelibrary.org/events', city: 'Duquesne', state: 'PA', zipCode: '15110', county: 'Duquesne County'},
  { name: 'Sullivan County Library', url: 'https://www.dushorelibrary.org', eventsUrl: 'https://www.dushorelibrary.org/events', city: 'Dushore', state: 'PA', zipCode: '18614', county: 'Dushore County'},
  { name: 'Lower Providence Community Library', url: 'https://www.eaglevillelibrary.org', eventsUrl: 'https://www.eaglevillelibrary.org/events', city: 'Eagleville', state: 'PA', zipCode: '19403', county: 'Eagleville County'},
  { name: 'East Berlin Community Library', url: 'https://www.eastberlinlibrary.org', eventsUrl: 'https://www.eastberlinlibrary.org/events', city: 'East Berlin', state: 'PA', zipCode: '17316', county: 'East Berlin County'},
  { name: 'Easton Area Public Library', url: 'https://www.eastonlibrary.org', eventsUrl: 'https://www.eastonlibrary.org/events', city: 'Easton', state: 'PA', zipCode: '18042', county: 'Easton County'},
  { name: 'Ebensburg Free Public Library', url: 'https://www.ebensburglibrary.org', eventsUrl: 'https://www.ebensburglibrary.org/events', city: 'Ebensburg', state: 'PA', zipCode: '15931', county: 'Ebensburg County'},
  { name: 'Carnegie Library Of Mckeesport - Elizabeth Forward', url: 'https://www.elizabethlibrary.org', eventsUrl: 'https://www.elizabethlibrary.org/events', city: 'Elizabeth', state: 'PA', zipCode: '15037', county: 'Elizabeth County'},
  { name: 'Elizabethtown Public Library', url: 'https://www.elizabethtownlibrary.org', eventsUrl: 'https://www.elizabethtownlibrary.org/events', city: 'Elizabethtown', state: 'PA', zipCode: '17022', county: 'Elizabethtown County'},
  { name: 'Elizabethville Area Library', url: 'https://www.elizabethvillelibrary.org', eventsUrl: 'https://www.elizabethvillelibrary.org/events', city: 'Elizabethville', state: 'PA', zipCode: '17023', county: 'Elizabethville County'},
  { name: 'Elkland Area Community Library', url: 'https://www.elklandlibrary.org', eventsUrl: 'https://www.elklandlibrary.org/events', city: 'Elkland', state: 'PA', zipCode: '16920', county: 'Elkland County'},
  { name: 'Ellwood City Area Pub Library', url: 'https://www.ellwoodcitylibrary.org', eventsUrl: 'https://www.ellwoodcitylibrary.org/events', city: 'Ellwood City', state: 'PA', zipCode: '16117', county: 'Ellwood City County'},
  { name: 'Ralpho Township Public Library', url: 'https://www.elysburglibrary.org', eventsUrl: 'https://www.elysburglibrary.org/events', city: 'Elysburg', state: 'PA', zipCode: '17824', county: 'Elysburg County'},
  { name: 'Emmaus Public Library', url: 'https://www.emmauslibrary.org', eventsUrl: 'https://www.emmauslibrary.org/events', city: 'Emmaus', state: 'PA', zipCode: '18049', county: 'Emmaus County'},
  { name: 'Barbara Moscato Brown Memorial Library', url: 'https://www.emporiumlibrary.org', eventsUrl: 'https://www.emporiumlibrary.org/events', city: 'Emporium', state: 'PA', zipCode: '15834', county: 'Emporium County'},
  { name: 'Ephrata Public Library', url: 'https://www.ephratalibrary.org', eventsUrl: 'https://www.ephratalibrary.org/events', city: 'Ephrata', state: 'PA', zipCode: '17522', county: 'Ephrata County'},
  { name: 'Erie County Public Library', url: 'https://www.erielibrary.org', eventsUrl: 'https://www.erielibrary.org/events', city: 'Erie', state: 'PA', zipCode: '16507', county: 'Erie County'},
  { name: 'Tinicum Memorial Public Library', url: 'https://www.essingtonlibrary.org', eventsUrl: 'https://www.essingtonlibrary.org/events', city: 'Essington', state: 'PA', zipCode: '19029', county: 'Essington County'},
  { name: 'Red Land Community Library', url: 'https://www.etterslibrary.org', eventsUrl: 'https://www.etterslibrary.org/events', city: 'Etters', state: 'PA', zipCode: '17319', county: 'Etters County'},
  { name: 'Evans City Public Library', url: 'https://www.evanscitylibrary.org', eventsUrl: 'https://www.evanscitylibrary.org/events', city: 'Evans City', state: 'PA', zipCode: '16033', county: 'Evans City County'},
  { name: 'Everett Free Library', url: 'https://www.everettlibrary.org', eventsUrl: 'https://www.everettlibrary.org/events', city: 'Everett', state: 'PA', zipCode: '15537', county: 'Everett County'},
  { name: 'Chester County Library', url: 'https://www.extonlibrary.org', eventsUrl: 'https://www.extonlibrary.org/events', city: 'Exton', state: 'PA', zipCode: '19341', county: 'Exton County'},
  { name: 'Factoryville Public Library', url: 'https://www.factoryvillelibrary.org', eventsUrl: 'https://www.factoryvillelibrary.org/events', city: 'Factoryville', state: 'PA', zipCode: '18419', county: 'Factoryville County'},
  { name: 'Fajardo Public Library (Arcadio S. Belaval)', url: 'https://www.fajardolibrary.org', eventsUrl: 'https://www.fajardolibrary.org/events', city: 'Fajardo', state: 'PA', zipCode: '00738', county: 'Fajardo County'},
  { name: 'Bucks County Free Library - Fallsington Library', url: 'https://www.fallsingtonlibrary.org', eventsUrl: 'https://www.fallsingtonlibrary.org/events', city: 'Fallsington', state: 'PA', zipCode: '19054', county: 'Fallsington County'},
  { name: 'Stey Nevant Public Library', url: 'https://www.farrelllibrary.org', eventsUrl: 'https://www.farrelllibrary.org/events', city: 'Farrell', state: 'PA', zipCode: '16121', county: 'Farrell County'},
  { name: 'Bucks County Free Library - Township Library Of Lower Southampton (Feasterville)', url: 'https://www.feastervillelibrary.org', eventsUrl: 'https://www.feastervillelibrary.org/events', city: 'Feasterville', state: 'PA', zipCode: '19053', county: 'Feasterville County'},
  { name: 'Fleetwood Area Public Library', url: 'https://www.fleetwoodlibrary.org', eventsUrl: 'https://www.fleetwoodlibrary.org/events', city: 'Fleetwood', state: 'PA', zipCode: '19522', county: 'Fleetwood County'},
  { name: 'Florida Municipal Library', url: 'https://www.floridalibrary.org', eventsUrl: 'https://www.floridalibrary.org/events', city: 'Florida', state: 'PA', zipCode: '00650', county: 'Florida County'},
  { name: 'Borough Of Folcroft Public Library', url: 'https://www.folcroftlibrary.org', eventsUrl: 'https://www.folcroftlibrary.org/events', city: 'Folcroft', state: 'PA', zipCode: '19032', county: 'Folcroft County'},
  { name: 'Ridley Township Public Library', url: 'https://www.folsomlibrary.org', eventsUrl: 'https://www.folsomlibrary.org/events', city: 'Folsom', state: 'PA', zipCode: '19033', county: 'Folsom County'},
  { name: 'Ford City Public Library', url: 'https://www.fordcitylibrary.org', eventsUrl: 'https://www.fordcitylibrary.org/events', city: 'Ford City', state: 'PA', zipCode: '16226', county: 'Ford City County'},
  { name: 'Susquehanna County Library - Forest City Branch Library', url: 'https://www.forestcitylibrary.org', eventsUrl: 'https://www.forestcitylibrary.org/events', city: 'Forest City', state: 'PA', zipCode: '18421', county: 'Forest City County'},
  { name: 'Fort Loudon Community Library', url: 'https://www.fortloudonlibrary.org', eventsUrl: 'https://www.fortloudonlibrary.org/events', city: 'Fort Loudon', state: 'PA', zipCode: '17224', county: 'Fort Loudon County'},
  { name: 'Upper Dublin Public Library', url: 'https://www.fortwashingtonlibrary.org', eventsUrl: 'https://www.fortwashingtonlibrary.org/events', city: 'Fort Washington', state: 'PA', zipCode: '19034', county: 'Fort Washington County'},
  { name: 'Foxburg Free Library Association', url: 'https://www.foxburglibrary.org', eventsUrl: 'https://www.foxburglibrary.org/events', city: 'Foxburg', state: 'PA', zipCode: '16036', county: 'Foxburg County'},
  { name: 'Frackville Free Public Library', url: 'https://www.frackvillelibrary.org', eventsUrl: 'https://www.frackvillelibrary.org/events', city: 'Frackville', state: 'PA', zipCode: '17931', county: 'Frackville County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'PA', zipCode: '16323', county: 'Franklin County'},
  { name: 'Matthews Public Library', url: 'https://www.fredericksburglibrary.org', eventsUrl: 'https://www.fredericksburglibrary.org/events', city: 'Fredericksburg', state: 'PA', zipCode: '17026', county: 'Fredericksburg County'},
  { name: 'Fredericktown Area Public Library', url: 'https://www.fredericktownlibrary.org', eventsUrl: 'https://www.fredericktownlibrary.org/events', city: 'Fredericktown', state: 'PA', zipCode: '15333', county: 'Fredericktown County'},
  { name: 'Galeton Public Library', url: 'https://www.galetonlibrary.org', eventsUrl: 'https://www.galetonlibrary.org/events', city: 'Galeton', state: 'PA', zipCode: '16922', county: 'Galeton County'},
  { name: 'Gallitzin Public Library', url: 'https://www.gallitzinlibrary.org', eventsUrl: 'https://www.gallitzinlibrary.org/events', city: 'Gallitzin', state: 'PA', zipCode: '16641', county: 'Gallitzin County'},
  { name: 'Pequea Valley Public Library - Gap Branch', url: 'https://www.gaplibrary.org', eventsUrl: 'https://www.gaplibrary.org/events', city: 'Gap', state: 'PA', zipCode: '17527', county: 'Gap County'},
  { name: 'Genesee Area Library', url: 'https://www.geneseelibrary.org', eventsUrl: 'https://www.geneseelibrary.org/events', city: 'Genesee', state: 'PA', zipCode: '16923', county: 'Genesee County'},
  { name: 'Adams County Library System', url: 'https://www.gettysburglibrary.org', eventsUrl: 'https://www.gettysburglibrary.org/events', city: 'Gettysburg', state: 'PA', zipCode: '17325', county: 'Gettysburg County'},
  { name: 'Northern Tier Regional Library - Pine Center', url: 'https://www.gibsonialibrary.org', eventsUrl: 'https://www.gibsonialibrary.org/events', city: 'Gibsonia', state: 'PA', zipCode: '15044', county: 'Gibsonia County'},
  { name: 'Rice Avenue Community Public Library', url: 'https://www.girardlibrary.org', eventsUrl: 'https://www.girardlibrary.org/events', city: 'Girard', state: 'PA', zipCode: '16417', county: 'Girard County'},
  { name: 'Gladwyne Library', url: 'https://www.gladwynelibrary.org', eventsUrl: 'https://www.gladwynelibrary.org/events', city: 'Gladwyne', state: 'PA', zipCode: '19035', county: 'Gladwyne County'},
  { name: 'Rachel Kohl Community Library', url: 'https://www.glenmillslibrary.org', eventsUrl: 'https://www.glenmillslibrary.org/events', city: 'Glen Mills', state: 'PA', zipCode: '19342', county: 'Glen Mills County'},
  { name: 'Arthur Hufnagel Public Library Of Glen Rock', url: 'https://www.glenrocklibrary.org', eventsUrl: 'https://www.glenrocklibrary.org/events', city: 'Glen Rock', state: 'PA', zipCode: '17327', county: 'Glen Rock County'},
  { name: 'Glenolden Library', url: 'https://www.glenoldenlibrary.org', eventsUrl: 'https://www.glenoldenlibrary.org/events', city: 'Glenolden', state: 'PA', zipCode: '19036', county: 'Glenolden County'},
  { name: 'Shaler North Hills Library', url: 'https://www.glenshawlibrary.org', eventsUrl: 'https://www.glenshawlibrary.org/events', city: 'Glenshaw', state: 'PA', zipCode: '15116', county: 'Glenshaw County'},
  { name: 'Cheltenham Township Library System', url: 'https://www.glensidelibrary.org', eventsUrl: 'https://www.glensidelibrary.org/events', city: 'Glenside', state: 'PA', zipCode: '19038', county: 'Glenside County'},
  { name: 'Pike County Public Library - Lackawaxen Township Branch', url: 'https://www.greeleylibrary.org', eventsUrl: 'https://www.greeleylibrary.org/events', city: 'Greeley', state: 'PA', zipCode: '18425', county: 'Greeley County'},
  { name: 'Lilian S. Besore Memorial Library', url: 'https://www.greencastlelibrary.org', eventsUrl: 'https://www.greencastlelibrary.org/events', city: 'Greencastle', state: 'PA', zipCode: '17225', county: 'Greencastle County'},
  { name: 'Greensburg Hempfield Area Library', url: 'https://www.greensburglibrary.org', eventsUrl: 'https://www.greensburglibrary.org/events', city: 'Greensburg', state: 'PA', zipCode: '15601', county: 'Greensburg County'},
  { name: 'Greenville Area Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'PA', zipCode: '16125', county: 'Greenville County'},
  { name: 'Grove City Community Library', url: 'https://www.grovecitylibrary.org', eventsUrl: 'https://www.grovecitylibrary.org/events', city: 'Grove City', state: 'PA', zipCode: '16127', county: 'Grove City County'},
  { name: 'Guanica Public Library (Domingo Suarez Cruz)', url: 'https://www.guanicalibrary.org', eventsUrl: 'https://www.guanicalibrary.org/events', city: 'Guanica', state: 'PA', zipCode: '00653', county: 'Guanica County'},
  { name: 'Guayama Electronic Municipal Library', url: 'https://www.guayamalibrary.org', eventsUrl: 'https://www.guayamalibrary.org/events', city: 'Guayama', state: 'PA', zipCode: '78503', county: 'Guayama County'},
  { name: 'Guayanilla Public Library (Julia Rojas Reyes)', url: 'https://www.guayanillalibrary.org', eventsUrl: 'https://www.guayanillalibrary.org/events', city: 'Guayanilla', state: 'PA', zipCode: '65606', county: 'Guayanilla County'},
  { name: 'San Juan Community Library At Bucaplaa', url: 'https://www.guaynabolibrary.org', eventsUrl: 'https://www.guaynabolibrary.org/events', city: 'Guaynabo', state: 'PA', zipCode: '97037', county: 'Guaynabo County'},
  { name: 'Gurabo Public Library (Jose Emilio Gonzalez)', url: 'https://www.gurabolibrary.org', eventsUrl: 'https://www.gurabolibrary.org/events', city: 'Gurabo', state: 'PA', zipCode: '00778', county: 'Gurabo County'},
  { name: 'Susquehanna County Library - Hallstead-Great Bend Branch Library', url: 'https://www.hallsteadlibrary.org', eventsUrl: 'https://www.hallsteadlibrary.org/events', city: 'Hallstead', state: 'PA', zipCode: '18822', county: 'Hallstead County'},
  { name: 'Hamburg Public Library', url: 'https://www.hamburglibrary.org', eventsUrl: 'https://www.hamburglibrary.org/events', city: 'Hamburg', state: 'PA', zipCode: '19526', county: 'Hamburg County'},
  { name: 'Salem Public Library', url: 'https://www.hamlinlibrary.org', eventsUrl: 'https://www.hamlinlibrary.org/events', city: 'Hamlin', state: 'PA', zipCode: '18427', county: 'Hamlin County'},
  { name: 'Guthrie Memorial Library - Hanovers Public Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'PA', zipCode: '17331', county: 'Hanover County'},
  { name: 'Dauphin County Library System', url: 'https://www.harrisburglibrary.org', eventsUrl: 'https://www.harrisburglibrary.org/events', city: 'Harrisburg', state: 'PA', zipCode: '17101', county: 'Harrisburg County'},
  { name: 'Penn Area Library', url: 'https://www.harrisoncitylibrary.org', eventsUrl: 'https://www.harrisoncitylibrary.org/events', city: 'Harrison City', state: 'PA', zipCode: '15636', county: 'Harrison City County'},
  { name: 'Hastings Public Library', url: 'https://www.hastingslibrary.org', eventsUrl: 'https://www.hastingslibrary.org/events', city: 'Hastings', state: 'PA', zipCode: '16646', county: 'Hastings County'},
  { name: 'Union Library Company Of Hatborough', url: 'https://www.hatborolibrary.org', eventsUrl: 'https://www.hatborolibrary.org/events', city: 'Hatboro', state: 'PA', zipCode: '19040', county: 'Hatboro County'},
  { name: 'Hatillo Electronic Library (Pedro Lopez)', url: 'https://www.hatillolibrary.org', eventsUrl: 'https://www.hatillolibrary.org/events', city: 'Hatillo', state: 'PA', zipCode: '65900', county: 'Hatillo County'},
  { name: 'Haverford Township Free Library', url: 'https://www.havertownlibrary.org', eventsUrl: 'https://www.havertownlibrary.org/events', city: 'Havertown', state: 'PA', zipCode: '19083', county: 'Havertown County'},
  { name: 'Hawley Library', url: 'https://www.hawleylibrary.org', eventsUrl: 'https://www.hawleylibrary.org/events', city: 'Hawley', state: 'PA', zipCode: '18428', county: 'Hawley County'},
  { name: 'Hazleton Area Public Library', url: 'https://www.hazletonlibrary.org', eventsUrl: 'https://www.hazletonlibrary.org/events', city: 'Hazleton', state: 'PA', zipCode: '18201', county: 'Hazleton County'},
  { name: 'Tri Valley Free Public Library', url: 'https://www.heginslibrary.org', eventsUrl: 'https://www.heginslibrary.org/events', city: 'Hegins', state: 'PA', zipCode: '17938', county: 'Hegins County'},
  { name: 'Kreutz Creek Valley Library Center', url: 'https://www.hellamlibrary.org', eventsUrl: 'https://www.hellamlibrary.org/events', city: 'Hellam', state: 'PA', zipCode: '17406', county: 'Hellam County'},
  { name: 'Hellertown Area Library', url: 'https://www.hellertownlibrary.org', eventsUrl: 'https://www.hellertownlibrary.org/events', city: 'Hellertown', state: 'PA', zipCode: '18055', county: 'Hellertown County'},
  { name: 'Sewickley Township Public Library', url: 'https://www.herminielibrary.org', eventsUrl: 'https://www.herminielibrary.org/events', city: 'Herminie', state: 'PA', zipCode: '15637', county: 'Herminie County'},
  { name: 'Hershey Public Library', url: 'https://www.hersheylibrary.org', eventsUrl: 'https://www.hersheylibrary.org/events', city: 'Hershey', state: 'PA', zipCode: '17033', county: 'Hershey County'},
  { name: 'Hollidaysburg Area Public Library', url: 'https://www.hollidaysburglibrary.org', eventsUrl: 'https://www.hollidaysburglibrary.org/events', city: 'Hollidaysburg', state: 'PA', zipCode: '16648', county: 'Hollidaysburg County'},
  { name: 'Somerset County Library - Conemaugh Township Branch', url: 'https://www.hollsopplelibrary.org', eventsUrl: 'https://www.hollsopplelibrary.org/events', city: 'Hollsopple', state: 'PA', zipCode: '15935', county: 'Hollsopple County'},
  { name: 'Wayne County Public Library', url: 'https://www.honesdalelibrary.org', eventsUrl: 'https://www.honesdalelibrary.org/events', city: 'Honesdale', state: 'PA', zipCode: '18431', county: 'Honesdale County'},
  { name: 'Honey Brook Community Library', url: 'https://www.honeybrooklibrary.org', eventsUrl: 'https://www.honeybrooklibrary.org/events', city: 'Honey Brook', state: 'PA', zipCode: '19344', county: 'Honey Brook County'},
  { name: 'Hormigueros Public Municipal Library', url: 'https://www.hormigueroslibrary.org', eventsUrl: 'https://www.hormigueroslibrary.org/events', city: 'Hormigueros', state: 'PA', zipCode: '00660', county: 'Hormigueros County'},
  { name: 'Horsham Township Library', url: 'https://www.horshamlibrary.org', eventsUrl: 'https://www.horshamlibrary.org/events', city: 'Horsham', state: 'PA', zipCode: '19044', county: 'Horsham County'},
  { name: 'Chartiers-Houston Com Library', url: 'https://www.houstonlibrary.org', eventsUrl: 'https://www.houstonlibrary.org/events', city: 'Houston', state: 'PA', zipCode: '15342', county: 'Houston County'},
  { name: 'Hughesville Area Public Library', url: 'https://www.hughesvillelibrary.org', eventsUrl: 'https://www.hughesvillelibrary.org/events', city: 'Hughesville', state: 'PA', zipCode: '17737', county: 'Hughesville County'},
  { name: 'William H. Marion C. Alexander Family Library', url: 'https://www.hummelstownlibrary.org', eventsUrl: 'https://www.hummelstownlibrary.org/events', city: 'Hummelstown', state: 'PA', zipCode: '17036', county: 'Hummelstown County'},
  { name: 'Huntingdon County Library', url: 'https://www.huntingdonlibrary.org', eventsUrl: 'https://www.huntingdonlibrary.org/events', city: 'Huntingdon', state: 'PA', zipCode: '16652', county: 'Huntingdon County'},
  { name: 'Huntingdon Valley Library', url: 'https://www.huntingdonvalleylibrary.org', eventsUrl: 'https://www.huntingdonvalleylibrary.org/events', city: 'Huntingdon Valley', state: 'PA', zipCode: '19006', county: 'Huntingdon Valley County'},
  { name: 'Hustontown Branch Library', url: 'https://www.hustontownlibrary.org', eventsUrl: 'https://www.hustontownlibrary.org/events', city: 'Hustontown', state: 'PA', zipCode: '17229', county: 'Hustontown County'},
  { name: 'Hyde Park Public Library', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'PA', zipCode: '15641', county: 'Hyde Park County'},
  { name: 'Hyndman-Londonderry Public Library', url: 'https://www.hyndmanlibrary.org', eventsUrl: 'https://www.hyndmanlibrary.org/events', city: 'Hyndman', state: 'PA', zipCode: '15545', county: 'Hyndman County'},
  { name: 'Indiana Free Library Inc', url: 'https://www.indianalibrary.org', eventsUrl: 'https://www.indianalibrary.org/events', city: 'Indiana', state: 'PA', zipCode: '15701', county: 'Indiana County'},
  { name: 'Pequea Valley Public Library', url: 'https://www.intercourselibrary.org', eventsUrl: 'https://www.intercourselibrary.org/events', city: 'Intercourse', state: 'PA', zipCode: '17534', county: 'Intercourse County'},
  { name: 'Norwin Public Library Association', url: 'https://www.irwinlibrary.org', eventsUrl: 'https://www.irwinlibrary.org/events', city: 'Irwin', state: 'PA', zipCode: '15642', county: 'Irwin County'},
  { name: 'Village Library', url: 'https://www.jacobuslibrary.org', eventsUrl: 'https://www.jacobuslibrary.org/events', city: 'Jacobus', state: 'PA', zipCode: '17407', county: 'Jacobus County'},
  { name: 'Jayuya Public Library (Nemesio R. Canales)', url: 'https://www.jayuyalibrary.org', eventsUrl: 'https://www.jayuyalibrary.org/events', city: 'Jayuya', state: 'PA', zipCode: '66404', county: 'Jayuya County'},
  { name: 'Jeannette Public Library', url: 'https://www.jeannettelibrary.org', eventsUrl: 'https://www.jeannettelibrary.org/events', city: 'Jeannette', state: 'PA', zipCode: '15644', county: 'Jeannette County'},
  { name: 'Greene County Library System', url: 'https://www.jeffersonlibrary.org', eventsUrl: 'https://www.jeffersonlibrary.org/events', city: 'Jefferson', state: 'PA', zipCode: '15344', county: 'Jefferson County'},
  { name: 'Jefferson Hills Public Library', url: 'https://www.jeffersonhillslibrary.org', eventsUrl: 'https://www.jeffersonhillslibrary.org/events', city: 'Jefferson Hills', state: 'PA', zipCode: '15025', county: 'Jefferson Hills County'},
  { name: 'Jenkintown Library', url: 'https://www.jenkintownlibrary.org', eventsUrl: 'https://www.jenkintownlibrary.org/events', city: 'Jenkintown', state: 'PA', zipCode: '19046', county: 'Jenkintown County'},
  { name: 'Jersey Shore Public Library', url: 'https://www.jerseyshorelibrary.org', eventsUrl: 'https://www.jerseyshorelibrary.org/events', city: 'Jersey Shore', state: 'PA', zipCode: '17740', county: 'Jersey Shore County'},
  { name: 'Dimmick Memorial Library', url: 'https://www.jimthorpelibrary.org', eventsUrl: 'https://www.jimthorpelibrary.org/events', city: 'Jim Thorpe', state: 'PA', zipCode: '18229', county: 'Jim Thorpe County'},
  { name: 'Johnsonburg Public Library', url: 'https://www.johnsonburglibrary.org', eventsUrl: 'https://www.johnsonburglibrary.org/events', city: 'Johnsonburg', state: 'PA', zipCode: '15845', county: 'Johnsonburg County'},
  { name: 'Cambria County Library System', url: 'https://www.johnstownlibrary.org', eventsUrl: 'https://www.johnstownlibrary.org/events', city: 'Johnstown', state: 'PA', zipCode: '15901', county: 'Johnstown County'},
  { name: 'Juncos Public Library (Dr. Jose M. Gallardo)', url: 'https://www.juncoslibrary.org', eventsUrl: 'https://www.juncoslibrary.org/events', city: 'Juncos', state: 'PA', zipCode: '00777', county: 'Juncos County'},
  { name: 'Friends Memorial Library', url: 'https://www.kanelibrary.org', eventsUrl: 'https://www.kanelibrary.org/events', city: 'Kane', state: 'PA', zipCode: '16735', county: 'Kane County'},
  { name: 'Bayard Taylor Memorial Library', url: 'https://www.kennettsquarelibrary.org', eventsUrl: 'https://www.kennettsquarelibrary.org/events', city: 'Kennett Square', state: 'PA', zipCode: '19348', county: 'Kennett Square County'},
  { name: 'Upper Merion Township Library', url: 'https://www.kingofprussialibrary.org', eventsUrl: 'https://www.kingofprussialibrary.org/events', city: 'King Of Prussia', state: 'PA', zipCode: '19406', county: 'King Of Prussia County'},
  { name: 'Hoyt Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'PA', zipCode: '18704', county: 'Kingston County'},
  { name: 'Kittanning Public Library', url: 'https://www.kittanninglibrary.org', eventsUrl: 'https://www.kittanninglibrary.org/events', city: 'Kittanning', state: 'PA', zipCode: '16201', county: 'Kittanning County'},
  { name: 'Knox Public Library', url: 'https://www.knoxlibrary.org', eventsUrl: 'https://www.knoxlibrary.org/events', city: 'Knox', state: 'PA', zipCode: '16232', county: 'Knox County'},
  { name: 'Knoxville Public Library', url: 'https://www.knoxvillelibrary.org', eventsUrl: 'https://www.knoxvillelibrary.org/events', city: 'Knoxville', state: 'PA', zipCode: '16928', county: 'Knoxville County'},
  { name: 'Louisa Gonser Community Library Inc', url: 'https://www.kutztownlibrary.org', eventsUrl: 'https://www.kutztownlibrary.org/events', city: 'Kutztown', state: 'PA', zipCode: '19530', county: 'Kutztown County'},
  { name: 'Laceyville Public Library', url: 'https://www.laceyvillelibrary.org', eventsUrl: 'https://www.laceyvillelibrary.org/events', city: 'Laceyville', state: 'PA', zipCode: '18623', county: 'Laceyville County'},
  { name: 'William Jeanes Memorial Library', url: 'https://www.lafayettehilllibrary.org', eventsUrl: 'https://www.lafayettehilllibrary.org/events', city: 'Lafayette Hill', state: 'PA', zipCode: '19444', county: 'Lafayette Hill County'},
  { name: 'Northern Wayne Community Library', url: 'https://www.lakewoodlibrary.org', eventsUrl: 'https://www.lakewoodlibrary.org/events', city: 'Lakewood', state: 'PA', zipCode: '18439', county: 'Lakewood County'},
  { name: 'Lancaster Public Library', url: 'https://www.lancasterlibrary.org', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'PA', zipCode: '17602', county: 'Lancaster County'},
  { name: 'Bucks County Free Library - Langhorne Branch', url: 'https://www.langhornelibrary.org', eventsUrl: 'https://www.langhornelibrary.org/events', city: 'Langhorne', state: 'PA', zipCode: '19047', county: 'Langhorne County'},
  { name: 'Lansdale Public Library', url: 'https://www.lansdalelibrary.org', eventsUrl: 'https://www.lansdalelibrary.org/events', city: 'Lansdale', state: 'PA', zipCode: '19446', county: 'Lansdale County'},
  { name: 'Lansdowne Public Library', url: 'https://www.lansdownelibrary.org', eventsUrl: 'https://www.lansdownelibrary.org/events', city: 'Lansdowne', state: 'PA', zipCode: '19050', county: 'Lansdowne County'},
  { name: 'Las Piedras Municipal Library (Aurea M. Perez)', url: 'https://www.laspiedraslibrary.org', eventsUrl: 'https://www.laspiedraslibrary.org/events', city: 'Las Piedras', state: 'PA', zipCode: '00771', county: 'Las Piedras County'},
  { name: 'Adams Memorial Library', url: 'https://www.latrobelibrary.org', eventsUrl: 'https://www.latrobelibrary.org/events', city: 'Latrobe', state: 'PA', zipCode: '15650', county: 'Latrobe County'},
  { name: 'Muhlenberg Community Library', url: 'https://www.laureldalelibrary.org', eventsUrl: 'https://www.laureldalelibrary.org/events', city: 'Laureldale', state: 'PA', zipCode: '19605', county: 'Laureldale County'},
  { name: 'West End Library', url: 'https://www.laureltonlibrary.org', eventsUrl: 'https://www.laureltonlibrary.org/events', city: 'Laurelton', state: 'PA', zipCode: '17835', county: 'Laurelton County'},
  { name: 'Lebanon Community Library', url: 'https://www.lebanonlibrary.org', eventsUrl: 'https://www.lebanonlibrary.org/events', city: 'Lebanon', state: 'PA', zipCode: '17046', county: 'Lebanon County'},
  { name: 'Schuylkill Valley Community Library', url: 'https://www.leesportlibrary.org', eventsUrl: 'https://www.leesportlibrary.org/events', city: 'Leesport', state: 'PA', zipCode: '19533', county: 'Leesport County'},
  { name: 'Lehighton Area Memorial Library', url: 'https://www.lehightonlibrary.org', eventsUrl: 'https://www.lehightonlibrary.org/events', city: 'Lehighton', state: 'PA', zipCode: '18235', county: 'Lehighton County'},
  { name: 'Lancaster Public Library - Leola Branch', url: 'https://www.leolalibrary.org', eventsUrl: 'https://www.leolalibrary.org/events', city: 'Leola', state: 'PA', zipCode: '17540', county: 'Leola County'},
  { name: 'Bucks County Free Library - Levittown Branch', url: 'https://www.levittownlibrary.org', eventsUrl: 'https://www.levittownlibrary.org/events', city: 'Levittown', state: 'PA', zipCode: '19055', county: 'Levittown County'},
  { name: 'Public Library For Union County', url: 'https://www.lewisburglibrary.org', eventsUrl: 'https://www.lewisburglibrary.org/events', city: 'Lewisburg', state: 'PA', zipCode: '17837', county: 'Lewisburg County'},
  { name: 'Mifflin County Library', url: 'https://www.lewistownlibrary.org', eventsUrl: 'https://www.lewistownlibrary.org/events', city: 'Lewistown', state: 'PA', zipCode: '17044', county: 'Lewistown County'},
  { name: 'Ligonier Valley Library', url: 'https://www.ligonierlibrary.org', eventsUrl: 'https://www.ligonierlibrary.org/events', city: 'Ligonier', state: 'PA', zipCode: '15658', county: 'Ligonier County'},
  { name: 'Lilly Washington Pub Library', url: 'https://www.lillylibrary.org', eventsUrl: 'https://www.lillylibrary.org/events', city: 'Lilly', state: 'PA', zipCode: '15938', county: 'Lilly County'},
  { name: 'Middletown Free Library', url: 'https://www.limalibrary.org', eventsUrl: 'https://www.limalibrary.org/events', city: 'Lima', state: 'PA', zipCode: '19037', county: 'Lima County'},
  { name: 'Linesville Community Public Library', url: 'https://www.linesvillelibrary.org', eventsUrl: 'https://www.linesvillelibrary.org/events', city: 'Linesville', state: 'PA', zipCode: '16424', county: 'Linesville County'},
  { name: 'Lititz Public Library', url: 'https://www.lititzlibrary.org', eventsUrl: 'https://www.lititzlibrary.org/events', city: 'Lititz', state: 'PA', zipCode: '17543', county: 'Lititz County'},
  { name: 'Littlestown Library', url: 'https://www.littlestownlibrary.org', eventsUrl: 'https://www.littlestownlibrary.org/events', city: 'Littlestown', state: 'PA', zipCode: '17340', county: 'Littlestown County'},
  { name: 'Annie Halenbake Ross Library', url: 'https://www.lockhavenlibrary.org', eventsUrl: 'https://www.lockhavenlibrary.org/events', city: 'Lock Haven', state: 'PA', zipCode: '17745', county: 'Lock Haven County'},
  { name: 'Loiza Public Library', url: 'https://www.loizalibrary.org', eventsUrl: 'https://www.loizalibrary.org/events', city: 'Loiza', state: 'PA', zipCode: '00772', county: 'Loiza County'},
  { name: 'Peoples Library - Lower Burrell', url: 'https://www.lowerburrelllibrary.org', eventsUrl: 'https://www.lowerburrelllibrary.org/events', city: 'Lower Burrell', state: 'PA', zipCode: '15068', county: 'Lower Burrell County'},
  { name: 'Northern Dauphin Library', url: 'https://www.lykenslibrary.org', eventsUrl: 'https://www.lykenslibrary.org/events', city: 'Lykens', state: 'PA', zipCode: '17048', county: 'Lykens County'},
  { name: 'Lower Macungie Library', url: 'https://www.macungielibrary.org', eventsUrl: 'https://www.macungielibrary.org/events', city: 'Macungie', state: 'PA', zipCode: '18062', county: 'Macungie County'},
  { name: 'Mahanoy City Public Library', url: 'https://www.mahanoycitylibrary.org', eventsUrl: 'https://www.mahanoycitylibrary.org/events', city: 'Mahanoy City', state: 'PA', zipCode: '17948', county: 'Mahanoy City County'},
  { name: 'Malvern Public Library', url: 'https://www.malvernlibrary.org', eventsUrl: 'https://www.malvernlibrary.org/events', city: 'Malvern', state: 'PA', zipCode: '19355', county: 'Malvern County'},
  { name: 'Manheim Community Library', url: 'https://www.manheimlibrary.org', eventsUrl: 'https://www.manheimlibrary.org/events', city: 'Manheim', state: 'PA', zipCode: '17545', county: 'Manheim County'},
  { name: 'Manor Public Library', url: 'https://www.manorlibrary.org', eventsUrl: 'https://www.manorlibrary.org/events', city: 'Manor', state: 'PA', zipCode: '15665', county: 'Manor County'},
  { name: 'Mansfield Free Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'PA', zipCode: '16933', county: 'Mansfield County'},
  { name: 'Mary M Campbell Library', url: 'https://www.marcushooklibrary.org', eventsUrl: 'https://www.marcushooklibrary.org/events', city: 'Marcus Hook', state: 'PA', zipCode: '19061', county: 'Marcus Hook County'},
  { name: 'Marianna Community Public Library', url: 'https://www.mariannalibrary.org', eventsUrl: 'https://www.mariannalibrary.org/events', city: 'Marianna', state: 'PA', zipCode: '15345', county: 'Marianna County'},
  { name: 'Marienville Area Library', url: 'https://www.marienvillelibrary.org', eventsUrl: 'https://www.marienvillelibrary.org/events', city: 'Marienville', state: 'PA', zipCode: '16239', county: 'Marienville County'},
  { name: 'Mars Area Public Library', url: 'https://www.marslibrary.org', eventsUrl: 'https://www.marslibrary.org/events', city: 'Mars', state: 'PA', zipCode: '16046', county: 'Mars County'},
  { name: 'Martinsburg Community Library', url: 'https://www.martinsburglibrary.org', eventsUrl: 'https://www.martinsburglibrary.org/events', city: 'Martinsburg', state: 'PA', zipCode: '16662', county: 'Martinsburg County'},
  { name: 'Marysville Rye Library', url: 'https://www.marysvillelibrary.org', eventsUrl: 'https://www.marysvillelibrary.org/events', city: 'Marysville', state: 'PA', zipCode: '17053', county: 'Marysville County'},
  { name: 'German-Masontown Public Library', url: 'https://www.masontownlibrary.org', eventsUrl: 'https://www.masontownlibrary.org/events', city: 'Masontown', state: 'PA', zipCode: '15461', county: 'Masontown County'},
  { name: 'Pike County Public Library Drop Box - Matamoras', url: 'https://www.matamoraslibrary.org', eventsUrl: 'https://www.matamoraslibrary.org/events', city: 'Matamoras', state: 'PA', zipCode: '18336', county: 'Matamoras County'},
  { name: 'Mcclure Community Library', url: 'https://www.mcclurelibrary.org', eventsUrl: 'https://www.mcclurelibrary.org/events', city: 'Mcclure', state: 'PA', zipCode: '17841', county: 'Mcclure County'},
  { name: 'Fulton County Library', url: 'https://www.mcconnellsburglibrary.org', eventsUrl: 'https://www.mcconnellsburglibrary.org/events', city: 'Mcconnellsburg', state: 'PA', zipCode: '17233', county: 'Mcconnellsburg County'},
  { name: 'Heritage Public Library', url: 'https://www.mcdonaldlibrary.org', eventsUrl: 'https://www.mcdonaldlibrary.org/events', city: 'Mcdonald', state: 'PA', zipCode: '15057', county: 'Mcdonald County'},
  { name: 'Montgomery House Warrior Run Area Public Library', url: 'https://www.mcewensvillelibrary.org', eventsUrl: 'https://www.mcewensvillelibrary.org/events', city: 'Mcewensville', state: 'PA', zipCode: '17749', county: 'Mcewensville County'},
  { name: 'F.O.R. Sto-Rox Library', url: 'https://www.mckeesrockslibrary.org', eventsUrl: 'https://www.mckeesrockslibrary.org/events', city: 'Mckees Rocks', state: 'PA', zipCode: '15136', county: 'Mckees Rocks County'},
  { name: 'Carnegie Library Of Mckeesport', url: 'https://www.mckeesportlibrary.org', eventsUrl: 'https://www.mckeesportlibrary.org/events', city: 'Mckeesport', state: 'PA', zipCode: '15132', county: 'Mckeesport County'},
  { name: 'Peters Township Public Library', url: 'https://www.mcmurraylibrary.org', eventsUrl: 'https://www.mcmurraylibrary.org/events', city: 'Mcmurray', state: 'PA', zipCode: '15317', county: 'Mcmurray County'},
  { name: 'Meadville Public Library', url: 'https://www.meadvillelibrary.org', eventsUrl: 'https://www.meadvillelibrary.org/events', city: 'Meadville', state: 'PA', zipCode: '16335', county: 'Meadville County'},
  { name: 'Joseph T. Simpson Public Library', url: 'https://www.mechanicsburglibrary.org', eventsUrl: 'https://www.mechanicsburglibrary.org/events', city: 'Mechanicsburg', state: 'PA', zipCode: '17055', county: 'Mechanicsburg County'},
  { name: 'Francis J. Catania Law Library', url: 'https://www.medialibrary.org', eventsUrl: 'https://www.medialibrary.org/events', city: 'Media', state: 'PA', zipCode: '19063', county: 'Media County'},
  { name: 'Mercer Area Library', url: 'https://www.mercerlibrary.org', eventsUrl: 'https://www.mercerlibrary.org/events', city: 'Mercer', state: 'PA', zipCode: '16137', county: 'Mercer County'},
  { name: 'Meyersdale Public Library', url: 'https://www.meyersdalelibrary.org', eventsUrl: 'https://www.meyersdalelibrary.org/events', city: 'Meyersdale', state: 'PA', zipCode: '15552', county: 'Meyersdale County'},
  { name: 'Middleburg Community Library', url: 'https://www.middleburglibrary.org', eventsUrl: 'https://www.middleburglibrary.org/events', city: 'Middleburg', state: 'PA', zipCode: '17842', county: 'Middleburg County'},
  { name: 'Middletown Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'PA', zipCode: '17057', county: 'Middletown County'},
  { name: 'Carnegie Library, Midland', url: 'https://www.midlandlibrary.org', eventsUrl: 'https://www.midlandlibrary.org/events', city: 'Midland', state: 'PA', zipCode: '15059', county: 'Midland County'},
  { name: 'Herr Memorial Library', url: 'https://www.mifflinburglibrary.org', eventsUrl: 'https://www.mifflinburglibrary.org/events', city: 'Mifflinburg', state: 'PA', zipCode: '17844', county: 'Mifflinburg County'},
  { name: 'Juniata County Library', url: 'https://www.mifflintownlibrary.org', eventsUrl: 'https://www.mifflintownlibrary.org/events', city: 'Mifflintown', state: 'PA', zipCode: '17059', county: 'Mifflintown County'},
  { name: 'Pike County Public Library - Dingman Township Branch', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'PA', zipCode: '18328', county: 'Milford County'},
  { name: 'Johnson Memorial Library', url: 'https://www.millersburglibrary.org', eventsUrl: 'https://www.millersburglibrary.org/events', city: 'Millersburg', state: 'PA', zipCode: '17061', county: 'Millersburg County'},
  { name: 'Milton Public Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'PA', zipCode: '17847', county: 'Milton County'},
  { name: 'Minersville Public Library', url: 'https://www.minersvillelibrary.org', eventsUrl: 'https://www.minersvillelibrary.org/events', city: 'Minersville', state: 'PA', zipCode: '17954', county: 'Minersville County'},
  { name: 'Community College Of Beaver County', url: 'https://www.monacalibrary.org', eventsUrl: 'https://www.monacalibrary.org/events', city: 'Monaca', state: 'PA', zipCode: '15061', county: 'Monaca County'},
  { name: 'Monessen Public Library District Center', url: 'https://www.monessenlibrary.org', eventsUrl: 'https://www.monessenlibrary.org/events', city: 'Monessen', state: 'PA', zipCode: '15062', county: 'Monessen County'},
  { name: 'Monongahela Area Library', url: 'https://www.monongahelalibrary.org', eventsUrl: 'https://www.monongahelalibrary.org/events', city: 'Monongahela', state: 'PA', zipCode: '15063', county: 'Monongahela County'},
  { name: 'Monroeton Public Library', url: 'https://www.monroetonlibrary.org', eventsUrl: 'https://www.monroetonlibrary.org/events', city: 'Monroeton', state: 'PA', zipCode: '18832', county: 'Monroeton County'},
  { name: 'Monroeville Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'PA', zipCode: '15146', county: 'Monroeville County'},
  { name: 'Montgomery Area Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'PA', zipCode: '17752', county: 'Montgomery County'},
  { name: 'Dr. W. B. Konkle Memorial Library', url: 'https://www.montoursvillelibrary.org', eventsUrl: 'https://www.montoursvillelibrary.org/events', city: 'Montoursville', state: 'PA', zipCode: '17754', county: 'Montoursville County'},
  { name: 'Susquehanna County Historical Society Free Library Association', url: 'https://www.montroselibrary.org', eventsUrl: 'https://www.montroselibrary.org/events', city: 'Montrose', state: 'PA', zipCode: '18801', county: 'Montrose County'},
  { name: 'Moon Township Public Library', url: 'https://www.moontownshiplibrary.org', eventsUrl: 'https://www.moontownshiplibrary.org/events', city: 'Moon Township', state: 'PA', zipCode: '15108', county: 'Moon Township County'},
  { name: 'South Fayette Township Library', url: 'https://www.morganlibrary.org', eventsUrl: 'https://www.morganlibrary.org/events', city: 'Morgan', state: 'PA', zipCode: '15064', county: 'Morgan County'},
  { name: 'Village Library Of Morgantown', url: 'https://www.morgantownlibrary.org', eventsUrl: 'https://www.morgantownlibrary.org/events', city: 'Morgantown', state: 'PA', zipCode: '19543', county: 'Morgantown County'},
  { name: 'Morovis Electronic Municipal Library', url: 'https://www.morovislibrary.org', eventsUrl: 'https://www.morovislibrary.org/events', city: 'Morovis', state: 'PA', zipCode: '00687', county: 'Morovis County'},
  { name: 'Bucks County Free Library - Morrisville Free Library', url: 'https://www.morrisvillelibrary.org', eventsUrl: 'https://www.morrisvillelibrary.org/events', city: 'Morrisville', state: 'PA', zipCode: '19067', county: 'Morrisville County'},
  { name: 'North Pocono Public Library', url: 'https://www.moscowlibrary.org', eventsUrl: 'https://www.moscowlibrary.org/events', city: 'Moscow', state: 'PA', zipCode: '18444', county: 'Moscow County'},
  { name: 'Mount Carmel Public Library', url: 'https://www.mountcarmellibrary.org', eventsUrl: 'https://www.mountcarmellibrary.org/events', city: 'Mount Carmel', state: 'PA', zipCode: '17851', county: 'Mount Carmel County'},
  { name: 'Mount Jewett Memorial Library', url: 'https://www.mountjewettlibrary.org', eventsUrl: 'https://www.mountjewettlibrary.org/events', city: 'Mount Jewett', state: 'PA', zipCode: '16740', county: 'Mount Jewett County'},
  { name: 'Milanof-Schock Library', url: 'https://www.mountjoylibrary.org', eventsUrl: 'https://www.mountjoylibrary.org/events', city: 'Mount Joy', state: 'PA', zipCode: '17552', county: 'Mount Joy County'},
  { name: 'Mount Pleasant Free Public Library Association', url: 'https://www.mountpleasantlibrary.org', eventsUrl: 'https://www.mountpleasantlibrary.org/events', city: 'Mount Pleasant', state: 'PA', zipCode: '15666', county: 'Mount Pleasant County'},
  { name: 'Marian Sutherland Kirby Library', url: 'https://www.mountaintoplibrary.org', eventsUrl: 'https://www.mountaintoplibrary.org/events', city: 'Mountaintop', state: 'PA', zipCode: '18707', county: 'Mountaintop County'},
  { name: 'Lancaster Public Library West - Mountville Branch', url: 'https://www.mountvillelibrary.org', eventsUrl: 'https://www.mountvillelibrary.org/events', city: 'Mountville', state: 'PA', zipCode: '17554', county: 'Mountville County'},
  { name: 'Amelia S Givin Library', url: 'https://www.mthollyspringslibrary.org', eventsUrl: 'https://www.mthollyspringslibrary.org/events', city: 'Mt Holly Springs', state: 'PA', zipCode: '17065', county: 'Mt Holly Springs County'},
  { name: 'Muncy Public Library', url: 'https://www.muncylibrary.org', eventsUrl: 'https://www.muncylibrary.org/events', city: 'Muncy', state: 'PA', zipCode: '17756', county: 'Muncy County'},
  { name: 'Carnegie Library Of Homestead', url: 'https://www.munhalllibrary.org', eventsUrl: 'https://www.munhalllibrary.org/events', city: 'Munhall', state: 'PA', zipCode: '15120', county: 'Munhall County'},
  { name: 'Westmoreland Library Network', url: 'https://www.murrsyvillelibrary.org', eventsUrl: 'https://www.murrsyvillelibrary.org/events', city: 'Murrsyville', state: 'PA', zipCode: '15668', county: 'Murrsyville County'},
  { name: 'Murrysville Community Library', url: 'https://www.murrysvillelibrary.org', eventsUrl: 'https://www.murrysvillelibrary.org/events', city: 'Murrysville', state: 'PA', zipCode: '15668', county: 'Murrysville County'},
  { name: 'Myerstown Community Library', url: 'https://www.myerstownlibrary.org', eventsUrl: 'https://www.myerstownlibrary.org/events', city: 'Myerstown', state: 'PA', zipCode: '17067', county: 'Myerstown County'},
  { name: 'Mill Memorial Library', url: 'https://www.nanticokelibrary.org', eventsUrl: 'https://www.nanticokelibrary.org/events', city: 'Nanticoke', state: 'PA', zipCode: '18634', county: 'Nanticoke County'},
  { name: 'Nanty Glo Public Library', url: 'https://www.nantyglolibrary.org', eventsUrl: 'https://www.nantyglolibrary.org/events', city: 'Nanty Glo', state: 'PA', zipCode: '15943', county: 'Nanty Glo County'},
  { name: 'Naranjito Public Municipal Library (Eugenio Morales Ayala)', url: 'https://www.naranjitolibrary.org', eventsUrl: 'https://www.naranjitolibrary.org/events', city: 'Naranjito', state: 'PA', zipCode: '00719', county: 'Naranjito County'},
  { name: 'Narberth Community Library', url: 'https://www.narberthlibrary.org', eventsUrl: 'https://www.narberthlibrary.org/events', city: 'Narberth', state: 'PA', zipCode: '19072', county: 'Narberth County'},
  { name: 'Community Library Of Allegheny Valley - Harrison Location', url: 'https://www.natronaheightslibrary.org', eventsUrl: 'https://www.natronaheightslibrary.org/events', city: 'Natrona Heights', state: 'PA', zipCode: '15065', county: 'Natrona Heights County'},
  { name: 'Memorial Library Of Nazareth Vicinity', url: 'https://www.nazarethlibrary.org', eventsUrl: 'https://www.nazarethlibrary.org/events', city: 'Nazareth', state: 'PA', zipCode: '18064', county: 'Nazareth County'},
  { name: 'New Albany Community Library', url: 'https://www.newalbanylibrary.org', eventsUrl: 'https://www.newalbanylibrary.org/events', city: 'New Albany', state: 'PA', zipCode: '18833', county: 'New Albany County'},
  { name: 'New Alexandria Public Library', url: 'https://www.newalexandrialibrary.org', eventsUrl: 'https://www.newalexandrialibrary.org/events', city: 'New Alexandria', state: 'PA', zipCode: '15670', county: 'New Alexandria County'},
  { name: 'New Bethlehem Area Free Public Library', url: 'https://www.newbethlehemlibrary.org', eventsUrl: 'https://www.newbethlehemlibrary.org/events', city: 'New Bethlehem', state: 'PA', zipCode: '16242', county: 'New Bethlehem County'},
  { name: 'Bloomfield Public Library', url: 'https://www.newbloomfieldlibrary.org', eventsUrl: 'https://www.newbloomfieldlibrary.org/events', city: 'New Bloomfield', state: 'PA', zipCode: '17068', county: 'New Bloomfield County'},
  { name: 'New Brighton Public Library', url: 'https://www.newbrightonlibrary.org', eventsUrl: 'https://www.newbrightonlibrary.org/events', city: 'New Brighton', state: 'PA', zipCode: '15066', county: 'New Brighton County'},
  { name: 'New Castle Public Library', url: 'https://www.newcastlelibrary.org', eventsUrl: 'https://www.newcastlelibrary.org/events', city: 'New Castle', state: 'PA', zipCode: '16101', county: 'New Castle County'},
  { name: 'New Cumberland Public Library', url: 'https://www.newcumberlandlibrary.org', eventsUrl: 'https://www.newcumberlandlibrary.org/events', city: 'New Cumberland', state: 'PA', zipCode: '17070', county: 'New Cumberland County'},
  { name: 'New Florence Community Library', url: 'https://www.newflorencelibrary.org', eventsUrl: 'https://www.newflorencelibrary.org/events', city: 'New Florence', state: 'PA', zipCode: '15944', county: 'New Florence County'},
  { name: 'Eastern Lancaster County Library', url: 'https://www.newhollandlibrary.org', eventsUrl: 'https://www.newhollandlibrary.org/events', city: 'New Holland', state: 'PA', zipCode: '17557', county: 'New Holland County'},
  { name: 'Bucks County Free Library - Free Library Of New Hope And Solebury', url: 'https://www.newhopelibrary.org', eventsUrl: 'https://www.newhopelibrary.org/events', city: 'New Hope', state: 'PA', zipCode: '18938', county: 'New Hope County'},
  { name: 'Peoples Library - New Kensington', url: 'https://www.newkensingtonlibrary.org', eventsUrl: 'https://www.newkensingtonlibrary.org/events', city: 'New Kensington', state: 'PA', zipCode: '15068', county: 'New Kensington County'},
  { name: 'Pratt Memorial Library', url: 'https://www.newmilfordlibrary.org', eventsUrl: 'https://www.newmilfordlibrary.org/events', city: 'New Milford', state: 'PA', zipCode: '18834', county: 'New Milford County'},
  { name: 'New Oxford Area Library', url: 'https://www.newoxfordlibrary.org', eventsUrl: 'https://www.newoxfordlibrary.org/events', city: 'New Oxford', state: 'PA', zipCode: '17350', county: 'New Oxford County'},
  { name: 'Newfoundland Area Public Library', url: 'https://www.newfoundlandlibrary.org', eventsUrl: 'https://www.newfoundlandlibrary.org/events', city: 'Newfoundland', state: 'PA', zipCode: '18445', county: 'Newfoundland County'},
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'PA', zipCode: '17074', county: 'Newport County'},
  { name: 'Newtown Public Library', url: 'https://www.newtownsquarelibrary.org', eventsUrl: 'https://www.newtownsquarelibrary.org/events', city: 'Newtown Square', state: 'PA', zipCode: '19073', county: 'Newtown Square County'},
  { name: 'John Graham Public Library', url: 'https://www.newvillelibrary.org', eventsUrl: 'https://www.newvillelibrary.org/events', city: 'Newville', state: 'PA', zipCode: '17241', county: 'Newville County'},
  { name: 'Montgomery County-Norristown Public Library', url: 'https://www.norristownlibrary.org', eventsUrl: 'https://www.norristownlibrary.org/events', city: 'Norristown', state: 'PA', zipCode: '19401', county: 'Norristown County'},
  { name: 'Mccord Memorial Library', url: 'https://www.northeastlibrary.org', eventsUrl: 'https://www.northeastlibrary.org/events', city: 'North East', state: 'PA', zipCode: '16428', county: 'North East County'},
  { name: 'North Versailles Public Library', url: 'https://www.northversailleslibrary.org', eventsUrl: 'https://www.northversailleslibrary.org/events', city: 'North Versailles', state: 'PA', zipCode: '15137', county: 'North Versailles County'},
  { name: 'North Wales Library', url: 'https://www.northwaleslibrary.org', eventsUrl: 'https://www.northwaleslibrary.org/events', city: 'North Wales', state: 'PA', zipCode: '19454', county: 'North Wales County'},
  { name: 'Northampton Area Pub Library', url: 'https://www.northamptonlibrary.org', eventsUrl: 'https://www.northamptonlibrary.org/events', city: 'Northampton', state: 'PA', zipCode: '18067', county: 'Northampton County'},
  { name: 'Northern Cambria Public Library', url: 'https://www.northerncambrialibrary.org', eventsUrl: 'https://www.northerncambrialibrary.org/events', city: 'Northern Cambria', state: 'PA', zipCode: '15714', county: 'Northern Cambria County'},
  { name: 'Priestley Forsyth Memorial Library', url: 'https://www.northumberlandlibrary.org', eventsUrl: 'https://www.northumberlandlibrary.org/events', city: 'Northumberland', state: 'PA', zipCode: '17857', county: 'Northumberland County'},
  { name: 'Norwood Public Library', url: 'https://www.norwoodlibrary.org', eventsUrl: 'https://www.norwoodlibrary.org/events', city: 'Norwood', state: 'PA', zipCode: '19074', county: 'Norwood County'},
  { name: 'Western Allegheny Community Library', url: 'https://www.oakdalelibrary.org', eventsUrl: 'https://www.oakdalelibrary.org/events', city: 'Oakdale', state: 'PA', zipCode: '15071', county: 'Oakdale County'},
  { name: 'Oakmont Carnegie Library', url: 'https://www.oakmontlibrary.org', eventsUrl: 'https://www.oakmontlibrary.org/events', city: 'Oakmont', state: 'PA', zipCode: '15139', county: 'Oakmont County'},
  { name: 'Oil City Library', url: 'https://www.oilcitylibrary.org', eventsUrl: 'https://www.oilcitylibrary.org/events', city: 'Oil City', state: 'PA', zipCode: '16301', county: 'Oil City County'},
  { name: 'Orwigsburg Area Fr Pub Library', url: 'https://www.orwigsburglibrary.org', eventsUrl: 'https://www.orwigsburglibrary.org/events', city: 'Orwigsburg', state: 'PA', zipCode: '17961', county: 'Orwigsburg County'},
  { name: 'Osceola Mills Public Library', url: 'https://www.osceolamillslibrary.org', eventsUrl: 'https://www.osceolamillslibrary.org/events', city: 'Osceola Mills', state: 'PA', zipCode: '16666', county: 'Osceola Mills County'},
  { name: 'Oxford Public Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'PA', zipCode: '19363', county: 'Oxford County'},
  { name: 'Palmerton Library', url: 'https://www.palmertonlibrary.org', eventsUrl: 'https://www.palmertonlibrary.org/events', city: 'Palmerton', state: 'PA', zipCode: '18071', county: 'Palmerton County'},
  { name: 'Palmyra Public Library', url: 'https://www.palmyralibrary.org', eventsUrl: 'https://www.palmyralibrary.org/events', city: 'Palmyra', state: 'PA', zipCode: '17078', county: 'Palmyra County'},
  { name: 'Parkesburg Free Library', url: 'https://www.parkesburglibrary.org', eventsUrl: 'https://www.parkesburglibrary.org/events', city: 'Parkesburg', state: 'PA', zipCode: '19365', county: 'Parkesburg County'},
  { name: 'Patillas Public Library (Luis Manuel Santana Gaston)', url: 'https://www.patillaslibrary.org', eventsUrl: 'https://www.patillaslibrary.org/events', city: 'Patillas', state: 'PA', zipCode: '72306', county: 'Patillas County'},
  { name: 'Patton Public Library', url: 'https://www.pattonlibrary.org', eventsUrl: 'https://www.pattonlibrary.org/events', city: 'Patton', state: 'PA', zipCode: '16668', county: 'Patton County'},
  { name: 'Valley Community Library', url: 'https://www.peckvillelibrary.org', eventsUrl: 'https://www.peckvillelibrary.org/events', city: 'Peckville', state: 'PA', zipCode: '18452', county: 'Peckville County'},
  { name: 'Bucks County Free Library - Perkasie', url: 'https://www.perkasielibrary.org', eventsUrl: 'https://www.perkasielibrary.org/events', city: 'Perkasie', state: 'PA', zipCode: '18944', county: 'Perkasie County'},
  { name: 'Mary Fuller Frazier School Community Library', url: 'https://www.perryopolislibrary.org', eventsUrl: 'https://www.perryopolislibrary.org/events', city: 'Perryopolis', state: 'PA', zipCode: '15473', county: 'Perryopolis County'},
  { name: 'Free Library Of Philadelphia', url: 'https://www.philadelphialibrary.org', eventsUrl: 'https://www.philadelphialibrary.org/events', city: 'Philadelphia', state: 'PA', zipCode: '19103', county: 'Philadelphia County'},
  { name: 'Phoenixville Public Library', url: 'https://www.phoenixvillelibrary.org', eventsUrl: 'https://www.phoenixvillelibrary.org/events', city: 'Phoenixville', state: 'PA', zipCode: '19460', county: 'Phoenixville County'},
  { name: 'Bucks County Free Library - Pipersville Free Library', url: 'https://www.pipersvillelibrary.org', eventsUrl: 'https://www.pipersvillelibrary.org/events', city: 'Pipersville', state: 'PA', zipCode: '18947', county: 'Pipersville County'},
  { name: 'Allegheny County Library Association', url: 'https://www.pittsburghlibrary.org', eventsUrl: 'https://www.pittsburghlibrary.org/events', city: 'Pittsburgh', state: 'PA', zipCode: '15220', county: 'Pittsburgh County'},
  { name: 'Pittston Memorial Library', url: 'https://www.pittstonlibrary.org', eventsUrl: 'https://www.pittstonlibrary.org/events', city: 'Pittston', state: 'PA', zipCode: '18640', county: 'Pittston County'},
  { name: 'Pleasant Mount Public Library', url: 'https://www.pleasantmountlibrary.org', eventsUrl: 'https://www.pleasantmountlibrary.org/events', city: 'Pleasant Mount', state: 'PA', zipCode: '18453', county: 'Pleasant Mount County'},
  { name: 'Plymouth Public Library', url: 'https://www.plymouthlibrary.org', eventsUrl: 'https://www.plymouthlibrary.org/events', city: 'Plymouth', state: 'PA', zipCode: '18651', county: 'Plymouth County'},
  { name: 'Clymer Library Association', url: 'https://www.poconopineslibrary.org', eventsUrl: 'https://www.poconopineslibrary.org/events', city: 'Pocono Pines', state: 'PA', zipCode: '18350', county: 'Pocono Pines County'},
  { name: 'Point Marion Library', url: 'https://www.pointmarionlibrary.org', eventsUrl: 'https://www.pointmarionlibrary.org/events', city: 'Point Marion', state: 'PA', zipCode: '15474', county: 'Point Marion County'},
  { name: 'Ponce Municipal Library (Mariana Suarez De Longo Municipal A', url: 'https://www.poncelibrary.org', eventsUrl: 'https://www.poncelibrary.org/events', city: 'Ponce', state: 'PA', zipCode: '73317', county: 'Ponce County'},
  { name: 'Samuel W Smith Mem Pub Library', url: 'https://www.portalleganylibrary.org', eventsUrl: 'https://www.portalleganylibrary.org/events', city: 'Port Allegany', state: 'PA', zipCode: '16743', county: 'Port Allegany County'},
  { name: 'Port Carbon Public Library', url: 'https://www.portcarbonlibrary.org', eventsUrl: 'https://www.portcarbonlibrary.org/events', city: 'Port Carbon', state: 'PA', zipCode: '17965', county: 'Port Carbon County'},
  { name: 'Portage Public Library', url: 'https://www.portagelibrary.org', eventsUrl: 'https://www.portagelibrary.org/events', city: 'Portage', state: 'PA', zipCode: '15946', county: 'Portage County'},
  { name: 'Pottstown Public Library', url: 'https://www.pottstownlibrary.org', eventsUrl: 'https://www.pottstownlibrary.org/events', city: 'Pottstown', state: 'PA', zipCode: '19464', county: 'Pottstown County'},
  { name: 'Pottsville Free Public Library', url: 'https://www.pottsvillelibrary.org', eventsUrl: 'https://www.pottsvillelibrary.org/events', city: 'Pottsville', state: 'PA', zipCode: '17901', county: 'Pottsville County'},
  { name: 'Upper Darby Township Sellers Memorial Free Public Library', url: 'https://www.primoslibrary.org', eventsUrl: 'https://www.primoslibrary.org/events', city: 'Primos', state: 'PA', zipCode: '19018', county: 'Primos County'},
  { name: 'Prospect Community Library', url: 'https://www.prospectlibrary.org', eventsUrl: 'https://www.prospectlibrary.org/events', city: 'Prospect', state: 'PA', zipCode: '16052', county: 'Prospect County'},
  { name: 'Prospect Park Free Library', url: 'https://www.prospectparklibrary.org', eventsUrl: 'https://www.prospectparklibrary.org/events', city: 'Prospect Park', state: 'PA', zipCode: '19076', county: 'Prospect Park County'},
  { name: 'Punxsutawney Memorial Library', url: 'https://www.punxsutawneylibrary.org', eventsUrl: 'https://www.punxsutawneylibrary.org/events', city: 'Punxsutawney', state: 'PA', zipCode: '15767', county: 'Punxsutawney County'},
  { name: 'Bucks County Free Library - Quakertown Branch', url: 'https://www.quakertownlibrary.org', eventsUrl: 'https://www.quakertownlibrary.org/events', city: 'Quakertown', state: 'PA', zipCode: '18951', county: 'Quakertown County'},
  { name: 'Quarryville Library Center', url: 'https://www.quarryvillelibrary.org', eventsUrl: 'https://www.quarryvillelibrary.org/events', city: 'Quarryville', state: 'PA', zipCode: '17566', county: 'Quarryville County'},
  { name: 'Ralston Link', url: 'https://www.ralstonlibrary.org', eventsUrl: 'https://www.ralstonlibrary.org/events', city: 'Ralston', state: 'PA', zipCode: '17763', county: 'Ralston County'},
  { name: 'Berks County Public Libraries', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'PA', zipCode: '19605', county: 'Reading County'},
  { name: 'Upper Perkiomen Valley Library', url: 'https://www.redhilllibrary.org', eventsUrl: 'https://www.redhilllibrary.org/events', city: 'Red Hill', state: 'PA', zipCode: '18076', county: 'Red Hill County'},
  { name: 'Kaltreider-Benfer Library', url: 'https://www.redlionlibrary.org', eventsUrl: 'https://www.redlionlibrary.org/events', city: 'Red Lion', state: 'PA', zipCode: '17356', county: 'Red Lion County'},
  { name: 'Renovo Library', url: 'https://www.renovolibrary.org', eventsUrl: 'https://www.renovolibrary.org/events', city: 'Renovo', state: 'PA', zipCode: '17764', county: 'Renovo County'},
  { name: 'Republic Community Library', url: 'https://www.republiclibrary.org', eventsUrl: 'https://www.republiclibrary.org/events', city: 'Republic', state: 'PA', zipCode: '15475', county: 'Republic County'},
  { name: 'Reynoldsville Public Library', url: 'https://www.reynoldsvillelibrary.org', eventsUrl: 'https://www.reynoldsvillelibrary.org/events', city: 'Reynoldsville', state: 'PA', zipCode: '15851', county: 'Reynoldsville County'},
  { name: 'Bucks County Free Library - Free Library Of Northampton Township', url: 'https://www.richborolibrary.org', eventsUrl: 'https://www.richborolibrary.org/events', city: 'Richboro', state: 'PA', zipCode: '18954', county: 'Richboro County'},
  { name: 'Richland Community Library', url: 'https://www.richlandlibrary.org', eventsUrl: 'https://www.richlandlibrary.org/events', city: 'Richland', state: 'PA', zipCode: '17087', county: 'Richland County'},
  { name: 'Ridgway Public Library', url: 'https://www.ridgwaylibrary.org', eventsUrl: 'https://www.ridgwaylibrary.org/events', city: 'Ridgway', state: 'PA', zipCode: '15853', county: 'Ridgway County'},
  { name: 'Ridley Park Public Library', url: 'https://www.ridleyparklibrary.org', eventsUrl: 'https://www.ridleyparklibrary.org/events', city: 'Ridley Park', state: 'PA', zipCode: '19078', county: 'Ridley Park County'},
  { name: 'Bucks County Free Library - Riegelsville Public Library', url: 'https://www.riegelsvillelibrary.org', eventsUrl: 'https://www.riegelsvillelibrary.org/events', city: 'Riegelsville', state: 'PA', zipCode: '18077', county: 'Riegelsville County'},
  { name: 'Eccles Lesher Memorial Library', url: 'https://www.rimersburglibrary.org', eventsUrl: 'https://www.rimersburglibrary.org/events', city: 'Rimersburg', state: 'PA', zipCode: '16248', county: 'Rimersburg County'},
  { name: 'Ringtown Area Library', url: 'https://www.ringtownlibrary.org', eventsUrl: 'https://www.ringtownlibrary.org/events', city: 'Ringtown', state: 'PA', zipCode: '17967', county: 'Ringtown County'},
  { name: 'Roaring Spring Comm Library', url: 'https://www.roaringspringlibrary.org', eventsUrl: 'https://www.roaringspringlibrary.org/events', city: 'Roaring Spring', state: 'PA', zipCode: '16673', county: 'Roaring Spring County'},
  { name: 'Robesonia Community Library', url: 'https://www.robesonialibrary.org', eventsUrl: 'https://www.robesonialibrary.org/events', city: 'Robesonia', state: 'PA', zipCode: '19551', county: 'Robesonia County'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterlibrary.org', eventsUrl: 'https://www.rochesterlibrary.org/events', city: 'Rochester', state: 'PA', zipCode: '15074', county: 'Rochester County'},
  { name: 'Royersford Free Public Library', url: 'https://www.royersfordlibrary.org', eventsUrl: 'https://www.royersfordlibrary.org/events', city: 'Royersford', state: 'PA', zipCode: '19468', county: 'Royersford County'},
  { name: 'Saegertown Area Library', url: 'https://www.saegertownlibrary.org', eventsUrl: 'https://www.saegertownlibrary.org/events', city: 'Saegertown', state: 'PA', zipCode: '16433', county: 'Saegertown County'},
  { name: 'Saltsburg Free Library', url: 'https://www.saltsburglibrary.org', eventsUrl: 'https://www.saltsburglibrary.org/events', city: 'Saltsburg', state: 'PA', zipCode: '15681', county: 'Saltsburg County'},
  { name: 'San German Public Library (Raquel Quinones)', url: 'https://www.sangermanlibrary.org', eventsUrl: 'https://www.sangermanlibrary.org/events', city: 'San German', state: 'PA', zipCode: '68340', county: 'San German County'},
  { name: 'Biblioteca De Todos - La Fondita De Jesus', url: 'https://www.sanjuanlibrary.org', eventsUrl: 'https://www.sanjuanlibrary.org/events', city: 'San Juan', state: 'PA', zipCode: '91013', county: 'San Juan County'},
  { name: 'Saxonburg Area Library', url: 'https://www.saxonburglibrary.org', eventsUrl: 'https://www.saxonburglibrary.org/events', city: 'Saxonburg', state: 'PA', zipCode: '16056', county: 'Saxonburg County'},
  { name: 'Saxton Community Library', url: 'https://www.saxtonlibrary.org', eventsUrl: 'https://www.saxtonlibrary.org/events', city: 'Saxton', state: 'PA', zipCode: '16678', county: 'Saxton County'},
  { name: 'Sayre Public Library', url: 'https://www.sayrelibrary.org', eventsUrl: 'https://www.sayrelibrary.org/events', city: 'Sayre', state: 'PA', zipCode: '18840', county: 'Sayre County'},
  { name: 'Schuylkill Haven Free Public Library', url: 'https://www.schuylkillhavenlibrary.org', eventsUrl: 'https://www.schuylkillhavenlibrary.org/events', city: 'Schuylkill Haven', state: 'PA', zipCode: '17972', county: 'Schuylkill Haven County'},
  { name: 'Perkiomen Valley Library At Schwenksville', url: 'https://www.schwenksvillelibrary.org', eventsUrl: 'https://www.schwenksvillelibrary.org/events', city: 'Schwenksville', state: 'PA', zipCode: '19473', county: 'Schwenksville County'},
  { name: 'Scott Township Public Library', url: 'https://www.scotttownshiplibrary.org', eventsUrl: 'https://www.scotttownshiplibrary.org/events', city: 'Scott Township', state: 'PA', zipCode: '15106', county: 'Scott Township County'},
  { name: 'Scottdale Public Library', url: 'https://www.scottdalelibrary.org', eventsUrl: 'https://www.scottdalelibrary.org/events', city: 'Scottdale', state: 'PA', zipCode: '15683', county: 'Scottdale County'},
  { name: 'Albright Memorial Library', url: 'https://www.scrantonlibrary.org', eventsUrl: 'https://www.scrantonlibrary.org/events', city: 'Scranton', state: 'PA', zipCode: '18509', county: 'Scranton County'},
  { name: 'Selinsgrove Community Library', url: 'https://www.selinsgrovelibrary.org', eventsUrl: 'https://www.selinsgrovelibrary.org/events', city: 'Selinsgrove', state: 'PA', zipCode: '17870', county: 'Selinsgrove County'},
  { name: 'Sewickley Public Library', url: 'https://www.sewickleylibrary.org', eventsUrl: 'https://www.sewickleylibrary.org/events', city: 'Sewickley', state: 'PA', zipCode: '15143', county: 'Sewickley County'},
  { name: 'Shamokin Coal Township Public Library', url: 'https://www.shamokinlibrary.org', eventsUrl: 'https://www.shamokinlibrary.org/events', city: 'Shamokin', state: 'PA', zipCode: '17872', county: 'Shamokin County'},
  { name: 'Community Library Of The Shenango Valley', url: 'https://www.sharonlibrary.org', eventsUrl: 'https://www.sharonlibrary.org/events', city: 'Sharon', state: 'PA', zipCode: '16146', county: 'Sharon County'},
  { name: 'Sharon Hill Public Library', url: 'https://www.sharonhilllibrary.org', eventsUrl: 'https://www.sharonhilllibrary.org/events', city: 'Sharon Hill', state: 'PA', zipCode: '19079', county: 'Sharon Hill County'},
  { name: 'Sheffield Township Library', url: 'https://www.sheffieldlibrary.org', eventsUrl: 'https://www.sheffieldlibrary.org/events', city: 'Sheffield', state: 'PA', zipCode: '16347', county: 'Sheffield County'},
  { name: 'Shenandoah Area Free Public Library', url: 'https://www.shenandoahlibrary.org', eventsUrl: 'https://www.shenandoahlibrary.org/events', city: 'Shenandoah', state: 'PA', zipCode: '17976', county: 'Shenandoah County'},
  { name: 'Mifflin Community Library', url: 'https://www.shillingtonlibrary.org', eventsUrl: 'https://www.shillingtonlibrary.org/events', city: 'Shillington', state: 'PA', zipCode: '19607', county: 'Shillington County'},
  { name: 'Oswayo Valley Memorial Library', url: 'https://www.shinglehouselibrary.org', eventsUrl: 'https://www.shinglehouselibrary.org/events', city: 'Shinglehouse', state: 'PA', zipCode: '16748', county: 'Shinglehouse County'},
  { name: 'Shippensburg Public Library', url: 'https://www.shippensburglibrary.org', eventsUrl: 'https://www.shippensburglibrary.org/events', city: 'Shippensburg', state: 'PA', zipCode: '17257', county: 'Shippensburg County'},
  { name: 'Paul Smith Library Of Southern York County', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'PA', zipCode: '17361', county: 'Shrewsbury County'},
  { name: 'Sinking Spring Public Library', url: 'https://www.sinkingspringlibrary.org', eventsUrl: 'https://www.sinkingspringlibrary.org/events', city: 'Sinking Spring', state: 'PA', zipCode: '19608', county: 'Sinking Spring County'},
  { name: 'Slatington Library Inc', url: 'https://www.slatingtonlibrary.org', eventsUrl: 'https://www.slatingtonlibrary.org/events', city: 'Slatington', state: 'PA', zipCode: '18080', county: 'Slatington County'},
  { name: 'Hamlin Memorial Library', url: 'https://www.smethportlibrary.org', eventsUrl: 'https://www.smethportlibrary.org/events', city: 'Smethport', state: 'PA', zipCode: '16749', county: 'Smethport County'},
  { name: 'Smithfield Library', url: 'https://www.smithfieldlibrary.org', eventsUrl: 'https://www.smithfieldlibrary.org/events', city: 'Smithfield', state: 'PA', zipCode: '15478', county: 'Smithfield County'},
  { name: 'Smithton Public Library', url: 'https://www.smithtonlibrary.org', eventsUrl: 'https://www.smithtonlibrary.org/events', city: 'Smithton', state: 'PA', zipCode: '15479', county: 'Smithton County'},
  { name: 'Mary S Biesecker Public Library', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'PA', zipCode: '15501', county: 'Somerset County'},
  { name: 'South Fork Public Library', url: 'https://www.southforklibrary.org', eventsUrl: 'https://www.southforklibrary.org/events', city: 'South Fork', state: 'PA', zipCode: '15956', county: 'South Fork County'},
  { name: 'South Park Township Library', url: 'https://www.southparklibrary.org', eventsUrl: 'https://www.southparklibrary.org/events', city: 'South Park', state: 'PA', zipCode: '15129', county: 'South Park County'},
  { name: 'Bucks County Free Library - Southampton Free Library', url: 'https://www.southamptonlibrary.org', eventsUrl: 'https://www.southamptonlibrary.org/events', city: 'Southampton', state: 'PA', zipCode: '18966', county: 'Southampton County'},
  { name: 'Spring City Free Public Library', url: 'https://www.springcitylibrary.org', eventsUrl: 'https://www.springcitylibrary.org/events', city: 'Spring City', state: 'PA', zipCode: '19475', county: 'Spring City County'},
  { name: 'Glatfelter Memorial Library', url: 'https://www.springgrovelibrary.org', eventsUrl: 'https://www.springgrovelibrary.org/events', city: 'Spring Grove', state: 'PA', zipCode: '17362', county: 'Spring Grove County'},
  { name: 'Springboro Public Library', url: 'https://www.springborolibrary.org', eventsUrl: 'https://www.springborolibrary.org/events', city: 'Springboro', state: 'PA', zipCode: '16435', county: 'Springboro County'},
  { name: 'Springdale Free Public Library', url: 'https://www.springdalelibrary.org', eventsUrl: 'https://www.springdalelibrary.org/events', city: 'Springdale', state: 'PA', zipCode: '15144', county: 'Springdale County'},
  { name: 'Springfield Township Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'PA', zipCode: '19064', county: 'Springfield County'},
  { name: 'Hazleton Valley Branch', url: 'https://www.stconynghamlibrary.org', eventsUrl: 'https://www.stconynghamlibrary.org/events', city: 'St Conyngham', state: 'PA', zipCode: '18219', county: 'St Conyngham County'},
  { name: 'Hazleton Freeland Branch', url: 'https://www.stfreelandlibrary.org', eventsUrl: 'https://www.stfreelandlibrary.org/events', city: 'St Freeland', state: 'PA', zipCode: '18224', county: 'St Freeland County'},
  { name: 'Hazelton Area Public Library', url: 'https://www.sthazeltonlibrary.org', eventsUrl: 'https://www.sthazeltonlibrary.org/events', city: 'St Hazelton', state: 'PA', zipCode: '18201', county: 'St Hazelton County'},
  { name: 'Saint Marys Public Library', url: 'https://www.stmaryslibrary.org', eventsUrl: 'https://www.stmaryslibrary.org/events', city: 'St Marys', state: 'PA', zipCode: '15857', county: 'St Marys County'},
  { name: 'Hazleton Nuremberg Branch', url: 'https://www.stnuremburglibrary.org', eventsUrl: 'https://www.stnuremburglibrary.org/events', city: 'St Nuremburg', state: 'PA', zipCode: '18241', county: 'St Nuremburg County'},
  { name: 'Osterhout Free Library - Plains Branch', url: 'https://www.stplainslibrary.org', eventsUrl: 'https://www.stplainslibrary.org/events', city: 'St Plains', state: 'PA', zipCode: '18705', county: 'St Plains County'},
  { name: 'Saint Thomas Library', url: 'https://www.stthomaslibrary.org', eventsUrl: 'https://www.stthomaslibrary.org/events', city: 'St Thomas', state: 'PA', zipCode: '17252', county: 'St Thomas County'},
  { name: 'Osterhout Free Library', url: 'https://www.stwilkesbarrelibrary.org', eventsUrl: 'https://www.stwilkesbarrelibrary.org/events', city: 'St Wilkes Barre', state: 'PA', zipCode: '18701', county: 'St Wilkes Barre County'},
  { name: 'Schlow Centre Region Library', url: 'https://www.statecollegelibrary.org', eventsUrl: 'https://www.statecollegelibrary.org/events', city: 'State College', state: 'PA', zipCode: '16801', county: 'State College County'},
  { name: 'Mason Dixon Public Library', url: 'https://www.stewartstownlibrary.org', eventsUrl: 'https://www.stewartstownlibrary.org/events', city: 'Stewartstown', state: 'PA', zipCode: '17363', county: 'Stewartstown County'},
  { name: 'Strasburg-Heisler Library', url: 'https://www.strasburglibrary.org', eventsUrl: 'https://www.strasburglibrary.org/events', city: 'Strasburg', state: 'PA', zipCode: '17579', county: 'Strasburg County'},
  { name: 'Eastern Monroe Public Library', url: 'https://www.stroudsburglibrary.org', eventsUrl: 'https://www.stroudsburglibrary.org/events', city: 'Stroudsburg', state: 'PA', zipCode: '18360', county: 'Stroudsburg County'},
  { name: 'Sugar Grove Free Library', url: 'https://www.sugargrovelibrary.org', eventsUrl: 'https://www.sugargrovelibrary.org/events', city: 'Sugar Grove', state: 'PA', zipCode: '16350', county: 'Sugar Grove County'},
  { name: 'Summerville Public Library', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'PA', zipCode: '15864', county: 'Summerville County'},
  { name: 'Degenstein Community Library', url: 'https://www.sunburylibrary.org', eventsUrl: 'https://www.sunburylibrary.org/events', city: 'Sunbury', state: 'PA', zipCode: '17801', county: 'Sunbury County'},
  { name: 'Susquehanna County Library - Susquehanna Branch Library', url: 'https://www.susquehannalibrary.org', eventsUrl: 'https://www.susquehannalibrary.org/events', city: 'Susquehanna', state: 'PA', zipCode: '18847', county: 'Susquehanna County'},
  { name: 'Swarthmore Public Library', url: 'https://www.swarthmorelibrary.org', eventsUrl: 'https://www.swarthmorelibrary.org/events', city: 'Swarthmore', state: 'PA', zipCode: '19081', county: 'Swarthmore County'},
  { name: 'Carnegie Free Library Of Swissvale', url: 'https://www.swissvalelibrary.org', eventsUrl: 'https://www.swissvalelibrary.org/events', city: 'Swissvale', state: 'PA', zipCode: '15218', county: 'Swissvale County'},
  { name: 'Sykesville Public Library', url: 'https://www.sykesvillelibrary.org', eventsUrl: 'https://www.sykesvillelibrary.org/events', city: 'Sykesville', state: 'PA', zipCode: '15865', county: 'Sykesville County'},
  { name: 'Tamaqua Public Library', url: 'https://www.tamaqualibrary.org', eventsUrl: 'https://www.tamaqualibrary.org/events', city: 'Tamaqua', state: 'PA', zipCode: '18252', county: 'Tamaqua County'},
  { name: 'Community Library Of Allegheny Valley - Tarentum Location', url: 'https://www.tarentumlibrary.org', eventsUrl: 'https://www.tarentumlibrary.org/events', city: 'Tarentum', state: 'PA', zipCode: '15084', county: 'Tarentum County'},
  { name: 'Taylor Community Library', url: 'https://www.taylorlibrary.org', eventsUrl: 'https://www.taylorlibrary.org/events', city: 'Taylor', state: 'PA', zipCode: '18517', county: 'Taylor County'},
  { name: 'Indian Valley Public Library', url: 'https://www.telfordlibrary.org', eventsUrl: 'https://www.telfordlibrary.org/events', city: 'Telford', state: 'PA', zipCode: '18969', county: 'Telford County'},
  { name: 'Sarah S Bovard Memorial Library', url: 'https://www.tionestalibrary.org', eventsUrl: 'https://www.tionestalibrary.org/events', city: 'Tionesta', state: 'PA', zipCode: '16353', county: 'Tionesta County'},
  { name: 'Benson Memorial Library, Inc.', url: 'https://www.titusvillelibrary.org', eventsUrl: 'https://www.titusvillelibrary.org/events', city: 'Titusville', state: 'PA', zipCode: '16354', county: 'Titusville County'},
  { name: 'Toa Baja Public Library (Jaime Fonalledas)', url: 'https://www.toabajalibrary.org', eventsUrl: 'https://www.toabajalibrary.org/events', city: 'Toa Baja', state: 'PA', zipCode: '00949', county: 'Toa Baja County'},
  { name: 'Pocono Mountain Public Library', url: 'https://www.tobyhannalibrary.org', eventsUrl: 'https://www.tobyhannalibrary.org/events', city: 'Tobyhanna', state: 'PA', zipCode: '18466', county: 'Tobyhanna County'},
  { name: 'Brandywine Community Library', url: 'https://www.toptonlibrary.org', eventsUrl: 'https://www.toptonlibrary.org/events', city: 'Topton', state: 'PA', zipCode: '19562', county: 'Topton County'},
  { name: 'Towanda Public Library', url: 'https://www.towandalibrary.org', eventsUrl: 'https://www.towandalibrary.org/events', city: 'Towanda', state: 'PA', zipCode: '18848', county: 'Towanda County'},
  { name: 'Tower-Porter Community Library', url: 'https://www.towercitylibrary.org', eventsUrl: 'https://www.towercitylibrary.org/events', city: 'Tower City', state: 'PA', zipCode: '17980', county: 'Tower City County'},
  { name: 'Trafford Community Public Library', url: 'https://www.traffordlibrary.org', eventsUrl: 'https://www.traffordlibrary.org/events', city: 'Trafford', state: 'PA', zipCode: '15085', county: 'Trafford County'},
  { name: 'Tremont Area Free Public Library', url: 'https://www.tremontlibrary.org', eventsUrl: 'https://www.tremontlibrary.org/events', city: 'Tremont', state: 'PA', zipCode: '17981', county: 'Tremont County'},
  { name: 'Cogan House Link', url: 'https://www.troutrunlibrary.org', eventsUrl: 'https://www.troutrunlibrary.org/events', city: 'Trout Run', state: 'PA', zipCode: '17771', county: 'Trout Run County'},
  { name: 'Allen F. Pierce Free Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'PA', zipCode: '16947', county: 'Troy County'},
  { name: 'Trujillo Alto Municipal Library (Emilio Diaz Valcarcel)', url: 'https://www.trujilloaltolibrary.org', eventsUrl: 'https://www.trujilloaltolibrary.org/events', city: 'Trujillo Alto', state: 'PA', zipCode: '97718', county: 'Trujillo Alto County'},
  { name: 'Tunkhannock Public Library', url: 'https://www.tunkhannocklibrary.org', eventsUrl: 'https://www.tunkhannocklibrary.org/events', city: 'Tunkhannock', state: 'PA', zipCode: '18657', county: 'Tunkhannock County'},
  { name: 'Braddock Carnegie Library', url: 'https://www.turtlecreeklibrary.org', eventsUrl: 'https://www.turtlecreeklibrary.org/events', city: 'Turtle Creek', state: 'PA', zipCode: '15145', county: 'Turtle Creek County'},
  { name: 'Tyrone-Snyder Township Public Library', url: 'https://www.tyronelibrary.org', eventsUrl: 'https://www.tyronelibrary.org/events', city: 'Tyrone', state: 'PA', zipCode: '16686', county: 'Tyrone County'},
  { name: 'Mather Memorial Library', url: 'https://www.ulsterlibrary.org', eventsUrl: 'https://www.ulsterlibrary.org/events', city: 'Ulster', state: 'PA', zipCode: '18850', county: 'Ulster County'},
  { name: 'Ulysses Library', url: 'https://www.ulysseslibrary.org', eventsUrl: 'https://www.ulysseslibrary.org/events', city: 'Ulysses', state: 'PA', zipCode: '16948', county: 'Ulysses County'},
  { name: 'Union City Public Library', url: 'https://www.unioncitylibrary.org', eventsUrl: 'https://www.unioncitylibrary.org/events', city: 'Union City', state: 'PA', zipCode: '16438', county: 'Union City County'},
  { name: 'Uniontown Public Library', url: 'https://www.uniontownlibrary.org', eventsUrl: 'https://www.uniontownlibrary.org/events', city: 'Uniontown', state: 'PA', zipCode: '15401', county: 'Uniontown County'},
  { name: 'Unityville Link', url: 'https://www.unityvillelibrary.org', eventsUrl: 'https://www.unityvillelibrary.org/events', city: 'Unityville', state: 'PA', zipCode: '17774', county: 'Unityville County'},
  { name: 'Upper Darby Township Sellers Memorial Free Public Library', url: 'https://www.upperdarbylibrary.org', eventsUrl: 'https://www.upperdarbylibrary.org/events', city: 'Upper Darby', state: 'PA', zipCode: '19082', county: 'Upper Darby County'},
  { name: 'Upper St Clair Township Library', url: 'https://www.upperstclairlibrary.org', eventsUrl: 'https://www.upperstclairlibrary.org/events', city: 'Upper St Clair', state: 'PA', zipCode: '15241', county: 'Upper St Clair County'},
  { name: 'Utuado Public Library', url: 'https://www.utuadolibrary.org', eventsUrl: 'https://www.utuadolibrary.org/events', city: 'Utuado', state: 'PA', zipCode: '64128', county: 'Utuado County'},
  { name: 'Vandergrift Public Library Association', url: 'https://www.vandergriftlibrary.org', eventsUrl: 'https://www.vandergriftlibrary.org/events', city: 'Vandergrift', state: 'PA', zipCode: '15690', county: 'Vandergrift County'},
  { name: 'Helen Kate Furness Fr Library', url: 'https://www.wallingfordlibrary.org', eventsUrl: 'https://www.wallingfordlibrary.org/events', city: 'Wallingford', state: 'PA', zipCode: '19086', county: 'Wallingford County'},
  { name: 'Bucks County Free Library - Warminster Township Free Library', url: 'https://www.warminsterlibrary.org', eventsUrl: 'https://www.warminsterlibrary.org/events', city: 'Warminster', state: 'PA', zipCode: '18974', county: 'Warminster County'},
  { name: 'Warren Library Association', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'PA', zipCode: '16365', county: 'Warren County'},
  { name: 'Citizens Library', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'PA', zipCode: '15301', county: 'Washington County'},
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'PA', zipCode: '16441', county: 'Waterford County'},
  { name: 'Memorial Library Of Radnor Township', url: 'https://www.waynelibrary.org', eventsUrl: 'https://www.waynelibrary.org/events', city: 'Wayne', state: 'PA', zipCode: '19087', county: 'Wayne County'},
  { name: 'Alexander Hamilton Memorial Free Library', url: 'https://www.waynesborolibrary.org', eventsUrl: 'https://www.waynesborolibrary.org/events', city: 'Waynesboro', state: 'PA', zipCode: '17268', county: 'Waynesboro County'},
  { name: 'Eva K Bowlby Public Library', url: 'https://www.waynesburglibrary.org', eventsUrl: 'https://www.waynesburglibrary.org/events', city: 'Waynesburg', state: 'PA', zipCode: '15370', county: 'Waynesburg County'},
  { name: 'Green Free Library', url: 'https://www.wellsborolibrary.org', eventsUrl: 'https://www.wellsborolibrary.org/events', city: 'Wellsboro', state: 'PA', zipCode: '16901', county: 'Wellsboro County'},
  { name: 'Wernersville Public Library', url: 'https://www.wernersvillelibrary.org', eventsUrl: 'https://www.wernersvillelibrary.org/events', city: 'Wernersville', state: 'PA', zipCode: '19565', county: 'Wernersville County'},
  { name: 'West Chester Public Library', url: 'https://www.westchesterlibrary.org', eventsUrl: 'https://www.westchesterlibrary.org/events', city: 'West Chester', state: 'PA', zipCode: '19380', county: 'West Chester County'},
  { name: 'Avon Grove Free Library', url: 'https://www.westgrovelibrary.org', eventsUrl: 'https://www.westgrovelibrary.org/events', city: 'West Grove', state: 'PA', zipCode: '19390', county: 'West Grove County'},
  { name: 'West Newton Public Library', url: 'https://www.westnewtonlibrary.org', eventsUrl: 'https://www.westnewtonlibrary.org/events', city: 'West Newton', state: 'PA', zipCode: '15089', county: 'West Newton County'},
  { name: 'West Pittston Library', url: 'https://www.westpittstonlibrary.org', eventsUrl: 'https://www.westpittstonlibrary.org/events', city: 'West Pittston', state: 'PA', zipCode: '18643', county: 'West Pittston County'},
  { name: 'Westfield Public Library', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'PA', zipCode: '16950', county: 'Westfield County'},
  { name: 'Northern Tier Regional Library - Bookmobile', url: 'https://www.wexfordlibrary.org', eventsUrl: 'https://www.wexfordlibrary.org/events', city: 'Wexford', state: 'PA', zipCode: '15090', county: 'Wexford County'},
  { name: 'Carnegie Library Of Mckeesport - White Oak', url: 'https://www.whiteoaklibrary.org', eventsUrl: 'https://www.whiteoaklibrary.org/events', city: 'White Oak', state: 'PA', zipCode: '15131', county: 'White Oak County'},
  { name: 'Whitehall Township Public Library', url: 'https://www.whitehalllibrary.org', eventsUrl: 'https://www.whitehalllibrary.org/events', city: 'Whitehall', state: 'PA', zipCode: '18052', county: 'Whitehall County'},
  { name: 'Wilcox Public Library', url: 'https://www.wilcoxlibrary.org', eventsUrl: 'https://www.wilcoxlibrary.org/events', city: 'Wilcox', state: 'PA', zipCode: '15870', county: 'Wilcox County'},
  { name: 'Osterhout Free Library', url: 'https://www.wilkesbarrelibrary.org', eventsUrl: 'https://www.wilkesbarrelibrary.org/events', city: 'Wilkes-Barre', state: 'PA', zipCode: '18701', county: 'Wilkes-Barre County'},
  { name: 'Wilkinsburg Public Library', url: 'https://www.wilkinsburglibrary.org', eventsUrl: 'https://www.wilkinsburglibrary.org/events', city: 'Wilkinsburg', state: 'PA', zipCode: '15221', county: 'Wilkinsburg County'},
  { name: 'Williamsburg Public Library', url: 'https://www.williamsburglibrary.org', eventsUrl: 'https://www.williamsburglibrary.org/events', city: 'Williamsburg', state: 'PA', zipCode: '16693', county: 'Williamsburg County'},
  { name: 'Barbours Link', url: 'https://www.williamsportlibrary.org', eventsUrl: 'https://www.williamsportlibrary.org/events', city: 'Williamsport', state: 'PA', zipCode: '17701', county: 'Williamsport County'},
  { name: 'Upper Moreland Free Public Library', url: 'https://www.willowgrovelibrary.org', eventsUrl: 'https://www.willowgrovelibrary.org/events', city: 'Willow Grove', state: 'PA', zipCode: '19090', county: 'Willow Grove County'},
  { name: 'Windber Public Library Association', url: 'https://www.windberlibrary.org', eventsUrl: 'https://www.windberlibrary.org/events', city: 'Windber', state: 'PA', zipCode: '15963', county: 'Windber County'},
  { name: 'Womelsdorf Community Library', url: 'https://www.womelsdorflibrary.org', eventsUrl: 'https://www.womelsdorflibrary.org/events', city: 'Womelsdorf', state: 'PA', zipCode: '19567', county: 'Womelsdorf County'},
  { name: 'W W F Community Library', url: 'https://www.worthingtonlibrary.org', eventsUrl: 'https://www.worthingtonlibrary.org/events', city: 'Worthington', state: 'PA', zipCode: '16262', county: 'Worthington County'},
  { name: 'Bucks County Free Library - Village Library Of Wrightstown', url: 'https://www.wrightstownlibrary.org', eventsUrl: 'https://www.wrightstownlibrary.org/events', city: 'Wrightstown', state: 'PA', zipCode: '18940', county: 'Wrightstown County'},
  { name: 'Wyalusing Public Library', url: 'https://www.wyalusinglibrary.org', eventsUrl: 'https://www.wyalusinglibrary.org/events', city: 'Wyalusing', state: 'PA', zipCode: '18853', county: 'Wyalusing County'},
  { name: 'Free Library Of Springfield Township', url: 'https://www.wyndmoorlibrary.org', eventsUrl: 'https://www.wyndmoorlibrary.org/events', city: 'Wyndmoor', state: 'PA', zipCode: '19038', county: 'Wyndmoor County'},
  { name: 'Penn Wynne Library', url: 'https://www.wynnewoodlibrary.org', eventsUrl: 'https://www.wynnewoodlibrary.org/events', city: 'Wynnewood', state: 'PA', zipCode: '19096', county: 'Wynnewood County'},
  { name: 'Wyoming Free Library', url: 'https://www.wyominglibrary.org', eventsUrl: 'https://www.wyominglibrary.org/events', city: 'Wyoming', state: 'PA', zipCode: '18644', county: 'Wyoming County'},
  { name: 'Spring Township Library', url: 'https://www.wyomissinglibrary.org', eventsUrl: 'https://www.wyomissinglibrary.org/events', city: 'Wyomissing', state: 'PA', zipCode: '19610', county: 'Wyomissing County'},
  { name: 'Yabucoa Public Library (Reinaldo Alvarez Costa)', url: 'https://www.yabucoalibrary.org', eventsUrl: 'https://www.yabucoalibrary.org/events', city: 'Yabucoa', state: 'PA', zipCode: '00767', county: 'Yabucoa County'},
  { name: 'Bucks County Free Library - Yardley-Makefield Branch', url: 'https://www.yardleylibrary.org', eventsUrl: 'https://www.yardleylibrary.org/events', city: 'Yardley', state: 'PA', zipCode: '19067', county: 'Yardley County'},
  { name: 'Yauco Public Library (Luis E. Catala)', url: 'https://www.yaucolibrary.org', eventsUrl: 'https://www.yaucolibrary.org/events', city: 'Yauco', state: 'PA', zipCode: '00698', county: 'Yauco County'},
  { name: 'Yeadon Public Library', url: 'https://www.yeadonlibrary.org', eventsUrl: 'https://www.yeadonlibrary.org/events', city: 'Yeadon', state: 'PA', zipCode: '19050', county: 'Yeadon County'},
  { name: 'Jefferson Resource Center And Computer Lab', url: 'https://www.yorklibrary.org', eventsUrl: 'https://www.yorklibrary.org/events', city: 'York', state: 'PA', zipCode: '17404', county: 'York County'},
  { name: 'Youngsville Public Library', url: 'https://www.youngsvillelibrary.org', eventsUrl: 'https://www.youngsvillelibrary.org/events', city: 'Youngsville', state: 'PA', zipCode: '16371', county: 'Youngsville County'},
  { name: 'Youngwood Area Public Library', url: 'https://www.youngwoodlibrary.org', eventsUrl: 'https://www.youngwoodlibrary.org/events', city: 'Youngwood', state: 'PA', zipCode: '15697', county: 'Youngwood County'},
  { name: 'Zelienople Public Library', url: 'https://www.zelienoplelibrary.org', eventsUrl: 'https://www.zelienoplelibrary.org/events', city: 'Zelienople', state: 'PA', zipCode: '16063', county: 'Zelienople County'}

];

const SCRAPER_NAME = 'generic-PA';

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

      // Wait for any event-like content
      await new Promise(resolve => setTimeout(resolve, 3000));

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

                // Only add if it looks like an event (has title and some other field)
                if (event.title && (event.date || event.description)) {
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
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressPACloudFunction };
