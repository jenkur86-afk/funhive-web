const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Maine Public Libraries Scraper - Coverage: All Maine public libraries
 */
const LIBRARIES = [
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.com', eventsUrl: 'https://www.portlandlibrary.com/events', city: 'Portland', state: 'ME', zipCode: '04101', county: 'Portland County'},
  { name: 'Bangor Public Library', url: 'https://bangorpubliclibrary.org/', eventsUrl: 'https://bangorpubliclibrary.org/', city: 'Bangor', state: 'ME', zipCode: '04401', county: 'Bangor County'},
  { name: 'Lewiston Public Library', url: 'https://www.lplonline.org', eventsUrl: 'https://www.lplonline.org/events', city: 'Lewiston', state: 'ME', zipCode: '04240', county: 'Lewiston County'},
  { name: 'Auburn Public Library', url: 'https://www.auburnpubliclibrary.org', eventsUrl: 'https://www.auburnpubliclibrary.org/events', city: 'Auburn', state: 'ME', zipCode: '04210', county: 'Auburn County'},
  { name: 'South Portland Public Library', url: 'https://www.southportlandlibrary.com', eventsUrl: 'https://www.southportlandlibrary.com/events', city: 'South Portland', state: 'ME', zipCode: '04106', county: 'South Portland County'},
  { name: 'Biddeford-McArthur Library', url: 'https://www.mcarthurlibrary.org', eventsUrl: 'https://www.mcarthurlibrary.org/events', city: 'Biddeford', state: 'ME', zipCode: '04005', county: 'Biddeford County'},
  { name: 'Augusta - Lithgow Public Library', url: 'https://www.lithgowlibrary.org/', eventsUrl: 'https://www.lithgowlibrary.org/', city: 'Augusta', state: 'ME', zipCode: '04330', county: 'Augusta County'},
  { name: 'Scarborough Public Library', url: 'https://www.scarboroughlibrary.org', eventsUrl: 'https://www.scarboroughlibrary.org/events', city: 'Scarborough', state: 'ME', zipCode: '04074', county: 'Scarborough County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'ME', zipCode: '04901', county: 'Waterville County'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'ME', zipCode: '04092', county: 'Westbrook County'},
  { name: 'Brunswick Curtis Memorial Library', url: 'https://curtislibrary.com/', eventsUrl: 'https://curtislibrary.com/', city: 'Brunswick', state: 'ME', zipCode: '04011', county: 'Brunswick County'},
  { name: 'Gorham Baxter Memorial Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Gorham', state: 'ME', zipCode: '04038', county: 'Gorham County'},
  { name: 'Windham Public Library', url: 'https://www.windham.lib.me.us/', eventsUrl: 'https://www.windham.lib.me.us/calendar', city: 'Windham', state: 'ME', zipCode: '04062', county: 'Windham County'},
  { name: 'Kennebunk Free Library', url: 'https://kennebunklibrary.org/', eventsUrl: 'https://kennebunklibrary.org/calendar/', city: 'Kennebunk', state: 'ME', zipCode: '04043', county: 'Kennebunk County'},
  { name: 'Belfast Free Library', url: 'https://www.belfastlibrary.org', eventsUrl: 'https://www.belfastlibrary.org/events', city: 'Belfast', state: 'ME', zipCode: '04915', county: 'Belfast County'},
  { name: 'Rockland Public Library', url: 'https://www.rocklandlibrary.org', eventsUrl: 'https://www.rocklandlibrary.org/events', city: 'Rockland', state: 'ME', zipCode: '04841', county: 'Rockland County'},
  { name: 'Camden Public Library', url: 'https://www.librarycamden.org', eventsUrl: 'https://www.librarycamden.org/events', city: 'Camden', state: 'ME', zipCode: '04843', county: 'Camden County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Acton Public Library', url: 'https://www.actonlibrary.org', eventsUrl: 'https://www.actonlibrary.org/events', city: 'Acton', state: 'ME', zipCode: '04001', county: 'Acton County'},
  { name: 'Mayhew Library Assn', url: 'https://www.addisonlibrary.org', eventsUrl: 'https://www.addisonlibrary.org/events', city: 'Addison', state: 'ME', zipCode: '04606', county: 'Addison County'},
  { name: 'Albion Public Library', url: 'https://www.albionlibrary.org/', eventsUrl: 'https://www.albionlibrary.org/', city: 'Albion', state: 'ME', zipCode: '04910', county: 'Albion County'},
  { name: 'Parsons Memorial Library', url: 'https://www.alfredlibrary.org', eventsUrl: 'https://www.alfredlibrary.org/events', city: 'Alfred', state: 'ME', zipCode: '04002', county: 'Alfred County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'ME', zipCode: '04216', county: 'Andover County'},
  { name: 'Ashland Community Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'ME', zipCode: '04732', county: 'Ashland County'},
  { name: 'Patten Free Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'ME', zipCode: '04530', county: 'Bath County'},
  { name: 'Belgrade Public Library', url: 'https://www.belgrademt.gov/', eventsUrl: 'https://www.belgrademt.gov/544/Library', city: 'Belgrade', state: 'ME', zipCode: '04917', county: 'Belgrade County'},
  { name: 'Bethel Library Assn', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'ME', zipCode: '04217', county: 'Bethel County'},
  { name: 'Blue Hill Library', url: 'https://www.bluehilllibrary.org', eventsUrl: 'https://www.bluehilllibrary.org/events', city: 'Blue Hill', state: 'ME', zipCode: '00000', county: 'Blue Hill County'},
  { name: 'Boothbay Harbor Memorial Library', url: 'https://www.boothbayharborlibrary.org', eventsUrl: 'https://www.boothbayharborlibrary.org/events', city: 'Boothbay Harbor', state: 'ME', zipCode: '04538', county: 'Boothbay Harbor County'},
  { name: 'Bowdoinham Public Library', url: 'https://www.bowdoinhamlibrary.org', eventsUrl: 'https://www.bowdoinhamlibrary.org/events', city: 'Bowdoinham', state: 'ME', zipCode: '04008', county: 'Bowdoinham County'},
  { name: 'John B. Curtis Free Public Library', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'ME', zipCode: '04410', county: 'Bradford County'},
  { name: 'Bremen Public Library', url: 'https://www.bremenlibrary.org', eventsUrl: 'https://www.bremenlibrary.org/events', city: 'Bremen', state: 'ME', zipCode: '04551', county: 'Bremen County'},
  { name: 'Bridgton Public Library', url: 'https://www.bridgtonlibrary.org', eventsUrl: 'https://www.bridgtonlibrary.org/events', city: 'Bridgton', state: 'ME', zipCode: '04009', county: 'Bridgton County'},
  { name: 'Brooksville Free Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'ME', zipCode: '04617', county: 'Brooksville County'},
  { name: 'Brownville Public Library', url: 'https://www.brownvillelibrary.org', eventsUrl: 'https://www.brownvillelibrary.org/events', city: 'Brownville', state: 'ME', zipCode: '04414', county: 'Brownville County'},
  { name: 'Canaan Public Library', url: 'https://www.canaanlibrary.org', eventsUrl: 'https://www.canaanlibrary.org/events', city: 'Canaan', state: 'ME', zipCode: '04924', county: 'Canaan County'},
  { name: 'Simpson Memorial Library', url: 'https://carmellibrary.org/', eventsUrl: 'https://carmellibrary.org/calendar/', city: 'Carmel', state: 'ME', zipCode: '04419', county: 'Carmel County'},
  { name: 'Charleston Public Library', url: 'https://charlestonlibrary.org/', eventsUrl: 'https://charlestonlibrary.org/library-events', city: 'Charleston', state: 'ME', zipCode: '04422', county: 'Charleston County'},
  { name: 'Cumberland - Chebeague Island Library', url: 'https://www.chebeaguelibrary.org', eventsUrl: 'https://www.chebeaguelibrary.org/events', city: 'Chebeague', state: 'ME', zipCode: '00000', county: 'Chebeague County'},
  { name: 'Brown Memorial Library - Clinton', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'ME', zipCode: '04927', county: 'Clinton County'},
  { name: 'Prince Memorial Library', url: 'https://www.cumberlandlibrary.org', eventsUrl: 'https://www.cumberlandlibrary.org/events', city: 'Cumberland', state: 'ME', zipCode: '04021', county: 'Cumberland County'},
  { name: 'Louise Clements Library', url: 'https://www.cutlerlibrary.org/', eventsUrl: 'https://www.cutlerlibrary.org/', city: 'Cutler', state: 'ME', zipCode: '04626', county: 'Cutler County'},
  { name: 'Chase Emerson Memorial Library', url: 'https://www.deerislelibrary.org/', eventsUrl: 'https://www.deerislelibrary.org/', city: 'Deer Isle', state: 'ME', zipCode: '04627', county: 'Deer Isle County'},
  { name: 'Lawrence Public Library', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'ME', zipCode: '04937', county: 'Fairfield County'},
  { name: 'Farmington Public Library', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'ME', zipCode: '04938', county: 'Farmington County'},
  { name: 'Underwood Memorial Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'ME', zipCode: '04349', county: 'Fayette County'},
  { name: 'Fort Fairfield Public Library', url: 'https://www.fortfairfieldlibrary.org/', eventsUrl: 'https://www.fortfairfieldlibrary.org/', city: 'Fort Fairfield', state: 'ME', zipCode: '04742', county: 'Fort Fairfield County'},
  { name: 'Frankfort - Pierce Reading Room Library', url: 'https://www.frankfortlibrary.org/', eventsUrl: 'https://www.frankfortlibrary.org/', city: 'Frankfort', state: 'ME', zipCode: '00000', county: 'Frankfort County'},
  { name: 'Freeport Community Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'ME', zipCode: '04032', county: 'Freeport County'},
  { name: 'Gardiner Public Library', url: 'https://www.gardinerlibrary.org/', eventsUrl: 'https://www.gardinerlibrary.org/', city: 'Gardiner', state: 'ME', zipCode: '04345', county: 'Gardiner County'},
  { name: 'Julia Adams Morse Memorial Library', url: 'https://www.greenelibrary.org', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'ME', zipCode: '04236', county: 'Greene County'},
  { name: 'Shaw Public Library - Greenville', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'ME', zipCode: '04441', county: 'Greenville County'},
  { name: 'Bolsters Mills Village Library', url: 'https://www.harrisonpl.org/', eventsUrl: 'https://www.harrisonpl.org/', city: 'Harrison', state: 'ME', zipCode: '04040', county: 'Harrison County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibrary.org', eventsUrl: 'https://www.hartlandlibrary.org/events', city: 'Hartland', state: 'ME', zipCode: '04943', county: 'Hartland County'},
  { name: 'Hollis Center Public Library', url: 'https://www.hollislibrary.org', eventsUrl: 'https://www.hollislibrary.org/events', city: 'Hollis', state: 'ME', zipCode: '04042', county: 'Hollis County'},
  { name: 'Hope Library', url: 'https://www.hopelibrary.org', eventsUrl: 'https://www.hopelibrary.org/events', city: 'Hope', state: 'ME', zipCode: '04847', county: 'Hope County'},
  { name: 'Thomas Free Library', url: 'https://www.howlandlibrary.org', eventsUrl: 'https://www.howlandlibrary.org/events', city: 'Howland', state: 'ME', zipCode: '04448', county: 'Howland County'},
  { name: 'Katahdin Public Library', url: 'https://www.islandfallslibrary.org/', eventsUrl: 'https://www.islandfallslibrary.org/', city: 'Island Falls', state: 'ME', zipCode: '04747', county: 'Island Falls County'},
  { name: 'Parsonsfield Public Library', url: 'https://www.kezarfallslibrary.org/', eventsUrl: 'https://www.kezarfallslibrary.org/upcoming-events', city: 'Kezar Falls', state: 'ME', zipCode: '00000', county: 'Kezar Falls County'},
  { name: 'Lebanon Town Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'ME', zipCode: '04027', county: 'Lebanon County'},
  { name: 'Ivan O. Davis-Liberty Library', url: 'https://libertylibrary.org/', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'ME', zipCode: '04949', county: 'Liberty County'},
  { name: 'Limerick Public Library', url: 'https://www.limericklibrary.org', eventsUrl: 'https://www.limericklibrary.org/events', city: 'Limerick', state: 'ME', zipCode: '04048', county: 'Limerick County'},
  { name: 'Frost Memorial Library', url: 'https://www.limestonelibrary.org/', eventsUrl: 'https://www.limestonelibrary.org/', city: 'Limestone', state: 'ME', zipCode: '00000', county: 'Limestone County'},
  { name: 'Lincoln Memorial Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'ME', zipCode: '04457', county: 'Lincoln County'},
  { name: 'Lyman Community Library', url: 'https://www.lymanlibrary.org/', eventsUrl: 'https://www.lymanlibrary.org/', city: 'Lyman', state: 'ME', zipCode: '04002', county: 'Lyman County'},
  { name: 'Machias - Porter Memorial Library', url: 'https://www.machiaslibrary.org', eventsUrl: 'https://www.machiaslibrary.org/events', city: 'Machias', state: 'ME', zipCode: '00000', county: 'Machias County'},
  { name: 'Madawaska Public Library', url: 'https://www.madawaskalibrary.org', eventsUrl: 'https://www.madawaskalibrary.org/events', city: 'Madawaska', state: 'ME', zipCode: '04756', county: 'Madawaska County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'ME', zipCode: '04950', county: 'Madison County'},
  { name: 'Mercer - Shaw Library', url: 'https://www.mercerlibrary.org', eventsUrl: 'https://www.mercerlibrary.org/events', city: 'Mercer', state: 'ME', zipCode: '00000', county: 'Mercer County'},
  { name: 'Milbridge Public Library', url: 'https://www.milbridgelibrary.org', eventsUrl: 'https://www.milbridgelibrary.org/events', city: 'Milbridge', state: 'ME', zipCode: '04658', county: 'Milbridge County'},
  { name: 'Monroe Community Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'ME', zipCode: '04951', county: 'Monroe County'},
  { name: 'Naples Public Library', url: 'https://www.napleslibrary.org', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'ME', zipCode: '04055', county: 'Naples County'},
  { name: 'New Gloucester Public Library', url: 'https://www.newgloucesterlibrary.org/', eventsUrl: 'https://www.newgloucesterlibrary.org/', city: 'New Gloucester', state: 'ME', zipCode: '04260', county: 'New Gloucester County'},
  { name: 'New Vineyard Public Library', url: 'https://www.newvineyardlibrary.org', eventsUrl: 'https://www.newvineyardlibrary.org/events', city: 'New Vineyard', state: 'ME', zipCode: '04956', county: 'New Vineyard County'},
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'ME', zipCode: '04953', county: 'Newport County'},
  { name: 'North Haven Public Library', url: 'https://www.northhavenlibrary.org', eventsUrl: 'https://www.northhavenlibrary.org/events', city: 'North Haven', state: 'ME', zipCode: '04853', county: 'North Haven County'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'ME', zipCode: '04963', county: 'Oakland County'},
  { name: 'Ogunquit Memorial Library', url: 'https://www.ogunquitlibrary.org', eventsUrl: 'https://www.ogunquitlibrary.org/events', city: 'Ogunquit', state: 'ME', zipCode: '03907', county: 'Ogunquit County'},
  { name: 'Orrs Island Library', url: 'https://www.orrsislandlibrary.org', eventsUrl: 'https://www.orrsislandlibrary.org/events', city: 'Orrs Island', state: 'ME', zipCode: '04066', county: 'Orrs Island County'},
  { name: 'Owls Head Village Library', url: 'https://www.owlsheadlibrary.org', eventsUrl: 'https://www.owlsheadlibrary.org/events', city: 'Owls Head', state: 'ME', zipCode: '04854', county: 'Owls Head County'},
  { name: 'Freeland Holmes Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'ME', zipCode: '04270', county: 'Oxford County'},
  { name: 'Pembroke Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'ME', zipCode: '04666', county: 'Pembroke County'},
  { name: 'Pittsfield Public Library', url: 'https://www.pittsfieldlibrary.org/', eventsUrl: 'https://www.pittsfieldlibrary.org/', city: 'Pittsfield', state: 'ME', zipCode: '04967', county: 'Pittsfield County'},
  { name: 'Mark And Emily Turner Memorial Library', url: 'https://www.presqueislelibrary.org', eventsUrl: 'https://www.presqueislelibrary.org/events', city: 'Presque Isle', state: 'ME', zipCode: '04769', county: 'Presque Isle County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'ME', zipCode: '04668', county: 'Princeton County'},
  { name: 'Rangeley Public Library', url: 'https://www.rangeleylibrary.org', eventsUrl: 'https://www.rangeleylibrary.org/events', city: 'Rangeley', state: 'ME', zipCode: '04970', county: 'Rangeley County'},
  { name: 'Isaac F Umberhine Public Library', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'ME', zipCode: '04357', county: 'Richmond County'},
  { name: 'Rockport Public Library', url: 'https://www.rockportlibrary.org', eventsUrl: 'https://www.rockportlibrary.org/events', city: 'Rockport', state: 'ME', zipCode: '04856', county: 'Rockport County'},
  { name: 'Sargentville Library Assn', url: 'https://www.sargentvillelibrary.org/', eventsUrl: 'https://www.sargentvillelibrary.org/', city: 'Sargentville', state: 'ME', zipCode: '04673', county: 'Sargentville County'},
  { name: 'Sherman Public Library', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'ME', zipCode: '04776', county: 'Sherman County'},
  { name: 'South Berwick Public Library', url: 'https://www.southberwicklibrary.org', eventsUrl: 'https://www.southberwicklibrary.org/events', city: 'South Berwick', state: 'ME', zipCode: '03908', county: 'South Berwick County'},
  { name: 'South China Public Library', url: 'https://www.southchinalibrary.org', eventsUrl: 'https://www.southchinalibrary.org/events', city: 'South China', state: 'ME', zipCode: '04358', county: 'South China County'},
  { name: 'Southport Memorial Library', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'ME', zipCode: '04576', county: 'Southport County'},
  { name: 'Springvale Public Library', url: 'https://www.springvalelibrary.org', eventsUrl: 'https://www.springvalelibrary.org/events', city: 'Springvale', state: 'ME', zipCode: '04083', county: 'Springvale County'},
  { name: 'Standish - Richville Library', url: 'https://standishlibrary.org/', eventsUrl: 'https://standishlibrary.org/', city: 'Standish', state: 'ME', zipCode: '00000', county: 'Standish County'},
  { name: 'Steep Falls Library', url: 'https://www.steepfallslibrary.org', eventsUrl: 'https://www.steepfallslibrary.org/events', city: 'Steep Falls', state: 'ME', zipCode: '04085', county: 'Steep Falls County'},
  { name: 'Henry D. Moore Library', url: 'https://www.steubenlibrary.org', eventsUrl: 'https://www.steubenlibrary.org/events', city: 'Steuben', state: 'ME', zipCode: '04680', county: 'Steuben County'},
  { name: 'Stockton Springs Community Library', url: 'https://www.stocktonspringslibrary.org', eventsUrl: 'https://www.stocktonspringslibrary.org/events', city: 'Stockton Springs', state: 'ME', zipCode: '04981', county: 'Stockton Springs County'},
  { name: 'Stonington Public Library', url: 'https://www.stoningtonlibrary.org/', eventsUrl: 'https://www.stoningtonlibrary.org/', city: 'Stonington', state: 'ME', zipCode: '04681', county: 'Stonington County'},
  { name: 'Frenchmans Bay Library', url: 'https://www.sullivanil.us/', eventsUrl: 'https://www.sullivanil.us/departments/library/index.php', city: 'Sullivan', state: 'ME', zipCode: '04664', county: 'Sullivan County'},
  { name: 'Swans Island Public Library', url: 'https://swansislandeducationalsociety.org/', eventsUrl: 'https://swansislandeducationalsociety.org/events/', city: 'Swans Island', state: 'ME', zipCode: '04685', county: 'Swans Island County'},
  { name: 'Thomaston Public Library', url: 'https://thomastonlibrary.org/', eventsUrl: 'https://thomastonlibrary.org/', city: 'Thomaston', state: 'ME', zipCode: '04861', county: 'Thomaston County'},
  { name: 'Topsham Public Library', url: 'https://www.topshamlibrary.org', eventsUrl: 'https://www.topshamlibrary.org/events', city: 'Topsham', state: 'ME', zipCode: '04086', county: 'Topsham County'},
  { name: 'Vose Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'ME', zipCode: '04862', county: 'Union County'},
  { name: 'Dorothy W Quimby Library', url: 'https://www.unitylibrary.org/', eventsUrl: 'https://www.unitylibrary.org/', city: 'Unity', state: 'ME', zipCode: '04988', county: 'Unity County'},
  { name: 'Abel J.Morneault Memorial Library', url: 'https://www.vbdl.org/', eventsUrl: 'https://www.vbdl.org/events/', city: 'Van Buren', state: 'ME', zipCode: '04785', county: 'Van Buren County'},
  { name: 'Waldoboro Public Library', url: 'https://www.waldoborolibrary.org', eventsUrl: 'https://www.waldoborolibrary.org/events', city: 'Waldoboro', state: 'ME', zipCode: '04572', county: 'Waldoboro County'},
  { name: 'Warren Free Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'ME', zipCode: '04864', county: 'Warren County'},
  { name: 'Washburn Memorial Library', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'ME', zipCode: '04786', county: 'Washburn County'},
  { name: 'Waterford Library Association', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'ME', zipCode: '04088', county: 'Waterford County'},
  { name: 'Wells Public Library', url: 'https://wellslibrary.org/', eventsUrl: 'https://wellslibrary.org/', city: 'Wells', state: 'ME', zipCode: '04090', county: 'Wells County'},
  { name: 'West Paris Public Library', url: 'https://www.westparislibrary.org/', eventsUrl: 'https://www.westparislibrary.org/', city: 'West Paris', state: 'ME', zipCode: '04289', county: 'West Paris County'},
  { name: 'Wilton Free Public Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'ME', zipCode: '04294', county: 'Wilton County'},
  { name: 'Winterport Memorial Library', url: 'https://www.winterportlibrary.org', eventsUrl: 'https://www.winterportlibrary.org/events', city: 'Winterport', state: 'ME', zipCode: '04496', county: 'Winterport County'},
  { name: 'Bailey Public Library', url: 'https://www.winthroplibrary.org/', eventsUrl: 'https://www.winthroplibrary.org/', city: 'Winthrop', state: 'ME', zipCode: '04364', county: 'Winthrop County'},
  { name: 'Merrill Memorial Library', url: 'https://www.yarmouthlibrary.org', eventsUrl: 'https://www.yarmouthlibrary.org/events', city: 'Yarmouth', state: 'ME', zipCode: '04096', county: 'Yarmouth County'},
  { name: 'York Public Library', url: 'https://yorklibrary.org/', eventsUrl: 'https://yorklibrary.org/', city: 'York', state: 'ME', zipCode: '03909', county: 'York County'}

];

const SCRAPER_NAME = 'wordpress-ME';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'ME', city: library.city, zipCode: library.zipCode }}));
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
    state: 'ME',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMECloudFunction() {
  console.log('☁️ Running WordPress ME as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-ME', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-ME', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMECloudFunction };
