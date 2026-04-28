const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Massachusetts Public Libraries Scraper - Coverage: All Massachusetts public libraries
 */
const LIBRARIES = [
  { name: 'Abington Public Library', url: 'https://www.abingtonlibrary.org', eventsUrl: 'https://www.abingtonlibrary.org/events', city: 'Abington', state: 'MA', zipCode: '02351', county: 'Abington County'},
  { name: 'Acton Memorial Library', url: 'https://www.actonlibrary.org', eventsUrl: 'https://www.actonlibrary.org/events', city: 'Acton', state: 'MA', zipCode: '01720', county: 'Acton County'},
  { name: 'Russell Memorial Library', url: 'https://www.acushnetlibrary.org', eventsUrl: 'https://www.acushnetlibrary.org/events', city: 'Acushnet', state: 'MA', zipCode: '02743', county: 'Acushnet County'},
  { name: 'Adams Free Library', url: 'https://www.adamslibrary.org', eventsUrl: 'https://www.adamslibrary.org/events', city: 'Adams', state: 'MA', zipCode: '01220', county: 'Adams County'},
  { name: 'Agawam Public Library', url: 'https://www.agawamlibrary.org', eventsUrl: 'https://www.agawamlibrary.org/events', city: 'Agawam', state: 'MA', zipCode: '01001', county: 'Agawam County'},
  { name: 'Alford Free Public Library', url: 'https://www.alfordlibrary.org', eventsUrl: 'https://www.alfordlibrary.org/events', city: 'Alford', state: 'MA', zipCode: '01230', county: 'Alford County'},
  { name: 'Honan-Allston Branch', url: 'https://www.allstonlibrary.org', eventsUrl: 'https://www.allstonlibrary.org/events', city: 'Allston', state: 'MA', zipCode: '00000', county: 'Allston County'},
  { name: 'Amesbury Public Library', url: 'https://www.amesburylibrary.org', eventsUrl: 'https://www.amesburylibrary.org/events', city: 'Amesbury', state: 'MA', zipCode: '01913', county: 'Amesbury County'},
  { name: 'Jones Library, Inc.', url: 'https://www.amherstlibrary.org', eventsUrl: 'https://www.amherstlibrary.org/events', city: 'Amherst', state: 'MA', zipCode: '01002', county: 'Amherst County'},
  { name: 'Memorial Hall Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'MA', zipCode: '01810', county: 'Andover County'},
  { name: 'Aquinnah Public Library', url: 'https://www.aquinnahlibrary.org', eventsUrl: 'https://www.aquinnahlibrary.org/events', city: 'Aquinnah', state: 'MA', zipCode: '02535', county: 'Aquinnah County'},
  { name: 'Edith M. Fox Library', url: 'https://www.arlingtonlibrary.org', eventsUrl: 'https://www.arlingtonlibrary.org/events', city: 'Arlington', state: 'MA', zipCode: '00000', county: 'Arlington County'},
  { name: 'Stevens Memorial Library', url: 'https://www.ashburnhamlibrary.org', eventsUrl: 'https://www.ashburnhamlibrary.org/events', city: 'Ashburnham', state: 'MA', zipCode: '01430', county: 'Ashburnham County'},
  { name: 'Ashby Free Public Library', url: 'https://www.ashbylibrary.org', eventsUrl: 'https://www.ashbylibrary.org/events', city: 'Ashby', state: 'MA', zipCode: '01431', county: 'Ashby County'},
  { name: 'Belding Memorial Library', url: 'https://www.ashfieldlibrary.org', eventsUrl: 'https://www.ashfieldlibrary.org/events', city: 'Ashfield', state: 'MA', zipCode: '01330', county: 'Ashfield County'},
  { name: 'Ashland Public Library', url: 'https://www.ashlandlibrary.org', eventsUrl: 'https://www.ashlandlibrary.org/events', city: 'Ashland', state: 'MA', zipCode: '01721', county: 'Ashland County'},
  { name: 'Guilford H. Hathaway Library', url: 'https://www.assonetlibrary.org', eventsUrl: 'https://www.assonetlibrary.org/events', city: 'Assonet', state: 'MA', zipCode: '00000', county: 'Assonet County'},
  { name: 'Athol Public Library', url: 'https://www.athollibrary.org', eventsUrl: 'https://www.athollibrary.org/events', city: 'Athol', state: 'MA', zipCode: '01331', county: 'Athol County'},
  { name: 'Attleboro Public Library', url: 'https://www.attleborolibrary.org', eventsUrl: 'https://www.attleborolibrary.org/events', city: 'Attleboro', state: 'MA', zipCode: '02703', county: 'Attleboro County'},
  { name: 'Auburn Free Public Library', url: 'https://www.auburnlibrary.org', eventsUrl: 'https://www.auburnlibrary.org/events', city: 'Auburn', state: 'MA', zipCode: '01501', county: 'Auburn County'},
  { name: 'Auburndale Branch Library', url: 'https://www.auburndalelibrary.org', eventsUrl: 'https://www.auburndalelibrary.org/events', city: 'Auburndale', state: 'MA', zipCode: '00000', county: 'Auburndale County'},
  { name: 'Avon Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'MA', zipCode: '02322', county: 'Avon County'},
  { name: 'Ayer Public Library', url: 'https://www.ayerlibrary.org', eventsUrl: 'https://www.ayerlibrary.org/events', city: 'Ayer', state: 'MA', zipCode: '01432', county: 'Ayer County'},
  { name: 'Sturgis Library', url: 'https://www.barnstablelibrary.org', eventsUrl: 'https://www.barnstablelibrary.org/events', city: 'Barnstable', state: 'MA', zipCode: '02630', county: 'Barnstable County'},
  { name: 'Woods Memorial Library', url: 'https://www.barrelibrary.org', eventsUrl: 'https://www.barrelibrary.org/events', city: 'Barre', state: 'MA', zipCode: '01005', county: 'Barre County'},
  { name: 'Becket Athenaeum', url: 'https://www.becketlibrary.org', eventsUrl: 'https://www.becketlibrary.org/events', city: 'Becket', state: 'MA', zipCode: '01223', county: 'Becket County'},
  { name: 'Bedford Free Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'MA', zipCode: '01730', county: 'Bedford County'},
  { name: 'Clapp Memorial Library', url: 'https://www.belchertownlibrary.org', eventsUrl: 'https://www.belchertownlibrary.org/events', city: 'Belchertown', state: 'MA', zipCode: '01007', county: 'Belchertown County'},
  { name: 'Bellingham Public Library', url: 'https://www.bellinghamlibrary.org', eventsUrl: 'https://www.bellinghamlibrary.org/events', city: 'Bellingham', state: 'MA', zipCode: '02019', county: 'Bellingham County'},
  { name: 'Belmont Public Library', url: 'https://www.belmontlibrary.org', eventsUrl: 'https://www.belmontlibrary.org/events', city: 'Belmont', state: 'MA', zipCode: '02478', county: 'Belmont County'},
  { name: 'Berkley Public Library', url: 'https://www.berkleylibrary.org', eventsUrl: 'https://www.berkleylibrary.org/events', city: 'Berkley', state: 'MA', zipCode: '02779', county: 'Berkley County'},
  { name: 'Berlin Public Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'MA', zipCode: '01503', county: 'Berlin County'},
  { name: 'Cushman Library', url: 'https://www.bernardstonlibrary.org', eventsUrl: 'https://www.bernardstonlibrary.org/events', city: 'Bernardston', state: 'MA', zipCode: '01337', county: 'Bernardston County'},
  { name: 'Beverly Farms Branch Library', url: 'https://www.beverlylibrary.org', eventsUrl: 'https://www.beverlylibrary.org/events', city: 'Beverly', state: 'MA', zipCode: '00000', county: 'Beverly County'},
  { name: 'Billerica Public Library', url: 'https://www.billericalibrary.org', eventsUrl: 'https://www.billericalibrary.org/events', city: 'Billerica', state: 'MA', zipCode: '01821', county: 'Billerica County'},
  { name: 'Blackstone Free Public Library', url: 'https://www.blackstonelibrary.org', eventsUrl: 'https://www.blackstonelibrary.org/events', city: 'Blackstone', state: 'MA', zipCode: '01504', county: 'Blackstone County'},
  { name: 'Porter Memorial Library', url: 'https://www.blandfordlibrary.org', eventsUrl: 'https://www.blandfordlibrary.org/events', city: 'Blandford', state: 'MA', zipCode: '01008', county: 'Blandford County'},
  { name: 'Bolton Public Library', url: 'https://www.boltonlibrary.org', eventsUrl: 'https://www.boltonlibrary.org/events', city: 'Bolton', state: 'MA', zipCode: '01740', county: 'Bolton County'},
  { name: 'Boston Public Library', url: 'https://www.bostonlibrary.org', eventsUrl: 'https://www.bostonlibrary.org/events', city: 'Boston', state: 'MA', zipCode: '02116', county: 'Boston County'},
  { name: 'Jonathan Bourne Public Library', url: 'https://www.bournelibrary.org', eventsUrl: 'https://www.bournelibrary.org/events', city: 'Bourne', state: 'MA', zipCode: '02532', county: 'Bourne County'},
  { name: 'Sargent Memorial Library', url: 'https://www.boxboroughlibrary.org', eventsUrl: 'https://www.boxboroughlibrary.org/events', city: 'Boxborough', state: 'MA', zipCode: '01719', county: 'Boxborough County'},
  { name: 'Boxford Town Library', url: 'https://www.boxfordlibrary.org', eventsUrl: 'https://www.boxfordlibrary.org/events', city: 'Boxford', state: 'MA', zipCode: '01921', county: 'Boxford County'},
  { name: 'Boylston Public Library', url: 'https://www.boylstonlibrary.org', eventsUrl: 'https://www.boylstonlibrary.org/events', city: 'Boylston', state: 'MA', zipCode: '01505', county: 'Boylston County'},
  { name: 'Thayer Public Library', url: 'https://www.braintreelibrary.org', eventsUrl: 'https://www.braintreelibrary.org/events', city: 'Braintree', state: 'MA', zipCode: '02184', county: 'Braintree County'},
  { name: 'Brewster Ladies Library Assoc.', url: 'https://www.brewsterlibrary.org', eventsUrl: 'https://www.brewsterlibrary.org/events', city: 'Brewster', state: 'MA', zipCode: '02631', county: 'Brewster County'},
  { name: 'Bridgewater Public Library', url: 'https://www.bridgewaterlibrary.org', eventsUrl: 'https://www.bridgewaterlibrary.org/events', city: 'Bridgewater', state: 'MA', zipCode: '02324', county: 'Bridgewater County'},
  { name: 'Brighton Branch Library', url: 'https://www.brightonlibrary.org', eventsUrl: 'https://www.brightonlibrary.org/events', city: 'Brighton', state: 'MA', zipCode: '00000', county: 'Brighton County'},
  { name: 'Brimfield Public Library', url: 'https://www.brimfieldlibrary.org', eventsUrl: 'https://www.brimfieldlibrary.org/events', city: 'Brimfield', state: 'MA', zipCode: '01010', county: 'Brimfield County'},
  { name: 'Brockton Public Library System', url: 'https://www.brocktonlibrary.org', eventsUrl: 'https://www.brocktonlibrary.org/events', city: 'Brockton', state: 'MA', zipCode: '02301', county: 'Brockton County'},
  { name: 'Merrick Public Library', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'MA', zipCode: '01506', county: 'Brookfield County'},
  { name: 'Brookline Public Library', url: 'https://www.brooklinelibrary.org', eventsUrl: 'https://www.brooklinelibrary.org/events', city: 'Brookline', state: 'MA', zipCode: '02445', county: 'Brookline County'},
  { name: 'Buckland Public Library', url: 'https://www.bucklandlibrary.org', eventsUrl: 'https://www.bucklandlibrary.org/events', city: 'Buckland', state: 'MA', zipCode: '01338', county: 'Buckland County'},
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'MA', zipCode: '01803', county: 'Burlington County'},
  { name: 'Newbury Town Library', url: 'https://www.byfieldlibrary.org', eventsUrl: 'https://www.byfieldlibrary.org/events', city: 'Byfield', state: 'MA', zipCode: '01922', county: 'Byfield County'},
  { name: 'Cambridge Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'MA', zipCode: '02139', county: 'Cambridge County'},
  { name: 'Canton Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'MA', zipCode: '02021', county: 'Canton County'},
  { name: 'Gleason Public Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'MA', zipCode: '01741', county: 'Carlisle County'},
  { name: 'Carver Public Library', url: 'https://www.carverlibrary.org', eventsUrl: 'https://www.carverlibrary.org/events', city: 'Carver', state: 'MA', zipCode: '02330', county: 'Carver County'},
  { name: 'Centerville Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'MA', zipCode: '02632', county: 'Centerville County'},
  { name: 'Tyler Memorial Library', url: 'https://www.charlemontlibrary.org', eventsUrl: 'https://www.charlemontlibrary.org/events', city: 'Charlemont', state: 'MA', zipCode: '01339', county: 'Charlemont County'},
  { name: 'Charlton Public Library', url: 'https://www.charltonlibrary.org', eventsUrl: 'https://www.charltonlibrary.org/events', city: 'Charlton', state: 'MA', zipCode: '01507', county: 'Charlton County'},
  { name: 'Eldredge Public Library', url: 'https://www.chathamlibrary.org', eventsUrl: 'https://www.chathamlibrary.org/events', city: 'Chatham', state: 'MA', zipCode: '02633', county: 'Chatham County'},
  { name: 'Chelmsford Public Library', url: 'https://www.chelmsfordlibrary.org', eventsUrl: 'https://www.chelmsfordlibrary.org/events', city: 'Chelmsford', state: 'MA', zipCode: '01824', county: 'Chelmsford County'},
  { name: 'Chelsea Public Library', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'MA', zipCode: '02150', county: 'Chelsea County'},
  { name: 'Cheshire Public Library', url: 'https://www.cheshirelibrary.org', eventsUrl: 'https://www.cheshirelibrary.org/events', city: 'Cheshire', state: 'MA', zipCode: '01225', county: 'Cheshire County'},
  { name: 'Hamilton Memorial Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'MA', zipCode: '01011', county: 'Chester County'},
  { name: 'Chesterfield Public Library', url: 'https://www.chesterfieldlibrary.org', eventsUrl: 'https://www.chesterfieldlibrary.org/events', city: 'Chesterfield', state: 'MA', zipCode: '01012', county: 'Chesterfield County'},
  { name: 'Putterham Branch Library', url: 'https://www.chestnuthilllibrary.org', eventsUrl: 'https://www.chestnuthilllibrary.org/events', city: 'Chestnut Hill', state: 'MA', zipCode: '00000', county: 'Chestnut Hill County'},
  { name: 'Aldenville Branch Library', url: 'https://www.chicopeelibrary.org', eventsUrl: 'https://www.chicopeelibrary.org/events', city: 'Chicopee', state: 'MA', zipCode: '00000', county: 'Chicopee County'},
  { name: 'Chilmark Free Public Library', url: 'https://www.chilmarklibrary.org', eventsUrl: 'https://www.chilmarklibrary.org/events', city: 'Chilmark', state: 'MA', zipCode: '02535', county: 'Chilmark County'},
  { name: 'Clarksburg Town Library', url: 'https://www.clarksburglibrary.org', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'MA', zipCode: '01247', county: 'Clarksburg County'},
  { name: 'Bigelow Free Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'MA', zipCode: '01510', county: 'Clinton County'},
  { name: 'Paul Pratt Memorial Library', url: 'https://www.cohassetlibrary.org', eventsUrl: 'https://www.cohassetlibrary.org/events', city: 'Cohasset', state: 'MA', zipCode: '02025', county: 'Cohasset County'},
  { name: 'Griswold Memorial Library', url: 'https://www.colrainlibrary.org', eventsUrl: 'https://www.colrainlibrary.org/events', city: 'Colrain', state: 'MA', zipCode: '01340', county: 'Colrain County'},
  { name: 'Concord Free Public Library', url: 'https://www.concordlibrary.org', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'MA', zipCode: '01742', county: 'Concord County'},
  { name: 'Field Memorial Library', url: 'https://www.conwaylibrary.org', eventsUrl: 'https://www.conwaylibrary.org/events', city: 'Conway', state: 'MA', zipCode: '01341', county: 'Conway County'},
  { name: 'Cotuit Library', url: 'https://www.cotuitlibrary.org', eventsUrl: 'https://www.cotuitlibrary.org/events', city: 'Cotuit', state: 'MA', zipCode: '02635', county: 'Cotuit County'},
  { name: 'Bryant Free Library', url: 'https://www.cummingtonlibrary.org', eventsUrl: 'https://www.cummingtonlibrary.org/events', city: 'Cummington', state: 'MA', zipCode: '01026', county: 'Cummington County'},
  { name: 'Cuttyhunk Public Library', url: 'https://www.cuttyhunklibrary.org', eventsUrl: 'https://www.cuttyhunklibrary.org/events', city: 'Cuttyhunk', state: 'MA', zipCode: '02713', county: 'Cuttyhunk County'},
  { name: 'Dalton Free Public Library', url: 'https://www.daltonlibrary.org', eventsUrl: 'https://www.daltonlibrary.org/events', city: 'Dalton', state: 'MA', zipCode: '01226', county: 'Dalton County'},
  { name: 'Peabody Institute Library', url: 'https://www.danverslibrary.org', eventsUrl: 'https://www.danverslibrary.org/events', city: 'Danvers', state: 'MA', zipCode: '01923', county: 'Danvers County'},
  { name: 'Dartmouth Public Libraries', url: 'https://www.dartmouthlibrary.org', eventsUrl: 'https://www.dartmouthlibrary.org/events', city: 'Dartmouth', state: 'MA', zipCode: '02748', county: 'Dartmouth County'},
  { name: 'Dedham Public Library', url: 'https://www.dedhamlibrary.org', eventsUrl: 'https://www.dedhamlibrary.org/events', city: 'Dedham', state: 'MA', zipCode: '02026', county: 'Dedham County'},
  { name: 'Dennis Memorial Library Assoc.', url: 'https://www.dennislibrary.org', eventsUrl: 'https://www.dennislibrary.org/events', city: 'Dennis', state: 'MA', zipCode: '02638', county: 'Dennis County'},
  { name: 'Dennis Public Library', url: 'https://www.dennisportlibrary.org', eventsUrl: 'https://www.dennisportlibrary.org/events', city: 'Dennisport', state: 'MA', zipCode: '02639', county: 'Dennisport County'},
  { name: 'Dighton Public Library', url: 'https://www.dightonlibrary.org', eventsUrl: 'https://www.dightonlibrary.org/events', city: 'Dighton', state: 'MA', zipCode: '02715', county: 'Dighton County'},
  { name: 'Adams Street Branch Library', url: 'https://www.dorchesterlibrary.org', eventsUrl: 'https://www.dorchesterlibrary.org/events', city: 'Dorchester', state: 'MA', zipCode: '00000', county: 'Dorchester County'},
  { name: 'Simon Fairfield Public Library', url: 'https://www.douglaslibrary.org', eventsUrl: 'https://www.douglaslibrary.org/events', city: 'Douglas', state: 'MA', zipCode: '01516', county: 'Douglas County'},
  { name: 'Dover Town Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'MA', zipCode: '02030', county: 'Dover County'},
  { name: 'Moses Greeley Parker Memorial Lib.', url: 'https://www.dracutlibrary.org', eventsUrl: 'https://www.dracutlibrary.org/events', city: 'Dracut', state: 'MA', zipCode: '01826', county: 'Dracut County'},
  { name: 'Pearle L. Crawford Memorial Library', url: 'https://www.dudleylibrary.org', eventsUrl: 'https://www.dudleylibrary.org/events', city: 'Dudley', state: 'MA', zipCode: '01571', county: 'Dudley County'},
  { name: 'Dunstable Free Public Library', url: 'https://www.dunstablelibrary.org', eventsUrl: 'https://www.dunstablelibrary.org/events', city: 'Dunstable', state: 'MA', zipCode: '01827', county: 'Dunstable County'},
  { name: 'Duxbury Free Library', url: 'https://www.duxburylibrary.org', eventsUrl: 'https://www.duxburylibrary.org/events', city: 'Duxbury', state: 'MA', zipCode: '02332', county: 'Duxbury County'},
  { name: 'East Boston Branch Library', url: 'https://www.eastbostonlibrary.org', eventsUrl: 'https://www.eastbostonlibrary.org/events', city: 'East Boston', state: 'MA', zipCode: '00000', county: 'East Boston County'},
  { name: 'East Bridgewater Public Library', url: 'https://www.eastbridgewaterlibrary.org', eventsUrl: 'https://www.eastbridgewaterlibrary.org/events', city: 'East Bridgewater', state: 'MA', zipCode: '02333', county: 'East Bridgewater County'},
  { name: 'East Brookfield Public Library', url: 'https://www.eastbrookfieldlibrary.org', eventsUrl: 'https://www.eastbrookfieldlibrary.org/events', city: 'East Brookfield', state: 'MA', zipCode: '01515', county: 'East Brookfield County'},
  { name: 'Jacob Sears Memorial Library', url: 'https://www.eastdennislibrary.org', eventsUrl: 'https://www.eastdennislibrary.org/events', city: 'East Dennis', state: 'MA', zipCode: '02641', county: 'East Dennis County'},
  { name: 'East Falmouth Branch Library', url: 'https://www.eastfalmouthlibrary.org', eventsUrl: 'https://www.eastfalmouthlibrary.org/events', city: 'East Falmouth', state: 'MA', zipCode: '00000', county: 'East Falmouth County'},
  { name: 'James White Memorial Library', url: 'https://www.eastfreetownlibrary.org', eventsUrl: 'https://www.eastfreetownlibrary.org/events', city: 'East Freetown', state: 'MA', zipCode: '02717', county: 'East Freetown County'},
  { name: 'East Longmeadow Public Library', url: 'https://www.eastlongmeadowlibrary.org', eventsUrl: 'https://www.eastlongmeadowlibrary.org/events', city: 'East Longmeadow', state: 'MA', zipCode: '01028', county: 'East Longmeadow County'},
  { name: 'Franklin N. Pratt Library', url: 'https://www.eastweymouthlibrary.org', eventsUrl: 'https://www.eastweymouthlibrary.org/events', city: 'East Weymouth', state: 'MA', zipCode: '00000', county: 'East Weymouth County'},
  { name: 'Eastham Public Library', url: 'https://www.easthamlibrary.org', eventsUrl: 'https://www.easthamlibrary.org/events', city: 'Eastham', state: 'MA', zipCode: '02642', county: 'Eastham County'},
  { name: 'Emily Williston Memorial Library', url: 'https://www.easthamptonlibrary.org', eventsUrl: 'https://www.easthamptonlibrary.org/events', city: 'Easthampton', state: 'MA', zipCode: '01027', county: 'Easthampton County'},
  { name: 'Five Corners Library', url: 'https://www.eastonlibrary.org', eventsUrl: 'https://www.eastonlibrary.org/events', city: 'Easton', state: 'MA', zipCode: '00000', county: 'Easton County'},
  { name: 'Edgartown Free Public Library', url: 'https://www.edgartownlibrary.org', eventsUrl: 'https://www.edgartownlibrary.org/events', city: 'Edgartown', state: 'MA', zipCode: '02539', county: 'Edgartown County'},
  { name: 'Erving Center Branch', url: 'https://www.ervinglibrary.org', eventsUrl: 'https://www.ervinglibrary.org/events', city: 'Erving', state: 'MA', zipCode: '00000', county: 'Erving County'},
  { name: 'T.O.H.P. Burnham Free Library', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'MA', zipCode: '01929', county: 'Essex County'},
  { name: 'Parlin Memorial Library', url: 'https://www.everettlibrary.org', eventsUrl: 'https://www.everettlibrary.org/events', city: 'Everett', state: 'MA', zipCode: '02149', county: 'Everett County'},
  { name: 'Millicent Library', url: 'https://www.fairhavenlibrary.org', eventsUrl: 'https://www.fairhavenlibrary.org/events', city: 'Fairhaven', state: 'MA', zipCode: '02719', county: 'Fairhaven County'},
  { name: 'East End Branch Library', url: 'https://www.fallriverlibrary.org', eventsUrl: 'https://www.fallriverlibrary.org/events', city: 'Fall River', state: 'MA', zipCode: '00000', county: 'Fall River County'},
  { name: 'Falmouth Public Library', url: 'https://www.falmouthlibrary.org', eventsUrl: 'https://www.falmouthlibrary.org/events', city: 'Falmouth', state: 'MA', zipCode: '02540', county: 'Falmouth County'},
  { name: 'Fitchburg Public Library', url: 'https://www.fitchburglibrary.org', eventsUrl: 'https://www.fitchburglibrary.org/events', city: 'Fitchburg', state: 'MA', zipCode: '01420', county: 'Fitchburg County'},
  { name: 'Lilly Library', url: 'https://www.florencelibrary.org', eventsUrl: 'https://www.florencelibrary.org/events', city: 'Florence', state: 'MA', zipCode: '01062', county: 'Florence County'},
  { name: 'Florida Free Public Library', url: 'https://www.floridalibrary.org', eventsUrl: 'https://www.floridalibrary.org/events', city: 'Florida', state: 'MA', zipCode: '01247', county: 'Florida County'},
  { name: 'Boyden Library', url: 'https://www.foxboroughlibrary.org', eventsUrl: 'https://www.foxboroughlibrary.org/events', city: 'Foxborough', state: 'MA', zipCode: '02035', county: 'Foxborough County'},
  { name: 'Framingham Public Library', url: 'https://www.framinghamlibrary.org', eventsUrl: 'https://www.framinghamlibrary.org/events', city: 'Framingham', state: 'MA', zipCode: '01702', county: 'Framingham County'},
  { name: 'Franklin Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'MA', zipCode: '02038', county: 'Franklin County'},
  { name: 'Levi Heywood Memorial Library', url: 'https://www.gardnerlibrary.org', eventsUrl: 'https://www.gardnerlibrary.org/events', city: 'Gardner', state: 'MA', zipCode: '01440', county: 'Gardner County'},
  { name: 'Peabody Library', url: 'https://www.georgetownlibrary.org', eventsUrl: 'https://www.georgetownlibrary.org/events', city: 'Georgetown', state: 'MA', zipCode: '01833', county: 'Georgetown County'},
  { name: 'Gilbertville Public Library', url: 'https://www.gilbertvillelibrary.org', eventsUrl: 'https://www.gilbertvillelibrary.org/events', city: 'Gilbertville', state: 'MA', zipCode: '01031', county: 'Gilbertville County'},
  { name: 'Slate Memorial Library', url: 'https://www.gilllibrary.org', eventsUrl: 'https://www.gilllibrary.org/events', city: 'Gill', state: 'MA', zipCode: '01376', county: 'Gill County'},
  { name: 'Gloucester Lyceum Sawyer Free Lib', url: 'https://www.gloucesterlibrary.org', eventsUrl: 'https://www.gloucesterlibrary.org/events', city: 'Gloucester', state: 'MA', zipCode: '01930', county: 'Gloucester County'},
  { name: 'Goshen Free Public Library', url: 'https://www.goshenlibrary.org', eventsUrl: 'https://www.goshenlibrary.org/events', city: 'Goshen', state: 'MA', zipCode: '01032', county: 'Goshen County'},
  { name: 'Grafton Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'MA', zipCode: '01519', county: 'Grafton County'},
  { name: 'Granby Free Public Library', url: 'https://www.granbylibrary.org', eventsUrl: 'https://www.granbylibrary.org/events', city: 'Granby', state: 'MA', zipCode: '01033', county: 'Granby County'},
  { name: 'Granville Public Library', url: 'https://www.granvillelibrary.org', eventsUrl: 'https://www.granvillelibrary.org/events', city: 'Granville', state: 'MA', zipCode: '01034', county: 'Granville County'},
  { name: 'Mason Library', url: 'https://www.greatbarringtonlibrary.org', eventsUrl: 'https://www.greatbarringtonlibrary.org/events', city: 'Great Barrington', state: 'MA', zipCode: '01230', county: 'Great Barrington County'},
  { name: 'Greenfield Public Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'MA', zipCode: '01301', county: 'Greenfield County'},
  { name: 'Groton Public Library', url: 'https://www.grotonlibrary.org', eventsUrl: 'https://www.grotonlibrary.org/events', city: 'Groton', state: 'MA', zipCode: '01450', county: 'Groton County'},
  { name: 'Langley Adams Library', url: 'https://www.grovelandlibrary.org', eventsUrl: 'https://www.grovelandlibrary.org/events', city: 'Groveland', state: 'MA', zipCode: '01834', county: 'Groveland County'},
  { name: 'Goodwin Memorial Library', url: 'https://www.hadleylibrary.org', eventsUrl: 'https://www.hadleylibrary.org/events', city: 'Hadley', state: 'MA', zipCode: '01035', county: 'Hadley County'},
  { name: 'Holmes Public Library', url: 'https://www.halifaxlibrary.org', eventsUrl: 'https://www.halifaxlibrary.org/events', city: 'Halifax', state: 'MA', zipCode: '02338', county: 'Halifax County'},
  { name: 'Hampden Free Library', url: 'https://www.hampdenlibrary.org', eventsUrl: 'https://www.hampdenlibrary.org/events', city: 'Hampden', state: 'MA', zipCode: '01036', county: 'Hampden County'},
  { name: 'Taylor Memorial Library', url: 'https://www.hancocklibrary.org', eventsUrl: 'https://www.hancocklibrary.org/events', city: 'Hancock', state: 'MA', zipCode: '01237', county: 'Hancock County'},
  { name: 'John Curtis Free Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'MA', zipCode: '02339', county: 'Hanover County'},
  { name: 'Hanson Public Library', url: 'https://www.hansonlibrary.org', eventsUrl: 'https://www.hansonlibrary.org/events', city: 'Hanson', state: 'MA', zipCode: '02341', county: 'Hanson County'},
  { name: 'Paige Memorial Library', url: 'https://www.hardwicklibrary.org', eventsUrl: 'https://www.hardwicklibrary.org/events', city: 'Hardwick', state: 'MA', zipCode: '01037', county: 'Hardwick County'},
  { name: 'Harvard Public Library', url: 'https://www.harvardlibrary.org', eventsUrl: 'https://www.harvardlibrary.org/events', city: 'Harvard', state: 'MA', zipCode: '01451', county: 'Harvard County'},
  { name: 'Brooks Free Library', url: 'https://www.harwichlibrary.org', eventsUrl: 'https://www.harwichlibrary.org/events', city: 'Harwich', state: 'MA', zipCode: '02645', county: 'Harwich County'},
  { name: 'Harwich Port Library Assoc.', url: 'https://www.harwichportlibrary.org', eventsUrl: 'https://www.harwichportlibrary.org/events', city: 'Harwich Port', state: 'MA', zipCode: '02646', county: 'Harwich Port County'},
  { name: 'Hatfield Public Library', url: 'https://www.hatfieldlibrary.org', eventsUrl: 'https://www.hatfieldlibrary.org/events', city: 'Hatfield', state: 'MA', zipCode: '01038', county: 'Hatfield County'},
  { name: 'Haverhill Public Library', url: 'https://www.haverhilllibrary.org', eventsUrl: 'https://www.haverhilllibrary.org/events', city: 'Haverhill', state: 'MA', zipCode: '01830', county: 'Haverhill County'},
  { name: 'Haydenville Public Library', url: 'https://www.haydenvillelibrary.org', eventsUrl: 'https://www.haydenvillelibrary.org/events', city: 'Haydenville', state: 'MA', zipCode: '00000', county: 'Haydenville County'},
  { name: 'Heath Free Public Library', url: 'https://www.heathlibrary.org', eventsUrl: 'https://www.heathlibrary.org/events', city: 'Heath', state: 'MA', zipCode: '01346', county: 'Heath County'},
  { name: 'Hingham Public Library', url: 'https://www.hinghamlibrary.org', eventsUrl: 'https://www.hinghamlibrary.org/events', city: 'Hingham', state: 'MA', zipCode: '02043', county: 'Hingham County'},
  { name: 'Hinsdale Public Library', url: 'https://www.hinsdalelibrary.org', eventsUrl: 'https://www.hinsdalelibrary.org/events', city: 'Hinsdale', state: 'MA', zipCode: '01235', county: 'Hinsdale County'},
  { name: 'Holbrook Public Library', url: 'https://www.holbrooklibrary.org', eventsUrl: 'https://www.holbrooklibrary.org/events', city: 'Holbrook', state: 'MA', zipCode: '02343', county: 'Holbrook County'},
  { name: 'Gale Free Library', url: 'https://www.holdenlibrary.org', eventsUrl: 'https://www.holdenlibrary.org/events', city: 'Holden', state: 'MA', zipCode: '01520', county: 'Holden County'},
  { name: 'Holland Public Library', url: 'https://www.hollandlibrary.org', eventsUrl: 'https://www.hollandlibrary.org/events', city: 'Holland', state: 'MA', zipCode: '01521', county: 'Holland County'},
  { name: 'Holliston Public Library', url: 'https://www.hollistonlibrary.org', eventsUrl: 'https://www.hollistonlibrary.org/events', city: 'Holliston', state: 'MA', zipCode: '01746', county: 'Holliston County'},
  { name: 'Holyoke Public Library', url: 'https://www.holyokelibrary.org', eventsUrl: 'https://www.holyokelibrary.org/events', city: 'Holyoke', state: 'MA', zipCode: '01040', county: 'Holyoke County'},
  { name: 'Bancroft Memorial Library', url: 'https://www.hopedalelibrary.org', eventsUrl: 'https://www.hopedalelibrary.org/events', city: 'Hopedale', state: 'MA', zipCode: '01747', county: 'Hopedale County'},
  { name: 'Hopkinton Public Library', url: 'https://www.hopkintonlibrary.org', eventsUrl: 'https://www.hopkintonlibrary.org/events', city: 'Hopkinton', state: 'MA', zipCode: '01748', county: 'Hopkinton County'},
  { name: 'Ramsdell Public Library', url: 'https://www.housatoniclibrary.org', eventsUrl: 'https://www.housatoniclibrary.org/events', city: 'Housatonic', state: 'MA', zipCode: '00000', county: 'Housatonic County'},
  { name: 'Hubbardston Public Library', url: 'https://www.hubbardstonlibrary.org', eventsUrl: 'https://www.hubbardstonlibrary.org/events', city: 'Hubbardston', state: 'MA', zipCode: '01452', county: 'Hubbardston County'},
  { name: 'Hudson Public Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'MA', zipCode: '01749', county: 'Hudson County'},
  { name: 'Hull Public Library', url: 'https://www.hulllibrary.org', eventsUrl: 'https://www.hulllibrary.org/events', city: 'Hull', state: 'MA', zipCode: '02045', county: 'Hull County'},
  { name: 'Huntington Public Library', url: 'https://www.huntingtonlibrary.org', eventsUrl: 'https://www.huntingtonlibrary.org/events', city: 'Huntington', state: 'MA', zipCode: '01050', county: 'Huntington County'},
  { name: 'Hyannis Public Library Assoc.', url: 'https://www.hyannislibrary.org', eventsUrl: 'https://www.hyannislibrary.org/events', city: 'Hyannis', state: 'MA', zipCode: '02601', county: 'Hyannis County'},
  { name: 'Hyde Park Branch Library', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'MA', zipCode: '00000', county: 'Hyde Park County'},
  { name: 'Indian Orchard Branch Library', url: 'https://www.indianorchardlibrary.org', eventsUrl: 'https://www.indianorchardlibrary.org/events', city: 'Indian Orchard', state: 'MA', zipCode: '00000', county: 'Indian Orchard County'},
  { name: 'Ipswich Public Library', url: 'https://www.ipswichlibrary.org', eventsUrl: 'https://www.ipswichlibrary.org/events', city: 'Ipswich', state: 'MA', zipCode: '01938', county: 'Ipswich County'},
  { name: 'Connolly Branch Library', url: 'https://www.jamaicaplainlibrary.org', eventsUrl: 'https://www.jamaicaplainlibrary.org/events', city: 'Jamaica Plain', state: 'MA', zipCode: '00000', county: 'Jamaica Plain County'},
  { name: 'Kingston Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'MA', zipCode: '02364', county: 'Kingston County'},
  { name: 'Lakeville Free Public Library', url: 'https://www.lakevillelibrary.org', eventsUrl: 'https://www.lakevillelibrary.org/events', city: 'Lakeville', state: 'MA', zipCode: '02347', county: 'Lakeville County'},
  { name: 'Thayer Memorial Library', url: 'https://www.lancasterlibrary.org', eventsUrl: 'https://www.lancasterlibrary.org/events', city: 'Lancaster', state: 'MA', zipCode: '01523', county: 'Lancaster County'},
  { name: 'Lanesborough Public Library', url: 'https://www.lanesboroughlibrary.org', eventsUrl: 'https://www.lanesboroughlibrary.org/events', city: 'Lanesborough', state: 'MA', zipCode: '01237', county: 'Lanesborough County'},
  { name: 'Lawrence Public Library', url: 'https://www.lawrencelibrary.org', eventsUrl: 'https://www.lawrencelibrary.org/events', city: 'Lawrence', state: 'MA', zipCode: '01841', county: 'Lawrence County'},
  { name: 'Lee Library Association', url: 'https://www.leelibrary.org', eventsUrl: 'https://www.leelibrary.org/events', city: 'Lee', state: 'MA', zipCode: '01238', county: 'Lee County'},
  { name: 'Leicester Public Library', url: 'https://www.leicesterlibrary.org', eventsUrl: 'https://www.leicesterlibrary.org/events', city: 'Leicester', state: 'MA', zipCode: '01524', county: 'Leicester County'},
  { name: 'Lenox Library Association', url: 'https://www.lenoxlibrary.org', eventsUrl: 'https://www.lenoxlibrary.org/events', city: 'Lenox', state: 'MA', zipCode: '01240', county: 'Lenox County'},
  { name: 'Leominster Public Library', url: 'https://www.leominsterlibrary.org', eventsUrl: 'https://www.leominsterlibrary.org/events', city: 'Leominster', state: 'MA', zipCode: '01453', county: 'Leominster County'},
  { name: 'Leverett Library', url: 'https://www.leverettlibrary.org', eventsUrl: 'https://www.leverettlibrary.org/events', city: 'Leverett', state: 'MA', zipCode: '01054', county: 'Leverett County'},
  { name: 'Cary Memorial Library', url: 'https://www.lexingtonlibrary.org', eventsUrl: 'https://www.lexingtonlibrary.org/events', city: 'Lexington', state: 'MA', zipCode: '02420', county: 'Lexington County'},
  { name: 'Robertson Memorial Library', url: 'https://www.leydenlibrary.org', eventsUrl: 'https://www.leydenlibrary.org/events', city: 'Leyden', state: 'MA', zipCode: '01301', county: 'Leyden County'},
  { name: 'Lincoln Public Library', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'MA', zipCode: '01773', county: 'Lincoln County'},
  { name: 'Reuben Hoar Library', url: 'https://www.littletonlibrary.org', eventsUrl: 'https://www.littletonlibrary.org/events', city: 'Littleton', state: 'MA', zipCode: '01460', county: 'Littleton County'},
  { name: 'Richard Salter Storrs Library', url: 'https://www.longmeadowlibrary.org', eventsUrl: 'https://www.longmeadowlibrary.org/events', city: 'Longmeadow', state: 'MA', zipCode: '01106', county: 'Longmeadow County'},
  { name: 'Pollard Memorial Library', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'MA', zipCode: '01852', county: 'Lowell County'},
  { name: 'Hubbard Memorial Library', url: 'https://www.ludlowlibrary.org', eventsUrl: 'https://www.ludlowlibrary.org/events', city: 'Ludlow', state: 'MA', zipCode: '01056', county: 'Ludlow County'},
  { name: 'Lunenburg Public Library', url: 'https://www.lunenburglibrary.org', eventsUrl: 'https://www.lunenburglibrary.org/events', city: 'Lunenburg', state: 'MA', zipCode: '01462', county: 'Lunenburg County'},
  { name: 'Lynn Public Library', url: 'https://www.lynnlibrary.org', eventsUrl: 'https://www.lynnlibrary.org/events', city: 'Lynn', state: 'MA', zipCode: '01902', county: 'Lynn County'},
  { name: 'Lynnfield Public Library', url: 'https://www.lynnfieldlibrary.org', eventsUrl: 'https://www.lynnfieldlibrary.org/events', city: 'Lynnfield', state: 'MA', zipCode: '01940', county: 'Lynnfield County'},
  { name: 'Linden Branch Library', url: 'https://www.maldenlibrary.org', eventsUrl: 'https://www.maldenlibrary.org/events', city: 'Malden', state: 'MA', zipCode: '00000', county: 'Malden County'},
  { name: 'Manchaug Branch Library', url: 'https://www.manchauglibrary.org', eventsUrl: 'https://www.manchauglibrary.org/events', city: 'Manchaug', state: 'MA', zipCode: '00000', county: 'Manchaug County'},
  { name: 'Manchester-By-The-Sea Pub. Library', url: 'https://www.manchesterbytheselibrary.org', eventsUrl: 'https://www.manchesterbytheselibrary.org/events', city: 'Manchester-By-The-Se', state: 'MA', zipCode: '01944', county: 'Manchester-By-The-Se County'},
  { name: 'Manomet Branch Library', url: 'https://www.manometlibrary.org', eventsUrl: 'https://www.manometlibrary.org/events', city: 'Manomet', state: 'MA', zipCode: '00000', county: 'Manomet County'},
  { name: 'Mansfield Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'MA', zipCode: '02048', county: 'Mansfield County'},
  { name: 'Abbot Public Library', url: 'https://www.marbleheadlibrary.org', eventsUrl: 'https://www.marbleheadlibrary.org/events', city: 'Marblehead', state: 'MA', zipCode: '01945', county: 'Marblehead County'},
  { name: 'Elizabeth Taber Memorial Library', url: 'https://www.marionlibrary.org', eventsUrl: 'https://www.marionlibrary.org/events', city: 'Marion', state: 'MA', zipCode: '02738', county: 'Marion County'},
  { name: 'Marlborough Public Library', url: 'https://www.marlboroughlibrary.org', eventsUrl: 'https://www.marlboroughlibrary.org/events', city: 'Marlborough', state: 'MA', zipCode: '01752', county: 'Marlborough County'},
  { name: 'Ventress Memorial Library', url: 'https://www.marshfieldlibrary.org', eventsUrl: 'https://www.marshfieldlibrary.org/events', city: 'Marshfield', state: 'MA', zipCode: '02050', county: 'Marshfield County'},
  { name: 'Marstons Mills Public Library', url: 'https://www.marstonsmillslibrary.org', eventsUrl: 'https://www.marstonsmillslibrary.org/events', city: 'Marstons Mills', state: 'MA', zipCode: '02648', county: 'Marstons Mills County'},
  { name: 'Mashpee Public Library', url: 'https://www.mashpeelibrary.org', eventsUrl: 'https://www.mashpeelibrary.org/events', city: 'Mashpee', state: 'MA', zipCode: '02649', county: 'Mashpee County'},
  { name: 'Mattapan Branch Library', url: 'https://www.mattapanlibrary.org', eventsUrl: 'https://www.mattapanlibrary.org/events', city: 'Mattapan', state: 'MA', zipCode: '00000', county: 'Mattapan County'},
  { name: 'Mattapoisett Public Library', url: 'https://www.mattapoisettlibrary.org', eventsUrl: 'https://www.mattapoisettlibrary.org/events', city: 'Mattapoisett', state: 'MA', zipCode: '02739', county: 'Mattapoisett County'},
  { name: 'Maynard Public Library', url: 'https://www.maynardlibrary.org', eventsUrl: 'https://www.maynardlibrary.org/events', city: 'Maynard', state: 'MA', zipCode: '01754', county: 'Maynard County'},
  { name: 'Medfield Memorial Library', url: 'https://www.medfieldlibrary.org', eventsUrl: 'https://www.medfieldlibrary.org/events', city: 'Medfield', state: 'MA', zipCode: '02052', county: 'Medfield County'},
  { name: 'Medford Public Library', url: 'https://www.medfordlibrary.org', eventsUrl: 'https://www.medfordlibrary.org/events', city: 'Medford', state: 'MA', zipCode: '02155', county: 'Medford County'},
  { name: 'Medway Public Library', url: 'https://www.medwaylibrary.org', eventsUrl: 'https://www.medwaylibrary.org/events', city: 'Medway', state: 'MA', zipCode: '02053', county: 'Medway County'},
  { name: 'Melrose Public Library', url: 'https://www.melroselibrary.org', eventsUrl: 'https://www.melroselibrary.org/events', city: 'Melrose', state: 'MA', zipCode: '02176', county: 'Melrose County'},
  { name: 'Taft Public Library', url: 'https://www.mendonlibrary.org', eventsUrl: 'https://www.mendonlibrary.org/events', city: 'Mendon', state: 'MA', zipCode: '01756', county: 'Mendon County'},
  { name: 'Merrimac Public Library', url: 'https://www.merrimaclibrary.org', eventsUrl: 'https://www.merrimaclibrary.org/events', city: 'Merrimac', state: 'MA', zipCode: '01860', county: 'Merrimac County'},
  { name: 'Nevins Memorial Library', url: 'https://www.methuenlibrary.org', eventsUrl: 'https://www.methuenlibrary.org/events', city: 'Methuen', state: 'MA', zipCode: '01844', county: 'Methuen County'},
  { name: 'Middleborough Public Library', url: 'https://www.middleboroughlibrary.org', eventsUrl: 'https://www.middleboroughlibrary.org/events', city: 'Middleborough', state: 'MA', zipCode: '02346', county: 'Middleborough County'},
  { name: 'Middlefield Public Library', url: 'https://www.middlefieldlibrary.org', eventsUrl: 'https://www.middlefieldlibrary.org/events', city: 'Middlefield', state: 'MA', zipCode: '01243', county: 'Middlefield County'},
  { name: 'Flint Public Library', url: 'https://www.middletonlibrary.org', eventsUrl: 'https://www.middletonlibrary.org/events', city: 'Middleton', state: 'MA', zipCode: '01949', county: 'Middleton County'},
  { name: 'Milford Town Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'MA', zipCode: '01757', county: 'Milford County'},
  { name: 'New Marlborough Town Library', url: 'https://www.millriverlibrary.org', eventsUrl: 'https://www.millriverlibrary.org/events', city: 'Mill River', state: 'MA', zipCode: '01230', county: 'Mill River County'},
  { name: 'Millbury Public Library', url: 'https://www.millburylibrary.org', eventsUrl: 'https://www.millburylibrary.org/events', city: 'Millbury', state: 'MA', zipCode: '01527', county: 'Millbury County'},
  { name: 'Millers Falls Library', url: 'https://www.millersfallslibrary.org', eventsUrl: 'https://www.millersfallslibrary.org/events', city: 'Millers Falls', state: 'MA', zipCode: '00000', county: 'Millers Falls County'},
  { name: 'Millis Public Library', url: 'https://www.millislibrary.org', eventsUrl: 'https://www.millislibrary.org/events', city: 'Millis', state: 'MA', zipCode: '02054', county: 'Millis County'},
  { name: 'Millville Free Public Library', url: 'https://www.millvillelibrary.org', eventsUrl: 'https://www.millvillelibrary.org/events', city: 'Millville', state: 'MA', zipCode: '01529', county: 'Millville County'},
  { name: 'East Milton Branch Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'MA', zipCode: '00000', county: 'Milton County'},
  { name: 'Monroe Public Library', url: 'https://www.monroebridgelibrary.org', eventsUrl: 'https://www.monroebridgelibrary.org/events', city: 'Monroe Bridge', state: 'MA', zipCode: '01350', county: 'Monroe Bridge County'},
  { name: 'Monson Free Library Reading Room', url: 'https://www.monsonlibrary.org', eventsUrl: 'https://www.monsonlibrary.org/events', city: 'Monson', state: 'MA', zipCode: '01057', county: 'Monson County'},
  { name: 'Montague Center Library', url: 'https://www.montaguelibrary.org', eventsUrl: 'https://www.montaguelibrary.org/events', city: 'Montague', state: 'MA', zipCode: '00000', county: 'Montague County'},
  { name: 'Monterey Public Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'MA', zipCode: '01245', county: 'Monterey County'},
  { name: 'Grace Hall Memorial Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'MA', zipCode: '01085', county: 'Montgomery County'},
  { name: 'Mount Washington Public Library', url: 'https://www.mountwashingtonlibrary.org', eventsUrl: 'https://www.mountwashingtonlibrary.org/events', city: 'Mount Washington', state: 'MA', zipCode: '01258', county: 'Mount Washington County'},
  { name: 'Nahant Public Library', url: 'https://www.nahantlibrary.org', eventsUrl: 'https://www.nahantlibrary.org/events', city: 'Nahant', state: 'MA', zipCode: '01908', county: 'Nahant County'},
  { name: 'Nantucket Atheneum', url: 'https://www.nantucketlibrary.org', eventsUrl: 'https://www.nantucketlibrary.org/events', city: 'Nantucket', state: 'MA', zipCode: '02554', county: 'Nantucket County'},
  { name: 'Morse Institute Library', url: 'https://www.naticklibrary.org', eventsUrl: 'https://www.naticklibrary.org/events', city: 'Natick', state: 'MA', zipCode: '01760', county: 'Natick County'},
  { name: 'Needham Free Public Library', url: 'https://www.needhamlibrary.org', eventsUrl: 'https://www.needhamlibrary.org/events', city: 'Needham', state: 'MA', zipCode: '02494', county: 'Needham County'},
  { name: 'Casa Da Saudade', url: 'https://www.newbedfordlibrary.org', eventsUrl: 'https://www.newbedfordlibrary.org/events', city: 'New Bedford', state: 'MA', zipCode: '00000', county: 'New Bedford County'},
  { name: 'New Braintree Public Library', url: 'https://www.newbraintreelibrary.org', eventsUrl: 'https://www.newbraintreelibrary.org/events', city: 'New Braintree', state: 'MA', zipCode: '01531', county: 'New Braintree County'},
  { name: 'New Salem Public Library', url: 'https://www.newsalemlibrary.org', eventsUrl: 'https://www.newsalemlibrary.org/events', city: 'New Salem', state: 'MA', zipCode: '01355', county: 'New Salem County'},
  { name: 'Andrews Branch Library', url: 'https://www.newburyportlibrary.org', eventsUrl: 'https://www.newburyportlibrary.org/events', city: 'Newburyport', state: 'MA', zipCode: '00000', county: 'Newburyport County'},
  { name: 'Newton Free Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'MA', zipCode: '02459', county: 'Newton County'},
  { name: 'Newton Corner Branch Library', url: 'https://www.newtoncornerlibrary.org', eventsUrl: 'https://www.newtoncornerlibrary.org/events', city: 'Newton Corner', state: 'MA', zipCode: '00000', county: 'Newton Corner County'},
  { name: 'Norfolk Public Library', url: 'https://www.norfolklibrary.org', eventsUrl: 'https://www.norfolklibrary.org/events', city: 'Norfolk', state: 'MA', zipCode: '02056', county: 'Norfolk County'},
  { name: 'North Adams Public Library', url: 'https://www.northadamslibrary.org', eventsUrl: 'https://www.northadamslibrary.org/events', city: 'North Adams', state: 'MA', zipCode: '01247', county: 'North Adams County'},
  { name: 'Stevens Memorial Library', url: 'https://www.northandoverlibrary.org', eventsUrl: 'https://www.northandoverlibrary.org/events', city: 'North Andover', state: 'MA', zipCode: '01845', county: 'North Andover County'},
  { name: 'Richards Memorial Library', url: 'https://www.northattleboroughlibrary.org', eventsUrl: 'https://www.northattleboroughlibrary.org/events', city: 'North Attleborough', state: 'MA', zipCode: '02760', county: 'North Attleborough County'},
  { name: 'Haston Free Public Library', url: 'https://www.northbrookfieldlibrary.org', eventsUrl: 'https://www.northbrookfieldlibrary.org/events', city: 'North Brookfield', state: 'MA', zipCode: '01535', county: 'North Brookfield County'},
  { name: 'Mackay Branch Library', url: 'https://www.northchelmsfordlibrary.org', eventsUrl: 'https://www.northchelmsfordlibrary.org/events', city: 'North Chelmsford', state: 'MA', zipCode: '00000', county: 'North Chelmsford County'},
  { name: 'Ames Free Library Of Easton, Inc.', url: 'https://www.northeastonlibrary.org', eventsUrl: 'https://www.northeastonlibrary.org/events', city: 'North Easton', state: 'MA', zipCode: '02356', county: 'North Easton County'},
  { name: 'North Falmouth Branch Library', url: 'https://www.northfalmouthlibrary.org', eventsUrl: 'https://www.northfalmouthlibrary.org/events', city: 'North Falmouth', state: 'MA', zipCode: '00000', county: 'North Falmouth County'},
  { name: 'North Grafton Branch', url: 'https://www.northgraftonlibrary.org', eventsUrl: 'https://www.northgraftonlibrary.org/events', city: 'North Grafton', state: 'MA', zipCode: '00000', county: 'North Grafton County'},
  { name: 'Moore-Leland Library', url: 'https://www.northorangelibrary.org', eventsUrl: 'https://www.northorangelibrary.org/events', city: 'North Orange', state: 'MA', zipCode: '00000', county: 'North Orange County'},
  { name: 'Flint Memorial Library', url: 'https://www.northreadinglibrary.org', eventsUrl: 'https://www.northreadinglibrary.org/events', city: 'North Reading', state: 'MA', zipCode: '01864', county: 'North Reading County'},
  { name: 'Truro Public Library', url: 'https://www.northtrurolibrary.org', eventsUrl: 'https://www.northtrurolibrary.org/events', city: 'North Truro', state: 'MA', zipCode: '02652', county: 'North Truro County'},
  { name: 'North Branch Library', url: 'https://www.northweymouthlibrary.org', eventsUrl: 'https://www.northweymouthlibrary.org/events', city: 'North Weymouth', state: 'MA', zipCode: '00000', county: 'North Weymouth County'},
  { name: 'Forbes Library', url: 'https://www.northamptonlibrary.org', eventsUrl: 'https://www.northamptonlibrary.org/events', city: 'Northampton', state: 'MA', zipCode: '01060', county: 'Northampton County'},
  { name: 'Northborough Free Library', url: 'https://www.northboroughlibrary.org', eventsUrl: 'https://www.northboroughlibrary.org/events', city: 'Northborough', state: 'MA', zipCode: '01532', county: 'Northborough County'},
  { name: 'Dickinson Memorial Library', url: 'https://www.northfieldlibrary.org', eventsUrl: 'https://www.northfieldlibrary.org/events', city: 'Northfield', state: 'MA', zipCode: '01360', county: 'Northfield County'},
  { name: 'Norton Public Library', url: 'https://www.nortonlibrary.org', eventsUrl: 'https://www.nortonlibrary.org/events', city: 'Norton', state: 'MA', zipCode: '02766', county: 'Norton County'},
  { name: 'Norwell Public Library', url: 'https://www.norwelllibrary.org', eventsUrl: 'https://www.norwelllibrary.org/events', city: 'Norwell', state: 'MA', zipCode: '02061', county: 'Norwell County'},
  { name: 'Morrill Memorial Library', url: 'https://www.norwoodlibrary.org', eventsUrl: 'https://www.norwoodlibrary.org/events', city: 'Norwood', state: 'MA', zipCode: '02062', county: 'Norwood County'},
  { name: 'Oak Bluffs Public Library', url: 'https://www.oakbluffslibrary.org', eventsUrl: 'https://www.oakbluffslibrary.org/events', city: 'Oak Bluffs', state: 'MA', zipCode: '02557', county: 'Oak Bluffs County'},
  { name: 'Fobes Memorial Library', url: 'https://www.oakhamlibrary.org', eventsUrl: 'https://www.oakhamlibrary.org/events', city: 'Oakham', state: 'MA', zipCode: '01068', county: 'Oakham County'},
  { name: 'Wheeler Memorial Library', url: 'https://www.orangelibrary.org', eventsUrl: 'https://www.orangelibrary.org/events', city: 'Orange', state: 'MA', zipCode: '01364', county: 'Orange County'},
  { name: 'Snow Library', url: 'https://www.orleanslibrary.org', eventsUrl: 'https://www.orleanslibrary.org/events', city: 'Orleans', state: 'MA', zipCode: '02653', county: 'Orleans County'},
  { name: 'Osterville Free Library', url: 'https://www.ostervillelibrary.org', eventsUrl: 'https://www.ostervillelibrary.org/events', city: 'Osterville', state: 'MA', zipCode: '02655', county: 'Osterville County'},
  { name: 'Otis Free Public Library', url: 'https://www.otislibrary.org', eventsUrl: 'https://www.otislibrary.org/events', city: 'Otis', state: 'MA', zipCode: '01253', county: 'Otis County'},
  { name: 'Oxford Free Public Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'MA', zipCode: '01540', county: 'Oxford County'},
  { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'MA', zipCode: '01069', county: 'Palmer County'},
  { name: 'Richards Memorial Library', url: 'https://www.paxtonlibrary.org', eventsUrl: 'https://www.paxtonlibrary.org/events', city: 'Paxton', state: 'MA', zipCode: '01612', county: 'Paxton County'},
  { name: 'Peabody Institute Library', url: 'https://www.peabodylibrary.org', eventsUrl: 'https://www.peabodylibrary.org/events', city: 'Peabody', state: 'MA', zipCode: '01960', county: 'Peabody County'},
  { name: 'Pelham Library', url: 'https://www.pelhamlibrary.org', eventsUrl: 'https://www.pelhamlibrary.org/events', city: 'Pelham', state: 'MA', zipCode: '01002', county: 'Pelham County'},
  { name: 'Pembroke Public Library', url: 'https://www.pembrokelibrary.org', eventsUrl: 'https://www.pembrokelibrary.org/events', city: 'Pembroke', state: 'MA', zipCode: '02359', county: 'Pembroke County'},
  { name: 'Lawrence Library', url: 'https://www.pepperelllibrary.org', eventsUrl: 'https://www.pepperelllibrary.org/events', city: 'Pepperell', state: 'MA', zipCode: '01463', county: 'Pepperell County'},
  { name: 'Peru Library', url: 'https://www.perulibrary.org', eventsUrl: 'https://www.perulibrary.org/events', city: 'Peru', state: 'MA', zipCode: '01235', county: 'Peru County'},
  { name: 'Petersham Memorial Library', url: 'https://www.petershamlibrary.org', eventsUrl: 'https://www.petershamlibrary.org/events', city: 'Petersham', state: 'MA', zipCode: '01366', county: 'Petersham County'},
  { name: 'Phillips Free Public Library', url: 'https://www.phillipstonlibrary.org', eventsUrl: 'https://www.phillipstonlibrary.org/events', city: 'Phillipston', state: 'MA', zipCode: '01331', county: 'Phillipston County'},
  { name: 'Berkshire Athenaeum', url: 'https://www.pittsfieldlibrary.org', eventsUrl: 'https://www.pittsfieldlibrary.org/events', city: 'Pittsfield', state: 'MA', zipCode: '01201', county: 'Pittsfield County'},
  { name: 'Shaw Memorial Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'MA', zipCode: '01070', county: 'Plainfield County'},
  { name: 'Plainville Public Library', url: 'https://www.plainvillelibrary.org', eventsUrl: 'https://www.plainvillelibrary.org/events', city: 'Plainville', state: 'MA', zipCode: '02762', county: 'Plainville County'},
  { name: 'Plymouth Public Library', url: 'https://www.plymouthlibrary.org', eventsUrl: 'https://www.plymouthlibrary.org/events', city: 'Plymouth', state: 'MA', zipCode: '02360', county: 'Plymouth County'},
  { name: 'Plympton Public Library', url: 'https://www.plymptonlibrary.org', eventsUrl: 'https://www.plymptonlibrary.org/events', city: 'Plympton', state: 'MA', zipCode: '02367', county: 'Plympton County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'MA', zipCode: '01541', county: 'Princeton County'},
  { name: 'Provincetown Public Library', url: 'https://www.provincetownlibrary.org', eventsUrl: 'https://www.provincetownlibrary.org/events', city: 'Provincetown', state: 'MA', zipCode: '02657', county: 'Provincetown County'},
  { name: 'Adams Shore Branch Library', url: 'https://www.quincylibrary.org', eventsUrl: 'https://www.quincylibrary.org/events', city: 'Quincy', state: 'MA', zipCode: '00000', county: 'Quincy County'},
  { name: 'Turner Free Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'MA', zipCode: '02368', county: 'Randolph County'},
  { name: 'Raynham Public Library', url: 'https://www.raynhamlibrary.org', eventsUrl: 'https://www.raynhamlibrary.org/events', city: 'Raynham', state: 'MA', zipCode: '02767', county: 'Raynham County'},
  { name: 'Reading Public Library', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'MA', zipCode: '01867', county: 'Reading County'},
  { name: 'Blanding Public Library', url: 'https://www.rehobothlibrary.org', eventsUrl: 'https://www.rehobothlibrary.org/events', city: 'Rehoboth', state: 'MA', zipCode: '02769', county: 'Rehoboth County'},
  { name: 'Revere Public Library', url: 'https://www.reverelibrary.org', eventsUrl: 'https://www.reverelibrary.org/events', city: 'Revere', state: 'MA', zipCode: '02151', county: 'Revere County'},
  { name: 'Richmond Free Public Library', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'MA', zipCode: '01254', county: 'Richmond County'},
  { name: 'Joseph H. Plumb Memorial Library', url: 'https://www.rochesterlibrary.org', eventsUrl: 'https://www.rochesterlibrary.org/events', city: 'Rochester', state: 'MA', zipCode: '02770', county: 'Rochester County'},
  { name: 'Rockland Memorial Library', url: 'https://www.rocklandlibrary.org', eventsUrl: 'https://www.rocklandlibrary.org/events', city: 'Rockland', state: 'MA', zipCode: '02370', county: 'Rockland County'},
  { name: 'Rockport Public Library', url: 'https://www.rockportlibrary.org', eventsUrl: 'https://www.rockportlibrary.org/events', city: 'Rockport', state: 'MA', zipCode: '01966', county: 'Rockport County'},
  { name: 'Roslindale Branch Library', url: 'https://www.roslindalelibrary.org', eventsUrl: 'https://www.roslindalelibrary.org/events', city: 'Roslindale', state: 'MA', zipCode: '00000', county: 'Roslindale County'},
  { name: 'Rowe Town Library', url: 'https://www.rowelibrary.org', eventsUrl: 'https://www.rowelibrary.org/events', city: 'Rowe', state: 'MA', zipCode: '01367', county: 'Rowe County'},
  { name: 'Rowley Public Library', url: 'https://www.rowleylibrary.org', eventsUrl: 'https://www.rowleylibrary.org/events', city: 'Rowley', state: 'MA', zipCode: '01969', county: 'Rowley County'},
  { name: 'Dudley Branch Library', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'MA', zipCode: '00000', county: 'Roxbury County'},
  { name: 'Phinehas S. Newton Library', url: 'https://www.royalstonlibrary.org', eventsUrl: 'https://www.royalstonlibrary.org/events', city: 'Royalston', state: 'MA', zipCode: '01368', county: 'Royalston County'},
  { name: 'Russell Public Library', url: 'https://www.russelllibrary.org', eventsUrl: 'https://www.russelllibrary.org/events', city: 'Russell', state: 'MA', zipCode: '01071', county: 'Russell County'},
  { name: 'Rutland Free Public Library', url: 'https://www.rutlandlibrary.org', eventsUrl: 'https://www.rutlandlibrary.org/events', city: 'Rutland', state: 'MA', zipCode: '01543', county: 'Rutland County'},
  { name: 'Salem Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'MA', zipCode: '01970', county: 'Salem County'},
  { name: 'Salisbury Public Library', url: 'https://www.salisburylibrary.org', eventsUrl: 'https://www.salisburylibrary.org/events', city: 'Salisbury', state: 'MA', zipCode: '01952', county: 'Salisbury County'},
  { name: 'Sandisfield Public Library', url: 'https://www.sandisfieldlibrary.org', eventsUrl: 'https://www.sandisfieldlibrary.org/events', city: 'Sandisfield', state: 'MA', zipCode: '01255', county: 'Sandisfield County'},
  { name: 'Sandwich Free Public Library', url: 'https://www.sandwichlibrary.org', eventsUrl: 'https://www.sandwichlibrary.org/events', city: 'Sandwich', state: 'MA', zipCode: '02563', county: 'Sandwich County'},
  { name: 'Saugus Public Library', url: 'https://www.sauguslibrary.org', eventsUrl: 'https://www.sauguslibrary.org/events', city: 'Saugus', state: 'MA', zipCode: '01906', county: 'Saugus County'},
  { name: 'Savoy Hollow Library', url: 'https://www.savoylibrary.org', eventsUrl: 'https://www.savoylibrary.org/events', city: 'Savoy', state: 'MA', zipCode: '01256', county: 'Savoy County'},
  { name: 'Scituate Town Library', url: 'https://www.scituatelibrary.org', eventsUrl: 'https://www.scituatelibrary.org/events', city: 'Scituate', state: 'MA', zipCode: '02066', county: 'Scituate County'},
  { name: 'Seekonk Public Library', url: 'https://www.seekonklibrary.org', eventsUrl: 'https://www.seekonklibrary.org/events', city: 'Seekonk', state: 'MA', zipCode: '02771', county: 'Seekonk County'},
  { name: 'Sharon Public Library', url: 'https://www.sharonlibrary.org', eventsUrl: 'https://www.sharonlibrary.org/events', city: 'Sharon', state: 'MA', zipCode: '02067', county: 'Sharon County'},
  { name: 'Bushnell-Sage Library', url: 'https://www.sheffieldlibrary.org', eventsUrl: 'https://www.sheffieldlibrary.org/events', city: 'Sheffield', state: 'MA', zipCode: '01257', county: 'Sheffield County'},
  { name: 'Shelburne Free Public Library', url: 'https://www.shelburnelibrary.org', eventsUrl: 'https://www.shelburnelibrary.org/events', city: 'Shelburne', state: 'MA', zipCode: '01370', county: 'Shelburne County'},
  { name: 'Arms Library', url: 'https://www.shelburnefallslibrary.org', eventsUrl: 'https://www.shelburnefallslibrary.org/events', city: 'Shelburne Falls', state: 'MA', zipCode: '01370', county: 'Shelburne Falls County'},
  { name: 'Sherborn Library', url: 'https://www.sherbornlibrary.org', eventsUrl: 'https://www.sherbornlibrary.org/events', city: 'Sherborn', state: 'MA', zipCode: '01770', county: 'Sherborn County'},
  { name: 'Hazen Memorial Library', url: 'https://www.shirleylibrary.org', eventsUrl: 'https://www.shirleylibrary.org/events', city: 'Shirley', state: 'MA', zipCode: '01464', county: 'Shirley County'},
  { name: 'Shrewsbury Free Public Library', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'MA', zipCode: '01545', county: 'Shrewsbury County'},
  { name: 'M. N. Spear Memorial Library', url: 'https://www.shutesburylibrary.org', eventsUrl: 'https://www.shutesburylibrary.org/events', city: 'Shutesbury', state: 'MA', zipCode: '01072', county: 'Shutesbury County'},
  { name: 'Somerset Public Library', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'MA', zipCode: '02726', county: 'Somerset County'},
  { name: 'East Branch Library', url: 'https://www.somervillelibrary.org', eventsUrl: 'https://www.somervillelibrary.org/events', city: 'Somerville', state: 'MA', zipCode: '00000', county: 'Somerville County'},
  { name: 'South Attleboro Branch Library', url: 'https://www.souhattleborolibrary.org', eventsUrl: 'https://www.souhattleborolibrary.org/events', city: 'Souh Attleboro', state: 'MA', zipCode: '00000', county: 'Souh Attleboro County'},
  { name: 'South Boston Branch Library', url: 'https://www.southbostonlibrary.org', eventsUrl: 'https://www.southbostonlibrary.org/events', city: 'South Boston', state: 'MA', zipCode: '00000', county: 'South Boston County'},
  { name: 'South Chatham Public Library', url: 'https://www.southchathamlibrary.org', eventsUrl: 'https://www.southchathamlibrary.org/events', city: 'South Chatham', state: 'MA', zipCode: '02659', county: 'South Chatham County'},
  { name: 'Tilton Library', url: 'https://www.southdeerfieldlibrary.org', eventsUrl: 'https://www.southdeerfieldlibrary.org/events', city: 'South Deerfield', state: 'MA', zipCode: '01373', county: 'South Deerfield County'},
  { name: 'South Dennis Free Public Library', url: 'https://www.southdennislibrary.org', eventsUrl: 'https://www.southdennislibrary.org/events', city: 'South Dennis', state: 'MA', zipCode: '02660', county: 'South Dennis County'},
  { name: 'Egremont Free Library', url: 'https://www.southegremontlibrary.org', eventsUrl: 'https://www.southegremontlibrary.org/events', city: 'South Egremont', state: 'MA', zipCode: '01258', county: 'South Egremont County'},
  { name: 'South Grafton Branch Library', url: 'https://www.southgraftonlibrary.org', eventsUrl: 'https://www.southgraftonlibrary.org/events', city: 'South Grafton', state: 'MA', zipCode: '00000', county: 'South Grafton County'},
  { name: 'Gaylord Memorial Library', url: 'https://www.southhadleylibrary.org', eventsUrl: 'https://www.southhadleylibrary.org/events', city: 'South Hadley', state: 'MA', zipCode: '01075', county: 'South Hadley County'},
  { name: 'Hamilton-Wenham Public Library', url: 'https://www.southhamiltonlibrary.org', eventsUrl: 'https://www.southhamiltonlibrary.org/events', city: 'South Hamilton', state: 'MA', zipCode: '01982', county: 'South Hamilton County'},
  { name: 'Bacon Free Library', url: 'https://www.southnaticklibrary.org', eventsUrl: 'https://www.southnaticklibrary.org/events', city: 'South Natick', state: 'MA', zipCode: '01760', county: 'South Natick County'},
  { name: 'Fogg Library', url: 'https://www.southweymouthlibrary.org', eventsUrl: 'https://www.southweymouthlibrary.org/events', city: 'South Weymouth', state: 'MA', zipCode: '00000', county: 'South Weymouth County'},
  { name: 'Yarmouth Town Library Board', url: 'https://www.southyarmouthlibrary.org', eventsUrl: 'https://www.southyarmouthlibrary.org/events', city: 'South Yarmouth', state: 'MA', zipCode: '02664', county: 'South Yarmouth County'},
  { name: 'Edwards Public Library', url: 'https://www.southamptonlibrary.org', eventsUrl: 'https://www.southamptonlibrary.org/events', city: 'Southampton', state: 'MA', zipCode: '01073', county: 'Southampton County'},
  { name: 'Southborough Public Library', url: 'https://www.southboroughlibrary.org', eventsUrl: 'https://www.southboroughlibrary.org/events', city: 'Southborough', state: 'MA', zipCode: '01772', county: 'Southborough County'},
  { name: 'Jacob Edwards Library', url: 'https://www.southbridgelibrary.org', eventsUrl: 'https://www.southbridgelibrary.org/events', city: 'Southbridge', state: 'MA', zipCode: '01550', county: 'Southbridge County'},
  { name: 'Southwick Public Library', url: 'https://www.southwicklibrary.org', eventsUrl: 'https://www.southwicklibrary.org/events', city: 'Southwick', state: 'MA', zipCode: '01077', county: 'Southwick County'},
  { name: 'Richard Sugden Public Library', url: 'https://www.spencerlibrary.org', eventsUrl: 'https://www.spencerlibrary.org/events', city: 'Spencer', state: 'MA', zipCode: '01562', county: 'Spencer County'},
  { name: 'Brightwood Branch Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'MA', zipCode: '00000', county: 'Springfield County'},
  { name: 'Conant Free Public Library', url: 'https://www.sterlinglibrary.org', eventsUrl: 'https://www.sterlinglibrary.org/events', city: 'Sterling', state: 'MA', zipCode: '01564', county: 'Sterling County'},
  { name: 'Stockbridge Library Association', url: 'https://www.stockbridgelibrary.org', eventsUrl: 'https://www.stockbridgelibrary.org/events', city: 'Stockbridge', state: 'MA', zipCode: '01262', county: 'Stockbridge County'},
  { name: 'Stoneham Public Library', url: 'https://www.stonehamlibrary.org', eventsUrl: 'https://www.stonehamlibrary.org/events', city: 'Stoneham', state: 'MA', zipCode: '02180', county: 'Stoneham County'},
  { name: 'Stoughton Public Library', url: 'https://www.stoughtonlibrary.org', eventsUrl: 'https://www.stoughtonlibrary.org/events', city: 'Stoughton', state: 'MA', zipCode: '02072', county: 'Stoughton County'},
  { name: 'Randall Library', url: 'https://www.stowlibrary.org', eventsUrl: 'https://www.stowlibrary.org/events', city: 'Stow', state: 'MA', zipCode: '01775', county: 'Stow County'},
  { name: 'Joshua Hyde Public Library', url: 'https://www.sturbridgelibrary.org', eventsUrl: 'https://www.sturbridgelibrary.org/events', city: 'Sturbridge', state: 'MA', zipCode: '01566', county: 'Sturbridge County'},
  { name: 'Goodnow Public Library', url: 'https://www.sudburylibrary.org', eventsUrl: 'https://www.sudburylibrary.org/events', city: 'Sudbury', state: 'MA', zipCode: '01776', county: 'Sudbury County'},
  { name: 'Graves Memorial Library', url: 'https://www.sunderlandlibrary.org', eventsUrl: 'https://www.sunderlandlibrary.org/events', city: 'Sunderland', state: 'MA', zipCode: '00000', county: 'Sunderland County'},
  { name: 'Sutton Free Public Library', url: 'https://www.suttonlibrary.org', eventsUrl: 'https://www.suttonlibrary.org/events', city: 'Sutton', state: 'MA', zipCode: '01590', county: 'Sutton County'},
  { name: 'Swampscott Public Library', url: 'https://www.swampscottlibrary.org', eventsUrl: 'https://www.swampscottlibrary.org/events', city: 'Swampscott', state: 'MA', zipCode: '01907', county: 'Swampscott County'},
  { name: 'Swansea Free Public Library', url: 'https://www.swansealibrary.org', eventsUrl: 'https://www.swansealibrary.org/events', city: 'Swansea', state: 'MA', zipCode: '02777', county: 'Swansea County'},
  { name: 'Taunton Public Library', url: 'https://www.tauntonlibrary.org', eventsUrl: 'https://www.tauntonlibrary.org/events', city: 'Taunton', state: 'MA', zipCode: '02780', county: 'Taunton County'},
  { name: 'Boynton Public Library', url: 'https://www.templetonlibrary.org', eventsUrl: 'https://www.templetonlibrary.org/events', city: 'Templeton', state: 'MA', zipCode: '01468', county: 'Templeton County'},
  { name: 'Tewksbury Public Library', url: 'https://www.tewksburylibrary.org', eventsUrl: 'https://www.tewksburylibrary.org/events', city: 'Tewksbury', state: 'MA', zipCode: '01876', county: 'Tewksbury County'},
  { name: 'Tolland Public Library', url: 'https://www.tollandlibrary.org', eventsUrl: 'https://www.tollandlibrary.org/events', city: 'Tolland', state: 'MA', zipCode: '01034', county: 'Tolland County'},
  { name: 'Topsfield Town Library', url: 'https://www.topsfieldlibrary.org', eventsUrl: 'https://www.topsfieldlibrary.org/events', city: 'Topsfield', state: 'MA', zipCode: '01983', county: 'Topsfield County'},
  { name: 'Townsend Public Library', url: 'https://www.townsendlibrary.org', eventsUrl: 'https://www.townsendlibrary.org/events', city: 'Townsend', state: 'MA', zipCode: '01469', county: 'Townsend County'},
  { name: 'Montague Public Libraries', url: 'https://www.turnersfallslibrary.org', eventsUrl: 'https://www.turnersfallslibrary.org/events', city: 'Turners Falls', state: 'MA', zipCode: '01376', county: 'Turners Falls County'},
  { name: 'Tyngsborough Public Library', url: 'https://www.tyngsboroughlibrary.org', eventsUrl: 'https://www.tyngsboroughlibrary.org/events', city: 'Tyngsborough', state: 'MA', zipCode: '01879', county: 'Tyngsborough County'},
  { name: 'Tyringham Free Public Library', url: 'https://www.tyringhamlibrary.org', eventsUrl: 'https://www.tyringhamlibrary.org/events', city: 'Tyringham', state: 'MA', zipCode: '01264', county: 'Tyringham County'},
  { name: 'Upton Town Library', url: 'https://www.uptonlibrary.org', eventsUrl: 'https://www.uptonlibrary.org/events', city: 'Upton', state: 'MA', zipCode: '00000', county: 'Upton County'},
  { name: 'Uxbridge Free Public Library', url: 'https://www.uxbridgelibrary.org', eventsUrl: 'https://www.uxbridgelibrary.org/events', city: 'Uxbridge', state: 'MA', zipCode: '01569', county: 'Uxbridge County'},
  { name: 'Vineyard Haven Public Library', url: 'https://www.vineyardhavenlibrary.org', eventsUrl: 'https://www.vineyardhavenlibrary.org/events', city: 'Vineyard Haven', state: 'MA', zipCode: '02568', county: 'Vineyard Haven County'},
  { name: 'Waban Branch Library', url: 'https://www.wabanlibrary.org', eventsUrl: 'https://www.wabanlibrary.org/events', city: 'Waban', state: 'MA', zipCode: '00000', county: 'Waban County'},
  { name: 'Lucius Beebe Memorial Library', url: 'https://www.wakefieldlibrary.org', eventsUrl: 'https://www.wakefieldlibrary.org/events', city: 'Wakefield', state: 'MA', zipCode: '01880', county: 'Wakefield County'},
  { name: 'Wales Public Library', url: 'https://www.waleslibrary.org', eventsUrl: 'https://www.waleslibrary.org/events', city: 'Wales', state: 'MA', zipCode: '01081', county: 'Wales County'},
  { name: 'Walpole Public Library', url: 'https://www.walpolelibrary.org', eventsUrl: 'https://www.walpolelibrary.org/events', city: 'Walpole', state: 'MA', zipCode: '02081', county: 'Walpole County'},
  { name: 'Waltham Public Library', url: 'https://www.walthamlibrary.org', eventsUrl: 'https://www.walthamlibrary.org/events', city: 'Waltham', state: 'MA', zipCode: '02451', county: 'Waltham County'},
  { name: 'Young Mens Library Association', url: 'https://www.warelibrary.org', eventsUrl: 'https://www.warelibrary.org/events', city: 'Ware', state: 'MA', zipCode: '01082', county: 'Ware County'},
  { name: 'Wareham Free Library', url: 'https://www.warehamlibrary.org', eventsUrl: 'https://www.warehamlibrary.org/events', city: 'Wareham', state: 'MA', zipCode: '02571', county: 'Wareham County'},
  { name: 'Warren Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'MA', zipCode: '01083', county: 'Warren County'},
  { name: 'Warwick Free Public Library', url: 'https://www.warwicklibrary.org', eventsUrl: 'https://www.warwicklibrary.org/events', city: 'Warwick', state: 'MA', zipCode: '01378', county: 'Warwick County'},
  { name: 'East Branch Library', url: 'https://www.watertownlibrary.org', eventsUrl: 'https://www.watertownlibrary.org/events', city: 'Watertown', state: 'MA', zipCode: '00000', county: 'Watertown County'},
  { name: 'Wayland Free Public Library', url: 'https://www.waylandlibrary.org', eventsUrl: 'https://www.waylandlibrary.org/events', city: 'Wayland', state: 'MA', zipCode: '01778', county: 'Wayland County'},
  { name: 'Chester C. Corbin Public Library', url: 'https://www.websterlibrary.org', eventsUrl: 'https://www.websterlibrary.org/events', city: 'Webster', state: 'MA', zipCode: '01570', county: 'Webster County'},
  { name: 'Fells Branch Library', url: 'https://www.wellesleylibrary.org', eventsUrl: 'https://www.wellesleylibrary.org/events', city: 'Wellesley', state: 'MA', zipCode: '00000', county: 'Wellesley County'},
  { name: 'Wellfleet Public Library', url: 'https://www.wellfleetlibrary.org', eventsUrl: 'https://www.wellfleetlibrary.org/events', city: 'Wellfleet', state: 'MA', zipCode: '02667', county: 'Wellfleet County'},
  { name: 'Wendell Free Library', url: 'https://www.wendelllibrary.org', eventsUrl: 'https://www.wendelllibrary.org/events', city: 'Wendell', state: 'MA', zipCode: '01379', county: 'Wendell County'},
  { name: 'Whelden Memorial Library', url: 'https://www.westbarnstablelibrary.org', eventsUrl: 'https://www.westbarnstablelibrary.org/events', city: 'West Barnstable', state: 'MA', zipCode: '02668', county: 'West Barnstable County'},
  { name: 'Beaman Memorial Public Library', url: 'https://www.westboylstonlibrary.org', eventsUrl: 'https://www.westboylstonlibrary.org/events', city: 'West Boylston', state: 'MA', zipCode: '01583', county: 'West Boylston County'},
  { name: 'West Bridgewater Public Library', url: 'https://www.westbridgewaterlibrary.org', eventsUrl: 'https://www.westbridgewaterlibrary.org/events', city: 'West Bridgewater', state: 'MA', zipCode: '02379', county: 'West Bridgewater County'},
  { name: 'Merriam-Gilbert Public Library', url: 'https://www.westbrookfieldlibrary.org', eventsUrl: 'https://www.westbrookfieldlibrary.org/events', city: 'West Brookfield', state: 'MA', zipCode: '01585', county: 'West Brookfield County'},
  { name: 'West Dennis Free Public Library', url: 'https://www.westdennislibrary.org', eventsUrl: 'https://www.westdennislibrary.org/events', city: 'West Dennis', state: 'MA', zipCode: '02670', county: 'West Dennis County'},
  { name: 'West Falmouth Library, Inc.', url: 'https://www.westfalmouthlibrary.org', eventsUrl: 'https://www.westfalmouthlibrary.org/events', city: 'West Falmouth', state: 'MA', zipCode: '02540', county: 'West Falmouth County'},
  { name: 'Chase Library Assoc., Inc.', url: 'https://www.westharwichlibrary.org', eventsUrl: 'https://www.westharwichlibrary.org/events', city: 'West Harwich', state: 'MA', zipCode: '02671', county: 'West Harwich County'},
  { name: 'G. A. R. Memorial Library', url: 'https://www.westnewburylibrary.org', eventsUrl: 'https://www.westnewburylibrary.org/events', city: 'West Newbury', state: 'MA', zipCode: '01985', county: 'West Newbury County'},
  { name: 'West Roxbury Branch Library', url: 'https://www.westroxburylibrary.org', eventsUrl: 'https://www.westroxburylibrary.org/events', city: 'West Roxbury', state: 'MA', zipCode: '00000', county: 'West Roxbury County'},
  { name: 'West Springfield Public Library', url: 'https://www.westspringfieldlibrary.org', eventsUrl: 'https://www.westspringfieldlibrary.org/events', city: 'West Springfield', state: 'MA', zipCode: '01089', county: 'West Springfield County'},
  { name: 'West Stockbridge Public Library', url: 'https://www.weststockbridgelibrary.org', eventsUrl: 'https://www.weststockbridgelibrary.org/events', city: 'West Stockbridge', state: 'MA', zipCode: '01266', county: 'West Stockbridge County'},
  { name: 'West Warren Library Association', url: 'https://www.westwarrenlibrary.org', eventsUrl: 'https://www.westwarrenlibrary.org/events', city: 'West Warren', state: 'MA', zipCode: '01092', county: 'West Warren County'},
  { name: 'West Yarmouth Library', url: 'https://www.westyarmouthlibrary.org', eventsUrl: 'https://www.westyarmouthlibrary.org/events', city: 'West Yarmouth', state: 'MA', zipCode: '00000', county: 'West Yarmouth County'},
  { name: 'Westborough Public Library', url: 'https://www.westboroughlibrary.org', eventsUrl: 'https://www.westboroughlibrary.org/events', city: 'Westborough', state: 'MA', zipCode: '01581', county: 'Westborough County'},
  { name: 'Westfield Athenaeum', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'MA', zipCode: '01085', county: 'Westfield County'},
  { name: 'J. V. Fletcher Library', url: 'https://www.westfordlibrary.org', eventsUrl: 'https://www.westfordlibrary.org/events', city: 'Westford', state: 'MA', zipCode: '01886', county: 'Westford County'},
  { name: 'Westhampton Memorial Library', url: 'https://www.westhamptonlibrary.org', eventsUrl: 'https://www.westhamptonlibrary.org/events', city: 'Westhampton', state: 'MA', zipCode: '01027', county: 'Westhampton County'},
  { name: 'Forbush Memorial Library', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'MA', zipCode: '01473', county: 'Westminster County'},
  { name: 'Weston Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'MA', zipCode: '02493', county: 'Weston County'},
  { name: 'Westport Free Public Library', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'MA', zipCode: '02790', county: 'Westport County'},
  { name: 'Islington Branch Library', url: 'https://www.westwoodlibrary.org', eventsUrl: 'https://www.westwoodlibrary.org/events', city: 'Westwood', state: 'MA', zipCode: '00000', county: 'Westwood County'},
  { name: 'Tufts Library', url: 'https://www.weymouthlibrary.org', eventsUrl: 'https://www.weymouthlibrary.org/events', city: 'Weymouth', state: 'MA', zipCode: '02188', county: 'Weymouth County'},
  { name: 'S. White Dickinson Memorial Library', url: 'https://www.whatelylibrary.org', eventsUrl: 'https://www.whatelylibrary.org/events', city: 'Whately', state: 'MA', zipCode: '01093', county: 'Whately County'},
  { name: 'Whitinsville Social Library', url: 'https://www.whitinsvillelibrary.org', eventsUrl: 'https://www.whitinsvillelibrary.org/events', city: 'Whitinsville', state: 'MA', zipCode: '01588', county: 'Whitinsville County'},
  { name: 'Whitman Public Library', url: 'https://www.whitmanlibrary.org', eventsUrl: 'https://www.whitmanlibrary.org/events', city: 'Whitman', state: 'MA', zipCode: '02382', county: 'Whitman County'},
  { name: 'Wilbraham Public Library', url: 'https://www.wilbrahamlibrary.org', eventsUrl: 'https://www.wilbrahamlibrary.org/events', city: 'Wilbraham', state: 'MA', zipCode: '01095', county: 'Wilbraham County'},
  { name: 'Meekins Public Library', url: 'https://www.williamsburglibrary.org', eventsUrl: 'https://www.williamsburglibrary.org/events', city: 'Williamsburg', state: 'MA', zipCode: '01096', county: 'Williamsburg County'},
  { name: 'David Joyce Milne Public Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'MA', zipCode: '01267', county: 'Williamstown County'},
  { name: 'Wilmington Memorial Library', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'MA', zipCode: '01887', county: 'Wilmington County'},
  { name: 'Beals Memorial Library', url: 'https://www.winchendonlibrary.org', eventsUrl: 'https://www.winchendonlibrary.org/events', city: 'Winchendon', state: 'MA', zipCode: '01475', county: 'Winchendon County'},
  { name: 'Winchester Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'MA', zipCode: '01890', county: 'Winchester County'},
  { name: 'Windsor Free Public Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'MA', zipCode: '01270', county: 'Windsor County'},
  { name: 'Winthrop Public Library', url: 'https://www.winthroplibrary.org', eventsUrl: 'https://www.winthroplibrary.org/events', city: 'Winthrop', state: 'MA', zipCode: '02152', county: 'Winthrop County'},
  { name: 'Woburn Public Library', url: 'https://www.woburnlibrary.org', eventsUrl: 'https://www.woburnlibrary.org/events', city: 'Woburn', state: 'MA', zipCode: '01801', county: 'Woburn County'},
  { name: 'Woods Hole Public Library', url: 'https://www.woodsholelibrary.org', eventsUrl: 'https://www.woodsholelibrary.org/events', city: 'Woods Hole', state: 'MA', zipCode: '02543', county: 'Woods Hole County'},
  { name: 'Frances Perkins Branch Library At Greendale', url: 'https://www.worcesterlibrary.org', eventsUrl: 'https://www.worcesterlibrary.org/events', city: 'Worcester', state: 'MA', zipCode: '00000', county: 'Worcester County'},
  { name: 'Worthington Library', url: 'https://www.worthingtonlibrary.org', eventsUrl: 'https://www.worthingtonlibrary.org/events', city: 'Worthington', state: 'MA', zipCode: '01098', county: 'Worthington County'},
  { name: 'Fiske Public Library', url: 'https://www.wrenthamlibrary.org', eventsUrl: 'https://www.wrenthamlibrary.org/events', city: 'Wrentham', state: 'MA', zipCode: '02093', county: 'Wrentham County'}
];

const SCRAPER_NAME = 'wordpress-MA';

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
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMACloudFunction };
