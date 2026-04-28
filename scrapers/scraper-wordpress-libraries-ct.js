const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Connecticut Public Libraries Scraper - Coverage: All Connecticut public libraries
 */
const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Hartford Public Library', url: 'https://www.hplct.org', eventsUrl: 'https://www.hplct.org/events', city: 'Hartford', state: 'CT', zipCode: '06103', county: 'Hartford County'},
  { name: 'New Haven Free Public Library', url: 'https://www.nhfpl.org', eventsUrl: 'https://www.nhfpl.org/events', city: 'New Haven', state: 'CT', zipCode: '06510', county: 'New Haven County'},
  { name: 'Bridgeport Public Library', url: 'https://www.bportlibrary.org', eventsUrl: 'https://www.bportlibrary.org/events', city: 'Bridgeport', state: 'CT', zipCode: '06604', county: 'Bridgeport County'},
  // Regional Libraries
  { name: 'Stamford Public Library', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'CT', zipCode: '06901', county: 'Stamford County'},
  { name: 'Waterbury Public Library', url: 'https://www.siloam.com', eventsUrl: 'https://www.siloam.com/events', city: 'Waterbury', state: 'CT', zipCode: '06702', county: 'Waterbury County'},
  { name: 'Norwalk Public Library', url: 'https://www.norwalkpubliclibrary.org', eventsUrl: 'https://www.norwalkpubliclibrary.org/events', city: 'Norwalk', state: 'CT', zipCode: '06850', county: 'Norwalk County'},
  { name: 'Danbury Public Library', url: 'https://www.danburylibrary.org', eventsUrl: 'https://www.danburylibrary.org/events', city: 'Danbury', state: 'CT', zipCode: '06810', county: 'Danbury County'},
  { name: 'New Britain Public Library', url: 'https://www.nbpl.info', eventsUrl: 'https://www.nbpl.info/events', city: 'New Britain', state: 'CT', zipCode: '06051', county: 'New Britain County'},
  { name: 'West Hartford Public Library', url: 'https://www.westhartfordlibrary.org', eventsUrl: 'https://www.westhartfordlibrary.org/events', city: 'West Hartford', state: 'CT', zipCode: '06107', county: 'West Hartford County'},
  { name: 'Greenwich Library', url: 'https://www.greenwichlibrary.org', eventsUrl: 'https://www.greenwichlibrary.org/events', city: 'Greenwich', state: 'CT', zipCode: '06830', county: 'Greenwich County'},
  { name: 'Fairfield Public Library', url: 'https://www.fairfieldpubliclibrary.org', eventsUrl: 'https://www.fairfieldpubliclibrary.org/events', city: 'Fairfield', state: 'CT', zipCode: '06824', county: 'Fairfield County'},
  { name: 'Bristol Public Library', url: 'https://www.bristollib.com', eventsUrl: 'https://www.bristollib.com/events', city: 'Bristol', state: 'CT', zipCode: '06010', county: 'Bristol County'},
  { name: 'Meriden Public Library', url: 'https://www.meridenpubliclibrary.org', eventsUrl: 'https://www.meridenpubliclibrary.org/events', city: 'Meriden', state: 'CT', zipCode: '06450', county: 'Meriden County'},
  { name: 'Manchester Public Library', url: 'https://www.manchesterct.gov/library', eventsUrl: 'https://www.manchesterct.gov/library/events', city: 'Manchester', state: 'CT', zipCode: '06040', county: 'Manchester County'},
  { name: 'Milford Public Library', url: 'https://www.ci.milford.ct.us/milford-public-library', eventsUrl: 'https://www.ci.milford.ct.us/milford-public-library/events', city: 'Milford', state: 'CT', zipCode: '06460', county: 'Milford County'},
  { name: 'Stratford Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'CT', zipCode: '06615', county: 'Stratford County'},
  { name: 'East Hartford Public Library', url: 'https://www.easthartfordct.gov/library', eventsUrl: 'https://www.easthartfordct.gov/library/events', city: 'East Hartford', state: 'CT', zipCode: '06108', county: 'East Hartford County'},
  { name: 'Middletown Public Library', url: 'https://www.russelllibrary.org', eventsUrl: 'https://www.russelllibrary.org/events', city: 'Middletown', state: 'CT', zipCode: '06457', county: 'Middletown County'},
  { name: 'Wallingford Public Library', url: 'https://www.wallingfordlibrary.org', eventsUrl: 'https://www.wallingfordlibrary.org/events', city: 'Wallingford', state: 'CT', zipCode: '06492', county: 'Wallingford County'},
  { name: 'Enfield Public Library', url: 'https://www.enfieldpubliclibrary.org', eventsUrl: 'https://www.enfieldpubliclibrary.org/events', city: 'Enfield', state: 'CT', zipCode: '06082', county: 'Enfield County'},
  { name: 'Southington Public Library', url: 'https://www.southingtonlibrary.org', eventsUrl: 'https://www.southingtonlibrary.org/events', city: 'Southington', state: 'CT', zipCode: '06489', county: 'Southington County'},
  { name: 'Shelton Public Library', url: 'https://www.sheltonlibrarysystem.org', eventsUrl: 'https://www.sheltonlibrarysystem.org/events', city: 'Shelton', state: 'CT', zipCode: '06484', county: 'Shelton County'},
  { name: 'Torrington Library', url: 'https://www.torringtonlibrary.org', eventsUrl: 'https://www.torringtonlibrary.org/events', city: 'Torrington', state: 'CT', zipCode: '06790', county: 'Torrington County'},
  { name: 'Trumbull Library', url: 'https://www.trumbullct-library.org', eventsUrl: 'https://www.trumbullct-library.org/events', city: 'Trumbull', state: 'CT', zipCode: '06611', county: 'Trumbull County'},
  { name: 'Vernon Public Library', url: 'https://www.vernon-ct.gov/library', eventsUrl: 'https://www.vernon-ct.gov/library/events', city: 'Vernon', state: 'CT', zipCode: '06066', county: 'Vernon County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Abington Social Library', url: 'https://www.abingtonlibrary.org', eventsUrl: 'https://www.abingtonlibrary.org/events', city: 'Abington', state: 'CT', zipCode: '06230', county: 'Abington County'},
  { name: 'Andover Public Library', url: 'https://www.andoverlibrary.org', eventsUrl: 'https://www.andoverlibrary.org/events', city: 'Andover', state: 'CT', zipCode: '06232', county: 'Andover County'},
  { name: 'Ansonia Public Library', url: 'https://www.ansonialibrary.org', eventsUrl: 'https://www.ansonialibrary.org/events', city: 'Ansonia', state: 'CT', zipCode: '06401', county: 'Ansonia County'},
  { name: 'Babcock Library', url: 'https://www.ashfordlibrary.org', eventsUrl: 'https://www.ashfordlibrary.org/events', city: 'Ashford', state: 'CT', zipCode: '06278', county: 'Ashford County'},
  { name: 'Avon Free Public Library', url: 'https://www.avonlibrary.org', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'CT', zipCode: '06001', county: 'Avon County'},
  { name: 'Sprague Public Library', url: 'https://www.balticlibrary.org', eventsUrl: 'https://www.balticlibrary.org/events', city: 'Baltic', state: 'CT', zipCode: '06330', county: 'Baltic County'},
  { name: 'Beacon Falls Public Library', url: 'https://www.beaconfallslibrary.org', eventsUrl: 'https://www.beaconfallslibrary.org/events', city: 'Beacon Falls', state: 'CT', zipCode: '06403', county: 'Beacon Falls County'},
  { name: 'Berlin Free Library Association', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'CT', zipCode: '06037', county: 'Berlin County'},
  { name: 'Clark Memorial Library', url: 'https://www.bethanylibrary.org', eventsUrl: 'https://www.bethanylibrary.org/events', city: 'Bethany', state: 'CT', zipCode: '06524', county: 'Bethany County'},
  { name: 'Bethel Public Library', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'CT', zipCode: '06801', county: 'Bethel County'},
  { name: 'Bethlehem Public Library', url: 'https://www.bethlehemlibrary.org', eventsUrl: 'https://www.bethlehemlibrary.org/events', city: 'Bethlehem', state: 'CT', zipCode: '06751', county: 'Bethlehem County'},
  { name: 'Prosser Public Library', url: 'https://www.bloomfieldlibrary.org', eventsUrl: 'https://www.bloomfieldlibrary.org/events', city: 'Bloomfield', state: 'CT', zipCode: '06003', county: 'Bloomfield County'},
  { name: 'Bentley Memorial Library', url: 'https://www.boltonlibrary.org', eventsUrl: 'https://www.boltonlibrary.org/events', city: 'Bolton', state: 'CT', zipCode: '06043', county: 'Bolton County'},
  { name: 'James Blackstone Memorial Library', url: 'https://www.branfordlibrary.org', eventsUrl: 'https://www.branfordlibrary.org/events', city: 'Branford', state: 'CT', zipCode: '06405', county: 'Branford County'},
  { name: 'Burnham Public Library', url: 'https://www.bridgewaterlibrary.org', eventsUrl: 'https://www.bridgewaterlibrary.org/events', city: 'Bridgewater', state: 'CT', zipCode: '06752', county: 'Bridgewater County'},
  { name: 'Broad Brook Library', url: 'https://www.broadbrooklibrary.org', eventsUrl: 'https://www.broadbrooklibrary.org/events', city: 'Broad Brook', state: 'CT', zipCode: '06016', county: 'Broad Brook County'},
  { name: 'Brookfield Library', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'CT', zipCode: '06804', county: 'Brookfield County'},
  { name: 'Brooklyn Town Library Association', url: 'https://www.brooklynlibrary.org', eventsUrl: 'https://www.brooklynlibrary.org/events', city: 'Brooklyn', state: 'CT', zipCode: '06234', county: 'Brooklyn County'},
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'CT', zipCode: '06013', county: 'Burlington County'},
  { name: 'Canterbury Public Library', url: 'https://www.canterburylibrary.org', eventsUrl: 'https://www.canterburylibrary.org/events', city: 'Canterbury', state: 'CT', zipCode: '06331', county: 'Canterbury County'},
  { name: 'Canton Public Library', url: 'https://www.cantonlibrary.org', eventsUrl: 'https://www.cantonlibrary.org/events', city: 'Canton', state: 'CT', zipCode: '06019', county: 'Canton County'},
  { name: 'Chaplin Public Library', url: 'https://www.chaplinlibrary.org', eventsUrl: 'https://www.chaplinlibrary.org/events', city: 'Chaplin', state: 'CT', zipCode: '06235', county: 'Chaplin County'},
  { name: 'Cheshire Public Library', url: 'https://www.cheshirelibrary.org', eventsUrl: 'https://www.cheshirelibrary.org/events', city: 'Cheshire', state: 'CT', zipCode: '06410', county: 'Cheshire County'},
  { name: 'Chester Public Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'CT', zipCode: '06412', county: 'Chester County'},
  { name: 'Henry Carter Hull Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'CT', zipCode: '06413', county: 'Clinton County'},
  { name: 'Cragin Memorial Library', url: 'https://www.colchesterlibrary.org', eventsUrl: 'https://www.colchesterlibrary.org/events', city: 'Colchester', state: 'CT', zipCode: '00000', county: 'Colchester County'},
  { name: 'Saxton B. Little Free Library', url: 'https://www.columbialibrary.org', eventsUrl: 'https://www.columbialibrary.org/events', city: 'Columbia', state: 'CT', zipCode: '06237', county: 'Columbia County'},
  { name: 'Cornwall Library Association', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'CT', zipCode: '06753', county: 'Cornwall County'},
  { name: 'Booth Dimock Memorial Library', url: 'https://www.coventrylibrary.org', eventsUrl: 'https://www.coventrylibrary.org/events', city: 'Coventry', state: 'CT', zipCode: '06238', county: 'Coventry County'},
  { name: 'Cromwell Belden Public Library', url: 'https://www.cromwelllibrary.org', eventsUrl: 'https://www.cromwelllibrary.org/events', city: 'Cromwell', state: 'CT', zipCode: '06416', county: 'Cromwell County'},
  { name: 'Killingly Public Library', url: 'https://www.danielsonlibrary.org', eventsUrl: 'https://www.danielsonlibrary.org/events', city: 'Danielson', state: 'CT', zipCode: '06239', county: 'Danielson County'},
  { name: 'Darien Library', url: 'https://www.darienlibrary.org', eventsUrl: 'https://www.darienlibrary.org/events', city: 'Darien', state: 'CT', zipCode: '06820', county: 'Darien County'},
  { name: 'Deep River Public Library', url: 'https://www.deepriverlibrary.org', eventsUrl: 'https://www.deepriverlibrary.org/events', city: 'Deep River', state: 'CT', zipCode: '06417', county: 'Deep River County'},
  { name: 'Derby Neck Library', url: 'https://www.derbylibrary.org', eventsUrl: 'https://www.derbylibrary.org/events', city: 'Derby', state: 'CT', zipCode: '06418', county: 'Derby County'},
  { name: 'Durham Public Library', url: 'https://www.durhamlibrary.org', eventsUrl: 'https://www.durhamlibrary.org/events', city: 'Durham', state: 'CT', zipCode: '06422', county: 'Durham County'},
  { name: 'East Granby Public Library', url: 'https://www.eastgranbylibrary.org', eventsUrl: 'https://www.eastgranbylibrary.org/events', city: 'East Granby', state: 'CT', zipCode: '06026', county: 'East Granby County'},
  { name: 'Rathbun Free Memorial Library', url: 'https://www.easthaddamlibrary.org', eventsUrl: 'https://www.easthaddamlibrary.org/events', city: 'East Haddam', state: 'CT', zipCode: '06423', county: 'East Haddam County'},
  { name: 'East Hampton Public Library', url: 'https://www.easthamptonlibrary.org', eventsUrl: 'https://www.easthamptonlibrary.org/events', city: 'East Hampton', state: 'CT', zipCode: '06424', county: 'East Hampton County'},
  { name: 'Hagaman Memorial Library', url: 'https://www.easthavenlibrary.org', eventsUrl: 'https://www.easthavenlibrary.org/events', city: 'East Haven', state: 'CT', zipCode: '06512', county: 'East Haven County'},
  { name: 'Library Association Of Warehouse Point', url: 'https://www.eastwindsorlibrary.org', eventsUrl: 'https://www.eastwindsorlibrary.org/events', city: 'East Windsor', state: 'CT', zipCode: '06088', county: 'East Windsor County'},
  { name: 'May Memorial Library', url: 'https://www.eastwoodstocklibrary.org', eventsUrl: 'https://www.eastwoodstocklibrary.org/events', city: 'East Woodstock', state: 'CT', zipCode: '06244', county: 'East Woodstock County'},
  { name: 'Eastford Public Library', url: 'https://www.eastfordlibrary.org', eventsUrl: 'https://www.eastfordlibrary.org/events', city: 'Eastford', state: 'CT', zipCode: '06242', county: 'Eastford County'},
  { name: 'Easton Public Library', url: 'https://www.eastonlibrary.org', eventsUrl: 'https://www.eastonlibrary.org/events', city: 'Easton', state: 'CT', zipCode: '06612', county: 'Easton County'},
  { name: 'Hall Memorial Library', url: 'https://www.ellingtonlibrary.org', eventsUrl: 'https://www.ellingtonlibrary.org/events', city: 'Ellington', state: 'CT', zipCode: '06029', county: 'Ellington County'},
  { name: 'Essex Library Association', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'CT', zipCode: '06426', county: 'Essex County'},
  { name: 'David M. Hunt Library', url: 'https://www.fallsvillagelibrary.org', eventsUrl: 'https://www.fallsvillagelibrary.org/events', city: 'Falls Village', state: 'CT', zipCode: '06031', county: 'Falls Village County'},
  { name: 'Farmington Library', url: 'https://www.farmingtonlibrary.org', eventsUrl: 'https://www.farmingtonlibrary.org/events', city: 'Farmington', state: 'CT', zipCode: '06032', county: 'Farmington County'},
  { name: 'Janet Carlson Calvert Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'CT', zipCode: '00000', county: 'Franklin County'},
  { name: 'East Glastonbury Public Library', url: 'https://www.glastonburylibrary.org', eventsUrl: 'https://www.glastonburylibrary.org/events', city: 'Glastonbury', state: 'CT', zipCode: '06033', county: 'Glastonbury County'},
  { name: 'Goshen Public Library', url: 'https://www.goshenlibrary.org', eventsUrl: 'https://www.goshenlibrary.org/events', city: 'Goshen', state: 'CT', zipCode: '06756', county: 'Goshen County'},
  { name: 'Frederick H. Cossitt Library', url: 'https://www.granbylibrary.org', eventsUrl: 'https://www.granbylibrary.org/events', city: 'Granby', state: 'CT', zipCode: '00000', county: 'Granby County'},
  { name: 'Slater Library', url: 'https://www.griswoldlibrary.org', eventsUrl: 'https://www.griswoldlibrary.org/events', city: 'Griswold', state: 'CT', zipCode: '06351', county: 'Griswold County'},
  { name: 'Bill Memorial Library', url: 'https://www.grotonlibrary.org', eventsUrl: 'https://www.grotonlibrary.org/events', city: 'Groton', state: 'CT', zipCode: '06340', county: 'Groton County'},
  { name: 'Guilford Free Library', url: 'https://www.guilfordlibrary.org', eventsUrl: 'https://www.guilfordlibrary.org/events', city: 'Guilford', state: 'CT', zipCode: '06437', county: 'Guilford County'},
  { name: 'Brainerd Memorial Library', url: 'https://www.haddamlibrary.org', eventsUrl: 'https://www.haddamlibrary.org/events', city: 'Haddam', state: 'CT', zipCode: '06438', county: 'Haddam County'},
  { name: 'Community Branch Library', url: 'https://www.hamdenlibrary.org', eventsUrl: 'https://www.hamdenlibrary.org/events', city: 'Hamden', state: 'CT', zipCode: '00000', county: 'Hamden County'},
  { name: 'Fletcher Memorial Library', url: 'https://www.hamptonlibrary.org', eventsUrl: 'https://www.hamptonlibrary.org/events', city: 'Hampton', state: 'CT', zipCode: '06247', county: 'Hampton County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibrary.org', eventsUrl: 'https://www.hartlandlibrary.org/events', city: 'Hartland', state: 'CT', zipCode: '06091', county: 'Hartland County'},
  { name: 'Harwinton Public Library', url: 'https://www.harwintonlibrary.org', eventsUrl: 'https://www.harwintonlibrary.org/events', city: 'Harwinton', state: 'CT', zipCode: '06791', county: 'Harwinton County'},
  { name: 'Douglas Library Of Hebron', url: 'https://www.hebronlibrary.org', eventsUrl: 'https://www.hebronlibrary.org/events', city: 'Hebron', state: 'CT', zipCode: '06248', county: 'Hebron County'},
  { name: 'Ivoryton Library Association', url: 'https://www.ivorytonlibrary.org', eventsUrl: 'https://www.ivorytonlibrary.org/events', city: 'Ivoryton', state: 'CT', zipCode: '06442', county: 'Ivoryton County'},
  { name: 'Kent Library Association', url: 'https://www.kentlibrary.org', eventsUrl: 'https://www.kentlibrary.org/events', city: 'Kent', state: 'CT', zipCode: '06757', county: 'Kent County'},
  { name: 'Killingworth Library', url: 'https://www.killingworthlibrary.org', eventsUrl: 'https://www.killingworthlibrary.org/events', city: 'Killingworth', state: 'CT', zipCode: '06419', county: 'Killingworth County'},
  { name: 'Jonathan Trumbull Library', url: 'https://www.lebanonlibrary.org', eventsUrl: 'https://www.lebanonlibrary.org/events', city: 'Lebanon', state: 'CT', zipCode: '06249', county: 'Lebanon County'},
  { name: 'Bill Library', url: 'https://www.ledyardlibrary.org', eventsUrl: 'https://www.ledyardlibrary.org/events', city: 'Ledyard', state: 'CT', zipCode: '00000', county: 'Ledyard County'},
  { name: 'Oliver Wolcott Library', url: 'https://www.litchfieldlibrary.org', eventsUrl: 'https://www.litchfieldlibrary.org/events', city: 'Litchfield', state: 'CT', zipCode: '06759', county: 'Litchfield County'},
  { name: 'Lyme Public Library', url: 'https://www.lymelibrary.org', eventsUrl: 'https://www.lymelibrary.org/events', city: 'Lyme', state: 'CT', zipCode: '06371', county: 'Lyme County'},
  { name: 'E.C. Scranton Memorial Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'CT', zipCode: '06443', county: 'Madison County'},
  { name: 'Mansfield Public Library', url: 'https://www.mansfieldlibrary.org', eventsUrl: 'https://www.mansfieldlibrary.org/events', city: 'Mansfield', state: 'CT', zipCode: '06250', county: 'Mansfield County'},
  { name: 'Richmond Memorial Library', url: 'https://www.marlboroughlibrary.org', eventsUrl: 'https://www.marlboroughlibrary.org/events', city: 'Marlborough', state: 'CT', zipCode: '06447', county: 'Marlborough County'},
  { name: 'Middlebury Public Library', url: 'https://www.middleburylibrary.org', eventsUrl: 'https://www.middleburylibrary.org/events', city: 'Middlebury', state: 'CT', zipCode: '06762', county: 'Middlebury County'},
  { name: 'Levi E.Coe Library', url: 'https://www.middlefieldlibrary.org', eventsUrl: 'https://www.middlefieldlibrary.org/events', city: 'Middlefield', state: 'CT', zipCode: '06455', county: 'Middlefield County'},
  { name: 'Edith Wheeler Memorial Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'CT', zipCode: '06468', county: 'Monroe County'},
  { name: 'East Haddam Free Public Library', url: 'https://www.mooduslibrary.org', eventsUrl: 'https://www.mooduslibrary.org/events', city: 'Moodus', state: 'CT', zipCode: '06469', county: 'Moodus County'},
  { name: 'Aldrich Free Public Library', url: 'https://www.moosuplibrary.org', eventsUrl: 'https://www.moosuplibrary.org/events', city: 'Moosup', state: 'CT', zipCode: '06354', county: 'Moosup County'},
  { name: 'Morris Public Library', url: 'https://www.morrislibrary.org', eventsUrl: 'https://www.morrislibrary.org/events', city: 'Morris', state: 'CT', zipCode: '06763', county: 'Morris County'},
  { name: 'Mystic Noank Library', url: 'https://www.mysticlibrary.org', eventsUrl: 'https://www.mysticlibrary.org/events', city: 'Mystic', state: 'CT', zipCode: '06355', county: 'Mystic County'},
  { name: 'Howard Whittemore Memorial Library', url: 'https://www.naugatucklibrary.org', eventsUrl: 'https://www.naugatucklibrary.org/events', city: 'Naugatuck', state: 'CT', zipCode: '06770', county: 'Naugatuck County'},
  { name: 'New Canaan Library', url: 'https://www.newcanaanlibrary.org', eventsUrl: 'https://www.newcanaanlibrary.org/events', city: 'New Canaan', state: 'CT', zipCode: '06840', county: 'New Canaan County'},
  { name: 'New Fairfield Free Public Library', url: 'https://www.newfairfieldlibrary.org', eventsUrl: 'https://www.newfairfieldlibrary.org/events', city: 'New Fairfield', state: 'CT', zipCode: '06812', county: 'New Fairfield County'},
  { name: 'Bakerville Library, Inc.', url: 'https://www.newhartfordlibrary.org', eventsUrl: 'https://www.newhartfordlibrary.org/events', city: 'New Hartford', state: 'CT', zipCode: '06057', county: 'New Hartford County'},
  { name: 'Public Library Of New London', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'CT', zipCode: '06320', county: 'New London County'},
  { name: 'New Milford Public Library', url: 'https://www.newmilfordlibrary.org', eventsUrl: 'https://www.newmilfordlibrary.org/events', city: 'New Milford', state: 'CT', zipCode: '06776', county: 'New Milford County'},
  { name: 'Lucy Robbins Welles Library', url: 'https://www.newingtonlibrary.org', eventsUrl: 'https://www.newingtonlibrary.org/events', city: 'Newington', state: 'CT', zipCode: '06111', county: 'Newington County'},
  { name: 'Cyrenius H. Booth Library', url: 'https://www.newtownlibrary.org', eventsUrl: 'https://www.newtownlibrary.org/events', city: 'Newtown', state: 'CT', zipCode: '06470', county: 'Newtown County'},
  { name: 'East Lyme Public Library', url: 'https://www.nianticlibrary.org', eventsUrl: 'https://www.nianticlibrary.org/events', city: 'Niantic', state: 'CT', zipCode: '06357', county: 'Niantic County'},
  { name: 'Norfolk Library', url: 'https://www.norfolklibrary.org', eventsUrl: 'https://www.norfolklibrary.org/events', city: 'Norfolk', state: 'CT', zipCode: '06058', county: 'Norfolk County'},
  { name: 'Atwater Memorial Library', url: 'https://www.northbranfordlibrary.org', eventsUrl: 'https://www.northbranfordlibrary.org/events', city: 'North Branford', state: 'CT', zipCode: '00000', county: 'North Branford County'},
  { name: 'Douglas Library', url: 'https://www.northcanaanlibrary.org', eventsUrl: 'https://www.northcanaanlibrary.org/events', city: 'North Canaan', state: 'CT', zipCode: '06018', county: 'North Canaan County'},
  { name: 'Thompson Public Library', url: 'https://www.northgrosvenordalelibrary.org', eventsUrl: 'https://www.northgrosvenordalelibrary.org/events', city: 'North Grosvenordale', state: 'CT', zipCode: '06255', county: 'North Grosvenordale County'},
  { name: 'North Haven Memorial Library', url: 'https://www.northhavenlibrary.org', eventsUrl: 'https://www.northhavenlibrary.org/events', city: 'North Haven', state: 'CT', zipCode: '06473', county: 'North Haven County'},
  { name: 'Wheeler Library', url: 'https://www.northstoningtonlibrary.org', eventsUrl: 'https://www.northstoningtonlibrary.org/events', city: 'North Stonington', state: 'CT', zipCode: '06359', county: 'North Stonington County'},
  { name: 'Gilbert Library', url: 'https://www.northfieldlibrary.org', eventsUrl: 'https://www.northfieldlibrary.org/events', city: 'Northfield', state: 'CT', zipCode: '06778', county: 'Northfield County'},
  { name: 'Otis Library', url: 'https://www.norwichlibrary.org', eventsUrl: 'https://www.norwichlibrary.org/events', city: 'Norwich', state: 'CT', zipCode: '06360', county: 'Norwich County'},
  { name: 'Raymond Library', url: 'https://www.oakdalelibrary.org', eventsUrl: 'https://www.oakdalelibrary.org/events', city: 'Oakdale', state: 'CT', zipCode: '06370', county: 'Oakdale County'},
  { name: 'Perrot Memorial Library', url: 'https://www.oldgreenwichlibrary.org', eventsUrl: 'https://www.oldgreenwichlibrary.org/events', city: 'Old Greenwich', state: 'CT', zipCode: '00000', county: 'Old Greenwich County'},
  { name: 'Old Lyme - Phoebe Griffin Noyes Library', url: 'https://www.oldlymelibrary.org', eventsUrl: 'https://www.oldlymelibrary.org/events', city: 'Old Lyme', state: 'CT', zipCode: '06371', county: 'Old Lyme County'},
  { name: 'Acton Public Library', url: 'https://www.oldsaybrooklibrary.org', eventsUrl: 'https://www.oldsaybrooklibrary.org/events', city: 'Old Saybrook', state: 'CT', zipCode: '06475', county: 'Old Saybrook County'},
  { name: 'Sterling Public Library', url: 'https://www.onecolibrary.org', eventsUrl: 'https://www.onecolibrary.org/events', city: 'Oneco', state: 'CT', zipCode: '06373', county: 'Oneco County'},
  { name: 'Case Memorial Library', url: 'https://www.orangelibrary.org', eventsUrl: 'https://www.orangelibrary.org/events', city: 'Orange', state: 'CT', zipCode: '06477', county: 'Orange County'},
  { name: 'Oxford Public Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'CT', zipCode: '06478', county: 'Oxford County'},
  { name: 'Central Village Public Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'CT', zipCode: '06332', county: 'Plainfield County'},
  { name: 'Plainville Public Library', url: 'https://www.plainvillelibrary.org', eventsUrl: 'https://www.plainvillelibrary.org/events', city: 'Plainville', state: 'CT', zipCode: '06062', county: 'Plainville County'},
  { name: 'Plymouth Library Association', url: 'https://www.plymouthlibrary.org', eventsUrl: 'https://www.plymouthlibrary.org/events', city: 'Plymouth', state: 'CT', zipCode: '06782', county: 'Plymouth County'},
  { name: 'Pomfret Public Library', url: 'https://www.pomfretlibrary.org', eventsUrl: 'https://www.pomfretlibrary.org/events', city: 'Pomfret', state: 'CT', zipCode: '06258', county: 'Pomfret County'},
  { name: 'Portland Public Library', url: 'https://www.portlandlibrary.org', eventsUrl: 'https://www.portlandlibrary.org/events', city: 'Portland', state: 'CT', zipCode: '06480', county: 'Portland County'},
  { name: 'Preston Public Library', url: 'https://www.prestonlibrary.org', eventsUrl: 'https://www.prestonlibrary.org/events', city: 'Preston', state: 'CT', zipCode: '06365', county: 'Preston County'},
  { name: 'Prospect Public Library', url: 'https://www.prospectlibrary.org', eventsUrl: 'https://www.prospectlibrary.org/events', city: 'Prospect', state: 'CT', zipCode: '06712', county: 'Prospect County'},
  { name: 'Putnam Public Library', url: 'https://www.putnamlibrary.org', eventsUrl: 'https://www.putnamlibrary.org/events', city: 'Putnam', state: 'CT', zipCode: '06260', county: 'Putnam County'},
  { name: 'Mark Twain Library', url: 'https://www.reddinglibrary.org', eventsUrl: 'https://www.reddinglibrary.org/events', city: 'Redding', state: 'CT', zipCode: '06875', county: 'Redding County'},
  { name: 'Ridgefield Library', url: 'https://www.ridgefieldlibrary.org', eventsUrl: 'https://www.ridgefieldlibrary.org/events', city: 'Ridgefield', state: 'CT', zipCode: '06877', county: 'Ridgefield County'},
  { name: 'Cora J. Belden Library', url: 'https://www.rockyhilllibrary.org', eventsUrl: 'https://www.rockyhilllibrary.org/events', city: 'Rocky Hill', state: 'CT', zipCode: '06067', county: 'Rocky Hill County'},
  { name: 'Minor Memorial Library', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'CT', zipCode: '06783', county: 'Roxbury County'},
  { name: 'Salem Free Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'CT', zipCode: '06420', county: 'Salem County'},
  { name: 'Scoville Memorial Library', url: 'https://www.salisburylibrary.org', eventsUrl: 'https://www.salisburylibrary.org/events', city: 'Salisbury', state: 'CT', zipCode: '06068', county: 'Salisbury County'},
  { name: 'Scotland Public Library', url: 'https://www.scotlandlibrary.org', eventsUrl: 'https://www.scotlandlibrary.org/events', city: 'Scotland', state: 'CT', zipCode: '06264', county: 'Scotland County'},
  { name: 'Seymour Public Library', url: 'https://www.seymourlibrary.org', eventsUrl: 'https://www.seymourlibrary.org/events', city: 'Seymour', state: 'CT', zipCode: '06483', county: 'Seymour County'},
  { name: 'Hotchkiss Library', url: 'https://www.sharonlibrary.org', eventsUrl: 'https://www.sharonlibrary.org/events', city: 'Sharon', state: 'CT', zipCode: '06069', county: 'Sharon County'},
  { name: 'Sherman Library Assn.', url: 'https://www.shermanlibrary.org', eventsUrl: 'https://www.shermanlibrary.org/events', city: 'Sherman', state: 'CT', zipCode: '06784', county: 'Sherman County'},
  { name: 'Simsbury Public Library', url: 'https://www.simsburylibrary.org', eventsUrl: 'https://www.simsburylibrary.org/events', city: 'Simsbury', state: 'CT', zipCode: '06070', county: 'Simsbury County'},
  { name: 'Somers Public Library', url: 'https://www.somerslibrary.org', eventsUrl: 'https://www.somerslibrary.org/events', city: 'Somers', state: 'CT', zipCode: '06071', county: 'Somers County'},
  { name: 'Hanover School', url: 'https://www.southmeridanlibrary.org', eventsUrl: 'https://www.southmeridanlibrary.org/events', city: 'South Meridan', state: 'CT', zipCode: '00000', county: 'South Meridan County'},
  { name: 'Guilford Smith Memorial Library, Inc.', url: 'https://www.southwindhamlibrary.org', eventsUrl: 'https://www.southwindhamlibrary.org/events', city: 'South Windham', state: 'CT', zipCode: '06266', county: 'South Windham County'},
  { name: 'South Windsor Public Library', url: 'https://www.southwindsorlibrary.org', eventsUrl: 'https://www.southwindsorlibrary.org/events', city: 'South Windsor', state: 'CT', zipCode: '06074', county: 'South Windsor County'},
  { name: 'Southbury Public Library', url: 'https://www.southburylibrary.org', eventsUrl: 'https://www.southburylibrary.org/events', city: 'Southbury', state: 'CT', zipCode: '06488', county: 'Southbury County'},
  { name: 'Pequot Library Association', url: 'https://www.southportlibrary.org', eventsUrl: 'https://www.southportlibrary.org/events', city: 'Southport', state: 'CT', zipCode: '06890', county: 'Southport County'},
  { name: 'Stafford Library Association', url: 'https://www.staffordlibrary.org', eventsUrl: 'https://www.staffordlibrary.org/events', city: 'Stafford', state: 'CT', zipCode: '06075', county: 'Stafford County'},
  { name: 'Stonington Free Library', url: 'https://www.stoningtonlibrary.org', eventsUrl: 'https://www.stoningtonlibrary.org/events', city: 'Stonington', state: 'CT', zipCode: '06378', county: 'Stonington County'},
  { name: 'Willoughby Wallace Memorial Library', url: 'https://www.stonycreeklibrary.org', eventsUrl: 'https://www.stonycreeklibrary.org/events', city: 'Stony Creek', state: 'CT', zipCode: '06405', county: 'Stony Creek County'},
  { name: 'Kent Memorial Library', url: 'https://www.suffieldlibrary.org', eventsUrl: 'https://www.suffieldlibrary.org/events', city: 'Suffield', state: 'CT', zipCode: '06078', county: 'Suffield County'},
  { name: 'Terryville Public Library', url: 'https://www.terryvillelibrary.org', eventsUrl: 'https://www.terryvillelibrary.org/events', city: 'Terryville', state: 'CT', zipCode: '06786', county: 'Terryville County'},
  { name: 'Thomaston Public Library', url: 'https://www.thomastonlibrary.org', eventsUrl: 'https://www.thomastonlibrary.org/events', city: 'Thomaston', state: 'CT', zipCode: '06787', county: 'Thomaston County'},
  { name: 'Town Of Tolland Public Library', url: 'https://www.tollandlibrary.org', eventsUrl: 'https://www.tollandlibrary.org/events', city: 'Tolland', state: 'CT', zipCode: '06084', county: 'Tolland County'},
  { name: 'Union Free Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'CT', zipCode: '06076', county: 'Union County'},
  { name: 'Voluntown Public Library', url: 'https://www.voluntownlibrary.org', eventsUrl: 'https://www.voluntownlibrary.org/events', city: 'Voluntown', state: 'CT', zipCode: '06483', county: 'Voluntown County'},
  { name: 'Warren Public Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'CT', zipCode: '06754', county: 'Warren County'},
  { name: 'Gunn Memorial Library', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'CT', zipCode: '06793', county: 'Washington County'},
  { name: 'Waterford Public Library', url: 'https://www.waterfordlibrary.org', eventsUrl: 'https://www.waterfordlibrary.org/events', city: 'Waterford', state: 'CT', zipCode: '06385', county: 'Waterford County'},
  { name: 'Oakville Branch Library', url: 'https://www.watertownlibrary.org', eventsUrl: 'https://www.watertownlibrary.org/events', city: 'Watertown', state: 'CT', zipCode: '00000', county: 'Watertown County'},
  { name: 'Hughes Memorial Library', url: 'https://www.westcornwalllibrary.org', eventsUrl: 'https://www.westcornwalllibrary.org/events', city: 'West Cornwall', state: 'CT', zipCode: '06796', county: 'West Cornwall County'},
  { name: 'Louis Piantino Branch Library', url: 'https://www.westhavenlibrary.org', eventsUrl: 'https://www.westhavenlibrary.org/events', city: 'West Haven', state: 'CT', zipCode: '00000', county: 'West Haven County'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'CT', zipCode: '06498', county: 'Westbrook County'},
  { name: 'Weston Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'CT', zipCode: '06883', county: 'Weston County'},
  { name: 'Westport Library', url: 'https://www.westportlibrary.org', eventsUrl: 'https://www.westportlibrary.org/events', city: 'Westport', state: 'CT', zipCode: '06880', county: 'Westport County'},
  { name: 'Wethersfield Public Library', url: 'https://www.wethersfieldlibrary.org', eventsUrl: 'https://www.wethersfieldlibrary.org/events', city: 'Wethersfield', state: 'CT', zipCode: '06109', county: 'Wethersfield County'},
  { name: 'Willimantic Public Library', url: 'https://www.willimanticlibrary.org', eventsUrl: 'https://www.willimanticlibrary.org/events', city: 'Willimantic', state: 'CT', zipCode: '06226', county: 'Willimantic County'},
  { name: 'Willington Public Library', url: 'https://www.willingtonlibrary.org', eventsUrl: 'https://www.willingtonlibrary.org/events', city: 'Willington', state: 'CT', zipCode: '06279', county: 'Willington County'},
  { name: 'Wilton Library Association', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'CT', zipCode: '06897', county: 'Wilton County'},
  { name: 'Beardsley Memorial Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'CT', zipCode: '06098', county: 'Winchester County'},
  { name: 'Windham Free Library', url: 'https://www.windhamlibrary.org', eventsUrl: 'https://www.windhamlibrary.org/events', city: 'Windham', state: 'CT', zipCode: '06280', county: 'Windham County'},
  { name: 'Wilson Branch Library', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'CT', zipCode: '00000', county: 'Windsor County'},
  { name: 'Windsor Locks Public Library', url: 'https://www.windsorlockslibrary.org', eventsUrl: 'https://www.windsorlockslibrary.org/events', city: 'Windsor Locks', state: 'CT', zipCode: '06096', county: 'Windsor Locks County'},
  { name: 'Wolcott Public Library', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'CT', zipCode: '06716', county: 'Wolcott County'},
  { name: 'Woodbridge Town Library', url: 'https://www.woodbridgelibrary.org', eventsUrl: 'https://www.woodbridgelibrary.org/events', city: 'Woodbridge', state: 'CT', zipCode: '06525', county: 'Woodbridge County'},
  { name: 'Woodbury Public Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'CT', zipCode: '06798', county: 'Woodbury County'},
  { name: 'Howard W. Bracken Memorial Library', url: 'https://www.woodstocklibrary.org', eventsUrl: 'https://www.woodstocklibrary.org/events', city: 'Woodstock', state: 'CT', zipCode: '06281', county: 'Woodstock County'}

];

const SCRAPER_NAME = 'wordpress-CT';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'CT', city: library.city, zipCode: library.zipCode }}));
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
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressCTCloudFunction };
