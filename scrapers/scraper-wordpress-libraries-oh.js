const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: OH
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Columbus Metropolitan Library",
    "url": "https://www.columbuslibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://events.columbuslibrary.org"
  },
  {
    "name": "Cleveland Public Library",
    "url": "https://cpl.org",
    "platform": "wordpress",
    "eventsUrl": "https://events.cpl.org"
  }
]
 */

const LIBRARIES = [
  {
    "name": "Columbus Metropolitan Library",
    "url": "https://www.columbuslibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://events.columbuslibrary.org", county: 'Franklin'},
  {
    "name": "Cleveland Public Library",
    "url": "https://cpl.org",
    "platform": "wordpress",
    "eventsUrl": "https://events.cpl.org", county: 'Cuyahoga'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Ada Public School District Library', url: 'https://www.adalibrary.org', eventsUrl: 'https://www.adalibrary.org/events', city: 'Ada', state: 'OH', zipCode: '45810', county: 'Ada County'},
  { name: 'Akron-Summit County Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'OH', zipCode: '44326', county: 'Akron County'},
  { name: 'Alexandria Public Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'OH', zipCode: '43001', county: 'Alexandria County'},
  { name: 'Alger Public Library', url: 'https://www.algerlibrary.org', eventsUrl: 'https://www.algerlibrary.org/events', city: 'Alger', state: 'OH', zipCode: '45812', county: 'Alger County'},
  { name: 'Rodman Public Library', url: 'https://www.alliancelibrary.org', eventsUrl: 'https://www.alliancelibrary.org/events', city: 'Alliance', state: 'OH', zipCode: '44601', county: 'Alliance County'},
  { name: 'Amherst Public Library', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'OH', zipCode: '44001', county: 'Amherst County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'OH', zipCode: '44003', county: 'Andover County'},
  { name: 'Arcanum Public Library', url: 'https://www.arcanumlibrary.org', eventsUrl: 'https://www.arcanumlibrary.org/events', city: 'Arcanum', state: 'OH', zipCode: '45304', county: 'Arcanum County'},
  { name: 'Archbold Community Library', url: 'https://www.archboldlibrary.org', eventsUrl: 'https://www.archboldlibrary.org/events', city: 'Archbold', state: 'OH', zipCode: '43502', county: 'Archbold County'},
  { name: 'Ashland Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'OH', zipCode: '44805', county: 'Ashland County'},
  { name: 'Wornstaff Memorial Public Library', url: 'https://www.ashleylibrary.org', eventsUrl: 'https://www.ashleylibrary.org/events', city: 'Ashley', state: 'OH', zipCode: '43003', county: 'Ashley County'},
  { name: 'Ashtabula County District Library', url: 'https://www.ashtabulalibrary.org', eventsUrl: 'https://www.ashtabulalibrary.org/events', city: 'Ashtabula', state: 'OH', zipCode: '44004', county: 'Ashtabula County'},
  { name: 'Harbor-Topky Memorial Library', url: 'https://www.ashtabulaharborlibrary.org', eventsUrl: 'https://www.ashtabulaharborlibrary.org/events', city: 'Ashtabula Harbor', state: 'OH', zipCode: '44004', county: 'Ashtabula Harbor County'},
  { name: 'Seneca East Public Library', url: 'https://www.atticalibrary.org', eventsUrl: 'https://www.atticalibrary.org/events', city: 'Attica', state: 'OH', zipCode: '44807', county: 'Attica County'},
  { name: 'Avon Lake Public Library', url: 'https://www.avonlakelibrary.org', eventsUrl: 'https://www.avonlakelibrary.org/events', city: 'Avon Lake', state: 'OH', zipCode: '44012', county: 'Avon Lake County'},
  { name: 'Barberton Public Library', url: 'https://www.barbertonlibrary.org', eventsUrl: 'https://www.barbertonlibrary.org/events', city: 'Barberton', state: 'OH', zipCode: '44203', county: 'Barberton County'},
  { name: 'Barnesville Hutton Memorial Public Library', url: 'https://www.barnesvillelibrary.org', eventsUrl: 'https://www.barnesvillelibrary.org/events', city: 'Barnesville', state: 'OH', zipCode: '43713', county: 'Barnesville County'},
  { name: 'Clermont County Public Library', url: 'https://www.batavialibrary.org', eventsUrl: 'https://www.batavialibrary.org/events', city: 'Batavia', state: 'OH', zipCode: '45103', county: 'Batavia County'},
  { name: 'Bellaire Public Library', url: 'https://www.bellairelibrary.org', eventsUrl: 'https://www.bellairelibrary.org/events', city: 'Bellaire', state: 'OH', zipCode: '43906', county: 'Bellaire County'},
  { name: 'Belle Center Free Public Library', url: 'https://www.bellecenterlibrary.org', eventsUrl: 'https://www.bellecenterlibrary.org/events', city: 'Belle Center', state: 'OH', zipCode: '43310', county: 'Belle Center County'},
  { name: 'Logan County District Library', url: 'https://www.bellefontainelibrary.org', eventsUrl: 'https://www.bellefontainelibrary.org/events', city: 'Bellefontaine', state: 'OH', zipCode: '43311', county: 'Bellefontaine County'},
  { name: 'Bellevue Public Library', url: 'https://www.bellevuelibrary.org', eventsUrl: 'https://www.bellevuelibrary.org/events', city: 'Bellevue', state: 'OH', zipCode: '44811', county: 'Bellevue County'},
  { name: 'Bettsville Public Library', url: 'https://www.bettsvillelibrary.org', eventsUrl: 'https://www.bettsvillelibrary.org/events', city: 'Bettsville', state: 'OH', zipCode: '44815', county: 'Bettsville County'},
  { name: 'Bexley Public Library', url: 'https://www.bexleylibrary.org', eventsUrl: 'https://www.bexleylibrary.org/events', city: 'Bexley', state: 'OH', zipCode: '43209', county: 'Bexley County'},
  { name: 'Blanchester Public Library', url: 'https://www.blanchesterlibrary.org', eventsUrl: 'https://www.blanchesterlibrary.org/events', city: 'Blanchester', state: 'OH', zipCode: '45107', county: 'Blanchester County'},
  { name: 'Bliss Memorial Public Library', url: 'https://www.bloomvillelibrary.org', eventsUrl: 'https://www.bloomvillelibrary.org/events', city: 'Bloomville', state: 'OH', zipCode: '44818', county: 'Bloomville County'},
  { name: 'Bluffton Public Library', url: 'https://www.blufftonlibrary.org', eventsUrl: 'https://www.blufftonlibrary.org/events', city: 'Bluffton', state: 'OH', zipCode: '45817', county: 'Bluffton County'},
  { name: 'Bowerston Public Library', url: 'https://www.bowerstonlibrary.org', eventsUrl: 'https://www.bowerstonlibrary.org/events', city: 'Bowerston', state: 'OH', zipCode: '44695', county: 'Bowerston County'},
  { name: 'Northwest Regional Library System', url: 'https://www.bowlinggreenlibrary.org', eventsUrl: 'https://www.bowlinggreenlibrary.org/events', city: 'Bowling Green', state: 'OH', zipCode: '43402', county: 'Bowling Green County'},
  { name: 'Bradford Public Library', url: 'https://www.bradfordlibrary.org', eventsUrl: 'https://www.bradfordlibrary.org/events', city: 'Bradford', state: 'OH', zipCode: '45308', county: 'Bradford County'},
  { name: 'Bristol Public Library', url: 'https://www.bristolvillelibrary.org', eventsUrl: 'https://www.bristolvillelibrary.org/events', city: 'Bristolville', state: 'OH', zipCode: '44402', county: 'Bristolville County'},
  { name: 'Williams Co Public Library', url: 'https://www.bryanlibrary.org', eventsUrl: 'https://www.bryanlibrary.org/events', city: 'Bryan', state: 'OH', zipCode: '43506', county: 'Bryan County'},
  { name: 'Bucyrus Public Library', url: 'https://www.bucyruslibrary.org', eventsUrl: 'https://www.bucyruslibrary.org/events', city: 'Bucyrus', state: 'OH', zipCode: '44820', county: 'Bucyrus County'},
  { name: 'Burton Public Library', url: 'https://www.burtonlibrary.org', eventsUrl: 'https://www.burtonlibrary.org/events', city: 'Burton', state: 'OH', zipCode: '44021', county: 'Burton County'},
  { name: 'Puskarich Public Library', url: 'https://www.cadizlibrary.org', eventsUrl: 'https://www.cadizlibrary.org/events', city: 'Cadiz', state: 'OH', zipCode: '43907', county: 'Cadiz County'},
  { name: 'Caldwell Public Library', url: 'https://www.caldwelllibrary.org', eventsUrl: 'https://www.caldwelllibrary.org/events', city: 'Caldwell', state: 'OH', zipCode: '43724', county: 'Caldwell County'},
  { name: 'Guernsey County District Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'OH', zipCode: '43725', county: 'Cambridge County'},
  { name: 'Canal Fulton Public Library', url: 'https://www.canalfultonlibrary.org', eventsUrl: 'https://www.canalfultonlibrary.org/events', city: 'Canal Fulton', state: 'OH', zipCode: '44614', county: 'Canal Fulton County'},
  { name: 'Stark County District Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'OH', zipCode: '44702', county: 'Canton County'},
  { name: 'Cardington-Lincoln Public Library', url: 'https://www.cardingtonlibrary.org', eventsUrl: 'https://www.cardingtonlibrary.org/events', city: 'Cardington', state: 'OH', zipCode: '43315', county: 'Cardington County'},
  { name: 'Dorcas Carey Public Library', url: 'https://www.careylibrary.org', eventsUrl: 'https://www.careylibrary.org/events', city: 'Carey', state: 'OH', zipCode: '43316', county: 'Carey County'},
  { name: 'Carroll County District Library', url: 'https://www.carrolltonlibrary.org', eventsUrl: 'https://www.carrolltonlibrary.org/events', city: 'Carrollton', state: 'OH', zipCode: '44615', county: 'Carrollton County'},
  { name: 'Mercer County District Public Library', url: 'https://www.celinalibrary.org', eventsUrl: 'https://www.celinalibrary.org/events', city: 'Celina', state: 'OH', zipCode: '45822', county: 'Celina County'},
  { name: 'Centerburg Public Library', url: 'https://www.centerburglibrary.org', eventsUrl: 'https://www.centerburglibrary.org/events', city: 'Centerburg', state: 'OH', zipCode: '43011', county: 'Centerburg County'},
  { name: 'Washington-Centerville Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'OH', zipCode: '45458', county: 'Centerville County'},
  { name: 'Geauga County Public Library', url: 'https://www.chardonlibrary.org', eventsUrl: 'https://www.chardonlibrary.org/events', city: 'Chardon', state: 'OH', zipCode: '44024', county: 'Chardon County'},
  { name: 'Selover Public Library', url: 'https://www.chestervillelibrary.org', eventsUrl: 'https://www.chestervillelibrary.org/events', city: 'Chesterville', state: 'OH', zipCode: '43317', county: 'Chesterville County'},
  { name: 'Chillicothe And Ross County Public Library', url: 'https://www.chillicothelibrary.org', eventsUrl: 'https://www.chillicothelibrary.org/events', city: 'Chillicothe', state: 'OH', zipCode: '45601', county: 'Chillicothe County'},
  { name: 'Southwest Ohio And Neighboring Libraries', url: 'https://www.cincinnatilibrary.org', eventsUrl: 'https://www.cincinnatilibrary.org/events', city: 'Cincinnati', state: 'OH', zipCode: '45242', county: 'Cincinnati County'},
  { name: 'Pickaway Cnty District Public Library', url: 'https://www.circlevillelibrary.org', eventsUrl: 'https://www.circlevillelibrary.org/events', city: 'Circleville', state: 'OH', zipCode: '43113', county: 'Circleville County'},
  { name: 'Cleveland Public Library', url: 'https://www.clevelandlibrary.org', eventsUrl: 'https://www.clevelandlibrary.org/events', city: 'Cleveland', state: 'OH', zipCode: '44114', county: 'Cleveland County'},
  { name: 'Cleveland Heights-University Heights Pl', url: 'https://www.clevelandhtslibrary.org', eventsUrl: 'https://www.clevelandhtslibrary.org/events', city: 'Cleveland Hts.', state: 'OH', zipCode: '44118', county: 'Cleveland Hts. County'},
  { name: 'Clyde Public Library', url: 'https://www.clydelibrary.org', eventsUrl: 'https://www.clydelibrary.org/events', city: 'Clyde', state: 'OH', zipCode: '43410', county: 'Clyde County'},
  { name: 'Coldwater Public Library', url: 'https://www.coldwaterlibrary.org', eventsUrl: 'https://www.coldwaterlibrary.org/events', city: 'Coldwater', state: 'OH', zipCode: '45828', county: 'Coldwater County'},
  { name: 'Columbiana Public Library', url: 'https://www.columbianalibrary.org', eventsUrl: 'https://www.columbianalibrary.org/events', city: 'Columbiana', state: 'OH', zipCode: '44408', county: 'Columbiana County'},
  { name: 'Columbus Metropolitan Library', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'OH', zipCode: '43215', county: 'Columbus County'},
  { name: 'Conneaut Public Library', url: 'https://www.conneautlibrary.org', eventsUrl: 'https://www.conneautlibrary.org/events', city: 'Conneaut', state: 'OH', zipCode: '44030', county: 'Conneaut County'},
  { name: 'Coshocton Public Library', url: 'https://www.coshoctonlibrary.org', eventsUrl: 'https://www.coshoctonlibrary.org/events', city: 'Coshocton', state: 'OH', zipCode: '43812', county: 'Coshocton County'},
  { name: 'J.R. Clarke Public Library', url: 'https://www.covingtonlibrary.org', eventsUrl: 'https://www.covingtonlibrary.org/events', city: 'Covington', state: 'OH', zipCode: '45318', county: 'Covington County'},
  { name: 'Crestline Public Library', url: 'https://www.crestlinelibrary.org', eventsUrl: 'https://www.crestlinelibrary.org/events', city: 'Crestline', state: 'OH', zipCode: '44827', county: 'Crestline County'},
  { name: 'Cuyahoga County Public Library', url: 'https://www.cuycoparmalibrary.org', eventsUrl: 'https://www.cuycoparmalibrary.org/events', city: 'Cuy. Co.-Parma', state: 'OH', zipCode: '44134', county: 'Cuy. Co.-Parma County'},
  { name: 'Cuyahoga Falls Library', url: 'https://www.cuyahogafallslibrary.org', eventsUrl: 'https://www.cuyahogafallslibrary.org/events', city: 'Cuyahoga Falls', state: 'OH', zipCode: '44221', county: 'Cuyahoga Falls County'},
  { name: 'Dayton Metro Library', url: 'https://www.daytonlibrary.org', eventsUrl: 'https://www.daytonlibrary.org/events', city: 'Dayton', state: 'OH', zipCode: '45402', county: 'Dayton County'},
  { name: 'Defiance Public Library', url: 'https://www.defiancelibrary.org', eventsUrl: 'https://www.defiancelibrary.org/events', city: 'Defiance', state: 'OH', zipCode: '43512', county: 'Defiance County'},
  { name: 'Delaware County District Library', url: 'https://www.delawarelibrary.org', eventsUrl: 'https://www.delawarelibrary.org/events', city: 'Delaware', state: 'OH', zipCode: '43015', county: 'Delaware County'},
  { name: 'Delphos Public Library', url: 'https://www.delphoslibrary.org', eventsUrl: 'https://www.delphoslibrary.org/events', city: 'Delphos', state: 'OH', zipCode: '45833', county: 'Delphos County'},
  { name: 'Delta Public Library', url: 'https://www.deltalibrary.org', eventsUrl: 'https://www.deltalibrary.org/events', city: 'Delta', state: 'OH', zipCode: '43515', county: 'Delta County'},
  { name: 'Patrick Henry School District Public Library', url: 'https://www.deshlerlibrary.org', eventsUrl: 'https://www.deshlerlibrary.org/events', city: 'Deshler', state: 'OH', zipCode: '43516', county: 'Deshler County'},
  { name: 'Dover Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'OH', zipCode: '44622', county: 'Dover County'},
  { name: 'Hardin Northern Public Library', url: 'https://www.dunkirklibrary.org', eventsUrl: 'https://www.dunkirklibrary.org/events', city: 'Dunkirk', state: 'OH', zipCode: '45836', county: 'Dunkirk County'},
  { name: 'East Cleveland Public Library', url: 'https://www.eastclevelandlibrary.org', eventsUrl: 'https://www.eastclevelandlibrary.org/events', city: 'East Cleveland', state: 'OH', zipCode: '44112', county: 'East Cleveland County'},
  { name: 'Carnegie Public Library', url: 'https://www.eastliverpoollibrary.org', eventsUrl: 'https://www.eastliverpoollibrary.org/events', city: 'East Liverpool', state: 'OH', zipCode: '43920', county: 'East Liverpool County'},
  { name: 'East Palestine Memorial Public Library', url: 'https://www.eastpalestinelibrary.org', eventsUrl: 'https://www.eastpalestinelibrary.org/events', city: 'East Palestine', state: 'OH', zipCode: '44413', county: 'East Palestine County'},
  { name: 'Preble County District Library', url: 'https://www.eatonlibrary.org', eventsUrl: 'https://www.eatonlibrary.org/events', city: 'Eaton', state: 'OH', zipCode: '45320', county: 'Eaton County'},
  { name: 'Harris-Elmore Public Library', url: 'https://www.elmorelibrary.org', eventsUrl: 'https://www.elmorelibrary.org/events', city: 'Elmore', state: 'OH', zipCode: '43416', county: 'Elmore County'},
  { name: 'Elyria Public Library', url: 'https://www.elyrialibrary.org', eventsUrl: 'https://www.elyrialibrary.org/events', city: 'Elyria', state: 'OH', zipCode: '44035', county: 'Elyria County'},
  { name: 'Euclid Public Library', url: 'https://www.euclidlibrary.org', eventsUrl: 'https://www.euclidlibrary.org/events', city: 'Euclid', state: 'OH', zipCode: '44123', county: 'Euclid County'},
  { name: 'Fairport Harbor Public Library', url: 'https://www.fairportharborlibrary.org', eventsUrl: 'https://www.fairportharborlibrary.org/events', city: 'Fairport Harbor', state: 'OH', zipCode: '44077', county: 'Fairport Harbor County'},
  { name: 'Normal Memorial Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'OH', zipCode: '43521', county: 'Fayette County'},
  { name: 'Findlay Hancock Cnty Dist Public Library', url: 'https://www.findlaylibrary.org', eventsUrl: 'https://www.findlaylibrary.org/events', city: 'Findlay', state: 'OH', zipCode: '45840', county: 'Findlay County'},
  { name: 'Forest-Jackson Public Library', url: 'https://www.forestlibrary.org', eventsUrl: 'https://www.forestlibrary.org/events', city: 'Forest', state: 'OH', zipCode: '45843', county: 'Forest County'},
  { name: 'Fort Recovery Public Library', url: 'https://www.fortrecoverylibrary.org', eventsUrl: 'https://www.fortrecoverylibrary.org/events', city: 'Fort Recovery', state: 'OH', zipCode: '45846', county: 'Fort Recovery County'},
  { name: 'Kaubisch Memorial Public Library', url: 'https://www.fostorialibrary.org', eventsUrl: 'https://www.fostorialibrary.org/events', city: 'Fostoria', state: 'OH', zipCode: '44830', county: 'Fostoria County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'OH', zipCode: '45005', county: 'Franklin County'},
  { name: 'Birchard Public Library Of Sandusky County', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'OH', zipCode: '43420', county: 'Fremont County'},
  { name: 'Galion Public Library Association', url: 'https://www.galionlibrary.org', eventsUrl: 'https://www.galionlibrary.org/events', city: 'Galion', state: 'OH', zipCode: '44833', county: 'Galion County'},
  { name: 'Dr. Samuel L. Bossard Memorial Library', url: 'https://www.gallipolislibrary.org', eventsUrl: 'https://www.gallipolislibrary.org/events', city: 'Gallipolis', state: 'OH', zipCode: '45631', county: 'Gallipolis County'},
  { name: 'Portage County District Library', url: 'https://www.garrettsvillelibrary.org', eventsUrl: 'https://www.garrettsvillelibrary.org/events', city: 'Garrettsville', state: 'OH', zipCode: '44231', county: 'Garrettsville County'},
  { name: 'Brown County Public Library', url: 'https://www.georgetownlibrary.org', eventsUrl: 'https://www.georgetownlibrary.org/events', city: 'Georgetown', state: 'OH', zipCode: '45121', county: 'Georgetown County'},
  { name: 'Germantown Public Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'OH', zipCode: '45327', county: 'Germantown County'},
  { name: 'Girard Free Library', url: 'https://www.girardlibrary.org', eventsUrl: 'https://www.girardlibrary.org/events', city: 'Girard', state: 'OH', zipCode: '44420', county: 'Girard County'},
  { name: 'Gnadenhuttenp.L.-Indian Valley School Dist.', url: 'https://www.gnadenhuttenlibrary.org', eventsUrl: 'https://www.gnadenhuttenlibrary.org/events', city: 'Gnadenhutten', state: 'OH', zipCode: '44629', county: 'Gnadenhutten County'},
  { name: 'Grafton-Midview Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'OH', zipCode: '44044', county: 'Grafton County'},
  { name: 'Grandview Heights Public Library', url: 'https://www.grandviewhtslibrary.org', eventsUrl: 'https://www.grandviewhtslibrary.org/events', city: 'Grandview Hts.', state: 'OH', zipCode: '43212', county: 'Grandview Hts. County'},
  { name: 'Granville Public Library', url: 'https://www.granvillelibrary.org', eventsUrl: 'https://www.granvillelibrary.org/events', city: 'Granville', state: 'OH', zipCode: '43023', county: 'Granville County'},
  { name: 'Marion Lawrence Memorial Library', url: 'https://www.gratislibrary.org', eventsUrl: 'https://www.gratislibrary.org/events', city: 'Gratis', state: 'OH', zipCode: '45330', county: 'Gratis County'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'OH', zipCode: '45331', county: 'Greenville County'},
  { name: 'Southwest Public Libraries', url: 'https://www.grovecitylibrary.org', eventsUrl: 'https://www.grovecitylibrary.org/events', city: 'Grove City', state: 'OH', zipCode: '43123', county: 'Grove City County'},
  { name: 'Lane Public Library', url: 'https://www.hamiltonlibrary.org', eventsUrl: 'https://www.hamiltonlibrary.org/events', city: 'Hamilton', state: 'OH', zipCode: '45011', county: 'Hamilton County'},
  { name: 'Highland County District Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'OH', zipCode: '45133', county: 'Hillsboro County'},
  { name: 'Holgate Community Library', url: 'https://www.holgatelibrary.org', eventsUrl: 'https://www.holgatelibrary.org/events', city: 'Holgate', state: 'OH', zipCode: '43527', county: 'Holgate County'},
  { name: 'Homer Public Library', url: 'https://www.homerlibrary.org', eventsUrl: 'https://www.homerlibrary.org/events', city: 'Homer', state: 'OH', zipCode: '43027', county: 'Homer County'},
  { name: 'Hubbard Public Library', url: 'https://www.hubbardlibrary.org', eventsUrl: 'https://www.hubbardlibrary.org/events', city: 'Hubbard', state: 'OH', zipCode: '44425', county: 'Hubbard County'},
  { name: 'Hudson Library And Historical Society', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'OH', zipCode: '44236', county: 'Hudson County'},
  { name: 'Huron Public Library', url: 'https://www.huronlibrary.org', eventsUrl: 'https://www.huronlibrary.org/events', city: 'Huron', state: 'OH', zipCode: '44839', county: 'Huron County'},
  { name: 'Briggs Lawrence County Public Library', url: 'https://www.irontonlibrary.org', eventsUrl: 'https://www.irontonlibrary.org/events', city: 'Ironton', state: 'OH', zipCode: '45638', county: 'Ironton County'},
  { name: 'Jackson City Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'OH', zipCode: '45640', county: 'Jackson County'},
  { name: 'Henderson Memorial Public Library Association', url: 'https://www.jeffersonlibrary.org', eventsUrl: 'https://www.jeffersonlibrary.org/events', city: 'Jefferson', state: 'OH', zipCode: '44047', county: 'Jefferson County'},
  { name: 'Kent Free Library', url: 'https://www.kentlibrary.org', eventsUrl: 'https://www.kentlibrary.org/events', city: 'Kent', state: 'OH', zipCode: '44240', county: 'Kent County'},
  { name: 'Mary Lou Johnson-Hardin Cnty Pl', url: 'https://www.kentonlibrary.org', eventsUrl: 'https://www.kentonlibrary.org/events', city: 'Kenton', state: 'OH', zipCode: '44326', county: 'Kenton County'},
  { name: 'Kingsville Public Library', url: 'https://www.kingsvillelibrary.org', eventsUrl: 'https://www.kingsvillelibrary.org/events', city: 'Kingsville', state: 'OH', zipCode: '44048', county: 'Kingsville County'},
  { name: 'Kinsman Free Public Library', url: 'https://www.kinsmanlibrary.org', eventsUrl: 'https://www.kinsmanlibrary.org/events', city: 'Kinsman', state: 'OH', zipCode: '44428', county: 'Kinsman County'},
  { name: 'Kirtland Public Library', url: 'https://www.kirtlandlibrary.org', eventsUrl: 'https://www.kirtlandlibrary.org/events', city: 'Kirtland', state: 'OH', zipCode: '44094', county: 'Kirtland County'},
  { name: 'Lakewood Public Library', url: 'https://www.lakewoodlibrary.org', eventsUrl: 'https://www.lakewoodlibrary.org/events', city: 'Lakewood', state: 'OH', zipCode: '44107', county: 'Lakewood County'},
  { name: 'Fairfield County District Library', url: 'https://www.lancasterlibrary.org', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'OH', zipCode: '43130', county: 'Lancaster County'},
  { name: 'Lebanon Public Library', url: 'https://www.lebanonlibrary.org', eventsUrl: 'https://www.lebanonlibrary.org/events', city: 'Lebanon', state: 'OH', zipCode: '45036', county: 'Lebanon County'},
  { name: 'Leetonia Community Public Library', url: 'https://www.leetonialibrary.org', eventsUrl: 'https://www.leetonialibrary.org/events', city: 'Leetonia', state: 'OH', zipCode: '44431', county: 'Leetonia County'},
  { name: 'Brown Memorial Library', url: 'https://www.lewisburglibrary.org', eventsUrl: 'https://www.lewisburglibrary.org/events', city: 'Lewisburg', state: 'OH', zipCode: '45338', county: 'Lewisburg County'},
  { name: 'Liberty Center Public Library', url: 'https://www.libertycenterlibrary.org', eventsUrl: 'https://www.libertycenterlibrary.org/events', city: 'Liberty Center', state: 'OH', zipCode: '43532', county: 'Liberty Center County'},
  { name: 'Lima Public Library', url: 'https://www.limalibrary.org', eventsUrl: 'https://www.limalibrary.org/events', city: 'Lima', state: 'OH', zipCode: '45801', county: 'Lima County'},
  { name: 'Lepper Library', url: 'https://www.lisbonlibrary.org', eventsUrl: 'https://www.lisbonlibrary.org/events', city: 'Lisbon', state: 'OH', zipCode: '44432', county: 'Lisbon County'},
  { name: 'Wagnalls Memorial Library', url: 'https://www.lithopolislibrary.org', eventsUrl: 'https://www.lithopolislibrary.org/events', city: 'Lithopolis', state: 'OH', zipCode: '43136', county: 'Lithopolis County'},
  { name: 'Logan-Hocking County District Library', url: 'https://www.loganlibrary.org', eventsUrl: 'https://www.loganlibrary.org/events', city: 'Logan', state: 'OH', zipCode: '43138', county: 'Logan County'},
  { name: 'London Public Library', url: 'https://www.londonlibrary.org', eventsUrl: 'https://www.londonlibrary.org/events', city: 'London', state: 'OH', zipCode: '43140', county: 'London County'},
  { name: 'Lorain Public Library', url: 'https://www.lorainlibrary.org', eventsUrl: 'https://www.lorainlibrary.org/events', city: 'Lorain', state: 'OH', zipCode: '44052', county: 'Lorain County'},
  { name: 'Loudonville Public Library', url: 'https://www.loudonvillelibrary.org', eventsUrl: 'https://www.loudonvillelibrary.org/events', city: 'Loudonville', state: 'OH', zipCode: '44842', county: 'Loudonville County'},
  { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'OH', zipCode: '44641', county: 'Louisville County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'OH', zipCode: '44057', county: 'Madison County'},
  { name: 'Mansfield-Richland County Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'OH', zipCode: '44902', county: 'Mansfield County'},
  { name: 'Washington County Public Library', url: 'https://www.mariettalibrary.org', eventsUrl: 'https://www.mariettalibrary.org/events', city: 'Marietta', state: 'OH', zipCode: '45750', county: 'Marietta County'},
  { name: 'Marion Public Library', url: 'https://www.marionlibrary.org', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'OH', zipCode: '43302', county: 'Marion County'},
  { name: 'Martins Ferry Public Library', url: 'https://www.martinsferrylibrary.org', eventsUrl: 'https://www.martinsferrylibrary.org/events', city: 'Martins Ferry', state: 'OH', zipCode: '43935', county: 'Martins Ferry County'},
  { name: 'Marysville Public Library', url: 'https://www.marysvillelibrary.org', eventsUrl: 'https://www.marysvillelibrary.org/events', city: 'Marysville', state: 'OH', zipCode: '43040', county: 'Marysville County'},
  { name: 'Mason Public Library', url: 'https://www.masonlibrary.org', eventsUrl: 'https://www.masonlibrary.org/events', city: 'Mason', state: 'OH', zipCode: '45040', county: 'Mason County'},
  { name: 'Massillon Public Library', url: 'https://www.massillonlibrary.org', eventsUrl: 'https://www.massillonlibrary.org/events', city: 'Massillon', state: 'OH', zipCode: '44646', county: 'Massillon County'},
  { name: 'Herbert Wescoat Memorial Library', url: 'https://www.mcarthurlibrary.org', eventsUrl: 'https://www.mcarthurlibrary.org/events', city: 'Mcarthur', state: 'OH', zipCode: '45651', county: 'Mcarthur County'},
  { name: 'Mccomb Public Library', url: 'https://www.mccomblibrary.org', eventsUrl: 'https://www.mccomblibrary.org/events', city: 'Mccomb', state: 'OH', zipCode: '45858', county: 'Mccomb County'},
  { name: 'Kate Love Simpson-Morgan County Library', url: 'https://www.mcconnelsvillelibrary.org', eventsUrl: 'https://www.mcconnelsvillelibrary.org/events', city: 'Mcconnelsville', state: 'OH', zipCode: '43756', county: 'Mcconnelsville County'},
  { name: 'Mechanicsburg Public Library', url: 'https://www.mechanicsburglibrary.org', eventsUrl: 'https://www.mechanicsburglibrary.org/events', city: 'Mechanicsburg', state: 'OH', zipCode: '43044', county: 'Mechanicsburg County'},
  { name: 'Medina County District Library', url: 'https://www.medinalibrary.org', eventsUrl: 'https://www.medinalibrary.org/events', city: 'Medina', state: 'OH', zipCode: '44256', county: 'Medina County'},
  { name: 'Mentor Public Library', url: 'https://www.mentorlibrary.org', eventsUrl: 'https://www.mentorlibrary.org/events', city: 'Mentor', state: 'OH', zipCode: '44060', county: 'Mentor County'},
  { name: 'Evergreen Community Library', url: 'https://www.metamoralibrary.org', eventsUrl: 'https://www.metamoralibrary.org/events', city: 'Metamora', state: 'OH', zipCode: '43540', county: 'Metamora County'},
  { name: 'Middletown Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'OH', zipCode: '45044', county: 'Middletown County'},
  { name: 'Milan-Berlin Township Public Library-Berlin-Milan Local Sd', url: 'https://www.milanlibrary.org', eventsUrl: 'https://www.milanlibrary.org/events', city: 'Milan', state: 'OH', zipCode: '44846', county: 'Milan County'},
  { name: 'Holmes County District Public Library', url: 'https://www.millersburglibrary.org', eventsUrl: 'https://www.millersburglibrary.org/events', city: 'Millersburg', state: 'OH', zipCode: '44654', county: 'Millersburg County'},
  { name: 'Minerva Public Library', url: 'https://www.minervalibrary.org', eventsUrl: 'https://www.minervalibrary.org/events', city: 'Minerva', state: 'OH', zipCode: '44657', county: 'Minerva County'},
  { name: 'Monroeville Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'OH', zipCode: '44847', county: 'Monroeville County'},
  { name: 'Montpelier Public Library', url: 'https://www.montpelierlibrary.org', eventsUrl: 'https://www.montpelierlibrary.org/events', city: 'Montpelier', state: 'OH', zipCode: '43543', county: 'Montpelier County'},
  { name: 'Salem Township Public Library', url: 'https://www.morrowlibrary.org', eventsUrl: 'https://www.morrowlibrary.org/events', city: 'Morrow', state: 'OH', zipCode: '45152', county: 'Morrow County'},
  { name: 'Mt Gilead Public Library', url: 'https://www.mtgileadlibrary.org', eventsUrl: 'https://www.mtgileadlibrary.org/events', city: 'Mt. Gilead', state: 'OH', zipCode: '43338', county: 'Mt. Gilead County'},
  { name: 'Brown County Public Library', url: 'https://www.mtorablibrary.org', eventsUrl: 'https://www.mtorablibrary.org/events', city: 'Mt. Orab', state: 'OH', zipCode: '45154', county: 'Mt. Orab County'},
  { name: 'Mt Sterling Public Library', url: 'https://www.mtsterlinglibrary.org', eventsUrl: 'https://www.mtsterlinglibrary.org/events', city: 'Mt. Sterling', state: 'OH', zipCode: '43143', county: 'Mt. Sterling County'},
  { name: 'Mt Vernon Knox County, Public Library Of', url: 'https://www.mtvernonlibrary.org', eventsUrl: 'https://www.mtvernonlibrary.org/events', city: 'Mt. Vernon', state: 'OH', zipCode: '43050', county: 'Mt. Vernon County'},
  { name: 'Ridgemont Public Library', url: 'https://www.mtvictorylibrary.org', eventsUrl: 'https://www.mtvictorylibrary.org/events', city: 'Mt. Victory', state: 'OH', zipCode: '43340', county: 'Mt. Victory County'},
  { name: 'Napoleon Public Library', url: 'https://www.napoleonlibrary.org', eventsUrl: 'https://www.napoleonlibrary.org/events', city: 'Napoleon', state: 'OH', zipCode: '43545', county: 'Napoleon County'},
  { name: 'Nelsonville Public Library', url: 'https://www.nelsonvillelibrary.org', eventsUrl: 'https://www.nelsonvillelibrary.org/events', city: 'Nelsonville', state: 'OH', zipCode: '45764', county: 'Nelsonville County'},
  { name: 'New Carlisle Public Library', url: 'https://www.newcarlislelibrary.org', eventsUrl: 'https://www.newcarlislelibrary.org/events', city: 'New Carlisle', state: 'OH', zipCode: '45344', county: 'New Carlisle County'},
  { name: 'Perry County District Library', url: 'https://www.newlexingtonlibrary.org', eventsUrl: 'https://www.newlexingtonlibrary.org/events', city: 'New Lexington', state: 'OH', zipCode: '43764', county: 'New Lexington County'},
  { name: 'New London Public Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'OH', zipCode: '44851', county: 'New London County'},
  { name: 'New Madison Public Library', url: 'https://www.newmadisonlibrary.org', eventsUrl: 'https://www.newmadisonlibrary.org/events', city: 'New Madison', state: 'OH', zipCode: '45346', county: 'New Madison County'},
  { name: 'Tuscarawas County Public Library', url: 'https://www.newphiladelphialibrary.org', eventsUrl: 'https://www.newphiladelphialibrary.org/events', city: 'New Philadelphia', state: 'OH', zipCode: '44663', county: 'New Philadelphia County'},
  { name: 'New Straitsville Public Library', url: 'https://www.newstraitsvillelibrary.org', eventsUrl: 'https://www.newstraitsvillelibrary.org/events', city: 'New Straitsville', state: 'OH', zipCode: '43766', county: 'New Straitsville County'},
  { name: 'Licking County Library', url: 'https://www.newarklibrary.org', eventsUrl: 'https://www.newarklibrary.org/events', city: 'Newark', state: 'OH', zipCode: '43055', county: 'Newark County'},
  { name: 'Newcomerstown Public Library', url: 'https://www.newcomerstownlibrary.org', eventsUrl: 'https://www.newcomerstownlibrary.org/events', city: 'Newcomerstown', state: 'OH', zipCode: '43832', county: 'Newcomerstown County'},
  { name: 'Newton Falls Public Library', url: 'https://www.newtonfallslibrary.org', eventsUrl: 'https://www.newtonfallslibrary.org/events', city: 'Newton Falls', state: 'OH', zipCode: '44444', county: 'Newton Falls County'},
  { name: 'Mckinley Memorial Library', url: 'https://www.nileslibrary.org', eventsUrl: 'https://www.nileslibrary.org/events', city: 'Niles', state: 'OH', zipCode: '44446', county: 'Niles County'},
  { name: 'North Baltimore Public Library', url: 'https://www.northbaltimorelibrary.org', eventsUrl: 'https://www.northbaltimorelibrary.org/events', city: 'North Baltimore', state: 'OH', zipCode: '45872', county: 'North Baltimore County'},
  { name: 'North Canton Public Library', url: 'https://www.northcantonlibrary.org', eventsUrl: 'https://www.northcantonlibrary.org/events', city: 'North Canton', state: 'OH', zipCode: '44720', county: 'North Canton County'},
  { name: 'Norwalk Public Library', url: 'https://www.norwalklibrary.org', eventsUrl: 'https://www.norwalklibrary.org/events', city: 'Norwalk', state: 'OH', zipCode: '44857', county: 'Norwalk County'},
  { name: 'Oak Harbor Public Library', url: 'https://www.oakharborlibrary.org', eventsUrl: 'https://www.oakharborlibrary.org/events', city: 'Oak Harbor', state: 'OH', zipCode: '43449', county: 'Oak Harbor County'},
  { name: 'Oak Hill Public Library', url: 'https://www.oakhilllibrary.org', eventsUrl: 'https://www.oakhilllibrary.org/events', city: 'Oak Hill', state: 'OH', zipCode: '45656', county: 'Oak Hill County'},
  { name: 'Wright Memorial Public Library', url: 'https://www.oakwoodlibrary.org', eventsUrl: 'https://www.oakwoodlibrary.org/events', city: 'Oakwood', state: 'OH', zipCode: '45419', county: 'Oakwood County'},
  { name: 'Oberlin Public Library', url: 'https://www.oberlinlibrary.org', eventsUrl: 'https://www.oberlinlibrary.org/events', city: 'Oberlin', state: 'OH', zipCode: '44074', county: 'Oberlin County'},
  { name: 'Orrville Public Library', url: 'https://www.orrvillelibrary.org', eventsUrl: 'https://www.orrvillelibrary.org/events', city: 'Orrville', state: 'OH', zipCode: '44667', county: 'Orrville County'},
  { name: 'Grand Valley Public Library', url: 'https://www.orwelllibrary.org', eventsUrl: 'https://www.orwelllibrary.org/events', city: 'Orwell', state: 'OH', zipCode: '44076', county: 'Orwell County'},
  { name: 'Putnam County District Library', url: 'https://www.ottawalibrary.org', eventsUrl: 'https://www.ottawalibrary.org/events', city: 'Ottawa', state: 'OH', zipCode: '45875', county: 'Ottawa County'},
  { name: 'Morley Library', url: 'https://www.painesvillelibrary.org', eventsUrl: 'https://www.painesvillelibrary.org/events', city: 'Painesville', state: 'OH', zipCode: '44077', county: 'Painesville County'},
  { name: 'Pataskala Public Library', url: 'https://www.pataskalalibrary.org', eventsUrl: 'https://www.pataskalalibrary.org/events', city: 'Pataskala', state: 'OH', zipCode: '43062', county: 'Pataskala County'},
  { name: 'Paulding County Carnegie Library', url: 'https://www.pauldinglibrary.org', eventsUrl: 'https://www.pauldinglibrary.org/events', city: 'Paulding', state: 'OH', zipCode: '45879', county: 'Paulding County'},
  { name: 'Adams County Public Library', url: 'https://www.peebleslibrary.org', eventsUrl: 'https://www.peebleslibrary.org/events', city: 'Peebles', state: 'OH', zipCode: '45660', county: 'Peebles County'},
  { name: 'Pemberville Public Library', url: 'https://www.pembervillelibrary.org', eventsUrl: 'https://www.pembervillelibrary.org/events', city: 'Pemberville', state: 'OH', zipCode: '43450', county: 'Pemberville County'},
  { name: 'Peninsula Library Historical Society', url: 'https://www.peninsulalibrary.org', eventsUrl: 'https://www.peninsulalibrary.org/events', city: 'Peninsula', state: 'OH', zipCode: '44264', county: 'Peninsula County'},
  { name: 'Perry Public Library', url: 'https://www.perrylibrary.org', eventsUrl: 'https://www.perrylibrary.org/events', city: 'Perry', state: 'OH', zipCode: '44081', county: 'Perry County'},
  { name: 'Way Public Library', url: 'https://www.perrysburglibrary.org', eventsUrl: 'https://www.perrysburglibrary.org/events', city: 'Perrysburg', state: 'OH', zipCode: '43551', county: 'Perrysburg County'},
  { name: 'Pickerington Public Library', url: 'https://www.pickeringtonlibrary.org', eventsUrl: 'https://www.pickeringtonlibrary.org/events', city: 'Pickerington', state: 'OH', zipCode: '43147', county: 'Pickerington County'},
  { name: 'Piqua Public Library', url: 'https://www.piqualibrary.org', eventsUrl: 'https://www.piqualibrary.org/events', city: 'Piqua', state: 'OH', zipCode: '45356', county: 'Piqua County'},
  { name: 'Plain City Public Library', url: 'https://www.plaincitylibrary.org', eventsUrl: 'https://www.plaincitylibrary.org/events', city: 'Plain City', state: 'OH', zipCode: '43064', county: 'Plain City County'},
  { name: 'Meigs County District Public Library', url: 'https://www.pomeroylibrary.org', eventsUrl: 'https://www.pomeroylibrary.org/events', city: 'Pomeroy', state: 'OH', zipCode: '45769', county: 'Pomeroy County'},
  { name: 'Ida Rupp Public Library', url: 'https://www.portclintonlibrary.org', eventsUrl: 'https://www.portclintonlibrary.org/events', city: 'Port Clinton', state: 'OH', zipCode: '43452', county: 'Port Clinton County'},
  { name: 'Portsmouth Public Library', url: 'https://www.portsmouthlibrary.org', eventsUrl: 'https://www.portsmouthlibrary.org/events', city: 'Portsmouth', state: 'OH', zipCode: '45662', county: 'Portsmouth County'},
  { name: 'Reed Memorial Library', url: 'https://www.ravennalibrary.org', eventsUrl: 'https://www.ravennalibrary.org/events', city: 'Ravenna', state: 'OH', zipCode: '44266', county: 'Ravenna County'},
  { name: 'Richwood-North Union Public Library', url: 'https://www.richwoodlibrary.org', eventsUrl: 'https://www.richwoodlibrary.org/events', city: 'Richwood', state: 'OH', zipCode: '43344', county: 'Richwood County'},
  { name: 'Union Township Public Library', url: 'https://www.ripleylibrary.org', eventsUrl: 'https://www.ripleylibrary.org/events', city: 'Ripley', state: 'OH', zipCode: '45167', county: 'Ripley County'},
  { name: 'Rock Creek Public Library', url: 'https://www.rockcreeklibrary.org', eventsUrl: 'https://www.rockcreeklibrary.org/events', city: 'Rock Creek', state: 'OH', zipCode: '44084', county: 'Rock Creek County'},
  { name: 'Rockford Carnegie Library', url: 'https://www.rockfordlibrary.org', eventsUrl: 'https://www.rockfordlibrary.org/events', city: 'Rockford', state: 'OH', zipCode: '45882', county: 'Rockford County'},
  { name: 'Rocky River Public Library', url: 'https://www.rockyriverlibrary.org', eventsUrl: 'https://www.rockyriverlibrary.org/events', city: 'Rocky River', state: 'OH', zipCode: '44116', county: 'Rocky River County'},
  { name: 'Rossford Public Library', url: 'https://www.rossfordlibrary.org', eventsUrl: 'https://www.rossfordlibrary.org/events', city: 'Rossford', state: 'OH', zipCode: '43460', county: 'Rossford County'},
  { name: 'Sabina Public Library', url: 'https://www.sabinalibrary.org', eventsUrl: 'https://www.sabinalibrary.org/events', city: 'Sabina', state: 'OH', zipCode: '45169', county: 'Sabina County'},
  { name: 'Salem Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'OH', zipCode: '44460', county: 'Salem County'},
  { name: 'Sandusky Library', url: 'https://www.sanduskylibrary.org', eventsUrl: 'https://www.sanduskylibrary.org/events', city: 'Sandusky', state: 'OH', zipCode: '44870', county: 'Sandusky County'},
  { name: 'Shaker Heights Public Library', url: 'https://www.shakerheightslibrary.org', eventsUrl: 'https://www.shakerheightslibrary.org/events', city: 'Shaker Heights', state: 'OH', zipCode: '44120', county: 'Shaker Heights County'},
  { name: 'Perry Cook Memorial Public Library', url: 'https://www.shaucklibrary.org', eventsUrl: 'https://www.shaucklibrary.org/events', city: 'Shauck', state: 'OH', zipCode: '43349', county: 'Shauck County'},
  { name: 'Marvin Memorial Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'OH', zipCode: '44875', county: 'Shelby County'},
  { name: 'Shelby County Libraries - Amos Memorial', url: 'https://www.sidneylibrary.org', eventsUrl: 'https://www.sidneylibrary.org/events', city: 'Sidney', state: 'OH', zipCode: '45365', county: 'Sidney County'},
  { name: 'Clark County Public Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'OH', zipCode: '45506', county: 'Springfield County'},
  { name: 'St. Clairsville Public Library', url: 'https://www.stclairsvillelibrary.org', eventsUrl: 'https://www.stclairsvillelibrary.org/events', city: 'St. Clairsville', state: 'OH', zipCode: '43950', county: 'St. Clairsville County'},
  { name: 'St. Marys Community Public Library', url: 'https://www.stmaryslibrary.org', eventsUrl: 'https://www.stmaryslibrary.org/events', city: 'St. Marys', state: 'OH', zipCode: '45885', county: 'St. Marys County'},
  { name: 'St. Paris Public Library', url: 'https://www.stparislibrary.org', eventsUrl: 'https://www.stparislibrary.org/events', city: 'St. Paris', state: 'OH', zipCode: '43072', county: 'St. Paris County'},
  { name: 'Steubenville Jefferson County, Pl Of', url: 'https://www.steubenvillelibrary.org', eventsUrl: 'https://www.steubenvillelibrary.org/events', city: 'Steubenville', state: 'OH', zipCode: '43952', county: 'Steubenville County'},
  { name: 'Stow-Munroe Falls Public Library', url: 'https://www.stowlibrary.org', eventsUrl: 'https://www.stowlibrary.org/events', city: 'Stow', state: 'OH', zipCode: '44224', county: 'Stow County'},
  { name: 'Community Library', url: 'https://www.sunburylibrary.org', eventsUrl: 'https://www.sunburylibrary.org/events', city: 'Sunbury', state: 'OH', zipCode: '43074', county: 'Sunbury County'},
  { name: 'Swanton Public Library', url: 'https://www.swantonlibrary.org', eventsUrl: 'https://www.swantonlibrary.org/events', city: 'Swanton', state: 'OH', zipCode: '43558', county: 'Swanton County'},
  { name: 'Mohawk Community Library', url: 'https://www.sycamorelibrary.org', eventsUrl: 'https://www.sycamorelibrary.org/events', city: 'Sycamore', state: 'OH', zipCode: '44882', county: 'Sycamore County'},
  { name: 'Tiffin-Seneca Public Library', url: 'https://www.tiffinlibrary.org', eventsUrl: 'https://www.tiffinlibrary.org/events', city: 'Tiffin', state: 'OH', zipCode: '44883', county: 'Tiffin County'},
  { name: 'Tipp City Public Library', url: 'https://www.tippcitylibrary.org', eventsUrl: 'https://www.tippcitylibrary.org/events', city: 'Tipp City', state: 'OH', zipCode: '45371', county: 'Tipp City County'},
  { name: 'Toledo-Lucas County Public Library', url: 'https://www.toledolibrary.org', eventsUrl: 'https://www.toledolibrary.org/events', city: 'Toledo', state: 'OH', zipCode: '43604', county: 'Toledo County'},
  { name: 'Troy-Miami County Public Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'OH', zipCode: '45373', county: 'Troy County'},
  { name: 'Twinsburg Public Library', url: 'https://www.twinsburglibrary.org', eventsUrl: 'https://www.twinsburglibrary.org/events', city: 'Twinsburg', state: 'OH', zipCode: '44087', county: 'Twinsburg County'},
  { name: 'Claymont School District Public Library', url: 'https://www.uhrichsvillelibrary.org', eventsUrl: 'https://www.uhrichsvillelibrary.org/events', city: 'Uhrichsville', state: 'OH', zipCode: '44683', county: 'Uhrichsville County'},
  { name: 'Upper Arlington Public Library', url: 'https://www.upperarlingtonlibrary.org', eventsUrl: 'https://www.upperarlingtonlibrary.org/events', city: 'Upper Arlington', state: 'OH', zipCode: '43221', county: 'Upper Arlington County'},
  { name: 'Upper Sandusky Community Library', url: 'https://www.uppersanduskylibrary.org', eventsUrl: 'https://www.uppersanduskylibrary.org/events', city: 'Upper Sandusky', state: 'OH', zipCode: '43351', county: 'Upper Sandusky County'},
  { name: 'Champaign County Library', url: 'https://www.urbanalibrary.org', eventsUrl: 'https://www.urbanalibrary.org/events', city: 'Urbana', state: 'OH', zipCode: '43078', county: 'Urbana County'},
  { name: 'Brumback Library', url: 'https://www.vanwertlibrary.org', eventsUrl: 'https://www.vanwertlibrary.org/events', city: 'Van Wert', state: 'OH', zipCode: '45891', county: 'Van Wert County'},
  { name: 'Ritter Public Library', url: 'https://www.vermilionlibrary.org', eventsUrl: 'https://www.vermilionlibrary.org/events', city: 'Vermilion', state: 'OH', zipCode: '44089', county: 'Vermilion County'},
  { name: 'Worch Memorial Public Library', url: 'https://www.versailleslibrary.org', eventsUrl: 'https://www.versailleslibrary.org/events', city: 'Versailles', state: 'OH', zipCode: '45380', county: 'Versailles County'},
  { name: 'Ella M. Everhard Public Library', url: 'https://www.wadsworthlibrary.org', eventsUrl: 'https://www.wadsworthlibrary.org/events', city: 'Wadsworth', state: 'OH', zipCode: '44281', county: 'Wadsworth County'},
  { name: 'Auglaize County Public District Library', url: 'https://www.wapakonetalibrary.org', eventsUrl: 'https://www.wapakonetalibrary.org/events', city: 'Wapakoneta', state: 'OH', zipCode: '45895', county: 'Wapakoneta County'},
  { name: 'Northeast Ohio Regional Library System', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'OH', zipCode: '44483', county: 'Warren County'},
  { name: 'Carnegie Public Library', url: 'https://www.washingtonchlibrary.org', eventsUrl: 'https://www.washingtonchlibrary.org/events', city: 'Washington Ch', state: 'OH', zipCode: '43160', county: 'Washington Ch County'},
  { name: 'Wauseon Public Library', url: 'https://www.wauseonlibrary.org', eventsUrl: 'https://www.wauseonlibrary.org/events', city: 'Wauseon', state: 'OH', zipCode: '43567', county: 'Wauseon County'},
  { name: 'Garnet A. Wilson Pl Of Pike Co', url: 'https://www.waverlylibrary.org', eventsUrl: 'https://www.waverlylibrary.org/events', city: 'Waverly', state: 'OH', zipCode: '45690', county: 'Waverly County'},
  { name: 'Wayne Public Library', url: 'https://www.waynelibrary.org', eventsUrl: 'https://www.waynelibrary.org/events', city: 'Wayne', state: 'OH', zipCode: '43466', county: 'Wayne County'},
  { name: 'Mary L. Cook Public Library', url: 'https://www.waynesvillelibrary.org', eventsUrl: 'https://www.waynesvillelibrary.org/events', city: 'Waynesville', state: 'OH', zipCode: '45068', county: 'Waynesville County'},
  { name: 'Herrick Memorial Public Library', url: 'https://www.wellingtonlibrary.org', eventsUrl: 'https://www.wellingtonlibrary.org/events', city: 'Wellington', state: 'OH', zipCode: '44090', county: 'Wellington County'},
  { name: 'Sylvester Memorial Wellston Public Library', url: 'https://www.wellstonlibrary.org', eventsUrl: 'https://www.wellstonlibrary.org/events', city: 'Wellston', state: 'OH', zipCode: '45692', county: 'Wellston County'},
  { name: 'Wellsville Carnegie Public Library', url: 'https://www.wellsvillelibrary.org', eventsUrl: 'https://www.wellsvillelibrary.org/events', city: 'Wellsville', state: 'OH', zipCode: '43968', county: 'Wellsville County'},
  { name: 'Hurt-Battelle Memorial Librarywest Jefferson', url: 'https://www.westjeffersonlibrary.org', eventsUrl: 'https://www.westjeffersonlibrary.org/events', city: 'West Jefferson', state: 'OH', zipCode: '43162', county: 'West Jefferson County'},
  { name: 'Milton Union Public Library', url: 'https://www.westmiltonlibrary.org', eventsUrl: 'https://www.westmiltonlibrary.org/events', city: 'West Milton', state: 'OH', zipCode: '45383', county: 'West Milton County'},
  { name: 'Westerville Public Library', url: 'https://www.westervillelibrary.org', eventsUrl: 'https://www.westervillelibrary.org/events', city: 'Westerville', state: 'OH', zipCode: '43081', county: 'Westerville County'},
  { name: 'Porter Public Library', url: 'https://www.westlakelibrary.org', eventsUrl: 'https://www.westlakelibrary.org/events', city: 'Westlake', state: 'OH', zipCode: '44145', county: 'Westlake County'},
  { name: 'Weston Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'OH', zipCode: '43569', county: 'Weston County'},
  { name: 'Wickliffe Public Library', url: 'https://www.wickliffelibrary.org', eventsUrl: 'https://www.wickliffelibrary.org/events', city: 'Wickliffe', state: 'OH', zipCode: '44092', county: 'Wickliffe County'},
  { name: 'Willard Memorial Library', url: 'https://www.willardlibrary.org', eventsUrl: 'https://www.willardlibrary.org/events', city: 'Willard', state: 'OH', zipCode: '44890', county: 'Willard County'},
  { name: 'Willoughby-Eastlake Public Library', url: 'https://www.willowicklibrary.org', eventsUrl: 'https://www.willowicklibrary.org/events', city: 'Willowick', state: 'OH', zipCode: '44095', county: 'Willowick County'},
  { name: 'Wilmington Public Library Of Clinton County', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'OH', zipCode: '45177', county: 'Wilmington County'},
  { name: 'Monroe County District Library', url: 'https://www.woodsfieldlibrary.org', eventsUrl: 'https://www.woodsfieldlibrary.org/events', city: 'Woodsfield', state: 'OH', zipCode: '43793', county: 'Woodsfield County'},
  { name: 'Wayne County Public Library', url: 'https://www.woosterlibrary.org', eventsUrl: 'https://www.woosterlibrary.org/events', city: 'Wooster', state: 'OH', zipCode: '44691', county: 'Wooster County'},
  { name: 'Worthington Public Library', url: 'https://www.worthingtonlibrary.org', eventsUrl: 'https://www.worthingtonlibrary.org/events', city: 'Worthington', state: 'OH', zipCode: '43085', county: 'Worthington County'},
  { name: 'Greene County Public Library', url: 'https://www.xenialibrary.org', eventsUrl: 'https://www.xenialibrary.org/events', city: 'Xenia', state: 'OH', zipCode: '45385', county: 'Xenia County'},
  { name: 'Youngstown And Mahoning County, Pl Of', url: 'https://www.youngstownlibrary.org', eventsUrl: 'https://www.youngstownlibrary.org/events', city: 'Youngstown', state: 'OH', zipCode: '44503', county: 'Youngstown County'},
  { name: 'Dr. Earl S. Sloan Library', url: 'https://www.zanesfieldlibrary.org', eventsUrl: 'https://www.zanesfieldlibrary.org/events', city: 'Zanesfield', state: 'OH', zipCode: '43360', county: 'Zanesfield County'},
  { name: 'Muskingum County Library System', url: 'https://www.zanesvillelibrary.org', eventsUrl: 'https://www.zanesvillelibrary.org/events', city: 'Zanesville', state: 'OH', zipCode: '43701', county: 'Zanesville County'}

];

const SCRAPER_NAME = 'generic-OH';

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
            state: 'OH',
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
    state: 'OH',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - OH (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressOHCloudFunction() {
  console.log('☁️ Running WordPress OH as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-OH', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-OH', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressOHCloudFunction };
