const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Wisconsin Public Libraries Scraper
 * State: WI
 * Coverage: All Wisconsin Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Milwaukee Public Library', url: 'https://mpl.libnet.info/', eventsUrl: 'https://mpl.libnet.info/events', city: 'Milwaukee', state: 'WI', zipCode: '53202', county: 'Milwaukee County'},
  { name: 'Madison Public Library', url: 'https://www.madisonpubliclibrary.org', eventsUrl: 'https://www.madisonpubliclibrary.org/events', city: 'Madison', state: 'WI', zipCode: '53703', county: 'Madison County'},
  // Regional Libraries
  { name: 'Brown County Library', url: 'https://www.browncountylibrary.org', eventsUrl: 'https://www.browncountylibrary.org/events', city: 'Green Bay', state: 'WI', zipCode: '54301' },
  { name: 'Racine Public Library', url: 'https://www.racinelibrary.info/', eventsUrl: 'https://www.racinelibrary.info/calendar-of-events/', city: 'Racine', state: 'WI', zipCode: '53403', county: 'Racine County'},
  { name: 'Appleton Public Library', url: 'https://www.apl.org', eventsUrl: 'https://www.apl.org/events', city: 'Appleton', state: 'WI', zipCode: '54911', county: 'Appleton County'},
  { name: 'Waukesha Public Library', url: 'https://waukeshapubliclibrary.org/', eventsUrl: 'https://waukeshapubliclibrary.org/', city: 'Waukesha', state: 'WI', zipCode: '53186', county: 'Waukesha County'},
  { name: 'Oshkosh Public Library', url: 'https://www.oshkoshpubliclibrary.org', eventsUrl: 'https://www.oshkoshpubliclibrary.org/events', city: 'Oshkosh', state: 'WI', zipCode: '54901', county: 'Oshkosh County'},
  { name: 'Eau Claire Public Library', url: 'https://www.eauclaire.lib.wi.us', eventsUrl: 'https://www.eauclaire.lib.wi.us/events', city: 'Eau Claire', state: 'WI', zipCode: '54701', county: 'Eau Claire County'},
  { name: 'La Crosse Public Library', url: 'https://www.lacrosselibrary.org', eventsUrl: 'https://www.lacrosselibrary.org/events', city: 'La Crosse', state: 'WI', zipCode: '54601', county: 'La Crosse County'},
  { name: 'Wauwatosa Public Library', url: 'https://wauwatosa.librarycalendar.com/', eventsUrl: 'https://wauwatosa.librarycalendar.com/events/month', city: 'Wauwatosa', state: 'WI', zipCode: '53213', county: 'Wauwatosa County'},
  { name: 'Fond du Lac Public Library', url: 'https://www.fdlpl.org', eventsUrl: 'https://www.fdlpl.org/events', city: 'Fond du Lac', state: 'WI', zipCode: '54935', county: 'Fond du Lac County'},
  { name: 'Brookfield Public Library', url: 'https://www.brookfieldlibrary.info', eventsUrl: 'https://www.brookfieldlibrary.info/events', city: 'Brookfield', state: 'WI', zipCode: '53045', county: 'Brookfield County'},
  { name: 'Beloit Public Library', url: 'https://www.beloitlibrary.info', eventsUrl: 'https://www.beloitlibrary.info/events', city: 'Beloit', state: 'WI', zipCode: '53511', county: 'Beloit County'},
  { name: 'Greenfield Public Library', url: 'https://www.greenfieldwi.us/library', eventsUrl: 'https://www.greenfieldwi.us/library/events', city: 'Greenfield', state: 'WI', zipCode: '53220', county: 'Greenfield County'},
  { name: 'Manitowoc Public Library', url: 'https://www.manitowoclibrary.org', eventsUrl: 'https://www.manitowoclibrary.org/events', city: 'Manitowoc', state: 'WI', zipCode: '54220', county: 'Manitowoc County'},
  { name: 'Stevens Point Public Library', url: 'https://www.stevenspoint.org/library', eventsUrl: 'https://www.stevenspoint.org/library/events', city: 'Stevens Point', state: 'WI', zipCode: '54481', county: 'Stevens Point County'},
  { name: 'Sun Prairie Public Library', url: 'https://www.sunprairiepubliclibrary.org', eventsUrl: 'https://www.sunprairiepubliclibrary.org/events', city: 'Sun Prairie', state: 'WI', zipCode: '53590', county: 'Sun Prairie County'},
  { name: 'Neenah Public Library', url: 'https://www.neenahlibrary.org', eventsUrl: 'https://www.neenahlibrary.org/events', city: 'Neenah', state: 'WI', zipCode: '54956', county: 'Neenah County'},
  { name: 'Marshfield Public Library', url: 'https://marshfieldlibrary.org/', eventsUrl: 'https://marshfieldlibrary.org/', city: 'Marshfield', state: 'WI', zipCode: '54449', county: 'Marshfield County'},
  { name: 'Pewaukee Public Library', url: 'https://www.pewaukeelibrary.org', eventsUrl: 'https://www.pewaukeelibrary.org/events', city: 'Pewaukee', state: 'WI', zipCode: '53072', county: 'Pewaukee County'},
  { name: 'Middleton Public Library', url: 'https://www.midlibrary.org', eventsUrl: 'https://www.midlibrary.org/events', city: 'Middleton', state: 'WI', zipCode: '53562', county: 'Middleton County'},
  { name: 'Fitchburg Public Library', url: 'https://www.fitchburgwi.gov/library', eventsUrl: 'https://www.fitchburgwi.gov/library/events', city: 'Fitchburg', state: 'WI', zipCode: '53711', county: 'Fitchburg County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Adams County Public Library', url: 'https://www.adamslibrary.org', eventsUrl: 'https://www.adamslibrary.org/events', city: 'Adams', state: 'WI', zipCode: '53910', county: 'Adams County'},
  { name: 'Alma Public Library', url: 'https://www.almalibrary.org', eventsUrl: 'https://www.almalibrary.org/events', city: 'Alma', state: 'WI', zipCode: '54610', county: 'Alma County'},
  { name: 'Altoona Public Library', url: 'https://www.altoonalibrary.org', eventsUrl: 'https://www.altoonalibrary.org/events', city: 'Altoona', state: 'WI', zipCode: '54720', county: 'Altoona County'},
  { name: 'Amery Public Library', url: 'https://www.amerylibrary.org', eventsUrl: 'https://www.amerylibrary.org/events', city: 'Amery', state: 'WI', zipCode: '54001', county: 'Amery County'},
  { name: 'Lettie W. Jensen Public Library', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'WI', zipCode: '54406', county: 'Amherst County'},
  { name: 'Arcadia Free Public Library', url: 'https://www.arcadialibrary.org', eventsUrl: 'https://www.arcadialibrary.org/events', city: 'Arcadia', state: 'WI', zipCode: '54612', county: 'Arcadia County'},
  { name: 'Northern Waters Library Service', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'WI', zipCode: '54806', county: 'Ashland County'},
  { name: 'Marathon County Public Library - Athens', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'WI', zipCode: '54411', county: 'Athens County'},
  { name: 'Augusta Memorial Public Library', url: 'https://www.augustalibrary.org', eventsUrl: 'https://www.augustalibrary.org/events', city: 'Augusta', state: 'WI', zipCode: '54722', county: 'Augusta County'},
  { name: 'Baldwin Public Library', url: 'https://baldwinlibrary.org/', eventsUrl: 'https://baldwinlibrary.org/calendar/', city: 'Baldwin', state: 'WI', zipCode: '54002', county: 'Baldwin County'},
  { name: 'John Bosshard Memorial Library', url: 'https://www.bangorlibrary.org', eventsUrl: 'https://www.bangorlibrary.org/events', city: 'Bangor', state: 'WI', zipCode: '54614', county: 'Bangor County'},
  { name: 'Barneveld Public Library', url: 'https://www.barneveldlibrary.org/', eventsUrl: 'https://www.barneveldlibrary.org/', city: 'Barneveld', state: 'WI', zipCode: '53507', county: 'Barneveld County'},
  { name: 'Bayfield Carnegie Public Library', url: 'https://www.bayfieldlibrary.org', eventsUrl: 'https://www.bayfieldlibrary.org/events', city: 'Bayfield', state: 'WI', zipCode: '54814', county: 'Bayfield County'},
  { name: 'Beaver Dam Community Library', url: 'https://www.beaverdamlibrary.org/', eventsUrl: 'https://www.beaverdamlibrary.org/', city: 'Beaver Dam', state: 'WI', zipCode: '53916', county: 'Beaver Dam County'},
  { name: 'Belleville Public Library', url: 'https://bellevillelibrary.org/', eventsUrl: 'https://bellevillelibrary.org/', city: 'Belleville', state: 'WI', zipCode: '53508', county: 'Belleville County'},
  { name: 'Belmont Public Library', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'WI', zipCode: '53510', county: 'Belmont County'},
  { name: 'Berlin Public Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'WI', zipCode: '54923', county: 'Berlin County'},
  { name: 'Big Bend Village Library', url: 'https://www.bigbendlibrary.org', eventsUrl: 'https://www.bigbendlibrary.org/events', city: 'Big Bend', state: 'WI', zipCode: '53103', county: 'Big Bend County'},
  { name: 'Black Creek Village Library', url: 'https://www.blackcreeklibrary.org', eventsUrl: 'https://www.blackcreeklibrary.org/events', city: 'Black Creek', state: 'WI', zipCode: '54106', county: 'Black Creek County'},
  { name: 'Black Earth Public Library', url: 'https://www.blackearthlibrary.org', eventsUrl: 'https://www.blackearthlibrary.org/events', city: 'Black Earth', state: 'WI', zipCode: '53515', county: 'Black Earth County'},
  { name: 'Black River Falls Public Library', url: 'https://www.blackriverfallslibrary.org', eventsUrl: 'https://www.blackriverfallslibrary.org/events', city: 'Black River Falls', state: 'WI', zipCode: '54615', county: 'Black River Falls County'},
  { name: 'Bloomington Public Library', url: 'https://www.bloomingtonlibrary.org', eventsUrl: 'https://www.bloomingtonlibrary.org/events', city: 'Bloomington', state: 'WI', zipCode: '53804', county: 'Bloomington County'},
  { name: 'Boulder Junction Public Library', url: 'https://www.boulderjunctionlibrary.org', eventsUrl: 'https://www.boulderjunctionlibrary.org/events', city: 'Boulder Junction', state: 'WI', zipCode: '54512', county: 'Boulder Junction County'},
  { name: 'Boyceville Public Library', url: 'https://www.boycevillelibrary.org', eventsUrl: 'https://www.boycevillelibrary.org/events', city: 'Boyceville', state: 'WI', zipCode: '54725', county: 'Boyceville County'},
  { name: 'Brandon Public Library', url: 'https://www.brandonlibrary.org/', eventsUrl: 'https://www.brandonlibrary.org/events-calendar', city: 'Brandon', state: 'WI', zipCode: '53919', county: 'Brandon County'},
  { name: 'Brodhead Memorial Public Library', url: 'https://www.brodheadlibrary.org/', eventsUrl: 'https://www.brodheadlibrary.org/', city: 'Brodhead', state: 'WI', zipCode: '53520', county: 'Brodhead County'},
  { name: 'Brown Deer Public Library', url: 'https://www.browndeerlibrary.org', eventsUrl: 'https://www.browndeerlibrary.org/events', city: 'Brown Deer', state: 'WI', zipCode: '53223', county: 'Brown Deer County'},
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'WI', zipCode: '53105', county: 'Burlington County'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'WI', zipCode: '53007', county: 'Butler County'},
  { name: 'Cadott Community Library', url: 'https://www.cadottlibrary.org', eventsUrl: 'https://www.cadottlibrary.org/events', city: 'Cadott', state: 'WI', zipCode: '54727', county: 'Cadott County'},
  { name: 'Cambridge Community Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'WI', zipCode: '53523', county: 'Cambridge County'},
  { name: 'Cameron Public Library', url: 'https://www.cameronlibrary.org/', eventsUrl: 'https://www.cameronlibrary.org/calendar', city: 'Cameron', state: 'WI', zipCode: '54822', county: 'Cameron County'},
  { name: 'Campbellsport Public Library', url: 'https://www.campbellsportlibrary.org', eventsUrl: 'https://www.campbellsportlibrary.org/events', city: 'Campbellsport', state: 'WI', zipCode: '53010', county: 'Campbellsport County'},
  { name: 'Cedar Grove Public Library', url: 'https://www.cedargrovelibrary.org', eventsUrl: 'https://www.cedargrovelibrary.org/events', city: 'Cedar Grove', state: 'WI', zipCode: '53013', county: 'Cedar Grove County'},
  { name: 'Cedarburg Public Library', url: 'https://www.cedarburglibrary.org', eventsUrl: 'https://www.cedarburglibrary.org/events', city: 'Cedarburg', state: 'WI', zipCode: '53012', county: 'Cedarburg County'},
  { name: 'Centuria Public Library', url: 'https://www.centurialibrary.org', eventsUrl: 'https://www.centurialibrary.org/events', city: 'Centuria', state: 'WI', zipCode: '54824', county: 'Centuria County'},
  { name: 'Chilton Public Library', url: 'https://www.chiltonlibrary.org/', eventsUrl: 'https://www.chiltonlibrary.org/calendar', city: 'Chilton', state: 'WI', zipCode: '53014', county: 'Chilton County'},
  { name: 'Chippewa Falls Public Library', url: 'https://www.chippewafallslibrary.org', eventsUrl: 'https://www.chippewafallslibrary.org/events', city: 'Chippewa Falls', state: 'WI', zipCode: '54729', county: 'Chippewa Falls County'},
  { name: 'Clear Lake Public Library', url: 'https://www.clearlakelibrary.org', eventsUrl: 'https://www.clearlakelibrary.org/events', city: 'Clear Lake', state: 'WI', zipCode: '54005', county: 'Clear Lake County'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'WI', zipCode: '53525', county: 'Clinton County'},
  { name: 'Clintonville Public Library', url: 'https://www.clintonvillelibrary.org', eventsUrl: 'https://www.clintonvillelibrary.org/events', city: 'Clintonville', state: 'WI', zipCode: '54929', county: 'Clintonville County'},
  { name: 'Cobb Public Library', url: 'https://www.cobblibrary.org', eventsUrl: 'https://www.cobblibrary.org/events', city: 'Cobb', state: 'WI', zipCode: '53526', county: 'Cobb County'},
  { name: 'Coleman Library', url: 'https://www.colemanlibrary.org/', eventsUrl: 'https://www.colemanlibrary.org/calendar', city: 'Coleman', state: 'WI', zipCode: '54112', county: 'Coleman County'},
  { name: 'Coloma Public Library', url: 'https://www.colomalibrary.org', eventsUrl: 'https://www.colomalibrary.org/events', city: 'Coloma', state: 'WI', zipCode: '54930', county: 'Coloma County'},
  { name: 'Columbus Public Library', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'WI', zipCode: '53925', county: 'Columbus County'},
  { name: 'Cumberland Public Library', url: 'https://www.cumberlandlibrary.org', eventsUrl: 'https://www.cumberlandlibrary.org/events', city: 'Cumberland', state: 'WI', zipCode: '54829', county: 'Cumberland County'},
  { name: 'Darien Public Library', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'WI', zipCode: '53114', county: 'Darien County'},
  { name: 'Deer Park Public Library', url: 'https://www.deerparklibrary.org', eventsUrl: 'https://www.deerparklibrary.org/events', city: 'Deer Park', state: 'WI', zipCode: '54007', county: 'Deer Park County'},
  { name: 'Deerfield Public Library', url: 'https://www.deerfieldlibrary.org', eventsUrl: 'https://www.deerfieldlibrary.org/events', city: 'Deerfield', state: 'WI', zipCode: '53531', county: 'Deerfield County'},
  { name: 'Deforest Area Public Library', url: 'https://www.deforestlibrary.org', eventsUrl: 'https://www.deforestlibrary.org/events', city: 'Deforest', state: 'WI', zipCode: '53532', county: 'Deforest County'},
  { name: 'Delafield Public Library', url: 'https://www.delafieldlibrary.org/', eventsUrl: 'https://www.delafieldlibrary.org/', city: 'Delafield', state: 'WI', zipCode: '53018', county: 'Delafield County'},
  { name: 'Aram Public Library', url: 'https://www.delavanlibrary.org/', eventsUrl: 'https://www.delavanlibrary.org/site/events/', city: 'Delavan', state: 'WI', zipCode: '53115', county: 'Delavan County'},
  { name: 'Dodgeville Public Library', url: 'https://dodgevillelibrary.com/', eventsUrl: 'https://dodgevillelibrary.com/', city: 'Dodgeville', state: 'WI', zipCode: '53533', county: 'Dodgeville County'},
  { name: 'Dorchester Public Library', url: 'https://www.dorchesterlibrary.org/', eventsUrl: 'https://www.dorchesterlibrary.org/', city: 'Dorchester', state: 'WI', zipCode: '54425', county: 'Dorchester County'},
  { name: 'Drummond Public Library', url: 'https://www.drummondschool.net/', eventsUrl: 'https://www.drummondschool.net/page/library', city: 'Drummond', state: 'WI', zipCode: '54832', county: 'Drummond County'},
  { name: 'Alice Baker Memorial Public Library', url: 'https://www.eaglelibrary.org', eventsUrl: 'https://www.eaglelibrary.org/events', city: 'Eagle', state: 'WI', zipCode: '53119', county: 'Eagle County'},
  { name: 'Edgerton Public Library', url: 'https://www.edgertonlibrary.org', eventsUrl: 'https://www.edgertonlibrary.org/events', city: 'Edgerton', state: 'WI', zipCode: '53534', county: 'Edgerton County'},
  { name: 'Ellsworth Public Library', url: 'https://www.ellsworthlibrary.org', eventsUrl: 'https://www.ellsworthlibrary.org/events', city: 'Ellsworth', state: 'WI', zipCode: '54011', county: 'Ellsworth County'},
  { name: 'Elm Grove Public Library', url: 'https://www.elmgrovelibrary.org', eventsUrl: 'https://www.elmgrovelibrary.org/events', city: 'Elm Grove', state: 'WI', zipCode: '53122', county: 'Elm Grove County'},
  { name: 'Elmwood Public Library', url: 'https://www.elmwoodlibrary.org', eventsUrl: 'https://www.elmwoodlibrary.org/events', city: 'Elmwood', state: 'WI', zipCode: '54740', county: 'Elmwood County'},
  { name: 'Endeavor Public Library', url: 'https://www.endeavorlibrary.org', eventsUrl: 'https://www.endeavorlibrary.org/events', city: 'Endeavor', state: 'WI', zipCode: '53930', county: 'Endeavor County'},
  { name: 'Eager Free Public Library', url: 'https://www.evansvillelibrary.org', eventsUrl: 'https://www.evansvillelibrary.org/events', city: 'Evansville', state: 'WI', zipCode: '53536', county: 'Evansville County'},
  { name: 'Florence County Library', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'WI', zipCode: '54121', county: 'Florence County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'WI', zipCode: '53132', county: 'Franklin County'},
  { name: 'Frederic Public Library', url: 'https://www.fredericlibrary.org', eventsUrl: 'https://www.fredericlibrary.org/events', city: 'Frederic', state: 'WI', zipCode: '54837', county: 'Frederic County'},
  { name: 'Neuschafer Community Library', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'WI', zipCode: '54940', county: 'Fremont County'},
  { name: 'Gays Mills Public Library', url: 'https://www.gaysmillslibrary.org', eventsUrl: 'https://www.gaysmillslibrary.org/events', city: 'Gays Mills', state: 'WI', zipCode: '54631', county: 'Gays Mills County'},
  { name: 'Germantown Community Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'WI', zipCode: '53022', county: 'Germantown County'},
  { name: 'Western Taylor County Public Library', url: 'https://gilmanlibrary.org/', eventsUrl: 'https://gilmanlibrary.org/calendar', city: 'Gilman', state: 'WI', zipCode: '54433', county: 'Gilman County'},
  { name: 'North Shore Library', url: 'https://www.glendalelibrary.org', eventsUrl: 'https://www.glendalelibrary.org/events', city: 'Glendale', state: 'WI', zipCode: '53217', county: 'Glendale County'},
  { name: 'Glenwood City Public Library', url: 'https://www.glenwoodcitylibrary.org', eventsUrl: 'https://www.glenwoodcitylibrary.org/events', city: 'Glenwood City', state: 'WI', zipCode: '54013', county: 'Glenwood City County'},
  { name: 'U.S.S. Liberty Memorial Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'WI', zipCode: '53024', county: 'Grafton County'},
  { name: 'Grantsburg Public Library', url: 'https://www.grantsburglibrary.org', eventsUrl: 'https://www.grantsburglibrary.org/events', city: 'Grantsburg', state: 'WI', zipCode: '54840', county: 'Grantsburg County'},
  { name: 'Caestecker Public Library', url: 'https://www.greenlakelibrary.org', eventsUrl: 'https://www.greenlakelibrary.org/events', city: 'Green Lake', state: 'WI', zipCode: '54941', county: 'Green Lake County'},
  { name: 'Greenwood Public Library', url: 'https://www.greenwoodlibrary.org', eventsUrl: 'https://www.greenwoodlibrary.org/events', city: 'Greenwood', state: 'WI', zipCode: '54437', county: 'Greenwood County'},
  { name: 'Hales Corners Public Library', url: 'https://halescornerslibrary.org/', eventsUrl: 'https://halescornerslibrary.org/', city: 'Hales Corners', state: 'WI', zipCode: '53130', county: 'Hales Corners County'},
  { name: 'Hammond Community Library', url: 'https://www.hammondlibrary.org', eventsUrl: 'https://www.hammondlibrary.org/events', city: 'Hammond', state: 'WI', zipCode: '54015', county: 'Hammond County'},
  { name: 'Hancock Public Library', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'WI', zipCode: '54943', county: 'Hancock County'},
  { name: 'Hartford Public Library', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'WI', zipCode: '53027', county: 'Hartford County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibrary.org', eventsUrl: 'https://www.hartlandlibrary.org/events', city: 'Hartland', state: 'WI', zipCode: '53029', county: 'Hartland County'},
  { name: 'Hawkins Area Library', url: 'https://www.hawkinslibrary.org/', eventsUrl: 'https://www.hawkinslibrary.org/', city: 'Hawkins', state: 'WI', zipCode: '54530', county: 'Hawkins County'},
  { name: 'Lac Courte Oreilles Ojibwa College Community Library', url: 'https://ligastrips.com/', eventsUrl: 'https://ligastrips.com/', city: 'Hayward', state: 'WI', zipCode: '54843', county: 'Hayward County'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'WI', zipCode: '54634', county: 'Hillsboro County'},
  { name: 'Hortonville Public Library', url: 'https://www.hortonvillelibrary.org', eventsUrl: 'https://www.hortonvillelibrary.org/events', city: 'Hortonville', state: 'WI', zipCode: '54944', county: 'Hortonville County'},
  { name: 'Hudson Area Joint Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'WI', zipCode: '54016', county: 'Hudson County'},
  { name: 'Hurley Public Library', url: 'https://hurleylibrary.org/', eventsUrl: 'https://hurleylibrary.org/', city: 'Hurley', state: 'WI', zipCode: '54534', county: 'Hurley County'},
  { name: 'Iola Village Library', url: 'https://www.iolalibrary.org', eventsUrl: 'https://www.iolalibrary.org/events', city: 'Iola', state: 'WI', zipCode: '54945', county: 'Iola County'},
  { name: 'Evelyn Goldberg Briggs Memorial Library', url: 'https://www.ironriverlibrary.org/', eventsUrl: 'https://www.ironriverlibrary.org/calendar', city: 'Iron River', state: 'WI', zipCode: '54847', county: 'Iron River County'},
  { name: 'Johnson Creek Public Library', url: 'https://www.johnsoncreeklibrary.org', eventsUrl: 'https://www.johnsoncreeklibrary.org/events', city: 'Johnson Creek', state: 'WI', zipCode: '53038', county: 'Johnson Creek County'},
  { name: 'Kaukauna Public Library', url: 'https://www.kaukaunalibrary.org', eventsUrl: 'https://www.kaukaunalibrary.org/events', city: 'Kaukauna', state: 'WI', zipCode: '54130', county: 'Kaukauna County'},
  { name: 'Kiel Public Library', url: 'https://www.kiellibrary.org/', eventsUrl: 'https://www.kiellibrary.org/', city: 'Kiel', state: 'WI', zipCode: '53042', county: 'Kiel County'},
  { name: 'Kimberly--Little Chute Public Library', url: 'https://www.kimberlylibrary.org', eventsUrl: 'https://www.kimberlylibrary.org/events', city: 'Kimberly', state: 'WI', zipCode: '54136', county: 'Kimberly County'},
  { name: 'Mill Pond Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'WI', zipCode: '53939', county: 'Kingston County'},
  { name: 'La Valle Public Library', url: 'https://www.lavallelibrary.org', eventsUrl: 'https://www.lavallelibrary.org/events', city: 'La Valle', state: 'WI', zipCode: '53941', county: 'La Valle County'},
  { name: 'Lakes Country Public Library', url: 'https://lakewoodlibrary.org/', eventsUrl: 'https://lakewoodlibrary.org/events/event/', city: 'Lakewood', state: 'WI', zipCode: '54138', county: 'Lakewood County'},
  { name: 'Schreiner Memorial Library', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'WI', zipCode: '53813', county: 'Lancaster County'},
  { name: 'Land O Lakes Public Library', url: 'https://www.landolakeslibrary.org', eventsUrl: 'https://www.landolakeslibrary.org/events', city: 'Land O Lakes', state: 'WI', zipCode: '54540', county: 'Land O Lakes County'},
  { name: 'Lena Public Library', url: 'https://www.lenalibrary.org/', eventsUrl: 'https://www.lenalibrary.org/', city: 'Lena', state: 'WI', zipCode: '54139', county: 'Lena County'},
  { name: 'Allen-Dietzman Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'WI', zipCode: '53554', county: 'Livingston County'},
  { name: 'Lowell Public Library', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'WI', zipCode: '53557', county: 'Lowell County'},
  { name: 'Sturm Memorial Library', url: 'https://www.manawalibrary.org', eventsUrl: 'https://www.manawalibrary.org/events', city: 'Manawa', state: 'WI', zipCode: '54949', county: 'Manawa County'},
  { name: 'Marion Public Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'WI', zipCode: '54950', county: 'Marion County'},
  { name: 'Markesan Public Library', url: 'https://www.markesanlibrary.org', eventsUrl: 'https://www.markesanlibrary.org/events', city: 'Markesan', state: 'WI', zipCode: '53946', county: 'Markesan County'},
  { name: 'Marshall Community Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'WI', zipCode: '53559', county: 'Marshall County'},
  { name: 'Mattoon-Hutchins Library', url: 'https://mattoonlibrary.org/', eventsUrl: 'https://mattoonlibrary.org/', city: 'Mattoon', state: 'WI', zipCode: '54450', county: 'Mattoon County'},
  { name: 'Mayville Public Library', url: 'https://www.mayvillelibrary.org/', eventsUrl: 'https://www.mayvillelibrary.org/calendar', city: 'Mayville', state: 'WI', zipCode: '53050', county: 'Mayville County'},
  { name: 'Mazomanie Free Library', url: 'https://www.mazomanielibrary.org', eventsUrl: 'https://www.mazomanielibrary.org/events', city: 'Mazomanie', state: 'WI', zipCode: '53560', county: 'Mazomanie County'},
  { name: 'E.D. Locke Public Library', url: 'https://www.mcfarlandlibrary.org/', eventsUrl: 'https://www.mcfarlandlibrary.org/', city: 'Mcfarland', state: 'WI', zipCode: '53558', county: 'Mcfarland County'},
  { name: 'Frances L. Simek Memorial Library Medford', url: 'https://www.medfordlibrary.org', eventsUrl: 'https://www.medfordlibrary.org/events', city: 'Medford', state: 'WI', zipCode: '54451', county: 'Medford County'},
  { name: 'Elisha D. Smith Public Library', url: 'https://menashalibrary.org/', eventsUrl: 'https://menashalibrary.org/calendar/', city: 'Menasha', state: 'WI', zipCode: '54952', county: 'Menasha County'},
  { name: 'Menomonee Falls Public Library', url: 'https://www.menomoneefallslibrary.org', eventsUrl: 'https://www.menomoneefallslibrary.org/events', city: 'Menomonee Falls', state: 'WI', zipCode: '53051', county: 'Menomonee Falls County'},
  { name: 'Menomonie Public Library', url: 'https://www.menomonielibrary.org', eventsUrl: 'https://www.menomonielibrary.org/events', city: 'Menomonie', state: 'WI', zipCode: '54751', county: 'Menomonie County'},
  { name: 'Mercer Public Library', url: 'https://www.mercerlibrary.org', eventsUrl: 'https://www.mercerlibrary.org/events', city: 'Mercer', state: 'WI', zipCode: '54547', county: 'Mercer County'},
  { name: 'Milltown Public Library', url: 'https://www.milltownlibrary.org/', eventsUrl: 'https://www.milltownlibrary.org/', city: 'Milltown', state: 'WI', zipCode: '54858', county: 'Milltown County'},
  { name: 'Milton Public Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'WI', zipCode: '53563', county: 'Milton County'},
  { name: 'Minocqua Public Library', url: 'https://www.minocqualibrary.org', eventsUrl: 'https://www.minocqualibrary.org/events', city: 'Minocqua', state: 'WI', zipCode: '54548', county: 'Minocqua County'},
  { name: 'Mondovi Public Library', url: 'https://www.mondovilibrary.org', eventsUrl: 'https://www.mondovilibrary.org/events', city: 'Mondovi', state: 'WI', zipCode: '54755', county: 'Mondovi County'},
  { name: 'Monona Public Library', url: 'https://www.mononalibrary.org', eventsUrl: 'https://www.mononalibrary.org/events', city: 'Monona', state: 'WI', zipCode: '53716', county: 'Monona County'},
  { name: 'Monroe Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'WI', zipCode: '53566', county: 'Monroe County'},
  { name: 'Montello Public Library', url: 'https://www.montellolibrary.org', eventsUrl: 'https://www.montellolibrary.org/events', city: 'Montello', state: 'WI', zipCode: '53949', county: 'Montello County'},
  { name: 'Monticello Public Library', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'WI', zipCode: '53570', county: 'Monticello County'},
  { name: 'Mukwonago Community Library', url: 'https://www.mukwonagolibrary.org', eventsUrl: 'https://www.mukwonagolibrary.org/events', city: 'Mukwonago', state: 'WI', zipCode: '53149', county: 'Mukwonago County'},
  { name: 'Charles Joann Lester Library', url: 'https://www.nekoosalibrary.org', eventsUrl: 'https://www.nekoosalibrary.org/events', city: 'Nekoosa', state: 'WI', zipCode: '54457', county: 'Nekoosa County'},
  { name: 'Neshkoro Public Library', url: 'https://www.neshkorolibrary.org', eventsUrl: 'https://www.neshkorolibrary.org/events', city: 'Neshkoro', state: 'WI', zipCode: '54960', county: 'Neshkoro County'},
  { name: 'New Berlin Public Library', url: 'https://www.newberlinlibrary.org', eventsUrl: 'https://www.newberlinlibrary.org/events', city: 'New Berlin', state: 'WI', zipCode: '53151', county: 'New Berlin County'},
  { name: 'New Holstein Public Library', url: 'https://www.newholsteinlibrary.org/', eventsUrl: 'https://www.newholsteinlibrary.org/', city: 'New Holstein', state: 'WI', zipCode: '53061', county: 'New Holstein County'},
  { name: 'New Lisbon Memorial Library', url: 'https://www.newlisbonlibrary.org/', eventsUrl: 'https://www.newlisbonlibrary.org/', city: 'New Lisbon', state: 'WI', zipCode: '53950', county: 'New Lisbon County'},
  { name: 'New London Public Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'WI', zipCode: '54961', county: 'New London County'},
  { name: 'Carleton A. Friday Memorial Library', url: 'https://www.newrichmondlibrary.org', eventsUrl: 'https://www.newrichmondlibrary.org/events', city: 'New Richmond', state: 'WI', zipCode: '54017', county: 'New Richmond County'},
  { name: 'Spillman Public Library', url: 'https://www.northfonddulaclibrary.org', eventsUrl: 'https://www.northfonddulaclibrary.org/events', city: 'North Fond Du Lac', state: 'WI', zipCode: '54937', county: 'North Fond Du Lac County'},
  { name: 'Town Hall Library', url: 'https://www.northlakelibrary.org', eventsUrl: 'https://www.northlakelibrary.org/events', city: 'North Lake', state: 'WI', zipCode: '53064', county: 'North Lake County'},
  { name: 'Norwalk Public Library', url: 'https://www.norwalklibrary.org', eventsUrl: 'https://www.norwalklibrary.org/events', city: 'Norwalk', state: 'WI', zipCode: '54648', county: 'Norwalk County'},
  { name: 'Oak Creek Public Library', url: 'https://www.oakcreeklibrary.org', eventsUrl: 'https://www.oakcreeklibrary.org/events', city: 'Oak Creek', state: 'WI', zipCode: '53154', county: 'Oak Creek County'},
  { name: 'Oakfield Public Library', url: 'https://www.oakfieldlibrary.org', eventsUrl: 'https://www.oakfieldlibrary.org/events', city: 'Oakfield', state: 'WI', zipCode: '53065', county: 'Oakfield County'},
  { name: 'Oconomowoc Public Library', url: 'https://oconomowoc.librarycalendar.com/', eventsUrl: 'https://oconomowoc.librarycalendar.com/events/month', city: 'Oconomowoc', state: 'WI', zipCode: '53066', county: 'Oconomowoc County'},
  { name: 'Farnsworth Public Library', url: 'https://www.ocontolibrary.org', eventsUrl: 'https://www.ocontolibrary.org/events', city: 'Oconto', state: 'WI', zipCode: '54153', county: 'Oconto County'},
  { name: 'Oconto Falls Community Library', url: 'https://www.ocontofallslibrary.org', eventsUrl: 'https://www.ocontofallslibrary.org/events', city: 'Oconto Falls', state: 'WI', zipCode: '54154', county: 'Oconto Falls County'},
  { name: 'Ogema Public Library', url: 'https://www.ogemalibrary.org', eventsUrl: 'https://www.ogemalibrary.org/events', city: 'Ogema', state: 'WI', zipCode: '54459', county: 'Ogema County'},
  { name: 'Carter Memorial Library', url: 'https://omrolibrary.org/', eventsUrl: 'https://omrolibrary.org/', city: 'Omro', state: 'WI', zipCode: '54963', county: 'Omro County'},
  { name: 'Oostburg Public Library', url: 'https://oostburglibrary.org/', eventsUrl: 'https://oostburglibrary.org/', city: 'Oostburg', state: 'WI', zipCode: '53070', county: 'Oostburg County'},
  { name: 'Oregon Public Library', url: 'https://www.oregonlibrary.org', eventsUrl: 'https://www.oregonlibrary.org/events', city: 'Oregon', state: 'WI', zipCode: '53575', county: 'Oregon County'},
  { name: 'Orfordville Public Library', url: 'https://www.als.lib.wi.us/', eventsUrl: 'https://www.als.lib.wi.us/OPL/calendar/', city: 'Orfordville', state: 'WI', zipCode: '53576', county: 'Orfordville County'},
  { name: 'Owen Public Library', url: 'https://www.owenlibrary.org', eventsUrl: 'https://www.owenlibrary.org/events', city: 'Owen', state: 'WI', zipCode: '54460', county: 'Owen County'},
  { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'WI', zipCode: '53952', county: 'Oxford County'},
  { name: 'Packwaukee Public Library', url: 'https://www.packwaukeelibrary.org', eventsUrl: 'https://www.packwaukeelibrary.org/events', city: 'Packwaukee', state: 'WI', zipCode: '53953', county: 'Packwaukee County'},
  { name: 'Park Falls Public Library', url: 'https://www.parkfallslibrary.org', eventsUrl: 'https://www.parkfallslibrary.org/events', city: 'Park Falls', state: 'WI', zipCode: '54552', county: 'Park Falls County'},
  { name: 'Eleanor Ellis Public Library', url: 'https://www.phelpslibrary.org', eventsUrl: 'https://www.phelpslibrary.org/events', city: 'Phelps', state: 'WI', zipCode: '54554', county: 'Phelps County'},
  { name: 'Leon-Saxeville Township Library', url: 'https://www.pineriverlibrary.org', eventsUrl: 'https://www.pineriverlibrary.org/events', city: 'Pine River', state: 'WI', zipCode: '54965', county: 'Pine River County'},
  { name: 'Pittsville Community Library', url: 'https://www.pittsvillelibrary.org', eventsUrl: 'https://www.pittsvillelibrary.org/events', city: 'Pittsville', state: 'WI', zipCode: '54466', county: 'Pittsville County'},
  { name: 'Plainfield Public Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'WI', zipCode: '54966', county: 'Plainfield County'},
  { name: 'Plum City Public Library', url: 'https://www.plumcitylibrary.org', eventsUrl: 'https://www.plumcitylibrary.org/events', city: 'Plum City', state: 'WI', zipCode: '54761', county: 'Plum City County'},
  { name: 'Plymouth Public Library', url: 'https://plymouthlibrary.org/', eventsUrl: 'https://plymouthlibrary.org/', city: 'Plymouth', state: 'WI', zipCode: '53073', county: 'Plymouth County'},
  { name: 'Portage Public Library', url: 'https://www.portagelibrary.org', eventsUrl: 'https://www.portagelibrary.org/events', city: 'Portage', state: 'WI', zipCode: '53901', county: 'Portage County'},
  { name: 'Poy Sippi Public Library', url: 'https://www.poysippilibrary.org', eventsUrl: 'https://www.poysippilibrary.org/events', city: 'Poy Sippi', state: 'WI', zipCode: '54967', county: 'Poy Sippi County'},
  { name: 'Presque Isle Community Library', url: 'https://www.presqueislelibrary.org', eventsUrl: 'https://www.presqueislelibrary.org/events', city: 'Presque Isle', state: 'WI', zipCode: '54557', county: 'Presque Isle County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'WI', zipCode: '54968', county: 'Princeton County'},
  { name: 'Hutchinson Memorial Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'WI', zipCode: '53956', county: 'Randolph County'},
  { name: 'Redgranite Public Library', url: 'https://www.redgranitelibrary.org', eventsUrl: 'https://www.redgranitelibrary.org/events', city: 'Redgranite', state: 'WI', zipCode: '54970', county: 'Redgranite County'},
  { name: 'Reedsburg Public Library', url: 'https://www.reedsburglibrary.org', eventsUrl: 'https://www.reedsburglibrary.org/events', city: 'Reedsburg', state: 'WI', zipCode: '53959', county: 'Reedsburg County'},
  { name: 'Rhinelander District Library', url: 'https://www.rhinelanderlibrary.org', eventsUrl: 'https://www.rhinelanderlibrary.org/events', city: 'Rhinelander', state: 'WI', zipCode: '54501', county: 'Rhinelander County'},
  { name: 'Rice Lake Public Library', url: 'https://www.ricelakelibrary.org', eventsUrl: 'https://www.ricelakelibrary.org/events', city: 'Rice Lake', state: 'WI', zipCode: '54868', county: 'Rice Lake County'},
  { name: 'Rio Community Library', url: 'https://www.riolibrary.org/', eventsUrl: 'https://www.riolibrary.org/calendar', city: 'Rio', state: 'WI', zipCode: '53960', county: 'Rio County'},
  { name: 'Ripon Public Library', url: 'https://www.riponlibrary.org', eventsUrl: 'https://www.riponlibrary.org/events', city: 'Ripon', state: 'WI', zipCode: '54971', county: 'Ripon County'},
  { name: 'Hazel Mackin Community Library', url: 'https://robertslibrary.org/', eventsUrl: 'https://robertslibrary.org/', city: 'Roberts', state: 'WI', zipCode: '54023', county: 'Roberts County'},
  { name: 'Rochester Public Library', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'WI', zipCode: '53167', county: 'Rochester County'},
  { name: 'Community Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'WI', zipCode: '53168', county: 'Salem County'},
  { name: 'Sauk City Public Library', url: 'https://www.saukcitylibrary.org/', eventsUrl: 'https://www.saukcitylibrary.org/', city: 'Sauk City', state: 'WI', zipCode: '53583', county: 'Sauk City County'},
  { name: 'Scandinavia Public Library', url: 'https://www.scandinavialibrary.org', eventsUrl: 'https://www.scandinavialibrary.org/events', city: 'Scandinavia', state: 'WI', zipCode: '54977', county: 'Scandinavia County'},
  { name: 'Muehl Public Library', url: 'https://www.seymourlibrary.org', eventsUrl: 'https://www.seymourlibrary.org/events', city: 'Seymour', state: 'WI', zipCode: '54165', county: 'Seymour County'},
  { name: 'Shawano City-County Library', url: 'https://www.shawanolibrary.org', eventsUrl: 'https://www.shawanolibrary.org/events', city: 'Shawano', state: 'WI', zipCode: '54166', county: 'Shawano County'},
  { name: 'Sheboygan Falls Memorial Library', url: 'https://www.sheboyganfallslibrary.org', eventsUrl: 'https://www.sheboyganfallslibrary.org/events', city: 'Sheboygan Falls', state: 'WI', zipCode: '53085', county: 'Sheboygan Falls County'},
  { name: 'Shell Lake Public Library', url: 'https://www.shelllakelibrary.org', eventsUrl: 'https://www.shelllakelibrary.org/events', city: 'Shell Lake', state: 'WI', zipCode: '54871', county: 'Shell Lake County'},
  { name: 'Shiocton Public Library', url: 'https://www.shioctonlibrary.org', eventsUrl: 'https://www.shioctonlibrary.org/events', city: 'Shiocton', state: 'WI', zipCode: '54170', county: 'Shiocton County'},
  { name: 'Shorewood Public Library', url: 'https://www.shorewoodlibrary.org/', eventsUrl: 'https://www.shorewoodlibrary.org/connect/events/', city: 'Shorewood', state: 'WI', zipCode: '53211', county: 'Shorewood County'},
  { name: 'Slinger Community Library', url: 'https://slingerlibrary.org/', eventsUrl: 'https://slingerlibrary.org/', city: 'Slinger', state: 'WI', zipCode: '53086', county: 'Slinger County'},
  { name: 'Soldiers Grove Public Library', url: 'https://www.soldiersgrovelibrary.org', eventsUrl: 'https://www.soldiersgrovelibrary.org/events', city: 'Soldiers Grove', state: 'WI', zipCode: '54655', county: 'Soldiers Grove County'},
  { name: 'Somerset Public Library', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'WI', zipCode: '54025', county: 'Somerset County'},
  { name: 'Sparta Free Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'WI', zipCode: '54656', county: 'Sparta County'},
  { name: 'Spooner Memorial Library', url: 'https://www.spoonerlibrary.org', eventsUrl: 'https://www.spoonerlibrary.org/events', city: 'Spooner', state: 'WI', zipCode: '54801', county: 'Spooner County'},
  { name: 'Spring Green Community Library', url: 'https://www.springgreenlibrary.org', eventsUrl: 'https://www.springgreenlibrary.org/events', city: 'Spring Green', state: 'WI', zipCode: '53588', county: 'Spring Green County'},
  { name: 'Spring Valley Public Library', url: 'https://www.springvalleylibrary.org', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'WI', zipCode: '54767', county: 'Spring Valley County'},
  { name: 'St. Croix Falls Public Library', url: 'https://www.stcroixfallslibrary.org', eventsUrl: 'https://www.stcroixfallslibrary.org/events', city: 'St. Croix Falls', state: 'WI', zipCode: '54024', county: 'St. Croix Falls County'},
  { name: 'St. Francis Public Library', url: 'https://www.stfrancislibrary.org', eventsUrl: 'https://www.stfrancislibrary.org/events', city: 'St. Francis', state: 'WI', zipCode: '53235', county: 'St. Francis County'},
  { name: 'D.R. Moon Memorial Library', url: 'https://www.stanleylibrary.org', eventsUrl: 'https://www.stanleylibrary.org/events', city: 'Stanley', state: 'WI', zipCode: '54768', county: 'Stanley County'},
  { name: 'Stoughton Public Library', url: 'https://www.stoughtonlibrary.org', eventsUrl: 'https://www.stoughtonlibrary.org/events', city: 'Stoughton', state: 'WI', zipCode: '53589', county: 'Stoughton County'},
  { name: 'Marathon County Public Library - Stratford', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'WI', zipCode: '54484', county: 'Stratford County'},
  { name: 'Pauline Haass Public Library', url: 'https://www.sussexlibrary.org', eventsUrl: 'https://www.sussexlibrary.org/events', city: 'Sussex', state: 'WI', zipCode: '53089', county: 'Sussex County'},
  { name: 'Taylor Memorial Library', url: 'https://www.taylorlibrary.org', eventsUrl: 'https://www.taylorlibrary.org/events', city: 'Taylor', state: 'WI', zipCode: '54659', county: 'Taylor County'},
  { name: 'Shirley M. Wright Memorial Library', url: 'https://www.trempealeaulibrary.org', eventsUrl: 'https://www.trempealeaulibrary.org/events', city: 'Trempealeau', state: 'WI', zipCode: '54661', county: 'Trempealeau County'},
  { name: 'Verona Public Library', url: 'https://www.veronalibrary.org', eventsUrl: 'https://www.veronalibrary.org/events', city: 'Verona', state: 'WI', zipCode: '53593', county: 'Verona County'},
  { name: 'Lester Public Library Of Vesper', url: 'https://www.vesperlibrary.org', eventsUrl: 'https://www.vesperlibrary.org/events', city: 'Vesper', state: 'WI', zipCode: '54489', county: 'Vesper County'},
  { name: 'Walworth Memorial Library', url: 'https://www.walworthlibrary.org/', eventsUrl: 'https://www.walworthlibrary.org/', city: 'Walworth', state: 'WI', zipCode: '53184', county: 'Walworth County'},
  { name: 'Washburn Public Library', url: 'https://www.washburnlibrary.org', eventsUrl: 'https://www.washburnlibrary.org/events', city: 'Washburn', state: 'WI', zipCode: '54891', county: 'Washburn County'},
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'WI', zipCode: '53185', county: 'Waterford County'},
  { name: 'Karl Junginger Memorial Library', url: 'https://www.waterloolibrary.org', eventsUrl: 'https://www.waterloolibrary.org/events', city: 'Waterloo', state: 'WI', zipCode: '53594', county: 'Waterloo County'},
  { name: 'Watertown Public Library', url: 'https://www.watertownlibrary.org/', eventsUrl: 'https://www.watertownlibrary.org/', city: 'Watertown', state: 'WI', zipCode: '53094', county: 'Watertown County'},
  { name: 'Waupaca Area Public Library', url: 'https://www.waupacalibrary.org', eventsUrl: 'https://www.waupacalibrary.org/events', city: 'Waupaca', state: 'WI', zipCode: '54981', county: 'Waupaca County'},
  { name: 'Wautoma Public Library', url: 'https://www.wautomalibrary.org', eventsUrl: 'https://www.wautomalibrary.org/events', city: 'Wautoma', state: 'WI', zipCode: '54982', county: 'Wautoma County'},
  { name: 'Burnett Community Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'WI', zipCode: '54893', county: 'Webster County'},
  { name: 'West Bend Community Memorial Library', url: 'https://www.westbendlibrary.org', eventsUrl: 'https://www.westbendlibrary.org/events', city: 'West Bend', state: 'WI', zipCode: '53095', county: 'West Bend County'},
  { name: 'Westboro Public Library', url: 'https://www.westborolibrary.org', eventsUrl: 'https://www.westborolibrary.org/events', city: 'Westboro', state: 'WI', zipCode: '54490', county: 'Westboro County'},
  { name: 'Ethel Everhard Memorial Library', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'WI', zipCode: '53964', county: 'Westfield County'},
  { name: 'Antigo Public Library - White Lake', url: 'https://www.whitelakelibrary.org', eventsUrl: 'https://www.whitelakelibrary.org/events', city: 'White Lake', state: 'WI', zipCode: '54491', county: 'White Lake County'},
  { name: 'Irvin L. Young Memorial Library', url: 'https://www.whitewaterlibrary.org', eventsUrl: 'https://www.whitewaterlibrary.org/events', city: 'Whitewater', state: 'WI', zipCode: '53190', county: 'Whitewater County'},
  { name: 'Patterson Memorial Library', url: 'https://wildroselibrary.org/', eventsUrl: 'https://wildroselibrary.org/calendar/', city: 'Wild Rose', state: 'WI', zipCode: '54984', county: 'Wild Rose County'},
  { name: 'Wilton Public Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'WI', zipCode: '54670', county: 'Wilton County'},
  { name: 'Winchester Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'WI', zipCode: '54557', county: 'Winchester County'},
  { name: 'Winneconne Public Library', url: 'https://www.winneconnelibrary.org', eventsUrl: 'https://www.winneconnelibrary.org/events', city: 'Winneconne', state: 'WI', zipCode: '54986', county: 'Winneconne County'},
  { name: 'Withee Public Library', url: 'https://www.witheelibrary.org', eventsUrl: 'https://www.witheelibrary.org/events', city: 'Withee', state: 'WI', zipCode: '54498', county: 'Withee County'},
  { name: 'Woodville Community Library', url: 'https://www.woodvillelibrary.org', eventsUrl: 'https://www.woodvillelibrary.org/events', city: 'Woodville', state: 'WI', zipCode: '54028', county: 'Woodville County'},
  { name: 'Brown County Library - Wrightstown Branch Library', url: 'https://wrightstownlibrary.org/', eventsUrl: 'https://wrightstownlibrary.org/', city: 'Wrightstown', state: 'WI', zipCode: '54180', county: 'Wrightstown County'},
  { name: 'Wyocena Public Library', url: 'https://www.wyocenalibrary.org', eventsUrl: 'https://www.wyocenalibrary.org/events', city: 'Wyocena', state: 'WI', zipCode: '53969', county: 'Wyocena County'}

];

const SCRAPER_NAME = 'wordpress-WI';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WI', city: library.city, zipCode: library.zipCode }}));
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
    state: 'WI',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWICloudFunction() {
  console.log('☁️ Running WordPress WI as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WI', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-WI', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressWICloudFunction };
