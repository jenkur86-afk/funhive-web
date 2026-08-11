// 11 entries removed 2026-08-09 (MASTER-PLAN Defect A): their {city}library.org
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
const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');
const ngeohash = require('ngeohash');
/**
 * Connecticut Public Libraries Scraper - Coverage: All Connecticut public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Hartford Public Library', url: 'https://www.hplct.org/', eventsUrl: 'https://www.hplct.org/', city: 'Hartford', state: 'CT', zipCode: '06103', county: 'Hartford County'},
  { name: 'New Haven Free Public Library', url: 'https://www.nhfpl.org', eventsUrl: 'https://www.nhfpl.org/events', city: 'New Haven', state: 'CT', zipCode: '06510', county: 'New Haven County'},
  { name: 'Bridgeport Public Library', url: 'https://www.bportlibrary.org', eventsUrl: 'https://www.bportlibrary.org/events', city: 'Bridgeport', state: 'CT', zipCode: '06604', county: 'Greater Bridgeport Planning Region'},
  // Regional Libraries
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in VT, not CT. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Stamford Public Library', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'CT', zipCode: '06901', county: 'Western Connecticut Planning Region'},
  { name: 'Waterbury Public Library', url: 'https://www.siloam.com', eventsUrl: 'https://www.siloam.com/events', city: 'Waterbury', state: 'CT', zipCode: '06702', county: 'Naugatuck Valley Planning Region'},
  { name: 'Norwalk Public Library', url: 'https://www.norwalkpubliclibrary.org', eventsUrl: 'https://www.norwalkpubliclibrary.org/events', city: 'Norwalk', state: 'CT', zipCode: '06850', county: 'Western Connecticut Planning Region'},
  { name: 'Danbury Public Library', url: 'https://danburylibrary.org/', eventsUrl: 'https://danburylibrary.org/', city: 'Danbury', state: 'CT', zipCode: '06810', county: 'Western Connecticut Planning Region'},
  { name: 'New Britain Public Library', url: 'https://www.nbpl.info', eventsUrl: 'https://www.nbpl.info/events', city: 'New Britain', state: 'CT', zipCode: '06051', county: 'Capitol Planning Region'},
  { name: 'West Hartford Public Library', url: 'https://www.westhartfordlibrary.org/', eventsUrl: 'https://www.westhartfordlibrary.org/', city: 'West Hartford', state: 'CT', zipCode: '06107', county: 'Capitol Planning Region'},
  { name: 'Greenwich Library', url: 'https://www.greenwichlibrary.org/', eventsUrl: 'https://www.greenwichlibrary.org/', city: 'Greenwich', state: 'CT', zipCode: '06830', county: 'Western Connecticut Planning Region'},
  { name: 'Fairfield Public Library', url: 'https://www.fairfieldpubliclibrary.org', eventsUrl: 'https://www.fairfieldpubliclibrary.org/events', city: 'Fairfield', state: 'CT', zipCode: '06824', county: 'Fairfield County'},
  { name: 'Bristol Public Library', url: 'https://www.bristollib.com', eventsUrl: 'https://www.bristollib.com/events', city: 'Bristol', state: 'CT', zipCode: '06010', county: 'Naugatuck Valley Planning Region'},
  { name: 'Manchester Public Library', url: 'https://www.manchesterct.gov/', eventsUrl: 'https://www.manchesterct.gov/Government/Departments/Library', city: 'Manchester', state: 'CT', zipCode: '06040', county: 'Capitol Planning Region'},
  { name: 'Milford Public Library', url: 'https://www.ci.milford.ct.us/milford-public-library', eventsUrl: 'https://www.ci.milford.ct.us/milford-public-library/events', city: 'Milford', state: 'CT', zipCode: '06460', county: 'South Central Connecticut Planning Region'},
  { name: 'Stratford Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'CT', zipCode: '06615', county: 'Greater Bridgeport Planning Region'},
  { name: 'East Hartford Public Library', url: 'https://www.easthartfordct.gov/library', eventsUrl: 'https://www.easthartfordct.gov/library/events', city: 'East Hartford', state: 'CT', zipCode: '06108', county: 'Capitol Planning Region'},
  { name: 'Middletown Public Library', url: 'https://russelllibrary.org/', eventsUrl: 'https://russelllibrary.org/', city: 'Middletown', state: 'CT', zipCode: '06457', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Wallingford Public Library', url: 'https://www.wallingfordlibrary.org', eventsUrl: 'https://www.wallingfordlibrary.org/events', city: 'Wallingford', state: 'CT', zipCode: '06492', county: 'South Central Connecticut Planning Region'},
  { name: 'Enfield Public Library', url: 'https://www.enfieldpubliclibrary.org/', eventsUrl: 'https://www.enfieldpubliclibrary.org/', city: 'Enfield', state: 'CT', zipCode: '06082', county: 'Capitol Planning Region'},
  { name: 'Southington Public Library', url: 'https://www.southingtonlibrary.org/', eventsUrl: 'https://www.southingtonlibrary.org/', city: 'Southington', state: 'CT', zipCode: '06489', county: 'Capitol Planning Region'},
  { name: 'Shelton Public Library', url: 'https://www.sheltonlibrarysystem.org', eventsUrl: 'https://www.sheltonlibrarysystem.org/events', city: 'Shelton', state: 'CT', zipCode: '06484', county: 'Naugatuck Valley Planning Region'},
  { name: 'Torrington Library', url: 'https://www.torringtonlibrary.org', eventsUrl: 'https://www.torringtonlibrary.org/events', city: 'Torrington', state: 'CT', zipCode: '06790', county: 'Northwest Hills Planning Region'},
  { name: 'Trumbull Library', url: 'https://www.trumbull-ct.gov/', eventsUrl: 'https://www.trumbull-ct.gov/1104/Library', city: 'Trumbull', state: 'CT', zipCode: '06611', county: 'Greater Bridgeport Planning Region'},
  { name: 'Vernon Public Library', url: 'https://www.vernon-ct.gov/library', eventsUrl: 'https://www.vernon-ct.gov/library/events', city: 'Vernon', state: 'CT', zipCode: '06066', county: 'Capitol Planning Region'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'CT', zipCode: '06232', county: 'Capitol Planning Region'},
  { name: 'Ansonia Public Library', url: 'https://ansonialibrary.org/', eventsUrl: 'https://ansonialibrary.org/', city: 'Ansonia', state: 'CT', zipCode: '06401', county: 'Naugatuck Valley Planning Region'},
  { name: 'Beacon Falls Public Library', url: 'https://www.beaconfallslibrary.org', eventsUrl: 'https://www.beaconfallslibrary.org/events', city: 'Beacon Falls', state: 'CT', zipCode: '06403', county: 'Naugatuck Valley Planning Region'},
  { name: 'Clark Memorial Library', url: 'https://bethanylibrary.org/', eventsUrl: 'https://bethanylibrary.org/', city: 'Bethany', state: 'CT', zipCode: '06524', county: 'South Central Connecticut Planning Region'},
  { name: 'Bethel Public Library', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'CT', zipCode: '06801', county: 'Western Connecticut Planning Region'},
  { name: 'Bethlehem Public Library', url: 'https://www.bethlehemlibrary.org', eventsUrl: 'https://www.bethlehemlibrary.org/events', city: 'Bethlehem', state: 'CT', zipCode: '06751', county: 'Naugatuck Valley Planning Region'},
  { name: 'Brookfield Library', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'CT', zipCode: '06804', county: 'Western Connecticut Planning Region'},
  { name: 'Canterbury Public Library', url: 'https://www.canterburylibrary.org', eventsUrl: 'https://www.canterburylibrary.org/events', city: 'Canterbury', state: 'CT', zipCode: '06331', county: 'Northeastern Connecticut Planning Region'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in PA, not CT. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Canton Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'CT', zipCode: '06019', county: 'Capitol Planning Region'},
  { name: 'Cheshire Public Library', url: 'https://www.cheshirelibrary.org', eventsUrl: 'https://www.cheshirelibrary.org/events', city: 'Cheshire', state: 'CT', zipCode: '06410', county: 'Naugatuck Valley Planning Region'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'CT', zipCode: '06412', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Henry Carter Hull Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'CT', zipCode: '06413', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Saxton B. Little Free Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'CT', zipCode: '06237', county: 'Capitol Planning Region'},
  { name: 'Cornwall Library Association', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'CT', zipCode: '06753', county: 'Northwest Hills Planning Region'},
  { name: 'Darien Library', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'CT', zipCode: '06820', county: 'Western Connecticut Planning Region'},
  { name: 'Durham Public Library', url: 'https://www.durhamlibrary.org', eventsUrl: 'https://www.durhamlibrary.org/events', city: 'Durham', state: 'CT', zipCode: '06422', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'East Hampton Public Library', url: 'https://www.easthamptonlibrary.org', eventsUrl: 'https://www.easthamptonlibrary.org/events', city: 'East Hampton', state: 'CT', zipCode: '06424', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Easton Public Library', url: 'https://www.eastonlibrary.org/', eventsUrl: 'https://www.eastonlibrary.org/library-events', city: 'Easton', state: 'CT', zipCode: '06612', county: 'Greater Bridgeport Planning Region'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in NY, not CT. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Hall Memorial Library', url: 'https://www.ellingtonlibrary.org', eventsUrl: 'https://www.ellingtonlibrary.org/events', city: 'Ellington', state: 'CT', zipCode: '06029', county: 'Capitol Planning Region'},
  { name: 'Essex Library Association', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'CT', zipCode: '06426', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Farmington Library', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'CT', zipCode: '06032', county: 'Capitol Planning Region'},
  { name: 'Janet Carlson Calvert Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'CT', zipCode: '00000', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Goshen Public Library', url: 'https://www.goshenlibrary.org/', eventsUrl: 'https://www.goshenlibrary.org/', city: 'Goshen', state: 'CT', zipCode: '06756', county: 'Northwest Hills Planning Region'},
  { name: 'Frederick H. Cossitt Library', url: 'https://granbylibrary.org/', eventsUrl: 'https://granbylibrary.org/', city: 'Granby', state: 'CT', zipCode: '00000', county: 'Capitol Planning Region'},
  { name: 'Community Branch Library', url: 'https://hamdenlibrary.org/', eventsUrl: 'https://hamdenlibrary.org/', city: 'Hamden', state: 'CT', zipCode: '00000', county: 'South Central Connecticut Planning Region'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibrary.org', eventsUrl: 'https://www.hartlandlibrary.org/events', city: 'Hartland', state: 'CT', zipCode: '06091', county: 'Northwest Hills Planning Region'},
  { name: 'Harwinton Public Library', url: 'https://www.harwintonlibrary.org', eventsUrl: 'https://www.harwintonlibrary.org/events', city: 'Harwinton', state: 'CT', zipCode: '06791', county: 'Northwest Hills Planning Region'},
  { name: 'Douglas Library Of Hebron', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'CT', zipCode: '06248', county: 'Capitol Planning Region'},
  { name: 'Ivoryton Library Association', url: 'https://www.ivorytonlibrary.org', eventsUrl: 'https://www.ivorytonlibrary.org/events', city: 'Ivoryton', state: 'CT', zipCode: '06442', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Kent Library Association', url: 'https://kentpl.librarycalendar.com/', eventsUrl: 'https://kentpl.librarycalendar.com/events/month', city: 'Kent', state: 'CT', zipCode: '06757', county: 'Northwest Hills Planning Region'},
  { name: 'Killingworth Library', url: 'https://www.killingworthlibrary.org', eventsUrl: 'https://www.killingworthlibrary.org/events', city: 'Killingworth', state: 'CT', zipCode: '06419', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Jonathan Trumbull Library', url: 'https://lebanonlibrary.org/', eventsUrl: 'https://lebanonlibrary.org/', city: 'Lebanon', state: 'CT', zipCode: '06249', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Bill Library', url: 'https://www.ledyardlibrary.org', eventsUrl: 'https://www.ledyardlibrary.org/events', city: 'Ledyard', state: 'CT', zipCode: '00000', county: 'Southeastern Connecticut Planning Region'},
  { name: 'E.C. Scranton Memorial Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'CT', zipCode: '06443', county: 'South Central Connecticut Planning Region'},
  { name: 'Middlebury Public Library', url: 'https://www.middleburylibrary.org', eventsUrl: 'https://www.middleburylibrary.org/events', city: 'Middlebury', state: 'CT', zipCode: '06762', county: 'Naugatuck Valley Planning Region'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in MA, not CT. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Levi E.Coe Library', url: 'https://middlefieldlibrary.org/', eventsUrl: 'https://middlefieldlibrary.org/', city: 'Middlefield', state: 'CT', zipCode: '06455', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Edith Wheeler Memorial Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'CT', zipCode: '06468', county: 'Greater Bridgeport Planning Region'},
  { name: 'Mystic Noank Library', url: 'https://www.mysticlibrary.org', eventsUrl: 'https://www.mysticlibrary.org/events', city: 'Mystic', state: 'CT', zipCode: '06355', county: 'Southeastern Connecticut Planning Region'},
  { name: 'New Canaan Library', url: 'https://www.newcanaanlibrary.org', eventsUrl: 'https://www.newcanaanlibrary.org/events', city: 'New Canaan', state: 'CT', zipCode: '06840', county: 'Western Connecticut Planning Region'},
  { name: 'New Fairfield Free Public Library', url: 'https://www.newfairfieldlibrary.org/', eventsUrl: 'https://www.newfairfieldlibrary.org/', city: 'New Fairfield', state: 'CT', zipCode: '06812', county: 'Western Connecticut Planning Region'},
  { name: 'Public Library Of New London', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'CT', zipCode: '06320', county: 'New London County'},
  { name: 'New Milford Public Library', url: 'https://newmilfordlibrary.org/', eventsUrl: 'https://newmilfordlibrary.org/', city: 'New Milford', state: 'CT', zipCode: '06776', county: 'Western Connecticut Planning Region'},
  { name: 'Cyrenius H. Booth Library', url: 'https://newtownlibrary.org/', eventsUrl: 'https://newtownlibrary.org/', city: 'Newtown', state: 'CT', zipCode: '06470', county: 'Western Connecticut Planning Region'},
  { name: 'Norfolk Library', url: 'https://www.norfolklibrary.org', eventsUrl: 'https://www.norfolklibrary.org/events', city: 'Norfolk', state: 'CT', zipCode: '06058', county: 'Northwest Hills Planning Region'},
  { name: 'North Haven Memorial Library', url: 'https://www.northhavenlibrary.org', eventsUrl: 'https://www.northhavenlibrary.org/events', city: 'North Haven', state: 'CT', zipCode: '06473', county: 'South Central Connecticut Planning Region'},
  { name: 'Otis Library', url: 'https://www.norwichlibrary.org/', eventsUrl: 'https://www.norwichlibrary.org/category/events/', city: 'Norwich', state: 'CT', zipCode: '06360', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Old Lyme - Phoebe Griffin Noyes Library', url: 'https://www.oldlymelibrary.org', eventsUrl: 'https://www.oldlymelibrary.org/events', city: 'Old Lyme', state: 'CT', zipCode: '06371', county: 'Lower Connecticut River Valley Planning Region'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in WI, not CT. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'CT', zipCode: '06478', county: 'Naugatuck Valley Planning Region'},
  { name: 'Central Village Public Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'CT', zipCode: '06332', county: 'Northeastern Connecticut Planning Region'},
  { name: 'Plainville Public Library', url: 'https://www.plainvillelibrary.org', eventsUrl: 'https://www.plainvillelibrary.org/events', city: 'Plainville', state: 'CT', zipCode: '06062', county: 'Capitol Planning Region'},
  { name: 'Pomfret Public Library', url: 'https://www.pomfretlibrary.org', eventsUrl: 'https://www.pomfretlibrary.org/events', city: 'Pomfret', state: 'CT', zipCode: '06258', county: 'Northeastern Connecticut Planning Region'},
  { name: 'Preston Public Library', url: 'https://prestonpubliclibrary.org/', eventsUrl: 'https://prestonpubliclibrary.org/events/', city: 'Preston', state: 'CT', zipCode: '06365', county: 'Preston County'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in PA, not CT. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Prospect Public Library', url: 'https://www.prospectlibrary.org/', eventsUrl: 'https://www.prospectlibrary.org/calendar', city: 'Prospect', state: 'CT', zipCode: '06712', county: 'Naugatuck Valley Planning Region'},
  { name: 'Ridgefield Library', url: 'https://ridgefieldlibrary.org/', eventsUrl: 'https://ridgefieldlibrary.org/', city: 'Ridgefield', state: 'CT', zipCode: '06877', county: 'Western Connecticut Planning Region'},
  { name: 'Minor Memorial Library', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'CT', zipCode: '06783', county: 'Western Connecticut Planning Region'},
  { name: 'Salem Free Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'CT', zipCode: '06420', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Scoville Memorial Library', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'CT', zipCode: '06068', county: 'Northwest Hills Planning Region'},
  { name: 'Sherman Library Assn.', url: 'https://www.shermanlibrary.org/', eventsUrl: 'https://www.shermanlibrary.org/', city: 'Sherman', state: 'CT', zipCode: '06784', county: 'Western Connecticut Planning Region'},
  { name: 'South Windsor Public Library', url: 'https://www.southwindsorlibrary.org', eventsUrl: 'https://www.southwindsorlibrary.org/events', city: 'South Windsor', state: 'CT', zipCode: '06074', county: 'Capitol Planning Region'},
  { name: 'Southbury Public Library', url: 'https://www.southburylibrary.org', eventsUrl: 'https://www.southburylibrary.org/events', city: 'Southbury', state: 'CT', zipCode: '06488', county: 'Naugatuck Valley Planning Region'},
  { name: 'Pequot Library Association', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'CT', zipCode: '06890', county: 'Greater Bridgeport Planning Region'},
  { name: 'Stafford Library Association', url: 'https://www.staffordlibrary.org', eventsUrl: 'https://www.staffordlibrary.org/events', city: 'Stafford', state: 'CT', zipCode: '06075', county: 'Capitol Planning Region'},
  { name: 'Stonington Free Library', url: 'https://www.stoningtonlibrary.org/', eventsUrl: 'https://www.stoningtonlibrary.org/', city: 'Stonington', state: 'CT', zipCode: '06378', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Kent Memorial Library', url: 'https://www.suffieldlibrary.org', eventsUrl: 'https://www.suffieldlibrary.org/events', city: 'Suffield', state: 'CT', zipCode: '06078', county: 'Capitol Planning Region'},
  { name: 'Thomaston Public Library', url: 'https://thomastonlibrary.org/', eventsUrl: 'https://thomastonlibrary.org/', city: 'Thomaston', state: 'CT', zipCode: '06787', county: 'Naugatuck Valley Planning Region'},
  { name: 'Union Free Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'CT', zipCode: '06076', county: 'Northeastern Connecticut Planning Region'},
  { name: 'Warren Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'CT', zipCode: '06754', county: 'Northwest Hills Planning Region'},
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'CT', zipCode: '06385', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Oakville Branch Library', url: 'https://www.watertownlibrary.org/', eventsUrl: 'https://www.watertownlibrary.org/', city: 'Watertown', state: 'CT', zipCode: '00000', county: 'Naugatuck Valley Planning Region'},
  { name: 'Louis Piantino Branch Library', url: 'https://www.westhavenlibrary.org', eventsUrl: 'https://www.westhavenlibrary.org/events', city: 'West Haven', state: 'CT', zipCode: '00000', county: 'South Central Connecticut Planning Region'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'CT', zipCode: '06498', county: 'Lower Connecticut River Valley Planning Region'},
  { name: 'Westport Library', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'CT', zipCode: '06880', county: 'Western Connecticut Planning Region'},
  { name: 'Wethersfield Public Library', url: 'https://www.wethersfieldlibrary.org/', eventsUrl: 'https://www.wethersfieldlibrary.org/', city: 'Wethersfield', state: 'CT', zipCode: '06109', county: 'Capitol Planning Region'},
  { name: 'Willimantic Public Library', url: 'https://www.willimanticlibrary.org', eventsUrl: 'https://www.willimanticlibrary.org/events', city: 'Willimantic', state: 'CT', zipCode: '06226', county: 'Southeastern Connecticut Planning Region'},
  { name: 'Wilton Library Association', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'CT', zipCode: '06897', county: 'Western Connecticut Planning Region'},
  { name: 'Beardsley Memorial Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'CT', zipCode: '06098', county: 'Winchester County'},
  { name: 'Windham Free Library', url: 'https://windhamlibrary.org/', eventsUrl: 'https://windhamlibrary.org/', city: 'Windham', state: 'CT', zipCode: '06280', county: 'Windham County'},
  { name: 'Wilson Branch Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'CT', zipCode: '00000', county: 'Capitol Planning Region'},
  { name: 'Windsor Locks Public Library', url: 'https://www.windsorlockslibrary.org', eventsUrl: 'https://www.windsorlockslibrary.org/events', city: 'Windsor Locks', state: 'CT', zipCode: '06096', county: 'Capitol Planning Region'},
  { name: 'Wolcott Public Library', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'CT', zipCode: '06716', county: 'Naugatuck Valley Planning Region'},
  { name: 'Woodbury Public Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'CT', zipCode: '06798', county: 'Naugatuck Valley Planning Region'},

];

const SCRAPER_NAME = 'wordpress-CT';

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
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'CT', city: library.city, zipCode: library.zipCode }}));
        continue;
      }
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

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
            state: 'CT',
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
            state: event.state || library.state || 'CT',
            city: event.city || library.city,
            zipCode: event.zipCode || library.zipCode,
            needsReview: true
          }
        }));
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

            const libraryEvents = await page.evaluate((libName, __resolverSrc) => {
        // Rehydrate the shared resolver — page.evaluate cannot close over Node scope.
        const resolveEventDate = new Function('return ' + __resolverSrc)();
        const events = [];
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            events.push({ title: title.textContent.trim(), date: resolveEventDate(card), ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name, RESOLVER_SRC);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'CT', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'CT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressCTCloudFunction() {
  console.log('☁️ Running WordPress CT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-CT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-CT', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressCTCloudFunction };
