const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * New Jersey Public Libraries Scraper - Coverage: All New Jersey public libraries
 */
const LIBRARIES = [
  { name: 'Lee Memorial Library', url: 'https://www.allendalelibrary.org', eventsUrl: 'https://www.allendalelibrary.org/events', city: 'Allendale', state: 'NJ', zipCode: '07401', county: 'Allendale County'},
  { name: 'Asbury Park Free Public Library', url: 'https://www.asburyparklibrary.org/', eventsUrl: 'https://www.asburyparklibrary.org/', city: 'Asbury Park', state: 'NJ', zipCode: '07712', county: 'Asbury Park County'},
  { name: 'Atlantic City Free Public Library', url: 'https://www.atlanticcitylibrary.org', eventsUrl: 'https://www.atlanticcitylibrary.org/events', city: 'Atlantic City', state: 'NJ', zipCode: '08401', county: 'Atlantic City County'},
  { name: 'Audubon Free Public Library', url: 'https://www.audubonlibrary.org', eventsUrl: 'https://www.audubonlibrary.org/events', city: 'Audubon', state: 'NJ', zipCode: '08106', county: 'Audubon County'},
  { name: 'Avalon Free Public Library', url: 'https://avalonlibrary.org/', eventsUrl: 'https://avalonlibrary.org/', city: 'Avalon', state: 'NJ', zipCode: '08202', county: 'Avalon County'},
  { name: 'Bayonne Free Public Library', url: 'https://www.bayonnelibrary.org', eventsUrl: 'https://www.bayonnelibrary.org/events', city: 'Bayonne', state: 'NJ', zipCode: '07002', county: 'Bayonne County'},
  { name: 'Beach Haven Free Public Library', url: 'https://www.beachhavenlibrary.org', eventsUrl: 'https://www.beachhavenlibrary.org/events', city: 'Beach Haven', state: 'NJ', zipCode: '08008', county: 'Beach Haven County'},
  { name: 'Belleville Public Library', url: 'https://bellevillelibrary.org/', eventsUrl: 'https://bellevillelibrary.org/', city: 'Belleville', state: 'NJ', zipCode: '07109', county: 'Belleville County'},
  { name: 'Belmar Public Library', url: 'https://www.belmarlibrary.org', eventsUrl: 'https://www.belmarlibrary.org/events', city: 'Belmar', state: 'NJ', zipCode: '07719', county: 'Belmar County'},
  { name: 'Bergenfield Free Public Library', url: 'https://www.bergenfieldlibrary.org/', eventsUrl: 'https://www.bergenfieldlibrary.org/calendar/', city: 'Bergenfield', state: 'NJ', zipCode: '07621', county: 'Bergenfield County'},
  { name: 'Marie Fleche Memorial Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'NJ', zipCode: '08009', county: 'Berlin County'},
  { name: 'Bernardsville Public Library', url: 'https://www.bernardsvillelibrary.org', eventsUrl: 'https://www.bernardsvillelibrary.org/events', city: 'Bernardsville', state: 'NJ', zipCode: '07924', county: 'Bernardsville County'},
  { name: 'Beverly Free Library', url: 'https://www.beverlylibrary.org', eventsUrl: 'https://www.beverlylibrary.org/events', city: 'Beverly', state: 'NJ', zipCode: '08010', county: 'Beverly County'},
  { name: 'Bloomingdale Free Public Library', url: 'https://www.bloomingdalelibrary.org/', eventsUrl: 'https://www.bloomingdalelibrary.org/', city: 'Bloomingdale', state: 'NJ', zipCode: '07403', county: 'Bloomingdale County'},
  { name: 'Boonton Holmes Public Library', url: 'https://www.boontonlibrary.org', eventsUrl: 'https://www.boontonlibrary.org/events', city: 'Boonton', state: 'NJ', zipCode: '07005', county: 'Boonton County'},
  { name: 'Bradley Beach Public Library', url: 'https://bradleybeachlibrary.org/', eventsUrl: 'https://bradleybeachlibrary.org/', city: 'Bradley Beach', state: 'NJ', zipCode: '07720', county: 'Bradley Beach County'},
  { name: 'Bridgeton Free Public Library', url: 'https://bridgetonlibrary.org/', eventsUrl: 'https://bridgetonlibrary.org/', city: 'Bridgeton', state: 'NJ', zipCode: '08302', county: 'Bridgeton County'},
  { name: 'Library Company Of Burlington', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'NJ', zipCode: '08016', county: 'Burlington County'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'NJ', zipCode: '07405', county: 'Butler County'},
  { name: 'Camden Free Public Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'NJ', zipCode: '08103', county: 'Camden County'},
  { name: 'William E. Dermody Free Public Library', url: 'https://carlstadtlibrary.org/', eventsUrl: 'https://carlstadtlibrary.org/', city: 'Carlstadt', state: 'NJ', zipCode: '07072', county: 'Carlstadt County'},
  { name: 'Carteret Free Public Library', url: 'https://www.carteretlibrary.org', eventsUrl: 'https://www.carteretlibrary.org/events', city: 'Carteret', state: 'NJ', zipCode: '07008', county: 'Carteret County'},
  { name: 'Cedar Grove Free Public Library', url: 'https://www.cedargrovelibrary.org', eventsUrl: 'https://www.cedargrovelibrary.org/events', city: 'Cedar Grove', state: 'NJ', zipCode: '07009', county: 'Cedar Grove County'},
  { name: 'Chathams Joint Free Public Library', url: 'https://chathamlibrary.librarycalendar.com/', eventsUrl: 'https://chathamlibrary.librarycalendar.com/events/month/', city: 'Chatham', state: 'NJ', zipCode: '07928', county: 'Chatham County'},
  { name: 'Chester Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'NJ', zipCode: '07930', county: 'Chester County'},
  { name: 'Clark Public Library', url: 'https://www.clarklibrary.org', eventsUrl: 'https://www.clarklibrary.org/events', city: 'Clark', state: 'NJ', zipCode: '07066', county: 'Clark County'},
  { name: 'Cliffside Park Free Public Library', url: 'https://www.cliffsideparklibrary.org', eventsUrl: 'https://www.cliffsideparklibrary.org/events', city: 'Cliffside Park', state: 'NJ', zipCode: '07010', county: 'Cliffside Park County'},
  { name: 'Cranford Public Library', url: 'https://www.cranfordlibrary.org/', eventsUrl: 'https://www.cranfordlibrary.org/calendar/', city: 'Cranford', state: 'NJ', zipCode: '07016', county: 'Cranford County'},
  { name: 'Cresskill Public Library', url: 'https://www.cresskilllibrary.org/', eventsUrl: 'https://www.cresskilllibrary.org/', city: 'Cresskill', state: 'NJ', zipCode: '07626', county: 'Cresskill County'},
  { name: 'Crosswicks Library Company', url: 'https://www.crosswickslibrary.org/', eventsUrl: 'https://www.crosswickslibrary.org/', city: 'Crosswicks', state: 'NJ', zipCode: '08015', county: 'Crosswicks County'},
  { name: 'Delanco Public Library', url: 'https://www.delancolibrary.org/', eventsUrl: 'https://www.delancolibrary.org/', city: 'Delanco', state: 'NJ', zipCode: '08075', county: 'Delanco County'},
  { name: 'Demarest Public Library Association', url: 'https://www.demarestlibrary.org/', eventsUrl: 'https://www.demarestlibrary.org/calendar/', city: 'Demarest', state: 'NJ', zipCode: '07627', county: 'Demarest County'},
  { name: 'Denville Free Public Library', url: 'https://www.denvillelibrary.org/', eventsUrl: 'https://www.denvillelibrary.org/', city: 'Denville', state: 'NJ', zipCode: '07834', county: 'Denville County'},
  { name: 'Dover Free Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'NJ', zipCode: '07801', county: 'Dover County'},
  { name: 'Dixon Homestead Library', url: 'https://www.dumontlibrary.org/', eventsUrl: 'https://www.dumontlibrary.org/', city: 'Dumont', state: 'NJ', zipCode: '07628', county: 'Dumont County'},
  { name: 'Dunellen Free Public Library', url: 'https://www.dunellenlibrary.org', eventsUrl: 'https://www.dunellenlibrary.org/events', city: 'Dunellen', state: 'NJ', zipCode: '08812', county: 'Dunellen County'},
  { name: 'Edgewater Free Public Library', url: 'https://www.edgewaterlibrary.org', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'NJ', zipCode: '07020', county: 'Edgewater County'},
  { name: 'Elmwood Park Free Public Library', url: 'https://www.elmwoodparklibrary.org', eventsUrl: 'https://www.elmwoodparklibrary.org/events', city: 'Elmwood Park', state: 'NJ', zipCode: '07407', county: 'Elmwood Park County'},
  { name: 'Emerson Public Library', url: 'https://www.emersonlibrary.com/', eventsUrl: 'https://www.emersonlibrary.com/', city: 'Emerson', state: 'NJ', zipCode: '07630', county: 'Emerson County'},
  { name: 'Englewood Free Public Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'NJ', zipCode: '07631', county: 'Englewood County'},
  { name: 'Fair Haven Public Library', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fair Haven', state: 'NJ', zipCode: '07704', county: 'Fair Haven County'},
  { name: 'Maurice M. Pine Free Public Library', url: 'https://www.fairlawnlibrary.org/', eventsUrl: 'https://www.fairlawnlibrary.org/calendar', city: 'Fair Lawn', state: 'NJ', zipCode: '07410', county: 'Fair Lawn County'},
  { name: 'Anthony Pio Costa Memorial Library', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'NJ', zipCode: '07004', county: 'Fairfield County'},
  { name: 'Fairview Free Public Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'NJ', zipCode: '07022', county: 'Fairview County'},
  { name: 'Fanwood Memorial Library', url: 'https://fanwoodlibrary.org/', eventsUrl: 'https://fanwoodlibrary.org/', city: 'Fanwood', state: 'NJ', zipCode: '07023', county: 'Fanwood County'},
  { name: 'Flemington Free Public Library', url: 'https://www.flemingtonlibrary.org', eventsUrl: 'https://www.flemingtonlibrary.org/events', city: 'Flemington', state: 'NJ', zipCode: '08822', county: 'Flemington County'},
  { name: 'Fort Lee Free Public Library', url: 'https://www.fortleelibrary.org', eventsUrl: 'https://www.fortleelibrary.org/events', city: 'Fort Lee', state: 'NJ', zipCode: '07024', county: 'Fort Lee County'},
  { name: 'Franklin Lakes Free Public Library', url: 'https://www.franklinlakeslibrary.org', eventsUrl: 'https://www.franklinlakeslibrary.org/events', city: 'Franklin Lakes', state: 'NJ', zipCode: '07417', county: 'Franklin Lakes County'},
  { name: 'Franklin Twp Public Library-Gloucester', url: 'https://franklinvillelibrary.org/', eventsUrl: 'https://franklinvillelibrary.org/', city: 'Franklinville', state: 'NJ', zipCode: '08322', county: 'Franklinville County'},
  { name: 'Glen Ridge Free Public Library', url: 'https://www.glenridgelibrary.org/', eventsUrl: 'https://www.glenridgelibrary.org/', city: 'Glen Ridge', state: 'NJ', zipCode: '07028', county: 'Glen Ridge County'},
  { name: 'Glen Rock Public Library', url: 'https://www.glenrocklibrary.org/', eventsUrl: 'https://www.glenrocklibrary.org/', city: 'Glen Rock', state: 'NJ', zipCode: '07452', county: 'Glen Rock County'},
  { name: 'Gloucester City Library', url: 'https://www.gloucestercitylibrary.org', eventsUrl: 'https://www.gloucestercitylibrary.org/events', city: 'Gloucester City', state: 'NJ', zipCode: '08030', county: 'Gloucester City County'},
  { name: 'Hackettstown Free Public Library', url: 'https://www.hackettstownlibrary.org', eventsUrl: 'https://www.hackettstownlibrary.org/events', city: 'Hackettstown', state: 'NJ', zipCode: '07840', county: 'Hackettstown County'},
  { name: 'Haddonfield Public Library', url: 'https://www.haddonfieldlibrary.org/', eventsUrl: 'https://www.haddonfieldlibrary.org/', city: 'Haddonfield', state: 'NJ', zipCode: '08033', county: 'Haddonfield County'},
  { name: 'Hamilton Township Free Public Library', url: 'https://hamiltonlibrary.org/', eventsUrl: 'https://hamiltonlibrary.org/', city: 'Hamilton', state: 'NJ', zipCode: '08619', county: 'Hamilton County'},
  { name: 'Harrison Public Library', url: 'https://www.harrisonpl.org/', eventsUrl: 'https://www.harrisonpl.org/', city: 'Harrison', state: 'NJ', zipCode: '07029', county: 'Harrison County'},
  { name: 'Hasbrouck Heights Free Public Library', url: 'https://www.hasbrouckheightslibrary.org', eventsUrl: 'https://www.hasbrouckheightslibrary.org/events', city: 'Hasbrouck Heights', state: 'NJ', zipCode: '07604', county: 'Hasbrouck Heights County'},
  { name: 'Haworth Municipal Library', url: 'https://www.haworthlibrary.org/', eventsUrl: 'https://www.haworthlibrary.org/', city: 'Haworth', state: 'NJ', zipCode: '07641', county: 'Haworth County'},
  { name: 'Louis Bay 2nd Library', url: 'https://www.hawthornelibrary.org', eventsUrl: 'https://www.hawthornelibrary.org/events', city: 'Hawthorne', state: 'NJ', zipCode: '07506', county: 'Hawthorne County'},
  { name: 'Hillsdale Free Public Library', url: 'https://www.cityofsanmateo.org/', eventsUrl: 'https://www.cityofsanmateo.org/507/Library', city: 'Hillsdale', state: 'NJ', zipCode: '07642', county: 'Hillsdale County'},
  { name: 'Hillside Free Public Library', url: 'https://www.hillsidelibrary.org', eventsUrl: 'https://www.hillsidelibrary.org/events', city: 'Hillside', state: 'NJ', zipCode: '07205', county: 'Hillside County'},
  { name: 'Worth Pinkham Memorial Library', url: 'https://www.hohokuslibrary.org', eventsUrl: 'https://www.hohokuslibrary.org/events', city: 'Ho-Ho-Kus', state: 'NJ', zipCode: '07423', county: 'Ho-Ho-Kus County'},
  { name: 'Hoboken Public Library', url: 'https://www.hobokenlibrary.org', eventsUrl: 'https://www.hobokenlibrary.org/events', city: 'Hoboken', state: 'NJ', zipCode: '07030', county: 'Hoboken County'},
  { name: 'Irvington Public Library', url: 'https://irvingtonlibrary.org/', eventsUrl: 'https://irvingtonlibrary.org/', city: 'Irvington', state: 'NJ', zipCode: '07111', county: 'Irvington County'},
  { name: 'Jamesburg Public Library', url: 'https://jamesburglibrary.org/', eventsUrl: 'https://jamesburglibrary.org/', city: 'Jamesburg', state: 'NJ', zipCode: '08831', county: 'Jamesburg County'},
  { name: 'Kearny Public Library', url: 'https://www.kearnylibrary.org', eventsUrl: 'https://www.kearnylibrary.org/events', city: 'Kearny', state: 'NJ', zipCode: '07032', county: 'Kearny County'},
  { name: 'Kenilworth Public Library', url: 'https://kenilworthlibrary.org/', eventsUrl: 'https://kenilworthlibrary.org/', city: 'Kenilworth', state: 'NJ', zipCode: '07033', county: 'Kenilworth County'},
  { name: 'Keyport Free Public Library', url: 'https://www.keyportlibrary.org', eventsUrl: 'https://www.keyportlibrary.org/events', city: 'Keyport', state: 'NJ', zipCode: '07735', county: 'Keyport County'},
  { name: 'Kinnelon Public Library', url: 'https://kinnelonlibrary.org/', eventsUrl: 'https://kinnelonlibrary.org/calendar/', city: 'Kinnelon', state: 'NJ', zipCode: '07405', county: 'Kinnelon County'},
  { name: 'Lambertville Free Public Library', url: 'https://www.lambertvillelibrary.org', eventsUrl: 'https://www.lambertvillelibrary.org/events', city: 'Lambertville', state: 'NJ', zipCode: '08530', county: 'Lambertville County'},
  { name: 'Leonia Public Library', url: 'https://www.leonialibrary.org', eventsUrl: 'https://www.leonialibrary.org/events', city: 'Leonia', state: 'NJ', zipCode: '07605', county: 'Leonia County'},
  { name: 'Lincoln Park Public Library', url: 'https://www.lincolnparklibrary.org/', eventsUrl: 'https://www.lincolnparklibrary.org/calendar', city: 'Lincoln Park', state: 'NJ', zipCode: '07035', county: 'Lincoln Park County'},
  { name: 'Linwood Public Library', url: 'https://www.linwoodlibrary.org', eventsUrl: 'https://www.linwoodlibrary.org/events', city: 'Linwood', state: 'NJ', zipCode: '08221', county: 'Linwood County'},
  { name: 'Little Falls Public Library', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'NJ', zipCode: '07424', county: 'Little Falls County'},
  { name: 'Little Silver Public Library', url: 'https://www.littlesilverlibrary.org/', eventsUrl: 'https://www.littlesilverlibrary.org/', city: 'Little Silver', state: 'NJ', zipCode: '07739', county: 'Little Silver County'},
  { name: 'Ruth L. Rockwood Memorial Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'NJ', zipCode: '07039', county: 'Livingston County'},
  { name: 'Lyndhurst Free Public Library', url: 'https://lyndhurstlibrary.org/', eventsUrl: 'https://lyndhurstlibrary.org/', city: 'Lyndhurst', state: 'NJ', zipCode: '07071', county: 'Lyndhurst County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NJ', zipCode: '07940', county: 'Madison County'},
  { name: 'Maplewood Memorial Library', url: 'https://www.maplewoodlibrary.org/', eventsUrl: 'https://www.maplewoodlibrary.org/', city: 'Maplewood', state: 'NJ', zipCode: '07040', county: 'Maplewood County'},
  { name: 'Margate City Public Library', url: 'https://www.margatelibrary.org', eventsUrl: 'https://www.margatelibrary.org/events', city: 'Margate', state: 'NJ', zipCode: '08402', county: 'Margate County'},
  { name: 'Maywood Public Library', url: 'https://www.maywoodlibrary.org', eventsUrl: 'https://www.maywoodlibrary.org/events', city: 'Maywood', state: 'NJ', zipCode: '07607', county: 'Maywood County'},
  { name: 'Metuchen Public Library', url: 'https://www.metuchenlibrary.org/', eventsUrl: 'https://www.metuchenlibrary.org/calendar/', city: 'Metuchen', state: 'NJ', zipCode: '08840', county: 'Metuchen County'},
  { name: 'Middletown Township Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'NJ', zipCode: '07748', county: 'Middletown County'},
  { name: 'Midland Park Memorial Library', url: 'https://www.midlandparklibrary.org/', eventsUrl: 'https://www.midlandparklibrary.org/', city: 'Midland Park', state: 'NJ', zipCode: '07432', county: 'Midland Park County'},
  { name: 'Holland Township Free Public Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'NJ', zipCode: '08848', county: 'Milford County'},
  { name: 'Millburn Free Public Library', url: 'https://www.millburnlibrary.org', eventsUrl: 'https://www.millburnlibrary.org/events', city: 'Millburn', state: 'NJ', zipCode: '07041', county: 'Millburn County'},
  { name: 'Milltown Public Library', url: 'https://www.milltownlibrary.org/', eventsUrl: 'https://www.milltownlibrary.org/', city: 'Milltown', state: 'NJ', zipCode: '08850', county: 'Milltown County'},
  { name: 'Millville Public Library', url: 'https://www.millvillelibrary.org', eventsUrl: 'https://www.millvillelibrary.org/events', city: 'Millville', state: 'NJ', zipCode: '08332', county: 'Millville County'},
  { name: 'Monmouth Beach Public Library', url: 'https://monmouthbeachlibrary.org/', eventsUrl: 'https://monmouthbeachlibrary.org/', city: 'Monmouth Beach', state: 'NJ', zipCode: '07750', county: 'Monmouth Beach County'},
  { name: 'Monroe Twp Public Library-Middlesex', url: 'http://monroetpl.org/', eventsUrl: 'http://monroetpl.org/', city: 'Monroe Township', state: 'NJ', zipCode: '08831', county: 'Monroe Township County'},
  { name: 'Montclair Public Library', url: 'https://www.montclairlibrary.org', eventsUrl: 'https://www.montclairlibrary.org/events', city: 'Montclair', state: 'NJ', zipCode: '07042', county: 'Montclair County'},
  { name: 'Montville Township Public Library', url: 'https://montvillelibrary.org/', eventsUrl: 'https://montvillelibrary.org/', city: 'Montville', state: 'NJ', zipCode: '07045', county: 'Montville County'},
  { name: 'Moorestown Library', url: 'https://www.moorestownlibrary.org', eventsUrl: 'https://www.moorestownlibrary.org/events', city: 'Moorestown', state: 'NJ', zipCode: '08057', county: 'Moorestown County'},
  { name: 'Morris Plains Library', url: 'https://morrisplainslibrary.org/', eventsUrl: 'https://morrisplainslibrary.org/', city: 'Morris Plains', state: 'NJ', zipCode: '07950', county: 'Morris Plains County'},
  { name: 'Morristown-Morris Twp Joint Public Library', url: 'https://www.morristownlibrary.org', eventsUrl: 'https://www.morristownlibrary.org/events', city: 'Morristown', state: 'NJ', zipCode: '07960', county: 'Morristown County'},
  { name: 'Mount Arlington Public Library', url: 'https://mountarlingtonlibrary.org/', eventsUrl: 'https://mountarlingtonlibrary.org/', city: 'Mount Arlington', state: 'NJ', zipCode: '07856', county: 'Mount Arlington County'},
  { name: 'Mount Laurel Library', url: 'https://www.mountlaurellibrary.org', eventsUrl: 'https://www.mountlaurellibrary.org/events', city: 'Mount Laurel', state: 'NJ', zipCode: '08054', county: 'Mount Laurel County'},
  { name: 'Mountain Lakes Free Public Library', url: 'https://www.mountainlakeslibrary.org', eventsUrl: 'https://www.mountainlakeslibrary.org/events', city: 'Mountain Lakes', state: 'NJ', zipCode: '07046', county: 'Mountain Lakes County'},
  { name: 'Mountainside Free Public Library', url: 'https://www.mountainsidelibrary.org/', eventsUrl: 'https://www.mountainsidelibrary.org/', city: 'Mountainside', state: 'NJ', zipCode: '07092', county: 'Mountainside County'},
  { name: 'New Milford Public Library', url: 'https://newmilfordlibrary.org/', eventsUrl: 'https://newmilfordlibrary.org/', city: 'New Milford', state: 'NJ', zipCode: '07646', county: 'New Milford County'},
  { name: 'New Providence Memorial Library', url: 'https://www.newprovidencelibrary.org/', eventsUrl: 'https://www.newprovidencelibrary.org/', city: 'New Providence', state: 'NJ', zipCode: '07974', county: 'New Providence County'},
  { name: 'Newark Public Library', url: 'https://newarklibrary.org/', eventsUrl: 'https://newarklibrary.org/', city: 'Newark', state: 'NJ', zipCode: '07102', county: 'Newark County'},
  { name: 'Sussex County Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NJ', zipCode: '07860', county: 'Newton County'},
  { name: 'North Arlington Public Library', url: 'https://www.northarlingtonlibrary.org', eventsUrl: 'https://www.northarlingtonlibrary.org/events', city: 'North Arlington', state: 'NJ', zipCode: '07031', county: 'North Arlington County'},
  { name: 'North Brunswick Free Public Library', url: 'https://northbrunswicklibrary.org/', eventsUrl: 'https://northbrunswicklibrary.org/', city: 'North Brunswick', state: 'NJ', zipCode: '08902', county: 'North Brunswick County'},
  { name: 'North Haledon Free Public Library', url: 'https://www.northhaledonlibrary.org', eventsUrl: 'https://www.northhaledonlibrary.org/events', city: 'North Haledon', state: 'NJ', zipCode: '07508', county: 'North Haledon County'},
  { name: 'Norwood Public Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'NJ', zipCode: '07648', county: 'Norwood County'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'NJ', zipCode: '07436', county: 'Oakland County'},
  { name: 'Ocean City Free Public Library', url: 'https://www.oceancitylibrary.org/', eventsUrl: 'https://www.oceancitylibrary.org/', city: 'Ocean City', state: 'NJ', zipCode: '08226', county: 'Ocean City County'},
  { name: 'Old Bridge Public Library', url: 'https://www.oldbridgelibrary.org', eventsUrl: 'https://www.oldbridgelibrary.org/events', city: 'Old Bridge', state: 'NJ', zipCode: '08857', county: 'Old Bridge County'},
  { name: 'Old Tappan Free Public Library', url: 'https://www.oldtappanlibrary.com/', eventsUrl: 'https://www.oldtappanlibrary.com/calendar', city: 'Old Tappan', state: 'NJ', zipCode: '07675', county: 'Old Tappan County'},
  { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'NJ', zipCode: '07863', county: 'Oxford County'},
  { name: 'Palisades Park Free Public Library', url: 'https://www.palisadesparklibrary.org', eventsUrl: 'https://www.palisadesparklibrary.org/events', city: 'Palisades Park', state: 'NJ', zipCode: '07650', county: 'Palisades Park County'},
  { name: 'Paramus Public Library', url: 'https://www.paramuslibrary.org', eventsUrl: 'https://www.paramuslibrary.org/events', city: 'Paramus', state: 'NJ', zipCode: '07652', county: 'Paramus County'},
  { name: 'Park Ridge Free Public Library', url: 'https://www.parkridgelibrary.org/', eventsUrl: 'https://www.parkridgelibrary.org/', city: 'Park Ridge', state: 'NJ', zipCode: '07656', county: 'Park Ridge County'},
  { name: 'Parsippany-Troy Hills Public Library', url: 'https://www.parsippanylibrary.org', eventsUrl: 'https://www.parsippanylibrary.org/events', city: 'Parsippany', state: 'NJ', zipCode: '07054', county: 'Parsippany County'},
  { name: 'Passaic Public Library', url: 'https://www.passaicpubliclibrary.org/', eventsUrl: 'https://www.passaicpubliclibrary.org/', city: 'Passaic', state: 'NJ', zipCode: '07055', county: 'Passaic County'},
  { name: 'Pennington Free Public Library', url: 'https://www.penningtonlibrary.org', eventsUrl: 'https://www.penningtonlibrary.org/events', city: 'Pennington', state: 'NJ', zipCode: '08534', county: 'Pennington County'},
  { name: 'Pennsauken Free Public Library', url: 'https://www.pennsaukenlibrary.org', eventsUrl: 'https://www.pennsaukenlibrary.org/events', city: 'Pennsauken', state: 'NJ', zipCode: '08110', county: 'Pennsauken County'},
  { name: 'Pennsville Public Library', url: 'https://www.pennsvillelibrary.org', eventsUrl: 'https://www.pennsvillelibrary.org/events', city: 'Pennsville', state: 'NJ', zipCode: '08070', county: 'Pennsville County'},
  { name: 'Piscataway Public Library', url: 'https://www.piscatawaylibrary.org', eventsUrl: 'https://www.piscatawaylibrary.org/events', city: 'Piscataway', state: 'NJ', zipCode: '08854', county: 'Piscataway County'},
  { name: 'Plainfield Free Public Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'NJ', zipCode: '07060', county: 'Plainfield County'},
  { name: 'Plainsboro Free Public Library', url: 'https://www.plainsborolibrary.org', eventsUrl: 'https://www.plainsborolibrary.org/events', city: 'Plainsboro', state: 'NJ', zipCode: '08536', county: 'Plainsboro County'},
  { name: 'Pompton Lakes Borough Free Public Library', url: 'https://www.pomptonlakeslibrary.org/', eventsUrl: 'https://www.pomptonlakeslibrary.org/', city: 'Pompton Lakes', state: 'NJ', zipCode: '07442', county: 'Pompton Lakes County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'NJ', zipCode: '08542', county: 'Princeton County'},
  { name: 'Rahway Public Library', url: 'https://www.rahwaylibrary.org/', eventsUrl: 'https://www.rahwaylibrary.org/', city: 'Rahway', state: 'NJ', zipCode: '07065', county: 'Rahway County'},
  { name: 'Ramsey Free Public Library', url: 'https://www.ramseylibrary.org', eventsUrl: 'https://www.ramseylibrary.org/events', city: 'Ramsey', state: 'NJ', zipCode: '07446', county: 'Ramsey County'},
  { name: 'Randolph Township Free Public Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'NJ', zipCode: '07869', county: 'Randolph County'},
  { name: 'Red Bank Public Library', url: 'https://www.redbanklibrary.org/', eventsUrl: 'https://www.redbanklibrary.org/calendar', city: 'Red Bank', state: 'NJ', zipCode: '07701', county: 'Red Bank County'},
  { name: 'Ridgefield Free Public Library', url: 'https://ridgefieldlibrary.org/', eventsUrl: 'https://ridgefieldlibrary.org/', city: 'Ridgefield', state: 'NJ', zipCode: '07657', county: 'Ridgefield County'},
  { name: 'Ridgewood Public Library', url: 'https://ridgewoodlibrary.org/', eventsUrl: 'https://ridgewoodlibrary.org/', city: 'Ridgewood', state: 'NJ', zipCode: '07450', county: 'Ridgewood County'},
  { name: 'Ringwood Public Library', url: 'https://www.ringwoodlibrary.org', eventsUrl: 'https://www.ringwoodlibrary.org/events', city: 'Ringwood', state: 'NJ', zipCode: '07456', county: 'Ringwood County'},
  { name: 'River Vale Public Library', url: 'https://www.rivervalelibrary.org/', eventsUrl: 'https://www.rivervalelibrary.org/calendar', city: 'River Vale', state: 'NJ', zipCode: '07675', county: 'River Vale County'},
  { name: 'Riverdale Public Library', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'NJ', zipCode: '07457', county: 'Riverdale County'},
  { name: 'Riverside Public Library', url: 'https://www.riversidelibrary.org', eventsUrl: 'https://www.riversidelibrary.org/events', city: 'Riverside', state: 'NJ', zipCode: '08075', county: 'Riverside County'},
  { name: 'Roseland Free Public Library', url: 'https://www.roselandlibrary.org', eventsUrl: 'https://www.roselandlibrary.org/events', city: 'Roseland', state: 'NJ', zipCode: '07068', county: 'Roseland County'},
  { name: 'Roselle Free Public Library', url: 'https://www.rosellelibrary.org', eventsUrl: 'https://www.rosellelibrary.org/events', city: 'Roselle', state: 'NJ', zipCode: '07203', county: 'Roselle County'},
  { name: 'Roselle Park Veterans Memorial Library', url: 'https://www.roselleparklibrary.org', eventsUrl: 'https://www.roselleparklibrary.org/events', city: 'Roselle Park', state: 'NJ', zipCode: '07204', county: 'Roselle Park County'},
  { name: 'Runnemede Public Library', url: 'https://www.runnemedelibrary.org', eventsUrl: 'https://www.runnemedelibrary.org/events', city: 'Runnemede', state: 'NJ', zipCode: '08078', county: 'Runnemede County'},
  { name: 'Rutherford Free Public Library', url: 'https://www.rutherfordlibrary.org', eventsUrl: 'https://www.rutherfordlibrary.org/events', city: 'Rutherford', state: 'NJ', zipCode: '07070', county: 'Rutherford County'},
  { name: 'Saddle Brook Free Public Library', url: 'https://saddlebrooklibrary.org/', eventsUrl: 'https://saddlebrooklibrary.org/', city: 'Saddle Brook', state: 'NJ', zipCode: '07663', county: 'Saddle Brook County'},
  { name: 'Salem Free Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'NJ', zipCode: '08079', county: 'Salem County'},
  { name: 'Scotch Plains Public Library', url: 'https://www.scotchplainslibrary.org', eventsUrl: 'https://www.scotchplainslibrary.org/events', city: 'Scotch Plains', state: 'NJ', zipCode: '07076', county: 'Scotch Plains County'},
  { name: 'Secaucus Free Public Library', url: 'https://www.secaucuslibrary.org', eventsUrl: 'https://www.secaucuslibrary.org/events', city: 'Secaucus', state: 'NJ', zipCode: '07094', county: 'Secaucus County'},
  { name: 'Franklin Twp Public Library-Somerset', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'NJ', zipCode: '08873', county: 'Somerset County'},
  { name: 'Dowdell Library Of South Amboy', url: 'https://www.southamboylibrary.org', eventsUrl: 'https://www.southamboylibrary.org/events', city: 'South Amboy', state: 'NJ', zipCode: '08879', county: 'South Amboy County'},
  { name: 'South River Public Library', url: 'https://www.southriverlibrary.org', eventsUrl: 'https://www.southriverlibrary.org/events', city: 'South River', state: 'NJ', zipCode: '08882', county: 'South River County'},
  { name: 'Sparta Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'NJ', zipCode: '07871', county: 'Sparta County'},
  { name: 'Spring Lake Public Library', url: 'https://www.springlakelibrary.org', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Spring Lake', state: 'NJ', zipCode: '07762', county: 'Spring Lake County'},
  { name: 'Springfield Free Public Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'NJ', zipCode: '07081', county: 'Springfield County'},
  { name: 'Stratford Public Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'NJ', zipCode: '08084', county: 'Stratford County'},
  { name: 'Summit Free Public Library', url: 'https://www.summitlibrary.org/', eventsUrl: 'https://www.summitlibrary.org/', city: 'Summit', state: 'NJ', zipCode: '07901', county: 'Summit County'},
  { name: 'Teaneck Public Library', url: 'https://www.teanecklibrary.org', eventsUrl: 'https://www.teanecklibrary.org/events', city: 'Teaneck', state: 'NJ', zipCode: '07666', county: 'Teaneck County'},
  { name: 'Tenafly Free Public Library', url: 'https://www.tenaflylibrary.org/', eventsUrl: 'https://www.tenaflylibrary.org/calendar', city: 'Tenafly', state: 'NJ', zipCode: '07670', county: 'Tenafly County'},
  { name: 'Dwight D. Eisenhower Library', url: 'https://www.totowalibrary.org', eventsUrl: 'https://www.totowalibrary.org/events', city: 'Totowa', state: 'NJ', zipCode: '07512', county: 'Totowa County'},
  { name: 'Union Free Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'NJ', zipCode: '07083', county: 'Union County'},
  { name: 'Verona Free Public Library', url: 'https://www.veronalibrary.org', eventsUrl: 'https://www.veronalibrary.org/events', city: 'Verona', state: 'NJ', zipCode: '07044', county: 'Verona County'},
  { name: 'Sally Stretch Keen Memorial Library', url: 'https://www.vincentownlibrary.org', eventsUrl: 'https://www.vincentownlibrary.org/events', city: 'Vincentown', state: 'NJ', zipCode: '08088', county: 'Vincentown County'},
  { name: 'Vineland Public Library', url: 'https://www.vinelandlibrary.org', eventsUrl: 'https://www.vinelandlibrary.org/events', city: 'Vineland', state: 'NJ', zipCode: '08360', county: 'Vineland County'},
  { name: 'Waldwick Public Library', url: 'https://www.waldwicklibrary.org/', eventsUrl: 'https://www.waldwicklibrary.org/library-events', city: 'Waldwick', state: 'NJ', zipCode: '07463', county: 'Waldwick County'},
  { name: 'Wanaque Borough Free Public Library', url: 'https://www.wanaquelibrary.org', eventsUrl: 'https://www.wanaquelibrary.org/events', city: 'Wanaque', state: 'NJ', zipCode: '07465', county: 'Wanaque County'},
  { name: 'West Orange Free Public Library', url: 'https://www.westorangelibrary.org/', eventsUrl: 'https://www.westorangelibrary.org/', city: 'West Orange', state: 'NJ', zipCode: '07052', county: 'West Orange County'},
  { name: 'Westfield Memorial Library', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'NJ', zipCode: '07090', county: 'Westfield County'},
  { name: 'Westwood Free Public Library', url: 'https://www.westwoodlibrary.org', eventsUrl: 'https://www.westwoodlibrary.org/events', city: 'Westwood', state: 'NJ', zipCode: '07675', county: 'Westwood County'},
  { name: 'Wharton Public Library', url: 'https://www.whartonlibrary.org', eventsUrl: 'https://www.whartonlibrary.org/events', city: 'Wharton', state: 'NJ', zipCode: '07885', county: 'Wharton County'},
  { name: 'Monroe Twp Public Library-Gloucester', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'NJ', zipCode: '08094', county: 'Williamstown County'},
  { name: 'Wood-Ridge Memorial Library', url: 'https://www.woodridgelibrary.org', eventsUrl: 'https://www.woodridgelibrary.org/events', city: 'Wood-Ridge', state: 'NJ', zipCode: '07075', county: 'Wood-Ridge County'},
  { name: 'Woodbridge Public Library', url: 'https://www.woodbridgelibrary.org/', eventsUrl: 'https://www.woodbridgelibrary.org/calendar.aspx', city: 'Woodbridge', state: 'NJ', zipCode: '07095', county: 'Woodbridge County'},
  { name: 'Woodbury Public Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'NJ', zipCode: '08096', county: 'Woodbury County'},
  { name: 'Woodstown-Pilesgrove Library', url: 'https://www.woodstownlibrary.org/', eventsUrl: 'https://www.woodstownlibrary.org/', city: 'Woodstown', state: 'NJ', zipCode: '08098', county: 'Woodstown County'},
  { name: 'Wyckoff Free Public Library', url: 'https://www.wyckofflibrary.org', eventsUrl: 'https://www.wyckofflibrary.org/events', city: 'Wyckoff', state: 'NJ', zipCode: '07481', county: 'Wyckoff County'}
];

const SCRAPER_NAME = 'wordpress-NJ';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
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
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNJCloudFunction };
