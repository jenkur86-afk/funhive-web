const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * South Carolina Public Libraries Scraper - Coverage: All South Carolina public libraries
 */
const LIBRARIES = [
  { name: 'Abbeville County Library System', url: 'https://www.abbevillelibrary.org', eventsUrl: 'https://www.abbevillelibrary.org/events', city: 'Abbeville', state: 'SC', zipCode: '29620', county: 'Abbeville County'},
  { name: 'Abbe Regional Library System', url: 'https://www.aikenlibrary.org', eventsUrl: 'https://www.aikenlibrary.org/events', city: 'Aiken', state: 'SC', zipCode: '29801', county: 'Aiken County'},
  { name: 'Allendale County Library', url: 'https://www.allendalelibrary.org', eventsUrl: 'https://www.allendalelibrary.org/events', city: 'Allendale', state: 'SC', zipCode: '29810', county: 'Allendale County'},
  { name: 'Anderson County Library', url: 'https://www.andersonlibrary.org', eventsUrl: 'https://www.andersonlibrary.org/events', city: 'Anderson', state: 'SC', zipCode: '29621', county: 'Anderson County'},
  { name: 'Georgetown County Library - Andrews Branch Library', url: 'https://www.andrewslibrary.org', eventsUrl: 'https://www.andrewslibrary.org/events', city: 'Andrews', state: 'SC', zipCode: '29510', county: 'Andrews County'},
  { name: 'Horry County Memorial Library - Aynor Library', url: 'https://www.aynorlibrary.org', eventsUrl: 'https://www.aynorlibrary.org/events', city: 'Aynor', state: 'SC', zipCode: '29511', county: 'Aynor County'},
  { name: 'Bamberg County Public Library', url: 'https://www.bamberglibrary.org', eventsUrl: 'https://www.bamberglibrary.org/events', city: 'Bamberg', state: 'SC', zipCode: '29003', county: 'Bamberg County'},
  { name: 'Barnwell County Public Library', url: 'https://www.barnwelllibrary.org', eventsUrl: 'https://www.barnwelllibrary.org/events', city: 'Barnwell', state: 'SC', zipCode: '29812', county: 'Barnwell County'},
  { name: 'Lexington County Library - Batesburg-Leesville', url: 'https://www.batesburglibrary.org', eventsUrl: 'https://www.batesburglibrary.org/events', city: 'Batesburg', state: 'SC', zipCode: '29006', county: 'Batesburg County'},
  { name: 'Beaufort County Library', url: 'https://www.beaufortlibrary.org', eventsUrl: 'https://www.beaufortlibrary.org/events', city: 'Beaufort', state: 'SC', zipCode: '29902', county: 'Beaufort County'},
  { name: 'Anderson County Library - Belton Branch Library', url: 'https://www.beltonlibrary.org', eventsUrl: 'https://www.beltonlibrary.org/events', city: 'Belton', state: 'SC', zipCode: '29627', county: 'Belton County'},
  { name: 'Marian Wright Edelman Public Library', url: 'https://www.bennettsvillelibrary.org', eventsUrl: 'https://www.bennettsvillelibrary.org/events', city: 'Bennettsville', state: 'SC', zipCode: '29512', county: 'Bennettsville County'},
  { name: 'Bethune Public Library', url: 'https://www.bethunelibrary.org', eventsUrl: 'https://www.bethunelibrary.org/events', city: 'Bethune', state: 'SC', zipCode: '29009', county: 'Bethune County'},
  { name: 'Lee County Public Library System', url: 'https://www.bishopvillelibrary.org', eventsUrl: 'https://www.bishopvillelibrary.org/events', city: 'Bishopville', state: 'SC', zipCode: '29010', county: 'Bishopville County'},
  { name: 'Blacksburg Library', url: 'https://www.blacksburglibrary.org', eventsUrl: 'https://www.blacksburglibrary.org/events', city: 'Blacksburg', state: 'SC', zipCode: '29702', county: 'Blacksburg County'},
  { name: 'Barnwell County Public Library - Blackville Branch Library', url: 'https://www.blackvillelibrary.org', eventsUrl: 'https://www.blackvillelibrary.org/events', city: 'Blackville', state: 'SC', zipCode: '29817', county: 'Blackville County'},
  { name: 'Beaufort County Library - Bluffton Branch Library', url: 'https://www.blufftonlibrary.org', eventsUrl: 'https://www.blufftonlibrary.org/events', city: 'Bluffton', state: 'SC', zipCode: '29910', county: 'Bluffton County'},
  { name: 'Richland County Public Library - Blythewood Branch Library', url: 'https://www.blythewoodlibrary.org', eventsUrl: 'https://www.blythewoodlibrary.org/events', city: 'Blythewood', state: 'SC', zipCode: '29016', county: 'Blythewood County'},
  { name: 'Spartanburg County Public Library - Boiling Springs Branch Library', url: 'https://www.boilingspringslibrary.org', eventsUrl: 'https://www.boilingspringslibrary.org/events', city: 'Boiling Springs', state: 'SC', zipCode: '29316', county: 'Boiling Springs County'},
  { name: 'Abbeville County Library - Calhoun Falls Branch Library', url: 'https://www.calhounfallslibrary.org', eventsUrl: 'https://www.calhounfallslibrary.org/events', city: 'Calhoun Falls', state: 'SC', zipCode: '29628', county: 'Calhoun Falls County'},
  { name: 'Kershaw County Library - Camden Branch Library', url: 'https://www.camdenlibrary.org', eventsUrl: 'https://www.camdenlibrary.org/events', city: 'Camden', state: 'SC', zipCode: '29020', county: 'Camden County'},
  { name: 'Pickens County Library - Central-Clemson Branch Library', url: 'https://www.centrallibrary.org', eventsUrl: 'https://www.centrallibrary.org/events', city: 'Central', state: 'SC', zipCode: '29630', county: 'Central County'},
  { name: 'Lexington County Library - Chapin', url: 'https://www.chapinlibrary.org', eventsUrl: 'https://www.chapinlibrary.org/events', city: 'Chapin', state: 'SC', zipCode: '29036', county: 'Chapin County'},
  { name: 'Berkeley County Library - Daniel Island', url: 'https://www.charlestonlibrary.org', eventsUrl: 'https://www.charlestonlibrary.org/events', city: 'Charleston', state: 'SC', zipCode: '29492', county: 'Charleston County'},
  { name: 'Matheson Library', url: 'https://www.cherawlibrary.org', eventsUrl: 'https://www.cherawlibrary.org/events', city: 'Cheraw', state: 'SC', zipCode: '29520', county: 'Cheraw County'},
  { name: 'Spartanburg County Public Library - Chesnee Branch Library', url: 'https://www.chesneelibrary.org', eventsUrl: 'https://www.chesneelibrary.org/events', city: 'Chesnee', state: 'SC', zipCode: '29323', county: 'Chesnee County'},
  { name: 'Chester County Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'SC', zipCode: '29706', county: 'Chester County'},
  { name: 'Chesterfield County Library System', url: 'https://www.chesterfieldlibrary.org', eventsUrl: 'https://www.chesterfieldlibrary.org/events', city: 'Chesterfield', state: 'SC', zipCode: '29709', county: 'Chesterfield County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'SC', zipCode: '29325', county: 'Clinton County'},
  { name: 'Clover Public Library', url: 'https://www.cloverlibrary.org', eventsUrl: 'https://www.cloverlibrary.org/events', city: 'Clover', state: 'SC', zipCode: '29710', county: 'Clover County'},
  { name: 'Lexington County Library - Irmo', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'SC', zipCode: '29212', county: 'Columbia County'},
  { name: 'Horry County Memorial Library - Administration', url: 'https://www.conwaylibrary.org', eventsUrl: 'https://www.conwaylibrary.org/events', city: 'Conway', state: 'SC', zipCode: '29526', county: 'Conway County'},
  { name: 'Spartanburg County Public Library - Cowpens Branch Library', url: 'https://www.cowpenslibrary.org', eventsUrl: 'https://www.cowpenslibrary.org/events', city: 'Cowpens', state: 'SC', zipCode: '29330', county: 'Cowpens County'},
  { name: 'Darlington County Library System', url: 'https://www.darlingtonlibrary.org', eventsUrl: 'https://www.darlingtonlibrary.org/events', city: 'Darlington', state: 'SC', zipCode: '29532', county: 'Darlington County'},
  { name: 'Bamberg County Public Library - Denmark Branch Library', url: 'https://www.denmarklibrary.org', eventsUrl: 'https://www.denmarklibrary.org/events', city: 'Denmark', state: 'SC', zipCode: '29042', county: 'Denmark County'},
  { name: 'Dillon County Library System', url: 'https://www.dillonlibrary.org', eventsUrl: 'https://www.dillonlibrary.org/events', city: 'Dillon', state: 'SC', zipCode: '29536', county: 'Dillon County'},
  { name: 'Abbeville County Library - W.M. Agnew Branch Library', url: 'https://www.donaldslibrary.org', eventsUrl: 'https://www.donaldslibrary.org/events', city: 'Donalds', state: 'SC', zipCode: '29638', county: 'Donalds County'},
  { name: 'Pickens County Library System', url: 'https://www.easleylibrary.org', eventsUrl: 'https://www.easleylibrary.org/events', city: 'Easley', state: 'SC', zipCode: '29641', county: 'Easley County'},
  { name: 'Richland County Public Library - Eastover Branch Library', url: 'https://www.eastoverlibrary.org', eventsUrl: 'https://www.eastoverlibrary.org/events', city: 'Eastover', state: 'SC', zipCode: '29044', county: 'Eastover County'},
  { name: 'Edgefield County Public Library', url: 'https://www.edgefieldlibrary.org', eventsUrl: 'https://www.edgefieldlibrary.org/events', city: 'Edgefield', state: 'SC', zipCode: '29824', county: 'Edgefield County'},
  { name: 'Charleston County Main Library - Edisto Branch Library', url: 'https://www.edistolibrary.org', eventsUrl: 'https://www.edistolibrary.org/events', city: 'Edisto', state: 'SC', zipCode: '29438', county: 'Edisto County'},
  { name: 'Edisto Beach Library', url: 'https://www.edistoislandlibrary.org', eventsUrl: 'https://www.edistoislandlibrary.org/events', city: 'Edisto Island', state: 'SC', zipCode: '29438', county: 'Edisto Island County'},
  { name: 'Kershaw County Library - Elgin Branch Library', url: 'https://www.elginlibrary.org', eventsUrl: 'https://www.elginlibrary.org/events', city: 'Elgin', state: 'SC', zipCode: '29045', county: 'Elgin County'},
  { name: 'Orangeburg County Library - Mentor Branch Library', url: 'https://www.elloreelibrary.org', eventsUrl: 'https://www.elloreelibrary.org/events', city: 'Elloree', state: 'SC', zipCode: '29047', county: 'Elloree County'},
  { name: 'Hampton County Library - Estill Branch Library', url: 'https://www.estilllibrary.org', eventsUrl: 'https://www.estilllibrary.org/events', city: 'Estill', state: 'SC', zipCode: '29918', county: 'Estill County'},
  { name: 'Florence County Library System', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'SC', zipCode: '29506', county: 'Florence County'},
  { name: 'Charleston County Main Library - Folly Beach Library', url: 'https://www.follybeachlibrary.org', eventsUrl: 'https://www.follybeachlibrary.org/events', city: 'Folly Beach', state: 'SC', zipCode: '29439', county: 'Folly Beach County'},
  { name: 'Fort Mill Public Library', url: 'https://www.fortmilllibrary.org', eventsUrl: 'https://www.fortmilllibrary.org/events', city: 'Fort Mill', state: 'SC', zipCode: '29708', county: 'Fort Mill County'},
  { name: 'Greenville County Library - Fountain Inn (Kerry Ann Younts Culp) Branch', url: 'https://www.fountaininnlibrary.org', eventsUrl: 'https://www.fountaininnlibrary.org/events', city: 'Fountain Inn', state: 'SC', zipCode: '29644', county: 'Fountain Inn County'},
  { name: 'Cherokee County Library', url: 'https://www.gaffneylibrary.org', eventsUrl: 'https://www.gaffneylibrary.org/events', city: 'Gaffney', state: 'SC', zipCode: '29340', county: 'Gaffney County'},
  { name: 'Lexington County Library - Gaston', url: 'https://www.gastonlibrary.org', eventsUrl: 'https://www.gastonlibrary.org/events', city: 'Gaston', state: 'SC', zipCode: '29053', county: 'Gaston County'},
  { name: 'Georgetown County Library', url: 'https://www.georgetownlibrary.org', eventsUrl: 'https://www.georgetownlibrary.org/events', city: 'Georgetown', state: 'SC', zipCode: '29440', county: 'Georgetown County'},
  { name: 'Lexington County Library - Gilbert-Summit', url: 'https://www.gilbertlibrary.org', eventsUrl: 'https://www.gilbertlibrary.org/events', city: 'Gilbert', state: 'SC', zipCode: '29054', county: 'Gilbert County'},
  { name: 'Berkeley County Library - Goose Creek Library', url: 'https://www.goosecreeklibrary.org', eventsUrl: 'https://www.goosecreeklibrary.org/events', city: 'Goose Creek', state: 'SC', zipCode: '29445', county: 'Goose Creek County'},
  { name: 'Great Falls Library', url: 'https://www.greatfallslibrary.org', eventsUrl: 'https://www.greatfallslibrary.org/events', city: 'Great Falls', state: 'SC', zipCode: '29055', county: 'Great Falls County'},
  { name: 'Williamsburg County Library - Dr C. E. Murray Branch', url: 'https://www.greeleyvillelibrary.org', eventsUrl: 'https://www.greeleyvillelibrary.org/events', city: 'Greeleyville', state: 'SC', zipCode: '29056', county: 'Greeleyville County'},
  { name: 'Horry County Memorial Library - Green Sea Floyds Library', url: 'https://www.greensealibrary.org', eventsUrl: 'https://www.greensealibrary.org/events', city: 'Green Sea', state: 'SC', zipCode: '29545', county: 'Green Sea County'},
  { name: 'Greenville County Library - Anderson Road (West) Branch', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'SC', zipCode: '29611', county: 'Greenville County'},
  { name: 'Greenwood County Library System', url: 'https://www.greenwoodlibrary.org', eventsUrl: 'https://www.greenwoodlibrary.org/events', city: 'Greenwood', state: 'SC', zipCode: '29646', county: 'Greenwood County'},
  { name: 'Greenville County Library - Greer (Jean M. Smith) Branch', url: 'https://www.greerlibrary.org', eventsUrl: 'https://www.greerlibrary.org/events', city: 'Greer', state: 'SC', zipCode: '29650', county: 'Greer County'},
  { name: 'Hampton County Library', url: 'https://www.hamptonlibrary.org', eventsUrl: 'https://www.hamptonlibrary.org/events', city: 'Hampton', state: 'SC', zipCode: '29924', county: 'Hampton County'},
  { name: 'Berkeley County Library - Hanahan Library', url: 'https://www.hanahanlibrary.org', eventsUrl: 'https://www.hanahanlibrary.org/events', city: 'Hanahan', state: 'SC', zipCode: '29406', county: 'Hanahan County'},
  { name: 'Hardeeville Community Library', url: 'https://www.hardeevillelibrary.org', eventsUrl: 'https://www.hardeevillelibrary.org/events', city: 'Hardeeville', state: 'SC', zipCode: '29927', county: 'Hardeeville County'},
  { name: 'Hartsville Memorial Library', url: 'https://www.hartsvillelibrary.org', eventsUrl: 'https://www.hartsvillelibrary.org/events', city: 'Hartsville', state: 'SC', zipCode: '29550', county: 'Hartsville County'},
  { name: 'Georgetown County Library - Carvers Bay', url: 'https://www.hemingwaylibrary.org', eventsUrl: 'https://www.hemingwaylibrary.org/events', city: 'Hemingway', state: 'SC', zipCode: '29554', county: 'Hemingway County'},
  { name: 'Beaufort County Library - Hilton Head Island', url: 'https://www.hiltonheadislandlibrary.org', eventsUrl: 'https://www.hiltonheadislandlibrary.org/events', city: 'Hilton Head Island', state: 'SC', zipCode: '29926', county: 'Hilton Head Island County'},
  { name: 'Orangeburg County Library - Holly Hill', url: 'https://www.hollyhilllibrary.org', eventsUrl: 'https://www.hollyhilllibrary.org/events', city: 'Holly Hill', state: 'SC', zipCode: '29059', county: 'Holly Hill County'},
  { name: 'Anderson County Library - Jennie Erwin', url: 'https://www.honeapathlibrary.org', eventsUrl: 'https://www.honeapathlibrary.org/events', city: 'Honea Path', state: 'SC', zipCode: '29654', county: 'Honea Path County'},
  { name: 'Spartanburg County Public Library - Inman', url: 'https://www.inmanlibrary.org', eventsUrl: 'https://www.inmanlibrary.org/events', city: 'Inman', state: 'SC', zipCode: '29349', county: 'Inman County'},
  { name: 'The Link In Ballentine', url: 'https://www.irmolibrary.org', eventsUrl: 'https://www.irmolibrary.org/events', city: 'Irmo', state: 'SC', zipCode: '29063', county: 'Irmo County'},
  { name: 'Anderson County Library - Iva Branch Library', url: 'https://www.ivalibrary.org', eventsUrl: 'https://www.ivalibrary.org/events', city: 'Iva', state: 'SC', zipCode: '29655', county: 'Iva County'},
  { name: 'Aiken County Library - Jackson Branch Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'SC', zipCode: '29831', county: 'Jackson County'},
  { name: 'Fanny D. Lowry Memorial Library', url: 'https://www.jeffersonlibrary.org', eventsUrl: 'https://www.jeffersonlibrary.org/events', city: 'Jefferson', state: 'SC', zipCode: '29718', county: 'Jefferson County'},
  { name: 'Charleston County Main Library - Johns Island Regional Library', url: 'https://www.johnsislandlibrary.org', eventsUrl: 'https://www.johnsislandlibrary.org/events', city: 'Johns Island', state: 'SC', zipCode: '29455', county: 'Johns Island County'},
  { name: 'Johnsonville Public Library', url: 'https://www.johnsonvillelibrary.org', eventsUrl: 'https://www.johnsonvillelibrary.org/events', city: 'Johnsonville', state: 'SC', zipCode: '29555', county: 'Johnsonville County'},
  { name: 'Edgefield County Public Library - Johnston Branch (Mobley Library)', url: 'https://www.johnstonlibrary.org', eventsUrl: 'https://www.johnstonlibrary.org/events', city: 'Johnston', state: 'SC', zipCode: '29832', county: 'Johnston County'},
  { name: 'Lancaster County Library - Kershaw Branch Library', url: 'https://www.kershawlibrary.org', eventsUrl: 'https://www.kershawlibrary.org/events', city: 'Kershaw', state: 'SC', zipCode: '29067', county: 'Kershaw County'},
  { name: 'Williamsburg County Library - Kingstree', url: 'https://www.kingstreelibrary.org', eventsUrl: 'https://www.kingstreelibrary.org/events', city: 'Kingstree', state: 'SC', zipCode: '29556', county: 'Kingstree County'},
  { name: 'Lake City Public Library', url: 'https://www.lakecitylibrary.org', eventsUrl: 'https://www.lakecitylibrary.org/events', city: 'Lake City', state: 'SC', zipCode: '29560', county: 'Lake City County'},
  { name: 'Lake View Library', url: 'https://www.lakeviewlibrary.org', eventsUrl: 'https://www.lakeviewlibrary.org/events', city: 'Lake View', state: 'SC', zipCode: '29563', county: 'Lake View County'},
  { name: 'Lake Wylie Public Library', url: 'https://www.lakewylielibrary.org', eventsUrl: 'https://www.lakewylielibrary.org/events', city: 'Lake Wylie', state: 'SC', zipCode: '29710', county: 'Lake Wylie County'},
  { name: 'Lamar District Library', url: 'https://www.lamarlibrary.org', eventsUrl: 'https://www.lamarlibrary.org/events', city: 'Lamar', state: 'SC', zipCode: '29069', county: 'Lamar County'},
  { name: 'Lancaster County Library System', url: 'https://www.lancasterlibrary.org', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'SC', zipCode: '29720', county: 'Lancaster County'},
  { name: 'Spartanburg County Public Library - Landrum Branch Library', url: 'https://www.landrumlibrary.org', eventsUrl: 'https://www.landrumlibrary.org/events', city: 'Landrum', state: 'SC', zipCode: '29356', county: 'Landrum County'},
  { name: 'Aiken County Library - Midland Valley Branch Library', url: 'https://www.langleylibrary.org', eventsUrl: 'https://www.langleylibrary.org/events', city: 'Langley', state: 'SC', zipCode: '29834', county: 'Langley County'},
  { name: 'Latta Library', url: 'https://www.lattalibrary.org', eventsUrl: 'https://www.lattalibrary.org/events', city: 'Latta', state: 'SC', zipCode: '29565', county: 'Latta County'},
  { name: 'Laurens County Library System', url: 'https://www.laurenslibrary.org', eventsUrl: 'https://www.laurenslibrary.org/events', city: 'Laurens', state: 'SC', zipCode: '29360', county: 'Laurens County'},
  { name: 'Lexington County Public Library System - Main', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'SC', zipCode: '29072', county: 'Lexington County'},
  { name: 'Pickens County Library - Sarlin Branch Library', url: 'https://www.libertylibrary.org', eventsUrl: 'https://www.libertylibrary.org/events', city: 'Liberty', state: 'SC', zipCode: '29657', county: 'Liberty County'},
  { name: 'Horry County Memorial Library - Stephens Crossroad Branch Library', url: 'https://www.littleriverlibrary.org', eventsUrl: 'https://www.littleriverlibrary.org/events', city: 'Little River', state: 'SC', zipCode: '29566', county: 'Little River County'},
  { name: 'Beaufort County Library - Lobeco Public Library', url: 'https://www.lobecolibrary.org', eventsUrl: 'https://www.lobecolibrary.org/events', city: 'Lobeco', state: 'SC', zipCode: '29931', county: 'Lobeco County'},
  { name: 'Horry County Memorial Library - Loris Library', url: 'https://www.lorislibrary.org', eventsUrl: 'https://www.lorislibrary.org/events', city: 'Loris', state: 'SC', zipCode: '29569', county: 'Loris County'},
  { name: 'Spartanburg County Public Library - Middle Tyger Branch Library', url: 'https://www.lymanlibrary.org', eventsUrl: 'https://www.lymanlibrary.org/events', city: 'Lyman', state: 'SC', zipCode: '29365', county: 'Lyman County'},
  { name: 'Clarendon County Library System', url: 'https://www.manninglibrary.org', eventsUrl: 'https://www.manninglibrary.org/events', city: 'Manning', state: 'SC', zipCode: '29102', county: 'Manning County'},
  { name: 'Marion County Library System', url: 'https://www.marionlibrary.org', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'SC', zipCode: '29571', county: 'Marion County'},
  { name: 'Mcbee Depot Library', url: 'https://www.mcbeelibrary.org', eventsUrl: 'https://www.mcbeelibrary.org/events', city: 'Mcbee', state: 'SC', zipCode: '29101', county: 'Mcbee County'},
  { name: 'Charleston County Main Library - Mcclellanville Branch Library', url: 'https://www.mcclellanvillelibrary.org', eventsUrl: 'https://www.mcclellanvillelibrary.org/events', city: 'Mcclellanville', state: 'SC', zipCode: '29458', county: 'Mcclellanville County'},
  { name: 'Mccormick County Library System', url: 'https://www.mccormicklibrary.org', eventsUrl: 'https://www.mccormicklibrary.org/events', city: 'Mccormick', state: 'SC', zipCode: '29835', county: 'Mccormick County'},
  { name: 'Berkeley County Library', url: 'https://www.monckscornerlibrary.org', eventsUrl: 'https://www.monckscornerlibrary.org/events', city: 'Moncks Corner', state: 'SC', zipCode: '29461', county: 'Moncks Corner County'},
  { name: 'Mullins Public Library', url: 'https://www.mullinslibrary.org', eventsUrl: 'https://www.mullinslibrary.org/events', city: 'Mullins', state: 'SC', zipCode: '29574', county: 'Mullins County'},
  { name: 'Chapin Memorial Library', url: 'https://www.myrtlebeachlibrary.org', eventsUrl: 'https://www.myrtlebeachlibrary.org/events', city: 'Myrtle Beach', state: 'SC', zipCode: '29577', county: 'Myrtle Beach County'},
  { name: 'Aiken County Library - New Ellenton Branch Library', url: 'https://www.newellentonlibrary.org', eventsUrl: 'https://www.newellentonlibrary.org/events', city: 'New Ellenton', state: 'SC', zipCode: '29809', county: 'New Ellenton County'},
  { name: 'Hal Kohn Memorial Library', url: 'https://www.newberrylibrary.org', eventsUrl: 'https://www.newberrylibrary.org/events', city: 'Newberry', state: 'SC', zipCode: '29108', county: 'Newberry County'},
  { name: 'Nichols Library', url: 'https://www.nicholslibrary.org', eventsUrl: 'https://www.nicholslibrary.org/events', city: 'Nichols', state: 'SC', zipCode: '29581', county: 'Nichols County'},
  { name: 'Greenwood County Library - Ninety Six Branch Library', url: 'https://www.ninetysixlibrary.org', eventsUrl: 'https://www.ninetysixlibrary.org/events', city: 'Ninety Six', state: 'SC', zipCode: '29666', county: 'Ninety Six County'},
  { name: 'Orangeburg County Library - North Branch Library', url: 'https://www.northlibrary.org', eventsUrl: 'https://www.northlibrary.org/events', city: 'North', state: 'SC', zipCode: '29112', county: 'North County'},
  { name: 'Nancy Carson Library', url: 'https://www.northaugustalibrary.org', eventsUrl: 'https://www.northaugustalibrary.org/events', city: 'North Augusta', state: 'SC', zipCode: '29841', county: 'North Augusta County'},
  { name: 'Cooper River Memorial Library', url: 'https://www.northcharlestonlibrary.org', eventsUrl: 'https://www.northcharlestonlibrary.org/events', city: 'North Charleston', state: 'SC', zipCode: '29405', county: 'North Charleston County'},
  { name: 'Horry County Memorial Library - North Myrtle Beach Library', url: 'https://www.northmyrtlebeachlibrary.org', eventsUrl: 'https://www.northmyrtlebeachlibrary.org/events', city: 'North Myrtle Beach', state: 'SC', zipCode: '29582', county: 'North Myrtle Beach County'},
  { name: 'John M. Thomason Public Library (Olanta)', url: 'https://www.olantalibrary.org', eventsUrl: 'https://www.olantalibrary.org/events', city: 'Olanta', state: 'SC', zipCode: '29114', county: 'Olanta County'},
  { name: 'Orangeburg County Library Commission', url: 'https://www.orangeburglibrary.org', eventsUrl: 'https://www.orangeburglibrary.org/events', city: 'Orangeburg', state: 'SC', zipCode: '29115', county: 'Orangeburg County'},
  { name: 'Spartanburg County Public Library - Tri-Pacolet Branch Library', url: 'https://www.pacoletlibrary.org', eventsUrl: 'https://www.pacoletlibrary.org/events', city: 'Pacolet', state: 'SC', zipCode: '29372', county: 'Pacolet County'},
  { name: 'Pageland Community Library', url: 'https://www.pagelandlibrary.org', eventsUrl: 'https://www.pagelandlibrary.org/events', city: 'Pageland', state: 'SC', zipCode: '29728', county: 'Pageland County'},
  { name: 'Pamplico Public Library', url: 'https://www.pamplicolibrary.org', eventsUrl: 'https://www.pamplicolibrary.org/events', city: 'Pamplico', state: 'SC', zipCode: '29583', county: 'Pamplico County'},
  { name: 'Georgetown County Library - Waccamaw Branch Library', url: 'https://www.pawleysislandlibrary.org', eventsUrl: 'https://www.pawleysislandlibrary.org/events', city: 'Pawleys Island', state: 'SC', zipCode: '29585', county: 'Pawleys Island County'},
  { name: 'Lexington County Library - Pelion', url: 'https://www.pelionlibrary.org', eventsUrl: 'https://www.pelionlibrary.org/events', city: 'Pelion', state: 'SC', zipCode: '29123', county: 'Pelion County'},
  { name: 'Anderson County Library - Pendleton Branch Library', url: 'https://www.pendletonlibrary.org', eventsUrl: 'https://www.pendletonlibrary.org/events', city: 'Pendleton', state: 'SC', zipCode: '29670', county: 'Pendleton County'},
  { name: 'Pickens County Library - Village Branch Library', url: 'https://www.pickenslibrary.org', eventsUrl: 'https://www.pickenslibrary.org/events', city: 'Pickens', state: 'SC', zipCode: '29671', county: 'Pickens County'},
  { name: 'Anderson County Library - Piedmont Branch Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'SC', zipCode: '29673', county: 'Piedmont County'},
  { name: 'Anderson County Library - Powdersville Branch Library', url: 'https://www.powdersvillelibrary.org', eventsUrl: 'https://www.powdersvillelibrary.org/events', city: 'Powdersville', state: 'SC', zipCode: '29642', county: 'Powdersville County'},
  { name: 'Lewisville Community Library', url: 'https://www.richburglibrary.org', eventsUrl: 'https://www.richburglibrary.org/events', city: 'Richburg', state: 'SC', zipCode: '29729', county: 'Richburg County'},
  { name: 'Ridge Spring Library', url: 'https://www.ridgespringlibrary.org', eventsUrl: 'https://www.ridgespringlibrary.org/events', city: 'Ridge Spring', state: 'SC', zipCode: '29129', county: 'Ridge Spring County'},
  { name: 'Jasper County Library', url: 'https://www.ridgelandlibrary.org', eventsUrl: 'https://www.ridgelandlibrary.org/events', city: 'Ridgeland', state: 'SC', zipCode: '29936', county: 'Ridgeland County'},
  { name: 'Fairfield County Library - Ridgeway Branch Library', url: 'https://www.ridgewaylibrary.org', eventsUrl: 'https://www.ridgewaylibrary.org/events', city: 'Ridgeway', state: 'SC', zipCode: '00000', county: 'Ridgeway County'},
  { name: 'York County Library System', url: 'https://www.rockhilllibrary.org', eventsUrl: 'https://www.rockhilllibrary.org/events', city: 'Rock Hill', state: 'SC', zipCode: '29730', county: 'Rock Hill County'},
  { name: 'Oconee County Public Library - Salem Branch Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'SC', zipCode: '29676', county: 'Salem County'},
  { name: 'Saluda County Library System', url: 'https://www.saludalibrary.org', eventsUrl: 'https://www.saludalibrary.org/events', city: 'Saluda', state: 'SC', zipCode: '29138', county: 'Saluda County'},
  { name: 'Orangeburg County Library - Santee Branch Library', url: 'https://www.santeelibrary.org', eventsUrl: 'https://www.santeelibrary.org/events', city: 'Santee', state: 'SC', zipCode: '29142', county: 'Santee County'},
  { name: 'Oconee County Public Library - Seneca Branch Library', url: 'https://www.senecalibrary.org', eventsUrl: 'https://www.senecalibrary.org/events', city: 'Seneca', state: 'SC', zipCode: '29678', county: 'Seneca County'},
  { name: 'Greenville County Library - Simpsonville (Hendricks) Branch', url: 'https://www.simpsonvillelibrary.org', eventsUrl: 'https://www.simpsonvillelibrary.org/events', city: 'Simpsonville', state: 'SC', zipCode: '29681', county: 'Simpsonville County'},
  { name: 'Society Hill Branch Library', url: 'https://www.societyhilllibrary.org', eventsUrl: 'https://www.societyhilllibrary.org/events', city: 'Society Hill', state: 'SC', zipCode: '29593', county: 'Society Hill County'},
  { name: 'Spartanburg County Public Library - H. Carlisle Bean Law Library', url: 'https://www.spartanburglibrary.org', eventsUrl: 'https://www.spartanburglibrary.org/events', city: 'Spartanburg', state: 'SC', zipCode: '29306', county: 'Spartanburg County'},
  { name: 'Orangeburg County Library - Springfield Branch Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'SC', zipCode: '29146', county: 'Springfield County'},
  { name: 'Dorchester County Library', url: 'https://www.stgeorgelibrary.org', eventsUrl: 'https://www.stgeorgelibrary.org/events', city: 'St. George', state: 'SC', zipCode: '29477', county: 'St. George County'},
  { name: 'Beaufort County Library - St. Helena Branch Library', url: 'https://www.sthelenaislandlibrary.org', eventsUrl: 'https://www.sthelenaislandlibrary.org/events', city: 'St. Helena Island', state: 'SC', zipCode: '29920', county: 'St. Helena Island County'},
  { name: 'Calhoun County Library', url: 'https://www.stmatthewslibrary.org', eventsUrl: 'https://www.stmatthewslibrary.org/events', city: 'St. Matthews', state: 'SC', zipCode: '29135', county: 'St. Matthews County'},
  { name: 'Berkeley County Library - St. Stephen Library', url: 'https://www.ststephenlibrary.org', eventsUrl: 'https://www.ststephenlibrary.org/events', city: 'St. Stephen', state: 'SC', zipCode: '29479', county: 'St. Stephen County'},
  { name: 'Charleston County Main Library - Edgar Allen Poe-Sullivans Island Branch Library', url: 'https://www.sullivansislandlibrary.org', eventsUrl: 'https://www.sullivansislandlibrary.org/events', city: 'Sullivans Island', state: 'SC', zipCode: '29482', county: 'Sullivans Island County'},
  { name: 'Berkeley County Library - Sangaree Library', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'SC', zipCode: '29483', county: 'Summerville County'},
  { name: 'Sumter County Public Library - South Sumter Branch', url: 'https://www.sumterlibrary.org', eventsUrl: 'https://www.sumterlibrary.org/events', city: 'Sumter', state: 'SC', zipCode: '29150', county: 'Sumter County'},
  { name: 'Horry County Memorial Library - Surfside', url: 'https://www.surfsidebeachlibrary.org', eventsUrl: 'https://www.surfsidebeachlibrary.org/events', city: 'Surfside Beach', state: 'SC', zipCode: '29579', county: 'Surfside Beach County'},
  { name: 'Lexington County Library - Swansea', url: 'https://www.swansealibrary.org', eventsUrl: 'https://www.swansealibrary.org/events', city: 'Swansea', state: 'SC', zipCode: '29160', county: 'Swansea County'},
  { name: 'Greenville County Library - Taylors (Burdette) Branch', url: 'https://www.taylorslibrary.org', eventsUrl: 'https://www.taylorslibrary.org/events', city: 'Taylors', state: 'SC', zipCode: '29687', county: 'Taylors County'},
  { name: 'Baker Memorial Public Library (Timmonsville)', url: 'https://www.timmonsvillelibrary.org', eventsUrl: 'https://www.timmonsvillelibrary.org/events', city: 'Timmonsville', state: 'SC', zipCode: '29161', county: 'Timmonsville County'},
  { name: 'Greenville County Library - Travelers Rest (Sargent) Branch', url: 'https://www.travelersrestlibrary.org', eventsUrl: 'https://www.travelersrestlibrary.org/events', city: 'Travelers Rest', state: 'SC', zipCode: '29690', county: 'Travelers Rest County'},
  { name: 'Edgefield County Public Library - Trenton Branch Library', url: 'https://www.trentonlibrary.org', eventsUrl: 'https://www.trentonlibrary.org/events', city: 'Trenton', state: 'SC', zipCode: '29847', county: 'Trenton County'},
  { name: 'Union County Library System', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'SC', zipCode: '29379', county: 'Union County'},
  { name: 'Oconee County Public Library', url: 'https://www.walhallalibrary.org', eventsUrl: 'https://www.walhallalibrary.org/events', city: 'Walhalla', state: 'SC', zipCode: '29691', county: 'Walhalla County'},
  { name: 'Colleton County Library System', url: 'https://www.walterborolibrary.org', eventsUrl: 'https://www.walterborolibrary.org/events', city: 'Walterboro', state: 'SC', zipCode: '29488', county: 'Walterboro County'},
  { name: 'Greenwood County Library - Ware Shoals Branch Library', url: 'https://www.wareshoalslibrary.org', eventsUrl: 'https://www.wareshoalslibrary.org/events', city: 'Ware Shoals', state: 'SC', zipCode: '29692', county: 'Ware Shoals County'},
  { name: 'Lexington County Library - Cayce-West Columbia', url: 'https://www.westcolumbialibrary.org', eventsUrl: 'https://www.westcolumbialibrary.org/events', city: 'West Columbia', state: 'SC', zipCode: '29169', county: 'West Columbia County'},
  { name: 'Oconee County Public Library - Westminster Branch Library', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'SC', zipCode: '29693', county: 'Westminster County'},
  { name: 'Whitmire Memorial Library', url: 'https://www.whitmirelibrary.org', eventsUrl: 'https://www.whitmirelibrary.org/events', city: 'Whitmire', state: 'SC', zipCode: '29178', county: 'Whitmire County'},
  { name: 'Anderson County Library - Lander Memorial Regional Library', url: 'https://www.williamstonlibrary.org', eventsUrl: 'https://www.williamstonlibrary.org/events', city: 'Williamston', state: 'SC', zipCode: '29697', county: 'Williamston County'},
  { name: 'Barnwell County Public Library - Williston Branch Library', url: 'https://www.willistonlibrary.org', eventsUrl: 'https://www.willistonlibrary.org/events', city: 'Williston', state: 'SC', zipCode: '29853', county: 'Williston County'},
  { name: 'Fairfield County Library', url: 'https://www.winnsborolibrary.org', eventsUrl: 'https://www.winnsborolibrary.org/events', city: 'Winnsboro', state: 'SC', zipCode: '29180', county: 'Winnsboro County'},
  { name: 'Spartanburg County Public Library - Woodruff Branch Library', url: 'https://www.woodrufflibrary.org', eventsUrl: 'https://www.woodrufflibrary.org/events', city: 'Woodruff', state: 'SC', zipCode: '29388', county: 'Woodruff County'},
  { name: 'York Public Library', url: 'https://www.yorklibrary.org', eventsUrl: 'https://www.yorklibrary.org/events', city: 'York', state: 'SC', zipCode: '29745', county: 'York County'}
];

const SCRAPER_NAME = 'wordpress-SC';

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
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
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
            state: 'SC',
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
    state: 'SC',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  South Carolina Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressSCCloudFunction() {
  console.log('☁️ Running WordPress SC as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-SC', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-SC', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressSCCloudFunction };
