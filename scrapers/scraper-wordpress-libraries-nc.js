const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * North Carolina Public Libraries Scraper - Coverage: All North Carolina public libraries
 */
const LIBRARIES = [
  { name: 'Page Memorial Library', url: 'https://www.aberdeenlibrary.org', eventsUrl: 'https://www.aberdeenlibrary.org/events', city: 'Aberdeen', state: 'NC', zipCode: '00000', county: 'Aberdeen County'},
  { name: 'Ahoskie Public Library', url: 'https://www.ahoskielibrary.org', eventsUrl: 'https://www.ahoskielibrary.org/events', city: 'Ahoskie', state: 'NC', zipCode: '00000', county: 'Ahoskie County'},
  { name: 'Stanly County Public Library', url: 'https://www.albemarlelibrary.org', eventsUrl: 'https://www.albemarlelibrary.org/events', city: 'Albemarle', state: 'NC', zipCode: '28001', county: 'Albemarle County'},
  { name: 'Andrews Public Library', url: 'https://www.andrewslibrary.org', eventsUrl: 'https://www.andrewslibrary.org/events', city: 'Andrews', state: 'NC', zipCode: '00000', county: 'Andrews County'},
  { name: 'Angier Public Library', url: 'https://www.angierlibrary.org', eventsUrl: 'https://www.angierlibrary.org/events', city: 'Angier', state: 'NC', zipCode: '00000', county: 'Angier County'},
  { name: 'Eva Perry Regional Library', url: 'https://www.apexlibrary.org', eventsUrl: 'https://www.apexlibrary.org/events', city: 'Apex', state: 'NC', zipCode: '00000', county: 'Apex County'},
  { name: 'Archdale Public Library', url: 'https://www.archdalelibrary.org', eventsUrl: 'https://www.archdalelibrary.org/events', city: 'Archdale', state: 'NC', zipCode: '00000', county: 'Archdale County'},
  { name: 'Asheboro Public Library', url: 'https://www.asheborolibrary.org', eventsUrl: 'https://www.asheborolibrary.org/events', city: 'Asheboro', state: 'NC', zipCode: '00000', county: 'Asheboro County'},
  { name: 'Buncombe County Law Library', url: 'https://www.ashevillelibrary.org', eventsUrl: 'https://www.ashevillelibrary.org/events', city: 'Asheville', state: 'NC', zipCode: '28801', county: 'Asheville County'},
  { name: 'Sallie H. Jenkins Memorial Library', url: 'https://www.aulanderlibrary.org', eventsUrl: 'https://www.aulanderlibrary.org/events', city: 'Aulander', state: 'NC', zipCode: '00000', county: 'Aulander County'},
  { name: 'Hazel W. Guilford Memorial Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'NC', zipCode: '00000', county: 'Aurora County'},
  { name: 'Badin Branch Library', url: 'https://www.badinlibrary.org', eventsUrl: 'https://www.badinlibrary.org/events', city: 'Badin', state: 'NC', zipCode: '00000', county: 'Badin County'},
  { name: 'Mitchell County Library', url: 'https://www.bakersvillelibrary.org', eventsUrl: 'https://www.bakersvillelibrary.org/events', city: 'Bakersville', state: 'NC', zipCode: '00000', county: 'Bakersville County'},
  { name: 'Currituck County Library', url: 'https://www.barcolibrary.org', eventsUrl: 'https://www.barcolibrary.org/events', city: 'Barco', state: 'NC', zipCode: '00000', county: 'Barco County'},
  { name: 'Bath Community Library', url: 'https://www.bathlibrary.org', eventsUrl: 'https://www.bathlibrary.org/events', city: 'Bath', state: 'NC', zipCode: '00000', county: 'Bath County'},
  { name: 'Pamlico County Library', url: 'https://www.bayborolibrary.org', eventsUrl: 'https://www.bayborolibrary.org/events', city: 'Bayboro', state: 'NC', zipCode: '00000', county: 'Bayboro County'},
  { name: 'Carteret County Public Library', url: 'https://www.beaufortlibrary.org', eventsUrl: 'https://www.beaufortlibrary.org/events', city: 'Beaufort', state: 'NC', zipCode: '28516', county: 'Beaufort County'},
  { name: 'Belhaven Public Library', url: 'https://www.belhavenlibrary.org', eventsUrl: 'https://www.belhavenlibrary.org/events', city: 'Belhaven', state: 'NC', zipCode: '00000', county: 'Belhaven County'},
  { name: 'Belmont Branch Library', url: 'https://www.belmontlibrary.org', eventsUrl: 'https://www.belmontlibrary.org/events', city: 'Belmont', state: 'NC', zipCode: '00000', county: 'Belmont County'},
  { name: 'Mary Duncan Public Library', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'NC', zipCode: '00000', county: 'Benson County'},
  { name: 'Bessemer City Branch Library', url: 'https://www.bessemercitylibrary.org', eventsUrl: 'https://www.bessemercitylibrary.org/events', city: 'Bessemer City', state: 'NC', zipCode: '00000', county: 'Bessemer City County'},
  { name: 'Margaret Little Blount Library', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'NC', zipCode: '00000', county: 'Bethel County'},
  { name: 'Phillip Leff Memorial Library', url: 'https://www.beulavillelibrary.org', eventsUrl: 'https://www.beulavillelibrary.org/events', city: 'Beulaville', state: 'NC', zipCode: '00000', county: 'Beulaville County'},
  { name: 'Biscoe Branch Library (Allen Library)', url: 'https://www.biscoelibrary.org', eventsUrl: 'https://www.biscoelibrary.org/events', city: 'Biscoe', state: 'NC', zipCode: '00000', county: 'Biscoe County'},
  { name: 'Black Creek Branch Library', url: 'https://www.blackcreeklibrary.org', eventsUrl: 'https://www.blackcreeklibrary.org/events', city: 'Black Creek', state: 'NC', zipCode: '00000', county: 'Black Creek County'},
  { name: 'Black Mountain Branch Library', url: 'https://www.blackmountainlibrary.org', eventsUrl: 'https://www.blackmountainlibrary.org/events', city: 'Black Mountain', state: 'NC', zipCode: '28711', county: 'Black Mountain County'},
  { name: 'Bridger Memorial Library', url: 'https://www.bladenborolibrary.org', eventsUrl: 'https://www.bladenborolibrary.org/events', city: 'Bladenboro', state: 'NC', zipCode: '00000', county: 'Bladenboro County'},
  { name: 'Watauga County Public Library', url: 'https://www.boonelibrary.org', eventsUrl: 'https://www.boonelibrary.org/events', city: 'Boone', state: 'NC', zipCode: '00000', county: 'Boone County'},
  { name: 'Boonville Community Public Library', url: 'https://www.boonvillelibrary.org', eventsUrl: 'https://www.boonvillelibrary.org/events', city: 'Boonville', state: 'NC', zipCode: '00000', county: 'Boonville County'},
  { name: 'Transylvania County Library', url: 'https://www.brevardlibrary.org', eventsUrl: 'https://www.brevardlibrary.org/events', city: 'Brevard', state: 'NC', zipCode: '28712', county: 'Brevard County'},
  { name: 'Broadway Branch Library', url: 'https://www.broadwaylibrary.org', eventsUrl: 'https://www.broadwaylibrary.org/events', city: 'Broadway', state: 'NC', zipCode: '00000', county: 'Broadway County'},
  { name: 'Fontana Regional Library', url: 'https://www.brysoncitylibrary.org', eventsUrl: 'https://www.brysoncitylibrary.org/events', city: 'Bryson City', state: 'NC', zipCode: '28713', county: 'Bryson City County'},
  { name: 'Bunn Branch Library', url: 'https://www.bunnlibrary.org', eventsUrl: 'https://www.bunnlibrary.org/events', city: 'Bunn', state: 'NC', zipCode: '00000', county: 'Bunn County'},
  { name: 'Anderson Creek Public Library', url: 'https://www.bunnlevellibrary.org', eventsUrl: 'https://www.bunnlevellibrary.org/events', city: 'Bunnlevel', state: 'NC', zipCode: '00000', county: 'Bunnlevel County'},
  { name: 'Pender County Public Library', url: 'https://www.burgawlibrary.org', eventsUrl: 'https://www.burgawlibrary.org/events', city: 'Burgaw', state: 'NC', zipCode: '28425', county: 'Burgaw County'},
  { name: 'Alamance County Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'NC', zipCode: '27215', county: 'Burlington County'},
  { name: 'Avery-Mitchell-Yancey Regional Library', url: 'https://www.burnsvillelibrary.org', eventsUrl: 'https://www.burnsvillelibrary.org/events', city: 'Burnsville', state: 'NC', zipCode: '28714', county: 'Burnsville County'},
  { name: 'Enka-Candler', url: 'https://www.candlerlibrary.org', eventsUrl: 'https://www.candlerlibrary.org/events', city: 'Candler', state: 'NC', zipCode: '28715', county: 'Candler County'},
  { name: 'Currie Memorial Library', url: 'https://www.candorlibrary.org', eventsUrl: 'https://www.candorlibrary.org/events', city: 'Candor', state: 'NC', zipCode: '00000', county: 'Candor County'},
  { name: 'Canton Branch Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'NC', zipCode: '00000', county: 'Canton County'},
  { name: 'Carolina Beach Library', url: 'https://www.carolinabeachlibrary.org', eventsUrl: 'https://www.carolinabeachlibrary.org/events', city: 'Carolina Beach', state: 'NC', zipCode: '00000', county: 'Carolina Beach County'},
  { name: 'Carrboro Branch Library', url: 'https://www.carrborolibrary.org', eventsUrl: 'https://www.carrborolibrary.org/events', city: 'Carrboro', state: 'NC', zipCode: '00000', county: 'Carrboro County'},
  { name: 'Moore County Library', url: 'https://www.carthagelibrary.org', eventsUrl: 'https://www.carthagelibrary.org/events', city: 'Carthage', state: 'NC', zipCode: '00000', county: 'Carthage County'},
  { name: 'Cary Branch Library', url: 'https://www.carylibrary.org', eventsUrl: 'https://www.carylibrary.org/events', city: 'Cary', state: 'NC', zipCode: '00000', county: 'Cary County'},
  { name: 'Albert Carlton-Cashiers Community Library', url: 'https://www.cashierslibrary.org', eventsUrl: 'https://www.cashierslibrary.org/events', city: 'Cashiers', state: 'NC', zipCode: '00000', county: 'Cashiers County'},
  { name: 'Chadbourn Community Library', url: 'https://www.chadbournlibrary.org', eventsUrl: 'https://www.chadbournlibrary.org/events', city: 'Chadbourn', state: 'NC', zipCode: '00000', county: 'Chadbourn County'},
  { name: 'Chapel Hill Public Library', url: 'https://www.chapelhilllibrary.org', eventsUrl: 'https://www.chapelhilllibrary.org/events', city: 'Chapel Hill', state: 'NC', zipCode: '27514', county: 'Chapel Hill County'},
  { name: 'Beatties Ford Road Branch Library', url: 'https://www.charlottelibrary.org', eventsUrl: 'https://www.charlottelibrary.org/events', city: 'Charlotte', state: 'NC', zipCode: '00000', county: 'Charlotte County'},
  { name: 'Cherryville Branch Library', url: 'https://www.cherryvillelibrary.org', eventsUrl: 'https://www.cherryvillelibrary.org/events', city: 'Cherryville', state: 'NC', zipCode: '00000', county: 'Cherryville County'},
  { name: 'Claremont Branch Library', url: 'https://www.claremontlibrary.org', eventsUrl: 'https://www.claremontlibrary.org/events', city: 'Claremont', state: 'NC', zipCode: '00000', county: 'Claremont County'},
  { name: 'Clarkton Public Library', url: 'https://www.clarktonlibrary.org', eventsUrl: 'https://www.clarktonlibrary.org/events', city: 'Clarkton', state: 'NC', zipCode: '00000', county: 'Clarkton County'},
  { name: 'Hocutt Ellington Memorial Library', url: 'https://www.claytonlibrary.org', eventsUrl: 'https://www.claytonlibrary.org/events', city: 'Clayton', state: 'NC', zipCode: '00000', county: 'Clayton County'},
  { name: 'Clemmons Branch Library', url: 'https://www.clemmonslibrary.org', eventsUrl: 'https://www.clemmonslibrary.org/events', city: 'Clemmons', state: 'NC', zipCode: '00000', county: 'Clemmons County'},
  { name: 'J.C. Holliday Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'NC', zipCode: '00000', county: 'Clinton County'},
  { name: 'Coats Public Library', url: 'https://www.coatslibrary.org', eventsUrl: 'https://www.coatslibrary.org/events', city: 'Coats', state: 'NC', zipCode: '00000', county: 'Coats County'},
  { name: 'Tyrrell County Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'NC', zipCode: '00000', county: 'Columbia County'},
  { name: 'Polk County Public Library', url: 'https://www.columbuslibrary.org', eventsUrl: 'https://www.columbuslibrary.org/events', city: 'Columbus', state: 'NC', zipCode: '28722', county: 'Columbus County'},
  { name: 'Cabarrus County Public Library', url: 'https://www.concordlibrary.org', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'NC', zipCode: '28025', county: 'Concord County'},
  { name: 'Conover Express Branch Library', url: 'https://www.conoverlibrary.org', eventsUrl: 'https://www.conoverlibrary.org/events', city: 'Conover', state: 'NC', zipCode: '00000', county: 'Conover County'},
  { name: 'Cooleemee Branch Library', url: 'https://www.cooleemeelibrary.org', eventsUrl: 'https://www.cooleemeelibrary.org/events', city: 'Cooleemee', state: 'NC', zipCode: '00000', county: 'Cooleemee County'},
  { name: 'Cornelius Branch Library', url: 'https://www.corneliuslibrary.org', eventsUrl: 'https://www.corneliuslibrary.org/events', city: 'Cornelius', state: 'NC', zipCode: '00000', county: 'Cornelius County'},
  { name: 'Corolla Branch Library', url: 'https://www.corollalibrary.org', eventsUrl: 'https://www.corollalibrary.org/events', city: 'Corolla', state: 'NC', zipCode: '00000', county: 'Corolla County'},
  { name: 'Cove City-Craven County Public Library', url: 'https://www.covecitylibrary.org', eventsUrl: 'https://www.covecitylibrary.org/events', city: 'Cove City', state: 'NC', zipCode: '00000', county: 'Cove City County'},
  { name: 'South Branch Library', url: 'https://www.creedmoorlibrary.org', eventsUrl: 'https://www.creedmoorlibrary.org/events', city: 'Creedmoor', state: 'NC', zipCode: '00000', county: 'Creedmoor County'},
  { name: 'Dallas Branch Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'NC', zipCode: '00000', county: 'Dallas County'},
  { name: 'Danbury Public Library', url: 'https://www.danburylibrary.org', eventsUrl: 'https://www.danburylibrary.org/events', city: 'Danbury', state: 'NC', zipCode: '00000', county: 'Danbury County'},
  { name: 'Denton Public Library', url: 'https://www.dentonlibrary.org', eventsUrl: 'https://www.dentonlibrary.org/events', city: 'Denton', state: 'NC', zipCode: '00000', county: 'Denton County'},
  { name: 'Florence S. Shanklin Branch Library', url: 'https://www.denverlibrary.org', eventsUrl: 'https://www.denverlibrary.org/events', city: 'Denver', state: 'NC', zipCode: '00000', county: 'Denver County'},
  { name: 'Dobson Community Library', url: 'https://www.dobsonlibrary.org', eventsUrl: 'https://www.dobsonlibrary.org/events', city: 'Dobson', state: 'NC', zipCode: '00000', county: 'Dobson County'},
  { name: 'Dunn Public Library', url: 'https://www.dunnlibrary.org', eventsUrl: 'https://www.dunnlibrary.org/events', city: 'Dunn', state: 'NC', zipCode: '00000', county: 'Dunn County'},
  { name: 'Bragtown Branch Library', url: 'https://www.durhamlibrary.org', eventsUrl: 'https://www.durhamlibrary.org/events', city: 'Durham', state: 'NC', zipCode: '00000', county: 'Durham County'},
  { name: 'East Bend Public Library', url: 'https://www.eastbendlibrary.org', eventsUrl: 'https://www.eastbendlibrary.org/events', city: 'East Bend', state: 'NC', zipCode: '00000', county: 'East Bend County'},
  { name: 'Eden Branch Library', url: 'https://www.edenlibrary.org', eventsUrl: 'https://www.edenlibrary.org/events', city: 'Eden', state: 'NC', zipCode: '00000', county: 'Eden County'},
  { name: 'Shepard-Pruden Memorial Library', url: 'https://www.edentonlibrary.org', eventsUrl: 'https://www.edentonlibrary.org/events', city: 'Edenton', state: 'NC', zipCode: '00000', county: 'Edenton County'},
  { name: 'Edneyville Branch Library', url: 'https://www.edneyvillelibrary.org', eventsUrl: 'https://www.edneyvillelibrary.org/events', city: 'Edneyville', state: 'NC', zipCode: '00000', county: 'Edneyville County'},
  { name: 'East Albemarle Regional Library', url: 'https://www.elizabethcitylibrary.org', eventsUrl: 'https://www.elizabethcitylibrary.org/events', city: 'Elizabeth City', state: 'NC', zipCode: '27909', county: 'Elizabeth City County'},
  { name: 'Bladen County Public Library', url: 'https://www.elizabethtownlibrary.org', eventsUrl: 'https://www.elizabethtownlibrary.org/events', city: 'Elizabethtown', state: 'NC', zipCode: '28337', county: 'Elizabethtown County'},
  { name: 'Elkin Public Library', url: 'https://www.elkinlibrary.org', eventsUrl: 'https://www.elkinlibrary.org/events', city: 'Elkin', state: 'NC', zipCode: '00000', county: 'Elkin County'},
  { name: 'Kemp Sugg Memorial Library', url: 'https://www.ellerbelibrary.org', eventsUrl: 'https://www.ellerbelibrary.org/events', city: 'Ellerbe', state: 'NC', zipCode: '00000', county: 'Ellerbe County'},
  { name: 'Elm City Branch', url: 'https://www.elmcitylibrary.org', eventsUrl: 'https://www.elmcitylibrary.org/events', city: 'Elm City', state: 'NC', zipCode: '00000', county: 'Elm City County'},
  { name: 'Emerald Isle Library', url: 'https://www.emeraldislelibrary.org', eventsUrl: 'https://www.emeraldislelibrary.org/events', city: 'Emerald Isle', state: 'NC', zipCode: '00000', county: 'Emerald Isle County'},
  { name: 'Enka Branch Library', url: 'https://www.enkalibrary.org', eventsUrl: 'https://www.enkalibrary.org/events', city: 'Enka', state: 'NC', zipCode: '00000', county: 'Enka County'},
  { name: 'Erwin Public Library', url: 'https://www.erwinlibrary.org', eventsUrl: 'https://www.erwinlibrary.org/events', city: 'Erwin', state: 'NC', zipCode: '00000', county: 'Erwin County'},
  { name: 'Etowah Branch Library', url: 'https://www.etowahlibrary.org', eventsUrl: 'https://www.etowahlibrary.org/events', city: 'Etowah', state: 'NC', zipCode: '00000', county: 'Etowah County'},
  { name: 'Fair Bluff Community Library', url: 'https://www.fairblufflibrary.org', eventsUrl: 'https://www.fairblufflibrary.org/events', city: 'Fair Bluff', state: 'NC', zipCode: '00000', county: 'Fair Bluff County'},
  { name: 'Hector Maclean Public Library', url: 'https://www.fairmontlibrary.org', eventsUrl: 'https://www.fairmontlibrary.org/events', city: 'Fairmont', state: 'NC', zipCode: '00000', county: 'Fairmont County'},
  { name: 'Fairview Branch Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'NC', zipCode: '00000', county: 'Fairview County'},
  { name: 'Faison Branch Library (Emily Hill Library)', url: 'https://www.faisonlibrary.org', eventsUrl: 'https://www.faisonlibrary.org/events', city: 'Faison', state: 'NC', zipCode: '00000', county: 'Faison County'},
  { name: 'Farmville Public Library', url: 'https://www.farmvillelibrary.org', eventsUrl: 'https://www.farmvillelibrary.org/events', city: 'Farmville', state: 'NC', zipCode: '27828', county: 'Farmville County'},
  { name: 'Bordeaux Branch Library', url: 'https://www.fayettevillelibrary.org', eventsUrl: 'https://www.fayettevillelibrary.org/events', city: 'Fayetteville', state: 'NC', zipCode: '00000', county: 'Fayetteville County'},
  { name: 'Fletcher Branch Library', url: 'https://www.fletcherlibrary.org', eventsUrl: 'https://www.fletcherlibrary.org/events', city: 'Fletcher', state: 'NC', zipCode: '00000', county: 'Fletcher County'},
  { name: 'James Bryan Creech Library', url: 'https://www.fouroakslibrary.org', eventsUrl: 'https://www.fouroakslibrary.org/events', city: 'Four Oaks', state: 'NC', zipCode: '00000', county: 'Four Oaks County'},
  { name: 'Macon County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'NC', zipCode: '00000', county: 'Franklin County'},
  { name: 'Franklinton Public Library', url: 'https://www.franklintonlibrary.org', eventsUrl: 'https://www.franklintonlibrary.org/events', city: 'Franklinton', state: 'NC', zipCode: '00000', county: 'Franklinton County'},
  { name: 'John W. Clark Public Library', url: 'https://www.franklinvillelibrary.org', eventsUrl: 'https://www.franklinvillelibrary.org/events', city: 'Franklinville', state: 'NC', zipCode: '00000', county: 'Franklinville County'},
  { name: 'Wayne County Public Library, Fremont', url: 'https://www.fremontlibrary.org', eventsUrl: 'https://www.fremontlibrary.org/events', city: 'Fremont', state: 'NC', zipCode: '00000', county: 'Fremont County'},
  { name: 'Fuquay-Varina Library', url: 'https://www.fuquayvarinalibrary.org', eventsUrl: 'https://www.fuquayvarinalibrary.org/events', city: 'Fuquay-Varina', state: 'NC', zipCode: '00000', county: 'Fuquay-Varina County'},
  { name: 'Miriam B. Lamb Memorial Library', url: 'https://www.garlandlibrary.org', eventsUrl: 'https://www.garlandlibrary.org/events', city: 'Garland', state: 'NC', zipCode: '00000', county: 'Garland County'},
  { name: 'Southeast Regional Library', url: 'https://www.garnerlibrary.org', eventsUrl: 'https://www.garnerlibrary.org/events', city: 'Garner', state: 'NC', zipCode: '00000', county: 'Garner County'},
  { name: 'Ferguson Branch Library - Erwin Center', url: 'https://www.gastonialibrary.org', eventsUrl: 'https://www.gastonialibrary.org/events', city: 'Gastonia', state: 'NC', zipCode: '00000', county: 'Gastonia County'},
  { name: 'Gates County Library', url: 'https://www.gatesvillelibrary.org', eventsUrl: 'https://www.gatesvillelibrary.org/events', city: 'Gatesville', state: 'NC', zipCode: '00000', county: 'Gatesville County'},
  { name: 'Wayne County Public Library, Goldsboro', url: 'https://www.goldsborolibrary.org', eventsUrl: 'https://www.goldsborolibrary.org/events', city: 'Goldsboro', state: 'NC', zipCode: '27530', county: 'Goldsboro County'},
  { name: 'Goldston Public Library', url: 'https://www.goldstonlibrary.org', eventsUrl: 'https://www.goldstonlibrary.org/events', city: 'Goldston', state: 'NC', zipCode: '27252', county: 'Goldston County'},
  { name: 'Graham Public Library', url: 'https://www.grahamlibrary.org', eventsUrl: 'https://www.grahamlibrary.org/events', city: 'Graham', state: 'NC', zipCode: '00000', county: 'Graham County'},
  { name: 'Granite Falls Branch Library', url: 'https://www.granitefallslibrary.org', eventsUrl: 'https://www.granitefallslibrary.org/events', city: 'Granite Falls', state: 'NC', zipCode: '00000', county: 'Granite Falls County'},
  { name: 'Blanche Benjamin Branch Library', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'NC', zipCode: '00000', county: 'Greensboro County'},
  { name: 'Carver Branch Library', url: 'https://www.greenvillelibrary.org', eventsUrl: 'https://www.greenvillelibrary.org/events', city: 'Greenville', state: 'NC', zipCode: '00000', county: 'Greenville County'},
  { name: 'Halifax County Library System', url: 'https://www.halifaxlibrary.org', eventsUrl: 'https://www.halifaxlibrary.org/events', city: 'Halifax', state: 'NC', zipCode: '27839', county: 'Halifax County'},
  { name: 'Hamlet Public Library', url: 'https://www.hamletlibrary.org', eventsUrl: 'https://www.hamletlibrary.org/events', city: 'Hamlet', state: 'NC', zipCode: '00000', county: 'Hamlet County'},
  { name: 'Hampstead Branch Library', url: 'https://www.hampsteadlibrary.org', eventsUrl: 'https://www.hampsteadlibrary.org/events', city: 'Hampstead', state: 'NC', zipCode: '00000', county: 'Hampstead County'},
  { name: 'Harmony Branch Library', url: 'https://www.harmonylibrary.org', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Harmony', state: 'NC', zipCode: '00000', county: 'Harmony County'},
  { name: 'Harrisburg Library', url: 'https://www.harrisburglibrary.org', eventsUrl: 'https://www.harrisburglibrary.org/events', city: 'Harrisburg', state: 'NC', zipCode: '00000', county: 'Harrisburg County'},
  { name: 'Hatteras Branch Library', url: 'https://www.hatteraslibrary.org', eventsUrl: 'https://www.hatteraslibrary.org/events', city: 'Hatteras', state: 'NC', zipCode: '00000', county: 'Hatteras County'},
  { name: 'Havelock-Craven County Public', url: 'https://www.havelocklibrary.org', eventsUrl: 'https://www.havelocklibrary.org/events', city: 'Havelock', state: 'NC', zipCode: '00000', county: 'Havelock County'},
  { name: 'Moss Memorial Library', url: 'https://www.hayesvillelibrary.org', eventsUrl: 'https://www.hayesvillelibrary.org/events', city: 'Hayesville', state: 'NC', zipCode: '00000', county: 'Hayesville County'},
  { name: 'H. Leslie Perry Memorial Library', url: 'https://www.hendersonlibrary.org', eventsUrl: 'https://www.hendersonlibrary.org/events', city: 'Henderson', state: 'NC', zipCode: '27536', county: 'Henderson County'},
  { name: 'Henderson County Public Library', url: 'https://www.hendersonvillelibrary.org', eventsUrl: 'https://www.hendersonvillelibrary.org/events', city: 'Hendersonville', state: 'NC', zipCode: '28739', county: 'Hendersonville County'},
  { name: 'Haynes Public Library', url: 'https://www.henriettalibrary.org', eventsUrl: 'https://www.henriettalibrary.org/events', city: 'Henrietta', state: 'NC', zipCode: '00000', county: 'Henrietta County'},
  { name: 'Perquimans County Library', url: 'https://www.hertfordlibrary.org', eventsUrl: 'https://www.hertfordlibrary.org/events', city: 'Hertford', state: 'NC', zipCode: '00000', county: 'Hertford County'},
  { name: 'Hickory Public Library', url: 'https://www.hickorylibrary.org', eventsUrl: 'https://www.hickorylibrary.org/events', city: 'Hickory', state: 'NC', zipCode: '28601', county: 'Hickory County'},
  { name: 'High Point Public Library', url: 'https://www.highpointlibrary.org', eventsUrl: 'https://www.highpointlibrary.org/events', city: 'High Point', state: 'NC', zipCode: '27262', county: 'High Point County'},
  { name: 'Hudson Library', url: 'https://www.highlandslibrary.org', eventsUrl: 'https://www.highlandslibrary.org/events', city: 'Highlands', state: 'NC', zipCode: '00000', county: 'Highlands County'},
  { name: 'C B Hildebrand Public Library', url: 'https://www.hildebranlibrary.org', eventsUrl: 'https://www.hildebranlibrary.org/events', city: 'Hildebran', state: 'NC', zipCode: '00000', county: 'Hildebran County'},
  { name: 'Hyconeechee Regional Library', url: 'https://www.hillsboroughlibrary.org', eventsUrl: 'https://www.hillsboroughlibrary.org/events', city: 'Hillsborough', state: 'NC', zipCode: '27278', county: 'Hillsborough County'},
  { name: 'Hope Mills Branch Library', url: 'https://www.hopemillslibrary.org', eventsUrl: 'https://www.hopemillslibrary.org/events', city: 'Hope Mills', state: 'NC', zipCode: '00000', county: 'Hope Mills County'},
  { name: 'Hot Springs Branch Library', url: 'https://www.hotspringslibrary.org', eventsUrl: 'https://www.hotspringslibrary.org/events', city: 'Hot Springs', state: 'NC', zipCode: '00000', county: 'Hot Springs County'},
  { name: 'Hudson Branch Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'NC', zipCode: '00000', county: 'Hudson County'},
  { name: 'North County Regional Branch Library', url: 'https://www.huntersvillelibrary.org', eventsUrl: 'https://www.huntersvillelibrary.org/events', city: 'Huntersville', state: 'NC', zipCode: '00000', county: 'Huntersville County'},
  { name: 'Union West Branch Library', url: 'https://www.indiantraillibrary.org', eventsUrl: 'https://www.indiantraillibrary.org/events', city: 'Indian Trail', state: 'NC', zipCode: '00000', county: 'Indian Trail County'},
  { name: 'Northampton County Memorial Library', url: 'https://www.jacksonlibrary.org', eventsUrl: 'https://www.jacksonlibrary.org/events', city: 'Jackson', state: 'NC', zipCode: '00000', county: 'Jackson County'},
  { name: 'Onslow County Public Library', url: 'https://www.jacksonvillelibrary.org', eventsUrl: 'https://www.jacksonvillelibrary.org/events', city: 'Jacksonville', state: 'NC', zipCode: '28540', county: 'Jacksonville County'},
  { name: 'Jonesville Public Library', url: 'https://www.jonesvillelibrary.org', eventsUrl: 'https://www.jonesvillelibrary.org/events', city: 'Jonesville', state: 'NC', zipCode: '00000', county: 'Jonesville County'},
  { name: 'Kannapolis Branch Library', url: 'https://www.kannapolislibrary.org', eventsUrl: 'https://www.kannapolislibrary.org/events', city: 'Kannapolis', state: 'NC', zipCode: '00000', county: 'Kannapolis County'},
  { name: 'Duplin County Library', url: 'https://www.kenansvillelibrary.org', eventsUrl: 'https://www.kenansvillelibrary.org/events', city: 'Kenansville', state: 'NC', zipCode: '28349', county: 'Kenansville County'},
  { name: 'Kenly Public Library', url: 'https://www.kenlylibrary.org', eventsUrl: 'https://www.kenlylibrary.org/events', city: 'Kenly', state: 'NC', zipCode: '00000', county: 'Kenly County'},
  { name: 'Kernersville Branch Library', url: 'https://www.kernersvillelibrary.org', eventsUrl: 'https://www.kernersvillelibrary.org/events', city: 'Kernersville', state: 'NC', zipCode: '00000', county: 'Kernersville County'},
  { name: 'Kill Devil Hills Branch Library', url: 'https://www.killdevilhillslibrary.org', eventsUrl: 'https://www.killdevilhillslibrary.org/events', city: 'Kill Devil Hills', state: 'NC', zipCode: '00000', county: 'Kill Devil Hills County'},
  { name: 'King Public Library', url: 'https://www.kinglibrary.org', eventsUrl: 'https://www.kinglibrary.org/events', city: 'King', state: 'NC', zipCode: '00000', county: 'King County'},
  { name: 'Jacob Mauney Memorial Library', url: 'https://www.kingsmountainlibrary.org', eventsUrl: 'https://www.kingsmountainlibrary.org/events', city: 'Kings Mountain', state: 'NC', zipCode: '28086', county: 'Kings Mountain County'},
  { name: 'Kinston-Lenoir County Public Library', url: 'https://www.kinstonlibrary.org', eventsUrl: 'https://www.kinstonlibrary.org/events', city: 'Kinston', state: 'NC', zipCode: '00000', county: 'Kinston County'},
  { name: 'East Regional Library', url: 'https://www.knightdalelibrary.org', eventsUrl: 'https://www.knightdalelibrary.org/events', city: 'Knightdale', state: 'NC', zipCode: '00000', county: 'Knightdale County'},
  { name: 'La Grange Branch Library', url: 'https://www.lagrangelibrary.org', eventsUrl: 'https://www.lagrangelibrary.org/events', city: 'La Grange', state: 'NC', zipCode: '00000', county: 'La Grange County'},
  { name: 'Mountains Branch Library', url: 'https://www.lakelurelibrary.org', eventsUrl: 'https://www.lakelurelibrary.org/events', city: 'Lake Lure', state: 'NC', zipCode: '00000', county: 'Lake Lure County'},
  { name: 'Rube Mccray Memorial Library', url: 'https://www.lakewaccamawlibrary.org', eventsUrl: 'https://www.lakewaccamawlibrary.org/events', city: 'Lake Waccamaw', state: 'NC', zipCode: '00000', county: 'Lake Waccamaw County'},
  { name: 'South Branch Library', url: 'https://www.landislibrary.org', eventsUrl: 'https://www.landislibrary.org/events', city: 'Landis', state: 'NC', zipCode: '00000', county: 'Landis County'},
  { name: 'Scotland County Memorial Library', url: 'https://www.laurinburglibrary.org', eventsUrl: 'https://www.laurinburglibrary.org/events', city: 'Laurinburg', state: 'NC', zipCode: '28352', county: 'Laurinburg County'},
  { name: 'Spangler Branch Library', url: 'https://www.lawndalelibrary.org', eventsUrl: 'https://www.lawndalelibrary.org/events', city: 'Lawndale', state: 'NC', zipCode: '00000', county: 'Lawndale County'},
  { name: 'Leicester Branch Library', url: 'https://www.leicesterlibrary.org', eventsUrl: 'https://www.leicesterlibrary.org/events', city: 'Leicester', state: 'NC', zipCode: '00000', county: 'Leicester County'},
  { name: 'Leland Branch Library', url: 'https://www.lelandlibrary.org', eventsUrl: 'https://www.lelandlibrary.org/events', city: 'Leland', state: 'NC', zipCode: '00000', county: 'Leland County'},
  { name: 'Caldwell County Public Library', url: 'https://www.lenoirlibrary.org', eventsUrl: 'https://www.lenoirlibrary.org/events', city: 'Lenoir', state: 'NC', zipCode: '28645', county: 'Lenoir County'},
  { name: 'Lewisville Branch Library', url: 'https://www.lewisvillelibrary.org', eventsUrl: 'https://www.lewisvillelibrary.org/events', city: 'Lewisville', state: 'NC', zipCode: '00000', county: 'Lewisville County'},
  { name: 'Davidson County Public Library System', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'NC', zipCode: '27292', county: 'Lexington County'},
  { name: 'Liberty Public Library', url: 'https://www.libertylibrary.org', eventsUrl: 'https://www.libertylibrary.org/events', city: 'Liberty', state: 'NC', zipCode: '00000', county: 'Liberty County'},
  { name: 'Harnett County Public Library', url: 'https://www.lillingtonlibrary.org', eventsUrl: 'https://www.lillingtonlibrary.org/events', city: 'Lillington', state: 'NC', zipCode: '27546', county: 'Lillington County'},
  { name: 'Charles R. Jonas Library', url: 'https://www.lincolntonlibrary.org', eventsUrl: 'https://www.lincolntonlibrary.org/events', city: 'Lincolnton', state: 'NC', zipCode: '00000', county: 'Lincolnton County'},
  { name: 'Littleton Public Library (Wc Jones Memorial)', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'NC', zipCode: '00000', county: 'Littleton County'},
  { name: 'Locust Branch Library', url: 'https://www.locustlibrary.org', eventsUrl: 'https://www.locustlibrary.org/events', city: 'Locust', state: 'NC', zipCode: '00000', county: 'Locust County'},
  { name: 'Franklin County Library', url: 'https://www.louisburglibrary.org', eventsUrl: 'https://www.louisburglibrary.org/events', city: 'Louisburg', state: 'NC', zipCode: '27549', county: 'Louisburg County'},
  { name: 'Lowell Branch Library', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'NC', zipCode: '00000', county: 'Lowell County'},
  { name: 'Lowgap Public Library', url: 'https://www.lowgaplibrary.org', eventsUrl: 'https://www.lowgaplibrary.org/events', city: 'Lowgap', state: 'NC', zipCode: '00000', county: 'Lowgap County'},
  { name: 'Lucama Branch Library', url: 'https://www.lucamalibrary.org', eventsUrl: 'https://www.lucamalibrary.org/events', city: 'Lucama', state: 'NC', zipCode: '00000', county: 'Lucama County'},
  { name: 'Robeson County Public Library', url: 'https://www.lumbertonlibrary.org', eventsUrl: 'https://www.lumbertonlibrary.org/events', city: 'Lumberton', state: 'NC', zipCode: '28358', county: 'Lumberton County'},
  { name: 'Madison Branch Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NC', zipCode: '00000', county: 'Madison County'},
  { name: 'Florence Gallier Library', url: 'https://www.magnolialibrary.org', eventsUrl: 'https://www.magnolialibrary.org/events', city: 'Magnolia', state: 'NC', zipCode: '00000', county: 'Magnolia County'},
  { name: 'Maiden Branch Library', url: 'https://www.maidenlibrary.org', eventsUrl: 'https://www.maidenlibrary.org/events', city: 'Maiden', state: 'NC', zipCode: '00000', county: 'Maiden County'},
  { name: 'Dare County Library', url: 'https://www.manteolibrary.org', eventsUrl: 'https://www.manteolibrary.org/events', city: 'Manteo', state: 'NC', zipCode: '00000', county: 'Manteo County'},
  { name: 'Mcdowell County Law Library', url: 'https://www.marionlibrary.org', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'NC', zipCode: '00000', county: 'Marion County'},
  { name: 'Mars Hill Branch Library', url: 'https://www.marshilllibrary.org', eventsUrl: 'https://www.marshilllibrary.org/events', city: 'Mars Hill', state: 'NC', zipCode: '00000', county: 'Mars Hill County'},
  { name: 'Madison County Public Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'NC', zipCode: '28753', county: 'Marshall County'},
  { name: 'Marshville Branch Library', url: 'https://www.marshvillelibrary.org', eventsUrl: 'https://www.marshvillelibrary.org/events', city: 'Marshville', state: 'NC', zipCode: '00000', county: 'Marshville County'},
  { name: 'Matthews Branch Library', url: 'https://www.matthewslibrary.org', eventsUrl: 'https://www.matthewslibrary.org/events', city: 'Matthews', state: 'NC', zipCode: '00000', county: 'Matthews County'},
  { name: 'Gilbert Patterson Memorial Public Library', url: 'https://www.maxtonlibrary.org', eventsUrl: 'https://www.maxtonlibrary.org/events', city: 'Maxton', state: 'NC', zipCode: '00000', county: 'Maxton County'},
  { name: 'Mayodan Branch Library', url: 'https://www.mayodanlibrary.org', eventsUrl: 'https://www.mayodanlibrary.org/events', city: 'Mayodan', state: 'NC', zipCode: '00000', county: 'Mayodan County'},
  { name: 'Maysville Public Library', url: 'https://www.maysvillelibrary.org', eventsUrl: 'https://www.maysvillelibrary.org/events', city: 'Maysville', state: 'NC', zipCode: '00000', county: 'Maysville County'},
  { name: 'Mebane Public Library', url: 'https://www.mebanelibrary.org', eventsUrl: 'https://www.mebanelibrary.org/events', city: 'Mebane', state: 'NC', zipCode: '00000', county: 'Mebane County'},
  { name: 'Davie County Public Library', url: 'https://www.mocksvillelibrary.org', eventsUrl: 'https://www.mocksvillelibrary.org/events', city: 'Mocksville', state: 'NC', zipCode: '27028', county: 'Mocksville County'},
  { name: 'Union County Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'NC', zipCode: '28112', county: 'Monroe County'},
  { name: 'Mooresville Public Library', url: 'https://www.mooresvillelibrary.org', eventsUrl: 'https://www.mooresvillelibrary.org/events', city: 'Mooresville', state: 'NC', zipCode: '28115', county: 'Mooresville County'},
  { name: 'Burke County Public Library', url: 'https://www.morgantonlibrary.org', eventsUrl: 'https://www.morgantonlibrary.org/events', city: 'Morganton', state: 'NC', zipCode: '28655', county: 'Morganton County'},
  { name: 'Mount Airy Public Library', url: 'https://www.mountairylibrary.org', eventsUrl: 'https://www.mountairylibrary.org/events', city: 'Mount Airy', state: 'NC', zipCode: '00000', county: 'Mount Airy County'},
  { name: 'Mount Gilead Branch', url: 'https://www.mountgileadlibrary.org', eventsUrl: 'https://www.mountgileadlibrary.org/events', city: 'Mount Gilead', state: 'NC', zipCode: '00000', county: 'Mount Gilead County'},
  { name: 'Mt. Holly Branch Library', url: 'https://www.mthollylibrary.org', eventsUrl: 'https://www.mthollylibrary.org/events', city: 'Mt. Holly', state: 'NC', zipCode: '00000', county: 'Mt. Holly County'},
  { name: 'Wayne County Public Library, Mount Olive', url: 'https://www.mtolivelibrary.org', eventsUrl: 'https://www.mtolivelibrary.org/events', city: 'Mt. Olive', state: 'NC', zipCode: '00000', county: 'Mt. Olive County'},
  { name: 'Mt. Pleasant Branch Library', url: 'https://www.mtpleasantlibrary.org', eventsUrl: 'https://www.mtpleasantlibrary.org/events', city: 'Mt. Pleasant', state: 'NC', zipCode: '00000', county: 'Mt. Pleasant County'},
  { name: 'Elizabeth Sewell Parker Library', url: 'https://www.murfreesborolibrary.org', eventsUrl: 'https://www.murfreesborolibrary.org/events', city: 'Murfreesboro', state: 'NC', zipCode: '00000', county: 'Murfreesboro County'},
  { name: 'Murphy Public Library', url: 'https://www.murphylibrary.org', eventsUrl: 'https://www.murphylibrary.org/events', city: 'Murphy', state: 'NC', zipCode: '00000', county: 'Murphy County'},
  { name: 'Harold D. Cooley Library', url: 'https://www.nashvillelibrary.org', eventsUrl: 'https://www.nashvillelibrary.org/events', city: 'Nashville', state: 'NC', zipCode: '27856', county: 'Nashville County'},
  { name: 'Craven-Pamlico-Carteret Regional Library', url: 'https://www.newbernlibrary.org', eventsUrl: 'https://www.newbernlibrary.org/events', city: 'New Bern', state: 'NC', zipCode: '28560', county: 'New Bern County'},
  { name: 'Avery County Library', url: 'https://www.newlandlibrary.org', eventsUrl: 'https://www.newlandlibrary.org/events', city: 'Newland', state: 'NC', zipCode: '00000', county: 'Newland County'},
  { name: 'Newport Public Library', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'NC', zipCode: '00000', county: 'Newport County'},
  { name: 'Catawba County Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NC', zipCode: '28658', county: 'Newton County'},
  { name: 'Bryan Memorial Library', url: 'https://www.newtongrovelibrary.org', eventsUrl: 'https://www.newtongrovelibrary.org/events', city: 'Newton Grove', state: 'NC', zipCode: '00000', county: 'Newton Grove County'},
  { name: 'Wilkes County Library', url: 'https://www.northwilkesborolibrary.org', eventsUrl: 'https://www.northwilkesborolibrary.org/events', city: 'North Wilkesboro', state: 'NC', zipCode: '00000', county: 'North Wilkesboro County'},
  { name: 'Norwood Branch Library', url: 'https://www.norwoodlibrary.org', eventsUrl: 'https://www.norwoodlibrary.org/events', city: 'Norwood', state: 'NC', zipCode: '00000', county: 'Norwood County'},
  { name: 'G. V. Barbee Sr. Library', url: 'https://www.oakislandlibrary.org', eventsUrl: 'https://www.oakislandlibrary.org/events', city: 'Oak Island', state: 'NC', zipCode: '00000', county: 'Oak Island County'},
  { name: 'Oakboro Branch Library', url: 'https://www.oakborolibrary.org', eventsUrl: 'https://www.oakborolibrary.org/events', city: 'Oakboro', state: 'NC', zipCode: '00000', county: 'Oakboro County'},
  { name: 'Ocracoke Branch Library', url: 'https://www.ocracokelibrary.org', eventsUrl: 'https://www.ocracokelibrary.org/events', city: 'Ocracoke', state: 'NC', zipCode: '00000', county: 'Ocracoke County'},
  { name: 'Old Fort Branch Library', url: 'https://www.oldfortlibrary.org', eventsUrl: 'https://www.oldfortlibrary.org/events', city: 'Old Fort', state: 'NC', zipCode: '00000', county: 'Old Fort County'},
  { name: 'Berea Branch Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'NC', zipCode: '00000', county: 'Oxford County'},
  { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org', eventsUrl: 'https://www.pembrokelibrary.org/events', city: 'Pembroke', state: 'NC', zipCode: '00000', county: 'Pembroke County'},
  { name: 'Wayne County Public Library, Pikeville', url: 'https://www.pikevillelibrary.org', eventsUrl: 'https://www.pikevillelibrary.org/events', city: 'Pikeville', state: 'NC', zipCode: '00000', county: 'Pikeville County'},
  { name: 'Charles H. Stone Memorial Library', url: 'https://www.pilotmountainlibrary.org', eventsUrl: 'https://www.pilotmountainlibrary.org/events', city: 'Pilot Mountain', state: 'NC', zipCode: '00000', county: 'Pilot Mountain County'},
  { name: 'Bogue Banks Public Library', url: 'https://www.pineknollshoreslibrary.org', eventsUrl: 'https://www.pineknollshoreslibrary.org/events', city: 'Pine Knoll Shores', state: 'NC', zipCode: '00000', county: 'Pine Knoll Shores County'},
  { name: 'Pinebluff Public Library', url: 'https://www.pineblufflibrary.org', eventsUrl: 'https://www.pineblufflibrary.org/events', city: 'Pinebluff', state: 'NC', zipCode: '00000', county: 'Pinebluff County'},
  { name: 'Pinetops Branch Library', url: 'https://www.pinetopslibrary.org', eventsUrl: 'https://www.pinetopslibrary.org/events', city: 'Pinetops', state: 'NC', zipCode: '00000', county: 'Pinetops County'},
  { name: 'Pink Hill Branch Library', url: 'https://www.pinkhilllibrary.org', eventsUrl: 'https://www.pinkhilllibrary.org/events', city: 'Pink Hill', state: 'NC', zipCode: '00000', county: 'Pink Hill County'},
  { name: 'Chatham Community Library', url: 'https://www.pittsborolibrary.org', eventsUrl: 'https://www.pittsborolibrary.org/events', city: 'Pittsboro', state: 'NC', zipCode: '27312', county: 'Pittsboro County'},
  { name: 'Pettigrew Regional Library', url: 'https://www.plymouthlibrary.org', eventsUrl: 'https://www.plymouthlibrary.org/events', city: 'Plymouth', state: 'NC', zipCode: '27962', county: 'Plymouth County'},
  { name: 'Pollocksville Public Library', url: 'https://www.pollocksvillelibrary.org', eventsUrl: 'https://www.pollocksvillelibrary.org/events', city: 'Pollocksville', state: 'NC', zipCode: '00000', county: 'Pollocksville County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'NC', zipCode: '00000', county: 'Princeton County'},
  { name: 'Hoke County Public Library', url: 'https://www.raefordlibrary.org', eventsUrl: 'https://www.raefordlibrary.org/events', city: 'Raeford', state: 'NC', zipCode: '00000', county: 'Raeford County'},
  { name: 'Athens Drive Community Library', url: 'https://www.raleighlibrary.org', eventsUrl: 'https://www.raleighlibrary.org/events', city: 'Raleigh', state: 'NC', zipCode: '00000', county: 'Raleigh County'},
  { name: 'Ramseur Public Library', url: 'https://www.ramseurlibrary.org', eventsUrl: 'https://www.ramseurlibrary.org/events', city: 'Ramseur', state: 'NC', zipCode: '00000', county: 'Ramseur County'},
  { name: 'Randleman Public Library', url: 'https://www.randlemanlibrary.org', eventsUrl: 'https://www.randlemanlibrary.org/events', city: 'Randleman', state: 'NC', zipCode: '00000', county: 'Randleman County'},
  { name: 'Learning Place Library', url: 'https://www.reidsvillelibrary.org', eventsUrl: 'https://www.reidsvillelibrary.org/events', city: 'Reidsville', state: 'NC', zipCode: '00000', county: 'Reidsville County'},
  { name: 'Richlands Public Library', url: 'https://www.richlandslibrary.org', eventsUrl: 'https://www.richlandslibrary.org/events', city: 'Richlands', state: 'NC', zipCode: '00000', county: 'Richlands County'},
  { name: 'East Columbus Branch Library', url: 'https://www.riegelwoodlibrary.org', eventsUrl: 'https://www.riegelwoodlibrary.org/events', city: 'Riegelwood', state: 'NC', zipCode: '00000', county: 'Riegelwood County'},
  { name: 'Roanoke Rapids Public Library', url: 'https://www.roanokerapidslibrary.org', eventsUrl: 'https://www.roanokerapidslibrary.org/events', city: 'Roanoke Rapids', state: 'NC', zipCode: '27870', county: 'Roanoke Rapids County'},
  { name: 'Robbins Area Branch', url: 'https://www.robbinslibrary.org', eventsUrl: 'https://www.robbinslibrary.org/events', city: 'Robbins', state: 'NC', zipCode: '00000', county: 'Robbins County'},
  { name: 'Graham County Public Library', url: 'https://www.robbinsvillelibrary.org', eventsUrl: 'https://www.robbinsvillelibrary.org/events', city: 'Robbinsville', state: 'NC', zipCode: '00000', county: 'Robbinsville County'},
  { name: 'Robersonville Public Library', url: 'https://www.robersonvillelibrary.org', eventsUrl: 'https://www.robersonvillelibrary.org/events', city: 'Robersonville', state: 'NC', zipCode: '00000', county: 'Robersonville County'},
  { name: 'Leath Memorial Library', url: 'https://www.rockinghamlibrary.org', eventsUrl: 'https://www.rockinghamlibrary.org/events', city: 'Rockingham', state: 'NC', zipCode: '00000', county: 'Rockingham County'},
  { name: 'East Branch Library', url: 'https://www.rockwelllibrary.org', eventsUrl: 'https://www.rockwelllibrary.org/events', city: 'Rockwell', state: 'NC', zipCode: '00000', county: 'Rockwell County'},
  { name: 'Braswell Memorial Library', url: 'https://www.rockymountlibrary.org', eventsUrl: 'https://www.rockymountlibrary.org/events', city: 'Rocky Mount', state: 'NC', zipCode: '27804', county: 'Rocky Mount County'},
  { name: 'Ronda Branch Library', url: 'https://www.rondalibrary.org', eventsUrl: 'https://www.rondalibrary.org/events', city: 'Ronda', state: 'NC', zipCode: '00000', county: 'Ronda County'},
  { name: 'Rose Hill Community Memorial Library', url: 'https://www.rosehilllibrary.org', eventsUrl: 'https://www.rosehilllibrary.org/events', city: 'Rose Hill', state: 'NC', zipCode: '00000', county: 'Rose Hill County'},
  { name: 'Roseboro Public Library', url: 'https://www.roseborolibrary.org', eventsUrl: 'https://www.roseborolibrary.org/events', city: 'Roseboro', state: 'NC', zipCode: '00000', county: 'Roseboro County'},
  { name: 'Rowland Public Library', url: 'https://www.rowlandlibrary.org', eventsUrl: 'https://www.rowlandlibrary.org/events', city: 'Rowland', state: 'NC', zipCode: '00000', county: 'Rowland County'},
  { name: 'Person County Public Library', url: 'https://www.roxborolibrary.org', eventsUrl: 'https://www.roxborolibrary.org/events', city: 'Roxboro', state: 'NC', zipCode: '27573', county: 'Roxboro County'},
  { name: 'Rural Hall Branch Library', url: 'https://www.ruralhalllibrary.org', eventsUrl: 'https://www.ruralhalllibrary.org/events', city: 'Rural Hall', state: 'NC', zipCode: '00000', county: 'Rural Hall County'},
  { name: 'Rowan Public Library', url: 'https://www.salisburylibrary.org', eventsUrl: 'https://www.salisburylibrary.org/events', city: 'Salisbury', state: 'NC', zipCode: '28145', county: 'Salisbury County'},
  { name: 'Saluda Branch Library', url: 'https://www.saludalibrary.org', eventsUrl: 'https://www.saludalibrary.org/events', city: 'Saluda', state: 'NC', zipCode: '00000', county: 'Saluda County'},
  { name: 'Jonesboro Branch Library', url: 'https://www.sanfordlibrary.org', eventsUrl: 'https://www.sanfordlibrary.org/events', city: 'Sanford', state: 'NC', zipCode: '00000', county: 'Sanford County'},
  { name: 'Seagrove Public Library', url: 'https://www.seagrovelibrary.org', eventsUrl: 'https://www.seagrovelibrary.org/events', city: 'Seagrove', state: 'NC', zipCode: '00000', county: 'Seagrove County'},
  { name: 'Selma Public Library', url: 'https://www.selmalibrary.org', eventsUrl: 'https://www.selmalibrary.org/events', city: 'Selma', state: 'NC', zipCode: '00000', county: 'Selma County'},
  { name: 'Rourk Branch Library', url: 'https://www.shallottelibrary.org', eventsUrl: 'https://www.shallottelibrary.org/events', city: 'Shallotte', state: 'NC', zipCode: '00000', county: 'Shallotte County'},
  { name: 'Cleveland County Memorial Library', url: 'https://www.shelbylibrary.org', eventsUrl: 'https://www.shelbylibrary.org/events', city: 'Shelby', state: 'NC', zipCode: '28150', county: 'Shelby County'},
  { name: 'Sherrills Ford Branch', url: 'https://www.sherrilsfordlibrary.org', eventsUrl: 'https://www.sherrilsfordlibrary.org/events', city: 'Sherrils Ford', state: 'NC', zipCode: '00000', county: 'Sherrils Ford County'},
  { name: 'Chatham County Public Libraries', url: 'https://www.silercitylibrary.org', eventsUrl: 'https://www.silercitylibrary.org/events', city: 'Siler City', state: 'NC', zipCode: '27344', county: 'Siler City County'},
  { name: 'South Buncombe Branch Library', url: 'https://www.skylandlibrary.org', eventsUrl: 'https://www.skylandlibrary.org/events', city: 'Skyland', state: 'NC', zipCode: '00000', county: 'Skyland County'},
  { name: 'Public Library Of Johnston County Smithfield', url: 'https://www.smithfieldlibrary.org', eventsUrl: 'https://www.smithfieldlibrary.org/events', city: 'Smithfield', state: 'NC', zipCode: '27577', county: 'Smithfield County'},
  { name: 'Sneads Ferry Branch Library', url: 'https://www.sneadsferrylibrary.org', eventsUrl: 'https://www.sneadsferrylibrary.org/events', city: 'Sneads Ferry', state: 'NC', zipCode: '00000', county: 'Sneads Ferry County'},
  { name: 'Greene County Public Library', url: 'https://www.snowhilllibrary.org', eventsUrl: 'https://www.snowhilllibrary.org/events', city: 'Snow Hill', state: 'NC', zipCode: '00000', county: 'Snow Hill County'},
  { name: 'Southern Pines Public Library', url: 'https://www.southernpineslibrary.org', eventsUrl: 'https://www.southernpineslibrary.org/events', city: 'Southern Pines', state: 'NC', zipCode: '28387', county: 'Southern Pines County'},
  { name: 'Brunswick County Library', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'NC', zipCode: '28461', county: 'Southport County'},
  { name: 'Alleghany County Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'NC', zipCode: '00000', county: 'Sparta County'},
  { name: 'Rutherford County Library', url: 'https://www.spindalelibrary.org', eventsUrl: 'https://www.spindalelibrary.org/events', city: 'Spindale', state: 'NC', zipCode: '28160', county: 'Spindale County'},
  { name: 'Spring Lake Branch', url: 'https://www.springlakelibrary.org', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Spring Lake', state: 'NC', zipCode: '00000', county: 'Spring Lake County'},
  { name: 'Spruce Pine Public Library', url: 'https://www.sprucepinelibrary.org', eventsUrl: 'https://www.sprucepinelibrary.org/events', city: 'Spruce Pine', state: 'NC', zipCode: '00000', county: 'Spruce Pine County'},
  { name: 'St. Pauls Public Library', url: 'https://www.stpaulslibrary.org', eventsUrl: 'https://www.stpaulslibrary.org/events', city: 'St. Pauls', state: 'NC', zipCode: '00000', county: 'St. Pauls County'},
  { name: 'Stanley Branch Library', url: 'https://www.stanleylibrary.org', eventsUrl: 'https://www.stanleylibrary.org/events', city: 'Stanley', state: 'NC', zipCode: '00000', county: 'Stanley County'},
  { name: 'Crocker Branch Library', url: 'https://www.stantonsburglibrary.org', eventsUrl: 'https://www.stantonsburglibrary.org/events', city: 'Stantonsburg', state: 'NC', zipCode: '00000', county: 'Stantonsburg County'},
  { name: 'Star Branch', url: 'https://www.starlibrary.org', eventsUrl: 'https://www.starlibrary.org/events', city: 'Star', state: 'NC', zipCode: '00000', county: 'Star County'},
  { name: 'Iredell County Library', url: 'https://www.statesvillelibrary.org', eventsUrl: 'https://www.statesvillelibrary.org/events', city: 'Statesville', state: 'NC', zipCode: '28677', county: 'Statesville County'},
  { name: 'Stoneville Branch Library', url: 'https://www.stonevillelibrary.org', eventsUrl: 'https://www.stonevillelibrary.org/events', city: 'Stoneville', state: 'NC', zipCode: '00000', county: 'Stoneville County'},
  { name: 'Stovall Branch Library', url: 'https://www.stovalllibrary.org', eventsUrl: 'https://www.stovalllibrary.org/events', city: 'Stovall', state: 'NC', zipCode: '00000', county: 'Stovall County'},
  { name: 'Western Watauga Branch Library', url: 'https://www.sugargrovelibrary.org', eventsUrl: 'https://www.sugargrovelibrary.org/events', city: 'Sugar Grove', state: 'NC', zipCode: '00000', county: 'Sugar Grove County'},
  { name: 'Mattamuskeet Library', url: 'https://www.swanquarterlibrary.org', eventsUrl: 'https://www.swanquarterlibrary.org/events', city: 'Swan Quarter', state: 'NC', zipCode: '00000', county: 'Swan Quarter County'},
  { name: 'Swannanoa Library', url: 'https://www.swannonoalibrary.org', eventsUrl: 'https://www.swannonoalibrary.org/events', city: 'Swannonoa', state: 'NC', zipCode: '28778', county: 'Swannonoa County'},
  { name: 'Swansboro Branch Library', url: 'https://www.swansborolibrary.org', eventsUrl: 'https://www.swansborolibrary.org/events', city: 'Swansboro', state: 'NC', zipCode: '00000', county: 'Swansboro County'},
  { name: 'Jackson County Public Library', url: 'https://www.sylvalibrary.org', eventsUrl: 'https://www.sylvalibrary.org/events', city: 'Sylva', state: 'NC', zipCode: '00000', county: 'Sylva County'},
  { name: 'Tabor City Public Library', url: 'https://www.taborcitylibrary.org', eventsUrl: 'https://www.taborcitylibrary.org/events', city: 'Tabor City', state: 'NC', zipCode: '00000', county: 'Tabor City County'},
  { name: 'Edgecombe County Memorial Library', url: 'https://www.tarborolibrary.org', eventsUrl: 'https://www.tarborolibrary.org/events', city: 'Tarboro', state: 'NC', zipCode: '27886', county: 'Tarboro County'},
  { name: 'Alexander County Library', url: 'https://www.taylorsvillelibrary.org', eventsUrl: 'https://www.taylorsvillelibrary.org/events', city: 'Taylorsville', state: 'NC', zipCode: '28681', county: 'Taylorsville County'},
  { name: 'Thomasville Public Library', url: 'https://www.thomasvillelibrary.org', eventsUrl: 'https://www.thomasvillelibrary.org/events', city: 'Thomasville', state: 'NC', zipCode: '00000', county: 'Thomasville County'},
  { name: 'Traphill Branch Library', url: 'https://www.traphilllibrary.org', eventsUrl: 'https://www.traphilllibrary.org/events', city: 'Traphill', state: 'NC', zipCode: '00000', county: 'Traphill County'},
  { name: 'Comfort Branch Library', url: 'https://www.trentonlibrary.org', eventsUrl: 'https://www.trentonlibrary.org/events', city: 'Trenton', state: 'NC', zipCode: '00000', county: 'Trenton County'},
  { name: 'J. Hoyt Hayes Memorial Troutman Branch Library', url: 'https://www.troutmanlibrary.org', eventsUrl: 'https://www.troutmanlibrary.org/events', city: 'Troutman', state: 'NC', zipCode: '28634', county: 'Troutman County'},
  { name: 'Montgomery County Library', url: 'https://www.troylibrary.org', eventsUrl: 'https://www.troylibrary.org/events', city: 'Troy', state: 'NC', zipCode: '00000', county: 'Troy County'},
  { name: 'Green River Branch Library', url: 'https://www.tuxedolibrary.org', eventsUrl: 'https://www.tuxedolibrary.org/events', city: 'Tuxedo', state: 'NC', zipCode: '00000', county: 'Tuxedo County'},
  { name: 'Valdese Public Library', url: 'https://www.valdeselibrary.org', eventsUrl: 'https://www.valdeselibrary.org/events', city: 'Valdese', state: 'NC', zipCode: '00000', county: 'Valdese County'},
  { name: 'West Lincoln Branch Library', url: 'https://www.valelibrary.org', eventsUrl: 'https://www.valelibrary.org/events', city: 'Vale', state: 'NC', zipCode: '00000', county: 'Vale County'},
  { name: 'Vanceboro-Craven County Public Library', url: 'https://www.vanceborolibrary.org', eventsUrl: 'https://www.vanceborolibrary.org/events', city: 'Vanceboro', state: 'NC', zipCode: '00000', county: 'Vanceboro County'},
  { name: 'Vass Area Library', url: 'https://www.vasslibrary.org', eventsUrl: 'https://www.vasslibrary.org/events', city: 'Vass', state: 'NC', zipCode: '00000', county: 'Vass County'},
  { name: 'Hampton B. Allen Library', url: 'https://www.wadesborolibrary.org', eventsUrl: 'https://www.wadesborolibrary.org/events', city: 'Wadesboro', state: 'NC', zipCode: '00000', county: 'Wadesboro County'},
  { name: 'Wagram Branch Library', url: 'https://www.wagramlibrary.org', eventsUrl: 'https://www.wagramlibrary.org/events', city: 'Wagram', state: 'NC', zipCode: '00000', county: 'Wagram County'},
  { name: 'Walkertown Branch Library', url: 'https://www.walkertownlibrary.org', eventsUrl: 'https://www.walkertownlibrary.org/events', city: 'Walkertown', state: 'NC', zipCode: '00000', county: 'Walkertown County'},
  { name: 'Walnut Cove Public Library', url: 'https://www.walnutcovelibrary.org', eventsUrl: 'https://www.walnutcovelibrary.org/events', city: 'Walnut Cove', state: 'NC', zipCode: '00000', county: 'Walnut Cove County'},
  { name: 'Warren County Memorial Library', url: 'https://www.warrentonlibrary.org', eventsUrl: 'https://www.warrentonlibrary.org/events', city: 'Warrenton', state: 'NC', zipCode: '27589', county: 'Warrenton County'},
  { name: 'Warsaw-Kornegay Public Library', url: 'https://www.warsawlibrary.org', eventsUrl: 'https://www.warsawlibrary.org/events', city: 'Warsaw', state: 'NC', zipCode: '00000', county: 'Warsaw County'},
  { name: 'Bhm Regional Library', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'NC', zipCode: '27889', county: 'Washington County'},
  { name: 'Waxhaw Library', url: 'https://www.waxhawlibrary.org', eventsUrl: 'https://www.waxhawlibrary.org/events', city: 'Waxhaw', state: 'NC', zipCode: '00000', county: 'Waxhaw County'},
  { name: 'Haywood County Public Library', url: 'https://www.waynesvillelibrary.org', eventsUrl: 'https://www.waynesvillelibrary.org/events', city: 'Waynesville', state: 'NC', zipCode: '28786', county: 'Waynesville County'},
  { name: 'Weaverville Library', url: 'https://www.weavervillelibrary.org', eventsUrl: 'https://www.weavervillelibrary.org/events', city: 'Weaverville', state: 'NC', zipCode: '28787', county: 'Weaverville County'},
  { name: 'North Davidson Branch Library', url: 'https://www.welcomelibrary.org', eventsUrl: 'https://www.welcomelibrary.org/events', city: 'Welcome', state: 'NC', zipCode: '00000', county: 'Welcome County'},
  { name: 'Weldon Memorial Library', url: 'https://www.weldonlibrary.org', eventsUrl: 'https://www.weldonlibrary.org/events', city: 'Weldon', state: 'NC', zipCode: '00000', county: 'Weldon County'},
  { name: 'Wendell Library', url: 'https://www.wendelllibrary.org', eventsUrl: 'https://www.wendelllibrary.org/events', city: 'Wendell', state: 'NC', zipCode: '00000', county: 'Wendell County'},
  { name: 'Appalachian Regional Library', url: 'https://www.westjeffersonlibrary.org', eventsUrl: 'https://www.westjeffersonlibrary.org/events', city: 'West Jefferson', state: 'NC', zipCode: '28694', county: 'West Jefferson County'},
  { name: 'Columbus County Public Library', url: 'https://www.whitevillelibrary.org', eventsUrl: 'https://www.whitevillelibrary.org/events', city: 'Whiteville', state: 'NC', zipCode: '28472', county: 'Whiteville County'},
  { name: 'Martin Memorial Library', url: 'https://www.williamstonlibrary.org', eventsUrl: 'https://www.williamstonlibrary.org/events', city: 'Williamston', state: 'NC', zipCode: '00000', county: 'Williamston County'},
  { name: 'Myrtle Grove Branch', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'NC', zipCode: '00000', county: 'Wilmington County'},
  { name: 'East Branch Library', url: 'https://www.wilsonlibrary.org', eventsUrl: 'https://www.wilsonlibrary.org/events', city: 'Wilson', state: 'NC', zipCode: '00000', county: 'Wilson County'},
  { name: 'Lawrence Memorial Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'NC', zipCode: '00000', county: 'Windsor County'},
  { name: 'Carver School Road Branch Library', url: 'https://www.winstonsalemlibrary.org', eventsUrl: 'https://www.winstonsalemlibrary.org/events', city: 'Winston-Salem', state: 'NC', zipCode: '00000', county: 'Winston-Salem County'},
  { name: 'C. D. Langston R. E. Boyd Library', url: 'https://www.wintervillelibrary.org', eventsUrl: 'https://www.wintervillelibrary.org/events', city: 'Winterville', state: 'NC', zipCode: '00000', county: 'Winterville County'},
  { name: 'Albemarle Regional Library', url: 'https://www.wintonlibrary.org', eventsUrl: 'https://www.wintonlibrary.org/events', city: 'Winton', state: 'NC', zipCode: '27986', county: 'Winton County'},
  { name: 'Yadkin County Public Library', url: 'https://www.yadkinvillelibrary.org', eventsUrl: 'https://www.yadkinvillelibrary.org/events', city: 'Yadkinville', state: 'NC', zipCode: '00000', county: 'Yadkinville County'},
  { name: 'Gunn Memorial Public Library', url: 'https://www.yanceyvillelibrary.org', eventsUrl: 'https://www.yanceyvillelibrary.org/events', city: 'Yanceyville', state: 'NC', zipCode: '00000', county: 'Yanceyville County'},
  { name: 'Youngsville Branch Library', url: 'https://www.youngsvillelibrary.org', eventsUrl: 'https://www.youngsvillelibrary.org/events', city: 'Youngsville', state: 'NC', zipCode: '00000', county: 'Youngsville County'},
  { name: 'Zebulon Library', url: 'https://www.zebulonlibrary.org', eventsUrl: 'https://www.zebulonlibrary.org/events', city: 'Zebulon', state: 'NC', zipCode: '00000', county: 'Zebulon County'}
];

const SCRAPER_NAME = 'wordpress-NC';

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
            state: 'NC',
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
    state: 'NC',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  North Carolina Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressNCCloudFunction() {
  console.log('☁️ Running WordPress NC as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NC', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-NC', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNCCloudFunction };
