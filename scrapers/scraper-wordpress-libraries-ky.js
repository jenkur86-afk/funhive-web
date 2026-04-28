const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Kentucky Public Libraries Scraper
 * State: KY
 * Coverage: All Kentucky Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Louisville Free Public Library', url: 'https://www.lfpl.org', eventsUrl: 'https://www.lfpl.org/events', city: 'Louisville', state: 'KY', zipCode: '40203', county: 'Louisville County'},
  { name: 'Lexington Public Library', url: 'https://www.lexpublib.org', eventsUrl: 'https://www.lexpublib.org/events', city: 'Lexington', state: 'KY', zipCode: '40507', county: 'Lexington County'},
  { name: 'Kenton County Public Library', url: 'https://www.kentonlibrary.org', eventsUrl: 'https://www.kentonlibrary.org/events', city: 'Covington', state: 'KY', zipCode: '41011', county: 'Covington County'},
  { name: 'Campbell County Public Library', url: 'https://www.cc-pl.org', eventsUrl: 'https://www.cc-pl.org/events', city: 'Cold Spring', state: 'KY', zipCode: '41076', county: 'Cold Spring County'},
  // Regional Libraries
  { name: 'Boone County Public Library', url: 'https://www.bcpl.org', eventsUrl: 'https://www.bcpl.org/events', city: 'Burlington', state: 'KY', zipCode: '41005', county: 'Burlington County'},
  { name: 'Warren County Public Library', url: 'https://www.warrenpl.org', eventsUrl: 'https://www.warrenpl.org/events', city: 'Bowling Green', state: 'KY', zipCode: '42101', county: 'Bowling Green County'},
  { name: 'Daviess County Public Library', url: 'https://www.dcplibrary.org', eventsUrl: 'https://www.dcplibrary.org/events', city: 'Owensboro', state: 'KY', zipCode: '42301', county: 'Owensboro County'},
  { name: 'McCracken County Public Library', url: 'https://www.mclib.net', eventsUrl: 'https://www.mclib.net/events', city: 'Paducah', state: 'KY', zipCode: '42001', county: 'Paducah County'},
  { name: 'Hardin County Public Library', url: 'https://www.hcpl.info', eventsUrl: 'https://www.hcpl.info/events', city: 'Elizabethtown', state: 'KY', zipCode: '42701', county: 'Elizabethtown County'},
  { name: 'Madison County Public Library', url: 'https://www.madisoncountylibrary.org', eventsUrl: 'https://www.madisoncountylibrary.org/events', city: 'Richmond', state: 'KY', zipCode: '40475' },
  { name: 'Oldham County Public Library', url: 'https://www.oldhampl.org', eventsUrl: 'https://www.oldhampl.org/events', city: 'La Grange', state: 'KY', zipCode: '40031', county: 'La Grange County'},
  { name: 'Bullitt County Public Library', url: 'https://www.bcplibrary.org', eventsUrl: 'https://www.bcplibrary.org/events', city: 'Shepherdsville', state: 'KY', zipCode: '40165', county: 'Shepherdsville County'},
  { name: 'Jessamine County Public Library', url: 'https://www.jesspublib.org', eventsUrl: 'https://www.jesspublib.org/events', city: 'Nicholasville', state: 'KY', zipCode: '40356', county: 'Nicholasville County'},
  { name: 'Scott County Public Library', url: 'https://www.scottpublib.org', eventsUrl: 'https://www.scottpublib.org/events', city: 'Georgetown', state: 'KY', zipCode: '40324', county: 'Georgetown County'},
  { name: 'Clark County Public Library', url: 'https://www.clarkbooks.org', eventsUrl: 'https://www.clarkbooks.org/events', city: 'Winchester', state: 'KY', zipCode: '40391', county: 'Winchester County'},
  { name: 'Hopkins County-Madisonville Public Library', url: 'https://www.hcmpl.org', eventsUrl: 'https://www.hcmpl.org/events', city: 'Madisonville', state: 'KY', zipCode: '42431', county: 'Madisonville County'},
  { name: 'Laurel County Public Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'London', state: 'KY', zipCode: '40741', county: 'London County'},
  { name: 'Pulaski County Public Library', url: 'https://www.pulaskilibrary.org', eventsUrl: 'https://www.pulaskilibrary.org/events', city: 'Somerset', state: 'KY', zipCode: '42501', county: 'Somerset County'},
  { name: 'Christian County Public Library', url: 'https://www.christiancountylibrary.org', eventsUrl: 'https://www.christiancountylibrary.org/events', city: 'Hopkinsville', state: 'KY', zipCode: '42240' },
  { name: 'Pike County Public Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pikeville', state: 'KY', zipCode: '41501', county: 'Pikeville County'},
  { name: 'Boyd County Public Library', url: 'https://www.boydpublib.org', eventsUrl: 'https://www.boydpublib.org/events', city: 'Ashland', state: 'KY', zipCode: '41101', county: 'Ashland County'},
  { name: 'Greenup County Public Library', url: 'https://www.greenuplibrary.org', eventsUrl: 'https://www.greenuplibrary.org/events', city: 'Greenup', state: 'KY', zipCode: '41144', county: 'Greenup County'},
  { name: 'Franklin County Public Library', url: 'https://www.frankfortlibrary.org', eventsUrl: 'https://www.frankfortlibrary.org/events', city: 'Frankfort', state: 'KY', zipCode: '40601', county: 'Frankfort County'},
  { name: 'Shelby County Public Library', url: 'https://www.shelbypl.org', eventsUrl: 'https://www.shelbypl.org/events', city: 'Shelbyville', state: 'KY', zipCode: '40065', county: 'Shelbyville County'},
  { name: 'Nelson County Public Library', url: 'https://www.nelsoncountylibrary.org', eventsUrl: 'https://www.nelsoncountylibrary.org/events', city: 'Bardstown', state: 'KY', zipCode: '40004' },
  { name: 'Henderson County Public Library', url: 'https://www.hcpl.org', eventsUrl: 'https://www.hcpl.org/events', city: 'Henderson', state: 'KY', zipCode: '42420', county: 'Henderson County'},
  { name: 'Graves County Public Library', url: 'https://www.graveslibrary.org', eventsUrl: 'https://www.graveslibrary.org/events', city: 'Mayfield', state: 'KY', zipCode: '42066', county: 'Mayfield County'},
  { name: 'Calloway County Public Library', url: 'https://www.callowaycountylibrary.org', eventsUrl: 'https://www.callowaycountylibrary.org/events', city: 'Murray', state: 'KY', zipCode: '42071' },
  { name: 'Muhlenberg County Public Libraries', url: 'https://www.muhlenberg.lib.ky.us', eventsUrl: 'https://www.muhlenberg.lib.ky.us/events', city: 'Greenville', state: 'KY', zipCode: '42345', county: 'Greenville County'},
  { name: 'Woodford County Library', url: 'https://www.woodfordlibrary.org', eventsUrl: 'https://www.woodfordlibrary.org/events', city: 'Versailles', state: 'KY', zipCode: '40383', county: 'Versailles County'},
  { name: 'Rowan County Public Library', url: 'https://www.rowancountylibrary.org', eventsUrl: 'https://www.rowancountylibrary.org/events', city: 'Morehead', state: 'KY', zipCode: '40351' },
  { name: 'Montgomery County Public Library', url: 'https://www.mcplib.org', eventsUrl: 'https://www.mcplib.org/events', city: 'Mount Sterling', state: 'KY', zipCode: '40353', county: 'Mount Sterling County'},
  { name: 'Grant County Public Library', url: 'https://www.grantlibrary.org', eventsUrl: 'https://www.grantlibrary.org/events', city: 'Williamstown', state: 'KY', zipCode: '41097', county: 'Williamstown County'},
  { name: 'Lincoln County Public Library', url: 'https://www.lincolncolibrary.org', eventsUrl: 'https://www.lincolncolibrary.org/events', city: 'Stanford', state: 'KY', zipCode: '40484', county: 'Stanford County'},
  { name: 'Marshall County Public Library', url: 'https://www.marshallcountylibrary.org', eventsUrl: 'https://www.marshallcountylibrary.org/events', city: 'Benton', state: 'KY', zipCode: '42025' },
  { name: 'Meade County Public Library', url: 'https://www.meadecountypl.org', eventsUrl: 'https://www.meadecountypl.org/events', city: 'Brandenburg', state: 'KY', zipCode: '40108' },
  { name: 'Taylor County Public Library', url: 'https://www.taylorcountylibrary.org', eventsUrl: 'https://www.taylorcountylibrary.org/events', city: 'Campbellsville', state: 'KY', zipCode: '42718' },
  { name: 'Whitley County Public Library', url: 'https://www.whitleylibrary.org', eventsUrl: 'https://www.whitleylibrary.org/events', city: 'Williamsburg', state: 'KY', zipCode: '40769', county: 'Williamsburg County'},
  { name: 'Floyd County Public Library', url: 'https://www.floydlibrary.org', eventsUrl: 'https://www.floydlibrary.org/events', city: 'Prestonsburg', state: 'KY', zipCode: '41653', county: 'Prestonsburg County'},
  { name: 'Johnson County Public Library', url: 'https://www.johnson.lib.ky.us', eventsUrl: 'https://www.johnson.lib.ky.us/events', city: 'Paintsville', state: 'KY', zipCode: '41240', county: 'Paintsville County'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlibrary.org', eventsUrl: 'https://www.knoxlibrary.org/events', city: 'Barbourville', state: 'KY', zipCode: '40906', county: 'Barbourville County'},
  { name: 'Bell County Public Library', url: 'https://www.bellcountylibrary.org', eventsUrl: 'https://www.bellcountylibrary.org/events', city: 'Middlesboro', state: 'KY', zipCode: '40965' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Clinton County Public Library', url: 'https://www.albanylibrary.org', eventsUrl: 'https://www.albanylibrary.org/events', city: 'Albany', state: 'KY', zipCode: '42602', county: 'Albany County'},
  { name: 'Auburn Branch', url: 'https://www.auburnlibrary.org', eventsUrl: 'https://www.auburnlibrary.org/events', city: 'Auburn', state: 'KY', zipCode: '00000', county: 'Auburn County'},
  { name: 'Lee County Public Library', url: 'https://www.beattyvillelibrary.org', eventsUrl: 'https://www.beattyvillelibrary.org/events', city: 'Beattyville', state: 'KY', zipCode: '41311', county: 'Beattyville County'},
  { name: 'Trimble County Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'KY', zipCode: '40006', county: 'Bedford County'},
  { name: 'Belfry Branch', url: 'https://www.belfrylibrary.org', eventsUrl: 'https://www.belfrylibrary.org/events', city: 'Belfry', state: 'KY', zipCode: '00000', county: 'Belfry County'},
  { name: 'Berea Branch Library', url: 'https://www.berealibrary.org', eventsUrl: 'https://www.berealibrary.org/events', city: 'Berea', state: 'KY', zipCode: '00000', county: 'Berea County'},
  { name: 'Blackey Public Library', url: 'https://www.blackeylibrary.org', eventsUrl: 'https://www.blackeylibrary.org/events', city: 'Blackey', state: 'KY', zipCode: '00000', county: 'Blackey County'},
  { name: 'Bloomfield Branch', url: 'https://www.bloomfieldlibrary.org', eventsUrl: 'https://www.bloomfieldlibrary.org/events', city: 'Bloomfield', state: 'KY', zipCode: '00000', county: 'Bloomfield County'},
  { name: 'Owsley County Public Library', url: 'https://www.boonevillelibrary.org', eventsUrl: 'https://www.boonevillelibrary.org/events', city: 'Booneville', state: 'KY', zipCode: '41314', county: 'Booneville County'},
  { name: 'Bracken County Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'KY', zipCode: '41004', county: 'Brooksville County'},
  { name: 'Edmonson County Public Library', url: 'https://www.brownsvillelibrary.org', eventsUrl: 'https://www.brownsvillelibrary.org/events', city: 'Brownsville', state: 'KY', zipCode: '42210', county: 'Brownsville County'},
  { name: 'Cumberland County Public Library', url: 'https://www.burkesvillelibrary.org', eventsUrl: 'https://www.burkesvillelibrary.org/events', city: 'Burkesville', state: 'KY', zipCode: '42717', county: 'Burkesville County'},
  { name: 'Burnside Branch', url: 'https://www.burnsidelibrary.org', eventsUrl: 'https://www.burnsidelibrary.org/events', city: 'Burnside', state: 'KY', zipCode: '00000', county: 'Burnside County'},
  { name: 'John L. Street Public Library', url: 'https://www.cadizlibrary.org', eventsUrl: 'https://www.cadizlibrary.org/events', city: 'Cadiz', state: 'KY', zipCode: '42211', county: 'Cadiz County'},
  { name: 'Calvert City Branch Library', url: 'https://www.calvertcitylibrary.org', eventsUrl: 'https://www.calvertcitylibrary.org/events', city: 'Calvert City', state: 'KY', zipCode: '00000', county: 'Calvert City County'},
  { name: 'Wolfe County Public Library', url: 'https://www.camptonlibrary.org', eventsUrl: 'https://www.camptonlibrary.org/events', city: 'Campton', state: 'KY', zipCode: '41301', county: 'Campton County'},
  { name: 'Nicholas County Public Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'KY', zipCode: '40311', county: 'Carlisle County'},
  { name: 'Carroll County Public Library District', url: 'https://www.carrolltonlibrary.org', eventsUrl: 'https://www.carrolltonlibrary.org/events', city: 'Carrollton', state: 'KY', zipCode: '41008', county: 'Carrollton County'},
  { name: 'Catlettsburg Branch', url: 'https://www.catlettsburglibrary.org', eventsUrl: 'https://www.catlettsburglibrary.org/events', city: 'Catlettsburg', state: 'KY', zipCode: '00000', county: 'Catlettsburg County'},
  { name: 'Central City Public Library', url: 'https://www.centralcitylibrary.org', eventsUrl: 'https://www.centralcitylibrary.org/events', city: 'Central City', state: 'KY', zipCode: '00000', county: 'Central City County'},
  { name: 'Hickman County Memorial Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'KY', zipCode: '42031', county: 'Clinton County'},
  { name: 'Cloverport Branch', url: 'https://www.cloverportlibrary.org', eventsUrl: 'https://www.cloverportlibrary.org/events', city: 'Cloverport', state: 'KY', zipCode: '00000', county: 'Cloverport County'},
  { name: 'Adair County Public Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'KY', zipCode: '42728', county: 'Columbia County'},
  { name: 'South Branch', url: 'https://www.corbinlibrary.org', eventsUrl: 'https://www.corbinlibrary.org/events', city: 'Corbin', state: 'KY', zipCode: '00000', county: 'Corbin County'},
  { name: 'Oldham County Public Library', url: 'https://www.crestwoodlibrary.org', eventsUrl: 'https://www.crestwoodlibrary.org/events', city: 'Crestwood', state: 'KY', zipCode: '40014', county: 'Crestwood County'},
  { name: 'Rebecca Caudill Public Library', url: 'https://www.cumberlandlibrary.org', eventsUrl: 'https://www.cumberlandlibrary.org/events', city: 'Cumberland', state: 'KY', zipCode: '00000', county: 'Cumberland County'},
  { name: 'Cynthiana-Harrison County Public Library', url: 'https://www.cynthianalibrary.org', eventsUrl: 'https://www.cynthianalibrary.org/events', city: 'Cynthiana', state: 'KY', zipCode: '41031', county: 'Cynthiana County'},
  { name: 'Boyle County Public Library', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'KY', zipCode: '40422', county: 'Danville County'},
  { name: 'Dawson Springs Branch', url: 'https://www.dawsonspringslibrary.org', eventsUrl: 'https://www.dawsonspringslibrary.org/events', city: 'Dawson Springs', state: 'KY', zipCode: '00000', county: 'Dawson Springs County'},
  { name: 'Webster County Public Library', url: 'https://www.dixonlibrary.org', eventsUrl: 'https://www.dixonlibrary.org/events', city: 'Dixon', state: 'KY', zipCode: '42409', county: 'Dixon County'},
  { name: 'Olde Town Branch', url: 'https://www.eastbernstadtlibrary.org', eventsUrl: 'https://www.eastbernstadtlibrary.org/events', city: 'East Bernstadt', state: 'KY', zipCode: '00000', county: 'East Bernstadt County'},
  { name: 'Lyon County Public Library', url: 'https://www.eddyvillelibrary.org', eventsUrl: 'https://www.eddyvillelibrary.org/events', city: 'Eddyville', state: 'KY', zipCode: '42038', county: 'Eddyville County'},
  { name: 'Metcalfe County Public Library', url: 'https://www.edmontonlibrary.org', eventsUrl: 'https://www.edmontonlibrary.org/events', city: 'Edmonton', state: 'KY', zipCode: '42129', county: 'Edmonton County'},
  { name: 'Hardin County Public Library', url: 'https://www.elizabethownlibrary.org', eventsUrl: 'https://www.elizabethownlibrary.org/events', city: 'Elizabethown', state: 'KY', zipCode: '42701', county: 'Elizabethown County'},
  { name: 'Elkhorn City Branch Library', url: 'https://www.elkhorncitylibrary.org', eventsUrl: 'https://www.elkhorncitylibrary.org/events', city: 'Elkhorn City', state: 'KY', zipCode: '00000', county: 'Elkhorn City County'},
  { name: 'Todd County Public Library', url: 'https://www.elktonlibrary.org', eventsUrl: 'https://www.elktonlibrary.org/events', city: 'Elkton', state: 'KY', zipCode: '42220', county: 'Elkton County'},
  { name: 'Henry County Public Library', url: 'https://www.eminencelibrary.org', eventsUrl: 'https://www.eminencelibrary.org/events', city: 'Eminence', state: 'KY', zipCode: '40019', county: 'Eminence County'},
  { name: 'Erlanger Branch', url: 'https://www.erlangerlibrary.org', eventsUrl: 'https://www.erlangerlibrary.org/events', city: 'Erlanger', state: 'KY', zipCode: '00000', county: 'Erlanger County'},
  { name: 'Pendleton County Public Library', url: 'https://www.falmouthlibrary.org', eventsUrl: 'https://www.falmouthlibrary.org/events', city: 'Falmouth', state: 'KY', zipCode: '41040', county: 'Falmouth County'},
  { name: 'Flatwoods Branch', url: 'https://www.flatwoodslibrary.org', eventsUrl: 'https://www.flatwoodslibrary.org/events', city: 'Flatwoods', state: 'KY', zipCode: '00000', county: 'Flatwoods County'},
  { name: 'Fleming County Public Library', url: 'https://www.flemingsburglibrary.org', eventsUrl: 'https://www.flemingsburglibrary.org/events', city: 'Flemingsburg', state: 'KY', zipCode: '41041', county: 'Flemingsburg County'},
  { name: 'Florence Branch', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'KY', zipCode: '00000', county: 'Florence County'},
  { name: 'Philip N. Carrico Branch', url: 'https://www.fortthomaslibrary.org', eventsUrl: 'https://www.fortthomaslibrary.org/events', city: 'Fort Thomas', state: 'KY', zipCode: '00000', county: 'Fort Thomas County'},
  { name: 'Goodnight Memorial Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'KY', zipCode: '42134', county: 'Franklin County'},
  { name: 'Menifee County Public Library', url: 'https://www.frenchburglibrary.org', eventsUrl: 'https://www.frenchburglibrary.org/events', city: 'Frenchburg', state: 'KY', zipCode: '40322', county: 'Frenchburg County'},
  { name: 'Fulton Public Library', url: 'https://www.fultonlibrary.org', eventsUrl: 'https://www.fultonlibrary.org/events', city: 'Fulton', state: 'KY', zipCode: '42041', county: 'Fulton County'},
  { name: 'Mary Wood Weldon Memorial Public Library', url: 'https://www.glasgowlibrary.org', eventsUrl: 'https://www.glasgowlibrary.org/events', city: 'Glasgow', state: 'KY', zipCode: '42141', county: 'Glasgow County'},
  { name: 'Mahan-Oldham County Library', url: 'https://www.goshenlibrary.org', eventsUrl: 'https://www.goshenlibrary.org/events', city: 'Goshen', state: 'KY', zipCode: '00000', county: 'Goshen County'},
  { name: 'Green County Public Library', url: 'https://www.greensburglibrary.org', eventsUrl: 'https://www.greensburglibrary.org/events', city: 'Greensburg', state: 'KY', zipCode: '42743', county: 'Greensburg County'},
  { name: 'Hardin Branch', url: 'https://www.hardinlibrary.org', eventsUrl: 'https://www.hardinlibrary.org/events', city: 'Hardin', state: 'KY', zipCode: '00000', county: 'Hardin County'},
  { name: 'Breckinridge County Public Library', url: 'https://www.hardinsburglibrary.org', eventsUrl: 'https://www.hardinsburglibrary.org/events', city: 'Hardinsburg', state: 'KY', zipCode: '40143', county: 'Hardinsburg County'},
  { name: 'Harlan County Public Library', url: 'https://www.harlanlibrary.org', eventsUrl: 'https://www.harlanlibrary.org/events', city: 'Harlan', state: 'KY', zipCode: '40831', county: 'Harlan County'},
  { name: 'Mercer County Public Library', url: 'https://www.harrodsburglibrary.org', eventsUrl: 'https://www.harrodsburglibrary.org/events', city: 'Harrodsburg', state: 'KY', zipCode: '40330', county: 'Harrodsburg County'},
  { name: 'Ohio County Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'KY', zipCode: '42347', county: 'Hartford County'},
  { name: 'Hancock County Public Library', url: 'https://www.hawesvillelibrary.org', eventsUrl: 'https://www.hawesvillelibrary.org/events', city: 'Hawesville', state: 'KY', zipCode: '42348', county: 'Hawesville County'},
  { name: 'Perry County Public Library', url: 'https://www.hazardlibrary.org', eventsUrl: 'https://www.hazardlibrary.org/events', city: 'Hazard', state: 'KY', zipCode: '41701', county: 'Hazard County'},
  { name: 'Lents Branch', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'KY', zipCode: '00000', county: 'Hebron County'},
  { name: 'Hickman Branch', url: 'https://www.hickmanlibrary.org', eventsUrl: 'https://www.hickmanlibrary.org/events', city: 'Hickman', state: 'KY', zipCode: '00000', county: 'Hickman County'},
  { name: 'Knott County Public Library', url: 'https://www.hindmanlibrary.org', eventsUrl: 'https://www.hindmanlibrary.org/events', city: 'Hindman', state: 'KY', zipCode: '41822', county: 'Hindman County'},
  { name: 'Larue County Public Library', url: 'https://www.hodgenvillelibrary.org', eventsUrl: 'https://www.hodgenvillelibrary.org/events', city: 'Hodgenville', state: 'KY', zipCode: '42748', county: 'Hodgenville County'},
  { name: 'Leslie County Public Library', url: 'https://www.hydenlibrary.org', eventsUrl: 'https://www.hydenlibrary.org/events', city: 'Hyden', state: 'KY', zipCode: '41749', county: 'Hyden County'},
  { name: 'William E. Durr Branch', url: 'https://www.independencelibrary.org', eventsUrl: 'https://www.independencelibrary.org/events', city: 'Independence', state: 'KY', zipCode: '00000', county: 'Independence County'},
  { name: 'Martin County Public Library', url: 'https://www.inezlibrary.org', eventsUrl: 'https://www.inezlibrary.org/events', city: 'Inez', state: 'KY', zipCode: '41224', county: 'Inez County'},
  { name: 'Estill County Public Library', url: 'https://www.irvinelibrary.org', eventsUrl: 'https://www.irvinelibrary.org/events', city: 'Irvine', state: 'KY', zipCode: '40336', county: 'Irvine County'},
  { name: 'Irvington Branch', url: 'https://www.irvingtonlibrary.org', eventsUrl: 'https://www.irvingtonlibrary.org/events', city: 'Irvington', state: 'KY', zipCode: '00000', county: 'Irvington County'},
  { name: 'Breathitt County Public Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'KY', zipCode: '41339', county: 'Jackson County'},
  { name: 'Russell County Public Library District', url: 'https://www.jamestownlibrary.org', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'KY', zipCode: '42629', county: 'Jamestown County'},
  { name: 'Jenkins Public Library', url: 'https://www.jenkinslibrary.org', eventsUrl: 'https://www.jenkinslibrary.org/events', city: 'Jenkins', state: 'KY', zipCode: '00000', county: 'Jenkins County'},
  { name: 'Garrard County Public Library', url: 'https://www.lancasterlibrary.org', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'KY', zipCode: '40444', county: 'Lancaster County'},
  { name: 'Anderson County Public Library', url: 'https://www.lawrenceburglibrary.org', eventsUrl: 'https://www.lawrenceburglibrary.org/events', city: 'Lawrenceburg', state: 'KY', zipCode: '40342', county: 'Lawrenceburg County'},
  { name: 'Marion County Public Library', url: 'https://www.lebanonlibrary.org', eventsUrl: 'https://www.lebanonlibrary.org/events', city: 'Lebanon', state: 'KY', zipCode: '40033', county: 'Lebanon County'},
  { name: 'Lebanon Junction Branch Library', url: 'https://www.lebanonjunctionlibrary.org', eventsUrl: 'https://www.lebanonjunctionlibrary.org/events', city: 'Lebanon Junction', state: 'KY', zipCode: '00000', county: 'Lebanon Junction County'},
  { name: 'Grayson County Public Library', url: 'https://www.leitchfieldlibrary.org', eventsUrl: 'https://www.leitchfieldlibrary.org/events', city: 'Leitchfield', state: 'KY', zipCode: '42754', county: 'Leitchfield County'},
  { name: 'Lewisburg Branch', url: 'https://www.lewisburglibrary.org', eventsUrl: 'https://www.lewisburglibrary.org/events', city: 'Lewisburg', state: 'KY', zipCode: '00000', county: 'Lewisburg County'},
  { name: 'Lewisport Branch', url: 'https://www.lewisportlibrary.org', eventsUrl: 'https://www.lewisportlibrary.org/events', city: 'Lewisport', state: 'KY', zipCode: '00000', county: 'Lewisport County'},
  { name: 'Casey County Public Library', url: 'https://www.libertylibrary.org', eventsUrl: 'https://www.libertylibrary.org/events', city: 'Liberty', state: 'KY', zipCode: '42539', county: 'Liberty County'},
  { name: 'Lawrence County Public Library', url: 'https://www.louisalibrary.org', eventsUrl: 'https://www.louisalibrary.org/events', city: 'Louisa', state: 'KY', zipCode: '41230', county: 'Louisa County'},
  { name: 'Rufus M. Reed Public Library', url: 'https://www.lovelylibrary.org', eventsUrl: 'https://www.lovelylibrary.org/events', city: 'Lovely', state: 'KY', zipCode: '41231', county: 'Lovely County'},
  { name: 'Clay County Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'KY', zipCode: '40962', county: 'Manchester County'},
  { name: 'Crittenden County Public Library', url: 'https://www.marionlibrary.org', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'KY', zipCode: '42064', county: 'Marion County'},
  { name: 'Mason County Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'KY', zipCode: '41056', county: 'Maysville County'},
  { name: 'Jackson County Public Library', url: 'https://www.mckeelibrary.org', eventsUrl: 'https://www.mckeelibrary.org/events', city: 'Mckee', state: 'KY', zipCode: '40447', county: 'Mckee County'},
  { name: 'Wayne County Public Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'KY', zipCode: '42633', county: 'Monticello County'},
  { name: 'Union County Public Library District', url: 'https://www.morganfieldlibrary.org', eventsUrl: 'https://www.morganfieldlibrary.org/events', city: 'Morganfield', state: 'KY', zipCode: '42437', county: 'Morganfield County'},
  { name: 'Butler County Public Library', url: 'https://www.morgantownlibrary.org', eventsUrl: 'https://www.morgantownlibrary.org/events', city: 'Morgantown', state: 'KY', zipCode: '42261', county: 'Morgantown County'},
  { name: 'Robertson County Public Library', url: 'https://www.mountolivetlibrary.org', eventsUrl: 'https://www.mountolivetlibrary.org/events', city: 'Mount Olivet', state: 'KY', zipCode: '41064', county: 'Mount Olivet County'},
  { name: 'Rockcastle County Public Library', url: 'https://www.mountvernonlibrary.org', eventsUrl: 'https://www.mountvernonlibrary.org/events', city: 'Mount Vernon', state: 'KY', zipCode: '40456', county: 'Mount Vernon County'},
  { name: 'Mount Washington Branch Library', url: 'https://www.mountwashingtonlibrary.org', eventsUrl: 'https://www.mountwashingtonlibrary.org/events', city: 'Mount Washington', state: 'KY', zipCode: '00000', county: 'Mount Washington County'},
  { name: 'Hart County Public Library', url: 'https://www.munfordvillelibrary.org', eventsUrl: 'https://www.munfordvillelibrary.org/events', city: 'Munfordville', state: 'KY', zipCode: '42765', county: 'Munfordville County'},
  { name: 'Nancy Branch', url: 'https://www.nancylibrary.org', eventsUrl: 'https://www.nancylibrary.org/events', city: 'Nancy', state: 'KY', zipCode: '00000', county: 'Nancy County'},
  { name: 'Lillian Webb Memorial Branch', url: 'https://www.neonlibrary.org', eventsUrl: 'https://www.neonlibrary.org/events', city: 'Neon', state: 'KY', zipCode: '00000', county: 'Neon County'},
  { name: 'New Haven Branch', url: 'https://www.newhavenlibrary.org', eventsUrl: 'https://www.newhavenlibrary.org/events', city: 'New Haven', state: 'KY', zipCode: '00000', county: 'New Haven County'},
  { name: 'Newport Branch', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'KY', zipCode: '00000', county: 'Newport County'},
  { name: 'Owen County Public Library District', url: 'https://www.owentonlibrary.org', eventsUrl: 'https://www.owentonlibrary.org/events', city: 'Owenton', state: 'KY', zipCode: '40359', county: 'Owenton County'},
  { name: 'Bath County Memorial Library', url: 'https://www.owingsvillelibrary.org', eventsUrl: 'https://www.owingsvillelibrary.org/events', city: 'Owingsville', state: 'KY', zipCode: '40360', county: 'Owingsville County'},
  { name: 'Paris-Bourbon County Library', url: 'https://www.parislibrary.org', eventsUrl: 'https://www.parislibrary.org/events', city: 'Paris', state: 'KY', zipCode: '40361', county: 'Paris County'},
  { name: 'Phelps Branch', url: 'https://www.phelpslibrary.org', eventsUrl: 'https://www.phelpslibrary.org/events', city: 'Phelps', state: 'KY', zipCode: '00000', county: 'Phelps County'},
  { name: 'George Coon Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'KY', zipCode: '42445', county: 'Princeton County'},
  { name: 'Providence Branch', url: 'https://www.providencelibrary.org', eventsUrl: 'https://www.providencelibrary.org/events', city: 'Providence', state: 'KY', zipCode: '00000', county: 'Providence County'},
  { name: 'North Branch', url: 'https://www.radclifflibrary.org', eventsUrl: 'https://www.radclifflibrary.org/events', city: 'Radcliff', state: 'KY', zipCode: '00000', county: 'Radcliff County'},
  { name: 'Russell Springs Branch Library', url: 'https://www.russellspringslibrary.org', eventsUrl: 'https://www.russellspringslibrary.org/events', city: 'Russell Springs', state: 'KY', zipCode: '00000', county: 'Russell Springs County'},
  { name: 'Logan County Public Library', url: 'https://www.russellvillelibrary.org', eventsUrl: 'https://www.russellvillelibrary.org/events', city: 'Russellville', state: 'KY', zipCode: '42276', county: 'Russellville County'},
  { name: 'Magoffin County Public Library', url: 'https://www.salyersvillelibrary.org', eventsUrl: 'https://www.salyersvillelibrary.org/events', city: 'Salyersville', state: 'KY', zipCode: '41465', county: 'Salyersville County'},
  { name: 'Elliott County Public Library', url: 'https://www.sandyhooklibrary.org', eventsUrl: 'https://www.sandyhooklibrary.org/events', city: 'Sandy Hook', state: 'KY', zipCode: '41171', county: 'Sandy Hook County'},
  { name: 'Science Hill Branch', url: 'https://www.sciencehilllibrary.org', eventsUrl: 'https://www.sciencehilllibrary.org/events', city: 'Science Hill', state: 'KY', zipCode: '00000', county: 'Science Hill County'},
  { name: 'Allen County Public Library', url: 'https://www.scottsvillelibrary.org', eventsUrl: 'https://www.scottsvillelibrary.org/events', city: 'Scottsville', state: 'KY', zipCode: '42164', county: 'Scottsville County'},
  { name: 'Livingston County Public Library', url: 'https://www.smithlandlibrary.org', eventsUrl: 'https://www.smithlandlibrary.org/events', city: 'Smithland', state: 'KY', zipCode: '42081', county: 'Smithland County'},
  { name: 'Smiths Grove Branch', url: 'https://www.smithsgrovelibrary.org', eventsUrl: 'https://www.smithsgrovelibrary.org/events', city: 'Smiths Grove', state: 'KY', zipCode: '00000', county: 'Smiths Grove County'},
  { name: 'Mckell Branch', url: 'https://www.southshorelibrary.org', eventsUrl: 'https://www.southshorelibrary.org/events', city: 'South Shore', state: 'KY', zipCode: '00000', county: 'South Shore County'},
  { name: 'Washington County Public Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'KY', zipCode: '40069', county: 'Springfield County'},
  { name: 'Powell County Public Library', url: 'https://www.stantonlibrary.org', eventsUrl: 'https://www.stantonlibrary.org/events', city: 'Stanton', state: 'KY', zipCode: '40380', county: 'Stanton County'},
  { name: 'Sturgis Branch', url: 'https://www.sturgislibrary.org', eventsUrl: 'https://www.sturgislibrary.org/events', city: 'Sturgis', state: 'KY', zipCode: '00000', county: 'Sturgis County'},
  { name: 'Spencer County Public Library', url: 'https://www.taylorsvillelibrary.org', eventsUrl: 'https://www.taylorsvillelibrary.org/events', city: 'Taylorsville', state: 'KY', zipCode: '40071', county: 'Taylorsville County'},
  { name: 'William B. Harlan Memorial Library', url: 'https://www.tompkinsvillelibrary.org', eventsUrl: 'https://www.tompkinsvillelibrary.org/events', city: 'Tompkinsville', state: 'KY', zipCode: '42167', county: 'Tompkinsville County'},
  { name: 'Uniontown Branch', url: 'https://www.uniontownlibrary.org', eventsUrl: 'https://www.uniontownlibrary.org/events', city: 'Uniontown', state: 'KY', zipCode: '00000', county: 'Uniontown County'},
  { name: 'Lewis County Public Library', url: 'https://www.vanceburglibrary.org', eventsUrl: 'https://www.vanceburglibrary.org/events', city: 'Vanceburg', state: 'KY', zipCode: '41179', county: 'Vanceburg County'},
  { name: 'Vesta Roberts Johnson Memorial Library', url: 'https://www.virgielibrary.org', eventsUrl: 'https://www.virgielibrary.org/events', city: 'Virgie', state: 'KY', zipCode: '00000', county: 'Virgie County'},
  { name: 'Walton Branch', url: 'https://www.waltonlibrary.org', eventsUrl: 'https://www.waltonlibrary.org/events', city: 'Walton', state: 'KY', zipCode: '00000', county: 'Walton County'},
  { name: 'Gallatin County Public Library', url: 'https://www.warsawlibrary.org', eventsUrl: 'https://www.warsawlibrary.org/events', city: 'Warsaw', state: 'KY', zipCode: '41095', county: 'Warsaw County'},
  { name: 'Morgan County Public Library', url: 'https://www.westlibertylibrary.org', eventsUrl: 'https://www.westlibertylibrary.org/events', city: 'West Liberty', state: 'KY', zipCode: '41472', county: 'West Liberty County'},
  { name: 'Harry M. Caudill Memorial Library', url: 'https://www.whitesburglibrary.org', eventsUrl: 'https://www.whitesburglibrary.org/events', city: 'Whitesburg', state: 'KY', zipCode: '41858', county: 'Whitesburg County'},
  { name: 'Mccreary County Public Library District', url: 'https://www.whitleycitylibrary.org', eventsUrl: 'https://www.whitleycitylibrary.org/events', city: 'Whitley City', state: 'KY', zipCode: '42653', county: 'Whitley City County'},
  { name: 'Ballard-Carlislelivingston Public Library', url: 'https://www.wickliffelibrary.org', eventsUrl: 'https://www.wickliffelibrary.org/events', city: 'Wickliffe', state: 'KY', zipCode: '42087', county: 'Wickliffe County'}

];

const SCRAPER_NAME = 'wordpress-KY';

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
          '.post'
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
            state: 'KY',
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
    state: 'KY',
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
async function scrapeWordpressKYCloudFunction() {
  console.log('☁️ Running WordPress KY as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-KY', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-KY', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressKYCloudFunction };
