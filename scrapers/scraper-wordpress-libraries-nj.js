// 13 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
// domains resolve to a DIFFERENT state's library, or are dead. They were writing that
// other library's events under the wrong name and state. Every removed library is listed
// with its city, state and old URL in reports/defect-a-removals.md so it can be restored
// once a real URL is verified. See scripts/fix-url-collisions.js for the evidence method.
const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { tryFetchTecEvents, tryDomScrapeTecEvents } = require('./helpers/tec-rest-helper');
const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');
const ngeohash = require('ngeohash');
/**
 * New Jersey Public Libraries Scraper - Coverage: All New Jersey public libraries
 */
const LIBRARIES = [
  { name: 'Asbury Park Free Public Library', url: 'https://www.asburyparklibrary.org/', eventsUrl: 'https://www.asburyparklibrary.org/', city: 'Asbury Park', state: 'NJ', zipCode: '07712', county: 'Monmouth'},
  { name: 'Atlantic City Free Public Library', url: 'https://www.atlanticcitylibrary.org', eventsUrl: 'https://www.atlanticcitylibrary.org/events', city: 'Atlantic City', state: 'NJ', zipCode: '08401', county: 'Atlantic'},
  { name: 'Audubon Free Public Library', url: 'https://www.audubonlibrary.org', eventsUrl: 'https://www.audubonlibrary.org/events', city: 'Audubon', state: 'NJ', zipCode: '08106', county: 'Camden'},
  { name: 'Bayonne Free Public Library', url: 'https://www.bayonnelibrary.org', eventsUrl: 'https://www.bayonnelibrary.org/events', city: 'Bayonne', state: 'NJ', zipCode: '07002', county: 'Hudson'},
  { name: 'Beach Haven Free Public Library', url: 'https://www.beachhavenlibrary.org', eventsUrl: 'https://www.beachhavenlibrary.org/events', city: 'Beach Haven', state: 'NJ', zipCode: '08008', county: 'Ocean'},
  { name: 'Belmar Public Library', url: 'https://www.belmarlibrary.org', eventsUrl: 'https://www.belmarlibrary.org/events', city: 'Belmar', state: 'NJ', zipCode: '07719', county: 'Monmouth'},
  { name: 'Bergenfield Free Public Library', url: 'https://www.bergenfieldlibrary.org/', eventsUrl: 'https://www.bergenfieldlibrary.org/calendar/', city: 'Bergenfield', state: 'NJ', zipCode: '07621', county: 'Bergen'},
  { name: 'Bernardsville Public Library', url: 'https://www.bernardsvillelibrary.org', eventsUrl: 'https://www.bernardsvillelibrary.org/events', city: 'Bernardsville', state: 'NJ', zipCode: '07924', county: 'Somerset'},
  { name: 'Bloomingdale Free Public Library', url: 'https://www.bloomingdalelibrary.org/', eventsUrl: 'https://www.bloomingdalelibrary.org/', city: 'Bloomingdale', state: 'NJ', zipCode: '07403', county: 'Passaic'},
  { name: 'Boonton Holmes Public Library', url: 'https://www.boontonlibrary.org', eventsUrl: 'https://www.boontonlibrary.org/events', city: 'Boonton', state: 'NJ', zipCode: '07005', county: 'Morris'},
  { name: 'Bradley Beach Public Library', url: 'https://bradleybeachlibrary.org/', eventsUrl: 'https://bradleybeachlibrary.org/', city: 'Bradley Beach', state: 'NJ', zipCode: '07720', county: 'Monmouth'},
  { name: 'Bridgeton Free Public Library', url: 'https://bridgetonlibrary.org/', eventsUrl: 'https://bridgetonlibrary.org/', city: 'Bridgeton', state: 'NJ', zipCode: '08302', county: 'Cumberland'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'NJ', zipCode: '07405', county: 'Morris'},
  { name: 'Camden Free Public Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'NJ', zipCode: '08103', county: 'Camden County'},
  { name: 'William E. Dermody Free Public Library', url: 'https://carlstadtlibrary.org/', eventsUrl: 'https://carlstadtlibrary.org/', city: 'Carlstadt', state: 'NJ', zipCode: '07072', county: 'Bergen'},
  { name: 'Carteret Free Public Library', url: 'https://www.carteretlibrary.org', eventsUrl: 'https://www.carteretlibrary.org/events', city: 'Carteret', state: 'NJ', zipCode: '07008', county: 'Middlesex'},
  { name: 'Cedar Grove Free Public Library', url: 'https://www.cedargrovelibrary.org', eventsUrl: 'https://www.cedargrovelibrary.org/events', city: 'Cedar Grove', state: 'NJ', zipCode: '07009', county: 'Essex'},
  { name: 'Chathams Joint Free Public Library', url: 'https://chathamlibrary.librarycalendar.com/', eventsUrl: 'https://chathamlibrary.librarycalendar.com/events/month/', city: 'Chatham', state: 'NJ', zipCode: '07928', county: 'Morris'},
  { name: 'Chester Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'NJ', zipCode: '07930', county: 'Morris'},
  { name: 'Clark Public Library', url: 'https://www.clarklibrary.org', eventsUrl: 'https://www.clarklibrary.org/events', city: 'Clark', state: 'NJ', zipCode: '07066', county: 'Union'},
  { name: 'Cliffside Park Free Public Library', url: 'https://www.cliffsideparklibrary.org', eventsUrl: 'https://www.cliffsideparklibrary.org/events', city: 'Cliffside Park', state: 'NJ', zipCode: '07010', county: 'Bergen'},
  { name: 'Cranford Public Library', url: 'https://www.cranfordlibrary.org/', eventsUrl: 'https://www.cranfordlibrary.org/calendar/', city: 'Cranford', state: 'NJ', zipCode: '07016', county: 'Union'},
  { name: 'Cresskill Public Library', url: 'https://www.cresskilllibrary.org/', eventsUrl: 'https://www.cresskilllibrary.org/', city: 'Cresskill', state: 'NJ', zipCode: '07626', county: 'Bergen'},
  { name: 'Crosswicks Library Company', url: 'https://www.crosswickslibrary.org/', eventsUrl: 'https://www.crosswickslibrary.org/', city: 'Crosswicks', state: 'NJ', zipCode: '08015', county: 'Burlington'},
  { name: 'Delanco Public Library', url: 'https://www.delancolibrary.org/', eventsUrl: 'https://www.delancolibrary.org/', city: 'Delanco', state: 'NJ', zipCode: '08075', county: 'Burlington'},
  { name: 'Demarest Public Library Association', url: 'https://www.demarestlibrary.org/', eventsUrl: 'https://www.demarestlibrary.org/calendar/', city: 'Demarest', state: 'NJ', zipCode: '07627', county: 'Bergen'},
  { name: 'Denville Free Public Library', url: 'https://www.denvillelibrary.org/', eventsUrl: 'https://www.denvillelibrary.org/', city: 'Denville', state: 'NJ', zipCode: '07834', county: 'Morris'},
  { name: 'Dover Free Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'NJ', zipCode: '07801', county: 'Morris'},
  { name: 'Dixon Homestead Library', url: 'https://www.dumontlibrary.org/', eventsUrl: 'https://www.dumontlibrary.org/', city: 'Dumont', state: 'NJ', zipCode: '07628', county: 'Bergen'},
  { name: 'Dunellen Free Public Library', url: 'https://www.dunellenlibrary.org', eventsUrl: 'https://www.dunellenlibrary.org/events', city: 'Dunellen', state: 'NJ', zipCode: '08812', county: 'Middlesex'},
  { name: 'Edgewater Free Public Library', url: 'https://www.edgewaterlibrary.org', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'NJ', zipCode: '07020', county: 'Bergen'},
  { name: 'Elmwood Park Free Public Library', url: 'https://www.elmwoodparklibrary.org', eventsUrl: 'https://www.elmwoodparklibrary.org/events', city: 'Elmwood Park', state: 'NJ', zipCode: '07407', county: 'Bergen'},
  { name: 'Emerson Public Library', url: 'https://www.emersonlibrary.com/', eventsUrl: 'https://www.emersonlibrary.com/', city: 'Emerson', state: 'NJ', zipCode: '07630', county: 'Bergen'},
  { name: 'Englewood Free Public Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'NJ', zipCode: '07631', county: 'Bergen'},
  { name: 'Fair Haven Public Library', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fair Haven', state: 'NJ', zipCode: '07704', county: 'Monmouth'},
  { name: 'Maurice M. Pine Free Public Library', url: 'https://www.fairlawnlibrary.org/', eventsUrl: 'https://www.fairlawnlibrary.org/calendar', city: 'Fair Lawn', state: 'NJ', zipCode: '07410', county: 'Bergen'},
  { name: 'Anthony Pio Costa Memorial Library', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'NJ', zipCode: '07004', county: 'Essex'},
  { name: 'Fanwood Memorial Library', url: 'https://fanwoodlibrary.org/', eventsUrl: 'https://fanwoodlibrary.org/', city: 'Fanwood', state: 'NJ', zipCode: '07023', county: 'Union'},
  { name: 'Flemington Free Public Library', url: 'https://www.flemingtonlibrary.org', eventsUrl: 'https://www.flemingtonlibrary.org/events', city: 'Flemington', state: 'NJ', zipCode: '08822', county: 'Hunterdon'},
  { name: 'Fort Lee Free Public Library', url: 'https://www.fortleelibrary.org', eventsUrl: 'https://www.fortleelibrary.org/events', city: 'Fort Lee', state: 'NJ', zipCode: '07024', county: 'Bergen'},
  { name: 'Franklin Lakes Free Public Library', url: 'https://www.franklinlakeslibrary.org', eventsUrl: 'https://www.franklinlakeslibrary.org/events', city: 'Franklin Lakes', state: 'NJ', zipCode: '07417', county: 'Bergen'},
  { name: 'Franklin Twp Public Library-Gloucester', url: 'https://franklinvillelibrary.org/', eventsUrl: 'https://franklinvillelibrary.org/', city: 'Franklinville', state: 'NJ', zipCode: '08322', county: 'Gloucester'},
  { name: 'Glen Ridge Free Public Library', url: 'https://www.glenridgelibrary.org/', eventsUrl: 'https://www.glenridgelibrary.org/', city: 'Glen Ridge', state: 'NJ', zipCode: '07028', county: 'Essex'},
  { name: 'Glen Rock Public Library', url: 'https://www.glenrocklibrary.org/', eventsUrl: 'https://www.glenrocklibrary.org/', city: 'Glen Rock', state: 'NJ', zipCode: '07452', county: 'Bergen'},
  { name: 'Gloucester City Library', url: 'https://www.gloucestercitylibrary.org', eventsUrl: 'https://www.gloucestercitylibrary.org/events', city: 'Gloucester City', state: 'NJ', zipCode: '08030', county: 'Camden'},
  { name: 'Hackettstown Free Public Library', url: 'https://www.hackettstownlibrary.org', eventsUrl: 'https://www.hackettstownlibrary.org/events', city: 'Hackettstown', state: 'NJ', zipCode: '07840', county: 'Warren'},
  { name: 'Haddonfield Public Library', url: 'https://www.haddonfieldlibrary.org/', eventsUrl: 'https://www.haddonfieldlibrary.org/', city: 'Haddonfield', state: 'NJ', zipCode: '08033', county: 'Camden'},
  { name: 'Hamilton Township Free Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'NJ', zipCode: '08619', county: 'Monmouth'},
  { name: 'Hasbrouck Heights Free Public Library', url: 'https://www.hasbrouckheightslibrary.org', eventsUrl: 'https://www.hasbrouckheightslibrary.org/events', city: 'Hasbrouck Heights', state: 'NJ', zipCode: '07604', county: 'Bergen'},
  { name: 'Haworth Municipal Library', url: 'https://www.haworthlibrary.org/', eventsUrl: 'https://www.haworthlibrary.org/', city: 'Haworth', state: 'NJ', zipCode: '07641', county: 'Bergen'},
  { name: 'Hillside Free Public Library', url: 'https://www.hillsidelibrary.org', eventsUrl: 'https://www.hillsidelibrary.org/events', city: 'Hillside', state: 'NJ', zipCode: '07205', county: 'Union'},
  { name: 'Worth Pinkham Memorial Library', url: 'https://www.hohokuslibrary.org', eventsUrl: 'https://www.hohokuslibrary.org/events', city: 'Ho-Ho-Kus', state: 'NJ', zipCode: '07423', county: 'Bergen'},
  { name: 'Hoboken Public Library', url: 'https://www.hobokenlibrary.org', eventsUrl: 'https://www.hobokenlibrary.org/events', city: 'Hoboken', state: 'NJ', zipCode: '07030', county: 'Hudson'},
  { name: 'Irvington Public Library', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'NJ', zipCode: '07111', county: 'Essex'},
  { name: 'Jamesburg Public Library', url: 'https://jamesburglibrary.org/', eventsUrl: 'https://jamesburglibrary.org/', city: 'Jamesburg', state: 'NJ', zipCode: '08831', county: 'Middlesex'},
  { name: 'Kearny Public Library', url: 'https://www.kearnylibrary.org', eventsUrl: 'https://www.kearnylibrary.org/events', city: 'Kearny', state: 'NJ', zipCode: '07032', county: 'Hudson'},
  { name: 'Kenilworth Public Library', url: 'https://kenilworthlibrary.org/', eventsUrl: 'https://kenilworthlibrary.org/', city: 'Kenilworth', state: 'NJ', zipCode: '07033', county: 'Union'},
  { name: 'Keyport Free Public Library', url: 'https://www.keyportlibrary.org', eventsUrl: 'https://www.keyportlibrary.org/events', city: 'Keyport', state: 'NJ', zipCode: '07735', county: 'Monmouth'},
  { name: 'Kinnelon Public Library', url: 'https://kinnelonlibrary.org/', eventsUrl: 'https://kinnelonlibrary.org/calendar/', city: 'Kinnelon', state: 'NJ', zipCode: '07405', county: 'Morris'},
  { name: 'Lambertville Free Public Library', url: 'https://www.lambertvillelibrary.org', eventsUrl: 'https://www.lambertvillelibrary.org/events', city: 'Lambertville', state: 'NJ', zipCode: '08530', county: 'Hunterdon'},
  { name: 'Leonia Public Library', url: 'https://www.leonialibrary.org', eventsUrl: 'https://www.leonialibrary.org/events', city: 'Leonia', state: 'NJ', zipCode: '07605', county: 'Bergen'},
  { name: 'Lincoln Park Public Library', url: 'https://www.lincolnparklibrary.org/', eventsUrl: 'https://www.lincolnparklibrary.org/calendar', city: 'Lincoln Park', state: 'NJ', zipCode: '07035', county: 'Morris'},
  { name: 'Linwood Public Library', url: 'https://www.linwoodlibrary.org', eventsUrl: 'https://www.linwoodlibrary.org/events', city: 'Linwood', state: 'NJ', zipCode: '08221', county: 'Atlantic'},
  { name: 'Little Falls Public Library', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'NJ', zipCode: '07424', county: 'Passaic'},
  { name: 'Little Silver Public Library', url: 'https://www.littlesilverlibrary.org/', eventsUrl: 'https://www.littlesilverlibrary.org/', city: 'Little Silver', state: 'NJ', zipCode: '07739', county: 'Monmouth'},
  { name: 'Ruth L. Rockwood Memorial Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'NJ', zipCode: '07039', county: 'Essex'},
  { name: 'Lyndhurst Free Public Library', url: 'https://lyndhurstlibrary.org/', eventsUrl: 'https://lyndhurstlibrary.org/', city: 'Lyndhurst', state: 'NJ', zipCode: '07071', county: 'Bergen'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NJ', zipCode: '07940', county: 'Morris'},
  { name: 'Maplewood Memorial Library', url: 'https://www.maplewoodlibrary.org/', eventsUrl: 'https://www.maplewoodlibrary.org/', city: 'Maplewood', state: 'NJ', zipCode: '07040', county: 'Essex'},
  { name: 'Margate City Public Library', url: 'https://www.margatelibrary.org', eventsUrl: 'https://www.margatelibrary.org/events', city: 'Margate', state: 'NJ', zipCode: '08402', county: 'Margate County'},
  { name: 'Maywood Public Library', url: 'https://www.maywoodlibrary.org', eventsUrl: 'https://www.maywoodlibrary.org/events', city: 'Maywood', state: 'NJ', zipCode: '07607', county: 'Bergen'},
  { name: 'Metuchen Public Library', url: 'https://www.metuchenlibrary.org/', eventsUrl: 'https://www.metuchenlibrary.org/calendar/', city: 'Metuchen', state: 'NJ', zipCode: '08840', county: 'Middlesex'},
  { name: 'Middletown Township Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'NJ', zipCode: '07748', county: 'Monmouth'},
  { name: 'Midland Park Memorial Library', url: 'https://www.midlandparklibrary.org/', eventsUrl: 'https://www.midlandparklibrary.org/', city: 'Midland Park', state: 'NJ', zipCode: '07432', county: 'Bergen'},
  { name: 'Millburn Free Public Library', url: 'https://www.millburnlibrary.org', eventsUrl: 'https://www.millburnlibrary.org/events', city: 'Millburn', state: 'NJ', zipCode: '07041', county: 'Essex'},
  { name: 'Milltown Public Library', url: 'https://www.milltownlibrary.org/', eventsUrl: 'https://www.milltownlibrary.org/', city: 'Milltown', state: 'NJ', zipCode: '08850', county: 'Middlesex'},
  { name: 'Millville Public Library', url: 'https://www.millvillelibrary.org', eventsUrl: 'https://www.millvillelibrary.org/events', city: 'Millville', state: 'NJ', zipCode: '08332', county: 'Cumberland'},
  { name: 'Monmouth Beach Public Library', url: 'https://monmouthbeachlibrary.org/', eventsUrl: 'https://monmouthbeachlibrary.org/', city: 'Monmouth Beach', state: 'NJ', zipCode: '07750', county: 'Monmouth'},
  { name: 'Monroe Twp Public Library-Middlesex', url: 'http://monroetpl.org/', eventsUrl: 'http://monroetpl.org/', city: 'Monroe Township', state: 'NJ', zipCode: '08831', county: 'Middlesex'},
  { name: 'Montclair Public Library', url: 'https://www.montclairlibrary.org', eventsUrl: 'https://www.montclairlibrary.org/events', city: 'Montclair', state: 'NJ', zipCode: '07042', county: 'Essex'},
  { name: 'Montville Township Public Library', url: 'https://montvillelibrary.org/', eventsUrl: 'https://montvillelibrary.org/', city: 'Montville', state: 'NJ', zipCode: '07045', county: 'Morris'},
  { name: 'Moorestown Library', url: 'https://www.moorestownlibrary.org', eventsUrl: 'https://www.moorestownlibrary.org/events', city: 'Moorestown', state: 'NJ', zipCode: '08057', county: 'Burlington'},
  { name: 'Morris Plains Library', url: 'https://morrisplainslibrary.org/', eventsUrl: 'https://morrisplainslibrary.org/', city: 'Morris Plains', state: 'NJ', zipCode: '07950', county: 'Morris'},
  { name: 'Morristown-Morris Twp Joint Public Library', url: 'https://www.morristownlibrary.org', eventsUrl: 'https://www.morristownlibrary.org/events', city: 'Morristown', state: 'NJ', zipCode: '07960', county: 'Morris'},
  { name: 'Mount Arlington Public Library', url: 'https://mountarlingtonlibrary.org/', eventsUrl: 'https://mountarlingtonlibrary.org/', city: 'Mount Arlington', state: 'NJ', zipCode: '07856', county: 'Morris'},
  { name: 'Mount Laurel Library', url: 'https://www.mountlaurellibrary.org', eventsUrl: 'https://www.mountlaurellibrary.org/events', city: 'Mount Laurel', state: 'NJ', zipCode: '08054', county: 'Burlington'},
  { name: 'Mountain Lakes Free Public Library', url: 'https://www.mountainlakeslibrary.org', eventsUrl: 'https://www.mountainlakeslibrary.org/events', city: 'Mountain Lakes', state: 'NJ', zipCode: '07046', county: 'Morris'},
  { name: 'Mountainside Free Public Library', url: 'https://www.mountainsidelibrary.org/', eventsUrl: 'https://www.mountainsidelibrary.org/', city: 'Mountainside', state: 'NJ', zipCode: '07092', county: 'Union'},
  { name: 'New Milford Public Library', url: 'https://newmilfordlibrary.org/', eventsUrl: 'https://newmilfordlibrary.org/', city: 'New Milford', state: 'NJ', zipCode: '07646', county: 'Bergen'},
  { name: 'New Providence Memorial Library', url: 'https://www.newprovidencelibrary.org/', eventsUrl: 'https://www.newprovidencelibrary.org/', city: 'New Providence', state: 'NJ', zipCode: '07974', county: 'Union'},
  { name: 'Sussex County Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NJ', zipCode: '07860', county: 'Sussex'},
  { name: 'North Arlington Public Library', url: 'https://www.northarlingtonlibrary.org', eventsUrl: 'https://www.northarlingtonlibrary.org/events', city: 'North Arlington', state: 'NJ', zipCode: '07031', county: 'Bergen'},
  { name: 'North Brunswick Free Public Library', url: 'https://northbrunswicklibrary.org/', eventsUrl: 'https://northbrunswicklibrary.org/', city: 'North Brunswick', state: 'NJ', zipCode: '08902', county: 'Middlesex'},
  { name: 'North Haledon Free Public Library', url: 'https://www.northhaledonlibrary.org', eventsUrl: 'https://www.northhaledonlibrary.org/events', city: 'North Haledon', state: 'NJ', zipCode: '07508', county: 'Passaic'},
  { name: 'Norwood Public Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'NJ', zipCode: '07648', county: 'Bergen'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'NJ', zipCode: '07436', county: 'Bergen'},
  { name: 'Ocean City Free Public Library', url: 'https://www.oceancitylibrary.org/', eventsUrl: 'https://www.oceancitylibrary.org/', city: 'Ocean City', state: 'NJ', zipCode: '08226', county: 'Cape May'},
  { name: 'Old Bridge Public Library', url: 'https://www.oldbridgelibrary.org', eventsUrl: 'https://www.oldbridgelibrary.org/events', city: 'Old Bridge', state: 'NJ', zipCode: '08857', county: 'Middlesex'},
  { name: 'Old Tappan Free Public Library', url: 'https://www.oldtappanlibrary.com/', eventsUrl: 'https://www.oldtappanlibrary.com/calendar', city: 'Old Tappan', state: 'NJ', zipCode: '07675', county: 'Bergen'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in WI, not NJ. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'NJ', zipCode: '07863', county: 'Warren'},
  { name: 'Palisades Park Free Public Library', url: 'https://www.palisadesparklibrary.org', eventsUrl: 'https://www.palisadesparklibrary.org/events', city: 'Palisades Park', state: 'NJ', zipCode: '07650', county: 'Bergen'},
  { name: 'Paramus Public Library', url: 'https://www.paramuslibrary.org', eventsUrl: 'https://www.paramuslibrary.org/events', city: 'Paramus', state: 'NJ', zipCode: '07652', county: 'Bergen'},
  { name: 'Park Ridge Free Public Library', url: 'https://www.parkridgelibrary.org/', eventsUrl: 'https://www.parkridgelibrary.org/', city: 'Park Ridge', state: 'NJ', zipCode: '07656', county: 'Bergen'},
  { name: 'Parsippany-Troy Hills Public Library', url: 'https://www.parsippanylibrary.org', eventsUrl: 'https://www.parsippanylibrary.org/events', city: 'Parsippany', state: 'NJ', zipCode: '07054', county: 'Morris'},
  { name: 'Passaic Public Library', url: 'https://www.passaicpubliclibrary.org/', eventsUrl: 'https://www.passaicpubliclibrary.org/', city: 'Passaic', state: 'NJ', zipCode: '07055', county: 'Passaic County'},
  { name: 'Pennington Free Public Library', url: 'https://www.penningtonlibrary.org', eventsUrl: 'https://www.penningtonlibrary.org/events', city: 'Pennington', state: 'NJ', zipCode: '08534', county: 'Mercer'},
  { name: 'Pennsauken Free Public Library', url: 'https://www.pennsaukenlibrary.org', eventsUrl: 'https://www.pennsaukenlibrary.org/events', city: 'Pennsauken', state: 'NJ', zipCode: '08110', county: 'Camden'},
  { name: 'Pennsville Public Library', url: 'https://www.pennsvillelibrary.org', eventsUrl: 'https://www.pennsvillelibrary.org/events', city: 'Pennsville', state: 'NJ', zipCode: '08070', county: 'Salem'},
  { name: 'Piscataway Public Library', url: 'https://www.piscatawaylibrary.org', eventsUrl: 'https://www.piscatawaylibrary.org/events', city: 'Piscataway', state: 'NJ', zipCode: '08854', county: 'Middlesex'},
  // URL corrected 2026-08-11 (was plainfieldlibrary.org): fetched site: 800 Park Avenue Plainfield NJ 07060, phone 908-757-1111
  { name: 'Plainfield Free Public Library', url: 'https://plainfieldlibrarynj.org', eventsUrl: 'https://plainfieldnj.librarycalendar.com/events/month', city: 'Plainfield', state: 'NJ', zipCode: '07060', county: 'Union'},
  { name: 'Plainsboro Free Public Library', url: 'https://www.plainsborolibrary.org', eventsUrl: 'https://www.plainsborolibrary.org/events', city: 'Plainsboro', state: 'NJ', zipCode: '08536', county: 'Middlesex'},
  { name: 'Pompton Lakes Borough Free Public Library', url: 'https://www.pomptonlakeslibrary.org/', eventsUrl: 'https://www.pomptonlakeslibrary.org/', city: 'Pompton Lakes', state: 'NJ', zipCode: '07442', county: 'Passaic'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'NJ', zipCode: '08542', county: 'Mercer'},
  { name: 'Rahway Public Library', url: 'https://www.rahwaylibrary.org/', eventsUrl: 'https://www.rahwaylibrary.org/', city: 'Rahway', state: 'NJ', zipCode: '07065', county: 'Union'},
  { name: 'Ramsey Free Public Library', url: 'https://www.ramseylibrary.org', eventsUrl: 'https://www.ramseylibrary.org/events', city: 'Ramsey', state: 'NJ', zipCode: '07446', county: 'Bergen'},
  { name: 'Red Bank Public Library', url: 'https://www.redbanklibrary.org/', eventsUrl: 'https://www.redbanklibrary.org/calendar', city: 'Red Bank', state: 'NJ', zipCode: '07701', county: 'Monmouth'},
  { name: 'Ridgefield Free Public Library', url: 'https://ridgefieldlibrary.org/', eventsUrl: 'https://ridgefieldlibrary.org/', city: 'Ridgefield', state: 'NJ', zipCode: '07657', county: 'Bergen'},
  { name: 'Ridgewood Public Library', url: 'https://ridgewoodlibrary.org/', eventsUrl: 'https://ridgewoodlibrary.org/', city: 'Ridgewood', state: 'NJ', zipCode: '07450', county: 'Bergen'},
  { name: 'Ringwood Public Library', url: 'https://www.ringwoodlibrary.org', eventsUrl: 'https://www.ringwoodlibrary.org/events', city: 'Ringwood', state: 'NJ', zipCode: '07456', county: 'Passaic'},
  { name: 'River Vale Public Library', url: 'https://www.rivervalelibrary.org/', eventsUrl: 'https://www.rivervalelibrary.org/calendar', city: 'River Vale', state: 'NJ', zipCode: '07675', county: 'Bergen'},
  { name: 'Riverdale Public Library', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'NJ', zipCode: '07457', county: 'Morris'},
  { name: 'Riverside Public Library', url: 'https://www.riversidelibrary.org', eventsUrl: 'https://www.riversidelibrary.org/events', city: 'Riverside', state: 'NJ', zipCode: '08075', county: 'Burlington'},
  { name: 'Roseland Free Public Library', url: 'https://www.roselandlibrary.org', eventsUrl: 'https://www.roselandlibrary.org/events', city: 'Roseland', state: 'NJ', zipCode: '07068', county: 'Essex'},
  { name: 'Roselle Free Public Library', url: 'https://www.rosellelibrary.org', eventsUrl: 'https://www.rosellelibrary.org/events', city: 'Roselle', state: 'NJ', zipCode: '07203', county: 'Union'},
  { name: 'Roselle Park Veterans Memorial Library', url: 'https://www.roselleparklibrary.org', eventsUrl: 'https://www.roselleparklibrary.org/events', city: 'Roselle Park', state: 'NJ', zipCode: '07204', county: 'Union'},
  { name: 'Runnemede Public Library', url: 'https://www.runnemedelibrary.org', eventsUrl: 'https://www.runnemedelibrary.org/events', city: 'Runnemede', state: 'NJ', zipCode: '08078', county: 'Camden'},
  { name: 'Rutherford Free Public Library', url: 'https://www.rutherfordlibrary.org', eventsUrl: 'https://www.rutherfordlibrary.org/events', city: 'Rutherford', state: 'NJ', zipCode: '07070', county: 'Bergen'},
  { name: 'Saddle Brook Free Public Library', url: 'https://saddlebrooklibrary.org/', eventsUrl: 'https://saddlebrooklibrary.org/', city: 'Saddle Brook', state: 'NJ', zipCode: '07663', county: 'Bergen'},
  { name: 'Salem Free Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'NJ', zipCode: '08079', county: 'Salem County'},
  { name: 'Scotch Plains Public Library', url: 'https://www.scotchplainslibrary.org', eventsUrl: 'https://www.scotchplainslibrary.org/events', city: 'Scotch Plains', state: 'NJ', zipCode: '07076', county: 'Union'},
  { name: 'Secaucus Free Public Library', url: 'https://www.secaucuslibrary.org', eventsUrl: 'https://www.secaucuslibrary.org/events', city: 'Secaucus', state: 'NJ', zipCode: '07094', county: 'Hudson'},
  { name: 'Franklin Twp Public Library-Somerset', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'NJ', zipCode: '08873', county: 'Somerset County'},
  { name: 'Dowdell Library Of South Amboy', url: 'https://www.southamboylibrary.org', eventsUrl: 'https://www.southamboylibrary.org/events', city: 'South Amboy', state: 'NJ', zipCode: '08879', county: 'Middlesex'},
  { name: 'South River Public Library', url: 'https://www.southriverlibrary.org', eventsUrl: 'https://www.southriverlibrary.org/events', city: 'South River', state: 'NJ', zipCode: '08882', county: 'Middlesex'},
  { name: 'Sparta Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'NJ', zipCode: '07871', county: 'Sussex'},
  { name: 'Spring Lake Public Library', url: 'https://www.springlakelibrary.org', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Spring Lake', state: 'NJ', zipCode: '07762', county: 'Monmouth'},
  { name: 'Springfield Free Public Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'NJ', zipCode: '07081', county: 'Union'},
  { name: 'Stratford Public Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'NJ', zipCode: '08084', county: 'Camden'},
  { name: 'Summit Free Public Library', url: 'https://www.summitlibrary.org/', eventsUrl: 'https://www.summitlibrary.org/', city: 'Summit', state: 'NJ', zipCode: '07901', county: 'Union'},
  { name: 'Teaneck Public Library', url: 'https://www.teanecklibrary.org', eventsUrl: 'https://www.teanecklibrary.org/events', city: 'Teaneck', state: 'NJ', zipCode: '07666', county: 'Bergen'},
  { name: 'Tenafly Free Public Library', url: 'https://www.tenaflylibrary.org/', eventsUrl: 'https://www.tenaflylibrary.org/calendar', city: 'Tenafly', state: 'NJ', zipCode: '07670', county: 'Bergen'},
  { name: 'Dwight D. Eisenhower Library', url: 'https://www.totowalibrary.org', eventsUrl: 'https://www.totowalibrary.org/events', city: 'Totowa', state: 'NJ', zipCode: '07512', county: 'Passaic'},
  { name: 'Union Free Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'NJ', zipCode: '07083', county: 'Union County'},
  { name: 'Verona Free Public Library', url: 'https://www.veronalibrary.org', eventsUrl: 'https://www.veronalibrary.org/events', city: 'Verona', state: 'NJ', zipCode: '07044', county: 'Essex'},
  { name: 'Sally Stretch Keen Memorial Library', url: 'https://www.vincentownlibrary.org', eventsUrl: 'https://www.vincentownlibrary.org/events', city: 'Vincentown', state: 'NJ', zipCode: '08088', county: 'Burlington'},
  { name: 'Vineland Public Library', url: 'https://www.vinelandlibrary.org', eventsUrl: 'https://www.vinelandlibrary.org/events', city: 'Vineland', state: 'NJ', zipCode: '08360', county: 'Cumberland'},
  { name: 'Waldwick Public Library', url: 'https://www.waldwicklibrary.org/', eventsUrl: 'https://www.waldwicklibrary.org/library-events', city: 'Waldwick', state: 'NJ', zipCode: '07463', county: 'Bergen'},
  { name: 'Wanaque Borough Free Public Library', url: 'https://www.wanaquelibrary.org', eventsUrl: 'https://www.wanaquelibrary.org/events', city: 'Wanaque', state: 'NJ', zipCode: '07465', county: 'Passaic'},
  { name: 'West Orange Free Public Library', url: 'https://www.westorangelibrary.org/', eventsUrl: 'https://www.westorangelibrary.org/', city: 'West Orange', state: 'NJ', zipCode: '07052', county: 'Essex'},
  // URL corrected 2026-08-11 (was westfieldlibrary.org): site is JS-rendered so fetch returned empty; listing confirms 550 East Broad St Westfield NJ, phone 908-789-4090
  { name: 'Westfield Memorial Library', url: 'https://wmlnj.org', eventsUrl: 'https://wmlnj.org', city: 'Westfield', state: 'NJ', zipCode: '07090', county: 'Union'},
  { name: 'Westwood Free Public Library', url: 'https://www.westwoodlibrary.org', eventsUrl: 'https://www.westwoodlibrary.org/events', city: 'Westwood', state: 'NJ', zipCode: '07675', county: 'Bergen'},
  { name: 'Wharton Public Library', url: 'https://www.whartonlibrary.org', eventsUrl: 'https://www.whartonlibrary.org/events', city: 'Wharton', state: 'NJ', zipCode: '07885', county: 'Morris'},
  { name: 'Monroe Twp Public Library-Gloucester', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'NJ', zipCode: '08094', county: 'Gloucester'},
  { name: 'Wood-Ridge Memorial Library', url: 'https://www.woodridgelibrary.org', eventsUrl: 'https://www.woodridgelibrary.org/events', city: 'Wood-Ridge', state: 'NJ', zipCode: '07075', county: 'Bergen'},
  { name: 'Woodbridge Public Library', url: 'https://www.woodbridgelibrary.org/', eventsUrl: 'https://www.woodbridgelibrary.org/calendar.aspx', city: 'Woodbridge', state: 'NJ', zipCode: '07095', county: 'Middlesex'},
  { name: 'Woodbury Public Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'NJ', zipCode: '08096', county: 'Gloucester'},
  { name: 'Woodstown-Pilesgrove Library', url: 'https://www.woodstownlibrary.org/', eventsUrl: 'https://www.woodstownlibrary.org/', city: 'Woodstown', state: 'NJ', zipCode: '08098', county: 'Salem'},
  { name: 'Wyckoff Free Public Library', url: 'https://www.wyckofflibrary.org', eventsUrl: 'https://www.wyckofflibrary.org/events', city: 'Wyckoff', state: 'NJ', zipCode: '07481', county: 'Bergen'}
];

const SCRAPER_NAME = 'wordpress-NJ';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    try {
      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', platform: 'generic', state: 'NJ', city: library.city, zipCode: library.zipCode, needsReview: true }}));
        continue;
      }
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // REST API can be reachable-but-403 even on a genuinely TEC-powered
      // site — tryFetchTecEvents() already returned null above in that case.
      // Try TEC's own DOM structure before falling back to fully generic
      // selectors, which can't tell a real event card from the calendar's
      // own day-heading badge on TEC's list-view markup (found 2026-08-08 on
      // WordPress-GA/New Georgia Public Library — see tec-rest-helper.js).
      const domTecEvents = await tryDomScrapeTecEvents(page, library.name);
      if (domTecEvents && domTecEvents.length > 0) {
        domTecEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'wordpress-tec-dom',
            state: 'NJ',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Structured schema.org data beats any DOM guess, so try it before scraping markup.
      // Found 2026-08-09: 20 of the family's open MISMATCH bugs sit on pages that already
      // publish <script type="application/ld+json"> Event objects — 59 on Brownell, 107 on
      // Brandywine Zoo — which the generic selectors below miss entirely. startDate is a
      // real ISO timestamp, so this also avoids the time-only values behind this family's
      // InvalidDate counts, and location.address geocodes to the venue not a centroid.
      const jsonLdEvents = extractJsonLdEvents(await page.content(), library.name);
      if (jsonLdEvents.length > 0) {
        jsonLdEvents.forEach(event => events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'jsonld',
            state: event.state || library.state || 'NJ',
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

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

        // Calendar-grid sites render each day as a day-cell container
        // carrying the real date, while individual event cards inside only
        // show a clock time with no day/month at all. Walk up from the
        // event card looking for that ancestor date before giving up.
        // Confirmed live 2026-07-20 on ypl.org/events (same platform
        // family): <div class="calendar__day" data-date="2026-06-28">
        // <h2 class="calendar__day-header">Sunday, June 28, 2026</h2>...
        function findAncestorDate(el) {
          let node = el;
          for (let i = 0; i < 8 && node; i++) {
            if (node.getAttribute) {
              const attr = node.getAttribute('data-date') || node.getAttribute('data-current_date') || node.getAttribute('data-day');
              if (attr && /\d{4}-\d{1,2}-\d{1,2}/.test(attr)) return attr;
              const header = node.querySelector && node.querySelector('.calendar__day-header, [class*="day-header"]');
              if (header && header.textContent.trim()) return header.textContent.trim();
            }
            node = node.parentElement;
          }
          return null;
        }

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
                let dateText = possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '';
                if (!/[A-Za-z]{3,9}\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/.test(dateText)) {
                  const ancestorDate = findAncestorDate(card);
                  if (ancestorDate) dateText = dateText ? `${ancestorDate} ${dateText}` : ancestorDate;
                }
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: dateText,
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
            state: 'NJ',
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
    } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }

  await browser.close();
  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NJ',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  New Jersey Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressNJCloudFunction() {
  console.log('☁️ Running WordPress NJ as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NJ', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-NJ', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNJCloudFunction };
