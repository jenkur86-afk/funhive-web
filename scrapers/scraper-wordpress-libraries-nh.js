const { launchBrowser } = require('./helpers/puppeteer-config');
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
  { name: 'Goffstown Public Library', url: 'https://goffstownlibrary.com/', eventsUrl: 'https://goffstownlibrary.com/570/Calendar', city: 'Goffstown', state: 'NH', zipCode: '03045', county: 'Hillsborough County'},
  { name: 'Bedford Public Library', url: 'https://www.bedfordnhlibrary.org', eventsUrl: 'https://www.bedfordnhlibrary.org/events', city: 'Bedford', state: 'NH', zipCode: '03110', county: 'Hillsborough County'},
  { name: 'Amherst Town Library', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'NH', zipCode: '03031', county: 'Hillsborough County'},
  { name: 'Windham Nesmith Library', url: 'https://www.nesmithlibrary.org', eventsUrl: 'https://www.nesmithlibrary.org/events', city: 'Windham', state: 'NH', zipCode: '03087', county: 'Rockingham County'},
  { name: 'Lebanon Public Libraries', url: 'https://leblibrary.com/', eventsUrl: 'https://leblibrary.com/', city: 'Lebanon', state: 'NH', zipCode: '03766', county: 'Grafton County'},
  { name: 'Salem Kelley Library', url: 'https://www.ci.salem.nh.us/kelleylibrary', eventsUrl: 'https://www.ci.salem.nh.us/kelleylibrary/events', city: 'Salem', state: 'NH', zipCode: '03079', county: 'Rockingham County'},
  { name: 'Londonderry Leach Library', url: 'https://www.londonderrynh.org/leach-library', eventsUrl: 'https://www.londonderrynh.org/leach-library/events', city: 'Londonderry', state: 'NH', zipCode: '03053', county: 'Rockingham County'},
  { name: 'Hudson Rodgers Memorial Library', url: 'https://www.rodgerslibrary.org/', eventsUrl: 'https://www.rodgerslibrary.org/', city: 'Hudson', state: 'NH', zipCode: '03051', county: 'Hillsborough County'},
  { name: 'Hooksett Public Library', url: 'https://www.hooksettlibrary.org', eventsUrl: 'https://www.hooksettlibrary.org/events', city: 'Hooksett', state: 'NH', zipCode: '03106', county: 'Merrimack County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Haynes Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'NH', zipCode: '03222', county: 'Alexandria County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'NH', zipCode: '03216', county: 'Andover County'},
  { name: 'Ashland Town Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'NH', zipCode: '03217', county: 'Ashland County'},
  { name: 'Griffin Free Public Library', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'NH', zipCode: '03032', county: 'Auburn County'},
  { name: 'Barrington Public Library', url: 'https://barringtonlibrary.org/', eventsUrl: 'https://barringtonlibrary.org/', city: 'Barrington', state: 'NH', zipCode: '03825', county: 'Barrington County'},
  { name: 'Bartlett Public Library', url: 'https://www.bartlettlibrary.org', eventsUrl: 'https://www.bartlettlibrary.org/events', city: 'Bartlett', state: 'NH', zipCode: '03812', county: 'Bartlett County'},
  { name: 'Bath Public Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'NH', zipCode: '03740', county: 'Bath County'},
  { name: 'Belmont Public Library', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'NH', zipCode: '03220', county: 'Belmont County'},
  { name: 'G. E.P. Dodge Library', url: 'https://www.benningtonlibrary.org', eventsUrl: 'https://www.benningtonlibrary.org/events', city: 'Bennington', state: 'NH', zipCode: '00000', county: 'Bennington County'},
  { name: 'Berlin Public Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'NH', zipCode: '03570', county: 'Berlin County'},
  { name: 'Bethlehem Public Library', url: 'https://www.bethlehemlibrary.org', eventsUrl: 'https://www.bethlehemlibrary.org/events', city: 'Bethlehem', state: 'NH', zipCode: '03574', county: 'Bethlehem County'},
  { name: 'Brown Memorial Library', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'NH', zipCode: '03221', county: 'Bradford County'},
  { name: 'Mary E. Bartlett Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'NH', zipCode: '03833', county: 'Brentwood County'},
  { name: 'Brookline Public Library', url: 'https://www.brooklinelibrary.org', eventsUrl: 'https://www.brooklinelibrary.org/events', city: 'Brookline', state: 'NH', zipCode: '03033', county: 'Brookline County'},
  { name: 'Canaan Town Library', url: 'https://www.canaanlibrary.org', eventsUrl: 'https://www.canaanlibrary.org/events', city: 'Canaan', state: 'NH', zipCode: '03741', county: 'Canaan County'},
  { name: 'Elkins Library', url: 'https://www.canterburylibrary.org', eventsUrl: 'https://www.canterburylibrary.org/events', city: 'Canterbury', state: 'NH', zipCode: '03224', county: 'Canterbury County'},
  { name: 'James E. Nichols Memorial Library', url: 'https://centerharborlibrary.org/', eventsUrl: 'https://centerharborlibrary.org/', city: 'Center Harbor', state: 'NH', zipCode: '03226', county: 'Center Harbor County'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'NH', zipCode: '03036', county: 'Chester County'},
  { name: 'Chesterfield Public Library', url: 'https://www.chesterfieldlibrary.org', eventsUrl: 'https://www.chesterfieldlibrary.org/events', city: 'Chesterfield', state: 'NH', zipCode: '03443', county: 'Chesterfield County'},
  { name: 'Chocorua Public Library', url: 'https://www.chocorualibrary.org/', eventsUrl: 'https://www.chocorualibrary.org/', city: 'Chocorua', state: 'NH', zipCode: '03817', county: 'Chocorua County'},
  { name: 'Fiske Free Library', url: 'https://www.claremontlibrary.org/', eventsUrl: 'https://www.claremontlibrary.org/', city: 'Claremont', state: 'NH', zipCode: '03743', county: 'Claremont County'},
  { name: 'Dalton Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'NH', zipCode: '03598', county: 'Dalton County'},
  { name: 'George Gamble Library', url: 'https://danburylibrary.org/', eventsUrl: 'https://danburylibrary.org/', city: 'Danbury', state: 'NH', zipCode: '03230', county: 'Danbury County'},
  { name: 'Colby Memorial Library', url: 'http://www.danvilleva.gov/', eventsUrl: 'http://www.danvilleva.gov/2467/Public-Library', city: 'Danville', state: 'NH', zipCode: '03819', county: 'Danville County'},
  { name: 'Philbrick-James Library', url: 'https://www.deerfieldlibrary.org', eventsUrl: 'https://www.deerfieldlibrary.org/events', city: 'Deerfield', state: 'NH', zipCode: '03037', county: 'Deerfield County'},
  { name: 'Dublin Public Library', url: 'https://www.dublinlibrary.org/', eventsUrl: 'https://www.dublinlibrary.org/', city: 'Dublin', state: 'NH', zipCode: '03444', county: 'Dublin County'},
  { name: 'Dunbarton Public Library', url: 'https://www.dunbartonlibrary.org', eventsUrl: 'https://www.dunbartonlibrary.org/events', city: 'Dunbarton', state: 'NH', zipCode: '03046', county: 'Dunbarton County'},
  { name: 'Durham Public Library', url: 'https://www.durhamlibrary.org', eventsUrl: 'https://www.durhamlibrary.org/events', city: 'Durham', state: 'NH', zipCode: '03824', county: 'Durham County'},
  { name: 'East Kingston Public Library', url: 'https://www.eastkingstonlibrary.org/', eventsUrl: 'https://www.eastkingstonlibrary.org/', city: 'East Kingston', state: 'NH', zipCode: '03827', county: 'East Kingston County'},
  { name: 'East Rochester Public Library', url: 'https://www.eastrochesterlibrary.org', eventsUrl: 'https://www.eastrochesterlibrary.org/events', city: 'East Rochester', state: 'NH', zipCode: '03868', county: 'East Rochester County'},
  { name: 'Effingham Free Public Library', url: 'https://effinghamlibrary.org/', eventsUrl: 'https://effinghamlibrary.org/', city: 'Effingham', state: 'NH', zipCode: '03882', county: 'Effingham County'},
  { name: 'Harvey-Mitchell Memorial Library', url: 'https://www.eppinglibrary.org', eventsUrl: 'https://www.eppinglibrary.org/events', city: 'Epping', state: 'NH', zipCode: '03042', county: 'Epping County'},
  { name: 'Goodwin Library', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'NH', zipCode: '03835', county: 'Farmington County'},
  { name: 'George Holmes Bixby Memorial Library', url: 'https://www.francestownlibrary.org', eventsUrl: 'https://www.francestownlibrary.org/events', city: 'Francestown', state: 'NH', zipCode: '03043', county: 'Francestown County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NH', zipCode: '03235', county: 'Franklin County'},
  { name: 'Fremont Public Library', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'NH', zipCode: '03044', county: 'Fremont County'},
  { name: 'Gilford Public Library', url: 'https://gilfordlibrary.org/', eventsUrl: 'https://gilfordlibrary.org/', city: 'Gilford', state: 'NH', zipCode: '03249', county: 'Gilford County'},
  { name: 'Gorham Public Library', url: 'https://gorhamlibrary.org/', eventsUrl: 'https://gorhamlibrary.org/calendar/', city: 'Gorham', state: 'NH', zipCode: '03581', county: 'Gorham County'},
  { name: 'Olive G. Pettis Library', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'NH', zipCode: '03752', county: 'Goshen County'},
  { name: 'Grafton Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'NH', zipCode: '03240', county: 'Grafton County'},
  { name: 'Stephenson Memorial Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'NH', zipCode: '03047', county: 'Greenfield County'},
  { name: 'Chamberlin Free Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'NH', zipCode: '03048', county: 'Greenville County'},
  { name: 'Hampstead Public Library', url: 'https://www.hampsteadlibrary.org/', eventsUrl: 'https://www.hampsteadlibrary.org/', city: 'Hampstead', state: 'NH', zipCode: '03841', county: 'Hampstead County'},
  { name: 'Hampton Falls Free Library', url: 'https://hamptonfallslibrary.org/', eventsUrl: 'https://hamptonfallslibrary.org/calendar/', city: 'Hampton Falls', state: 'NH', zipCode: '03844', county: 'Hampton Falls County'},
  { name: 'Hancock Town Library', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'NH', zipCode: '03449', county: 'Hancock County'},
  { name: 'Howe Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'NH', zipCode: '03755', county: 'Hanover County'},
  { name: 'Haverhill Library Association', url: 'https://www.haverhilllibrary.org', eventsUrl: 'https://www.haverhilllibrary.org/events', city: 'Haverhill', state: 'NH', zipCode: '03765', county: 'Haverhill County'},
  { name: 'Hebron Public Library', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'NH', zipCode: '03241', county: 'Hebron County'},
  { name: 'Hill Public Library', url: 'https://www.hilllibrary.org', eventsUrl: 'https://www.hilllibrary.org/events', city: 'Hill', state: 'NH', zipCode: '03243', county: 'Hill County'},
  { name: 'Holderness Library', url: 'https://www.holdernesslibrary.org', eventsUrl: 'https://www.holdernesslibrary.org/events', city: 'Holderness', state: 'NH', zipCode: '03245', county: 'Holderness County'},
  { name: 'Hollis Social Library', url: 'https://www.hollislibrary.org', eventsUrl: 'https://www.hollislibrary.org/events', city: 'Hollis', state: 'NH', zipCode: '03049', county: 'Hollis County'},
  { name: 'Nichols Memorial Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'NH', zipCode: '03848', county: 'Kingston County'},
  { name: 'William D. Weeks Memorial Library', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'NH', zipCode: '03584', county: 'Lancaster County'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'NH', zipCode: '03251', county: 'Lincoln County'},
  { name: 'Littleton Public Library', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'NH', zipCode: '03561', county: 'Littleton County'},
  { name: 'Madbury Public Library', url: 'https://madburylibrary.org/', eventsUrl: 'https://madburylibrary.org/', city: 'Madbury', state: 'NH', zipCode: '03823', county: 'Madbury County'},
  { name: 'Madison Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NH', zipCode: '03849', county: 'Madison County'},
  { name: 'Mason Public Library', url: 'https://www.masonlibrary.org', eventsUrl: 'https://www.masonlibrary.org/events', city: 'Mason', state: 'NH', zipCode: '03048', county: 'Mason County'},
  { name: 'Meredith Public Library', url: 'https://www.meredithlibrary.org', eventsUrl: 'https://www.meredithlibrary.org/events', city: 'Meredith', state: 'NH', zipCode: '03253', county: 'Meredith County'},
  { name: 'Meriden Library', url: 'https://www.meridenlibrary.org', eventsUrl: 'https://www.meridenlibrary.org/events', city: 'Meriden', state: 'NH', zipCode: '03770', county: 'Meriden County'},
  { name: 'Merrimack Public Library', url: 'https://www.merrimacklibrary.org', eventsUrl: 'https://www.merrimacklibrary.org/events', city: 'Merrimack', state: 'NH', zipCode: '03054', county: 'Merrimack County'},
  { name: 'Milan Public Library', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'NH', zipCode: '03588', county: 'Milan County'},
  { name: 'Nute Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'NH', zipCode: '03851', county: 'Milton County'},
  { name: 'Monroe Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NH', zipCode: '03771', county: 'Monroe County'},
  { name: 'Moultonborough Public Library', url: 'https://www.moultonboroughlibrary.org', eventsUrl: 'https://www.moultonboroughlibrary.org/events', city: 'Moultonborough', state: 'NH', zipCode: '03254', county: 'Moultonborough County'},
  { name: 'Olivia Rodham Memorial Library', url: 'https://www.nelsonlibrary.org', eventsUrl: 'https://www.nelsonlibrary.org/events', city: 'Nelson', state: 'NH', zipCode: '03457', county: 'Nelson County'},
  { name: 'New Durham Public Library', url: 'https://newdurhamlibrary.org/', eventsUrl: 'https://newdurhamlibrary.org/', city: 'New Durham', state: 'NH', zipCode: '03855', county: 'New Durham County'},
  { name: 'New Ipswich Library', url: 'https://www.newipswichlibrary.org/', eventsUrl: 'https://www.newipswichlibrary.org/', city: 'New Ipswich', state: 'NH', zipCode: '03071', county: 'New Ipswich County'},
  { name: 'Tracy Memorial Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'NH', zipCode: '03257', county: 'New London County'},
  { name: 'Newbury Public Library', url: 'https://www.newburylibrary.org', eventsUrl: 'https://www.newburylibrary.org/events', city: 'Newbury', state: 'NH', zipCode: '03255', county: 'Newbury County'},
  { name: 'Newfields Public Library', url: 'https://www.newfieldslibrary.org', eventsUrl: 'https://www.newfieldslibrary.org/events', city: 'Newfields', state: 'NH', zipCode: '03856', county: 'Newfields County'},
  { name: 'Newmarket Public Library', url: 'https://newmarketlibrary.org/', eventsUrl: 'https://newmarketlibrary.org/index.html', city: 'Newmarket', state: 'NH', zipCode: '03857', county: 'Newmarket County'},
  { name: 'Richards Free Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'NH', zipCode: '03773', county: 'Newport County'},
  { name: 'Gale Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NH', zipCode: '03858', county: 'Newton County'},
  { name: 'Blaisdell Memorial Library', url: 'https://nottinghamlibrary.org/', eventsUrl: 'https://nottinghamlibrary.org/', city: 'Nottingham', state: 'NH', zipCode: '03290', county: 'Nottingham County'},
  { name: 'Pelham Public Library', url: 'https://www.pelhamlibrary.org/', eventsUrl: 'https://www.pelhamlibrary.org/calendar/', city: 'Pelham', state: 'NH', zipCode: '03076', county: 'Pelham County'},
  { name: 'Pembroke Town Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'NH', zipCode: '03275', county: 'Pembroke County'},
  { name: 'Piermont Public Library', url: 'https://www.piermontlibrary.org', eventsUrl: 'https://www.piermontlibrary.org/events', city: 'Piermont', state: 'NH', zipCode: '03779', county: 'Piermont County'},
  { name: 'Pike Library', url: 'https://www.pikelibrary.org', eventsUrl: 'https://www.pikelibrary.org/events', city: 'Pike', state: 'NH', zipCode: '03780', county: 'Pike County'},
  { name: 'Bremer Pond Memorial Library', url: 'https://www.pittsburglibrary.org/', eventsUrl: 'https://www.pittsburglibrary.org/', city: 'Pittsburg', state: 'NH', zipCode: '03592', county: 'Pittsburg County'},
  { name: 'Josiah Carpenter Library', url: 'https://www.pittsfieldlibrary.org/', eventsUrl: 'https://www.pittsfieldlibrary.org/', city: 'Pittsfield', state: 'NH', zipCode: '03263', county: 'Pittsfield County'},
  { name: 'Philip Read Memorial Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'NH', zipCode: '03781', county: 'Plainfield County'},
  { name: 'Pease Public Library', url: 'https://plymouthlibrary.org/', eventsUrl: 'https://plymouthlibrary.org/', city: 'Plymouth', state: 'NH', zipCode: '03264', county: 'Plymouth County'},
  { name: 'Portsmouth Public Library', url: 'https://www.portsmouthlibrary.org/', eventsUrl: 'https://www.portsmouthlibrary.org/', city: 'Portsmouth', state: 'NH', zipCode: '03801', county: 'Portsmouth County'},
  { name: 'Randolph Public Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'NH', zipCode: '03593', county: 'Randolph County'},
  { name: 'Richmond Public Library', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'NH', zipCode: '03470', county: 'Richmond County'},
  { name: 'Rollinsford Public Library', url: 'https://www.rollinsfordlibrary.org/', eventsUrl: 'https://www.rollinsfordlibrary.org/calendar', city: 'Rollinsford', state: 'NH', zipCode: '03869', county: 'Rollinsford County'},
  { name: 'Byron G. Merrill Library', url: 'https://www.rumneylibrary.org/', eventsUrl: 'https://www.rumneylibrary.org/', city: 'Rumney', state: 'NH', zipCode: '03266', county: 'Rumney County'},
  { name: 'Rye Public Library', url: 'https://www.ryelibrary.org/', eventsUrl: 'https://www.ryelibrary.org/', city: 'Rye', state: 'NH', zipCode: '03870', county: 'Rye County'},
  { name: 'Salisbury Free Library', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'NH', zipCode: '03268', county: 'Salisbury County'},
  { name: 'Libbie A. Cass Memorial Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'NH', zipCode: '03284', county: 'Springfield County'},
  { name: 'Stark Public Library', url: 'https://www.starklibrary.org', eventsUrl: 'https://www.starklibrary.org/events', city: 'Stark', state: 'NH', zipCode: '03582', county: 'Stark County'},
  { name: 'Laura Johnson Memorial Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'NH', zipCode: '03590', county: 'Stratford County'},
  { name: 'Sullivan Public Library', url: 'https://www.sullivanil.us/', eventsUrl: 'https://www.sullivanil.us/departments/library/index.php', city: 'Sullivan', state: 'NH', zipCode: '03445', county: 'Sullivan County'},
  { name: 'Cook Memorial Library', url: 'https://www.tamworthlibrary.org', eventsUrl: 'https://www.tamworthlibrary.org/events', city: 'Tamworth', state: 'NH', zipCode: '03886', county: 'Tamworth County'},
  { name: 'Mansfield Public Library', url: 'https://www.templelibrary.org', eventsUrl: 'https://www.templelibrary.org/events', city: 'Temple', state: 'NH', zipCode: '03084', county: 'Temple County'},
  { name: 'Gay-Kimball Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'NH', zipCode: '03465', county: 'Troy County'},
  { name: 'Unity Free Public Library', url: 'https://www.unitylibrary.org/', eventsUrl: 'https://www.unitylibrary.org/', city: 'Unity', state: 'NH', zipCode: '03603', county: 'Unity County'},
  { name: 'Wakefield Public Library', url: 'https://wakefieldlibrary.org/', eventsUrl: 'https://wakefieldlibrary.org/', city: 'Wakefield', state: 'NH', zipCode: '03872', county: 'Wakefield County'},
  { name: 'Walpole Town Library', url: 'https://www.walpolelibrary.org', eventsUrl: 'https://www.walpolelibrary.org/events', city: 'Walpole', state: 'NH', zipCode: '03608', county: 'Walpole County'},
  { name: 'Pillsbury Free Library', url: 'https://warnerlibrary.org/', eventsUrl: 'https://warnerlibrary.org/', city: 'Warner', state: 'NH', zipCode: '03278', county: 'Warner County'},
  { name: 'Joseph Patch Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'NH', zipCode: '03279', county: 'Warren County'},
  { name: 'Webster Free Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'NH', zipCode: '03303', county: 'Webster County'},
  { name: 'Westmoreland Public Library', url: 'https://www.westmorelandpubliclibrary.com/', eventsUrl: 'https://www.westmorelandpubliclibrary.com/', city: 'Westmoreland', state: 'NH', zipCode: '03467', county: 'Westmoreland County'},
  { name: 'Whitefield Public Library', url: 'https://www.whitefieldlibrary.org', eventsUrl: 'https://www.whitefieldlibrary.org/events', city: 'Whitefield', state: 'NH', zipCode: '03598', county: 'Whitefield County'},
  { name: 'Wilmot Public Library', url: 'https://www.wilmotlibrary.org', eventsUrl: 'https://www.wilmotlibrary.org/events', city: 'Wilmot', state: 'NH', zipCode: '03287', county: 'Wilmot County'},
  { name: 'Wilton Public Gregg Free Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'NH', zipCode: '03086', county: 'Wilton County'},
  { name: 'Conant Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'NH', zipCode: '03470', county: 'Winchester County'},
  { name: 'Wolfeboro Public Library', url: 'https://wolfeboropubliclibrary.org/', eventsUrl: 'https://wolfeboropubliclibrary.org/', city: 'Wolfeboro', state: 'NH', zipCode: '03894', county: 'Wolfeboro County'},

];

const SCRAPER_NAME = 'wordpress-NH';

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
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
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
