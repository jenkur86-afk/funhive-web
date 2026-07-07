const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Iowa Public Libraries Scraper
 * State: IA
 * Coverage: All Iowa Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Des Moines Public Library', url: 'https://www.dmpl.org', eventsUrl: 'https://www.dmpl.org/events', city: 'Des Moines', state: 'IA', zipCode: '50309', county: 'Polk County'},
  { name: 'Cedar Rapids Public Library', url: 'https://www.crlibrary.org', eventsUrl: 'https://www.crlibrary.org/events', city: 'Cedar Rapids', state: 'IA', zipCode: '52401', county: 'Linn County'},
  { name: 'Iowa City Public Library', url: 'https://www.icpl.org', eventsUrl: 'https://www.icpl.org/events', city: 'Iowa City', state: 'IA', zipCode: '52240', county: 'Johnson County'},
  { name: 'Ames Public Library', url: 'https://www.amespubliclibrary.org', eventsUrl: 'https://www.amespubliclibrary.org/events', city: 'Ames', state: 'IA', zipCode: '50010', county: 'Story County'},
  // Regional Libraries
  { name: 'Council Bluffs Public Library', url: 'https://www.councilbluffslibrary.org', eventsUrl: 'https://www.councilbluffslibrary.org/events', city: 'Council Bluffs', state: 'IA', zipCode: '51503', county: 'Pottawattamie County'},
  { name: 'Dubuque County Library', url: 'https://www.dubcolib.org', eventsUrl: 'https://www.dubcolib.org/events', city: 'Dubuque', state: 'IA', zipCode: '52001', county: 'Dubuque County'},
  { name: 'West Des Moines Public Library', url: 'https://www.wdmlibrary.org', eventsUrl: 'https://www.wdmlibrary.org/events', city: 'West Des Moines', state: 'IA', zipCode: '50265', county: 'Polk County'},
  { name: 'Urbandale Public Library', url: 'https://www.urbandalelibrary.org', eventsUrl: 'https://www.urbandalelibrary.org/events', city: 'Urbandale', state: 'IA', zipCode: '50322', county: 'Polk County'},
  { name: 'Bettendorf Public Library', url: 'https://www.bettendorflibrary.com', eventsUrl: 'https://www.bettendorflibrary.com/events', city: 'Bettendorf', state: 'IA', zipCode: '52722', county: 'Scott County'},
  { name: 'Mason City Public Library', url: 'https://www.mcpl.org', eventsUrl: 'https://www.mcpl.org/events', city: 'Mason City', state: 'IA', zipCode: '50401', county: 'Cerro Gordo County'},
  { name: 'Marshalltown Public Library', url: 'https://www.marshalltownlibrary.org/', eventsUrl: 'https://www.marshalltownlibrary.org/', city: 'Marshalltown', state: 'IA', zipCode: '50158', county: 'Marshall County'},
  { name: 'Fort Dodge Public Library', url: 'https://www.fortdodgelibrary.org', eventsUrl: 'https://www.fortdodgelibrary.org/events', city: 'Fort Dodge', state: 'IA', zipCode: '50501', county: 'Webster County'},
  { name: 'Waterloo Public Library', url: 'https://www.waterloopubliclibrary.org', eventsUrl: 'https://www.waterloopubliclibrary.org/events', city: 'Waterloo', state: 'IA', zipCode: '50701', county: 'Black Hawk County'},
  { name: 'Sioux City Public Library', url: 'https://www.siouxcitylibrary.org/', eventsUrl: 'https://www.siouxcitylibrary.org/category/events/', city: 'Sioux City', state: 'IA', zipCode: '51101', county: 'Woodbury County'},
  { name: 'Davenport Public Library', url: 'https://www.davenportlibrary.com/', eventsUrl: 'https://www.davenportlibrary.com/', city: 'Davenport', state: 'IA', zipCode: '52801', county: 'Scott County'},
  { name: 'Marion Public Library', url: 'https://www.marionpubliclibrary.org', eventsUrl: 'https://www.marionpubliclibrary.org/events', city: 'Marion', state: 'IA', zipCode: '52302', county: 'Linn County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Akron Public Library', url: 'https://www.akronlibrary.org', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'IA', zipCode: '51001', county: 'Akron County'},
  { name: 'Albion Municipal Library', url: 'https://www.albionlibrary.org/', eventsUrl: 'https://www.albionlibrary.org/', city: 'Albion', state: 'IA', zipCode: '50005', county: 'Albion County'},
  { name: 'Dr. Grace O. Doane Alden Public Library', url: 'https://www.aldenlibrary.org/', eventsUrl: 'https://www.aldenlibrary.org/', city: 'Alden', state: 'IA', zipCode: '50006', county: 'Alden County'},
  { name: 'Alexander Public Library', url: 'https://alexanderlibrary.org/', eventsUrl: 'https://alexanderlibrary.org/calendar/', city: 'Alexander', state: 'IA', zipCode: '50420', county: 'Alexander County'},
  { name: 'Algona Public Library', url: 'https://www.algonalibrary.org', eventsUrl: 'https://www.algonalibrary.org/events', city: 'Algona', state: 'IA', zipCode: '50511', county: 'Algona County'},
  { name: 'Altoona Public Library', url: 'https://www.altoonalibrary.org', eventsUrl: 'https://www.altoonalibrary.org/events', city: 'Altoona', state: 'IA', zipCode: '50009', county: 'Altoona County'},
  { name: 'Anamosa Public Library', url: 'https://www.anamosalibrary.org', eventsUrl: 'https://www.anamosalibrary.org/events', city: 'Anamosa', state: 'IA', zipCode: '52205', county: 'Anamosa County'},
  { name: 'Anita Public Library', url: 'https://www.anitalibrary.org/', eventsUrl: 'https://www.anitalibrary.org/', city: 'Anita', state: 'IA', zipCode: '50020', county: 'Anita County'},
  { name: 'Archer Public Library', url: 'https://www.archerlibrary.org/', eventsUrl: 'https://www.archerlibrary.org/', city: 'Archer', state: 'IA', zipCode: '51231', county: 'Archer County'},
  { name: 'Arlington Public Library', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'IA', zipCode: '50606', county: 'Arlington County'},
  { name: 'Arthur Public Library', url: 'https://www.arthurlibrary.org/', eventsUrl: 'https://www.arthurlibrary.org/', city: 'Arthur', state: 'IA', zipCode: '51431', county: 'Arthur County'},
  { name: 'Atkins Public Library', url: 'https://www.atkinslibrary.org', eventsUrl: 'https://www.atkinslibrary.org/events', city: 'Atkins', state: 'IA', zipCode: '52206', county: 'Atkins County'},
  { name: 'Atlantic Public Library', url: 'https://atlanticlibrary.org/', eventsUrl: 'https://atlanticlibrary.org/', city: 'Atlantic', state: 'IA', zipCode: '50022', county: 'Atlantic County'},
  { name: 'Auburn Public Library', url: 'https://auburnlibrary.org/', eventsUrl: 'https://auburnlibrary.org/', city: 'Auburn', state: 'IA', zipCode: '51433', county: 'Auburn County'},
  { name: 'Audubon Public Library', url: 'https://www.audubonlibrary.org', eventsUrl: 'https://www.audubonlibrary.org/events', city: 'Audubon', state: 'IA', zipCode: '50025', county: 'Audubon County'},
  { name: 'Aurora Public Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'IA', zipCode: '50607', county: 'Aurora County'},
  { name: 'Bancroft Public Library', url: 'https://www.bancroftlibrary.org', eventsUrl: 'https://www.bancroftlibrary.org/events', city: 'Bancroft', state: 'IA', zipCode: '50517', county: 'Bancroft County'},
  { name: 'Batavia Public Library', url: 'https://www.batavialibrary.org', eventsUrl: 'https://www.batavialibrary.org/events', city: 'Batavia', state: 'IA', zipCode: '52533', county: 'Batavia County'},
  { name: 'Battle Creek Public Library', url: 'https://www.battlecreeklibrary.org', eventsUrl: 'https://www.battlecreeklibrary.org/events', city: 'Battle Creek', state: 'IA', zipCode: '51006', county: 'Battle Creek County'},
  { name: 'Baxter Public Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Baxter', state: 'IA', zipCode: '50028', county: 'Baxter County'},
  { name: 'Beaman Community Memorial Library', url: 'https://beamanlibrary.org/', eventsUrl: 'https://beamanlibrary.org/news-events/calendar/', city: 'Beaman', state: 'IA', zipCode: '50609', county: 'Beaman County'},
  { name: 'Bedford Public Library', url: 'https://www.bedfordlibrary.org', eventsUrl: 'https://www.bedfordlibrary.org/events', city: 'Bedford', state: 'IA', zipCode: '50833', county: 'Bedford County'},
  { name: 'Bellevue Public Library', url: 'https://www.bellevue.net/', eventsUrl: 'https://www.bellevue.net/176/Library', city: 'Bellevue', state: 'IA', zipCode: '52031', county: 'Bellevue County'},
  { name: 'Bondurant Community Library', url: 'https://saatx.follettdestiny.com/', eventsUrl: 'https://saatx.follettdestiny.com/common/welcome.jsp?site=100&context=saas15_4279440', city: 'Bondurant', state: 'IA', zipCode: '50035', county: 'Bondurant County'},
  { name: 'Ericson Public Library', url: 'https://www.boonelibrary.org', eventsUrl: 'https://www.boonelibrary.org/events', city: 'Boone', state: 'IA', zipCode: '50036', county: 'Boone County'},
  { name: 'Boyden Public Library', url: 'https://www.boydenlibrary.org', eventsUrl: 'https://www.boydenlibrary.org/events', city: 'Boyden', state: 'IA', zipCode: '51234', county: 'Boyden County'},
  { name: 'Buffalo Branch', url: 'https://www.buffalolibrary.org', eventsUrl: 'https://www.buffalolibrary.org/events', city: 'Buffalo', state: 'IA', zipCode: '00000', county: 'Buffalo County'},
  { name: 'Cambridge Memorial Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'IA', zipCode: '50046', county: 'Cambridge County'},
  { name: 'Carlisle Public Library', url: 'https://www.carlislelibrary.org', eventsUrl: 'https://www.carlislelibrary.org/events', city: 'Carlisle', state: 'IA', zipCode: '50047', county: 'Carlisle County'},
  { name: 'Carroll Public Library', url: 'https://www.carrolllibrary.org/', eventsUrl: 'https://www.carrolllibrary.org/', city: 'Carroll', state: 'IA', zipCode: '51401', county: 'Carroll County'},
  { name: 'Carter Lake Public Library', url: 'https://www.carterlakelibrary.org/', eventsUrl: 'https://www.carterlakelibrary.org/calendar', city: 'Carter Lake', state: 'IA', zipCode: '00000', county: 'Carter Lake County'},
  { name: 'Casey Public Library', url: 'https://caseylibrary.org/', eventsUrl: 'https://caseylibrary.org/calendar/', city: 'Casey', state: 'IA', zipCode: '50048', county: 'Casey County'},
  { name: 'Cedar Falls Public Library', url: 'https://cedarfallslibrary.org/', eventsUrl: 'https://cedarfallslibrary.org/', city: 'Cedar Falls', state: 'IA', zipCode: '50613', county: 'Cedar Falls County'},
  { name: 'Center Point Public Library', url: 'https://www.centerpointlibrary.org', eventsUrl: 'https://www.centerpointlibrary.org/events', city: 'Center Point', state: 'IA', zipCode: '52213', county: 'Center Point County'},
  { name: 'Drake Public Library', url: 'https://www.centervillelibrary.org', eventsUrl: 'https://www.centervillelibrary.org/events', city: 'Centerville', state: 'IA', zipCode: '52544', county: 'Centerville County'},
  { name: 'Charles City Public Library', url: 'https://www.charlescitylibrary.org', eventsUrl: 'https://www.charlescitylibrary.org/events', city: 'Charles City', state: 'IA', zipCode: '50616', county: 'Charles City County'},
  { name: 'Chelsea Public Library', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'IA', zipCode: '52215', county: 'Chelsea County'},
  { name: 'Clear Lake Public Library', url: 'https://www.clearlakelibrary.org', eventsUrl: 'https://www.clearlakelibrary.org/events', city: 'Clear Lake', state: 'IA', zipCode: '50428', county: 'Clear Lake County'},
  { name: 'Clermont Public Library', url: 'https://www.clermontlibrary.org/', eventsUrl: 'https://www.clermontlibrary.org/', city: 'Clermont', state: 'IA', zipCode: '52135', county: 'Clermont County'},
  { name: 'Coin Public Library', url: 'https://www.coinlibrary.org', eventsUrl: 'https://www.coinlibrary.org/events', city: 'Coin', state: 'IA', zipCode: '51636', county: 'Coin County'},
  { name: 'Matilda J. Gibson Memorial Library', url: 'https://www.crestonlibrary.org', eventsUrl: 'https://www.crestonlibrary.org/events', city: 'Creston', state: 'IA', zipCode: '50801', county: 'Creston County'},
  { name: 'Juanita Earp Media Center', url: 'https://www.clpl.org/', eventsUrl: 'https://www.clpl.org/', city: 'Crystal Lake', state: 'IA', zipCode: '50432', county: 'Crystal Lake County'},
  { name: 'Cumberland Public Library', url: 'https://www.cumberlandlibrary.org', eventsUrl: 'https://www.cumberlandlibrary.org/events', city: 'Cumberland', state: 'IA', zipCode: '50843', county: 'Cumberland County'},
  { name: 'Cord Memorial Library, Danbury Branch', url: 'https://danburylibrary.org/', eventsUrl: 'https://danburylibrary.org/', city: 'Danbury', state: 'IA', zipCode: '00000', county: 'Danbury County'},
  { name: 'Decorah Public Library', url: 'https://www.decorahlibrary.org', eventsUrl: 'https://www.decorahlibrary.org/events', city: 'Decorah', state: 'IA', zipCode: '52101', county: 'Decorah County'},
  { name: 'Norelius Community Library', url: 'https://www.denisonlibrary.org', eventsUrl: 'https://www.denisonlibrary.org/events', city: 'Denison', state: 'IA', zipCode: '51442', county: 'Denison County'},
  { name: 'Denver Public Library', url: 'https://www.denverlibrary.org', eventsUrl: 'https://www.denverlibrary.org/events', city: 'Denver', state: 'IA', zipCode: '50622', county: 'Denver County'},
  { name: 'Frances Banta Waggoner Community Library', url: 'https://www.dewittlibrary.org', eventsUrl: 'https://www.dewittlibrary.org/events', city: 'Dewitt', state: 'IA', zipCode: '52742', county: 'Dewitt County'},
  { name: 'Dumont Community Library', url: 'https://www.dumontlibrary.org/', eventsUrl: 'https://www.dumontlibrary.org/', city: 'Dumont', state: 'IA', zipCode: '50625', county: 'Dumont County'},
  { name: 'Dunlap Public Library', url: 'https://www.dunlaplibrary.org', eventsUrl: 'https://www.dunlaplibrary.org/events', city: 'Dunlap', state: 'IA', zipCode: '51529', county: 'Dunlap County'},
  { name: 'Ruth Suckow Memorial Library', url: 'https://www.earlvillelibrary.org/', eventsUrl: 'https://www.earlvillelibrary.org/', city: 'Earlville', state: 'IA', zipCode: '52041', county: 'Earlville County'},
  { name: 'Elgin Public Library', url: 'https://www.elginlibrary.org/', eventsUrl: 'https://www.elginlibrary.org/', city: 'Elgin', state: 'IA', zipCode: '52141', county: 'Elgin County'},
  { name: 'Elliott Public Library', url: 'https://www.elliottlibrary.org', eventsUrl: 'https://www.elliottlibrary.org/events', city: 'Elliott', state: 'IA', zipCode: '51532', county: 'Elliott County'},
  { name: 'Ellsworth Public Library', url: 'https://www.ellsworthlibrary.org', eventsUrl: 'https://www.ellsworthlibrary.org/events', city: 'Ellsworth', state: 'IA', zipCode: '50075', county: 'Ellsworth County'},
  { name: 'Ely Public Library', url: 'https://www.elylibrary.org/', eventsUrl: 'https://www.elylibrary.org/', city: 'Ely', state: 'IA', zipCode: '52227', county: 'Ely County'},
  { name: 'Emerson Public Library', url: 'https://www.emersonlibrary.com/', eventsUrl: 'https://www.emersonlibrary.com/', city: 'Emerson', state: 'IA', zipCode: '51533', county: 'Emerson County'},
  { name: 'Lied Public Library-Essex', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'IA', zipCode: '51638', county: 'Essex County'},
  { name: 'Fairfax Public Library', url: 'https://www.fairfaxlibrary.org', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'IA', zipCode: '52228', county: 'Fairfax County'},
  { name: 'Farmington Public Library', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'IA', zipCode: '52626', county: 'Farmington County'},
  { name: 'Fayette Community Library', url: 'https://www.fayettelibrary.org', eventsUrl: 'https://www.fayettelibrary.org/events', city: 'Fayette', state: 'IA', zipCode: '52142', county: 'Fayette County'},
  { name: 'Fort Madison Public Library', url: 'https://www.fortmadison-ia.com/', eventsUrl: 'https://www.fortmadison-ia.com/269/Library', city: 'Fort Madison', state: 'IA', zipCode: '52627', county: 'Fort Madison County'},
  { name: 'Galva Public Library', url: 'https://www.galvalibrary.org', eventsUrl: 'https://www.galvalibrary.org/events', city: 'Galva', state: 'IA', zipCode: '51020', county: 'Galva County'},
  { name: 'Gilman Public Library', url: 'https://gilmanlibrary.org/', eventsUrl: 'https://gilmanlibrary.org/calendar', city: 'Gilman', state: 'IA', zipCode: '50106', county: 'Gilman County'},
  { name: 'Glenwood Public Library', url: 'https://glenwoodlibrary.org/', eventsUrl: 'https://glenwoodlibrary.org/', city: 'Glenwood', state: 'IA', zipCode: '51534', county: 'Glenwood County'},
  { name: 'Grafton Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'IA', zipCode: '50440', county: 'Grafton County'},
  { name: 'Granger Public Library', url: 'https://www.grangerlibrary.org', eventsUrl: 'https://www.grangerlibrary.org/events', city: 'Granger', state: 'IA', zipCode: '50109', county: 'Granger County'},
  { name: 'Greene Public Library', url: 'https://www.greenelibrary.org', eventsUrl: 'https://www.greenelibrary.org/events', city: 'Greene', state: 'IA', zipCode: '50636', county: 'Greene County'},
  { name: 'Greenfield Public Library', url: 'https://www.greenfieldlibrary.org', eventsUrl: 'https://www.greenfieldlibrary.org/events', city: 'Greenfield', state: 'IA', zipCode: '50849', county: 'Greenfield County'},
  { name: 'Grimes Public Library', url: 'https://grimes.librarycalendar.com/', eventsUrl: 'https://grimes.librarycalendar.com/events/month', city: 'Grimes', state: 'IA', zipCode: '50111', county: 'Grimes County'},
  { name: 'Hamburg Public Library', url: 'https://www.hamburglibrary.org/', eventsUrl: 'https://www.hamburglibrary.org/', city: 'Hamburg', state: 'IA', zipCode: '51640', county: 'Hamburg County'},
  { name: 'Harlan Community Library', url: 'https://www.harlan.lib.ia.us/', eventsUrl: 'https://www.harlan.lib.ia.us/events', city: 'Harlan', state: 'IA', zipCode: '51537', county: 'Harlan County'},
  { name: 'Havelock Public Library', url: 'https://citylibrary.com/', eventsUrl: 'https://citylibrary.com/public-libraries/havelock-public-library/', city: 'Havelock', state: 'IA', zipCode: '50546', county: 'Havelock County'},
  { name: 'Hiawatha Public Library', url: 'https://www.hiawathalibrary.org', eventsUrl: 'https://www.hiawathalibrary.org/events', city: 'Hiawatha', state: 'IA', zipCode: '52233', county: 'Hiawatha County'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'IA', zipCode: '52630', county: 'Hillsboro County'},
  { name: 'Hopkinton Public Library', url: 'https://hopkintonlibrary.org/', eventsUrl: 'https://hopkintonlibrary.org/calendar/', city: 'Hopkinton', state: 'IA', zipCode: '52237', county: 'Hopkinton County'},
  { name: 'Hubbard Public Library', url: 'https://www.hubbardlibrary.org', eventsUrl: 'https://www.hubbardlibrary.org/events', city: 'Hubbard', state: 'IA', zipCode: '50122', county: 'Hubbard County'},
  { name: 'Hudson Public Library', url: 'https://www.hudsonlibrary.org', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'IA', zipCode: '50643', county: 'Hudson County'},
  { name: 'Jesup Public Library', url: 'https://www.jesuplibrary.org', eventsUrl: 'https://www.jesuplibrary.org/events', city: 'Jesup', state: 'IA', zipCode: '50648', county: 'Jesup County'},
  { name: 'Kalona Public Library', url: 'https://www.kalonalibrary.org', eventsUrl: 'https://www.kalonalibrary.org/events', city: 'Kalona', state: 'IA', zipCode: '52247', county: 'Kalona County'},
  { name: 'Kanawha Public Library', url: 'https://www.kcpls.org/', eventsUrl: 'https://www.kcpls.org/', city: 'Kanawha', state: 'IA', zipCode: '50447', county: 'Kanawha County'},
  { name: 'Keokuk Public Library', url: 'https://www.keokuklibrary.org', eventsUrl: 'https://www.keokuklibrary.org/events', city: 'Keokuk', state: 'IA', zipCode: '52632', county: 'Keokuk County'},
  { name: 'Lake View Public Library', url: 'https://lakeviewlibrary.org/', eventsUrl: 'https://lakeviewlibrary.org/', city: 'Lake View', state: 'IA', zipCode: '51450', county: 'Lake View County'},
  { name: 'Lamoni Public Library', url: 'https://www.lamonilibrary.org', eventsUrl: 'https://www.lamonilibrary.org/events', city: 'Lamoni', state: 'IA', zipCode: '50140', county: 'Lamoni County'},
  { name: 'Lamont Public Library', url: 'https://lamontlibrary.org/', eventsUrl: 'https://lamontlibrary.org/calendar/', city: 'Lamont', state: 'IA', zipCode: '50650', county: 'Lamont County'},
  { name: 'Meehan Memorial Lansing Public Library', url: 'https://www.lansinglibrary.org', eventsUrl: 'https://www.lansinglibrary.org/events', city: 'Lansing', state: 'IA', zipCode: '52151', county: 'Lansing County'},
  { name: 'Laurel Community Library', url: 'https://www.laurellibrary.org', eventsUrl: 'https://www.laurellibrary.org/events', city: 'Laurel', state: 'IA', zipCode: '50141', county: 'Laurel County'},
  { name: 'Le Mars Public Library', url: 'https://lemarslibrary.org/', eventsUrl: 'https://lemarslibrary.org/', city: 'Le Mars', state: 'IA', zipCode: '51031', county: 'Le Mars County'},
  { name: 'Leclaire Community Library', url: 'https://www.leclairelibrary.org', eventsUrl: 'https://www.leclairelibrary.org/events', city: 'Leclaire', state: 'IA', zipCode: '52753', county: 'Leclaire County'},
  { name: 'Ledyard Public Library', url: 'https://www.ledyardlibrary.org', eventsUrl: 'https://www.ledyardlibrary.org/events', city: 'Ledyard', state: 'IA', zipCode: '50556', county: 'Ledyard County'},
  { name: 'Lenox Public Library', url: 'https://www.lenoxlibrary.org', eventsUrl: 'https://www.lenoxlibrary.org/events', city: 'Lenox', state: 'IA', zipCode: '50851', county: 'Lenox County'},
  { name: 'Logan Public Library', url: 'https://loganlibrary.org/', eventsUrl: 'https://loganlibrary.org/calendar/', city: 'Logan', state: 'IA', zipCode: '51546', county: 'Logan County'},
  { name: 'Malvern Public Library', url: 'https://www.malvernlibrary.org', eventsUrl: 'https://www.malvernlibrary.org/events', city: 'Malvern', state: 'IA', zipCode: '51551', county: 'Malvern County'},
  { name: 'Manchester Public Library', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'IA', zipCode: '52057', county: 'Manchester County'},
  { name: 'Menlo Public Library', url: 'https://www.menlolibrary.org', eventsUrl: 'https://www.menlolibrary.org/events', city: 'Menlo', state: 'IA', zipCode: '50164', county: 'Menlo County'},
  { name: 'Milford Memorial Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'IA', zipCode: '51351', county: 'Milford County'},
  { name: 'Milton Public Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'IA', zipCode: '52570', county: 'Milton County'},
  { name: 'Murphy Memorial Library', url: 'https://www.mononalibrary.org', eventsUrl: 'https://www.mononalibrary.org/events', city: 'Monona', state: 'IA', zipCode: '52159', county: 'Monona County'},
  { name: 'Monroe Public Library', url: 'https://www.monroelibrary.org', eventsUrl: 'https://www.monroelibrary.org/events', city: 'Monroe', state: 'IA', zipCode: '50170', county: 'Monroe County'},
  { name: 'Monticello Public Library', url: 'https://www.monticellolibrary.org', eventsUrl: 'https://www.monticellolibrary.org/events', city: 'Monticello', state: 'IA', zipCode: '00000', county: 'Monticello County'},
  { name: 'Montrose Public Library', url: 'https://www.montroselibrary.org', eventsUrl: 'https://www.montroselibrary.org/events', city: 'Montrose', state: 'IA', zipCode: '52639', county: 'Montrose County'},
  { name: 'Morley Public Library', url: 'https://www.morleylibrary.org/', eventsUrl: 'https://www.morleylibrary.org/', city: 'Morley', state: 'IA', zipCode: '52312', county: 'Morley County'},
  { name: 'Mount Pleasant Public Library', url: 'https://www.mountpleasantlibrary.org/', eventsUrl: 'https://www.mountpleasantlibrary.org/', city: 'Mount Pleasant', state: 'IA', zipCode: '52641', county: 'Mount Pleasant County'},
  { name: 'Nashua Public Library', url: 'https://www.nashualibrary.org', eventsUrl: 'https://www.nashualibrary.org/events', city: 'Nashua', state: 'IA', zipCode: '50658', county: 'Nashua County'},
  { name: 'H.J. Nugen Public Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'IA', zipCode: '52645', county: 'New London County'},
  { name: 'New Market Public Library', url: 'https://newmarketlibrary.org/', eventsUrl: 'https://newmarketlibrary.org/index.html', city: 'New Market', state: 'IA', zipCode: '51646', county: 'New Market County'},
  { name: 'New Virginia Public Library', url: 'https://newvirginialibrary.org/', eventsUrl: 'https://newvirginialibrary.org/', city: 'New Virginia', state: 'IA', zipCode: '50210', county: 'New Virginia County'},
  { name: 'Newton Public Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'IA', zipCode: '50208', county: 'Newton County'},
  { name: 'North Liberty Community Library', url: 'https://www.northlibertylibrary.org', eventsUrl: 'https://www.northlibertylibrary.org/events', city: 'North Liberty', state: 'IA', zipCode: '52317', county: 'North Liberty County'},
  { name: 'Norwalk Easter Public Library', url: 'https://www.norwalklibrary.org', eventsUrl: 'https://www.norwalklibrary.org/events', city: 'Norwalk', state: 'IA', zipCode: '50211', county: 'Norwalk County'},
  { name: 'Eckels Memorial Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'IA', zipCode: '51560', county: 'Oakland County'},
  { name: 'Orange City Public Library', url: 'https://www.orangecitylibrary.org', eventsUrl: 'https://www.orangecitylibrary.org/events', city: 'Orange City', state: 'IA', zipCode: '51041', county: 'Orange City County'},
  { name: 'Oskaloosa Public Library', url: 'https://www.oskaloosalibrary.org/', eventsUrl: 'https://www.oskaloosalibrary.org/p/home.html', city: 'Oskaloosa', state: 'IA', zipCode: '52577', county: 'Oskaloosa County'},
  { name: 'Oxford Public Library', url: 'https://oxfordlibrary.org/', eventsUrl: 'https://oxfordlibrary.org/', city: 'Oxford', state: 'IA', zipCode: '52322', county: 'Oxford County'},
  { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'IA', zipCode: '50571', county: 'Palmer County'},
  { name: 'Perry Public Library', url: 'https://www.perrylibrary.org/', eventsUrl: 'https://www.perrylibrary.org/calendar', city: 'Perry', state: 'IA', zipCode: '50220', county: 'Perry County'},
  { name: 'Pierson Branch', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Pierson', state: 'IA', zipCode: '00000', county: 'Pierson County'},
  { name: 'Plainfield Public Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'IA', zipCode: '50666', county: 'Plainfield County'},
  { name: 'Pocahontas Public Library', url: 'https://www.pocahontaslibrary.org', eventsUrl: 'https://www.pocahontaslibrary.org/events', city: 'Pocahontas', state: 'IA', zipCode: '50574', county: 'Pocahontas County'},
  { name: 'Polk City Community Library', url: 'https://www.polkcitylibrary.org', eventsUrl: 'https://www.polkcitylibrary.org/events', city: 'Polk City', state: 'IA', zipCode: '50226', county: 'Polk City County'},
  { name: 'Preston Public Library', url: 'https://prestonpubliclibrary.org/', eventsUrl: 'https://prestonpubliclibrary.org/events/', city: 'Preston', state: 'IA', zipCode: '52069', county: 'Preston County'},
  { name: 'Princeton Branch', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'IA', zipCode: '00000', county: 'Princeton County'},
  { name: 'Randolph Public Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'IA', zipCode: '51649', county: 'Randolph County'},
  { name: 'Remsen Public Library', url: 'https://remsenlibrary.org/', eventsUrl: 'https://remsenlibrary.org/', city: 'Remsen', state: 'IA', zipCode: '51050', county: 'Remsen County'},
  { name: 'Richland Public Library', url: 'https://www.richlandlibrary.org/', eventsUrl: 'https://www.richlandlibrary.org/Calendar', city: 'Richland', state: 'IA', zipCode: '52585', county: 'Richland County'},
  { name: 'Rock Valley Public Library', url: 'https://www.rockvalleylibrary.org', eventsUrl: 'https://www.rockvalleylibrary.org/events', city: 'Rock Valley', state: 'IA', zipCode: '51247', county: 'Rock Valley County'},
  { name: 'Crew Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'IA', zipCode: '52649', county: 'Salem County'},
  { name: 'Scranton Public Library', url: 'https://www.scrantonlibrary.org', eventsUrl: 'https://www.scrantonlibrary.org/events', city: 'Scranton', state: 'IA', zipCode: '51462', county: 'Scranton County'},
  { name: 'Seymour Community Library', url: 'https://www.seymourlibrary.org', eventsUrl: 'https://www.seymourlibrary.org/events', city: 'Seymour', state: 'IA', zipCode: '52590', county: 'Seymour County'},
  { name: 'Sheffield Public Library', url: 'https://www.sheffieldlibrary.org/', eventsUrl: 'https://www.sheffieldlibrary.org/', city: 'Sheffield', state: 'IA', zipCode: '50475', county: 'Sheffield County'},
  { name: 'Sheldon Public Library', url: 'https://www.sheldonlibrary.org', eventsUrl: 'https://www.sheldonlibrary.org/events', city: 'Sheldon', state: 'IA', zipCode: '51201', county: 'Sheldon County'},
  { name: 'Sioux Center Public Library', url: 'https://www.siouxcenterlibrary.org/', eventsUrl: 'https://www.siouxcenterlibrary.org/', city: 'Sioux Center', state: 'IA', zipCode: '51250', county: 'Sioux Center County'},
  { name: 'Slater Public Library', url: 'https://slaterlibrary.org/', eventsUrl: 'https://slaterlibrary.org/calendar', city: 'Slater', state: 'IA', zipCode: '50244', county: 'Slater County'},
  { name: 'Somers Public Library', url: 'https://www.somerslibrary.org', eventsUrl: 'https://www.somerslibrary.org/events', city: 'Somers', state: 'IA', zipCode: '50586', county: 'Somers County'},
  { name: 'Spirit Lake Public Library', url: 'https://www.spiritlakelibrary.org', eventsUrl: 'https://www.spiritlakelibrary.org/events', city: 'Spirit Lake', state: 'IA', zipCode: '51360', county: 'Spirit Lake County'},
  { name: 'St. Charles Public Library', url: 'https://www.scpld.org/', eventsUrl: 'https://www.scpld.org/', city: 'St. Charles', state: 'IA', zipCode: '50240', county: 'St. Charles County'},
  { name: 'Stratford Public Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'IA', zipCode: '50249', county: 'Stratford County'},
  { name: 'Stuart Public Library', url: 'https://stuartlibrary.org/', eventsUrl: 'https://stuartlibrary.org/calendar/', city: 'Stuart', state: 'IA', zipCode: '50250', county: 'Stuart County'},
  { name: 'Thompson Public Library', url: 'https://www.thompsonlibrary.org', eventsUrl: 'https://www.thompsonlibrary.org/events', city: 'Thompson', state: 'IA', zipCode: '50478', county: 'Thompson County'},
  { name: 'Toledo Public Library', url: 'https://www.toledolibrary.org', eventsUrl: 'https://www.toledolibrary.org/events', city: 'Toledo', state: 'IA', zipCode: '52342', county: 'Toledo County'},
  { name: 'Truro Public Library', url: 'https://www.trurolibrary.org/', eventsUrl: 'https://www.trurolibrary.org/', city: 'Truro', state: 'IA', zipCode: '50257', county: 'Truro County'},
  { name: 'Union Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'IA', zipCode: '50258', county: 'Union County'},
  { name: 'Ventura Public Library', url: 'https://venturalibrary.org/', eventsUrl: 'https://venturalibrary.org/', city: 'Ventura', state: 'IA', zipCode: '50482', county: 'Ventura County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'IA', zipCode: '52170', county: 'Waterville County'},
  { name: 'Waukee Public Library', url: 'https://www.waukeelibrary.org', eventsUrl: 'https://www.waukeelibrary.org/events', city: 'Waukee', state: 'IA', zipCode: '50263', county: 'Waukee County'},
  { name: 'Waverly Public Library', url: 'https://www.waverlylibrary.com/', eventsUrl: 'https://www.waverlylibrary.com/', city: 'Waverly', state: 'IA', zipCode: '50677', county: 'Waverly County'},
  { name: 'Wellman-Scofield Public Library', url: 'https://www.wellmanlibrary.org', eventsUrl: 'https://www.wellmanlibrary.org/events', city: 'Wellman', state: 'IA', zipCode: '52356', county: 'Wellman County'},
  { name: 'West Bend Public Library', url: 'https://www.westbendlibrary.org', eventsUrl: 'https://www.westbendlibrary.org/events', city: 'West Bend', state: 'IA', zipCode: '50597', county: 'West Bend County'},
  { name: 'West Branch Public Library', url: 'https://www.westbranchlibrary.org', eventsUrl: 'https://www.westbranchlibrary.org/events', city: 'West Branch', state: 'IA', zipCode: '52358', county: 'West Branch County'},
  { name: 'Whiting Public Library', url: 'https://www.whitinglibrary.org', eventsUrl: 'https://www.whitinglibrary.org/events', city: 'Whiting', state: 'IA', zipCode: '51063', county: 'Whiting County'},
  { name: 'Whittemore Public Library', url: 'https://www.whittemorelibrary.org', eventsUrl: 'https://www.whittemorelibrary.org/events', city: 'Whittemore', state: 'IA', zipCode: '50598', county: 'Whittemore County'},
  { name: 'Wilton Public Library', url: 'https://www.wiltonlibrary.org', eventsUrl: 'https://www.wiltonlibrary.org/events', city: 'Wilton', state: 'IA', zipCode: '52778', county: 'Wilton County'},
  { name: 'Winfield Public Library', url: 'https://www.winfieldlibrary.org/', eventsUrl: 'https://www.winfieldlibrary.org/', city: 'Winfield', state: 'IA', zipCode: '52659', county: 'Winfield County'},
  { name: 'Winterset Public Library', url: 'https://www.wintersetlibrary.org/', eventsUrl: 'https://www.wintersetlibrary.org/calendar/', city: 'Winterset', state: 'IA', zipCode: '50273', county: 'Winterset County'},
  { name: 'Winthrop Public Library', url: 'https://www.winthroplibrary.org/', eventsUrl: 'https://www.winthroplibrary.org/', city: 'Winthrop', state: 'IA', zipCode: '50682', county: 'Winthrop County'},

];

const SCRAPER_NAME = 'wordpress-IA';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'IA', city: library.city, zipCode: library.zipCode }}));
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
    state: 'IA',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressIACloudFunction() {
  console.log('☁️ Running WordPress IA as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-IA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-IA', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressIACloudFunction };
