const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Illinois Public Libraries Scraper - Coverage: All Illinois public libraries
 */
const LIBRARIES = [
  { name: 'Addison Public Library', url: 'https://www.addisonlibrary.org', eventsUrl: 'https://www.addisonlibrary.org/events', city: 'Addison', state: 'IL', zipCode: '60101', county: 'Addison County'},
  { name: 'Albion Public Library', url: 'https://www.albionlibrary.org/', eventsUrl: 'https://www.albionlibrary.org/', city: 'Albion', state: 'IL', zipCode: '62806', county: 'Albion County'},
  { name: 'Alsip-Merrionette Park Library District', url: 'https://www.alsiplibrary.org/', eventsUrl: 'https://www.alsiplibrary.org/', city: 'Alsip', state: 'IL', zipCode: '60803', county: 'Alsip County'},
  { name: 'Andalusia Township Library', url: 'https://www.andalusialibrary.org/', eventsUrl: 'https://www.andalusialibrary.org/', city: 'Andalusia', state: 'IL', zipCode: '61232', county: 'Andalusia County'},
  { name: 'Stinson Memorial Public Library District', url: 'https://www.annalibrary.org', eventsUrl: 'https://www.annalibrary.org/events', city: 'Anna', state: 'IL', zipCode: '62906', county: 'Anna County'},
  { name: 'Antioch Public Library District', url: 'https://www.antiochlibrary.org', eventsUrl: 'https://www.antiochlibrary.org/events', city: 'Antioch', state: 'IL', zipCode: '60002', county: 'Antioch County'},
  { name: 'Arthur Public Library District', url: 'https://www.arthurlibrary.org/', eventsUrl: 'https://www.arthurlibrary.org/', city: 'Arthur', state: 'IL', zipCode: '61911', county: 'Arthur County'},
  { name: 'Ashland Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'IL', zipCode: '00000', county: 'Ashland County'},
  { name: 'Ashley Public Library District', url: 'https://www.ashleylibrary.org', eventsUrl: 'https://www.ashleylibrary.org/events', city: 'Ashley', state: 'IL', zipCode: '62808', county: 'Ashley County'},
  { name: 'Astoria Public Library District', url: 'https://www.astoria.gov/', eventsUrl: 'https://www.astoria.gov/calendar?deptid=6', city: 'Astoria', state: 'IL', zipCode: '61501', county: 'Astoria County'},
  { name: 'Athens Municipal Library', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'IL', zipCode: '62613', county: 'Athens County'},
  { name: 'Auburn Public Library', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'IL', zipCode: '62615', county: 'Auburn County'},
  { name: 'Greater West Central Public Library District', url: 'https://www.augustalibrary.org', eventsUrl: 'https://www.augustalibrary.org/events', city: 'Augusta', state: 'IL', zipCode: '62311', county: 'Augusta County'},
  { name: 'Aurora Public Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'IL', zipCode: '60505', county: 'Aurora County'},
  { name: 'Village Of Avon Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'IL', zipCode: '61415', county: 'Avon County'},
  { name: 'Barrington Public Library District', url: 'https://barringtonlibrary.org/', eventsUrl: 'https://barringtonlibrary.org/', city: 'Barrington', state: 'IL', zipCode: '60010', county: 'Barrington County'},
  { name: 'Bartlett Public Library District', url: 'https://www.bartlettlibrary.org', eventsUrl: 'https://www.bartlettlibrary.org/events', city: 'Bartlett', state: 'IL', zipCode: '60103', county: 'Bartlett County'},
  { name: 'Batavia Public Library District', url: 'https://www.batavialibrary.org', eventsUrl: 'https://www.batavialibrary.org/events', city: 'Batavia', state: 'IL', zipCode: '60510', county: 'Batavia County'},
  { name: 'Beecher Public Library District', url: 'https://www.beecherlibrary.org/', eventsUrl: 'https://www.beecherlibrary.org/calendar', city: 'Beecher', state: 'IL', zipCode: '60401', county: 'Beecher County'},
  { name: 'Belleville Public Library', url: 'https://bellevillelibrary.org/', eventsUrl: 'https://bellevillelibrary.org/', city: 'Belleville', state: 'IL', zipCode: '62220', county: 'Belleville County'},
  { name: 'Bellwood Public Library', url: 'https://www.bellwoodlibrary.org', eventsUrl: 'https://www.bellwoodlibrary.org/events', city: 'Bellwood', state: 'IL', zipCode: '60104', county: 'Bellwood County'},
  { name: 'Frank Bertetti Benld Public Library', url: 'https://www.benldlibrary.org', eventsUrl: 'https://www.benldlibrary.org/events', city: 'Benld', state: 'IL', zipCode: '62009', county: 'Benld County'},
  { name: 'Bethalto Public Library District', url: 'https://www.bethaltolibrary.org', eventsUrl: 'https://www.bethaltolibrary.org/events', city: 'Bethalto', state: 'IL', zipCode: '62010', county: 'Bethalto County'},
  { name: 'Marrowbone Public Library District', url: 'https://bethanylibrary.org/', eventsUrl: 'https://bethanylibrary.org/', city: 'Bethany', state: 'IL', zipCode: '61914', county: 'Bethany County'},
  { name: 'Blandinsville-Hire Library District', url: 'https://blandinsvillelibrary.wordpress.com/', eventsUrl: 'https://blandinsvillelibrary.wordpress.com/', city: 'Blandinsville', state: 'IL', zipCode: '61420', county: 'Blandinsville County'},
  { name: 'Bloomingdale Public Library', url: 'https://www.bloomingdalelibrary.org/', eventsUrl: 'https://www.bloomingdalelibrary.org/', city: 'Bloomingdale', state: 'IL', zipCode: '60108', county: 'Bloomingdale County'},
  { name: 'Bloomington Public Library', url: 'https://www.bloomingtonlibrary.org', eventsUrl: 'https://www.bloomingtonlibrary.org/events', city: 'Bloomington', state: 'IL', zipCode: '61701', county: 'Bloomington County'},
  { name: 'Blue Island Public Library', url: 'https://www.blueislandlibrary.org', eventsUrl: 'https://www.blueislandlibrary.org/events', city: 'Blue Island', state: 'IL', zipCode: '60406', county: 'Blue Island County'},
  { name: 'Bourbonnais Public Library District', url: 'https://bourbonnaislibrary.org/', eventsUrl: 'https://bourbonnaislibrary.org/', city: 'Bourbonnais', state: 'IL', zipCode: '60914', county: 'Bourbonnais County'},
  { name: 'Bradford Public Library District', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'IL', zipCode: '61421', county: 'Bradford County'},
  { name: 'Bradley Public Library District', url: 'https://www.bradleylibrary.org/', eventsUrl: 'https://www.bradleylibrary.org/', city: 'Bradley', state: 'IL', zipCode: '60915', county: 'Bradley County'},
  { name: 'Breese Public Library', url: 'https://www.breeselibrary.org', eventsUrl: 'https://www.breeselibrary.org/events', city: 'Breese', state: 'IL', zipCode: '62230', county: 'Breese County'},
  { name: 'Bridgeview Public Library', url: 'https://www.bridgeviewlibrary.org', eventsUrl: 'https://www.bridgeviewlibrary.org/events', city: 'Bridgeview', state: 'IL', zipCode: '60455', county: 'Bridgeview County'},
  { name: 'Brighton Memorial Public Library', url: 'https://www.brightonlibrary.org', eventsUrl: 'https://www.brightonlibrary.org/events', city: 'Brighton', state: 'IL', zipCode: '62012', county: 'Brighton County'},
  { name: 'Brimfield Public Library District', url: 'https://www.brimfieldlibrary.org', eventsUrl: 'https://www.brimfieldlibrary.org/events', city: 'Brimfield', state: 'IL', zipCode: '61517', county: 'Brimfield County'},
  { name: 'Broadview Public Library District', url: 'https://www.broadviewlibrary.org', eventsUrl: 'https://www.broadviewlibrary.org/events', city: 'Broadview', state: 'IL', zipCode: '60155', county: 'Broadview County'},
  { name: 'Brookfield Public Library', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'IL', zipCode: '60513', county: 'Brookfield County'},
  { name: 'Mason Memorial Public Library', url: 'https://www.budalibrary.org/', eventsUrl: 'https://www.budalibrary.org/', city: 'Buda', state: 'IL', zipCode: '61314', county: 'Buda County'},
  { name: 'Bunker Hill Public Library District', url: 'https://www.bunkerhilllibrary.org/', eventsUrl: 'https://www.bunkerhilllibrary.org/', city: 'Bunker Hill', state: 'IL', zipCode: '62014', county: 'Bunker Hill County'},
  { name: 'Prairie Trails Public Library District', url: 'https://www.burbanklibrary.org', eventsUrl: 'https://www.burbanklibrary.org/events', city: 'Burbank', state: 'IL', zipCode: '60459', county: 'Burbank County'},
  { name: 'Byron Public Library District', url: 'https://www.byronlibrary.org', eventsUrl: 'https://www.byronlibrary.org/events', city: 'Byron', state: 'IL', zipCode: '61010', county: 'Byron County'},
  { name: 'Cahokia Public Library District', url: 'https://www.cahokialibrary.org', eventsUrl: 'https://www.cahokialibrary.org/events', city: 'Cahokia', state: 'IL', zipCode: '62206', county: 'Cahokia County'},
  { name: 'Cairo Public Library', url: 'https://cairolibrary.org/', eventsUrl: 'https://cairolibrary.org/calendar/', city: 'Cairo', state: 'IL', zipCode: '62914', county: 'Cairo County'},
  { name: 'Calumet Park Public Library', url: 'https://www.calumetparklibrary.org', eventsUrl: 'https://www.calumetparklibrary.org/events', city: 'Calumet Park', state: 'IL', zipCode: '60827', county: 'Calumet Park County'},
  { name: 'Cambridge Public Library District', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'IL', zipCode: '61238', county: 'Cambridge County'},
  { name: 'Parlin-Ingersoll Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'IL', zipCode: '61520', county: 'Canton County'},
  { name: 'Carbondale Public Library', url: 'https://carbondalelibrary.org/', eventsUrl: 'https://carbondalelibrary.org/', city: 'Carbondale', state: 'IL', zipCode: '00000', county: 'Carbondale County'},
  { name: 'Carlinville Public Library', url: 'https://www.carlinvillelibrary.org', eventsUrl: 'https://www.carlinvillelibrary.org/events', city: 'Carlinville', state: 'IL', zipCode: '62626', county: 'Carlinville County'},
  { name: 'Carthage Public Library District', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'IL', zipCode: '62321', county: 'Carthage County'},
  { name: 'Cary Area Public Library District', url: 'https://www.carylibrary.org', eventsUrl: 'https://www.carylibrary.org/events', city: 'Cary', state: 'IL', zipCode: '60013', county: 'Cary County'},
  { name: 'Casey Township Library', url: 'https://caseylibrary.org/', eventsUrl: 'https://caseylibrary.org/calendar/', city: 'Casey', state: 'IL', zipCode: '62420', county: 'Casey County'},
  { name: 'Caseyville Public Library District', url: 'https://www.caseyvillelibrary.org', eventsUrl: 'https://www.caseyvillelibrary.org/events', city: 'Caseyville', state: 'IL', zipCode: '62232', county: 'Caseyville County'},
  { name: 'Allen Mccarthy Branch Library', url: 'https://www.centralialibrary.org', eventsUrl: 'https://www.centralialibrary.org/events', city: 'Centralia', state: 'IL', zipCode: '00000', county: 'Centralia County'},
  { name: 'Chadwick Public Library District', url: 'https://chadwicklibrary.org/', eventsUrl: 'https://chadwicklibrary.org/', city: 'Chadwick', state: 'IL', zipCode: '61014', county: 'Chadwick County'},
  { name: 'Charleston Carnegie Public Library', url: 'https://charlestonlibrary.org/', eventsUrl: 'https://charlestonlibrary.org/library-events', city: 'Charleston', state: 'IL', zipCode: '61920', county: 'Charleston County'},
  { name: 'Chatham Area Public Library District', url: 'https://chathamlibrary.librarycalendar.com/', eventsUrl: 'https://chathamlibrary.librarycalendar.com/events/month/', city: 'Chatham', state: 'IL', zipCode: '62629', county: 'Chatham County'},
  { name: 'Chenoa Public Library District', url: 'https://www.chenoalibrary.org', eventsUrl: 'https://www.chenoalibrary.org/events', city: 'Chenoa', state: 'IL', zipCode: '61726', county: 'Chenoa County'},
  { name: 'Cherry Valley Public Library District', url: 'https://cherryvalleylibrary.org/', eventsUrl: 'https://cherryvalleylibrary.org/', city: 'Cherry Valley', state: 'IL', zipCode: '61016', county: 'Cherry Valley County'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'IL', zipCode: '62233', county: 'Chester County'},
  { name: 'Albany Park Branch', url: 'https://www.chicagolibrary.org', eventsUrl: 'https://www.chicagolibrary.org/events', city: 'Chicago', state: 'IL', zipCode: '00000', county: 'Chicago County'},
  { name: 'Chicago Heights Public Library', url: 'https://www.chicagoheightslibrary.org', eventsUrl: 'https://www.chicagoheightslibrary.org/events', city: 'Chicago Heights', state: 'IL', zipCode: '60411', county: 'Chicago Heights County'},
  { name: 'Chicago Ridge Public Library', url: 'https://www.chicagoridgelibrary.org', eventsUrl: 'https://www.chicagoridgelibrary.org/events', city: 'Chicago Ridge', state: 'IL', zipCode: '60415', county: 'Chicago Ridge County'},
  { name: 'Clarendon Hills Public Library', url: 'https://clarendonhillslibrary.org/', eventsUrl: 'https://clarendonhillslibrary.org/', city: 'Clarendon Hills', state: 'IL', zipCode: '60514', county: 'Clarendon Hills County'},
  { name: 'Clayton Public Library District', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'IL', zipCode: '62324', county: 'Clayton County'},
  { name: 'Vespasian Warner Public Library District', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'IL', zipCode: '61727', county: 'Clinton County'},
  { name: 'Collinsville Memorial Public Library', url: 'https://www.collinsvillelibrary.org', eventsUrl: 'https://www.collinsvillelibrary.org/events', city: 'Collinsville', state: 'IL', zipCode: '00000', county: 'Collinsville County'},
  { name: 'Columbia Public Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'IL', zipCode: '62236', county: 'Columbia County'},
  { name: 'Cordova District Library', url: 'https://cordovalibrary.org/', eventsUrl: 'https://cordovalibrary.org/', city: 'Cordova', state: 'IL', zipCode: '61242', county: 'Cordova County'},
  { name: 'Creston-Dement Public Library District', url: 'https://www.crestonlibrary.org', eventsUrl: 'https://www.crestonlibrary.org/events', city: 'Creston', state: 'IL', zipCode: '60113', county: 'Creston County'},
  { name: 'Crestwood Public Library District', url: 'https://www.crestwoodlibrary.org/', eventsUrl: 'https://www.crestwoodlibrary.org/news-events/lib-cal/calendar', city: 'Crestwood', state: 'IL', zipCode: '60445', county: 'Crestwood County'},
  { name: 'Crete Public Library District', url: 'https://cretelibrary.org/', eventsUrl: 'https://cretelibrary.org/', city: 'Crete', state: 'IL', zipCode: '60417', county: 'Crete County'},
  { name: 'Crystal Lake Public Library', url: 'https://www.clpl.org/', eventsUrl: 'https://www.clpl.org/', city: 'Crystal Lake', state: 'IL', zipCode: '60014', county: 'Crystal Lake County'},
  { name: 'Spoon River Library District', url: 'https://www.cubalibrary.org', eventsUrl: 'https://www.cubalibrary.org/events', city: 'Cuba', state: 'IL', zipCode: '61427', county: 'Cuba County'},
  { name: 'Cutler Public Library', url: 'https://www.cutlerlibrary.org/', eventsUrl: 'https://www.cutlerlibrary.org/', city: 'Cutler', state: 'IL', zipCode: '62238', county: 'Cutler County'},
  { name: 'Danvers Township Library', url: 'https://www.danverslibrary.org', eventsUrl: 'https://www.danverslibrary.org/events', city: 'Danvers', state: 'IL', zipCode: '61732', county: 'Danvers County'},
  { name: 'Danville Public Library', url: 'http://www.danvilleva.gov/', eventsUrl: 'http://www.danvilleva.gov/2467/Public-Library', city: 'Danville', state: 'IL', zipCode: '61832', county: 'Danville County'},
  { name: 'Indian Prairie Public Library District', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'IL', zipCode: '60561', county: 'Darien County'},
  { name: 'Decatur Public Library', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'IL', zipCode: '62523', county: 'Decatur County'},
  { name: 'Deer Creek District Library', url: 'https://www.deercreeklibrary.org', eventsUrl: 'https://www.deercreeklibrary.org/events', city: 'Deer Creek', state: 'IL', zipCode: '61733', county: 'Deer Creek County'},
  { name: 'Deerfield Public Library', url: 'https://www.deerfieldlibrary.org', eventsUrl: 'https://www.deerfieldlibrary.org/events', city: 'Deerfield', state: 'IL', zipCode: '60015', county: 'Deerfield County'},
  { name: 'Dekalb Public Library', url: 'https://www.dekalblibrary.org', eventsUrl: 'https://www.dekalblibrary.org/events', city: 'Dekalb', state: 'IL', zipCode: '60115', county: 'Dekalb County'},
  { name: 'Ayer Public Library District', url: 'https://www.delavanlibrary.org/', eventsUrl: 'https://www.delavanlibrary.org/site/events/', city: 'Delavan', state: 'IL', zipCode: '61734', county: 'Delavan County'},
  { name: 'Downers Grove Public Library', url: 'https://www.downersgrovelibrary.org', eventsUrl: 'https://www.downersgrovelibrary.org/events', city: 'Downers Grove', state: 'IL', zipCode: '60515', county: 'Downers Grove County'},
  { name: 'Du Quoin Public Library', url: 'https://www.duquoinlibrary.org', eventsUrl: 'https://www.duquoinlibrary.org/events', city: 'Du Quoin', state: 'IL', zipCode: '00000', county: 'Du Quoin County'},
  { name: 'Dunlap Public Library District', url: 'https://www.dunlaplibrary.org', eventsUrl: 'https://www.dunlaplibrary.org/events', city: 'Dunlap', state: 'IL', zipCode: '61525', county: 'Dunlap County'},
  { name: 'Daugherty Public Library District', url: 'https://www.dupolibrary.org', eventsUrl: 'https://www.dupolibrary.org/events', city: 'Dupo', state: 'IL', zipCode: '62239', county: 'Dupo County'},
  { name: 'Duquoin Public Library', url: 'https://www.duquoinlibrary.org', eventsUrl: 'https://www.duquoinlibrary.org/events', city: 'Duquoin', state: 'IL', zipCode: '62832', county: 'Duquoin County'},
  { name: 'Earl Township Public Library', url: 'https://www.earlvillelibrary.org/', eventsUrl: 'https://www.earlvillelibrary.org/', city: 'Earlville', state: 'IL', zipCode: '00000', county: 'Earlville County'},
  { name: 'East Alton Public Library District', url: 'https://www.eastaltonlibrary.org', eventsUrl: 'https://www.eastaltonlibrary.org/events', city: 'East Alton', state: 'IL', zipCode: '62024', county: 'East Alton County'},
  { name: 'East Moline Public Library', url: 'https://eastmolinelibrary.org/', eventsUrl: 'https://eastmolinelibrary.org/', city: 'East Moline', state: 'IL', zipCode: '61244', county: 'East Moline County'},
  { name: 'Edwardsville Public Library', url: 'https://www.edwardsvillelibrary.org/', eventsUrl: 'https://www.edwardsvillelibrary.org/', city: 'Edwardsville', state: 'IL', zipCode: '62025', county: 'Edwardsville County'},
  { name: 'Helen Matthes Library', url: 'https://effinghamlibrary.org/', eventsUrl: 'https://effinghamlibrary.org/', city: 'Effingham', state: 'IL', zipCode: '62401', county: 'Effingham County'},
  { name: 'El Paso Public Library', url: 'https://www.elpasolibrary.org/', eventsUrl: 'https://www.elpasolibrary.org/library-events', city: 'El Paso', state: 'IL', zipCode: '61738', county: 'El Paso County'},
  { name: 'Eldorado Memorial Public Library District', url: 'https://eldoradolibrary.org/', eventsUrl: 'https://eldoradolibrary.org/', city: 'Eldorado', state: 'IL', zipCode: '62930', county: 'Eldorado County'},
  { name: 'Gail Borden Public Library District', url: 'https://www.elginlibrary.org/', eventsUrl: 'https://www.elginlibrary.org/', city: 'Elgin', state: 'IL', zipCode: '60120', county: 'Elgin County'},
  { name: 'Elmhurst Public Library', url: 'https://www.elmhurstlibrary.org', eventsUrl: 'https://www.elmhurstlibrary.org/events', city: 'Elmhurst', state: 'IL', zipCode: '60126', county: 'Elmhurst County'},
  { name: 'Morrison Mary Wiley Library', url: 'https://www.elmwoodlibrary.org', eventsUrl: 'https://www.elmwoodlibrary.org/events', city: 'Elmwood', state: 'IL', zipCode: '61529', county: 'Elmwood County'},
  { name: 'Elmwood Park Public Library', url: 'https://www.elmwoodparklibrary.org', eventsUrl: 'https://www.elmwoodparklibrary.org/events', city: 'Elmwood Park', state: 'IL', zipCode: '60707', county: 'Elmwood Park County'},
  { name: 'Erie Public Library District', url: 'https://erielibrary.org/', eventsUrl: 'https://erielibrary.org/', city: 'Erie', state: 'IL', zipCode: '61250', county: 'Erie County'},
  { name: 'Eureka Public Library District', url: 'https://www.eurekalibrary.org', eventsUrl: 'https://www.eurekalibrary.org/events', city: 'Eureka', state: 'IL', zipCode: '61530', county: 'Eureka County'},
  { name: 'Central Public Library District', url: 'https://www.evansvillelibrary.org', eventsUrl: 'https://www.evansvillelibrary.org/events', city: 'Evansville', state: 'IL', zipCode: '62242', county: 'Evansville County'},
  { name: 'Evergreen Park Public Library', url: 'https://www.evergreenparklibrary.org/', eventsUrl: 'https://www.evergreenparklibrary.org/', city: 'Evergreen Park', state: 'IL', zipCode: '60805', county: 'Evergreen Park County'},
  { name: 'Dominy Memorial Library', url: 'https://fairburylibrary.org/', eventsUrl: 'https://fairburylibrary.org/index.php/calendar/', city: 'Fairbury', state: 'IL', zipCode: '61739', county: 'Fairbury County'},
  { name: 'Fairfield Public Library', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'IL', zipCode: '62837', county: 'Fairfield County'},
  { name: 'Vance Township Library', url: 'https://fairmountlibrary.org/', eventsUrl: 'https://fairmountlibrary.org/', city: 'Fairmount', state: 'IL', zipCode: '61841', county: 'Fairmount County'},
  { name: 'Valley District Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'IL', zipCode: '61432', county: 'Fairview County'},
  { name: 'Fairview Heights Public Library', url: 'https://www.fairviewheightslibrary.org', eventsUrl: 'https://www.fairviewheightslibrary.org/events', city: 'Fairview Heights', state: 'IL', zipCode: '62208', county: 'Fairview Heights County'},
  { name: 'Farmington Area Library District', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'IL', zipCode: '61531', county: 'Farmington County'},
  { name: 'Flossmoor Public Library', url: 'https://www.flossmoorlibrary.org/', eventsUrl: 'https://www.flossmoorlibrary.org/', city: 'Flossmoor', state: 'IL', zipCode: '60422', county: 'Flossmoor County'},
  { name: 'Forreston Public Library', url: 'https://www.forrestonlibrary.org/', eventsUrl: 'https://www.forrestonlibrary.org/', city: 'Forreston', state: 'IL', zipCode: '61030', county: 'Forreston County'},
  { name: 'Forsyth Public Library', url: 'https://www.forsythlibrary.org', eventsUrl: 'https://www.forsythlibrary.org/events', city: 'Forsyth', state: 'IL', zipCode: '62535', county: 'Forsyth County'},
  { name: 'Frankfort Public Library District', url: 'https://www.frankfortlibrary.org/', eventsUrl: 'https://www.frankfortlibrary.org/', city: 'Frankfort', state: 'IL', zipCode: '60423', county: 'Frankfort County'},
  { name: 'Franklin Grove Public Library', url: 'https://www.franklingrovelibrary.org/', eventsUrl: 'https://www.franklingrovelibrary.org/', city: 'Franklin Grove', state: 'IL', zipCode: '61031', county: 'Franklin Grove County'},
  { name: 'Franklin Park Public Library District', url: 'https://www.franklinparklibrary.org', eventsUrl: 'https://www.franklinparklibrary.org/events', city: 'Franklin Park', state: 'IL', zipCode: '60131', county: 'Franklin Park County'},
  { name: 'Freeport Public Library', url: 'https://www.freeportlibrary.org', eventsUrl: 'https://www.freeportlibrary.org/events', city: 'Freeport', state: 'IL', zipCode: '61032', county: 'Freeport County'},
  { name: 'Schmaling Memorial Public Library District', url: 'https://www.facebook.com/', eventsUrl: 'https://www.facebook.com/fultonlibrary', city: 'Fulton', state: 'IL', zipCode: '61252', county: 'Fulton County'},
  { name: 'Galena Public Library District', url: 'https://www.galenalibrary.org', eventsUrl: 'https://www.galenalibrary.org/events', city: 'Galena', state: 'IL', zipCode: '61036', county: 'Galena County'},
  { name: 'Galesburg Public Library', url: 'https://galesburglibrary.org/', eventsUrl: 'https://galesburglibrary.org/', city: 'Galesburg', state: 'IL', zipCode: '61401', county: 'Galesburg County'},
  { name: 'Galva Public Library District', url: 'https://www.galvalibrary.org', eventsUrl: 'https://www.galvalibrary.org/events', city: 'Galva', state: 'IL', zipCode: '61434', county: 'Galva County'},
  { name: 'Geneseo Public Library District', url: 'https://www.geneseolibrary.org/', eventsUrl: 'https://www.geneseolibrary.org/', city: 'Geneseo', state: 'IL', zipCode: '61254', county: 'Geneseo County'},
  { name: 'Genoa Public Library District', url: 'https://www.genoalibrary.org/', eventsUrl: 'https://www.genoalibrary.org/', city: 'Genoa', state: 'IL', zipCode: '60135', county: 'Genoa County'},
  { name: 'Germantown Public Library District', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'IL', zipCode: '62245', county: 'Germantown County'},
  { name: 'Gilman-Danforth District Library', url: 'https://gilmanlibrary.org/', eventsUrl: 'https://gilmanlibrary.org/calendar', city: 'Gilman', state: 'IL', zipCode: '60938', county: 'Gilman County'},
  { name: 'Glen Carbon Centennial Library', url: 'https://glencarbonlibrary.org/', eventsUrl: 'https://glencarbonlibrary.org/', city: 'Glen Carbon', state: 'IL', zipCode: '62034', county: 'Glen Carbon County'},
  { name: 'Glencoe Public Library', url: 'https://www.glencoelibrary.org/', eventsUrl: 'https://www.glencoelibrary.org/', city: 'Glencoe', state: 'IL', zipCode: '60022', county: 'Glencoe County'},
  { name: 'Glenwood-Lynwood Public Library District', url: 'https://glenwoodlibrary.org/', eventsUrl: 'https://glenwoodlibrary.org/', city: 'Glenwood', state: 'IL', zipCode: '60425', county: 'Glenwood County'},
  { name: 'Golden Branch', url: 'https://www.goldenlibrary.org', eventsUrl: 'https://www.goldenlibrary.org/events', city: 'Golden', state: 'IL', zipCode: '00000', county: 'Golden County'},
  { name: 'Grant Park Public Library', url: 'https://www.grantparklibrary.org', eventsUrl: 'https://www.grantparklibrary.org/events', city: 'Grant Park', state: 'IL', zipCode: '60940', county: 'Grant Park County'},
  { name: 'Granville Branch Library', url: 'https://www.granvillelibrary.org/', eventsUrl: 'https://www.granvillelibrary.org/', city: 'Granville', state: 'IL', zipCode: '00000', county: 'Granville County'},
  { name: 'Greenfield Public Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'IL', zipCode: '62044', county: 'Greenfield County'},
  { name: 'Greenup Township Public Library', url: 'https://www.greenuplibrary.org', eventsUrl: 'https://www.greenuplibrary.org/events', city: 'Greenup', state: 'IL', zipCode: '62428', county: 'Greenup County'},
  { name: 'Greenville Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'IL', zipCode: '62246', county: 'Greenville County'},
  { name: 'Gridley Public Library District', url: 'https://gridleylibrary.org/', eventsUrl: 'https://gridleylibrary.org/', city: 'Gridley', state: 'IL', zipCode: '61744', county: 'Gridley County'},
  { name: 'Hamilton Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'IL', zipCode: '62341', county: 'Hamilton County'},
  { name: 'Hammond Branch', url: 'https://www.hammondlibrary.org', eventsUrl: 'https://www.hammondlibrary.org/events', city: 'Hammond', state: 'IL', zipCode: '00000', county: 'Hammond County'},
  { name: 'Hanover Township Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'IL', zipCode: '61041', county: 'Hanover County'},
  { name: 'Hanover Park Branch Library', url: 'https://www.hanoverparklibrary.org', eventsUrl: 'https://www.hanoverparklibrary.org/events', city: 'Hanover Park', state: 'IL', zipCode: '00000', county: 'Hanover Park County'},
  { name: 'Harrisburg Public Library District', url: 'https://www.harrisburglibrary.org/', eventsUrl: 'https://www.harrisburglibrary.org/calendar', city: 'Harrisburg', state: 'IL', zipCode: '00000', county: 'Harrisburg County'},
  { name: 'Hartford Public Library District', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'IL', zipCode: '62048', county: 'Hartford County'},
  { name: 'Harvard Diggins Library', url: 'https://www.harvardlibrary.org', eventsUrl: 'https://www.harvardlibrary.org/events', city: 'Harvard', state: 'IL', zipCode: '60033', county: 'Harvard County'},
  { name: 'Harvey Public Library District', url: 'https://www.harveylibrary.org', eventsUrl: 'https://www.harveylibrary.org/events', city: 'Harvey', state: 'IL', zipCode: '60426', county: 'Harvey County'},
  { name: 'Havana Public Library District', url: 'https://www.havanalibrary.org/', eventsUrl: 'https://www.havanalibrary.org/calendar', city: 'Havana', state: 'IL', zipCode: '62644', county: 'Havana County'},
  { name: 'Hennepin Headquarters', url: 'https://www.hennepinlibrary.org', eventsUrl: 'https://www.hennepinlibrary.org/events', city: 'Hennepin', state: 'IL', zipCode: '00000', county: 'Hennepin County'},
  { name: 'Henry Public Library', url: 'https://www.henrylibrary.org', eventsUrl: 'https://www.henrylibrary.org/events', city: 'Henry', state: 'IL', zipCode: '61537', county: 'Henry County'},
  { name: 'Herrick Township Public Library', url: 'https://herricklibrary.org/', eventsUrl: 'https://herricklibrary.org/', city: 'Herrick', state: 'IL', zipCode: '62431', county: 'Herrick County'},
  { name: 'Louis Latzer Memorial Public Library', url: 'https://highlandlibrary.org/', eventsUrl: 'https://highlandlibrary.org/', city: 'Highland', state: 'IL', zipCode: '62249', county: 'Highland County'},
  { name: 'Highwood Public Library', url: 'https://www.highwoodlibrary.org', eventsUrl: 'https://www.highwoodlibrary.org/events', city: 'Highwood', state: 'IL', zipCode: '60040', county: 'Highwood County'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'IL', zipCode: '62049', county: 'Hillsboro County'},
  { name: 'Moore Memorial Library District', url: 'https://www.cityofsanmateo.org/', eventsUrl: 'https://www.cityofsanmateo.org/507/Library', city: 'Hillsdale', state: 'IL', zipCode: '61257', county: 'Hillsdale County'},
  { name: 'Hillside Public Library', url: 'https://www.hillsidelibrary.org', eventsUrl: 'https://www.hillsidelibrary.org/events', city: 'Hillside', state: 'IL', zipCode: '60162', county: 'Hillside County'},
  { name: 'Hinckley Public Library District', url: 'https://www.hinckleylibrary.org', eventsUrl: 'https://www.hinckleylibrary.org/events', city: 'Hinckley', state: 'IL', zipCode: '60520', county: 'Hinckley County'},
  { name: 'Hodgkins Public Library District', url: 'https://www.hodgkinslibrary.org/', eventsUrl: 'https://www.hodgkinslibrary.org/', city: 'Hodgkins', state: 'IL', zipCode: '60525', county: 'Hodgkins County'},
  { name: 'Hoffman Estates Branch Library', url: 'https://www.hoffmanestateslibrary.org', eventsUrl: 'https://www.hoffmanestateslibrary.org/events', city: 'Hoffman Estates', state: 'IL', zipCode: '00000', county: 'Hoffman Estates County'},
  { name: 'Homer Community Library', url: 'https://www.homerlibrary.org', eventsUrl: 'https://www.homerlibrary.org/events', city: 'Homer', state: 'IL', zipCode: '61849', county: 'Homer County'},
  { name: 'Homewood Public Library District', url: 'https://www.homewoodlibrary.org', eventsUrl: 'https://www.homewoodlibrary.org/events', city: 'Homewood', state: 'IL', zipCode: '60430', county: 'Homewood County'},
  { name: 'Hudson Area Public Library District', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'IL', zipCode: '61748', county: 'Hudson County'},
  { name: 'Huntley Area Public Library District', url: 'https://www.huntleylibrary.org', eventsUrl: 'https://www.huntleylibrary.org/events', city: 'Huntley', state: 'IL', zipCode: '60142', county: 'Huntley County'},
  { name: 'Irvington Branch Library', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'IL', zipCode: '00000', county: 'Irvington County'},
  { name: 'Itasca Community Library', url: 'https://www.itascalibrary.org/', eventsUrl: 'https://www.itascalibrary.org/', city: 'Itasca', state: 'IL', zipCode: '60143', county: 'Itasca County'},
  { name: 'Jerseyville Public Library', url: 'https://www.jerseyvillelibrary.org/', eventsUrl: 'https://www.jerseyvillelibrary.org/', city: 'Jerseyville', state: 'IL', zipCode: '62052', county: 'Jerseyville County'},
  { name: 'Johnsburg Public Library District', url: 'https://www.johnsburglibrary.org', eventsUrl: 'https://www.johnsburglibrary.org/events', city: 'Johnsburg', state: 'IL', zipCode: '60051', county: 'Johnsburg County'},
  { name: 'Black Road Branch', url: 'https://jolietlibrary.org/', eventsUrl: 'https://jolietlibrary.org/', city: 'Joliet', state: 'IL', zipCode: '00000', county: 'Joliet County'},
  { name: 'Justice Public Library District', url: 'https://www.justicelibrary.org', eventsUrl: 'https://www.justicelibrary.org/events', city: 'Justice', state: 'IL', zipCode: '60458', county: 'Justice County'},
  { name: 'Kaneville Public Library District', url: 'https://www.kanevillelibrary.org/', eventsUrl: 'https://www.kanevillelibrary.org/', city: 'Kaneville', state: 'IL', zipCode: '60144', county: 'Kaneville County'},
  { name: 'Kewanee Public Library District', url: 'https://www.kewaneelibrary.org', eventsUrl: 'https://www.kewaneelibrary.org/events', city: 'Kewanee', state: 'IL', zipCode: '61443', county: 'Kewanee County'},
  { name: 'Lacon Public Library District', url: 'https://laconlibrary.wordpress.com/', eventsUrl: 'https://laconlibrary.wordpress.com/', city: 'Lacon', state: 'IL', zipCode: '61540', county: 'Lacon County'},
  { name: 'Ira C. Reed Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'IL', zipCode: '61449', county: 'Lafayette County'},
  { name: 'Lagrange Public Library', url: 'https://lagrangelibrary.org/', eventsUrl: 'https://lagrangelibrary.org/', city: 'Lagrange', state: 'IL', zipCode: '60525', county: 'Lagrange County'},
  { name: 'Lake Bluff Public Library', url: 'https://www.lakeblufflibrary.org', eventsUrl: 'https://www.lakeblufflibrary.org/events', city: 'Lake Bluff', state: 'IL', zipCode: '60044', county: 'Lake Bluff County'},
  { name: 'Lake Forest Library', url: 'https://www.lakeforestlibrary.org', eventsUrl: 'https://www.lakeforestlibrary.org/events', city: 'Lake Forest', state: 'IL', zipCode: '60045', county: 'Lake Forest County'},
  { name: 'Lansing Public Library', url: 'https://www.lansinglibrary.org', eventsUrl: 'https://www.lansinglibrary.org/events', city: 'Lansing', state: 'IL', zipCode: '60438', county: 'Lansing County'},
  { name: 'Lebanon Public Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'IL', zipCode: '62254', county: 'Lebanon County'},
  { name: 'Lemont Public Library District', url: 'https://www.lemontlibrary.org', eventsUrl: 'https://www.lemontlibrary.org/events', city: 'Lemont', state: 'IL', zipCode: '60439', county: 'Lemont County'},
  { name: 'Lena Community District Library', url: 'https://www.lenalibrary.org/', eventsUrl: 'https://www.lenalibrary.org/', city: 'Lena', state: 'IL', zipCode: '61048', county: 'Lena County'},
  { name: 'Lewistown Carnegie Public Library District', url: 'https://www.lewistownlibrary.org', eventsUrl: 'https://www.lewistownlibrary.org/events', city: 'Lewistown', state: 'IL', zipCode: '61542', county: 'Lewistown County'},
  { name: 'Lexington Public Library District', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'IL', zipCode: '61753', county: 'Lexington County'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'IL', zipCode: '00000', county: 'Lincoln County'},
  { name: 'Lincolnwood Public Library District', url: 'https://www.lincolnwoodlibrary.org', eventsUrl: 'https://www.lincolnwoodlibrary.org/events', city: 'Lincolnwood', state: 'IL', zipCode: '60712', county: 'Lincolnwood County'},
  { name: 'Lisle Library District', url: 'https://www.lislelibrary.org/', eventsUrl: 'https://www.lislelibrary.org/', city: 'Lisle', state: 'IL', zipCode: '60532', county: 'Lisle County'},
  { name: 'Littleton Branch', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'IL', zipCode: '00000', county: 'Littleton County'},
  { name: 'Lockport Branch Library', url: 'https://www.lockportlibrary.org', eventsUrl: 'https://www.lockportlibrary.org/events', city: 'Lockport', state: 'IL', zipCode: '60441', county: 'Lockport County'},
  { name: 'Logan Reading Center', url: 'https://loganlibrary.org/', eventsUrl: 'https://loganlibrary.org/calendar/', city: 'Logan', state: 'IL', zipCode: '00000', county: 'Logan County'},
  { name: 'Lyons Public Library', url: 'https://lyonslibrary.org/', eventsUrl: 'https://lyonslibrary.org/', city: 'Lyons', state: 'IL', zipCode: '60534', county: 'Lyons County'},
  { name: 'Mackinaw District Public Library', url: 'https://www.mackinawlibrary.org/', eventsUrl: 'https://www.mackinawlibrary.org/', city: 'Mackinaw', state: 'IL', zipCode: '61755', county: 'Mackinaw County'},
  { name: 'South Macon Public Library District', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'IL', zipCode: '62544', county: 'Macon County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'IL', zipCode: '62060', county: 'Madison County'},
  { name: 'Magnolia Branch', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'IL', zipCode: '00000', county: 'Magnolia County'},
  { name: 'Malta Township Public Library', url: 'https://www.maltalibrary.org/', eventsUrl: 'https://www.maltalibrary.org/calendar', city: 'Malta', state: 'IL', zipCode: '60150', county: 'Malta County'},
  { name: 'Blue Ridge Township Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'IL', zipCode: '61854', county: 'Mansfield County'},
  { name: 'Manteno Public Library District', url: 'https://www.mantenolibrary.org', eventsUrl: 'https://www.mantenolibrary.org/events', city: 'Manteno', state: 'IL', zipCode: '60950', county: 'Manteno County'},
  { name: 'Maple Park Public Library District', url: 'https://www.mapleparklibrary.org/', eventsUrl: 'https://www.mapleparklibrary.org/', city: 'Maple Park', state: 'IL', zipCode: '60151', county: 'Maple Park County'},
  { name: 'Crab Orchard Public Library District', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'IL', zipCode: '62959', county: 'Marion County'},
  { name: 'Marissa Area Public Library District', url: 'https://www.marissalibrary.org/', eventsUrl: 'https://www.marissalibrary.org/calendar', city: 'Marissa', state: 'IL', zipCode: '62257', county: 'Marissa County'},
  { name: 'Bradford Anderson Oglesby Public Library', url: 'https://www.markhamlibrary.org', eventsUrl: 'https://www.markhamlibrary.org/events', city: 'Markham', state: 'IL', zipCode: '60428', county: 'Markham County'},
  { name: 'Marshall Public Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'IL', zipCode: '62441', county: 'Marshall County'},
  { name: 'Maryville Community Library District', url: 'https://www.maryvillelibrary.org', eventsUrl: 'https://www.maryvillelibrary.org/events', city: 'Maryville', state: 'IL', zipCode: '62062', county: 'Maryville County'},
  { name: 'Mason City Public Library District', url: 'https://www.masoncitylibrary.org/', eventsUrl: 'https://www.masoncitylibrary.org/', city: 'Mason City', state: 'IL', zipCode: '62664', county: 'Mason City County'},
  { name: 'Mattoon Public Library', url: 'https://mattoonlibrary.org/', eventsUrl: 'https://mattoonlibrary.org/', city: 'Mattoon', state: 'IL', zipCode: '61938', county: 'Mattoon County'},
  { name: 'Maywood Public Library District', url: 'https://www.maywoodlibrary.org', eventsUrl: 'https://www.maywoodlibrary.org/events', city: 'Maywood', state: 'IL', zipCode: '60153', county: 'Maywood County'},
  { name: 'Mccook Public Library District', url: 'https://mccooklibrary.org/', eventsUrl: 'https://mccooklibrary.org/', city: 'Mccook', state: 'IL', zipCode: '60525', county: 'Mccook County'},
  { name: 'Mchenry Nunda Public Library District', url: 'https://www.mchenrylibrary.org/', eventsUrl: 'https://www.mchenrylibrary.org/', city: 'Mchenry', state: 'IL', zipCode: '60051', county: 'Mchenry County'},
  { name: 'Melrose Park Public Library', url: 'https://www.melroseparklibrary.org', eventsUrl: 'https://www.melroseparklibrary.org/events', city: 'Melrose Park', state: 'IL', zipCode: '60160', county: 'Melrose Park County'},
  { name: 'Four Star Public Library District', url: 'https://mendonlibrary.org/', eventsUrl: 'https://mendonlibrary.org/', city: 'Mendon', state: 'IL', zipCode: '62351', county: 'Mendon County'},
  { name: 'Metropolis Public Library', url: 'https://www.metropolislibrary.org', eventsUrl: 'https://www.metropolislibrary.org/events', city: 'Metropolis', state: 'IL', zipCode: '62960', county: 'Metropolis County'},
  { name: 'Midlothian Public Library', url: 'https://www.midlothianlibrary.org', eventsUrl: 'https://www.midlothianlibrary.org/events', city: 'Midlothian', state: 'IL', zipCode: '60445', county: 'Midlothian County'},
  { name: 'Coyne Center Branch', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'IL', zipCode: '00000', county: 'Milan County'},
  { name: 'Milford District Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'IL', zipCode: '60953', county: 'Milford County'},
  { name: 'Wysox Township Public Library', url: 'https://milledgevillelibrary.org/', eventsUrl: 'https://milledgevillelibrary.org/calendar', city: 'Milledgeville', state: 'IL', zipCode: '61051', county: 'Milledgeville County'},
  { name: 'Mokena Community Public Library District', url: 'https://mokenalibrary.org/', eventsUrl: 'https://mokenalibrary.org/', city: 'Mokena', state: 'IL', zipCode: '60448', county: 'Mokena County'},
  { name: 'Moline Public Library', url: 'https://www.molinelibrary.org', eventsUrl: 'https://www.molinelibrary.org/events', city: 'Moline', state: 'IL', zipCode: '61265', county: 'Moline County'},
  { name: 'Edward Chipman Public Library', url: 'https://momencelibrary.org/', eventsUrl: 'https://momencelibrary.org/category/upcoming-events/', city: 'Momence', state: 'IL', zipCode: '60954', county: 'Momence County'},
  { name: 'Allerton Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'IL', zipCode: '00000', county: 'Monticello County'},
  { name: 'Morton Public Library District', url: 'https://mortonlibrary.org/', eventsUrl: 'https://mortonlibrary.org/', city: 'Morton', state: 'IL', zipCode: '61550', county: 'Morton County'},
  { name: 'Mound City Public Library', url: 'https://www.moundcitylibrary.org', eventsUrl: 'https://www.moundcitylibrary.org/events', city: 'Mound City', state: 'IL', zipCode: '62963', county: 'Mound City County'},
  { name: 'Mount Morris Public Library', url: 'https://www.mountmorrislibrary.org', eventsUrl: 'https://www.mountmorrislibrary.org/events', city: 'Mount Morris', state: 'IL', zipCode: '61054', county: 'Mount Morris County'},
  { name: '95th Street Library (Nsl)', url: 'https://www.napervillelibrary.org', eventsUrl: 'https://www.napervillelibrary.org/events', city: 'Naperville', state: 'IL', zipCode: '00000', county: 'Naperville County'},
  { name: 'Neponset Public Library', url: 'https://neponsetlibrary.org/', eventsUrl: 'https://neponsetlibrary.org/', city: 'Neponset', state: 'IL', zipCode: '61345', county: 'Neponset County'},
  { name: 'New Athens District Library', url: 'https://newathenslibrary.org/', eventsUrl: 'https://newathenslibrary.org/calendar/upcoming-events/', city: 'New Athens', state: 'IL', zipCode: '62264', county: 'New Athens County'},
  { name: 'New Baden Public Library', url: 'https://newbadenlibrary.org/', eventsUrl: 'https://newbadenlibrary.org/calendar/', city: 'New Baden', state: 'IL', zipCode: '62265', county: 'New Baden County'},
  { name: 'West Sangamon Public Library District', url: 'https://www.newberlinlibrary.org', eventsUrl: 'https://www.newberlinlibrary.org/events', city: 'New Berlin', state: 'IL', zipCode: '62670', county: 'New Berlin County'},
  { name: 'New Lenox Public Library District', url: 'https://www.newlenoxlibrary.org', eventsUrl: 'https://www.newlenoxlibrary.org/events', city: 'New Lenox', state: 'IL', zipCode: '60451', county: 'New Lenox County'},
  { name: 'Charles B. Phillips Public Library District', url: 'https://newarklibrary.org/', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'IL', zipCode: '60541', county: 'Newark County'},
  { name: 'Newman Regional Library District', url: 'https://www.newmanlibrary.org/', eventsUrl: 'https://www.newmanlibrary.org/', city: 'Newman', state: 'IL', zipCode: '61942', county: 'Newman County'},
  { name: 'Newton Public Library District', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'IL', zipCode: '62448', county: 'Newton County'},
  { name: 'Niles Public Library District', url: 'https://www.nileslibrary.org', eventsUrl: 'https://www.nileslibrary.org/events', city: 'Niles', state: 'IL', zipCode: '60714', county: 'Niles County'},
  { name: 'North Riverside Public Library District', url: 'https://www.northriversidelibrary.org', eventsUrl: 'https://www.northriversidelibrary.org/events', city: 'North Riverside', state: 'IL', zipCode: '60546', county: 'North Riverside County'},
  { name: 'Northlake Public Library District', url: 'https://www.northlakelibrary.org', eventsUrl: 'https://www.northlakelibrary.org/events', city: 'Northlake', state: 'IL', zipCode: '60164', county: 'Northlake County'},
  { name: 'Oak Lawn Public Library', url: 'https://www.oaklawnlibrary.org', eventsUrl: 'https://www.oaklawnlibrary.org/events', city: 'Oak Lawn', state: 'IL', zipCode: '60453', county: 'Oak Lawn County'},
  { name: 'Ofallon Public Library', url: 'https://www.ofallonlibrary.org', eventsUrl: 'https://www.ofallonlibrary.org/events', city: 'Ofallon', state: 'IL', zipCode: '62269', county: 'Ofallon County'},
  { name: 'Oglesby Public Library District', url: 'https://www.oglesbylibrary.org/', eventsUrl: 'https://www.oglesbylibrary.org/calendar', city: 'Oglesby', state: 'IL', zipCode: '61348', county: 'Oglesby County'},
  { name: 'Olney Public Library', url: 'https://www.olneylibrary.org', eventsUrl: 'https://www.olneylibrary.org/events', city: 'Olney', state: 'IL', zipCode: '62450', county: 'Olney County'},
  { name: 'Oregon Public Library District', url: 'https://www.oregonlibrary.org', eventsUrl: 'https://www.oregonlibrary.org/events', city: 'Oregon', state: 'IL', zipCode: '61061', county: 'Oregon County'},
  { name: 'Western District Library', url: 'https://www.orionlibrary.org/', eventsUrl: 'https://www.orionlibrary.org/', city: 'Orion', state: 'IL', zipCode: '61273', county: 'Orion County'},
  { name: 'Orland Park Public Library', url: 'https://www.orlandparklibrary.org/', eventsUrl: 'https://www.orlandparklibrary.org/', city: 'Orland Park', state: 'IL', zipCode: '60462', county: 'Orland Park County'},
  { name: 'Oswego Public Library District', url: 'https://www.oswegolibrary.org', eventsUrl: 'https://www.oswegolibrary.org/events', city: 'Oswego', state: 'IL', zipCode: '60543', county: 'Oswego County'},
  { name: 'Reddick Public Library District', url: 'https://www.ottawalibrary.org/', eventsUrl: 'https://www.ottawalibrary.org/', city: 'Ottawa', state: 'IL', zipCode: '61350', county: 'Ottawa County'},
  { name: 'Palatine Public Library District', url: 'https://www.palatinelibrary.org', eventsUrl: 'https://www.palatinelibrary.org/events', city: 'Palatine', state: 'IL', zipCode: '60067', county: 'Palatine County'},
  { name: 'Palos Park Public Library', url: 'https://www.palosparklibrary.org/', eventsUrl: 'https://www.palosparklibrary.org/', city: 'Palos Park', state: 'IL', zipCode: '60464', county: 'Palos Park County'},
  { name: 'Park Ridge Public Library', url: 'https://www.parkridgelibrary.org/', eventsUrl: 'https://www.parkridgelibrary.org/', city: 'Park Ridge', state: 'IL', zipCode: '60068', county: 'Park Ridge County'},
  { name: 'Paw Paw Public Library District', url: 'https://www.pawpawlibrary.org', eventsUrl: 'https://www.pawpawlibrary.org/events', city: 'Paw Paw', state: 'IL', zipCode: '61353', county: 'Paw Paw County'},
  { name: 'Paxton Carnegie Library', url: 'https://paxtonflorida.com/', eventsUrl: 'https://paxtonflorida.com/library/', city: 'Paxton', state: 'IL', zipCode: '60957', county: 'Paxton County'},
  { name: 'Pearl City Public Library District', url: 'https://www.pearlcitylibrary.org/', eventsUrl: 'https://www.pearlcitylibrary.org/', city: 'Pearl City', state: 'IL', zipCode: '61062', county: 'Pearl City County'},
  { name: 'Pecatonica Public Library District', url: 'https://www.pecatonicalibrary.org', eventsUrl: 'https://www.pecatonicalibrary.org/events', city: 'Pecatonica', state: 'IL', zipCode: '61063', county: 'Pecatonica County'},
  { name: 'Pekin Public Library', url: 'https://www.pekinlibrary.org', eventsUrl: 'https://www.pekinlibrary.org/events', city: 'Pekin', state: 'IL', zipCode: '61554', county: 'Pekin County'},
  { name: 'Peotone Public Library District', url: 'https://www.peotonelibrary.org', eventsUrl: 'https://www.peotonelibrary.org/events', city: 'Peotone', state: 'IL', zipCode: '60468', county: 'Peotone County'},
  { name: 'Peru Public Library', url: 'https://www.perulibrary.org', eventsUrl: 'https://www.perulibrary.org/events', city: 'Peru', state: 'IL', zipCode: '61354', county: 'Peru County'},
  { name: 'Philo Public Library District', url: 'https://www.philolibrary.org', eventsUrl: 'https://www.philolibrary.org/events', city: 'Philo', state: 'IL', zipCode: '61864', county: 'Philo County'},
  { name: 'Pittsburg Branch Library', url: 'https://www.pittsburglibrary.org/', eventsUrl: 'https://www.pittsburglibrary.org/', city: 'Pittsburg', state: 'IL', zipCode: '00000', county: 'Pittsburg County'},
  { name: 'Pittsfield Public Library', url: 'https://www.pittsfieldlibrary.org/', eventsUrl: 'https://www.pittsfieldlibrary.org/', city: 'Pittsfield', state: 'IL', zipCode: '62363', county: 'Pittsfield County'},
  { name: 'Plainfield Public Library District', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'IL', zipCode: '60544', county: 'Plainfield County'},
  { name: 'Plano Community Library District', url: 'https://www.planolibrary.org', eventsUrl: 'https://www.planolibrary.org/events', city: 'Plano', state: 'IL', zipCode: '60545', county: 'Plano County'},
  { name: 'Plymouth Branch', url: 'https://plymouthlibrary.org/', eventsUrl: 'https://plymouthlibrary.org/', city: 'Plymouth', state: 'IL', zipCode: '00000', county: 'Plymouth County'},
  { name: 'Polo Public Library District', url: 'https://www.pololibrary.org', eventsUrl: 'https://www.pololibrary.org/events', city: 'Polo', state: 'IL', zipCode: '61064', county: 'Polo County'},
  { name: 'Pontiac Public Library', url: 'https://www.pontiaclibrary.org', eventsUrl: 'https://www.pontiaclibrary.org/events', city: 'Pontiac', state: 'IL', zipCode: '61764', county: 'Pontiac County'},
  { name: 'River Valley District Library', url: 'https://www.portbyronlibrary.org', eventsUrl: 'https://www.portbyronlibrary.org/events', city: 'Port Byron', state: 'IL', zipCode: '61275', county: 'Port Byron County'},
  { name: 'Matson Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'IL', zipCode: '00000', county: 'Princeton County'},
  { name: 'Lillie M. Evans Library District', url: 'https://friendsnslp.org/', eventsUrl: 'https://friendsnslp.org/calendar', city: 'Princeville', state: 'IL', zipCode: '61559', county: 'Princeville County'},
  { name: 'Quincy Public Library', url: 'https://www.quincylibrary.org', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'IL', zipCode: '62301', county: 'Quincy County'},
  { name: 'Ramsey Public Library', url: 'https://www.ramseylibrary.org', eventsUrl: 'https://www.ramseylibrary.org/events', city: 'Ramsey', state: 'IL', zipCode: '62080', county: 'Ramsey County'},
  { name: 'Nippersink Public Library District', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'IL', zipCode: '60071', county: 'Richmond County'},
  { name: 'Richton Park Public Library District', url: 'https://www.richtonparklibrary.org', eventsUrl: 'https://www.richtonparklibrary.org/events', city: 'Richton Park', state: 'IL', zipCode: '60471', county: 'Richton Park County'},
  { name: 'Elwood Township Carnegie Library', url: 'https://www.ridgefarmlibrary.org', eventsUrl: 'https://www.ridgefarmlibrary.org/events', city: 'Ridge Farm', state: 'IL', zipCode: '61870', county: 'Ridge Farm County'},
  { name: 'River Forest Public Library', url: 'https://www.riverforestlibrary.org', eventsUrl: 'https://www.riverforestlibrary.org/events', city: 'River Forest', state: 'IL', zipCode: '60305', county: 'River Forest County'},
  { name: 'River Grove Public Library District', url: 'https://www.rivergrovelibrary.org', eventsUrl: 'https://www.rivergrovelibrary.org/events', city: 'River Grove', state: 'IL', zipCode: '60171', county: 'River Grove County'},
  { name: 'Riverdale Public Library District', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'IL', zipCode: '60827', county: 'Riverdale County'},
  { name: 'Riverside Public Library', url: 'https://www.riversidelibrary.org', eventsUrl: 'https://www.riversidelibrary.org/events', city: 'Riverside', state: 'IL', zipCode: '60546', county: 'Riverside County'},
  { name: 'William Leonard Public Library District', url: 'https://www.robbinslibrary.org', eventsUrl: 'https://www.robbinslibrary.org/events', city: 'Robbins', state: 'IL', zipCode: '60472', county: 'Robbins County'},
  { name: 'Robinson Public Library District', url: 'https://www.robinsonlibrary.org', eventsUrl: 'https://www.robinsonlibrary.org/events', city: 'Robinson', state: 'IL', zipCode: '62454', county: 'Robinson County'},
  { name: 'Rochester Public Library District', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'IL', zipCode: '62563', county: 'Rochester County'},
  { name: 'Rock Island 30-31 Branch', url: 'https://www.rockislandlibrary.org', eventsUrl: 'https://www.rockislandlibrary.org/events', city: 'Rock Island', state: 'IL', zipCode: '00000', county: 'Rock Island County'},
  { name: 'Roodhouse Public Library', url: 'https://roodhouselibrary.org/', eventsUrl: 'https://roodhouselibrary.org/', city: 'Roodhouse', state: 'IL', zipCode: '62082', county: 'Roodhouse County'},
  { name: 'Roselle Public Library District', url: 'https://www.rosellelibrary.org', eventsUrl: 'https://www.rosellelibrary.org/events', city: 'Roselle', state: 'IL', zipCode: '60172', county: 'Roselle County'},
  { name: 'Roseville Branch Library', url: 'https://rosevillelibrary.org/', eventsUrl: 'https://rosevillelibrary.org/', city: 'Roseville', state: 'IL', zipCode: '00000', county: 'Roseville County'},
  { name: 'Round Lake Area Public Library District', url: 'https://roundlake.sals.edu/', eventsUrl: 'https://roundlake.sals.edu/', city: 'Round Lake', state: 'IL', zipCode: '60073', county: 'Round Lake County'},
  { name: 'Roxana Public Library District', url: 'https://www.roxanalibrary.org', eventsUrl: 'https://www.roxanalibrary.org/events', city: 'Roxana', state: 'IL', zipCode: '62084', county: 'Roxana County'},
  { name: 'Royalton Public Library District', url: 'https://www.royaltonlibrary.org', eventsUrl: 'https://www.royaltonlibrary.org/events', city: 'Royalton', state: 'IL', zipCode: '62983', county: 'Royalton County'},
  { name: 'Bryan-Bennett Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'IL', zipCode: '62881', county: 'Salem County'},
  { name: 'Schaumburg Township District Library', url: 'https://www.schaumburglibrary.org', eventsUrl: 'https://www.schaumburglibrary.org/events', city: 'Schaumburg', state: 'IL', zipCode: '60193', county: 'Schaumburg County'},
  { name: 'Schiller Park Public Library', url: 'https://www.schillerparklibrary.org', eventsUrl: 'https://www.schillerparklibrary.org/events', city: 'Schiller Park', state: 'IL', zipCode: '60176', county: 'Schiller Park County'},
  { name: 'Seneca Public Library District', url: 'https://www.senecalibrary.org', eventsUrl: 'https://www.senecalibrary.org/events', city: 'Seneca', state: 'IL', zipCode: '61360', county: 'Seneca County'},
  { name: 'Flewellin Memorial Library', url: 'https://www.shabbonalibrary.org/', eventsUrl: 'https://www.shabbonalibrary.org/', city: 'Shabbona', state: 'IL', zipCode: '60550', county: 'Shabbona County'},
  { name: 'Shawneetown Public Library', url: 'https://www.shawneetownlibrary.org', eventsUrl: 'https://www.shawneetownlibrary.org/events', city: 'Shawneetown', state: 'IL', zipCode: '62984', county: 'Shawneetown County'},
  { name: 'Sheffield Public Library', url: 'https://www.sheffieldlibrary.org/', eventsUrl: 'https://www.sheffieldlibrary.org/', city: 'Sheffield', state: 'IL', zipCode: '61361', county: 'Sheffield County'},
  { name: 'Shelbyville Public Library', url: 'https://www.shelbyvillelibrary.org/', eventsUrl: 'https://www.shelbyvillelibrary.org/', city: 'Shelbyville', state: 'IL', zipCode: '62565', county: 'Shelbyville County'},
  { name: 'Sheldon Public Library District', url: 'https://www.sheldonlibrary.org', eventsUrl: 'https://www.sheldonlibrary.org/events', city: 'Sheldon', state: 'IL', zipCode: '60966', county: 'Sheldon County'},
  { name: 'Sherman Public Library District', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'IL', zipCode: '62684', county: 'Sherman County'},
  { name: 'Sherrard Public Library District', url: 'https://www.sherrardlibrary.org/', eventsUrl: 'https://www.sherrardlibrary.org/', city: 'Sherrard', state: 'IL', zipCode: '61281', county: 'Sherrard County'},
  { name: 'Shorewood-Troy Public Library District', url: 'https://www.shorewoodlibrary.org/', eventsUrl: 'https://www.shorewoodlibrary.org/connect/events/', city: 'Shorewood', state: 'IL', zipCode: '60404', county: 'Shorewood County'},
  { name: 'Sidney Community Library', url: 'https://www.sidneylibrary.org/', eventsUrl: 'https://www.sidneylibrary.org/index.php/calendar/', city: 'Sidney', state: 'IL', zipCode: '61877', county: 'Sidney County'},
  { name: 'Silvis Public Library', url: 'https://www.silvislibrary.org/', eventsUrl: 'https://www.silvislibrary.org/', city: 'Silvis', state: 'IL', zipCode: '61282', county: 'Silvis County'},
  { name: 'Somonauk Public Library District', url: 'https://www.somonauklibrary.org', eventsUrl: 'https://www.somonauklibrary.org/events', city: 'Somonauk', state: 'IL', zipCode: '60552', county: 'Somonauk County'},
  { name: 'South Holland Public Library', url: 'https://www.southhollandlibrary.org', eventsUrl: 'https://www.southhollandlibrary.org/events', city: 'South Holland', state: 'IL', zipCode: '60473', county: 'South Holland County'},
  { name: 'Sparta Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'IL', zipCode: '62286', county: 'Sparta County'},
  { name: 'Richard A. Mautino Memorial Library', url: 'https://www.springvalleylibrary.org', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'IL', zipCode: '61362', county: 'Spring Valley County'},
  { name: 'Lincoln Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'IL', zipCode: '62701', county: 'Springfield County'},
  { name: 'St. Charles Public Library District', url: 'https://www.scpld.org/', eventsUrl: 'https://www.scpld.org/', city: 'St. Charles', state: 'IL', zipCode: '00000', county: 'St. Charles County'},
  { name: 'Allin Township Library', url: 'https://stanfordlibrary.org/', eventsUrl: 'https://stanfordlibrary.org/', city: 'Stanford', state: 'IL', zipCode: '61774', county: 'Stanford County'},
  { name: 'Staunton Public Library', url: 'https://www.stauntonlibrary.org', eventsUrl: 'https://www.stauntonlibrary.org/events', city: 'Staunton', state: 'IL', zipCode: '62088', county: 'Staunton County'},
  { name: 'Steeleville Area Public Library District', url: 'https://www.steelevillelibrary.org/', eventsUrl: 'https://www.steelevillelibrary.org/', city: 'Steeleville', state: 'IL', zipCode: '62288', county: 'Steeleville County'},
  { name: 'Sterling Public Library', url: 'https://sterlinglibrary.org/', eventsUrl: 'https://sterlinglibrary.org/calendar/', city: 'Sterling', state: 'IL', zipCode: '61081', county: 'Sterling County'},
  { name: 'Stockton Township Public Library', url: 'https://stocktonlibrary.org/', eventsUrl: 'https://stocktonlibrary.org/', city: 'Stockton', state: 'IL', zipCode: '61085', county: 'Stockton County'},
  { name: 'Stonington Township Public Library', url: 'https://www.stoningtonlibrary.org/', eventsUrl: 'https://www.stoningtonlibrary.org/', city: 'Stonington', state: 'IL', zipCode: '62567', county: 'Stonington County'},
  { name: 'Elizabeth Titus Memorial Library', url: 'https://www.sullivanlibrary.org', eventsUrl: 'https://www.sullivanlibrary.org/events', city: 'Sullivan', state: 'IL', zipCode: '61951', county: 'Sullivan County'},
  { name: 'Summit Public Library District', url: 'https://www.summitlibrary.org/', eventsUrl: 'https://www.summitlibrary.org/', city: 'Summit', state: 'IL', zipCode: '60501', county: 'Summit County'},
  { name: 'Sycamore Public Library', url: 'https://www.sycamorelibrary.org', eventsUrl: 'https://www.sycamorelibrary.org/events', city: 'Sycamore', state: 'IL', zipCode: '60178', county: 'Sycamore County'},
  { name: 'Taylorville Public Library', url: 'https://www.taylorvillelibrary.org/', eventsUrl: 'https://www.taylorvillelibrary.org/', city: 'Taylorville', state: 'IL', zipCode: '62568', county: 'Taylorville County'},
  { name: 'York Township Public Library', url: 'https://www.thomsonlibrary.org/', eventsUrl: 'https://www.thomsonlibrary.org/', city: 'Thomson', state: 'IL', zipCode: '61285', county: 'Thomson County'},
  { name: 'Tilden Public Library', url: 'https://www.tildenlibrary.org', eventsUrl: 'https://www.tildenlibrary.org/events', city: 'Tilden', state: 'IL', zipCode: '62292', county: 'Tilden County'},
  { name: 'Sumpter Township Library', url: 'https://www.toledolibrary.org', eventsUrl: 'https://www.toledolibrary.org/events', city: 'Toledo', state: 'IL', zipCode: '62468', county: 'Toledo County'},
  { name: 'Tolono Public Library District', url: 'https://www.tolonolibrary.org', eventsUrl: 'https://www.tolonolibrary.org/events', city: 'Tolono', state: 'IL', zipCode: '61880', county: 'Tolono County'},
  { name: 'Towanda District Library', url: 'https://towandalibrary.org/', eventsUrl: 'https://towandalibrary.org/', city: 'Towanda', state: 'IL', zipCode: '61776', county: 'Towanda County'},
  { name: 'Tri-Township Public Library District', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'IL', zipCode: '62294', county: 'Troy County'},
  { name: 'Tuscola Public Library', url: 'https://www.tuscolalibrary.org/', eventsUrl: 'https://www.tuscolalibrary.org/', city: 'Tuscola', state: 'IL', zipCode: '61953', county: 'Tuscola County'},
  { name: 'Urbana Free Library', url: 'https://www.urbanalibrary.org', eventsUrl: 'https://www.urbanalibrary.org/events', city: 'Urbana', state: 'IL', zipCode: '61801', county: 'Urbana County'},
  { name: 'Utica Public Library District', url: 'https://www.uticalibrary.org', eventsUrl: 'https://www.uticalibrary.org/events', city: 'Utica', state: 'IL', zipCode: '61373', county: 'Utica County'},
  { name: 'Venice Public Library', url: 'https://www.venicelibrary.org', eventsUrl: 'https://www.venicelibrary.org/events', city: 'Venice', state: 'IL', zipCode: '62090', county: 'Venice County'},
  { name: 'Warren Township Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'IL', zipCode: '61087', county: 'Warren County'},
  { name: 'Warsaw Public Library', url: 'https://www.warsawlibrary.org/', eventsUrl: 'https://www.warsawlibrary.org/', city: 'Warsaw', state: 'IL', zipCode: '62379', county: 'Warsaw County'},
  { name: 'Washburn Branch', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'IL', zipCode: '00000', county: 'Washburn County'},
  { name: 'Morrison-Talbott Library', url: 'https://www.waterloolibrary.org', eventsUrl: 'https://www.waterloolibrary.org/events', city: 'Waterloo', state: 'IL', zipCode: '62298', county: 'Waterloo County'},
  { name: 'Watseka Public Library', url: 'https://www.watsekalibrary.org', eventsUrl: 'https://www.watsekalibrary.org/events', city: 'Watseka', state: 'IL', zipCode: '60970', county: 'Watseka County'},
  { name: 'Waverly Public Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'IL', zipCode: '62692', county: 'Waverly County'},
  { name: 'West Chicago Public Library District', url: 'https://www.westchicagolibrary.org', eventsUrl: 'https://www.westchicagolibrary.org/events', city: 'West Chicago', state: 'IL', zipCode: '60185', county: 'West Chicago County'},
  { name: 'Westchester Public Library', url: 'https://www.westchesterlibrary.org', eventsUrl: 'https://www.westchesterlibrary.org/events', city: 'Westchester', state: 'IL', zipCode: '60154', county: 'Westchester County'},
  { name: 'Westmont Public Library', url: 'https://www.westmontlibrary.org', eventsUrl: 'https://www.westmontlibrary.org/events', city: 'Westmont', state: 'IL', zipCode: '60559', county: 'Westmont County'},
  { name: 'Wheaton Public Library', url: 'https://www.wheatonlibrary.org', eventsUrl: 'https://www.wheatonlibrary.org/events', city: 'Wheaton', state: 'IL', zipCode: '60187', county: 'Wheaton County'},
  { name: 'Williamsville Public Library', url: 'https://www.williamsvillelibrary.org/', eventsUrl: 'https://www.williamsvillelibrary.org/', city: 'Williamsville', state: 'IL', zipCode: '62693', county: 'Williamsville County'},
  { name: 'Wilmette Public Library District', url: 'https://www.wilmettelibrary.org', eventsUrl: 'https://www.wilmettelibrary.org/events', city: 'Wilmette', state: 'IL', zipCode: '60091', county: 'Wilmette County'},
  { name: 'Wilmington Public Library District', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'IL', zipCode: '60481', county: 'Wilmington County'},
  { name: 'Winchester Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'IL', zipCode: '62694', county: 'Winchester County'},
  { name: 'Windsor Storm Memorial Public Library District', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'IL', zipCode: '61957', county: 'Windsor County'},
  { name: 'Winfield Public Library', url: 'https://www.winfieldlibrary.org/', eventsUrl: 'https://www.winfieldlibrary.org/', city: 'Winfield', state: 'IL', zipCode: '60190', county: 'Winfield County'},
  { name: 'Winnetka-Northfield Public Library District', url: 'https://www.winnetkalibrary.org', eventsUrl: 'https://www.winnetkalibrary.org/events', city: 'Winnetka', state: 'IL', zipCode: '60093', county: 'Winnetka County'},
  { name: 'Wood Dale Public Library District', url: 'https://www.wooddalelibrary.org', eventsUrl: 'https://www.wooddalelibrary.org/events', city: 'Wood Dale', state: 'IL', zipCode: '60191', county: 'Wood Dale County'},
  { name: 'Wood River Public Library', url: 'https://www.woodriverlibrary.org', eventsUrl: 'https://www.woodriverlibrary.org/events', city: 'Wood River', state: 'IL', zipCode: '62095', county: 'Wood River County'},
  { name: 'Woodridge Public Library', url: 'https://www.woodridgelibrary.org', eventsUrl: 'https://www.woodridgelibrary.org/events', city: 'Woodridge', state: 'IL', zipCode: '60517', county: 'Woodridge County'},
  { name: 'Worth Public Library District', url: 'https://www.worthlibrary.org', eventsUrl: 'https://www.worthlibrary.org/events', city: 'Worth', state: 'IL', zipCode: '60482', county: 'Worth County'},
  { name: 'Zeigler Public Library', url: 'https://www.zeiglerlibrary.org', eventsUrl: 'https://www.zeiglerlibrary.org/events', city: 'Zeigler', state: 'IL', zipCode: '62999', county: 'Zeigler County'},
];

const SCRAPER_NAME = 'wordpress-IL';

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
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
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

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
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

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

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
            state: 'IL',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));

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
    state: 'IL',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Illinois Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressILCloudFunction() {
  console.log('☁️ Running WordPress IL as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-IL', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-IL', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressILCloudFunction };
