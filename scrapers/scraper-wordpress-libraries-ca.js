const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: CA
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Los Angeles Public Library",
    "url": "https://www.lapl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.lapl.org/events"
  },
  {
    "name": "San Jose Public Library",
    "url": "https://www.sjpl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.sjpl.org/events"
  },
  {
    "name": "Long Beach Public Library",
    "url": "https://www.longbeach.gov/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.longbeach.gov/library/events"
  },
  {
    "name": "Alameda County Library",
    "url": "https://aclibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://aclibrary.org/events"
  },
  {
    "name": "San Bernardino County Library",
    "url": "https://www.sbcounty.gov/library",
    "platform": "wordpress",
    "eventsUrl": "https://www.sbcounty.gov/library/events"
  },
  {
    "name": "Kern County Library",
    "url": "https://www.kerncountylibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.kerncountylibrary.org/events"
  }
]
 */

const LIBRARIES = [
  { name: 'Los Angeles Public Library', url: 'https://www.lapl.org', platform: 'wordpress', eventsUrl: 'https://www.lapl.org/events', city: 'Los Angeles', state: 'CA', zipCode: '', county: '' },
  { name: 'San Jose Public Library', url: 'https://www.sjpl.org', platform: 'wordpress', eventsUrl: 'https://www.sjpl.org/events', city: 'San Jose', state: 'CA', zipCode: '', county: '' },
  { name: 'Long Beach Public Library', url: 'https://www.longbeach.gov/library', platform: 'wordpress', eventsUrl: 'https://www.longbeach.gov/library/events', city: 'Long Beach', state: 'CA', zipCode: '', county: '' },
  { name: 'Alameda County Library', url: 'https://aclibrary.org', platform: 'wordpress', eventsUrl: 'https://aclibrary.org/events', city: '', state: 'CA', zipCode: '', county: '' },
  { name: 'San Bernardino County Library', url: 'https://www.sbcounty.gov/library', platform: 'wordpress', eventsUrl: 'https://www.sbcounty.gov/library/events', city: '', state: 'CA', zipCode: '', county: '' },
  { name: 'Kern County Library', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: '', state: 'CA', zipCode: '', county: '' },
  { name: 'Alhambra Public Library', url: 'https://www.alhambralibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alhambralibrary.org/events', city: 'Alhambra', state: 'CA', zipCode: '91801', county: '' },
  { name: 'Alpine Library', url: 'https://www.alpinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alpinelibrary.org/events', city: 'Alpine', state: 'CA', zipCode: '91901', county: '' },
  { name: 'Modoc County Library', url: 'https://www.modoccountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.modoccountylibrary.org/events', city: 'Alturas', state: 'CA', zipCode: '96101', county: '' },
  { name: 'American Canyon', url: 'https://www.americancanyon.org', platform: 'wordpress', eventsUrl: 'https://www.americancanyon.org/events', city: 'American Canyon', state: 'CA', zipCode: '94503', county: '' },
  { name: 'Anderson Library', url: 'https://www.andersonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.andersonlibrary.org/events', city: 'Anderson', state: 'CA', zipCode: '96007', county: '' },
  { name: 'Antioch Library', url: 'https://www.antiochlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.antiochlibrary.org/events', city: 'Antioch', state: 'CA', zipCode: '94509', county: '' },
  { name: 'Arcadia Public Library', url: 'https://www.arcadialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.arcadialibrary.org/events', city: 'Arcadia', state: 'CA', zipCode: '91006', county: '' },
  { name: 'Kern County Library - Arvin', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Arvin', state: 'CA', zipCode: '93203', county: '' },
  { name: 'Atherton Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Atherton', state: 'CA', zipCode: '94027', county: '' },
  { name: 'Avalon Library', url: 'https://avalonlibrary.org/', platform: 'wordpress', eventsUrl: 'https://avalonlibrary.org/', city: 'Avalon', state: 'CA', zipCode: '90704', county: '' },
  { name: 'Kings County Library - Avenal', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Avenal', state: 'CA', zipCode: '93204', county: '' },
  { name: 'Kern County Library - Baker', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Bakersfield', state: 'CA', zipCode: '93305', county: '' },
  { name: 'Kern County Library - Bryce C. Rathbun', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Bakersfield', state: 'CA', zipCode: '93308', county: '' },
  { name: 'Kern County Library - Eleanor Wilson', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Bakersfield', state: 'CA', zipCode: '93304', county: '' },
  { name: 'Kern County Library - Holloway-Gonzales', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Bakersfield', state: 'CA', zipCode: '93307', county: '' },
  { name: 'Kern County Library - Northeast', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Bakersfield', state: 'CA', zipCode: '93306', county: '' },
  { name: 'Kern County Library - Southwest', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Bakersfield', state: 'CA', zipCode: '93311', county: '' },
  { name: 'Banning Library District', url: 'https://www.banninglibraryca.gov/', platform: 'wordpress', eventsUrl: 'https://www.banninglibraryca.gov/', city: 'Banning', state: 'CA', zipCode: '92220', county: '' },
  { name: 'Belmont Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'CA', zipCode: '94002', county: '' },
  { name: 'Benicia Public Library', url: 'https://www.benicialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.benicialibrary.org/events', city: 'Benicia', state: 'CA', zipCode: '94510', county: '' },
  { name: 'Bloomington Branch Library', url: 'https://www.bloomingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bloomingtonlibrary.org/events', city: 'Bloomington', state: 'CA', zipCode: '92316', county: '' },
  { name: 'Kern County Library - Boron', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Boron', state: 'CA', zipCode: '93516', county: '' },
  { name: 'Bradley Branch Library', url: 'https://www.bradleylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.bradleylibrary.org/', city: 'Bradley', state: 'CA', zipCode: '93426', county: '' },
  { name: 'Brentwood Library', url: 'https://www.brentwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'CA', zipCode: '94513', county: '' },
  { name: 'Bridgeport Library', url: 'https://www.bridgeportlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'CA', zipCode: '06605', county: '' },
  { name: 'Brisbane Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Brisbane', state: 'CA', zipCode: '94005', county: '' },
  { name: 'Buellton Branch Library', url: 'https://www.goletavalleylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.goletavalleylibrary.org/', city: 'Buellton', state: 'CA', zipCode: '93427', county: '' },
  { name: 'Burbank Public Library', url: 'https://www.burbanklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burbanklibrary.org/events', city: 'Burbank', state: 'CA', zipCode: '91502', county: '' },
  { name: 'Kern County Library - Bookmobile', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Buttonwillow', state: 'CA', zipCode: '93206', county: '' },
  { name: 'Kern County Library - Buttonwillow', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Buttonwillow', state: 'CA', zipCode: '93206', county: '' },
  { name: 'Kern County Library - California City', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'California City', state: 'CA', zipCode: '93505', county: '' },
  { name: 'Camarillo Library', url: 'https://www.camarillolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.camarillolibrary.org/events', city: 'Camarillo', state: 'CA', zipCode: '93010', county: '' },
  { name: 'Centro De Informacion', url: 'https://www.centrodeinformacion.org', platform: 'wordpress', eventsUrl: 'https://www.centrodeinformacion.org/events', city: 'Carlsbad', state: 'CA', zipCode: '92008', county: '' },
  { name: 'Harrison Memorial Library', url: 'https://www.harrisonpl.org/', platform: 'wordpress', eventsUrl: 'https://www.harrisonpl.org/', city: 'Carmel', state: 'CA', zipCode: '93921', county: '' },
  { name: 'Carpinteria Library', url: 'https://www.carpinterialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carpinterialibrary.org/events', city: 'Carpinteria', state: 'CA', zipCode: '93013', county: '' },
  { name: 'Cerritos Public Library', url: 'https://www.cerritoslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cerritoslibrary.org/events', city: 'Cerritos', state: 'CA', zipCode: '90703', county: '' },
  { name: 'Chester Branch Library', url: 'https://www.chesterlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'CA', zipCode: '96020', county: '' },
  { name: 'Chula Vista Public Library', url: 'https://www.chulavistalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chulavistalibrary.org/events', city: 'Chula Vista', state: 'CA', zipCode: '91910', county: '' },
  { name: 'Claremont Library', url: 'https://www.claremontlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.claremontlibrary.org/', city: 'Claremont', state: 'CA', zipCode: '91711', county: '' },
  { name: 'Clarksburg Branch Library', url: 'https://www.clarksburglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'CA', zipCode: '95612', county: '' },
  { name: 'Clayton Community Library', url: 'https://www.claytonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'CA', zipCode: '94517', county: '' },
  { name: 'City Of Commerce Public Library', url: 'https://www.commercelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.commercelibrary.org/', city: 'Commerce', state: 'CA', zipCode: '90040', county: '' },
  { name: 'Concord Library', url: 'https://www.concordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'CA', zipCode: '94519', county: '' },
  { name: 'Kings County Library - Corcoran', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Corcoran', state: 'CA', zipCode: '93212', county: '' },
  { name: 'Coronado Public Library', url: 'https://www.coronadolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.coronadolibrary.org/', city: 'Coronado', state: 'CA', zipCode: '92118', county: '' },
  { name: 'Del Norte County Library District', url: 'https://www.delnortecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.delnortecountylibrary.org/events', city: 'Crescent City', state: 'CA', zipCode: '95531', county: '' },
  { name: 'Creston Library', url: 'https://www.crestonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crestonlibrary.org/events', city: 'Creston', state: 'CA', zipCode: '93432', county: '' },
  { name: 'Cupertino Library', url: 'https://sccld.org/', platform: 'wordpress', eventsUrl: 'https://sccld.org/locations/cupertino/', city: 'Cupertino', state: 'CA', zipCode: '95014', county: '' },
  { name: 'Daly City Public Library', url: 'https://www.dalycitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dalycitylibrary.org/events', city: 'Daly City', state: 'CA', zipCode: '94015', county: '' },
  { name: 'Westlake Library', url: 'https://www.westlakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westlakelibrary.org/events', city: 'Daly City', state: 'CA', zipCode: '94015', county: '' },
  { name: 'Danville Library', url: 'http://www.danvilleva.gov/', platform: 'wordpress', eventsUrl: 'http://www.danvilleva.gov/2467/Public-Library', city: 'Danville', state: 'CA', zipCode: '94526', county: '' },
  { name: 'Davis Branch Library', url: 'https://www.davislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.davislibrary.org/events', city: 'Davis', state: 'CA', zipCode: '95616', county: '' },
  { name: 'Kern County Library - Delano', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Delano', state: 'CA', zipCode: '93215', county: '' },
  { name: 'Dublin Library', url: 'https://www.dublinlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.dublinlibrary.org/', city: 'Dublin', state: 'CA', zipCode: '94568', county: '' },
  { name: 'Dunsmuir Branch Library', url: 'https://www.dunsmuirlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dunsmuirlibrary.org/events', city: 'Dunsmuir', state: 'CA', zipCode: '96025', county: '' },
  { name: 'East Palo Alto Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'East Palo Alto', state: 'CA', zipCode: '94303', county: '' },
  { name: 'Easton Neighborhood Library', url: 'https://www.eastonlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.eastonlibrary.org/library-events', city: 'Easton', state: 'CA', zipCode: '93706', county: '' },
  { name: 'Norwood Library', url: 'https://norwoodlibrary.org/', platform: 'wordpress', eventsUrl: 'https://norwoodlibrary.org/', city: 'El Monte', state: 'CA', zipCode: '91732', county: '' },
  { name: 'El Segundo Public Library', url: 'https://www.elsegundolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elsegundolibrary.org/events', city: 'El Segundo', state: 'CA', zipCode: '90245', county: '' },
  { name: 'Franklin Library', url: 'https://www.franklinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Elk Grove', state: 'CA', zipCode: '95757', county: '' },
  { name: 'Escondido Public Library', url: 'https://www.escondidolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.escondidolibrary.org/events', city: 'Escondido', state: 'CA', zipCode: '92025', county: '' },
  { name: 'Exeter Library', url: 'https://www.exeterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.exeterlibrary.org/events', city: 'Exeter', state: 'CA', zipCode: '93221', county: '' },
  { name: 'Fairfax Regional Library', url: 'https://www.fairfaxlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'CA', zipCode: '94930', county: '' },
  { name: 'Law Library', url: 'https://www.lawlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lawlibrary.org/events', city: 'Fairfield', state: 'CA', zipCode: '94533', county: '' },
  { name: 'Solano County Library', url: 'https://www.solanocountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.solanocountylibrary.org/events', city: 'Fairfield', state: 'CA', zipCode: '94533', county: '' },
  { name: 'Fillmore Library', url: 'https://fillmoreutlibrary.gov/', platform: 'wordpress', eventsUrl: 'https://fillmoreutlibrary.gov/upcoming-events/', city: 'Fillmore', state: 'CA', zipCode: '93015', county: '' },
  { name: 'Foresthill Library', url: 'https://www.foresthilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.foresthilllibrary.org/events', city: 'Foresthill', state: 'CA', zipCode: '95631', county: '' },
  { name: 'Foster City Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Foster City', state: 'CA', zipCode: '94404', county: '' },
  { name: 'Kern County Library - Frazier Park', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Frazier Park', state: 'CA', zipCode: '93225', county: '' },
  { name: 'Fort Bragg Branch Library', url: 'https://www.fortbragglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fortbragglibrary.org/events', city: 'Ft Bragg', state: 'CA', zipCode: '95437', county: '' },
  { name: 'Fullerton Public Library', url: 'https://www.fullertonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fullertonlibrary.org/events', city: 'Fullerton', state: 'CA', zipCode: '92832', county: '' },
  { name: 'Bayliss Branch Library', url: 'https://www.baylisslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.baylisslibrary.org/events', city: 'Glenn', state: 'CA', zipCode: '95943', county: '' },
  { name: 'Greenfield Branch Library', url: 'https://www.greenfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'CA', zipCode: '93927', county: '' },
  { name: 'Greenville Branch Library', url: 'https://www.greenvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'CA', zipCode: '95947', county: '' },
  { name: 'Half Moon Bay Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Half Moon Bay', state: 'CA', zipCode: '94019', county: '' },
  { name: 'Kings County Library', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Hanford', state: 'CA', zipCode: '93230', county: '' },
  { name: 'Kings County Library - Hanford', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Hanford', state: 'CA', zipCode: '93230', county: '' },
  { name: 'Hawthorne Library', url: 'https://www.hawthornelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hawthornelibrary.org/events', city: 'Hawthorne', state: 'CA', zipCode: '90250', county: '' },
  { name: 'Hayward Public Library', url: 'https://ligastrips.com/', platform: 'wordpress', eventsUrl: 'https://ligastrips.com/', city: 'Hayward', state: 'CA', zipCode: '94541', county: '' },
  { name: 'Hemet Public Library', url: 'https://www.hemetlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.hemetlibrary.org/', city: 'Hemet', state: 'CA', zipCode: '92543', county: '' },
  { name: 'Hesperia Branch Library', url: 'https://www.hesperialibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.hesperialibrary.org/', city: 'Hesperia', state: 'CA', zipCode: '92345', county: '' },
  { name: 'Huron Branch Library', url: 'https://www.huronlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.huronlibrary.org/', city: 'Huron', state: 'CA', zipCode: '93234', county: '' },
  { name: 'Imperial Public Library', url: 'https://www.imperiallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.imperiallibrary.org/events', city: 'Imperial', state: 'CA', zipCode: '92251', county: '' },
  { name: 'Ivanhoe Library', url: 'https://www.ivanhoelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ivanhoelibrary.org/events', city: 'Ivanhoe', state: 'CA', zipCode: '93235', county: '' },
  { name: 'Jamestown Library', url: 'https://www.jamestownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jamestownlibrary.org/events', city: 'Jamestown', state: 'CA', zipCode: '95327', county: '' },
  { name: 'Kern County Library - Kernville', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Kernville', state: 'CA', zipCode: '93238', county: '' },
  { name: 'Kings County Library - Kettleman City', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Kettleman City', state: 'CA', zipCode: '93239', county: '' },
  { name: 'La Mesa Library', url: 'https://www.lamesalibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.lamesalibrary.org/about/events/', city: 'La Mesa', state: 'CA', zipCode: '91942', county: '' },
  { name: 'La Porte Station Library', url: 'https://www.laportelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laportelibrary.org/events', city: 'La Porte', state: 'CA', zipCode: '95981', county: '' },
  { name: 'Lafayette Library', url: 'https://lafayettelibrary.org/', platform: 'wordpress', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'CA', zipCode: '94549', county: '' },
  { name: 'Kern County Library - Kern River Valley', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Lake Isabella', state: 'CA', zipCode: '93240', county: '' },
  { name: 'Kern County Library - Kern River Valley Bookmobile', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Lake Isabella', state: 'CA', zipCode: '93240', county: '' },
  { name: 'Lake View Terrace', url: 'https://www.lakeviewterrace.org', platform: 'wordpress', eventsUrl: 'https://www.lakeviewterrace.org/events', city: 'Lake View Terrace', state: 'CA', zipCode: '91342', county: '' },
  { name: 'Lake County Library', url: 'https://www.lakecountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.lakecountylibrary.org/calendar', city: 'Lakeport', state: 'CA', zipCode: '95453', county: '' },
  { name: 'Kern County Library - Lamont', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Lamont', state: 'CA', zipCode: '93241', county: '' },
  { name: 'Lancaster Library', url: 'https://www.lancasterlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'CA', zipCode: '93534', county: '' },
  { name: 'Larkspur Public Library', url: 'https://www.larkspurlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.larkspurlibrary.org/events', city: 'Larkspur', state: 'CA', zipCode: '94939', county: '' },
  { name: 'Kings County Library - Lemoore', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Lemoore', state: 'CA', zipCode: '93245', county: '' },
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'CA', zipCode: '95648', county: '' },
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'CA', zipCode: '95648', county: '' },
  { name: 'Springtown Branch Library', url: 'https://www.springtownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.springtownlibrary.org/events', city: 'Livermore', state: 'CA', zipCode: '94551', county: '' },
  { name: 'Livingston Branch Library', url: 'https://www.livingstonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'CA', zipCode: '95334', county: '' },
  { name: 'Village Branch Library', url: 'https://www.villagelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.villagelibrary.org/events', city: 'Lompoc', state: 'CA', zipCode: '93436', county: '' },
  { name: 'El Dorado Branch Library', url: 'https://eldoradolibrary.org/', platform: 'wordpress', eventsUrl: 'https://eldoradolibrary.org/', city: 'Long Beach', state: 'CA', zipCode: '90815', county: '' },
  { name: 'Long Beach Public Library', url: 'https://www.longbeachlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.longbeachlibrary.org/events', city: 'Long Beach', state: 'CA', zipCode: '90822', county: '' },
  { name: 'Mark Twain Branch Library', url: 'https://www.marktwainlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marktwainlibrary.org/events', city: 'Long Beach', state: 'CA', zipCode: '90813', county: '' },
  { name: 'Loomis Library', url: 'https://www.loomislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.loomislibrary.org/events', city: 'Loomis', state: 'CA', zipCode: '95650', county: '' },
  { name: 'Los Gatos Public Library', url: 'https://www.losgatosca.gov/', platform: 'wordpress', eventsUrl: 'https://www.losgatosca.gov/2828/Los-Gatos-Public-Library', city: 'Los Gatos', state: 'CA', zipCode: '95030', county: '' },
  { name: 'Madera County Library', url: 'https://www.maderacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maderacountylibrary.org/events', city: 'Madera', state: 'CA', zipCode: '93637', county: '' },
  { name: 'Marina Branch Library', url: 'https://www.cityofsanmateo.org/', platform: 'wordpress', eventsUrl: 'https://www.cityofsanmateo.org/507/Library', city: 'Marina', state: 'CA', zipCode: '93933', county: '' },
  { name: 'Monterey County Free Libraries', url: 'https://www.montereycountyfreelibraries.org', platform: 'wordpress', eventsUrl: 'https://www.montereycountyfreelibraries.org/events', city: 'Marina', state: 'CA', zipCode: '93933', county: '' },
  { name: 'Kern County Library - Clara M. Jackson (Mcfarland)', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Mcfarland', state: 'CA', zipCode: '93250', county: '' },
  { name: 'Menlo Park Public Library', url: 'https://www.menloparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.menloparklibrary.org/events', city: 'Menlo Park', state: 'CA', zipCode: '94025', county: '' },
  { name: 'Merced County Library', url: 'https://www.mercedcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mercedcountylibrary.org/events', city: 'Merced', state: 'CA', zipCode: '95340', county: '' },
  { name: 'Middletown Library', url: 'https://www.middletownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'CA', zipCode: '95461', county: '' },
  { name: 'Mill Valley Public Library', url: 'https://cityofmillvalley.gov/', platform: 'wordpress', eventsUrl: 'https://cityofmillvalley.gov/2203/Library', city: 'Mill Valley', state: 'CA', zipCode: '94941', county: '' },
  { name: 'Millbrae Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Millbrae', state: 'CA', zipCode: '94030', county: '' },
  { name: 'Kern County Library - Mojave', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Mojave', state: 'CA', zipCode: '93501', county: '' },
  { name: 'Monrovia Public Library', url: 'https://www.monrovialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.monrovialibrary.org/events', city: 'Monrovia', state: 'CA', zipCode: '91016', county: '' },
  { name: 'Montclair Branch Library', url: 'https://www.montclairlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.montclairlibrary.org/events', city: 'Montclair', state: 'CA', zipCode: '91763', county: '' },
  { name: 'Monterey Public Library', url: 'https://www.montereylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'CA', zipCode: '93940', county: '' },
  { name: 'Montrose Branch Library', url: 'https://www.montroselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.montroselibrary.org/events', city: 'Montrose', state: 'CA', zipCode: '91020', county: '' },
  { name: 'Mt. Shasta Branch Library', url: 'https://mountshastalibrary.org/', platform: 'wordpress', eventsUrl: 'https://mountshastalibrary.org/', city: 'Mt. Shasta', state: 'CA', zipCode: '96067', county: '' },
  { name: 'National City Public Library', url: 'https://www.nationalcityca.gov/', platform: 'wordpress', eventsUrl: 'https://www.nationalcityca.gov/government/community-services/events', city: 'National City', state: 'CA', zipCode: '91950', county: '' },
  { name: 'Newark Library', url: 'https://newarklibrary.org/', platform: 'wordpress', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'CA', zipCode: '94560', county: '' },
  { name: 'Newman Library', url: 'https://www.newmanlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.newmanlibrary.org/', city: 'Newman', state: 'CA', zipCode: '95360', county: '' },
  { name: 'Central Library', url: 'https://www.centrallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centrallibrary.org/events', city: 'Newport Beach', state: 'CA', zipCode: '92660', county: '' },
  { name: 'Mariners Branch Library', url: 'https://www.marinerslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marinerslibrary.org/events', city: 'Newport Beach', state: 'CA', zipCode: '92660', county: '' },
  { name: 'Newport Beach Public Library', url: 'https://www.newportbeachlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newportbeachlibrary.org/events', city: 'Newport Beach', state: 'CA', zipCode: '92660', county: '' },
  { name: 'Norwalk Library', url: 'https://www.norwalklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.norwalklibrary.org/events', city: 'Norwalk', state: 'CA', zipCode: '90650', county: '' },
  { name: 'Oakley Library', url: 'https://www.oakleylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.oakleylibrary.org/calendar', city: 'Oakley', state: 'CA', zipCode: '94561', county: '' },
  { name: 'Oceanside Public Library', url: 'https://www.oceansidelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oceansidelibrary.org/events', city: 'Oceanside', state: 'CA', zipCode: '92054', county: '' },
  { name: 'Ontario City Library', url: 'https://www.ontariocitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ontariocitylibrary.org/events', city: 'Ontario', state: 'CA', zipCode: '91764', county: '' },
  { name: 'Pacific Grove Public Library', url: 'https://www.pacificgrovelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pacificgrovelibrary.org/events', city: 'Pacific Grove', state: 'CA', zipCode: '93950', county: '' },
  { name: 'Pacifica Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Pacifica', state: 'CA', zipCode: '94044', county: '' },
  { name: 'Sanchez Library', url: 'https://www.sanchezlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanchezlibrary.org/events', city: 'Pacifica', state: 'CA', zipCode: '94044', county: '' },
  { name: 'Palm Desert Library', url: 'https://www.palmdesertlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palmdesertlibrary.org/events', city: 'Palm Desert', state: 'CA', zipCode: '92260', county: '' },
  { name: 'Palm Springs Public Library', url: 'https://www.palmspringsca.gov/', platform: 'wordpress', eventsUrl: 'https://www.palmspringsca.gov/government/departments/library', city: 'Palm Springs', state: 'CA', zipCode: '92262', county: '' },
  { name: 'Childrens Library', url: 'https://www.childrenslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.childrenslibrary.org/events', city: 'Palo Alto', state: 'CA', zipCode: '94301', county: '' },
  { name: 'Allendale Branch Library', url: 'https://www.allendalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.allendalelibrary.org/events', city: 'Pasadena', state: 'CA', zipCode: '91106', county: '' },
  { name: 'Hastings Branch Library', url: 'https://hastingslibrary.org/', platform: 'wordpress', eventsUrl: 'https://hastingslibrary.org/calendar/', city: 'Pasadena', state: 'CA', zipCode: '91107', county: '' },
  { name: 'Pasadena Public Library', url: 'https://www.pasadenalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pasadenalibrary.org/events', city: 'Pasadena', state: 'CA', zipCode: '91101', county: '' },
  { name: 'Patterson Library', url: 'https://pattersonlibrary.org/', platform: 'wordpress', eventsUrl: 'https://pattersonlibrary.org/calendar/', city: 'Patterson', state: 'CA', zipCode: '95363', county: '' },
  { name: 'Pittsburg Library', url: 'https://www.pittsburglibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.pittsburglibrary.org/', city: 'Pittsburg', state: 'CA', zipCode: '', county: '' },
  { name: 'Pleasanton Public Library', url: 'https://www.pleasantonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pleasantonlibrary.org/events', city: 'Pleasanton', state: 'CA', zipCode: '94566', county: '' },
  { name: 'Pollock Pines Library', url: 'https://www.pollockpineslibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.pollockpineslibrary.org/', city: 'Pollock Pines', state: 'CA', zipCode: '', county: '' },
  { name: 'Porterville Public Library', url: 'https://www.portervillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.portervillelibrary.org/events', city: 'Porterville', state: 'CA', zipCode: '93257', county: '' },
  { name: 'Portola Valley Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Portola Valley', state: 'CA', zipCode: '', county: '' },
  { name: 'Rancho Mirage Public Library', url: 'https://www.ranchomiragelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ranchomiragelibrary.org/events', city: 'Rancho Mirage', state: 'CA', zipCode: '92270', county: '' },
  { name: 'Tehama County Library', url: 'https://www.tehamacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tehamacountylibrary.org/events', city: 'Red Bluff', state: 'CA', zipCode: '96080', county: '' },
  { name: 'Richmond Public Library', url: 'https://www.richmondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'CA', zipCode: '94804', county: '' },
  { name: 'Kern County Library - Ridgecrest', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Ridgecrest', state: 'CA', zipCode: '', county: '' },
  { name: 'Ripon Library', url: 'https://www.riponlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riponlibrary.org/events', city: 'Ripon', state: 'CA', zipCode: '', county: '' },
  { name: 'Riverdale Neighborhood Library', url: 'https://www.riverdalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'CA', zipCode: '', county: '' },
  { name: 'Kern County Library - Wanda Kirk (Rosamond)', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Rosamond', state: 'CA', zipCode: '', county: '' },
  { name: 'Roseville Public Library', url: 'https://rosevillelibrary.org/', platform: 'wordpress', eventsUrl: 'https://rosevillelibrary.org/', city: 'Roseville', state: 'CA', zipCode: '95678', county: '' },
  { name: 'Salida Library', url: 'https://www.salidalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.salidalibrary.org/events', city: 'Salida', state: 'CA', zipCode: '', county: '' },
  { name: 'Buena Vista Branch Library', url: 'https://www.buenavistalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.buenavistalibrary.org/events', city: 'Salinas', state: 'CA', zipCode: '', county: '' },
  { name: 'San Anselmo Public Library', url: 'https://www.sananselmo.gov/', platform: 'wordpress', eventsUrl: 'https://www.sananselmo.gov/1662/Library', city: 'San Anselmo', state: 'CA', zipCode: '', county: '' },
  { name: 'San Anselmo Public Library', url: 'https://www.sananselmo.gov/', platform: 'wordpress', eventsUrl: 'https://www.sananselmo.gov/1662/Library', city: 'San Anselmo', state: 'CA', zipCode: '94960', county: '' },
  { name: 'San Bruno Public Library', url: 'https://www.sanbrunolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanbrunolibrary.org/events', city: 'San Bruno', state: 'CA', zipCode: '94066', county: '' },
  { name: 'San Carlos Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'San Carlos', state: 'CA', zipCode: '', county: '' },
  { name: 'Sanger Branch Library', url: 'https://www.sangerlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.sangerlibrary.org/', city: 'Sanger', state: 'CA', zipCode: '', county: '' },
  { name: 'Fairview Branch Library', url: 'https://www.fairviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Santa Monica', state: 'CA', zipCode: '', county: '' },
  { name: 'Sausalito Public Library', url: 'https://www.sausalitolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sausalitolibrary.org/events', city: 'Sausalito', state: 'CA', zipCode: '94965', county: '' },
  { name: 'Seaside Branch Library', url: 'https://www.seasidelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.seasidelibrary.org/calendar', city: 'Seaside', state: 'CA', zipCode: '', county: '' },
  { name: 'Selma Branch Library', url: 'https://selmalibrary.org/', platform: 'wordpress', eventsUrl: 'https://selmalibrary.org/', city: 'Selma', state: 'CA', zipCode: '', county: '' },
  { name: 'Kern County Library - Shafter', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Shafter', state: 'CA', zipCode: '', county: '' },
  { name: 'Simi Valley Library', url: 'https://simivalleylibrary.org/', platform: 'wordpress', eventsUrl: 'https://simivalleylibrary.org/', city: 'Simi Valley', state: 'CA', zipCode: '', county: '' },
  { name: 'Solvang Library', url: 'https://www.goletavalleylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.goletavalleylibrary.org/', city: 'Solvang', state: 'CA', zipCode: '', county: '' },
  { name: 'Community Learning Center', url: 'https://www.communitylearningcenter.org', platform: 'wordpress', eventsUrl: 'https://www.communitylearningcenter.org/events', city: 'South San Francisco', state: 'CA', zipCode: '', county: '' },
  { name: 'Casa De Oro Library', url: 'https://www.casadeorolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.casadeorolibrary.org/events', city: 'Spring Valley', state: 'CA', zipCode: '', county: '' },
  { name: 'Spring Valley Library', url: 'https://www.springvalleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'CA', zipCode: '', county: '' },
  { name: 'Maya Angelou Library', url: 'https://www.mayaangeloulibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mayaangeloulibrary.org/events', city: 'Stockton', state: 'CA', zipCode: '', county: '' },
  { name: 'Kings County Library - Stratford', url: 'https://www.kingscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kingscountylibrary.org/events', city: 'Stratford', state: 'CA', zipCode: '', county: '' },
  { name: 'Sunnyvale Public Library', url: 'https://www.sunnyvalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sunnyvalelibrary.org/events', city: 'Sunnyvale', state: 'CA', zipCode: '94086', county: '' },
  { name: 'Kern County Library - Taft', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Taft', state: 'CA', zipCode: '', county: '' },
  { name: 'Kern County Library - Tehachapi', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Tehachapi', state: 'CA', zipCode: '93561', county: '' },
  { name: 'Temecula Public Library', url: 'https://temeculaca.gov/', platform: 'wordpress', eventsUrl: 'https://temeculaca.gov/library', city: 'Temecula', state: 'CA', zipCode: '92592', county: '' },
  { name: 'Thousand Oaks Library', url: 'https://www.thousandoakslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.thousandoakslibrary.org/events', city: 'Thousand Oaks', state: 'CA', zipCode: '91362', county: '' },
  { name: 'Three Rivers Library', url: 'https://www.threeriverslibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.threeriverslibrary.org/calendar', city: 'Three Rivers', state: 'CA', zipCode: '', county: '' },
  { name: 'Tracy Library', url: 'https://www.tracylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tracylibrary.org/events', city: 'Tracy', state: 'CA', zipCode: '', county: '' },
  { name: 'Valley Center Library', url: 'https://www.valleycenterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.valleycenterlibrary.org/events', city: 'Valley Center', state: 'CA', zipCode: '', county: '' },
  { name: 'Vernon Public Library', url: 'https://www.vernonlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'CA', zipCode: '90058', county: '' },
  { name: 'Victorville City Library', url: 'https://www.victorvillecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.victorvillecitylibrary.org/events', city: 'Victorville', state: 'CA', zipCode: '92395', county: '' },
  { name: 'Tulare County Free Library', url: 'https://www.tularecountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.tularecountylibrary.org/calendar', city: 'Visalia', state: 'CA', zipCode: '93291', county: '' },
  { name: 'Kern County Library - Wasco', url: 'https://www.kerncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerncountylibrary.org/events', city: 'Wasco', state: 'CA', zipCode: '93280', county: '' },
  { name: 'Waterford Library', url: 'https://www.waterfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'CA', zipCode: '', county: '' },
  { name: 'Westminster Branch Library', url: 'https://www.westminsterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'CA', zipCode: '', county: '' },
  { name: 'Whittier Public Library', url: 'https://www.whittierlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whittierlibrary.org/events', city: 'Whittier', state: 'CA', zipCode: '90602', county: '' },
  { name: 'Windsor Regional Library', url: 'https://www.windsorlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'CA', zipCode: '95492', county: '' },
  { name: 'Yolo County Library', url: 'https://yolocountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://yolocountylibrary.org/', city: 'Woodland', state: 'CA', zipCode: '95695', county: '' },
  { name: 'Woodside Library', url: 'https://smcl.org/', platform: 'wordpress', eventsUrl: 'https://smcl.org/', city: 'Woodside', state: 'CA', zipCode: '', county: '' },
];

const SCRAPER_NAME = 'generic-CA';

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
            state: 'CA',
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
    state: 'CA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - CA (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressCACloudFunction() {
  console.log('☁️ Running WordPress CA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-CA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-CA', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressCACloudFunction };
