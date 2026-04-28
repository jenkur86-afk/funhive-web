const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: WA
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Seattle Public Library",
    "url": "https://www.spl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.spl.org/programs-and-services"
  },
  {
    "name": "Spokane Public Library",
    "url": "https://www.spokanelibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.spokanelibrary.org/events"
  }
]
 */

const LIBRARIES = [
  { name: 'Seattle Public Library', url: 'https://www.spl.org', platform: 'wordpress', eventsUrl: 'https://www.spl.org/programs-and-services', city: '', state: 'WA', zipCode: '', county: '' },
  { name: 'Aberdeen Timberland Library', url: 'https://www.aberdeenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.aberdeenlibrary.org/events', city: 'Aberdeen', state: 'WA', zipCode: '98520', county: '' },
  { name: 'Airway Heights Library', url: 'https://www.airwayheightslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.airwayheightslibrary.org/events', city: 'Airway Heights', state: 'WA', zipCode: '99001', county: '' },
  { name: 'Albion Branch Library', url: 'https://www.albionlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.albionlibrary.org/events', city: 'Albion', state: 'WA', zipCode: '99102', county: '' },
  { name: 'Amanda Park Timberland Library', url: 'https://www.amandaparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.amandaparklibrary.org/events', city: 'Amanda Park', state: 'WA', zipCode: '98526', county: '' },
  { name: 'Anacortes Public Library', url: 'https://www.anacorteslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.anacorteslibrary.org/events', city: 'Anacortes', state: 'WA', zipCode: '98221', county: '' },
  { name: 'Arlington Library', url: 'https://www.arlingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.arlingtonlibrary.org/events', city: 'Arlington', state: 'WA', zipCode: '98223', county: '' },
  { name: 'Auburn Public Library', url: 'https://www.auburnlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.auburnlibrary.org/events', city: 'Auburn', state: 'WA', zipCode: '98002', county: '' },
  { name: 'Muckleshoot Library', url: 'https://www.muckleshootlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.muckleshootlibrary.org/events', city: 'Auburn', state: 'WA', zipCode: '98092', county: '' },
  { name: 'Bainbridge Island Library', url: 'https://www.bainbridgeislandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bainbridgeislandlibrary.org/events', city: 'Bainbridge Island', state: 'WA', zipCode: '98110', county: '' },
  { name: 'Basin City Library', url: 'https://www.basincitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.basincitylibrary.org/events', city: 'Basin City', state: 'WA', zipCode: '99343', county: '' },
  { name: 'Battle Ground Community Library', url: 'https://www.battlegroundlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.battlegroundlibrary.org/events', city: 'Battle Ground', state: 'WA', zipCode: '98604', county: '' },
  { name: 'North Mason Timberland Library', url: 'https://www.northmasontimberlandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northmasontimberlandlibrary.org/events', city: 'Belfair', state: 'WA', zipCode: '98528', county: '' },
  { name: 'Bellevue Library', url: 'https://www.bellevuelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bellevuelibrary.org/events', city: 'Bellevue', state: 'WA', zipCode: '98004', county: '' },
  { name: 'Lake Hills Library', url: 'https://www.lakehillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakehillslibrary.org/events', city: 'Bellevue', state: 'WA', zipCode: '98007', county: '' },
  { name: 'Library Connection At Crossroads', url: 'https://www.libraryconnectionatcrossroads.org', platform: 'wordpress', eventsUrl: 'https://www.libraryconnectionatcrossroads.org/events', city: 'Bellevue', state: 'WA', zipCode: '98008', county: '' },
  { name: 'Newport Way Library', url: 'https://www.newportwaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newportwaylibrary.org/events', city: 'Bellevue', state: 'WA', zipCode: '98006', county: '' },
  { name: 'Benton City Library', url: 'https://www.bentoncitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bentoncitylibrary.org/events', city: 'Benton City', state: 'WA', zipCode: '99320', county: '' },
  { name: 'Black Diamond Library', url: 'https://www.blackdiamondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.blackdiamondlibrary.org/events', city: 'Black Diamond', state: 'WA', zipCode: '98010', county: '' },
  { name: 'Blaine Library', url: 'https://www.blainelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.blainelibrary.org/events', city: 'Blaine', state: 'WA', zipCode: '98230', county: '' },
  { name: 'Bonney Lake Library', url: 'https://www.bonneylakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bonneylakelibrary.org/events', city: 'Bonney Lake', state: 'WA', zipCode: '98390', county: '' },
  { name: 'Bothell Library', url: 'https://www.bothelllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bothelllibrary.org/events', city: 'Bothell', state: 'WA', zipCode: '98011', county: '' },
  { name: 'Brewster Community Library', url: 'https://www.brewsterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brewsterlibrary.org/events', city: 'Brewster', state: 'WA', zipCode: '98812', county: '' },
  { name: 'Bridgeport Community Library', url: 'https://www.bridgeportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bridgeportlibrary.org/events', city: 'Bridgeport', state: 'WA', zipCode: '98813', county: '' },
  { name: 'Brier Library', url: 'https://www.brierlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brierlibrary.org/events', city: 'Brier', state: 'WA', zipCode: '98036', county: '' },
  { name: 'Buckley Library', url: 'https://www.buckleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.buckleylibrary.org/events', city: 'Buckley', state: 'WA', zipCode: '98321', county: '' },
  { name: 'Buena Library', url: 'https://www.buenalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.buenalibrary.org/events', city: 'Buena', state: 'WA', zipCode: '98921', county: '' },
  { name: 'Burbank Heights Library', url: 'https://www.burbanklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burbanklibrary.org/events', city: 'Burbank', state: 'WA', zipCode: '99323', county: '' },
  { name: 'Burien Library', url: 'https://www.burienlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burienlibrary.org/events', city: 'Burien', state: 'WA', zipCode: '98166', county: '' },
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'WA', zipCode: '98233', county: '' },
  { name: 'Camas Public Library', url: 'https://www.camaslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.camaslibrary.org/events', city: 'Camas', state: 'WA', zipCode: '98607', county: '' },
  { name: 'Carnation Library', url: 'https://www.carnationlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carnationlibrary.org/events', city: 'Carnation', state: 'WA', zipCode: '98014', county: '' },
  { name: 'Cashmere Community Library', url: 'https://www.cashmerelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cashmerelibrary.org/events', city: 'Cashmere', state: 'WA', zipCode: '98815', county: '' },
  { name: 'Castle Rock Public Library', url: 'https://www.castlerocklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.castlerocklibrary.org/events', city: 'Castle Rock', state: 'WA', zipCode: '98611', county: '' },
  { name: 'Cathlamet (Blanche Bradley) Public Library', url: 'https://www.cathlametlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cathlametlibrary.org/events', city: 'Cathlamet', state: 'WA', zipCode: '98612', county: '' },
  { name: 'Centralia Timberland Library', url: 'https://www.centralialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centralialibrary.org/events', city: 'Centralia', state: 'WA', zipCode: '98531', county: '' },
  { name: 'Chehalis Timberland Library', url: 'https://www.chehalislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chehalislibrary.org/events', city: 'Chehalis', state: 'WA', zipCode: '98532', county: '' },
  { name: 'Chelan Community Library', url: 'https://www.chelanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chelanlibrary.org/events', city: 'Chelan', state: 'WA', zipCode: '98816', county: '' },
  { name: 'Cheney Library', url: 'https://www.cheneylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cheneylibrary.org/events', city: 'Cheney', state: 'WA', zipCode: '99004', county: '' },
  { name: 'Chewelah Public Library', url: 'https://www.chewelahlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chewelahlibrary.org/events', city: 'Chewelah', state: 'WA', zipCode: '99109', county: '' },
  { name: 'Clallam Bay Public Library', url: 'https://www.clallambaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.clallambaylibrary.org/events', city: 'Clallam Bay', state: 'WA', zipCode: '98326', county: '' },
  { name: 'Asotin County Library', url: 'https://www.asotincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.asotincountylibrary.org/events', city: 'Clarkston', state: 'WA', zipCode: '99403', county: '' },
  { name: 'Heights Branch Library', url: 'https://www.heightsbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.heightsbranchlibrary.org/events', city: 'Clarkston', state: 'WA', zipCode: '99403', county: '' },
  { name: 'Cle Elum (Carpenter Memorial) Library', url: 'https://www.cleelumlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cleelumlibrary.org/events', city: 'Cle Elum', state: 'WA', zipCode: '98922', county: '' },
  { name: 'Clinton Library', url: 'https://www.clintonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'WA', zipCode: '98236', county: '' },
  { name: 'Colfax Library', url: 'https://www.colfaxlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.colfaxlibrary.org/events', city: 'Colfax', state: 'WA', zipCode: '99111', county: '' },
  { name: 'Whitman County Library', url: 'https://www.whitmancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitmancountylibrary.org/events', city: 'Colfax', state: 'WA', zipCode: '99111', county: '' },
  { name: 'Colton Branch Library', url: 'https://www.coltonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.coltonlibrary.org/events', city: 'Colton', state: 'WA', zipCode: '99113', county: '' },
  { name: 'Colville Public Library', url: 'https://www.colvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.colvillelibrary.org/events', city: 'Colville', state: 'WA', zipCode: '99114', county: '' },
  { name: 'Onion Creek Library', url: 'https://www.onioncreeklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.onioncreeklibrary.org/events', city: 'Colville', state: 'WA', zipCode: '99114', county: '' },
  { name: 'Concrete Public Library', url: 'https://www.concretelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.concretelibrary.org/events', city: 'Concrete', state: 'WA', zipCode: '98237', county: '' },
  { name: 'Upper Skagit Library District', url: 'https://www.upperskagitlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.upperskagitlibrarydistrict.org/events', city: 'Concrete', state: 'WA', zipCode: '98237', county: '' },
  { name: 'Connell Library', url: 'https://www.connelllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.connelllibrary.org/events', city: 'Connell', state: 'WA', zipCode: '99326', county: '' },
  { name: 'Coulee City Community Library', url: 'https://www.couleecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.couleecitylibrary.org/events', city: 'Coulee City', state: 'WA', zipCode: '99115', county: '' },
  { name: 'Coupeville Library', url: 'https://www.coupevillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.coupevillelibrary.org/events', city: 'Coupeville', state: 'WA', zipCode: '98239', county: '' },
  { name: 'Covington Library', url: 'https://www.covingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.covingtonlibrary.org/events', city: 'Covington', state: 'WA', zipCode: '98042', county: '' },
  { name: 'Calispel Valley Library', url: 'https://www.calispelvalleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calispelvalleylibrary.org/events', city: 'Cusick', state: 'WA', zipCode: '99119', county: '' },
  { name: 'Darrington Library', url: 'https://www.darringtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.darringtonlibrary.org/events', city: 'Darrington', state: 'WA', zipCode: '98241', county: '' },
  { name: 'Davenport Public Library', url: 'https://www.davenportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.davenportlibrary.org/events', city: 'Davenport', state: 'WA', zipCode: '99122', county: '' },
  { name: 'Columbia County Rural Library District', url: 'https://www.columbiacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.columbiacountylibrary.org/events', city: 'Dayton', state: 'WA', zipCode: '99328', county: '' },
  { name: 'Dayton Memorial Library', url: 'https://www.daytonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.daytonlibrary.org/events', city: 'Dayton', state: 'WA', zipCode: '99328', county: '' },
  { name: 'Deer Park Library', url: 'https://www.deerparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'WA', zipCode: '99006', county: '' },
  { name: 'Deming Library', url: 'https://www.deminglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deminglibrary.org/events', city: 'Deming', state: 'WA', zipCode: '98244', county: '' },
  { name: 'Des Moines Library', url: 'https://www.desmoineslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.desmoineslibrary.org/events', city: 'Des Moines', state: 'WA', zipCode: '98198', county: '' },
  { name: 'Woodmont Library', url: 'https://www.woodmontlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woodmontlibrary.org/events', city: 'Des Moines', state: 'WA', zipCode: '98198', county: '' },
  { name: 'Duvall Library', url: 'https://www.duvalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.duvalllibrary.org/events', city: 'Duvall', state: 'WA', zipCode: '98019', county: '' },
  { name: 'East Wenatchee Community Library', url: 'https://www.eastwenatcheelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastwenatcheelibrary.org/events', city: 'East Wenatchee', state: 'WA', zipCode: '98802', county: '' },
  { name: 'Orcas Island Library District', url: 'https://www.orcasislandlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.orcasislandlibrarydistrict.org/events', city: 'Eastsound', state: 'WA', zipCode: '98245', county: '' },
  { name: 'Eatonville Library', url: 'https://www.eatonvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eatonvillelibrary.org/events', city: 'Eatonville', state: 'WA', zipCode: '98328', county: '' },
  { name: 'Edmonds Library', url: 'https://www.edmondslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edmondslibrary.org/events', city: 'Edmonds', state: 'WA', zipCode: '98020', county: '' },
  { name: 'Ellensburg Public Library', url: 'https://www.ellensburglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ellensburglibrary.org/events', city: 'Ellensburg', state: 'WA', zipCode: '98926', county: '' },
  { name: 'Elma Timberland Library', url: 'https://www.elmalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elmalibrary.org/events', city: 'Elma', state: 'WA', zipCode: '98541', county: '' },
  { name: 'Merrills Corner Library', url: 'https://www.merrillscornerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.merrillscornerlibrary.org/events', city: 'Eltopia', state: 'WA', zipCode: '99330', county: '' },
  { name: 'Endicott Branch Library', url: 'https://www.endicottlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.endicottlibrary.org/events', city: 'Endicott', state: 'WA', zipCode: '99125', county: '' },
  { name: 'Entiat Community Library', url: 'https://www.entiatlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.entiatlibrary.org/events', city: 'Entiat', state: 'WA', zipCode: '98822', county: '' },
  { name: 'Enumclaw Public Library', url: 'https://www.enumclawlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.enumclawlibrary.org/events', city: 'Enumclaw', state: 'WA', zipCode: '98022', county: '' },
  { name: 'Ephrata Community Library', url: 'https://www.ephratalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ephratalibrary.org/events', city: 'Ephrata', state: 'WA', zipCode: '98823', county: '' },
  { name: 'Everett Public Library', url: 'https://www.everettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.everettlibrary.org/events', city: 'Everett', state: 'WA', zipCode: '98201', county: '' },
  { name: 'Evergreen Branch Library', url: 'https://www.evergreenbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.evergreenbranchlibrary.org/events', city: 'Everett', state: 'WA', zipCode: '98204', county: '' },
  { name: 'Everson Library', url: 'https://www.eversonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eversonlibrary.org/events', city: 'Everson', state: 'WA', zipCode: '98247', county: '' },
  { name: 'Fairfield Library', url: 'https://www.fairfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fairfieldlibrary.org/events', city: 'Fairfield', state: 'WA', zipCode: '99012', county: '' },
  { name: 'Fall City Library', url: 'https://www.fallcitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fallcitylibrary.org/events', city: 'Fall City', state: 'WA', zipCode: '98024', county: '' },
  { name: 'Farmington Branch Library', url: 'https://www.farmingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.farmingtonlibrary.org/events', city: 'Farmington', state: 'WA', zipCode: '99128', county: '' },
  { name: 'Federal Way 320th Library', url: 'https://www.federalwaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.federalwaylibrary.org/events', city: 'Federal Way', state: 'WA', zipCode: '98003', county: '' },
  { name: 'Federal Way Library', url: 'https://www.federalwaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.federalwaylibrary.org/events', city: 'Federal Way', state: 'WA', zipCode: '98003', county: '' },
  { name: 'Ferndale Library', url: 'https://www.ferndalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ferndalelibrary.org/events', city: 'Ferndale', state: 'WA', zipCode: '98248', county: '' },
  { name: 'Forks Public Library', url: 'https://www.forkslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.forkslibrary.org/events', city: 'Forks', state: 'WA', zipCode: '98331', county: '' },
  { name: 'Freeland Library', url: 'https://www.freelandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.freelandlibrary.org/events', city: 'Freeland', state: 'WA', zipCode: '98249', county: '' },
  { name: 'San Juan Island Library District', url: 'https://www.sanjuanislandlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.sanjuanislandlibrarydistrict.org/events', city: 'Friday Harbor', state: 'WA', zipCode: '98250', county: '' },
  { name: 'Garfield Branch Library', url: 'https://www.garfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldlibrary.org/events', city: 'Garfield', state: 'WA', zipCode: '99130', county: '' },
  { name: 'Peninsula Library', url: 'https://www.peninsulalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.peninsulalibrary.org/events', city: 'Gig Harbor', state: 'WA', zipCode: '98335', county: '' },
  { name: 'Goldendale Community Library', url: 'https://www.goldendalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.goldendalelibrary.org/events', city: 'Goldendale', state: 'WA', zipCode: '98620', county: '' },
  { name: 'Graham Library', url: 'https://www.grahamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grahamlibrary.org/events', city: 'Graham', state: 'WA', zipCode: '98338', county: '' },
  { name: 'Grand Coulee Community Library', url: 'https://www.grandcouleelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandcouleelibrary.org/events', city: 'Grand Coulee', state: 'WA', zipCode: '99133', county: '' },
  { name: 'Grandview Library', url: 'https://www.grandviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandviewlibrary.org/events', city: 'Grandview', state: 'WA', zipCode: '98930', county: '' },
  { name: 'Granger Library', url: 'https://www.grangerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grangerlibrary.org/events', city: 'Granger', state: 'WA', zipCode: '98932', county: '' },
  { name: 'Granite Falls Library', url: 'https://www.granitefallslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.granitefallslibrary.org/events', city: 'Granite Falls', state: 'WA', zipCode: '98252', county: '' },
  { name: 'Harrah Library', url: 'https://www.harrahlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harrahlibrary.org/events', city: 'Harrah', state: 'WA', zipCode: '98933', county: '' },
  { name: 'Harrington Public Library', url: 'https://www.harringtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harringtonlibrary.org/events', city: 'Harrington', state: 'WA', zipCode: '99134', county: '' },
  { name: 'Hoodsport Timberland Library', url: 'https://www.hoodsportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hoodsportlibrary.org/events', city: 'Hoodsport', state: 'WA', zipCode: '98548', county: '' },
  { name: 'Hoquiam Timberland Library', url: 'https://www.hoquiamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hoquiamlibrary.org/events', city: 'Hoquiam', state: 'WA', zipCode: '98550', county: '' },
  { name: 'Hunters Public Library', url: 'https://www.hunterslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hunterslibrary.org/events', city: 'Hunters', state: 'WA', zipCode: '99129', county: '' },
  { name: 'Ilwaco Timberland Library', url: 'https://www.ilwacolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ilwacolibrary.org/events', city: 'Ilwaco', state: 'WA', zipCode: '98624', county: '' },
  { name: 'Ione Public Library', url: 'https://www.ionelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ionelibrary.org/events', city: 'Ione', state: 'WA', zipCode: '99139', county: '' },
  { name: 'Kahlotus Library', url: 'https://www.kahlotuslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kahlotuslibrary.org/events', city: 'Kahlotus', state: 'WA', zipCode: '99335', county: '' },
  { name: 'Kalama Public Library', url: 'https://www.kalamalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kalamalibrary.org/events', city: 'Kalama', state: 'WA', zipCode: '98625', county: '' },
  { name: 'Kelso Public Library', url: 'https://www.kelsolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kelsolibrary.org/events', city: 'Kelso', state: 'WA', zipCode: '98626', county: '' },
  { name: 'Kenmore Library', url: 'https://www.kenmorelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kenmorelibrary.org/events', city: 'Kenmore', state: 'WA', zipCode: '98028', county: '' },
  { name: 'Keewaydin Library', url: 'https://www.keewaydinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.keewaydinlibrary.org/events', city: 'Kennewick', state: 'WA', zipCode: '99336', county: '' },
  { name: 'Kennewick Library', url: 'https://www.kennewicklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kennewicklibrary.org/events', city: 'Kennewick', state: 'WA', zipCode: '99338', county: '' },
  { name: 'Mid-Columbia Library System', url: 'https://www.midcolumbialibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.midcolumbialibrarysystem.org/events', city: 'Kennewick', state: 'WA', zipCode: '99336', county: '' },
  { name: 'Kent Library', url: 'https://www.kentlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kentlibrary.org/events', city: 'Kent', state: 'WA', zipCode: '98032', county: '' },
  { name: 'Columbia River Community Library', url: 'https://www.columbiarivercommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.columbiarivercommunitylibrary.org/events', city: 'Kettle Falls', state: 'WA', zipCode: '99141', county: '' },
  { name: 'Kettle Falls Public Library', url: 'https://www.kettlefallslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kettlefallslibrary.org/events', city: 'Kettle Falls', state: 'WA', zipCode: '99141', county: '' },
  { name: 'Kingston Library', url: 'https://www.kingstonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'WA', zipCode: '98346', county: '' },
  { name: 'Little Boston Library', url: 'https://www.littlebostonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.littlebostonlibrary.org/events', city: 'Kingston', state: 'WA', zipCode: '98346', county: '' },
  { name: 'Kingsgate Library', url: 'https://www.kingsgatelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingsgatelibrary.org/events', city: 'Kirkland', state: 'WA', zipCode: '98034', county: '' },
  { name: 'Kirkland Library', url: 'https://www.kirklandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kirklandlibrary.org/events', city: 'Kirkland', state: 'WA', zipCode: '98033', county: '' },
  { name: 'Kittitas Public Library', url: 'https://www.kittitaslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kittitaslibrary.org/events', city: 'Kittitas', state: 'WA', zipCode: '98934', county: '' },
  { name: 'La Conner Regional Library', url: 'https://www.laconnerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laconnerlibrary.org/events', city: 'La Conner', state: 'WA', zipCode: '98257', county: '' },
  { name: 'Lacey Timberland Library', url: 'https://www.laceylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laceylibrary.org/events', city: 'Lacey', state: 'WA', zipCode: '98503', county: '' },
  { name: 'Lacrosse Branch Library', url: 'https://www.lacrosselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lacrosselibrary.org/events', city: 'Lacrosse', state: 'WA', zipCode: '99143', county: '' },
  { name: 'Lake Forest Park Library', url: 'https://www.lakeforestparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakeforestparklibrary.org/events', city: 'Lake Forest Park', state: 'WA', zipCode: '98155', county: '' },
  { name: 'Lake Stevens Library', url: 'https://www.lakestevenslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakestevenslibrary.org/events', city: 'Lake Stevens', state: 'WA', zipCode: '98258', county: '' },
  { name: 'Key Center Library', url: 'https://www.keycenterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.keycenterlibrary.org/events', city: 'Lakebay', state: 'WA', zipCode: '98349', county: '' },
  { name: 'Lakewood Library', url: 'https://www.lakewoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakewoodlibrary.org/events', city: 'Lakewood', state: 'WA', zipCode: '98499', county: '' },
  { name: 'Tillicum Library', url: 'https://www.tillicumlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tillicumlibrary.org/events', city: 'Lakewood', state: 'WA', zipCode: '98498', county: '' },
  { name: 'Langley Library', url: 'https://www.langleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.langleylibrary.org/events', city: 'Langley', state: 'WA', zipCode: '98260', county: '' },
  { name: 'Leavenworth Community Library', url: 'https://www.leavenworthlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.leavenworthlibrary.org/events', city: 'Leavenworth', state: 'WA', zipCode: '98826', county: '' },
  { name: 'Liberty Lake Municipal Library', url: 'https://www.libertylakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.libertylakelibrary.org/events', city: 'Liberty Lake', state: 'WA', zipCode: '99019', county: '' },
  { name: 'Longview Public Library', url: 'https://www.longviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.longviewlibrary.org/events', city: 'Longview', state: 'WA', zipCode: '98632', county: '' },
  { name: 'Library Of The Lakes', url: 'https://www.libraryofthelakes.org', platform: 'wordpress', eventsUrl: 'https://www.libraryofthelakes.org/events', city: 'Loon Lake', state: 'WA', zipCode: '99148', county: '' },
  { name: 'Stevens County Rural Library District', url: 'https://www.stevenscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stevenscountylibrary.org/events', city: 'Loon Lake', state: 'WA', zipCode: '99148', county: '' },
  { name: 'Lopez Island Library District', url: 'https://www.lopezislandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lopezislandlibrary.org/events', city: 'Lopez Island', state: 'WA', zipCode: '98261', county: '' },
  { name: 'Island Library', url: 'https://www.islandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.islandlibrary.org/events', city: 'Lummi Island', state: 'WA', zipCode: '98262', county: '' },
  { name: 'Lynden Library', url: 'https://www.lyndenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lyndenlibrary.org/events', city: 'Lynden', state: 'WA', zipCode: '98264', county: '' },
  { name: 'Lynnwood Library', url: 'https://www.lynnwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lynnwoodlibrary.org/events', city: 'Lynnwood', state: 'WA', zipCode: '98036', county: '' },
  { name: 'Mabton Library', url: 'https://www.mabtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mabtonlibrary.org/events', city: 'Mabton', state: 'WA', zipCode: '98935', county: '' },
  { name: 'Manchester Library', url: 'https://www.manchesterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'WA', zipCode: '98353', county: '' },
  { name: 'Manson Community Library', url: 'https://www.mansonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mansonlibrary.org/events', city: 'Manson', state: 'WA', zipCode: '98831', county: '' },
  { name: 'Maple Falls Library', url: 'https://www.maplefallslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maplefallslibrary.org/events', city: 'Maple Falls', state: 'WA', zipCode: '98266', county: '' },
  { name: 'Maple Valley Library', url: 'https://www.maplevalleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maplevalleylibrary.org/events', city: 'Maple Valley', state: 'WA', zipCode: '98038', county: '' },
  { name: 'Mattawa Community Library', url: 'https://www.mattawalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mattawalibrary.org/events', city: 'Mattawa', state: 'WA', zipCode: '99349', county: '' },
  { name: 'Mccleary Timberland Library', url: 'https://www.mcclearylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mcclearylibrary.org/events', city: 'Mccleary', state: 'WA', zipCode: '98557', county: '' },
  { name: 'Medical Lake Library', url: 'https://www.medicallakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.medicallakelibrary.org/events', city: 'Medical Lake', state: 'WA', zipCode: '99022', county: '' },
  { name: 'Mercer Island Library', url: 'https://www.mercerislandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mercerislandlibrary.org/events', city: 'Mercer Island', state: 'WA', zipCode: '98040', county: '' },
  { name: 'Metalines Community Library', url: 'https://www.metalinescommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.metalinescommunitylibrary.org/events', city: 'Metaline Falls', state: 'WA', zipCode: '99153', county: '' },
  { name: 'Mill Creek Library', url: 'https://www.millcreeklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.millcreeklibrary.org/events', city: 'Mill Creek', state: 'WA', zipCode: '98012', county: '' },
  { name: 'Milton Library', url: 'https://www.miltonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'WA', zipCode: '98354', county: '' },
  { name: 'Monroe Library', url: 'https://www.monroelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'WA', zipCode: '98272', county: '' },
  { name: 'W. H. Abel Memorial Library', url: 'https://www.whabelmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whabelmemoriallibrary.org/events', city: 'Montesano', state: 'WA', zipCode: '98563', county: '' },
  { name: 'Moses Lake Community Library', url: 'https://www.moseslakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.moseslakelibrary.org/events', city: 'Moses Lake', state: 'WA', zipCode: '98837', county: '' },
  { name: 'Mount Vernon City Library', url: 'https://www.mountvernonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mountvernonlibrary.org/events', city: 'Mount Vernon', state: 'WA', zipCode: '98273', county: '' },
  { name: 'Mountlake Terrace Library', url: 'https://www.mountlaketerracelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mountlaketerracelibrary.org/events', city: 'Mountlake Terrace', state: 'WA', zipCode: '98043', county: '' },
  { name: 'Moxee Library', url: 'https://www.moxeelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.moxeelibrary.org/events', city: 'Moxee', state: 'WA', zipCode: '98936', county: '' },
  { name: 'Mukilteo Public Library', url: 'https://www.mukilteolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mukilteolibrary.org/events', city: 'Mukilteo', state: 'WA', zipCode: '98275', county: '' },
  { name: 'Naches Library', url: 'https://www.nacheslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nacheslibrary.org/events', city: 'Naches', state: 'WA', zipCode: '98937', county: '' },
  { name: 'Nile Library', url: 'https://www.nilelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nilelibrary.org/events', city: 'Naches', state: 'WA', zipCode: '98937', county: '' },
  { name: 'Naselle Timberland Library', url: 'https://www.nasellelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nasellelibrary.org/events', city: 'Naselle', state: 'WA', zipCode: '98638', county: '' },
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'WA', zipCode: '99156', county: '' },
  { name: 'Pend Oreille County Library District', url: 'https://www.pendoreillecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pendoreillecountylibrary.org/events', city: 'Newport', state: 'WA', zipCode: '99156', county: '' },
  { name: 'Lakeside Community Library', url: 'https://www.lakesidecommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakesidecommunitylibrary.org/events', city: 'Nine Mile Falls', state: 'WA', zipCode: '99026', county: '' },
  { name: 'North Bend Library', url: 'https://www.northbendlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northbendlibrary.org/events', city: 'North Bend', state: 'WA', zipCode: '98045', county: '' },
  { name: 'North Bonneville Community Library', url: 'https://www.northbonnevillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northbonnevillelibrary.org/events', city: 'North Bonneville', state: 'WA', zipCode: '98639', county: '' },
  { name: 'Northport Community Library', url: 'https://www.northportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northportlibrary.org/events', city: 'Northport', state: 'WA', zipCode: '99157', county: '' },
  { name: 'Oak Harbor Library', url: 'https://www.oakharborlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oakharborlibrary.org/events', city: 'Oak Harbor', state: 'WA', zipCode: '98277', county: '' },
  { name: 'Oakesdale Branch Library', url: 'https://www.oakesdalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oakesdalelibrary.org/events', city: 'Oakesdale', state: 'WA', zipCode: '99158', county: '' },
  { name: 'Oakville Timberland Library', url: 'https://www.oakvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oakvillelibrary.org/events', city: 'Oakville', state: 'WA', zipCode: '98568', county: '' },
  { name: 'Ocean Park Timberland Library', url: 'https://www.oceanparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oceanparklibrary.org/events', city: 'Ocean Park', state: 'WA', zipCode: '98640', county: '' },
  { name: 'Ocean Shores Public Library', url: 'https://www.oceanshoreslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oceanshoreslibrary.org/events', city: 'Ocean Shores', state: 'WA', zipCode: '98569', county: '' },
  { name: 'Odessa Public Library', url: 'https://www.odessalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.odessalibrary.org/events', city: 'Odessa', state: 'WA', zipCode: '99159', county: '' },
  { name: 'Okanogan Community Library', url: 'https://www.okanoganlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.okanoganlibrary.org/events', city: 'Okanogan', state: 'WA', zipCode: '98840', county: '' },
  { name: 'Omak Community Library', url: 'https://www.omaklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.omaklibrary.org/events', city: 'Omak', state: 'WA', zipCode: '98841', county: '' },
  { name: 'Kettle River East Library', url: 'https://www.kettlerivereastlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kettlerivereastlibrary.org/events', city: 'Orient', state: 'WA', zipCode: '99160', county: '' },
  { name: 'Oroville Community Library', url: 'https://www.orovillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.orovillelibrary.org/events', city: 'Oroville', state: 'WA', zipCode: '98844', county: '' },
  { name: 'Orting Library', url: 'https://www.ortinglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ortinglibrary.org/events', city: 'Orting', state: 'WA', zipCode: '98360', county: '' },
  { name: 'Othello Library', url: 'https://www.othellolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.othellolibrary.org/events', city: 'Othello', state: 'WA', zipCode: '99344', county: '' },
  { name: 'Otis Orchards Library', url: 'https://www.otisorchardslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.otisorchardslibrary.org/events', city: 'Otis Orchards', state: 'WA', zipCode: '99027', county: '' },
  { name: 'Algona-Pacific Library', url: 'https://www.pacificlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pacificlibrary.org/events', city: 'Pacific', state: 'WA', zipCode: '98047', county: '' },
  { name: 'Packwood Timberland Library', url: 'https://www.packwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.packwoodlibrary.org/events', city: 'Packwood', state: 'WA', zipCode: '98361', county: '' },
  { name: 'Palouse Branch Library', url: 'https://www.palouselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palouselibrary.org/events', city: 'Palouse', state: 'WA', zipCode: '99161', county: '' },
  { name: 'Pasco Library', url: 'https://www.pascolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pascolibrary.org/events', city: 'Pasco', state: 'WA', zipCode: '99301', county: '' },
  { name: 'Pateros Community Library', url: 'https://www.pateroslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pateroslibrary.org/events', city: 'Pateros', state: 'WA', zipCode: '98846', county: '' },
  { name: 'Peshastin Community Library', url: 'https://www.peshastinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.peshastinlibrary.org/events', city: 'Peshastin', state: 'WA', zipCode: '98847', county: '' },
  { name: 'Point Roberts Library', url: 'https://www.pointrobertslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pointrobertslibrary.org/events', city: 'Point Roberts', state: 'WA', zipCode: '98281', county: '' },
  { name: 'Pomeroy (Denny Ashby) Library', url: 'https://www.pomeroylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pomeroylibrary.org/events', city: 'Pomeroy', state: 'WA', zipCode: '99347', county: '' },
  { name: 'North Olympic Library System', url: 'https://www.northolympiclibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.northolympiclibrarysystem.org/events', city: 'Port Angeles', state: 'WA', zipCode: '98362', county: '' },
  { name: 'Port Angeles Public Library', url: 'https://www.portangeleslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.portangeleslibrary.org/events', city: 'Port Angeles', state: 'WA', zipCode: '98362', county: '' },
  { name: 'Jefferson County Rural Library District', url: 'https://www.jeffersoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffersoncountylibrary.org/events', city: 'Port Hadlock', state: 'WA', zipCode: '98339', county: '' },
  { name: 'Port Orchard Library', url: 'https://www.portorchardlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.portorchardlibrary.org/events', city: 'Port Orchard', state: 'WA', zipCode: '98366', county: '' },
  { name: 'Port Townsend Public Library', url: 'https://www.porttownsendlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.porttownsendlibrary.org/events', city: 'Port Townsend', state: 'WA', zipCode: '98368', county: '' },
  { name: 'Poulsbo Library', url: 'https://www.poulsbolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.poulsbolibrary.org/events', city: 'Poulsbo', state: 'WA', zipCode: '98370', county: '' },
  { name: 'Prescott Library', url: 'https://www.prescottlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.prescottlibrary.org/events', city: 'Prescott', state: 'WA', zipCode: '99348', county: '' },
  { name: 'Prosser Library', url: 'https://www.prosserlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.prosserlibrary.org/events', city: 'Prosser', state: 'WA', zipCode: '99350', county: '' },
  { name: 'Pullman (Neill) Public Library', url: 'https://www.pullmanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pullmanlibrary.org/events', city: 'Pullman', state: 'WA', zipCode: '99163', county: '' },
  { name: 'Puyallup Public Library', url: 'https://www.puyalluplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.puyalluplibrary.org/events', city: 'Puyallup', state: 'WA', zipCode: '98371', county: '' },
  { name: 'South Hill Library', url: 'https://www.southhilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southhilllibrary.org/events', city: 'Puyallup', state: 'WA', zipCode: '98375', county: '' },
  { name: 'Quincy Community Library', url: 'https://www.quincylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'WA', zipCode: '98848', county: '' },
  { name: 'Mountain View Timberland Library', url: 'https://www.mountainviewtimberlandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mountainviewtimberlandlibrary.org/events', city: 'Randle', state: 'WA', zipCode: '98377', county: '' },
  { name: 'Raymond Timberland Library', url: 'https://www.raymondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.raymondlibrary.org/events', city: 'Raymond', state: 'WA', zipCode: '98577', county: '' },
  { name: 'Reardan Memorial Library', url: 'https://www.reardanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.reardanlibrary.org/events', city: 'Reardan', state: 'WA', zipCode: '99029', county: '' },
  { name: 'Library Express At Redmond Ridge', url: 'https://www.redmondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.redmondlibrary.org/events', city: 'Redmond', state: 'WA', zipCode: '98053', county: '' },
  { name: 'Redmond Library', url: 'https://www.redmondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.redmondlibrary.org/events', city: 'Redmond', state: 'WA', zipCode: '98052', county: '' },
  { name: 'Fairwood Library', url: 'https://www.fairwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fairwoodlibrary.org/events', city: 'Renton', state: 'WA', zipCode: '98058', county: '' },
  { name: 'Highlands Public Library', url: 'https://www.highlandspubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.highlandspubliclibrary.org/events', city: 'Renton', state: 'WA', zipCode: '98056', county: '' },
  { name: 'Renton Highlands Library', url: 'https://www.rentonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rentonlibrary.org/events', city: 'Renton', state: 'WA', zipCode: '98056', county: '' },
  { name: 'Renton Library', url: 'https://www.rentonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rentonlibrary.org/events', city: 'Renton', state: 'WA', zipCode: '98057', county: '' },
  { name: 'Republic Community Library', url: 'https://www.republiclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.republiclibrary.org/events', city: 'Republic', state: 'WA', zipCode: '99166', county: '' },
  { name: 'Richland Public Library', url: 'https://www.richlandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.richlandlibrary.org/events', city: 'Richland', state: 'WA', zipCode: '99352', county: '' },
  { name: 'Ridgefield Community Library', url: 'https://www.ridgefieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ridgefieldlibrary.org/events', city: 'Ridgefield', state: 'WA', zipCode: '98642', county: '' },
  { name: 'Ritzville Public Library', url: 'https://www.ritzvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ritzvillelibrary.org/events', city: 'Ritzville', state: 'WA', zipCode: '99169', county: '' },
  { name: 'Rosalia Branch Library', url: 'https://www.rosalialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rosalialibrary.org/events', city: 'Rosalia', state: 'WA', zipCode: '99170', county: '' },
  { name: 'Roslyn Public Library', url: 'https://www.roslynlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roslynlibrary.org/events', city: 'Roslyn', state: 'WA', zipCode: '98941', county: '' },
  { name: 'Roy City Library', url: 'https://www.roylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roylibrary.org/events', city: 'Roy', state: 'WA', zipCode: '98580', county: '' },
  { name: 'Royal City Community Library', url: 'https://www.royalcitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.royalcitylibrary.org/events', city: 'Royal City', state: 'WA', zipCode: '99357', county: '' },
  { name: 'Salkum Timberland Library', url: 'https://www.salkumlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.salkumlibrary.org/events', city: 'Salkum', state: 'WA', zipCode: '98582', county: '' },
  { name: 'Sammamish Library', url: 'https://www.sammamishlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sammamishlibrary.org/events', city: 'Sammamish', state: 'WA', zipCode: '98074', county: '' },
  { name: 'Valley View Library', url: 'https://www.valleyviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.valleyviewlibrary.org/events', city: 'Seatac', state: 'WA', zipCode: '98188', county: '' },
  { name: 'Sedro-Woolley Public Library', url: 'https://www.sedrowoolleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sedrowoolleylibrary.org/events', city: 'Sedro-Woolley', state: 'WA', zipCode: '98284', county: '' },
  { name: 'Selah Library', url: 'https://www.selahlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.selahlibrary.org/events', city: 'Selah', state: 'WA', zipCode: '98942', county: '' },
  { name: 'Sequim Public Library', url: 'https://www.sequimlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sequimlibrary.org/events', city: 'Sequim', state: 'WA', zipCode: '98382', county: '' },
  { name: 'William G. Reed Public Library', url: 'https://www.williamgreedpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.williamgreedpubliclibrary.org/events', city: 'Shelton', state: 'WA', zipCode: '98584', county: '' },
  { name: 'Richmond Beach Library', url: 'https://www.richmondbeachlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.richmondbeachlibrary.org/events', city: 'Shoreline', state: 'WA', zipCode: '98177', county: '' },
  { name: 'Shoreline Library', url: 'https://www.shorelinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shorelinelibrary.org/events', city: 'Shoreline', state: 'WA', zipCode: '98155', county: '' },
  { name: 'Silverdale Library', url: 'https://www.silverdalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.silverdalelibrary.org/events', city: 'Silverdale', state: 'WA', zipCode: '98383', county: '' },
  { name: 'Skykomish Library', url: 'https://www.skykomishlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.skykomishlibrary.org/events', city: 'Skykomish', state: 'WA', zipCode: '98288', county: '' },
  { name: 'Snohomish Library', url: 'https://www.snohomishlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.snohomishlibrary.org/events', city: 'Snohomish', state: 'WA', zipCode: '98290', county: '' },
  { name: 'Snoqualmie Library', url: 'https://www.snoqualmielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.snoqualmielibrary.org/events', city: 'Snoqualmie', state: 'WA', zipCode: '98065', county: '' },
  { name: 'Soap Lake Community Library', url: 'https://www.soaplakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.soaplakelibrary.org/events', city: 'Soap Lake', state: 'WA', zipCode: '98851', county: '' },
  { name: 'South Bend Timberland Library', url: 'https://www.southbendlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southbendlibrary.org/events', city: 'South Bend', state: 'WA', zipCode: '98586', county: '' },
  { name: 'Argonne Library', url: 'https://www.argonnelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.argonnelibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99212', county: '' },
  { name: 'East Side Branch Library', url: 'https://www.eastsidebranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastsidebranchlibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99202', county: '' },
  { name: 'Hillyard Branch Library', url: 'https://www.hillyardbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hillyardbranchlibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99207', county: '' },
  { name: 'Indian Trail Branch Library', url: 'https://www.indiantrailbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.indiantrailbranchlibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99208', county: '' },
  { name: 'Moran Prairie Library', url: 'https://www.moranprairielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.moranprairielibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99223', county: '' },
  { name: 'North Spokane Library', url: 'https://www.spokanelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.spokanelibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99218', county: '' },
  { name: 'Shadle Branch Library', url: 'https://www.shadlebranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shadlebranchlibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99205', county: '' },
  { name: 'South Hill Branch Library', url: 'https://www.southhillbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southhillbranchlibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99203', county: '' },
  { name: 'Spokane County Library District', url: 'https://www.spokanecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.spokanecountylibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99212', county: '' },
  { name: 'Spokane Public Library', url: 'https://www.spokanelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.spokanelibrary.org/events', city: 'Spokane', state: 'WA', zipCode: '99201', county: '' },
  { name: 'Sprague Public Library', url: 'https://www.spraguelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.spraguelibrary.org/events', city: 'Sprague', state: 'WA', zipCode: '99032', county: '' },
  { name: 'St. John Branch Library', url: 'https://www.stjohnlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stjohnlibrary.org/events', city: 'St. John', state: 'WA', zipCode: '99171', county: '' },
  { name: 'Stanwood Library', url: 'https://www.stanwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stanwoodlibrary.org/events', city: 'Stanwood', state: 'WA', zipCode: '98292', county: '' },
  { name: 'Steilacoom Library', url: 'https://www.steilacoomlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.steilacoomlibrary.org/events', city: 'Steilacoom', state: 'WA', zipCode: '98388', county: '' },
  { name: 'Stevenson Community Library', url: 'https://www.stevensonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stevensonlibrary.org/events', city: 'Stevenson', state: 'WA', zipCode: '98648', county: '' },
  { name: 'Sultan Library', url: 'https://www.sultanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sultanlibrary.org/events', city: 'Sultan', state: 'WA', zipCode: '98294', county: '' },
  { name: 'Sumas Library', url: 'https://www.sumaslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sumaslibrary.org/events', city: 'Sumas', state: 'WA', zipCode: '98295', county: '' },
  { name: 'Sumner Library', url: 'https://www.sumnerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sumnerlibrary.org/events', city: 'Sumner', state: 'WA', zipCode: '98390', county: '' },
  { name: 'Sunnyside Public Library', url: 'https://www.sunnysidelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sunnysidelibrary.org/events', city: 'Sunnyside', state: 'WA', zipCode: '98944', county: '' },
  { name: 'Tekoa Branch Library', url: 'https://www.tekoalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tekoalibrary.org/events', city: 'Tekoa', state: 'WA', zipCode: '99033', county: '' },
  { name: 'Tenino Timberland Library', url: 'https://www.teninolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.teninolibrary.org/events', city: 'Tenino', state: 'WA', zipCode: '98589', county: '' },
  { name: 'Tieton Library', url: 'https://www.tietonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tietonlibrary.org/events', city: 'Tieton', state: 'WA', zipCode: '98947', county: '' },
  { name: 'Tonasket Community Library', url: 'https://www.tonasketlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tonasketlibrary.org/events', city: 'Tonasket', state: 'WA', zipCode: '98855', county: '' },
  { name: 'Toppenish (Mary Goodrich Memorial) Library', url: 'https://www.toppenishlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.toppenishlibrary.org/events', city: 'Toppenish', state: 'WA', zipCode: '98948', county: '' },
  { name: 'Touchet Community Library', url: 'https://www.touchetlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.touchetlibrary.org/events', city: 'Touchet', state: 'WA', zipCode: '99360', county: '' },
  { name: 'Foster Library', url: 'https://www.fosterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fosterlibrary.org/events', city: 'Tukwila', state: 'WA', zipCode: '98168', county: '' },
  { name: 'Library Connection At Southcenter', url: 'https://www.libraryconnectionatsouthcenter.org', platform: 'wordpress', eventsUrl: 'https://www.libraryconnectionatsouthcenter.org/events', city: 'Tukwila', state: 'WA', zipCode: '98188', county: '' },
  { name: 'Tukwila Library', url: 'https://www.tukwilalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tukwilalibrary.org/events', city: 'Tukwila', state: 'WA', zipCode: '98168', county: '' },
  { name: 'Timberland Regional Library', url: 'https://www.timberlandregionallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.timberlandregionallibrary.org/events', city: 'Tumwater', state: 'WA', zipCode: '98501', county: '' },
  { name: 'Tumwater Timberland Library', url: 'https://www.tumwaterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tumwaterlibrary.org/events', city: 'Tumwater', state: 'WA', zipCode: '98501', county: '' },
  { name: 'Twisp Community Library', url: 'https://www.twisplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.twisplibrary.org/events', city: 'Twisp', state: 'WA', zipCode: '98856', county: '' },
  { name: 'Union Gap Library', url: 'https://www.uniongaplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.uniongaplibrary.org/events', city: 'Union Gap', state: 'WA', zipCode: '98903', county: '' },
  { name: 'Uniontown Branch Library', url: 'https://www.uniontownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.uniontownlibrary.org/events', city: 'Uniontown', state: 'WA', zipCode: '99179', county: '' },
  { name: 'University Place Library', url: 'https://www.universityplacelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.universityplacelibrary.org/events', city: 'University Place', state: 'WA', zipCode: '98466', county: '' },
  { name: 'Vashon Library', url: 'https://www.vashonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vashonlibrary.org/events', city: 'Vashon Island', state: 'WA', zipCode: '98070', county: '' },
  { name: 'Waitsburg (Weller) Public Library', url: 'https://www.waitsburglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.waitsburglibrary.org/events', city: 'Waitsburg', state: 'WA', zipCode: '99361', county: '' },
  { name: 'Walla Walla County Rural Library District', url: 'https://www.wallawallacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wallawallacountylibrary.org/events', city: 'Walla Walla', state: 'WA', zipCode: '99362', county: '' },
  { name: 'Walla Walla Public Library', url: 'https://www.wallawallalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wallawallalibrary.org/events', city: 'Walla Walla', state: 'WA', zipCode: '99362', county: '' },
  { name: 'Wapato Library', url: 'https://www.wapatolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wapatolibrary.org/events', city: 'Wapato', state: 'WA', zipCode: '98951', county: '' },
  { name: 'Warden Community Library', url: 'https://www.wardenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wardenlibrary.org/events', city: 'Warden', state: 'WA', zipCode: '98857', county: '' },
  { name: 'Washougal Community Library', url: 'https://www.washougallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.washougallibrary.org/events', city: 'Washougal', state: 'WA', zipCode: '98671', county: '' },
  { name: 'Waterville Community Library', url: 'https://www.watervillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'WA', zipCode: '98858', county: '' },
  { name: 'Wellpinit Library Station', url: 'https://www.wellpinitlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wellpinitlibrary.org/events', city: 'Wellpinit', state: 'WA', zipCode: '99040', county: '' },
  { name: 'West Richland Library', url: 'https://www.westrichlandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westrichlandlibrary.org/events', city: 'West Richland', state: 'WA', zipCode: '99353', county: '' },
  { name: 'Westport Timberland Library', url: 'https://www.westportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'WA', zipCode: '98595', county: '' },
  { name: 'White Salmon Valley Community Library', url: 'https://www.whitesalmonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitesalmonlibrary.org/events', city: 'White Salmon', state: 'WA', zipCode: '98672', county: '' },
  { name: 'White Swan Library', url: 'https://www.whiteswanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whiteswanlibrary.org/events', city: 'White Swan', state: 'WA', zipCode: '98952', county: '' },
  { name: 'Wilbur (Hesseltine) Public Library', url: 'https://www.wilburlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wilburlibrary.org/events', city: 'Wilbur', state: 'WA', zipCode: '99185', county: '' },
  { name: 'Winlock Timberland Library', url: 'https://www.winlocklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.winlocklibrary.org/events', city: 'Winlock', state: 'WA', zipCode: '98596', county: '' },
  { name: 'Winthrop Community Library', url: 'https://www.winthroplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.winthroplibrary.org/events', city: 'Winthrop', state: 'WA', zipCode: '98862', county: '' },
  { name: 'Woodinville Library', url: 'https://www.woodinvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woodinvillelibrary.org/events', city: 'Woodinville', state: 'WA', zipCode: '98072', county: '' },
  { name: 'Woodland Community Library', url: 'https://www.woodlandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woodlandlibrary.org/events', city: 'Woodland', state: 'WA', zipCode: '98674', county: '' },
  { name: 'Southeast Library', url: 'https://www.southeastlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southeastlibrary.org/events', city: 'Yakima', state: 'WA', zipCode: '98901', county: '' },
  { name: 'Summitview Library', url: 'https://www.summitviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.summitviewlibrary.org/events', city: 'Yakima', state: 'WA', zipCode: '98908', county: '' },
  { name: 'Terrace Heights Library', url: 'https://www.terraceheightslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.terraceheightslibrary.org/events', city: 'Yakima', state: 'WA', zipCode: '98901', county: '' },
  { name: 'Yakima Valley Regional Library', url: 'https://www.yakimalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yakimalibrary.org/events', city: 'Yakima', state: 'WA', zipCode: '98901', county: '' },
  { name: 'Yelm Timberland Library', url: 'https://www.yelmlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yelmlibrary.org/events', city: 'Yelm', state: 'WA', zipCode: '98597', county: '' },
  { name: 'Zillah Library', url: 'https://www.zillahlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.zillahlibrary.org/events', city: 'Zillah', state: 'WA', zipCode: '98953', county: '' },
];

const SCRAPER_NAME = 'generic-WA';

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
            state: 'WA',
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
    state: 'WA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - WA (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressWACloudFunction() {
  console.log('☁️ Running WordPress WA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-WA', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressWACloudFunction };
