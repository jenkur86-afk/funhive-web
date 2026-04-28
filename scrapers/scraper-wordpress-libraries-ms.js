const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Mississippi Public Libraries Scraper
 * State: MS
 * Coverage: All Mississippi Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Jackson-Hinds Library System', url: 'https://www.jhlibrary.org', eventsUrl: 'https://www.jhlibrary.org/events', city: 'Jackson', state: 'MS', zipCode: '39201', county: 'Jackson County'},
  { name: 'Harrison County Library System', url: 'https://www.harrison.lib.ms.us', eventsUrl: 'https://www.harrison.lib.ms.us/events', city: 'Gulfport', state: 'MS', zipCode: '39501', county: 'Gulfport County'},
  // Regional Libraries
  { name: 'First Regional Library', url: 'https://www.firstregional.org', eventsUrl: 'https://www.firstregional.org/events', city: 'Hernando', state: 'MS', zipCode: '38632', county: 'Hernando County'},
  { name: 'Lee-Itawamba Library System', url: 'https://www.li.lib.ms.us', eventsUrl: 'https://www.li.lib.ms.us/events', city: 'Tupelo', state: 'MS', zipCode: '38801', county: 'Tupelo County'},
  { name: 'Hancock County Library System', url: 'https://www.hancock.lib.ms.us', eventsUrl: 'https://www.hancock.lib.ms.us/events', city: 'Bay St. Louis', state: 'MS', zipCode: '39520', county: 'Bay St. Louis County'},
  { name: 'Jackson-George Regional Library System', url: 'https://www.jgrls.org', eventsUrl: 'https://www.jgrls.org/events', city: 'Pascagoula', state: 'MS', zipCode: '39567', county: 'Pascagoula County'},
  { name: 'Pike-Amite-Walthall Library System', url: 'https://www.pawlib.org', eventsUrl: 'https://www.pawlib.org/events', city: 'McComb', state: 'MS', zipCode: '39648', county: 'McComb County'},
  { name: 'Lauderdale County Public Library', url: 'https://www.lauderdalecounty.lib.ms.us', eventsUrl: 'https://www.lauderdalecounty.lib.ms.us/events', city: 'Meridian', state: 'MS', zipCode: '39301' },
  { name: 'Columbus-Lowndes Public Library', url: 'https://www.lowndes.lib.ms.us', eventsUrl: 'https://www.lowndes.lib.ms.us/events', city: 'Columbus', state: 'MS', zipCode: '39701', county: 'Columbus County'},
  { name: 'Warren County-Vicksburg Public Library', url: 'https://www.warren.lib.ms.us', eventsUrl: 'https://www.warren.lib.ms.us/events', city: 'Vicksburg', state: 'MS', zipCode: '39180', county: 'Vicksburg County'},
  { name: 'Madison County Library System', url: 'https://www.madison.lib.ms.us', eventsUrl: 'https://www.madison.lib.ms.us/events', city: 'Canton', state: 'MS', zipCode: '39046', county: 'Canton County'},
  { name: 'Rankin County Library System', url: 'https://www.rankin.lib.ms.us', eventsUrl: 'https://www.rankin.lib.ms.us/events', city: 'Brandon', state: 'MS', zipCode: '39042', county: 'Brandon County'},
  { name: 'Natchez Adams Wilkinson Library Service', url: 'https://www.nawls.lib.ms.us', eventsUrl: 'https://www.nawls.lib.ms.us/events', city: 'Natchez', state: 'MS', zipCode: '39120', county: 'Natchez County'},
  { name: 'Laurel-Jones County Library', url: 'https://www.laurel.lib.ms.us', eventsUrl: 'https://www.laurel.lib.ms.us/events', city: 'Laurel', state: 'MS', zipCode: '39440', county: 'Laurel County'},
  { name: 'Forrest County Library System', url: 'https://www.forrest.lib.ms.us', eventsUrl: 'https://www.forrest.lib.ms.us/events', city: 'Hattiesburg', state: 'MS', zipCode: '39401', county: 'Hattiesburg County'},
  { name: 'Pine Forest Regional Library', url: 'https://www.pineforest.lib.ms.us', eventsUrl: 'https://www.pineforest.lib.ms.us/events', city: 'Richton', state: 'MS', zipCode: '39476', county: 'Richton County'},
  { name: 'Starkville-Oktibbeha County Public Library', url: 'https://www.starkville.lib.ms.us', eventsUrl: 'https://www.starkville.lib.ms.us/events', city: 'Starkville', state: 'MS', zipCode: '39759', county: 'Starkville County'},
  { name: 'Greenville Public Library', url: 'https://www.greenville.lib.ms.us', eventsUrl: 'https://www.greenville.lib.ms.us/events', city: 'Greenville', state: 'MS', zipCode: '38701', county: 'Greenville County'},
  { name: 'Bolivar County Library System', url: 'https://www.bolivar.lib.ms.us', eventsUrl: 'https://www.bolivar.lib.ms.us/events', city: 'Cleveland', state: 'MS', zipCode: '38732', county: 'Cleveland County'},
  { name: 'Claiborne County Public Library', url: 'https://www.claiborne.lib.ms.us', eventsUrl: 'https://www.claiborne.lib.ms.us/events', city: 'Port Gibson', state: 'MS', zipCode: '39150', county: 'Port Gibson County'},
  { name: 'Pearl River County Library System', url: 'https://www.pearlriver.lib.ms.us', eventsUrl: 'https://www.pearlriver.lib.ms.us/events', city: 'Picayune', state: 'MS', zipCode: '39466', county: 'Picayune County'},
  { name: 'Lincoln-Lawrence-Franklin Regional Library', url: 'https://www.llf.lib.ms.us', eventsUrl: 'https://www.llf.lib.ms.us/events', city: 'Brookhaven', state: 'MS', zipCode: '39601', county: 'Brookhaven County'},
  { name: 'Dixie Regional Library System', url: 'https://www.dixie.lib.ms.us', eventsUrl: 'https://www.dixie.lib.ms.us/events', city: 'Pontotoc', state: 'MS', zipCode: '38863', county: 'Pontotoc County'},
  { name: 'Northeast Regional Library', url: 'https://www.nereg.lib.ms.us', eventsUrl: 'https://www.nereg.lib.ms.us/events', city: 'Corinth', state: 'MS', zipCode: '38834', county: 'Corinth County'},
  { name: 'Central Mississippi Regional Library System', url: 'https://www.cmrls.lib.ms.us', eventsUrl: 'https://www.cmrls.lib.ms.us/events', city: 'Kosciusko', state: 'MS', zipCode: '39090', county: 'Kosciusko County'},
  { name: 'Tombigbee Regional Library System', url: 'https://www.tombigbee.lib.ms.us', eventsUrl: 'https://www.tombigbee.lib.ms.us/events', city: 'West Point', state: 'MS', zipCode: '39773', county: 'West Point County'},
  { name: 'Mid-Mississippi Regional Library System', url: 'https://www.midmiss.lib.ms.us', eventsUrl: 'https://www.midmiss.lib.ms.us/events', city: 'Carthage', state: 'MS', zipCode: '39051', county: 'Carthage County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Evans Memorial Library', url: 'https://www.aberdeenlibrary.org', eventsUrl: 'https://www.aberdeenlibrary.org/events', city: 'Aberdeen', state: 'MS', zipCode: '00000', county: 'Aberdeen County'},
  { name: 'Choctaw County Public Library', url: 'https://www.ackermanlibrary.org', eventsUrl: 'https://www.ackermanlibrary.org/events', city: 'Ackerman', state: 'MS', zipCode: '00000', county: 'Ackerman County'},
  { name: 'Amory Municipal Library', url: 'https://www.amorylibrary.org', eventsUrl: 'https://www.amorylibrary.org/events', city: 'Amory', state: 'MS', zipCode: '00000', county: 'Amory County'},
  { name: 'Arcola Public Library', url: 'https://www.arcolalibrary.org', eventsUrl: 'https://www.arcolalibrary.org/events', city: 'Arcola', state: 'MS', zipCode: '00000', county: 'Arcola County'},
  { name: 'Artesia Public Library', url: 'https://www.artesialibrary.org', eventsUrl: 'https://www.artesialibrary.org/events', city: 'Artesia', state: 'MS', zipCode: '00000', county: 'Artesia County'},
  { name: 'Benton County Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'MS', zipCode: '38603', county: 'Ashland County'},
  { name: 'Avon Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'MS', zipCode: '00000', county: 'Avon County'},
  { name: 'Anne Spencer Cox Library', url: 'https://www.baldwynlibrary.org', eventsUrl: 'https://www.baldwynlibrary.org/events', city: 'Baldwyn', state: 'MS', zipCode: '00000', county: 'Baldwyn County'},
  { name: 'Dr. Frank L. Leggett Public Library', url: 'https://www.bassfieldlibrary.org', eventsUrl: 'https://www.bassfieldlibrary.org/events', city: 'Bassfield', state: 'MS', zipCode: '00000', county: 'Bassfield County'},
  { name: 'Batesville Public Library', url: 'https://www.batesvillelibrary.org', eventsUrl: 'https://www.batesvillelibrary.org/events', city: 'Batesville', state: 'MS', zipCode: '00000', county: 'Batesville County'},
  { name: 'Bay Springs Municipal Library', url: 'https://www.bayspringslibrary.org', eventsUrl: 'https://www.bayspringslibrary.org/events', city: 'Bay Springs', state: 'MS', zipCode: '00000', county: 'Bay Springs County'},
  { name: 'William Estes Powell Memorial Library', url: 'https://www.beaumontlibrary.org', eventsUrl: 'https://www.beaumontlibrary.org/events', city: 'Beaumont', state: 'MS', zipCode: '00000', county: 'Beaumont County'},
  { name: 'Belmont Public Library', url: 'https://www.belmontlibrary.org', eventsUrl: 'https://www.belmontlibrary.org/events', city: 'Belmont', state: 'MS', zipCode: '00000', county: 'Belmont County'},
  { name: 'Humphreys County Library System', url: 'https://www.belzonilibrary.org', eventsUrl: 'https://www.belzonilibrary.org/events', city: 'Belzoni', state: 'MS', zipCode: '39038', county: 'Belzoni County'},
  { name: 'Benoit Public Library', url: 'https://www.benoitlibrary.org', eventsUrl: 'https://www.benoitlibrary.org/events', city: 'Benoit', state: 'MS', zipCode: '00000', county: 'Benoit County'},
  { name: 'Biloxi Public Library', url: 'https://www.biloxilibrary.org', eventsUrl: 'https://www.biloxilibrary.org/events', city: 'Biloxi', state: 'MS', zipCode: '39530', county: 'Biloxi County'},
  { name: 'Blue Mountain Public Library', url: 'https://www.bluemountainlibrary.org', eventsUrl: 'https://www.bluemountainlibrary.org/events', city: 'Blue Mountain', state: 'MS', zipCode: '00000', county: 'Blue Mountain County'},
  { name: 'Annie Thompson Jeffers Library', url: 'https://www.boltonlibrary.org', eventsUrl: 'https://www.boltonlibrary.org/events', city: 'Bolton', state: 'MS', zipCode: '00000', county: 'Bolton County'},
  { name: 'George E. Allen Library', url: 'https://www.boonevillelibrary.org', eventsUrl: 'https://www.boonevillelibrary.org/events', city: 'Booneville', state: 'MS', zipCode: '00000', county: 'Booneville County'},
  { name: 'Brooksville Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'MS', zipCode: '00000', county: 'Brooksville County'},
  { name: 'Jesse Yancy Memorial Library', url: 'https://www.brucelibrary.org', eventsUrl: 'https://www.brucelibrary.org/events', city: 'Bruce', state: 'MS', zipCode: '00000', county: 'Bruce County'},
  { name: 'Bude Public Library', url: 'https://www.budelibrary.org', eventsUrl: 'https://www.budelibrary.org/events', city: 'Bude', state: 'MS', zipCode: '00000', county: 'Bude County'},
  { name: 'Burnsville Public Library', url: 'https://www.burnsvillelibrary.org', eventsUrl: 'https://www.burnsvillelibrary.org/events', city: 'Burnsville', state: 'MS', zipCode: '00000', county: 'Burnsville County'},
  { name: 'Ruth B. French Library', url: 'https://www.byhalialibrary.org', eventsUrl: 'https://www.byhalialibrary.org/events', city: 'Byhalia', state: 'MS', zipCode: '00000', county: 'Byhalia County'},
  { name: 'Beverly Brown Library', url: 'https://www.byramlibrary.org', eventsUrl: 'https://www.byramlibrary.org/events', city: 'Byram', state: 'MS', zipCode: '00000', county: 'Byram County'},
  { name: 'Caledonia Public Library', url: 'https://www.caledonialibrary.org', eventsUrl: 'https://www.caledonialibrary.org/events', city: 'Caledonia', state: 'MS', zipCode: '00000', county: 'Caledonia County'},
  { name: 'Calhoun City Public Library', url: 'https://www.calhouncitylibrary.org', eventsUrl: 'https://www.calhouncitylibrary.org/events', city: 'Calhoun City', state: 'MS', zipCode: '00000', county: 'Calhoun City County'},
  { name: 'Carroll County Public Library', url: 'https://www.carrolltonlibrary.org', eventsUrl: 'https://www.carrolltonlibrary.org/events', city: 'Carrollton', state: 'MS', zipCode: '38947', county: 'Carrollton County'},
  { name: 'Kevin Poole Vancleave Memorial Library', url: 'https://www.centrevillelibrary.org', eventsUrl: 'https://www.centrevillelibrary.org/events', city: 'Centreville', state: 'MS', zipCode: '00000', county: 'Centreville County'},
  { name: 'Charleston Public Library', url: 'https://www.charlestonlibrary.org', eventsUrl: 'https://www.charlestonlibrary.org/events', city: 'Charleston', state: 'MS', zipCode: '00000', county: 'Charleston County'},
  { name: 'Carnegie Public Library', url: 'https://www.clarksdalelibrary.org', eventsUrl: 'https://www.clarksdalelibrary.org/events', city: 'Clarksdale', state: 'MS', zipCode: '38614', county: 'Clarksdale County'},
  { name: 'A. E. Wood Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'MS', zipCode: '00000', county: 'Clinton County'},
  { name: 'Coffeeville Public Library', url: 'https://www.coffeevillelibrary.org', eventsUrl: 'https://www.coffeevillelibrary.org/events', city: 'Coffeeville', state: 'MS', zipCode: '00000', county: 'Coffeeville County'},
  { name: 'Jessie J. Edwards Public Library', url: 'https://www.coldwaterlibrary.org', eventsUrl: 'https://www.coldwaterlibrary.org/events', city: 'Coldwater', state: 'MS', zipCode: '00000', county: 'Coldwater County'},
  { name: 'R. E. Blackwell Memorial Library', url: 'https://www.collinslibrary.org', eventsUrl: 'https://www.collinslibrary.org/events', city: 'Collins', state: 'MS', zipCode: '00000', county: 'Collins County'},
  { name: 'Columbia-Marion County Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'MS', zipCode: '00000', county: 'Columbia County'},
  { name: 'Emily Jones Pointer Library', url: 'https://www.comolibrary.org', eventsUrl: 'https://www.comolibrary.org/events', city: 'Como', state: 'MS', zipCode: '00000', county: 'Como County'},
  { name: 'Crawford Public Library', url: 'https://www.crawfordlibrary.org', eventsUrl: 'https://www.crawfordlibrary.org/events', city: 'Crawford', state: 'MS', zipCode: '00000', county: 'Crawford County'},
  { name: 'Sam Lapidus Memorial Public Library', url: 'https://www.crenshawlibrary.org', eventsUrl: 'https://www.crenshawlibrary.org/events', city: 'Crenshaw', state: 'MS', zipCode: '00000', county: 'Crenshaw County'},
  { name: 'Crosby Public Library', url: 'https://www.crosbylibrary.org', eventsUrl: 'https://www.crosbylibrary.org/events', city: 'Crosby', state: 'MS', zipCode: '00000', county: 'Crosby County'},
  { name: 'J.T. Biggs Jr. Memorial Library', url: 'https://www.crystalspringslibrary.org', eventsUrl: 'https://www.crystalspringslibrary.org/events', city: 'Crystal Springs', state: 'MS', zipCode: '00000', county: 'Crystal Springs County'},
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'MS', zipCode: '00000', county: 'Decatur County'},
  { name: 'Dekalb Public Library', url: 'https://www.dekalblibrary.org', eventsUrl: 'https://www.dekalblibrary.org/events', city: 'Dekalb', state: 'MS', zipCode: '00000', county: 'Dekalb County'},
  { name: 'Jerry Lawrence Memorial Library', url: 'https://www.dibervillelibrary.org', eventsUrl: 'https://www.dibervillelibrary.org/events', city: 'Diberville', state: 'MS', zipCode: '00000', county: 'Diberville County'},
  { name: 'Dlo Public Library', url: 'https://www.dlolibrary.org', eventsUrl: 'https://www.dlolibrary.org/events', city: 'Dlo', state: 'MS', zipCode: '00000', county: 'Dlo County'},
  { name: 'Drew Public Library', url: 'https://www.drewlibrary.org', eventsUrl: 'https://www.drewlibrary.org/events', city: 'Drew', state: 'MS', zipCode: '00000', county: 'Drew County'},
  { name: 'Duck Hill Public Library', url: 'https://www.duckhilllibrary.org', eventsUrl: 'https://www.duckhilllibrary.org/events', city: 'Duck Hill', state: 'MS', zipCode: '00000', county: 'Duck Hill County'},
  { name: 'Durant Public Library', url: 'https://www.durantlibrary.org', eventsUrl: 'https://www.durantlibrary.org/events', city: 'Durant', state: 'MS', zipCode: '00000', county: 'Durant County'},
  { name: 'Lois A. Flagg Branch', url: 'https://www.edwardslibrary.org', eventsUrl: 'https://www.edwardslibrary.org/events', city: 'Edwards', state: 'MS', zipCode: '00000', county: 'Edwards County'},
  { name: 'Ellisville Public Library', url: 'https://www.ellisvillelibrary.org', eventsUrl: 'https://www.ellisvillelibrary.org/events', city: 'Ellisville', state: 'MS', zipCode: '00000', county: 'Ellisville County'},
  { name: 'Enterprise Public Library', url: 'https://www.enterpriselibrary.org', eventsUrl: 'https://www.enterpriselibrary.org/events', city: 'Enterprise', state: 'MS', zipCode: '00000', county: 'Enterprise County'},
  { name: 'Webster County Public Library', url: 'https://www.euporalibrary.org', eventsUrl: 'https://www.euporalibrary.org/events', city: 'Eupora', state: 'MS', zipCode: '00000', county: 'Eupora County'},
  { name: 'Jefferson County Public Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'MS', zipCode: '00000', county: 'Fayette County'},
  { name: 'Flora Public Library', url: 'https://www.floralibrary.org', eventsUrl: 'https://www.floralibrary.org/events', city: 'Flora', state: 'MS', zipCode: '00000', county: 'Flora County'},
  { name: 'Florence Public Library', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'MS', zipCode: '00000', county: 'Florence County'},
  { name: 'G. Chastaine Flynt Memorial Library', url: 'https://www.flowoodlibrary.org', eventsUrl: 'https://www.flowoodlibrary.org/events', city: 'Flowood', state: 'MS', zipCode: '00000', county: 'Flowood County'},
  { name: 'Forest Public Library', url: 'https://www.forestlibrary.org', eventsUrl: 'https://www.forestlibrary.org/events', city: 'Forest', state: 'MS', zipCode: '00000', county: 'Forest County'},
  { name: 'Itawamba County-Pratt Memorial Library', url: 'https://www.fultonlibrary.org', eventsUrl: 'https://www.fultonlibrary.org/events', city: 'Fulton', state: 'MS', zipCode: '00000', county: 'Fulton County'},
  { name: 'Kathleen Mcilwain Public Library Of Gautier', url: 'https://www.gautierlibrary.org', eventsUrl: 'https://www.gautierlibrary.org/events', city: 'Gautier', state: 'MS', zipCode: '00000', county: 'Gautier County'},
  { name: 'Georgetown Library', url: 'https://www.georgetownlibrary.org', eventsUrl: 'https://www.georgetownlibrary.org/events', city: 'Georgetown', state: 'MS', zipCode: '00000', county: 'Georgetown County'},
  { name: 'Glen Allan Public Library', url: 'https://www.glenallanlibrary.org', eventsUrl: 'https://www.glenallanlibrary.org/events', city: 'Glen Allan', state: 'MS', zipCode: '00000', county: 'Glen Allan County'},
  { name: 'Gloster Public Library', url: 'https://www.glosterlibrary.org', eventsUrl: 'https://www.glosterlibrary.org/events', city: 'Gloster', state: 'MS', zipCode: '00000', county: 'Gloster County'},
  { name: 'Goodman Public Library', url: 'https://www.goodmanlibrary.org', eventsUrl: 'https://www.goodmanlibrary.org/events', city: 'Goodman', state: 'MS', zipCode: '00000', county: 'Goodman County'},
  { name: 'Greenwood-Leflore Public Library', url: 'https://www.greenwoodlibrary.org', eventsUrl: 'https://www.greenwoodlibrary.org/events', city: 'Greenwood', state: 'MS', zipCode: '38930', county: 'Greenwood County'},
  { name: 'Elizabeth Jones Library', url: 'https://www.grenadalibrary.org', eventsUrl: 'https://www.grenadalibrary.org/events', city: 'Grenada', state: 'MS', zipCode: '38901', county: 'Grenada County'},
  { name: 'Gunnison Public Library', url: 'https://www.gunnisonlibrary.org', eventsUrl: 'https://www.gunnisonlibrary.org/events', city: 'Gunnison', state: 'MS', zipCode: '00000', county: 'Gunnison County'},
  { name: 'Hamilton Public Library', url: 'https://www.hamiltonlibrary.org', eventsUrl: 'https://www.hamiltonlibrary.org/events', city: 'Hamilton', state: 'MS', zipCode: '00000', county: 'Hamilton County'},
  { name: 'Harrisville Public Library', url: 'https://www.harrisvillelibrary.org', eventsUrl: 'https://www.harrisvillelibrary.org/events', city: 'Harrisville', state: 'MS', zipCode: '00000', county: 'Harrisville County'},
  { name: 'Copiah-Jefferson Regional Library', url: 'https://www.hazelhurstlibrary.org', eventsUrl: 'https://www.hazelhurstlibrary.org/events', city: 'Hazelhurst', state: 'MS', zipCode: '39083', county: 'Hazelhurst County'},
  { name: 'George W. Covington Memorial Library', url: 'https://www.hazlehurstlibrary.org', eventsUrl: 'https://www.hazlehurstlibrary.org/events', city: 'Hazlehurst', state: 'MS', zipCode: '39083', county: 'Hazlehurst County'},
  { name: 'Mary Weems Parker Memorial Library', url: 'https://www.heidelberglibrary.org', eventsUrl: 'https://www.heidelberglibrary.org/events', city: 'Heidelberg', state: 'MS', zipCode: '00000', county: 'Heidelberg County'},
  { name: 'Hickory Flat Public Library', url: 'https://www.hickoryflatlibrary.org', eventsUrl: 'https://www.hickoryflatlibrary.org/events', city: 'Hickory Flat', state: 'MS', zipCode: '00000', county: 'Hickory Flat County'},
  { name: 'Torrey Woods Memorial Library', url: 'https://www.hollandalelibrary.org', eventsUrl: 'https://www.hollandalelibrary.org/events', city: 'Hollandale', state: 'MS', zipCode: '00000', county: 'Hollandale County'},
  { name: 'Marshall County Library', url: 'https://www.hollyspringslibrary.org', eventsUrl: 'https://www.hollyspringslibrary.org/events', city: 'Holly Springs', state: 'MS', zipCode: '38635', county: 'Holly Springs County'},
  { name: 'M. R. Dye Public Library', url: 'https://www.hornlakelibrary.org', eventsUrl: 'https://www.hornlakelibrary.org/events', city: 'Horn Lake', state: 'MS', zipCode: '00000', county: 'Horn Lake County'},
  { name: 'Houlka Public Library', url: 'https://www.houlkalibrary.org', eventsUrl: 'https://www.houlkalibrary.org/events', city: 'Houlka', state: 'MS', zipCode: '00000', county: 'Houlka County'},
  { name: 'Houston Carnegie Library', url: 'https://www.houstonlibrary.org', eventsUrl: 'https://www.houstonlibrary.org/events', city: 'Houston', state: 'MS', zipCode: '00000', county: 'Houston County'},
  { name: 'Henry M. Seymour Library', url: 'https://www.indianolalibrary.org', eventsUrl: 'https://www.indianolalibrary.org/events', city: 'Indianola', state: 'MS', zipCode: '00000', county: 'Indianola County'},
  { name: 'Inverness Public Library', url: 'https://www.invernesslibrary.org', eventsUrl: 'https://www.invernesslibrary.org/events', city: 'Inverness', state: 'MS', zipCode: '00000', county: 'Inverness County'},
  { name: 'Isola Public Library', url: 'https://www.isolalibrary.org', eventsUrl: 'https://www.isolalibrary.org/events', city: 'Isola', state: 'MS', zipCode: '00000', county: 'Isola County'},
  { name: 'Itta Bena Branch Library', url: 'https://www.ittabenalibrary.org', eventsUrl: 'https://www.ittabenalibrary.org/events', city: 'Itta Bena', state: 'MS', zipCode: '00000', county: 'Itta Bena County'},
  { name: 'Iuka Public Library', url: 'https://www.iukalibrary.org', eventsUrl: 'https://www.iukalibrary.org/events', city: 'Iuka', state: 'MS', zipCode: '00000', county: 'Iuka County'},
  { name: 'Kilmichael Public Library', url: 'https://www.kilmichaellibrary.org', eventsUrl: 'https://www.kilmichaellibrary.org/events', city: 'Kilmichael', state: 'MS', zipCode: '00000', county: 'Kilmichael County'},
  { name: 'Kiln Public Library', url: 'https://www.kilnlibrary.org', eventsUrl: 'https://www.kilnlibrary.org/events', city: 'Kiln', state: 'MS', zipCode: '00000', county: 'Kiln County'},
  { name: 'Lake Public Library', url: 'https://www.lakelibrary.org', eventsUrl: 'https://www.lakelibrary.org/events', city: 'Lake', state: 'MS', zipCode: '00000', county: 'Lake County'},
  { name: 'Leakesville Public Library', url: 'https://www.leakesvillelibrary.org', eventsUrl: 'https://www.leakesvillelibrary.org/events', city: 'Leakesville', state: 'MS', zipCode: '00000', county: 'Leakesville County'},
  { name: 'Leland Public Library', url: 'https://www.lelandlibrary.org', eventsUrl: 'https://www.lelandlibrary.org/events', city: 'Leland', state: 'MS', zipCode: '00000', county: 'Leland County'},
  { name: 'Lexington Public Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'MS', zipCode: '00000', county: 'Lexington County'},
  { name: 'Liberty Public Library', url: 'https://www.libertylibrary.org', eventsUrl: 'https://www.libertylibrary.org/events', city: 'Liberty', state: 'MS', zipCode: '00000', county: 'Liberty County'},
  { name: 'Long Beach Public Library', url: 'https://www.longbeachlibrary.org', eventsUrl: 'https://www.longbeachlibrary.org/events', city: 'Long Beach', state: 'MS', zipCode: '39560', county: 'Long Beach County'},
  { name: 'Louin Public Library', url: 'https://www.louinlibrary.org', eventsUrl: 'https://www.louinlibrary.org/events', city: 'Louin', state: 'MS', zipCode: '00000', county: 'Louin County'},
  { name: 'Winston County Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'MS', zipCode: '00000', county: 'Louisville County'},
  { name: 'Lucedale-George County Library', url: 'https://www.lucedalelibrary.org', eventsUrl: 'https://www.lucedalelibrary.org/events', city: 'Lucedale', state: 'MS', zipCode: '00000', county: 'Lucedale County'},
  { name: 'Lumberton Public Library', url: 'https://www.lumbertonlibrary.org', eventsUrl: 'https://www.lumbertonlibrary.org/events', city: 'Lumberton', state: 'MS', zipCode: '00000', county: 'Lumberton County'},
  { name: 'Maben Public Library', url: 'https://www.mabenlibrary.org', eventsUrl: 'https://www.mabenlibrary.org/events', city: 'Maben', state: 'MS', zipCode: '00000', county: 'Maben County'},
  { name: 'Ada S. Fant Memorial Library', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'MS', zipCode: '00000', county: 'Macon County'},
  { name: 'Rebecca Baine Rigby Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'MS', zipCode: '00000', county: 'Madison County'},
  { name: 'Magee Public Library', url: 'https://www.mageelibrary.org', eventsUrl: 'https://www.mageelibrary.org/events', city: 'Magee', state: 'MS', zipCode: '00000', county: 'Magee County'},
  { name: 'Magnolia Public Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'MS', zipCode: '00000', county: 'Magnolia County'},
  { name: 'Marietta Public Library', url: 'https://www.mariettalibrary.org', eventsUrl: 'https://www.mariettalibrary.org/events', city: 'Marietta', state: 'MS', zipCode: '00000', county: 'Marietta County'},
  { name: 'Marks-Quitman County Library', url: 'https://www.markslibrary.org', eventsUrl: 'https://www.markslibrary.org/events', city: 'Marks', state: 'MS', zipCode: '38646', county: 'Marks County'},
  { name: 'Mathiston Public Library', url: 'https://www.mathistonlibrary.org', eventsUrl: 'https://www.mathistonlibrary.org/events', city: 'Mathiston', state: 'MS', zipCode: '00000', county: 'Mathiston County'},
  { name: 'William And Dolores Mauldin Library', url: 'https://www.mchenrylibrary.org', eventsUrl: 'https://www.mchenrylibrary.org/events', city: 'Mchenry', state: 'MS', zipCode: '00000', county: 'Mchenry County'},
  { name: 'Mclain Public Library', url: 'https://www.mclainlibrary.org', eventsUrl: 'https://www.mclainlibrary.org/events', city: 'Mclain', state: 'MS', zipCode: '00000', county: 'Mclain County'},
  { name: 'Franklin County Public Library', url: 'https://www.meadvillelibrary.org', eventsUrl: 'https://www.meadvillelibrary.org/events', city: 'Meadville', state: 'MS', zipCode: '00000', county: 'Meadville County'},
  { name: 'Mendenhall Public Library', url: 'https://www.mendenhalllibrary.org', eventsUrl: 'https://www.mendenhalllibrary.org/events', city: 'Mendenhall', state: 'MS', zipCode: '00000', county: 'Mendenhall County'},
  { name: 'Thelma R. Rayner Memorial Library', url: 'https://www.merigoldlibrary.org', eventsUrl: 'https://www.merigoldlibrary.org/events', city: 'Merigold', state: 'MS', zipCode: '00000', county: 'Merigold County'},
  { name: 'R.T. Prince Library', url: 'https://www.mizelibrary.org', eventsUrl: 'https://www.mizelibrary.org/events', city: 'Mize', state: 'MS', zipCode: '00000', county: 'Mize County'},
  { name: 'Lawrence County Public Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'MS', zipCode: '00000', county: 'Monticello County'},
  { name: 'Morton Public Library', url: 'https://www.mortonlibrary.org', eventsUrl: 'https://www.mortonlibrary.org/events', city: 'Morton', state: 'MS', zipCode: '00000', county: 'Morton County'},
  { name: 'East Central Public Library', url: 'https://www.mosspointlibrary.org', eventsUrl: 'https://www.mosspointlibrary.org/events', city: 'Moss Point', state: 'MS', zipCode: '00000', county: 'Moss Point County'},
  { name: 'Mound Bayou Public Library', url: 'https://www.moundbayoulibrary.org', eventsUrl: 'https://www.moundbayoulibrary.org/events', city: 'Mound Bayou', state: 'MS', zipCode: '00000', county: 'Mound Bayou County'},
  { name: 'Jane Blain Brewer Memorial Library', url: 'https://www.mtolivelibrary.org', eventsUrl: 'https://www.mtolivelibrary.org/events', city: 'Mt. Olive', state: 'MS', zipCode: '00000', county: 'Mt. Olive County'},
  { name: 'Nance-Mcneely Memorial Library', url: 'https://www.myrtlelibrary.org', eventsUrl: 'https://www.myrtlelibrary.org/events', city: 'Myrtle', state: 'MS', zipCode: '00000', county: 'Myrtle County'},
  { name: 'Dorothy J. Lowe Memorial Library', url: 'https://www.nettletonlibrary.org', eventsUrl: 'https://www.nettletonlibrary.org/events', city: 'Nettleton', state: 'MS', zipCode: '00000', county: 'Nettleton County'},
  { name: 'Jennie Stephens Smith Library', url: 'https://www.newalbanylibrary.org', eventsUrl: 'https://www.newalbanylibrary.org/events', city: 'New Albany', state: 'MS', zipCode: '38652', county: 'New Albany County'},
  { name: 'New Augusta Public Library', url: 'https://www.newaugustalibrary.org', eventsUrl: 'https://www.newaugustalibrary.org/events', city: 'New Augusta', state: 'MS', zipCode: '00000', county: 'New Augusta County'},
  { name: 'New Hebron Public Library', url: 'https://www.newhebronlibrary.org', eventsUrl: 'https://www.newhebronlibrary.org/events', city: 'New Hebron', state: 'MS', zipCode: '00000', county: 'New Hebron County'},
  { name: 'J. Elliott Mcmullan Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'MS', zipCode: '00000', county: 'Newton County'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'MS', zipCode: '00000', county: 'Oakland County'},
  { name: 'Ocean Springs Municipal Library', url: 'https://www.oceanspringslibrary.org', eventsUrl: 'https://www.oceanspringslibrary.org/events', city: 'Ocean Springs', state: 'MS', zipCode: '00000', county: 'Ocean Springs County'},
  { name: 'Okolona Carnegie Library', url: 'https://www.okolonalibrary.org', eventsUrl: 'https://www.okolonalibrary.org/events', city: 'Okolona', state: 'MS', zipCode: '00000', county: 'Okolona County'},
  { name: 'B. J. Chain Public Library', url: 'https://www.olivebranchlibrary.org', eventsUrl: 'https://www.olivebranchlibrary.org/events', city: 'Olive Branch', state: 'MS', zipCode: '00000', county: 'Olive Branch County'},
  { name: 'Osyka Public Library', url: 'https://www.osykalibrary.org', eventsUrl: 'https://www.osykalibrary.org/events', city: 'Osyka', state: 'MS', zipCode: '00000', county: 'Osyka County'},
  { name: 'Lafayette County-Oxford Public Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'MS', zipCode: '00000', county: 'Oxford County'},
  { name: 'Pachuta Public Library', url: 'https://www.pachutalibrary.org', eventsUrl: 'https://www.pachutalibrary.org/events', city: 'Pachuta', state: 'MS', zipCode: '00000', county: 'Pachuta County'},
  { name: 'Pass Christian Branch Library', url: 'https://www.passchristianlibrary.org', eventsUrl: 'https://www.passchristianlibrary.org/events', city: 'Pass Christian', state: 'MS', zipCode: '39571', county: 'Pass Christian County'},
  { name: 'Pearl Public Library', url: 'https://www.pearllibrary.org', eventsUrl: 'https://www.pearllibrary.org/events', city: 'Pearl', state: 'MS', zipCode: '00000', county: 'Pearl County'},
  { name: 'Pearlington Public Library', url: 'https://www.pearlingtonlibrary.org', eventsUrl: 'https://www.pearlingtonlibrary.org/events', city: 'Pearlington', state: 'MS', zipCode: '00000', county: 'Pearlington County'},
  { name: 'Pelahatchie Public Library', url: 'https://www.pelahatchielibrary.org', eventsUrl: 'https://www.pelahatchielibrary.org/events', city: 'Pelahatchie', state: 'MS', zipCode: '00000', county: 'Pelahatchie County'},
  { name: 'Conway Hall Library', url: 'https://www.petallibrary.org', eventsUrl: 'https://www.petallibrary.org/events', city: 'Petal', state: 'MS', zipCode: '00000', county: 'Petal County'},
  { name: 'Neshoba County Public Library', url: 'https://www.philadelphialibrary.org', eventsUrl: 'https://www.philadelphialibrary.org/events', city: 'Philadelphia', state: 'MS', zipCode: '39350', county: 'Philadelphia County'},
  { name: 'Pickens Public Library', url: 'https://www.pickenslibrary.org', eventsUrl: 'https://www.pickenslibrary.org/events', city: 'Pickens', state: 'MS', zipCode: '00000', county: 'Pickens County'},
  { name: 'Polkville Public Library', url: 'https://www.polkvillelibrary.org', eventsUrl: 'https://www.polkvillelibrary.org/events', city: 'Polkville', state: 'MS', zipCode: '00000', county: 'Polkville County'},
  { name: 'Poplarville Public Library', url: 'https://www.poplarvillelibrary.org', eventsUrl: 'https://www.poplarvillelibrary.org/events', city: 'Poplarville', state: 'MS', zipCode: '00000', county: 'Poplarville County'},
  { name: 'Potts Camp Library', url: 'https://www.pottscamplibrary.org', eventsUrl: 'https://www.pottscamplibrary.org/events', city: 'Potts Camp', state: 'MS', zipCode: '00000', county: 'Potts Camp County'},
  { name: 'Prentiss Public Library', url: 'https://www.prentisslibrary.org', eventsUrl: 'https://www.prentisslibrary.org/events', city: 'Prentiss', state: 'MS', zipCode: '00000', county: 'Prentiss County'},
  { name: 'Puckett Public Library', url: 'https://www.puckettlibrary.org', eventsUrl: 'https://www.puckettlibrary.org/events', city: 'Puckett', state: 'MS', zipCode: '00000', county: 'Puckett County'},
  { name: 'Lamar County Library System', url: 'https://www.purvislibrary.org', eventsUrl: 'https://www.purvislibrary.org/events', city: 'Purvis', state: 'MS', zipCode: '39475', county: 'Purvis County'},
  { name: 'Clarke County-Quitman Public Library', url: 'https://www.quitmanlibrary.org', eventsUrl: 'https://www.quitmanlibrary.org/events', city: 'Quitman', state: 'MS', zipCode: '00000', county: 'Quitman County'},
  { name: 'Floyd J. Robinson Memorial Library', url: 'https://www.raleighlibrary.org', eventsUrl: 'https://www.raleighlibrary.org/events', city: 'Raleigh', state: 'MS', zipCode: '00000', county: 'Raleigh County'},
  { name: 'Raymond Public Library', url: 'https://www.raymondlibrary.org', eventsUrl: 'https://www.raymondlibrary.org/events', city: 'Raymond', state: 'MS', zipCode: '00000', county: 'Raymond County'},
  { name: 'Richland Public Library', url: 'https://www.richlandlibrary.org', eventsUrl: 'https://www.richlandlibrary.org/events', city: 'Richland', state: 'MS', zipCode: '00000', county: 'Richland County'},
  { name: 'Elsie E. Jurgens Memorial Library', url: 'https://www.ridgelandlibrary.org', eventsUrl: 'https://www.ridgelandlibrary.org/events', city: 'Ridgeland', state: 'MS', zipCode: '00000', county: 'Ridgeland County'},
  { name: 'Rienzi Public Library', url: 'https://www.rienzilibrary.org', eventsUrl: 'https://www.rienzilibrary.org/events', city: 'Rienzi', state: 'MS', zipCode: '00000', county: 'Rienzi County'},
  { name: 'Ripley Public Library', url: 'https://www.ripleylibrary.org', eventsUrl: 'https://www.ripleylibrary.org/events', city: 'Ripley', state: 'MS', zipCode: '00000', county: 'Ripley County'},
  { name: 'Sharkey-Issaquena County Library', url: 'https://www.rollingforklibrary.org', eventsUrl: 'https://www.rollingforklibrary.org/events', city: 'Rolling Fork', state: 'MS', zipCode: '39159', county: 'Rolling Fork County'},
  { name: 'Rosedale Public Library', url: 'https://www.rosedalelibrary.org', eventsUrl: 'https://www.rosedalelibrary.org/events', city: 'Rosedale', state: 'MS', zipCode: '00000', county: 'Rosedale County'},
  { name: 'Horace Stansel Memorial Library', url: 'https://www.rulevillelibrary.org', eventsUrl: 'https://www.rulevillelibrary.org/events', city: 'Ruleville', state: 'MS', zipCode: '00000', county: 'Ruleville County'},
  { name: 'Sandhill Public Library', url: 'https://www.sandhilllibrary.org', eventsUrl: 'https://www.sandhilllibrary.org/events', city: 'Sand Hill', state: 'MS', zipCode: '00000', county: 'Sand Hill County'},
  { name: 'Sandersville Public Library', url: 'https://www.sandersvillelibrary.org', eventsUrl: 'https://www.sandersvillelibrary.org/events', city: 'Sandersville', state: 'MS', zipCode: '00000', county: 'Sandersville County'},
  { name: 'Sardis Public Library', url: 'https://www.sardislibrary.org', eventsUrl: 'https://www.sardislibrary.org/events', city: 'Sardis', state: 'MS', zipCode: '00000', county: 'Sardis County'},
  { name: 'Saucier Childrens Library', url: 'https://www.saucierlibrary.org', eventsUrl: 'https://www.saucierlibrary.org/events', city: 'Saucier', state: 'MS', zipCode: '39574', county: 'Saucier County'},
  { name: 'Scooba Public Library', url: 'https://www.scoobalibrary.org', eventsUrl: 'https://www.scoobalibrary.org/events', city: 'Scooba', state: 'MS', zipCode: '00000', county: 'Scooba County'},
  { name: 'Sebastopol Public Library', url: 'https://www.sebastopollibrary.org', eventsUrl: 'https://www.sebastopollibrary.org/events', city: 'Sebastopol', state: 'MS', zipCode: '00000', county: 'Sebastopol County'},
  { name: 'Conner-Graham Memorial Library', url: 'https://www.seminarylibrary.org', eventsUrl: 'https://www.seminarylibrary.org/events', city: 'Seminary', state: 'MS', zipCode: '00000', county: 'Seminary County'},
  { name: 'Senatobia Public Library', url: 'https://www.senatobialibrary.org', eventsUrl: 'https://www.senatobialibrary.org/events', city: 'Senatobia', state: 'MS', zipCode: '00000', county: 'Senatobia County'},
  { name: 'Field Memorial Library', url: 'https://www.shawlibrary.org', eventsUrl: 'https://www.shawlibrary.org/events', city: 'Shaw', state: 'MS', zipCode: '00000', county: 'Shaw County'},
  { name: 'Dr. Robert T. Hollingsworth Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'MS', zipCode: '00000', county: 'Shelby County'},
  { name: 'Sherman Library', url: 'https://www.shermanlibrary.org', eventsUrl: 'https://www.shermanlibrary.org/events', city: 'Sherman', state: 'MS', zipCode: '00000', county: 'Sherman County'},
  { name: 'Shubuta Public Library', url: 'https://www.shubutalibrary.org', eventsUrl: 'https://www.shubutalibrary.org/events', city: 'Shubuta', state: 'MS', zipCode: '00000', county: 'Shubuta County'},
  { name: 'Vista J. Daniel Memorial Library', url: 'https://www.shuqualaklibrary.org', eventsUrl: 'https://www.shuqualaklibrary.org/events', city: 'Shuqualak', state: 'MS', zipCode: '00000', county: 'Shuqualak County'},
  { name: 'Sledge Public Library', url: 'https://www.sledgelibrary.org', eventsUrl: 'https://www.sledgelibrary.org/events', city: 'Sledge', state: 'MS', zipCode: '00000', county: 'Sledge County'},
  { name: 'M. R. Davis Public Library', url: 'https://www.southavenlibrary.org', eventsUrl: 'https://www.southavenlibrary.org/events', city: 'Southaven', state: 'MS', zipCode: '00000', county: 'Southaven County'},
  { name: 'State Line Public Library', url: 'https://www.statelinelibrary.org', eventsUrl: 'https://www.statelinelibrary.org/events', city: 'State Line', state: 'MS', zipCode: '00000', county: 'State Line County'},
  { name: 'Stonewall Public Library', url: 'https://www.stonewalllibrary.org', eventsUrl: 'https://www.stonewalllibrary.org/events', city: 'Stonewall', state: 'MS', zipCode: '00000', county: 'Stonewall County'},
  { name: 'Sturgis Public Library', url: 'https://www.sturgislibrary.org', eventsUrl: 'https://www.sturgislibrary.org/events', city: 'Sturgis', state: 'MS', zipCode: '00000', county: 'Sturgis County'},
  { name: 'L. R. Boyer Memorial Library', url: 'https://www.sumralllibrary.org', eventsUrl: 'https://www.sumralllibrary.org/events', city: 'Sumrall', state: 'MS', zipCode: '00000', county: 'Sumrall County'},
  { name: 'Evon A. Ford Memorial Library', url: 'https://www.taylorsvillelibrary.org', eventsUrl: 'https://www.taylorsvillelibrary.org/events', city: 'Taylorsville', state: 'MS', zipCode: '00000', county: 'Taylorsville County'},
  { name: 'Tchula Public Library', url: 'https://www.tchulalibrary.org', eventsUrl: 'https://www.tchulalibrary.org/events', city: 'Tchula', state: 'MS', zipCode: '00000', county: 'Tchula County'},
  { name: 'Ella Bess Austin Library', url: 'https://www.terrylibrary.org', eventsUrl: 'https://www.terrylibrary.org/events', city: 'Terry', state: 'MS', zipCode: '00000', county: 'Terry County'},
  { name: 'Margaret Mcrae Memorial Library', url: 'https://www.tishomingolibrary.org', eventsUrl: 'https://www.tishomingolibrary.org/events', city: 'Tishomingo', state: 'MS', zipCode: '00000', county: 'Tishomingo County'},
  { name: 'Robert C. Irwin Public Library', url: 'https://www.tunicalibrary.org', eventsUrl: 'https://www.tunicalibrary.org/events', city: 'Tunica', state: 'MS', zipCode: '00000', county: 'Tunica County'},
  { name: 'Tutwiler Branch Library', url: 'https://www.tutwilerlibrary.org', eventsUrl: 'https://www.tutwilerlibrary.org/events', city: 'Tutwiler', state: 'MS', zipCode: '00000', county: 'Tutwiler County'},
  { name: 'Walthall County Library', url: 'https://www.tylertownlibrary.org', eventsUrl: 'https://www.tylertownlibrary.org/events', city: 'Tylertown', state: 'MS', zipCode: '00000', county: 'Tylertown County'},
  { name: 'Kemper-Newton Regional Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'MS', zipCode: '39365', county: 'Union County'},
  { name: 'Evelyn Taylor Majure Library', url: 'https://www.uticalibrary.org', eventsUrl: 'https://www.uticalibrary.org/events', city: 'Utica', state: 'MS', zipCode: '00000', county: 'Utica County'},
  { name: 'Vaiden Public Library', url: 'https://www.vaidenlibrary.org', eventsUrl: 'https://www.vaidenlibrary.org/events', city: 'Vaiden', state: 'MS', zipCode: '00000', county: 'Vaiden County'},
  { name: 'Vancleave Public Library', url: 'https://www.vancleavelibrary.org', eventsUrl: 'https://www.vancleavelibrary.org/events', city: 'Vancleave', state: 'MS', zipCode: '00000', county: 'Vancleave County'},
  { name: 'J. L. Edmondson Memorial Library', url: 'https://www.vardamanlibrary.org', eventsUrl: 'https://www.vardamanlibrary.org/events', city: 'Vardaman', state: 'MS', zipCode: '00000', county: 'Vardaman County'},
  { name: 'Walls Public Library', url: 'https://www.wallslibrary.org', eventsUrl: 'https://www.wallslibrary.org/events', city: 'Walls', state: 'MS', zipCode: '00000', county: 'Walls County'},
  { name: 'Chalybeate Public Library', url: 'https://www.walnutlibrary.org', eventsUrl: 'https://www.walnutlibrary.org/events', city: 'Walnut', state: 'MS', zipCode: '00000', county: 'Walnut County'},
  { name: 'Walnut Grove Public Library', url: 'https://www.walnutgrovelibrary.org', eventsUrl: 'https://www.walnutgrovelibrary.org/events', city: 'Walnut Grove', state: 'MS', zipCode: '00000', county: 'Walnut Grove County'},
  { name: 'Blackmur Memorial Library', url: 'https://www.watervalleylibrary.org', eventsUrl: 'https://www.watervalleylibrary.org/events', city: 'Water Valley', state: 'MS', zipCode: '38965', county: 'Water Valley County'},
  { name: 'Waveland Library', url: 'https://www.wavelandlibrary.org', eventsUrl: 'https://www.wavelandlibrary.org/events', city: 'Waveland', state: 'MS', zipCode: '00000', county: 'Waveland County'},
  { name: 'Waynesboro-Wayne County Library System', url: 'https://www.waynesborolibrary.org', eventsUrl: 'https://www.waynesborolibrary.org/events', city: 'Waynesboro', state: 'MS', zipCode: '39367', county: 'Waynesboro County'},
  { name: 'Weir Public Library', url: 'https://www.weirlibrary.org', eventsUrl: 'https://www.weirlibrary.org/events', city: 'Weir', state: 'MS', zipCode: '00000', county: 'Weir County'},
  { name: 'Longie Dale Hamilton Memorial Library', url: 'https://www.wessonlibrary.org', eventsUrl: 'https://www.wessonlibrary.org/events', city: 'Wesson', state: 'MS', zipCode: '00000', county: 'Wesson County'},
  { name: 'West Public Library', url: 'https://www.westlibrary.org', eventsUrl: 'https://www.westlibrary.org/events', city: 'West', state: 'MS', zipCode: '00000', county: 'West County'},
  { name: 'Stone County Library', url: 'https://www.wigginslibrary.org', eventsUrl: 'https://www.wigginslibrary.org/events', city: 'Wiggins', state: 'MS', zipCode: '00000', county: 'Wiggins County'},
  { name: 'Winona-Montgomery County Library', url: 'https://www.winonalibrary.org', eventsUrl: 'https://www.winonalibrary.org/events', city: 'Winona', state: 'MS', zipCode: '00000', county: 'Winona County'},
  { name: 'Woodville Public Library', url: 'https://www.woodvillelibrary.org', eventsUrl: 'https://www.woodvillelibrary.org/events', city: 'Woodville', state: 'MS', zipCode: '00000', county: 'Woodville County'},
  { name: 'B.S. Ricks Memorial Library', url: 'https://www.yazoocitylibrary.org', eventsUrl: 'https://www.yazoocitylibrary.org/events', city: 'Yazoo City', state: 'MS', zipCode: '00000', county: 'Yazoo City County'}

];

const SCRAPER_NAME = 'wordpress-MS';

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
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = ['[class*="event"]', '[class*="program"]', 'article', '.post'];
        const foundElements = new Set();

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);
            try {
              const title = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], a');
              const date = card.querySelector('[class*="date"], time');
              const desc = card.querySelector('[class*="description"], p');
              const link = card.querySelector('a[href]');
              const ageEl = [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (title && title.textContent.trim()) {
                events.push({
                  title: title.textContent.trim(),
                  date: date ? date.textContent.trim() : '',
                  description: desc ? desc.textContent.trim() : '',
                  url: link ? link.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                });
              }
            } catch (e) {}
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return evt.date || evt.description;
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
            state: 'MS',
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
    state: 'MS',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  const events = await scrapeGenericEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMSCloudFunction() {
  console.log('☁️ Running WordPress MS as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MS', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-MS', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMSCloudFunction };
