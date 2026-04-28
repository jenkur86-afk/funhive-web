const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Georgia Public Libraries Scraper - Coverage: All Georgia public libraries
 */
const LIBRARIES = [
  { name: 'Wilcox County Public Library', url: 'https://www.abbevillelibrary.org', eventsUrl: 'https://www.abbevillelibrary.org/events', city: 'Abbeville', state: 'GA', zipCode: '00000', county: 'Abbeville County'},
  { name: 'Acworth Library', url: 'https://www.acworthlibrary.org', eventsUrl: 'https://www.acworthlibrary.org/events', city: 'Acworth', state: 'GA', zipCode: '00000', county: 'Acworth County'},
  { name: 'Adairsville Branch Library', url: 'https://www.adairsvillelibrary.org', eventsUrl: 'https://www.adairsvillelibrary.org/events', city: 'Adairsville', state: 'GA', zipCode: '00000', county: 'Adairsville County'},
  { name: 'Cook County Library', url: 'https://www.adellibrary.org', eventsUrl: 'https://www.adellibrary.org/events', city: 'Adel', state: 'GA', zipCode: '00000', county: 'Adel County'},
  { name: 'Guam Public Library System', url: 'https://www.aganalibrary.org', eventsUrl: 'https://www.aganalibrary.org/events', city: 'Agana', state: 'GA', zipCode: '96910', county: 'Agana County'},
  { name: 'Wheeler County Library', url: 'https://www.alamolibrary.org', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'GA', zipCode: '00000', county: 'Alamo County'},
  { name: 'Central Library', url: 'https://www.albanylibrary.org', eventsUrl: 'https://www.albanylibrary.org/events', city: 'Albany', state: 'GA', zipCode: '00000', county: 'Albany County'},
  { name: 'Alma-Bacon County Public Library', url: 'https://www.almalibrary.org', eventsUrl: 'https://www.almalibrary.org/events', city: 'Alma', state: 'GA', zipCode: '00000', county: 'Alma County'},
  { name: 'Dr. Robert E. Fulton Regional At Ocee', url: 'https://www.alpharettalibrary.org', eventsUrl: 'https://www.alpharettalibrary.org/events', city: 'Alpharetta', state: 'GA', zipCode: '00000', county: 'Alpharetta County'},
  { name: 'Ambrose Public Library', url: 'https://www.ambroselibrary.org', eventsUrl: 'https://www.ambroselibrary.org/events', city: 'Ambrose', state: 'GA', zipCode: '00000', county: 'Ambrose County'},
  { name: 'Lake Blackshear Regional Library System', url: 'https://www.americuslibrary.org', eventsUrl: 'https://www.americuslibrary.org/events', city: 'Americus', state: 'GA', zipCode: '31709', county: 'Americus County'},
  { name: 'Victoria Evans Memorial Library', url: 'https://www.ashburnlibrary.org', eventsUrl: 'https://www.ashburnlibrary.org/events', city: 'Ashburn', state: 'GA', zipCode: '00000', county: 'Ashburn County'},
  { name: 'Athens Regional Library System', url: 'https://www.athenslibrary.org', eventsUrl: 'https://www.athenslibrary.org/events', city: 'Athens', state: 'GA', zipCode: '30606', county: 'Athens County'},
  { name: 'Adams Park Branch', url: 'https://www.atlantalibrary.org', eventsUrl: 'https://www.atlantalibrary.org/events', city: 'Atlanta', state: 'GA', zipCode: '00000', county: 'Atlanta County'},
  { name: 'Auburn Library', url: 'https://www.auburnlibrary.org', eventsUrl: 'https://www.auburnlibrary.org/events', city: 'Auburn', state: 'GA', zipCode: '00000', county: 'Auburn County'},
  { name: 'Appleby Branch', url: 'https://www.augustalibrary.org', eventsUrl: 'https://www.augustalibrary.org/events', city: 'Augusta', state: 'GA', zipCode: '00000', county: 'Augusta County'},
  { name: 'Sweetwater Valley Library', url: 'https://www.austelllibrary.org', eventsUrl: 'https://www.austelllibrary.org/events', city: 'Austell', state: 'GA', zipCode: '00000', county: 'Austell County'},
  { name: 'Baconton City Library', url: 'https://www.bacontonlibrary.org', eventsUrl: 'https://www.bacontonlibrary.org/events', city: 'Baconton', state: 'GA', zipCode: '00000', county: 'Baconton County'},
  { name: 'Decatur County - Gilbert H. Gragg Library', url: 'https://www.bainbridgelibrary.org', eventsUrl: 'https://www.bainbridgelibrary.org/events', city: 'Bainbridge', state: 'GA', zipCode: '00000', county: 'Bainbridge County'},
  { name: 'Ball Ground Public Library', url: 'https://www.ballgroundlibrary.org', eventsUrl: 'https://www.ballgroundlibrary.org/events', city: 'Ball Ground', state: 'GA', zipCode: '00000', county: 'Ball Ground County'},
  { name: 'Barnesville-Lamar County Library', url: 'https://www.barnesvillelibrary.org', eventsUrl: 'https://www.barnesvillelibrary.org/events', city: 'Barnesville', state: 'GA', zipCode: '00000', county: 'Barnesville County'},
  { name: 'Appling County Public Library', url: 'https://www.baxleylibrary.org', eventsUrl: 'https://www.baxleylibrary.org/events', city: 'Baxley', state: 'GA', zipCode: '00000', county: 'Baxley County'},
  { name: 'Berlin Community Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'GA', zipCode: '00000', county: 'Berlin County'},
  { name: 'Blackshear Memorial Library', url: 'https://www.blackshearlibrary.org', eventsUrl: 'https://www.blackshearlibrary.org/events', city: 'Blackshear', state: 'GA', zipCode: '00000', county: 'Blackshear County'},
  { name: 'Union County Public Library', url: 'https://www.blairsvillelibrary.org', eventsUrl: 'https://www.blairsvillelibrary.org/events', city: 'Blairsville', state: 'GA', zipCode: '00000', county: 'Blairsville County'},
  { name: 'Lucy Maddox Memorial Library', url: 'https://www.blakelylibrary.org', eventsUrl: 'https://www.blakelylibrary.org/events', city: 'Blakely', state: 'GA', zipCode: '00000', county: 'Blakely County'},
  { name: 'Fannin County Public Library', url: 'https://www.blueridgelibrary.org', eventsUrl: 'https://www.blueridgelibrary.org/events', city: 'Blue Ridge', state: 'GA', zipCode: '00000', county: 'Blue Ridge County'},
  { name: 'Bogart Branch Library', url: 'https://www.bogartlibrary.org', eventsUrl: 'https://www.bogartlibrary.org/events', city: 'Bogart', state: 'GA', zipCode: '00000', county: 'Bogart County'},
  { name: 'Boston Carnegie Library', url: 'https://www.bostonlibrary.org', eventsUrl: 'https://www.bostonlibrary.org/events', city: 'Boston', state: 'GA', zipCode: '00000', county: 'Boston County'},
  { name: 'Warren P. Sewell Memorial Library-Bowdon', url: 'https://www.bowdonlibrary.org', eventsUrl: 'https://www.bowdonlibrary.org/events', city: 'Bowdon', state: 'GA', zipCode: '00000', county: 'Bowdon County'},
  { name: 'Bowman Branch', url: 'https://www.bowmanlibrary.org', eventsUrl: 'https://www.bowmanlibrary.org/events', city: 'Bowman', state: 'GA', zipCode: '00000', county: 'Bowman County'},
  { name: 'Braselton Library', url: 'https://www.braseltonlibrary.org', eventsUrl: 'https://www.braseltonlibrary.org/events', city: 'Braselton', state: 'GA', zipCode: '00000', county: 'Braselton County'},
  { name: 'Warren P. Sewell Memorial Library-Bremen', url: 'https://www.bremenlibrary.org', eventsUrl: 'https://www.bremenlibrary.org/events', city: 'Bremen', state: 'GA', zipCode: '00000', county: 'Bremen County'},
  { name: 'Broxton Public Library', url: 'https://www.broxtonlibrary.org', eventsUrl: 'https://www.broxtonlibrary.org/events', city: 'Broxton', state: 'GA', zipCode: '00000', county: 'Broxton County'},
  { name: 'Brunswick Glynn County Regional Library', url: 'https://www.brunswicklibrary.org', eventsUrl: 'https://www.brunswicklibrary.org/events', city: 'Brunswick', state: 'GA', zipCode: '00000', county: 'Brunswick County'},
  { name: 'Marion County Library', url: 'https://www.buenavistalibrary.org', eventsUrl: 'https://www.buenavistalibrary.org/events', city: 'Buena Vista', state: 'GA', zipCode: '00000', county: 'Buena Vista County'},
  { name: 'Buford-Sugar Hill', url: 'https://www.bufordlibrary.org', eventsUrl: 'https://www.bufordlibrary.org/events', city: 'Buford', state: 'GA', zipCode: '00000', county: 'Buford County'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'GA', zipCode: '00000', county: 'Butler County'},
  { name: 'Byromville Public Library', url: 'https://www.byromvillelibrary.org', eventsUrl: 'https://www.byromvillelibrary.org/events', city: 'Byromville', state: 'GA', zipCode: '00000', county: 'Byromville County'},
  { name: 'Byron Public Library', url: 'https://www.byronlibrary.org', eventsUrl: 'https://www.byronlibrary.org/events', city: 'Byron', state: 'GA', zipCode: '00000', county: 'Byron County'},
  { name: 'Roddenbery Memorial Library System', url: 'https://www.cairolibrary.org', eventsUrl: 'https://www.cairolibrary.org/events', city: 'Cairo', state: 'GA', zipCode: '39828', county: 'Cairo County'},
  { name: 'Calhoun-Gordon County Library', url: 'https://www.calhounlibrary.org', eventsUrl: 'https://www.calhounlibrary.org/events', city: 'Calhoun', state: 'GA', zipCode: '00000', county: 'Calhoun County'},
  { name: 'Desoto Trail Regional Library System', url: 'https://www.camillalibrary.org', eventsUrl: 'https://www.camillalibrary.org/events', city: 'Camilla', state: 'GA', zipCode: '31730', county: 'Camilla County'},
  { name: 'Hickory Flat Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'GA', zipCode: '00000', county: 'Canton County'},
  { name: 'Neva Lomason Memorial Library', url: 'https://www.carrolltonlibrary.org', eventsUrl: 'https://www.carrolltonlibrary.org/events', city: 'Carrollton', state: 'GA', zipCode: '00000', county: 'Carrollton County'},
  { name: 'Bartow County Library System', url: 'https://www.cartersvillelibrary.org', eventsUrl: 'https://www.cartersvillelibrary.org/events', city: 'Cartersville', state: 'GA', zipCode: '30120', county: 'Cartersville County'},
  { name: 'Cave Spring Library', url: 'https://www.cavespringlibrary.org', eventsUrl: 'https://www.cavespringlibrary.org/events', city: 'Cave Spring', state: 'GA', zipCode: '00000', county: 'Cave Spring County'},
  { name: 'Cedartown Library', url: 'https://www.cedartownlibrary.org', eventsUrl: 'https://www.cedartownlibrary.org/events', city: 'Cedartown', state: 'GA', zipCode: '00000', county: 'Cedartown County'},
  { name: 'Centerville Branch Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'GA', zipCode: '00000', county: 'Centerville County'},
  { name: 'Chamblee Branch', url: 'https://www.chambleelibrary.org', eventsUrl: 'https://www.chambleelibrary.org/events', city: 'Chamblee', state: 'GA', zipCode: '00000', county: 'Chamblee County'},
  { name: 'Chatsworth-Murray County Library', url: 'https://www.chatsworthlibrary.org', eventsUrl: 'https://www.chatsworthlibrary.org/events', city: 'Chatsworth', state: 'GA', zipCode: '00000', county: 'Chatsworth County'},
  { name: 'Chickamauga Public Library', url: 'https://www.chickamaugalibrary.org', eventsUrl: 'https://www.chickamaugalibrary.org/events', city: 'Chickamauga', state: 'GA', zipCode: '00000', county: 'Chickamauga County'},
  { name: 'Clarkesville-Habersham Co. Lib.', url: 'https://www.clarkesvillelibrary.org', eventsUrl: 'https://www.clarkesvillelibrary.org/events', city: 'Clarkesville', state: 'GA', zipCode: '00000', county: 'Clarkesville County'},
  { name: 'Clarkston Branch', url: 'https://www.clarkstonlibrary.org', eventsUrl: 'https://www.clarkstonlibrary.org/events', city: 'Clarkston', state: 'GA', zipCode: '00000', county: 'Clarkston County'},
  { name: 'Evans County Library', url: 'https://www.claxtonlibrary.org', eventsUrl: 'https://www.claxtonlibrary.org/events', city: 'Claxton', state: 'GA', zipCode: '00000', county: 'Claxton County'},
  { name: 'Rabun Co. Public Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'GA', zipCode: '00000', county: 'Clayton County'},
  { name: 'Clermont Library', url: 'https://www.clermontlibrary.org', eventsUrl: 'https://www.clermontlibrary.org/events', city: 'Clermont', state: 'GA', zipCode: '00000', county: 'Clermont County'},
  { name: 'White County Public Library-Cleveland Branch', url: 'https://www.clevelandlibrary.org', eventsUrl: 'https://www.clevelandlibrary.org/events', city: 'Cleveland', state: 'GA', zipCode: '00000', county: 'Cleveland County'},
  { name: 'Tessie W. Norris Cochran-Bleckley County Pl', url: 'https://www.cochranlibrary.org', eventsUrl: 'https://www.cochranlibrary.org/events', city: 'Cochran', state: 'GA', zipCode: '00000', county: 'Cochran County'},
  { name: 'James W. Merritt, Jr. Memorial Library', url: 'https://www.colquittlibrary.org', eventsUrl: 'https://www.colquittlibrary.org/events', city: 'Colquitt', state: 'GA', zipCode: '00000', county: 'Colquitt County'},
  { name: 'Chattahoochee Valley Regional Library System', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'GA', zipCode: '31906', county: 'Columbus County'},
  { name: 'Commerce Public Library', url: 'https://www.commercelibrary.org', eventsUrl: 'https://www.commercelibrary.org/events', city: 'Commerce', state: 'GA', zipCode: '00000', county: 'Commerce County'},
  { name: 'Conyers-Rockdale Library System', url: 'https://www.conyerslibrary.org', eventsUrl: 'https://www.conyerslibrary.org/events', city: 'Conyers', state: 'GA', zipCode: '30012', county: 'Conyers County'},
  { name: 'Coolidge Public Library', url: 'https://www.coolidgelibrary.org', eventsUrl: 'https://www.coolidgelibrary.org/events', city: 'Coolidge', state: 'GA', zipCode: '00000', county: 'Coolidge County'},
  { name: 'Cordele-Crisp Carnegie Library', url: 'https://www.cordelelibrary.org', eventsUrl: 'https://www.cordelelibrary.org/events', city: 'Cordele', state: 'GA', zipCode: '00000', county: 'Cordele County'},
  { name: 'Cornelia-Habersham Co. Lib.', url: 'https://www.cornelialibrary.org', eventsUrl: 'https://www.cornelialibrary.org/events', city: 'Cornelia', state: 'GA', zipCode: '00000', county: 'Cornelia County'},
  { name: 'Newton County Library System', url: 'https://www.covingtonlibrary.org', eventsUrl: 'https://www.covingtonlibrary.org/events', city: 'Covington', state: 'GA', zipCode: '30014', county: 'Covington County'},
  { name: 'Taliaferro County Library', url: 'https://www.crawfordvillelibrary.org', eventsUrl: 'https://www.crawfordvillelibrary.org/events', city: 'Crawfordville', state: 'GA', zipCode: '00000', county: 'Crawfordville County'},
  { name: 'Forsyth County Public Library System', url: 'https://www.cumminglibrary.org', eventsUrl: 'https://www.cumminglibrary.org/events', city: 'Cumming', state: 'GA', zipCode: '30040', county: 'Cumming County'},
  { name: 'Randolph County Branch Library', url: 'https://www.cuthbertlibrary.org', eventsUrl: 'https://www.cuthbertlibrary.org/events', city: 'Cuthbert', state: 'GA', zipCode: '00000', county: 'Cuthbert County'},
  { name: 'Lumpkin County Library', url: 'https://www.dahlonegalibrary.org', eventsUrl: 'https://www.dahlonegalibrary.org/events', city: 'Dahlonega', state: 'GA', zipCode: '00000', county: 'Dahlonega County'},
  { name: 'New Georgia Public Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'GA', zipCode: '00000', county: 'Dallas County'},
  { name: 'Dalton-Whitfield County Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'GA', zipCode: '00000', county: 'Dalton County'},
  { name: 'Madison County Library', url: 'https://www.danielsvillelibrary.org', eventsUrl: 'https://www.danielsvillelibrary.org/events', city: 'Danielsville', state: 'GA', zipCode: '00000', county: 'Danielsville County'},
  { name: 'Ida Hilton Public Library', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'GA', zipCode: '00000', county: 'Darien County'},
  { name: 'Kinchafoonee Regional Library System', url: 'https://www.dawsonlibrary.org', eventsUrl: 'https://www.dawsonlibrary.org/events', city: 'Dawson', state: 'GA', zipCode: '39842', county: 'Dawson County'},
  { name: 'Chestatee Regional Library System', url: 'https://www.dawsonvillelibrary.org', eventsUrl: 'https://www.dawsonvillelibrary.org/events', city: 'Dawsonville', state: 'GA', zipCode: '30534', county: 'Dawsonville County'},
  { name: 'Covington Branch', url: 'https://www.decaturlibrary.org', eventsUrl: 'https://www.decaturlibrary.org/events', city: 'Decatur', state: 'GA', zipCode: '00000', county: 'Decatur County'},
  { name: 'Monroe Memorial Library', url: 'https://www.doerunlibrary.org', eventsUrl: 'https://www.doerunlibrary.org/events', city: 'Doerun', state: 'GA', zipCode: '00000', county: 'Doerun County'},
  { name: 'Seminole County Public Library', url: 'https://www.donalsonvillelibrary.org', eventsUrl: 'https://www.donalsonvillelibrary.org/events', city: 'Donalsonville', state: 'GA', zipCode: '00000', county: 'Donalsonville County'},
  { name: 'Doraville Branch', url: 'https://www.doravillelibrary.org', eventsUrl: 'https://www.doravillelibrary.org/events', city: 'Doraville', state: 'GA', zipCode: '00000', county: 'Doraville County'},
  { name: 'Douglas-Coffee County Public Library', url: 'https://www.douglaslibrary.org', eventsUrl: 'https://www.douglaslibrary.org/events', city: 'Douglas', state: 'GA', zipCode: '00000', county: 'Douglas County'},
  { name: 'Douglas County Public Library', url: 'https://www.douglasvillelibrary.org', eventsUrl: 'https://www.douglasvillelibrary.org/events', city: 'Douglasville', state: 'GA', zipCode: '00000', county: 'Douglasville County'},
  { name: 'Laurens County Library', url: 'https://www.dublinlibrary.org', eventsUrl: 'https://www.dublinlibrary.org/events', city: 'Dublin', state: 'GA', zipCode: '00000', county: 'Dublin County'},
  { name: 'Duluth', url: 'https://www.duluthlibrary.org', eventsUrl: 'https://www.duluthlibrary.org/events', city: 'Duluth', state: 'GA', zipCode: '00000', county: 'Duluth County'},
  { name: 'Dunwoody Branch', url: 'https://www.dunwoodylibrary.org', eventsUrl: 'https://www.dunwoodylibrary.org/events', city: 'Dunwoody', state: 'GA', zipCode: '00000', county: 'Dunwoody County'},
  { name: 'East Point Branch', url: 'https://www.eastpointlibrary.org', eventsUrl: 'https://www.eastpointlibrary.org/events', city: 'East Point', state: 'GA', zipCode: '00000', county: 'East Point County'},
  { name: 'Murrell Memorial-Dodge County Public Library', url: 'https://www.eastmanlibrary.org', eventsUrl: 'https://www.eastmanlibrary.org/events', city: 'Eastman', state: 'GA', zipCode: '00000', county: 'Eastman County'},
  { name: 'Eatonton - Putnam County Library', url: 'https://www.eatontonlibrary.org', eventsUrl: 'https://www.eatontonlibrary.org/events', city: 'Eatonton', state: 'GA', zipCode: '00000', county: 'Eatonton County'},
  { name: 'Calhoun County Branch Library', url: 'https://www.edisonlibrary.org', eventsUrl: 'https://www.edisonlibrary.org/events', city: 'Edison', state: 'GA', zipCode: '00000', county: 'Edison County'},
  { name: 'Elbert County Public Library System', url: 'https://www.elbertonlibrary.org', eventsUrl: 'https://www.elbertonlibrary.org/events', city: 'Elberton', state: 'GA', zipCode: '30635', county: 'Elberton County'},
  { name: 'Schley County Library', url: 'https://www.ellavillelibrary.org', eventsUrl: 'https://www.ellavillelibrary.org/events', city: 'Ellaville', state: 'GA', zipCode: '00000', county: 'Ellaville County'},
  { name: 'Gilmer County Library', url: 'https://www.ellijaylibrary.org', eventsUrl: 'https://www.ellijaylibrary.org/events', city: 'Ellijay', state: 'GA', zipCode: '00000', county: 'Ellijay County'},
  { name: 'Gibbs Memorial Library', url: 'https://www.evanslibrary.org', eventsUrl: 'https://www.evanslibrary.org/events', city: 'Evans', state: 'GA', zipCode: '00000', county: 'Evans County'},
  { name: 'Fairburn-Hobgood-Palmer Branch', url: 'https://www.fairburnlibrary.org', eventsUrl: 'https://www.fairburnlibrary.org/events', city: 'Fairburn', state: 'GA', zipCode: '00000', county: 'Fairburn County'},
  { name: 'Fayette County Public Library', url: 'https://www.fayettevillelibrary.org', eventsUrl: 'https://www.fayettevillelibrary.org/events', city: 'Fayetteville', state: 'GA', zipCode: '00000', county: 'Fayetteville County'},
  { name: 'Fitzgerald-Ben Hill County Library', url: 'https://www.fitzgeraldlibrary.org', eventsUrl: 'https://www.fitzgeraldlibrary.org/events', city: 'Fitzgerald', state: 'GA', zipCode: '31750', county: 'Fitzgerald County'},
  { name: 'Charlton County Public Library', url: 'https://www.folkstonlibrary.org', eventsUrl: 'https://www.folkstonlibrary.org/events', city: 'Folkston', state: 'GA', zipCode: '00000', county: 'Folkston County'},
  { name: 'Forest Park Branch Library', url: 'https://www.forestparklibrary.org', eventsUrl: 'https://www.forestparklibrary.org/events', city: 'Forest Park', state: 'GA', zipCode: '00000', county: 'Forest Park County'},
  { name: 'Monroe County Library', url: 'https://www.forsythlibrary.org', eventsUrl: 'https://www.forsythlibrary.org/events', city: 'Forsyth', state: 'GA', zipCode: '00000', county: 'Forsyth County'},
  { name: 'Clay County Branch Library', url: 'https://www.fortgaineslibrary.org', eventsUrl: 'https://www.fortgaineslibrary.org/events', city: 'Fort Gaines', state: 'GA', zipCode: '00000', county: 'Fort Gaines County'},
  { name: 'Peach County Public Libraries System', url: 'https://www.fortvalleylibrary.org', eventsUrl: 'https://www.fortvalleylibrary.org/events', city: 'Fort Valley', state: 'GA', zipCode: '31030', county: 'Fort Valley County'},
  { name: 'Heard County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'GA', zipCode: '00000', county: 'Franklin County'},
  { name: 'Blackshear Place Library', url: 'https://www.gainesvillelibrary.org', eventsUrl: 'https://www.gainesvillelibrary.org/events', city: 'Gainesville', state: 'GA', zipCode: '00000', county: 'Gainesville County'},
  { name: 'Glascock County', url: 'https://www.gibsonlibrary.org', eventsUrl: 'https://www.gibsonlibrary.org/events', city: 'Gibson', state: 'GA', zipCode: '00000', county: 'Gibson County'},
  { name: 'Glennville Public Library', url: 'https://www.glennvillelibrary.org', eventsUrl: 'https://www.glennvillelibrary.org/events', city: 'Glennville', state: 'GA', zipCode: '00000', county: 'Glennville County'},
  { name: 'Gordon Public Library', url: 'https://www.gordonlibrary.org', eventsUrl: 'https://www.gordonlibrary.org/events', city: 'Gordon', state: 'GA', zipCode: '00000', county: 'Gordon County'},
  { name: 'Grantville Public Library', url: 'https://www.grantvillelibrary.org', eventsUrl: 'https://www.grantvillelibrary.org/events', city: 'Grantville', state: 'GA', zipCode: '00000', county: 'Grantville County'},
  { name: 'Jones County Public Library', url: 'https://www.graylibrary.org', eventsUrl: 'https://www.graylibrary.org/events', city: 'Gray', state: 'GA', zipCode: '00000', county: 'Gray County'},
  { name: 'Greene County Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'GA', zipCode: '00000', county: 'Greensboro County'},
  { name: 'Greenville Area Public Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'GA', zipCode: '00000', county: 'Greenville County'},
  { name: 'Flint River Regional Library System', url: 'https://www.griffinlibrary.org', eventsUrl: 'https://www.griffinlibrary.org/events', city: 'Griffin', state: 'GA', zipCode: '30223', county: 'Griffin County'},
  { name: 'Euchee Creek Branch', url: 'https://www.grovetownlibrary.org', eventsUrl: 'https://www.grovetownlibrary.org/events', city: 'Grovetown', state: 'GA', zipCode: '00000', county: 'Grovetown County'},
  { name: 'Slater Hahira Library', url: 'https://www.hahiralibrary.org', eventsUrl: 'https://www.hahiralibrary.org/events', city: 'Hahira', state: 'GA', zipCode: '00000', county: 'Hahira County'},
  { name: 'Harris County Public Library', url: 'https://www.hamiltonlibrary.org', eventsUrl: 'https://www.hamiltonlibrary.org/events', city: 'Hamilton', state: 'GA', zipCode: '00000', county: 'Hamilton County'},
  { name: 'Fortson Public Library', url: 'https://www.hamptonlibrary.org', eventsUrl: 'https://www.hamptonlibrary.org/events', city: 'Hampton', state: 'GA', zipCode: '00000', county: 'Hampton County'},
  { name: 'Hapeville Branch', url: 'https://www.hapevillelibrary.org', eventsUrl: 'https://www.hapevillelibrary.org/events', city: 'Hapeville', state: 'GA', zipCode: '00000', county: 'Hapeville County'},
  { name: 'Harlem Branch', url: 'https://www.harlemlibrary.org', eventsUrl: 'https://www.harlemlibrary.org/events', city: 'Harlem', state: 'GA', zipCode: '00000', county: 'Harlem County'},
  { name: 'Hart County Library System', url: 'https://www.hartwelllibrary.org', eventsUrl: 'https://www.hartwelllibrary.org/events', city: 'Hartwell', state: 'GA', zipCode: '30643', county: 'Hartwell County'},
  { name: 'M. E. Roden Memorial Library', url: 'https://www.hawkinsvillelibrary.org', eventsUrl: 'https://www.hawkinsvillelibrary.org/events', city: 'Hawkinsville', state: 'GA', zipCode: '00000', county: 'Hawkinsville County'},
  { name: 'Hazlehurst-Jeff Davis Public Library', url: 'https://www.hazlehurstlibrary.org', eventsUrl: 'https://www.hazlehurstlibrary.org/events', city: 'Hazlehurst', state: 'GA', zipCode: '00000', county: 'Hazlehurst County'},
  { name: 'White County Public Library-Helen Branch', url: 'https://www.helenlibrary.org', eventsUrl: 'https://www.helenlibrary.org/events', city: 'Helen', state: 'GA', zipCode: '00000', county: 'Helen County'},
  { name: 'Towns County Public Library', url: 'https://www.hiawasseelibrary.org', eventsUrl: 'https://www.hiawasseelibrary.org/events', city: 'Hiawassee', state: 'GA', zipCode: '00000', county: 'Hiawassee County'},
  { name: 'Liberty', url: 'https://www.hinesvillelibrary.org', eventsUrl: 'https://www.hinesvillelibrary.org/events', city: 'Hinesville', state: 'GA', zipCode: '00000', county: 'Hinesville County'},
  { name: 'Maude P. Ragsdale Public Library', url: 'https://www.hiramlibrary.org', eventsUrl: 'https://www.hiramlibrary.org/events', city: 'Hiram', state: 'GA', zipCode: '00000', county: 'Hiram County'},
  { name: 'Hogansville Public Library', url: 'https://www.hogansvillelibrary.org', eventsUrl: 'https://www.hogansvillelibrary.org/events', city: 'Hogansville', state: 'GA', zipCode: '00000', county: 'Hogansville County'},
  { name: 'Banks County Public Library', url: 'https://www.homerlibrary.org', eventsUrl: 'https://www.homerlibrary.org/events', city: 'Homer', state: 'GA', zipCode: '00000', county: 'Homer County'},
  { name: 'Clinch County Public Library', url: 'https://www.homervillelibrary.org', eventsUrl: 'https://www.homervillelibrary.org/events', city: 'Homerville', state: 'GA', zipCode: '00000', county: 'Homerville County'},
  { name: 'Ideal Public Library', url: 'https://www.ideallibrary.org', eventsUrl: 'https://www.ideallibrary.org/events', city: 'Ideal', state: 'GA', zipCode: '00000', county: 'Ideal County'},
  { name: 'East Wilkinson County Library', url: 'https://www.irwintonlibrary.org', eventsUrl: 'https://www.irwintonlibrary.org/events', city: 'Irwinton', state: 'GA', zipCode: '00000', county: 'Irwinton County'},
  { name: 'Jackson-Butts County Public Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'GA', zipCode: '00000', county: 'Jackson County'},
  { name: 'Jakin Public Library', url: 'https://www.jakinlibrary.org', eventsUrl: 'https://www.jakinlibrary.org/events', city: 'Jakin', state: 'GA', zipCode: '00000', county: 'Jakin County'},
  { name: 'Pickens County Library', url: 'https://www.jasperlibrary.org', eventsUrl: 'https://www.jasperlibrary.org/events', city: 'Jasper', state: 'GA', zipCode: '00000', county: 'Jasper County'},
  { name: 'Twiggs County Public Library', url: 'https://www.jeffersonvillelibrary.org', eventsUrl: 'https://www.jeffersonvillelibrary.org/events', city: 'Jeffersonville', state: 'GA', zipCode: '00000', county: 'Jeffersonville County'},
  { name: 'Wayne County Library', url: 'https://www.jesuplibrary.org', eventsUrl: 'https://www.jesuplibrary.org/events', city: 'Jesup', state: 'GA', zipCode: '00000', county: 'Jesup County'},
  { name: 'Clayton County Library System', url: 'https://www.jonesborolibrary.org', eventsUrl: 'https://www.jonesborolibrary.org/events', city: 'Jonesboro', state: 'GA', zipCode: '30236', county: 'Jonesboro County'},
  { name: 'Kennesaw Library', url: 'https://www.kennesawlibrary.org', eventsUrl: 'https://www.kennesawlibrary.org/events', city: 'Kennesaw', state: 'GA', zipCode: '00000', county: 'Kennesaw County'},
  { name: 'Camden County Public Library', url: 'https://www.kingslandlibrary.org', eventsUrl: 'https://www.kingslandlibrary.org/events', city: 'Kingsland', state: 'GA', zipCode: '00000', county: 'Kingsland County'},
  { name: 'Cherokee Regional Library System', url: 'https://www.lafayettelibrary.org', eventsUrl: 'https://www.lafayettelibrary.org/events', city: 'Lafayette', state: 'GA', zipCode: '30728', county: 'Lafayette County'},
  { name: 'Lagrange Memorial Library', url: 'https://www.lagrangelibrary.org', eventsUrl: 'https://www.lagrangelibrary.org/events', city: 'Lagrange', state: 'GA', zipCode: '00000', county: 'Lagrange County'},
  { name: 'Johnson Lakes Library', url: 'https://www.lakeparklibrary.org', eventsUrl: 'https://www.lakeparklibrary.org/events', city: 'Lake Park', state: 'GA', zipCode: '00000', county: 'Lake Park County'},
  { name: 'Miller Lakeland Library', url: 'https://www.lakelandlibrary.org', eventsUrl: 'https://www.lakelandlibrary.org/events', city: 'Lakeland', state: 'GA', zipCode: '00000', county: 'Lakeland County'},
  { name: 'Lavonia-Carnegie Library', url: 'https://www.lavonialibrary.org', eventsUrl: 'https://www.lavonialibrary.org/events', city: 'Lavonia', state: 'GA', zipCode: '00000', county: 'Lavonia County'},
  { name: 'Collins Hill', url: 'https://www.lawrencevillelibrary.org', eventsUrl: 'https://www.lawrencevillelibrary.org/events', city: 'Lawrenceville', state: 'GA', zipCode: '00000', county: 'Lawrenceville County'},
  { name: 'Lee County Public Library System', url: 'https://www.leesburglibrary.org', eventsUrl: 'https://www.leesburglibrary.org/events', city: 'Leesburg', state: 'GA', zipCode: '31763', county: 'Leesburg County'},
  { name: 'Oglethorpe County Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'GA', zipCode: '00000', county: 'Lexington County'},
  { name: 'Lilburn', url: 'https://www.lilburnlibrary.org', eventsUrl: 'https://www.lilburnlibrary.org/events', city: 'Lilburn', state: 'GA', zipCode: '00000', county: 'Lilburn County'},
  { name: 'Lincoln County Library', url: 'https://www.lincolntonlibrary.org', eventsUrl: 'https://www.lincolntonlibrary.org/events', city: 'Lincolnton', state: 'GA', zipCode: '00000', county: 'Lincolnton County'},
  { name: 'Lithia Springs Public Library', url: 'https://www.lithiaspringslibrary.org', eventsUrl: 'https://www.lithiaspringslibrary.org/events', city: 'Lithia Springs', state: 'GA', zipCode: '00000', county: 'Lithia Springs County'},
  { name: 'Bruce Street Branch', url: 'https://www.lithonialibrary.org', eventsUrl: 'https://www.lithonialibrary.org/events', city: 'Lithonia', state: 'GA', zipCode: '00000', county: 'Lithonia County'},
  { name: 'Locust Grove Public Library', url: 'https://www.locustgrovelibrary.org', eventsUrl: 'https://www.locustgrovelibrary.org/events', city: 'Locust Grove', state: 'GA', zipCode: '00000', county: 'Locust Grove County'},
  { name: 'Okelly Memorial Library', url: 'https://www.loganvillelibrary.org', eventsUrl: 'https://www.loganvillelibrary.org/events', city: 'Loganville', state: 'GA', zipCode: '00000', county: 'Loganville County'},
  { name: 'Jefferson County Library System', url: 'https://www.louisvillelibrary.org', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'GA', zipCode: '30434', county: 'Louisville County'},
  { name: 'Long County Public Library', url: 'https://www.ludowicilibrary.org', eventsUrl: 'https://www.ludowicilibrary.org/events', city: 'Ludowici', state: 'GA', zipCode: '00000', county: 'Ludowici County'},
  { name: 'Lumpkin Public Library', url: 'https://www.lumpkinlibrary.org', eventsUrl: 'https://www.lumpkinlibrary.org/events', city: 'Lumpkin', state: 'GA', zipCode: '00000', county: 'Lumpkin County'},
  { name: 'Nelle Brown Memorial Public Library', url: 'https://www.lyonslibrary.org', eventsUrl: 'https://www.lyonslibrary.org/events', city: 'Lyons', state: 'GA', zipCode: '00000', county: 'Lyons County'},
  { name: 'South Cobb Library', url: 'https://www.mabletonlibrary.org', eventsUrl: 'https://www.mabletonlibrary.org/events', city: 'Mableton', state: 'GA', zipCode: '00000', county: 'Mableton County'},
  { name: 'Middle Georgia Regional Library System', url: 'https://www.maconlibrary.org', eventsUrl: 'https://www.maconlibrary.org/events', city: 'Macon', state: 'GA', zipCode: '31201', county: 'Macon County'},
  { name: 'Morgan County Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'GA', zipCode: '00000', county: 'Madison County'},
  { name: 'Manchester Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'GA', zipCode: '00000', county: 'Manchester County'},
  { name: 'Cobb County Public Library System', url: 'https://www.mariettalibrary.org', eventsUrl: 'https://www.mariettalibrary.org/events', city: 'Marietta', state: 'GA', zipCode: '30060', county: 'Marietta County'},
  { name: 'Marshallville Public Library', url: 'https://www.marshallvillelibrary.org', eventsUrl: 'https://www.marshallvillelibrary.org/events', city: 'Marshallville', state: 'GA', zipCode: '00000', county: 'Marshallville County'},
  { name: 'Maysville Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'GA', zipCode: '00000', county: 'Maysville County'},
  { name: 'Henry County Library System', url: 'https://www.mcdonoughlibrary.org', eventsUrl: 'https://www.mcdonoughlibrary.org/events', city: 'Mcdonough', state: 'GA', zipCode: '30252', county: 'Mcdonough County'},
  { name: 'Telfair County Public Library', url: 'https://www.mcraelibrary.org', eventsUrl: 'https://www.mcraelibrary.org/events', city: 'Mcrae', state: 'GA', zipCode: '00000', county: 'Mcrae County'},
  { name: 'Meigs Public Library', url: 'https://www.meigslibrary.org', eventsUrl: 'https://www.meigslibrary.org/events', city: 'Meigs', state: 'GA', zipCode: '00000', county: 'Meigs County'},
  { name: 'L. C. Anderson Memorial Library', url: 'https://www.metterlibrary.org', eventsUrl: 'https://www.metterlibrary.org/events', city: 'Metter', state: 'GA', zipCode: '00000', county: 'Metter County'},
  { name: 'Midville Branch', url: 'https://www.midvillelibrary.org', eventsUrl: 'https://www.midvillelibrary.org/events', city: 'Midville', state: 'GA', zipCode: '00000', county: 'Midville County'},
  { name: 'Midway-Riceboro', url: 'https://www.midwaylibrary.org', eventsUrl: 'https://www.midwaylibrary.org/events', city: 'Midway', state: 'GA', zipCode: '00000', county: 'Midway County'},
  { name: 'Lake Sinclair Library', url: 'https://www.milledgevillelibrary.org', eventsUrl: 'https://www.milledgevillelibrary.org/events', city: 'Milledgeville', state: 'GA', zipCode: '00000', county: 'Milledgeville County'},
  { name: 'Jenkins County Memorial Library', url: 'https://www.millenlibrary.org', eventsUrl: 'https://www.millenlibrary.org/events', city: 'Millen', state: 'GA', zipCode: '00000', county: 'Millen County'},
  { name: 'Monroe-Walton County Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'GA', zipCode: '00000', county: 'Monroe County'},
  { name: 'Montezuma Public Library', url: 'https://www.montezumalibrary.org', eventsUrl: 'https://www.montezumalibrary.org/events', city: 'Montezuma', state: 'GA', zipCode: '00000', county: 'Montezuma County'},
  { name: 'Jasper County Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'GA', zipCode: '00000', county: 'Monticello County'},
  { name: 'Morrow Branch Library', url: 'https://www.morrowlibrary.org', eventsUrl: 'https://www.morrowlibrary.org/events', city: 'Morrow', state: 'GA', zipCode: '00000', county: 'Morrow County'},
  { name: 'Moultrie-Colquitt County Library System', url: 'https://www.moultrielibrary.org', eventsUrl: 'https://www.moultrielibrary.org/events', city: 'Moultrie', state: 'GA', zipCode: '31768', county: 'Moultrie County'},
  { name: 'Montgomery County Public Library', url: 'https://www.mtvernonlibrary.org', eventsUrl: 'https://www.mtvernonlibrary.org/events', city: 'Mt. Vernon', state: 'GA', zipCode: '00000', county: 'Mt. Vernon County'},
  { name: 'Murrayville Library', url: 'https://www.murrayvillelibrary.org', eventsUrl: 'https://www.murrayvillelibrary.org/events', city: 'Murrayville', state: 'GA', zipCode: '00000', county: 'Murrayville County'},
  { name: 'Brantley County Library', url: 'https://www.nahuntalibrary.org', eventsUrl: 'https://www.nahuntalibrary.org/events', city: 'Nahunta', state: 'GA', zipCode: '00000', county: 'Nahunta County'},
  { name: 'Carrie Dorsey Perry Memorial Library', url: 'https://www.nashvillelibrary.org', eventsUrl: 'https://www.nashvillelibrary.org/events', city: 'Nashville', state: 'GA', zipCode: '00000', county: 'Nashville County'},
  { name: 'Coweta County Public Library System', url: 'https://www.newnanlibrary.org', eventsUrl: 'https://www.newnanlibrary.org/events', city: 'Newnan', state: 'GA', zipCode: '30265', county: 'Newnan County'},
  { name: 'Baker County', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'GA', zipCode: '00000', county: 'Newton County'},
  { name: 'Nicholls Public Library', url: 'https://www.nichollslibrary.org', eventsUrl: 'https://www.nichollslibrary.org/events', city: 'Nicholls', state: 'GA', zipCode: '00000', county: 'Nicholls County'},
  { name: 'Harold S. Swindle Public Library', url: 'https://www.nicholsonlibrary.org', eventsUrl: 'https://www.nicholsonlibrary.org/events', city: 'Nicholson', state: 'GA', zipCode: '00000', county: 'Nicholson County'},
  { name: 'Norcross', url: 'https://www.norcrosslibrary.org', eventsUrl: 'https://www.norcrosslibrary.org/events', city: 'Norcross', state: 'GA', zipCode: '00000', county: 'Norcross County'},
  { name: 'Gladys Clark Public Library Ochlocknee', url: 'https://www.ochlockneelibrary.org', eventsUrl: 'https://www.ochlockneelibrary.org/events', city: 'Ochlocknee', state: 'GA', zipCode: '00000', county: 'Ochlocknee County'},
  { name: 'Irwin County Library', url: 'https://www.ocillalibrary.org', eventsUrl: 'https://www.ocillalibrary.org/events', city: 'Ocilla', state: 'GA', zipCode: '00000', county: 'Ocilla County'},
  { name: 'Oglethorpe Public Library', url: 'https://www.oglethorpelibrary.org', eventsUrl: 'https://www.oglethorpelibrary.org/events', city: 'Oglethorpe', state: 'GA', zipCode: '00000', county: 'Oglethorpe County'},
  { name: 'Pavo Public Library', url: 'https://www.pavolibrary.org', eventsUrl: 'https://www.pavolibrary.org/events', city: 'Pavo', state: 'GA', zipCode: '00000', county: 'Pavo County'},
  { name: 'Peachtree City Library', url: 'https://www.peachtreecitylibrary.org', eventsUrl: 'https://www.peachtreecitylibrary.org/events', city: 'Peachtree City', state: 'GA', zipCode: '00000', county: 'Peachtree City County'},
  { name: 'Pearson Public Library', url: 'https://www.pearsonlibrary.org', eventsUrl: 'https://www.pearsonlibrary.org/events', city: 'Pearson', state: 'GA', zipCode: '00000', county: 'Pearson County'},
  { name: 'Pelham-Carnegie Library', url: 'https://www.pelhamlibrary.org', eventsUrl: 'https://www.pelhamlibrary.org/events', city: 'Pelham', state: 'GA', zipCode: '00000', county: 'Pelham County'},
  { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org', eventsUrl: 'https://www.pembrokelibrary.org/events', city: 'Pembroke', state: 'GA', zipCode: '00000', county: 'Pembroke County'},
  { name: 'Houston County Public Libraries System', url: 'https://www.perrylibrary.org', eventsUrl: 'https://www.perrylibrary.org/events', city: 'Perry', state: 'GA', zipCode: '31069', county: 'Perry County'},
  { name: 'West Chatham', url: 'https://www.poolerlibrary.org', eventsUrl: 'https://www.poolerlibrary.org/events', city: 'Pooler', state: 'GA', zipCode: '00000', county: 'Pooler County'},
  { name: 'Powder Springs Library', url: 'https://www.powderspringslibrary.org', eventsUrl: 'https://www.powderspringslibrary.org/events', city: 'Powder Springs', state: 'GA', zipCode: '00000', county: 'Powder Springs County'},
  { name: 'Webster County Library', url: 'https://www.prestonlibrary.org', eventsUrl: 'https://www.prestonlibrary.org/events', city: 'Preston', state: 'GA', zipCode: '00000', county: 'Preston County'},
  { name: 'Brooks County Public Library System', url: 'https://www.quitmanlibrary.org', eventsUrl: 'https://www.quitmanlibrary.org/events', city: 'Quitman', state: 'GA', zipCode: '31643', county: 'Quitman County'},
  { name: 'Redan-Trotti Branch', url: 'https://www.redanlibrary.org', eventsUrl: 'https://www.redanlibrary.org/events', city: 'Redan', state: 'GA', zipCode: '00000', county: 'Redan County'},
  { name: 'Tattnall County Library', url: 'https://www.reidsvillelibrary.org', eventsUrl: 'https://www.reidsvillelibrary.org/events', city: 'Reidsville', state: 'GA', zipCode: '00000', county: 'Reidsville County'},
  { name: 'Reynolds Community Library', url: 'https://www.reynoldslibrary.org', eventsUrl: 'https://www.reynoldslibrary.org/events', city: 'Reynolds', state: 'GA', zipCode: '00000', county: 'Reynolds County'},
  { name: 'Parks Memorial Library', url: 'https://www.richlandlibrary.org', eventsUrl: 'https://www.richlandlibrary.org/events', city: 'Richland', state: 'GA', zipCode: '00000', county: 'Richland County'},
  { name: 'Richmond Hill Public Library', url: 'https://www.richmondhilllibrary.org', eventsUrl: 'https://www.richmondhilllibrary.org/events', city: 'Richmond Hill', state: 'GA', zipCode: '00000', county: 'Richmond Hill County'},
  { name: 'South Effingham', url: 'https://www.rinconlibrary.org', eventsUrl: 'https://www.rinconlibrary.org/events', city: 'Rincon', state: 'GA', zipCode: '00000', county: 'Rincon County'},
  { name: 'Catoosa County Library At Benton Place Campus', url: 'https://www.ringgoldlibrary.org', eventsUrl: 'https://www.ringgoldlibrary.org/events', city: 'Ringgold', state: 'GA', zipCode: '00000', county: 'Ringgold County'},
  { name: 'Riverdale Branch Library', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'GA', zipCode: '00000', county: 'Riverdale County'},
  { name: 'Crawford County Public Library', url: 'https://www.robertalibrary.org', eventsUrl: 'https://www.robertalibrary.org/events', city: 'Roberta', state: 'GA', zipCode: '00000', county: 'Roberta County'},
  { name: 'Rockmart Library', url: 'https://www.rockmartlibrary.org', eventsUrl: 'https://www.rockmartlibrary.org/events', city: 'Rockmart', state: 'GA', zipCode: '00000', county: 'Rockmart County'},
  { name: 'Rome-Floyd County Library', url: 'https://www.romelibrary.org', eventsUrl: 'https://www.romelibrary.org/events', city: 'Rome', state: 'GA', zipCode: '00000', county: 'Rome County'},
  { name: 'Ephesus Public Library', url: 'https://www.roopvillelibrary.org', eventsUrl: 'https://www.roopvillelibrary.org/events', city: 'Roopville', state: 'GA', zipCode: '30170', county: 'Roopville County'},
  { name: 'Rossville Public Library', url: 'https://www.rossvillelibrary.org', eventsUrl: 'https://www.rossvillelibrary.org/events', city: 'Rossville', state: 'GA', zipCode: '00000', county: 'Rossville County'},
  { name: 'Roswell Regional Branch', url: 'https://www.roswelllibrary.org', eventsUrl: 'https://www.roswelllibrary.org/events', city: 'Roswell', state: 'GA', zipCode: '00000', county: 'Roswell County'},
  { name: 'Royston Branch Library', url: 'https://www.roystonlibrary.org', eventsUrl: 'https://www.roystonlibrary.org/events', city: 'Royston', state: 'GA', zipCode: '00000', county: 'Royston County'},
  { name: 'Rosa M. Tarbutton Memorial Library', url: 'https://www.sandersvillelibrary.org', eventsUrl: 'https://www.sandersvillelibrary.org/events', city: 'Sandersville', state: 'GA', zipCode: '00000', county: 'Sandersville County'},
  { name: 'Sardis Branch', url: 'https://www.sardislibrary.org', eventsUrl: 'https://www.sardislibrary.org/events', city: 'Sardis', state: 'GA', zipCode: '00000', county: 'Sardis County'},
  { name: 'Bull Street', url: 'https://www.savannahlibrary.org', eventsUrl: 'https://www.savannahlibrary.org/events', city: 'Savannah', state: 'GA', zipCode: '00000', county: 'Savannah County'},
  { name: 'Scottdale-Tobie Grant Branch', url: 'https://www.scottdalelibrary.org', eventsUrl: 'https://www.scottdalelibrary.org/events', city: 'Scottdale', state: 'GA', zipCode: '00000', county: 'Scottdale County'},
  { name: 'Senoia Area Public Library', url: 'https://www.senoialibrary.org', eventsUrl: 'https://www.senoialibrary.org/events', city: 'Senoia', state: 'GA', zipCode: '00000', county: 'Senoia County'},
  { name: 'Smithville Library', url: 'https://www.smithvillelibrary.org', eventsUrl: 'https://www.smithvillelibrary.org/events', city: 'Smithville', state: 'GA', zipCode: '00000', county: 'Smithville County'},
  { name: 'Lewis A. Ray Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'GA', zipCode: '00000', county: 'Smyrna County'},
  { name: 'Elizabeth H. Williams', url: 'https://www.snellvillelibrary.org', eventsUrl: 'https://www.snellvillelibrary.org/events', city: 'Snellville', state: 'GA', zipCode: '00000', county: 'Snellville County'},
  { name: 'W. H. Stanton Memorial Library', url: 'https://www.socialcirclelibrary.org', eventsUrl: 'https://www.socialcirclelibrary.org/events', city: 'Social Circle', state: 'GA', zipCode: '00000', county: 'Social Circle County'},
  { name: 'Treutlen County Library', url: 'https://www.sopertonlibrary.org', eventsUrl: 'https://www.sopertonlibrary.org/events', city: 'Soperton', state: 'GA', zipCode: '00000', county: 'Soperton County'},
  { name: 'Hancock County Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'GA', zipCode: '00000', county: 'Sparta County'},
  { name: 'Effingham', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'GA', zipCode: '00000', county: 'Springfield County'},
  { name: 'St. Marys Public Library', url: 'https://www.stmaryslibrary.org', eventsUrl: 'https://www.stmaryslibrary.org/events', city: 'St. Marys', state: 'GA', zipCode: '00000', county: 'St. Marys County'},
  { name: 'Allen Statenville Library', url: 'https://www.statenvillelibrary.org', eventsUrl: 'https://www.statenvillelibrary.org/events', city: 'Statenville', state: 'GA', zipCode: '00000', county: 'Statenville County'},
  { name: 'Statesboro Regional Library System', url: 'https://www.statesborolibrary.org', eventsUrl: 'https://www.statesborolibrary.org/events', city: 'Statesboro', state: 'GA', zipCode: '30458', county: 'Statesboro County'},
  { name: 'Statham Public Library', url: 'https://www.stathamlibrary.org', eventsUrl: 'https://www.stathamlibrary.org/events', city: 'Statham', state: 'GA', zipCode: '00000', county: 'Statham County'},
  { name: 'Cochran Public Library', url: 'https://www.stockbridgelibrary.org', eventsUrl: 'https://www.stockbridgelibrary.org/events', city: 'Stockbridge', state: 'GA', zipCode: '00000', county: 'Stockbridge County'},
  { name: 'Hairston Crossing Branch', url: 'https://www.stonemountainlibrary.org', eventsUrl: 'https://www.stonemountainlibrary.org/events', city: 'Stone Mountain', state: 'GA', zipCode: '00000', county: 'Stone Mountain County'},
  { name: 'Chattooga County Library System', url: 'https://www.summervillelibrary.org', eventsUrl: 'https://www.summervillelibrary.org/events', city: 'Summerville', state: 'GA', zipCode: '30747', county: 'Summerville County'},
  { name: 'Franklin Memorial Library', url: 'https://www.swainsborolibrary.org', eventsUrl: 'https://www.swainsborolibrary.org/events', city: 'Swainsboro', state: 'GA', zipCode: '00000', county: 'Swainsboro County'},
  { name: 'Screven-Jenkins Regional Library System', url: 'https://www.sylvanialibrary.org', eventsUrl: 'https://www.sylvanialibrary.org/events', city: 'Sylvania', state: 'GA', zipCode: '30467', county: 'Sylvania County'},
  { name: 'Margaret Jones Memorial Library', url: 'https://www.sylvesterlibrary.org', eventsUrl: 'https://www.sylvesterlibrary.org/events', city: 'Sylvester', state: 'GA', zipCode: '00000', county: 'Sylvester County'},
  { name: 'Talbot County Library', url: 'https://www.talbottonlibrary.org', eventsUrl: 'https://www.talbottonlibrary.org/events', city: 'Talbotton', state: 'GA', zipCode: '00000', county: 'Talbotton County'},
  { name: 'Tallapoosa Public Library', url: 'https://www.tallapoosalibrary.org', eventsUrl: 'https://www.tallapoosalibrary.org/events', city: 'Tallapoosa', state: 'GA', zipCode: '00000', county: 'Tallapoosa County'},
  { name: 'Hightower Memorial Library', url: 'https://www.thomastonlibrary.org', eventsUrl: 'https://www.thomastonlibrary.org/events', city: 'Thomaston', state: 'GA', zipCode: '00000', county: 'Thomaston County'},
  { name: 'Thomas County Public Library System', url: 'https://www.thomasvillelibrary.org', eventsUrl: 'https://www.thomasvillelibrary.org/events', city: 'Thomasville', state: 'GA', zipCode: '31792', county: 'Thomasville County'},
  { name: 'Thomson-Mcduffie County Library', url: 'https://www.thomsonlibrary.org', eventsUrl: 'https://www.thomsonlibrary.org/events', city: 'Thomson', state: 'GA', zipCode: '00000', county: 'Thomson County'},
  { name: 'Thunderbolt', url: 'https://www.thunderboltlibrary.org', eventsUrl: 'https://www.thunderboltlibrary.org/events', city: 'Thunderbolt', state: 'GA', zipCode: '00000', county: 'Thunderbolt County'},
  { name: 'Coastal Plain Regional Library System', url: 'https://www.tiftonlibrary.org', eventsUrl: 'https://www.tiftonlibrary.org/events', city: 'Tifton', state: 'GA', zipCode: '31794', county: 'Tifton County'},
  { name: 'Toccoa-Stephens County Public Library', url: 'https://www.toccoalibrary.org', eventsUrl: 'https://www.toccoalibrary.org/events', city: 'Toccoa', state: 'GA', zipCode: '00000', county: 'Toccoa County'},
  { name: 'Dade County Public Library', url: 'https://www.trentonlibrary.org', eventsUrl: 'https://www.trentonlibrary.org/events', city: 'Trenton', state: 'GA', zipCode: '00000', county: 'Trenton County'},
  { name: 'Trion Public Library', url: 'https://www.trionlibrary.org', eventsUrl: 'https://www.trionlibrary.org/events', city: 'Trion', state: 'GA', zipCode: '00000', county: 'Trion County'},
  { name: 'Northlake-Barbara Loar Branch', url: 'https://www.tuckerlibrary.org', eventsUrl: 'https://www.tuckerlibrary.org/events', city: 'Tucker', state: 'GA', zipCode: '00000', county: 'Tucker County'},
  { name: 'Tybee', url: 'https://www.tybeeislandlibrary.org', eventsUrl: 'https://www.tybeeislandlibrary.org/events', city: 'Tybee Island', state: 'GA', zipCode: '00000', county: 'Tybee Island County'},
  { name: 'Tyrone Public Library', url: 'https://www.tyronelibrary.org', eventsUrl: 'https://www.tyronelibrary.org/events', city: 'Tyrone', state: 'GA', zipCode: '00000', county: 'Tyrone County'},
  { name: 'Elizabeth Harris Library', url: 'https://www.unadillalibrary.org', eventsUrl: 'https://www.unadillalibrary.org/events', city: 'Unadilla', state: 'GA', zipCode: '00000', county: 'Unadilla County'},
  { name: 'South Fulton Regional', url: 'https://www.unioncitylibrary.org', eventsUrl: 'https://www.unioncitylibrary.org/events', city: 'Union City', state: 'GA', zipCode: '00000', county: 'Union City County'},
  { name: 'Mccullen Southside Library', url: 'https://www.valdostalibrary.org', eventsUrl: 'https://www.valdostalibrary.org/events', city: 'Valdosta', state: 'GA', zipCode: '00000', county: 'Valdosta County'},
  { name: 'Ladson Genealogy Library', url: 'https://www.vidalialibrary.org', eventsUrl: 'https://www.vidalialibrary.org/events', city: 'Vidalia', state: 'GA', zipCode: '00000', county: 'Vidalia County'},
  { name: 'Dooly County Library', url: 'https://www.viennalibrary.org', eventsUrl: 'https://www.viennalibrary.org/events', city: 'Vienna', state: 'GA', zipCode: '00000', county: 'Vienna County'},
  { name: 'Villa Rica Public Library', url: 'https://www.villaricalibrary.org', eventsUrl: 'https://www.villaricalibrary.org/events', city: 'Villa Rica', state: 'GA', zipCode: '00000', county: 'Villa Rica County'},
  { name: 'Wadley Public Library', url: 'https://www.wadleylibrary.org', eventsUrl: 'https://www.wadleylibrary.org/events', city: 'Wadley', state: 'GA', zipCode: '00000', county: 'Wadley County'},
  { name: 'Nola Brantley Memorial Library', url: 'https://www.warnerrobinslibrary.org', eventsUrl: 'https://www.warnerrobinslibrary.org/events', city: 'Warner Robins', state: 'GA', zipCode: '00000', county: 'Warner Robins County'},
  { name: 'Warren County Public Library', url: 'https://www.warrentonlibrary.org', eventsUrl: 'https://www.warrentonlibrary.org/events', city: 'Warrenton', state: 'GA', zipCode: '00000', county: 'Warrenton County'},
  { name: 'Warwick City Library', url: 'https://www.warwicklibrary.org', eventsUrl: 'https://www.warwicklibrary.org/events', city: 'Warwick', state: 'GA', zipCode: '00000', county: 'Warwick County'},
  { name: 'Bartram Trail Regional Library System', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'GA', zipCode: '30673', county: 'Washington County'},
  { name: 'Okefenokee Regional Library System', url: 'https://www.waycrosslibrary.org', eventsUrl: 'https://www.waycrosslibrary.org/events', city: 'Waycross', state: 'GA', zipCode: '31501', county: 'Waycross County'},
  { name: 'Burke County Library', url: 'https://www.waynesborolibrary.org', eventsUrl: 'https://www.waynesborolibrary.org/events', city: 'Waynesboro', state: 'GA', zipCode: '00000', county: 'Waynesboro County'},
  { name: 'Willacoochee Public Library', url: 'https://www.willacoocheelibrary.org', eventsUrl: 'https://www.willacoocheelibrary.org/events', city: 'Willacoochee', state: 'GA', zipCode: '00000', county: 'Willacoochee County'},
  { name: 'Piedmont Regional Library System', url: 'https://www.winderlibrary.org', eventsUrl: 'https://www.winderlibrary.org/events', city: 'Winder', state: 'GA', zipCode: '30680', county: 'Winder County'},
  { name: 'Winterville Branch Library', url: 'https://www.wintervillelibrary.org', eventsUrl: 'https://www.wintervillelibrary.org/events', city: 'Winterville', state: 'GA', zipCode: '00000', county: 'Winterville County'},
  { name: 'Woodstock Public Library', url: 'https://www.woodstocklibrary.org', eventsUrl: 'https://www.woodstocklibrary.org/events', city: 'Woodstock', state: 'GA', zipCode: '00000', county: 'Woodstock County'},
  { name: 'Rose Creek Public Library', url: 'https://www.wookstocklibrary.org', eventsUrl: 'https://www.wookstocklibrary.org/events', city: 'Wookstock', state: 'GA', zipCode: '00000', county: 'Wookstock County'},
  { name: 'Mccollum Public Library', url: 'https://www.wrenslibrary.org', eventsUrl: 'https://www.wrenslibrary.org/events', city: 'Wrens', state: 'GA', zipCode: '00000', county: 'Wrens County'},
  { name: 'Harlie Fulford Memorial Library', url: 'https://www.wrightsvillelibrary.org', eventsUrl: 'https://www.wrightsvillelibrary.org/events', city: 'Wrightsville', state: 'GA', zipCode: '00000', county: 'Wrightsville County'},
  { name: 'Yatesville Public Library', url: 'https://www.yatesvillelibrary.org', eventsUrl: 'https://www.yatesvillelibrary.org/events', city: 'Yatesville', state: 'GA', zipCode: '00000', county: 'Yatesville County'},
  { name: 'Mountain Regional Library System', url: 'https://www.youngharrislibrary.org', eventsUrl: 'https://www.youngharrislibrary.org/events', city: 'Young Harris', state: 'GA', zipCode: '30582', county: 'Young Harris County'},
  { name: 'J. Joel Edwards Public Library', url: 'https://www.zebulonlibrary.org', eventsUrl: 'https://www.zebulonlibrary.org/events', city: 'Zebulon', state: 'GA', zipCode: '00000', county: 'Zebulon County'}
];

const SCRAPER_NAME = 'wordpress-GA';

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
            state: 'GA',
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
    state: 'GA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Georgia Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressGACloudFunction() {
  console.log('☁️ Running WordPress GA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-GA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-GA', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressGACloudFunction };
