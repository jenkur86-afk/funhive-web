const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * New Hampshire Public Libraries Scraper
 * State: NH
 * Coverage: All New Hampshire Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Manchester City Library', url: 'https://www.manchester.lib.nh.us', eventsUrl: 'https://www.manchester.lib.nh.us/events', city: 'Manchester', state: 'NH', zipCode: '03101', county: 'Hillsborough County'},
  { name: 'Nashua Public Library', url: 'https://www.nashualibrary.org', eventsUrl: 'https://www.nashualibrary.org/events', city: 'Nashua', state: 'NH', zipCode: '03060', county: 'Hillsborough County'},
  { name: 'Concord Public Library', url: 'https://concordpubliclibrary.net', eventsUrl: 'https://concordpubliclibrary.net/events', city: 'Concord', state: 'NH', zipCode: '03301', county: 'Merrimack County'},
  { name: 'Dover Public Library', url: 'https://library.dover.nh.gov', eventsUrl: 'https://library.dover.nh.gov/events', city: 'Dover', state: 'NH', zipCode: '03820', county: 'Strafford County'},
  // Regional Libraries
  { name: 'Laconia Public Library', url: 'https://www.laconialibrary.org', eventsUrl: 'https://www.laconialibrary.org/events', city: 'Laconia', state: 'NH', zipCode: '03246', county: 'Belknap County'},
  { name: 'Derry Public Library', url: 'https://www.derrypl.org', eventsUrl: 'https://www.derrypl.org/events', city: 'Derry', state: 'NH', zipCode: '03038', county: 'Rockingham County'},
  { name: 'Hampton Lane Memorial Library', url: 'https://www.hampton.lib.nh.us', eventsUrl: 'https://www.hampton.lib.nh.us/events', city: 'Hampton', state: 'NH', zipCode: '03842', county: 'Rockingham County'},
  { name: 'Milford Wadleigh Memorial Library', url: 'https://www.wadleighlibrary.org', eventsUrl: 'https://www.wadleighlibrary.org/events', city: 'Milford', state: 'NH', zipCode: '03055', county: 'Hillsborough County'},
  { name: 'Exeter Public Library', url: 'https://www.exeterpl.org', eventsUrl: 'https://www.exeterpl.org/events', city: 'Exeter', state: 'NH', zipCode: '03833', county: 'Rockingham County'},
  { name: 'Peterborough Town Library', url: 'https://www.peterbororoughlibrary.org', eventsUrl: 'https://www.peterbororoughlibrary.org/events', city: 'Peterborough', state: 'NH', zipCode: '03458', county: 'Hillsborough County'},
  { name: 'Goffstown Public Library', url: 'https://www.goffstownlibrary.com', eventsUrl: 'https://www.goffstownlibrary.com/events', city: 'Goffstown', state: 'NH', zipCode: '03045', county: 'Hillsborough County'},
  { name: 'Bedford Public Library', url: 'https://www.bedfordnhlibrary.org', eventsUrl: 'https://www.bedfordnhlibrary.org/events', city: 'Bedford', state: 'NH', zipCode: '03110', county: 'Hillsborough County'},
  { name: 'Amherst Town Library', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'NH', zipCode: '03031', county: 'Hillsborough County'},
  { name: 'Windham Nesmith Library', url: 'https://www.nesmithlibrary.org', eventsUrl: 'https://www.nesmithlibrary.org/events', city: 'Windham', state: 'NH', zipCode: '03087', county: 'Rockingham County'},
  { name: 'Rochester Public Library', url: 'https://www.rfrpl.org', eventsUrl: 'https://www.rfrpl.org/events', city: 'Rochester', state: 'NH', zipCode: '03867', county: 'Strafford County'},
  { name: 'Lebanon Public Libraries', url: 'https://www.leblibrary.com', eventsUrl: 'https://www.leblibrary.com/events', city: 'Lebanon', state: 'NH', zipCode: '03766', county: 'Grafton County'},
  { name: 'Salem Kelley Library', url: 'https://www.ci.salem.nh.us/kelleylibrary', eventsUrl: 'https://www.ci.salem.nh.us/kelleylibrary/events', city: 'Salem', state: 'NH', zipCode: '03079', county: 'Rockingham County'},
  { name: 'Londonderry Leach Library', url: 'https://www.londonderrynh.org/leach-library', eventsUrl: 'https://www.londonderrynh.org/leach-library/events', city: 'Londonderry', state: 'NH', zipCode: '03053', county: 'Rockingham County'},
  { name: 'Hudson Rodgers Memorial Library', url: 'https://www.rodgerslibrary.org', eventsUrl: 'https://www.rodgerslibrary.org/events', city: 'Hudson', state: 'NH', zipCode: '03051', county: 'Hillsborough County'},
  { name: 'Hooksett Public Library', url: 'https://www.hooksettlibrary.org', eventsUrl: 'https://www.hooksettlibrary.org/events', city: 'Hooksett', state: 'NH', zipCode: '03106', county: 'Merrimack County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Acworth Silsby Free Library', url: 'https://www.acworthlibrary.org', eventsUrl: 'https://www.acworthlibrary.org/events', city: 'Acworth', state: 'NH', zipCode: '03601', county: 'Acworth County'},
  { name: 'Haynes Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'NH', zipCode: '03222', county: 'Alexandria County'},
  { name: 'Shedd-Porter Memorial Library', url: 'https://www.alsteadlibrary.org', eventsUrl: 'https://www.alsteadlibrary.org/events', city: 'Alstead', state: 'NH', zipCode: '03601', county: 'Alstead County'},
  { name: 'Gilman Library', url: 'https://www.altonlibrary.org', eventsUrl: 'https://www.altonlibrary.org/events', city: 'Alton', state: 'NH', zipCode: '03809', county: 'Alton County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'NH', zipCode: '03216', county: 'Andover County'},
  { name: 'James A. Tuttle Library', url: 'https://www.antrimlibrary.org', eventsUrl: 'https://www.antrimlibrary.org/events', city: 'Antrim', state: 'NH', zipCode: '03440', county: 'Antrim County'},
  { name: 'Ashland Town Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'NH', zipCode: '03217', county: 'Ashland County'},
  { name: 'Thayer Public Library', url: 'https://www.ashuelotlibrary.org', eventsUrl: 'https://www.ashuelotlibrary.org/events', city: 'Ashuelot', state: 'NH', zipCode: '03441', county: 'Ashuelot County'},
  { name: 'Kimball Library', url: 'https://www.atkinsonlibrary.org', eventsUrl: 'https://www.atkinsonlibrary.org/events', city: 'Atkinson', state: 'NH', zipCode: '03811', county: 'Atkinson County'},
  { name: 'Griffin Free Public Library', url: 'https://www.auburnlibrary.org', eventsUrl: 'https://www.auburnlibrary.org/events', city: 'Auburn', state: 'NH', zipCode: '03032', county: 'Auburn County'},
  { name: 'Barrington Public Library', url: 'https://www.barringtonlibrary.org', eventsUrl: 'https://www.barringtonlibrary.org/events', city: 'Barrington', state: 'NH', zipCode: '03825', county: 'Barrington County'},
  { name: 'Bartlett Public Library', url: 'https://www.bartlettlibrary.org', eventsUrl: 'https://www.bartlettlibrary.org/events', city: 'Bartlett', state: 'NH', zipCode: '03812', county: 'Bartlett County'},
  { name: 'Bath Public Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'NH', zipCode: '03740', county: 'Bath County'},
  { name: 'Belmont Public Library', url: 'https://www.belmontlibrary.org', eventsUrl: 'https://www.belmontlibrary.org/events', city: 'Belmont', state: 'NH', zipCode: '03220', county: 'Belmont County'},
  { name: 'G. E.P. Dodge Library', url: 'https://www.benningtonlibrary.org', eventsUrl: 'https://www.benningtonlibrary.org/events', city: 'Bennington', state: 'NH', zipCode: '00000', county: 'Bennington County'},
  { name: 'Berlin Public Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'NH', zipCode: '03570', county: 'Berlin County'},
  { name: 'Bethlehem Public Library', url: 'https://www.bethlehemlibrary.org', eventsUrl: 'https://www.bethlehemlibrary.org/events', city: 'Bethlehem', state: 'NH', zipCode: '03574', county: 'Bethlehem County'},
  { name: 'Boscawen Public Library', url: 'https://www.boscawenlibrary.org', eventsUrl: 'https://www.boscawenlibrary.org/events', city: 'Boscawen', state: 'NH', zipCode: '03303', county: 'Boscawen County'},
  { name: 'Baker Free Library', url: 'https://www.bowlibrary.org', eventsUrl: 'https://www.bowlibrary.org/events', city: 'Bow', state: 'NH', zipCode: '03304', county: 'Bow County'},
  { name: 'Brown Memorial Library', url: 'https://www.bradfordlibrary.org', eventsUrl: 'https://www.bradfordlibrary.org/events', city: 'Bradford', state: 'NH', zipCode: '03221', county: 'Bradford County'},
  { name: 'Mary E. Bartlett Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'NH', zipCode: '03833', county: 'Brentwood County'},
  { name: 'Bridgewater Public Library', url: 'https://www.bridgewaterlibrary.org', eventsUrl: 'https://www.bridgewaterlibrary.org/events', city: 'Bridgewater', state: 'NH', zipCode: '03264', county: 'Bridgewater County'},
  { name: 'Minot-Sleeper Library', url: 'https://www.bristollibrary.org', eventsUrl: 'https://www.bristollibrary.org/events', city: 'Bristol', state: 'NH', zipCode: '03222', county: 'Bristol County'},
  { name: 'Brookline Public Library', url: 'https://www.brooklinelibrary.org', eventsUrl: 'https://www.brooklinelibrary.org/events', city: 'Brookline', state: 'NH', zipCode: '03033', county: 'Brookline County'},
  { name: 'Campton Public Library', url: 'https://www.camptonlibrary.org', eventsUrl: 'https://www.camptonlibrary.org/events', city: 'Campton', state: 'NH', zipCode: '03223', county: 'Campton County'},
  { name: 'Canaan Town Library', url: 'https://www.canaanlibrary.org', eventsUrl: 'https://www.canaanlibrary.org/events', city: 'Canaan', state: 'NH', zipCode: '03741', county: 'Canaan County'},
  { name: 'Smyth Public Library', url: 'https://www.candialibrary.org', eventsUrl: 'https://www.candialibrary.org/events', city: 'Candia', state: 'NH', zipCode: '03034', county: 'Candia County'},
  { name: 'Elkins Library', url: 'https://www.canterburylibrary.org', eventsUrl: 'https://www.canterburylibrary.org/events', city: 'Canterbury', state: 'NH', zipCode: '03224', county: 'Canterbury County'},
  { name: 'Oscar Foss Memorial Library', url: 'https://www.centerbarnsteadlibrary.org', eventsUrl: 'https://www.centerbarnsteadlibrary.org/events', city: 'Center Barnstead', state: 'NH', zipCode: '03225', county: 'Center Barnstead County'},
  { name: 'James E. Nichols Memorial Library', url: 'https://www.centerharborlibrary.org', eventsUrl: 'https://www.centerharborlibrary.org/events', city: 'Center Harbor', state: 'NH', zipCode: '03226', county: 'Center Harbor County'},
  { name: 'Ossipee Public Library', url: 'https://www.centerossipeelibrary.org', eventsUrl: 'https://www.centerossipeelibrary.org/events', city: 'Center Ossipee', state: 'NH', zipCode: '03814', county: 'Center Ossipee County'},
  { name: 'Samuel H. Wentworth Library', url: 'https://www.centersandwichlibrary.org', eventsUrl: 'https://www.centersandwichlibrary.org/events', city: 'Center Sandwich', state: 'NH', zipCode: '03227', county: 'Center Sandwich County'},
  { name: 'Silsby Free Public Library', url: 'https://www.charlestownlibrary.org', eventsUrl: 'https://www.charlestownlibrary.org/events', city: 'Charlestown', state: 'NH', zipCode: '03603', county: 'Charlestown County'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'NH', zipCode: '03036', county: 'Chester County'},
  { name: 'Chesterfield Public Library', url: 'https://www.chesterfieldlibrary.org', eventsUrl: 'https://www.chesterfieldlibrary.org/events', city: 'Chesterfield', state: 'NH', zipCode: '03443', county: 'Chesterfield County'},
  { name: 'Chichester Town Library', url: 'https://www.chichesterlibrary.org', eventsUrl: 'https://www.chichesterlibrary.org/events', city: 'Chichester', state: 'NH', zipCode: '03258', county: 'Chichester County'},
  { name: 'Chocorua Public Library', url: 'https://www.chocorualibrary.org', eventsUrl: 'https://www.chocorualibrary.org/events', city: 'Chocorua', state: 'NH', zipCode: '03817', county: 'Chocorua County'},
  { name: 'Fiske Free Library', url: 'https://www.claremontlibrary.org', eventsUrl: 'https://www.claremontlibrary.org/events', city: 'Claremont', state: 'NH', zipCode: '03743', county: 'Claremont County'},
  { name: 'Colebrook Public Library', url: 'https://www.colebrooklibrary.org', eventsUrl: 'https://www.colebrooklibrary.org/events', city: 'Colebrook', state: 'NH', zipCode: '03576', county: 'Colebrook County'},
  { name: 'Hopkinton Town Library', url: 'https://www.contoocooklibrary.org', eventsUrl: 'https://www.contoocooklibrary.org/events', city: 'Contoocook', state: 'NH', zipCode: '03229', county: 'Contoocook County'},
  { name: 'Conway Public Library', url: 'https://www.conwaylibrary.org', eventsUrl: 'https://www.conwaylibrary.org/events', city: 'Conway', state: 'NH', zipCode: '03818', county: 'Conway County'},
  { name: 'George H. Stowell Free Library', url: 'https://www.cornishflatlibrary.org', eventsUrl: 'https://www.cornishflatlibrary.org/events', city: 'Cornish Flat', state: 'NH', zipCode: '03746', county: 'Cornish Flat County'},
  { name: 'Tuftonboro Free Library', url: 'https://www.ctrtuftonborolibrary.org', eventsUrl: 'https://www.ctrtuftonborolibrary.org/events', city: 'Ctr. Tuftonboro', state: 'NH', zipCode: '03816', county: 'Ctr. Tuftonboro County'},
  { name: 'Dalton Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'NH', zipCode: '03598', county: 'Dalton County'},
  { name: 'George Gamble Library', url: 'https://www.danburylibrary.org', eventsUrl: 'https://www.danburylibrary.org/events', city: 'Danbury', state: 'NH', zipCode: '03230', county: 'Danbury County'},
  { name: 'Colby Memorial Library', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'NH', zipCode: '03819', county: 'Danville County'},
  { name: 'Philbrick-James Library', url: 'https://www.deerfieldlibrary.org', eventsUrl: 'https://www.deerfieldlibrary.org/events', city: 'Deerfield', state: 'NH', zipCode: '03037', county: 'Deerfield County'},
  { name: 'Deering Public Library', url: 'https://www.deeringlibrary.org', eventsUrl: 'https://www.deeringlibrary.org/events', city: 'Deering', state: 'NH', zipCode: '03244', county: 'Deering County'},
  { name: 'Dublin Public Library', url: 'https://www.dublinlibrary.org', eventsUrl: 'https://www.dublinlibrary.org/events', city: 'Dublin', state: 'NH', zipCode: '03444', county: 'Dublin County'},
  { name: 'Dummer Public Library', url: 'https://www.dummerlibrary.org', eventsUrl: 'https://www.dummerlibrary.org/events', city: 'Dummer', state: 'NH', zipCode: '03588', county: 'Dummer County'},
  { name: 'Dunbarton Public Library', url: 'https://www.dunbartonlibrary.org', eventsUrl: 'https://www.dunbartonlibrary.org/events', city: 'Dunbarton', state: 'NH', zipCode: '03046', county: 'Dunbarton County'},
  { name: 'Durham Public Library', url: 'https://www.durhamlibrary.org', eventsUrl: 'https://www.durhamlibrary.org/events', city: 'Durham', state: 'NH', zipCode: '03824', county: 'Durham County'},
  { name: 'William Adams Bachelder Library', url: 'https://www.eastandoverlibrary.org', eventsUrl: 'https://www.eastandoverlibrary.org/events', city: 'East Andover', state: 'NH', zipCode: '03231', county: 'East Andover County'},
  { name: 'Taylor Library', url: 'https://www.eastderrylibrary.org', eventsUrl: 'https://www.eastderrylibrary.org/events', city: 'East Derry', state: 'NH', zipCode: '03041', county: 'East Derry County'},
  { name: 'East Kingston Public Library', url: 'https://www.eastkingstonlibrary.org', eventsUrl: 'https://www.eastkingstonlibrary.org/events', city: 'East Kingston', state: 'NH', zipCode: '03827', county: 'East Kingston County'},
  { name: 'East Rochester Public Library', url: 'https://www.eastrochesterlibrary.org', eventsUrl: 'https://www.eastrochesterlibrary.org/events', city: 'East Rochester', state: 'NH', zipCode: '03868', county: 'East Rochester County'},
  { name: 'Effingham Free Public Library', url: 'https://www.effinghamlibrary.org', eventsUrl: 'https://www.effinghamlibrary.org/events', city: 'Effingham', state: 'NH', zipCode: '03882', county: 'Effingham County'},
  { name: 'Enfield Public Library', url: 'https://www.enfieldlibrary.org', eventsUrl: 'https://www.enfieldlibrary.org/events', city: 'Enfield', state: 'NH', zipCode: '03748', county: 'Enfield County'},
  { name: 'Harvey-Mitchell Memorial Library', url: 'https://www.eppinglibrary.org', eventsUrl: 'https://www.eppinglibrary.org/events', city: 'Epping', state: 'NH', zipCode: '03042', county: 'Epping County'},
  { name: 'Epsom Public Library', url: 'https://www.epsomlibrary.org', eventsUrl: 'https://www.epsomlibrary.org/events', city: 'Epsom', state: 'NH', zipCode: '03234', county: 'Epsom County'},
  { name: 'Errol Public Library', url: 'https://www.errollibrary.org', eventsUrl: 'https://www.errollibrary.org/events', city: 'Errol', state: 'NH', zipCode: '03579', county: 'Errol County'},
  { name: 'Hanover Town Library', url: 'https://www.etnalibrary.org', eventsUrl: 'https://www.etnalibrary.org/events', city: 'Etna', state: 'NH', zipCode: '03750', county: 'Etna County'},
  { name: 'Goodwin Library', url: 'https://www.farmingtonlibrary.org', eventsUrl: 'https://www.farmingtonlibrary.org/events', city: 'Farmington', state: 'NH', zipCode: '03835', county: 'Farmington County'},
  { name: 'Fitzwilliam Town Library', url: 'https://www.fitzwilliamlibrary.org', eventsUrl: 'https://www.fitzwilliamlibrary.org/events', city: 'Fitzwilliam', state: 'NH', zipCode: '03447', county: 'Fitzwilliam County'},
  { name: 'George Holmes Bixby Memorial Library', url: 'https://www.francestownlibrary.org', eventsUrl: 'https://www.francestownlibrary.org/events', city: 'Francestown', state: 'NH', zipCode: '03043', county: 'Francestown County'},
  { name: 'Abbie Greenleaf Library', url: 'https://www.franconialibrary.org', eventsUrl: 'https://www.franconialibrary.org/events', city: 'Franconia', state: 'NH', zipCode: '03580', county: 'Franconia County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NH', zipCode: '03235', county: 'Franklin County'},
  { name: 'Freedom Public Library', url: 'https://www.freedomlibrary.org', eventsUrl: 'https://www.freedomlibrary.org/events', city: 'Freedom', state: 'NH', zipCode: '03836', county: 'Freedom County'},
  { name: 'Fremont Public Library', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'NH', zipCode: '03044', county: 'Fremont County'},
  { name: 'Gilford Public Library', url: 'https://www.gilfordlibrary.org', eventsUrl: 'https://www.gilfordlibrary.org/events', city: 'Gilford', state: 'NH', zipCode: '03249', county: 'Gilford County'},
  { name: 'Gilmanton Corner Public Library', url: 'https://www.gilmantonlibrary.org', eventsUrl: 'https://www.gilmantonlibrary.org/events', city: 'Gilmanton', state: 'NH', zipCode: '03237', county: 'Gilmanton County'},
  { name: 'Gilmanton Iron Works Library', url: 'https://www.gilmantonironworkslibrary.org', eventsUrl: 'https://www.gilmantonironworkslibrary.org/events', city: 'Gilmanton Iron Works', state: 'NH', zipCode: '03837', county: 'Gilmanton Iron Works County'},
  { name: 'Gilsum Public Library', url: 'https://www.gilsumlibrary.org', eventsUrl: 'https://www.gilsumlibrary.org/events', city: 'Gilsum', state: 'NH', zipCode: '03448', county: 'Gilsum County'},
  { name: 'Gorham Public Library', url: 'https://www.gorhamlibrary.org', eventsUrl: 'https://www.gorhamlibrary.org/events', city: 'Gorham', state: 'NH', zipCode: '03581', county: 'Gorham County'},
  { name: 'Olive G. Pettis Library', url: 'https://www.goshenlibrary.org', eventsUrl: 'https://www.goshenlibrary.org/events', city: 'Goshen', state: 'NH', zipCode: '03752', county: 'Goshen County'},
  { name: 'Grafton Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'NH', zipCode: '03240', county: 'Grafton County'},
  { name: 'Dunbar Free Library', url: 'https://www.granthamlibrary.org', eventsUrl: 'https://www.granthamlibrary.org/events', city: 'Grantham', state: 'NH', zipCode: '03753', county: 'Grantham County'},
  { name: 'Stephenson Memorial Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'NH', zipCode: '03047', county: 'Greenfield County'},
  { name: 'Weeks Public Library', url: 'https://www.greenlandlibrary.org', eventsUrl: 'https://www.greenlandlibrary.org/events', city: 'Greenland', state: 'NH', zipCode: '03840', county: 'Greenland County'},
  { name: 'Chamberlin Free Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'NH', zipCode: '03048', county: 'Greenville County'},
  { name: 'Groton Free Public Library', url: 'https://www.grotonlibrary.org', eventsUrl: 'https://www.grotonlibrary.org/events', city: 'Groton', state: 'NH', zipCode: '03241', county: 'Groton County'},
  { name: 'Northumberland Public Library', url: 'https://www.grovetonlibrary.org', eventsUrl: 'https://www.grovetonlibrary.org/events', city: 'Groveton', state: 'NH', zipCode: '03582', county: 'Groveton County'},
  { name: 'Hampstead Public Library', url: 'https://www.hampsteadlibrary.org', eventsUrl: 'https://www.hampsteadlibrary.org/events', city: 'Hampstead', state: 'NH', zipCode: '03841', county: 'Hampstead County'},
  { name: 'Hampton Falls Free Library', url: 'https://www.hamptonfallslibrary.org', eventsUrl: 'https://www.hamptonfallslibrary.org/events', city: 'Hampton Falls', state: 'NH', zipCode: '03844', county: 'Hampton Falls County'},
  { name: 'Hancock Town Library', url: 'https://www.hancocklibrary.org', eventsUrl: 'https://www.hancocklibrary.org/events', city: 'Hancock', state: 'NH', zipCode: '03449', county: 'Hancock County'},
  { name: 'Howe Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'NH', zipCode: '03755', county: 'Hanover County'},
  { name: 'Harrisville Public Library', url: 'https://www.harrisvillelibrary.org', eventsUrl: 'https://www.harrisvillelibrary.org/events', city: 'Harrisville', state: 'NH', zipCode: '03450', county: 'Harrisville County'},
  { name: 'Haverhill Library Association', url: 'https://www.haverhilllibrary.org', eventsUrl: 'https://www.haverhilllibrary.org/events', city: 'Haverhill', state: 'NH', zipCode: '03765', county: 'Haverhill County'},
  { name: 'Hebron Public Library', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'NH', zipCode: '03241', county: 'Hebron County'},
  { name: 'Tucker Free Library', url: 'https://www.hennikerlibrary.org', eventsUrl: 'https://www.hennikerlibrary.org/events', city: 'Henniker', state: 'NH', zipCode: '03242', county: 'Henniker County'},
  { name: 'Hill Public Library', url: 'https://www.hilllibrary.org', eventsUrl: 'https://www.hilllibrary.org/events', city: 'Hill', state: 'NH', zipCode: '03243', county: 'Hill County'},
  { name: 'Fuller Public Library', url: 'https://www.hillsboroughlibrary.org', eventsUrl: 'https://www.hillsboroughlibrary.org/events', city: 'Hillsborough', state: 'NH', zipCode: '03244', county: 'Hillsborough County'},
  { name: 'Hinsdale Public Library', url: 'https://www.hinsdalelibrary.org', eventsUrl: 'https://www.hinsdalelibrary.org/events', city: 'Hinsdale', state: 'NH', zipCode: '03451', county: 'Hinsdale County'},
  { name: 'Holderness Library', url: 'https://www.holdernesslibrary.org', eventsUrl: 'https://www.holdernesslibrary.org/events', city: 'Holderness', state: 'NH', zipCode: '03245', county: 'Holderness County'},
  { name: 'Hollis Social Library', url: 'https://www.hollislibrary.org', eventsUrl: 'https://www.hollislibrary.org/events', city: 'Hollis', state: 'NH', zipCode: '03049', county: 'Hollis County'},
  { name: 'Jackson Public Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'NH', zipCode: '03846', county: 'Jackson County'},
  { name: 'Jaffrey Public Library', url: 'https://www.jaffreylibrary.org', eventsUrl: 'https://www.jaffreylibrary.org/events', city: 'Jaffrey', state: 'NH', zipCode: '03452', county: 'Jaffrey County'},
  { name: 'Jefferson Public Library', url: 'https://www.jeffersonlibrary.org', eventsUrl: 'https://www.jeffersonlibrary.org/events', city: 'Jefferson', state: 'NH', zipCode: '03583', county: 'Jefferson County'},
  { name: 'Keene Public Library', url: 'https://www.keenelibrary.org', eventsUrl: 'https://www.keenelibrary.org/events', city: 'Keene', state: 'NH', zipCode: '03431', county: 'Keene County'},
  { name: 'Kensington Social Public Library', url: 'https://www.kensingtonlibrary.org', eventsUrl: 'https://www.kensingtonlibrary.org/events', city: 'Kensington', state: 'NH', zipCode: '03833', county: 'Kensington County'},
  { name: 'Nichols Memorial Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'NH', zipCode: '03848', county: 'Kingston County'},
  { name: 'William D. Weeks Memorial Library', url: 'https://www.lancasterlibrary.org', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'NH', zipCode: '03584', county: 'Lancaster County'},
  { name: 'Lee Public Library', url: 'https://www.leelibrary.org', eventsUrl: 'https://www.leelibrary.org/events', city: 'Lee', state: 'NH', zipCode: '03861', county: 'Lee County'},
  { name: 'Miner Memorial Library', url: 'https://www.lempsterlibrary.org', eventsUrl: 'https://www.lempsterlibrary.org/events', city: 'Lempster', state: 'NH', zipCode: '03605', county: 'Lempster County'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'NH', zipCode: '03251', county: 'Lincoln County'},
  { name: 'Lisbon Public Library', url: 'https://www.lisbonlibrary.org', eventsUrl: 'https://www.lisbonlibrary.org/events', city: 'Lisbon', state: 'NH', zipCode: '03585', county: 'Lisbon County'},
  { name: 'Aaron Cutler Memorial Library', url: 'https://www.litchfieldlibrary.org', eventsUrl: 'https://www.litchfieldlibrary.org/events', city: 'Litchfield', state: 'NH', zipCode: '03052', county: 'Litchfield County'},
  { name: 'Littleton Public Library', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'NH', zipCode: '03561', county: 'Littleton County'},
  { name: 'Maxfield Public Library', url: 'https://www.loudonlibrary.org', eventsUrl: 'https://www.loudonlibrary.org/events', city: 'Loudon', state: 'NH', zipCode: '03307', county: 'Loudon County'},
  { name: 'Converse Free Library', url: 'https://www.lymelibrary.org', eventsUrl: 'https://www.lymelibrary.org/events', city: 'Lyme', state: 'NH', zipCode: '03768', county: 'Lyme County'},
  { name: 'J.A. Tarbell Library', url: 'https://www.lyndeboroughlibrary.org', eventsUrl: 'https://www.lyndeboroughlibrary.org/events', city: 'Lyndeborough', state: 'NH', zipCode: '03082', county: 'Lyndeborough County'},
  { name: 'Madbury Public Library', url: 'https://www.madburylibrary.org', eventsUrl: 'https://www.madburylibrary.org/events', city: 'Madbury', state: 'NH', zipCode: '03823', county: 'Madbury County'},
  { name: 'Madison Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NH', zipCode: '03849', county: 'Madison County'},
  { name: 'Frost Free Library', url: 'https://www.marlboroughlibrary.org', eventsUrl: 'https://www.marlboroughlibrary.org/events', city: 'Marlborough', state: 'NH', zipCode: '03455', county: 'Marlborough County'},
  { name: 'Marlow Town Library', url: 'https://www.marlowlibrary.org', eventsUrl: 'https://www.marlowlibrary.org/events', city: 'Marlow', state: 'NH', zipCode: '03456', county: 'Marlow County'},
  { name: 'Mason Public Library', url: 'https://www.masonlibrary.org', eventsUrl: 'https://www.masonlibrary.org/events', city: 'Mason', state: 'NH', zipCode: '03048', county: 'Mason County'},
  { name: 'Meredith Public Library', url: 'https://www.meredithlibrary.org', eventsUrl: 'https://www.meredithlibrary.org/events', city: 'Meredith', state: 'NH', zipCode: '03253', county: 'Meredith County'},
  { name: 'Meriden Library', url: 'https://www.meridenlibrary.org', eventsUrl: 'https://www.meridenlibrary.org/events', city: 'Meriden', state: 'NH', zipCode: '03770', county: 'Meriden County'},
  { name: 'Merrimack Public Library', url: 'https://www.merrimacklibrary.org', eventsUrl: 'https://www.merrimacklibrary.org/events', city: 'Merrimack', state: 'NH', zipCode: '03054', county: 'Merrimack County'},
  { name: 'Milan Public Library', url: 'https://www.milanlibrary.org', eventsUrl: 'https://www.milanlibrary.org/events', city: 'Milan', state: 'NH', zipCode: '03588', county: 'Milan County'},
  { name: 'Nute Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'NH', zipCode: '03851', county: 'Milton County'},
  { name: 'Milton Free Public Library', url: 'https://www.miltonmillslibrary.org', eventsUrl: 'https://www.miltonmillslibrary.org/events', city: 'Milton Mills', state: 'NH', zipCode: '03852', county: 'Milton Mills County'},
  { name: 'Monroe Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NH', zipCode: '03771', county: 'Monroe County'},
  { name: 'Daland Memorial Library', url: 'https://www.montvernonlibrary.org', eventsUrl: 'https://www.montvernonlibrary.org/events', city: 'Mont Vernon', state: 'NH', zipCode: '03057', county: 'Mont Vernon County'},
  { name: 'Moultonborough Public Library', url: 'https://www.moultonboroughlibrary.org', eventsUrl: 'https://www.moultonboroughlibrary.org/events', city: 'Moultonborough', state: 'NH', zipCode: '03254', county: 'Moultonborough County'},
  { name: 'Olivia Rodham Memorial Library', url: 'https://www.nelsonlibrary.org', eventsUrl: 'https://www.nelsonlibrary.org/events', city: 'Nelson', state: 'NH', zipCode: '03457', county: 'Nelson County'},
  { name: 'Whipple Free Library', url: 'https://www.newbostonlibrary.org', eventsUrl: 'https://www.newbostonlibrary.org/events', city: 'New Boston', state: 'NH', zipCode: '03070', county: 'New Boston County'},
  { name: 'New Castle Library', url: 'https://www.newcastlelibrary.org', eventsUrl: 'https://www.newcastlelibrary.org/events', city: 'New Castle', state: 'NH', zipCode: '03854', county: 'New Castle County'},
  { name: 'New Durham Public Library', url: 'https://www.newdurhamlibrary.org', eventsUrl: 'https://www.newdurhamlibrary.org/events', city: 'New Durham', state: 'NH', zipCode: '03855', county: 'New Durham County'},
  { name: 'Easton Public Library', url: 'https://www.newhampshirelibrary.org', eventsUrl: 'https://www.newhampshirelibrary.org/events', city: 'New Hampshire', state: 'NH', zipCode: '03580', county: 'New Hampshire County'},
  { name: 'Gordon-Nash Library', url: 'https://www.newhamptonlibrary.org', eventsUrl: 'https://www.newhamptonlibrary.org/events', city: 'New Hampton', state: 'NH', zipCode: '03256', county: 'New Hampton County'},
  { name: 'New Ipswich Library', url: 'https://www.newipswichlibrary.org', eventsUrl: 'https://www.newipswichlibrary.org/events', city: 'New Ipswich', state: 'NH', zipCode: '03071', county: 'New Ipswich County'},
  { name: 'Tracy Memorial Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'NH', zipCode: '03257', county: 'New London County'},
  { name: 'Newbury Public Library', url: 'https://www.newburylibrary.org', eventsUrl: 'https://www.newburylibrary.org/events', city: 'Newbury', state: 'NH', zipCode: '03255', county: 'Newbury County'},
  { name: 'Newfields Public Library', url: 'https://www.newfieldslibrary.org', eventsUrl: 'https://www.newfieldslibrary.org/events', city: 'Newfields', state: 'NH', zipCode: '03856', county: 'Newfields County'},
  { name: 'Langdon Library', url: 'https://www.newingtonlibrary.org', eventsUrl: 'https://www.newingtonlibrary.org/events', city: 'Newington', state: 'NH', zipCode: '03801', county: 'Newington County'},
  { name: 'Newmarket Public Library', url: 'https://www.newmarketlibrary.org', eventsUrl: 'https://www.newmarketlibrary.org/events', city: 'Newmarket', state: 'NH', zipCode: '03857', county: 'Newmarket County'},
  { name: 'Richards Free Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'NH', zipCode: '03773', county: 'Newport County'},
  { name: 'Gale Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NH', zipCode: '03858', county: 'Newton County'},
  { name: 'North Conway Public Library Association', url: 'https://www.northconwaylibrary.org', eventsUrl: 'https://www.northconwaylibrary.org/events', city: 'North Conway', state: 'NH', zipCode: '03860', county: 'North Conway County'},
  { name: 'North Hampton Public Library', url: 'https://www.northhamptonlibrary.org', eventsUrl: 'https://www.northhamptonlibrary.org/events', city: 'North Hampton', state: 'NH', zipCode: '03862', county: 'North Hampton County'},
  { name: 'Patten-North Haverhill Library', url: 'https://www.northhaverhilllibrary.org', eventsUrl: 'https://www.northhaverhilllibrary.org/events', city: 'North Haverhill', state: 'NH', zipCode: '03774', county: 'North Haverhill County'},
  { name: 'North Walpole Public Library', url: 'https://www.northwalpolelibrary.org', eventsUrl: 'https://www.northwalpolelibrary.org/events', city: 'North Walpole', state: 'NH', zipCode: '00000', county: 'North Walpole County'},
  { name: 'Hall Memorial Library', url: 'https://www.northfieldlibrary.org', eventsUrl: 'https://www.northfieldlibrary.org/events', city: 'Northfield', state: 'NH', zipCode: '03276', county: 'Northfield County'},
  { name: 'Chesley Memorial Library', url: 'https://www.northwoodlibrary.org', eventsUrl: 'https://www.northwoodlibrary.org/events', city: 'Northwood', state: 'NH', zipCode: '03261', county: 'Northwood County'},
  { name: 'Blaisdell Memorial Library', url: 'https://www.nottinghamlibrary.org', eventsUrl: 'https://www.nottinghamlibrary.org/events', city: 'Nottingham', state: 'NH', zipCode: '03290', county: 'Nottingham County'},
  { name: 'Orford Free Library', url: 'https://www.orfordlibrary.org', eventsUrl: 'https://www.orfordlibrary.org/events', city: 'Orford', state: 'NH', zipCode: '03777', county: 'Orford County'},
  { name: 'Pelham Public Library', url: 'https://www.pelhamlibrary.org', eventsUrl: 'https://www.pelhamlibrary.org/events', city: 'Pelham', state: 'NH', zipCode: '03076', county: 'Pelham County'},
  { name: 'Pembroke Town Library', url: 'https://www.pembrokelibrary.org', eventsUrl: 'https://www.pembrokelibrary.org/events', city: 'Pembroke', state: 'NH', zipCode: '03275', county: 'Pembroke County'},
  { name: 'Piermont Public Library', url: 'https://www.piermontlibrary.org', eventsUrl: 'https://www.piermontlibrary.org/events', city: 'Piermont', state: 'NH', zipCode: '03779', county: 'Piermont County'},
  { name: 'Pike Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pike', state: 'NH', zipCode: '03780', county: 'Pike County'},
  { name: 'Bremer Pond Memorial Library', url: 'https://www.pittsburglibrary.org', eventsUrl: 'https://www.pittsburglibrary.org/events', city: 'Pittsburg', state: 'NH', zipCode: '03592', county: 'Pittsburg County'},
  { name: 'Josiah Carpenter Library', url: 'https://www.pittsfieldlibrary.org', eventsUrl: 'https://www.pittsfieldlibrary.org/events', city: 'Pittsfield', state: 'NH', zipCode: '03263', county: 'Pittsfield County'},
  { name: 'Philip Read Memorial Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'NH', zipCode: '03781', county: 'Plainfield County'},
  { name: 'Plaistow Public Library', url: 'https://www.plaistowlibrary.org', eventsUrl: 'https://www.plaistowlibrary.org/events', city: 'Plaistow', state: 'NH', zipCode: '03865', county: 'Plaistow County'},
  { name: 'Pease Public Library', url: 'https://www.plymouthlibrary.org', eventsUrl: 'https://www.plymouthlibrary.org/events', city: 'Plymouth', state: 'NH', zipCode: '03264', county: 'Plymouth County'},
  { name: 'Portsmouth Public Library', url: 'https://www.portsmouthlibrary.org', eventsUrl: 'https://www.portsmouthlibrary.org/events', city: 'Portsmouth', state: 'NH', zipCode: '03801', county: 'Portsmouth County'},
  { name: 'Randolph Public Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'NH', zipCode: '03593', county: 'Randolph County'},
  { name: 'Dudley-Tucker Library', url: 'https://www.raymondlibrary.org', eventsUrl: 'https://www.raymondlibrary.org/events', city: 'Raymond', state: 'NH', zipCode: '03077', county: 'Raymond County'},
  { name: 'Richmond Public Library', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'NH', zipCode: '03470', county: 'Richmond County'},
  { name: 'Ingalls Memorial Library', url: 'https://www.rindgelibrary.org', eventsUrl: 'https://www.rindgelibrary.org/events', city: 'Rindge', state: 'NH', zipCode: '03461', county: 'Rindge County'},
  { name: 'Rollinsford Public Library', url: 'https://www.rollinsfordlibrary.org', eventsUrl: 'https://www.rollinsfordlibrary.org/events', city: 'Rollinsford', state: 'NH', zipCode: '03869', county: 'Rollinsford County'},
  { name: 'Byron G. Merrill Library', url: 'https://www.rumneylibrary.org', eventsUrl: 'https://www.rumneylibrary.org/events', city: 'Rumney', state: 'NH', zipCode: '03266', county: 'Rumney County'},
  { name: 'Rye Public Library', url: 'https://www.ryelibrary.org', eventsUrl: 'https://www.ryelibrary.org/events', city: 'Rye', state: 'NH', zipCode: '03870', county: 'Rye County'},
  { name: 'Salisbury Free Library', url: 'https://www.salisburylibrary.org', eventsUrl: 'https://www.salisburylibrary.org/events', city: 'Salisbury', state: 'NH', zipCode: '03268', county: 'Salisbury County'},
  { name: 'Sanbornton Public Library', url: 'https://www.sanborntonlibrary.org', eventsUrl: 'https://www.sanborntonlibrary.org/events', city: 'Sanbornton', state: 'NH', zipCode: '03269', county: 'Sanbornton County'},
  { name: 'The Gafney Library, Inc', url: 'https://www.sanbornvillelibrary.org', eventsUrl: 'https://www.sanbornvillelibrary.org/events', city: 'Sanbornville', state: 'NH', zipCode: '03872', county: 'Sanbornville County'},
  { name: 'Sandown Public Library', url: 'https://www.sandownlibrary.org', eventsUrl: 'https://www.sandownlibrary.org/events', city: 'Sandown', state: 'NH', zipCode: '03873', county: 'Sandown County'},
  { name: 'Seabrook Library', url: 'https://www.seabrooklibrary.org', eventsUrl: 'https://www.seabrooklibrary.org/events', city: 'Seabrook', state: 'NH', zipCode: '03874', county: 'Seabrook County'},
  { name: 'Shelburne Public Library', url: 'https://www.shelburnelibrary.org', eventsUrl: 'https://www.shelburnelibrary.org/events', city: 'Shelburne', state: 'NH', zipCode: '03581', county: 'Shelburne County'},
  { name: 'Somersworth Public Library', url: 'https://www.somersworthlibrary.org', eventsUrl: 'https://www.somersworthlibrary.org/events', city: 'Somersworth', state: 'NH', zipCode: '03878', county: 'Somersworth County'},
  { name: 'South Hampton Free Public Library', url: 'https://www.southhamptonlibrary.org', eventsUrl: 'https://www.southhamptonlibrary.org/events', city: 'South Hampton', state: 'NH', zipCode: '03827', county: 'South Hampton County'},
  { name: 'Libbie A. Cass Memorial Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'NH', zipCode: '03284', county: 'Springfield County'},
  { name: 'Hill Library', url: 'https://www.starffordlibrary.org', eventsUrl: 'https://www.starffordlibrary.org/events', city: 'Starfford', state: 'NH', zipCode: '03884', county: 'Starfford County'},
  { name: 'Stark Public Library', url: 'https://www.starklibrary.org', eventsUrl: 'https://www.starklibrary.org/events', city: 'Stark', state: 'NH', zipCode: '03582', county: 'Stark County'},
  { name: 'Davis Public Library', url: 'https://www.stoddardlibrary.org', eventsUrl: 'https://www.stoddardlibrary.org/events', city: 'Stoddard', state: 'NH', zipCode: '03464', county: 'Stoddard County'},
  { name: 'Laura Johnson Memorial Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'NH', zipCode: '03590', county: 'Stratford County'},
  { name: 'Wiggin Memorial Library', url: 'https://www.strathamlibrary.org', eventsUrl: 'https://www.strathamlibrary.org/events', city: 'Stratham', state: 'NH', zipCode: '03885', county: 'Stratham County'},
  { name: 'Richardson Memorial Library', url: 'https://www.sugarhilllibrary.org', eventsUrl: 'https://www.sugarhilllibrary.org/events', city: 'Sugar Hill', state: 'NH', zipCode: '03586', county: 'Sugar Hill County'},
  { name: 'Sullivan Public Library', url: 'https://www.sullivanlibrary.org', eventsUrl: 'https://www.sullivanlibrary.org/events', city: 'Sullivan', state: 'NH', zipCode: '03445', county: 'Sullivan County'},
  { name: 'Abbott Library', url: 'https://www.sunapeelibrary.org', eventsUrl: 'https://www.sunapeelibrary.org/events', city: 'Sunapee', state: 'NH', zipCode: '03782', county: 'Sunapee County'},
  { name: 'Allenstown Public Library', url: 'https://www.suncooklibrary.org', eventsUrl: 'https://www.suncooklibrary.org/events', city: 'Suncook', state: 'NH', zipCode: '03275', county: 'Suncook County'},
  { name: 'Reed Free Library', url: 'https://www.surrylibrary.org', eventsUrl: 'https://www.surrylibrary.org/events', city: 'Surry', state: 'NH', zipCode: '03431', county: 'Surry County'},
  { name: 'Sutton Free Library', url: 'https://www.suttonlibrary.org', eventsUrl: 'https://www.suttonlibrary.org/events', city: 'Sutton', state: 'NH', zipCode: '03221', county: 'Sutton County'},
  { name: 'Mt. Caesar Union Library', url: 'https://www.swanzeylibrary.org', eventsUrl: 'https://www.swanzeylibrary.org/events', city: 'Swanzey', state: 'NH', zipCode: '03446', county: 'Swanzey County'},
  { name: 'Cook Memorial Library', url: 'https://www.tamworthlibrary.org', eventsUrl: 'https://www.tamworthlibrary.org/events', city: 'Tamworth', state: 'NH', zipCode: '03886', county: 'Tamworth County'},
  { name: 'Mansfield Public Library', url: 'https://www.templelibrary.org', eventsUrl: 'https://www.templelibrary.org/events', city: 'Temple', state: 'NH', zipCode: '03084', county: 'Temple County'},
  { name: 'Thornton Public Library', url: 'https://www.thorntonlibrary.org', eventsUrl: 'https://www.thorntonlibrary.org/events', city: 'Thornton', state: 'NH', zipCode: '03285', county: 'Thornton County'},
  { name: 'Gay-Kimball Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'NH', zipCode: '03465', county: 'Troy County'},
  { name: 'Twin Mountain Public Library', url: 'https://www.twinmountainlibrary.org', eventsUrl: 'https://www.twinmountainlibrary.org/events', city: 'Twin Mountain', state: 'NH', zipCode: '03595', county: 'Twin Mountain County'},
  { name: 'Unity Free Public Library', url: 'https://www.unitylibrary.org', eventsUrl: 'https://www.unitylibrary.org/events', city: 'Unity', state: 'NH', zipCode: '03603', county: 'Unity County'},
  { name: 'Dennis Joos Memorial Library', url: 'https://www.wstewartstownlibrary.org', eventsUrl: 'https://www.wstewartstownlibrary.org/events', city: 'W. Stewartstown', state: 'NH', zipCode: '03597', county: 'W. Stewartstown County'},
  { name: 'Wakefield Public Library', url: 'https://www.wakefieldlibrary.org', eventsUrl: 'https://www.wakefieldlibrary.org/events', city: 'Wakefield', state: 'NH', zipCode: '03872', county: 'Wakefield County'},
  { name: 'Walpole Town Library', url: 'https://www.walpolelibrary.org', eventsUrl: 'https://www.walpolelibrary.org/events', city: 'Walpole', state: 'NH', zipCode: '03608', county: 'Walpole County'},
  { name: 'Pillsbury Free Library', url: 'https://www.warnerlibrary.org', eventsUrl: 'https://www.warnerlibrary.org/events', city: 'Warner', state: 'NH', zipCode: '03278', county: 'Warner County'},
  { name: 'Joseph Patch Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'NH', zipCode: '03279', county: 'Warren County'},
  { name: 'Shedd Free Library', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'NH', zipCode: '03280', county: 'Washington County'},
  { name: 'Osceola Library', url: 'https://www.watervillevalleylibrary.org', eventsUrl: 'https://www.watervillevalleylibrary.org/events', city: 'Waterville Valley', state: 'NH', zipCode: '03215', county: 'Waterville Valley County'},
  { name: 'Weare Public Library', url: 'https://www.wearelibrary.org', eventsUrl: 'https://www.wearelibrary.org/events', city: 'Weare', state: 'NH', zipCode: '03281', county: 'Weare County'},
  { name: 'Webster Free Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'NH', zipCode: '03303', county: 'Webster County'},
  { name: 'Webster Memorial Library', url: 'https://www.wentworthlibrary.org', eventsUrl: 'https://www.wentworthlibrary.org/events', city: 'Wentworth', state: 'NH', zipCode: '03282', county: 'Wentworth County'},
  { name: 'West Lebanon Library', url: 'https://www.westlebanonlibrary.org', eventsUrl: 'https://www.westlebanonlibrary.org/events', city: 'West Lebanon', state: 'NH', zipCode: '00000', county: 'West Lebanon County'},
  { name: 'Stewartstown Public Library', url: 'https://www.weststewartstownlibrary.org', eventsUrl: 'https://www.weststewartstownlibrary.org/events', city: 'West Stewartstown', state: 'NH', zipCode: '00000', county: 'West Stewartstown County'},
  { name: 'Stratton Free Library', url: 'https://www.westswanzeylibrary.org', eventsUrl: 'https://www.westswanzeylibrary.org/events', city: 'West Swanzey', state: 'NH', zipCode: '03469', county: 'West Swanzey County'},
  { name: 'Westmoreland Public Library', url: 'https://www.westmorelandlibrary.org', eventsUrl: 'https://www.westmorelandlibrary.org/events', city: 'Westmoreland', state: 'NH', zipCode: '03467', county: 'Westmoreland County'},
  { name: 'Whitefield Public Library', url: 'https://www.whitefieldlibrary.org', eventsUrl: 'https://www.whitefieldlibrary.org/events', city: 'Whitefield', state: 'NH', zipCode: '03598', county: 'Whitefield County'},
  { name: 'Wilmot Public Library', url: 'https://www.wilmotlibrary.org', eventsUrl: 'https://www.wilmotlibrary.org/events', city: 'Wilmot', state: 'NH', zipCode: '03287', county: 'Wilmot County'},
  { name: 'Wilton Public Gregg Free Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'NH', zipCode: '03086', county: 'Wilton County'},
  { name: 'Conant Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'NH', zipCode: '03470', county: 'Winchester County'},
  { name: 'Wolfeboro Public Library', url: 'https://www.wolfeborolibrary.org', eventsUrl: 'https://www.wolfeborolibrary.org/events', city: 'Wolfeboro', state: 'NH', zipCode: '03894', county: 'Wolfeboro County'},
  { name: 'Moosilauke Public Library', url: 'https://www.woodstocklibrary.org', eventsUrl: 'https://www.woodstocklibrary.org/events', city: 'Woodstock', state: 'NH', zipCode: '03262', county: 'Woodstock County'},
  { name: 'Woodsville Free Public Library', url: 'https://www.woodsvillelibrary.org', eventsUrl: 'https://www.woodsvillelibrary.org/events', city: 'Woodsville', state: 'NH', zipCode: '03785', county: 'Woodsville County'}

];

const SCRAPER_NAME = 'wordpress-NH';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'NH', city: library.city, zipCode: library.zipCode }}));
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
    state: 'NH',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNHCloudFunction() {
  console.log('☁️ Running WordPress NH as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NH', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-NH', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNHCloudFunction };
