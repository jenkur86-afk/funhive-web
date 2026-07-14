const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Massachusetts Public Libraries Scraper - Coverage: All Massachusetts public libraries
 */
const LIBRARIES = [
  { name: 'Acton Memorial Library', url: 'https://www.actonlibrary.org', eventsUrl: 'https://www.actonlibrary.org/events', city: 'Acton', state: 'MA', zipCode: '01720', county: 'Acton County'},
  { name: 'Adams Free Library', url: 'https://www.adamslibrary.org', eventsUrl: 'https://www.adamslibrary.org/events', city: 'Adams', state: 'MA', zipCode: '01220', county: 'Adams County'},
  { name: 'Agawam Public Library', url: 'https://www.agawamlibrary.org/', eventsUrl: 'https://www.agawamlibrary.org/', city: 'Agawam', state: 'MA', zipCode: '01001', county: 'Agawam County'},
  { name: 'Amesbury Public Library', url: 'https://www.amesburylibrary.org', eventsUrl: 'https://www.amesburylibrary.org/events', city: 'Amesbury', state: 'MA', zipCode: '01913', county: 'Amesbury County'},
  { name: 'Jones Library, Inc.', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'MA', zipCode: '01002', county: 'Amherst County'},
  { name: 'Memorial Hall Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'MA', zipCode: '01810', county: 'Andover County'},
  { name: 'Aquinnah Public Library', url: 'https://www.aquinnahlibrary.org', eventsUrl: 'https://www.aquinnahlibrary.org/events', city: 'Aquinnah', state: 'MA', zipCode: '02535', county: 'Aquinnah County'},
  { name: 'Edith M. Fox Library', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'MA', zipCode: '00000', county: 'Arlington County'},
  { name: 'Stevens Memorial Library', url: 'https://www.ashburnhamlibrary.org', eventsUrl: 'https://www.ashburnhamlibrary.org/events', city: 'Ashburnham', state: 'MA', zipCode: '01430', county: 'Ashburnham County'},
  { name: 'Ashby Free Public Library', url: 'https://www.ashbylibrary.org/', eventsUrl: 'https://www.ashbylibrary.org/calendar/', city: 'Ashby', state: 'MA', zipCode: '01431', county: 'Ashby County'},
  { name: 'Ashland Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'MA', zipCode: '01721', county: 'Ashland County'},
  { name: 'Athol Public Library', url: 'https://www.athollibrary.org/', eventsUrl: 'https://www.athollibrary.org/', city: 'Athol', state: 'MA', zipCode: '01331', county: 'Athol County'},
  { name: 'Attleboro Public Library', url: 'https://www.attleborolibrary.org', eventsUrl: 'https://www.attleborolibrary.org/events', city: 'Attleboro', state: 'MA', zipCode: '02703', county: 'Attleboro County'},
  { name: 'Auburn Free Public Library', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'MA', zipCode: '01501', county: 'Auburn County'},
  { name: 'Auburndale Branch Library', url: 'https://auburndalelibrary.org/', eventsUrl: 'https://auburndalelibrary.org/calendar/', city: 'Auburndale', state: 'MA', zipCode: '00000', county: 'Auburndale County'},
  { name: 'Avon Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'MA', zipCode: '02322', county: 'Avon County'},
  { name: 'Ayer Public Library', url: 'https://www.ayerlibrary.org', eventsUrl: 'https://www.ayerlibrary.org/events', city: 'Ayer', state: 'MA', zipCode: '01432', county: 'Ayer County'},
  { name: 'Woods Memorial Library', url: 'https://www.barrelibrary.org/', eventsUrl: 'https://www.barrelibrary.org/', city: 'Barre', state: 'MA', zipCode: '01005', county: 'Barre County'},
  { name: 'Bedford Free Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'MA', zipCode: '01730', county: 'Bedford County'},
  { name: 'Bellingham Public Library', url: 'https://www.bellinghamlibrary.org', eventsUrl: 'https://www.bellinghamlibrary.org/events', city: 'Bellingham', state: 'MA', zipCode: '02019', county: 'Bellingham County'},
  { name: 'Belmont Public Library', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'MA', zipCode: '02478', county: 'Belmont County'},
  { name: 'Berkley Public Library', url: 'https://sails.ent.sirsi.net/', eventsUrl: 'https://sails.ent.sirsi.net/client/en_US/berpl/', city: 'Berkley', state: 'MA', zipCode: '02779', county: 'Berkley County'},
  { name: 'Berlin Public Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'MA', zipCode: '01503', county: 'Berlin County'},
  { name: 'Beverly Farms Branch Library', url: 'https://www.beverlylibrary.org', eventsUrl: 'https://www.beverlylibrary.org/events', city: 'Beverly', state: 'MA', zipCode: '00000', county: 'Beverly County'},
  { name: 'Billerica Public Library', url: 'https://www.billericalibrary.org', eventsUrl: 'https://www.billericalibrary.org/events', city: 'Billerica', state: 'MA', zipCode: '01821', county: 'Billerica County'},
  { name: 'Blackstone Free Public Library', url: 'https://www.blackstonelibrary.org', eventsUrl: 'https://www.blackstonelibrary.org/events', city: 'Blackstone', state: 'MA', zipCode: '01504', county: 'Blackstone County'},
  { name: 'Boston Public Library', url: 'https://www.bostonlibrary.org', eventsUrl: 'https://www.bostonlibrary.org/events', city: 'Boston', state: 'MA', zipCode: '02116', county: 'Boston County'},
  { name: 'Jonathan Bourne Public Library', url: 'https://www.bournelibrary.org', eventsUrl: 'https://www.bournelibrary.org/events', city: 'Bourne', state: 'MA', zipCode: '02532', county: 'Bourne County'},
  { name: 'Boxford Town Library', url: 'https://www.boxfordlibrary.org/', eventsUrl: 'https://www.boxfordlibrary.org/', city: 'Boxford', state: 'MA', zipCode: '01921', county: 'Boxford County'},
  { name: 'Boylston Public Library', url: 'https://www.boylstonlibrary.org', eventsUrl: 'https://www.boylstonlibrary.org/events', city: 'Boylston', state: 'MA', zipCode: '01505', county: 'Boylston County'},
  { name: 'Brewster Ladies Library Assoc.', url: 'https://brewsterlibrary.libcal.com/', eventsUrl: 'https://brewsterlibrary.libcal.com/', city: 'Brewster', state: 'MA', zipCode: '02631', county: 'Brewster County'},
  { name: 'Brighton Branch Library', url: 'https://www.brightonlibrary.org', eventsUrl: 'https://www.brightonlibrary.org/events', city: 'Brighton', state: 'MA', zipCode: '00000', county: 'Brighton County'},
  { name: 'Brimfield Public Library', url: 'https://www.brimfieldlibrary.org', eventsUrl: 'https://www.brimfieldlibrary.org/events', city: 'Brimfield', state: 'MA', zipCode: '01010', county: 'Brimfield County'},
  { name: 'Merrick Public Library', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'MA', zipCode: '01506', county: 'Brookfield County'},
  { name: 'Brookline Public Library', url: 'https://www.brooklinelibrary.org', eventsUrl: 'https://www.brooklinelibrary.org/events', city: 'Brookline', state: 'MA', zipCode: '02445', county: 'Brookline County'},
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'MA', zipCode: '01803', county: 'Burlington County'},
  { name: 'Cambridge Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'MA', zipCode: '02139', county: 'Cambridge County'},
  { name: 'Canton Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'MA', zipCode: '02021', county: 'Canton County'},
  { name: 'Gleason Public Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'MA', zipCode: '01741', county: 'Carlisle County'},
  { name: 'Carver Public Library', url: 'https://www.carverlibrary.org/', eventsUrl: 'https://www.carverlibrary.org/', city: 'Carver', state: 'MA', zipCode: '02330', county: 'Carver County'},
  { name: 'Centerville Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'MA', zipCode: '02632', county: 'Centerville County'},
  { name: 'Tyler Memorial Library', url: 'https://www.charlemontlibrary.org', eventsUrl: 'https://www.charlemontlibrary.org/events', city: 'Charlemont', state: 'MA', zipCode: '01339', county: 'Charlemont County'},
  { name: 'Eldredge Public Library', url: 'https://chathamlibrary.librarycalendar.com/', eventsUrl: 'https://chathamlibrary.librarycalendar.com/events/month/', city: 'Chatham', state: 'MA', zipCode: '02633', county: 'Chatham County'},
  { name: 'Chelmsford Public Library', url: 'https://www.chelmsfordlibrary.org/', eventsUrl: 'https://www.chelmsfordlibrary.org/', city: 'Chelmsford', state: 'MA', zipCode: '01824', county: 'Chelmsford County'},
  { name: 'Chelsea Public Library', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'MA', zipCode: '02150', county: 'Chelsea County'},
  { name: 'Cheshire Public Library', url: 'https://www.cheshirelibrary.org', eventsUrl: 'https://www.cheshirelibrary.org/events', city: 'Cheshire', state: 'MA', zipCode: '01225', county: 'Cheshire County'},
  { name: 'Hamilton Memorial Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'MA', zipCode: '01011', county: 'Chester County'},
  { name: 'Chesterfield Public Library', url: 'https://www.chesterfieldlibrary.org', eventsUrl: 'https://www.chesterfieldlibrary.org/events', city: 'Chesterfield', state: 'MA', zipCode: '01012', county: 'Chesterfield County'},
  { name: 'Aldenville Branch Library', url: 'https://www.chicopeelibrary.org', eventsUrl: 'https://www.chicopeelibrary.org/events', city: 'Chicopee', state: 'MA', zipCode: '00000', county: 'Chicopee County'},
  { name: 'Chilmark Free Public Library', url: 'https://www.chilmarklibrary.org', eventsUrl: 'https://www.chilmarklibrary.org/events', city: 'Chilmark', state: 'MA', zipCode: '02535', county: 'Chilmark County'},
  { name: 'Clarksburg Town Library', url: 'https://www.clarksburglibrary.org', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'MA', zipCode: '01247', county: 'Clarksburg County'},
  { name: 'Bigelow Free Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'MA', zipCode: '01510', county: 'Clinton County'},
  { name: 'Paul Pratt Memorial Library', url: 'https://www.cohassetlibrary.org/', eventsUrl: 'https://www.cohassetlibrary.org/', city: 'Cohasset', state: 'MA', zipCode: '02025', county: 'Cohasset County'},
  { name: 'Concord Free Public Library', url: 'https://www.concordlibrary.org', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'MA', zipCode: '01742', county: 'Concord County'},
  { name: 'Cotuit Library', url: 'https://www.cotuitlibrary.org/', eventsUrl: 'https://www.cotuitlibrary.org/', city: 'Cotuit', state: 'MA', zipCode: '02635', county: 'Cotuit County'},
  { name: 'Dalton Free Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'MA', zipCode: '01226', county: 'Dalton County'},
  { name: 'Peabody Institute Library', url: 'https://www.danverslibrary.org', eventsUrl: 'https://www.danverslibrary.org/events', city: 'Danvers', state: 'MA', zipCode: '01923', county: 'Danvers County'},
  { name: 'Dighton Public Library', url: 'https://dightonlibrary.org/', eventsUrl: 'https://dightonlibrary.org/', city: 'Dighton', state: 'MA', zipCode: '02715', county: 'Dighton County'},
  { name: 'Adams Street Branch Library', url: 'https://www.dorchesterlibrary.org/', eventsUrl: 'https://www.dorchesterlibrary.org/', city: 'Dorchester', state: 'MA', zipCode: '00000', county: 'Dorchester County'},
  { name: 'Simon Fairfield Public Library', url: 'https://douglaslibrary.org/', eventsUrl: 'https://douglaslibrary.org/', city: 'Douglas', state: 'MA', zipCode: '01516', county: 'Douglas County'},
  { name: 'Dover Town Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'MA', zipCode: '02030', county: 'Dover County'},
  { name: 'Moses Greeley Parker Memorial Lib.', url: 'https://www.dracutlibrary.org', eventsUrl: 'https://www.dracutlibrary.org/events', city: 'Dracut', state: 'MA', zipCode: '01826', county: 'Dracut County'},
  { name: 'East Bridgewater Public Library', url: 'https://www.eastbridgewaterlibrary.org', eventsUrl: 'https://www.eastbridgewaterlibrary.org/events', city: 'East Bridgewater', state: 'MA', zipCode: '02333', county: 'East Bridgewater County'},
  { name: 'Eastham Public Library', url: 'https://easthamlibrary.org/', eventsUrl: 'https://easthamlibrary.org/', city: 'Eastham', state: 'MA', zipCode: '02642', county: 'Eastham County'},
  { name: 'Emily Williston Memorial Library', url: 'https://www.easthamptonlibrary.org', eventsUrl: 'https://www.easthamptonlibrary.org/events', city: 'Easthampton', state: 'MA', zipCode: '01027', county: 'Easthampton County'},
  { name: 'Five Corners Library', url: 'https://www.eastonlibrary.org/', eventsUrl: 'https://www.eastonlibrary.org/library-events', city: 'Easton', state: 'MA', zipCode: '00000', county: 'Easton County'},
  { name: 'Edgartown Free Public Library', url: 'https://www.edgartownlibrary.org', eventsUrl: 'https://www.edgartownlibrary.org/events', city: 'Edgartown', state: 'MA', zipCode: '02539', county: 'Edgartown County'},
  { name: 'T.O.H.P. Burnham Free Library', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'MA', zipCode: '01929', county: 'Essex County'},
  { name: 'Parlin Memorial Library', url: 'https://www.everettlibrary.org', eventsUrl: 'https://www.everettlibrary.org/events', city: 'Everett', state: 'MA', zipCode: '02149', county: 'Everett County'},
  { name: 'Millicent Library', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fairhaven', state: 'MA', zipCode: '02719', county: 'Fairhaven County'},
  { name: 'East End Branch Library', url: 'https://www.fallriverlibrary.org', eventsUrl: 'https://www.fallriverlibrary.org/events', city: 'Fall River', state: 'MA', zipCode: '00000', county: 'Fall River County'},
  { name: 'Fitchburg Public Library', url: 'http://fitchburgwi.gov/', eventsUrl: 'http://fitchburgwi.gov/2775/Library', city: 'Fitchburg', state: 'MA', zipCode: '01420', county: 'Fitchburg County'},
  { name: 'Lilly Library', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'MA', zipCode: '01062', county: 'Florence County'},
  { name: 'Framingham Public Library', url: 'https://framinghamlibrary.org/', eventsUrl: 'https://framinghamlibrary.org/calendar', city: 'Framingham', state: 'MA', zipCode: '01702', county: 'Framingham County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'MA', zipCode: '02038', county: 'Franklin County'},
  { name: 'Levi Heywood Memorial Library', url: 'https://www.gardnerlibrary.org/', eventsUrl: 'https://www.gardnerlibrary.org/', city: 'Gardner', state: 'MA', zipCode: '01440', county: 'Gardner County'},
  { name: 'Gloucester Lyceum Sawyer Free Lib', url: 'https://www.gloucesterlibrary.org', eventsUrl: 'https://www.gloucesterlibrary.org/events', city: 'Gloucester', state: 'MA', zipCode: '01930', county: 'Gloucester County'},
  { name: 'Goshen Free Public Library', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'MA', zipCode: '01032', county: 'Goshen County'},
  { name: 'Grafton Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'MA', zipCode: '01519', county: 'Grafton County'},
  { name: 'Granby Free Public Library', url: 'https://granbylibrary.org/', eventsUrl: 'https://granbylibrary.org/', city: 'Granby', state: 'MA', zipCode: '01033', county: 'Granby County'},
  { name: 'Granville Public Library', url: 'https://www.granvillelibrary.org/', eventsUrl: 'https://www.granvillelibrary.org/', city: 'Granville', state: 'MA', zipCode: '01034', county: 'Granville County'},
  { name: 'Greenfield Public Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'MA', zipCode: '01301', county: 'Greenfield County'},
  { name: 'Holmes Public Library', url: 'https://www.halifaxlibrary.org', eventsUrl: 'https://www.halifaxlibrary.org/events', city: 'Halifax', state: 'MA', zipCode: '02338', county: 'Halifax County'},
  { name: 'Taylor Memorial Library', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'MA', zipCode: '01237', county: 'Hancock County'},
  { name: 'John Curtis Free Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'MA', zipCode: '02339', county: 'Hanover County'},
  { name: 'Hanson Public Library', url: 'https://hansonlibrary.org/', eventsUrl: 'https://hansonlibrary.org/calendar-of-events/', city: 'Hanson', state: 'MA', zipCode: '02341', county: 'Hanson County'},
  { name: 'Harvard Public Library', url: 'https://www.harvardlibrary.org', eventsUrl: 'https://www.harvardlibrary.org/events', city: 'Harvard', state: 'MA', zipCode: '01451', county: 'Harvard County'},
  { name: 'Harwich Port Library Assoc.', url: 'https://www.harwichportlibrary.org', eventsUrl: 'https://www.harwichportlibrary.org/events', city: 'Harwich Port', state: 'MA', zipCode: '02646', county: 'Harwich Port County'},
  { name: 'Haverhill Public Library', url: 'https://www.haverhilllibrary.org', eventsUrl: 'https://www.haverhilllibrary.org/events', city: 'Haverhill', state: 'MA', zipCode: '01830', county: 'Haverhill County'},
  { name: 'Heath Free Public Library', url: 'https://www.heathlibrary.org', eventsUrl: 'https://www.heathlibrary.org/events', city: 'Heath', state: 'MA', zipCode: '01346', county: 'Heath County'},
  { name: 'Hingham Public Library', url: 'https://www.hinghamlibrary.org/', eventsUrl: 'https://www.hinghamlibrary.org/', city: 'Hingham', state: 'MA', zipCode: '02043', county: 'Hingham County'},
  { name: 'Holbrook Public Library', url: 'https://holbrooklibrary.org/', eventsUrl: 'https://holbrooklibrary.org/', city: 'Holbrook', state: 'MA', zipCode: '02343', county: 'Holbrook County'},
  { name: 'Holland Public Library', url: 'https://www.hollandlibrary.org/', eventsUrl: 'https://www.hollandlibrary.org/', city: 'Holland', state: 'MA', zipCode: '01521', county: 'Holland County'},
  { name: 'Holliston Public Library', url: 'https://hollistonlibrary.org/', eventsUrl: 'https://hollistonlibrary.org/', city: 'Holliston', state: 'MA', zipCode: '01746', county: 'Holliston County'},
  { name: 'Holyoke Public Library', url: 'https://holyokelibrary.org/', eventsUrl: 'https://holyokelibrary.org/calendar/', city: 'Holyoke', state: 'MA', zipCode: '01040', county: 'Holyoke County'},
  { name: 'Hopkinton Public Library', url: 'https://hopkintonlibrary.org/', eventsUrl: 'https://hopkintonlibrary.org/calendar/', city: 'Hopkinton', state: 'MA', zipCode: '01748', county: 'Hopkinton County'},
  { name: 'Hubbardston Public Library', url: 'http://hubbardston.blogspot.com/', eventsUrl: 'http://hubbardston.blogspot.com/', city: 'Hubbardston', state: 'MA', zipCode: '01452', county: 'Hubbardston County'},
  { name: 'Hudson Public Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'MA', zipCode: '01749', county: 'Hudson County'},
  { name: 'Huntington Public Library', url: 'https://www.huntingtonlibrary.org', eventsUrl: 'https://www.huntingtonlibrary.org/events', city: 'Huntington', state: 'MA', zipCode: '01050', county: 'Huntington County'},
  { name: 'Hyannis Public Library Assoc.', url: 'https://www.hyannislibrary.org', eventsUrl: 'https://www.hyannislibrary.org/events', city: 'Hyannis', state: 'MA', zipCode: '02601', county: 'Hyannis County'},
  { name: 'Hyde Park Branch Library', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'MA', zipCode: '00000', county: 'Hyde Park County'},
  { name: 'Ipswich Public Library', url: 'https://www.ipswichlibrary.org', eventsUrl: 'https://www.ipswichlibrary.org/events', city: 'Ipswich', state: 'MA', zipCode: '01938', county: 'Ipswich County'},
  { name: 'Kingston Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'MA', zipCode: '02364', county: 'Kingston County'},
  { name: 'Lakeville Free Public Library', url: 'https://lakevillelibrary.org/', eventsUrl: 'https://lakevillelibrary.org/', city: 'Lakeville', state: 'MA', zipCode: '02347', county: 'Lakeville County'},
  { name: 'Thayer Memorial Library', url: 'https://www.lancasterlibrary.org/', eventsUrl: 'https://www.lancasterlibrary.org/component/tags/tag/events', city: 'Lancaster', state: 'MA', zipCode: '01523', county: 'Lancaster County'},
  { name: 'Lawrence Public Library', url: 'https://lawrencelibrary.org/', eventsUrl: 'https://lawrencelibrary.org/', city: 'Lawrence', state: 'MA', zipCode: '01841', county: 'Lawrence County'},
  { name: 'Leicester Public Library', url: 'https://www.leicesterlibrary.org', eventsUrl: 'https://www.leicesterlibrary.org/events', city: 'Leicester', state: 'MA', zipCode: '01524', county: 'Leicester County'},
  { name: 'Lenox Library Association', url: 'https://www.lenoxlibrary.org', eventsUrl: 'https://www.lenoxlibrary.org/events', city: 'Lenox', state: 'MA', zipCode: '01240', county: 'Lenox County'},
  { name: 'Leominster Public Library', url: 'https://www.leominsterlibrary.org/', eventsUrl: 'https://www.leominsterlibrary.org/calendar-events/calendar', city: 'Leominster', state: 'MA', zipCode: '01453', county: 'Leominster County'},
  { name: 'Leverett Library', url: 'https://www.leverettlibrary.org', eventsUrl: 'https://www.leverettlibrary.org/events', city: 'Leverett', state: 'MA', zipCode: '01054', county: 'Leverett County'},
  { name: 'Cary Memorial Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'MA', zipCode: '02420', county: 'Lexington County'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'MA', zipCode: '01773', county: 'Lincoln County'},
  { name: 'Reuben Hoar Library', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'MA', zipCode: '01460', county: 'Littleton County'},
  { name: 'Richard Salter Storrs Library', url: 'https://longmeadowlibrary.org/', eventsUrl: 'https://longmeadowlibrary.org/', city: 'Longmeadow', state: 'MA', zipCode: '01106', county: 'Longmeadow County'},
  { name: 'Pollard Memorial Library', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'MA', zipCode: '01852', county: 'Lowell County'},
  { name: 'Lunenburg Public Library', url: 'https://lunenburglibrary.org/', eventsUrl: 'https://lunenburglibrary.org/', city: 'Lunenburg', state: 'MA', zipCode: '01462', county: 'Lunenburg County'},
  { name: 'Lynnfield Public Library', url: 'https://lynnfieldlibrary.org/', eventsUrl: 'https://lynnfieldlibrary.org/', city: 'Lynnfield', state: 'MA', zipCode: '01940', county: 'Lynnfield County'},
  { name: 'Mansfield Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'MA', zipCode: '02048', county: 'Mansfield County'},
  { name: 'Elizabeth Taber Memorial Library', url: 'https://www.marionlibrary.org/', eventsUrl: 'https://www.marionlibrary.org/', city: 'Marion', state: 'MA', zipCode: '02738', county: 'Marion County'},
  { name: 'Ventress Memorial Library', url: 'https://marshfieldlibrary.org/', eventsUrl: 'https://marshfieldlibrary.org/', city: 'Marshfield', state: 'MA', zipCode: '02050', county: 'Marshfield County'},
  { name: 'Mashpee Public Library', url: 'https://mashpeepubliclibrary.org/', eventsUrl: 'https://mashpeepubliclibrary.org/', city: 'Mashpee', state: 'MA', zipCode: '02649', county: 'Mashpee County'},
  { name: 'Mattapoisett Public Library', url: 'https://mattapoisettlibrary.org/', eventsUrl: 'https://mattapoisettlibrary.org/', city: 'Mattapoisett', state: 'MA', zipCode: '02739', county: 'Mattapoisett County'},
  { name: 'Medfield Memorial Library', url: 'https://www.medfieldlibrary.org', eventsUrl: 'https://www.medfieldlibrary.org/events', city: 'Medfield', state: 'MA', zipCode: '02052', county: 'Medfield County'},
  { name: 'Medford Public Library', url: 'https://www.medfordlibrary.org', eventsUrl: 'https://www.medfordlibrary.org/events', city: 'Medford', state: 'MA', zipCode: '02155', county: 'Medford County'},
  { name: 'Taft Public Library', url: 'https://mendonlibrary.org/', eventsUrl: 'https://mendonlibrary.org/', city: 'Mendon', state: 'MA', zipCode: '01756', county: 'Mendon County'},
  { name: 'Merrimac Public Library', url: 'https://merrimaclibrary.org/', eventsUrl: 'https://merrimaclibrary.org/', city: 'Merrimac', state: 'MA', zipCode: '01860', county: 'Merrimac County'},
  { name: 'Middlefield Public Library', url: 'https://middlefieldlibrary.org/', eventsUrl: 'https://middlefieldlibrary.org/', city: 'Middlefield', state: 'MA', zipCode: '01243', county: 'Middlefield County'},
  { name: 'Flint Public Library', url: 'https://www.middletonlibrary.org/', eventsUrl: 'https://www.middletonlibrary.org/calendar', city: 'Middleton', state: 'MA', zipCode: '01949', county: 'Middleton County'},
  { name: 'Milford Town Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'MA', zipCode: '01757', county: 'Milford County'},
  { name: 'Millbury Public Library', url: 'https://www.millburylibrary.org/', eventsUrl: 'https://www.millburylibrary.org/', city: 'Millbury', state: 'MA', zipCode: '01527', county: 'Millbury County'},
  { name: 'Millis Public Library', url: 'https://www.millislibrary.org/', eventsUrl: 'https://www.millislibrary.org/calendar/', city: 'Millis', state: 'MA', zipCode: '02054', county: 'Millis County'},
  { name: 'Millville Free Public Library', url: 'https://www.millvillelibrary.org', eventsUrl: 'https://www.millvillelibrary.org/events', city: 'Millville', state: 'MA', zipCode: '01529', county: 'Millville County'},
  { name: 'East Milton Branch Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'MA', zipCode: '00000', county: 'Milton County'},
  { name: 'Monterey Public Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'MA', zipCode: '01245', county: 'Monterey County'},
  { name: 'Grace Hall Memorial Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'MA', zipCode: '01085', county: 'Montgomery County'},
  { name: 'Nahant Public Library', url: 'https://www.nahantlibrary.org', eventsUrl: 'https://www.nahantlibrary.org/events', city: 'Nahant', state: 'MA', zipCode: '01908', county: 'Nahant County'},
  { name: 'Nantucket Atheneum', url: 'https://www.nantucketlibrary.org', eventsUrl: 'https://www.nantucketlibrary.org/events', city: 'Nantucket', state: 'MA', zipCode: '02554', county: 'Nantucket County'},
  { name: 'Needham Free Public Library', url: 'https://www.needhamlibrary.org', eventsUrl: 'https://www.needhamlibrary.org/events', city: 'Needham', state: 'MA', zipCode: '02494', county: 'Needham County'},
  { name: 'Casa Da Saudade', url: 'https://www.newbedfordlibrary.org', eventsUrl: 'https://www.newbedfordlibrary.org/events', city: 'New Bedford', state: 'MA', zipCode: '00000', county: 'New Bedford County'},
  { name: 'Andrews Branch Library', url: 'https://www.newburyportlibrary.org', eventsUrl: 'https://www.newburyportlibrary.org/events', city: 'Newburyport', state: 'MA', zipCode: '00000', county: 'Newburyport County'},
  { name: 'Newton Free Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'MA', zipCode: '02459', county: 'Newton County'},
  { name: 'Norfolk Public Library', url: 'https://www.norfolklibrary.org', eventsUrl: 'https://www.norfolklibrary.org/events', city: 'Norfolk', state: 'MA', zipCode: '02056', county: 'Norfolk County'},
  { name: 'North Adams Public Library', url: 'https://www.northadamslibrary.org', eventsUrl: 'https://www.northadamslibrary.org/events', city: 'North Adams', state: 'MA', zipCode: '01247', county: 'North Adams County'},
  { name: 'Haston Free Public Library', url: 'https://www.northbrookfieldlibrary.org', eventsUrl: 'https://www.northbrookfieldlibrary.org/events', city: 'North Brookfield', state: 'MA', zipCode: '01535', county: 'North Brookfield County'},
  { name: 'Northborough Free Library', url: 'https://www.northboroughlibrary.org', eventsUrl: 'https://www.northboroughlibrary.org/events', city: 'Northborough', state: 'MA', zipCode: '01532', county: 'Northborough County'},
  { name: 'Norton Public Library', url: 'https://nortonlibrary.org/', eventsUrl: 'https://nortonlibrary.org/', city: 'Norton', state: 'MA', zipCode: '02766', county: 'Norton County'},
  { name: 'Morrill Memorial Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'MA', zipCode: '02062', county: 'Norwood County'},
  { name: 'Oak Bluffs Public Library', url: 'https://www.oakbluffslibrary.org', eventsUrl: 'https://www.oakbluffslibrary.org/events', city: 'Oak Bluffs', state: 'MA', zipCode: '02557', county: 'Oak Bluffs County'},
  { name: 'Oxford Free Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'MA', zipCode: '01540', county: 'Oxford County'},
  { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'MA', zipCode: '01069', county: 'Palmer County'},
  { name: 'Richards Memorial Library', url: 'https://paxtonflorida.com/', eventsUrl: 'https://paxtonflorida.com/library/', city: 'Paxton', state: 'MA', zipCode: '01612', county: 'Paxton County'},
  { name: 'Peabody Institute Library', url: 'https://peabodylibrary.org/', eventsUrl: 'https://peabodylibrary.org/calendar/', city: 'Peabody', state: 'MA', zipCode: '01960', county: 'Peabody County'},
  { name: 'Pelham Library', url: 'https://www.pelhamlibrary.org/', eventsUrl: 'https://www.pelhamlibrary.org/calendar/', city: 'Pelham', state: 'MA', zipCode: '01002', county: 'Pelham County'},
  { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org/', eventsUrl: 'https://www.pembrokelibrary.org/upcoming-events', city: 'Pembroke', state: 'MA', zipCode: '02359', county: 'Pembroke County'},
  { name: 'Peru Library', url: 'https://www.perulibrary.org', eventsUrl: 'https://www.perulibrary.org/events', city: 'Peru', state: 'MA', zipCode: '01235', county: 'Peru County'},
  { name: 'Petersham Memorial Library', url: 'https://www.petershamlibrary.org', eventsUrl: 'https://www.petershamlibrary.org/events', city: 'Petersham', state: 'MA', zipCode: '01366', county: 'Petersham County'},
  { name: 'Berkshire Athenaeum', url: 'https://www.pittsfieldlibrary.org/', eventsUrl: 'https://www.pittsfieldlibrary.org/', city: 'Pittsfield', state: 'MA', zipCode: '01201', county: 'Pittsfield County'},
  { name: 'Shaw Memorial Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'MA', zipCode: '01070', county: 'Plainfield County'},
  { name: 'Plainville Public Library', url: 'https://www.plainvillelibrary.org', eventsUrl: 'https://www.plainvillelibrary.org/events', city: 'Plainville', state: 'MA', zipCode: '02762', county: 'Plainville County'},
  { name: 'Plymouth Public Library', url: 'https://plymouthlibrary.org/', eventsUrl: 'https://plymouthlibrary.org/', city: 'Plymouth', state: 'MA', zipCode: '02360', county: 'Plymouth County'},
  { name: 'Plympton Public Library', url: 'https://plymptonpubliclibrary.org/', eventsUrl: 'https://plymptonpubliclibrary.org/events-calendar/', city: 'Plympton', state: 'MA', zipCode: '02367', county: 'Plympton County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'MA', zipCode: '01541', county: 'Princeton County'},
  { name: 'Provincetown Public Library', url: 'https://www.provincetownlibrary.org', eventsUrl: 'https://www.provincetownlibrary.org/events', city: 'Provincetown', state: 'MA', zipCode: '02657', county: 'Provincetown County'},
  { name: 'Adams Shore Branch Library', url: 'https://www.quincylibrary.org', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'MA', zipCode: '00000', county: 'Quincy County'},
  { name: 'Turner Free Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'MA', zipCode: '02368', county: 'Randolph County'},
  { name: 'Reading Public Library', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'MA', zipCode: '01867', county: 'Reading County'},
  { name: 'Blanding Public Library', url: 'https://www.rehobothlibrary.org', eventsUrl: 'https://www.rehobothlibrary.org/events', city: 'Rehoboth', state: 'MA', zipCode: '02769', county: 'Rehoboth County'},
  { name: 'Revere Public Library', url: 'https://www.reverelibrary.org', eventsUrl: 'https://www.reverelibrary.org/events', city: 'Revere', state: 'MA', zipCode: '02151', county: 'Revere County'},
  { name: 'Richmond Free Public Library', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'MA', zipCode: '01254', county: 'Richmond County'},
  { name: 'Joseph H. Plumb Memorial Library', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'MA', zipCode: '02770', county: 'Rochester County'},
  { name: 'Rockland Memorial Library', url: 'https://www.rocklandlibrary.org', eventsUrl: 'https://www.rocklandlibrary.org/events', city: 'Rockland', state: 'MA', zipCode: '02370', county: 'Rockland County'},
  { name: 'Rockport Public Library', url: 'https://www.rockportlibrary.org', eventsUrl: 'https://www.rockportlibrary.org/events', city: 'Rockport', state: 'MA', zipCode: '01966', county: 'Rockport County'},
  { name: 'Rowley Public Library', url: 'https://www.rowleylibrary.org/', eventsUrl: 'https://www.rowleylibrary.org/', city: 'Rowley', state: 'MA', zipCode: '01969', county: 'Rowley County'},
  { name: 'Dudley Branch Library', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'MA', zipCode: '00000', county: 'Roxbury County'},
  { name: 'Phinehas S. Newton Library', url: 'https://www.royalstonlibrary.org/', eventsUrl: 'https://www.royalstonlibrary.org/', city: 'Royalston', state: 'MA', zipCode: '01368', county: 'Royalston County'},
  { name: 'Russell Public Library', url: 'https://russelllibrary.org/', eventsUrl: 'https://russelllibrary.org/', city: 'Russell', state: 'MA', zipCode: '01071', county: 'Russell County'},
  { name: 'Rutland Free Public Library', url: 'https://www.rutlandlibrary.org', eventsUrl: 'https://www.rutlandlibrary.org/events', city: 'Rutland', state: 'MA', zipCode: '01543', county: 'Rutland County'},
  { name: 'Salem Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'MA', zipCode: '01970', county: 'Salem County'},
  { name: 'Salisbury Public Library', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'MA', zipCode: '01952', county: 'Salisbury County'},
  { name: 'Sandisfield Public Library', url: 'https://www.sandisfieldlibrary.org', eventsUrl: 'https://www.sandisfieldlibrary.org/events', city: 'Sandisfield', state: 'MA', zipCode: '01255', county: 'Sandisfield County'},
  { name: 'Scituate Town Library', url: 'https://www.scituatelibrary.org', eventsUrl: 'https://www.scituatelibrary.org/events', city: 'Scituate', state: 'MA', zipCode: '02066', county: 'Scituate County'},
  { name: 'Seekonk Public Library', url: 'https://www.seekonklibrary.org', eventsUrl: 'https://www.seekonklibrary.org/events', city: 'Seekonk', state: 'MA', zipCode: '02771', county: 'Seekonk County'},
  { name: 'Bushnell-Sage Library', url: 'https://www.sheffieldlibrary.org/', eventsUrl: 'https://www.sheffieldlibrary.org/', city: 'Sheffield', state: 'MA', zipCode: '01257', county: 'Sheffield County'},
  { name: 'Sherborn Library', url: 'https://sherbornlibrary.org/', eventsUrl: 'https://sherbornlibrary.org/calendar', city: 'Sherborn', state: 'MA', zipCode: '01770', county: 'Sherborn County'},
  { name: 'Hazen Memorial Library', url: 'https://www.shirleylibrary.org/', eventsUrl: 'https://www.shirleylibrary.org/', city: 'Shirley', state: 'MA', zipCode: '01464', county: 'Shirley County'},
  { name: 'Shrewsbury Free Public Library', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'MA', zipCode: '01545', county: 'Shrewsbury County'},
  { name: 'Somerset Public Library', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'MA', zipCode: '02726', county: 'Somerset County'},
  { name: 'South Dennis Free Public Library', url: 'https://www.southdennislibrary.org/', eventsUrl: 'https://www.southdennislibrary.org/', city: 'South Dennis', state: 'MA', zipCode: '02660', county: 'South Dennis County'},
  { name: 'Edwards Public Library', url: 'https://www.southamptonlibrary.org', eventsUrl: 'https://www.southamptonlibrary.org/events', city: 'Southampton', state: 'MA', zipCode: '01073', county: 'Southampton County'},
  { name: 'Brightwood Branch Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'MA', zipCode: '00000', county: 'Springfield County'},
  { name: 'Conant Free Public Library', url: 'https://sterlinglibrary.org/', eventsUrl: 'https://sterlinglibrary.org/calendar/', city: 'Sterling', state: 'MA', zipCode: '01564', county: 'Sterling County'},
  { name: 'Stockbridge Library Association', url: 'https://www.stockbridgelibrary.org', eventsUrl: 'https://www.stockbridgelibrary.org/events', city: 'Stockbridge', state: 'MA', zipCode: '01262', county: 'Stockbridge County'},
  { name: 'Stoneham Public Library', url: 'https://www.stonehamlibrary.org', eventsUrl: 'https://www.stonehamlibrary.org/events', city: 'Stoneham', state: 'MA', zipCode: '02180', county: 'Stoneham County'},
  { name: 'Stoughton Public Library', url: 'https://www.stoughtonlibrary.org', eventsUrl: 'https://www.stoughtonlibrary.org/events', city: 'Stoughton', state: 'MA', zipCode: '02072', county: 'Stoughton County'},
  { name: 'Joshua Hyde Public Library', url: 'https://www.sturbridgelibrary.org', eventsUrl: 'https://www.sturbridgelibrary.org/events', city: 'Sturbridge', state: 'MA', zipCode: '01566', county: 'Sturbridge County'},
  { name: 'Swampscott Public Library', url: 'https://www.swampscottlibrary.org', eventsUrl: 'https://www.swampscottlibrary.org/events', city: 'Swampscott', state: 'MA', zipCode: '01907', county: 'Swampscott County'},
  { name: 'Swansea Free Public Library', url: 'https://www.swansealibrary.org', eventsUrl: 'https://www.swansealibrary.org/events', city: 'Swansea', state: 'MA', zipCode: '02777', county: 'Swansea County'},
  { name: 'Taunton Public Library', url: 'https://www.tauntonlibrary.org', eventsUrl: 'https://www.tauntonlibrary.org/events', city: 'Taunton', state: 'MA', zipCode: '02780', county: 'Taunton County'},
  { name: 'Boynton Public Library', url: 'https://www.templetonlibrary.org', eventsUrl: 'https://www.templetonlibrary.org/events', city: 'Templeton', state: 'MA', zipCode: '01468', county: 'Templeton County'},
  { name: 'Tewksbury Public Library', url: 'https://www.tewksburylibrary.org', eventsUrl: 'https://www.tewksburylibrary.org/events', city: 'Tewksbury', state: 'MA', zipCode: '01876', county: 'Tewksbury County'},
  { name: 'Topsfield Town Library', url: 'https://www.topsfieldlibrary.org', eventsUrl: 'https://www.topsfieldlibrary.org/events', city: 'Topsfield', state: 'MA', zipCode: '01983', county: 'Topsfield County'},
  { name: 'Townsend Public Library', url: 'https://www.townsendlibrary.org', eventsUrl: 'https://www.townsendlibrary.org/events', city: 'Townsend', state: 'MA', zipCode: '01469', county: 'Townsend County'},
  { name: 'Upton Town Library', url: 'https://uptonlibrarystaff.wixsite.com/', eventsUrl: 'https://uptonlibrarystaff.wixsite.com/uptontownlibrary', city: 'Upton', state: 'MA', zipCode: '00000', county: 'Upton County'},
  { name: 'Uxbridge Free Public Library', url: 'https://uxbridgelibrary.org/', eventsUrl: 'https://uxbridgelibrary.org/', city: 'Uxbridge', state: 'MA', zipCode: '01569', county: 'Uxbridge County'},
  { name: 'Waban Branch Library', url: 'https://www.wabanlibrary.org/', eventsUrl: 'https://www.wabanlibrary.org/', city: 'Waban', state: 'MA', zipCode: '00000', county: 'Waban County'},
  { name: 'Lucius Beebe Memorial Library', url: 'https://wakefieldlibrary.org/', eventsUrl: 'https://wakefieldlibrary.org/', city: 'Wakefield', state: 'MA', zipCode: '01880', county: 'Wakefield County'},
  { name: 'Walpole Public Library', url: 'https://www.walpolelibrary.org', eventsUrl: 'https://www.walpolelibrary.org/events', city: 'Walpole', state: 'MA', zipCode: '02081', county: 'Walpole County'},
  { name: 'Young Mens Library Association', url: 'https://warelibrary.org/', eventsUrl: 'https://warelibrary.org/', city: 'Ware', state: 'MA', zipCode: '01082', county: 'Ware County'},
  { name: 'Warren Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'MA', zipCode: '01083', county: 'Warren County'},
  { name: 'Warwick Free Public Library', url: 'https://warwicklibrary.org/', eventsUrl: 'https://warwicklibrary.org/', city: 'Warwick', state: 'MA', zipCode: '01378', county: 'Warwick County'},
  { name: 'East Branch Library', url: 'https://www.watertownlibrary.org/', eventsUrl: 'https://www.watertownlibrary.org/', city: 'Watertown', state: 'MA', zipCode: '00000', county: 'Watertown County'},
  { name: 'Wayland Free Public Library', url: 'https://www.waylandlibrary.org', eventsUrl: 'https://www.waylandlibrary.org/events', city: 'Wayland', state: 'MA', zipCode: '01778', county: 'Wayland County'},
  { name: 'Chester C. Corbin Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'MA', zipCode: '01570', county: 'Webster County'},
  { name: 'Wellfleet Public Library', url: 'https://www.wellfleetlibrary.org', eventsUrl: 'https://www.wellfleetlibrary.org/events', city: 'Wellfleet', state: 'MA', zipCode: '02667', county: 'Wellfleet County'},
  { name: 'Merriam-Gilbert Public Library', url: 'https://www.westbrookfieldlibrary.org/', eventsUrl: 'https://www.westbrookfieldlibrary.org/', city: 'West Brookfield', state: 'MA', zipCode: '01585', county: 'West Brookfield County'},
  { name: 'West Dennis Free Public Library', url: 'https://www.westdennislibrary.org/', eventsUrl: 'https://www.westdennislibrary.org/', city: 'West Dennis', state: 'MA', zipCode: '02670', county: 'West Dennis County'},
  { name: 'West Falmouth Library, Inc.', url: 'https://www.westfalmouthlibrary.org', eventsUrl: 'https://www.westfalmouthlibrary.org/events', city: 'West Falmouth', state: 'MA', zipCode: '02540', county: 'West Falmouth County'},
  { name: 'G. A. R. Memorial Library', url: 'https://westnewburylibrary.org/', eventsUrl: 'https://westnewburylibrary.org/', city: 'West Newbury', state: 'MA', zipCode: '01985', county: 'West Newbury County'},
  { name: 'Westborough Public Library', url: 'https://www.westboroughlibrary.org/', eventsUrl: 'https://www.westboroughlibrary.org/', city: 'Westborough', state: 'MA', zipCode: '01581', county: 'Westborough County'},
  { name: 'Westfield Athenaeum', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'MA', zipCode: '01085', county: 'Westfield County'},
  { name: 'J. V. Fletcher Library', url: 'https://www.westfordlibrary.org', eventsUrl: 'https://www.westfordlibrary.org/events', city: 'Westford', state: 'MA', zipCode: '01886', county: 'Westford County'},
  { name: 'Westhampton Memorial Library', url: 'https://www.westhamptonlibrary.org', eventsUrl: 'https://www.westhamptonlibrary.org/events', city: 'Westhampton', state: 'MA', zipCode: '01027', county: 'Westhampton County'},
  { name: 'Forbush Memorial Library', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'MA', zipCode: '01473', county: 'Westminster County'},
  { name: 'Weston Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'MA', zipCode: '02493', county: 'Weston County'},
  { name: 'Westport Free Public Library', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'MA', zipCode: '02790', county: 'Westport County'},
  { name: 'Islington Branch Library', url: 'https://www.westwoodlibrary.org', eventsUrl: 'https://www.westwoodlibrary.org/events', city: 'Westwood', state: 'MA', zipCode: '00000', county: 'Westwood County'},
  { name: 'Whitinsville Social Library', url: 'https://www.whitinsvillelibrary.org', eventsUrl: 'https://www.whitinsvillelibrary.org/events', city: 'Whitinsville', state: 'MA', zipCode: '01588', county: 'Whitinsville County'},
  { name: 'Wilbraham Public Library', url: 'https://www.wilbrahamlibrary.org', eventsUrl: 'https://www.wilbrahamlibrary.org/events', city: 'Wilbraham', state: 'MA', zipCode: '01095', county: 'Wilbraham County'},
  { name: 'David Joyce Milne Public Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'MA', zipCode: '01267', county: 'Williamstown County'},
  { name: 'Wilmington Memorial Library', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'MA', zipCode: '01887', county: 'Wilmington County'},
  { name: 'Beals Memorial Library', url: 'https://winchendonlibrary.org/', eventsUrl: 'https://winchendonlibrary.org/', city: 'Winchendon', state: 'MA', zipCode: '01475', county: 'Winchendon County'},
  { name: 'Winchester Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'MA', zipCode: '01890', county: 'Winchester County'},
  { name: 'Windsor Free Public Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'MA', zipCode: '01270', county: 'Windsor County'},
  { name: 'Winthrop Public Library', url: 'https://www.winthroplibrary.org/', eventsUrl: 'https://www.winthroplibrary.org/', city: 'Winthrop', state: 'MA', zipCode: '02152', county: 'Winthrop County'},
  { name: 'Frances Perkins Branch Library At Greendale', url: 'https://www.worcesterlibrary.org', eventsUrl: 'https://www.worcesterlibrary.org/events', city: 'Worcester', state: 'MA', zipCode: '00000', county: 'Worcester County'},
];

const SCRAPER_NAME = 'wordpress-MA';

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
            state: 'MA',
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
    state: 'MA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Massachusetts Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressMACloudFunction() {
  console.log('☁️ Running WordPress MA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-MA', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMACloudFunction };
