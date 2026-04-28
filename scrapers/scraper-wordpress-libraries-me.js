const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Maine Public Libraries Scraper - Coverage: All Maine public libraries
 */
const LIBRARIES = [
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.com', eventsUrl: 'https://www.portlandlibrary.com/events', city: 'Portland', state: 'ME', zipCode: '04101', county: 'Portland County'},
  { name: 'Bangor Public Library', url: 'https://www.bangorpubliclibrary.org', eventsUrl: 'https://www.bangorpubliclibrary.org/events', city: 'Bangor', state: 'ME', zipCode: '04401', county: 'Bangor County'},
  { name: 'Lewiston Public Library', url: 'https://www.lplonline.org', eventsUrl: 'https://www.lplonline.org/events', city: 'Lewiston', state: 'ME', zipCode: '04240', county: 'Lewiston County'},
  { name: 'Auburn Public Library', url: 'https://www.auburnpubliclibrary.org', eventsUrl: 'https://www.auburnpubliclibrary.org/events', city: 'Auburn', state: 'ME', zipCode: '04210', county: 'Auburn County'},
  { name: 'South Portland Public Library', url: 'https://www.southportlandlibrary.com', eventsUrl: 'https://www.southportlandlibrary.com/events', city: 'South Portland', state: 'ME', zipCode: '04106', county: 'South Portland County'},
  { name: 'Sanford Public Library', url: 'https://www.sanfordlibrary.org', eventsUrl: 'https://www.sanfordlibrary.org/events', city: 'Sanford', state: 'ME', zipCode: '04073', county: 'Sanford County'},
  { name: 'Biddeford-McArthur Library', url: 'https://www.mcarthurlibrary.org', eventsUrl: 'https://www.mcarthurlibrary.org/events', city: 'Biddeford', state: 'ME', zipCode: '04005', county: 'Biddeford County'},
  { name: 'Augusta - Lithgow Public Library', url: 'https://www.lithgowlibrary.org', eventsUrl: 'https://www.lithgowlibrary.org/events', city: 'Augusta', state: 'ME', zipCode: '04330', county: 'Augusta County'},
  { name: 'Scarborough Public Library', url: 'https://www.scarboroughlibrary.org', eventsUrl: 'https://www.scarboroughlibrary.org/events', city: 'Scarborough', state: 'ME', zipCode: '04074', county: 'Scarborough County'},
  { name: 'Saco Public Library', url: 'https://www.sacopubliclibrary.org', eventsUrl: 'https://www.sacopubliclibrary.org/events', city: 'Saco', state: 'ME', zipCode: '04072', county: 'Saco County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'ME', zipCode: '04901', county: 'Waterville County'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'ME', zipCode: '04092', county: 'Westbrook County'},
  { name: 'Brunswick Curtis Memorial Library', url: 'https://www.curtislibrary.com', eventsUrl: 'https://www.curtislibrary.com/events', city: 'Brunswick', state: 'ME', zipCode: '04011', county: 'Brunswick County'},
  { name: 'Gorham Baxter Memorial Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Gorham', state: 'ME', zipCode: '04038', county: 'Gorham County'},
  { name: 'Windham Public Library', url: 'https://www.windham.lib.me.us', eventsUrl: 'https://www.windham.lib.me.us/events', city: 'Windham', state: 'ME', zipCode: '04062', county: 'Windham County'},
  { name: 'Kennebunk Free Library', url: 'https://www.kennebunklibrary.org', eventsUrl: 'https://www.kennebunklibrary.org/events', city: 'Kennebunk', state: 'ME', zipCode: '04043', county: 'Kennebunk County'},
  { name: 'Belfast Free Library', url: 'https://www.belfastlibrary.org', eventsUrl: 'https://www.belfastlibrary.org/events', city: 'Belfast', state: 'ME', zipCode: '04915', county: 'Belfast County'},
  { name: 'Rockland Public Library', url: 'https://www.rocklandlibrary.org', eventsUrl: 'https://www.rocklandlibrary.org/events', city: 'Rockland', state: 'ME', zipCode: '04841', county: 'Rockland County'},
  { name: 'Camden Public Library', url: 'https://www.librarycamden.org', eventsUrl: 'https://www.librarycamden.org/events', city: 'Camden', state: 'ME', zipCode: '04843', county: 'Camden County'},
  { name: 'Ellsworth Public Library', url: 'https://www.ellsworthpubliclibrary.net', eventsUrl: 'https://www.ellsworthpubliclibrary.net/events', city: 'Ellsworth', state: 'ME', zipCode: '04605', county: 'Ellsworth County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Acton Public Library', url: 'https://www.actonlibrary.org', eventsUrl: 'https://www.actonlibrary.org/events', city: 'Acton', state: 'ME', zipCode: '04001', county: 'Acton County'},
  { name: 'Mayhew Library Assn', url: 'https://www.addisonlibrary.org', eventsUrl: 'https://www.addisonlibrary.org/events', city: 'Addison', state: 'ME', zipCode: '04606', county: 'Addison County'},
  { name: 'Albion Public Library', url: 'https://www.albionlibrary.org', eventsUrl: 'https://www.albionlibrary.org/events', city: 'Albion', state: 'ME', zipCode: '04910', county: 'Albion County'},
  { name: 'Parsons Memorial Library', url: 'https://www.alfredlibrary.org', eventsUrl: 'https://www.alfredlibrary.org/events', city: 'Alfred', state: 'ME', zipCode: '04002', county: 'Alfred County'},
  { name: 'Allagash Public Library', url: 'https://www.allagashlibrary.org', eventsUrl: 'https://www.allagashlibrary.org/events', city: 'Allagash', state: 'ME', zipCode: '00000', county: 'Allagash County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'ME', zipCode: '04216', county: 'Andover County'},
  { name: 'Milldred Stevens Williams Memorial Library', url: 'https://www.appletonlibrary.org', eventsUrl: 'https://www.appletonlibrary.org/events', city: 'Appleton', state: 'ME', zipCode: '04862', county: 'Appleton County'},
  { name: 'Ashland Community Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'ME', zipCode: '04732', county: 'Ashland County'},
  { name: 'Woodland Public Library', url: 'https://www.baileyvillelibrary.org', eventsUrl: 'https://www.baileyvillelibrary.org/events', city: 'Baileyville', state: 'ME', zipCode: '04694', county: 'Baileyville County'},
  { name: 'Jesup Memorial Library', url: 'https://www.barharborlibrary.org', eventsUrl: 'https://www.barharborlibrary.org/events', city: 'Bar Harbor', state: 'ME', zipCode: '04609', county: 'Bar Harbor County'},
  { name: 'Berry Memorial Library', url: 'https://www.barmillslibrary.org', eventsUrl: 'https://www.barmillslibrary.org/events', city: 'Bar Mills', state: 'ME', zipCode: '04004', county: 'Bar Mills County'},
  { name: 'Patten Free Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'ME', zipCode: '04530', county: 'Bath County'},
  { name: 'Belgrade Public Library', url: 'https://www.belgradelibrary.org', eventsUrl: 'https://www.belgradelibrary.org/events', city: 'Belgrade', state: 'ME', zipCode: '04917', county: 'Belgrade County'},
  { name: 'Bass Harbor Memorial Library', url: 'https://www.bernardlibrary.org', eventsUrl: 'https://www.bernardlibrary.org/events', city: 'Bernard', state: 'ME', zipCode: '04612', county: 'Bernard County'},
  { name: 'Berwick Public Library', url: 'https://www.berwicklibrary.org', eventsUrl: 'https://www.berwicklibrary.org/events', city: 'Berwick', state: 'ME', zipCode: '03901', county: 'Berwick County'},
  { name: 'Bethel Library Assn', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'ME', zipCode: '04217', county: 'Bethel County'},
  { name: 'Bingham Union Library', url: 'https://www.binghamlibrary.org', eventsUrl: 'https://www.binghamlibrary.org/events', city: 'Bingham', state: 'ME', zipCode: '04920', county: 'Bingham County'},
  { name: 'Blue Hill Library', url: 'https://www.bluehilllibrary.org', eventsUrl: 'https://www.bluehilllibrary.org/events', city: 'Blue Hill', state: 'ME', zipCode: '00000', county: 'Blue Hill County'},
  { name: 'Boothbay Harbor Memorial Library', url: 'https://www.boothbayharborlibrary.org', eventsUrl: 'https://www.boothbayharborlibrary.org/events', city: 'Boothbay Harbor', state: 'ME', zipCode: '04538', county: 'Boothbay Harbor County'},
  { name: 'Bowdoinham Public Library', url: 'https://www.bowdoinhamlibrary.org', eventsUrl: 'https://www.bowdoinhamlibrary.org/events', city: 'Bowdoinham', state: 'ME', zipCode: '04008', county: 'Bowdoinham County'},
  { name: 'John B. Curtis Free Public Library', url: 'https://www.bradfordlibrary.org', eventsUrl: 'https://www.bradfordlibrary.org/events', city: 'Bradford', state: 'ME', zipCode: '04410', county: 'Bradford County'},
  { name: 'Bremen Public Library', url: 'https://www.bremenlibrary.org', eventsUrl: 'https://www.bremenlibrary.org/events', city: 'Bremen', state: 'ME', zipCode: '04551', county: 'Bremen County'},
  { name: 'Brewer Public Library', url: 'https://www.brewerlibrary.org', eventsUrl: 'https://www.brewerlibrary.org/events', city: 'Brewer', state: 'ME', zipCode: '04412', county: 'Brewer County'},
  { name: 'Bridgton Public Library', url: 'https://www.bridgtonlibrary.org', eventsUrl: 'https://www.bridgtonlibrary.org/events', city: 'Bridgton', state: 'ME', zipCode: '04009', county: 'Bridgton County'},
  { name: 'Friend Memorial Public Library', url: 'https://www.brooklinlibrary.org', eventsUrl: 'https://www.brooklinlibrary.org/events', city: 'Brooklin', state: 'ME', zipCode: '04616', county: 'Brooklin County'},
  { name: 'Brooksville Free Public Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'ME', zipCode: '04617', county: 'Brooksville County'},
  { name: 'Brownfield Public Library', url: 'https://www.brownfieldlibrary.org', eventsUrl: 'https://www.brownfieldlibrary.org/events', city: 'Brownfield', state: 'ME', zipCode: '04010', county: 'Brownfield County'},
  { name: 'Brownville Public Library', url: 'https://www.brownvillelibrary.org', eventsUrl: 'https://www.brownvillelibrary.org/events', city: 'Brownville', state: 'ME', zipCode: '04414', county: 'Brownville County'},
  { name: 'Whitman Memorial Library', url: 'https://www.bryantpondlibrary.org', eventsUrl: 'https://www.bryantpondlibrary.org/events', city: 'Bryant Pond', state: 'ME', zipCode: '04219', county: 'Bryant Pond County'},
  { name: 'Zadoc Long Free Library', url: 'https://www.buckfieldlibrary.org', eventsUrl: 'https://www.buckfieldlibrary.org/events', city: 'Buckfield', state: 'ME', zipCode: '04220', county: 'Buckfield County'},
  { name: 'Buck Memorial Library', url: 'https://www.bucksportlibrary.org', eventsUrl: 'https://www.bucksportlibrary.org/events', city: 'Bucksport', state: 'ME', zipCode: '04416', county: 'Bucksport County'},
  { name: 'West Buxton Public Library', url: 'https://www.buxtonlibrary.org', eventsUrl: 'https://www.buxtonlibrary.org/events', city: 'Buxton', state: 'ME', zipCode: '04093', county: 'Buxton County'},
  { name: 'Calais Free Library', url: 'https://www.calaislibrary.org', eventsUrl: 'https://www.calaislibrary.org/events', city: 'Calais', state: 'ME', zipCode: '04619', county: 'Calais County'},
  { name: 'Canaan Public Library', url: 'https://www.canaanlibrary.org', eventsUrl: 'https://www.canaanlibrary.org/events', city: 'Canaan', state: 'ME', zipCode: '04924', county: 'Canaan County'},
  { name: 'Cape Elizabeth - Thomas Memorial Library', url: 'https://www.capeelizabethlibrary.org', eventsUrl: 'https://www.capeelizabethlibrary.org/events', city: 'Cape Elizabeth', state: 'ME', zipCode: '00000', county: 'Cape Elizabeth County'},
  { name: 'Cape Porpoise Library', url: 'https://www.capeporpoiselibrary.org', eventsUrl: 'https://www.capeporpoiselibrary.org/events', city: 'Cape Porpoise', state: 'ME', zipCode: '04014', county: 'Cape Porpoise County'},
  { name: 'Caribou Public Library', url: 'https://www.cariboulibrary.org', eventsUrl: 'https://www.cariboulibrary.org/events', city: 'Caribou', state: 'ME', zipCode: '04736', county: 'Caribou County'},
  { name: 'Simpson Memorial Library', url: 'https://www.carmellibrary.org', eventsUrl: 'https://www.carmellibrary.org/events', city: 'Carmel', state: 'ME', zipCode: '04419', county: 'Carmel County'},
  { name: 'Carrabassett Valley Public Library', url: 'https://www.carrabassettlibrary.org', eventsUrl: 'https://www.carrabassettlibrary.org/events', city: 'Carrabassett', state: 'ME', zipCode: '04947', county: 'Carrabassett County'},
  { name: 'Casco Public Library', url: 'https://www.cascolibrary.org', eventsUrl: 'https://www.cascolibrary.org/events', city: 'Casco', state: 'ME', zipCode: '04015', county: 'Casco County'},
  { name: 'Witherle Memorial Library', url: 'https://www.castinelibrary.org', eventsUrl: 'https://www.castinelibrary.org/events', city: 'Castine', state: 'ME', zipCode: '04421', county: 'Castine County'},
  { name: 'Charleston Public Library', url: 'https://www.charlestonlibrary.org', eventsUrl: 'https://www.charlestonlibrary.org/events', city: 'Charleston', state: 'ME', zipCode: '04422', county: 'Charleston County'},
  { name: 'Cumberland - Chebeague Island Library', url: 'https://www.chebeaguelibrary.org', eventsUrl: 'https://www.chebeaguelibrary.org/events', city: 'Chebeague', state: 'ME', zipCode: '00000', county: 'Chebeague County'},
  { name: 'Chebeague Island Library', url: 'https://www.chebeagueislandlibrary.org', eventsUrl: 'https://www.chebeagueislandlibrary.org/events', city: 'Chebeague Island', state: 'ME', zipCode: '04017', county: 'Chebeague Island County'},
  { name: 'Cherryfield Public Library', url: 'https://www.cherryfieldlibrary.org', eventsUrl: 'https://www.cherryfieldlibrary.org/events', city: 'Cherryfield', state: 'ME', zipCode: '04622', county: 'Cherryfield County'},
  { name: 'Albert Church Brown Memorial Library', url: 'https://www.chinavillagelibrary.org', eventsUrl: 'https://www.chinavillagelibrary.org/events', city: 'China Village', state: 'ME', zipCode: '04926', county: 'China Village County'},
  { name: 'Cliff Island Library', url: 'https://www.cliffislandlibrary.org', eventsUrl: 'https://www.cliffislandlibrary.org/events', city: 'Cliff Island', state: 'ME', zipCode: '04019', county: 'Cliff Island County'},
  { name: 'Brown Memorial Library - Clinton', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'ME', zipCode: '04927', county: 'Clinton County'},
  { name: 'Cooper Free Public Library', url: 'https://www.cooperlibrary.org', eventsUrl: 'https://www.cooperlibrary.org/events', city: 'Cooper', state: 'ME', zipCode: '00000', county: 'Cooper County'},
  { name: 'Stewart Free Library', url: 'https://www.corinnalibrary.org', eventsUrl: 'https://www.corinnalibrary.org/events', city: 'Corinna', state: 'ME', zipCode: '04928', county: 'Corinna County'},
  { name: 'Atkins Memorial Library', url: 'https://www.corinthlibrary.org', eventsUrl: 'https://www.corinthlibrary.org/events', city: 'Corinth', state: 'ME', zipCode: '04427', county: 'Corinth County'},
  { name: 'Bonney Memorial Library', url: 'https://www.cornishlibrary.org', eventsUrl: 'https://www.cornishlibrary.org/events', city: 'Cornish', state: 'ME', zipCode: '04020', county: 'Cornish County'},
  { name: 'Great Cranberry Library', url: 'https://www.cranberryisleslibrary.org', eventsUrl: 'https://www.cranberryisleslibrary.org/events', city: 'Cranberry Isles', state: 'ME', zipCode: '04625', county: 'Cranberry Isles County'},
  { name: 'Prince Memorial Library', url: 'https://www.cumberlandlibrary.org', eventsUrl: 'https://www.cumberlandlibrary.org/events', city: 'Cumberland', state: 'ME', zipCode: '04021', county: 'Cumberland County'},
  { name: 'Cushing Public Library', url: 'https://www.cushinglibrary.org', eventsUrl: 'https://www.cushinglibrary.org/events', city: 'Cushing', state: 'ME', zipCode: '04563', county: 'Cushing County'},
  { name: 'Louise Clements Library', url: 'https://www.cutlerlibrary.org', eventsUrl: 'https://www.cutlerlibrary.org/events', city: 'Cutler', state: 'ME', zipCode: '04626', county: 'Cutler County'},
  { name: 'Skidompha Public Library', url: 'https://www.damariscottalibrary.org', eventsUrl: 'https://www.damariscottalibrary.org/events', city: 'Damariscotta', state: 'ME', zipCode: '04543', county: 'Damariscotta County'},
  { name: 'Danforth Public Library', url: 'https://www.danforthlibrary.org', eventsUrl: 'https://www.danforthlibrary.org/events', city: 'Danforth', state: 'ME', zipCode: '04424', county: 'Danforth County'},
  { name: 'Chase Emerson Memorial Library', url: 'https://www.deerislelibrary.org', eventsUrl: 'https://www.deerislelibrary.org/events', city: 'Deer Isle', state: 'ME', zipCode: '04627', county: 'Deer Isle County'},
  { name: 'Denmark Public Library', url: 'https://www.denmarklibrary.org', eventsUrl: 'https://www.denmarklibrary.org/events', city: 'Denmark', state: 'ME', zipCode: '04022', county: 'Denmark County'},
  { name: 'Lincoln Memorial Library - Dennysville', url: 'https://www.dennysvillelibrary.org', eventsUrl: 'https://www.dennysvillelibrary.org/events', city: 'Dennysville', state: 'ME', zipCode: '04628', county: 'Dennysville County'},
  { name: 'Anna Field Fernald Library', url: 'https://www.detroitlibrary.org', eventsUrl: 'https://www.detroitlibrary.org/events', city: 'Detroit', state: 'ME', zipCode: '04929', county: 'Detroit County'},
  { name: 'Abbott Memorial Library', url: 'https://www.dexterlibrary.org', eventsUrl: 'https://www.dexterlibrary.org/events', city: 'Dexter', state: 'ME', zipCode: '04930', county: 'Dexter County'},
  { name: 'Ludden Memorial Library', url: 'https://www.dixfieldlibrary.org', eventsUrl: 'https://www.dixfieldlibrary.org/events', city: 'Dixfield', state: 'ME', zipCode: '04224', county: 'Dixfield County'},
  { name: 'Thompson Free Library', url: 'https://www.doverfoxcroftlibrary.org', eventsUrl: 'https://www.doverfoxcroftlibrary.org/events', city: 'Dover-Foxcroft', state: 'ME', zipCode: '04426', county: 'Dover-Foxcroft County'},
  { name: 'Bridge Academy Public Library', url: 'https://www.dresdenlibrary.org', eventsUrl: 'https://www.dresdenlibrary.org/events', city: 'Dresden', state: 'ME', zipCode: '04342', county: 'Dresden County'},
  { name: 'Waterboro Public Library', url: 'https://www.ewaterborolibrary.org', eventsUrl: 'https://www.ewaterborolibrary.org/events', city: 'E. Waterboro', state: 'ME', zipCode: '04030', county: 'E. Waterboro County'},
  { name: 'Brown Memorial Library - Baldwin', url: 'https://www.eastbaldwinlibrary.org', eventsUrl: 'https://www.eastbaldwinlibrary.org/events', city: 'East Baldwin', state: 'ME', zipCode: '04024', county: 'East Baldwin County'},
  { name: 'East Blue Hill Public Library', url: 'https://www.eastbluehilllibrary.org', eventsUrl: 'https://www.eastbluehilllibrary.org/events', city: 'East Blue Hill', state: 'ME', zipCode: '04629', county: 'East Blue Hill County'},
  { name: 'East Machias - Sturdivant Public Library', url: 'https://www.eastmachiaslibrary.org', eventsUrl: 'https://www.eastmachiaslibrary.org/events', city: 'East Machias', state: 'ME', zipCode: '00000', county: 'East Machias County'},
  { name: 'East Millinocket Public Library', url: 'https://www.eastmillinocketlibrary.org', eventsUrl: 'https://www.eastmillinocketlibrary.org/events', city: 'East Millinocket', state: 'ME', zipCode: '04430', county: 'East Millinocket County'},
  { name: 'Sebago - Spaulding Memorial Library', url: 'https://www.eastsebagolibrary.org', eventsUrl: 'https://www.eastsebagolibrary.org/events', city: 'East Sebago', state: 'ME', zipCode: '00000', county: 'East Sebago County'},
  { name: 'Vassalboro Public Library', url: 'https://www.eastvassalborolibrary.org', eventsUrl: 'https://www.eastvassalborolibrary.org/events', city: 'East Vassalboro', state: 'ME', zipCode: '04935', county: 'East Vassalboro County'},
  { name: 'Peavey Memorial Library', url: 'https://www.eastportlibrary.org', eventsUrl: 'https://www.eastportlibrary.org/events', city: 'Eastport', state: 'ME', zipCode: '04631', county: 'Eastport County'},
  { name: 'William Fogg Public Library', url: 'https://www.eliotlibrary.org', eventsUrl: 'https://www.eliotlibrary.org/events', city: 'Eliot', state: 'ME', zipCode: '03903', county: 'Eliot County'},
  { name: 'Cole Memorial Library', url: 'https://www.enfieldlibrary.org', eventsUrl: 'https://www.enfieldlibrary.org/events', city: 'Enfield', state: 'ME', zipCode: '04493', county: 'Enfield County'},
  { name: 'Lawrence Public Library', url: 'https://www.fairfieldlibrary.org', eventsUrl: 'https://www.fairfieldlibrary.org/events', city: 'Fairfield', state: 'ME', zipCode: '04937', county: 'Fairfield County'},
  { name: 'Falmouth Memorial Library', url: 'https://www.falmouthlibrary.org', eventsUrl: 'https://www.falmouthlibrary.org/events', city: 'Falmouth', state: 'ME', zipCode: '04105', county: 'Falmouth County'},
  { name: 'Farmington Public Library', url: 'https://www.farmingtonlibrary.org', eventsUrl: 'https://www.farmingtonlibrary.org/events', city: 'Farmington', state: 'ME', zipCode: '04938', county: 'Farmington County'},
  { name: 'Underwood Memorial Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'ME', zipCode: '04349', county: 'Fayette County'},
  { name: 'Fort Fairfield Public Library', url: 'https://www.fortfairfieldlibrary.org', eventsUrl: 'https://www.fortfairfieldlibrary.org/events', city: 'Fort Fairfield', state: 'ME', zipCode: '04742', county: 'Fort Fairfield County'},
  { name: 'Fort Kent Public Library', url: 'https://www.fortkentlibrary.org', eventsUrl: 'https://www.fortkentlibrary.org/events', city: 'Fort Kent', state: 'ME', zipCode: '04743', county: 'Fort Kent County'},
  { name: 'Frankfort - Pierce Reading Room Library', url: 'https://www.frankfortlibrary.org', eventsUrl: 'https://www.frankfortlibrary.org/events', city: 'Frankfort', state: 'ME', zipCode: '00000', county: 'Frankfort County'},
  { name: 'Freeport Community Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'ME', zipCode: '04032', county: 'Freeport County'},
  { name: 'Frenchboro Public Library', url: 'https://www.frenchborolibrary.org', eventsUrl: 'https://www.frenchborolibrary.org/events', city: 'Frenchboro', state: 'ME', zipCode: '04635', county: 'Frenchboro County'},
  { name: 'Friendship Public Library', url: 'https://www.friendshiplibrary.org', eventsUrl: 'https://www.friendshiplibrary.org/events', city: 'Friendship', state: 'ME', zipCode: '04547', county: 'Friendship County'},
  { name: 'Fryeburg Public Library', url: 'https://www.fryeburglibrary.org', eventsUrl: 'https://www.fryeburglibrary.org/events', city: 'Fryeburg', state: 'ME', zipCode: '04037', county: 'Fryeburg County'},
  { name: 'Gardiner Public Library', url: 'https://www.gardinerlibrary.org', eventsUrl: 'https://www.gardinerlibrary.org/events', city: 'Gardiner', state: 'ME', zipCode: '04345', county: 'Gardiner County'},
  { name: 'Garland - Lyndon Oak Memorial Library', url: 'https://www.garlandlibrary.org', eventsUrl: 'https://www.garlandlibrary.org/events', city: 'Garland', state: 'ME', zipCode: '00000', county: 'Garland County'},
  { name: 'Laura E. Richards Library', url: 'https://www.georgetownlibrary.org', eventsUrl: 'https://www.georgetownlibrary.org/events', city: 'Georgetown', state: 'ME', zipCode: '04548', county: 'Georgetown County'},
  { name: 'Glenburn Library', url: 'https://www.glenburnlibrary.org', eventsUrl: 'https://www.glenburnlibrary.org/events', city: 'Glenburn', state: 'ME', zipCode: '04401', county: 'Glenburn County'},
  { name: 'Gray Public Library', url: 'https://www.graylibrary.org', eventsUrl: 'https://www.graylibrary.org/events', city: 'Gray', state: 'ME', zipCode: '04039', county: 'Gray County'},
  { name: 'Julia Adams Morse Memorial Library', url: 'https://www.greenelibrary.org', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'ME', zipCode: '04236', county: 'Greene County'},
  { name: 'Shaw Public Library - Greenville', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'ME', zipCode: '04441', county: 'Greenville County'},
  { name: 'Guilford Memorial Library', url: 'https://www.guilfordlibrary.org', eventsUrl: 'https://www.guilfordlibrary.org/events', city: 'Guilford', state: 'ME', zipCode: '04443', county: 'Guilford County'},
  { name: 'Hubbard Free Library', url: 'https://www.hallowelllibrary.org', eventsUrl: 'https://www.hallowelllibrary.org/events', city: 'Hallowell', state: 'ME', zipCode: '04347', county: 'Hallowell County'},
  { name: 'Edythe Dyer Community Library', url: 'https://www.hampdenlibrary.org', eventsUrl: 'https://www.hampdenlibrary.org/events', city: 'Hampden', state: 'ME', zipCode: '04444', county: 'Hampden County'},
  { name: 'Cundys Harbor Library', url: 'https://www.harpswelllibrary.org', eventsUrl: 'https://www.harpswelllibrary.org/events', city: 'Harpswell', state: 'ME', zipCode: '04079', county: 'Harpswell County'},
  { name: 'Gallison Memorial Library', url: 'https://www.harringtonlibrary.org', eventsUrl: 'https://www.harringtonlibrary.org/events', city: 'Harrington', state: 'ME', zipCode: '04643', county: 'Harrington County'},
  { name: 'Bolsters Mills Village Library', url: 'https://www.harrisonlibrary.org', eventsUrl: 'https://www.harrisonlibrary.org/events', city: 'Harrison', state: 'ME', zipCode: '04040', county: 'Harrison County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibrary.org', eventsUrl: 'https://www.hartlandlibrary.org/events', city: 'Hartland', state: 'ME', zipCode: '04943', county: 'Hartland County'},
  { name: 'Soldiers Memorial Library', url: 'https://www.hiramlibrary.org', eventsUrl: 'https://www.hiramlibrary.org/events', city: 'Hiram', state: 'ME', zipCode: '04041', county: 'Hiram County'},
  { name: 'Hollis Center Public Library', url: 'https://www.hollislibrary.org', eventsUrl: 'https://www.hollislibrary.org/events', city: 'Hollis', state: 'ME', zipCode: '04042', county: 'Hollis County'},
  { name: 'Hope Library', url: 'https://www.hopelibrary.org', eventsUrl: 'https://www.hopelibrary.org/events', city: 'Hope', state: 'ME', zipCode: '04847', county: 'Hope County'},
  { name: 'Cary Library-Houlton', url: 'https://www.houltonlibrary.org', eventsUrl: 'https://www.houltonlibrary.org/events', city: 'Houlton', state: 'ME', zipCode: '04730', county: 'Houlton County'},
  { name: 'Thomas Free Library', url: 'https://www.howlandlibrary.org', eventsUrl: 'https://www.howlandlibrary.org/events', city: 'Howland', state: 'ME', zipCode: '04448', county: 'Howland County'},
  { name: 'Katahdin Public Library', url: 'https://www.islandfallslibrary.org', eventsUrl: 'https://www.islandfallslibrary.org/events', city: 'Island Falls', state: 'ME', zipCode: '04747', county: 'Island Falls County'},
  { name: 'Isle Au Haut - Revere Memorial Library', url: 'https://www.isleauhautlibrary.org', eventsUrl: 'https://www.isleauhautlibrary.org/events', city: 'Isle Au Haut', state: 'ME', zipCode: '00000', county: 'Isle Au Haut County'},
  { name: 'Revere Memorial Library', url: 'https://www.isleauhautlibrary.org', eventsUrl: 'https://www.isleauhautlibrary.org/events', city: 'Isle-Au-Haut', state: 'ME', zipCode: '04645', county: 'Isle-Au-Haut County'},
  { name: 'Alice L. Pendleton Library', url: 'https://www.islesborolibrary.org', eventsUrl: 'https://www.islesborolibrary.org/events', city: 'Islesboro', state: 'ME', zipCode: '04848', county: 'Islesboro County'},
  { name: 'Cranberry Isles - Islesford Library', url: 'https://www.islesfordlibrary.org', eventsUrl: 'https://www.islesfordlibrary.org/events', city: 'Islesford', state: 'ME', zipCode: '00000', county: 'Islesford County'},
  { name: 'Jackman Public Library', url: 'https://www.jackmanlibrary.org', eventsUrl: 'https://www.jackmanlibrary.org/events', city: 'Jackman', state: 'ME', zipCode: '04945', county: 'Jackman County'},
  { name: 'Jefferson Public Library', url: 'https://www.jeffersonlibrary.org', eventsUrl: 'https://www.jeffersonlibrary.org/events', city: 'Jefferson', state: 'ME', zipCode: '04348', county: 'Jefferson County'},
  { name: 'Jonesport - Peabody Memorial Library', url: 'https://www.jonesportlibrary.org', eventsUrl: 'https://www.jonesportlibrary.org/events', city: 'Jonesport', state: 'ME', zipCode: '00000', county: 'Jonesport County'},
  { name: 'Case Memorial Library', url: 'https://www.kenduskeaglibrary.org', eventsUrl: 'https://www.kenduskeaglibrary.org/events', city: 'Kenduskeag', state: 'ME', zipCode: '04450', county: 'Kenduskeag County'},
  { name: 'Graves Memorial Library', url: 'https://www.kennebunkportlibrary.org', eventsUrl: 'https://www.kennebunkportlibrary.org/events', city: 'Kennebunkport', state: 'ME', zipCode: '04046', county: 'Kennebunkport County'},
  { name: 'Parsonsfield Public Library', url: 'https://www.kezarfallslibrary.org', eventsUrl: 'https://www.kezarfallslibrary.org/events', city: 'Kezar Falls', state: 'ME', zipCode: '00000', county: 'Kezar Falls County'},
  { name: 'Webster Free Library', url: 'https://www.kingfieldlibrary.org', eventsUrl: 'https://www.kingfieldlibrary.org/events', city: 'Kingfield', state: 'ME', zipCode: '04947', county: 'Kingfield County'},
  { name: 'Rice Public Library', url: 'https://www.kitterylibrary.org', eventsUrl: 'https://www.kitterylibrary.org/events', city: 'Kittery', state: 'ME', zipCode: '03904', county: 'Kittery County'},
  { name: 'Lebanon Town Library', url: 'https://www.lebanonlibrary.org', eventsUrl: 'https://www.lebanonlibrary.org/events', city: 'Lebanon', state: 'ME', zipCode: '04027', county: 'Lebanon County'},
  { name: 'Levant Heritage Library', url: 'https://www.levantlibrary.org', eventsUrl: 'https://www.levantlibrary.org/events', city: 'Levant', state: 'ME', zipCode: '04456', county: 'Levant County'},
  { name: 'Ivan O. Davis-Liberty Library', url: 'https://www.libertylibrary.org', eventsUrl: 'https://www.libertylibrary.org/events', city: 'Liberty', state: 'ME', zipCode: '04949', county: 'Liberty County'},
  { name: 'Limerick Public Library', url: 'https://www.limericklibrary.org', eventsUrl: 'https://www.limericklibrary.org/events', city: 'Limerick', state: 'ME', zipCode: '04048', county: 'Limerick County'},
  { name: 'Frost Memorial Library', url: 'https://www.limestonelibrary.org', eventsUrl: 'https://www.limestonelibrary.org/events', city: 'Limestone', state: 'ME', zipCode: '00000', county: 'Limestone County'},
  { name: 'Davis Memorial Library', url: 'https://www.limingtonlibrary.org', eventsUrl: 'https://www.limingtonlibrary.org/events', city: 'Limington', state: 'ME', zipCode: '04049', county: 'Limington County'},
  { name: 'Lincoln Memorial Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'ME', zipCode: '04457', county: 'Lincoln County'},
  { name: 'Lisbon Library Dept', url: 'https://www.lisbonlibrary.org', eventsUrl: 'https://www.lisbonlibrary.org/events', city: 'Lisbon', state: 'ME', zipCode: '04252', county: 'Lisbon County'},
  { name: 'Livermore Public Library', url: 'https://www.livermorelibrary.org', eventsUrl: 'https://www.livermorelibrary.org/events', city: 'Livermore', state: 'ME', zipCode: '04253', county: 'Livermore County'},
  { name: 'Treat Memorial Library', url: 'https://www.livermorefallslibrary.org', eventsUrl: 'https://www.livermorefallslibrary.org/events', city: 'Livermore Falls', state: 'ME', zipCode: '04254', county: 'Livermore Falls County'},
  { name: 'Long Island Community Library', url: 'https://www.longislandlibrary.org', eventsUrl: 'https://www.longislandlibrary.org/events', city: 'Long Island', state: 'ME', zipCode: '04050', county: 'Long Island County'},
  { name: 'Charlotte Hobbs Memorial Library', url: 'https://www.lovelllibrary.org', eventsUrl: 'https://www.lovelllibrary.org/events', city: 'Lovell', state: 'ME', zipCode: '04051', county: 'Lovell County'},
  { name: 'Lubec Memorial Library', url: 'https://www.lubeclibrary.org', eventsUrl: 'https://www.lubeclibrary.org/events', city: 'Lubec', state: 'ME', zipCode: '04652', county: 'Lubec County'},
  { name: 'Lyman Community Library', url: 'https://www.lymanlibrary.org', eventsUrl: 'https://www.lymanlibrary.org/events', city: 'Lyman', state: 'ME', zipCode: '04002', county: 'Lyman County'},
  { name: 'Machias - Porter Memorial Library', url: 'https://www.machiaslibrary.org', eventsUrl: 'https://www.machiaslibrary.org/events', city: 'Machias', state: 'ME', zipCode: '00000', county: 'Machias County'},
  { name: 'Madawaska Public Library', url: 'https://www.madawaskalibrary.org', eventsUrl: 'https://www.madawaskalibrary.org/events', city: 'Madawaska', state: 'ME', zipCode: '04756', county: 'Madawaska County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'ME', zipCode: '04950', county: 'Madison County'},
  { name: 'Walter T. A. Hansen Memorial Library', url: 'https://www.marshilllibrary.org', eventsUrl: 'https://www.marshilllibrary.org/events', city: 'Mars Hill', state: 'ME', zipCode: '04758', county: 'Mars Hill County'},
  { name: 'Mattawamkeag Public Library', url: 'https://www.mattawamkeaglibrary.org', eventsUrl: 'https://www.mattawamkeaglibrary.org/events', city: 'Mattawamkeag', state: 'ME', zipCode: '04459', county: 'Mattawamkeag County'},
  { name: 'Mechanic Falls Public Library', url: 'https://www.mechanicfallslibrary.org', eventsUrl: 'https://www.mechanicfallslibrary.org/events', city: 'Mechanic Falls', state: 'ME', zipCode: '04256', county: 'Mechanic Falls County'},
  { name: 'Mercer - Shaw Library', url: 'https://www.mercerlibrary.org', eventsUrl: 'https://www.mercerlibrary.org/events', city: 'Mercer', state: 'ME', zipCode: '00000', county: 'Mercer County'},
  { name: 'Mexico Free Public Library', url: 'https://www.mexicolibrary.org', eventsUrl: 'https://www.mexicolibrary.org/events', city: 'Mexico', state: 'ME', zipCode: '04257', county: 'Mexico County'},
  { name: 'Milbridge Public Library', url: 'https://www.milbridgelibrary.org', eventsUrl: 'https://www.milbridgelibrary.org/events', city: 'Milbridge', state: 'ME', zipCode: '04658', county: 'Milbridge County'},
  { name: 'Millinocket Memorial Library', url: 'https://www.millinocketlibrary.org', eventsUrl: 'https://www.millinocketlibrary.org/events', city: 'Millinocket', state: 'ME', zipCode: '04462', county: 'Millinocket County'},
  { name: 'Milo Free Public Library', url: 'https://www.milolibrary.org', eventsUrl: 'https://www.milolibrary.org/events', city: 'Milo', state: 'ME', zipCode: '04463', county: 'Milo County'},
  { name: 'Monhegan Memorial Library', url: 'https://www.monheganislandlibrary.org', eventsUrl: 'https://www.monheganislandlibrary.org/events', city: 'Monhegan Island', state: 'ME', zipCode: '04852', county: 'Monhegan Island County'},
  { name: 'Cumston Public Library', url: 'https://www.monmouthlibrary.org', eventsUrl: 'https://www.monmouthlibrary.org/events', city: 'Monmouth', state: 'ME', zipCode: '04259', county: 'Monmouth County'},
  { name: 'Monroe Community Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'ME', zipCode: '04951', county: 'Monroe County'},
  { name: 'Monson Public Library', url: 'https://www.monsonlibrary.org', eventsUrl: 'https://www.monsonlibrary.org/events', city: 'Monson', state: 'ME', zipCode: '04464', county: 'Monson County'},
  { name: 'Somesville Library Association', url: 'https://www.mountdesertlibrary.org', eventsUrl: 'https://www.mountdesertlibrary.org/events', city: 'Mount Desert', state: 'ME', zipCode: '04660', county: 'Mount Desert County'},
  { name: 'Dr.Shaw Memorial Library', url: 'https://www.mountvernonlibrary.org', eventsUrl: 'https://www.mountvernonlibrary.org/events', city: 'Mount Vernon', state: 'ME', zipCode: '04352', county: 'Mount Vernon County'},
  { name: 'Naples Public Library', url: 'https://www.napleslibrary.org', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'ME', zipCode: '04055', county: 'Naples County'},
  { name: 'New Gloucester Public Library', url: 'https://www.newgloucesterlibrary.org', eventsUrl: 'https://www.newgloucesterlibrary.org/events', city: 'New Gloucester', state: 'ME', zipCode: '04260', county: 'New Gloucester County'},
  { name: 'New Portland Community Library', url: 'https://www.newportlandlibrary.org', eventsUrl: 'https://www.newportlandlibrary.org/events', city: 'New Portland', state: 'ME', zipCode: '04961', county: 'New Portland County'},
  { name: 'Jim Ditzler Memorial Library', url: 'https://www.newsharonlibrary.org', eventsUrl: 'https://www.newsharonlibrary.org/events', city: 'New Sharon', state: 'ME', zipCode: '04955', county: 'New Sharon County'},
  { name: 'New Vineyard Public Library', url: 'https://www.newvineyardlibrary.org', eventsUrl: 'https://www.newvineyardlibrary.org/events', city: 'New Vineyard', state: 'ME', zipCode: '04956', county: 'New Vineyard County'},
  { name: 'Newfield Village Library-Reading Room', url: 'https://www.newfieldlibrary.org', eventsUrl: 'https://www.newfieldlibrary.org/events', city: 'Newfield', state: 'ME', zipCode: '04056', county: 'Newfield County'},
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'ME', zipCode: '04953', county: 'Newport County'},
  { name: 'Norridgewock Free Public Library', url: 'https://www.norridgewcocklibrary.org', eventsUrl: 'https://www.norridgewcocklibrary.org/events', city: 'Norridgewcock', state: 'ME', zipCode: '04957', county: 'Norridgewcock County'},
  { name: 'Stewart Public Library', url: 'https://www.northansonlibrary.org', eventsUrl: 'https://www.northansonlibrary.org/events', city: 'North Anson', state: 'ME', zipCode: '04958', county: 'North Anson County'},
  { name: 'D.A. Hurd Library', url: 'https://www.northberwicklibrary.org', eventsUrl: 'https://www.northberwicklibrary.org/events', city: 'North Berwick', state: 'ME', zipCode: '03906', county: 'North Berwick County'},
  { name: 'Bridgton - North Bridgton Public Library', url: 'https://www.northbridgtonlibrary.org', eventsUrl: 'https://www.northbridgtonlibrary.org/events', city: 'North Bridgton', state: 'ME', zipCode: '00000', county: 'North Bridgton County'},
  { name: 'North Haven Public Library', url: 'https://www.northhavenlibrary.org', eventsUrl: 'https://www.northhavenlibrary.org/events', city: 'North Haven', state: 'ME', zipCode: '04853', county: 'North Haven County'},
  { name: 'Jay-Niles Memorial Library', url: 'https://www.northjaylibrary.org', eventsUrl: 'https://www.northjaylibrary.org/events', city: 'North Jay', state: 'ME', zipCode: '04262', county: 'North Jay County'},
  { name: 'Monmouth - North Monmouth Public Library', url: 'https://www.northmonmouthlibrary.org', eventsUrl: 'https://www.northmonmouthlibrary.org/events', city: 'North Monmouth', state: 'ME', zipCode: '00000', county: 'North Monmouth County'},
  { name: 'Northeast Harbor Library', url: 'https://www.northeastharborlibrary.org', eventsUrl: 'https://www.northeastharborlibrary.org/events', city: 'Northeast Harbor', state: 'ME', zipCode: '04662', county: 'Northeast Harbor County'},
  { name: 'Norway Memorial Library', url: 'https://www.norwaylibrary.org', eventsUrl: 'https://www.norwaylibrary.org/events', city: 'Norway', state: 'ME', zipCode: '04268', county: 'Norway County'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'ME', zipCode: '04963', county: 'Oakland County'},
  { name: 'Ocean Park Memorial Library', url: 'https://www.oceanparklibrary.org', eventsUrl: 'https://www.oceanparklibrary.org/events', city: 'Ocean Park', state: 'ME', zipCode: '04063', county: 'Ocean Park County'},
  { name: 'Ogunquit Memorial Library', url: 'https://www.ogunquitlibrary.org', eventsUrl: 'https://www.ogunquitlibrary.org/events', city: 'Ogunquit', state: 'ME', zipCode: '03907', county: 'Ogunquit County'},
  { name: 'Libby Memorial Library', url: 'https://www.oldorchardbeachlibrary.org', eventsUrl: 'https://www.oldorchardbeachlibrary.org/events', city: 'Old Orchard Beach', state: 'ME', zipCode: '04064', county: 'Old Orchard Beach County'},
  { name: 'Old Town Public Library', url: 'https://www.oldtownlibrary.org', eventsUrl: 'https://www.oldtownlibrary.org/events', city: 'Old Town', state: 'ME', zipCode: '04468', county: 'Old Town County'},
  { name: 'Orono Public Library', url: 'https://www.oronolibrary.org', eventsUrl: 'https://www.oronolibrary.org/events', city: 'Orono', state: 'ME', zipCode: '04473', county: 'Orono County'},
  { name: 'Orrington Public Library', url: 'https://www.orringtonlibrary.org', eventsUrl: 'https://www.orringtonlibrary.org/events', city: 'Orrington', state: 'ME', zipCode: '04474', county: 'Orrington County'},
  { name: 'Orrs Island Library', url: 'https://www.orrsislandlibrary.org', eventsUrl: 'https://www.orrsislandlibrary.org/events', city: 'Orrs Island', state: 'ME', zipCode: '04066', county: 'Orrs Island County'},
  { name: 'Otis Public Library', url: 'https://www.otislibrary.org', eventsUrl: 'https://www.otislibrary.org/events', city: 'Otis', state: 'ME', zipCode: '04605', county: 'Otis County'},
  { name: 'Harrison - Bolsters Mills Village Library', url: 'https://www.otisfieldlibrary.org', eventsUrl: 'https://www.otisfieldlibrary.org/events', city: 'Otisfield', state: 'ME', zipCode: '00000', county: 'Otisfield County'},
  { name: 'Owls Head Village Library', url: 'https://www.owlsheadlibrary.org', eventsUrl: 'https://www.owlsheadlibrary.org/events', city: 'Owls Head', state: 'ME', zipCode: '04854', county: 'Owls Head County'},
  { name: 'Freeland Holmes Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'ME', zipCode: '04270', county: 'Oxford County'},
  { name: 'Palermo Community Library', url: 'https://www.palermolibrary.org', eventsUrl: 'https://www.palermolibrary.org/events', city: 'Palermo', state: 'ME', zipCode: '04354', county: 'Palermo County'},
  { name: 'Hamlin Memorial Library', url: 'https://www.parislibrary.org', eventsUrl: 'https://www.parislibrary.org/events', city: 'Paris', state: 'ME', zipCode: '04271', county: 'Paris County'},
  { name: 'Harvey Memorial Library', url: 'https://www.parkmanlibrary.org', eventsUrl: 'https://www.parkmanlibrary.org/events', city: 'Parkman', state: 'ME', zipCode: '04443', county: 'Parkman County'},
  { name: 'Kezar Falls Circulating Library', url: 'https://www.parsonsfieldlibrary.org', eventsUrl: 'https://www.parsonsfieldlibrary.org/events', city: 'Parsonsfield', state: 'ME', zipCode: '04047', county: 'Parsonsfield County'},
  { name: 'Veterans Memorial Library', url: 'https://www.pattenlibrary.org', eventsUrl: 'https://www.pattenlibrary.org/events', city: 'Patten', state: 'ME', zipCode: '04765', county: 'Patten County'},
  { name: 'Peaks Island Branch Library', url: 'https://www.peaksislandlibrary.org', eventsUrl: 'https://www.peaksislandlibrary.org/events', city: 'Peaks Island', state: 'ME', zipCode: '00000', county: 'Peaks Island County'},
  { name: 'Bristol Area Library', url: 'https://www.pemaquidlibrary.org', eventsUrl: 'https://www.pemaquidlibrary.org/events', city: 'Pemaquid', state: 'ME', zipCode: '04554', county: 'Pemaquid County'},
  { name: 'Pembroke Library', url: 'https://www.pembrokelibrary.org', eventsUrl: 'https://www.pembrokelibrary.org/events', city: 'Pembroke', state: 'ME', zipCode: '04666', county: 'Pembroke County'},
  { name: 'Phillips Public Library', url: 'https://www.phillipslibrary.org', eventsUrl: 'https://www.phillipslibrary.org/events', city: 'Phillips', state: 'ME', zipCode: '04966', county: 'Phillips County'},
  { name: 'Albert F. Totman Library', url: 'https://www.phippsburglibrary.org', eventsUrl: 'https://www.phippsburglibrary.org/events', city: 'Phippsburg', state: 'ME', zipCode: '04562', county: 'Phippsburg County'},
  { name: 'Pittsfield Public Library', url: 'https://www.pittsfieldlibrary.org', eventsUrl: 'https://www.pittsfieldlibrary.org/events', city: 'Pittsfield', state: 'ME', zipCode: '04967', county: 'Pittsfield County'},
  { name: 'Ricker Memorial Library', url: 'https://www.polandlibrary.org', eventsUrl: 'https://www.polandlibrary.org/events', city: 'Poland', state: 'ME', zipCode: '04274', county: 'Poland County'},
  { name: 'Mark And Emily Turner Memorial Library', url: 'https://www.presqueislelibrary.org', eventsUrl: 'https://www.presqueislelibrary.org/events', city: 'Presque Isle', state: 'ME', zipCode: '04769', county: 'Presque Isle County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'ME', zipCode: '04668', county: 'Princeton County'},
  { name: 'Dorcas Library', url: 'https://www.prospectharborlibrary.org', eventsUrl: 'https://www.prospectharborlibrary.org/events', city: 'Prospect Harbor', state: 'ME', zipCode: '04669', county: 'Prospect Harbor County'},
  { name: 'Rangeley Public Library', url: 'https://www.rangeleylibrary.org', eventsUrl: 'https://www.rangeleylibrary.org/events', city: 'Rangeley', state: 'ME', zipCode: '04970', county: 'Rangeley County'},
  { name: 'Raymond Village Library', url: 'https://www.raymondlibrary.org', eventsUrl: 'https://www.raymondlibrary.org/events', city: 'Raymond', state: 'ME', zipCode: '04071', county: 'Raymond County'},
  { name: 'Readfield Community Library', url: 'https://www.readfieldlibrary.org', eventsUrl: 'https://www.readfieldlibrary.org/events', city: 'Readfield', state: 'ME', zipCode: '04355', county: 'Readfield County'},
  { name: 'Isaac F Umberhine Public Library', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'ME', zipCode: '04357', county: 'Richmond County'},
  { name: 'Rockport Public Library', url: 'https://www.rockportlibrary.org', eventsUrl: 'https://www.rockportlibrary.org/events', city: 'Rockport', state: 'ME', zipCode: '04856', county: 'Rockport County'},
  { name: 'Rumford Public Library', url: 'https://www.rumfordlibrary.org', eventsUrl: 'https://www.rumfordlibrary.org/events', city: 'Rumford', state: 'ME', zipCode: '04276', county: 'Rumford County'},
  { name: 'Town Square Library', url: 'https://www.sabattuslibrary.org', eventsUrl: 'https://www.sabattuslibrary.org/events', city: 'Sabattus', state: 'ME', zipCode: '00000', county: 'Sabattus County'},
  { name: 'Sangerville Public Library', url: 'https://www.sangervillelibrary.org', eventsUrl: 'https://www.sangervillelibrary.org/events', city: 'Sangerville', state: 'ME', zipCode: '04479', county: 'Sangerville County'},
  { name: 'Sargentville Library Assn', url: 'https://www.sargentvillelibrary.org', eventsUrl: 'https://www.sargentvillelibrary.org/events', city: 'Sargentville', state: 'ME', zipCode: '04673', county: 'Sargentville County'},
  { name: 'Mount Desert - Seal Harbor Library', url: 'https://www.sealharborlibrary.org', eventsUrl: 'https://www.sealharborlibrary.org/events', city: 'Seal Harbor', state: 'ME', zipCode: '00000', county: 'Seal Harbor County'},
  { name: 'Searsmont Town Library', url: 'https://www.searsmontlibrary.org', eventsUrl: 'https://www.searsmontlibrary.org/events', city: 'Searsmont', state: 'ME', zipCode: '04973', county: 'Searsmont County'},
  { name: 'Carver Memorial Library', url: 'https://www.searsportlibrary.org', eventsUrl: 'https://www.searsportlibrary.org/events', city: 'Searsport', state: 'ME', zipCode: '04974', county: 'Searsport County'},
  { name: 'Spaulding Memorial Library', url: 'https://www.sebagolibrary.org', eventsUrl: 'https://www.sebagolibrary.org/events', city: 'Sebago', state: 'ME', zipCode: '04029', county: 'Sebago County'},
  { name: 'Sedgwick Library Assn', url: 'https://www.sedgwicklibrary.org', eventsUrl: 'https://www.sedgwicklibrary.org/events', city: 'Sedgwick', state: 'ME', zipCode: '04676', county: 'Sedgwick County'},
  { name: 'Shapleigh Community Library', url: 'https://www.shapleighlibrary.org', eventsUrl: 'https://www.shapleighlibrary.org/events', city: 'Shapleigh', state: 'ME', zipCode: '04076', county: 'Shapleigh County'},
  { name: 'Sherman Public Library', url: 'https://www.shermanlibrary.org', eventsUrl: 'https://www.shermanlibrary.org/events', city: 'Sherman', state: 'ME', zipCode: '04776', county: 'Sherman County'},
  { name: 'Skowhegan Public Library', url: 'https://www.skowheganlibrary.org', eventsUrl: 'https://www.skowheganlibrary.org/events', city: 'Skowhegan', state: 'ME', zipCode: '04976', county: 'Skowhegan County'},
  { name: 'Coolidge Library', url: 'https://www.solonlibrary.org', eventsUrl: 'https://www.solonlibrary.org/events', city: 'Solon', state: 'ME', zipCode: '04979', county: 'Solon County'},
  { name: 'South Berwick Public Library', url: 'https://www.southberwicklibrary.org', eventsUrl: 'https://www.southberwicklibrary.org/events', city: 'South Berwick', state: 'ME', zipCode: '03908', county: 'South Berwick County'},
  { name: 'Rutherford Library', url: 'https://www.southbristollibrary.org', eventsUrl: 'https://www.southbristollibrary.org/events', city: 'South Bristol', state: 'ME', zipCode: '04568', county: 'South Bristol County'},
  { name: 'South China Public Library', url: 'https://www.southchinalibrary.org', eventsUrl: 'https://www.southchinalibrary.org/events', city: 'South China', state: 'ME', zipCode: '04358', county: 'South China County'},
  { name: 'Paris Public Library', url: 'https://www.southparislibrary.org', eventsUrl: 'https://www.southparislibrary.org/events', city: 'South Paris', state: 'ME', zipCode: '04281', county: 'South Paris County'},
  { name: 'South Thomaston Public Library', url: 'https://www.souththomastonlibrary.org', eventsUrl: 'https://www.souththomastonlibrary.org/events', city: 'South Thomaston', state: 'ME', zipCode: '04858', county: 'South Thomaston County'},
  { name: 'Southport Memorial Library', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'ME', zipCode: '04576', county: 'Southport County'},
  { name: 'Southwest Harbor Public Library', url: 'https://www.southwestharborlibrary.org', eventsUrl: 'https://www.southwestharborlibrary.org/events', city: 'Southwest Harbor', state: 'ME', zipCode: '04679', county: 'Southwest Harbor County'},
  { name: 'Springvale Public Library', url: 'https://www.springvalelibrary.org', eventsUrl: 'https://www.springvalelibrary.org/events', city: 'Springvale', state: 'ME', zipCode: '04083', county: 'Springvale County'},
  { name: 'Long Lake Public Library', url: 'https://www.stagathalibrary.org', eventsUrl: 'https://www.stagathalibrary.org/events', city: 'St. Agatha', state: 'ME', zipCode: '04772', county: 'St. Agatha County'},
  { name: 'Standish - Richville Library', url: 'https://www.standishlibrary.org', eventsUrl: 'https://www.standishlibrary.org/events', city: 'Standish', state: 'ME', zipCode: '00000', county: 'Standish County'},
  { name: 'Steep Falls Library', url: 'https://www.steepfallslibrary.org', eventsUrl: 'https://www.steepfallslibrary.org/events', city: 'Steep Falls', state: 'ME', zipCode: '04085', county: 'Steep Falls County'},
  { name: 'Stetson Public Library', url: 'https://www.stetsonlibrary.org', eventsUrl: 'https://www.stetsonlibrary.org/events', city: 'Stetson', state: 'ME', zipCode: '04488', county: 'Stetson County'},
  { name: 'Henry D. Moore Library', url: 'https://www.steubenlibrary.org', eventsUrl: 'https://www.steubenlibrary.org/events', city: 'Steuben', state: 'ME', zipCode: '04680', county: 'Steuben County'},
  { name: 'Stockton Springs Community Library', url: 'https://www.stocktonspringslibrary.org', eventsUrl: 'https://www.stocktonspringslibrary.org/events', city: 'Stockton Springs', state: 'ME', zipCode: '04981', county: 'Stockton Springs County'},
  { name: 'Stonington Public Library', url: 'https://www.stoningtonlibrary.org', eventsUrl: 'https://www.stoningtonlibrary.org/events', city: 'Stonington', state: 'ME', zipCode: '04681', county: 'Stonington County'},
  { name: 'Stratton Public Library', url: 'https://www.strattonlibrary.org', eventsUrl: 'https://www.strattonlibrary.org/events', city: 'Stratton', state: 'ME', zipCode: '04982', county: 'Stratton County'},
  { name: 'Strong Public Library', url: 'https://www.stronglibrary.org', eventsUrl: 'https://www.stronglibrary.org/events', city: 'Strong', state: 'ME', zipCode: '04983', county: 'Strong County'},
  { name: 'Frenchmans Bay Library', url: 'https://www.sullivanlibrary.org', eventsUrl: 'https://www.sullivanlibrary.org/events', city: 'Sullivan', state: 'ME', zipCode: '04664', county: 'Sullivan County'},
  { name: 'Swans Island Public Library', url: 'https://www.swansislandlibrary.org', eventsUrl: 'https://www.swansislandlibrary.org/events', city: 'Swans Island', state: 'ME', zipCode: '04685', county: 'Swans Island County'},
  { name: 'Jackson Memorial Library', url: 'https://www.tenantsharborlibrary.org', eventsUrl: 'https://www.tenantsharborlibrary.org/events', city: 'Tenants Harbor', state: 'ME', zipCode: '04860', county: 'Tenants Harbor County'},
  { name: 'Thomaston Public Library', url: 'https://www.thomastonlibrary.org', eventsUrl: 'https://www.thomastonlibrary.org/events', city: 'Thomaston', state: 'ME', zipCode: '04861', county: 'Thomaston County'},
  { name: 'Topsham Public Library', url: 'https://www.topshamlibrary.org', eventsUrl: 'https://www.topshamlibrary.org/events', city: 'Topsham', state: 'ME', zipCode: '04086', county: 'Topsham County'},
  { name: 'Turner Public Library', url: 'https://www.turnerlibrary.org', eventsUrl: 'https://www.turnerlibrary.org/events', city: 'Turner', state: 'ME', zipCode: '04282', county: 'Turner County'},
  { name: 'Vose Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'ME', zipCode: '04862', county: 'Union County'},
  { name: 'Dorothy W Quimby Library', url: 'https://www.unitylibrary.org', eventsUrl: 'https://www.unitylibrary.org/events', city: 'Unity', state: 'ME', zipCode: '04988', county: 'Unity County'},
  { name: 'Abel J.Morneault Memorial Library', url: 'https://www.vanburenlibrary.org', eventsUrl: 'https://www.vanburenlibrary.org/events', city: 'Van Buren', state: 'ME', zipCode: '04785', county: 'Van Buren County'},
  { name: 'Vinalhaven Public Library', url: 'https://www.vinalhavenlibrary.org', eventsUrl: 'https://www.vinalhavenlibrary.org/events', city: 'Vinalhaven', state: 'ME', zipCode: '04863', county: 'Vinalhaven County'},
  { name: 'Waldoboro Public Library', url: 'https://www.waldoborolibrary.org', eventsUrl: 'https://www.waldoborolibrary.org/events', city: 'Waldoboro', state: 'ME', zipCode: '04572', county: 'Waldoboro County'},
  { name: 'Warren Free Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'ME', zipCode: '04864', county: 'Warren County'},
  { name: 'Washburn Memorial Library', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'ME', zipCode: '04786', county: 'Washburn County'},
  { name: 'Gibbs Library', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'ME', zipCode: '04574', county: 'Washington County'},
  { name: 'Waterford Library Association', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'ME', zipCode: '04088', county: 'Waterford County'},
  { name: 'Cary Memorial Library-Wayne', url: 'https://www.waynelibrary.org', eventsUrl: 'https://www.waynelibrary.org/events', city: 'Wayne', state: 'ME', zipCode: '04284', county: 'Wayne County'},
  { name: 'Weld Public Library', url: 'https://www.weldlibrary.org', eventsUrl: 'https://www.weldlibrary.org/events', city: 'Weld', state: 'ME', zipCode: '04285', county: 'Weld County'},
  { name: 'Wells Public Library', url: 'https://www.wellslibrary.org', eventsUrl: 'https://www.wellslibrary.org/events', city: 'Wells', state: 'ME', zipCode: '04090', county: 'Wells County'},
  { name: 'West Paris Public Library', url: 'https://www.westparislibrary.org', eventsUrl: 'https://www.westparislibrary.org/events', city: 'West Paris', state: 'ME', zipCode: '04289', county: 'West Paris County'},
  { name: 'Whitneyville Public Library', url: 'https://www.whitneyvillelibrary.org', eventsUrl: 'https://www.whitneyvillelibrary.org/events', city: 'Whitneyville', state: 'ME', zipCode: '04654', county: 'Whitneyville County'},
  { name: 'Wilton Free Public Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'ME', zipCode: '04294', county: 'Wilton County'},
  { name: 'Winslow Public Library', url: 'https://www.winslowlibrary.org', eventsUrl: 'https://www.winslowlibrary.org/events', city: 'Winslow', state: 'ME', zipCode: '04901', county: 'Winslow County'},
  { name: 'Winter Harbor Public Library', url: 'https://www.winterharborlibrary.org', eventsUrl: 'https://www.winterharborlibrary.org/events', city: 'Winter Harbor', state: 'ME', zipCode: '04693', county: 'Winter Harbor County'},
  { name: 'Winterport Memorial Library', url: 'https://www.winterportlibrary.org', eventsUrl: 'https://www.winterportlibrary.org/events', city: 'Winterport', state: 'ME', zipCode: '04496', county: 'Winterport County'},
  { name: 'Bailey Public Library', url: 'https://www.winthroplibrary.org', eventsUrl: 'https://www.winthroplibrary.org/events', city: 'Winthrop', state: 'ME', zipCode: '04364', county: 'Winthrop County'},
  { name: 'Wiscasset Public Library', url: 'https://www.wiscassetlibrary.org', eventsUrl: 'https://www.wiscassetlibrary.org/events', city: 'Wiscasset', state: 'ME', zipCode: '04578', county: 'Wiscasset County'},
  { name: 'Merrill Memorial Library', url: 'https://www.yarmouthlibrary.org', eventsUrl: 'https://www.yarmouthlibrary.org/events', city: 'Yarmouth', state: 'ME', zipCode: '04096', county: 'Yarmouth County'},
  { name: 'York Public Library', url: 'https://www.yorklibrary.org', eventsUrl: 'https://www.yorklibrary.org/events', city: 'York', state: 'ME', zipCode: '03909', county: 'York County'}

];

const SCRAPER_NAME = 'wordpress-ME';

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
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMECloudFunction };
