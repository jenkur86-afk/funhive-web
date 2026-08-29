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
const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');
const ngeohash = require('ngeohash');
/**
 * Tennessee Public Libraries Scraper
 * State: TN
 * Coverage: All Tennessee Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Nashville Public Library', url: 'https://library.nashville.org', eventsUrl: 'https://library.nashville.org/events', city: 'Nashville', state: 'TN', zipCode: '37203', county: 'Davidson'},
  { name: 'Memphis Public Libraries', url: 'https://www.memphislibrary.org', eventsUrl: 'https://www.memphislibrary.org/events', city: 'Memphis', state: 'TN', zipCode: '38103', county: 'Shelby'},
  { name: 'Knox County Public Library', url: 'https://www.knoxlib.org', eventsUrl: 'https://www.knoxlib.org/events', city: 'Knoxville', state: 'TN', zipCode: '37902', county: 'Knox'},
  { name: 'Chattanooga Public Library', url: 'https://chattlibrary.org', eventsUrl: 'https://chattlibrary.org/events', city: 'Chattanooga', state: 'TN', zipCode: '37402', county: 'Hamilton'},
  // Regional Libraries
  { name: 'Clarksville-Montgomery County Public Library', url: 'https://mcgtn.org/library', eventsUrl: 'https://mcgtn.org/library/events', city: 'Clarksville', state: 'TN', zipCode: '37040', county: 'Montgomery'},
  { name: 'Johnson City Public Library', url: 'https://www.jcpl.org', eventsUrl: 'https://www.jcpl.org/events', city: 'Johnson City', state: 'TN', zipCode: '37601', county: 'Washington'},
  { name: 'Kingsport Public Library', url: 'https://www.kingsportlibrary.org/', eventsUrl: 'https://www.kingsportlibrary.org/', city: 'Kingsport', state: 'TN', zipCode: '37660', county: 'Sullivan'},
  // Williamson County Public Library MOVED to CivicEngage-Libraries 2026-08-11.
  // wcpltn.org is CivicPlus (.aspx), not WordPress, so this family could never
  // extract it — it returned 0 on every run. Verified live there before removal;
  // this is a move, not a dropped library.
  // 2026-08-29: PLATFORM MISMATCH, relocated to LibCal-TN. rcls.org/events is a dead path
  // but the host is fine - Rutherford County publishes on LibCal at rcls.libcal.com, which
  // serves springSpace, LibCal's own JS namespace. PROVEN LIVE at 20 events under LibCal-TN
  // the same day. Guarded rather than deleted so the library keeps an explained row in
  // LIBRARY-SITE-AUDIT.md.
  { name: 'Rutherford County Library System', url: 'https://www.rcls.org', eventsUrl: 'https://www.rcls.org/events', city: 'Murfreesboro', state: 'TN', zipCode: '37130', county: 'Rutherford', urlCollision: 'platform mismatch - Rutherford publishes on LibCal at rcls.libcal.com; relocated to LibCal-TN 2026-08-29, proven live at 20 events' },
  { name: 'Blount County Public Library', url: 'https://www.blountlibrary.org', eventsUrl: 'https://www.blountlibrary.org/events', city: 'Maryville', state: 'TN', zipCode: '37801', county: 'Blount'},
  { name: 'Cleveland-Bradley County Public Library', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'TN', zipCode: '37311', county: 'Bradley'},
  { name: 'Germantown Community Library', url: 'https://www.germantownlibrary.org', eventsUrl: 'https://www.germantownlibrary.org/events', city: 'Germantown', state: 'TN', zipCode: '38138', county: 'Shelby', urlCollision: 'germantownlibrary.org is NY, not TN' },
  { name: 'Collierville Burch Library', url: 'https://www.colliervillelibrary.org', eventsUrl: 'https://www.colliervillelibrary.org/events', city: 'Collierville', state: 'TN', zipCode: '38017', county: 'Shelby'},
  { name: 'Bartlett Library', url: 'https://www.cityofbartlett.org/library', eventsUrl: 'https://www.cityofbartlett.org/calendar.aspx?CID=34', city: 'Bartlett', state: 'TN', zipCode: '38134', county: 'Shelby'},
  { name: 'Hendersonville Public Library', url: 'https://youseemore.com/', eventsUrl: 'https://youseemore.com/hendersonville/', city: 'Hendersonville', state: 'TN', zipCode: '37075', county: 'Sumner'},
  // 2026-08-29: URL CORRECTED but this is NOT yet coverage. mhlibrary.org serves Mountain
  // Home Public Library, 790 N 10th E, Mountain Home IDAHO - a different institution
  // entirely. The real one is morristownhamblenlibrary.org, confirmed by its 423 area code
  // and its own "Library Events" page. So the wrong-state risk is gone.
  // WHAT IS STILL MISSING, stated rather than implied by a corrected URL: this library does
  // not publish machine-readable events on its own site at all. /library-events/ carries a
  // link to a keepandshare.com calendar (show_month.php?i=1358503) plus a monthly PDF, and
  // nothing else - no TEC (its REST endpoint returns nothing), no LibCal, no Google
  // Calendar. Checked live 2026-08-29. So this entry will keep returning 0 and that is an
  // OPEN COVERAGE GAP, not a fix. It is left LIVE rather than guarded because the entry now
  // names the right institution: an honest 0 from the correct library is the accurate state,
  // and a urlCollision guard would assert a collision that no longer exists.
  { name: 'Morristown-Hamblen Library', url: 'https://www.morristownhamblenlibrary.org', eventsUrl: 'https://www.morristownhamblenlibrary.org/library-events/', city: 'Morristown', state: 'TN', zipCode: '37814', county: 'Hamblen'},
  { name: 'Smyrna Public Library', url: 'https://www.smyrnalibrary.org', eventsUrl: 'https://www.smyrnalibrary.org/events', city: 'Smyrna', state: 'TN', zipCode: '37167', county: 'Rutherford', urlCollision: 'smyrnalibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Sevier County Public Library System', url: 'https://www.sevierlibrary.org/', eventsUrl: 'https://www.sevierlibrary.org/', city: 'Sevierville', state: 'TN', zipCode: '37862', county: 'Sevier'},
  // URL and name corrected 2026-08-25 (was 'Tullahoma Public Library' at
  // tullahoma-tn.com/library, which now returns HTTP 404 — that domain is a
  // community news publication, "Tullahoma Today", not the city or the library).
  // The real institution is Coffee County Lannom Memorial Public Library, 312 N
  // Collins St, Tullahoma TN 37388, ph 931-455-2460, site lannom.org. Same
  // name-vs-institution correction already applied to Athens/E.G. Fisher below.
  // lannom.org/events exists and is titled "Events Calendar" but rendered no dated
  // events; the site is WordPress WITHOUT The Events Calendar (wp/v2/types has no
  // tribe_events, and the TEC REST endpoint 404s), and the library publishes its
  // programs on Facebook. Kept as an explained gap returning 0 rather than a 404.
  { name: 'Coffee County Lannom Memorial Public Library', url: 'https://lannom.org', eventsUrl: 'https://lannom.org/events', city: 'Tullahoma', state: 'TN', zipCode: '37388', county: 'Coffee'},
  // URL corrected 2026-08-11 (was athenslibrary.org): 1289 Ingleside Ave Athens TN 37303, phone 423-745-7782. NOTE the real institution is E.G. Fisher Public Library - the configured NAME is als
  { name: 'Athens Public Library', url: 'https://fisherlibrary.org', eventsUrl: 'https://fisherlibrary.org', city: 'Athens', state: 'TN', zipCode: '37303', county: 'McMinn'},
  { name: 'Crossville-Cumberland County Public Library', url: 'https://www.cumberlandcountylibrary.org', eventsUrl: 'https://www.cumberlandcountylibrary.org/events', city: 'Crossville', state: 'TN', zipCode: '38555' },
  { name: 'Rogersville Public Library', url: 'https://www.rogersvillelibrary.org', eventsUrl: 'https://www.rogersvillelibrary.org/events', city: 'Rogersville', state: 'TN', zipCode: '37857', county: 'Hawkins'},
  // 2026-08-29: URL COLLISION. tiptoncountylibrary.org serves Tipton County Public
  // Library in Tipton INDIANA - it was listing Aug 11-13 2026 events at the time of
  // verification. Two states have a Tipton County. Tennessee's is in Covington and has no
  // verified calendar URL, so this stays an OPEN GAP.
  { name: 'Tipton County Public Library', url: 'https://www.tiptoncountylibrary.org/', eventsUrl: 'https://www.tiptoncountylibrary.org/', city: 'Covington', state: 'TN', zipCode: '38019', urlCollision: 'tiptoncountylibrary.org is Tipton County INDIANA, not TN' },
  { name: 'Savannah-Hardin County Library', url: 'https://www.hardincountylibrary.org', eventsUrl: 'https://www.hardincountylibrary.org/events', city: 'Savannah', state: 'TN', zipCode: '38372' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Crockett County Library', url: 'https://www.alamolibrary.org', eventsUrl: 'https://www.alamolibrary.org/events', city: 'Alamo', state: 'TN', zipCode: '38001', county: 'Crockett'},
  // URL corrected 2026-08-11 (was alexandrialibrary.org): DeKalb County TN system site, Justin Potter Library Smithville; Alexandria Library 109 S Public Square Alexandria TN, 615-529-4124 per count
  { name: 'Alexandria Branch Library', url: 'http://dekalblibraries.net', eventsUrl: 'http://dekalblibraries.net/programsevents.html', city: 'Alexandria', state: 'TN', zipCode: '00000', county: 'DeKalb'},
  { name: 'Southeast Branch Library', url: 'https://www.antiochlibrary.org', eventsUrl: 'https://www.antiochlibrary.org/events', city: 'Antioch', state: 'TN', zipCode: '00000', county: 'Bedford'},
  { name: 'Sam T. Wilson Public Library', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'TN', zipCode: '38002', county: 'Shelby', urlCollision: 'arlingtonlibrary.org is TX, not TN' },
  { name: 'Auburntown Public Library', url: 'https://adamsmemoriallibrary.org/', eventsUrl: 'https://adamsmemoriallibrary.org/', city: 'Auburntown', state: 'TN', zipCode: '00000', county: 'Cannon'},
  { name: 'Baxter Branch Library', url: 'https://www.baxterlibrary.org', eventsUrl: 'https://www.baxterlibrary.org/events', city: 'Baxter', state: 'TN', zipCode: '00000', county: 'Putnam', urlCollision: 'baxterlibrary.org is ME, not TN' },
  { name: 'The Brentwood Library', url: 'https://www.brentwoodlibrary.org', eventsUrl: 'https://www.brentwoodlibrary.org/events', city: 'Brentwood', state: 'TN', zipCode: '37027', county: 'Williamson', urlCollision: 'brentwoodlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  { name: 'Benton County Library', url: 'https://www.camdenlibrary.org/', eventsUrl: 'https://www.camdenlibrary.org/', city: 'Camden', state: 'TN', zipCode: '38320', county: 'Benton', urlCollision: 'camdenlibrary.org is MI, not TN' },
  // URL corrected 2026-08-11 (was centervillelibrary.org): Site is behind Cloudflare; Help4TN state directory lists 120 West Swan Street, Centerville TN 37033, phone 931-729-4151, site hickmancountyl
  { name: 'Hickman County Public Library', url: 'https://hickmancountylibrary.net', eventsUrl: 'https://hickmancountylibrary.net', city: 'Centerville', state: 'TN', zipCode: '37033', county: 'Hickman'},
  { name: 'Clinton Public Library', url: 'https://www.clintonlibrary.org', eventsUrl: 'https://www.clintonlibrary.org/events', city: 'Clinton', state: 'TN', zipCode: '37716', county: 'Anderson', urlCollision: 'clintonlibrary.org is dead or serves an unrelated site — no state entry is correct' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in AK, not TN. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Cordova Branch Library', url: 'https://cordovalibrary.org/', eventsUrl: 'https://cordovalibrary.org/', city: 'Cordova', state: 'TN', zipCode: '00000', county: 'Shelby'},
  // URL corrected 2026-08-11 (was decaturlibrary.org): Contact page shows 120 E. Memorial Dr, Decatur TN 37322, phone 423-334-3332
  { name: 'Meigs-Decatur Public Library', url: 'https://www.meigscounty-decaturpubliclibrary.com', eventsUrl: 'https://www.meigscounty-decaturpubliclibrary.com', city: 'Decatur', state: 'TN', zipCode: '37322', county: 'Decatur County'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in OH, not TN. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Stewart County Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'TN', zipCode: '37058', county: 'Stewart'},
  { name: 'Sequatchie County Public Library', url: 'https://www.dunlaplibrary.org', eventsUrl: 'https://www.dunlaplibrary.org/events', city: 'Dunlap', state: 'TN', zipCode: '37327', county: 'Sequatchie', urlCollision: 'dunlaplibrary.org is IL, not TN' },
  // 2026-08-29: URL COLLISION. gleasonlibrary.org serves Gleason Public Library, 1 River
  // Road, Carlisle MASSACHUSETTS - a different institution that merely shares a surname.
  // Guarded; Gleason TN remains an OPEN GAP with no verified calendar URL.
  { name: 'Gleason Memorial Library', url: 'https://www.gleasonlibrary.org', eventsUrl: 'https://www.gleasonlibrary.org/events', city: 'Gleason', state: 'TN', zipCode: '38229', county: 'Weakley', urlCollision: 'gleasonlibrary.org is Gleason Public Library in Carlisle MA, not Gleason TN' },
  { name: 'Harriman Public Library', url: 'https://www.harrimanlibrary.org/', eventsUrl: 'https://www.harrimanlibrary.org/', city: 'Harriman', state: 'TN', zipCode: '37748', county: 'Roane'},
  { name: 'Carroll County Library', url: 'https://www.huntingdonlibrary.org', eventsUrl: 'https://www.huntingdonlibrary.org/events', city: 'Huntingdon', state: 'TN', zipCode: '38344', county: 'Carroll', urlCollision: 'huntingdonlibrary.org is PA, not TN' },
  { name: 'Kingston Public Library', url: 'https://www.kingstonlibrary.org', eventsUrl: 'https://www.kingstonlibrary.org/events', city: 'Kingston', state: 'TN', zipCode: '37763', county: 'Roane', urlCollision: 'kingstonlibrary.org is NY, not TN' },
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in dead — 301s off-host to running-care.com, a French running blog, not TN. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Macon County Public Library', url: 'https://lafayettelibrary.org/', eventsUrl: 'https://lafayettelibrary.org/', city: 'Lafayette', state: 'TN', zipCode: '37083', county: 'Macon'},
  { name: 'Millard Oakley Public Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'TN', zipCode: '38570', county: 'Overton', urlCollision: 'livingstonlibrary.org is NJ, not TN' },
  { name: 'Nashville Talking Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'TN', zipCode: '00000', county: 'Madison County', urlCollision: 'madisonlibrary.org is KY, not TN' },
  { name: 'Madisonville Public Library', url: 'https://www.madisonvillelibrary.org', eventsUrl: 'https://www.madisonvillelibrary.org/events', city: 'Madisonville', state: 'TN', zipCode: '37354', county: 'Monroe'},
  { name: 'Middleton Community Library', url: 'https://www.middletonlibrary.org/', eventsUrl: 'https://www.middletonlibrary.org/calendar', city: 'Middleton', state: 'TN', zipCode: '38052', county: 'Hardeman'},
  { name: 'Mildred G. Fields Memorial Library', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'TN', zipCode: '38358', county: 'Gibson', urlCollision: 'milanlibrary.org is MI, not TN' },
  { name: 'Monterey Branch Library', url: 'https://www.montereylibrary.org', eventsUrl: 'https://www.montereylibrary.org/events', city: 'Monterey', state: 'TN', zipCode: '00000', county: 'Putnam', urlCollision: 'montereylibrary.org is CA, not TN' },
  { name: 'Mt. Juliet-Harvey Freeman Public Library', url: 'https://www.mtjulietlibrary.org', eventsUrl: 'https://www.mtjulietlibrary.org/events', city: 'Mt. Juliet', state: 'TN', zipCode: '37122', county: 'Wilson'},
  // URL corrected 2026-08-11 (was newbernlibrary.org): Site lists 220 East Main Street, Newbern TN 38059, phone 731-627-3153; matches cityofnewbern.org library page. newbernlibrary.org is Newbern
  { name: 'Newbern City Library', url: 'https://newberncitylibrary.weebly.com', eventsUrl: 'https://newberncitylibrary.weebly.com', city: 'Newbern', state: 'TN', zipCode: '38059', county: 'Dyer'},
  // REMOVED 2026-08-11 (MASTER-PLAN Defect A): configured host serves a library in MA, not TN. Confirmed live in reports/verification-comments.json. Removed now rather than later because today's date-extraction fixes mean this scraper CAN now read pages it previously failed on, which would have started importing another state's events under this name. RECORDED COVERAGE GAP - restore when a real URL is verified.
  // { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org', eventsUrl: 'https://www.palmerlibrary.org/events', city: 'Palmer', state: 'TN', zipCode: '37365', county: 'Grundy'},
  { name: 'Parsons Public Library', url: 'https://www.parsonslibrary.org/', eventsUrl: 'https://www.parsonslibrary.org/', city: 'Parsons', state: 'TN', zipCode: '38363', county: 'Decatur'},
  // URL corrected 2026-08-11 (was ripleylibrary.org): Site contact page gives 120 Lafayette Ave, Ripley TN 38063, phone 731-635-1872; TN state library directory confirms same address
  { name: 'Lauderdale County Library', url: 'https://lauderdalecountylibrary.com', eventsUrl: 'https://lauderdalecountylibrary.com/events/', city: 'Ripley', state: 'TN', zipCode: '38063', county: 'Lauderdale'},
  { name: 'White County Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'TN', zipCode: '38583', county: 'White', urlCollision: 'spartalibrary.org is WI, not TN' },
  { name: 'Audrey Pack Memorial Library', url: 'https://springcitylibrary.org/', eventsUrl: 'https://springcitylibrary.org/', city: 'Spring City', state: 'TN', zipCode: '37381', county: 'Rhea', urlCollision: 'springcitylibrary.org is PA, not TN' },
  { name: 'Spring Hill Public Library', url: 'https://www.springhilllibrary.org', eventsUrl: 'https://www.springhilllibrary.org/events', city: 'Spring Hill', state: 'TN', zipCode: '37174', county: 'Maury'},
  { name: 'Sweetwater Public Library', url: 'https://www.sweetwaterlibrary.org/', eventsUrl: 'https://www.sweetwaterlibrary.org/', city: 'Sweetwater', state: 'TN', zipCode: '37874', county: 'Monroe'},
  { name: 'Mary E. Tippitt Memorial Library', url: 'https://www.townsendlibrary.org', eventsUrl: 'https://www.townsendlibrary.org/events', city: 'Townsend', state: 'TN', zipCode: '37882', county: 'Blount', urlCollision: 'townsendlibrary.org is MA, not TN' },
  { name: 'Hamilton Parks Public Library', url: 'https://www.trimblelibrary.org', eventsUrl: 'https://www.trimblelibrary.org/events', city: 'Trimble', state: 'TN', zipCode: '38259', county: 'Dyer'},
  // URL corrected 2026-08-11 (was washburnlibrary.org): Site shows 7715 Hwy 131 PO Box 129, Washburn TN, phone 865-497-2506, Grainger County; also listed as Washburn Community Library. No calendar
  { name: 'Washburn Public Library', url: 'https://washlib.wordpress.com/', eventsUrl: 'https://washlib.wordpress.com/', city: 'Washburn', state: 'TN', zipCode: '37888', county: 'Grainger'},
  // URL corrected 2026-08-11 (was waverlylibrary.com): 201 Pavo Ave Waverly TN 37185, phone 931-296-2143. humphreyscountypubliclibrary.com 301-redirects to this wordpress host
  { name: 'Humphreys County Public Library', url: 'https://hclibraryprinting.wordpress.com', eventsUrl: 'https://hclibraryprinting.wordpress.com/upcoming-events/', city: 'Waverly', state: 'TN', zipCode: '37185', county: 'Humphreys'},
  { name: 'Westmoreland Public Library', url: 'https://www.westmorelandpubliclibrary.com/', eventsUrl: 'https://www.westmorelandpubliclibrary.com/', city: 'Westmoreland', state: 'TN', zipCode: '37186', county: 'Sumner'},
  { name: 'White Pine Public Library', url: 'https://whitepinelibrary.org/', eventsUrl: 'https://whitepinelibrary.org/', city: 'White Pine', state: 'TN', zipCode: '37890', county: 'Jefferson'},
  { name: 'Franklin County Public Library', url: 'https://www.winchesterlibrary.org', eventsUrl: 'https://www.winchesterlibrary.org/events', city: 'Winchester', state: 'TN', zipCode: '37398', county: 'Franklin', urlCollision: 'winchesterlibrary.org is KS, not TN' },
  // URL corrected 2026-08-11 (was winfieldlibrary.org): 275 Pine Grove Rd Winfield TN 37892, ph 423-569-9047, Scott County TN
  { name: 'Winfield Public Library', url: 'https://winfieldpubliclibrary.wordpress.com/', eventsUrl: 'https://winfieldpubliclibrary.wordpress.com/', city: 'Winfield', state: 'TN', zipCode: '37892', county: 'Scott'},
  // URL corrected 2026-08-11 (was woodburylibrary.org): Site lists 212 College Street, Woodbury TN 37190, phone 615-563-5861, Cannon County Library System. No separate calendar page
  { name: 'Adams Memorial Library', url: 'https://adamsmemoriallibrary.org', eventsUrl: 'https://adamsmemoriallibrary.org', city: 'Woodbury', state: 'TN', zipCode: '00000', county: 'Cannon'},
  { name: 'Franklin Public Library', url: 'https://www.franklintn.gov/library', eventsUrl: 'https://www.franklintn.gov/library/events', city: 'Franklin', state: 'TN', zipCode: '37064', county: 'Franklin County'}

];

const SCRAPER_NAME = 'WordPress-TN';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    const __eventCountBefore = events.length;
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
      // An entry carrying urlCollision points at a DIFFERENT institution than its own
      // name and state claim — the guessed {city}library.org host actually belongs to
      // another state's library. Scraping it imported that library's events under this
      // state. See scripts/disable-collided-urls.js for the per-host evidence.
      // The 📍 header above and the "Found 0 events" line below are BOTH required: the
      // library-site audit pairs them, and dropping the pair would delete this library
      // from the audit instead of showing it as a known, explained gap.
      if (library.urlCollision) {
        console.log(`   ⏭️  skipped — urlCollision: ${library.urlCollision}`);
        console.log(`   Found 0 events`);
        continue;
      }
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      // Try the site's TEC REST API before falling back to DOM scraping —
      // see helpers/tec-rest-helper.js for why (2026-07-31 diagnosis).
      const tecEvents = await tryFetchTecEvents(library.url, library.name);
      if (tecEvents) {
        console.log(`   ✅ TEC REST API: ${tecEvents.length} events`);
        tecEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'TN', city: library.city, zipCode: library.zipCode }}));
        continue;
      }

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

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
            state: 'TN',
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
            state: event.state || library.state || 'TN',
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
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
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
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('time')
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');

              // Look for age/audience info on the event card
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
                  date: resolveEventDate(card),
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {}
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name, RESOLVER_SRC);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            state: 'TN',
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    } finally {
      console.log(`   Found ${events.length - __eventCountBefore} events`);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'TN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
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
async function scrapeWordpressTNCloudFunction() {
  console.log('☁️ Running WordPress TN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-TN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-TN', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressTNCloudFunction };
