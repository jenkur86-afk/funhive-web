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
  { name: 'Ada Public School District Library', url: 'https://www.adalibrary.org/', eventsUrl: 'https://www.adalibrary.org/', city: 'Ada', state: 'OH', zipCode: '45810', county: 'Ada County'},
  { name: 'Akron-Summit County Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'OH', zipCode: '44326', county: 'Akron County'},
  { name: 'Alexandria Public Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'OH', zipCode: '43001', county: 'Alexandria County'},
  { name: 'Alger Public Library', url: 'https://www.algerlibrary.org/', eventsUrl: 'https://www.algerlibrary.org/', city: 'Alger', state: 'OH', zipCode: '45812', county: 'Alger County'},
  { name: 'Rodman Public Library', url: 'https://www.alliancelibrary.org', eventsUrl: 'https://www.alliancelibrary.org/events', city: 'Alliance', state: 'OH', zipCode: '44601', county: 'Alliance County'},
  { name: 'Amherst Public Library', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'OH', zipCode: '44001', county: 'Amherst County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'OH', zipCode: '44003', county: 'Andover County'},
  { name: 'Archbold Community Library', url: 'https://www.archboldlibrary.org', eventsUrl: 'https://www.archboldlibrary.org/events', city: 'Archbold', state: 'OH', zipCode: '43502', county: 'Archbold County'},
  { name: 'Ashland Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'OH', zipCode: '44805', county: 'Ashland County'},
  { name: 'Wornstaff Memorial Public Library', url: 'https://www.ashleylibrary.org', eventsUrl: 'https://www.ashleylibrary.org/events', city: 'Ashley', state: 'OH', zipCode: '43003', county: 'Ashley County'},
  { name: 'Barberton Public Library', url: 'https://www.barbertonlibrary.org/', eventsUrl: 'https://www.barbertonlibrary.org/', city: 'Barberton', state: 'OH', zipCode: '44203', county: 'Barberton County'},
  { name: 'Clermont County Public Library', url: 'https://www.batavialibrary.org', eventsUrl: 'https://www.batavialibrary.org/events', city: 'Batavia', state: 'OH', zipCode: '45103', county: 'Batavia County'},
  { name: 'Bellaire Public Library', url: 'https://www.bellairelibrary.org/', eventsUrl: 'https://www.bellairelibrary.org/calendar', city: 'Bellaire', state: 'OH', zipCode: '43906', county: 'Bellaire County'},
  { name: 'Bellevue Public Library', url: 'https://www.bellevue.net/', eventsUrl: 'https://www.bellevue.net/176/Library', city: 'Bellevue', state: 'OH', zipCode: '44811', county: 'Bellevue County'},
  { name: 'Bexley Public Library', url: 'https://www.bexleylibrary.org', eventsUrl: 'https://www.bexleylibrary.org/events', city: 'Bexley', state: 'OH', zipCode: '43209', county: 'Bexley County'},
  { name: 'Bowerston Public Library', url: 'https://www.bowerstonlibrary.org', eventsUrl: 'https://www.bowerstonlibrary.org/events', city: 'Bowerston', state: 'OH', zipCode: '44695', county: 'Bowerston County'},
  { name: 'Bradford Public Library', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'OH', zipCode: '45308', county: 'Bradford County'},
  { name: 'Bucyrus Public Library', url: 'https://www.bucyruslibrary.org', eventsUrl: 'https://www.bucyruslibrary.org/events', city: 'Bucyrus', state: 'OH', zipCode: '44820', county: 'Bucyrus County'},
  { name: 'Burton Public Library', url: 'https://www.burtonlibrary.org', eventsUrl: 'https://www.burtonlibrary.org/events', city: 'Burton', state: 'OH', zipCode: '44021', county: 'Burton County'},
  { name: 'Guernsey County District Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'OH', zipCode: '43725', county: 'Cambridge County'},
  { name: 'Canal Fulton Public Library', url: 'https://www.canalfultonlibrary.org', eventsUrl: 'https://www.canalfultonlibrary.org/events', city: 'Canal Fulton', state: 'OH', zipCode: '44614', county: 'Canal Fulton County'},
  { name: 'Stark County District Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'OH', zipCode: '44702', county: 'Canton County'},
  { name: 'Cardington-Lincoln Public Library', url: 'https://www.cardingtonlibrary.org', eventsUrl: 'https://www.cardingtonlibrary.org/events', city: 'Cardington', state: 'OH', zipCode: '43315', county: 'Cardington County'},
  { name: 'Washington-Centerville Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'OH', zipCode: '45458', county: 'Centerville County'},
  { name: 'Southwest Ohio And Neighboring Libraries', url: 'https://www.cincinnatilibrary.org', eventsUrl: 'https://www.cincinnatilibrary.org/events', city: 'Cincinnati', state: 'OH', zipCode: '45242', county: 'Cincinnati County'},
  { name: 'Cleveland Public Library', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'OH', zipCode: '44114', county: 'Cleveland County'},
  { name: 'Clyde Public Library', url: 'https://www.clydelibrary.org/', eventsUrl: 'https://www.clydelibrary.org/', city: 'Clyde', state: 'OH', zipCode: '43410', county: 'Clyde County'},
  { name: 'Columbus Metropolitan Library', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'OH', zipCode: '43215', county: 'Columbus County'},
  { name: 'Coshocton Public Library', url: 'https://www.coshoctonlibrary.org', eventsUrl: 'https://www.coshoctonlibrary.org/events', city: 'Coshocton', state: 'OH', zipCode: '43812', county: 'Coshocton County'},
  { name: 'Cuyahoga Falls Library', url: 'https://fallslibrary.org/', eventsUrl: 'https://fallslibrary.org/', city: 'Cuyahoga Falls', state: 'OH', zipCode: '44221', county: 'Cuyahoga Falls County'},
  { name: 'Defiance Public Library', url: 'https://www.defiancelibrary.org', eventsUrl: 'https://www.defiancelibrary.org/events', city: 'Defiance', state: 'OH', zipCode: '43512', county: 'Defiance County'},
  { name: 'Delaware County District Library', url: 'https://www.delawarelibrary.org', eventsUrl: 'https://www.delawarelibrary.org/events', city: 'Delaware', state: 'OH', zipCode: '43015', county: 'Delaware County'},
  { name: 'Delphos Public Library', url: 'https://www.delphoslibrary.org/', eventsUrl: 'https://www.delphoslibrary.org/events-programs/calendar', city: 'Delphos', state: 'OH', zipCode: '45833', county: 'Delphos County'},
  { name: 'Delta Public Library', url: 'https://www.deltalibrary.org', eventsUrl: 'https://www.deltalibrary.org/events', city: 'Delta', state: 'OH', zipCode: '43515', county: 'Delta County'},
  { name: 'Dover Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'OH', zipCode: '44622', county: 'Dover County'},
  { name: 'Hardin Northern Public Library', url: 'https://dunkirklibrary.org/', eventsUrl: 'https://dunkirklibrary.org/', city: 'Dunkirk', state: 'OH', zipCode: '45836', county: 'Dunkirk County'},
  { name: 'Preble County District Library', url: 'https://www.eatonlibrary.org', eventsUrl: 'https://www.eatonlibrary.org/events', city: 'Eaton', state: 'OH', zipCode: '45320', county: 'Eaton County'},
  { name: 'Elyria Public Library', url: 'https://www.elyrialibrary.org/', eventsUrl: 'https://www.elyrialibrary.org/', city: 'Elyria', state: 'OH', zipCode: '44035', county: 'Elyria County'},
  { name: 'Euclid Public Library', url: 'https://www.euclidlibrary.org/', eventsUrl: 'https://www.euclidlibrary.org/', city: 'Euclid', state: 'OH', zipCode: '44123', county: 'Euclid County'},
  { name: 'Normal Memorial Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'OH', zipCode: '43521', county: 'Fayette County'},
  { name: 'Findlay Hancock Cnty Dist Public Library', url: 'https://www.findlaylibrary.org', eventsUrl: 'https://www.findlaylibrary.org/events', city: 'Findlay', state: 'OH', zipCode: '45840', county: 'Findlay County'},
  { name: 'Forest-Jackson Public Library', url: 'https://www.forestlibrary.org/', eventsUrl: 'https://www.forestlibrary.org/', city: 'Forest', state: 'OH', zipCode: '45843', county: 'Forest County'},
  { name: 'Fort Recovery Public Library', url: 'https://www.fortrecoverylibrary.org', eventsUrl: 'https://www.fortrecoverylibrary.org/events', city: 'Fort Recovery', state: 'OH', zipCode: '45846', county: 'Fort Recovery County'},
  { name: 'Kaubisch Memorial Public Library', url: 'https://www.fostorialibrary.org', eventsUrl: 'https://www.fostorialibrary.org/events', city: 'Fostoria', state: 'OH', zipCode: '44830', county: 'Fostoria County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'OH', zipCode: '45005', county: 'Franklin County'},
  { name: 'Birchard Public Library Of Sandusky County', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'OH', zipCode: '43420', county: 'Fremont County'},
  { name: 'Galion Public Library Association', url: 'https://www.galionlibrary.org', eventsUrl: 'https://www.galionlibrary.org/events', city: 'Galion', state: 'OH', zipCode: '44833', county: 'Galion County'},
  { name: 'Germantown Public Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'OH', zipCode: '45327', county: 'Germantown County'},
  { name: 'Grafton-Midview Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'OH', zipCode: '44044', county: 'Grafton County'},
  { name: 'Granville Public Library', url: 'https://www.granvillelibrary.org/', eventsUrl: 'https://www.granvillelibrary.org/', city: 'Granville', state: 'OH', zipCode: '43023', county: 'Granville County'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'OH', zipCode: '45331', county: 'Greenville County'},
  { name: 'Lane Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'OH', zipCode: '45011', county: 'Hamilton County'},
  { name: 'Highland County District Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'OH', zipCode: '45133', county: 'Hillsboro County'},
  { name: 'Homer Public Library', url: 'https://www.homerlibrary.org', eventsUrl: 'https://www.homerlibrary.org/events', city: 'Homer', state: 'OH', zipCode: '43027', county: 'Homer County'},
  { name: 'Hubbard Public Library', url: 'https://www.hubbardlibrary.org', eventsUrl: 'https://www.hubbardlibrary.org/events', city: 'Hubbard', state: 'OH', zipCode: '44425', county: 'Hubbard County'},
  { name: 'Hudson Library And Historical Society', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'OH', zipCode: '44236', county: 'Hudson County'},
  { name: 'Huron Public Library', url: 'https://www.huronlibrary.org/', eventsUrl: 'https://www.huronlibrary.org/', city: 'Huron', state: 'OH', zipCode: '44839', county: 'Huron County'},
  { name: 'Kent Free Library', url: 'https://kentpl.librarycalendar.com/', eventsUrl: 'https://kentpl.librarycalendar.com/events/month', city: 'Kent', state: 'OH', zipCode: '44240', county: 'Kent County'},
  { name: 'Mary Lou Johnson-Hardin Cnty Pl', url: 'https://www.kentonlibrary.org', eventsUrl: 'https://www.kentonlibrary.org/events', city: 'Kenton', state: 'OH', zipCode: '44326', county: 'Kenton County'},
  { name: 'Kingsville Public Library', url: 'https://www.kingsvillelibrary.org', eventsUrl: 'https://www.kingsvillelibrary.org/events', city: 'Kingsville', state: 'OH', zipCode: '44048', county: 'Kingsville County'},
  { name: 'Kinsman Free Public Library', url: 'https://www.kinsmanlibrary.org/', eventsUrl: 'https://www.kinsmanlibrary.org/', city: 'Kinsman', state: 'OH', zipCode: '44428', county: 'Kinsman County'},
  { name: 'Lakewood Public Library', url: 'https://lakewoodlibrary.org/', eventsUrl: 'https://lakewoodlibrary.org/events/event/', city: 'Lakewood', state: 'OH', zipCode: '44107', county: 'Lakewood County'},
  { name: 'Fairfield County District Library', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'OH', zipCode: '43130', county: 'Lancaster County'},
  { name: 'Lebanon Public Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'OH', zipCode: '45036', county: 'Lebanon County'},
  { name: 'Leetonia Community Public Library', url: 'https://www.leetonialibrary.org', eventsUrl: 'https://www.leetonialibrary.org/events', city: 'Leetonia', state: 'OH', zipCode: '44431', county: 'Leetonia County'},
  { name: 'Liberty Center Public Library', url: 'https://www.libertycenterlibrary.org', eventsUrl: 'https://www.libertycenterlibrary.org/events', city: 'Liberty Center', state: 'OH', zipCode: '43532', county: 'Liberty Center County'},
  { name: 'Logan-Hocking County District Library', url: 'https://loganlibrary.org/', eventsUrl: 'https://loganlibrary.org/calendar/', city: 'Logan', state: 'OH', zipCode: '43138', county: 'Logan County'},
  { name: 'London Public Library', url: 'https://www.londonlibrary.org', eventsUrl: 'https://www.londonlibrary.org/events', city: 'London', state: 'OH', zipCode: '43140', county: 'London County'},
  { name: 'Loudonville Public Library', url: 'https://loudonvillelibrary.org/', eventsUrl: 'https://loudonvillelibrary.org/', city: 'Loudonville', state: 'OH', zipCode: '44842', county: 'Loudonville County'},
  { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'OH', zipCode: '44641', county: 'Louisville County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'OH', zipCode: '44057', county: 'Madison County'},
  { name: 'Mansfield-Richland County Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'OH', zipCode: '44902', county: 'Mansfield County'},
  { name: 'Marion Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'OH', zipCode: '43302', county: 'Marion County'},
  { name: 'Mason Public Library', url: 'https://www.masonlibrary.org', eventsUrl: 'https://www.masonlibrary.org/events', city: 'Mason', state: 'OH', zipCode: '45040', county: 'Mason County'},
  { name: 'Massillon Public Library', url: 'https://www.massillonlibrary.org/', eventsUrl: 'https://www.massillonlibrary.org/', city: 'Massillon', state: 'OH', zipCode: '44646', county: 'Massillon County'},
  { name: 'Herbert Wescoat Memorial Library', url: 'https://www.mcarthurlibrary.org', eventsUrl: 'https://www.mcarthurlibrary.org/events', city: 'Mcarthur', state: 'OH', zipCode: '45651', county: 'Mcarthur County'},
  { name: 'Mechanicsburg Public Library', url: 'https://www.mechanicsburglibrary.org', eventsUrl: 'https://www.mechanicsburglibrary.org/events', city: 'Mechanicsburg', state: 'OH', zipCode: '43044', county: 'Mechanicsburg County'},
  { name: 'Mentor Public Library', url: 'https://www.mentorlibrary.org', eventsUrl: 'https://www.mentorlibrary.org/events', city: 'Mentor', state: 'OH', zipCode: '44060', county: 'Mentor County'},
  { name: 'Middletown Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'OH', zipCode: '45044', county: 'Middletown County'},
  { name: 'Milan-Berlin Township Public Library-Berlin-Milan Local Sd', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'OH', zipCode: '44846', county: 'Milan County'},
  { name: 'Minerva Public Library', url: 'https://www.minervalibrary.org', eventsUrl: 'https://www.minervalibrary.org/events', city: 'Minerva', state: 'OH', zipCode: '44657', county: 'Minerva County'},
  { name: 'Monroeville Public Library', url: 'https://www.monroevillelibrary.org', eventsUrl: 'https://www.monroevillelibrary.org/events', city: 'Monroeville', state: 'OH', zipCode: '44847', county: 'Monroeville County'},
  { name: 'Montpelier Public Library', url: 'https://www.montpelierlibrary.org', eventsUrl: 'https://www.montpelierlibrary.org/events', city: 'Montpelier', state: 'OH', zipCode: '43543', county: 'Montpelier County'},
  { name: 'New Carlisle Public Library', url: 'https://www.newcarlislelibrary.org', eventsUrl: 'https://www.newcarlislelibrary.org/events', city: 'New Carlisle', state: 'OH', zipCode: '45344', county: 'New Carlisle County'},
  { name: 'New London Public Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'OH', zipCode: '44851', county: 'New London County'},
  { name: 'Licking County Library', url: 'https://newarklibrary.org/', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'OH', zipCode: '43055', county: 'Newark County'},
  { name: 'Mckinley Memorial Library', url: 'https://www.nileslibrary.org', eventsUrl: 'https://www.nileslibrary.org/events', city: 'Niles', state: 'OH', zipCode: '44446', county: 'Niles County'},
  { name: 'North Canton Public Library', url: 'https://www.northcantonlibrary.org', eventsUrl: 'https://www.northcantonlibrary.org/events', city: 'North Canton', state: 'OH', zipCode: '44720', county: 'North Canton County'},
  { name: 'Norwalk Public Library', url: 'https://www.norwalklibrary.org', eventsUrl: 'https://www.norwalklibrary.org/events', city: 'Norwalk', state: 'OH', zipCode: '44857', county: 'Norwalk County'},
  { name: 'Oberlin Public Library', url: 'https://www.oberlinlibrary.org', eventsUrl: 'https://www.oberlinlibrary.org/events', city: 'Oberlin', state: 'OH', zipCode: '44074', county: 'Oberlin County'},
  { name: 'Putnam County District Library', url: 'https://www.ottawalibrary.org/', eventsUrl: 'https://www.ottawalibrary.org/', city: 'Ottawa', state: 'OH', zipCode: '45875', county: 'Ottawa County'},
  { name: 'Pataskala Public Library', url: 'https://www.pataskalalibrary.org/', eventsUrl: 'https://www.pataskalalibrary.org/', city: 'Pataskala', state: 'OH', zipCode: '43062', county: 'Pataskala County'},
  { name: 'Pemberville Public Library', url: 'https://www.pembervillelibrary.org/', eventsUrl: 'https://www.pembervillelibrary.org/', city: 'Pemberville', state: 'OH', zipCode: '43450', county: 'Pemberville County'},
  { name: 'Peninsula Library Historical Society', url: 'https://peninsulalibrary.org/', eventsUrl: 'https://peninsulalibrary.org/calendar/', city: 'Peninsula', state: 'OH', zipCode: '44264', county: 'Peninsula County'},
  { name: 'Perry Public Library', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'OH', zipCode: '44081', county: 'Perry County'},
  { name: 'Pickerington Public Library', url: 'https://www.pickeringtonlibrary.org', eventsUrl: 'https://www.pickeringtonlibrary.org/events', city: 'Pickerington', state: 'OH', zipCode: '43147', county: 'Pickerington County'},
  { name: 'Piqua Public Library', url: 'https://www.piqualibrary.org', eventsUrl: 'https://www.piqualibrary.org/events', city: 'Piqua', state: 'OH', zipCode: '45356', county: 'Piqua County'},
  { name: 'Portsmouth Public Library', url: 'https://www.portsmouthlibrary.org/', eventsUrl: 'https://www.portsmouthlibrary.org/', city: 'Portsmouth', state: 'OH', zipCode: '45662', county: 'Portsmouth County'},
  { name: 'Richwood-North Union Public Library', url: 'https://www.richwoodlibrary.org', eventsUrl: 'https://www.richwoodlibrary.org/events', city: 'Richwood', state: 'OH', zipCode: '43344', county: 'Richwood County'},
  { name: 'Union Township Public Library', url: 'https://ripleylibrary.org/', eventsUrl: 'https://ripleylibrary.org/', city: 'Ripley', state: 'OH', zipCode: '45167', county: 'Ripley County'},
  { name: 'Rossford Public Library', url: 'https://www.rossfordlibrary.org/', eventsUrl: 'https://www.rossfordlibrary.org/', city: 'Rossford', state: 'OH', zipCode: '43460', county: 'Rossford County'},
  { name: 'Salem Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'OH', zipCode: '44460', county: 'Salem County'},
  { name: 'Marvin Memorial Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'OH', zipCode: '44875', county: 'Shelby County'},
  { name: 'Shelby County Libraries - Amos Memorial', url: 'https://www.sidneylibrary.org/', eventsUrl: 'https://www.sidneylibrary.org/index.php/calendar/', city: 'Sidney', state: 'OH', zipCode: '45365', county: 'Sidney County'},
  { name: 'Clark County Public Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'OH', zipCode: '45506', county: 'Springfield County'},
  { name: 'St. Paris Public Library', url: 'https://www.stparislibrary.org', eventsUrl: 'https://www.stparislibrary.org/events', city: 'St. Paris', state: 'OH', zipCode: '43072', county: 'St. Paris County'},
  { name: 'Steubenville Jefferson County, Pl Of', url: 'https://www.steubenvillelibrary.org/', eventsUrl: 'https://www.steubenvillelibrary.org/', city: 'Steubenville', state: 'OH', zipCode: '43952', county: 'Steubenville County'},
  { name: 'Community Library', url: 'https://www.sunburylibrary.org', eventsUrl: 'https://www.sunburylibrary.org/events', city: 'Sunbury', state: 'OH', zipCode: '43074', county: 'Sunbury County'},
  { name: 'Swanton Public Library', url: 'https://www.swantonlibrary.org', eventsUrl: 'https://www.swantonlibrary.org/events', city: 'Swanton', state: 'OH', zipCode: '43558', county: 'Swanton County'},
  { name: 'Mohawk Community Library', url: 'https://www.sycamorelibrary.org', eventsUrl: 'https://www.sycamorelibrary.org/events', city: 'Sycamore', state: 'OH', zipCode: '44882', county: 'Sycamore County'},
  { name: 'Tipp City Public Library', url: 'https://www.tippcitylibrary.org', eventsUrl: 'https://www.tippcitylibrary.org/events', city: 'Tipp City', state: 'OH', zipCode: '45371', county: 'Tipp City County'},
  { name: 'Toledo-Lucas County Public Library', url: 'https://www.toledolibrary.org', eventsUrl: 'https://www.toledolibrary.org/events', city: 'Toledo', state: 'OH', zipCode: '43604', county: 'Toledo County'},
  { name: 'Troy-Miami County Public Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'OH', zipCode: '45373', county: 'Troy County'},
  { name: 'Twinsburg Public Library', url: 'https://www.twinsburglibrary.org', eventsUrl: 'https://www.twinsburglibrary.org/events', city: 'Twinsburg', state: 'OH', zipCode: '44087', county: 'Twinsburg County'},
  { name: 'Champaign County Library', url: 'https://www.urbanalibrary.org', eventsUrl: 'https://www.urbanalibrary.org/events', city: 'Urbana', state: 'OH', zipCode: '43078', county: 'Urbana County'},
  { name: 'Ella M. Everhard Public Library', url: 'https://www.wadsworthlibrary.org', eventsUrl: 'https://www.wadsworthlibrary.org/events', city: 'Wadsworth', state: 'OH', zipCode: '44281', county: 'Wadsworth County'},
  { name: 'Northeast Ohio Regional Library System', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'OH', zipCode: '44483', county: 'Warren County'},
  { name: 'Wauseon Public Library', url: 'https://www.wauseonlibrary.org', eventsUrl: 'https://www.wauseonlibrary.org/events', city: 'Wauseon', state: 'OH', zipCode: '43567', county: 'Wauseon County'},
  { name: 'Garnet A. Wilson Pl Of Pike Co', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'OH', zipCode: '45690', county: 'Waverly County'},
  { name: 'Sylvester Memorial Wellston Public Library', url: 'https://www.wellstonlibrary.org/', eventsUrl: 'https://www.wellstonlibrary.org/', city: 'Wellston', state: 'OH', zipCode: '45692', county: 'Wellston County'},
  { name: 'Wellsville Carnegie Public Library', url: 'https://www.wellsvillelibrary.org', eventsUrl: 'https://www.wellsvillelibrary.org/events', city: 'Wellsville', state: 'OH', zipCode: '43968', county: 'Wellsville County'},
  { name: 'Westerville Public Library', url: 'https://www.westervillelibrary.org', eventsUrl: 'https://www.westervillelibrary.org/events', city: 'Westerville', state: 'OH', zipCode: '43081', county: 'Westerville County'},
  { name: 'Porter Public Library', url: 'https://www.westlakelibrary.org', eventsUrl: 'https://www.westlakelibrary.org/events', city: 'Westlake', state: 'OH', zipCode: '44145', county: 'Westlake County'},
  { name: 'Weston Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'OH', zipCode: '43569', county: 'Weston County'},
  { name: 'Willard Memorial Library', url: 'https://www.willardlibrary.org', eventsUrl: 'https://www.willardlibrary.org/events', city: 'Willard', state: 'OH', zipCode: '44890', county: 'Willard County'},
  { name: 'Wilmington Public Library Of Clinton County', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'OH', zipCode: '45177', county: 'Wilmington County'},

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
