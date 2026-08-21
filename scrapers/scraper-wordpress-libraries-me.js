// 14 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { tryFetchTecEvents, tryDomScrapeTecEvents } = require('./helpers/tec-rest-helper');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const ngeohash = require('ngeohash');
/**
 * Maine Public Libraries Scraper - Coverage: All Maine public libraries
 */
const LIBRARIES = [
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.com', eventsUrl: 'https://www.portlandlibrary.com/events', city: 'Portland', state: 'ME', zipCode: '04101', county: 'Cumberland'},
  { name: 'Bangor Public Library', url: 'https://bangorpubliclibrary.org/', eventsUrl: 'https://bangorpubliclibrary.org/', city: 'Bangor', state: 'ME', zipCode: '04401', county: 'Penobscot'},
  { name: 'Lewiston Public Library', url: 'https://www.lplonline.org', eventsUrl: 'https://www.lplonline.org/events', city: 'Lewiston', state: 'ME', zipCode: '04240', county: 'Androscoggin'},
  { name: 'Auburn Public Library', url: 'https://www.auburnpubliclibrary.org', eventsUrl: 'https://www.auburnpubliclibrary.org/events', city: 'Auburn', state: 'ME', zipCode: '04210', county: 'Androscoggin'},
  { name: 'South Portland Public Library', url: 'https://www.southportlandlibrary.com', eventsUrl: 'https://www.southportlandlibrary.com/events', city: 'South Portland', state: 'ME', zipCode: '04106', county: 'Cumberland'},
  { name: 'Biddeford-McArthur Library', url: 'https://www.mcarthurlibrary.org', eventsUrl: 'https://www.mcarthurlibrary.org/events', city: 'Biddeford', state: 'ME', zipCode: '04005', county: 'York'},
  { name: 'Augusta - Lithgow Public Library', url: 'https://www.lithgowlibrary.org/', eventsUrl: 'https://www.lithgowlibrary.org/', city: 'Augusta', state: 'ME', zipCode: '04330', county: 'Kennebec'},
  { name: 'Scarborough Public Library', url: 'https://www.scarboroughlibrary.org', eventsUrl: 'https://www.scarboroughlibrary.org/events', city: 'Scarborough', state: 'ME', zipCode: '04074', county: 'Cumberland'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'ME', zipCode: '04901', county: 'Kennebec'},
  // URL corrected 2026-08-11 (was westbrooklibrary.org): 800 Main St Westbrook ME, phone 207-854-0630. NOTE real institution is Walker Memorial Library - configured NAME is wrong. westbrooklibrary.
  { name: 'Westbrook Public Library', url: 'https://walkerlibrary.org', eventsUrl: 'https://walkerlibrary.org', city: 'Westbrook', state: 'ME', zipCode: '04092', county: 'Cumberland'},
  { name: 'Brunswick Curtis Memorial Library', url: 'https://curtislibrary.com/', eventsUrl: 'https://curtislibrary.com/', city: 'Brunswick', state: 'ME', zipCode: '04011', county: 'Cumberland'},
  { name: 'Gorham Baxter Memorial Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Gorham', state: 'ME', zipCode: '04038', county: 'Cumberland'},
  { name: 'Windham Public Library', url: 'https://www.windham.lib.me.us/', eventsUrl: 'https://www.windham.lib.me.us/calendar', city: 'Windham', state: 'ME', zipCode: '04062', county: 'Cumberland County'},
  { name: 'Kennebunk Free Library', url: 'https://kennebunklibrary.org/', eventsUrl: 'https://kennebunklibrary.org/calendar/', city: 'Kennebunk', state: 'ME', zipCode: '04043', county: 'York'},
  { name: 'Belfast Free Library', url: 'https://www.belfastlibrary.org', eventsUrl: 'https://www.belfastlibrary.org/events', city: 'Belfast', state: 'ME', zipCode: '04915', county: 'Waldo'},
  { name: 'Rockland Public Library', url: 'https://www.rocklandlibrary.org', eventsUrl: 'https://www.rocklandlibrary.org/events', city: 'Rockland', state: 'ME', zipCode: '04841', county: 'Knox'},
  { name: 'Camden Public Library', url: 'https://www.librarycamden.org', eventsUrl: 'https://www.librarycamden.org/events', city: 'Camden', state: 'ME', zipCode: '04843', county: 'Knox'},
  // Additional libraries from spreadsheet coverage expansion
  // URL corrected 2026-08-11 (was actonlibrary.org): Own site; 35 H Road Acton ME 04001, phone 207-636-2781, York County. Maine State Library also lists alias acton.lib.me.us
  { name: 'Acton Public Library', url: 'https://actonpublib.wixsite.com/acton', eventsUrl: 'https://actonpublib.wixsite.com/acton', city: 'Acton', state: 'ME', zipCode: '04001', county: 'York'},
  // REMOVED 2026-08-11 (Defect A): no verifiable official site. Mayhew Library 290 Water St Addison ME 04606, 207-598-8350 per town site addisonmaine.org, but library has no website of its own - only a Facebook pag
  // RECORDED COVERAGE GAP - restore if a real URL is found.
  // { name: 'Mayhew Library Assn', url: 'https://www.addisonlibrary.org', eventsUrl: 'https://www.addisonlibrary.org/events', city: 'Addison', state: 'ME', zipCode: '04606', county: 'Washington'},
  // URL corrected 2026-08-11 (was albionlibrary.org): Town of Albion Maine page gives 18 Main Street, Box 355, Albion ME 04910, phone 207-437-2220; no separate calendar page
  { name: 'Albion Public Library', url: 'https://townofalbionmaine.com/community/albion-public-library', eventsUrl: 'https://townofalbionmaine.com/community/albion-public-library', city: 'Albion', state: 'ME', zipCode: '04910', county: 'Kennebec'},
  { name: 'Parsons Memorial Library', url: 'https://www.alfredlibrary.org', eventsUrl: 'https://www.alfredlibrary.org/events', city: 'Alfred', state: 'ME', zipCode: '04002', county: 'York'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'ME', zipCode: '04216', county: 'Oxford'},
  { name: 'Patten Free Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'ME', zipCode: '04530', county: 'Sagadahoc', urlCollision: 'bathlibrary.org is KY, not ME' },
  { name: 'Belgrade Public Library', url: 'https://www.belgrademt.gov/', eventsUrl: 'https://www.belgrademt.gov/544/Library', city: 'Belgrade', state: 'ME', zipCode: '04917', county: 'Kennebec'},
  { name: 'Bethel Library Assn', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'ME', zipCode: '04217', county: 'Oxford'},
  { name: 'Blue Hill Library', url: 'https://www.bluehilllibrary.org', eventsUrl: 'https://www.bluehilllibrary.org/events', city: 'Blue Hill', state: 'ME', zipCode: '00000', county: 'Hancock'},
  { name: 'Boothbay Harbor Memorial Library', url: 'https://www.boothbayharborlibrary.org', eventsUrl: 'https://www.boothbayharborlibrary.org/events', city: 'Boothbay Harbor', state: 'ME', zipCode: '04538', county: 'Lincoln'},
  { name: 'Bowdoinham Public Library', url: 'https://www.bowdoinhamlibrary.org', eventsUrl: 'https://www.bowdoinhamlibrary.org/events', city: 'Bowdoinham', state: 'ME', zipCode: '04008', county: 'Sagadahoc'},
  { name: 'John B. Curtis Free Public Library', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'ME', zipCode: '04410', county: 'Penobscot'},
  { name: 'Bremen Public Library', url: 'https://www.bremenlibrary.org', eventsUrl: 'https://www.bremenlibrary.org/events', city: 'Bremen', state: 'ME', zipCode: '04551', county: 'Lincoln'},
  { name: 'Bridgton Public Library', url: 'https://www.bridgtonlibrary.org', eventsUrl: 'https://www.bridgtonlibrary.org/events', city: 'Bridgton', state: 'ME', zipCode: '04009', county: 'Cumberland'},
  { name: 'Brooksville Free Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'ME', zipCode: '04617', county: 'Hancock'},
  { name: 'Brownville Public Library', url: 'https://www.brownvillelibrary.org', eventsUrl: 'https://www.brownvillelibrary.org/events', city: 'Brownville', state: 'ME', zipCode: '04414', county: 'Piscataquis'},
  // URL corrected 2026-08-11 (was carmellibrary.org): Site lists 8 Plymouth Road (Route 69), Carmel ME 04419, phone 207-848-7145. carmellibrary.org is Reed Memorial Library in Carmel NY
  { name: 'Simpson Memorial Library', url: 'https://www.simpsonmemorial.org', eventsUrl: 'https://www.simpsonmemorial.org/news', city: 'Carmel', state: 'ME', zipCode: '04419', county: 'Penobscot'},
  { name: 'Cumberland - Chebeague Island Library', url: 'https://www.chebeaguelibrary.org', eventsUrl: 'https://www.chebeaguelibrary.org/events', city: 'Chebeague Island', state: 'ME', zipCode: '04017', county: 'Cumberland County'},
  { name: 'Brown Memorial Library - Clinton', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'ME', zipCode: '04927', county: 'Kennebec'},
  // URL corrected 2026-08-11 (was cumberlandlibrary.org): Site lists 266 Main Street, Cumberland ME 04021, phone 207-829-2215. cumberlandlibrary.org is Cumberland RI
  { name: 'Prince Memorial Library', url: 'https://www.princememorial.org', eventsUrl: 'https://princememorial.librarycalendar.com/events/upcoming', city: 'Cumberland', state: 'ME', zipCode: '04021', county: 'Cumberland County'},
  { name: 'Louise Clements Library', url: 'https://www.cutlerlibrary.org/', eventsUrl: 'https://www.cutlerlibrary.org/', city: 'Cutler', state: 'ME', zipCode: '04626', county: 'Washington'},
  { name: 'Chase Emerson Memorial Library', url: 'https://www.deerislelibrary.org/', eventsUrl: 'https://www.deerislelibrary.org/', city: 'Deer Isle', state: 'ME', zipCode: '04627', county: 'Hancock'},
  // URL corrected 2026-08-11 (was fairfieldlibrary.org): Town of Fairfield ME official site; 19 Lawrence Avenue PO Box 149 Fairfield ME 04937, phone 207-453-6867
  { name: 'Lawrence Public Library', url: 'https://www.fairfield-me.gov/227/Lawrence-Public-Library', eventsUrl: 'https://www.fairfield-me.gov/227/Lawrence-Public-Library', city: 'Fairfield', state: 'ME', zipCode: '04937', county: 'Somerset'},
  { name: 'Farmington Public Library', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'ME', zipCode: '04938', county: 'Franklin'},
  { name: 'Fort Fairfield Public Library', url: 'https://www.fortfairfieldlibrary.org/', eventsUrl: 'https://www.fortfairfieldlibrary.org/', city: 'Fort Fairfield', state: 'ME', zipCode: '04742', county: 'Aroostook'},
  { name: 'Freeport Community Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'ME', zipCode: '04032', county: 'Cumberland'},
  { name: 'Gardiner Public Library', url: 'https://www.gardinerlibrary.org/', eventsUrl: 'https://www.gardinerlibrary.org/', city: 'Gardiner', state: 'ME', zipCode: '04345', county: 'Kennebec'},
  { name: 'Julia Adams Morse Memorial Library', url: 'https://www.greenelibrary.org', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'ME', zipCode: '04236', county: 'Androscoggin County'},
  // URL collision fixed 2026-08-05. Same greenvillelibrary.org collision that
  // hit WordPress-NY: that domain is the Greenville County Library System in
  // SOUTH CAROLINA, and this entry was ingesting 25 of its events under a Maine
  // label. Repointed to the real Shaw Public Library, verified live: 9 Lily Bay
  // Road, Greenville ME 04441, matching this entry's own ZIP, with real dated
  // events on /events/.
  { name: 'Shaw Public Library - Greenville', url: 'https://shawpubliclibrary.org', eventsUrl: 'https://shawpubliclibrary.org/events/', city: 'Greenville', state: 'ME', zipCode: '04441', county: 'Piscataquis'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibrary.org', eventsUrl: 'https://www.hartlandlibrary.org/events', city: 'Hartland', state: 'ME', zipCode: '04943', county: 'Somerset'},
  // URL corrected 2026-08-11 (was hollislibrary.org): Own site; 14 Little Falls Road Hollis Center Maine 04042, phone 207-929-3911
  { name: 'Hollis Center Public Library', url: 'https://www.holliscenterpubliclibrary.org', eventsUrl: 'https://www.holliscenterpubliclibrary.org', city: 'Hollis', state: 'ME', zipCode: '04042', county: 'York County'},
  { name: 'Thomas Free Library', url: 'https://www.howlandlibrary.org', eventsUrl: 'https://www.howlandlibrary.org/events', city: 'Howland', state: 'ME', zipCode: '04448', county: 'Penobscot'},
  { name: 'Katahdin Public Library', url: 'https://www.islandfallslibrary.org/', eventsUrl: 'https://www.islandfallslibrary.org/', city: 'Island Falls', state: 'ME', zipCode: '04747', county: 'Aroostook'},
  { name: 'Parsonsfield Public Library', url: 'https://www.kezarfallslibrary.org/', eventsUrl: 'https://www.kezarfallslibrary.org/upcoming-events', city: 'Kezar Falls', state: 'ME', zipCode: '00000', county: 'Oxford'},
  { name: 'Lebanon Town Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'ME', zipCode: '04027', county: 'York'},
  // URL corrected 2026-08-11 (was libertylibrary.org): 59 Main St Liberty ME, PO Box 280 Liberty ME 04949, phone 207-589-3161. Site calls itself Liberty Library
  { name: 'Ivan O. Davis-Liberty Library', url: 'https://liberty.lib.me.us', eventsUrl: 'https://liberty.lib.me.us/calendar/', city: 'Liberty', state: 'ME', zipCode: '04949', county: 'Waldo'},
  { name: 'Limerick Public Library', url: 'https://www.limericklibrary.org', eventsUrl: 'https://www.limericklibrary.org/events', city: 'Limerick', state: 'ME', zipCode: '04048', county: 'York'},
  { name: 'Frost Memorial Library', url: 'https://www.limestonelibrary.org/', eventsUrl: 'https://www.limestonelibrary.org/', city: 'Limestone', state: 'ME', zipCode: '00000', county: 'Aroostook'},
  { name: 'Lyman Community Library', url: 'https://www.lymanlibrary.org/', eventsUrl: 'https://www.lymanlibrary.org/', city: 'Lyman', state: 'ME', zipCode: '04002', county: 'York County'},
  { name: 'Machias - Porter Memorial Library', url: 'https://www.machiaslibrary.org', eventsUrl: 'https://www.machiaslibrary.org/events', city: 'Machias', state: 'ME', zipCode: '00000', county: 'Washington', urlCollision: 'machiaslibrary.org is NY, not ME' },
  { name: 'Madawaska Public Library', url: 'https://www.madawaskalibrary.org', eventsUrl: 'https://www.madawaskalibrary.org/events', city: 'Madawaska', state: 'ME', zipCode: '04756', county: 'Aroostook'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'ME', zipCode: '04950', county: 'Somerset', urlCollision: 'madisonlibrary.org is KY, not ME' },
  { name: 'Mercer - Shaw Library', url: 'https://www.mercerlibrary.org', eventsUrl: 'https://www.mercerlibrary.org/events', city: 'Mercer', state: 'ME', zipCode: '00000', county: 'Somerset'},
  { name: 'Milbridge Public Library', url: 'https://www.milbridgelibrary.org', eventsUrl: 'https://www.milbridgelibrary.org/events', city: 'Milbridge', state: 'ME', zipCode: '04658', county: 'Washington'},
  { name: 'Monroe Community Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'ME', zipCode: '04951', county: 'Waldo'},
  { name: 'New Gloucester Public Library', url: 'https://www.newgloucesterlibrary.org/', eventsUrl: 'https://www.newgloucesterlibrary.org/', city: 'New Gloucester', state: 'ME', zipCode: '04260', county: 'Cumberland'},
  { name: 'New Vineyard Public Library', url: 'https://www.newvineyardlibrary.org', eventsUrl: 'https://www.newvineyardlibrary.org/events', city: 'New Vineyard', state: 'ME', zipCode: '04956', county: 'Franklin'},
  { name: 'North Haven Public Library', url: 'https://www.northhavenlibrary.org', eventsUrl: 'https://www.northhavenlibrary.org/events', city: 'North Haven', state: 'ME', zipCode: '04853', county: 'Knox'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'ME', zipCode: '04963', county: 'Kennebec', urlCollision: 'oaklandlibrary.org is CA, not ME' },
  { name: 'Ogunquit Memorial Library', url: 'https://www.ogunquitlibrary.org', eventsUrl: 'https://www.ogunquitlibrary.org/events', city: 'Ogunquit', state: 'ME', zipCode: '03907', county: 'York'},
  { name: 'Orrs Island Library', url: 'https://www.orrsislandlibrary.org', eventsUrl: 'https://www.orrsislandlibrary.org/events', city: 'Orrs Island', state: 'ME', zipCode: '04066', county: 'Cumberland'},
  { name: 'Owls Head Village Library', url: 'https://www.owlsheadlibrary.org', eventsUrl: 'https://www.owlsheadlibrary.org/events', city: 'Owls Head', state: 'ME', zipCode: '04854', county: 'Knox'},
  { name: 'Freeland Holmes Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'ME', zipCode: '04270', county: 'Oxford County'},
  { name: 'Pembroke Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'ME', zipCode: '04666', county: 'Washington'},
  // URL corrected 2026-08-11 (was pittsfieldlibrary.org): Site shows 110 Library Street, Pittsfield ME 04967, phone 207-487-5880, Carnegie library serving Pittsfield/Burnham/Detroit
  { name: 'Pittsfield Public Library', url: 'https://www.pittsfield.lib.me.us/', eventsUrl: 'https://www.pittsfield.lib.me.us/events/', city: 'Pittsfield', state: 'ME', zipCode: '04967', county: 'Somerset'},
  { name: 'Mark And Emily Turner Memorial Library', url: 'https://www.presqueislelibrary.org', eventsUrl: 'https://www.presqueislelibrary.org/events', city: 'Presque Isle', state: 'ME', zipCode: '04769', county: 'Aroostook'},
  { name: 'Rangeley Public Library', url: 'https://www.rangeleylibrary.org', eventsUrl: 'https://www.rangeleylibrary.org/events', city: 'Rangeley', state: 'ME', zipCode: '04970', county: 'Franklin'},
  // URL corrected 2026-08-11 (was rockportlibrary.org): 1 Limerock Street Rockport ME 04856, phone 207-236-3642. Verified rockportlibrary.org is Rockport MASSACHUSETTS - 17 School St, 978 area cod
  { name: 'Rockport Public Library', url: 'https://www.rockport.lib.me.us', eventsUrl: 'https://www.rockport.lib.me.us', city: 'Rockport', state: 'ME', zipCode: '04856', county: 'Knox'},
  { name: 'Sargentville Library Assn', url: 'https://www.sargentvillelibrary.org/', eventsUrl: 'https://www.sargentvillelibrary.org/', city: 'Sargentville', state: 'ME', zipCode: '04673', county: 'Hancock'},
  { name: 'Sherman Public Library', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'ME', zipCode: '04776', county: 'Aroostook'},
  { name: 'South Berwick Public Library', url: 'https://www.southberwicklibrary.org', eventsUrl: 'https://www.southberwicklibrary.org/events', city: 'South Berwick', state: 'ME', zipCode: '03908', county: 'York'},
  { name: 'South China Public Library', url: 'https://www.southchinalibrary.org', eventsUrl: 'https://www.southchinalibrary.org/events', city: 'South China', state: 'ME', zipCode: '04358', county: 'Kennebec'},
  { name: 'Southport Memorial Library', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'ME', zipCode: '04576', county: 'Lincoln'},
  { name: 'Springvale Public Library', url: 'https://www.springvalelibrary.org', eventsUrl: 'https://www.springvalelibrary.org/events', city: 'Springvale', state: 'ME', zipCode: '04083', county: 'York'},
  { name: 'Standish - Richville Library', url: 'https://standishlibrary.org/', eventsUrl: 'https://standishlibrary.org/', city: 'Standish', state: 'ME', zipCode: '00000', county: 'Cumberland'},
  { name: 'Steep Falls Library', url: 'https://www.steepfallslibrary.org', eventsUrl: 'https://www.steepfallslibrary.org/events', city: 'Steep Falls', state: 'ME', zipCode: '04085', county: 'Cumberland'},
  { name: 'Henry D. Moore Library', url: 'https://www.steubenlibrary.org', eventsUrl: 'https://www.steubenlibrary.org/events', city: 'Steuben', state: 'ME', zipCode: '04680', county: 'Washington'},
  { name: 'Stockton Springs Community Library', url: 'https://www.stocktonspringslibrary.org', eventsUrl: 'https://www.stocktonspringslibrary.org/events', city: 'Stockton Springs', state: 'ME', zipCode: '04981', county: 'Waldo'},
  { name: 'Stonington Public Library', url: 'https://www.stoningtonlibrary.org/', eventsUrl: 'https://www.stoningtonlibrary.org/', city: 'Stonington', state: 'ME', zipCode: '04681', county: 'Hancock'},
  { name: 'Frenchmans Bay Library', url: 'https://www.sullivanil.us/', eventsUrl: 'https://www.sullivanil.us/departments/library/index.php', city: 'Sullivan', state: 'ME', zipCode: '04664', county: 'Hancock'},
  { name: 'Swans Island Public Library', url: 'https://swansislandeducationalsociety.org/', eventsUrl: 'https://swansislandeducationalsociety.org/events/', city: 'Swans Island', state: 'ME', zipCode: '04685', county: 'Hancock'},
  { name: 'Thomaston Public Library', url: 'https://thomastonlibrary.org/', eventsUrl: 'https://thomastonlibrary.org/', city: 'Thomaston', state: 'ME', zipCode: '04861', county: 'Knox'},
  { name: 'Topsham Public Library', url: 'https://www.topshamlibrary.org', eventsUrl: 'https://www.topshamlibrary.org/events', city: 'Topsham', state: 'ME', zipCode: '04086', county: 'Sagadahoc'},
  { name: 'Vose Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'ME', zipCode: '04862', county: 'Knox', urlCollision: 'unionlibrary.org is SC, not ME' },
  { name: 'Abel J.Morneault Memorial Library', url: 'https://www.vbdl.org/', eventsUrl: 'https://www.vbdl.org/events/', city: 'Van Buren', state: 'ME', zipCode: '04785', county: 'Aroostook'},
  { name: 'Waldoboro Public Library', url: 'https://www.waldoborolibrary.org', eventsUrl: 'https://www.waldoborolibrary.org/events', city: 'Waldoboro', state: 'ME', zipCode: '04572', county: 'Lincoln'},
  { name: 'Warren Free Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'ME', zipCode: '04864', county: 'Knox'},
  // URL corrected 2026-08-11 (was washburnlibrary.org): Site shows 1290 Main Street, Washburn ME 04786, phone 207-455-2016, Aroostook County
  { name: 'Washburn Memorial Library', url: 'https://www.washburnlibrary.com/', eventsUrl: 'https://www.washburnlibrary.com/calendar', city: 'Washburn', state: 'ME', zipCode: '04786', county: 'Aroostook'},
  { name: 'Waterford Library Association', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'ME', zipCode: '04088', county: 'Oxford County'},
  { name: 'Wells Public Library', url: 'https://wellslibrary.org/', eventsUrl: 'https://wellslibrary.org/', city: 'Wells', state: 'ME', zipCode: '04090', county: 'York'},
  { name: 'West Paris Public Library', url: 'https://www.westparislibrary.org/', eventsUrl: 'https://www.westparislibrary.org/', city: 'West Paris', state: 'ME', zipCode: '04289', county: 'Oxford'},
  { name: 'Wilton Free Public Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'ME', zipCode: '04294', county: 'Franklin'},
  { name: 'Winterport Memorial Library', url: 'https://www.winterportlibrary.org', eventsUrl: 'https://www.winterportlibrary.org/events', city: 'Winterport', state: 'ME', zipCode: '04496', county: 'Waldo'},
  { name: 'Merrill Memorial Library', url: 'https://www.yarmouthlibrary.org', eventsUrl: 'https://www.yarmouthlibrary.org/events', city: 'Yarmouth', state: 'ME', zipCode: '04096', county: 'Cumberland'},
  { name: 'York Public Library', url: 'https://yorklibrary.org/', eventsUrl: 'https://yorklibrary.org/', city: 'York', state: 'ME', zipCode: '03909', county: 'York County'}

];

const SCRAPER_NAME = 'wordpress-ME';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
      // An entry carrying urlCollision points at a DIFFERENT institution than its own
      // name and state claim — the guessed {city}library.org host actually belongs to
      // another state's library. Scraping it imported that library's events under this
      // state. See scripts/disable-collided-urls.js for the per-host evidence.
      // The 📍 header above and the "Found 0 events" line below are BOTH required: the
      // library-site audit pairs them, and dropping the pair would delete this library
      // from the audit instead of showing it as a known, explained gap.
      if (library.urlCollision) {
        console.log(`   ⏭️  skipped — urlCollision: ${library.urlCollision}`);
        console.log(`   Found 0 events`);
        continue;
      }
    try {
      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'ME', city: library.city, zipCode: library.zipCode }}));
        continue;
      }
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // REST API can be reachable-but-403 even on a genuinely TEC-powered
      // site — tryFetchTecEvents() already returned null above in that case.
      // Try TEC's own DOM structure before falling back to fully generic
      // selectors, which can't tell a real event card from the calendar's
      // own day-heading badge on TEC's list-view markup (found 2026-08-08 on
      // WordPress-GA/New Georgia Public Library — see tec-rest-helper.js).
      const domTecEvents = await tryDomScrapeTecEvents(page, library.name);
      if (domTecEvents && domTecEvents.length > 0) {
        domTecEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'wordpress-tec-dom',
            state: 'ME',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Structured schema.org data beats any DOM guess, so try it before scraping markup.
      // Found 2026-08-09: 20 of the family's open MISMATCH bugs sit on pages that already
      // publish <script type="application/ld+json"> Event objects — 59 on Brownell, 107 on
      // Brandywine Zoo — which the generic selectors below miss entirely. startDate is a
      // real ISO timestamp, so this also avoids the time-only values behind this family's
      // InvalidDate counts, and location.address geocodes to the venue not a centroid.
      const jsonLdEvents = extractJsonLdEvents(await page.content(), library.name);
      if (jsonLdEvents.length > 0) {
        jsonLdEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'jsonld',
            state: event.state || library.state || 'ME',
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

            const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        // Calendar-grid sites (e.g. Drupal "Library Calendar" / lc-event
        // widgets, seen live on ypl.org/events) render each day as a
        // day-cell container carrying the real date, while the individual
        // event cards inside only show a clock time with no day/month at
        // all. Walk up from the event card looking for that ancestor date
        // before giving up. Confirmed live 2026-07-20: ypl.org day cells
        // have <div class="calendar__day" data-date="2026-06-28"><h2
        // class="calendar__day-header">Sunday, June 28, 2026</h2>...
        function findAncestorDate(el) {
          let node = el;
          for (let i = 0; i < 8 && node; i++) {
            if (node.getAttribute) {
              const attr = node.getAttribute('data-date') || node.getAttribute('data-current_date') || node.getAttribute('data-day');
              if (attr && /\d{4}-\d{1,2}-\d{1,2}/.test(attr)) return attr;
              const header = node.querySelector && node.querySelector('.calendar__day-header, [class*="day-header"]');
              if (header && header.textContent.trim()) return header.textContent.trim();
            }
            node = node.parentElement;
          }
          return null;
        }
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            let dateText = date ? date.textContent.trim() : '';
            // If the card's own date text has no day/month at all (bare
            // clock time like "8:30am-12:30pm"), fall back to the
            // ancestor day-cell date and combine it with the time text.
            if (!/[A-Za-z]{3,9}\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/.test(dateText)) {
              const ancestorDate = findAncestorDate(card);
              if (ancestorDate) dateText = dateText ? `${ancestorDate} ${dateText}` : ancestorDate;
            }
            events.push({ title: title.textContent.trim(), date: dateText, ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'ME', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
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
