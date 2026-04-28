const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Vermont Public Libraries Scraper - Coverage: All Vermont public libraries
 */
const LIBRARIES = [
  { name: 'Fletcher Free Library', url: 'https://www.fletcherfree.org', eventsUrl: 'https://www.fletcherfree.org/events', city: 'Burlington', state: 'VT', zipCode: '05401', county: 'Burlington County'},
  { name: 'Rutland Free Library', url: 'https://www.rutlandfree.org', eventsUrl: 'https://www.rutlandfree.org/events', city: 'Rutland', state: 'VT', zipCode: '05701', county: 'Rutland County'},
  { name: 'Kellogg-Hubbard Library', url: 'https://www.kellogghubbard.org', eventsUrl: 'https://www.kellogghubbard.org/events', city: 'Montpelier', state: 'VT', zipCode: '05602', county: 'Montpelier County'},
  { name: 'Brooks Memorial Library', url: 'https://www.brookslibraryvt.org', eventsUrl: 'https://www.brookslibraryvt.org/events', city: 'Brattleboro', state: 'VT', zipCode: '05301', county: 'Brattleboro County'},
  { name: 'St. Johnsbury Athenaeum', url: 'https://www.stjathenaeum.org', eventsUrl: 'https://www.stjathenaeum.org/events', city: 'St. Johnsbury', state: 'VT', zipCode: '05819', county: 'St. Johnsbury County'},
  { name: 'Ilsley Public Library', url: 'https://www.ilsleypubliclibrary.org', eventsUrl: 'https://www.ilsleypubliclibrary.org/events', city: 'Middlebury', state: 'VT', zipCode: '05753', county: 'Middlebury County'},
  { name: 'Norman Williams Public Library', url: 'https://www.normanwilliams.org', eventsUrl: 'https://www.normanwilliams.org/events', city: 'Woodstock', state: 'VT', zipCode: '05091', county: 'Woodstock County'},
  { name: 'Aldrich Public Library', url: 'https://www.aldrichpubliclibrary.org', eventsUrl: 'https://www.aldrichpubliclibrary.org/events', city: 'Barre', state: 'VT', zipCode: '05641', county: 'Barre County'},
  { name: 'Brownell Library', url: 'https://www.brownelllibrary.org', eventsUrl: 'https://www.brownelllibrary.org/events', city: 'Essex Junction', state: 'VT', zipCode: '05452', county: 'Essex Junction County'},
  { name: 'Pierson Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Shelburne', state: 'VT', zipCode: '05482', county: 'Shelburne County'},
  { name: 'Rockingham Free Public Library', url: 'https://www.rockinghamlibrary.org', eventsUrl: 'https://www.rockinghamlibrary.org/events', city: 'Bellows Falls', state: 'VT', zipCode: '05101', county: 'Bellows Falls County'},
  { name: 'Springfield Town Library', url: 'https://www.springfieldtownlibrary.org', eventsUrl: 'https://www.springfieldtownlibrary.org/events', city: 'Springfield', state: 'VT', zipCode: '05156', county: 'Springfield County'},
  { name: 'Morristown Centennial Library', url: 'https://www.centenniallibrary.org', eventsUrl: 'https://www.centenniallibrary.org/events', city: 'Morrisville', state: 'VT', zipCode: '05661', county: 'Morrisville County'},
  { name: 'Haskell Free Library', url: 'https://www.haskellopera.com/library', eventsUrl: 'https://www.haskellopera.com/library/events', city: 'Derby Line', state: 'VT', zipCode: '05830', county: 'Derby Line County'},
  { name: 'Cobleigh Public Library', url: 'https://www.cobleighlibrary.org', eventsUrl: 'https://www.cobleighlibrary.org/events', city: 'Lyndonville', state: 'VT', zipCode: '05851', county: 'Lyndonville County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibraryvt.org', eventsUrl: 'https://www.hartlandlibraryvt.org/events', city: 'Hartland', state: 'VT', zipCode: '05048', county: 'Hartland County'},
  { name: 'Dorothy Alling Memorial Library', url: 'https://www.williston.lib.vt.us', eventsUrl: 'https://www.williston.lib.vt.us/events', city: 'Williston', state: 'VT', zipCode: '05495', county: 'Williston County'},
  { name: 'Deborah Rawson Memorial Library', url: 'https://www.drml.org', eventsUrl: 'https://www.drml.org/events', city: 'Jericho', state: 'VT', zipCode: '05465', county: 'Jericho County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Albany Town', url: 'https://www.albanylibrary.org', eventsUrl: 'https://www.albanylibrary.org/events', city: 'Albany', state: 'VT', zipCode: '05820', county: 'Albany County'},
  { name: 'Alburgh Pubilc Library', url: 'https://www.alburghlibrary.org', eventsUrl: 'https://www.alburghlibrary.org/events', city: 'Alburgh', state: 'VT', zipCode: '05440', county: 'Alburgh County'},
  { name: 'Martha Canfield Memorial', url: 'https://www.arlingtonlibrary.org', eventsUrl: 'https://www.arlingtonlibrary.org/events', city: 'Arlington', state: 'VT', zipCode: '05250', county: 'Arlington County'},
  { name: 'Weathersfield Proctor Library', url: 'https://www.ascutneylibrary.org', eventsUrl: 'https://www.ascutneylibrary.org/events', city: 'Ascutney', state: 'VT', zipCode: '05030', county: 'Ascutney County'},
  { name: 'H. F. Brigham Free', url: 'https://www.bakersfieldlibrary.org', eventsUrl: 'https://www.bakersfieldlibrary.org/events', city: 'Bakersfield', state: 'VT', zipCode: '05441', county: 'Bakersfield County'},
  { name: 'Charles B. Danforth', url: 'https://www.barnardlibrary.org', eventsUrl: 'https://www.barnardlibrary.org/events', city: 'Barnard', state: 'VT', zipCode: '05031', county: 'Barnard County'},
  { name: 'Barnet Public', url: 'https://www.barnetlibrary.org', eventsUrl: 'https://www.barnetlibrary.org/events', city: 'Barnet', state: 'VT', zipCode: '05821', county: 'Barnet County'},
  { name: 'Barton Public', url: 'https://www.bartonlibrary.org', eventsUrl: 'https://www.bartonlibrary.org/events', city: 'Barton', state: 'VT', zipCode: '05822', county: 'Barton County'},
  { name: 'Mount Holly', url: 'https://www.belmontlibrary.org', eventsUrl: 'https://www.belmontlibrary.org/events', city: 'Belmont', state: 'VT', zipCode: '05730', county: 'Belmont County'},
  { name: 'Bennington Free', url: 'https://www.benningtonlibrary.org', eventsUrl: 'https://www.benningtonlibrary.org/events', city: 'Bennington', state: 'VT', zipCode: '05201', county: 'Bennington County'},
  { name: 'Benson Public', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'VT', zipCode: '05731', county: 'Benson County'},
  { name: 'Bethel Public', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'VT', zipCode: '05032', county: 'Bethel County'},
  { name: 'Winhall Memorial', url: 'https://www.bondvillelibrary.org', eventsUrl: 'https://www.bondvillelibrary.org/events', city: 'Bondville', state: 'VT', zipCode: '05340', county: 'Bondville County'},
  { name: 'Bradford Public', url: 'https://www.bradfordlibrary.org', eventsUrl: 'https://www.bradfordlibrary.org/events', city: 'Bradford', state: 'VT', zipCode: '05033', county: 'Bradford County'},
  { name: 'Brandon Free Public', url: 'https://www.brandonlibrary.org', eventsUrl: 'https://www.brandonlibrary.org/events', city: 'Brandon', state: 'VT', zipCode: '05733', county: 'Brandon County'},
  { name: 'Lawrence Memorial', url: 'https://www.bristollibrary.org', eventsUrl: 'https://www.bristollibrary.org/events', city: 'Bristol', state: 'VT', zipCode: '05443', county: 'Bristol County'},
  { name: 'Brookfield Free Public', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'VT', zipCode: '05036', county: 'Brookfield County'},
  { name: 'Mary L. Blood Memorial', url: 'https://www.brownsvillelibrary.org', eventsUrl: 'https://www.brownsvillelibrary.org/events', city: 'Brownsville', state: 'VT', zipCode: '05037', county: 'Brownsville County'},
  { name: 'Cabot Public', url: 'https://www.cabotlibrary.org', eventsUrl: 'https://www.cabotlibrary.org/events', city: 'Cabot', state: 'VT', zipCode: '05647', county: 'Cabot County'},
  { name: 'Alice M. Ward Memorial', url: 'https://www.canaanlibrary.org', eventsUrl: 'https://www.canaanlibrary.org/events', city: 'Canaan', state: 'VT', zipCode: '05903', county: 'Canaan County'},
  { name: 'Castleton Free', url: 'https://www.castletonlibrary.org', eventsUrl: 'https://www.castletonlibrary.org/events', city: 'Castleton', state: 'VT', zipCode: '05735', county: 'Castleton County'},
  { name: 'Charlotte', url: 'https://www.charlottelibrary.org', eventsUrl: 'https://www.charlottelibrary.org/events', city: 'Charlotte', state: 'VT', zipCode: '05445', county: 'Charlotte County'},
  { name: 'Chelsea Public', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'VT', zipCode: '05038', county: 'Chelsea County'},
  { name: 'Whiting', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'VT', zipCode: '05143', county: 'Chester County'},
  { name: 'Chittenden Public', url: 'https://www.chittendenlibrary.org', eventsUrl: 'https://www.chittendenlibrary.org/events', city: 'Chittenden', state: 'VT', zipCode: '05737', county: 'Chittenden County'},
  { name: 'Burnham Memorial', url: 'https://www.colchesterlibrary.org', eventsUrl: 'https://www.colchesterlibrary.org/events', city: 'Colchester', state: 'VT', zipCode: '05446', county: 'Colchester County'},
  { name: 'Concord Public Library', url: 'https://www.concordlibrary.org', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'VT', zipCode: '05824', county: 'Concord County'},
  { name: 'Cornwall Free Public', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'VT', zipCode: '05753', county: 'Cornwall County'},
  { name: 'Craftsbury Public', url: 'https://www.craftsburycommonlibrary.org', eventsUrl: 'https://www.craftsburycommonlibrary.org/events', city: 'Craftsbury Common', state: 'VT', zipCode: '05827', county: 'Craftsbury Common County'},
  { name: 'S. L. Griffith Memorial Library', url: 'https://www.danbylibrary.org', eventsUrl: 'https://www.danbylibrary.org/events', city: 'Danby', state: 'VT', zipCode: '05739', county: 'Danby County'},
  { name: 'Pope Memorial', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'VT', zipCode: '05828', county: 'Danville County'},
  { name: 'Big Read Wagon (Nclc)', url: 'https://www.derbylibrary.org', eventsUrl: 'https://www.derbylibrary.org/events', city: 'Derby', state: 'VT', zipCode: '05829', county: 'Derby County'},
  { name: 'Dorset Village Public', url: 'https://www.dorsetlibrary.org', eventsUrl: 'https://www.dorsetlibrary.org/events', city: 'Dorset', state: 'VT', zipCode: '05251', county: 'Dorset County'},
  { name: 'Blake Memorial', url: 'https://www.ecorinthlibrary.org', eventsUrl: 'https://www.ecorinthlibrary.org/events', city: 'E. Corinth', state: 'VT', zipCode: '05040', county: 'E. Corinth County'},
  { name: 'East Barre Branch Library', url: 'https://www.eastbarrelibrary.org', eventsUrl: 'https://www.eastbarrelibrary.org/events', city: 'East Barre', state: 'VT', zipCode: '05649', county: 'East Barre County'},
  { name: 'East Burke Community Library', url: 'https://www.eastburkelibrary.org', eventsUrl: 'https://www.eastburkelibrary.org/events', city: 'East Burke', state: 'VT', zipCode: '05832', county: 'East Burke County'},
  { name: 'Dover Free', url: 'https://www.eastdoverlibrary.org', eventsUrl: 'https://www.eastdoverlibrary.org/events', city: 'East Dover', state: 'VT', zipCode: '05341', county: 'East Dover County'},
  { name: 'Sarah Partridge Community Library', url: 'https://www.eastmiddleburylibrary.org', eventsUrl: 'https://www.eastmiddleburylibrary.org/events', city: 'East Middlebury', state: 'VT', zipCode: '05740', county: 'East Middlebury County'},
  { name: 'Enosburg Public', url: 'https://www.enosburgfallslibrary.org', eventsUrl: 'https://www.enosburgfallslibrary.org/events', city: 'Enosburg Falls', state: 'VT', zipCode: '05450', county: 'Enosburg Falls County'},
  { name: 'Essex Free', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'VT', zipCode: '05451', county: 'Essex County'},
  { name: 'Fair Haven Free', url: 'https://www.fairhavenlibrary.org', eventsUrl: 'https://www.fairhavenlibrary.org/events', city: 'Fair Haven', state: 'VT', zipCode: '05743', county: 'Fair Haven County'},
  { name: 'Fairfax Community', url: 'https://www.fairfaxlibrary.org', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'VT', zipCode: '05454', county: 'Fairfax County'},
  { name: 'Bent Northrup Memorial', url: 'https://www.fairfieldlibrary.org', eventsUrl: 'https://www.fairfieldlibrary.org/events', city: 'Fairfield', state: 'VT', zipCode: '05455', county: 'Fairfield County'},
  { name: 'Fairlee Public', url: 'https://www.fairleelibrary.org', eventsUrl: 'https://www.fairleelibrary.org/events', city: 'Fairlee', state: 'VT', zipCode: '05045', county: 'Fairlee County'},
  { name: 'Haston', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'VT', zipCode: '05457', county: 'Franklin County'},
  { name: 'Belcher Memorial', url: 'https://www.gaysvillelibrary.org', eventsUrl: 'https://www.gaysvillelibrary.org/events', city: 'Gaysville', state: 'VT', zipCode: '05746', county: 'Gaysville County'},
  { name: 'Gilman Public Library', url: 'https://www.gilmanlibrary.org', eventsUrl: 'https://www.gilmanlibrary.org/events', city: 'Gilman', state: 'VT', zipCode: '05904', county: 'Gilman County'},
  { name: 'Glover Public', url: 'https://www.gloverlibrary.org', eventsUrl: 'https://www.gloverlibrary.org/events', city: 'Glover', state: 'VT', zipCode: '05839', county: 'Glover County'},
  { name: 'Grafton Public', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'VT', zipCode: '05146', county: 'Grafton County'},
  { name: 'Grand Isle Free', url: 'https://www.grandislelibrary.org', eventsUrl: 'https://www.grandislelibrary.org/events', city: 'Grand Isle', state: 'VT', zipCode: '05458', county: 'Grand Isle County'},
  { name: 'Greensboro Free', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'VT', zipCode: '05841', county: 'Greensboro County'},
  { name: 'Groton Free Public', url: 'https://www.grotonlibrary.org', eventsUrl: 'https://www.grotonlibrary.org/events', city: 'Groton', state: 'VT', zipCode: '05046', county: 'Groton County'},
  { name: 'Guildhall Public Library', url: 'https://www.guildhalllibrary.org', eventsUrl: 'https://www.guildhalllibrary.org/events', city: 'Guildhall', state: 'VT', zipCode: '05905', county: 'Guildhall County'},
  { name: 'Guilford Free', url: 'https://www.guilfordlibrary.org', eventsUrl: 'https://www.guilfordlibrary.org/events', city: 'Guilford', state: 'VT', zipCode: '05301', county: 'Guilford County'},
  { name: 'Hancock Free Public', url: 'https://www.hancocklibrary.org', eventsUrl: 'https://www.hancocklibrary.org/events', city: 'Hancock', state: 'VT', zipCode: '05748', county: 'Hancock County'},
  { name: 'Jeudevine Memorial', url: 'https://www.hardwicklibrary.org', eventsUrl: 'https://www.hardwicklibrary.org/events', city: 'Hardwick', state: 'VT', zipCode: '05843', county: 'Hardwick County'},
  { name: 'Hartford', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'VT', zipCode: '05047', county: 'Hartford County'},
  { name: 'Highgate Public', url: 'https://www.highgatelibrary.org', eventsUrl: 'https://www.highgatelibrary.org/events', city: 'Highgate', state: 'VT', zipCode: '05459', county: 'Highgate County'},
  { name: 'Carpenter Carse', url: 'https://www.hinesburglibrary.org', eventsUrl: 'https://www.hinesburglibrary.org/events', city: 'Hinesburg', state: 'VT', zipCode: '05461', county: 'Hinesburg County'},
  { name: 'Huntington Public', url: 'https://www.huntingtonlibrary.org', eventsUrl: 'https://www.huntingtonlibrary.org/events', city: 'Huntington', state: 'VT', zipCode: '05462', county: 'Huntington County'},
  { name: 'Lanpher Memorial', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'VT', zipCode: '05655', county: 'Hyde Park County'},
  { name: 'Leach Public', url: 'https://www.irasburglibrary.org', eventsUrl: 'https://www.irasburglibrary.org/events', city: 'Irasburg', state: 'VT', zipCode: '05849', county: 'Irasburg County'},
  { name: 'Island Pond Public', url: 'https://www.islandpondlibrary.org', eventsUrl: 'https://www.islandpondlibrary.org/events', city: 'Island Pond', state: 'VT', zipCode: '05846', county: 'Island Pond County'},
  { name: 'Isle La Motte Free Public', url: 'https://www.islelamottelibrary.org', eventsUrl: 'https://www.islelamottelibrary.org/events', city: 'Isle La Motte', state: 'VT', zipCode: '05463', county: 'Isle La Motte County'},
  { name: 'Whitingham Free Public', url: 'https://www.jacksonvillelibrary.org', eventsUrl: 'https://www.jacksonvillelibrary.org/events', city: 'Jacksonville', state: 'VT', zipCode: '05342', county: 'Jacksonville County'},
  { name: 'Jamaica Memorial', url: 'https://www.jamaicalibrary.org', eventsUrl: 'https://www.jamaicalibrary.org/events', city: 'Jamaica', state: 'VT', zipCode: '05343', county: 'Jamaica County'},
  { name: 'Varnum Memorial', url: 'https://www.jeffersonvillelibrary.org', eventsUrl: 'https://www.jeffersonvillelibrary.org/events', city: 'Jeffersonville', state: 'VT', zipCode: '05464', county: 'Jeffersonville County'},
  { name: 'Jericho Town', url: 'https://www.jerichocenterlibrary.org', eventsUrl: 'https://www.jerichocenterlibrary.org/events', city: 'Jericho Center', state: 'VT', zipCode: '05465', county: 'Jericho Center County'},
  { name: 'Johnson Public', url: 'https://www.johnsonlibrary.org', eventsUrl: 'https://www.johnsonlibrary.org/events', city: 'Johnson', state: 'VT', zipCode: '05656', county: 'Johnson County'},
  { name: 'Sherburne Memorial', url: 'https://www.killingtonlibrary.org', eventsUrl: 'https://www.killingtonlibrary.org/events', city: 'Killington', state: 'VT', zipCode: '05751', county: 'Killington County'},
  { name: 'Lincoln', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'VT', zipCode: '05443', county: 'Lincoln County'},
  { name: 'Lowell Community', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'VT', zipCode: '05847', county: 'Lowell County'},
  { name: 'Davies Memorial', url: 'https://www.lowerwaterfordlibrary.org', eventsUrl: 'https://www.lowerwaterfordlibrary.org/events', city: 'Lower Waterford', state: 'VT', zipCode: '05848', county: 'Lower Waterford County'},
  { name: 'Fletcher Memorial', url: 'https://www.ludlowlibrary.org', eventsUrl: 'https://www.ludlowlibrary.org/events', city: 'Ludlow', state: 'VT', zipCode: '05149', county: 'Ludlow County'},
  { name: 'Alden Balch Memorial', url: 'https://www.lunenburglibrary.org', eventsUrl: 'https://www.lunenburglibrary.org/events', city: 'Lunenburg', state: 'VT', zipCode: '05906', county: 'Lunenburg County'},
  { name: 'Mark Skinner', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'VT', zipCode: '05254', county: 'Manchester County'},
  { name: 'Jaquith Public', url: 'https://www.marshfieldlibrary.org', eventsUrl: 'https://www.marshfieldlibrary.org/events', city: 'Marshfield', state: 'VT', zipCode: '05658', county: 'Marshfield County'},
  { name: 'Mcindoes Academy', url: 'https://www.mcindoefallslibrary.org', eventsUrl: 'https://www.mcindoefallslibrary.org/events', city: 'Mcindoe Falls', state: 'VT', zipCode: '05050', county: 'Mcindoe Falls County'},
  { name: 'Middletown Springs Public', url: 'https://www.middletownspgslibrary.org', eventsUrl: 'https://www.middletownspgslibrary.org/events', city: 'Middletown Spgs.', state: 'VT', zipCode: '05757', county: 'Middletown Spgs. County'},
  { name: 'Milton Public Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'VT', zipCode: '05468', county: 'Milton County'},
  { name: 'Russell Memorial', url: 'https://www.monktonlibrary.org', eventsUrl: 'https://www.monktonlibrary.org/events', city: 'Monkton', state: 'VT', zipCode: '05469', county: 'Monkton County'},
  { name: 'Montgomery Town', url: 'https://www.montgomerycenterlibrary.org', eventsUrl: 'https://www.montgomerycenterlibrary.org/events', city: 'Montgomery Center', state: 'VT', zipCode: '05471', county: 'Montgomery Center County'},
  { name: 'Moretown Memorial', url: 'https://www.moretownlibrary.org', eventsUrl: 'https://www.moretownlibrary.org/events', city: 'Moretown', state: 'VT', zipCode: '05660', county: 'Moretown County'},
  { name: 'Bailey Memorial', url: 'https://www.nclarendonlibrary.org', eventsUrl: 'https://www.nclarendonlibrary.org/events', city: 'N. Clarendon', state: 'VT', zipCode: '05759', county: 'N. Clarendon County'},
  { name: 'Brainerd Memorial', url: 'https://www.ndanvillelibrary.org', eventsUrl: 'https://www.ndanvillelibrary.org/events', city: 'N. Danville', state: 'VT', zipCode: '05828', county: 'N. Danville County'},
  { name: 'New Haven Community Library', url: 'https://www.newhavenlibrary.org', eventsUrl: 'https://www.newhavenlibrary.org/events', city: 'New Haven', state: 'VT', zipCode: '05472', county: 'New Haven County'},
  { name: 'Tenney Memorial', url: 'https://www.newburylibrary.org', eventsUrl: 'https://www.newburylibrary.org/events', city: 'Newbury', state: 'VT', zipCode: '05051', county: 'Newbury County'},
  { name: 'Moore Free', url: 'https://www.newfanelibrary.org', eventsUrl: 'https://www.newfanelibrary.org/events', city: 'Newfane', state: 'VT', zipCode: '05345', county: 'Newfane County'},
  { name: 'Goodrich Memorial', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'VT', zipCode: '05855', county: 'Newport County'},
  { name: 'J. G. Mccullough Free', url: 'https://www.northbenningtonlibrary.org', eventsUrl: 'https://www.northbenningtonlibrary.org/events', city: 'North Bennington', state: 'VT', zipCode: '05257', county: 'North Bennington County'},
  { name: 'North Hero Public', url: 'https://www.northherolibrary.org', eventsUrl: 'https://www.northherolibrary.org/events', city: 'North Hero', state: 'VT', zipCode: '05474', county: 'North Hero County'},
  { name: 'William Lucy Rand Memorial Library', url: 'https://www.northtroylibrary.org', eventsUrl: 'https://www.northtroylibrary.org/events', city: 'North Troy', state: 'VT', zipCode: '05859', county: 'North Troy County'},
  { name: 'Brown Public', url: 'https://www.northfieldlibrary.org', eventsUrl: 'https://www.northfieldlibrary.org/events', city: 'Northfield', state: 'VT', zipCode: '05663', county: 'Northfield County'},
  { name: 'Norwich Public', url: 'https://www.norwichlibrary.org', eventsUrl: 'https://www.norwichlibrary.org/events', city: 'Norwich', state: 'VT', zipCode: '05055', county: 'Norwich County'},
  { name: 'Jones Memorial', url: 'https://www.orleanslibrary.org', eventsUrl: 'https://www.orleanslibrary.org/events', city: 'Orleans', state: 'VT', zipCode: '05860', county: 'Orleans County'},
  { name: 'Orwell Free Library', url: 'https://www.orwelllibrary.org', eventsUrl: 'https://www.orwelllibrary.org/events', city: 'Orwell', state: 'VT', zipCode: '05760', county: 'Orwell County'},
  { name: 'Pawlet Public', url: 'https://www.pawletlibrary.org', eventsUrl: 'https://www.pawletlibrary.org/events', city: 'Pawlet', state: 'VT', zipCode: '05761', county: 'Pawlet County'},
  { name: 'Peacham', url: 'https://www.peachamlibrary.org', eventsUrl: 'https://www.peachamlibrary.org/events', city: 'Peacham', state: 'VT', zipCode: '05862', county: 'Peacham County'},
  { name: 'Roger Clark Memorial', url: 'https://www.pittsfieldlibrary.org', eventsUrl: 'https://www.pittsfieldlibrary.org/events', city: 'Pittsfield', state: 'VT', zipCode: '05762', county: 'Pittsfield County'},
  { name: 'Maclure', url: 'https://www.pittsfordlibrary.org', eventsUrl: 'https://www.pittsfordlibrary.org/events', city: 'Pittsford', state: 'VT', zipCode: '05673', county: 'Pittsford County'},
  { name: 'Cutler Memorial', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'VT', zipCode: '05667', county: 'Plainfield County'},
  { name: 'George Peabody', url: 'https://www.postmillslibrary.org', eventsUrl: 'https://www.postmillslibrary.org/events', city: 'Post Mills', state: 'VT', zipCode: '05058', county: 'Post Mills County'},
  { name: 'Poultney Public', url: 'https://www.poultneylibrary.org', eventsUrl: 'https://www.poultneylibrary.org/events', city: 'Poultney', state: 'VT', zipCode: '05764', county: 'Poultney County'},
  { name: 'Solomon Wright Public', url: 'https://www.pownallibrary.org', eventsUrl: 'https://www.pownallibrary.org/events', city: 'Pownal', state: 'VT', zipCode: '05261', county: 'Pownal County'},
  { name: 'Proctor Free', url: 'https://www.proctorlibrary.org', eventsUrl: 'https://www.proctorlibrary.org/events', city: 'Proctor', state: 'VT', zipCode: '05765', county: 'Proctor County'},
  { name: 'Cavendish Fletcher Community', url: 'https://www.proctorsvillelibrary.org', eventsUrl: 'https://www.proctorsvillelibrary.org/events', city: 'Proctorsville', state: 'VT', zipCode: '05153', county: 'Proctorsville County'},
  { name: 'Putney Public', url: 'https://www.putneylibrary.org', eventsUrl: 'https://www.putneylibrary.org/events', city: 'Putney', state: 'VT', zipCode: '05346', county: 'Putney County'},
  { name: 'Quechee', url: 'https://www.quecheelibrary.org', eventsUrl: 'https://www.quecheelibrary.org/events', city: 'Quechee', state: 'VT', zipCode: '05059', county: 'Quechee County'},
  { name: 'Kimball Public', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'VT', zipCode: '05060', county: 'Randolph County'},
  { name: 'Reading Public', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'VT', zipCode: '05060', county: 'Reading County'},
  { name: 'Readsboro Community', url: 'https://www.readsborolibrary.org', eventsUrl: 'https://www.readsborolibrary.org/events', city: 'Readsboro', state: 'VT', zipCode: '05350', county: 'Readsboro County'},
  { name: 'Arvin A. Brown Public', url: 'https://www.richfordlibrary.org', eventsUrl: 'https://www.richfordlibrary.org/events', city: 'Richford', state: 'VT', zipCode: '05476', county: 'Richford County'},
  { name: 'Richmond Free', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'VT', zipCode: '05477', county: 'Richmond County'},
  { name: 'Rochester Public', url: 'https://www.rochesterlibrary.org', eventsUrl: 'https://www.rochesterlibrary.org/events', city: 'Rochester', state: 'VT', zipCode: '05767', county: 'Rochester County'},
  { name: 'Roxbury Free', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'VT', zipCode: '05669', county: 'Roxbury County'},
  { name: 'South Burlington Community', url: 'https://www.sburlingtonlibrary.org', eventsUrl: 'https://www.sburlingtonlibrary.org/events', city: 'S. Burlington', state: 'VT', zipCode: '05403', county: 'S. Burlington County'},
  { name: 'South Hero Community', url: 'https://www.sherolibrary.org', eventsUrl: 'https://www.sherolibrary.org/events', city: 'S. Hero', state: 'VT', zipCode: '05486', county: 'S. Hero County'},
  { name: 'South Londonderry Free', url: 'https://www.slondonderrylibrary.org', eventsUrl: 'https://www.slondonderrylibrary.org/events', city: 'S. Londonderry', state: 'VT', zipCode: '05155', county: 'S. Londonderry County'},
  { name: 'Abbott Memorial', url: 'https://www.spomfretlibrary.org', eventsUrl: 'https://www.spomfretlibrary.org/events', city: 'S. Pomfret', state: 'VT', zipCode: '05067', county: 'S. Pomfret County'},
  { name: 'Salisbury Free Public', url: 'https://www.salisburylibrary.org', eventsUrl: 'https://www.salisburylibrary.org/events', city: 'Salisbury', state: 'VT', zipCode: '05769', county: 'Salisbury County'},
  { name: 'Baxter Memorial', url: 'https://www.sharonlibrary.org', eventsUrl: 'https://www.sharonlibrary.org/events', city: 'Sharon', state: 'VT', zipCode: '05065', county: 'Sharon County'},
  { name: 'Sheldon Public', url: 'https://www.sheldonlibrary.org', eventsUrl: 'https://www.sheldonlibrary.org/events', city: 'Sheldon', state: 'VT', zipCode: '05483', county: 'Sheldon County'},
  { name: 'Platt Memorial', url: 'https://www.shorehamlibrary.org', eventsUrl: 'https://www.shorehamlibrary.org/events', city: 'Shoreham', state: 'VT', zipCode: '05770', county: 'Shoreham County'},
  { name: 'Shrewsbury', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'VT', zipCode: '05738', county: 'Shrewsbury County'},
  { name: 'Royalton Memorial', url: 'https://www.southroyaltonlibrary.org', eventsUrl: 'https://www.southroyaltonlibrary.org/events', city: 'South Royalton', state: 'VT', zipCode: '05068', county: 'South Royalton County'},
  { name: 'South Ryegate Public', url: 'https://www.southryegatelibrary.org', eventsUrl: 'https://www.southryegatelibrary.org/events', city: 'South Ryegate', state: 'VT', zipCode: '05069', county: 'South Ryegate County'},
  { name: 'St. Albans Free', url: 'https://www.stalbanslibrary.org', eventsUrl: 'https://www.stalbanslibrary.org/events', city: 'St. Albans', state: 'VT', zipCode: '05478', county: 'St. Albans County'},
  { name: 'Stamford Community', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'VT', zipCode: '05352', county: 'Stamford County'},
  { name: 'Starksboro Public', url: 'https://www.starksborolibrary.org', eventsUrl: 'https://www.starksborolibrary.org/events', city: 'Starksboro', state: 'VT', zipCode: '05487', county: 'Starksboro County'},
  { name: 'Stowe Free', url: 'https://www.stowelibrary.org', eventsUrl: 'https://www.stowelibrary.org/events', city: 'Stowe', state: 'VT', zipCode: '05672', county: 'Stowe County'},
  { name: 'Morrill Mem. Harris', url: 'https://www.straffordlibrary.org', eventsUrl: 'https://www.straffordlibrary.org/events', city: 'Strafford', state: 'VT', zipCode: '05072', county: 'Strafford County'},
  { name: 'Franklin-Grand Isle Bookmobile', url: 'https://www.swantonlibrary.org', eventsUrl: 'https://www.swantonlibrary.org/events', city: 'Swanton', state: 'VT', zipCode: '05488', county: 'Swanton County'},
  { name: 'Latham Memorial', url: 'https://www.thetfordlibrary.org', eventsUrl: 'https://www.thetfordlibrary.org/events', city: 'Thetford', state: 'VT', zipCode: '05074', county: 'Thetford County'},
  { name: 'Tinmouth', url: 'https://www.tinmouthlibrary.org', eventsUrl: 'https://www.tinmouthlibrary.org/events', city: 'Tinmouth', state: 'VT', zipCode: '05773', county: 'Tinmouth County'},
  { name: 'Townshend Public', url: 'https://www.townshendlibrary.org', eventsUrl: 'https://www.townshendlibrary.org/events', city: 'Townshend', state: 'VT', zipCode: '05353', county: 'Townshend County'},
  { name: 'Tunbridge Public', url: 'https://www.tunbridgelibrary.org', eventsUrl: 'https://www.tunbridgelibrary.org/events', city: 'Tunbridge', state: 'VT', zipCode: '05077', county: 'Tunbridge County'},
  { name: 'Bixby Memorial', url: 'https://www.vergenneslibrary.org', eventsUrl: 'https://www.vergenneslibrary.org/events', city: 'Vergennes', state: 'VT', zipCode: '05491', county: 'Vergennes County'},
  { name: 'Vernon Free', url: 'https://www.vernonlibrary.org', eventsUrl: 'https://www.vernonlibrary.org/events', city: 'Vernon', state: 'VT', zipCode: '05354', county: 'Vernon County'},
  { name: 'Vershire Community', url: 'https://www.vershirelibrary.org', eventsUrl: 'https://www.vershirelibrary.org/events', city: 'Vershire', state: 'VT', zipCode: '05079', county: 'Vershire County'},
  { name: 'R.K. Kittay Public', url: 'https://www.wrupertlibrary.org', eventsUrl: 'https://www.wrupertlibrary.org/events', city: 'W. Rupert', state: 'VT', zipCode: '05776', county: 'W. Rupert County'},
  { name: 'Joslin Memorial', url: 'https://www.waitsfieldlibrary.org', eventsUrl: 'https://www.waitsfieldlibrary.org/events', city: 'Waitsfield', state: 'VT', zipCode: '05673', county: 'Waitsfield County'},
  { name: 'Gilbert Hart', url: 'https://www.wallingfordlibrary.org', eventsUrl: 'https://www.wallingfordlibrary.org/events', city: 'Wallingford', state: 'VT', zipCode: '05773', county: 'Wallingford County'},
  { name: 'Wardsboro Free Public', url: 'https://www.wardsborolibrary.org', eventsUrl: 'https://www.wardsborolibrary.org/events', city: 'Wardsboro', state: 'VT', zipCode: '05355', county: 'Wardsboro County'},
  { name: 'Warren Public', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'VT', zipCode: '05674', county: 'Warren County'},
  { name: 'Calef Memorial', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'VT', zipCode: '05675', county: 'Washington County'},
  { name: 'Waterbury Public', url: 'https://www.waterburylibrary.org', eventsUrl: 'https://www.waterburylibrary.org/events', city: 'Waterbury', state: 'VT', zipCode: '05676', county: 'Waterbury County'},
  { name: 'Waterville Town', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'VT', zipCode: '05492', county: 'Waterville County'},
  { name: 'Wells Village', url: 'https://www.wellslibrary.org', eventsUrl: 'https://www.wellslibrary.org/events', city: 'Wells', state: 'VT', zipCode: '05774', county: 'Wells County'},
  { name: 'Baldwin Memorial', url: 'https://www.wellsriverlibrary.org', eventsUrl: 'https://www.wellsriverlibrary.org/events', city: 'Wells River', state: 'VT', zipCode: '05081', county: 'Wells River County'},
  { name: 'Windham Co. Reads', url: 'https://www.westbrattleborolibrary.org', eventsUrl: 'https://www.westbrattleborolibrary.org/events', city: 'West Brattleboro', state: 'VT', zipCode: '05303', county: 'West Brattleboro County'},
  { name: 'West Burke', url: 'https://www.westburkelibrary.org', eventsUrl: 'https://www.westburkelibrary.org/events', city: 'West Burke', state: 'VT', zipCode: '05871', county: 'West Burke County'},
  { name: 'Walden Community', url: 'https://www.westdanvillelibrary.org', eventsUrl: 'https://www.westdanvillelibrary.org/events', city: 'West Danville', state: 'VT', zipCode: '05873', county: 'West Danville County'},
  { name: 'Lydia Taft Pratt', url: 'https://www.westdummerstonlibrary.org', eventsUrl: 'https://www.westdummerstonlibrary.org/events', city: 'West Dummerston', state: 'VT', zipCode: '05357', county: 'West Dummerston County'},
  { name: 'West Fairlee Free Public', url: 'https://www.westfairleelibrary.org', eventsUrl: 'https://www.westfairleelibrary.org/events', city: 'West Fairlee', state: 'VT', zipCode: '05083', county: 'West Fairlee County'},
  { name: 'West Hartford', url: 'https://www.westhartfordlibrary.org', eventsUrl: 'https://www.westhartfordlibrary.org/events', city: 'West Hartford', state: 'VT', zipCode: '05084', county: 'West Hartford County'},
  { name: 'West Rutland Free', url: 'https://www.westrutlandlibrary.org', eventsUrl: 'https://www.westrutlandlibrary.org/events', city: 'West Rutland', state: 'VT', zipCode: '05777', county: 'West Rutland County'},
  { name: 'Hitchcock Museum', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'VT', zipCode: '05874', county: 'Westfield County'},
  { name: 'Westford Town', url: 'https://www.westfordlibrary.org', eventsUrl: 'https://www.westfordlibrary.org/events', city: 'Westford', state: 'VT', zipCode: '05494', county: 'Westford County'},
  { name: 'Butterfield', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'VT', zipCode: '05158', county: 'Westminster County'},
  { name: 'Westminster West Public', url: 'https://www.westminsterwestlibrary.org', eventsUrl: 'https://www.westminsterwestlibrary.org/events', city: 'Westminster West', state: 'VT', zipCode: '05346', county: 'Westminster West County'},
  { name: 'Wilder Memorial', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'VT', zipCode: '05161', county: 'Weston County'},
  { name: 'Wilder Branch Library', url: 'https://www.wilderlibrary.org', eventsUrl: 'https://www.wilderlibrary.org/events', city: 'Wilder', state: 'VT', zipCode: '05088', county: 'Wilder County'},
  { name: 'Ainsworth Public', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'VT', zipCode: '05679', county: 'Williamstown County'},
  { name: 'Pettee Memorial', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'VT', zipCode: '05363', county: 'Wilmington County'},
  { name: 'Windham Town', url: 'https://www.windhamlibrary.org', eventsUrl: 'https://www.windhamlibrary.org/events', city: 'Windham', state: 'VT', zipCode: '05359', county: 'Windham County'},
  { name: 'Windsor Public', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'VT', zipCode: '05089', county: 'Windsor County'},
  { name: 'Winooski Memorial', url: 'https://www.winooskilibrary.org', eventsUrl: 'https://www.winooskilibrary.org/events', city: 'Winooski', state: 'VT', zipCode: '05404', county: 'Winooski County'},
  { name: 'G. M. Kelley Community', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'VT', zipCode: '05680', county: 'Wolcott County'},
  { name: 'Woodbury Community', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'VT', zipCode: '05681', county: 'Woodbury County'}

];

const SCRAPER_NAME = 'wordpress-VT';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'VT', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressVTCloudFunction() {
  console.log('☁️ Running WordPress VT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-VT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-VT', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressVTCloudFunction };
