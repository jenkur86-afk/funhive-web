const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: TX
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Austin Public Library",
    "url": "https://library.austintexas.gov",
    "platform": "wordpress",
    "eventsUrl": "https://library.austintexas.gov/events"
  },
  {
    "name": "San Antonio Public Library",
    "url": "https://www.mysapl.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.mysapl.org/events"
  },
  {
    "name": "Fort Worth Public Library",
    "url": "https://fortworthtexas.gov/departments/library",
    "platform": "wordpress",
    "eventsUrl": "https://fortworthtexas.gov/departments/library/events"
  },
  {
    "name": "El Paso Public Library",
    "url": "https://www.elpasolibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://events.elpasotexas.gov"
  },
  {
    "name": "Harris County Public Library",
    "url": "https://www.hcpl.net",
    "platform": "wordpress",
    "eventsUrl": "https://attend.hcplc.org"
  }
]
 */

const LIBRARIES = [
  { name: 'Austin Public Library', url: 'https://library.austintexas.gov', platform: 'wordpress', eventsUrl: 'https://library.austintexas.gov/events', city: '', state: 'TX', zipCode: '', county: '' },
  { name: 'Fort Worth Public Library', url: 'https://fortworthtexas.gov/departments/library', platform: 'wordpress', eventsUrl: 'https://fortworthtexas.gov/departments/library/events', city: '', state: 'TX', zipCode: '', county: '' },
  { name: 'Harris County Public Library', url: 'https://www.hcpl.net', platform: 'wordpress', eventsUrl: 'https://attend.hcplc.org', city: '', state: 'TX', zipCode: '', county: '' },
  { name: 'Alamo Public Library', url: 'https://www.alamolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'TX', zipCode: '78516', county: '' },
  { name: 'Allen Public Library', url: 'https://www.allenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.allenlibrary.org/events', city: 'Allen', state: 'TX', zipCode: '75013', county: '' },
  { name: 'Alpine Public Library', url: 'https://www.alpinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alpinelibrary.org/events', city: 'Alpine', state: 'TX', zipCode: '79830', county: '' },
  { name: 'Alvarado Public Library', url: 'https://www.alvaradolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alvaradolibrary.org/events', city: 'Alvarado', state: 'TX', zipCode: '76009', county: '' },
  { name: 'Amarillo Public Library', url: 'https://www.amarillolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.amarillolibrary.org/events', city: 'Amarillo', state: 'TX', zipCode: '79101', county: '' },
  { name: 'Chambers County Library System', url: 'https://www.chamberscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chamberscountylibrary.org/events', city: 'Anahuac', state: 'TX', zipCode: '77514', county: '' },
  { name: 'Balch Springs Library-Learning Center', url: 'https://www.balchspringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.balchspringslibrary.org/events', city: 'Balch Springs', state: 'TX', zipCode: '75180', county: '' },
  { name: 'Bastrop Public Library', url: 'https://www.cityofbastrop.org/', platform: 'wordpress', eventsUrl: 'https://www.cityofbastrop.org/page/lib.home', city: 'Bastrop', state: 'TX', zipCode: '78602', county: '' },
  { name: 'Beaumont Public Library System', url: 'https://www.beaumontlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.beaumontlibrary.org/events', city: 'Beaumont', state: 'TX', zipCode: '77701', county: '' },
  { name: 'Jefferson County Library', url: 'https://www.jeffersoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffersoncountylibrary.org/events', city: 'Beaumont', state: 'TX', zipCode: '77705', county: '' },
  { name: 'Bedford Public Library', url: 'https://www.bedfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'TX', zipCode: '76021', county: '' },
  { name: 'Bee Cave Public Library', url: 'https://www.beecavelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.beecavelibrary.org/events', city: 'Bee Cave', state: 'TX', zipCode: '78738', county: '' },
  { name: 'Bellaire City Library', url: 'https://www.bellairelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.bellairelibrary.org/calendar', city: 'Bellaire', state: 'TX', zipCode: '77401', county: '' },
  { name: 'Benbrook Public Library', url: 'https://www.benbrooklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.benbrooklibrary.org/events', city: 'Benbrook', state: 'TX', zipCode: '76126', county: '' },
  { name: 'Boerne Public Library', url: 'https://www.boernelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.boernelibrary.org/events', city: 'Boerne', state: 'TX', zipCode: '78006', county: '' },
  { name: 'Bridgeport Public Library', url: 'https://www.bridgeportlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.bridgeportlibrary.org/calendar', city: 'Bridgeport', state: 'TX', zipCode: '76426', county: '' },
  { name: 'Buda Public Library', url: 'https://www.budalibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.budalibrary.org/', city: 'Buda', state: 'TX', zipCode: '78610', county: '' },
  { name: 'Buffalo Public Library', url: 'https://www.buffalolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.buffalolibrary.org/events', city: 'Buffalo', state: 'TX', zipCode: '75831', county: '' },
  { name: 'Bullard Community Library', url: 'https://www.bullardlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bullardlibrary.org/events', city: 'Bullard', state: 'TX', zipCode: '75757', county: '' },
  { name: 'Burkburnett Library', url: 'https://www.burkburnettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burkburnettlibrary.org/events', city: 'Burkburnett', state: 'TX', zipCode: '76354', county: '' },
  { name: 'Burnet County Library System', url: 'https://catalog.burnetcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://catalog.burnetcountylibrary.org/catalog/', city: 'Burnet', state: 'TX', zipCode: '78611', county: '' },
  { name: 'Cameron Public Library', url: 'https://www.cameronlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.cameronlibrary.org/calendar', city: 'Cameron', state: 'TX', zipCode: '76520', county: '' },
  { name: 'Camp Wood Public Library', url: 'https://www.campwoodlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.campwoodlibrary.org/', city: 'Camp Wood', state: 'TX', zipCode: '78833', county: '' },
  { name: 'Canyon Area Library', url: 'https://www.canyonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.canyonlibrary.org/events', city: 'Canyon', state: 'TX', zipCode: '79015', county: '' },
  { name: 'Sammy Brown Library', url: 'https://www.sammybrownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sammybrownlibrary.org/events', city: 'Carthage', state: 'TX', zipCode: '75633', county: '' },
  { name: 'Charlotte Public Library', url: 'https://charlottelibrary.org/', platform: 'wordpress', eventsUrl: 'https://charlottelibrary.org/calendar/', city: 'Charlotte', state: 'TX', zipCode: '78011', county: '' },
  { name: 'Chico Public Library Inc', url: 'https://www.chicolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.chicolibrary.org/calendar/', city: 'Chico', state: 'TX', zipCode: '76431', county: '' },
  { name: 'Clyde Public Library', url: 'https://www.clydelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.clydelibrary.org/', city: 'Clyde', state: 'TX', zipCode: '79510', county: '' },
  { name: 'Coleman Public Library', url: 'https://www.colemanlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.colemanlibrary.org/calendar', city: 'Coleman', state: 'TX', zipCode: '76834', county: '' },
  { name: 'Mitchell County Public Library', url: 'https://www.mitchellcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.mitchellcountylibrary.org/', city: 'Colorado City', state: 'TX', zipCode: '79512', county: '' },
  { name: 'Commerce Public Library', url: 'https://www.commercelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.commercelibrary.org/', city: 'Commerce', state: 'TX', zipCode: '75428', county: '' },
  { name: 'Crandall-Combine Community Library', url: 'https://www.crandalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crandalllibrary.org/events', city: 'Crandall', state: 'TX', zipCode: '75114', county: '' },
  { name: 'Crystal City Memorial Library', url: 'https://www.crystalcitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crystalcitylibrary.org/events', city: 'Crystal City', state: 'TX', zipCode: '78839', county: '' },
  { name: 'Jones Public Library', url: 'https://www.jonespubliclibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.jonespubliclibrary.org/', city: 'Dayton', state: 'TX', zipCode: '77535', county: '' },
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'TX', zipCode: '76234', county: '' },
  { name: 'Deer Park Public Library', url: 'https://www.deerparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'TX', zipCode: '77536', county: '' },
  { name: 'Denison Public Library', url: 'https://www.denisonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.denisonlibrary.org/events', city: 'Denison', state: 'TX', zipCode: '75020', county: '' },
  { name: 'Dickinson Public Library', url: 'https://www.dickinsonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dickinsonlibrary.org/events', city: 'Dickinson', state: 'TX', zipCode: '77539', county: '' },
  { name: 'Dilley Public Library', url: 'https://dilleylibrary.org/', platform: 'wordpress', eventsUrl: 'https://dilleylibrary.org/', city: 'Dilley', state: 'TX', zipCode: '78017', county: '' },
  { name: 'Rhoads Memorial Library', url: 'https://www.rhoadsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rhoadsmemoriallibrary.org/events', city: 'Dimmitt', state: 'TX', zipCode: '79027', county: '' },
  { name: 'Dublin Public Library', url: 'https://www.dublinlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.dublinlibrary.org/', city: 'Dublin', state: 'TX', zipCode: '76446', county: '' },
  { name: 'El Paso Public Library', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://events.elpasotexas.gov', city: 'El Paso', state: 'TX', zipCode: '79901', county: '' },
  { name: 'El Paso Public Library - Armijo Branch Library', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Clardy Fox', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Dorris Van Doren', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Esperanza Acosta Moreno', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Irving Schwartz', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Jenna Welch Laura Bush Community Library', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Jos Cisneros Cielo Vista', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Judge Marquez', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Memorial Park', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Richard Burges', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Westside', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Ysleta', url: 'https://www.elpasolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'Elgin Public Library', url: 'https://www.elginlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.elginlibrary.org/', city: 'Elgin', state: 'TX', zipCode: '78621', county: '' },
  { name: 'Fairfield Library', url: 'https://fairfieldlibrary.org/', platform: 'wordpress', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'TX', zipCode: '75840', county: '' },
  { name: 'Falls City Public Library', url: 'https://www.fallscitylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.fallscitylibrary.org/', city: 'Falls City', state: 'TX', zipCode: '78113', county: '' },
  { name: 'Farmers Branch Manske Public Library', url: 'https://www.farmersbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.farmersbranchlibrary.org/events', city: 'Farmers Branch', state: 'TX', zipCode: '75234', county: '' },
  { name: 'Florence Public Library', url: 'https://www.florencelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'TX', zipCode: '76527', county: '' },
  { name: 'Forest Hill Public Library', url: 'https://www.foresthilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.foresthilllibrary.org/events', city: 'Forest Hill', state: 'TX', zipCode: '76140', county: '' },
  { name: 'Jeff Davis County Library', url: 'https://www.jeffdaviscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffdaviscountylibrary.org/events', city: 'Fort Davis', state: 'TX', zipCode: '79734', county: '' },
  { name: 'Friona Public Library', url: 'https://www.frionalibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.frionalibrary.org/', city: 'Friona', state: 'TX', zipCode: '79035', county: '' },
  { name: 'Cooke County Library', url: 'https://www.cookecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cookecountylibrary.org/events', city: 'Gainesville', state: 'TX', zipCode: '76240', county: '' },
  { name: 'Library Of Graham', url: 'https://www.grahamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grahamlibrary.org/events', city: 'Graham', state: 'TX', zipCode: '76450', county: '' },
  { name: 'Hood County Public Library', url: 'https://www.hoodcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.hoodcountylibrary.org/', city: 'Granbury', state: 'TX', zipCode: '76048', county: '' },
  { name: 'Grand Prairie Public Library System', url: 'https://www.grandprairielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandprairielibrary.org/events', city: 'Grand Prairie', state: 'TX', zipCode: '75051', county: '' },
  { name: 'Grandview Public Library', url: 'https://www.grandviewlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.grandviewlibrary.org/', city: 'Grandview', state: 'TX', zipCode: '76050', county: '' },
  { name: 'Groves Public Library', url: 'https://www.groveslibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.groveslibrary.org/', city: 'Groves', state: 'TX', zipCode: '77619', county: '' },
  { name: 'Hamilton Public Library', url: 'https://hamiltonlibrary.org/', platform: 'wordpress', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'TX', zipCode: '76531', county: '' },
  { name: 'Harlingen Public Library', url: 'https://www.harlingenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harlingenlibrary.org/events', city: 'Harlingen', state: 'TX', zipCode: '78550', county: '' },
  { name: 'Deaf Smith County Library', url: 'https://www.deafsmithcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deafsmithcountylibrary.org/events', city: 'Hereford', state: 'TX', zipCode: '79045', county: '' },
  { name: 'Higgins Public Library', url: 'https://www.higginslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.higginslibrary.org/events', city: 'Higgins', state: 'TX', zipCode: '79046', county: '' },
  { name: 'Hillsboro City Library', url: 'https://www.hillsborolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'TX', zipCode: '76645', county: '' },
  { name: 'Howe Community Library', url: 'https://thehowe.org/', platform: 'wordpress', eventsUrl: 'https://thehowe.org/howe-corporation/events/', city: 'Howe', state: 'TX', zipCode: '75459', county: '' },
  { name: 'Imperial Public Library', url: 'https://www.imperiallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.imperiallibrary.org/events', city: 'Imperial', state: 'TX', zipCode: '79743', county: '' },
  { name: 'Irving Public Library', url: 'https://www.irvinglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.irvinglibrary.org/events', city: 'Irving', state: 'TX', zipCode: '75060', county: '' },
  { name: 'Kent County Library', url: 'https://www.kentcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.kentcountylibrary.org/programs-and-events/calendar/', city: 'Jayton', state: 'TX', zipCode: '79528', county: '' },
  { name: 'Johnson City Library', url: 'https://www.johnsoncitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.johnsoncitylibrary.org/events', city: 'Johnson City', state: 'TX', zipCode: '78636', county: '' },
  { name: 'Joshua School Public Library', url: 'https://www.joshualibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.joshualibrary.org/', city: 'Joshua', state: 'TX', zipCode: '76058', county: '' },
  { name: 'Kimble County Library', url: 'https://www.kimblecountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.kimblecountylibrary.org/', city: 'Junction', state: 'TX', zipCode: '76849', county: '' },
  { name: 'Keller Public Library', url: 'https://www.kellerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kellerlibrary.org/events', city: 'Keller', state: 'TX', zipCode: '76248', county: '' },
  { name: 'Kendalia Public Library', url: 'https://kendalialibrary.org/', platform: 'wordpress', eventsUrl: 'https://kendalialibrary.org/', city: 'Kendalia', state: 'TX', zipCode: '78027', county: '' },
  { name: 'Kennedale Public Library', url: 'https://www.cityofkennedale.com/', platform: 'wordpress', eventsUrl: 'https://www.cityofkennedale.com/412/Library', city: 'Kennedale', state: 'TX', zipCode: '76060', county: '' },
  { name: 'Kerens Library', url: 'https://www.kerenslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerenslibrary.org/events', city: 'Kerens', state: 'TX', zipCode: '75144', county: '' },
  { name: 'Kilgore Public Library', url: 'https://www.cityofkilgore.com/', platform: 'wordpress', eventsUrl: 'https://www.cityofkilgore.com/528/Library', city: 'Kilgore', state: 'TX', zipCode: '75662', county: '' },
  { name: 'Kirbyville Public Library', url: 'https://kirbyville.ploud.net/', platform: 'wordpress', eventsUrl: 'https://kirbyville.ploud.net/', city: 'Kirbyville', state: 'TX', zipCode: '75956', county: '' },
  { name: 'Kountze Public Library', url: 'https://www.kountzelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.kountzelibrary.org/', city: 'Kountze', state: 'TX', zipCode: '77625', county: '' },
  { name: 'Krum Public Library', url: 'https://www.krumlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.krumlibrary.org/', city: 'Krum', state: 'TX', zipCode: '76249', county: '' },
  { name: 'La Marque Public Library', url: 'https://www.lamarquelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lamarquelibrary.org/events', city: 'La Marque', state: 'TX', zipCode: '77568', county: '' },
  { name: 'Lakehills Area Library', url: 'https://www.lakehillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakehillslibrary.org/events', city: 'Lakehills', state: 'TX', zipCode: '78063', county: '' },
  { name: 'Lancaster Veterans Memorial Library', url: 'https://www.lancasterlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'TX', zipCode: '75134', county: '' },
  { name: 'Laredo Public Library', url: 'https://www.laredolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.laredolibrary.org/events-calendar/', city: 'Laredo', state: 'TX', zipCode: '78041', county: '' },
  { name: 'Laredo Public Library - Bruni Plaza Branch', url: 'https://www.laredolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.laredolibrary.org/events-calendar/', city: 'Laredo', state: 'TX', zipCode: '78040', county: '' },
  { name: 'Laredo Public Library - Santo Nino Branch', url: 'https://www.laredolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.laredolibrary.org/events-calendar/', city: 'Laredo', state: 'TX', zipCode: '78043', county: '' },
  { name: 'Helen Hall Library', url: 'https://www.helenhalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.helenhalllibrary.org/events', city: 'League City', state: 'TX', zipCode: '77573', county: '' },
  { name: 'Liberty Municipal Library', url: 'https://libertylibrary.org/', platform: 'wordpress', eventsUrl: 'https://libertylibrary.org/', city: 'Liberty', state: 'TX', zipCode: '77575', county: '' },
  { name: 'Little Elm Public Library', url: 'https://www.littleelm.gov/', platform: 'wordpress', eventsUrl: 'https://www.littleelm.gov/1561/Events-Calendar', city: 'Little Elm', state: 'TX', zipCode: '75068', county: '' },
  { name: 'Llano County Library System', url: 'https://www.llanocountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.llanocountylibrary.org/events', city: 'Llano', state: 'TX', zipCode: '78643', county: '' },
  { name: 'Longview Public Library', url: 'https://www.longviewlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.longviewlibrary.org/786/Events', city: 'Longview', state: 'TX', zipCode: '75601', county: '' },
  { name: 'Tri-County Library', url: 'https://www.tricountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.tricountylibrary.org/EVENTS', city: 'Mabank', state: 'TX', zipCode: '75147', county: '' },
  { name: 'Madison County Library', url: 'https://www.madisoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.madisoncountylibrary.org/events', city: 'Madisonville', state: 'TX', zipCode: '77864', county: '' },
  { name: 'Mansfield Public Library', url: 'https://www.mansfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'TX', zipCode: '76063', county: '' },
  { name: 'Marion Community Library', url: 'https://www.marionlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'TX', zipCode: '78124', county: '' },
  { name: 'Marshall Public Library', url: 'https://www.marshalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'TX', zipCode: '75670', county: '' },
  { name: 'Memphis Public Library', url: 'https://www.memphislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.memphislibrary.org/events', city: 'Memphis', state: 'TX', zipCode: '79245', county: '' },
  { name: 'Meridian Public Library', url: 'https://www.meridianlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.meridianlibrary.org/events', city: 'Meridian', state: 'TX', zipCode: '76665', county: '' },
  { name: 'Moody Community Library', url: 'https://moodylibrary.org/', platform: 'wordpress', eventsUrl: 'https://moodylibrary.org/calendar', city: 'Moody', state: 'TX', zipCode: '76557', county: '' },
  { name: 'Mount Pleasant Public Library', url: 'https://www.mountpleasantpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mountpleasantpubliclibrary.org/events', city: 'Mt Pleasant', state: 'TX', zipCode: '75455', county: '' },
  { name: 'Franklin County Library', url: 'https://www.franklincountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.franklincountylibrary.org/index.html', city: 'Mt Vernon', state: 'TX', zipCode: '75457', county: '' },
  { name: 'Muenster Public Library', url: 'https://www.muensterlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.muensterlibrary.org/', city: 'Muenster', state: 'TX', zipCode: '76252', county: '' },
  { name: 'Naples Public Library', url: 'https://www.napleslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'TX', zipCode: '75568', county: '' },
  { name: 'Newark Public Library', url: 'https://newarklibrary.org/', platform: 'wordpress', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'TX', zipCode: '76071', county: '' },
  { name: 'Newton County Public Library', url: 'https://www.newtoncountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.newtoncountylibrary.org/', city: 'Newton', state: 'TX', zipCode: '75966', county: '' },
  { name: 'Aphne Pattillo Nixon Public Library', url: 'https://www.nixonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nixonlibrary.org/events', city: 'Nixon', state: 'TX', zipCode: '78140', county: '' },
  { name: 'The Aphne Pattillo Nixon Public Library', url: 'https://www.nixonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nixonlibrary.org/events', city: 'Nixon', state: 'TX', zipCode: '78140', county: '' },
  { name: 'Ector County Library', url: 'https://www.ectorcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ectorcountylibrary.org/events', city: 'Odessa', state: 'TX', zipCode: '79761', county: '' },
  { name: 'Olney Community Library And Arts Center', url: 'https://www.olneylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.olneylibrary.org/events', city: 'Olney', state: 'TX', zipCode: '76374', county: '' },
  { name: 'Palacios Library Inc', url: 'https://www.palacioslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palacioslibrary.org/events', city: 'Palacios', state: 'TX', zipCode: '77465', county: '' },
  { name: 'Carson County Public Library', url: 'https://www.carsoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carsoncountylibrary.org/events', city: 'Panhandle', state: 'TX', zipCode: '79068', county: '' },
  { name: 'Pasadena Public Library', url: 'https://www.pasadenalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pasadenalibrary.org/events', city: 'Pasadena', state: 'TX', zipCode: '77506', county: '' },
  { name: 'Pilot Point Community Library', url: 'https://www.pilotpointlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pilotpointlibrary.org/events', city: 'Pilot Point', state: 'TX', zipCode: '76258', county: '' },
  { name: 'Pleasanton Public Library', url: 'https://www.pleasantonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pleasantonlibrary.org/events', city: 'Pleasanton', state: 'TX', zipCode: '78064', county: '' },
  { name: 'Calhoun County Public Library - Point Comfort Branch Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Point Comfort', state: 'TX', zipCode: '77987', county: '' },
  { name: 'Calhoun County Public Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Port Lavaca', state: 'TX', zipCode: '77979', county: '' },
  { name: 'Calhoun County Public Library - Port Oconnor Branch Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Port Oconnor', state: 'TX', zipCode: '77982', county: '' },
  { name: 'Calhoun County Public Library - Seadrift Branch Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Port Oconnor', state: 'TX', zipCode: '77983', county: '' },
  { name: 'Pottsboro Area Public Library', url: 'https://pottsborolibrary.com/', platform: 'wordpress', eventsUrl: 'https://pottsborolibrary.com/library-foundation', city: 'Pottsboro', state: 'TX', zipCode: '75076', county: '' },
  { name: 'Princeton Community Library', url: 'https://www.princetonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'TX', zipCode: '75407', county: '' },
  { name: 'Quitman Public Library', url: 'https://www.quitmanlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.quitmanlibrary.org/', city: 'Quitman', state: 'TX', zipCode: '75783', county: '' },
  { name: 'Rhome Public Library', url: 'https://www.rhomelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.rhomelibrary.org/news-events/events', city: 'Rhome', state: 'TX', zipCode: '76078', county: '' },
  { name: 'River Oaks Public Library', url: 'https://www.riveroakslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riveroakslibrary.org/events', city: 'River Oaks', state: 'TX', zipCode: '76114', county: '' },
  { name: 'Rockwall County Library', url: 'https://www.rockwallcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rockwallcountylibrary.org/events', city: 'Rockwall', state: 'TX', zipCode: '75087', county: '' },
  { name: 'Salado Public Library District', url: 'https://www.saladolibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.saladolibrary.org/library-events', city: 'Salado', state: 'TX', zipCode: '76571', county: '' },
  { name: 'San Antonio Public Library', url: 'https://www.mysapl.org', platform: 'wordpress', eventsUrl: 'https://www.mysapl.org/events', city: 'San Antonio', state: 'TX', zipCode: '78205', county: '' },
  { name: 'Sanger Public Library', url: 'https://www.sangerlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.sangerlibrary.org/', city: 'Sanger', state: 'TX', zipCode: '76266', county: '' },
  { name: 'Mae S Bruce Library', url: 'https://www.maesbrucelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maesbrucelibrary.org/events', city: 'Santa Fe', state: 'TX', zipCode: '77510', county: '' },
  { name: 'Schertz Public Library', url: 'https://schertz.com/', platform: 'wordpress', eventsUrl: 'https://schertz.com/2184/Library', city: 'Schertz', state: 'TX', zipCode: '78154', county: '' },
  { name: 'Schulenburg Public Library', url: 'https://www.schulenburglibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.schulenburglibrary.org/', city: 'Schulenburg', state: 'TX', zipCode: '78956', county: '' },
  { name: 'Seagoville Public Library', url: 'https://seagoville.ploud.net/', platform: 'wordpress', eventsUrl: 'https://seagoville.ploud.net/', city: 'Seagoville', state: 'TX', zipCode: '75159', county: '' },
  { name: 'Gaines County Library', url: 'https://www.gainescountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.gainescountylibrary.org/', city: 'Seminole', state: 'TX', zipCode: '79360', county: '' },
  { name: 'Baylor County Free Library', url: 'https://www.baylorcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.baylorcountylibrary.org/events', city: 'Seymour', state: 'TX', zipCode: '76380', county: '' },
  { name: 'Shepherd Public Library', url: 'https://www.shepherdlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shepherdlibrary.org/events', city: 'Shepherd', state: 'TX', zipCode: '77371', county: '' },
  { name: 'Sherman Public Library', url: 'https://www.shermanlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'TX', zipCode: '75090', county: '' },
  { name: 'Silsbee Public Library', url: 'https://www.silsbeelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.silsbeelibrary.org/events', city: 'Silsbee', state: 'TX', zipCode: '77656', county: '' },
  { name: 'Scurry County Library', url: 'https://www.scurrycountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.scurrycountylibrary.org/', city: 'Snyder', state: 'TX', zipCode: '79549', county: '' },
  { name: 'Southlake Public Library', url: 'https://www.southlakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southlakelibrary.org/events', city: 'Southlake', state: 'TX', zipCode: '76092', county: '' },
  { name: 'Hansford County Library', url: 'https://www.hansfordcountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.hansfordcountylibrary.org/', city: 'Spearman', state: 'TX', zipCode: '79081', county: '' },
  { name: 'Springlake-Earth Community Library', url: 'https://www.springlakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Springlake', state: 'TX', zipCode: '79082', county: '' },
  { name: 'Springtown Public Library', url: 'https://www.springtownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.springtownlibrary.org/events', city: 'Springtown', state: 'TX', zipCode: '76082', county: '' },
  { name: 'Stamford Carnegie Library', url: 'https://www.stamfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'TX', zipCode: '79553', county: '' },
  { name: 'Martin County Library', url: 'https://www.martincountylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.martincountylibrary.org/index.php/events', city: 'Stanton', state: 'TX', zipCode: '79782', county: '' },
  { name: 'Sherman County Public Library', url: 'https://sherman.harringtonlc.org/', platform: 'wordpress', eventsUrl: 'https://sherman.harringtonlc.org/', city: 'Stratford', state: 'TX', zipCode: '79084', county: '' },
  { name: 'Sunnyvale Public Library', url: 'https://www.sunnyvalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sunnyvalelibrary.org/events', city: 'Sunnyvale', state: 'TX', zipCode: '75182', county: '' },
  { name: 'Taylor Public Library', url: 'https://www.taylorlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.taylorlibrary.org/events', city: 'Taylor', state: 'TX', zipCode: '76574', county: '' },
  { name: 'Teague Public Library', url: 'https://www.teaguelibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.teaguelibrary.org/', city: 'Teague', state: 'TX', zipCode: '75860', county: '' },
  { name: 'Temple Public Library', url: 'https://www.templelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.templelibrary.org/events', city: 'Temple', state: 'TX', zipCode: '76501', county: '' },
  { name: 'Cameron-J Jarvis Troup Municipal Library', url: 'https://trouplibrary.org/', platform: 'wordpress', eventsUrl: 'https://trouplibrary.org/', city: 'Troup', state: 'TX', zipCode: '75789', county: '' },
  { name: 'Tyler Public Library', url: 'https://www.tylerlibrary.com/', platform: 'wordpress', eventsUrl: 'https://www.tylerlibrary.com/Home', city: 'Tyler', state: 'TX', zipCode: '75702', county: '' },
  { name: 'Valley Mills Public Library', url: 'https://www.valleymillslibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.valleymillslibrary.org/', city: 'Valley Mills', state: 'TX', zipCode: '76689', county: '' },
  { name: 'Wheeler Public Library', url: 'https://www.wheelerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wheelerlibrary.org/events', city: 'Wheeler', state: 'TX', zipCode: '79096', county: '' },
  { name: 'White Oak School Community Library', url: 'https://www.whiteoaklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whiteoaklibrary.org/events', city: 'White Oak', state: 'TX', zipCode: '75693', county: '' },
  { name: 'Whitesboro Public Library', url: 'https://whitesborolibrary.org/', platform: 'wordpress', eventsUrl: 'https://whitesborolibrary.org/', city: 'Whitesboro', state: 'TX', zipCode: '76273', county: '' },
  { name: 'Lake Whitney Library', url: 'https://www.whitneylibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.whitneylibrary.org/', city: 'Whitney', state: 'TX', zipCode: '76692', county: '' },
  { name: 'Wildwood Civic Library', url: 'https://www.wildwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wildwoodlibrary.org/events', city: 'Wildwood', state: 'TX', zipCode: '77663', county: '' },
  { name: 'Wimberley Village Library', url: 'https://www.wimberleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wimberleylibrary.org/events', city: 'Wimberley', state: 'TX', zipCode: '78676', county: '' },
  { name: 'City Of Wolfforth Library', url: 'https://www.wolfforthlibrary.org/', platform: 'wordpress', eventsUrl: 'https://www.wolfforthlibrary.org/', city: 'Wolfforth', state: 'TX', zipCode: '79382', county: '' },
  { name: 'Yorktown Public Library', url: 'https://yorktownlibrary.org/', platform: 'wordpress', eventsUrl: 'https://yorktownlibrary.org/', city: 'Yorktown', state: 'TX', zipCode: '78164', county: '' },
];

const SCRAPER_NAME = 'generic-TX';

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
            state: 'TX',
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
    state: 'TX',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - TX (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressTXCloudFunction() {
  console.log('☁️ Running WordPress TX as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-TX', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-TX', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressTXCloudFunction };
