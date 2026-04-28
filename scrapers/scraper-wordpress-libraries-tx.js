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
  { name: 'Abernathy Public Library', url: 'https://www.abernathylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.abernathylibrary.org/events', city: 'Abernathy', state: 'TX', zipCode: '79311', county: '' },
  { name: 'Abilene Library Consortium', url: 'https://www.abilenelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.abilenelibrary.org/events', city: 'Abilene', state: 'TX', zipCode: '79603', county: '' },
  { name: 'Abilene Public Library', url: 'https://www.abilenelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.abilenelibrary.org/events', city: 'Abilene', state: 'TX', zipCode: '79601', county: '' },
  { name: 'Big Country Library System', url: 'https://www.bigcountrylibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.bigcountrylibrarysystem.org/events', city: 'Abilene', state: 'TX', zipCode: '79601', county: '' },
  { name: 'Alamo Public Library', url: 'https://www.alamolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'TX', zipCode: '78516', county: '' },
  { name: 'Fernando De La Rosa Memorial Library', url: 'https://www.fernandodelarosamemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fernandodelarosamemoriallibrary.org/events', city: 'Alamo', state: 'TX', zipCode: '78516', county: '' },
  { name: 'Sergeant Fernando De La Rosa Memorial Library', url: 'https://www.sergeantfernandodelarosamemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sergeantfernandodelarosamemoriallibrary.org/events', city: 'Alamo', state: 'TX', zipCode: '78516', county: '' },
  { name: 'Shackelford County Library', url: 'https://www.shackelfordcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shackelfordcountylibrary.org/events', city: 'Albany', state: 'TX', zipCode: '76430', county: '' },
  { name: 'East Parker County Library', url: 'https://www.eastparkercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastparkercountylibrary.org/events', city: 'Aledo', state: 'TX', zipCode: '76008', county: '' },
  { name: 'Alice Public Library', url: 'https://www.alicelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alicelibrary.org/events', city: 'Alice', state: 'TX', zipCode: '78332', county: '' },
  { name: 'Allen Public Library', url: 'https://www.allenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.allenlibrary.org/events', city: 'Allen', state: 'TX', zipCode: '75013', county: '' },
  { name: 'Alpine Public Library', url: 'https://www.alpinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alpinelibrary.org/events', city: 'Alpine', state: 'TX', zipCode: '79830', county: '' },
  { name: 'Stella Hill Memorial Library', url: 'https://www.stellahillmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stellahillmemoriallibrary.org/events', city: 'Alto', state: 'TX', zipCode: '75925', county: '' },
  { name: 'Alvarado Public Library', url: 'https://www.alvaradolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alvaradolibrary.org/events', city: 'Alvarado', state: 'TX', zipCode: '76009', county: '' },
  { name: 'Alvord Public Library', url: 'https://www.alvordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alvordlibrary.org/events', city: 'Alvord', state: 'TX', zipCode: '76225', county: '' },
  { name: 'Amarillo Public Library', url: 'https://www.amarillolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.amarillolibrary.org/events', city: 'Amarillo', state: 'TX', zipCode: '79101', county: '' },
  { name: 'Harrington Library Consortium', url: 'https://www.harringtonlibraryconsortium.org', platform: 'wordpress', eventsUrl: 'https://www.harringtonlibraryconsortium.org/events', city: 'Amarillo', state: 'TX', zipCode: '79189', county: '' },
  { name: 'Chambers County Library System', url: 'https://www.chamberscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chamberscountylibrary.org/events', city: 'Anahuac', state: 'TX', zipCode: '77514', county: '' },
  { name: 'Andrews County Library', url: 'https://www.andrewscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.andrewscountylibrary.org/events', city: 'Andrews', state: 'TX', zipCode: '79714', county: '' },
  { name: 'Brazoria County Library System', url: 'https://www.brazoriacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brazoriacountylibrary.org/events', city: 'Angleton', state: 'TX', zipCode: '77515', county: '' },
  { name: 'Anson Public Library', url: 'https://www.ansonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ansonlibrary.org/events', city: 'Anson', state: 'TX', zipCode: '79501', county: '' },
  { name: 'Ed And Hazel Richmond Public Library', url: 'https://www.edandhazelrichmondpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edandhazelrichmondpubliclibrary.org/events', city: 'Aransas Pass', state: 'TX', zipCode: '78336', county: '' },
  { name: 'Archer Public Library', url: 'https://www.archerpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.archerpubliclibrary.org/events', city: 'Archer City', state: 'TX', zipCode: '76351', county: '' },
  { name: 'Stonewall County Library', url: 'https://www.stonewallcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stonewallcountylibrary.org/events', city: 'Aspermont', state: 'TX', zipCode: '79502', county: '' },
  { name: 'Henderson Cnty Clint W Murchison Memorial Library', url: 'https://www.hendersoncntyclintwmurchisonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hendersoncntyclintwmurchisonmemoriallibrary.org/events', city: 'Athens', state: 'TX', zipCode: '75751', county: '' },
  { name: 'Atlanta Public Library', url: 'https://www.atlantalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.atlantalibrary.org/events', city: 'Atlanta', state: 'TX', zipCode: '75551', county: '' },
  { name: 'Aubrey Area Library', url: 'https://www.aubreylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.aubreylibrary.org/events', city: 'Aubrey', state: 'TX', zipCode: '76227', county: '' },
  { name: 'Azle Memorial Library', url: 'https://www.azlelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.azlelibrary.org/events', city: 'Azle', state: 'TX', zipCode: '76020', county: '' },
  { name: 'Callahan County Library', url: 'https://www.callahancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.callahancountylibrary.org/events', city: 'Baird', state: 'TX', zipCode: '79504', county: '' },
  { name: 'Balch Springs Library-Learning Center', url: 'https://www.balchspringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.balchspringslibrary.org/events', city: 'Balch Springs', state: 'TX', zipCode: '75180', county: '' },
  { name: 'Carnegie Library Of Ballinger', url: 'https://www.ballingerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ballingerlibrary.org/events', city: 'Ballinger', state: 'TX', zipCode: '76821', county: '' },
  { name: 'Bandera County Library', url: 'https://www.banderacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.banderacountylibrary.org/events', city: 'Bandera', state: 'TX', zipCode: '78003', county: '' },
  { name: 'Kronkosky Library Of Bandera County', url: 'https://www.kronkoskylibraryofbanderacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kronkoskylibraryofbanderacountylibrary.org/events', city: 'Bandera', state: 'TX', zipCode: '78003', county: '' },
  { name: 'Teinert Memorial Public Library', url: 'https://www.teinertmemorialpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.teinertmemorialpubliclibrary.org/events', city: 'Bartlett', state: 'TX', zipCode: '76511', county: '' },
  { name: 'Bastrop Public Library', url: 'https://www.bastroplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bastroplibrary.org/events', city: 'Bastrop', state: 'TX', zipCode: '78602', county: '' },
  { name: 'Bay City Public Library', url: 'https://www.baycitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.baycitylibrary.org/events', city: 'Bay City', state: 'TX', zipCode: '77414', county: '' },
  { name: 'Sterling Municipal Library', url: 'https://www.sterlingmunicipallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sterlingmunicipallibrary.org/events', city: 'Baytown', state: 'TX', zipCode: '77520', county: '' },
  { name: 'Beaumont Public Library System', url: 'https://www.beaumontlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.beaumontlibrary.org/events', city: 'Beaumont', state: 'TX', zipCode: '77701', county: '' },
  { name: 'Jefferson County Library', url: 'https://www.jeffersoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffersoncountylibrary.org/events', city: 'Beaumont', state: 'TX', zipCode: '77705', county: '' },
  { name: 'Bedford Public Library', url: 'https://www.bedfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'TX', zipCode: '76021', county: '' },
  { name: 'Bee Cave Public Library', url: 'https://www.beecavelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.beecavelibrary.org/events', city: 'Bee Cave', state: 'TX', zipCode: '78738', county: '' },
  { name: 'Joe Barnhart Bee County Library', url: 'https://www.joebarnhartbeecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.joebarnhartbeecountylibrary.org/events', city: 'Beeville', state: 'TX', zipCode: '78102', county: '' },
  { name: 'Bellaire City Library', url: 'https://www.bellairelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bellairelibrary.org/events', city: 'Bellaire', state: 'TX', zipCode: '77401', county: '' },
  { name: 'Bellville Public Library', url: 'https://www.bellvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bellvillelibrary.org/events', city: 'Bellville', state: 'TX', zipCode: '77418', county: '' },
  { name: 'Lena Armstrong Public Library', url: 'https://www.lenaarmstrongpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lenaarmstrongpubliclibrary.org/events', city: 'Belton', state: 'TX', zipCode: '76513', county: '' },
  { name: 'Duval County Public Library - Benavides Branch', url: 'https://www.duvalcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.duvalcountylibrary.org/events', city: 'Benavides', state: 'TX', zipCode: '78341', county: '' },
  { name: 'Benbrook Public Library', url: 'https://www.benbrooklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.benbrooklibrary.org/events', city: 'Benbrook', state: 'TX', zipCode: '76126', county: '' },
  { name: 'Reagan County Library', url: 'https://www.reagancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.reagancountylibrary.org/events', city: 'Big Lake', state: 'TX', zipCode: '76932', county: '' },
  { name: 'Howard County Library', url: 'https://www.howardcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.howardcountylibrary.org/events', city: 'Big Spring', state: 'TX', zipCode: '79720', county: '' },
  { name: 'Bishop Public Library', url: 'https://www.bishoplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bishoplibrary.org/events', city: 'Bishop', state: 'TX', zipCode: '78343', county: '' },
  { name: 'Blanco County South Library District', url: 'https://www.blancocountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.blancocountylibrary.org/events', city: 'Blanco', state: 'TX', zipCode: '78606', county: '' },
  { name: 'Blooming Grove Community Library', url: 'https://www.bloominggrovelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bloominggrovelibrary.org/events', city: 'Blooming Grove', state: 'TX', zipCode: '76626', county: '' },
  { name: 'Boerne Public Library', url: 'https://www.boernelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.boernelibrary.org/events', city: 'Boerne', state: 'TX', zipCode: '78006', county: '' },
  { name: 'Bonham Public Library', url: 'https://www.bonhamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bonhamlibrary.org/events', city: 'Bonham', state: 'TX', zipCode: '75418', county: '' },
  { name: 'Booker School-Public Library', url: 'https://www.bookerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bookerlibrary.org/events', city: 'Booker', state: 'TX', zipCode: '79005', county: '' },
  { name: 'Hutchinson County Library', url: 'https://www.hutchinsoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hutchinsoncountylibrary.org/events', city: 'Borger', state: 'TX', zipCode: '79007', county: '' },
  { name: 'Bowie Public Library', url: 'https://www.bowielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bowielibrary.org/events', city: 'Bowie', state: 'TX', zipCode: '76230', county: '' },
  { name: 'Boyd Public Library', url: 'https://www.boydlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.boydlibrary.org/events', city: 'Boyd', state: 'TX', zipCode: '76023', county: '' },
  { name: 'Kinney County Public Library', url: 'https://www.kinneycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kinneycountylibrary.org/events', city: 'Brackettville', state: 'TX', zipCode: '78832', county: '' },
  { name: 'Fm Buck Richards Memorial Library', url: 'https://www.fmbuckrichardsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fmbuckrichardsmemoriallibrary.org/events', city: 'Brady', state: 'TX', zipCode: '76825', county: '' },
  { name: 'Breckenridge Library', url: 'https://www.breckenridgelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.breckenridgelibrary.org/events', city: 'Breckenridge', state: 'TX', zipCode: '76424', county: '' },
  { name: 'Bremond Public Library', url: 'https://www.bremondlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bremondlibrary.org/events', city: 'Bremond', state: 'TX', zipCode: '76629', county: '' },
  { name: 'Nancy Carol Roberts Memorial Library', url: 'https://www.nancycarolrobertsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nancycarolrobertsmemoriallibrary.org/events', city: 'Brenham', state: 'TX', zipCode: '77833', county: '' },
  { name: 'Bridge City Public Library', url: 'https://www.bridgecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bridgecitylibrary.org/events', city: 'Bridge City', state: 'TX', zipCode: '77611', county: '' },
  { name: 'Bridgeport Public Library', url: 'https://www.bridgeportlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bridgeportlibrary.org/events', city: 'Bridgeport', state: 'TX', zipCode: '76426', county: '' },
  { name: 'Kendrick Memorial Library', url: 'https://www.kendrickmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kendrickmemoriallibrary.org/events', city: 'Brownfield', state: 'TX', zipCode: '79316', county: '' },
  { name: 'Brownsville Public Library - Southmost Branch Library', url: 'https://www.brownsvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brownsvillelibrary.org/events', city: 'Brownsville', state: 'TX', zipCode: '78522', county: '' },
  { name: 'Brownsville Public Library System', url: 'https://www.brownsvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brownsvillelibrary.org/events', city: 'Brownsville', state: 'TX', zipCode: '78520', county: '' },
  { name: 'Brownwood Public Library', url: 'https://www.brownwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brownwoodlibrary.org/events', city: 'Brownwood', state: 'TX', zipCode: '76801', county: '' },
  { name: 'Bryancollege Station Public Library System', url: 'https://www.bryanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bryanlibrary.org/events', city: 'Bryan', state: 'TX', zipCode: '77803', county: '' },
  { name: 'Buda Public Library', url: 'https://www.budalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.budalibrary.org/events', city: 'Buda', state: 'TX', zipCode: '78610', county: '' },
  { name: 'Buffalo Public Library', url: 'https://www.buffalolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.buffalolibrary.org/events', city: 'Buffalo', state: 'TX', zipCode: '75831', county: '' },
  { name: 'Bullard Community Library', url: 'https://www.bullardlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bullardlibrary.org/events', city: 'Bullard', state: 'TX', zipCode: '75757', county: '' },
  { name: 'Bulverde-Spring Branch Library', url: 'https://www.bulverdelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bulverdelibrary.org/events', city: 'Bulverde', state: 'TX', zipCode: '78163', county: '' },
  { name: 'Buna Public Library', url: 'https://www.bunalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bunalibrary.org/events', city: 'Buna', state: 'TX', zipCode: '77612', county: '' },
  { name: 'Burkburnett Library', url: 'https://www.burkburnettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burkburnettlibrary.org/events', city: 'Burkburnett', state: 'TX', zipCode: '76354', county: '' },
  { name: 'Burleson Public Library', url: 'https://www.burlesonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burlesonlibrary.org/events', city: 'Burleson', state: 'TX', zipCode: '76028', county: '' },
  { name: 'Burnet County Library System', url: 'https://www.burnetcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burnetcountylibrary.org/events', city: 'Burnet', state: 'TX', zipCode: '78611', county: '' },
  { name: 'Harrie P Woodson Memorial Library', url: 'https://www.harriepwoodsonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harriepwoodsonmemoriallibrary.org/events', city: 'Caldwell', state: 'TX', zipCode: '77836', county: '' },
  { name: 'Cameron Public Library', url: 'https://www.cameronlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cameronlibrary.org/events', city: 'Cameron', state: 'TX', zipCode: '76520', county: '' },
  { name: 'Camp Wood Public Library', url: 'https://www.campwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.campwoodlibrary.org/events', city: 'Camp Wood', state: 'TX', zipCode: '78833', county: '' },
  { name: 'Hemphill County Library', url: 'https://www.hemphillcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hemphillcountylibrary.org/events', city: 'Canadian', state: 'TX', zipCode: '79014', county: '' },
  { name: 'Van Zandt County Library', url: 'https://www.vanzandtcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vanzandtcountylibrary.org/events', city: 'Canton', state: 'TX', zipCode: '75103', county: '' },
  { name: 'Canyon Area Library', url: 'https://www.canyonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.canyonlibrary.org/events', city: 'Canyon', state: 'TX', zipCode: '79015', county: '' },
  { name: 'Tye Preston Memorial Library', url: 'https://www.tyeprestonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tyeprestonmemoriallibrary.org/events', city: 'Canyon Lake', state: 'TX', zipCode: '78133', county: '' },
  { name: 'Dimmit County Public Library', url: 'https://www.dimmitcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dimmitcountylibrary.org/events', city: 'Carrizo Springs', state: 'TX', zipCode: '78834', county: '' },
  { name: 'Carrollton Public Library', url: 'https://www.carrolltonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carrolltonlibrary.org/events', city: 'Carrollton', state: 'TX', zipCode: '75006', county: '' },
  { name: 'Sammy Brown Library', url: 'https://www.sammybrownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sammybrownlibrary.org/events', city: 'Carthage', state: 'TX', zipCode: '75633', county: '' },
  { name: 'Castroville Public Library', url: 'https://www.castrovillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.castrovillelibrary.org/events', city: 'Castroville', state: 'TX', zipCode: '78009', county: '' },
  { name: 'Zula Bryant Wylie Library', url: 'https://www.zulabryantwylielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.zulabryantwylielibrary.org/events', city: 'Cedar Hill', state: 'TX', zipCode: '75104', county: '' },
  { name: 'Cedar Park Public Library', url: 'https://www.cedarparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cedarparklibrary.org/events', city: 'Cedar Park', state: 'TX', zipCode: '78613', county: '' },
  { name: 'Celina Public Library', url: 'https://www.celinalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.celinalibrary.org/events', city: 'Celina', state: 'TX', zipCode: '75009', county: '' },
  { name: 'Fannie Brown Booth Memorial Library', url: 'https://www.fanniebrownboothmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fanniebrownboothmemoriallibrary.org/events', city: 'Center', state: 'TX', zipCode: '75935', county: '' },
  { name: 'Elmer P Jewel Ward Memorial Library', url: 'https://www.elmerpjewelwardmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elmerpjewelwardmemoriallibrary.org/events', city: 'Centerville', state: 'TX', zipCode: '75833', county: '' },
  { name: 'Charlotte Public Library', url: 'https://www.charlottelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.charlottelibrary.org/events', city: 'Charlotte', state: 'TX', zipCode: '78011', county: '' },
  { name: 'Chico Public Library Inc', url: 'https://www.chicolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.chicolibrary.org/events', city: 'Chico', state: 'TX', zipCode: '76431', county: '' },
  { name: 'Childress Public Library', url: 'https://www.childresslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.childresslibrary.org/events', city: 'Childress', state: 'TX', zipCode: '79201', county: '' },
  { name: 'Cisco Public Library', url: 'https://www.ciscolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ciscolibrary.org/events', city: 'Cisco', state: 'TX', zipCode: '76437', county: '' },
  { name: 'Burton Memorial Library', url: 'https://www.burtonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burtonmemoriallibrary.org/events', city: 'Clarendon', state: 'TX', zipCode: '79226', county: '' },
  { name: 'Red River County Public Library', url: 'https://www.redrivercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.redrivercountylibrary.org/events', city: 'Clarksville', state: 'TX', zipCode: '75426', county: '' },
  { name: 'Claude Public Library', url: 'https://www.claudelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.claudelibrary.org/events', city: 'Claude', state: 'TX', zipCode: '79019', county: '' },
  { name: 'Cleburne Public Library', url: 'https://www.cleburnelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cleburnelibrary.org/events', city: 'Cleburne', state: 'TX', zipCode: '76033', county: '' },
  { name: 'Austin Memorial Library', url: 'https://www.austinmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.austinmemoriallibrary.org/events', city: 'Cleveland', state: 'TX', zipCode: '77327', county: '' },
  { name: 'Tarkington Community Library Inc', url: 'https://www.tarkingtoncommunitylibraryinc.org', platform: 'wordpress', eventsUrl: 'https://www.tarkingtoncommunitylibraryinc.org/events', city: 'Cleveland', state: 'TX', zipCode: '77327', county: '' },
  { name: 'Nellie Pederson Civic Library', url: 'https://www.nelliepedersonciviclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nelliepedersonciviclibrary.org/events', city: 'Clifton', state: 'TX', zipCode: '76634', county: '' },
  { name: 'Clint Isd Public Library', url: 'https://www.clintlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.clintlibrary.org/events', city: 'Clint', state: 'TX', zipCode: '79836', county: '' },
  { name: 'Clyde Public Library', url: 'https://www.clydelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.clydelibrary.org/events', city: 'Clyde', state: 'TX', zipCode: '79510', county: '' },
  { name: 'Coldspring Area Public Library', url: 'https://www.coldspringlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.coldspringlibrary.org/events', city: 'Coldspring', state: 'TX', zipCode: '77331', county: '' },
  { name: 'Coleman Public Library', url: 'https://www.colemanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.colemanlibrary.org/events', city: 'Coleman', state: 'TX', zipCode: '76834', county: '' },
  { name: 'Colleyville Public Library', url: 'https://www.colleyvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.colleyvillelibrary.org/events', city: 'Colleyville', state: 'TX', zipCode: '76034', county: '' },
  { name: 'Mitchell County Public Library', url: 'https://www.mitchellcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mitchellcountylibrary.org/events', city: 'Colorado City', state: 'TX', zipCode: '79512', county: '' },
  { name: 'Nesbitt Memorial Library', url: 'https://www.nesbittmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nesbittmemoriallibrary.org/events', city: 'Columbus', state: 'TX', zipCode: '78934', county: '' },
  { name: 'Comanche Public Library', url: 'https://www.comanchelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.comanchelibrary.org/events', city: 'Comanche', state: 'TX', zipCode: '76442', county: '' },
  { name: 'Comfort Public Library', url: 'https://www.comfortlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.comfortlibrary.org/events', city: 'Comfort', state: 'TX', zipCode: '78013', county: '' },
  { name: 'Commerce Public Library', url: 'https://www.commercelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.commercelibrary.org/events', city: 'Commerce', state: 'TX', zipCode: '75428', county: '' },
  { name: 'Montgomery County Memorial Library System', url: 'https://www.montgomerycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.montgomerycountylibrary.org/events', city: 'Conroe', state: 'TX', zipCode: '77301', county: '' },
  { name: 'Converse Public Library', url: 'https://www.converselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.converselibrary.org/events', city: 'Converse', state: 'TX', zipCode: '78109', county: '' },
  { name: 'Delta County Public Library', url: 'https://www.deltacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deltacountylibrary.org/events', city: 'Cooper', state: 'TX', zipCode: '75432', county: '' },
  { name: 'William T Cozby Public Library', url: 'https://www.williamtcozbypubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.williamtcozbypubliclibrary.org/events', city: 'Coppell', state: 'TX', zipCode: '75019', county: '' },
  { name: 'Copperas Cove Public Library', url: 'https://www.copperascovelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.copperascovelibrary.org/events', city: 'Copperas Cove', state: 'TX', zipCode: '76522', county: '' },
  { name: 'Mickey Reily Public Library', url: 'https://www.mickeyreilypubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mickeyreilypubliclibrary.org/events', city: 'Corrigan', state: 'TX', zipCode: '75939', county: '' },
  { name: 'Corsicana Public Library', url: 'https://www.corsicanalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.corsicanalibrary.org/events', city: 'Corsicana', state: 'TX', zipCode: '75110', county: '' },
  { name: 'Alexander Memorial Library', url: 'https://www.alexandermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alexandermemoriallibrary.org/events', city: 'Cotulla', state: 'TX', zipCode: '78014', county: '' },
  { name: 'Crandall-Combine Community Library', url: 'https://www.crandalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crandalllibrary.org/events', city: 'Crandall', state: 'TX', zipCode: '75114', county: '' },
  { name: 'Crane County Library', url: 'https://www.cranecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cranecountylibrary.org/events', city: 'Crane', state: 'TX', zipCode: '79731', county: '' },
  { name: 'Jh Wootters Crockett Public Library', url: 'https://www.crockettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crockettlibrary.org/events', city: 'Crockett', state: 'TX', zipCode: '75835', county: '' },
  { name: 'Crosby County Library', url: 'https://www.crosbycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crosbycountylibrary.org/events', city: 'Crosbyton', state: 'TX', zipCode: '79322', county: '' },
  { name: 'Cross Plains Public Library', url: 'https://www.crossplainslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crossplainslibrary.org/events', city: 'Cross Plains', state: 'TX', zipCode: '76443', county: '' },
  { name: 'Foard County Library', url: 'https://www.foardcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.foardcountylibrary.org/events', city: 'Crowell', state: 'TX', zipCode: '79227', county: '' },
  { name: 'Crowley Public Library', url: 'https://www.crowleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crowleylibrary.org/events', city: 'Crowley', state: 'TX', zipCode: '76036', county: '' },
  { name: 'Crystal City Memorial Library', url: 'https://www.crystalcitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crystalcitylibrary.org/events', city: 'Crystal City', state: 'TX', zipCode: '78839', county: '' },
  { name: 'Cuero Public Library', url: 'https://www.cuerolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cuerolibrary.org/events', city: 'Cuero', state: 'TX', zipCode: '77954', county: '' },
  { name: 'Daingerfield Public Library', url: 'https://www.daingerfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.daingerfieldlibrary.org/events', city: 'Daingerfield', state: 'TX', zipCode: '75638', county: '' },
  { name: 'Dallam-Hartley County Library', url: 'https://www.dallamhartleycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dallamhartleycountylibrary.org/events', city: 'Dalhart', state: 'TX', zipCode: '79022', county: '' },
  { name: 'Jones Public Library', url: 'https://www.jonespubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jonespubliclibrary.org/events', city: 'Dayton', state: 'TX', zipCode: '77535', county: '' },
  { name: 'Deleon City County Library', url: 'https://www.deleoncitycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deleoncitycountylibrary.org/events', city: 'De Leon', state: 'TX', zipCode: '76444', county: '' },
  { name: 'Desoto Public Library', url: 'https://www.desotopubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.desotopubliclibrary.org/events', city: 'De Soto', state: 'TX', zipCode: '75115', county: '' },
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'TX', zipCode: '76234', county: '' },
  { name: 'Deer Park Public Library', url: 'https://www.deerparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'TX', zipCode: '77536', county: '' },
  { name: 'Val Verde County Library', url: 'https://www.valverdecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.valverdecountylibrary.org/events', city: 'Del Rio', state: 'TX', zipCode: '78840', county: '' },
  { name: 'East Travis Gateway Library District', url: 'https://www.easttravisgatewaylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.easttravisgatewaylibrarydistrict.org/events', city: 'Del Valle', state: 'TX', zipCode: '78617', county: '' },
  { name: 'Grace Grebing Public-School Library', url: 'https://www.gracegrebingpublicschoollibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gracegrebingpublicschoollibrary.org/events', city: 'Dell City', state: 'TX', zipCode: '79837', county: '' },
  { name: 'Denison Public Library', url: 'https://www.denisonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.denisonlibrary.org/events', city: 'Denison', state: 'TX', zipCode: '75020', county: '' },
  { name: 'Yoakum County-Cecil Bickley Library', url: 'https://www.yoakumcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yoakumcountylibrary.org/events', city: 'Denver City', state: 'TX', zipCode: '79323', county: '' },
  { name: 'Driscoll Public Library', url: 'https://www.driscollpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.driscollpubliclibrary.org/events', city: 'Devine', state: 'TX', zipCode: '78016', county: '' },
  { name: 'Tll Temple Memorial Library Archives', url: 'https://www.tlltemplememoriallibraryarchives.org', platform: 'wordpress', eventsUrl: 'https://www.tlltemplememoriallibraryarchives.org/events', city: 'Diboll', state: 'TX', zipCode: '75941', county: '' },
  { name: 'Dickinson Public Library', url: 'https://www.dickinsonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dickinsonlibrary.org/events', city: 'Dickinson', state: 'TX', zipCode: '77539', county: '' },
  { name: 'Dilley Public Library', url: 'https://www.dilleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dilleylibrary.org/events', city: 'Dilley', state: 'TX', zipCode: '78017', county: '' },
  { name: 'Black Bridge Library', url: 'https://www.blackbridgelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.blackbridgelibrary.org/events', city: 'Dime Box', state: 'TX', zipCode: '77853', county: '' },
  { name: 'Rhoads Memorial Library', url: 'https://www.rhoadsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rhoadsmemoriallibrary.org/events', city: 'Dimmitt', state: 'TX', zipCode: '79027', county: '' },
  { name: 'Donna Public Library', url: 'https://www.donnalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.donnalibrary.org/events', city: 'Donna', state: 'TX', zipCode: '78537', county: '' },
  { name: 'Dripping Springs Community Library', url: 'https://www.drippingspringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.drippingspringslibrary.org/events', city: 'Dripping Springs', state: 'TX', zipCode: '78620', county: '' },
  { name: 'Dublin Public Library', url: 'https://www.dublinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dublinlibrary.org/events', city: 'Dublin', state: 'TX', zipCode: '76446', county: '' },
  { name: 'Killgore Memorial Library', url: 'https://www.killgorememoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.killgorememoriallibrary.org/events', city: 'Dumas', state: 'TX', zipCode: '79029', county: '' },
  { name: 'Duncanville Public Library', url: 'https://www.duncanvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.duncanvillelibrary.org/events', city: 'Duncanville', state: 'TX', zipCode: '75116', county: '' },
  { name: 'Eula David Wintermann Library', url: 'https://www.euladavidwintermannlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.euladavidwintermannlibrary.org/events', city: 'Eagle Lake', state: 'TX', zipCode: '77434', county: '' },
  { name: 'Eagle Pass Public Library', url: 'https://www.eaglepasslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eaglepasslibrary.org/events', city: 'Eagle Pass', state: 'TX', zipCode: '78852', county: '' },
  { name: 'Centennial Memorial Library', url: 'https://www.centennialmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centennialmemoriallibrary.org/events', city: 'Eastland', state: 'TX', zipCode: '76448', county: '' },
  { name: 'Eden Public Library', url: 'https://www.edenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edenlibrary.org/events', city: 'Eden', state: 'TX', zipCode: '76837', county: '' },
  { name: 'Dustin Michael Sekula Memorial Library', url: 'https://www.dustinmichaelsekulamemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dustinmichaelsekulamemoriallibrary.org/events', city: 'Edinburg', state: 'TX', zipCode: '78539', county: '' },
  { name: 'Hidalgo County Library System', url: 'https://www.hidalgocountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hidalgocountylibrary.org/events', city: 'Edinburg', state: 'TX', zipCode: '78539', county: '' },
  { name: 'Jackson County Memorial Library', url: 'https://www.jacksoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jacksoncountylibrary.org/events', city: 'Edna', state: 'TX', zipCode: '77957', county: '' },
  { name: 'El Paso Public Library', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://events.elpasotexas.gov', city: 'El Paso', state: 'TX', zipCode: '79901', county: '' },
  { name: 'El Paso Public Library - Armijo Branch Library', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Clardy Fox', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Dorris Van Doren', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Esperanza Acosta Moreno', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Irving Schwartz', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Jenna Welch Laura Bush Community Library', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Jos Cisneros Cielo Vista', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Judge Marquez', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Memorial Park', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Richard Burges', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Westside', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'El Paso Public Library - Ysleta', url: 'https://www.elpasolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elpasolibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '', county: '' },
  { name: 'Robert J. Galvan Law Library', url: 'https://www.robertjgalvanlawlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.robertjgalvanlawlibrary.org/events', city: 'El Paso', state: 'TX', zipCode: '79901', county: '' },
  { name: 'Texas Trans-Pecos Library System', url: 'https://www.texastranspecoslibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.texastranspecoslibrarysystem.org/events', city: 'El Paso', state: 'TX', zipCode: '79901', county: '' },
  { name: 'Schleicher County Public Library', url: 'https://www.schleichercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.schleichercountylibrary.org/events', city: 'Eldorado', state: 'TX', zipCode: '76936', county: '' },
  { name: 'Electra Public Library', url: 'https://www.electralibrary.org', platform: 'wordpress', eventsUrl: 'https://www.electralibrary.org/events', city: 'Electra', state: 'TX', zipCode: '76360', county: '' },
  { name: 'Elgin Public Library', url: 'https://www.elginlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elginlibrary.org/events', city: 'Elgin', state: 'TX', zipCode: '78621', county: '' },
  { name: 'Elsa Public Library', url: 'https://www.elsalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elsalibrary.org/events', city: 'Elsa', state: 'TX', zipCode: '78543', county: '' },
  { name: 'Rains County Public Library', url: 'https://www.rainscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rainscountylibrary.org/events', city: 'Emory', state: 'TX', zipCode: '75440', county: '' },
  { name: 'Ennis Public Library', url: 'https://www.ennislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ennislibrary.org/events', city: 'Ennis', state: 'TX', zipCode: '75119', county: '' },
  { name: 'Euless Public Library', url: 'https://www.eulesslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eulesslibrary.org/events', city: 'Euless', state: 'TX', zipCode: '76039', county: '' },
  { name: 'Everman Public Library', url: 'https://www.evermanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.evermanlibrary.org/events', city: 'Everman', state: 'TX', zipCode: '76140', county: '' },
  { name: 'Fabens Isd Community Library', url: 'https://www.fabenslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fabenslibrary.org/events', city: 'Fabens', state: 'TX', zipCode: '79838', county: '' },
  { name: 'Fairfield Library', url: 'https://www.fairfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fairfieldlibrary.org/events', city: 'Fairfield', state: 'TX', zipCode: '75840', county: '' },
  { name: 'Ed Rachal Memorial Library', url: 'https://www.edrachalmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edrachalmemoriallibrary.org/events', city: 'Falfurrias', state: 'TX', zipCode: '78355', county: '' },
  { name: 'Falls City Public Library', url: 'https://www.fallscitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fallscitylibrary.org/events', city: 'Falls City', state: 'TX', zipCode: '78113', county: '' },
  { name: 'Farmers Branch Manske Public Library', url: 'https://www.farmersbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.farmersbranchlibrary.org/events', city: 'Farmers Branch', state: 'TX', zipCode: '75234', county: '' },
  { name: 'Charles J Rike Memorial Library', url: 'https://www.charlesjrikememoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.charlesjrikememoriallibrary.org/events', city: 'Farmersville', state: 'TX', zipCode: '75442', county: '' },
  { name: 'Ferris Public Library', url: 'https://www.ferrislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ferrislibrary.org/events', city: 'Ferris', state: 'TX', zipCode: '75125', county: '' },
  { name: 'Florence Public Library', url: 'https://www.florencelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'TX', zipCode: '76527', county: '' },
  { name: 'Sam Fore Jr Wilson County Public Library', url: 'https://www.samforejrwilsoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.samforejrwilsoncountylibrary.org/events', city: 'Floresville', state: 'TX', zipCode: '78114', county: '' },
  { name: 'Floyd County Library', url: 'https://www.floydcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.floydcountylibrary.org/events', city: 'Floydada', state: 'TX', zipCode: '79235', county: '' },
  { name: 'Forest Hill Public Library', url: 'https://www.foresthilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.foresthilllibrary.org/events', city: 'Forest Hill', state: 'TX', zipCode: '76140', county: '' },
  { name: 'Ellen Brooks West Memorial Library Of Forney', url: 'https://www.forneylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.forneylibrary.org/events', city: 'Forney', state: 'TX', zipCode: '75126', county: '' },
  { name: 'Mickelsen Community Library', url: 'https://www.mickelsencommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mickelsencommunitylibrary.org/events', city: 'Fort Bliss', state: 'TX', zipCode: '', county: '' },
  { name: 'Jeff Davis County Library', url: 'https://www.jeffdaviscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffdaviscountylibrary.org/events', city: 'Fort Davis', state: 'TX', zipCode: '79734', county: '' },
  { name: 'Fort Hancock Isd-Public Library', url: 'https://www.forthancocklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.forthancocklibrary.org/events', city: 'Fort Hancock', state: 'TX', zipCode: '79839', county: '' },
  { name: 'Fort Stockton Public Library', url: 'https://www.fortstocktonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fortstocktonlibrary.org/events', city: 'Fort Stockton', state: 'TX', zipCode: '79735', county: '' },
  { name: 'Frankston Depot Library', url: 'https://www.frankstonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.frankstonlibrary.org/events', city: 'Frankston', state: 'TX', zipCode: '75763', county: '' },
  { name: 'Pioneer Memorial Library', url: 'https://www.pioneermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pioneermemoriallibrary.org/events', city: 'Fredericksburg', state: 'TX', zipCode: '78624', county: '' },
  { name: 'Duval County Public Library - Freer Branch', url: 'https://www.duvalcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.duvalcountylibrary.org/events', city: 'Freer', state: 'TX', zipCode: '78357', county: '' },
  { name: 'Friendswood Public Library', url: 'https://www.friendswoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.friendswoodlibrary.org/events', city: 'Friendswood', state: 'TX', zipCode: '77546', county: '' },
  { name: 'Friona Public Library', url: 'https://www.frionalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.frionalibrary.org/events', city: 'Friona', state: 'TX', zipCode: '79035', county: '' },
  { name: 'Cooke County Library', url: 'https://www.cookecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cookecountylibrary.org/events', city: 'Gainesville', state: 'TX', zipCode: '76240', county: '' },
  { name: 'Rosenberg Library', url: 'https://www.rosenberglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rosenberglibrary.org/events', city: 'Galveston', state: 'TX', zipCode: '77550', county: '' },
  { name: 'Nicholson Memorial Library System', url: 'https://www.nicholsonmemoriallibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.nicholsonmemoriallibrarysystem.org/events', city: 'Garland', state: 'TX', zipCode: '75040', county: '' },
  { name: 'Northeast Texas Library System', url: 'https://www.northeasttexaslibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.northeasttexaslibrarysystem.org/events', city: 'Garland', state: 'TX', zipCode: '75043', county: '' },
  { name: 'Gatesville Public Library', url: 'https://www.gatesvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gatesvillelibrary.org/events', city: 'Gatesville', state: 'TX', zipCode: '76528', county: '' },
  { name: 'Live Oak County Library', url: 'https://www.liveoakcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.liveoakcountylibrary.org/events', city: 'George West', state: 'TX', zipCode: '78022', county: '' },
  { name: 'Georgetown Public Library', url: 'https://www.georgetownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.georgetownlibrary.org/events', city: 'Georgetown', state: 'TX', zipCode: '78626', county: '' },
  { name: 'Giddings Public Library', url: 'https://www.giddingslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.giddingslibrary.org/events', city: 'Giddings', state: 'TX', zipCode: '78942', county: '' },
  { name: 'Upshur County Library', url: 'https://www.upshurcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.upshurcountylibrary.org/events', city: 'Gilmer', state: 'TX', zipCode: '75644', county: '' },
  { name: 'Lee Public Library', url: 'https://www.leepubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.leepubliclibrary.org/events', city: 'Gladewater', state: 'TX', zipCode: '75647', county: '' },
  { name: 'Somervell County Library', url: 'https://www.somervellcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.somervellcountylibrary.org/events', city: 'Glen Rose', state: 'TX', zipCode: '76043', county: '' },
  { name: 'Jennie Trent Dew Library', url: 'https://www.jennietrentdewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jennietrentdewlibrary.org/events', city: 'Goldthwaite', state: 'TX', zipCode: '76844', county: '' },
  { name: 'Goliad County Library', url: 'https://www.goliadcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.goliadcountylibrary.org/events', city: 'Goliad', state: 'TX', zipCode: '77963', county: '' },
  { name: 'Gonzales Public Library', url: 'https://www.gonzaleslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gonzaleslibrary.org/events', city: 'Gonzales', state: 'TX', zipCode: '78629', county: '' },
  { name: 'Charlie Garrett Memorial Library', url: 'https://www.charliegarrettmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.charliegarrettmemoriallibrary.org/events', city: 'Gorman', state: 'TX', zipCode: '76454', county: '' },
  { name: 'Library Of Graham', url: 'https://www.grahamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grahamlibrary.org/events', city: 'Graham', state: 'TX', zipCode: '76450', county: '' },
  { name: 'Hood County Public Library', url: 'https://www.hoodcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hoodcountylibrary.org/events', city: 'Granbury', state: 'TX', zipCode: '76048', county: '' },
  { name: 'Grand Prairie Public Library System', url: 'https://www.grandprairielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandprairielibrary.org/events', city: 'Grand Prairie', state: 'TX', zipCode: '75051', county: '' },
  { name: 'Grand Saline Public Library', url: 'https://www.grandsalinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandsalinelibrary.org/events', city: 'Grand Saline', state: 'TX', zipCode: '75140', county: '' },
  { name: 'Grandview Public Library', url: 'https://www.grandviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandviewlibrary.org/events', city: 'Grandview', state: 'TX', zipCode: '76050', county: '' },
  { name: 'Grapeland Public Library', url: 'https://www.grapelandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grapelandlibrary.org/events', city: 'Grapeland', state: 'TX', zipCode: '75844', county: '' },
  { name: 'Grapevine Public Library', url: 'https://www.grapevinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grapevinelibrary.org/events', city: 'Grapevine', state: 'TX', zipCode: '76051', county: '' },
  { name: 'W Walworth Harrison Public Library', url: 'https://www.wwalworthharrisonpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wwalworthharrisonpubliclibrary.org/events', city: 'Greenville', state: 'TX', zipCode: '75401', county: '' },
  { name: 'Maffett Memorial Library', url: 'https://www.maffettmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maffettmemoriallibrary.org/events', city: 'Groesbeck', state: 'TX', zipCode: '76642', county: '' },
  { name: 'Groves Public Library', url: 'https://www.groveslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.groveslibrary.org/events', city: 'Groves', state: 'TX', zipCode: '77619', county: '' },
  { name: 'Groveton Public Library', url: 'https://www.grovetonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grovetonlibrary.org/events', city: 'Groveton', state: 'TX', zipCode: '75845', county: '' },
  { name: 'Gruver City Library', url: 'https://www.gruverlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gruverlibrary.org/events', city: 'Gruver', state: 'TX', zipCode: '79040', county: '' },
  { name: 'Guthrie CSD King County Consolidated Library', url: 'https://www.guthriecsdkingcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.guthriecsdkingcountylibrary.org/events', city: 'Guthrie', state: 'TX', zipCode: '79236', county: '' },
  { name: 'Hale Center Public Library Inc', url: 'https://www.halecenterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.halecenterlibrary.org/events', city: 'Hale Center', state: 'TX', zipCode: '79041', county: '' },
  { name: 'Friench Simpson Memorial Library', url: 'https://www.frienchsimpsonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.frienchsimpsonmemoriallibrary.org/events', city: 'Hallettsville', state: 'TX', zipCode: '77964', county: '' },
  { name: 'Haltom City Public Library', url: 'https://www.haltomcitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.haltomcitylibrary.org/events', city: 'Haltom City', state: 'TX', zipCode: '76117', county: '' },
  { name: 'Hamilton Public Library', url: 'https://www.hamiltonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hamiltonlibrary.org/events', city: 'Hamilton', state: 'TX', zipCode: '76531', county: '' },
  { name: 'Harker Heights Public Library', url: 'https://www.harkerheightslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harkerheightslibrary.org/events', city: 'Harker Heights', state: 'TX', zipCode: '76548', county: '' },
  { name: 'Harlingen Public Library', url: 'https://www.harlingenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harlingenlibrary.org/events', city: 'Harlingen', state: 'TX', zipCode: '78550', county: '' },
  { name: 'Haskell County Library', url: 'https://www.haskellcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.haskellcountylibrary.org/events', city: 'Haskell', state: 'TX', zipCode: '79521', county: '' },
  { name: 'Haslet Public Library', url: 'https://www.hasletlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hasletlibrary.org/events', city: 'Haslet', state: 'TX', zipCode: '76052', county: '' },
  { name: 'Allen Memorial Public Library', url: 'https://www.allenmemorialpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.allenmemorialpubliclibrary.org/events', city: 'Hawkins', state: 'TX', zipCode: '75765', county: '' },
  { name: 'Smith-Welch Memorial Library', url: 'https://www.smithwelchmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.smithwelchmemoriallibrary.org/events', city: 'Hearne', state: 'TX', zipCode: '77859', county: '' },
  { name: 'Jim Hogg County Public Library', url: 'https://www.jimhoggcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jimhoggcountylibrary.org/events', city: 'Hebbronville', state: 'TX', zipCode: '78361', county: '' },
  { name: 'Jr Huffman Public Library', url: 'https://www.jrhuffmanpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jrhuffmanpubliclibrary.org/events', city: 'Hemphill', state: 'TX', zipCode: '75948', county: '' },
  { name: 'Waller County Library', url: 'https://www.wallercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wallercountylibrary.org/events', city: 'Hempstead', state: 'TX', zipCode: '77445', county: '' },
  { name: 'Rusk County Library System', url: 'https://www.ruskcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ruskcountylibrary.org/events', city: 'Henderson', state: 'TX', zipCode: '75652', county: '' },
  { name: 'Edwards Public Library', url: 'https://www.edwardspubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edwardspubliclibrary.org/events', city: 'Henrietta', state: 'TX', zipCode: '76365', county: '' },
  { name: 'Deaf Smith County Library', url: 'https://www.deafsmithcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.deafsmithcountylibrary.org/events', city: 'Hereford', state: 'TX', zipCode: '79045', county: '' },
  { name: 'Hewitt Public Library', url: 'https://www.hewittlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hewittlibrary.org/events', city: 'Hewitt', state: 'TX', zipCode: '76643', county: '' },
  { name: 'Hidalgo Public Library', url: 'https://www.hidalgolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hidalgolibrary.org/events', city: 'Hidalgo', state: 'TX', zipCode: '78557', county: '' },
  { name: 'Higgins Public Library', url: 'https://www.higginslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.higginslibrary.org/events', city: 'Higgins', state: 'TX', zipCode: '79046', county: '' },
  { name: 'Highland Park Library', url: 'https://www.highlandparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.highlandparklibrary.org/events', city: 'Highland Park', state: 'TX', zipCode: '75205', county: '' },
  { name: 'Hillsboro City Library', url: 'https://www.hillsborolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'TX', zipCode: '76645', county: '' },
  { name: 'Genevieve Miller Hitchcock Public Library', url: 'https://www.hitchcocklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hitchcocklibrary.org/events', city: 'Hitchcock', state: 'TX', zipCode: '77563', county: '' },
  { name: 'Bj Hill Library', url: 'https://www.bjhilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bjhilllibrary.org/events', city: 'Holland', state: 'TX', zipCode: '76534', county: '' },
  { name: 'Hondo Public Library', url: 'https://www.hondolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hondolibrary.org/events', city: 'Hondo', state: 'TX', zipCode: '78861', county: '' },
  { name: 'Bertha Voyer Memorial Library', url: 'https://www.berthavoyermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.berthavoyermemoriallibrary.org/events', city: 'Honey Grove', state: 'TX', zipCode: '75446', county: '' },
  { name: 'Hooks Public Library', url: 'https://www.hookslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hookslibrary.org/events', city: 'Hooks', state: 'TX', zipCode: '75561', county: '' },
  { name: 'Howe Community Library', url: 'https://www.howelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.howelibrary.org/events', city: 'Howe', state: 'TX', zipCode: '75459', county: '' },
  { name: 'Mcmullen Memorial Library', url: 'https://www.mcmullenmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mcmullenmemoriallibrary.org/events', city: 'Huntington', state: 'TX', zipCode: '75949', county: '' },
  { name: 'Huntsville Public Library', url: 'https://www.huntsvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.huntsvillelibrary.org/events', city: 'Huntsville', state: 'TX', zipCode: '77340', county: '' },
  { name: 'Hurst Public Library', url: 'https://www.hurstlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hurstlibrary.org/events', city: 'Hurst', state: 'TX', zipCode: '76053', county: '' },
  { name: 'Hutchins-Atwell Public Library', url: 'https://www.hutchinslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hutchinslibrary.org/events', city: 'Hutchins', state: 'TX', zipCode: '75141', county: '' },
  { name: 'Hutto Public Library', url: 'https://www.huttolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.huttolibrary.org/events', city: 'Hutto', state: 'TX', zipCode: '78634', county: '' },
  { name: 'Idalou Community Library', url: 'https://www.idaloulibrary.org', platform: 'wordpress', eventsUrl: 'https://www.idaloulibrary.org/events', city: 'Idalou', state: 'TX', zipCode: '79329', county: '' },
  { name: 'Imperial Public Library', url: 'https://www.imperiallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.imperiallibrary.org/events', city: 'Imperial', state: 'TX', zipCode: '79743', county: '' },
  { name: 'Ingleside Public Library', url: 'https://www.inglesidelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.inglesidelibrary.org/events', city: 'Ingleside', state: 'TX', zipCode: '78362', county: '' },
  { name: 'Tom Burnett Memorial Library', url: 'https://www.tomburnettmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tomburnettmemoriallibrary.org/events', city: 'Iowa Park', state: 'TX', zipCode: '76367', county: '' },
  { name: 'Iraan Public Library', url: 'https://www.iraanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.iraanlibrary.org/events', city: 'Iraan', state: 'TX', zipCode: '79744', county: '' },
  { name: 'Irving Public Library', url: 'https://www.irvinglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.irvinglibrary.org/events', city: 'Irving', state: 'TX', zipCode: '75060', county: '' },
  { name: 'Gladys Johnson Ritchie Public Library', url: 'https://www.gladysjohnsonritchiepubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gladysjohnsonritchiepubliclibrary.org/events', city: 'Jacksboro', state: 'TX', zipCode: '76458', county: '' },
  { name: 'Jacksonville Public Library', url: 'https://www.jacksonvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jacksonvillelibrary.org/events', city: 'Jacksonville', state: 'TX', zipCode: '75766', county: '' },
  { name: 'Jasper Public Library', url: 'https://www.jasperlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jasperlibrary.org/events', city: 'Jasper', state: 'TX', zipCode: '75951', county: '' },
  { name: 'Kent County Library', url: 'https://www.kentcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kentcountylibrary.org/events', city: 'Jayton', state: 'TX', zipCode: '79528', county: '' },
  { name: 'Jefferson Carnegie Library', url: 'https://www.jeffersonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jeffersonlibrary.org/events', city: 'Jefferson', state: 'TX', zipCode: '75657', county: '' },
  { name: 'Johnson City Library', url: 'https://www.johnsoncitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.johnsoncitylibrary.org/events', city: 'Johnson City', state: 'TX', zipCode: '78636', county: '' },
  { name: 'Jonestown Community Library', url: 'https://www.jonestownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jonestownlibrary.org/events', city: 'Jonestown', state: 'TX', zipCode: '78645', county: '' },
  { name: 'Joshua School Public Library', url: 'https://www.joshualibrary.org', platform: 'wordpress', eventsUrl: 'https://www.joshualibrary.org/events', city: 'Joshua', state: 'TX', zipCode: '76058', county: '' },
  { name: 'Jourdanton Community Library', url: 'https://www.jourdantonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jourdantonlibrary.org/events', city: 'Jourdanton', state: 'TX', zipCode: '78026', county: '' },
  { name: 'Kimble County Library', url: 'https://www.kimblecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kimblecountylibrary.org/events', city: 'Junction', state: 'TX', zipCode: '76849', county: '' },
  { name: 'Justin Community Library', url: 'https://www.justinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.justinlibrary.org/events', city: 'Justin', state: 'TX', zipCode: '76247', county: '' },
  { name: 'Karnes City Public Library', url: 'https://www.karnescitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.karnescitylibrary.org/events', city: 'Karnes City', state: 'TX', zipCode: '78118', county: '' },
  { name: 'Kaufman County Library', url: 'https://www.kaufmancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kaufmancountylibrary.org/events', city: 'Kaufman', state: 'TX', zipCode: '75142', county: '' },
  { name: 'Keller Public Library', url: 'https://www.kellerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kellerlibrary.org/events', city: 'Keller', state: 'TX', zipCode: '76248', county: '' },
  { name: 'Kendalia Public Library', url: 'https://www.kendalialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kendalialibrary.org/events', city: 'Kendalia', state: 'TX', zipCode: '78027', county: '' },
  { name: 'Kenedy Public Library', url: 'https://www.kenedylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kenedylibrary.org/events', city: 'Kenedy', state: 'TX', zipCode: '78119', county: '' },
  { name: 'Kennedale Public Library', url: 'https://www.kennedalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kennedalelibrary.org/events', city: 'Kennedale', state: 'TX', zipCode: '76060', county: '' },
  { name: 'Kerens Library', url: 'https://www.kerenslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kerenslibrary.org/events', city: 'Kerens', state: 'TX', zipCode: '75144', county: '' },
  { name: 'Winkler County Library', url: 'https://www.winklercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.winklercountylibrary.org/events', city: 'Kermit', state: 'TX', zipCode: '79745', county: '' },
  { name: 'Butt-Holdsworth Memorial Library', url: 'https://www.buttholdsworthmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.buttholdsworthmemoriallibrary.org/events', city: 'Kerrville', state: 'TX', zipCode: '78028', county: '' },
  { name: 'Kilgore Public Library', url: 'https://www.kilgorelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kilgorelibrary.org/events', city: 'Kilgore', state: 'TX', zipCode: '75662', county: '' },
  { name: 'Killeen City Library System', url: 'https://www.killeenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.killeenlibrary.org/events', city: 'Killeen', state: 'TX', zipCode: '76541', county: '' },
  { name: 'Robert J Kleberg Public Library', url: 'https://www.robertjklebergpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.robertjklebergpubliclibrary.org/events', city: 'Kingsville', state: 'TX', zipCode: '78363', county: '' },
  { name: 'Kirbyville Public Library', url: 'https://www.kirbyvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kirbyvillelibrary.org/events', city: 'Kirbyville', state: 'TX', zipCode: '75956', county: '' },
  { name: 'Kountze Public Library', url: 'https://www.kountzelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kountzelibrary.org/events', city: 'Kountze', state: 'TX', zipCode: '77625', county: '' },
  { name: 'Krum Public Library', url: 'https://www.krumlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.krumlibrary.org/events', city: 'Krum', state: 'TX', zipCode: '76249', county: '' },
  { name: 'Kyle Community Library', url: 'https://www.kylelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kylelibrary.org/events', city: 'Kyle', state: 'TX', zipCode: '78640', county: '' },
  { name: 'Bailey H Dunlap Memorial Library', url: 'https://www.baileyhdunlapmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.baileyhdunlapmemoriallibrary.org/events', city: 'La Feria', state: 'TX', zipCode: '78559', county: '' },
  { name: 'Fayette Public Library', url: 'https://www.fayettepubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fayettepubliclibrary.org/events', city: 'La Grange', state: 'TX', zipCode: '78945', county: '' },
  { name: 'La Joya Municipal Library', url: 'https://www.lajoyalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lajoyalibrary.org/events', city: 'La Joya', state: 'TX', zipCode: '78560', county: '' },
  { name: 'La Marque Public Library', url: 'https://www.lamarquelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lamarquelibrary.org/events', city: 'La Marque', state: 'TX', zipCode: '77568', county: '' },
  { name: 'Lago Vista Public Library', url: 'https://www.lagovistalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lagovistalibrary.org/events', city: 'Lago Vista', state: 'TX', zipCode: '78645', county: '' },
  { name: 'Laguna Vista Public Library', url: 'https://www.lagunavistalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lagunavistalibrary.org/events', city: 'Laguna Vista', state: 'TX', zipCode: '78578', county: '' },
  { name: 'Lake Cities Library', url: 'https://www.lakecitieslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakecitieslibrary.org/events', city: 'Lake Dallas', state: 'TX', zipCode: '75065', county: '' },
  { name: 'Mary Lou Reddick Public Library', url: 'https://www.maryloureddickpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maryloureddickpubliclibrary.org/events', city: 'Lake Worth', state: 'TX', zipCode: '76135', county: '' },
  { name: 'Lakehills Area Library', url: 'https://www.lakehillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakehillslibrary.org/events', city: 'Lakehills', state: 'TX', zipCode: '78063', county: '' },
  { name: 'Lake Travis Community Library', url: 'https://www.laketraviscommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laketraviscommunitylibrary.org/events', city: 'Lakeway', state: 'TX', zipCode: '78734', county: '' },
  { name: 'Dawson County Public Library', url: 'https://www.dawsoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dawsoncountylibrary.org/events', city: 'Lamesa', state: 'TX', zipCode: '79331', county: '' },
  { name: 'Lampasas Public Library', url: 'https://www.lampasaslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lampasaslibrary.org/events', city: 'Lampasas', state: 'TX', zipCode: '76550', county: '' },
  { name: 'Lancaster Veterans Memorial Library', url: 'https://www.lancasterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'TX', zipCode: '75134', county: '' },
  { name: 'Laredo Public Library', url: 'https://www.laredolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laredolibrary.org/events', city: 'Laredo', state: 'TX', zipCode: '78041', county: '' },
  { name: 'Laredo Public Library - Bruni Plaza Branch', url: 'https://www.laredolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laredolibrary.org/events', city: 'Laredo', state: 'TX', zipCode: '78040', county: '' },
  { name: 'Laredo Public Library - Santo Nino Branch', url: 'https://www.laredolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.laredolibrary.org/events', city: 'Laredo', state: 'TX', zipCode: '78043', county: '' },
  { name: 'Helen Hall Library', url: 'https://www.helenhalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.helenhalllibrary.org/events', city: 'League City', state: 'TX', zipCode: '77573', county: '' },
  { name: 'Real County Public Library', url: 'https://www.realcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.realcountylibrary.org/events', city: 'Leakey', state: 'TX', zipCode: '78873', county: '' },
  { name: 'Leander Public Library', url: 'https://www.leanderlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.leanderlibrary.org/events', city: 'Leander', state: 'TX', zipCode: '78641', county: '' },
  { name: 'Leon Valley Public Library', url: 'https://www.leonvalleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.leonvalleylibrary.org/events', city: 'Leon Valley', state: 'TX', zipCode: '78238', county: '' },
  { name: 'Leonard Public Library', url: 'https://www.leonardlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.leonardlibrary.org/events', city: 'Leonard', state: 'TX', zipCode: '75452', county: '' },
  { name: 'Hockley County Memorial Library', url: 'https://www.hockleycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hockleycountylibrary.org/events', city: 'Levelland', state: 'TX', zipCode: '79336', county: '' },
  { name: 'Lewisville Public Library', url: 'https://www.lewisvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lewisvillelibrary.org/events', city: 'Lewisville', state: 'TX', zipCode: '75067', county: '' },
  { name: 'Liberty Municipal Library', url: 'https://www.libertylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.libertylibrary.org/events', city: 'Liberty', state: 'TX', zipCode: '77575', county: '' },
  { name: 'Liberty Hill Public Library', url: 'https://www.libertyhilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.libertyhilllibrary.org/events', city: 'Liberty Hill', state: 'TX', zipCode: '78642', county: '' },
  { name: 'Lindale Library', url: 'https://www.lindalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lindalelibrary.org/events', city: 'Lindale', state: 'TX', zipCode: '75771', county: '' },
  { name: 'Little Elm Public Library', url: 'https://www.littleelmlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.littleelmlibrary.org/events', city: 'Little Elm', state: 'TX', zipCode: '75068', county: '' },
  { name: 'Lamb County Library', url: 'https://www.lambcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lambcountylibrary.org/events', city: 'Littlefield', state: 'TX', zipCode: '79339', county: '' },
  { name: 'Murphy Memorial Library', url: 'https://www.murphymemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.murphymemoriallibrary.org/events', city: 'Livingston', state: 'TX', zipCode: '77351', county: '' },
  { name: 'Llano County Library System', url: 'https://www.llanocountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.llanocountylibrary.org/events', city: 'Llano', state: 'TX', zipCode: '78643', county: '' },
  { name: 'Dr Eugene Clark Library', url: 'https://www.dreugeneclarklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dreugeneclarklibrary.org/events', city: 'Lockhart', state: 'TX', zipCode: '78644', county: '' },
  { name: 'Lone Oak Area Public Library', url: 'https://www.loneoaklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.loneoaklibrary.org/events', city: 'Lone Oak', state: 'TX', zipCode: '75453', county: '' },
  { name: 'Longview Public Library', url: 'https://www.longviewlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.longviewlibrary.org/events', city: 'Longview', state: 'TX', zipCode: '75601', county: '' },
  { name: 'Cameron County Library System', url: 'https://www.cameroncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cameroncountylibrary.org/events', city: 'Los Fresnos', state: 'TX', zipCode: '78566', county: '' },
  { name: 'Ethel L Whipple Memorial Library', url: 'https://www.ethellwhipplememoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ethellwhipplememoriallibrary.org/events', city: 'Los Fresnos', state: 'TX', zipCode: '78566', county: '' },
  { name: 'George and Helen Mahon Public Library', url: 'https://www.georgeandhelenmahonpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.georgeandhelenmahonpubliclibrary.org/events', city: 'Lubbock', state: 'TX', zipCode: '79401', county: '' },
  { name: 'Godeke Branch Library', url: 'https://www.godekebranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.godekebranchlibrary.org/events', city: 'Lubbock', state: 'TX', zipCode: '79424', county: '' },
  { name: 'Groves Branch Library', url: 'https://www.grovesbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grovesbranchlibrary.org/events', city: 'Lubbock', state: 'TX', zipCode: '79407', county: '' },
  { name: 'Patterson Branch Library', url: 'https://www.pattersonbranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pattersonbranchlibrary.org/events', city: 'Lubbock', state: 'TX', zipCode: '79403', county: '' },
  { name: 'Kurth Memorial Library', url: 'https://www.kurthmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kurthmemoriallibrary.org/events', city: 'Lufkin', state: 'TX', zipCode: '75904', county: '' },
  { name: 'Jb Nickells Memorial Library', url: 'https://www.jbnickellsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jbnickellsmemoriallibrary.org/events', city: 'Luling', state: 'TX', zipCode: '78648', county: '' },
  { name: 'Lumberton Public Library', url: 'https://www.lumbertonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lumbertonlibrary.org/events', city: 'Lumberton', state: 'TX', zipCode: '77657', county: '' },
  { name: 'Lytle Public Library', url: 'https://www.lytlelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lytlelibrary.org/events', city: 'Lytle', state: 'TX', zipCode: '78052', county: '' },
  { name: 'Tri-County Library', url: 'https://www.tricountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tricountylibrary.org/events', city: 'Mabank', state: 'TX', zipCode: '75147', county: '' },
  { name: 'Madison County Library', url: 'https://www.madisoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.madisoncountylibrary.org/events', city: 'Madisonville', state: 'TX', zipCode: '77864', county: '' },
  { name: 'Red Waller Community Library', url: 'https://www.redwallercommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.redwallercommunitylibrary.org/events', city: 'Malakoff', state: 'TX', zipCode: '75148', county: '' },
  { name: 'Mansfield Public Library', url: 'https://www.mansfieldlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'TX', zipCode: '76063', county: '' },
  { name: 'Marfa Public Library', url: 'https://www.marfalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marfalibrary.org/events', city: 'Marfa', state: 'TX', zipCode: '79843', county: '' },
  { name: 'Marion Community Library', url: 'https://www.marionlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'TX', zipCode: '78124', county: '' },
  { name: 'Pauline And Jane Chilton Memorial Marlin Public Library', url: 'https://www.marlinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marlinlibrary.org/events', city: 'Marlin', state: 'TX', zipCode: '76661', county: '' },
  { name: 'Marshall Public Library', url: 'https://www.marshalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'TX', zipCode: '75670', county: '' },
  { name: 'Nancy Nail Memorial Library', url: 'https://www.nancynailmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nancynailmemoriallibrary.org/events', city: 'Mart', state: 'TX', zipCode: '76664', county: '' },
  { name: 'Mason County M Beven Eckert Memorial Library', url: 'https://www.masoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.masoncountylibrary.org/events', city: 'Mason', state: 'TX', zipCode: '76856', county: '' },
  { name: 'Motley County Library', url: 'https://www.motleycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.motleycountylibrary.org/events', city: 'Matador', state: 'TX', zipCode: '79244', county: '' },
  { name: 'Mathis Public Library', url: 'https://www.mathislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mathislibrary.org/events', city: 'Mathis', state: 'TX', zipCode: '78368', county: '' },
  { name: 'Maud Public Library', url: 'https://www.maudlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maudlibrary.org/events', city: 'Maud', state: 'TX', zipCode: '75567', county: '' },
  { name: 'Upton County Public Library', url: 'https://www.uptoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.uptoncountylibrary.org/events', city: 'Mccamey', state: 'TX', zipCode: '79752', county: '' },
  { name: 'Mcginley Memorial Public Library', url: 'https://www.mcginleymemorialpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mcginleymemorialpubliclibrary.org/events', city: 'Mcgregor', state: 'TX', zipCode: '76657', county: '' },
  { name: 'Lovett Memorial Library Mclean', url: 'https://www.mcleanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mcleanlibrary.org/events', city: 'Mclean', state: 'TX', zipCode: '79057', county: '' },
  { name: 'Medina Community Library', url: 'https://www.medinalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.medinalibrary.org/events', city: 'Medina', state: 'TX', zipCode: '78055', county: '' },
  { name: 'Melissa Public Library', url: 'https://www.melissalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.melissalibrary.org/events', city: 'Melissa', state: 'TX', zipCode: '75454', county: '' },
  { name: 'Memphis Public Library', url: 'https://www.memphislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.memphislibrary.org/events', city: 'Memphis', state: 'TX', zipCode: '79245', county: '' },
  { name: 'Menard Public Library', url: 'https://www.menardlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.menardlibrary.org/events', city: 'Menard', state: 'TX', zipCode: '76859', county: '' },
  { name: 'Mercedes Memorial Library', url: 'https://www.mercedeslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mercedeslibrary.org/events', city: 'Mercedes', state: 'TX', zipCode: '78570', county: '' },
  { name: 'Meridian Public Library', url: 'https://www.meridianlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.meridianlibrary.org/events', city: 'Meridian', state: 'TX', zipCode: '76665', county: '' },
  { name: 'Merkel Public Library', url: 'https://www.merkellibrary.org', platform: 'wordpress', eventsUrl: 'https://www.merkellibrary.org/events', city: 'Merkel', state: 'TX', zipCode: '79536', county: '' },
  { name: 'Irion County Library', url: 'https://www.irioncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.irioncountylibrary.org/events', city: 'Mertzon', state: 'TX', zipCode: '76941', county: '' },
  { name: 'Mesquite Public Library', url: 'https://www.mesquitelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mesquitelibrary.org/events', city: 'Mesquite', state: 'TX', zipCode: '75149', county: '' },
  { name: 'Gibbs Memorial Library', url: 'https://www.gibbsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gibbsmemoriallibrary.org/events', city: 'Mexia', state: 'TX', zipCode: '76667', county: '' },
  { name: 'Midland County Public Library', url: 'https://www.midlandcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.midlandcountylibrary.org/events', city: 'Midland', state: 'TX', zipCode: '79701', county: '' },
  { name: 'Ah Meadows Library', url: 'https://www.ahmeadowslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ahmeadowslibrary.org/events', city: 'Midlothian', state: 'TX', zipCode: '76065', county: '' },
  { name: 'Mineola Memorial Library', url: 'https://www.mineolalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mineolalibrary.org/events', city: 'Mineola', state: 'TX', zipCode: '75773', county: '' },
  { name: 'Boyce Ditto Public Library', url: 'https://www.boycedittopubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.boycedittopubliclibrary.org/events', city: 'Mineral Wells', state: 'TX', zipCode: '76067', county: '' },
  { name: 'Speer Memorial Library', url: 'https://www.speermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.speermemoriallibrary.org/events', city: 'Mission', state: 'TX', zipCode: '78572', county: '' },
  { name: 'Ward County Library', url: 'https://www.wardcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wardcountylibrary.org/events', city: 'Monahans', state: 'TX', zipCode: '79756', county: '' },
  { name: 'Moody Community Library', url: 'https://www.moodylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.moodylibrary.org/events', city: 'Moody', state: 'TX', zipCode: '76557', county: '' },
  { name: 'Cochran County Love Memorial Library', url: 'https://www.cochrancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cochrancountylibrary.org/events', city: 'Morton', state: 'TX', zipCode: '79346', county: '' },
  { name: 'Mount Calm Public Library', url: 'https://www.mountcalmlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mountcalmlibrary.org/events', city: 'Mount Calm', state: 'TX', zipCode: '76673', county: '' },
  { name: 'Mount Pleasant Public Library', url: 'https://www.mountpleasantpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mountpleasantpubliclibrary.org/events', city: 'Mt Pleasant', state: 'TX', zipCode: '75455', county: '' },
  { name: 'Franklin County Library', url: 'https://www.franklincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.franklincountylibrary.org/events', city: 'Mt Vernon', state: 'TX', zipCode: '75457', county: '' },
  { name: 'Muenster Public Library', url: 'https://www.muensterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.muensterlibrary.org/events', city: 'Muenster', state: 'TX', zipCode: '76252', county: '' },
  { name: 'Muleshoe Area Public Library', url: 'https://www.muleshoelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.muleshoelibrary.org/events', city: 'Muleshoe', state: 'TX', zipCode: '79347', county: '' },
  { name: 'Munday City-County Library', url: 'https://www.mundaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mundaylibrary.org/events', city: 'Munday', state: 'TX', zipCode: '76371', county: '' },
  { name: 'Nacogdoches Public Library', url: 'https://www.nacogdocheslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nacogdocheslibrary.org/events', city: 'Nacogdoches', state: 'TX', zipCode: '75961', county: '' },
  { name: 'Naples Public Library', url: 'https://www.napleslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.napleslibrary.org/events', city: 'Naples', state: 'TX', zipCode: '75568', county: '' },
  { name: 'Navasota Public Library', url: 'https://www.navasotalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.navasotalibrary.org/events', city: 'Navasota', state: 'TX', zipCode: '77868', county: '' },
  { name: 'Marion Ed Hughes Public Library', url: 'https://www.marionedhughespubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.marionedhughespubliclibrary.org/events', city: 'Nederland', state: 'TX', zipCode: '77627', county: '' },
  { name: 'New Boston Public Library', url: 'https://www.newbostonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newbostonlibrary.org/events', city: 'New Boston', state: 'TX', zipCode: '75570', county: '' },
  { name: 'New Braunfels Public Library', url: 'https://www.newbraunfelslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newbraunfelslibrary.org/events', city: 'New Braunfels', state: 'TX', zipCode: '78130', county: '' },
  { name: 'New Waverly Public Library', url: 'https://www.newwaverlylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newwaverlylibrary.org/events', city: 'New Waverly', state: 'TX', zipCode: '77358', county: '' },
  { name: 'Newark Public Library', url: 'https://www.newarklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newarklibrary.org/events', city: 'Newark', state: 'TX', zipCode: '76071', county: '' },
  { name: 'Newton County Public Library', url: 'https://www.newtoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.newtoncountylibrary.org/events', city: 'Newton', state: 'TX', zipCode: '75966', county: '' },
  { name: 'Aphne Pattillo Nixon Public Library', url: 'https://www.nixonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nixonlibrary.org/events', city: 'Nixon', state: 'TX', zipCode: '78140', county: '' },
  { name: 'The Aphne Pattillo Nixon Public Library', url: 'https://www.nixonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nixonlibrary.org/events', city: 'Nixon', state: 'TX', zipCode: '78140', county: '' },
  { name: 'Nocona Public Library', url: 'https://www.noconalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.noconalibrary.org/events', city: 'Nocona', state: 'TX', zipCode: '76255', county: '' },
  { name: 'North Richland Hills Public Library', url: 'https://www.northrichlandhillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northrichlandhillslibrary.org/events', city: 'North Richland Hills', state: 'TX', zipCode: '76180', county: '' },
  { name: 'Odem Public Library', url: 'https://www.odemlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.odemlibrary.org/events', city: 'Odem', state: 'TX', zipCode: '78370', county: '' },
  { name: 'Ector County Library', url: 'https://www.ectorcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ectorcountylibrary.org/events', city: 'Odessa', state: 'TX', zipCode: '79761', county: '' },
  { name: 'Olney Community Library And Arts Center', url: 'https://www.olneylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.olneylibrary.org/events', city: 'Olney', state: 'TX', zipCode: '76374', county: '' },
  { name: 'Olton Area Library', url: 'https://www.oltonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oltonlibrary.org/events', city: 'Olton', state: 'TX', zipCode: '79064', county: '' },
  { name: 'Onalaska Public Library', url: 'https://www.onalaskalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.onalaskalibrary.org/events', city: 'Onalaska', state: 'TX', zipCode: '77360', county: '' },
  { name: 'Orange Public Library', url: 'https://www.orangelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.orangelibrary.org/events', city: 'Orange', state: 'TX', zipCode: '77630', county: '' },
  { name: 'Orange Grove School- Public Library', url: 'https://www.orangegrovelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.orangegrovelibrary.org/events', city: 'Orange Grove', state: 'TX', zipCode: '78372', county: '' },
  { name: 'Crockett County Public Library', url: 'https://www.crockettcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crockettcountylibrary.org/events', city: 'Ozona', state: 'TX', zipCode: '76943', county: '' },
  { name: 'Bicentennial City-County Library', url: 'https://www.bicentennialcitycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bicentennialcitycountylibrary.org/events', city: 'Paducah', state: 'TX', zipCode: '79248', county: '' },
  { name: 'Palacios Library Inc', url: 'https://www.palacioslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palacioslibrary.org/events', city: 'Palacios', state: 'TX', zipCode: '77465', county: '' },
  { name: 'Palestine Public Library', url: 'https://www.palestinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palestinelibrary.org/events', city: 'Palestine', state: 'TX', zipCode: '75801', county: '' },
  { name: 'Lovett Memorial Library Pampa', url: 'https://www.pampalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pampalibrary.org/events', city: 'Pampa', state: 'TX', zipCode: '79065', county: '' },
  { name: 'Carson County Public Library', url: 'https://www.carsoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carsoncountylibrary.org/events', city: 'Panhandle', state: 'TX', zipCode: '79068', county: '' },
  { name: 'Paris Public Library', url: 'https://www.parislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.parislibrary.org/events', city: 'Paris', state: 'TX', zipCode: '75460', county: '' },
  { name: 'Pasadena Public Library', url: 'https://www.pasadenalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pasadenalibrary.org/events', city: 'Pasadena', state: 'TX', zipCode: '77506', county: '' },
  { name: 'Pearsall Public Library', url: 'https://www.pearsalllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pearsalllibrary.org/events', city: 'Pearsall', state: 'TX', zipCode: '78061', county: '' },
  { name: 'Reeves County Library', url: 'https://www.reevescountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.reevescountylibrary.org/events', city: 'Pecos', state: 'TX', zipCode: '79772', county: '' },
  { name: 'Penitas Public Library', url: 'https://www.penitaspubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.penitaspubliclibrary.org/events', city: 'Peitas', state: 'TX', zipCode: '78576', county: '' },
  { name: 'Perry Memorial Library', url: 'https://www.perrymemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.perrymemoriallibrary.org/events', city: 'Perryton', state: 'TX', zipCode: '79070', county: '' },
  { name: 'Petersburg Public Library', url: 'https://www.petersburglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.petersburglibrary.org/events', city: 'Petersburg', state: 'TX', zipCode: '79250', county: '' },
  { name: 'Pflugerville Community Library', url: 'https://www.pflugervillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pflugervillelibrary.org/events', city: 'Pflugerville', state: 'TX', zipCode: '78660', county: '' },
  { name: 'Pharr Memorial Library', url: 'https://www.pharrlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pharrlibrary.org/events', city: 'Pharr', state: 'TX', zipCode: '78577', county: '' },
  { name: 'Pilot Point Community Library', url: 'https://www.pilotpointlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pilotpointlibrary.org/events', city: 'Pilot Point', state: 'TX', zipCode: '76258', county: '' },
  { name: 'Arthur Temple Sr Memorial Library', url: 'https://www.arthurtemplesrmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.arthurtemplesrmemoriallibrary.org/events', city: 'Pineland', state: 'TX', zipCode: '75968', county: '' },
  { name: 'Pittsburg-Camp County Public Library', url: 'https://www.pittsburgcampcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pittsburgcampcountylibrary.org/events', city: 'Pittsburg', state: 'TX', zipCode: '75686', county: '' },
  { name: 'Yoakum County Library', url: 'https://www.yoakumcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yoakumcountylibrary.org/events', city: 'Plains', state: 'TX', zipCode: '79355', county: '' },
  { name: 'Unger Memorial Library', url: 'https://www.ungermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ungermemoriallibrary.org/events', city: 'Plainview', state: 'TX', zipCode: '79072', county: '' },
  { name: 'Pleasanton Public Library', url: 'https://www.pleasantonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pleasantonlibrary.org/events', city: 'Pleasanton', state: 'TX', zipCode: '78064', county: '' },
  { name: 'Calhoun County Public Library - Point Comfort Branch Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Point Comfort', state: 'TX', zipCode: '77987', county: '' },
  { name: 'Betty Foster Public Library', url: 'https://www.bettyfosterpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bettyfosterpubliclibrary.org/events', city: 'Ponder', state: 'TX', zipCode: '76259', county: '' },
  { name: 'Ellis Memorial Library', url: 'https://www.ellismemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ellismemoriallibrary.org/events', city: 'Port Aransas', state: 'TX', zipCode: '78373', county: '' },
  { name: 'William R Bill Ellis Memorial Library', url: 'https://www.williamrbillellismemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.williamrbillellismemoriallibrary.org/events', city: 'Port Aransas', state: 'TX', zipCode: '78373', county: '' },
  { name: 'Port Arthur Public Library', url: 'https://www.portarthurlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.portarthurlibrary.org/events', city: 'Port Arthur', state: 'TX', zipCode: '77642', county: '' },
  { name: 'Port Isabel Public Library', url: 'https://www.portisabellibrary.org', platform: 'wordpress', eventsUrl: 'https://www.portisabellibrary.org/events', city: 'Port Isabel', state: 'TX', zipCode: '78578', county: '' },
  { name: 'Calhoun County Public Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Port Lavaca', state: 'TX', zipCode: '77979', county: '' },
  { name: 'Effie Wilton Hebert Public Library', url: 'https://www.effiewiltonhebertpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.effiewiltonhebertpubliclibrary.org/events', city: 'Port Neches', state: 'TX', zipCode: '77651', county: '' },
  { name: 'Calhoun County Public Library - Port Oconnor Branch Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Port Oconnor', state: 'TX', zipCode: '77982', county: '' },
  { name: 'Calhoun County Public Library - Seadrift Branch Library', url: 'https://www.calhouncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.calhouncountylibrary.org/events', city: 'Port Oconnor', state: 'TX', zipCode: '77983', county: '' },
  { name: 'Bell-Whittington Public Library', url: 'https://www.bellwhittingtonpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bellwhittingtonpubliclibrary.org/events', city: 'Portland', state: 'TX', zipCode: '78374', county: '' },
  { name: 'Post Public Library', url: 'https://www.postlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.postlibrary.org/events', city: 'Post', state: 'TX', zipCode: '79356', county: '' },
  { name: 'Poteet Public Library', url: 'https://www.poteetlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.poteetlibrary.org/events', city: 'Poteet', state: 'TX', zipCode: '78065', county: '' },
  { name: 'Pottsboro Area Public Library', url: 'https://www.pottsborolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pottsborolibrary.org/events', city: 'Pottsboro', state: 'TX', zipCode: '75076', county: '' },
  { name: 'Tri-Community Library', url: 'https://www.tricommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tricommunitylibrary.org/events', city: 'Prairie Lea', state: 'TX', zipCode: '78661', county: '' },
  { name: 'Premont Public Library', url: 'https://www.premontlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.premontlibrary.org/events', city: 'Premont', state: 'TX', zipCode: '78375', county: '' },
  { name: 'City Of Presidio Library', url: 'https://www.presidiolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.presidiolibrary.org/events', city: 'Presidio', state: 'TX', zipCode: '79845', county: '' },
  { name: 'Princeton Community Library', url: 'https://www.princetonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'TX', zipCode: '75407', county: '' },
  { name: 'Prosper Community Library', url: 'https://www.prosperlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.prosperlibrary.org/events', city: 'Prosper', state: 'TX', zipCode: '75078', county: '' },
  { name: 'Thompson Sawyer Public Library', url: 'https://www.thompsonsawyerpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.thompsonsawyerpubliclibrary.org/events', city: 'Quanah', state: 'TX', zipCode: '79252', county: '' },
  { name: 'Quemado Public Library', url: 'https://www.quemadolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.quemadolibrary.org/events', city: 'Quemado', state: 'TX', zipCode: '78877', county: '' },
  { name: 'Caprock Public Library', url: 'https://www.caprockpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.caprockpubliclibrary.org/events', city: 'Quitaque', state: 'TX', zipCode: '79255', county: '' },
  { name: 'Quitman Public Library', url: 'https://www.quitmanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.quitmanlibrary.org/events', city: 'Quitman', state: 'TX', zipCode: '75783', county: '' },
  { name: 'Ranger City Library', url: 'https://www.rangerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rangerlibrary.org/events', city: 'Ranger', state: 'TX', zipCode: '76470', county: '' },
  { name: 'Rankin Public Library', url: 'https://www.rankinlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rankinlibrary.org/events', city: 'Rankin', state: 'TX', zipCode: '79778', county: '' },
  { name: 'Reber Memorial Library', url: 'https://www.rebermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rebermemoriallibrary.org/events', city: 'Raymondville', state: 'TX', zipCode: '78580', county: '' },
  { name: 'Red Oak Public Library', url: 'https://www.redoaklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.redoaklibrary.org/events', city: 'Red Oak', state: 'TX', zipCode: '75154', county: '' },
  { name: 'Dennis M Oconnor Public Library', url: 'https://www.dennismoconnorpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dennismoconnorpubliclibrary.org/events', city: 'Refugio', state: 'TX', zipCode: '78377', county: '' },
  { name: 'Rhome Public Library', url: 'https://www.rhomelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rhomelibrary.org/events', city: 'Rhome', state: 'TX', zipCode: '76078', county: '' },
  { name: 'Richardson Public Library', url: 'https://www.richardsonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.richardsonlibrary.org/events', city: 'Richardson', state: 'TX', zipCode: '75080', county: '' },
  { name: 'Richland Hills Public Library', url: 'https://www.richlandhillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.richlandhillslibrary.org/events', city: 'Richland Hills', state: 'TX', zipCode: '76118', county: '' },
  { name: 'Fort Bend County Libraries', url: 'https://www.fortbendcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fortbendcountylibrary.org/events', city: 'Richmond', state: 'TX', zipCode: '77469', county: '' },
  { name: 'Rio Grande City Public Library', url: 'https://www.riograndecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riograndecitylibrary.org/events', city: 'Rio Grande City', state: 'TX', zipCode: '78582', county: '' },
  { name: 'Rio Grande City Public Library - La Rosita Branch Library', url: 'https://www.riograndecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riograndecitylibrary.org/events', city: 'Rio Grande City', state: 'TX', zipCode: '78582', county: '' },
  { name: 'Rio Hondo Public Library', url: 'https://www.riohondolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riohondolibrary.org/events', city: 'Rio Hondo', state: 'TX', zipCode: '78583', county: '' },
  { name: 'River Oaks Public Library', url: 'https://www.riveroakslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riveroakslibrary.org/events', city: 'River Oaks', state: 'TX', zipCode: '76114', county: '' },
  { name: 'Roanoke Public Library', url: 'https://www.roanokelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roanokelibrary.org/events', city: 'Roanoke', state: 'TX', zipCode: '76262', county: '' },
  { name: 'Coke County Library', url: 'https://www.cokecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cokecountylibrary.org/events', city: 'Robert Lee', state: 'TX', zipCode: '76945', county: '' },
  { name: 'Keach Family Library', url: 'https://www.keachfamilylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.keachfamilylibrary.org/events', city: 'Robstown', state: 'TX', zipCode: '78380', county: '' },
  { name: 'Nueces County Keach Family Library', url: 'https://www.nuecescountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nuecescountylibrary.org/events', city: 'Robstown', state: 'TX', zipCode: '78380', county: '' },
  { name: 'Lucy Hill Patterson Memorial Library', url: 'https://www.lucyhillpattersonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lucyhillpattersonmemoriallibrary.org/events', city: 'Rockdale', state: 'TX', zipCode: '76567', county: '' },
  { name: 'Aransas County Public Library', url: 'https://www.aransascountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.aransascountylibrary.org/events', city: 'Rockport', state: 'TX', zipCode: '78382', county: '' },
  { name: 'Claud H Gilmer Memorial Library', url: 'https://www.claudhgilmermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.claudhgilmermemoriallibrary.org/events', city: 'Rocksprings', state: 'TX', zipCode: '78880', county: '' },
  { name: 'Rockwall County Library', url: 'https://www.rockwallcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rockwallcountylibrary.org/events', city: 'Rockwall', state: 'TX', zipCode: '75087', county: '' },
  { name: 'Starr County Public Library- Roma Branch', url: 'https://www.starrcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.starrcountylibrary.org/events', city: 'Roma', state: 'TX', zipCode: '78584', county: '' },
  { name: 'D Brown Memorial Library', url: 'https://www.dbrownmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dbrownmemoriallibrary.org/events', city: 'Rosebud', state: 'TX', zipCode: '76570', county: '' },
  { name: 'Rotan Public Library', url: 'https://www.rotanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rotanlibrary.org/events', city: 'Rotan', state: 'TX', zipCode: '79546', county: '' },
  { name: 'Round Rock Public Library System', url: 'https://www.roundrocklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roundrocklibrary.org/events', city: 'Round Rock', state: 'TX', zipCode: '78664', county: '' },
  { name: 'Round Top Family Library', url: 'https://www.roundtoplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roundtoplibrary.org/events', city: 'Round Top', state: 'TX', zipCode: '78954', county: '' },
  { name: 'Rowlett Public Library', url: 'https://www.rowlettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rowlettlibrary.org/events', city: 'Rowlett', state: 'TX', zipCode: '75088', county: '' },
  { name: 'Cf Goodwin Public Library', url: 'https://www.cfgoodwinpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cfgoodwinpubliclibrary.org/events', city: 'Royse City', state: 'TX', zipCode: '75189', county: '' },
  { name: 'Runge Public Library', url: 'https://www.rungelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rungelibrary.org/events', city: 'Runge', state: 'TX', zipCode: '78151', county: '' },
  { name: 'Singletary Memorial Library', url: 'https://www.singletarymemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.singletarymemoriallibrary.org/events', city: 'Rusk', state: 'TX', zipCode: '75785', county: '' },
  { name: 'Sabinal Public Library', url: 'https://www.sabinallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sabinallibrary.org/events', city: 'Sabinal', state: 'TX', zipCode: '78881', county: '' },
  { name: 'Sachse Public Library', url: 'https://www.sachselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sachselibrary.org/events', city: 'Sachse', state: 'TX', zipCode: '75048', county: '' },
  { name: 'John Ed Keeter Public Library', url: 'https://www.johnedkeeterpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.johnedkeeterpubliclibrary.org/events', city: 'Saginaw', state: 'TX', zipCode: '76179', county: '' },
  { name: 'Salado Public Library District', url: 'https://www.saladolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.saladolibrary.org/events', city: 'Salado', state: 'TX', zipCode: '76571', county: '' },
  { name: 'Tom Green County Library System', url: 'https://www.tomgreencountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tomgreencountylibrary.org/events', city: 'San Angelo', state: 'TX', zipCode: '76903', county: '' },
  { name: 'Alamo Area Library System', url: 'https://www.alamoarealibrarysystem.org', platform: 'wordpress', eventsUrl: 'https://www.alamoarealibrarysystem.org/events', city: 'San Antonio', state: 'TX', zipCode: '78205', county: '' },
  { name: 'San Antonio Public Library', url: 'https://www.mysapl.org', platform: 'wordpress', eventsUrl: 'https://www.mysapl.org/events', city: 'San Antonio', state: 'TX', zipCode: '78205', county: '' },
  { name: 'San Augustine Public Library', url: 'https://www.sanaugustinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanaugustinelibrary.org/events', city: 'San Augustine', state: 'TX', zipCode: '75972', county: '' },
  { name: 'San Benito Public Library', url: 'https://www.sanbenitolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanbenitolibrary.org/events', city: 'San Benito', state: 'TX', zipCode: '78586', county: '' },
  { name: 'Duval County-San Diego Public Library', url: 'https://www.duvalcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.duvalcountylibrary.org/events', city: 'San Diego', state: 'TX', zipCode: '78384', county: '' },
  { name: 'San Juan Public Library', url: 'https://www.sanjuanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanjuanlibrary.org/events', city: 'San Juan', state: 'TX', zipCode: '78589', county: '' },
  { name: 'San Marcos Public Library', url: 'https://www.sanmarcoslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanmarcoslibrary.org/events', city: 'San Marcos', state: 'TX', zipCode: '78666', county: '' },
  { name: 'Rylander Memorial Library', url: 'https://www.rylandermemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rylandermemoriallibrary.org/events', city: 'San Saba', state: 'TX', zipCode: '76877', county: '' },
  { name: 'Terrell County Public Library', url: 'https://www.terrellcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.terrellcountylibrary.org/events', city: 'Sanderson', state: 'TX', zipCode: '79848', county: '' },
  { name: 'Sanger Public Library', url: 'https://www.sangerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sangerlibrary.org/events', city: 'Sanger', state: 'TX', zipCode: '76266', county: '' },
  { name: 'Santa Anna Library', url: 'https://www.santaannalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.santaannalibrary.org/events', city: 'Santa Anna', state: 'TX', zipCode: '76878', county: '' },
  { name: 'Mae S Bruce Library', url: 'https://www.maesbrucelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maesbrucelibrary.org/events', city: 'Santa Fe', state: 'TX', zipCode: '77510', county: '' },
  { name: 'Schertz Public Library', url: 'https://www.schertzlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.schertzlibrary.org/events', city: 'Schertz', state: 'TX', zipCode: '78154', county: '' },
  { name: 'Schulenburg Public Library', url: 'https://www.schulenburglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.schulenburglibrary.org/events', city: 'Schulenburg', state: 'TX', zipCode: '78956', county: '' },
  { name: 'Seagoville Public Library', url: 'https://www.seagovillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.seagovillelibrary.org/events', city: 'Seagoville', state: 'TX', zipCode: '75159', county: '' },
  { name: 'Virgil Josephine Gordon Memorial Library', url: 'https://www.virgiljosephinegordonmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.virgiljosephinegordonmemoriallibrary.org/events', city: 'Sealy', state: 'TX', zipCode: '77474', county: '' },
  { name: 'Seguin-Guadalupe County Public Library', url: 'https://www.seguinguadalupecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.seguinguadalupecountylibrary.org/events', city: 'Seguin', state: 'TX', zipCode: '78155', county: '' },
  { name: 'Gaines County Library', url: 'https://www.gainescountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gainescountylibrary.org/events', city: 'Seminole', state: 'TX', zipCode: '79360', county: '' },
  { name: 'The Library At Cedar Creek Lake', url: 'https://www.thelibraryatcedarcreeklake.org', platform: 'wordpress', eventsUrl: 'https://www.thelibraryatcedarcreeklake.org/events', city: 'Seven Points', state: 'TX', zipCode: '75143', county: '' },
  { name: 'Baylor County Free Library', url: 'https://www.baylorcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.baylorcountylibrary.org/events', city: 'Seymour', state: 'TX', zipCode: '76380', county: '' },
  { name: 'Shallowater School County Library', url: 'https://www.shallowaterschoolcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shallowaterschoolcountylibrary.org/events', city: 'Shallowater', state: 'TX', zipCode: '79363', county: '' },
  { name: 'Shamrock Public Library', url: 'https://www.shamrocklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shamrocklibrary.org/events', city: 'Shamrock', state: 'TX', zipCode: '79079', county: '' },
  { name: 'Shepherd Public Library', url: 'https://www.shepherdlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shepherdlibrary.org/events', city: 'Shepherd', state: 'TX', zipCode: '77371', county: '' },
  { name: 'Sheridan Memorial Library', url: 'https://www.sheridanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sheridanlibrary.org/events', city: 'Sheridan', state: 'TX', zipCode: '77475', county: '' },
  { name: 'Sherman Public Library', url: 'https://www.shermanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shermanlibrary.org/events', city: 'Sherman', state: 'TX', zipCode: '75090', county: '' },
  { name: 'Hoffie And Lank Wolters Shiner Public Library', url: 'https://www.shinerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shinerlibrary.org/events', city: 'Shiner', state: 'TX', zipCode: '77984', county: '' },
  { name: 'Shiner Public Library', url: 'https://www.shinerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shinerlibrary.org/events', city: 'Shiner', state: 'TX', zipCode: '77984', county: '' },
  { name: 'Silsbee Public Library', url: 'https://www.silsbeelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.silsbeelibrary.org/events', city: 'Silsbee', state: 'TX', zipCode: '77656', county: '' },
  { name: 'San Patricio County Library System', url: 'https://www.sanpatriciocountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sanpatriciocountylibrary.org/events', city: 'Sinton', state: 'TX', zipCode: '78387', county: '' },
  { name: 'Sinton Public Library', url: 'https://www.sintonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sintonlibrary.org/events', city: 'Sinton', state: 'TX', zipCode: '78387', county: '' },
  { name: 'Slaton City Library', url: 'https://www.slatonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.slatonlibrary.org/events', city: 'Slaton', state: 'TX', zipCode: '79364', county: '' },
  { name: 'Stella Hart Memorial Library', url: 'https://www.stellahartmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stellahartmemoriallibrary.org/events', city: 'Smiley', state: 'TX', zipCode: '78159', county: '' },
  { name: 'Smithville Public Library', url: 'https://www.smithvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.smithvillelibrary.org/events', city: 'Smithville', state: 'TX', zipCode: '78957', county: '' },
  { name: 'Scurry County Library', url: 'https://www.scurrycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.scurrycountylibrary.org/events', city: 'Snyder', state: 'TX', zipCode: '79549', county: '' },
  { name: 'Sutton County Library', url: 'https://www.suttoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.suttoncountylibrary.org/events', city: 'Sonora', state: 'TX', zipCode: '76950', county: '' },
  { name: 'Alma M Carpenter Public Library', url: 'https://www.almamcarpenterpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.almamcarpenterpubliclibrary.org/events', city: 'Sour Lake', state: 'TX', zipCode: '77659', county: '' },
  { name: 'Southlake Public Library', url: 'https://www.southlakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southlakelibrary.org/events', city: 'Southlake', state: 'TX', zipCode: '76092', county: '' },
  { name: 'Hansford County Library', url: 'https://www.hansfordcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hansfordcountylibrary.org/events', city: 'Spearman', state: 'TX', zipCode: '79081', county: '' },
  { name: 'Springlake-Earth Community Library', url: 'https://www.springlakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Springlake', state: 'TX', zipCode: '79082', county: '' },
  { name: 'Springtown Public Library', url: 'https://www.springtownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.springtownlibrary.org/events', city: 'Springtown', state: 'TX', zipCode: '76082', county: '' },
  { name: 'Dickens County Spur Public Library', url: 'https://www.dickenscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dickenscountylibrary.org/events', city: 'Spur', state: 'TX', zipCode: '79370', county: '' },
  { name: 'Stamford Carnegie Library', url: 'https://www.stamfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'TX', zipCode: '79553', county: '' },
  { name: 'Martin County Library', url: 'https://www.martincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.martincountylibrary.org/events', city: 'Stanton', state: 'TX', zipCode: '79782', county: '' },
  { name: 'Stephenville Public Library', url: 'https://www.stephenvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.stephenvillelibrary.org/events', city: 'Stephenville', state: 'TX', zipCode: '76401', county: '' },
  { name: 'Sterling County Public Library', url: 'https://www.sterlingcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sterlingcountylibrary.org/events', city: 'Sterling City', state: 'TX', zipCode: '76951', county: '' },
  { name: 'Sherman County Public Library', url: 'https://www.shermancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.shermancountylibrary.org/events', city: 'Stratford', state: 'TX', zipCode: '79084', county: '' },
  { name: 'Sulphur Springs Public Library', url: 'https://www.sulphurspringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sulphurspringslibrary.org/events', city: 'Sulphur Springs', state: 'TX', zipCode: '75482', county: '' },
  { name: 'Sunnyvale Public Library', url: 'https://www.sunnyvalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sunnyvalelibrary.org/events', city: 'Sunnyvale', state: 'TX', zipCode: '75182', county: '' },
  { name: 'County-City Library', url: 'https://www.countycitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.countycitylibrary.org/events', city: 'Sweetwater', state: 'TX', zipCode: '79556', county: '' },
  { name: 'Taft Public Library', url: 'https://www.taftlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.taftlibrary.org/events', city: 'Taft', state: 'TX', zipCode: '78390', county: '' },
  { name: 'City County Library', url: 'https://www.citycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.citycountylibrary.org/events', city: 'Tahoka', state: 'TX', zipCode: '79373', county: '' },
  { name: 'Taylor Public Library', url: 'https://www.taylorlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.taylorlibrary.org/events', city: 'Taylor', state: 'TX', zipCode: '76574', county: '' },
  { name: 'Teague Public Library', url: 'https://www.teaguelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.teaguelibrary.org/events', city: 'Teague', state: 'TX', zipCode: '75860', county: '' },
  { name: 'Temple Public Library', url: 'https://www.templelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.templelibrary.org/events', city: 'Temple', state: 'TX', zipCode: '76501', county: '' },
  { name: 'Riter C Hulsey Public Library', url: 'https://www.riterchulseypubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.riterchulseypubliclibrary.org/events', city: 'Terrell', state: 'TX', zipCode: '75160', county: '' },
  { name: 'Texarkana Public Library', url: 'https://www.texarkanalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.texarkanalibrary.org/events', city: 'Texarkana', state: 'TX', zipCode: '75501', county: '' },
  { name: 'Moore Memorial Public Library', url: 'https://www.moorememorialpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.moorememorialpubliclibrary.org/events', city: 'Texas City', state: 'TX', zipCode: '77590', county: '' },
  { name: 'Texline Public Library', url: 'https://www.texlinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.texlinelibrary.org/events', city: 'Texline', state: 'TX', zipCode: '79087', county: '' },
  { name: 'The Colony Public Library', url: 'https://www.thecolonylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.thecolonylibrary.org/events', city: 'The Colony', state: 'TX', zipCode: '75056', county: '' },
  { name: 'Live Oak County Library - Three Rivers Branch Library', url: 'https://www.liveoakcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.liveoakcountylibrary.org/events', city: 'Three Rivers', state: 'TX', zipCode: '78071', county: '' },
  { name: 'Depot Public Library', url: 'https://www.depotpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.depotpubliclibrary.org/events', city: 'Throckmorton', state: 'TX', zipCode: '76483', county: '' },
  { name: 'Lucile Teague Library', url: 'https://www.lucileteaguelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lucileteaguelibrary.org/events', city: 'Tom Bean', state: 'TX', zipCode: '75489', county: '' },
  { name: 'Blanche K Werner Public Library', url: 'https://www.blanchekwernerpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.blanchekwernerpubliclibrary.org/events', city: 'Trinity', state: 'TX', zipCode: '75862', county: '' },
  { name: 'Cameron-J Jarvis Troup Municipal Library', url: 'https://www.trouplibrary.org', platform: 'wordpress', eventsUrl: 'https://www.trouplibrary.org/events', city: 'Troup', state: 'TX', zipCode: '75789', county: '' },
  { name: 'Swisher County Library', url: 'https://www.swishercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.swishercountylibrary.org/events', city: 'Tulia', state: 'TX', zipCode: '79088', county: '' },
  { name: 'Turkey Public Library', url: 'https://www.turkeylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.turkeylibrary.org/events', city: 'Turkey', state: 'TX', zipCode: '79261', county: '' },
  { name: 'Noonday Community Library', url: 'https://www.noondaycommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.noondaycommunitylibrary.org/events', city: 'Tyler', state: 'TX', zipCode: '75703', county: '' },
  { name: 'Tyler Public Library', url: 'https://www.tylerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tylerlibrary.org/events', city: 'Tyler', state: 'TX', zipCode: '75702', county: '' },
  { name: 'Universal City Public Library', url: 'https://www.universalcitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.universalcitylibrary.org/events', city: 'Universal City', state: 'TX', zipCode: '78148', county: '' },
  { name: 'Utopia Memorial Library', url: 'https://www.utopialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.utopialibrary.org/events', city: 'Utopia', state: 'TX', zipCode: '78884', county: '' },
  { name: 'El Progreso Memorial Library', url: 'https://www.elprogresomemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elprogresomemoriallibrary.org/events', city: 'Uvalde', state: 'TX', zipCode: '78801', county: '' },
  { name: 'Valley Mills Public Library', url: 'https://www.valleymillslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.valleymillslibrary.org/events', city: 'Valley Mills', state: 'TX', zipCode: '76689', county: '' },
  { name: 'Van Community Library', url: 'https://www.vanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vanlibrary.org/events', city: 'Van', state: 'TX', zipCode: '75790', county: '' },
  { name: 'Van Alstyne Public Library', url: 'https://www.vanalstynelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vanalstynelibrary.org/events', city: 'Van Alstyne', state: 'TX', zipCode: '75495', county: '' },
  { name: 'Van Horn City County Library', url: 'https://www.vanhorncitycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vanhorncitycountylibrary.org/events', city: 'Van Horn', state: 'TX', zipCode: '79855', county: '' },
  { name: 'Oldham County Public Library', url: 'https://www.oldhamcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.oldhamcountylibrary.org/events', city: 'Vega', state: 'TX', zipCode: '79092', county: '' },
  { name: 'Joe A Hall High School And Community Library', url: 'https://www.joeahallhighschoolandcommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.joeahallhighschoolandcommunitylibrary.org/events', city: 'Venus', state: 'TX', zipCode: '76084', county: '' },
  { name: 'Carnegie City-County Library', url: 'https://www.carnegiecitycountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carnegiecitycountylibrary.org/events', city: 'Vernon', state: 'TX', zipCode: '76384', county: '' },
  { name: 'Victoria Public Library', url: 'https://www.victorialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.victorialibrary.org/events', city: 'Victoria', state: 'TX', zipCode: '77901', county: '' },
  { name: 'Vidor Public Library', url: 'https://www.vidorlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vidorlibrary.org/events', city: 'Vidor', state: 'TX', zipCode: '77662', county: '' },
  { name: 'Waco-Mclennan County Library', url: 'https://www.wacomclennancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wacomclennancountylibrary.org/events', city: 'Waco', state: 'TX', zipCode: '76701', county: '' },
  { name: 'Waelder Public Library', url: 'https://www.waelderlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.waelderlibrary.org/events', city: 'Waelder', state: 'TX', zipCode: '78959', county: '' },
  { name: 'Austin County Library System', url: 'https://www.austincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.austincountylibrary.org/events', city: 'Wallis', state: 'TX', zipCode: '77485', county: '' },
  { name: 'Waskom Public Library', url: 'https://www.waskomlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.waskomlibrary.org/events', city: 'Waskom', state: 'TX', zipCode: '75692', county: '' },
  { name: 'Watauga Public Library', url: 'https://www.wataugalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wataugalibrary.org/events', city: 'Watauga', state: 'TX', zipCode: '76148', county: '' },
  { name: 'Nicholas P Sims Library', url: 'https://www.nicholaspsimslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nicholaspsimslibrary.org/events', city: 'Waxahachie', state: 'TX', zipCode: '75165', county: '' },
  { name: 'Weatherford Public Library', url: 'https://www.weatherfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.weatherfordlibrary.org/events', city: 'Weatherford', state: 'TX', zipCode: '76086', county: '' },
  { name: 'Weimar Public Library', url: 'https://www.weimarlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.weimarlibrary.org/events', city: 'Weimar', state: 'TX', zipCode: '78962', county: '' },
  { name: 'Collingsworth Public Library', url: 'https://www.collingsworthpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.collingsworthpubliclibrary.org/events', city: 'Wellington', state: 'TX', zipCode: '79095', county: '' },
  { name: 'Rube Sessions Memorial Library', url: 'https://www.rubesessionsmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rubesessionsmemoriallibrary.org/events', city: 'Wells', state: 'TX', zipCode: '75976', county: '' },
  { name: 'Weslaco Public Library', url: 'https://www.weslacolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.weslacolibrary.org/events', city: 'Weslaco', state: 'TX', zipCode: '78596', county: '' },
  { name: 'West Public Library', url: 'https://www.westlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westlibrary.org/events', city: 'West', state: 'TX', zipCode: '76691', county: '' },
  { name: 'Westbank Community Library', url: 'https://www.westbankcommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westbankcommunitylibrary.org/events', city: 'West Lake Hills', state: 'TX', zipCode: '78746', county: '' },
  { name: 'Tawakoni Area Public Library', url: 'https://www.tawakoniareapubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.tawakoniareapubliclibrary.org/events', city: 'West Tawakoni', state: 'TX', zipCode: '75474', county: '' },
  { name: 'Wharton County Library', url: 'https://www.whartoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whartoncountylibrary.org/events', city: 'Wharton', state: 'TX', zipCode: '77488', county: '' },
  { name: 'Wheeler Public Library', url: 'https://www.wheelerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wheelerlibrary.org/events', city: 'Wheeler', state: 'TX', zipCode: '79096', county: '' },
  { name: 'White Oak School Community Library', url: 'https://www.whiteoaklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whiteoaklibrary.org/events', city: 'White Oak', state: 'TX', zipCode: '75693', county: '' },
  { name: 'White Settlement Public Library', url: 'https://www.whitesettlementlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitesettlementlibrary.org/events', city: 'White Settlement', state: 'TX', zipCode: '76108', county: '' },
  { name: 'Whitehouse Community Library', url: 'https://www.whitehouselibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitehouselibrary.org/events', city: 'Whitehouse', state: 'TX', zipCode: '75791', county: '' },
  { name: 'Whitesboro Public Library', url: 'https://www.whitesborolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitesborolibrary.org/events', city: 'Whitesboro', state: 'TX', zipCode: '76273', county: '' },
  { name: 'Whitewright Public Library', url: 'https://www.whitewrightlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitewrightlibrary.org/events', city: 'Whitewright', state: 'TX', zipCode: '75491', county: '' },
  { name: 'Lake Whitney Library', url: 'https://www.whitneylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.whitneylibrary.org/events', city: 'Whitney', state: 'TX', zipCode: '76692', county: '' },
  { name: 'Wichita Falls Public Library', url: 'https://www.wichitafallslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wichitafallslibrary.org/events', city: 'Wichita Falls', state: 'TX', zipCode: '76301', county: '' },
  { name: 'Wildwood Civic Library', url: 'https://www.wildwoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wildwoodlibrary.org/events', city: 'Wildwood', state: 'TX', zipCode: '77663', county: '' },
  { name: 'Gilliam Memorial Public Library', url: 'https://www.gilliammemorialpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gilliammemorialpubliclibrary.org/events', city: 'Wilmer', state: 'TX', zipCode: '75172', county: '' },
  { name: 'Wimberley Village Library', url: 'https://www.wimberleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wimberleylibrary.org/events', city: 'Wimberley', state: 'TX', zipCode: '78676', county: '' },
  { name: 'Gilbreath Memorial Library', url: 'https://www.gilbreathmemoriallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gilbreathmemoriallibrary.org/events', city: 'Winnsboro', state: 'TX', zipCode: '75494', county: '' },
  { name: 'Winters Public Library', url: 'https://www.winterslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.winterslibrary.org/events', city: 'Winters', state: 'TX', zipCode: '79567', county: '' },
  { name: 'Wolfe City Public Library', url: 'https://www.wolfecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wolfecitylibrary.org/events', city: 'Wolfe City', state: 'TX', zipCode: '75496', county: '' },
  { name: 'City Of Wolfforth Library', url: 'https://www.wolfforthlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wolfforthlibrary.org/events', city: 'Wolfforth', state: 'TX', zipCode: '79382', county: '' },
  { name: 'Allan Shivers Library Museum', url: 'https://www.allanshiverslibrarymuseum.org', platform: 'wordpress', eventsUrl: 'https://www.allanshiverslibrarymuseum.org/events', city: 'Woodville', state: 'TX', zipCode: '75979', county: '' },
  { name: 'Rita Truett Smith Public Library', url: 'https://www.ritatruettsmithpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ritatruettsmithpubliclibrary.org/events', city: 'Wylie', state: 'TX', zipCode: '75098', county: '' },
  { name: 'Carl And Mary Welhausen Library', url: 'https://www.carlandmarywelhausenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carlandmarywelhausenlibrary.org/events', city: 'Yoakum', state: 'TX', zipCode: '77995', county: '' },
  { name: 'Yorktown Public Library', url: 'https://www.yorktownlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yorktownlibrary.org/events', city: 'Yorktown', state: 'TX', zipCode: '78164', county: '' },
  { name: 'Olga V Figueroa Zapata County Public Library', url: 'https://www.olgavfigueroazapatacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.olgavfigueroazapatacountylibrary.org/events', city: 'Zapata', state: 'TX', zipCode: '78076', county: '' },
  { name: 'Olga V Figueroa Zapata County Public Library - Zapata County Branch Library', url: 'https://www.olgavfigueroazapatacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.olgavfigueroazapatacountylibrary.org/events', city: 'Zapata', state: 'TX', zipCode: '78076', county: '' },
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
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressTXCloudFunction };
