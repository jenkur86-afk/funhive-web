const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: FL
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Miami-Dade Public Library System",
    "url": "https://www.mdpls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mdpls.org/events"
  },
  {
    "name": "Orange County Library System",
    "url": "https://www.ocls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ocls.org/events"
  },
  {
    "name": "Tampa-Hillsborough County Public Library",
    "url": "https://www.hcplc.org",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org"
  },
  {
    "name": "Broward County Library",
    "url": "https://www.broward.org/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.broward.org/library/events"
  },
  {
    "name": "Palm Beach County Library System",
    "url": "https://www.pbclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.pbclibrary.org/events"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Miami-Dade Public Library System",
    "url": "https://www.mdpls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mdpls.org/events", county: 'Baltimore City'},
  {
    "name": "Orange County Library System",
    "url": "https://www.ocls.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.ocls.org/events", county: 'Baltimore City'},
  {
    "name": "Tampa-Hillsborough County Public Library",
    "url": "https://www.hcplc.org",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org", county: 'Baltimore City'},
  {
    "name": "Broward County Library",
    "url": "https://www.broward.org/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.broward.org/library/events", county: 'Baltimore City'},
  {
    "name": "Palm Beach County Library System",
    "url": "https://www.pbclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.pbclibrary.org/events", county: 'Baltimore City'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'St. Johns County Public Library Technical Services', url: 'https://www.nanlibrary.org', eventsUrl: 'https://www.nanlibrary.org/events', city: 'nan', state: 'FL', zipCode: '00000', county: 'nan County'},
  { name: 'Alachua Branch Library', url: 'https://www.alachualibrary.org', eventsUrl: 'https://www.alachualibrary.org/events', city: 'Alachua', state: 'FL', zipCode: '00000', county: 'Alachua County'},
  { name: 'Altamonte Springs City Library', url: 'https://www.altamontespringslibrary.org', eventsUrl: 'https://www.altamontespringslibrary.org/events', city: 'Altamonte Springs', state: 'FL', zipCode: '32701', county: 'Altamonte Springs County'},
  { name: 'Altha Public Library', url: 'https://www.althalibrary.org', eventsUrl: 'https://www.althalibrary.org/events', city: 'Altha', state: 'FL', zipCode: '00000', county: 'Altha County'},
  { name: 'Apalachicola Municipal Library', url: 'https://www.apalachicolalibrary.org', eventsUrl: 'https://www.apalachicolalibrary.org/events', city: 'Apalachicola', state: 'FL', zipCode: '32320', county: 'Apalachicola County'},
  { name: 'North Orange Library', url: 'https://www.apopkalibrary.org', eventsUrl: 'https://www.apopkalibrary.org/events', city: 'Apopka', state: 'FL', zipCode: '00000', county: 'Apopka County'},
  { name: 'Desoto County Library', url: 'https://www.arcadialibrary.org', eventsUrl: 'https://www.arcadialibrary.org/events', city: 'Arcadia', state: 'FL', zipCode: '00000', county: 'Arcadia County'},
  { name: 'Archer Branch Library', url: 'https://www.archerlibrary.org', eventsUrl: 'https://www.archerlibrary.org/events', city: 'Archer', state: 'FL', zipCode: '00000', county: 'Archer County'},
  { name: 'Astor Library', url: 'https://www.astorlibrary.org', eventsUrl: 'https://www.astorlibrary.org/events', city: 'Astor', state: 'FL', zipCode: '00000', county: 'Astor County'},
  { name: 'Auburndale Public Library', url: 'https://www.auburndalelibrary.org', eventsUrl: 'https://www.auburndalelibrary.org/events', city: 'Auburndale', state: 'FL', zipCode: '00000', county: 'Auburndale County'},
  { name: 'Avon Park Public Library', url: 'https://www.avonparklibrary.org', eventsUrl: 'https://www.avonparklibrary.org/events', city: 'Avon Park', state: 'FL', zipCode: '00000', county: 'Avon Park County'},
  { name: 'South Mainland Library-Micco', url: 'https://www.barefootbaylibrary.org', eventsUrl: 'https://www.barefootbaylibrary.org/events', city: 'Barefoot Bay', state: 'FL', zipCode: '00000', county: 'Barefoot Bay County'},
  { name: 'Bartow Public Library', url: 'https://www.bartowlibrary.org', eventsUrl: 'https://www.bartowlibrary.org/events', city: 'Bartow', state: 'FL', zipCode: '00000', county: 'Bartow County'},
  { name: 'Belle Glade Branch', url: 'https://www.bellegladelibrary.org', eventsUrl: 'https://www.bellegladelibrary.org/events', city: 'Belle Glade', state: 'FL', zipCode: '00000', county: 'Belle Glade County'},
  { name: 'Belleview Library', url: 'https://www.belleviewlibrary.org', eventsUrl: 'https://www.belleviewlibrary.org/events', city: 'Belleview', state: 'FL', zipCode: '00000', county: 'Belleview County'},
  { name: 'Central Ridge Library', url: 'https://www.beverlyhillslibrary.org', eventsUrl: 'https://www.beverlyhillslibrary.org/events', city: 'Beverly Hills', state: 'FL', zipCode: '00000', county: 'Beverly Hills County'},
  { name: 'Big Pine Key Library', url: 'https://www.bigpinekeylibrary.org', eventsUrl: 'https://www.bigpinekeylibrary.org/events', city: 'Big Pine Key', state: 'FL', zipCode: '00000', county: 'Big Pine Key County'},
  { name: 'Calhoun County Public Library', url: 'https://www.blountstownlibrary.org', eventsUrl: 'https://www.blountstownlibrary.org/events', city: 'Blountstown', state: 'FL', zipCode: '00000', county: 'Blountstown County'},
  { name: 'Johann Fust Community', url: 'https://www.bocagrandelibrary.org', eventsUrl: 'https://www.bocagrandelibrary.org/events', city: 'Boca Grande', state: 'FL', zipCode: '33921', county: 'Boca Grande County'},
  { name: 'Boca Raton Public Library', url: 'https://www.bocaratonlibrary.org', eventsUrl: 'https://www.bocaratonlibrary.org/events', city: 'Boca Raton', state: 'FL', zipCode: '33431', county: 'Boca Raton County'},
  { name: 'Pine Island Public Library', url: 'https://www.bokeelialibrary.org', eventsUrl: 'https://www.bokeelialibrary.org/events', city: 'Bokeelia', state: 'FL', zipCode: '33922', county: 'Bokeelia County'},
  { name: 'Holmes County Public Library', url: 'https://www.bonifaylibrary.org', eventsUrl: 'https://www.bonifaylibrary.org/events', city: 'Bonifay', state: 'FL', zipCode: '00000', county: 'Bonifay County'},
  { name: 'Bonita Springs Public Library', url: 'https://www.bonitaspringslibrary.org', eventsUrl: 'https://www.bonitaspringslibrary.org/events', city: 'Bonita Springs', state: 'FL', zipCode: '34135', county: 'Bonita Springs County'},
  { name: 'Boynton Beach City Library', url: 'https://www.boyntonbeachlibrary.org', eventsUrl: 'https://www.boyntonbeachlibrary.org/events', city: 'Boynton Beach', state: 'FL', zipCode: '33435', county: 'Boynton Beach County'},
  { name: 'Braden River Library', url: 'https://www.bradentonlibrary.org', eventsUrl: 'https://www.bradentonlibrary.org/events', city: 'Bradenton', state: 'FL', zipCode: '00000', county: 'Bradenton County'},
  { name: 'Brandon Branch', url: 'https://www.brandonlibrary.org', eventsUrl: 'https://www.brandonlibrary.org/events', city: 'Brandon', state: 'FL', zipCode: '00000', county: 'Brandon County'},
  { name: 'Branford Public Library', url: 'https://www.branfordlibrary.org', eventsUrl: 'https://www.branfordlibrary.org/events', city: 'Branford', state: 'FL', zipCode: '00000', county: 'Branford County'},
  { name: 'Liberty County Library', url: 'https://www.bristollibrary.org', eventsUrl: 'https://www.bristollibrary.org/events', city: 'Bristol', state: 'FL', zipCode: '00000', county: 'Bristol County'},
  { name: 'Levy County Public Library System', url: 'https://www.bronsonlibrary.org', eventsUrl: 'https://www.bronsonlibrary.org/events', city: 'Bronson', state: 'FL', zipCode: '32621', county: 'Bronson County'},
  { name: 'East Hernando Branch Library', url: 'https://www.brooksvillelibrary.org', eventsUrl: 'https://www.brooksvillelibrary.org/events', city: 'Brooksville', state: 'FL', zipCode: '00000', county: 'Brooksville County'},
  { name: 'Bryceville Branch', url: 'https://www.brycevillelibrary.org', eventsUrl: 'https://www.brycevillelibrary.org/events', city: 'Bryceville', state: 'FL', zipCode: '00000', county: 'Bryceville County'},
  { name: 'Bushnell Public Library', url: 'https://www.bushnelllibrary.org', eventsUrl: 'https://www.bushnelllibrary.org/events', city: 'Bushnell', state: 'FL', zipCode: '00000', county: 'Bushnell County'},
  { name: 'Callahan Branch', url: 'https://www.callahanlibrary.org', eventsUrl: 'https://www.callahanlibrary.org/events', city: 'Callahan', state: 'FL', zipCode: '00000', county: 'Callahan County'},
  { name: 'Cape Canaveral Public Library', url: 'https://www.capecanaverallibrary.org', eventsUrl: 'https://www.capecanaverallibrary.org/events', city: 'Cape Canaveral', state: 'FL', zipCode: '00000', county: 'Cape Canaveral County'},
  { name: 'Cape Coral Lee County Public Library', url: 'https://www.capecorallibrary.org', eventsUrl: 'https://www.capecorallibrary.org/events', city: 'Cape Coral', state: 'FL', zipCode: '33914', county: 'Cape Coral County'},
  { name: 'Captiva Memorial Library', url: 'https://www.captivalibrary.org', eventsUrl: 'https://www.captivalibrary.org/events', city: 'Captiva', state: 'FL', zipCode: '33924', county: 'Captiva County'},
  { name: 'Carrabelle Branch', url: 'https://www.carrabellelibrary.org', eventsUrl: 'https://www.carrabellelibrary.org/events', city: 'Carrabelle', state: 'FL', zipCode: '00000', county: 'Carrabelle County'},
  { name: 'Central Branch Library', url: 'https://www.casselberrylibrary.org', eventsUrl: 'https://www.casselberrylibrary.org/events', city: 'Casselberry', state: 'FL', zipCode: '00000', county: 'Casselberry County'},
  { name: 'Cedar Key Library', url: 'https://www.cedarkeylibrary.org', eventsUrl: 'https://www.cedarkeylibrary.org/events', city: 'Cedar Key', state: 'FL', zipCode: '00000', county: 'Cedar Key County'},
  { name: 'Celebration Library', url: 'https://www.celebrationlibrary.org', eventsUrl: 'https://www.celebrationlibrary.org/events', city: 'Celebration', state: 'FL', zipCode: '00000', county: 'Celebration County'},
  { name: 'Chattahoochee Public Library', url: 'https://www.chattahoocheelibrary.org', eventsUrl: 'https://www.chattahoocheelibrary.org/events', city: 'Chattahoochee', state: 'FL', zipCode: '00000', county: 'Chattahoochee County'},
  { name: 'Luther Callaway Library', url: 'https://www.chieflandlibrary.org', eventsUrl: 'https://www.chieflandlibrary.org/events', city: 'Chiefland', state: 'FL', zipCode: '00000', county: 'Chiefland County'},
  { name: 'Washington County Public Library', url: 'https://www.chipleylibrary.org', eventsUrl: 'https://www.chipleylibrary.org/events', city: 'Chipley', state: 'FL', zipCode: '00000', county: 'Chipley County'},
  { name: 'Beach Library', url: 'https://www.clearwaterlibrary.org', eventsUrl: 'https://www.clearwaterlibrary.org/events', city: 'Clearwater', state: 'FL', zipCode: '00000', county: 'Clearwater County'},
  { name: 'Cooper Memorial Library', url: 'https://www.clermontlibrary.org', eventsUrl: 'https://www.clermontlibrary.org/events', city: 'Clermont', state: 'FL', zipCode: '00000', county: 'Clermont County'},
  { name: 'Clewiston Public Library', url: 'https://www.clewistonlibrary.org', eventsUrl: 'https://www.clewistonlibrary.org/events', city: 'Clewiston', state: 'FL', zipCode: '00000', county: 'Clewiston County'},
  { name: 'Brevard County Library System', url: 'https://www.cocoalibrary.org', eventsUrl: 'https://www.cocoalibrary.org/events', city: 'Cocoa', state: 'FL', zipCode: '32922', county: 'Cocoa County'},
  { name: 'Cocoa Beach Public Library', url: 'https://www.cocoabeachlibrary.org', eventsUrl: 'https://www.cocoabeachlibrary.org/events', city: 'Cocoa Beach', state: 'FL', zipCode: '00000', county: 'Cocoa Beach County'},
  { name: 'North Regional-Bcc Library', url: 'https://www.coconutcreeklibrary.org', eventsUrl: 'https://www.coconutcreeklibrary.org/events', city: 'Coconut Creek', state: 'FL', zipCode: '00000', county: 'Coconut Creek County'},
  { name: 'Coleman Library', url: 'https://www.colemanlibrary.org', eventsUrl: 'https://www.colemanlibrary.org/events', city: 'Coleman', state: 'FL', zipCode: '00000', county: 'Coleman County'},
  { name: 'Coral Gables Branch', url: 'https://www.coralgableslibrary.org', eventsUrl: 'https://www.coralgableslibrary.org/events', city: 'Coral Gables', state: 'FL', zipCode: '00000', county: 'Coral Gables County'},
  { name: 'West Atlantic Branch', url: 'https://www.coralspringslibrary.org', eventsUrl: 'https://www.coralspringslibrary.org/events', city: 'Coral Springs', state: 'FL', zipCode: '00000', county: 'Coral Springs County'},
  { name: 'Wakulla County Public Library', url: 'https://www.crawfordvillelibrary.org', eventsUrl: 'https://www.crawfordvillelibrary.org/events', city: 'Crawfordville', state: 'FL', zipCode: '00000', county: 'Crawfordville County'},
  { name: 'Crescent City Public Library', url: 'https://www.crescentcitylibrary.org', eventsUrl: 'https://www.crescentcitylibrary.org/events', city: 'Crescent City', state: 'FL', zipCode: '00000', county: 'Crescent City County'},
  { name: 'Robert L. F. Sikes Public Library', url: 'https://www.crestviewlibrary.org', eventsUrl: 'https://www.crestviewlibrary.org/events', city: 'Crestview', state: 'FL', zipCode: '00000', county: 'Crestview County'},
  { name: 'Dixie County Library', url: 'https://www.crosscitylibrary.org', eventsUrl: 'https://www.crosscitylibrary.org/events', city: 'Cross City', state: 'FL', zipCode: '00000', county: 'Cross City County'},
  { name: 'Coastal Region Library', url: 'https://www.crystalriverlibrary.org', eventsUrl: 'https://www.crystalriverlibrary.org/events', city: 'Crystal River', state: 'FL', zipCode: '00000', county: 'Crystal River County'},
  { name: 'Hugh Embry Branch Library', url: 'https://www.dadecitylibrary.org', eventsUrl: 'https://www.dadecitylibrary.org/events', city: 'Dade City', state: 'FL', zipCode: '00000', county: 'Dade City County'},
  { name: 'Dania Beach Paul Demaio Branch', url: 'https://www.danialibrary.org', eventsUrl: 'https://www.danialibrary.org/events', city: 'Dania', state: 'FL', zipCode: '00000', county: 'Dania County'},
  { name: 'Davie-Cooper City Branch', url: 'https://www.davielibrary.org', eventsUrl: 'https://www.davielibrary.org/events', city: 'Davie', state: 'FL', zipCode: '00000', county: 'Davie County'},
  { name: 'John H. Dickerson Heritage Library', url: 'https://www.daytonabeachlibrary.org', eventsUrl: 'https://www.daytonabeachlibrary.org/events', city: 'Daytona Beach', state: 'FL', zipCode: '00000', county: 'Daytona Beach County'},
  { name: 'Debary Public Library', url: 'https://www.debarylibrary.org', eventsUrl: 'https://www.debarylibrary.org/events', city: 'Debary', state: 'FL', zipCode: '00000', county: 'Debary County'},
  { name: 'Century Plaza Branch', url: 'https://www.deerfieldbeachlibrary.org', eventsUrl: 'https://www.deerfieldbeachlibrary.org/events', city: 'Deerfield Beach', state: 'FL', zipCode: '00000', county: 'Deerfield Beach County'},
  { name: 'Walton County Public Library System', url: 'https://www.defuniakspringslibrary.org', eventsUrl: 'https://www.defuniakspringslibrary.org/events', city: 'Defuniak Springs', state: 'FL', zipCode: '32435', county: 'Defuniak Springs County'},
  { name: 'Deland Area Public Library', url: 'https://www.delandlibrary.org', eventsUrl: 'https://www.delandlibrary.org/events', city: 'Deland', state: 'FL', zipCode: '00000', county: 'Deland County'},
  { name: 'Delray Beach Library', url: 'https://www.delraybeachlibrary.org', eventsUrl: 'https://www.delraybeachlibrary.org/events', city: 'Delray Beach', state: 'FL', zipCode: '33444', county: 'Delray Beach County'},
  { name: 'Deltona Public Library', url: 'https://www.deltonalibrary.org', eventsUrl: 'https://www.deltonalibrary.org/events', city: 'Deltona', state: 'FL', zipCode: '00000', county: 'Deltona County'},
  { name: 'Destin Library', url: 'https://www.destinlibrary.org', eventsUrl: 'https://www.destinlibrary.org/events', city: 'Destin', state: 'FL', zipCode: '00000', county: 'Destin County'},
  { name: 'Dundee Public Library', url: 'https://www.dundeelibrary.org', eventsUrl: 'https://www.dundeelibrary.org/events', city: 'Dundee', state: 'FL', zipCode: '00000', county: 'Dundee County'},
  { name: 'Dunedin Public Library', url: 'https://www.dunedinlibrary.org', eventsUrl: 'https://www.dunedinlibrary.org/events', city: 'Dunedin', state: 'FL', zipCode: '00000', county: 'Dunedin County'},
  { name: 'Dunnellon Public Library', url: 'https://www.dunnellonlibrary.org', eventsUrl: 'https://www.dunnellonlibrary.org/events', city: 'Dunnellon', state: 'FL', zipCode: '00000', county: 'Dunnellon County'},
  { name: 'Eagle Lake Public Library', url: 'https://www.eaglelakelibrary.org', eventsUrl: 'https://www.eaglelakelibrary.org/events', city: 'Eagle Lake', state: 'FL', zipCode: '00000', county: 'Eagle Lake County'},
  { name: 'Eastpoint Branch', url: 'https://www.eastpointlibrary.org', eventsUrl: 'https://www.eastpointlibrary.org/events', city: 'Eastpoint', state: 'FL', zipCode: '00000', county: 'Eastpoint County'},
  { name: 'Eatonville Branch', url: 'https://www.eatonvillelibrary.org', eventsUrl: 'https://www.eatonvillelibrary.org/events', city: 'Eatonville', state: 'FL', zipCode: '00000', county: 'Eatonville County'},
  { name: 'Edgewater Public Library', url: 'https://www.edgewaterlibrary.org', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'FL', zipCode: '00000', county: 'Edgewater County'},
  { name: 'Rocky Bluff Branch', url: 'https://www.ellentonlibrary.org', eventsUrl: 'https://www.ellentonlibrary.org/events', city: 'Ellenton', state: 'FL', zipCode: '00000', county: 'Ellenton County'},
  { name: 'Elsie Quirk Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'FL', zipCode: '00000', county: 'Englewood County'},
  { name: 'South County Regional Library', url: 'https://www.esterolibrary.org', eventsUrl: 'https://www.esterolibrary.org/events', city: 'Estero', state: 'FL', zipCode: '33928', county: 'Estero County'},
  { name: 'Eustis Memorial Library', url: 'https://www.eustislibrary.org', eventsUrl: 'https://www.eustislibrary.org/events', city: 'Eustis', state: 'FL', zipCode: '32726', county: 'Eustis County'},
  { name: 'Everglades City Branch Library', url: 'https://www.evergladescitylibrary.org', eventsUrl: 'https://www.evergladescitylibrary.org/events', city: 'Everglades City', state: 'FL', zipCode: '00000', county: 'Everglades City County'},
  { name: 'Fernandina Beach Library', url: 'https://www.fernandinabeachlibrary.org', eventsUrl: 'https://www.fernandinabeachlibrary.org/events', city: 'Fernandina Beach', state: 'FL', zipCode: '00000', county: 'Fernandina Beach County'},
  { name: 'Clay County Public Library System', url: 'https://www.flemingislandlibrary.org', eventsUrl: 'https://www.flemingislandlibrary.org/events', city: 'Fleming Island', state: 'FL', zipCode: '32006', county: 'Fleming Island County'},
  { name: 'Floral City Library', url: 'https://www.floralcitylibrary.org', eventsUrl: 'https://www.floralcitylibrary.org/events', city: 'Floral City', state: 'FL', zipCode: '00000', county: 'Floral City County'},
  { name: 'African-American Research Library', url: 'https://www.fortlauderdalelibrary.org', eventsUrl: 'https://www.fortlauderdalelibrary.org/events', city: 'Fort Lauderdale', state: 'FL', zipCode: '00000', county: 'Fort Lauderdale County'},
  { name: 'Fort Meade Public Library', url: 'https://www.fortmeadelibrary.org', eventsUrl: 'https://www.fortmeadelibrary.org/events', city: 'Fort Meade', state: 'FL', zipCode: '00000', county: 'Fort Meade County'},
  { name: 'Dunbar Jupiter Hammon Library', url: 'https://www.fortmyerslibrary.org', eventsUrl: 'https://www.fortmyerslibrary.org/events', city: 'Fort Myers', state: 'FL', zipCode: '33916', county: 'Fort Myers County'},
  { name: 'Fort Myers Beach Public Library', url: 'https://www.fortmyersbeachlibrary.org', eventsUrl: 'https://www.fortmyersbeachlibrary.org/events', city: 'Fort Myers Beach', state: 'FL', zipCode: '33931', county: 'Fort Myers Beach County'},
  { name: 'Lakewood Park Branch Library', url: 'https://www.fortpiercelibrary.org', eventsUrl: 'https://www.fortpiercelibrary.org/events', city: 'Fort Pierce', state: 'FL', zipCode: '00000', county: 'Fort Pierce County'},
  { name: 'Fort Walton Beach Library', url: 'https://www.fortwaltonbeachlibrary.org', eventsUrl: 'https://www.fortwaltonbeachlibrary.org/events', city: 'Fort Walton Beach', state: 'FL', zipCode: '00000', county: 'Fort Walton Beach County'},
  { name: 'Fort White Branch Library', url: 'https://www.fortwhitelibrary.org', eventsUrl: 'https://www.fortwhitelibrary.org/events', city: 'Fort White', state: 'FL', zipCode: '00000', county: 'Fort White County'},
  { name: 'Freeport Branch Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'FL', zipCode: '00000', county: 'Freeport County'},
  { name: 'Latt Maxcy Memorial Library', url: 'https://www.frostprooflibrary.org', eventsUrl: 'https://www.frostprooflibrary.org/events', city: 'Frostproof', state: 'FL', zipCode: '00000', county: 'Frostproof County'},
  { name: 'Fruitland Park Library', url: 'https://www.fruitlandparklibrary.org', eventsUrl: 'https://www.fruitlandparklibrary.org/events', city: 'Fruitland Park', state: 'FL', zipCode: '00000', county: 'Fruitland Park County'},
  { name: 'Fort Mccoy Public Library', url: 'https://www.ftmccoylibrary.org', eventsUrl: 'https://www.ftmccoylibrary.org/events', city: 'Ft. Mccoy', state: 'FL', zipCode: '00000', county: 'Ft. Mccoy County'},
  { name: 'Alachua County Detention Center Branch', url: 'https://www.gainesvillelibrary.org', eventsUrl: 'https://www.gainesvillelibrary.org/events', city: 'Gainesville', state: 'FL', zipCode: '00000', county: 'Gainesville County'},
  { name: 'Graceville Branch', url: 'https://www.gracevillelibrary.org', eventsUrl: 'https://www.gracevillelibrary.org/events', city: 'Graceville', state: 'FL', zipCode: '00000', county: 'Graceville County'},
  { name: 'Green Cove Springs Branch', url: 'https://www.greencovespringlibrary.org', eventsUrl: 'https://www.greencovespringlibrary.org/events', city: 'Green Cove Spring', state: 'FL', zipCode: '00000', county: 'Green Cove Spring County'},
  { name: 'Greenacres Branch Library', url: 'https://www.greenacreslibrary.org', eventsUrl: 'https://www.greenacreslibrary.org/events', city: 'Greenacres', state: 'FL', zipCode: '00000', county: 'Greenacres County'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'FL', zipCode: '00000', county: 'Greenville County'},
  { name: 'Marion Baysinger Memorial Library', url: 'https://www.grovelandlibrary.org', eventsUrl: 'https://www.grovelandlibrary.org/events', city: 'Groveland', state: 'FL', zipCode: '00000', county: 'Groveland County'},
  { name: 'Gulf Breeze Library', url: 'https://www.gulfbreezelibrary.org', eventsUrl: 'https://www.gulfbreezelibrary.org/events', city: 'Gulf Breeze', state: 'FL', zipCode: '00000', county: 'Gulf Breeze County'},
  { name: 'Gulfport Public Library', url: 'https://www.gulfportlibrary.org', eventsUrl: 'https://www.gulfportlibrary.org/events', city: 'Gulfport', state: 'FL', zipCode: '00000', county: 'Gulfport County'},
  { name: 'Haines City Public Library', url: 'https://www.hainescitylibrary.org', eventsUrl: 'https://www.hainescitylibrary.org/events', city: 'Haines City', state: 'FL', zipCode: '33844', county: 'Haines City County'},
  { name: 'Hallandale Branch', url: 'https://www.hallandalelibrary.org', eventsUrl: 'https://www.hallandalelibrary.org/events', city: 'Hallandale', state: 'FL', zipCode: '00000', county: 'Hallandale County'},
  { name: 'Hastings Branch Library', url: 'https://www.hastingslibrary.org', eventsUrl: 'https://www.hastingslibrary.org/events', city: 'Hastings', state: 'FL', zipCode: '00000', county: 'Hastings County'},
  { name: 'Havana Public Library', url: 'https://www.havanalibrary.org', eventsUrl: 'https://www.havanalibrary.org/events', city: 'Havana', state: 'FL', zipCode: '00000', county: 'Havana County'},
  { name: 'Hawthorne Branch Library', url: 'https://www.hawthornelibrary.org', eventsUrl: 'https://www.hawthornelibrary.org/events', city: 'Hawthorne', state: 'FL', zipCode: '00000', county: 'Hawthorne County'},
  { name: 'Curtiss E-Library', url: 'https://www.hialeahlibrary.org', eventsUrl: 'https://www.hialeahlibrary.org/events', city: 'Hialeah', state: 'FL', zipCode: '00000', county: 'Hialeah County'},
  { name: 'Hialeah Gardens Branch Library', url: 'https://www.hialeahgardenslibrary.org', eventsUrl: 'https://www.hialeahgardenslibrary.org/events', city: 'Hialeah Gardens', state: 'FL', zipCode: '00000', county: 'Hialeah Gardens County'},
  { name: 'High Springs Branch Library', url: 'https://www.highspringslibrary.org', eventsUrl: 'https://www.highspringslibrary.org/events', city: 'High Springs', state: 'FL', zipCode: '00000', county: 'High Springs County'},
  { name: 'Highland Beach Library', url: 'https://www.highlandbeachlibrary.org', eventsUrl: 'https://www.highlandbeachlibrary.org/events', city: 'Highland Beach', state: 'FL', zipCode: '33487', county: 'Highland Beach County'},
  { name: 'Hillard Branch', url: 'https://www.hilliardlibrary.org', eventsUrl: 'https://www.hilliardlibrary.org/events', city: 'Hilliard', state: 'FL', zipCode: '00000', county: 'Hilliard County'},
  { name: 'Hobe Sound Branch Library', url: 'https://www.hobesoundlibrary.org', eventsUrl: 'https://www.hobesoundlibrary.org/events', city: 'Hobe Sound', state: 'FL', zipCode: '00000', county: 'Hobe Sound County'},
  { name: 'Centennial Park Branch Library', url: 'https://www.holidaylibrary.org', eventsUrl: 'https://www.holidaylibrary.org/events', city: 'Holiday', state: 'FL', zipCode: '00000', county: 'Holiday County'},
  { name: 'Holly Hill Public Library', url: 'https://www.hollyhilllibrary.org', eventsUrl: 'https://www.hollyhilllibrary.org/events', city: 'Holly Hill', state: 'FL', zipCode: '00000', county: 'Holly Hill County'},
  { name: 'Carver Ranches Branch', url: 'https://www.hollywoodlibrary.org', eventsUrl: 'https://www.hollywoodlibrary.org/events', city: 'Hollywood', state: 'FL', zipCode: '00000', county: 'Hollywood County'},
  { name: 'Island Branch Library', url: 'https://www.holmesbeachlibrary.org', eventsUrl: 'https://www.holmesbeachlibrary.org/events', city: 'Holmes Beach', state: 'FL', zipCode: '00000', county: 'Holmes Beach County'},
  { name: 'Homestead Branch Library', url: 'https://www.homesteadlibrary.org', eventsUrl: 'https://www.homesteadlibrary.org/events', city: 'Homestead', state: 'FL', zipCode: '00000', county: 'Homestead County'},
  { name: 'Homosassa Library', url: 'https://www.homosassalibrary.org', eventsUrl: 'https://www.homosassalibrary.org/events', city: 'Homosassa', state: 'FL', zipCode: '00000', county: 'Homosassa County'},
  { name: 'Jimmy Weaver Memorial Library (Hosford Branch)', url: 'https://www.hosfordlibrary.org', eventsUrl: 'https://www.hosfordlibrary.org/events', city: 'Hosford', state: 'FL', zipCode: '00000', county: 'Hosford County'},
  { name: 'Marianne Beck Memorial Library', url: 'https://www.howeyinthehillslibrary.org', eventsUrl: 'https://www.howeyinthehillslibrary.org/events', city: 'Howey-In-The-Hills', state: 'FL', zipCode: '34737', county: 'Howey-In-The-Hills County'},
  { name: 'Hudson Regional Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'FL', zipCode: '00000', county: 'Hudson County'},
  { name: 'Immokalee Branch Library', url: 'https://www.immokaleelibrary.org', eventsUrl: 'https://www.immokaleelibrary.org/events', city: 'Immokalee', state: 'FL', zipCode: '00000', county: 'Immokalee County'},
  { name: 'Indian Rocks Beach Library', url: 'https://www.indianrocksbeachlibrary.org', eventsUrl: 'https://www.indianrocksbeachlibrary.org/events', city: 'Indian Rocks Beach', state: 'FL', zipCode: '33785', county: 'Indian Rocks Beach County'},
  { name: 'Elisabeth Lahti Library', url: 'https://www.indiantownlibrary.org', eventsUrl: 'https://www.indiantownlibrary.org/events', city: 'Indiantown', state: 'FL', zipCode: '00000', county: 'Indiantown County'},
  { name: 'Interlachen Public Library', url: 'https://www.interlachenlibrary.org', eventsUrl: 'https://www.interlachenlibrary.org/events', city: 'Interlachen', state: 'FL', zipCode: '00000', county: 'Interlachen County'},
  { name: 'Lakes Region Library', url: 'https://www.invernesslibrary.org', eventsUrl: 'https://www.invernesslibrary.org/events', city: 'Inverness', state: 'FL', zipCode: '34452', county: 'Inverness County'},
  { name: 'Helen Wadley Branch', url: 'https://www.islamoradalibrary.org', eventsUrl: 'https://www.islamoradalibrary.org/events', city: 'Islamorada', state: 'FL', zipCode: '00000', county: 'Islamorada County'},
  { name: 'Argyle Branch', url: 'https://www.jacksonvillelibrary.org', eventsUrl: 'https://www.jacksonvillelibrary.org/events', city: 'Jacksonville', state: 'FL', zipCode: '00000', county: 'Jacksonville County'},
  { name: 'Jasper Public Library', url: 'https://www.jasperlibrary.org', eventsUrl: 'https://www.jasperlibrary.org/events', city: 'Jasper', state: 'FL', zipCode: '00000', county: 'Jasper County'},
  { name: 'Jay Library', url: 'https://www.jaylibrary.org', eventsUrl: 'https://www.jaylibrary.org/events', city: 'Jay', state: 'FL', zipCode: '00000', county: 'Jay County'},
  { name: 'Jennings Public Library', url: 'https://www.jenningslibrary.org', eventsUrl: 'https://www.jenningslibrary.org/events', city: 'Jennings', state: 'FL', zipCode: '00000', county: 'Jennings County'},
  { name: 'Hoke Branch Library', url: 'https://www.jensenbeachlibrary.org', eventsUrl: 'https://www.jensenbeachlibrary.org/events', city: 'Jensen Beach', state: 'FL', zipCode: '00000', county: 'Jensen Beach County'},
  { name: 'Jupiter Branch Library', url: 'https://www.jupiterlibrary.org', eventsUrl: 'https://www.jupiterlibrary.org/events', city: 'Jupiter', state: 'FL', zipCode: '00000', county: 'Jupiter County'},
  { name: 'Kenansville Library Center', url: 'https://www.kenansvillelibrary.org', eventsUrl: 'https://www.kenansvillelibrary.org/events', city: 'Kenansville', state: 'FL', zipCode: '00000', county: 'Kenansville County'},
  { name: 'Key Largo Branch', url: 'https://www.keylargolibrary.org', eventsUrl: 'https://www.keylargolibrary.org/events', city: 'Key Largo', state: 'FL', zipCode: '00000', county: 'Key Largo County'},
  { name: 'Keystone Heights Branch Library', url: 'https://www.keystoneheightslibrary.org', eventsUrl: 'https://www.keystoneheightslibrary.org/events', city: 'Keystone Heights', state: 'FL', zipCode: '00000', county: 'Keystone Heights County'},
  { name: 'Kinard Public Library', url: 'https://www.kinardlibrary.org', eventsUrl: 'https://www.kinardlibrary.org/events', city: 'Kinard', state: 'FL', zipCode: '00000', county: 'Kinard County'},
  { name: 'Buenaventura Lakes Library', url: 'https://www.kissimmeelibrary.org', eventsUrl: 'https://www.kissimmeelibrary.org/events', city: 'Kissimmee', state: 'FL', zipCode: '00000', county: 'Kissimmee County'},
  { name: 'Labelle Free Public Library', url: 'https://www.labellelibrary.org', eventsUrl: 'https://www.labellelibrary.org/events', city: 'Labelle', state: 'FL', zipCode: '00000', county: 'Labelle County'},
  { name: 'Lady Lake Public Library', url: 'https://www.ladylakelibrary.org', eventsUrl: 'https://www.ladylakelibrary.org/events', city: 'Lady Lake', state: 'FL', zipCode: '00000', county: 'Lady Lake County'},
  { name: 'Lake Alfred Public Library', url: 'https://www.lakealfredlibrary.org', eventsUrl: 'https://www.lakealfredlibrary.org/events', city: 'Lake Alfred', state: 'FL', zipCode: '00000', county: 'Lake Alfred County'},
  { name: 'New River Public Library Cooperative', url: 'https://www.lakebutlerlibrary.org', eventsUrl: 'https://www.lakebutlerlibrary.org/events', city: 'Lake Butler', state: 'FL', zipCode: '32054', county: 'Lake Butler County'},
  { name: 'Columbia County Public Library', url: 'https://www.lakecitylibrary.org', eventsUrl: 'https://www.lakecitylibrary.org/events', city: 'Lake City', state: 'FL', zipCode: '32055', county: 'Lake City County'},
  { name: 'Lake Helen Public Library', url: 'https://www.lakehelenlibrary.org', eventsUrl: 'https://www.lakehelenlibrary.org/events', city: 'Lake Helen', state: 'FL', zipCode: '00000', county: 'Lake Helen County'},
  { name: 'Northwest Branch Library', url: 'https://www.lakemarylibrary.org', eventsUrl: 'https://www.lakemarylibrary.org/events', city: 'Lake Mary', state: 'FL', zipCode: '00000', county: 'Lake Mary County'},
  { name: 'Panasoffkee Community Library, Inc.', url: 'https://www.lakepanasoffkeelibrary.org', eventsUrl: 'https://www.lakepanasoffkeelibrary.org/events', city: 'Lake Panasoffkee', state: 'FL', zipCode: '00000', county: 'Lake Panasoffkee County'},
  { name: 'Lake Park Public Library', url: 'https://www.lakeparklibrary.org', eventsUrl: 'https://www.lakeparklibrary.org/events', city: 'Lake Park', state: 'FL', zipCode: '33403', county: 'Lake Park County'},
  { name: 'Lake Placid Memorial Library', url: 'https://www.lakeplacidlibrary.org', eventsUrl: 'https://www.lakeplacidlibrary.org/events', city: 'Lake Placid', state: 'FL', zipCode: '00000', county: 'Lake Placid County'},
  { name: 'Lake Wales Public Library', url: 'https://www.lakewaleslibrary.org', eventsUrl: 'https://www.lakewaleslibrary.org/events', city: 'Lake Wales', state: 'FL', zipCode: '00000', county: 'Lake Wales County'},
  { name: 'Lake Worth Public Library', url: 'https://www.lakeworthlibrary.org', eventsUrl: 'https://www.lakeworthlibrary.org/events', city: 'Lake Worth', state: 'FL', zipCode: '33460', county: 'Lake Worth County'},
  { name: 'Lakeland Public Library', url: 'https://www.lakelandlibrary.org', eventsUrl: 'https://www.lakelandlibrary.org/events', city: 'Lakeland', state: 'FL', zipCode: '00000', county: 'Lakeland County'},
  { name: 'Land Olakes Branch Library', url: 'https://www.landolakeslibrary.org', eventsUrl: 'https://www.landolakeslibrary.org/events', city: 'Land Olakes', state: 'FL', zipCode: '00000', county: 'Land Olakes County'},
  { name: 'Lantana Public Library', url: 'https://www.lantanalibrary.org', eventsUrl: 'https://www.lantanalibrary.org/events', city: 'Lantana', state: 'FL', zipCode: '33462', county: 'Lantana County'},
  { name: 'Largo Public Library', url: 'https://www.largolibrary.org', eventsUrl: 'https://www.largolibrary.org/events', city: 'Largo', state: 'FL', zipCode: '00000', county: 'Largo County'},
  { name: 'Lauderdale Lakes Branch', url: 'https://www.lauderdalelakeslibrary.org', eventsUrl: 'https://www.lauderdalelakeslibrary.org/events', city: 'Lauderdale Lakes', state: 'FL', zipCode: '00000', county: 'Lauderdale Lakes County'},
  { name: 'Lauderhill-City Hall Complex Branch', url: 'https://www.lauderhilllibrary.org', eventsUrl: 'https://www.lauderhilllibrary.org/events', city: 'Lauderhill', state: 'FL', zipCode: '00000', county: 'Lauderhill County'},
  { name: 'Gladys N. Milton Memorial Library', url: 'https://www.laurelhilllibrary.org', eventsUrl: 'https://www.laurelhilllibrary.org/events', city: 'Laurel Hill', state: 'FL', zipCode: '00000', county: 'Laurel Hill County'},
  { name: 'Lee Library', url: 'https://www.leelibrary.org', eventsUrl: 'https://www.leelibrary.org/events', city: 'Lee', state: 'FL', zipCode: '00000', county: 'Lee County'},
  { name: 'Leesburg Public Library', url: 'https://www.leesburglibrary.org', eventsUrl: 'https://www.leesburglibrary.org/events', city: 'Leesburg', state: 'FL', zipCode: '00000', county: 'Leesburg County'},
  { name: 'East County Regional Library', url: 'https://www.lehighacreslibrary.org', eventsUrl: 'https://www.lehighacreslibrary.org/events', city: 'Lehigh Acres', state: 'FL', zipCode: '33971', county: 'Lehigh Acres County'},
  { name: 'Doreen Gauthier Lighthouse Point Library', url: 'https://www.lighthousepointlibrary.org', eventsUrl: 'https://www.lighthousepointlibrary.org/events', city: 'Lighthouse Point', state: 'FL', zipCode: '33064', county: 'Lighthouse Point County'},
  { name: 'Suwannee River Regional Library System', url: 'https://www.liveoaklibrary.org', eventsUrl: 'https://www.liveoaklibrary.org/events', city: 'Live Oak', state: 'FL', zipCode: '32064', county: 'Live Oak County'},
  { name: 'West Branch Library', url: 'https://www.longwoodlibrary.org', eventsUrl: 'https://www.longwoodlibrary.org/events', city: 'Longwood', state: 'FL', zipCode: '00000', county: 'Longwood County'},
  { name: 'Lutz Branch Library', url: 'https://www.lutzlibrary.org', eventsUrl: 'https://www.lutzlibrary.org/events', city: 'Lutz', state: 'FL', zipCode: '00000', county: 'Lutz County'},
  { name: 'Lynn Haven Public Library', url: 'https://www.lynnhavenlibrary.org', eventsUrl: 'https://www.lynnhavenlibrary.org/events', city: 'Lynn Haven', state: 'FL', zipCode: '32444', county: 'Lynn Haven County'},
  { name: 'Emily Taber Library', url: 'https://www.macclennylibrary.org', eventsUrl: 'https://www.macclennylibrary.org/events', city: 'Macclenny', state: 'FL', zipCode: '00000', county: 'Macclenny County'},
  { name: 'Gulf Beaches Public Library', url: 'https://www.madeirabeachlibrary.org', eventsUrl: 'https://www.madeirabeachlibrary.org/events', city: 'Madeira Beach', state: 'FL', zipCode: '00000', county: 'Madeira Beach County'},
  { name: 'Madison County Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'FL', zipCode: '00000', county: 'Madison County'},
  { name: 'Maitland Public Library', url: 'https://www.maitlandlibrary.org', eventsUrl: 'https://www.maitlandlibrary.org/events', city: 'Maitland', state: 'FL', zipCode: '32751', county: 'Maitland County'},
  { name: 'George Dolezal Branch', url: 'https://www.marathonlibrary.org', eventsUrl: 'https://www.marathonlibrary.org/events', city: 'Marathon', state: 'FL', zipCode: '00000', county: 'Marathon County'},
  { name: 'Marco Island Branch Library', url: 'https://www.marcoislandlibrary.org', eventsUrl: 'https://www.marcoislandlibrary.org/events', city: 'Marco Island', state: 'FL', zipCode: '00000', county: 'Marco Island County'},
  { name: 'Margate Catharine Young Branch', url: 'https://www.margatelibrary.org', eventsUrl: 'https://www.margatelibrary.org/events', city: 'Margate', state: 'FL', zipCode: '00000', county: 'Margate County'},
  { name: 'Jackson County Public Library', url: 'https://www.mariannalibrary.org', eventsUrl: 'https://www.mariannalibrary.org/events', city: 'Marianna', state: 'FL', zipCode: '00000', county: 'Marianna County'},
  { name: 'Mary Esther Public Library', url: 'https://www.maryestherlibrary.org', eventsUrl: 'https://www.maryestherlibrary.org/events', city: 'Mary Esther', state: 'FL', zipCode: '00000', county: 'Mary Esther County'},
  { name: 'Lafayette County Library', url: 'https://www.mayolibrary.org', eventsUrl: 'https://www.mayolibrary.org/events', city: 'Mayo', state: 'FL', zipCode: '00000', county: 'Mayo County'},
  { name: 'Dr. Martin Luther King Jr. Library', url: 'https://www.melbournelibrary.org', eventsUrl: 'https://www.melbournelibrary.org/events', city: 'Melbourne', state: 'FL', zipCode: '00000', county: 'Melbourne County'},
  { name: 'Melbourne Beach Library', url: 'https://www.melbournebeachlibrary.org', eventsUrl: 'https://www.melbournebeachlibrary.org/events', city: 'Melbourne Beach', state: 'FL', zipCode: '00000', county: 'Melbourne Beach County'},
  { name: 'Melrose Public Library', url: 'https://www.melroselibrary.org', eventsUrl: 'https://www.melroselibrary.org/events', city: 'Melrose', state: 'FL', zipCode: '32666', county: 'Melrose County'},
  { name: 'Merritt Island Public Library', url: 'https://www.merrittislandlibrary.org', eventsUrl: 'https://www.merrittislandlibrary.org/events', city: 'Merritt Island', state: 'FL', zipCode: '32953', county: 'Merritt Island County'},
  { name: 'Allapattah Branch Library', url: 'https://www.miamilibrary.org', eventsUrl: 'https://www.miamilibrary.org/events', city: 'Miami', state: 'FL', zipCode: '33142', county: 'Miami County'},
  { name: 'Miami Beach Regional Library', url: 'https://www.miamibeachlibrary.org', eventsUrl: 'https://www.miamibeachlibrary.org/events', city: 'Miami Beach', state: 'FL', zipCode: '33139', county: 'Miami Beach County'},
  { name: 'Miami Lakes-Palm Springs North', url: 'https://www.miamilakeslibrary.org', eventsUrl: 'https://www.miamilakeslibrary.org/events', city: 'Miami Lakes', state: 'FL', zipCode: '33014', county: 'Miami Lakes County'},
  { name: 'Brockway Memorial Library', url: 'https://www.miamishoreslibrary.org', eventsUrl: 'https://www.miamishoreslibrary.org/events', city: 'Miami Shores', state: 'FL', zipCode: '33138', county: 'Miami Shores County'},
  { name: 'Miami Springs Branch', url: 'https://www.miamispringslibrary.org', eventsUrl: 'https://www.miamispringslibrary.org/events', city: 'Miami Springs', state: 'FL', zipCode: '33166', county: 'Miami Springs County'},
  { name: 'Micanopy Branch Library', url: 'https://www.micanopylibrary.org', eventsUrl: 'https://www.micanopylibrary.org/events', city: 'Micanopy', state: 'FL', zipCode: '00000', county: 'Micanopy County'},
  { name: 'South Mainland Public Library', url: 'https://www.miccolibrary.org', eventsUrl: 'https://www.miccolibrary.org/events', city: 'Micco', state: 'FL', zipCode: '32976', county: 'Micco County'},
  { name: 'Middleburg Branch Library', url: 'https://www.middleburglibrary.org', eventsUrl: 'https://www.middleburglibrary.org/events', city: 'Middleburg', state: 'FL', zipCode: '00000', county: 'Middleburg County'},
  { name: 'Milton Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'FL', zipCode: '00000', county: 'Milton County'},
  { name: 'Mims-Scottmoor Public Library', url: 'https://www.mimslibrary.org', eventsUrl: 'https://www.mimslibrary.org/events', city: 'Mims', state: 'FL', zipCode: '00000', county: 'Mims County'},
  { name: 'Jefferson County R. J. Bailar Public Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'FL', zipCode: '00000', county: 'Monticello County'},
  { name: 'Glades County Public Library', url: 'https://www.moorehavenlibrary.org', eventsUrl: 'https://www.moorehavenlibrary.org/events', city: 'Moore Haven', state: 'FL', zipCode: '00000', county: 'Moore Haven County'},
  { name: 'W.T.Bland Public Library', url: 'https://www.mountdoralibrary.org', eventsUrl: 'https://www.mountdoralibrary.org/events', city: 'Mount Dora', state: 'FL', zipCode: '00000', county: 'Mount Dora County'},
  { name: 'Dr. C.C. Pearce Municipal Library', url: 'https://www.mulberrylibrary.org', eventsUrl: 'https://www.mulberrylibrary.org/events', city: 'Mulberry', state: 'FL', zipCode: '00000', county: 'Mulberry County'},
  { name: 'Collier County Public Library', url: 'https://www.napleslibrary.org', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'FL', zipCode: '34109', county: 'Naples County'},
  { name: 'Naranja Branch Library', url: 'https://www.naranjalibrary.org', eventsUrl: 'https://www.naranjalibrary.org/events', city: 'Naranja', state: 'FL', zipCode: '33032', county: 'Naranja County'},
  { name: 'Navarre Library', url: 'https://www.navarrelibrary.org', eventsUrl: 'https://www.navarrelibrary.org/events', city: 'Navarre', state: 'FL', zipCode: '00000', county: 'Navarre County'},
  { name: 'Beaches Regional Library', url: 'https://www.neptunebeachlibrary.org', eventsUrl: 'https://www.neptunebeachlibrary.org/events', city: 'Neptune Beach', state: 'FL', zipCode: '00000', county: 'Neptune Beach County'},
  { name: 'New Port Richey Public Library', url: 'https://www.newportricheylibrary.org', eventsUrl: 'https://www.newportricheylibrary.org/events', city: 'New Port Richey', state: 'FL', zipCode: '34652', county: 'New Port Richey County'},
  { name: 'New Smyrna Beach Brannon Memorial Library', url: 'https://www.newsmyrnabeachlibrary.org', eventsUrl: 'https://www.newsmyrnabeachlibrary.org/events', city: 'New Smyrna Beach', state: 'FL', zipCode: '00000', county: 'New Smyrna Beach County'},
  { name: 'Newberry Branch Library', url: 'https://www.newberrylibrary.org', eventsUrl: 'https://www.newberrylibrary.org/events', city: 'Newberry', state: 'FL', zipCode: '00000', county: 'Newberry County'},
  { name: 'Niceville Public Library', url: 'https://www.nicevillelibrary.org', eventsUrl: 'https://www.nicevillelibrary.org/events', city: 'Niceville', state: 'FL', zipCode: '00000', county: 'Niceville County'},
  { name: 'North Fort Myers Public Library', url: 'https://www.northfortmyerslibrary.org', eventsUrl: 'https://www.northfortmyerslibrary.org/events', city: 'North Fort Myers', state: 'FL', zipCode: '33903', county: 'North Fort Myers County'},
  { name: 'North Lauderdale Branch', url: 'https://www.northlauderdalelibrary.org', eventsUrl: 'https://www.northlauderdalelibrary.org/events', city: 'North Lauderdale', state: 'FL', zipCode: '00000', county: 'North Lauderdale County'},
  { name: 'North Miami Public Library', url: 'https://www.northmiamilibrary.org', eventsUrl: 'https://www.northmiamilibrary.org/events', city: 'North Miami', state: 'FL', zipCode: '33161', county: 'North Miami County'},
  { name: 'North Miami Beach Public Library', url: 'https://www.northmiamibeachlibrary.org', eventsUrl: 'https://www.northmiamibeachlibrary.org/events', city: 'North Miami Beach', state: 'FL', zipCode: '33162', county: 'North Miami Beach County'},
  { name: 'North Palm Beach Public Library', url: 'https://www.northpalmbeachlibrary.org', eventsUrl: 'https://www.northpalmbeachlibrary.org/events', city: 'North Palm Beach', state: 'FL', zipCode: '33408', county: 'North Palm Beach County'},
  { name: 'North Port Library', url: 'https://www.northportlibrary.org', eventsUrl: 'https://www.northportlibrary.org/events', city: 'North Port', state: 'FL', zipCode: '00000', county: 'North Port County'},
  { name: 'Oak Hill Public Library', url: 'https://www.oakhilllibrary.org', eventsUrl: 'https://www.oakhilllibrary.org/events', city: 'Oak Hill', state: 'FL', zipCode: '00000', county: 'Oak Hill County'},
  { name: 'Oakland Park Library', url: 'https://www.oaklandparklibrary.org', eventsUrl: 'https://www.oaklandparklibrary.org/events', city: 'Oakland Park', state: 'FL', zipCode: '33334', county: 'Oakland Park County'},
  { name: 'Freedom Public Library', url: 'https://www.ocalalibrary.org', eventsUrl: 'https://www.ocalalibrary.org/events', city: 'Ocala', state: 'FL', zipCode: '00000', county: 'Ocala County'},
  { name: 'Forest Public Library', url: 'https://www.ocklawahalibrary.org', eventsUrl: 'https://www.ocklawahalibrary.org/events', city: 'Ocklawaha', state: 'FL', zipCode: '00000', county: 'Ocklawaha County'},
  { name: 'Austin Davis Library', url: 'https://www.odessalibrary.org', eventsUrl: 'https://www.odessalibrary.org/events', city: 'Odessa', state: 'FL', zipCode: '00000', county: 'Odessa County'},
  { name: 'Okeechobee County Library', url: 'https://www.okeechobeelibrary.org', eventsUrl: 'https://www.okeechobeelibrary.org/events', city: 'Okeechobee', state: 'FL', zipCode: '00000', county: 'Okeechobee County'},
  { name: 'Oldsmar Public Library', url: 'https://www.oldsmarlibrary.org', eventsUrl: 'https://www.oldsmarlibrary.org/events', city: 'Oldsmar', state: 'FL', zipCode: '00000', county: 'Oldsmar County'},
  { name: 'Orange City Dickinson Memorial Library', url: 'https://www.orangecitylibrary.org', eventsUrl: 'https://www.orangecitylibrary.org/events', city: 'Orange City', state: 'FL', zipCode: '00000', county: 'Orange City County'},
  { name: 'Orange Park Branch Library', url: 'https://www.orangeparklibrary.org', eventsUrl: 'https://www.orangeparklibrary.org/events', city: 'Orange Park', state: 'FL', zipCode: '00000', county: 'Orange Park County'},
  { name: 'Alafaya Library', url: 'https://www.orlandolibrary.org', eventsUrl: 'https://www.orlandolibrary.org/events', city: 'Orlando', state: 'FL', zipCode: '00000', county: 'Orlando County'},
  { name: 'Ormond Beach Public Library', url: 'https://www.ormondbeachlibrary.org', eventsUrl: 'https://www.ormondbeachlibrary.org/events', city: 'Ormond Beach', state: 'FL', zipCode: '00000', county: 'Ormond Beach County'},
  { name: 'Osprey Library at Historic Spanish Point', url: 'https://www.ospreylibrary.org', eventsUrl: 'https://www.ospreylibrary.org/events', city: 'Osprey', state: 'FL', zipCode: '34229', county: 'Osprey County'},
  { name: 'East Branch Library', url: 'https://www.oviedolibrary.org', eventsUrl: 'https://www.oviedolibrary.org/events', city: 'Oviedo', state: 'FL', zipCode: '00000', county: 'Oviedo County'},
  { name: 'Pace Library', url: 'https://www.pacelibrary.org', eventsUrl: 'https://www.pacelibrary.org/events', city: 'Pace', state: 'FL', zipCode: '00000', county: 'Pace County'},
  { name: 'Loula V. York Branch Library', url: 'https://www.pahokeelibrary.org', eventsUrl: 'https://www.pahokeelibrary.org/events', city: 'Pahokee', state: 'FL', zipCode: '00000', county: 'Pahokee County'},
  { name: 'Paisley Library', url: 'https://www.paisleylibrary.org', eventsUrl: 'https://www.paisleylibrary.org/events', city: 'Paisley', state: 'FL', zipCode: '00000', county: 'Paisley County'},
  { name: 'Bostwick Community Library', url: 'https://www.palatkalibrary.org', eventsUrl: 'https://www.palatkalibrary.org/events', city: 'Palatka', state: 'FL', zipCode: '00000', county: 'Palatka County'},
  { name: 'Franklin T. Degroodt Memorial Library', url: 'https://www.palmbaylibrary.org', eventsUrl: 'https://www.palmbaylibrary.org/events', city: 'Palm Bay', state: 'FL', zipCode: '00000', county: 'Palm Bay County'},
  { name: 'North County Regional Library', url: 'https://www.palmbeachgardenlibrary.org', eventsUrl: 'https://www.palmbeachgardenlibrary.org/events', city: 'Palm Beach Garden', state: 'FL', zipCode: '00000', county: 'Palm Beach Garden County'},
  { name: 'Peter Julie Cummings Library', url: 'https://www.palmcitylibrary.org', eventsUrl: 'https://www.palmcitylibrary.org/events', city: 'Palm City', state: 'FL', zipCode: '00000', county: 'Palm City County'},
  { name: 'Flagler County Public Library', url: 'https://www.palmcoastlibrary.org', eventsUrl: 'https://www.palmcoastlibrary.org/events', city: 'Palm Coast', state: 'FL', zipCode: '32137', county: 'Palm Coast County'},
  { name: 'East Lake Community Library', url: 'https://www.palmharborlibrary.org', eventsUrl: 'https://www.palmharborlibrary.org/events', city: 'Palm Harbor', state: 'FL', zipCode: '00000', county: 'Palm Harbor County'},
  { name: 'Palm Springs Public Library', url: 'https://www.palmspringslibrary.org', eventsUrl: 'https://www.palmspringslibrary.org/events', city: 'Palm Springs', state: 'FL', zipCode: '33461', county: 'Palm Springs County'},
  { name: 'Palmetto Branch Library', url: 'https://www.palmettolibrary.org', eventsUrl: 'https://www.palmettolibrary.org/events', city: 'Palmetto', state: 'FL', zipCode: '00000', county: 'Palmetto County'},
  { name: 'Bay County Public Library', url: 'https://www.panamacitylibrary.org', eventsUrl: 'https://www.panamacitylibrary.org/events', city: 'Panama City', state: 'FL', zipCode: '00000', county: 'Panama City County'},
  { name: 'Panama City Beach Library', url: 'https://www.panamacitybeachlibrary.org', eventsUrl: 'https://www.panamacitybeachlibrary.org/events', city: 'Panama City Beach', state: 'FL', zipCode: '00000', county: 'Panama City Beach County'},
  { name: 'Parker Public Library', url: 'https://www.parkerlibrary.org', eventsUrl: 'https://www.parkerlibrary.org/events', city: 'Parker', state: 'FL', zipCode: '00000', county: 'Parker County'},
  { name: 'Parkland Library', url: 'https://www.parklandlibrary.org', eventsUrl: 'https://www.parklandlibrary.org/events', city: 'Parkland', state: 'FL', zipCode: '33067', county: 'Parkland County'},
  { name: 'Pembroke Pines Branch', url: 'https://www.pembrokepineslibrary.org', eventsUrl: 'https://www.pembrokepineslibrary.org/events', city: 'Pembroke Pines', state: 'FL', zipCode: '00000', county: 'Pembroke Pines County'},
  { name: 'Lucia M. Tryon Branch', url: 'https://www.pensacolalibrary.org', eventsUrl: 'https://www.pensacolalibrary.org/events', city: 'Pensacola', state: 'FL', zipCode: '00000', county: 'Pensacola County'},
  { name: 'Taylor County Public Library', url: 'https://www.perrylibrary.org', eventsUrl: 'https://www.perrylibrary.org/events', city: 'Perry', state: 'FL', zipCode: '32347', county: 'Perry County'},
  { name: 'Pierson Public Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Pierson', state: 'FL', zipCode: '00000', county: 'Pierson County'},
  { name: 'Pinellas Park Public Library', url: 'https://www.pinellasparklibrary.org', eventsUrl: 'https://www.pinellasparklibrary.org/events', city: 'Pinellas Park', state: 'FL', zipCode: '00000', county: 'Pinellas Park County'},
  { name: 'Bruton Memorial Library', url: 'https://www.plantcitylibrary.org', eventsUrl: 'https://www.plantcitylibrary.org/events', city: 'Plant City', state: 'FL', zipCode: '00000', county: 'Plant City County'},
  { name: 'West Regional Library', url: 'https://www.plantationlibrary.org', eventsUrl: 'https://www.plantationlibrary.org/events', city: 'Plantation', state: 'FL', zipCode: '00000', county: 'Plantation County'},
  { name: 'Poinciana Library', url: 'https://www.poincianalibrary.org', eventsUrl: 'https://www.poincianalibrary.org/events', city: 'Poinciana', state: 'FL', zipCode: '00000', county: 'Poinciana County'},
  { name: 'Polk City Library', url: 'https://www.polkcitylibrary.org', eventsUrl: 'https://www.polkcitylibrary.org/events', city: 'Polk City', state: 'FL', zipCode: '00000', county: 'Polk City County'},
  { name: 'Beach Branch Library', url: 'https://www.pompanobeachlibrary.org', eventsUrl: 'https://www.pompanobeachlibrary.org/events', city: 'Pompano Beach', state: 'FL', zipCode: '00000', county: 'Pompano Beach County'},
  { name: 'Ponte Vedra Beach Branch Library', url: 'https://www.pontevedrabeachlibrary.org', eventsUrl: 'https://www.pontevedrabeachlibrary.org/events', city: 'Ponte Vedra Beach', state: 'FL', zipCode: '00000', county: 'Ponte Vedra Beach County'},
  { name: 'Charlotte-Glades Library System', url: 'https://www.portcharlottelibrary.org', eventsUrl: 'https://www.portcharlottelibrary.org/events', city: 'Port Charlotte', state: 'FL', zipCode: '33952', county: 'Port Charlotte County'},
  { name: 'Port Orange Library', url: 'https://www.portorangelibrary.org', eventsUrl: 'https://www.portorangelibrary.org/events', city: 'Port Orange', state: 'FL', zipCode: '00000', county: 'Port Orange County'},
  { name: 'Saint Lucie West Library', url: 'https://www.portsaintlucielibrary.org', eventsUrl: 'https://www.portsaintlucielibrary.org/events', city: 'Port Saint Lucie', state: 'FL', zipCode: '00000', county: 'Port Saint Lucie County'},
  { name: 'Port St. Joe Branch', url: 'https://www.portstjoelibrary.org', eventsUrl: 'https://www.portstjoelibrary.org/events', city: 'Port St. Joe', state: 'FL', zipCode: '00000', county: 'Port St. Joe County'},
  { name: 'Port St. John Public Library', url: 'https://www.portstjohnlibrary.org', eventsUrl: 'https://www.portstjohnlibrary.org/events', city: 'Port St. John', state: 'FL', zipCode: '32927', county: 'Port St. John County'},
  { name: 'Morningside Branch Library', url: 'https://www.portstlucielibrary.org', eventsUrl: 'https://www.portstlucielibrary.org/events', city: 'Port St. Lucie', state: 'FL', zipCode: '00000', county: 'Port St. Lucie County'},
  { name: 'Punta Gorda Public Library', url: 'https://www.puntagordalibrary.org', eventsUrl: 'https://www.puntagordalibrary.org/events', city: 'Punta Gorda', state: 'FL', zipCode: '00000', county: 'Punta Gorda County'},
  { name: 'Gadsden County Public Library', url: 'https://www.quincylibrary.org', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'FL', zipCode: '32351', county: 'Quincy County'},
  { name: 'Reddick Public Library', url: 'https://www.reddicklibrary.org', eventsUrl: 'https://www.reddicklibrary.org/events', city: 'Reddick', state: 'FL', zipCode: '00000', county: 'Reddick County'},
  { name: 'Riverview Branch Library', url: 'https://www.riverviewlibrary.org', eventsUrl: 'https://www.riverviewlibrary.org/events', city: 'Riverview', state: 'FL', zipCode: '00000', county: 'Riverview County'},
  { name: 'Riviera Beach Public Library', url: 'https://www.rivierabeachlibrary.org', eventsUrl: 'https://www.rivierabeachlibrary.org/events', city: 'Riviera Beach', state: 'FL', zipCode: '33404', county: 'Riviera Beach County'},
  { name: 'Royal Palm Beach Branch Library', url: 'https://www.royalpalmbeachlibrary.org', eventsUrl: 'https://www.royalpalmbeachlibrary.org/events', city: 'Royal Palm Beach', state: 'FL', zipCode: '00000', county: 'Royal Palm Beach County'},
  { name: 'Ruskin Branch Library', url: 'https://www.ruskinlibrary.org', eventsUrl: 'https://www.ruskinlibrary.org/events', city: 'Ruskin', state: 'FL', zipCode: '00000', county: 'Ruskin County'},
  { name: 'Safety Harbor Public Library', url: 'https://www.safetyharborlibrary.org', eventsUrl: 'https://www.safetyharborlibrary.org/events', city: 'Safety Harbor', state: 'FL', zipCode: '00000', county: 'Safety Harbor County'},
  { name: 'North Branch Library', url: 'https://www.sanfordlibrary.org', eventsUrl: 'https://www.sanfordlibrary.org/events', city: 'Sanford', state: 'FL', zipCode: '00000', county: 'Sanford County'},
  { name: 'Sanibel Public Library', url: 'https://www.sanibellibrary.org', eventsUrl: 'https://www.sanibellibrary.org/events', city: 'Sanibel', state: 'FL', zipCode: '33957', county: 'Sanibel County'},
  { name: 'Coastal Branch Library', url: 'https://www.santarosabeachlibrary.org', eventsUrl: 'https://www.santarosabeachlibrary.org/events', city: 'Santa Rosa Beach', state: 'FL', zipCode: '00000', county: 'Santa Rosa Beach County'},
  { name: 'Betty J. Johnson North Sarasota Library', url: 'https://www.sarasotalibrary.org', eventsUrl: 'https://www.sarasotalibrary.org/events', city: 'Sarasota', state: 'FL', zipCode: '34234', county: 'Sarasota County'},
  { name: 'Satellite Beach Public Library', url: 'https://www.satellitebeachlibrary.org', eventsUrl: 'https://www.satellitebeachlibrary.org/events', city: 'Satellite Beach', state: 'FL', zipCode: '00000', county: 'Satellite Beach County'},
  { name: 'North Indian River County Library', url: 'https://www.sebastianlibrary.org', eventsUrl: 'https://www.sebastianlibrary.org/events', city: 'Sebastian', state: 'FL', zipCode: '00000', county: 'Sebastian County'},
  { name: 'Heartland Library Cooperative', url: 'https://www.sebringlibrary.org', eventsUrl: 'https://www.sebringlibrary.org/events', city: 'Sebring', state: 'FL', zipCode: '33870', county: 'Sebring County'},
  { name: 'Seffner-Mango Branch Library', url: 'https://www.seffnerlibrary.org', eventsUrl: 'https://www.seffnerlibrary.org/events', city: 'Seffner', state: 'FL', zipCode: '00000', county: 'Seffner County'},
  { name: 'East Lake County Library', url: 'https://www.sorrentolibrary.org', eventsUrl: 'https://www.sorrentolibrary.org/events', city: 'Sorrento', state: 'FL', zipCode: '00000', county: 'Sorrento County'},
  { name: 'Clarence E. Anthony Branch Library', url: 'https://www.southbaylibrary.org', eventsUrl: 'https://www.southbaylibrary.org/events', city: 'South Bay', state: 'FL', zipCode: '00000', county: 'South Bay County'},
  { name: 'South Miami Branch', url: 'https://www.southmiamilibrary.org', eventsUrl: 'https://www.southmiamilibrary.org/events', city: 'South Miami', state: 'FL', zipCode: '00000', county: 'South Miami County'},
  { name: 'Little Red Schoolhouse Branch', url: 'https://www.springhilllibrary.org', eventsUrl: 'https://www.springhilllibrary.org/events', city: 'Spring Hill', state: 'FL', zipCode: '00000', county: 'Spring Hill County'},
  { name: 'Springfield Branch', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'FL', zipCode: '00000', county: 'Springfield County'},
  { name: 'Southeast Branch Library', url: 'https://www.staugustinelibrary.org', eventsUrl: 'https://www.staugustinelibrary.org/events', city: 'St. Augustine', state: 'FL', zipCode: '32086', county: 'St. Augustine County'},
  { name: 'Anastasia Island Branch Library', url: 'https://www.staugustinebeachlibrary.org', eventsUrl: 'https://www.staugustinebeachlibrary.org/events', city: 'St. Augustine Beach', state: 'FL', zipCode: '32080', county: 'St. Augustine Beach County'},
  { name: 'Narcoossee Library', url: 'https://www.stcloudlibrary.org', eventsUrl: 'https://www.stcloudlibrary.org/events', city: 'St. Cloud', state: 'FL', zipCode: '00000', county: 'St. Cloud County'},
  { name: 'St. Pete Beach Public Library', url: 'https://www.stpetebeachlibrary.org', eventsUrl: 'https://www.stpetebeachlibrary.org/events', city: 'St. Pete Beach', state: 'FL', zipCode: '00000', county: 'St. Pete Beach County'},
  { name: 'James Weldon Johnson Branch Library', url: 'https://www.stpetersburglibrary.org', eventsUrl: 'https://www.stpetersburglibrary.org/events', city: 'St. Petersburg', state: 'FL', zipCode: '00000', county: 'St. Petersburg County'},
  { name: 'Bradford County Public Library', url: 'https://www.starkelibrary.org', eventsUrl: 'https://www.starkelibrary.org/events', city: 'Starke', state: 'FL', zipCode: '00000', county: 'Starke County'},
  { name: 'Blake Library', url: 'https://www.stuartlibrary.org', eventsUrl: 'https://www.stuartlibrary.org/events', city: 'Stuart', state: 'FL', zipCode: '00000', county: 'Stuart County'},
  { name: 'Clark Maxwell, Jr. Library', url: 'https://www.sumtervillelibrary.org', eventsUrl: 'https://www.sumtervillelibrary.org/events', city: 'Sumterville', state: 'FL', zipCode: '00000', county: 'Sumterville County'},
  { name: 'Sunrise Dan Pearl Branch', url: 'https://www.sunriselibrary.org', eventsUrl: 'https://www.sunriselibrary.org/events', city: 'Sunrise', state: 'FL', zipCode: '00000', county: 'Sunrise County'},
  { name: 'Dr. B. L. Perry, Jr. Branch Library', url: 'https://www.tallahasseelibrary.org', eventsUrl: 'https://www.tallahasseelibrary.org/events', city: 'Tallahassee', state: 'FL', zipCode: '00000', county: 'Tallahassee County'},
  { name: 'Tamarac Branch', url: 'https://www.tamaraclibrary.org', eventsUrl: 'https://www.tamaraclibrary.org/events', city: 'Tamarac', state: 'FL', zipCode: '00000', county: 'Tamarac County'},
  { name: '78th Street Community Library', url: 'https://www.tampalibrary.org', eventsUrl: 'https://www.tampalibrary.org/events', city: 'Tampa', state: 'FL', zipCode: '00000', county: 'Tampa County'},
  { name: 'Tarpon Springs Library', url: 'https://www.tarponspringslibrary.org', eventsUrl: 'https://www.tarponspringslibrary.org/events', city: 'Tarpon Springs', state: 'FL', zipCode: '00000', county: 'Tarpon Springs County'},
  { name: 'Lake County Library System', url: 'https://www.tavareslibrary.org', eventsUrl: 'https://www.tavareslibrary.org/events', city: 'Tavares', state: 'FL', zipCode: '32778', county: 'Tavares County'},
  { name: 'Temple Terrace Public Library', url: 'https://www.templeterracelibrary.org', eventsUrl: 'https://www.templeterracelibrary.org/events', city: 'Temple Terrace', state: 'FL', zipCode: '00000', county: 'Temple Terrace County'},
  { name: 'Tequesta Branch Library', url: 'https://www.tequestalibrary.org', eventsUrl: 'https://www.tequestalibrary.org/events', city: 'Tequesta', state: 'FL', zipCode: '00000', county: 'Tequesta County'},
  { name: 'The Villages Public Library', url: 'https://www.thevillageslibrary.org', eventsUrl: 'https://www.thevillageslibrary.org/events', city: 'The Villages', state: 'FL', zipCode: '00000', county: 'The Villages County'},
  { name: 'Thonotosassa Branch Library', url: 'https://www.thonotosassalibrary.org', eventsUrl: 'https://www.thonotosassalibrary.org/events', city: 'Thonotosassa', state: 'FL', zipCode: '00000', county: 'Thonotosassa County'},
  { name: 'North Brevard Public Library', url: 'https://www.titusvillelibrary.org', eventsUrl: 'https://www.titusvillelibrary.org/events', city: 'Titusville', state: 'FL', zipCode: '00000', county: 'Titusville County'},
  { name: 'Gilchrist County Library', url: 'https://www.trentonlibrary.org', eventsUrl: 'https://www.trentonlibrary.org/events', city: 'Trenton', state: 'FL', zipCode: '00000', county: 'Trenton County'},
  { name: 'Umatilla Public Library', url: 'https://www.umatillalibrary.org', eventsUrl: 'https://www.umatillalibrary.org/events', city: 'Umatilla', state: 'FL', zipCode: '00000', county: 'Umatilla County'},
  { name: 'Valparaiso Community Library', url: 'https://www.valparaisolibrary.org', eventsUrl: 'https://www.valparaisolibrary.org/events', city: 'Valparaiso', state: 'FL', zipCode: '00000', county: 'Valparaiso County'},
  { name: 'Jacaranda Public Library', url: 'https://www.venicelibrary.org', eventsUrl: 'https://www.venicelibrary.org/events', city: 'Venice', state: 'FL', zipCode: '00000', county: 'Venice County'},
  { name: 'Vernon Branch Library', url: 'https://www.vernonlibrary.org', eventsUrl: 'https://www.vernonlibrary.org/events', city: 'Vernon', state: 'FL', zipCode: '00000', county: 'Vernon County'},
  { name: 'Indian River County Library', url: 'https://www.verobeachlibrary.org', eventsUrl: 'https://www.verobeachlibrary.org/events', city: 'Vero Beach', state: 'FL', zipCode: '32960', county: 'Vero Beach County'},
  { name: 'Waldo Branch Library', url: 'https://www.waldolibrary.org', eventsUrl: 'https://www.waldolibrary.org/events', city: 'Waldo', state: 'FL', zipCode: '00000', county: 'Waldo County'},
  { name: 'Hardee County Public Library', url: 'https://www.wauchulalibrary.org', eventsUrl: 'https://www.wauchulalibrary.org/events', city: 'Wauchula', state: 'FL', zipCode: '00000', county: 'Wauchula County'},
  { name: 'Wausau Branch Library', url: 'https://www.wausaulibrary.org', eventsUrl: 'https://www.wausaulibrary.org/events', city: 'Wausau', state: 'FL', zipCode: '00000', county: 'Wausau County'},
  { name: 'E.C. Rowell Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'FL', zipCode: '00000', county: 'Webster County'},
  { name: 'Welaka Womans Club Library', url: 'https://www.welakalibrary.org', eventsUrl: 'https://www.welakalibrary.org/events', city: 'Welaka', state: 'FL', zipCode: '00000', county: 'Welaka County'},
  { name: 'Wellington Branch Library', url: 'https://www.wellingtonlibrary.org', eventsUrl: 'https://www.wellingtonlibrary.org/events', city: 'Wellington', state: 'FL', zipCode: '00000', county: 'Wellington County'},
  { name: 'Mandel Public Library Of West Palm Beach', url: 'https://www.westpalmbeachlibrary.org', eventsUrl: 'https://www.westpalmbeachlibrary.org/events', city: 'West Palm Beach', state: 'FL', zipCode: '33401', county: 'West Palm Beach County'},
  { name: 'Weston Reading Center', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'FL', zipCode: '00000', county: 'Weston County'},
  { name: 'Wewa Branch Library', url: 'https://www.wewahitchkalibrary.org', eventsUrl: 'https://www.wewahitchkalibrary.org/events', city: 'Wewahitchka', state: 'FL', zipCode: '00000', county: 'Wewahitchka County'},
  { name: 'White Springs Public Library', url: 'https://www.whitespringslibrary.org', eventsUrl: 'https://www.whitespringslibrary.org/events', city: 'White Springs', state: 'FL', zipCode: '00000', county: 'White Springs County'},
  { name: 'Wildwood Public Library', url: 'https://www.wildwoodlibrary.org', eventsUrl: 'https://www.wildwoodlibrary.org/events', city: 'Wildwood', state: 'FL', zipCode: '00000', county: 'Wildwood County'},
  { name: 'Williston Public Library', url: 'https://www.willistonlibrary.org', eventsUrl: 'https://www.willistonlibrary.org/events', city: 'Williston', state: 'FL', zipCode: '00000', county: 'Williston County'},
  { name: 'Richard C. Sullivan Public Library Of Wilton Manors', url: 'https://www.wiltonmanorslibrary.org', eventsUrl: 'https://www.wiltonmanorslibrary.org/events', city: 'Wilton Manors', state: 'FL', zipCode: '33305', county: 'Wilton Manors County'},
  { name: 'Windermere Library', url: 'https://www.windermerelibrary.org', eventsUrl: 'https://www.windermerelibrary.org/events', city: 'Windermere', state: 'FL', zipCode: '00000', county: 'Windermere County'},
  { name: 'West Orange Library', url: 'https://www.wintergardenlibrary.org', eventsUrl: 'https://www.wintergardenlibrary.org/events', city: 'Winter Garden', state: 'FL', zipCode: '00000', county: 'Winter Garden County'},
  { name: 'Winter Haven Public Library - Kathryn L. Smith Memorial', url: 'https://www.winterhavenlibrary.org', eventsUrl: 'https://www.winterhavenlibrary.org/events', city: 'Winter Haven', state: 'FL', zipCode: '00000', county: 'Winter Haven County'},
  { name: 'Winter Park Public Library', url: 'https://www.winterparklibrary.org', eventsUrl: 'https://www.winterparklibrary.org/events', city: 'Winter Park', state: 'FL', zipCode: '32789', county: 'Winter Park County'},
  { name: 'A.F. Knotts Public Library', url: 'https://www.yankeetownlibrary.org', eventsUrl: 'https://www.yankeetownlibrary.org/events', city: 'Yankeetown', state: 'FL', zipCode: '00000', county: 'Yankeetown County'},
  { name: 'Yulee Branch', url: 'https://www.yuleelibrary.org', eventsUrl: 'https://www.yuleelibrary.org/events', city: 'Yulee', state: 'FL', zipCode: '00000', county: 'Yulee County'},
  { name: 'Zephyrhills Library', url: 'https://www.zephyrhillslibrary.org', eventsUrl: 'https://www.zephyrhillslibrary.org/events', city: 'Zephyrhills', state: 'FL', zipCode: '00000', county: 'Zephyrhills County'}

];

const SCRAPER_NAME = 'generic-FL';

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
            state: 'FL',
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
    state: 'FL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - FL (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressFLCloudFunction() {
  console.log('☁️ Running WordPress FL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-FL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-FL', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressFLCloudFunction };
